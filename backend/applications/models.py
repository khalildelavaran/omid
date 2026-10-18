import uuid

from django.conf import settings
from django.db import models
from django.utils import timezone


class LoanApplication(models.Model):
    class ProductType(models.TextChoices):
        WORKING_CAPITAL = "working_capital", "سرمایه در گردش"
        PERSONAL = "personal", "تسهیلات شخصی"
        CORPORATE_CREDIT = "corporate_credit", "اعتباری شرکتی"
        EQUIPMENT = "equipment", "خرید تجهیزات"

    class Status(models.TextChoices):
        UNDER_REVIEW = "under_review", "در حال بررسی"
        AWAITING_DOCUMENTS = "awaiting_documents", "تکمیل مدارک"
        AWAITING_APPROVAL = "awaiting_approval", "در انتظار تأیید"
        APPROVED = "approved", "تأیید شده"
        REJECTED = "rejected", "رد شده"
        CANCELLED = "cancelled", "لغو شده"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    application_number = models.CharField(max_length=32, unique=True, db_index=True, blank=True, default="")
    customer = models.ForeignKey("customers.Customer", on_delete=models.PROTECT, related_name="loan_applications")
    product_type = models.CharField(max_length=24, choices=ProductType.choices)
    requested_amount = models.DecimalField(max_digits=18, decimal_places=0)
    loan_commission_pct = models.DecimalField(max_digits=5, decimal_places=2, default="25.00")
    commission_override_reason = models.CharField(max_length=500, blank=True)
    term_months = models.PositiveSmallIntegerField(null=True, blank=True)
    status = models.CharField(max_length=24, choices=Status.choices, default=Status.UNDER_REVIEW)
    assigned_to = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name="assigned_loan_applications")
    purpose = models.CharField(max_length=250, blank=True)
    notes = models.TextField(blank=True)
    archived_at = models.DateTimeField(null=True, blank=True, db_index=True)
    archived_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="archived_loan_applications",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["status", "created_at"], name="apps_status_created_idx"),
            models.Index(fields=["assigned_to", "status"], name="apps_owner_status_idx"),
        ]

    def save(self, *args, **kwargs):
        if not self.application_number:
            self.application_number = f"APP-{timezone.localdate():%Y%m%d}-{uuid.uuid4().hex[:10].upper()}"
        super().save(*args, **kwargs)

    def __str__(self) -> str:
        return self.application_number


class ApplicationEventQuerySet(models.QuerySet):
    def update(self, **kwargs):
        raise ValueError("Application events are append-only.")

    def delete(self):
        raise ValueError("Application events are append-only.")

    def bulk_update(self, objs, fields, batch_size=None):
        raise ValueError("Application events are append-only.")


class ApplicationEvent(models.Model):
    """Append-only business history for a loan application."""

    class EventType(models.TextChoices):
        CREATED = "created", "ثبت پرونده"
        STATUS_CHANGED = "status_changed", "تغییر وضعیت"
        NOTE_ADDED = "note_added", "یادداشت پیگیری"
        ARCHIVED = "archived", "بایگانی پرونده"

    objects = ApplicationEventQuerySet.as_manager()

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    application = models.ForeignKey(LoanApplication, on_delete=models.PROTECT, related_name="events")
    event_type = models.CharField(max_length=24, choices=EventType.choices)
    previous_status = models.CharField(max_length=24, choices=LoanApplication.Status.choices, blank=True)
    new_status = models.CharField(max_length=24, choices=LoanApplication.Status.choices, blank=True)
    note = models.TextField(blank=True)
    actor = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="loan_application_events",
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["created_at", "id"]
        indexes = [models.Index(fields=["application", "created_at"], name="app_event_created_idx")]

    def save(self, *args, **kwargs):
        if self.pk and type(self).objects.filter(pk=self.pk).exists():
            raise ValueError("Application events are append-only.")
        super().save(*args, **kwargs)

    def delete(self, *args, **kwargs):
        raise ValueError("Application events cannot be deleted through the model API.")

    def __str__(self) -> str:
        return f"{self.application.application_number}: {self.event_type}"


