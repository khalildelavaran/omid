import uuid

from django.conf import settings
from django.db import models
from django.utils import timezone


class GuaranteeRequest(models.Model):
    class Status(models.TextChoices):
        REGISTERED = "registered", "ثبت‌شده"
        UNDER_REVIEW = "under_review", "در حال بررسی"
        APPROVED = "approved", "تأیید شده"
        REJECTED = "rejected", "رد شده"
        FULFILLED = "fulfilled", "انجام‌شده"
        CANCELLED = "cancelled", "لغو شده"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    request_number = models.CharField(max_length=32, unique=True, blank=True, default="")
    application = models.ForeignKey(
        "applications.LoanApplication",
        on_delete=models.PROTECT,
        related_name="guarantee_requests",
    )
    requester_customer = models.ForeignKey(
        "customers.Customer",
        on_delete=models.PROTECT,
        null=True,
        blank=True,
        related_name="guarantee_requests_as_requester",
    )
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.REGISTERED)
    note = models.CharField(max_length=1000, blank=True)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="created_guarantee_requests",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["status", "created_at"], name="guarantee_status_created_idx"),
            models.Index(fields=["application", "status"], name="guarantee_app_status_idx"),
        ]

    def save(self, *args, **kwargs):
        if not self.request_number:
            self.request_number = f"GR-{timezone.localdate():%Y%m%d}-{uuid.uuid4().hex[:10].upper()}"
        super().save(*args, **kwargs)

    def delete(self, *args, **kwargs):
        raise ValueError("Guarantee requests cannot be physically deleted through the model API.")

    def __str__(self):
        return self.request_number
