from rest_framework import serializers

from accounts.models import UserProfile
from customers.models import Customer
from .models import ApplicationEvent, LoanApplication


class ApplicationEventSerializer(serializers.ModelSerializer):
    actor_username = serializers.CharField(source="actor.username", read_only=True, default=None)

    class Meta:
        model = ApplicationEvent
        fields = [
            "id", "event_type", "previous_status", "new_status", "note",
            "actor", "actor_username", "created_at",
        ]
        read_only_fields = fields


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
            user = request.user
            if not user.is_superuser:
                profile = getattr(user, "profile", None)
                role = getattr(profile, "role", None)
                if role != UserProfile.Role.SYSTEM_ADMIN and role in {
                    UserProfile.Role.INTAKE,
                    UserProfile.Role.CASE_WORKER,
                } and value.assigned_to_id != user.id:
                    raise serializers.ValidationError(
                        "برای ثبت پرونده، باید به مشتری انتخاب‌شده دسترسی داشته باشید."
                    )
        return value

    def validate_status(self, value):
        if not self.instance or value == self.instance.status:
            return value
        allowed = {
            LoanApplication.Status.UNDER_REVIEW: {
                LoanApplication.Status.AWAITING_DOCUMENTS,
                LoanApplication.Status.AWAITING_APPROVAL,
                LoanApplication.Status.CANCELLED,
            },
            LoanApplication.Status.AWAITING_DOCUMENTS: {
                LoanApplication.Status.UNDER_REVIEW,
                LoanApplication.Status.AWAITING_APPROVAL,
                LoanApplication.Status.CANCELLED,
            },
            LoanApplication.Status.AWAITING_APPROVAL: {
                LoanApplication.Status.UNDER_REVIEW,
                LoanApplication.Status.APPROVED,
                LoanApplication.Status.REJECTED,
                LoanApplication.Status.CANCELLED,
            },
            LoanApplication.Status.APPROVED: set(),
            LoanApplication.Status.REJECTED: set(),
            LoanApplication.Status.CANCELLED: set(),
        }
        if value not in allowed.get(self.instance.status, set()):
            raise serializers.ValidationError("این تغییر وضعیت در گردش کار مجاز نیست.")
        return value
