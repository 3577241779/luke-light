/* test_v02.mjs — 破甲诊断与刹车（0.4）
 *
 * 这一版修的是「采集完整、判定有结论、展示没接上」：
 *   - 8.29 我把 salvage 整段 return 掉，连带把 blocked 与超长判定一起关死（破甲「被拦截不补」是假的）
 *   - peekBody 不判内部请求 ⇒ 插件响应体被当正文，污染路由率分母
 *   - 证据卡版本号硬写 7.3.0-test；破甲横幅写 (1/2) 实际只能补 1 次；复制不接 promise 会假成功
 *   - 新增：渠道账本（wilson 区间）、渠道指纹卡、记录导出、A/B 对照
 *
 * 跑法：node test_v02.mjs [目标文件]
 */
import fs from 'node:fs';
import vm from 'node:vm';

const TARGET = process.argv[2] || 'C:/Users/23548/Documents/deepseek-harness/default-workspace/_antiroute/v8/antiroute-v8-desktop.js';
const SRC = fs.readFileSync(TARGET, 'utf8');

const GEN_URL = 'https://relay.example.com/v1/chat-completions/generate';
const MODEL = 'gemini-4-argon';
const RealDate = Date;

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
function resStream(text) {
  return {
    status: 200, ok: true, headers: { get: () => 'text/event-stream' },
    clone() { return { status: 200, body: sseBody(text), text: () => Promise.resolve(String(text || '')) }; }
  };
}
function resError(status, bodyObj) {
  const s = typeof bodyObj === 'string' ? bodyObj : JSON.stringify(bodyObj);
  return {
    status, ok: false, headers: { get: () => 'application/json' },
    clone() { return { status, text: () => Promise.resolve(s) }; }
  };
}

/* 带 model 自述的流：证据来自响应体（B 级），用于账本与回显降级 */
function resStreamModel(text, model) {
  return {
    status: 200, ok: true, headers: { get: () => 'text/event-stream' },
    clone() {
      const payload = 'data: ' + JSON.stringify({ model, choices: [{ delta: { content: String(text || '') } }] }) + '\n\ndata: [DONE]\n\n';
      const bytes = Buffer.from(payload, 'utf8');
      let sent = false;
      return {
        status: 200,
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
        text: () => Promise.resolve(String(text || ''))
      };
    }
  };
}

const flush = () => new Promise((r) => setImmediate(r));
function decodeEnt(s) {
  return String(s).replace(/<[^>]*>/g, '')
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, '&');
}

