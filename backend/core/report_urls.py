from django.urls import path

from .reports import OperationsReportView

urlpatterns = [
    path("operations/", OperationsReportView.as_view(), name="operations-report"),
]
