"""Thin client for the MoySklad JSON API (remap 1.2).

Docs: https://dev.moysklad.ru/doc/api/remap/1.2/

The token is read from settings.MOYSKLAD_TOKEN (backend/.env) and never
leaves the server — the frontend/admin only ever talks to our own Django
views, which call out to MoySklad on their behalf.
"""

import re

import requests
from django.conf import settings
from django.core.cache import cache

BASE_URL = "https://api.moysklad.ru/api/remap/1.2"

_ENTITY_ID_RE = re.compile(r"/entity/[a-z]+/([0-9a-f-]{36})")
_EXCLUDED_STORE_CACHE_KEY = "moysklad:excluded_store_hrefs"
_EXCLUDED_STORE_CACHE_TTL = 3600


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


def _post(path, json_body):
    resp = requests.post(f"{BASE_URL}{path}", headers=_headers(), json=json_body, timeout=15)
    if not resp.ok:
        raise MoySkladError(f"MoySklad POST {path} failed ({resp.status_code}): {resp.text[:300]}")
    return resp.json()


def _delete(path):
    resp = requests.delete(f"{BASE_URL}{path}", headers=_headers(), timeout=15)
    if not resp.ok and resp.status_code != 404:
        raise MoySkladError(f"MoySklad DELETE {path} failed ({resp.status_code}): {resp.text[:300]}")


def extract_entity_id(href):
    """Pull the UUID out of an /entity/<type>/<uuid> href. Returns None if it doesn't match."""
    match = _ENTITY_ID_RE.search(href or "")
    return match.group(1) if match else None


def search_products(query, limit=20):
    """Search products by name, article or code. Returns a simplified list.

    Search has to go through /entity/product — /entity/assortment silently
    drops the `search` filter once `stockMode` is also set, returning an
    unfiltered list instead. So we search products first, then fetch stock
    for exactly those ids in one batched /entity/assortment call.
    """
    data = _get("/entity/product", params={"search": query, "limit": limit})
    rows = data.get("rows", [])

    stock_by_id = {}
    ids = [row["id"] for row in rows]
    if ids:
        filter_parts = [";".join(f"id={pid}" for pid in ids)]
        excluded = _excluded_store_filter()
        if excluded:
            filter_parts.append(excluded)
        stock_data = _get("/entity/assortment", params={
            "filter": ";".join(filter_parts),
            "stockMode": "all",
            "limit": len(ids),
        })
        for srow in stock_data.get("rows", []):
            stock_by_id[srow.get("id")] = srow.get("stock", 0)

    results = []
    for row in rows:
        results.append({
            "id": row["id"],
            "name": row.get("name", ""),
            "code": row.get("code", ""),
            "article": row.get("article", ""),
            "price": _row_price(row),
            "quantity": stock_by_id.get(row["id"], 0),
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


def _row_price(row):
    sale_prices = row.get("salePrices") or []
    return sale_prices[0]["value"] / 100 if sale_prices else None


def list_stores():
    """Return every warehouse as [{"id", "name", "href"}, ...]."""
    stores = []
    path = "/entity/store"
    params = {"limit": 1000}
    while True:
        data = _get(path, params=params)
        for row in data.get("rows", []):
            stores.append({
                "id": row.get("id"),
                "name": row.get("name", ""),
                "href": (row.get("meta") or {}).get("href", ""),
            })
        next_href = (data.get("meta") or {}).get("nextHref")
        if not next_href:
            break
        path = next_href.replace(BASE_URL, "")
        params = None
    return stores


def _excluded_store_filter():
    """Build a `stockStore!=<href>` filter fragment for every warehouse whose
    name matches settings.MOYSKLAD_EXCLUDED_WAREHOUSES (comma-separated,
    case-insensitive substring match), so stock totals leave those warehouses
    out entirely. Returns "" if nothing is configured or nothing matched.

    The resolved store hrefs are cached (warehouses rarely change) so this
    doesn't cost an extra MoySklad request on every single sync.
    """
    names = [
        n.strip().lower()
        for n in getattr(settings, "MOYSKLAD_EXCLUDED_WAREHOUSES", "").split(",")
        if n.strip()
    ]
    if not names:
        return ""

    hrefs = cache.get(_EXCLUDED_STORE_CACHE_KEY)
    if hrefs is None:
        hrefs = [
            store["href"]
            for store in list_stores()
            if store["href"] and any(name in store["name"].lower() for name in names)
        ]
        cache.set(_EXCLUDED_STORE_CACHE_KEY, hrefs, _EXCLUDED_STORE_CACHE_TTL)

    return ";".join(f"stockStore!={href}" for href in hrefs)


def get_stock_and_price_by_product_id(moysklad_id):
    """Return (stock_quantity, price) for a single product, or (None, None) if not found.

    Stock excludes any warehouse configured in MOYSKLAD_EXCLUDED_WAREHOUSES.
    """
    filter_parts = [f"id={moysklad_id}"]
    excluded = _excluded_store_filter()
    if excluded:
        filter_parts.append(excluded)
    data = _get("/entity/assortment", params={
        "filter": ";".join(filter_parts),
        "stockMode": "all",
        "limit": 1,
    })
    rows = data.get("rows", [])
    if rows:
        return rows[0].get("stock", 0), _row_price(rows[0])
    return None, None


def get_stock_by_product_id(moysklad_id):
    """Current stock quantity for a single product, or None if not found."""
    stock, _ = get_stock_and_price_by_product_id(moysklad_id)
    return stock


def get_document_product_ids(entity_type, entity_id):
    """Return the set of MoySklad product ids referenced by a document's line items.

    Used by the webhook handler: stock-affecting documents (demand, supply,
    move, ...) don't say in their webhook event which products they touched,
    so we fetch the document's positions and read each line's assortment id.
    """
    product_ids = set()
    path = f"/entity/{entity_type}/{entity_id}/positions"
    params = {"limit": 1000}
    while True:
        data = _get(path, params=params)
        for row in data.get("rows", []):
            href = ((row.get("assortment") or {}).get("meta") or {}).get("href", "")
            product_id = extract_entity_id(href)
            if product_id:
                product_ids.add(product_id)
        next_href = (data.get("meta") or {}).get("nextHref")
        if not next_href:
            break
        path = next_href.replace(BASE_URL, "")
        params = None
    return product_ids


def list_webhooks():
    return _get("/entity/webhook").get("rows", [])


def create_webhook(url, entity_type, action):
    return _post("/entity/webhook", {"url": url, "action": action, "entityType": entity_type})


def delete_webhook(webhook_id):
    _delete(f"/entity/webhook/{webhook_id}")


def get_all_stock_and_prices():
    """Return {moysklad_product_id: (stock_quantity, price)} for every assortment row.

    Paginates /entity/assortment (stockMode=all) via meta.nextHref. Stock
    excludes any warehouse configured in MOYSKLAD_EXCLUDED_WAREHOUSES.
    """
    data_by_id = {}
    path = "/entity/assortment"
    params = {"limit": 1000, "stockMode": "all"}
    excluded = _excluded_store_filter()
    if excluded:
        params["filter"] = excluded
    while True:
        data = _get(path, params=params)
        for row in data.get("rows", []):
            product_id = row.get("id")
            if product_id:
                data_by_id[product_id] = (row.get("stock", 0), _row_price(row))
        next_href = (data.get("meta") or {}).get("nextHref")
        if not next_href:
            break
        path = next_href.replace(BASE_URL, "")
        params = None
    return data_by_id
