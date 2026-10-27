from django.db import models

from apps.users.models import User


class Book(models.Model):
    title = models.CharField(max_length=255)
    author = models.CharField(max_length=255)
    category = models.CharField(max_length=100)
    isbn = models.CharField(max_length=50, unique=True)
    edition = models.CharField(
        max_length=50,
        blank=True,
        null=True,
        default="1st Ed."
    )
    total_copies = models.PositiveIntegerField(default=1)
    available_copies = models.PositiveIntegerField(default=1)

    cover_color = models.CharField(
        max_length=100,
        default="from-blue-600 to-indigo-700"
    )

    pdf_url = models.TextField(blank=True, null=True)
    pdf_name = models.CharField(max_length=255, blank=True, null=True)

    class Meta:
        db_table = "books"

    def __str__(self):
        return self.title


class Borrow(models.Model):
    STATUS_CHOICES = (
        ("reserved", "Reserved"),
        ("issued", "Issued"),
        ("returned", "Returned"),
    )

    book = models.ForeignKey(
        Book,
        on_delete=models.CASCADE,
        related_name="borrows"
    )

    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name="borrows"
    )

    reservation_date = models.DateTimeField(auto_now_add=True)
    borrow_date = models.DateTimeField(null=True, blank=True)
    due_date = models.DateTimeField(null=True, blank=True)
    return_date = models.DateTimeField(null=True, blank=True)

    status = models.CharField(
        max_length=30,
        choices=STATUS_CHOICES,
        default="reserved"
    )

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "borrows"
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.book.title} - {self.user.email}"