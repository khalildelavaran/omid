from django.db import transaction
from django.utils import timezone
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied, ValidationError
from rest_framework.permissions import BasePermission, SAFE_METHODS
from rest_framework.response import Response

from core.audit import record_audit
from .models import CaseParty, LoanApplication, MeratAssessment, StageInstance
from .workflow_serializers import CasePartySerializer, MeratAssessmentSerializer, StageInstanceSerializer




class IsWorkflowStaff(BasePermission):
    read_roles = {"system_admin", "intake", "case_worker", "credit_approver", "finance", "auditor"}
    write_roles = {"system_admin", "intake", "case_worker"}

    def has_permission(self, request, view):
        user = request.user
        if not user or not user.is_authenticated or not user.is_staff:
            return False
        role = _role(user)
        return role in self.read_roles and (request.method in SAFE_METHODS or role in self.write_roles)

    def has_object_permission(self, request, view, obj):
        role = _role(request.user)
        if role == "system_admin":
            return True
        application = getattr(obj, "application", None)
        if application is None and hasattr(obj, "stage"):
            application = obj.stage.application
        if role in {"intake", "case_worker"}:
            return application is not None and application.assigned_to_id == request.user.id
        return request.method in SAFE_METHODS


PERSON_STAGE_CODES = (
    StageInstance.Code.DOCUMENTS,
    StageInstance.Code.ACCOUNT,
    StageInstance.Code.MERAT,
    StageInstance.Code.DIGITAL_BANKING,
    StageInstance.Code.E_NOTE,
)
CASE_STAGE_CODES = (
    StageInstance.Code.LOAN_SUBMISSION,
    StageInstance.Code.BANK_REVIEW,
    StageInstance.Code.DISBURSEMENT,
    StageInstance.Code.SETTLEMENT,
    StageInstance.Code.HANDOVER,
)


def _role(user):
    return "system_admin" if user.is_superuser else getattr(getattr(user, "profile", None), "role", None)


def _scope_applications(queryset, user):
    role = _role(user)
    if role in {"intake", "case_worker"}:
        return queryset.filter(assigned_to=user, archived_at__isnull=True)
    if role in {"system_admin", "credit_approver", "finance", "auditor"}:
        return queryset.filter(archived_at__isnull=True)
    return queryset.none()


def _assert_application_access(user, application):
    if not _scope_applications(LoanApplication.objects.all(), user).filter(pk=application.pk).exists():
        raise PermissionDenied("به این پرونده دسترسی ندارید.")


class CasePartyViewSet(viewsets.ModelViewSet):
    serializer_class = CasePartySerializer
    permission_classes = [IsWorkflowStaff]
    http_method_names = ["get", "post", "patch", "head", "options"]

    def get_queryset(self):
        queryset = CaseParty.objects.select_related("application", "person")
        role = _role(self.request.user)
        if role in {"intake", "case_worker"}:
            queryset = queryset.filter(application__assigned_to=self.request.user)
        elif role not in {"system_admin", "credit_approver", "finance", "auditor"}:
            return queryset.none()
        queryset = queryset.filter(application__archived_at__isnull=True)
        application_id = self.request.query_params.get("application")
        if application_id:
            queryset = queryset.filter(application_id=application_id)
        return queryset

    @transaction.atomic
    def perform_create(self, serializer):
        application = serializer.validated_data["application"]
        _assert_application_access(self.request.user, application)
        party = serializer.save()
        for code in PERSON_STAGE_CODES:
            StageInstance.objects.get_or_create(
                application=application, party=party, code=code,
                defaults={"status": StageInstance.Status.PENDING},
            )
        record_audit(
            self.request, "case_party.created", actor=self.request.user,
            entity_type="case_party", entity_id=str(party.pk),
            metadata={"application_id": str(application.pk), "role": party.role},
        )

    @transaction.atomic
    def perform_update(self, serializer):
        before = serializer.instance
        old_status = before.membership_status
        party = serializer.save()
        record_audit(
            self.request, "case_party.updated", actor=self.request.user,
            entity_type="case_party", entity_id=str(party.pk),
            metadata={"updated_fields": sorted(serializer.validated_data.keys()),
                      "membership_status_changed": old_status != party.membership_status},
        )


