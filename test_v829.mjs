/* test_v829.mjs — Anti-Route 8.29.0 对抗性回归（自激 / 空回误判）
 *
 * 背景：8.28.0 的主链路只用「聊天条数有没有涨」判断这一轮有没有正文，
 * 于是 /continue（就地加长同一条）、swipe、regenerate、以及被误判成内部的请求
 * 全都认不到正文 ⇒ verdict 判 empty ⇒ jailInspect 拿不到 tail 也判 empty
 * ⇒ jailConfirm 关着时自动执行 /continue ⇒ 自激。
 *
 * 跑法：node test_v829.mjs [目标文件]
 * 做法：照 test_empty_fix2.mjs 的套路，用 vm 把构建产物塞进假宿主
 *      （window/document/localStorage/console/HOST/fetch 全 stub），
 *      只通过公开出口 __AR6__ 与「行为」（日志记录、横幅、slash 调用次数）断言。
 */
import fs from 'node:fs';
import vm from 'node:vm';

const TARGET = process.argv[2] || 'C:/Users/23548/Documents/deepseek-harness/default-workspace/_antiroute/v8/antiroute-v8-desktop.js';
const SRC = fs.readFileSync(TARGET, 'utf8');

const GEN_URL = 'https://relay.example.com/v1/chat-completions/generate';
const MODEL = 'gemini-4-argon';
const RealDate = Date;

/* ---------------- 断言框架：名称 / 期望 / 实际 ---------------- */

let pass = 0, fail = 0;
const rows = [];
function ok(name, cond, expect, actual) {
  const row = { name, ok: !!cond, expect: String(expect == null ? '' : expect), actual: String(actual == null ? '' : actual) };
  rows.push(row);
  if (row.ok) { pass++; console.log('  ok   ' + name + '\n         期望：' + row.expect + '\n         实际：' + row.actual); }
  else { fail++; console.log('  FAIL ' + name + '\n         期望：' + row.expect + '\n         实际：' + row.actual); }
}
function group(title) { console.log('\n' + title); }

/* ---------------- 假 DOM ---------------- */

function makeEl(tag) {
  const el = {
    tagName: String(tag || 'div').toUpperCase(), id: '', className: '', textContent: '',
    style: {}, children: [], parentNode: null,
    appendChild(c) { c.parentNode = el; el.children.push(c); return c; },
    removeChild(c) { const i = el.children.indexOf(c); if (i >= 0) el.children.splice(i, 1); c.parentNode = null; return c; },
    insertBefore(c) { c.parentNode = el; el.children.unshift(c); return c; },
    setAttribute(k, v) { if (k === 'style') el.style.cssText = String(v); else el[k] = v; },
    getAttribute(k) { return el[k] == null ? null : String(el[k]); },
    removeAttribute(k) { delete el[k]; },
    addEventListener() {}, removeEventListener() {},
    querySelector() { return null; }, querySelectorAll() { return []; },
    classList: { contains: () => false, add: () => {}, remove: () => {}, toggle: () => {}, replace: () => {} },
    getBoundingClientRect() { return { width: 440, height: 320, top: 80, left: 80, right: 520, bottom: 400 }; },
    focus() {}, blur() {}, click() {}, closest() { return null; }, contains() { return false; },
    getContext: () => null
  };
  let html = '';
  Object.defineProperty(el, 'innerHTML', {
    get: () => html,
    set: (v) => {
      html = String(v == null ? '' : v);
      el.children.length = 0;
      /* 不真解析 HTML：mountHTML 只需要拿到那个 id 节点，够它把浮层挂上 */
      const m = /id="(ar6-card|ar6-root|ar6-bn2|ar6-style)"/.exec(html);
      if (m) { const n = makeEl('div'); n.id = m[1]; n.parentNode = el; el.children.push(n); }
    }
  });
  Object.defineProperty(el, 'firstChild', { get: () => el.children[0] || null });
  Object.defineProperty(el, 'lastChild', { get: () => el.children[el.children.length - 1] || null });
  Object.defineProperty(el, 'childNodes', { get: () => el.children });
  return el;
}

/* ---------------- 假响应 ---------------- */

