from datetime import date, time
from io import StringIO
from unittest.mock import call, patch

from django.http import HttpResponse

from django.core.management import call_command
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import TestCase
from datetime import timedelta
from decimal import Decimal

from django.utils import timezone

from rest_framework import status
from rest_framework.test import APIClient

from apps.users.models import User, Faculty, Student, Admin
from apps.academics.models import (
    Department,
    Course,
    Enrollment,
    FacultyCourse,
    Room,
    Timetable,
    Attendance,
    Resource,
    Assignment,
    AssignmentFile,
    Submission,
    SubmissionFile,
    SemesterResult,
    Result,
    AcademicCalendar,
)


class AttendanceAPITest(TestCase):

    def setUp(self):
        self.client = APIClient()

        self.admin_user = User.objects.create_user(
            email="calendar-admin@test.com",
            password="CalendarTestPassword123!",
            role="admin",
        )

        self.department = Department.objects.create(
            department_name="Computer Engineering",
            department_code="CE"
        )

        self.user = User.objects.create_user(
            email="faculty@test.com",
            password="TestPassword123",
            role="faculty"
        )

        self.faculty = Faculty.objects.create(
            faculty_id="FAC001",
            user=self.user,
            full_name="Test Faculty",
            faculty_email="faculty@test.com",
            department=self.department
        )

        self.student_user = User.objects.create_user(
            email="student@test.com",
            password="TestPassword123",
            role="student"
        )

        self.student = Student.objects.create(
            roll_no="101",
            user=self.student_user,
            full_name="Test Student",
            year=3,
            sem=5,
            div="A",
            academic_year="2026-27",
            branch="Computer Engineering",
            batch="A1",
            department=self.department
        )

        self.course = Course.objects.create(
            course_id="CS501",
            course_name="Data Structures",
            course_sem=5,
            credits=4,
            department=self.department
        )

        Enrollment.objects.create(
            student=self.student,
            course=self.course
        )

        self.faculty_course = FacultyCourse.objects.create(
            faculty=self.faculty,
            course=self.course,
            sem=5,
            year=3,
            div="A",
            batch=None,
            class_type="lecture",
            academic_year="2026-27"
        )

        self.room = Room.objects.create(
            room_no="101",
            block="A",
            floor=1,
            room_type="Classroom",
            capacity=60
        )

        self.timetable = Timetable.objects.create(
            faculty_course=self.faculty_course,
            room=self.room,
            day="Monday",
            start_time=time(10, 0),
            end_time=time(11, 0)
        )

        self.client.force_authenticate(
            user=self.user
        )

    def test_create_attendance(self):
        response = self.client.post(
            "/api/academics/attendance/",
            {
                "timetable_id": self.timetable.timetable_id,
                "date": "2026-09-17",
                "lecture_no": 1,
                "attendance": [
                    {
                        "roll_no": "101",
                        "status": "absent"
                    }
                ]
            },
            format="json"
        )

        self.assertEqual(response.status_code, 201)

        self.assertEqual(
            Attendance.objects.count(),
            1
        )

        attendance = Attendance.objects.first()

        self.assertEqual(
            attendance.status,
            "absent"
        )

    def test_update_attendance(self):
        Attendance.objects.create(
            student=self.student,
            timetable=self.timetable,
            date=date(2026, 9, 17),
            lecture_no=1,
            status="absent"
        )

        response = self.client.put(
            "/api/academics/attendance/",
            {
                "timetable_id": self.timetable.timetable_id,
                "date": "2026-09-17",
                "lecture_no": 1,
                "attendance": [
                    {
                        "roll_no": "101",
                        "status": "present"
                    }
                ]
            },
            format="json"
        )

        self.assertEqual(response.status_code, 200)

        self.assertEqual(
            Attendance.objects.count(),
            1
        )

        attendance = Attendance.objects.first()

        self.assertEqual(
            attendance.status,
            "present"
        )


    def test_student_can_get_resources(self):
        Resource.objects.create(
            faculty_course=self.faculty_course,
            title="Data Structures Notes",
            resource_type="study_material",
            file_url="https://example.com/ds-notes.pdf"
        )

        self.client.force_authenticate(
            user=self.student_user
        )

        response = self.client.get(
            "/api/academics/resources/"
        )

        self.assertEqual(
            response.status_code,
            200
        )

        self.assertEqual(
            response.data["current_semester"],
            self.student.sem
        )

        self.assertEqual(
            len(response.data["courses"]),
            1
        )

        self.assertEqual(
            response.data["courses"][0]["course_id"],
            "CS501"
        )

        self.assertEqual(
            response.data["courses"][0]["course_name"],
            "Data Structures"
        )

        self.assertEqual(
            response.data["courses"][0]["resources"][0]["title"],
            "Data Structures Notes"
        )

        self.assertEqual(
            response.data["courses"][0]["resources"][0]["resource_type"],
            "study_material"
        )

    def test_student_resources_only_include_enrolled_current_semester_courses(self):
        Resource.objects.create(
            faculty_course=self.faculty_course,
            title="Data Structures Notes",
            resource_type="study_material",
            file_url="https://example.com/ds-notes.pdf"
        )

        second_enrolled_course = Course.objects.create(
            course_id="CS502",
            course_name="Database Systems",
            course_sem=5,
            credits=3,
            department=self.department
        )
        Enrollment.objects.create(
            student=self.student,
            course=second_enrolled_course
        )

        other_semester_course = Course.objects.create(
            course_id="CS701",
            course_name="Advanced Systems",
            course_sem=7,
            credits=3,
            department=self.department
        )
        Enrollment.objects.create(
            student=self.student,
            course=other_semester_course
        )

        unregistered_course = Course.objects.create(
            course_id="CS503",
            course_name="Unregistered Course",
            course_sem=5,
            credits=3,
            department=self.department
        )

        for course, sem in [
            (other_semester_course, 7),
            (unregistered_course, 5),
        ]:
            faculty_course = FacultyCourse.objects.create(
                faculty=self.faculty,
                course=course,
                sem=sem,
                year=self.student.year,
                div=self.student.div,
                batch=None,
                class_type="lecture",
                academic_year=self.student.academic_year
            )
            Resource.objects.create(
                faculty_course=faculty_course,
                title=f"{course.course_name} Notes",
                resource_type="study_material",
                file_url="https://example.com/notes.pdf"
            )

        self.client.force_authenticate(user=self.student_user)

        response = self.client.get("/api/academics/resources/")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["current_semester"], 5)
        self.assertEqual(
            {
                course["course_id"]
                for course in response.data["courses"]
            },
            {"CS501", "CS502"}
        )

        resources_by_course = {
            course["course_id"]: course["resources"]
            for course in response.data["courses"]
        }
        self.assertEqual(
            [resource["title"] for resource in resources_by_course["CS501"]],
            ["Data Structures Notes"]
        )
        self.assertEqual(resources_by_course["CS502"], [])


    def test_student_can_filter_resources(self):
        Resource.objects.create(
            faculty_course=self.faculty_course,
            title="Data Structures Notes",
            resource_type="study_material",
            file_url="https://example.com/ds-notes.pdf"
        )

        self.client.force_authenticate(
            user=self.student_user
        )

        response = self.client.get(
            "/api/academics/resources/?course_id=CS501"
        )

        self.assertEqual(
            response.status_code,
            200
        )

        self.assertEqual(
            len(response.data["courses"]),
            1
        )

        self.assertEqual(
            response.data["courses"][0]["course_id"],
            "CS501"
        )

    def test_student_resources_keep_ppt_notes_division_data(self):
        division_b_course = FacultyCourse.objects.create(
            faculty=self.faculty,
            course=self.course,
            sem=5,
            year=3,
            div="B",
            batch=None,
            class_type="lecture",
            academic_year="2026-27"
        )
        Resource.objects.create(
            faculty_course=division_b_course,
            title="Division B Notes",
            resource_type="ppt_notes",
            file_url="https://example.com/division-b-notes.pdf"
        )

        self.client.force_authenticate(user=self.student_user)

        response = self.client.get("/api/academics/resources/")

        self.assertEqual(response.status_code, 200)
        resources = response.data["courses"][0]["resources"]
        self.assertEqual(len(resources), 1)
        self.assertEqual(resources[0]["title"], "Division B Notes")
        self.assertEqual(resources[0]["resource_type"], "ppt_notes")
        self.assertEqual(resources[0]["div"], "B")

    @patch("apps.academics.views.serve_cloudinary_file")
    def test_student_can_download_resource_for_current_enrolled_course(
        self,
        serve_file,
    ):
        resource = Resource.objects.create(
            faculty_course=self.faculty_course,
            title="Data Structures Notes",
            resource_type="study_material",
            file_url="https://res.cloudinary.com/demo/raw/upload/notes.pdf",
            original_file_name="lecture-5.pdf",
        )
        serve_file.return_value = HttpResponse("file")
        self.client.force_authenticate(user=self.student_user)

        response = self.client.get(
            f"/api/academics/resources/{resource.resource_id}/file/?download=1",
            HTTP_ORIGIN="http://localhost:5173",
        )

        self.assertEqual(response.status_code, 200)
        self.assertIn(
            "Content-Disposition",
            response["Access-Control-Expose-Headers"],
        )
        serve_file.assert_called_once()
        self.assertEqual(
            serve_file.call_args.args[1:],
            (resource.file_url, resource.original_file_name),
        )

    def test_student_cannot_download_resource_outside_current_class(self):
        other_class = FacultyCourse.objects.create(
            faculty=self.faculty,
            course=self.course,
            sem=7,
            year=self.student.year,
            div=self.student.div,
            batch=None,
            class_type="lecture",
            academic_year=self.student.academic_year,
        )
        resource = Resource.objects.create(
            faculty_course=other_class,
            title="Other Semester Notes",
            resource_type="study_material",
            file_url="https://res.cloudinary.com/demo/raw/upload/notes.pdf",
        )
        self.client.force_authenticate(user=self.student_user)

        response = self.client.get(
            f"/api/academics/resources/{resource.resource_id}/file/"
        )

        self.assertEqual(response.status_code, 403)


    @patch("apps.academics.views.cloudinary.uploader.upload")
    def test_faculty_can_create_resource_for_own_course(
        self,
        mock_upload
    ):
        mock_upload.return_value = {
            "secure_url": "https://res.cloudinary.com/test/mosaic/resources/test.pdf"
        }

        uploaded_file = SimpleUploadedFile(
            "ds-notes.pdf",
            b"fake pdf content",
            content_type="application/pdf"
        )

        response = self.client.post(
            "/api/academics/resources/create/",
            {
                "faculty_course": self.faculty_course.faculty_course_id,
                "title": "Data Structures Notes",
                "resource_type": "study_material",
                "file": uploaded_file,
            },
            format="multipart"
        )

        self.assertEqual(
            response.status_code,
            201
        )

        resource = Resource.objects.get(
            title="Data Structures Notes"
        )

        self.assertEqual(
            resource.file_url,
            "https://res.cloudinary.com/test/mosaic/resources/test.pdf"
        )
        self.assertEqual(resource.original_file_name, "ds-notes.pdf")

        mock_upload.assert_called_once()

    def test_faculty_cannot_create_resource_for_other_faculty_course(self):
        other_faculty = Faculty.objects.create(
            faculty_id="FAC002",
            user=User.objects.create_user(
                email="faculty2@example.com",
                password="testpass123",
                role="faculty"
            ),
            full_name="Other Faculty",
            faculty_subject="Mathematics",
            faculty_email="faculty2@example.com",
            department=self.department
        )

        other_faculty_course = FacultyCourse.objects.create(
            faculty=other_faculty,
            course=self.course,
            sem=5,
            year=3,
            div="A",
            class_type="lecture",
            academic_year="2026-27"
        )

        uploaded_file = SimpleUploadedFile(
            "notes.pdf",
            b"fake pdf content",
            content_type="application/pdf"
        )

        response = self.client.post(
            "/api/academics/resources/create/",
            {
                "faculty_course": other_faculty_course.faculty_course_id,
                "title": "Unauthorized Notes",
                "resource_type": "study_material",
                "file": uploaded_file,
            },
            format="multipart"
        )

        self.assertEqual(
            response.status_code,
            403
        )

    def test_student_cannot_create_resource(self):
        self.client.force_authenticate(
            user=self.student_user
        )

        uploaded_file = SimpleUploadedFile(
            "notes.pdf",
            b"fake pdf content",
            content_type="application/pdf"
        )

        response = self.client.post(
            "/api/academics/resources/create/",
            {
                "faculty_course": self.faculty_course.faculty_course_id,
                "title": "Student Upload",
                "resource_type": "study_material",
                "file": uploaded_file,
            },
            format="multipart"
        )

        self.assertEqual(
            response.status_code,
            403
        )

    @patch("apps.academics.views.cloudinary.uploader.upload")
    def test_admin_can_create_resource_for_any_course(
        self,
        mock_upload
    ):
        mock_upload.return_value = {
            "secure_url": "https://res.cloudinary.com/test/admin-resource.pdf"
        }

        admin_user = User.objects.create_user(
            email="admin-resource@test.com",
            password="TestPassword123",
            role="admin"
        )

        self.client.force_authenticate(
            user=admin_user
        )

        uploaded_file = SimpleUploadedFile(
            "admin-notes.pdf",
            b"fake pdf content",
            content_type="application/pdf"
        )

        response = self.client.post(
            "/api/academics/resources/create/",
            {
                "faculty_course": self.faculty_course.faculty_course_id,
                "title": "Admin Resource",
                "resource_type": "study_material",
                "file": uploaded_file,
            },
            format="multipart"
        )

        self.assertEqual(
            response.status_code,
            201
        )

        resource = Resource.objects.get(
            title="Admin Resource"
        )

        self.assertEqual(
            resource.file_url,
            "https://res.cloudinary.com/test/admin-resource.pdf"
        )

        mock_upload.assert_called_once()

    def test_faculty_can_edit_own_resource(self):
        resource = Resource.objects.create(
            faculty_course=self.faculty_course,
            title="Old Title",
            resource_type="study_material",
            file_url="https://example.com/old.pdf"
        )

        self.client.force_authenticate(
            user=self.user
        )

        response = self.client.put(
            f"/api/academics/resources/{resource.resource_id}/",
            {
                "title": "Updated Title"
            },
            format="json"
        )

        self.assertEqual(
            response.status_code,
            200
        )

        resource.refresh_from_db()

        self.assertEqual(
            resource.title,
            "Updated Title"
        )

    def test_faculty_cannot_edit_other_faculty_resource(self):
        other_user = User.objects.create_user(
            email="otherfaculty@test.com",
            password="TestPassword123",
            role="faculty"
        )

        other_faculty = Faculty.objects.create(
            faculty_id="FAC002",
            user=other_user,
            full_name="Other Faculty",
            faculty_email="otherfaculty@test.com",
            department=self.department
        )

        other_faculty_course = FacultyCourse.objects.create(
            faculty=other_faculty,
            course=self.course,
            sem=5,
            year=3,
            div="A",
            batch=None,
            class_type="lecture",
            academic_year="2026-27"
        )

        resource = Resource.objects.create(
            faculty_course=other_faculty_course,
            title="Other Faculty Resource",
            resource_type="study_material",
            file_url="https://example.com/other.pdf"
        )

        self.client.force_authenticate(
            user=self.user
        )

        response = self.client.put(
            f"/api/academics/resources/{resource.resource_id}/",
            {
                "title": "Unauthorized Update"
            },
            format="json"
        )

        self.assertEqual(
            response.status_code,
            403
        )

        resource.refresh_from_db()

        self.assertEqual(
            resource.title,
            "Other Faculty Resource"
        )

    def test_admin_can_edit_any_resource(self):
        resource = Resource.objects.create(
            faculty_course=self.faculty_course,
            title="Faculty Resource",
            resource_type="study_material",
            file_url="https://example.com/resource.pdf"
        )

        admin_user = User.objects.create_user(
            email="admin@test.com",
            password="TestPassword123",
            role="admin"
        )

        self.client.force_authenticate(
            user=admin_user
        )

        response = self.client.put(
            f"/api/academics/resources/{resource.resource_id}/",
            {
                "title": "Admin Updated Resource"
            },
            format="json"
        )

        self.assertEqual(
            response.status_code,
            200
        )

        resource.refresh_from_db()

        self.assertEqual(
            resource.title,
            "Admin Updated Resource"
        )

    def test_admin_can_delete_resource(self):
        resource = Resource.objects.create(
            faculty_course=self.faculty_course,
            title="Resource To Delete",
            resource_type="study_material",
            file_url="https://example.com/delete.pdf"
        )

        admin_user = User.objects.create_user(
            email="admin-delete@test.com",
            password="TestPassword123",
            role="admin"
        )

        self.client.force_authenticate(
            user=admin_user
        )

        response = self.client.delete(
            f"/api/academics/resources/{resource.resource_id}/"
        )

        self.assertEqual(
            response.status_code,
            200
        )

        self.assertFalse(
            Resource.objects.filter(
                resource_id=resource.resource_id
            ).exists()
        )


    def test_student_cannot_delete_resource(self):
        resource = Resource.objects.create(
            faculty_course=self.faculty_course,
            title="Protected Resource",
            resource_type="study_material",
            file_url="https://example.com/protected.pdf"
        )

        self.client.force_authenticate(
            user=self.student_user
        )

        response = self.client.delete(
            f"/api/academics/resources/{resource.resource_id}/"
        )

        self.assertEqual(
            response.status_code,
            403
        )

        self.assertTrue(
            Resource.objects.filter(
                resource_id=resource.resource_id
            ).exists()
        )

    def test_faculty_can_update_resource_metadata(self):
        resource = Resource.objects.create(
            faculty_course=self.faculty_course,
            title="Old Title",
            resource_type="study_material",
            file_url="https://res.cloudinary.com/test/old-file.pdf"
        )

        response = self.client.put(
            f"/api/academics/resources/{resource.resource_id}/",
            {
                "title": "Updated Title"
            },
            format="json"
        )

        self.assertEqual(
            response.status_code,
            200
        )

        resource.refresh_from_db()

        self.assertEqual(
            resource.title,
            "Updated Title"
        )

        self.assertEqual(
            resource.file_url,
            "https://res.cloudinary.com/test/old-file.pdf"
        )

    @patch("apps.academics.views.cloudinary.uploader.upload")
    @patch("apps.academics.views.delete_cloudinary_file")
    def test_faculty_can_replace_resource_file(
        self,
        mock_delete,
        mock_upload
    ):
        resource = Resource.objects.create(
            faculty_course=self.faculty_course,
            title="Old Resource",
            resource_type="study_material",
            file_url="https://res.cloudinary.com/test/old-file.pdf"
        )

        mock_upload.return_value = {
            "secure_url": (
                "https://res.cloudinary.com/test/"
                "new-file.pdf"
            )
        }

        uploaded_file = SimpleUploadedFile(
            "new-file.pdf",
            b"fake pdf content",
            content_type="application/pdf"
        )

        response = self.client.put(
            f"/api/academics/resources/{resource.resource_id}/",
            {
                "title": "Updated Resource",
                "file": uploaded_file
            },
            format="multipart"
        )

        self.assertEqual(
            response.status_code,
            200
        )

        resource.refresh_from_db()

        self.assertEqual(
            resource.title,
            "Updated Resource"
        )

        self.assertEqual(
            resource.file_url,
            "https://res.cloudinary.com/test/new-file.pdf"
        )
        self.assertEqual(resource.original_file_name, "new-file.pdf")

        mock_upload.assert_called_once()

        mock_delete.assert_called_once_with(
            "https://res.cloudinary.com/test/old-file.pdf"
        )


    def test_faculty_can_create_assignment_for_own_course(self):
        response = self.client.post(
            "/api/academics/assignments/",
            {
                "faculty_course": self.faculty_course.faculty_course_id,
                "title": "Data Structures Assignment 1",
                "description": "Solve the given problems.",
                "due_date": "2026-09-25T23:59:00Z",
                "max_marks": 20,
                "allow_late_submission": True,
                "is_active": True
            },
            format="json"
        )

        self.assertEqual(
            response.status_code,
            201
        )

        assignment = Assignment.objects.get(
            title="Data Structures Assignment 1"
        )

        self.assertEqual(
            assignment.faculty_course,
            self.faculty_course
        )

        self.assertEqual(
            assignment.max_marks,
            20
        )

        self.assertTrue(
            assignment.allow_late_submission
        )

        self.assertTrue(
            assignment.is_active
        )


    def test_faculty_cannot_create_assignment_for_other_faculty_course(self):
        other_user = User.objects.create_user(
            email="assignmentfaculty@test.com",
            password="TestPassword123",
            role="faculty"
        )

        other_faculty = Faculty.objects.create(
            faculty_id="FAC003",
            user=other_user,
            full_name="Other Assignment Faculty",
            faculty_email="assignmentfaculty@test.com",
            department=self.department
        )

        other_faculty_course = FacultyCourse.objects.create(
            faculty=other_faculty,
            course=self.course,
            sem=5,
            year=3,
            div="A",
            batch=None,
            class_type="lecture",
            academic_year="2026-27"
        )

        response = self.client.post(
            "/api/academics/assignments/",
            {
                "faculty_course": (
                    other_faculty_course.faculty_course_id
                ),
                "title": "Unauthorized Assignment",
                "description": "This should not be allowed.",
                "due_date": "2026-09-25T23:59:00Z",
                "max_marks": 20,
                "allow_late_submission": True,
                "is_active": True
            },
            format="json"
        )

        self.assertEqual(
            response.status_code,
            403
        )

        self.assertFalse(
            Assignment.objects.filter(
                title="Unauthorized Assignment"
            ).exists()
        )


    def test_student_can_get_assignments_for_enrolled_course(self):
        assignment = Assignment.objects.create(
            faculty_course=self.faculty_course,
            title="Student Assignment",
            description="Complete this work.",
            due_date="2026-09-25T23:59:00Z",
            max_marks=20,
            allow_late_submission=True,
            is_active=True
        )
        Submission.objects.create(
            assignment=assignment,
            student=self.student,
            status="submitted",
            submitted_at=timezone.now()
        )

        self.client.force_authenticate(
            user=self.student_user
        )

        response = self.client.get(
            "/api/academics/assignments/"
        )

        self.assertEqual(
            response.status_code,
            200
        )

        self.assertEqual(
            len(response.data),
            1
        )

        self.assertEqual(
            response.data[0]["title"],
            "Student Assignment"
        )

        self.assertEqual(
            response.data[0]["course_id"],
            "CS501"
        )

        self.assertEqual(
            response.data[0]["course_name"],
            "Data Structures"
        )
        self.assertEqual(
            response.data[0]["my_submission_status"],
            "submitted"
        )

        returned_assignment = Assignment.objects.create(
            faculty_course=self.faculty_course,
            title="Returned Assignment",
            description="Previously handed in and returned for revision.",
            due_date="2026-09-20T23:59:00Z",
            max_marks=20,
            allow_late_submission=True,
            is_active=True
        )
        Submission.objects.create(
            assignment=returned_assignment,
            student=self.student,
            status="returned",
            submitted_at=timezone.now()
        )

        response = self.client.get(
            "/api/academics/assignments/"
        )

        self.assertEqual(
            response.status_code,
            200
        )
        returned_data = next(
            assignment_data
            for assignment_data in response.data
            if assignment_data["assignment_id"]
            == returned_assignment.assignment_id
        )
        self.assertEqual(
            returned_data["my_submission_status"],
            "returned"
        )

    def test_student_cannot_create_assignment(self):
        self.client.force_authenticate(
            user=self.student_user
        )

        response = self.client.post(
            "/api/academics/assignments/",
            {
                "faculty_course": self.faculty_course.faculty_course_id,
                "title": "Student Created Assignment",
                "description": "This should not be allowed.",
                "due_date": "2026-09-25T23:59:00Z",
                "max_marks": 20,
                "allow_late_submission": True,
                "is_active": True
            },
            format="json"
        )

        self.assertEqual(
            response.status_code,
            403
        )

        self.assertFalse(
            Assignment.objects.filter(
                title="Student Created Assignment"
            ).exists()
        )


    def test_admin_cannot_create_assignment(self):
        admin_user = User.objects.create_user(
            email="assignmentadmin@test.com",
            password="TestPassword123",
            role="admin"
        )

        self.client.force_authenticate(
            user=admin_user
        )

        response = self.client.post(
            "/api/academics/assignments/",
            {
                "faculty_course": self.faculty_course.faculty_course_id,
                "title": "Admin Assignment",
                "description": "Admin should not create assignments.",
                "due_date": "2026-09-25T23:59:00Z",
                "max_marks": 20,
                "allow_late_submission": True,
                "is_active": True
            },
            format="json"
        )

        self.assertEqual(
            response.status_code,
            403
        )

        self.assertFalse(
            Assignment.objects.filter(
                title="Admin Assignment"
            ).exists()
        )


    def test_faculty_can_get_own_assignment(self):
        assignment = Assignment.objects.create(
            faculty_course=self.faculty_course,
            title="My Assignment",
            description="My assignment.",
            due_date="2026-09-25T23:59:00Z",
            max_marks=25,
            allow_late_submission=True,
            is_active=True
        )

        response = self.client.get(
            f"/api/academics/assignments/{assignment.assignment_id}/"
        )

        self.assertEqual(
            response.status_code,
            200
        )

        self.assertEqual(
            response.data["title"],
            "My Assignment"
        )

        self.assertEqual(
            response.data["max_marks"],
            25
        )


    def test_faculty_can_update_own_assignment(self):
        assignment = Assignment.objects.create(
            faculty_course=self.faculty_course,
            title="Old Assignment",
            description="Old description.",
            due_date="2026-09-25T23:59:00Z",
            max_marks=20,
            allow_late_submission=True,
            is_active=True
        )

        response = self.client.put(
            f"/api/academics/assignments/{assignment.assignment_id}/",
            {
                "title": "Updated Assignment",
                "description": "Updated description.",
                "due_date": "2026-09-27T23:59:00Z",
                "max_marks": 30,
                "allow_late_submission": False,
                "is_active": True
            },
            format="json"
        )

        self.assertEqual(
            response.status_code,
            200,
            msg=f"Update failed: {response.data}"
        )

        assignment.refresh_from_db()

        self.assertEqual(
            assignment.title,
            "Updated Assignment"
        )

        self.assertEqual(
            assignment.description,
            "Updated description."
        )

        self.assertEqual(
            assignment.max_marks,
            30
        )

        self.assertFalse(
            assignment.allow_late_submission
        )


    def test_faculty_cannot_update_other_faculty_assignment(self):
        other_user = User.objects.create_user(
            email="assignmentother@test.com",
            password="TestPassword123",
            role="faculty"
        )

        other_faculty = Faculty.objects.create(
            faculty_id="FAC004",
            user=other_user,
            full_name="Other Faculty Assignment",
            faculty_email="assignmentother@test.com",
            department=self.department
        )

        other_faculty_course = FacultyCourse.objects.create(
            faculty=other_faculty,
            course=self.course,
            sem=5,
            year=3,
            div="A",
            batch=None,
            class_type="lecture",
            academic_year="2026-27"
        )

        assignment = Assignment.objects.create(
            faculty_course=other_faculty_course,
            title="Protected Assignment",
            description="Other faculty assignment.",
            due_date="2026-09-25T23:59:00Z",
            max_marks=20,
            allow_late_submission=True,
            is_active=True
        )

        response = self.client.put(
            f"/api/academics/assignments/{assignment.assignment_id}/",
            {
                "title": "Unauthorized Update"
            },
            format="json"
        )

        self.assertEqual(
            response.status_code,
            403
        )

        assignment.refresh_from_db()

        self.assertEqual(
            assignment.title,
            "Protected Assignment"
        )


    def test_faculty_can_delete_own_assignment(self):
        assignment = Assignment.objects.create(
            faculty_course=self.faculty_course,
            title="Assignment To Delete",
            description="Delete this assignment.",
            due_date="2026-09-25T23:59:00Z",
            max_marks=20,
            allow_late_submission=True,
            is_active=True
        )

        response = self.client.delete(
            f"/api/academics/assignments/{assignment.assignment_id}/"
        )

        self.assertEqual(
            response.status_code,
            204
        )

        self.assertFalse(
            Assignment.objects.filter(
                assignment_id=assignment.assignment_id
            ).exists()
        )


    def test_faculty_cannot_delete_other_faculty_assignment(self):
        other_user = User.objects.create_user(
            email="assignmentdelete@test.com",
            password="TestPassword123",
            role="faculty"
        )

        other_faculty = Faculty.objects.create(
            faculty_id="FAC005",
            user=other_user,
            full_name="Delete Test Faculty",
            faculty_email="assignmentdelete@test.com",
            department=self.department
        )

        other_faculty_course = FacultyCourse.objects.create(
            faculty=other_faculty,
            course=self.course,
            sem=5,
            year=3,
            div="A",
            batch=None,
            class_type="lecture",
            academic_year="2026-27"
        )

        assignment = Assignment.objects.create(
            faculty_course=other_faculty_course,
            title="Protected Delete Assignment",
            description="Should remain.",
            due_date="2026-09-25T23:59:00Z",
            max_marks=20,
            allow_late_submission=True,
            is_active=True
        )

        response = self.client.delete(
            f"/api/academics/assignments/{assignment.assignment_id}/"
        )

        self.assertEqual(
            response.status_code,
            403
        )

        self.assertTrue(
            Assignment.objects.filter(
                assignment_id=assignment.assignment_id
            ).exists()
        )


    def test_student_cannot_update_assignment(self):
        assignment = Assignment.objects.create(
            faculty_course=self.faculty_course,
            title="Student Protected Assignment",
            description="Students cannot edit.",
            due_date="2026-09-25T23:59:00Z",
            max_marks=20,
            allow_late_submission=True,
            is_active=True
        )

        self.client.force_authenticate(
            user=self.student_user
        )

        response = self.client.put(
            f"/api/academics/assignments/{assignment.assignment_id}/",
            {
                "title": "Student Changed Assignment"
            },
            format="json"
        )

        self.assertEqual(
            response.status_code,
            403
        )

        assignment.refresh_from_db()

        self.assertEqual(
            assignment.title,
            "Student Protected Assignment"
        )


    def test_student_cannot_delete_assignment(self):
        assignment = Assignment.objects.create(
            faculty_course=self.faculty_course,
            title="Student Protected Delete",
            description="Students cannot delete.",
            due_date="2026-09-25T23:59:00Z",
            max_marks=20,
            allow_late_submission=True,
            is_active=True
        )

        self.client.force_authenticate(
            user=self.student_user
        )

        response = self.client.delete(
            f"/api/academics/assignments/{assignment.assignment_id}/"
        )

        self.assertEqual(
            response.status_code,
            403
        )

        self.assertTrue(
            Assignment.objects.filter(
                assignment_id=assignment.assignment_id
            ).exists()
        )

    @patch("apps.academics.views.cloudinary.uploader.upload")
    def test_faculty_can_upload_assignment_file(
        self,
        mock_upload
    ):
        assignment = Assignment.objects.create(
            faculty_course=self.faculty_course,
            title="Assignment With File",
            description="Test assignment file upload.",
            due_date="2026-09-25T23:59:00Z",
            max_marks=20,
            allow_late_submission=True,
            is_active=True
        )

        mock_upload.return_value = {
            "secure_url": (
                "https://res.cloudinary.com/test/"
                "assignment-reference.pdf"
            )
        }

        uploaded_file = SimpleUploadedFile(
            "assignment-reference.pdf",
            b"fake pdf content",
            content_type="application/pdf"
        )

        response = self.client.post(
            f"/api/academics/assignments/"
            f"{assignment.assignment_id}/files/",
            {
                "file": uploaded_file
            },
            format="multipart"
        )

        self.assertEqual(
            response.status_code,
            201
        )

        assignment_file = AssignmentFile.objects.get(
            assignment=assignment
        )

        self.assertEqual(
            assignment_file.file_name,
            "assignment-reference.pdf"
        )

        self.assertEqual(
            assignment_file.file_url,
            "https://res.cloudinary.com/test/"
            "assignment-reference.pdf"
        )

        mock_upload.assert_called_once()

    @patch("apps.academics.views.cloudinary.uploader.upload")
    def test_faculty_can_upload_multiple_assignment_files(
        self,
        mock_upload
    ):
        assignment = Assignment.objects.create(
            faculty_course=self.faculty_course,
            title="Multiple Reference Files",
            description="Assignment with multiple files.",
            due_date="2026-09-25T23:59:00Z",
            max_marks=20,
            allow_late_submission=True,
            is_active=True
        )

        mock_upload.side_effect = [
            {
                "secure_url": (
                    "https://res.cloudinary.com/test/"
                    "notes.pdf"
                )
            },
            {
                "secure_url": (
                    "https://res.cloudinary.com/test/"
                    "questions.pdf"
                )
            },
            {
                "secure_url": (
                    "https://res.cloudinary.com/test/"
                    "reference.pdf"
                )
            }
        ]

        files = [
            SimpleUploadedFile(
                "notes.pdf",
                b"fake notes",
                content_type="application/pdf"
            ),
            SimpleUploadedFile(
                "questions.pdf",
                b"fake questions",
                content_type="application/pdf"
            ),
            SimpleUploadedFile(
                "reference.pdf",
                b"fake reference",
                content_type="application/pdf"
            )
        ]

        for uploaded_file in files:
            response = self.client.post(
                f"/api/academics/assignments/"
                f"{assignment.assignment_id}/files/",
                {
                    "file": uploaded_file
                },
                format="multipart"
            )

            self.assertEqual(
                response.status_code,
                201
            )

        assignment_files = AssignmentFile.objects.filter(
            assignment=assignment
        )

        self.assertEqual(
            assignment_files.count(),
            3
        )

        self.assertEqual(
            mock_upload.call_count,
            3
        )

    @patch("apps.academics.views.delete_cloudinary_file")
    def test_faculty_can_delete_assignment_file(
        self,
        mock_delete
    ):
        assignment = Assignment.objects.create(
            faculty_course=self.faculty_course,
            title="Assignment File Delete",
            description="Test file deletion.",
            due_date="2026-09-25T23:59:00Z",
            max_marks=20,
            allow_late_submission=True,
            is_active=True
        )

        assignment_file = AssignmentFile.objects.create(
            assignment=assignment,
            file_name="old-reference.pdf",
            file_url=(
                "https://res.cloudinary.com/test/"
                "old-reference.pdf"
            )
        )

        response = self.client.delete(
            f"/api/academics/assignments/"
            f"{assignment.assignment_id}/files/"
            f"{assignment_file.assignment_file_id}/"
        )

        self.assertEqual(
            response.status_code,
            204
        )

        self.assertFalse(
            AssignmentFile.objects.filter(
                assignment_file_id=assignment_file.assignment_file_id
            ).exists()
        )

        mock_delete.assert_called_once_with(
            "https://res.cloudinary.com/test/old-reference.pdf"
        )

    def test_student_cannot_upload_assignment_file(self):
        assignment = Assignment.objects.create(
            faculty_course=self.faculty_course,
            title="Protected Assignment",
            description="Students cannot add reference files.",
            due_date="2026-09-25T23:59:00Z",
            max_marks=20,
            allow_late_submission=True,
            is_active=True
        )

        self.client.force_authenticate(
            user=self.student_user
        )

        uploaded_file = SimpleUploadedFile(
            "student-file.pdf",
            b"fake pdf content",
            content_type="application/pdf"
        )

        response = self.client.post(
            f"/api/academics/assignments/"
            f"{assignment.assignment_id}/files/",
            {
                "file": uploaded_file
            },
            format="multipart"
        )

        self.assertEqual(
            response.status_code,
            403
        )

        self.assertEqual(
            AssignmentFile.objects.count(),
            0
        )    

    @patch("apps.academics.views.delete_cloudinary_file")
    def test_faculty_cannot_delete_other_faculty_assignment_file(
        self,
        mock_delete
    ):
        other_user = User.objects.create_user(
            email="fileowner@test.com",
            password="TestPassword123",
            role="faculty"
        )

        other_faculty = Faculty.objects.create(
            faculty_id="FAC006",
            user=other_user,
            full_name="Other File Faculty",
            faculty_email="fileowner@test.com",
            department=self.department
        )

        other_faculty_course = FacultyCourse.objects.create(
            faculty=other_faculty,
            course=self.course,
            sem=5,
            year=3,
            div="A",
            batch=None,
            class_type="lecture",
            academic_year="2026-27"
        )

        assignment = Assignment.objects.create(
            faculty_course=other_faculty_course,
            title="Other Faculty Assignment",
            description="Protected assignment.",
            due_date="2026-09-25T23:59:00Z",
            max_marks=20,
            allow_late_submission=True,
            is_active=True
        )

        assignment_file = AssignmentFile.objects.create(
            assignment=assignment,
            file_name="protected.pdf",
            file_url=(
                "https://res.cloudinary.com/test/"
                "protected.pdf"
            )
        )

        self.client.force_authenticate(
            user=self.user
        )

        response = self.client.delete(
            f"/api/academics/assignments/"
            f"{assignment.assignment_id}/files/"
            f"{assignment_file.assignment_file_id}/"
        )

        self.assertEqual(
            response.status_code,
            403
        )

        self.assertTrue(
            AssignmentFile.objects.filter(
                assignment_file_id=assignment_file.assignment_file_id
            ).exists()
        )

        mock_delete.assert_not_called()

    @patch("apps.academics.views.delete_cloudinary_file")
    def test_faculty_delete_assignment_deletes_all_assignment_files(
        self,
        mock_delete
    ):
        assignment = Assignment.objects.create(
            faculty_course=self.faculty_course,
            title="Assignment With Files",
            description="Test assignment.",
            due_date="2026-09-25T23:59:00Z",
            max_marks=20,
            allow_late_submission=True,
            is_active=True
        )

        file_one = AssignmentFile.objects.create(
            assignment=assignment,
            file_name="notes.pdf",
            file_url=(
                "https://res.cloudinary.com/test/"
                "notes.pdf"
            )
        )

        file_two = AssignmentFile.objects.create(
            assignment=assignment,
            file_name="questions.pdf",
            file_url=(
                "https://res.cloudinary.com/test/"
                "questions.pdf"
            )
        )

        self.client.force_authenticate(
            user=self.user
        )

        response = self.client.delete(
            f"/api/academics/assignments/"
            f"{assignment.assignment_id}/"
        )

        self.assertEqual(
            response.status_code,
            204
        )

        self.assertFalse(
            Assignment.objects.filter(
                assignment_id=assignment.assignment_id
            ).exists()
        )

        self.assertFalse(
            AssignmentFile.objects.filter(
                assignment_file_id=file_one.assignment_file_id
            ).exists()
        )

        self.assertFalse(
            AssignmentFile.objects.filter(
                assignment_file_id=file_two.assignment_file_id
            ).exists()
        )

        self.assertEqual(
            mock_delete.call_count,
            2
        )

        mock_delete.assert_any_call(
            file_one.file_url
        )

        mock_delete.assert_any_call(
            file_two.file_url
        )

    def test_student_opening_assignment_does_not_create_submission(self):
        assignment = Assignment.objects.create(
            faculty_course=self.faculty_course,
            title="Submission Test",
            description="Test assignment.",
            due_date="2026-09-25T23:59:00Z",
            max_marks=20,
            allow_late_submission=True,
            is_active=True
        )

        self.client.force_authenticate(
            user=self.student_user
        )

        response = self.client.get(
            f"/api/academics/assignments/"
            f"{assignment.assignment_id}/submission/"
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_200_OK
        )

        self.assertEqual(
            response.data,
            {
                "submission": None,
                "status": "not_submitted",
                "files": []
            }
        )

        self.assertEqual(
            Submission.objects.filter(
                assignment=assignment,
                student=self.student
            ).count(),
            0
        )

    def test_student_cannot_access_assignment_outside_cohort(self):
        assignment = Assignment.objects.create(
            faculty_course=self.faculty_course,
            title="Different Cohort",
            description="The student is enrolled but in another cohort.",
            due_date=timezone.now() + timedelta(days=2),
            max_marks=20,
            allow_late_submission=True,
            is_active=True
        )
        submission = Submission.objects.create(
            assignment=assignment,
            student=self.student,
            status="draft"
        )
        submission_file = SubmissionFile.objects.create(
            submission=submission,
            file_name="answer.pdf",
            file_url="https://example.com/answer.pdf"
        )

        self.student.div = "B"
        self.student.save(update_fields=["div"])
        self.client.force_authenticate(user=self.student_user)

        responses = [
            self.client.get(
                f"/api/academics/assignments/{assignment.assignment_id}/"
            ),
            self.client.get(
                f"/api/academics/assignments/"
                f"{assignment.assignment_id}/submission/"
            ),
            self.client.post(
                f"/api/academics/assignments/"
                f"{assignment.assignment_id}/submission/files/"
            ),
            self.client.post(
                f"/api/academics/assignments/"
                f"{assignment.assignment_id}/submission/hand-in/"
            ),
            self.client.post(
                f"/api/academics/assignments/"
                f"{assignment.assignment_id}/submission/undo-hand-in/"
            ),
            self.client.delete(
                f"/api/academics/assignments/"
                f"{assignment.assignment_id}/submission/files/"
                f"{submission_file.submission_file_id}/"
            ),
            self.client.get(
                f"/api/academics/assignments/"
                f"{assignment.assignment_id}/submission/files/"
                f"{submission_file.submission_file_id}/file/"
            ),
        ]

        for response in responses:
            self.assertEqual(
                response.status_code,
                status.HTTP_403_FORBIDDEN
            )

        list_response = self.client.get("/api/academics/assignments/")
        self.assertEqual(list_response.status_code, status.HTTP_200_OK)
        self.assertNotIn(
            assignment.assignment_id,
            [item["assignment_id"] for item in list_response.data]
        )

    def test_practical_assignment_access_requires_matching_batch(self):
        practical_course = FacultyCourse.objects.create(
            faculty=self.faculty,
            course=self.course,
            sem=self.faculty_course.sem,
            year=self.faculty_course.year,
            div=self.faculty_course.div,
            batch="A2",
            class_type="practical",
            academic_year=self.faculty_course.academic_year
        )
        assignment = Assignment.objects.create(
            faculty_course=practical_course,
            title="Other Practical Batch",
            description="The student belongs to batch A1.",
            due_date=timezone.now() + timedelta(days=2),
            max_marks=20,
            allow_late_submission=True,
            is_active=True
        )

        self.client.force_authenticate(user=self.student_user)
        response = self.client.get(
            f"/api/academics/assignments/"
            f"{assignment.assignment_id}/submission/"
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_403_FORBIDDEN
        )

        list_response = self.client.get("/api/academics/assignments/")
        self.assertNotIn(
            assignment.assignment_id,
            [item["assignment_id"] for item in list_response.data]
        )

    def test_student_get_submission_reuses_existing_submission(self):
        assignment = Assignment.objects.create(
            faculty_course=self.faculty_course,
            title="Existing Submission",
            description="Test assignment.",
            due_date="2026-09-25T23:59:00Z",
            max_marks=20,
            allow_late_submission=True,
            is_active=True
        )

        submission = Submission.objects.create(
            assignment=assignment,
            student=self.student,
            status="draft"
        )

        self.client.force_authenticate(
            user=self.student_user
        )

        response = self.client.get(
            f"/api/academics/assignments/"
            f"{assignment.assignment_id}/submission/"
        )

        self.assertEqual(
            response.status_code,
            200
        )

        self.assertEqual(
            response.data["submission_id"],
            submission.submission_id
        )

        self.assertEqual(
            Submission.objects.filter(
                assignment=assignment,
                student=self.student
            ).count(),
            1
        )

    @patch("apps.academics.views.serve_cloudinary_file")
    def test_student_can_preview_reference_assignment_file(
        self,
        serve_file
    ):
        assignment = Assignment.objects.create(
            faculty_course=self.faculty_course,
            title="Reference Preview",
            description="Test assignment.",
            due_date=timezone.now() + timedelta(days=2),
            max_marks=20,
            allow_late_submission=True,
            is_active=True
        )
        assignment_file = AssignmentFile.objects.create(
            assignment=assignment,
            file_name="reference.pdf",
            file_url="https://res.cloudinary.com/demo/raw/upload/reference.pdf"
        )
        serve_file.return_value = HttpResponse("inline file")
        self.client.force_authenticate(user=self.student_user)

        response = self.client.get(
            f"/api/academics/assignments/{assignment.assignment_id}/"
            f"files/{assignment_file.assignment_file_id}/file/"
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        serve_file.assert_called_once()
        self.assertEqual(
            serve_file.call_args.args[1:],
            (assignment_file.file_url, assignment_file.file_name)
        )

    @patch("apps.academics.views.serve_cloudinary_file")
    def test_student_can_preview_own_submission_file(
        self,
        serve_file
    ):
        assignment = Assignment.objects.create(
            faculty_course=self.faculty_course,
            title="Submission Preview",
            description="Test assignment.",
            due_date=timezone.now() + timedelta(days=2),
            max_marks=20,
            allow_late_submission=True,
            is_active=True
        )
        submission = Submission.objects.create(
            assignment=assignment,
            student=self.student,
            status="draft"
        )
        submission_file = SubmissionFile.objects.create(
            submission=submission,
            file_name="my-work.pdf",
            file_url="https://res.cloudinary.com/demo/raw/upload/my-work.pdf"
        )
        serve_file.return_value = HttpResponse("inline file")
        self.client.force_authenticate(user=self.student_user)

        response = self.client.get(
            f"/api/academics/assignments/{assignment.assignment_id}/"
            f"submission/files/{submission_file.submission_file_id}/file/"
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        serve_file.assert_called_once()
        self.assertEqual(
            serve_file.call_args.args[1:],
            (submission_file.file_url, submission_file.file_name)
        )

    def test_faculty_cannot_access_student_submission(self):
        assignment = Assignment.objects.create(
            faculty_course=self.faculty_course,
            title="Protected Submission",
            description="Students only.",
            due_date="2026-09-25T23:59:00Z",
            max_marks=20,
            allow_late_submission=True,
            is_active=True
        )

        self.client.force_authenticate(
            user=self.user
        )

        response = self.client.get(
            f"/api/academics/assignments/"
            f"{assignment.assignment_id}/submission/"
        )

        self.assertEqual(
            response.status_code,
            403
        )


    @patch("apps.academics.views.cloudinary.uploader.upload")
    def test_student_can_add_multiple_submission_files(
        self,
        mock_upload
    ):
        assignment = Assignment.objects.create(
            faculty_course=self.faculty_course,
            title="Multiple File Submission",
            description="Test assignment.",
            due_date="2026-09-25T23:59:00Z",
            max_marks=20,
            allow_late_submission=True,
            is_active=True
        )

        mock_upload.side_effect = [
            {
                "secure_url":
                "https://cloudinary.com/file1.pdf"
            },
            {
                "secure_url":
                "https://cloudinary.com/file2.pdf"
            }
        ]

        self.client.force_authenticate(
            user=self.student_user
        )

        response = self.client.post(
            f"/api/academics/assignments/"
            f"{assignment.assignment_id}/submission/files/",
            {
                "files": [
                    SimpleUploadedFile(
                        "file1.pdf",
                        b"file one",
                        content_type="application/pdf"
                    ),
                    SimpleUploadedFile(
                        "file2.pdf",
                        b"file two",
                        content_type="application/pdf"
                    )
                ]
            },
            format="multipart"
        )

        self.assertEqual(
            response.status_code,
            201
        )

        self.assertEqual(
            SubmissionFile.objects.filter(
                submission__assignment=assignment,
                submission__student=self.student
            ).count(),
            2
        )

        submission = Submission.objects.get(
            assignment=assignment,
            student=self.student
        )
        self.assertEqual(submission.status, "draft")
        self.assertEqual(
            response.data["submission"]["submission_id"],
            submission.submission_id
        )
        self.assertEqual(len(response.data["uploaded_files"]), 2)

        self.assertEqual(
            mock_upload.call_count,
            2
        )

    @patch("apps.academics.views.delete_cloudinary_file")
    @patch("apps.academics.views.cloudinary.uploader.upload")
    def test_upload_persistence_failure_cleans_cloudinary_files(
        self,
        mock_upload,
        mock_delete_cloudinary_file
    ):
        assignment = Assignment.objects.create(
            faculty_course=self.faculty_course,
            title="Upload Cleanup",
            description="Database failure cleanup test.",
            due_date=timezone.now() + timedelta(days=2),
            max_marks=20,
            allow_late_submission=True,
            is_active=True
        )
        first_url = (
            "https://res.cloudinary.com/test/raw/upload/v1/"
            "mosaic/submissions/file1.pdf"
        )
        second_url = (
            "https://res.cloudinary.com/test/raw/upload/v1/"
            "mosaic/submissions/file2.pdf"
        )
        mock_upload.side_effect = [
            {"secure_url": first_url},
            {"secure_url": second_url}
        ]
        original_create = SubmissionFile.objects.create
        create_count = 0

        def create_then_fail(**kwargs):
            nonlocal create_count
            create_count += 1
            if create_count == 2:
                raise RuntimeError("Database write failed.")
            return original_create(**kwargs)

        self.client.force_authenticate(user=self.student_user)
        with patch.object(
            SubmissionFile.objects,
            "create",
            side_effect=create_then_fail
        ):
            with self.assertRaises(RuntimeError):
                self.client.post(
                    f"/api/academics/assignments/"
                    f"{assignment.assignment_id}/submission/files/",
                    {
                        "files": [
                            SimpleUploadedFile(
                                "file1.pdf",
                                b"file one",
                                content_type="application/pdf"
                            ),
                            SimpleUploadedFile(
                                "file2.pdf",
                                b"file two",
                                content_type="application/pdf"
                            )
                        ]
                    },
                    format="multipart"
                )

        self.assertFalse(
            Submission.objects.filter(
                assignment=assignment,
                student=self.student
            ).exists()
        )
        self.assertFalse(
            SubmissionFile.objects.filter(
                submission__assignment=assignment
            ).exists()
        )
        mock_delete_cloudinary_file.assert_has_calls(
            [call(first_url), call(second_url)]
        )

    def test_student_can_hand_in_submission(self):
        assignment = Assignment.objects.create(
            faculty_course=self.faculty_course,
            title="Hand In Test",
            description="Test assignment.",
            due_date="2026-09-25T23:59:00Z",
            max_marks=20,
            allow_late_submission=True,
            is_active=True
        )

        submission = Submission.objects.create(
            assignment=assignment,
            student=self.student,
            status="draft"
        )

        SubmissionFile.objects.create(
            submission=submission,
            file_name="answer.pdf",
            file_url="https://cloudinary.com/answer.pdf"
        )

        self.client.force_authenticate(
            user=self.student_user
        )

        response = self.client.post(
            f"/api/academics/assignments/"
            f"{assignment.assignment_id}/submission/hand-in/"
        )

        self.assertEqual(
            response.status_code,
            200
        )

        submission.refresh_from_db()

        self.assertEqual(
            submission.status,
            "submitted"
        )

        self.assertIsNotNone(
            submission.submitted_at
        )

    def test_student_cannot_hand_in_without_files(self):
        assignment = Assignment.objects.create(
            faculty_course=self.faculty_course,
            title="No File Test",
            description="Test assignment.",
            due_date="2026-09-25T23:59:00Z",
            max_marks=20,
            allow_late_submission=True,
            is_active=True
        )

        submission = Submission.objects.create(
            assignment=assignment,
            student=self.student,
            status="draft"
        )

        self.client.force_authenticate(
            user=self.student_user
        )

        response = self.client.post(
            f"/api/academics/assignments/"
            f"{assignment.assignment_id}/submission/hand-in/"
        )

        self.assertEqual(
            response.status_code,
            400
        )

        submission.refresh_from_db()

        self.assertEqual(
            submission.status,
            "draft"
        )


    def test_student_can_undo_hand_in_and_files_remain(self):
        assignment = Assignment.objects.create(
            faculty_course=self.faculty_course,
            title="Undo Hand In Test",
            description="Test assignment.",
            due_date="2026-09-25T23:59:00Z",
            max_marks=20,
            allow_late_submission=True,
            is_active=True
        )

        submission = Submission.objects.create(
            assignment=assignment,
            student=self.student,
            status="submitted",
            submitted_at=timezone.now()
        )

        submission_file = SubmissionFile.objects.create(
            submission=submission,
            file_name="answer.pdf",
            file_url="https://cloudinary.com/answer.pdf"
        )

        self.client.force_authenticate(
            user=self.student_user
        )

        response = self.client.post(
            f"/api/academics/assignments/"
            f"{assignment.assignment_id}/submission/"
            f"undo-hand-in/"
        )

        self.assertEqual(
            response.status_code,
            200
        )

        submission.refresh_from_db()

        self.assertEqual(
            submission.status,
            "draft"
        )

        self.assertIsNone(
            submission.submitted_at
        )

        self.assertTrue(
            SubmissionFile.objects.filter(
                submission_file_id=
                submission_file.submission_file_id
            ).exists()
        )

    @patch("apps.academics.views.delete_cloudinary_file")
    def test_student_can_delete_submission_file(
        self,
        mock_delete_cloudinary
    ):
        assignment = Assignment.objects.create(
            faculty_course=self.faculty_course,
            title="Delete File Test",
            description="Test assignment.",
            due_date="2026-09-25T23:59:00Z",
            max_marks=20,
            allow_late_submission=True,
            is_active=True
        )

        submission = Submission.objects.create(
            assignment=assignment,
            student=self.student,
            status="draft"
        )

        submission_file = SubmissionFile.objects.create(
            submission=submission,
            file_name="remove-me.pdf",
            file_url="https://cloudinary.com/remove-me.pdf"
        )

        self.client.force_authenticate(
            user=self.student_user
        )

        response = self.client.delete(
            f"/api/academics/assignments/"
            f"{assignment.assignment_id}/submission/files/"
            f"{submission_file.submission_file_id}/"
        )

        self.assertEqual(
            response.status_code,
            204
        )

        self.assertFalse(
            SubmissionFile.objects.filter(
                submission_file_id=
                submission_file.submission_file_id
            ).exists()
        )

        mock_delete_cloudinary.assert_called_once_with(
            "https://cloudinary.com/remove-me.pdf"
        )

        submission.refresh_from_db()

        self.assertEqual(
            submission.status,
            "draft"
        )

    @patch("apps.academics.views.delete_cloudinary_file")
    def test_student_can_undo_and_hand_in_again(
        self,
        mock_delete_cloudinary
    ):
        assignment = Assignment.objects.create(
            faculty_course=self.faculty_course,
            title="Hand In Again Test",
            description="Test assignment.",
            due_date="2026-09-25T23:59:00Z",
            max_marks=20,
            allow_late_submission=True,
            is_active=True
        )

        submission = Submission.objects.create(
            assignment=assignment,
            student=self.student,
            status="submitted",
            submitted_at=timezone.now()
        )

        submission_file = SubmissionFile.objects.create(
            submission=submission,
            file_name="answer.pdf",
            file_url="https://cloudinary.com/answer.pdf"
        )

        self.client.force_authenticate(
            user=self.student_user
        )

        # Undo Hand In

        response = self.client.post(
            f"/api/academics/assignments/"
            f"{assignment.assignment_id}/submission/"
            f"undo-hand-in/"
        )

        self.assertEqual(
            response.status_code,
            200
        )

        submission.refresh_from_db()

        self.assertEqual(
            submission.status,
            "draft"
        )

        self.assertTrue(
            SubmissionFile.objects.filter(
                submission_file_id=
                submission_file.submission_file_id
            ).exists()
        )

        # Hand In Again

        response = self.client.post(
            f"/api/academics/assignments/"
            f"{assignment.assignment_id}/submission/hand-in/"
        )

        self.assertEqual(
            response.status_code,
            200
        )

        submission.refresh_from_db()

        self.assertEqual(
            submission.status,
            "submitted"
        )

        self.assertIsNotNone(
            submission.submitted_at
        )

        self.assertTrue(
            SubmissionFile.objects.filter(
                submission=submission
            ).exists()
        )

        mock_delete_cloudinary.assert_not_called()

    def test_faculty_can_view_submitted_submissions(self):
        assignment = Assignment.objects.create(
            faculty_course=self.faculty_course,
            title="Test Assignment",
            description="Test description",
            due_date=timezone.now() + timedelta(days=2),
            max_marks=20,
            allow_late_submission=True,
            is_active=True,
        )

        submission = Submission.objects.create(
            assignment=assignment,
            student=self.student,
            status="submitted",
            submitted_at=timezone.now(),
        )

        unsubmitted_student_user = User.objects.create_user(
            email="unsubmitted@test.com",
            password="test-password",
            role="student",
        )
        unsubmitted_student = Student.objects.create(
            roll_no="102",
            user=unsubmitted_student_user,
            full_name="Unsubmitted Student",
            year=self.student.year,
            sem=self.student.sem,
            div=self.student.div,
            academic_year=self.student.academic_year,
            branch=self.student.branch,
            batch=self.student.batch,
            department=self.department,
        )
        Enrollment.objects.create(
            student=unsubmitted_student,
            course=self.course,
        )

        SubmissionFile.objects.create(
            submission=submission,
            file_name="answer.pdf",
            file_url="https://example.com/answer.pdf",
        )

        self.client.force_authenticate(
            user=self.user
        )

        response = self.client.get(
            f"/api/academics/assignments/"
            f"{assignment.assignment_id}/submissions/"
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_200_OK
        )

        self.assertEqual(
            len(response.data),
            2
        )

        self.assertEqual(
            response.data[0]["student_roll_no"],
            self.student.roll_no
        )

        self.assertEqual(
            response.data[0]["student_name"],
            self.student.full_name
        )

        self.assertEqual(
            response.data[0]["student_id"],
            self.student.id
        )

        self.assertFalse(response.data[0]["is_late"])

        self.assertEqual(
            response.data[0]["status"],
            "submitted"
        )

        self.assertEqual(
            len(response.data[0]["files"]),
            1
        )
        self.assertEqual(response.data[1]["student_id"], unsubmitted_student.id)
        self.assertIsNone(response.data[1]["submission_id"])
        self.assertEqual(response.data[1]["status"], "not_submitted")
        self.assertEqual(response.data[1]["files"], [])

    def test_faculty_submission_is_marked_late_from_submitted_at(self):
        assignment = Assignment.objects.create(
            faculty_course=self.faculty_course,
            title="Past Due Assignment",
            description="Late submission test",
            due_date=timezone.now() - timedelta(days=1),
            max_marks=20,
            allow_late_submission=True,
            is_active=True,
        )
        Submission.objects.create(
            assignment=assignment,
            student=self.student,
            status="submitted",
            submitted_at=timezone.now(),
        )

        self.client.force_authenticate(user=self.user)
        response = self.client.get(
            f"/api/academics/assignments/"
            f"{assignment.assignment_id}/submissions/"
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        self.assertTrue(response.data[0]["is_late"])

    def test_faculty_submissions_preserve_draft_and_returned_statuses(self):
        draft_assignment = Assignment.objects.create(
            faculty_course=self.faculty_course,
            title="Draft Submission",
            description="Draft status test",
            due_date=timezone.now() + timedelta(days=1),
            max_marks=20,
            allow_late_submission=True,
            is_active=True,
        )
        draft = Submission.objects.create(
            assignment=draft_assignment,
            student=self.student,
            status="draft",
        )
        returned_assignment = Assignment.objects.create(
            faculty_course=self.faculty_course,
            title="Returned Submission",
            description="Returned status test",
            due_date=timezone.now() + timedelta(days=1),
            max_marks=20,
            allow_late_submission=True,
            is_active=True,
        )
        returned = Submission.objects.create(
            assignment=returned_assignment,
            student=self.student,
            status="returned",
            submitted_at=timezone.now(),
            marks=15,
        )

        self.client.force_authenticate(user=self.user)
        draft_response = self.client.get(
            f"/api/academics/assignments/"
            f"{draft_assignment.assignment_id}/submissions/"
        )
        returned_response = self.client.get(
            f"/api/academics/assignments/"
            f"{returned_assignment.assignment_id}/submissions/"
        )

        self.assertEqual(draft_response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(draft_response.data), 1)
        self.assertEqual(draft_response.data[0]["submission_id"], draft.submission_id)
        self.assertEqual(draft_response.data[0]["status"], "draft")

        self.assertEqual(returned_response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(returned_response.data), 1)
        self.assertEqual(returned_response.data[0]["submission_id"], returned.submission_id)
        self.assertEqual(returned_response.data[0]["status"], "returned")

    def test_faculty_cannot_view_another_facultys_submissions(self):
        other_user = User.objects.create_user(
            email="otherfaculty@test.com",
            password="testpass123",
            role="faculty",
        )

        other_faculty = Faculty.objects.create(
            faculty_id="FAC002",
            user=other_user,
            full_name="Other Faculty",
            faculty_subject="Other Subject",
            faculty_email="otherfaculty@test.com",
            department=self.department,
        )

        other_faculty_course = FacultyCourse.objects.create(
            faculty=other_faculty,
            course=self.course,
            sem=self.faculty_course.sem,
            year=self.faculty_course.year,
            div=self.faculty_course.div,
            batch=self.faculty_course.batch,
            class_type=self.faculty_course.class_type,
            academic_year=self.faculty_course.academic_year,
        )

        assignment = Assignment.objects.create(
            faculty_course=other_faculty_course,
            title="Other Faculty Assignment",
            description="Test description",
            due_date=timezone.now() + timedelta(days=2),
            max_marks=20,
            allow_late_submission=True,
            is_active=True,
        )

        self.client.force_authenticate(
            user=self.user
        )

        response = self.client.get(
            f"/api/academics/assignments/"
            f"{assignment.assignment_id}/submissions/"
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_403_FORBIDDEN
        )

    def test_student_cannot_view_faculty_submissions(self):
        assignment = Assignment.objects.create(
            faculty_course=self.faculty_course,
            title="Test Assignment",
            description="Test description",
            due_date=timezone.now() + timedelta(days=2),
            max_marks=20,
            allow_late_submission=True,
            is_active=True,
        )

        self.client.force_authenticate(
            user=self.student_user
        )

        response = self.client.get(
            f"/api/academics/assignments/"
            f"{assignment.assignment_id}/submissions/"
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_403_FORBIDDEN
        )

    def test_faculty_can_grade_submitted_submission(self):
        assignment = Assignment.objects.create(
            faculty_course=self.faculty_course,
            title="Test Assignment",
            description="Test description",
            due_date=timezone.now() + timedelta(days=2),
            max_marks=20,
            allow_late_submission=True,
            is_active=True,
        )

        submission = Submission.objects.create(
            assignment=assignment,
            student=self.student,
            status="submitted",
            submitted_at=timezone.now(),
        )

        self.client.force_authenticate(
            user=self.user
        )

        response = self.client.put(
            f"/api/academics/assignments/"
            f"{assignment.assignment_id}/submissions/"
            f"{submission.submission_id}/",
            {
                "marks": 18,
                "feedback": "Good work."
            },
            format="json"
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_200_OK
        )

        submission.refresh_from_db()

        self.assertEqual(
            submission.marks,
            18
        )

        self.assertEqual(
            submission.feedback,
            "Good work."
        )

    def test_faculty_can_grade_submitted_submission_without_feedback(self):
        assignment = Assignment.objects.create(
            faculty_course=self.faculty_course,
            title="Marks Only Assignment",
            description="Feedback is optional.",
            due_date=timezone.now() + timedelta(days=2),
            max_marks=20,
            allow_late_submission=True,
            is_active=True,
        )
        submission = Submission.objects.create(
            assignment=assignment,
            student=self.student,
            status="submitted",
            submitted_at=timezone.now(),
        )

        self.client.force_authenticate(user=self.user)
        response = self.client.put(
            f"/api/academics/assignments/"
            f"{assignment.assignment_id}/submissions/"
            f"{submission.submission_id}/",
            {"marks": 18},
            format="json"
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        submission.refresh_from_db()
        self.assertEqual(submission.marks, 18)
        self.assertEqual(submission.feedback, "")

    def test_faculty_rejects_decimal_marks(self):
        assignment = Assignment.objects.create(
            faculty_course=self.faculty_course,
            title="Decimal Marks",
            description="Marks must be whole numbers.",
            due_date=timezone.now() + timedelta(days=2),
            max_marks=20,
            allow_late_submission=True,
            is_active=True,
        )
        submission = Submission.objects.create(
            assignment=assignment,
            student=self.student,
            status="submitted",
            submitted_at=timezone.now(),
        )

        self.client.force_authenticate(user=self.user)
        response = self.client.put(
            f"/api/academics/assignments/"
            f"{assignment.assignment_id}/submissions/"
            f"{submission.submission_id}/",
            {"marks": 18.5},
            format="json"
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_400_BAD_REQUEST
        )
        self.assertEqual(
            response.data["detail"],
            "Marks must be a whole number."
        )
        submission.refresh_from_db()
        self.assertIsNone(submission.marks)

    def test_faculty_cannot_give_marks_above_max_marks(self):
        assignment = Assignment.objects.create(
            faculty_course=self.faculty_course,
            title="Test Assignment",
            description="Test description",
            due_date=timezone.now() + timedelta(days=2),
            max_marks=20,
            allow_late_submission=True,
            is_active=True,
        )

        submission = Submission.objects.create(
            assignment=assignment,
            student=self.student,
            status="submitted",
            submitted_at=timezone.now(),
        )

        self.client.force_authenticate(
            user=self.user
        )

        response = self.client.put(
            f"/api/academics/assignments/"
            f"{assignment.assignment_id}/submissions/"
            f"{submission.submission_id}/",
            {
                "marks": 25
            },
            format="json"
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_400_BAD_REQUEST
        )

    def test_faculty_can_return_submitted_submission(self):
        assignment = Assignment.objects.create(
            faculty_course=self.faculty_course,
            title="Test Assignment",
            description="Test description",
            due_date=timezone.now() + timedelta(days=2),
            max_marks=20,
            allow_late_submission=True,
            is_active=True,
        )

        submission = Submission.objects.create(
            assignment=assignment,
            student=self.student,
            status="submitted",
            submitted_at=timezone.now(),
            marks=18,
        )

        self.client.force_authenticate(
            user=self.user
        )

        response = self.client.post(
            f"/api/academics/assignments/"
            f"{assignment.assignment_id}/submissions/"
            f"{submission.submission_id}/return/"
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_200_OK
        )

        submission.refresh_from_db()

        self.assertEqual(
            submission.status,
            "returned"
        )

    def test_student_can_resubmit_returned_submission(self):
        assignment = Assignment.objects.create(
            faculty_course=self.faculty_course,
            title="Test Assignment",
            description="Test description",
            due_date=timezone.now() + timedelta(days=2),
            max_marks=20,
            allow_late_submission=True,
            is_active=True,
        )

        submission = Submission.objects.create(
            assignment=assignment,
            student=self.student,
            status="returned",
            submitted_at=timezone.now(),
        )

        SubmissionFile.objects.create(
            submission=submission,
            file_name="revised.pdf",
            file_url="https://example.com/revised.pdf",
        )

        self.client.force_authenticate(
            user=self.student_user
        )

        response = self.client.post(
            f"/api/academics/assignments/"
            f"{assignment.assignment_id}/submission/hand-in/"
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_200_OK
        )

        submission.refresh_from_db()

        self.assertEqual(
            submission.status,
            "submitted"
        )

        self.assertIsNotNone(
            submission.submitted_at
        )

    @patch("apps.academics.views.cloudinary.uploader.upload")
    def test_student_can_edit_and_resubmit_returned_submission(
        self,
        mock_upload
    ):
        assignment = Assignment.objects.create(
            faculty_course=self.faculty_course,
            title="Returned Work",
            description="Returned work can be edited.",
            due_date=timezone.now() + timedelta(days=2),
            max_marks=20,
            allow_late_submission=True,
            is_active=True,
        )
        submission = Submission.objects.create(
            assignment=assignment,
            student=self.student,
            status="returned",
            submitted_at=timezone.now(),
        )
        SubmissionFile.objects.create(
            submission=submission,
            file_name="original.pdf",
            file_url="https://example.com/original.pdf",
        )
        mock_upload.return_value = {
            "secure_url": "https://cloudinary.com/revision.pdf"
        }
        self.client.force_authenticate(user=self.student_user)

        upload_response = self.client.post(
            f"/api/academics/assignments/"
            f"{assignment.assignment_id}/submission/files/",
            {
                "files": [
                    SimpleUploadedFile(
                        "revision.pdf",
                        b"updated answer",
                        content_type="application/pdf"
                    )
                ]
            },
            format="multipart"
        )

        self.assertEqual(
            upload_response.status_code,
            status.HTTP_201_CREATED
        )
        submission.refresh_from_db()
        self.assertEqual(submission.status, "returned")
        self.assertEqual(
            SubmissionFile.objects.filter(submission=submission).count(),
            2
        )

        hand_in_response = self.client.post(
            f"/api/academics/assignments/"
            f"{assignment.assignment_id}/submission/hand-in/"
        )
        self.assertEqual(
            hand_in_response.status_code,
            status.HTTP_200_OK
        )
        submission.refresh_from_db()
        self.assertEqual(submission.status, "submitted")
        self.assertIsNotNone(submission.submitted_at)

    def test_student_cannot_grade_submission(self):
        assignment = Assignment.objects.create(
            faculty_course=self.faculty_course,
            title="Test Assignment",
            description="Test description",
            due_date=timezone.now() + timedelta(days=2),
            max_marks=20,
            allow_late_submission=True,
            is_active=True,
        )

        submission = Submission.objects.create(
            assignment=assignment,
            student=self.student,
            status="submitted",
            submitted_at=timezone.now(),
        )

        self.client.force_authenticate(
            user=self.student_user
        )

        response = self.client.put(
            f"/api/academics/assignments/"
            f"{assignment.assignment_id}/submissions/"
            f"{submission.submission_id}/",
            {
                "marks": 18
            },
            format="json"
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_403_FORBIDDEN
        )

    def test_student_can_hand_in_before_due_date(self):
        assignment = Assignment.objects.create(
            faculty_course=self.faculty_course,
            title="Test Assignment",
            description="Test description",
            due_date=timezone.now() + timedelta(days=1),
            max_marks=20,
            allow_late_submission=False,
            is_active=True,
        )

        submission = Submission.objects.create(
            assignment=assignment,
            student=self.student,
            status="draft",
        )

        SubmissionFile.objects.create(
            submission=submission,
            file_name="answer.pdf",
            file_url="https://example.com/answer.pdf",
        )

        self.client.force_authenticate(
            user=self.student_user
        )

        response = self.client.post(
            f"/api/academics/assignments/"
            f"{assignment.assignment_id}/submission/hand-in/"
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_200_OK
        )

        submission.refresh_from_db()

        self.assertEqual(
            submission.status,
            "submitted"
        )

    def test_student_can_hand_in_late_when_allowed(self):
        assignment = Assignment.objects.create(
            faculty_course=self.faculty_course,
            title="Test Assignment",
            description="Test description",
            due_date=timezone.now() - timedelta(days=1),
            max_marks=20,
            allow_late_submission=True,
            is_active=True,
        )

        submission = Submission.objects.create(
            assignment=assignment,
            student=self.student,
            status="draft",
        )

        SubmissionFile.objects.create(
            submission=submission,
            file_name="late-answer.pdf",
            file_url="https://example.com/late-answer.pdf",
        )

        self.client.force_authenticate(
            user=self.student_user
        )

        response = self.client.post(
            f"/api/academics/assignments/"
            f"{assignment.assignment_id}/submission/hand-in/"
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_200_OK
        )

        submission.refresh_from_db()

        self.assertEqual(
            submission.status,
            "submitted"
        )

        self.assertGreater(
            submission.submitted_at,
            assignment.due_date
        )

    def test_student_cannot_hand_in_late_when_not_allowed(self):
        assignment = Assignment.objects.create(
            faculty_course=self.faculty_course,
            title="Test Assignment",
            description="Test description",
            due_date=timezone.now() - timedelta(days=1),
            max_marks=20,
            allow_late_submission=False,
            is_active=True,
        )

        submission = Submission.objects.create(
            assignment=assignment,
            student=self.student,
            status="draft",
        )

        SubmissionFile.objects.create(
            submission=submission,
            file_name="late-answer.pdf",
            file_url="https://example.com/late-answer.pdf",
        )

        self.client.force_authenticate(
            user=self.student_user
        )

        response = self.client.post(
            f"/api/academics/assignments/"
            f"{assignment.assignment_id}/submission/hand-in/"
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_400_BAD_REQUEST
        )

        submission.refresh_from_db()

        self.assertEqual(
            submission.status,
            "draft"
        )

    def test_student_cannot_hand_in_inactive_assignment(self):
        assignment = Assignment.objects.create(
            faculty_course=self.faculty_course,
            title="Test Assignment",
            description="Test description",
            due_date=timezone.now() + timedelta(days=1),
            max_marks=20,
            allow_late_submission=True,
            is_active=False,
        )

        submission = Submission.objects.create(
            assignment=assignment,
            student=self.student,
            status="draft",
        )

        SubmissionFile.objects.create(
            submission=submission,
            file_name="answer.pdf",
            file_url="https://example.com/answer.pdf",
        )

        self.client.force_authenticate(
            user=self.student_user
        )

        response = self.client.post(
            f"/api/academics/assignments/"
            f"{assignment.assignment_id}/submission/hand-in/"
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_400_BAD_REQUEST
        )

        submission.refresh_from_db()

        self.assertEqual(
            submission.status,
            "draft"
        )


class ResultsAPITestCase(TestCase):

    def setUp(self):
        self.department = Department.objects.create(
            department_name="Computer Engineering",
            department_code="CE"
        )

        self.faculty_user = User.objects.create_user(
            email="faculty_results@test.com",
            password="testpass123",
            role="faculty"
        )

        self.faculty = Faculty.objects.create(
            user=self.faculty_user,
            faculty_id="FAC-RESULT",
            full_name="Test Faculty",
            department=self.department
        )

        self.admin_user = User.objects.create_user(
            email="admin_results@test.com",
            password="testpass123",
            role="admin"
        )

        self.admin = Admin.objects.create(
            user=self.admin_user,
            admin_id="ADM-RESULT",
            full_name="Test Admin",
            department=self.department
        )

        self.student_user = User.objects.create_user(
            email="student_results@test.com",
            password="testpass123",
            role="student"
        )

        self.student = Student.objects.create(
            user=self.student_user,
            roll_no="RESULT001",
            full_name="Student One",
            year=3,
            sem=5,
            div="A",
            academic_year="2026-27",
            branch="Computer Engineering",
            department=self.department,
            scheme="AUTO REV. 2024 PURE"
        )

        self.student2_user = User.objects.create_user(
            email="student2_results@test.com",
            password="testpass123",
            role="student"
        )

        self.student2 = Student.objects.create(
            user=self.student2_user,
            roll_no="RESULT002",
            full_name="Student Two",
            year=3,
            sem=5,
            div="A",
            academic_year="2026-27",
            branch="Computer Engineering",
            department=self.department,
            scheme="AUTO REV. 2024 PURE"
        )

        self.course = Course.objects.create(
            course_id="ML501",
            course_name="Machine Learning",
            course_sem=5,
            credits=4,
            department=self.department
        )

        self.semester_result = SemesterResult.objects.create(
            student=self.student,
            academic_year="2026-27",
            sem=5,
            sgpi=9.20,
            cgpa=9.10,
            total_credits=24,
            result_status="pass"
        )

        self.result = Result.objects.create(
            semester_result=self.semester_result,
            course=self.course,
            isa=25,
            mse=28,
            ese=42,
            total_marks=95,
            grade="O",
            grade_point=10
        )

        self.semester_result2 = SemesterResult.objects.create(
            student=self.student2,
            academic_year="2026-27",
            sem=5,
            sgpi=8.50,
            cgpa=8.40,
            total_credits=24,
            result_status="pass"
        )

        self.result2 = Result.objects.create(
            semester_result=self.semester_result2,
            course=self.course,
            isa=22,
            mse=25,
            ese=38,
            total_marks=85,
            grade="A+",
            grade_point=9
        )

        self.client = APIClient()

    def test_student_can_view_own_unpublished_results(self):
        self.client.force_authenticate(
            user=self.student_user
        )

        response = self.client.get("/api/academics/results/")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data), 1)
        self.assertFalse(response.data[0]["is_published"])
        self.assertEqual(
            response.data[0]["results"][0]["course_id"],
            "ML501"
        )

    def test_student_can_view_own_published_results(self):
        self.semester_result.is_published = True
        self.semester_result.save()

        self.client.force_authenticate(
            user=self.student_user
        )

        response = self.client.get("/api/academics/results/")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(
            response.data[0]["semester_result_id"],
            self.semester_result.semester_result_id
        )

    def test_student_cannot_view_other_students_results(self):
        self.semester_result.is_published = True
        self.semester_result2.is_published = True

        self.semester_result.save()
        self.semester_result2.save()

        self.client.force_authenticate(
            user=self.student_user
        )

        response = self.client.get("/api/academics/results/")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(
            response.data[0]["student"],
            self.student.id
        )

    def test_faculty_cannot_view_student_results(self):
        self.client.force_authenticate(
            user=self.faculty_user
        )

        response = self.client.get("/api/academics/results/")

        self.assertEqual(response.status_code, 403)

    def test_admin_can_view_all_results(self):
        self.client.force_authenticate(
            user=self.admin_user
        )

        response = self.client.get("/api/academics/admin/results/")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data), 2)

    def test_admin_can_filter_results_by_cohort_and_student_search(self):
        self.client.force_authenticate(user=self.admin_user)

        response = self.client.get(
            "/api/academics/admin/results/",
            {
                "branch": str(self.department.department_id),
                "year": 3,
                "semester": 5,
                "division": "A",
                "academic_year": "2026-27",
                "search": "RESULT002",
            }
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]["student"], self.student2.id)
        self.assertEqual(response.data[0]["roll_no"], "RESULT002")

    def test_admin_user_profiles_include_student_primary_key_for_result_links(self):
        self.client.force_authenticate(user=self.admin_user)

        response = self.client.get("/api/users/admin/users/")

        self.assertEqual(response.status_code, 200)
        student_user = next(
            item
            for item in response.data
            if item["id"] == str(self.student_user.id)
        )
        self.assertEqual(
            student_user["profile"]["studentPk"],
            self.student.id
        )

    def test_admin_result_filters_reject_invalid_integer_values(self):
        self.client.force_authenticate(user=self.admin_user)

        response = self.client.get(
            "/api/academics/admin/results/",
            {"semester": "not-a-semester"}
        )

        self.assertEqual(response.status_code, 400)

    def test_student_cannot_view_admin_results(self):
        self.client.force_authenticate(
            user=self.student_user
        )

        response = self.client.get("/api/academics/admin/results/")

        self.assertEqual(response.status_code, 403)

    def test_faculty_cannot_view_admin_results(self):
        self.client.force_authenticate(
            user=self.faculty_user
        )

        response = self.client.get("/api/academics/admin/results/")

        self.assertEqual(response.status_code, 403)

    def test_admin_can_create_semester_result(self):
        self.client.force_authenticate(
            user=self.admin_user
        )

        response = self.client.post(
            "/api/academics/admin/results/semester/",
            {
                "student": self.student.id,
                "academic_year": "2026-27",
                "sem": 6,
                "sgpi": "9.00",
                "cgpa": "9.05",
                "total_credits": 24,
                "result_status": "pass"
            },
            format="json"
        )

        self.assertEqual(response.status_code, 201)

    def test_non_admin_cannot_create_semester_result(self):
        self.client.force_authenticate(
            user=self.student_user
        )

        response = self.client.post(
            "/api/academics/admin/results/semester/",
            {
                "student": self.student.id,
                "academic_year": "2027-28",
                "sem": 5,
                "sgpi": "9.00",
                "cgpa": "9.00",
                "total_credits": 24,
                "result_status": "pass"
            },
            format="json"
        )

        self.assertEqual(response.status_code, 403)

    def test_admin_can_create_result(self):
        second_course = Course.objects.create(
            course_id="ML502",
            course_name="Deep Learning",
            course_sem=5,
            credits=3,
            department=self.department
        )

        self.client.force_authenticate(
            user=self.admin_user
        )

        response = self.client.post(
            f"/api/academics/admin/results/semester/"
            f"{self.semester_result.semester_result_id}/results/",
            {
                "course": second_course.course_id,
                "isa": 25,
                "mse": 27,
                "ese": 40,
                "total_marks": 92,
                "grade": "O",
                "grade_point": 10
            },
            format="json"
        )

        self.assertEqual(response.status_code, 201)

        self.assertTrue(
            Result.objects.filter(
                semester_result=self.semester_result,
                course=second_course
            ).exists()
        )

    def test_admin_can_edit_unpublished_result(self):
        self.client.force_authenticate(
            user=self.admin_user
        )

        response = self.client.patch(
            f"/api/academics/admin/results/semester/"
            f"{self.semester_result.semester_result_id}/",
            {
                "sgpi": "9.50"
            },
            format="json"
        )

        self.assertEqual(response.status_code, 200)

        self.semester_result.refresh_from_db()

        self.assertEqual(
            str(self.semester_result.sgpi),
            "9.50"
        )

    def test_published_result_cannot_be_edited(self):
        self.semester_result.is_published = True
        self.semester_result.save()

        self.client.force_authenticate(
            user=self.admin_user
        )

        response = self.client.patch(
            f"/api/academics/admin/results/semester/"
            f"{self.semester_result.semester_result_id}/",
            {
                "sgpi": "10.00"
            },
            format="json"
        )

        self.assertEqual(response.status_code, 400)

    def test_only_admin_can_publish_results(self):
        self.client.force_authenticate(
            user=self.student_user
        )

        response = self.client.post(
            "/api/academics/admin/results/publish/",
            {
                "academic_year": "2026-27",
                "sem": 5
            },
            format="json"
        )

        self.assertEqual(response.status_code, 403)

    def test_admin_can_publish_all_results_for_semester(self):
        self.client.force_authenticate(
            user=self.admin_user
        )

        response = self.client.post(
            "/api/academics/admin/results/publish/",
            {
                "academic_year": "2026-27",
                "sem": 5
            },
            format="json"
        )

        self.assertEqual(response.status_code, 200)

        self.semester_result.refresh_from_db()
        self.semester_result2.refresh_from_db()

        self.assertTrue(self.semester_result.is_published)
        self.assertTrue(self.semester_result2.is_published)

        self.assertIsNotNone(
            self.semester_result.published_at
        )

        self.assertIsNotNone(
            self.semester_result2.published_at
        )

        self.assertEqual(
            self.semester_result.published_at,
            self.semester_result2.published_at
        )

    def test_already_published_results_cannot_be_published_again(self):
        self.semester_result.is_published = True
        self.semester_result.published_at = timezone.now()
        self.semester_result.save()

        self.semester_result2.is_published = True
        self.semester_result2.published_at = timezone.now()
        self.semester_result2.save()

        self.client.force_authenticate(
            user=self.admin_user
        )

        response = self.client.post(
            "/api/academics/admin/results/publish/",
            {
                "academic_year": "2026-27",
                "sem": 5
            },
            format="json"
        )

        self.assertEqual(response.status_code, 400)


