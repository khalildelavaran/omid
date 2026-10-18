from rest_framework import serializers

from .models import Disbursement


class DisbursementSerializer(serializers.ModelSerializer):
    application_number = serializers.CharField(source="application.application_number", read_only=True)

    class Meta:
        model = Disbursement
        fields = [
            "id", "disbursement_number", "application", "application_number",
            "amount_rial", "commission_rate_pct", "commission_amount_rial",
            "status", "bank_reference", "evidence_reference", "recorded_by",
            "confirmed_at", "created_at", "updated_at",
        ]
        read_only_fields = [
            "id", "disbursement_number", "application_number", "commission_rate_pct",
            "commission_amount_rial", "status", "recorded_by", "confirmed_at",
            "created_at", "updated_at",
        ]

    def validate_amount_rial(self, value):
        if value <= 0:
            raise serializers.ValidationError("مبلغ واقعی واریز باید بیشتر از صفر ریال باشد.")
        return value

    def validate(self, attrs):
        application = attrs.get("application")
        if application and application.archived_at:
            raise serializers.ValidationError({"application": "برای پرونده بایگانی‌شده ثبت واریز مجاز نیست."})
        return attrs