function sseBody(text) {
  const payload = 'data: {"choices":[{"delta":{"content":' + JSON.stringify(String(text || '')) + '}}]}\n\ndata: [DONE]\n\n';
  const bytes = Buffer.from(payload, 'utf8');
  let sent = false;
  return {
    getReader: () => ({
      read() {
        if (sent) return Promise.resolve({ done: true, value: undefined });
        sent = true;
        return Promise.resolve({ done: false, value: new Uint8Array(bytes) });
      },
      cancel: () => Promise.resolve()
    })
  };
}

/* 200：SSE 正常回包（text 为空 = 空回） */
function resStream(text) {
  return {
    status: 200, ok: true, headers: { get: () => 'text/event-stream' },
    clone() { return { status: 200, body: sseBody(text), text: () => Promise.resolve(String(text || '')) }; }
  };
}

/* 400：错误体（带 message 字段） */
function resError(status, bodyObj) {
  const s = typeof bodyObj === 'string' ? bodyObj : JSON.stringify(bodyObj);
  return {
    status, ok: false, headers: { get: () => 'application/json' },
    clone() { return { status, text: () => Promise.resolve(s) }; }
  };
}

/* ---------------- 假宿主 ---------------- */

const flush = () => new Promise((r) => setImmediate(r));

function decodeEnt(s) {
  return String(s)
    .replace(/<[^>]*>/g, '')
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, '&');
}

function makeEnv() {
  const env = {
    t: RealDate.UTC(2026, 10, 6, 3, 40, 0),
    intervals: [], timeouts: [], handlers: {}, res: null,
    errors: [], banners: [], warns: []
  };
  const byId = new Map();
  const doc = {
    head: makeEl('head'), body: makeEl('body'), documentElement: makeEl('html'),
    createElement: (t) => makeEl(t),
    createTextNode: (t) => ({ nodeType: 3, textContent: String(t) }),
    getElementById(id) {
      if (byId.has(id)) { const c = byId.get(id); if (doc.body.children.indexOf(c) >= 0 || doc.head.children.indexOf(c) >= 0) return c; byId.delete(id); }
      for (const c of doc.body.children) if (c.id === id) { byId.set(id, c); return c; }
      for (const c of doc.head.children) if (c.id === id) { byId.set(id, c); return c; }
      return null;
    },
    querySelector() { return null; }, querySelectorAll() { return []; },
    addEventListener() {}, removeEventListener() {}
  };
  const store = new Map();
  const chat = [];
  const slash = [];
  const fakeFetch = () => Promise.resolve(env.res);
  const hostConsole = {
    log: () => {},
    info: () => {},
    warn: (...a) => { env.warns.push(a.map((x) => String(x && x.message || x)).join(' ')); },
    error: (...a) => { env.warns.push(a.map((x) => String(x && x.message || x)).join(' ')); }
  };
  const FakeDate = (function () {
    const D = function (a, b, c, d, e, f, g) {
      if (!(this instanceof D)) return new RealDate(env.t).toString();
      if (arguments.length === 0) return new RealDate(env.t);
      if (arguments.length === 1) return new RealDate(a);
      return new RealDate(a, b, c, d, e, f, g);
    };
    D.now = () => env.t;
    D.parse = RealDate.parse.bind(RealDate);
    D.UTC = RealDate.UTC.bind(RealDate);
    D.prototype = RealDate.prototype;
    return D;
  })();

  const win = {
    document: doc,
    localStorage: {
      getItem: (k) => (store.has(k) ? store.get(k) : null),
      setItem: (k, v) => { store.set(k, String(v)); },
      removeItem: (k) => { store.delete(k); },
      clear: () => store.clear()
    },
    console: hostConsole,
    navigator: { userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)', language: 'zh-CN' },
    innerWidth: 1440, innerHeight: 900, devicePixelRatio: 1,
    matchMedia: () => ({ matches: false, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {} }),
    addEventListener() {}, removeEventListener() {},
    setTimeout: (fn, ms) => { env.timeouts.push({ fn, ms }); return env.timeouts.length; },
    clearTimeout() {},
    setInterval: (fn) => { env.intervals.push(fn); return env.intervals.length; },
    clearInterval(id) { if (id > 0) env.intervals[id - 1] = null; },
    fetch: fakeFetch,
    XMLHttpRequest: function () {},
    SillyTavern: {
      getContext: () => ({
        chat,
        /* 破甲的自动补发入口：数它被调用了几次，就是「自激」的度量 */
        executeSlashCommandsWithOptions: (cmd) => { slash.push({ cmd, at: env.t }); return Promise.resolve(''); }
      })
    },
    Promise, Math, JSON, String, Number, Object, Array, RegExp, Error, Boolean, Map, Set,
    Uint8Array, TextDecoder: globalThis.TextDecoder,
    eventOn: (name, fn) => { env.handlers[name] = fn; return function () {}; },
    getButtonEvent: (n) => ({ key: n }),
    Date: FakeDate
  };
  win.window = win; win.self = win; win.globalThis = win; win.top = win; win.parent = win;
  Object.defineProperty(win, 'is_send_press', {
    get: () => !!env.busy, set: (v) => { env.busy = !!v; }, configurable: true
  });
  vm.runInContext(SRC, vm.createContext(win), { filename: 'antiroute-v829.js' });

  env.api = win.__AR6__;
  env.win = win; env.doc = doc; env.chat = chat; env.slashCalls = slash;
  return env;
}

