from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework.test import APIClient

from accounts.models import UserProfile
from customers.models import Customer
from .models import CaseParty, LoanApplication, MeratAssessment, StageInstance

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

    def test_party_and_merat_lists_can_be_scoped_to_one_application(self):
        party = CaseParty.objects.create(
            application=self.application, person=self.customer, role=CaseParty.Role.APPLICANT,
        )
        stage = StageInstance.objects.create(
            application=self.application, party=party, code=StageInstance.Code.MERAT,
            status=StageInstance.Status.PENDING,
        )
        assessment = MeratAssessment.objects.create(
            stage=stage, requester=self.customer, subject=self.customer,
            relationship_to_applicant="خود متقاضی",
        )
        other_customer = Customer.objects.create(
            customer_number="OM-WF-CUST-2", customer_type=Customer.CustomerType.INDIVIDUAL,
            first_name="مشتری", last_name="دوم", assigned_to=self.worker,
        )
        other_application = LoanApplication.objects.create(
            customer=other_customer, product_type=LoanApplication.ProductType.PERSONAL,
            requested_amount=120000000, assigned_to=self.worker,
        )
        other_party = CaseParty.objects.create(
            application=other_application, person=other_customer, role=CaseParty.Role.APPLICANT,
        )
        other_stage = StageInstance.objects.create(
            application=other_application, party=other_party, code=StageInstance.Code.MERAT,
            status=StageInstance.Status.PENDING,
        )
        MeratAssessment.objects.create(
            stage=other_stage, requester=other_customer, subject=other_customer,
            relationship_to_applicant="خود متقاضی",
        )

        parties_response = self.client.get(
            "/api/v1/applications/parties/", {"application": str(self.application.pk)}
        )
        merat_response = self.client.get(
            "/api/v1/applications/merat-assessments/", {"application": str(self.application.pk)}
        )
        self.assertEqual(parties_response.status_code, 200)
        self.assertEqual(merat_response.status_code, 200)
        party_results = parties_response.data.get("results", parties_response.data)
        merat_results = merat_response.data.get("results", merat_response.data)
        self.assertEqual([str(item["id"]) for item in party_results], [str(party.pk)])
        self.assertEqual([str(item["id"]) for item in merat_results], [str(assessment.pk)])

    def test_stage_identity_cannot_be_changed_after_creation(self):
        party = CaseParty.objects.create(
            application=self.application, person=self.customer, role=CaseParty.Role.APPLICANT,
        )
        stage = StageInstance.objects.create(
            application=self.application, party=party, code=StageInstance.Code.DOCUMENTS,
            status=StageInstance.Status.PENDING,
        )
        other_customer = Customer.objects.create(
            customer_number="OM-WF-CUST-IMMUTABLE", customer_type=Customer.CustomerType.INDIVIDUAL,
            first_name="شخص", last_name="دیگر", assigned_to=self.worker,
        )
        response = self.client.patch(
            f"/api/v1/applications/stages/{stage.pk}/",
            {"code": StageInstance.Code.ACCOUNT, "party": str(party.pk)},
            format="json",
        )
        self.assertEqual(response.status_code, 400)
        stage.refresh_from_db()
        self.assertEqual(stage.code, StageInstance.Code.DOCUMENTS)
        self.assertEqual(stage.party_id, party.pk)

    def test_settlement_cannot_complete_before_disbursement_stage(self):
        disbursement = StageInstance.objects.create(
            application=self.application, code=StageInstance.Code.DISBURSEMENT,
            status=StageInstance.Status.PENDING,
        )
        settlement = StageInstance.objects.create(
            application=self.application, code=StageInstance.Code.SETTLEMENT,
            status=StageInstance.Status.IN_PROGRESS,
        )
        response = self.client.post(
            f"/api/v1/applications/stages/{settlement.pk}/transition/",
            {"action": "complete"},
            format="json",
        )
        self.assertEqual(response.status_code, 400)
        settlement.refresh_from_db()
        self.assertEqual(settlement.status, StageInstance.Status.IN_PROGRESS)
        self.assertEqual(disbursement.status, StageInstance.Status.PENDING)

    def test_handover_cannot_start_before_settlement_stage(self):
        StageInstance.objects.create(
            application=self.application, code=StageInstance.Code.SETTLEMENT,
            status=StageInstance.Status.PENDING,
        )
        handover = StageInstance.objects.create(
            application=self.application, code=StageInstance.Code.HANDOVER,
            status=StageInstance.Status.PENDING,
        )
        response = self.client.post(
            f"/api/v1/applications/stages/{handover.pk}/transition/",
            {"action": "start"},
            format="json",
        )
        self.assertEqual(response.status_code, 400)
        handover.refresh_from_db()
        self.assertEqual(handover.status, StageInstance.Status.PENDING)

    def test_handover_cannot_complete_before_settlement_stage(self):
        settlement = StageInstance.objects.create(
            application=self.application, code=StageInstance.Code.SETTLEMENT,
            status=StageInstance.Status.PENDING,
        )
        handover = StageInstance.objects.create(
            application=self.application, code=StageInstance.Code.HANDOVER,
            status=StageInstance.Status.IN_PROGRESS,
        )
        response = self.client.post(
            f"/api/v1/applications/stages/{handover.pk}/transition/",
            {"action": "complete"},
            format="json",
        )
        self.assertEqual(response.status_code, 400)
        handover.refresh_from_db()
        self.assertEqual(handover.status, StageInstance.Status.IN_PROGRESS)
        self.assertEqual(settlement.status, StageInstance.Status.PENDING)

    def test_account_stage_completion_saves_required_opening_evidence(self):
        party = CaseParty.objects.create(
            application=self.application, person=self.customer, role=CaseParty.Role.APPLICANT,
            account_status=CaseParty.AccountStatus.NEEDS_OPENING,
        )
        stage = StageInstance.objects.create(
            application=self.application, party=party, code=StageInstance.Code.ACCOUNT,
            status=StageInstance.Status.IN_PROGRESS,
        )
        response = self.client.post(
            f"/api/v1/applications/stages/{stage.pk}/transition/",
            {"action": "complete", "evidence_reference": "ACCOUNT-OPENING-DOC-001"},
            format="json",
        )
        self.assertEqual(response.status_code, 200, response.data)
        stage.refresh_from_db()
        self.assertEqual(stage.status, StageInstance.Status.COMPLETED)
        self.assertEqual(stage.evidence_reference, "ACCOUNT-OPENING-DOC-001")

    def test_account_stage_cannot_complete_without_opening_evidence(self):
        party = CaseParty.objects.create(
            application=self.application, person=self.customer, role=CaseParty.Role.APPLICANT,
            account_status=CaseParty.AccountStatus.NEEDS_OPENING,
        )
        stage = StageInstance.objects.create(
            application=self.application, party=party, code=StageInstance.Code.ACCOUNT,
            status=StageInstance.Status.IN_PROGRESS,
        )
        response = self.client.post(
            f"/api/v1/applications/stages/{stage.pk}/transition/",
            {"action": "complete"},
            format="json",
        )
        self.assertEqual(response.status_code, 400)
        stage.refresh_from_db()
        self.assertEqual(stage.status, StageInstance.Status.IN_PROGRESS)

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

    def test_system_admin_can_change_commission_with_reason(self):
        admin = User.objects.create_user(username="workflow-admin", password="test-pass-123", is_staff=True)
        UserProfile.objects.create(user=admin, role=UserProfile.Role.SYSTEM_ADMIN)
        self.client.force_authenticate(admin)
        response = self.client.post(
            f"/api/v1/applications/{self.application.pk}/commission/",
            {"rate": "22.50", "reason": "توافق مدیریتی برای این پرونده"},
            format="json",
        )
        self.assertEqual(response.status_code, 200, response.data)
        self.application.refresh_from_db()
        self.assertEqual(str(self.application.loan_commission_pct), "22.50")
        self.assertEqual(self.application.commission_override_reason, "توافق مدیریتی برای این پرونده")

    def test_commission_change_requires_a_reason(self):
        admin = User.objects.create_user(username="workflow-admin-no-reason", password="test-pass-123", is_staff=True)
        UserProfile.objects.create(user=admin, role=UserProfile.Role.SYSTEM_ADMIN)
        self.client.force_authenticate(admin)
        response = self.client.post(
            f"/api/v1/applications/{self.application.pk}/commission/",
            {"rate": "20.00", "reason": ""},
            format="json",
        )
        self.assertEqual(response.status_code, 400)
        self.application.refresh_from_db()
        self.assertEqual(str(self.application.loan_commission_pct), "25.00")
