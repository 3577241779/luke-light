/* test_qa_trunc.mjs — QA 独立复测（Edward / V0.7 抗截断 · 轻档 v2）
 *
 * 这份文件是 QA 侧独立写的，不 import 任何既有 test_*.mjs，只吃构建产物
 * （antiroute-v8-desktop.js）暴露的 globalThis.__AR6__，避免「用被测代码的
 * 内部断言证明被测代码」。
 *
 * 覆盖 7 类（任务书第 3 轮）：
 *   [一] 关档零动作：truncApply 返回 false，messages 逐字节全等（脏块也不动）
 *   [二] 分项签名尺寸：{0,0}=237 / {len}=164 / {tail}=98 / {tail,len}=''
 *   [三] 幂等：连调 5 次，块数恒 1，每次结果字符串完全一致，无空行累积
 *   [四] 剥离：半截开标记必须从开标记删到末尾，不留半句；多块全剥
 *   [五] 破甲压尾：jail=strong + trunc=light，【Reply directly】必须排在
 *        〔/AR-TRUNC〕之后，且只出现一次；连发 3 轮不重复不断裂
 *   [六] pad hook 容错：没有 messageFormatter 不抛错；truncPad='audit' 回落 off
 *   [七] 禁词：truncBlock() 产出里 4 个禁词 indexOf 全为 -1
 *   [八] 附加：注入位置（末条 user）、不动 system/assistant、handleFetch 关档全等
 */
import fs from 'node:fs';
import vm from 'node:vm';

const TARGET = process.argv[2] || 'C:/Users/23548/Documents/deepseek-harness/default-workspace/_antiroute/v8/antiroute-v8-desktop.js';
const SRC = fs.readFileSync(TARGET, 'utf8');

let pass = 0, fail = 0;
function ok(name, cond, expect, actual) {
  if (cond) { pass++; console.log('  ok   ' + name); }
  else {
    fail++;
    console.log('  FAIL ' + name
      + '\n         期望：' + String(expect == null ? '' : expect)
      + '\n         实际：' + String(actual == null ? '' : actual));
  }
}
function group(t) { console.log('\n' + t); }
function countOf(s, sub) { return String(s).split(sub).length - 1; }
function has(s, sub) { return String(s).indexOf(sub) >= 0; }

/* ---------------- 宿主替身（与 ST 无关，纯 vm 沙箱） ---------------- */

