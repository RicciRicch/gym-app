"""Cut the mascot out of its grey studio background (no extra dependencies).

Usage: python scripts/cutout-mascot.py <mascot.png> 3.0 <out.png> 150 7
  3.0  local-texture threshold: the background is smooth grey, fur is textured
  150  min size of an enclosed smooth patch (floor between the legs) to drop
  7    mask erosion (MinFilter size) to remove the grey halo

Tuned once for the current mascot (job a5a34a94); the result was trimmed and
saved as public/assets/mascot.webp (RGBA, 451x640). Also writes -dark/-light
preview JPEGs next to the output.
"""
import sys
import numpy as np
from PIL import Image, ImageFilter
from collections import deque

src = sys.argv[1]
im = Image.open(src).convert('RGB')
S = 512  # work on a smaller copy for the mask, then upscale
small = im.resize((S, S), Image.LANCZOS)
a = np.asarray(small).astype(np.float32)

# Fit a quadratic background model to a border band.
yy, xx = np.mgrid[0:S, 0:S] / S
band = np.zeros((S, S), bool); b = 12
band[:b] = band[-b:] = True; band[:, :b] = band[:, -b:] = True
feats = lambda x, y: np.stack([np.ones_like(x), x, y, x*x, y*y, x*y], -1)
F = feats(xx[band], yy[band])
bg = np.zeros_like(a)
for c in range(3):
    coef, *_ = np.linalg.lstsq(F, a[..., c][band], rcond=None)
    bg[..., c] = feats(xx, yy) @ coef
diff = np.sqrt(((a - bg) ** 2).sum(-1))
sat = a.max(-1) - a.min(-1)
lum = a.mean(-1)
def box(x, r):
    c = np.cumsum(np.cumsum(np.pad(x, ((r+1, r), (r+1, r)), mode='edge'), 0), 1)
    k = 2*r+1
    return (c[k:, k:] - c[:-k, k:] - c[k:, :-k] + c[:-k, :-k]) / (k*k)
r = 3
std = np.sqrt(np.maximum(box(lum*lum, r) - box(lum, r)**2, 0))
np.save('cutout/std.npy', std)
bglike = (std < float(sys.argv[2])) & (sat < 20) & (diff < 45)

# Flood fill background from the border through background-like pixels.
mask_bg = np.zeros((S, S), bool)
q = deque()
for i in range(S):
    for p in [(0, i), (S-1, i), (i, 0), (i, S-1)]:
        if bglike[p] and not mask_bg[p]:
            mask_bg[p] = True; q.append(p)
while q:
    y, x = q.popleft()
    for dy, dx in ((1,0),(-1,0),(0,1),(0,-1)):
        ny, nx = y+dy, x+dx
        if 0 <= ny < S and 0 <= nx < S and not mask_bg[ny, nx] and bglike[ny, nx]:
            mask_bg[ny, nx] = True; q.append((ny, nx))

# Large smooth grey regions enclosed by the figure (floor between the legs).
seen = mask_bg.copy()
for y0 in range(S):
    for x0 in range(S):
        if bglike[y0, x0] and not seen[y0, x0]:
            comp = [(y0, x0)]; seen[y0, x0] = True; i = 0
            while i < len(comp):
                y, x = comp[i]; i += 1
                for dy, dx in ((1,0),(-1,0),(0,1),(0,-1)):
                    ny, nx = y+dy, x+dx
                    if 0 <= ny < S and 0 <= nx < S and not seen[ny, nx] and bglike[ny, nx]:
                        seen[ny, nx] = True; comp.append((ny, nx))
            ys, xs = zip(*comp)
            if len(comp) > int(sys.argv[4]) and min(ys) > 0.8 * S and 0.42 * S < sum(xs) / len(xs) < 0.58 * S:
                mask_bg[list(ys), list(xs)] = True

fg = (~mask_bg).astype(np.uint8) * 255
m = Image.fromarray(fg).filter(ImageFilter.MedianFilter(5)).filter(ImageFilter.MinFilter(int(sys.argv[5])))
m = m.resize(im.size, Image.LANCZOS).filter(ImageFilter.GaussianBlur(2))
out = im.convert('RGBA'); out.putalpha(m)
out.save(sys.argv[3])
# previews on app background and on white
for name, col in (('dark', (11, 13, 16)), ('light', (240, 240, 240))):
    canvas = Image.new('RGBA', im.size, col + (255,)); canvas.alpha_composite(out)
    canvas.convert('RGB').resize((512, 512), Image.LANCZOS).save(sys.argv[3].replace('.png', f'-{name}.jpg'), quality=85)
print('fg fraction', (fg > 0).mean())
