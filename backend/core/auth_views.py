import json

from django.contrib.auth import authenticate, get_user_model, login, logout
from django.core.exceptions import ObjectDoesNotExist
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_GET, require_POST


User = get_user_model()


def _parse_json(request):
    try:
        return json.loads(request.body.decode("utf-8"))
    except (json.JSONDecodeError, UnicodeDecodeError):
        return None


def _user_payload(user):
    name = user.first_name or user.username
    try:
        is_wholesale = bool(user.wholesale_profile.is_approved)
    except ObjectDoesNotExist:
        is_wholesale = False
    return {
        "name": name,
        "email": user.email,
        "isGuest": False,
        "isWholesale": is_wholesale,
        "isSuperuser": user.is_superuser,
    }


def _guest_has_wholesale(request):
    """True if a guest unlocked wholesale via the session or a registered device."""
    if request.session.get("wholesale_verified", False):
        return True
    from catalog.models import WholesaleDevice, WHOLESALE_DEVICE_COOKIE
    token = request.COOKIES.get(WHOLESALE_DEVICE_COOKIE)
    if not token:
        return False
    return WholesaleDevice.objects.filter(token=token, is_active=True).exists()


@require_GET
def me(request):
    if request.user.is_authenticated:
        return JsonResponse({"user": _user_payload(request.user)})
    # Guest with an unlocked device/session keeps wholesale access on return visits.
    if _guest_has_wholesale(request):
        return JsonResponse({"user": {"name": "Guest", "email": "", "isGuest": True, "isWholesale": True}})
    return JsonResponse({"user": None}, status=401)


def _normalize_phone(phone):
    """Strip spaces/dashes, ensure it starts with +."""
    phone = "".join(c for c in phone if c.isdigit() or c == "+")
    return phone


@csrf_exempt
@require_POST
def signup(request):
    data = _parse_json(request)
    if data is None:
        return JsonResponse({"error": "Invalid JSON body."}, status=400)

    name = (data.get("name") or "").strip()
    email = (data.get("email") or "").strip().lower()
    phone = _normalize_phone(data.get("phone") or "")
    password = data.get("password") or ""

    if not name or not password:
        return JsonResponse({"error": "Name and password are required."}, status=400)

    if not email and not phone:
        return JsonResponse({"error": "Email or phone number is required."}, status=400)

    if email:
        if User.objects.filter(email__iexact=email).exists():
            return JsonResponse({"error": "An account with this email already exists."}, status=409)
        username = email
    else:
        if len(phone) < 7:
            return JsonResponse({"error": "Enter a valid phone number."}, status=400)
        if User.objects.filter(username=phone).exists():
            return JsonResponse({"error": "An account with this phone number already exists."}, status=409)
        username = phone

    # Read this before login(), which cycles/flushes the session.
    had_wholesale = _guest_has_wholesale(request)

    user = User.objects.create_user(
        username=username,
        email=email,
        password=password,
        first_name=name,
    )
    # A guest who unlocked wholesale (e.g. via an invite link) keeps that
    # status on their new account instead of having to redeem the code again.
    if had_wholesale:
        profile = user.wholesale_profile
        profile.is_approved = True
        profile.save()
    login(request, user)
    return JsonResponse({"user": _user_payload(user)}, status=201)


@csrf_exempt
@require_POST
def signin(request):
    data = _parse_json(request)
    if data is None:
        return JsonResponse({"error": "Invalid JSON body."}, status=400)

    email = (data.get("email") or "").strip().lower()
    phone = _normalize_phone(data.get("phone") or "")
    password = data.get("password") or ""

    if not password or (not email and not phone):
        return JsonResponse({"error": "Credentials are required."}, status=400)

    username = email if email else phone
    user = authenticate(request, username=username, password=password)
    if user is None:
        return JsonResponse({"error": "Invalid credentials."}, status=401)

    login(request, user)
    return JsonResponse({"user": _user_payload(user)})


@csrf_exempt
@require_POST
def signout(request):
    logout(request)
    return JsonResponse({"message": "Signed out successfully."})


@csrf_exempt
@require_POST
def redeem_wholesale_code(request):
    data = _parse_json(request)
    if data is None:
        return JsonResponse({"error": "Invalid JSON body."}, status=400)

    code = (data.get("code") or "").strip()
    if not code:
        return JsonResponse({"error": "Code is required."}, status=400)

    from catalog.models import SiteSettings
    site = SiteSettings.objects.first()
    if not site or not site.wholesale_code or code != site.wholesale_code:
        return JsonResponse({"error": "Invalid code."}, status=400)

    if request.user.is_authenticated:
        profile = request.user.wholesale_profile
        profile.is_approved = True
        profile.save()
        return JsonResponse({"user": _user_payload(request.user)})

    # Guest: store wholesale access in the session for this visit and register
    # the device so it stays unlocked on future visits via a long-lived cookie.
    request.session['wholesale_verified'] = True
    request.session.modified = True

    from django.conf import settings as dj_settings
    from django.utils import timezone
    from catalog.models import (
        WholesaleDevice,
        WHOLESALE_DEVICE_COOKIE,
        WHOLESALE_DEVICE_MAX_AGE,
    )

    token = request.COOKIES.get(WHOLESALE_DEVICE_COOKIE)
    device = WholesaleDevice.objects.filter(token=token).first() if token else None
    if device is not None and not device.is_active:
        # A revoked device must register again under a fresh token.
        device = None
    if device is None:
        device = WholesaleDevice.objects.create(
            user_agent=request.META.get("HTTP_USER_AGENT", "")[:512],
            last_seen_at=timezone.now(),
        )
    else:
        device.last_seen_at = timezone.now()
        device.save(update_fields=["last_seen_at"])

    response = JsonResponse(
        {"user": {"name": "Guest", "email": "", "isGuest": True, "isWholesale": True}}
    )
    response.set_cookie(
        WHOLESALE_DEVICE_COOKIE,
        str(device.token),
        max_age=WHOLESALE_DEVICE_MAX_AGE,
        httponly=True,
        samesite=getattr(dj_settings, "SESSION_COOKIE_SAMESITE", "Lax"),
        secure=getattr(dj_settings, "SESSION_COOKIE_SECURE", False),
    )
    return response
