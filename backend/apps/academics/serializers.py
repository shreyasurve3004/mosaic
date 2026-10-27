from rest_framework import serializers

from .models import Department, Course, FacultyCourse, Timetable, Attendance, Resource, Assignment, AssignmentFile, Submission, SubmissionFile, Result, SemesterResult, AcademicCalendar


class DepartmentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Department
        fields = [
            "department_id",
            "department_name",
            "department_code",
        ]
        read_only_fields = [
            "department_id",
        ]


class TimetableSerializer(serializers.ModelSerializer):
    course_id = serializers.CharField(
        source="faculty_course.course.course_id",
        read_only=True
    )

    course_name = serializers.CharField(
        source="faculty_course.course.course_name",
        read_only=True
    )

    faculty_id = serializers.CharField(
        source="faculty_course.faculty.faculty_id",
        read_only=True
    )

    faculty_name = serializers.CharField(
        source="faculty_course.faculty.full_name",
        read_only=True
    )

    year = serializers.IntegerField(
        source="faculty_course.year",
        read_only=True
    )

    sem = serializers.IntegerField(
        source="faculty_course.sem",
        read_only=True
    )

    div = serializers.CharField(
        source="faculty_course.div",
        read_only=True
    )

    batch = serializers.CharField(
        source="faculty_course.batch",
        read_only=True
    )

    class_type = serializers.CharField(
        source="faculty_course.class_type",
        read_only=True
    )

    academic_year = serializers.CharField(
        source="faculty_course.academic_year",
        read_only=True
    )

    room_no = serializers.CharField(
        source="room.room_no",
        read_only=True
    )

    block = serializers.CharField(
        source="room.block",
        read_only=True
    )

    floor = serializers.IntegerField(
        source="room.floor",
        read_only=True
    )

    room_type = serializers.CharField(
        source="room.room_type",
        read_only=True
    )

    class Meta:
        model = Timetable
        fields = [
            "timetable_id",

            # Writable by Admin
            "faculty_course",
            "room",
            "day",
            "start_time",
            "end_time",

            # Derived display fields
            "course_id",
            "course_name",
            "faculty_id",
            "faculty_name",
            "year",
            "sem",
            "div",
            "batch",
            "class_type",
            "academic_year",
            "room_no",
            "block",
            "floor",
            "room_type",
        ]

        read_only_fields = [
            "timetable_id",
            "course_id",
            "course_name",
            "faculty_id",
            "faculty_name",
            "year",
            "sem",
            "div",
            "batch",
            "class_type",
            "academic_year",
            "room_no",
            "block",
            "floor",
            "room_type",
        ]

    def validate(self, data):
        start_time = data.get(
            "start_time",
            self.instance.start_time if self.instance else None
        )

        end_time = data.get(
            "end_time",
            self.instance.end_time if self.instance else None
        )

        if start_time and end_time and start_time >= end_time:
            raise serializers.ValidationError(
                {
                    "end_time": "End time must be later than start time."
                }
            )

        return data


class AttendanceSerializer(serializers.ModelSerializer):
    roll_no = serializers.CharField(
        source="student.roll_no",
        read_only=True
    )

    course_id = serializers.CharField(
        source="timetable.faculty_course.course.course_id",
        read_only=True
    )

    course_name = serializers.CharField(
        source="timetable.faculty_course.course.course_name",
        read_only=True
    )

    date = serializers.DateField()

    class Meta:
        model = Attendance
        fields = [
            "attendance_id",
            "roll_no",
            "course_id",
            "course_name",
            "date",
            "lecture_no",
            "status",
            "timetable",
        ]


class ResourceSerializer(serializers.ModelSerializer):
    course_id = serializers.CharField(
        source="faculty_course.course.course_id",
        read_only=True
    )

    course_name = serializers.CharField(
        source="faculty_course.course.course_name",
        read_only=True
    )

    department_code = serializers.CharField(
        source="faculty_course.course.department.department_code",
        read_only=True
    )

    department_name = serializers.CharField(
        source="faculty_course.course.department.department_name",
        read_only=True
    )

    faculty_id = serializers.CharField(
        source="faculty_course.faculty.faculty_id",
        read_only=True
    )

    faculty_name = serializers.CharField(
        source="faculty_course.faculty.full_name",
        read_only=True
    )

    year = serializers.IntegerField(
        source="faculty_course.year",
        read_only=True
    )

    sem = serializers.IntegerField(
        source="faculty_course.sem",
        read_only=True
    )

    div = serializers.CharField(
        source="faculty_course.div",
        read_only=True
    )

    batch = serializers.CharField(
        source="faculty_course.batch",
        read_only=True
    )

    class_type = serializers.CharField(
        source="faculty_course.class_type",
        read_only=True
    )

    academic_year = serializers.CharField(
        source="faculty_course.academic_year",
        read_only=True
    )

    class Meta:
        model = Resource
        fields = [
            "resource_id",
            "faculty_course",
            "department_code",
            "department_name",
            "course_id",
            "course_name",
            "faculty_id",
            "faculty_name",
            "year",
            "sem",
            "div",
            "batch",
            "class_type",
            "academic_year",
            "title",
            "resource_type",
            "resource_division",
            "file_url",
            "original_file_name",
            "upload_date",
        ]
        read_only_fields = [
            "resource_id",
            "upload_date",
            "file_url",
            "original_file_name",
        ]


