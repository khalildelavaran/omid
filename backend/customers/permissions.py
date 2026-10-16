from rest_framework.permissions import BasePermission, SAFE_METHODS


class IsStaffCustomerOperator(BasePermission):
    """Initial coarse-grained guard; object-level scopes are a required next step."""

    def has_permission(self, request, view):
        user = request.user
        if not user or not user.is_authenticated:
            return False
        if request.method in SAFE_METHODS:
            return user.is_staff or user.is_superuser
        return user.is_staff or user.is_superuser
