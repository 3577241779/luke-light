/* ===== 11_wand.js ===== */
/* 11_wand.js — 酒馆魔法棒「光之守护」入口 + 闪耀迪迦桌宠（无「光」字残块，靠边与彩色计时器圆章唯一合体） */
var WAND_ID = 'ar6-wand';
var WAND_SHEET = 'ar6-wand-sheet';
var WAND_SENDBTN = 'ar6-sendbtn';
var WAND_SEL_MENU = ['#extensionsMenu', '#extensions_menu', '[data-testid="extensions-menu"]'];
var WAND_SEL_BTN = ['#extensionsMenuButton', '[data-testid="extensions-menu-button"]'];
var WAND_STATE = 'none';
var WAND_OBS = null;
var WAND_TRIES = 0;

/* 迪迦神光棒四芒星徽 */
var WAND_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.65" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 2.2 14.5 9.5 21.8 12 14.5 14.5 12 21.8 9.5 14.5 2.2 12 9.5 9.5Z" fill="rgba(56,189,248,.2)"/><circle cx="12" cy="12" r="2.2" fill="currentColor"/></svg>';

var WAND_CSS = [
  '#ar6-wand{display:block;margin:2px 0 4px}',
  '#ar6-wand .ar6-wb{display:flex;align-items:center;gap:8px;width:100%;box-sizing:border-box;',
  'padding:0 10px;height:34px;border:0;border-radius:7px;cursor:pointer;',
  'background:transparent;color:inherit;font:500 13.5px/1.2 -apple-system,BlinkMacSystemFont,"Segoe UI","Microsoft YaHei",sans-serif;',
  'text-align:left;-webkit-tap-highlight-color:transparent;transition:background .12s ease}',
  '#ar6-wand .ar6-wb:hover{background:rgba(56,189,248,.1)}',
  '#ar6-wand .ar6-wb:active{background:rgba(56,189,248,.16)}',
  '#ar6-wand .ar6-wi{flex:0 0 20px;width:20px;height:20px;display:grid;place-items:center;color:#38bdf8;opacity:.96}',
  '#ar6-wand .ar6-wb[data-on="0"] .ar6-wi{color:#94a3b8}',
  '#ar6-wand .ar6-wi svg{width:19px;height:19px;display:block}',
  '#ar6-wand .ar6-wn{flex:1 1 auto;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-weight:600}',
  '#ar6-wand .ar6-ws{flex:0 0 auto;font-size:11.5px;font-weight:600;color:#94a3b8}',
  '#ar6-wand .ar6-ws::before{content:"";display:inline-block;width:6px;height:6px;border-radius:50%;',
  'background:currentColor;margin-right:5px;vertical-align:1px}',
  '#ar6-wand .ar6-ws[data-on="1"]{color:#38bdf8}',
  '#ar6-wand .ar6-ws[data-on="1"]::before{box-shadow:0 0 6px #38bdf8}',
  '@media (pointer:coarse){#ar6-wand .ar6-wb{height:44px;font-size:15px}}',
  '#ar6-sendbtn{order:3;display:flex;align-items:center;justify-content:center;width:28px;height:28px;margin:0 2px;',
  'border-radius:8px;cursor:pointer;color:#38bdf8;background:#0f182b;border:1px solid rgba(148,163,184,.32)}',
  '#ar6-sendbtn svg{width:17px;height:17px}'
].join('\n');

