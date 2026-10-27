import os
import random
from datetime import timedelta

from django.contrib.auth.hashers import make_password, check_password
from django.core.mail import send_mail
from django.db import transaction
from django.utils import timezone

from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework import status
from rest_framework_simplejwt.tokens import RefreshToken

from rest_framework.exceptions import ValidationError
from django.core.validators import URLValidator
from django.core.exceptions import ValidationError as DjangoValidationError

from .models import User, Student, Faculty, Admin, AuthOTP
from apps.academics.models import Department

def is_vit_email(email):
    return (
        isinstance(email, str)
        and email.strip().lower().endswith("@vit.edu.in")
    )


# =============================================================================
# HEALTH CHECK
# =============================================================================

@api_view(["GET"])
@permission_classes([AllowAny])
def health_check(request):
    return Response({
        "status": "ok",
        "time": timezone.now()
    })


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def student_profile(request):
    if request.user.role != "student":
        return Response(
            {"error": "Student access required."},
            status=status.HTTP_403_FORBIDDEN
        )

    try:
        student = (
            Student.objects
            .select_related("department")
            .get(user=request.user)
        )
    except Student.DoesNotExist:
        return Response(
            {"error": "Student profile not found."},
            status=status.HTTP_404_NOT_FOUND
        )

    return Response({
        "roll_no": student.roll_no,
        "full_name": student.full_name,
        "department_id": student.department.department_id,
        "department_name": student.department.department_name,
        "department_code": student.department.department_code,
        "year": student.year,
        "sem": student.sem,
        "div": student.div,
        "academic_year": student.academic_year,
        "scheme": student.scheme,
        "branch": student.branch,
        "batch": student.batch,
        "specialization": student.specialization,
    })

# =============================================================================
# REGISTRATION
# =============================================================================

