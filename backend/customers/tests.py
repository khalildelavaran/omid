from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework.test import APIClient

from accounts.models import UserProfile
from core.models import AuditEvent
from .models import Customer, CustomerAddress, CustomerPhone

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

    def test_customer_number_is_generated_by_server(self):
        self.client.force_authenticate(self.staff_user)
        response = self.client.post(
            "/api/v1/customers/",
            {
                "customer_number": "OM-000001",
                "customer_type": "individual",
                "first_name": "نمونه",
                "last_name": "جدید",
            },
            format="json",
        )
        self.assertEqual(response.status_code, 201)
        self.assertTrue(response.data["customer_number"].startswith("CUST-"))
        self.assertNotEqual(response.data["customer_number"], "OM-000001")

    def test_search_supports_persian_digits_and_customer_name(self):
        self.client.force_authenticate(self.staff_user)
        response = self.client.get("/api/v1/customers/?search=OM-۰۰۰۰۰۱")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["count"], 1)

    def test_extended_profile_fields_and_review_status_round_trip(self):
        self.client.force_authenticate(self.staff_user)
        response = self.client.patch(
            f"/api/v1/customers/{self.customer.pk}/",
            {
                "national_id": "۰۰۱۲۳۴۵۶۷۸",
                "birth_date": "1990-02-03",
                "father_name": "نمونه",
                "occupation": "کارمند",
                "postal_code": "00123",
                "sana_verified": True,
                "status": "needs_review",
            },
            format="json",
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["national_id"], "0012345678")
        self.assertEqual(response.data["birth_date"], "1990-02-03")
        self.assertEqual(response.data["father_name"], "نمونه")
        self.assertEqual(response.data["occupation"], "کارمند")
        self.assertEqual(response.data["postal_code"], "00123")
        self.assertTrue(response.data["sana_verified"])
        self.assertEqual(response.data["status"], "needs_review")

        self.customer.refresh_from_db()
        self.assertEqual(self.customer.national_id, "0012345678")
        self.assertEqual(self.customer.status, Customer.Status.NEEDS_REVIEW)

    def test_national_id_rejects_non_digit_characters(self):
        self.client.force_authenticate(self.staff_user)
        response = self.client.patch(
            f"/api/v1/customers/{self.customer.pk}/",
            {"national_id": "12A45"},
            format="json",
        )
        self.assertEqual(response.status_code, 400)
        self.assertIn("national_id", response.data)

    def test_addresses_and_phones_round_trip_and_archive_without_delete(self):
        self.client.force_authenticate(self.staff_user)
        response = self.client.patch(
            f"/api/v1/customers/{self.customer.pk}/",
            {
                "addresses": [
                    {"title": "خانه", "value": "تهران، خیابان نمونه", "postal_code": "۱۲۳۴۵۶۷۸۹۰"}
                ],
                "phones": [
                    {"title": "همراه اصلی", "number": "۰۹۱۲۱۲۳۴۵۶۷"},
                    {"title": "محل کار", "number": "۰۲۱۱۲۳۴۵۶۷۸"},
                ],
            },
            format="json",
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data["addresses"]), 1)
        self.assertEqual(response.data["addresses"][0]["value"], "تهران، خیابان نمونه")
        self.assertEqual(response.data["addresses"][0]["postal_code"], "۱۲۳۴۵۶۷۸۹۰")
        self.assertEqual(len(response.data["phones"]), 2)
        phone_ids_by_number = {item["number"]: item["id"] for item in response.data["phones"]}
        self.assertEqual(set(phone_ids_by_number), {"09121234567", "02112345678"})
        self.assertEqual(response.data["phone_number"], "09121234567")
        search_by_secondary_phone = self.client.get("/api/v1/customers/?search=۰۲۱۱۲۳۴۵۶۷۸")
        self.assertEqual(search_by_secondary_phone.status_code, 200)
        self.assertEqual(search_by_secondary_phone.data["count"], 1)
        address_id = response.data["addresses"][0]["id"]
        old_secondary_phone_id = phone_ids_by_number["02112345678"]

        update = self.client.patch(
            f"/api/v1/customers/{self.customer.pk}/",
            {
                "addresses": [
                    {"id": address_id, "title": "خانه", "value": "تهران، خیابان جدید", "postal_code": "۱۲۳۴۵۶۷۸۹۰"}
                ],
                "phones": [{"title": "همراه اصلی", "number": "۰۹۱۲۱۲۳۴۵۶۷"}],
            },
            format="json",
        )
        self.assertEqual(update.status_code, 200)
        self.assertEqual(update.data["addresses"][0]["id"], address_id)
        self.assertEqual(update.data["addresses"][0]["value"], "تهران، خیابان جدید")
        self.assertEqual(len(update.data["phones"]), 1)
        self.assertEqual(update.data["phone_number"], "09121234567")
        self.assertTrue(CustomerAddress.objects.filter(pk=address_id, is_active=True).exists())
        self.assertTrue(CustomerPhone.objects.filter(pk=old_secondary_phone_id, is_active=False).exists())
        self.assertTrue(CustomerPhone.objects.filter(pk=old_secondary_phone_id).exists())

    def test_nested_records_cannot_be_attached_across_customers(self):
        self.client.force_authenticate(self.staff_user)
        first = self.client.patch(
            f"/api/v1/customers/{self.customer.pk}/",
            {"addresses": [{"title": "خانه", "value": "تهران"}]},
            format="json",
        )
        self.assertEqual(first.status_code, 200)
        address_id = first.data["addresses"][0]["id"]

        second = self.client.post(
            "/api/v1/customers/",
            {"customer_type": "individual", "first_name": "مشتری", "last_name": "دوم"},
            format="json",
        )
        self.assertEqual(second.status_code, 201)
        response = self.client.patch(
            f"/api/v1/customers/{second.data['id']}/",
            {"addresses": [{"id": address_id, "title": "خانه", "value": "نشانی غیرمجاز"}]},
            format="json",
        )
        self.assertEqual(response.status_code, 400)
        self.assertEqual(CustomerAddress.objects.get(pk=address_id).address, "تهران")

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

    def test_customer_update_creates_audit_event_without_record_values(self):
        self.client.force_authenticate(self.staff_user)
        response = self.client.patch(
            f"/api/v1/customers/{self.customer.pk}/",
            {"notes": "اطلاعات حساس نباید در audit کپی شود"},
            format="json",
        )
        self.assertEqual(response.status_code, 200)
        event = AuditEvent.objects.get(action="customer.updated", entity_id=str(self.customer.pk))
        self.assertIn("notes", event.metadata["updated_fields"])
        self.assertNotIn("اطلاعات حساس نباید در audit کپی شود", str(event.metadata))

    def test_case_worker_cannot_read_another_workers_customer(self):
        other = User.objects.create_user(username="other", is_staff=True)
        UserProfile.objects.create(user=other, role=UserProfile.Role.CASE_WORKER)
        self.client.force_authenticate(other)
        response = self.client.get(f"/api/v1/customers/{self.customer.pk}/")
        self.assertEqual(response.status_code, 404)

    def test_finance_and_auditor_do_not_receive_national_id(self):
        self.customer.national_id = "0012345678"
        self.customer.save(update_fields=["national_id"])
        for role in (UserProfile.Role.FINANCE, UserProfile.Role.AUDITOR):
            user = User.objects.create_user(username=role, is_staff=True)
            UserProfile.objects.create(user=user, role=role)
            with self.subTest(role=role):
                self.client.force_authenticate(user)
                response = self.client.get("/api/v1/customers/")
                self.assertEqual(response.status_code, 200)
                self.assertNotIn("national_id", response.data["results"][0])

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

def test_customer_can_be_created_with_birth_date(self):
        self.client.force_authenticate(self.staff_user)
        response = self.client.post(
            "/api/v1/customers/",
            {
                "customer_type": "individual",
                "first_name": "مشتری",
                "last_name": "جدید",
                "birth_date": "1994-08-17",
            },
            format="json",
        )
        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.data["birth_date"], "1994-08-17")
        customer = Customer.objects.get(pk=response.data["id"])
        self.assertEqual(customer.birth_date.isoformat(), "1994-08-17")
