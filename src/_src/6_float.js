/* ============================================================================
 * Anti-Route v7 — 6/6 Float
 * 悬浮球：自定义图标 / 大小 / 形状 / 透明度 / 吸边 / 拖动 / 收纳
 *   1) 本地图片限 300KB 且降采样到 128px（localStorage 只有 5MB）
 *   2) 外链图标加载失败自动回退 emoji
 *   3) 轻点/拖动阈值 12px + 长按 400ms 才进入拖动
 *   4) 设置区独立折叠，默认收起，不挤占判定表
 *   5) 不再污染 HOST 全局（状态放 state 里）
 * ========================================================================== */

var FLOAT_IMAGE_KEY = 'ar7.float.image';
var floatImageCache = null;
var floatPreview = null;
var floatDragging = false;

function floatImage() {
  if (floatPreview) return floatPreview;
  if (floatImageCache !== null) return floatImageCache;
  try { floatImageCache = HOST.localStorage.getItem(FLOAT_IMAGE_KEY) || ''; } catch (e) { floatImageCache = ''; }
  return floatImageCache;
}

function floatIconMarkup() {
  var url = floatImage() || cfg.floatIcon || '';
  if (url && /^(https?:\/\/|data:image\/)/i.test(url)) {
    return '<img class="ar6-custom-icon" draggable="false" alt="" src="' + esc(url) + '"' +
      ' onerror="this.style.display=\'none\';var p=this.parentNode;if(p){var s=p.querySelector(\'.ar6-fb\');if(s)s.style.display=\'inline\';}"' +
      ' style="position:absolute!important;inset:0!important;width:100%!important;height:100%!important;' +
      'max-width:none!important;max-height:none!important;min-width:100%!important;min-height:100%!important;' +
      'object-fit:cover!important;object-position:center!important;border-radius:inherit!important;' +
      'margin:0!important;padding:0!important;border:0!important;pointer-events:none!important;display:block!important">' +
      '<span class="ar6-fb" style="display:none;pointer-events:none;font-size:22px">🛡️</span>';
  }
  return '<span style="pointer-events:none;font-size:23px">🛡️</span>';
}

function ar6Rgb(hex, a) {
  var h = String(hex || '#0d1117').replace('#', '');
  if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
  var n = parseInt(h, 16);
  if (!isFinite(n)) n = 0x0d1117;
  var r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
  return 'rgba(' + r + ',' + g + ',' + b + ',' + a + ')';
}

var PAD_OPEN = false;
var PAD_W = 190, PAD_H = 176;

/* 当前根节点的盒子尺寸：球 / 把手 / 控制盘 */
function floatBoxSize() {
  if (PAD_OPEN) return { w: PAD_W, h: PAD_H };
  var n = floatSizePx();
  if (String(cfg.floatMode) === 'tuck') return { w: Math.max(10, Math.round(n * 0.3)), h: n };
  return { w: n, h: n };
}

function floatSizePx() {
  var n = Number(cfg.floatSize) || 44;
  return Math.max(28, Math.min(80, n));
}

function floatTint() {
  var code = 'gray';
  try {
    if (typeof kpi === 'function') {
      var k = kpi();
      /* v8.3：kpi 只给 eff，没有 total；warn 必须先判，否则永远不可达 */
      var n = Number(k.eff) || 0;
      var bad = Number(k.bad) || 0;
      code = (n >= 4 && bad / n >= 0.15) ? 'warn' : (bad > 0 ? 'bad' : 'ok');
    }
  } catch (e) {}
  if (code === 'bad') return { line: 'rgba(248,81,73,.55)', halo: 'rgba(248,81,73,.16)' };
  if (code === 'warn') return { line: 'rgba(210,153,34,.5)', halo: 'rgba(210,153,34,.14)' };
  return { line: 'rgba(88,166,255,.45)', halo: 'rgba(88,166,255,.14)' };
}

