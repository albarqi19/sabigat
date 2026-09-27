# -*- coding: utf-8 -*-
"""Vectorize the Sabigat logo into animatable parts -> ../parts.json + preview.svg

Run from this folder:  python trace.py && python vectorize.py   (then python ../build.py)

Parts (source pixel space of sabigat_logo.png, 337x408):
  pillar            gold   the column, shaped like a qalam nib
  calli[0..3]       gold   the four pieces of the word, in writing order (right to left)
  strokes[0..3]     -      centre-lines + widths used as reveal masks for calli[i]
  dots[0..3]        white  the four diamonds (perfect squares rotated 45deg)
  beam              white  beam + capital + ornaments (rotates about PIVOT)
  panL / panR       white  chains + pans (hang from the knobs, stay upright)
  latin / tagAr / tagEn    lockup text lines
"""
import json
import math
import numpy as np
import cv2
import potrace
from pathlib import Path

HERE = Path(__file__).resolve().parent
K = 8
cov = {n: np.load(HERE / f"cov_{n}.npy") for n in ("gold", "white")}
H, W = cov["gold"].shape
big = {n: cv2.resize(c, (W * K, H * K), interpolation=cv2.INTER_CUBIC) > 0.5 for n, c in cov.items()}


def comps(mask):
    n, lab, stats, _ = cv2.connectedComponentsWithStats(mask.astype(np.uint8), 8)
    out = []
    for i in range(1, n):
        x, y, w, h, area = (stats[i] / [K, K, K, K, K * K]).tolist()
        out.append(dict(i=i, x=x, y=y, w=w, h=h, area=area))
    return lab, out


def fmt(v):
    s = f"{v:.1f}"
    return s[:-2] if s.endswith(".0") else s


def trace(mask, dx=0.0, dy=0.0):
    if not mask.any():
        return ""
    bm = potrace.Bitmap(~mask)  # potracer fills the False pixels
    plist = bm.trace(turdsize=int(3 * K), turnpolicy=potrace.POTRACE_TURNPOLICY_MINORITY,
                     alphamax=1.0, opticurve=True, opttolerance=0.3)
    f = lambda p: f"{fmt(p.x / K - dx)} {fmt(p.y / K - dy)}"
    parts = []
    for curve in plist:
        s = [f"M{f(curve.start_point)}"]
        for seg in curve.segments:
            if seg.is_corner:
                s.append(f"L{f(seg.c)}L{f(seg.end_point)}")
            else:
                s.append(f"C{f(seg.c1)} {f(seg.c2)} {f(seg.end_point)}")
        s.append("Z")
        parts.append("".join(s))
    return "".join(parts)


def select(mask, pred):
    lab, cs = comps(mask)
    m = np.zeros_like(mask)
    for c in cs:
        if pred(c):
            m |= lab == c["i"]
    return m


def boxed(c, x0, y0, x1, y1):
    cx, cy = c["x"] + c["w"] / 2, c["y"] + c["h"] / 2
    return x0 <= cx <= x1 and y0 <= cy <= y1


gold, white = big["gold"], big["white"]
solid = lambda c: c["area"] >= 300  # drops anti-aliasing fringes of the white parts

out = {"viewBox": [0, 0, W, H]}
out["pillar"] = trace(select(gold, lambda c: solid(c) and boxed(c, 140, 40, 190, 145)))

# calligraphy pieces, writing order: right (sa) -> middle (bgha) -> left alef -> ta swash
pieces = [(173, 135, 320, 285, "sa"), (188, 143, 274, 216, "bgha"), (144, 133, 172, 210, "alef"), (16, 199, 161, 274, "ta")]
lab, cs = comps(gold)
calli = []
for x0, y0, x1, y1, name in pieces:
    cand = [c for c in cs if solid(c) and abs(c["x"] - x0) < 3 and abs(c["y"] - y0) < 3]
    assert len(cand) == 1, (name, cand)
    calli.append(trace(lab == cand[0]["i"]))
out["calli"] = calli