@api_view(["POST"])
@permission_classes([AllowAny])
def register(request):
    data = request.data

    email = data.get("email", "").strip().lower()
    role = data.get("role")
    first_name = data.get("firstName", "").strip()
    last_name = data.get("lastName", "").strip()
    phone = data.get("phone", "").strip()
    password = data.get("password")

    # Student fields
    department = data.get("department")
    year = data.get("year")
    div = data.get("div")
    roll_no = data.get("rollNo")

    # Faculty fields
    employee_id = data.get("employeeId")
    designation = data.get("designation")
    specialization = data.get("specialization")

    YEAR_MAP = {
        "First Year": 1,
        "Second Year": 2,
        "Third Year": 3,
        "Fourth Year": 4,
    }

    # -------------------------------------------------------------------------
    # Basic validation
    # -------------------------------------------------------------------------

    if not is_vit_email(email):
        return Response({
            "message": "Only official @vit.edu.in email addresses are allowed."
        }, status=status.HTTP_400_BAD_REQUEST)

    if not all([email, role, first_name, last_name, phone, password]):
        return Response({
            "message": "All required fields must be provided."
        }, status=status.HTTP_400_BAD_REQUEST)

    if role not in ["student", "faculty"]:
        return Response({
            "message": "Only Student and Faculty accounts can register."
        }, status=status.HTTP_400_BAD_REQUEST)

    # -------------------------------------------------------------------------
    # Find the account created by Admin
    # -------------------------------------------------------------------------

    try:
        user = User.objects.get(email=email)
    except User.DoesNotExist:
        return Response({
            "message": (
                "No account was found for this email. "
                "Please contact the administrator."
            )
        }, status=status.HTTP_404_NOT_FOUND)

    # -------------------------------------------------------------------------
    # Account status validation
    # -------------------------------------------------------------------------

    if user.status == "active":
        return Response({
            "message": "This account is already active. Please log in."
        }, status=status.HTTP_400_BAD_REQUEST)

    if user.status == "pending":
        return Response({
            "message": "Your registration is already pending administrator approval."
        }, status=status.HTTP_400_BAD_REQUEST)

    if user.status == "suspended":
        return Response({
            "message": "This account is suspended. Please contact the administrator."
        }, status=status.HTTP_403_FORBIDDEN)

    if user.status != "inactive":
        return Response({
            "message": "This account cannot be registered at this time."
        }, status=status.HTTP_400_BAD_REQUEST)

    # -------------------------------------------------------------------------
    # Verify selected role
    # -------------------------------------------------------------------------

    if user.role != role:
        return Response({
            "message": (
                f"This account is registered as '{user.role}'. "
                "Please select the correct role."
            )
        }, status=status.HTTP_400_BAD_REQUEST)

    # -------------------------------------------------------------------------
    # Get the pre-created profile
    # -------------------------------------------------------------------------

    if role == "student":
        try:
            profile = user.student_profile
        except Student.DoesNotExist:
            return Response({
                "message": "No Student profile is associated with this account."
            }, status=status.HTTP_400_BAD_REQUEST)

    else:
        try:
            profile = user.faculty_profile
        except Faculty.DoesNotExist:
            return Response({
                "message": "No Faculty profile is associated with this account."
            }, status=status.HTTP_400_BAD_REQUEST)

    # -------------------------------------------------------------------------
    # Verify registered name
    # -------------------------------------------------------------------------

    submitted_name = f"{first_name} {last_name}".strip().lower()
    registered_name = profile.full_name.strip().lower()

    if submitted_name != registered_name:
        return Response({
            "message": "The name does not match the registered account."
        }, status=status.HTTP_400_BAD_REQUEST)

    # -------------------------------------------------------------------------
    # Student-specific validation
    # -------------------------------------------------------------------------

    if role == "student":

        if not all([department, year, div, roll_no]):
            return Response({
                "message": (
                    "Department, year, division and roll number "
                    "are required for Student registration."
                )
            }, status=status.HTTP_400_BAD_REQUEST)

        # Department name must match the admin-created profile.
        try:
            submitted_department = Department.objects.get(
                department_name=str(department).strip()
            )
        except Department.DoesNotExist:
            return Response({
                "message": "Invalid department."
            }, status=status.HTTP_400_BAD_REQUEST)

        if profile.department_id != submitted_department.department_id:
            return Response({
                "message": (
                    "The selected department does not match "
                    "the registered account."
                )
            }, status=status.HTTP_400_BAD_REQUEST)

        # Convert frontend year label to database year number.
        submitted_year = YEAR_MAP.get(str(year).strip())

        if submitted_year is None:
            return Response({
                "message": "Invalid year."
            }, status=status.HTTP_400_BAD_REQUEST)

        if profile.year != submitted_year:
            return Response({
                "message": (
                    "The selected year does not match "
                    "the registered account."
                )
            }, status=status.HTTP_400_BAD_REQUEST)

        # Division must match.
        if profile.div.strip().lower() != str(div).strip().lower():
            return Response({
                "message": (
                    "The selected division does not match "
                    "the registered account."
                )
            }, status=status.HTTP_400_BAD_REQUEST)

        # Roll number must match.
        if profile.roll_no.strip().lower() != str(roll_no).strip().lower():
            return Response({
                "message": (
                    "The roll number does not match "
                    "the registered account."
                )
            }, status=status.HTTP_400_BAD_REQUEST)

    # -------------------------------------------------------------------------
    # Faculty-specific validation
    # -------------------------------------------------------------------------

    else:

        if not all([
            employee_id,
            department,
            designation,
            specialization
        ]):
            return Response({
                "message": (
                    "Employee ID, department, designation and "
                    "specialization are required for Faculty registration."
                )
            }, status=status.HTTP_400_BAD_REQUEST)

        # Faculty ID must match.
        if profile.faculty_id.strip().lower() != str(employee_id).strip().lower():
            return Response({
                "message": (
                    "The Employee ID does not match "
                    "the registered account."
                )
            }, status=status.HTTP_400_BAD_REQUEST)

        # Department must match.
        try:
            submitted_department = Department.objects.get(
                department_name=str(department).strip()
            )
        except Department.DoesNotExist:
            return Response({
                "message": "Invalid department."
            }, status=status.HTTP_400_BAD_REQUEST)

        if profile.department_id != submitted_department.department_id:
            return Response({
                "message": (
                    "The selected department does not match "
                    "the registered account."
                )
            }, status=status.HTTP_400_BAD_REQUEST)

        # Designation must match.
        if profile.designation.strip().lower() != str(designation).strip().lower():
            return Response({
                "message": (
                    "The designation does not match "
                    "the registered account."
                )
            }, status=status.HTTP_400_BAD_REQUEST)

        # Specialization must match.
        if (profile.specialization or "").strip().lower() != str(specialization).strip().lower():
            return Response({
                "message": (
                    "The specialization does not match "
                    "the registered account."
                )
            }, status=status.HTTP_400_BAD_REQUEST)

    # -------------------------------------------------------------------------
    # Save registration credentials and contact information
    # -------------------------------------------------------------------------

    with transaction.atomic():

        user.first_name = first_name
        user.last_name = last_name
        user.phone = phone
        user.set_password(password)

        # Save phone number supplied during registration.
        profile.phone = phone
        profile.save(update_fields=["phone"])

        # Account remains inactive until OTP verification.
        user.is_verified = False
        user.status = "inactive"
        user.save()

        # Remove any previous verification OTP.
        AuthOTP.objects.filter(
            email=email,
            type="verification"
        ).delete()

        # Generate six-digit OTP.
        otp = str(random.randint(100000, 999999))

        AuthOTP.objects.create(
            email=email,
            otp_hash=make_password(otp),
            type="verification",
            expires_at=timezone.now() + timedelta(minutes=10)
        )

        # Send OTP.
        try:
            send_mail(
                "Verify Your Mosaic Account",
                (
                    f"Your Mosaic verification OTP is: {otp}. "
                    "It expires in 10 minutes."
                ),
                os.getenv("SMTP_USER", "no-reply@mosaic.edu"),
                [email],
                fail_silently=False
            )

        except Exception:
            print(
                f"\n[DEV MODE] Verification OTP for {email}: {otp}\n"
            )

    return Response({
        "message": "Registration successful. OTP sent to your email."
    }, status=status.HTTP_201_CREATED)


