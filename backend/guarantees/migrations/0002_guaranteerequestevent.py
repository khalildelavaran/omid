import uuid

from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):
    dependencies = [
        ("guarantees", "0001_initial"),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name="GuaranteeRequestEvent",
            fields=[
                ("id", models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ("event_type", models.CharField(choices=[("created", "ثبت درخواست"), ("status_changed", "تغییر وضعیت"), ("note_added", "یادداشت پیگیری")], max_length=24)),
                ("previous_status", models.CharField(blank=True, choices=[("registered", "ثبت‌شده"), ("under_review", "در حال بررسی"), ("approved", "تأیید شده"), ("rejected", "رد شده"), ("fulfilled", "انجام‌شده"), ("cancelled", "لغو شده")], max_length=20)),
                ("new_status", models.CharField(blank=True, choices=[("registered", "ثبت‌شده"), ("under_review", "در حال بررسی"), ("approved", "تأیید شده"), ("rejected", "رد شده"), ("fulfilled", "انجام‌شده"), ("cancelled", "لغو شده")], max_length=20)),
                ("note", models.CharField(blank=True, max_length=1000)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("actor", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="guarantee_request_events", to=settings.AUTH_USER_MODEL)),
                ("guarantee_request", models.ForeignKey(on_delete=django.db.models.deletion.PROTECT, related_name="events", to="guarantees.guaranteerequest")),
            ],
            options={"ordering": ["created_at", "id"]},
        ),
        migrations.AddIndex(
            model_name="guaranteerequestevent",
            index=models.Index(fields=["guarantee_request", "created_at"], name="guarantee_event_time_idx"),
        ),
        migrations.AddIndex(
            model_name="guaranteerequestevent",
            index=models.Index(fields=["event_type", "created_at"], name="guarantee_event_type_idx"),
        ),
    ]
