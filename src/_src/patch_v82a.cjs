/* patch_v82a.cjs — v8.2 底座：配置消毒 / tuck / 布局盒 / 拖动修正 / 滚动判定 */
const fs = require('fs');
const path = require('path');
const S = (f) => path.join(__dirname, f);

function rep(file, anchor, next) {
  const p = S(file);
  let s = fs.readFileSync(p, 'utf8');
  const n = s.split(anchor).length - 1;
  if (n !== 1) throw new Error(file + ' anchor count=' + n + ' :: ' + anchor.slice(0, 60));
  s = s.replace(anchor, next);
  fs.writeFileSync(p, s);
  console.log('patched ' + file);
}

/* ---------- 1_core.js ---------- */
rep('1_core.js', "var VERSION = '8.1.0';", "var VERSION = '8.2.0';");

rep('1_core.js', "  v: 810\n};", "  v: 820,\n  fx: 'full',\n  rm: false,\n  padSeen: false\n};");

rep('1_core.js', "if (s.v !== 810) {", "if (s.v !== 820) {");
rep('1_core.js', "        d.v = 810;", "        d.v = 820;");

/* 消毒函数：放在 readCfg 之前 */
rep('1_core.js', "function readCfg() {",
`function ar6Num(v, def, lo, hi) {
  var n = Number(v);
  if (!isFinite(n)) n = def;
  return Math.max(lo, Math.min(hi, n));
}

function ar6Pick(v, list, def) {
  var s = String(v == null ? '' : v);
  for (var i = 0; i < list.length; i++) if (list[i] === s) return s;
  return def;
}

/* 浮球族字段消毒：NaN 会写出 left:NaNpx，hidden 是单向门 */
function sanitizeFloat(d) {
  if (!d || typeof d !== 'object') return;
  if (String(d.floatMode) === 'hidden') d.floatMode = 'tuck';
  d.floatMode = ar6Pick(d.floatMode, ['dock', 'float', 'tuck'], 'dock');
  d.floatSize = Math.round(ar6Num(d.floatSize, 44, 28, 80));
  d.floatOpacity = Math.round(ar6Num(d.floatOpacity, 45, 10, 100));
  d.floatDock = Math.round(ar6Num(d.floatDock, 45, 20, 80));
  d.floatShape = ar6Pick(d.floatShape, ['circle', 'square'], 'circle');
  if (!/^#[0-9a-fA-F]{6}$/.test(String(d.floatBg))) d.floatBg = '#0d1117';
  var ico = String(d.floatIcon || '');
  d.floatIcon = (ico.length <= 4096 && /^(https?:\\/\\/|data:image\\/(png|jpeg|webp|gif);base64,)/i.test(ico)) ? ico : '';
  d.floatBorder = d.floatBorder !== false;
  d.floatShadow = d.floatShadow !== false;
  d.fxN = ar6Num(d.fxN, 1, 0, 1);
  d.fyN = ar6Num(d.fyN, 0.82, 0, 1);
  d.fEdge = ar6Pick(d.fEdge, ['l', 'r'], d.fxN < 0.5 ? 'l' : 'r');
  if (typeof d.mx !== 'number' || !isFinite(d.mx)) d.mx = null;
  if (typeof d.my !== 'number' || !isFinite(d.my)) d.my = null;
  d.fx = ar6Pick(d.fx, ['full', 'calm', 'off'], 'full');
  d.rm = !!d.rm;
  d.min = !!d.min;
}

function readCfg() {`);

rep('1_core.js', "  } catch (e) {}\n  return d;\n}", "  } catch (e) {}\n  try { sanitizeFloat(d); } catch (eS) {}\n  return d;\n}");

/* ---------- 6_float.js ---------- */
/* 1. 颜色工具 + 盒子尺寸 */
rep('6_float.js', "function floatSizePx() {",
`function ar6Rgb(hex, a) {
  var h = String(hex || '#0d1117').replace('#', '');
  if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
  var n = parseInt(h, 16);
  if (!isFinite(n)) n = 0x0d1117;
  var r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
  return 'rgba(' + r + ',' + g + ',' + b + ',' + a + ')';
}

var PAD_OPEN = false;
var PAD_W = 176, PAD_H = 138;

/* 当前根节点的盒子尺寸：球 / 把手 / 控制盘 */
function floatBoxSize() {
  if (PAD_OPEN) return { w: PAD_W, h: PAD_H };
  var n = floatSizePx();
  if (String(cfg.floatMode) === 'tuck') return { w: Math.max(10, Math.round(n * 0.3)), h: n };
  return { w: n, h: n };
}

function floatSizePx() {`);

