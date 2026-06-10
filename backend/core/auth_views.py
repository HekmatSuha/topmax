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


@require_GET
def me(request):
    if not request.user.is_authenticated:
        return JsonResponse({"user": None}, status=401)
    return JsonResponse({"user": _user_payload(request.user)})


@csrf_exempt
@require_POST
def signup(request):
    data = _parse_json(request)
    if data is None:
        return JsonResponse({"error": "Invalid JSON body."}, status=400)

    name = (data.get("name") or "").strip()
    email = (data.get("email") or "").strip().lower()
    password = data.get("password") or ""

    if not name or not email or not password:
        return JsonResponse({"error": "Name, email, and password are required."}, status=400)

    if User.objects.filter(email__iexact=email).exists():
        return JsonResponse({"error": "An account with this email already exists."}, status=409)

    user = User.objects.create_user(
        username=email,
        email=email,
        password=password,
        first_name=name,
    )
    login(request, user)
    return JsonResponse({"user": _user_payload(user)}, status=201)


@csrf_exempt
@require_POST
def signin(request):
    data = _parse_json(request)
    if data is None:
        return JsonResponse({"error": "Invalid JSON body."}, status=400)

    email = (data.get("email") or "").strip().lower()
    password = data.get("password") or ""

    if not email or not password:
        return JsonResponse({"error": "Email and password are required."}, status=400)

    user = authenticate(request, username=email, password=password)
    if user is None:
        return JsonResponse({"error": "Invalid email or password."}, status=401)

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

    # Guest: store wholesale access in the session for this visit
    request.session['wholesale_verified'] = True
    request.session.modified = True
    return JsonResponse({"user": {"name": "Guest", "email": "", "isGuest": True, "isWholesale": True}})
