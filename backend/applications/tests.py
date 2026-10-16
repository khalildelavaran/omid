from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework.test import APIClient

from customers.models import Customer
from .models import LoanApplication

User = get_user_model()


class LoanApplicationApiTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.staff = User.objects.create_user(username="caseworker", password="test-pass-123", is_staff=True)
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
        response = self.client.get("/api/v1/applications/")
        self.assertEqual(response.status_code, 403)

    def test_staff_can_list_applications(self):
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

    def test_non_positive_amount_is_rejected(self):
        self.client.force_authenticate(self.staff)
        response = self.client.post("/api/v1/applications/", {
            "application_number": "OM-APP-0002",
            "customer": str(self.customer.pk),
            "product_type": "personal",
            "requested_amount": 0,
        }, format="json")
        self.assertEqual(response.status_code, 400)
