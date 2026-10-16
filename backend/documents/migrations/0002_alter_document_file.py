from django.db import migrations, models
import documents.models
import documents.storage


class Migration(migrations.Migration):
    dependencies = [
        ("documents", "0001_initial"),
    ]

    operations = [
        migrations.AlterField(
            model_name="document",
            name="file",
            field=models.FileField(
                storage=documents.storage.PrivateDocumentStorage(),
                upload_to=documents.models.private_document_path,
            ),
        ),
    ]
