import tempfile
from pathlib import Path
from urllib.parse import urlparse

import requests
from django.conf import settings
from django.http import HttpResponse
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status

from apps.academics.models import (
    Resource,
    AssignmentFile,
    SubmissionFile,
    PendingSubmissionFile,
)
from apps.library.models import Book
from .services import convert_to_pdf, FileConversionError


OFFICE_EXTENSIONS = {
    ".doc", ".docx", ".odt", ".rtf",
    ".xls", ".xlsx", ".ods",
    ".ppt", ".pptx", ".odp",
}
MAX_FILE_SIZE = 50 * 1024 * 1024


def _student_enrolled_in(course, student):
    return course.enrollments.filter(student=student).exists()


def _can_preview(user, file_type, obj):
    """Return whether this user may preview the selected database file."""

    if user.is_superuser or user.role == "admin":
        return True

    if file_type == "resource":
        faculty_course = obj.faculty_course
        if user.role == "faculty":
            return faculty_course.faculty == user.faculty_profile
        if user.role == "student":
            return _student_enrolled_in(
                faculty_course.course, user.student_profile
            )
        return False

    if file_type == "assignment":
        assignment = obj.assignment
        if user.role == "faculty":
            return assignment.faculty_course.faculty == user.faculty_profile
        if user.role == "student":
            return _student_enrolled_in(
                assignment.faculty_course.course, user.student_profile
            )
        return False

    if file_type in {"submission", "pending"}:
        if file_type == "submission":
            submission = obj.submission
            assignment = submission.assignment
            student = submission.student
            # A student's own submission is always theirs to preview.
            if user.role == "student":
                return student == user.student_profile
        else:
            assignment = obj.assignment
            student = obj.student
            if user.role == "student":
                return student == user.student_profile

        if user.role == "faculty":
            return assignment.faculty_course.faculty == user.faculty_profile
        return False

    if file_type == "book":
        # Existing library API exposes books to authenticated users.
        return user.is_authenticated

    return False


def _get_file_record(file_type, file_id):
    if file_type == "resource":
        return Resource.objects.select_related(
            "faculty_course__faculty", "faculty_course__course"
        ).get(resource_id=file_id), "file_url", "original_file_name"

    if file_type == "assignment":
        return AssignmentFile.objects.select_related(
            "assignment__faculty_course__faculty",
            "assignment__faculty_course__course",
        ).get(assignment_file_id=file_id), "file_url", "file_name"

    if file_type == "submission":
        return SubmissionFile.objects.select_related(
            "submission__student",
            "submission__assignment__faculty_course__faculty",
            "submission__assignment__faculty_course__course",
        ).get(submission_file_id=file_id), "file_url", "file_name"

    if file_type == "pending":
        return PendingSubmissionFile.objects.select_related(
            "student",
            "assignment__faculty_course__faculty",
            "assignment__faculty_course__course",
        ).get(pending_file_id=file_id), "file_url", "file_name"

    if file_type == "book":
        return Book.objects.get(pk=file_id), "pdf_url", "pdf_name"

    return None, None, None


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def preview_file(request, file_type, file_id):
    supported_types = {
        "resource", "assignment", "submission", "pending", "book"
    }
    if file_type not in supported_types:
        return Response(
            {"detail": "Unsupported file type."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    try:
        obj, url_field, name_field = _get_file_record(file_type, file_id)
    except (Resource.DoesNotExist, AssignmentFile.DoesNotExist,
            SubmissionFile.DoesNotExist, PendingSubmissionFile.DoesNotExist,
            Book.DoesNotExist):
        return Response(
            {"detail": "File not found."},
            status=status.HTTP_404_NOT_FOUND,
        )

    if not _can_preview(request.user, file_type, obj):
        return Response(
            {"detail": "You do not have permission to preview this file."},
            status=status.HTTP_403_FORBIDDEN,
        )

    file_url = getattr(obj, url_field, None)
    filename = Path(getattr(obj, name_field, "") or "document").name
    extension = Path(filename).suffix.lower()

    if not file_url:
        return Response(
            {"detail": "No file is attached to this record."},
            status=status.HTTP_404_NOT_FOUND,
        )

    if extension != ".pdf" and extension not in OFFICE_EXTENSIONS:
        return Response(
            {"detail": "Preview supports PDF and Office documents only."},
            status=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
        )

    parsed = urlparse(file_url)
    cloud_name = getattr(settings, "CLOUDINARY_CLOUD_NAME", "")
    expected_host = "res.cloudinary.com"

    # Only retrieve URLs belonging to this application's configured
    # Cloudinary account. Never accept a URL supplied by the client.
    if (
        parsed.scheme != "https"
        or parsed.hostname != expected_host
        or not cloud_name
        or parsed.path.split("/")[1:2] != [cloud_name]
    ):
        return Response(
            {"detail": "The stored file URL is not a trusted Cloudinary URL."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    try:
        with requests.get(
            file_url,
            stream=True,
            timeout=(5, 30),
            allow_redirects=False,
        ) as remote:
            remote.raise_for_status()

            length = remote.headers.get("Content-Length")
            if length and int(length) > MAX_FILE_SIZE:
                return Response(
                    {"detail": "Files must be no larger than 50 MB."},
                    status=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                )

            with tempfile.TemporaryDirectory(prefix="mosaic_preview_") as tmp:
                source_path = Path(tmp) / f"source{extension}"
                total = 0

                with source_path.open("wb") as output:
                    for chunk in remote.iter_content(chunk_size=64 * 1024):
                        if not chunk:
                            continue
                        total += len(chunk)
                        if total > MAX_FILE_SIZE:
                            return Response(
                                {"detail": "Files must be no larger than 50 MB."},
                                status=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                            )
                        output.write(chunk)

                if extension == ".pdf":
                    pdf_bytes = source_path.read_bytes()
                else:
                    pdf_bytes = convert_to_pdf(str(source_path))

        if not pdf_bytes.startswith(b"%PDF-"):
            return Response(
                {"detail": "The file could not be converted to a valid PDF."},
                status=status.HTTP_422_UNPROCESSABLE_ENTITY,
            )

        response = HttpResponse(pdf_bytes, content_type="application/pdf")
        response["Content-Disposition"] = (
            f'inline; filename="{Path(filename).stem}.pdf"'
        )
        response["X-Content-Type-Options"] = "nosniff"
        response["Cache-Control"] = "private, no-store"
        return response

    except requests.RequestException:
        return Response(
            {"detail": "Could not retrieve the stored file from Cloudinary."},
            status=status.HTTP_502_BAD_GATEWAY,
        )
    except (FileConversionError, OSError, ValueError) as exc:
        return Response(
            {"detail": f"Preview failed: {exc}"},
            status=status.HTTP_422_UNPROCESSABLE_ENTITY,
        )
