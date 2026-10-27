from django.db.models import Avg, Count, F, Q, Sum
from django.utils import timezone
from django.utils.dateparse import parse_date

from apps.academics.models import (
    AcademicCalendar,
    Assignment,
    Attendance,
    Course,
    Department,
    Enrollment,
    FacultyCourse,
    Result,
    SemesterResult,
    Submission,
    Timetable,
)
from apps.events.models import Event, EventRegistration
from apps.library.models import Book, Borrow
from apps.notices.models import Notice
from apps.users.models import Faculty, Student


def _paginate(queryset, filters):
    page = filters["page"]
    page_size = filters["page_size"]
    total = queryset.count()
    start = (page - 1) * page_size
    items = list(queryset[start:start + page_size])
    return {
        "count": total,
        "page": page,
        "page_size": page_size,
        "has_next": start + page_size < total,
        "records": items,
    }


def _filter_students(queryset, filters, prefix=""):
    if filters.get("branch"):
        branch = filters["branch"]
        queryset = queryset.filter(
            Q(**{f"{prefix}branch__iexact": branch})
            | Q(**{f"{prefix}department__department_code__iexact": branch})
            | Q(**{f"{prefix}department__department_name__iexact": branch})
        )
    for filter_name, field_name in [
        ("year", "year"),
        ("semester", "sem"),
        ("division", "div"),
    ]:
        if filters.get(filter_name) is not None:
            queryset = queryset.filter(
                **{f"{prefix}{field_name}": filters[filter_name]}
            )
    return queryset


def _filter_faculty_courses(queryset, filters, prefix=""):
    if filters.get("branch"):
        branch = filters["branch"]
        queryset = queryset.filter(
            Q(**{f"{prefix}course__department__department_code__iexact": branch})
            | Q(**{f"{prefix}course__department__department_name__iexact": branch})
        )
    if filters.get("year") is not None:
        queryset = queryset.filter(
            **{f"{prefix}year": filters["year"]}
        )
    if filters.get("semester") is not None:
        queryset = queryset.filter(
            **{f"{prefix}sem": filters["semester"]}
        )
    if filters.get("division"):
        queryset = queryset.filter(
            **{f"{prefix}div__iexact": filters["division"]}
        )
    if filters.get("course"):
        queryset = queryset.filter(
            **{f"{prefix}course__course_id__iexact": filters["course"]}
        )
    if filters.get("faculty"):
        queryset = queryset.filter(
            **{f"{prefix}faculty__faculty_id__iexact": filters["faculty"]}
        )
    return queryset


def _filter_course(queryset, filters, prefix=""):
    if filters.get("course"):
        queryset = queryset.filter(
            **{f"{prefix}course__course_id__iexact": filters["course"]}
        )
    return queryset


def overview_report(filters=None):
    return {
        "total_students": Student.objects.count(),
        "total_faculty": Faculty.objects.count(),
        "total_courses": Course.objects.count(),
        "total_departments": Department.objects.count(),
        "total_books": Book.objects.count(),
        "total_events": Event.objects.count(),
        "total_notices": Notice.objects.count(),
    }


def students_report(filters):
    queryset = Student.objects.select_related(
        "user",
        "department",
    ).prefetch_related(
        "enrollments__course",
    )
    queryset = _filter_students(queryset, filters)

    if filters.get("course"):
        queryset = queryset.filter(
            enrollments__course__course_id__iexact=filters["course"]
        ).distinct()

    queryset = queryset.order_by("roll_no")
    page = filters["page"]
    page_size = filters["page_size"]
    count = queryset.count()
    students = queryset[(page - 1) * page_size:page * page_size]
    records = []
    for student in students:
        records.append({
            "name": student.full_name,
            "roll_number": student.roll_no,
            "branch": student.branch,
            "department": student.department.department_name,
            "department_code": student.department.department_code,
            "year": student.year,
            "semester": student.sem,
            "division": student.div,
            "email": student.user.email,
            "enrolled_courses": [
                {
                    "course_id": enrollment.course.course_id,
                    "course_name": enrollment.course.course_name,
                    "semester": enrollment.course.course_sem,
                }
                for enrollment in student.enrollments.all()
            ],
        })

    return {
        "count": count,
        "page": page,
        "page_size": page_size,
        "has_next": page * page_size < count,
        "records": records,
    }


