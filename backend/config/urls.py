from django.contrib import admin
from django.http import Http404, HttpResponse
from django.template import TemplateDoesNotExist, loader
from django.urls import include, path, re_path

from accounts.views import ChangePasswordView, CurrentUserView, LoginView, LogoutView, csrf_token


def spa_fallback(request, path=""):
    """Serve the frontend entry point for non-API routes."""
    if request.path.startswith("/api/"):
        raise Http404("API endpoint not found.")

    try:
        template = loader.get_template("index.html")
    except TemplateDoesNotExist:
        raise Http404("Frontend entry point not configured for this route.")

    return HttpResponse(template.render({}, request))


urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/v1/health/", include("core.urls")),
    path("api/v1/auth/csrf/", csrf_token, name="csrf-token"),
    path("api/v1/auth/login/", LoginView.as_view(), name="login"),
    path("api/v1/auth/logout/", LogoutView.as_view(), name="logout"),
    path("api/v1/auth/me/", CurrentUserView.as_view(), name="current-user"),
    path("api/v1/auth/change-password/", ChangePasswordView.as_view(), name="change-password"),
    path("api/v1/audit-events/", include("core.audit_urls")),
    path("api/v1/reports/", include("core.report_urls")),
    path("api/v1/customers/", include("customers.urls")),
    path("api/v1/applications/", include("applications.urls")),
    path("api/v1/tasks/", include("tasks.urls")),
    path("api/v1/documents/", include("documents.urls")),
    path("api/v1/guarantees/", include("guarantees.urls")),
    path("api/v1/services/", include("services.urls")),
    re_path(r"^(?!api/).*$", spa_fallback, name="spa-fallback"),
]
