from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [("applications", "0006_disbursement")]

    operations = [
        migrations.AlterField(
            model_name="stageinstance",
            name="code",
            field=models.CharField(
                max_length=24,
                choices=[
                    ("documents", "مدارک"),
                    ("account", "وضعیت حساب"),
                    ("merat", "اعتبارسنجی مرآت"),
                    ("e_note", "سفته الکترونیک"),
                    ("loan_submission", "ثبت درخواست وام"),
                    ("bank_review", "بررسی بانک"),
                    ("disbursement", "واریز تسهیلات"),
                    ("settlement", "تسویه"),
                    ("handover", "تحویل نهایی"),
                ],
            ),
        ),
    ]
