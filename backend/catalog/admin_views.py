from django.contrib import messages
from django.contrib.admin.views.decorators import staff_member_required
from django.shortcuts import get_object_or_404, redirect, render

from . import moysklad
from .images import process_product_image
from .models import Category, Product, ProductImage
from .views import _resolve_image_url


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


def _import_product(moysklad_id, category, name, code, fallback_price_usd):
    """Create a Product linked to a MoySklad product id, pulling current stock,
    wholesale price (falling back to fallback_price_usd if MoySklad has none)
    and images. Shared by the single and bulk import views.
    """
    item_code = code or f"MS-{moysklad_id[:8]}"
    base_code, n = item_code, 1
    while Product.objects.filter(item_code=item_code).exists():
        n += 1
        item_code = f"{base_code}-{n}"

    wholesale_price_usd = fallback_price_usd
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
        stock_quantity=stock_qty,
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
            image=process_product_image(content, f"{item_code}-{i}.jpg"),
            is_primary=(i == 0),
            sort_order=i,
        )
        imported_images += 1

    return product, imported_images


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

    product, imported_images = _import_product(moysklad_id, category, name, code, wholesale_price_usd)

    messages.success(
        request,
        f"Imported '{name}' from MoySklad with {imported_images} image(s) and a wholesale price of "
        f"{product.wholesale_price_usd} — now set the retail price, translations and anything else below.",
    )
    return redirect("admin:catalog_product_change", product.pk)


@staff_member_required
def moysklad_do_import_bulk(request):
    if request.method != "POST":
        return redirect("admin:catalog_product_moysklad_import")

    moysklad_ids = [mid.strip() for mid in request.POST.getlist("moysklad_id") if mid.strip()]
    category_slug = request.POST.get("category", "").strip()

    if not moysklad_ids:
        messages.error(request, "Select at least one product to import.")
        return redirect("admin:catalog_product_moysklad_import")

    if not category_slug:
        messages.error(request, "Pick a category before importing.")
        return redirect("admin:catalog_product_moysklad_import")

    try:
        category = Category.objects.get(slug=category_slug, is_active=True)
    except Category.DoesNotExist:
        messages.error(request, "Invalid category.")
        return redirect("admin:catalog_product_moysklad_import")

    imported, skipped = 0, 0
    for moysklad_id in moysklad_ids:
        if Product.objects.filter(moysklad_id=moysklad_id).exists():
            skipped += 1
            continue

        name = request.POST.get(f"name__{moysklad_id}", "").strip()
        code = request.POST.get(f"code__{moysklad_id}", "").strip()
        try:
            wholesale_price_usd = round(float(request.POST.get(f"price__{moysklad_id}", "0") or "0"), 2)
        except ValueError:
            wholesale_price_usd = None

        _import_product(moysklad_id, category, name, code, wholesale_price_usd)
        imported += 1

    if imported:
        messages.success(request, f"Imported {imported} product(s) from MoySklad into '{category.name.get('en') or category.slug}'.")
    if skipped:
        messages.warning(request, f"Skipped {skipped} product(s) — already linked to MoySklad.")
    return redirect("admin:catalog_product_moysklad_import")


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
        if stock_qty is not None:
            product.stock_quantity = stock_qty
            update_fields.append("stock_quantity")
        if price is not None:
            product.wholesale_price_usd = round(price, 2)
            update_fields.append("wholesale_price_usd")
    except moysklad.MoySkladError:
        pass
    product.save(update_fields=update_fields)

    messages.success(request, f"Linked '{product.item_code}' to MoySklad — its stock and wholesale price will now stay in sync.")
    return redirect("admin:catalog_product_change", product.pk)


# ---------------------------------------------------------------------------
# Instagram poster generator — renders a shareable product poster (photo +
# price) entirely client-side on a &lt;canvas&gt;. This view just hands the
# product's data (price, discount, localized name, image URLs) to the
# template; all drawing happens in poster.html's script.
# ---------------------------------------------------------------------------

@staff_member_required
def poster_view(request, object_id):
    from django.contrib import admin

    product = get_object_or_404(Product, pk=object_id)

    uploaded_images = list(product.images.all())
    if uploaded_images:
        image_urls = [img.image.url for img in uploaded_images]
    else:
        image_urls = [_resolve_image_url(u) for u in product.image_urls if u]

    discount_percent = product.discount_percent or 0
    discounted_price = (
        round(product.price * (100 - discount_percent) / 100) if discount_percent else None
    )

    product_data = {
        "itemCode": product.item_code,
        "name": product.name,
        "categoryName": product.category.name,
        "price": product.price,
        "wholesalePriceUsd": str(product.wholesale_price_usd) if product.wholesale_price_usd is not None else None,
        "discountPercent": discount_percent,
        "discountedPrice": discounted_price,
        "images": image_urls,
        "availableColors": product.available_colors or [],
    }

    context = {
        **admin.site.each_context(request),
        "title": f"Create poster — {product.item_code}",
        "product": product,
        "product_data": product_data,
        "opts": Product._meta,
    }
    return render(request, "admin/catalog/product/poster.html", context)
