import uuid

import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):
    initial = True

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name="Customer",
            fields=[
                ("id", models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ("customer_number", models.CharField(db_index=True, max_length=24, unique=True)),
                ("customer_type", models.CharField(choices=[("individual", "حقیقی"), ("organization", "حقوقی")], default="individual", max_length=16)),
                ("first_name", models.CharField(blank=True, max_length=100)),
                ("last_name", models.CharField(blank=True, max_length=100)),
                ("organization_name", models.CharField(blank=True, max_length=200)),
                ("phone_number", models.CharField(blank=True, db_index=True, max_length=32)),
                ("email", models.EmailField(blank=True, max_length=254)),
                ("status", models.CharField(choices=[("active", "فعال"), ("inactive", "غیرفعال"), ("archived", "بایگانی‌شده")], default="active", max_length=16)),
                ("notes", models.TextField(blank=True)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("assigned_to", models.ForeignKey(on_delete=django.db.models.deletion.PROTECT, related_name="assigned_customers", to=settings.AUTH_USER_MODEL)),
            ],
            options={"ordering": ["-created_at"]},
        ),
        migrations.AddIndex(
            model_name="customer",
            index=models.Index(fields=["status", "customer_type"], name="customers_c_status_11e2b7_idx"),
        ),
        migrations.AddIndex(
            model_name="customer",
            index=models.Index(fields=["last_name", "first_name"], name="customers_c_last_na_23db24_idx"),
        ),
    ]
