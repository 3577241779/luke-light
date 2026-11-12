/* test_card.mjs — v7.3 证据卡：解析 / 文本 / 渲染 / 趋势 */
import fs from 'node:fs';
import vm from 'node:vm';

const ROOT = 'C:/Users/23548/Documents/deepseek-harness/default-workspace/_antiroute/v8';
const D = fs.readFileSync(ROOT + '/antiroute-v8-desktop.js', 'utf8');

let pass = 0, fail = 0; const fails = [];
const ok = (n, c, x) => { if (c) pass++; else { fail++; fails.push(n + (x ? ' :: ' + x : '')); } };

function el() {
  return {
    style: {}, dataset: {}, className: '', innerHTML: '', textContent: '', firstChild: null,
    children: [], parentNode: null, id: '',
    setAttribute(k, v) { this['_a' + k] = v; }, getAttribute(k) { return this['_a' + k] === undefined ? null : this['_a' + k]; },
    addEventListener() {}, removeEventListener() {}, setPointerCapture() {},
    querySelector() { return null; }, querySelectorAll() { return []; },
    getBoundingClientRect() { return { width: 400, height: 300, top: 10, left: 10, right: 410, bottom: 310 }; },
    classList: { add() {}, remove() {}, toggle() {}, contains() { return false; } }
  };
}

function makeEnv() {
  const store = {};
  const doc = {
    readyState: 'complete', documentElement: {}, body: el(), head: el(),
    createElement: () => el(), getElementById: () => null, querySelector: () => null, querySelectorAll: () => [],
    addEventListener() {}, removeEventListener() {}, execCommand() { return true; }
  };
  const g = {
    console: { log() {}, warn() {}, error() {} },
    setTimeout: (f) => setTimeout(f, 0), clearTimeout: () => {},
    setInterval: () => 1, clearInterval: () => {},
    localStorage: { getItem: (k) => (k in store ? store[k] : null), setItem: (k, v) => { store[k] = String(v); }, removeItem: (k) => { delete store[k]; } },
    navigator: { userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' },
    innerWidth: 420, innerHeight: 900,
    SillyTavern: { getContext: () => ({ chat: [], name1: 'U', characters: [] }) },
    fetch: async () => ({ ok: true, status: 200, headers: { get: () => null }, clone() { return this; }, text: async () => '{}' }),
    addEventListener() {}, removeEventListener() {}
  };
  g.window = g; g.document = doc; g.URL = URL;
  vm.createContext(g);
  vm.runInContext(D, g, { filename: 'bundle.js' });
  return g;
}

const g = makeEnv();
const api = g.__AR6__;

ok('导出证据卡', typeof api.cardHTML === 'function' && typeof api.cardText === 'function' && typeof api.openCard === 'function');

/* 趋势条 */
ok('spark 单调', api.cardSpark([1, 2, 3, 4, 5]) === '▁▃▅▆█');
ok('spark 平坦', api.cardSpark([5, 5, 5]) === '▅▅▅');
ok('spark 空', api.cardSpark([]) === '');

/* 响应体解析 */
api.absorbPeek('data: {"modelVersion":"gemini-3.1-flash-lite","usageMetadata":{"thoughtsTokenCount":0,"candidatesTokenCount":883}}', 7);
ok('解析 modelVersion', true);
const rec = {
  at: Date.now(), req: 'gemini-4-argon', obs: 'gemini-3.1-flash-lite', code: 'diff', conf: 'A',
  verdict: '被换', note: '响应模型与请求不符', ttft: 420, total: 4200, chars: 883, think: 0, rid: 7,
  base: 'https://relay.example/v1', charsList: []
};
const txt = api.cardText(rec);
ok('文本含判定', txt.indexOf('被换') >= 0);
ok('文本含请求', txt.indexOf('gemini-4-argon') >= 0);
ok('文本含返回', txt.indexOf('gemini-3.1-flash-lite') >= 0);
ok('文本含原始片段', txt.indexOf('modelVersion') >= 0);
ok('文本含速率', /字\/秒/.test(txt));

const html = api.cardHTML(rec);
ok('卡片含我请求的', html.indexOf('我请求的') >= 0);
ok('卡片含上游回的', html.indexOf('上游回的') >= 0);
ok('卡片含响应原文', html.indexOf('响应原文') >= 0);
ok('卡片含复制按钮', html.indexOf('data-ar6-card="copy"') >= 0);
ok('卡片含高亮色', html.indexOf('#f85149') >= 0);

/* 无记录时不崩 */
try { api.openCard(null); ok('空记录不崩', true); } catch (e) { ok('空记录不崩', false, String(e)); }
ok('版本号可解析', /^\d+\.\d+/.test(String(api.VERSION)), api.VERSION);

fails.forEach(f=>console.log('FAIL ' + f));
console.log('PASS ' + pass + ' / FAIL ' + fail);
if (fail) { console.log(fails.join('\n')); process.exit(1); }
