from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework.test import APIClient

from .models import Customer

User = get_user_model()


class CustomerApiTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.staff_user = User.objects.create_user(
            username="operator", password="a-test-password-123", is_staff=True
        )
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

    def test_staff_user_can_list_customers(self):
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