class NewAcademicsAPITestCase(TestCase):

    def setUp(self):
        self.client = APIClient()

        # Department
        self.department = Department.objects.create(
            department_name="Computer Engineering",
            department_code="CE"
        )

        self.department2 = Department.objects.create(
            department_name="Information Technology",
            department_code="IT"
        )

        # Admin
        self.admin_user = User.objects.create_user(
            email="admin@test.com",
            password="TestPassword123",
            role="admin"
        )

        self.admin = Admin.objects.create(
            admin_id="ADM001",
            user=self.admin_user,
            full_name="Test Admin",
            department=self.department
        )

        # Faculty
        self.faculty_user = User.objects.create_user(
            email="faculty@test.com",
            password="TestPassword123",
            role="faculty"
        )

        self.faculty = Faculty.objects.create(
            faculty_id="FAC001",
            user=self.faculty_user,
            full_name="Test Faculty",
            faculty_email="faculty@test.com",
            department=self.department
        )

        self.faculty_user2 = User.objects.create_user(
            email="faculty2@test.com",
            password="TestPassword123",
            role="faculty"
        )

        self.faculty2 = Faculty.objects.create(
            faculty_id="FAC002",
            user=self.faculty_user2,
            full_name="Second Faculty",
            faculty_email="faculty2@test.com",
            department=self.department
        )

        # Student
        self.student_user = User.objects.create_user(
            email="student@test.com",
            password="TestPassword123",
            role="student"
        )

        self.student = Student.objects.create(
            roll_no="101",
            user=self.student_user,
            full_name="Test Student",
            year=3,
            sem=5,
            div="A",
            academic_year="2026-27",
            branch="Computer Engineering",
            batch="A1",
            specialization="AI/ML",
            department=self.department,
            scheme="AUTO REV. 2024 PURE"
        )

        # Second student for calendar/result/dashboard tests
        self.student_user2 = User.objects.create_user(
            email="student2@test.com",
            password="TestPassword123",
            role="student"
        )

        self.student2 = Student.objects.create(
            roll_no="102",
            user=self.student_user2,
            full_name="Second Student",
            year=3,
            sem=5,
            div="A",
            academic_year="2026-27",
            branch="Computer Engineering",
            batch="A1",
            specialization="AI/ML",
            department=self.department,
            scheme="AUTO REV. 2024 PURE"
        )

        # Course
        self.course = Course.objects.create(
            course_id="CS501",
            course_name="Data Structures",
            course_sem=5,
            credits=4,
            department=self.department
        )

        self.course2 = Course.objects.create(
            course_id="CS502",
            course_name="Database Systems",
            course_sem=5,
            credits=4,
            department=self.department
        )

        # Enrollment
        Enrollment.objects.create(
            student=self.student,
            course=self.course
        )

        Enrollment.objects.create(
            student=self.student2,
            course=self.course
        )

        # Faculty-course
        self.faculty_course = FacultyCourse.objects.create(
            faculty=self.faculty,
            course=self.course,
            sem=5,
            year=3,
            div="A",
            batch=None,
            class_type="lecture",
            academic_year="2026-27"
        )

        # Room
        self.room = Room.objects.create(
            room_no="101",
            block="A",
            floor=1,
            room_type="Classroom",
            capacity=60
        )

        self.room2 = Room.objects.create(
            room_no="102",
            block="A",
            floor=1,
            room_type="Classroom",
            capacity=60
        )

        # Timetable
        self.timetable = Timetable.objects.create(
            faculty_course=self.faculty_course,
            room=self.room,
            day="Monday",
            start_time=time(10, 0),
            end_time=time(11, 0)
        )

        # Authentication defaults to admin
        self.client.force_authenticate(
            user=self.admin_user
        )

    # ---------------------------------------------------------
    # DEPARTMENT MANAGEMENT
    # ---------------------------------------------------------

    def test_department_list(self):
        response = self.client.get(
            "/api/academics/admin/departments/"
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(
            any(
                item["department_code"] == "CE"
                for item in response.data
            )
        )

    def test_department_create(self):
        response = self.client.post(
            "/api/academics/admin/departments/",
            {
                "department_name": "Electronics Engineering",
                "department_code": "EX"
            },
            format="json"
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertTrue(
            Department.objects.filter(
                department_code="EX"
            ).exists()
        )

    def test_department_update(self):
        response = self.client.patch(
            f"/api/academics/admin/departments/{self.department.department_id}/",
            {
                "department_name": "Computer Science and Engineering"
            },
            format="json"
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)

        self.department.refresh_from_db()

        self.assertEqual(
            self.department.department_name,
            "Computer Science and Engineering"
        )

    def test_department_delete(self):
        department = Department.objects.create(
            department_name="Mechanical Engineering",
            department_code="ME"
        )

        response = self.client.delete(
            f"/api/academics/admin/departments/{department.department_id}/"
        )

        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)

        self.assertFalse(
            Department.objects.filter(
                department_id=department.department_id
            ).exists()
        )

    def test_department_requires_admin(self):
        self.client.force_authenticate(
            user=self.faculty_user
        )

        response = self.client.get(
            "/api/academics/admin/departments/"
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_403_FORBIDDEN
        )

    # ---------------------------------------------------------
    # COURSE MANAGEMENT
    # ---------------------------------------------------------

    def test_course_list(self):
        response = self.client.get(
            "/api/academics/admin/courses/"
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(
            any(
                item["course_id"] == "CS501"
                for item in response.data
            )
        )

    def test_course_create(self):
        response = self.client.post(
            "/api/academics/admin/courses/",
            {
                "course_id": "CS503",
                "course_name": "Operating Systems",
                "course_sem": 5,
                "credits": 3,
                "department": self.department.department_id
            },
            format="json"
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

        self.assertTrue(
            Course.objects.filter(
                course_id="CS503"
            ).exists()
        )

    def test_course_update(self):
        response = self.client.patch(
            f"/api/academics/admin/courses/{self.course.course_id}/",
            {
                "course_name": "Advanced Data Structures"
            },
            format="json"
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)

        self.course.refresh_from_db()

        self.assertEqual(
            self.course.course_name,
            "Advanced Data Structures"
        )

    def test_course_delete(self):
        course = Course.objects.create(
            course_id="CS599",
            course_name="Temporary Course",
            course_sem=5,
            credits=2,
            department=self.department2
        )

        response = self.client.delete(
            f"/api/academics/admin/courses/{course.course_id}/"
        )

        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)

        self.assertFalse(
            Course.objects.filter(
                course_id="CS599"
            ).exists()
        )

    # ---------------------------------------------------------
    # FACULTY-COURSE MANAGEMENT
    # ---------------------------------------------------------

    def test_faculty_course_list(self):
        response = self.client.get(
            "/api/academics/admin/faculty-courses/"
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_faculty_course_create_lecture(self):
        response = self.client.post(
            "/api/academics/admin/faculty-courses/",
            {
                "faculty": self.faculty.id,
                "course": self.course2.course_id,
                "sem": 5,
                "year": 3,
                "div": "A",
                "batch": None,
                "class_type": "lecture",
                "academic_year": "2026-27"
            },
            format="json"
        )

        print("\nFACULTY COURSE CREATE RESPONSE:")
        print(response.status_code)
        print(response.data)

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

    def test_faculty_course_lecture_cannot_have_batch(self):
        response = self.client.post(
            "/api/academics/admin/faculty-courses/",
            {
                "faculty": self.faculty2.faculty_id,
                "course": self.course2.course_id,
                "sem": 5,
                "year": 3,
                "div": "A",
                "batch": "A1",
                "class_type": "lecture",
                "academic_year": "2026-27"
            },
            format="json"
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_400_BAD_REQUEST
        )

    def test_faculty_course_practical_requires_batch(self):
        response = self.client.post(
            "/api/academics/admin/faculty-courses/",
            {
                "faculty": self.faculty2.faculty_id,
                "course": self.course2.course_id,
                "sem": 5,
                "year": 3,
                "div": "A",
                "batch": None,
                "class_type": "practical",
                "academic_year": "2026-27"
            },
            format="json"
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_400_BAD_REQUEST
        )

    def test_faculty_course_update(self):
        response = self.client.patch(
            f"/api/academics/admin/faculty-courses/"
            f"{self.faculty_course.faculty_course_id}/",
            {
                "div": "B"
            },
            format="json"
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)

        self.faculty_course.refresh_from_db()

        self.assertEqual(
            self.faculty_course.div,
            "B"
        )

    def test_faculty_course_delete(self):
        faculty_course = FacultyCourse.objects.create(
            faculty=self.faculty2,
            course=self.course2,
            sem=5,
            year=3,
            div="A",
            batch=None,
            class_type="lecture",
            academic_year="2026-27"
        )

        response = self.client.delete(
            f"/api/academics/admin/faculty-courses/"
            f"{faculty_course.faculty_course_id}/"
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_204_NO_CONTENT
        )

    # ---------------------------------------------------------
    # TIMETABLE MANAGEMENT
    # ---------------------------------------------------------

    def test_timetable_list(self):
        response = self.client.get(
            "/api/academics/admin/timetable/"
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_timetable_create(self):
        response = self.client.post(
            "/api/academics/admin/timetable/",
            {
                "faculty_course": self.faculty_course.faculty_course_id,
                "room": self.room2.room_no,
                "day": "Tuesday",
                "start_time": "10:00:00",
                "end_time": "11:00:00"
            },
            format="json"
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_201_CREATED
        )

    def test_timetable_rejects_invalid_time(self):
        response = self.client.post(
            "/api/academics/admin/timetable/",
            {
                "faculty_course": self.faculty_course.faculty_course_id,
                "room": self.room2.room_no,
                "day": "Tuesday",
                "start_time": "11:00:00",
                "end_time": "10:00:00"
            },
            format="json"
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_400_BAD_REQUEST
        )

    def test_timetable_rejects_faculty_overlap(self):
        response = self.client.post(
            "/api/academics/admin/timetable/",
            {
                "faculty_course": self.faculty_course.faculty_course_id,
                "room": self.room2.room_no,
                "day": "Monday",
                "start_time": "10:30:00",
                "end_time": "11:30:00"
            },
            format="json"
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_400_BAD_REQUEST
        )

    def test_timetable_rejects_room_overlap(self):
        other_faculty_course = FacultyCourse.objects.create(
            faculty=self.faculty2,
            course=self.course2,
            sem=5,
            year=3,
            div="A",
            batch=None,
            class_type="lecture",
            academic_year="2026-27"
        )

        response = self.client.post(
            "/api/academics/admin/timetable/",
            {
                "faculty_course": other_faculty_course.faculty_course_id,
                "room": self.room.room_no,
                "day": "Monday",
                "start_time": "10:30:00",
                "end_time": "11:30:00"
            },
            format="json"
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_400_BAD_REQUEST
        )

    def test_timetable_update(self):
        response = self.client.patch(
            f"/api/academics/admin/timetable/"
            f"{self.timetable.timetable_id}/",
            {
                "start_time": "11:00:00",
                "end_time": "12:00:00"
            },
            format="json"
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)

        self.timetable.refresh_from_db()

        self.assertEqual(
            self.timetable.start_time,
            time(11, 0)
        )

    def test_timetable_delete(self):
        timetable = Timetable.objects.create(
            faculty_course=self.faculty_course,
            room=self.room2,
            day="Tuesday",
            start_time=time(10, 0),
            end_time=time(11, 0)
        )

        response = self.client.delete(
            f"/api/academics/admin/timetable/"
            f"{timetable.timetable_id}/"
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_204_NO_CONTENT
        )

    # ---------------------------------------------------------
    # ACADEMIC CALENDAR
    # ---------------------------------------------------------

    def test_admin_can_create_examination_period(self):
        self.client.force_authenticate(user=self.admin_user)
        response = self.client.post(
            "/api/academics/calendar/",
            {
                "academic_year": "2026-27",
                "semester": 5,
                "title": "End Semester Examination",
                "category": "examination",
                "start_date": "2026-10-10",
                "end_date": "2026-10-20",
                "description": "Semester examinations"
            },
            format="json"
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_201_CREATED
        )

        self.assertTrue(
            AcademicCalendar.objects.filter(
                title="End Semester Examination",
                category="examination",
                semester=5,
            ).exists()
        )

    def test_admin_can_create_semester_period(self):
        self.client.force_authenticate(user=self.admin_user)
        response = self.client.post(
            "/api/academics/calendar/",
            {
                "academic_year": "2026-27",
                "semester": 5,
                "title": "Semester 5",
                "category": "semester",
                "start_date": "2026-08-01",
                "end_date": "2026-12-15",
            },
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["semester"], 5)

    def test_admin_can_create_single_day_holiday_without_semester(self):
        self.client.force_authenticate(user=self.admin_user)
        response = self.client.post(
            "/api/academics/calendar/",
            {
                "academic_year": "2026-27",
                "title": "Republic Day Holiday",
                "category": "holiday",
                "start_date": "2027-01-26",
                "end_date": "2027-01-26",
            },
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertIsNone(response.data["semester"])
        self.assertEqual(response.data["start_date"], response.data["end_date"])

    def test_calendar_list(self):
        AcademicCalendar.objects.create(
            academic_year="2026-27",
            title="Diwali Holiday",
            category="holiday",
            start_date=date(2026, 10, 20),
            end_date=date(2026, 10, 22)
        )

        response = self.client.get(
            "/api/academics/calendar/"
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_student_can_view_calendar(self):
        self.client.force_authenticate(
            user=self.student_user
        )

        response = self.client.get(
            "/api/academics/calendar/"
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_faculty_can_view_calendar(self):
        self.client.force_authenticate(
            user=self.faculty_user
        )

        response = self.client.get(
            "/api/academics/calendar/"
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_student_cannot_modify_calendar(self):
        calendar = AcademicCalendar.objects.create(
            academic_year="2026-27",
            title="Existing Period",
            category="semester",
            start_date=date(2026, 8, 1),
            end_date=date(2026, 12, 15),
        )
        self.client.force_authenticate(
            user=self.student_user
        )

        payload = {
            "academic_year": "2026-27",
            "title": "Unauthorized Event",
            "category": "academic_event",
            "start_date": "2026-11-01",
            "end_date": "2026-11-01",
        }
        responses = [
            self.client.post(
                "/api/academics/calendar/",
                payload,
                format="json",
            ),
            self.client.patch(
                f"/api/academics/calendar/{calendar.calendar_id}/",
                {"title": "Changed by student"},
                format="json",
            ),
            self.client.delete(
                f"/api/academics/calendar/{calendar.calendar_id}/"
            ),
        ]

        self.assertTrue(all(
            response.status_code == status.HTTP_403_FORBIDDEN
            for response in responses
        ))

    def test_faculty_cannot_modify_calendar(self):
        calendar = AcademicCalendar.objects.create(
            academic_year="2026-27",
            title="Existing Period",
            category="semester",
            start_date=date(2026, 8, 1),
            end_date=date(2026, 12, 15),
        )
        self.client.force_authenticate(
            user=self.faculty_user
        )

        payload = {
            "academic_year": "2026-27",
            "title": "Unauthorized Event",
            "category": "academic_event",
            "start_date": "2026-11-01",
            "end_date": "2026-11-01",
        }
        responses = [
            self.client.post(
                "/api/academics/calendar/",
                payload,
                format="json",
            ),
            self.client.patch(
                f"/api/academics/calendar/{calendar.calendar_id}/",
                {"title": "Changed by faculty"},
                format="json",
            ),
            self.client.delete(
                f"/api/academics/calendar/{calendar.calendar_id}/"
            ),
        ]

        self.assertTrue(all(
            response.status_code == status.HTTP_403_FORBIDDEN
            for response in responses
        ))

    def test_admin_can_update_calendar(self):
        self.client.force_authenticate(user=self.admin_user)
        calendar = AcademicCalendar.objects.create(
            academic_year="2026-27",
            title="Old Event",
            category="academic_event",
            start_date=date(2026, 10, 1),
            end_date=date(2026, 10, 2)
        )

        response = self.client.patch(
            f"/api/academics/calendar/{calendar.calendar_id}/",
            {
                "title": "Updated Event"
            },
            format="json"
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)

        calendar.refresh_from_db()

        self.assertEqual(
            calendar.title,
            "Updated Event"
        )

    def test_admin_can_retrieve_and_replace_calendar_entry(self):
        calendar = AcademicCalendar.objects.create(
            academic_year="2026-27",
            semester=5,
            title="Old Period",
            category="semester",
            start_date=date(2026, 8, 1),
            end_date=date(2026, 12, 15),
        )
        detail = self.client.get(
            f"/api/academics/calendar/{calendar.calendar_id}/"
        )
        self.assertEqual(detail.status_code, status.HTTP_200_OK)
        self.assertEqual(detail.data["title"], "Old Period")

        response = self.client.put(
            f"/api/academics/calendar/{calendar.calendar_id}/",
            {
                "academic_year": "2026-27",
                "semester": 5,
                "title": "Replacement Period",
                "category": "semester",
                "start_date": "2026-08-02",
                "end_date": "2026-12-16",
                "description": "Updated dates",
            },
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["title"], "Replacement Period")

    def test_admin_can_delete_calendar(self):
        self.client.force_authenticate(user=self.admin_user)
        calendar = AcademicCalendar.objects.create(
            academic_year="2026-27",
            title="Temporary Event",
            category="other",
            start_date=date(2026, 12, 1),
            end_date=date(2026, 12, 1)
        )

        response = self.client.delete(
            f"/api/academics/calendar/{calendar.calendar_id}/"
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_204_NO_CONTENT
        )

    def test_calendar_rejects_end_date_before_start_date(self):
        self.client.force_authenticate(user=self.admin_user)
        response = self.client.post(
            "/api/academics/calendar/",
            {
                "academic_year": "2026-27",
                "title": "Invalid Period",
                "category": "semester",
                "start_date": "2026-12-15",
                "end_date": "2026-08-01",
            },
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("end_date", response.data)

    def test_calendar_entries_return_chronologically(self):
        self.client.force_authenticate(user=self.admin_user)
        later = AcademicCalendar.objects.create(
            academic_year="2026-27",
            title="Examinations",
            category="examination",
            start_date=date(2026, 12, 1),
            end_date=date(2026, 12, 15),
        )
        earlier = AcademicCalendar.objects.create(
            academic_year="2026-27",
            title="Registration",
            category="registration",
            start_date=date(2026, 7, 20),
            end_date=date(2026, 7, 31),
        )
        response = self.client.get("/api/academics/calendar/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(
            [item["calendar_id"] for item in response.data],
            [earlier.calendar_id, later.calendar_id],
        )

    def test_calendar_filters_by_year_semester_category_and_date_overlap(self):
        self.client.force_authenticate(user=self.admin_user)
        semester_entry = AcademicCalendar.objects.create(
            academic_year="2026-27",
            semester=5,
            title="Semester 5",
            category="semester",
            start_date=date(2026, 8, 1),
            end_date=date(2026, 12, 15),
        )
        holiday_entry = AcademicCalendar.objects.create(
            academic_year="2026-27",
            title="Diwali Holiday",
            category="holiday",
            start_date=date(2026, 10, 20),
            end_date=date(2026, 10, 24),
        )
        response = self.client.get(
            "/api/academics/calendar/?academic_year=2026-27"
            "&semester=5&category=holiday&start_date=2026-10-22"
            "&end_date=2026-10-23"
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(
            [item["calendar_id"] for item in response.data],
            [holiday_entry.calendar_id],
        )
        self.assertNotEqual(semester_entry.calendar_id, holiday_entry.calendar_id)

    def test_calendar_filter_validation_and_empty_calendar(self):
        self.client.force_authenticate(user=self.admin_user)
        empty_response = self.client.get("/api/academics/calendar/")
        self.assertEqual(empty_response.status_code, status.HTTP_200_OK)
        self.assertEqual(empty_response.data, [])

        invalid_response = self.client.get(
            "/api/academics/calendar/?category=unknown"
        )
        self.assertEqual(
            invalid_response.status_code,
            status.HTTP_400_BAD_REQUEST,
        )

    def test_seed_academic_calendar_command_is_repeatable(self):
        call_command(
            "seed_academic_calendar",
            academic_year="2026-27",
            stdout=StringIO(),
        )
        self.assertEqual(
            AcademicCalendar.objects.filter(
                academic_year="2026-27"
            ).count(),
            10,
        )
        call_command(
            "seed_academic_calendar",
            academic_year="2026-27",
            stdout=StringIO(),
        )
        self.assertEqual(
            AcademicCalendar.objects.filter(
                academic_year="2026-27"
            ).count(),
            10,
        )

    # ---------------------------------------------------------
    # ADMIN DASHBOARD
    # ---------------------------------------------------------

    def test_admin_dashboard(self):
        response = self.client.get(
            "/api/academics/admin/dashboard/"
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)

        self.assertEqual(
            response.data["total_students"],
            2
        )

        self.assertEqual(
            response.data["total_faculty"],
            2
        )

        self.assertEqual(
            response.data["total_departments"],
            2
        )

        self.assertEqual(
            response.data["active_courses"],
            2
        )

    def test_student_cannot_access_admin_dashboard(self):
        self.client.force_authenticate(
            user=self.student_user
        )

        response = self.client.get(
            "/api/academics/admin/dashboard/"
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_403_FORBIDDEN
        )

    # ---------------------------------------------------------
    # STUDENT DASHBOARD
    # ---------------------------------------------------------

    def test_student_dashboard(self):
        self.client.force_authenticate(
            user=self.student_user
        )

        Attendance.objects.create(
            student=self.student,
            timetable=self.timetable,
            date=date.today(),
            lecture_no=1,
            status="present"
        )

        Attendance.objects.create(
            student=self.student,
            timetable=self.timetable,
            date=date.today(),
            lecture_no=2,
            status="absent"
        )

        SemesterResult.objects.create(
            student=self.student,
            academic_year="2026-27",
            sem=5,
            sgpi=8.50,
            cgpa=8.50,
            total_credits=24,
            result_status="pass",
            is_published=True,
            published_at=timezone.now()
        )

        response = self.client.get(
            "/api/academics/dashboard/"
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)

        self.assertEqual(
            response.data["attendance"],
            50.0
        )

        self.assertEqual(
            response.data["cgpa"],
            Decimal("8.50")
        )

        self.assertIn(
            "today_schedule",
            response.data
        )

        self.assertIn(
            "upcoming_assignments",
            response.data
        )

    def test_student_dashboard_requires_authentication(self):
        self.client.force_authenticate(user=None)

        response = self.client.get(
            "/api/academics/dashboard/"
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_401_UNAUTHORIZED
        )

    # ---------------------------------------------------------
    # FACULTY DASHBOARD
    # ---------------------------------------------------------

    def test_faculty_dashboard(self):
        self.client.force_authenticate(
            user=self.faculty_user
        )

        response = self.client.get(
            "/api/academics/faculty/dashboard/"
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_200_OK
        )

        self.assertEqual(
            response.data["courses_teaching"],
            1
        )

        self.assertEqual(
            response.data["classes_today"],
            0
        )

        self.assertEqual(
            response.data["pending_reviews"],
            0
        )

        self.assertIn(
            "today_schedule",
            response.data
        )

        self.assertIn(
            "pending_reviews_by_course",
            response.data
        )

    def test_faculty_dashboard_shows_pending_reviews(self):
        assignment = Assignment.objects.create(
            faculty_course=self.faculty_course,
            title="Test Assignment",
            description="Dashboard test",
            due_date=timezone.now() + timedelta(days=5),
            max_marks=20,
            allow_late_submission=True,
            is_active=True
        )

        Submission.objects.create(
            assignment=assignment,
            student=self.student,
            submitted_at=timezone.now(),
            status="submitted",
            marks=None
        )

        self.client.force_authenticate(
            user=self.faculty_user
        )

        response = self.client.get(
            "/api/academics/faculty/dashboard/"
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_200_OK
        )

        self.assertEqual(
            response.data["pending_reviews"],
            1
        )

        self.assertEqual(
            response.data["pending_reviews_by_course"][0]["pending_reviews"],
            1
        )