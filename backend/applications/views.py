import uuid

from django.db import transaction
from django.db.models import Q
from django.utils import timezone
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
        # Status-changing updates select the row for update. The update action
        # is wrapped in a transaction below so concurrent credit decisions
        # validate against the committed status, not a stale pre-read.
        if (
            self.request.method in {"PUT", "PATCH"}
            and "status" in self.request.data
        ):
            queryset = queryset.select_for_update()
        user = self.request.user
        role = "system_admin" if user.is_superuser else getattr(
            getattr(user, "profile", None), "role", None
        )
        if not user.is_superuser:
            if role is None:
                return queryset.none()
            if role != "system_admin":
                if role in {"intake", "case_worker"}:
                    queryset = queryset.filter(assigned_to=user)
                elif role not in {"credit_approver", "finance", "auditor"}:
                    return queryset.none()

        include_archived = self.request.query_params.get("include_archived", "").strip().lower()
        if include_archived not in {"", "true", "false"}:
            raise ValidationError({"include_archived": "مقدار مجاز برابر true یا false است."})
        can_view_archived = (
            include_archived == "true"
            and self.request.method in {"GET", "HEAD", "OPTIONS"}
            and role in {"system_admin", "auditor"}
        )
        if not can_view_archived:
            queryset = queryset.filter(archived_at__isnull=True)

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
    def update(self, request, *args, **kwargs):
        return super().update(request, *args, **kwargs)

    @transaction.atomic
    def partial_update(self, request, *args, **kwargs):
        return super().partial_update(request, *args, **kwargs)

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
                note=serializer.context.get("status_note", ""),
                actor=self.request.user,
            )
            record_audit(
                self.request,
                "application.status_changed",
                actor=self.request.user,
                entity_type="loan_application",
                entity_id=str(application.pk),
                metadata={
                    "previous_status": previous_status,
                    "new_status": application.status,
                    "decision_note_length": len(serializer.context.get("status_note", "")),
                },
            )

    @action(detail=True, methods=["post"], url_path="commission")
    @transaction.atomic
    def commission(self, request, pk=None):
        role = "system_admin" if request.user.is_superuser else getattr(
            getattr(request.user, "profile", None), "role", None
        )
        if role != "system_admin":
            return Response({"detail": "تغییر کارمزد فقط در اختیار مدیر سامانه است."}, status=status.HTTP_403_FORBIDDEN)
        application = LoanApplication.objects.select_for_update().get(pk=self.get_object().pk)
        raw_rate = request.data.get("rate")
        reason = request.data.get("reason", "")
        if not isinstance(reason, str) or not reason.strip() or len(reason.strip()) > 500:
            raise ValidationError({"reason": "ثبت دلیل تغییر کارمزد الزامی است و حداکثر ۵۰۰ نویسه دارد."})
        from decimal import Decimal, InvalidOperation
        try:
            rate = Decimal(str(raw_rate))
        except (InvalidOperation, TypeError, ValueError):
            raise ValidationError({"rate": "نرخ کارمزد باید عدد معتبر باشد."})
        if not rate.is_finite() or rate < 0 or rate > 100:
            raise ValidationError({"rate": "نرخ کارمزد باید بین صفر تا ۱۰۰ درصد باشد."})
        previous_rate = application.loan_commission_pct
        application.loan_commission_pct = rate
        application.commission_override_reason = reason.strip()
        application.save(update_fields=["loan_commission_pct", "commission_override_reason", "updated_at"])
        record_audit(
            request, "application.commission_changed", actor=request.user,
            entity_type="loan_application", entity_id=str(application.pk),
            metadata={"previous_rate": str(previous_rate), "new_rate": str(rate), "reason": reason.strip()},
        )
        return Response(self.get_serializer(application).data, status=status.HTTP_200_OK)

    @action(detail=True, methods=["post"], url_path="archive")
    @transaction.atomic
    def archive(self, request, pk=None):
        role = "system_admin" if request.user.is_superuser else getattr(
            getattr(request.user, "profile", None), "role", None
        )
        if role != "system_admin":
            return Response(
                {"detail": "بایگانی پرونده فقط در اختیار مدیر سامانه است."},
                status=status.HTTP_403_FORBIDDEN,
            )

        application = self.get_object()
        reason = request.data.get("reason", "")
        if not isinstance(reason, str):
            raise ValidationError({"reason": "دلیل بایگانی باید متن باشد."})
        reason = reason.strip()
        if len(reason) > 500:
            raise ValidationError({"reason": "دلیل بایگانی نباید بیشتر از ۵۰۰ نویسه باشد."})

        application.archived_at = timezone.now()
        application.archived_by = request.user
        application.save(update_fields=["archived_at", "archived_by", "updated_at"])
        ApplicationEvent.objects.create(
            application=application,
            event_type=ApplicationEvent.EventType.ARCHIVED,
            previous_status=application.status,
            new_status=application.status,
            note=reason,
            actor=request.user,
        )
        record_audit(
            request,
            "application.archived",
            actor=request.user,
            entity_type="loan_application",
            entity_id=str(application.pk),
            metadata={"reason_length": len(reason)},
        )
        return Response(LoanApplicationSerializer(
            application, context=self.get_serializer_context()
        ).data, status=status.HTTP_200_OK)

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
