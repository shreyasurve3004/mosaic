from zoneinfo import ZoneInfo

from django.utils import timezone

from .models import Event


def mark_past_events_completed():
    india_now = timezone.localtime(
        timezone.now(),
        ZoneInfo("Asia/Kolkata"),
    )
    active_events = Event.objects.filter(
        status__in=["Upcoming", "Ongoing"],
    )

    active_events.filter(
        event_date__lt=india_now.date(),
    ).update(status="Completed")
    active_events.filter(
        event_date__gt=india_now.date(),
        status="Ongoing",
    ).update(status="Upcoming")

    today_events = active_events.filter(
        event_date=india_now.date(),
    )
    today_events.filter(
        end_time__isnull=False,
        end_time__lte=india_now.time(),
    ).update(status="Completed")
    today_events.filter(
        time__lte=india_now.time(),
    ).filter(
        end_time__gt=india_now.time(),
    ).update(status="Ongoing")
    today_events.filter(
        time__gt=india_now.time(),
    ).update(status="Upcoming")
    today_events.filter(
        end_time__isnull=True,
        time__lte=india_now.time(),
    ).update(status="Ongoing")
