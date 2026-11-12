/* test_v74.mjs — v7.4 三项（窗口盐 / 锁定审计 / 双护盾检测）回归
 * 轮次一：窗口盐的稳定性与轮换
 * 轮次二：锁定审计
 * 轮次三：外来护盾 + 面板页脚
 */
import fs from 'node:fs';
import vm from 'node:vm';

const TARGET = process.argv[2] || 'C:/Users/23548/Documents/deepseek-harness/default-workspace/_antiroute/v8/antiroute-v8-desktop.js';
const SRC = fs.readFileSync(TARGET, 'utf8');

let pass = 0, fail = 0;
function ok(name, cond, extra) {
  if (cond) { pass++; console.log('  ok   ' + name); }
  else { fail++; console.log('  FAIL ' + name + (extra ? ' — ' + extra : '')); }
}

function makeEl(tag) {
  return {
    tagName: String(tag || 'div').toUpperCase(), id: '', className: '', innerHTML: '', textContent: '',
    style: {}, children: [], parentNode: null,
    appendChild(c) { c.parentNode = this; this.children.push(c); return c; },
    removeChild(c) { const i = this.children.indexOf(c); if (i >= 0) this.children.splice(i, 1); return c; },
    setAttribute(k, v) { if (k === 'style') this.style.cssText = String(v); else this[k] = v; },
    getAttribute(k) { return this[k] == null ? null : String(this[k]); },
    addEventListener() {}, removeEventListener() {},
    querySelector() { return null; }, querySelectorAll() { return []; },
    classList: { contains: () => false, add: () => {}, remove: () => {}, toggle: () => {} },
    getBoundingClientRect() { return { width: 440, height: 320, top: 80, left: 80, right: 520, bottom: 400 }; }
  };
}

