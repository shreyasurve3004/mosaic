from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("events", "0001_initial"),
    ]

    operations = [
        migrations.AddField(
            model_name="event",
            name="end_time",
            field=models.TimeField(blank=True, null=True),
        ),
    ]
