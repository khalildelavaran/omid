from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework.test import APIClient

from accounts.models import UserProfile
from core.models import AuditEvent
from customers.models import Customer
from .models import ApplicationEvent, LoanApplication

User = get_user_model()


class LoanApplicationApiTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.staff = User.objects.create_user(username="caseworker", password="test-pass-123", is_staff=True)
        UserProfile.objects.create(user=self.staff, role=UserProfile.Role.CASE_WORKER)
        self.customer = Customer.objects.create(
            customer_number="OM-CUST-0001",
            customer_type=Customer.CustomerType.INDIVIDUAL,
            first_name="آزمایشی",
            last_name="مشتری",
            assigned_to=self.staff,
        )
        self.application = LoanApplication.objects.create(
            application_number="OM-APP-0001",
            customer=self.customer,
            product_type=LoanApplication.ProductType.PERSONAL,
            requested_amount=250000000,
            assigned_to=self.staff,
        )

    def test_anonymous_user_cannot_list_applications(self):
        self.assertEqual(self.client.get("/api/v1/applications/").status_code, 403)

    def test_staff_can_list_assigned_applications(self):
        self.client.force_authenticate(self.staff)
        response = self.client.get("/api/v1/applications/")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["count"], 1)
        self.assertEqual(response.data["results"][0]["application_number"], "OM-APP-0001")

    def test_search_filters_by_application_number(self):
        self.client.force_authenticate(self.staff)
        response = self.client.get("/api/v1/applications/?search=OM-APP-0001")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["count"], 1)

    def test_invalid_customer_uuid_filter_returns_empty_result(self):
        self.client.force_authenticate(self.staff)
        response = self.client.get("/api/v1/applications/?customer=not-a-uuid")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["count"], 0)

    def test_non_positive_amount_is_rejected(self):
        self.client.force_authenticate(self.staff)
        response = self.client.post("/api/v1/applications/", {
            "application_number": "OM-APP-0002",
            "customer": str(self.customer.pk),
            "product_type": "personal",
            "requested_amount": 0,
        }, format="json")
        self.assertEqual(response.status_code, 400)

    def test_application_status_change_is_audited(self):
        self.client.force_authenticate(self.staff)
        response = self.client.patch(
            f"/api/v1/applications/{self.application.pk}/",
            {"status": "awaiting_documents"},
            format="json",
        )
        self.assertEqual(response.status_code, 200)
        event = ApplicationEvent.objects.get(application=self.application, event_type=ApplicationEvent.EventType.STATUS_CHANGED)
        self.assertEqual(event.previous_status, LoanApplication.Status.UNDER_REVIEW)
        self.assertEqual(event.new_status, LoanApplication.Status.AWAITING_DOCUMENTS)
        self.assertEqual(event.actor, self.staff)

    def test_case_worker_cannot_make_final_credit_decision(self):
        self.client.force_authenticate(self.staff)
        self.application.status = LoanApplication.Status.AWAITING_APPROVAL
        self.application.save(update_fields=["status"])
        response = self.client.patch(
            f"/api/v1/applications/{self.application.pk}/",
            {"status": "approved"},
            format="json",
        )
        self.assertEqual(response.status_code, 400)

    def test_rejection_requires_reason_and_persists_it_in_history(self):
        approver = User.objects.create_user(username="reject-approver", is_staff=True)
        UserProfile.objects.create(user=approver, role=UserProfile.Role.CREDIT_APPROVER)
        self.application.status = LoanApplication.Status.AWAITING_APPROVAL
        self.application.save(update_fields=["status"])
        self.client.force_authenticate(approver)

        missing_reason = self.client.patch(
            f"/api/v1/applications/{self.application.pk}/",
            {"status": "rejected"},
            format="json",
        )
        self.assertEqual(missing_reason.status_code, 400)
        self.application.refresh_from_db()
        self.assertEqual(self.application.status, LoanApplication.Status.AWAITING_APPROVAL)

        reason = "شرایط اعتباری درخواست احراز نشد."
        rejected = self.client.patch(
            f"/api/v1/applications/{self.application.pk}/",
            {"status": "rejected", "status_note": reason},
            format="json",
        )
        self.assertEqual(rejected.status_code, 200, rejected.data)
        event = ApplicationEvent.objects.get(
            application=self.application,
            event_type=ApplicationEvent.EventType.STATUS_CHANGED,
            new_status=LoanApplication.Status.REJECTED,
        )
        self.assertEqual(event.note, reason)
        audit = AuditEvent.objects.get(
            action="application.status_changed", entity_id=str(self.application.pk)
        )
        self.assertEqual(audit.metadata["decision_note_length"], len(reason))
        self.assertNotIn(reason, str(audit.metadata))

    def test_credit_approver_can_decide_but_cannot_edit_other_fields(self):
        approver = User.objects.create_user(username="approver", is_staff=True)
        UserProfile.objects.create(user=approver, role=UserProfile.Role.CREDIT_APPROVER)
        self.application.status = LoanApplication.Status.AWAITING_APPROVAL
        self.application.save(update_fields=["status"])
        self.client.force_authenticate(approver)
        decision = self.client.patch(
            f"/api/v1/applications/{self.application.pk}/",
            {"status": "approved", "status_note": "تأیید پس از بررسی"},
            format="json",
        )
        self.assertEqual(decision.status_code, 200)
        edit = self.client.patch(
            f"/api/v1/applications/{self.application.pk}/",
            {"notes": "unauthorized edit"},
            format="json",
        )
        self.assertEqual(edit.status_code, 403)

    def test_invalid_status_transition_is_rejected(self):
        self.client.force_authenticate(self.staff)
        response = self.client.patch(
            f"/api/v1/applications/{self.application.pk}/",
            {"status": "approved"},
            format="json",
        )
        self.assertEqual(response.status_code, 400)
        self.assertFalse(ApplicationEvent.objects.filter(application=self.application, event_type=ApplicationEvent.EventType.STATUS_CHANGED).exists())

    def test_follow_up_note_is_persisted_in_event_history(self):
        self.client.force_authenticate(self.staff)
        response = self.client.post(
            f"/api/v1/applications/{self.application.pk}/notes/",
            {"note": "تماس با مشتری انجام شد."},
            format="json",
        )
        self.assertEqual(response.status_code, 201)
        event = ApplicationEvent.objects.get(application=self.application, event_type=ApplicationEvent.EventType.NOTE_ADDED)
        self.assertEqual(event.note, "تماس با مشتری انجام شد.")
        self.assertEqual(event.actor, self.staff)

    def test_application_note_audit_does_not_copy_note_content(self):
        self.client.force_authenticate(self.staff)
        note = "یادداشت محرمانه نمونه"
        response = self.client.post(
            f"/api/v1/applications/{self.application.pk}/notes/",
            {"note": note},
            format="json",
        )
        self.assertEqual(response.status_code, 201)
        audit = AuditEvent.objects.get(action="application.note_added", entity_id=str(self.application.pk))
        self.assertEqual(audit.metadata["note_length"], len(note))
        self.assertNotIn(note, str(audit.metadata))

    def test_application_creation_is_globally_audited(self):
        self.client.force_authenticate(self.staff)
        response = self.client.post(
            "/api/v1/applications/",
            {
                "application_number": "OM-APP-AUDIT-1",
                "customer": str(self.customer.pk),
                "product_type": "personal",
                "requested_amount": 120000,
            },
            format="json",
        )
        self.assertEqual(response.status_code, 201)
        self.assertTrue(response.data["application_number"].startswith("APP-"))
        self.assertNotEqual(response.data["application_number"], "OM-APP-AUDIT-1")
        audit = AuditEvent.objects.get(action="application.created", entity_id=response.data["id"])
        self.assertEqual(audit.actor, self.staff)

    def test_events_endpoint_returns_history(self):
        self.client.force_authenticate(self.staff)
        ApplicationEvent.objects.create(
            application=self.application,
            event_type=ApplicationEvent.EventType.CREATED,
            new_status=self.application.status,
            actor=self.staff,
        )
        response = self.client.get(f"/api/v1/applications/{self.application.pk}/events/")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data), 1)

    def test_loan_application_hard_delete_is_disabled(self):
        self.client.force_authenticate(self.staff)
        response = self.client.delete(f"/api/v1/applications/{self.application.pk}/")
        self.assertEqual(response.status_code, 405)
        self.assertTrue(LoanApplication.objects.filter(pk=self.application.pk).exists())

    def test_case_worker_cannot_read_another_workers_application(self):
        other = User.objects.create_user(username="other-caseworker", is_staff=True)
        UserProfile.objects.create(user=other, role=UserProfile.Role.CASE_WORKER)
        self.client.force_authenticate(other)
        response = self.client.get(f"/api/v1/applications/{self.application.pk}/")
        self.assertEqual(response.status_code, 404)

    def test_finance_role_is_read_only(self):
        finance = User.objects.create_user(username="finance", is_staff=True)
        UserProfile.objects.create(user=finance, role=UserProfile.Role.FINANCE)
        self.client.force_authenticate(finance)
        self.assertEqual(self.client.get("/api/v1/applications/").status_code, 200)
        response = self.client.post("/api/v1/applications/", {
            "application_number": "OM-APP-NEW",
            "customer": str(self.customer.pk),
            "product_type": "personal",
            "requested_amount": 100000,
        }, format="json")
        self.assertEqual(response.status_code, 403)
