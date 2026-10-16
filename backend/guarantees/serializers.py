from rest_framework import serializers

from accounts.models import UserProfile
from applications.models import LoanApplication
from customers.models import Customer
from .models import GuaranteeRequest


class GuaranteeRequestSerializer(serializers.ModelSerializer):
    application_number = serializers.CharField(source="application.application_number", read_only=True)
    loan_customer_name = serializers.SerializerMethodField()
    requester_customer_name = serializers.SerializerMethodField()
    created_by_username = serializers.CharField(source="created_by.username", read_only=True)

    class Meta:
        model = GuaranteeRequest
        fields = [
            "id", "request_number", "application", "application_number",
            "loan_customer_name", "requester_customer", "requester_customer_name",
            "status", "note", "created_by", "created_by_username",
            "created_at", "updated_at",
        ]
        read_only_fields = [
            "id", "request_number", "application_number", "loan_customer_name",
            "requester_customer_name", "status", "created_by", "created_by_username",
            "created_at", "updated_at",
        ]

    def get_loan_customer_name(self, obj):
        return str(obj.application.customer)

    def get_requester_customer_name(self, obj):
        return str(obj.requester_customer) if obj.requester_customer_id else ""

    def validate_application(self, value):
        request = self.context.get("request")
        if request is None or not request.user.is_authenticated:
            raise serializers.ValidationError("احراز هویت الزامی است.")
        user = request.user
        role = UserProfile.Role.SYSTEM_ADMIN if user.is_superuser else getattr(
            getattr(user, "profile", None), "role", None
        )
        if role == UserProfile.Role.SYSTEM_ADMIN:
            return value
        if role in {UserProfile.Role.INTAKE, UserProfile.Role.CASE_WORKER} and value.assigned_to_id == user.id:
            return value
        raise serializers.ValidationError("برای پرونده انتخاب‌شده دسترسی ثبت درخواست ضمانت ندارید.")

    def validate_requester_customer(self, value):
        if value is None:
            return value
        request = self.context.get("request")
        if request is None or not request.user.is_authenticated:
            raise serializers.ValidationError("احراز هویت الزامی است.")
        user = request.user
        role = UserProfile.Role.SYSTEM_ADMIN if user.is_superuser else getattr(
            getattr(user, "profile", None), "role", None
        )
        if role == UserProfile.Role.SYSTEM_ADMIN:
            return value
        if role in {UserProfile.Role.INTAKE, UserProfile.Role.CASE_WORKER} and value.assigned_to_id == user.id:
            return value
        raise serializers.ValidationError("به مشتری انتخاب‌شده به‌عنوان درخواست‌دهنده دسترسی ندارید.")
