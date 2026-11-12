/* test_jail_confirm.mjs — 续写改为「先问一句」 */
import fs from 'node:fs';
import vm from 'node:vm';

const TARGET = process.argv[2] || 'C:/Users/23548/Documents/deepseek-harness/default-workspace/_antiroute/v8/antiroute-v8-desktop.js';
const SRC = fs.readFileSync(TARGET, 'utf8');

let pass = 0, fail = 0;
function ok(n, c, e) { if (c) { pass++; console.log('  ok   ' + n); } else { fail++; console.log('  FAIL ' + n + (e ? ' — ' + e : '')); } }

function el(tag) {
  const o = {
    tagName: String(tag || 'div').toUpperCase(), id: '', innerHTML: '', textContent: '', value: '', style: {},
    children: [], parentNode: null, _click: [],
    appendChild(c) { c.parentNode = this; this.children.push(c); return c; },
    removeChild(c) { const i = this.children.indexOf(c); if (i >= 0) this.children.splice(i, 1); return c; },
    setAttribute(k, v) { if (k === 'style') this.style.cssText = String(v); else this[k] = v; },
    getAttribute(k) { return this[k] == null ? null : String(this[k]); },
    addEventListener(t, f) { if (t === 'click' || t === 'pointerdown') this._click.push(f); },
    removeEventListener() {}, select() {}, focus() {},
    querySelector() { return null; }, querySelectorAll() { return []; },
    classList: { add() {}, remove() {}, toggle() {}, contains() { return false; } },
    getBoundingClientRect() { return { width: 430, height: 400, top: 8, left: 8, right: 438, bottom: 408 }; }
  };
  Object.defineProperty(o, 'firstChild', { get: function () {
    if (this.children.length) return this.children[0];
    if (this._taken) return null;
    this._taken = true;
    if (this._sib === undefined) {
      var m = /id="([^"]+)"/.exec(String(this.innerHTML || ''));
      this._sib = m ? (function () { var n = el('div'); n.id = m[1]; n.innerHTML = 'parsed'; return n; })() : null;
    }
    return this._sib;
  } });
  return o;
}

