from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated

from .models import LoanApplication
from .permissions import IsStaffApplicationOperator
from .serializers import LoanApplicationSerializer


class LoanApplicationViewSet(viewsets.ModelViewSet):
    serializer_class = LoanApplicationSerializer
    permission_classes = [IsAuthenticated, IsStaffApplicationOperator]
    queryset = LoanApplication.objects.select_related("customer", "assigned_to").all()

    def get_queryset(self):
        queryset = super().get_queryset()
        status = self.request.query_params.get("status")
        customer = self.request.query_params.get("customer")
        search = self.request.query_params.get("search")
        if status:
            queryset = queryset.filter(status=status)
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

    def perform_create(self, serializer):
        serializer.save(assigned_to=self.request.user)
