from unittest.mock import MagicMock, patch

from django.test import TestCase
from rest_framework.test import APIClient

from apps.users.models import User, Student, Faculty
from apps.academics.models import Department

from .models import Book, Borrow


class LibraryModuleTests(TestCase):

    def setUp(self):
        self.client = APIClient()

        self.department = Department.objects.create(
            department_id=1,
            department_name="Computer Engineering",
            department_code="CE"
        )

        self.admin = User.objects.create_user(
            email="library_admin@test.com",
            password="Test@123",
            first_name="Library",
            last_name="Admin",
            role="admin",
            status="active",
            is_verified=True
        )

        self.student_user = User.objects.create_user(
            email="library_student@test.com",
            password="Test@123",
            first_name="Library",
            last_name="Student",
            role="student",
            status="active",
            is_verified=True
        )

        self.student = Student.objects.create(
            user=self.student_user,
            roll_no="LIB001",
            full_name="Library Student",
            year=3,
            sem=5,
            div="A",
            academic_year="2026-27",
            scheme="2021",
            branch="Computer Engineering",
            department=self.department
        )

        self.faculty_user = User.objects.create_user(
            email="library_faculty@test.com",
            password="Test@123",
            first_name="Library",
            last_name="Faculty",
            role="faculty",
            status="active",
            is_verified=True
        )

        self.faculty = Faculty.objects.create(
            user=self.faculty_user,
            faculty_id="LIBF001",
            full_name="Library Faculty",
            department=self.department,
            designation="Assistant Professor"
        )

        self.book = Book.objects.create(
            title="Introduction to Algorithms",
            author="Thomas H. Cormen",
            category="Computer Science",
            isbn="LIBISBN001",
            edition="3rd Ed.",
            total_copies=3,
            available_copies=3,
            cover_color="from-blue-600 to-indigo-700"
        )

    def authenticate(self, user):
        self.client.force_authenticate(user=user)

    def make_upstream_response(self, content, status_code=200, headers=None):
        response = MagicMock()
        response.status_code = status_code
        response.headers = headers or {}
        response.iter_content.return_value = [content] if content else []
        response.__enter__.return_value = response
        return response

    def test_book_preview_requires_authentication(self):
        self.client.force_authenticate(user=None)

        response = self.client.get(
            f"/api/library/books/{self.book.id}/preview/"
        )

        self.assertEqual(response.status_code, 401)

    def test_book_preview_returns_not_found_without_digital_file(self):
        self.authenticate(self.student_user)

        response = self.client.get(
            f"/api/library/books/{self.book.id}/preview/"
        )

        self.assertEqual(response.status_code, 404)

    def test_book_preview_returns_pdf_inline(self):
        self.book.pdf_url = (
            "https://res.cloudinary.com/demo/raw/upload/book.pdf"
        )
        self.book.pdf_name = "book.pdf"
        self.book.save(update_fields=["pdf_url", "pdf_name"])
        self.authenticate(self.student_user)
        upstream = self.make_upstream_response(b"%PDF-1.7 test pdf")

        with patch(
            "apps.library.views.requests.get",
            return_value=upstream,
        ) as mocked_get:
            response = self.client.get(
                f"/api/library/books/{self.book.id}/preview/"
            )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response["Content-Type"], "application/pdf")
        self.assertEqual(
            response["Content-Disposition"],
            'inline; filename="book.pdf"',
        )
        self.assertEqual(response.content, b"%PDF-1.7 test pdf")
        mocked_get.assert_called_once_with(
            self.book.pdf_url,
            stream=True,
            timeout=(5, 30),
            allow_redirects=False,
        )

    def test_book_preview_converts_supported_office_document(self):
        self.book.pdf_url = (
            "https://res.cloudinary.com/demo/raw/upload/book.docx"
        )
        self.book.pdf_name = "book.docx"
        self.book.save(update_fields=["pdf_url", "pdf_name"])
        self.authenticate(self.faculty_user)
        upstream = self.make_upstream_response(b"office document")

        with (
            patch(
                "apps.library.views.requests.get",
                return_value=upstream,
            ),
            patch(
                "apps.library.views.convert_to_pdf",
                return_value=b"%PDF-1.7 converted",
            ) as mocked_convert,
        ):
            response = self.client.get(
                f"/api/library/books/{self.book.id}/preview/"
            )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response["Content-Type"], "application/pdf")
        self.assertEqual(
            response["Content-Disposition"],
            'inline; filename="book.pdf"',
        )
        self.assertEqual(response.content, b"%PDF-1.7 converted")
        converted_source = mocked_convert.call_args.args[0]
        self.assertEqual(converted_source.suffix, ".docx")
        self.assertFalse(converted_source.exists())

    def test_book_preview_rejects_untrusted_stored_host(self):
        self.book.pdf_url = "https://example.com/book.pdf"
        self.book.pdf_name = "book.pdf"
        self.book.save(update_fields=["pdf_url", "pdf_name"])
        self.authenticate(self.student_user)

        with patch("apps.library.views.requests.get") as mocked_get:
            response = self.client.get(
                f"/api/library/books/{self.book.id}/preview/"
            )

        self.assertEqual(response.status_code, 400)
        mocked_get.assert_not_called()

    def test_book_preview_does_not_follow_cloudinary_redirects(self):
        self.book.pdf_url = (
            "https://res.cloudinary.com/demo/raw/upload/book.pdf"
        )
        self.book.pdf_name = "book.pdf"
        self.book.save(update_fields=["pdf_url", "pdf_name"])
        self.authenticate(self.student_user)
        upstream = self.make_upstream_response(b"", status_code=302)

        with patch(
            "apps.library.views.requests.get",
            return_value=upstream,
        ) as mocked_get:
            response = self.client.get(
                f"/api/library/books/{self.book.id}/preview/"
            )

        self.assertEqual(response.status_code, 502)
        self.assertFalse(mocked_get.call_args.kwargs["allow_redirects"])

    def test_book_preview_rejects_oversized_content_length(self):
        self.book.pdf_url = (
            "https://res.cloudinary.com/demo/raw/upload/book.pdf"
        )
        self.book.pdf_name = "book.pdf"
        self.book.save(update_fields=["pdf_url", "pdf_name"])
        self.authenticate(self.student_user)
        upstream = self.make_upstream_response(
            b"",
            headers={"Content-Length": str(50 * 1024 * 1024 + 1)},
        )

        with patch(
            "apps.library.views.requests.get",
            return_value=upstream,
        ):
            response = self.client.get(
                f"/api/library/books/{self.book.id}/preview/"
            )

        self.assertEqual(response.status_code, 413)

    def test_book_preview_rejects_unsupported_extension(self):
        self.book.pdf_url = (
            "https://res.cloudinary.com/demo/raw/upload/book.txt"
        )
        self.book.pdf_name = "book.txt"
        self.book.save(update_fields=["pdf_url", "pdf_name"])
        self.authenticate(self.student_user)

        with patch("apps.library.views.requests.get") as mocked_get:
            response = self.client.get(
                f"/api/library/books/{self.book.id}/preview/"
            )

        self.assertEqual(response.status_code, 400)
        mocked_get.assert_not_called()

    def test_unauthenticated_user_cannot_access_books(self):
        self.client.force_authenticate(user=None)

        response = self.client.get("/api/library/books")

        self.assertEqual(response.status_code, 401)

    def test_authenticated_user_can_view_books(self):
        self.authenticate(self.student_user)

        response = self.client.get("/api/library/books")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(
            response.data[0]["title"],
            self.book.title
        )

    def test_student_can_view_my_books(self):
        Borrow.objects.create(
            book=self.book,
            user=self.student_user,
            status="reserved"
        )

        self.authenticate(self.student_user)

        response = self.client.get("/api/library/my-books")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(
            response.data[0]["title"],
            self.book.title
        )

    def test_student_can_reserve_book(self):
        self.authenticate(self.student_user)

        response = self.client.post(
            "/api/library/reserve",
            {"bookId": self.book.id},
            format="json"
        )

        self.assertEqual(response.status_code, 200)

        self.assertTrue(
            Borrow.objects.filter(
                book=self.book,
                user=self.student_user,
                status="reserved"
            ).exists()
        )

        self.book.refresh_from_db()

        self.assertEqual(
            self.book.available_copies,
            3
        )

    def test_student_cannot_reserve_same_book_twice(self):
        Borrow.objects.create(
            book=self.book,
            user=self.student_user,
            status="reserved"
        )

        self.authenticate(self.student_user)

        response = self.client.post(
            "/api/library/reserve",
            {"bookId": self.book.id},
            format="json"
        )

        self.assertEqual(response.status_code, 400)

    def test_student_can_cancel_reservation(self):
        borrow = Borrow.objects.create(
            book=self.book,
            user=self.student_user,
            status="reserved"
        )

        self.authenticate(self.student_user)

        response = self.client.post(
            "/api/library/cancel-reservation",
            {"borrowId": borrow.id},
            format="json"
        )

        self.assertEqual(response.status_code, 200)

        self.assertFalse(
            Borrow.objects.filter(id=borrow.id).exists()
        )

    def test_student_cannot_access_admin_records(self):
        self.authenticate(self.student_user)

        response = self.client.get(
            "/api/library/admin/records"
        )

        self.assertEqual(response.status_code, 403)

    def test_faculty_can_reserve_book(self):
        self.authenticate(self.faculty_user)

        response = self.client.post(
            "/api/library/reserve",
            {"bookId": self.book.id},
            format="json"
        )

        self.assertEqual(response.status_code, 200)

        self.assertTrue(
            Borrow.objects.filter(
                book=self.book,
                user=self.faculty_user,
                status="reserved"
            ).exists()
        )

    def test_admin_can_add_book(self):
        self.authenticate(self.admin)

        response = self.client.post(
            "/api/library/admin/add-book",
            {
                "title": "Database Systems",
                "author": "Test Author",
                "category": "Computer Science",
                "isbn": "LIBISBN002",
                "edition": "1st Ed.",
                "totalCopies": 5
            },
            format="json"
        )

        self.assertEqual(response.status_code, 200)

        self.assertTrue(
            Book.objects.filter(
                isbn="LIBISBN002"
            ).exists()
        )

    def test_student_cannot_add_book(self):
        self.authenticate(self.student_user)

        response = self.client.post(
            "/api/library/admin/add-book",
            {
                "title": "Unauthorized Book",
                "author": "Test Author",
                "isbn": "LIBISBN003",
                "totalCopies": 2
            },
            format="json"
        )

        self.assertEqual(response.status_code, 403)

    def test_admin_can_issue_reserved_book(self):
        borrow = Borrow.objects.create(
            book=self.book,
            user=self.student_user,
            status="reserved"
        )

        self.authenticate(self.admin)

        response = self.client.post(
            "/api/library/admin/issue",
            {"borrowId": borrow.id},
            format="json"
        )

        self.assertEqual(response.status_code, 200)

        borrow.refresh_from_db()
        self.book.refresh_from_db()

        self.assertEqual(borrow.status, "issued")
        self.assertIsNotNone(borrow.borrow_date)
        self.assertIsNotNone(borrow.due_date)
        self.assertEqual(
            self.book.available_copies,
            2
        )

    def test_admin_can_return_book(self):
        borrow = Borrow.objects.create(
            book=self.book,
            user=self.student_user,
            status="issued"
        )

        self.book.available_copies = 2
        self.book.save()

        self.authenticate(self.admin)

        response = self.client.post(
            "/api/library/admin/return",
            {"borrowId": borrow.id},
            format="json"
        )

        self.assertEqual(response.status_code, 200)

        borrow.refresh_from_db()
        self.book.refresh_from_db()

        self.assertEqual(borrow.status, "returned")
        self.assertIsNotNone(borrow.return_date)
        self.assertEqual(
            self.book.available_copies,
            3
        )

    def test_admin_can_view_records(self):
        Borrow.objects.create(
            book=self.book,
            user=self.student_user,
            status="reserved"
        )

        self.authenticate(self.admin)

        response = self.client.get(
            "/api/library/admin/records"
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(
            response.data[0]["email"],
            self.student_user.email
        )

    def test_admin_can_delete_book(self):
        self.authenticate(self.admin)

        response = self.client.delete(
            f"/api/library/books/{self.book.id}"
        )

        self.assertEqual(response.status_code, 200)

        self.assertFalse(
            Book.objects.filter(
                id=self.book.id
            ).exists()
        )

    def test_student_cannot_delete_book(self):
        self.authenticate(self.student_user)

        response = self.client.delete(
            f"/api/library/books/{self.book.id}"
        )

        self.assertEqual(response.status_code, 403)

        self.assertTrue(
            Book.objects.filter(
                id=self.book.id
            ).exists()
        )