/* test_trunc.mjs — 抗截断三档（V0.6）
 *
 * 要证明的事：
 *   1) 三档循环 关 → 轻档 → 中档 → 关；面板 chip 与状态行都在
 *   2) 判定优先级：gate > len > pause > cut > unfinished > 正常
 *      - finish=length → len；content_filter / SAFETY → gate；pause_turn → pause
 *      - finish 空 + 尾部逗号 → cut；finish 空 + 完整句子 → unfinished
 *   3) 轻档只记录/提示，绝不补（JL.count / TR.try 都不动）
 *   4) 中档只补 len/cut/pause：gate 不补；len 补且 JL.count +1；第二轮不再补（max=1）
 *   5) 关档零开销：truncAfterFinish 直接返回 ''，不判定
 */
import fs from 'node:fs';
import vm from 'node:vm';

const TARGET = process.argv[2] || 'C:/Users/23548/Documents/deepseek-harness/default-workspace/_antiroute/v8/antiroute-v8-desktop.js';
const SRC = fs.readFileSync(TARGET, 'utf8');

let pass = 0, fail = 0;
function ok(name, cond, expect, actual) {
  if (cond) { pass++; console.log('  ok   ' + name); }
  else { fail++; console.log('  FAIL ' + name + '\n         期望：' + String(expect == null ? '' : expect) + '\n         实际：' + String(actual == null ? '' : actual)); }
}
function group(t) { console.log('\n' + t); }

function makeEl(tag) {
  const el = {
    tagName: String(tag || 'div').toUpperCase(), id: '', className: '', textContent: '',
    style: {}, children: [], parentNode: null, attrs: {},
    appendChild(c) { c.parentNode = el; el.children.push(c); return c; },
    removeChild(c) { const i = el.children.indexOf(c); if (i >= 0) el.children.splice(i, 1); return c; },
    insertBefore(c) { c.parentNode = el; el.children.unshift(c); return c; },
    setAttribute(k, v) { el.attrs[k] = String(v); if (k === 'style') el.style.cssText = String(v); },
    getAttribute(k) { return el.attrs[k] == null ? null : String(el.attrs[k]); },
    removeAttribute(k) { delete el.attrs[k]; },
    addEventListener() {}, removeEventListener() {},
    querySelector() { return null; }, querySelectorAll() { return []; },
    classList: { contains: () => false, add() {}, remove() {}, toggle() {} },
    getBoundingClientRect() { return { width: 380, height: 560, top: 40, left: 10, right: 390, bottom: 600 }; },
    focus() {}, blur() {}, click() {}, closest() { return null; }, contains() { return false; },
    getContext: () => null
  };
  let html = '';
  Object.defineProperty(el, 'innerHTML', { get: () => html, set: (v) => { html = String(v == null ? '' : v); el.children.length = 0; } });
  Object.defineProperty(el, 'firstChild', { get: () => el.children[0] || null });
  Object.defineProperty(el, 'childNodes', { get: () => el.children });
  return el;
}

function boot() {
  const store = {};
  const win = {
    console, setTimeout: (f) => { try { f(); } catch (e) {} return 1; }, clearTimeout() {},
    setInterval: () => 1, clearInterval() {}, requestAnimationFrame: (f) => { try { f(); } catch (e) {} return 1; },
    innerWidth: 504, innerHeight: 805, devicePixelRatio: 2,
    visualViewport: { width: 504, height: 805, addEventListener() {} },
    addEventListener() {}, removeEventListener() {}, matchMedia: () => ({ matches: false, addListener() {}, removeListener() {} }),
    getComputedStyle: () => ({ height: '0px', maxHeight: '0px', overflow: 'hidden', flexBasis: '0px' }),
    localStorage: { getItem: (k) => (k in store ? store[k] : null), setItem: (k, v) => { store[k] = String(v); }, removeItem: (k) => { delete store[k]; } },
    btoa: (s) => Buffer.from(String(s), 'binary').toString('base64'),
    atob: (s) => Buffer.from(String(s), 'base64').toString('binary'),
    location: { href: 'https://tavern.local/' }, navigator: { userAgent: 'node' },
    fetch: () => Promise.reject(new Error('no-net')),
    SillyTavern: { getContext: () => ({ chat: [], chatId: 'c1', name1: '阿明' }), libs: {}, getRequestHeaders: () => ({}), eventSource: { on() {}, removeListener() {} }, event_types: {}, chat: [], extensionSettings: {} }
  };
  const body = makeEl('body');
  win.document = {
    body, documentElement: makeEl('html'), head: makeEl('head'), title: '',
    createElement: (t) => makeEl(t), createTextNode: (t) => ({ nodeValue: String(t) }),
    getElementById: () => null, querySelector: () => null, querySelectorAll: () => [],
    addEventListener() {}, removeEventListener() {}
  };
  win.window = win; win.self = win; win.globalThis = win; win.top = win; win.parent = win;
  const ctx = vm.createContext(win);
  vm.runInContext(SRC, ctx, { filename: 'antiroute.js' });
  return { win, api: win.__AR6__ };
}

