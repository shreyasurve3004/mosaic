from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework import status

from django.db import models, transaction
from django.db.models import Count, Q, Prefetch
from django.shortcuts import get_object_or_404
from django.utils import timezone

from urllib.parse import urlparse

import cloudinary.uploader
from config.file_delivery import serve_cloudinary_file

from apps.users.models import Student, Faculty, Admin
from .models import Department, Course, Enrollment, Timetable, Attendance, Resource, FacultyCourse, Assignment, AssignmentFile, Submission, SubmissionFile, Result, SemesterResult, AcademicCalendar
from .serializers import DepartmentSerializer, CourseSerializer, FacultyCourseSerializer,TimetableSerializer, AttendanceSerializer, ResourceSerializer, AssignmentSerializer, AssignmentFileSerializer, SubmissionSerializer, SubmissionFileSerializer, ResultSerializer, SemesterResultSerializer, AcademicCalendarSerializer, AcademicCalendarFilterSerializer


def student_has_assignment_access(student, assignment):
    faculty_course = assignment.faculty_course
    if not faculty_course.course.enrollments.filter(
        student=student
    ).exists():
        return False
    return (
        student.year == faculty_course.year
        and student.sem == faculty_course.sem
        and student.div == faculty_course.div
        and student.academic_year == faculty_course.academic_year
        and (
            faculty_course.class_type != "practical"
            or student.batch == faculty_course.batch
        )
    )


@api_view(["GET"])
def class_timetable(request):
    year = request.query_params.get("year")
    sem = request.query_params.get("sem")
    div = request.query_params.get("div")
    academic_year = request.query_params.get("academic_year")

    if not all([year, sem, div, academic_year]):
        return Response(
            {
                "error": "year, sem, div and academic_year are required."
            },
            status=status.HTTP_400_BAD_REQUEST
        )

    timetable = Timetable.objects.filter(
        faculty_course__year=year,
        faculty_course__sem=sem,
        faculty_course__div=div,
        faculty_course__academic_year=academic_year
    ).select_related(
        "faculty_course__course",
        "faculty_course__faculty",
        "room"
    ).order_by(
        "day",
        "start_time"
    )

    serializer = TimetableSerializer(timetable, many=True)

    return Response(serializer.data)


@api_view(["GET"])
def student_timetable(request):
    if not request.user.is_authenticated:
        return Response(
            {"error": "Authentication required."},
            status=status.HTTP_401_UNAUTHORIZED
        )

    try:
        student = request.user.student_profile
    except Student.DoesNotExist:
        return Response(
            {"error": "Student profile not found."},
            status=status.HTTP_404_NOT_FOUND
        )

    timetable = Timetable.objects.filter(
        faculty_course__year=student.year,
        faculty_course__sem=student.sem,
        faculty_course__div=student.div,
        faculty_course__academic_year=student.academic_year
    ).filter(
        models.Q(
            faculty_course__class_type="lecture",
            faculty_course__batch__isnull=True
        )
        |
        models.Q(
            faculty_course__class_type="practical",
            faculty_course__batch=student.batch
        )
    ).filter(
        faculty_course__course__enrollments__student=student
    ).select_related(
        "faculty_course__course",
        "faculty_course__faculty",
        "room"
    ).order_by(
        "day",
        "start_time"
    ).distinct()

    serializer = TimetableSerializer(timetable, many=True)

    return Response(serializer.data)


@api_view(["GET"])
def faculty_timetable(request):
    if not request.user.is_authenticated:
        return Response(
            {"error": "Authentication required."},
            status=status.HTTP_401_UNAUTHORIZED
        )

    try:
        faculty = request.user.faculty_profile
    except Faculty.DoesNotExist:
        return Response(
            {"error": "Faculty profile not found."},
            status=status.HTTP_404_NOT_FOUND
        )

    timetable = Timetable.objects.filter(
        faculty_course__faculty=faculty
    ).select_related(
        "faculty_course__course",
        "faculty_course__faculty",
        "room"
    ).order_by(
        "day",
        "start_time"
    )

    serializer = TimetableSerializer(timetable, many=True)

    return Response(serializer.data)


@api_view(["GET", "POST", "PUT", "PATCH", "DELETE"])
def admin_timetable(request, timetable_id=None):
    if not request.user.is_authenticated:
        return Response(
            {"detail": "Authentication required."},
            status=status.HTTP_401_UNAUTHORIZED
        )

    if request.user.role != "admin":
        return Response(
            {"detail": "Only admin can manage the timetable."},
            status=status.HTTP_403_FORBIDDEN
        )

    queryset = Timetable.objects.select_related(
        "faculty_course__course",
        "faculty_course__faculty",
        "faculty_course__course__department",
        "room"
    )

    # GET
    if request.method == "GET":

        if timetable_id is not None:
            try:
                timetable = queryset.get(
                    timetable_id=timetable_id
                )
            except Timetable.DoesNotExist:
                return Response(
                    {"detail": "Timetable entry not found."},
                    status=status.HTTP_404_NOT_FOUND
                )

            serializer = TimetableSerializer(timetable)

            return Response(
                serializer.data,
                status=status.HTTP_200_OK
            )

        # Optional filters for Admin
        year = request.query_params.get("year")
        sem = request.query_params.get("sem")
        div = request.query_params.get("div")
        batch = request.query_params.get("batch")
        academic_year = request.query_params.get("academic_year")
        department = request.query_params.get("department")
        faculty = request.query_params.get("faculty")

        if year:
            queryset = queryset.filter(
                faculty_course__year=year
            )

        if sem:
            queryset = queryset.filter(
                faculty_course__sem=sem
            )

        if div:
            queryset = queryset.filter(
                faculty_course__div=div
            )

        if batch:
            queryset = queryset.filter(
                faculty_course__batch=batch
            )

        if academic_year:
            queryset = queryset.filter(
                faculty_course__academic_year=academic_year
            )

        if department:
            queryset = queryset.filter(
                faculty_course__course__department_id=department
            )

        if faculty:
            queryset = queryset.filter(
                faculty_course__faculty__faculty_id=faculty
            )

        timetable = queryset.order_by(
            "day",
            "start_time"
        )

        serializer = TimetableSerializer(
            timetable,
            many=True
        )

        return Response(
            serializer.data,
            status=status.HTTP_200_OK
        )

    # POST
    if request.method == "POST":
        serializer = TimetableSerializer(
            data=request.data
        )

        if not serializer.is_valid():
            return Response(
                serializer.errors,
                status=status.HTTP_400_BAD_REQUEST
            )

        faculty_course = serializer.validated_data["faculty_course"]
        room = serializer.validated_data["room"]
        day = serializer.validated_data["day"]
        start_time = serializer.validated_data["start_time"]
        end_time = serializer.validated_data["end_time"]

        # Prevent faculty from being assigned two classes
        # at the same time.
        faculty_conflict = Timetable.objects.filter(
            faculty_course__faculty=faculty_course.faculty,
            day=day,
            start_time__lt=end_time,
            end_time__gt=start_time
        ).exists()

        if faculty_conflict:
            return Response(
                {
                    "detail": (
                        "Faculty already has a timetable entry "
                        "during this time."
                    )
                },
                status=status.HTTP_400_BAD_REQUEST
            )

        # Prevent room from being occupied twice.
        room_conflict = Timetable.objects.filter(
            room=room,
            day=day,
            start_time__lt=end_time,
            end_time__gt=start_time
        ).exists()

        if room_conflict:
            return Response(
                {
                    "detail": (
                        "Room is already occupied "
                        "during this time."
                    )
                },
                status=status.HTTP_400_BAD_REQUEST
            )

        timetable = serializer.save()

        return Response(
            TimetableSerializer(timetable).data,
            status=status.HTTP_201_CREATED
        )

    # PUT / PATCH / DELETE require an ID
    if timetable_id is None:
        return Response(
            {"detail": "timetable_id is required."},
            status=status.HTTP_400_BAD_REQUEST
        )

    try:
        timetable = Timetable.objects.get(
            timetable_id=timetable_id
        )
    except Timetable.DoesNotExist:
        return Response(
            {"detail": "Timetable entry not found."},
            status=status.HTTP_404_NOT_FOUND
        )

    # UPDATE
    if request.method in ["PUT", "PATCH"]:
        serializer = TimetableSerializer(
            timetable,
            data=request.data,
            partial=(request.method == "PATCH")
        )

        if not serializer.is_valid():
            return Response(
                serializer.errors,
                status=status.HTTP_400_BAD_REQUEST
            )

        faculty_course = serializer.validated_data.get(
            "faculty_course",
            timetable.faculty_course
        )

        room = serializer.validated_data.get(
            "room",
            timetable.room
        )

        day = serializer.validated_data.get(
            "day",
            timetable.day
        )

        start_time = serializer.validated_data.get(
            "start_time",
            timetable.start_time
        )

        end_time = serializer.validated_data.get(
            "end_time",
            timetable.end_time
        )

        faculty_conflict = Timetable.objects.filter(
            faculty_course__faculty=faculty_course.faculty,
            day=day,
            start_time__lt=end_time,
            end_time__gt=start_time
        ).exclude(
            timetable_id=timetable_id
        ).exists()

        if faculty_conflict:
            return Response(
                {
                    "detail": (
                        "Faculty already has a timetable entry "
                        "during this time."
                    )
                },
                status=status.HTTP_400_BAD_REQUEST
            )

        room_conflict = Timetable.objects.filter(
            room=room,
            day=day,
            start_time__lt=end_time,
            end_time__gt=start_time
        ).exclude(
            timetable_id=timetable_id
        ).exists()

        if room_conflict:
            return Response(
                {
                    "detail": (
                        "Room is already occupied "
                        "during this time."
                    )
                },
                status=status.HTTP_400_BAD_REQUEST
            )

        timetable = serializer.save()

        return Response(
            TimetableSerializer(timetable).data,
            status=status.HTTP_200_OK
        )

    # DELETE
    if request.method == "DELETE":
        timetable.delete()

        return Response(
            status=status.HTTP_204_NO_CONTENT
        )


@api_view(["GET"])
def faculty_courses(request):
    if not request.user.is_authenticated:
        return Response(
            {"detail": "Authentication required."},
            status=status.HTTP_401_UNAUTHORIZED
        )

    if request.user.role != "faculty":
        return Response(
            {"detail": "Only faculty can access assigned courses."},
            status=status.HTTP_403_FORBIDDEN
        )

    try:
        faculty = request.user.faculty_profile
    except Faculty.DoesNotExist:
        return Response(
            {"detail": "Faculty profile not found."},
            status=status.HTTP_404_NOT_FOUND
        )

    faculty_courses = FacultyCourse.objects.filter(
        faculty=faculty
    ).select_related(
        "faculty",
        "course",
        "course__department"
    ).order_by(
        "year",
        "sem",
        "div",
        "course__course_name"
    )

    serializer = FacultyCourseSerializer(
        faculty_courses,
        many=True
    )

    return Response(
        serializer.data,
        status=status.HTTP_200_OK
    )


