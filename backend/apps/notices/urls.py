from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import NoticeReadViewSet, NoticeViewSet, attachment_file


router = DefaultRouter()

router.register(
    r"reads",
    NoticeReadViewSet,
    basename="notice-read",
)

router.register(
    r"",
    NoticeViewSet,
    basename="notice",
)


urlpatterns = [
    path(
        "<int:notice_id>/attachments/<int:attachment_index>/file/",
        attachment_file,
        name="notice-attachment-file",
    ),
    path("", include(router.urls)),
]