import uuid

from django.conf import settings
from django.db import models
from django.db.models.functions import Lower
from django.db.models.signals import post_save
from django.dispatch import receiver


# Name of the cookie used to remember a guest device that has unlocked
# wholesale pricing, and how long it stays valid (1 year).
WHOLESALE_DEVICE_COOKIE = "wholesale_device"
WHOLESALE_DEVICE_MAX_AGE = 60 * 60 * 24 * 365


def default_warranty():
    return {
        "en": "1 Year Warranty",
        "ru": "1 год гарантии",
        "kk": "1 жылдық кепілдік",
    }


class Category(models.Model):
    slug = models.SlugField(max_length=64, unique=True)
    name = models.JSONField(default=dict)
    sort_order = models.PositiveIntegerField(default=0)
    is_active = models.BooleanField(default=True)

    class Meta:
        ordering = ["sort_order", "id"]
        verbose_name_plural = "Categories"

    def __str__(self):
        return self.name.get("en") or self.slug


class Product(models.Model):
    item_code = models.CharField(max_length=64, unique=True)
    moysklad_id = models.CharField(
        max_length=64,
        null=True,
        blank=True,
        unique=True,
        db_index=True,
        help_text="Linked MoySklad product UUID. Stock is auto-synced for linked products.",
    )
    category = models.ForeignKey(
        Category,
        on_delete=models.PROTECT,
        related_name="products",
    )
    price = models.PositiveIntegerField()
    wholesale_price_usd = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    discount_percent = models.PositiveIntegerField(default=0, help_text="0-100. Set to 0 for no discount.")
    dimensions = models.CharField(max_length=128, blank=True)
    in_stock = models.BooleanField(default=True)
    is_new = models.BooleanField(default=False, help_text="Mark as new arrival.")

    name = models.JSONField(default=dict)
    description = models.JSONField(default=dict)
    features = models.JSONField(default=dict)

    warranty = models.JSONField(default=default_warranty, blank=True)

    image_urls = models.JSONField(default=list)
    available_colors = models.JSONField(default=list, blank=True)
    video_url = models.URLField(blank=True, default='')

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = [Lower("item_code")]

    def __str__(self):
        return f"{self.item_code} - {self.name.get('en', 'Product')}"


class WholesaleCustomer(models.Model):
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="wholesale_profile",
    )
    is_approved = models.BooleanField(default=False)
    company_name = models.CharField(max_length=255, blank=True)
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["user__email"]

    def __str__(self):
        status = "approved" if self.is_approved else "pending"
        return f"{self.user.email or self.user.username} ({status})"


@receiver(post_save, sender=settings.AUTH_USER_MODEL)
def create_wholesale_profile(sender, instance, created, **kwargs):
    if created:
        WholesaleCustomer.objects.create(user=instance)


class WholesaleDevice(models.Model):
    """A guest device (browser) that unlocked wholesale pricing with the code.

    The device is remembered via a long-lived cookie holding ``token`` so the
    user does not have to re-enter the code on future visits. Access can be
    revoked per-device from the admin by unchecking ``is_active``.
    """

    token = models.UUIDField(default=uuid.uuid4, unique=True, editable=False, db_index=True)
    label = models.CharField(
        max_length=255,
        blank=True,
        help_text="Optional name to identify this device/dealer.",
    )
    user_agent = models.CharField(max_length=512, blank=True)
    is_active = models.BooleanField(
        default=True,
        help_text="Uncheck to revoke wholesale access for this device.",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    last_seen_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["-last_seen_at", "-created_at"]

    def __str__(self):
        return self.label or str(self.token)


class ProductImage(models.Model):
    product = models.ForeignKey(
        Product, on_delete=models.CASCADE, related_name="images"
    )
    image = models.ImageField(upload_to="products/")
    color = models.CharField(max_length=32, blank=True)
    alt_text = models.CharField(max_length=255, blank=True)
    is_primary = models.BooleanField(default=False)
    sort_order = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ["sort_order", "id"]

    def __str__(self):
        return f"Image for {self.product.item_code} (order={self.sort_order})"


class SiteSettings(models.Model):
    show_normal_prices = models.BooleanField(default=False, help_text="Show normal prices for all products in frontend.")
    wholesale_code = models.CharField(max_length=64, blank=True, help_text="Secret code users can enter to unlock wholesale prices.")

    class Meta:
        verbose_name = "Site Setting"
        verbose_name_plural = "Site Settings"

    def __str__(self):
        return "Site Settings"
