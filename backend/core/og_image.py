"""Render normalized Open Graph preview images for shared links.

Messengers are picky about the og:image they will actually draw. WhatsApp in
particular silently drops the picture — leaving a bare "topmax.kz" link card —
when the image is small (many product photos are 320x320) or is a PNG with an
alpha channel. Category shares happened to work only because those photos are
large opaque JPEG/PNGs.

So rather than pointing og:image at the raw upload, we composite it onto a
fixed 1200x630 opaque JPEG canvas, the size every messenger accepts. The
result is cached under MEDIA_ROOT so nginx serves it directly and each source
photo is only rendered once.
"""

import hashlib
import mimetypes
from pathlib import Path
from urllib.parse import unquote, urlsplit

from django.conf import settings

try:
    from PIL import Image, ImageOps
except ImportError:  # pragma: no cover - Pillow is a hard dependency of ImageField
    Image = None

WIDTH = 1200
HEIGHT = 630
BACKGROUND = (255, 255, 255)
# Keep the product clear of the card edges; WhatsApp crops a few pixels.
MARGIN_X = 60
MARGIN_Y = 30
# Product photos are often only ~320px wide. Scaling them up fills the card
# instead of stranding a stamp in a sea of white, but past 2x it turns to mush.
MAX_UPSCALE = 2.0
CACHE_DIR = "og-preview"


def _source_path(image_url):
    """Local filesystem path for an image URL, or None if it isn't ours."""
    path = unquote(urlsplit(image_url).path)
    media_url = urlsplit(settings.MEDIA_URL).path or "/media/"
    if not path.startswith(media_url):
        return None
    relative = path[len(media_url):].lstrip("/")
    if not relative or ".." in relative:
        return None
    candidate = (Path(settings.MEDIA_ROOT) / relative).resolve()
    try:
        candidate.relative_to(Path(settings.MEDIA_ROOT).resolve())
    except ValueError:
        return None
    return candidate if candidate.is_file() else None


def _cache_name(source):
    """Cache key tied to the file's identity, so re-uploads re-render."""
    stat = source.stat()
    digest = hashlib.sha1(
        f"{source}|{stat.st_mtime_ns}|{stat.st_size}|{WIDTH}x{HEIGHT}".encode()
    ).hexdigest()[:20]
    return f"{digest}.jpg"


def _render(source, destination):
    with Image.open(source) as img:
        img = ImageOps.exif_transpose(img)
        img = img.convert("RGBA")

        scale = min(
            (WIDTH - 2 * MARGIN_X) / img.width,
            (HEIGHT - 2 * MARGIN_Y) / img.height,
            MAX_UPSCALE,
        )
        size = (max(1, round(img.width * scale)), max(1, round(img.height * scale)))
        img = img.resize(size, Image.LANCZOS)

        canvas = Image.new("RGBA", (WIDTH, HEIGHT), BACKGROUND + (255,))
        canvas.alpha_composite(
            img, ((WIDTH - size[0]) // 2, (HEIGHT - size[1]) // 2)
        )

        destination.parent.mkdir(parents=True, exist_ok=True)
        # Write then rename so a concurrent crawler never reads a half file.
        temporary = destination.with_suffix(".tmp")
        canvas.convert("RGB").save(temporary, "JPEG", quality=86, optimize=True)
        temporary.replace(destination)


def build(image_url):
    """Media-relative path of the preview card for `image_url`, or None.

    Returns None whenever the card cannot be produced (remote image, missing
    file, unreadable format); callers fall back to the raw image URL.
    """
    if Image is None or not image_url:
        return None

    source = _source_path(image_url)
    if source is None:
        return None

    mime, _ = mimetypes.guess_type(source.name)
    if not (mime or "").startswith("image/"):
        return None

    relative = f"{CACHE_DIR}/{_cache_name(source)}"
    destination = Path(settings.MEDIA_ROOT) / relative
    if destination.is_file():
        return relative

    try:
        _render(source, destination)
    except Exception:
        return None
    return relative
