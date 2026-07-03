"""
URL configuration for core project.
"""

from django.contrib import admin
from django.urls import path, re_path
from django.conf import settings
from django.conf.urls.static import static
from django.http import JsonResponse
from .auth_views import me, signup, signin, signout, redeem_wholesale_code
from .frontend_views import spa_index, share_preview
from catalog.views import (
    categories_api,
    products_api,
    product_detail_api,
    product_images_api,
    product_image_detail_api,
)

def test_api(request):
    return JsonResponse({"message": "Successfully connected to Django backend!"})

urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/test/", test_api),
    path("api/auth/signup/", signup),
    path("api/auth/signin/", signin),
    path("api/auth/me/", me),
    path("api/auth/signout/", signout),
    path("api/auth/wholesale-code/", redeem_wholesale_code),
    path("api/share/", share_preview),
    path("api/categories/", categories_api),
    path("api/products/", products_api),
    path("api/products/<int:pk>/", product_detail_api),
    path("api/products/<int:pk>/images/", product_images_api),
    path("api/products/<int:pk>/images/<int:image_id>/", product_image_detail_api),
]

# Serve media files
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)

# Serve the React frontend — must be LAST (catches all non-api/admin routes).
# spa_index injects per-link Open Graph tags so shared category/product links
# get a proper preview (title + thumbnail) in WhatsApp/Telegram.
urlpatterns += [
    re_path(r"^(?!api/|admin/|static/|media/).*$", spa_index),
]
