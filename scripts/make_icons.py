#!/usr/bin/env python3
"""Generate Cord Tycoon PWA icons with no third-party deps (raw PNG encoder).

Draws a stylized electrical socket: navy background, glowing yellow socket
face with two prong slots and a ground hole. Outputs 192, 512, and a
maskable 512 (content kept inside the safe zone).

Also emits the iOS source assets (`assets/icon.png`, `assets/splash.png`)
consumed by `npx @capacitor/assets generate --ios` in the Codemagic build:
a 1024x1024 opaque App Store marketing icon and a CRT-dark (#070a0f)
splash with the socket logo centered."""
import struct
import zlib
import math
import os

OUT = os.path.join(os.path.dirname(__file__), "..", "icons")
ASSETS = os.path.join(os.path.dirname(__file__), "..", "assets")

BG_TOP = (0x15, 0x21, 0x3a)
BG_BOT = (0x0e, 0x17, 0x26)
YELLOW = (0xff, 0xd3, 0x4e)
YELLOW_HI = (0xff, 0xe9, 0xa8)
DARK = (0x14, 0x1c, 0x2c)
CRT_BG = (0x07, 0x0a, 0x0f)  # #070a0f — the app's CRT-dark background


def lerp(a, b, t):
    return tuple(int(a[i] + (b[i] - a[i]) * t) for i in range(3))


def write_png(path, pixels, w, h):
    """pixels: flat list of (r,g,b,a) tuples, row-major."""
    raw = bytearray()
    for y in range(h):
        raw.append(0)  # filter type 0
        for x in range(w):
            r, g, b, a = pixels[y * w + x]
            raw += bytes((r, g, b, a))

    def chunk(tag, data):
        c = struct.pack(">I", len(data)) + tag + data
        c += struct.pack(">I", zlib.crc32(tag + data) & 0xFFFFFFFF)
        return c

    sig = b"\x89PNG\r\n\x1a\n"
    ihdr = struct.pack(">IIBBBBB", w, h, 8, 6, 0, 0, 0)  # 8-bit RGBA
    idat = zlib.compress(bytes(raw), 9)
    with open(path, "wb") as f:
        f.write(sig + chunk(b"IHDR", ihdr) + chunk(b"IDAT", idat) + chunk(b"IEND", b""))


def rounded_rect_alpha(px, py, cx, cy, hw, hh, r):
    """Soft alpha coverage for a rounded rectangle centered at (cx,cy)."""
    dx = abs(px - cx) - (hw - r)
    dy = abs(py - cy) - (hh - r)
    dx = max(dx, 0.0)
    dy = max(dy, 0.0)
    dist = math.hypot(dx, dy) - r
    return clamp01(0.5 - dist)  # ~1px antialias


def circle_alpha(px, py, cx, cy, r):
    dist = math.hypot(px - cx, py - cy) - r
    return clamp01(0.5 - dist)


def clamp01(v):
    return 0.0 if v < 0 else 1.0 if v > 1 else v


def blend(dst, src, a):
    return tuple(int(dst[i] + (src[i] - dst[i]) * a) for i in range(3))


def draw(size, maskable=False):
    w = h = size
    pixels = [None] * (w * h)
    cx = cy = size / 2.0
    # maskable: shrink content to ~78% so it survives platform masking
    scale = 0.78 if maskable else 1.0

    bg_radius = size * 0.5
    corner = size * 0.22  # rounded square background (non-maskable look)
    face_r = size * 0.30 * scale
    glow_r = face_r * 1.18

    # socket slot geometry (relative to face)
    slot_hw = face_r * 0.10
    slot_hh = face_r * 0.42
    slot_off = face_r * 0.34
    slot_y = cy - face_r * 0.08
    slot_r = slot_hw
    ground_r = face_r * 0.13
    ground_y = cy + face_r * 0.48

    for y in range(h):
        for x in range(w):
            # vertical gradient background
            t = y / (h - 1)
            base = lerp(BG_TOP, BG_BOT, t)

            if maskable:
                col = base  # full-bleed background for maskable
            else:
                # rounded-square plate, transparent outside
                a_plate = rounded_rect_alpha(x, y, cx, cy, bg_radius, bg_radius, corner)
                col = base

            # outer glow halo
            ga = circle_alpha(x, y, cx, cy, glow_r)
            if ga > 0:
                col = blend(col, YELLOW, ga * 0.18)

            # socket face (yellow disc with subtle top highlight)
            fa = circle_alpha(x, y, cx, cy, face_r)
            if fa > 0:
                hi = clamp01(1.0 - (y - (cy - face_r)) / (2 * face_r))
                face_col = lerp(YELLOW, YELLOW_HI, hi * 0.5)
                col = blend(col, face_col, fa)

                # two prong slots
                sa_l = rounded_rect_alpha(x, y, cx - slot_off, slot_y, slot_hw, slot_hh, slot_r)
                sa_r = rounded_rect_alpha(x, y, cx + slot_off, slot_y, slot_hw, slot_hh, slot_r)
                ca = circle_alpha(x, y, cx, ground_y, ground_r)
                slot = max(sa_l, sa_r, ca)
                if slot > 0:
                    col = blend(col, DARK, slot * fa)

            if maskable:
                pixels[y * w + x] = (col[0], col[1], col[2], 255)
            else:
                alpha = int(round(a_plate * 255))
                pixels[y * w + x] = (col[0], col[1], col[2], alpha)

    return pixels, w, h