class CaseParty(models.Model):
    """A person participating in a loan application as applicant or guarantor."""

    class Role(models.TextChoices):
        APPLICANT = "applicant", "متقاضی اصلی"
        GUARANTOR = "guarantor", "ضامن"
        REPRESENTATIVE = "representative", "نماینده"

    class MembershipStatus(models.TextChoices):
        ACTIVE = "active", "فعال"
        REPLACED = "replaced", "جایگزین‌شده"
        REMOVED = "removed", "خارج‌شده"

    class AccountStatus(models.TextChoices):
        UNKNOWN = "unknown", "بررسی‌نشده"
        EXISTING_VERIFIED = "existing_verified", "حساب موجود تأییدشده"
        NEEDS_OPENING = "needs_opening", "نیازمند افتتاح"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    application = models.ForeignKey(LoanApplication, on_delete=models.PROTECT, related_name="parties")
    person = models.ForeignKey("customers.Customer", on_delete=models.PROTECT, related_name="loan_case_participations")
    role = models.CharField(max_length=20, choices=Role.choices)
    relationship_to_applicant = models.CharField(max_length=80, blank=True)
    membership_status = models.CharField(max_length=16, choices=MembershipStatus.choices, default=MembershipStatus.ACTIVE)
    account_status = models.CharField(max_length=24, choices=AccountStatus.choices, default=AccountStatus.UNKNOWN)
    sort_order = models.PositiveSmallIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["sort_order", "created_at"]
        indexes = [
            models.Index(fields=["application", "membership_status"], name="party_app_status_idx"),
            models.Index(fields=["person", "role"], name="party_person_role_idx"),
        ]
        constraints = [
            models.CheckConstraint(
                condition=~models.Q(role="applicant") | models.Q(sort_order=0),
                name="party_applicant_order_zero",
            ),
            models.UniqueConstraint(
                fields=["application"],
                condition=models.Q(role="applicant", membership_status="active"),
                name="uniq_active_case_applicant",
            ),
            models.UniqueConstraint(
                fields=["application", "person"],
                condition=models.Q(membership_status="active"),
                name="uniq_active_case_party_person",
            ),
        ]

    def __str__(self) -> str:
        return f"{self.application.application_number}: {self.get_role_display()}"


