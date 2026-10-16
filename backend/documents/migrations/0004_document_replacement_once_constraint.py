from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("documents", "0003_document_replaces_document"),
    ]

    operations = [
        migrations.AddConstraint(
            model_name="document",
            constraint=models.UniqueConstraint(
                condition=models.Q(replaces_document__isnull=False),
                fields=("replaces_document",),
                name="doc_replacement_once_uniq",
            ),
        ),
    ]
