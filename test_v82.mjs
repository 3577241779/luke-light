/* test_v82.mjs — 静态：1×1 隐藏退场 / 工具栏入口 / 提示条 v2 / 图标（V1.1 去悬浮球段） */
import fs from 'fs';
import vm from 'vm';
import path from 'path';

const ROOT = path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1'));
const SRC = fs.readFileSync(path.join(ROOT, 'antiroute-v8-desktop.js'), 'utf8');

let pass = 0, fail = 0;
const ok = (n, c, e) => { if (c) { pass++; console.log('  ok   ' + n); } else { fail++; console.log('  FAIL ' + n + (e ? ' — ' + e : '')); } };

/* ---------- 沙箱（比 v8.1 更小，够用即可） ---------- */
function makeEnv() {
  const env = { timeouts: [], intervals: [], handlers: {} };
  const byId = new Map();
  function el(tag) {
    const e = {
      tagName: (tag || 'div').toUpperCase(), className: '', id: '', style: {}, children: [],
      innerHTML: '', clientHeight: 0, scrollHeight: 0, scrollTop: 0,
      __attr: {},
      getAttribute(k) { return Object.prototype.hasOwnProperty.call(this.__attr, k) ? this.__attr[k] : null; },
      setAttribute(k, v) { this.__attr[k] = String(v); },
      removeAttribute(k) { delete this.__attr[k]; },
      appendChild(c) { c.parentNode = this; this.children.push(c); return c; },
      removeChild(c) { const i = this.children.indexOf(c); if (i >= 0) this.children.splice(i, 1); },
      addEventListener() {}, querySelector() { return null; }, querySelectorAll() { return []; },
      contains() { return false; },
      getBoundingClientRect() { return { left: 12, top: 100, width: 380, height: 420, right: 392, bottom: 520 }; }
    };
    return e;
  }
  const doc = {
    head: el('head'), body: el('body'), documentElement: el('html'),
    createElement: el,
    getElementById(id) {
      if (byId.has(id)) { const c = byId.get(id); if (doc.body.children.indexOf(c) >= 0) return c; byId.delete(id); }
      for (const c of doc.body.children) if (c.id === id) { byId.set(id, c); return c; }
      return null;
    },
    querySelector() { return null; }, querySelectorAll() { return []; }, addEventListener() {}
  };
  const store = new Map();
  const win = {
    document: doc,
    innerWidth: 390, innerHeight: 844, visualViewport: null,
    localStorage: {
      getItem: (k) => (store.has(k) ? store.get(k) : null),
      setItem: (k, v) => { store.set(k, String(v)); },
      removeItem: (k) => { store.delete(k); }
    },
    console: { log() {}, warn() {}, error() {} },
    navigator: { userAgent: 'Mozilla/5.0 (Linux; Android 13) Mobile' },
    setTimeout: (fn, ms) => { env.timeouts.push({ fn, ms }); return env.timeouts.length; },
    clearTimeout() {},
    setInterval: (fn) => { env.intervals.push(fn); return env.intervals.length; },
    clearInterval() {},
    requestAnimationFrame: (fn) => { env.timeouts.push({ fn, ms: 16 }); return 1; },
    addEventListener() {}, removeEventListener() {},
    fetch: () => Promise.resolve({ ok: true, status: 200, headers: { get: () => '' } }),
    XMLHttpRequest: function () {}, Promise, Math, JSON, String, Number, Object, Array, RegExp, Error,
    TextDecoder: globalThis.TextDecoder,
    eventOn: (n, fn) => { env.handlers[n] = fn; return function () {}; },
    getButtonEvent: (n) => ({ key: n }),
    Date: (function () { const D = function () {}; D.now = () => 1000; D.parse = Date.parse; D.UTC = Date.UTC; return D; })()
  };
  win.window = win; win.self = win; win.globalThis = win; win.top = win; win.parent = win;
  vm.runInContext(SRC, vm.createContext(win), { filename: 'ar8.js' });
  env.api = win.__AR6__; env.doc = doc;
  return env;
}

const env = makeEnv();
const A = env.api;

/* ---------- 1. 静态：没有 1×1 透明隐藏 ---------- */
ok('没有 1×1 透明隐藏', SRC.indexOf('width:1px;height:1px;overflow:hidden') < 0);
ok('工具栏只剩 1 个动作', (SRC.match(/key: '(selftest|toggle|refract|jail|idprobe|card|unhide|clear|panel)'/g) || []).length === 1);


/* ---------- 5. 提示条 v2 ---------- */
A.banner('测试提示', 'bad');
const bn = env.doc.getElementById('ar6-bn2');
ok('提示条用新节点', !!bn);
ok('提示条带 kind', bn && bn.getAttribute && bn.getAttribute('data-kind') === 'bad');
ok('提示条带 role=alert', bn && bn.getAttribute && bn.getAttribute('role') === 'alert');
const bnCss = SRC.split('\n').filter(l => l.indexOf('#ar6-bn2') >= 0).join('\n');
ok('提示条无 backdrop-filter', bnCss.length > 0 && bnCss.indexOf('backdrop-filter') < 0);

/* ---------- 6. 图标 ---------- */
ok('有内联 SVG 图标', SRC.indexOf('<svg class="ar6-i"') >= 0);
/* v0.76：chip 多了第三个可选参数 extra（给反 OOC 的子 chip 挂 data-off），
   data-ar6 仍用原始 label —— 断言放宽成「第三参可有可无」，判据不变。 */
ok('chip 保留 data-ar6 原键', /function chip\(label, on(?:, extra)?\)[\s\S]{0,260}data-ar6="' \+ esc\(String\(label\)\)/.test(SRC));
ok('去掉前导 emoji 的显示文案', SRC.indexOf('function chipText') >= 0);

console.log('\n合计：' + pass + ' 通过 / ' + fail + ' 失败');
process.exit(fail ? 1 : 0);
