/* patch_v85b.cjs — 剩余两项：头部流光下划；魔法棒行与 ST 菜单项同款 */
const fs = require('fs');
const path = require('path');
const S = (f) => path.join(__dirname, f);
let n = 0;
function rep(file, anchor, next) {
  const p = S(file);
  let s = fs.readFileSync(p, 'utf8');
  const c = s.split(anchor).length - 1;
  if (c !== 1) { console.log('  MISS(' + c + ') ' + file + ' :: ' + anchor.slice(0, 46)); return false; }
  fs.writeFileSync(p, s.replace(anchor, next));
  n++; console.log('  ok ' + file + ' #' + n); return true;
}

const AR_H = "  '.ar6-h{display:flex;align-items:center;gap:8px;padding:11px 14px;background:linear-gradient(180deg,rgba(255,255,255,.055),rgba(255,255,255,0));border-bottom:1px solid var(--ar-line);}',";
const AR_H_NEW = [
  "  '.ar6-h{position:relative;display:flex;align-items:center;gap:8px;padding:11px 14px;background:linear-gradient(96deg,rgba(88,166,255,.16),rgba(88,166,255,.02) 52%,transparent 78%);border-bottom:1px solid var(--ar-line);}',",
  "  '.ar6-h::after{content:\"\";position:absolute;left:8px;right:8px;bottom:-1px;height:1px;background:linear-gradient(90deg,transparent,#58a6ff66,transparent);animation:ar6flow 6.5s linear infinite}',",
  "  '@keyframes ar6flow{0%{opacity:.2;transform:translateX(-24%)}50%{opacity:.9}100%{opacity:.2;transform:translateX(24%)}}',"
].join('\n');
rep('4_ui.js', AR_H, AR_H_NEW);

rep('11_wand.js',
  "  'padding:8px 10px;border:1px solid rgba(255,255,255,.10);border-radius:9px;cursor:pointer;',",
  "  'padding:0 10px;height:32px;border:0;border-radius:7px;cursor:pointer;',");
rep('11_wand.js',
  "  'background:#161b22;color:#e6edf3;font:600 13px/1.2 -apple-system,BlinkMacSystemFont,\"Segoe UI\",\"Microsoft YaHei\",sans-serif;',",
  "  'background:transparent;color:inherit;font:400 13.5px/1.2 -apple-system,BlinkMacSystemFont,\"Segoe UI\",\"Microsoft YaHei\",sans-serif;',");
rep('11_wand.js', "  '#ar6-wand .ar6-wb:hover{background:#1c2230;border-color:rgba(88,166,255,.45)}',", "  '#ar6-wand .ar6-wb:hover{background:rgba(255,255,255,.07)}',");
rep('11_wand.js', "  '#ar6-wand .ar6-wb:active{background:#222a38}',", "  '#ar6-wand .ar6-wb:active{background:rgba(255,255,255,.11)}',");
rep('11_wand.js', "  '#ar6-wand .ar6-wi{flex:0 0 16px;width:16px;height:16px;display:grid;place-items:center;color:#58a6ff}',", "  '#ar6-wand .ar6-wi{flex:0 0 20px;width:20px;height:20px;display:grid;place-items:center;opacity:.92}',");
rep('11_wand.js', "  '#ar6-wand .ar6-wi svg{width:16px;height:16px;display:block}',", "  '#ar6-wand .ar6-wi svg{width:20px;height:20px;display:block}',");
rep('11_wand.js', "  '#ar6-wand .ar6-ws{flex:0 0 auto;font-size:10.5px;font-weight:400;color:#8b949e}',", "  '#ar6-wand .ar6-ws{flex:0 0 auto;font-size:11px;font-weight:400;color:#7d8590}',");
rep('11_wand.js', "  '@media (pointer:coarse){#ar6-wand .ar6-wb{padding:12px 12px;font-size:14px}}',", "  '@media (pointer:coarse){#ar6-wand .ar6-wb{height:44px;font-size:15px}}',");

const bp = S('../build_v8.mjs');
let bs = fs.readFileSync(bp, 'utf8');
if (bs.indexOf('8.5.0') < 0) { fs.writeFileSync(bp, bs.split('8.4.0').join('8.5.0')); console.log('  ok build 8.5.0'); }

console.log('\n共 ' + n + ' 处');
