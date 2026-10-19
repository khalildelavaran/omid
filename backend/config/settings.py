"""Django settings for Omid CRM.

Production secrets must be supplied through environment variables.
"""
from pathlib import Path
from urllib.parse import urlsplit

import environ

BASE_DIR = Path(__file__).resolve().parent.parent.parent
env = environ.Env(
    DJANGO_DEBUG=(bool, False),
    DJANGO_ALLOWED_HOSTS=(list, []),
    DJANGO_CSRF_TRUSTED_ORIGINS=(list, []),
)
environ.Env.read_env(BASE_DIR / ".env")

SECRET_KEY = env("DJANGO_SECRET_KEY", default="")
DEBUG = env("DJANGO_DEBUG")
ALLOWED_HOSTS = env("DJANGO_ALLOWED_HOSTS")
# Render supplies the service hostname at runtime; include it without hardcoding
# a generated hostname in the repository or weakening host validation.
RENDER_EXTERNAL_HOSTNAME = env("RENDER_EXTERNAL_HOSTNAME", default="")
if RENDER_EXTERNAL_HOSTNAME and RENDER_EXTERNAL_HOSTNAME not in ALLOWED_HOSTS:
    ALLOWED_HOSTS.append(RENDER_EXTERNAL_HOSTNAME)
CSRF_TRUSTED_ORIGINS = env("DJANGO_CSRF_TRUSTED_ORIGINS")
DATABASE_URL = env("DATABASE_URL", default="")

if not DEBUG:
    if len(SECRET_KEY) < 50:
        raise RuntimeError("DJANGO_SECRET_KEY must be a long, unique secret of at least 50 characters.")
    if (
        not ALLOWED_HOSTS
        or any(not host or "*" in host or "://" in host or "/" in host for host in ALLOWED_HOSTS)
    ):
        raise RuntimeError("Set DJANGO_ALLOWED_HOSTS to explicit hostnames only; URLs and wildcards are not allowed.")
    if not CSRF_TRUSTED_ORIGINS:
        raise RuntimeError("Set DJANGO_CSRF_TRUSTED_ORIGINS to the exact trusted HTTPS frontend origin(s).")
    for origin in CSRF_TRUSTED_ORIGINS:
        parsed_origin = urlsplit(origin)
        if (
            parsed_origin.scheme != "https"
            or not parsed_origin.netloc
            or parsed_origin.path not in ("", "/")
            or parsed_origin.query
            or parsed_origin.fragment
        ):
            raise RuntimeError("Every DJANGO_CSRF_TRUSTED_ORIGINS entry must be an HTTPS origin without path, query, or fragment.")
    if not DATABASE_URL.startswith(("postgres://", "postgresql://")):
        raise RuntimeError("DATABASE_URL must be a PostgreSQL URL when DEBUG is disabled.")

INSTALLED_APPS = [
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    "rest_framework",
    "core",
    "accounts",
    "customers",
    "applications",
    "tasks",
    "documents",
    "guarantees",
    "services",
]

MIDDLEWARE = [
    "django.middleware.security.SecurityMiddleware",
    "whitenoise.middleware.WhiteNoiseMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]

ROOT_URLCONF = "config.urls"
TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    }
]
WSGI_APPLICATION = "config.wsgi.application"
ASGI_APPLICATION = "config.asgi.application"

DATABASES = {
    "default": env.db(
        "DATABASE_URL",
        default=f"sqlite:///{BASE_DIR / 'db.sqlite3'}",
    )
}
DATABASES["default"]["CONN_MAX_AGE"] = 60

AUTH_PASSWORD_VALIDATORS = [
    {"NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator"},
    {"NAME": "django.contrib.auth.password_validation.MinimumLengthValidator"},
    {"NAME": "django.contrib.auth.password_validation.CommonPasswordValidator"},
    {"NAME": "django.contrib.auth.password_validation.NumericPasswordValidator"},
]

LANGUAGE_CODE = "fa"
TIME_ZONE = "Asia/Tehran"
USE_I18N = True
USE_TZ = True

STATIC_URL = "static/"
STATIC_ROOT = BASE_DIR / "staticfiles"
STORAGES = {
    "default": {"BACKEND": "django.core.files.storage.FileSystemStorage"},
    "staticfiles": {
        "BACKEND": "whitenoise.storage.CompressedManifestStaticFilesStorage",
    },
}
MEDIA_URL = "media/"
MEDIA_ROOT = BASE_DIR / "media"
# Never mount this private directory as a public static/media path.
PRIVATE_DOCUMENT_ROOT = Path(env("PRIVATE_DOCUMENT_ROOT", default=str(BASE_DIR / "private_documents")))
if not PRIVATE_DOCUMENT_ROOT.is_absolute():
    PRIVATE_DOCUMENT_ROOT = BASE_DIR / PRIVATE_DOCUMENT_ROOT
PRIVATE_DOCUMENT_ROOT = PRIVATE_DOCUMENT_ROOT.resolve()

DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": [
        "rest_framework.authentication.SessionAuthentication",
    ],
    "DEFAULT_PERMISSION_CLASSES": [
        "rest_framework.permissions.IsAuthenticated",
    ],
    "DEFAULT_RENDERER_CLASSES": [
        "rest_framework.renderers.JSONRenderer",
    ],
    "DEFAULT_PAGINATION_CLASS": "rest_framework.pagination.PageNumberPagination",
    "PAGE_SIZE": 25,
    "DEFAULT_THROTTLE_RATES": {
        # Login attempts are also keyed by normalized username + source IP.
        "login": env("LOGIN_RATE_LIMIT", default="5/minute"),
        "login_ip": env("LOGIN_IP_RATE_LIMIT", default="20/minute"),
        "password_change": env("PASSWORD_CHANGE_RATE_LIMIT", default="5/hour"),
    },
}

SESSION_COOKIE_HTTPONLY = True
CSRF_COOKIE_HTTPONLY = True  # The frontend receives a masked token from the CSRF endpoint response body.
if not DEBUG:
    # The Cloudflare Worker overwrites X-Forwarded-Proto before proxying to Django.
    # Only trust this header when requests reach Django through that controlled proxy.
    SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https")
    SESSION_COOKIE_SECURE = True
    CSRF_COOKIE_SECURE = True
    SECURE_CONTENT_TYPE_NOSNIFF = True
    SECURE_REFERRER_POLICY = "same-origin"
    X_FRAME_OPTIONS = "DENY"
