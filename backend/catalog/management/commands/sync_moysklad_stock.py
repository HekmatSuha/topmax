from collections import defaultdict

from django.core.management.base import BaseCommand

from catalog import moysklad
from catalog.models import Product
from catalog.sync import apply_stock_and_price


class Command(BaseCommand):
    help = (
        "Sync in_stock and wholesale_price_usd for every Product linked to MoySklad "
        "(moysklad_id set). This is now a fallback/reconciliation pass — day-to-day "
        "changes push through instantly via the MoySklad webhook (see "
        "setup_moysklad_webhooks and catalog/webhook_views.py)."
    )

    def handle(self, *args, **options):
        products = list(Product.objects.exclude(moysklad_id__isnull=True).exclude(moysklad_id=""))
        if not products:
            self.stdout.write("No products linked to MoySklad — nothing to sync.")
            return

        try:
            data_by_id = moysklad.get_all_stock_and_prices()
        except moysklad.MoySkladError as exc:
            self.stderr.write(f"MoySklad sync failed: {exc}")
            return

        to_update = []
        for product in products:
            qty, price = data_by_id.get(product.moysklad_id, (0, None))
            fields = apply_stock_and_price(product, qty, price)
            if fields:
                to_update.append((product, fields))

        # bulk_update requires the same field set per batch, so group by fields touched.
        groups = defaultdict(list)
        for product, fields in to_update:
            groups[tuple(sorted(fields))].append(product)
        for fields, batch in groups.items():
            Product.objects.bulk_update(batch, list(fields))

        self.stdout.write(
            f"Checked {len(products)} linked product(s), updated {len(to_update)}."
        )