# =============================================================================
# OTP VERIFICATION
# =============================================================================

@api_view(["POST"])
@permission_classes([AllowAny])
def verify_otp(request):
    email = request.data.get("email", "").strip().lower()
    otp = str(request.data.get("otp", "")).strip()
    otp_type = request.data.get("type", "verification")

    if not email or not otp:
        return Response({
            "message": "Email and OTP are required."
        }, status=status.HTTP_400_BAD_REQUEST)

    record = AuthOTP.objects.filter(
        email=email,
        type=otp_type,
        expires_at__gt=timezone.now()
    ).order_by("-created_at").first()

    if not record:
        return Response({
            "message": "Invalid or expired OTP."
        }, status=status.HTTP_400_BAD_REQUEST)

    if not check_password(otp, record.otp_hash):
        return Response({
            "message": "Incorrect OTP."
        }, status=status.HTTP_400_BAD_REQUEST)

    if otp_type == "verification":

        try:
            user = User.objects.get(email=email)
        except User.DoesNotExist:
            return Response({
                "message": "Account not found."
            }, status=status.HTTP_404_NOT_FOUND)

        # Email verification is separate from account activation.
        user.is_verified = True
        user.status = "pending"
        user.save(update_fields=["is_verified", "status"])

    record.delete()

    return Response({
        "message": (
            "OTP verified successfully. "
            "Your registration is now pending administrator approval."
        )
    }, status=status.HTTP_200_OK)


# =============================================================================
# ADMIN: CREATE USER ACCOUNT
# =============================================================================

@api_view(["POST"])
def create_user(request):
    if not request.user.is_authenticated:
        return Response({
            "message": "Authentication required."
        }, status=status.HTTP_401_UNAUTHORIZED)

    if request.user.role != "admin":
        return Response({
            "message": "Only administrators can create user accounts."
        }, status=status.HTTP_403_FORBIDDEN)

    data = request.data

    email = data.get("email", "").strip().lower()
    role = data.get("role")
    first_name = data.get("firstName", "").strip()
    last_name = data.get("lastName", "").strip()
    department_id = data.get("department")

    if not all([email, role, first_name, last_name, department_id]):
        return Response({
            "message": "Name, email, role and department are required."
        }, status=status.HTTP_400_BAD_REQUEST)

    if not is_vit_email(email):
        return Response({
            "message": "Only official @vit.edu.in email addresses are allowed."
        }, status=status.HTTP_400_BAD_REQUEST)

    if role not in ["student", "faculty"]:
        return Response({
            "message": "Only Student and Faculty accounts can be created."
        }, status=status.HTTP_400_BAD_REQUEST)

    if User.objects.filter(email=email).exists():
        return Response({
            "message": "A user with this email already exists."
        }, status=status.HTTP_400_BAD_REQUEST)

    # Import here to avoid unnecessary coupling at the top of the file.
    from apps.academics.models import Department

    try:
        department = Department.objects.get(department_id=department_id)
    except Department.DoesNotExist:
        return Response({
            "message": "Selected department does not exist."
        }, status=status.HTTP_400_BAD_REQUEST)

    # -------------------------------------------------------------------------
    # Student-specific validation
    # -------------------------------------------------------------------------

    if role == "student":

        required_fields = [
            "rollNo",
            "year",
            "sem",
            "div",
            "academicYear",
            "scheme",
            "branch",
        ]

        if not all(data.get(field) for field in required_fields):
            return Response({
                "message": (
                    "Student account requires roll number, year, semester, "
                    "division, academic year, scheme and branch."
                )
            }, status=status.HTTP_400_BAD_REQUEST)

        if Student.objects.filter(roll_no=data.get("rollNo")).exists():
            return Response({
                "message": "A student with this roll number already exists."
            }, status=status.HTTP_400_BAD_REQUEST)

    # -------------------------------------------------------------------------
    # Faculty-specific validation
    # -------------------------------------------------------------------------

    if role == "faculty":

        if not data.get("facultyId"):
            return Response({
                "message": "Faculty ID is required."
            }, status=status.HTTP_400_BAD_REQUEST)

        if not data.get("designation"):
            return Response({
                "message": "Faculty designation is required."
            }, status=status.HTTP_400_BAD_REQUEST)

        if Faculty.objects.filter(
            faculty_id=data.get("facultyId")
        ).exists():
            return Response({
                "message": "A faculty member with this Faculty ID already exists."
            }, status=status.HTTP_400_BAD_REQUEST)

    # -------------------------------------------------------------------------
    # Create User + corresponding Student/Faculty record
    # -------------------------------------------------------------------------

    with transaction.atomic():

        user = User.objects.create(
            email=email,
            first_name=first_name,
            last_name=last_name,
            role=role,
            status="inactive",
            is_verified=False
        )

        full_name = f"{first_name} {last_name}".strip()

        if role == "student":

            Student.objects.create(
                user=user,
                roll_no=data.get("rollNo"),
                full_name=full_name,
                year=data.get("year"),
                sem=data.get("sem"),
                div=data.get("div"),
                academic_year=data.get("academicYear"),
                scheme=data.get("scheme"),
                branch=data.get("branch"),
                batch=data.get("batch"),
                specialization=data.get("specialization"),
                department=department
            )

        else:

            Faculty.objects.create(
                user=user,
                faculty_id=data.get("facultyId"),
                full_name=full_name,
                faculty_subject=data.get("facultySubject"),
                faculty_email=email,
                phone=data.get("phone"),
                department=department,
                designation=data.get("designation"),
                qualification=data.get("qualification"),
                specialization=data.get("specialization"),
                experience=data.get("experience"),
                bio=data.get("bio"),
                office_room=data.get("officeRoom")
            )

    return Response({
        "message": "User account created successfully.",
        "user": {
            "id": str(user.id),
            "email": user.email,
            "name": full_name,
            "role": user.role,
            "status": user.status
        }
    }, status=status.HTTP_201_CREATED)


