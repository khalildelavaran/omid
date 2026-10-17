from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework.test import APIClient

from accounts.models import UserProfile
from applications.models import LoanApplication
from customers.models import Customer
from core.models import AuditEvent
from .models import GuaranteeRequest, GuaranteeRequestEvent


User = get_user_model()


class GuaranteeRequestApiTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.staff = User.objects.create_user(
            username="guarantee-worker", password="test-password-123", is_staff=True
        )
        UserProfile.objects.create(user=self.staff, role=UserProfile.Role.CASE_WORKER)
        self.borrower = Customer.objects.create(
            customer_type=Customer.CustomerType.INDIVIDUAL,
            first_name="وام‌گیرنده",
            last_name="نمونه",
            assigned_to=self.staff,
        )
        self.requester = Customer.objects.create(
            customer_type=Customer.CustomerType.INDIVIDUAL,
            first_name="درخواست‌دهنده",
            last_name="جداگانه",
            assigned_to=self.staff,
        )
        self.application = LoanApplication.objects.create(
            customer=self.borrower,
            product_type=LoanApplication.ProductType.PERSONAL,
            requested_amount=250000,
            assigned_to=self.staff,
        )

    def payload(self, requester=None):
        data = {
            "application": str(self.application.pk),
            "note": "درخواست صدور ضمانت",
        }
        if requester is not None:
            data["requester_customer"] = str(requester.pk)
        return data

    def test_anonymous_user_cannot_read_or_create_guarantee_requests(self):
        self.assertEqual(self.client.get("/api/v1/guarantees/").status_code, 403)
        response = self.client.post("/api/v1/guarantees/", self.payload(), format="json")
        self.assertEqual(response.status_code, 403)

    def test_request_can_be_created_with_a_different_requester_customer(self):
        self.client.force_authenticate(self.staff)
        response = self.client.post(
            "/api/v1/guarantees/",
            self.payload(self.requester),
            format="json",
        )
        self.assertEqual(response.status_code, 201, response.data)
        self.assertTrue(response.data["request_number"].startswith("GR-"))
        self.assertEqual(str(response.data["application"]), str(self.application.pk))
        self.assertEqual(str(response.data["requester_customer"]), str(self.requester.pk))
        self.assertEqual(response.data["loan_customer_name"], str(self.borrower))
        self.assertEqual(response.data["requester_customer_name"], str(self.requester))
        self.assertEqual(response.data["status"], GuaranteeRequest.Status.REGISTERED)
        request = GuaranteeRequest.objects.get(pk=response.data["id"])
        self.assertEqual(request.created_by, self.staff)
        self.assertTrue(
            AuditEvent.objects.filter(
                action="guarantee_request.created",
                entity_id=str(request.pk),
                actor=self.staff,
            ).exists()
        )

    def test_requester_customer_is_optional(self):
        self.client.force_authenticate(self.staff)
        response = self.client.post(
            "/api/v1/guarantees/",
            self.payload(),
            format="json",
        )
        self.assertEqual(response.status_code, 201, response.data)
        self.assertIsNone(response.data["requester_customer"])
        self.assertEqual(response.data["requester_customer_name"], "")

    def test_worker_cannot_create_request_for_unassigned_application(self):
        other = User.objects.create_user(
            username="other-guarantee-worker", password="test-password-123", is_staff=True
        )
        UserProfile.objects.create(user=other, role=UserProfile.Role.CASE_WORKER)
        self.client.force_authenticate(other)
        response = self.client.post(
            "/api/v1/guarantees/",
            self.payload(),
            format="json",
        )
        self.assertEqual(response.status_code, 400)
        self.assertEqual(GuaranteeRequest.objects.count(), 0)

    def test_worker_cannot_use_unassigned_customer_as_requester(self):
        other = User.objects.create_user(
            username="guarantee-requester-owner", password="test-password-123", is_staff=True
        )
        UserProfile.objects.create(user=other, role=UserProfile.Role.CASE_WORKER)
        outsider = Customer.objects.create(
            customer_type=Customer.CustomerType.INDIVIDUAL,
            first_name="خارج از دامنه",
            last_name="دسترسی",
            assigned_to=other,
        )
        self.client.force_authenticate(self.staff)
        response = self.client.post(
            "/api/v1/guarantees/",
            self.payload(outsider),
            format="json",
        )
        self.assertEqual(response.status_code, 400)
        self.assertEqual(GuaranteeRequest.objects.count(), 0)

    def test_worker_can_only_list_requests_for_assigned_applications(self):
        accessible = GuaranteeRequest.objects.create(
            application=self.application,
            requester_customer=self.requester,
            created_by=self.staff,
        )
        other = User.objects.create_user(
            username="other-guarantee-list-owner", password="test-password-123", is_staff=True
        )
        UserProfile.objects.create(user=other, role=UserProfile.Role.CASE_WORKER)
        other_customer = Customer.objects.create(
            customer_type=Customer.CustomerType.INDIVIDUAL,
            first_name="مشتری دیگر",
            last_name="نمونه",
            assigned_to=other,
        )
        other_app = LoanApplication.objects.create(
            customer=other_customer,
            product_type=LoanApplication.ProductType.PERSONAL,
            requested_amount=120000,
            assigned_to=other,
        )
        GuaranteeRequest.objects.create(application=other_app, created_by=other)

        self.client.force_authenticate(self.staff)
        response = self.client.get("/api/v1/guarantees/")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["count"], 1)
        self.assertEqual(response.data["results"][0]["id"], str(accessible.pk))

    def test_guarantee_requests_cannot_be_updated_or_deleted_via_api(self):
        request = GuaranteeRequest.objects.create(
            application=self.application,
            created_by=self.staff,
        )
        self.client.force_authenticate(self.staff)
        deleted = self.client.delete(f"/api/v1/guarantees/{request.pk}/")
        self.assertEqual(deleted.status_code, 405)
        updated = self.client.patch(
            f"/api/v1/guarantees/{request.pk}/",
            {"status": "approved"},
            format="json",
        )
        self.assertEqual(updated.status_code, 405)
        request.refresh_from_db()
        self.assertEqual(request.status, GuaranteeRequest.Status.REGISTERED)
        with self.assertRaises(ValueError):
            GuaranteeRequest.objects.filter(pk=request.pk).delete()

    def test_guarantee_status_transition_is_role_separated_and_audited(self):
        self.client.force_authenticate(self.staff)
        created = self.client.post(
            "/api/v1/guarantees/", self.payload(), format="json"
        )
        self.assertEqual(created.status_code, 201, created.data)
        guarantee_id = created.data["id"]

        review = self.client.post(
            f"/api/v1/guarantees/{guarantee_id}/transition/",
            {"status": GuaranteeRequest.Status.UNDER_REVIEW},
            format="json",
        )
        self.assertEqual(review.status_code, 200, review.data)
        self.assertEqual(review.data["status"], GuaranteeRequest.Status.UNDER_REVIEW)

        # Even system administration cannot bypass credit approval authority.
        admin = User.objects.create_user(
            username="guarantee-system-admin", password="test-password-123", is_staff=True
        )
        UserProfile.objects.create(user=admin, role=UserProfile.Role.SYSTEM_ADMIN)
        self.client.force_authenticate(admin)
        bypass = self.client.post(
            f"/api/v1/guarantees/{guarantee_id}/transition/",
            {"status": GuaranteeRequest.Status.APPROVED},
            format="json",
        )
        self.assertEqual(bypass.status_code, 400)

        approver = User.objects.create_user(
            username="guarantee-approver", password="test-password-123", is_staff=True
        )
        UserProfile.objects.create(user=approver, role=UserProfile.Role.CREDIT_APPROVER)
        self.client.force_authenticate(approver)
        reason = "شرایط ضمانت پس از بررسی احراز نشد."
        missing_reason = self.client.post(
            f"/api/v1/guarantees/{guarantee_id}/transition/",
            {"status": GuaranteeRequest.Status.REJECTED},
            format="json",
        )
        self.assertEqual(missing_reason.status_code, 400)
        rejected = self.client.post(
            f"/api/v1/guarantees/{guarantee_id}/transition/",
            {"status": GuaranteeRequest.Status.REJECTED, "reason": reason},
            format="json",
        )
        self.assertEqual(rejected.status_code, 200, rejected.data)
        self.assertEqual(rejected.data["status"], GuaranteeRequest.Status.REJECTED)

        event = GuaranteeRequestEvent.objects.get(
            guarantee_request_id=guarantee_id,
            event_type=GuaranteeRequestEvent.EventType.STATUS_CHANGED,
            new_status=GuaranteeRequest.Status.REJECTED,
        )
        self.assertEqual(event.note, reason)
        self.assertEqual(event.actor, approver)
        audit = AuditEvent.objects.get(
            action="guarantee_request.status_changed",
            entity_id=guarantee_id,
        )
        self.assertEqual(audit.metadata["reason_length"], len(reason))
        self.assertNotIn(reason, str(audit.metadata))

    def test_approved_guarantee_can_be_fulfilled_by_finance_and_history_is_readable(self):
        self.client.force_authenticate(self.staff)
        created = self.client.post(
            "/api/v1/guarantees/", self.payload(), format="json"
        )
        self.assertEqual(created.status_code, 201, created.data)
        guarantee_id = created.data["id"]
        self.client.post(
            f"/api/v1/guarantees/{guarantee_id}/transition/",
            {"status": GuaranteeRequest.Status.UNDER_REVIEW},
            format="json",
        )

        approver = User.objects.create_user(
            username="guarantee-approve-fulfill", password="test-password-123", is_staff=True
        )
        UserProfile.objects.create(user=approver, role=UserProfile.Role.CREDIT_APPROVER)
        self.client.force_authenticate(approver)
        approved = self.client.post(
            f"/api/v1/guarantees/{guarantee_id}/transition/",
            {"status": GuaranteeRequest.Status.APPROVED},
            format="json",
        )
        self.assertEqual(approved.status_code, 200, approved.data)

        finance = User.objects.create_user(
            username="guarantee-finance", password="test-password-123", is_staff=True
        )
        UserProfile.objects.create(user=finance, role=UserProfile.Role.FINANCE)
        self.client.force_authenticate(finance)
        fulfilled = self.client.post(
            f"/api/v1/guarantees/{guarantee_id}/transition/",
            {"status": GuaranteeRequest.Status.FULFILLED},
            format="json",
        )
        self.assertEqual(fulfilled.status_code, 200, fulfilled.data)
        self.assertEqual(fulfilled.data["status"], GuaranteeRequest.Status.FULFILLED)

        history = self.client.get(f"/api/v1/guarantees/{guarantee_id}/events/")
        self.assertEqual(history.status_code, 200)
        self.assertEqual(len(history.data), 4)
        self.assertEqual(history.data[0]["event_type"], GuaranteeRequestEvent.EventType.CREATED)
        self.assertEqual(history.data[-1]["new_status"], GuaranteeRequest.Status.FULFILLED)

    def test_guarantee_event_history_is_append_only(self):
        guarantee = GuaranteeRequest.objects.create(
            application=self.application,
            created_by=self.staff,
        )
        event = GuaranteeRequestEvent.objects.create(
            guarantee_request=guarantee,
            event_type=GuaranteeRequestEvent.EventType.CREATED,
            new_status=GuaranteeRequest.Status.REGISTERED,
            actor=self.staff,
        )
        event.note = "tampered"
        with self.assertRaises(ValueError):
            event.save()
        with self.assertRaises(ValueError):
            event.delete()
        with self.assertRaises(ValueError):
            GuaranteeRequestEvent.objects.filter(pk=event.pk).update(note="tampered")
        with self.assertRaises(ValueError):
            GuaranteeRequestEvent.objects.filter(pk=event.pk).delete()

    def test_invalid_status_filter_is_rejected(self):
        self.client.force_authenticate(self.staff)
        response = self.client.get("/api/v1/guarantees/?status=unknown")
        self.assertEqual(response.status_code, 400)
