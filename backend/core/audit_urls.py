from rest_framework.routers import DefaultRouter

from .audit_views import AuditEventViewSet

router = DefaultRouter()
router.register("", AuditEventViewSet, basename="audit-event")
urlpatterns = router.urls
