import uuid

from django.conf import settings
from django.db import models
from django.utils import timezone


class Customer(models.Model):
    class CustomerType(models.TextChoices):
        INDIVIDUAL = "individual", "حقیقی"
        ORGANIZATION = "organization", "حقوقی"

    class Status(models.TextChoices):
        ACTIVE = "active", "فعال"
        NEEDS_REVIEW = "needs_review", "نیازمند بررسی"
        INACTIVE = "inactive", "غیرفعال"
        ARCHIVED = "archived", "بایگانی‌شده"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    customer_number = models.CharField(max_length=24, unique=True, db_index=True, blank=True, default="")
    customer_type = models.CharField(
        max_length=16,
        choices=CustomerType.choices,
        default=CustomerType.INDIVIDUAL,
    )
    first_name = models.CharField(max_length=100, blank=True)
    last_name = models.CharField(max_length=100, blank=True)
    organization_name = models.CharField(max_length=200, blank=True)
    phone_number = models.CharField(max_length=32, blank=True, db_index=True)
    email = models.EmailField(blank=True)
    national_id = models.CharField(max_length=20, blank=True)
    birth_date = models.DateField(null=True, blank=True)
    father_name = models.CharField(max_length=100, blank=True)
    occupation = models.CharField(max_length=150, blank=True)
    postal_code = models.CharField(max_length=20, blank=True)
    sana_verified = models.BooleanField(default=False)
    status = models.CharField(max_length=16, choices=Status.choices, default=Status.ACTIVE)
    assigned_to = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="assigned_customers",
    )
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["status", "customer_type"], name="customers_c_status_11e2b7_idx"),
            models.Index(fields=["last_name", "first_name"], name="customers_c_last_na_23db24_idx"),
        ]

    def save(self, *args, **kwargs):
        if not self.customer_number:
            self.customer_number = f"CUST-{timezone.localdate():%Y%m%d}-{uuid.uuid4().hex[:10].upper()}"
        super().save(*args, **kwargs)

    def __str__(self) -> str:
        if self.customer_type == self.CustomerType.ORGANIZATION:
            return self.organization_name or self.customer_number
        return f"{self.first_name} {self.last_name}".strip() or self.customer_number
