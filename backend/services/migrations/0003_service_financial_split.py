from django.db import migrations, models
from django.db.models import F


def populate_existing_commission(apps, schema_editor):
    ServiceRecord = apps.get_model("services", "ServiceRecord")
    ServiceRecord.objects.update(company_commission=F("total"))


class Migration(migrations.Migration):
    dependencies = [("services", "0002_servicerecord_idempotency")]

    operations = [
        migrations.AddField(
            model_name="servicecatalogitem",
            name="online_cost",
            field=models.DecimalField(default=0, max_digits=18, decimal_places=0),
        ),
        migrations.AddField(
            model_name="servicerecord",
            name="online_cost",
            field=models.DecimalField(default=0, max_digits=18, decimal_places=0),
        ),
        migrations.AddField(
            model_name="servicerecord",
            name="company_commission",
            field=models.DecimalField(default=0, max_digits=18, decimal_places=0),
        ),
        migrations.RunPython(populate_existing_commission, migrations.RunPython.noop),
        migrations.AddConstraint(
            model_name="servicecatalogitem",
            constraint=models.CheckConstraint(condition=models.Q(("online_cost__gte", 0)), name="service_catalog_online_cost_nonnegative"),
        ),
        migrations.AddConstraint(
            model_name="servicecatalogitem",
            constraint=models.CheckConstraint(condition=models.Q(("online_cost__lte", F("price"))), name="service_catalog_online_cost_lte_price"),
        ),
        migrations.AddConstraint(
            model_name="servicerecord",
            constraint=models.CheckConstraint(condition=models.Q(("online_cost__gte", 0)), name="service_receipt_online_cost_nonnegative"),
        ),
        migrations.AddConstraint(
            model_name="servicerecord",
            constraint=models.CheckConstraint(condition=models.Q(("company_commission__gte", 0)), name="service_receipt_company_commission_nonnegative"),
        ),
        migrations.AddConstraint(
            model_name="servicerecord",
            constraint=models.CheckConstraint(condition=models.Q(("total", F("online_cost") + F("company_commission"))), name="service_receipt_financial_split_matches_total"),
        ),
    ]
