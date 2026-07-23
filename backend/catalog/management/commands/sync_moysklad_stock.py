from django.core.management.base import BaseCommand

from catalog import moysklad
from catalog.models import Product


class Command(BaseCommand):
    help = "Sync in_stock for every Product linked to MoySklad (moysklad_id set)."

    def handle(self, *args, **options):
        products = list(Product.objects.exclude(moysklad_id__isnull=True).exclude(moysklad_id=""))
        if not products:
            self.stdout.write("No products linked to MoySklad — nothing to sync.")
            return

        try:
            stock_by_id = moysklad.get_all_stock()
        except moysklad.MoySkladError as exc:
            self.stderr.write(f"MoySklad sync failed: {exc}")
            return

        to_update = []
        for product in products:
            qty = stock_by_id.get(product.moysklad_id, 0)
            new_in_stock = qty > 0
            if product.in_stock != new_in_stock:
                product.in_stock = new_in_stock
                to_update.append(product)

        if to_update:
            Product.objects.bulk_update(to_update, ["in_stock"])

        self.stdout.write(
            f"Checked {len(products)} linked product(s), updated {len(to_update)}."
        )
