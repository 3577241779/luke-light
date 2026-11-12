/* test_v830.mjs — V1.1 面板几何回归：唯一写入口 / 遮罩+卡片 CSS / 自愈
 *
 * V1.1 把浮窗改成全屏遮罩 + 居中卡片：#ar6-root 是 position:fixed + width:100vw 的
 * 遮罩，里面放 width:min(520px,calc(100vw - 24px))、max-height:min(740px,92vh) 的 .ar6-p 卡片；
 * 高度不再写 el.style.height，改由 fitPanel 给 .ar6-p 写 max-height。
 * 关闭走 ✕ / 点遮罩 / Esc，头部没有 min/max 角标。
 *
 * 这份测试锁四件事：
 *   ① 几何只有一个写入口 fitPanel，重开路径不再整条覆盖 style；
 *   ② 遮罩 + 卡片 CSS 链能把可用高度传给 .ar6-body 自己滚；
 *   ③ 关闭路径符合新形态（✕ / 点遮罩 / Esc，收起态 data-min 隐藏）；
 *   ④ 自愈与版本。
 *
 * 跑法：node test_v830.mjs
 */
import fs from 'node:fs';
import path from 'node:path';

const ROOT = 'C:/Users/23548/Documents/deepseek-harness/default-workspace/_antiroute/v8';
const D = fs.readFileSync(path.join(ROOT, 'antiroute-v8-desktop.js'), 'utf8');
const M = fs.readFileSync(path.join(ROOT, 'antiroute-v8-mobile.js'), 'utf8');
const ui = fs.readFileSync(path.join(ROOT, '_src', '4_ui.js'), 'utf8');
const core = fs.readFileSync(path.join(ROOT, '_src', '1_core.js'), 'utf8');

let pass = 0, fail = 0; const fails = [];
const ok = (n, c, x) => {
  if (c) { pass++; console.log('  ok   ' + n); }
  else { fail++; fails.push(n); console.log('  FAIL ' + n + (x ? ' :: ' + x : '')); }
};
const group = (t) => console.log('\n' + t);

/* ============ 一、几何只有一个写入口 ============ */
group('[一] 几何只有一个写入口：fitPanel 写 .ar6-p 的 max-height');
ok('4_ui.js 里写 .ar6-p max-height 只有 fitPanel 一处',
  (ui.match(/box\.style\.maxHeight = maxH \+ 'px'/g) || []).length === 1,
  'count=' + (ui.match(/box\.style\.maxHeight/g) || []).length);
ok('浮窗时代的 el.style.height 已彻底清空',
  (ui.match(/el\.style\.height/g) || []).length === 0);
const wandAt = ui.indexOf('function openPanelFromWand');
const wandBody = wandAt < 0 ? '' : ui.slice(wandAt, wandAt + 1600);
ok('openPanelFromWand 存在', wandAt >= 0);
ok('openPanelFromWand 末尾补了 fitPanel',
  wandBody.includes('fitPanel(r)'), wandBody.slice(0, 60));
