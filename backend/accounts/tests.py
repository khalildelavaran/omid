from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework.test import APIClient

from accounts.models import UserProfile

User = get_user_model()


class AccountEndpointTests(TestCase):
    def setUp(self):
        self.password = "Test-12345-Example!"
        self.client = APIClient(enforce_csrf_checks=True)
        self.user = User.objects.create_user(
            username="operator",
            password=self.password,
            is_staff=True,
        )
        UserProfile.objects.create(user=self.user, role=UserProfile.Role.CASE_WORKER)

    def csrf(self):
        response = self.client.get("/api/v1/auth/csrf/")
        self.assertEqual(response.status_code, 200)
        return response.json()["csrfToken"]

    def test_csrf_endpoint_sets_cookie_and_returns_token(self):
        token = self.csrf()
        self.assertTrue(token)
        self.assertIn("csrftoken", self.client.cookies)

    def test_login_rejects_missing_csrf(self):
        response = self.client.post(
            "/api/v1/auth/login/",
            {"username": "operator", "password": self.password},
            format="json",
        )
        self.assertEqual(response.status_code, 403)

    def test_staff_user_with_role_can_login(self):
        token = self.csrf()
        response = self.client.post(
            "/api/v1/auth/login/",
            {"username": "operator", "password": self.password},
            format="json",
            HTTP_X_CSRFTOKEN=token,
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["user"]["role"], UserProfile.Role.CASE_WORKER)

    def test_customer_role_cannot_use_internal_login(self):
        customer = User.objects.create_user(username="customer", password=self.password)
        UserProfile.objects.create(user=customer, role=UserProfile.Role.CUSTOMER)
        token = self.csrf()
        response = self.client.post(
            "/api/v1/auth/login/",
            {"username": "customer", "password": self.password},
            format="json",
            HTTP_X_CSRFTOKEN=token,
        )
        self.assertEqual(response.status_code, 400)

    def test_current_user_requires_authentication(self):
        response = self.client.get("/api/v1/auth/me/")
        self.assertEqual(response.status_code, 403)

    def test_current_user_returns_role(self):
        self.client.force_login(self.user)
        response = self.client.get("/api/v1/auth/me/")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["user"]["role"], UserProfile.Role.CASE_WORKER)

    def test_logout_clears_session(self):
        self.client.force_login(self.user)
        token = self.csrf()
        response = self.client.post(
            "/api/v1/auth/logout/", {}, format="json", HTTP_X_CSRFTOKEN=token
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(self.client.get("/api/v1/auth/me/").status_code, 403)

    def test_password_change_keeps_session_and_clears_first_login_flag(self):
        profile = self.user.profile
        profile.must_change_password = True
        profile.save(update_fields=["must_change_password"])
        self.client.force_login(self.user)
        token = self.csrf()
        response = self.client.post(
            "/api/v1/auth/change-password/",
            {
                "current_password": self.password,
                "new_password": "Different-67890-Strong!",
            },
            format="json",
            HTTP_X_CSRFTOKEN=token,
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(self.client.get("/api/v1/auth/me/").status_code, 200)
        profile.refresh_from_db()
        self.assertFalse(profile.must_change_password)
