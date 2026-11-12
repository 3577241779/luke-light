/* test_help.mjs — 内置说明页 */
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
      return this._fc;
    }
  };
}

function makeEnv() {
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
  env.api = win.__AR6__; env.win = win; env.doc = doc;
  return env;
}

const env = makeEnv();
const api = env.api;

console.log('\n[一] 结构');
ok('版本号可解析', /^\d+\.\d+$/.test(String(api.VERSION)), api.VERSION);
ok('导出 openHelp/helpHTML/helpText', typeof api.openHelp === 'function' && typeof api.helpHTML === 'function' && typeof api.helpText === 'function');

console.log('\n[二] 七个页签');
for (const [k, t] of [['how', '装完先做啥'], ['map', '按钮在哪'], ['narr', '防全知去媚'], ['jail', '不肯写时'], ['read', '结果怎么看'], ['faq', '出问题了'], ['trunc', '抗截断']]) {
  const h = api.helpHTML(k);
  ok('页签「' + t + '」存在且选中', h.indexOf('data-tab="' + k + '"') >= 0 && h.indexOf(t) >= 0);
}
ok('未知页签回落到「怎么用」', api.helpHTML('zzz') === api.helpHTML('how'));

console.log('\n[三] 内容要点');
const how = api.helpHTML('how');
/* v1.1 说明页重写：第一步只剩「照常聊一轮」 */
ok('第一步是「照常聊一轮」', how.indexOf('照常聊一轮') >= 0);
ok('不再提「验渠道」（入口已删）', how.indexOf('验渠道') < 0, '说明页仍在讲验渠道');
ok('装了没反应时指向「更多 → 只查 Gemini」', how.indexOf('只查 Gemini') >= 0);
ok('每页至少 8 条正文', api.HELP_TABS.every((t) => (api.HELP_PAGES[t.k] || []).reduce((n, s) => n + (s.l ? s.l.length : 0), 0) >= 8));
const nrr = api.helpHTML('narr');
ok('叙述层含三档与两个 chip', nrr.indexOf('防全知') >= 0 && nrr.indexOf('去媚') >= 0 && nrr.indexOf('强') >= 0);
ok('叙述层三档齐全', nrr.indexOf('关') >= 0 && nrr.indexOf('轻') >= 0 && nrr.indexOf('强') >= 0);
const pnl = api.helpHTML('map');
ok('按钮页覆盖防护与四块结构', pnl.indexOf('防护') >= 0 && pnl.indexOf('破甲 + 抗截断') >= 0 && pnl.indexOf('更多') >= 0);
const jail = api.helpHTML('jail');
ok('破甲详解含强力档、补一次、别再问我', jail.indexOf('强力') >= 0 && jail.indexOf('补一次') >= 0 && jail.indexOf('别再问我') >= 0);
const faq = api.helpHTML('faq');
ok('常见问题含"留一个，另一个先禁用"', faq.indexOf('留一个') >= 0);
ok('常见问题回答"能不能保证"', faq.indexOf('别信') >= 0);

console.log('\n[四] 复制文本');
const txt = api.helpText('narr');
ok('纯文本含叙述层标题', txt.indexOf('防全知') >= 0 && txt.indexOf('去媚') >= 0);
ok('纯文本带版本号', txt.indexOf('V' + api.VERSION) >= 0);

console.log('\n[五] 面板入口');
/* v1.1：首屏只剩「看报告 / 更多」，「说明」被挪进「更多」；启动时 minimized=true，必须 openPanel() */
api.openPanel();
const panel = env.doc.body.children.map((c) => c.innerHTML || '').join('');
ok('首屏不再有「说明」按钮（已挪进「更多」）', panel.indexOf('data-ar6="help"') < 0, '首屏仍有 data-ar6=help');
ok('首屏也不再出现 emoji 问号', panel.indexOf('❔') < 0);
const mhStart = SRC.indexOf('function moreHTML()');
const mhEnd = SRC.indexOf('\n}\n', mhStart);
const moreSrc = mhStart >= 0 && mhEnd > mhStart ? SRC.slice(mhStart, mhEnd + 2) : '';
ok('「更多」里保留「说明」入口', moreSrc.indexOf("btnIco('help', 'ask', '说明')") >= 0, 'moreHTML 含 btnIco help');

console.log('\n[六] 挂载');
api.openHelp('faq');
const mounted = env.doc.body.children.filter((c) => String(c.id) === 'ar6-card');
ok('说明页已挂到 body', mounted.length >= 1);
ok('挂载节点 id 正确', mounted.length ? mounted[0].id === 'ar6-card' : false);

console.log('\n' + pass + ' passed, ' + fail + ' failed');
process.exit(fail ? 1 : 0);
