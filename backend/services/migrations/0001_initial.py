import uuid

from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion
from django.db.models.functions import Lower


class Migration(migrations.Migration):
    initial = True

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ("customers", "0002_customer_number_generated"),
    ]

    operations = [
        migrations.CreateModel(
            name="ServiceCatalogItem",
            fields=[
                ("id", models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ("code", models.CharField(blank=True, default="", max_length=32, unique=True)),
                ("name", models.CharField(max_length=200)),
                ("description", models.CharField(blank=True, max_length=1000)),
                ("price", models.DecimalField(decimal_places=0, max_digits=18)),
                ("active", models.BooleanField(default=True)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("created_by", models.ForeignKey(on_delete=django.db.models.deletion.PROTECT, related_name="created_service_catalog_items", to=settings.AUTH_USER_MODEL)),
            ],
            options={"ordering": ["name", "created_at"]},
        ),
        migrations.AddConstraint(
            model_name="servicecatalogitem",
            constraint=models.UniqueConstraint(Lower("name"), name="service_catalog_name_ci_uniq"),
        ),
        migrations.AddConstraint(
            model_name="servicecatalogitem",
            constraint=models.CheckConstraint(condition=models.Q(("price__gte", 0)), name="service_catalog_price_nonnegative"),
        ),
        migrations.CreateModel(
            name="ServiceRecord",
            fields=[
                ("id", models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ("receipt_number", models.CharField(blank=True, default="", max_length=40, unique=True)),
                ("service_code_snapshot", models.CharField(max_length=32)),
                ("service_name_snapshot", models.CharField(max_length=200)),
                ("service_description_snapshot", models.CharField(blank=True, max_length=1000)),
                ("price", models.DecimalField(decimal_places=0, max_digits=18)),
                ("discount", models.DecimalField(decimal_places=0, default=0, max_digits=18)),
                ("total", models.DecimalField(decimal_places=0, max_digits=18)),
                ("paid", models.DecimalField(decimal_places=0, default=0, max_digits=18)),
                ("payment_method", models.CharField(choices=[("pos", "کارت‌خوان"), ("cash", "نقدی"), ("bank_transfer", "واریز بانکی"), ("other", "سایر")], max_length=24)),
                ("note", models.CharField(blank=True, max_length=500)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("created_by", models.ForeignKey(on_delete=django.db.models.deletion.PROTECT, related_name="created_service_records", to=settings.AUTH_USER_MODEL)),
                ("customer", models.ForeignKey(on_delete=django.db.models.deletion.PROTECT, related_name="service_records", to="customers.customer")),
                ("performed_by", models.ForeignKey(on_delete=django.db.models.deletion.PROTECT, related_name="performed_service_records", to=settings.AUTH_USER_MODEL)),
                ("service", models.ForeignKey(on_delete=django.db.models.deletion.PROTECT, related_name="receipts", to="services.servicecatalogitem")),
            ],
            options={"ordering": ["-created_at"]},
        ),
        migrations.AddIndex(
            model_name="servicerecord",
            index=models.Index(fields=["customer", "created_at"], name="service_receipt_customer_idx"),
        ),
        migrations.AddIndex(
            model_name="servicerecord",
            index=models.Index(fields=["service", "created_at"], name="service_receipt_service_idx"),
        ),
        migrations.AddIndex(
            model_name="servicerecord",
            index=models.Index(fields=["payment_method", "created_at"], name="service_receipt_method_idx"),
        ),
        migrations.AddConstraint(
            model_name="servicerecord",
            constraint=models.CheckConstraint(condition=models.Q(("price__gte", 0)), name="service_receipt_price_nonnegative"),
        ),
        migrations.AddConstraint(
            model_name="servicerecord",
            constraint=models.CheckConstraint(condition=models.Q(("discount__gte", 0)), name="service_receipt_discount_nonnegative"),
        ),
        migrations.AddConstraint(
            model_name="servicerecord",
            constraint=models.CheckConstraint(condition=models.Q(("total__gte", 0)), name="service_receipt_total_nonnegative"),
        ),
        migrations.AddConstraint(
            model_name="servicerecord",
            constraint=models.CheckConstraint(condition=models.Q(("paid__gte", 0)), name="service_receipt_paid_nonnegative"),
        ),
        migrations.AddConstraint(
            model_name="servicerecord",
            constraint=models.CheckConstraint(condition=models.Q(("discount__lte", models.F("price"))), name="service_receipt_discount_lte_price"),
        ),
        migrations.AddConstraint(
            model_name="servicerecord",
            constraint=models.CheckConstraint(condition=models.Q(("total", models.ExpressionWrapper(models.F("price") - models.F("discount"), output_field=models.DecimalField(decimal_places=0, max_digits=18)))), name="service_receipt_total_matches_price"),
        ),
        migrations.AddConstraint(
            model_name="servicerecord",
            constraint=models.CheckConstraint(condition=models.Q(("paid__lte", models.F("total"))), name="service_receipt_paid_lte_total"),
        ),
    ]