function floatStyle() {
  var box = floatBoxSize();
  var shape = cfg.floatShape === 'square' ? '12px' : '50%';
  if (PAD_OPEN) shape = '14px';
  var op = Math.max(0.12, Math.min(1, (Number(cfg.floatOpacity) || 45) / 100));
  var tint = floatTint();
  /* 待机半透明用 rgba 背景，而不是容器 opacity —— 否则能量环被一起压暗 */
  /* 控制盘是操作面板：固定深底，避免用户把球设成浅色后文字看不见 */
  var bg = PAD_OPEN ? ar6Rgb('#161b22', 0.97) : ar6Rgb(cfg.floatBg || '#0d1117', op);
  return 'width:' + box.w + 'px;height:' + box.h + 'px;min-width:' + box.w + 'px;min-height:' + box.h + 'px;' +
    'padding:0!important;border-radius:' + shape + ';background:' + bg + ';' +
    'border:1px solid ' + (cfg.floatBorder ? tint.line : 'transparent') + ';' +
    'box-shadow:' + (cfg.floatShadow ? ('0 10px 26px rgba(0,0,0,.45),0 0 0 4px ' + tint.halo) : 'none') + ';' +
    'opacity:1;touch-action:none;user-select:none;-webkit-user-select:none;overflow:visible;' +
    'box-sizing:border-box;display:flex;align-items:center;justify-content:center;position:fixed;z-index:2147483000;left:0;top:0;' +
    'cursor:' + (PAD_OPEN ? 'default' : 'grab') + ';' +
    'transition:width .16s,height .16s,border-radius .16s,box-shadow .25s;';
}

var FLOAT_GEOM = { x: null, y: null };

/* ---- v8.1 布局内核：安全区 + 归一化坐标 + 吸边 ---- */

function floatVW() {
  var vv = HOST.visualViewport;
  var w = (vv && vv.width) || HOST.innerWidth || 360;
  return Math.round(w);
}

function floatVH() {
  var vv = HOST.visualViewport;
  var h = (vv && vv.height) || HOST.innerHeight || 640;
  return Math.round(h);
}

/* 安全区：左右留 PAD，底部避开输入区与手势条 */
function getSafeBox() {
  var pad = (typeof uiMode === 'function' && uiMode() === 'mobile') ? 8 : 12;
  var l = pad, t = pad, r = floatVW() - pad, b = floatVH() - pad - 34;
  try {
    if (DOC && DOC.querySelector) {
      var f = DOC.querySelector('#send_form') || DOC.querySelector('#form_sheld');
      if (f) {
        var fr = f.getBoundingClientRect();
        if (fr && fr.height > 8 && fr.top > 40) b = Math.min(b, Math.round(fr.top) - pad);
      }
    }
  } catch (e) {}
  if (r - l < 80) r = l + 80;
  if (b - t < 80) b = t + 80;
  return { l: l, t: t, r: r, b: b };
}

function floatClampPx(x, y, w, h) {
  var s = getSafeBox();
  var maxX = Math.max(s.l, s.r - w);
  var maxY = Math.max(s.t, s.b - h);
  return {
    x: Math.round(Math.max(s.l, Math.min(maxX, x))),
    y: Math.round(Math.max(s.t, Math.min(maxY, y)))
  };
}

/* 由 cfg.fxN/fyN/fEdge 算像素位置 */
function floatLayoutPx() {
  var b = floatBoxSize();
  var w = b.w, h = b.h;
  var s = getSafeBox();
  var vw = floatVW();
  var nx = (typeof cfg.fxN === 'number') ? cfg.fxN : 1;
  var ny = (typeof cfg.fyN === 'number') ? cfg.fyN : 0.82;
  nx = Math.max(0, Math.min(1, nx));
  ny = Math.max(0, Math.min(1, ny));
  var x = s.l + nx * Math.max(0, (s.r - s.l) - w);
  var y = s.t + ny * Math.max(0, (s.b - s.t) - h);
  var mode = String(cfg.floatMode);
  if (!PAD_OPEN && mode === 'dock') {
    var reveal = Math.max(0.45, Math.min(0.8, (Number(cfg.floatDock) || 45) / 100));
    if (cfg.fEdge === 'l') x = -w * (1 - reveal);
    else if (cfg.fEdge === 'r') x = vw - w * reveal;
  } else if (!PAD_OPEN && mode === 'tuck') {
    x = (cfg.fEdge === 'l') ? 0 : (vw - w);
  }
  return { x: x, y: y, n: w, w: w, h: h };
}

