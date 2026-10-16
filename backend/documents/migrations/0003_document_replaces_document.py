from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):
    dependencies = [
        ("documents", "0002_alter_document_file"),
    ]

    operations = [
        migrations.AddField(
            model_name="document",
            name="replaces_document",
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.PROTECT,
                related_name="replacement_documents",
                to="documents.document",
            ),
        ),
    ]
