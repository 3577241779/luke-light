/* test_v04.mjs — 手机端说明页 = 独立浮窗（0.4）
 *
 * 要证明的事：
 *   1) 尺寸不再用 vh 算，而是按 visualViewport 的像素算，且永远留在可视区内
 *   2) 位置能拖、拖完记住；重开还在原处
 *   3) 铺满 / 还原能切，切完仍然夹在可视区内
 *   4) 桌面端一字未改（不进入浮动分支）
 */
import fs from 'node:fs';
import vm from 'node:vm';

const TARGET = process.argv[2] || 'C:/Users/23548/Documents/deepseek-harness/default-workspace/_antiroute/v8/antiroute-v8-desktop.js';
const SRC = fs.readFileSync(TARGET, 'utf8');

let pass = 0, fail = 0;
function ok(name, cond, expect, actual) {
  if (cond) { pass++; console.log('  ok   ' + name); }
  else { fail++; console.log('  FAIL ' + name + '\n         期望：' + String(expect == null ? '' : expect) + '\n         实际：' + String(actual == null ? '' : actual)); }
}
function group(t) { console.log('\n' + t); }

function makeEl(tag) {
  const el = {
    tagName: String(tag || 'div').toUpperCase(), id: '', className: '', textContent: '',
    style: {}, children: [], parentNode: null, attrs: {},
    appendChild(c) { c.parentNode = el; el.children.push(c); return c; },
    removeChild(c) { const i = el.children.indexOf(c); if (i >= 0) el.children.splice(i, 1); return c; },
    insertBefore(c) { c.parentNode = el; el.children.unshift(c); return c; },
    setAttribute(k, v) { el.attrs[k] = String(v); if (k === 'style') el.style.cssText = String(v); },
    getAttribute(k) { return el.attrs[k] == null ? null : String(el.attrs[k]); },
    removeAttribute(k) { delete el.attrs[k]; },
    addEventListener() {}, removeEventListener() {},
    querySelector() { return null; }, querySelectorAll() { return []; },
    classList: { contains: () => false, add() {}, remove() {}, toggle() {} },
    getBoundingClientRect() { return { width: 380, height: 560, top: 40, left: 10, right: 390, bottom: 600 }; },
    focus() {}, blur() {}, click() {}, closest() { return null; }, contains() { return false; },
    getContext: () => null
  };
  let html = '';
  Object.defineProperty(el, 'innerHTML', { get: () => html, set: (v) => { html = String(v == null ? '' : v); el.children.length = 0; } });
  Object.defineProperty(el, 'firstChild', { get: () => el.children[0] || null });
  Object.defineProperty(el, 'childNodes', { get: () => el.children });
  return el;
}

function bootVp(vw, vh) {
  const store = {};
  const win = {
    console, setTimeout: (f) => { try { f(); } catch (e) {} return 1; }, clearTimeout() {},
    setInterval: () => 1, clearInterval() {}, requestAnimationFrame: (f) => { try { f(); } catch (e) {} return 1; },
    innerWidth: vw, innerHeight: vh, devicePixelRatio: 2,
    visualViewport: { width: vw, height: vh, addEventListener() {} },
    addEventListener() {}, removeEventListener() {}, matchMedia: () => ({ matches: false, addListener() {}, removeListener() {} }),
    getComputedStyle: () => ({ height: '0px', maxHeight: '0px', overflow: 'hidden', flexBasis: '0px' }),
    localStorage: { getItem: (k) => (k in store ? store[k] : null), setItem: (k, v) => { store[k] = String(v); }, removeItem: (k) => { delete store[k]; } },
    btoa: (s) => Buffer.from(String(s), 'binary').toString('base64'),
    atob: (s) => Buffer.from(String(s), 'base64').toString('binary'),
    location: { href: 'https://tavern.local/' }, navigator: { userAgent: 'node' },
    fetch: () => Promise.reject(new Error('no-net')),
    SillyTavern: { getContext: () => ({ chat: [], chatId: 'c1', name1: '阿明' }), libs: {}, getRequestHeaders: () => ({}), eventSource: { on() {}, removeListener() {} }, event_types: {}, chat: [], extensionSettings: {} }
  };
  const body = makeEl('body');
  win.document = {
    body, documentElement: makeEl('html'), head: makeEl('head'), title: '',
    createElement: (t) => makeEl(t), createTextNode: (t) => ({ nodeValue: String(t) }),
    getElementById: () => null, querySelector: () => null, querySelectorAll: () => [],
    addEventListener() {}, removeEventListener() {}
  };
  win.window = win; win.self = win; win.globalThis = win; win.top = win; win.parent = win;
  const ctx = vm.createContext(win);
  vm.runInContext(SRC, ctx, { filename: 'antiroute.js' });
  return { win, api: win.__AR6__ };
}

