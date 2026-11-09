/* patch_ui8b.cjs — 悬浮球与头部排版（v8） */
const fs = require('fs');
const path = require('path');
const D = __dirname;
function rep(f, a, b) {
  const p = path.join(D, f);
  const s = fs.readFileSync(p, 'utf8');
  const n = s.split(a).length - 1;
  if (n !== 1) throw new Error(f + ' anchor ' + n + ' :: ' + a.slice(0, 50));
  fs.writeFileSync(p, s.replace(a, function () { return b; }), 'utf8');
  console.log('patched ' + f);
}

/* 悬浮球：深色玻璃 + 状态色描边 + 微光 */
rep('6_float.js',
  `  return 'width:' + n + 'px;height:' + n + 'px;min-width:' + n + 'px;min-height:' + n + 'px;' +
    'padding:0!important;border-radius:' + shape + ';background:' + esc(cfg.floatBg || '#ffffff') + ';' +
    'border:' + (cfg.floatBorder ? '1px solid #cbd5e1' : 'none') + ';' +
    'box-shadow:' + (cfg.floatShadow ? '0 4px 14px rgba(0,0,0,.2)' : 'none') + ';' +
    'opacity:' + op + ';touch-action:none;user-select:none;-webkit-user-select:none;overflow:hidden;' +
    'display:flex;align-items:center;justify-content:center;position:fixed;z-index:2147483000;right:8px;bottom:calc(72px + env(safe-area-inset-bottom));cursor:grab;' +
    'transition:opacity .2s,transform .24s;';`,
  `  var tint = floatTint();
  return 'width:' + n + 'px;height:' + n + 'px;min-width:' + n + 'px;min-height:' + n + 'px;' +
    'padding:0!important;border-radius:' + shape + ';background:' + esc(cfg.floatBg || '#0d1117') + ';' +
    'border:1px solid ' + (cfg.floatBorder ? tint.line : 'transparent') + ';' +
    'box-shadow:' + (cfg.floatShadow ? ('0 10px 26px rgba(0,0,0,.45),0 0 0 4px ' + tint.halo) : 'none') + ';' +
    'opacity:' + op + ';touch-action:none;user-select:none;-webkit-user-select:none;overflow:hidden;' +
    'display:flex;align-items:center;justify-content:center;position:fixed;z-index:2147483000;right:8px;bottom:calc(72px + env(safe-area-inset-bottom));cursor:grab;' +
    'transition:opacity .2s,transform .24s,box-shadow .25s;';`);

rep('6_float.js', 'function floatStyle() {', `function floatTint() {
  var code = 'gray';
  try { if (typeof kpi === 'function') { var k = kpi(); code = k.bad > 0 ? 'bad' : (k.warn > 0 ? 'warn' : 'ok'); } } catch (e) {}
  if (code === 'bad') return { line: 'rgba(248,81,73,.55)', halo: 'rgba(248,81,73,.16)' };
  if (code === 'warn') return { line: 'rgba(210,153,34,.5)', halo: 'rgba(210,153,34,.14)' };
  return { line: 'rgba(88,166,255,.45)', halo: 'rgba(88,166,255,.14)' };
}

function floatStyle() {`);