function makeEnv() {
  const env = { t: RealDate.UTC(2026, 10, 6, 3, 40, 0), intervals: [], timeouts: [], handlers: {}, res: null, errors: [], banners: [], warns: [] };
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
    log: () => {}, info: () => {},
    warn: (...a) => { env.warns.push(a.map((x) => String((x && x.message) || x)).join(' ')); },
    error: (...a) => { env.warns.push(a.map((x) => String((x && x.message) || x)).join(' ')); }
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
      removeItem: (k) => store.delete(k),
      clear: () => store.clear()
    },
    console: hostConsole,
    navigator: {
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)', language: 'zh-CN',
      clipboard: { writeText: () => Promise.resolve() }
    },
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
        chat, name1: '阿明',
        executeSlashCommandsWithOptions: (cmd) => { slash.push({ cmd, at: env.t }); return Promise.resolve(''); }
      })
    },
    Promise, Math, JSON, String, Number, Object, Array, RegExp, Error, Boolean, Map, Set,
    Uint8Array, TextDecoder: globalThis.TextDecoder,
    btoa: (s) => Buffer.from(String(s), 'binary').toString('base64'),
    eventOn: (name, fn) => { env.handlers[name] = fn; return function () {}; },
    getButtonEvent: (n) => ({ key: n }),
    Date: FakeDate
  };
  win.window = win; win.self = win; win.globalThis = win; win.top = win; win.parent = win;
  Object.defineProperty(win, 'is_send_press', { get: () => !!env.busy, set: (v) => { env.busy = !!v; }, configurable: true });
  vm.runInContext(SRC, vm.createContext(win), { filename: 'luke-v012.js' });

  env.api = win.__AR6__;
  env.win = win; env.doc = doc; env.chat = chat; env.slashCalls = slash; env.store = store;
  return env;
}

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
  for (const fn of env.intervals.slice()) if (typeof fn === 'function') { try { fn(); } catch (e) { env.errors.push(e); } }
  const due = env.timeouts.splice(0, env.timeouts.length);
  for (const it of due) if (it && typeof it.fn === 'function') { try { it.fn(); } catch (e) { env.errors.push(e); } }
  await flush(); await flush();
  captureBanner(env);
}
async function pump(env, n) { for (let i = 0; i < n; i++) await tick(env); }
function fireEnd(env) {
  try { if (env.handlers.stream_token_received) env.handlers.stream_token_received(); } catch (e) { env.errors.push(e); }
  try { if (env.handlers.generation_ended) env.handlers.generation_ended(); } catch (e) { env.errors.push(e); }
}
const iso = (env) => new RealDate(env.t).toISOString();
function config(env, kv) { for (const k of Object.keys(kv)) env.api.setCfg(k, kv[k]); }
function pushUser(env, mes) { env.chat.push({ is_user: true, mes, send_date: iso(env), name: 'User' }); }
function pushAi(env, mes, model) {
  const m = { is_user: false, mes, send_date: iso(env), name: 'AI', extra: {} };
  if (model) m.extra.model = model;
  env.chat.push(m);
  return m;
}
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
function newRecord(env, beforeLen) {
  const lg = env.api.readLog();
  return lg.length > beforeLen ? lg[0] : null;
}
/* 与 1_core.js 的 hashStr 同算法：账本/指纹按 base 归并 */
function hashStr(s) {
  let h = 5381;
  s = String(s || '');
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0;
  return h >>> 0;
}


const V = SRC.match(/var VERSION = '([^']+)';/);

/* ---------------- 第1组：拒绝分类 ---------------- */
async function group1() {
  group('第1组 拒绝要分类：安全层拒绝 vs 只是这段没接上');
  const env = makeEnv();
  const api = env.api;
  config(env, { enabled: true, jail: 'safe', jailConfirm: true, safe: false, peek: true });

  let before = api.readLog().length;
  pushUser(env, '写点东西');
  env.res = resStream('很抱歉，我无法继续这个内容。');
  await request(env, {});
  await pump(env, 3);
  pushAi(env, '很抱歉，我无法继续这个内容。', MODEL);
  await pump(env, 6);
  fireEnd(env);
  await pump(env, 8);

  const said = env.banners.join(' / ');
  ok('第1组 语气拒绝：说「像是拒绝」', /像是拒绝/.test(said), '含「像是拒绝」', said.slice(-120) || '（没说话）');
  ok('第1组 语气拒绝：不带到「换渠道」', !/换渠道/.test(said), '不提换渠道', said.slice(-120) || '（没说话）');

  before = api.readLog().length;
  pushUser(env, '再来一次');
  env.res = resStream('I cannot help with that. It violates the content policy and safety guidelines.');
  await request(env, {});
  await pump(env, 3);
  pushAi(env, 'I cannot help with that. It violates the content policy and safety guidelines.', MODEL);
  await pump(env, 6);
  fireEnd(env);
  await pump(env, 8);
  const said2 = env.banners.slice(-3).join(' / ');
  ok('第1组 安全拒绝：认出是安全层', /安全层/.test(said2), '含「安全层」', said2 || '（没说话）');
  ok('第1组 安全拒绝：明说换渠道或换模型', /换渠道|换模型/.test(said2), '含换渠道/换模型', said2);
  ok('第1组 拒绝一律不自动补', env.slashCalls.length === 0, '0 次', String(env.slashCalls.length));
}

