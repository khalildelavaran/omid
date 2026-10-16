from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework.test import APIClient

from accounts.models import UserProfile
from .models import Customer

User = get_user_model()


class CustomerApiTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.staff_user = User.objects.create_user(
            username="operator", password="a-test-password-123", is_staff=True
        )
        UserProfile.objects.create(user=self.staff_user, role=UserProfile.Role.CASE_WORKER)
        self.customer = Customer.objects.create(
            customer_number="OM-000001",
            customer_type=Customer.CustomerType.INDIVIDUAL,
            first_name="آزمایشی",
            last_name="نمونه",
            assigned_to=self.staff_user,
        )

    def test_anonymous_user_cannot_list_customers(self):
        response = self.client.get("/api/v1/customers/")
        self.assertEqual(response.status_code, 403)

    def test_staff_user_can_list_assigned_customers(self):
        self.client.force_authenticate(self.staff_user)
        response = self.client.get("/api/v1/customers/")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["count"], 1)

    def test_customer_number_must_be_unique(self):
        self.client.force_authenticate(self.staff_user)
        response = self.client.post(
            "/api/v1/customers/",
            {
                "customer_number": "OM-000001",
                "customer_type": "individual",
                "first_name": "نمونه",
                "last_name": "تکراری",
            },
            format="json",
        )
        self.assertEqual(response.status_code, 400)

    def test_search_supports_persian_digits_and_customer_name(self):
        self.client.force_authenticate(self.staff_user)
        response = self.client.get("/api/v1/customers/?search=OM-۰۰۰۰۰۱")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["count"], 1)

    def test_customer_can_be_archived_without_deletion(self):
        self.client.force_authenticate(self.staff_user)
        response = self.client.post(f"/api/v1/customers/{self.customer.pk}/archive/")
        self.assertEqual(response.status_code, 200)
        self.customer.refresh_from_db()
        self.assertEqual(self.customer.status, Customer.Status.ARCHIVED)
        self.assertTrue(Customer.objects.filter(pk=self.customer.pk).exists())

    def test_customer_hard_delete_is_disabled(self):
        self.client.force_authenticate(self.staff_user)
        response = self.client.delete(f"/api/v1/customers/{self.customer.pk}/")
        self.assertEqual(response.status_code, 405)
        self.assertTrue(Customer.objects.filter(pk=self.customer.pk).exists())

    def test_case_worker_cannot_read_another_workers_customer(self):
        other = User.objects.create_user(username="other", is_staff=True)
        UserProfile.objects.create(user=other, role=UserProfile.Role.CASE_WORKER)
        self.client.force_authenticate(other)
        response = self.client.get(f"/api/v1/customers/{self.customer.pk}/")
        self.assertEqual(response.status_code, 404)

    def test_auditor_can_read_but_cannot_modify_customers(self):
        auditor = User.objects.create_user(username="auditor", is_staff=True)
        UserProfile.objects.create(user=auditor, role=UserProfile.Role.AUDITOR)
        self.client.force_authenticate(auditor)
        self.assertEqual(self.client.get("/api/v1/customers/").status_code, 200)
        response = self.client.patch(
            f"/api/v1/customers/{self.customer.pk}/",
            {"notes": "unauthorized edit"},
            format="json",
        )
        self.assertEqual(response.status_code, 403)

    def test_user_without_business_role_is_denied(self):
        unassigned = User.objects.create_user(username="unassigned", is_staff=True)
        self.client.force_authenticate(unassigned)
        self.assertEqual(self.client.get("/api/v1/customers/").status_code, 403)
