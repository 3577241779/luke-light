/* fix_hidden2.cjs — 清掉残留的 hidden 分支与注释 */
const fs = require('fs');
const path = require('path');
function rep(f, a, b) {
  const p = path.join(__dirname, f);
  let s = fs.readFileSync(p, 'utf8');
  if (s.indexOf(a) < 0) { console.log('  miss ' + f + ': ' + a.slice(0, 30)); return; }
  fs.writeFileSync(p, s.split(a).join(b));
  console.log('  ok   ' + f);
}
rep('1_core.js', "/* dock=吸边半隐藏 | float=常驻 | hidden=彻底隐藏 */", "/* dock=吸边半隐藏 | float=常驻 | tuck=贴边把手 */");
rep('4_ui.js', "    if (minimized && String(cfg.floatMode || '') === 'hidden') return;\n", "");
