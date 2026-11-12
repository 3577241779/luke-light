/* test_v012.mjs — 卢克之光 0.4 回归（账本 / 指纹 / 导出 / A-B / 错误体 / 假文案）
 *
 * 这一版修的是「采集完整、判定有结论、展示没接上」：
 *   - 8.29 我把 salvage 整段 return 掉，连带把 blocked 与超长判定一起关死（破甲「被拦截不补」是假的）
 *   - peekBody 不判内部请求 ⇒ 插件响应体被当正文，污染路由率分母
 *   - 证据卡版本号硬写 7.3.0-test；破甲横幅写 (1/2) 实际只能补 1 次；复制不接 promise 会假成功
 *   - 新增：渠道账本（wilson 区间）、渠道指纹卡、记录导出、A/B 对照
 *
 * 跑法：node test_v012.mjs [目标文件]
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

/* ---------------- 第1组：错误体不再被当正文，但拦截 / 超长 / 上游模型要活 ---------------- */
async function group1() {
  group('第1组 错误体：不采正文，但要认出「被拦截」和「超长」');
  const env = makeEnv();
  const api = env.api;
  config(env, { enabled: true, observe: true, peek: true, jail: 'off', safe: false });

  let before = api.readLog().length;
  env.res = resError(400, { error: { code: 'PROHIBITED_CONTENT', message: 'blocked by safety' } });
  await request(env, {});
  await pump(env, 6);
  let rec = newRecord(env, before);
  ok('第1组 400 被拦：判 blocked', rec && rec.code === 'blocked', 'blocked', rec ? rec.code + ' / ' + rec.note : '无记录');
  ok('第1组 400 被拦：note 里有拦截码', rec && /PROHIBITED/.test(String(rec.note || '')), '含 PROHIBITED', rec ? rec.note : '—');
  ok('第1组 400 不当正文：bodyText=false', rec && !rec.bodyText, 'false', rec ? String(rec.bodyText) : '—');

  before = api.readLog().length;
  env.res = resError(400, { error: { message: 'This model maximum context length is 131072 tokens' } });
  await request(env, {});
  await pump(env, 6);
  rec = newRecord(env, before);
  ok('第1组 超长：tooLong=true', rec && rec.tooLong === true, 'true', rec ? String(rec.tooLong) : '无记录');
  ok('第1组 超长：判失败而不是无正文', rec && rec.code === 'error', 'error', rec ? rec.code : '—');

  before = api.readLog().length;
  env.res = resError(500, { model: 'gpt-4o', error: { message: 'upstream boom' } });
  await request(env, {});
  await pump(env, 6);
  rec = newRecord(env, before);
  ok('第1组 错误体里的 model 只作展示', rec && rec.errModel === 'gpt-4o', 'gpt-4o', rec ? String(rec.errModel) : '无记录');
  ok('第1组 4xx/5xx 不判被换', rec && rec.code !== 'diff', '≠diff', rec ? rec.code : '—');
}

/* ---------------- 第2组：账本 ---------------- */
async function group2() {
  group('第2组 渠道账本：只收有结论的轮次，给 wilson 区间');
  const env = makeEnv();
  const api = env.api;
  config(env, { enabled: true, observe: true, peek: true, jail: 'off', safe: false, dualBase: 'https://relay.example.com', dualKey: '' });
  ok('第2组 前置：空账本不提百分比', /还没有有结论/.test(api.ledLine()), '提示先聊两轮', api.ledLine());

  const before = api.readLog().length;
  pushUser(env, '你好');
  env.res = resStreamModel('回答正常。', 'gpt-4o');   // 响应体自述跨家族 → diff（B 级）
  await request(env, {});
  await pump(env, 2);
  pushAi(env, '回答正常。', 'gpt-4o');
  await pump(env, 6);
  fireEnd(env);
  await pump(env, 2);
  const rec = newRecord(env, before);
  ok('第2组 造出一条跨家族被换', rec && rec.code === 'diff', 'diff', rec ? rec.code : '无记录');

  const st = api.ledStat();
  ok('第2组 账本记了 1 轮', st.n === 1, 'n=1', 'n=' + st.n);
  ok('第2组 被换算进 bad', st.bad === 1, 'bad=1', 'bad=' + st.bad);
  ok('第2组 n<5 明确说样本不足', st.enough === false && /样本不足/.test(api.ledLine()), '样本不足', api.ledLine());

  /* 内部请求不进账本 */
  const n0 = api.ledStat().n;
  env.res = resStream('');
  await request(env, { messages: [{ role: 'user', content: '填表' }], extra: { chat_completion_source: 'custom', reverse_proxy: 'https://api.deepseek.com/v1' } });
  await pump(env, 8);
  ok('第2组 内部请求不进账本', api.ledStat().n === n0, 'n 不变', 'n=' + api.ledStat().n);

  /* 只靠聊天标签（C 级）的轮次：记「弱证据」，不许算进被换率 */
  const before2 = api.readLog().length;
  pushUser(env, '第二句');
  env.res = resStream('回答二。');
  await request(env, {});
  await pump(env, 2);
  pushAi(env, '回答二。', 'gpt-4o');
  await pump(env, 6);
  fireEnd(env);
  await pump(env, 2);
  const rec2 = newRecord(env, before2);
  const st2 = api.ledStat();
  ok('第2组 C 级不进被换率', st2.n === 1 && Number(st2.row.weak) >= 1, 'n 仍 1 且 weak≥1',
    'n=' + st2.n + ' weak=' + st2.row.weak + ' code=' + (rec2 && rec2.code));
}

