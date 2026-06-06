from django.db import migrations, models
import django.db.models.deletion


CATEGORIES = [
    ("Baths", {"en": "Baths", "ru": "Ванны", "kk": "Ванналар"}),
    ("Basins", {"en": "Basins", "ru": "Раковины", "kk": "Раковиналар"}),
    ("Taps", {"en": "Taps", "ru": "Смесители", "kk": "Шүмектер"}),
    ("Closets", {"en": "Closets", "ru": "Унитазы", "kk": "Унитаздар"}),
    ("Mirrors", {"en": "Mirrors", "ru": "Зеркала", "kk": "Айналар"}),
    ("Dryers", {"en": "Towel Rails", "ru": "Сушилки", "kk": "Кептіргіштер"}),
    ("Others", {"en": "Others", "ru": "Другое", "kk": "Басқалар"}),
    ("Accessories", {"en": "Accessories", "ru": "Аксессуары", "kk": "Керек-жарақтар"}),
]


def migrate_categories(apps, schema_editor):
    Category = apps.get_model("catalog", "Category")
    Product = apps.get_model("catalog", "Product")

    categories = {}
    for sort_order, (slug, name) in enumerate(CATEGORIES):
        categories[slug] = Category.objects.create(
            slug=slug,
            name=name,
            sort_order=sort_order,
            is_active=True,
        )

    for product in Product.objects.all().iterator():
        category = categories.get(product.category)
        if category is None:
            category = Category.objects.create(
                slug=product.category,
                name={"en": product.category, "ru": product.category, "kk": product.category},
                sort_order=Category.objects.count(),
                is_active=True,
            )
            categories[product.category] = category
        product.category_ref_id = category.id
        product.save(update_fields=["category_ref"])


class Migration(migrations.Migration):
    dependencies = [
        ("catalog", "0011_product_video_url"),
    ]

    operations = [
        migrations.CreateModel(
            name="Category",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("slug", models.SlugField(max_length=64, unique=True)),
                ("name", models.JSONField(default=dict)),
                ("sort_order", models.PositiveIntegerField(default=0)),
                ("is_active", models.BooleanField(default=True)),
            ],
            options={
                "verbose_name_plural": "Categories",
                "ordering": ["sort_order", "id"],
            },
        ),
        migrations.AddField(
            model_name="product",
            name="category_ref",
            field=models.ForeignKey(
                null=True,
                on_delete=django.db.models.deletion.PROTECT,
                related_name="products",
                to="catalog.category",
            ),
        ),
        migrations.RunPython(migrate_categories, migrations.RunPython.noop),
        migrations.RemoveField(
            model_name="product",
            name="category",
        ),
        migrations.RenameField(
            model_name="product",
            old_name="category_ref",
            new_name="category",
        ),
        migrations.AlterField(
            model_name="product",
            name="category",
            field=models.ForeignKey(
                on_delete=django.db.models.deletion.PROTECT,
                related_name="products",
                to="catalog.category",
            ),
        ),
    ]
