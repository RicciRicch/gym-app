"""Cut a character out of a solid blue chroma-key background (Pillow + numpy only).

Usage: python scripts/cutout-chroma.py <in.png> <out.webp> [height=640]

Used for the extra mascot poses (generated on pure blue so no texture model is
needed, unlike scripts/cutout-mascot.py). Blue dominance (b - max(r, g)) drives
the alpha; edge pixels are de-spilled so no blue fringe is left. Also writes a
<out>-dark.jpg preview on the app's background colour.
"""
import sys
import numpy as np
from PIL import Image, ImageFilter

src, out = sys.argv[1], sys.argv[2]
height = int(sys.argv[3]) if len(sys.argv) > 3 else 640

rgb = np.asarray(Image.open(src).convert('RGB')).astype(np.float32)
r, g, b = rgb[..., 0], rgb[..., 1], rgb[..., 2]
dominance = b - np.maximum(r, g)

LO, HI = 12.0, 60.0  # below LO = character, above HI = background
alpha = 1.0 - np.clip((dominance - LO) / (HI - LO), 0.0, 1.0)

# Tighten the matte by a pixel and soften it, to drop the blue halo.
mask = Image.fromarray((alpha * 255).astype(np.uint8)).filter(ImageFilter.MinFilter(3)).filter(ImageFilter.GaussianBlur(0.8))
alpha = np.asarray(mask).astype(np.float32) / 255.0

# De-spill: blue may not exceed the stronger of red/green anywhere on the character.
b = np.minimum(b, np.maximum(r, g) + 4.0)

rgba = np.dstack([r, g, b, alpha * 255.0]).clip(0, 255).astype(np.uint8)
image = Image.fromarray(rgba, 'RGBA')
image = image.crop(image.getchannel('A').point(lambda v: 255 if v > 8 else 0).getbbox())
image = image.resize((round(image.width * height / image.height), height), Image.LANCZOS)
image.save(out, 'WEBP', quality=88, method=6)

preview = Image.new('RGB', image.size, (10, 12, 15))
preview.paste(image, mask=image.getchannel('A'))
preview.save(out.rsplit('.', 1)[0] + '-dark.jpg', quality=85)
print(out, image.size)