# =============================================================================
# ADMIN: VIEW USERS
# =============================================================================

@api_view(["GET"])
@permission_classes([IsAuthenticated])
def admin_users(request):
    if request.user.role != "admin":
        return Response({
            "message": "Only administrators can access user management."
        }, status=status.HTTP_403_FORBIDDEN)

    users = User.objects.filter(
        role__in=["student", "faculty"]
    ).order_by("-created_at")

    data = []

    for user in users:

        profile_data = None

        if user.role == "student":
            try:
                profile = user.student_profile

                profile_data = {
                    "studentPk": profile.id,
                    "rollNo": profile.roll_no,
                    "department": profile.department.department_name,
                    "departmentId": profile.department_id,
                    "year": profile.year,
                    "sem": profile.sem,
                    "division": profile.div,
                    "academicYear": profile.academic_year,
                    "scheme": profile.scheme,
                    "branch": profile.branch,
                    "batch": profile.batch,
                    "specialization": profile.specialization,
                    "phone": profile.phone,
                    "address": profile.address,
                }

            except Student.DoesNotExist:
                profile_data = None

        elif user.role == "faculty":
            try:
                profile = user.faculty_profile

                profile_data = {
                    "facultyPk": profile.id,
                    "facultyId": profile.faculty_id,
                    "department": profile.department.department_name,
                    "departmentId": profile.department_id,
                    "designation": profile.designation,
                    "specialization": profile.specialization,
                    "facultySubject": profile.faculty_subject,
                    "facultyEmail": profile.faculty_email,
                    "phone": profile.phone,
                    "qualification": profile.qualification,
                    "experience": profile.experience,
                    "bio": profile.bio,
                    "officeRoom": profile.office_room,
                }

            except Faculty.DoesNotExist:
                profile_data = None

        data.append({
            "id": str(user.id),
            "email": user.email,
            "firstName": user.first_name,
            "lastName": user.last_name,
            "role": user.role,
            "status": user.status,
            "isVerified": user.is_verified,
            "createdAt": user.created_at,
            "profile": profile_data,
        })

    return Response(data, status=status.HTTP_200_OK)


# =============================================================================
# ADMIN: UPDATE USER STATUS
# =============================================================================

@api_view(["PATCH"])
@permission_classes([IsAuthenticated])
def admin_update_user_status(request, user_id):
    if request.user.role != "admin":
        return Response({
            "message": "Only administrators can manage user accounts."
        }, status=status.HTTP_403_FORBIDDEN)

    new_status = request.data.get("status")

    allowed_statuses = [
        "active",
        "inactive",
        "suspended",
    ]

    if new_status not in allowed_statuses:
        return Response({
            "message": (
                "Invalid status. Allowed values are "
                "active, inactive and suspended."
            )
        }, status=status.HTTP_400_BAD_REQUEST)

    try:
        user = User.objects.get(
            id=user_id,
            role__in=["student", "faculty"]
        )
    except User.DoesNotExist:
        return Response({
            "message": "Student or Faculty account not found."
        }, status=status.HTTP_404_NOT_FOUND)

    user.status = new_status
    user.save(update_fields=["status"])

    return Response({
        "message": "User status updated successfully.",
        "user": {
            "id": str(user.id),
            "email": user.email,
            "role": user.role,
            "status": user.status,
            "isVerified": user.is_verified,
        }
    }, status=status.HTTP_200_OK)


# =============================================================================
# ADMIN: UPDATE / DELETE USER
# =============================================================================

