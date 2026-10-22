import uuid

from django.contrib.auth import get_user_model
from django.db import transaction
from django.db.models import Q
from django.utils import timezone
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import ValidationError
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from accounts.models import UserProfile
from core.audit import record_audit
from .models import WorkflowTask, WorkflowTaskEvent
from .permissions import IsStaffTaskOperator
from .serializers import WorkflowTaskEventSerializer, WorkflowTaskSerializer


class WorkflowTaskViewSet(viewsets.ModelViewSet):
    serializer_class = WorkflowTaskSerializer
    permission_classes = [IsAuthenticated, IsStaffTaskOperator]
    queryset = WorkflowTask.objects.select_related("application", "assigned_to", "created_by").all()
    http_method_names = ["get", "post", "patch", "head", "options"]

    def get_queryset(self):
        queryset = super().get_queryset()
        # Lock status transitions so concurrent PATCH requests validate against
        # the latest committed task state instead of racing on a stale read.
        if self.request.method == "PATCH" and "status" in self.request.data:
            queryset = queryset.select_for_update()
        user = self.request.user
        role = "system_admin" if user.is_superuser else getattr(getattr(user, "profile", None), "role", None)
        if role in {"intake", "case_worker"}:
            queryset = queryset.filter(Q(assigned_to=user) | Q(application__assigned_to=user))
        elif role not in {"system_admin", "credit_approver", "finance", "auditor"}:
            return queryset.none()

        status_filter = self.request.query_params.get("status", "").strip()
        priority = self.request.query_params.get("priority", "").strip()
        application = self.request.query_params.get("application", "").strip()
        if status_filter in WorkflowTask.Status.values:
            queryset = queryset.filter(status=status_filter)
        if priority in WorkflowTask.Priority.values:
            queryset = queryset.filter(priority=priority)
        if application:
            try:
                application_id = uuid.UUID(application)
            except (ValueError, TypeError, AttributeError):
                return queryset.none()
            queryset = queryset.filter(application_id=application_id)

        overdue_filter = self.request.query_params.get("overdue", "").strip().lower()
        if overdue_filter not in {"", "true", "false"}:
            raise ValidationError({"overdue": "مقدار مجاز برای overdue برابر true یا false است."})
        terminal_statuses = [WorkflowTask.Status.COMPLETED, WorkflowTask.Status.CANCELLED]
        now = timezone.now()
        if overdue_filter == "true":
            queryset = queryset.filter(due_at__lt=now).exclude(status__in=terminal_statuses)
        elif overdue_filter == "false":
            queryset = queryset.filter(
                Q(due_at__isnull=True)
                | Q(due_at__gte=now)
                | Q(status__in=terminal_statuses)
            )
        return queryset

    @transaction.atomic
    def partial_update(self, request, *args, **kwargs):
        # The transaction must cover object lookup, serializer validation, save,
        # and event/audit creation as one operation.
        return super().partial_update(request, *args, **kwargs)

    @action(detail=False, methods=["get"], url_path="summary")
    def summary(self, request):
        queryset = self.get_queryset()
        now = timezone.now()
        terminal_statuses = [WorkflowTask.Status.COMPLETED, WorkflowTask.Status.CANCELLED]
        return Response({
            "total": queryset.count(),
            "open": queryset.filter(status=WorkflowTask.Status.OPEN).count(),
            "in_progress": queryset.filter(status=WorkflowTask.Status.IN_PROGRESS).count(),
            "completed": queryset.filter(status=WorkflowTask.Status.COMPLETED).count(),
            "cancelled": queryset.filter(status=WorkflowTask.Status.CANCELLED).count(),
            "overdue": queryset.filter(due_at__lt=now).exclude(status__in=terminal_statuses).count(),
            "due_today": queryset.filter(due_at__date=timezone.localdate()).exclude(status__in=terminal_statuses).count(),
        })

    @transaction.atomic
    def perform_create(self, serializer):
        task = serializer.save(assigned_to=self.request.user, created_by=self.request.user)
        WorkflowTaskEvent.objects.create(
            task=task,
            event_type=WorkflowTaskEvent.EventType.CREATED,
            new_status=task.status,
            new_assignee=task.assigned_to,
            new_due_at=task.due_at,
            actor=self.request.user,
        )
        record_audit(
            self.request,
            "task.created",
            actor=self.request.user,
            entity_type="workflow_task",
            entity_id=str(task.pk),
            metadata={"status": task.status, "priority": task.priority},
        )

    @transaction.atomic
    def perform_update(self, serializer):
        previous = serializer.instance
        previous_status = previous.status
        previous_due_at = previous.due_at
        task = serializer.save()
        event_written = False
        if task.status != previous_status:
            WorkflowTaskEvent.objects.create(
                task=task,
                event_type=WorkflowTaskEvent.EventType.STATUS_CHANGED,
                previous_status=previous_status,
                new_status=task.status,
                previous_assignee=task.assigned_to,
                new_assignee=task.assigned_to,
                previous_due_at=previous_due_at,
                new_due_at=task.due_at,
                actor=self.request.user,
            )
            event_written = True
        if task.due_at != previous_due_at:
            WorkflowTaskEvent.objects.create(
                task=task,
                event_type=WorkflowTaskEvent.EventType.DUE_DATE_CHANGED,
                previous_status=previous_status,
                new_status=task.status,
                previous_assignee=task.assigned_to,
                new_assignee=task.assigned_to,
                previous_due_at=previous_due_at,
                new_due_at=task.due_at,
                actor=self.request.user,
            )
            event_written = True
        if not event_written:
            WorkflowTaskEvent.objects.create(
                task=task,
                event_type=WorkflowTaskEvent.EventType.UPDATED,
                new_status=task.status,
                new_assignee=task.assigned_to,
                new_due_at=task.due_at,
                actor=self.request.user,
            )
        record_audit(
            self.request,
            "task.updated",
            actor=self.request.user,
            entity_type="workflow_task",
            entity_id=str(task.pk),
            metadata={"updated_fields": sorted(serializer.validated_data.keys()), "status": task.status},
        )


    @action(detail=True, methods=["post"], url_path="assign")
    @transaction.atomic
    def assign(self, request, pk=None):
        role = "system_admin" if request.user.is_superuser else getattr(
            getattr(request.user, "profile", None), "role", None
        )
        if role != UserProfile.Role.SYSTEM_ADMIN:
            return Response(
                {"detail": "واگذاری وظیفه فقط در اختیار مدیر سامانه است."},
                status=status.HTTP_403_FORBIDDEN,
            )

        target_id = request.data.get("assigned_to")
        if not isinstance(target_id, (str, int)) or not str(target_id).isdigit():
            raise ValidationError({"assigned_to": "شناسه کاربر معتبر نیست."})
        target = get_user_model().objects.filter(
            pk=int(target_id), is_active=True, is_staff=True
        ).first()
        target_profile = getattr(target, "profile", None) if target else None
        if target is None or target_profile is None or target_profile.role == UserProfile.Role.CUSTOMER:
            raise ValidationError({"assigned_to": "کاربر داخلی فعال و دارای نقش معتبر انتخاب کنید."})

        task = self.get_object()
        previous_user = task.assigned_to
        previous_assignee = task.assigned_to_id
        task.assigned_to = target
        task.save(update_fields=["assigned_to", "updated_at"])
        WorkflowTaskEvent.objects.create(
            task=task,
            event_type=WorkflowTaskEvent.EventType.ASSIGNED,
            previous_status=task.status,
            new_status=task.status,
            previous_assignee=previous_user,
            new_assignee=target,
            previous_due_at=task.due_at,
            new_due_at=task.due_at,
            actor=request.user,
        )
        record_audit(
            request,
            "task.assigned",
            actor=request.user,
            entity_type="workflow_task",
            entity_id=str(task.pk),
            metadata={"previous_assignee_id": previous_assignee, "new_assignee_id": target.pk},
        )
        return Response(self.get_serializer(task).data, status=status.HTTP_200_OK)


    @action(detail=True, methods=["get"], url_path="events")
    def events(self, request, pk=None):
        task = self.get_object()
        events = task.events.select_related(
            "actor", "previous_assignee", "new_assignee"
        ).all()
        return Response(WorkflowTaskEventSerializer(events, many=True).data)

    @action(detail=True, methods=["post"], url_path="notes")
    @transaction.atomic
    def add_note(self, request, pk=None):
        task = self.get_object()
        note = request.data.get("note", "")
        if not isinstance(note, str) or not note.strip():
            raise ValidationError({"note": "متن یادداشت الزامی است."})
        note = note.strip()
        if len(note) > 5000:
            raise ValidationError({"note": "یادداشت نباید بیشتر از ۵۰۰۰ نویسه باشد."})
        event = WorkflowTaskEvent.objects.create(
            task=task,
            event_type=WorkflowTaskEvent.EventType.NOTE_ADDED,
            previous_status=task.status,
            new_status=task.status,
            previous_assignee=task.assigned_to,
            new_assignee=task.assigned_to,
            previous_due_at=task.due_at,
            new_due_at=task.due_at,
            note=note,
            actor=request.user,
        )
        record_audit(
            request,
            "task.note_added",
            actor=request.user,
            entity_type="workflow_task",
            entity_id=str(task.pk),
            metadata={"note_length": len(note)},
        )
        return Response(WorkflowTaskEventSerializer(event).data, status=status.HTTP_201_CREATED)

    def destroy(self, request, *args, **kwargs):
        return Response({"detail": "حذف فیزیکی وظیفه مجاز نیست."}, status=status.HTTP_405_METHOD_NOT_ALLOWED)
