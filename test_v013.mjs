/* test_v013.mjs — 检测范围 v0.4（只查 / 跳过 / 匿名 / 与破甲的关系）
 *
 * 这一版修的是「采集完整、判定有结论、展示没接上」：
 *   - 8.29 我把 salvage 整段 return 掉，连带把 blocked 与超长判定一起关死（破甲「被拦截不补」是假的）
 *   - peekBody 不判内部请求 ⇒ 插件响应体被当正文，污染路由率分母
 *   - 证据卡版本号硬写 7.3.0-test；破甲横幅写 (1/2) 实际只能补 1 次；复制不接 promise 会假成功
 *   - 新增：渠道账本（wilson 区间）、渠道指纹卡、记录导出、A/B 对照
 *
 * 跑法：node test_v013.mjs [目标文件]
 */
import fs from 'node:fs';
import vm from 'node:vm';

const TARGET = process.argv[2] || 'C:/Users/23548/Documents/deepseek-harness/default-workspace/_antiroute/v8/antiroute-v8-desktop.js';
const SRC = fs.readFileSync(TARGET, 'utf8');
const VER = (String(SRC).match(/var VERSION = '([^']+)'/) || [])[1] || '';

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


/* 一轮完整对话：请求 → 流回 → AI 消息落库 → generation_ended */
async function round(env, o) {
  const before = env.api.readLog().length;
  pushUser(env, o.q || '这一句');
  env.res = o.res || resStreamModel(o.text == null ? '回答正常。' : o.text, o.ansModel || 'gemini-4-argon');
  await request(env, { model: o.reqModel });
  await pump(env, 2);
  pushAi(env, o.text == null ? '回答正常。' : o.text, o.ansModel || 'gemini-4-argon');
  await pump(env, 6);
  fireEnd(env);
  await pump(env, 2);
  const lg = env.api.readLog();
  return lg.length > before ? lg[0] : null;
}

/* ---------------- 第1组：跳过列表 ---------------- */
async function group1() {
  group('第1组 跳过列表：不在范围的只留灰记录，不进账本、不进路由率');
  const env = makeEnv();
  const api = env.api;
  config(env, { enabled: true, observe: true, peek: true, jail: 'off', safe: false, scope: 'skip', scopeList: 'deepseek' });

  let rec = await round(env, { q: '不算', reqModel: 'deepseek-chat', ansModel: 'gemini-4-argon' });
  ok('第1组 deepseek 被跳过', rec && rec.code === 'skip', 'skip', rec ? rec.code + ' / ' + rec.note : '无记录');
  ok('第1组 跳过理由写清楚', rec && /不在检测范围/.test(String(rec.note || '')), '含「不在检测范围」', rec ? rec.note : '—');
  ok('第1组 跳过不判被换', rec && rec.code !== 'diff', '≠diff', rec ? rec.code : '—');
  ok('第1组 跳过不进账本', api.ledStat().n === 0, 'n=0', 'n=' + api.ledStat().n);
  const k = api.kpi();
  ok('第1组 跳过不进路由率', k.eff === 0, 'eff=0', 'eff=' + k.eff);

  rec = await round(env, { q: '要算', reqModel: 'gemini-4-argon', ansModel: 'gemini-4-argon', text: '回答正常。' });
  ok('第1组 范围外的照常判', rec && rec.code !== 'skip', '≠skip', rec ? rec.code : '—');
  ok('第1组 范围外的进了账本', api.ledStat().n >= 1, '>=1', 'n=' + api.ledStat().n);
}

/* ---------------- 第2组：只查列表 ---------------- */
async function group2() {
  group('第2组 只查列表：没写进来的模型一律跳过');
  const env = makeEnv();
  const api = env.api;
  config(env, { enabled: true, observe: true, peek: true, jail: 'off', safe: false, scope: 'only', scopeList: 'gemini' });

  let rec = await round(env, { q: '甲', reqModel: 'gpt-4o', ansModel: 'gpt-4o' });
  ok('第2组 只查 gemini：gpt 跳过', rec && rec.code === 'skip', 'skip', rec ? rec.code : '—');

  rec = await round(env, { q: '乙', reqModel: 'gemini-4-argon', ansModel: 'gemini-4-argon' });
  ok('第2组 只查 gemini：gemini 照判', rec && rec.code !== 'skip', '≠skip', rec ? rec.code : '—');

  rec = await round(env, { q: '丙', reqModel: 'gemini-4-argon', ansModel: 'gpt-4o' });
  ok('第2组 只查时能判出跨家族被换', rec && (rec.code === 'diff' || rec.code === 'echo'), 'diff/echo', rec ? rec.code : '—');
}

