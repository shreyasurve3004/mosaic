from django.conf import settings
from django.db import models


class Event(models.Model):
    EVENT_STATUS_CHOICES = [
        ("Upcoming", "Upcoming"),
        ("Ongoing", "Ongoing"),
        ("Completed", "Completed"),
        ("Cancelled", "Cancelled"),
    ]

    event_id = models.AutoField(primary_key=True)
    event_name = models.CharField(max_length=200)
    event_type = models.CharField(max_length=100)
    description = models.TextField()
    event_date = models.DateField()
    time = models.TimeField()
    end_time = models.TimeField(null=True, blank=True)
    location = models.CharField(max_length=200)
    room_no = models.CharField(max_length=50, blank=True, default="")
    organizer = models.CharField(max_length=200)
    capacity = models.PositiveIntegerField()
    status = models.CharField(
        max_length=20,
        choices=EVENT_STATUS_CHOICES,
        default="Upcoming"
    )

    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="created_events",
        null=True,
        blank=True
    )

    attachments = models.JSONField(default=list, blank=True)

    class Meta:
        ordering = ["event_date", "time"]

    def __str__(self):
        return self.event_name

    @property
    def registered_count(self):
        return self.registrations.filter(
            status__in=["Registered", "Attended"]
        ).count()

    @property
    def available_seats(self):
        return max(self.capacity - self.registered_count, 0)

    @property
    def is_full(self):
        return self.available_seats <= 0


class EventRegistration(models.Model):
    REGISTRATION_STATUS_CHOICES = [
        ("Registered", "Registered"),
        ("Cancelled", "Cancelled"),
        ("Attended", "Attended"),
    ]

    registration_id = models.AutoField(primary_key=True)

    event = models.ForeignKey(
        Event,
        on_delete=models.CASCADE,
        related_name="registrations"
    )

    student = models.ForeignKey(
        "users.Student",
        on_delete=models.CASCADE,
        related_name="event_registrations",
        to_field="roll_no",
        db_column="roll_no"
    )

    registration_date = models.DateTimeField(auto_now_add=True)

    status = models.CharField(
        max_length=20,
        choices=REGISTRATION_STATUS_CHOICES,
        default="Registered"
    )

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["event", "student"],
                name="unique_event_student_registration"
            )
        ]

    def __str__(self):
        return f"{self.event.event_name} - Student {self.student_id}"