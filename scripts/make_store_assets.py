#!/usr/bin/env python3
"""Generate Play Store marketing assets with no third-party deps.

Renders the 1024x500 feature graphic: CRT-dark gradient with scanlines, the
glowing socket on the left, and pixel-font title + tagline on the right.
The 512px store icon already exists (icons/icon-maskable-512.png is full-bleed,
which is what the Play listing wants).

Run from anywhere: python3 scripts/make_store_assets.py
"""
import os

import make_icons as mi

OUT = os.path.join(os.path.dirname(__file__), "..", "store")

GREEN = (0x3D, 0xFC, 0x6B)
SHADOW = (0x04, 0x06, 0x09)

# 5x7 pixel font (uppercase + a few marks), in the spirit of the CRT theme
FONT = {
    'A': ["01110","10001","10001","11111","10001","10001","10001"],
    'B': ["11110","10001","10001","11110","10001","10001","11110"],
    'C': ["01110","10001","10000","10000","10000","10001","01110"],
    'D': ["11110","10001","10001","10001","10001","10001","11110"],
    'E': ["11111","10000","10000","11110","10000","10000","11111"],
    'F': ["11111","10000","10000","11110","10000","10000","10000"],
    'G': ["01110","10001","10000","10111","10001","10001","01111"],
    'H': ["10001","10001","10001","11111","10001","10001","10001"],
    'I': ["11111","00100","00100","00100","00100","00100","11111"],
    'J': ["00111","00010","00010","00010","00010","10010","01100"],
    'K': ["10001","10010","10100","11000","10100","10010","10001"],
    'L': ["10000","10000","10000","10000","10000","10000","11111"],
    'M': ["10001","11011","10101","10101","10001","10001","10001"],
    'N': ["10001","11001","11001","10101","10011","10011","10001"],
    'O': ["01110","10001","10001","10001","10001","10001","01110"],
    'P': ["11110","10001","10001","11110","10000","10000","10000"],
    'Q': ["01110","10001","10001","10001","10101","10010","01101"],
    'R': ["11110","10001","10001","11110","10100","10010","10001"],
    'S': ["01111","10000","10000","01110","00001","00001","11110"],
    'T': ["11111","00100","00100","00100","00100","00100","00100"],
    'U': ["10001","10001","10001","10001","10001","10001","01110"],
    'V': ["10001","10001","10001","10001","10001","01010","00100"],
    'W': ["10001","10001","10001","10101","10101","11011","10001"],
    'X': ["10001","10001","01010","00100","01010","10001","10001"],
    'Y': ["10001","10001","01010","00100","00100","00100","00100"],
    'Z': ["11111","00001","00010","00100","01000","10000","11111"],
    ' ': ["00000","00000","00000","00000","00000","00000","00000"],
    '-': ["00000","00000","00000","01110","00000","00000","00000"],
    '.': ["00000","00000","00000","00000","00000","00100","00100"],
    '!': ["00100","00100","00100","00100","00100","00000","00100"],
}


def draw_text(pixels, w, h, x0, y0, text, scale, color, shadow=True):
    for ci, ch in enumerate(text.upper()):
        glyph = FONT.get(ch, FONT[' '])
        gx = x0 + ci * 6 * scale
        for ry, row in enumerate(glyph):
            for rx, bit in enumerate(row):
                if bit != '1':
                    continue
                for sy in range(scale):
                    for sx in range(scale):
                        px = gx + rx * scale + sx
                        py = y0 + ry * scale + sy
                        if shadow:
                            spx, spy = px + scale, py + scale
                            if 0 <= spx < w and 0 <= spy < h:
                                idx = spy * w + spx
                                if pixels[idx][:3] != color:
                                    pixels[idx] = (*SHADOW, 255)
                        if 0 <= px < w and 0 <= py < h:
                            pixels[py * w + px] = (*color, 255)


def text_width(text, scale):
    return (len(text) * 6 - 1) * scale


def draw_socket(pixels, w, h, cx, cy, face_r):
    glow_r = face_r * 1.18
    slot_hw = face_r * 0.10
    slot_hh = face_r * 0.42
    slot_off = face_r * 0.34
    slot_y = cy - face_r * 0.08
    ground_r = face_r * 0.13
    ground_y = cy + face_r * 0.48

    x_min = max(0, int(cx - glow_r) - 2)
    x_max = min(w, int(cx + glow_r) + 2)
    y_min = max(0, int(cy - glow_r) - 2)
    y_max = min(h, int(cy + glow_r) + 2)
    for y in range(y_min, y_max):
        for x in range(x_min, x_max):
            col = pixels[y * w + x][:3]
            ga = mi.circle_alpha(x, y, cx, cy, glow_r)
            if ga <= 0:
                continue
            col = mi.blend(col, mi.YELLOW, ga * 0.18)
            fa = mi.circle_alpha(x, y, cx, cy, face_r)
            if fa > 0:
                hi = mi.clamp01(1.0 - (y - (cy - face_r)) / (2 * face_r))
                face_col = mi.lerp(mi.YELLOW, mi.YELLOW_HI, hi * 0.5)
                col = mi.blend(col, face_col, fa)
                sa_l = mi.rounded_rect_alpha(x, y, cx - slot_off, slot_y, slot_hw, slot_hh, slot_hw)
                sa_r = mi.rounded_rect_alpha(x, y, cx + slot_off, slot_y, slot_hw, slot_hh, slot_hw)
                ca = mi.circle_alpha(x, y, cx, ground_y, ground_r)
                slot = max(sa_l, sa_r, ca)
                if slot > 0:
                    col = mi.blend(col, mi.DARK, slot * fa)
            pixels[y * w + x] = (*col, 255)


def feature_graphic(w=1024, h=500):
    pixels = [None] * (w * h)
    for y in range(h):
        base = mi.lerp(mi.BG_TOP, mi.BG_BOT, y / (h - 1))
        if y % 4 == 3:  # CRT scanline
            base = tuple(int(c * 0.82) for c in base)
        for x in range(w):
            pixels[y * w + x] = (*base, 255)

    draw_socket(pixels, w, h, cx=210.0, cy=250.0, face_r=132.0)

    title, t_scale = "PLUGIDLE", 12
    tx = 400 + (584 - text_width(title, t_scale)) // 2
    draw_text(pixels, w, h, tx, 130, title, t_scale, mi.YELLOW)

    for i, line in enumerate(["AN IDLE GAME ABOUT", "PLUGGING IN CORDS"]):
        s = 5
        lx = 400 + (584 - text_width(line, s)) // 2
        draw_text(pixels, w, h, lx, 270 + i * 55, line, s, GREEN)

    return pixels, w, h


def main():
    os.makedirs(OUT, exist_ok=True)
    px, w, h = feature_graphic()
    path = os.path.join(OUT, "feature-graphic.png")
    mi.write_png(path, px, w, h)
    print("wrote", path)


if __name__ == "__main__":
    main()
