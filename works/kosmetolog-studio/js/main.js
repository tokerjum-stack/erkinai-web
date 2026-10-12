/* ==========================================================================
   AURA — общий скрипт сайта
   Без зависимостей. Работает и без JS: вся вёрстка и контент доступны,
   JS только улучшает поведение (меню, маска, валидация).
   ========================================================================== */
(function () {
  'use strict';

  /* ------------------------------------------------------------------------
     КОНФИГ
     Здесь единственное место, которое нужно править при подключении бэкенда.
     ------------------------------------------------------------------------ */
  var CONFIG = {
    // Куда отправлять заявки. Пока null — работает демо-режим:
    // заявка сохраняется в localStorage и показывается на thanks.html.
    // Примеры для РФ-хостинга: '/api/booking', 'https://formspree.io/f/xxxx',
    // либо вебхук Telegram-бота.
    endpoint: null,

    // Ключ в localStorage для демо-режима
    storageKey: 'aura_booking_demo',

    // Номер метрики Яндекс.Метрики (вставьте свой ID)
    metrikaId: null
  };

  /* ------------------------------------------------------------------------
     УТИЛИТЫ
     ------------------------------------------------------------------------ */
  function $(sel, ctx) { return (ctx || document).querySelector(sel); }
  function $$(sel, ctx) {
    return Array.prototype.slice.call((ctx || document).querySelectorAll(sel));
  }

  // Цель Яндекс.Метрики — вызывается, если счётчик подключён
  function reachGoal(goal) {
    if (typeof window.ym === 'function' && CONFIG.metrikaId) {
      try { window.ym(CONFIG.metrikaId, 'reachGoal', goal); } catch (e) { /* noop */ }
    }
  }

  function plural(n, one, few, many) {
    var m10 = n % 10, m100 = n % 100;
    if (m10 === 1 && m100 !== 11) return one;
    if (m10 >= 2 && m10 <= 4 && (m100 < 10 || m100 >= 20)) return few;
    return many;
  }

  /* ------------------------------------------------------------------------
     1. МОБИЛЬНОЕ МЕНЮ
     ------------------------------------------------------------------------ */
  function initNav() {
    var burger = $('.burger');
    var nav = $('#site-nav');
    if (!burger || !nav) return;

    function setOpen(open) {
      burger.setAttribute('aria-expanded', open ? 'true' : 'false');
      nav.classList.toggle('is-open', open);
      // Блокируем прокрутку фона, пока открыто меню
      document.body.style.overflow = open ? 'hidden' : '';
    }

    burger.addEventListener('click', function () {
      setOpen(burger.getAttribute('aria-expanded') !== 'true');
    });

    // Клик по ссылке закрывает меню
    $$('a', nav).forEach(function (a) {
      a.addEventListener('click', function () { setOpen(false); });
    });

    // Esc закрывает
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && nav.classList.contains('is-open')) {
        setOpen(false);
        burger.focus();
      }
    });

    // При возврате на десктоп — сбрасываем состояние
    window.addEventListener('resize', function () {
      if (window.innerWidth > 768 && nav.classList.contains('is-open')) setOpen(false);
    });
  }

  /* ------------------------------------------------------------------------
     2. ХЕДЕР ПРИ СКРОЛЛЕ
     ------------------------------------------------------------------------ */
  function initHeader() {
    var header = $('.header');
    if (!header) return;

    function onScroll() {
      header.classList.toggle('is-scrolled', window.scrollY > 8);
    }
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
  }

  /* ------------------------------------------------------------------------
     3. ПОЯВЛЕНИЕ БЛОКОВ ПРИ СКРОЛЛЕ
     ------------------------------------------------------------------------ */
  function initReveal() {
    var items = $$('.reveal');
    if (!items.length) return;

    // Если браузер не умеет IntersectionObserver — просто показываем всё
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
     4. МАСКА ТЕЛЕФОНА +7 (999) 999-99-99
     ------------------------------------------------------------------------ */
  function initPhoneMask() {
    $$('input[type="tel"]').forEach(function (input) {
      input.addEventListener('input', function () {
        var digits = input.value.replace(/\D/g, '');

        // Приводим к формату 7XXXXXXXXXX
        if (digits[0] === '8') digits = '7' + digits.slice(1);
        if (digits[0] !== '7') digits = '7' + digits;
        digits = digits.slice(0, 11);

        var out = '+7';
        if (digits.length > 1) out += ' (' + digits.slice(1, 4);
        if (digits.length >= 5) out += ') ' + digits.slice(4, 7);
        if (digits.length >= 8) out += '-' + digits.slice(7, 9);
        if (digits.length >= 10) out += '-' + digits.slice(9, 11);

        input.value = out;
      });

      // Пустое поле не должно содержать «+7»
      input.addEventListener('blur', function () {
        if (input.value.replace(/\D/g, '').length <= 1) input.value = '';
      });
    });
  }

  /* ------------------------------------------------------------------------
     5. ВАЛИДАЦИЯ ФОРМЫ ЗАПИСИ
     ------------------------------------------------------------------------ */
  function initBookingForm() {
    var form = $('#booking-form');
    if (!form) return;

    var dateInput = $('#field-date');

    // Нельзя записаться на прошедшую дату
    function todayISO() {
      var d = new Date();
      var off = d.getTimezoneOffset();
      return new Date(d.getTime() - off * 60000).toISOString().slice(0, 10);
    }
    if (dateInput) dateInput.min = todayISO();

    // Предзаполнение услуги из адреса вида booking.html?service=piling
    var params = new URLSearchParams(window.location.search);
    var service = params.get('service');
    var serviceSelect = $('#field-service');
    if (service && serviceSelect) {
      var match = $$('option', serviceSelect).find(function (o) {
        return o.value === service;
      });
      if (match) serviceSelect.value = service;
    }

    function setError(field, message) {
      if (!field) return;
      field.classList.add('has-error');
      var box = $('.field__error', field);
      if (box) box.textContent = message;
    }

    function clearError(field) {
      if (!field) return;
      field.classList.remove('has-error');
    }

    function fieldOf(input) { return input.closest('.field') || input.closest('.consent'); }

    // Снимаем ошибку, как только пользователь начал исправлять
    $$('input, select, textarea', form).forEach(function (input) {
      input.addEventListener('input', function () {
        var f = fieldOf(input);
        if (f) clearError(f);
      });
    });

    function validate() {
      var ok = true;
      var firstBad = null;

      // Имя
      var name = $('#field-name');
      if (name && name.value.trim().length < 2) {
        setError(fieldOf(name), 'Укажите имя — минимум 2 символа');
        ok = false; firstBad = firstBad || name;
      }

      // Телефон: 11 цифр
      var phone = $('#field-phone');
      if (phone && phone.value.replace(/\D/g, '').length !== 11) {
        setError(fieldOf(phone), 'Введите телефон полностью: +7 (999) 123-45-67');
        ok = false; firstBad = firstBad || phone;
      }

      // Услуга
      var svc = $('#field-service');
      if (svc && !svc.value) {
        setError(fieldOf(svc), 'Выберите услугу');
        ok = false; firstBad = firstBad || svc;
      }

      // Дата
      if (dateInput && !dateInput.value) {
        setError(fieldOf(dateInput), 'Выберите дату визита');
        ok = false; firstBad = firstBad || dateInput;
      } else if (dateInput && dateInput.value < todayISO()) {
        setError(fieldOf(dateInput), 'Дата уже прошла — выберите будущую');
        ok = false; firstBad = firstBad || dateInput;
      }

      // Согласие на обработку персональных данных (152-ФЗ)
      var consent = $('#field-consent');
      if (consent && !consent.checked) {
        setError(fieldOf(consent), 'Без согласия на обработку данных мы не можем принять заявку');
        ok = false; firstBad = firstBad || consent;
      }

      if (!ok && firstBad) {
        firstBad.focus();
        firstBad.scrollIntoView({ block: 'center', behavior: 'smooth' });
      }
      return ok;
    }

    form.addEventListener('submit', function (e) {
      e.preventDefault();

      if (!validate()) {
        reachGoal('booking_error');
        return;
      }

      var submitBtn = $('button[type="submit"]', form);
      var payload = {
        name: ($('#field-name') || {}).value || '',
        phone: ($('#field-phone') || {}).value || '',
        service: ($('#field-service') || {}).value || '',
        date: ($('#field-date') || {}).value || '',
        time: ($('#field-time') || {}).value || '',
        comment: ($('#field-comment') || {}).value || '',
        createdAt: new Date().toISOString()
      };

      function done() {
        reachGoal('booking_send');
        try {
          window.location.href = 'thanks.html';
        } catch (err) {
          alert('Заявка отправлена! Мы свяжемся с вами в ближайшее время.');
        }
      }

      // Демо-режим: сохраняем локально и ведём на страницу благодарности
      if (!CONFIG.endpoint) {
        try { localStorage.setItem(CONFIG.storageKey, JSON.stringify(payload)); } catch (err) { /* noop */ }
        done();
        return;
      }

      // Боевой режим: отправляем на бэкенд
      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.dataset.label = submitBtn.textContent;
        submitBtn.textContent = 'Отправляем…';
      }

      fetch(CONFIG.endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })
        .then(function (r) {
          if (!r.ok) throw new Error('HTTP ' + r.status);
          done();
        })
        .catch(function () {
          alert('Не удалось отправить заявку. Позвоните нам: +7 (999) 123-45-67');
          reachGoal('booking_error');
        })
        .finally(function () {
          if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.textContent = submitBtn.dataset.label || 'Записаться';
          }
        });
    });
  }

  /* ------------------------------------------------------------------------
     6. СТРАНИЦА «СПАСИБО» — показываем данные демо-заявки
     ------------------------------------------------------------------------ */
  function initThanksPage() {
    var box = $('#booking-summary');
    if (!box) return;

    var raw = null;
    try { raw = localStorage.getItem(CONFIG.storageKey); } catch (e) { /* noop */ }
    // Без данных о заявке карточку НЕ удаляем: в ней лежит статический
    // заголовок «Заявка отправлена». Раньше box.remove() стирал его вместе с
    // карточкой, и страница оставалась вообще без h1 (и без текста благодарности)
    // при прямом открытии, обновлении или обходе поисковиком.
    if (!raw) return;

    var data;
    try { data = JSON.parse(raw); } catch (e) { return; }

    var rows = [
      ['Имя', data.name],
      ['Телефон', data.phone],
      ['Услуга', data.service],
      ['Дата', data.date],
      ['Время', data.time],
      ['Комментарий', data.comment]
    ].filter(function (r) { return r[1]; });

    if (!rows.length) return;

    box.innerHTML =
      '<h1>Ваша заявка принята</h1>' +
      '<p class="lead">Мы свяжемся с вами, чтобы подтвердить время.</p>' +
      '<ul class="info-list mt-32">' +
      rows.map(function (r) {
        return '<li><div><span class="info-list__label">' + r[0] + '</span>' + escapeHtml(r[1]) + '</div></li>';
      }).join('') +
      '</ul>';

    // Демо-заявку показываем один раз
    try { localStorage.removeItem(CONFIG.storageKey); } catch (e) { /* noop */ }
  }

  function escapeHtml(str) {
    return String(str).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  /* ------------------------------------------------------------------------
     7. ГОД В ПОДВАЛЕ
     ------------------------------------------------------------------------ */
  function initYear() {
    $$('[data-year]').forEach(function (el) {
      el.textContent = new Date().getFullYear();
    });
  }

  /* ------------------------------------------------------------------------
     ИНИЦИАЛИЗАЦИЯ
     ------------------------------------------------------------------------ */
  function init() {
    initNav();
    initHeader();
    initReveal();
    initPhoneMask();
    initBookingForm();
    initThanksPage();
    initYear();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
