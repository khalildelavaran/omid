from datetime import timedelta

from django.contrib.auth import get_user_model
from django.utils import timezone
from django.test import TestCase
from rest_framework.test import APIClient

from accounts.models import UserProfile
from applications.models import LoanApplication
from customers.models import Customer
from core.models import AuditEvent
from .models import WorkflowTask, WorkflowTaskEvent


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

    def test_invalid_application_filter_returns_empty_result(self):
        self.client.force_authenticate(self.staff)
        response = self.client.get("/api/v1/tasks/?application=not-a-uuid")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["count"], 0)

    def test_overdue_filter_excludes_completed_tasks_and_summary_counts_scope(self):
        overdue = WorkflowTask.objects.create(
            application=self.application,
            title="وظیفه عقب‌افتاده",
            due_at=timezone.now() - timedelta(days=2),
            assigned_to=self.staff,
            created_by=self.staff,
        )
        future = WorkflowTask.objects.create(
            application=self.application,
            title="وظیفه آینده",
            due_at=timezone.now() + timedelta(days=2),
            assigned_to=self.staff,
            created_by=self.staff,
        )
        completed = WorkflowTask.objects.create(
            application=self.application,
            title="وظیفه تکمیل‌شده",
            status=WorkflowTask.Status.COMPLETED,
            due_at=timezone.now() - timedelta(days=1),
            assigned_to=self.staff,
            created_by=self.staff,
        )
        self.client.force_authenticate(self.staff)

        overdue_response = self.client.get("/api/v1/tasks/?overdue=true")
        self.assertEqual(overdue_response.status_code, 200)
        self.assertEqual(overdue_response.data["count"], 1)
        self.assertEqual(overdue_response.data["results"][0]["id"], str(overdue.pk))
        self.assertTrue(overdue_response.data["results"][0]["is_overdue"])

        not_overdue = self.client.get("/api/v1/tasks/?overdue=false")
        self.assertEqual(not_overdue.status_code, 200)
        self.assertEqual(not_overdue.data["count"], 2)
        by_id = {row["id"]: row for row in not_overdue.data["results"]}
        self.assertIn(str(future.pk), by_id)
        self.assertIn(str(completed.pk), by_id)
        self.assertFalse(by_id[str(completed.pk)]["is_overdue"])

        summary = self.client.get("/api/v1/tasks/summary/")
        self.assertEqual(summary.status_code, 200)
        self.assertEqual(summary.data["total"], 3)
        self.assertEqual(summary.data["overdue"], 1)
        self.assertEqual(summary.data["completed"], 1)

    def test_invalid_overdue_filter_is_rejected(self):
        self.client.force_authenticate(self.staff)
        response = self.client.get("/api/v1/tasks/?overdue=sometimes")
        self.assertEqual(response.status_code, 400)

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
        created_event = WorkflowTaskEvent.objects.get(
            task_id=response.data["id"],
            event_type=WorkflowTaskEvent.EventType.CREATED,
        )
        self.assertEqual(created_event.actor, self.staff)
        self.assertEqual(created_event.new_status, WorkflowTask.Status.OPEN)

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
        event = WorkflowTaskEvent.objects.get(
            task=task, event_type=WorkflowTaskEvent.EventType.STATUS_CHANGED
        )
        self.assertEqual(event.previous_status, WorkflowTask.Status.OPEN)
        self.assertEqual(event.new_status, WorkflowTask.Status.COMPLETED)
        self.assertEqual(event.actor, self.staff)

    def test_completed_task_cannot_be_reopened_or_write_history(self):
        task = WorkflowTask.objects.create(
            application=self.application,
            title="کار تمام‌شده",
            status=WorkflowTask.Status.COMPLETED,
            assigned_to=self.staff,
            created_by=self.staff,
        )
        event_count = task.events.count()
        audit_count = AuditEvent.objects.filter(
            action="task.updated", entity_id=str(task.pk)
        ).count()
        self.client.force_authenticate(self.staff)
        response = self.client.patch(
            f"/api/v1/tasks/{task.pk}/",
            {"status": "open"},
            format="json",
        )
        self.assertEqual(response.status_code, 400)
        task.refresh_from_db()
        self.assertEqual(task.status, WorkflowTask.Status.COMPLETED)
        self.assertEqual(task.events.count(), event_count)
        self.assertEqual(
            AuditEvent.objects.filter(action="task.updated", entity_id=str(task.pk)).count(),
            audit_count,
        )

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


    def test_task_note_is_saved_in_event_history_without_leaking_to_audit_metadata(self):
        task = WorkflowTask.objects.create(
            application=self.application,
            title="نیازمند پیگیری",
            assigned_to=self.staff,
            created_by=self.staff,
        )
        self.client.force_authenticate(self.staff)
        note = "با مشتری تماس گرفته شد."
        response = self.client.post(
            f"/api/v1/tasks/{task.pk}/notes/",
            {"note": note},
            format="json",
        )
        self.assertEqual(response.status_code, 201)
        event = WorkflowTaskEvent.objects.get(
            task=task, event_type=WorkflowTaskEvent.EventType.NOTE_ADDED
        )
        self.assertEqual(event.note, note)
        self.assertEqual(event.actor, self.staff)
        audit = AuditEvent.objects.get(action="task.note_added", entity_id=str(task.pk))
        self.assertEqual(audit.metadata["note_length"], len(note))
        self.assertNotIn(note, str(audit.metadata))

        history = self.client.get(f"/api/v1/tasks/{task.pk}/events/")
        self.assertEqual(history.status_code, 200)
        self.assertEqual(len(history.data), 1)
        self.assertEqual(history.data[0]["note"], note)

    def test_task_note_requires_nonempty_text_and_has_length_limit(self):
        task = WorkflowTask.objects.create(
            application=self.application,
            title="یادداشت‌ها",
            assigned_to=self.staff,
            created_by=self.staff,
        )
        self.client.force_authenticate(self.staff)
        empty = self.client.post(
            f"/api/v1/tasks/{task.pk}/notes/", {"note": "  "}, format="json"
        )
        self.assertEqual(empty.status_code, 400)
        too_long = self.client.post(
            f"/api/v1/tasks/{task.pk}/notes/",
            {"note": "x" * 5001},
            format="json",
        )
        self.assertEqual(too_long.status_code, 400)
        self.assertFalse(task.events.filter(event_type=WorkflowTaskEvent.EventType.NOTE_ADDED).exists())

    def test_task_event_history_is_hidden_for_unrelated_worker(self):
        task = WorkflowTask.objects.create(
            application=self.application,
            title="تاریخچه خصوصی",
            assigned_to=self.staff,
            created_by=self.staff,
        )
        WorkflowTaskEvent.objects.create(
            task=task,
            event_type=WorkflowTaskEvent.EventType.NOTE_ADDED,
            note="یادداشت خصوصی",
            actor=self.staff,
        )
        other = User.objects.create_user(
            username="unrelated-event-reader", password="test-password-123", is_staff=True
        )
        UserProfile.objects.create(user=other, role=UserProfile.Role.CASE_WORKER)
        self.client.force_authenticate(other)
        response = self.client.get(f"/api/v1/tasks/{task.pk}/events/")
        self.assertEqual(response.status_code, 404)

    def test_task_events_are_append_only(self):
        task = WorkflowTask.objects.create(
            application=self.application,
            title="عدم تغییر تاریخچه",
            assigned_to=self.staff,
            created_by=self.staff,
        )
        event = WorkflowTaskEvent.objects.create(
            task=task,
            event_type=WorkflowTaskEvent.EventType.CREATED,
            actor=self.staff,
        )
        event.note = "tampered"
        with self.assertRaises(ValueError):
            event.save()
        with self.assertRaises(ValueError):
            event.delete()
        with self.assertRaises(ValueError):
            WorkflowTaskEvent.objects.filter(pk=event.pk).update(note="tampered")

    def test_only_system_admin_can_assign_task(self):
        task = WorkflowTask.objects.create(
            application=self.application,
            title="واگذاری",
            assigned_to=self.staff,
            created_by=self.staff,
        )
        self.client.force_authenticate(self.staff)
        denied = self.client.post(
            f"/api/v1/tasks/{task.pk}/assign/",
            {"assigned_to": self.staff.pk},
            format="json",
        )
        self.assertEqual(denied.status_code, 403)

        admin_user = User.objects.create_user(username="task-admin", password="test-password-123", is_staff=True)
        UserProfile.objects.create(user=admin_user, role=UserProfile.Role.SYSTEM_ADMIN)
        target = User.objects.create_user(username="task-target", password="test-password-123", is_staff=True)
        UserProfile.objects.create(user=target, role=UserProfile.Role.INTAKE)
        self.client.force_authenticate(admin_user)
        assigned = self.client.post(
            f"/api/v1/tasks/{task.pk}/assign/",
            {"assigned_to": target.pk},
            format="json",
        )
        self.assertEqual(assigned.status_code, 200)
        task.refresh_from_db()
        self.assertEqual(task.assigned_to_id, target.pk)
        self.assertTrue(AuditEvent.objects.filter(action="task.assigned", entity_id=str(task.pk)).exists())
        event = WorkflowTaskEvent.objects.get(
            task=task, event_type=WorkflowTaskEvent.EventType.ASSIGNED
        )
        self.assertEqual(event.previous_assignee_id, self.staff.pk)
        self.assertEqual(event.new_assignee_id, target.pk)
        self.assertEqual(event.actor, admin_user)
