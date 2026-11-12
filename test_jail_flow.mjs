/* test_jail_flow.mjs — 破甲事后补救的接线测试（不联网） */
import fs from 'node:fs';
import vm from 'node:vm';

const D = fs.readFileSync('antiroute-v8-desktop.js', 'utf8');
function el() {
  return {
    style: {}, dataset: {}, className: '', innerHTML: '', textContent: '', firstChild: null,
    children: [], parentNode: null, id: '',
    setAttribute(k, v) { this['_' + k] = v; }, getAttribute(k) { return this['_' + k] || null; },
    appendChild(c) { c.parentNode = this; this.children.push(c); if (!this.firstChild) this.firstChild = c; return c; },
    removeChild(c) { const i = this.children.indexOf(c); if (i >= 0) this.children.splice(i, 1); if (this.firstChild === c) this.firstChild = this.children[0] || null; return c; },
    remove() { if (this.parentNode) this.parentNode.removeChild(this); },
    addEventListener() {}, removeEventListener() {}, setPointerCapture() {},
    querySelector() { return null; }, querySelectorAll() { return []; },
    getBoundingClientRect() { return { width: 400, height: 300, top: 10, left: 10, right: 410, bottom: 310 }; },
    classList: { add() {}, remove() {}, toggle() {}, contains() { return false; } }
  };
}
const calls = [];
const chat = [
  { is_user: true, mes: '写一段' },
  { is_user: false, mes: '', send_date: '2026-11-03T11:00:00Z' }
];
const ctxObj = {
  chat,
  executeSlashCommandsWithOptions(cmd) { calls.push(cmd); return Promise.resolve(''); }
};
const body = el(), head = el();
const doc = {
  readyState: 'complete', documentElement: {}, body, head,
  createElement: () => el(), getElementById: () => null,
  querySelector: () => null, querySelectorAll: () => [],
  addEventListener() {}, removeEventListener() {}
};
const store = {};
const g = {
  console: { log() {}, warn() {}, error() {} },
  setTimeout: (f) => setTimeout(f, 0), clearTimeout: (id) => clearTimeout(id),
  setInterval: (f, ms) => setInterval(f, ms), clearInterval: (id) => clearInterval(id),
  localStorage: { getItem: (k) => (k in store ? store[k] : null), setItem: (k, v) => { store[k] = String(v); }, removeItem: (k) => { delete store[k]; } },
  navigator: { userAgent: 'Mozilla/5.0' }, innerWidth: 1280, innerHeight: 800,
  SillyTavern: { getContext: () => ctxObj },
  fetch: async () => ({ ok: true, status: 200, headers: { get: () => null }, clone() { return this; } }),
  addEventListener() {}, removeEventListener() {}
};
g.window = g; g.document = doc; g.URL = URL; g.Date = Date;
vm.createContext(g);
vm.runInContext(D, g, { filename: 'bundle.js' });
const api = g.__AR6__;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let pass = 0, fail = 0;
function ok(name, cond, extra) { if (cond) pass++; else { fail++; console.log('  ✗ ' + name + (extra ? ' :: ' + extra : '')); } }

function emptyEv() {
  const e = api.newEvidence('m', 200, 'sse');
  e.outputChars = 0; e.mesChars = 0; e.tail = '';
  e.sawText = false;
  return e;
}

const boot = async () => {
  calls.length = 0;
  api.setCfg('enabled', true);
  api.setCfg('safe', false);
  api.setCfg('observe', true);
  api.setCfg('jailMax', 2);
  api.setCfg('jail', 'safe');
  api.setCfg('jailConfirm', false);   /* 7.6 起默认先问，流程测试按「自动」走 */
  api.resetJL();
};

/* 1) 关着的时候不许补 */
await boot();
api.setCfg('jail', 'off');
api.finish(emptyEv(), {});
await sleep(500);
ok('关档不续写', calls.length === 0, 'calls=' + calls.length);

/* 2) 安全档：空回自动补一次 */
await boot();
api.finish(emptyEv(), {});
await sleep(700);
ok('安全档空回补写一次', calls.length === 1, 'calls=' + JSON.stringify(calls));
ok('走的是 /continue', calls[0] === '/continue', String(calls[0]));

/* 3) 第二次 */
api.getJL().at = Date.now() - 3000;
api.finish(emptyEv(), {});
await sleep(700);
ok('第二次不再自动补（v8.25 每轮最多 1 次）', calls.length === 1, 'calls=' + calls.length);

/* 4) 到上限就停 */
api.getJL().at = Date.now() - 3000;
api.finish(emptyEv(), {});
await sleep(700);
ok('补过 1 次后停手', calls.length === 1, 'calls=' + calls.length);

/* 5) 正常回复不补 */
await boot();
const good = api.newEvidence('m', 200, 'sse');
good.outputChars = 40; good.mesChars = 40; good.tail = '好的，我这就开始写。';
api.finish(good, {});
await sleep(500);
ok('正常回复不续写', calls.length === 0, 'calls=' + calls.length);

/* 6) 硬拒不补 */
await boot();
const refuse = api.newEvidence('m', 200, 'sse');
refuse.outputChars = 30; refuse.mesChars = 30; refuse.tail = 'I am sorry, but I cannot help with that.';
api.finish(refuse, {});
await sleep(500);
ok('硬拒不续写', calls.length === 0, 'calls=' + calls.length);

/* 7) 截断要补 */
await boot();
const cut = api.newEvidence('m', 200, 'sse');
cut.outputChars = 900; cut.mesChars = 900; cut.tail = '文'.repeat(880) + '，';
api.finish(cut, {});
await sleep(700);
ok('截断也补', calls.length === 1, 'calls=' + calls.length);

/* 8) 非 200 不补 */
await boot();
const bad = api.newEvidence('m', 500, 'sse');
bad.error = 'boom';
api.finish(bad, {});
await sleep(500);
ok('失败请求不补', calls.length === 0, 'calls=' + calls.length);

console.log('JAIL-FLOW ' + (fail === 0 ? 'PASS' : 'FAIL') + ' ' + pass + ' / ' + (pass + fail));
if (fail) process.exit(1);
process.exit(0);
