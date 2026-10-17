from decimal import Decimal

from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework.test import APIClient

from accounts.models import UserProfile
from customers.models import Customer
from core.models import AuditEvent
from .models import ServiceCatalogItem, ServiceRecord


User = get_user_model()


class ServiceApiTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.worker = User.objects.create_user(
            username="service-worker", password="test-password-123", is_staff=True
        )
        UserProfile.objects.create(user=self.worker, role=UserProfile.Role.CASE_WORKER)
        self.finance = User.objects.create_user(
            username="service-finance", password="test-password-123", is_staff=True
        )
        UserProfile.objects.create(user=self.finance, role=UserProfile.Role.FINANCE)
        self.admin = User.objects.create_user(
            username="service-admin", password="test-password-123", is_staff=True
        )
        UserProfile.objects.create(user=self.admin, role=UserProfile.Role.SYSTEM_ADMIN)
        self.customer = Customer.objects.create(
            customer_type=Customer.CustomerType.INDIVIDUAL,
            first_name="مشتری",
            last_name="خدمت",
            assigned_to=self.worker,
        )
        self.other_worker = User.objects.create_user(
            username="service-other-worker", password="test-password-123", is_staff=True
        )
        UserProfile.objects.create(user=self.other_worker, role=UserProfile.Role.CASE_WORKER)
        self.other_customer = Customer.objects.create(
            customer_type=Customer.CustomerType.INDIVIDUAL,
            first_name="مشتری دیگر",
            last_name="خدمت",
            assigned_to=self.other_worker,
        )
        self.service = ServiceCatalogItem.objects.create(
            name="مشاوره مالی",
            description="جلسه مشاوره",
            price=Decimal("100000"),
            created_by=self.admin,
        )

    def receipt_payload(self, *, customer=None, service=None, discount="20000", paid="50000"):
        return {
            "customer": str((customer or self.customer).pk),
            "service": str((service or self.service).pk),
            "performed_by": str(self.worker.pk),
            "discount": discount,
            "paid": paid,
            "payment_method": ServiceRecord.PaymentMethod.POS,
            "note": "شرح داخلی رسید",
        }

    def create_receipt(self, *, user=None, customer=None, idempotency_key=None):
        self.client.force_authenticate(user or self.worker)
        headers = {}
        if idempotency_key:
            headers["HTTP_IDEMPOTENCY_KEY"] = idempotency_key
        response = self.client.post(
            "/api/v1/services/receipts/",
            self.receipt_payload(customer=customer),
            format="json",
            **headers,
        )
        self.assertEqual(response.status_code, 201, response.data)
        return response

    def test_anonymous_user_cannot_read_catalog_or_receipts(self):
        self.assertEqual(self.client.get("/api/v1/services/catalog/").status_code, 403)
        self.assertEqual(self.client.get("/api/v1/services/receipts/").status_code, 403)

    def test_only_system_admin_can_create_or_edit_catalog_items(self):
        self.client.force_authenticate(self.worker)
        denied = self.client.post(
            "/api/v1/services/catalog/",
            {"name": "خدمت ممنوع", "price": "20000"},
            format="json",
        )
        self.assertEqual(denied.status_code, 403)
        self.client.force_authenticate(self.admin)
        created = self.client.post(
            "/api/v1/services/catalog/",
            {"name": "سرویس جدید", "description": "توضیح", "price": "25000"},
            format="json",
        )
        self.assertEqual(created.status_code, 201, created.data)
        self.assertTrue(created.data["code"].startswith("SV-"))
        self.assertEqual(str(created.data["price"]), "25000")
        self.assertTrue(
            AuditEvent.objects.filter(
                action="service_catalog.created",
                entity_id=created.data["id"],
                actor=self.admin,
            ).exists()
        )

    def test_catalog_names_are_unique_case_insensitively(self):
        self.client.force_authenticate(self.admin)
        response = self.client.post(
            "/api/v1/services/catalog/",
            {"name": "مشاوره مالی", "price": "100000"},
            format="json",
        )
        self.assertEqual(response.status_code, 400)

    def test_catalog_item_cannot_be_physically_deleted(self):
        self.client.force_authenticate(self.admin)
        response = self.client.delete(f"/api/v1/services/catalog/{self.service.pk}/")
        self.assertEqual(response.status_code, 405)
        with self.assertRaises(ValueError):
            ServiceCatalogItem.objects.filter(pk=self.service.pk).delete()

    def test_receipt_amount_is_calculated_by_server_and_audited_without_note_content(self):
        response = self.create_receipt()
        self.assertTrue(response.data["receipt_number"].startswith("RCPT-"))
        self.assertEqual(str(response.data["price"]), "100000")
        self.assertEqual(str(response.data["discount"]), "20000")
        self.assertEqual(str(response.data["total"]), "80000")
        self.assertEqual(str(response.data["paid"]), "50000")
        self.assertEqual(str(response.data["amount_due"]), "30000")
        self.assertEqual(response.data["service_name"], self.service.name)
        self.assertEqual(response.data["service_code"], self.service.code)
        record = ServiceRecord.objects.get(pk=response.data["id"])
        self.assertEqual(record.created_by, self.worker)
        self.assertEqual(record.performed_by, self.worker)
        audit = AuditEvent.objects.get(
            action="service_receipt.created", entity_id=str(record.pk)
        )
        self.assertNotIn("شرح داخلی رسید", str(audit.metadata))

    def test_same_idempotency_key_replays_existing_receipt_without_duplicate_audit(self):
        key = "receipt-key-0001"
        self.client.force_authenticate(self.worker)
        payload = self.receipt_payload()
        first = self.client.post(
            "/api/v1/services/receipts/",
            payload,
            format="json",
            HTTP_IDEMPOTENCY_KEY=key,
        )
        self.assertEqual(first.status_code, 201, first.data)
        second = self.client.post(
            "/api/v1/services/receipts/",
            payload,
            format="json",
            HTTP_IDEMPOTENCY_KEY=key,
        )
        self.assertEqual(second.status_code, 200, second.data)
        self.assertEqual(second.data["id"], first.data["id"])
        self.assertEqual(second["Idempotency-Replayed"], "true")
        self.assertEqual(ServiceRecord.objects.count(), 1)
        self.assertEqual(
            AuditEvent.objects.filter(
                action="service_receipt.created",
                actor=self.worker,
            ).count(),
            1,
        )

    def test_same_idempotency_key_with_changed_payload_is_rejected(self):
        key = "receipt-key-0002"
        self.client.force_authenticate(self.worker)
        first = self.client.post(
            "/api/v1/services/receipts/",
            self.receipt_payload(),
            format="json",
            HTTP_IDEMPOTENCY_KEY=key,
        )
        self.assertEqual(first.status_code, 201, first.data)
        changed = self.receipt_payload(paid="40000")
        second = self.client.post(
            "/api/v1/services/receipts/",
            changed,
            format="json",
            HTTP_IDEMPOTENCY_KEY=key,
        )
        self.assertEqual(second.status_code, 409)
        self.assertEqual(ServiceRecord.objects.count(), 1)
        self.assertEqual(
            AuditEvent.objects.filter(action="service_receipt.created", actor=self.worker).count(),
            1,
        )

    def test_same_key_with_omitted_required_paid_field_is_not_treated_as_replay(self):
        key = "receipt-key-0004"
        self.client.force_authenticate(self.worker)
        payload = self.receipt_payload(paid="0")
        first = self.client.post(
            "/api/v1/services/receipts/",
            payload,
            format="json",
            HTTP_IDEMPOTENCY_KEY=key,
        )
        self.assertEqual(first.status_code, 201, first.data)
        changed = dict(payload)
        changed.pop("paid")
        second = self.client.post(
            "/api/v1/services/receipts/",
            changed,
            format="json",
            HTTP_IDEMPOTENCY_KEY=key,
        )
        self.assertEqual(second.status_code, 409)
        self.assertEqual(ServiceRecord.objects.count(), 1)

    def test_idempotent_replay_survives_service_deactivation(self):
        key = "receipt-key-0003"
        first = self.create_receipt(idempotency_key=key)
        self.service.active = False
        self.service.save(update_fields=["active", "updated_at"])
        self.client.force_authenticate(self.worker)
        replay = self.client.post(
            "/api/v1/services/receipts/",
            self.receipt_payload(),
            format="json",
            HTTP_IDEMPOTENCY_KEY=key,
        )
        self.assertEqual(replay.status_code, 200, replay.data)
        self.assertEqual(replay.data["id"], first.data["id"])
        self.assertEqual(ServiceRecord.objects.count(), 1)

    def test_invalid_idempotency_key_is_rejected(self):
        self.client.force_authenticate(self.worker)
        response = self.client.post(
            "/api/v1/services/receipts/",
            self.receipt_payload(),
            format="json",
            HTTP_IDEMPOTENCY_KEY="short",
        )
        self.assertEqual(response.status_code, 400)
        self.assertEqual(ServiceRecord.objects.count(), 0)

    def test_discount_and_paid_amount_cannot_exceed_allowed_values(self):
        self.client.force_authenticate(self.worker)
        too_much_discount = self.client.post(
            "/api/v1/services/receipts/",
            self.receipt_payload(discount="100001", paid="0"),
            format="json",
        )
        self.assertEqual(too_much_discount.status_code, 400)
        too_much_paid = self.client.post(
            "/api/v1/services/receipts/",
            self.receipt_payload(discount="0", paid="100001"),
            format="json",
        )
        self.assertEqual(too_much_paid.status_code, 400)
        self.assertEqual(ServiceRecord.objects.count(), 0)

    def test_worker_cannot_record_service_for_unassigned_customer(self):
        self.client.force_authenticate(self.worker)
        response = self.client.post(
            "/api/v1/services/receipts/",
            self.receipt_payload(customer=self.other_customer),
            format="json",
        )
        self.assertEqual(response.status_code, 400)
        self.assertEqual(ServiceRecord.objects.count(), 0)

    def test_finance_can_register_receipt_for_any_customer_in_scope(self):
        response = self.create_receipt(user=self.finance, customer=self.other_customer)
        self.assertEqual(str(response.data["customer"]), str(self.other_customer.pk))
        self.assertEqual(ServiceRecord.objects.count(), 1)

    def test_inactive_service_cannot_be_used_for_new_receipts(self):
        self.service.active = False
        self.service.save(update_fields=["active", "updated_at"])
        self.client.force_authenticate(self.worker)
        response = self.client.post(
            "/api/v1/services/receipts/",
            self.receipt_payload(),
            format="json",
        )
        self.assertEqual(response.status_code, 400)
        self.assertEqual(ServiceRecord.objects.count(), 0)

    def test_catalog_price_changes_do_not_change_existing_receipt_snapshot(self):
        receipt = self.create_receipt()
        self.client.force_authenticate(self.admin)
        updated = self.client.patch(
            f"/api/v1/services/catalog/{self.service.pk}/",
            {"price": "200000"},
            format="json",
        )
        self.assertEqual(updated.status_code, 200, updated.data)
        self.assertEqual(str(updated.data["price"]), "200000")
        old_receipt = self.client.get(f"/api/v1/services/receipts/{receipt.data['id']}/")
        self.assertEqual(old_receipt.status_code, 200)
        self.assertEqual(str(old_receipt.data["price"]), "100000")
        self.assertEqual(old_receipt.data["service_name"], "مشاوره مالی")

    def test_case_worker_receipt_list_is_scoped_to_assigned_customers(self):
        visible = self.create_receipt()
        self.client.force_authenticate(self.finance)
        other_receipt = self.client.post(
            "/api/v1/services/receipts/",
            self.receipt_payload(customer=self.other_customer),
            format="json",
        )
        self.assertEqual(other_receipt.status_code, 201)
        self.client.force_authenticate(self.worker)
        response = self.client.get("/api/v1/services/receipts/")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["count"], 1)
        self.assertEqual(response.data["results"][0]["id"], visible.data["id"])

    def test_receipts_are_immutable_and_cannot_be_deleted(self):
        response = self.create_receipt()
        record = ServiceRecord.objects.get(pk=response.data["id"])
        self.client.force_authenticate(self.worker)
        update = self.client.patch(
            f"/api/v1/services/receipts/{record.pk}/",
            {"paid": "0"},
            format="json",
        )
        self.assertEqual(update.status_code, 405)
        delete = self.client.delete(f"/api/v1/services/receipts/{record.pk}/")
        self.assertEqual(delete.status_code, 405)
        record.paid = Decimal("0")
        with self.assertRaises(ValueError):
            record.save()
        with self.assertRaises(ValueError):
            ServiceRecord.objects.filter(pk=record.pk).update(paid=0)
        with self.assertRaises(ValueError):
            ServiceRecord.objects.filter(pk=record.pk).delete()
