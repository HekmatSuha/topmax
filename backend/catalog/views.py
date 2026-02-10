import json

from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods

from django.conf import settings

from .models import Product


def _resolve_image_url(url):
    """Turn a bare filename into a full static path."""
    if not url:
        return url
    if url.startswith(("http://", "https://", "/")):
        return url
    return f"{settings.STATIC_URL}products/{url}"


def _product_payload(product):
    return {
        "id": str(product.id),
        "itemCode": product.item_code,
        "name": product.name,
        "category": product.category,
        "description": product.description,
        "price": product.price,
        "imageUrls": [_resolve_image_url(u) for u in product.image_urls],
        "availableColors": product.available_colors,
        "features": product.features,
        "dimensions": product.dimensions,
    }


@csrf_exempt
@require_http_methods(["GET", "POST"])
def products_api(request):
    if request.method == "GET":
        products = [_product_payload(product) for product in Product.objects.all()]
        return JsonResponse({"products": products})

    try:
        payload = json.loads(request.body.decode("utf-8"))
    except (json.JSONDecodeError, UnicodeDecodeError):
        return JsonResponse({"error": "Invalid JSON body."}, status=400)

    required_fields = [
        "itemCode",
        "name",
        "category",
        "description",
        "price",
        "imageUrls",
        "features",
    ]
    missing = [field for field in required_fields if field not in payload]
    if missing:
        return JsonResponse({"error": f"Missing fields: {', '.join(missing)}"}, status=400)

    try:
        product = Product.objects.create(
            item_code=payload["itemCode"],
            name=payload["name"],
            category=payload["category"],
            description=payload["description"],
            price=payload["price"],
            image_urls=payload["imageUrls"],
            available_colors=payload.get("availableColors", []),
            features=payload["features"],
            dimensions=payload.get("dimensions", ""),
        )
    except Exception as exc:
        return JsonResponse({"error": str(exc)}, status=400)

    return JsonResponse({"product": _product_payload(product)}, status=201)