@api_view(["GET"])
def faculty_course_students(request, faculty_course_id):
    if not request.user.is_authenticated:
        return Response(
            {"detail": "Authentication required."},
            status=status.HTTP_401_UNAUTHORIZED
        )

    if request.user.role != "faculty":
        return Response(
            {"detail": "Only faculty can access course students."},
            status=status.HTTP_403_FORBIDDEN
        )

    try:
        faculty = request.user.faculty_profile
    except Faculty.DoesNotExist:
        return Response(
            {"detail": "Faculty profile not found."},
            status=status.HTTP_404_NOT_FOUND
        )

    faculty_course = get_object_or_404(
        FacultyCourse.objects.select_related("course"),
        faculty_course_id=faculty_course_id
    )

    if faculty_course.faculty != faculty:
        return Response(
            {"detail": "You are not assigned to this course."},
            status=status.HTTP_403_FORBIDDEN
        )

    students = Student.objects.filter(
        year=faculty_course.year,
        sem=faculty_course.sem,
        div=faculty_course.div,
        academic_year=faculty_course.academic_year,
        enrollments__course=faculty_course.course
    )

    if faculty_course.class_type == "practical":
        students = students.filter(
            batch=faculty_course.batch
        )

    students = students.select_related(
        "user"
    ).distinct().order_by(
        "roll_no"
    )

    return Response(
        [
            {
                "roll_no": student.roll_no,
                "student_name": student.full_name,
                "email": student.user.email,
                "year": student.year,
                "sem": student.sem,
                "div": student.div,
                "batch": student.batch,
            }
            for student in students
        ],
        status=status.HTTP_200_OK
    )


@api_view(["POST", "PUT"])
def mark_attendance(request):
    if not request.user.is_authenticated:
        return Response(
            {"error": "Authentication required."},
            status=status.HTTP_401_UNAUTHORIZED
        )

    try:
        faculty = request.user.faculty_profile
    except Faculty.DoesNotExist:
        return Response(
            {"error": "Faculty profile not found."},
            status=status.HTTP_404_NOT_FOUND
        )

    timetable_id = request.data.get("timetable_id")
    date = request.data.get("date")
    lecture_no = request.data.get("lecture_no")
    attendance_data = request.data.get("attendance")

    if not all([timetable_id, date, lecture_no, attendance_data]):
        return Response(
            {
                "error": (
                    "timetable_id, date, lecture_no and "
                    "attendance are required."
                )
            },
            status=status.HTTP_400_BAD_REQUEST
        )

    if not isinstance(attendance_data, list):
        return Response(
            {"error": "attendance must be a list."},
            status=status.HTTP_400_BAD_REQUEST
        )

    timetable = get_object_or_404(
        Timetable.objects.select_related(
            "faculty_course",
            "faculty_course__course"
        ),
        timetable_id=timetable_id
    )

    if timetable.faculty_course.faculty != faculty:
        return Response(
            {"error": "You are not assigned to this timetable."},
            status=status.HTTP_403_FORBIDDEN
        )

    faculty_course = timetable.faculty_course

    students = Student.objects.filter(
        year=faculty_course.year,
        sem=faculty_course.sem,
        div=faculty_course.div,
        academic_year=faculty_course.academic_year,
        enrollments__course=faculty_course.course
    )

    if faculty_course.class_type == "practical":
        students = students.filter(
            batch=faculty_course.batch
        )

    students = students.distinct()

    student_map = {
        student.roll_no: student
        for student in students
    }

    submitted_roll_numbers = {
        item.get("roll_no")
        for item in attendance_data
    }

    eligible_roll_numbers = set(student_map.keys())

    if submitted_roll_numbers != eligible_roll_numbers:
        return Response(
            {
                "error": (
                    "Attendance must be provided for all eligible "
                    "students in the class."
                )
            },
            status=status.HTTP_400_BAD_REQUEST
        )

    records = []

    for item in attendance_data:
        roll_no = item.get("roll_no")
        attendance_status = item.get("status")

        if roll_no not in student_map:
            return Response(
                {
                    "error": (
                        f"Student {roll_no} is not eligible "
                        "for this timetable."
                    )
                },
                status=status.HTTP_400_BAD_REQUEST
            )

        if attendance_status not in ["present", "absent"]:
            return Response(
                {
                    "error": (
                        f"Invalid attendance status for {roll_no}."
                    )
                },
                status=status.HTTP_400_BAD_REQUEST
            )

        records.append(
            {
                "student": student_map[roll_no],
                "status": attendance_status
            }
        )

    with transaction.atomic():

        if request.method == "POST":

            attendance_records = [
                Attendance(
                    student=record["student"],
                    timetable=timetable,
                    date=date,
                    lecture_no=lecture_no,
                    status=record["status"]
                )
                for record in records
            ]

            Attendance.objects.bulk_create(
                attendance_records
            )

            saved_records = attendance_records

        else:
            saved_records = []

            for record in records:
                attendance, _ = Attendance.objects.update_or_create(
                    student=record["student"],
                    timetable=timetable,
                    date=date,
                    lecture_no=lecture_no,
                    defaults={
                        "status": record["status"]
                    }
                )

                saved_records.append(attendance)

    serializer = AttendanceSerializer(
        saved_records,
        many=True
    )

    return Response(
        serializer.data,
        status=(
            status.HTTP_201_CREATED
            if request.method == "POST"
            else status.HTTP_200_OK
        )
    )


@api_view(["GET"])
def attendance_students(request):
    if not request.user.is_authenticated:
        return Response(
            {"error": "Authentication required."},
            status=status.HTTP_401_UNAUTHORIZED
        )

    try:
        faculty = request.user.faculty_profile
    except Faculty.DoesNotExist:
        return Response(
            {"error": "Faculty profile not found."},
            status=status.HTTP_404_NOT_FOUND
        )

    timetable_id = request.query_params.get("timetable_id")

    if not timetable_id:
        return Response(
            {"error": "timetable_id is required."},
            status=status.HTTP_400_BAD_REQUEST
        )

    timetable = get_object_or_404(
        Timetable.objects.select_related(
            "faculty_course",
            "faculty_course__course"
        ),
        timetable_id=timetable_id
    )

    if timetable.faculty_course.faculty != faculty:
        return Response(
            {"error": "You are not assigned to this timetable."},
            status=status.HTTP_403_FORBIDDEN
        )

    faculty_course = timetable.faculty_course

    students = Student.objects.filter(
        year=faculty_course.year,
        sem=faculty_course.sem,
        div=faculty_course.div,
        academic_year=faculty_course.academic_year,
        enrollments__course=faculty_course.course
    )

    if faculty_course.class_type == "practical":
        students = students.filter(
            batch=faculty_course.batch
        )

    students = students.distinct().order_by(
        "roll_no"
    )

    return Response(
        [
            {
                "roll_no": student.roll_no,
                "student_name": student.full_name,
                "status": "present"
            }
            for student in students
        ],
        status=status.HTTP_200_OK
    )


@api_view(["GET"])
def student_attendance(request):
    if not request.user.is_authenticated:
        return Response(
            {"error": "Authentication required."},
            status=status.HTTP_401_UNAUTHORIZED
        )

    try:
        student = request.user.student_profile
    except Student.DoesNotExist:
        return Response(
            {"error": "Student profile not found."},
            status=status.HTTP_404_NOT_FOUND
        )

    attendance = Attendance.objects.filter(
        student=student
    ).select_related(
        "timetable__faculty_course__course"
    ).order_by(
        "-date",
        "-lecture_no"
    )

    records = AttendanceSerializer(
        attendance,
        many=True
    ).data

    summary = Attendance.objects.filter(
        student=student
    ).values(
        "timetable__faculty_course__course__course_id",
        "timetable__faculty_course__course__course_name"
    ).annotate(
        total_lectures=Count("attendance_id"),
        present=Count(
            "attendance_id",
            filter=Q(status="present")
        ),
        absent=Count(
            "attendance_id",
            filter=Q(status="absent")
        )
    ).order_by(
        "timetable__faculty_course__course__course_id"
    )

    course_summary = []

    for item in summary:
        total = item["total_lectures"]
        present = item["present"]

        percentage = (
            round((present / total) * 100, 2)
            if total > 0
            else 0
        )

        course_summary.append(
            {
                "course_id": item[
                    "timetable__faculty_course__course__course_id"
                ],
                "course_name": item[
                    "timetable__faculty_course__course__course_name"
                ],
                "total_lectures": total,
                "present": present,
                "absent": item["absent"],
                "percentage": percentage
            }
        )

    return Response(
        {
            "summary": course_summary,
            "records": records
        }
    )


@api_view(["GET"])
def resources(request):
    if not request.user.is_authenticated:
        return Response(
            {"error": "Authentication required."},
            status=status.HTTP_401_UNAUTHORIZED
        )

    resource_queryset = Resource.objects.select_related(
        "faculty_course__course__department",
        "faculty_course__faculty"
    )

    user_role = request.user.role

    if user_role == "student":
        try:
            student = request.user.student_profile
        except Student.DoesNotExist:
            return Response(
                {"error": "Student profile not found."},
                status=status.HTTP_404_NOT_FOUND
            )

        enrolled_courses = Course.objects.filter(
            enrollments__student=student,
            course_sem=student.sem
        )

        course_id = request.query_params.get("course_id")

        if course_id:
            enrolled_courses = enrolled_courses.filter(
                course_id=course_id
            )

        enrolled_courses = enrolled_courses.distinct().order_by(
            "course_name",
            "course_id"
        )

        resource_queryset = resource_queryset.filter(
            faculty_course__course__in=enrolled_courses,
            faculty_course__sem=student.sem,
            faculty_course__year=student.year,
            faculty_course__academic_year=student.academic_year
        ).order_by(
            "faculty_course__course__course_name",
            "resource_type",
            "title"
        )

        serialized_resources = ResourceSerializer(
            resource_queryset,
            many=True
        ).data
        resources_by_course = {
            course.course_id: []
            for course in enrolled_courses
        }

        for resource in serialized_resources:
            resources_by_course[resource["course_id"]].append(resource)

        return Response({
            "current_semester": student.sem,
            "courses": [
                {
                    "course_id": course.course_id,
                    "course_name": course.course_name,
                    "resources": resources_by_course[course.course_id]
                }
                for course in enrolled_courses
            ]
        })

    elif user_role == "faculty":
        try:
            faculty = request.user.faculty_profile
        except Faculty.DoesNotExist:
            return Response(
                {"error": "Faculty profile not found."},
                status=status.HTTP_404_NOT_FOUND
            )

        resource_queryset = resource_queryset.filter(
            faculty_course__faculty=faculty
        )

        faculty_course_id = request.query_params.get(
            "faculty_course"
        )

        resource_type = request.query_params.get(
            "resource_type"
        )

        if faculty_course_id:
            resource_queryset = resource_queryset.filter(
                faculty_course_id=faculty_course_id
            )

        if resource_type:
            resource_queryset = resource_queryset.filter(
                resource_type=resource_type
            )

    elif user_role == "admin":
        faculty_course_id = request.query_params.get(
            "faculty_course"
        )

        resource_type = request.query_params.get(
            "resource_type"
        )

        if faculty_course_id:
            resource_queryset = resource_queryset.filter(
                faculty_course_id=faculty_course_id
            )

        if resource_type:
            resource_queryset = resource_queryset.filter(
                resource_type=resource_type
            )

    else:
        return Response(
            {"error": "You do not have permission to view resources."},
            status=status.HTTP_403_FORBIDDEN
        )

    resource_queryset = resource_queryset.order_by(
        "faculty_course__course__course_name",
        "resource_type",
        "title"
    )

    serializer = ResourceSerializer(
        resource_queryset,
        many=True
    )

    return Response(serializer.data)


