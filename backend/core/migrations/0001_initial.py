import uuid

from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):
    initial = True

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name="AuditEvent",
            fields=[
                ("id", models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ("action", models.CharField(db_index=True, max_length=80)),
                ("entity_type", models.CharField(blank=True, db_index=True, max_length=80)),
                ("entity_id", models.CharField(blank=True, max_length=80)),
                ("outcome", models.CharField(default="success", max_length=16)),
                ("ip_address", models.GenericIPAddressField(blank=True, null=True)),
                ("request_id", models.CharField(blank=True, db_index=True, max_length=80)),
                ("user_agent", models.CharField(blank=True, max_length=300)),
                ("metadata", models.JSONField(blank=True, default=dict)),
                ("created_at", models.DateTimeField(auto_now_add=True, db_index=True)),
                ("actor", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="audit_events", to=settings.AUTH_USER_MODEL)),
            ],
            options={"ordering": ["-created_at"]},
        ),
        migrations.AddIndex(model_name="auditevent", index=models.Index(fields=["entity_type", "entity_id", "created_at"], name="audit_entity_time_idx")),
        migrations.AddIndex(model_name="auditevent", index=models.Index(fields=["actor", "created_at"], name="audit_actor_time_idx")),
    ]
