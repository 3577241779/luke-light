/* patch_v82b.cjs — v8.2 界面层：控制盘 / 图标 / 提示条 / 流光 / 环形 / 找回入口 */
const fs = require('fs');
const path = require('path');
const S = (f) => path.join(__dirname, f);

function rep(file, anchor, next) {
  const p = S(file);
  let s = fs.readFileSync(p, 'utf8');
  const n = s.split(anchor).length - 1;
  if (n !== 1) throw new Error(file + ' anchor count=' + n + ' :: ' + anchor.slice(0, 70));
  s = s.replace(anchor, next);
  fs.writeFileSync(p, s);
  console.log('patched ' + file);
}

/* ---------- 6_float.js：球的尺寸/底色/溢出（环要露在外面） ---------- */
rep('6_float.js', `function floatStyle() {
  var n = floatSizePx();
  var shape = cfg.floatShape === 'square' ? '12px' : '50%';
  var op = Math.max(0.1, Math.min(1, (Number(cfg.floatOpacity) || 45) / 100));
  var tint = floatTint();
  return 'width:' + n + 'px;height:' + n + 'px;min-width:' + n + 'px;min-height:' + n + 'px;' +
    'padding:0!important;border-radius:' + shape + ';background:' + esc(cfg.floatBg || '#0d1117') + ';' +
    'border:1px solid ' + (cfg.floatBorder ? tint.line : 'transparent') + ';' +
    'box-shadow:' + (cfg.floatShadow ? ('0 10px 26px rgba(0,0,0,.45),0 0 0 4px ' + tint.halo) : 'none') + ';' +
    'opacity:' + op + ';touch-action:none;user-select:none;-webkit-user-select:none;overflow:hidden;' +
    'display:flex;align-items:center;justify-content:center;position:fixed;z-index:2147483000;left:0;top:0;cursor:grab;' +
    'transition:opacity .2s,transform .24s,box-shadow .25s;';
}`,
`function floatStyle() {
  var box = floatBoxSize();
  var shape = cfg.floatShape === 'square' ? '12px' : '50%';
  if (PAD_OPEN) shape = '14px';
  var op = Math.max(0.12, Math.min(1, (Number(cfg.floatOpacity) || 45) / 100));
  var tint = floatTint();
  /* 待机半透明用 rgba 背景，而不是容器 opacity —— 否则能量环被一起压暗 */
  return 'width:' + box.w + 'px;height:' + box.h + 'px;min-width:' + box.w + 'px;min-height:' + box.h + 'px;' +
    'padding:0!important;border-radius:' + shape + ';background:' + ar6Rgb(cfg.floatBg || '#0d1117', op) + ';' +
    'border:1px solid ' + (cfg.floatBorder ? tint.line : 'transparent') + ';' +
    'box-shadow:' + (cfg.floatShadow ? ('0 10px 26px rgba(0,0,0,.45),0 0 0 4px ' + tint.halo) : 'none') + ';' +
    'opacity:1;touch-action:none;user-select:none;-webkit-user-select:none;overflow:visible;' +
    'display:flex;align-items:center;justify-content:center;position:fixed;z-index:2147483000;left:0;top:0;' +
    'cursor:' + (PAD_OPEN ? 'default' : 'grab') + ';' +
    'transition:width .16s,height .16s,border-radius .16s,box-shadow .25s;';
}`);

/* ---------- 4_ui.js ---------- */

/* 1) 追加一段 v8.2 样式（另开一个 <style>，不动 CSS_TEXT） */
rep('4_ui.js', `    s.appendChild(d.createTextNode(CSS_TEXT));
    d.head.appendChild(s);
  } catch (e) {}`,
`    s.appendChild(d.createTextNode(CSS_TEXT));
    d.head.appendChild(s);
    if (!d.getElementById('ar6-style82')) {
      var s2 = d.createElement('style');
      s2.id = 'ar6-style82';
      s2.appendChild(d.createTextNode(V82_CSS));
      d.head.appendChild(s2);
    }
  } catch (e) {}`);

