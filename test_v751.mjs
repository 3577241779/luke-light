/* test_v751.mjs — P1/P3 回归
 * 场景1：响应体有正文但聊天从不提交 → 不判 empty、bodyText=true、note 标「正文来自响应体」
 * 场景2：响应体读完了也没正文（双源皆空）→ empty 且 note 含「确认空回」
 * 场景3：响应体迟迟读不完（peek 慢）→ 必须等（不立刻判空），最终仍拿到字数
 * 场景4：旁路取样关闭 → note 说明"响应体未取到"，而不是"确认空回"
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

const GOOD = '这是一段明明存在、却被旧逻辑判成空回的正文；长度足够让它算作一次真实输出。';

function makeClone(mode, env) {
  const text = JSON.stringify(GOOD);
  const payload = 'data: {"choices":[{"delta":{"content":' + text + '}}]}\n\n' +
    'data: {"usage":{"completion_tokens":42,"completion_tokens_details":{"reasoning_tokens":0}}}';
  const bytes = Buffer.from(payload, 'utf8');
  let stage = 0;
  return {
    status: 200, ok: true, headers: { get: () => 'text/event-stream' },
    body: {
      getReader: () => ({
        read() {
          if (mode === 'slow') {
            if (env.round < 8) {
              return new Promise((r) => env.wakers.push(() => r({ done: false, value: new Uint8Array(0) })));
            }
            if (env.round < 12) {
              return new Promise((r) => env.wakers.push(() => r({ done: false, value: new Uint8Array(bytes) })));
            }
            return Promise.resolve({ done: true, value: undefined });
          }
          stage++;
          if (mode === 'text') {
            if (stage === 1) return Promise.resolve({ done: false, value: new Uint8Array(bytes) });
            return Promise.resolve({ done: true, value: undefined });
          }
          return Promise.resolve({ done: true, value: undefined });
        },
        cancel: () => Promise.resolve()
      })
    },
    text: () => Promise.resolve('')
  };
}

function makeEnv(mode) {
  const env = { t: 1000, round: 0, wakers: [], intervals: [], timeouts: [], handlers: {}, res: null };
  const doc = {
    head: makeEl('head'), body: makeEl('body'), documentElement: makeEl('html'),
    createElement: (t) => makeEl(t),
    getElementById() { return null; }, querySelector() { return null; }, querySelectorAll() { return []; },
    addEventListener() {}
  };
  const store = new Map();
  const chat = [];
  const res = { status: 200, ok: true, headers: { get: () => 'text/event-stream' } };
  res.clone = () => makeClone(mode, env);
  env.res = res;
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
    fetch: () => Promise.resolve(res),
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
  Object.defineProperty(win, 'is_send_press', { get: () => !!env.busy, set: (v) => { env.busy = !!v; }, configurable: true });
  vm.runInContext(SRC, vm.createContext(win), { filename: 'ar7.js' });
  env.api = win.__AR6__; env.win = win; env.chat = chat;
  return env;
}

const flush = () => new Promise((r) => setImmediate(r));

async function settle(env, rounds) {
  for (let i = 0; i < rounds; i++) {
    env.t += 150;
    env.round = i;
    for (const fn of env.intervals.slice()) { if (typeof fn === 'function') try { fn(); } catch (e) {} }
    for (const t of env.timeouts.splice(0)) { try { t.fn(); } catch (e) {} }
    if (env.wakers.length) { const w = env.wakers.shift(); try { w(); } catch (e) {} }
    if (i === 6) {
      try { if (env.handlers.stream_token_received) env.handlers.stream_token_received(); } catch (e) {}
      try { if (env.handlers.generation_ended) env.handlers.generation_ended(); } catch (e) {}
    }
    await flush(); await flush();
  }
}

async function run(mode, cfgOverride) {
  const env = makeEnv(mode);
  const api = env.api;
  const conf = Object.assign({ enabled: true, observe: true, peek: true, jail: 'off', safe: false, xhr: false }, cfgOverride || {});
  Object.keys(conf).forEach(function (k) { api.setCfg(k, conf[k]); });
  await env.win.fetch('https://relay.example.com/v1/chat-completions/generate', {
    method: 'POST',
    body: JSON.stringify({ model: 'gemini-4-argon', messages: [{ role: 'user', content: 'hi' }] })
  });
  await settle(env, 90);
  const rec = api.readLog()[0];
  try { if (api.dispose) api.dispose(); } catch (e) {}
  return rec;
}

const a = await run('text');
ok('场景1 有记录', !!a);
ok('场景1 不判空回', a && a.code !== 'empty', a && ('code=' + a.code + ' note=' + a.note));
ok('场景1 字数来自响应体', a && a.chars > 0, a && ('chars=' + a.chars));
ok('场景1 标了 bodyText', a && a.bodyText === true);
ok('场景1 note 说明来源', a && /正文来自响应体/.test(a.note || ''), a && a.note);

const b = await run('none');
ok('场景2 判空回', b && b.code === 'empty', b && ('code=' + b.code + ' note=' + b.note));
ok('场景2 note 是"确认空回"', b && /确认空回/.test(b.note || ''), b && b.note);

const c = await run('slow');
ok('场景3 慢流仍拿到字', c && c.code !== 'empty' && c.chars > 0, c && ('code=' + c.code + ' chars=' + c.chars));
ok('场景3 也标了 bodyText', c && c.bodyText === true);

const d = await run('none', { peek: false });
ok('场景4 关取样仍判空回', d && d.code === 'empty', d && ('code=' + d.code));
ok('场景4 note 说明未取到', d && /未取到/.test(d.note || ''), d && d.note);

console.log('\n' + pass + ' passed, ' + fail + ' failed');
process.exit(fail ? 1 : 0);
