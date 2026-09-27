# -*- coding: utf-8 -*-
"""أصول صفحة الدخول في الرائد (tenants.login_theme لشركة 414) بهوية الموقع.

- assets/img/portal-logo.svg : الشعار أفقيا للأسطح الداكنة (logo_dark_url): العلامة يمينا،
  و«سابغات / للحلول القانونية» بخط IBM Plex يسارها، كترويسة الموقع. النص خطوط متجهة
  (HarfBuzz + fontTools) فلا يعتمد على خط في جهاز الزائر.
- assets/img/portal-bg.svg   : خلفية اللوحة وصفحة الهبوط (background_url): كحلي الهوية ونسيج
  حلقات الزرد (الدروع السابغات) بالذهبي الخافت، واسم «سابغات» محفورا في الزاوية.

التشغيل من هذا المجلد:  python portal.py
"""
import json
from pathlib import Path

import uharfbuzz as hb
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen
from fontTools.ttLib import TTFont

HERE = Path(__file__).resolve().parent
OUT = HERE.parent.parent / "assets" / "img"
P = json.loads((HERE.parent / "parts.json").read_text(encoding="utf-8"))
FONTS = Path("C:/laragon/www/law-firm-backend/law-firm-mobile/node_modules/@expo-google-fonts/ibm-plex-sans-arabic")
BOLD = FONTS / "700Bold" / "IBMPlexSansArabic_700Bold.ttf"
MEDIUM = FONTS / "500Medium" / "IBMPlexSansArabic_500Medium.ttf"

SLATE, BRASS, BRASS_L, CREAM, WHITE = "#37464e", "#ab997d", "#c9b894", "#f8f6f1", "#ffffff"
MARK_BOX = (14, 21, 308, 265)


def fmt(v):
    s = f"{v:.1f}"
    return s[:-2] if s.endswith(".0") else s


def text_path(font_file, text, size, right, baseline):
    """نص عربي مشكل بخطوط متجهة، محاذاته إلى اليمين عند right. يعيد (d, العرض)."""
    tt = TTFont(str(font_file))
    gs = tt.getGlyphSet()
    face = hb.Face(hb.Blob.from_file_path(str(font_file)))
    font = hb.Font(face)
    buf = hb.Buffer()
    buf.add_str(text)
    buf.guess_segment_properties()
    hb.shape(font, buf, {"kern": True, "liga": True})
    s = size / face.upem
    width = sum(p.x_advance for p in buf.glyph_positions) * s
    x = right - width
    cmds = []
    for info, pos in zip(buf.glyph_infos, buf.glyph_positions):   # ترتيب بصري من اليسار
        pen = SVGPathPen(gs, ntos=fmt)
        gs[tt.getGlyphName(info.codepoint)].draw(
            TransformPen(pen, (s, 0, 0, -s, x + pos.x_offset * s, baseline - pos.y_offset * s)))
        cmds.append(pen.getCommands())
        x += pos.x_advance * s
    return "".join(cmds), width


def mark_group(dx, dy):
    """العلامة بألوانها الأصلية للأسطح الداكنة، منقولة بمقدار (dx, dy)."""
    white = [P["beam"], P["panL"], P["panR"]] + [d["d"] for d in P["dots"]]
    gold = [P["pillar"]] + P["calli"]
    return (f'<g transform="translate({fmt(dx)} {fmt(dy)})" fill-rule="evenodd">'
            f'<path fill="{WHITE}" d="{"".join(white)}"/>'
            f'<path fill="{BRASS}" d="{"".join(gold)}"/></g>')


def logo():
    mw, mh = MARK_BOX[2], MARK_BOX[3]
    gap, name_size, tag_size = 44, 124, 56
    name_base, tag_base = 150, 238
    name_d, name_w = text_path(BOLD, "سابغات", name_size, 0, name_base)
    tag_d, tag_w = text_path(MEDIUM, "للحلول القانونية", tag_size, 0, tag_base)
    text_w = max(name_w, tag_w)
    W = round(text_w + gap + mw + 8)
    H = mh + 8
    right = W - mw - gap - 4
    name_d, _ = text_path(BOLD, "سابغات", name_size, right, name_base)
    tag_d, _ = text_path(MEDIUM, "للحلول القانونية", tag_size, right, tag_base)
    svg = (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W} {H}" width="{W}" height="{H}" role="img">'
           f'<title>سابغات للحلول القانونية</title>'
           f'{mark_group(W - mw - 4 - MARK_BOX[0], 4 - MARK_BOX[1])}'
           f'<path fill="{CREAM}" d="{name_d}"/>'
           f'<path fill="{BRASS_L}" d="{tag_d}"/></svg>')
    (OUT / "portal-logo.svg").write_text(svg, encoding="utf-8")
    return W, H, len(svg)


def background():
    """1200×1200 تغطي اللوحة بـ background-size: cover. حلقات الزرد صفوف متداخلة مائلة بالتناوب."""
    S = 1200
    s, R = 44, 26          # المسافة بين الحلقات ونصف قطرها
    row = s * 0.52
    ring = lambda cx, cy, tilt: (f'<ellipse cx="{fmt(cx)}" cy="{fmt(cy)}" rx="{R}" ry="{fmt(R * 0.78)}" '
                                 f'transform="rotate({tilt} {fmt(cx)} {fmt(cy)})"/>')
    tile_w, tile_h = s, row * 2
    tile = ring(0, 0, -28) + ring(s, 0, -28) + ring(s / 2, row, 28) + ring(0, 2 * row, -28) + ring(s, 2 * row, -28)
    calli = "".join(P["calli"]) + "".join(d["d"] for d in P["dots"])
    # «سابغات» محفورة في الزاوية السفلى اليسرى: حد خافت وتعبئة أخفت
    cx0, cy0, cw = 12, 112, 312
    scale = 2.3
    tx, ty = -60, S - 176 * scale + 40
    svg = (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {S} {S}" width="{S}" height="{S}">'
           f'<defs><pattern id="zrd" width="{fmt(tile_w)}" height="{fmt(tile_h)}" patternUnits="userSpaceOnUse">'
           f'<g fill="none" stroke="{BRASS}" stroke-width="1.1">{tile}</g></pattern>'
           f'<radialGradient id="fade" cx="0.62" cy="0.3" r="0.75">'
           f'<stop offset="0" stop-color="#fff" stop-opacity="0.35"/><stop offset="1" stop-color="#fff" stop-opacity="1"/></radialGradient>'
           f'<mask id="m"><rect width="{S}" height="{S}" fill="url(#fade)"/></mask></defs>'
           f'<rect width="{S}" height="{S}" fill="{SLATE}"/>'
           f'<rect width="{S}" height="{S}" fill="url(#zrd)" opacity="0.2" mask="url(#m)"/>'
           f'<g transform="translate({fmt(tx - cx0 * scale)} {fmt(ty - cy0 * scale)}) scale({scale})" '
           f'fill="{BRASS}" fill-opacity="0.07" stroke="{BRASS}" stroke-opacity="0.28" stroke-width="0.6" fill-rule="evenodd">'
           f'<path d="{calli}"/></g></svg>')
    (OUT / "portal-bg.svg").write_text(svg, encoding="utf-8")
    return len(svg)


if __name__ == "__main__":
    w, h, n = logo()
    print(f"portal-logo.svg {w}x{h} ({w / h:.2f}:1) {n // 1024}K")
    print(f"portal-bg.svg {background() // 1024}K")
