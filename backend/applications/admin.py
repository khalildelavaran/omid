from django.contrib import admin

from core.audit import record_audit

from .models import LoanApplication


@admin.register(LoanApplication)
class LoanApplicationAdmin(admin.ModelAdmin):
    list_display = ("application_number", "customer", "product_type", "requested_amount", "status", "assigned_to", "created_at")
    list_filter = ("status", "product_type", "created_at")
    search_fields = ("application_number", "customer__customer_number", "customer__first_name", "customer__last_name", "customer__organization_name")
    readonly_fields = ("id", "created_at", "updated_at", "loan_commission_pct", "commission_override_reason")

    def save_model(self, request, obj, form, change):
        super().save_model(request, obj, form, change)
        record_audit(
            request,
            "admin.application.updated" if change else "admin.application.created",
            actor=request.user,
            entity_type="loan_application",
            entity_id=str(obj.pk),
            metadata={"status": obj.status, "product_type": obj.product_type},
        )

    def has_delete_permission(self, request, obj=None):
        return False
