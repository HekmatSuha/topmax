from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('catalog', '0010_alter_product_warranty_default'),
    ]

    operations = [
        migrations.AddField(
            model_name='product',
            name='video_url',
            field=models.URLField(blank=True, default=''),
        ),
    ]
