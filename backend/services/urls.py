from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import ServiceCatalogItemViewSet, ServiceRecordViewSet

catalog_router = DefaultRouter()
catalog_router.register("", ServiceCatalogItemViewSet, basename="service-catalog")

receipt_router = DefaultRouter()
receipt_router.register("", ServiceRecordViewSet, basename="service-record")

urlpatterns = [
    path("catalog/", include(catalog_router.urls)),
    path("receipts/", include(receipt_router.urls)),
]
