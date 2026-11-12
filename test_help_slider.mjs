/* test_help_slider.mjs — 说明页手机端横向滑块守护
 * 只读 `_src/10_help.js` 源码做结构比对（不依赖构建产物：另一条轨道没重新 build 时不至于误红）。
 * 覆盖 6 条硬要求 + 本轮回归点（行程下限、重复绑定幂等）。
 */
import fs from 'node:fs';

const TARGET = process.argv[2] ||
  'C:/Users/23548/Documents/deepseek-harness/default-workspace/_antiroute/v8/_src/10_help.js';
const SRC = fs.readFileSync(TARGET, 'utf8');

let pass = 0, fail = 0;
function ok(n, c, e) { if (c) { pass++; console.log('  ok   ' + n); } else { fail++; console.log('  FAIL ' + n + (e ? ' — ' + e : '')); } }
function sliceFrom(mark, len) { const i = SRC.indexOf(mark); return i < 0 ? '' : SRC.slice(i, i + (len || 320)); }

console.log('\n[一] 页签条横向可滚');
const tabsRule = sliceFrom('#ar6-card .ar6h-tabs{', 300);
ok('.ar6h-tabs 规则含 overflow-x:auto|scroll', /overflow-x\s*:\s*(auto|scroll)/.test(tabsRule), tabsRule.slice(0, 90));
ok('含 -webkit-overflow-scrolling:touch', tabsRule.indexOf('-webkit-overflow-scrolling:touch') >= 0);

console.log('\n[二] 滑块 DOM 与位置');
/* 必须是一行真的语句（行首 h += ...）：被 // 注释掉后这里就不该再匹配 */
const BAR_LINE = /^[ \t]*h \+= '<div class="ar6h-hbar"><div class="ar6h-hthumb"><\/div><\/div>';[ \t]*$/m;
const mBar = BAR_LINE.exec(SRC);
ok('源码里有一行真的拼出滑块 DOM', !!mBar, '未找到 h += ar6h-hbar 这一行');
const iTabs = SRC.indexOf('<div class="ar6h-tabs">');
ok('滑块 DOM 拼在 tabs 之后', !!mBar && iTabs >= 0 && mBar.index > iTabs,
  'tabs@' + iTabs + ' bar@' + (mBar ? mBar.index : -1));

console.log('\n[三] 绑定与调用');
ok('helpBindHBar 有定义', /function\s+helpBindHBar\s*\(/.test(SRC));
const iOpen = SRC.indexOf('function openHelp(');
ok('openHelp 里调用 helpBindHBar', iOpen >= 0 && SRC.indexOf('helpBindHBar(node)', iOpen) > iOpen);

console.log('\n[四] CSS 细节');
const hideRule = sliceFrom('#ar6-card .ar6h-hbar[data-none="1"]', 260);
ok('data-none="1" 隐藏规则含 display:none', /display\s*:\s*none/.test(hideRule), hideRule.slice(0, 90));
const thumbRule = sliceFrom('#ar6-card .ar6h-hthumb{', 240);
ok('.ar6h-hthumb 有 min-width', /min-width\s*:\s*\d+px/.test(thumbRule), thumbRule.slice(0, 90));

console.log('\n[五] 拖动换算下限');
ok('拖动分母 Math.max(4, tw0-ww0)', /Math\.max\(\s*4\s*,\s*tw0\s*-\s*ww0\s*\)/.test(SRC));
ok('行程 travel<4 时置 data-none', /if\s*\(\s*travel\s*<\s*4\s*\)/.test(SRC));
ok('重复绑定有 __ar6HBarBound 幂等标记', /__ar6HBarBound/.test(SRC));

console.log('\n' + pass + ' passed, ' + fail + ' failed');
process.exit(fail ? 1 : 0);
