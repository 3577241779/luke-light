// test_v80.mjs — v8.0.0 归属修复的专项回归
// 覆盖：内部请求识别 / body 优先 / 跨族判定 / edits 接线 / think 三态
import fs from 'node:fs';
import vm from 'node:vm';

const SRC = fs.readFileSync(new URL('./antiroute-v8-desktop.js', import.meta.url), 'utf8');
let pass = 0, fail = 0;
const ok = (name, cond, extra) => {
  if (cond) { pass++; console.log('  ok  ' + name); }
  else { fail++; console.log('  FAIL ' + name + (extra ? '  → ' + extra : '')); }
};

function makeEl(tag) {
  const el = {
    tagName: tag, id: '', style: {}, children: [], dataset: {}, classList: { add() {}, remove() {}, toggle() {} },
    setAttribute(k, v) { el[k] = v; }, removeAttribute(k) { delete el[k]; },
    appendChild(c) { el.children.push(c); return c; },
    insertBefore(c) { el.children.unshift(c); return c; },
    removeChild(c) { const i = el.children.indexOf(c); if (i >= 0) el.children.splice(i, 1); },
    addEventListener() {}, removeEventListener() {}, contains() { return false; },
    querySelector() { return null; }, querySelectorAll() { return []; },
    getBoundingClientRect() { return { width: 400, height: 300, top: 0, left: 0 }; },
    get innerHTML() { return el._html || ''; }, set innerHTML(v) { el._html = v; },
    textContent: '', title: '', className: ''
  };
  Object.defineProperty(el, 'firstChild', {
    get() { return el.children.length ? el.children[0] : null; }, configurable: true
  });
  return el;
}

function makeEnv(opt) {
  opt = opt || {};
  const env = { t: 1000, intervals: [], timeouts: [], handlers: {} };
  const doc = {
    head: makeEl('head'), body: makeEl('body'), documentElement: makeEl('html'),
    createElement: (t) => makeEl(t), createTextNode: (t) => ({ textContent: t }),
    getElementById: () => null, querySelector: () => null, querySelectorAll: () => [],
    addEventListener() {}, removeEventListener() {}
  };
  const store = new Map();
  const chat = [];
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
    fetch: () => Promise.resolve(new win.Response('{}', { status: 200 })),
    Response: function (body, init) { this.body = body; this.status = (init || {}).status || 200; this.ok = this.status < 400; this.headers = { get: () => 'application/json' };
      this.clone = () => new win.Response(body, init); this.text = () => Promise.resolve(String(body)); },
    XMLHttpRequest: function () {},
    SillyTavern: { getContext: () => ({ chat }) },
    Promise, Math, JSON, String, Number, Object, Array, RegExp, Error, Symbol, Date,
    TextDecoder: globalThis.TextDecoder,
    eventOn: (name, fn) => { env.handlers[name] = fn; return { stop() {} }; },
    getButtonEvent: (n) => ({ key: n })
  };
  win.window = win; win.self = win; win.globalThis = win; win.top = win; win.parent = win;
  vm.runInContext(SRC, vm.createContext(win), { filename: 'ar8.js' });
  env.api = win.__AR6__; env.win = win; env.chat = chat;
  return env;
}

console.log('[1] 内部请求识别');
{
  const env = makeEnv();
  const api = env.api;
  ok('Symbol 标记命中', api.isInternalRequest({ [Symbol.for('acu.internal-generation-fetch')]: true }, null) === true);
  ok('messages≤2 且无 assistant、但无渠道证据 → 不算内部', api.isInternalRequest(null, { messages: [{ role: 'system', content: 'x' }] }) === false);
  ok('custom+反代 且 messages≤2 无 assistant 判内部', api.isInternalRequest(null, { chat_completion_source: 'custom', reverse_proxy: 'https://api.deepseek.com/v1', messages: [{ role: 'system', content: 'x' }] }) === true);
  ok('带 type 的正式生成永不判内部', api.isInternalRequest(null, { type: 'normal', chat_completion_source: 'custom', reverse_proxy: 'https://api.deepseek.com/v1', messages: [{ role: 'user', content: 'x' }] }) === false);
  ok('messages≤2 但有 assistant 不判内部', api.isInternalRequest(null, { messages: [{ role: 'user', content: 'x' }, { role: 'assistant', content: 'y' }] }) === false);
  ok('长对话不判内部', api.isInternalRequest(null, { messages: Array.from({ length: 5 }, () => ({ role: 'user', content: 'x' })) }) === false);
  ok('空 body 不抛', api.isInternalRequest(null, null) === false);
}

