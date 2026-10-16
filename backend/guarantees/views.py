import uuid

from django.db import transaction
from django.db.models import Q
from rest_framework import status, viewsets
from rest_framework.exceptions import ValidationError
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from accounts.models import UserProfile
from core.audit import record_audit
from .models import GuaranteeRequest
from .permissions import IsStaffGuaranteeOperator
from .serializers import GuaranteeRequestSerializer


def normalize_digits(value):
    return str(value or "").translate(str.maketrans(
        "۰۱۲۳۴۵۶۷۸۹٠١٢٣٤٥٦٧٨٩", "01234567890123456789"
    ))


class GuaranteeRequestViewSet(viewsets.ModelViewSet):
    serializer_class = GuaranteeRequestSerializer
    permission_classes = [IsAuthenticated, IsStaffGuaranteeOperator]
    queryset = GuaranteeRequest.objects.select_related(
        "application", "application__customer", "requester_customer", "created_by"
    ).all()
    # Requests are retained for operational and audit history.
    http_method_names = ["get", "post", "head", "options"]

    def get_queryset(self):
        queryset = super().get_queryset()
        user = self.request.user
        role = UserProfile.Role.SYSTEM_ADMIN if user.is_superuser else getattr(
            getattr(user, "profile", None), "role", None
        )
        if role in {UserProfile.Role.INTAKE, UserProfile.Role.CASE_WORKER}:
            queryset = queryset.filter(application__assigned_to=user)
        elif role not in {
            UserProfile.Role.SYSTEM_ADMIN,
            UserProfile.Role.CREDIT_APPROVER,
            UserProfile.Role.FINANCE,
            UserProfile.Role.AUDITOR,
        }:
            return queryset.none()

        status_filter = self.request.query_params.get("status", "").strip()
        if status_filter:
            if status_filter not in GuaranteeRequest.Status.values:
                raise ValidationError({"status": "وضعیت درخواست ضمانت معتبر نیست."})
            queryset = queryset.filter(status=status_filter)

        application_id = self.request.query_params.get("application", "").strip()
        if application_id:
            try:
                queryset = queryset.filter(application_id=uuid.UUID(application_id))
            except (ValueError, TypeError, AttributeError):
                return queryset.none()

        requester_id = self.request.query_params.get("requester_customer", "").strip()
        if requester_id:
            try:
                queryset = queryset.filter(requester_customer_id=uuid.UUID(requester_id))
            except (ValueError, TypeError, AttributeError):
                return queryset.none()

        search = normalize_digits(self.request.query_params.get("search", "")).strip()
        if search:
            queryset = queryset.filter(
                Q(request_number__icontains=search)
                | Q(application__application_number__icontains=search)
                | Q(application__customer__customer_number__icontains=search)
                | Q(application__customer__first_name__icontains=search)
                | Q(application__customer__last_name__icontains=search)
                | Q(application__customer__organization_name__icontains=search)
                | Q(requester_customer__customer_number__icontains=search)
                | Q(requester_customer__first_name__icontains=search)
                | Q(requester_customer__last_name__icontains=search)
                | Q(requester_customer__organization_name__icontains=search)
            )
        return queryset

    @transaction.atomic
    def perform_create(self, serializer):
        guarantee = serializer.save(created_by=self.request.user)
        record_audit(
            self.request,
            "guarantee_request.created",
            actor=self.request.user,
            entity_type="guarantee_request",
            entity_id=str(guarantee.pk),
            metadata={
                "application_id": str(guarantee.application_id),
                "requester_customer_id": (
                    str(guarantee.requester_customer_id)
                    if guarantee.requester_customer_id else None
                ),
                "status": guarantee.status,
            },
        )

    def destroy(self, request, *args, **kwargs):
        return Response(
            {"detail": "حذف فیزیکی درخواست ضمانت مجاز نیست."},
            status=status.HTTP_405_METHOD_NOT_ALLOWED,
        )
