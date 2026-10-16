from django.contrib import admin

from .models import LoanApplication


@admin.register(LoanApplication)
class LoanApplicationAdmin(admin.ModelAdmin):
    list_display = ("application_number", "customer", "product_type", "requested_amount", "status", "assigned_to", "created_at")
    list_filter = ("status", "product_type", "created_at")
    search_fields = ("application_number", "customer__customer_number", "customer__first_name", "customer__last_name", "customer__organization_name")
    readonly_fields = ("id", "created_at", "updated_at")
