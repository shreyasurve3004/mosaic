from django.db import models


class Department(models.Model):

    department_id = models.AutoField(
        primary_key=True
    )

    department_name = models.CharField(
        max_length=150
    )

    department_code = models.CharField(
        max_length=20,
        unique=True
    )

    def __str__(self):
        return self.department_name


class Course(models.Model):

    course_id = models.CharField(
        max_length=20,
        primary_key=True
    )

    course_name = models.CharField(
        max_length=150
    )

    course_sem = models.PositiveSmallIntegerField()

    credits = models.PositiveSmallIntegerField()

    department = models.ForeignKey(
        Department,
        on_delete=models.PROTECT,
        related_name="courses"
    )

    def __str__(self):
        return f"{self.course_id} - {self.course_name}"


class Enrollment(models.Model):

    enrollment_id = models.AutoField(
        primary_key=True
    )

    student = models.ForeignKey(
        "users.Student",
        on_delete=models.CASCADE,
        related_name="enrollments"
    )

    course = models.ForeignKey(
        Course,
        on_delete=models.PROTECT,
        related_name="enrollments"
    )

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["student", "course"],
                name="unique_student_course_enrollment"
            )
        ]

    def __str__(self):
        return f"{self.student.roll_no} - {self.course.course_id}"


class FacultyCourse(models.Model):
    CLASS_TYPE_CHOICES = [
        ("lecture", "Lecture"),
        ("practical", "Practical"),
    ]

    faculty_course_id = models.AutoField(primary_key=True)

    faculty = models.ForeignKey(
        "users.Faculty",
        on_delete=models.CASCADE,
        related_name="faculty_courses"
    )

    course = models.ForeignKey(
        Course,
        on_delete=models.PROTECT,
        related_name="faculty_courses"
    )

    sem = models.PositiveSmallIntegerField()
    year = models.PositiveSmallIntegerField()
    div = models.CharField(max_length=10)

    batch = models.CharField(
        max_length=50,
        blank=True,
        null=True
    )

    class_type = models.CharField(
        max_length=20,
        choices=CLASS_TYPE_CHOICES
    )

    academic_year = models.CharField(max_length=20)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=[
                    "faculty",
                    "course",
                    "sem",
                    "year",
                    "div",
                    "academic_year"
                ],
                condition=models.Q(class_type="lecture"),
                name="unique_faculty_course_lecture"
            ),
            models.UniqueConstraint(
                fields=[
                    "faculty",
                    "course",
                    "sem",
                    "year",
                    "div",
                    "batch",
                    "academic_year"
                ],
                condition=models.Q(class_type="practical"),
                name="unique_faculty_course_practical"
            ),
            models.CheckConstraint(
                condition=(
                    models.Q(
                        class_type="lecture",
                        batch__isnull=True
                    )
                    |
                    models.Q(
                        class_type="practical",
                        batch__isnull=False
                    )
                ),
                name="valid_class_type_batch"
            ),
        ]

    def __str__(self):
        return f"{self.faculty.faculty_id} - {self.course.course_id}"


class Room(models.Model):
    room_no = models.CharField(max_length=20, primary_key=True)
    block = models.CharField(max_length=50)
    floor = models.PositiveSmallIntegerField()
    room_type = models.CharField(max_length=50)
    capacity = models.PositiveIntegerField()

    def __str__(self):
        return self.room_no


class Timetable(models.Model):
    DAY_CHOICES = [
        ("Monday", "Monday"),
        ("Tuesday", "Tuesday"),
        ("Wednesday", "Wednesday"),
        ("Thursday", "Thursday"),
        ("Friday", "Friday"),
        ("Saturday", "Saturday"),
    ]

    timetable_id = models.AutoField(primary_key=True)

    faculty_course = models.ForeignKey(
        FacultyCourse,
        on_delete=models.CASCADE,
        related_name="timetables"
    )

    room = models.ForeignKey(
        Room,
        on_delete=models.PROTECT,
        related_name="timetables"
    )

    day = models.CharField(
        max_length=15,
        choices=DAY_CHOICES
    )

    start_time = models.TimeField()
    end_time = models.TimeField()

    def __str__(self):
        return (
            f"{self.faculty_course.course.course_id} - "
            f"{self.day} {self.start_time}-{self.end_time}"
        )


