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
from .models import WorkflowTask
from .permissions import IsStaffTaskOperator
from .serializers import WorkflowTaskSerializer


class WorkflowTaskViewSet(viewsets.ModelViewSet):
    serializer_class = WorkflowTaskSerializer
    permission_classes = [IsAuthenticated, IsStaffTaskOperator]
    queryset = WorkflowTask.objects.select_related("application", "assigned_to", "created_by").all()
    http_method_names = ["get", "post", "patch", "head", "options"]

    def get_queryset(self):
        queryset = super().get_queryset()
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
        task = serializer.save()
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
        previous_assignee = task.assigned_to_id
        task.assigned_to = target
        task.save(update_fields=["assigned_to", "updated_at"])
        record_audit(
            request,
            "task.assigned",
            actor=request.user,
            entity_type="workflow_task",
            entity_id=str(task.pk),
            metadata={"previous_assignee_id": previous_assignee, "new_assignee_id": target.pk},
        )
        return Response(self.get_serializer(task).data, status=status.HTTP_200_OK)

    def destroy(self, request, *args, **kwargs):
        return Response({"detail": "حذف فیزیکی وظیفه مجاز نیست."}, status=status.HTTP_405_METHOD_NOT_ALLOWED)
