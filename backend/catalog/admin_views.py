from django.contrib import messages
from django.contrib.admin.views.decorators import staff_member_required
from django.core.files.base import ContentFile
from django.shortcuts import get_object_or_404, redirect, render

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
        "mode": "import",
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
        wholesale_price_usd = round(float(request.POST.get("price", "0") or "0"), 2)
    except ValueError:
        wholesale_price_usd = None

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
        stock_qty, fetched_price = moysklad.get_stock_and_price_by_product_id(moysklad_id)
        stock_qty = stock_qty or 0
        if fetched_price is not None:
            wholesale_price_usd = round(fetched_price, 2)
    except moysklad.MoySkladError:
        stock_qty = 0

    product = Product.objects.create(
        item_code=item_code,
        moysklad_id=moysklad_id,
        category=category,
        price=0,
        wholesale_price_usd=wholesale_price_usd,
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
        f"Imported '{name}' from MoySklad with {imported_images} image(s) and a wholesale price of "
        f"{wholesale_price_usd} — now set the retail price, translations and anything else below.",
    )
    return redirect("admin:catalog_product_change", product.pk)


# ---------------------------------------------------------------------------
# Link an EXISTING product to MoySklad (for products added before this
# integration existed). Sets moysklad_id and pulls current stock + wholesale
# price — leaves name/retail price/images/etc exactly as they already are.
# ---------------------------------------------------------------------------

@staff_member_required
def moysklad_link_view(request, object_id):
    from django.contrib import admin

    product = get_object_or_404(Product, pk=object_id)
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
        "title": f"Link {product.item_code} to MoySklad",
        "mode": "link",
        "target_product": product,
        "query": query,
        "results": results,
        "error": error,
        "opts": Product._meta,
    }
    return render(request, "admin/catalog/product/moysklad_import.html", context)


@staff_member_required
def moysklad_do_link(request, object_id):
    product = get_object_or_404(Product, pk=object_id)
    if request.method != "POST":
        return redirect("admin:catalog_product_moysklad_link", object_id)

    moysklad_id = request.POST.get("moysklad_id", "").strip()
    if not moysklad_id:
        messages.error(request, "No MoySklad product selected.")
        return redirect("admin:catalog_product_moysklad_link", object_id)

    if Product.objects.filter(moysklad_id=moysklad_id).exclude(pk=product.pk).exists():
        messages.error(request, "That MoySklad product is already linked to a different product here.")
        return redirect("admin:catalog_product_moysklad_link", object_id)

    product.moysklad_id = moysklad_id
    update_fields = ["moysklad_id"]
    try:
        stock_qty, price = moysklad.get_stock_and_price_by_product_id(moysklad_id)
        product.in_stock = (stock_qty or 0) > 0
        update_fields.append("in_stock")
        if price is not None:
            product.wholesale_price_usd = round(price, 2)
            update_fields.append("wholesale_price_usd")
    except moysklad.MoySkladError:
        pass
    product.save(update_fields=update_fields)

    messages.success(request, f"Linked '{product.item_code}' to MoySklad — its stock and wholesale price will now stay in sync.")
    return redirect("admin:catalog_product_change", product.pk)
