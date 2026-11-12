/* test_buttons.mjs — v8.31：工具栏只留 1 个入口，其余全在面板里
 *
 * 8.30 之前这里验的是「8 个动作全绑上、缺一个报 7/8」。
 * 8.31 把宿主按钮砍到 1 个纯入口，所以断言换成：
 *   ① 只绑 1 个，计数是 1/1；
 *   ② 宿主不认新名字时，老别名还能兜住（用户手里若是旧版导入的按钮配置）；
 *   ③ 点一下真的把面板打开（而不是绑了个空函数）；
 *   ④ 面板里确实有「叙述」区（防全知/去媚搬进面板的凭据）。
 */
import fs from 'node:fs';
import vm from 'node:vm';

const TARGET = process.argv[2] || 'C:/Users/23548/Documents/deepseek-harness/default-workspace/_antiroute/v8/antiroute-v8-desktop.js';
const SRC = fs.readFileSync(TARGET, 'utf8');

let pass = 0, fail = 0;
function ok(n, c, e) { if (c) { pass++; console.log('  ok   ' + n); } else { fail++; console.log('  FAIL ' + n + (e ? ' — ' + e : '')); } }

function el(tag) {
  const o = {
    tagName: String(tag || 'div').toUpperCase(), id: '', innerHTML: '', textContent: '', value: '', style: {},
    children: [], parentNode: null, _click: [],
    appendChild(c) { c.parentNode = this; this.children.push(c); return c; },
    removeChild(c) { const i = this.children.indexOf(c); if (i >= 0) this.children.splice(i, 1); return c; },
    setAttribute(k, v) { if (k === 'style') this.style.cssText = String(v); else this[k] = v; },
    getAttribute(k) { return this[k] == null ? null : String(this[k]); },
    addEventListener(t, f) { if (t === 'click' || t === 'pointerdown') this._click.push(f); },
    removeEventListener() {}, select() {}, focus() {},
    querySelector() { return null; }, querySelectorAll() { return []; },
    classList: { add() {}, remove() {}, toggle() {}, contains() { return false; } },
    getBoundingClientRect() { return { width: 430, height: 400, top: 8, left: 8, right: 438, bottom: 408 }; }
  };
  Object.defineProperty(o, 'firstChild', { get: function () { return this.children[0] || null; } });
  return o;
}