const m = boot();
const A = m.api;

/* 事件工厂：只带判定要用的字段 */
function mkEv(o) {
  const e = { status: 200, finish: '', tail: '', mesChars: 0 };
  for (const k in (o || {})) e[k] = o[k];
  return e;
}
/* 每一发之前把会话状态清干净（JL 是补写预算，TR 是本次记录） */
function reset() { A.resetJL(); A.resetTR(); }

/* ---------------- [一] 三档循环 + 面板 ---------------- */
group('[一] 三档循环');
ok('默认是关', A.getCfg().trunc === 'off', 'off', A.getCfg().trunc);
ok('关 → 轻档', A.truncNext('off') === 'light', 'light', A.truncNext('off'));
ok('轻档 → 中档', A.truncNext('light') === 'medium', 'medium', A.truncNext('light'));
ok('中档 → 关', A.truncNext('medium') === 'off', 'off', A.truncNext('medium'));
ok('档名是「关」', A.truncLabel('off') === '关', '关', A.truncLabel('off'));
ok('档名是「轻档」', A.truncLabel('light') === '轻档', '轻档', A.truncLabel('light'));
ok('档名是「中档」', A.truncLabel('medium') === '中档', '中档', A.truncLabel('medium'));
ok('面板有抗截断 chip', SRC.indexOf('truncChipLabel()') >= 0 && SRC.indexOf("'✂️ 抗截断:'") >= 0);
ok('面板状态行走 truncStatLine', SRC.indexOf('esc(truncStatLine())') >= 0);
ok('chip 点三次回到关', A.truncNext(A.truncNext(A.truncNext('off'))) === 'off');

A.setCfg('trunc', 'medium');
A.openPanel();   /* v1.1：初始 minimized=true，render() 是关闭态；必须走 openPanel 才有首屏 */
const html = m.win.document.body.children.map((c) => String(c.innerHTML || '')).join('');
ok('中档时面板写着「抗截断：中档」', html.indexOf('抗截断：中档') >= 0, '有「抗截断：中档」', html.slice(0, 0));
ok('chip 的 act key 带档位', html.indexOf('data-ar6="✂️ 抗截断:中档"') >= 0, '有 data-ar6="✂️ 抗截断:中档"', '');
A.setCfg('trunc', 'off');

/* ---------------- [二] 判定 ---------------- */
group('[二] 判定');
const j = (o) => A.truncInspect(mkEv(o));

