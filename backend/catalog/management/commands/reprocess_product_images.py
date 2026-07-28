import io

from PIL import Image

from django.core.management.base import BaseCommand

from catalog.images import MAX_DIMENSION, process_product_image
from catalog.models import ProductImage


class Command(BaseCommand):
    help = (
        "Re-encode existing ProductImage files that are larger than they need to be "
        "(e.g. full-resolution MoySklad originals imported before compression was "
        "added). Skips any image already within MAX_DIMENSION on both axes so "
        "already-small images aren't re-compressed and lose quality for nothing."
    )

    def add_arguments(self, parser):
        parser.add_argument(
            "--dry-run",
            action="store_true",
            help="Report what would change without writing anything.",
        )

    def handle(self, *args, **options):
        dry_run = options["dry_run"]
        processed = 0
        skipped = 0
        failed = 0
        saved_bytes = 0

        for img in ProductImage.objects.all():
            if not img.image:
                continue
            try:
                img.image.open("rb")
                original_bytes = img.image.read()
                img.image.close()
            except (FileNotFoundError, OSError) as exc:
                self.stderr.write(f"[{img.pk}] could not read file: {exc}")
                failed += 1
                continue

            try:
                with Image.open(io.BytesIO(original_bytes)) as probe:
                    dimensions_ok = max(probe.size) <= MAX_DIMENSION
            except Exception as exc:
                self.stderr.write(f"[{img.pk}] could not decode image: {exc}")
                failed += 1
                continue

            if dimensions_ok:
                skipped += 1
                continue

            original_name = img.image.name
            new_file = process_product_image(original_bytes, original_name)
            new_size = len(new_file.read())
            new_file.seek(0)

            saved_bytes += len(original_bytes) - new_size
            processed += 1
            self.stdout.write(
                f"[{img.pk}] {original_name}: {len(original_bytes) // 1024}KB -> {new_size // 1024}KB"
            )

            if not dry_run:
                old_name = img.image.name
                img.image.save(new_file.name, new_file, save=True)
                # save() with a new name leaves the old file on disk; remove it.
                img.image.storage.delete(old_name)

        self.stdout.write(
            f"{'Would reprocess' if dry_run else 'Reprocessed'} {processed}, "
            f"skipped {skipped} (already small), failed {failed}. "
            f"{'Would save' if dry_run else 'Saved'} ~{saved_bytes // 1024 // 1024}MB."
        )
