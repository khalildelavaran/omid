from rest_framework import serializers

from customers.models import Customer
from .models import LoanApplication


class LoanApplicationSerializer(serializers.ModelSerializer):
    customer_number = serializers.CharField(source="customer.customer_number", read_only=True)
    customer_display_name = serializers.SerializerMethodField()

    class Meta:
        model = LoanApplication
        fields = [
            "id", "application_number", "customer", "customer_number",
            "customer_display_name", "product_type", "requested_amount",
            "term_months", "status", "assigned_to", "purpose", "notes",
            "created_at", "updated_at",
        ]
        read_only_fields = ["id", "assigned_to", "created_at", "updated_at"]

    def get_customer_display_name(self, obj):
        return str(obj.customer)

    def validate_requested_amount(self, value):
        if value <= 0:
            raise serializers.ValidationError("مبلغ درخواستی باید بیشتر از صفر باشد.")
        return value

    def validate_term_months(self, value):
        if value is not None and not 1 <= value <= 240:
            raise serializers.ValidationError("مدت بازپرداخت باید بین ۱ تا ۲۴۰ ماه باشد.")
        return value

    def validate_customer(self, value):
        request = self.context.get("request")
        if request and request.user.is_authenticated:
            if not Customer.objects.filter(pk=value.pk).exists():
                raise serializers.ValidationError("مشتری انتخاب‌شده معتبر نیست.")
        return value
