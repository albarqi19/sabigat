# -*- coding: utf-8 -*-
"""يبني صفحات موقع سابغات من _src إلى جذر website.

- layout.html الإطار المشترك (الترويسة والقائمة والتذييل)، و pages/*.html محتوى كل صفحة.
- parts.json أجزاء الشعار متجهة (مستخرجة من sabigat_logo.png): منها يبنى assets/img/sprite.svg
  والشعار المتحرك في الرئيسية (القلم يكتب الاسم، ثم النقاط، ثم يستقر الميزان).
- يزال التشكيل من كل المخرجات (قرار المالك: لا تشكيل في أي نص عربي).

التشغيل من جذر website:  python _src/build.py
بعد تغيير CSS أو JS أو الشعار ارفع V ليتجاوز كاش المتصفح.
"""
import json
import re
from pathlib import Path

SRC = Path(__file__).resolve().parent
OUT = SRC.parent
V = "2"
P = json.loads((SRC / "parts.json").read_text(encoding="utf-8"))

AR_DIGITS = str.maketrans("0123456789", "٠١٢٣٤٥٦٧٨٩")
TASHKEEL = re.compile("[\u064B-\u0652\u0670\u0640]")

# مربعات القص بوحدات صورة الشعار الأصلية (337×408)
MARK_BOX = (14, 21, 308, 265)     # الشعار: الميزان والقلم والاسم والنقاط
CALLI_BOX = (12, 112, 312, 176)   # الاسم ونقاطه وحدها
SCALE_BOX = (50, 8, 226, 146)     # الميزان والعمود، بهامش لتأرجح الكفتين
PEN_BOX = (12, 40, 184, 240)      # القلم وذيل التاء ونقطتاها
vb = lambda b: " ".join(str(v) for v in b)

G = 'style="fill:var(--mg,#ab997d)"'
W = 'style="fill:var(--mw,#fff)"'


def part(pid, d, style):
    return f'<g id="{pid}"><path d="{d}" fill-rule="evenodd" pathLength="1" {style}/></g>'


# ---------------------------------------------------------------- الأيقونات
# خطية، بلون النص، وكل مسار pathLength=1 لترسم نفسها عبر CSS
ICONS = {
    "i-arrow": ("0 0 24 24", ["M19 12H5", "M11 6l-6 6 6 6"]),
    "i-up": ("0 0 24 24", ["M12 19V5", "M6 11l6-6 6 6"]),
    "i-copy": ("0 0 24 24", ["M9 9h10v10H9z", "M5 15V5h10"]),
    "i-check": ("0 0 24 24", ["M5 12.5l4.5 4.5L19 7.5"]),
    "i-building": ("0 0 48 48", ["M6 42h36", "M10 42V8h20v34", "M30 18h8v24",
                                 "M16 15h3M22 15h3M16 22h3M22 22h3M16 29h3M22 29h3", "M18 42v-6h5v6", "M34 25v2M34 32v2"]),
    "i-hands": ("0 0 48 48", ["M24 21.5c-1.7-3.4-7.5-3.4-7.5 1.3 0 3.7 7.5 8.4 7.5 8.4s7.5-4.7 7.5-8.4c0-4.7-5.8-4.7-7.5-1.3Z",
                              "M5 27l6.5 8.5c1.6 2 3.8 3 6.4 3H24", "M43 27l-6.5 8.5c-1.6 2-3.8 3-6.4 3H24",
                              "M11 23v-7", "M37 23v-7"]),
    "i-gavel": ("0 0 48 48", ["M13.5 19.5l9-9 9 9-9 9z", "M16.5 13.5l12 12M19.5 10.5l12 12",
                              "M27 24l13 13", "M7 42h18", "M9.5 37.5h13"]),
    "i-seal": ("0 0 48 48", ["M11 6h19l8 8v28H11z", "M30 6v8h8", "M17 18h14M17 24h14M17 30h7",
                             "M34 38.5a4.5 4.5 0 1 0-.01 0", "M31.5 42l-1.5 4 4-1.8 4 1.8-1.5-4"]),
}


