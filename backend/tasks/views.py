import uuid

from django.db import transaction
from django.db.models import Q
from rest_framework import status, viewsets
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

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
        return queryset

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

    def destroy(self, request, *args, **kwargs):
        return Response({"detail": "حذف فیزیکی وظیفه مجاز نیست."}, status=status.HTTP_405_METHOD_NOT_ALLOWED)
