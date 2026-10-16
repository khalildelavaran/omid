from django.contrib.auth import get_user_model
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import TestCase
from rest_framework.test import APIClient

from accounts.models import UserProfile
from applications.models import LoanApplication
from customers.models import Customer
from core.models import AuditEvent
from .models import Document


User = get_user_model()
VALID_PDF = b"%PDF-1.4\nSample test document\n%%EOF"


class DocumentApiTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.staff = User.objects.create_user(
            username="document-worker", password="test-password-123", is_staff=True
        )
        UserProfile.objects.create(user=self.staff, role=UserProfile.Role.CASE_WORKER)
        self.customer = Customer.objects.create(
            customer_type=Customer.CustomerType.INDIVIDUAL,
            first_name="آزمایشی",
            last_name="مشتری",
            assigned_to=self.staff,
        )
        self.application = LoanApplication.objects.create(
            customer=self.customer,
            product_type=LoanApplication.ProductType.PERSONAL,
            requested_amount=100000,
            assigned_to=self.staff,
        )

    def tearDown(self):
        # Remove private filesystem artifacts created by tests, even when DB rolls back.
        for document in Document.objects.all():
            try:
                document.file.storage.delete(document.file.name)
            except (OSError, ValueError):
                pass

    def upload_payload(self, *, content=VALID_PDF, name="identity.pdf", content_type="application/pdf"):
        return {
            "application": str(self.application.pk),
            "document_type": Document.DocumentType.IDENTITY,
            "file": SimpleUploadedFile(name, content, content_type=content_type),
        }

    def upload_document(self):
        self.client.force_authenticate(self.staff)
        response = self.client.post(
            "/api/v1/documents/", self.upload_payload(), format="multipart"
        )
        self.assertEqual(response.status_code, 201, response.data)
        return response

    def test_anonymous_user_cannot_list_or_upload_documents(self):
        self.assertEqual(self.client.get("/api/v1/documents/").status_code, 403)
        response = self.client.post(
            "/api/v1/documents/", self.upload_payload(), format="multipart"
        )
        self.assertEqual(response.status_code, 403)

    def test_valid_document_is_stored_privately_and_audited(self):
        response = self.upload_document()
        document = Document.objects.get(pk=response.data["id"])
        self.assertTrue(document.document_number.startswith("DOC-"))
        self.assertEqual(document.content_type, "application/pdf")
        self.assertEqual(document.size_bytes, len(VALID_PDF))
        self.assertEqual(len(document.sha256), 64)
        self.assertNotIn("file", response.data)
        self.assertTrue(document.file.name.startswith("documents/"))
        self.assertTrue(
            AuditEvent.objects.filter(
                action="document.uploaded",
                entity_id=str(document.pk),
                actor=self.staff,
            ).exists()
        )
        with self.assertRaises(ValueError):
            document.file.storage.url(document.file.name)

    def test_fake_pdf_is_rejected_even_if_browser_claims_pdf(self):
        self.client.force_authenticate(self.staff)
        response = self.client.post(
            "/api/v1/documents/",
            self.upload_payload(content=b"<html>not a pdf</html>", content_type="application/pdf"),
            format="multipart",
        )
        self.assertEqual(response.status_code, 400)
        self.assertEqual(Document.objects.count(), 0)

    def test_upload_size_limit_is_enforced(self):
        self.client.force_authenticate(self.staff)
        oversized = VALID_PDF + (b"x" * (10 * 1024 * 1024 + 1))
        response = self.client.post(
            "/api/v1/documents/",
            self.upload_payload(content=oversized),
            format="multipart",
        )
        self.assertEqual(response.status_code, 400)
        self.assertEqual(Document.objects.count(), 0)

    def test_worker_cannot_upload_to_another_workers_application(self):
        other = User.objects.create_user(
            username="document-other-worker", password="test-password-123", is_staff=True
        )
        UserProfile.objects.create(user=other, role=UserProfile.Role.CASE_WORKER)
        self.client.force_authenticate(other)
        response = self.client.post(
            "/api/v1/documents/", self.upload_payload(), format="multipart"
        )
        self.assertEqual(response.status_code, 400)
        self.assertEqual(Document.objects.count(), 0)

    def test_worker_cannot_read_another_workers_document(self):
        uploaded = self.upload_document()
        other = User.objects.create_user(
            username="document-private-worker", password="test-password-123", is_staff=True
        )
        UserProfile.objects.create(user=other, role=UserProfile.Role.CASE_WORKER)
        self.client.force_authenticate(other)
        response = self.client.get(f"/api/v1/documents/{uploaded.data['id']}/")
        self.assertEqual(response.status_code, 404)

    def test_download_is_authorized_and_forced_as_attachment(self):
        uploaded = self.upload_document()
        response = self.client.get(f"/api/v1/documents/{uploaded.data['id']}/download/")
        self.assertEqual(response.status_code, 200)
        self.assertIn("attachment", response["Content-Disposition"])
        self.assertEqual(response["X-Content-Type-Options"], "nosniff")
        self.assertIn("no-store", response["Cache-Control"])
        self.assertEqual(b"".join(response.streaming_content), VALID_PDF)

        self.assertTrue(
            AuditEvent.objects.filter(
                action="document.downloaded",
                entity_id=uploaded.data["id"],
                actor=self.staff,
            ).exists()
        )

    def test_rejected_document_cannot_be_downloaded(self):
        uploaded = self.upload_document()
        reviewed = self.client.post(
            f"/api/v1/documents/{uploaded.data['id']}/review/",
            {"status": Document.Status.REJECTED, "note": "تصویر خوانا نیست"},
            format="json",
        )
        self.assertEqual(reviewed.status_code, 200)
        response = self.client.get(f"/api/v1/documents/{uploaded.data['id']}/download/")
        self.assertEqual(response.status_code, 409)

    def test_rejection_requires_a_reason(self):
        uploaded = self.upload_document()
        response = self.client.post(
            f"/api/v1/documents/{uploaded.data['id']}/review/",
            {"status": Document.Status.REJECTED},
            format="json",
        )
        self.assertEqual(response.status_code, 400)

    def test_rejected_document_can_be_replaced_without_deleting_history(self):
        uploaded = self.upload_document()
        previous_id = uploaded.data["id"]
        rejected = self.client.post(
            f"/api/v1/documents/{previous_id}/review/",
            {"status": Document.Status.REJECTED, "note": "نسخه قبلی ناخوانا بود"},
            format="json",
        )
        self.assertEqual(rejected.status_code, 200)

        replacement_file = SimpleUploadedFile(
            "new-identity.pdf", b"%PDF-1.7\\nCorrected document\\n%%EOF",
            content_type="application/pdf",
        )
        response = self.client.post(
            f"/api/v1/documents/{previous_id}/replace/",
            {"file": replacement_file},
            format="multipart",
        )
        self.assertEqual(response.status_code, 201, response.data)
        self.assertEqual(str(response.data["replaces_document"]), previous_id)
        self.assertEqual(response.data["status"], Document.Status.PENDING_REVIEW)
        self.assertEqual(response.data["application"], str(self.application.pk))
        self.assertTrue(Document.objects.filter(pk=previous_id).exists())
        old = Document.objects.get(pk=previous_id)
        new = Document.objects.get(pk=response.data["id"])
        self.assertEqual(old.status, Document.Status.REJECTED)
        self.assertEqual(new.replaces_document_id, old.pk)
        self.assertTrue(
            AuditEvent.objects.filter(
                action="document.replaced",
                entity_id=str(new.pk),
                actor=self.staff,
                metadata__previous_document_id=str(old.pk),
            ).exists()
        )

    def test_only_rejected_documents_can_be_replaced(self):
        uploaded = self.upload_document()
        replacement_file = SimpleUploadedFile(
            "new-identity.pdf", VALID_PDF, content_type="application/pdf"
        )
        response = self.client.post(
            f"/api/v1/documents/{uploaded.data['id']}/replace/",
            {"file": replacement_file},
            format="multipart",
        )
        self.assertEqual(response.status_code, 409)
        self.assertEqual(Document.objects.count(), 1)

    def test_superseded_document_cannot_be_replaced_twice(self):
        uploaded = self.upload_document()
        previous_id = uploaded.data["id"]
        self.client.post(
            f"/api/v1/documents/{previous_id}/review/",
            {"status": Document.Status.REJECTED, "note": "نیازمند اصلاح"},
            format="json",
        )
        first = self.client.post(
            f"/api/v1/documents/{previous_id}/replace/",
            {"file": SimpleUploadedFile("v2.pdf", VALID_PDF, content_type="application/pdf")},
            format="multipart",
        )
        self.assertEqual(first.status_code, 201, first.data)

        self.client.post(
            f"/api/v1/documents/{first.data['id']}/review/",
            {"status": Document.Status.REJECTED, "note": "باز هم نیازمند اصلاح"},
            format="json",
        )
        second = self.client.post(
            f"/api/v1/documents/{previous_id}/replace/",
            {"file": SimpleUploadedFile("v3.pdf", VALID_PDF, content_type="application/pdf")},
            format="multipart",
        )
        self.assertEqual(second.status_code, 409)

    def test_worker_cannot_replace_another_workers_document(self):
        uploaded = self.upload_document()
        previous_id = uploaded.data["id"]
        self.client.post(
            f"/api/v1/documents/{previous_id}/review/",
            {"status": Document.Status.REJECTED, "note": "نیازمند اصلاح"},
            format="json",
        )
        other = User.objects.create_user(
            username="document-replacement-outsider",
            password="test-password-123",
            is_staff=True,
        )
        UserProfile.objects.create(user=other, role=UserProfile.Role.CASE_WORKER)
        self.client.force_authenticate(other)
        response = self.client.post(
            f"/api/v1/documents/{previous_id}/replace/",
            {"file": SimpleUploadedFile("attempt.pdf", VALID_PDF, content_type="application/pdf")},
            format="multipart",
        )
        self.assertEqual(response.status_code, 404)

    def test_finance_role_can_read_but_cannot_review_documents(self):
        uploaded = self.upload_document()
        finance = User.objects.create_user(
            username="document-finance", password="test-password-123", is_staff=True
        )
        UserProfile.objects.create(user=finance, role=UserProfile.Role.FINANCE)
        self.client.force_authenticate(finance)
        self.assertEqual(self.client.get("/api/v1/documents/").status_code, 200)
        response = self.client.post(
            f"/api/v1/documents/{uploaded.data['id']}/review/",
            {"status": Document.Status.ACCEPTED},
            format="json",
        )
        self.assertEqual(response.status_code, 403)

    def test_document_delete_route_does_not_exist(self):
        uploaded = self.upload_document()
        response = self.client.delete(f"/api/v1/documents/{uploaded.data['id']}/")
        self.assertEqual(response.status_code, 405)
