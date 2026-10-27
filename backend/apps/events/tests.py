from datetime import time, timedelta
from unittest.mock import patch

from django.http import HttpResponse
from django.utils import timezone
from rest_framework.test import APIClient, APITestCase

from apps.users.models import User, Student, Faculty
from apps.academics.models import Department
from .models import Event, EventRegistration


class EventModuleTests(APITestCase):

    def setUp(self):
        self.client = APIClient()

        self.department = Department.objects.create(
            department_name="Computer Engineering",
            department_code="COMP",
        )

        self.admin = User.objects.create_user(
            email="event_admin@test.com",
            password="Test@123",
            first_name="Event",
            last_name="Admin",
            role="admin",
            status="active",
            is_verified=True,
        )

        self.faculty_user = User.objects.create_user(
            email="event_faculty@test.com",
            password="Test@123",
            first_name="Event",
            last_name="Faculty",
            role="faculty",
            status="active",
            is_verified=True,
        )

        self.student_user = User.objects.create_user(
            email="event_student@test.com",
            password="Test@123",
            first_name="Event",
            last_name="Student",
            role="student",
            status="active",
            is_verified=True,
        )

        self.student = Student.objects.create(
            user=self.student_user,
            roll_no="EVT001",
            full_name="Event Student",
            year=3,
            sem=5,
            div="A",
            academic_year="2026-27",
            scheme="2021",
            branch="Computer Engineering",
            department=self.department,
        )

        self.event = Event.objects.create(
            event_name="Tech Symposium",
            event_type="Technical",
            description="Annual technical symposium",
            event_date=timezone.localdate() + timedelta(days=10),
            time="10:00:00",
            location="Main Auditorium",
            room_no="AUD101",
            organizer="Computer Engineering Department",
            capacity=100,
            status="Upcoming",
            created_by=self.faculty_user,
        )

    def authenticate(self, user):
        self.client.force_authenticate(user=user)

    def test_unauthenticated_user_cannot_access_events(self):
        self.client.force_authenticate(user=None)

        response = self.client.get("/api/events/")

        self.assertEqual(response.status_code, 401)

    def test_authenticated_user_can_view_events(self):
        self.authenticate(self.student_user)

        response = self.client.get("/api/events/")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(
            response.data[0]["event_name"],
            "Tech Symposium",
        )

    @patch("apps.events.utils.timezone.now")
    def test_past_events_are_completed_when_event_list_is_viewed(self, mock_now):
        mock_now.return_value = timezone.datetime(
            2026,
            10,
            4,
            12,
            0,
            tzinfo=timezone.get_fixed_timezone(0),
        )
        self.event.event_date = timezone.datetime(2026, 10, 3).date()
        self.event.save(update_fields=["event_date"])
        self.authenticate(self.faculty_user)

        response = self.client.get("/api/events/")

        self.assertEqual(response.status_code, 200)
        self.event.refresh_from_db()
        self.assertEqual(self.event.status, "Completed")
        self.assertEqual(response.data[0]["status"], "Completed")

    @patch("apps.events.utils.timezone.now")
    def test_event_becomes_ongoing_at_start_time(self, mock_now):
        mock_now.return_value = timezone.datetime(
            2026,
            10,
            4,
            8,
            30,
            tzinfo=timezone.get_fixed_timezone(0),
        )
        self.event.event_date = timezone.datetime(2026, 10, 4).date()
        self.event.time = time(14, 0)
        self.event.end_time = time(16, 0)
        self.event.save(update_fields=["event_date", "time", "end_time"])
        self.authenticate(self.faculty_user)

        response = self.client.get("/api/events/")

        self.assertEqual(response.status_code, 200)
        self.event.refresh_from_db()
        self.assertEqual(self.event.status, "Ongoing")
        self.assertEqual(response.data[0]["status"], "Ongoing")

        upcoming_response = self.client.get("/api/events/upcoming/")
        self.assertEqual(upcoming_response.status_code, 200)
        self.assertEqual(
            [event["event_id"] for event in upcoming_response.data],
            [self.event.event_id],
        )

    @patch("apps.events.utils.timezone.now")
    def test_event_becomes_completed_at_end_time(self, mock_now):
        mock_now.return_value = timezone.datetime(
            2026,
            10,
            4,
            11,
            0,
            tzinfo=timezone.get_fixed_timezone(0),
        )
        self.event.event_date = timezone.datetime(2026, 10, 4).date()
        self.event.time = time(14, 0)
        self.event.end_time = time(16, 0)
        self.event.save(update_fields=["event_date", "time", "end_time"])
        self.authenticate(self.admin)

        response = self.client.get("/api/events/")

        self.assertEqual(response.status_code, 200)
        self.event.refresh_from_db()
        self.assertEqual(self.event.status, "Completed")

    @patch("apps.events.utils.timezone.now")
    def test_cancelled_past_events_remain_cancelled(self, mock_now):
        mock_now.return_value = timezone.datetime(
            2026,
            10,
            4,
            12,
            0,
            tzinfo=timezone.get_fixed_timezone(0),
        )
        self.event.event_date = timezone.datetime(2026, 10, 3).date()
        self.event.status = "Cancelled"
        self.event.save(update_fields=["event_date", "status"])
        self.authenticate(self.admin)

        response = self.client.get("/api/events/")

        self.assertEqual(response.status_code, 200)
        self.event.refresh_from_db()
        self.assertEqual(self.event.status, "Cancelled")

    @patch("apps.events.views.serve_cloudinary_file")
    def test_event_attachment_requires_authentication(self, serve_file):
        self.event.attachments = [
            {
                "file_name": "event-poster.png",
                "file_url": "https://res.cloudinary.com/demo/image/upload/poster.png",
            }
        ]
        self.event.save(update_fields=["attachments"])
        serve_file.return_value = HttpResponse("file")

        anonymous_response = self.client.get(
            f"/api/events/{self.event.event_id}/attachments/0/file/"
        )
        self.assertEqual(anonymous_response.status_code, 401)
        serve_file.assert_not_called()

        self.authenticate(self.student_user)
        response = self.client.get(
            f"/api/events/{self.event.event_id}/attachments/0/file/?download=1"
        )

        self.assertEqual(response.status_code, 200)
        serve_file.assert_called_once()
        self.assertEqual(
            serve_file.call_args.args[0].GET["download"],
            "1",
        )
        self.assertEqual(
            serve_file.call_args.args[1:],
            (
                self.event.attachments[0]["file_url"],
                self.event.attachments[0]["file_name"],
            ),
        )

    def test_student_cannot_create_event(self):
        self.authenticate(self.student_user)

        response = self.client.post(
            "/api/events/",
            {
                "event_name": "Unauthorized Event",
                "event_type": "Technical",
                "description": "Test event",
                "event_date": str(
                    timezone.localdate() + timedelta(days=20)
                ),
                "time": "10:00:00",
                "end_time": "12:00:00",
                "location": "Room 101",
                "room_no": "101",
                "organizer": "Student",
                "capacity": 50,
                "status": "Upcoming",
            },
            format="json",
        )

        self.assertEqual(response.status_code, 403)

    def test_faculty_can_create_event(self):
        self.authenticate(self.faculty_user)

        response = self.client.post(
            "/api/events/",
            {
                "event_name": "Faculty Event",
                "event_type": "Workshop",
                "description": "Faculty-created workshop",
                "event_date": str(
                    timezone.localdate() + timedelta(days=20)
                ),
                "time": "11:00:00",
                "end_time": "13:00:00",
                "location": "Seminar Hall",
                "room_no": "SH101",
                "organizer": "Faculty",
                "capacity": 50,
                "status": "Upcoming",
            },
            format="json",
        )

        self.assertEqual(response.status_code, 201)

        created_event = Event.objects.get(
            event_name="Faculty Event"
        )

        self.assertEqual(
            created_event.created_by,
            self.faculty_user,
        )
        self.assertEqual(created_event.end_time, time(13, 0))

    def test_event_end_time_must_be_after_start_time(self):
        self.authenticate(self.faculty_user)

        response = self.client.post(
            "/api/events/",
            {
                "event_name": "Invalid Time Range",
                "event_type": "Workshop",
                "description": "Invalid event time range.",
                "event_date": str(
                    timezone.localdate() + timedelta(days=20)
                ),
                "time": "14:00:00",
                "end_time": "14:00:00",
                "location": "Seminar Hall",
                "room_no": "SH101",
                "organizer": "Faculty",
                "capacity": 50,
                "status": "Upcoming",
            },
            format="json",
        )

        self.assertEqual(response.status_code, 400)
        self.assertIn("end_time", response.data)

    def test_admin_can_create_event(self):
        self.authenticate(self.admin)

        response = self.client.post(
            "/api/events/",
            {
                "event_name": "Admin Event",
                "event_type": "Seminar",
                "description": "Admin-created seminar",
                "event_date": str(
                    timezone.localdate() + timedelta(days=25)
                ),
                "time": "14:00:00",
                "end_time": "16:00:00",
                "location": "Auditorium",
                "room_no": "AUD201",
                "organizer": "Admin",
                "capacity": 200,
                "status": "Upcoming",
            },
            format="json",
        )

        self.assertEqual(response.status_code, 201)

    def test_student_can_register_for_event(self):
        self.authenticate(self.student_user)

        response = self.client.post(
            f"/api/events/{self.event.event_id}/register/",
        )

        self.assertEqual(response.status_code, 201)

        self.assertTrue(
            EventRegistration.objects.filter(
                event=self.event,
                student=self.student,
                status="Registered",
            ).exists()
        )

        self.event.refresh_from_db()

        self.assertEqual(self.event.registered_count, 1)
        self.assertEqual(self.event.available_seats, 99)

    def test_student_cannot_register_twice(self):
        EventRegistration.objects.create(
            event=self.event,
            student=self.student,
            status="Registered",
        )

        self.authenticate(self.student_user)

        response = self.client.post(
            f"/api/events/{self.event.event_id}/register/",
        )

        self.assertEqual(response.status_code, 400)

    def test_student_can_cancel_registration(self):
        registration = EventRegistration.objects.create(
            event=self.event,
            student=self.student,
            status="Registered",
        )

        self.authenticate(self.student_user)

        response = self.client.post(
            f"/api/events/{self.event.event_id}/cancel-registration/",
        )

        self.assertEqual(response.status_code, 200)

        registration.refresh_from_db()

        self.assertEqual(registration.status, "Cancelled")

    def test_student_can_re_register_after_cancellation(self):
        EventRegistration.objects.create(
            event=self.event,
            student=self.student,
            status="Cancelled",
        )

        self.authenticate(self.student_user)

        response = self.client.post(
            f"/api/events/{self.event.event_id}/register/",
        )

        self.assertEqual(response.status_code, 201)

        registration = EventRegistration.objects.get(
            event=self.event,
            student=self.student,
        )

        self.assertEqual(registration.status, "Registered")

    def test_full_event_rejects_registration(self):
        self.event.capacity = 1
        self.event.save()

        other_user = User.objects.create_user(
            email="event_student2@test.com",
            password="Test@123",
            first_name="Second",
            last_name="Student",
            role="student",
            status="active",
            is_verified=True,
        )

        other_student = Student.objects.create(
            user=other_user,
            roll_no="EVT002",
            full_name="Second Student",
            year=3,
            sem=5,
            div="A",
            academic_year="2026-27",
            scheme="2021",
            branch="Computer Engineering",
            department=self.department,
        )

        EventRegistration.objects.create(
            event=self.event,
            student=self.student,
            status="Registered",
        )

        self.authenticate(other_user)

        response = self.client.post(
            f"/api/events/{self.event.event_id}/register/",
        )

        self.assertEqual(response.status_code, 400)

    def test_student_cannot_register_for_cancelled_event(self):
        self.event.status = "Cancelled"
        self.event.save()

        self.authenticate(self.student_user)

        response = self.client.post(
            f"/api/events/{self.event.event_id}/register/",
        )

        self.assertEqual(response.status_code, 400)

    def test_student_cannot_register_for_completed_event(self):
        self.event.status = "Completed"
        self.event.save()

        self.authenticate(self.student_user)

        response = self.client.post(
            f"/api/events/{self.event.event_id}/register/",
        )

        self.assertEqual(response.status_code, 400)

    def test_student_cannot_register_after_event_time(self):
        self.event.event_date = timezone.localdate()
        self.event.time = (
            timezone.localtime() - timedelta(hours=1)
        ).time()
        self.event.save()

        self.authenticate(self.student_user)

        response = self.client.post(
            f"/api/events/{self.event.event_id}/register/",
        )

        self.assertEqual(response.status_code, 400)

    def test_student_can_view_own_registrations(self):
        EventRegistration.objects.create(
            event=self.event,
            student=self.student,
            status="Registered",
        )

        self.authenticate(self.student_user)

        response = self.client.get(
            "/api/events/registrations/"
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(
            response.data[0]["roll_no"],
            "EVT001",
        )

    def test_faculty_can_view_event_registrations(self):
        EventRegistration.objects.create(
            event=self.event,
            student=self.student,
            status="Registered",
        )

        self.authenticate(self.faculty_user)

        response = self.client.get(
            f"/api/events/{self.event.event_id}/registrations/"
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data), 1)

    def test_student_cannot_view_event_registrations(self):
        self.authenticate(self.student_user)

        response = self.client.get(
            f"/api/events/{self.event.event_id}/registrations/"
        )

        self.assertEqual(response.status_code, 403)

    def test_faculty_can_mark_student_attended(self):
        registration = EventRegistration.objects.create(
            event=self.event,
            student=self.student,
            status="Registered",
        )

        self.authenticate(self.faculty_user)

        response = self.client.post(
            f"/api/events/{self.event.event_id}/mark-attended/",
            {"roll_no": "EVT001"},
            format="json",
        )

        self.assertEqual(response.status_code, 200)

        registration.refresh_from_db()

        self.assertEqual(registration.status, "Attended")

    def test_student_cannot_mark_attendance(self):
        EventRegistration.objects.create(
            event=self.event,
            student=self.student,
            status="Registered",
        )

        self.authenticate(self.student_user)

        response = self.client.post(
            f"/api/events/{self.event.event_id}/mark-attended/",
            {"roll_no": "EVT001"},
            format="json",
        )

        self.assertEqual(response.status_code, 403)

    def test_attended_registration_cannot_be_cancelled(self):
        EventRegistration.objects.create(
            event=self.event,
            student=self.student,
            status="Attended",
        )

        self.authenticate(self.student_user)

        response = self.client.post(
            f"/api/events/{self.event.event_id}/cancel-registration/",
        )

        self.assertEqual(response.status_code, 400)

    def test_student_cannot_delete_event(self):
        self.authenticate(self.student_user)

        response = self.client.delete(
            f"/api/events/{self.event.event_id}/"
        )

        self.assertEqual(response.status_code, 403)

        self.assertTrue(
            Event.objects.filter(
                event_id=self.event.event_id
            ).exists()
        )

    def test_faculty_cannot_delete_event(self):
        self.authenticate(self.faculty_user)

        response = self.client.delete(
            f"/api/events/{self.event.event_id}/"
        )

        self.assertEqual(response.status_code, 403)

    def test_admin_can_delete_event(self):
        self.authenticate(self.admin)

        response = self.client.delete(
            f"/api/events/{self.event.event_id}/"
        )

        self.assertEqual(response.status_code, 204)

        self.assertFalse(
            Event.objects.filter(
                event_id=self.event.event_id
            ).exists()
        )

    def test_event_search_works(self):
        self.authenticate(self.student_user)

        response = self.client.get(
            "/api/events/?search=Symposium"
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data), 1)

    def test_upcoming_events_endpoint_works(self):
        self.authenticate(self.student_user)

        response = self.client.get(
            "/api/events/upcoming/"
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data), 1)

    @patch("apps.events.views.timezone.now")
    def test_upcoming_events_use_india_local_time(self, mock_now):
        mock_now.return_value = timezone.datetime(
            2026,
            10,
            4,
            12,
            0,
            tzinfo=timezone.get_fixed_timezone(0),
        )
        today = timezone.datetime(2026, 10, 4).date()

        past_event = Event.objects.create(
            event_name="Past Today Event",
            event_type="Workshop",
            description="An event that has already passed in India.",
            event_date=today,
            time="17:00:00",
            end_time="17:00:00",
            location="Main Auditorium",
            organizer="Faculty",
            capacity=50,
            status="Upcoming",
            created_by=self.faculty_user,
        )
        future_event = Event.objects.create(
            event_name="Future Today Event",
            event_type="Workshop",
            description="An event that is still upcoming in India.",
            event_date=today,
            time="18:00:00",
            location="Main Auditorium",
            organizer="Faculty",
            capacity=50,
            status="Upcoming",
            created_by=self.faculty_user,
        )
        self.authenticate(self.student_user)

        response = self.client.get("/api/events/upcoming/")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(
            {event["event_id"] for event in response.data},
            {self.event.event_id, future_event.event_id},
        )
        self.assertNotIn(
            past_event.event_id,
            {event["event_id"] for event in response.data},
        )

    def test_event_capacity_validation(self):
        self.authenticate(self.faculty_user)

        response = self.client.post(
            "/api/events/",
            {
                "event_name": "Invalid Capacity Event",
                "event_type": "Workshop",
                "description": "Invalid capacity test",
                "event_date": str(
                    timezone.localdate() + timedelta(days=20)
                ),
                "time": "10:00:00",
                "end_time": "12:00:00",
                "location": "Room 101",
                "room_no": "101",
                "organizer": "Faculty",
                "capacity": 0,
                "status": "Upcoming",
            },
            format="json",
        )

        self.assertEqual(response.status_code, 400)

    @patch("apps.events.views.upload_attachment")
    def test_faculty_can_upload_multiple_attachments(
        self,
        mock_upload,
    ):
        mock_upload.side_effect = [
            {
                "file_name": "poster.pdf",
                "file_url": "https://example.com/poster.pdf",
                "public_id": "events/poster",
                "resource_type": "raw",
                "format": "pdf",
                "file_type": "application/pdf",
                "file_size": 100,
            },
            {
                "file_name": "schedule.png",
                "file_url": "https://example.com/schedule.png",
                "public_id": "events/schedule",
                "resource_type": "image",
                "format": "png",
                "file_type": "image/png",
                "file_size": 200,
            },
        ]

        self.authenticate(self.faculty_user)

        from django.core.files.uploadedfile import SimpleUploadedFile

        file1 = SimpleUploadedFile(
            "poster.pdf",
            b"fake pdf",
            content_type="application/pdf",
        )

        file2 = SimpleUploadedFile(
            "schedule.png",
            b"fake image",
            content_type="image/png",
        )

        response = self.client.post(
            f"/api/events/{self.event.event_id}/attachments/upload/",
            {
                "files": [file1, file2],
            },
            format="multipart",
        )

        self.assertEqual(response.status_code, 200)

        self.event.refresh_from_db()

        self.assertEqual(len(self.event.attachments), 2)
        self.assertEqual(
            self.event.attachments[0]["file_name"],
            "poster.pdf",
        )
        self.assertEqual(
            self.event.attachments[1]["file_name"],
            "schedule.png",
        )
        self.assertEqual(mock_upload.call_count, 2)