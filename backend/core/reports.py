from decimal import Decimal

from django.db.models import Q, Sum
from django.utils import timezone
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.models import UserProfile
from applications.models import LoanApplication
from customers.models import Customer
from guarantees.models import GuaranteeRequest
from services.models import ServiceRecord
from tasks.models import WorkflowTask


GLOBAL_REPORT_ROLES = {
    UserProfile.Role.SYSTEM_ADMIN,
    UserProfile.Role.CREDIT_APPROVER,
    UserProfile.Role.FINANCE,
    UserProfile.Role.AUDITOR,
}
SCOPED_REPORT_ROLES = {UserProfile.Role.INTAKE, UserProfile.Role.CASE_WORKER}


class OperationsReportView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        if not user.is_staff:
            return Response({"detail": "دسترسی به گزارش‌های عملیاتی مجاز نیست."}, status=403)
        role = UserProfile.Role.SYSTEM_ADMIN if user.is_superuser else getattr(
            getattr(user, "profile", None), "role", None
        )
        if role not in GLOBAL_REPORT_ROLES | SCOPED_REPORT_ROLES:
            return Response({"detail": "دسترسی به گزارش‌های عملیاتی مجاز نیست."}, status=403)

        customers = Customer.objects.all()
        applications = LoanApplication.objects.all()
        tasks = WorkflowTask.objects.all()
        guarantees = GuaranteeRequest.objects.all()
        receipts = ServiceRecord.objects.all()

        if role in SCOPED_REPORT_ROLES:
            customers = customers.filter(assigned_to=user)
            applications = applications.filter(assigned_to=user)
            tasks = tasks.filter(Q(assigned_to=user) | Q(application__assigned_to=user))
            guarantees = guarantees.filter(application__assigned_to=user)
            receipts = receipts.filter(customer__assigned_to=user)

        active_customer = Customer.Status.ACTIVE
        task_terminal = [WorkflowTask.Status.COMPLETED, WorkflowTask.Status.CANCELLED]
        now = timezone.now()
        local_today = timezone.localdate()
        receipt_totals = receipts.aggregate(
            gross=Sum("total"),
            paid=Sum("paid"),
        )
        gross = receipt_totals["gross"] or Decimal("0")
        paid = receipt_totals["paid"] or Decimal("0")

        return Response({
            "generated_at": now.isoformat(),
            "scope": "assigned_records" if role in SCOPED_REPORT_ROLES else "organization",
            "customers": {
                "total": customers.count(),
                "active": customers.filter(status=active_customer).count(),
                "inactive": customers.filter(status=Customer.Status.INACTIVE).count(),
                "archived": customers.filter(status=Customer.Status.ARCHIVED).count(),
            },
            "applications": {
                "total": applications.count(),
                "by_status": {
                    choice: applications.filter(status=choice).count()
                    for choice, _label in LoanApplication.Status.choices
                },
            },
            "tasks": {
                "total": tasks.count(),
                "open": tasks.filter(status=WorkflowTask.Status.OPEN).count(),
                "in_progress": tasks.filter(status=WorkflowTask.Status.IN_PROGRESS).count(),
                "completed": tasks.filter(status=WorkflowTask.Status.COMPLETED).count(),
                "cancelled": tasks.filter(status=WorkflowTask.Status.CANCELLED).count(),
                "overdue": tasks.filter(due_at__lt=now).exclude(status__in=task_terminal).count(),
                "due_today": tasks.filter(due_at__date=local_today).exclude(status__in=task_terminal).count(),
            },
            "guarantees": {
                "total": guarantees.count(),
                "by_status": {
                    choice: guarantees.filter(status=choice).count()
                    for choice, _label in GuaranteeRequest.Status.choices
                },
            },
            "service_receipts": {
                "count": receipts.count(),
                "gross_total": str(gross),
                "paid_total": str(paid),
                "outstanding_total": str(gross - paid),
            },
        })
