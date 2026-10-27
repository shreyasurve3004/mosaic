from datetime import timedelta
from pathlib import Path
from tempfile import TemporaryDirectory
from urllib.parse import urlparse

import cloudinary
import requests
from django.http import HttpResponse
from django.db import transaction
from django.db.models import Q
from django.utils import timezone
from django.utils.http import content_disposition_header

from rest_framework.decorators import api_view, parser_classes
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from rest_framework.response import Response
from rest_framework import status

from file_service.services import (
    MAX_CONVERSION_SIZE,
    OFFICE_EXTENSIONS,
    FileConversionError,
    convert_to_pdf,
)

from .models import Book, Borrow


MAX_BOOK_FILE_SIZE = MAX_CONVERSION_SIZE
BOOK_FILE_HOSTS = {"res.cloudinary.com", "cloudinary.com"}


@api_view(["GET"])
def get_books(request):
    category = request.GET.get("category", "All")
    search = request.GET.get("search", "")
    available_only = request.GET.get("availableOnly", "false").lower() == "true"

    books = Book.objects.all()

    if available_only:
        user_holds = Borrow.objects.filter(
            user=request.user,
            status__in=["reserved", "issued"]
        ).values_list("book_id", flat=True)

        books = books.filter(
            Q(available_copies__gt=0) |
            Q(id__in=user_holds)
        )

    if category and category != "All":
        books = books.filter(category=category)

    if search:
        books = books.filter(
            Q(title__icontains=search) |
            Q(author__icontains=search) |
            Q(isbn__icontains=search)
        )

    data = []

    for book in books:
        data.append({
            "id": book.id,
            "title": book.title,
            "author": book.author,
            "category": book.category,
            "isbn": book.isbn,
            "edition": book.edition,
            "total_copies": book.total_copies,
            "available_copies": book.available_copies,
            "issued_copies": book.borrows.filter(status="issued").count(),
            "reserved_copies": book.borrows.filter(status="reserved").count(),
            "cover_color": book.cover_color,
            "pdf_url": book.pdf_url,
            "pdf_name": book.pdf_name,
        })

    return Response(data)


