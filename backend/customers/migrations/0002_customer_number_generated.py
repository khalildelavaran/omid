from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("customers", "0001_initial"),
    ]

    operations = [
        migrations.AlterField(
            model_name="customer",
            name="customer_number",
            field=models.CharField(blank=True, db_index=True, default="", max_length=24, unique=True),
        ),
    ]
