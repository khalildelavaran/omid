from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework.test import APIClient

from customers.models import Customer
from .models import ApplicationEvent, LoanApplication

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

    def test_application_status_change_is_audited(self):
        self.client.force_authenticate(self.staff)
        response = self.client.patch(
            f"/api/v1/applications/{self.application.pk}/",
            {"status": "awaiting_documents"},
            format="json",
        )
        self.assertEqual(response.status_code, 200)
        event = ApplicationEvent.objects.get(application=self.application, event_type=ApplicationEvent.EventType.STATUS_CHANGED)
        self.assertEqual(event.previous_status, LoanApplication.Status.UNDER_REVIEW)
        self.assertEqual(event.new_status, LoanApplication.Status.AWAITING_DOCUMENTS)
        self.assertEqual(event.actor, self.staff)

    def test_invalid_status_transition_is_rejected(self):
        self.client.force_authenticate(self.staff)
        response = self.client.patch(
            f"/api/v1/applications/{self.application.pk}/",
            {"status": "approved"},
            format="json",
        )
        self.assertEqual(response.status_code, 400)
        self.assertFalse(ApplicationEvent.objects.filter(application=self.application, event_type=ApplicationEvent.EventType.STATUS_CHANGED).exists())

    def test_follow_up_note_is_persisted_in_event_history(self):
        self.client.force_authenticate(self.staff)
        response = self.client.post(
            f"/api/v1/applications/{self.application.pk}/notes/",
            {"note": "تماس با مشتری انجام شد."},
            format="json",
        )
        self.assertEqual(response.status_code, 201)
        event = ApplicationEvent.objects.get(application=self.application, event_type=ApplicationEvent.EventType.NOTE_ADDED)
        self.assertEqual(event.note, "تماس با مشتری انجام شد.")
        self.assertEqual(event.actor, self.staff)

    def test_events_endpoint_returns_history(self):
        self.client.force_authenticate(self.staff)
        ApplicationEvent.objects.create(
            application=self.application,
            event_type=ApplicationEvent.EventType.CREATED,
            new_status=self.application.status,
            actor=self.staff,
        )
        response = self.client.get(f"/api/v1/applications/{self.application.pk}/events/")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data), 1)
