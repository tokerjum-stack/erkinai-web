/* ============================================================
   УНИВЕРСАЛЬНЫЙ СКРИПТ ДЛЯ БЛОКОВ
   Работает без зависимостей. Если JS отключён — сайт всё равно
   читается: скрытие блоков включается только при наличии .js
   ============================================================ */
(function () {
  'use strict';

  var CFG = window.SITE || {};
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };

  /* ---------- 0. Метка цели для Яндекс Метрики ----------
     Объявлено в начале, чтобы можно было вызывать из любого места файла.
     Номер счётчика приходит из window.SITE.metrika (поле "metrika" в JSON).
     Если счётчика нет — функция молча ничего не делает.                  */
  function reachGoal(name) {
    if (!CFG.metrika) return;
    if (typeof window.ym !== 'function') return;
    try { window.ym(CFG.metrika, 'reachGoal', name); } catch (e) {}
  }

  /* ---------- 1. Мобильное меню ---------- */
  var burger = $('#burger');
  var nav = $('#nav');
  if (burger && nav) {
    var closeNav = function () {
      nav.classList.remove('is-open');
      burger.classList.remove('is-open');
      burger.setAttribute('aria-expanded', 'false');
      document.body.style.overflow = '';
    };
    burger.addEventListener('click', function () {
      var open = nav.classList.toggle('is-open');
      burger.classList.toggle('is-open', open);
      burger.setAttribute('aria-expanded', open ? 'true' : 'false');
      document.body.style.overflow = open ? 'hidden' : '';
    });
    $$('a', nav).forEach(function (a) { a.addEventListener('click', closeNav); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeNav(); });
    window.addEventListener('resize', function () { if (window.innerWidth > 940) closeNav(); });
  }

  /* ---------- 2. Липкая шапка ---------- */
  var head = $('.site-head');
  var up = $('#up');
  var onScroll = function () {
    var y = window.pageYOffset || document.documentElement.scrollTop;
    if (head) head.classList.toggle('is-stuck', y > 12);
    if (up) up.classList.toggle('is-on', y > 700);
  };
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  if (up) {
    up.addEventListener('click', function () {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }

  /* ---------- 3. Появление блоков при прокрутке ---------- */
  var items = $$('.reveal');
  if (items.length) {
    if ('IntersectionObserver' in window) {
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (e) {
          if (e.isIntersecting) {
            e.target.classList.add('is-in');
            io.unobserve(e.target);
          }
        });
      }, { rootMargin: '0px 0px -8% 0px', threshold: 0.06 });
      items.forEach(function (el) { io.observe(el); });
    } else {
      items.forEach(function (el) { el.classList.add('is-in'); });
    }
  }

  /* ---------- 4. Табы меню / услуг ---------- */
  var tabs = $$('.tab');
  if (tabs.length) {
    tabs.forEach(function (tab) {
      tab.addEventListener('click', function () {
        var id = tab.getAttribute('data-tab');
        tabs.forEach(function (t) {
          var on = t === tab;
          t.classList.toggle('is-active', on);
          t.setAttribute('aria-selected', on ? 'true' : 'false');
        });
        $$('.menu-panel').forEach(function (p) {
          p.classList.toggle('is-active', p.getAttribute('data-panel') === id);
        });
      });
      tab.addEventListener('keydown', function (e) {
        var i = tabs.indexOf(tab), next = null;
        if (e.key === 'ArrowRight') next = tabs[(i + 1) % tabs.length];
        if (e.key === 'ArrowLeft') next = tabs[(i - 1 + tabs.length) % tabs.length];
        if (next) { e.preventDefault(); next.focus(); next.click(); }
      });
    });
  }

  /* ---------- 5. Вопросы-ответы ---------- */
  $$('.faq__q').forEach(function (q) {
    q.addEventListener('click', function () {
      var item = q.parentNode;
      var open = item.classList.toggle('is-open');
      q.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
  });

  /* ---------- 6. Маска телефона ---------- */
  $$('input[type="tel"]').forEach(function (input) {
    input.addEventListener('input', function () {
      var d = input.value.replace(/\D/g, '');
      if (d.charAt(0) === '8') d = '7' + d.slice(1);
      if (d.charAt(0) !== '7') d = '7' + d;
      d = d.slice(0, 11);
      var out = '+7';
      if (d.length > 1) out += ' (' + d.slice(1, 4);
      if (d.length >= 5) out += ') ' + d.slice(4, 7);
      if (d.length >= 8) out += '-' + d.slice(7, 9);
      if (d.length >= 10) out += '-' + d.slice(9, 11);
      input.value = out;
    });
    input.addEventListener('focus', function () {
      if (!input.value) input.value = '+7 (';
    });
    input.addEventListener('blur', function () {
      if (input.value.replace(/\D/g, '').length < 11) input.value = '';
    });
  });

  /* ---------- 7. Отправка формы ---------- */
  var form = $('#lead-form');
  if (form) {
    var note = $('#form-note');
    var baseNote = note ? note.textContent : '';

    var say = function (text, bad) {
      if (!note) return;
      note.textContent = text;
      note.style.color = bad ? '#c0392b' : '';
      note.style.fontWeight = bad ? '600' : '';
    };

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var name = ($('#f-name') || {}).value || '';
      var phone = ($('#f-phone') || {}).value || '';
      var when = ($('#f-when') || {}).value || '';
      var service = ($('#f-service') || {}).value || '';
      var comment = ($('#f-comment') || {}).value || '';
      var consent = form.querySelector('input[name="consent"]');

      if (name.trim().length < 2) { say('Пожалуйста, напишите, как к вам обращаться.', true); return; }
      if (phone.replace(/\D/g, '').length < 11) { say('Проверьте номер телефона — не хватает цифр.', true); return; }
      if (consent && !consent.checked) { say('Нужно согласие на обработку данных.', true); return; }

      var lines = [
        'Здравствуйте! Заявка с сайта' + (CFG.name ? ' «' + CFG.name + '»' : '') + '.',
        'Имя: ' + name.trim(),
        'Телефон: ' + phone.trim()
      ];
      if (when) lines.push(CFG.whenLabel ? CFG.whenLabel + ': ' + when : 'Когда: ' + when);
      if (service) lines.push('Услуга: ' + service);
      if (comment.trim()) lines.push('Комментарий: ' + comment.trim());
      var text = lines.join('\n');

      say('Отправляем…');

      if (CFG.whatsapp) {
        window.open('https://wa.me/' + CFG.whatsapp + '?text=' + encodeURIComponent(text), '_blank', 'noopener');
        say('Заявка открыта в WhatsApp — осталось нажать «Отправить».');
      } else if (CFG.email) {
        window.location.href = 'mailto:' + CFG.email +
          '?subject=' + encodeURIComponent('Заявка с сайта') +
          '&body=' + encodeURIComponent(text);
        say('Открываем почтовую программу…');
      } else {
        say('Форма пока не подключена к получателю. Позвоните нам: ' + (CFG.phone || ''), true);
        return;
      }
      form.reset();
      reachGoal('zayavka');
      setTimeout(function () { say(baseNote); }, 6000);
    });
  }

  /* ---------- 8. Корзина и заказ в WhatsApp ---------- */
  var cartPanel = $('#cart-panel');
  if (cartPanel) {
    var cartItems = [];
    var cartList = $('#cart-items');
    var cartEmpty = $('#cart-empty');
    var cartFoot = $('#cart-foot');
    var cartSum = $('#cart-sum');
    var fab = $('#cart-fab');
    var fabCount = $('#cart-count');
    /* кнопка корзины в шапке магазина (блок 00-head с site.shopHead) */
    var headCart = $('#head-cart');
    var headCount = $('#head-cart-count');
    var backdrop = $('#cart-backdrop');
    var errEl = $('#cart-err');
    var addrWrap = $('#cart-addr-wrap');
    var typeSel = $('#cart-type');
    var storeKey = 'cart:' + location.pathname;

    var toNum = function (s) {
      var m = String(s).replace(/[^\d]/g, '');
      return m ? parseInt(m, 10) : 0;
    };
    var money = function (n) {
      return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, '\u00A0') + ' ₽';
    };
    var save = function () {
      try { localStorage.setItem(storeKey, JSON.stringify(cartItems)); } catch (e) {}
    };
    var load = function () {
      try {
        var raw = localStorage.getItem(storeKey);
        if (raw) cartItems = JSON.parse(raw) || [];
      } catch (e) { cartItems = []; }
      if (!Array.isArray(cartItems)) cartItems = [];
    };
    var total = function () {
      return cartItems.reduce(function (s, i) { return s + i.price * i.qty; }, 0);
    };
    var count = function () {
      return cartItems.reduce(function (s, i) { return s + i.qty; }, 0);
    };

    var render = function () {
      var n = count();
      if (fabCount) {
        fabCount.textContent = n;
        fabCount.classList.toggle('is-on', n > 0);
      }
      if (headCount) {
        headCount.textContent = n;
        headCount.classList.toggle('is-on', n > 0);
      }
      if (cartEmpty) cartEmpty.style.display = cartItems.length ? 'none' : '';
      if (cartFoot) cartFoot.hidden = cartItems.length === 0;
      if (cartSum) cartSum.textContent = money(total());
      if (!cartList) return;

      cartList.innerHTML = '';
      cartItems.forEach(function (it, idx) {
        var row = document.createElement('div');
        row.className = 'cart-item';
        row.innerHTML =
          '<span class="cart-item__name"></span>' +
          '<span class="cart-item__price">' + money(it.price * it.qty) + '</span>' +
          '<span class="cart-qty">' +
            '<button type="button" data-dec aria-label="Убрать одну">−</button>' +
            '<span>' + it.qty + '</span>' +
            '<button type="button" data-inc aria-label="Добавить одну">+</button>' +
          '</span>' +
          '<button type="button" class="cart-remove" data-del>убрать</button>';
        row.querySelector('.cart-item__name').textContent = it.name;
        row.querySelector('[data-inc]').addEventListener('click', function () { it.qty++; save(); render(); });
        row.querySelector('[data-dec]').addEventListener('click', function () {
          it.qty--;
          if (it.qty < 1) cartItems.splice(idx, 1);
          save(); render();
        });
        row.querySelector('[data-del]').addEventListener('click', function () {
          cartItems.splice(idx, 1); save(); render();
        });
        cartList.appendChild(row);
      });
    };

    var openCart = function () {
      cartPanel.classList.add('is-on');
      cartPanel.setAttribute('aria-hidden', 'false');
      if (backdrop) backdrop.classList.add('is-on');
      document.body.style.overflow = 'hidden';
    };
    var closeCart = function () {
      cartPanel.classList.remove('is-on');
      cartPanel.setAttribute('aria-hidden', 'true');
      if (backdrop) backdrop.classList.remove('is-on');
      document.body.style.overflow = '';
    };

    $$('[data-add]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var name = btn.getAttribute('data-name') || '';
        var price = toNum(btn.getAttribute('data-price'));
        if (!name || !price) return;
        var found = null;
        cartItems.forEach(function (i) { if (i.name === name) found = i; });
        if (found) found.qty++;
        else cartItems.push({ name: name, price: price, qty: 1 });
        save(); render();
        btn.classList.add('is-added');
        setTimeout(function () { btn.classList.remove('is-added'); }, 700);
      });
    });

    if (fab) fab.addEventListener('click', openCart);
    if (headCart) headCart.addEventListener('click', openCart);
    if (backdrop) backdrop.addEventListener('click', closeCart);
    var closeBtn = $('#cart-close');
    if (closeBtn) closeBtn.addEventListener('click', closeCart);
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeCart(); });

    if (typeSel && addrWrap) {
      var syncAddr = function () {
        var v = (typeSel.value || '').toLowerCase();
        addrWrap.hidden = v.indexOf('доставк') === -1;
      };
      typeSel.addEventListener('change', syncAddr);
      syncAddr();
    }

    var cartForm = $('#cart-form');
    if (cartForm) {
      cartForm.addEventListener('submit', function (e) {
        e.preventDefault();
        var nm = ($('#cart-name') || {}).value || '';
        var ph = ($('#cart-phone') || {}).value || '';
        var tp = ($('#cart-type') || {}).value || '';
        var ad = ($('#cart-addr') || {}).value || '';
        var cm = ($('#cart-comment') || {}).value || '';

        if (nm.trim().length < 2 || ph.replace(/\D/g, '').length < 11) {
          if (errEl) errEl.classList.add('is-on');
          return;
        }
        if (errEl) errEl.classList.remove('is-on');

        var lines = ['Здравствуйте! Заказ с сайта' + (CFG.name ? ' «' + CFG.name + '»' : '') + ':', ''];
        cartItems.forEach(function (i) {
          lines.push('• ' + i.name + ' — ' + i.qty + ' шт × ' + money(i.price) + ' = ' + money(i.price * i.qty));
        });
        lines.push('');
        lines.push('Итого: ' + money(total()));
        lines.push('');
        lines.push('Имя: ' + nm.trim());
        lines.push('Телефон: ' + ph.trim());
        if (tp) lines.push('Способ: ' + tp);
        if (ad.trim() && addrWrap && !addrWrap.hidden) lines.push('Адрес: ' + ad.trim());
        if (cm.trim()) lines.push('Комментарий: ' + cm.trim());

        var text = lines.join('\n');

        if (CFG.whatsapp) {
          window.open('https://wa.me/' + CFG.whatsapp + '?text=' + encodeURIComponent(text), '_blank', 'noopener');
          cartItems = [];
          save();
          render();
          cartForm.reset();
          if (typeSel && addrWrap) addrWrap.hidden = (typeSel.value || '').toLowerCase().indexOf('доставк') === -1;
          closeCart();
          reachGoal('zakaz');
        } else if (CFG.email) {
          window.location.href = 'mailto:' + CFG.email +
            '?subject=' + encodeURIComponent('Заказ с сайта') +
            '&body=' + encodeURIComponent(text);
        } else if (errEl) {
          errEl.textContent = 'Заказ некуда отправить — позвоните нам: ' + (CFG.phone || '');
          errEl.classList.add('is-on');
        }
      });
    }

    load();
    render();
  }

  /* ---------- 10. Цели Яндекс Метрики ----------
     Метка сообщает Метрике точно: заявка ушла тогда, когда человек реально
     заполнил поля, а не просто нажал кнопку. Автоцели Метрики только угадывают.
     В Метрике нужны цели с теми же именами: zayavka, zvonok, whatsapp.
     Тип — «JavaScript-событие». Функция reachGoal объявлена в начале файла. */
  $$('a[href^="tel:"]').forEach(function (a) {
    a.addEventListener('click', function () { reachGoal('zvonok'); });
  });
  $$('a[href*="wa.me"], a[href*="whatsapp"]').forEach(function (a) {
    a.addEventListener('click', function () { reachGoal('whatsapp'); });
  });

  /* ---------- 9. Плавный переход по якорям с учётом шапки ---------- */
  $$('a[href^="#"]').forEach(function (a) {
    a.addEventListener('click', function (e) {
      var id = a.getAttribute('href');
      if (!id || id === '#') return;
      var target = document.getElementById(id.slice(1));
      if (!target) return;
      e.preventDefault();
      /* у шапки магазина две строки — отступ больше */
      var offset = document.querySelector('.site-head--shop') ? 136 : 78;
      var top = target.getBoundingClientRect().top + window.pageYOffset - offset;
      window.scrollTo({ top: top, behavior: 'smooth' });
      history.replaceState(null, '', id);
    });
  });

  /* ---------- 11. Магазин: поиск по подборкам и каталогу ----------
     Поиск есть только у сайтов с полем поиска в шапке (site.shopHead).
     Он фильтрует карточки подборок и строки каталога, прячет пустые
     разделы и показывает, сколько моделей нашлось. */
  var searchInput = $('#head-search-input');
  if (searchInput) {
    var searchForm = $('#head-search');
    var searchReset = $('#head-search-reset');
    var searchStatus = $('#search-status');
    var gridCards = $$('.pgrid__card');
    var priceRows = $$('.price-row');
    var panels = $$('.menu-panel');
    var menuSect = $('#menu');
    var pgridSects = $$('.pgrid-sect');

    var low = function (s) {
      return String(s === null || s === undefined ? '' : s).toLowerCase().replace(/ё/g, 'е');
    };
    var statusText = function (name) {
      return searchStatus ? (searchStatus.getAttribute(name) || '') : '';
    };
    var setStatus = function (text) {
      if (!searchStatus) return;
      searchStatus.textContent = text;
      searchStatus.hidden = !text;
    };

    var resetSearch = function () {
      gridCards.forEach(function (c) { c.hidden = false; });
      priceRows.forEach(function (r) { r.hidden = false; });
      panels.forEach(function (p) { p.hidden = false; });
      pgridSects.forEach(function (s) { s.hidden = false; });
      if (menuSect) menuSect.classList.remove('is-search');
      if (searchReset) searchReset.hidden = true;
      setStatus('');
    };

    var runSearch = function () {
      var term = low(searchInput.value).trim();
      if (!term) { resetSearch(); return; }
      if (searchReset) searchReset.hidden = false;
      if (menuSect) menuSect.classList.add('is-search');

      var found = 0;
      gridCards.forEach(function (c) {
        var hit = low(c.getAttribute('data-name')).indexOf(term) !== -1;
        c.hidden = !hit;
        if (hit) found++;
      });
      /* первую подборку не прячем: в ней стоит строка с результатом */
      pgridSects.forEach(function (s, i) {
        if (i > 0) s.hidden = !s.querySelector('.pgrid__card:not([hidden])');
      });

      priceRows.forEach(function (r) {
        var hit = low(r.textContent).indexOf(term) !== -1;
        r.hidden = !hit;
        if (hit) found++;
      });
      panels.forEach(function (p) {
        p.hidden = !p.querySelector('.price-row:not([hidden])');
      });

      if (found) setStatus(statusText('data-found') + found);
      else setStatus(statusText('data-empty'));
    };

    searchInput.addEventListener('input', runSearch);
    if (searchForm) {
      searchForm.addEventListener('submit', function (e) {
        e.preventDefault();
        runSearch();
        var target = null;
        pgridSects.forEach(function (s) { if (!target && !s.hidden) target = s; });
        if (!target) target = menuSect;
        if (!target) return;
        window.scrollTo({
          top: target.getBoundingClientRect().top + window.pageYOffset - 136,
          behavior: 'smooth'
        });
      });
    }
    if (searchReset) {
      searchReset.addEventListener('click', function () {
        searchInput.value = '';
        resetSearch();
        searchInput.focus();
      });
    }
    /* гость выбрал раздел в каталоге — поиск больше не нужен */
    $$('.tab').forEach(function (t) {
      t.addEventListener('click', function () {
        if (searchInput.value) { searchInput.value = ''; resetSearch(); }
      });
    });
  }

  /* ---------- 12. Плитка категории открывает свой раздел каталога ---------- */
  $$('[data-cat]').forEach(function (tile) {
    tile.addEventListener('click', function () {
      var tab = $('.tab[data-tab="' + tile.getAttribute('data-cat') + '"]');
      if (tab) tab.click();
    });
  });

  /* ---------- 13. Подписка на новинки (форма демо-макета) ----------
     Форма ничего не отправляет: у сайта пока нет рассылки, и об этом
     прямо написано в блоке. Тексты сообщений берём из JSON. */
  var subForm = $('#sub-form');
  if (subForm) {
    var subMsg = $('#sub-msg');
    var subSay = function (text, bad) {
      if (!subMsg) return;
      subMsg.textContent = text;
      subMsg.className = bad ? 'sub__msg is-bad' : 'sub__msg';
    };
    subForm.addEventListener('submit', function (e) {
      e.preventDefault();
      var mail = ($('#sub-email') || {}).value || '';
      var at = mail.indexOf('@');
      var good = at > 0 && mail.indexOf('.', at) > 0 && mail.indexOf(' ') === -1;
      if (!good) { subSay(subForm.getAttribute('data-bad') || '', true); return; }
      subSay(subForm.getAttribute('data-ok') || '', false);
      subForm.reset();
    });
  }
})();