function wandDoc() { return DOC || (HOST && HOST.document) || null; }
function wandPick(list) {
  var d = wandDoc(); if (!d) return null;
  for (var i = 0; i < list.length; i++) { var n = d.querySelector(list[i]); if (n) return n; }
  return null;
}
function wandMenu() { return wandPick(WAND_SEL_MENU); }
function wandBtn() { return wandPick(WAND_SEL_BTN); }
function wandShown(el) {
  if (!el) return false;
  try { return HOST.getComputedStyle(el).display !== 'none'; } catch (e) { return el.offsetParent !== null; }
}
function wandLabel() {
  var on = !!(cfg && cfg.enabled);
  return { text: on ? '蓝灯守护中' : '石像待机', on: on ? '1' : '0' };
}
function syncWandLabel() {
  try {
    var d = wandDoc();
    var box = d && d.getElementById(WAND_ID);
    if (!box) return;
    var L = wandLabel();
    var wb = box.querySelector('.ar6-wb');
    var ws = box.querySelector('.ar6-ws');
    if (wb) wb.setAttribute('data-on', L.on);
    if (ws) { ws.setAttribute('data-on', L.on); ws.textContent = L.text; }
  } catch (e) {}
}
function ensureWandStyle() {
  var d = wandDoc(); if (!d || !d.head || d.getElementById('ar6-wand-style')) return;
  var st = d.createElement('style');
  st.id = 'ar6-wand-style';
  st.textContent = WAND_CSS;
  d.head.appendChild(st);
}

function wandRow() {
  var d = wandDoc();
  var L = wandLabel();
  var b = d.createElement('button');
  b.type = 'button';
  b.className = 'ar6-wb';
  b.setAttribute('data-ar6-wand-open', '1');
  b.setAttribute('data-on', L.on);
  b.title = '打开或收起 卢克之光 · 光之守护';
  var ic = d.createElement('span'); ic.className = 'ar6-wi'; ic.innerHTML = WAND_ICON;
  var tx = d.createElement('span'); tx.className = 'ar6-wn'; tx.textContent = '光之守护';
  var st = d.createElement('span'); st.className = 'ar6-ws';
  st.setAttribute('data-on', L.on); st.textContent = L.text;
  b.appendChild(ic); b.appendChild(tx); b.appendChild(st);
  b.addEventListener('click', function (ev) {
    ev.preventDefault(); ev.stopPropagation();
    if (DISPOSED) return;
    try {
      if (typeof panelOpen === 'function' && panelOpen()) {
        minimized = true;
        cfg.docked = false;
        MORE_OPEN = false;
        syncMin();
        render();
      } else {
        openPanelFromWand();
      }
    } catch (e) {}
    wandCloseMenu();
  });
  b.addEventListener('pointerdown', function (ev) { ev.stopPropagation(); }, true);
  return b;
}

function wandCloseMenu() {
  var m = wandMenu(), b = wandBtn();
  if (!m || !b || !wandShown(m)) return;
  try { b.click(); } catch (e) {}
}

var AR6_AVATAR_ID = 'ar6-avatar';
var AR6_AVATAR_KEY = 'ar6-pet-v2';
var avatarCleanup = null;
var AR6_PET_DEFAULT = { show: false, size: 1, opacity: 1, motion: 'calm', voice: true, autoDock: true, paused: false, x: null, y: null, side: 'right', docked: false };
var AR6_PET_STATE = null;

function petClamp(v, def, lo, hi) {
  var n = Number(v);
  return Number.isFinite(n) ? Math.max(lo, Math.min(hi, n)) : def;
}
function petRead() {
  var d = {};
  for (var k in AR6_PET_DEFAULT) d[k] = AR6_PET_DEFAULT[k];
  try {
    var s = JSON.parse((ar6LsGet(AR6_AVATAR_KEY) || ar6LsGet('ar6-pet-v1')) || 'null');
    if (s && typeof s === 'object') {
      for (var k2 in d) if (s[k2] !== undefined) d[k2] = s[k2];
    }
  } catch (e) {}
  d.size = petClamp(d.size, 1, 0.7, 1.5);
  d.opacity = petClamp(d.opacity, 1, 0.35, 1);
  d.motion = (d.motion === 'calm' || d.motion === 'off') ? d.motion : 'full';
  d.show = !!d.show;
  d.voice = d.voice !== false;
  d.autoDock = d.autoDock !== false;
  d.paused = !!d.paused;
  d.side = d.side === 'left' ? 'left' : 'right';
  d.docked = !!d.docked;
  return d;
}
function petSave() {
  try { if (AR6_PET_STATE) ar6LsSet(AR6_AVATAR_KEY, JSON.stringify(AR6_PET_STATE)); } catch (e) {}
}

