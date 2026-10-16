from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework.test import APIClient

from accounts.models import UserProfile
from applications.models import LoanApplication
from customers.models import Customer
from core.models import AuditEvent
from .models import WorkflowTask


User = get_user_model()


class WorkflowTaskApiTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.staff = User.objects.create_user(username="task-owner", password="test-password-123", is_staff=True)
        UserProfile.objects.create(user=self.staff, role=UserProfile.Role.CASE_WORKER)
        self.customer = Customer.objects.create(
            customer_number="CUST-TASK-1",
            customer_type=Customer.CustomerType.INDIVIDUAL,
            first_name="نمونه",
            last_name="مشتری",
            assigned_to=self.staff,
        )
        self.application = LoanApplication.objects.create(
            application_number="APP-TASK-1",
            customer=self.customer,
            product_type=LoanApplication.ProductType.PERSONAL,
            requested_amount=100000,
            assigned_to=self.staff,
        )

    def test_anonymous_user_cannot_list_tasks(self):
        self.assertEqual(self.client.get("/api/v1/tasks/").status_code, 403)

    def test_staff_can_create_task_and_number_is_generated(self):
        self.client.force_authenticate(self.staff)
        response = self.client.post(
            "/api/v1/tasks/",
            {
                "task_number": "FORGED-TASK-NUMBER",
                "application": str(self.application.pk),
                "title": "بررسی مدارک",
                "priority": "high",
            },
            format="json",
        )
        self.assertEqual(response.status_code, 201)
        self.assertTrue(response.data["task_number"].startswith("TASK-"))
        self.assertNotEqual(response.data["task_number"], "FORGED-TASK-NUMBER")
        self.assertEqual(response.data["assigned_to"], self.staff.pk)
        self.assertTrue(AuditEvent.objects.filter(action="task.created", entity_id=response.data["id"]).exists())

    def test_task_status_transition_sets_completion_timestamp(self):
        task = WorkflowTask.objects.create(
            application=self.application,
            title="بررسی مدارک",
            assigned_to=self.staff,
            created_by=self.staff,
        )
        self.client.force_authenticate(self.staff)
        response = self.client.patch(
            f"/api/v1/tasks/{task.pk}/",
            {"status": "completed"},
            format="json",
        )
        self.assertEqual(response.status_code, 200)
        self.assertIsNotNone(response.data["completed_at"])
        task.refresh_from_db()
        self.assertEqual(task.status, WorkflowTask.Status.COMPLETED)

    def test_completed_task_cannot_be_reopened(self):
        task = WorkflowTask.objects.create(
            application=self.application,
            title="کار تمام‌شده",
            status=WorkflowTask.Status.COMPLETED,
            assigned_to=self.staff,
            created_by=self.staff,
        )
        self.client.force_authenticate(self.staff)
        response = self.client.patch(
            f"/api/v1/tasks/{task.pk}/",
            {"status": "open"},
            format="json",
        )
        self.assertEqual(response.status_code, 400)

    def test_worker_cannot_create_task_for_another_workers_application(self):
        other = User.objects.create_user(username="other-task-owner", password="test-password-123", is_staff=True)
        UserProfile.objects.create(user=other, role=UserProfile.Role.CASE_WORKER)
        self.client.force_authenticate(other)
        response = self.client.post(
            "/api/v1/tasks/",
            {
                "application": str(self.application.pk),
                "title": "نباید ثبت شود",
            },
            format="json",
        )
        self.assertEqual(response.status_code, 400)

    def test_worker_cannot_access_another_workers_task(self):
        other = User.objects.create_user(username="other-task-worker", password="test-password-123", is_staff=True)
        UserProfile.objects.create(user=other, role=UserProfile.Role.CASE_WORKER)
        task = WorkflowTask.objects.create(
            application=self.application,
            title="وظیفه خصوصی",
            assigned_to=self.staff,
            created_by=self.staff,
        )
        self.client.force_authenticate(other)
        response = self.client.get(f"/api/v1/tasks/{task.pk}/")
        self.assertEqual(response.status_code, 404)

    def test_task_hard_delete_is_disabled(self):
        task = WorkflowTask.objects.create(
            application=self.application,
            title="حفظ سابقه",
            assigned_to=self.staff,
            created_by=self.staff,
        )
        self.client.force_authenticate(self.staff)
        response = self.client.delete(f"/api/v1/tasks/{task.pk}/")
        self.assertEqual(response.status_code, 405)
        self.assertTrue(WorkflowTask.objects.filter(pk=task.pk).exists())
