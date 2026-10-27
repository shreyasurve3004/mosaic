from datetime import datetime
from zoneinfo import ZoneInfo

from django.db import transaction
from django.db.models import Q
from django.shortcuts import get_object_or_404
from django.utils import timezone

from config.file_delivery import serve_cloudinary_file

from rest_framework import status, viewsets
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.exceptions import PermissionDenied
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from .cloudinary_utils import delete_attachment, upload_attachment
from .models import Event, EventRegistration
from .serializers import EventRegistrationSerializer, EventSerializer
from .utils import mark_past_events_completed


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def attachment_file(request, event_id, attachment_index):
    event = get_object_or_404(Event, event_id=event_id)
    attachments = event.attachments or []

    if attachment_index >= len(attachments):
        return Response(
            {"error": "Attachment not found."},
            status=status.HTTP_404_NOT_FOUND,
        )

    attachment = attachments[attachment_index]
    file_url = attachment.get("file_url")

    if not file_url:
        return Response(
            {"error": "Attachment has no file URL."},
            status=status.HTTP_404_NOT_FOUND,
        )

    return serve_cloudinary_file(
        request,
        file_url,
        attachment.get("file_name") or f"event-{event_id}-attachment",
    )


class EventViewSet(viewsets.ModelViewSet):
    serializer_class = EventSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        mark_past_events_completed()
        queryset = Event.objects.all()
        params = self.request.query_params

        if params.get("search"):
            search = params["search"]
            queryset = queryset.filter(
                Q(event_name__icontains=search)
                | Q(event_type__icontains=search)
                | Q(description__icontains=search)
                | Q(location__icontains=search)
                | Q(room_no__icontains=search)
                | Q(organizer__icontains=search)
            )

        if params.get("event_type"):
            queryset = queryset.filter(
                event_type__iexact=params["event_type"]
            )

        if params.get("status"):
            queryset = queryset.filter(
                status__iexact=params["status"]
            )

        if params.get("location"):
            queryset = queryset.filter(
                location__icontains=params["location"]
            )

        if params.get("organizer"):
            queryset = queryset.filter(
                organizer__icontains=params["organizer"]
            )

        if params.get("upcoming") == "true":
            queryset = queryset.filter(
                event_date__gte=timezone.localdate()
            ).exclude(
                status__in=["Completed", "Cancelled"]
            )

        return queryset

    def is_staff_role(self):
        return self.request.user.role in ["faculty", "admin"]

    def perform_create(self, serializer):
        if not self.is_staff_role():
            raise PermissionDenied(
                "Only Faculty or Admin can create events."
            )

        serializer.save(created_by=self.request.user)

    def perform_update(self, serializer):
        if not self.is_staff_role():
            raise PermissionDenied(
                "Only Faculty or Admin can edit events."
            )

        serializer.save()

    def perform_destroy(self, instance):
        if self.request.user.role != "admin":
            raise PermissionDenied(
                "Only Admin can delete events."
            )

        for attachment in instance.attachments or []:
            delete_attachment(
                attachment.get("public_id"),
                attachment.get("resource_type", "image")
            )

        instance.delete()

    @action(
        detail=False,
        methods=["get"],
        url_path="upcoming"
    )
    def upcoming(self, request):
        now = timezone.localtime(
            timezone.now(),
            ZoneInfo("Asia/Kolkata"),
        )

        queryset = self.get_queryset().filter(
            Q(status="Ongoing")
            | Q(
                event_date__gt=now.date()
            )
            |
            Q(
                event_date=now.date(),
                time__gt=now.time()
            )
        ).exclude(
            status__in=["Completed", "Cancelled"]
        ).order_by(
            "event_date",
            "time"
        )

        return Response(
            self.get_serializer(
                queryset,
                many=True
            ).data
        )

    def registrations(self, request, pk=None):
        if request.user.role not in ["faculty", "admin"]:
            return Response(
                {
                    "error": (
                        "Only Faculty or Admin can view registrations."
                    )
                },
                status=status.HTTP_403_FORBIDDEN
            )

        event = self.get_object()

        queryset = EventRegistration.objects.filter(
            event=event
        ).order_by("-registration_date")

        return Response(
            EventRegistrationSerializer(
                queryset,
                many=True
            ).data
        )

    @action(
        detail=True,
        methods=["post"],
        url_path="register"
    )
    def register_student(self, request, pk=None):
        if request.user.role != "student":
            return Response(
                {
                    "error": (
                        "Only Student accounts can register for events."
                    )
                },
                status=status.HTTP_403_FORBIDDEN
            )

        student = getattr(
            request.user,
            "student_profile",
            None
        )

        if student is None:
            return Response(
                {
                    "error": (
                        "Student profile is missing. "
                        "Ask an administrator to configure your account."
                    )
                },
                status=status.HTTP_400_BAD_REQUEST
            )

        with transaction.atomic():
            try:
                event = Event.objects.select_for_update().get(
                    pk=pk
                )
            except Event.DoesNotExist:
                return Response(
                    {"error": "Event not found."},
                    status=status.HTTP_404_NOT_FOUND
                )

            if event.status in ["Cancelled", "Completed"]:
                return Response(
                    {
                        "error": (
                            f"Cannot register for a "
                            f"{event.status.lower()} event."
                        )
                    },
                    status=status.HTTP_400_BAD_REQUEST
                )

            event_datetime = timezone.make_aware(
                datetime.combine(
                    event.event_date,
                    event.time
                )
            )

            if event_datetime <= timezone.now():
                return Response(
                    {
                        "error": (
                            "Registration is closed because "
                            "the event has started or passed."
                        )
                    },
                    status=status.HTTP_400_BAD_REQUEST
                )

            existing = EventRegistration.objects.filter(
                event=event,
                student=student
            ).first()

            if existing and existing.status == "Registered":
                return Response(
                    {
                        "error": (
                            "You are already registered "
                            "for this event."
                        )
                    },
                    status=status.HTTP_400_BAD_REQUEST
                )

            if event.available_seats <= 0:
                return Response(
                    {
                        "error": (
                            "Event is full. "
                            "No seats are available."
                        )
                    },
                    status=status.HTTP_400_BAD_REQUEST
                )

            if existing:
                existing.status = "Registered"
                existing.registration_date = timezone.now()
                existing.save(
                    update_fields=[
                        "status",
                        "registration_date"
                    ]
                )
                registration = existing
            else:
                registration = EventRegistration.objects.create(
                    event=event,
                    student=student
                )

        return Response(
            {
                "message": "Registration successful.",
                "registration": EventRegistrationSerializer(
                    registration
                ).data,
                "event": EventSerializer(
                    event,
                    context={"request": request}
                ).data,
            },
            status=status.HTTP_201_CREATED
        )
        

    @action(
        detail=True,
        methods=["post"],
        url_path="cancel-registration"
    )
    def cancel_registration(self, request, pk=None):
        if request.user.role != "student":
            return Response(
                {
                    "error": (
                        "Only Student accounts can cancel "
                        "registrations."
                    )
                },
                status=status.HTTP_403_FORBIDDEN
            )

        student = getattr(
            request.user,
            "student_profile",
            None
        )

        if student is None:
            return Response(
                {"error": "Student profile not found."},
                status=status.HTTP_400_BAD_REQUEST
            )

        event = self.get_object()

        registration = EventRegistration.objects.filter(
            event=event,
            student=student
        ).first()

        if registration is None:
            return Response(
                {"error": "Registration not found."},
                status=status.HTTP_404_NOT_FOUND
            )

        if registration.status == "Attended":
            return Response(
                {
                    "error": (
                        "An attended registration "
                        "cannot be cancelled."
                    )
                },
                status=status.HTTP_400_BAD_REQUEST
            )

        registration.status = "Cancelled"
        registration.save(update_fields=["status"])

        return Response(
            {
                "message": "Registration cancelled successfully.",
                "registration": EventRegistrationSerializer(
                    registration
                ).data,
                "event": EventSerializer(
                    event,
                    context={"request": request}
                ).data,
            }
        )

    @action(
        detail=True,
        methods=["post"],
        url_path="mark-attended"
    )
    def mark_attended(self, request, pk=None):
        if request.user.role not in ["faculty", "admin"]:
            return Response(
                {
                    "error": (
                        "Only Faculty or Admin can "
                        "mark attendance."
                    )
                },
                status=status.HTTP_403_FORBIDDEN
            )

        roll_no = request.data.get("roll_no")

        if not roll_no:
            return Response(
                {"error": "roll_no is required."},
                status=status.HTTP_400_BAD_REQUEST
            )

        event = self.get_object()

        registration = EventRegistration.objects.filter(
            event=event,
            student_id=roll_no
        ).first()

        if registration is None:
            return Response(
                {"error": "Registration not found."},
                status=status.HTTP_404_NOT_FOUND
            )

        if registration.status != "Registered":
            return Response(
                {
                    "error": (
                        "Only registered students "
                        "can be marked as attended."
                    )
                },
                status=status.HTTP_400_BAD_REQUEST
            )

        registration.status = "Attended"
        registration.save(update_fields=["status"])

        return Response(
            EventRegistrationSerializer(
                registration
            ).data
        )

    @action(
        detail=True,
        methods=["post"],
        url_path="attachments/upload"
    )
    def upload_files(self, request, pk=None):
        if not self.is_staff_role():
            return Response(
                {
                    "error": (
                        "Only Faculty or Admin can "
                        "upload attachments."
                    )
                },
                status=status.HTTP_403_FORBIDDEN
            )

        event = self.get_object()

        files = request.FILES.getlist("files")

        if not files:
            return Response(
                {"error": "Select at least one file."},
                status=status.HTTP_400_BAD_REQUEST
            )

        attachments = list(event.attachments or [])
        new_attachments = []

        try:
            for file in files:
                attachment = upload_attachment(
                    file,
                    f"mosaic/events/{event.event_id}",
                )
                new_attachments.append(attachment)

            event.attachments = attachments + new_attachments
            event.save(update_fields=["attachments"])

        except Exception as error:
            for attachment in new_attachments:
                try:
                    delete_attachment(
                        attachment.get("public_id"),
                        attachment.get("resource_type") or "image",
                    )
                except Exception:
                    pass

            return Response(
                {
                    "error": "Event attachment upload failed.",
                    "details": str(error),
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        return Response(
            self.get_serializer(event).data
        )

    @action(
        detail=True,
        methods=["delete"],
        url_path="attachments/delete"
    )
    def delete_file(self, request, pk=None):
        if not self.is_staff_role():
            return Response(
                {
                    "error": (
                        "Only Faculty or Admin can "
                        "delete attachments."
                    )
                },
                status=status.HTTP_403_FORBIDDEN
            )

        event = self.get_object()

        public_id = request.data.get("public_id")

        if not public_id:
            return Response(
                {"error": "public_id is required."},
                status=status.HTTP_400_BAD_REQUEST
            )

        attachments = event.attachments or []

        target = next(
            (
                attachment
                for attachment in attachments
                if attachment.get("public_id") == public_id
            ),
            None
        )

        if target is None:
            return Response(
                {"error": "Attachment not found."},
                status=status.HTTP_404_NOT_FOUND
            )

        delete_attachment(
            public_id,
            target.get("resource_type", "image")
        )

        event.attachments = [
            attachment
            for attachment in attachments
            if attachment.get("public_id") != public_id
        ]

        event.save(update_fields=["attachments"])

        return Response(
            self.get_serializer(event).data
        )


class EventRegistrationViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = EventRegistrationSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        queryset = EventRegistration.objects.select_related(
            "event",
            "student"
        ).all()

        role = self.request.user.role

        if role == "student":
            student = getattr(
                self.request.user,
                "student_profile",
                None
            )

            if student is None:
                return queryset.none()

            queryset = queryset.filter(
                student=student
            )

        elif role not in ["faculty", "admin"]:
            return queryset.none()

        if self.request.query_params.get("event"):
            queryset = queryset.filter(
                event_id=self.request.query_params["event"]
            )

        if self.request.query_params.get("status"):
            queryset = queryset.filter(
                status__iexact=self.request.query_params["status"]
            )

        return queryset