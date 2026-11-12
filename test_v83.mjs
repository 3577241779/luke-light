/* test_v83.mjs — 静态断言：魔法棒接线 + 安全清理（V1.1 已去悬浮球修复段） */
import fs from 'fs';
import path from 'path';
const ROOT = path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1'));
const D = fs.readFileSync(path.join(ROOT, 'antiroute-v8-desktop.js'), 'utf8');
const M = fs.readFileSync(path.join(ROOT, 'antiroute-v8-mobile.js'), 'utf8');
const pieces = {};
for (const f of ['1_core.js','4_ui.js','11_wand.js']) pieces[f] = fs.readFileSync(path.join(ROOT,'_src',f),'utf8');

let pass = 0, fail = 0;
const ok = (n, c, e) => { c ? (pass++, console.log('  ok   ' + n)) : (fail++, console.log('  FAIL ' + n + (e ? ' — ' + e : ''))); };

ok('版本 0.4', /var VERSION = '1.1';/.test(D));
ok('配置版本 831', /\bv: 831,/.test(pieces['1_core.js']));


/* 安全 */
ok('renderTable chars 转义', /esc\(String\(Math\.round\(Number\(r\.chars\)/.test(pieces['4_ui.js']));
ok('renderTable edits 转义', /esc\(String\(Math\.round\(Number\(r\.edits\)\)\)/.test(pieces['4_ui.js']));
ok('面板不再收 API Key（V1.1 起删除）', !/data-ar6="key"/.test(pieces['4_ui.js']));
ok('dispose 清 bn2/style/BTN', /'ar6-bn2'/.test(pieces['4_ui.js']) && /BTN_BOUND = \{\}; BTN_OK = 0;/.test(pieces['4_ui.js']));
ok('dispose 卸载魔法棒', /unmountWandEntry/.test(pieces['4_ui.js']));

/* 魔法棒 */
ok('boot 挂魔法棒', /mountWandEntry\(\)/.test(pieces['4_ui.js']));
ok('挂载点 #extensionsMenu', /#extensionsMenu/.test(pieces['11_wand.js']));
ok('幂等：先删后建', pieces['11_wand.js'].indexOf('getElementById(WAND_ID)') < pieces['11_wand.js'].indexOf('insertBefore(box'));
ok('Hub 拦冒泡', /ev\.stopPropagation\(\)/.test(pieces['11_wand.js']));
ok('单行入口（不再有子菜单）', /data-ar6-wand-open/.test(pieces['11_wand.js']) && !/data-ar6-wand-act/.test(pieces['11_wand.js']));
ok('关菜单用按钮 click', /b\.click\(\)/.test(pieces['11_wand.js']));
ok('不新增第 9 个按钮', !/key: 'wand'/.test(pieces['4_ui.js']) && /var BTN_TOTAL = 8;/.test(pieces['4_ui.js']));
ok('魔法棒不用用户值拼 innerHTML', !/innerHTML\s*=\s*[^;]*cfg\./.test(pieces['11_wand.js']));
ok('收起态完全隐藏', /style\.display = 'none'/.test(pieces['4_ui.js']));
ok('头部只有 ✕ 关闭、没有拖拽圆点', /class="ar6-x ar6-mx" data-ar6="close"/.test(D) && !/ar6-hb/.test(D));
ok('观察器只观察 body 直接子节点', /observe\(d\.body, \{ childList: true \}\)/.test(pieces['11_wand.js']));
ok('有降级入口', /ar6-sendbtn/.test(pieces['11_wand.js']));
ok('双侧同构（除模式/名）', (() => {
  const strip = s => s.replace("var UI_MODE = 'desktop';", "var UI_MODE = 'X';").replace("var UI_MODE = 'mobile';", "var UI_MODE = 'X';").replace(/Anti-Route_V8\.3\.0_[^']*/g, 'NAME');
  return strip(D) === strip(M);
})());

console.log('\n合计：' + pass + ' 通过 / ' + fail + ' 失败');
process.exit(fail ? 1 : 0);