class Attendance(models.Model):
    STATUS_CHOICES = [
        ("present", "Present"),
        ("absent", "Absent"),
    ]

    attendance_id = models.AutoField(primary_key=True)

    student = models.ForeignKey(
        "users.Student",
        on_delete=models.CASCADE,
        related_name="attendance_records"
    )

    timetable = models.ForeignKey(
        Timetable,
        on_delete=models.CASCADE,
        related_name="attendance_records"
    )

    date = models.DateField()
    lecture_no = models.PositiveSmallIntegerField()

    status = models.CharField(
        max_length=10,
        choices=STATUS_CHOICES
    )

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=[
                    "student",
                    "timetable",
                    "date",
                    "lecture_no"
                ],
                name="unique_student_timetable_attendance"
            )
        ]

    def __str__(self):
        return (
            f"{self.student.roll_no} - "
            f"{self.timetable.faculty_course.course.course_id} - "
            f"{self.date}"
        )


class Resource(models.Model):
    RESOURCE_TYPE_CHOICES = [
        ("study_material", "Study Material"),
        ("ppt_notes", "PPT / Notes"),
        ("ebooks", "E-Books"),
        ("assignments", "Assignments"),
        ("practical", "Practical"),
        ("tutorials", "Tutorials"),
        ("syllabus", "Syllabus"),
        ("question_papers", "Question Papers"),
        ("mse", "MSE"),
        ("ese", "ESE"),
        ("other", "Other"),
    ]

    resource_id = models.AutoField(primary_key=True)

    faculty_course = models.ForeignKey(
        FacultyCourse,
        on_delete=models.CASCADE,
        related_name="resources"
    )

    title = models.CharField(max_length=200)

    resource_type = models.CharField(
        max_length=30,
        choices=RESOURCE_TYPE_CHOICES
    )

    RESOURCE_DIVISION_CHOICES = [
        ("A", "Division A"),
        ("B", "Division B"),
        ("C", "Division C"),
    ]

    resource_division = models.CharField(
        max_length=1,
        choices=RESOURCE_DIVISION_CHOICES,
        null=True,
        blank=True,
    )

    file_url = models.URLField()

    original_file_name = models.CharField(
        max_length=255,
        blank=True,
        default=""
    )

    upload_date = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.faculty_course.course.course_id} - {self.title}"


class Assignment(models.Model):
    assignment_id = models.AutoField(primary_key=True)

    faculty_course = models.ForeignKey(
        FacultyCourse,
        on_delete=models.CASCADE,
        related_name="assignments"
    )

    title = models.CharField(max_length=200)

    description = models.TextField(blank=True)

    due_date = models.DateTimeField()

    max_marks = models.PositiveIntegerField()

    allow_late_submission = models.BooleanField(default=True)

    is_active = models.BooleanField(default=True)

    created_at = models.DateTimeField(auto_now_add=True)

    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.faculty_course.course.course_id} - {self.title}"


class AssignmentFile(models.Model):
    assignment_file_id = models.AutoField(
        primary_key=True
    )

    assignment = models.ForeignKey(
        Assignment,
        on_delete=models.CASCADE,
        related_name="files"
    )

    file_url = models.URLField()

    file_name = models.CharField(
        max_length=255
    )

    uploaded_at = models.DateTimeField(
        auto_now_add=True
    )

    def __str__(self):
        return self.file_name


class Submission(models.Model):
    STATUS_CHOICES = [
        ("draft", "Draft"),
        ("submitted", "Submitted"),
        ("returned", "Returned"),
    ]

    submission_id = models.AutoField(primary_key=True)

    assignment = models.ForeignKey(
        Assignment,
        on_delete=models.CASCADE,
        related_name="submissions"
    )

    student = models.ForeignKey(
        "users.Student",
        on_delete=models.CASCADE,
        related_name="submissions"
    )

    submitted_at = models.DateTimeField(
        null=True,
        blank=True
    )

    status = models.CharField(
        max_length=10,
        choices=STATUS_CHOICES,
        default="draft"
    )

    marks = models.PositiveIntegerField(
        null=True,
        blank=True
    )

    feedback = models.TextField(
        blank=True
    )

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["assignment", "student"],
                name="unique_assignment_student_submission"
            )
        ]

    def __str__(self):
        return f"{self.student.roll_no} - {self.assignment.title}"