@api_view(["GET"])
def resource_file(request, resource_id):
    if not request.user.is_authenticated:
        return Response(
            {"error": "Authentication required."},
            status=status.HTTP_401_UNAUTHORIZED
        )

    resource = get_object_or_404(
        Resource.objects.select_related(
            "faculty_course__course",
            "faculty_course__faculty",
        ),
        resource_id=resource_id,
    )
    faculty_course = resource.faculty_course

    if request.user.role == "student":
        try:
            student = request.user.student_profile
        except Student.DoesNotExist:
            return Response(
                {"error": "Student profile not found."},
                status=status.HTTP_404_NOT_FOUND
            )

        is_enrolled = Enrollment.objects.filter(
            student=student,
            course=faculty_course.course,
            course__course_sem=student.sem,
        ).exists()
        belongs_to_current_class = (
            faculty_course.sem == student.sem
            and faculty_course.year == student.year
            and faculty_course.academic_year == student.academic_year
        )

        if not is_enrolled or not belongs_to_current_class:
            return Response(
                {"error": "You do not have permission to access this file."},
                status=status.HTTP_403_FORBIDDEN
            )
    elif request.user.role == "faculty":
        try:
            faculty = request.user.faculty_profile
        except Faculty.DoesNotExist:
            return Response(
                {"error": "Faculty profile not found."},
                status=status.HTTP_404_NOT_FOUND
            )

        if faculty_course.faculty_id != faculty.pk:
            return Response(
                {"error": "You do not have permission to access this file."},
                status=status.HTTP_403_FORBIDDEN
            )
    elif request.user.role != "admin":
        return Response(
            {"error": "You do not have permission to access this file."},
            status=status.HTTP_403_FORBIDDEN
        )

    return serve_cloudinary_file(
        request,
        resource.file_url,
        resource.original_file_name or resource.title,
    )


@api_view(["POST"])
def create_resource(request):
    if not request.user.is_authenticated:
        return Response(
            {"error": "Authentication required."},
            status=status.HTTP_401_UNAUTHORIZED
        )

    faculty_course_id = request.data.get("faculty_course")
    uploaded_file = request.FILES.get("file")

    if not faculty_course_id:
        return Response(
            {"error": "faculty_course is required."},
            status=status.HTTP_400_BAD_REQUEST
        )

    if not uploaded_file:
        return Response(
            {"error": "file is required."},
            status=status.HTTP_400_BAD_REQUEST
        )

    faculty_course = get_object_or_404(
        FacultyCourse,
        faculty_course_id=faculty_course_id
    )

    user_role = request.user.role

    if user_role == "student":
        return Response(
            {"error": "Students cannot upload resources."},
            status=status.HTTP_403_FORBIDDEN
        )

    if user_role == "faculty":
        try:
            faculty = request.user.faculty_profile
        except Faculty.DoesNotExist:
            return Response(
                {"error": "Faculty profile not found."},
                status=status.HTTP_404_NOT_FOUND
            )

        if faculty_course.faculty != faculty:
            return Response(
                {
                    "error": (
                        "You can only upload resources "
                        "for your assigned courses."
                    )
                },
                status=status.HTTP_403_FORBIDDEN
            )

    if user_role not in ["faculty", "admin"]:
        return Response(
            {"error": "You do not have permission to upload resources."},
            status=status.HTTP_403_FORBIDDEN
        )

    serializer = ResourceSerializer(
        data=request.data
    )

    if not serializer.is_valid():
        return Response(
            serializer.errors,
            status=status.HTTP_400_BAD_REQUEST
        )

    department_code = (
        faculty_course.course.department.department_code
    )

    course_id = faculty_course.course.course_id
    resource_type = request.data.get("resource_type")
    resource_division = request.data.get("resource_division") or None

    if resource_type == "ppt_notes":
        if resource_division not in ["A", "B", "C"]:
            return Response(
                {
                    "error": (
                        "A valid resource_division (A, B, or C) "
                        "is required for PPTs and Notes."
                    )
                },
                status=status.HTTP_400_BAD_REQUEST
            )
    else:
        resource_division = None

    folder = (
        f"mosaic/resources/"
        f"{department_code}/"
        f"{faculty_course.academic_year}/"
        f"Year-{faculty_course.year}/"
        f"Sem-{faculty_course.sem}/"
        f"{course_id}/"
        f"{resource_type}"
    )

    if resource_type == "ppt_notes":
        folder = f"{folder}/Division-{resource_division}"

    try:
        upload_result = cloudinary.uploader.upload(
            uploaded_file,
            folder=folder,
            resource_type="auto"
        )
    except Exception as error:
        return Response(
            {
                "error": "File upload failed.",
                "details": str(error)
            },
            status=status.HTTP_502_BAD_GATEWAY
        )

    resource = serializer.save(
        file_url=upload_result["secure_url"],
        original_file_name=uploaded_file.name,
    )

    return Response(
        ResourceSerializer(resource).data,
        status=status.HTTP_201_CREATED
    )


def delete_cloudinary_file(file_url):
    if not file_url:
        return

    try:
        parsed_url = urlparse(file_url)
        path = parsed_url.path

        if "/image/upload/" in path:
            resource_type = "image"
            upload_marker = "/image/upload/"

        elif "/raw/upload/" in path:
            resource_type = "raw"
            upload_marker = "/raw/upload/"

        elif "/video/upload/" in path:
            resource_type = "video"
            upload_marker = "/video/upload/"

        else:
            return

        public_path = path.split(
            upload_marker,
            1
        )[1]

        parts = public_path.split(
            "/",
            1
        )

        if (
            parts[0].startswith("v")
            and parts[0][1:].isdigit()
        ):
            public_path = parts[1]

        public_id = public_path.rsplit(
            ".",
            1
        )[0]

        cloudinary.uploader.destroy(
            public_id,
            resource_type=resource_type
        )

    except Exception:
        pass


@api_view(["PUT", "DELETE"])
def manage_resource(request, resource_id):
    if not request.user.is_authenticated:
        return Response(
            {"error": "Authentication required."},
            status=status.HTTP_401_UNAUTHORIZED
        )

    resource = get_object_or_404(
        Resource,
        resource_id=resource_id
    )

    user_role = request.user.role

    if user_role == "student":
        return Response(
            {"error": "Students cannot modify resources."},
            status=status.HTTP_403_FORBIDDEN
        )

    if user_role == "faculty":
        try:
            faculty = request.user.faculty_profile
        except Faculty.DoesNotExist:
            return Response(
                {"error": "Faculty profile not found."},
                status=status.HTTP_404_NOT_FOUND
            )

        if resource.faculty_course.faculty != faculty:
            return Response(
                {"error": "You can only modify your own resources."},
                status=status.HTTP_403_FORBIDDEN
            )

    if user_role not in ["faculty", "admin"]:
        return Response(
            {"error": "You do not have permission to modify resources."},
            status=status.HTTP_403_FORBIDDEN
        )

    if request.method == "DELETE":
        old_file_url = resource.file_url

        resource.delete()

        delete_cloudinary_file(old_file_url)

        return Response(
            {"message": "Resource deleted successfully."},
            status=status.HTTP_200_OK
        )

    uploaded_file = request.FILES.get("file")

    if uploaded_file:
        department_code = (
            resource.faculty_course.course.department.department_code
        )

        course_id = resource.faculty_course.course.course_id
        resource_type = request.data.get(
            "resource_type",
            resource.resource_type
        )
        resource_division = request.data.get(
            "resource_division",
            resource.resource_division
        ) or None

        if resource_type == "ppt_notes":
            if resource_division not in ["A", "B", "C"]:
                return Response(
                    {
                        "error": (
                            "A valid resource_division (A, B, or C) "
                            "is required for PPTs and Notes."
                        )
                    },
                    status=status.HTTP_400_BAD_REQUEST
                )
        else:
            resource_division = None

        folder = (
            f"mosaic/resources/"
            f"{department_code}/"
            f"{course_id}/"
            f"{resource_type}"
        )

        if resource_type == "ppt_notes":
            folder = f"{folder}/Division-{resource_division}"

        try:
            upload_result = cloudinary.uploader.upload(
                uploaded_file,
                folder=folder,
                resource_type="auto"
            )
        except Exception as error:
            return Response(
                {
                    "error": "File upload failed.",
                    "details": str(error)
                },
                status=status.HTTP_502_BAD_GATEWAY
            )

        old_file_url = resource.file_url

        serializer = ResourceSerializer(
            resource,
            data=request.data,
            partial=True
        )

        if not serializer.is_valid():
            return Response(
                serializer.errors,
                status=status.HTTP_400_BAD_REQUEST
            )

        serializer.save(
            file_url=upload_result["secure_url"],
            original_file_name=uploaded_file.name,
        )

        delete_cloudinary_file(old_file_url)

        return Response(
            serializer.data,
            status=status.HTTP_200_OK
        )

    serializer = ResourceSerializer(
        resource,
        data=request.data,
        partial=True
    )

    if serializer.is_valid():
        serializer.save()

        return Response(
            serializer.data,
            status=status.HTTP_200_OK
        )

    return Response(
        serializer.errors,
        status=status.HTTP_400_BAD_REQUEST
    )


@api_view(["GET", "POST"])
def assignments(request):
    if not request.user.is_authenticated:
        return Response(
            {"detail": "Authentication required."},
            status=status.HTTP_401_UNAUTHORIZED
        )

    user = request.user

    if user.role not in ["student", "faculty"]:
        return Response(
            {"detail": "You do not have access to assignments."},
            status=status.HTTP_403_FORBIDDEN
        )

    if request.method == "GET":

        if user.role == "student":
            student = user.student_profile

            queryset = Assignment.objects.filter(
                faculty_course__course__enrollments__student=student,
                faculty_course__year=student.year,
                faculty_course__sem=student.sem,
                faculty_course__div=student.div,
                faculty_course__academic_year=student.academic_year
            ).filter(
                ~Q(faculty_course__class_type="practical")
                | Q(
                    faculty_course__class_type="practical",
                    faculty_course__batch=student.batch
                )
            ).prefetch_related(
                Prefetch(
                    "submissions",
                    queryset=Submission.objects.filter(
                        student=student
                    ),
                    to_attr="student_submissions"
                )
            )

        else:
            student = None
            faculty = user.faculty_profile

            queryset = Assignment.objects.filter(
                faculty_course__faculty=faculty
            )

        queryset = queryset.select_related(
            "faculty_course__course",
            "faculty_course__faculty"
        ).prefetch_related(
            "files"
        ).order_by(
            "due_date"
        )

        serializer = AssignmentSerializer(
            queryset,
            many=True,
            context={"student": student}
        )

        return Response(
            serializer.data,
            status=status.HTTP_200_OK
        )

    if user.role != "faculty":
        return Response(
            {"detail": "Only faculty can create assignments."},
            status=status.HTTP_403_FORBIDDEN
        )

    faculty_course_id = request.data.get(
        "faculty_course"
    )

    if not faculty_course_id:
        return Response(
            {"detail": "faculty_course is required."},
            status=status.HTTP_400_BAD_REQUEST
        )

    try:
        faculty_course = FacultyCourse.objects.get(
            faculty_course_id=faculty_course_id
        )
    except FacultyCourse.DoesNotExist:
        return Response(
            {"detail": "Faculty course not found."},
            status=status.HTTP_404_NOT_FOUND
        )

    if faculty_course.faculty != user.faculty_profile:
        return Response(
            {
                "detail":
                "You can only create assignments for your own courses."
            },
            status=status.HTTP_403_FORBIDDEN
        )

    serializer = AssignmentSerializer(
        data=request.data
    )

    if serializer.is_valid():
        serializer.save(
            faculty_course=faculty_course
        )

        return Response(
            serializer.data,
            status=status.HTTP_201_CREATED
        )

    return Response(
        serializer.errors,
        status=status.HTTP_400_BAD_REQUEST
    )


