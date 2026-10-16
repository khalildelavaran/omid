import uuid

from django.db import transaction
from django.db.models import Q
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import ValidationError
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from core.audit import record_audit
from .models import ApplicationEvent, LoanApplication
from .permissions import IsStaffApplicationOperator
from .serializers import ApplicationEventSerializer, LoanApplicationSerializer


class LoanApplicationViewSet(viewsets.ModelViewSet):
    serializer_class = LoanApplicationSerializer
    permission_classes = [IsAuthenticated, IsStaffApplicationOperator]
    queryset = LoanApplication.objects.select_related("customer", "assigned_to").all()
    # Loan/credit files are retained for audit and must not be hard-deleted via the API.
    http_method_names = ["get", "post", "put", "patch", "head", "options"]

    def get_queryset(self):
        queryset = super().get_queryset()
        user = self.request.user
        if not user.is_superuser:
            try:
                role = user.profile.role
            except (AttributeError, user.__class__.profile.RelatedObjectDoesNotExist):
                return queryset.none()
            if role != "system_admin":
                if role in {"intake", "case_worker"}:
                    queryset = queryset.filter(assigned_to=user)
                elif role not in {"credit_approver", "finance", "auditor"}:
                    return queryset.none()

        status_filter = self.request.query_params.get("status")
        customer = self.request.query_params.get("customer")
        search = self.request.query_params.get("search")
        if search:
            search = str(search).translate(str.maketrans("۰۱۲۳۴۵۶۷۸۹٠١٢٣٤٥٦٧٨٩", "01234567890123456789")).strip()
        if status_filter:
            queryset = queryset.filter(status=status_filter)
        if customer:
            try:
                customer_id = uuid.UUID(customer)
            except (ValueError, TypeError, AttributeError):
                return queryset.none()
            queryset = queryset.filter(customer_id=customer_id)
        if search:
            queryset = queryset.filter(
                Q(application_number__icontains=search)
                | Q(customer__customer_number__icontains=search)
                | Q(customer__first_name__icontains=search)
                | Q(customer__last_name__icontains=search)
                | Q(customer__organization_name__icontains=search)
            )
        return queryset

    @transaction.atomic
    def perform_create(self, serializer):
        application = serializer.save(assigned_to=self.request.user)
        ApplicationEvent.objects.create(
            application=application,
            event_type=ApplicationEvent.EventType.CREATED,
            new_status=application.status,
            note="پرونده ایجاد شد.",
            actor=self.request.user,
        )
        record_audit(
            self.request,
            "application.created",
            actor=self.request.user,
            entity_type="loan_application",
            entity_id=str(application.pk),
            metadata={"status": application.status, "product_type": application.product_type},
        )

    @transaction.atomic
    def perform_update(self, serializer):
        previous_status = serializer.instance.status
        application = serializer.save()
        record_audit(
            self.request,
            "application.updated",
            actor=self.request.user,
            entity_type="loan_application",
            entity_id=str(application.pk),
            metadata={"updated_fields": sorted(serializer.validated_data.keys())},
        )
        if application.status != previous_status:
            ApplicationEvent.objects.create(
                application=application,
                event_type=ApplicationEvent.EventType.STATUS_CHANGED,
                previous_status=previous_status,
                new_status=application.status,
                note=(self.request.data.get("status_note") or "").strip(),
                actor=self.request.user,
            )
            record_audit(
                self.request,
                "application.status_changed",
                actor=self.request.user,
                entity_type="loan_application",
                entity_id=str(application.pk),
                metadata={"previous_status": previous_status, "new_status": application.status},
            )

    @action(detail=True, methods=["get"], url_path="events")
    def events(self, request, pk=None):
        application = self.get_object()
        events = application.events.select_related("actor").all()
        return Response(ApplicationEventSerializer(events, many=True).data)

    @action(detail=True, methods=["post"], url_path="notes")
    @transaction.atomic
    def add_note(self, request, pk=None):
        application = self.get_object()
        note = request.data.get("note", "")
        if not isinstance(note, str) or not note.strip():
            raise ValidationError({"note": "متن یادداشت الزامی است."})
        if len(note.strip()) > 5000:
            raise ValidationError({"note": "یادداشت نباید بیشتر از ۵۰۰۰ نویسه باشد."})
        event = ApplicationEvent.objects.create(
            application=application,
            event_type=ApplicationEvent.EventType.NOTE_ADDED,
            new_status=application.status,
            note=note.strip(),
            actor=request.user,
        )
        record_audit(
            request,
            "application.note_added",
            actor=request.user,
            entity_type="loan_application",
            entity_id=str(application.pk),
            metadata={"note_length": len(note.strip())},
        )
        return Response(ApplicationEventSerializer(event).data, status=status.HTTP_201_CREATED)