@api_view(["PATCH", "DELETE"])
@permission_classes([IsAuthenticated])
def admin_update_user(request, user_id):

    if request.user.role != "admin":
        return Response({
            "message": "Only administrators can manage user profiles."
        }, status=status.HTTP_403_FORBIDDEN)

    try:
        user = User.objects.get(
            id=user_id,
            role__in=["student", "faculty"]
        )
    except User.DoesNotExist:
        return Response({
            "message": "Student or Faculty account not found."
        }, status=status.HTTP_404_NOT_FOUND)

    # =========================================================================
    # DELETE USER
    # =========================================================================

    if request.method == "DELETE":

        deleted_user_email = user.email

        user.delete()

        return Response({
            "message": "User deleted successfully.",
            "email": deleted_user_email,
        }, status=status.HTTP_200_OK)

    # =========================================================================
    # UPDATE USER PROFILE
    # =========================================================================

    data = request.data

    first_name = str(
        data.get("firstName", "")
    ).strip()

    last_name = str(
        data.get("lastName", "")
    ).strip()

    email = str(
        data.get("email", "")
    ).strip().lower()

    if not first_name or not last_name or not email:
        return Response({
            "message": (
                "First name, last name and email are required."
            )
        }, status=status.HTTP_400_BAD_REQUEST)

    if not is_vit_email(email):
        return Response({
            "message": (
                "Only official @vit.edu.in email addresses "
                "are allowed."
            )
        }, status=status.HTTP_400_BAD_REQUEST)

    # -------------------------------------------------------------------------
    # Prevent duplicate email addresses
    # -------------------------------------------------------------------------

    if User.objects.filter(
        email=email
    ).exclude(
        id=user.id
    ).exists():

        return Response({
            "message": (
                "Another user already exists with this email."
            )
        }, status=status.HTTP_400_BAD_REQUEST)

    # -------------------------------------------------------------------------
    # Validate department
    # -------------------------------------------------------------------------

    department_id = data.get("department")

    try:
        department = Department.objects.get(
            department_id=department_id
        )

    except (
        Department.DoesNotExist,
        TypeError,
        ValueError
    ):

        return Response({
            "message": "Selected department does not exist."
        }, status=status.HTTP_400_BAD_REQUEST)

    # =========================================================================
    # SAVE CHANGES
    # =========================================================================

    with transaction.atomic():

        # =====================================================================
        # COMMON USER FIELDS
        # =====================================================================

        user.first_name = first_name
        user.last_name = last_name
        user.email = email

        user.save(update_fields=[
            "first_name",
            "last_name",
            "email",
        ])

        # =====================================================================
        # STUDENT
        # =====================================================================

        if user.role == "student":

            try:
                profile = user.student_profile

            except Student.DoesNotExist:

                return Response({
                    "message": "Student profile not found."
                }, status=status.HTTP_400_BAD_REQUEST)

            # -----------------------------------------------------------------
            # Roll number
            # -----------------------------------------------------------------

            roll_no = str(
                data.get(
                    "rollNo",
                    profile.roll_no
                )
            ).strip()

            if not roll_no:

                return Response({
                    "message": "Roll number is required."
                }, status=status.HTTP_400_BAD_REQUEST)

            if Student.objects.filter(
                roll_no=roll_no
            ).exclude(
                id=profile.id
            ).exists():

                return Response({
                    "message": (
                        "Another student already has "
                        "this roll number."
                    )
                }, status=status.HTTP_400_BAD_REQUEST)

            profile.roll_no = roll_no

            # -----------------------------------------------------------------
            # Common profile information
            # -----------------------------------------------------------------

            profile.full_name = (
                f"{first_name} {last_name}"
            ).strip()

            profile.department = department

            # -----------------------------------------------------------------
            # Academic information
            # -----------------------------------------------------------------

            if data.get("year") is not None:
                profile.year = data.get("year")

            if data.get("sem") is not None:
                profile.sem = data.get("sem")

            if data.get("div") is not None:
                profile.div = str(
                    data.get("div")
                ).strip()

            if data.get("academicYear") is not None:
                profile.academic_year = str(
                    data.get("academicYear")
                ).strip()

            if data.get("scheme") is not None:
                profile.scheme = str(
                    data.get("scheme")
                ).strip()

            if data.get("branch") is not None:
                profile.branch = str(
                    data.get("branch")
                ).strip()

            # -----------------------------------------------------------------
            # Optional information
            # -----------------------------------------------------------------

            if "batch" in data:
                profile.batch = data.get("batch")

            if "specialization" in data:
                profile.specialization = data.get(
                    "specialization"
                )

            if "phone" in data:
                profile.phone = data.get(
                    "phone"
                )

            if "address" in data:
                profile.address = data.get(
                    "address"
                )

            profile.save()

        # =====================================================================
        # FACULTY
        # =====================================================================

        else:

            try:
                profile = user.faculty_profile

            except Faculty.DoesNotExist:

                return Response({
                    "message": "Faculty profile not found."
                }, status=status.HTTP_400_BAD_REQUEST)

            # -----------------------------------------------------------------
            # Faculty ID
            # -----------------------------------------------------------------

            faculty_id = str(
                data.get(
                    "facultyId",
                    profile.faculty_id
                )
            ).strip()

            if not faculty_id:

                return Response({
                    "message": "Faculty ID is required."
                }, status=status.HTTP_400_BAD_REQUEST)

            if Faculty.objects.filter(
                faculty_id=faculty_id
            ).exclude(
                id=profile.id
            ).exists():

                return Response({
                    "message": (
                        "Another faculty member already has "
                        "this Faculty ID."
                    )
                }, status=status.HTTP_400_BAD_REQUEST)

            profile.faculty_id = faculty_id

            # -----------------------------------------------------------------
            # Common profile information
            # -----------------------------------------------------------------

            profile.full_name = (
                f"{first_name} {last_name}"
            ).strip()

            profile.faculty_email = email
            profile.department = department

            # -----------------------------------------------------------------
            # Faculty information
            # -----------------------------------------------------------------

            if "facultySubject" in data:
                profile.faculty_subject = data.get(
                    "facultySubject"
                )

            if "designation" in data:
                profile.designation = data.get(
                    "designation"
                )

            if "specialization" in data:
                profile.specialization = data.get(
                    "specialization"
                )

            if "phone" in data:
                profile.phone = data.get(
                    "phone"
                )

            if "qualification" in data:
                profile.qualification = data.get(
                    "qualification"
                )

            if "experience" in data:
                profile.experience = data.get(
                    "experience"
                )

            if "bio" in data:
                profile.bio = data.get(
                    "bio"
                )

            if "officeRoom" in data:
                profile.office_room = data.get(
                    "officeRoom"
                )

            profile.save()

    return Response({
        "message": "User profile updated successfully."
    }, status=status.HTTP_200_OK)


