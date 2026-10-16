from rest_framework.routers import DefaultRouter

from .views import GuaranteeRequestViewSet

router = DefaultRouter()
router.register("", GuaranteeRequestViewSet, basename="guarantee-request")
urlpatterns = router.urls
