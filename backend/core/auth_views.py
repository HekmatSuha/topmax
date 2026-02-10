import json

from django.contrib.auth import authenticate, get_user_model, login, logout
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_POST


User = get_user_model()


def _parse_json(request):
    try:
        return json.loads(request.body.decode("utf-8"))
    except (json.JSONDecodeError, UnicodeDecodeError):
        return None


def _user_payload(user):
    name = user.first_name or user.username
    return {
        "name": name,
        "email": user.email,
        "isGuest": False,
    }


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