/* 2) 横幅 v2：图标 + 两行 + 优先级 + 双 rAF 入场 + 避刘海 */
rep('4_ui.js', `var BANNER_KIND = { ok: '#2da44e', warn: '#bf8700', bad: '#cf222e', gray: '#57606a' };

function banner(msg, kind) {`,
`var V82_CSS = [
  '#ar6-root{--bg-1:#161b22;--bg-2:#0d1117;--ln-1:#30363d;--ln-2:#21262d;--acc:#58a6ff;}',
  '.ar6-pad{display:flex;flex-direction:column;gap:7px;padding:9px 10px 8px;width:100%;height:100%;box-sizing:border-box;color:#e6edf3;}',
  '.ar6-pad-h{display:flex;align-items:center;gap:6px;font-size:12px;font-weight:600;cursor:grab;user-select:none;}',
  '.ar6-pad-h b{font-size:12px;font-weight:600;letter-spacing:.2px}',
  '.ar6-pad-h .ar6-x{margin-left:auto;width:20px;height:20px;line-height:1;font-size:13px}',
  '.ar6-pad-r{display:flex;align-items:center;gap:8px;font-size:11px;color:#8b949e}',
  '.ar6-pad-r span{flex:0 0 22px}',
  '.ar6-pad-r input[type=range]{flex:1;-webkit-appearance:none;appearance:none;height:18px;background:transparent}',
  '.ar6-pad-r input[type=range]::-webkit-slider-runnable-track{height:4px;border-radius:2px;background:#30363d}',
  '.ar6-pad-r input[type=range]::-webkit-slider-thumb{-webkit-appearance:none;width:14px;height:14px;margin-top:-5px;border-radius:50%;background:#58a6ff;box-shadow:0 0 0 3px rgba(88,166,255,.18)}',
  '.ar6-pad-r input[type=range]::-moz-range-track{height:4px;border-radius:2px;background:#30363d}',
  '.ar6-pad-r input[type=range]::-moz-range-thumb{width:14px;height:14px;border:0;border-radius:50%;background:#58a6ff}',
  '.ar6-grip{margin-top:1px;padding:6px 0;border:1px dashed #30363d;border-radius:8px;text-align:center;font-size:11px;color:#8b949e;cursor:grab;touch-action:none;user-select:none;}',
  '.ar6-grip:active{border-color:#58a6ff;color:#c9d1d9}',
  '.ar6-pad-f{display:flex;gap:6px;margin-top:auto}',
  '.ar6-pad-f .ar6-b{flex:1;justify-content:center;font-size:11px;padding:5px 0}',
  '.ar6-ring{position:absolute;inset:-3px;border-radius:inherit;pointer-events:none;opacity:.55;',
  'background:conic-gradient(from 0deg,rgba(88,166,255,0) 0deg,rgba(88,166,255,.85) 70deg,rgba(88,166,255,0) 150deg,rgba(88,166,255,0) 360deg);',
  '-webkit-mask:radial-gradient(farthest-side,transparent calc(100% - 2px),#000 calc(100% - 2px));mask:radial-gradient(farthest-side,transparent calc(100% - 2px),#000 calc(100% - 2px));',
  'animation:ar6spin 3.6s linear infinite;}',
  '@keyframes ar6spin{to{transform:rotate(360deg)}}',
  '.ar6-sheen{position:absolute;inset:0;border-radius:inherit;pointer-events:none;overflow:hidden;}',
  '.ar6-sheen::after{content:"";position:absolute;top:0;left:-60%;width:45%;height:100%;',
  'background:linear-gradient(100deg,rgba(255,255,255,0) 0,rgba(255,255,255,.28) 50%,rgba(255,255,255,0) 100%);',
  'transform:skewX(-18deg);animation:ar6sheen 4.8s ease-in-out infinite;}',
  '@keyframes ar6sheen{0%,72%{left:-60%;opacity:0}78%{opacity:.85}100%{left:120%;opacity:0}}',
  '#ar6-root[data-st="bad"] .ar6-ring{animation-duration:2.2s;opacity:.75}',
  '#ar6-root[data-st="ok"] .ar6-ring{animation-duration:6s;opacity:.4}',
  '#ar6-root[data-st="bad"] .ar6-sheen::after{animation-duration:2.6s}',
  '#ar6-bn2{position:fixed;left:50%;transform:translateX(-50%) translateY(-8px);z-index:2147483002;',
  'display:flex;align-items:flex-start;gap:9px;max-width:min(560px,92vw);padding:9px 11px 9px 12px;border-radius:12px;',
  'background:rgba(22,27,34,.94);border:1px solid #30363d;border-left-width:3px;',
  'box-shadow:0 10px 30px rgba(0,0,0,.45),0 0 0 1px rgba(255,255,255,.02) inset;',
  'font:13px/1.5 -apple-system,"Microsoft YaHei",sans-serif;color:#e6edf3;opacity:0;pointer-events:auto;',
  'transition:opacity .18s ease,transform .18s cubic-bezier(.2,.8,.2,1);backdrop-filter:blur(8px);}',
  '#ar6-bn2[data-in="1"]{opacity:1;transform:translateX(-50%) translateY(0)}',
  '#ar6-bn2[data-kind="ok"]{border-left-color:#2da44e}',
  '#ar6-bn2[data-kind="warn"]{border-left-color:#bf8700}',
  '#ar6-bn2[data-kind="bad"]{border-left-color:#cf222e}',
  '#ar6-bn2[data-kind="gray"]{border-left-color:#57606a}',
  '#ar6-bn2 .ar6-bi{flex:0 0 auto;width:18px;height:18px;margin-top:1px;opacity:.95}',
  '#ar6-bn2 .ar6-bt{flex:1;min-width:0;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}',
  '#ar6-bn2 .ar6-bx{flex:0 0 auto;border:0;background:transparent;color:#8b949e;font-size:14px;line-height:1;padding:2px 2px;cursor:pointer}',
  '.ar6-i{width:14px;height:14px;flex:0 0 auto;fill:none;stroke:currentColor;stroke-width:1.7;stroke-linecap:round;stroke-linejoin:round;opacity:.92}',
  '.ar6-b{display:inline-flex;align-items:center;gap:6px}',
  '.ar6-custom{display:flex;align-items:center;gap:8px;margin:6px 0;font-size:12px;color:#8b949e}',
  '.ar6-mode-row{display:flex;align-items:center;gap:8px;margin:5px 0;font-size:12px;color:#c9d1d9}',
  '.ar6-sel{background:#0d1117;color:#e6edf3;border:1px solid #30363d;border-radius:8px;padding:4px 6px;font-size:12px}',
  '.ar6-hint{font-size:11px;color:#6e7681;margin:2px 0 6px}',
  '#ar6-root .ar6-body{overflow-y:auto;overscroll-behavior:contain;-webkit-overflow-scrolling:touch}',
  '@media (prefers-reduced-motion: reduce){.ar6-ring,.ar6-sheen::after{animation:none!important}}',
  '#ar6-root[data-rm="1"] .ar6-ring,#ar6-root[data-rm="1"] .ar6-sheen::after{animation:none!important}'
].join('');

var BANNER_KIND = { ok: '#2da44e', warn: '#bf8700', bad: '#cf222e', gray: '#57606a' };
var BN_RANK = { gray: 1, ok: 2, warn: 3, bad: 4 };
var BN_STATE = { kind: '', at: 0 };

function banner(msg, kind) {
  if (DISPOSED) return;
  try {
    if (!DOC || !DOC.body) return;
    var k = BANNER_KIND[kind] ? kind : 'gray';
    var now = Date.now();
    /* 同级 1.6s 内不互相覆盖；低优先级不打断高优先级 */
    if (BN_STATE.at && now - BN_STATE.at < 1600 && (BN_RANK[k] || 1) <= (BN_RANK[BN_STATE.kind] || 1)) return;
    BN_STATE.kind = k; BN_STATE.at = now;

    var old = DOC.getElementById('ar6-bn2');
    if (old && old.parentNode) old.parentNode.removeChild(old);
    var el = DOC.createElement('div');
    el.id = 'ar6-bn2';
    el.setAttribute('data-kind', k);
    el.setAttribute('role', k === 'bad' ? 'alert' : 'status');
    el.style.top = 'calc(8px + env(safe-area-inset-top))';
    el.innerHTML = '<span class="ar6-bi">' + ico(k === 'bad' ? 'alert' : (k === 'warn' ? 'warn' : (k === 'ok' ? 'check' : 'info'))) + '</span>' +
      '<span class="ar6-bt">' + esc(String(msg == null ? '' : msg)) + '</span>' +
      '<button class="ar6-bx" aria-label="关闭">✕</button>';
    DOC.body.appendChild(el);
    var close = function () { try { el.parentNode.removeChild(el); } catch (e) {} };
    el.querySelector('.ar6-bx').addEventListener('click', function (ev) { try { ev.stopPropagation(); } catch (e) {} close(); });
    /* 双 rAF：先让它进树，再加 data-in，transition 才会真正跑 */
    var raf = HOST.requestAnimationFrame || function (fn) { return setTimeout(fn, 16); };
    raf(function () { raf(function () { try { el.setAttribute('data-in', '1'); } catch (e) {} }); });
    if (bannerTimer) clearTimeout(bannerTimer);
    bannerTimer = setTimeout(function () {
      try {
        el.removeAttribute('data-in');
        setTimeout(close, 220);
      } catch (e) {}
    }, 3600);
  } catch (e) {}
}

function bannerOld(msg, kind) {`);