class StageInstanceViewSet(viewsets.ModelViewSet):
    serializer_class = StageInstanceSerializer
    permission_classes = [IsWorkflowStaff]
    http_method_names = ["get", "post", "patch", "head", "options"]

    def get_queryset(self):
        queryset = StageInstance.objects.select_related(
            "application", "party", "party__person", "assigned_to"
        )
        role = _role(self.request.user)
        if role in {"intake", "case_worker"}:
            queryset = queryset.filter(application__assigned_to=self.request.user)
        elif role not in {"system_admin", "credit_approver", "finance", "auditor"}:
            return queryset.none()
        application_id = self.request.query_params.get("application")
        if application_id:
            queryset = queryset.filter(application_id=application_id)
        party_id = self.request.query_params.get("party")
        if party_id:
            queryset = queryset.filter(party_id=party_id)
        return queryset.filter(application__archived_at__isnull=True)

    @transaction.atomic
    def perform_create(self, serializer):
        application = serializer.validated_data["application"]
        _assert_application_access(self.request.user, application)
        stage = serializer.save()
        stage.full_clean()
        record_audit(
            self.request, "workflow_stage.created", actor=self.request.user,
            entity_type="workflow_stage", entity_id=str(stage.pk),
            metadata={"application_id": str(application.pk), "code": stage.code},
        )

    @transaction.atomic
    def perform_update(self, serializer):
        stage = serializer.save()
        record_audit(
            self.request, "workflow_stage.updated", actor=self.request.user,
            entity_type="workflow_stage", entity_id=str(stage.pk),
            metadata={"updated_fields": sorted(serializer.validated_data.keys())},
        )

    @action(detail=True, methods=["post"], url_path="transition")
    @transaction.atomic
    def transition(self, request, pk=None):
        stage = self.get_object()
        stage = StageInstance.objects.select_for_update().select_related(
            "application", "party", "party__person"
        ).get(pk=stage.pk)
        command = request.data.get("action")
        reason = request.data.get("reason", "")
        if not isinstance(reason, str) or len(reason.strip()) > 500:
            raise ValidationError({"reason": "دلیل باید متن و حداکثر ۵۰۰ نویسه باشد."})
        reason = reason.strip()
        evidence_reference = request.data.get("evidence_reference", stage.evidence_reference)
        if not isinstance(evidence_reference, str) or len(evidence_reference.strip()) > 500:
            raise ValidationError({"evidence_reference": "مرجع مدرک باید متن و حداکثر ۵۰۰ نویسه باشد."})
        evidence_reference = evidence_reference.strip()
        role = _role(request.user)

        if command == "start":
            if stage.status not in {StageInstance.Status.PENDING, StageInstance.Status.ACTION_NEEDED}:
                raise ValidationError({"action": "شروع فقط برای مرحله در انتظار یا نیازمند اقدام مجاز است."})
            if stage.code == StageInstance.Code.LOAN_SUBMISSION:
                _ensure_submission_ready(stage.application)
            _ensure_case_stage_prerequisite(stage)
            stage.status = StageInstance.Status.IN_PROGRESS
            stage.started_at = stage.started_at or timezone.now()
        elif command == "complete":
            if stage.status != StageInstance.Status.IN_PROGRESS:
                raise ValidationError({"action": "فقط مرحله در جریان قابل تکمیل است."})
            if stage.code == StageInstance.Code.LOAN_SUBMISSION:
                _ensure_submission_ready(stage.application)
            _ensure_case_stage_prerequisite(stage)
            if stage.code == StageInstance.Code.DISBURSEMENT:
                from .models import Disbursement
                if not stage.application.disbursements.filter(status=Disbursement.Status.CONFIRMED).exists():
                    raise ValidationError({"detail": "تکمیل مرحله واریز به حداقل یک واریز تأییدشده نیاز دارد."})
            if stage.code == StageInstance.Code.ACCOUNT and stage.party.account_status == CaseParty.AccountStatus.NEEDS_OPENING:
                if not evidence_reference:
                    raise ValidationError({"evidence_reference": "برای تأیید افتتاح حساب، مرجع مدرک الزامی است."})
                stage.evidence_reference = evidence_reference
            stage.status = StageInstance.Status.COMPLETED
            stage.completed_at = timezone.now()
        elif command == "hold":
            if not reason:
                raise ValidationError({"reason": "برای تعلیق مرحله، دلیل الزامی است."})
            stage.status = StageInstance.Status.ON_HOLD
            stage.hold_reason = reason
        elif command == "bypass":
            if role != "system_admin":
                raise PermissionDenied("عبور از مرحله فقط با مجوز مدیر سامانه ممکن است.")
            if not reason:
                raise ValidationError({"reason": "برای عبور از مرحله، دلیل مستند الزامی است."})
            if stage.code == StageInstance.Code.ACCOUNT and stage.party_id:
                if stage.party.account_status != CaseParty.AccountStatus.EXISTING_VERIFIED:
                    raise ValidationError({"action": "عبور از مرحله حساب فقط برای حساب موجودِ تأییدشده مجاز است."})
            stage.status = StageInstance.Status.BYPASSED
            stage.hold_reason = reason
            stage.completed_at = timezone.now()
        else:
            raise ValidationError({"action": "عملیات مجاز: start، complete، hold، bypass."})

        stage.full_clean()
        stage.save()
        record_audit(
            request, "workflow_stage.transition", actor=request.user,
            entity_type="workflow_stage", entity_id=str(stage.pk),
            metadata={
                "action": command,
                "status": stage.status,
                "reason_length": len(reason),
                "evidence_reference": stage.evidence_reference if command == "complete" and stage.code == StageInstance.Code.ACCOUNT else "",
            },
        )
        return Response(self.get_serializer(stage).data, status=status.HTTP_200_OK)


