from django.conf import settings
from django.db import models


class UserProfile(models.Model):
    """Business role metadata layered over Django's built-in user model.

    Django groups and permissions remain the source of authorization decisions.
    This profile is not a substitute for object-level permission checks.
    """

    class Role(models.TextChoices):
        SYSTEM_ADMIN = "system_admin", "مدیر سامانه"
        INTAKE = "intake", "کارشناس پذیرش"
        CASE_WORKER = "case_worker", "کارشناس پرونده"
        CREDIT_APPROVER = "credit_approver", "تأییدکننده اعتباری"
        FINANCE = "finance", "مالی"
        AUDITOR = "auditor", "حسابرس"
        CUSTOMER = "customer", "مشتری"

    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="profile",
    )
    role = models.CharField(max_length=32, choices=Role.choices, default=Role.CASE_WORKER)
    phone_number = models.CharField(max_length=32, blank=True)
    must_change_password = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self) -> str:
        return f"{self.user_id}:{self.role}"
