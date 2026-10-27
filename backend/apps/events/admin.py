from django.contrib import admin

from .models import Event, EventRegistration
from .utils import mark_past_events_completed


@admin.register(Event)
class EventAdmin(admin.ModelAdmin):
    list_display = (
        "event_id",
        "event_name",
        "event_date",
        "status",
        "capacity",
    )
    list_filter = ("status", "event_type")
    search_fields = ("event_name", "organizer")

    def get_queryset(self, request):
        mark_past_events_completed()
        return super().get_queryset(request)


@admin.register(EventRegistration)
class EventRegistrationAdmin(admin.ModelAdmin):
    list_display = (
        "registration_id",
        "event",
        "student",
        "status",
        "registration_date",
    )
    list_filter = ("status",)