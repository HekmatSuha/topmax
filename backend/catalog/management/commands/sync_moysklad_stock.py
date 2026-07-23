from django.core.management.base import BaseCommand

from catalog import moysklad
from catalog.models import Product


class Command(BaseCommand):
    help = "Sync in_stock and wholesale_price_usd for every Product linked to MoySklad (moysklad_id set)."

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
            fields = []

            new_in_stock = qty > 0
            if product.in_stock != new_in_stock:
                product.in_stock = new_in_stock
                fields.append("in_stock")

            if price is not None:
                new_price = round(price, 2)
                if product.wholesale_price_usd != new_price:
                    product.wholesale_price_usd = new_price
                    fields.append("wholesale_price_usd")

            if fields:
                to_update.append((product, fields))

        # bulk_update requires the same field set per batch, so group by fields touched.
        for fields in ({"in_stock"}, {"wholesale_price_usd"}, {"in_stock", "wholesale_price_usd"}):
            batch = [p for p, f in to_update if set(f) == fields]
            if batch:
                Product.objects.bulk_update(batch, list(fields))

        self.stdout.write(
            f"Checked {len(products)} linked product(s), updated {len(to_update)}."
        )