def build_sprite():
    defs = [part("p-pillar", P["pillar"], G), part("p-beam", P["beam"], W),
            part("p-panL", P["panL"], W), part("p-panR", P["panR"], W)]
    defs += [part(f"p-c{i}", d, G) for i, d in enumerate(P["calli"])]
    defs += [part(f"p-d{i}", d["d"], W) for i, d in enumerate(P["dots"])]
    uses = lambda ids: "".join(f'<use href="#{i}"/>' for i in ids)
    calli_ids = [f"p-c{i}" for i in range(4)] + [f"p-d{i}" for i in range(4)]
    syms = [f'<symbol id="mark" viewBox="{vb(MARK_BOX)}">{uses(["p-panL", "p-panR", "p-beam", "p-pillar"] + calli_ids)}</symbol>',
            f'<symbol id="calli" viewBox="{vb(CALLI_BOX)}">{uses(calli_ids)}</symbol>']
    for iid, (box, paths) in ICONS.items():
        body = "".join(f'<path d="{d}" pathLength="1"/>' for d in paths)
        syms.append(f'<symbol id="{iid}" viewBox="{box}" fill="none" stroke="currentColor" '
                    f'stroke-linecap="round" stroke-linejoin="round">{body}</symbol>')
    svg = ('<svg xmlns="http://www.w3.org/2000/svg">'
           f'<defs>{"".join(defs)}</defs>{"".join(syms)}</svg>')
    (OUT / "assets/img/sprite.svg").write_text(svg, encoding="utf-8")
    return len(svg)


def fly_html():
    """الشعار المتحرك في الرئيسية: أجزاء منفصلة، وأقنعة الكتابة لكل قطعة من الاسم."""
    masks = []
    for i, strokes in enumerate(P["strokes"]):
        paths = "".join(f'<path class="wm" d="{s["d"]}" fill="none" stroke="#fff" stroke-width="{s["w"]}" '
                        f'stroke-linecap="round" stroke-linejoin="round"/>' for s in strokes)
        masks.append(f'<mask id="wm{i}" maskUnits="userSpaceOnUse" x="0" y="0" width="337" height="408">{paths}</mask>')
    calli = "".join(f'<path class="mk-c" d="{d}" fill-rule="evenodd" mask="url(#wm{i})"/>' for i, d in enumerate(P["calli"]))
    dots = "".join(f'<path class="mk-dot" d="{d["d"]}" data-cx="{d["cx"]}" data-cy="{d["cy"]}"/>' for d in P["dots"])
    kl, kr, pv = P["knobL"], P["knobR"], P["pivot"]
    return f"""  <div class="fly" aria-hidden="true">
    <svg class="fly__svg" viewBox="{vb(MARK_BOX)}" focusable="false" data-pivot="{pv[0]} {pv[1]}" data-knobs="{kl[0]} {kl[1]} {kr[0]} {kr[1]}">
      <defs>{"".join(masks)}</defs>
      <g class="mk-scale">
        <g class="mk-panL"><path d="{P["panL"]}" fill-rule="evenodd"/></g>
        <g class="mk-panR"><path d="{P["panR"]}" fill-rule="evenodd"/></g>
        <g class="mk-beam"><path d="{P["beam"]}" fill-rule="evenodd"/></g>
      </g>
      <path class="mk-pillar" d="{P["pillar"]}" fill-rule="evenodd"/>
      <g class="mk-calli">{calli}</g>
      <g class="mk-dots">{dots}</g>
    </svg>
  </div>
"""


# ---------------------------------------------------------------- الصفحات
NAV = [("home", "index.html", "الرئيسية"), ("about", "about.html", "لماذا سابغات"),
       ("services", "services.html", "خدماتنا"), ("contact", "contact.html", "تواصل معنا")]
