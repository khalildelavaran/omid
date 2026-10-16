from rest_framework.permissions import BasePermission


class CanReadAuditEvents(BasePermission):
    """Only internal system administrators and auditors may inspect audit data."""

    def has_permission(self, request, view):
        user = request.user
        if not user or not user.is_authenticated or not user.is_staff:
            return False
        if user.is_superuser:
            return True
        profile = getattr(user, "profile", None)
        return getattr(profile, "role", None) in {"system_admin", "auditor"}
