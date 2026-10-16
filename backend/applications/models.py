import uuid

from django.conf import settings
from django.db import models


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
    application_number = models.CharField(max_length=32, unique=True, db_index=True)
    customer = models.ForeignKey("customers.Customer", on_delete=models.PROTECT, related_name="loan_applications")
    product_type = models.CharField(max_length=24, choices=ProductType.choices)
    requested_amount = models.DecimalField(max_digits=18, decimal_places=0)
    term_months = models.PositiveSmallIntegerField(null=True, blank=True)
    status = models.CharField(max_length=24, choices=Status.choices, default=Status.UNDER_REVIEW)
    assigned_to = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name="assigned_loan_applications")
    purpose = models.CharField(max_length=250, blank=True)
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["status", "created_at"], name="apps_status_created_idx"),
            models.Index(fields=["assigned_to", "status"], name="apps_owner_status_idx"),
        ]

    def __str__(self) -> str:
        return self.application_number


class ApplicationEvent(models.Model):
    """Append-only business history for a loan application."""

    class EventType(models.TextChoices):
        CREATED = "created", "ثبت پرونده"
        STATUS_CHANGED = "status_changed", "تغییر وضعیت"
        NOTE_ADDED = "note_added", "یادداشت پیگیری"

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

    def __str__(self) -> str:
        return f"{self.application.application_number}: {self.event_type}"
