/* fix_wand83.cjs — 注入样式 + 调整 PARTS 顺序 */
const fs = require('fs');
const path = require('path');
const W = path.join(__dirname, '11_wand.js');
let w = fs.readFileSync(W, 'utf8');

const CSS = `
var WAND_CSS = [
  '#extensionsMenu.extension_container,#extensionsMenu #ar6-wand{display:contents}',
  '#extensionsMenu .stmw{--stmw-fg:#e6edf3;--stmw-mut:#8b949e;--stmw-line:rgba(255,255,255,.09);',
  '--stmw-hover:rgba(255,255,255,.06);--stmw-act:#58a6ff;--stmw-ok:#3fb950;--stmw-warn:#d29922;',
  '--stmw-px:10px;--stmw-gap:8px;--stmw-ico:16px;--stmw-fs:13px;--stmw-fs-state:10.5px;',
  '--stmw-row-hub:34px;--stmw-row:32px;--stmw-radius:8px;--stmw-group-gap:2px;',
  '--stmw-indent:calc(var(--stmw-px) + var(--stmw-ico) + var(--stmw-gap));',
  'display:flex;flex-direction:column;width:100%;box-sizing:border-box;',
  'font:var(--stmw-fs)/1.2 -apple-system,BlinkMacSystemFont,"Segoe UI","Microsoft YaHei",sans-serif;color:var(--stmw-fg)}',
  '@media (pointer:coarse){#extensionsMenu .stmw{--stmw-px:12px;--stmw-gap:10px;--stmw-ico:18px;',
  '--stmw-fs:14px;--stmw-fs-state:11px;--stmw-row-hub:48px;--stmw-row:46px;--stmw-radius:10px;--stmw-group-gap:4px}}',
  '#extensionsMenu .stmw-hub,#extensionsMenu .stmw-item{appearance:none;-webkit-appearance:none;box-sizing:border-box;',
  'display:flex!important;align-items:center!important;gap:var(--stmw-gap)!important;width:100%;margin:0;',
  'min-height:var(--stmw-row)!important;padding:0 var(--stmw-px)!important;line-height:1.2!important;',
  'opacity:1!important;cursor:pointer!important;border:0;border-radius:var(--stmw-radius);background:transparent;',
  'color:var(--stmw-fg);font:inherit;font-size:var(--stmw-fs)!important;text-align:left;',
  '-webkit-tap-highlight-color:transparent;touch-action:manipulation;transition:background .12s ease}',
  '#extensionsMenu .stmw-hub{min-height:var(--stmw-row-hub)!important;font-weight:600}',
  '#extensionsMenu .stmw-hub:hover,#extensionsMenu .stmw-item:hover{background:var(--stmw-hover)}',
  '#extensionsMenu .stmw-hub:active,#extensionsMenu .stmw-item:active{background:rgba(255,255,255,.11)}',
  '#extensionsMenu .stmw-ico{flex:0 0 var(--stmw-ico);width:var(--stmw-ico);height:var(--stmw-ico);display:grid;',
  'place-items:center;color:var(--stmw-mut)}',
  '#extensionsMenu .stmw-hub .stmw-ico{color:var(--stmw-act)}',
  '#extensionsMenu .stmw-ico svg{width:100%;height:100%;display:block}',
  '#extensionsMenu .stmw-name{flex:1 1 auto;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}',
  '#extensionsMenu .stmw-state{flex:0 0 auto;display:inline-flex;align-items:center;gap:4px;',
  'font-size:var(--stmw-fs-state);color:var(--stmw-mut);font-variant-numeric:tabular-nums}',
  '#extensionsMenu .stmw-state::before{content:"";width:6px;height:6px;border-radius:50%;background:currentColor}',
  '#extensionsMenu .stmw-state[data-state="ok"]{color:var(--stmw-ok)}',
  '#extensionsMenu .stmw-state[data-state="warn"]{color:var(--stmw-warn)}',
  '#extensionsMenu .stmw-arrow{flex:0 0 12px;width:12px;height:12px;color:var(--stmw-mut);display:grid;place-items:center}',
  '#extensionsMenu .stmw-arrow svg{width:12px;height:12px;transition:transform .16s ease}',
  '#extensionsMenu .stmw[data-open="1"] .stmw-arrow svg{transform:rotate(90deg)}',
  '#extensionsMenu .stmw-sub{position:relative;display:flex;flex-direction:column;gap:var(--stmw-group-gap);padding:2px 0 4px}',
  '#extensionsMenu .stmw-sub[hidden]{display:none!important}',
  '#extensionsMenu .stmw-sub .stmw-item{padding-left:var(--stmw-indent)!important;',
  'font-size:calc(var(--stmw-fs) - 1px)!important;font-weight:400;color:#c9d1d9}',
  '#extensionsMenu .stmw-t{flex:1 1 auto;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}',
  '#extensionsMenu .stmw-d{margin-left:auto;font-size:10px;opacity:.55;white-space:nowrap}',
  '#extensionsMenu{overscroll-behavior:contain}',
  '#ar6-sendbtn{order:3;display:flex;align-items:center;justify-content:center;width:28px;height:28px;margin:0 2px;',
  'border-radius:8px;cursor:pointer;opacity:.75;color:#58a6ff}',
  '#ar6-sendbtn .stmw-ico{width:18px;height:18px;display:grid;place-items:center}',
  '#ar6-sendbtn svg{width:18px;height:18px}',
  '#ar6-wand-sheet .stmw-ico{color:#58a6ff}',
  '@media (prefers-reduced-motion:reduce){#extensionsMenu .stmw-arrow svg{transition:none}}'
].join('\\n');

function ensureWandStyle() {
  var d = wandDoc(); if (!d || !d.head) return;
  if (d.getElementById('ar6-wand-style')) return;
  var st = d.createElement('style');
  st.id = 'ar6-wand-style';
  st.textContent = WAND_CSS;
  d.head.appendChild(st);
}
`;

w = w.replace("function wandDoc() {", CSS + "\nfunction wandDoc() {");
w = w.replace("  var menu = wandMenuEl();\n  if (!menu) { wandFallback(); wandWatchBoot(); return false; }",
  "  ensureWandStyle();\n  var menu = wandMenuEl();\n  if (!menu) { wandFallback(); wandWatchBoot(); return false; }");
w = w.replace("  [WAND_ID, WAND_SENDBTN, WAND_SHEET].forEach(function (id) {",
  "  var st = d.getElementById('ar6-wand-style');\n  if (st && st.parentNode) st.parentNode.removeChild(st);\n  [WAND_ID, WAND_SENDBTN, WAND_SHEET].forEach(function (id) {");
fs.writeFileSync(W, w);
console.log('wand patched:', w.indexOf('WAND_CSS') >= 0, w.indexOf('ensureWandStyle') >= 0);

const B = path.join(__dirname, '..', 'build_v8.mjs');
let b = fs.readFileSync(B, 'utf8');
b = b.replace("const PARTS = [\n  '11_wand.js','1_core.js', '2_refract.js', '5_route.js', '6_float.js', '7_jail.js', '8_probe.js', '3_net.js', '9_card.js',\n  '10_help.js', '4_ui.js'];",
  "const PARTS = ['1_core.js', '2_refract.js', '5_route.js', '6_float.js', '7_jail.js', '8_probe.js', '3_net.js', '9_card.js',\n  '10_help.js', '11_wand.js', '4_ui.js'];");
fs.writeFileSync(B, b);
console.log('parts:', b.match(/const PARTS = \[[^\]]*\]/)[0].replace(/\n/g, ' '));
