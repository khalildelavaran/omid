import uuid

from django.db import transaction
from django.db.models import Q
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import ValidationError
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from accounts.models import UserProfile
from core.audit import record_audit
from .models import GuaranteeRequest, GuaranteeRequestEvent
from .permissions import IsStaffGuaranteeOperator
from .serializers import (
    GuaranteeRequestEventSerializer,
    GuaranteeRequestSerializer,
    GuaranteeTransitionSerializer,
)


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

    def get_serializer_class(self):
        if getattr(self, "action", None) == "transition":
            return GuaranteeTransitionSerializer
        return GuaranteeRequestSerializer

    @transaction.atomic
    def perform_create(self, serializer):
        guarantee = serializer.save(created_by=self.request.user)
        GuaranteeRequestEvent.objects.create(
            guarantee_request=guarantee,
            event_type=GuaranteeRequestEvent.EventType.CREATED,
            new_status=guarantee.status,
            note=guarantee.note,
            actor=self.request.user,
        )
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

    @action(detail=True, methods=["get"], url_path="events")
    def events(self, request, pk=None):
        guarantee = self.get_object()
        events = guarantee.events.select_related("actor").all()
        return Response(GuaranteeRequestEventSerializer(events, many=True).data)

    @action(detail=True, methods=["post"], url_path="transition")
    @transaction.atomic
    def transition(self, request, pk=None):
        guarantee = self.get_object()
        guarantee = GuaranteeRequest.objects.select_for_update().get(pk=guarantee.pk)

        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        new_status = serializer.validated_data["status"]
        reason = serializer.validated_data.get("reason", "").strip()
        previous_status = guarantee.status
        role = UserProfile.Role.SYSTEM_ADMIN if request.user.is_superuser else getattr(
            getattr(request.user, "profile", None), "role", None
        )

        allowed_by_role = {
            UserProfile.Role.SYSTEM_ADMIN: {
                GuaranteeRequest.Status.REGISTERED: {
                    GuaranteeRequest.Status.UNDER_REVIEW,
                    GuaranteeRequest.Status.CANCELLED,
                },
                GuaranteeRequest.Status.UNDER_REVIEW: {GuaranteeRequest.Status.CANCELLED},
            },
            UserProfile.Role.INTAKE: {
                GuaranteeRequest.Status.REGISTERED: {
                    GuaranteeRequest.Status.UNDER_REVIEW,
                    GuaranteeRequest.Status.CANCELLED,
                },
                GuaranteeRequest.Status.UNDER_REVIEW: {GuaranteeRequest.Status.CANCELLED},
            },
            UserProfile.Role.CASE_WORKER: {
                GuaranteeRequest.Status.REGISTERED: {
                    GuaranteeRequest.Status.UNDER_REVIEW,
                    GuaranteeRequest.Status.CANCELLED,
                },
                GuaranteeRequest.Status.UNDER_REVIEW: {GuaranteeRequest.Status.CANCELLED},
            },
            UserProfile.Role.CREDIT_APPROVER: {
                GuaranteeRequest.Status.UNDER_REVIEW: {
                    GuaranteeRequest.Status.APPROVED,
                    GuaranteeRequest.Status.REJECTED,
                },
            },
            UserProfile.Role.FINANCE: {
                GuaranteeRequest.Status.APPROVED: {GuaranteeRequest.Status.FULFILLED},
            },
        }
        allowed = allowed_by_role.get(role, {}).get(previous_status, set())
        if new_status not in allowed:
            raise ValidationError({
                "status": "این انتقال وضعیت برای نقش فعلی یا مرحله جاری مجاز نیست."
            })

        guarantee.status = new_status
        guarantee.save(update_fields=["status", "updated_at"])
        GuaranteeRequestEvent.objects.create(
            guarantee_request=guarantee,
            event_type=GuaranteeRequestEvent.EventType.STATUS_CHANGED,
            previous_status=previous_status,
            new_status=new_status,
            note=reason,
            actor=request.user,
        )
        record_audit(
            request,
            "guarantee_request.status_changed",
            actor=request.user,
            entity_type="guarantee_request",
            entity_id=str(guarantee.pk),
            metadata={
                "previous_status": previous_status,
                "new_status": new_status,
                "reason_length": len(reason),
            },
        )
        return Response(
            GuaranteeRequestSerializer(guarantee, context=self.get_serializer_context()).data,
            status=status.HTTP_200_OK,
        )

    def destroy(self, request, *args, **kwargs):
        return Response(
            {"detail": "حذف فیزیکی درخواست ضمانت مجاز نیست."},
            status=status.HTTP_405_METHOD_NOT_ALLOWED,
        )