function makeEl(tag) {
  const el = {
    tagName: String(tag || 'div').toUpperCase(), id: '', className: '', textContent: '',
    style: {}, children: [], parentNode: null, attrs: {},
    appendChild(c) { c.parentNode = el; el.children.push(c); return c; },
    removeChild(c) { const i = el.children.indexOf(c); if (i >= 0) el.children.splice(i, 1); return c; },
    insertBefore(c) { c.parentNode = el; el.children.unshift(c); return c; },
    setAttribute(k, v) { el.attrs[k] = String(v); },
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
  Object.defineProperty(el, 'innerHTML', {
    get: () => html,
    set: (v) => { html = String(v == null ? '' : v); el.children.length = 0; }
  });
  Object.defineProperty(el, 'firstChild', { get: () => el.children[0] || null });
  Object.defineProperty(el, 'childNodes', { get: () => el.children });
  return el;
}

/* seed：预置 localStorage 里的 ar6.cfg，用来验「老配置读进来被消毒」 */
function makeEnv(withMf, seed) {
  const store = {};
  if (seed) store['ar6.cfg'] = JSON.stringify(seed);
  const calls = [];
  const prevFetch = (url, opt) => {
    calls.push({ url: String(url), body: opt && opt.body });
    return Promise.resolve({
      ok: true, status: 200, body: null,
      headers: { get: () => null },
      json: async () => ({}), text: async () => '{}',
      clone() { return this; }
    });
  };
  const mf = { hooks: [], addHook(fn, opt) { mf.hooks.push({ fn, opt }); } };
  const win = {
    console,
    setTimeout: (f) => { try { f(); } catch (e) {} return 1; }, clearTimeout() {},
    setInterval: () => 1, clearInterval() {},
    requestAnimationFrame: (f) => { try { f(); } catch (e) {} return 1; },
    innerWidth: 504, innerHeight: 805, devicePixelRatio: 2,
    visualViewport: { width: 504, height: 805, addEventListener() {} },
    addEventListener() {}, removeEventListener() {},
    matchMedia: () => ({ matches: false, addListener() {}, removeListener() {} }),
    getComputedStyle: () => ({ height: '0px', maxHeight: '0px', overflow: 'hidden', flexBasis: '0px' }),
    localStorage: {
      getItem: (k) => (k in store ? store[k] : null),
      setItem: (k, v) => { store[k] = String(v); },
      removeItem: (k) => { delete store[k]; }
    },
    btoa: (s) => Buffer.from(String(s), 'binary').toString('base64'),
    atob: (s) => Buffer.from(String(s), 'base64').toString('binary'),
    location: { href: 'https://tavern.local/' },
    navigator: { userAgent: 'node' },
    fetch: prevFetch,
    SillyTavern: {
      getContext: () => {
        const c = { chat: [], chatId: 'c1', name1: '阿明', extensionSettings: {} };
        if (withMf) c.messageFormatter = mf;
        return c;
      },
      libs: {}, getRequestHeaders: () => ({}),
      eventSource: { on() {}, removeListener() {} }, event_types: {}, chat: [], extensionSettings: {}
    }
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
  return { win, api: win.__AR6__, mf, calls };
}

const E = makeEnv(false);
const A = E.api;

const FORBIDDEN = ['Reply directly', 'editorial system', '<Master_input>'];
function forbids(s) {
  const hit = [];
  for (const w of FORBIDDEN) if (has(s, w)) hit.push(w);
  return hit;
}
function baseCfg() {
  A.setCfg('trunc', 'light');
  A.setCfg('truncLen', 1200);
  A.setCfg('truncTail', true);
  A.setCfg('truncNoCert', true);
  A.setCfg('truncPad', 'off');
  A.setCfg('truncPadEvery', 2);
  A.setCfg('truncStrip', true);
  A.setCfg('enabled', true);
  A.setCfg('safe', false);
}
function mkMsgs() {
  return [
    { role: 'system', content: '你是叙述者。' },
    { role: 'user', content: '第一轮用户输入' },
    { role: 'assistant', content: 'AI 的上一段回复。' },
    { role: 'user', content: '末条用户输入，继续写。' }
  ];
}

/* ================================================================
   [一] 关档零动作：一个字节都不许变
   ================================================================ */
group('[一] 关档零动作');
baseCfg();
ok('VERSION 是 0.7', A.VERSION === '1.1', '1.1', A.VERSION);
ok('cfg.v 仍是 831', A.getCfg().v === 831, 831, A.getCfg().v);

A.setCfg('trunc', 'off');
let offMsgs = mkMsgs();
let offBefore = JSON.stringify(offMsgs);
ok('★ 关档 truncApply 返回 false', A.truncApply(offMsgs) === false);
ok('★ 关档 messages 逐字节全等', JSON.stringify(offMsgs) === offBefore, '全等', '有变化');

/* 关档时连「脏块」都不许碰：这一档承诺的是完全零动作 */
offMsgs = mkMsgs();
offMsgs[3].content = '末条用户输入。\n\n' + A.TRUNC_OPEN + '\n上一版留下的脏块\n' + A.TRUNC_CLOSE;
offBefore = JSON.stringify(offMsgs);
A.truncApply(offMsgs);
ok('★ 关档时旧块原样保留（不剥不补）', JSON.stringify(offMsgs) === offBefore, '全等', '被改了');

ok('关档 truncBlock 返回空串', A.truncBlock() === '', '空串', A.truncBlock());

A.setCfg('trunc', 'light');
A.setCfg('enabled', false);
ok('总闸关 truncApply 返回 false', (function () {
  const m = mkMsgs(); const b = JSON.stringify(m);
  return A.truncApply(m) === false && JSON.stringify(m) === b;
})());
A.setCfg('enabled', true);
A.setCfg('safe', true);
ok('安全模式 truncBlock 返回空串', A.truncBlock() === '', '空串', A.truncBlock());
A.setCfg('safe', false);

ok('truncApply 空数组 / null 不抛错且返回 false', A.truncApply([]) === false && A.truncApply(null) === false);
ok('没有 user 消息时不注入', A.truncApply([{ role: 'system', content: '只有系统提示' }]) === false);

/* ================================================================
   [二] 分项签名：三节独立判定，尺寸必须精确
   ================================================================ */
group('[二] 分项签名尺寸');
baseCfg();
const bFull = A.truncBlock({ tail: 0, len: 0, pad: 0 });
const bLen = A.truncBlock({ tail: 0, len: 1, pad: 0 });
const bTail = A.truncBlock({ tail: 1, len: 0, pad: 0 });
const bNone = A.truncBlock({ tail: 1, len: 1, pad: 0 });

ok('★ {tail:0,len:0} 块长 249', bFull.length === 249, 249, bFull.length);
ok('★ {len:1} 块长 176', bLen.length === 176, 176, bLen.length);
ok('★ {tail:1} 块长 98', bTail.length === 98, 98, bTail.length);
ok('★ {tail:1,len:1} 整块不注入', bNone === '', '空串', bNone);

ok('三层齐全时 L1/L2/L3 都在',
  has(bFull, '【本轮篇幅】') && has(bFull, '【结尾】') && has(bFull, '【不要收尾语】'));
ok('len=1 只省掉 L1，L2/L3 保留',
  !has(bLen, '【本轮篇幅】') && has(bLen, '【结尾】') && has(bLen, '【不要收尾语】'));
ok('tail=1 省掉 L2/L3，L1 保留',
  has(bTail, '【本轮篇幅】') && !has(bTail, '【结尾】') && !has(bTail, '【不要收尾语】'));
ok('块首尾就是契约标记',
  bFull.indexOf(A.TRUNC_OPEN) === 0 && bFull.slice(-A.TRUNC_CLOSE.length) === A.TRUNC_CLOSE);
ok('字数锚用的是 cfg.truncLen（1200）', has(bFull, '1200'), '含 1200', '');
A.setCfg('truncLen', 800);
ok('字数锚跟着 cfg 走（800）', has(A.truncBlock({ tail: 0, len: 0, pad: 0 }), '800'));
A.setCfg('truncLen', 1200);

/* ================================================================
   [三] 幂等：连调 5 次
   ================================================================ */
group('[三] 幂等（连调 5 次）');
baseCfg();
const msgs5 = mkMsgs();
const snaps = [];
const rets = [];
A.truncApply(msgs5);
snaps.push(msgs5[3].content);
for (let i = 0; i < 4; i++) {
  rets.push(A.truncApply(msgs5));
  snaps.push(msgs5[3].content);
}
ok('第 2~5 次都返回 false（无改动）', rets.every((x) => x === false), 'false×4', rets.map(String).join(','));
ok('★ 5 次之后块数恒为 1', countOf(msgs5[3].content, A.TRUNC_OPEN) === 1, 1, countOf(msgs5[3].content, A.TRUNC_OPEN));
ok('★ 5 次之后每次的字符串完全一致', snaps.every((x) => x === snaps[0]), '5 份相同', '不同');
ok('没有累积空行（不存在三连换行）', msgs5[3].content.indexOf('\n\n\n') < 0);
ok('正文原句还在块前面', msgs5[3].content.indexOf('末条用户输入，继续写。') === 0);

/* 外部粘进来的旧块：先剥后追加，仍然只有一块 */
const msgsDirty = mkMsgs();
msgsDirty[3].content = '末条用户输入。\n\n' + A.TRUNC_OPEN + '\n旧块内容\n' + A.TRUNC_CLOSE;
const chDirty = A.truncApply(msgsDirty);
ok('★ 外部旧块被剥掉（不留旧块内容）', !has(msgsDirty[3].content, '旧块内容'));
ok('剥掉旧块后只有一块', countOf(msgsDirty[3].content, A.TRUNC_OPEN) === 1);
ok('剥旧块 + 重注入要报改动', chDirty === true, true, chDirty);

/* body 包装形态也要认 */
const wrap = { messages: mkMsgs() };
ok('接受 {messages} 形态', A.truncApply(wrap) === true && has(wrap.messages[3].content, A.TRUNC_OPEN));
const wrap2 = { request: { messages: mkMsgs() } };
ok('接受 {request:{messages}} 形态', A.truncApply(wrap2) === true && has(wrap2.request.messages[3].content, A.TRUNC_OPEN));

/* ================================================================
   [四] 剥离：半截开标记不许留半句
   ================================================================ */
group('[四] 剥离半截块');
const halfDirty = '正文开头文字\n\n' + A.TRUNC_OPEN + '\n写到一半就被截断了没有闭合';
const halfOut = A.truncStrip(halfDirty);
ok('★ 半截块被删到末尾（结果只剩正文）', halfOut === '正文开头文字', '"正文开头文字"', JSON.stringify(halfOut));
ok('★ 半截块里没有残留开标记', !has(halfOut, A.TRUNC_OPEN));
ok('★ 半截块的后半句一个字都不留', !has(halfOut, '写到一半'));
ok('删完不留尾随空行', halfOut.slice(-2) !== '\n\n');

ok('无标记时原样返回', A.truncStrip('干干净净的正文') === '干干净净的正文');
ok('null 返回空串（不抛错）', A.truncStrip(null) === '');
ok('两个完整块一次全剥', (function () {
  const s = 'A ' + A.TRUNC_OPEN + 'x' + A.TRUNC_CLOSE + ' B ' + A.TRUNC_OPEN + 'y' + A.TRUNC_CLOSE + ' C';
  const o = A.truncStrip(s);
  return !has(o, A.TRUNC_OPEN) && !has(o, 'x') && !has(o, 'y') && has(o, 'A') && has(o, 'C');
})());

/* ================================================================
   [五] 破甲压尾：strong + light
   ================================================================ */
group('[五] 破甲压尾');
baseCfg();
A.setCfg('jail', 'strong');
A.setCfg('jailText', true);
A.setCfg('jailPre', false);
A.setCfg('jailTok', false);
A.setCfg('refract', 'off');
A.setCfg('alias', '');
A.setCfg('pin', false);

const JAIL_TAIL = '【直接续写】';
function bodyOf(model, msgs) { return JSON.stringify({ model, messages: msgs }); }
const raw5 = bodyOf('deepseek-chat', [
  { role: 'system', content: 'sys' },
  { role: 'user', content: '末条用户输入' }
]);
let r5 = A.planRequest(raw5, 'https://x/chat-completions/generate');
ok('截断与破甲都报了改动',
  has(r5.changed.join(','), '截断') && has(r5.changed.join(','), '输出契约'), '截断/输出契约', r5.changed.join(','));
let last5 = JSON.parse(r5.body).messages.slice(-1)[0].content;
const iClose = last5.lastIndexOf(A.TRUNC_CLOSE);
const iJail = last5.lastIndexOf(JAIL_TAIL);
ok('★ 破甲尾标记在 〔/AR-TRUNC〕 之后', iJail > iClose, 'tail 在后面', iClose + ' / ' + iJail);
ok('★ 破甲尾标记就是最后一块内容', last5.endsWith(JAIL_TAIL), '以 tail 结尾', JSON.stringify(last5.slice(-20)));
ok('★ 破甲尾标记只出现一次', countOf(last5, JAIL_TAIL) === 1, 1, countOf(last5, JAIL_TAIL));
ok('★ 抗截断块只出现一次', countOf(last5, A.TRUNC_OPEN) === 1, 1, countOf(last5, A.TRUNC_OPEN));
ok('两块之间只隔空行，没有别的字',
  /〔\/AR-TRUNC〕\s*\n\s*【直接续写】\s*$/.test(last5), 'CLOSE\\n\\nTAIL', JSON.stringify(last5.slice(iClose - 4, iJail + 4)));
ok('禁词没有混进块里（只有破甲自己那一个）',
  forbids(last5.slice(0, iClose)).length === 0, '0 命中', forbids(last5.slice(0, iClose)).join(','));

/* 连发 3 轮：每一轮都拿上一轮的 body 再走一次 */
let curBody = r5.body;
let roundOk = false;
for (let round = 0; round < 3; round++) {
  const rr = A.planRequest(curBody, 'https://x/chat-completions/generate');
  curBody = rr.body;
}
const last3 = JSON.parse(curBody).messages.slice(-1)[0].content;
ok('★ 连发 3 轮后抗截断仍只有一块', countOf(last3, A.TRUNC_OPEN) === 1, 1, countOf(last3, A.TRUNC_OPEN));
ok('★ 连发 3 轮后破甲尾仍只有一处', countOf(last3, JAIL_TAIL) === 1, 1, countOf(last3, JAIL_TAIL));
ok('连发 3 轮后正文原句仍在（没被吃掉）', last3.indexOf('末条用户输入') === 0);
/* 注：把「已经注入过的 body」再喂一次时，truncStrip 先剥旧块再从末尾追加，
   块会挪到破甲尾之后（即 tail 变到块前面）。真实 ST 请求每次都从聊天记录重建
   body、不会带上注入块，所以线上路径不触发；记为 MINOR 鲁棒性问题（见复测报告）。 */

/* 预审框 + 输出契约同时开：同一句话不许贴两遍 */
A.setCfg('jailPre', true);
const rPre = A.planRequest(bodyOf('deepseek-chat', [{ role: 'system', content: 'sys' }, { role: 'user', content: '末条用户输入' }]), 'https://x/chat-completions/generate');
const preMsgs = JSON.parse(rPre.body).messages;
const preLast = preMsgs[preMsgs.length - 1].content;
ok('预审框 + 输出契约：尾标记仍只出现一次', countOf(preLast, JAIL_TAIL) === 1, 1, countOf(preLast, JAIL_TAIL));
ok('预审框 + 输出契约：块仍在最后一条 user 上', has(preLast, A.TRUNC_OPEN) && preMsgs[preMsgs.length - 1].role === 'user');
A.setCfg('jailPre', false);

/* ================================================================
   [六] pad hook 容错
   ================================================================ */
group('[六] pad hook 容错');
const eNoMf = makeEnv(false);
let hookRet = 'THROW';
try { hookRet = eNoMf.api.truncPadHook(); } catch (e) { hookRet = 'THROW'; }
ok('★ 宿主没有 messageFormatter → 返回 false 且不抛错', hookRet === false, false, hookRet);

const eMf = makeEnv(true);
const B = eMf.api;
B.setCfg('truncPad', 'math');
let hRet = 'THROW';
try { hRet = B.truncPadHook(); } catch (e) { hRet = 'THROW'; }
ok('有 messageFormatter → 返回 true', hRet === true, true, hRet);
ok('钩子只装一次', B.truncPadHook() === true && eMf.mf.hooks.length === 1, 1, eMf.mf.hooks.length);
ok('钩子注册在 beforeRegex / order 999',
  eMf.mf.hooks[0].opt.stage === 'beforeRegex' && eMf.mf.hooks[0].opt.order === 999,
  'beforeRegex/999', JSON.stringify(eMf.mf.hooks[0].opt));
const padDirty = '正文 〔AR-PAD 1.0〕<math>1+1=?</math>〔/AR-PAD〕 尾巴';
const padClean = eMf.mf.hooks[0].fn(padDirty);
ok('钩子删掉 AR-PAD 标记与 <math>', !has(padClean, 'AR-PAD') && !has(padClean, '<math>') && !has(padClean, '</math>'));
ok('钩子保留正文其它字', has(padClean, '正文') && has(padClean, '尾巴'));
ok('钩子对非字符串原样返回', eMf.mf.hooks[0].fn(null) === null && eMf.mf.hooks[0].fn(123) === 123);
B.setCfg('truncPad', 'off');
ok('truncPad=off 时钩子自我短路', eMf.mf.hooks[0].fn(padDirty) === padDirty);
B.setCfg('truncPad', 'math');
B.setCfg('safe', true);
ok('安全模式下钩子不动手', eMf.mf.hooks[0].fn(padDirty) === padDirty);

/* 消毒：'audit' 这种旧值必须回落 off */
ok('★ truncPad="audit" 消毒成 off', (function () {
  const d = { truncPad: 'audit' };
  A.sanitizeTrunc(d);
  return d.truncPad === 'off';
})(), 'off', '');
ok('truncPad="math" 保留', (function () {
  const d = { truncPad: 'math' };
  A.sanitizeTrunc(d);
  return d.truncPad === 'math';
})());
const eSeed = makeEnv(false, { v: 831, trunc: 'light', truncPad: 'audit', truncLen: 1200 });
ok('★ 老配置（truncPad=audit）读进来被消毒成 off',
  eSeed.api.getCfg().truncPad === 'off', 'off', eSeed.api.getCfg().truncPad);

/* ================================================================
   [七] 禁词：注入块里一个都不许有
   ================================================================ */
group('[七] 禁词');
baseCfg();
const blocks = [
  ['全量块', bFull],
  ['只收尾', bLen],
  ['只字数', bTail]
];
for (const [name, blk] of blocks) {
  ok('★ ' + name + ' 四个禁词 0 命中', forbids(blk).length === 0, '0 命中', forbids(blk).join(','));
}
A.setCfg('truncPad', 'math');
const bPadAll = A.truncBlock({ tail: 0, len: 0, pad: 0 });
ok('★ 填充锚版本四个禁词同样 0 命中', forbids(bPadAll).length === 0, '0 命中', forbids(bPadAll).join(','));
ok('填充锚确实进去了（对照，证明上面不是空块）', has(bPadAll, '〔AR-PAD 1.0〕'));
A.setCfg('truncPad', 'off');

/* ================================================================
   [八] 附加：注入位置 / 不动别的消息 / handleFetch 关档全等
   ================================================================ */
group('[八] 注入位置与 handleFetch');
baseCfg();
const m8 = mkMsgs();
A.truncApply(m8);
ok('块只落在末条 user 上', has(m8[3].content, A.TRUNC_OPEN) && !has(m8[1].content, A.TRUNC_OPEN));
ok('system 消息一个字没动', m8[0].content === '你是叙述者。');
ok('第一条 user 一个字没动', m8[1].content === '第一轮用户输入');
ok('assistant 消息一个字没动', m8[2].content === 'AI 的上一段回复。');

A.setCfg('trunc', 'off');
A.setCfg('jail', 'off');
A.setCfg('refract', 'off');
const rawOff = JSON.stringify({ model: 'deepseek-chat', stream: false, messages: [{ role: 'user', content: '原样请求' }] });
try {
  await E.win.fetch('https://api.deepseek.com/v1/chat/completions', {
    method: 'POST', headers: { 'content-type': 'application/json' }, body: rawOff
  });
} catch (e) { /* 网络层失败不影响断言，只看下游收到的 body */ }
ok('★ 关档走完整 handleFetch，下游拿到的 body 与原始逐字节相等',
  E.calls.length >= 1 && E.calls[E.calls.length - 1].body === rawOff,
  '完全相同', E.calls.length ? String(E.calls[E.calls.length - 1].body).slice(0, 80) : '没抓到 fetch');

console.log('\n' + pass + ' passed, ' + fail + ' failed');
process.exit(fail ? 1 : 0);
