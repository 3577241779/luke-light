/* test_noself.mjs —— 「脚本表里没认出自己 / 认出两条」的判定 */
import fs from 'node:fs';
import vm from 'node:vm';

const TARGET = 'C:/Users/23548/Documents/deepseek-harness/default-workspace/_antiroute/v8/antiroute-v8-desktop.js';
const SRC = fs.readFileSync(TARGET, 'utf8');
const VER = (String(SRC).match(/var VERSION = '([^']+)'/) || [])[1] || '';

let pass = 0, fail = 0;
function ok(name, cond, expect, actual) {
  if (cond) { pass++; console.log('  ✓ ' + name); }
  else { fail++; console.log('  ✗ ' + name + '\n      期望：' + expect + '\n      实际：' + actual); }
}

function mkEl() {
  const el = {
    tagName: 'DIV', id: '', className: '', textContent: '', style: {}, children: [], parentNode: null,
    appendChild(c) { el.children.push(c); return c; },
    removeChild(c) { const i = el.children.indexOf(c); if (i >= 0) el.children.splice(i, 1); return c; },
    insertBefore(c) { el.children.unshift(c); return c; },
    setAttribute() {}, getAttribute() { return null; }, removeAttribute() {},
    addEventListener() {}, removeEventListener() {},
    querySelector() { return null; }, querySelectorAll() { return []; },
    classList: { contains: () => false, add: () => {}, remove: () => {}, toggle() {} },
    getBoundingClientRect() { return { width: 400, height: 300, top: 0, left: 0 }; },
    focus() {}, blur() {}, click() {}, closest() { return null; }, contains() { return false; },
    getContext: () => null
  };
  let html = '';
  Object.defineProperty(el, 'innerHTML', { get: () => html, set: (v) => { html = String(v == null ? '' : v); } });
  return el;
}

const store = {};
const DOC = {
  body: mkEl(), head: mkEl(), documentElement: mkEl(),
  readyState: 'complete', hidden: false,
  createElement: () => mkEl(), createTextNode: () => ({}),
  getElementById: () => null, querySelector: () => null, querySelectorAll: () => [],
  addEventListener() {}, removeEventListener() {}, cookie: ''
};

const HOST = {
  document: DOC, location: { href: 'http://127.0.0.1:8000/', hostname: '127.0.0.1' },
  localStorage: {
    getItem: (k) => (Object.prototype.hasOwnProperty.call(store, k) ? store[k] : null),
    setItem: (k, v) => { store[k] = String(v); },
    removeItem: (k) => { delete store[k]; }
  },
  setTimeout: (fn) => { setImmediate(fn); return {}; },
  clearTimeout() {},
  addEventListener() {}, removeEventListener() {}, fetch: () => Promise.resolve({ ok: true, status: 200, text: () => Promise.resolve('') })
};
HOST.window = HOST; HOST.top = HOST; HOST.parent = HOST;

const ctx = vm.createContext({
  console, JSON, Math, Date, String, Number, Boolean, Array, Object, RegExp, Error, Promise,
  isFinite, isNaN, parseInt, parseFloat, encodeURIComponent, decodeURIComponent,
  setTimeout, clearTimeout, setInterval, clearInterval, setImmediate,
  document: DOC, window: HOST, navigator: { userAgent: 'node' }, location: HOST.location
});
ctx.globalThis = ctx;
vm.runInContext(SRC, ctx, { filename: 'antiroute-v8-desktop.js' });

const API = (function () {
  const cands = [ctx, ctx.__AR6__, ctx.AR6];
  for (const c of cands) { if (c && typeof c.updSelfIndex === 'function') return c; }
  return null;
})();
if (!API) { console.log('✗ 拿不到导出'); process.exit(1); }
const U = API;

const body = (v) => "/* 卢克之光 */\nvar VERSION = '" + v + "';\nvar X = 'ar6.cfg';\n";

/* 1. 名字认不出、版本对得上 → 认出来（手动粘贴那条） */
let list = [
  { name: '别的插件', content: 'var foo = 1;' },
  { name: '新脚本', content: body(VER) }
];
ok('1 名字认不出、版本对得上 → 认出来', U.updSelfIndex(list) === 1, 1, U.updSelfIndex(list));

/* 2. 完全无关 → 认不出 */
list = [{ name: '别的插件', content: 'var foo = 1;' }];
ok('2 表里没有它 → -1', U.updSelfIndex(list) === -1, -1, U.updSelfIndex(list));

/* 3. 双装（桌面 + TT）→ 桌面这条赢 */
const d = { name: '卢克之光 V' + VER + '·桌面版', content: body(VER), enabled: true };
const m = { name: '卢克之光 V' + VER + '·TT酒馆适配', content: body(VER), enabled: true };
list = [m, d];
ok('3 双装时认桌面那条', U.updSelfIndex(list) === 1, 1, U.updSelfIndex(list));

/* 4. 两条一模一样 → 判不出，返回 -1 且原因是 tie */
list = [
  { name: '卢克之光 V' + VER + '·桌面版', content: body(VER) },
  { name: '卢克之光 V' + VER + '·桌面版', content: body(VER) }
];
const r4 = U.updSelfIndex(list);
ok('4 两条并列 → -1', r4 === -1, -1, r4);

/* 5. 停用的那条不选 */
list = [
  { name: '卢克之光 V' + VER + '·桌面版', content: body(VER), enabled: false },
  { name: '卢克之光 V' + VER + '·桌面版', content: body(VER), enabled: true }
];
ok('5 enabled=false 不被选中', U.updSelfIndex(list) === 1, 1, U.updSelfIndex(list));

/* 6. 空表 */
ok('6 空表 → -1', U.updSelfIndex([]) === -1, -1, U.updSelfIndex([]));
ok('7 null 不抛', U.updSelfIndex(null) === -1, -1, U.updSelfIndex(null));

console.log('\n通过 ' + pass + ' 条，失败 ' + fail + ' 条');
process.exit(fail ? 1 : 0);
