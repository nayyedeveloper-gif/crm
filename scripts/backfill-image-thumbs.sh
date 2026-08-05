#!/usr/bin/env bash
# Pre-generate *.thumb.jpg beside full images (offline — not on request path).
# Prefer the Java admin endpoint after deploy so resize logic matches the app:
#   POST /api/settings/thumbs/backfill  (ADMIN JWT)
#
# This script is a filesystem fallback using Python Pillow when the API is busy.
set -euo pipefail

SHOWCASE_DIR="${SHOWCASE_DIR:-/var/www/ecommerce/backend/data/showcase}"
PRODUCT_DIR="${PRODUCT_DIR:-/var/www/ecommerce/backend/data/products}"
THUMB_SIZE="${THUMB_SIZE:-480}"
QUALITY="${QUALITY:-82}"

python3 - <<'PY' "$SHOWCASE_DIR" "$PRODUCT_DIR" "$THUMB_SIZE" "$QUALITY"
import os, sys
from pathlib import Path

try:
    from PIL import Image
except ImportError:
    raise SystemExit("Pillow required: pip3 install Pillow")

showcase, products, size_s, quality_s = sys.argv[1:5]
size = int(size_s)
quality = int(quality_s)
BG = (0xF2, 0xF2, 0xF7)

def thumb_path(full: Path) -> Path:
    stem = full.stem
    return full.with_name(stem + ".thumb.jpg")

def to_square(im: Image.Image, box: int) -> Image.Image:
    im = im.convert("RGB")
    canvas = Image.new("RGB", (box, box), BG)
    scale = min(box / im.width, box / im.height)
    w = max(1, round(im.width * scale))
    h = max(1, round(im.height * scale))
    resized = im.resize((w, h), Image.Resampling.LANCZOS)
    canvas.paste(resized, ((box - w) // 2, (box - h) // 2))
    return canvas

def to_offer_thumb(im: Image.Image) -> Image.Image:
    im = im.convert("RGB")
    tw, th = 480, 600
    canvas = Image.new("RGB", (tw, th), BG)
    scale = max(tw / im.width, th / im.height)
    w = max(1, round(im.width * scale))
    h = max(1, round(im.height * scale))
    resized = im.resize((w, h), Image.Resampling.LANCZOS)
    canvas.paste(resized, ((tw - w) // 2, (th - h) // 2))
    return canvas

def backfill(root: Path, offer_aware: bool) -> tuple[int, int, int, int]:
    if not root.is_dir():
        return 0, 0, 0, 0
    scanned = created = skipped = failed = 0
    for p in root.rglob("*"):
        if not p.is_file():
            continue
        name = p.name.lower()
        if name.endswith(".thumb.jpg"):
            continue
        if not name.endswith((".jpg", ".jpeg", ".png", ".webp", ".gif")):
            continue
        scanned += 1
        out = thumb_path(p)
        if out.is_file():
            skipped += 1
            continue
        try:
            with Image.open(p) as im:
                if offer_aware and p.name.lower().startswith("offer-"):
                    thumb = to_offer_thumb(im)
                else:
                    thumb = to_square(im, size)
                thumb.save(out, "JPEG", quality=quality, optimize=True)
            created += 1
        except Exception as ex:
            failed += 1
            print(f"FAIL {p}: {ex}", file=sys.stderr)
        if scanned % 200 == 0:
            print(f"… {root.name}: scanned={scanned} created={created} skipped={skipped} failed={failed}")
    return scanned, created, skipped, failed

for label, path, offer in (
    ("showcase", Path(showcase), False),
    ("products", Path(products), True),
):
    s, c, k, f = backfill(path, offer)
    print(f"{label}: scanned={s} created={c} skipped={k} failed={f}")
PY
