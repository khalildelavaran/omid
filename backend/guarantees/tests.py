from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework.test import APIClient

from accounts.models import UserProfile
from applications.models import LoanApplication
from customers.models import Customer
from core.models import AuditEvent
from .models import GuaranteeRequest


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

    def test_invalid_status_filter_is_rejected(self):
        self.client.force_authenticate(self.staff)
        response = self.client.get("/api/v1/guarantees/?status=unknown")
        self.assertEqual(response.status_code, 400)
