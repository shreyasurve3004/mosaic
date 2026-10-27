from django.contrib import admin

from .models import Notice, NoticeRead


@admin.register(Notice)
class NoticeAdmin(admin.ModelAdmin):
    list_display = ("notice_id", "title", "category", "priority", "status", "published_date")
    list_filter = ("status", "priority", "target_year")
    search_fields = ("title", "content")


admin.site.register(NoticeRead)