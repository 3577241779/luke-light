/* test_help_entry.mjs — 说明页常驻入口（标题栏 ❔ / 长按悬浮球）+ 健壮性 */
import fs from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';

const DIR = 'C:/Users/23548/Documents/deepseek-harness/default-workspace/_antiroute/v8';
const TARGET = process.argv[2] || path.join(DIR, 'antiroute-v8-desktop.js');
const SRC = fs.readFileSync(TARGET, 'utf8');

let pass = 0, fail = 0;
function ok(n, c, e) { if (c) { pass++; console.log('  ok   ' + n); } else { fail++; console.log('  FAIL ' + n + (e !== undefined ? ' — ' + e : '')); } }

function el(tag) {
  const node = {
    tagName: String(tag || 'div').toUpperCase(), id: '', innerHTML: '', textContent: '', value: '', style: {},
    children: [], parentNode: null, _fc: null,
    appendChild(c) { if (!c) throw new Error('appendChild(undefined)'); c.parentNode = this; this.children.push(c); return c; },
    remove() { if (this.parentNode) this.parentNode.removeChild(this); },
    removeChild(c) { const i = this.children.indexOf(c); if (i >= 0) this.children.splice(i, 1); return c; },
    setAttribute(k, v) { if (k === 'style') this.style.cssText = String(v); else this[k] = v; },
    getAttribute(k) { return this[k] == null ? null : String(this[k]); },
    addEventListener(n, f) { (this._ev = this._ev || {}); (this._ev[n] = this._ev[n] || []).push(f); },
    removeEventListener() {}, select() {}, focus() {},
    querySelector(sel) { const m = String(sel).match(/^\.([\w-]+)$/); if (m && String(this.innerHTML).indexOf('class="' + m[1]) >= 0) { const s = el('div'); s.className = m[1]; return s; } return null; },
    querySelectorAll() { return []; },
    classList: { add() {}, remove() {}, toggle() {}, contains() { return false; } },
    getBoundingClientRect() { return { width: 420, height: 320, top: 10, left: 10, right: 430, bottom: 330 }; },
    get firstChild() { if (this._fcUsed) return null; this._fcUsed = true;
      if (!this._fc) {
        const m = /id="([^"]+)"/.exec(String(this.innerHTML || ''));
        this._fc = el('div'); if (m) this._fc.id = m[1];
      }
      return this._fc;
    }
  };
  return node;
}

