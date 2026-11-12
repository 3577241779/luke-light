/* test_v75.mjs — v7.5：报告（人话）/ 排查（工程）两张皮 + 前缀归一化修正 */
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
    tagName: String(tag || 'div').toUpperCase(), id: '', className: '', innerHTML: '', textContent: '', innerText: '',
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
  const env = { t: 1762332000000 };
  const doc = {
    head: makeEl('head'), body: makeEl('body'), documentElement: makeEl('html'),
    createElement: (t) => makeEl(t),
    getElementById() { return null; }, querySelector() { return null; }, querySelectorAll() { return []; },
    addEventListener() {}
  };
  const store = new Map();
  const chat = o.chat || [];
  const win = {
    document: doc,
    localStorage: {
      getItem: (k) => (store.has(k) ? store.get(k) : null),
      setItem: (k, v) => { store.set(k, String(v)); }, removeItem: (k) => { store.delete(k); }
    },
    console, navigator: { userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' },
    innerWidth: 1440, matchMedia: () => ({ matches: false }),
    addEventListener() {}, removeEventListener() {},
    setTimeout: () => 0, clearTimeout() {}, setInterval: () => 0, clearInterval() {},
    fetch: () => Promise.resolve({ status: 200, ok: true }),
    XMLHttpRequest: function () {},
    SillyTavern: { getContext: () => ({ chat, chatId: o.chatId === undefined ? 'chat-A' : o.chatId }) },
    Promise, Math, JSON, String, Number, Object, Array, RegExp, Error,
    TextDecoder: globalThis.TextDecoder,
    eventOn: () => ({ stop() {} }), getButtonEvent: (n) => ({ key: n }),
    Date: (function () { const D = function () {}; D.now = () => env.t; D.parse = Date.parse; D.UTC = Date.UTC; return D; })()
  };
  win.window = win; win.self = win; win.globalThis = win; win.top = win; win.parent = win;
  vm.runInContext(SRC, vm.createContext(win), { filename: 'ar7.js' });
  env.api = win.__AR6__; env.win = win; env.doc = doc; env.store = store;
  return env;
}

function rec(over) {
  const base = {
    at: 1762332000000, rid: 7, code: 'diff', verdict: '被换', conf: 'A',
    req: 'gemini-4-argon', obs: 'gemini-3.1-flash-lite', think: true,
    ttft: 418, total: 9200, chars: 883, base: 'relay.example.com', src: 'body'
  };
  return Object.assign(base, over || {});
}

/* ---------------- 一、前缀归一化 ---------------- */
console.log('\n[一] 模型名归一化');
{
  const env = makeEnv({});
  const api = env.api;
  ok('中文前缀 + pg- 一次剥干净', api.normModel('抗截断-pg-gemini-3.8-flash') === 'gemini-3.8-flash', api.normModel('抗截断-pg-gemini-3.8-flash'));
  ok('剥完仍判得出 flash 档', api.tierOf(api.normModel('抗截断-pg-gemini-3.8-flash')) === 2);
  ok('pg- 单独也能剥', api.normModel('pg-gemini-4-argon-low') === 'gemini-4-argon-low');
}

/* ---------------- 二、报告（人话） ---------------- */
console.log('\n[二] 报告模式');
{
  const env = makeEnv({});
  const api = env.api;
  api.absorbPeek('{"modelVersion":"gemini-3.1-flash-lite","usageMetadata":{"thoughtsTokenCount":0},"candidates":[{"content":{"parts":[{"text":"正文内容"}]}}]}', 7);

  const r = rec({});
  const html = api.cardHumanHTML(r);
  ok('有「报告/排查」两个页签', html.indexOf('data-tab="human"') >= 0 && html.indexOf('data-tab="engine"') >= 0);
  ok('结论是「被换了模型」', html.indexOf('这一轮被换了模型') >= 0);
  ok('有证据清单标题', html.indexOf('证据清单') >= 0);
  ok('有强/形态/弱/缺失计数', html.indexOf('强证据') >= 0 && html.indexOf('缺失') >= 0);
  const items = api.cardEvidenceItems(r);
  const mismatch = items.filter(function (x) { return x.k === '与请求的模型是否一致'; })[0];
  ok('模型不同时这条算「强」', mismatch && mismatch.lv === '强', JSON.stringify(mismatch));
  const echoItems = api.cardEvidenceItems(rec({ obs: 'gemini-4-argon' }));
  const echoRow = echoItems.filter(function (x) { return x.k === '与请求的模型是否一致'; })[0];
  ok('模型名相同时降级为「弱」', echoRow && echoRow.lv === '弱', JSON.stringify(echoRow));
  ok('展示原生 modelVersion 值', html.indexOf('gemini-3.1-flash-lite') >= 0);
  ok('人话模式不塞原始 JSON', html.indexOf('响应原文（未加工）') < 0);

  const thin = api.cardHumanHTML(rec({ code: 'thin', verdict: '无思考', think: false, obs: 'gemini-4-argon' }));
  ok('thin 的结论文案', thin.indexOf('没在思考') >= 0, thin.slice(0, 0));

  const unk = api.cardHumanHTML(rec({ code: 'unknown', verdict: '未知', obs: '—', src: 'msg' }));
  ok('unknown 不假装没事', unk.indexOf('看不出来') >= 0 && unk.indexOf('没看见') >= 0);
  ok('unknown 时模型位显示未知', unk.indexOf('未知') >= 0);
}

/* ---------------- 三、排查（工程） ---------------- */
console.log('\n[三] 排查模式');
{
  const env = makeEnv({});
  const api = env.api;
  api.absorbPeek('{"modelVersion":"gemini-3.1-flash-lite","usageMetadata":{"thoughtsTokenCount":0}}', 7);
  const r = rec({});
  const eng = api.cardEngineHTML(r);
  ok('工程模式有响应原文', eng.indexOf('响应原文（未加工）') >= 0);
  ok('工程模式有请求/返回两栏', eng.indexOf('我请求的') >= 0 && eng.indexOf('上游回的') >= 0);
  ok('工程模式有四格形体证据', eng.indexOf('思考 token') >= 0 && eng.indexOf('速率') >= 0);
  const wrapped = api.cardHTML(r, 'engine');
  ok('工程模式自动带页签条', wrapped.indexOf('data-tab="engine"') >= 0);
  const human = api.cardHTML(r, 'human');
  ok('同一记录两种渲染不同', human !== wrapped);
  ok('默认（无参数）走工程模式', api.cardHTML(r) === wrapped);
}

/* ---------------- 四、面板按钮 ---------------- */
console.log('\n[四] 面板入口');
{
  const env = makeEnv({});
  const api = env.api;
  /* v1.1：minimized 初始为 true，render() 是关闭态；首屏要 openPanel() */
  api.openPanel();
  const html = (env.doc.body.innerHTML || '') + env.doc.body.children.map(c => c.innerHTML || '').join('');
  ok('首屏主按钮是「看报告」', html.indexOf('data-ar6="report"') >= 0 && html.indexOf('>看报告<') >= 0 && html.indexOf('📄') < 0);
  /* v1.1：独立的「排查」按钮删了 —— 排查只剩报告浮层里的第二个页签 */
  ok('首屏不再有独立「排查」按钮', html.indexOf('data-ar6="card"') < 0 && html.indexOf('🔧') < 0);
  ok('报告浮层保留「排查」页签（删掉即红）', /data-ar6-card="tab" data-tab="engine"[^>]*>排查<\/button>/.test(SRC));
}

console.log('\n' + pass + ' passed, ' + fail + ' failed');
process.exit(fail ? 1 : 0);
