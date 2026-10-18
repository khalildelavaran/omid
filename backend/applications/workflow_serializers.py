from rest_framework import serializers

from customers.models import Customer
from .models import CaseParty, MeratAssessment, StageInstance


def _validate_application_scope(serializer, application):
    request = serializer.context.get("request")
    if not request or not request.user.is_authenticated:
        raise serializers.ValidationError("احراز هویت الزامی است.")
    user = request.user
    role = "system_admin" if user.is_superuser else getattr(getattr(user, "profile", None), "role", None)
    if role in {"intake", "case_worker"} and application.assigned_to_id != user.id:
        raise serializers.ValidationError({"application": "به پرونده انتخاب‌شده دسترسی ندارید."})


class CasePartySerializer(serializers.ModelSerializer):
    person_display = serializers.SerializerMethodField()

    class Meta:
        model = CaseParty
        fields = [
            "id", "application", "person", "person_display", "role",
            "relationship_to_applicant", "membership_status", "account_status",
            "sort_order", "created_at", "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]

    def get_person_display(self, obj):
        return str(obj.person)

    def validate_person(self, value):
        if not Customer.objects.filter(pk=value.pk).exists():
            raise serializers.ValidationError("شخص انتخاب‌شده معتبر نیست.")
        return value

    def validate(self, attrs):
        application = attrs.get("application", getattr(self.instance, "application", None))
        person = attrs.get("person", getattr(self.instance, "person", None))
        role = attrs.get("role", getattr(self.instance, "role", None))
        if application:
            _validate_application_scope(self, application)
        if application and person and role == CaseParty.Role.APPLICANT:
            duplicate = CaseParty.objects.filter(
                application=application, role=CaseParty.Role.APPLICANT,
                membership_status=CaseParty.MembershipStatus.ACTIVE,
            ).exclude(pk=getattr(self.instance, "pk", None))
            if duplicate.exists():
                raise serializers.ValidationError({"role": "هر پرونده فقط یک متقاضی اصلی فعال دارد."})
            if person.pk != application.customer_id:
                raise serializers.ValidationError({"person": "متقاضی اصلی باید همان مشتری اصلی پرونده باشد."})
        if application and role == CaseParty.Role.GUARANTOR and person and person.pk == application.customer_id:
            raise serializers.ValidationError({"person": "مشتری اصلی نمی‌تواند ضامن خودش باشد."})
        return attrs


class StageInstanceSerializer(serializers.ModelSerializer):
    application_number = serializers.CharField(source="application.application_number", read_only=True)
    party_person = serializers.SerializerMethodField()

    class Meta:
        model = StageInstance
        fields = [
            "id", "application", "application_number", "party", "party_person",
            "code", "status", "assigned_to", "started_at", "due_at", "completed_at",
            "outcome", "hold_reason", "evidence_reference", "follow_up_count",
            "created_at", "updated_at",
        ]
        read_only_fields = [
            "id", "status", "started_at", "completed_at", "follow_up_count",
            "created_at", "updated_at",
        ]

    def get_party_person(self, obj):
        return str(obj.party.person) if obj.party_id else None

    def validate(self, attrs):
        if self.instance is not None:
            immutable_fields = ("application", "party", "code")
            changed_fields = [
                field for field in immutable_fields
                if field in attrs and getattr(self.instance, f"{field}_id" if field != "code" else field)
                != getattr(attrs[field], "pk", attrs[field])
            ]
            if changed_fields:
                raise serializers.ValidationError({
                    field: "پس از ایجاد مرحله، پرونده، شخص و نوع مرحله قابل تغییر نیستند."
                    for field in changed_fields
                })
        application = attrs.get("application", getattr(self.instance, "application", None))
        party = attrs.get("party", getattr(self.instance, "party", None))
        code = attrs.get("code", getattr(self.instance, "code", None))
        if application:
            _validate_application_scope(self, application)
        person_codes = {
            StageInstance.Code.DOCUMENTS, StageInstance.Code.ACCOUNT, StageInstance.Code.MERAT,
            StageInstance.Code.DIGITAL_BANKING, StageInstance.Code.E_NOTE,
        }
        if party and application and party.application_id != application.pk:
            raise serializers.ValidationError({"party": "شخص باید متعلق به همین پرونده باشد."})
        if code in person_codes and party is None:
            raise serializers.ValidationError({"party": "این مرحله باید به شخص پرونده متصل باشد."})
        if code not in person_codes and party is not None:
            raise serializers.ValidationError({"party": "این مرحله در سطح کل پرونده اجرا می‌شود."})
        return attrs


class MeratAssessmentSerializer(serializers.ModelSerializer):
    class Meta:
        model = MeratAssessment
        fields = [
            "id", "stage", "requester", "subject", "relationship_to_applicant",
            "submitted_at", "external_reference", "result", "result_reason",
            "reported_limit_rial", "evidence_reference", "recorded_by", "created_at", "updated_at",
        ]
        read_only_fields = ["id", "recorded_by", "created_at", "updated_at"]

    def validate(self, attrs):
        stage = attrs.get("stage", getattr(self.instance, "stage", None))
        requester = attrs.get("requester", getattr(self.instance, "requester", None))
        subject = attrs.get("subject", getattr(self.instance, "subject", None))
        relationship = attrs.get(
            "relationship_to_applicant",
            getattr(self.instance, "relationship_to_applicant", ""),
        )
        if stage and stage.code != StageInstance.Code.MERAT:
            raise serializers.ValidationError({"stage": "ارزیابی باید به مرحله مرآت متصل باشد."})
        if stage:
            _validate_application_scope(self, stage.application)
        if stage and stage.party_id and subject and stage.party.person_id != subject.pk:
            raise serializers.ValidationError({"subject": "شخص موضوع اعتبارسنجی باید با شخص مرحله مرآت یکسان باشد."})
        if stage and stage.application_id:
            active_party_ids = set(stage.application.parties.filter(
                membership_status="active"
            ).values_list("person_id", flat=True))
            if requester and requester.pk not in active_party_ids:
                raise serializers.ValidationError({"requester": "درخواست‌دهنده باید از اشخاص فعال همین پرونده باشد."})
            if subject and subject.pk not in active_party_ids:
                raise serializers.ValidationError({"subject": "شخص موضوع اعتبارسنجی باید از اشخاص فعال همین پرونده باشد."})
        if not relationship.strip():
            raise serializers.ValidationError({"relationship_to_applicant": "ثبت رابطه با مشتری اصلی پرونده الزامی است."})
        return attrs
