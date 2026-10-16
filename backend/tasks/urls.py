from rest_framework.routers import DefaultRouter

from .views import WorkflowTaskViewSet

router = DefaultRouter()
router.register("", WorkflowTaskViewSet, basename="workflow-task")
urlpatterns = router.urls