def attendance_report(filters):
    queryset = Attendance.objects.select_related(
        "student__department",
        "timetable__faculty_course__course__department",
        "timetable__faculty_course__faculty",
    )
    queryset = _filter_students(queryset, filters, "student__")
    queryset = _filter_faculty_courses(
        queryset,
        filters,
        "timetable__faculty_course__",
    )
    if filters.get("date_from"):
        queryset = queryset.filter(date__gte=filters["date_from"])
    if filters.get("date_to"):
        queryset = queryset.filter(date__lte=filters["date_to"])

    totals = queryset.aggregate(
        total_classes=Count("attendance_id"),
        attended_classes=Count(
            "attendance_id",
            filter=Q(status="present"),
        ),
        absent_classes=Count(
            "attendance_id",
            filter=Q(status="absent"),
        ),
    )
    total_classes = totals["total_classes"]
    attended_classes = totals["attended_classes"]
    attendance_percentage = (
        round(attended_classes * 100 / total_classes, 2)
        if total_classes
        else 0
    )

    grouped = queryset.values(
        "student__roll_no",
        "student__full_name",
        "student__branch",
        "student__year",
        "student__sem",
        "student__div",
        course_id=F("timetable__faculty_course__course__course_id"),
        course_name=F("timetable__faculty_course__course__course_name"),
    ).annotate(
        total_classes=Count("attendance_id"),
        attended_classes=Count(
            "attendance_id",
            filter=Q(status="present"),
        ),
        absent_classes=Count(
            "attendance_id",
            filter=Q(status="absent"),
        ),
    ).order_by(
        "student__roll_no",
        "timetable__faculty_course__course__course_id",
    )
    page = _paginate(grouped, filters)
    for record in page["records"]:
        total = record["total_classes"]
        record["attendance_percentage"] = (
            round(record["attended_classes"] * 100 / total, 2)
            if total
            else 0
        )

    return {
        "summary": {
            **totals,
            "attendance_percentage": attendance_percentage,
        },
        **page,
    }


