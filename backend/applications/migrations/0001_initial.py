import uuid

import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):
    initial = True

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ("customers", "0001_initial"),
    ]

    operations = [
        migrations.CreateModel(
            name="LoanApplication",
            fields=[
                ("id", models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ("application_number", models.CharField(db_index=True, max_length=32, unique=True)),
                ("product_type", models.CharField(choices=[("working_capital", "سرمایه در گردش"), ("personal", "تسهیلات شخصی"), ("corporate_credit", "اعتباری شرکتی"), ("equipment", "خرید تجهیزات")], max_length=24)),
                ("requested_amount", models.DecimalField(decimal_places=0, max_digits=18)),
                ("term_months", models.PositiveSmallIntegerField(blank=True, null=True)),
                ("status", models.CharField(choices=[("under_review", "در حال بررسی"), ("awaiting_documents", "تکمیل مدارک"), ("awaiting_approval", "در انتظار تأیید"), ("approved", "تأیید شده"), ("rejected", "رد شده"), ("cancelled", "لغو شده")], default="under_review", max_length=24)),
                ("purpose", models.CharField(blank=True, max_length=250)),
                ("notes", models.TextField(blank=True)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("assigned_to", models.ForeignKey(on_delete=django.db.models.deletion.PROTECT, related_name="assigned_loan_applications", to=settings.AUTH_USER_MODEL)),
                ("customer", models.ForeignKey(on_delete=django.db.models.deletion.PROTECT, related_name="loan_applications", to="customers.customer")),
            ],
            options={"ordering": ["-created_at"]},
        ),
        migrations.AddIndex(
            model_name="loanapplication",
            index=models.Index(fields=["status", "created_at"], name="applications_status_created_idx"),
        ),
        migrations.AddIndex(
            model_name="loanapplication",
            index=models.Index(fields=["assigned_to", "status"], name="applications_assigned_status_idx"),
        ),
    ]
