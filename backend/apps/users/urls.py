from django.urls import path

from .views import (
    health_check,
    student_profile,
    register,
    verify_otp,
    create_user,
    login,
    forgot_password,
    reset_password,
    admin_users,
    admin_update_user_status,
    admin_update_user,
    user_profile,
)
from rest_framework_simplejwt.views import TokenRefreshView


urlpatterns = [
    path("health/", health_check, name="users-health"),
    path("register/", register, name="users-register"),
    path("verify-otp/", verify_otp, name="users-verify-otp"),
    path("admin/create-user/", create_user, name="users-admin-create"),
    path("login/", login, name="users-login"),
    path("forgot-password/", forgot_password, name="users-forgot-password"),
    path("reset-password/", reset_password, name="users-reset-password"),
    path("token/refresh/", TokenRefreshView.as_view(), name="token_refresh"),
    path("admin/users/", admin_users, name="users-admin-list"),
    path(
        "admin/users/<uuid:user_id>/status/",
        admin_update_user_status,
        name="users-admin-update-status",
    ),
    path(
        "admin/users/<uuid:user_id>/",
        admin_update_user,
        name="users-admin-update",
    ),
    path("me/student/", student_profile, name="student-profile"),
    path("profile/", user_profile, name="user-profile"),
]