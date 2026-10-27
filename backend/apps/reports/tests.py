from datetime import time, timedelta

from django.utils import timezone
from rest_framework.test import APITestCase

from apps.academics.models import (
    Assignment,
    Attendance,
    Course,
    Department,
    Enrollment,
    FacultyCourse,
    Result,
    Room,
    SemesterResult,
    Submission,
    Timetable,
)
from apps.events.models import Event, EventRegistration
from apps.library.models import Book, Borrow
from apps.notices.models import Notice
from apps.users.models import Faculty, Student, User


class ReportsAPITests(APITestCase):
    def setUp(self):
        self.admin = User.objects.create_user(
            email="reports-admin@example.com",
            password="test-password",
            first_name="Reports",
            last_name="Admin",
            role="admin",
            status="active",
            is_verified=True,
        )
        self.student_user = User.objects.create_user(
            email="reports-student@example.com",
            password="test-password",
            first_name="Taylor",
            last_name="Student",
            role="student",
            status="active",
            is_verified=True,
        )
        self.faculty_user = User.objects.create_user(
            email="reports-faculty@example.com",
            password="test-password",
            first_name="Morgan",
            last_name="Faculty",
            role="faculty",
            status="active",
            is_verified=True,
        )
        self.department = Department.objects.create(
            department_name="Computer Engineering",
            department_code="CE",
        )
        self.student = Student.objects.create(
            user=self.student_user,
            roll_no="RPT001",
            full_name="Taylor Student",
            year=3,
            sem=5,
            div="A",
            academic_year="2026-27",
            scheme="2021",
            branch="Computer Engineering",
            department=self.department,
        )
        self.faculty = Faculty.objects.create(
            user=self.faculty_user,
            faculty_id="FAC-RPT",
            full_name="Morgan Faculty",
            faculty_email=self.faculty_user.email,
            department=self.department,
            designation="Professor",
        )
        self.course = Course.objects.create(
            course_id="AI501",
            course_name="Artificial Intelligence",
            course_sem=5,
            credits=4,
            department=self.department,
        )
        Enrollment.objects.create(student=self.student, course=self.course)
        self.faculty_course = FacultyCourse.objects.create(
            faculty=self.faculty,
            course=self.course,
            sem=5,
            year=3,
            div="A",
            class_type="lecture",
            academic_year="2026-27",
        )
        self.room = Room.objects.create(
            room_no="R101",
            block="A",
            floor=1,
            room_type="classroom",
            capacity=60,
        )
        self.timetable = Timetable.objects.create(
            faculty_course=self.faculty_course,
            room=self.room,
            day="Monday",
            start_time=time(9),
            end_time=time(10),
        )
        self.today = timezone.localdate()
        Attendance.objects.create(
            student=self.student,
            timetable=self.timetable,
            date=self.today,
            lecture_no=1,
            status="present",
        )
        Attendance.objects.create(
            student=self.student,
            timetable=self.timetable,
            date=self.today,
            lecture_no=2,
            status="absent",
        )
        self.semester_result = SemesterResult.objects.create(
            student=self.student,
            academic_year="2026-27",
            sem=5,
            sgpi="8.25",
            cgpa="8.10",
            total_credits=20,
            result_status="pass",
            is_published=True,
        )
        Result.objects.create(
            semester_result=self.semester_result,
            course=self.course,
            isa=18,
            mse=20,
            ese=45,
            total_marks=83,
            grade="A",
            grade_point=9,
        )
        self.assignment = Assignment.objects.create(
            faculty_course=self.faculty_course,
            title="AI fundamentals",
            description="Report test assignment",
            due_date=timezone.now() + timedelta(days=7),
            max_marks=100,
            is_active=True,
        )
        Submission.objects.create(
            assignment=self.assignment,
            student=self.student,
            submitted_at=timezone.now(),
            status="submitted",
        )
        self.book = Book.objects.create(
            title="Artificial Intelligence",
            author="A. Author",
            category="Technology",
            isbn="REPORT-ISBN-1",
            total_copies=3,
            available_copies=2,
        )
        Borrow.objects.create(
            book=self.book,
            user=self.student_user,
            status="issued",
            borrow_date=timezone.now() - timedelta(days=20),
            due_date=timezone.now() - timedelta(days=6),
        )
        self.event = Event.objects.create(
            event_name="AI Seminar",
            event_type="Seminar",
            description="Reporting event",
            event_date=self.today,
            time=time(14),
            end_time=time(16),
            location="Auditorium",
            organizer="CE",
            capacity=100,
            status="Completed",
            created_by=self.admin,
        )
        EventRegistration.objects.create(
            event=self.event,
            student=self.student,
            status="Attended",
        )
        self.notice = Notice.objects.create(
            user=self.admin,
            title="Exam schedule",
            category="Examination",
            priority="High",
            content="Exam schedule notice",
            published_date=timezone.now(),
            status="Published",
            target_year="ALL",
        )

    def authenticate(self, user):
        self.client.force_authenticate(user=user)

    def test_reports_require_admin_role(self):
        anonymous_response = self.client.get("/api/reports/overview/")
        self.assertEqual(anonymous_response.status_code, 401)

        self.authenticate(self.student_user)
        student_response = self.client.get("/api/reports/overview/")
        self.assertEqual(student_response.status_code, 403)

        self.authenticate(self.faculty_user)
        faculty_response = self.client.get("/api/reports/overview/")
        self.assertEqual(faculty_response.status_code, 403)

    def test_admin_can_access_overview_with_actual_counts(self):
        self.authenticate(self.admin)

        response = self.client.get("/api/reports/overview/")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data, {
            "total_students": 1,
            "total_faculty": 1,
            "total_courses": 1,
            "total_departments": 1,
            "total_books": 1,
            "total_events": 1,
            "total_notices": 1,
        })

    def test_students_report_returns_profiles_and_enrollments(self):
        self.authenticate(self.admin)

        response = self.client.get(
            "/api/reports/students/?branch=CE&semester=5&course=AI501"
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["count"], 1)
        record = response.data["records"][0]
        self.assertEqual(record["roll_number"], "RPT001")
        self.assertEqual(record["enrolled_courses"][0]["course_id"], "AI501")

    def test_attendance_report_aggregates_and_filters_real_records(self):
        self.authenticate(self.admin)

        response = self.client.get(
            f"/api/reports/attendance/?course=AI501&date_from={self.today}"
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["summary"], {
            "total_classes": 2,
            "attended_classes": 1,
            "absent_classes": 1,
            "attendance_percentage": 50.0,
        })
        self.assertEqual(response.data["records"][0]["course_id"], "AI501")

    def test_results_report_returns_course_and_semester_performance(self):
        self.authenticate(self.admin)

        response = self.client.get("/api/reports/results/?course=AI501")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["summary"]["result_count"], 1)
        self.assertEqual(response.data["records"][0]["total_marks"], 83)
        self.assertEqual(
            str(response.data["semester_performance"][0]["cgpa"]),
            "8.10",
        )

    def test_assignments_report_includes_submission_state(self):
        self.authenticate(self.admin)

        response = self.client.get("/api/reports/assignments/?faculty=FAC-RPT")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["summary"]["total_assignments"], 1)
        self.assertEqual(response.data["records"][0]["handed_in"], 1)
        self.assertEqual(response.data["records"][0]["pending"], 0)

    def test_faculty_report_aggregates_courses_and_timetable(self):
        self.authenticate(self.admin)

        response = self.client.get("/api/reports/faculty/?branch=CE")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["records"][0]["faculty_id"], "FAC-RPT")
        self.assertEqual(
            response.data["records"][0]["assigned_course_count"],
            1,
        )
        self.assertEqual(
            response.data["records"][0]["timetable_entry_count"],
            1,
        )

    def test_library_report_counts_borrowed_and_overdue_records(self):
        self.authenticate(self.admin)

        response = self.client.get("/api/reports/library/")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["summary"]["total_titles"], 1)
        self.assertEqual(response.data["summary"]["available_copies"], 2)
        self.assertEqual(response.data["summary"]["borrowed_records"], 1)
        self.assertEqual(response.data["summary"]["overdue_records"], 1)

    def test_events_and_notices_reports_use_stored_data(self):
        self.authenticate(self.admin)

        event_response = self.client.get(
            f"/api/reports/events/?date_from={self.today}&date_to={self.today}"
        )
        notice_response = self.client.get("/api/reports/notices/")

        self.assertEqual(event_response.status_code, 200)
        self.assertEqual(event_response.data["summary"]["total_events"], 1)
        self.assertEqual(
            event_response.data["summary"]["registrations_by_status"],
            {"Attended": 1},
        )
        self.assertEqual(notice_response.status_code, 200)
        self.assertEqual(
            notice_response.data["summary"]["published_notices"],
            1,
        )
        self.assertEqual(notice_response.data["by_category"][0]["count"], 1)

    def test_invalid_filter_returns_validation_error(self):
        self.authenticate(self.admin)

        response = self.client.get(
            "/api/reports/attendance/?year=not-a-year"
        )

        self.assertEqual(response.status_code, 400)
        self.assertIn("year", response.data)

    def test_csv_export_contains_database_report_data(self):
        self.authenticate(self.admin)

        response = self.client.get(
            "/api/reports/students/?export=csv&course=AI501"
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response["Content-Type"], "text/csv; charset=utf-8")
        self.assertIn("Taylor Student", response.content.decode())
        self.assertIn("AI501", response.content.decode())


class EmptyReportsAPITests(APITestCase):
    def setUp(self):
        self.admin = User.objects.create_user(
            email="empty-reports-admin@example.com",
            password="test-password",
            first_name="Empty",
            last_name="Admin",
            role="admin",
            status="active",
            is_verified=True,
        )
        self.client.force_authenticate(user=self.admin)

    def test_empty_database_returns_zero_counts_and_empty_records(self):
        response = self.client.get("/api/reports/overview/")
        self.assertEqual(response.status_code, 200)
        self.assertTrue(all(value == 0 for value in response.data.values()))

        for report_name in [
            "students",
            "attendance",
            "results",
            "assignments",
            "faculty",
            "library",
            "events",
            "notices",
        ]:
            report_response = self.client.get(
                f"/api/reports/{report_name}/"
            )
            self.assertEqual(report_response.status_code, 200)
            self.assertEqual(report_response.data["count"], 0)
            self.assertEqual(report_response.data["records"], [])
