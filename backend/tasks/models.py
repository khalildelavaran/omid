import uuid

from django.conf import settings
from django.db import models
from django.utils import timezone


class WorkflowTask(models.Model):
    class Status(models.TextChoices):
        OPEN = "open", "باز"
        IN_PROGRESS = "in_progress", "در حال انجام"
        COMPLETED = "completed", "انجام‌شده"
        CANCELLED = "cancelled", "لغوشده"

    class Priority(models.TextChoices):
        LOW = "low", "کم"
        NORMAL = "normal", "عادی"
        HIGH = "high", "زیاد"
        URGENT = "urgent", "فوری"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    task_number = models.CharField(max_length=32, unique=True, blank=True, default="")
    application = models.ForeignKey(
        "applications.LoanApplication",
        on_delete=models.PROTECT,
        related_name="workflow_tasks",
    )
    title = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.OPEN)
    priority = models.CharField(max_length=12, choices=Priority.choices, default=Priority.NORMAL)
    assigned_to = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="workflow_tasks",
    )
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="created_workflow_tasks",
    )
    due_at = models.DateTimeField(null=True, blank=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["status", "due_at", "-created_at"]
        indexes = [
            models.Index(fields=["assigned_to", "status"], name="task_owner_status_idx"),
            models.Index(fields=["application", "status"], name="task_app_status_idx"),
            models.Index(fields=["due_at", "status"], name="task_due_status_idx"),
        ]

    def save(self, *args, **kwargs):
        if not self.task_number:
            self.task_number = f"TASK-{timezone.localdate():%Y%m%d}-{uuid.uuid4().hex[:10].upper()}"
        if self.status == self.Status.COMPLETED and self.completed_at is None:
            self.completed_at = timezone.now()
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.task_number}: {self.title}"

class WorkflowTaskEventQuerySet(models.QuerySet):
    def update(self, **kwargs):
        raise ValueError("Workflow task events are append-only.")

    def delete(self):
        raise ValueError("Workflow task events are append-only.")

    def bulk_update(self, objs, fields, batch_size=None):
        raise ValueError("Workflow task events are append-only.")


class WorkflowTaskEvent(models.Model):
    class EventType(models.TextChoices):
        CREATED = "created", "ایجاد وظیفه"
        UPDATED = "updated", "ویرایش وظیفه"
        STATUS_CHANGED = "status_changed", "تغییر وضعیت"
        ASSIGNED = "assigned", "واگذاری وظیفه"
        DUE_DATE_CHANGED = "due_date_changed", "تغییر موعد"
        NOTE_ADDED = "note_added", "یادداشت پیگیری"

    objects = WorkflowTaskEventQuerySet.as_manager()

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    task = models.ForeignKey(
        WorkflowTask,
        on_delete=models.PROTECT,
        related_name="events",
    )
    event_type = models.CharField(max_length=24, choices=EventType.choices)
    previous_status = models.CharField(max_length=20, choices=WorkflowTask.Status.choices, blank=True)
    new_status = models.CharField(max_length=20, choices=WorkflowTask.Status.choices, blank=True)
    previous_assignee = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="task_events_previous_assignee",
    )
    new_assignee = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="task_events_new_assignee",
    )
    previous_due_at = models.DateTimeField(null=True, blank=True)
    new_due_at = models.DateTimeField(null=True, blank=True)
    note = models.TextField(blank=True)
    actor = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="workflow_task_events",
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["created_at", "id"]
        indexes = [
            models.Index(fields=["task", "created_at"], name="task_event_time_idx"),
            models.Index(fields=["event_type", "created_at"], name="task_event_type_idx"),
        ]

    def save(self, *args, **kwargs):
        if self.pk and type(self).objects.filter(pk=self.pk).exists():
            raise ValueError("Workflow task events are append-only.")
        super().save(*args, **kwargs)

    def delete(self, *args, **kwargs):
        raise ValueError("Workflow task events cannot be deleted through the model API.")

    def __str__(self):
        return f"{self.task.task_number}:{self.event_type}"

