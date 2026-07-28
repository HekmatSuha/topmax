import io

from django.core.files.base import ContentFile
from PIL import Image, ImageOps

# 1600px keeps photos sharp even zoomed in on a large monitor, while cutting
# multi-MB studio-photography originals (MoySklad) and phone photos down to a
# web-reasonable size. Re-encoding already-small images would just lose
# quality for no size benefit, so callers should skip images already at or
# under this on both axes.
MAX_DIMENSION = 1600
JPEG_QUALITY = 90


def process_product_image(content: bytes, filename: str) -> ContentFile:
    """Downscale/re-encode a product photo for the web.

    Caps the longest edge at MAX_DIMENSION and re-saves as JPEG. Falls back to
    the original bytes if Pillow can't decode the file, so an upload never
    fails outright because of this step.
    """
    try:
        img = Image.open(io.BytesIO(content))
        img = ImageOps.exif_transpose(img)  # respect camera rotation before resizing

        if img.mode in ("RGBA", "LA") or (img.mode == "P" and "transparency" in img.info):
            img = img.convert("RGBA")
            background = Image.new("RGB", img.size, (255, 255, 255))
            background.paste(img, mask=img.split()[-1])
            img = background
        elif img.mode != "RGB":
            img = img.convert("RGB")

        if max(img.size) > MAX_DIMENSION:
            img.thumbnail((MAX_DIMENSION, MAX_DIMENSION), Image.LANCZOS)

        buffer = io.BytesIO()
        img.save(buffer, format="JPEG", quality=JPEG_QUALITY, optimize=True)
        base_name = filename.rsplit(".", 1)[0]
        return ContentFile(buffer.getvalue(), name=f"{base_name}.jpg")
    except Exception:
        return ContentFile(content, name=filename)