/* ---------------- 第3组：回显渠道降级（核心防误报） ---------------- */
async function group3() {
  group('第3组 回显渠道：名字对不上不许判「被换」');
  const env = makeEnv();
  const api = env.api;
  const base = 'https://relay.example.com';
  config(env, { enabled: true, observe: true, peek: true, jail: 'off', safe: false, dualBase: base, dualKey: '' });
  const k = String(hashStr(base + '|'));
  env.store.set('ar7.ch', JSON.stringify({ [k]: { echoes: true, at: Date.now(), base } }));
  ok('第3组 前置：渠道标成回显', /回显/.test(api.fpCard()), '含回显', api.fpCard().split('\n')[1] || '');

  const before = api.readLog().length;
  pushUser(env, '你好');
  env.res = resStreamModel('回答。', 'gpt-4o');   // 响应体自述 → 本该是跨家族 diff
  await request(env, {});
  await pump(env, 2);
  pushAi(env, '回答。', 'gpt-4o');
  await pump(env, 6);
  fireEnd(env);
  await pump(env, 2);
  const rec = newRecord(env, before);
  ok('第3组 判回显不判被换', rec && rec.code === 'echo', 'echo', rec ? rec.code : '无记录');
  ok('第3组 说清为什么', rec && /回显/.test(String(rec.note || '')), '含回显', rec ? rec.note : '—');
}

