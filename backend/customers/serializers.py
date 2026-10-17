from rest_framework import serializers

from accounts.models import UserProfile
from .models import Customer


class CustomerSerializer(serializers.ModelSerializer):
    def get_fields(self):
        fields = super().get_fields()
        request = self.context.get("request")
        user = getattr(request, "user", None) if request else None
        profile = getattr(user, "profile", None) if user else None
        role = getattr(profile, "role", None) if profile else None
        # National identifiers are not needed for finance/audit read workflows.
        if role in {UserProfile.Role.FINANCE, UserProfile.Role.AUDITOR}:
            fields.pop("national_id", None)
        return fields

    class Meta:
        model = Customer
        fields = [
            "id",
            "customer_number",
            "customer_type",
            "first_name",
            "last_name",
            "organization_name",
            "phone_number",
            "email",
            "national_id",
            "birth_date",
            "father_name",
            "occupation",
            "postal_code",
            "sana_verified",
            "status",
            "assigned_to",
            "notes",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "customer_number", "assigned_to", "created_at", "updated_at"]

    def validate_national_id(self, value):
        translation = str.maketrans(
            "۰۱۲۳۴۵۶۷۸۹٠١٢٣٤٥٦٧٨٩",
            "01234567890123456789",
        )
        normalized = value.strip().translate(translation)
        if normalized and not normalized.isdigit():
            raise serializers.ValidationError("شناسه ملی یا کد ملی باید فقط شامل رقم باشد.")
        return normalized

    def validate(self, attrs):
        customer_type = attrs.get(
            "customer_type",
            getattr(self.instance, "customer_type", Customer.CustomerType.INDIVIDUAL),
        )
        if customer_type == Customer.CustomerType.INDIVIDUAL:
            first_name = attrs.get("first_name", getattr(self.instance, "first_name", ""))
            last_name = attrs.get("last_name", getattr(self.instance, "last_name", ""))
            if not first_name.strip() or not last_name.strip():
                raise serializers.ValidationError(
                    {"first_name": "برای مشتری حقیقی، نام و نام خانوادگی الزامی است."}
                )
        elif customer_type == Customer.CustomerType.ORGANIZATION:
            organization_name = attrs.get(
                "organization_name",
                getattr(self.instance, "organization_name", ""),
            )
            if not organization_name.strip():
                raise serializers.ValidationError(
                    {"organization_name": "برای مشتری حقوقی، نام سازمان الزامی است."}
                )
        return attrs