/* ---------------- 时间泵 / 记录 / 横幅 ---------------- */

function captureBanner(env) {
  const el = env.doc.getElementById('ar6-bn2');
  if (!el) return;
  const m = /class="ar6-bt">([\s\S]*?)<\/span>/.exec(el.innerHTML || '');
  if (!m) return;
  const txt = decodeEnt(m[1]).trim();
  if (txt && env.banners[env.banners.length - 1] !== txt) env.banners.push(txt);
}

async function tick(env, ms) {
  env.t += (ms == null ? 150 : ms);
  for (const fn of env.intervals.slice()) {
    if (typeof fn === 'function') { try { fn(); } catch (e) { env.errors.push(e); } }
  }
  const due = env.timeouts.splice(0, env.timeouts.length);
  for (const it of due) {
    if (it && typeof it.fn === 'function') { try { it.fn(); } catch (e) { env.errors.push(e); } }
  }
  await flush(); await flush();
  captureBanner(env);
}

async function pump(env, n) { for (let i = 0; i < n; i++) await tick(env); }

function fireEnd(env) {
  try { if (env.handlers.stream_token_received) env.handlers.stream_token_received(); } catch (e) { env.errors.push(e); }
  try { if (env.handlers.generation_ended) env.handlers.generation_ended(); } catch (e) { env.errors.push(e); }
}

/* ---------------- 场景小工具 ---------------- */

const iso = (env) => new RealDate(env.t).toISOString();

function config(env, kv) {
  for (const k of Object.keys(kv)) env.api.setCfg(k, kv[k]);
}

function pushUser(env, mes) {
  env.chat.push({ is_user: true, mes, send_date: iso(env), name: 'User' });
}

function pushAi(env, mes, model) {
  const m = { is_user: false, mes, send_date: iso(env), name: 'AI', extra: {} };
  if (model) m.extra.model = model;
  env.chat.push(m);
  return m;
}

/* 发一次 /chat-completions/generate（带 assistant 消息 ⇒ 不是内部请求） */
async function request(env, opts) {
  const o = opts || {};
  const messages = o.messages || [
    { role: 'user', content: '上一句' },
    { role: 'assistant', content: '上一句回答' },
    { role: 'user', content: '这一句' }
  ];
  const p = env.win.fetch(GEN_URL, { method: 'POST', body: JSON.stringify(Object.assign({ model: o.model || MODEL }, o.extra || {}, { messages })) });
  if (p && typeof p.catch === 'function') p.catch((e) => env.errors.push(e));
  await flush(); await flush();
  return p;
}

/* 本轮新增的记录（没有新记录就返回 null，避免拿上一轮顶替） */
function newRecord(env, beforeLen) {
  const lg = env.api.readLog();
  return lg.length > beforeLen ? lg[0] : null;
}

/* ---------------- 第1组：十轮连续对话 ---------------- */

