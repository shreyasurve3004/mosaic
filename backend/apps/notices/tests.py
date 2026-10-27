from datetime import timedelta
from unittest.mock import patch

from django.http import HttpResponse
from django.urls import reverse
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APITestCase

from apps.users.models import Faculty, Student, User
from .models import Notice, NoticeRead


class NoticeAPITests(APITestCase):

    def setUp(self):
        self.admin = User.objects.create_user(
            email="admin@test.com",
            first_name="Admin",
            last_name="User",
            role="admin",
            status="active",
            is_verified=True,
        )

        self.faculty_user = User.objects.create_user(
            email="faculty@test.com",
            first_name="Faculty",
            last_name="User",
            role="faculty",
            status="active",
            is_verified=True,
        )

        self.student_user = User.objects.create_user(
            email="student@test.com",
            first_name="Student",
            last_name="User",
            role="student",
            status="active",
            is_verified=True,
        )

        self.notice = Notice.objects.create(
            user=self.admin,
            title="Exam Notice",
            category="Examination",
            priority="High",
            content="End semester examination schedule.",
            published_date=timezone.now(),
            expiry_date=timezone.now() + timedelta(days=10),
            status="Published",
            target_year="ALL",
        )

    def authenticate(self, user):
        self.client.force_authenticate(user=user)

    def test_list_notices(self):
        response = self.client.get("/api/notices/")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]["title"], "Exam Notice")

    def test_active_notices_filter_by_year_including_all_years(self):
        year_three_notice = Notice.objects.create(
            user=self.admin,
            title="Year Three Notice",
            category="Academic",
            content="For third-year students.",
            published_date=timezone.now(),
            status="Published",
            target_year="3",
        )
        Notice.objects.create(
            user=self.admin,
            title="Year Two Notice",
            category="Academic",
            content="For second-year students.",
            published_date=timezone.now(),
            status="Published",
            target_year="2",
        )

        response = self.client.get(
            "/api/notices/?active=true&target_year=3"
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(
            {notice["notice_id"] for notice in response.data},
            {self.notice.notice_id, year_three_notice.notice_id},
        )

        all_years_response = self.client.get(
            "/api/notices/?active=true&target_year=ALL"
        )

        self.assertEqual(
            all_years_response.status_code,
            status.HTTP_200_OK,
        )
        self.assertEqual(
            {notice["notice_id"] for notice in all_years_response.data},
            {self.notice.notice_id},
        )

    def test_notice_detail(self):
        response = self.client.get(
            f"/api/notices/{self.notice.notice_id}/"
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["title"], "Exam Notice")

    @patch("apps.notices.views.serve_cloudinary_file")
    def test_notice_attachment_uses_stored_file_and_is_public(self, serve_file):
        attachment = {
            "file_name": "exam-schedule.pdf",
            "file_url": "https://res.cloudinary.com/demo/raw/upload/schedule.pdf",
        }
        self.notice.attachments = [attachment]
        self.notice.save(update_fields=["attachments"])
        serve_file.return_value = HttpResponse("file")

        response = self.client.get(
            f"/api/notices/{self.notice.notice_id}/attachments/0/file/"
        )

        self.assertEqual(response.status_code, 200)
        serve_file.assert_called_once()
        self.assertEqual(
            serve_file.call_args.args[1:],
            (attachment["file_url"], attachment["file_name"]),
        )

    def test_student_cannot_create_notice(self):
        self.authenticate(self.student_user)

        response = self.client.post(
            "/api/notices/",
            {
                "title": "Student Notice",
                "category": "General",
                "priority": "Low",
                "content": "Test content",
                "published_date": timezone.now().isoformat(),
                "status": "Published",
                "target_year": "ALL",
            },
            format="json",
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_403_FORBIDDEN,
        )

    def test_faculty_can_create_notice(self):
        self.authenticate(self.faculty_user)

        response = self.client.post(
            "/api/notices/",
            {
                "title": "Faculty Notice",
                "category": "Academic",
                "priority": "Medium",
                "content": "Faculty-created notice.",
                "published_date": timezone.now().isoformat(),
                "status": "Published",
                "target_year": "3",
            },
            format="json",
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_201_CREATED,
        )

        notice = Notice.objects.get(
            notice_id=response.data["notice_id"]
        )

        self.assertEqual(notice.user, self.faculty_user)

    def test_admin_can_create_notice(self):
        self.authenticate(self.admin)

        response = self.client.post(
            "/api/notices/",
            {
                "title": "Admin Notice",
                "category": "General",
                "priority": "Low",
                "content": "Admin-created notice.",
                "published_date": timezone.now().isoformat(),
                "status": "Published",
                "target_year": "ALL",
            },
            format="json",
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_201_CREATED,
        )

        notice = Notice.objects.get(
            notice_id=response.data["notice_id"]
        )

        self.assertEqual(notice.user, self.admin)

    def test_faculty_can_update_notice(self):
        self.authenticate(self.faculty_user)

        response = self.client.patch(
            f"/api/notices/{self.notice.notice_id}/",
            {
                "title": "Updated Exam Notice",
            },
            format="json",
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_200_OK,
        )

        self.notice.refresh_from_db()

        self.assertEqual(
            self.notice.title,
            "Updated Exam Notice",
        )

    def test_student_cannot_update_notice(self):
        self.authenticate(self.student_user)

        response = self.client.patch(
            f"/api/notices/{self.notice.notice_id}/",
            {
                "title": "Student Update",
            },
            format="json",
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_403_FORBIDDEN,
        )

    def test_admin_can_delete_notice(self):
        self.authenticate(self.admin)

        response = self.client.delete(
            f"/api/notices/{self.notice.notice_id}/"
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_204_NO_CONTENT,
        )

        self.assertFalse(
            Notice.objects.filter(
                notice_id=self.notice.notice_id
            ).exists()
        )

    def test_faculty_cannot_delete_notice(self):
        self.authenticate(self.faculty_user)

        response = self.client.delete(
            f"/api/notices/{self.notice.notice_id}/"
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_403_FORBIDDEN,
        )

    def test_student_can_mark_notice_read(self):
        self.authenticate(self.student_user)

        response = self.client.post(
            "/api/notices/reads/mark-read/",
            {
                "notice_id": self.notice.notice_id,
            },
            format="json",
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_200_OK,
        )

        self.assertTrue(response.data["is_read"])

        read_record = NoticeRead.objects.get(
            notice=self.notice,
            user=self.student_user,
        )

        self.assertIsNotNone(read_record.read_date)

    def test_student_can_mark_notice_unread(self):
        self.authenticate(self.student_user)

        NoticeRead.objects.create(
            notice=self.notice,
            user=self.student_user,
            read_date=timezone.now(),
        )

        response = self.client.post(
            "/api/notices/reads/mark-unread/",
            {
                "notice_id": self.notice.notice_id,
            },
            format="json",
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_200_OK,
        )

        self.assertFalse(response.data["is_read"])

        read_record = NoticeRead.objects.get(
            notice=self.notice,
            user=self.student_user,
        )

        self.assertIsNone(read_record.read_date)

    def test_notice_read_records_are_user_specific(self):
        self.authenticate(self.student_user)

        NoticeRead.objects.create(
            notice=self.notice,
            user=self.student_user,
            read_date=timezone.now(),
        )

        other_student = User.objects.create_user(
            email="student2@test.com",
            first_name="Student",
            last_name="Two",
            role="student",
            status="active",
            is_verified=True,
        )

        NoticeRead.objects.create(
            notice=self.notice,
            user=other_student,
            read_date=timezone.now(),
        )

        response = self.client.get(
            "/api/notices/reads/"
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_200_OK,
        )

        self.assertEqual(len(response.data), 1)
        self.assertEqual(
            response.data[0]["user_id"],
            str(self.student_user.id),
        )

    def test_admin_can_filter_read_records_by_user(self):
        NoticeRead.objects.create(
            notice=self.notice,
            user=self.student_user,
            read_date=timezone.now(),
        )

        self.authenticate(self.admin)

        response = self.client.get(
            f"/api/notices/reads/?user_id={self.student_user.id}"
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_200_OK,
        )

        self.assertEqual(len(response.data), 1)
        self.assertEqual(
            response.data[0]["user_id"],
            str(self.student_user.id),
        )

    def test_active_notices_endpoint(self):
        self.authenticate(self.student_user)

        response = self.client.get(
            "/api/notices/active/"
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_200_OK,
        )

        self.assertEqual(len(response.data), 1)
        self.assertEqual(
            response.data[0]["notice_id"],
            self.notice.notice_id,
        )

    def test_expired_notice_not_in_active_endpoint(self):
        self.notice.expiry_date = timezone.now() - timedelta(days=1)
        self.notice.save()

        response = self.client.get(
            "/api/notices/active/"
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_200_OK,
        )

        self.assertEqual(len(response.data), 0)

    def test_search_notices(self):
        response = self.client.get(
            "/api/notices/?search=Exam"
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_200_OK,
        )

        self.assertEqual(len(response.data), 1)

    def test_filter_notices_by_category(self):
        response = self.client.get(
            "/api/notices/?category=Examination"
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_200_OK,
        )

        self.assertEqual(len(response.data), 1)

    def test_filter_notices_by_priority(self):
        response = self.client.get(
            "/api/notices/?priority=High"
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_200_OK,
        )

        self.assertEqual(len(response.data), 1)

    def test_filter_notices_by_status(self):
        response = self.client.get(
            "/api/notices/?status=Published"
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_200_OK,
        )

        self.assertEqual(len(response.data), 1)

    def test_renew_notice(self):
        self.authenticate(self.faculty_user)

        new_expiry = (
            timezone.now() + timedelta(days=30)
        ).isoformat()

        response = self.client.post(
            f"/api/notices/{self.notice.notice_id}/renew/",
            {
                "expiry_date": new_expiry,
            },
            format="json",
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_200_OK,
        )

        self.notice.refresh_from_db()

        self.assertIsNotNone(
            self.notice.expiry_date
        )

        self.assertEqual(
            len(self.notice.renewal_history),
            1,
        )

        self.assertEqual(
            self.notice.renewal_history[0]["renewed_by"],
            str(self.faculty_user.id),
        )

    def test_student_cannot_renew_notice(self):
        self.authenticate(self.student_user)

        new_expiry = (
            timezone.now() + timedelta(days=30)
        ).isoformat()

        response = self.client.post(
            f"/api/notices/{self.notice.notice_id}/renew/",
            {
                "expiry_date": new_expiry,
            },
            format="json",
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_403_FORBIDDEN,
        )

    def test_invalid_expiry_date_rejected(self):
        self.authenticate(self.faculty_user)

        response = self.client.post(
            f"/api/notices/{self.notice.notice_id}/renew/",
            {
                "expiry_date": "not-a-date",
            },
            format="json",
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_400_BAD_REQUEST,
        )

    def test_expiry_before_published_date_rejected(self):
        self.authenticate(self.faculty_user)

        expiry = (
            self.notice.published_date
            - timedelta(days=1)
        ).isoformat()

        response = self.client.post(
            f"/api/notices/{self.notice.notice_id}/renew/",
            {
                "expiry_date": expiry,
            },
            format="json",
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_400_BAD_REQUEST,
        )

    @patch("apps.notices.views.upload_attachment")
    def test_upload_attachments(self, mock_upload):
        self.authenticate(self.faculty_user)

        mock_upload.side_effect = [
            {
                "file_name": "notice.pdf",
                "file_url": "https://example.com/notice.pdf",
                "public_id": "notice_1",
                "resource_type": "raw",
                "format": "pdf",
                "file_type": "application/pdf",
                "file_size": 100,
            }
        ]

        response = self.client.post(
            f"/api/notices/{self.notice.notice_id}/attachments/upload/",
            {
                "files": self._make_file(
                    "notice.pdf",
                    b"test pdf",
                    "application/pdf",
                ),
            },
            format="multipart",
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_200_OK,
        )

        self.notice.refresh_from_db()

        self.assertEqual(
            len(self.notice.attachments),
            1,
        )

        self.assertEqual(
            self.notice.attachments[0]["public_id"],
            "notice_1",
        )

    @patch("apps.notices.views.delete_attachment")
    def test_delete_attachment(
        self,
        mock_delete,
    ):
        self.authenticate(self.faculty_user)

        self.notice.attachments = [
            {
                "file_name": "notice.pdf",
                "file_url": "https://example.com/notice.pdf",
                "public_id": "notice_1",
                "resource_type": "raw",
            }
        ]

        self.notice.save()

        response = self.client.delete(
            f"/api/notices/{self.notice.notice_id}/attachments/delete/",
            {
                "public_id": "notice_1",
            },
            format="json",
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_200_OK,
        )

        self.notice.refresh_from_db()

        self.assertEqual(
            self.notice.attachments,
            [],
        )

        mock_delete.assert_called_once_with(
            "notice_1",
            "raw",
        )

    @staticmethod
    def _make_file(
        name,
        content,
        content_type,
    ):
        from django.core.files.uploadedfile import SimpleUploadedFile

        return SimpleUploadedFile(
            name=name,
            content=content,
            content_type=content_type,
        )