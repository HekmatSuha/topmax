"""Thin client for the MoySklad JSON API (remap 1.2).

Docs: https://dev.moysklad.ru/doc/api/remap/1.2/

The token is read from settings.MOYSKLAD_TOKEN (backend/.env) and never
leaves the server — the frontend/admin only ever talks to our own Django
views, which call out to MoySklad on their behalf.
"""

import requests
from django.conf import settings

BASE_URL = "https://api.moysklad.ru/api/remap/1.2"


class MoySkladError(Exception):
    pass


def _headers():
    token = getattr(settings, "MOYSKLAD_TOKEN", "")
    if not token:
        raise MoySkladError("MOYSKLAD_TOKEN is not configured in backend/.env")
    return {
        "Authorization": f"Bearer {token}",
        "Accept-Encoding": "gzip",
        "Content-Type": "application/json",
    }


def _get(path, params=None):
    resp = requests.get(f"{BASE_URL}{path}", headers=_headers(), params=params, timeout=15)
    if not resp.ok:
        raise MoySkladError(f"MoySklad GET {path} failed ({resp.status_code}): {resp.text[:300]}")
    return resp.json()


def search_products(query, limit=20):
    """Search products by name, article or code. Returns a simplified list.

    Uses /entity/assortment with stockMode=all rather than /entity/product —
    the plain product endpoint never includes stock quantity, only assortment
    does (and only when stockMode is explicitly requested). Results are
    filtered down to plain products (skipping variants/bundles/services) since
    the rest of this client (images, single-product stock) assumes a product id.
    """
    data = _get("/entity/assortment", params={"search": query, "limit": limit, "stockMode": "all"})
    results = []
    for row in data.get("rows", []):
        if (row.get("meta") or {}).get("type") != "product":
            continue
        sale_prices = row.get("salePrices") or []
        price = sale_prices[0]["value"] / 100 if sale_prices else None
        results.append({
            "id": row["id"],
            "name": row.get("name", ""),
            "code": row.get("code", ""),
            "article": row.get("article", ""),
            "price": price,
            "quantity": row.get("stock", 0),
            "hasImages": (row.get("images", {}).get("meta", {}).get("size") or 0) > 0,
        })
    return results


def get_product(moysklad_id):
    return _get(f"/entity/product/{moysklad_id}")


def get_product_images(moysklad_id):
    """Return list of {title, download_href} for a product's images."""
    data = _get(f"/entity/product/{moysklad_id}/images")
    images = []
    for row in data.get("rows", []):
        meta = row.get("meta", {})
        download_href = meta.get("downloadHref")
        if download_href:
            images.append({"title": row.get("title", ""), "download_href": download_href})
    return images


def download_image(download_href):
    """Fetch raw bytes for an image download href (needs the same auth header)."""
    resp = requests.get(download_href, headers=_headers(), timeout=20)
    if not resp.ok:
        raise MoySkladError(f"MoySklad image download failed ({resp.status_code})")
    return resp.content


def get_stock_by_product_id(moysklad_id):
    """Current stock quantity for a single product, or None if not found."""
    data = _get("/entity/assortment", params={
        "filter": f"id={moysklad_id}",
        "stockMode": "all",
        "limit": 1,
    })
    rows = data.get("rows", [])
    if rows:
        return rows[0].get("stock", 0)
    return None


def get_all_stock():
    """Return {moysklad_product_id: stock_quantity} for every assortment row with stock data.

    Paginates /entity/assortment (stockMode=all) via meta.nextHref.
    """
    stock_by_id = {}
    path = "/entity/assortment"
    params = {"limit": 1000, "stockMode": "all"}
    while True:
        data = _get(path, params=params)
        for row in data.get("rows", []):
            product_id = row.get("id")
            if product_id:
                stock_by_id[product_id] = row.get("stock", 0)
        next_href = (data.get("meta") or {}).get("nextHref")
        if not next_href:
            break
        path = next_href.replace(BASE_URL, "")
        params = None
    return stock_by_id