async function group1() {
  group('第1组 十轮连续对话：每轮都判有正文，slash 一次都不许发');
  const env = makeEnv();
  const api = env.api;
  config(env, { enabled: true, observe: true, peek: true, jail: 'safe', jailConfirm: false, safe: false });
  ok('第1组 前置：fetch 钩子已挂上', api.isHooked() === true, 'true', String(api.isHooked()));

  for (let r = 1; r <= 10; r++) {
    const before = api.readLog().length;
    const reply = '这是第' + r + '轮的回答，内容正常，句子到这里结束。';
    pushUser(env, '第' + r + '轮提问');
    env.res = resStream(reply);
    await request(env, {});
    await pump(env, 2);
    pushAi(env, reply, MODEL);
    await pump(env, 6);
    fireEnd(env);
    await pump(env, 2);
    const rec = newRecord(env, before);
    ok('第1组 第' + r + '轮 判定有正文',
      rec && rec.code !== 'empty' && Number(rec.chars) > 0,
      'code≠empty 且 chars>0',
      rec ? ('code=' + rec.code + ' chars=' + rec.chars + ' note=' + rec.note) : '无记录');
  }
  ok('第1组 十轮 slash 总次数', env.slashCalls.length === 0, '0', String(env.slashCalls.length));
  ok('第1组 十轮都留下记录', api.readLog().length === 10, '10', String(api.readLog().length));
  try { api.dispose(); } catch (e) {}
}

/* ---------------- 第2组：续写形态（条数不变，就地加长） ---------------- */

async function group2() {
  group('第2组 续写形态：末条就地改长、条数不变，也要认成正文且 chars=增量');
  const env = makeEnv();
  const api = env.api;
  config(env, { enabled: true, observe: true, peek: false, jail: 'safe', jailConfirm: false, safe: false });

  const base = '这是一段已经写好的开头，用来模拟酒馆里那条已经存在的回复。它停在句号后面，好让破甲不认为被截断。';
  const delta = '接着上一段继续写：主角推开门，屋里只有一盏灯，风从窗缝里挤进来，纸页翻了一下，他听见远处有人叫他的名字。';
  pushUser(env, '写一段开头');
  const ai = pushAi(env, base, MODEL);

  const before = api.readLog().length;
  env.res = resStream(delta);
  await request(env, {});
  await pump(env, 3);
  ai.mes = base + delta;          /* 关键：条数没变，只有末条变长 */
  ai.send_date = iso(env);
  await pump(env, 6);
  fireEnd(env);
  await pump(env, 50);

  const rec = newRecord(env, before);
  ok('第2组 判为有正文', rec && rec.code !== 'empty', 'code≠empty', rec ? ('code=' + rec.code + ' note=' + rec.note) : '无记录');
  ok('第2组 chars 等于增量', rec && Number(rec.chars) === delta.length, String(delta.length), rec ? String(rec.chars) : '无记录');
  ok('第2组 chars 至少覆盖增量（诊断：全长也算过）', rec && Number(rec.chars) >= delta.length, '≥' + delta.length, rec ? String(rec.chars) : '无记录');
  ok('第2组 不触发破甲', env.slashCalls.length === 0, '0', String(env.slashCalls.length));
  try { api.dispose(); } catch (e) {}
}

/* ---------------- 第3组：内部请求 ---------------- */

async function group3() {
  group('第3组 内部请求（数据库/填表）：没有聊天产物也不许判空回');
  const env = makeEnv();
  const api = env.api;
  config(env, { enabled: true, observe: true, peek: true, jail: 'safe', jailConfirm: false, safe: false });

  const before = api.readLog().length;
  env.res = resStream('');
  await request(env, { messages: [{ role: 'user', content: '把这张表填了' }], extra: { chat_completion_source: 'custom', reverse_proxy: 'https://api.deepseek.com/v1' } });
  await pump(env, 4);
  fireEnd(env);
  await pump(env, 30);

  const rec = newRecord(env, before);
  ok('第3组 code 是 unknown', rec && rec.code === 'unknown', 'unknown', rec ? rec.code : '无记录');
  ok('第3组 code 不是 empty', rec && rec.code !== 'empty', '≠empty', rec ? rec.code : '无记录');
  ok('第3组 记录标了 internal', rec && rec.internal === true, 'internal=true', rec ? ('internal=' + rec.internal) : '无记录');
  ok('第3组 不触发破甲', env.slashCalls.length === 0, '0', String(env.slashCalls.length));
  try { api.dispose(); } catch (e) {}
}

/* ---------------- 第4组：真空回 ---------------- */

