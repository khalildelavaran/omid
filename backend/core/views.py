from django.http import JsonResponse
from django.views.decorators.http import require_GET


@require_GET
def health(request):
    """Basic liveness endpoint; does not expose configuration or secrets."""
    return JsonResponse({"status": "ok", "service": "omid-api"})