/* ---------------- 第2组：补的度量 ---------------- */
function group2() {
  group('第2组 补的度量：补了几次、回来几次，一行说清');
  const env = makeEnv();
  const api = env.api;
  ok('第2组 有 jailStatLine', typeof api.jailStatLine === 'function', 'function', typeof api.jailStatLine);
  const line = api.jailStatLine();
  ok('第2组 没补过时说没补过', /还没补过/.test(line), '含「还没补过」', line);
  ok('第2组 一行里带当前档位', /当前(关着|开着)/.test(line), '含当前状态', line);

  config(env, { jail: 'safe', jailConfirm: false });
  ok('第2组 开着时文案也跟着变', /当前开着/.test(api.jailStatLine()), '当前开着', api.jailStatLine());
}

/* ---------------- 第3组：源码接线 ---------------- */
function group3() {
  group('第3组 接线：分类常量、计数点、导出、说明页');
  ok('第3组 有安全层关键词表', /var JAIL_SAFETY_RE = /.test(SRC), 'JAIL_SAFETY_RE', 'ok');
  ok('第3组 拒绝带 hard 标记', /hard: !!hard/.test(SRC), 'hard 标记', 'ok');
  ok('第3组 补之前先计数', /JL\.try\+\+; JL\.pendKey = key;/.test(SRC), 'JL.try++', 'ok');
  ok('第3组 好转才计数', /JL\.ok\+\+; JL\.pendKey = '';/.test(SRC), 'JL.ok++', 'ok');
  ok('第3组 导出 jailStatLine', /jailStatLine: jailStatLine,/.test(SRC), '导出了', 'ok');
  /* v1.1：面板改成先取 jailStatus() 再 esc(jst)，不再内联 esc(jailStatLine()) */
  ok('第3组 面板显示这一行', /var jst = jailStatus\(\);/.test(SRC) && /esc\(jst\)/.test(SRC) && /class="ar6-dline ar6-mind"/.test(SRC), '面板有 jailStatus 行', 'ok');
  ok('第3组 说明页讲了能修什么', /这页管两件事：它不肯写，和它写一半停。/.test(SRC), '有这一节', 'ok');
  ok('第3组 说明页明说安全拒绝修不了', /被审核拦的：它认得出，但补了也没用/.test(SRC), '明说修不了', 'ok');
}

/* ---------------- 第4组：不越狱 ---------------- */
function group4() {
  group('第4组 边界：只诊断，不加任何「绕过拒绝」的手法');
  ok('第4组 没有自动改请求重发的循环', !/for\s*\([^)]*retry/i.test(SRC), '无 retry 循环', 'ok');
  ok('第4组 拒绝分支不调用 jailSchedule', /if \(j\.code === 'refuse'\) \{[\s\S]{0,400}return;/.test(SRC) && !/j\.hard[\s\S]{0,200}jailSchedule/.test(SRC), '不补', 'ok');
  ok('第4组 仍是一次封顶', /var max = 1;/.test(SRC), 'max=1', 'ok');
  ok('第4组 档位仍是三档', /'off'.*'safe'.*'strong'/.test(SRC) || (SRC.indexOf("'safe'") > 0 && SRC.indexOf("'strong'") > 0), 'off/safe/strong', 'ok');
}

/* ---------------- 第5组：版本 ---------------- */
function group5() {
  group('第5组 版本：0.4');
  const env = makeEnv();
  ok('第5组 api.VERSION', env.api.VERSION === '1.1', '1.1', env.api.VERSION);
  ok('第5组 源码 VERSION 行', !!V && V[1] === '1.1', "var VERSION = '1.1'", V ? V[0] : '没找到');
  ok('第5组 配置结构仍是 831', Number(env.api.getCfg().v) === 831, '831', String(env.api.getCfg().v));
}

/* ---------------- main ---------------- */
const groups = [group1, group2, group3, group4, group5];
for (const g of groups) {
  try { await g(); } catch (e) { fail++; console.log('  FAIL 组执行异常 ' + g.name + '：' + (e && e.stack || e)); }
}
console.log('\n合计：' + pass + ' 通过 / ' + fail + ' 失败');
const badList = rows.filter((r) => !r.ok);
if (badList.length) { console.log('仍红（' + badList.length + '）：'); for (const b of badList) console.log('  - ' + b.name); }
process.exit(fail ? 1 : 0);