/* 3) 图标体系 + chip 换图标（data-ar6 键保持不变，避免分派失效） */
rep('4_ui.js', `function chip(label, on) {
  return '<button class="ar6-b' + (on ? ' on' : '') + '" data-ar6="' + label + '">' + esc(label) + '</button>';
}`,
`var AR6_ICONS = {
  shield: 'M12 3l7 3v5c0 4.4-3 8.4-7 9.7C8 19.4 5 15.4 5 11V6l7-3z',
  'shield-off': 'M12 3l7 3v5c0 4.4-3 8.4-7 9.7C8 19.4 5 15.4 5 11V6l7-3zM4 4l16 16',
  alert: 'M12 3l9 16H3L12 3zM12 9v4M12 16.5v.6',
  warn: 'M12 3l9 16H3L12 3zM12 9v4M12 16.5v.6',
  check: 'M20 6L9 17l-5-5',
  info: 'M12 3a9 9 0 100 18 9 9 0 000-18zM12 11v5M12 8v.5',
  feather: 'M20 4c-6 0-11 5-11 11v5M9 15l7-7M11 19h6',
  brain: 'M9 4a3 3 0 00-3 3v1a3 3 0 000 6v2a3 3 0 006 0V4M15 4a3 3 0 013 3v1a3 3 0 010 6v2a3 3 0 01-6 0',
  pin: 'M12 3v8M8 11h8l-2 4H10l-2-4zM12 15v6',
  eye: 'M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12zM12 15a3 3 0 100-6 3 3 0 000 6z',
  bell: 'M18 16H6l1.5-2V9a4.5 4.5 0 019 0v5L18 16zM10 19a2 2 0 004 0',
  bandage: 'M4 9l5-5 11 11-5 5L4 9zM9 4l11 11M8.5 12.5l3 3',
  microscope: 'M6 20h12M9 20v-3M12 4l4 4-5 5-4-4 5-5zM7 11l6 6M14 14l4 4',
  flask: 'M9 3h6M10 3v6l-5 9a2 2 0 002 3h10a2 2 0 002-3l-5-9V3M7.5 15h9',
  stethoscope: 'M6 4v5a4 4 0 008 0V4M10 13v3a4 4 0 008 0v-2M18 8.5a1.5 1.5 0 100 3 1.5 1.5 0 000-3z',
  telescope: 'M3 14l12-7 3 5-12 7-3-5zM14 6l2-1 3 5-2 1M9 16l-2 4',
  tag: 'M3 12l9-9 9 9-9 9-9-9zM8 12h.5',
  gauge: 'M4 17a8 8 0 1116 0M12 17l4-5',
  target: 'M12 3a9 9 0 100 18 9 9 0 000-18zM12 8a4 4 0 100 8 4 4 0 000-8zM12 12h.5',
  file: 'M6 3h8l4 4v14H6V3zM14 3v5h5M9 13h6M9 17h4',
  wrench: 'M14 6a4 4 0 105 5l-9 9-3-3 9-9a4 4 0 01-2-2z',
  book: 'M4 5a2 2 0 012-2h12v18H6a2 2 0 01-2-2V5zM8 3v18M12 8h4',
  trash: 'M4 7h16M9 7V4h6v3M6 7l1 14h10l1-14M10 11v6M14 11v6',
  palette: 'M12 3a9 9 0 000 18c2 0 2-2 1-3s0-2 2-2h3a3 3 0 003-3c0-5-4-10-9-10zM7.5 9h.5M11 6.5h.5M15.5 8h.5',
  ghost: 'M5 20V10a7 7 0 0114 0v10l-2.5-2-2 2-2.5-2-2 2L8 18l-3 2zM9.5 10h.5M14 10h.5',
  dot: 'M12 8a4 4 0 100 8 4 4 0 000-8z'
};

function ico(name) {
  var d = AR6_ICONS[name] || AR6_ICONS.dot;
  return '<svg class="ar6-i" viewBox="0 0 24 24" aria-hidden="true"><path d="' + d + '"/></svg>';
}

function icoOf(label) {
  var s = String(label || '');
  if (s.indexOf('安全') >= 0) return 'shield-off';
  if (s.indexOf('自检') >= 0) return 'stethoscope';
  if (s.indexOf('破甲') >= 0) return 'shield';
  if (s.indexOf('补一次') >= 0) return 'bandage';
  if (s.indexOf('确认') >= 0) return 'bell';
  if (s.indexOf('思考') >= 0) return 'brain';
  if (s.indexOf('微扰') >= 0 || s.indexOf('混淆') >= 0) return 'feather';
  if (s.indexOf('钉') >= 0) return 'pin';
  if (s.indexOf('观察') >= 0) return 'eye';
  if (s.indexOf('原生') >= 0 || s.indexOf('探针') >= 0) return 'microscope';
  if (s.indexOf('双通道') >= 0) return 'flask';
  if (s.indexOf('验渠道') >= 0) return 'telescope';
  if (s.indexOf('别名') >= 0) return 'tag';
  if (s.indexOf('档位') >= 0) return 'gauge';
  if (s.indexOf('身份') >= 0) return 'target';
  if (s.indexOf('报告') >= 0) return 'file';
  if (s.indexOf('排查') >= 0) return 'wrench';
  if (s.indexOf('说明') >= 0) return 'book';
  if (s.indexOf('清空') >= 0) return 'trash';
  if (s.indexOf('外观') >= 0) return 'palette';
  if (s.indexOf('悬浮') >= 0) return 'ghost';
  if (s.indexOf('找回') >= 0) return 'ghost';
  if (s.indexOf('请求') >= 0) return 'file';
  return 'dot';
}

/* 去掉前导 emoji，只用于显示；data-ar6 仍用原串，分派不受影响 */
function chipText(label) {
  var s = String(label || '');
  var i = 0;
  while (i < s.length) {
    var c = s.charCodeAt(i);
    if ((c >= 48 && c <= 57) || (c >= 65 && c <= 90) || (c >= 97 && c <= 122) || c >= 0x4e00) break;
    i++;
  }
  return s.slice(i) || s;
}

function chip(label, on) {
  return '<button class="ar6-b' + (on ? ' on' : '') + '" data-ar6="' + esc(String(label)) + '">' +
    ico(icoOf(label)) + '<span>' + esc(chipText(label)) + '</span></button>';
}

function openPad() {
  PAD_OPEN = true;
  minimized = true;
  cfg.min = true;
  try { closeCard(); } catch (eC) {}
  render();
  try { floatApplyPosition(root(), true); } catch (eA) {}
}

function closePad() {
  PAD_OPEN = false;
  try { saveCfg(); } catch (eS) {}
  render();
  try { floatApplyPosition(root(), true); } catch (eA) {}
}`);

console.log('part b done');
