from rest_framework.permissions import BasePermission, IsAuthenticated
from rest_framework.schemas import get_schema_view

from accounts.models import UserProfile


class CanReadApiSchema(BasePermission):
    """Restrict machine-readable API documentation to internal staff roles."""

    allowed_roles = {
        UserProfile.Role.SYSTEM_ADMIN,
        UserProfile.Role.INTAKE,
        UserProfile.Role.CASE_WORKER,
        UserProfile.Role.CREDIT_APPROVER,
        UserProfile.Role.FINANCE,
        UserProfile.Role.AUDITOR,
    }

    def has_permission(self, request, view):
        user = request.user
        if not user or not user.is_authenticated or not user.is_staff:
            return False
        if user.is_superuser:
            return True
        return getattr(getattr(user, "profile", None), "role", None) in self.allowed_roles


openapi_schema_view = get_schema_view(
    title="Omid CRM API",
    description=(
        "API for staff identity, customers, loan applications, workflow tasks, "
        "private documents, guarantee requests, service receipts, audit events, "
        "and operational reports."
    ),
    version="1.0.0",
    public=True,
    permission_classes=[IsAuthenticated, CanReadApiSchema],
)
