from django.contrib import messages
from django.contrib.admin.views.decorators import staff_member_required
from django.core.files.base import ContentFile
from django.shortcuts import redirect, render

from . import moysklad
from .models import Category, Product, ProductImage


@staff_member_required
def moysklad_import_view(request):
    from django.contrib import admin

    query = request.GET.get("q", "").strip()
    results = []
    error = None
    if query:
        try:
            results = moysklad.search_products(query)
        except moysklad.MoySkladError as exc:
            error = str(exc)

    context = {
        **admin.site.each_context(request),
        "title": "Import from MoySklad",
        "query": query,
        "results": results,
        "error": error,
        "categories": Category.objects.filter(is_active=True),
        "opts": Product._meta,
    }
    return render(request, "admin/catalog/product/moysklad_import.html", context)


@staff_member_required
def moysklad_do_import(request):
    if request.method != "POST":
        return redirect("admin:catalog_product_moysklad_import")

    moysklad_id = request.POST.get("moysklad_id", "").strip()
    category_slug = request.POST.get("category", "").strip()
    name = request.POST.get("name", "").strip()
    code = request.POST.get("code", "").strip()
    try:
        price = round(float(request.POST.get("price", "0") or "0"))
    except ValueError:
        price = 0

    if not moysklad_id or not category_slug:
        messages.error(request, "Pick a category before importing.")
        return redirect("admin:catalog_product_moysklad_import")

    existing = Product.objects.filter(moysklad_id=moysklad_id).first()
    if existing:
        messages.warning(request, "That MoySklad product is already linked here — opening it.")
        return redirect("admin:catalog_product_change", existing.pk)

    try:
        category = Category.objects.get(slug=category_slug, is_active=True)
    except Category.DoesNotExist:
        messages.error(request, "Invalid category.")
        return redirect("admin:catalog_product_moysklad_import")

    item_code = code or f"MS-{moysklad_id[:8]}"
    base_code, n = item_code, 1
    while Product.objects.filter(item_code=item_code).exists():
        n += 1
        item_code = f"{base_code}-{n}"

    try:
        stock_qty = moysklad.get_stock_by_product_id(moysklad_id) or 0
    except moysklad.MoySkladError:
        stock_qty = 0

    product = Product.objects.create(
        item_code=item_code,
        moysklad_id=moysklad_id,
        category=category,
        price=price,
        name={"en": name, "ru": name, "kk": name},
        description={"en": "", "ru": "", "kk": ""},
        features={"en": [], "ru": [], "kk": []},
        in_stock=stock_qty > 0,
    )

    try:
        images = moysklad.get_product_images(moysklad_id)
    except moysklad.MoySkladError:
        images = []

    imported_images = 0
    for i, img in enumerate(images):
        try:
            content = moysklad.download_image(img["download_href"])
        except moysklad.MoySkladError:
            continue
        ProductImage.objects.create(
            product=product,
            image=ContentFile(content, name=f"{item_code}-{i}.jpg"),
            is_primary=(i == 0),
            sort_order=i,
        )
        imported_images += 1

    messages.success(
        request,
        f"Imported '{name}' from MoySklad with {imported_images} image(s) — "
        "now set the price, translations and anything else below.",
    )
    return redirect("admin:catalog_product_change", product.pk)