ok('openPanelFromWand 自己不再 setAttribute(\'style\')',
  !/\.setAttribute\('style'/.test(wandBody));
ok('fitPanel 按 92% 视口算可用高度', ui.includes('Math.round(vv * 0.92)'));
ok('fitPanel 上限 740px', ui.includes('if (maxH > 740) maxH = 740;'));
ok('fitPanel 下限 260px', ui.includes('if (maxH < 260) maxH = 260;'));
ok('fitPanel 把高度写给 .ar6-p（不再写给根节点）',
  ui.includes("box.style.maxHeight = maxH + 'px'") &&
  ui.includes("el.querySelector('.ar6-p')"));

/* ============ 二、遮罩 + 卡片 CSS ============ */
group('[二] CSS：全屏遮罩 → 居中卡片 → body 自己滚');
ok('遮罩钉在视口（fixed + 100vw + 视口高度）', ui.includes('position:fixed;left:0;top:0;right:auto;bottom:auto;width:100vw;') && ui.includes('height:var(--TH-viewport-height,100vh)'));
ok('遮罩 flex 居中（justify-content:center）', ui.includes('display:flex;justify-content:center;'));
ok('卡片限宽 min(520px,calc(100vw - 24px))', ui.includes('width:min(520px,calc(100vw - 24px))'));
ok('卡片高度自适应、上限 min(740px,92vh)',
  ui.includes('height:auto') && ui.includes('max-height:min(740px,92vh)'));
ok('卡片不再被写死 height:100%',
  !/\.ar6-p\{display:flex;flex-direction:column;height:100%/.test(M));
ok('.ar6-body 零基弹性（basis=0 才有有界高度）', M.includes('flex:1 1 0'));
ok('.ar6-body 纵向滚动、锁横向', M.includes('overflow-y:auto;overflow-x:hidden'));
ok('.ar6-tw 不再变成双轴滚动容器', M.includes('.ar6-tw{overflow-x:auto;overflow-y:hidden'));
ok('body 底部加安全区', M.includes('env(safe-area-inset-bottom,0px)'));
ok('老的 62vh/72vh 写死高度已清空', !ui.includes('62vh') && !ui.includes('72vh'));
ok('移动端卡片圆角 14px', M.includes('#ar6-root.ar6-mobile .ar6-p{border-radius:14px'));

/* ============ 三、新形态关闭路径 ============ */
group('[三] 关闭走 ✕ / 点遮罩 / Esc，头部无 min/max 角标');
ok('✕ 关闭按钮带 data-ar6="close"',
  /class="ar6-x ar6-mx" data-ar6="close"/.test(M));
ok('头部没有 min/max 角标',
  !/data-ar6="min"/.test(M) && !/data-ar6="max"/.test(M));
ok('点遮罩关闭以 .ar6-p 为界',
  ui.includes("querySelector('.ar6-p')") && ui.includes('box.contains(t)'));
ok('Esc 关闭', ui.includes("k === 'Escape' || k === 'Esc' || k === 27"));
ok('收起态打 data-min 并清空内容',
  ui.includes("r.setAttribute('data-min', '1')") && ui.includes("r.innerHTML = ''"));

/* ============ 四、自愈路径 ============ */
group('[四] 自愈：0×0 / 越界坐标会被发现并复位');
ok('verifyVisible 判 0×0 与越界坐标',
  ui.includes('b.width < 12') && ui.includes('b.top < -5000') && ui.includes('b.left < -5000'));
ok('verifyVisible 重建 panelStyle 复位',
  ui.includes("el.setAttribute('style', panelStyle(mode, false))"));
ok('scheduleReflow 重算高度（转屏/键盘）', ui.includes('fitPanel(el); } catch (eRF)'));
ok('提供 ar6Diag 一行体检', ui.includes('function ar6Diag()'));
ok('导出 diag', M.includes('diag: ar6Diag'));
ok('导出 fitPanel', M.includes('fitPanel: fitPanel'));
ok('导出 openPanelFromWand（真机/探针可复现重开路径）',
  M.includes('openPanelFromWand: openPanelFromWand'));
ok('diag 会报 fit=no', ui.includes("'|fit=' + (vv && b.bottom <= vv + 2 ? 'yes' : 'NO')"));

/* ============ 五、版本 ============ */
group('[五] 版本 0.101 / cfg.v = 831');
ok('桌面 VERSION 与源码一致', /var VERSION = '1\.1';/.test(D));
ok('移动 VERSION 与源码一致', /var VERSION = '1\.1';/.test(M));
ok('1_core 里 v: 831', /\bv: 831,/.test(core));
ok('迁移判断用 831', core.includes('if (s.v !== 831)'));
ok('默认值写 831', core.includes('d.v = 831'));
ok('没有 8.29.0 残留', !D.includes("VERSION = '8.29.0'") && !M.includes("VERSION = '8.29.0'"));

console.log('\n=== v8.30 面板几何回归：' + pass + ' passed, ' + fail + ' failed ===');
if (fail) { console.log('失败项：'); for (const f of fails) console.log(' - ' + f); process.exit(1); }
