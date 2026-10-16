from rest_framework.permissions import SAFE_METHODS, BasePermission


class IsStaffServiceCatalogOperator(BasePermission):
    read_roles = {"system_admin", "intake", "case_worker", "credit_approver", "finance", "auditor"}

    def _role(self, user):
        if user.is_superuser:
            return "system_admin"
        return getattr(getattr(user, "profile", None), "role", None)

    def has_permission(self, request, view):
        user = request.user
        if not user or not user.is_authenticated or not user.is_staff:
            return False
        role = self._role(user)
        if role not in self.read_roles:
            return False
        return request.method in SAFE_METHODS or role == "system_admin"

    def has_object_permission(self, request, view, obj):
        if request.method in SAFE_METHODS:
            return True
        return self._role(request.user) == "system_admin"


class IsStaffServiceReceiptOperator(BasePermission):
    read_roles = {"system_admin", "intake", "case_worker", "credit_approver", "finance", "auditor"}
    write_roles = {"system_admin", "intake", "case_worker", "finance"}

    def _role(self, user):
        if user.is_superuser:
            return "system_admin"
        return getattr(getattr(user, "profile", None), "role", None)

    def has_permission(self, request, view):
        user = request.user
        if not user or not user.is_authenticated or not user.is_staff:
            return False
        role = self._role(user)
        if role not in self.read_roles:
            return False
        return request.method in SAFE_METHODS or role in self.write_roles

    def has_object_permission(self, request, view, obj):
        role = self._role(request.user)
        if role == "system_admin":
            return True
        if role in {"intake", "case_worker"}:
            return obj.customer.assigned_to_id == request.user.id
        return request.method in SAFE_METHODS