# بوابة الدخول في الرائد: نطاق الشركة نفسه (الدخول من جذر المنصة لا يمر إلا لمالك الشركة).
# للعملاء والموظفين معا: صفحة دخول واحدة برقم الهوية والرقم السري.
PORTAL = "https://www-sabigat-com.alraedlaw.com/login"

CTAS = {
    "home": ("اطلب خدمتك القانونية اليوم", "أخبرنا باحتياجك، وسيتواصل معك المختص من فريق سابغات.", "mail"),
    "about": ("جاهزون لخدمتك", "أخبرنا باحتياجك، وسيتواصل معك المختص من فريق سابغات.", "services"),
    "services": ("لم تجد خدمتك؟ اسألنا", "تغطي خبراتنا مجالات أوسع مما يعرض هنا، راسلنا وسيوجهك المختص.", "mail"),
}

JSONLD = """  <script type="application/ld+json">
  {
    "@context": "https://schema.org",
    "@type": "LegalService",
    "@id": "https://sabigat.com/#organization",
    "name": "سابغات للحلول القانونية",
    "alternateName": "Sabighat for Legal Solutions",
    "url": "https://sabigat.com/",
    "logo": "https://sabigat.com/assets/img/og-image.png",
    "image": "https://sabigat.com/assets/img/og-image.png",
    "email": "info@sabigat.com",
    "areaServed": "SA"
  }
  </script>
  <!-- TODO: من العميل — رقم الترخيص (identifier) ورقم الهاتف والعنوان الوطني لإكمال JSON-LD -->
"""

PAGES = [
    dict(key="home", file="index.html", title="سابغات للحلول القانونية | محاماة واستشارات وتوثيق",
         desc="شركة سابغات للحلول القانونية، نخبة من الخبراء والمستشارين في أعمال المنازعات وخدمات المنشآت والقطاع غير الربحي وأعمال التوثيق داخل المملكة وخارجها.",
         og="نخبة من الخبراء والمستشارين في أعمال المنازعات وخدمات المنشآت والقطاع غير الربحي وأعمال التوثيق.",
         canon="https://sabigat.com/"),
    dict(key="about", file="about.html", title="لماذا سابغات | سابغات للحلول القانونية",
         desc="تعرف على شركة سابغات للحلول القانونية: رؤيتنا وقيمنا وهدفنا، ومسارات خبرتنا في الدراسات والاستشارات والمنازعات والكيانات، وفريق العمل من المستشارين والمحامين.",
         og="رؤيتنا وقيمنا ومسارات خبرتنا وفريق العمل من المستشارين والمحامين.",
         canon="https://sabigat.com/about"),
    dict(key="services", file="services.html", title="خدماتنا | سابغات للحلول القانونية",
         desc="خدمات سابغات القانونية: المنشآت والكيانات، القطاع غير الربحي، أعمال المنازعات والتحكيم، وأعمال التوثيق، تغطية قانونية شاملة للأفراد والمنشآت.",
         og="المنشآت والكيانات، القطاع غير الربحي، أعمال المنازعات والتحكيم، وأعمال التوثيق.",
         canon="https://sabigat.com/services"),
    dict(key="contact", file="contact.html", title="تواصل معنا | سابغات للحلول القانونية",
         desc="اطلب خدمتك القانونية من سابغات، راسلنا عبر البريد الإلكتروني أو ادخل بوابة العملاء على منصة سابغات لمتابعة طلباتك وقضاياك.",
         og="اطلب خدمتك القانونية من سابغات، عبر البريد الإلكتروني أو بوابة العملاء.",
         canon="https://sabigat.com/contact"),
    dict(key="404", file="404.html", title="الصفحة غير موجودة | سابغات للحلول القانونية",
         desc="الصفحة التي تبحث عنها غير موجودة، عد إلى الرئيسية أو استعرض خدماتنا.",
         og="الصفحة التي تبحث عنها غير موجودة.", canon="https://sabigat.com/404"),
]


