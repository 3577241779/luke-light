/* fix_hidden83.cjs — 删掉「彻底隐藏」选项（8.2 已承诺移除），旧值继续迁移成 tuck */
const fs = require('fs');
const path = require('path');
const F = path.join(__dirname, '6_float.js');
let s = fs.readFileSync(F, 'utf8');
const a = "  var modes = [['dock', '吸边半隐藏'], ['float', '常驻悬浮球'], ['hidden', '彻底隐藏（用工具栏按钮打开）']];";
const b = "  var modes = [['dock', '吸边半隐藏'], ['float', '常驻悬浮球'], ['tuck', '贴边把手（最省位置）']];";
if (s.indexOf(a) < 0) { console.log('anchor missing'); process.exit(1); }
s = s.replace(a, b);
fs.writeFileSync(F, s);
console.log('hidden option replaced');
