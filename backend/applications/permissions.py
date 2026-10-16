from rest_framework.permissions import SAFE_METHODS, BasePermission


class IsStaffApplicationOperator(BasePermission):
    """Role-based access to loan applications and their audit history."""

    write_roles = {"system_admin", "intake", "case_worker"}
    read_roles = write_roles | {"credit_approver", "finance", "auditor"}

    def _role(self, user):
        if user.is_superuser:
            return "system_admin"
        profile = getattr(user, "profile", None)
        return getattr(profile, "role", None)

    def has_permission(self, request, view):
        user = request.user
        if not user or not user.is_authenticated or not user.is_staff:
            return False
        role = self._role(user)
        if role not in self.read_roles:
            return False
        if request.method in SAFE_METHODS or role in self.write_roles:
            return True
        # Credit approvers may submit a narrowly-scoped decision only.
        return (
            role == "credit_approver"
            and request.method == "PATCH"
            and set(request.data.keys()).issubset({"status", "status_note"})
            and "status" in request.data
        )

    def has_object_permission(self, request, view, obj):
        role = self._role(request.user)
        if role == "system_admin":
            return True
        if role in {"intake", "case_worker"}:
            return obj.assigned_to_id == request.user.id
        if role == "credit_approver":
            return (
                request.method in SAFE_METHODS
                or (
                    request.method == "PATCH"
                    and set(request.data.keys()).issubset({"status", "status_note"})
                    and "status" in request.data
                )
            )
        return request.method in SAFE_METHODS
