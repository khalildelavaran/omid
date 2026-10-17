from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("customers", "0002_customer_number_generated"),
    ]

    operations = [
        migrations.AddField(
            model_name="customer",
            name="national_id",
            field=models.CharField(blank=True, max_length=20),
        ),
        migrations.AddField(
            model_name="customer",
            name="birth_date",
            field=models.DateField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name="customer",
            name="father_name",
            field=models.CharField(blank=True, max_length=100),
        ),
        migrations.AddField(
            model_name="customer",
            name="occupation",
            field=models.CharField(blank=True, max_length=150),
        ),
        migrations.AddField(
            model_name="customer",
            name="postal_code",
            field=models.CharField(blank=True, max_length=20),
        ),
        migrations.AddField(
            model_name="customer",
            name="sana_verified",
            field=models.BooleanField(default=False),
        ),
        migrations.AlterField(
            model_name="customer",
            name="status",
            field=models.CharField(
                choices=[
                    ("active", "فعال"),
                    ("needs_review", "نیازمند بررسی"),
                    ("inactive", "غیرفعال"),
                    ("archived", "بایگانی‌شده"),
                ],
                default="active",
                max_length=16,
            ),
        ),
    ]