class SubmissionFile(models.Model):
    submission_file_id = models.AutoField(primary_key=True)

    submission = models.ForeignKey(
        Submission,
        on_delete=models.CASCADE,
        related_name="files"
    )

    file_url = models.URLField()

    file_name = models.CharField(
        max_length=255
    )

    uploaded_at = models.DateTimeField(
        auto_now_add=True
    )

    def __str__(self):
        return self.file_name


class PendingSubmissionFile(models.Model):
    """
    Stores a student's uploaded files before they hand in an assignment.
    No Submission record is created until the student actually submits.
    """

    pending_file_id = models.AutoField(primary_key=True)

    assignment = models.ForeignKey(
        Assignment,
        on_delete=models.CASCADE,
        related_name="pending_submission_files",
    )

    student = models.ForeignKey(
        "users.Student",
        on_delete=models.CASCADE,
        related_name="pending_submission_files",
    )

    file_url = models.URLField()
    file_name = models.CharField(max_length=255)
    uploaded_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.student.roll_no} - {self.file_name}"


class SemesterResult(models.Model):
    RESULT_STATUS_CHOICES = [
        ("pass", "Pass"),
        ("fail", "Fail"),
    ]

    semester_result_id = models.AutoField(primary_key=True)

    student = models.ForeignKey(
        "users.Student",
        on_delete=models.CASCADE,
        related_name="semester_results"
    )

    academic_year = models.CharField(max_length=20)

    sem = models.PositiveSmallIntegerField()

    sgpi = models.DecimalField(
        max_digits=4,
        decimal_places=2
    )

    cgpa = models.DecimalField(
        max_digits=4,
        decimal_places=2
    )

    total_credits = models.PositiveIntegerField()

    result_status = models.CharField(
        max_length=10,
        choices=RESULT_STATUS_CHOICES
    )

    is_published = models.BooleanField(default=False)

    published_at = models.DateTimeField(
        null=True,
        blank=True
    )

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["student", "academic_year", "sem"],
                name="unique_student_academic_year_sem_result"
            )
        ]

    def __str__(self):
        return f"{self.student.roll_no} - {self.academic_year} - {self.sem}"


class Result(models.Model):
    result_id = models.AutoField(primary_key=True)

    semester_result = models.ForeignKey(
        SemesterResult,
        on_delete=models.CASCADE,
        related_name="results"
    )

    course = models.ForeignKey(
        Course,
        on_delete=models.PROTECT,
        related_name="results"
    )

    isa = models.PositiveIntegerField()

    mse = models.PositiveIntegerField()

    ese = models.PositiveIntegerField()

    total_marks = models.PositiveIntegerField()

    grade = models.CharField(
        max_length=5
    )

    grade_point = models.PositiveIntegerField()

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["semester_result", "course"],
                name="unique_semester_result_course"
            )
        ]

    def __str__(self):
        return (
            f"{self.semester_result.student.roll_no} - "
            f"{self.course.course_id}"
        )


class AcademicCalendar(models.Model):
    CATEGORY_CHOICES = [
        ("semester", "Semester"),
        ("examination", "Examination"),
        ("holiday", "Holiday"),
        ("registration", "Registration"),
        ("result", "Result Declaration"),
        ("semester_break", "Semester Break"),
        ("academic_event", "Academic Event"),
        ("other", "Other"),
    ]

    calendar_id = models.AutoField(primary_key=True)

    academic_year = models.CharField(max_length=20)

    semester = models.PositiveSmallIntegerField(
        null=True,
        blank=True,
    )

    title = models.CharField(max_length=200)

    category = models.CharField(
        max_length=20,
        choices=CATEGORY_CHOICES,
    )

    start_date = models.DateField()

    end_date = models.DateField()

    description = models.TextField(blank=True)

    created_at = models.DateTimeField(auto_now_add=True)

    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["start_date", "end_date", "calendar_id"]
        constraints = [
            models.CheckConstraint(
                condition=models.Q(end_date__gte=models.F("start_date")),
                name="academic_calendar_valid_date_range",
            ),
        ]

    def __str__(self):
        return f"{self.title} - {self.academic_year}"

    def clean(self):
        super().clean()
        if self.start_date and self.end_date and self.end_date < self.start_date:
            from django.core.exceptions import ValidationError

            raise ValidationError({
                "end_date": "End date cannot be before start date."
            })