/* 拖完回写归一化坐标 */
function floatSaveFromPx(r) {
  if (!r) return;
  var b = r.getBoundingClientRect();
  var box = floatBoxSize();
  var n = box.w;
  var s = getSafeBox();
  var w = Math.max(1, (s.r - s.l) - box.w);
  var h = Math.max(1, (s.b - s.t) - box.h);
  cfg.fxN = Math.max(0, Math.min(1, (b.left - s.l) / w));
  cfg.fyN = Math.max(0, Math.min(1, (b.top - s.t) / h));
  var mid = s.l + (s.r - s.l - box.w) / 2;
  cfg.fEdge = (b.left + box.w / 2 < mid) ? 'l' : 'r';
  cfg.floatX = Math.round(b.left);
  cfg.floatY = Math.round(b.top);
}

function floatApplyPosition(r, docked) {
  if (!r) return;
  var p = floatLayoutPx();
  var dockOn = docked && !PAD_OPEN && cfg.floatMode === 'dock';
  var tuckOn = docked && !PAD_OPEN && cfg.floatMode === 'tuck';
  if (!dockOn && !tuckOn) {
    var c = floatClampPx(p.x, p.y, p.w, p.h);
    p.x = c.x;
    p.y = c.y;
  }
  FLOAT_GEOM.x = Math.round(p.x);
  FLOAT_GEOM.y = Math.round(p.y);
  r.style.left = FLOAT_GEOM.x + 'px';
  r.style.top = FLOAT_GEOM.y + 'px';
  r.style.right = 'auto';
  r.style.bottom = 'auto';
  r.style.width = p.w + 'px';
  r.style.height = p.h + 'px';
  r.style.minWidth = p.w + 'px';
  r.style.minHeight = p.h + 'px';
}

function bindFloatGestures(r) {
  var pill = r.querySelector('.ar6-pill');
  if (!pill) return;
  var sx = 0, sy = 0, ox = 0, oy = 0;
  var downAt = 0, dragging = false, active = false, holdTimer = null, armed = false, moved = false;

  function commit() {
    var n = floatSizePx();
    var b = r.getBoundingClientRect();
    var c = floatClampPx(b.left, b.top, n, n);
    r.style.left = c.x + 'px';
    r.style.top = c.y + 'px';
    floatSaveFromPx(r);
    saveCfg();
    floatApplyPosition(r, true);
  }

  function openPanelFromBall() {
    /* 球在哪半边，面板就从哪半边展开 */
    var vw = floatVW();
    var vh = floatVH();
    var pw = Math.min(vw * 0.92, 380);
    var ph = Math.min(vh * 0.62, 720);
    var b = r.getBoundingClientRect();
    var s = getSafeBox();
    var mx = (b.left + b.width / 2 > vw / 2) ? (s.r - pw) : s.l;
    var my = Math.max(s.t, Math.min(s.b - ph, b.top - 8));
    cfg.mx = Math.round(mx);
    cfg.my = Math.round(my);
    saveCfg();
    minimized = false;
    syncMin();
    render();
  }

  pill.addEventListener('pointerdown', function (e) {
    if (e.button !== undefined && e.button !== 0) return;
    active = true; moved = false; armed = false; dragging = false;
    var b = r.getBoundingClientRect();
    ox = b.left; oy = b.top; sx = e.clientX; sy = e.clientY;
    downAt = Date.now();
    try { pill.setPointerCapture(e.pointerId); } catch (err) {}
    holdTimer = setTimeout(function () { holdTimer = null; armed = true; }, 450);
  }, { passive: true });

  pill.addEventListener('pointermove', function (e) {
    if (!active) return;
    var dx = e.clientX - sx, dy = e.clientY - sy;
    if (!dragging && Math.abs(dx) + Math.abs(dy) < 6) return;
    dragging = true; moved = true;
    if (holdTimer) { clearTimeout(holdTimer); holdTimer = null; }
    if (e.preventDefault) e.preventDefault();
    var n = floatSizePx();
    var s = getSafeBox();
    var nx = Math.max(-n, Math.min(floatVW() - 1, ox + dx));
    var ny = Math.max(s.t - 24, Math.min(s.b - n, oy + dy));
    r.style.right = 'auto';
    r.style.bottom = 'auto';
    r.style.left = Math.round(nx) + 'px';
    r.style.top = Math.round(ny) + 'px';
  }, { passive: false });

  function end() {
    if (!active) return;
    active = false;
    if (holdTimer) { clearTimeout(holdTimer); holdTimer = null; }
    if (dragging) { dragging = false; commit(); return; }
    if (armed) { armed = false; try { openPanelFromBall(); } catch (eOpen) {} return; }
    if (Date.now() - downAt < 450) { try { openPad(); } catch (ePad) {} }
  }

  pill.addEventListener('pointerup', end);
  pill.addEventListener('pointercancel', function () {
    active = false; dragging = false;
    if (holdTimer) { clearTimeout(holdTimer); holdTimer = null; }
  });
}

