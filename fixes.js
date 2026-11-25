/* =====================================================================
   B12 fixes.js  v1   (ملف الإصلاحات الواحد — يُحمَّل في student.html و admin.html)
   طبقة أمان وإصلاح تلقائي. مصمَّم بحيث لا يكسر التطبيق أبداً:
   كل جزء داخل try/catch، ولو الملف غير موجود التطبيق يشتغل عادي.

   ماذا يفعل:
   1) يسجّل أي خطأ يحصل في التطبيق (يحفظ آخر 30 خطأ) ويعرضها: اضغط 5 مرات
      بسرعة على أعلى يسار الشاشة، أو افتح الرابط مع  #errors
   2) حماية XSS إضافية: يشيل onerror/onload وغيرها من الصور والعناصر، ويمنع
      روابط javascript: وصيغ data: الخطرة، ويمنع srcdoc
   3) صورة تالفة: تتخفّى بدل ما تظهر أيقونة مكسورة (والإيموجي ترجع نص)
   4) امتلاء localStorage: يمسح الكاش القابل لإعادة البناء (b12cache) ويعيد المحاولة
   5) الشاشة البيضاء: لو التطبيق ما ظهر بعد 15 ثانية يظهر شريط فيه
      "مسح الكاش وإعادة التحميل" (يحل مشكلة النسخة القديمة العالقة)
   ===================================================================== */
