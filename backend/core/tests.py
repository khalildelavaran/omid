from datetime import timedelta
from decimal import Decimal

from django.contrib.auth import get_user_model
from django.test import TestCase
from django.utils import timezone
from rest_framework.test import APIClient

from accounts.models import UserProfile
from applications.models import LoanApplication
from customers.models import Customer
from guarantees.models import GuaranteeRequest
from services.models import ServiceCatalogItem, ServiceRecord
from tasks.models import WorkflowTask

from core.models import AuditEvent


class HealthEndpointTests(TestCase):
    def test_health_returns_ok(self):
        response = self.client.get("/api/v1/health/")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json(), {"status": "ok", "service": "omid-api"})

    def test_health_rejects_non_get(self):
        response = self.client.post("/api/v1/health/")
        self.assertEqual(response.status_code, 405)



class AuditEventApiTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.auditor = get_user_model().objects.create_user(
            username="audit-reader", password="test-password-123", is_staff=True
        )
        UserProfile.objects.create(user=self.auditor, role=UserProfile.Role.AUDITOR)
        self.operator = get_user_model().objects.create_user(
            username="regular-operator", password="test-password-123", is_staff=True
        )
        UserProfile.objects.create(user=self.operator, role=UserProfile.Role.CASE_WORKER)
        AuditEvent.objects.create(action="customer.created", entity_type="customer", entity_id="customer-1")

    def test_anonymous_user_cannot_read_audit_events(self):
        self.assertEqual(self.client.get("/api/v1/audit-events/").status_code, 403)

    def test_auditor_can_read_paginated_audit_events(self):
        self.client.force_authenticate(self.auditor)
        response = self.client.get("/api/v1/audit-events/")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["count"], 1)
        self.assertEqual(response.data["results"][0]["action"], "customer.created")

    def test_non_auditor_cannot_read_audit_events(self):
        self.client.force_authenticate(self.operator)
        self.assertEqual(self.client.get("/api/v1/audit-events/").status_code, 403)

    def test_audit_api_is_read_only(self):
        self.client.force_authenticate(self.auditor)
        response = self.client.delete("/api/v1/audit-events/")
        self.assertEqual(response.status_code, 405)

class OperationsReportApiTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.worker = get_user_model().objects.create_user(
            username="report-worker", password="test-password-123", is_staff=True
        )
        UserProfile.objects.create(user=self.worker, role=UserProfile.Role.CASE_WORKER)
        self.other_worker = get_user_model().objects.create_user(
            username="report-other-worker", password="test-password-123", is_staff=True
        )
        UserProfile.objects.create(user=self.other_worker, role=UserProfile.Role.CASE_WORKER)
        self.finance = get_user_model().objects.create_user(
            username="report-finance", password="test-password-123", is_staff=True
        )
        UserProfile.objects.create(user=self.finance, role=UserProfile.Role.FINANCE)

        self.customer = Customer.objects.create(
            customer_type=Customer.CustomerType.INDIVIDUAL,
            first_name="مشتری گزارش",
            last_name="خودم",
            assigned_to=self.worker,
        )
        self.other_customer = Customer.objects.create(
            customer_type=Customer.CustomerType.INDIVIDUAL,
            first_name="مشتری گزارش",
            last_name="دیگر",
            assigned_to=self.other_worker,
        )
        self.application = LoanApplication.objects.create(
            customer=self.customer,
            product_type=LoanApplication.ProductType.PERSONAL,
            requested_amount=1000,
            assigned_to=self.worker,
        )
        self.other_application = LoanApplication.objects.create(
            customer=self.other_customer,
            product_type=LoanApplication.ProductType.PERSONAL,
            requested_amount=2000,
            assigned_to=self.other_worker,
        )
        self.task = WorkflowTask.objects.create(
            application=self.application,
            title="وظیفه گزارش",
            due_at=timezone.now() - timedelta(days=1),
            assigned_to=self.worker,
            created_by=self.worker,
        )
        self.other_task = WorkflowTask.objects.create(
            application=self.other_application,
            title="وظیفه گزارش دیگر",
            assigned_to=self.other_worker,
            created_by=self.other_worker,
        )
        self.guarantee = GuaranteeRequest.objects.create(
            application=self.application,
            created_by=self.worker,
        )
        self.other_guarantee = GuaranteeRequest.objects.create(
            application=self.other_application,
            created_by=self.other_worker,
        )
        self.service = ServiceCatalogItem.objects.create(
            name="خدمت گزارش",
            price=Decimal("100"),
            created_by=self.finance,
        )
        self.own_receipt = ServiceRecord.objects.create(
            customer=self.customer,
            service=self.service,
            price=Decimal("100"),
            discount=Decimal("0"),
            total=Decimal("100"),
            paid=Decimal("60"),
            payment_method=ServiceRecord.PaymentMethod.CASH,
            performed_by=self.worker,
            created_by=self.worker,
        )
        self.other_receipt = ServiceRecord.objects.create(
            customer=self.other_customer,
            service=self.service,
            price=Decimal("200"),
            discount=Decimal("0"),
            total=Decimal("200"),
            paid=Decimal("100"),
            payment_method=ServiceRecord.PaymentMethod.CASH,
            performed_by=self.other_worker,
            created_by=self.other_worker,
        )

    def test_anonymous_and_customer_accounts_cannot_read_operations_report(self):
        self.assertEqual(self.client.get("/api/v1/reports/operations/").status_code, 403)
        customer_user = get_user_model().objects.create_user(
            username="report-customer", password="test-password-123", is_staff=False
        )
        UserProfile.objects.create(user=customer_user, role=UserProfile.Role.CUSTOMER)
        self.client.force_authenticate(customer_user)
        self.assertEqual(self.client.get("/api/v1/reports/operations/").status_code, 403)

    def test_caseworker_report_is_scoped_to_assigned_business_records(self):
        self.client.force_authenticate(self.worker)
        response = self.client.get("/api/v1/reports/operations/")
        self.assertEqual(response.status_code, 200, response.data)
        self.assertEqual(response.data["scope"], "assigned_records")
        self.assertEqual(response.data["customers"]["total"], 1)
        self.assertEqual(response.data["applications"]["total"], 1)
        self.assertEqual(response.data["tasks"]["total"], 1)
        self.assertEqual(response.data["tasks"]["overdue"], 1)
        self.assertEqual(response.data["guarantees"]["total"], 1)
        self.assertEqual(response.data["service_receipts"]["count"], 1)
        self.assertEqual(response.data["service_receipts"]["gross_total"], "100")
        self.assertEqual(response.data["service_receipts"]["paid_total"], "60")
        self.assertEqual(response.data["service_receipts"]["outstanding_total"], "40")

    def test_finance_report_contains_organization_wide_receipt_aggregates(self):
        self.client.force_authenticate(self.finance)
        response = self.client.get("/api/v1/reports/operations/")
        self.assertEqual(response.status_code, 200, response.data)
        self.assertEqual(response.data["scope"], "organization")
        self.assertEqual(response.data["customers"]["total"], 2)
        self.assertEqual(response.data["applications"]["total"], 2)
        self.assertEqual(response.data["tasks"]["total"], 2)
        self.assertEqual(response.data["guarantees"]["total"], 2)
        self.assertEqual(response.data["service_receipts"]["count"], 2)
        self.assertEqual(response.data["service_receipts"]["gross_total"], "300")
        self.assertEqual(response.data["service_receipts"]["paid_total"], "160")
        self.assertEqual(response.data["service_receipts"]["outstanding_total"], "140")

    def test_operations_report_is_read_only(self):
        self.client.force_authenticate(self.finance)
        response = self.client.post("/api/v1/reports/operations/", {}, format="json")
        self.assertEqual(response.status_code, 405)
\n