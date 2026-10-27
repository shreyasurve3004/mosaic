from rest_framework import serializers

from .models import Event, EventRegistration


class EventSerializer(serializers.ModelSerializer):
    registered_count = serializers.ReadOnlyField()
    available_seats = serializers.ReadOnlyField()
    is_full = serializers.ReadOnlyField()

    is_registered = serializers.SerializerMethodField()
    registration_status = serializers.SerializerMethodField()

    class Meta:
        model = Event
        fields = [
            "event_id",
            "event_name",
            "event_type",
            "description",
            "event_date",
            "time",
            "end_time",
            "location",
            "room_no",
            "organizer",
            "capacity",
            "status",
            "attachments",
            "created_by",
            "registered_count",
            "available_seats",
            "is_full",
            "is_registered",
            "registration_status",
        ]

        read_only_fields = [
            "event_id",
            "created_by",
            "registered_count",
            "available_seats",
            "is_full",
            "is_registered",
            "registration_status",
        ]

    def validate_capacity(self, value):
        if value <= 0:
            raise serializers.ValidationError(
                "Capacity must be greater than zero."
            )

        return value

    def validate(self, attrs):
        start_time = attrs.get(
            "time",
            getattr(self.instance, "time", None),
        )
        end_time = attrs.get(
            "end_time",
            getattr(self.instance, "end_time", None),
        )

        if self.instance is None and end_time is None:
            raise serializers.ValidationError(
                {"end_time": "An event end time is required."}
            )

        if end_time is not None and start_time is not None:
            if end_time <= start_time:
                raise serializers.ValidationError(
                    {"end_time": "End time must be later than start time."}
                )

        return attrs

    def get_is_registered(self, obj):
        request = self.context.get("request")

        if not request or not request.user.is_authenticated:
            return False

        if request.user.role != "student":
            return False

        student = getattr(
            request.user,
            "student_profile",
            None
        )

        if student is None:
            return False

        return EventRegistration.objects.filter(
            event=obj,
            student=student,
            status__in=["Registered", "Attended"],
        ).exists()

    def get_registration_status(self, obj):
        request = self.context.get("request")

        if not request or not request.user.is_authenticated:
            return None

        if request.user.role != "student":
            return None

        student = getattr(
            request.user,
            "student_profile",
            None
        )

        if student is None:
            return None

        registration = EventRegistration.objects.filter(
            event=obj,
            student=student,
        ).first()

        if registration is None:
            return None

        return registration.status


class EventRegistrationSerializer(serializers.ModelSerializer):
    event_name = serializers.CharField(
        source="event.event_name",
        read_only=True
    )

    roll_no = serializers.CharField(
        source="student_id",
        read_only=True
    )

    class Meta:
        model = EventRegistration

        fields = [
            "registration_id",
            "event",
            "event_name",
            "roll_no",
            "registration_date",
            "status",
        ]

        read_only_fields = [
            "registration_id",
            "registration_date",
            "event_name",
            "roll_no",
            "status",
        ]