@api_view(["GET", "PUT", "DELETE"])
def manage_assignment(request, assignment_id):
    if not request.user.is_authenticated:
        return Response(
            {"detail": "Authentication required."},
            status=status.HTTP_401_UNAUTHORIZED
        )

    user = request.user

    if user.role not in ["student", "faculty"]:
        return Response(
            {"detail": "You do not have access to assignments."},
            status=status.HTTP_403_FORBIDDEN
        )

    try:
        assignment = Assignment.objects.select_related(
            "faculty_course__course",
            "faculty_course__faculty"
        ).prefetch_related(
            "files"
        ).get(
            assignment_id=assignment_id
        )

    except Assignment.DoesNotExist:
        return Response(
            {"detail": "Assignment not found."},
            status=status.HTTP_404_NOT_FOUND
        )

    if user.role == "student":

        if not student_has_assignment_access(
            user.student_profile,
            assignment
        ):
            return Response(
                {"detail": "You do not have access to this assignment."},
                status=status.HTTP_403_FORBIDDEN
            )

        if request.method != "GET":
            return Response(
                {"detail": "Students cannot modify assignments."},
                status=status.HTTP_403_FORBIDDEN
            )

    else:

        if assignment.faculty_course.faculty != user.faculty_profile:
            return Response(
                {
                    "detail":
                    "You can only manage your own assignments."
                },
                status=status.HTTP_403_FORBIDDEN
            )

    if request.method == "GET":

        serializer = AssignmentSerializer(
            assignment,
            context={
                "student": (
                    user.student_profile
                    if user.role == "student"
                    else None
                )
            }
        )

        return Response(
            serializer.data,
            status=status.HTTP_200_OK
        )

    if request.method == "PUT":

        serializer = AssignmentSerializer(
            assignment,
            data=request.data,
            partial=True
        )

        if serializer.is_valid():
            serializer.save()

            return Response(
                serializer.data,
                status=status.HTTP_200_OK
            )

        return Response(
            serializer.errors,
            status=status.HTTP_400_BAD_REQUEST
        )

    assignment_files = list(
        assignment.files.all()
    )

    for assignment_file in assignment_files:
        delete_cloudinary_file(
            assignment_file.file_url
        )

    assignment.delete()

    return Response(
        status=status.HTTP_204_NO_CONTENT
    )


@api_view(["POST"])
def create_assignment_file(request, assignment_id):
    if not request.user.is_authenticated:
        return Response(
            {"detail": "Authentication required."},
            status=status.HTTP_401_UNAUTHORIZED
        )

    user = request.user

    if user.role != "faculty":
        return Response(
            {
                "detail":
                "Only faculty can upload assignment files."
            },
            status=status.HTTP_403_FORBIDDEN
        )

    try:
        assignment = Assignment.objects.select_related(
            "faculty_course__faculty"
        ).get(
            assignment_id=assignment_id
        )

    except Assignment.DoesNotExist:
        return Response(
            {"detail": "Assignment not found."},
            status=status.HTTP_404_NOT_FOUND
        )

    if assignment.faculty_course.faculty != user.faculty_profile:
        return Response(
            {
                "detail":
                "You can only upload files to your own assignments."
            },
            status=status.HTTP_403_FORBIDDEN
        )

    uploaded_file = request.FILES.get("file")

    if not uploaded_file:
        return Response(
            {"detail": "File is required."},
            status=status.HTTP_400_BAD_REQUEST
        )

    upload_result = cloudinary.uploader.upload(
        uploaded_file,
        folder="mosaic/assignments"
    )

    assignment_file = AssignmentFile.objects.create(
        assignment=assignment,
        file_url=upload_result["secure_url"],
        file_name=uploaded_file.name
    )

    serializer = AssignmentFileSerializer(
        assignment_file
    )

    return Response(
        serializer.data,
        status=status.HTTP_201_CREATED
    )


@api_view(["DELETE"])
def delete_assignment_file(
    request,
    assignment_id,
    assignment_file_id
):
    if not request.user.is_authenticated:
        return Response(
            {"detail": "Authentication required."},
            status=status.HTTP_401_UNAUTHORIZED
        )

    user = request.user

    if user.role != "faculty":
        return Response(
            {
                "detail":
                "Only faculty can delete assignment files."
            },
            status=status.HTTP_403_FORBIDDEN
        )

    try:
        assignment_file = AssignmentFile.objects.select_related(
            "assignment__faculty_course__faculty"
        ).get(
            assignment_file_id=assignment_file_id,
            assignment_id=assignment_id
        )

    except AssignmentFile.DoesNotExist:
        return Response(
            {"detail": "Assignment file not found."},
            status=status.HTTP_404_NOT_FOUND
        )

    if (
        assignment_file.assignment.faculty_course.faculty
        != user.faculty_profile
    ):
        return Response(
            {
                "detail":
                "You can only delete files from your own assignments."
            },
            status=status.HTTP_403_FORBIDDEN
        )

    delete_cloudinary_file(
        assignment_file.file_url
    )

    assignment_file.delete()

    return Response(
        status=status.HTTP_204_NO_CONTENT
    )


@api_view(["GET"])
def assignment_file_delivery(request, assignment_id, assignment_file_id):
    if not request.user.is_authenticated:
        return Response(
            {"detail": "Authentication required."},
            status=status.HTTP_401_UNAUTHORIZED
        )

    try:
        assignment_file = AssignmentFile.objects.select_related(
            "assignment__faculty_course__course",
            "assignment__faculty_course__faculty"
        ).get(
            assignment_id=assignment_id,
            assignment_file_id=assignment_file_id
        )
    except AssignmentFile.DoesNotExist:
        return Response(
            {"detail": "Assignment file not found."},
            status=status.HTTP_404_NOT_FOUND
        )

    assignment = assignment_file.assignment
    user = request.user

    if user.role == "student":
        try:
            student = user.student_profile
        except Student.DoesNotExist:
            return Response(
                {"detail": "Student profile not found."},
                status=status.HTTP_404_NOT_FOUND
            )

        if not student_has_assignment_access(student, assignment):
            return Response(
                {"detail": "You do not have access to this assignment."},
                status=status.HTTP_403_FORBIDDEN
            )
    elif user.role == "faculty":
        if assignment.faculty_course.faculty != user.faculty_profile:
            return Response(
                {"detail": "You do not have access to this assignment."},
                status=status.HTTP_403_FORBIDDEN
            )
    elif user.role != "admin":
        return Response(
            {"detail": "You do not have access to this assignment."},
            status=status.HTTP_403_FORBIDDEN
        )

    return serve_cloudinary_file(
        request,
        assignment_file.file_url,
        assignment_file.file_name
    )


@api_view(["GET"])
def student_submission(request, assignment_id):
    if not request.user.is_authenticated:
        return Response(
            {"detail": "Authentication required."},
            status=status.HTTP_401_UNAUTHORIZED
        )

    user = request.user

    if user.role != "student":
        return Response(
            {
                "detail":
                "Only students can access their submissions."
            },
            status=status.HTTP_403_FORBIDDEN
        )

    try:
        assignment = Assignment.objects.select_related(
            "faculty_course__course"
        ).get(
            assignment_id=assignment_id
        )

    except Assignment.DoesNotExist:
        return Response(
            {"detail": "Assignment not found."},
            status=status.HTTP_404_NOT_FOUND
        )

    if not student_has_assignment_access(
        user.student_profile,
        assignment
    ):
        return Response(
            {
                "detail":
                "You do not have access to this assignment."
            },
            status=status.HTTP_403_FORBIDDEN
        )

    submission = Submission.objects.filter(
        assignment=assignment,
        student=user.student_profile
    ).first()

    if submission is None:
        return Response(
            {
                "submission": None,
                "status": "not_submitted",
                "files": []
            },
            status=status.HTTP_200_OK
        )

    submission = Submission.objects.select_related(
        "assignment__faculty_course__course"
    ).prefetch_related(
        "files"
    ).get(
        submission_id=submission.submission_id
    )

    serializer = SubmissionSerializer(
        submission
    )

    return Response(
        serializer.data,
        status=status.HTTP_200_OK
    )


@api_view(["POST"])
def add_submission_files(request, assignment_id):
    if not request.user.is_authenticated:
        return Response(
            {"detail": "Authentication required."},
            status=status.HTTP_401_UNAUTHORIZED
        )

    user = request.user

    if user.role != "student":
        return Response(
            {"detail": "Only students can add submission files."},
            status=status.HTTP_403_FORBIDDEN
        )

    try:
        assignment = Assignment.objects.select_related(
            "faculty_course__course"
        ).get(
            assignment_id=assignment_id
        )

    except Assignment.DoesNotExist:
        return Response(
            {"detail": "Assignment not found."},
            status=status.HTTP_404_NOT_FOUND
        )

    student = user.student_profile

    if not student_has_assignment_access(student, assignment):
        return Response(
            {"detail": "You do not have access to this assignment."},
            status=status.HTTP_403_FORBIDDEN
        )

    if not assignment.is_active:
        return Response(
            {
                "detail":
                "This assignment is no longer accepting submissions."
            },
            status=status.HTTP_400_BAD_REQUEST
        )

    now = timezone.now()

    if now > assignment.due_date and not assignment.allow_late_submission:
        return Response(
            {"detail": "The submission deadline has passed."},
            status=status.HTTP_400_BAD_REQUEST
        )

    uploaded_files = request.FILES.getlist("files")

    if not uploaded_files:
        return Response(
            {"detail": "At least one file is required."},
            status=status.HTTP_400_BAD_REQUEST
        )

    submission = Submission.objects.filter(
        assignment=assignment,
        student=student
    ).first()

    if submission and submission.status not in ["draft", "returned"]:
        return Response(
            {
                "detail":
                "Files can only be added to a draft or returned submission."
            },
            status=status.HTTP_400_BAD_REQUEST
        )

    uploaded_records = []
    uploaded_file_urls = []

    try:
        with transaction.atomic():
            if submission is None:
                submission = Submission.objects.create(
                    assignment=assignment,
                    student=student,
                    status="draft"
                )

            for uploaded_file in uploaded_files:
                upload_result = cloudinary.uploader.upload(
                    uploaded_file,
                    folder="mosaic/submissions",
                    resource_type="raw"
                )

                file_url = upload_result["secure_url"]
                uploaded_file_urls.append(file_url)

                submission_file = SubmissionFile.objects.create(
                    submission=submission,
                    file_url=file_url,
                    file_name=uploaded_file.name
                )

                uploaded_records.append({
                    "submission_file_id":
                    submission_file.submission_file_id,
                    "file_url": submission_file.file_url,
                    "file_name": submission_file.file_name,
                    "uploaded_at": submission_file.uploaded_at,
                })
    except Exception:
        for file_url in uploaded_file_urls:
            delete_cloudinary_file(file_url)
        raise

    return Response(
        {
            "submission": (
                SubmissionSerializer(submission).data
                if submission else None
            ),
            "uploaded_files": uploaded_records,
        },
        status=status.HTTP_201_CREATED
    )