def results_report(filters):
    queryset = Result.objects.select_related(
        "course__department",
        "semester_result__student__user",
        "semester_result__student__department",
    )
    queryset = _filter_students(
        queryset,
        filters,
        "semester_result__student__",
    )
    if filters.get("semester") is not None:
        queryset = queryset.filter(
            semester_result__sem=filters["semester"]
        )
    queryset = _filter_course(queryset, filters)

    summary = queryset.aggregate(
        result_count=Count("result_id"),
        average_marks=Avg("total_marks"),
    )
    summary["average_marks"] = (
        round(summary["average_marks"], 2)
        if summary["average_marks"] is not None
        else None
    )
    result_values = queryset.order_by(
        "semester_result__student__roll_no",
        "course__course_id",
    ).values(
        "result_id",
        "semester_result__student__full_name",
        "semester_result__student__roll_no",
        "semester_result__student__branch",
        "semester_result__student__year",
        "semester_result__student__div",
        "semester_result__academic_year",
        "semester_result__sem",
        "semester_result__sgpi",
        "semester_result__cgpa",
        "semester_result__result_status",
        "semester_result__is_published",
        "course__course_id",
        "course__course_name",
        "isa",
        "mse",
        "ese",
        "total_marks",
        "grade",
        "grade_point",
    )
    page = _paginate(result_values, filters)
    records = []
    for row in page.pop("records"):
        records.append({
            "result_id": row["result_id"],
            "student": row["semester_result__student__full_name"],
            "roll_number": row["semester_result__student__roll_no"],
            "branch": row["semester_result__student__branch"],
            "year": row["semester_result__student__year"],
            "division": row["semester_result__student__div"],
            "academic_year": row["semester_result__academic_year"],
            "semester": row["semester_result__sem"],
            "sgpi": row["semester_result__sgpi"],
            "cgpa": row["semester_result__cgpa"],
            "semester_result_status": row["semester_result__result_status"],
            "is_published": row["semester_result__is_published"],
            "course_id": row["course__course_id"],
            "course_name": row["course__course_name"],
            "isa": row["isa"],
            "mse": row["mse"],
            "ese": row["ese"],
            "total_marks": row["total_marks"],
            "grade": row["grade"],
            "grade_point": row["grade_point"],
        })

    semester_queryset = SemesterResult.objects.select_related(
        "student",
    )
    semester_queryset = _filter_students(
        semester_queryset,
        filters,
        "student__",
    )
    if filters.get("semester") is not None:
        semester_queryset = semester_queryset.filter(
            sem=filters["semester"]
        )
    semester_values = semester_queryset.order_by(
        "student__roll_no",
        "-academic_year",
        "sem",
    ).values(
        "student__full_name",
        "student__roll_no",
        "academic_year",
        "sem",
        "sgpi",
        "cgpa",
        "total_credits",
        "result_status",
        "is_published",
    )
    semester_page = _paginate(semester_values, filters)
    semester_records = [
        {
            "student": row["student__full_name"],
            "roll_number": row["student__roll_no"],
            "academic_year": row["academic_year"],
            "semester": row["sem"],
            "sgpi": row["sgpi"],
            "cgpa": row["cgpa"],
            "total_credits": row["total_credits"],
            "result_status": row["result_status"],
            "is_published": row["is_published"],
        }
        for row in semester_page["records"]
    ]

    return {
        "summary": summary,
        "records": records,
        "count": page["count"],
        "page": page["page"],
        "page_size": page["page_size"],
        "has_next": page["has_next"],
        "semester_performance": semester_records,
        "semester_performance_count": semester_page["count"],
    }


def assignments_report(filters):
    queryset = Assignment.objects.select_related(
        "faculty_course__course__department",
        "faculty_course__faculty",
    )
    queryset = _filter_faculty_courses(
        queryset,
        filters,
        "faculty_course__",
    )
    if filters.get("date_from"):
        queryset = queryset.filter(
            due_date__date__gte=filters["date_from"]
        )
    if filters.get("date_to"):
        queryset = queryset.filter(
            due_date__date__lte=filters["date_to"]
        )
    queryset = queryset.annotate(
        enrolled_students=Count(
            "faculty_course__course__enrollments",
            distinct=True,
        ),
        handed_in=Count(
            "submissions",
            filter=Q(submissions__status__in=["submitted", "returned"]),
            distinct=True,
        ),
        draft_submissions=Count(
            "submissions",
            filter=Q(submissions__status="draft"),
            distinct=True,
        ),
        graded=Count(
            "submissions",
            filter=Q(submissions__marks__isnull=False),
            distinct=True,
        ),
    ).order_by("-due_date", "title")
    totals = queryset.order_by().values("assignment_id").annotate(
        enrolled_for_assignment=Count(
            "faculty_course__course__enrollments",
            distinct=True,
        ),
        handed_in_for_assignment=Count(
            "submissions",
            filter=Q(submissions__status__in=["submitted", "returned"]),
            distinct=True,
        ),
        graded_for_assignment=Count(
            "submissions",
            filter=Q(submissions__marks__isnull=False),
            distinct=True,
        ),
    ).aggregate(
        total_assignments=Count("assignment_id"),
        enrolled_students=Sum("enrolled_for_assignment"),
        handed_in=Sum("handed_in_for_assignment"),
        graded=Sum("graded_for_assignment"),
    )
    totals["enrolled_students"] = totals["enrolled_students"] or 0
    totals["handed_in"] = totals["handed_in"] or 0
    totals["graded"] = totals["graded"] or 0
    totals["pending"] = max(
        totals["enrolled_students"] - totals["handed_in"],
        0,
    )
    page = _paginate(queryset, filters)
    records = []
    for assignment in page.pop("records"):
        pending = max(
            assignment.enrolled_students - assignment.handed_in,
            0,
        )
        records.append({
            "assignment_id": assignment.assignment_id,
            "title": assignment.title,
            "course_id": assignment.faculty_course.course.course_id,
            "course_name": assignment.faculty_course.course.course_name,
            "faculty": assignment.faculty_course.faculty.full_name,
            "due_date": assignment.due_date,
            "is_active": assignment.is_active,
            "enrolled_students": assignment.enrolled_students,
            "handed_in": assignment.handed_in,
            "pending": pending,
            "draft_submissions": assignment.draft_submissions,
            "graded": assignment.graded,
        })

    return {
        "summary": totals,
        **page,
        "records": records,
    }


