from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


def create_existing_wholesale_profiles(apps, schema_editor):
    app_label, model_name = settings.AUTH_USER_MODEL.split(".")
    User = apps.get_model(app_label, model_name)
    WholesaleCustomer = apps.get_model("catalog", "WholesaleCustomer")
    existing_profile_user_ids = set(
        WholesaleCustomer.objects.values_list("user_id", flat=True)
    )
    profiles = [
        WholesaleCustomer(user_id=user_id)
        for user_id in User.objects.values_list("id", flat=True)
        if user_id not in existing_profile_user_ids
    ]
    WholesaleCustomer.objects.bulk_create(profiles, ignore_conflicts=True)


class Migration(migrations.Migration):

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ("catalog", "0006_product_is_new"),
    ]

    operations = [
        migrations.AddField(
            model_name="product",
            name="wholesale_price_usd",
            field=models.DecimalField(blank=True, decimal_places=2, max_digits=10, null=True),
        ),
        migrations.CreateModel(
            name="WholesaleCustomer",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("is_approved", models.BooleanField(default=False)),
                ("company_name", models.CharField(blank=True, max_length=255)),
                ("notes", models.TextField(blank=True)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                (
                    "user",
                    models.OneToOneField(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="wholesale_profile",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
            ],
            options={
                "ordering": ["user__email"],
            },
        ),
        migrations.RunPython(create_existing_wholesale_profiles, migrations.RunPython.noop),
    ]
