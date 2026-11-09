/* 11_wand.js — v8.4：扩展菜单里的「Anti-Route」一行，点一下直接开面板；关掉即完全消失 */
var WAND_ID = 'ar6-wand';
var WAND_SHEET = 'ar6-wand-sheet';
var WAND_SENDBTN = 'ar6-sendbtn';
var WAND_SEL_MENU = ['#extensionsMenu', '#extensions_menu', '[data-testid="extensions-menu"]'];
var WAND_SEL_BTN = ['#extensionsMenuButton', '[data-testid="extensions-menu-button"]'];
var WAND_STATE = 'none';
var WAND_OBS = null;
var WAND_TRIES = 0;

var WAND_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 20 13.5 10.5"/><path d="m16 3.5 1.1 2.6 2.6 1.1-2.6 1.1L16 11l-1.1-2.7L12.3 7.2l2.6-1.1z"/><path d="m19.5 14.5.6 1.4 1.4.6-1.4.6-.6 1.4-.6-1.4-1.4-.6 1.4-.6z"/></svg>';

var WAND_CSS = [
  '#ar6-wand{display:block;margin:2px 0 4px}',
  '#ar6-wand .ar6-wb{display:flex;align-items:center;gap:8px;width:100%;box-sizing:border-box;',
  'padding:0 10px;height:32px;border:0;border-radius:7px;cursor:pointer;',
  'background:transparent;color:inherit;font:400 13.5px/1.2 -apple-system,BlinkMacSystemFont,"Segoe UI","Microsoft YaHei",sans-serif;',
  'text-align:left;-webkit-tap-highlight-color:transparent;transition:background .12s ease,border-color .12s ease}',
  '#ar6-wand .ar6-wb:hover{background:rgba(255,255,255,.07)}',
  '#ar6-wand .ar6-wb:active{background:rgba(255,255,255,.11)}',
  '#ar6-wand .ar6-wi{flex:0 0 20px;width:20px;height:20px;display:grid;place-items:center;opacity:.92}',
  '#ar6-wand .ar6-wi svg{width:20px;height:20px;display:block}',
  '#ar6-wand .ar6-wn{flex:1 1 auto;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}',
  '#ar6-wand .ar6-ws{flex:0 0 auto;font-size:11px;font-weight:400;color:#7d8590}',
  '#ar6-wand .ar6-ws::before{content:"";display:inline-block;width:6px;height:6px;border-radius:50%;',
  'background:currentColor;margin-right:4px;vertical-align:1px}',
  '#ar6-wand .ar6-ws[data-on="1"]{color:#3fb950}',
  '@media (pointer:coarse){#ar6-wand .ar6-wb{height:44px;font-size:15px}}',
  '#ar6-sendbtn{order:3;display:flex;align-items:center;justify-content:center;width:28px;height:28px;margin:0 2px;',
  'border-radius:8px;cursor:pointer;color:#58a6ff;background:#161b22;border:1px solid rgba(255,255,255,.10)}',
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
  return { text: on ? '防护开' : '防护关', on: on ? '1' : '0' };
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
  var b = d.createElement('button');
  b.type = 'button';
  b.className = 'ar6-wb';
  b.setAttribute('data-ar6-wand-open', '1');
  b.title = '打开 Anti-Route 面板';
  var ic = d.createElement('span'); ic.className = 'ar6-wi'; ic.innerHTML = WAND_ICON;
  var tx = d.createElement('span'); tx.className = 'ar6-wn'; tx.textContent = 'Anti-Route';
  var st = d.createElement('span'); st.className = 'ar6-ws';
  var L = wandLabel(); st.setAttribute('data-on', L.on); st.textContent = L.text;
  b.appendChild(ic); b.appendChild(tx); b.appendChild(st);
  b.addEventListener('click', function (ev) {
    ev.preventDefault(); ev.stopPropagation();
    if (DISPOSED) return;
    try { openPanelFromWand(); } catch (e) {}
    try { banner('面板已打开 · 关掉后悬浮球一起消失', 'ok'); } catch (e2) {}
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

function mountWandEntry() {
  if (DISPOSED) return false;
  var d = wandDoc(); if (!d || !d.body) return false;
  ensureWandStyle();
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
  try { if (HOST) HOST.__ar6Wand = { mount: mountWandEntry, unmount: unmountWandEntry, state: function () { return WAND_STATE; } }; } catch (e) {}
  wandWatch();
  return true;
}

function wandFallback() {
  if (DISPOSED) return;
  var d = wandDoc(); if (!d || !d.body || d.getElementById(WAND_SENDBTN)) return;
  var host = d.getElementById('leftSendForm') || d.getElementById('rightSendForm');
  if (!host) { WAND_STATE = 'none'; return; }
  var b = d.createElement('div');
  b.id = WAND_SENDBTN; b.title = 'Anti-Route';
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
