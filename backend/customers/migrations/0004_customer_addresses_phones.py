import uuid

import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [("customers", "0003_customer_profile_details")]

    operations = [
        migrations.CreateModel(
            name="CustomerAddress",
            fields=[
                ("id", models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ("title", models.CharField(blank=True, max_length=80)),
                ("address", models.TextField(max_length=1000)),
                ("postal_code", models.CharField(blank=True, max_length=20)),
                ("is_active", models.BooleanField(default=True)),
                ("archived_at", models.DateTimeField(blank=True, null=True)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("customer", models.ForeignKey(on_delete=django.db.models.deletion.PROTECT, related_name="addresses", to="customers.customer")),
            ],
            options={"ordering": ["created_at", "id"]},
        ),
        migrations.AddIndex(
            model_name="customeraddress",
            index=models.Index(fields=["customer", "is_active"], name="cust_addr_active_idx"),
        ),
        migrations.CreateModel(
            name="CustomerPhone",
            fields=[
                ("id", models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ("title", models.CharField(blank=True, max_length=80)),
                ("number", models.CharField(max_length=32)),
                ("is_active", models.BooleanField(default=True)),
                ("archived_at", models.DateTimeField(blank=True, null=True)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("customer", models.ForeignKey(on_delete=django.db.models.deletion.PROTECT, related_name="phones", to="customers.customer")),
            ],
            options={"ordering": ["created_at", "id"]},
        ),
        migrations.AddIndex(
            model_name="customerphone",
            index=models.Index(fields=["customer", "is_active"], name="cust_phone_active_idx"),
        ),
    ]