def faculty_report(filters):
    queryset = Faculty.objects.select_related(
        "department",
        "user",
    ).annotate(
        assigned_course_count=Count(
            "faculty_courses__course",
            distinct=True,
        ),
        faculty_course_assignment_count=Count(
            "faculty_courses",
            distinct=True,
        ),
        timetable_entry_count=Count(
            "faculty_courses__timetables",
            distinct=True,
        ),
    )
    if filters.get("branch"):
        queryset = queryset.filter(
            Q(department__department_code__iexact=filters["branch"])
            | Q(department__department_name__iexact=filters["branch"])
        )
    if filters.get("year") is not None:
        queryset = queryset.filter(
            faculty_courses__year=filters["year"]
        )
    if filters.get("semester") is not None:
        queryset = queryset.filter(
            faculty_courses__sem=filters["semester"]
        )
    if filters.get("division"):
        queryset = queryset.filter(
            faculty_courses__div__iexact=filters["division"]
        )
    if filters.get("course"):
        queryset = queryset.filter(
            faculty_courses__course__course_id__iexact=filters["course"]
        )
    if filters.get("faculty"):
        queryset = queryset.filter(
            faculty_id__iexact=filters["faculty"]
        )

    values = queryset.order_by("full_name").values(
        "faculty_id",
        "full_name",
        "faculty_email",
        "department__department_name",
        "department__department_code",
        "assigned_course_count",
        "faculty_course_assignment_count",
        "timetable_entry_count",
    )
    return _paginate(values, filters)


def library_report(filters):
    borrow_queryset = Borrow.objects.select_related("book", "user")
    if filters.get("date_from"):
        borrow_queryset = borrow_queryset.filter(
            reservation_date__date__gte=filters["date_from"]
        )
    if filters.get("date_to"):
        borrow_queryset = borrow_queryset.filter(
            reservation_date__date__lte=filters["date_to"]
        )

    now = timezone.now()
    summary = Book.objects.aggregate(
        total_titles=Count("id"),
        total_copies=Sum("total_copies"),
        available_copies=Sum("available_copies"),
    )
    summary["total_copies"] = summary["total_copies"] or 0
    summary["available_copies"] = summary["available_copies"] or 0
    summary.update(
        borrowed_records=borrow_queryset.filter(status="issued").count(),
        reserved_records=borrow_queryset.filter(status="reserved").count(),
        returned_records=borrow_queryset.filter(status="returned").count(),
        overdue_records=borrow_queryset.filter(
            status="issued",
            due_date__lt=now,
        ).count(),
    )
    records = borrow_queryset.order_by("-created_at").values(
        "id",
        "book__title",
        "book__isbn",
        "user__email",
        "status",
        "reservation_date",
        "borrow_date",
        "due_date",
        "return_date",
    )
    page = _paginate(records, filters)
    page["records"] = [
        {
            "borrow_id": row["id"],
            "book_title": row["book__title"],
            "isbn": row["book__isbn"],
            "user_email": row["user__email"],
            "status": row["status"],
            "reservation_date": row["reservation_date"],
            "borrow_date": row["borrow_date"],
            "due_date": row["due_date"],
            "return_date": row["return_date"],
            "is_overdue": (
                row["status"] == "issued"
                and row["due_date"] is not None
                and row["due_date"] < now
            ),
        }
        for row in page["records"]
    ]
    return {"summary": summary, **page}