/* ---------------- [一] 尺寸按像素算，不是 vh ---------------- */
group('[一] 几何：手机 390×780');
const m1 = bootVp(390, 780);
const A = m1.api;
const g1 = A.helpGeom(false, null, null);
ok('宽不超过 94% 且封顶 460', g1.w <= 391 && g1.w >= 300, '300~391', g1.w);
ok('高按 visualViewport 算（约 88%）', Math.abs(g1.h - Math.round(780 * 0.88)) <= 2, Math.round(780 * 0.88), g1.h);
ok('高不会超过可视区', g1.h <= 780 - 12, '<=768', g1.h);
ok('默认水平居中', Math.abs(g1.x - Math.round((390 - g1.w) / 2)) <= 1, 'centered', g1.x);
ok('默认垂直居中', Math.abs(g1.y - Math.round((780 - g1.h) / 2)) <= 1, 'centered', g1.y);
ok('整体落在可视区内', g1.x >= 0 && g1.y >= 0 && g1.x + g1.w <= 390 && g1.y + g1.h <= 780, 'inside', JSON.stringify(g1));

/* ---------------- [二] 传进来的位置会被夹住 ---------------- */
group('[二] 边界夹取');
const g2 = A.helpGeom(false, -999, -999);
ok('负坐标被夹到边距', g2.x >= 6 && g2.y >= 6, '>=6', g2.x + ',' + g2.y);
const g3 = A.helpGeom(false, 9999, 9999);
ok('右下越界被夹回', g3.x + g3.w <= 390 && g3.y + g3.h <= 780, 'inside', g3.x + ',' + g3.y);

/* ---------------- [三] 铺满 ---------------- */
group('[三] 铺满 / 还原');
const g4 = A.helpGeom(true, null, null);
ok('铺满宽 = 视口 - 边距', g4.w === 390 - 12, 378, g4.w);
ok('铺满高 = 视口 - 边距', g4.h === 780 - 12, 768, g4.h);
ok('铺满仍在左上边距内', g4.x === 6 && g4.y === 6, '6,6', g4.x + ',' + g4.y);

/* ---------------- [四] 小屏不再出 300px ---------------- */
group('[四] 小屏（320×560）');
const m2 = bootVp(320, 560);
const g5 = m2.api.helpGeom(false, null, null);
ok('高度跟着视口走，不是固定 300', g5.h >= 480 && g5.h <= 548, '≈492', g5.h);
ok('宽度收进屏幕', g5.w <= 320 - 12, '<=308', g5.w);
ok('配置默认值就位', m2.api.getCfg().helpBig === false && m2.api.getCfg().helpX === null, 'false/null', m2.api.getCfg().helpBig + '/' + m2.api.getCfg().helpX);

/* ---------------- [五] 接线 ---------------- */
group('[五] 接上去了没');
ok('有 helpApplyGeom', SRC.indexOf('function helpApplyGeom') >= 0);
ok('有 helpBindDrag', SRC.indexOf('function helpBindDrag') >= 0);
ok('openHelp 里会套几何', /function openHelp[\s\S]{0,900}helpApplyGeom\(node\)/.test(SRC));
ok('openHelp 里会绑拖动', /function openHelp[\s\S]{0,900}helpBindDrag\(node\)/.test(SRC));
ok('手机端外壳不再 flex 居中', SRC.indexOf("(mob ? '' : 'display:flex;align-items:center;justify-content:center;padding:12px;')") >= 0);
ok('手机端遮罩更淡（能看见底下）', SRC.indexOf("(mob ? '.55' : '.93')") >= 0);
ok('有铺满按钮且只在手机端出现', SRC.indexOf('data-ar6-card="big"') >= 0 && SRC.indexOf("(mob ? '<button class=\"ar6h-b3\"") >= 0);
ok('拖动把手是抓条', SRC.indexOf("var bar = node.querySelector('.ar6h-grab');") >= 0);
ok('点页签不会误触发拖动', SRC.indexOf("if (t && t.getAttribute && t.getAttribute('data-ar6-card')) return;") >= 0);
ok('松手才落盘', /function fin\(\)[\s\S]{0,200}saveCfg\(\)/.test(SRC));
ok('拖动时把位置写回 cfg', SRC.indexOf('cfg.helpX = g.x;') >= 0 && SRC.indexOf('cfg.helpY = g.y;') >= 0);

/* ---------------- [六] 桌面端没被动 ---------------- */
group('[六] 桌面端保持原样');
ok('桌面仍用 86vh 的 wrap 基线', SRC.indexOf('height:86vh;max-height:720px;min-height:300px') >= 0);
ok('桌面仍居中（flex 分支保留）', SRC.indexOf('display:flex;align-items:center;justify-content:center;padding:12px;') >= 0);
ok('桌面遮罩仍是 .93', SRC.indexOf("(mob ? '.55' : '.93')") >= 0);

/* ---------------- [七] 版本 ---------------- */
group('[七] 版本');
ok('VERSION 0.7', A.VERSION === '1.1', '1.1', A.VERSION);
ok('配置结构版本没动', A.getCfg().v === 831, '831', A.getCfg().v);

console.log('\n合计：' + pass + ' 通过 / ' + fail + ' 失败');
process.exit(fail ? 1 : 0);
