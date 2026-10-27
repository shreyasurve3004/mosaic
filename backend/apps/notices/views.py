from django.db.models import Q
from django.shortcuts import get_object_or_404
from django.utils import timezone

from config.file_delivery import serve_cloudinary_file

from rest_framework import status, viewsets
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.exceptions import PermissionDenied
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response

from .cloudinary_utils import delete_attachment, upload_attachment
from .models import Notice, NoticeRead
from .serializers import NoticeReadSerializer, NoticeSerializer


@api_view(["GET"])
@permission_classes([AllowAny])
def attachment_file(request, notice_id, attachment_index):
    notice = get_object_or_404(Notice, notice_id=notice_id)
    attachments = notice.attachments or []

    if attachment_index >= len(attachments):
        return Response(
            {"error": "Attachment not found."},
            status=status.HTTP_404_NOT_FOUND,
        )

    attachment = attachments[attachment_index]
    file_url = attachment.get("file_url")

    if not file_url:
        return Response(
            {"error": "Attachment has no file URL."},
            status=status.HTTP_404_NOT_FOUND,
        )

    return serve_cloudinary_file(
        request,
        file_url,
        attachment.get("file_name") or f"notice-{notice_id}-attachment",
    )


class NoticeViewSet(viewsets.ModelViewSet):
    serializer_class = NoticeSerializer

    def get_permissions(self):
        if self.request.method == "GET":
            return [AllowAny()]

        return [IsAuthenticated()]

    def get_queryset(self):
        queryset = Notice.objects.all()
        params = self.request.query_params

        if params.get("search"):
            search = params["search"]

            queryset = queryset.filter(
                Q(title__icontains=search)
                | Q(content__icontains=search)
                | Q(category__icontains=search)
            )

        if params.get("target_year"):
            target_year = params["target_year"]

            queryset = queryset.filter(
                Q(target_year="ALL")
                | Q(target_year=target_year)
            )

        for field in [
            "category",
            "priority",
            "status",
        ]:
            if params.get(field):
                queryset = queryset.filter(
                    **{
                        f"{field}__iexact": params[field]
                    }
                )

        if params.get("active") == "true":
            queryset = queryset.filter(
                status="Published"
            ).filter(
                Q(expiry_date__isnull=True)
                | Q(expiry_date__gt=timezone.now())
            )

        return queryset

    def is_staff_role(self):
        return self.request.user.role in ["faculty", "admin"]

    def can_manage_notice(self, notice):
        if self.request.user.role == "admin":
            return True

        return (
            self.request.user.role == "faculty"
            and notice.user_id == self.request.user.id
        )

    def perform_create(self, serializer):
        if not self.is_staff_role():
            raise PermissionDenied(
                "Only Faculty or Admin can create notices."
            )

        serializer.save(user=self.request.user)

    def perform_update(self, serializer):
        if not self.is_staff_role():
            raise PermissionDenied(
                "Only Faculty or Admin can edit notices."
            )

        notice = self.get_object()

        if not self.can_manage_notice(notice):
            raise PermissionDenied(
                "You can only edit your own notices."
            )

        serializer.save()

    def perform_destroy(self, instance):
        if not self.can_manage_notice(instance):
            raise PermissionDenied(
                "You can only delete your own notices."
            )

        for attachment in instance.attachments or []:
            delete_attachment(
                attachment.get("public_id"),
                attachment.get("resource_type", "image"),
            )

        instance.delete()

    @action(
        detail=False,
        methods=["get"],
        url_path="active",
    )
    def active(self, request):
        now = timezone.now()

        queryset = Notice.objects.filter(
            status="Published"
        ).filter(
            Q(expiry_date__isnull=True)
            | Q(expiry_date__gt=now)
        )

        return Response(
            self.get_serializer(
                queryset,
                many=True,
            ).data
        )

    @action(
        detail=True,
        methods=["post"],
        url_path="renew",
    )
    def renew(self, request, pk=None):
        if not self.is_staff_role():
            return Response(
                {
                    "error": (
                        "Only Faculty or Admin can "
                        "renew notices."
                    )
                },
                status=status.HTTP_403_FORBIDDEN,
            )

        notice = self.get_object()

        if not self.can_manage_notice(notice):
            raise PermissionDenied(
                "You can only renew your own notices."
            )

        raw_expiry_date = request.data.get("expiry_date")

        if not raw_expiry_date:
            return Response(
                {"error": "expiry_date is required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            new_expiry_date = timezone.datetime.fromisoformat(
                raw_expiry_date.replace("Z", "+00:00")
            )

            if timezone.is_naive(new_expiry_date):
                new_expiry_date = timezone.make_aware(
                    new_expiry_date
                )

        except ValueError:
            return Response(
                {"error": "Invalid expiry_date format."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if (
            notice.published_date
            and new_expiry_date <= notice.published_date
        ):
            return Response(
                {
                    "error": (
                        "New expiry date must be after "
                        "published date."
                    )
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        history = notice.renewal_history or []

        history.append(
            {
                "old_expiry_date": (
                    notice.expiry_date.isoformat()
                    if notice.expiry_date
                    else None
                ),
                "new_expiry_date": (
                    new_expiry_date.isoformat()
                ),
                "renewed_at": timezone.now().isoformat(),
                "renewed_by": str(request.user.id),
            }
        )

        notice.expiry_date = new_expiry_date
        notice.renewal_history = history

        notice.save(
            update_fields=[
                "expiry_date",
                "renewal_history",
            ]
        )

        return Response(
            {
                "message": "Notice renewed successfully.",
                "notice": self.get_serializer(notice).data,
            }
        )

    @action(
        detail=True,
        methods=["post"],
        url_path="attachments/upload",
    )
    def upload_files(self, request, pk=None):
        if not self.is_staff_role():
            return Response(
                {
                    "error": (
                        "Only Faculty or Admin can "
                        "upload attachments."
                    )
                },
                status=status.HTTP_403_FORBIDDEN,
            )

        notice = self.get_object()

        if not self.can_manage_notice(notice):
            raise PermissionDenied(
                "You can only add attachments to your own notices."
            )

        files = request.FILES.getlist("files")

        if not files:
            return Response(
                {"error": "Select at least one file."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        attachments = notice.attachments or []

        for file in files:
            attachments.append(
                upload_attachment(
                    file,
                    f"mosaic/notices/{notice.notice_id}",
                )
            )

        notice.attachments = attachments

        notice.save(
            update_fields=["attachments"]
        )

        return Response(
            self.get_serializer(notice).data
        )

    @action(
        detail=True,
        methods=["delete"],
        url_path="attachments/delete",
    )
    def delete_file(self, request, pk=None):
        if not self.is_staff_role():
            return Response(
                {
                    "error": (
                        "Only Faculty or Admin can "
                        "delete attachments."
                    )
                },
                status=status.HTTP_403_FORBIDDEN,
            )

        notice = self.get_object()

        if not self.can_manage_notice(notice):
            raise PermissionDenied(
                "You can only delete attachments from your own notices."
            )

        public_id = request.data.get("public_id")

        if not public_id:
            return Response(
                {"error": "public_id is required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        attachments = notice.attachments or []

        target = next(
            (
                attachment
                for attachment in attachments
                if attachment.get("public_id") == public_id
            ),
            None,
        )

        if target is None:
            return Response(
                {"error": "Attachment not found."},
                status=status.HTTP_404_NOT_FOUND,
            )

        delete_attachment(
            public_id,
            target.get("resource_type", "image"),
        )

        notice.attachments = [
            attachment
            for attachment in attachments
            if attachment.get("public_id") != public_id
        ]

        notice.save(
            update_fields=["attachments"]
        )

        return Response(
            self.get_serializer(notice).data
        )


class NoticeReadViewSet(viewsets.ModelViewSet):
    serializer_class = NoticeReadSerializer

    http_method_names = [
        "get",
        "post",
        "head",
        "options",
    ]

    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        queryset = NoticeRead.objects.select_related(
            "notice",
            "user",
        ).filter(
            user=self.request.user
        )

        if (
            self.request.user.role in ["faculty", "admin"]
            and self.request.query_params.get("user_id")
        ):
            queryset = NoticeRead.objects.select_related(
                "notice",
                "user",
            ).filter(
                user_id=self.request.query_params["user_id"]
            )

        if self.request.query_params.get("notice"):
            queryset = queryset.filter(
                notice_id=self.request.query_params["notice"]
            )

        return queryset

    @action(
        detail=False,
        methods=["post"],
        url_path="mark-read",
    )
    def mark_read(self, request):
        notice_id = request.data.get("notice_id")

        if not notice_id:
            return Response(
                {"error": "notice_id is required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            notice = Notice.objects.get(
                pk=notice_id
            )
        except Notice.DoesNotExist:
            return Response(
                {"error": "Notice not found."},
                status=status.HTTP_404_NOT_FOUND,
            )

        read_record, _ = NoticeRead.objects.get_or_create(
            notice=notice,
            user=request.user,
        )

        read_record.read_date = timezone.now()

        read_record.save(
            update_fields=["read_date"]
        )

        return Response(
            {
                "message": "Notice marked as read.",
                "is_read": True,
                "notice_read": self.get_serializer(
                    read_record
                ).data,
            }
        )

    @action(
        detail=False,
        methods=["post"],
        url_path="mark-unread",
    )
    def mark_unread(self, request):
        notice_id = request.data.get("notice_id")

        if not notice_id:
            return Response(
                {"error": "notice_id is required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            notice = Notice.objects.get(
                pk=notice_id
            )
        except Notice.DoesNotExist:
            return Response(
                {"error": "Notice not found."},
                status=status.HTTP_404_NOT_FOUND,
            )

        read_record, _ = NoticeRead.objects.get_or_create(
            notice=notice,
            user=request.user,
        )

        read_record.read_date = None

        read_record.save(
            update_fields=["read_date"]
        )

        return Response(
            {
                "message": "Notice marked as unread.",
                "is_read": False,
                "notice_read": self.get_serializer(
                    read_record
                ).data,
            }
        )