@api_view(["POST"])
@permission_classes([AllowAny])
def login(request):
    data = request.data

    email = data.get("email", "").strip().lower()
    password = data.get("password", "")
    role = data.get("role", "").strip().lower()
   
    if not email or not password or not role:
        return Response({
            "message": "Email and password are required."
        }, status=status.HTTP_400_BAD_REQUEST)
    try:
        user = User.objects.get(email=email)
    except User.DoesNotExist:
        return Response({
            "message": "Invalid email or password."
        }, status=status.HTTP_401_UNAUTHORIZED)

    if user.role != role:
        return Response({
            "message": "The selected role does not match this account."
        }, status=status.HTTP_403_FORBIDDEN)

    if not user.is_verified:
        return Response({
            "message": "Please verify your email before logging in."
        }, status=status.HTTP_403_FORBIDDEN)

    if user.status == "pending":
        return Response({
            "message": "Your account is pending administrator approval."
        }, status=status.HTTP_403_FORBIDDEN)

    if user.status == "inactive":
        return Response({
            "message": "Your account is inactive."
        }, status=status.HTTP_403_FORBIDDEN)

    if user.status == "suspended":
        return Response({
            "message": "Your account is suspended. Please contact the administrator."
        }, status=status.HTTP_403_FORBIDDEN)

    if user.status != "active":
        return Response({
            "message": "Your account cannot log in at this time."
        }, status=status.HTTP_403_FORBIDDEN)

    if not user.check_password(password):
        return Response({
            "message": "Invalid email or password."
        }, status=status.HTTP_401_UNAUTHORIZED)

    refresh = RefreshToken.for_user(user)

    full_name = f"{user.first_name} {user.last_name}".strip()

    if user.role == "admin":
        try:
            full_name = user.admin_profile.full_name.strip()
        except Admin.DoesNotExist:
            pass

    return Response({
        "message": "Login successful.",
        "access": str(refresh.access_token),
        "refresh": str(refresh),
        "user": {
            "id": str(user.id),
            "email": user.email,
            "firstName": user.first_name,
            "lastName": user.last_name,
            "fullName": full_name,
            "role": user.role,
            "status": user.status,
        }
    }, status=status.HTTP_200_OK)


@api_view(["POST"])
@permission_classes([AllowAny])
def forgot_password(request):
    email = request.data.get("email", "").strip().lower()

    if not email or not is_vit_email(email):
        return Response({
            "message": "Valid @vit.edu.in institutional email address is required."
        }, status=status.HTTP_400_BAD_REQUEST)

    user = User.objects.filter(email=email).first()

    if not user:
        return Response({
            "message": "If an account exists for this email, a password reset code has been sent."
        }, status=status.HTTP_200_OK)

    if user.status == "suspended":
        return Response({
            "message": "This account is suspended. Please contact the administrator."
        }, status=status.HTTP_403_FORBIDDEN)

    if user.status != "active":
        return Response({
            "message": "This account is not active and cannot reset its password."
        }, status=status.HTTP_403_FORBIDDEN)

    otp = str(random.randint(100000, 999999))

    AuthOTP.objects.filter(
        email=email,
        type="password_reset"
    ).delete()

    AuthOTP.objects.create(
        email=email,
        otp_hash=make_password(otp),
        type="password_reset",
        expires_at=timezone.now() + timedelta(minutes=10)
    )

    try:
        send_mail(
            "Mosaic Campus: Password Reset Code",
            (
                f"Your Mosaic password reset OTP is: {otp}. "
                "It expires in 10 minutes."
            ),
            os.getenv("SMTP_USER", "no-reply@mosaic.edu"),
            [email],
            fail_silently=False
        )
    except Exception:
        print(
            f"\n[DEV MODE] Password Reset OTP for {email}: {otp}\n"
        )

    return Response({
        "message": (
            "If an account exists for this email, "
            "a password reset code has been sent."
        )
    }, status=status.HTTP_200_OK)


