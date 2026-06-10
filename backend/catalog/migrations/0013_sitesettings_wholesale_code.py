from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("catalog", "0012_category_model"),
    ]

    operations = [
        migrations.AddField(
            model_name="sitesettings",
            name="wholesale_code",
            field=models.CharField(
                blank=True,
                max_length=64,
                help_text="Secret code users can enter to unlock wholesale prices.",
            ),
        ),
    ]
