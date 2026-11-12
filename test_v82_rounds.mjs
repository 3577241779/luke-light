/* test_v82_rounds.mjs — v8.2 补轮：提示条优先级 / 双包同构 */
import fs from 'fs';
import vm from 'vm';
import path from 'path';

const ROOT = path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1'));
const SRC = fs.readFileSync(path.join(ROOT, 'antiroute-v8-desktop.js'), 'utf8');
const MOB = fs.readFileSync(path.join(ROOT, 'antiroute-v8-mobile.js'), 'utf8');

let pass = 0, fail = 0;
const ok = (n, c, e) => { if (c) { pass++; console.log('  ok   ' + n); } else { fail++; console.log('  FAIL ' + n + (e ? ' — ' + e : '')); } };

function boot(src) {
  const env = { timeouts: [], handlers: {} };
  const byId = new Map();
  function el(tag) {
    return {
      tagName: (tag || 'div').toUpperCase(), className: '', id: '', style: {}, children: [], innerHTML: '',
      __attr: {},
      getAttribute(k) { return Object.prototype.hasOwnProperty.call(this.__attr, k) ? this.__attr[k] : null; },
      setAttribute(k, v) { this.__attr[k] = String(v); },
      removeAttribute(k) { delete this.__attr[k]; },
      appendChild(c) { c.parentNode = this; this.children.push(c); return c; },
      removeChild(c) { const i = this.children.indexOf(c); if (i >= 0) this.children.splice(i, 1); },
      addEventListener() {}, querySelector() { return null; }, querySelectorAll() { return []; },
      contains() { return false; },
      getBoundingClientRect() { return { left: 10, top: 10, width: 190, height: 176, right: 200, bottom: 186 }; }
    };
  }
  const doc = {
    head: el('head'), body: el('body'), documentElement: el('html'), createElement: el,
    getElementById(id) { for (const c of doc.body.children) if (c.id === id) return c; return null; },
    querySelector() { return null; }, querySelectorAll() { return []; }, addEventListener() {}
  };
  const store = new Map();
  const win = {
    document: doc, innerWidth: 390, innerHeight: 844, visualViewport: null,
    localStorage: { getItem: (k) => (store.has(k) ? store.get(k) : null), setItem: (k, v) => store.set(k, String(v)), removeItem: (k) => store.delete(k) },
    console: { log() {}, warn() {}, error() {} },
    navigator: { userAgent: 'Mozilla/5.0 (Linux; Android 13) Mobile' },
    setTimeout: (fn, ms) => { env.timeouts.push({ fn, ms }); return env.timeouts.length; },
    clearTimeout() {}, setInterval: () => 1, clearInterval() {},
    requestAnimationFrame: (fn) => { env.timeouts.push({ fn, ms: 16 }); return 1; },
    addEventListener() {}, removeEventListener() {},
    fetch: () => Promise.resolve({ ok: true, status: 200, headers: { get: () => '' } }),
    XMLHttpRequest: function () {}, Promise, Math, JSON, String, Number, Object, Array, RegExp, Error,
    TextDecoder: globalThis.TextDecoder,
    eventOn: (n, fn) => { env.handlers[n] = fn; return function () {}; },
    getButtonEvent: (n) => ({ key: n }),
    Date: (function () { const D = function () {}; D.now = () => 5000; D.parse = Date.parse; D.UTC = Date.UTC; return D; })()
  };
  win.window = win; win.self = win; win.globalThis = win; win.top = win; win.parent = win;
  vm.runInContext(src, vm.createContext(win), { filename: 'ar82.js' });
  return { api: win.__AR6__, doc };
}

const A = boot(SRC).api;



/* R8：提示条优先级 —— bad 打断 ok，ok 不打断 bad */
const E = boot(SRC);
E.api.banner('先一条成功', 'ok');
let n1 = E.doc.getElementById('ar6-bn2');
const k1 = n1 && n1.getAttribute('data-kind');
E.api.banner('再来一条成功', 'ok');
let n2 = E.doc.getElementById('ar6-bn2');
ok('R8a 首次提示条写入', k1 === 'ok', String(k1));
ok('R8b 同级 1.6s 内不重复覆盖', n1 === n2);
E.api.banner('错误', 'bad');
const n3 = E.doc.getElementById('ar6-bn2');
ok('R8c 高优先级可以打断', n3 && n3.getAttribute('data-kind') === 'bad', n3 && n3.getAttribute('data-kind'));


/* R10：桌面/手机包除 UI_MODE 与包名外应同构 */
function strip(s) {
  return s.replace("var UI_MODE = 'desktop';", "var UI_MODE = 'X';").replace("var UI_MODE = 'mobile';", "var UI_MODE = 'X';")
    .replace(/Anti-Route_V8\.2\.0_[^']*/g, 'NAME');
}
ok('R10 双包除模式/名外同构', strip(SRC) === strip(MOB), 'len ' + strip(SRC).length + ' vs ' + strip(MOB).length);

console.log('\n合计：' + pass + ' 通过 / ' + fail + ' 失败');
process.exit(fail ? 1 : 0);