def draw_logo(pixels, w, cx, cy, face_r):
    """Composite the yellow socket logo (glow, face, slots) onto an existing
    opaque pixel buffer, centered at (cx,cy) with the given face radius.
    `pixels` is a flat list of (r,g,b,a) tuples that is mutated in place."""
    glow_r = face_r * 1.18
    slot_hw = face_r * 0.10
    slot_hh = face_r * 0.42
    slot_off = face_r * 0.34
    slot_y = cy - face_r * 0.08
    slot_r = slot_hw
    ground_r = face_r * 0.13
    ground_y = cy + face_r * 0.48

    # only scan the bounding box the logo can touch (keeps big splashes fast)
    x0 = max(0, int(cx - glow_r - 2))
    x1 = min(w - 1, int(cx + glow_r + 2))
    y0 = max(0, int(cy - glow_r - 2))
    y1 = min((len(pixels) // w) - 1, int(cy + glow_r + 2))

    for y in range(y0, y1 + 1):
        for x in range(x0, x1 + 1):
            idx = y * w + x
            r, g, b, a = pixels[idx]
            col = (r, g, b)

            ga = circle_alpha(x, y, cx, cy, glow_r)
            if ga > 0:
                col = blend(col, YELLOW, ga * 0.18)

            fa = circle_alpha(x, y, cx, cy, face_r)
            if fa > 0:
                hi = clamp01(1.0 - (y - (cy - face_r)) / (2 * face_r))
                face_col = lerp(YELLOW, YELLOW_HI, hi * 0.5)
                col = blend(col, face_col, fa)

                sa_l = rounded_rect_alpha(x, y, cx - slot_off, slot_y, slot_hw, slot_hh, slot_r)
                sa_r = rounded_rect_alpha(x, y, cx + slot_off, slot_y, slot_hw, slot_hh, slot_r)
                ca = circle_alpha(x, y, cx, ground_y, ground_r)
                slot = max(sa_l, sa_r, ca)
                if slot > 0:
                    col = blend(col, DARK, slot * fa)

            pixels[idx] = (col[0], col[1], col[2], 255)


def draw_marketing(size):
    """1024x1024 App Store marketing icon: opaque CRT-dark plate with the
    socket logo filling most of the square (no rounded corners or alpha —
    Apple masks the corners and rejects transparency on the marketing icon)."""
    w = h = size
    pixels = [(CRT_BG[0], CRT_BG[1], CRT_BG[2], 255)] * (w * h)
    draw_logo(pixels, w, size / 2.0, size / 2.0, size * 0.30)
    return pixels, w, h


def draw_splash(size):
    """Square CRT-dark splash with a smaller centered logo, sized for
    @capacitor/assets (it crops this to each device's launch image)."""
    w = h = size
    pixels = [(CRT_BG[0], CRT_BG[1], CRT_BG[2], 255)] * (w * h)
    draw_logo(pixels, w, size / 2.0, size / 2.0, size * 0.14)
    return pixels, w, h


def main():
    os.makedirs(OUT, exist_ok=True)
    for size, name, mask in [
        (192, "icon-192.png", False),
        (512, "icon-512.png", False),
        (512, "icon-maskable-512.png", True),
    ]:
        px, w, h = draw(size, mask)
        path = os.path.join(OUT, name)
        write_png(path, px, w, h)
        print("wrote", path)

    # iOS source assets for `npx @capacitor/assets generate --ios`.
    os.makedirs(ASSETS, exist_ok=True)
    px, w, h = draw_marketing(1024)
    icon_path = os.path.join(ASSETS, "icon.png")
    write_png(icon_path, px, w, h)
    print("wrote", icon_path)

    px, w, h = draw_splash(2732)
    splash_path = os.path.join(ASSETS, "splash.png")
    write_png(splash_path, px, w, h)
    print("wrote", splash_path)


if __name__ == "__main__":
    main()
