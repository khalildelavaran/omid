from django.db import transaction
from django.utils import timezone
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied, ValidationError
from rest_framework.permissions import BasePermission, SAFE_METHODS
from rest_framework.response import Response

from core.audit import record_audit
from .models import Disbursement, LoanApplication, StageInstance
from .disbursement_serializers import DisbursementSerializer


def _role(user):
    return "system_admin" if user.is_superuser else getattr(getattr(user, "profile", None), "role", None)


class IsDisbursementStaff(BasePermission):
    read_roles = {"system_admin", "intake", "case_worker", "credit_approver", "finance", "auditor"}
    create_roles = {"system_admin", "intake", "case_worker"}

    def has_permission(self, request, view):
        user = request.user
        if not user or not user.is_authenticated or not user.is_staff:
            return False
        role = _role(user)
        if request.method in SAFE_METHODS:
            return role in self.read_roles
        if getattr(view, "action", None) == "confirm":
            return role in {"system_admin", "finance"}
        return role in self.create_roles

    def has_object_permission(self, request, view, obj):
        role = _role(request.user)
        if role == "system_admin":
            return True
        if role in {"intake", "case_worker"}:
            return obj.application.assigned_to_id == request.user.id
        if getattr(view, "action", None) == "confirm":
            return role == "finance"
        return request.method in SAFE_METHODS


class DisbursementViewSet(viewsets.ModelViewSet):
    serializer_class = DisbursementSerializer
    permission_classes = [IsDisbursementStaff]
    queryset = Disbursement.objects.select_related("application", "recorded_by").all()
    http_method_names = ["get", "post", "head", "options"]

    def get_queryset(self):
        queryset = super().get_queryset().filter(application__archived_at__isnull=True)
        role = _role(self.request.user)
        if role in {"intake", "case_worker"}:
            queryset = queryset.filter(application__assigned_to=self.request.user)
        elif role not in {"system_admin", "credit_approver", "finance", "auditor"}:
            return queryset.none()
        application_id = self.request.query_params.get("application")
        if application_id:
            queryset = queryset.filter(application_id=application_id)
        return queryset

    @transaction.atomic
    def perform_create(self, serializer):
        application = serializer.validated_data["application"]
        role = _role(self.request.user)
        if role != "system_admin" and application.assigned_to_id != self.request.user.id:
            raise PermissionDenied("برای ثبت واریز به این پرونده دسترسی ندارید.")
        disbursement = serializer.save(recorded_by=self.request.user)
        record_audit(
            self.request, "disbursement.recorded", actor=self.request.user,
            entity_type="disbursement", entity_id=str(disbursement.pk),
            metadata={"application_id": str(application.pk), "amount_rial": disbursement.amount_rial},
        )

    @action(detail=True, methods=["post"], url_path="confirm")
    @transaction.atomic
    def confirm(self, request, pk=None):
        disbursement = self.get_queryset().select_for_update().get(pk=self.get_object().pk)
        if _role(request.user) not in {"system_admin", "finance"}:
            raise PermissionDenied("تأیید واریز فقط در اختیار مالی یا مدیر سامانه است.")
        if disbursement.status != Disbursement.Status.PENDING:
            raise ValidationError({"status": "فقط واریز در انتظار قابل تأیید است."})
        bank_reference = request.data.get("bank_reference", "")
        evidence_reference = request.data.get("evidence_reference", "")
        if not isinstance(bank_reference, str) or not bank_reference.strip() or len(bank_reference.strip()) > 120:
            raise ValidationError({"bank_reference": "مرجع بانکی الزامی و حداکثر ۱۲۰ نویسه است."})
        if not isinstance(evidence_reference, str) or len(evidence_reference.strip()) > 500:
            raise ValidationError({"evidence_reference": "مرجع مدرک باید حداکثر ۵۰۰ نویسه باشد."})
        stage = StageInstance.objects.select_for_update().filter(
            application=disbursement.application, party__isnull=True,
            code=StageInstance.Code.DISBURSEMENT,
        ).first()
        if stage is None or stage.status != StageInstance.Status.IN_PROGRESS:
            raise ValidationError({"detail": "برای تأیید واریز، مرحله واریز در سطح پرونده باید در جریان باشد."})
        disbursement.bank_reference = bank_reference.strip()
        disbursement.evidence_reference = evidence_reference.strip()
        disbursement.status = Disbursement.Status.CONFIRMED
        disbursement.save()
        record_audit(
            request, "disbursement.confirmed", actor=request.user,
            entity_type="disbursement", entity_id=str(disbursement.pk),
            metadata={
                "application_id": str(disbursement.application_id),
                "amount_rial": disbursement.amount_rial,
                "commission_rate_pct": str(disbursement.commission_rate_pct),
                "commission_amount_rial": disbursement.commission_amount_rial,
                "bank_reference": disbursement.bank_reference,
            },
        )
        return Response(self.get_serializer(disbursement).data, status=status.HTTP_200_OK)
