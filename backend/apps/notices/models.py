from django.conf import settings
from django.db import models
from django.utils import timezone


class Notice(models.Model):
    TARGET_YEAR_CHOICES = [
        ("ALL", "All Years"),
        ("1", "1st Year"),
        ("2", "2nd Year"),
        ("3", "3rd Year"),
        ("4", "4th Year"),
    ]

    PRIORITY_CHOICES = [
        ("Low", "Low"),
        ("Medium", "Medium"),
        ("High", "High"),
    ]

    STATUS_CHOICES = [
        ("Draft", "Draft"),
        ("Published", "Published"),
        ("Archived", "Archived"),
    ]

    notice_id = models.AutoField(primary_key=True)

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="created_notices",
        db_column="user_id",
    )

    title = models.CharField(max_length=200)
    category = models.CharField(max_length=100)

    priority = models.CharField(
        max_length=20,
        choices=PRIORITY_CHOICES,
        default="Medium",
    )

    content = models.TextField()

    published_date = models.DateTimeField(
        null=True,
        blank=True,
    )

    expiry_date = models.DateTimeField(
        null=True,
        blank=True,
    )

    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default="Draft",
    )

    target_year = models.CharField(
        max_length=10,
        choices=TARGET_YEAR_CHOICES,
        default="ALL",
    )

    attachments = models.JSONField(
        default=list,
        blank=True,
    )

    renewal_history = models.JSONField(
        default=list,
        blank=True,
    )

    class Meta:
        ordering = ["-published_date"]

    def __str__(self):
        return self.title

    @property
    def is_expired(self):
        if self.expiry_date is None:
            return False

        return timezone.now() > self.expiry_date

    @property
    def is_active(self):
        return (
            self.status == "Published"
            and not self.is_expired
        )


class NoticeRead(models.Model):
    notice_read_id = models.AutoField(primary_key=True)

    notice = models.ForeignKey(
        Notice,
        on_delete=models.CASCADE,
        related_name="read_records",
    )

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="notice_reads",
        db_column="user_id",
    )

    read_date = models.DateTimeField(
        null=True,
        blank=True,
    )

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["notice", "user"],
                name="unique_notice_user_read",
            )
        ]

    def __str__(self):
        return (
            f"Notice {self.notice.notice_id} "
            f"- User {self.user_id}"
        )