
from django.urls import path
from .views import preview_file

urlpatterns = [
    path(
        "<str:file_type>/<int:file_id>/preview/",
        preview_file,
        name="preview_file",
    ),
]
