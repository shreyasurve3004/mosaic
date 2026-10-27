from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import EventRegistrationViewSet, EventViewSet, attachment_file


router = DefaultRouter()

router.register(
    r"registrations",
    EventRegistrationViewSet,
    basename="event-registration"
)

router.register(
    r"",
    EventViewSet,
    basename="event"
)


urlpatterns = [
    path(
        "<int:event_id>/attachments/<int:attachment_index>/file/",
        attachment_file,
        name="event-attachment-file",
    ),
    path("", include(router.urls)),
]