function makeEnv(opt) {
  opt = opt || {};
  const env = { t: 1762332000000 };
  const doc = {
    head: el('head'), body: opt.noBody ? null : el('body'), documentElement: el('html'),
    createElement: (t) => el(t),
    getElementById(id) {
      const seen = [];
      function walk(n) { if (!n) return null; if (String(n.id) === String(id)) return n; for (const c of (n.children || [])) { const r = walk(c); if (r) return r; } if (String(n.innerHTML || '').indexOf('id="' + id + '"') >= 0) return n.firstChild; return null; }
      return walk(doc.body);
    },
    querySelector() { return null; }, querySelectorAll() { return []; },
    addEventListener() {}, execCommand() { return true; }
  };
  const store = new Map();
  const localStorage = {
    getItem: (k) => (opt.storeThrow ? (() => { throw new Error('SecurityError'); })() : (store.has(k) ? store.get(k) : null)),
    setItem: (k, v) => { if (opt.storeThrow) throw new Error('QuotaExceeded'); store.set(k, String(v)); },
    removeItem: (k) => { store.delete(k); }
  };
  const win = {
    document: doc, localStorage,
    console, navigator: { userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' },
    innerWidth: 1440, innerHeight: 900, matchMedia: () => ({ matches: false }),
    addEventListener() {}, removeEventListener() {},
    setTimeout: (f, ms) => { if (opt.runTimers) f(); return 0; }, clearTimeout() {}, setInterval: () => 0, clearInterval() {},
    fetch: () => Promise.resolve({ status: 200, ok: true }),
    XMLHttpRequest: function () {},
    SillyTavern: { getContext: () => ({ chat: [] }) },
    Promise, Math, JSON, String, Number, Object, Array, RegExp, Error,
    TextDecoder: globalThis.TextDecoder,
    eventOn: () => function () {}, getButtonEvent: (n) => ({ key: n }),
    Date: (function () { const D = function () {}; D.now = () => env.t; D.parse = Date.parse; D.UTC = Date.UTC; return D; })()
  };
  win.window = win; win.self = win; win.globalThis = win; win.top = win; win.parent = win;
  vm.runInContext(SRC, vm.createContext(win), { filename: 'ar7.js' });
  env.api = win.__AR6__; env.win = win; env.doc = doc;
  return env;
}

console.log('\n[一] 源码装配（两个入口都在）');
/* v1.1：标题栏的常驻 ❔（data-ar6="help" title="使用说明"）随浮窗一起删了；
   说明入口现在只在面板底部「更多」里，由 moreHTML() 的 btnIco('help','ask','说明') 渲染。 */
ok('v1.1 已没有标题栏 ❔ 入口', !/data-ar6="help" title="使用说明"/.test(SRC), '旧标题栏入口仍在');
ok('首屏右上角只有一个 ✕ 关闭按钮', /data-ar6="close" title="关闭">✕</.test(SRC), '没找到 ✕');
ok('旧的「▾ 收起」按钮已删（关闭走 ✕ / 遮罩 / Esc）', SRC.indexOf('data-ar6="min"') < 0, '仍能找到 data-ar6="min"');
ok('悬浮球入口已删（面板靠工具栏按钮 / 魔法棒打开）', SRC.indexOf('openPanelFromBall') < 0 && SRC.indexOf('ar6-ball') < 0 && SRC.indexOf('悬浮球') < 0);
ok('工具栏唯一入口会 openPanel()', /fn: function \(\) \{ openPanel\(\); \}/.test(SRC));
ok('分派表里有 help', /act === 'help'[\s\S]{0,40}openHelp\('how'\)/.test(SRC));

console.log('\n[二] 面板渲染');
const env = makeEnv();
const api = env.api;
/* v1.1：启动时 minimized=true，render() 是关闭态；openPanel() 才有首屏 */
api.openPanel();
const html = env.doc.body.children.map((c) => String(c.innerHTML || '')).join('');
ok('首屏没有 emoji 问号', html.indexOf('❔') < 0);
ok('首屏没有说明入口（已挪进「更多」）', html.indexOf('data-ar6="help"') < 0, '首屏仍有 help');
const mhStart = SRC.indexOf('function moreHTML()');
const mhEnd = SRC.indexOf('\n}\n', mhStart);
const moreSrc = mhStart >= 0 && mhEnd > mhStart ? SRC.slice(mhStart, mhEnd + 2) : '';
ok('「更多」里保留说明入口（删掉即红）', moreSrc.indexOf("btnIco('help', 'ask', '说明')") >= 0, 'moreHTML 含 btnIco help');
ok('面板 HTML 含当前版本号', html.indexOf(api.VERSION) >= 0, api.VERSION);

console.log('\n[三] 打开/切页/关闭');
api.openHelp('how');
const nodes = () => env.doc.body.children.filter((c) => String(c.id) === 'ar6-card');
ok('打开后出现浮层', nodes().length === 1, nodes().length);
api.openHelp('faq');
ok('再次打开不叠层', nodes().length === 1, nodes().length);
ok('切页后仍是同一节点（内容已换）', nodes().length === 1);
api.closeCard();
ok('关闭后节点被移除', nodes().length === 0);

console.log('\n[四] 暴力情形');
const env2 = makeEnv({ storeThrow: true });
try { env2.api.openHelp('how'); ok('存储抛错仍能打开说明', true); } catch (e) { ok('存储抛错仍能打开说明', false, e.message); }
ok('存储抛错时浮层仍挂上', env2.doc.body.children.filter((c) => String(c.id) === 'ar6-card').length === 1);

const env3 = makeEnv({ noBody: true });
let threw = false;
try { env3.api.openHelp('how'); } catch (e) { threw = true; }
ok('没有 body 时不抛异常', !threw);

const env4 = makeEnv();
env4.api.render();
env4.api.openHelp('btn');
env4.api.dispose();
ok('dispose 后浮层被清理', env4.doc.body.children.filter((c) => String(c.id) === 'ar6-card').length === 0);

console.log('\n[五] 文案完整性');
const all = ['how', 'what', 'btn', 'faq'].map((t) => api.helpText(t)).join('\n');
ok('四页文本都非空', all.length > 800, all.length);
ok('含「装完只做一件事」', all.indexOf('装完只做一件事') >= 0 && all.indexOf('照常聊一轮') >= 0);
/* v1.1：「自检 20 项」「验渠道」「排查」这些按钮都没了，说明页里也不该再让人去点 */
ok('不再提「自检 20 项」', all.indexOf('自检 20 项') < 0);
ok('不再提「验渠道」', all.indexOf('验渠道') < 0);
ok('装了没反应时指向「更多 → 只查 Gemini」', api.helpText('how').indexOf('只查 Gemini') >= 0);

console.log('\n' + pass + ' passed, ' + fail + ' failed');
process.exit(fail ? 1 : 0);
