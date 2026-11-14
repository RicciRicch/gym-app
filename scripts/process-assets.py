"""Convert approved Higgsfield PNGs into the app's WebP assets and PWA icons.

Usage: python scripts/process-assets.py <dir-with-pngs>
Expects <slug>.png for each exercise, mascot.png, avatar-1..4.png and icon.png.
"""
import sys
from pathlib import Path

from PIL import Image

SRC = Path(sys.argv[1])
OUT = Path(__file__).resolve().parent.parent / "public"
EXERCISES = [
    "bench-press", "squat", "deadlift", "overhead-press", "barbell-row", "pull-up",
    "lat-pulldown", "dumbbell-curl", "triceps-pushdown", "leg-press", "romanian-deadlift",
    "lateral-raise",
]


def load(name: str) -> Image.Image:
    return Image.open(SRC / f"{name}.png").convert("RGB")


def webp(img: Image.Image, size: int, dest: Path) -> None:
    dest.parent.mkdir(parents=True, exist_ok=True)
    img.resize((size, size), Image.LANCZOS).save(dest, "WEBP", quality=80, method=6)
    print(dest.relative_to(OUT.parent), dest.stat().st_size // 1024, "kB")


def center_crop(img: Image.Image, frac: float) -> Image.Image:
    w, h = img.size
    s = int(min(w, h) * frac)
    left, top = (w - s) // 2, (h - s) // 2
    return img.crop((left, top, left + s, top + s))


for slug in EXERCISES:
    if not (SRC / f"{slug}.png").exists():
        print("skip (missing):", slug)
        continue
    webp(load(slug), 768, OUT / "assets" / "exercises" / f"{slug}.webp")
webp(load("mascot"), 640, OUT / "assets" / "mascot.webp")
for i in range(1, 5):
    webp(load(f"avatar-{i}"), 320, OUT / "assets" / "avatars" / f"avatar-{i}.webp")

# Icons: the dark background fills the square, so the same art works as maskable
# (the dumbbell sits inside the central safe zone).
icon = center_crop(load("icon"), 0.82)
icons = OUT / "icons"
icons.mkdir(parents=True, exist_ok=True)
for size, name in [(192, "icon-192.png"), (512, "icon-512.png"), (180, "apple-touch-icon.png")]:
    icon.resize((size, size), Image.LANCZOS).save(icons / name, optimize=True)
    print(f"public/icons/{name}")
icon.resize((48, 48), Image.LANCZOS).save(OUT / "favicon.ico", sizes=[(16, 16), (32, 32), (48, 48)])
print("public/favicon.ico")
