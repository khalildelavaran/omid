from django.db import IntegrityError, transaction
from django.http import FileResponse, Http404
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import ValidationError
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from accounts.models import UserProfile
from core.audit import record_audit
from .models import Document
from .permissions import IsStaffDocumentOperator
from .serializers import DocumentReviewSerializer, DocumentSerializer, DocumentUploadSerializer


def _delete_document_file(document):
    if document.file and document.file.name:
        try:
            document.file.storage.delete(document.file.name)
        except (OSError, ValueError):
            pass


class DocumentViewSet(viewsets.GenericViewSet):
    permission_classes = [IsAuthenticated, IsStaffDocumentOperator]
    parser_classes = [MultiPartParser, FormParser, JSONParser]
    queryset = Document.objects.select_related(
        "application", "application__customer", "uploaded_by", "reviewed_by"
    ).all()
    http_method_names = ["get", "post", "head", "options"]

    def get_queryset(self):
        queryset = super().get_queryset()
        user = self.request.user
        role = "system_admin" if user.is_superuser else getattr(
            getattr(user, "profile", None), "role", None
        )
        if role in {UserProfile.Role.INTAKE, UserProfile.Role.CASE_WORKER}:
            queryset = queryset.filter(application__assigned_to=user)
        elif role not in {
            UserProfile.Role.SYSTEM_ADMIN,
            UserProfile.Role.CREDIT_APPROVER,
            UserProfile.Role.FINANCE,
            UserProfile.Role.AUDITOR,
        }:
            return queryset.none()

        status_filter = self.request.query_params.get("status", "").strip()
        document_type = self.request.query_params.get("document_type", "").strip()
        application_id = self.request.query_params.get("application", "").strip()
        if status_filter in Document.Status.values:
            queryset = queryset.filter(status=status_filter)
        if document_type in Document.DocumentType.values:
            queryset = queryset.filter(document_type=document_type)
        if application_id:
            import uuid

            try:
                parsed_application_id = uuid.UUID(application_id)
            except (ValueError, TypeError, AttributeError):
                return queryset.none()
            queryset = queryset.filter(application_id=parsed_application_id)
        return queryset

    def get_serializer_class(self):
        if self.action == "create":
            return DocumentUploadSerializer
        if self.action == "review":
            return DocumentReviewSerializer
        return DocumentSerializer

    @transaction.atomic
    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            with transaction.atomic():
                document = serializer.save()
        except IntegrityError:
            return Response(
                {"detail": "تعارض در ثبت سند؛ نسخه یا شماره سند قبلاً ثبت شده است."},
                status=status.HTTP_409_CONFLICT,
            )
        try:
            record_audit(
                request,
                "document.uploaded",
                actor=request.user,
                entity_type="document",
                entity_id=str(document.pk),
                metadata={
                    "application_id": str(document.application_id),
                    "document_type": document.document_type,
                    "size_bytes": document.size_bytes,
                    "sha256": document.sha256,
                },
            )
        except Exception:
            _delete_document_file(document)
            raise
        output = DocumentSerializer(document, context=self.get_serializer_context())
        return Response(output.data, status=status.HTTP_201_CREATED)

    def retrieve(self, request, *args, **kwargs):
        document = self.get_object()
        return Response(DocumentSerializer(document, context=self.get_serializer_context()).data)

    def list(self, request, *args, **kwargs):
        queryset = self.filter_queryset(self.get_queryset())
        page = self.paginate_queryset(queryset)
        if page is not None:
            serializer = DocumentSerializer(page, many=True, context=self.get_serializer_context())
            return self.get_paginated_response(serializer.data)
        serializer = DocumentSerializer(queryset, many=True, context=self.get_serializer_context())
        return Response(serializer.data)

    @action(detail=True, methods=["get"], url_path="download")
    def download(self, request, pk=None):
        document = self.get_object()
        if document.status == Document.Status.REJECTED:
            # Rejected material must be replaced before normal downloads are allowed.
            return Response(
                {"detail": "سند نیازمند اصلاح است و فعلاً قابل دریافت نیست."},
                status=status.HTTP_409_CONFLICT,
            )
        try:
            stream = document.file.open("rb")
        except (OSError, ValueError):
            raise Http404("فایل سند پیدا نشد.")

        response = FileResponse(
            stream,
            as_attachment=True,
            filename=document.original_filename,
            content_type=document.content_type,
        )
        record_audit(
            request,
            "document.downloaded",
            actor=request.user,
            entity_type="document",
            entity_id=str(document.pk),
            metadata={
                "application_id": str(document.application_id),
                "document_type": document.document_type,
                "size_bytes": document.size_bytes,
            },
        )
        response["Cache-Control"] = "private, no-store, max-age=0"
        response["Pragma"] = "no-cache"
        response["X-Content-Type-Options"] = "nosniff"
        response["Content-Security-Policy"] = "default-src 'none'; sandbox"
        return response

    @action(detail=True, methods=["post"], url_path="replace")
    @transaction.atomic
    def replace(self, request, pk=None):
        previous = self.get_object()
        # Serialize competing replacements; the unique constraint below the
        # model remains the final guard on databases with row-level locking.
        previous = Document.objects.select_for_update().get(pk=previous.pk)
        if previous.status != Document.Status.REJECTED:
            return Response(
                {"detail": "فقط سندی که نیازمند اصلاح اعلام شده قابل جایگزینی است."},
                status=status.HTTP_409_CONFLICT,
            )
        if previous.replacement_documents.exists():
            return Response(
                {"detail": "این نسخه قبلاً جایگزین شده است؛ آخرین نسخه را انتخاب کنید."},
                status=status.HTTP_409_CONFLICT,
            )

        serializer = DocumentUploadSerializer(
            data={
                "application": str(previous.application_id),
                "document_type": previous.document_type,
                "replaces_document": str(previous.pk),
                "file": request.data.get("file"),
            },
            context=self.get_serializer_context(),
        )
        serializer.is_valid(raise_exception=True)
        try:
            with transaction.atomic():
                replacement = serializer.save()
        except IntegrityError:
            return Response(
                {"detail": "این سند هم‌زمان توسط درخواست دیگری جایگزین شده است."},
                status=status.HTTP_409_CONFLICT,
            )
        try:
            record_audit(
                request,
                "document.replaced",
                actor=request.user,
                entity_type="document",
                entity_id=str(replacement.pk),
                metadata={
                    "previous_document_id": str(previous.pk),
                    "application_id": str(replacement.application_id),
                    "document_type": replacement.document_type,
                    "size_bytes": replacement.size_bytes,
                    "sha256": replacement.sha256,
                },
            )
        except Exception:
            _delete_document_file(replacement)
            raise
        output = DocumentSerializer(replacement, context=self.get_serializer_context())
        return Response(output.data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=["post"], url_path="review")
    @transaction.atomic
    def review(self, request, pk=None):
        role = "system_admin" if request.user.is_superuser else getattr(
            getattr(request.user, "profile", None), "role", None
        )
        if role not in {UserProfile.Role.SYSTEM_ADMIN, UserProfile.Role.CASE_WORKER}:
            return Response(
                {"detail": "بررسی سند فقط در اختیار مدیر سامانه یا کارشناس پرونده است."},
                status=status.HTTP_403_FORBIDDEN,
            )

        document = self.get_object()
        if document.status != Document.Status.PENDING_REVIEW:
            raise ValidationError({"status": "این سند قبلاً بررسی شده است."})

        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        previous_status = document.status
        document.status = serializer.validated_data["status"]
        document.review_note = serializer.validated_data.get("note", "")
        document.reviewed_by = request.user
        from django.utils import timezone

        document.reviewed_at = timezone.now()
        document.save(update_fields=[
            "status", "review_note", "reviewed_by", "reviewed_at", "updated_at"
        ])
        record_audit(
            request,
            "document.reviewed",
            actor=request.user,
            entity_type="document",
            entity_id=str(document.pk),
            metadata={
                "previous_status": previous_status,
                "new_status": document.status,
                "note_length": len(document.review_note),
            },
        )
        return Response(
            DocumentSerializer(document, context=self.get_serializer_context()).data,
            status=status.HTTP_200_OK,
        )