@api_view(["POST"])
def hand_in_submission(request, assignment_id):
    if not request.user.is_authenticated:
        return Response(
            {"detail": "Authentication required."},
            status=status.HTTP_401_UNAUTHORIZED
        )

    user = request.user

    if user.role != "student":
        return Response(
            {
                "detail":
                "Only students can hand in submissions."
            },
            status=status.HTTP_403_FORBIDDEN
        )

    try:
        assignment = Assignment.objects.select_related(
            "faculty_course__course"
        ).get(
            assignment_id=assignment_id
        )

    except Assignment.DoesNotExist:
        return Response(
            {"detail": "Assignment not found."},
            status=status.HTTP_404_NOT_FOUND
        )

    if not student_has_assignment_access(
        user.student_profile,
        assignment
    ):
        return Response(
            {
                "detail":
                "You do not have access to this assignment."
            },
            status=status.HTTP_403_FORBIDDEN
        )

    try:
        submission = Submission.objects.prefetch_related(
            "files"
        ).get(
            assignment=assignment,
            student=user.student_profile
        )

    except Submission.DoesNotExist:
        return Response(
            {"detail": "Submission not found."},
            status=status.HTTP_404_NOT_FOUND
        )

    if submission.status not in ["draft", "returned"]:
        return Response(
            {
                "detail":
                "Submission has already been handed in."
            },
            status=status.HTTP_400_BAD_REQUEST
        )

    if not assignment.is_active:
        return Response(
            {
                "detail":
                "This assignment is no longer accepting submissions."
            },
            status=status.HTTP_400_BAD_REQUEST
        )

    now = timezone.now()

    if now > assignment.due_date:
        if not assignment.allow_late_submission:
            return Response(
                {
                    "detail":
                    "The submission deadline has passed."
                },
                status=status.HTTP_400_BAD_REQUEST
            )

    if not submission.files.exists():
        return Response(
            {
                "detail":
                "Add at least one file before handing in."
            },
            status=status.HTTP_400_BAD_REQUEST
        )

    submission.status = "submitted"
    submission.submitted_at = timezone.now()

    submission.save(
        update_fields=[
            "status",
            "submitted_at"
        ]
    )

    submission = Submission.objects.select_related(
        "assignment__faculty_course__course"
    ).prefetch_related(
        "files"
    ).get(
        submission_id=submission.submission_id
    )

    serializer = SubmissionSerializer(
        submission
    )

    return Response(
        serializer.data,
        status=status.HTTP_200_OK
    )


@api_view(["POST"])
def undo_hand_in_submission(request, assignment_id):
    if not request.user.is_authenticated:
        return Response(
            {"detail": "Authentication required."},
            status=status.HTTP_401_UNAUTHORIZED
        )

    user = request.user

    if user.role != "student":
        return Response(
            {
                "detail":
                "Only students can undo hand-in."
            },
            status=status.HTTP_403_FORBIDDEN
        )

    try:
        assignment = Assignment.objects.select_related(
            "faculty_course__course"
        ).get(
            assignment_id=assignment_id
        )

    except Assignment.DoesNotExist:
        return Response(
            {"detail": "Assignment not found."},
            status=status.HTTP_404_NOT_FOUND
        )

    if not student_has_assignment_access(
        user.student_profile,
        assignment
    ):
        return Response(
            {
                "detail":
                "You do not have access to this assignment."
            },
            status=status.HTTP_403_FORBIDDEN
        )

    try:
        submission = Submission.objects.select_related(
            "assignment__faculty_course__course"
        ).prefetch_related(
            "files"
        ).get(
            assignment=assignment,
            student=user.student_profile
        )

    except Submission.DoesNotExist:
        return Response(
            {"detail": "Submission not found."},
            status=status.HTTP_404_NOT_FOUND
        )

    if submission.status != "submitted":
        return Response(
            {
                "detail":
                "Only a handed-in submission can be undone."
            },
            status=status.HTTP_400_BAD_REQUEST
        )

    submission.status = "draft"
    submission.submitted_at = None

    submission.save(
        update_fields=[
            "status",
            "submitted_at"
        ]
    )

    submission = Submission.objects.select_related(
        "assignment__faculty_course__course"
    ).prefetch_related(
        "files"
    ).get(
        submission_id=submission.submission_id
    )

    serializer = SubmissionSerializer(
        submission
    )

    return Response(
        serializer.data,
        status=status.HTTP_200_OK
    )


@api_view(["DELETE"])
def delete_submission_file(
    request,
    assignment_id,
    submission_file_id
):
    if not request.user.is_authenticated:
        return Response(
            {"detail": "Authentication required."},
            status=status.HTTP_401_UNAUTHORIZED
        )

    user = request.user

    if user.role != "student":
        return Response(
            {
                "detail":
                "Only students can delete submission files."
            },
            status=status.HTTP_403_FORBIDDEN
        )

    try:
        assignment = Assignment.objects.select_related(
            "faculty_course__course"
        ).get(
            assignment_id=assignment_id
        )

    except Assignment.DoesNotExist:
        return Response(
            {"detail": "Assignment not found."},
            status=status.HTTP_404_NOT_FOUND
        )

    if not student_has_assignment_access(
        user.student_profile,
        assignment
    ):
        return Response(
            {
                "detail":
                "You do not have access to this assignment."
            },
            status=status.HTTP_403_FORBIDDEN
        )

    try:
        submission = Submission.objects.get(
            assignment=assignment,
            student=user.student_profile
        )

    except Submission.DoesNotExist:
        return Response(
            {"detail": "Submission not found."},
            status=status.HTTP_404_NOT_FOUND
        )

    try:
        submission_file = SubmissionFile.objects.get(
            submission=submission,
            submission_file_id=submission_file_id
        )

    except SubmissionFile.DoesNotExist:
        return Response(
            {"detail": "Submission file not found."},
            status=status.HTTP_404_NOT_FOUND
        )

    if submission.status not in ["draft", "returned"]:
        return Response(
            {
                "detail":
                "Files can only be deleted from a draft or returned submission."
            },
            status=status.HTTP_400_BAD_REQUEST
        )

    delete_cloudinary_file(
        submission_file.file_url
    )

    submission_file.delete()

    return Response(
        status=status.HTTP_204_NO_CONTENT
    )


@api_view(["GET"])
def submission_file_delivery(request, assignment_id, submission_file_id):
    if not request.user.is_authenticated:
        return Response(
            {"detail": "Authentication required."},
            status=status.HTTP_401_UNAUTHORIZED
        )

    try:
        submission_file = SubmissionFile.objects.select_related(
            "submission__student",
            "submission__assignment__faculty_course__course",
            "submission__assignment__faculty_course__faculty"
        ).get(
            submission_file_id=submission_file_id,
            submission__assignment_id=assignment_id
        )
    except SubmissionFile.DoesNotExist:
        return Response(
            {"detail": "Submission file not found."},
            status=status.HTTP_404_NOT_FOUND
        )

    submission = submission_file.submission
    assignment = submission.assignment
    user = request.user

    if user.role == "student":
        try:
            student = user.student_profile
        except Student.DoesNotExist:
            return Response(
                {"detail": "Student profile not found."},
                status=status.HTTP_404_NOT_FOUND
            )

        if (
            submission.student_id != student.id
            or not student_has_assignment_access(student, assignment)
        ):
            return Response(
                {"detail": "You do not have access to this submission file."},
                status=status.HTTP_403_FORBIDDEN
            )
    elif user.role == "faculty":
        if assignment.faculty_course.faculty != user.faculty_profile:
            return Response(
                {"detail": "You do not have access to this submission file."},
                status=status.HTTP_403_FORBIDDEN
            )
    elif user.role != "admin":
        return Response(
            {"detail": "You do not have access to this submission file."},
            status=status.HTTP_403_FORBIDDEN
        )

    return serve_cloudinary_file(
        request,
        submission_file.file_url,
        submission_file.file_name
    )


@api_view(["GET"])
def assignment_submissions(request, assignment_id):
    if not request.user.is_authenticated:
        return Response(
            {"detail": "Authentication required."},
            status=status.HTTP_401_UNAUTHORIZED
        )

    user = request.user

    if user.role != "faculty":
        return Response(
            {"detail": "Only faculty can view submissions."},
            status=status.HTTP_403_FORBIDDEN
        )

    try:
        assignment = Assignment.objects.select_related(
            "faculty_course__faculty",
            "faculty_course__course"
        ).get(
            assignment_id=assignment_id
        )

    except Assignment.DoesNotExist:
        return Response(
            {"detail": "Assignment not found."},
            status=status.HTTP_404_NOT_FOUND
        )

    if assignment.faculty_course.faculty != user.faculty_profile:
        return Response(
            {
                "detail":
                "You can only view submissions for your own assignments."
            },
            status=status.HTTP_403_FORBIDDEN
        )

    faculty_course = assignment.faculty_course
    students = Student.objects.filter(
        enrollments__course=faculty_course.course,
        year=faculty_course.year,
        sem=faculty_course.sem,
        div=faculty_course.div,
        academic_year=faculty_course.academic_year
    )

    if faculty_course.class_type == "practical":
        students = students.filter(
            batch=faculty_course.batch
        )

    students = students.distinct().order_by("roll_no")

    submissions = Submission.objects.filter(
        assignment=assignment
    ).select_related(
        "assignment__faculty_course__course",
        "student"
    ).prefetch_related(
        "files"
    ).order_by(
        "student__roll_no"
    )

    serialized_submissions = SubmissionSerializer(
        submissions,
        many=True
    ).data
    submissions_by_student = {
        submission_data["student_id"]: submission_data
        for submission_data in serialized_submissions
    }

    response_data = []
    for student in students:
        submission_data = submissions_by_student.get(student.id)
        if submission_data is not None:
            response_data.append(submission_data)
            continue

        response_data.append({
            "submission_id": None,
            "student_id": student.id,
            "student_roll_no": student.roll_no,
            "student_name": student.full_name,
            "is_late": False,
            "assignment_id": assignment.assignment_id,
            "assignment_title": assignment.title,
            "course_id": faculty_course.course.course_id,
            "course_name": faculty_course.course.course_name,
            "due_date": assignment.due_date,
            "max_marks": assignment.max_marks,
            "allow_late_submission": assignment.allow_late_submission,
            "is_active": assignment.is_active,
            "submitted_at": None,
            "status": "not_submitted",
            "marks": None,
            "feedback": "",
            "files": [],
        })

    return Response(
        response_data,
        status=status.HTTP_200_OK
    )


