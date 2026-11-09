/* fix_build83.cjs — build_v8.mjs 在上一级目录 */
const fs = require('fs');
const path = require('path');
const F = path.join(__dirname, '..', 'build_v8.mjs');
let s = fs.readFileSync(F, 'utf8');
if (s.indexOf("'11_wand.js'") < 0) {
  s = s.replace('const PARTS = [', "const PARTS = [\n  '11_wand.js',");
}
s = s.split('8.2.0').join('8.3.0');
fs.writeFileSync(F, s);
console.log('build patched; has wand:', s.indexOf('11_wand') >= 0, '; ver 8.3:', s.indexOf('8.3.0') >= 0);