/* ---- v8.1 面板拖动：标题栏/空白区直接拖，滚动区长按 450ms 后拖 ---- */
function installRootDrag(r, kind) {
  if (!r) return;
  if (r.__ar6rd) { r.__ar6kind = kind; return; }
  r.__ar6rd = true; r.__ar6kind = kind;
  var active = false, armed = false, moved = false;
  var sx = 0, sy = 0, ox = 0, oy = 0;
  var holdTimer = null;
  /* v8.30：触摸与鼠标分开处理。手指落在可滚动正文上时不再立刻抢跑，
     否则 preventDefault 会掐掉原生滚动——用户看到的就是「面板滑不动、反而被拖着走」。 */
  var touchMode = false, armLong = false;

  function hitInteractive(t) {
    var p = t;
    while (p && p !== r) {
      if (p.getAttribute && p.getAttribute('data-ar6')) return true;
      var tag = (p.tagName || '').toLowerCase();
      if (tag === 'input' || tag === 'textarea' || tag === 'select' || tag === 'button' || tag === 'summary' || tag === 'a') return true;
      p = p.parentNode;
    }
    return false;
  }

  function hitHeader(t) {
    var p = t;
    while (p && p !== r) {
      if (p.className) {
        var cls = String(p.className).split(/\s+/);
        for (var ci = 0; ci < cls.length; ci++) if (cls[ci] === 'ar6-h' || cls[ci] === 'ar6-grip') return true;
      }
      p = p.parentNode;
    }
    return false;
  }

  function hitScroll(t) {
    var p = t;
    while (p) {
      try {
        if (p.nodeType === 1 && p.clientHeight > 0 && p.scrollHeight > p.clientHeight + 2) return true;
      } catch (e) {}
      if (p === r) break;
      p = p.parentNode;
    }
    return false;
  }

  r.addEventListener('pointerdown', function (e) {
    if (e.button !== undefined && e.button !== 0) return;
    var t = e.target || e.srcElement;
    if (!t || hitInteractive(t)) return;
    var isTouch = (e.pointerType === 'touch');
    touchMode = isTouch; armLong = false;
    /* 标题栏：任何输入方式都能直接拖；正文：鼠标可以拖，手指必须先长按 450ms。
       手指一碰就 armed 会把原生滚动吃掉，用户表现为「滑不动」。 */
    var direct = hitHeader(t) || (!isTouch && !hitScroll(t));
    var b = r.getBoundingClientRect();
    active = true; moved = false; armed = false;
    sx = e.clientX; sy = e.clientY; ox = b.left; oy = b.top;
    if (direct) { armed = true; }
    else {
      holdTimer = setTimeout(function () { holdTimer = null; armed = true; armLong = true; }, 450);
    }
  }, { passive: true });

  r.addEventListener('pointermove', function (e) {
    if (!active) return;
    var dx = e.clientX - sx, dy = e.clientY - sy;
    if (!moved && Math.abs(dx) + Math.abs(dy) < 6) return;
    if (!armed) {
      active = false;
      if (holdTimer) { clearTimeout(holdTimer); holdTimer = null; }
      return;
    }
    moved = true;
    /* 触摸必须是长按之后才允许吃掉事件；没长按的一律放行给浏览器滚动 */
    if (e.preventDefault && (!touchMode || armLong)) e.preventDefault();
    r.style.transition = 'none';
    r.style.transform = 'translate3d(' + Math.round(dx) + 'px,' + Math.round(dy) + 'px,0)';
  }, { passive: false });

  function end(cancelled) {
    if (!active) return;
    active = false;
    if (holdTimer) { clearTimeout(holdTimer); holdTimer = null; }
    if (moved && !cancelled) {
      /* 先量 rect（含 translate3d），再清 transform —— 顺序反了会弹回原位 */
      var b = r.getBoundingClientRect();
      var w = b.width || 320, h = b.height || 240;
      var c = floatClampPx(b.left, b.top, w, h);
      r.style.transform = '';
      r.style.transition = '';
      r.style.left = c.x + 'px';
      r.style.top = c.y + 'px';
      r.style.right = 'auto';
      r.style.bottom = 'auto';
      var k2 = r.__ar6kind || kind;
      if (k2 === 'ball') floatSaveFromPx(r);
      else if (k2 === 'pad') { floatSaveFromPx(r); }
      else { cfg.mx = c.x; cfg.my = c.y; saveCfg(); }
    } else {
      r.style.transform = '';
      r.style.transition = '';
    }
    moved = false; armed = false; armLong = false;
  }

  r.addEventListener('pointerup', function () { end(false); });
  r.addEventListener('pointercancel', function () { end(true); });
}

