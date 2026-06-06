from django import forms
from django.contrib import admin
from django.contrib.auth import get_user_model
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from django.utils.html import format_html
from .models import Category, Product, ProductImage, WholesaleCustomer, SiteSettings, default_warranty

LANGUAGES = ("en", "ru", "kk")
LANGUAGE_LABELS = {"en": "English", "ru": "Russian", "kk": "Kazakh"}
DEFAULT_WARRANTY = default_warranty()


class CategoryForm(forms.ModelForm):
    name_en = forms.CharField(max_length=255, label="Name (English)")
    name_ru = forms.CharField(max_length=255, required=False, label="Name (Russian)")
    name_kk = forms.CharField(max_length=255, required=False, label="Name (Kazakh)")

    class Meta:
        model = Category
        fields = ("slug", "sort_order", "is_active")

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        if self.instance.pk:
            for lang in LANGUAGES:
                self.fields[f"name_{lang}"].initial = (self.instance.name or {}).get(lang, "")

    def save(self, commit=True):
        category = super().save(commit=False)
        category.name = {
            lang: self.cleaned_data.get(f"name_{lang}", "")
            for lang in LANGUAGES
        }
        if commit:
            category.save()
        return category


@admin.register(Category)
class CategoryAdmin(admin.ModelAdmin):
    form = CategoryForm
    list_display = ("name_en", "slug", "sort_order", "is_active", "product_count")
    list_editable = ("sort_order", "is_active")
    search_fields = ("slug",)
    fields = ("slug", "name_en", "name_ru", "name_kk", "sort_order", "is_active")

    def name_en(self, obj):
        return obj.name.get("en") or obj.slug

    def product_count(self, obj):
        return obj.products.count()


# ---------------------------------------------------------------------------
# Custom form — normal inputs instead of raw JSON
# ---------------------------------------------------------------------------

class ProductForm(forms.ModelForm):
    # --- name (one text input per language) ---
    name_en = forms.CharField(max_length=255, required=False, label="Name (English)")
    name_ru = forms.CharField(max_length=255, required=False, label="Name (Russian)")
    name_kk = forms.CharField(max_length=255, required=False, label="Name (Kazakh)")

    # --- description (one textarea per language) ---
    description_en = forms.CharField(widget=forms.Textarea(attrs={"rows": 3}), required=False, label="Description (English)")
    description_ru = forms.CharField(widget=forms.Textarea(attrs={"rows": 3}), required=False, label="Description (Russian)")
    description_kk = forms.CharField(widget=forms.Textarea(attrs={"rows": 3}), required=False, label="Description (Kazakh)")

    # --- features (one textarea per language, one feature per line) ---
    features_en = forms.CharField(widget=forms.Textarea(attrs={"rows": 4, "placeholder": "One feature per line"}), required=False, label="Features (English)")
    features_ru = forms.CharField(widget=forms.Textarea(attrs={"rows": 4, "placeholder": "One feature per line"}), required=False, label="Features (Russian)")
    features_kk = forms.CharField(widget=forms.Textarea(attrs={"rows": 4, "placeholder": "One feature per line"}), required=False, label="Features (Kazakh)")

    # --- warranty (one text input per language) ---
    warranty_en = forms.CharField(max_length=255, required=False, label="Warranty (English)", initial=DEFAULT_WARRANTY["en"])
    warranty_ru = forms.CharField(max_length=255, required=False, label="Warranty (Russian)", initial=DEFAULT_WARRANTY["ru"])
    warranty_kk = forms.CharField(max_length=255, required=False, label="Warranty (Kazakh)", initial=DEFAULT_WARRANTY["kk"])

    # --- image_urls (one URL per line) ---
    image_urls_text = forms.CharField(widget=forms.Textarea(attrs={"rows": 3, "placeholder": "One URL or filename per line"}), required=False, label="Image URLs (legacy)")

    # --- available_colors (one color per line) ---
    available_colors_text = forms.CharField(widget=forms.Textarea(attrs={"rows": 3, "placeholder": "One color key per line, e.g. chrome"}), required=False, label="Available colors")

    # --- video url ---
    video_url = forms.URLField(required=False, label="Video URL (YouTube or direct MP4)", help_text="Paste a YouTube link or direct .mp4 URL to show a video in the product detail page.")

    class Meta:
        model = Product
        fields = [
            "item_code", "category", "price", "wholesale_price_usd", "discount_percent", "dimensions", "in_stock", "is_new",
        ]

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.fields["wholesale_price_usd"].label = "Wholesale price (USD)"
        obj = self.instance

        # Populate language fields from JSON
        if obj.pk:
            for lang in LANGUAGES:
                self.fields[f"name_{lang}"].initial = (obj.name or {}).get(lang, "")
                self.fields[f"description_{lang}"].initial = (obj.description or {}).get(lang, "")
                features_list = (obj.features or {}).get(lang, [])
                self.fields[f"features_{lang}"].initial = "\n".join(features_list) if isinstance(features_list, list) else features_list
                self.fields[f"warranty_{lang}"].initial = (obj.warranty or {}).get(lang, "")

            self.fields["image_urls_text"].initial = "\n".join(obj.image_urls or [])
            self.fields["available_colors_text"].initial = "\n".join(obj.available_colors or [])
            self.fields["video_url"].initial = obj.video_url or ""

    def _lines_to_list(self, text):
        """Split textarea text into a list, stripping empty lines."""
        return [line.strip() for line in text.splitlines() if line.strip()]

    def save(self, commit=True):
        obj = super().save(commit=False)

        # Assemble name JSON
        obj.name = {lang: self.cleaned_data.get(f"name_{lang}", "") for lang in LANGUAGES}

        # Assemble description JSON
        obj.description = {lang: self.cleaned_data.get(f"description_{lang}", "") for lang in LANGUAGES}

        # Assemble features JSON (list per language)
        obj.features = {lang: self._lines_to_list(self.cleaned_data.get(f"features_{lang}", "")) for lang in LANGUAGES}

        # Assemble warranty JSON
        obj.warranty = {lang: self.cleaned_data.get(f"warranty_{lang}", "") for lang in LANGUAGES}

        # Assemble image_urls list
        obj.image_urls = self._lines_to_list(self.cleaned_data.get("image_urls_text", ""))

        # Assemble available_colors list
        obj.available_colors = self._lines_to_list(self.cleaned_data.get("available_colors_text", ""))

        # Save video URL
        obj.video_url = self.cleaned_data.get("video_url", "")

        if commit:
            obj.save()
        return obj


