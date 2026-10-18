import uuid

from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):
    dependencies = [
        ("applications", "0005_two_level_loan_workflow"),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name="Disbursement",
            fields=[
                ("id", models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False, serialize=False)),
                ("disbursement_number", models.CharField(blank=True, default="", max_length=40, unique=True)),
                ("amount_rial", models.PositiveBigIntegerField()),
                ("commission_rate_pct", models.DecimalField(default="25.00", max_digits=5, decimal_places=2)),
                ("commission_amount_rial", models.PositiveBigIntegerField(default=0)),
                ("status", models.CharField(default="pending", max_length=16, choices=[("pending", "در انتظار تأیید واریز"), ("confirmed", "واریز تأییدشده"), ("failed", "واریز ناموفق")])),
                ("bank_reference", models.CharField(blank=True, max_length=120)),
                ("evidence_reference", models.CharField(blank=True, max_length=500)),
                ("confirmed_at", models.DateTimeField(blank=True, null=True)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("application", models.ForeignKey(to="applications.loanapplication", on_delete=django.db.models.deletion.PROTECT, related_name="disbursements")),
                ("recorded_by", models.ForeignKey(to=settings.AUTH_USER_MODEL, on_delete=django.db.models.deletion.PROTECT, related_name="recorded_disbursements")),
            ],
            options={"ordering": ["-created_at"]},
        ),
        migrations.AddIndex(
            model_name="disbursement",
            index=models.Index(fields=["application", "status"], name="disburse_app_status_idx"),
        ),
        migrations.AddIndex(
            model_name="disbursement",
            index=models.Index(fields=["status", "confirmed_at"], name="disburse_status_confirmed_idx"),
        ),
        migrations.AddConstraint(
            model_name="disbursement",
            constraint=models.CheckConstraint(condition=models.Q(("amount_rial__gt", 0)), name="disbursement_amount_positive"),
        ),
        migrations.AddConstraint(
            model_name="disbursement",
            constraint=models.CheckConstraint(condition=models.Q(("commission_rate_pct__gte", 0), ("commission_rate_pct__lte", 100)), name="disbursement_commission_rate_range"),
        ),
    ]
