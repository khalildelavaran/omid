import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("applications", "0003_application_number_generated"),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.AddField(
            model_name="loanapplication",
            name="archived_at",
            field=models.DateTimeField(blank=True, db_index=True, null=True),
        ),
        migrations.AddField(
            model_name="loanapplication",
            name="archived_by",
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name="archived_loan_applications",
                to=settings.AUTH_USER_MODEL,
            ),
        ),
        migrations.AlterField(
            model_name="applicationevent",
            name="event_type",
            field=models.CharField(
                choices=[
                    ("created", "ثبت پرونده"),
                    ("status_changed", "تغییر وضعیت"),
                    ("note_added", "یادداشت پیگیری"),
                    ("archived", "بایگانی پرونده"),
                ],
                max_length=24,
            ),
        ),
    ]
