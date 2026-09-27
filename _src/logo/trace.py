# -*- coding: utf-8 -*-
"""Trace the Sabigat logo into clean vector layers.

Each pixel of the source is a mix of the slate background and ONE foreground
colour (gold or white), so the coverage of each layer is recovered by
projecting the pixel onto the bg->fg segment. The coverage map is upscaled
(cubic), thresholded at 0.5 and traced with potrace, which gives smooth
curves with real corners (diamonds, beam ends).
"""
import json
import numpy as np
import cv2
import potrace
from PIL import Image
from pathlib import Path

HERE = Path(__file__).resolve().parent
SRC = Path("C:/laragon/www/law-firm-backend/شركات/سابغات/sabigat_logo.png")
K = 8  # upscale factor

rgb = np.asarray(Image.open(SRC).convert("RGB")).astype(np.float32)
H, W = rgb.shape[:2]
BG = np.array([55, 70, 78], np.float32)
FG = {"gold": np.array([171, 153, 125], np.float32),
      "white": np.array([250, 250, 250], np.float32)}


def coverage(fg):
    d = fg - BG
    t = ((rgb - BG) * d).sum(-1) / (d * d).sum()
    # distance from the bg->fg line: pixels of the OTHER colour are far from it
    proj = BG + np.clip(t, 0, 1)[..., None] * d
    off = np.sqrt(((rgb - proj) ** 2).sum(-1))
    t = np.clip(t, 0, 1)
    t[off > 38] = 0
    return t


def trace(mask):
    """mask: bool array at K scale -> list of subpaths (svg d strings, in source px)."""
    bm = potrace.Bitmap(mask)
    plist = bm.trace(turdsize=int(4 * K), turnpolicy=potrace.POTRACE_TURNPOLICY_MINORITY,
                     alphamax=1.0, opticurve=True, opttolerance=0.25)
    out = []
    for curve in plist:
        f = lambda p: f"{p.x / K:.2f} {p.y / K:.2f}".replace(".00", "")
        parts = [f"M{f(curve.start_point)}"]
        for seg in curve.segments:
            if seg.is_corner:
                parts.append(f"L{f(seg.c)}L{f(seg.end_point)}")
            else:
                parts.append(f"C{f(seg.c1)} {f(seg.c2)} {f(seg.end_point)}")
        parts.append("Z")
        out.append("".join(parts))
    return out


def up(cov):
    big = cv2.resize(cov, (W * K, H * K), interpolation=cv2.INTER_CUBIC)
    return big > 0.5


layers = {}
for name, fg in FG.items():
    cov = coverage(fg)
    np.save(HERE / f"cov_{name}.npy", cov)
    layers[name] = up(cov)

# connected components -> boxes, to split the layers into parts
report = {}
for name, m in layers.items():
    n, lab, stats, cent = cv2.connectedComponentsWithStats(m.astype(np.uint8), 8)
    comps = []
    for i in range(1, n):
        x, y, w, h, area = stats[i]
        if area < 30 * K * K / 4:
            continue
        comps.append({"i": i, "box": [round(x / K, 1), round(y / K, 1), round(w / K, 1), round(h / K, 1)],
                      "area": int(area / K / K)})
    comps.sort(key=lambda c: (c["box"][1], c["box"][0]))
    report[name] = comps
    np.save(HERE / f"lab_{name}.npy", lab)
print(json.dumps(report, ensure_ascii=False, indent=1))