function petIsExpanded() {
  var p = AR6_PET_STATE || petRead();
  AR6_PET_STATE = p;
  return !!(p.show && !p.docked);
}
function petIsDocked() {
  var p = AR6_PET_STATE || petRead();
  AR6_PET_STATE = p;
  return !!(p.show && p.docked);
}
function petSummonFromPill() {
  var p = AR6_PET_STATE || petRead();
  var w = (DOC && DOC.defaultView) || HOST;
  var vw = (w && w.innerWidth) || 360, vh = (w && w.innerHeight) || 720;
  var ww = 110 * p.size, hh = 180 * p.size;
  var side = (cfg && cfg.pillSide === 'left') ? 'left' : 'right';
  var ry = ar6Num(cfg && cfg.pillY, 0.62, 0.08, 0.88);
  p.show = true;
  p.docked = false;
  p.side = side;
  p.x = (side === 'left') ? 12 : Math.max(8, vw - ww - 12);
  p.y = Math.max(8, Math.min(Math.max(8, vh - hh - 8), Math.round(vh * ry - hh * 0.45)));
  AR6_PET_STATE = p;
  petSave();
  try { avatarUnmount(); } catch (e0) {}
  try { avatarMount(); } catch (e1) {}
  try { if (typeof syncPill === 'function') syncPill(); } catch (e2) {}
  try { banner('✦ 闪耀迪迦已从计时器圆章召唤展开（拖回屏幕边缘可再次合体）', 'ok'); } catch (e3) {}
}

function petSettingsHTML() {
  var p = AR6_PET_STATE || petRead();
  var petSt = p.show ? (p.docked ? '已合入圆章' : '已召唤') : '待机';
  var h = '<div class="ar6-mmore-h">闪耀迪迦 · 光之伙伴桌宠</div>';
  h += '<div class="ar6-tgrid">' +
    '<button type="button" class="ar6-b span-2' + (p.show ? ' gold on' : '') + '" data-ar6="pet-show"><span class="ar6-b-lbl">闪耀迪迦 · 光之伙伴桌宠</span><em class="ar6-b-st">' + petSt + '</em></button>' +
    '<button type="button" class="ar6-b' + (p.voice ? ' on' : '') + '" data-ar6="pet-voice"><span class="ar6-b-lbl">互动台词气泡</span><em class="ar6-b-st">' + (p.voice ? '已开启' : '待机') + '</em></button>' +
    '<button type="button" class="ar6-b' + (p.autoDock ? ' on' : '') + '" data-ar6="pet-auto"><span class="ar6-b-lbl">靠边自动合入圆章</span><em class="ar6-b-st">' + (p.autoDock ? '已开启' : '待机') + '</em></button>' +
    actBtn('pet-reset', 'refresh', '召唤/复位迪迦', 'span-2') +
    '</div>';
  if (p.show) {
    h += segBarHTML('桌宠动效', '桌宠拖向屏幕边缘会自动合入计时器圆章；长按或双击圆章重新召唤迪迦，双击立绘直接打开面板。', [
      ['全效律动', 'full'],
      ['柔和呼吸', 'calm'],
      ['完全静止', 'off']
    ], String(p.motion || 'calm'), 'gm:motion', '');
    h += segBarHTML('桌宠不透明度', '', [['70% 半透', 0.7], ['90% 适中', 0.9], ['100% 实心', 1]], p.opacity, 'gm:opacity', '');
    h += segBarHTML('桌宠显示比例', '', [['80% 小巧', 0.8], ['100% 标准', 1], ['115% 偏大', 1.15], ['150% 特大', 1.5]], p.size, 'gm:size', '');
  } else {
    h += '<div class="ar6-dline">桌宠拖向屏幕边缘会自动合入计时器圆章，全屏始终最多保留一个悬浮物。</div>';
  }
  return h;
}

