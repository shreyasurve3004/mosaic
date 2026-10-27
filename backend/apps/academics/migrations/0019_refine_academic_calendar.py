from django.db import migrations, models
from django.utils import timezone


def map_calendar_categories(apps, schema_editor):
    AcademicCalendar = apps.get_model("academics", "AcademicCalendar")
    AcademicCalendar.objects.filter(category="academic").update(
        category="academic_event"
    )
    AcademicCalendar.objects.filter(category="exam").update(
        category="examination"
    )
    AcademicCalendar.objects.filter(category="event").update(
        category="academic_event"
    )


class Migration(migrations.Migration):
    dependencies = [
        ("academics", "0018_resource_original_file_name"),
    ]

    operations = [
        migrations.RenameField(
            model_name="academiccalendar",
            old_name="event_name",
            new_name="title",
        ),
        migrations.RenameField(
            model_name="academiccalendar",
            old_name="event_type",
            new_name="category",
        ),
        migrations.AddField(
            model_name="academiccalendar",
            name="semester",
            field=models.PositiveSmallIntegerField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name="academiccalendar",
            name="created_at",
            field=models.DateTimeField(
                auto_now_add=True,
                default=timezone.now,
            ),
            preserve_default=False,
        ),
        migrations.AddField(
            model_name="academiccalendar",
            name="updated_at",
            field=models.DateTimeField(
                auto_now=True,
                default=timezone.now,
            ),
            preserve_default=False,
        ),
        migrations.RunPython(
            map_calendar_categories,
            migrations.RunPython.noop,
        ),
        migrations.AlterField(
            model_name="academiccalendar",
            name="category",
            field=models.CharField(
                choices=[
                    ("semester", "Semester"),
                    ("examination", "Examination"),
                    ("holiday", "Holiday"),
                    ("registration", "Registration"),
                    ("result", "Result Declaration"),
                    ("semester_break", "Semester Break"),
                    ("academic_event", "Academic Event"),
                    ("other", "Other"),
                ],
                max_length=20,
            ),
        ),
        migrations.AlterModelOptions(
            name="academiccalendar",
            options={"ordering": ["start_date", "end_date", "calendar_id"]},
        ),
        migrations.AddConstraint(
            model_name="academiccalendar",
            constraint=models.CheckConstraint(
                condition=models.Q(
                    end_date__gte=models.F("start_date")
                ),
                name="academic_calendar_valid_date_range",
            ),
        ),
    ]
