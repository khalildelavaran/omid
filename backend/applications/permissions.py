from rest_framework.permissions import SAFE_METHODS, BasePermission


class IsStaffApplicationOperator(BasePermission):
    """Initial staff-only guard; role and object-level scopes are still required."""

    def has_permission(self, request, view):
        user = request.user
        return bool(user and user.is_authenticated and (user.is_staff or user.is_superuser))
