from django.db import transaction
from django.db.models import Q
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

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

    def perform_create(self, serializer):
        serializer.save(assigned_to=self.request.user)

    @action(detail=True, methods=["post"], url_path="archive")
    @transaction.atomic
    def archive(self, request, pk=None):
        customer = self.get_object()
        if customer.status == Customer.Status.ARCHIVED:
            return Response(CustomerSerializer(customer, context={"request": request}).data)
        customer.status = Customer.Status.ARCHIVED
        customer.save(update_fields=["status", "updated_at"])
        return Response(
            CustomerSerializer(customer, context={"request": request}).data,
            status=status.HTTP_200_OK,
        )
