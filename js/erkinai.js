/* ==========================================================================
   Erkinai.ru — скрипты страницы
   1) Мобильное меню (бургер, подложка, Esc, focus)
   2) Тень у шапки при прокрутке
   3) Год в подвале
   4) Форма заявки: проверка, сборка текста, WhatsApp и копирование
   ========================================================================== */
(function () {
  'use strict';

  /* ---------- 1. Мобильное меню ---------------------------------------- */
  var burger = document.getElementById('burger');
  var nav = document.getElementById('site-nav');
  var backdrop = document.getElementById('nav-backdrop');
  var mq = window.matchMedia('(max-width: 900px)');

  function isOpen() {
    return nav.classList.contains('is-open');
  }

  function openNav() {
    nav.classList.add('is-open');
    burger.setAttribute('aria-expanded', 'true');
    burger.setAttribute('aria-label', 'Закрыть меню');
    backdrop.hidden = false;
    // даём браузеру отрисовать подложку, потом включаем анимацию
    requestAnimationFrame(function () {
      backdrop.classList.add('is-visible');
    });
    document.body.style.overflow = 'hidden';
    // фокус — только после того, как панель стала видимой
    var first = nav.querySelector('a');
    if (first) {
      requestAnimationFrame(function () { first.focus({ preventScroll: true }); });
    }
  }

  function closeNav(returnFocus) {
    if (!isOpen()) return;
    nav.classList.remove('is-open');
    burger.setAttribute('aria-expanded', 'false');
    burger.setAttribute('aria-label', 'Открыть меню');
    backdrop.classList.remove('is-visible');
    document.body.style.overflow = '';
    window.setTimeout(function () {
      if (!isOpen()) backdrop.hidden = true;
    }, 280);
    if (returnFocus) burger.focus({ preventScroll: true });
  }

  if (burger && nav) {
    burger.addEventListener('click', function () {
      if (isOpen()) closeNav(true);
      else openNav();
    });

    if (backdrop) backdrop.addEventListener('click', function () { closeNav(true); });

    // клик по ссылке в меню — закрыть
    nav.addEventListener('click', function (e) {
      if (e.target.closest('a')) closeNav(false);
    });

    // Esc закрывает, Tab не уходит за пределы открытого меню
    document.addEventListener('keydown', function (e) {
      if (!isOpen()) return;
      if (e.key === 'Escape') { closeNav(true); return; }
      if (e.key !== 'Tab') return;

      var items = nav.querySelectorAll('a, button');
      if (!items.length) return;
      var first = items[0];
      var last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    });

    // при переходе на десктоп меню должно быть закрыто
    var onBreakpoint = function (e) { if (!e.matches) closeNav(false); };
    if (mq.addEventListener) mq.addEventListener('change', onBreakpoint);
    else if (mq.addListener) mq.addListener(onBreakpoint);
  }

  /* ---------- 2. Тень у шапки ------------------------------------------ */
  var header = document.getElementById('site-header');
  if (header) {
    var onScroll = function () {
      if (window.scrollY > 8) header.classList.add('is-stuck');
      else header.classList.remove('is-stuck');
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
  }

  /* ---------- 3. Год в подвале ----------------------------------------- */
  var year = document.getElementById('year');
  if (year) year.textContent = String(new Date().getFullYear());

  /* ---------- Цели Яндекс.Метрики --------------------------------------- */
  // Идентификаторы совпадают с целями в кабинете: zayavka, whatsapp.
  // Если счётчика нет (превью, локальный сервер) — просто ничего не происходит.
  function reachGoal(name) {
    if (typeof window.ym === 'function') {
      try { window.ym(113200907, 'reachGoal', name); } catch (e) { /* счётчик не загрузился */ }
    }
  }

  document.addEventListener('click', function (e) {
    var link = e.target.closest && e.target.closest('a[href*="wa.me"]');
    if (link) reachGoal('whatsapp');
  });

  /* ---------- 4. Форма заявки ------------------------------------------ */
  var form = document.getElementById('lead-form');
  if (!form) return;

  var WA_NUMBER = '79218202007';
  var nameField = document.getElementById('field-name');
  var contactField = document.getElementById('field-contact');
  var businessField = document.getElementById('field-business');
  var kindField = document.getElementById('field-kind');
  var detailsField = document.getElementById('field-details');
  var consentField = document.getElementById('field-consent');
  var resultBox = document.getElementById('form-result');
  var resultText = document.getElementById('result-text');
  var waLink = document.getElementById('wa-link');
  var copyAgain = document.getElementById('copy-again');

  var errorFor = {
    'field-name': 'err-name',
    'field-contact': 'err-contact',
    'field-consent': 'err-consent'
  };

  function setError(field, isError) {
    var errId = errorFor[field.id];
    var err = errId ? document.getElementById(errId) : null;
    field.setAttribute('aria-invalid', isError ? 'true' : 'false');
    if (err) err.classList.toggle('is-shown', isError);
  }

  function buildMessage() {
    var lines = [];
    lines.push('Здравствуйте! Меня зовут ' + nameField.value.trim() + '.');
    lines.push('Связаться со мной: ' + contactField.value.trim() + '.');
    lines.push('Мой бизнес: ' + businessField.value + '.');
    lines.push('Нужен сайт: ' + kindField.value + '.');
    var details = detailsField.value.trim();
    if (details) lines.push('Задача: ' + details);
    lines.push('Согласие на обработку персональных данных: да.');
    return lines.join('\n');
  }

  function copyText(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      return navigator.clipboard.writeText(text);
    }
    // запасной путь для http и старых браузеров
    return new Promise(function (resolve, reject) {
      try {
        var ta = document.createElement('textarea');
        ta.value = text;
        ta.setAttribute('readonly', '');
        ta.style.position = 'fixed';
        ta.style.top = '-1000px';
        document.body.appendChild(ta);
        ta.select();
        var ok = document.execCommand('copy');
        document.body.removeChild(ta);
        ok ? resolve() : reject(new Error('copy failed'));
      } catch (err) {
        reject(err);
      }
    });
  }

  form.addEventListener('submit', function (e) {
    e.preventDefault();

    var okName = nameField.value.trim().length >= 2;
    var okContact = contactField.value.trim().length >= 5;
    var okConsent = consentField.checked;

    setError(nameField, !okName);
    setError(contactField, !okContact);
    setError(consentField, !okConsent);

    if (!okName) { nameField.focus(); return; }
    if (!okContact) { contactField.focus(); return; }
    if (!okConsent) { consentField.focus(); return; }

    var message = buildMessage();
    resultText.value = message;

    var url = 'https://wa.me/' + WA_NUMBER + '?text=' + encodeURIComponent(message);
    if (waLink) waLink.href = url;

    resultBox.classList.add('is-shown');

    copyText(message).then(function () {
      copyAgain.textContent = 'Скопировано';
      window.setTimeout(function () { copyAgain.textContent = 'Скопировать текст'; }, 2500);
    }).catch(function () {
      copyAgain.textContent = 'Скопировать текст';
    });

    var title = resultBox.querySelector('h3');
    if (title) title.focus({ preventScroll: true });
    resultBox.scrollIntoView({ behavior: 'smooth', block: 'center' });

    reachGoal('zayavka');
  });

  // убираем ошибку, как только поле заполнено
  [nameField, contactField].forEach(function (field) {
    field.addEventListener('input', function () {
      if (field.getAttribute('aria-invalid') === 'true' && field.value.trim().length >= 2) {
        setError(field, false);
      }
    });
  });
  consentField.addEventListener('change', function () {
    if (consentField.checked) setError(consentField, false);
  });

  copyAgain.addEventListener('click', function () {
    copyText(resultText.value).then(function () {
      copyAgain.textContent = 'Скопировано';
      window.setTimeout(function () { copyAgain.textContent = 'Скопировать текст'; }, 2500);
    });
  });
})();
