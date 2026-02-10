from django.contrib import admin
from .models import Product


@admin.register(Product)
class ProductAdmin(admin.ModelAdmin):
    list_display = ("item_code", "category", "price", "updated_at")
    search_fields = ("item_code", "name", "category")
    list_filter = ("category",)