def _ensure_submission_ready(application):
    parties = list(application.parties.filter(membership_status=CaseParty.MembershipStatus.ACTIVE))
    if not parties or not any(p.role == CaseParty.Role.APPLICANT for p in parties):
        raise ValidationError({"detail": "پرونده باید متقاضی اصلی فعال داشته باشد."})
    required_codes = {
        StageInstance.Code.DOCUMENTS,
        StageInstance.Code.ACCOUNT,
        StageInstance.Code.MERAT,
        StageInstance.Code.DIGITAL_BANKING,
        StageInstance.Code.E_NOTE,
    }
    allowed = {StageInstance.Status.COMPLETED, StageInstance.Status.BYPASSED}
    for party in parties:
        stages = {s.code: s for s in StageInstance.objects.filter(application=application, party=party)}
        missing = sorted(code for code in required_codes if code not in stages or stages[code].status not in allowed)
        if missing:
            raise ValidationError({
                "detail": "ثبت درخواست وام تا تکمیل مراحل الزامی همه اشخاص فعال مجاز نیست.",
                "party_id": str(party.pk),
                "incomplete_stages": missing,
            })


def _ensure_case_stage_prerequisite(stage):
    prerequisites = {
        StageInstance.Code.BANK_REVIEW: (StageInstance.Code.LOAN_SUBMISSION, "ثبت درخواست تسهیلات"),
        StageInstance.Code.DISBURSEMENT: (StageInstance.Code.BANK_REVIEW, "بررسی بانک"),
        StageInstance.Code.SETTLEMENT: (StageInstance.Code.DISBURSEMENT, "واریز تسهیلات"),
        StageInstance.Code.HANDOVER: (StageInstance.Code.SETTLEMENT, "تسویه"),
    }
    prerequisite = prerequisites.get(stage.code)
    if not prerequisite:
        return
    prerequisite_code, prerequisite_label = prerequisite
    prerequisite_done = stage.application.stage_instances.filter(
        code=prerequisite_code,
        status__in=[StageInstance.Status.COMPLETED, StageInstance.Status.BYPASSED],
    ).exists()
    if not prerequisite_done:
        raise ValidationError({
            "detail": f"این عملیات تا تکمیل مرحله «{prerequisite_label}» مجاز نیست."
        })


class MeratAssessmentViewSet(viewsets.ModelViewSet):
    serializer_class = MeratAssessmentSerializer
    permission_classes = [IsWorkflowStaff]
    http_method_names = ["get", "post", "patch", "head", "options"]

    def get_queryset(self):
        queryset = MeratAssessment.objects.select_related(
            "stage", "stage__application", "stage__party", "requester", "subject"
        )
        role = _role(self.request.user)
        if role in {"intake", "case_worker"}:
            queryset = queryset.filter(stage__application__assigned_to=self.request.user)
        elif role not in {"system_admin", "credit_approver", "finance", "auditor"}:
            return queryset.none()
        queryset = queryset.filter(stage__application__archived_at__isnull=True)
        application_id = self.request.query_params.get("application")
        if application_id:
            queryset = queryset.filter(stage__application_id=application_id)
        return queryset

    @transaction.atomic
    def perform_create(self, serializer):
        assessment = serializer.save(recorded_by=self.request.user)
        record_audit(
            self.request, "merat_assessment.created", actor=self.request.user,
            entity_type="merat_assessment", entity_id=str(assessment.pk),
            metadata={"stage_id": str(assessment.stage_id), "result": assessment.result},
        )

    @transaction.atomic
    def perform_update(self, serializer):
        assessment = serializer.save(recorded_by=self.request.user)
        record_audit(
            self.request, "merat_assessment.updated", actor=self.request.user,
            entity_type="merat_assessment", entity_id=str(assessment.pk),
            metadata={"updated_fields": sorted(serializer.validated_data.keys()),
                      "result": assessment.result},
        )