ok('finish=length → len', j({ finish: 'length', mesChars: 900, tail: '……' }).code === 'len', 'len', j({ finish: 'length', mesChars: 900, tail: '……' }).code);
ok('finish=max_tokens → len', j({ finish: 'max_tokens', mesChars: 900, tail: '……' }).code === 'len', 'len', j({ finish: 'max_tokens', mesChars: 900, tail: '……' }).code);
ok('finish=content_filter → gate', j({ finish: 'content_filter', mesChars: 40, tail: '不给写' }).code === 'gate', 'gate', j({ finish: 'content_filter', mesChars: 40, tail: '不给写' }).code);
ok('finish=SAFETY → gate', j({ finish: 'SAFETY', mesChars: 40, tail: '不给写' }).code === 'gate', 'gate', j({ finish: 'SAFETY', mesChars: 40, tail: '不给写' }).code);
ok('finish=pause_turn → pause', j({ finish: 'pause_turn', mesChars: 900, tail: '……' }).code === 'pause', 'pause', j({ finish: 'pause_turn', mesChars: 900, tail: '……' }).code);
ok('finish 空 + 尾部逗号 → cut', j({ finish: '', mesChars: 300, tail: '他把门推开，' }).code === 'cut', 'cut', j({ finish: '', mesChars: 300, tail: '他把门推开，' }).code);
ok('cut 的 note 说人话', j({ finish: '', mesChars: 300, tail: '他把门推开，' }).note === '停在逗号/冒号', '停在逗号/冒号', j({ finish: '', mesChars: 300, tail: '他把门推开，' }).note);
ok('finish 空 + 完整句子 → unfinished', j({ finish: '', mesChars: 900, tail: '这是一段完整的话。' }).code === 'unfinished', 'unfinished', j({ finish: '', mesChars: 900, tail: '这是一段完整的话。' }).code);
ok('finish=stop → 正常', j({ finish: 'stop', mesChars: 900, tail: '这是一段完整的话。' }).code === '', '', j({ finish: 'stop', mesChars: 900, tail: '这是一段完整的话。' }).code);
ok('拒绝话术也算 gate', j({ finish: '', mesChars: 120, tail: '抱歉，我无法提供这个。' }).code === 'gate', 'gate', j({ finish: '', mesChars: 120, tail: '抱歉，我无法提供这个。' }).code);
ok('gate 优先于 len', j({ finish: 'content_filter', mesChars: 900, tail: '……' }).code === 'gate', 'gate', j({ finish: 'content_filter', mesChars: 900, tail: '……' }).code);

/* ---------------- [三] 轻档只提示不补 ---------------- */
group('[三] 轻档不补');
A.setCfg('trunc', 'light');
A.setCfg('jail', 'safe');
reset();
const c1 = A.truncAfterFinish(mkEv({ finish: 'content_filter', mesChars: 40, tail: '不给写' }));
ok('轻档 gate：只出 code，不补', c1 === 'gate' && A.getJL().count === 0 && A.getTR().try === 0, 'gate / count 0 / try 0', c1 + ' / ' + A.getJL().count + ' / ' + A.getTR().try);
ok('轻档 gate：记录写进 TR', A.getTR().code === 'gate', 'gate', A.getTR().code);
reset();
const c2 = A.truncAfterFinish(mkEv({ finish: 'length', mesChars: 900, tail: '……' }));
ok('轻档 len：不补', c2 === 'len' && A.getJL().count === 0 && A.getTR().try === 0, 'len / count 0 / try 0', c2 + ' / ' + A.getJL().count + ' / ' + A.getTR().try);
ok('轻档状态行说「本次没补过」', /抗截断：轻档 · 本次没补过/.test(A.truncStatLine()), '抗截断：轻档 · 本次没补过', A.truncStatLine());
ok('轻档状态行带最近一次原因', A.truncStatLine().indexOf('最近一次：') >= 0, '带最近一次', A.truncStatLine());

/* ---------------- [四] 中档只补 len/cut/pause ---------------- */
group('[四] 中档补写');
A.setCfg('trunc', 'medium');
reset();
const c3 = A.truncAfterFinish(mkEv({ finish: 'content_filter', mesChars: 40, tail: '不给写' }));
ok('中档 gate 绝不补', c3 === 'gate' && A.getJL().count === 0 && A.getTR().try === 0, 'gate / count 0 / try 0', c3 + ' / ' + A.getJL().count + ' / ' + A.getTR().try);
reset();
const c4 = A.truncAfterFinish(mkEv({ finish: 'length', mesChars: 900, tail: '……' }));
ok('中档 len 触发补写', c4 === 'len' && A.getJL().count === 1, 'len / count 1', c4 + ' / ' + A.getJL().count);
ok('中档 len 记了 try=1', A.getTR().try === 1, 1, A.getTR().try);
/* 单轮第二次：把 2.5s 的间隔与回声刹车都让开，只留 max=1 拦它 */
const jl = A.getJL();
jl.at = Date.now() - 3000;
jl.selfAt = 0;
const c5 = A.truncAfterFinish(mkEv({ finish: 'length', mesChars: 900, tail: '……' }));
ok('单轮第二次 len 不再补', c5 === 'len' && A.getJL().count === 1 && A.getTR().try === 1, 'count 仍 1 / try 仍 1', A.getJL().count + ' / ' + A.getTR().try);
ok('中档状态行说补过', /抗截断：中档 · 本次补过 1 次/.test(A.truncStatLine()), '抗截断：中档 · 本次补过 1 次', A.truncStatLine());
reset();
const c6 = A.truncAfterFinish(mkEv({ finish: '', mesChars: 300, tail: '他把门推开，' }));
ok('中档 cut 会补', c6 === 'cut' && A.getJL().count === 1, 'cut / count 1', c6 + ' / ' + A.getJL().count);
reset();
const c7 = A.truncAfterFinish(mkEv({ finish: '', mesChars: 900, tail: '这是一段完整的话。' }));
ok('中档 unfinished 不补', c7 === 'unfinished' && A.getJL().count === 0, 'unfinished / count 0', c7 + ' / ' + A.getJL().count);

