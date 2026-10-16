import hashlib

from django.contrib.auth import authenticate, login, logout, update_session_auth_hash
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError as DjangoValidationError
from django.middleware.csrf import get_token
from django.utils.decorators import method_decorator
from django.views.decorators.csrf import csrf_protect, ensure_csrf_cookie
from rest_framework import status
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from core.audit import record_audit
from .models import UserProfile
from .throttles import LoginIPRateThrottle, LoginRateThrottle


INTERNAL_ROLES = {
    UserProfile.Role.SYSTEM_ADMIN,
    UserProfile.Role.INTAKE,
    UserProfile.Role.CASE_WORKER,
    UserProfile.Role.CREDIT_APPROVER,
    UserProfile.Role.FINANCE,
    UserProfile.Role.AUDITOR,
}


def user_payload(user):
    profile = getattr(user, "profile", None)
    return {
        "id": user.pk,
        "username": user.get_username(),
        "first_name": user.first_name,
        "last_name": user.last_name,
        "is_staff": user.is_staff,
        "role": profile.role if profile else None,
        "role_label": profile.get_role_display() if profile else None,
        "must_change_password": profile.must_change_password if profile else False,
    }


@ensure_csrf_cookie
def csrf_token(request):
    """Set the CSRF cookie and return its token for the browser client."""
    from django.http import JsonResponse

    return JsonResponse({"csrfToken": get_token(request)})


@method_decorator(csrf_protect, name="dispatch")
class LoginView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = []
    throttle_classes = [LoginRateThrottle, LoginIPRateThrottle]

    def post(self, request):
        username = request.data.get("username")
        password = request.data.get("password")
        if not isinstance(username, str) or not isinstance(password, str) or not username or not password:
            return Response(
                {"detail": "نام کاربری و گذرواژه الزامی است."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        user = authenticate(request=request._request, username=username, password=password)
        profile = getattr(user, "profile", None) if user else None
        if (
            user is None
            or not user.is_active
            or not user.is_staff
            or profile is None
            or profile.role not in INTERNAL_ROLES
        ):
            identifier = hashlib.sha256(username.strip().casefold().encode("utf-8")).hexdigest()
            record_audit(
                request,
                "auth.login",
                entity_type="account",
                entity_id=identifier,
                outcome="failure",
                metadata={"reason": "invalid_credentials_or_role"},
            )
            return Response(
                {"detail": "نام کاربری یا گذرواژه معتبر نیست، یا دسترسی داخلی فعال نیست."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        login(request._request, user)
        record_audit(
            request,
            "auth.login",
            actor=user,
            entity_type="account",
            entity_id=str(user.pk),
            metadata={"role": profile.role},
        )
        return Response({"user": user_payload(user)}, status=status.HTTP_200_OK)


class LogoutView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        actor = request.user
        logout(request._request)
        record_audit(
            request,
            "auth.logout",
            actor=actor,
            entity_type="account",
            entity_id=str(actor.pk),
        )
        return Response({"detail": "با موفقیت خارج شدید."}, status=status.HTTP_200_OK)


class CurrentUserView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        return Response({"user": user_payload(request.user)})


class ChangePasswordView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        current_password = request.data.get("current_password")
        new_password = request.data.get("new_password")
        if not isinstance(current_password, str) or not request.user.check_password(current_password):
            return Response(
                {"current_password": "گذرواژه فعلی صحیح نیست."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if not isinstance(new_password, str) or not new_password:
            return Response(
                {"new_password": "گذرواژه جدید الزامی است."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        try:
            validate_password(new_password, user=request.user)
        except DjangoValidationError as exc:
            return Response({"new_password": list(exc.messages)}, status=status.HTTP_400_BAD_REQUEST)

        request.user.set_password(new_password)
        request.user.save(update_fields=["password"])
        update_session_auth_hash(request._request, request.user)
        record_audit(
            request,
            "auth.password_changed",
            actor=request.user,
            entity_type="account",
            entity_id=str(request.user.pk),
        )
        profile = getattr(request.user, "profile", None)
        if profile and profile.must_change_password:
            profile.must_change_password = False
            profile.save(update_fields=["must_change_password", "updated_at"])
        return Response({"detail": "گذرواژه با موفقیت تغییر کرد."}, status=status.HTTP_200_OK)
