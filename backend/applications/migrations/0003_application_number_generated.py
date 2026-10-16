from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("applications", "0002_applicationevent"),
    ]

    operations = [
        migrations.AlterField(
            model_name="loanapplication",
            name="application_number",
            field=models.CharField(blank=True, db_index=True, default="", max_length=32, unique=True),
        ),
    ]
