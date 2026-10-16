from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework.test import APIClient

from accounts.models import UserProfile
from core.models import AuditEvent


class HealthEndpointTests(TestCase):
    def test_health_returns_ok(self):
        response = self.client.get("/api/v1/health/")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json(), {"status": "ok", "service": "omid-api"})

    def test_health_rejects_non_get(self):
        response = self.client.post("/api/v1/health/")
        self.assertEqual(response.status_code, 405)



class AuditEventApiTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.auditor = get_user_model().objects.create_user(
            username="audit-reader", password="test-password-123", is_staff=True
        )
        UserProfile.objects.create(user=self.auditor, role=UserProfile.Role.AUDITOR)
        self.operator = get_user_model().objects.create_user(
            username="regular-operator", password="test-password-123", is_staff=True
        )
        UserProfile.objects.create(user=self.operator, role=UserProfile.Role.CASE_WORKER)
        AuditEvent.objects.create(action="customer.created", entity_type="customer", entity_id="customer-1")

    def test_anonymous_user_cannot_read_audit_events(self):
        self.assertEqual(self.client.get("/api/v1/audit-events/").status_code, 403)

    def test_auditor_can_read_paginated_audit_events(self):
        self.client.force_authenticate(self.auditor)
        response = self.client.get("/api/v1/audit-events/")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["count"], 1)
        self.assertEqual(response.data["results"][0]["action"], "customer.created")

    def test_non_auditor_cannot_read_audit_events(self):
        self.client.force_authenticate(self.operator)
        self.assertEqual(self.client.get("/api/v1/audit-events/").status_code, 403)

    def test_audit_api_is_read_only(self):
        self.client.force_authenticate(self.auditor)
        response = self.client.delete("/api/v1/audit-events/")
        self.assertEqual(response.status_code, 405)
