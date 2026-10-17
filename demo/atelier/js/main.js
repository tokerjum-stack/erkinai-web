/* ==========================================================================
   Мастерская 12 — демонстрационный макет сайта ателье женской одежды
   --------------------------------------------------------------------------
   1. Появление блоков при прокрутке (IntersectionObserver)
   2. Состояние шапки при прокрутке
   3. Лента коллекции: кнопки, клавиатура, индикатор прокрутки
   4. Форма записи: проверка полей и сборка ссылки для WhatsApp
   Без внешних зависимостей. При prefers-reduced-motion анимации отключены.
   ========================================================================== */
(function () {
  'use strict';

  var root = document.documentElement;
  var reduceQuery = window.matchMedia('(prefers-reduced-motion: reduce)');

  function reduced() { return reduceQuery.matches; }
  function motion(behavior) { return reduced() ? 'auto' : behavior; }
  function rafThrottle(fn) {
    var queued = false;
    return function () {
      if (queued) return;
      queued = true;
      window.requestAnimationFrame(function () { queued = false; fn(); });
    };
  }

  /* 1. Появление блоков при прокрутке ------------------------------------ */
  var revealItems = Array.prototype.slice.call(document.querySelectorAll('[data-reveal]'));

  // Задержка по порядку внутри группы: блоки проявляются друг за другом
  Array.prototype.slice.call(document.querySelectorAll('[data-reveal-group]')).forEach(function (group) {
    Array.prototype.slice.call(group.querySelectorAll('[data-reveal]')).forEach(function (el, i) {
      el.style.setProperty('--i', String(Math.min(i, 8)));
    });
  });

  function show(el) { el.classList.add('is-in'); }
  function showAll() { revealItems.forEach(show); }

  if (reduced() || !('IntersectionObserver' in window)) {
    // Анимаций нет — контент показывается сразу, без наблюдения
    showAll();
  } else {
    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        show(entry.target);
        observer.unobserve(entry.target);
      });
    }, { threshold: 0.15, rootMargin: '0px 0px -6% 0px' });

    revealItems.forEach(function (el) { observer.observe(el); });

    // У самого низа страницы показываем всё: блок в подвале не должен остаться скрытым
    var checkBottom = function () {
      if (window.innerHeight + window.scrollY >= root.scrollHeight - 4) showAll();
    };
    window.addEventListener('scroll', checkBottom, { passive: true });
    checkBottom();

    // Подстраховка: если наблюдатель не сработал, показываем то, что уже в кадре
    window.setTimeout(function () {
      revealItems.forEach(function (el) {
        if (el.classList.contains('is-in')) return;
        var box = el.getBoundingClientRect();
        if (box.top < window.innerHeight && box.bottom > 0) show(el);
      });
    }, 2500);

    // Пользователь включил «уменьшить движение» на ходу — убираем анимации
    if (reduceQuery.addEventListener) {
      reduceQuery.addEventListener('change', function () { if (reduced()) showAll(); });
    }
  }

  /* 2. Шапка -------------------------------------------------------------- */
  var head = document.getElementById('site-head');
  if (head) {
    var onHeadScroll = rafThrottle(function () {
      head.classList.toggle('is-scrolled', window.scrollY > 8);
    });
    window.addEventListener('scroll', onHeadScroll, { passive: true });
    onHeadScroll();
  }

  /* 3. Лента коллекции ----------------------------------------------------- */
  var rail = document.getElementById('rail');
  var track = document.getElementById('rail-track');

  if (rail && track) {
    var prevBtn = document.getElementById('rail-prev');
    var nextBtn = document.getElementById('rail-next');
    var bar = document.getElementById('rail-progress-bar');

    function isVertical() {
      return window.getComputedStyle(track).flexDirection.indexOf('column') === 0;
    }

    function step() {
      var card = track.querySelector('.look');
      if (!card) return rail.clientWidth;
      var gap = parseFloat(window.getComputedStyle(track).columnGap) || 0;
      return card.getBoundingClientRect().width + gap;
    }

    function maxScroll() { return Math.max(0, rail.scrollWidth - rail.clientWidth); }

    function update() {
      var max = maxScroll();
      var left = rail.scrollLeft;
      if (prevBtn) prevBtn.disabled = left <= 1;
      if (nextBtn) nextBtn.disabled = left >= max - 1;
      if (bar) {
        var visible = rail.clientWidth / rail.scrollWidth;
        var width = Math.max(12, Math.round(rail.clientWidth * visible));
        var ratio = max > 0 ? left / max : 0;
        bar.style.width = width + 'px';
        bar.style.transform = 'translateX(' + (ratio * (rail.clientWidth - width)) + 'px)';
      }
    }

    function go(dir) {
      rail.scrollBy({ left: dir * step(), behavior: motion('smooth') });
    }

    if (prevBtn) prevBtn.addEventListener('click', function () { go(-1); });
    if (nextBtn) nextBtn.addEventListener('click', function () { go(1); });

    rail.addEventListener('scroll', rafThrottle(update), { passive: true });
    window.addEventListener('resize', rafThrottle(update));

    rail.addEventListener('keydown', function (event) {
      // На телефоне лента вертикальная — стрелки должны прокручивать страницу
      if (isVertical()) return;
      var key = event.key;
      if (key === 'ArrowRight') { event.preventDefault(); go(1); }
      else if (key === 'ArrowLeft') { event.preventDefault(); go(-1); }
      else if (key === 'Home') { event.preventDefault(); rail.scrollTo({ left: 0, behavior: motion('smooth') }); }
      else if (key === 'End') { event.preventDefault(); rail.scrollTo({ left: maxScroll(), behavior: motion('smooth') }); }
    });

    update();
  }

  /* 4. Форма записи -------------------------------------------------------- */
  var form = document.getElementById('booking-form');

  if (form) {
    var WA_NUMBER = '79000000000'; // постановочный номер ателье для демонстрации
    var status = document.getElementById('form-status');
    var result = document.getElementById('wa-result');
    var resultLink = document.getElementById('wa-link');
    var preview = document.getElementById('wa-preview');

    var nameInput = document.getElementById('f-name');
    var phoneInput = document.getElementById('f-phone');
    var taskInput = document.getElementById('f-task');
    var dayInput = document.getElementById('f-day');
    var consentInput = document.getElementById('f-consent');

    // Приводим телефон к виду +7 (900) 000-00-00; null — номер неверный
    function normalizePhone(raw) {
      var digits = String(raw).replace(/\D/g, '');
      if (digits.length === 11 && (digits.charAt(0) === '7' || digits.charAt(0) === '8')) {
        digits = '7' + digits.slice(1);
      } else if (digits.length === 10 && digits.charAt(0) === '9') {
        digits = '7' + digits;
      }
      if (digits.length !== 11 || digits.charAt(0) !== '7') return null;
      return '+7 (' + digits.slice(1, 4) + ') ' + digits.slice(4, 7) + '-' + digits.slice(7, 9) + '-' + digits.slice(9, 11);
    }

    function rule(el) {
      var value = String(el.value || '').trim();
      if (el === nameInput) return value.length >= 2;
      if (el === phoneInput) return normalizePhone(value) !== null;
      if (el === taskInput) return value.length >= 3;
      if (el === dayInput) return value !== '';
      if (el === consentInput) return !!el.checked;
      return true;
    }

    function paint(el, ok) {
      var error = document.getElementById('e-' + el.id.slice(2));
      if (ok) {
        el.removeAttribute('aria-invalid');
      } else {
        el.setAttribute('aria-invalid', 'true');
      }
      if (error) error.hidden = ok;
      return ok;
    }

    function validate(el) { return paint(el, rule(el)); }

    function setStatus(text, isError) {
      if (!status) return;
      status.textContent = text;
      status.classList.toggle('is-error', !!isError);
    }

    [nameInput, phoneInput, taskInput, dayInput, consentInput].forEach(function (el) {
      if (!el) return;
      var eventName = el.tagName === 'SELECT' ? 'change' : 'input';
      el.addEventListener(eventName, function () {
        // Ошибку снимаем сразу, как только поле стало верным
        if (el.getAttribute('aria-invalid') === 'true' && rule(el)) paint(el, true);
        if (status && status.textContent && !status.classList.contains('is-error')) return;
        if (status && status.classList.contains('is-error')) setStatus('', false);
      });
    });

    form.addEventListener('submit', function (event) {
      event.preventDefault();
      if (result) result.hidden = true;

      var fields = [nameInput, phoneInput, taskInput, dayInput, consentInput];
      var bad = fields.filter(function (el) { return el && !validate(el); });

      if (bad.length) {
        setStatus(bad.length + ' ' + plural(bad.length, ['поле', 'поля', 'полей']) + ' нужно поправить.', true);
        bad[0].focus();
        return;
      }

      var name = nameInput.value.trim();
      var phone = normalizePhone(phoneInput.value);
      var task = taskInput.value.trim();
      var day = dayInput.value;

      var text = 'Здравствуйте! Хочу записаться на примерку в ателье «Мастерская 12».\n' +
        'Имя: ' + name + '\n' +
        'Телефон: ' + phone + '\n' +
        'Что сшить: ' + task + '\n' +
        'Удобный день: ' + day + '\n' +
        'Согласие на обработку персональных данных: да';

      var url = 'https://wa.me/' + WA_NUMBER + '?text=' + encodeURIComponent(text);

      if (resultLink) resultLink.href = url;
      if (preview) preview.textContent = text;
      if (result) result.hidden = false;

      setStatus('Сообщение собрано. Открываю WhatsApp — если он не открылся, ссылка ниже.', false);

      try {
        window.open(url, '_blank', 'noopener');
      } catch (err) {
        // Открытие окна могло быть заблокировано браузером — ссылка ниже остаётся
      }

      if (result && result.scrollIntoView) {
        result.scrollIntoView({ block: 'nearest', behavior: motion('smooth') });
      }
    });

    function plural(n, forms) {
      var mod100 = n % 100;
      var mod10 = n % 10;
      if (mod100 > 10 && mod100 < 20) return forms[2];
      if (mod10 === 1) return forms[0];
      if (mod10 > 1 && mod10 < 5) return forms[1];
      return forms[2];
    }
  }
})();