function petAction(act) {
  var p = AR6_PET_STATE || petRead();
  if (act === 'pet-show') {
    if (p.show) { p.show = false; p.docked = false; }
    else { p.show = true; p.docked = false; }
  } else if (act === 'pet-voice') p.voice = !p.voice;
  else if (act === 'pet-auto') p.autoDock = !p.autoDock;
  else if (act === 'pet-motion') p.motion = p.motion === 'full' ? 'calm' : (p.motion === 'calm' ? 'off' : 'full');
  else if (act === 'pet-opacity') p.opacity = p.opacity >= 0.99 ? 0.7 : (p.opacity < 0.8 ? 0.9 : 1);
  else if (act === 'pet-size') p.size = p.size < 0.9 ? 1 : (p.size < 1.1 ? 1.15 : (p.size < 1.3 ? 1.5 : 0.8));
  else if (act === 'pet-pause') p.paused = !p.paused;
  else if (act === 'pet-reset') { p.x = null; p.y = null; p.docked = false; p.show = true; }
  AR6_PET_STATE = p;
  petSave();
  if (!p.show && cfg && cfg.pillHide && typeof hasAltEntry === 'function' && !hasAltEntry()) {
    cfg.pillHide = false;
    try { if (typeof saveCfg === 'function') saveCfg(); } catch (ePH) {}
    try { banner('已关闭桌宠并自动恢复侧边计时器圆章，防止失去唤起入口', 'ok'); } catch (ePB) {}
  }
  if (typeof avatarMount === 'function') {
    try { avatarUnmount(); } catch (e) {}
    try { avatarMount(); } catch (eM) {
      try { banner('桌宠设置已保存，但挂载异常：' + String(eM && eM.message || eM), 'warn', true); } catch (e2) {}
    }
  }
  try { if (typeof syncPill === 'function') syncPill(); } catch (eP) {}
}

var AR6_PET_CSS = [
  ':host{display:block;font:12px/1.4 system-ui,sans-serif;color:#fff0cc}',
  ':host::before,:host::after{display:none!important}',
  '*{box-sizing:border-box}',
  'button{font:inherit;color:inherit;cursor:pointer}',
  '.pet{position:relative;width:100%;height:100%;perspective:520px}',
  '.face{pointer-events:auto;touch-action:none;position:absolute;left:5%;top:14%;width:90%;height:66%;padding:0;border:0;background:transparent;animation:ar6float 3.6s ease-in-out infinite}',
  '.portrait{display:block;width:100%;height:100%;background-size:contain;background-repeat:no-repeat;background-position:center;border:0;border-radius:0;filter:drop-shadow(0 10px 12px #0b1118a8);transition:transform .18s ease}',
  '.speech{position:absolute;z-index:3;left:-8%;top:0;width:116%;max-height:42px;overflow:hidden;padding:0 2px;border:0;border-radius:0;background:transparent;text-align:center;color:#fff3d0;text-shadow:0 1px 3px #071017,0 0 7px #071017;pointer-events:none}',
  '@keyframes ar6float{50%{transform:translateY(-5px) rotate(-2deg)}}',
  '@keyframes ar6happy{50%{transform:translateY(-7px) rotate(5deg)}}',
  ':host([data-happy="true"]) .face{animation:ar6happy .45s ease-in-out infinite}',
  ':host([data-motion="calm"]) .face{animation-duration:6s}',
  ':host([data-hidden="true"]) .face,:host([data-motion="off"]) .face,:host([data-paused="true"]) .face{animation:none}',
  '@media(prefers-reduced-motion:reduce){.face{animation:none!important}.portrait{transition:none!important;transform:none!important}}'
].join('');

