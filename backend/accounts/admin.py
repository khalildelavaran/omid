from django.contrib import admin

from core.audit import record_audit

from .models import UserProfile


@admin.register(UserProfile)
class UserProfileAdmin(admin.ModelAdmin):
    list_display = ("user", "role", "must_change_password", "updated_at")
    list_filter = ("role", "must_change_password")
    search_fields = ("user__username", "user__email", "phone_number")
    readonly_fields = ("created_at", "updated_at")

    def save_model(self, request, obj, form, change):
        previous_role = None
        if change:
            previous_role = UserProfile.objects.filter(pk=obj.pk).values_list("role", flat=True).first()
        super().save_model(request, obj, form, change)
        record_audit(
            request,
            "admin.user_role.updated" if change else "admin.user_role.created",
            actor=request.user,
            entity_type="user_profile",
            entity_id=str(obj.pk),
            metadata={"previous_role": previous_role, "new_role": obj.role},
        )

    def has_delete_permission(self, request, obj=None):
        return False
