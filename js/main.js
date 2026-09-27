/* ==========================================================================
   Эркинай — создание сайтов
   Меню, появление блоков, форма заявки.
   Без зависимостей. Сайт работает и при отключённом JavaScript.
   ========================================================================== */
(function () {
  'use strict';

  var PHONE_RAW = '79218202007';

  function $(s, c) { return (c || document).querySelector(s); }
  function $$(s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); }

  /* ------------------------------------------------------------------------
     1. Мобильное меню
     ------------------------------------------------------------------------ */
  function initNav() {
    var burger = $('.burger');
    var nav = $('#site-nav');
    if (!burger || !nav) return;

    function setOpen(open) {
      burger.setAttribute('aria-expanded', open ? 'true' : 'false');
      burger.setAttribute('aria-label', open ? 'Закрыть меню' : 'Открыть меню');
      nav.classList.toggle('is-open', open);
      document.body.style.overflow = open ? 'hidden' : '';
    }

    burger.addEventListener('click', function () {
      setOpen(burger.getAttribute('aria-expanded') !== 'true');
    });

    $$('a', nav).forEach(function (a) {
      a.addEventListener('click', function () { setOpen(false); });
    });

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && nav.classList.contains('is-open')) {
        setOpen(false);
        burger.focus();
      }
    });

    window.addEventListener('resize', function () {
      if (window.innerWidth > 768 && nav.classList.contains('is-open')) setOpen(false);
    });
  }

  /* ------------------------------------------------------------------------
     2. Хедер при прокрутке
     ------------------------------------------------------------------------ */
  function initHeader() {
    var header = $('.header');
    if (!header) return;
    function onScroll() { header.classList.toggle('is-scrolled', window.scrollY > 8); }
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
  }

  /* ------------------------------------------------------------------------
     3. Появление блоков
     ------------------------------------------------------------------------ */
  function initReveal() {
    var items = $$('.reveal');
    if (!items.length) return;

    if (!('IntersectionObserver' in window)) {
      items.forEach(function (el) { el.classList.add('is-visible'); });
      return;
    }

    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          io.unobserve(entry.target);
        }
      });
    }, { rootMargin: '0px 0px -60px 0px', threshold: .08 });

    items.forEach(function (el) { io.observe(el); });
  }

  /* ------------------------------------------------------------------------
     4. Маска телефона — если человек начал вводить цифры
     ------------------------------------------------------------------------ */
  function initPhoneMask() {
    var input = $('#field-contact');
    if (!input) return;

    input.addEventListener('input', function () {
      // Маску применяем только если введены цифры и нет других символов
      var v = input.value;
      if (!/^[+\d\s()-]*$/.test(v) || v.replace(/\D/g, '').length === 0) return;

      var d = v.replace(/\D/g, '');
      if (d[0] === '8') d = '7' + d.slice(1);
      if (d[0] !== '7' && d.length > 0) d = '7' + d;
      d = d.slice(0, 11);

      var out = '+7';
      if (d.length > 1) out += ' (' + d.slice(1, 4);
      if (d.length >= 5) out += ') ' + d.slice(4, 7);
      if (d.length >= 8) out += '-' + d.slice(7, 9);
      if (d.length >= 10) out += '-' + d.slice(9, 11);

      input.value = out;
    });
  }

  /* ------------------------------------------------------------------------
     5. Форма заявки
     ------------------------------------------------------------------------ */
  function initForm() {
    var form = $('#lead-form');
    if (!form) return;

    var resultBox = $('#form-result');
    var resultText = $('#result-text');
    var waLink = $('#wa-link');
    var copyAgain = $('#copy-again');

    function fieldEl(el) { return el.closest('.field'); }
    function markBad(el, bad) {
      var f = fieldEl(el);
      if (f) f.classList.toggle('bad', bad);
    }

    $$('input, select, textarea', form).forEach(function (el) {
      var ev = el.tagName === 'SELECT' || el.type === 'checkbox' ? 'change' : 'input';
      el.addEventListener(ev, function () { markBad(el, false); });
    });

    function validate() {
      var ok = true;
      var name = $('#field-name');
      var contact = $('#field-contact');
      var task = $('#field-task');
      var consent = $('#field-consent');

      if (name.value.trim().length < 2) { markBad(name, true); ok = false; }
      if (contact.value.trim().length < 3) { markBad(contact, true); ok = false; }
      if (!task.value) { markBad(task, true); ok = false; }
      if (!consent.checked) { markBad(consent, true); ok = false; }

      if (!ok) {
        var firstBad = $('.field.bad input, .field.bad select');
        if (firstBad) {
          firstBad.focus();
          firstBad.scrollIntoView({ block: 'center', behavior: 'smooth' });
        }
      }
      return ok;
    }

    function buildMessage() {
      var name = $('#field-name').value.trim();
      var contact = $('#field-contact').value.trim();
      var task = $('#field-task').value;
      var comment = $('#field-comment').value.trim();

      var lines = ['Здравствуйте, Эркинай!', ''];
      lines.push('Меня зовут ' + name + '.');
      lines.push('Связь: ' + contact + '.');
      lines.push('Нужно: ' + task + '.');
      if (comment) lines.push('', comment);
      lines.push('', 'Сообщение отправлено с сайта.');
      return lines.join('\n');
    }

    function copyText(text, btn) {
      function done() {
        if (!btn) return;
        var old = btn.textContent;
        btn.textContent = 'Скопировано ✓';
        setTimeout(function () { btn.textContent = old; }, 2000);
      }

      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(done).catch(fallback);
      } else {
        fallback();
      }

      function fallback() {
        resultText.removeAttribute('readonly');
        resultText.select();
        try { document.execCommand('copy'); done(); } catch (e) { /* скопируют вручную */ }
        resultText.setAttribute('readonly', 'readonly');
      }
    }

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      if (!validate()) return;

      var text = buildMessage();
      resultText.value = text;
      waLink.href = 'https://wa.me/' + PHONE_RAW + '?text=' + encodeURIComponent(text);
      resultBox.classList.add('show');
      copyText(text);

      resultBox.scrollIntoView({ block: 'center', behavior: 'smooth' });
    });

    if (copyAgain) {
      copyAgain.addEventListener('click', function () {
        copyText(resultText.value, copyAgain);
      });
    }
  }

  /* ------------------------------------------------------------------------
     6. Год в подвале
     ------------------------------------------------------------------------ */
  function initYear() {
    $$('[data-year]').forEach(function (el) { el.textContent = new Date().getFullYear(); });
  }

  /* ------------------------------------------------------------------------
     Инициализация
     ------------------------------------------------------------------------ */
  function init() {
    initNav();
    initHeader();
    initReveal();
    initPhoneMask();
    initForm();
    initYear();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
