/* سابغات للحلول القانونية — القائمة والتمرير فقط (تحسين تدريجي: الموقع كامل بلا JS) */
(function () {
  'use strict';

  /* ---- الترويسة: شفافة فوق البطل، مصمتة بعد التمرير ---- */
  var header = document.querySelector('.site-header');
  if (header) {
    var onScroll = function () {
      header.classList.toggle('is-solid', window.scrollY > 40);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  }

  /* ---- قائمة الجوال ---- */
  var toggle = document.querySelector('.nav-toggle');
  if (toggle) {
    toggle.addEventListener('click', function () {
      var open = document.body.classList.toggle('nav-open');
      toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
    /* إغلاق القائمة عند اختيار رابط أو ضغط Escape */
    document.querySelectorAll('.main-nav a').forEach(function (a) {
      a.addEventListener('click', function () {
        document.body.classList.remove('nav-open');
        toggle.setAttribute('aria-expanded', 'false');
      });
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') {
        document.body.classList.remove('nav-open');
        toggle.setAttribute('aria-expanded', 'false');
      }
    });
  }

  /* ---- الظهور عند التمرير ---- */
  var revealEls = document.querySelectorAll('.reveal');
  if ('IntersectionObserver' in window && revealEls.length) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) {
          en.target.classList.add('in');
          io.unobserve(en.target);
        }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
    revealEls.forEach(function (el) { io.observe(el); });
  } else {
    revealEls.forEach(function (el) { el.classList.add('in'); });
  }

  /* ---- سنة الحقوق ---- */
  var yearEl = document.getElementById('year');
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  /* ---- نموذج «اطلب خدمة»: يجهّز رسالة بريد ويفتح برنامج البريد ---- */
  var form = document.getElementById('service-form');
  if (form) {
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var v = function (id) {
        var el = document.getElementById(id);
        return el ? el.value.trim() : '';
      };
      var subject = 'طلب خدمة: ' + (v('f-service') || 'عام');
      var body =
        'الاسم: ' + v('f-name') + '\n' +
        'الجوال: ' + v('f-phone') + '\n' +
        'البريد: ' + v('f-email') + '\n' +
        'الخدمة المطلوبة: ' + v('f-service') + '\n\n' +
        'تفاصيل الطلب:\n' + v('f-message');
      window.location.href = 'mailto:info@sabigat.com'
        + '?subject=' + encodeURIComponent(subject)
        + '&body=' + encodeURIComponent(body);
      var note = document.getElementById('form-done');
      if (note) note.hidden = false;
    });
  }
})();