/* ---------------- 外观设置（独立折叠，默认收起） ---------------- */

var FLOAT_UI_OPEN = false;

function floatSettingsHTML() {
  var modes = [['dock', '吸边半隐藏'], ['float', '常驻悬浮球'], ['tuck', '贴边把手（最省位置）']];
  var opts = '';
  for (var i = 0; i < modes.length; i++) {
    opts += '<option value="' + modes[i][0] + '"' + (cfg.floatMode === modes[i][0] ? ' selected' : '') + '>' + modes[i][1] + '</option>';
  }
  var n = floatSizePx();
  return '<details class="ar6-custom"' + (FLOAT_UI_OPEN ? ' open' : '') + '>' +
    '<summary>悬浮球外观</summary>' +
    '<div class="ar6-custom-body">' +
      '<label class="ar6-mode-row"><span>显示模式</span>' +
        '<select data-ar6-setting="floatMode" class="ar6-sel">' + opts + '</select></label>' +
      '<label class="ar6-mode-row"><span>大小</span>' +
        '<input type="range" min="28" max="72" step="2" data-ar6-setting="floatSize" value="' + n + '"><b>' + n + 'px</b></label>' +
      '<label class="ar6-mode-row"><span>待机透明度</span>' +
        '<input type="range" min="20" max="100" step="5" data-ar6-setting="floatOpacity" value="' + (Number(cfg.floatOpacity) || 45) + '"><b>' + (Number(cfg.floatOpacity) || 45) + '%</b></label>' +
      '<label class="ar6-mode-row"><span>吸边露出</span>' +
        '<input type="range" min="20" max="80" step="5" data-ar6-setting="floatDock" value="' + (Number(cfg.floatDock) || 40) + '"><b>' + (Number(cfg.floatDock) || 40) + '%</b></label>' +
      '<label class="ar6-mode-row"><span>形状</span>' +
        '<select data-ar6-setting="floatShape" class="ar6-sel">' +
          '<option value="circle"' + (cfg.floatShape !== 'square' ? ' selected' : '') + '>圆形</option>' +
          '<option value="square"' + (cfg.floatShape === 'square' ? ' selected' : '') + '>圆角方形</option></select></label>' +
      '<label class="ar6-mode-row"><span>背景</span><input type="color" data-ar6-setting="floatBg" value="' + esc(cfg.floatBg || '#ffffff') + '"></label>' +
      '<label class="ar6-mode-row"><span>图标 URL</span><input type="url" data-ar6-setting="floatIcon" placeholder="留空用 🛡️" value="' + esc(cfg.floatIcon || '') + '"></label>' +
      '<label class="ar6-mode-row"><span>本地图片 &lt;300KB</span><input type="file" data-ar6-setting="imageFile" accept="image/png,image/jpeg,image/webp,image/gif"></label>' +
      '<label class="ar6-mode-row"><span>左右位置</span>' +
        '<input type="range" min="0" max="100" step="1" data-ar6-pos="x" value="' + Math.round((typeof cfg.fxN === 'number' ? cfg.fxN : 1) * 100) + '"><b>' + Math.round((typeof cfg.fxN === 'number' ? cfg.fxN : 1) * 100) + '%</b></label>' +
      '<label class="ar6-mode-row"><span>上下位置</span>' +
        '<input type="range" min="0" max="100" step="1" data-ar6-pos="y" value="' + Math.round((typeof cfg.fyN === 'number' ? cfg.fyN : 0.82) * 100) + '"><b>' + Math.round((typeof cfg.fyN === 'number' ? cfg.fyN : 0.82) * 100) + '%</b></label>' +
      '<div class="ar6-row">' +
        '<button class="ar6-b" data-ar6="resetFloat">↺ 重置外观</button>' +
        '<button class="ar6-b" data-ar6="clearIcon">清除图标</button>' +
      '</div>' +
      '<div class="ar6-hint">拖动悬浮球可移动；轻点打开面板。吸边模式会自动贴边隐藏，点一下露出。</div>' +
    '</div></details>';
}