@api_view(["POST"])
@permission_classes([AllowAny])
def reset_password(request):
    email = request.data.get("email", "").strip().lower()
    otp = str(request.data.get("otp", "")).strip()
    new_password = request.data.get("newPassword", "")

    if not email or not otp or not new_password:
        return Response({
            "message": "Email, OTP and new password are required."
        }, status=status.HTTP_400_BAD_REQUEST)

    if not is_vit_email(email):
        return Response({
            "message": "Valid @vit.edu.in institutional email address is required."
        }, status=status.HTTP_400_BAD_REQUEST)

    if len(new_password) < 8:
        return Response({
            "message": "Password must be at least 8 characters long."
        }, status=status.HTTP_400_BAD_REQUEST)

    record = AuthOTP.objects.filter(
        email=email,
        type="password_reset",
        expires_at__gt=timezone.now()
    ).order_by("-created_at").first()

    if not record:
        return Response({
            "message": "Invalid or expired OTP code."
        }, status=status.HTTP_400_BAD_REQUEST)

    if not check_password(otp, record.otp_hash):
        return Response({
            "message": "Invalid or expired OTP code."
        }, status=status.HTTP_400_BAD_REQUEST)

    user = User.objects.filter(email=email).first()

    if not user:
        return Response({
            "message": "Invalid or expired OTP code."
        }, status=status.HTTP_400_BAD_REQUEST)

    if user.status != "active":
        return Response({
            "message": "This account is not active."
        }, status=status.HTTP_403_FORBIDDEN)

    user.set_password(new_password)
    user.save(update_fields=["password"])

    AuthOTP.objects.filter(
        email=email,
        type="password_reset"
    ).delete()

    return Response({
        "message": "Password updated successfully. You can now log in."
    }, status=status.HTTP_200_OK)



