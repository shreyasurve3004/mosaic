from datetime import date
import re

from django.core.management.base import BaseCommand, CommandError
from django.utils import timezone

from apps.academics.models import AcademicCalendar


class Command(BaseCommand):
    help = "Seed a representative academic calendar for an academic year."

    def add_arguments(self, parser):
        parser.add_argument(
            "--academic-year",
            help="Academic year such as 2026-27. Defaults to the current year.",
        )
        parser.add_argument(
            "--semester",
            type=int,
            default=5,
            help="Semester used for semester-specific seed entries (default: 5).",
        )

    def handle(self, *args, **options):
        academic_year = options["academic_year"] or self._current_academic_year()
        match = re.fullmatch(r"(\d{4})-(?:\d{2}|\d{4})", academic_year)
        if not match:
            raise CommandError(
                "Academic year must use the Mosaic format, for example 2026-27."
            )

        start_year = int(match.group(1))
        semester = options["semester"]
        if not 1 <= semester <= 8:
            raise CommandError("Semester must be between 1 and 8.")

        events = [
            {
                "title": f"Semester {semester}",
                "category": "semester",
                "semester": semester,
                "start_date": date(start_year, 8, 1),
                "end_date": date(start_year, 12, 15),
                "description": "Teaching period for the semester.",
            },
            {
                "title": "Course Registration",
                "category": "registration",
                "semester": semester,
                "start_date": date(start_year, 7, 20),
                "end_date": date(start_year, 7, 30),
                "description": "Course registration period.",
            },
            {
                "title": "Course Registration Deadline",
                "category": "registration",
                "semester": semester,
                "start_date": date(start_year, 7, 31),
                "end_date": date(start_year, 7, 31),
                "description": "Final date to complete course registration.",
            },
            {
                "title": "Mid-Semester Examinations",
                "category": "examination",
                "semester": semester,
                "start_date": date(start_year, 9, 20),
                "end_date": date(start_year, 9, 27),
                "description": "Mid-semester examination period.",
            },
            {
                "title": "Diwali Holiday",
                "category": "holiday",
                "semester": None,
                "start_date": date(start_year, 10, 20),
                "end_date": date(start_year, 10, 24),
                "description": "Institution-wide holiday period.",
            },
            {
                "title": "End-Semester Examinations",
                "category": "examination",
                "semester": semester,
                "start_date": date(start_year, 12, 1),
                "end_date": date(start_year, 12, 15),
                "description": "End-semester examination period.",
            },
            {
                "title": "Semester Break",
                "category": "semester_break",
                "semester": None,
                "start_date": date(start_year, 12, 16),
                "end_date": date(start_year + 1, 1, 10),
                "description": "Institution-wide semester break.",
            },
            {
                "title": "Result Declaration",
                "category": "result",
                "semester": semester,
                "start_date": date(start_year + 1, 1, 10),
                "end_date": date(start_year + 1, 1, 10),
                "description": "Expected result declaration date.",
            },
            {
                "title": "Academic Orientation",
                "category": "academic_event",
                "semester": None,
                "start_date": date(start_year, 8, 1),
                "end_date": date(start_year, 8, 1),
                "description": "Institutional academic orientation.",
            },
        ]
        if semester < 8:
            next_semester = semester + 1
            events.append({
                "title": f"Semester {next_semester}",
                "category": "semester",
                "semester": next_semester,
                "start_date": date(start_year + 1, 1, 11),
                "end_date": date(start_year + 1, 5, 20),
                "description": "Teaching period for the next semester.",
            })

        created = 0
        for event in events:
            _, was_created = AcademicCalendar.objects.get_or_create(
                academic_year=academic_year,
                title=event["title"],
                semester=event["semester"],
                defaults={
                    key: value
                    for key, value in event.items()
                    if key not in {"title", "semester"}
                },
            )
            created += int(was_created)

        self.stdout.write(
            self.style.SUCCESS(
                f"Academic calendar ready for {academic_year}; "
                f"created {created} entries."
            )
        )

    @staticmethod
    def _current_academic_year():
        today = timezone.localdate()
        start_year = today.year if today.month >= 7 else today.year - 1
        return f"{start_year}-{(start_year + 1) % 100:02d}"
