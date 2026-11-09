/* patch_v85c.cjs — 面板可见性升级：左侧状态光条 + 外发光 + 分区标题图标底座 */
const fs = require('fs');
const path = require('path');
const S = (f) => path.join(__dirname, f);
function rep(file, anchor, next) {
  const p = S(file); let s = fs.readFileSync(p, 'utf8');
  const c = s.split(anchor).length - 1;
  if (c !== 1) { console.log('  MISS(' + c + ') ' + file); return; }
  fs.writeFileSync(p, s.replace(anchor, next)); console.log('  ok ' + file);
}

rep('4_ui.js', "  '.ar6-h::after{",
`  '.ar6-p{position:relative;overflow:hidden}',
  '.ar6-p::before{content:"";position:absolute;left:0;top:0;bottom:0;width:3px;',
  'background:linear-gradient(180deg,#58a6ff,#3fb95000);opacity:.9;pointer-events:none}',
  '#ar6-root[data-st="bad"] .ar6-p::before{background:linear-gradient(180deg,#f85149,#f8514900)}',
  '#ar6-root[data-st="warn"] .ar6-p::before{background:linear-gradient(180deg,#d29922,#d2992200)}',
  '#ar6-root[data-st="ok"] .ar6-p::before{background:linear-gradient(180deg,#3fb950,#3fb95000)}',
  '.ar6-p::after{content:"";position:absolute;inset:0;pointer-events:none;border-radius:inherit;',
  'box-shadow:inset 0 1px 0 rgba(255,255,255,.06),inset 0 0 42px rgba(88,166,255,.05)}',
  '.ar6-sec{display:flex;align-items:center;gap:6px}',
  '.ar6-sec::before{content:"";width:3px;height:12px;border-radius:2px;background:linear-gradient(180deg,#58a6ff,#1f6feb)}',
  '.ar6-h::after{`);

const bp = S('../build_v8.mjs');
let bs = fs.readFileSync(bp, 'utf8');
if (bs.indexOf('8.5.0') < 0) { fs.writeFileSync(bp, bs.split('8.4.0').join('8.5.0')); }
console.log('done');
