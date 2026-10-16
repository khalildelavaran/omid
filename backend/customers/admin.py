from django.contrib import admin

from core.audit import record_audit

from .models import Customer


@admin.register(Customer)
class CustomerAdmin(admin.ModelAdmin):
    list_display = (
        "customer_number",
        "customer_type",
        "last_name",
        "organization_name",
        "phone_number",
        "status",
        "assigned_to",
    )
    list_filter = ("customer_type", "status")
    search_fields = (
        "customer_number",
        "first_name",
        "last_name",
        "organization_name",
        "phone_number",
        "email",
    )
    readonly_fields = ("id", "created_at", "updated_at")

    def save_model(self, request, obj, form, change):
        super().save_model(request, obj, form, change)
        record_audit(
            request,
            "admin.customer.updated" if change else "admin.customer.created",
            actor=request.user,
            entity_type="customer",
            entity_id=str(obj.pk),
            metadata={"customer_type": obj.customer_type, "status": obj.status},
        )

    def has_delete_permission(self, request, obj=None):
        return False