class StageInstance(models.Model):
    """Independent workflow stage for either one case party or the whole application."""

    class Code(models.TextChoices):
        DOCUMENTS = "documents", "مدارک"
        ACCOUNT = "account", "وضعیت حساب"
        MERAT = "merat", "اعتبارسنجی مرآت"
        DIGITAL_BANKING = "digital_banking", "بانکداری دیجیتال"
        E_NOTE = "e_note", "سفته الکترونیک"
        LOAN_SUBMISSION = "loan_submission", "ثبت درخواست وام"
        BANK_REVIEW = "bank_review", "بررسی بانک"
        DISBURSEMENT = "disbursement", "واریز تسهیلات"
        SETTLEMENT = "settlement", "تسویه"
        HANDOVER = "handover", "تحویل نهایی"

    class Status(models.TextChoices):
        LOCKED = "locked", "قفل‌شده"
        PENDING = "pending", "در انتظار"
        IN_PROGRESS = "in_progress", "در جریان"
        ACTION_NEEDED = "action_needed", "نیازمند اقدام"
        COMPLETED = "completed", "تکمیل‌شده"
        BYPASSED = "bypassed", "عبور مجاز"
        REJECTED = "rejected", "ردشده"
        ON_HOLD = "on_hold", "تعلیق"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    application = models.ForeignKey(LoanApplication, on_delete=models.PROTECT, related_name="stage_instances")
    party = models.ForeignKey(CaseParty, on_delete=models.PROTECT, null=True, blank=True, related_name="stage_instances")
    code = models.CharField(max_length=24, choices=Code.choices)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.LOCKED)
    assigned_to = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.PROTECT, null=True, blank=True,
        related_name="assigned_stage_instances",
    )
    started_at = models.DateTimeField(null=True, blank=True)
    due_at = models.DateTimeField(null=True, blank=True, db_index=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    outcome = models.CharField(max_length=120, blank=True)
    hold_reason = models.CharField(max_length=500, blank=True)
    evidence_reference = models.CharField(max_length=500, blank=True)
    follow_up_count = models.PositiveIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["created_at"]
        indexes = [
            models.Index(fields=["application", "code", "status"], name="stage_app_code_status_idx"),
            models.Index(fields=["assigned_to", "status", "due_at"], name="stage_owner_status_due_idx"),
        ]
        constraints = [
            models.UniqueConstraint(
                fields=["application", "party", "code"],
                condition=models.Q(party__isnull=False),
                name="uniq_party_stage_code",
            ),
            models.UniqueConstraint(
                fields=["application", "code"],
                condition=models.Q(party__isnull=True),
                name="uniq_case_stage_code",
            ),
        ]

    def clean(self):
        from django.core.exceptions import ValidationError
        if self.party_id and self.party.application_id != self.application_id:
            raise ValidationError({"party": "شخص باید متعلق به همین پرونده باشد."})
        if self.code in {
            self.Code.DOCUMENTS, self.Code.ACCOUNT, self.Code.MERAT,
            self.Code.DIGITAL_BANKING, self.Code.E_NOTE,
        } and not self.party_id:
            raise ValidationError({"party": "این مرحله باید به یک شخص پرونده متصل باشد."})
        if self.code in {
            self.Code.LOAN_SUBMISSION, self.Code.BANK_REVIEW, self.Code.DISBURSEMENT,
            self.Code.SETTLEMENT, self.Code.HANDOVER,
        } and self.party_id:
            raise ValidationError({"party": "این مرحله در سطح کل پرونده اجرا می‌شود."})

    def __str__(self) -> str:
        return f"{self.application.application_number}: {self.code} / {self.status}"


class MeratAssessment(models.Model):
    """Manual, evidence-backed record of an external Merat assessment; no bank API is implied."""

    class Result(models.TextChoices):
        PENDING = "pending", "در انتظار نتیجه"
        APPROVED = "approved", "تأیید"
        REJECTED = "rejected", "رد"
        NEEDS_CORRECTION = "needs_correction", "نیازمند اصلاح"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    stage = models.OneToOneField(StageInstance, on_delete=models.PROTECT, related_name="merat_assessment")
    requester = models.ForeignKey("customers.Customer", on_delete=models.PROTECT, related_name="merat_requests_made")
    subject = models.ForeignKey("customers.Customer", on_delete=models.PROTECT, related_name="merat_assessments_received")
    relationship_to_applicant = models.CharField(max_length=80)
    submitted_at = models.DateTimeField(null=True, blank=True)
    external_reference = models.CharField(max_length=120, blank=True)
    result = models.CharField(max_length=24, choices=Result.choices, default=Result.PENDING)
    result_reason = models.CharField(max_length=500, blank=True)
    reported_limit_rial = models.PositiveBigIntegerField(null=True, blank=True)
    evidence_reference = models.CharField(max_length=500, blank=True)
    recorded_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.PROTECT, null=True, blank=True,
        related_name="recorded_merat_assessments",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def clean(self):
        from django.core.exceptions import ValidationError
        if self.stage_id and self.stage.code != StageInstance.Code.MERAT:
            raise ValidationError({"stage": "ارزیابی مرآت باید به مرحله مرآت متصل باشد."})
        if self.reported_limit_rial is not None and self.reported_limit_rial < 0:
            raise ValidationError({"reported_limit_rial": "مبلغ نمی‌تواند منفی باشد."})

    def __str__(self) -> str:
        return f"مرآت: {self.subject_id} ({self.result})"


class DisbursementQuerySet(models.QuerySet):
    def update(self, **kwargs):
        raise ValueError("Disbursement records are immutable through bulk updates.")

    def delete(self):
        raise ValueError("Disbursement records are retained for audit.")

    def bulk_update(self, objs, fields, batch_size=None):
        raise ValueError("Disbursement records are immutable through bulk updates.")


class Disbursement(models.Model):
    objects = DisbursementQuerySet.as_manager()
    """Actual disbursement evidence; commission is calculated only on confirmed amounts."""

    class Status(models.TextChoices):
        PENDING = "pending", "در انتظار تأیید واریز"
        CONFIRMED = "confirmed", "واریز تأییدشده"
        FAILED = "failed", "واریز ناموفق"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    disbursement_number = models.CharField(max_length=40, unique=True, blank=True, default="")
    application = models.ForeignKey(LoanApplication, on_delete=models.PROTECT, related_name="disbursements")
    amount_rial = models.PositiveBigIntegerField()
    commission_rate_pct = models.DecimalField(max_digits=5, decimal_places=2, default="25.00")
    commission_amount_rial = models.PositiveBigIntegerField(default=0)
    status = models.CharField(max_length=16, choices=Status.choices, default=Status.PENDING)
    bank_reference = models.CharField(max_length=120, blank=True)
    evidence_reference = models.CharField(max_length=500, blank=True)
    recorded_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name="recorded_disbursements")
    confirmed_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["application", "status"], name="disburse_app_status_idx"),
            models.Index(fields=["status", "confirmed_at"], name="disburse_status_confirmed_idx"),
        ]
        constraints = [
            models.CheckConstraint(condition=models.Q(amount_rial__gt=0), name="disbursement_amount_positive"),
            models.CheckConstraint(condition=models.Q(commission_rate_pct__gte=0, commission_rate_pct__lte=100), name="disbursement_commission_rate_range"),
        ]

    def save(self, *args, **kwargs):
        from decimal import Decimal, ROUND_HALF_UP
        from django.utils import timezone
        if self.pk:
            existing = type(self).objects.filter(pk=self.pk).first()
            if existing and existing.status == self.Status.CONFIRMED:
                raise ValueError("Confirmed disbursements are immutable.")
        if not self.disbursement_number:
            self.disbursement_number = f"DISB-{timezone.localdate():%Y%m%d}-{uuid.uuid4().hex[:10].upper()}"
        if self.application_id and self._state.adding:
            self.commission_rate_pct = self.application.loan_commission_pct
        if self.status == self.Status.CONFIRMED:
            if not self.bank_reference.strip():
                raise ValueError("Confirmed disbursement requires a bank reference.")
            if not self.evidence_reference.strip():
                raise ValueError("Confirmed disbursement requires an evidence reference.")
            # Snapshot the currently authorized case rate at confirmation, not when a pending record was drafted.
            self.commission_rate_pct = self.application.loan_commission_pct
            self.commission_amount_rial = int(
                (Decimal(self.amount_rial) * self.commission_rate_pct / Decimal("100")).quantize(
                    Decimal("1"), rounding=ROUND_HALF_UP
                )
            )
            self.confirmed_at = self.confirmed_at or timezone.now()
        else:
            self.commission_amount_rial = 0
            self.confirmed_at = None
        super().save(*args, **kwargs)

    def delete(self, *args, **kwargs):
        raise ValueError("Disbursement records are retained for audit.")

    def __str__(self) -> str:
        return self.disbursement_number
