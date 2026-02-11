from django.db import models


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
    discount_percent = models.PositiveIntegerField(default=0, help_text="0-100. Set to 0 for no discount.")
    dimensions = models.CharField(max_length=128, blank=True)
    in_stock = models.BooleanField(default=True)
    is_new = models.BooleanField(default=False, help_text="Mark as new arrival.")

    name = models.JSONField(default=dict)
    description = models.JSONField(default=dict)
    features = models.JSONField(default=dict)

    warranty = models.JSONField(default=dict, blank=True)

    image_urls = models.JSONField(default=list)
    available_colors = models.JSONField(default=list, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["id"]

    def __str__(self):
        return f"{self.item_code} - {self.name.get('en', 'Product')}"


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