# ---- writing strokes: hand-authored centre-lines (see skel_overlay.png) ----
STROKES = [
    # sa: right tooth down, along the bowl, up/down the middle and left teeth, into the alef and up
    [(305, 211), (306.5, 226), (309, 240), (308, 253), (302, 262), (291, 266), (278, 266), (268, 261),
     (265, 250), (264, 234), (265, 250), (262, 265), (251, 272), (240, 270), (233, 262), (229, 248),
     (230, 231), (228, 249), (222, 258), (211, 261), (199, 264), (189, 259), (183, 249), (180, 235),
     (179, 212), (179, 188), (179, 163), (178.5, 146), (178, 134)],
    # bgha: from the top-right stroke down, round the loop, up to the head and its tail
    [(255, 146), (259, 158), (264, 169), (266, 181), (265, 191), (261, 198), (252, 202), (243, 202),
     (235, 196), (229, 188), (224, 180), (220, 172), (213, 166), (204, 166), (196, 171), (189, 180)],
    # left alef, top down
    [(145, 133), (150, 151), (155, 171), (160, 189), (165, 201), (169, 209)],
    # ta: the hook, then the long tail to the left
    [(147, 198), (148.5, 210), (151, 222), (152, 234), (148, 243), (138, 248), (124, 250), (105, 252),
     (85, 253), (65, 253), (50, 254), (38, 256), (28, 261), (21, 267), (16, 274)],
]
EXTRA = {1: [[(227, 186), (219, 194), (211, 199), (202, 202), (192, 205)]]}  # bgha lower tail

dist = cv2.distanceTransform(gold.astype(np.uint8), cv2.DIST_L2, 5) / K


def catmull(pts):
    """polyline -> smooth cubic path through the points (Catmull-Rom, tension 0.5)."""
    P = [pts[0]] + list(pts) + [pts[-1]]
    d = [f"M{fmt(P[1][0])} {fmt(P[1][1])}"]
    for i in range(1, len(P) - 2):
        p0, p1, p2, p3 = P[i - 1], P[i], P[i + 1], P[i + 2]
        c1 = (p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6)
        c2 = (p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6)
        d.append(f"C{fmt(c1[0])} {fmt(c1[1])} {fmt(c2[0])} {fmt(c2[1])} {fmt(p2[0])} {fmt(p2[1])}")
    return "".join(d)


def width_for(pts):
    hw = 0.0
    for (xa, ya), (xb, yb) in zip(pts, pts[1:]):
        for t in np.linspace(0, 1, 12):
            x, y = xa + (xb - xa) * t, ya + (yb - ya) * t
            yy, xx = int(round(y * K)), int(round(x * K))
            win = dist[max(0, yy - 2 * K):yy + 2 * K, max(0, xx - 2 * K):xx + 2 * K]
            if win.size:
                hw = max(hw, float(win.max()))
    return round(2 * hw + 5, 1)


strokes = []
for i, pts in enumerate(STROKES):
    item = [{"d": catmull(pts), "w": width_for(pts)}]
    for extra in EXTRA.get(i, []):
        item.append({"d": catmull(extra), "w": width_for(extra)})
    strokes.append(item)
out["strokes"] = strokes

# ---- diamonds: measured, then drawn as exact squares ----
dots = []
cw = cov["white"]


def measure(x0, y0, x1, y1):
    sub = cw[int(y0):int(y1), int(x0):int(x1)]
    ys, xs = np.mgrid[int(y0):int(y1), int(x0):int(x1)]
    a = sub.sum()
    cx, cy = (xs * sub).sum() / a, (ys * sub).sum() / a
    r = math.sqrt(a) / math.sqrt(2)  # half diagonal of a square of that area
    return cx + 0.5, cy + 0.5, r


for box in [(190, 115, 226, 151), (196, 207, 232, 243), (62, 198, 92.6, 234), (92.6, 198, 124, 234)]:
    cx, cy, r = measure(*box)
    dots.append({"cx": round(cx, 2), "cy": round(cy, 2), "r": round(r, 2),
                 "d": f"M{fmt(cx)} {fmt(cy - r)}L{fmt(cx + r)} {fmt(cy)}L{fmt(cx)} {fmt(cy + r)}L{fmt(cx - r)} {fmt(cy)}Z"})
