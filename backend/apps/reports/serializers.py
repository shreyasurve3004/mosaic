from rest_framework import serializers


class ReportFilterSerializer(serializers.Serializer):
    branch = serializers.CharField(required=False, max_length=150)
    year = serializers.IntegerField(required=False, min_value=1, max_value=4)
    semester = serializers.IntegerField(
        required=False,
        min_value=1,
        max_value=8,
    )
    division = serializers.CharField(required=False, max_length=10)
    course = serializers.CharField(required=False, max_length=20)
    faculty = serializers.CharField(required=False, max_length=30)
    date_from = serializers.DateField(required=False)
    date_to = serializers.DateField(required=False)
    page = serializers.IntegerField(required=False, min_value=1, default=1)
    page_size = serializers.IntegerField(
        required=False,
        min_value=1,
        max_value=500,
        default=100,
    )
    export = serializers.ChoiceField(
        required=False,
        choices=("json", "csv"),
        default="json",
    )

    def validate(self, attrs):
        date_from = attrs.get("date_from")
        date_to = attrs.get("date_to")
        if date_from and date_to and date_from > date_to:
            raise serializers.ValidationError(
                {"date_to": "Must be the same as or later than date_from."}
            )
        return attrs


def validate_report_filters(query_params, allowed_filters):
    params = query_params.dict()
    unsupported = sorted(
        set(params) - set(allowed_filters) - {"page", "page_size", "export"}
    )
    if unsupported:
        raise serializers.ValidationError({
            "filters": (
                f"Unsupported filter(s): {', '.join(unsupported)}."
            )
        })

    serializer = ReportFilterSerializer(data=params)
    serializer.is_valid(raise_exception=True)
    filters = serializer.validated_data

    if filters.get("course"):
        from apps.academics.models import Course

        if not Course.objects.filter(
            course_id__iexact=filters["course"]
        ).exists():
            raise serializers.ValidationError({
                "course": "No course exists with this course ID."
            })

    if filters.get("faculty"):
        from apps.users.models import Faculty

        if not Faculty.objects.filter(
            faculty_id__iexact=filters["faculty"]
        ).exists():
            raise serializers.ValidationError({
                "faculty": "No faculty exists with this faculty ID."
            })

    if filters.get("branch"):
        from apps.academics.models import Department
        from apps.users.models import Student

        branch = filters["branch"]
        if not (
            Student.objects.filter(branch__iexact=branch).exists()
            or Department.objects.filter(
                department_code__iexact=branch
            ).exists()
            or Department.objects.filter(
                department_name__iexact=branch
            ).exists()
        ):
            raise serializers.ValidationError({
                "branch": (
                    "No student branch or department matches this value."
                )
            })

    return filters
