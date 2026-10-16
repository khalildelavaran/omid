from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated

from .models import Customer
from .permissions import IsStaffCustomerOperator
from .serializers import CustomerSerializer


class CustomerViewSet(viewsets.ModelViewSet):
    serializer_class = CustomerSerializer
    permission_classes = [IsAuthenticated, IsStaffCustomerOperator]
    queryset = Customer.objects.select_related("assigned_to").all()

    def perform_create(self, serializer):
        serializer.save(assigned_to=self.request.user)