def nav_html(key, b):
    rows = []
    for k, href, label in NAV:
        cur = ' aria-current="page"' if k == key else ""
        rows.append(f'          <li><a href="{b}{href}"{cur}>{label}</a></li>')
    rows.append(f'          <li><a href="{PORTAL}">بوابة العملاء</a></li>')
    return "\n".join(rows)


def menu_html(key, b):
    rows = []
    for i, (k, href, label) in enumerate(NAV, 1):
        cur = ' aria-current="page"' if k == key else ""
        rows.append(f'        <li style="--i:{i}"><a href="{b}{href}"{cur}><i>{str(i).translate(AR_DIGITS)}</i>{label}</a></li>')
    return "\n".join(rows)


def cta_html(key, sprite):
    if key not in CTAS:
        return ""
    title, lead, second = CTAS[key]
    if second == "mail":
        b2 = '<a class="btn btn--line" href="mailto:info@sabigat.com"><span dir="ltr">info@sabigat.com</span></a>'
    else:
        b2 = '<a class="btn btn--line" href="services.html"><span>استعرض خدماتنا</span></a>'
    return f"""    <!-- ================= دعوة ختامية ================= -->
    <section class="cta sec">
      <div class="wrap cta__in">
        <p class="eyebrow" data-rise>ابدأ الآن</p>
        <h2 class="h2 cta__t" data-words>{title}</h2>
        <span class="cta__rule" aria-hidden="true"></span>
        <p class="lead" data-rise>{lead}</p>
        <div class="cta__actions" data-rise>
          <a class="btn btn--slate" href="contact.html"><span>اطلب خدمة</span><svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><use href="{sprite}#i-arrow"/></svg></a>
          {b2}
        </div>
      </div>
    </section>"""


def counts(html):
    """يكتب عدد خدمات كل فئة في ملخصها بدل {{COUNT}}."""
    def one(m):
        n = m.group(0).count("<li>")
        return m.group(0).replace("{{COUNT}}", f"{str(n).translate(AR_DIGITS)} خدمات")
    return re.sub(r"<details.*?</details>", one, html, flags=re.S)


def main():
    size = build_sprite()
    layout = (SRC / "layout.html").read_text(encoding="utf-8")
    report = [f"sprite.svg {size // 1024}K"]
    for pg in PAGES:
        key = pg["key"]
        b = "/" if key == "404" else ""
        sprite = f"{b}assets/img/sprite.svg?v={V}"
        body = (SRC / "pages" / f"{key}.html").read_text(encoding="utf-8")
        body = body.replace("{{CTA}}", cta_html(key, sprite))
        body = counts(body)
        html = layout.replace("{{MAIN}}", body.rstrip("\n"))
        rep = {
            "TITLE": pg["title"], "DESC": pg["desc"], "OG_DESC": pg["og"], "CANON": pg["canon"],
            "ROBOTS": '  <meta name="robots" content="noindex">\n' if key == "404" else "",
            "JSONLD": JSONLD if key == "home" else "",
            "FLY": fly_html() if key == "home" else "",
            "PAGE": key, "NAV": nav_html(key, b), "MENU": menu_html(key, b),
            "B": b, "V": V, "SPRITE": sprite, "PORTAL": PORTAL,
            "MARK_W": str(MARK_BOX[2]), "MARK_H": str(MARK_BOX[3]),
            "CALLI_W": str(CALLI_BOX[2]), "CALLI_H": str(CALLI_BOX[3]),
            "SCALE_VB": vb(SCALE_BOX), "PEN_VB": vb(PEN_BOX),
        }
        for k, v in rep.items():
            html = html.replace("{{" + k + "}}", v)
        left = re.findall(r"\{\{[A-Z_]+\}\}", html)
        assert not left, (key, left)
        html = TASHKEEL.sub("", html)
        (OUT / pg["file"]).write_text(html, encoding="utf-8")
        report.append(f'{pg["file"]} {len(html.encode("utf-8")) // 1024}K')
    print(" · ".join(report))


if __name__ == "__main__":
    main()
