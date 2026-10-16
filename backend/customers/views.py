from django.db import transaction
from django.db.models import Q
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from core.audit import record_audit
from .models import Customer
from .permissions import IsStaffCustomerOperator
from .serializers import CustomerSerializer


def normalize_digits(value):
    translation = str.maketrans(
        "۰۱۲۳۴۵۶۷۸۹٠١٢٣٤٥٦٧٨٩",
        "01234567890123456789",
    )
    return str(value or "").translate(translation)


class CustomerViewSet(viewsets.ModelViewSet):
    serializer_class = CustomerSerializer
    permission_classes = [IsAuthenticated, IsStaffCustomerOperator]
    queryset = Customer.objects.select_related("assigned_to").all()
    # Financial/customer records must never be hard-deleted through the API.
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
        customer_type = self.request.query_params.get("customer_type")
        search = normalize_digits(self.request.query_params.get("search", "")).strip()
        assigned_to = self.request.query_params.get("assigned_to")

        if status_filter:
            queryset = queryset.filter(status=status_filter)
        if customer_type:
            queryset = queryset.filter(customer_type=customer_type)
        if assigned_to and assigned_to.isdigit():
            queryset = queryset.filter(assigned_to_id=int(assigned_to))
        if search:
            queryset = queryset.filter(
                Q(customer_number__icontains=search)
                | Q(first_name__icontains=search)
                | Q(last_name__icontains=search)
                | Q(organization_name__icontains=search)
                | Q(phone_number__icontains=search)
                | Q(email__icontains=search)
            )
        return queryset

    @transaction.atomic
    def perform_create(self, serializer):
        customer = serializer.save(assigned_to=self.request.user)
        record_audit(
            self.request,
            "customer.created",
            actor=self.request.user,
            entity_type="customer",
            entity_id=str(customer.pk),
            metadata={"customer_type": customer.customer_type},
        )

    @transaction.atomic
    def perform_update(self, serializer):
        customer = serializer.save()
        record_audit(
            self.request,
            "customer.updated",
            actor=self.request.user,
            entity_type="customer",
            entity_id=str(customer.pk),
            metadata={"updated_fields": sorted(serializer.validated_data.keys())},
        )

    @action(detail=True, methods=["post"], url_path="archive")
    @transaction.atomic
    def archive(self, request, pk=None):
        customer = self.get_object()
        if customer.status == Customer.Status.ARCHIVED:
            return Response(CustomerSerializer(customer, context={"request": request}).data)
        customer.status = Customer.Status.ARCHIVED
        customer.save(update_fields=["status", "updated_at"])
        record_audit(
            request,
            "customer.archived",
            actor=request.user,
            entity_type="customer",
            entity_id=str(customer.pk),
        )
        return Response(
            CustomerSerializer(customer, context={"request": request}).data,
            status=status.HTTP_200_OK,
        )
