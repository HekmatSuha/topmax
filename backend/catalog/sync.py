"""Shared logic for pushing MoySklad stock/price data into local Product rows.

Used by both the periodic `sync_moysklad_stock` management command (bulk, all
linked products) and the webhook handler in webhook_views.py (single product,
fired the moment MoySklad reports a change).
"""

from . import moysklad
from .models import Product


def apply_stock_and_price(product, qty, price):
    """Set product.in_stock / wholesale_price_usd from fetched values if they changed.

    Returns the list of field names that were changed (without saving).
    """
    fields = []

    new_in_stock = (qty or 0) > 0
    if product.in_stock != new_in_stock:
        product.in_stock = new_in_stock
        fields.append("in_stock")

    if qty is not None and product.stock_quantity != qty:
        product.stock_quantity = qty
        fields.append("stock_quantity")

    if price is not None:
        new_price = round(price, 2)
        if product.wholesale_price_usd != new_price:
            product.wholesale_price_usd = new_price
            fields.append("wholesale_price_usd")

    return fields


def sync_one_product(moysklad_id):
    """Re-fetch stock+price for a single linked product and save if changed.

    Returns the Product if it was updated, None if it isn't linked locally,
    wasn't found in MoySklad, or nothing had changed.
    """
    product = Product.objects.filter(moysklad_id=moysklad_id).first()
    if product is None:
        return None

    qty, price = moysklad.get_stock_and_price_by_product_id(moysklad_id)
    fields = apply_stock_and_price(product, qty, price)
    if fields:
        product.save(update_fields=fields)
        return product
    return None
