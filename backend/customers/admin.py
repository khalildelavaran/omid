from django.contrib import admin

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
