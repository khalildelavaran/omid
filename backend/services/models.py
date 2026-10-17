import uuid

from django.conf import settings
from django.db import models
from django.db.models.functions import Lower
from django.utils import timezone


class ServiceCatalogQuerySet(models.QuerySet):
    def delete(self):
        raise ValueError("Service catalog items must be deactivated, not physically deleted.")


class ServiceCatalogItem(models.Model):
    objects = ServiceCatalogQuerySet.as_manager()

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    code = models.CharField(max_length=32, unique=True, blank=True, default="")
    name = models.CharField(max_length=200)
    description = models.CharField(max_length=1000, blank=True)
    price = models.DecimalField(max_digits=18, decimal_places=0)
    active = models.BooleanField(default=True)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="created_service_catalog_items",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["name", "created_at"]
        constraints = [
            models.UniqueConstraint(Lower("name"), name="service_catalog_name_ci_uniq"),
            models.CheckConstraint(condition=models.Q(price__gte=0), name="service_catalog_price_nonnegative"),
        ]

    def save(self, *args, **kwargs):
        if not self.code:
            self.code = f"SV-{timezone.localdate():%Y%m%d}-{uuid.uuid4().hex[:10].upper()}"
        if isinstance(self.name, str):
            self.name = self.name.strip()
        super().save(*args, **kwargs)

    def delete(self, *args, **kwargs):
        raise ValueError("Service catalog items must be deactivated, not physically deleted.")

    def __str__(self):
        return f"{self.code}: {self.name}"


class ServiceRecordQuerySet(models.QuerySet):
    def update(self, **kwargs):
        raise ValueError("Service receipts are immutable.")

    def delete(self):
        raise ValueError("Service receipts are immutable.")

    def bulk_update(self, objs, fields, batch_size=None):
        raise ValueError("Service receipts are immutable.")


class ServiceRecord(models.Model):
    class PaymentMethod(models.TextChoices):
        POS = "pos", "کارت‌خوان"
        CASH = "cash", "نقدی"
        BANK_TRANSFER = "bank_transfer", "واریز بانکی"
        OTHER = "other", "سایر"

    objects = ServiceRecordQuerySet.as_manager()

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    receipt_number = models.CharField(max_length=40, unique=True, blank=True, default="")
    idempotency_key = models.CharField(max_length=128, blank=True, default="")
    request_fingerprint = models.CharField(max_length=64, blank=True, default="")
    customer = models.ForeignKey(
        "customers.Customer",
        on_delete=models.PROTECT,
        related_name="service_records",
    )
    service = models.ForeignKey(
        ServiceCatalogItem,
        on_delete=models.PROTECT,
        related_name="receipts",
    )
    service_code_snapshot = models.CharField(max_length=32)
    service_name_snapshot = models.CharField(max_length=200)
    service_description_snapshot = models.CharField(max_length=1000, blank=True)
    price = models.DecimalField(max_digits=18, decimal_places=0)
    discount = models.DecimalField(max_digits=18, decimal_places=0, default=0)
    total = models.DecimalField(max_digits=18, decimal_places=0)
    paid = models.DecimalField(max_digits=18, decimal_places=0, default=0)
    payment_method = models.CharField(max_length=24, choices=PaymentMethod.choices)
    performed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="performed_service_records",
    )
    note = models.CharField(max_length=500, blank=True)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="created_service_records",
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["customer", "created_at"], name="service_receipt_customer_idx"),
            models.Index(fields=["service", "created_at"], name="service_receipt_service_idx"),
            models.Index(fields=["payment_method", "created_at"], name="service_receipt_method_idx"),
        ]
        constraints = [
            models.UniqueConstraint(
                fields=["created_by", "idempotency_key"],
                condition=models.Q(idempotency_key__gt=""),
                name="service_receipt_idempotency_uniq",
            ),
            models.CheckConstraint(condition=models.Q(price__gte=0), name="service_receipt_price_nonnegative"),
            models.CheckConstraint(condition=models.Q(discount__gte=0), name="service_receipt_discount_nonnegative"),
            models.CheckConstraint(condition=models.Q(total__gte=0), name="service_receipt_total_nonnegative"),
            models.CheckConstraint(condition=models.Q(paid__gte=0), name="service_receipt_paid_nonnegative"),
            models.CheckConstraint(condition=models.Q(discount__lte=models.F("price")), name="service_receipt_discount_lte_price"),
            models.CheckConstraint(condition=models.Q(total=models.F("price") - models.F("discount")), name="service_receipt_total_matches_price"),
            models.CheckConstraint(condition=models.Q(paid__lte=models.F("total")), name="service_receipt_paid_lte_total"),
        ]

    @property
    def amount_due(self):
        return self.total - self.paid

    def save(self, *args, **kwargs):
        if self.pk and type(self).objects.filter(pk=self.pk).exists():
            raise ValueError("Service receipts are immutable.")
        if not self.receipt_number:
            self.receipt_number = f"RCPT-{timezone.localdate():%Y%m%d}-{uuid.uuid4().hex[:10].upper()}"
        if self.service_id:
            service = self.service
            self.service_code_snapshot = self.service_code_snapshot or service.code
            self.service_name_snapshot = self.service_name_snapshot or service.name
            self.service_description_snapshot = self.service_description_snapshot or service.description
        super().save(*args, **kwargs)

    def delete(self, *args, **kwargs):
        raise ValueError("Service receipts are immutable.")

    def __str__(self):
        return self.receipt_number
