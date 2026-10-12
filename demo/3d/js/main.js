/* ============================================================
   Тихая Глина — 3D-просмотр вазы «Сфера»
   Библиотека: three.js r147 (локально, js/three.min.js)
   Управление камерой написано вручную, без OrbitControls.
   ============================================================ */
(function () {
  'use strict';

  /* ------------------------------------------------------------
     0. Мелкие утилиты
     ------------------------------------------------------------ */

  var $ = function (id) { return document.getElementById(id); };

  var yearEl = $('year');
  if (yearEl) { yearEl.textContent = String(new Date().getFullYear()); }

  // Параметры в адресе: ?nogl=1 — принудительно показать заглушку,
  // ?nospin=1 — стартовать без авто-вращения (нужно для проверок).
  var params = new URLSearchParams(window.location.search);
  var forceNoGl = params.get('nogl') === '1';
  var noSpin = params.get('nospin') === '1';

  var reduceMotion = false;
  try {
    reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  } catch (e) { reduceMotion = false; }

  /* ------------------------------------------------------------
     1. Проверка WebGL и заглушка
     ------------------------------------------------------------ */

  var stage       = $('stage');
  var canvas      = $('scene3d');
  var fallback    = $('fallback');
  var fallbackWhy = $('fallback-reason');
  var statusEl    = $('scene-status');

  var refuse = function (because) {
    if (because) {
      fallbackWhy.textContent = because + ' Изделие — ваза «Сфера»: высота 32 см, диаметр 19 см, ' +
        'матовая глазурь, три цвета на выбор.';
    }
    if (fallback) { fallback.hidden = false; }
    if (canvas) {
      canvas.hidden = true;
      canvas.removeAttribute('tabindex');
      canvas.setAttribute('aria-hidden', 'true');
    }
    var bar = document.querySelector('.stage-bar');
    if (bar) { bar.hidden = true; }
    if (statusEl) { statusEl.textContent = ''; }
  };

  var webglSupported = function () {
    if (forceNoGl) { return false; }
    if (window.__DISABLE_WEBGL__) { return false; }
    try {
      var probe = document.createElement('canvas');
      var gl = probe.getContext('webgl2') || probe.getContext('webgl') ||
               probe.getContext('experimental-webgl');
      if (!gl) { return false; }
      var lose = gl.getExtension('WEBGL_lose_context');
      if (lose) { lose.loseContext(); }
      return true;
    } catch (e) { return false; }
  };

  // Библиотека не загрузилась?
  if (typeof window.THREE === 'undefined') {
    refuse('Библиотека трёхмерной графики не загрузилась.');
    return;
  }

  // ?nogl=1 — принудительно показываем заглушку, не создавая 3D-контекст вовсе.
  // Нужно для проверки внешнего вида заглушки на быстром компьютере.
  if (forceNoGl) {
    refuse('Объёмный просмотр отключён параметром адреса (режим проверки заглушки).');
    return;
  }

  if (!webglSupported()) {
    refuse('Браузер не смог запустить 3D-графику (WebGL отключён или не поддерживается).');
    return;
  }

  /* ------------------------------------------------------------
     2. Сцена, камера, рендерер
     ------------------------------------------------------------ */

  var THREE = window.THREE;

  var renderer;
  try {
    renderer = new THREE.WebGLRenderer({
      canvas: canvas,
      antialias: true,
      alpha: false,
      preserveDrawingBuffer: true,   // нужно, чтобы кадр можно было снять через toDataURL
      powerPreference: 'default'
    });
  } catch (err) {
    refuse('Не удалось создать 3D-контекст: ' + (err && err.message ? err.message : 'неизвестная ошибка') + '.');
    return;
  }

  // Плотность пикселей: не выше 2 и с ограничением площади буфера, чтобы на
  // телефонах с DPR 2-3 не рисовать лишние миллионы пикселей. Ограничение —
  // по площади, поэтому оно одинаково работает в портрете и в альбоме.
  var MAX_BUFFER_AREA = 640 * 520;
  var t0 = (window.performance && performance.now) ? performance.now() : Date.now();
  function pickPixelRatio(cssWidth, cssHeight) {
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    var area = cssWidth * cssHeight;
    if (area > 0) {
      var cap = Math.sqrt(MAX_BUFFER_AREA / area);
      var next = Math.min(dpr, Math.max(0.5, cap));
      // мягкий шаг 0,05 — чтобы не пересчитывать буфер на каждый пиксель
      dpr = Math.round(next * 20) / 20;
    }
    return Math.max(0.5, dpr);
  }
  renderer.setPixelRatio(pickPixelRatio(window.innerWidth, window.innerHeight));

  if (THREE.ColorManagement) { THREE.ColorManagement.enabled = true; }
  renderer.outputEncoding = THREE.sRGBEncoding;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 0.88;

  var scene = new THREE.Scene();
  scene.background = makeBackgroundTexture();

  var camera = new THREE.PerspectiveCamera(34, 1, 0.1, 120);

  /* ------------------------------------------------------------
     3. Фоновый градиент и подставка
     ------------------------------------------------------------ */

  function gradientCanvas(w, h, stops) {
    var c = document.createElement('canvas');
    c.width = w; c.height = h;
    var g = c.getContext('2d');
    var lin = g.createLinearGradient(0, 0, 0, h);
    for (var i = 0; i < stops.length; i++) {
      lin.addColorStop(stops[i][0], stops[i][1]);
    }
    g.fillStyle = lin;
    g.fillRect(0, 0, w, h);
    return c;
  }

  function makeBackgroundTexture() {
    // Спокойный серо-тёплый градиент. Он заметно темнее изделия: светлая
    // матовая керамика должна читаться силуэтом, а не сливаться с фоном.
    var c = gradientCanvas(4, 256, [
      [0.00, '#8f8d88'],
      [0.40, '#84827c'],
      [0.70, '#75736e'],
      [1.00, '#606059']
    ]);
    var tex = new THREE.CanvasTexture(c);
    tex.encoding = THREE.sRGBEncoding;
    tex.minFilter = THREE.LinearFilter;
    tex.magFilter = THREE.LinearFilter;
    tex.generateMipmaps = false;
    return tex;
  }

  function makeContactShadowTexture() {
    var size = 512;
    var c = document.createElement('canvas');
    c.width = size; c.height = size;
    var g = c.getContext('2d');
    var rad = g.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    rad.addColorStop(0.00, 'rgba(26,29,27,0.85)');
    rad.addColorStop(0.26, 'rgba(26,29,27,0.52)');
    rad.addColorStop(0.58, 'rgba(26,29,27,0.16)');
    rad.addColorStop(1.00, 'rgba(26,29,27,0.00)');
    g.fillStyle = rad;
    g.fillRect(0, 0, size, size);
    var tex = new THREE.CanvasTexture(c);
    tex.encoding = THREE.sRGBEncoding;
    return tex;
  }

  var VASE_HEIGHT = 3.2;

  // Подиум: круглый диск, на котором стоит изделие. Тень — отдельная мягкая
  // полупрозрачная накладка, поэтому она работает и без shadowMap.
  var podium = new THREE.Mesh(
    new THREE.CircleGeometry(5.6, 96),
    new THREE.MeshStandardMaterial({
      color: 0x3a3a36,
      roughness: 0.96,
      metalness: 0.0
    })
  );
  podium.rotation.x = -Math.PI / 2;
  podium.position.y = -0.012;
  scene.add(podium);

  var contact = new THREE.Mesh(
    new THREE.PlaneGeometry(4.6, 4.6),
    new THREE.MeshBasicMaterial({
      map: makeContactShadowTexture(),
      transparent: true,
      depthWrite: false,
      opacity: 0.95
    })
  );
  contact.rotation.x = -Math.PI / 2;
  contact.position.y = 0.002;
  contact.renderOrder = 1;
  scene.add(contact);

  /* ------------------------------------------------------------
     4. Свет
     ------------------------------------------------------------ */

  var hemi = new THREE.HemisphereLight(0xfffdf7, 0x8f8a80, 0.34);
  scene.add(hemi);

  // Ключевой свет — сверху-слева-спереди, по классической схеме витринной съёмки.
  var key = new THREE.DirectionalLight(0xfff6e6, 1.55);
  key.position.set(-4.6, 5.4, 3.0);
  scene.add(key);

  // Заполняющий — заметно слабее, с другой стороны: создаёт светлую и тёмную
  // сторону, за счёт этого форма читается объёмно, а не как плоская заливка.
  var fill = new THREE.DirectionalLight(0xe8eef4, 0.26);
  fill.position.set(4.2, 1.6, 2.4);
  scene.add(fill);

  // Едва заметная подсветка сзади-сбоку: отделяет дальний край от фона
  // и даёт блик по кромке — так форма читается объёмнее.
  var rim = new THREE.DirectionalLight(0xfff1dd, 0.95);
  rim.position.set(-3.6, 2.4, -4.0);
  scene.add(rim);

  var amb = new THREE.AmbientLight(0xffffff, 0.06);
  scene.add(amb);

  /* ------------------------------------------------------------
     5. Окружение для отражений (мягкие блики на глазури)
     ------------------------------------------------------------ */

  try {
    var envCanvas = gradientCanvas(64, 256, [
      [0.00, '#8d9099'],
      [0.34, '#f4f1e9'],
      [0.58, '#cfc9bd'],
      [1.00, '#4d4f4d']
    ]);
    var envTex = new THREE.CanvasTexture(envCanvas);
    envTex.mapping = THREE.EquirectangularReflectionMapping;
    envTex.encoding = THREE.sRGBEncoding;
    var pmrem = new THREE.PMREMGenerator(renderer);
    var envRT = pmrem.fromEquirectangular(envTex);
    if (envRT && envRT.texture) { scene.environment = envRT.texture; }
    pmrem.dispose();
    envTex.dispose();
  } catch (e) {
    // Без карты окружения сцена тоже выглядит нормально — просто меньше бликов.
    scene.environment = null;
  }

  /* ------------------------------------------------------------
     6. Модель вазы (строится кодом, без внешних файлов)
     ------------------------------------------------------------ */

  // Профиль вращения: (радиус, высота) от дна к горлу.
  var PROFILE = [
    [0.00, 0.000],
    [0.52, 0.000],
    [0.62, 0.038],
    [0.70, 0.120],
    [0.80, 0.300],
    [0.87, 0.560],
    [0.905, 0.860],
    [0.895, 1.140],
    [0.845, 1.420],
    [0.760, 1.680],
    [0.650, 1.890],
    [0.545, 2.060],
    [0.465, 2.230],
    [0.415, 2.400],
    [0.392, 2.580],
    [0.393, 2.740],
    [0.400, 2.880],
    [0.418, 3.000],
    [0.428, 3.080],
    [0.412, 3.120],
    [0.375, 3.150],
    [0.352, 3.180],
    [0.346, 3.200]
  ];

  function buildBodyGeometry() {
    var points = PROFILE.map(function (p) { return new THREE.Vector2(p[0], p[1]); });
    var curve = new THREE.CatmullRomCurve3(
      points.map(function (v) { return new THREE.Vector3(v.x, v.y, 0); })
    );
    var smooth = curve.getPoints(150);
    var vecs = smooth.map(function (v) { return new THREE.Vector2(Math.max(v.x, 0.0001), v.y); });
    var geo = new THREE.LatheGeometry(vecs, 128);
    geo.computeVertexNormals();
    geo.computeBoundingSphere();
    return geo;
  }

  // Сгруппированная модель: удобно вращать/масштабировать одним объектом.
  var vase = new THREE.Group();

  var VARIANT_MATERIAL = {
    sand: { color: 0xcbb894, roughness: 0.62, metalness: 0.04, envInt: 0.55 },
    clay: { color: 0xa9705a, roughness: 0.58, metalness: 0.05, envInt: 0.60 },
    sage: { color: 0x6e8168, roughness: 0.66, metalness: 0.03, envInt: 0.50 }
  };

  var bodyMaterial = new THREE.MeshStandardMaterial({
    color: VARIANT_MATERIAL.sand.color,
    roughness: VARIANT_MATERIAL.sand.roughness,
    metalness: VARIANT_MATERIAL.sand.metalness,
    envMapIntensity: VARIANT_MATERIAL.sand.envInt,
    flatShading: false
  });

  var body = new THREE.Mesh(buildBodyGeometry(), bodyMaterial);
  body.name = 'vase-body';
  vase.add(body);

  // Тонкий ободок у горла — деталь, которая читается при вращении.
  var rimMaterial = new THREE.MeshStandardMaterial({
    color: 0xb99a68,
    roughness: 0.28,
    metalness: 0.72,
    envMapIntensity: 1.15
  });
  var rim = new THREE.Mesh(new THREE.TorusGeometry(0.352, 0.0135, 16, 96), rimMaterial);
  rim.rotation.x = Math.PI / 2;
  rim.position.y = 3.196;
  vase.add(rim);

  // Слегка «приподнятое» дно, чтобы силуэт не сливался с подставкой.
  var foot = new THREE.Mesh(
    new THREE.CylinderGeometry(0.54, 0.5, 0.026, 64),
    new THREE.MeshStandardMaterial({ color: 0xc9bda4, roughness: 0.85, metalness: 0.02 })
  );
  foot.position.y = 0.012;
  vase.add(foot);

  scene.add(vase);

  /* ------------------------------------------------------------
     7. Своё управление камерой (~55 строк): drag, колесо, щипок
     ------------------------------------------------------------ */

  var HOME = { yaw: 0.62, polar: 1.208, radius: 7.9, targetY: 1.50 };
  var cam = {
    yaw: HOME.yaw,          // поворот вокруг вертикальной оси
    polar: HOME.polar,      // наклон от вертикали (радианы)
    radius: HOME.radius,    // расстояние до изделия
    targetY: HOME.targetY,
    minRadius: 5.0,
    maxRadius: 16.0,
    minPolar: 0.72,
    maxPolar: 1.90,
    dragging: false,
    lastX: 0, lastY: 0,
    pinch: 0,
    dampYaw: 0,
    dampRadius: 0,
    dampPolar: 0
  };

  function applyCamera() {
    var sp = Math.sin(cam.polar);
    camera.position.set(
      cam.radius * sp * Math.sin(cam.yaw),
      cam.radius * Math.cos(cam.polar) + cam.targetY,
      cam.radius * sp * Math.cos(cam.yaw)
    );
    camera.lookAt(0, cam.targetY, 0);
  }

  function nudge(dYaw, dPolar) {
    cam.yaw += dYaw;
    cam.polar = Math.min(cam.maxPolar, Math.max(cam.minPolar, cam.polar + dPolar));
    cam.dampYaw = 0;   // клавиши — точное управление: инерцию после них не копим
    applyCamera();
    requestFrame();
  }

  function zoomBy(factor) {
    var next = cam.radius * factor;
    cam.radius = Math.min(cam.maxRadius, Math.max(cam.minRadius, next));
    cam.dampYaw = 0;   // после зума инерция вращения уже не нужна — камера «замирает»
    applyCamera();
    requestFrame();
    announce();
  }

  function pointerDown(x, y) {
    cam.dragging = true;
    cam.lastX = x; cam.lastY = y;
    cam.dampYaw = 0;
  }

  function pointerMove(x, y) {
    if (!cam.dragging) { return; }
    var dx = x - cam.lastX;
    var dy = y - cam.lastY;
    cam.lastX = x; cam.lastY = y;
    cam.yaw += dx * 0.0075;
    cam.polar = Math.min(cam.maxPolar, Math.max(cam.minPolar, cam.polar - dy * 0.006));
    cam.dampYaw = dx * 0.0075;      // «инерция» после отпускания
    applyCamera();
    requestFrame();
  }

  function pointerUp() {
    cam.dragging = false;
  }

  canvas.addEventListener('mousedown', function (e) {
    if (e.button !== 0) { return; }
    e.preventDefault();
    pointerDown(e.clientX, e.clientY);
  });
  window.addEventListener('mousemove', function (e) { pointerMove(e.clientX, e.clientY); });
  window.addEventListener('mouseup', pointerUp);

  canvas.addEventListener('wheel', function (e) {
    e.preventDefault();
    zoomBy(e.deltaY > 0 ? 1.07 : 0.935);
  }, { passive: false });

  canvas.addEventListener('touchstart', function (e) {
    if (e.touches.length === 1) {
      pointerDown(e.touches[0].clientX, e.touches[0].clientY);
    } else if (e.touches.length === 2) {
      cam.dragging = false;
      cam.pinch = touchDistance(e);
    }
  }, { passive: true });

  canvas.addEventListener('touchmove', function (e) {
    e.preventDefault();                       // палец вращает модель, а не скроллит страницу
    if (e.touches.length === 1) {
      pointerMove(e.touches[0].clientX, e.touches[0].clientY);
    } else if (e.touches.length === 2) {
      var d = touchDistance(e);
      if (cam.pinch > 0 && d > 0) { zoomBy(cam.pinch / d); }
      cam.pinch = d;
    }
  }, { passive: false });

  canvas.addEventListener('touchend', function (e) {
    if (e.touches.length === 0) { pointerUp(); cam.pinch = 0; }
    else if (e.touches.length === 1) { pointerDown(e.touches[0].clientX, e.touches[0].clientY); cam.pinch = 0; }
  }, { passive: true });

  function touchDistance(e) {
    var dx = e.touches[0].clientX - e.touches[1].clientX;
    var dy = e.touches[0].clientY - e.touches[1].clientY;
    return Math.sqrt(dx * dx + dy * dy);
  }

  // Клавиатура: у сцены есть фокус и понятное управление.
  canvas.addEventListener('keydown', function (e) {
    var step = 0.12;
    switch (e.key) {
      case 'ArrowLeft':  nudge(-step, 0); e.preventDefault(); break;
      case 'ArrowRight': nudge(step, 0); e.preventDefault(); break;
      case 'ArrowUp':    nudge(0, -0.08); e.preventDefault(); break;
      case 'ArrowDown':  nudge(0, 0.08); e.preventDefault(); break;
      case '+': case '=': zoomBy(0.9); e.preventDefault(); break;
      case '-': case '_': zoomBy(1.1); e.preventDefault(); break;
      case '0': case 'Home': resetCamera(); e.preventDefault(); break;
      default: break;
    }
  });

  /* ------------------------------------------------------------
     8. Кнопки: сброс камеры, авто-вращение, варианты цвета
     ------------------------------------------------------------ */

  var btnReset = $('btn-reset');
  var btnSpin  = $('btn-spin');
  var spinLabel = $('btn-spin-label');
  var swatchBox = $('swatches');
  var variantLine = $('variant-line');
  var orderBtn = $('btn-order');

  var VARIANT_NAME = { sand: 'Песок', clay: 'Терракота', sage: 'Шалфей' };

  var state = {
    variant: 'sand',
    autoSpin: !reduceMotion && !noSpin,
    frames: 0,
    fps: 0,
    destroyed: false
  };

  function resetCamera() {
    cam.yaw = HOME.yaw;
    cam.polar = HOME.polar;
    cam.radius = HOME.radius;
    cam.dampYaw = 0;
    cam.dampPolar = 0;
    applyCamera();
    requestFrame();
    announce();
  }

  function setVariant(name) {
    var m = VARIANT_MATERIAL[name];
    if (!m) { return; }
    state.variant = name;
    bodyMaterial.color.setHex(m.color);
    bodyMaterial.roughness = m.roughness;
    bodyMaterial.metalness = m.metalness;
    bodyMaterial.envMapIntensity = m.envInt;
    bodyMaterial.needsUpdate = true;

    if (variantLine) { variantLine.textContent = 'Цвет: ' + VARIANT_NAME[name] + ' · высота 32 см'; }
    if (orderBtn) {
      orderBtn.href = 'https://wa.me/79000000000?text=' + encodeURIComponent(
        'Здравствуйте! Хочу заказать вазу «Сфера», цвет ' + VARIANT_NAME[name] + '.'
      );
    }
    if (swatchBox) {
      var items = swatchBox.querySelectorAll('.swatch');
      for (var i = 0; i < items.length; i++) {
        var on = items[i].getAttribute('data-variant') === name;
        items[i].classList.toggle('is-active', on);
        items[i].setAttribute('aria-pressed', on ? 'true' : 'false');
      }
    }
    requestFrame();
    announce();
  }

  function setAutoSpin(on) {
    state.autoSpin = !!on;
    if (btnSpin) { btnSpin.setAttribute('aria-pressed', on ? 'true' : 'false'); }
    if (spinLabel) { spinLabel.textContent = 'Авто-вращение: ' + (on ? 'вкл' : 'выкл'); }
    requestFrame();
  }

  var announceTimer = null;
  function announce() {
    if (!statusEl) { return; }
    if (announceTimer) { clearTimeout(announceTimer); }
    announceTimer = setTimeout(function () {
      var deg = Math.round(((cam.yaw * 180 / Math.PI) % 360 + 360) % 360);
      var progress = (HOME.radius / cam.radius).toFixed(2);
      statusEl.textContent = 'Поворот ' + deg + '°, масштаб ' + progress + '×, цвет ' +
        VARIANT_NAME[state.variant];
    }, 260);
  }

  if (btnReset) { btnReset.addEventListener('click', resetCamera); }
  if (btnSpin) {
    btnSpin.addEventListener('click', function () { setAutoSpin(!state.autoSpin); });
  }
  if (swatchBox) {
    swatchBox.addEventListener('click', function (e) {
      var el = e.target;
      while (el && el !== swatchBox) {
        if (el.classList && el.classList.contains('swatch')) {
          setVariant(el.getAttribute('data-variant'));
          el.focus();
          return;
        }
        el = el.parentNode;
      }
    });
  }

  /* ------------------------------------------------------------
     9. Размеры canvas и цикл отрисовки
     ------------------------------------------------------------ */

  function resize() {
    if (state.destroyed) { return; }
    var rect = canvas.getBoundingClientRect();
    var w = Math.max(1, Math.round(rect.width));
    var h = Math.max(1, Math.round(rect.height));
    renderer.setPixelRatio(pickPixelRatio(w, h));
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    if (state.autoSpin) { requestFrame(); }
  }

  var frameRequested = false;
  function requestFrame() {
    if (frameRequested || state.destroyed) { return; }
    frameRequested = true;
    requestAnimationFrame(tick);
  }

  var lastFpsTime = performance.now();
  var framesSince = 0;
  var lastTickTime = 0;

  function tick(now) {
    frameRequested = false;
    if (state.destroyed) { return; }

    // Время считаем по своему таймеру кадров, а не по счётчику FPS: иначе при
    // просадках частоты (например, на программном рендеринге) вращение замедлялось бы.
    var step = lastTickTime ? (now - lastTickTime) / 1000 : 0.016;
    lastTickTime = now;
    // Ограничение только против «скачка» после возврата на вкладку или долгой паузы,
    // поэтому вращение остаётся равномерным и при низкой частоте кадров.
    step = Math.min(0.25, Math.max(0, step));

    framesSince++;

    // авто-вращение изделия
    if (state.autoSpin) {
      cam.yaw += 0.42 * step;
    }

    // инерция после перетаскивания
    if (!cam.dragging && Math.abs(cam.dampYaw) > 0.00002) {
      cam.yaw += cam.dampYaw;
      cam.dampYaw *= 0.92;
      applyCamera();
    }

    renderer.render(scene, camera);

    state.frames++;
    if (now - lastFpsTime >= 700) {
      state.fps = Math.round(framesSince * 1000 / (now - lastFpsTime));
      framesSince = 0;
      lastFpsTime = now;
    }

    // Продолжаем цикл, пока нужно: вращение, инерция или страница видима в покое.
    if (state.autoSpin || Math.abs(cam.dampYaw) > 0.00002) {
      if (state.autoSpin) {
        lastTickTime = now;   // при равномерном вращении время считаем по кадрам
      }
      requestFrame();
    } else {
      lastTickTime = 0;       // цикл остановлен — следующий кадр начнёт отсчёт заново
    }
  }

  // Первый кадр и запуск цикла.
  applyCamera();
  resize();
  renderer.render(scene, camera);
  state.frames++;
  if (state.autoSpin) { requestFrame(); }

  // Пересчёт размеров: ResizeObserver ловит и поворот экрана, и смену раскладки.
  var relayout = function () {
    // Сразу подгоняем буфер под новый размер — при повороте экрана новая
    // ширина должна примениться немедленно, а не после следующего кадра.
    requestAnimationFrame(function () {
      resize();
      renderer.render(scene, camera);
      requestAnimationFrame(function () {
        resize();
        renderer.render(scene, camera);
      });
    });
  };

  // Поворот экрана и смена размера окна: пересчитываем немедленно, без ожидания кадра.
  var relayoutNow = function () {
    resize();
    requestFrame();
  };

  if (typeof ResizeObserver !== 'undefined') {
    try { new ResizeObserver(relayout).observe(canvas); } catch (e) { /* ниже подстраховка */ }
  }
  window.addEventListener('resize', relayoutNow);
  window.addEventListener('orientationchange', relayout);
  if (window.visualViewport) {
    window.visualViewport.addEventListener('resize', relayoutNow);
  }

  // Пауза отрисовки, когда вкладка не видна — страница не тратит ресурсы зря.
  document.addEventListener('visibilitychange', function () {
    if (!document.hidden) { relayout(); }
  });

  // Страховка: если по какой-то причине размеры не применились — повторим.
  setTimeout(function () {
    var r = canvas.getBoundingClientRect();
    if (r.width > 1 && Math.abs(renderer.domElement.width / (renderer.getPixelRatio() || 1) - r.width) > 2) {
      relayout();
    }
  }, 400);

  // Потеря контекста — показываем понятную заглушку вместо пустоты.
  canvas.addEventListener('webglcontextlost', function (e) {
    e.preventDefault();
    refuse('Контекст 3D-графики был потерян.');
  }, false);

  setAutoSpin(state.autoSpin);
  setVariant('sand');

  /* ------------------------------------------------------------
     10. Отладочный доступ для скрипта проверки
     ------------------------------------------------------------ */

  window.__THREE_3D__ = {
    revision: THREE.REVISION,
    ok: true,
    getFrames: function () { return state.frames; },
    getFps: function () { return state.fps; },
    getVariant: function () { return state.variant; },
    getCamera: function () {
      return { yaw: cam.yaw, polar: cam.polar, radius: cam.radius };
    },
    getBodyColor: function () { return '#' + bodyMaterial.color.getHexString(); },
    isAutoSpin: function () { return state.autoSpin; },
    setAutoSpin: setAutoSpin,
    setVariant: setVariant,
    reset: resetCamera,
    // Точный поворот и принудительная отрисовка — для скрипта проверки.
    setCamera: function (yaw, polar, radius) {
      if (typeof yaw === 'number') { cam.yaw = yaw; }
      if (typeof polar === 'number') {
        cam.polar = Math.min(cam.maxPolar, Math.max(cam.minPolar, polar));
      }
      if (typeof radius === 'number') {
        cam.radius = Math.min(cam.maxRadius, Math.max(cam.minRadius, radius));
      }
      cam.dampYaw = 0;
      applyCamera();
      renderer.render(scene, camera);
      state.frames++;
    },
    renderNow: function () {
      applyCamera();
      renderer.render(scene, camera);
      state.frames++;
    },
    meshCount: scene.children.length,
    initMs: Math.round(((window.performance && performance.now) ? performance.now() : Date.now()) - t0),
    pixelRatio: function () { return renderer.getPixelRatio(); },
    bufferSize: function () {
      return { w: renderer.domElement.width, h: renderer.domElement.height };
    }
  };
})();
