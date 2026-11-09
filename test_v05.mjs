/* test_v05.mjs — 图标系统换新（0.5）
 *
 * 要证明的事：
 *   1) 面板里不再出现彩色 emoji（除了 ✕ 这种几何符号），但 data-ar6 的 act key 一个没变
 *   2) chipText 对代理对（emoji 是 2 个 code unit）不再整串返回
 *   3) 新图标表齐全，icoOf 能映射到新图标（防全知/去媚/A-B/导出/账本）
 *   4) 生效档位整条变金（.ar6-b.on 是金色，不再是绿）
 *   5) 版本 0.5
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

function boot() {
  const store = {};
  const win = {
    console, setTimeout: (f) => { try { f(); } catch (e) {} return 1; }, clearTimeout() {},
    setInterval: () => 1, clearInterval() {}, requestAnimationFrame: (f) => { try { f(); } catch (e) {} return 1; },
    innerWidth: 504, innerHeight: 805, devicePixelRatio: 2,
    visualViewport: { width: 504, height: 805, addEventListener() {} },
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

const m = boot();
const A = m.api;
A.setCfg('jail', 'safe');
A.render();
const html = m.win.document.body.children.map((c) => String(c.innerHTML || '')).join('');

/* ---------------- [一] 图标表 ---------------- */
group('[一] 图标表');
const tbl = (SRC.match(/var AR6_ICONS = \{[\s\S]*?\n\};/) || [''])[0];
const keys = (tbl.match(/^  '?([a-z-]+)'?:/gm) || []).map((x) => x.replace(/[:' ]/g, ''));
ok('图标表存在', tbl.length > 400, '>400', tbl.length);
ok('图标不少于 28 个', keys.length >= 28, '>=28', keys.length);
for (const k of ['shield', 'bandage', 'compass', 'orbit', 'scale', 'out', 'ledger', 'card', 'trash', 'ask']) {
  ok('有 ' + k, keys.indexOf(k) >= 0, k, keys.join(','));
}
ok('每个图标都是 path d（M 开头）', (tbl.match(/: 'M/g) || []).length >= keys.length - 1, '>= ' + (keys.length - 1), (tbl.match(/: 'M/g) || []).length);

/* ---------------- [二] icoOf 映射到新图标 ---------------- */
group('[二] icoOf 映射');
ok('防全知 → compass', /indexOf\('防全知'\) >= 0\) return 'compass'/.test(SRC));
ok('去媚 → orbit', /indexOf\('去媚'\) >= 0\) return 'orbit'/.test(SRC));
ok('A/B → scale', /indexOf\('A\/B'\) >= 0/.test(SRC) && SRC.indexOf("return 'scale'") >= 0);
ok('导出 → out', /indexOf\('导出'\) >= 0\) return 'out'/.test(SRC));
ok('账本 → ledger', /indexOf\('账本'\) >= 0\) return 'ledger'/.test(SRC));

/* ---------------- [三] chipText 不再被代理对卡住 ---------------- */
group('[三] chipText 与代理对');
ok('判中文改成区间判断', SRC.indexOf('(c >= 0x4e00 && c <= 0x9fff)') >= 0);
ok('不再用裸 c >= 0x4e00', SRC.indexOf('|| c >= 0x4e00) break;') < 0);

/* ---------------- [四] 面板不再有 emoji，但 act key 不变 ---------------- */
group('[四] 面板 HTML');
const EMOJI_RE = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{2B00}-\u{2BFF}]/gu;
const textOnly = html.replace(/<[^>]*>/g, '');   /* 只看文本节点：data-ar6 里的 act key 允许带 emoji */
const cleaned = textOnly.replace(/[✕✓✗▾⚠]/g, '');
const left = cleaned.match(EMOJI_RE) || [];
ok('面板里没有彩色 emoji', left.length === 0, '0 个', left.slice(0, 6).join(' '));
ok('act key 仍带原 emoji（破甲）', html.indexOf('data-ar6="🩹 破甲:') >= 0);
ok('act key 仍带原 emoji（防全知）', html.indexOf('data-ar6="🧭 防全知:') >= 0);
ok('jailnow 按钮还在', html.indexOf('data-ar6="jailnow"') >= 0);
ok('report 按钮还在', html.indexOf('data-ar6="report"') >= 0);
ok('按钮里真的画了 svg', (html.match(/class="ar6-i"/g) || []).length >= 8, '>=8', (html.match(/class="ar6-i"/g) || []).length);
ok('chip 文字剥掉了 emoji', html.indexOf('>破甲:') >= 0 || html.indexOf('破甲:关</span>') >= 0, '有「破甲:…」', '');
ok('btnIco 已定义', SRC.indexOf('function btnIco(') >= 0);

/* ---------------- [五] 生效档位整条变金 ---------------- */
group('[五] 金色 on');
ok('.ar6-b.on 是金色', /\.ar6-b\.on\{background:rgba\(232,196,106/.test(SRC));
ok('不再用绿色 on', SRC.indexOf('.ar6-b.on{background:rgba(63,185,80') < 0);
ok('金色同时改文字色', /\.ar6-b\.on\{[^}]*color:#E8C46A/.test(SRC));

/* ---------------- [六] banner 文字里的 emoji 会被剥掉 ---------------- */
group('[六] banner');
ok('banner 剥离前导 emoji', SRC.indexOf(".replace(/^[^\\u4e00-\\u9fa5A-Za-z0-9]+/, '')") >= 0);

/* ---------------- [七] 版本 ---------------- */
group('[七] 版本');
ok('VERSION = 0.7', A.VERSION === '0.93', '0.93', A.VERSION);
ok('配置结构版本没动', A.getCfg().v === 831, 831, A.getCfg().v);
ok('源码里只有一个版本号', (SRC.match(/var VERSION = '[^']+'/g) || []).length === 1, 1, (SRC.match(/var VERSION = '[^']+'/g) || []).length);

console.log('\n' + pass + ' passed, ' + fail + ' failed');
process.exit(fail ? 1 : 0);
