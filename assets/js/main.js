/* ==========================================================================
   سابغات للحلول القانونية — الحركة والتفاعل
   GSAP + ScrollTrigger + Lenis (محلية في assets/js/vendor)
   تحسين تدريجي: المحتوى كله في HTML، وبلا جافاسكربت أو مع تقليل الحركة يظهر ثابتا.
   لا مؤشر يتبع الفأرة: الحركة مع التمرير والدخول فقط.
   ========================================================================== */
(function () {
  'use strict';

  var doc = document, root = doc.documentElement, body = doc.body;
  root.classList.add('ready');
  var RM = root.classList.contains('rm');
  var HAS = typeof window.gsap !== 'undefined' && typeof window.ScrollTrigger !== 'undefined';
  var ANIM = HAS && !RM;
  if (!HAS && !RM) root.classList.add('static');

  var page = (body.className.match(/\bp-([\w-]+)/) || [])[1] || '';
  var $ = function (s, c) { return (c || doc).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || doc).querySelectorAll(s)); };
  var mq = function (q) { return window.matchMedia(q).matches; };
  var clamp = function (v, a, b) { return Math.max(a, Math.min(b, v)); };
  var lenis = null;
  var bootT = Date.now();
  var D0 = root.classList.contains('is-arriving') ? 0.6 : 0.1;
  var d0 = function () { return Date.now() - bootT < 1500 ? D0 : 0; };

  /* ميزان الشعار: محور العاتق ومعلقا الكفتين (بوحدات صورة الشعار الأصلية) */
  var PIVOT = [165.5, 36.5];
  var KNOBS = [[91.54, 32.7], [234.64, 32.7]];

  /* يدير العاتق حول المحور، والكفتان تتبعان طرفيه وتبقيان معلقتين عموديا */
  function balancer(beam, panL, panR) {
    var o = { a: 0 };
    o.apply = function () {
      var r = o.a * Math.PI / 180, c = Math.cos(r), s = Math.sin(r);
      beam.setAttribute('transform', 'rotate(' + o.a.toFixed(3) + ' ' + PIVOT[0] + ' ' + PIVOT[1] + ')');
      [[panL, KNOBS[0]], [panR, KNOBS[1]]].forEach(function (p) {
        var dx = p[1][0] - PIVOT[0], dy = p[1][1] - PIVOT[1];
        var nx = PIVOT[0] + dx * c - dy * s, ny = PIVOT[1] + dx * s + dy * c;
        p[0].setAttribute('transform', 'translate(' + (nx - p[1][0]).toFixed(2) + ' ' + (ny - p[1][1]).toFixed(2) + ')');
      });
    };
    return o;
  }

  /* ---------------------------------------------------------------- دائما */
  year();
  menu();
  copyButtons();
  serviceForm();
  tabs();
  accordions();
  transitions();
  header();

  if (!ANIM) {
    panes(false);
    serviceIndex(false);
    return;
  }

  gsap.registerPlugin(ScrollTrigger);
  ScrollTrigger.config({ ignoreMobileResize: true });
  lenis = smooth();
  anchors();
  splitHeadings();
  scrubText();

  var mesh = heroMesh();
  if (page === 'home') heroIntro(mesh);
  reveals();
  layers();
  links();
  panes(true);
  stackCards();
  serviceIndex(true);
  arts();

  var fontsReady = doc.fonts && doc.fonts.ready ? doc.fonts.ready : Promise.resolve();
  fontsReady.then(function () {
    ScrollTrigger.refresh();
    handleHash();
  });

  /* ================================================================ الأساسيات */
  function year() {
    $$('[data-year]').forEach(function (el) { el.textContent = new Date().getFullYear(); });
  }

  function header() {
    var h = $('.hdr'), bar = $('.hdr__progress');
    if (!h) return;
    var queued = false;
    function update() {
      queued = false;
      var y = window.scrollY || root.scrollTop;
      h.classList.toggle('is-solid', y > 12);
      if (bar) {
        var max = root.scrollHeight - window.innerHeight;
        bar.style.transform = 'scaleX(' + (max > 0 ? clamp(y / max, 0, 1) : 0) + ')';
      }
    }
    window.addEventListener('scroll', function () {
      if (!queued) { queued = true; requestAnimationFrame(update); }
    }, { passive: true });
    update();
  }

  function menu() {
    var btn = $('.burger'), m = $('#menu');
    if (!btn || !m) return;
    function set(open) {
      root.classList.toggle('menu-open', open);
      btn.setAttribute('aria-expanded', open ? 'true' : 'false');
      btn.setAttribute('aria-label', open ? 'إغلاق القائمة' : 'فتح القائمة');
      if (open) m.removeAttribute('inert'); else m.setAttribute('inert', '');
      if (lenis) { if (open) lenis.stop(); else lenis.start(); }
    }
    btn.addEventListener('click', function () { set(!root.classList.contains('menu-open')); });
    doc.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && root.classList.contains('menu-open')) { set(false); btn.focus(); }
    });
    $$('a', m).forEach(function (a) { a.addEventListener('click', function () { set(false); }); });
    window.addEventListener('resize', function () {
      if (window.innerWidth > 980 && root.classList.contains('menu-open')) set(false);
    });
  }

  function copyButtons() {
    $$('[data-copy]').forEach(function (b) {
      var label = $('span', b), use = $('use', b);
      var href = use ? use.getAttribute('href') : '';
      function done() {
        b.classList.add('is-done');
        if (label) label.textContent = 'تم النسخ';
        if (use) use.setAttribute('href', href.split('#')[0] + '#i-check');
        setTimeout(function () {
          b.classList.remove('is-done');
          if (label) label.textContent = 'نسخ';
          if (use) use.setAttribute('href', href);
        }, 2200);
      }
      function fallback(text) {
        var t = doc.createElement('textarea');
        t.value = text; t.setAttribute('readonly', '');
        t.style.position = 'fixed'; t.style.opacity = '0';
        body.appendChild(t); t.select();
        try { if (doc.execCommand('copy')) done(); } catch (e) { /* يبقى الرابط للنسخ اليدوي */ }
        body.removeChild(t);
      }
      b.addEventListener('click', function () {
        var text = b.getAttribute('data-copy');
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(text).then(done, function () { fallback(text); });
        } else fallback(text);
      });
    });
  }

  /* نموذج «اطلب خدمة»: يجهز رسالة بريد ويفتح برنامج البريد */
  function serviceForm() {
    var f = $('#service-form');
    if (!f) return;
    f.addEventListener('submit', function (e) {
      e.preventDefault();
      var v = function (id) { var el = doc.getElementById(id); return el ? el.value.trim() : ''; };
      var pick = $('input[name="service"]:checked', f);
      var service = pick ? pick.value : '';
      var subject = 'طلب خدمة: ' + (service || 'عام');
      var text =
        'الاسم: ' + v('f-name') + '\n' +
        'الجوال: ' + v('f-phone') + '\n' +
        'البريد: ' + v('f-email') + '\n' +
        'الخدمة المطلوبة: ' + service + '\n\n' +
        'تفاصيل الطلب:\n' + v('f-message');
      window.location.href = 'mailto:info@sabigat.com?subject=' + encodeURIComponent(subject) +
        '&body=' + encodeURIComponent(text);
      var note = doc.getElementById('form-done');
      if (note) note.hidden = false;
    });
  }

  /* مسارات الخبرة: تبويبات تبنى من العناوين (بلا جافاسكربت تظهر الثلاثة متتالية) */
  function tabs() {
    $$('[data-tabs]').forEach(function (wrap) {
      var panels = $$('.tabs__panel', wrap);
      if (panels.length < 2) return;
      var nav = doc.createElement('div');
      nav.className = 'tabs__nav';
      nav.setAttribute('role', 'tablist');
      nav.setAttribute('aria-label', 'مسارات الخبرة');
      var current = -1;
      var btns = panels.map(function (p, i) {
        var t = $('.tabs__t', p), n = $('.tabs__n', t);
        var num = n ? n.textContent : '';
        var b = doc.createElement('button');
        b.type = 'button';
        b.className = 'tabs__btn';
        b.id = p.id + '-tab';
        b.setAttribute('role', 'tab');
        b.setAttribute('aria-controls', p.id);
        b.innerHTML = '<i>' + num + '</i><span></span>';
        b.lastChild.textContent = t.textContent.replace(num, '').trim();
        p.setAttribute('role', 'tabpanel');
        p.setAttribute('aria-labelledby', b.id);
        p.setAttribute('tabindex', '0');
        b.addEventListener('click', function () { select(i, true); });
        b.addEventListener('keydown', function (e) {
          var j = null, L = panels.length;
          if (e.key === 'ArrowLeft') j = (i + 1) % L;          /* في RTL اليسار هو التالي */
          if (e.key === 'ArrowRight') j = (i - 1 + L) % L;
          if (e.key === 'Home') j = 0;
          if (e.key === 'End') j = L - 1;
          if (j !== null) { e.preventDefault(); select(j, true); btns[j].focus(); }
        });
        nav.appendChild(b);
        return b;
      });
      wrap.insertBefore(nav, panels[0]);
      wrap.classList.add('is-on');
      function select(i, animate) {
        if (i === current) return;
        current = i;
        btns.forEach(function (b, j) {
          b.setAttribute('aria-selected', j === i ? 'true' : 'false');
          b.tabIndex = j === i ? 0 : -1;
        });
        panels.forEach(function (p, j) { p.hidden = j !== i; });
        if (animate && ANIM) {
          gsap.fromTo($$('.tabs__d, li', panels[i]), { opacity: 0, y: 14 },
            { opacity: 1, y: 0, duration: 0.5, stagger: 0.035, ease: 'power2.out', overwrite: true });
          refreshSoon();
        }
      }
      select(0, false);
    });
  }

  /* فئات الخدمات: details أصلية، ومع الحركة تفتح وتغلق بانسياب */
  function accordions() {
    $$('details.cat').forEach(function (d) {
      var s = $('summary', d), list = $('ul', d);
      if (!s || !list) return;
      s.addEventListener('click', function (e) {
        if (!ANIM) return;
        e.preventDefault();
        if (d.open) {
          d.classList.add('is-closing');
          gsap.to(list, {
            height: 0, opacity: 0, duration: 0.45, ease: 'power2.inOut', overwrite: true,
            onComplete: function () {
              d.open = false;
              d.classList.remove('is-closing');
              gsap.set(list, { clearProps: 'height,opacity' });
              refreshSoon();
            }
          });
        } else {
          d.open = true;
          gsap.fromTo(list, { height: 0, opacity: 0 }, {
            height: 'auto', opacity: 1, duration: 0.55, ease: 'power2.out', overwrite: true,
            onComplete: function () { gsap.set(list, { clearProps: 'height,opacity' }); refreshSoon(); }
          });
          gsap.fromTo($$('li', list), { opacity: 0, y: 10 },
            { opacity: 1, y: 0, duration: 0.4, stagger: 0.03, delay: 0.08, ease: 'power2.out' });
        }
      });
    });
  }

  var refreshTimer;
  function refreshSoon() {
    clearTimeout(refreshTimer);
    refreshTimer = setTimeout(function () { ScrollTrigger.refresh(); }, 120);
  }

  /* الانتقال بين الصفحات: ستارة تغطي ثم تنسحب في الصفحة الجديدة (CSS) */
  function transitions() {
    if (RM) return;
    doc.addEventListener('click', function (e) {
      var a = e.target.closest ? e.target.closest('a') : null;
      if (!a || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      if ((a.target && a.target !== '_self') || a.hasAttribute('download')) return;
      var href = a.getAttribute('href') || '';
      if (!href || href.charAt(0) === '#' || /^(mailto|tel):/i.test(href)) return;
      var url = new URL(a.href, location.href);
      if (url.origin !== location.origin) return;
      if (url.pathname === location.pathname && url.hash) return;
      e.preventDefault();
      try { sessionStorage.setItem('sg-nav', '1'); } catch (err) { /* بلا ستارة في الصفحة التالية */ }
      root.classList.add('is-leaving');
      setTimeout(function () { location.href = url.href; }, 560);
    });
    window.addEventListener('pageshow', function (e) {
      if (e.persisted) root.classList.remove('is-leaving', 'is-arriving');
    });
  }

  /* ================================================================ التمرير */
  function smooth() {
    if (typeof window.Lenis === 'undefined') return null;
    var l = new window.Lenis({ duration: 1.1, smoothWheel: true });
    l.on('scroll', ScrollTrigger.update);
    gsap.ticker.add(function (t) { l.raf(t * 1000); });
    gsap.ticker.lagSmoothing(0);
    window.__lenis = l;
    return l;
  }

  function offsetTop() {
    var off = ($('.hdr') ? $('.hdr').offsetHeight : 80) + 18;
    var idx = $('.svc__index');
    if (idx && mq('(max-width: 900px)')) off += idx.offsetHeight;
    return off;
  }

  function goTo(target, immediate) {
    if (target === 0) {
      if (lenis) lenis.scrollTo(0, { immediate: !!immediate }); else window.scrollTo(0, 0);
      return;
    }
    if (lenis) lenis.scrollTo(target, { offset: -offsetTop(), immediate: !!immediate, duration: 1.3 });
    else window.scrollTo(0, target.getBoundingClientRect().top + window.scrollY - offsetTop());
  }

  function anchors() {
    doc.addEventListener('click', function (e) {
      var a = e.target.closest ? e.target.closest('a[href*="#"]') : null;
      if (!a || e.defaultPrevented) return;
      var url = new URL(a.href, location.href);
      if (url.pathname !== location.pathname || !url.hash) return;
      var id = decodeURIComponent(url.hash.slice(1));
      var target = id === 'top' ? 0 : doc.getElementById(id);
      if (target === null) return;
      e.preventDefault();
      goTo(target);
      if (id === 'main' && target) { target.setAttribute('tabindex', '-1'); target.focus({ preventScroll: true }); }
      history.replaceState(null, '', id === 'top' ? location.pathname : url.hash);
    });
  }

  function handleHash() {
    if (!location.hash || location.hash === '#top') return;
    var t = doc.getElementById(decodeURIComponent(location.hash.slice(1)));
    if (t) goTo(t, true);
  }

  /* ================================================================ النصوص */
  /* يلف كل كلمة (لا كل حرف: العربية تتصل) بقناع، ويحفظ ما في العنوان من وسوم */
  function wrapWords(el, cls, inner) {
    var walker = doc.createTreeWalker(el, NodeFilter.SHOW_TEXT, null), nodes = [], n;
    while ((n = walker.nextNode())) nodes.push(n);
    nodes.forEach(function (node) {
      var frag = doc.createDocumentFragment();
      node.nodeValue.split(/(\s+)/).forEach(function (part) {
        if (!part) return;
        if (/^\s+$/.test(part)) { frag.appendChild(doc.createTextNode(part)); return; }
        var w = doc.createElement('span');
        w.className = cls;
        if (inner) {
          var i = doc.createElement('span');
          i.className = inner;
          i.textContent = part;
          w.appendChild(i);
        } else w.textContent = part;
        frag.appendChild(w);
      });
      node.parentNode.replaceChild(frag, node);
    });
    return $$(inner ? '.' + inner : '.' + cls, el);
  }

  function splitHeadings() {
    $$('[data-words]').forEach(function (el) {
      var words = wrapWords(el, 'w', 'wi');
      gsap.set(words, { yPercent: 115 });
      el.style.visibility = 'visible';
    });
  }

  /* نص «من نحن»: تضيء كلماته مع التمرير */
  function scrubText() {
    $$('[data-scrub]').forEach(function (el) {
      var words = wrapWords(el, 'sw');
      gsap.fromTo(words, { opacity: 0.14 }, {
        opacity: 1, ease: 'none', stagger: 0.1,
        scrollTrigger: { trigger: el, start: 'top 82%', end: 'bottom 52%', scrub: 0.4 }
      });
    });
  }

  function reveals() {
    var outside = function (el) { return !el.closest('.hero'); };
    ScrollTrigger.batch($$('[data-rise]').filter(outside), {
      start: 'top 90%', once: true,
      onEnter: function (els) {
        gsap.to(els, { opacity: 1, y: 0, duration: 1, ease: 'power3.out', stagger: 0.09, delay: d0(), overwrite: true });
      }
    });
    $$('[data-words]').filter(outside).forEach(function (el) {
      var words = $$('.wi', el);
      ScrollTrigger.create({
        trigger: el, start: 'top 90%', once: true,
        onEnter: function () { gsap.to(words, { yPercent: 0, duration: 1.1, ease: 'power4.out', stagger: 0.055, delay: d0() }); }
      });
    });
    $$('[data-stagger]').forEach(function (g) {
      ScrollTrigger.create({
        trigger: g, start: 'top 88%', once: true,
        onEnter: function () {
          gsap.to(g.children, { opacity: 1, y: 0, duration: 0.8, ease: 'power3.out', stagger: 0.06, delay: d0() });
        }
      });
    });
    $$('.statement__foot, .ftr__word').forEach(function (el) {
      ScrollTrigger.create({ trigger: el, start: 'top 88%', once: true, onEnter: function () { el.classList.add('is-in'); } });
    });
    $$('.cta__rule').forEach(function (r) {
      gsap.to(r, { scaleX: 1, duration: 1.3, ease: 'power3.inOut', scrollTrigger: { trigger: r, start: 'top 90%', once: true } });
    });
  }

  /* ================================================================ الرئيسية */
  /* نسيج حلقات كالدرع السابغة (الزرد)، ينسج من اليمين إلى اليسار ثم يسكن */
  function heroMesh() {
    var c = $('.hero__mesh');
    var api = { start: function () {} };
    if (!c || !c.getContext) return api;
    var ctx = c.getContext('2d'), dpr = Math.min(2, window.devicePixelRatio || 1);
    var W = 0, H = 0, rings = [], t0 = 0, raf = 0, started = false;
    function smoothstep(a, b, x) { var t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); }
    function layout() {
      var r = c.getBoundingClientRect();
      W = r.width; H = r.height;
      c.width = Math.round(W * dpr); c.height = Math.round(H * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      var s = W < 700 ? 24 : 32, R = s * 0.6, rowH = s * 0.52;
      rings = [];
      for (var row = 0, y = -R; y < H + R; row++, y += rowH) {
        for (var x = (row % 2 ? s / 2 : 0) - R; x < W + R; x += s) {
          var dx = (x - W / 2) / (W * 0.5), dy = (y - H * 0.47) / (H * 0.56);
          var a = smoothstep(0.46, 1.15, Math.sqrt(dx * dx + dy * dy));
          if (a < 0.03) continue;
          rings.push({ x: x, y: y, r: R, a: a, tilt: row % 2 ? 0.5 : -0.5,
            delay: (1 - x / W) * 1.2 + (y / H) * 0.3 + Math.random() * 0.2 });
        }
      }
    }
    function draw(now) {
      var t = (now - t0) / 1000, busy = false;
      ctx.clearRect(0, 0, W, H);
      ctx.lineWidth = 1;
      for (var i = 0; i < rings.length; i++) {
        var g = rings[i], p = clamp((t - g.delay) / 0.8, 0, 1);
        if (p < 1) busy = true;
        if (p <= 0) continue;
        var e = 1 - Math.pow(1 - p, 3);
        ctx.strokeStyle = 'rgba(171,153,125,' + (g.a * 0.21).toFixed(3) + ')';
        ctx.beginPath();
        ctx.ellipse(g.x, g.y, g.r, g.r * 0.78, g.tilt, -Math.PI / 2, -Math.PI / 2 + e * Math.PI * 2);
        ctx.stroke();
      }
      if (busy) raf = requestAnimationFrame(draw);
    }
    api.start = function () {
      if (started) return;
      started = true;
      layout();
      t0 = performance.now();
      raf = requestAnimationFrame(draw);
    };
    var rt;
    window.addEventListener('resize', function () {
      clearTimeout(rt);
      rt = setTimeout(function () {
        if (!started) return;
        cancelAnimationFrame(raf);
        layout();
        t0 = -1e6;
        raf = requestAnimationFrame(draw);
      }, 160);
    });
    gsap.to(c, { yPercent: 16, opacity: 0.25, ease: 'none',
      scrollTrigger: { trigger: c.parentNode, start: 'top top', end: 'bottom top', scrub: true } });
    return api;
  }

  /* القلم يكتب «سابغات» من اليمين إلى اليسار، ثم تنقط الحروف، ثم يستقر الميزان.
     ومع التمرير ينتقل الشعار نفسه من قلب الصفحة إلى مكانه في الترويسة. */
  function heroIntro(mesh) {
    var fly = $('.fly'), svg = fly ? $('.fly__svg', fly) : null;
    var slot = $('.hero__slot'), brand = $('.hdr .brand__mark'), hdr = $('.hdr');
    if (!svg || !slot || !brand) return;
    var q = function (s) { return $$(s, svg); };
    var pillar = $('.mk-pillar', svg), scale = $('.mk-scale', svg);
    var calli = q('.mk-c'), dots = q('.mk-dot');
    var bal = balancer($('.mk-beam', svg), $('.mk-panL', svg), $('.mk-panR', svg));
    var words = $$('.hero__title .wi'), rises = $$('.hero [data-rise]');
    var seen = root.classList.contains('intro-seen') || window.scrollY > 40;
    var base = { left: 0, top: 0, w: 1, h: 1 };

    function place() {
      var r = slot.getBoundingClientRect();
      base = { left: r.left, top: r.top + window.scrollY, w: r.width, h: r.height };
      fly.style.width = base.w + 'px';
      fly.style.height = base.h + 'px';
      fly.style.left = base.left + 'px';
      fly.style.top = base.top + 'px';
    }
    place();
    root.classList.add('fly-on');
    ScrollTrigger.addEventListener('refreshInit', function () { gsap.set(fly, { x: 0, y: 0, scale: 1 }); place(); });

    /* الانتقال إلى الترويسة مع التمرير: يصعد أولا مع المحتوى كأي عنصر في الصفحة،
       ثم ينفصل عنه ويستقر في مكانه بالترويسة، فلا يمر فوق النص */
    var dock = ScrollTrigger.create({
      trigger: '.hero', start: 'top top',
      end: function () { return '+=' + Math.max(220, window.innerHeight * 0.5); },
      onUpdate: dockTo, onRefresh: dockTo
    });
    function dockTo(self) {
      var st = self || dock;
      var p = st.progress, e = p < 0.5 ? 2 * p * p : 1 - Math.pow(2 - 2 * p, 2) / 2;
      var s = clamp(window.scrollY - st.start, 0, st.end - st.start);
      var b = brand.getBoundingClientRect();
      var top = (base.top - s) * (1 - e) + b.top * e;
      var left = base.left * (1 - e) + b.left * e;
      gsap.set(fly, { x: left - base.left, y: top - base.top, scale: 1 - e + e * b.width / base.w });
    }

    /* الكتابة: قناع لكل قطعة، يرسم خطها بالترتيب */
    var groups = [0, 1, 2, 3].map(function (i) { return $$('#wm' + i + ' .wm', svg); });
    var tl = gsap.timeline({ paused: true, defaults: { ease: 'power3.out' }, onComplete: finish });
    var running = false;

    if (!seen) {
      running = true;
      groups.forEach(function (g) {
        g.forEach(function (m) {
          var L = m.getTotalLength();
          m._L = L;
          m.style.strokeDasharray = L + ' ' + (L + 40);
          m.style.strokeDashoffset = L;
        });
      });
      gsap.set(pillar, { y: -60, opacity: 0 });
      gsap.set(dots, { opacity: 0 });
      gsap.set(scale, { opacity: 0, y: -22 });
      bal.a = 12; bal.apply();

      tl.to(pillar, { y: 0, opacity: 1, duration: 0.85 }, 0.15);
      var t = 0.8;
      groups.forEach(function (g) {
        var total = g.reduce(function (s, m) { return s + m._L; }, 0);
        var dur = clamp(total / 190, 0.3, 0.95), at = t;
        g.forEach(function (m) {
          var d = dur * m._L / total;
          tl.to(m, { strokeDashoffset: 0, duration: d, ease: 'sine.inOut' }, at);
          at += d;
        });
        t += dur * 0.9;
      });
      dots.forEach(function (d, k) {
        var o = d.getAttribute('data-cx') + ' ' + d.getAttribute('data-cy');
        tl.fromTo(d, { opacity: 0, scale: 0, rotation: -90, svgOrigin: o },
          { opacity: 1, scale: 1, rotation: 0, svgOrigin: o, duration: 0.55, ease: 'back.out(2.4)' }, t + k * 0.12);
      });
      tl.to(scale, { opacity: 1, y: 0, duration: 0.7, ease: 'power2.out' }, t + 0.15)
        .to(bal, { a: 0, duration: 2.8, ease: 'elastic.out(1, 0.3)', onUpdate: bal.apply }, t + 0.25)
        .to(words, { yPercent: 0, duration: 1.15, ease: 'power4.out', stagger: 0.06 }, 1.15)
        .to(rises, { opacity: 1, y: 0, duration: 1, stagger: 0.1 }, 1.65)
        .to(hdr, { opacity: 1, duration: 0.8, ease: 'power1.out' }, 2)
        .call(mesh.start, null, 1.5);

      /* أي تفاعل يسرع الافتتاحية بدل أن يحبس الزائر */
      var evs = ['wheel', 'touchstart', 'keydown', 'pointerdown'];
      var skip = function () { tl.timeScale(5); evs.forEach(function (ev) { window.removeEventListener(ev, skip); }); };
      evs.forEach(function (ev) { window.addEventListener(ev, skip, { passive: true }); });
    } else {
      bal.a = 6; bal.apply();
      tl.fromTo(svg, { opacity: 0, y: 14 }, { opacity: 1, y: 0, duration: 0.8 }, 0.05)
        .to(bal, { a: 0, duration: 2.2, ease: 'elastic.out(1, 0.32)', onUpdate: bal.apply }, 0.1)
        .to(words, { yPercent: 0, duration: 1.05, ease: 'power4.out', stagger: 0.05 }, 0.15)
        .to(rises, { opacity: 1, y: 0, duration: 0.9, stagger: 0.08 }, 0.35)
        .set(hdr, { opacity: 1 }, 0)
        .call(mesh.start, null, 0.2);
    }

    function finish() {
      running = false;
      calli.forEach(function (c) { c.removeAttribute('mask'); });
      try { sessionStorage.setItem('sg-intro', '1'); } catch (e) { /* تعاد الافتتاحية كاملة */ }
    }

    var fontsReady = doc.fonts && doc.fonts.ready ? doc.fonts.ready : Promise.resolve();
    var wait = new Promise(function (r) { setTimeout(r, 700); });
    Promise.race([fontsReady, wait]).then(function () {
      place();
      gsap.delayedCall(root.classList.contains('is-arriving') ? 0.55 : 0, function () { tl.play(); });
    });

    /* الميزان يميل مع سرعة التمرير ثم يعود إلى توازنه */
    var back;
    ScrollTrigger.create({
      trigger: body, start: 'top top', end: 'max',
      onUpdate: function (self) {
        if (running) return;
        var a = clamp(self.getVelocity() / 280, -7, 7);
        if (Math.abs(a) < 0.4) return;
        gsap.to(bal, { a: a, duration: 0.5, ease: 'power2.out', onUpdate: bal.apply, overwrite: true });
        clearTimeout(back);
        back = setTimeout(function () {
          gsap.to(bal, { a: 0, duration: 2.2, ease: 'elastic.out(1, 0.28)', onUpdate: bal.apply, overwrite: true });
        }, 160);
      }
    });
  }

  /* ثلاث طبقات من الحماية: الحلقة المضيئة تتبع المسار الذي تقرؤه */
  function layers() {
    var sec = $('.layers');
    if (!sec) return;
    var rings = $$('.shield__ring', sec), nums = $$('.shield__n', sec), core = $('.shield__core', sec);
    var tracks = $$('.track', sec), ticks = $('.shield__ticks', sec);
    var NS = 'http://www.w3.org/2000/svg';
    for (var i = 0; i < 72; i++) {
      var a = i / 72 * Math.PI * 2, r1 = 184, r2 = i % 6 ? 189 : 195;
      var l = doc.createElementNS(NS, 'line');
      l.setAttribute('x1', (200 + r1 * Math.cos(a)).toFixed(2));
      l.setAttribute('y1', (200 + r1 * Math.sin(a)).toFixed(2));
      l.setAttribute('x2', (200 + r2 * Math.cos(a)).toFixed(2));
      l.setAttribute('y2', (200 + r2 * Math.sin(a)).toFixed(2));
      ticks.appendChild(l);
    }
    gsap.to(ticks, { rotation: 120, svgOrigin: '200 200', ease: 'none',
      scrollTrigger: { trigger: sec, start: 'top bottom', end: 'bottom top', scrub: true } });

    rings.forEach(function (r) {
      var L = 2 * Math.PI * r.r.baseVal.value;
      r.style.strokeDasharray = L;
      r.style.strokeDashoffset = L;
    });
    gsap.set(core, { scale: 0, rotation: -90, svgOrigin: '200 200' });
    ScrollTrigger.create({
      trigger: $('.layers__grid', sec), start: 'top 75%', once: true,
      onEnter: function () {
        gsap.to(rings, { strokeDashoffset: 0, duration: 1.7, ease: 'power2.inOut', stagger: 0.18 });
        gsap.to(core, { scale: 1, rotation: 0, svgOrigin: '200 200', duration: 1, ease: 'back.out(2)', delay: 0.6 });
      }
    });

    function setOn(i) {
      tracks.forEach(function (t, j) { t.classList.toggle('is-on', j === i); });
      rings.forEach(function (r) { r.classList.toggle('is-on', +r.getAttribute('data-ring') === i + 1); });
      nums.forEach(function (n) { n.classList.toggle('is-on', +n.getAttribute('data-n') === i + 1); });
    }
    tracks.forEach(function (t, i) {
      ScrollTrigger.create({
        trigger: t, start: 'top 62%', end: 'bottom 38%',
        onToggle: function (self) { if (self.isActive) setOn(i); }
      });
      var items = $$('.track__list li', t);
      gsap.set(items, { opacity: 0, y: 14 });
      ScrollTrigger.create({
        trigger: t, start: 'top 72%', once: true,
        onEnter: function () { gsap.to(items, { opacity: 1, y: 0, duration: 0.7, stagger: 0.06, ease: 'power2.out' }); }
      });
    });
    setOn(0);
  }

  /* الرؤية والقيم والهدف: ثلاث حلقات تتقارب حتى تتشابك */
  function links() {
    var g = $('[data-links]');
    if (!g) return;
    var rings = $$('.value__ring', g), circles = $$('.value__ring circle', g);
    circles.forEach(function (c) {
      var L = 2 * Math.PI * c.r.baseVal.value;
      c.style.strokeDasharray = L;
      c.style.strokeDashoffset = L;
    });
    var tl = gsap.timeline({ scrollTrigger: { trigger: g, start: 'top 78%', once: true } });
    var items = $$('.value', g);
    if (mq('(min-width: 1100px)')) {
      tl.from(items[0], { x: 120, duration: 1.7, ease: 'power3.out' }, 0)
        .from(items[2], { x: -120, duration: 1.7, ease: 'power3.out' }, 0);
    }
    tl.to(circles, { strokeDashoffset: 0, duration: 1.8, ease: 'power2.inOut', stagger: 0.14 }, 0)
      .from($$('.value__n, .value__t', g), { opacity: 0, y: 18, duration: 0.8, stagger: 0.07 }, 0.55)
      .from($$('.value p', g), { opacity: 0, y: 22, duration: 0.9, stagger: 0.1 }, 0.85);
  }

  /* القطاعات الأربعة: يتسع اللوح الذي تقف عليه */
  function panes(animate) {
    var wrap = $('[data-panes]');
    if (!wrap) return;
    var items = $$('.pane', wrap);
    var hover = mq('(hover: hover) and (pointer: fine)');
    var lockUntil = 0, intent;
    var wide = function () { return mq('(min-width: 901px)'); };
    function open(p) {
      if (p.classList.contains('is-open')) return;
      items.forEach(function (x) { x.classList.toggle('is-open', x === p); });
      lockUntil = Date.now() + 520;
      if (animate) {
        var u = $('.pane__ico use', p);
        if (u) gsap.fromTo(u, { strokeDashoffset: 1 }, { strokeDashoffset: 0, autoRound: false, duration: 1.2, ease: 'power2.inOut' });
      }
    }
    items.forEach(function (p) {
      if (hover) {
        p.addEventListener('mouseenter', function () {
          if (!wide()) return;
          clearTimeout(intent);
          intent = setTimeout(function () { if (Date.now() >= lockUntil) open(p); }, 90);
        });
        p.addEventListener('mouseleave', function () { clearTimeout(intent); });
      }
      p.addEventListener('focusin', function () { open(p); });
      p.addEventListener('click', function (e) {
        if (!wide() || p.classList.contains('is-open')) return;
        e.preventDefault();
        open(p);
      });
    });
    if (animate) {
      ScrollTrigger.create({
        trigger: wrap, start: 'top 82%', once: true,
        onEnter: function () {
          gsap.from(items, { opacity: 0, y: 34, duration: 0.95, stagger: 0.09, ease: 'power3.out' });
          gsap.to($$('.pane__ico use', wrap), { strokeDashoffset: 0, autoRound: false, duration: 1.5, stagger: 0.12, ease: 'power2.inOut', delay: 0.3 });
        }
      });
    }
  }

  /* ================================================================ من نحن */
  /* بطاقات الرؤية والقيم والهدف: تتراكم، وتنكمش السابقة تحت اللاحقة */
  function stackCards() {
    var cards = $$('.scard');
    if (cards.length < 2 || !mq('(min-width: 641px)')) return;
    cards.forEach(function (c, i) {
      var next = cards[i + 1];
      if (!next) return;
      gsap.to(c, {
        scale: 0.94, opacity: 0.45, ease: 'none',
        scrollTrigger: {
          trigger: next, start: 'top bottom', scrub: true,
          end: function () { return 'top ' + (($('.hdr').offsetHeight || 84) + 28 + (i + 1) * 26) + 'px'; }
        }
      });
    });
  }

  /* ================================================================ الخدمات */
  function serviceIndex(animate) {
    var idx = $('.svc__index');
    if (!idx) return;
    var links = $$('a', idx), bar = $('.svc__bar', idx);
    var secs = links.map(function (a) { return doc.getElementById(a.getAttribute('href').slice(1)); });
    var cur = -1;
    function set(i) {
      if (i === cur) return;
      cur = i;
      links.forEach(function (a, j) {
        a.classList.toggle('is-on', j === i);
        if (j === i) a.setAttribute('aria-current', 'true'); else a.removeAttribute('aria-current');
      });
      if (bar) bar.style.transform = 'translateY(' + (i * 100) + '%)';
      /* شريط الجوال الأفقي: يوسط الرابط النشط. القياس بالموضع على الشاشة لا بقيمة scrollLeft
         لأن اتجاه التمرير في الحاويات RTL سالب ويختلف تفسيره */
      var a = links[i], ol = a ? a.closest('ol') : null;
      if (ol && ol.scrollWidth > ol.clientWidth + 1) {
        var ar = a.getBoundingClientRect(), or = ol.getBoundingClientRect();
        ol.scrollBy({ left: (ar.left + ar.width / 2) - (or.left + or.width / 2), behavior: 'smooth' });
      }
    }
    if (animate) {
      secs.forEach(function (s, i) {
        if (!s) return;
        ScrollTrigger.create({ trigger: s, start: 'top 45%', end: 'bottom 45%', onToggle: function (self) { if (self.isActive) set(i); } });
      });
    } else if ('IntersectionObserver' in window) {
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (en) { if (en.isIntersecting) set(secs.indexOf(en.target)); });
      }, { rootMargin: '-45% 0px -54% 0px' });
      secs.forEach(function (s) { if (s) io.observe(s); });
    }
    set(0);
  }

  /* ================================================================ رسوم رؤوس الصفحات */
  function arts() {
    $$('.art-scales').forEach(function (el) { artScales(el); });
    $$('.art-dots').forEach(function (el) { artDots(el); });
    $$('.art-pen').forEach(function (el) { artPen(el); });
  }

  function artScales(el) {
    var tilted = el.classList.contains('is-tilted');
    var bal = balancer($('.sc-beam', el), $('.sc-panL', el), $('.sc-panR', el));
    var uses = $$('use', el);
    bal.a = tilted ? 10 : 13;
    bal.apply();
    var tl = gsap.timeline({ delay: d0() + 0.15 });
    tl.to(uses, { strokeDashoffset: 0, autoRound: false, duration: 1.8, ease: 'power2.inOut', stagger: 0.14 })
      .to(uses, { fillOpacity: 1, duration: 1, stagger: 0.08 }, 1.2)
      .to(uses, { strokeOpacity: 0, duration: 0.8 }, 2.1);
    if (!tilted) {
      tl.to(bal, { a: 0, duration: 3.4, ease: 'elastic.out(1, 0.25)', onUpdate: bal.apply }, 1.5);
      ScrollTrigger.create({
        trigger: el, start: 'top bottom', end: 'bottom top',
        onUpdate: function (self) {
          var a = clamp(self.getVelocity() / 300, -6, 6);
          if (Math.abs(a) < 0.4) return;
          gsap.to(bal, { a: a, duration: 0.5, ease: 'power2.out', onUpdate: bal.apply, overwrite: true });
          gsap.to(bal, { a: 0, duration: 2.2, ease: 'elastic.out(1, 0.28)', onUpdate: bal.apply, delay: 0.5 });
        }
      });
    } else {
      /* صفحة ٤٠٤: الميزان مائل، ويعتدل حين تتجه إلى الرئيسية */
      var sway = gsap.to(bal, { a: 7, duration: 2.4, ease: 'sine.inOut', yoyo: true, repeat: -1, onUpdate: bal.apply, delay: 2 });
      var home = $('.nf__actions .btn--brass');
      if (home) {
        home.addEventListener('mouseenter', function () { sway.pause(); gsap.to(bal, { a: 0, duration: 1.4, ease: 'elastic.out(1, 0.4)', onUpdate: bal.apply, overwrite: true }); });
        home.addEventListener('mouseleave', function () { gsap.to(bal, { a: 10, duration: 1.2, ease: 'power2.inOut', onUpdate: bal.apply, overwrite: true, onComplete: function () { sway.restart(true); } }); });
      }
    }
  }

  function artDots(el) {
    var dias = $$('.dia', el), nums = $$('.dia__n', el);
    gsap.fromTo(dias, { opacity: 0, scale: 0.3, rotation: -45, transformOrigin: '50% 50%' },
      { opacity: 1, scale: 1, rotation: 0, duration: 1, stagger: 0.14, ease: 'back.out(1.8)', delay: d0() + 0.2 });
    gsap.from(nums, { opacity: 0, duration: 0.6, stagger: 0.14, delay: d0() + 0.7 });
    /* تضيء النقاط الأربع بالتتابع: أربعة قطاعات في منظومة واحدة */
    var i = 0;
    gsap.delayedCall(d0() + 1.8, function step() {
      dias.forEach(function (d, j) { d.classList.toggle('is-hot', j === i); });
      nums.forEach(function (n, j) { n.classList.toggle('is-hot', j === i); });
      i = (i + 1) % dias.length;
      gsap.delayedCall(1.6, step);
    });
  }

  function artPen(el) {
    var pen = $('.pen-body', el), line = $('.pen-line', el), dots = $$('.pen-dot', el);
    var tl = gsap.timeline({ delay: d0() + 0.15 });
    tl.to(pen, { strokeDashoffset: 0, autoRound: false, duration: 1.1, ease: 'power2.inOut' })
      .to(pen, { fillOpacity: 1, duration: 0.7 }, 0.8)
      .to(line, { strokeDashoffset: 0, autoRound: false, duration: 1.5, ease: 'power2.inOut' }, 0.9)
      .to(line, { fillOpacity: 1, duration: 0.9 }, 1.9)
      .to(dots, { strokeDashoffset: 0, autoRound: false, fillOpacity: 1, duration: 0.6, stagger: 0.18 }, 2.2)
      .to([pen, line].concat(dots), { strokeOpacity: 0, duration: 0.8 }, 2.9);
  }
})();
