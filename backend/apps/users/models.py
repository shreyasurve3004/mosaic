import uuid

from django.contrib.auth.models import AbstractBaseUser, BaseUserManager, PermissionsMixin
from django.db import models


class UserManager(BaseUserManager):

    def create_user(self, email, password=None, **extra_fields):
        if not email:
            raise ValueError("Email is required")

        email = self.normalize_email(email)

        user = self.model(
            email=email,
            **extra_fields
        )

        if password:
            user.set_password(password)

        user.save(using=self._db)

        return user

    def create_superuser(self, email, password=None, **extra_fields):
        extra_fields.setdefault("is_staff", True)
        extra_fields.setdefault("is_superuser", True)
        extra_fields.setdefault("is_verified", True)
        extra_fields.setdefault("status", "active")

        return self.create_user(
            email=email,
            password=password,
            **extra_fields
        )


class User(AbstractBaseUser, PermissionsMixin):

    ROLE_CHOICES = [
        ("student", "Student"),
        ("faculty", "Faculty"),
        ("admin", "Admin"),
    ]

    STATUS_CHOICES = [
        ("active", "Active"),
        ("inactive", "Inactive"),
        ("pending", "Pending"),
        ("suspended", "Suspended"),
    ]

    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False
    )

    email = models.EmailField(
        unique=True
    )

    first_name = models.CharField(
        max_length=100
    )

    last_name = models.CharField(
        max_length=100
    )

    phone = models.CharField(
        max_length=15,
        blank=True,
        null=True
    )

    role = models.CharField(
        max_length=20,
        choices=ROLE_CHOICES
    )

    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default="active"
    )

    google_id = models.CharField(
        max_length=255,
        unique=True,
        blank=True,
        null=True
    )

    is_verified = models.BooleanField(
        default=False
    )

    is_staff = models.BooleanField(
        default=False
    )

    created_at = models.DateTimeField(
        auto_now_add=True
    )

    objects = UserManager()

    USERNAME_FIELD = "email"

    REQUIRED_FIELDS = []

    def __str__(self):
        return self.email


class Student(models.Model):

    user = models.OneToOneField(
        User,
        on_delete=models.CASCADE,
        related_name="student_profile"
    )

    roll_no = models.CharField(
        max_length=30,
        unique=True
    )

    full_name = models.CharField(
        max_length=250
    )

    profile_photo_url = models.URLField(
        blank=True,
        null=True
    )

    date_of_birth = models.DateField(
        blank=True,
        null=True
    )

    gender = models.CharField(
        max_length=20,
        blank=True,
        null=True
    )

    phone = models.CharField(
        max_length=15,
        blank=True,
        null=True
    )

    address = models.TextField(
        blank=True,
        null=True
    )

    year = models.PositiveSmallIntegerField()

    sem = models.PositiveSmallIntegerField()

    div = models.CharField(
        max_length=10
    )

    academic_year = models.CharField(
        max_length=20
    )

    scheme = models.CharField(
        max_length=100
    )

    branch = models.CharField(
        max_length=100
    )

    batch = models.CharField(
        max_length=50,
        blank=True,
        null=True
    )

    specialization = models.CharField(
        max_length=100,
        blank=True,
        null=True
    )

    department = models.ForeignKey(
        "academics.Department",
        on_delete=models.PROTECT,
        related_name="students"
    )

    def __str__(self):
        return self.roll_no


class Faculty(models.Model):

    user = models.OneToOneField(
        User,
        on_delete=models.CASCADE,
        related_name="faculty_profile"
    )

    faculty_id = models.CharField(
        max_length=30,
        unique=True
    )

    full_name = models.CharField(
        max_length=250
    )

    profile_photo_url = models.URLField(
        blank=True,
        null=True
    )

    faculty_subject = models.CharField(
        max_length=150,
        blank=True,
        null=True
    )

    faculty_email = models.EmailField(
        blank=True,
        null=True
    )

    phone = models.CharField(
        max_length=15,
        blank=True,
        null=True
    )

    department = models.ForeignKey(
        "academics.Department",
        on_delete=models.PROTECT,
        related_name="faculty_members"
    )

    designation = models.CharField(
        max_length=100
    )

    qualification = models.CharField(
        max_length=150,
        blank=True,
        null=True
    )

    specialization = models.CharField(
        max_length=150,
        blank=True,
        null=True
    )

    experience = models.PositiveIntegerField(
        blank=True,
        null=True
    )

    bio = models.TextField(
        blank=True,
        null=True
    )

    office_room = models.CharField(
        max_length=30,
        blank=True,
        null=True
    )

    def __str__(self):
        return self.faculty_id


class Admin(models.Model):

    user = models.OneToOneField(
        User,
        on_delete=models.CASCADE,
        related_name="admin_profile"
    )

    admin_id = models.CharField(
        max_length=30,
        unique=True
    )

    full_name = models.CharField(
        max_length=250
    )

    profile_photo_url = models.URLField(
        blank=True,
        null=True
    )

    phone = models.CharField(
        max_length=15,
        blank=True,
        null=True
    )

    designation = models.CharField(
        max_length=100
    )

    department = models.ForeignKey(
        "academics.Department",
        on_delete=models.PROTECT,
        related_name="admins"
    )

    def __str__(self):
        return self.admin_id


class AuthOTP(models.Model):

    TYPE_CHOICES = [
        ("verification", "Verification"),
        ("password_reset", "Password Reset"),
    ]

    otp_id = models.AutoField(
        primary_key=True
    )

    email = models.EmailField()

    otp_hash = models.CharField(
        max_length=255
    )

    type = models.CharField(
        max_length=20,
        choices=TYPE_CHOICES
    )

    expires_at = models.DateTimeField()

    created_at = models.DateTimeField(
        auto_now_add=True
    )

    def __str__(self):
        return f"{self.email} - {self.type}"