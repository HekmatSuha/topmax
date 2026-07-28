"""Public endpoint MoySklad calls when a subscribed entity changes.

Registered with MoySklad via `python manage.py setup_moysklad_webhooks` (see
that command). MoySklad does not sign webhook payloads, so the secret baked
into the URL path is the only guard — keep it out of logs/version control
(it lives in backend/.env as MOYSKLAD_WEBHOOK_SECRET) and treat it like a
password.

Why this listens for more than just the "product" entity: MoySklad stock is
not a field on the product itself — it's derived from stock-moving documents
(a sale, a delivery, a transfer between warehouses, ...). Editing a product's
name/price fires a "product" webhook, but a stock change fires a webhook on
whatever document caused it. So we resync on both: directly for "product"
events, and by looking up the document's line items for stock-document
events.
"""

import json
import logging

from django.conf import settings
from django.http import HttpResponse, HttpResponseForbidden, JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_POST

from . import moysklad
from .sync import sync_one_product

logger = logging.getLogger(__name__)

# MoySklad entity types whose CREATE/UPDATE/DELETE can change a product's
# stock quantity. (Reserves from customerorder/purchaseorder don't count as
# stock, so those are deliberately left out.)
STOCK_DOCUMENT_TYPES = {
    "demand",
    "supply",
    "move",
    "enter",
    "loss",
    "retaildemand",
    "purchasereturn",
    "salesreturn",
    "inventory",
}


@csrf_exempt
@require_POST
def moysklad_webhook(request, secret):
    expected = getattr(settings, "MOYSKLAD_WEBHOOK_SECRET", "")
    if not expected or secret != expected:
        return HttpResponseForbidden("Invalid webhook secret.")

    try:
        payload = json.loads(request.body.decode("utf-8"))
    except (ValueError, UnicodeDecodeError):
        return JsonResponse({"error": "Invalid JSON body."}, status=400)

    for event in payload.get("events", []):
        try:
            _handle_event(event)
        except moysklad.MoySkladError as exc:
            logger.warning("MoySklad webhook: could not sync event %r: %s", event, exc)
        except Exception:
            logger.exception("MoySklad webhook: unexpected error handling event %r", event)

    # Always ack with 200 — MoySklad retries/eventually disables a webhook
    # that keeps erroring, and one bad event shouldn't take the rest down.
    return HttpResponse(status=200)


def _handle_event(event):
    meta = event.get("meta") or {}
    entity_type = meta.get("type")
    href = meta.get("href") or ""
    entity_id = moysklad.extract_entity_id(href)
    if not entity_id:
        return

    if entity_type == "product":
        sync_one_product(entity_id)
        return

    if entity_type in STOCK_DOCUMENT_TYPES:
        for product_id in moysklad.get_document_product_ids(entity_type, entity_id):
            sync_one_product(product_id)