function avatarMount() {
  var d = wandDoc();
  if (!d || !d.body || DISPOSED) return;
  AR6_PET_STATE = AR6_PET_STATE || petRead();
  var p = AR6_PET_STATE;
  var w = d.defaultView || HOST;
  /* 未开启桌宠或已靠边收纳合入圆章时：不挂载立绘节点，彻底消灭「光」字小耳朵与双悬浮物 */
  if (!p.show || p.docked) {
    avatarUnmount();
    try { if (typeof syncPill === 'function') syncPill(); } catch (eSP0) {}
    return;
  }
  var old = d.getElementById(AR6_AVATAR_ID);
  if (old && avatarCleanup) {
    try { if (typeof syncPill === 'function') syncPill(); } catch (eSP1) {}
    return;
  }
  avatarUnmount();
  var b = d.createElement('div');
  b.id = AR6_AVATAR_ID;
  var sh = b.attachShadow({ mode: 'open' });
  sh.innerHTML = '<style>' + AR6_PET_CSS + '</style>' +
    '<section class="pet" aria-label="闪耀迪迦光之伙伴">' +
    '<div class="speech" role="status" aria-live="polite"></div>' +
    '<button type="button" class="face" title="拖动可移位（靠边松手合入计时器圆章），双击打开主面板" aria-label="闪耀迪迦光之伙伴：双击打开控制面板">' +
    '<span class="portrait"></span><span class="light"></span>' +
    '</button></section>';
  var face = sh.querySelector('.face'), portrait = sh.querySelector('.portrait'), speech = sh.querySelector('.speech');
  portrait.style.backgroundImage = AR6_PET_BG;
  var ww = 110 * p.size, hh = 180 * p.size;
  var state = {
    x: Number.isFinite(p.x) ? p.x : Math.max(8, (w.innerWidth || 360) - ww - 16),
    y: Number.isFinite(p.y) ? p.y : Math.max(40, (w.innerHeight || 720) - hh - 24),
    side: p.side,
    paused: p.paused
  };
  var drag = null, down = null, timers = [], last = 0, recent = [];
  var lastTapAt = 0;  /* 手动双击检测：移动端没有 dblclick 事件 */

  function later(fn, ms) {
    var id = w.setTimeout(function () {
      timers = timers.filter(function (x) { return x !== id; });
      fn();
    }, ms);
    timers.push(id);
  }
  function layout() {
    var vw = w.innerWidth || 360, vh = w.innerHeight || 720;
    state.x = Math.max(0, Math.min(Math.max(0, vw - ww), state.x));
    state.y = Math.max(0, Math.min(Math.max(0, vh - hh), state.y));
    b.style.cssText = 'position:fixed!important;left:' + Math.round(state.x) + 'px!important;top:' + Math.round(state.y) + 'px!important;width:' + ww + 'px!important;height:' + hh + 'px!important;border:0!important;border-radius:0!important;background:none!important;box-shadow:none!important;padding:0!important;right:auto!important;bottom:auto!important;z-index:2147482999!important;pointer-events:none;touch-action:none;user-select:none;opacity:' + p.opacity + ';';
    b.setAttribute('data-paused', String(p.paused));
    b.setAttribute('data-motion', p.motion);
    b.setAttribute('data-opacity', String(p.opacity));
    b.setAttribute('data-scale', String(p.size));
  }
  function say(kind) {
    if (!p.voice || p.docked || p.paused) return;
    var lines = {
      tap: ['收到你的光了。', '我看见你啦。', '今天也一起守护吧。'],
      rub: ['这束光很温柔。', '再摸一下，就充满能量啦。', '和你并肩的感觉很好。'],
      drag: ['收到，换个位置继续守护。', '移动完成，光线稳定。'],
      open: ['我回来啦。', '光之伙伴，重新连接。']
    };
    var extra = {
      tap: ['在这里，随时待命。', '你的信号，我收到了。', '光芒稳定，放心吧。', '我陪你看下一段故事。'],
      rub: ['慢慢来，我不着急。', '感觉能量回来了。', '有你在，很安心。'],
      drag: ['这里视野不错。', '新的守护位置已就绪。', '位置调整好了。'],
      open: ['光芒重新点亮。', '能量连接完成。']
    };
    var a = (lines[kind] || lines.tap).concat(extra[kind] || extra.tap);
    var pool = a.filter(function (t) { return recent.indexOf(t) < 0; });
    var txt = pool[Math.floor(Math.random() * pool.length)];
    if (Date.now() - last < 450) return;
    last = Date.now();
    recent.push(txt);
    if (recent.length > 6) recent.shift();
    speech.textContent = txt;
    b.setAttribute('data-happy', 'true');
    later(function () { b.removeAttribute('data-happy'); speech.textContent = ''; }, 1700);
  }
  function dockToPill() {
    var vw = w.innerWidth || 360, vh = w.innerHeight || 720;
    state.side = (state.x + ww / 2 < vw / 2) ? 'left' : 'right';
    p.docked = true;
    p.side = state.side;
    p.x = state.x;
    p.y = state.y;
    petSave();
    if (cfg) {
      cfg.pillSide = state.side;
      cfg.pillY = ar6Num((state.y + hh * 0.45) / Math.max(1, vh), 0.62, 0.08, 0.88);
      cfg.pillHide = false;
      try { saveCfg(); } catch (eS) {}
    }
    avatarUnmount();
    try { if (typeof syncPill === 'function') syncPill(); } catch (eSP) {}
    try { UI_SIG = {}; if (!minimized) render(); } catch (eR) {}
  }
  function start(e) {
    if (e.button != null && e.button !== 0) return;
    e.preventDefault();
    drag = null;
    down = { id: e.pointerId, x: e.clientX, y: e.clientY, ox: state.x, oy: state.y, t: Date.now() };
    say('tap');
  }
  function move(e) {
    if (!down || down.id !== e.pointerId) return;
    var dx = e.clientX - down.x, dy = e.clientY - down.y;
    if (Math.hypot(dx, dy) > 12 || drag) {
      if (!drag) {
        drag = true;
        try { if (face.setPointerCapture && e.pointerId != null) face.setPointerCapture(e.pointerId); } catch (eCap) {}
      }
      state.x = down.ox + dx;
      state.y = down.oy + dy;
      layout();
    }
    if (!drag && Math.abs(dx) + Math.abs(dy) > 3) say('rub');
    if (!drag && !p.paused && p.motion !== 'off') {
      var r = face.getBoundingClientRect();
      portrait.style.transform = 'perspective(420px) rotateX(' + (-(e.clientY - r.top - r.height / 2) / 12) + 'deg) rotateY(' + ((e.clientX - r.left - r.width / 2) / 12) + 'deg)';
    }
  }
  function end(e) {
    if (!down || down.id !== e.pointerId) return;
    var moved = !!drag;
    try { if (moved && face.releasePointerCapture && e.pointerId != null) face.releasePointerCapture(e.pointerId); } catch (eRel) {}
    drag = null;
    down = null;
    portrait.style.transform = '';
    if (moved) {
      var vw = w.innerWidth || 360;
      if (p.autoDock && (state.x <= 18 || state.x + ww >= vw - 18)) {
        dockToPill();
        return;
      }
      p.x = state.x;
      p.y = state.y;
      petSave();
      say('drag');
    } else {
      /* 手动双击检测：移动端 pointerdown preventDefault 会取消原生 dblclick，必须在每次 !moved 抬手时记录 */
      var nowEnd = Date.now();
      if (lastTapAt && nowEnd - lastTapAt < 320) {
        lastTapAt = 0;
        try { if (typeof ar6ArmSynthShield === 'function') ar6ArmSynthShield(); } catch (eSh) {}
        try { if (typeof openPanel === 'function') openPanel(); } catch (eDB) {}
        return;
      }
      lastTapAt = nowEnd;
      if (nowEnd - last > 350) say('rub');
    }
  }

  face.addEventListener('pointerdown', start);
  face.addEventListener('pointermove', move);
  face.addEventListener('pointerup', end);
  face.addEventListener('pointercancel', function () { down = null; drag = null; portrait.style.transform = ''; });
  face.addEventListener('dblclick', function (ev) {
    try { ev.preventDefault(); ev.stopPropagation(); } catch (e0) {}
    try { if (typeof openPanel === 'function') openPanel(); } catch (e1) {}
  });
  b.addEventListener('pointerdown', function (e) { e.stopPropagation(); });
  b.addEventListener('click', function (e) { e.stopPropagation(); });

  function visibility() {
    b.setAttribute('data-hidden', String(d.hidden));
    if (d.hidden) { down = null; drag = null; portrait.style.transform = ''; }
  }
  w.addEventListener('resize', layout);
  d.addEventListener('visibilitychange', visibility);
  d.body.appendChild(b);
  layout();
  visibility();
  say('open');
  try { if (typeof syncPill === 'function') syncPill(); } catch (eSP2) {}
  avatarCleanup = function () {
    timers.forEach(function (id) { w.clearTimeout(id); });
    w.removeEventListener('resize', layout);
    d.removeEventListener('visibilitychange', visibility);
    b.remove();
  };
}

