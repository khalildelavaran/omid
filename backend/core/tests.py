from django.test import TestCase


class HealthEndpointTests(TestCase):
    def test_health_returns_ok(self):
        response = self.client.get("/api/v1/health/")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json(), {"status": "ok", "service": "omid-api"})

    def test_health_rejects_non_get(self):
        response = self.client.post("/api/v1/health/")
        self.assertEqual(response.status_code, 405)
