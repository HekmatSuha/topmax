import json

from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods
from django.conf import settings

from .models import Product, ProductImage


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

VALID_CATEGORIES = {c[0] for c in Product.CATEGORY_CHOICES}


def _resolve_image_url(url):
    """Turn a bare filename into a full static path."""
    if not url:
        return url
    if url.startswith(("http://", "https://", "/")):
        return url
    return f"{settings.STATIC_URL}products/{url}"


def _image_payload(img):
    return {
        "id": img.id,
        "url": img.image.url,
        "color": img.color,
        "altText": img.alt_text,
        "isPrimary": img.is_primary,
        "sortOrder": img.sort_order,
    }


def _product_payload(product):
    uploaded_images = list(product.images.all())

    # Legacy URLs from the JSON field
    legacy_urls = [_resolve_image_url(u) for u in product.image_urls]
    # URLs from uploaded images
    uploaded_urls = [img.image.url for img in uploaded_images]

    return {
        "id": str(product.id),
        "itemCode": product.item_code,
        "name": product.name,
        "category": product.category,
        "description": product.description,
        "price": product.price,
        "discountPercent": product.discount_percent,
        "discountedPrice": round(product.price * (100 - product.discount_percent) / 100) if product.discount_percent else None,
        "inStock": product.in_stock,
        "imageUrls": legacy_urls + uploaded_urls,
        "availableColors": product.available_colors,
        "features": product.features,
        "warranty": product.warranty,
        "dimensions": product.dimensions,
        "images": [_image_payload(img) for img in uploaded_images],
    }


def _validate_product_payload(payload):
    """Validate incoming product data. Returns a list of error strings."""
    errors = []

    # price
    price = payload.get("price")
    if price is not None:
        if not isinstance(price, int) or price < 0:
            errors.append("price must be a positive integer.")

    # category
    category = payload.get("category")
    if category is not None and category not in VALID_CATEGORIES:
        errors.append(
            f"category must be one of: {', '.join(sorted(VALID_CATEGORIES))}."
        )

    # imageUrls
    image_urls = payload.get("imageUrls")
    if image_urls is not None:
        if not isinstance(image_urls, list) or not all(
            isinstance(u, str) for u in image_urls
        ):
            errors.append("imageUrls must be a list of strings.")

    # name, description, features — should be dicts
    for field in ("name", "description", "features"):
        value = payload.get(field)
        if value is not None and not isinstance(value, dict):
            errors.append(f"{field} must be a JSON object.")

    # availableColors
    colors = payload.get("availableColors")
    if colors is not None:
        if not isinstance(colors, list) or not all(
            isinstance(c, str) for c in colors
        ):
            errors.append("availableColors must be a list of strings.")

    return errors


def _parse_json_body(request):
    """Parse JSON body from request. Returns (payload, error_response)."""
    try:
        payload = json.loads(request.body.decode("utf-8"))
        return payload, None
    except (json.JSONDecodeError, UnicodeDecodeError):
        return None, JsonResponse({"error": "Invalid JSON body."}, status=400)


# ---------------------------------------------------------------------------
# Product list & create
# ---------------------------------------------------------------------------

@csrf_exempt
@require_http_methods(["GET", "POST"])
def products_api(request):
    # --- LIST ---
    if request.method == "GET":
        products = Product.objects.prefetch_related("images").all()
        return JsonResponse(
            {"products": [_product_payload(p) for p in products]}
        )

    # --- CREATE ---
    payload, err = _parse_json_body(request)
    if err:
        return err

    required_fields = [
        "itemCode", "name", "category", "description", "price",
        "imageUrls", "features",
    ]
    missing = [f for f in required_fields if f not in payload]
    if missing:
        return JsonResponse(
            {"error": f"Missing fields: {', '.join(missing)}"}, status=400
        )

    validation_errors = _validate_product_payload(payload)
    if validation_errors:
        return JsonResponse({"errors": validation_errors}, status=400)

    try:
        product = Product.objects.create(
            item_code=payload["itemCode"],
            name=payload["name"],
            category=payload["category"],
            description=payload["description"],
            price=payload["price"],
            discount_percent=payload.get("discountPercent", 0),
            in_stock=payload.get("inStock", True),
            image_urls=payload["imageUrls"],
            available_colors=payload.get("availableColors", []),
            features=payload["features"],
            warranty=payload.get("warranty", {}),
            dimensions=payload.get("dimensions", ""),
        )
    except Exception as exc:
        return JsonResponse({"error": str(exc)}, status=400)

    return JsonResponse({"product": _product_payload(product)}, status=201)


