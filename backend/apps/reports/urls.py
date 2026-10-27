from django.urls import path

from .views import report


urlpatterns = [
    path("overview/", report, {"report_name": "overview"}, name="report-overview"),
    path("students/", report, {"report_name": "students"}, name="report-students"),
    path("attendance/", report, {"report_name": "attendance"}, name="report-attendance"),
    path("results/", report, {"report_name": "results"}, name="report-results"),
    path("assignments/", report, {"report_name": "assignments"}, name="report-assignments"),
    path("faculty/", report, {"report_name": "faculty"}, name="report-faculty"),
    path("library/", report, {"report_name": "library"}, name="report-library"),
    path("events/", report, {"report_name": "events"}, name="report-events"),
    path("notices/", report, {"report_name": "notices"}, name="report-notices"),
]