function makeEnv(opt) {
  const o = opt || {};
  const env = { t: 1762332000000, intervals: [], timeouts: [], handlers: {} };
  const byId = new Map();
  const doc = {
    head: makeEl('head'), body: makeEl('body'), documentElement: makeEl('html'),
    createElement: (t) => makeEl(t),
    getElementById(id) {
      if (byId.has(id)) { const c = byId.get(id); if (doc.body.children.indexOf(c) >= 0) return c; byId.delete(id); }
      for (const c of doc.body.children) if (c.id === id) { byId.set(id, c); return c; }
      return null;
    },
    querySelector() { return null; }, querySelectorAll() { return []; },
    addEventListener() {}
  };
  const store = new Map();
  const chat = o.chat || [];
  const win = {
    document: doc,
    localStorage: {
      getItem: (k) => (store.has(k) ? store.get(k) : null),
      setItem: (k, v) => { store.set(k, String(v)); },
      removeItem: (k) => { store.delete(k); }
    },
    console, navigator: { userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' },
    innerWidth: 1440, matchMedia: () => ({ matches: false }),
    addEventListener() {}, removeEventListener() {},
    setTimeout: (fn, ms) => { env.timeouts.push({ fn, ms }); return env.timeouts.length; },
    clearTimeout() {},
    setInterval: (fn) => { env.intervals.push(fn); return env.intervals.length; },
    clearInterval(id) { if (id > 0) env.intervals[id - 1] = null; },
    fetch: () => Promise.resolve({ status: 200, ok: true }),
    XMLHttpRequest: function () {},
    SillyTavern: { getContext: () => ({ chat, chatId: o.chatId === undefined ? 'chat-A' : o.chatId }) },
    Promise, Math, JSON, String, Number, Object, Array, RegExp, Error,
    TextDecoder: globalThis.TextDecoder,
    eventOn: (name, fn) => { env.handlers[name] = fn; return function () {}; },
    getButtonEvent: (n) => ({ key: n }),
    Date: (function () {
      const D = function () {};
      D.now = () => env.t; D.parse = Date.parse; D.UTC = Date.UTC;
      return D;
    })()
  };
  win.window = win; win.self = win; win.globalThis = win; win.top = win; win.parent = win;
  vm.runInContext(SRC, vm.createContext(win), { filename: 'ar7.js' });
  env.api = win.__AR6__; env.win = win; env.doc = doc;
  return env;
}

const URL_GEN = 'https://relay.example.com/v1/chat-completions/generate';

function bodyWith(text, extra) {
  const b = {
    model: 'gemini-4-argon',
    messages: [
      { role: 'system', content: text || '你是一个写作助手。规则：保持人称一致。\n\n第一条：不要使用感叹号。\n\n第二条：段落之间空一行。\n\n第三条：每次输出 800 字以上。' },
      { role: 'user', content: '继续写。' }
    ]
  };
  return Object.assign(b, extra || {});
}

function setAll(a, o) { Object.keys(o).forEach(function (k) { a.setCfg(k, o[k]); }); }

function planOf(api, body) {
  return api.planRequest(JSON.stringify(body), URL_GEN);
}

/* ---------------- 轮次一：窗口盐 ---------------- */
console.log('\n[轮次一] 窗口盐');
{
  const env = makeEnv({});
  const api = env.api;
  setAll(api, { enabled: true, refract: 'mid', refractMode: 'stable', saltWin: 30, refractSeed: '' });

  const a1 = planOf(api, bodyWith());
  env.t += 1000;                       /* 同窗口内（+1 秒） */
  const a2 = planOf(api, bodyWith());
  ok('同聊天同窗口：两次请求体一致', a1.body === a2.body, a1.body === a2.body ? '' : 'differ');
  ok('确实产生了微扰', a1.changed.join('|').indexOf('微扰') >= 0, a1.changed.join('|'));

  env.t += 31 * 60000;                 /* 跨窗口 */
  const a3 = planOf(api, bodyWith());
  ok('跨窗口：变形轮换', a3.body !== a1.body);

  const envB = makeEnv({ chatId: 'chat-B' });
  setAll(envB.api, { enabled: true, refract: 'mid', refractMode: 'stable', saltWin: 30, refractSeed: '' });
  const b1 = planOf(envB.api, bodyWith());
  ok('换聊天：变形不同', b1.body !== a1.body);

  setAll(api, { saltWin: 0 });
  const c1 = planOf(api, bodyWith());
  env.t += 5 * 60000;
  const c2 = planOf(api, bodyWith());
  ok('saltWin=0：不再按窗口轮换', c1.body === c2.body);
  ok('saltWin=0 仍产生微扰', c1.changed.join('|').indexOf('微扰') >= 0);
}

/* ---------------- 轮次二：锁定审计 ---------------- */
console.log('\n[轮次二] 锁定审计');
{
  const env = makeEnv({});
  const api = env.api;
  setAll(api, { enabled: true, pin: true });

  const p1 = planOf(api, bodyWith('文本', { allow_fallbacks: true, models: ['a', 'b'], route: 'fallback' }));
  ok('审计有 total=4', p1.audit && p1.audit.total === 4, JSON.stringify(p1.audit));
  ok('只存在 allow_fallbacks 时 pinned=1', p1.audit.pinned === 1 && p1.audit.present === 1,
    'pinned=' + p1.audit.pinned + ' present=' + p1.audit.present);
  ok('钉参数真的落到 body', JSON.parse(p1.body).allow_fallbacks === false);
  ok('删了 models[]', !('models' in JSON.parse(p1.body)));

  const p2 = planOf(api, bodyWith('文本', {
    allow_fallbacks: true, openrouter_allow_fallbacks: true,
    openrouter_use_fallback: true, provider: { allow_fallbacks: true }
  }));
  ok('四个字段都在时 pinned=4', p2.audit.pinned === 4, JSON.stringify(p2.audit));
  ok('全钉住时颜色 ok', api.auditLabel() === '4/4');

  const p3 = planOf(api, bodyWith('文本'));
  ok('一个字段都没有时 pinned=0', p3.audit.pinned === 0 && p3.audit.present === 0);
  ok('没有字段时不凭空造字段', !('allow_fallbacks' in JSON.parse(p3.body)));
  ok('页脚文案为 0/4', api.auditLabel() === '0/4');
}

/* ---------------- 轮次三：外来护盾 + 页脚 ---------------- */
console.log('\n[轮次三] 外来护盾 / 页脚');
{
  const env = makeEnv({});
  const api = env.api;
  setAll(api, { enabled: true, pin: true });

  const noisy = bodyWith('正文');
  noisy.messages[0].content = '<!-- a1b2c3d4e5 -->\n<!-- f6g7h8i9j0 -->\n' + noisy.messages[0].content;
  const pn = planOf(api, noisy);
  ok('检测到他人注入的注释块', pn.foreign >= 1, 'foreign=' + pn.foreign);

  const clean = planOf(api, bodyWith('干净正文'));
  ok('干净请求 foreign=0', clean.foreign === 0);

  const mk = bodyWith('正文');
  mk.messages[0].content = '[IZUMI_ANTI_ROUTE] ' + mk.messages[0].content;
  ok('检测到占位符标记', planOf(api, mk).foreign >= 1);

  /* v1.1：旧浮窗的页脚（「钉住 n/4」计数行）随浮层一起删了 —— 逐请求的钉住数还在，
     但只由 api.auditLabel() / 报告浮层给出，不再画在首屏。 */
  api.openPanel();
  const html = env.doc.body.children.map((c) => String(c.innerHTML || '')).join('');
  ok('首屏已没有旧页脚的「钉住」计数', html.indexOf('钉住') < 0 && html.indexOf('0/4') < 0 && html.indexOf('1/4') < 0);
  ok('干净请求后 auditLabel 仍是 0/4', api.auditLabel() === '0/4', api.auditLabel());

  const mhStart = SRC.indexOf('function moreHTML()');
  const mhEnd = SRC.indexOf('\n}\n', mhStart);
  const moreSrc = mhStart >= 0 && mhEnd > mhStart ? SRC.slice(mhStart, mhEnd + 2) : '';
  ok('「更多」里保留「📌 钉参数」开关', moreSrc.indexOf("chip('📌 钉参数:'") >= 0, 'moreHTML 缺钉参数 chip');

  const strong = bodyWith('x', { allow_fallbacks: true });
  planOf(api, strong);
  ok('钉住结果随请求更新（auditLabel 1/4）', api.auditLabel() === '1/4', api.auditLabel());
}

console.log('\n' + pass + ' passed, ' + fail + ' failed');
process.exit(fail ? 1 : 0);