function makeEnv(opt) {
  opt = opt || {};
  const env = { t: 1762400000000, warns: [], banners: [], slashed: [] };
  const chat = opt.chat || [];
  const doc = {
    head: el('head'), body: el('body'), documentElement: el('html'),
    createElement: (t) => el(t),
    getElementById(id) {
      var hit = null;
      (function walk(n) { if (hit) return; if (String(n.id) === String(id)) { hit = n; return; } (n.children || []).forEach(walk); })(doc.body);
      return hit;
    }, querySelector() { return null; }, querySelectorAll() { return []; },
    addEventListener() {}, execCommand() { return true; }
  };
  const store = new Map(Object.entries(opt.store || {}));
  const ctx = {
    chat: chat,
    executeSlashCommandsWithOptions: (c) => { env.slashed.push(c); return Promise.resolve(); },
    saveSettingsDebounced: () => {}
  };
  const win = {
    document: doc,
    localStorage: {
      getItem: (k) => (store.has(k) ? store.get(k) : null),
      setItem: (k, v) => { store.set(k, String(v)); }, removeItem: (k) => { store.delete(k); }
    },
    console: { log() {}, warn: (...a) => env.warns.push(a.join(' ')), error: (...a) => env.warns.push(a.join(' ')) },
    navigator: { userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' },
    innerWidth: 1440, matchMedia: () => ({ matches: false }),
    addEventListener() {}, removeEventListener() {},
    setTimeout: (f) => { env.pending = f; return 1; }, clearTimeout() {}, setInterval: () => 1, clearInterval() {},
    fetch: () => Promise.resolve({ status: 200, ok: true }),
    XMLHttpRequest: function () {},
    SillyTavern: { getContext: () => ctx },
    Promise, Math, JSON, String, Number, Object, Array, RegExp, Error, Boolean,
    TextDecoder: globalThis.TextDecoder, Map, Set,
    eventOn: () => ({ stop() {} }), getButtonEvent: (n) => ({ key: n }),
    Date: (function () { const D = function () {}; D.now = () => env.t; D.parse = Date.parse; D.UTC = Date.UTC; return D; })()
  };
  win.window = win; win.self = win; win.globalThis = win; win.top = win; win.parent = win;
  vm.runInContext(SRC, vm.createContext(win), { filename: 'ar7.js' });
  env.api = win.__AR6__; env.win = win; env.doc = doc; env.ctx = ctx; env.store = store;
  return env;
}

const TAIL = '他说到这里就停在了，';
const AI = { is_user: false, is_system: false, name: 'AI', mes: TAIL, send_date: '2026-11-05T01:00:00Z' };
const EV = { status: 200, tail: TAIL, outputChars: TAIL.length, mesChars: TAIL.length };

console.log('\n[一] 默认先问，不自动补');
{
  const env = makeEnv({ chat: [AI] });
  const api = env.api;
  ok('VERSION 可解析', /^\d+\.\d+$/.test(String(api.VERSION)), api.VERSION);
  ok('默认 jailConfirm=true', api.getCfg().jailConfirm === true);
  ok('默认 jail=off（本来就不会自动补）', api.getCfg().jail === 'off');
  api.setCfg('jail', 'strong');
  api.setCfg('observe', true);
  const before = env.slashed.length;
  api.jailAfterFinish && api.jailAfterFinish(EV);
  ok('没有直接发 /continue', env.slashed.length === before, env.slashed.join(','));
}

console.log('\n[二] 确认框内容');
{
  const env = makeEnv({ chat: [AI] });
  const html = env.api.jailConfirmHTML({ code: 'trunc', note: '结尾停在破折号/逗号' }, { msg: AI });
  ok('标题是「要不要补」', html.indexOf('要不要补') >= 0);
  ok('有三个按钮', html.indexOf('data-ar6-card="jailgo"') >= 0 && html.indexOf('data-ar6-card="jailno"') >= 0 && html.indexOf('data-ar6-card="jailless"') >= 0);
  ok('带原因', html.indexOf('破折号') >= 0 || html.indexOf('结尾') >= 0);
  ok('带字数', /字数|字/.test(html));
  ok('带结尾预览', html.indexOf('停在了') >= 0);
}

console.log('\n[三] 点「补一次」才真的发');
{
  const env = makeEnv({ chat: [AI] });
  const api = env.api;
  api.setCfg('jail', 'safe');
  api.setCfg('observe', true);
  api.jailOffer({ code: 'trunc', note: '结尾停在破折号' });
  ok('浮层已挂', env.doc.body.children.filter((c) => String(c.id) === 'ar6-card').length >= 1);
  const node = env.doc.body.children.filter((c) => String(c.id) === 'ar6-card')[0];
  const clickFn = node._click[node._click.length - 1];
  ok('浮层绑了点击', typeof clickFn === 'function');
  if (typeof clickFn === 'function') {
    clickFn({ target: { getAttribute: () => 'jailgo', closest: () => ({ getAttribute: () => 'jailgo' }) } });
    ok('点了之后 /continue 发出（或排进定时器）', env.slashed.length > 0 || typeof env.pending === 'function', 'slashed=' + env.slashed.length);
  }
}

console.log('\n[四] 「别再问」写盘');
{
  const env = makeEnv({ chat: [AI] });
  const api = env.api;
  api.jailOffer({ code: 'trunc', note: 'x' });
  const node = env.doc.body.children.filter((c) => String(c.id) === 'ar6-card')[0];
  const clickFn = node._click[node._click.length - 1];
  clickFn({ target: { getAttribute: () => 'jailless', closest: () => ({ getAttribute: () => 'jailless' }) } });
  ok('jailConfirm 已关', api.getCfg().jailConfirm === false, String(api.getCfg().jailConfirm));
  const saved = env.store.get('ar6.cfg') || '';
  ok('已落盘', saved.indexOf('"jailConfirm":false') >= 0, saved.slice(0, 120));
}

console.log('\n[四之二] 默认确实会弹确认框，且不叠层');
{
  const env = makeEnv({ chat: [AI] });
  const api = env.api;
  api.setCfg('jail', 'safe');
  api.setCfg('observe', true);
  api.jailAfterFinish(EV);
  const cards = env.doc.body.children.filter((c) => String(c.id) === 'ar6-card');
  ok('弹出了确认框', cards.length === 1, String(cards.length));
  api.jailAfterFinish(EV);
  const cards2 = env.doc.body.children.filter((c) => String(c.id) === 'ar6-card');
  ok('再调一次不叠层', cards2.length === 1, String(cards2.length));
  ok('源码里确认框文案含「要不要补」', SRC.indexOf('要不要补') >= 0);
}

console.log('\n[五] 关掉确认之后才自动补');
{
  const env = makeEnv({ chat: [AI] });
  const api = env.api;
  api.setCfg('jail', 'safe');
  api.setCfg('observe', true);
  api.setCfg('jailConfirm', false);
  api.jailAfterFinish(EV);
  ok('自动路径会排计划（有 pending）或直接发', typeof env.pending === 'function' || env.slashed.length > 0, 'pend=' + typeof env.pending + ' slash=' + env.slashed.length);
}

console.log('\n[六] 面板入口');
{
  const env = makeEnv({ chat: [AI] });
  env.api.setCfg('jail', 'safe');   /* 补前先问只在破甲开着时出现 */
  /* v1.1：启动时 minimized=true，render() 是关闭态；openPanel() 才有首屏 */
  env.api.openPanel();
  const html = env.doc.body.children.map((c) => String(c.innerHTML || '')).join('');
  ok('有「补前先问」chip', html.indexOf('补前先问') >= 0 && html.indexOf('🔔') < 0);
  ok('有「🩹 补一次」按钮', html.indexOf('data-ar6="jailnow"') >= 0);
  ok('源码有 jailnow 分支', SRC.indexOf("act === 'jailnow'") >= 0);
}

console.log('\n' + pass + ' passed, ' + fail + ' failed');
process.exit(fail ? 1 : 0);
