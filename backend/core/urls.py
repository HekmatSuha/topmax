"""
URL configuration for core project.
"""

from django.contrib import admin
from django.urls import path, re_path
from django.conf import settings
from django.conf.urls.static import static
from django.http import JsonResponse
from django.views.generic import TemplateView
from .auth_views import signup, signin, signout
from catalog.views import (
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
    path("api/auth/signout/", signout),
    path("api/products/", products_api),
    path("api/products/<int:pk>/", product_detail_api),
    path("api/products/<int:pk>/images/", product_images_api),
    path("api/products/<int:pk>/images/<int:image_id>/", product_image_detail_api),
]

# Serve media files
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)

# Serve the React frontend — must be LAST (catches all non-api/admin routes)
urlpatterns += [
    re_path(r"^(?!api/|admin/|static/|media/).*$", TemplateView.as_view(template_name="index.html")),
]
