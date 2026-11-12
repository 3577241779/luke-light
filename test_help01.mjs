/* test_help01.mjs — 说明页 v0.1 重排验收（卢克之光）
   盯的是「别再说旧话」和「新东西真的写进来了」两件事。 */
import fs from 'node:fs';
import vm from 'node:vm';

const TARGET = process.argv[2] || 'C:/Users/23548/Documents/deepseek-harness/default-workspace/_antiroute/v8/antiroute-v8-desktop.js';
const SRC = fs.readFileSync(TARGET, 'utf8');

let pass = 0, fail = 0;
function ok(n, c, e) { if (c) { pass++; console.log('  ok   ' + n); } else { fail++; console.log('  FAIL ' + n + (e ? ' — ' + e : '')); } }

function el(tag) {
  return {
    tagName: String(tag || 'div').toUpperCase(), id: '', innerHTML: '', textContent: '', value: '', style: {},
    children: [], parentNode: null,
    appendChild(c) { c.parentNode = this; this.children.push(c); return c; },
    removeChild(c) { const i = this.children.indexOf(c); if (i >= 0) this.children.splice(i, 1); return c; },
    setAttribute(k, v) { if (k === 'style') this.style.cssText = String(v); else this[k] = v; },
    getAttribute(k) { return this[k] == null ? null : String(this[k]); },
    addEventListener() {}, removeEventListener() {}, select() {},
    querySelector() { return null; }, querySelectorAll() { return []; },
    classList: { add() {}, remove() {}, toggle() {}, contains() { return false; } },
    getBoundingClientRect() { return { width: 420, height: 320, top: 10, left: 10, right: 430, bottom: 330 }; },
    get firstChild() { if (this._fcUsed) return null; this._fcUsed = true;
      if (!this._fc) { const m = /id="([^"]+)"/.exec(String(this.innerHTML || '')); this._fc = el('div'); if (m) this._fc.id = m[1]; }
      return this._fc; }
  };
}