@api_view(["PUT"])
def grade_submission(
    request,
    assignment_id,
    submission_id
):
    if not request.user.is_authenticated:
        return Response(
            {"detail": "Authentication required."},
            status=status.HTTP_401_UNAUTHORIZED
        )

    user = request.user

    if user.role != "faculty":
        return Response(
            {"detail": "Only faculty can grade submissions."},
            status=status.HTTP_403_FORBIDDEN
        )

    try:
        submission = Submission.objects.select_related(
            "assignment__faculty_course__faculty",
            "assignment__faculty_course__course",
            "student"
        ).prefetch_related(
            "files"
        ).get(
            submission_id=submission_id,
            assignment_id=assignment_id
        )

    except Submission.DoesNotExist:
        return Response(
            {"detail": "Submission not found."},
            status=status.HTTP_404_NOT_FOUND
        )

    if submission.assignment.faculty_course.faculty != user.faculty_profile:
        return Response(
            {
                "detail":
                "You can only grade submissions for your own assignments."
            },
            status=status.HTTP_403_FORBIDDEN
        )

    if submission.status != "submitted":
        return Response(
            {
                "detail":
                "Only handed-in submissions can be graded."
            },
            status=status.HTTP_400_BAD_REQUEST
        )

    marks = request.data.get("marks")
    feedback = request.data.get("feedback")

    if marks is None or isinstance(marks, bool):
        return Response(
            {"detail": "Marks are required."},
            status=status.HTTP_400_BAD_REQUEST
        )

    try:
        numeric_marks = float(marks)
    except (TypeError, ValueError):
        return Response(
            {"detail": "Marks must be a whole number."},
            status=status.HTTP_400_BAD_REQUEST
        )

    if not numeric_marks.is_integer():
        return Response(
            {"detail": "Marks must be a whole number."},
            status=status.HTTP_400_BAD_REQUEST
        )

    marks = int(numeric_marks)

    if marks < 0 or marks > submission.assignment.max_marks:
        return Response(
            {
                "detail": (
                    f"Marks must be between 0 and "
                    f"{submission.assignment.max_marks}."
                )
            },
            status=status.HTTP_400_BAD_REQUEST
        )

    if feedback is not None and not isinstance(feedback, str):
        return Response(
            {"detail": "Feedback must be a string."},
            status=status.HTTP_400_BAD_REQUEST
        )

    submission.marks = marks
    update_fields = ["marks"]
    if feedback is not None:
        submission.feedback = feedback.strip()
        update_fields.append("feedback")

    submission.save(
        update_fields=update_fields
    )

    serializer = SubmissionSerializer(
        submission
    )

    return Response(
        serializer.data,
        status=status.HTTP_200_OK
    )


@api_view(["POST"])
def return_submission(request, assignment_id, submission_id):
    if not request.user.is_authenticated:
        return Response(
            {"detail": "Authentication required."},
            status=status.HTTP_401_UNAUTHORIZED
        )

    user = request.user

    if user.role != "faculty":
        return Response(
            {"detail": "Only faculty can return submissions."},
            status=status.HTTP_403_FORBIDDEN
        )

    try:
        submission = Submission.objects.select_related(
            "assignment__faculty_course__faculty",
            "assignment__faculty_course__course",
            "student"
        ).prefetch_related(
            "files"
        ).get(
            submission_id=submission_id,
            assignment_id=assignment_id
        )

    except Submission.DoesNotExist:
        return Response(
            {"detail": "Submission not found."},
            status=status.HTTP_404_NOT_FOUND
        )

    if submission.assignment.faculty_course.faculty != user.faculty_profile:
        return Response(
            {
                "detail":
                "You can only return submissions for your own assignments."
            },
            status=status.HTTP_403_FORBIDDEN
        )

    if submission.status != "submitted":
        return Response(
            {
                "detail":
                "Only handed-in submissions can be returned."
            },
            status=status.HTTP_400_BAD_REQUEST
        )

    if submission.marks is None:
        return Response(
            {
                "detail": "Save marks before returning the submission."
            },
            status=status.HTTP_400_BAD_REQUEST
        )

    submission.status = "returned"

    submission.save(
        update_fields=["status"]
    )

    serializer = SubmissionSerializer(
        submission
    )

    return Response(
        serializer.data,
        status=status.HTTP_200_OK
    )


@api_view(["GET"])
def student_results(request):
    if not request.user.is_authenticated:
        return Response(
            {"detail": "Authentication required."},
            status=status.HTTP_401_UNAUTHORIZED
        )

    user = request.user

    if user.role != "student":
        return Response(
            {"detail": "Only students can view results."},
            status=status.HTTP_403_FORBIDDEN
        )

    semester_results = (
        SemesterResult.objects
        .filter(
            student=user.student_profile
        )
        .prefetch_related(
            Prefetch(
                "results",
                queryset=Result.objects.select_related("course")
            )
        )
        .order_by("-academic_year", "-sem")
    )

    serializer = SemesterResultSerializer(
        semester_results,
        many=True
    )

    return Response(
        serializer.data,
        status=status.HTTP_200_OK
    )


@api_view(["GET"])
def admin_results(request):
    if not request.user.is_authenticated:
        return Response(
            {"detail": "Authentication required."},
            status=status.HTTP_401_UNAUTHORIZED
        )

    user = request.user

    if user.role != "admin":
        return Response(
            {"detail": "Only admin can access student results."},
            status=status.HTTP_403_FORBIDDEN
        )

    semester_results = (
        SemesterResult.objects
        .select_related("student")
        .prefetch_related(
            Prefetch(
                "results",
                queryset=Result.objects.select_related("course")
            )
        )
        .order_by(
            "-academic_year",
            "-sem",
            "student__roll_no"
        )
    )

    academic_year = request.query_params.get("academic_year")
    semester = request.query_params.get("semester", request.query_params.get("sem"))
    year = request.query_params.get("year")
    division = request.query_params.get("division", request.query_params.get("div"))
    branch = request.query_params.get("branch", request.query_params.get("department"))
    course = request.query_params.get("course")
    student_id = request.query_params.get("student")
    search = request.query_params.get("search", "").strip()

    if academic_year:
        semester_results = semester_results.filter(
            academic_year=academic_year
        )
    for value, field, label in (
        (semester, "sem", "semester"),
        (year, "student__year", "year"),
    ):
        if value:
            try:
                semester_results = semester_results.filter(
                    **{field: int(value)}
                )
            except (TypeError, ValueError):
                return Response(
                    {"detail": f"{label} must be a valid integer."},
                    status=status.HTTP_400_BAD_REQUEST
                )
    if division:
        semester_results = semester_results.filter(
            student__div__iexact=division
        )
    if branch:
        branch_query = Q(student__branch__iexact=branch)
        if branch.isdigit():
            branch_query |= Q(student__department_id=int(branch))
        else:
            branch_query |= (
                Q(student__department__department_code__iexact=branch)
                | Q(student__department__department_name__iexact=branch)
            )
        semester_results = semester_results.filter(branch_query)
    if course:
        semester_results = semester_results.filter(
            results__course_id=course
        )
    if student_id:
        semester_results = semester_results.filter(
            student_id=student_id
        )
    if search:
        semester_results = semester_results.filter(
            Q(student__full_name__icontains=search)
            | Q(student__roll_no__icontains=search)
        )
    semester_results = semester_results.distinct()

    serializer = SemesterResultSerializer(
        semester_results,
        many=True
    )

    return Response(
        serializer.data,
        status=status.HTTP_200_OK
    )


@api_view(["POST", "PUT", "PATCH"])
def manage_semester_result(request, semester_result_id=None):
    if not request.user.is_authenticated:
        return Response(
            {"detail": "Authentication required."},
            status=status.HTTP_401_UNAUTHORIZED
        )

    if request.user.role != "admin":
        return Response(
            {"detail": "Only admin can manage student results."},
            status=status.HTTP_403_FORBIDDEN
        )

    if semester_result_id is None:
        serializer = SemesterResultSerializer(
            data=request.data
        )

        if not serializer.is_valid():
            return Response(
                serializer.errors,
                status=status.HTTP_400_BAD_REQUEST
            )

        semester_result = serializer.save()

        return Response(
            SemesterResultSerializer(semester_result).data,
            status=status.HTTP_201_CREATED
        )

    try:
        semester_result = SemesterResult.objects.get(
            semester_result_id=semester_result_id
        )
    except SemesterResult.DoesNotExist:
        return Response(
            {"detail": "Semester result not found."},
            status=status.HTTP_404_NOT_FOUND
        )

    if semester_result.is_published:
        return Response(
            {"detail": "Published results cannot be edited."},
            status=status.HTTP_400_BAD_REQUEST
        )

    serializer = SemesterResultSerializer(
        semester_result,
        data=request.data,
        partial=True
    )

    if not serializer.is_valid():
        return Response(
            serializer.errors,
            status=status.HTTP_400_BAD_REQUEST
        )

    semester_result = serializer.save()

    return Response(
        SemesterResultSerializer(semester_result).data,
        status=status.HTTP_200_OK
    )


#individual subjects results management
@api_view(["POST", "PUT", "PATCH"])
def manage_result(request, semester_result_id, result_id=None):
    if not request.user.is_authenticated:
        return Response(
            {"detail": "Authentication required."},
            status=status.HTTP_401_UNAUTHORIZED
        )

    if request.user.role != "admin":
        return Response(
            {"detail": "Only admin can manage student results."},
            status=status.HTTP_403_FORBIDDEN
        )

    try:
        semester_result = SemesterResult.objects.get(
            semester_result_id=semester_result_id
        )
    except SemesterResult.DoesNotExist:
        return Response(
            {"detail": "Semester result not found."},
            status=status.HTTP_404_NOT_FOUND
        )

    if semester_result.is_published:
        return Response(
            {"detail": "Published results cannot be edited."},
            status=status.HTTP_400_BAD_REQUEST
        )

    if result_id is None:
        serializer = ResultSerializer(
            data=request.data
        )

        if not serializer.is_valid():
            return Response(
                serializer.errors,
                status=status.HTTP_400_BAD_REQUEST
            )

        result = serializer.save(
            semester_result=semester_result
        )

        return Response(
            ResultSerializer(result).data,
            status=status.HTTP_201_CREATED
        )

    try:
        result = Result.objects.get(
            result_id=result_id,
            semester_result=semester_result
        )
    except Result.DoesNotExist:
        return Response(
            {"detail": "Result not found."},
            status=status.HTTP_404_NOT_FOUND
        )

    serializer = ResultSerializer(
        result,
        data=request.data,
        partial=True
    )

    if not serializer.is_valid():
        return Response(
            serializer.errors,
            status=status.HTTP_400_BAD_REQUEST
        )

    result = serializer.save()

    return Response(
        ResultSerializer(result).data,
        status=status.HTTP_200_OK
    )


@api_view(["POST"])
def publish_semester_results(request):
    if not request.user.is_authenticated:
        return Response(
            {"detail": "Authentication required."},
            status=status.HTTP_401_UNAUTHORIZED
        )

    if request.user.role != "admin":
        return Response(
            {"detail": "Only admin can publish student results."},
            status=status.HTTP_403_FORBIDDEN
        )

    academic_year = request.data.get("academic_year")
    sem = request.data.get("sem")

    if not academic_year or sem is None:
        return Response(
            {
                "detail": "academic_year and sem are required."
            },
            status=status.HTTP_400_BAD_REQUEST
        )

    try:
        sem = int(sem)
    except (TypeError, ValueError):
        return Response(
            {"detail": "sem must be a valid number."},
            status=status.HTTP_400_BAD_REQUEST
        )

    semester_results = SemesterResult.objects.filter(
        academic_year=academic_year,
        sem=sem
    )

    if not semester_results.exists():
        return Response(
            {
                "detail": (
                    "No semester results found for the given "
                    "academic_year and sem."
                )
            },
            status=status.HTTP_404_NOT_FOUND
        )

    if semester_results.filter(is_published=False).count() == 0:
        return Response(
            {
                "detail": "Results for this semester are already published."
            },
            status=status.HTTP_400_BAD_REQUEST
        )

    published_at = timezone.now()

    updated_count = semester_results.filter(
        is_published=False
    ).update(
        is_published=True,
        published_at=published_at
    )

    return Response(
        {
            "detail": "Semester results published successfully.",
            "academic_year": academic_year,
            "sem": sem,
            "published_count": updated_count,
            "published_at": published_at,
        },
        status=status.HTTP_200_OK
    )