function makeEnv(opt) {
  opt = opt || {};
  const env = { t: 1762400000000, warns: [], banners: [] };
  const doc = {
    head: el('head'), body: el('body'), documentElement: el('html'),
    createElement: (t) => el(t),
    getElementById() { return null; }, querySelector() { return null; }, querySelectorAll() { return []; },
    addEventListener() {}, execCommand() { return true; }
  };
  const store = new Map(Object.entries(opt.store || {}));
  const handlers = {};
  const win = {
    document: doc,
    localStorage: {
      getItem: (k) => (store.has(k) ? store.get(k) : null),
      setItem: (k, v) => { store.set(k, String(v)); }, removeItem: (k) => { store.delete(k); }
    },
    console: { log() {}, warn: (...a) => env.warns.push(a.join(' ')), error: (...a) => env.warns.push(a.join(' ')) },
    navigator: { userAgent: opt.ua || 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' },
    innerWidth: 1440, matchMedia: () => ({ matches: false }),
    addEventListener() {}, removeEventListener() {},
    setTimeout: () => 0, clearTimeout() {}, setInterval: () => 0, clearInterval() {},
    fetch: () => Promise.resolve({ status: 200, ok: true }),
    XMLHttpRequest: function () {},
    SillyTavern: { getContext: () => ({ chat: [] }) },
    Promise, Math, JSON, String, Number, Object, Array, RegExp, Error, Boolean,
    TextDecoder: globalThis.TextDecoder, Map, Set,
    eventOn: (ev, f) => { var k = (ev && ev.key) || String(ev); handlers[k] = f; return { stop() {} }; },
    getButtonEvent: (name) => (opt.missing && opt.missing.indexOf(name) >= 0 ? null : { key: name }),
    Date: (function () { const D = function () {}; D.now = () => env.t; D.parse = Date.parse; D.UTC = Date.UTC; return D; })()
  };
  win.window = win; win.self = win; win.globalThis = win; win.top = win; win.parent = win;
  vm.runInContext(SRC, vm.createContext(win), { filename: 'ar7.js' });
  env.api = win.__AR6__; env.win = win; env.doc = doc; env.handlers = handlers; env.store = store;
  return env;
}

function htmlOf(env) {
  return env.doc.body.children.map((c) => String(c.innerHTML || '')).join('');
}

console.log('\n[一] 只绑 1 个入口');
{
  const env = makeEnv();
  const api = env.api;
  ok('VERSION 可解析', /^\d+\.\d+$/.test(String(api.VERSION)), api.VERSION);
  api.render();
  const r = api.bindScriptButtons ? api.bindScriptButtons() : false;
  ok('bindScriptButtons 返回已绑', r === true);
  ok('计数为 1/1', api.btnSummary() === '1/1', api.btnSummary());
  const keys = Object.keys(env.handlers);
  ok('绑上了「🛡 防路由」', keys.indexOf('🛡 防路由') >= 0, keys.join('|'));
  ok('没有第二个动作', keys.length === 1, String(keys.length));
  ok('旧的 8 个名字不再出现在 ACTIONS 里',
    SRC.indexOf("key: 'selftest'") < 0 && SRC.indexOf("key: 'toggle'") < 0 && SRC.indexOf("key: 'unhide'") < 0);
}

console.log('\n[二] 新名字认不出时，老别名兜住');
{
  const env = makeEnv({ missing: ['🛡 防路由', '🛡️ 防路由', '防路由'] });
  env.api.render();
  env.api.bindScriptButtons();
  const keys = Object.keys(env.handlers);
  ok('退回旧名「🛡️ 状态自检」仍绑上', keys.indexOf('🛡️ 状态自检') >= 0, keys.join('|'));
  ok('计数仍是 1/1', env.api.btnSummary() === '1/1', env.api.btnSummary());
}

console.log('\n[三] 全部认不出时不假装成功');
{
  const env = makeEnv({ missing: ['🛡 防路由', '🛡️ 防路由', '防路由', '🛡️ 状态自检', '状态自检', '自检'] });
  env.api.render();
  const r = env.api.bindScriptButtons();
  ok('返回 false', r === false, String(r));
  ok('计数 0/1', env.api.btnSummary() === '0/1', env.api.btnSummary());
  ok('留了 warn', env.warns.join('|').indexOf('工具栏按钮没绑上') >= 0, env.warns.join('|').slice(0, 140));
}

console.log('\n[四] 点一下真的打开面板');
{
  const env = makeEnv();
  const api = env.api;
  api.render();
  api.bindScriptButtons();
  api.setCfg('min', true);
  api.render();
  env.handlers['🛡 防路由']();
  ok('min 被清掉', api.getCfg().min === false, String(api.getCfg().min));
  const html = htmlOf(env);
  ok('面板真的渲染出来了', html.indexOf('卢克之光') >= 0 && html.indexOf('今天拦下') >= 0 && html.indexOf('看报告') >= 0);
  ok('面板里有「叙述」区', html.indexOf('叙述') >= 0);
  ok('面板里有防全知 chip', html.indexOf('防全知') >= 0);
  ok('面板里有去媚 chip', html.indexOf('去媚') >= 0);
}

console.log('\n[五] 页脚与源码装配');
{
  const env = makeEnv();
  env.api.render();
  const html = htmlOf(env);
  /* v1.1：旧浮层页脚（计数 0/1）随浮层一起删了，按钮合计只剩 API；首屏任何地方都不该再出现 0/1 */
  ok('旧页脚计数不再出现在首屏', html.indexOf('0/1') < 0, '首屏无 0/1');
  ok('btnSummary 仍保留为 API（只是不再渲染）', typeof env.api.btnSummary === 'function' && (env.api.btnSummary() === '0/1' || env.api.btnSummary() === '1/1'), String(env.api.btnSummary()));
  ok('源码里有 BTN_BOUND', SRC.indexOf('BTN_BOUND') >= 0);
  ok('源码里有 warn 文案', SRC.indexOf('工具栏按钮没绑上') >= 0);
  ok('源码里失败横幅存在', SRC.indexOf('按钮执行失败') >= 0);
  ok('源码里没有假装能删按钮的开关', SRC.indexOf('data-ar6="toolbar"') < 0);
}

console.log('\n[六] 卡2「破甲 + 抗截断」与卡3「叙述层」');
{
  /* v1.1：旧的四段头（防护/抗截断/破甲/叙述）合并成「破甲 + 抗截断」卡 + 「叙述层」卡，
     抗截断的档位按钮在卡2 右侧，破甲相关 chip 在卡2 的 mind 行里；字数锚挪进了「更多」。 */
  const env = makeEnv();
  const api = env.api;
  api.render();
  api.bindScriptButtons();
  api.setCfg('trunc', 'light');
  env.handlers['🛡 防路由']();
  const html = htmlOf(env);

  const iCard2 = html.indexOf('>破甲 + 抗截断<');
  const iCard3 = html.indexOf('>叙述层<');
  ok('卡2「破甲 + 抗截断」渲染出来', iCard2 >= 0, 'indexOf=' + iCard2);
  ok('卡3「叙述层」渲染出来', iCard3 >= 0, 'indexOf=' + iCard3);
  ok('卡序：破甲+抗截断 在 叙述层 之前', iCard2 >= 0 && iCard3 >= 0 && iCard2 < iCard3, iCard2 + ',' + iCard3);

  const segCard2 = html.slice(iCard2, iCard3);
  ok('卡2 里有抗截断循环按钮（轻档）', segCard2.indexOf('data-ar6="✂️ 抗截断:轻档"') >= 0, segCard2.slice(0, 160));
  ok('卡2 里有抗截断状态行', segCard2.indexOf('抗截断：轻档') >= 0, segCard2.slice(0, 200));
  ok('卡2 里有破甲 chip', segCard2.indexOf('data-ar6="🩹 破甲:') >= 0, segCard2.slice(0, 200));
  ok('★ 首屏不再有字数锚 chip（已挪进「更多」）', html.indexOf('📏 字数锚:') < 0, '首屏无 字数锚');

  const iMind = html.indexOf('ar6-mrow ar6-mind');
  const segJail = html.slice(iMind, iCard3);
  ok('★ 破甲行里不再有抗截断档位按钮', iMind >= 0 && segJail.indexOf('✂️ 抗截断:') < 0, '破甲行 = ' + segJail.slice(0, 200));
  ok('★ 破甲行里不再有字数锚', iMind >= 0 && segJail.indexOf('📏 字数锚:') < 0, '破甲行 = ' + segJail.slice(0, 200));

  /* 字数锚入口确实还在「更多」里（删了这条源码，本组变红） */
  const mhStart = SRC.indexOf('function moreHTML()');
  const mhEnd = SRC.indexOf('\n}\n', mhStart);
  const moreSrc = mhStart >= 0 && mhEnd > mhStart ? SRC.slice(mhStart, mhEnd + 2) : '';
  ok('「更多」源码里保留字数锚 chip', moreSrc.indexOf('chip(truncLenChipLabel()') >= 0, 'chip(truncLenChipLabel()');
}

console.log('\n' + pass + ' passed, ' + fail + ' failed');
process.exit(fail ? 1 : 0);
