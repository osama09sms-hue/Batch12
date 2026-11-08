/* ===== B12 CUSTOM TEXTS (edit the values below, then Commit) =====
   Only text changes here. Adding NEW data fields needs app code changes. */
(function () {
  const TEXTS = {
    // login / signup form (by element id -> placeholder)
    em:  'البريد الإلكتروني للجامعة',
    pw:  'كلمة المرور (6 أحرف على الأقل)',
    pw2: 'أعد كتابة كلمة المرور',
    nm:  'الاسم الرباعي كما هو في السجل',
    id:  'الرقم الجامعي',
    // buttons (by element id -> label)
    lgbtn: 'دخول',
    tab1: 'دخول',
    tab2: 'حساب جديد',
    rst:  'نسيت كلمة المرور؟',
    // chat input (by element id -> placeholder)
    tx: 'اكتب رسالتك هنا...',
  };

  function apply() {
    for (const id in TEXTS) {
      const el = document.getElementById(id);
      if (!el) continue;
      if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
        if (el.placeholder !== TEXTS[id]) el.placeholder = TEXTS[id];
      } else if (el.textContent !== TEXTS[id]) {
        el.textContent = TEXTS[id];   // only write when different, to avoid an endless observer loop
      }
    }
  }

  // The app re-draws its screens, so re-apply whenever the page changes.
  const obs = new MutationObserver(apply);
  document.addEventListener('DOMContentLoaded', () => {
    apply();
    obs.observe(document.body, { childList: true, subtree: true });
  });
})();
