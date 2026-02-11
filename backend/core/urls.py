"""
URL configuration for core project.

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/5.2/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  path('', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  path('', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.urls import include, path
    2. Add a URL to urlpatterns:  path('blog/', include('blog.urls'))
"""

from django.contrib import admin
from django.urls import path
from django.conf import settings
from django.conf.urls.static import static
from django.http import JsonResponse
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

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