/* ---------------- 第4组：假文案改真 ---------------- */
function group4() {
  group('第4组 说了就要做到：横幅次数 / 证据卡版本 / 复制 promise');
  ok('第4组 破甲补发上限写死 1 次', /jailSchedule\(j, JL\.count \+ 1, 1\)/.test(SRC), '传 1', (SRC.match(/jailSchedule\(j, JL\.count \+ 1, [^)]+\)/) || [''])[0]);
  ok('第4组 不再传 cfg.jailMax', SRC.indexOf('Number(cfg.jailMax || 2)') < 0, '已删', SRC.indexOf('Number(cfg.jailMax || 2)') >= 0 ? '还在' : '已删');
  ok('第4组 证据卡版本来自 VERSION', /'版本：卢克之光 V' \+ VERSION/.test(SRC), "用 VERSION", (SRC.match(/版本：[^']*/) || [''])[0]);
  ok('第4组 不再硬写 7.3.0-test', SRC.indexOf('v7.3.0-test') < 0, '已删', SRC.indexOf('v7.3.0-test') >= 0 ? '还在' : '已删');
  ok('第4组 复制走 copyTo 并接失败分支', /function copyTo\(txt, label\)/.test(SRC) && /复制被浏览器拒绝/.test(SRC), 'copyTo + 失败横幅', 'copyTo=' + /function copyTo\(/.test(SRC));
  ok('第4组 旧的一次性拷贝不再出现', SRC.indexOf("banner('📋 已复制最近请求（前 4000 字）', 'ok')") < 0, '已删', 'ok');
}

/* ---------------- 第5组：导出 ---------------- */
async function group5() {
  group('第5组 记录导出：<=1800 字 + 机读行 + 脱敏');
  const env = makeEnv();
  const api = env.api;
  config(env, { enabled: true, observe: true, peek: true, jail: 'off', safe: false, dualBase: 'https://relay.example.com', dualKey: 'sk-secret-value-123456' });
  pushUser(env, '你好');
  env.res = resStream('一句话回答。');
  await request(env, {});
  await pump(env, 2);
  pushAi(env, '一句话回答。', MODEL);
  await pump(env, 6);
  fireEnd(env);
  await pump(env, 2);

  const t = api.exportText();
  ok('第5组 有标题行', t.indexOf('卢克之光 V' + api.VERSION) >= 0, '含版本', t.split('\n')[0]);
  ok('第5组 长度受控', t.length <= 1800, '<=1800', 'len=' + t.length);
  ok('第5组 带机读行', /#AR6LOG 1 [A-Za-z0-9+/=]+/.test(t), '#AR6LOG 1 <base64>', t.slice(-60));
  ok('第5组 不泄露 key', t.indexOf('sk-secret-value-123456') < 0, '不含 key', t.indexOf('sk-secret') >= 0 ? '泄露' : '干净');
}

/* ---------------- 第6组：A/B 对照的守门 ---------------- */
async function group6() {
  group('第6组 A/B 对照：没填 Base 不许乱发请求');
  const env = makeEnv();
  const api = env.api;
  config(env, { dualBase: '' });
  const r = await api.abProbe();
  ok('第6组 无 Base 直接拒绝', r.ok === false && /Base/.test(r.msg || ''), '先填反代 Base', JSON.stringify(r));
}

/* ---------------- 第7组：指纹卡与源码护栏 ---------------- */
function group7() {
  group('第7组 指纹卡 / 内部请求守卫 / KPI 分母');
  const env = makeEnv();
  const card = env.api.fpCard();
  ok('第7组 指纹卡有可验性', /可验性/.test(card), '含可验性', card.split('\n')[1]);
  ok('第7组 指纹卡有结论', /结论/.test(card), '含结论', card.split('\n').pop());
  ok('第7组 未验时说清只有 C 级', /未验/.test(card) && /C 级/.test(card), '未验 + C 级', card);
  ok('第7组 peek 判内部请求', /if \(ev && ev\.internal\) return null;/.test(SRC), 'internal 守卫', /ev\.internal\) return null/.test(SRC) ? '有' : '没有');
  ok('第7组 KPI 分母剔内部请求', /if \(r\.internal\) continue;/.test(SRC), '跳过 internal', /r\.internal\) continue/.test(SRC) ? '有' : '没有');
  ok('第7组 内部请求不再空等 peek', /ev\.status === 200 && ev\.rid && !ev\.internal/.test(SRC), '跳过内部', 'ok');
}

/* ---------------- 第8组：版本 ---------------- */
function group8() {
  group('第8组 版本：0.4，配置结构仍是 831');
  const env = makeEnv();
  ok('第8组 api.VERSION 与源码一致', env.api.VERSION === VER, VER, env.api.VERSION);
  ok('第8组 cfg.v 未被改名带走', Number(env.api.getCfg().v) === 831, '831', String(env.api.getCfg().v));
  const m = SRC.match(/var VERSION = '([^']+)';/);
  ok('第8组 源码 VERSION 行', !!m && m[1] === VER, "var VERSION = '" + VER + "'", m ? m[0] : '没找到');
  ok('第8组 没有 8.31.0 残留', SRC.indexOf("var VERSION = '8.31") < 0, '无', 'ok');
  ok('第8组 13_stats 已并入', /var LED_KEY = 'ar7\.led'/.test(SRC), 'ar7.led', 'ok');
}

/* ---------------- main ---------------- */
const groups = [group1, group2, group3, group4, group5, group6, group7, group8];
for (const g of groups) {
  try { await g(); } catch (e) { fail++; console.log('  FAIL 组执行异常 ' + g.name + '：' + (e && e.stack || e)); }
}
console.log('\n合计：' + pass + ' 通过 / ' + fail + ' 失败');
const badList = rows.filter((r) => !r.ok);
if (badList.length) { console.log('仍红（' + badList.length + '）：'); for (const b of badList) console.log('  - ' + b.name); }
process.exit(fail ? 1 : 0);
