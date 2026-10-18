from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework.test import APIClient

from accounts.models import UserProfile
from applications.models import Disbursement, LoanApplication, StageInstance
from customers.models import Customer

User = get_user_model()


class DisbursementApiTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.worker = User.objects.create_user(username="disbursement-worker", is_staff=True)
        UserProfile.objects.create(user=self.worker, role=UserProfile.Role.CASE_WORKER)
        self.finance = User.objects.create_user(username="disbursement-finance", is_staff=True)
        UserProfile.objects.create(user=self.finance, role=UserProfile.Role.FINANCE)
        self.customer = Customer.objects.create(
            customer_type=Customer.CustomerType.INDIVIDUAL,
            first_name="واریز", last_name="آزمایشی", assigned_to=self.worker,
        )
        self.application = LoanApplication.objects.create(
            customer=self.customer,
            product_type=LoanApplication.ProductType.PERSONAL,
            requested_amount=200000000,
            assigned_to=self.worker,
            loan_commission_pct="22.50",
        )
        self.stage = StageInstance.objects.create(
            application=self.application,
            code=StageInstance.Code.DISBURSEMENT,
            status=StageInstance.Status.IN_PROGRESS,
        )

    def test_commission_is_calculated_from_confirmed_actual_disbursement(self):
        self.client.force_authenticate(self.worker)
        created = self.client.post(
            "/api/v1/applications/disbursements/",
            {"application": str(self.application.pk), "amount_rial": 200000000},
            format="json",
        )
        self.assertEqual(created.status_code, 201, created.data)
        self.assertEqual(created.data["status"], "pending")
        self.assertEqual(str(created.data["commission_amount_rial"]), "0")

        self.client.force_authenticate(self.finance)
        confirmed = self.client.post(
            f"/api/v1/applications/disbursements/{created.data['id']}/confirm/",
            {"bank_reference": "BANK-REF-1001", "evidence_reference": "document://proof-1"},
            format="json",
        )
        self.assertEqual(confirmed.status_code, 200, confirmed.data)
        self.assertEqual(confirmed.data["status"], "confirmed")
        self.assertEqual(str(confirmed.data["commission_rate_pct"]), "22.50")
        self.assertEqual(str(confirmed.data["commission_amount_rial"]), "45000000")
        self.assertIsNotNone(confirmed.data["confirmed_at"])

        record = Disbursement.objects.get(pk=created.data["id"])
        with self.assertRaises(ValueError):
            record.save()

    def test_finance_cannot_confirm_without_bank_reference(self):
        self.client.force_authenticate(self.worker)
        created = self.client.post(
            "/api/v1/applications/disbursements/",
            {"application": str(self.application.pk), "amount_rial": 1000000},
            format="json",
        )
        self.assertEqual(created.status_code, 201, created.data)
        self.client.force_authenticate(self.finance)
        response = self.client.post(
            f"/api/v1/applications/disbursements/{created.data['id']}/confirm/",
            {"bank_reference": " ", "evidence_reference": ""},
            format="json",
        )
        self.assertEqual(response.status_code, 400)
        record = Disbursement.objects.get(pk=created.data["id"])
        self.assertEqual(record.status, Disbursement.Status.PENDING)