# ---------------------------------------------------------------------------
# Product detail: GET / PUT / DELETE
# ---------------------------------------------------------------------------

@csrf_exempt
@require_http_methods(["GET", "PUT", "DELETE"])
def product_detail_api(request, pk):
    try:
        product = Product.objects.prefetch_related("images").get(pk=pk)
    except Product.DoesNotExist:
        return JsonResponse({"error": "Product not found."}, status=404)

    # --- GET single product ---
    if request.method == "GET":
        return JsonResponse({"product": _product_payload(product)})

    # --- DELETE ---
    if request.method == "DELETE":
        product.delete()
        return JsonResponse({"deleted": True})

    # --- PUT (update) ---
    payload, err = _parse_json_body(request)
    if err:
        return err

    validation_errors = _validate_product_payload(payload)
    if validation_errors:
        return JsonResponse({"errors": validation_errors}, status=400)

    # Update only the fields that were sent
    field_map = {
        "itemCode": "item_code",
        "name": "name",
        "category": "category",
        "description": "description",
        "price": "price",
        "discountPercent": "discount_percent",
        "inStock": "in_stock",
        "imageUrls": "image_urls",
        "availableColors": "available_colors",
        "features": "features",
        "warranty": "warranty",
        "dimensions": "dimensions",
    }
    for api_key, model_field in field_map.items():
        if api_key in payload:
            setattr(product, model_field, payload[api_key])

    try:
        product.save()
    except Exception as exc:
        return JsonResponse({"error": str(exc)}, status=400)

    product.refresh_from_db()
    return JsonResponse({"product": _product_payload(product)})


# ---------------------------------------------------------------------------
# Product images: list / upload
# ---------------------------------------------------------------------------

@csrf_exempt
@require_http_methods(["GET", "POST"])
def product_images_api(request, pk):
    try:
        product = Product.objects.get(pk=pk)
    except Product.DoesNotExist:
        return JsonResponse({"error": "Product not found."}, status=404)

    # --- LIST images ---
    if request.method == "GET":
        images = product.images.all()
        return JsonResponse({"images": [_image_payload(img) for img in images]})

    # --- UPLOAD images ---
    files = request.FILES.getlist("image")
    if not files:
        return JsonResponse(
            {"error": "No image files provided. Send files under the 'image' key."},
            status=400,
        )

    color = request.POST.get("color", "")
    alt_text = request.POST.get("alt_text", "")
    is_primary = request.POST.get("is_primary", "false").lower() in ("true", "1")
    sort_order = int(request.POST.get("sort_order", 0))

    created = []
    for f in files:
        img = ProductImage.objects.create(
            product=product,
            image=f,
            color=color,
            alt_text=alt_text,
            is_primary=is_primary,
            sort_order=sort_order,
        )
        created.append(_image_payload(img))
        sort_order += 1  # auto-increment for multiple files

    return JsonResponse({"images": created}, status=201)


# ---------------------------------------------------------------------------
# Single image: DELETE
# ---------------------------------------------------------------------------

@csrf_exempt
@require_http_methods(["DELETE"])
def product_image_detail_api(request, pk, image_id):
    try:
        img = ProductImage.objects.select_related("product").get(
            pk=image_id, product_id=pk
        )
    except ProductImage.DoesNotExist:
        return JsonResponse({"error": "Image not found."}, status=404)

    img.image.delete(save=False)  # delete file from disk
    img.delete()
    return JsonResponse({"deleted": True})
