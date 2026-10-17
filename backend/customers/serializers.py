from django.db import transaction
from django.utils import timezone
from rest_framework import serializers

from accounts.models import UserProfile
from .models import Customer, CustomerAddress, CustomerPhone


class CustomerAddressSerializer(serializers.ModelSerializer):
    id = serializers.UUIDField(required=False)
    value = serializers.CharField(source="address", max_length=1000)

    class Meta:
        model = CustomerAddress
        fields = ["id", "title", "value", "postal_code"]


class CustomerPhoneSerializer(serializers.ModelSerializer):
    id = serializers.UUIDField(required=False)
    number = serializers.CharField(max_length=32, trim_whitespace=True)

    class Meta:
        model = CustomerPhone
        fields = ["id", "title", "number"]


class CustomerSerializer(serializers.ModelSerializer):
    addresses = CustomerAddressSerializer(many=True, required=False)
    phones = CustomerPhoneSerializer(many=True, required=False)

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
            "id", "customer_number", "customer_type", "first_name", "last_name",
            "organization_name", "phone_number", "email", "national_id",
            "birth_date", "father_name", "occupation", "postal_code",
            "sana_verified", "status", "assigned_to", "notes", "addresses",
            "phones", "created_at", "updated_at",
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
                "organization_name", getattr(self.instance, "organization_name", "")
            )
            if not organization_name.strip():
                raise serializers.ValidationError(
                    {"organization_name": "برای مشتری حقوقی، نام سازمان الزامی است."}
                )

        for field_name in ("addresses", "phones"):
            if field_name not in attrs:
                continue
            child_ids = [item["id"] for item in attrs[field_name] if item.get("id")]
            if len(child_ids) != len(set(child_ids)):
                raise serializers.ValidationError(
                    {field_name: "شناسه‌های تکراری در فهرست مجاز نیست."}
                )
            if self.instance is None:
                if child_ids:
                    raise serializers.ValidationError(
                        {field_name: "هنگام ایجاد مشتری نمی‌توان شناسه رکورد موجود ارسال کرد."}
                    )
                continue
            current_ids = set(
                getattr(self.instance, field_name)
                .filter(is_active=True)
                .values_list("pk", flat=True)
            )
            if any(child_id not in current_ids for child_id in child_ids):
                raise serializers.ValidationError(
                    {field_name: "یکی از رکوردهای انتخاب‌شده فعال نیست یا به این مشتری تعلق ندارد."}
                )
        return attrs

    @staticmethod
    def _sync_children(customer, field_name, payloads, model):
        manager = getattr(customer, field_name)
        current = {item.pk: item for item in manager.filter(is_active=True)}
        retained_ids = set()
        for source in payloads:
            payload = dict(source)
            child_id = payload.pop("id", None)
            if child_id:
                item = current[child_id]
                for key, value in payload.items():
                    setattr(item, key, value)
                item.is_active = True
                item.archived_at = None
                item.save()
            else:
                item = model.objects.create(customer=customer, **payload)
            retained_ids.add(item.pk)

        timestamp = timezone.now()
        for item in current.values():
            if item.pk not in retained_ids:
                item.is_active = False
                item.archived_at = timestamp
                item.save(update_fields=["is_active", "archived_at", "updated_at"])

    @transaction.atomic
    def create(self, validated_data):
        addresses = validated_data.pop("addresses", [])
        phones = validated_data.pop("phones", [])
        customer = super().create(validated_data)
        if addresses:
            self._sync_children(customer, "addresses", addresses, CustomerAddress)
        if phones:
            self._sync_children(customer, "phones", phones, CustomerPhone)
        if "phones" in self.initial_data:
            customer.phone_number = phones[0].get("number", "") if phones else ""
            customer.save(update_fields=["phone_number", "updated_at"])
        return customer

    @transaction.atomic
    def update(self, instance, validated_data):
        missing = serializers.empty
        addresses = validated_data.pop("addresses", missing)
        phones = validated_data.pop("phones", missing)
        customer = super().update(instance, validated_data)
        if addresses is not missing:
            self._sync_children(customer, "addresses", addresses, CustomerAddress)
        if phones is not missing:
            self._sync_children(customer, "phones", phones, CustomerPhone)
            customer.phone_number = phones[0].get("number", "") if phones else ""
            customer.save(update_fields=["phone_number", "updated_at"])
        return customer

    def to_representation(self, instance):
        data = super().to_representation(instance)
        addresses = [item for item in instance.addresses.all() if item.is_active]
        phones = [item for item in instance.phones.all() if item.is_active]
        data["addresses"] = CustomerAddressSerializer(
            addresses, many=True, context=self.context
        ).data
        data["phones"] = CustomerPhoneSerializer(
            phones, many=True, context=self.context
        ).data
        return data