console.log('[2] internal 时 planRequest 不改写');
{
  const env = makeEnv();
  const api = env.api;
  api.setCfg('alias', 'pg-gemini-4-argon');
  api.setCfg('refract', 'mid');
  const body = { model: 'deepseek-flash', messages: [{ role: 'system', content: '你是一个填表助手，请输出 JSON。' }], allow_fallbacks: true, models: ['a'], route: 'x' };
  const out = api.planRequest(JSON.stringify(body), 'https://relay.example.com/api/backends/chat-completions/generate', true);
  const nb = JSON.parse(out.body);
  ok('internal 不改 model', nb.model === 'deepseek-flash', nb.model);
  ok('internal 仍钉 allow_fallbacks', nb.allow_fallbacks === false);
  ok('internal 删 models', !('models' in nb));
  ok('internal 不注入熵', String(nb.messages[0].content).indexOf('_ar') < 0);
  ok('out.internal 标记', out.internal === true);
  ok('out.edits 为数字', typeof out.edits === 'number', out.edits);
  const out2 = api.planRequest(JSON.stringify({ model: 'g', messages: [{ role: 'system', content: '规则'.repeat(60) }], allow_fallbacks: true }), 'https://relay.example.com/api/backends/chat-completions/generate', false);
  ok('external 保留别名改写', JSON.parse(out2.body).model === 'pg-gemini-4-argon', JSON.parse(out2.body).model);
}

console.log('[3] familyOf');
{
  const env = makeEnv();
  const api = env.api;
  ok('google', api.familyOf('gemini-4-argon') === 'google');
  ok('google 带前缀', api.familyOf('抗截断-pg-gemini-3.8-flash') === 'google');
  ok('deepseek', api.familyOf('deepseek-flash') === 'deepseek');
  ok('anthropic', api.familyOf('claude-opus-5') === 'anthropic');
  ok('other', api.familyOf('qwen-max') === 'other');
}

console.log('[4] 判定：body 优先 / 跨族 / 回显');
{
  const env = makeEnv();
  const api = env.api;
  const mk = (req, obs, src) => {
    const ev = api.newEvidence(req, 200, 'sse');
    ev.sawText = true; ev.outputChars = 500;
    api.pushObs(ev, obs, src);
    return ev;
  };
  // 跨族：请求 gemini，body 回 deepseek ⇒ 一律 diff
  let v = api.verdictOf(mk('gemini-4-argon', 'deepseek-flash', 'body'));
  ok('跨族 ⇒ diff', v.code === 'diff', v.code);
  ok('跨族 conf 为 A（body）', v.conf === 'A', v.conf);
  // body 低阶
  v = api.verdictOf(mk('gemini-4-argon', 'gemini-3.1-flash-lite', 'body'));
  ok('body 低阶 ⇒ diff', v.code === 'diff', v.code);
  ok('body diff conf B', v.conf === 'B', v.conf);
  // 仅消息来源、渠道不可验 ⇒ unknown（不再冤枉成 echo）
  const env2 = makeEnv();
  env2.api.setCfg('dualBase', '');
  v = env2.api.verdictOf((() => { const ev = env2.api.newEvidence('gemini-4-argon', 200, 'sse'); ev.sawText = true; ev.outputChars = 500; env2.api.pushObs(ev, 'deepseek-flash', 'msg'); return ev; })());
  ok('msg-only 跨族也不放过（diff 或 unknown）', v.code === 'diff' || v.code === 'unknown', v.code);
  // 同族同模型 ⇒ same
  v = api.verdictOf(mk('gemini-4-argon', 'gemini-4-argon', 'body'));
  ok('同族同模型 ⇒ same', v.code === 'same', v.code);
}

console.log('[5] think 三态与 edits 渲染');
{
  const env = makeEnv();
  const api = env.api;
  const ev = api.newEvidence('gemini-4-argon', 200, 'sse');
  api.absorbPeek('{"modelVersion":"gemini-4-argon","usageMetadata":{"thoughtsTokenCount":321,"candidatesTokenCount":88}}', 1, ev);
  ok('peek 回填思考', ev.hasThink === true && ev.thoughtTok === 321, ev.hasThink + '/' + ev.thoughtTok);
  ok('peek 回填 model 到 observed', ev.observed.indexOf('gemini-4-argon') >= 0, ev.observed.join(','));
  const ev2 = api.newEvidence('gemini-4-argon', 200, 'sse');
  api.absorbPeek('{"modelVersion":"gemini-4-argon","usageMetadata":{"thoughtsTokenCount":0}}', 2, ev2);
  ok('思考为 0 时 hasThink 不为真', ev2.hasThink !== true);
}

console.log('[6] 版本与静态装配');
{
  const env = makeEnv();
  ok('VERSION 可解析', /^\d+\.\d+$/.test(String(env.api.VERSION)), env.api.VERSION);
  const src = SRC;
  ok('含 INTERNAL_FETCH_KEY', src.indexOf('INTERNAL_FETCH_KEY') >= 0);
  ok('含 acu.internal-generation-fetch', src.indexOf('acu.internal-generation-fetch') >= 0);
  ok('无「折光边界」字样', src.indexOf('折光边界') < 0);
  ok('含 familyOf', src.indexOf('function familyOf') >= 0);
  ok('内部请求注释存在', src.indexOf('内部请求') >= 0);
}

console.log('\n' + (fail === 0 ? 'ALL PASS' : 'FAILED') + '  ' + pass + ' passed, ' + fail + ' failed');
process.exit(fail === 0 ? 0 : 1);
