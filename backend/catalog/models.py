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
    dimensions = models.CharField(max_length=128, blank=True)

    name = models.JSONField(default=dict)
    description = models.JSONField(default=dict)
    features = models.JSONField(default=dict)

    image_urls = models.JSONField(default=list)
    available_colors = models.JSONField(default=list, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["id"]

    def __str__(self):
        return f"{self.item_code} - {self.name.get('en', 'Product')}"
