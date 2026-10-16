import uuid

from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion
import documents.models
import documents.storage


class Migration(migrations.Migration):
    initial = True

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ("applications", "0003_application_number_generated"),
    ]

    operations = [
        migrations.CreateModel(
            name="Document",
            fields=[
                ("id", models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ("document_number", models.CharField(blank=True, default="", max_length=32, unique=True)),
                ("document_type", models.CharField(choices=[("identity", "مدرک هویتی"), ("address", "مدرک نشانی"), ("income", "مدرک درآمد"), ("bank_statement", "گردش حساب"), ("contract", "قرارداد"), ("other", "سایر مدارک")], max_length=24)),
                ("file", models.FileField(storage=documents.storage.PrivateDocumentStorage(), upload_to=documents.models.private_document_path)),
                ("original_filename", models.CharField(max_length=255)),
                ("content_type", models.CharField(max_length=100)),
                ("size_bytes", models.PositiveBigIntegerField()),
                ("sha256", models.CharField(db_index=True, max_length=64)),
                ("status", models.CharField(choices=[("pending_review", "در انتظار بررسی"), ("accepted", "پذیرفته‌شده"), ("rejected", "نیازمند اصلاح")], default="pending_review", max_length=20)),
                ("review_note", models.CharField(blank=True, max_length=1000)),
                ("reviewed_at", models.DateTimeField(blank=True, null=True)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("application", models.ForeignKey(on_delete=django.db.models.deletion.PROTECT, related_name="documents", to="applications.loanapplication")),
                ("reviewed_by", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="reviewed_documents", to=settings.AUTH_USER_MODEL)),
                ("uploaded_by", models.ForeignKey(on_delete=django.db.models.deletion.PROTECT, related_name="uploaded_documents", to=settings.AUTH_USER_MODEL)),
            ],
            options={"ordering": ["-created_at"]},
        ),
        migrations.AddIndex(model_name="document", index=models.Index(fields=["application", "status"], name="doc_app_status_idx")),
        migrations.AddIndex(model_name="document", index=models.Index(fields=["document_type", "created_at"], name="doc_type_created_idx")),
    ]
