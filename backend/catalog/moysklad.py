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
    """Search products/variants by name, article or code. Returns a simplified list."""
    data = _get("/entity/product", params={"search": query, "limit": limit})
    results = []
    for row in data.get("rows", []):
        sale_prices = row.get("salePrices") or []
        price = sale_prices[0]["value"] / 100 if sale_prices else None
        results.append({
            "id": row["id"],
            "name": row.get("name", ""),
            "code": row.get("code", ""),
            "article": row.get("article", ""),
            "price": price,
            "quantity": row.get("quantity"),
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
    data = _get("/report/stock/all/current", params={
        "filter": f"product={BASE_URL}/entity/product/{moysklad_id}",
    })
    # This endpoint returns a flat list of {assortmentId, stockPercent, stock, ...}
    if isinstance(data, list) and data:
        return data[0].get("stock", 0)
    return None


def get_all_stock():
    """Return {moysklad_product_id: stock_quantity} for every product with stock data.

    Uses /report/stock/all which paginates via meta.nextHref; results are keyed
    by the product id parsed out of each row's meta.href.
    """
    stock_by_id = {}
    path = "/report/stock/all"
    params = {"limit": 1000}
    while True:
        data = _get(path, params=params)
        for row in data.get("rows", data if isinstance(data, list) else []):
            href = (row.get("meta") or {}).get("href", "")
            product_id = href.rstrip("/").rsplit("/", 1)[-1] if href else None
            if product_id:
                stock_by_id[product_id] = row.get("stock", 0)
        next_href = (data.get("meta") or {}).get("nextHref") if isinstance(data, dict) else None
        if not next_href:
            break
        path = next_href.replace(BASE_URL, "")
        params = None
    return stock_by_id
