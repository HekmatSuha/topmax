from django.conf import settings
from django.db import models
from django.db.models.signals import post_save
from django.dispatch import receiver


def default_warranty():
    return {
        "en": "1 Year Warranty",
        "ru": "1 год гарантии",
        "kk": "1 жылдық кепілдік",
    }


class Product(models.Model):
    CATEGORY_CHOICES = [
        ("Baths", "Baths"),
        ("Basins", "Basins"),
        ("Taps", "Taps"),
        ("Closets", "Closets"),
        ("Mirrors", "Mirrors"),
        ("Dryers", "Dryers"),
        ("Others", "Others"),
        ("Accessories", "Accessories"),
    ]

    item_code = models.CharField(max_length=64, unique=True)
    category = models.CharField(max_length=32, choices=CATEGORY_CHOICES)
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
        ordering = ["id"]

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

    class Meta:
        verbose_name = "Site Setting"
        verbose_name_plural = "Site Settings"

    def __str__(self):
        return "Site Settings"
