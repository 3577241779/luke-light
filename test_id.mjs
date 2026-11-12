/* test_id.mjs — v7.2 身份筛选模块回归（离线，vm 沙箱） */
import fs from 'node:fs';
import vm from 'node:vm';

const ROOT = 'C:/Users/23548/Documents/deepseek-harness/default-workspace/_antiroute/v8';
const D = fs.readFileSync(ROOT + '/antiroute-v8-desktop.js', 'utf8');
const M = fs.readFileSync(ROOT + '/antiroute-v8-mobile.js', 'utf8');

let pass = 0, fail = 0; const fails = [];
const ok = (n, c, x) => { if (c) pass++; else { fail++; fails.push(n + (x ? ' :: ' + x : '')); } };

function el() {
  return {
    style: {}, dataset: {}, className: '', innerHTML: '', textContent: '', firstChild: null,
    children: [], parentNode: null, id: '',
    setAttribute(k, v) { this['_a' + k] = v; },
    getAttribute(k) { return this['_a' + k] === undefined ? null : this['_a' + k]; },
    appendChild(c) { c.parentNode = this; this.children.push(c); if (!this.firstChild) this.firstChild = c; return c; },
    removeChild(c) { const i = this.children.indexOf(c); if (i >= 0) this.children.splice(i, 1); return c; },
    remove() {}, addEventListener() {}, removeEventListener() {}, setPointerCapture() {},
    querySelector() { return null; }, querySelectorAll() { return []; },
    getBoundingClientRect() { return { width: 400, height: 300, top: 10, left: 10, right: 410, bottom: 310 }; },
    classList: { add() {}, remove() {}, toggle() {}, contains() { return false; } }
  };
}

function makeEnv() {
  const store = {};
  const doc = {
    readyState: 'complete', documentElement: {}, body: el(), head: el(),
    createElement: () => el(), getElementById: () => null,
    querySelector: () => null, querySelectorAll: () => [],
    addEventListener() {}, removeEventListener() {}
  };
  const g = {
    console: { log() {}, warn() {}, error() {} },
    setTimeout: (f) => setTimeout(f, 0), clearTimeout: (id) => clearTimeout(id),
    setInterval: () => 1, clearInterval: () => {},
    localStorage: {
      getItem: (k) => (k in store ? store[k] : null),
      setItem: (k, v) => { store[k] = String(v); }, removeItem: (k) => { delete store[k]; }
    },
    navigator: { userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' },
    innerWidth: 1280, innerHeight: 800,
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

ok('API 存在', !!api);
ok('VERSION 可解析', /^\d+\.\d+$/.test(String(api.VERSION)), api && api.VERSION);
ok('导出身份筛选', typeof api.runIdentityProbe === 'function');
ok('导出 idScore', typeof api.idScore === 'function');
ok('导出 idVerdict', typeof api.idVerdict === 'function');
ok('导出 idPick', typeof api.idPick === 'function');
ok('导出 idEntries', typeof api.idEntries === 'function');

/* 逐字打分 */
const items = ['StarSrvGroupBody', 'intFragmentation', 'Kv7Qm2Lz9RxT'];
const perfect = JSON.stringify(items.map((s) => ({ id: s, copy: s, guess: 'x' })));
const r1 = api.idScore(perfect, items);
ok('全对 3/3', r1.filter((x) => x.ok).length === 3, JSON.stringify(r1.map((x) => x.ok)));
const broken = JSON.stringify([{ id: items[0], copy: items[0], guess: 'x' }, { id: items[1], copy: 'int fragmentation', guess: 'x' }, { id: items[2], copy: 'Kv7Qm2Lz9RxT', guess: 'x' }]);
const r2 = api.idScore(broken, items);
ok('空格变形判错', r2[1].ok === false);
ok('其余仍对', r2[0].ok && r2[2].ok);

/* 解析鲁棒性 */
ok('代码块 JSON', api.idEntries('```json\n[{"id":"a","copy":"a"}]\n```').length === 1);
ok('裸数组', api.idEntries('[{"id":"a","copy":"a"},{"id":"b","copy":"b"}]').length === 2);
ok('正则兜底', api.idEntries('"id":"zq","copy":"zq"').length === 1);

/* 判定语义 */
ok('0/8 = fail', api.idVerdict(0, 8).code === 'fail');
ok('8/8 = pass', api.idVerdict(8, 8).code === 'pass');
ok('4/8 = mid', api.idVerdict(4, 8).code === 'mid');
ok('样本不足', api.idVerdict(2, 3).code === 'unknown');

/* 轮换 */
const pick = api.idPick();
ok('pick ≤8', pick.length <= 8 && pick.length > 0);
ok('pick 无重复', new Set(pick).size === pick.length);

/* 无 base 时不发请求 */
api.runIdentityProbe().then((r) => {
  ok('无 base 拒绝', r.ok === false && /Base/i.test(r.msg || ''), JSON.stringify(r));

  /* 面板包含按钮 */
  const panel = api.render();
  const html = (typeof panel === 'string' ? panel : '') || '';
  /* v1.1 界面重做：12 个体检按钮从首屏撤掉，身份筛选的按钮入口（btnIco('idprobe')）也一起删了；
     算法与撞库探针都还在（runIdentityProbe 仍导出），只是现在没有 UI 能触发它。 */
  ok('v1.1 已无「身份筛选」按钮入口', D.indexOf('idprobe') < 0, 'desktop 里仍出现 idprobe');
  ok('「更多」里也不再渲染 idCard 状态行（没有入口就别留一块「未跑」）', (() => { const i = D.indexOf('function moreHTML()'); const j = D.indexOf('\n}\n', i); return i >= 0 && j > i && D.slice(i, j).indexOf('idCard()') < 0; })(), 'moreHTML 仍含 idCard()');
  ok('两包一致：都没有 idprobe 入口', M.indexOf('idprobe') < 0, 'mobile 里仍出现 idprobe');
  ok('包内含 8_probe 段', D.indexOf('8_probe.js') > 0);
  ok('包内含探针库', D.indexOf('StarSrvGroupBody') > 0);

  console.log('PASS ' + pass + ' / FAIL ' + fail);
  if (fail) { console.log(fails.join('\n')); process.exit(1); }
});
