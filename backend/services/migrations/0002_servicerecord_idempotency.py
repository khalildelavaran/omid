from django.db import migrations, models
import django.db.models.expressions
import django.db.models.lookups


class Migration(migrations.Migration):
    dependencies = [
        ("services", "0001_initial"),
    ]

    operations = [
        migrations.AddField(
            model_name="servicerecord",
            name="idempotency_key",
            field=models.CharField(blank=True, default="", max_length=128),
        ),
        migrations.AddField(
            model_name="servicerecord",
            name="request_fingerprint",
            field=models.CharField(blank=True, default="", max_length=64),
        ),
        migrations.AddConstraint(
            model_name="servicerecord",
            constraint=models.UniqueConstraint(
                condition=models.Q(("idempotency_key__gt", "")),
                fields=("created_by", "idempotency_key"),
                name="service_receipt_idempotency_uniq",
            ),
        ),
    ]