def events_report(filters):
    queryset = Event.objects.all()
    if filters.get("date_from"):
        queryset = queryset.filter(event_date__gte=filters["date_from"])
    if filters.get("date_to"):
        queryset = queryset.filter(event_date__lte=filters["date_to"])

    status_counts = {
        row["status"]: row["count"]
        for row in queryset.values("status").annotate(count=Count("event_id"))
    }
    registration_queryset = EventRegistration.objects.filter(
        event__in=queryset,
    )
    registration_summary = {
        row["status"]: row["count"]
        for row in registration_queryset.values("status").annotate(
            count=Count("registration_id")
        )
    }
    event_values = queryset.annotate(
        registered_count=Count(
            "registrations",
            filter=Q(registrations__status="Registered"),
            distinct=True,
        ),
        attended_count=Count(
            "registrations",
            filter=Q(registrations__status="Attended"),
            distinct=True,
        ),
    ).order_by("-event_date", "-time").values(
        "event_id",
        "event_name",
        "event_type",
        "event_date",
        "time",
        "end_time",
        "status",
        "organizer",
        "registered_count",
        "attended_count",
    )
    page = _paginate(event_values, filters)
    return {
        "summary": {
            "total_events": queryset.count(),
            "events_by_status": status_counts,
            "registrations_by_status": registration_summary,
            "total_registrations": sum(registration_summary.values()),
        },
        **page,
    }


def notices_report(filters):
    queryset = Notice.objects.all()
    if filters.get("date_from"):
        queryset = queryset.filter(
            published_date__date__gte=filters["date_from"]
        )
    if filters.get("date_to"):
        queryset = queryset.filter(
            published_date__date__lte=filters["date_to"]
        )
    now = timezone.now()
    summary = queryset.aggregate(
        total_notices=Count("notice_id"),
        published_notices=Count(
            "notice_id",
            filter=Q(status="Published"),
        ),
        draft_notices=Count(
            "notice_id",
            filter=Q(status="Draft"),
        ),
        archived_notices=Count(
            "notice_id",
            filter=Q(status="Archived"),
        ),
        active_notices=Count(
            "notice_id",
            filter=(
                Q(status="Published")
                & (Q(expiry_date__isnull=True) | Q(expiry_date__gt=now))
            ),
        ),
    )
    categories = list(
        queryset.values("category")
        .annotate(count=Count("notice_id"))
        .order_by("category")
    )
    values = queryset.order_by("-published_date").values(
        "notice_id",
        "title",
        "category",
        "priority",
        "status",
        "target_year",
        "published_date",
        "expiry_date",
    )
    return {
        "summary": summary,
        "by_category": categories,
        **_paginate(values, filters),
    }


REPORT_FILTERS = {
    "overview": set(),
    "students": {"branch", "year", "semester", "division", "course"},
    "attendance": {
        "branch", "year", "semester", "division", "course", "faculty",
        "date_from", "date_to",
    },
    "results": {"branch", "year", "semester", "division", "course"},
    "assignments": {
        "branch", "year", "semester", "division", "course", "faculty",
        "date_from", "date_to",
    },
    "faculty": {
        "branch", "year", "semester", "division", "course", "faculty",
    },
    "library": {"date_from", "date_to"},
    "events": {"date_from", "date_to"},
    "notices": {"date_from", "date_to"},
}

REPORT_SERVICES = {
    "overview": overview_report,
    "students": students_report,
    "attendance": attendance_report,
    "results": results_report,
    "assignments": assignments_report,
    "faculty": faculty_report,
    "library": library_report,
    "events": events_report,
    "notices": notices_report,
}
