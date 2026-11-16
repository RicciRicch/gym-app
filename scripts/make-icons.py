"""Draw the app icon (the header's flat dumbbell mark, lime on the app's dark)
and write the favicon and PWA icons. No generated art, so it stays crisp.

Usage: python scripts/make-icons.py
"""
from pathlib import Path

from PIL import Image, ImageDraw

OUT = Path(__file__).resolve().parent.parent / "public"
BG = (11, 13, 16)  # --color-bg
TILE = (20, 24, 29)  # --color-surface
LIME = (200, 255, 46)  # --color-accent

# DumbbellMark from src/components/ui.tsx, in its 32 x 32 viewBox: x, y, w, h, radius.
MARK = [(1, 11, 5, 10, 2), (7, 7, 5, 18, 2), (12, 14, 8, 4, 0), (20, 7, 5, 18, 2), (26, 11, 5, 10, 2)]
SS = 8  # supersampling for smooth edges


def draw_mark(d: ImageDraw.ImageDraw, size: int, scale: float) -> None:
    """The mark centred, `scale` = its width as a share of the image."""
    unit = size * scale / 32
    off = (size - 32 * unit) / 2
    for x, y, w, h, r in MARK:
        box = (off + x * unit, off + y * unit, off + (x + w) * unit, off + (y + h) * unit)
        d.rounded_rectangle(box, radius=r * unit, fill=LIME)


def icon(size: int, scale: float, tile: bool) -> Image.Image:
    big = size * SS
    if tile:
        # Favicon: a rounded dark tile with a hairline, so it reads on light and dark tab bars.
        img = Image.new("RGBA", (big, big), (0, 0, 0, 0))
        d = ImageDraw.Draw(img)
        d.rounded_rectangle((0, 0, big - 1, big - 1), radius=big * 0.22, fill=TILE, outline=(42, 49, 58), width=max(SS, big // 48))
    else:
        # Home screen: full bleed; the OS rounds or masks the corners.
        img = Image.new("RGBA", (big, big), BG + (255,))
        d = ImageDraw.Draw(img)
    draw_mark(d, big, scale)
    return img.resize((size, size), Image.LANCZOS)


def save(img: Image.Image, rel: str) -> None:
    dest = OUT / rel
    img.save(dest)
    print(rel, dest.stat().st_size // 1024, "kB")


# 512 is also the maskable icon: the mark stays inside the 80% safe circle.
save(icon(512, 0.6, tile=False).convert("RGB"), "icons/icon-512.png")
save(icon(192, 0.6, tile=False).convert("RGB"), "icons/icon-192.png")
save(icon(180, 0.6, tile=False).convert("RGB"), "icons/apple-touch-icon.png")

fav = [icon(s, 0.78, tile=True) for s in (16, 32, 48)]
fav[2].save(OUT / "favicon.ico", sizes=[(16, 16), (32, 32), (48, 48)], append_images=fav[:2])
print("favicon.ico", (OUT / "favicon.ico").stat().st_size // 1024, "kB")