# ---------------------------------------------------------------------------
# Image inline
# ---------------------------------------------------------------------------

class ProductImageInline(admin.TabularInline):
    model = ProductImage
    extra = 1
    fields = ("image_preview", "image", "color", "alt_text", "is_primary", "sort_order")
    readonly_fields = ("image_preview",)

    def image_preview(self, obj):
        if obj.image:
            return format_html(
                '<img src="{}" style="max-height:80px; border-radius:6px;" />',
                obj.image.url,
            )
        return "-"
    image_preview.short_description = "Preview"


# ---------------------------------------------------------------------------
# Product admin
# ---------------------------------------------------------------------------

@admin.register(Product)
class ProductAdmin(admin.ModelAdmin):
    form = ProductForm
    list_display = ("item_code", "category", "price", "wholesale_price_usd", "discount_percent", "in_stock", "is_new", "image_count", "updated_at")
    search_fields = ("item_code", "category__slug")
    list_filter = ("category", "in_stock")
    inlines = [ProductImageInline]

    fieldsets = (
        (None, {
            "fields": ("item_code", "category", "price", "wholesale_price_usd", "discount_percent", "dimensions", "in_stock", "is_new"),
        }),
        ("Name", {
            "fields": ("name_en", "name_ru", "name_kk"),
        }),
        ("Description", {
            "fields": ("description_en", "description_ru", "description_kk"),
        }),
        ("Features (one per line)", {
            "fields": ("features_en", "features_ru", "features_kk"),
        }),
        ("Warranty", {
            "fields": ("warranty_en", "warranty_ru", "warranty_kk"),
        }),
        ("Images & Colors", {
            "fields": ("image_urls_text", "available_colors_text", "video_url"),
        }),
    )

    def image_count(self, obj):
        return obj.images.count()
    image_count.short_description = "Images"


@admin.register(WholesaleCustomer)
class WholesaleCustomerAdmin(admin.ModelAdmin):
    list_display = ("user", "company_name", "is_approved", "updated_at")
    list_filter = ("is_approved",)
    search_fields = ("user__email", "user__username", "user__first_name", "company_name")


@admin.register(SiteSettings)
class SiteSettingsAdmin(admin.ModelAdmin):
    list_display = ("show_normal_prices",)
    fields = ("show_normal_prices",)

    def has_add_permission(self, request):
        # Only allow one instance
        return not SiteSettings.objects.exists()

    def has_delete_permission(self, request, obj=None):
        return False


class WholesaleCustomerInline(admin.StackedInline):
    model = WholesaleCustomer
    can_delete = False
    extra = 0
    max_num = 1
    fields = ("is_approved", "company_name", "notes")
    verbose_name_plural = "Wholesale access"


User = get_user_model()

try:
    admin.site.unregister(User)
except admin.sites.NotRegistered:
    pass


@admin.register(User)
class UserAdmin(BaseUserAdmin):
    inlines = (*BaseUserAdmin.inlines, WholesaleCustomerInline)
