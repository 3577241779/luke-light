/* test_empty_fix2.mjs — 回归「明明有正文却显示没有正文」
 * 场景1：聊天记录里没有任何正文提交（流式只在 DOM / 别的扩展的静默生成），
 *        但响应体里明明有文本 ⇒ 不得判 empty，且字数要来自响应体。
 * 场景2：聊天记录与响应体都没有文本 ⇒ 仍判 empty。
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

function sseClone(text) {
  const payload = 'data: {"choices":[{"delta":{"content":' + JSON.stringify(text) + '}}]}\n\n';
  const bytes = Buffer.from(payload, 'utf8');
  let sent = false;
  return {
    status: 200, ok: true, headers: { get: () => 'text/event-stream' },
    body: {
      getReader: () => ({
        read() {
          if (sent) return Promise.resolve({ done: true, value: undefined });
          sent = true;
          return Promise.resolve({ done: false, value: new Uint8Array(bytes) });
        },
        cancel: () => Promise.resolve()
      })
    },
    text: () => Promise.resolve('')
  };
}

const GOOD = '这是一段明明存在、却被旧逻辑判成空回的正文；长度足够让它算作一次真实输出。';

function makeRes(withText) {
  const res = { status: 200, ok: true, headers: { get: () => 'text/event-stream' } };
  res.clone = () => sseClone(withText ? GOOD : '');
  return res;
}

function makeEnv() {
  const env = { t: 1000, intervals: [], timeouts: [], handlers: {}, res: null };
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
  const chat = [];
  const fakeFetch = () => Promise.resolve(env.res);
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
    fetch: fakeFetch,
    XMLHttpRequest: function () {},
    SillyTavern: { getContext: () => ({ chat }) },
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
  Object.defineProperty(win, 'is_send_press', {
    get: () => !!env.busy, set: (v) => { env.busy = !!v; }, configurable: true
  });
  vm.runInContext(SRC, vm.createContext(win), { filename: 'ar7.js' });
  env.api = win.__AR6__;
  env.win = win; env.chat = chat; env.fakeFetch = fakeFetch;
  return env;
}

const flush = () => new Promise((r) => setImmediate(r));

async function settle(env, rounds, fireEndedAt) {
  for (let i = 0; i < rounds; i++) {
    env.t += 150;
    for (const fn of env.intervals.slice()) { if (typeof fn === 'function') fn(); }
    for (const t of env.timeouts.splice(0)) { try { t.fn(); } catch (e) {} }
    await flush(); await flush();
    if (i === fireEndedAt) {
      try { if (env.handlers.stream_token_received) env.handlers.stream_token_received(); } catch (e) {}
      try { if (env.handlers.generation_ended) env.handlers.generation_ended(); } catch (e) {}
    }
  }
}

async function run(withText) {
  const env = makeEnv();
  const api = env.api;
  api.setCfg({ enabled: true, observe: true, peek: true, jail: 'off', safe: false, xhr: false });
  env.res = makeRes(withText);
  await env.win.fetch('https://relay.example.com/v1/chat-completions/generate', {
    method: 'POST',
    body: JSON.stringify({ model: 'gemini-4-argon', messages: [{ role: 'user', content: 'hi' }] })
  });
  await settle(env, 60, 4);
  const rec = api.readLog()[0];
  try { if (api.dispose) api.dispose(); } catch (e) {}
  return rec;
}

const a = await run(true);
ok('场景1 产生记录', !!a);
ok('场景1 不判 empty', a && a.code !== 'empty', a && ('code=' + a.code + ' / ' + a.note));
ok('场景1 字数来自响应体', a && a.chars > 0, a && ('chars=' + a.chars));

const b = await run(false);
ok('场景2 仍判 empty', b && b.code === 'empty', b && ('code=' + b.code + ' / ' + b.note));

console.log('\n' + pass + ' passed, ' + fail + ' failed');
process.exit(fail ? 1 : 0);