/* 2. 布局：按盒子尺寸算 */
rep('6_float.js', `function floatLayoutPx() {
  var n = floatSizePx();
  var s = getSafeBox();
  var vw = floatVW();
  var nx = (typeof cfg.fxN === 'number') ? cfg.fxN : 1;
  var ny = (typeof cfg.fyN === 'number') ? cfg.fyN : 0.82;
  nx = Math.max(0, Math.min(1, nx));
  ny = Math.max(0, Math.min(1, ny));
  var x = s.l + nx * Math.max(0, (s.r - s.l) - n);
  var y = s.t + ny * Math.max(0, (s.b - s.t) - n);
  if (cfg.floatMode === 'dock') {
    var reveal = Math.max(0.45, Math.min(0.8, (Number(cfg.floatDock) || 40) / 100));
    if (cfg.fEdge === 'l') x = -n * (1 - reveal);
    else if (cfg.fEdge === 'r') x = vw - n * reveal;
  }
  return { x: x, y: y, n: n };
}`,
`function floatLayoutPx() {
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
}`);

/* 3. 回写：按盒子尺寸 */
rep('6_float.js', `  var n = floatSizePx();
  var s = getSafeBox();
  var w = Math.max(1, (s.r - s.l) - n);
  var h = Math.max(1, (s.b - s.t) - n);
  cfg.fxN = Math.max(0, Math.min(1, (b.left - s.l) / w));
  cfg.fyN = Math.max(0, Math.min(1, (b.top - s.t) / h));
  var mid = s.l + (s.r - s.l - n) / 2;
  cfg.fEdge = (b.left + n / 2 < mid) ? 'l' : 'r';`,
`  var box = floatBoxSize();
  var n = box.w;
  var s = getSafeBox();
  var w = Math.max(1, (s.r - s.l) - box.w);
  var h = Math.max(1, (s.b - s.t) - box.h);
  cfg.fxN = Math.max(0, Math.min(1, (b.left - s.l) / w));
  cfg.fyN = Math.max(0, Math.min(1, (b.top - s.t) / h));
  var mid = s.l + (s.r - s.l - box.w) / 2;
  cfg.fEdge = (b.left + box.w / 2 < mid) ? 'l' : 'r';`);

/* 4. 应用位置：写盒子宽高 */
rep('6_float.js', `  var p = floatLayoutPx();
  var dockOn = docked && cfg.floatMode === 'dock';
  if (!dockOn) {
    var c = floatClampPx(p.x, p.y, p.n, p.n);
    p.x = c.x;
    p.y = c.y;
  }
  FLOAT_GEOM.x = Math.round(p.x);
  FLOAT_GEOM.y = Math.round(p.y);
  r.style.left = FLOAT_GEOM.x + 'px';
  r.style.top = FLOAT_GEOM.y + 'px';
  r.style.right = 'auto';
  r.style.bottom = 'auto';
  r.style.width = p.n + 'px';
  r.style.height = p.n + 'px';
  r.style.minWidth = p.n + 'px';
  r.style.minHeight = p.n + 'px';`,
`  var p = floatLayoutPx();
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
  r.style.minHeight = p.h + 'px';`);

/* 5. 拖动结束：先量后清 + kind 取最新 */
rep('6_float.js', "  if (!r || r.__ar6rd) return;\n  r.__ar6rd = true;", "  if (!r) return;\n  if (r.__ar6rd) { r.__ar6kind = kind; return; }\n  r.__ar6rd = true; r.__ar6kind = kind;");

rep('6_float.js', `    if (moved && !cancelled) {
      var b = r.getBoundingClientRect();
      var w = b.width || 320, h = b.height || 240;
      var c = floatClampPx(b.left, b.top, w, h);
      r.style.left = c.x + 'px';
      r.style.top = c.y + 'px';
      r.style.right = 'auto';
      r.style.bottom = 'auto';
      if (kind === 'ball') floatSaveFromPx(r);
      else { cfg.mx = c.x; cfg.my = c.y; saveCfg(); }
    }
    moved = false; armed = false;`,
`    if (moved && !cancelled) {
      /* 必须在清 transform 之前量：rect 含 translate3d */
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
    moved = false; armed = false;`);

/* 6. 滚动判定：把根节点自己也算进去 */
rep('6_float.js', `  function hitScroll(t) {
    var p = t;
    while (p && p !== r) {
      try {
        if (p.nodeType === 1 && p.clientHeight > 0 && p.scrollHeight > p.clientHeight + 2) return true;
      } catch (e) {}
      p = p.parentNode;
    }
    return false;
  }`,
`  function hitScroll(t) {
    var p = t;
    while (p) {
      try {
        if (p.nodeType === 1 && p.clientHeight > 0 && p.scrollHeight > p.clientHeight + 2) return true;
      } catch (e) {}
      if (p === r) break;
      p = p.parentNode;
    }
    return false;
  }`);

/* 7. 标题栏精确匹配，避免 .ar6-hint 误命中 */
rep('6_float.js', "      if (p.className && String(p.className).indexOf('ar6-h') >= 0) return true;",
  "      if (p.className) {\n        var cls = String(p.className).split(/\\s+/);\n        for (var ci = 0; ci < cls.length; ci++) if (cls[ci] === 'ar6-h' || cls[ci] === 'ar6-grip') return true;\n      }");

/* 8. 轻点判定统一：未 armed 且 <300ms */
rep('6_float.js', "  if (!armed && Date.now() - downAt < 400) {", "  if (!armed && Date.now() - downAt < 300) {");

console.log('done');
