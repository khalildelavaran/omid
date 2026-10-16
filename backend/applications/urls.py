from rest_framework.routers import DefaultRouter

from .views import LoanApplicationViewSet

router = DefaultRouter()
router.register("", LoanApplicationViewSet, basename="loan-application")
urlpatterns = router.urls