async function group4() {
  group('第4组 真·空回：判 empty；确认开着只问不做，自动开关最多补 1 次');
  const env = makeEnv();
  const api = env.api;
  config(env, { enabled: true, observe: true, peek: true, jail: 'safe', jailConfirm: true, safe: false });

  /* 4a：确认框开着 ⇒ 只弹确认，不许自动补 */
  let before = api.readLog().length;
  pushUser(env, '写点什么');
  env.res = resStream('');
  await request(env, {});
  await pump(env, 3);
  pushAi(env, '', MODEL);
  await pump(env, 6);
  fireEnd(env);
  await pump(env, 30);

  const rec = newRecord(env, before);
  ok('第4组 真空回判 empty', rec && rec.code === 'empty', 'empty', rec ? ('code=' + rec.code + ' note=' + rec.note) : '无记录');
  ok('第4组 确认框开着时自动补发 0 次', env.slashCalls.length === 0, '0', String(env.slashCalls.length));
  const card = env.doc.getElementById('ar6-card');
  const asked = env.banners.some((b) => /要补吗/.test(b));
  ok('第4组 会弹确认框（浮层或横幅）', !!card || asked, '有确认浮层 / 「要补吗」横幅', 'card=' + !!card + ' 横幅=' + JSON.stringify(env.banners.slice(-3)));

  /* 4b：确认关掉 ⇒ 自动补一次；同一条再空一次不许补第二次 */
  api.setCfg('jailConfirm', false);
  api.resetJL();
  const n0 = env.slashCalls.length;
  before = api.readLog().length;
  pushUser(env, '再写点什么');
  env.res = resStream('');
  await request(env, {});
  await pump(env, 3);
  pushAi(env, '', MODEL);
  await pump(env, 10);
  fireEnd(env);
  await pump(env, 20);
  ok('第4组 自动开关下补了 1 次', env.slashCalls.length - n0 === 1, '1', String(env.slashCalls.length - n0));

  env.res = resStream('');
  await request(env, {});
  await pump(env, 10);
  fireEnd(env);
  await pump(env, 30);
  ok('第4组 同一条再空一次不再补', env.slashCalls.length - n0 === 1, '仍为 1', String(env.slashCalls.length - n0));
  try { api.dispose(); } catch (e) {}
}

/* ---------------- 第5组：自激刹车 ---------------- */

async function group5() {
  group('第5组 自激刹车：补过一次之后，90 秒内不许再补第二次');
  const env = makeEnv();
  const api = env.api;
  config(env, { enabled: true, observe: true, peek: true, jail: 'safe', jailConfirm: false, safe: false });

  /* 第一轮空回 ⇒ 自动补 1 次 */
  pushUser(env, '第一次');
  env.res = resStream('');
  await request(env, {});
  await pump(env, 3);
  pushAi(env, '', MODEL);
  await pump(env, 6);
  fireEnd(env);
  await pump(env, 20);
  ok('第5组 第一次自动补发生', env.slashCalls.length === 1, '1', String(env.slashCalls.length));

  /* 走 30 秒：远超 2.5s 的 gap，但仍在 90s 刹车窗口内 */
  await pump(env, 200);
  pushUser(env, '第二次');
  env.res = resStream('');
  await request(env, {});
  await pump(env, 3);
  pushAi(env, '', MODEL);
  await pump(env, 10);
  fireEnd(env);
  await pump(env, 30);
  ok('第5组 30 秒内不再补第二次', env.slashCalls.length === 1, '仍为 1', String(env.slashCalls.length));

  /* 越过 90 秒窗口后应当恢复：刹车不能变成永久锁死 */
  await pump(env, 460);
  pushUser(env, '第三次');
  env.res = resStream('');
  await request(env, {});
  await pump(env, 3);
  pushAi(env, '', MODEL);
  await pump(env, 10);
  fireEnd(env);
  await pump(env, 30);
  ok('第5组 越过窗口后允许再补（不永久卡死）', env.slashCalls.length === 2, '2', String(env.slashCalls.length));
  try { api.dispose(); } catch (e) {}
}

/* ---------------- 第6组：错误体 ---------------- */