(function () {
  'use strict';
  var VERSION = '1';
  var LOGKEY = 'b12_errlog';
  var MAXLOG = 30;
  function safe(fn) { try { return fn(); } catch (e) { } }

  /* ---------------- 1) سجل الأخطاء ---------------- */
  var lastMsg = '';
  function log(kind, msg, src) {
    safe(function () {
      msg = String(msg == null ? '' : msg).slice(0, 300);
      if (kind + msg === lastMsg) return;
      lastMsg = kind + msg;
      var a = [];
      safe(function () { a = JSON.parse(localStorage.getItem(LOGKEY) || '[]'); });
      if (!Array.isArray(a)) a = [];
      a.push({ t: new Date().toISOString(), k: kind, m: msg, s: String(src || '').slice(0, 120) });
      if (a.length > MAXLOG) a = a.slice(-MAXLOG);
      localStorage.setItem(LOGKEY, JSON.stringify(a));
    });
  }
  function readLog() {
    var a = [];
    safe(function () { a = JSON.parse(localStorage.getItem(LOGKEY) || '[]'); });
    return Array.isArray(a) ? a : [];
  }

  /* ---------------- 2) تنظيف العناصر (XSS) ---------------- */
  var BAD_URL = /^\s*(?:javascript|vbscript|livescript):|^\s*data:(?!image\/|audio\/|video\/)/i;
  var URL_ATTRS = ['src', 'href', 'action', 'formaction', 'data', 'xlink:href'];
  var BAD_ATTRS = ['onerror', 'onload', 'onfocus', 'onfocusin', 'onmouseover', 'onmouseenter', 'onmouseout',
    'onanimationstart', 'onanimationend', 'onanimationiteration', 'ontransitionend', 'ontoggle',
    'onpointerover', 'onpointerenter', 'onbegin', 'onpageshow', 'onwheel', 'srcdoc'];
  var BAD_MAP = {}; BAD_ATTRS.forEach(function (n) { BAD_MAP[n] = 1; });
  var SELECTOR = URL_ATTRS.concat(BAD_ATTRS).map(function (n) { return '[' + n + ']'; }).join(',');

  function cleanElement(el) {
    if (!el || el.nodeType !== 1) return;
    var attrs = el.attributes, names = [], i;
    if (!attrs) return;
    for (i = 0; i < attrs.length; i++) names.push(attrs[i].name);
    for (i = 0; i < names.length; i++) {
      var n = String(names[i]).toLowerCase();
      if (BAD_MAP[n]) { el.removeAttribute(names[i]); log('xss', 'removed ' + n + ' on ' + el.tagName); continue; }
      if (URL_ATTRS.indexOf(n) !== -1) {
        var v = el.getAttribute(names[i]);
        if (v && BAD_URL.test(v)) { el.removeAttribute(names[i]); log('xss', 'blocked url in ' + n + ' on ' + el.tagName); }
      }
    }
  }
  function processNode(n) {
    if (!n || n.nodeType !== 1) return;
    cleanElement(n);
    if (n.querySelectorAll) {
      var list = n.querySelectorAll(SELECTOR);
      for (var i = 0; i < list.length; i++) cleanElement(list[i]);
    }
  }
  safe(function () {
    if (typeof MutationObserver === 'undefined' || typeof document === 'undefined') return;
    var mo = new MutationObserver(function (ms) {
      safe(function () {
        for (var i = 0; i < ms.length; i++) {
          var m = ms[i];
          if (m.type === 'attributes') cleanElement(m.target);
          else for (var j = 0; j < m.addedNodes.length; j++) processNode(m.addedNodes[j]);
        }
      });
    });
    mo.observe(document.documentElement, { childList: true, subtree: true, attributes: true, attributeFilter: URL_ATTRS.concat(BAD_ATTRS) });
  });

  /* ---------------- 3) أخطاء الجافاسكربت + الصور التالفة ---------------- */
  safe(function () {
    window.addEventListener('error', function (e) {
      safe(function () {
        var t = e && e.target;
        if (t && t !== window && t.tagName) {            // خطأ تحميل مورد (صورة/سكربت..)
          if (t.tagName === 'IMG') {
            if (t.classList && t.classList.contains('emoji') && t.alt && t.replaceWith) { t.replaceWith(document.createTextNode(t.alt)); return; }
            if (!t.getAttribute('data-b12bad')) { t.setAttribute('data-b12bad', '1'); t.style.visibility = 'hidden'; }
          }
          var src = String(t.src || t.href || '');
          if (src.indexOf('data:') !== 0) log('res', t.tagName + ' failed', src);
          return;
        }
        log('js', e && e.message, (e && e.filename ? e.filename : '') + ':' + (e && e.lineno ? e.lineno : ''));
      });
    }, true);
    window.addEventListener('unhandledrejection', function (e) {
      safe(function () {
        var r = e && e.reason;
        log('promise', r && (r.message || r.code) ? (r.code ? r.code + ' ' : '') + (r.message || '') : r);
      });
    });
  });

  /* ---------------- 4) امتلاء localStorage ---------------- */
  safe(function () {
    var SP = window.Storage && window.Storage.prototype;
    if (!SP || SP.__b12q) return;
    var orig = SP.setItem;
    SP.setItem = function (k, v) {
      try { return orig.call(this, k, v); }
      catch (e) {
        var quota = e && (e.name === 'QuotaExceededError' || e.code === 22 || e.code === 1014);
        var isLocal = false; safe(function () { isLocal = (this === window.localStorage); }.bind(this));
        if (quota && isLocal && k !== 'b12cache') {
          this.removeItem('b12cache');
          log('storage', 'quota: cleared b12cache', k);
          return orig.call(this, k, v);       // لو فشلت تاني يرمي الخطأ زي الأول والتطبيق يتعامل معاه
        }
        throw e;
      }
    };
    SP.__b12q = true;
  });

  /* ---------------- واجهة صغيرة (بدون innerHTML) ---------------- */
  function hardReload() {
    var go = function () { safe(function () { location.reload(); }); };
    var jobs = [];
    safe(function () {
      if (navigator.serviceWorker && navigator.serviceWorker.getRegistrations)
        jobs.push(navigator.serviceWorker.getRegistrations().then(function (rs) { return Promise.all(rs.map(function (r) { return r.unregister(); })); }));
    });
    safe(function () {
      if (window.caches && caches.keys)
        jobs.push(caches.keys().then(function (ks) { return Promise.all(ks.map(function (k) { return caches.delete(k); })); }));
    });
    Promise.all(jobs).then(go, go);
  }
  function btn(label, fn) {
    var b = document.createElement('button');
    b.textContent = label; b.type = 'button';
    b.style.cssText = 'margin:4px;padding:8px 12px;border:0;border-radius:10px;background:#12b5a6;color:#fff;font:14px system-ui,Tahoma,sans-serif';
    b.onclick = fn; return b;
  }
  function showLog() {
    safe(function () {
      var old = document.getElementById('b12fixlog'); if (old) { old.remove(); return; }
      var box = document.createElement('div'); box.id = 'b12fixlog';
      box.style.cssText = 'position:fixed;inset:0;z-index:2147483647;background:#0b1626ee;color:#eaf2fb;padding:14px;overflow:auto;direction:ltr;font:12px monospace';
      var a = readLog();
      var pre = document.createElement('pre'); pre.style.cssText = 'white-space:pre-wrap;word-break:break-word';
      var text = 'B12 fixes v' + VERSION + ' | ' + a.length + ' entries\n\n' + a.map(function (x) { return x.t + ' [' + x.k + '] ' + x.m + (x.s ? ' @ ' + x.s : ''); }).join('\n');
      pre.textContent = text;
      var bar = document.createElement('div');
      bar.appendChild(btn('Copy', function () { safe(function () { navigator.clipboard.writeText(text); }); }));
      bar.appendChild(btn('Clear', function () { safe(function () { localStorage.removeItem(LOGKEY); }); box.remove(); }));
      bar.appendChild(btn('Clear cache + reload', hardReload));
      bar.appendChild(btn('Close', function () { box.remove(); }));
      box.appendChild(bar); box.appendChild(pre); document.body.appendChild(box);
    });
  }

  /* 5 ضغطات سريعة على أعلى يسار الشاشة = سجل الأخطاء  |  أو  #errors في الرابط */
  safe(function () {
    var taps = [];
    document.addEventListener('click', function (e) {
      safe(function () {
        if (e.clientX > 40 || e.clientY > 40) { taps = []; return; }
        var now = Date.now(); taps.push(now);
        taps = taps.filter(function (t) { return now - t < 2500; });
        if (taps.length >= 5) { taps = []; showLog(); }
      });
    }, true);
    document.addEventListener('DOMContentLoaded', function () {
      safe(function () { if (/#errors/.test(location.hash)) showLog(); });
    });
  });

  /* ---------------- 5) حارس الشاشة البيضاء ---------------- */
  safe(function () {
    window.addEventListener('load', function () {
      setTimeout(function () {
        safe(function () {
          var app = document.getElementById('app');
          if (!app || app.firstElementChild || (app.textContent || '').trim()) return;
          if (document.getElementById('b12fixbar')) return;
          var bar = document.createElement('div'); bar.id = 'b12fixbar';
          bar.style.cssText = 'position:fixed;left:0;right:0;bottom:0;z-index:2147483646;background:#12233d;color:#eaf2fb;padding:12px;text-align:center;direction:rtl;font:14px system-ui,Tahoma,sans-serif;border-top:2px solid #12b5a6';
          var msg = document.createElement('div'); msg.textContent = 'حصل خلل في تحميل التطبيق. جرّب مسح الكاش وإعادة التحميل.';
          bar.appendChild(msg);
          bar.appendChild(btn('مسح الكاش وإعادة التحميل', hardReload));
          bar.appendChild(btn('سجل الأخطاء', showLog));
          bar.appendChild(btn('✕', function () { bar.remove(); }));
          document.body.appendChild(bar);
        });
      }, 15000);
    });
  });

  window.B12FIX = { version: VERSION, showLog: showLog, hardReload: hardReload, log: log, readLog: readLog, _t: { BAD_URL: BAD_URL, cleanElement: cleanElement, processNode: processNode, SELECTOR: SELECTOR } };
})();
