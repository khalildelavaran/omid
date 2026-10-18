from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework.test import APIClient

from accounts.models import UserProfile
from customers.models import Customer
from .models import CaseParty, LoanApplication, StageInstance

User = get_user_model()


class TwoLevelWorkflowApiTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.worker = User.objects.create_user(username="workflow-worker", password="test-pass-123", is_staff=True)
        UserProfile.objects.create(user=self.worker, role=UserProfile.Role.CASE_WORKER)
        self.customer = Customer.objects.create(
            customer_number="OM-WF-CUST-1",
            customer_type=Customer.CustomerType.INDIVIDUAL,
            first_name="آزمایشی",
            last_name="متقاضی",
            assigned_to=self.worker,
        )
        self.application = LoanApplication.objects.create(
            customer=self.customer,
            product_type=LoanApplication.ProductType.PERSONAL,
            requested_amount=100000000,
            assigned_to=self.worker,
        )
        self.client.force_authenticate(self.worker)

    def test_creating_party_creates_independent_person_stages(self):
        response = self.client.post("/api/v1/applications/parties/", {
            "application": str(self.application.pk),
            "person": str(self.customer.pk),
            "role": "applicant",
            "membership_status": "active",
            "account_status": "existing_verified",
            "sort_order": 0,
        }, format="json")
        self.assertEqual(response.status_code, 201, response.data)
        party = CaseParty.objects.get(pk=response.data["id"])
        self.assertEqual(
            set(party.stage_instances.values_list("code", flat=True)),
            {
                StageInstance.Code.DOCUMENTS,
                StageInstance.Code.ACCOUNT,
                StageInstance.Code.MERAT,
                StageInstance.Code.DIGITAL_BANKING,
                StageInstance.Code.E_NOTE,
            },
        )
        self.assertTrue(party.stage_instances.filter(code=StageInstance.Code.ACCOUNT).exists())

    def test_loan_submission_is_blocked_until_all_active_parties_are_ready(self):
        party = CaseParty.objects.create(
            application=self.application, person=self.customer,
            role=CaseParty.Role.APPLICANT, account_status=CaseParty.AccountStatus.EXISTING_VERIFIED,
        )
        for code in (
            StageInstance.Code.DOCUMENTS, StageInstance.Code.ACCOUNT, StageInstance.Code.MERAT,
            StageInstance.Code.DIGITAL_BANKING, StageInstance.Code.E_NOTE,
        ):
            StageInstance.objects.create(
                application=self.application, party=party, code=code,
                status=StageInstance.Status.PENDING,
            )
        submission = StageInstance.objects.create(
            application=self.application, code=StageInstance.Code.LOAN_SUBMISSION,
            status=StageInstance.Status.PENDING,
        )
        response = self.client.post(
            f"/api/v1/applications/stages/{submission.pk}/transition/",
            {"action": "start"},
            format="json",
        )
        self.assertEqual(response.status_code, 400)
        submission.refresh_from_db()
        self.assertEqual(submission.status, StageInstance.Status.PENDING)

    def test_case_worker_cannot_bypass_a_stage(self):
        party = CaseParty.objects.create(
            application=self.application, person=self.customer, role=CaseParty.Role.APPLICANT,
        )
        stage = StageInstance.objects.create(
            application=self.application, party=party, code=StageInstance.Code.DOCUMENTS,
            status=StageInstance.Status.PENDING,
        )
        response = self.client.post(
            f"/api/v1/applications/stages/{stage.pk}/transition/",
            {"action": "bypass", "reason": "test"},
            format="json",
        )
        self.assertEqual(response.status_code, 403)
        stage.refresh_from_db()
        self.assertEqual(stage.status, StageInstance.Status.PENDING)

    def test_commission_change_requires_system_admin_and_reason(self):
        response = self.client.post(
            f"/api/v1/applications/{self.application.pk}/commission/",
            {"rate": "22.50", "reason": "موافقت ویژه"},
            format="json",
        )
        self.assertEqual(response.status_code, 403)
        self.application.refresh_from_db()
        self.assertEqual(str(self.application.loan_commission_pct), "25.00")
