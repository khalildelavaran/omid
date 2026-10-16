from django.db import transaction
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import ValidationError
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from .models import ApplicationEvent, LoanApplication
from .permissions import IsStaffApplicationOperator
from .serializers import ApplicationEventSerializer, LoanApplicationSerializer


class LoanApplicationViewSet(viewsets.ModelViewSet):
    serializer_class = LoanApplicationSerializer
    permission_classes = [IsAuthenticated, IsStaffApplicationOperator]
    queryset = LoanApplication.objects.select_related("customer", "assigned_to").all()

    def get_queryset(self):
        queryset = super().get_queryset()
        status_filter = self.request.query_params.get("status")
        customer = self.request.query_params.get("customer")
        search = self.request.query_params.get("search")
        if status_filter:
            queryset = queryset.filter(status=status_filter)
        if customer:
            queryset = queryset.filter(customer_id=customer)
        if search:
            from django.db.models import Q
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

    @transaction.atomic
    def perform_update(self, serializer):
        previous_status = serializer.instance.status
        application = serializer.save()
        if application.status != previous_status:
            ApplicationEvent.objects.create(
                application=application,
                event_type=ApplicationEvent.EventType.STATUS_CHANGED,
                previous_status=previous_status,
                new_status=application.status,
                note=(self.request.data.get("status_note") or "").strip(),
                actor=self.request.user,
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
        return Response(ApplicationEventSerializer(event).data, status=status.HTTP_201_CREATED)
