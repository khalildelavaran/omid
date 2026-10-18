import uuid

from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):
    dependencies = [
        ("applications", "0004_loanapplication_archive"),
        ("customers", "0001_initial"),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.AddField(
            model_name="loanapplication",
            name="loan_commission_pct",
            field=models.DecimalField(default="25.00", max_digits=5, decimal_places=2),
        ),
        migrations.AddField(
            model_name="loanapplication",
            name="commission_override_reason",
            field=models.CharField(blank=True, max_length=500),
        ),
        migrations.CreateModel(
            name="CaseParty",
            fields=[
                ("id", models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False, serialize=False)),
                ("role", models.CharField(max_length=20, choices=[("applicant", "متقاضی اصلی"), ("guarantor", "ضامن"), ("representative", "نماینده")])),
                ("relationship_to_applicant", models.CharField(max_length=80, blank=True)),
                ("membership_status", models.CharField(max_length=16, default="active", choices=[("active", "فعال"), ("replaced", "جایگزین‌شده"), ("removed", "خارج‌شده")])),
                ("account_status", models.CharField(max_length=24, default="unknown", choices=[("unknown", "بررسی‌نشده"), ("existing_verified", "حساب موجود تأییدشده"), ("needs_opening", "نیازمند افتتاح")])),
                ("sort_order", models.PositiveSmallIntegerField(default=0)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("application", models.ForeignKey(to="applications.loanapplication", on_delete=django.db.models.deletion.PROTECT, related_name="parties")),
                ("person", models.ForeignKey(to="customers.customer", on_delete=django.db.models.deletion.PROTECT, related_name="loan_case_participations")),
            ],
            options={"ordering": ["sort_order", "created_at"]},
        ),
        migrations.AddIndex(model_name="caseparty", index=models.Index(fields=["application", "membership_status"], name="party_app_status_idx")),
        migrations.AddIndex(model_name="caseparty", index=models.Index(fields=["person", "role"], name="party_person_role_idx")),
        migrations.CreateModel(
            name="StageInstance",
            fields=[
                ("id", models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False, serialize=False)),
                ("code", models.CharField(max_length=24, choices=[("documents", "مدارک"), ("account", "وضعیت حساب"), ("merat", "اعتبارسنجی مرآت"), ("digital_banking", "بانکداری دیجیتال"), ("e_note", "سفته الکترونیک"), ("loan_submission", "ثبت درخواست وام"), ("bank_review", "بررسی بانک"), ("disbursement", "واریز تسهیلات"), ("settlement", "تسویه"), ("handover", "تحویل نهایی")])),
                ("status", models.CharField(max_length=20, default="locked", choices=[("locked", "قفل‌شده"), ("pending", "در انتظار"), ("in_progress", "در جریان"), ("action_needed", "نیازمند اقدام"), ("completed", "تکمیل‌شده"), ("bypassed", "عبور مجاز"), ("rejected", "ردشده"), ("on_hold", "تعلیق")])),
                ("started_at", models.DateTimeField(null=True, blank=True)),
                ("due_at", models.DateTimeField(null=True, blank=True, db_index=True)),
                ("completed_at", models.DateTimeField(null=True, blank=True)),
                ("outcome", models.CharField(max_length=120, blank=True)),
                ("hold_reason", models.CharField(max_length=500, blank=True)),
                ("evidence_reference", models.CharField(max_length=500, blank=True)),
                ("follow_up_count", models.PositiveIntegerField(default=0)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("application", models.ForeignKey(to="applications.loanapplication", on_delete=django.db.models.deletion.PROTECT, related_name="stage_instances")),
                ("assigned_to", models.ForeignKey(to=settings.AUTH_USER_MODEL, on_delete=django.db.models.deletion.PROTECT, related_name="assigned_stage_instances", null=True, blank=True)),
                ("party", models.ForeignKey(to="applications.caseparty", on_delete=django.db.models.deletion.PROTECT, related_name="stage_instances", null=True, blank=True)),
            ],
            options={"ordering": ["created_at"]},
        ),
        migrations.AddIndex(model_name="stageinstance", index=models.Index(fields=["application", "code", "status"], name="stage_app_code_status_idx")),
        migrations.AddIndex(model_name="stageinstance", index=models.Index(fields=["assigned_to", "status", "due_at"], name="stage_owner_status_due_idx")),
        migrations.AddConstraint(model_name="stageinstance", constraint=models.UniqueConstraint(fields=("application", "party", "code"), condition=models.Q(party__isnull=False), name="uniq_party_stage_code")),
        migrations.AddConstraint(model_name="stageinstance", constraint=models.UniqueConstraint(fields=("application", "code"), condition=models.Q(party__isnull=True), name="uniq_case_stage_code")),
        migrations.CreateModel(
            name="MeratAssessment",
            fields=[
                ("id", models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False, serialize=False)),
                ("relationship_to_applicant", models.CharField(max_length=80)),
                ("submitted_at", models.DateTimeField(null=True, blank=True)),
                ("external_reference", models.CharField(max_length=120, blank=True)),
                ("result", models.CharField(max_length=24, default="pending", choices=[("pending", "در انتظار نتیجه"), ("approved", "تأیید"), ("rejected", "رد"), ("needs_correction", "نیازمند اصلاح")])),
                ("result_reason", models.CharField(max_length=500, blank=True)),
                ("reported_limit_rial", models.PositiveBigIntegerField(null=True, blank=True)),
                ("evidence_reference", models.CharField(max_length=500, blank=True)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("recorded_by", models.ForeignKey(to=settings.AUTH_USER_MODEL, on_delete=django.db.models.deletion.PROTECT, related_name="recorded_merat_assessments", null=True, blank=True)),
                ("requester", models.ForeignKey(to="customers.customer", on_delete=django.db.models.deletion.PROTECT, related_name="merat_requests_made")),
                ("stage", models.OneToOneField(to="applications.stageinstance", on_delete=django.db.models.deletion.PROTECT, related_name="merat_assessment")),
                ("subject", models.ForeignKey(to="customers.customer", on_delete=django.db.models.deletion.PROTECT, related_name="merat_assessments_received")),
            ],
        ),
    ]