async function group6() {
  group('第6组 错误体：400 带 message，必须判 error');
  const env = makeEnv();
  const api = env.api;
  config(env, { enabled: true, observe: true, peek: true, jail: 'safe', jailConfirm: false, safe: false });

  const before = api.readLog().length;
  pushUser(env, '来点东西');
  env.res = resError(400, { error: { code: 400, message: 'Bad Request: model not found', status: 'INVALID_ARGUMENT' } });
  await request(env, {});
  await pump(env, 10);
  fireEnd(env);
  await pump(env, 10);

  const rec = newRecord(env, before);
  ok('第6组 code 是 error', rec && rec.code === 'error', 'error', rec ? ('code=' + rec.code + ' note=' + rec.note) : '无记录');
  ok('第6组 没被当成有正文', rec && rec.code !== 'same' && rec.bodyText !== true, '≠same 且 bodyText≠true', rec ? ('code=' + rec.code + ' bodyText=' + rec.bodyText) : '无记录');
  ok('第6组 不是 empty', rec && rec.code !== 'empty', '≠empty', rec ? rec.code : '无记录');
  ok('第6组 记录了 HTTP 400', rec && rec.status === 400, '400', rec ? String(rec.status) : '无记录');
  ok('第6组 错误体不触发破甲', env.slashCalls.length === 0, '0', String(env.slashCalls.length));
  try { api.dispose(); } catch (e) {}
}

/* ---------------- 第7组：锁保护 ---------------- */

async function group7() {
  group('第7组 锁保护：锁着的时候不抛异常、也不许重复触发');
  const env = makeEnv();
  const api = env.api;
  config(env, { enabled: true, observe: true, peek: true, jail: 'safe', jailConfirm: false, safe: false });

  const jl = api.getJL();
  jl.lock = true; jl.lockAt = env.t;      /* 只上锁：count/at 都留 0，锁是唯一拦得住的东西 */

  const before = api.readLog().length;
  pushUser(env, '锁着的时候来一轮');
  env.res = resStream('');
  await request(env, {});
  await pump(env, 3);
  pushAi(env, '', MODEL);
  await pump(env, 8);
  fireEnd(env);
  await pump(env, 25);

  const rec = newRecord(env, before);
  ok('第7组 锁期间不抛异常', env.errors.length === 0, '0 个异常', env.errors.length ? (env.errors.length + ' 个，首个=' + String(env.errors[0] && env.errors[0].message || env.errors[0])) : '0 个异常');
  ok('第7组 锁期间仍写出判定记录', !!rec, '有记录', rec ? ('code=' + rec.code) : '无记录');
  ok('第7组 锁期间不重复触发破甲', env.slashCalls.length === 0, '0', String(env.slashCalls.length));
  const g = api.jailGate('probe-' + env.t);
  ok('第7组 jailGate 报 lock', !!g && g.ok === false && g.why === 'lock', '{ok:false, why:"lock"}', JSON.stringify(g));
  try { api.dispose(); } catch (e) {}
}

/* ---------------- 第8组：版本 ---------------- */

async function group8() {
  group('第8组 版本：必须是 0.4 / cfg.v = 831');
  const env = makeEnv();
  ok('第8组 api.VERSION', env.api.VERSION === '1.1', '1.1', String(env.api.VERSION));
  ok('第8组 cfg.v', env.api.getCfg().v === 831, '831', String(env.api.getCfg().v));
  const m = /var VERSION = '([^']+)'/.exec(SRC);
  ok('第8组 源码 VERSION 行', !!m && m[1] === '1.1', "var VERSION = '0.1'", m ? m[0] : '没找到');
  try { env.api.dispose(); } catch (e) {}
}

/* ---------------- 跑 ---------------- */

console.log('Anti-Route 8.29 对抗性测试');
console.log('目标：' + TARGET);
console.log('文件 VERSION：' + ((/var VERSION = '([^']+)'/.exec(SRC) || [])[1] || '?'));

try {
  await group1();
  await group2();
  await group3();
  await group4();
  await group5();
  await group6();
  await group7();
  await group8();
} catch (e) {
  console.log('\n💥 测试自身崩了：' + String(e && e.stack || e));
  fail++;
}

console.log('\n==== 汇总 ====');
console.log('通过 ' + pass + ' ｜ 失败 ' + fail + ' ｜ 共 ' + rows.length + ' 条断言');

const green = rows.filter((r) => r.ok);
const red = rows.filter((r) => !r.ok);
console.log('\n已绿（' + green.length + '）：');
for (const r of green) console.log('  ✓ ' + r.name);
if (red.length) {
  console.log('\n仍红（' + red.length + '）：');
  for (const r of red) console.log('  ✗ ' + r.name + ' ｜期望：' + r.expect + ' ｜实际：' + r.actual);
} else {
  console.log('\n仍红（0）：无');
}
process.exit(red.length ? 1 : 0);
