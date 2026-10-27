from rest_framework import serializers

from .models import Notice, NoticeRead


class NoticeSerializer(serializers.ModelSerializer):
    user_id = serializers.CharField(
        source="user.id",
        read_only=True,
    )

    is_expired = serializers.ReadOnlyField()
    is_active = serializers.ReadOnlyField()

    class Meta:
        model = Notice
        fields = [
            "notice_id",
            "user_id",
            "title",
            "category",
            "priority",
            "content",
            "published_date",
            "expiry_date",
            "status",
            "target_year",
            "attachments",
            "renewal_history",
            "is_expired",
            "is_active",
        ]

        read_only_fields = [
            "notice_id",
            "user_id",
            "is_expired",
            "is_active",
            "renewal_history",
        ]

    def validate(self, data):
        pub = data.get(
            "published_date",
            getattr(self.instance, "published_date", None),
        )

        exp = data.get(
            "expiry_date",
            getattr(self.instance, "expiry_date", None),
        )

        st = data.get(
            "status",
            getattr(self.instance, "status", "Draft"),
        )

        if pub and exp and exp <= pub:
            raise serializers.ValidationError(
                {
                    "expiry_date": (
                        "Expiry date must be after "
                        "published date."
                    )
                }
            )

        if st == "Published" and not pub:
            raise serializers.ValidationError(
                {
                    "published_date": (
                        "Published notices must have "
                        "a published date."
                    )
                }
            )

        return data


class NoticeReadSerializer(serializers.ModelSerializer):
    notice_title = serializers.CharField(
        source="notice.title",
        read_only=True,
    )

    user_id = serializers.CharField(
        source="user.id",
        read_only=True,
    )

    is_read = serializers.SerializerMethodField()

    class Meta:
        model = NoticeRead

        fields = [
            "notice_read_id",
            "notice",
            "notice_title",
            "user_id",
            "read_date",
            "is_read",
        ]

        read_only_fields = [
            "notice_read_id",
            "notice_title",
            "user_id",
            "is_read",
            "read_date",
        ]

    def get_is_read(self, obj):
        return obj.read_date is not None