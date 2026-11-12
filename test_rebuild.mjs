/* test_rebuild.mjs — 「重建基线」入口 + 「清空」两清（源码级守护）
   跑法：node test_rebuild.mjs
   这两个动作都绑在 DOM 委托上，离线难模拟点击；这里钉住源码里的关键结构，
   防止以后重构时把「两次确认」「同时清基线」「说明页文案」悄悄弄丢。 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const UI = fs.readFileSync(path.join(HERE, '_src', '4_ui.js'), 'utf8');
const HELP = fs.readFileSync(path.join(HERE, '_src', '10_help.js'), 'utf8');
const CORE = fs.readFileSync(path.join(HERE, '_src', '1_core.js'), 'utf8');
const VER = (String(CORE).match(/var VERSION = '([^']+)'/) || [])[1] || '';

let pass = 0, fail = 0;
function ok(name, cond, expect, actual) {
  if (cond) { pass++; console.log('  ✓ ' + name); return; }
  fail++; console.log('  ✗ ' + name);
  if (expect !== undefined) { console.log('      期望: ' + String(expect)); console.log('      实际: ' + String(actual).slice(0, 200)); }
}
function group(t) { console.log('\n【' + t + '】'); }

group('A. 按钮存在');

ok('状态条上有「重建基线」按钮', UI.indexOf("btnIco('rebuild', 'refresh', '重建基线')") >= 0);
ok('图标表里有 refresh', /refresh\s*:/.test(UI));
ok('分派里有 rebuild 分支', UI.indexOf("act === 'rebuild'") >= 0);

group('B. 「清空」同时清账本与两条基线');

const clearStart = UI.indexOf("if (act === 'clear')");
const clearEnd = UI.indexOf("if (act === 'rebuild')");
const clearBlock = clearStart >= 0 && clearEnd > clearStart ? UI.slice(clearStart, clearEnd) : '';

ok('clear 分支存在', clearBlock.length > 0);
ok('清 LOG_KEY（账本）', clearBlock.indexOf('LOG_KEY') >= 0);
ok('清 BASE_KEY（手感基线）', clearBlock.indexOf('BASE_KEY') >= 0);
ok('清 SHAPE_KEY（返回格式基线）', clearBlock.indexOf('SHAPE_KEY') >= 0);
ok('提示语说清楚了两样都清', clearBlock.indexOf('账本与基线都清空了') >= 0);

group('C. 「重建基线」要点两次');

const rStart = UI.indexOf("if (act === 'rebuild')");
const rEnd = UI.indexOf("if (act === 'selftoggle')");
const rBlock = rStart >= 0 && rEnd > rStart ? UI.slice(rStart, rEnd) : '';

ok('rebuild 分支存在', rBlock.length > 0);
ok('有防误触时间戳 REBUILD_AT', rBlock.indexOf('REBUILD_AT') >= 0);
ok('5 秒窗口', rBlock.indexOf('5000') >= 0);

const firstReturn = rBlock.indexOf('return;');
const firstRemove = rBlock.indexOf('removeItem');
ok('第一次点击只提醒、不删数据', firstReturn >= 0 && firstRemove > firstReturn, 'return 在 removeItem 之前', 'return@' + firstReturn + ' remove@' + firstRemove);
ok('第二次才清 BASE_KEY', rBlock.slice(rBlock.indexOf('REBUILD_AT = 0')).indexOf('BASE_KEY') >= 0);
ok('第二次才清 SHAPE_KEY', rBlock.slice(rBlock.indexOf('REBUILD_AT = 0')).indexOf('SHAPE_KEY') >= 0);
ok('清完把窗口复位', rBlock.indexOf('REBUILD_AT = 0') >= 0);

group('D. 说明页写清楚了');

ok('说明页提到「重建基线」', HELP.indexOf('重建基线') >= 0);
/* v1.1：说明页重写后不再讲「一起清掉」「点两次」的细节（行为仍由 B/C 段直接断言），
   改成校验它把这两个入口摆在了哪里 —— 删掉这两句即红。 */
ok('说明页「数据」行列了清空与重建基线', HELP.indexOf('「数据」里有：导出记录、说明、清空、重建基线。') >= 0);
ok('说明页把重建基线指到「更多」', HELP.indexOf('点「更多 → 重建基线」') >= 0);

group('E. 版本');

ok('VERSION 与源码一致', /var VERSION = '/.test(CORE) && CORE.indexOf("'" + VER + "'") >= 0, 'VERSION ' + VER, CORE.match(/var VERSION = '[^']+';/));

console.log('\n通过 ' + pass + ' 条，失败 ' + fail + ' 条');
if (fail > 0) process.exit(1);