@api_view(["GET", "PATCH"])
@permission_classes([IsAuthenticated])
def user_profile(request):
    """
    GET: Return the authenticated user's account and role-specific profile.
    PATCH: Update permitted personal/profile fields only.
    """

    user = request.user

    # Find the profile associated with the authenticated user's role.
    if user.role == "student":
        profile = getattr(user, "student_profile", None)
        profile_type = "student"
    elif user.role == "faculty":
        profile = getattr(user, "faculty_profile", None)
        profile_type = "faculty"
    elif user.role == "admin":
        profile = getattr(user, "admin_profile", None)
        profile_type = "admin"
    else:
        return Response(
            {"detail": "Unsupported user role."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    if request.method == "GET":
        profile_data = None

        if profile is not None:
            profile_data = {
                "profile_photo_url": profile.profile_photo_url,
                "phone": profile.phone,
            }

            if profile_type == "student":
                profile_data.update({
                    "roll_no": profile.roll_no,
                    "full_name": profile.full_name,
                    "date_of_birth": (
                        profile.date_of_birth.isoformat()
                        if profile.date_of_birth else None
                    ),
                    "gender": profile.gender,
                    "address": profile.address,
                    "year": profile.year,
                    "sem": profile.sem,
                    "div": profile.div,
                    "academic_year": profile.academic_year,
                    "scheme": profile.scheme,
                    "branch": profile.branch,
                    "batch": profile.batch,
                    "specialization": profile.specialization,
                    "department_id": profile.department_id,
                    "department_name": profile.department.department_name,
                    "department_code": profile.department.department_code,
                })

            elif profile_type == "faculty":
                profile_data.update({
                    "faculty_id": profile.faculty_id,
                    "full_name": profile.full_name,
                    "faculty_subject": profile.faculty_subject,
                    "faculty_email": profile.faculty_email,
                    "designation": profile.designation,
                    "qualification": profile.qualification,
                    "specialization": profile.specialization,
                    "experience": profile.experience,
                    "bio": profile.bio,
                    "office_room": profile.office_room,
                    "department_id": profile.department_id,
                    "department_name": profile.department.department_name,
                    "department_code": profile.department.department_code,
                })

            elif profile_type == "admin":
                profile_data.update({
                    "admin_id": profile.admin_id,
                    "full_name": profile.full_name,
                    "designation": profile.designation,
                    "department_id": profile.department_id,
                    "department_name": profile.department.department_name,
                    "department_code": profile.department.department_code,
                })

        return Response({
            "user": {
                "id": str(user.id),
                "email": user.email,
                "first_name": user.first_name,
                "last_name": user.last_name,
                "full_name": (
                    f"{user.first_name} {user.last_name}".strip()
                ),
                "phone": user.phone,
                "role": user.role,
                "status": user.status,
                "is_verified": user.is_verified,
                "created_at": user.created_at.isoformat(),
            },
            "profile_type": profile_type,
            "profile": profile_data,
        })

    # PATCH: A missing role-specific profile cannot be edited.
    if profile is None:
        return Response(
            {"detail": "Profile record has not been created."},
            status=status.HTTP_404_NOT_FOUND,
        )

    data = request.data

    if not isinstance(data, dict):
        raise ValidationError({"detail": "Expected a JSON object."})

    allowed_user_fields = {"first_name", "last_name", "phone"}
    allowed_profile_fields = {
        "profile_photo_url",
        "phone",
    }

    if profile_type == "student":
        allowed_profile_fields |= {
            "full_name",
            "date_of_birth",
            "gender",
            "address",
        }
    elif profile_type == "faculty":
        allowed_profile_fields |= {
            "full_name",
            "faculty_subject",
            "faculty_email",
            "qualification",
            "specialization",
            "experience",
            "bio",
            "office_room",
        }
    elif profile_type == "admin":
        allowed_profile_fields |= {
            "full_name",
        }

    # Accept either {"user": {...}, "profile": {...}} or a flat
    # object containing editable profile fields.
    if "user" in data or "profile" in data:
        if set(data.keys()) - {"user", "profile"}:
            raise ValidationError({
                "detail": "Use either a flat profile payload or nested user/profile objects."
            })

        user_data = data.get("user", {})
        profile_data = data.get("profile", {})

        if not isinstance(user_data, dict) or not isinstance(profile_data, dict):
            raise ValidationError({
                "detail": "'user' and 'profile' must be JSON objects."
            })
    else:
        user_data = {}
        profile_data = data

    unknown_user_fields = set(user_data.keys()) - allowed_user_fields
    unknown_profile_fields = set(profile_data.keys()) - allowed_profile_fields

    if unknown_user_fields:
        raise ValidationError({
            "user": {
                "detail": "Unsupported or protected fields.",
                "fields": sorted(unknown_user_fields),
            }
        })

    if unknown_profile_fields:
        raise ValidationError({
            "profile": {
                "detail": "Unsupported or protected fields.",
                "fields": sorted(unknown_profile_fields),
            }
        })

    # Validate common account fields.
    for field in ("first_name", "last_name"):
        if field in user_data:
            value = user_data[field]
            if not isinstance(value, str) or not value.strip():
                raise ValidationError({
                    f"user.{field}": "This field cannot be empty."
                })
            setattr(user, field, value.strip())

    if "phone" in user_data:
        value = user_data["phone"]
        if value is not None and not isinstance(value, str):
            raise ValidationError({
                "user.phone": "Phone must be a string."
            })
        user.phone = value.strip() if value else None

    # Validate and apply role-specific fields.
    url_validator = URLValidator()

    for field, value in profile_data.items():
        if field == "phone":
            if value is not None and not isinstance(value, str):
                raise ValidationError({
                    "profile.phone": "Phone must be a string."
                })
            value = value.strip() if value else None

        elif field == "profile_photo_url":
            if value in ("", None):
                value = None
            elif not isinstance(value, str):
                raise ValidationError({
                    "profile.profile_photo_url": "Expected a URL string."
                })
            else:
                try:
                    url_validator(value)
                except DjangoValidationError:
                    raise ValidationError({
                        "profile.profile_photo_url": "Enter a valid URL."
                    })

        elif field == "date_of_birth":
            if value in ("", None):
                value = None
            elif isinstance(value, str):
                from django.utils.dateparse import parse_date
                value = parse_date(value)
                if value is None:
                    raise ValidationError({
                        "profile.date_of_birth": "Use YYYY-MM-DD format."
                    })
            else:
                raise ValidationError({
                    "profile.date_of_birth": "Use YYYY-MM-DD format."
                })

        elif field == "experience":
            if value in ("", None):
                value = None
            elif isinstance(value, bool) or not isinstance(value, int) or value < 0:
                raise ValidationError({
                    "profile.experience": "Experience must be a non-negative integer."
                })

        elif field in {
            "full_name",
            "gender",
            "address",
            "faculty_subject",
            "faculty_email",
            "qualification",
            "specialization",
            "bio",
            "office_room",
        }:
            if value == "" and field != "full_name":
                value = None
            elif value is not None and not isinstance(value, str):
                raise ValidationError({
                    f"profile.{field}": "Expected a string."
                })

            if field == "full_name":
                if not value or not value.strip():
                    raise ValidationError({
                        "profile.full_name": "This field cannot be empty."
                    })
                value = value.strip()

        setattr(profile, field, value)

    # Keep duplicate phone fields synchronized.
    if "phone" in profile_data:
        user.phone = profile.phone

    elif "phone" in user_data:
        profile.phone = user.phone

    # Keep account first/last names consistent when full_name changes.
    if "full_name" in profile_data:
        parts = profile.full_name.strip().split(maxsplit=1)
        user.first_name = parts[0]
        user.last_name = parts[1] if len(parts) > 1 else ""

    with transaction.atomic():
        user.save()
        profile.save()

    return Response({
        "detail": "Profile updated successfully.",
        "user": {
            "id": str(user.id),
            "email": user.email,
            "first_name": user.first_name,
            "last_name": user.last_name,
            "full_name": f"{user.first_name} {user.last_name}".strip(),
            "phone": user.phone,
            "role": user.role,
            "status": user.status,
        },
        "profile_type": profile_type,
    })
