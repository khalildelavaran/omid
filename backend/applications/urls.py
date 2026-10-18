from rest_framework.routers import DefaultRouter

from .views import LoanApplicationViewSet
from .workflow_views import CasePartyViewSet, MeratAssessmentViewSet, StageInstanceViewSet

router = DefaultRouter()
router.register("parties", CasePartyViewSet, basename="case-party")
router.register("stages", StageInstanceViewSet, basename="workflow-stage")
router.register("merat-assessments", MeratAssessmentViewSet, basename="merat-assessment")
router.register("", LoanApplicationViewSet, basename="loan-application")
urlpatterns = router.urls