@api_view(["GET"])
def preview_book_file(_request, pk):
    try:
        book = Book.objects.get(pk=pk)
    except Book.DoesNotExist:
        return Response(
            {"message": "Book not found."},
            status=status.HTTP_404_NOT_FOUND,
        )

    if not book.pdf_url:
        return Response(
            {"message": "This book has no digital file."},
            status=status.HTTP_404_NOT_FOUND,
        )

    try:
        parsed_url = urlparse(book.pdf_url)
        hostname = (parsed_url.hostname or "").lower()
        port = parsed_url.port
    except ValueError:
        return Response(
            {"message": "The stored file URL is not allowed."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    if (
        parsed_url.scheme != "https"
        or hostname not in BOOK_FILE_HOSTS
        or parsed_url.username is not None
        or parsed_url.password is not None
        or port not in (None, 443)
    ):
        return Response(
            {"message": "The stored file URL is not allowed."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    filename = Path((book.pdf_name or "document.pdf").replace("\\", "/")).name
    extension = Path(filename).suffix.lower()
    if extension != ".pdf" and extension not in OFFICE_EXTENSIONS:
        return Response(
            {"message": "This file type cannot be previewed."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    try:
        with requests.get(
            book.pdf_url,
            stream=True,
            timeout=(5, 30),
            allow_redirects=False,
        ) as upstream:
            if upstream.status_code != requests.codes.ok:
                return Response(
                    {"message": "The digital book file could not be retrieved."},
                    status=status.HTTP_502_BAD_GATEWAY,
                )

            content_length = upstream.headers.get("Content-Length")
            if content_length:
                try:
                    if int(content_length) > MAX_BOOK_FILE_SIZE:
                        return Response(
                            {"message": "The digital book file exceeds the 50 MB limit."},
                            status=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                        )
                except ValueError:
                    pass

            with TemporaryDirectory(prefix="mosaic_book_preview_") as temp_dir:
                source_path = Path(temp_dir) / filename
                downloaded_size = 0

                with source_path.open("wb") as source_file:
                    for chunk in upstream.iter_content(chunk_size=64 * 1024):
                        if not chunk:
                            continue
                        downloaded_size += len(chunk)
                        if downloaded_size > MAX_BOOK_FILE_SIZE:
                            return Response(
                                {"message": "The digital book file exceeds the 50 MB limit."},
                                status=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                            )
                        source_file.write(chunk)

                if downloaded_size == 0:
                    return Response(
                        {"message": "The digital book file is empty."},
                        status=status.HTTP_502_BAD_GATEWAY,
                    )

                if extension == ".pdf":
                    preview_bytes = source_path.read_bytes()
                    if not preview_bytes.startswith(b"%PDF-"):
                        return Response(
                            {"message": "The stored file is not a valid PDF."},
                            status=status.HTTP_502_BAD_GATEWAY,
                        )
                    preview_filename = filename
                else:
                    try:
                        preview_bytes = convert_to_pdf(source_path)
                    except FileConversionError as exc:
                        return Response(
                            {"message": str(exc)},
                            status=status.HTTP_422_UNPROCESSABLE_ENTITY,
                        )
                    preview_filename = f"{Path(filename).stem}.pdf"

    except requests.RequestException:
        return Response(
            {"message": "The digital book file could not be retrieved."},
            status=status.HTTP_502_BAD_GATEWAY,
        )
    except OSError:
        return Response(
            {"message": "The digital book preview could not be prepared."},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )

    response = HttpResponse(preview_bytes, content_type="application/pdf")
    response["Content-Disposition"] = content_disposition_header(
        False,
        preview_filename,
    )
    response["X-Content-Type-Options"] = "nosniff"
    return response


@api_view(["GET"])
def get_my_books(request):
    borrows = Borrow.objects.filter(
        user=request.user,
        status__in=["reserved", "issued"]
    ).select_related("book")

    data = []

    for borrow in borrows:
        data.append({
            "borrow_id": borrow.id,
            "status": borrow.status,
            "borrow_date": borrow.borrow_date,
            "due_date": borrow.due_date,
            "reservation_date": borrow.reservation_date,
            "book_id": borrow.book.id,
            "title": borrow.book.title,
            "author": borrow.book.author,
            "edition": borrow.book.edition,
            "category": borrow.book.category,
            "cover_color": borrow.book.cover_color,
            "pdf_url": borrow.book.pdf_url,
            "pdf_name": borrow.book.pdf_name,
        })

    return Response(data)


@api_view(["POST"])
def reserve_book(request):
    if request.user.role not in ["student", "faculty"]:
        return Response(
            {"message": "Only students and faculty can reserve books."},
            status=status.HTTP_403_FORBIDDEN
        )

    book_id = request.data.get("bookId")

    if not book_id:
        return Response(
            {"message": "Book ID is required."},
            status=status.HTTP_400_BAD_REQUEST
        )

    try:
        with transaction.atomic():
            book = Book.objects.select_for_update().get(id=book_id)

            if book.available_copies <= 0:
                return Response(
                    {"message": "All physical copies are currently issued."},
                    status=status.HTTP_400_BAD_REQUEST
                )

            existing_borrow = Borrow.objects.filter(
                book=book,
                user=request.user,
                status__in=["reserved", "issued"]
            ).exists()

            if existing_borrow:
                return Response(
                    {
                        "message":
                        "You already have an active hold or issued copy of this book."
                    },
                    status=status.HTTP_400_BAD_REQUEST
                )

            Borrow.objects.create(
                book=book,
                user=request.user,
                status="reserved"
            )

            return Response({
                "message":
                "Book reserved successfully! Please collect it from the library desk."
            })

    except Book.DoesNotExist:
        return Response(
            {"message": "Book does not exist."},
            status=status.HTTP_404_NOT_FOUND
        )


@api_view(["POST"])
def cancel_reservation(request):
    if request.user.role not in ["student", "faculty"]:
        return Response(
            {"message": "Only students and faculty can cancel reservations."},
            status=status.HTTP_403_FORBIDDEN
        )

    borrow_id = request.data.get("borrowId")

    if not borrow_id:
        return Response(
            {"message": "Borrow ID is required."},
            status=status.HTTP_400_BAD_REQUEST
        )

    deleted, _ = Borrow.objects.filter(
        id=borrow_id,
        user=request.user,
        status="reserved"
    ).delete()

    if not deleted:
        return Response(
            {
                "message":
                "Cannot cancel: Reservation not found or book has already been issued."
            },
            status=status.HTTP_400_BAD_REQUEST
        )

    return Response({
        "message": "Reservation cancelled successfully."
    })


@api_view(["POST"])
def admin_issue_book(request):
    if request.user.role != "admin":
        return Response(
            {"message": "Only administrators can issue books."},
            status=status.HTTP_403_FORBIDDEN
        )

    borrow_id = request.data.get("borrowId")

    if not borrow_id:
        return Response(
            {"message": "Borrow ID is required."},
            status=status.HTTP_400_BAD_REQUEST
        )

    try:
        with transaction.atomic():
            borrow = Borrow.objects.select_for_update().select_related(
                "book"
            ).get(
                id=borrow_id,
                status="reserved"
            )

            book = Book.objects.select_for_update().get(
                id=borrow.book.id
            )

            if book.available_copies <= 0:
                return Response(
                    {
                        "message":
                        "No physical copy is currently available for issue."
                    },
                    status=status.HTTP_400_BAD_REQUEST
                )

            now = timezone.now()

            borrow.status = "issued"
            borrow.borrow_date = now
            borrow.due_date = now + timedelta(days=14)
            borrow.save()

            book.available_copies -= 1
            book.save(update_fields=["available_copies"])

            return Response({
                "message":
                "Book issued! Available copies decreased by 1. Due in 14 days."
            })

    except Borrow.DoesNotExist:
        return Response(
            {"message": "Reservation not found or already issued."},
            status=status.HTTP_400_BAD_REQUEST
        )


@api_view(["POST"])
def admin_return_book(request):
    if request.user.role != "admin":
        return Response(
            {"message": "Only administrators can return books."},
            status=status.HTTP_403_FORBIDDEN
        )

    borrow_id = request.data.get("borrowId")

    if not borrow_id:
        return Response(
            {"message": "Borrow ID is required."},
            status=status.HTTP_400_BAD_REQUEST
        )

    try:
        with transaction.atomic():
            borrow = Borrow.objects.select_for_update().select_related(
                "book"
            ).get(
                id=borrow_id,
                status="issued"
            )

            book = Book.objects.select_for_update().get(
                id=borrow.book.id
            )

            borrow.status = "returned"
            borrow.return_date = timezone.now()
            borrow.save()

            book.available_copies = min(
                book.available_copies + 1,
                book.total_copies
            )
            book.save(update_fields=["available_copies"])

            return Response({
                "message":
                "Book returned successfully! Available copies increased by 1."
            })

    except Borrow.DoesNotExist:
        return Response(
            {"message": "Active issued record not found."},
            status=status.HTTP_400_BAD_REQUEST
        )


@api_view(["GET"])
def admin_records(request):
    if request.user.role != "admin":
        return Response(
            {"message": "Only administrators can view library records."},
            status=status.HTTP_403_FORBIDDEN
        )

    borrows = Borrow.objects.filter(
        status__in=["reserved", "issued"]
    ).select_related("book", "user")

    data = []

    for borrow in borrows:
        user = borrow.user

        student = getattr(user, "student_profile", None)
        faculty = getattr(user, "faculty_profile", None)

        roll_no = student.roll_no if student else None
        faculty_id = faculty.faculty_id if faculty else None

        data.append({
            "borrow_id": borrow.id,
            "status": borrow.status,
            "reservation_date": borrow.reservation_date,
            "borrow_date": borrow.borrow_date,
            "due_date": borrow.due_date,
            "book_id": borrow.book.id,
            "title": borrow.book.title,
            "isbn": borrow.book.isbn,
            "user_id": str(user.id),
            "first_name": user.first_name,
            "last_name": user.last_name,
            "email": user.email,
            "role": user.role,
            "roll_no": roll_no,
            "faculty_id": faculty_id,
        })

    return Response(data)


@api_view(["POST"])
@parser_classes([MultiPartParser, FormParser, JSONParser])
def admin_add_book(request):
    if request.user.role != "admin":
        return Response(
            {"message": "Only administrators can add books."},
            status=status.HTTP_403_FORBIDDEN
        )

    title = request.data.get("title", "").strip()
    author = request.data.get("author", "").strip()
    category = request.data.get("category", "Computer Science").strip()
    isbn = request.data.get("isbn", "").strip()
    edition = request.data.get("edition", "1st Ed.").strip()
    cover_color = request.data.get(
        "coverColor",
        "from-blue-600 to-indigo-700"
    ).strip()

    if not title or not author or not isbn:
        return Response(
            {"message": "Title, author and ISBN are required."},
            status=status.HTTP_400_BAD_REQUEST
        )

    try:
        total_copies = int(request.data.get("totalCopies", 1))
    except (TypeError, ValueError):
        return Response(
            {"message": "Total copies must be a valid number."},
            status=status.HTTP_400_BAD_REQUEST
        )

    if total_copies < 1:
        return Response(
            {"message": "Total copies must be at least 1."},
            status=status.HTTP_400_BAD_REQUEST
        )

    if Book.objects.filter(isbn=isbn).exists():
        return Response(
            {"message": "A book with this ISBN already exists."},
            status=status.HTTP_400_BAD_REQUEST
        )

    pdf_url = None
    pdf_name = None

    if "pdfFile" in request.FILES:
        uploaded_file = request.FILES["pdfFile"]

        result = cloudinary.uploader.upload(
            uploaded_file,
            resource_type="raw",
            folder="mosaic_digital_books"
        )

        pdf_url = result.get("secure_url")
        pdf_name = uploaded_file.name

    book = Book.objects.create(
        title=title,
        author=author,
        category=category,
        isbn=isbn,
        edition=edition,
        total_copies=total_copies,
        available_copies=total_copies,
        cover_color=cover_color,
        pdf_url=pdf_url,
        pdf_name=pdf_name
    )

    return Response({
        "message": "Book created successfully!",
        "book": {
            "id": book.id,
            "title": book.title
        }
    })


@api_view(["PUT", "DELETE"])
@parser_classes([MultiPartParser, FormParser, JSONParser])
def admin_book_detail(request, pk):
    if request.user.role != "admin":
        return Response(
            {"message": "Only administrators can modify books."},
            status=status.HTTP_403_FORBIDDEN
        )

    try:
        book = Book.objects.get(pk=pk)
    except Book.DoesNotExist:
        return Response(
            {"message": "Book not found."},
            status=status.HTTP_404_NOT_FOUND
        )

    if request.method == "DELETE":
        title = book.title
        book.delete()

        return Response({
            "message": f'"{title}" deleted successfully from catalog.'
        })

    try:
        new_total = int(
            request.data.get("totalCopies", book.total_copies)
        )
    except (TypeError, ValueError):
        return Response(
            {"message": "Total copies must be a valid number."},
            status=status.HTTP_400_BAD_REQUEST
        )

    if new_total < 1:
        return Response(
            {"message": "Total copies must be at least 1."},
            status=status.HTTP_400_BAD_REQUEST
        )

    issued_count = book.borrows.filter(
        status="issued"
    ).count()

    if new_total < issued_count:
        return Response(
            {
                "message":
                f"Cannot set total copies to {new_total}. "
                f"There are currently {issued_count} copies already issued."
            },
            status=status.HTTP_400_BAD_REQUEST
        )

    new_isbn = request.data.get("isbn", book.isbn).strip()

    if Book.objects.filter(
        isbn=new_isbn
    ).exclude(id=book.id).exists():
        return Response(
            {"message": "Another book already uses this ISBN."},
            status=status.HTTP_400_BAD_REQUEST
        )

    book.title = request.data.get("title", book.title).strip()
    book.author = request.data.get("author", book.author).strip()
    book.category = request.data.get("category", book.category).strip()
    book.isbn = new_isbn
    book.edition = request.data.get("edition", book.edition).strip()
    book.total_copies = new_total
    book.available_copies = max(new_total - issued_count, 0)

    remove_pdf = str(
        request.data.get("removePdf", "false")
    ).lower() in ["true", "1"]

    if remove_pdf:
        book.pdf_url = None
        book.pdf_name = None

    elif "pdfFile" in request.FILES:
        uploaded_file = request.FILES["pdfFile"]

        upload_result = cloudinary.uploader.upload(
            uploaded_file,
            resource_type="raw",
            folder="mosaic_digital_books"
        )

        book.pdf_url = upload_result.get("secure_url")
        book.pdf_name = uploaded_file.name

    book.save()

    return Response({
        "message": "Book details updated successfully!",
        "book": {
            "id": book.id,
            "title": book.title,
            "pdf_url": book.pdf_url,
            "pdf_name": book.pdf_name
        }
    })