class AssignmentFileSerializer(serializers.ModelSerializer):
    class Meta:
        model = AssignmentFile
        fields = [
            "assignment_file_id",
            "file_name",
            "file_url",
            "uploaded_at",
        ]
        read_only_fields = [
            "assignment_file_id",
            "uploaded_at",
        ]


class AssignmentSerializer(serializers.ModelSerializer):
    my_submission_status = serializers.SerializerMethodField()

    course_id = serializers.CharField(
        source="faculty_course.course.course_id",
        read_only=True
    )

    course_name = serializers.CharField(
        source="faculty_course.course.course_name",
        read_only=True
    )

    faculty_id = serializers.CharField(
        source="faculty_course.faculty.faculty_id",
        read_only=True
    )

    faculty_name = serializers.CharField(
        source="faculty_course.faculty.full_name",
        read_only=True
    )

    year = serializers.IntegerField(
        source="faculty_course.year",
        read_only=True
    )

    sem = serializers.IntegerField(
        source="faculty_course.sem",
        read_only=True
    )

    div = serializers.CharField(
        source="faculty_course.div",
        read_only=True
    )

    batch = serializers.CharField(
        source="faculty_course.batch",
        read_only=True
    )

    class_type = serializers.CharField(
        source="faculty_course.class_type",
        read_only=True
    )

    academic_year = serializers.CharField(
        source="faculty_course.academic_year",
        read_only=True
    )

    files = AssignmentFileSerializer(
        many=True,
        read_only=True
    )

    def get_my_submission_status(self, obj):
        student = self.context.get("student")
        if student is None:
            return None

        submissions = getattr(obj, "student_submissions", None)
        if submissions is not None:
            return submissions[0].status if submissions else None

        return obj.submissions.filter(
            student=student
        ).values_list(
            "status",
            flat=True
        ).first()

    class Meta:
        model = Assignment
        fields = [
            "assignment_id",
            "my_submission_status",
            "faculty_course",
            "course_id",
            "course_name",
            "faculty_id",
            "faculty_name",
            "year",
            "sem",
            "div",
            "batch",
            "class_type",
            "academic_year",
            "title",
            "description",
            "due_date",
            "max_marks",
            "allow_late_submission",
            "is_active",
            "created_at",
            "updated_at",
            "files",
        ]

        read_only_fields = [
            "assignment_id",
            "created_at",
            "updated_at",
            "files",
        ]


class SubmissionFileSerializer(serializers.ModelSerializer):
    class Meta:
        model = SubmissionFile
        fields = [
            "submission_file_id",
            "file_name",
            "file_url",
            "uploaded_at",
        ]
        read_only_fields = [
            "submission_file_id",
            "uploaded_at",
        ]


class SubmissionSerializer(serializers.ModelSerializer):
    student_id = serializers.IntegerField(
        source="student.id",
        read_only=True
    )
    is_late = serializers.SerializerMethodField()

    assignment_id = serializers.IntegerField(
        source="assignment.assignment_id",
        read_only=True
    )

    assignment_title = serializers.CharField(
        source="assignment.title",
        read_only=True
    )

    course_id = serializers.CharField(
        source="assignment.faculty_course.course.course_id",
        read_only=True
    )

    course_name = serializers.CharField(
        source="assignment.faculty_course.course.course_name",
        read_only=True
    )

    student_roll_no = serializers.CharField(
        source="student.roll_no",
        read_only=True
    )

    student_name = serializers.CharField(
        source="student.full_name",
        read_only=True
    )

    def get_is_late(self, obj):
        return bool(
            obj.submitted_at
            and obj.submitted_at > obj.assignment.due_date
        )

    due_date = serializers.DateTimeField(
        source="assignment.due_date",
        read_only=True
    )

    max_marks = serializers.IntegerField(
        source="assignment.max_marks",
        read_only=True
    )

    allow_late_submission = serializers.BooleanField(
        source="assignment.allow_late_submission",
        read_only=True
    )

    is_active = serializers.BooleanField(
        source="assignment.is_active",
        read_only=True
    )

    files = SubmissionFileSerializer(
        many=True,
        read_only=True
    )

    class Meta:
        model = Submission
        fields = [
            "submission_id",
            "student_id",
            "student_roll_no",
            "student_name",
            "is_late",
            "assignment_id",
            "assignment_title",
            "course_id",
            "course_name",
            "due_date",
            "max_marks",
            "allow_late_submission",
            "is_active",
            "submitted_at",
            "status",
            "marks",
            "feedback",
            "files",
        ]

        read_only_fields = [
            "submission_id",
            "student_roll_no",
            "student_name",
            "assignment_id",
            "assignment_title",
            "course_id",
            "course_name",
            "due_date",
            "max_marks",
            "allow_late_submission",
            "is_active",
            "submitted_at",
            "status",
            "marks",
            "feedback",
            "files",
        ]