@api_view(["GET", "POST", "PUT", "PATCH", "DELETE"])
def academic_calendar(request, calendar_id=None):
    if not request.user.is_authenticated:
        return Response(
            {"detail": "Authentication required."},
            status=status.HTTP_401_UNAUTHORIZED
        )

    user = request.user

    if user.role not in ["student", "faculty", "admin"]:
        return Response(
            {"detail": "You do not have permission to access the academic calendar."},
            status=status.HTTP_403_FORBIDDEN
        )

    if request.method == "GET":
        if calendar_id is not None:
            try:
                calendar_entry = AcademicCalendar.objects.get(
                    calendar_id=calendar_id
                )
            except AcademicCalendar.DoesNotExist:
                return Response(
                    {"detail": "Calendar entry not found."},
                    status=status.HTTP_404_NOT_FOUND
                )

            serializer = AcademicCalendarSerializer(calendar_entry)

            return Response(
                serializer.data,
                status=status.HTTP_200_OK
            )

        filter_serializer = AcademicCalendarFilterSerializer(
            data=request.query_params
        )
        filter_serializer.is_valid(raise_exception=True)
        filters = filter_serializer.validated_data
        calendar_entries = AcademicCalendar.objects.all()
        if "academic_year" in filters:
            calendar_entries = calendar_entries.filter(
                academic_year=filters["academic_year"]
            )
        if "semester" in filters:
            calendar_entries = calendar_entries.filter(
                models.Q(semester=filters["semester"])
                | models.Q(semester__isnull=True)
            )
        if "category" in filters:
            calendar_entries = calendar_entries.filter(
                category=filters["category"]
            )
        if "start_date" in filters:
            calendar_entries = calendar_entries.filter(
                end_date__gte=filters["start_date"]
            )
        if "end_date" in filters:
            calendar_entries = calendar_entries.filter(
                start_date__lte=filters["end_date"]
            )

        serializer = AcademicCalendarSerializer(
            calendar_entries,
            many=True
        )

        return Response(
            serializer.data,
            status=status.HTTP_200_OK
        )

    if user.role != "admin":
        return Response(
            {"detail": "Only admin can modify the academic calendar."},
            status=status.HTTP_403_FORBIDDEN
        )

    # Create
    if request.method == "POST":
        serializer = AcademicCalendarSerializer(
            data=request.data
        )

        if not serializer.is_valid():
            return Response(
                serializer.errors,
                status=status.HTTP_400_BAD_REQUEST
            )

        calendar_entry = serializer.save()

        return Response(
            AcademicCalendarSerializer(calendar_entry).data,
            status=status.HTTP_201_CREATED
        )

    # Update
    if request.method in ["PUT", "PATCH"]:
        if calendar_id is None:
            return Response(
                {"detail": "calendar_id is required for update."},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            calendar_entry = AcademicCalendar.objects.get(
                calendar_id=calendar_id
            )
        except AcademicCalendar.DoesNotExist:
            return Response(
                {"detail": "Calendar entry not found."},
                status=status.HTTP_404_NOT_FOUND
            )

        serializer = AcademicCalendarSerializer(
            calendar_entry,
            data=request.data,
            partial=(request.method == "PATCH")
        )

        if not serializer.is_valid():
            return Response(
                serializer.errors,
                status=status.HTTP_400_BAD_REQUEST
            )

        calendar_entry = serializer.save()

        return Response(
            AcademicCalendarSerializer(calendar_entry).data,
            status=status.HTTP_200_OK
        )

    # Delete
    if request.method == "DELETE":
        if calendar_id is None:
            return Response(
                {"detail": "calendar_id is required for deletion."},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            calendar_entry = AcademicCalendar.objects.get(
                calendar_id=calendar_id
            )
        except AcademicCalendar.DoesNotExist:
            return Response(
                {"detail": "Calendar entry not found."},
                status=status.HTTP_404_NOT_FOUND
            )

        calendar_entry.delete()

        return Response(
            status=status.HTTP_204_NO_CONTENT
        )


@api_view(["GET", "POST", "PUT", "PATCH", "DELETE"])
def admin_departments(request, department_id=None):
    if not request.user.is_authenticated:
        return Response(
            {"detail": "Authentication required."},
            status=status.HTTP_401_UNAUTHORIZED
        )

    if request.user.role != "admin":
        return Response(
            {"detail": "Only admin can manage departments."},
            status=status.HTTP_403_FORBIDDEN
        )

    if request.method == "GET":
        if department_id is not None:
            try:
                department = Department.objects.get(
                    department_id=department_id
                )
            except Department.DoesNotExist:
                return Response(
                    {"detail": "Department not found."},
                    status=status.HTTP_404_NOT_FOUND
                )

            serializer = DepartmentSerializer(department)

            return Response(
                serializer.data,
                status=status.HTTP_200_OK
            )

        departments = Department.objects.all().order_by(
            "department_name"
        )

        serializer = DepartmentSerializer(
            departments,
            many=True
        )

        return Response(
            serializer.data,
            status=status.HTTP_200_OK
        )

    if request.method == "POST":
        serializer = DepartmentSerializer(
            data=request.data
        )

        if not serializer.is_valid():
            return Response(
                serializer.errors,
                status=status.HTTP_400_BAD_REQUEST
            )

        department = serializer.save()

        return Response(
            DepartmentSerializer(department).data,
            status=status.HTTP_201_CREATED
        )

    if department_id is None:
        return Response(
            {"detail": "department_id is required."},
            status=status.HTTP_400_BAD_REQUEST
        )

    try:
        department = Department.objects.get(
            department_id=department_id
        )
    except Department.DoesNotExist:
        return Response(
            {"detail": "Department not found."},
            status=status.HTTP_404_NOT_FOUND
        )

    if request.method in ["PUT", "PATCH"]:
        serializer = DepartmentSerializer(
            department,
            data=request.data,
            partial=(request.method == "PATCH")
        )

        if not serializer.is_valid():
            return Response(
                serializer.errors,
                status=status.HTTP_400_BAD_REQUEST
            )

        department = serializer.save()

        return Response(
            DepartmentSerializer(department).data,
            status=status.HTTP_200_OK
        )

    if request.method == "DELETE":
        try:
            department.delete()
        except models.ProtectedError:
            return Response(
                {
                    "detail": (
                        "Department cannot be deleted because it is "
                        "being used by students, faculty, or courses."
                    )
                },
                status=status.HTTP_400_BAD_REQUEST
            )

        return Response(
            status=status.HTTP_204_NO_CONTENT
        )


@api_view(["GET", "POST", "PUT", "PATCH", "DELETE"])
def admin_courses(request, course_id=None):
    if not request.user.is_authenticated:
        return Response(
            {"detail": "Authentication required."},
            status=status.HTTP_401_UNAUTHORIZED
        )

    if request.user.role != "admin":
        return Response(
            {"detail": "Only admin can manage courses."},
            status=status.HTTP_403_FORBIDDEN
        )

    if request.method == "GET":
        if course_id is not None:
            try:
                course = Course.objects.select_related(
                    "department"
                ).get(
                    course_id=course_id
                )
            except Course.DoesNotExist:
                return Response(
                    {"detail": "Course not found."},
                    status=status.HTTP_404_NOT_FOUND
                )

            serializer = CourseSerializer(course)

            return Response(
                serializer.data,
                status=status.HTTP_200_OK
            )

        courses = Course.objects.select_related(
            "department"
        ).order_by(
            "course_sem",
            "course_name"
        )

        serializer = CourseSerializer(
            courses,
            many=True
        )

        return Response(
            serializer.data,
            status=status.HTTP_200_OK
        )

    if request.method == "POST":
        serializer = CourseSerializer(
            data=request.data
        )

        if not serializer.is_valid():
            return Response(
                serializer.errors,
                status=status.HTTP_400_BAD_REQUEST
            )

        course = serializer.save()

        return Response(
            CourseSerializer(course).data,
            status=status.HTTP_201_CREATED
        )

    if course_id is None:
        return Response(
            {"detail": "course_id is required."},
            status=status.HTTP_400_BAD_REQUEST
        )

    try:
        course = Course.objects.get(
            course_id=course_id
        )
    except Course.DoesNotExist:
        return Response(
            {"detail": "Course not found."},
            status=status.HTTP_404_NOT_FOUND
        )

    if request.method in ["PUT", "PATCH"]:
        serializer = CourseSerializer(
            course,
            data=request.data,
            partial=(request.method == "PATCH")
        )

        if not serializer.is_valid():
            return Response(
                serializer.errors,
                status=status.HTTP_400_BAD_REQUEST
            )

        course = serializer.save()

        return Response(
            CourseSerializer(course).data,
            status=status.HTTP_200_OK
        )

    if request.method == "DELETE":
        try:
            course.delete()
        except models.ProtectedError:
            return Response(
                {
                    "detail": (
                        "Course cannot be deleted because it is "
                        "being used by faculty assignments, enrollments, "
                        "results, timetable, resources, or assignments."
                    )
                },
                status=status.HTTP_400_BAD_REQUEST
            )

        return Response(
            status=status.HTTP_204_NO_CONTENT
        )


@api_view(["GET", "POST", "PUT", "PATCH", "DELETE"])
def admin_faculty_courses(request, faculty_course_id=None):
    if not request.user.is_authenticated:
        return Response(
            {"detail": "Authentication required."},
            status=status.HTTP_401_UNAUTHORIZED
        )

    if request.user.role != "admin":
        return Response(
            {"detail": "Only admin can manage faculty assignments."},
            status=status.HTTP_403_FORBIDDEN
        )

    if request.method == "GET":
        queryset = FacultyCourse.objects.select_related(
            "faculty",
            "course",
            "course__department"
        )

        if faculty_course_id is not None:
            try:
                faculty_course = queryset.get(
                    faculty_course_id=faculty_course_id
                )
            except FacultyCourse.DoesNotExist:
                return Response(
                    {"detail": "Faculty course assignment not found."},
                    status=status.HTTP_404_NOT_FOUND
                )

            serializer = FacultyCourseSerializer(faculty_course)

            return Response(
                serializer.data,
                status=status.HTTP_200_OK
            )

        faculty_courses = queryset.order_by(
            "year",
            "sem",
            "div",
            "course__course_name"
        )

        serializer = FacultyCourseSerializer(
            faculty_courses,
            many=True
        )

        return Response(
            serializer.data,
            status=status.HTTP_200_OK
        )

    if request.method == "POST":
        serializer = FacultyCourseSerializer(
            data=request.data
        )

        if not serializer.is_valid():
            return Response(
                serializer.errors,
                status=status.HTTP_400_BAD_REQUEST
            )

        faculty_course = serializer.save()

        return Response(
            FacultyCourseSerializer(faculty_course).data,
            status=status.HTTP_201_CREATED
        )

    if faculty_course_id is None:
        return Response(
            {"detail": "faculty_course_id is required."},
            status=status.HTTP_400_BAD_REQUEST
        )

    try:
        faculty_course = FacultyCourse.objects.get(
            faculty_course_id=faculty_course_id
        )
    except FacultyCourse.DoesNotExist:
        return Response(
            {"detail": "Faculty course assignment not found."},
            status=status.HTTP_404_NOT_FOUND
        )

    if request.method in ["PUT", "PATCH"]:
        serializer = FacultyCourseSerializer(
            faculty_course,
            data=request.data,
            partial=(request.method == "PATCH")
        )

        if not serializer.is_valid():
            return Response(
                serializer.errors,
                status=status.HTTP_400_BAD_REQUEST
            )

        faculty_course = serializer.save()

        return Response(
            FacultyCourseSerializer(faculty_course).data,
            status=status.HTTP_200_OK
        )

    if request.method == "DELETE":
        faculty_course.delete()

        return Response(
            status=status.HTTP_204_NO_CONTENT
        )


@api_view(["GET"])
def admin_dashboard(request):
    if not request.user.is_authenticated:
        return Response(
            {"error": "Authentication required."},
            status=status.HTTP_401_UNAUTHORIZED
        )

    if request.user.role != "admin":
        return Response(
            {"error": "Admin access required."},
            status=status.HTTP_403_FORBIDDEN
        )

    return Response({
        "total_students": Student.objects.count(),
        "total_faculty": Faculty.objects.count(),
        "total_departments": Department.objects.count(),
        "active_courses": Course.objects.count(),
    })


@api_view(["GET"])
def student_dashboard(request):
    if not request.user.is_authenticated:
        return Response(
            {"error": "Authentication required."},
            status=status.HTTP_401_UNAUTHORIZED
        )

    try:
        student = request.user.student_profile
    except Student.DoesNotExist:
        return Response(
            {"error": "Student profile not found."},
            status=status.HTTP_404_NOT_FOUND
        )

    # Attendance
    attendance_records = Attendance.objects.filter(
        student=student
    )

    total_attendance = attendance_records.count()
    present_attendance = attendance_records.filter(
        status="present"
    ).count()

    attendance_percentage = (
        round((present_attendance / total_attendance) * 100, 2)
        if total_attendance > 0
        else 0
    )

    # Pending assignments
    now = timezone.now()

    pending_assignments = Assignment.objects.filter(
        faculty_course__course__enrollments__student=student,
        is_active=True,
        due_date__gte=now
    ).exclude(
        submissions__student=student,
        submissions__status="submitted"
    ).distinct().count()

    # Latest published CGPA
    latest_result = SemesterResult.objects.filter(
        student=student,
        is_published=True
    ).order_by("-semester_result_id").first()

    cgpa = latest_result.cgpa if latest_result else None

    # Today's timetable
    today = timezone.localdate()
    today_name = today.strftime("%A")

    today_schedule = Timetable.objects.filter(
        faculty_course__year=student.year,
        faculty_course__sem=student.sem,
        faculty_course__div=student.div,
        faculty_course__academic_year=student.academic_year
    ).filter(
        Q(
            faculty_course__class_type="lecture",
            faculty_course__batch__isnull=True
        )
        |
        Q(
            faculty_course__class_type="practical",
            faculty_course__batch=student.batch
        )
    ).filter(
        faculty_course__course__enrollments__student=student,
        day=today_name
    ).select_related(
        "faculty_course__course",
        "faculty_course__faculty",
        "room"
    ).order_by("start_time").distinct()

    schedule_data = TimetableSerializer(
        today_schedule,
        many=True
    ).data

    # Upcoming assignments
    upcoming_assignments = Assignment.objects.filter(
        faculty_course__course__enrollments__student=student,
        is_active=True,
        due_date__gte=now
    ).select_related(
        "faculty_course__course"
    ).order_by("due_date").distinct()[:5]

    upcoming_assignments_data = [
        {
            "assignment_id": assignment.assignment_id,
            "title": assignment.title,
            "course_id": assignment.faculty_course.course.course_id,
            "course_name": assignment.faculty_course.course.course_name,
            "due_date": assignment.due_date,
            "max_marks": assignment.max_marks,
        }
        for assignment in upcoming_assignments
    ]

    return Response({
        "attendance": attendance_percentage,
        "pending_assignments": pending_assignments,
        "cgpa": cgpa,
        "today_schedule": schedule_data,
        "upcoming_assignments": upcoming_assignments_data,
    })


@api_view(["GET"])
def faculty_dashboard(request):
    if not request.user.is_authenticated:
        return Response(
            {"error": "Authentication required."},
            status=status.HTTP_401_UNAUTHORIZED
        )

    try:
        faculty = request.user.faculty_profile
    except Faculty.DoesNotExist:
        return Response(
            {"error": "Faculty profile not found."},
            status=status.HTTP_404_NOT_FOUND
        )

    # Courses currently assigned to the faculty
    courses_teaching = FacultyCourse.objects.filter(
        faculty=faculty
    ).values("course").distinct().count()

    # Today's schedule
    today = timezone.localdate()
    today_name = today.strftime("%A")

    today_schedule = Timetable.objects.filter(
        faculty_course__faculty=faculty,
        day=today_name
    ).select_related(
        "faculty_course__course",
        "room"
    ).order_by(
        "start_time"
    )

    schedule_data = TimetableSerializer(
        today_schedule,
        many=True
    ).data

    # Pending assignment reviews
    pending_reviews = Submission.objects.filter(
        assignment__faculty_course__faculty=faculty,
        status="submitted",
        marks__isnull=True
    ).count()

    # Average attendance
    attendance_records = Attendance.objects.filter(
        timetable__faculty_course__faculty=faculty
    )

    total_attendance = attendance_records.count()
    present_attendance = attendance_records.filter(
        status="present"
    ).count()

    average_attendance = (
        round((present_attendance / total_attendance) * 100, 2)
        if total_attendance > 0
        else 0
    )

    # Pending reviews grouped by course
    pending_by_course = (
        Submission.objects.filter(
            assignment__faculty_course__faculty=faculty,
            status="submitted",
            marks__isnull=True
        )
        .values(
            "assignment__faculty_course__course__course_id",
            "assignment__faculty_course__course__course_name"
        )
        .annotate(
            pending_count=models.Count("submission_id")
        )
        .order_by(
            "assignment__faculty_course__course__course_id"
        )
    )

    pending_reviews_by_course = [
        {
            "course_id": item[
                "assignment__faculty_course__course__course_id"
            ],
            "course_name": item[
                "assignment__faculty_course__course__course_name"
            ],
            "pending_reviews": item["pending_count"],
        }
        for item in pending_by_course
    ]

    return Response({
        "courses_teaching": courses_teaching,
        "classes_today": today_schedule.count(),
        "pending_reviews": pending_reviews,
        "average_attendance": average_attendance,
        "today_schedule": schedule_data,
        "pending_reviews_by_course": pending_reviews_by_course,
    })

@api_view(["GET"])
def faculty_student_performance(request):
    if not request.user.is_authenticated:
        return Response(
            {"error": "Authentication required."},
            status=status.HTTP_401_UNAUTHORIZED
        )

    if request.user.role != "faculty":
        return Response(
            {"error": "Only faculty can access student performance."},
            status=status.HTTP_403_FORBIDDEN
        )

    try:
        faculty = request.user.faculty_profile
    except Faculty.DoesNotExist:
        return Response(
            {"error": "Faculty profile not found."},
            status=status.HTTP_404_NOT_FOUND
        )

    faculty_courses = FacultyCourse.objects.filter(
        faculty=faculty
    ).select_related("course")

    students = Student.objects.filter(
        year__in=faculty_courses.values("year"),
        sem__in=faculty_courses.values("sem"),
        div__in=faculty_courses.values("div"),
        academic_year__in=faculty_courses.values("academic_year"),
        enrollments__course__faculty_courses__faculty=faculty
    ).distinct().order_by("roll_no")

    performance = []

    for student in students:
        student_faculty_courses = faculty_courses.filter(
            year=student.year,
            sem=student.sem,
            div=student.div,
            academic_year=student.academic_year
        )

        if not student_faculty_courses.exists():
            continue

        # Attendance
        attendance_records = Attendance.objects.filter(
            student=student,
            timetable__faculty_course__in=student_faculty_courses
        )

        total_attendance = attendance_records.count()
        present_attendance = attendance_records.filter(
            status="present"
        ).count()

        attendance_pct = (
            round((present_attendance / total_attendance) * 100)
            if total_attendance > 0
            else 100
        )

        # Assignments
        assignments_qs = Assignment.objects.filter(
            faculty_course__in=student_faculty_courses,
            is_active=True
        )

        total_assignments = assignments_qs.count()

        submissions = Submission.objects.filter(
            assignment__in=assignments_qs,
            student=student
        )

        completed = submissions.filter(
            status__in=["submitted", "returned"]
        ).count()

        graded = submissions.filter(
            marks__isnull=False
        )

        graded_count = graded.count()

        if graded_count > 0:
            avg_marks = round(
                sum(
                    (submission.marks or 0)
                    / submission.assignment.max_marks
                    * 100
                    for submission in graded
                ) / graded_count
            )
        else:
            avg_marks = 0

        has_grades = graded_count > 0

        if (
            attendance_pct < 65
            or (has_grades and avg_marks < 60)
        ):
            student_status = "alert"
        elif (
            attendance_pct < 75
            or (has_grades and avg_marks < 70)
        ):
            student_status = "warn"
        else:
            student_status = "good"

        performance.append({
            "id": str(student.user.id),
            "name": student.full_name,
            "rollNo": student.roll_no,
            "attendancePct": attendance_pct,
            "avgMarks": avg_marks,
            "completed": completed,
            "total": total_assignments,
            "status": student_status,
            "hasGrades": has_grades,
        })

    # Course averages
    course_averages = []

    for faculty_course in faculty_courses:
        assignments_qs = Assignment.objects.filter(
            faculty_course=faculty_course,
            is_active=True
        )

        graded = Submission.objects.filter(
            assignment__in=assignments_qs,
            marks__isnull=False
        ).select_related("assignment")

        if graded.exists():
            avg = round(
                sum(
                    (submission.marks or 0)
                    / submission.assignment.max_marks
                    * 100
                    for submission in graded
                ) / graded.count()
            )
        else:
            avg = 0

        course_averages.append({
            "label": faculty_course.course.course_id,
            "value": avg,
            "color": "#2563EB",
        })

    # Attendance distribution
    attendance_buckets = []

    buckets = [
        ("≥ 90%", 90, 101, "#16A34A"),
        ("75–89%", 75, 90, "#2563EB"),
        ("60–74%", 60, 75, "#F97316"),
        ("< 60%", 0, 60, "#DC2626"),
    ]

    total_students = len(performance)

    for label, minimum, maximum, color in buckets:
        count = sum(
            1
            for student in performance
            if minimum <= student["attendancePct"] < maximum
        )

        pct = (
            round((count / total_students) * 100)
            if total_students > 0
            else 0
        )

        attendance_buckets.append({
            "label": label,
            "min": minimum,
            "val": count,
            "pct": pct,
            "color": color,
        })

    return Response({
        "students": performance,
        "courseAverages": course_averages,
        "attendanceBuckets": attendance_buckets,
    })