const env = { t: 1762332000000 };
const doc = {
  head: el('head'), body: el('body'), documentElement: el('html'),
  createElement: (t) => el(t),
  getElementById() { return null; }, querySelector() { return null; }, querySelectorAll() { return []; },
  addEventListener() {}, execCommand() { return true; }
};
const store = new Map();
const chat = [];
const win = {
  document: doc,
  localStorage: {
    getItem: (k) => (store.has(k) ? store.get(k) : null),
    setItem: (k, v) => { store.set(k, String(v)); }, removeItem: (k) => { store.delete(k); }
  },
  console, navigator: { userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' },
  innerWidth: 1440, matchMedia: () => ({ matches: false }),
  addEventListener() {}, removeEventListener() {},
  setTimeout: () => 0, clearTimeout() {}, setInterval: () => 0, clearInterval() {},
  fetch: () => Promise.resolve({ status: 200, ok: true }),
  XMLHttpRequest: function () {},
  SillyTavern: { getContext: () => ({ chat }) },
  Promise, Math, JSON, String, Number, Object, Array, RegExp, Error,
  TextDecoder: globalThis.TextDecoder,
  eventOn: (n, f) => { return function () {}; }, getButtonEvent: (n) => ({ key: n }),
  Date: (function () { const D = function () {}; D.now = () => env.t; D.parse = Date.parse; D.UTC = Date.UTC; return D; })()
};
win.window = win; win.self = win; win.globalThis = win; win.top = win; win.parent = win;
vm.runInContext(SRC, vm.createContext(win), { filename: 'ar7.js' });
const api = win.__AR6__;

const ALL = ['how', 'map', 'narr', 'jail', 'read', 'faq', 'trunc'].map((k) => api.helpHTML(k)).join('\n');
const TXT = ['how', 'map', 'narr', 'jail', 'read', 'faq', 'trunc'].map((k) => api.helpText(k)).join('\n');

console.log('\n[一] 页签结构');
const tabs = [...api.helpHTML('how').matchAll(/data-tab="([a-z]+)"/g)].map((m) => m[1]);
ok('页签恰好 7 个', tabs.length === 7, String(tabs.length));
ok('七个 key 齐全', ['how', 'map', 'narr', 'jail', 'read', 'faq', 'trunc'].every((k) => tabs.indexOf(k) >= 0), tabs.join(','));
ok('工具栏页已删除', tabs.indexOf('bar') < 0 && ALL.indexOf('工具栏 7 个') < 0);

console.log('\n[二] 旧说法清干净了');
ok('不再说「同工具栏」', ALL.indexOf('同工具栏') < 0);
ok('不再写悬浮球', ALL.indexOf('悬浮球') < 0);
ok('不再写「按钮 0/7」', ALL.indexOf('按钮 0/7') < 0);
ok('没有「预览」按钮了', ALL.indexOf('data-ar6="narr"') < 0);
  ok('占位符已删干净', ALL.indexOf('AR6-HELP-TRUNC-PENDING') < 0);
ok('不再说「最多补 1/2 次」', ALL.indexOf('最多补 2 次') < 0 && ALL.indexOf('最多补 1 次') < 0 && api.helpHTML('trunc').indexOf('一轮只补一次') >= 0);

console.log('\n[三] 新内容写进来了');
ok('叙述层覆盖防全知/去媚/轻/强', ALL.indexOf('防全知') >= 0 && ALL.indexOf('去媚') >= 0 && ALL.indexOf('轻') >= 0 && ALL.indexOf('强') >= 0);
ok('说了魔法棒这条活路', ALL.indexOf('魔法棒') >= 0);
ok('说了两个包怎么处理', ALL.indexOf('装了两个') >= 0);
ok('FAQ 至少 12 条正文', (api.HELP_PAGES.faq || []).reduce((n, s) => n + (s.l ? s.l.length : 0), 0) >= 12);
ok('按钮页说了「想改哪一项」', api.helpHTML('map').indexOf('想改哪一项') >= 0);
ok('手机上半截问题进了 FAQ', api.helpHTML('faq').indexOf('露半截') >= 0);

console.log('\n[四] 版面结构');
ok('有设计令牌 --hbg', ALL.indexOf('--hbg:') >= 0);
ok('小节有左侧色条类', ALL.indexOf('.ar6h-sec{') >= 0 && ALL.indexOf('border-left:3px solid') >= 0);
ok('固定高 + 内滚', ALL.indexOf('height:86vh') >= 0 && ALL.indexOf('flex:1 1 0') >= 0 && ALL.indexOf('overflow-y:auto') >= 0);
ok('有搜索框与可搜文本', ALL.indexOf('id="ar6h-find"') >= 0 && ALL.indexOf('data-txt=') >= 0);
ok('底部固定、有复制与关闭', ALL.indexOf('.ar6h-foot{') >= 0 && ALL.indexOf('data-ar6-card="copy"') >= 0 && ALL.indexOf('data-ar6-card="close"') >= 0);

console.log('\n[五] 版本号只有一个源');
ok('版本来自 VERSION', ALL.indexOf('V' + api.VERSION) >= 0, api.VERSION);
ok('不再硬编码 V8.31', ALL.indexOf('V8.31') < 0);
ok('helpText 也带版本', TXT.indexOf('V' + api.VERSION) >= 0);

console.log('\n[六] 纯文本可复制');
ok('纯文本有内容', TXT.length > 1500, String(TXT.length));
ok('纯文本每页都有标题行', ['【装完先做啥', '【按钮在哪', '【防全知去媚', '【不肯写时', '【结果怎么看', '【出问题了', '【抗截断'].every((s) => TXT.indexOf(s) >= 0));
ok('未知页签回落 how', api.helpHTML('zzz') === api.helpHTML('how'));

console.log('\n[七] 能挂上');
try {
  api.openHelp('faq');
  const mounted = doc.body.children.filter((c) => String(c.id) === 'ar6-card');
  ok('说明页挂到 body', mounted.length >= 1);
} catch (e) {
  ok('说明页挂到 body', false, e.message);
}

console.log('\n' + pass + ' passed, ' + fail + ' failed');
console.log('[八] 说明页数据（v0.7 新增）');
const T7 = api.HELP_TABS;
ok('HELP_TABS 恰好 7 个', T7.length === 7, String(T7.length));
ok('第 7 个页签是 trunc', T7.length === 7 && T7[6].k === 'trunc', T7.length === 7 ? T7[6].k : '');
const cntOf = (k) => (api.HELP_PAGES[k] || []).reduce((n, s) => n + (s.l ? s.l.length : (s.a ? s.a.length : 0)), 0);
ok('每页 l 数组至少 8 条', T7.every((t) => cntOf(t.k) >= 8), T7.map((t) => t.k + ':' + cntOf(t.k)).join(' '));
const BAN = ['token', 'finish_reason', 'http', '400', '404', '200', '响应体', '幂等'];
const hit = [];
T7.forEach((t) => { const s = api.helpText(t.k).toLowerCase(); BAN.forEach((w) => { if (s.indexOf(w) >= 0) hit.push(t.k + ':' + w); }); });
ok('正文没有技术词（token/finish_reason/HTTP/状态码/响应体/幂等）', hit.length === 0, hit.join(','));

console.log(pass + ' passed, ' + fail + ' failed');
process.exit(fail ? 1 : 0);
