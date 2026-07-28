from django.conf import settings
from django.core.management.base import BaseCommand, CommandError

from catalog import moysklad
from catalog.webhook_views import STOCK_DOCUMENT_TYPES

ACTIONS = ("CREATE", "UPDATE", "DELETE")


class Command(BaseCommand):
    help = (
        "Register MoySklad webhooks (product + stock-moving documents) so this "
        "site updates immediately when quantity or price changes in MoySklad, "
        "instead of waiting for the periodic sync_moysklad_stock job. Safe to "
        "re-run any time — it clears out webhooks it previously registered at "
        "the same URL before recreating them."
    )

    def handle(self, *args, **options):
        site_url = getattr(settings, "SITE_URL", "")
        secret = getattr(settings, "MOYSKLAD_WEBHOOK_SECRET", "")
        if not site_url:
            raise CommandError(
                "SITE_URL is not set in backend/.env (e.g. https://yourdomain.com — "
                "the public URL MoySklad can reach)."
            )
        if not secret:
            raise CommandError(
                "MOYSKLAD_WEBHOOK_SECRET is not set in backend/.env. Generate one "
                "(e.g. `python -c \"import secrets; print(secrets.token_urlsafe(32))\"`) "
                "and add it before running this command."
            )

        callback_url = f"{site_url.rstrip('/')}/api/moysklad/webhook/{secret}/"

        try:
            existing = moysklad.list_webhooks()
        except moysklad.MoySkladError as exc:
            raise CommandError(f"Could not list existing MoySklad webhooks: {exc}")

        removed = 0
        for hook in existing:
            if hook.get("url") == callback_url:
                moysklad.delete_webhook(hook["id"])
                removed += 1

        entity_types = sorted({"product", *STOCK_DOCUMENT_TYPES})
        created = 0
        errors = []
        for entity_type in entity_types:
            for action in ACTIONS:
                try:
                    moysklad.create_webhook(callback_url, entity_type, action)
                    created += 1
                except moysklad.MoySkladError as exc:
                    errors.append(f"{entity_type}/{action}: {exc}")

        self.stdout.write(
            f"Removed {removed} stale webhook(s), created {created} new webhook(s) "
            f"pointing to {callback_url}."
        )
        if errors:
            self.stderr.write("Some webhooks failed to register:")
            for line in errors:
                self.stderr.write(f"  - {line}")
