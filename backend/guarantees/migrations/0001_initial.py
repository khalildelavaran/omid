import uuid

from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):
    initial = True

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ("applications", "0003_application_number_generated"),
        ("customers", "0002_customer_number_generated"),
    ]

    operations = [
        migrations.CreateModel(
            name="GuaranteeRequest",
            fields=[
                ("id", models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ("request_number", models.CharField(blank=True, default="", max_length=32, unique=True)),
                ("status", models.CharField(choices=[("registered", "ثبت‌شده"), ("under_review", "در حال بررسی"), ("approved", "تأیید شده"), ("rejected", "رد شده"), ("fulfilled", "انجام‌شده"), ("cancelled", "لغو شده")], default="registered", max_length=20)),
                ("note", models.CharField(blank=True, max_length=1000)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("application", models.ForeignKey(on_delete=django.db.models.deletion.PROTECT, related_name="guarantee_requests", to="applications.loanapplication")),
                ("created_by", models.ForeignKey(on_delete=django.db.models.deletion.PROTECT, related_name="created_guarantee_requests", to=settings.AUTH_USER_MODEL)),
                ("requester_customer", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.PROTECT, related_name="guarantee_requests_as_requester", to="customers.customer")),
            ],
            options={"ordering": ["-created_at"]},
        ),
        migrations.AddIndex(
            model_name="guaranteerequest",
            index=models.Index(fields=["status", "created_at"], name="guarantee_status_created_idx"),
        ),
        migrations.AddIndex(
            model_name="guaranteerequest",
            index=models.Index(fields=["application", "status"], name="guarantee_app_status_idx"),
        ),
    ]
