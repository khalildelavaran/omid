import re

from django.core.exceptions import ValidationError as DjangoValidationError
from rest_framework import serializers

from accounts.models import UserProfile
from applications.models import LoanApplication
from .models import Document
from .validators import inspect_upload


def safe_original_filename(value):
    name = str(value or "document").replace("\\", "/").rsplit("/", 1)[-1]
    name = re.sub(r"[\x00-\x1f\x7f]", "", name).strip()
    return (name or "document")[:255]


class DocumentSerializer(serializers.ModelSerializer):
    application_number = serializers.CharField(source="application.application_number", read_only=True)
    uploaded_by_username = serializers.CharField(source="uploaded_by.username", read_only=True)
    reviewed_by_username = serializers.CharField(source="reviewed_by.username", read_only=True, default=None)

    class Meta:
        model = Document
        fields = [
            "id", "document_number", "application", "application_number", "document_type",
            "original_filename", "content_type", "size_bytes", "sha256", "status",
            "review_note", "uploaded_by", "uploaded_by_username", "reviewed_by",
            "reviewed_by_username", "reviewed_at", "created_at", "updated_at",
        ]
        read_only_fields = fields


class DocumentUploadSerializer(serializers.Serializer):
    application = serializers.PrimaryKeyRelatedField(queryset=LoanApplication.objects.all())
    document_type = serializers.ChoiceField(choices=Document.DocumentType.choices)
    file = serializers.FileField(write_only=True)

    def validate_application(self, application):
        request = self.context.get("request")
        if request is None or not request.user.is_authenticated:
            raise serializers.ValidationError("احراز هویت الزامی است.")
        user = request.user
        role = "system_admin" if user.is_superuser else getattr(
            getattr(user, "profile", None), "role", None
        )
        if role == UserProfile.Role.SYSTEM_ADMIN:
            return application
        if role in {UserProfile.Role.INTAKE, UserProfile.Role.CASE_WORKER}:
            if application.assigned_to_id == user.id:
                return application
        raise serializers.ValidationError("به پرونده انتخاب‌شده دسترسی بارگذاری سند ندارید.")

    def validate_file(self, upload):
        try:
            self._upload_details = inspect_upload(upload)
        except DjangoValidationError as exc:
            raise serializers.ValidationError(exc.messages) from exc
        return upload

    def create(self, validated_data):
        upload = validated_data.pop("file")
        details = self._upload_details
        return Document.objects.create(
            **validated_data,
            file=upload,
            uploaded_by=self.context["request"].user,
            original_filename=safe_original_filename(upload.name),
            content_type=details["content_type"],
            size_bytes=details["size_bytes"],
            sha256=details["sha256"],
        )


class DocumentReviewSerializer(serializers.Serializer):
    status = serializers.ChoiceField(choices=[
        (Document.Status.ACCEPTED, "پذیرفته‌شده"),
        (Document.Status.REJECTED, "نیازمند اصلاح"),
    ])
    note = serializers.CharField(required=False, allow_blank=True, max_length=1000, trim_whitespace=True, default="")

    def validate(self, attrs):
        if attrs["status"] == Document.Status.REJECTED and not attrs.get("note", "").strip():
            raise serializers.ValidationError({"note": "برای اعلام نیاز به اصلاح، توضیح الزامی است."})
        return attrs
