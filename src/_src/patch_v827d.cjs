/* patch_v827d.cjs — 记住的位置在窄屏会把面板顶出可视区：改成按当前面板宽度夹取 */
const fs = require('fs');
const path = require('path');
function rep(file, anchor, next) {
  const p = path.join(__dirname, file);
  let s = fs.readFileSync(p, 'utf8');
  const n = s.split(anchor).length - 1;
  if (n !== 1) throw new Error('count=' + n + ' :: ' + anchor.slice(0, 50));
  fs.writeFileSync(p, s.split(anchor).join(next));
}

rep('4_ui.js',
  "    var lx = cfg.mx, ly = cfg.my;\n" +
  "    if (typeof lx === 'number' && typeof ly === 'number') {\n" +
  "      var ww = (HOST.innerWidth || 360), hh = (HOST.innerHeight || 640);\n" +
  "      if (lx > ww - 40 || ly > hh - 60 || lx < -20 || ly < -20) { lx = null; ly = null; }\n" +
  "    }",
  "    var lx = cfg.mx, ly = cfg.my;\n" +
  "    if (typeof lx === 'number' && typeof ly === 'number') {\n" +
  "      var ww = (HOST.innerWidth || 360), hh = (HOST.innerHeight || 640);\n" +
  "      /* 面板实际宽/高：按视口和 62vh 上限估，再把记忆坐标夹回可视区 */\n" +
  "      var pw = Math.min(Math.round(ww * 0.92), 380);\n" +
  "      var ph = Math.min(Math.round(hh * 0.62), hh - 24);\n" +
  "      if (!isFinite(lx) || !isFinite(ly) || lx < -20 || ly < -20 || lx > ww - 40 || ly > hh - 60) { lx = null; ly = null; }\n" +
  "      else {\n" +
  "        lx = Math.max(6, Math.min(lx, ww - pw - 6));\n" +
  "        ly = Math.max(6, Math.min(ly, hh - ph - 6));\n" +
  "      }\n" +
  "    }");

rep('4_ui.js',
  "  return 'position:fixed;right:16px;bottom:18px;z-index:2147483000;width:440px;max-width:calc(100vw - 32px);' +\n" +
  "    'max-height:min(78vh,820px);overflow-y:auto;overflow-x:auto;scrollbar-width:thin;' +\n" +
  "    'left:' + (cfg.mx == null ? '' : (cfg.mx + 'px;')) + 'top:' + (cfg.my == null ? '' : (cfg.my + 'px;'));",
  "  var dw = (HOST.innerWidth || 1280);\n" +
  "  var wPx = Math.min(440, dw - 32);\n" +
  "  var hPx = Math.min(Math.round((HOST.innerHeight || 800) * 0.78), 820);\n" +
  "  var dx = cfg.mx, dy = cfg.my;\n" +
  "  if (typeof dx === 'number' && typeof dy === 'number' && isFinite(dx) && isFinite(dy)) {\n" +
  "    dx = Math.max(8, Math.min(dx, dw - wPx - 8));\n" +
  "    dy = Math.max(8, Math.min(dy, (HOST.innerHeight || 800) - hPx - 8));\n" +
  "  }\n" +
  "  return 'position:fixed;right:16px;bottom:18px;z-index:2147483000;width:' + wPx + 'px;max-width:calc(100vw - 32px);' +\n" +
  "    'max-height:min(78vh,820px);overflow-y:auto;overflow-x:auto;scrollbar-width:thin;' +\n" +
  "    (typeof dx === 'number' ? ('left:' + Math.round(dx) + 'px;right:auto;') : '') +\n" +
  "    (typeof dy === 'number' ? ('top:' + Math.round(dy) + 'px;bottom:auto;') : '');");

console.log('patched v8.27 clamp');
