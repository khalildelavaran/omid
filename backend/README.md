# Backend development

## Requirements
- Python 3.12+
- Docker Compose (for PostgreSQL), or local PostgreSQL

## Setup

From the repository root:

```bash
python -m venv .venv
# Windows PowerShell: .venv\Scripts\Activate.ps1
# macOS/Linux: source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
docker compose up -d db
python backend/manage.py migrate
python backend/manage.py runserver
```

The API liveness endpoint is available at `http://127.0.0.1:8000/api/v1/health/`. The machine-readable OpenAPI schema is available at `http://127.0.0.1:8000/api/v1/schema/` after signing in with an authorized internal staff account.

Core API routes include `/api/v1/customers/`, `/api/v1/applications/`, `/api/v1/tasks/`, and the restricted read-only `/api/v1/audit-events/` feed. The customer API now includes optional `national_id`, `birth_date`, `father_name`, `occupation`, `postal_code`, and `sana_verified` fields and supports a `needs_review` status; Persian/Arabic digits in the national ID are normalized. Addresses, extra phone numbers, bank-account lists, and customer-linked document uploads are not yet mapped to the backend and must remain outside any automatic sync. Service receipt creation accepts the optional `Idempotency-Key` request header (8–128 allowed ASCII characters); repeat requests with the same user/key and same payload return the original receipt, while a changed payload returns `409 Conflict`. Run `python backend/manage.py migrate` after pulling changes; new migrations include the audit log, generated record numbers, and workflow tasks.

The example database password is for local development only. Do not reuse it in production.

## Production container

A production-oriented Docker image is available at the repository root. It runs Gunicorn as a non-root user, serves Django static assets through WhiteNoise, and exposes a health check at `/api/v1/health/`. CI builds the image but does not publish it or deploy it automatically.

Before deploying, configure these environment variables in the hosting platform (do not put production values in Git):

- `DJANGO_SECRET_KEY`: a long, unique random secret.
- `DJANGO_DEBUG=False`.
- `DJANGO_ALLOWED_HOSTS`: the backend hostname only, without a scheme.
- `DJANGO_CSRF_TRUSTED_ORIGINS=https://omid.khalil-delavaran.workers.dev`: the browser-facing Worker origin; replace it if the public UI origin changes.
- `DATABASE_URL`: a production PostgreSQL URL with a strong password and TLS settings required by the database provider.
- `PRIVATE_DOCUMENT_ROOT=/var/lib/omid/private-documents`: mount a persistent, private disk at this path and ensure the container user can write to it.
- `PORT`: set by most container platforms; the image defaults to `8000`.

When `DJANGO_DEBUG=False`, startup deliberately fails unless a strong `DJANGO_SECRET_KEY` (at least 50 characters), explicit non-wildcard `DJANGO_ALLOWED_HOSTS`, HTTPS-only `DJANGO_CSRF_TRUSTED_ORIGINS` origins, and a PostgreSQL `DATABASE_URL` are present. This prevents the image from silently starting against local SQLite or permissive host settings. The Docker build uses only dummy build-time values for `collectstatic`; those values must never be used at runtime.

Run database migrations as a release/deploy command before sending traffic:

```bash
python manage.py migrate --noinput
```

Build the image from the repository root with `docker build -t omid-api .`. The container does not automatically run migrations on each startup. Keep private documents on persistent storage that is not served as public media/static content, and back up the database and document volume. The sample development credentials in `docker-compose.yml` are not suitable for production.

After deploying to an HTTPS origin, configure Cloudflare Worker variable `OMID_API_ORIGIN` to that origin. Then verify the health endpoint through the Worker at `/api/v1/health/` and test session/CSRF authentication before enabling any UI data adapters.

## Cloudflare Worker same-origin API bridge

The Worker includes an optional same-origin proxy for paths under `/api/`. Configure the Worker variable `OMID_API_ORIGIN` with the HTTPS origin of the deployed Django backend (for example, `https://api.example.org`); provide only the origin, not a path, query string, credentials, or an HTTP URL. The proxy forwards browser cookies and the `X-CSRFToken` header, disables response caching, and rejects non-HTTPS or malformed backend origins. It also overwrites `X-Forwarded-Proto` with the browser-facing scheme; Django is configured to trust that header for the controlled Worker proxy, so secure-request and CSRF origin checks can account for TLS termination.

The connection diagnostic is available in the Omid UI under **Settings → Connection → Test backend connection**. Without `OMID_API_ORIGIN`, API requests intentionally return `503 Service Unavailable`.

**Important current state:** the proxy and optional staff-session diagnostic have been deployed. The Settings panel exposes staff login/session-check/logout controls only when `OMID_API_ORIGIN` is configured; the Worker currently has no such variable, and Django has not been deployed to a known public HTTPS origin, so those controls are not displayed. Even when enabled, these controls only test a Django session: they do not gate the main app, enforce UI role access, map UI fields to API serializers, or synchronize localStorage data. The app still uses demo/localStorage data. Do not enter real customer or financial information until the backend origin, app-wide access controls, data adapters, and end-to-end tests are complete.

## Internal authentication API

The internal staff API uses Django sessions, not bearer tokens. Browser clients must send cookies and use the CSRF token for state-changing requests. The CSRF endpoint returns a masked token in its JSON body; the CSRF cookie is `HttpOnly` and should not be read with `document.cookie`. Keep the returned token in memory and send it in the `X-CSRFToken` header for writes.

1. `GET /api/v1/auth/csrf/` to obtain a CSRF token and cookie.
2. `POST /api/v1/auth/login/` with JSON `{"username":"…","password":"…"}` and header `X-CSRFToken`.
3. `GET /api/v1/auth/me/` to obtain the current staff user's profile and role.
4. `POST /api/v1/auth/change-password/` with `current_password` and `new_password` plus `X-CSRFToken`.
5. `POST /api/v1/auth/logout/` plus `X-CSRFToken` to end the session.

The internal login accepts only active staff accounts with an allowed non-customer business role. Login attempts are throttled both per normalized account+source-IP pair (`LOGIN_RATE_LIMIT`, default `5/minute`) and per source IP across accounts (`LOGIN_IP_RATE_LIMIT`, default `20/minute`). Password changes are also rate-limited (`PASSWORD_CHANGE_RATE_LIMIT`, default `5/hour`). Append-only `AuditEvent` records cover authentication and key customer/loan-application changes. Audit metadata must never include credentials, OTPs, customer notes, or document contents. Customer portal authentication is separate and is not implemented yet. The production frontend should use same-origin routing or a carefully configured trusted origin, send credentials, and never disable CSRF checks.

Before production, configure a strong `DJANGO_SECRET_KEY`, `DJANGO_ALLOWED_HOSTS`, `DJANGO_CSRF_TRUSTED_ORIGINS`, HTTPS-only cookies, a trusted HTTPS proxy configuration if applicable, login throttling, monitoring, and a production database. Do not expose this scaffold publicly before deployment and security checks are complete.