/* ---------------- 第3组：关键词与边界 ---------------- */
async function group3() {
  group('第3组 关键词：包含匹配、不分大小写、空列表不过滤、匿名不装懂');
  const env = makeEnv();
  const api = env.api;
  config(env, { enabled: true, observe: true, peek: true, jail: 'off', safe: false, scope: 'skip', scopeList: '  DEEPSEEK  ' });

  let rec = await round(env, { q: '甲', reqModel: 'deepseek-r1', ansModel: 'gemini-4-argon' });
  ok('第3组 大小写 + 前后空格不影响匹配', rec && rec.code === 'skip', 'skip', rec ? rec.code : '—');

  config(env, { scopeList: '   ' });
  rec = await round(env, { q: '乙', reqModel: 'deepseek-chat', ansModel: 'gemini-4-argon' });
  /* v1.1：请求名是 deepseek、响应体是 gemini —— 这正是「被换」的形态，不能因为
     请求名不是 Gemini 就跳过；只有请求名和证据都不是 Gemini 时才跳过。 */
  ok('第3组 请求名非 Gemini 但响应是 Gemini → 照查', rec && rec.code !== 'skip', '≠skip', rec ? rec.code : '—');
  ok('第3组 且判出跨家族', rec && rec.code === 'diff', 'diff', rec ? rec.code : '—');

  config(env, { scopeList: '   ', onlyGemini: true });
  rec = await round(env, { q: '丙', reqModel: 'gpt-4o', ansModel: 'gpt-4o', text: '回答正常。' });
  ok('第3组 请求与响应都不是 Gemini → 跳过', rec && rec.code === 'skip', 'skip', rec ? rec.code : '—');
  ok('第3组 跳过理由是「只查 Gemini」', rec && /只查 Gemini/.test(String(rec.note || '')), '含「只查 Gemini」', rec ? rec.note : '—');

  config(env, { scopeList: '   ' });
  rec = await round(env, { q: '乙二', reqModel: 'gemini-4-argon', ansModel: 'gemini-4-argon', text: '回答正常。' });
  ok('第3组 空列表对 Gemini 仍不过滤', rec && rec.code !== 'skip', '≠skip', rec ? rec.code : '—');

  config(env, { scope: 'only', scopeList: 'gemini' });
  rec = await round(env, { q: '丙', reqModel: '', ansModel: 'gemini-4-argon' });
  ok('第3组 读不到模型名时不假装在范围内', rec && rec.code !== 'skip', '不 skip', rec ? rec.code : '—');
}

/* ---------------- 第4组：与破甲的关系 ---------------- */
async function group4() {
  group('第4组 边界：空回仍然算空回（范围只管「被换」，不管「没字」）');
  const env = makeEnv();
  const api = env.api;
  config(env, { enabled: true, observe: true, peek: true, jail: 'safe', jailConfirm: true, safe: false, scope: 'skip', scopeList: 'deepseek' });

  const before = api.readLog().length;
  pushUser(env, '空一轮');
  env.res = resStream('');
  await request(env, { model: 'deepseek-chat' });
  await pump(env, 3);
  pushAi(env, '', 'deepseek-chat');
  await pump(env, 8);
  fireEnd(env);
  await pump(env, 30);
  const lg = api.readLog();
  const rec = lg.length > before ? lg[0] : null;
  ok('第4组 跳过范围也照报空回', rec && rec.code === 'empty', 'empty', rec ? rec.code : '无记录');
  ok('第4组 空回不进账本', api.ledStat().n === 0, 'n=0', 'n=' + api.ledStat().n);
}

/* ---------------- 第5组：源码与面板 ---------------- */
function group5() {
  group('第5组 接线：判定顺序、面板三档、KPI 分母');
  ok('第5组 有 scopeMatch', /function scopeMatch\(model\)/.test(SRC), 'function scopeMatch(model)', /scopeMatch\(model\)/.test(SRC) ? '有' : '没有');
  ok('第5组 判定链在「没正文」之后', SRC.indexOf('var sc = scopeMatch(ev.requestedModel);') > SRC.indexOf('if (!ev.sawText && ev.internal)'), '空回判定在前', 'ok');
  ok('第5组 判定链在模型比对之前', SRC.indexOf('var sc = scopeMatch(ev.requestedModel);') < SRC.indexOf('var req = ev.requestedModel;'), '被换判定在后', 'ok');
  ok('第5组 KPI 跳过 skip', /if \(r\.code === 'skip'\) continue;/.test(SRC), '跳过 skip', /code === 'skip'\) continue/.test(SRC) ? '有' : '没有');
  ok('第5组 面板有三档 chip', /'🎯 范围:' \+ scopeLabel\(\)/.test(SRC), 'chip 存在', 'ok');
  ok('第5组 面板有存范围按钮', /data-ar6="savescope"/.test(SRC), 'savescope', 'ok');
  ok('第5组 VERDICT 有 skip', /skip:    \{ label: '跳过'/.test(SRC), "skip 标签", 'ok');
  ok('第5组 三档循环', /cfg\.scope === 'all' \? 'skip' : \(cfg\.scope === 'skip' \? 'only' : 'all'\)/.test(SRC), 'all→skip→only→all', 'ok');
}

/* ---------------- 第6组：版本 ---------------- */
function group6() {
  group('第6组 版本：0.4');
  const env = makeEnv();
  ok('第6组 api.VERSION 与源码一致', env.api.VERSION === VER, VER, env.api.VERSION);
  const m = SRC.match(/var VERSION = '([^']+)';/);
  ok('第6组 源码 VERSION 行', !!m && m[1] === VER, "var VERSION = '" + VER + "'", m ? m[0] : '没找到');
  ok('第6组 默认不过滤', env.api.getCfg().scope === 'all', 'all', String(env.api.getCfg().scope));
}

/* ---------------- main ---------------- */
const groups = [group1, group2, group3, group4, group5, group6];
for (const g of groups) {
  try { await g(); } catch (e) { fail++; console.log('  FAIL 组执行异常 ' + g.name + '：' + (e && e.stack || e)); }
}
console.log('\n合计：' + pass + ' 通过 / ' + fail + ' 失败');
const badList = rows.filter((r) => !r.ok);
if (badList.length) { console.log('仍红（' + badList.length + '）：'); for (const b of badList) console.log('  - ' + b.name); }
process.exit(fail ? 1 : 0);
