from decimal import Decimal

from django.contrib.auth import get_user_model
from rest_framework import serializers

from accounts.models import UserProfile
from customers.models import Customer
from .models import ServiceCatalogItem, ServiceRecord


User = get_user_model()


class ServiceCatalogItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = ServiceCatalogItem
        fields = [
            "id", "code", "name", "description", "price", "active",
            "created_by", "created_at", "updated_at",
        ]
        read_only_fields = ["id", "code", "created_by", "created_at", "updated_at"]

    def validate_name(self, value):
        value = value.strip()
        if not value:
            raise serializers.ValidationError("نام خدمت الزامی است.")
        duplicate = ServiceCatalogItem.objects.filter(name__iexact=value)
        if self.instance:
            duplicate = duplicate.exclude(pk=self.instance.pk)
        if duplicate.exists():
            raise serializers.ValidationError("خدمتی با این نام قبلاً ثبت شده است.")
        return value

    def validate_price(self, value):
        if value < 0:
            raise serializers.ValidationError("تعرفه خدمت نمی‌تواند منفی باشد.")
        return value


class ServiceRecordSerializer(serializers.ModelSerializer):
    customer_name = serializers.CharField(source="customer.__str__", read_only=True)
    service_name = serializers.CharField(source="service_name_snapshot", read_only=True)
    service_code = serializers.CharField(source="service_code_snapshot", read_only=True)
    performed_by_name = serializers.CharField(source="performed_by.get_full_name", read_only=True)
    created_by_username = serializers.CharField(source="created_by.username", read_only=True)
    amount_due = serializers.DecimalField(max_digits=18, decimal_places=0, read_only=True)

    class Meta:
        model = ServiceRecord
        fields = [
            "id", "receipt_number", "customer", "customer_name", "service",
            "service_code", "service_name", "service_description_snapshot",
            "price", "discount", "total", "paid", "amount_due", "payment_method",
            "performed_by", "performed_by_name", "note", "created_by",
            "created_by_username", "created_at",
        ]
        read_only_fields = fields


class ServiceRecordCreateSerializer(serializers.Serializer):
    customer = serializers.PrimaryKeyRelatedField(queryset=Customer.objects.all())
    service = serializers.PrimaryKeyRelatedField(queryset=ServiceCatalogItem.objects.filter(active=True))
    performed_by = serializers.PrimaryKeyRelatedField(
        queryset=User.objects.filter(is_active=True, is_staff=True)
    )
    discount = serializers.DecimalField(
        max_digits=18, decimal_places=0, min_value=Decimal("0"), required=False, default=Decimal("0")
    )
    paid = serializers.DecimalField(
        max_digits=18, decimal_places=0, min_value=Decimal("0")
    )
    payment_method = serializers.ChoiceField(choices=ServiceRecord.PaymentMethod.choices)
    note = serializers.CharField(required=False, allow_blank=True, max_length=500, trim_whitespace=True, default="")

    def validate_customer(self, value):
        request = self.context.get("request")
        user = request.user if request else None
        if not user or not user.is_authenticated:
            raise serializers.ValidationError("احراز هویت الزامی است.")
        role = UserProfile.Role.SYSTEM_ADMIN if user.is_superuser else getattr(
            getattr(user, "profile", None), "role", None
        )
        if role in {UserProfile.Role.INTAKE, UserProfile.Role.CASE_WORKER} and value.assigned_to_id != user.id:
            raise serializers.ValidationError("برای ثبت خدمت به این مشتری دسترسی ندارید.")
        return value

    def validate_performed_by(self, value):
        profile = getattr(value, "profile", None)
        role = UserProfile.Role.SYSTEM_ADMIN if value.is_superuser else getattr(profile, "role", None)
        if not value.is_active or not value.is_staff or role in {None, UserProfile.Role.CUSTOMER}:
            raise serializers.ValidationError("کارمند ارائه‌دهنده باید یک حساب داخلی فعال باشد.")
        return value

    def validate(self, attrs):
        service = attrs["service"]
        price = service.price
        discount = attrs.get("discount", Decimal("0"))
        total = price - discount
        if discount > price:
            raise serializers.ValidationError({"discount": "تخفیف نمی‌تواند از تعرفه خدمت بیشتر باشد."})
        if attrs["paid"] > total:
            raise serializers.ValidationError({"paid": "مبلغ دریافتی نمی‌تواند از مبلغ نهایی خدمت بیشتر باشد."})
        return attrs

    def create(self, validated_data):
        actor = validated_data.pop("created_by", self.context["request"].user)
        service = validated_data.pop("service")
        customer = validated_data.pop("customer")
        performed_by = validated_data.pop("performed_by")
        discount = validated_data.pop("discount", Decimal("0"))
        paid = validated_data.pop("paid")
        total = service.price - discount
        return ServiceRecord.objects.create(
            customer=customer,
            service=service,
            service_code_snapshot=service.code,
            service_name_snapshot=service.name,
            service_description_snapshot=service.description,
            price=service.price,
            discount=discount,
            total=total,
            paid=paid,
            performed_by=performed_by,
            created_by=actor,
            **validated_data,
        )
