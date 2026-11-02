"""QWQ роботы суреттері: жасыл фонды алып тастау (chroma key) → мөлдір WebP, 512px, ≤100 КБ.
Қолдану: python tools/robot_key.py  (images/robot/src/*.jfif → images/robot/*.webp)
"""
import glob, io, os
import numpy as np
from PIL import Image, ImageFilter

SRC, OUT, SIZE, MAX = "images/robot/src", "images/robot", 512, 100 * 1024
LO, HI = 28, 110          # «жасылдық» (G − max(R,B)) шегі: LO-дан төмен — робот, HI-дан жоғары — фон


def key(path, name=""):
    a = np.asarray(Image.open(path).convert("RGB")).astype(np.float32)
    r, g, b = a[..., 0], a[..., 1], a[..., 2]
    green = g - np.maximum(r, b)
    alpha = np.clip((HI - green) / (HI - LO), 0, 1)
    # жиекті жұмсарту: 1px ішке қысып, сосын сәл бұлдырату (жасыл «ореол» қалмайды)
    al = Image.fromarray((alpha * 255).astype(np.uint8), "L").filter(ImageFilter.MinFilter(3)).filter(ImageFilter.GaussianBlur(0.8))
    alpha = np.asarray(al).astype(np.float32) / 255
    # жасыл шағылыстарды тазалау (despill): G арнасы R мен B-ның үлкенінен аспасын
    g2 = np.minimum(g, np.maximum(r, b) + 4)
    # жартылай мөлдір жиектерде қалған жасыл түсті бейтарап сұрға жақындатамыз
    edge = (alpha > 0) & (alpha < 0.98)
    lum = 0.3 * r + 0.59 * g2 + 0.11 * b
    mix = np.where(edge, 0.35, 0.0)
    R, G, B = r * (1 - mix) + lum * mix, g2 * (1 - mix) + lum * mix, b * (1 - mix) + lum * mix
    if name == "type":
        # ноутбук — мөлдір шыны: оның ішінен көрінетін жасыл фон (жасылдығы ≈35–105, таза фоннан әлсіз) тесік болмасын,
        # жартылай мөлдір көгілдір шынымен толтырамыз (тек ноутбук аймағында)
        H, W = green.shape
        yy, xx = np.mgrid[0:H, 0:W]
        box = (xx > W * 0.50) & (xx < W * 0.92) & (yy > H * 0.54) & (yy < H * 0.80)
        glass = box & (green >= 35) & (green < 105)
        soft = np.asarray(Image.fromarray((glass * 255).astype(np.uint8), "L").filter(ImageFilter.GaussianBlur(1.2))).astype(np.float32) / 255
        t = soft * 0.75                                   # шыны түсінің үлесі
        R, G, B = R * (1 - t) + 150 * t, G * (1 - t) + 222 * t, B * (1 - t) + 238 * t
        alpha = np.maximum(alpha, soft * 0.5)             # ≈50% мөлдір шыны
    out = np.stack([R, G, B, alpha * 255], -1)
    im = Image.fromarray(np.clip(out, 0, 255).astype(np.uint8), "RGBA")
    # premultiplied кішірейту: жиекте қараңғы/жасыл жолақ болмайды
    return im.convert("RGBa").resize((SIZE, SIZE), Image.LANCZOS).convert("RGBA")


def save(im, path):
    for q in (86, 80, 74, 68, 60, 52):
        buf = io.BytesIO()
        im.save(buf, "WEBP", quality=q, alpha_quality=90, method=6)
        if buf.tell() <= MAX:
            break
    open(path, "wb").write(buf.getvalue())
    return q, buf.tell()


if __name__ == "__main__":
    for f in sorted(glob.glob(os.path.join(SRC, "*.jfif"))):
        name = os.path.splitext(os.path.basename(f))[0]
        q, n = save(key(f, name), os.path.join(OUT, name + ".webp"))
        print(f"{name}.webp  q={q}  {n / 1024:.1f} КБ")