function avatarUnmount() {
  if (avatarCleanup) { avatarCleanup(); avatarCleanup = null; }
  var d = wandDoc(), b = d && d.getElementById(AR6_AVATAR_ID);
  if (b) b.remove();
}

function mountWandEntry() {
  if (DISPOSED) return false;
  var d = wandDoc(); if (!d || !d.body) return false;
  ensureWandStyle();
  try { avatarMount(); } catch (eAM) {}
  var menu = wandMenu();
  if (!menu) { wandFallback(); wandRetry(); return false; }
  var old = d.getElementById(WAND_ID);
  if (old && old.parentNode) old.parentNode.removeChild(old);
  var box = d.createElement('div');
  box.id = WAND_ID;
  box.appendChild(wandRow());
  menu.insertBefore(box, menu.firstChild);
  WAND_STATE = 'menu';
  wandDropFallback();
  try { if (HOST) HOST.__ar6Wand = { mount: mountWandEntry, unmount: unmountWandEntry, state: function () { return WAND_STATE; } }; } catch (eE) {}
  wandWatch();
  return true;
}

function wandFallback() {
  if (DISPOSED) return;
  var d = wandDoc(); if (!d || !d.body || d.getElementById(WAND_SENDBTN)) return;
  var host = d.getElementById('leftSendForm') || d.getElementById('rightSendForm');
  if (!host) { WAND_STATE = 'none'; return; }
  var b = d.createElement('div');
  b.id = WAND_SENDBTN; b.title = '光之守护（卢克之光控制面板）';
  b.innerHTML = WAND_ICON;
  b.addEventListener('click', function (ev) {
    ev.preventDefault(); ev.stopPropagation();
    try { openPanelFromWand(); } catch (e) {}
  });
  host.appendChild(b);
  WAND_STATE = 'sendform';
}
function wandDropFallback() {
  var d = wandDoc(); if (!d) return;
  var b = d.getElementById(WAND_SENDBTN);
  if (b && b.parentNode) b.parentNode.removeChild(b);
}
function wandRetry() {
  if (DISPOSED || WAND_TRIES >= 12 || WAND_STATE === 'menu') return;
  WAND_TRIES++;
  try { HOST.setTimeout(function () { if (!DISPOSED) mountWandEntry(); }, 500); } catch (e) {}
}
function wandWatch() {
  if (WAND_OBS || DISPOSED) return;
  var d = wandDoc(); if (!d || !d.body || !HOST.MutationObserver) return;
  WAND_OBS = new HOST.MutationObserver(function () {
    if (DISPOSED) return;
    var m = wandMenu();
    if (m && !m.querySelector('#' + WAND_ID)) mountWandEntry();
  });
  try { WAND_OBS.observe(d.body, { childList: true }); } catch (e) {}
}

function unmountWandEntry() {
  avatarUnmount();
  try { if (WAND_OBS) { WAND_OBS.disconnect(); WAND_OBS = null; } } catch (e) {}
  var d = wandDoc(); if (!d) return;
  var st = d.getElementById('ar6-wand-style');
  if (st && st.parentNode) st.parentNode.removeChild(st);
  [WAND_ID, WAND_SENDBTN, WAND_SHEET].forEach(function (id) {
    var n = d.getElementById(id);
    if (n && n.parentNode) n.parentNode.removeChild(n);
  });
  try { if (HOST && HOST.__ar6Wand) delete HOST.__ar6Wand; } catch (e2) {}
  WAND_STATE = 'none';
}
