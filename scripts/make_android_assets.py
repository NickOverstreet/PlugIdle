#!/usr/bin/env python3
"""Generate Android launcher icons from the PlugIdle socket art (no deps).

Reuses the raw PNG encoder + drawing primitives in make_icons.py to render,
for every density bucket:
  - ic_launcher.png            legacy icon (rounded-square plate, like the PWA icon)
  - ic_launcher_round.png      circle-masked full-bleed variant
  - ic_launcher_foreground.png adaptive-icon foreground (socket on transparency,
                               sized to the 66/108dp safe zone)

The adaptive background color lives in res/values/ic_launcher_background.xml.
Run from anywhere: python3 scripts/make_android_assets.py
"""
import math
import os

import make_icons as mi

RES = os.path.join(os.path.dirname(__file__), "..", "android", "app", "src", "main", "res")

# density bucket -> (legacy/round size in px, adaptive foreground size in px)
DENSITIES = {
    "mdpi": (48, 108),
    "hdpi": (72, 162),
    "xhdpi": (96, 216),
    "xxhdpi": (144, 324),
    "xxxhdpi": (192, 432),
}


def draw(size, mode):
    """mode: 'plate' (rounded square), 'round' (circle mask), 'foreground'
    (transparent background, content inside the adaptive safe zone)."""
    w = h = size
    pixels = [None] * (w * h)
    cx = cy = size / 2.0

    # foreground content must fit the 66dp safe zone of the 108dp canvas;
    # the glow halo is the outermost element (face_r * 1.18)
    face_r = size * (0.24 if mode == "foreground" else 0.30)
    glow_r = face_r * 1.18
    corner = size * 0.22

    slot_hw = face_r * 0.10
    slot_hh = face_r * 0.42
    slot_off = face_r * 0.34
    slot_y = cy - face_r * 0.08
    ground_r = face_r * 0.13
    ground_y = cy + face_r * 0.48

    for y in range(h):
        for x in range(w):
            t = y / (h - 1)
            base = mi.lerp(mi.BG_TOP, mi.BG_BOT, t)

            if mode == "plate":
                a_bg = mi.rounded_rect_alpha(x, y, cx, cy, size / 2, size / 2, corner)
            elif mode == "round":
                a_bg = mi.circle_alpha(x, y, cx, cy, size / 2)
            else:
                a_bg = 0.0

            col = base
            cov = a_bg  # accumulated coverage for the alpha channel

            ga = mi.circle_alpha(x, y, cx, cy, glow_r)
            if ga > 0:
                col = mi.blend(col, mi.YELLOW, ga * 0.18)
                cov = max(cov, ga * (0.18 if mode == "foreground" else 0.0))

            fa = mi.circle_alpha(x, y, cx, cy, face_r)
            if fa > 0:
                hi = mi.clamp01(1.0 - (y - (cy - face_r)) / (2 * face_r))
                face_col = mi.lerp(mi.YELLOW, mi.YELLOW_HI, hi * 0.5)
                col = mi.blend(col, face_col, fa)
                cov = max(cov, fa)

                sa_l = mi.rounded_rect_alpha(x, y, cx - slot_off, slot_y, slot_hw, slot_hh, slot_hw)
                sa_r = mi.rounded_rect_alpha(x, y, cx + slot_off, slot_y, slot_hw, slot_hh, slot_hw)
                ca = mi.circle_alpha(x, y, cx, ground_y, ground_r)
                slot = max(sa_l, sa_r, ca)
                if slot > 0:
                    col = mi.blend(col, mi.DARK, slot * fa)

            pixels[y * w + x] = (col[0], col[1], col[2], int(round(cov * 255)))

    return pixels, w, h


def main():
    for bucket, (icon_px, fg_px) in DENSITIES.items():
        outdir = os.path.join(RES, f"mipmap-{bucket}")
        os.makedirs(outdir, exist_ok=True)
        for name, size, mode in [
            ("ic_launcher.png", icon_px, "plate"),
            ("ic_launcher_round.png", icon_px, "round"),
            ("ic_launcher_foreground.png", fg_px, "foreground"),
        ]:
            px, w, h = draw(size, mode)
            path = os.path.join(outdir, name)
            mi.write_png(path, px, w, h)
            print("wrote", path)


if __name__ == "__main__":
    main()