class ResultSerializer(serializers.ModelSerializer):
    course_id = serializers.CharField(
        source="course.course_id",
        read_only=True
    )
    course_name = serializers.CharField(
        source="course.course_name",
        read_only=True
    )
    credits = serializers.IntegerField(
        source="course.credits",
        read_only=True
    )

    class Meta:
        model = Result
        fields = [
            "result_id",
            "course",
            "course_id",
            "course_name",
            "credits",
            "isa",
            "mse",
            "ese",
            "total_marks",
            "grade",
            "grade_point",
        ]
        read_only_fields = [
            "result_id",
            "course_id",
            "course_name",
            "credits",
        ]


class SemesterResultSerializer(serializers.ModelSerializer):
    student_name = serializers.CharField(
        source="student.full_name",
        read_only=True
    )
    roll_no = serializers.CharField(
        source="student.roll_no",
        read_only=True
    )
    student_year = serializers.IntegerField(
        source="student.year",
        read_only=True
    )
    student_division = serializers.CharField(
        source="student.div",
        read_only=True
    )
    results = ResultSerializer(
        many=True,
        read_only=True
    )

    class Meta:
        model = SemesterResult
        fields = [
            "semester_result_id",
            "student",
            "student_name",
            "roll_no",
            "student_year",
            "student_division",
            "academic_year",
            "sem",
            "sgpi",
            "cgpa",
            "total_credits",
            "result_status",
            "is_published",
            "published_at",
            "results",
        ]
        read_only_fields = [
            "semester_result_id",
            "student_name",
            "roll_no",
            "student_year",
            "student_division",
            "is_published",
            "published_at",
            "results",
        ]


class AcademicCalendarSerializer(serializers.ModelSerializer):
    semester = serializers.IntegerField(
        required=False,
        allow_null=True,
        min_value=1,
        max_value=8,
    )

    class Meta:
        model = AcademicCalendar
        fields = [
            "calendar_id",
            "academic_year",
            "semester",
            "title",
            "category",
            "start_date",
            "end_date",
            "description",
            "created_at",
            "updated_at",
        ]

        read_only_fields = [
            "calendar_id",
            "created_at",
            "updated_at",
        ]

    def validate(self, attrs):
        start_date = attrs.get(
            "start_date",
            getattr(self.instance, "start_date", None),
        )
        end_date = attrs.get(
            "end_date",
            getattr(self.instance, "end_date", None),
        )
        if start_date and end_date and end_date < start_date:
            raise serializers.ValidationError({
                "end_date": "End date cannot be before start date."
            })
        return attrs


class AcademicCalendarFilterSerializer(serializers.Serializer):
    academic_year = serializers.CharField(
        required=False,
        max_length=20,
    )
    semester = serializers.IntegerField(
        required=False,
        min_value=1,
        max_value=8,
    )
    category = serializers.ChoiceField(
        required=False,
        choices=AcademicCalendar.CATEGORY_CHOICES,
    )
    start_date = serializers.DateField(required=False)
    end_date = serializers.DateField(required=False)

    def validate(self, attrs):
        start_date = attrs.get("start_date")
        end_date = attrs.get("end_date")
        if start_date and end_date and end_date < start_date:
            raise serializers.ValidationError({
                "end_date": "Must be the same as or later than start_date."
            })
        return attrs

class CourseSerializer(serializers.ModelSerializer):
    department_name = serializers.CharField(
        source="department.department_name",
        read_only=True
    )
    department_code = serializers.CharField(
        source="department.department_code",
        read_only=True
    )

    class Meta:
        model = Course
        fields = [
            "course_id",
            "course_name",
            "course_sem",
            "credits",
            "department",
            "department_name",
            "department_code",
        ]
        read_only_fields = [
            "department_name",
            "department_code",
        ]


class FacultyCourseSerializer(serializers.ModelSerializer):
    faculty_name = serializers.CharField(
        source="faculty.full_name",
        read_only=True
    )
    faculty_id = serializers.CharField(
        source="faculty.faculty_id",
        read_only=True
    )
    course_name = serializers.CharField(
        source="course.course_name",
        read_only=True
    )
    course_code = serializers.CharField(
        source="course.course_id",
        read_only=True
    )

    class Meta:
        model = FacultyCourse
        fields = [
            "faculty_course_id",
            "faculty",
            "faculty_id",
            "faculty_name",
            "course",
            "course_code",
            "course_name",
            "sem",
            "year",
            "div",
            "batch",
            "class_type",
            "academic_year",
        ]
        read_only_fields = [
            "faculty_course_id",
            "faculty_id",
            "faculty_name",
            "course_code",
            "course_name",
        ]

    def validate(self, data):
        class_type = data.get(
            "class_type",
            self.instance.class_type if self.instance else None
        )
        batch = data.get(
            "batch",
            self.instance.batch if self.instance else None
        )

        if class_type == "lecture" and batch:
            raise serializers.ValidationError(
                {
                    "batch": "Batch must be empty for lecture."
                }
            )

        if class_type == "practical" and not batch:
            raise serializers.ValidationError(
                {
                    "batch": "Batch is required for practical."
                }
            )

        return data