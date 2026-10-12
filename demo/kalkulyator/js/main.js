/* Потолки Дома — демонстрационный макет.
   Калькулятор стоимости натяжного потолка.
   Без внешних зависимостей: чистый JS, работает из file://. */

(function () {
  'use strict';

  /* ---------------------------------------------------------------
     Цены демонстрационного макета (примерные, не публичная оферта)
     --------------------------------------------------------------- */
  var PRICES = {
    canvas: { matte: 900, satin: 1050, gloss: 1200 },
    corner: 350,
    light: 450,
    pipe: 500,
    demontage: 250,
    trash: 2500
  };

  var CANVAS_NAME = { matte: 'Матовое', satin: 'Сатиновое', gloss: 'Глянцевое' };

  var LIMITS = {
    area: { min: 5, max: 200 },
    corners: { min: 0, max: 12 },
    lights: { min: 0, max: 30 },
    pipes: { min: 0, max: 6 }
  };

  var DEFAULTS = {
    area: 20,
    canvas: 'matte',
    corners: 4,
    lights: 6,
    pipes: 0,
    demontage: false,
    trash: false
  };

  var STORAGE_KEY = 'potolki-doma-demo-calc-v1';
  var WHATSAPP_PHONE = '79000000000';

  /* ---------------------------------------------------------------
     Утилиты
     --------------------------------------------------------------- */

  function byId(id) { return document.getElementById(id); }

  var numberFormat = null;
  try { numberFormat = new Intl.NumberFormat('ru-RU'); } catch (e) { numberFormat = null; }

  function fmt(value) {
    var n = Math.round(Number(value));
    if (!isFinite(n)) n = 0;
    if (numberFormat) return numberFormat.format(n);
    return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, '\u00A0');
  }

  function money(value) { return fmt(value) + ' ₽'; }

  function clamp(value, min, max) {
    if (value < min) return min;
    if (value > max) return max;
    return value;
  }

  /* Чтение числа из поля: пусто -> 0, минус отбрасываем, NaN -> 0,
     больше максимума -> максимум. Отрицательных значений не бывает. */
  function readNum(input, key) {
    var raw = String(input.value == null ? '' : input.value).trim();
    if (raw === '') return 0;
    var cleaned = raw.replace(/\s+/g, '').replace(',', '.');
    var n = Number(cleaned);
    if (!isFinite(n)) return 0;
    if (n < 0) n = 0;
    n = Math.floor(n);
    return clamp(n, 0, LIMITS[key].max);
  }

  /* Приводит поле в порядок после ввода: пустое остаётся пустым,
     иначе значение ограничивается допустимым диапазоном. */
  function normalizeField(input, key) {
    var lim = LIMITS[key];
    if (String(input.value).trim() === '') { input.value = ''; return; }
    var v = readNum(input, key);
    if (v < lim.min) v = lim.min;
    input.value = String(v);
  }

  /* ---------------------------------------------------------------
     Ссылки на элементы
     --------------------------------------------------------------- */

  var els = {
    areaNum: byId('area-num'), areaRange: byId('area-range'),
    cornersNum: byId('corners-num'), cornersRange: byId('corners-range'),
    lightsNum: byId('lights-num'), lightsRange: byId('lights-range'),
    pipesNum: byId('pipes-num'), pipesRange: byId('pipes-range'),
    demontage: byId('demontage'),
    trash: byId('trash'),
    lines: byId('calc-lines'),
    total: byId('total-value'),
    areaNote: byId('area-note'),
    reset: byId('reset'),
    mobileBar: byId('mobile-bar'),
    mobileTotal: byId('mobile-total'),
    calcSection: byId('calc')
  };

  var PAIRS = [
    { input: els.areaNum, range: els.areaRange, key: 'area' },
    { input: els.cornersNum, range: els.cornersRange, key: 'corners' },
    { input: els.lightsNum, range: els.lightsRange, key: 'lights' },
    { input: els.pipesNum, range: els.pipesRange, key: 'pipes' }
  ];

  var canvasRadios = [].slice.call(document.querySelectorAll('input[name="canvas"]'));
  var waLinks = [].slice.call(document.querySelectorAll('[data-wa]'));

  /* ---------------------------------------------------------------
     Состояние и расчёт
     --------------------------------------------------------------- */

  function canvasValue() {
    for (var i = 0; i < canvasRadios.length; i++) {
      if (canvasRadios[i].checked) return canvasRadios[i].value;
    }
    return DEFAULTS.canvas;
  }

  function readState() {
    return {
      area: readNum(els.areaNum, 'area'),
      corners: readNum(els.cornersNum, 'corners'),
      lights: readNum(els.lightsNum, 'lights'),
      pipes: readNum(els.pipesNum, 'pipes'),
      canvas: canvasValue(),
      demontage: !!els.demontage.checked,
      trash: !!els.trash.checked
    };
  }

  /* Позиции расчёта: что, сколько единиц, цена за единицу, сумма. */
  function buildRows(s) {
    var rows = [];
    var canvasPrice = PRICES.canvas[s.canvas];
    if (!canvasPrice) canvasPrice = PRICES.canvas[DEFAULTS.canvas];

    if (s.area > 0) {
      rows.push({
        code: 'canvas', name: 'Полотно «' + (CANVAS_NAME[s.canvas] || CANVAS_NAME[DEFAULTS.canvas]) + '»',
        qty: s.area, unitLabel: 'м²', unit: canvasPrice, sum: s.area * canvasPrice
      });
    }
    if (s.corners > 0) {
      rows.push({ code: 'corners', name: 'Обработка углов', qty: s.corners, unitLabel: 'шт', unit: PRICES.corner, sum: s.corners * PRICES.corner });
    }
    if (s.lights > 0) {
      rows.push({ code: 'lights', name: 'Светильники, подготовка точек', qty: s.lights, unitLabel: 'шт', unit: PRICES.light, sum: s.lights * PRICES.light });
    }
    if (s.pipes > 0) {
      rows.push({ code: 'pipes', name: 'Обход трубы', qty: s.pipes, unitLabel: 'шт', unit: PRICES.pipe, sum: s.pipes * PRICES.pipe });
    }
    if (s.demontage && s.area > 0) {
      rows.push({ code: 'demontage', name: 'Демонтаж старого потолка', qty: s.area, unitLabel: 'м²', unit: PRICES.demontage, sum: s.area * PRICES.demontage });
    }
    if (s.trash) {
      rows.push({ code: 'trash', name: 'Вывоз мусора', qty: 1, unitLabel: 'шт', unit: PRICES.trash, sum: PRICES.trash });
    }
    return rows;
  }

  function totalOf(rows) {
    var total = 0;
    for (var i = 0; i < rows.length; i++) total += rows[i].sum;
    return total;
  }

  /* ---------------------------------------------------------------
     Отрисовка
     --------------------------------------------------------------- */

  function paintRows(rows) {
    var list = els.lines;
    while (list.firstChild) list.removeChild(list.firstChild);

    if (!rows.length) {
      var empty = document.createElement('li');
      empty.className = 'lines-empty';
      empty.textContent = 'Пока нет ни одной позиции: укажите площадь потолка и параметры слева.';
      list.appendChild(empty);
      return;
    }

    rows.forEach(function (row) {
      var li = document.createElement('li');
      li.className = 'line';
      li.setAttribute('data-code', row.code);
      li.setAttribute('data-qty', String(row.qty));
      li.setAttribute('data-unit', String(row.unit));
      li.setAttribute('data-sum', String(row.sum));

      var name = document.createElement('span');
      name.className = 'line-name';
      name.textContent = row.name;

      var meta = document.createElement('span');
      meta.className = 'line-meta';

      var qty = document.createElement('span');
      qty.className = 'line-qty';
      qty.textContent = fmt(row.qty) + ' ' + row.unitLabel;

      var unit = document.createElement('span');
      unit.className = 'line-unit';
      unit.textContent = money(row.unit) + '/' + row.unitLabel;

      meta.appendChild(qty);
      meta.appendChild(unit);

      var sum = document.createElement('span');
      sum.className = 'line-sum';
      sum.textContent = money(row.sum);

      li.appendChild(name);
      li.appendChild(meta);
      li.appendChild(sum);
      list.appendChild(li);
    });
  }

  /* ---------------------------------------------------------------
     Сообщение для WhatsApp
     --------------------------------------------------------------- */

  function buildMessage(s, total) {
    var lines = [
      'Здравствуйте! Расчёт стоимости натяжного потолка с сайта «Потолки Дома» (демонстрационный макет).',
      '',
      'Площадь потолка: ' + fmt(s.area) + ' м²',
      'Тип полотна: ' + (CANVAS_NAME[s.canvas] || CANVAS_NAME[DEFAULTS.canvas]) + ' — ' + money(PRICES.canvas[s.canvas]) + '/м²',
      'Углы: ' + fmt(s.corners) + ' шт — ' + money(s.corners * PRICES.corner),
      'Светильники: ' + fmt(s.lights) + ' шт — ' + money(s.lights * PRICES.light),
      'Обход трубы: ' + (s.pipes > 0 ? fmt(s.pipes) + ' шт — ' + money(s.pipes * PRICES.pipe) : 'нет'),
      'Демонтаж старого потолка: ' + (s.demontage ? 'да — ' + money(s.area * PRICES.demontage) : 'нет'),
      'Вывоз мусора: ' + (s.trash ? 'да — ' + money(PRICES.trash) : 'нет'),
      '',
      'Итого: ' + money(total),
      'Цены примерные, расчёт предварительный.'
    ];
    return lines.join('\n');
  }

  function waHref(s, total) {
    return 'https://wa.me/' + WHATSAPP_PHONE + '?text=' + encodeURIComponent(buildMessage(s, total));
  }

  /* ---------------------------------------------------------------
     Сохранение между перезагрузками
     --------------------------------------------------------------- */

  function saveState() {
    var data = {
      area: els.areaNum.value,
      corners: els.cornersNum.value,
      lights: els.lightsNum.value,
      pipes: els.pipesNum.value,
      canvas: canvasValue(),
      demontage: !!els.demontage.checked,
      trash: !!els.trash.checked
    };
    try { window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); } catch (e) { /* приватный режим */ }
  }

  function digitsOnly(value) {
    var s = String(value == null ? '' : value);
    s = s.replace(/[^\d]/g, '');
    return s.slice(0, 6);
  }

  function loadState() {
    var saved = null;
    try {
      var raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) saved = JSON.parse(raw);
    } catch (e) { saved = null; }
    if (!saved || typeof saved !== 'object') return;

    PAIRS.forEach(function (pair) {
      if (Object.prototype.hasOwnProperty.call(saved, pair.key)) {
        pair.input.value = digitsOnly(saved[pair.key]);
      }
    });

    if (typeof saved.canvas === 'string') {
      canvasRadios.forEach(function (radio) { radio.checked = (radio.value === saved.canvas); });
      if (!canvasValue()) canvasRadios[0].checked = true;
    }

    els.demontage.checked = !!saved.demontage;
    els.trash.checked = !!saved.trash;
  }

  function applyDefaults() {
    PAIRS.forEach(function (pair) { pair.input.value = String(DEFAULTS[pair.key]); });
    canvasRadios.forEach(function (radio) { radio.checked = (radio.value === DEFAULTS.canvas); });
    els.demontage.checked = DEFAULTS.demontage;
    els.trash.checked = DEFAULTS.trash;
  }

  /* ---------------------------------------------------------------
     Синхронизация ползунков и полей
     --------------------------------------------------------------- */

  function syncRanges() {
    var s = readState();
    PAIRS.forEach(function (pair) {
      if (!pair.range) return;
      pair.range.value = String(clamp(s[pair.key], LIMITS[pair.key].min, LIMITS[pair.key].max));
    });
  }

  function syncRangeFromInput(pair) {
    if (!pair.range) return;
    pair.range.value = String(clamp(readNum(pair.input, pair.key), LIMITS[pair.key].min, LIMITS[pair.key].max));
  }

  /* ---------------------------------------------------------------
     Главный пересчёт — мгновенный, без кнопки
     --------------------------------------------------------------- */

  function render() {
    var s = readState();
    var rows = buildRows(s);
    var total = totalOf(rows);

    paintRows(rows);

    els.total.textContent = money(total);
    els.total.setAttribute('data-total', String(total));
    if (els.mobileTotal) els.mobileTotal.textContent = money(total);

    if (els.areaNote) els.areaNote.hidden = (s.area !== 0);

    var href = waHref(s, total);
    waLinks.forEach(function (link) { link.setAttribute('href', href); });

    saveState();
  }

  /* ---------------------------------------------------------------
     События
     --------------------------------------------------------------- */

  PAIRS.forEach(function (pair) {
    pair.input.addEventListener('input', function () {
      if (pair.input.value.indexOf('-') !== -1) {
        pair.input.value = pair.input.value.replace(/-/g, '');
      }
      syncRangeFromInput(pair);
      render();
    });
    pair.input.addEventListener('change', function () {
      normalizeField(pair.input, pair.key);
      syncRangeFromInput(pair);
      render();
    });
    pair.input.addEventListener('blur', function () {
      normalizeField(pair.input, pair.key);
      syncRangeFromInput(pair);
      render();
    });
    if (pair.range) {
      pair.range.addEventListener('input', function () {
        pair.input.value = String(clamp(Math.floor(Number(pair.range.value) || 0), LIMITS[pair.key].min, LIMITS[pair.key].max));
        render();
      });
    }
  });

  canvasRadios.forEach(function (radio) { radio.addEventListener('change', render); });
  els.demontage.addEventListener('change', render);
  els.trash.addEventListener('change', render);

  els.reset.addEventListener('click', function () {
    applyDefaults();
    syncRanges();
    render();
  });

  /* ---------------------------------------------------------------
     Мобильная полоса с итогом: видна только когда калькулятор на экране
     --------------------------------------------------------------- */

  var mobileQuery = window.matchMedia('(max-width: 900px)');
  var calcVisible = false;

  function updateMobileBar() {
    var show = mobileQuery.matches && calcVisible;
    if (els.mobileBar) els.mobileBar.hidden = !show;
    document.body.classList.toggle('has-mobile-bar', show);
  }

  if (els.calcSection && 'IntersectionObserver' in window) {
    var observer = new IntersectionObserver(function (entries) {
      calcVisible = !!(entries[0] && entries[0].isIntersecting);
      updateMobileBar();
    }, { threshold: 0 });
    observer.observe(els.calcSection);
  } else {
    calcVisible = true;
  }

  if (mobileQuery.addEventListener) mobileQuery.addEventListener('change', updateMobileBar);
  else if (mobileQuery.addListener) mobileQuery.addListener(updateMobileBar);

  /* ---------------------------------------------------------------
     Запуск
     --------------------------------------------------------------- */

  loadState();
  syncRanges();
  render();
  updateMobileBar();
})();