# order of placement: gha dot (top), ba dot (bottom), then the two dots of ta (right, left)
out["dots"] = [dots[0], dots[1], dots[3], dots[2]]

# ---- scales ----
lab, cs = comps(white)
scale_main = [c for c in cs if c["area"] > 2000 and c["y"] < 30]
assert len(scale_main) == 1
sm = lab == scale_main[0]["i"]
yy, xx = np.mgrid[0:H * K, 0:W * K] / K
beam_mask = sm & ((yy < 40.5) | ((xx > 118) & (xx < 208)))
panL_mask = (sm & ~beam_mask & (xx < 140)) | select(white, lambda c: solid(c) and boxed(c, 60, 110, 120, 130))
panR_mask = (sm & ~beam_mask & (xx > 190)) | select(white, lambda c: solid(c) and boxed(c, 205, 110, 265, 130))
out["beam"] = trace(beam_mask)
out["panL"] = trace(panL_mask)
out["panR"] = trace(panR_mask)


def knob(x0, x1):
    m = sm[:int(40 * K), int(x0 * K):int(x1 * K)]
    ys, xs = np.nonzero(m)
    return round(xs.mean() / K + x0, 2), round(ys.min() / K + 7.2, 2)


out["knobL"], out["knobR"] = knob(80, 100), knob(226, 247)
out["pivot"] = [165.5, 36.5]

# ---- lockup text ----
out["latin"] = trace(select(white, lambda c: c["area"] > 150 and 295 < c["y"] < 305))
out["tagAr"] = trace(select(gold, lambda c: c["y"] > 345 and c["w"] > 2 and c["h"] > 2))
out["tagEn"] = trace(select(white, lambda c: c["y"] > 380 and c["area"] > 12))

json.dump(out, open(HERE.parent / "parts.json", "w", encoding="utf-8"), ensure_ascii=False)
sizes = {k: (len(v) if isinstance(v, str) else len(json.dumps(v))) for k, v in out.items()}
print(json.dumps(sizes, indent=1))
print("knobs", out["knobL"], out["knobR"])
print("dots", [(d["cx"], d["cy"], d["r"]) for d in out["dots"]])
print("strokes w", [[s["w"] for s in item] for item in strokes])

# preview: full lockup + stroke centre-lines
G, WH = "#ab997d", "#ffffff"
svg = [f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W} {H}" width="{W * 3}" height="{H * 3}">',
       f'<rect width="{W}" height="{H}" fill="#37464e"/>',
       f'<path d="{out["pillar"]}" fill="{G}" fill-rule="evenodd"/>']
for p in calli:
    svg.append(f'<path d="{p}" fill="{G}" fill-rule="evenodd"/>')
for d in out["dots"]:
    svg.append(f'<path d="{d["d"]}" fill="{WH}"/>')
for k in ("beam", "panL", "panR"):
    svg.append(f'<path d="{out[k]}" fill="{WH}" fill-rule="evenodd"/>')
svg.append(f'<path d="{out["latin"]}" fill="{WH}" fill-rule="evenodd"/>')
svg.append(f'<path d="{out["tagAr"]}" fill="{G}" fill-rule="evenodd"/>')
svg.append(f'<path d="{out["tagEn"]}" fill="{WH}" fill-rule="evenodd"/>')
svg.append("</svg>")
(HERE / "preview.svg").write_text("".join(svg), encoding="utf-8")
svg2 = svg[:-1]
colors = ["#ff5050", "#50c8ff", "#78ff78", "#ffc83c"]
for i, item in enumerate(strokes):
    for s in item:
        svg2.append(f'<path d="{s["d"]}" fill="none" stroke="{colors[i]}" stroke-opacity=".35" stroke-width="{s["w"]}" stroke-linecap="round" stroke-linejoin="round"/>')
        svg2.append(f'<path d="{s["d"]}" fill="none" stroke="{colors[i]}" stroke-width="1"/>')
svg2.append("</svg>")
(HERE / "preview_strokes.svg").write_text("".join(svg2), encoding="utf-8")
