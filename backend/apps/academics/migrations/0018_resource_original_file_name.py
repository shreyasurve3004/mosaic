from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("academics", "0017_academiccalendar"),
    ]

    operations = [
        migrations.AddField(
            model_name="resource",
            name="original_file_name",
            field=models.CharField(
                blank=True,
                default="",
                max_length=255,
            ),
        ),
    ]
