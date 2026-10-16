from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework.test import APIClient

from accounts.models import UserProfile

User = get_user_model()


class AccountEndpointTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(
            username="operator",
            password="Test-12345-Example!",
            is_staff=True,
        )
        UserProfile.objects.create(user=self.user, role=UserProfile.Role.CASE_WORKER)

    def test_csrf_endpoint_returns_token(self):
        response = self.client.get("/api/v1/auth/csrf/")
        self.assertEqual(response.status_code, 200)
        self.assertIn("csrfToken", response.data if hasattr(response, "data") else response.json())

    def test_current_user_requires_authentication(self):
        response = self.client.get("/api/v1/auth/me/")
        self.assertEqual(response.status_code, 403)

    def test_current_user_returns_role(self):
        self.client.force_authenticate(self.user)
        response = self.client.get("/api/v1/auth/me/")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["user"]["role"], UserProfile.Role.CASE_WORKER)

    def test_customer_role_cannot_access_internal_login(self):
        customer = User.objects.create_user(username="customer", password="Test-12345-Example!")
        UserProfile.objects.create(user=customer, role=UserProfile.Role.CUSTOMER)
        response = self.client.post(
            "/api/v1/auth/login/",
            {"username": "customer", "password": "Test-12345-Example!"},
            format="json",
        )
        self.assertEqual(response.status_code, 400)