/* ---------------- [四·补] 回声刹车只放过、不清零点（V0.6.1 修的 M1） ---------------- */
group('[四·补] 回声刹车');
A.setCfg('trunc', 'medium');
reset();
A.getJL().selfAt = Date.now() - 30000;      /* 30 秒前刚补过：还在 90 秒窗口内 */
const c9 = A.truncAfterFinish(mkEv({ finish: 'length', mesChars: 900, tail: '……' }));
ok('回声窗口内不再补', c9 === '' && A.getJL().count === 0 && A.getTR().try === 0, '空 / count 0 / try 0', c9 + ' / ' + A.getJL().count + ' / ' + A.getTR().try);
ok('★ 不替 jail 清 JL.selfAt —— 清零点必须唯一', A.getJL().selfAt > 0, '仍 > 0', A.getJL().selfAt);
ok('回声放过不污染 TR', A.getTR().code === '' , '空', A.getTR().code);

/* ---------------- [五] 关档零开销 ---------------- */
group('[五] 关档');
A.setCfg('trunc', 'off');
reset();
const c8 = A.truncAfterFinish(mkEv({ finish: 'length', mesChars: 900, tail: '……' }));
ok('关档直接返回空', c8 === '', '', c8);
ok('关档不写 TR', A.getTR().code === '' && A.getTR().try === 0, '空 / 0', A.getTR().code + ' / ' + A.getTR().try);
ok('关档状态行说明关着', A.truncStatLine() === '抗截断：关（不判定、不提示、不补）', '抗截断：关（不判定、不提示、不补）', A.truncStatLine());

/* ---------------- [六] 版本与配置 ---------------- */
group('[六] 版本与配置');
ok('VERSION = 0.7', A.VERSION === '1.1', '1.1', A.VERSION);
ok('配置结构版本仍是 831', A.getCfg().v === 831, 831, A.getCfg().v);
ok('只加了 trunc 一个键', SRC.indexOf('truncAuto') < 0 && SRC.indexOf('truncMax') < 0 && SRC.indexOf('truncTok') < 0 && SRC.indexOf('truncFloor') < 0 && SRC.indexOf('truncMark') < 0 && SRC.indexOf('truncRoute') < 0, '没有额外死配置', '');
ok('net 里把 finish 抄进了事件', SRC.indexOf('if (ev && fin) ev.finish = fin;') >= 0);
ok('net 里先抗截断再破甲', SRC.indexOf('truncAfterFinish(ev, tRes)') >= 0 && SRC.indexOf('truncAfterFinish(ev, tRes)') < SRC.indexOf('try { jailAfterFinish(ev); }'), 'trunc 在 jail 之前', '');
ok('破甲让出截断这一类', SRC.indexOf("if (j.code === 'trunc' && (ev.__truncCode || (cfg.trunc && cfg.trunc !== 'off'))) return;") >= 0);
ok('卡片有「本轮停止原因」', SRC.indexOf('本轮停止原因：') >= 0);

console.log('\n' + pass + ' passed, ' + fail + ' failed');
process.exit(fail ? 1 : 0);
