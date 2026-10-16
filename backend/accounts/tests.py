from django.contrib.auth import get_user_model
from django.core.cache import cache
from django.test import TestCase, override_settings
from rest_framework.test import APIClient

from accounts.models import UserProfile
from core.models import AuditEvent

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

    def test_successful_login_is_audited_without_credentials(self):
        token = self.csrf()
        response = self.client.post(
            "/api/v1/auth/login/",
            {"username": "operator", "password": self.password},
            format="json",
            HTTP_X_CSRFTOKEN=token,
            HTTP_X_REQUEST_ID="req-test-123",
        )
        self.assertEqual(response.status_code, 200)
        event = AuditEvent.objects.get(action="auth.login", outcome="success")
        self.assertEqual(event.actor, self.user)
        self.assertEqual(event.request_id, "req-test-123")
        self.assertNotIn("password", event.metadata)

    def test_failed_login_is_audited_without_raw_username(self):
        token = self.csrf()
        response = self.client.post(
            "/api/v1/auth/login/",
            {"username": "secret-user-name", "password": "incorrect"},
            format="json",
            HTTP_X_CSRFTOKEN=token,
        )
        self.assertEqual(response.status_code, 400)
        event = AuditEvent.objects.get(action="auth.login", outcome="failure")
        self.assertNotEqual(event.entity_id, "secret-user-name")
        self.assertEqual(event.metadata["reason"], "invalid_credentials_or_role")

    def test_audit_events_cannot_be_updated_or_deleted_via_model(self):
        event = AuditEvent.objects.create(action="test.event")
        event.action = "tampered"
        with self.assertRaises(ValueError):
            event.save()
        with self.assertRaises(ValueError):
            event.delete()

    @override_settings(REST_FRAMEWORK={"DEFAULT_THROTTLE_RATES": {"login": "2/minute", "login_ip": "20/minute"}})
    def test_login_is_rate_limited(self):
        cache.clear()
        token = self.csrf()
        for _ in range(2):
            response = self.client.post(
                "/api/v1/auth/login/",
                {"username": "operator", "password": "incorrect"},
                format="json",
                HTTP_X_CSRFTOKEN=token,
            )
            self.assertEqual(response.status_code, 400)
        limited = self.client.post(
            "/api/v1/auth/login/",
            {"username": "operator", "password": "incorrect"},
            format="json",
            HTTP_X_CSRFTOKEN=token,
        )
        self.assertEqual(limited.status_code, 429)
        cache.clear()
