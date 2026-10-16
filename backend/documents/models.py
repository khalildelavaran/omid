import uuid

from django.conf import settings
from django.db import models
from django.utils import timezone

from .storage import PrivateDocumentStorage


def private_document_path(instance, filename):
    extensions = {
        "application/pdf": ".pdf",
        "image/jpeg": ".jpg",
        "image/png": ".png",
    }
    # Never use an uploaded filename or extension as a storage path.
    return f"documents/{timezone.localdate():%Y/%m}/{uuid.uuid4().hex}{extensions.get(instance.content_type, '.bin')}"


class Document(models.Model):
    class DocumentType(models.TextChoices):
        IDENTITY = "identity", "مدرک هویتی"
        ADDRESS = "address", "مدرک نشانی"
        INCOME = "income", "مدرک درآمد"
        BANK_STATEMENT = "bank_statement", "گردش حساب"
        CONTRACT = "contract", "قرارداد"
        OTHER = "other", "سایر مدارک"

    class Status(models.TextChoices):
        PENDING_REVIEW = "pending_review", "در انتظار بررسی"
        ACCEPTED = "accepted", "پذیرفته‌شده"
        REJECTED = "rejected", "نیازمند اصلاح"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    document_number = models.CharField(max_length=32, unique=True, blank=True, default="")
    application = models.ForeignKey(
        "applications.LoanApplication",
        on_delete=models.PROTECT,
        related_name="documents",
    )
    replaces_document = models.ForeignKey(
        "self",
        on_delete=models.PROTECT,
        null=True,
        blank=True,
        related_name="replacement_documents",
    )
    document_type = models.CharField(max_length=24, choices=DocumentType.choices)
    file = models.FileField(storage=PrivateDocumentStorage(), upload_to=private_document_path)
    original_filename = models.CharField(max_length=255)
    content_type = models.CharField(max_length=100)
    size_bytes = models.PositiveBigIntegerField()
    sha256 = models.CharField(max_length=64, db_index=True)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.PENDING_REVIEW)
    review_note = models.CharField(max_length=1000, blank=True)
    uploaded_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="uploaded_documents",
    )
    reviewed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="reviewed_documents",
    )
    reviewed_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["application", "status"], name="doc_app_status_idx"),
            models.Index(fields=["document_type", "created_at"], name="doc_type_created_idx"),
        ]

    def save(self, *args, **kwargs):
        if not self.document_number:
            self.document_number = f"DOC-{timezone.localdate():%Y%m%d}-{uuid.uuid4().hex[:10].upper()}"
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.document_number}:{self.document_type}"

    def delete(self, *args, **kwargs):
        raise ValueError("Documents cannot be physically deleted through the model API.")
