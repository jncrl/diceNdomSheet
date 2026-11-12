"""Generate PWA icons. Run: python3 scripts/make-icons.py"""
from PIL import Image, ImageDraw

BG = (16, 27, 31)
BONE = (233, 228, 214)
TEAL = (95, 179, 161)
BRASS = (217, 164, 65)
S = 1024

def draw(maskable: bool) -> Image.Image:
    img = Image.new("RGBA", (S, S), BG)
    d = ImageDraw.Draw(img)
    # maskable icons keep content inside the central 80% safe zone
    k = 0.72 if maskable else 0.84
    cx, cy = S / 2, S / 2 + 20
    w, h = S * k * 0.5, S * k * 0.34
    # open book: two page quads meeting at a spine
    left = [(cx, cy - h), (cx - w, cy - h * 0.72), (cx - w, cy + h * 0.78), (cx, cy + h)]
    right = [(cx, cy - h), (cx + w, cy - h * 0.72), (cx + w, cy + h * 0.78), (cx, cy + h)]
    d.polygon(left, fill=BONE)
    d.polygon(right, fill=BONE)
    d.line([(cx, cy - h), (cx, cy + h)], fill=BG, width=14)
    # text lines on pages
    for i in range(4):
        y = cy - h * 0.45 + i * h * 0.34
        d.line([(cx - w * 0.82, y - 14 * (1 - 0)), (cx - w * 0.14, y + 12)], fill=TEAL, width=16)
        d.line([(cx + w * 0.14, y + 12), (cx + w * 0.82, y - 14)], fill=TEAL, width=16)
    # brass diamond marker above the spine
    r = S * k * 0.07
    dy = cy - h - r * 1.5
    d.polygon([(cx, dy - r), (cx + r, dy), (cx, dy + r), (cx - r, dy)], fill=BRASS)
    return img

def save(img, name, size):
    img.resize((size, size), Image.LANCZOS).convert("RGB").save(f"public/icons/{name}.png", optimize=True)

normal, mask = draw(False), draw(True)
save(normal, "icon-192", 192)
save(normal, "icon-512", 512)
save(mask, "maskable-512", 512)

svg = """<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024">
<rect width="1024" height="1024" rx="180" fill="#101b1f"/>
<g transform="translate(512 532)">
<path d="M0-174L-215-125V133L0 174Z" fill="#e9e4d6"/>
<path d="M0-174L215-125V133L0 174Z" fill="#e9e4d6"/>
<path d="M0-174V174" stroke="#101b1f" stroke-width="14"/>
<path d="M-176-78L-30-66M-176-8L-30 4M-176 62L-30 74M176-78L30-66M176-8L30 4M176 62L30 74" stroke="#5fb3a1" stroke-width="16" stroke-linecap="round"/>
<path d="M0-262L60-202L0-142L-60-202Z" fill="#d9a441"/>
</g></svg>"""
open("public/icons/icon.svg", "w").write(svg)
print("icons written")
