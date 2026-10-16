from django.contrib import admin
from django.http import Http404, HttpResponse
from django.template import TemplateDoesNotExist, loader
from django.urls import include, path, re_path


def spa_fallback(request, path=""):
    """Serve the frontend entry point for non-API routes.

    This avoids a route mismatch where a frontend SPA changes the URL but the
    backend continues to return the dashboard/root view. API paths are excluded
    so they keep working normally.
    """
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
    path("api/v1/customers/", include("customers.urls")),
    path("api/v1/applications/", include("applications.urls")),
    # Keep API routes separate. Any route that does not start with /api/ is
    # treated as a frontend SPA route, allowing the URL to change without
    # falling back to the root dashboard view.
    re_path(r"^(?!api/).*$", spa_fallback, name="spa-fallback"),
]
