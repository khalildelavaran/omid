import uuid

from django.conf import settings
from django.db import models


class AuditEventQuerySet(models.QuerySet):
    def update(self, **kwargs):
        raise ValueError("Audit events are append-only.")

    def delete(self):
        raise ValueError("Audit events are append-only.")

    def bulk_update(self, objs, fields, batch_size=None):
        raise ValueError("Audit events are append-only.")


class AuditEvent(models.Model):
    """Append-only, privacy-conscious security and business audit event."""

    objects = AuditEventQuerySet.as_manager()

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    actor = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name="audit_events")
    action = models.CharField(max_length=80, db_index=True)
    entity_type = models.CharField(max_length=80, blank=True, db_index=True)
    entity_id = models.CharField(max_length=80, blank=True)
    outcome = models.CharField(max_length=16, default="success")
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    request_id = models.CharField(max_length=80, blank=True, db_index=True)
    user_agent = models.CharField(max_length=300, blank=True)
    metadata = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["entity_type", "entity_id", "created_at"], name="audit_entity_time_idx"),
            models.Index(fields=["actor", "created_at"], name="audit_actor_time_idx"),
        ]

    def save(self, *args, **kwargs):
        if self.pk and type(self).objects.filter(pk=self.pk).exists():
            raise ValueError("Audit events are append-only.")
        super().save(*args, **kwargs)

    def delete(self, *args, **kwargs):
        raise ValueError("Audit events cannot be deleted through the model API.")

    def __str__(self):
        return f"{self.action}:{self.entity_type}:{self.entity_id}"
