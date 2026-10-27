from django.urls import path

from .views import (
    get_books,
    get_my_books,
    reserve_book,
    cancel_reservation,
    admin_issue_book,
    admin_return_book,
    admin_records,
    admin_add_book,
    admin_book_detail,
    preview_book_file,
)

urlpatterns = [
    path("books", get_books, name="library-books"),
    path("my-books", get_my_books, name="library-my-books"),
    path("reserve", reserve_book, name="library-reserve"),
    path(
        "cancel-reservation",
        cancel_reservation,
        name="library-cancel-reservation"
    ),
    path(
        "admin/issue",
        admin_issue_book,
        name="library-admin-issue"
    ),
    path(
        "admin/return",
        admin_return_book,
        name="library-admin-return"
    ),
    path(
        "admin/records",
        admin_records,
        name="library-admin-records"
    ),
    path(
        "admin/add-book",
        admin_add_book,
        name="library-admin-add-book"
    ),
    path(
        "books/<int:pk>",
        admin_book_detail,
        name="library-admin-book-detail"
    ),
    path(
        "books/<int:pk>/preview/",
        preview_book_file,
        name="preview_book_file",
    ),
]