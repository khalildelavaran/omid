import uuid

from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):
    dependencies = [
        ("tasks", "0001_initial"),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name="WorkflowTaskEvent",
            fields=[
                ("id", models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ("event_type", models.CharField(choices=[("created", "ایجاد وظیفه"), ("updated", "ویرایش وظیفه"), ("status_changed", "تغییر وضعیت"), ("assigned", "واگذاری وظیفه"), ("due_date_changed", "تغییر موعد"), ("note_added", "یادداشت پیگیری")], max_length=24)),
                ("previous_status", models.CharField(blank=True, choices=[("open", "باز"), ("in_progress", "در حال انجام"), ("completed", "انجام‌شده"), ("cancelled", "لغوشده")], max_length=20)),
                ("new_status", models.CharField(blank=True, choices=[("open", "باز"), ("in_progress", "در حال انجام"), ("completed", "انجام‌شده"), ("cancelled", "لغوشده")], max_length=20)),
                ("previous_due_at", models.DateTimeField(blank=True, null=True)),
                ("new_due_at", models.DateTimeField(blank=True, null=True)),
                ("note", models.TextField(blank=True)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("actor", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="workflow_task_events", to=settings.AUTH_USER_MODEL)),
                ("new_assignee", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="task_events_new_assignee", to=settings.AUTH_USER_MODEL)),
                ("previous_assignee", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="task_events_previous_assignee", to=settings.AUTH_USER_MODEL)),
                ("task", models.ForeignKey(on_delete=django.db.models.deletion.PROTECT, related_name="events", to="tasks.workflowtask")),
            ],
            options={"ordering": ["created_at", "id"]},
        ),
        migrations.AddIndex(
            model_name="workflowtaskevent",
            index=models.Index(fields=["task", "created_at"], name="task_event_time_idx"),
        ),
        migrations.AddIndex(
            model_name="workflowtaskevent",
            index=models.Index(fields=["event_type", "created_at"], name="task_event_type_idx"),
        ),
    ]
