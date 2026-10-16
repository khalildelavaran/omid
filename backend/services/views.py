import uuid
from decimal import Decimal

from django.db import transaction
from django.db.models import Q
from rest_framework import status, viewsets
from rest_framework.exceptions import ValidationError
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from accounts.models import UserProfile
from core.audit import record_audit
from .models import ServiceCatalogItem, ServiceRecord
from .permissions import IsStaffServiceCatalogOperator, IsStaffServiceReceiptOperator
from .serializers import (
    ServiceCatalogItemSerializer,
    ServiceRecordCreateSerializer,
    ServiceRecordSerializer,
)


class ServiceCatalogItemViewSet(viewsets.ModelViewSet):
    serializer_class = ServiceCatalogItemSerializer
    permission_classes = [IsAuthenticated, IsStaffServiceCatalogOperator]
    queryset = ServiceCatalogItem.objects.select_related("created_by").all()
    http_method_names = ["get", "post", "put", "patch", "head", "options"]

    def get_queryset(self):
        queryset = super().get_queryset()
        active_filter = self.request.query_params.get("active", "").strip().lower()
        if active_filter not in {"", "true", "false"}:
            raise ValidationError({"active": "مقدار مجاز برای active برابر true یا false است."})
        if active_filter:
            queryset = queryset.filter(active=(active_filter == "true"))
        search = self.request.query_params.get("search", "").strip()
        if search:
            queryset = queryset.filter(
                Q(code__icontains=search)
                | Q(name__icontains=search)
                | Q(description__icontains=search)
            )
        return queryset

    @transaction.atomic
    def perform_create(self, serializer):
        item = serializer.save(created_by=self.request.user)
        record_audit(
            self.request,
            "service_catalog.created",
            actor=self.request.user,
            entity_type="service_catalog_item",
            entity_id=str(item.pk),
            metadata={"code": item.code, "price": str(item.price), "active": item.active},
        )

    @transaction.atomic
    def perform_update(self, serializer):
        item = serializer.save()
        record_audit(
            self.request,
            "service_catalog.updated",
            actor=self.request.user,
            entity_type="service_catalog_item",
            entity_id=str(item.pk),
            metadata={
                "updated_fields": sorted(serializer.validated_data.keys()),
                "active": item.active,
                "price": str(item.price),
            },
        )

    def destroy(self, request, *args, **kwargs):
        return Response(
            {"detail": "خدمت را غیرفعال کنید؛ حذف فیزیکی مجاز نیست."},
            status=status.HTTP_405_METHOD_NOT_ALLOWED,
        )


class ServiceRecordViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated, IsStaffServiceReceiptOperator]
    queryset = ServiceRecord.objects.select_related(
        "customer", "service", "performed_by", "created_by"
    ).all()
    http_method_names = ["get", "post", "head", "options"]

    def get_serializer_class(self):
        if self.action == "create":
            return ServiceRecordCreateSerializer
        return ServiceRecordSerializer

    def get_queryset(self):
        queryset = super().get_queryset()
        user = self.request.user
        role = UserProfile.Role.SYSTEM_ADMIN if user.is_superuser else getattr(
            getattr(user, "profile", None), "role", None
        )
        if role in {UserProfile.Role.INTAKE, UserProfile.Role.CASE_WORKER}:
            queryset = queryset.filter(customer__assigned_to=user)
        elif role not in {
            UserProfile.Role.SYSTEM_ADMIN,
            UserProfile.Role.CREDIT_APPROVER,
            UserProfile.Role.FINANCE,
            UserProfile.Role.AUDITOR,
        }:
            return queryset.none()

        customer_id = self.request.query_params.get("customer", "").strip()
        if customer_id:
            try:
                queryset = queryset.filter(customer_id=uuid.UUID(customer_id))
            except (ValueError, TypeError, AttributeError):
                return queryset.none()

        service_id = self.request.query_params.get("service", "").strip()
        if service_id:
            try:
                queryset = queryset.filter(service_id=uuid.UUID(service_id))
            except (ValueError, TypeError, AttributeError):
                return queryset.none()

        method = self.request.query_params.get("payment_method", "").strip()
        if method:
            if method not in ServiceRecord.PaymentMethod.values:
                raise ValidationError({"payment_method": "روش پرداخت معتبر نیست."})
            queryset = queryset.filter(payment_method=method)

        search = self.request.query_params.get("search", "").strip()
        if search:
            queryset = queryset.filter(
                Q(receipt_number__icontains=search)
                | Q(customer__customer_number__icontains=search)
                | Q(customer__first_name__icontains=search)
                | Q(customer__last_name__icontains=search)
                | Q(customer__organization_name__icontains=search)
                | Q(service_name_snapshot__icontains=search)
            )
        return queryset

    @transaction.atomic
    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        # Serialize a receipt against the current active catalogue price.
        # On PostgreSQL this row lock also prevents a concurrent price edit
        # from changing the amount between validation and snapshot creation.
        service_id = serializer.validated_data["service"].pk
        service = ServiceCatalogItem.objects.select_for_update().filter(
            pk=service_id, active=True
        ).first()
        if service is None:
            raise ValidationError({"service": "این خدمت فعال نیست یا پیدا نشد."})

        discount = serializer.validated_data.get("discount", Decimal("0"))
        paid = serializer.validated_data["paid"]
        if discount > service.price:
            raise ValidationError({"discount": "تخفیف نمی‌تواند از تعرفه فعلی خدمت بیشتر باشد."})
        total = service.price - discount
        if paid > total:
            raise ValidationError({"paid": "مبلغ دریافتی نمی‌تواند از مبلغ نهایی خدمت بیشتر باشد."})
        serializer.validated_data["service"] = service

        record = serializer.save(created_by=request.user)
        record_audit(
            request,
            "service_receipt.created",
            actor=request.user,
            entity_type="service_record",
            entity_id=str(record.pk),
            metadata={
                "receipt_number": record.receipt_number,
                "customer_id": str(record.customer_id),
                "service_id": str(record.service_id),
                "price": str(record.price),
                "discount": str(record.discount),
                "total": str(record.total),
                "paid": str(record.paid),
                "payment_method": record.payment_method,
            },
        )
        output = ServiceRecordSerializer(record, context=self.get_serializer_context())
        return Response(output.data, status=status.HTTP_201_CREATED)

    def destroy(self, request, *args, **kwargs):
        return Response(
            {"detail": "رسید صادرشده قابل حذف فیزیکی نیست."},
            status=status.HTTP_405_METHOD_NOT_ALLOWED,
        )
