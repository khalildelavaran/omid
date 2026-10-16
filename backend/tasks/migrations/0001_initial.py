import uuid

from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):
    initial = True

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ("applications", "0003_application_number_generated"),
    ]

    operations = [
        migrations.CreateModel(
            name="WorkflowTask",
            fields=[
                ("id", models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ("task_number", models.CharField(blank=True, default="", max_length=32, unique=True)),
                ("title", models.CharField(max_length=200)),
                ("description", models.TextField(blank=True)),
                ("status", models.CharField(choices=[("open", "باز"), ("in_progress", "در حال انجام"), ("completed", "انجام‌شده"), ("cancelled", "لغوشده")], default="open", max_length=20)),
                ("priority", models.CharField(choices=[("low", "کم"), ("normal", "عادی"), ("high", "زیاد"), ("urgent", "فوری")], default="normal", max_length=12)),
                ("due_at", models.DateTimeField(blank=True, null=True)),
                ("completed_at", models.DateTimeField(blank=True, null=True)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("application", models.ForeignKey(on_delete=django.db.models.deletion.PROTECT, related_name="workflow_tasks", to="applications.loanapplication")),
                ("assigned_to", models.ForeignKey(on_delete=django.db.models.deletion.PROTECT, related_name="workflow_tasks", to=settings.AUTH_USER_MODEL)),
                ("created_by", models.ForeignKey(on_delete=django.db.models.deletion.PROTECT, related_name="created_workflow_tasks", to=settings.AUTH_USER_MODEL)),
            ],
            options={"ordering": ["status", "due_at", "-created_at"]},
        ),
        migrations.AddIndex(model_name="workflowtask", index=models.Index(fields=["assigned_to", "status"], name="task_owner_status_idx")),
        migrations.AddIndex(model_name="workflowtask", index=models.Index(fields=["application", "status"], name="task_app_status_idx")),
        migrations.AddIndex(model_name="workflowtask", index=models.Index(fields=["due_at", "status"], name="task_due_status_idx")),
    ]
