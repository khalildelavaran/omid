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
    status_note = serializers.CharField(write_only=True, required=False, allow_blank=True, max_length=1000, trim_whitespace=True, default="")
    customer_number = serializers.CharField(source="customer.customer_number", read_only=True)
    customer_display_name = serializers.SerializerMethodField()

    class Meta:
        model = LoanApplication
        fields = [
            "id", "application_number", "customer", "customer_number",
            "customer_display_name", "product_type", "requested_amount", "status_note",
            "term_months", "status", "assigned_to", "purpose", "notes",
            "loan_commission_pct", "commission_override_reason",
            "created_at", "updated_at", "archived_at", "archived_by",
        ]
        read_only_fields = ["id", "application_number", "assigned_to", "created_at", "updated_at", "archived_at", "archived_by", "loan_commission_pct", "commission_override_reason"]

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
            if value.status == Customer.Status.ARCHIVED:
                raise serializers.ValidationError(
                    "برای پرونده جدید یا تغییر مشتری پرونده، انتخاب مشتری بایگانی‌شده مجاز نیست."
                )
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

    def validate(self, attrs):
        status_note = attrs.pop("status_note", "")
        status_note = status_note.strip() if isinstance(status_note, str) else ""
        requested_status = attrs.get(
            "status",
            getattr(self.instance, "status", LoanApplication.Status.UNDER_REVIEW),
        )
        current_status = getattr(self.instance, "status", None)

        if self.instance is None and requested_status != LoanApplication.Status.UNDER_REVIEW:
            raise serializers.ValidationError({
                "status": "پرونده جدید باید با وضعیت «در حال بررسی» ثبت شود."
            })
        if requested_status == LoanApplication.Status.REJECTED and requested_status != current_status and not status_note:
            raise serializers.ValidationError({
                "status_note": "برای رد درخواست تسهیلات، ثبت دلیل تصمیم الزامی است."
            })
        self.context["status_note"] = status_note
        return attrs

    def validate_status(self, value):
        request = self.context.get("request")
        role = getattr(getattr(request.user, "profile", None), "role", None) if request else None
        if request and request.user.is_superuser:
            role = UserProfile.Role.SYSTEM_ADMIN
        final_statuses = {LoanApplication.Status.APPROVED, LoanApplication.Status.REJECTED}
        if value in final_statuses and role != UserProfile.Role.CREDIT_APPROVER:
            raise serializers.ValidationError("ثبت تصمیم نهایی اعتباری فقط در اختیار تأییدکننده اعتباری است.")
        if role == UserProfile.Role.CREDIT_APPROVER:
            if value not in final_statuses:
                raise serializers.ValidationError("تأییدکننده اعتباری فقط می‌تواند تصمیم نهایی ثبت کند.")
            if not self.instance or self.instance.status != LoanApplication.Status.AWAITING_APPROVAL:
                raise serializers.ValidationError("تصمیم نهایی فقط برای پرونده در انتظار تأیید مجاز است.")

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
