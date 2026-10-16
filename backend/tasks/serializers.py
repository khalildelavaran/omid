from django.utils import timezone
from rest_framework import serializers

from accounts.models import UserProfile
from applications.models import LoanApplication
from .models import WorkflowTask


class WorkflowTaskSerializer(serializers.ModelSerializer):
    is_overdue = serializers.SerializerMethodField()
    application_number = serializers.CharField(source="application.application_number", read_only=True)
    assigned_to_username = serializers.CharField(source="assigned_to.username", read_only=True)
    created_by_username = serializers.CharField(source="created_by.username", read_only=True)

    class Meta:
        model = WorkflowTask
        fields = [
            "id", "task_number", "application", "application_number", "title",
            "description", "status", "priority", "assigned_to", "assigned_to_username",
            "created_by", "created_by_username", "due_at", "completed_at",
            "created_at", "updated_at", "is_overdue",
        ]
        read_only_fields = [
            "id", "task_number", "assigned_to", "assigned_to_username",
            "created_by", "created_by_username", "completed_at", "created_at", "updated_at",
        ]

    def get_is_overdue(self, obj):
        return bool(
            obj.due_at
            and obj.due_at < timezone.now()
            and obj.status not in {WorkflowTask.Status.COMPLETED, WorkflowTask.Status.CANCELLED}
        )

    def validate_application(self, value):
        request = self.context.get("request")
        if request is None or not request.user.is_authenticated:
            return value
        user = request.user
        role = getattr(getattr(user, "profile", None), "role", None)
        if user.is_superuser or role == UserProfile.Role.SYSTEM_ADMIN:
            return value
        if role in {UserProfile.Role.INTAKE, UserProfile.Role.CASE_WORKER}:
            if value.assigned_to_id != user.id:
                raise serializers.ValidationError("فقط برای پرونده‌های تخصیص‌یافته به خودتان می‌توانید وظیفه ثبت کنید.")
        return value

    def validate_status(self, value):
        if not self.instance or value == self.instance.status:
            return value
        allowed = {
            WorkflowTask.Status.OPEN: {WorkflowTask.Status.IN_PROGRESS, WorkflowTask.Status.COMPLETED, WorkflowTask.Status.CANCELLED},
            WorkflowTask.Status.IN_PROGRESS: {WorkflowTask.Status.OPEN, WorkflowTask.Status.COMPLETED, WorkflowTask.Status.CANCELLED},
            WorkflowTask.Status.COMPLETED: set(),
            WorkflowTask.Status.CANCELLED: set(),
        }
        if value not in allowed.get(self.instance.status, set()):
            raise serializers.ValidationError("این تغییر وضعیت وظیفه مجاز نیست.")
        return value