function downscaleImage(file) {
  return new Promise(function (resolve, reject) {
    var fr = new FileReader();
    fr.onerror = function () { reject(new Error('read-fail')); };
    fr.onload = function () {
      var img = new Image();
      img.onerror = function () { reject(new Error('decode-fail')); };
      img.onload = function () {
        try {
          var side = 128;
          var cv = DOC.createElement('canvas');
          cv.width = side; cv.height = side;
          var ctx2 = cv.getContext('2d');
          var s = Math.min(img.width, img.height);
          ctx2.drawImage(img, (img.width - s) / 2, (img.height - s) / 2, s, s, 0, 0, side, side);
          resolve(cv.toDataURL('image/png'));
        } catch (e) { reject(e); }
      };
      img.src = String(fr.result || '');
    };
    fr.readAsDataURL(file);
  });
}

function installFloatSettings(r) {
  var det = r.querySelector('.ar6-custom');
  if (!det) return;
  det.addEventListener('toggle', function () { FLOAT_UI_OPEN = !!det.open; });
  var inputs = r.querySelectorAll('[data-ar6-setting]');
  for (var i = 0; i < inputs.length; i++) {
    (function (el) {
      var key = el.getAttribute('data-ar6-setting');
      if (key === 'imageFile') {
        el.addEventListener('change', function () {
          var f = el.files && el.files[0];
          if (!f) return;
          if (!/^image\/(png|jpeg|webp|gif)$/.test(f.type)) { banner('只支持 PNG/JPG/WebP/GIF', 'warn'); return; }
          if (f.size > 300 * 1024) { banner('图片超过 300KB，请先裁小（太大了会存不下）', 'warn'); return; }
          downscaleImage(f).then(function (dataUrl) {
            try {
              HOST.localStorage.setItem(FLOAT_IMAGE_KEY, dataUrl);
              floatImageCache = dataUrl; floatPreview = null; cfg.floatIcon = '';
              saveCfg(); render(); banner('图标已保存', 'ok');
            } catch (e) { banner('图片存储失败，换更小的图', 'warn'); }
          })['catch'](function () { banner('图片解析失败', 'warn'); });
        });
        return;
      }
      el.addEventListener('input', function () {
        if (el.type === 'checkbox') cfg[key] = !!el.checked;
        else if (el.type === 'range') {
          cfg[key] = Number(el.value);
          var b = el.parentNode && el.parentNode.querySelector('b');
          if (b) b.textContent = el.value + (key === 'floatSize' ? 'px' : '%');
        } else cfg[key] = el.value;
        saveCfg();
        var pill = r.querySelector('.ar6-pill');
        if (pill) { pill.setAttribute('style', floatStyle()); floatApplyPosition(r, true); }
      });
      el.addEventListener('change', function () { saveCfg(); render(); });
    })(inputs[i]);
  }
  var cust = r.querySelectorAll('[data-ar6="resetFloat"],[data-ar6="clearIcon"]');
  for (var j = 0; j < cust.length; j++) {
    (function (btn) {
      btn.addEventListener('click', function (e) {
        e.stopPropagation();
        var what = btn.getAttribute('data-ar6');
        if (what === 'resetFloat') {
          cfg.floatMode = 'dock'; cfg.floatSize = 44; cfg.floatShape = 'circle';
          cfg.floatOpacity = 45; cfg.floatDock = 40; cfg.floatBg = '#ffffff';
          cfg.floatBorder = true; cfg.floatShadow = true; cfg.floatX = null; cfg.floatY = null;
          cfg.floatIcon = '';
          try { HOST.localStorage.removeItem(FLOAT_IMAGE_KEY); } catch (err) {}
          floatImageCache = ''; floatPreview = null;
        } else {
          cfg.floatIcon = '';
          try { HOST.localStorage.removeItem(FLOAT_IMAGE_KEY); } catch (err) {}
          floatImageCache = ''; floatPreview = null;
        }
        saveCfg(); render(); banner('外观已更新', 'ok');
      });
    })(cust[j]);
  }
}
