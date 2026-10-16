import uuid

import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("applications", "0001_initial"),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name="ApplicationEvent",
            fields=[
                ("id", models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ("event_type", models.CharField(choices=[("created", "ثبت پرونده"), ("status_changed", "تغییر وضعیت"), ("note_added", "یادداشت پیگیری")], max_length=24)),
                ("previous_status", models.CharField(blank=True, choices=[("under_review", "در حال بررسی"), ("awaiting_documents", "تکمیل مدارک"), ("awaiting_approval", "در انتظار تأیید"), ("approved", "تأیید شده"), ("rejected", "رد شده"), ("cancelled", "لغو شده")], max_length=24)),
                ("new_status", models.CharField(blank=True, choices=[("under_review", "در حال بررسی"), ("awaiting_documents", "تکمیل مدارک"), ("awaiting_approval", "در انتظار تأیید"), ("approved", "تأیید شده"), ("rejected", "رد شده"), ("cancelled", "لغو شده")], max_length=24)),
                ("note", models.TextField(blank=True)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("actor", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="loan_application_events", to=settings.AUTH_USER_MODEL)),
                ("application", models.ForeignKey(on_delete=django.db.models.deletion.PROTECT, related_name="events", to="applications.loanapplication")),
            ],
            options={"ordering": ["created_at", "id"]},
        ),
        migrations.AddIndex(
            model_name="applicationevent",
            index=models.Index(fields=["application", "created_at"], name="app_event_created_idx"),
        ),
    ]
