/* test_trunc_v2.mjs — 抗截断 · 轻档 v2（V0.7）
 *
 * 要证明的事：
 *   1) 六个新配置键的默认值与消毒（truncLen 只认 0/800/1200/1800）
 *   2) truncBlock 四层分层开关：L1 字数锚 / L2 收尾契约 / L3 反自我认证 / F 填充锚
 *   3) 分项签名：tail 顶掉结尾两节、len 顶掉字数锚、pad 顶掉填充锚、三项全顶掉 → 不注入
 *   4) truncApply：贴在末条 user、先剥旧块再追加、连调 3 次只有一块、关档零动作
 *   5) truncPadHook：没有 messageFormatter 时静默返回 false；有 addHook 时只装一次
 *   6) 四个禁词在注入块里 0 命中（7_jail.js:18 的 JAIL_OWN_RE 会整段吃掉破甲）
 *   7) UI：字数锚 chip 循环 0 → 800 → 1200 → 1800 → 0，状态行区分关 / 轻档 / 中档
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

/* withMf=true 时装一个假的 messageFormatter，用来验 addHook；false 时装作老 ST（只有 getContext） */
function makeEnv(withMf) {
  const store = {};
  const mf = { hooks: [], addHook(fn, opt) { mf.hooks.push({ fn, opt }); } };
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
    SillyTavern: {
      getContext: () => {
        const c = { chat: [], chatId: 'c1', name1: '阿明', extensionSettings: {} };
        if (withMf) c.messageFormatter = mf;
        return c;
      },
      libs: {}, getRequestHeaders: () => ({}), eventSource: { on() {}, removeListener() {} }, event_types: {}, chat: [], extensionSettings: {}
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
  return { win, api: win.__AR6__, mf, body };
}

const A = makeEnv(false).api;

const FORBIDDEN = ['Reply directly', 'editorial system', '<Master_input>', '<content>'];
function forbids(s) {
  const hit = [];
  for (const w of FORBIDDEN) if (String(s).indexOf(w) >= 0) hit.push(w);
  return hit;
}
function countOf(s, sub) { return String(s).split(sub).length - 1; }
function cfgSetter(k, v) { A.setCfg(k, v); }
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

/* ================================================================
   [一] 配置默认值 + 消毒
   ================================================================ */
group('[一] 配置默认值与消毒');
const c0 = A.getCfg();
ok('truncLen 默认 1200', c0.truncLen === 1200, 1200, c0.truncLen);
ok('truncTail 默认 true', c0.truncTail === true, true, c0.truncTail);
ok('truncNoCert 默认 true', c0.truncNoCert === true, true, c0.truncNoCert);
ok('truncPad 默认 off', c0.truncPad === 'off', 'off', c0.truncPad);
ok('truncPadEvery 默认 2', c0.truncPadEvery === 2, 2, c0.truncPadEvery);
ok('truncStrip 默认 true', c0.truncStrip === true, true, c0.truncStrip);
ok('配置结构版本仍是 831（不抬版本，不重跑迁移）', c0.v === 831, 831, c0.v);
ok('VERSION = 0.7', A.VERSION === '1.1', '1.1', A.VERSION);

const d1 = { truncLen: 999 };
A.sanitizeTrunc(d1);
ok('truncLen=999 消毒成 1200', d1.truncLen === 1200, 1200, d1.truncLen);
const d2 = { truncLen: 800 };
A.sanitizeTrunc(d2);
ok('truncLen=800 保留', d2.truncLen === 800, 800, d2.truncLen);
const d3 = { truncLen: '0' };
A.sanitizeTrunc(d3);
ok('truncLen="0" 认成 0（关）', d3.truncLen === 0, 0, d3.truncLen);
const d3b = { truncLen: 1800 };
A.sanitizeTrunc(d3b);
ok('truncLen=1800 保留', d3b.truncLen === 1800, 1800, d3b.truncLen);
const d4 = { truncPad: 'bogus', truncPadEvery: 99 };
A.sanitizeTrunc(d4);
ok('truncPad 非法值回落 off', d4.truncPad === 'off', 'off', d4.truncPad);
const d4b = { truncPad: 'audit' };
A.sanitizeTrunc(d4b);
ok('truncPad 只认 off|math（audit 已删，回落 off）', d4b.truncPad === 'off', 'off', d4b.truncPad);
const d4c = { truncPad: 'math' };
A.sanitizeTrunc(d4c);
ok('truncPad=math 保留', d4c.truncPad === 'math', 'math', d4c.truncPad);
ok('truncPadEvery 上限 6', d4.truncPadEvery === 6, 6, d4.truncPadEvery);
const d5 = { truncTail: false, truncNoCert: false, truncStrip: false };
A.sanitizeTrunc(d5);
ok('三个开关的 false 不会被消毒改回 true', d5.truncTail === false && d5.truncNoCert === false && d5.truncStrip === false, '全 false', [d5.truncTail, d5.truncNoCert, d5.truncStrip].join('/'));
const d6 = { trunc: 'weird' };
A.sanitizeTrunc(d6);
ok('trunc 非法值回落 off', d6.trunc === 'off', 'off', d6.trunc);
ok('truncLenNext：0 → 800', A.truncLenNext(0) === 800, 800, A.truncLenNext(0));
ok('truncLenNext：800 → 1200', A.truncLenNext(800) === 1200, 1200, A.truncLenNext(800));
ok('truncLenNext：1200 → 1800', A.truncLenNext(1200) === 1800, 1800, A.truncLenNext(1200));
ok('truncLenNext：1800 → 0', A.truncLenNext(1800) === 0, 0, A.truncLenNext(1800));
ok('truncLenNext 四次回到原点', A.truncLenNext(A.truncLenNext(A.truncLenNext(A.truncLenNext(0)))) === 0);

/* ================================================================
   [二] truncBlock：四层分层开关
   ================================================================ */
group('[二] truncBlock 分层');
baseCfg();
const bAll = A.truncBlock();
ok('三层全开时非空', bAll.length > 0, '非空', bAll.length);
ok('块以独立 tag 开头', bAll.indexOf(A.TRUNC_OPEN) === 0, A.TRUNC_OPEN, bAll.slice(0, 20));
ok('块以独立 tag 结尾', bAll.slice(-A.TRUNC_CLOSE.length) === A.TRUNC_CLOSE, A.TRUNC_CLOSE, bAll.slice(-16));
ok('L1 字数锚在', bAll.indexOf('【本轮篇幅】') >= 0);
ok('L1 带上 1200', bAll.indexOf('1200') >= 0);
ok('L2 收尾契约在', bAll.indexOf('【结尾】') >= 0);
ok('L3 反自我认证在', bAll.indexOf('【不要收尾语】') >= 0);
ok('三层合计 ≤ 220 字', (A.TRUNC_TEXT_TAIL.length + A.TRUNC_TEXT_NOCERT.length + (bAll.match(/【本轮篇幅】[^\n]*/) || [''])[0].length) <= 220,
  '≤220', String(A.TRUNC_TEXT_TAIL.length + A.TRUNC_TEXT_NOCERT.length + (bAll.match(/【本轮篇幅】[^\n]*/) || [''])[0].length));
ok('★ 注入块里四个禁词 0 命中', forbids(bAll).length === 0, '0', forbids(bAll).join(','));

A.setCfg('truncLen', 0);
const bNoLen = A.truncBlock();
ok('truncLen=0 → 省掉 L1', bNoLen.indexOf('【本轮篇幅】') < 0 && bNoLen.indexOf('【结尾】') >= 0);
A.setCfg('truncLen', 1200);

A.setCfg('truncTail', false);
const bNoTail = A.truncBlock();
ok('truncTail=false → 省掉 L2', bNoTail.indexOf('【结尾】') < 0 && bNoTail.indexOf('【本轮篇幅】') >= 0);
A.setCfg('truncTail', true);

A.setCfg('truncNoCert', false);
const bNoCert = A.truncBlock();
ok('truncNoCert=false → 省掉 L3', bNoCert.indexOf('【不要收尾语】') < 0 && bNoCert.indexOf('【结尾】') >= 0);
A.setCfg('truncNoCert', true);

A.setCfg('trunc', 'off');
ok('档位关 → 返回空串', A.truncBlock() === '', '空', A.truncBlock());
A.setCfg('trunc', 'light');
A.setCfg('enabled', false);
ok('总闸关 → 返回空串', A.truncBlock() === '', '空', A.truncBlock());
A.setCfg('enabled', true);
A.setCfg('safe', true);
ok('安全模式 → 返回空串', A.truncBlock() === '', '空', A.truncBlock());
A.setCfg('safe', false);

/* ================================================================
   [三] 分项签名：三节独立判定
   ================================================================ */
group('[三] 分项签名');
baseCfg();
const bSigTail = A.truncBlock({ tail: 1, len: 0, pad: 0 });
ok('预设自带收尾 → 省掉 L2 与 L3', bSigTail.indexOf('【结尾】') < 0 && bSigTail.indexOf('【不要收尾语】') < 0 && bSigTail.indexOf('【本轮篇幅】') >= 0);
const bSigLen = A.truncBlock({ tail: 0, len: 1, pad: 0 });
ok('预设自带字数 → 省掉 L1', bSigLen.indexOf('【本轮篇幅】') < 0 && bSigLen.indexOf('【结尾】') >= 0);
ok('★ 三项全被顶掉 → 整块不注入', A.truncBlock({ tail: 1, len: 1, pad: 0 }) === '', '空串', A.truncBlock({ tail: 1, len: 1, pad: 0 }));
ok('只差一个 L1 时仍然注入', A.truncBlock({ tail: 1, len: 0, pad: 1 }).indexOf('【本轮篇幅】') >= 0);

A.setCfg('truncPad', 'math');
const bPad = A.truncBlock({ tail: 0, len: 1, pad: 0 });
ok('truncPad=math → 出现填充锚标记', bPad.indexOf('〔AR-PAD 1.0〕') >= 0);
ok('填充锚包在 <math> 里', bPad.indexOf('<math>') >= 0 && bPad.indexOf('</math>') >= 0);
ok('★ 填充锚也不含 <content>', bPad.indexOf('<content>') < 0);
const bPadSig = A.truncBlock({ tail: 0, len: 1, pad: 1 });
ok('预设自带填充 → 强制不插填充锚', bPadSig.indexOf('〔AR-PAD') < 0);
A.setCfg('truncPadEvery', 1);
const bPadEvery1 = A.truncBlock({ tail: 0, len: 0, pad: 0 });
ok('padEvery=1：三段配三条填充', countOf(bPadEvery1, '〔AR-PAD 1.0〕') === 3, 3, countOf(bPadEvery1, '〔AR-PAD 1.0〕'));
A.setCfg('truncPadEvery', 2);
const bPadEvery2 = A.truncBlock({ tail: 0, len: 0, pad: 0 });
ok('padEvery=2：三段配一条填充', countOf(bPadEvery2, '〔AR-PAD 1.0〕') === 1, 1, countOf(bPadEvery2, '〔AR-PAD 1.0〕'));
A.setCfg('truncPadEvery', 3);
const bPadEvery3 = A.truncBlock({ tail: 0, len: 0, pad: 0 });
ok('padEvery=3：段数不足时末尾补一条', countOf(bPadEvery3, '〔AR-PAD 1.0〕') === 1, 1, countOf(bPadEvery3, '〔AR-PAD 1.0〕'));
A.setCfg('truncPad', 'off');
A.setCfg('truncPadEvery', 2);
const sigClean = A.truncPresetSig();
ok('干净环境里 truncPresetSig 三项都是 0', sigClean.tail === 0 && sigClean.len === 0 && sigClean.pad === 0, '0/0/0', [sigClean.tail, sigClean.len, sigClean.pad].join('/'));
const sigOf = A.truncSigOf('本段字数要求：不少于 3000 字以上。');
ok('truncSigOf 认得出「字以上」', sigOf.len === 1, 1, sigOf.len);
ok('truncSigOf 认得出「<math>」', A.truncSigOf('<math>1+1</math>').pad === 1, 1, A.truncSigOf('<math>1+1</math>').pad);

/* ================================================================
   [四] truncApply：位置 / 自剥 / 幂等 / 关档零动作
   ================================================================ */
group('[四] truncApply');
baseCfg();
function mkMsgs() {
  return [
    { role: 'system', content: '你是叙述者。' },
    { role: 'user', content: '第一轮用户输入' },
    { role: 'assistant', content: 'AI 的上一段回复。' },
    { role: 'user', content: '末条用户输入，继续写。' }
  ];
}
let msgs = mkMsgs();
const before1 = JSON.stringify(msgs);
const ch1 = A.truncApply(msgs);
ok('注入成功返回 true', ch1 === true, true, ch1);
ok('★ 末条 user 被改了', msgs[3].content !== mkMsgs()[3].content);
ok('★ 块落在末条 user 的末尾', msgs[3].content.slice(-A.TRUNC_CLOSE.length) === A.TRUNC_CLOSE);
ok('块只出现一次', countOf(msgs[3].content, A.TRUNC_OPEN) === 1, 1, countOf(msgs[3].content, A.TRUNC_OPEN));
ok('系统的消息一个字没动', msgs[0].content === '你是叙述者。' && msgs[1].content === '第一轮用户输入');
ok('assistant 消息一个字没动', msgs[2].content === 'AI 的上一段回复。');
ok('原文保留在块前面', msgs[3].content.indexOf('末条用户输入，继续写。') === 0);

const snapshot = msgs[3].content;
const ch2 = A.truncApply(msgs);
ok('★ 第二次调用不再改动（幂等）', ch2 === false && msgs[3].content === snapshot, 'false / 不变', String(ch2));
const ch3 = A.truncApply(msgs);
ok('★ 连调三次仍然只有一块', ch3 === false && countOf(msgs[3].content, A.TRUNC_OPEN) === 1, '一块', countOf(msgs[3].content, A.TRUNC_OPEN));
ok('三次之后正文没有累积空行', msgs[3].content.indexOf('继续写。\n\n〔AR-TRUNC') >= 0);

/* 外部残留的旧块（上一版脚本、或手工粘进去的）先被剥掉再追加 */
msgs = mkMsgs();
msgs[3].content = '末条用户输入，继续写。\n\n' + A.TRUNC_OPEN + '\n旧块，早该没了\n' + A.TRUNC_CLOSE;
const ch4 = A.truncApply(msgs);
ok('★ 先剥旧块再追加', msgs[3].content.indexOf('旧块，早该没了') < 0 && countOf(msgs[3].content, A.TRUNC_OPEN) === 1);
ok('剥旧块后仍然报改动', ch4 === true, true, ch4);

/* body 形态（{messages:[...]} / {request:{messages:[...]}}）也认 */
const bodyWrap = { messages: mkMsgs() };
ok('接受 {messages} 形态', A.truncApply(bodyWrap) === true && bodyWrap.messages[3].content.indexOf(A.TRUNC_OPEN) >= 0);
const bodyWrap2 = { request: { messages: mkMsgs() } };
ok('接受 {request:{messages}} 形态', A.truncApply(bodyWrap2) === true && bodyWrap2.request.messages[3].content.indexOf(A.TRUNC_OPEN) >= 0);

/* 关档零动作：JSON 必须全等 */
A.setCfg('trunc', 'off');
const offMsgs = mkMsgs();
const offBefore = JSON.stringify(offMsgs);
ok('★ 关档返回 false', A.truncApply(offMsgs) === false);
ok('★ 关档请求体 JSON 全等（一个字节都不动）', JSON.stringify(offMsgs) === offBefore);
A.setCfg('trunc', 'light');

/* 没有 user 消息：不注入也不报错 */
ok('没有 user 消息时返回 false', A.truncApply([{ role: 'system', content: '只有系统提示' }]) === false);
ok('空数组返回 false', A.truncApply([]) === false && A.truncApply(null) === false);
/* content 是数组形态（type=text） */
const arrMsgs = [{ role: 'user', content: [{ type: 'text', text: '数组形态的输入' }] }];
ok('content 数组形态也能注入', A.truncApply(arrMsgs) === true && arrMsgs[0].content[0].text.indexOf(A.TRUNC_OPEN) >= 0);

/* ================================================================
   [五] truncPadHook：显示层剥离
   ================================================================ */
group('[五] truncPadHook');
ok('★ 没有 messageFormatter 时返回 false 且不抛错', A.truncPadHook() === false, false, A.truncPadHook());

const env2 = makeEnv(true);
const B = env2.api;
B.setCfg('truncPad', 'math');
B.setCfg('truncStrip', true);
ok('有 addHook 时返回 true', B.truncPadHook() === true);
ok('钩子只装一次（第二次不重复 addHook）', B.truncPadHook() === true && env2.mf.hooks.length === 1, 1, env2.mf.hooks.length);
ok('钩子注册在 beforeRegex / order 999', env2.mf.hooks[0].opt.stage === 'beforeRegex' && env2.mf.hooks[0].opt.order === 999, 'beforeRegex/999', JSON.stringify(env2.mf.hooks[0].opt));
const dirty = '正文开头 〔AR-PAD 1.0〕<math>短题：一加一等于几？</math>〔/AR-PAD〕 正文结尾';
const cleaned = env2.mf.hooks[0].fn(dirty);
ok('★ 钩子删掉 AR-PAD 标记', cleaned.indexOf('AR-PAD') < 0);
ok('★ 钩子删掉 <math> 包裹', cleaned.indexOf('<math>') < 0 && cleaned.indexOf('</math>') < 0);
ok('钩子保留正文其它文字', cleaned.indexOf('正文开头') >= 0 && cleaned.indexOf('正文结尾') >= 0);
ok('钩子对非字符串原样返回', env2.mf.hooks[0].fn(null) === null && env2.mf.hooks[0].fn(123) === 123);
B.setCfg('truncPad', 'off');
ok('truncPad=off 时钩子自我短路（原样返回）', env2.mf.hooks[0].fn(dirty) === dirty);
B.setCfg('truncPad', 'math');
B.setCfg('truncStrip', false);
ok('truncStrip=false 时钩子不动手', env2.mf.hooks[0].fn(dirty) === dirty);
B.setCfg('truncStrip', true);
ok('纯函数 truncStripPads 能独立用', B.truncStripPads(dirty).indexOf('<math>') < 0);

/* ================================================================
   [六] 集成：注入点与顺序
   ================================================================ */
group('[六] 集成');
ok('★ 2_refract 里调了 truncApply', SRC.indexOf('truncApply(tmsgs)') >= 0);
ok('★ 顺序：叙述 → 截断 → 破甲', SRC.indexOf('narrApply(body)') < SRC.indexOf('truncApply(tmsgs)') &&
  SRC.indexOf('truncApply(tmsgs)') < SRC.indexOf('jailPatchBody(body)'));
ok('注入点之后才序列化（改动报给了 out.changed）', SRC.indexOf("out.changed.push('截断:'") >= 0);
ok('truncApply 在序列化之前', SRC.indexOf('truncApply(tmsgs)') < SRC.lastIndexOf('if (out.changed.length) out.body = JSON.stringify(body);'),
  'trunc < 序列化', String(SRC.indexOf('truncApply(tmsgs)')) + ' / ' + String(SRC.lastIndexOf('if (out.changed.length) out.body = JSON.stringify(body);')));

/* ================================================================
   [七] 面板：chip 与状态行
   ================================================================ */
group('[七] 面板');
A.setCfg('trunc', 'off');
ok('关档状态行原样不动', A.truncStatLine() === '抗截断：关（不判定、不提示、不补）', '抗截断：关（不判定、不提示、不补）', A.truncStatLine());
A.setCfg('trunc', 'light');
A.setCfg('truncLen', 1200);
A.resetTR();
ok('轻档状态行说「本次没补过」', /抗截断：轻档 · 本次没补过/.test(A.truncStatLine()), '抗截断：轻档 · 本次没补过', A.truncStatLine());
ok('轻档状态行带字数锚', A.truncStatLine().indexOf('字数 1200') >= 0, '字数 1200', A.truncStatLine());
A.setCfg('truncLen', 0);
ok('字数锚关时状态行写「字数关」', A.truncStatLine().indexOf('字数关') >= 0, '字数关', A.truncStatLine());
A.setCfg('truncLen', 1200);
ok('chip 文案是「📏 字数锚:1200」', A.truncLenChipLabel() === '📏 字数锚:1200', '📏 字数锚:1200', A.truncLenChipLabel());
A.setCfg('trunc', 'medium');

/* v1.1：启动时 minimized=true，render() 是关闭态；必须 openPanel() 才有首屏。
   首屏卡2 变成「破甲 + 抗截断」合并卡，字数锚 chip 挪进了底部「更多」。 */
const m2 = makeEnv(false);
m2.api.setCfg('trunc', 'medium');
m2.api.setCfg('truncLen', 1200);
/* 真机里 #ar6-root 是持久节点；假 DOM 的 getElementById 恒 null，会每次 render 新建一个，
   这里先钉住一个持久 root，模拟真实挂载，才能读到最后一次渲染的 HTML。 */
const rootEl2 = m2.win.document.createElement('div');
const moreNode2 = m2.win.document.createElement('button');
moreNode2.setAttribute('data-ar6', 'more');
moreNode2.parentNode = rootEl2;
let moreClick = null;
moreNode2.addEventListener = (t, f) => { if (t === 'click') moreClick = f; };
rootEl2.querySelectorAll = (sel) => (sel === '[data-ar6]' ? [moreNode2] : []);
rootEl2.id = 'ar6-root';
m2.win.document.getElementById = (id) => (id === 'ar6-root' ? rootEl2 : null);
m2.api.openPanel();
const firstHtml = String(rootEl2.innerHTML || '');
ok('首屏卡2 的循环按钮写着「抗截断：中档」', firstHtml.indexOf('抗截断：中档') >= 0, '抗截断：中档', 'len=' + firstHtml.length);
ok('首屏不再有字数锚 chip（已挪进「更多」）', firstHtml.indexOf('📏 字数锚:') < 0, '首屏无 📏 字数锚:', '');

/* 点底部的「更多」——展开层由 moreHTML() 渲染，字数锚 chip 在这里 */
if (typeof moreClick !== 'function') throw new Error('底部的「更多」没有绑上 click');
moreClick({ target: moreNode2, type: 'click' });
const moreHtml = String(rootEl2.innerHTML || '');
ok('「更多」展开后渲染出字数锚 chip', moreHtml.indexOf('data-ar6="📏 字数锚:1200"') >= 0, 'data-ar6="📏 字数锚:1200"', '');
ok('「更多」展开后含防护细项区', moreHtml.indexOf('防护细项') >= 0, '防护细项', '');
ok('「更多」按钮变成「收起」', moreHtml.indexOf('>收起<') >= 0, '>收起<', '');

ok('truncLenChipLabel 的文案前缀仍是「📏 字数锚:」', SRC.indexOf("return '📏 字数锚:' + ") >= 0, "return '📏 字数锚:' + ", '');
ok('源码里 chip 用的是 truncLenChipLabel()', SRC.indexOf('chip(truncLenChipLabel()') >= 0);
ok('源码里 handler 认「📏 字数锚:」前缀', SRC.indexOf("act.indexOf('📏 字数锚:') === 0") >= 0);
ok('handler 走 truncLenNext', SRC.indexOf('cfg.truncLen = truncLenNext(cfg.truncLen)') >= 0);

/* ================================================================
   [八] 帮助页签结构（正文等产品文案）
   ================================================================ */
group('[八] 帮助页签');
ok('帮助里有「抗截断」页签', SRC.indexOf("{ k: 'trunc', t: '抗截断' }") >= 0);
ok('占位符已经删干净', SRC.indexOf('AR6-HELP-TRUNC-PENDING') < 0);
ok('七页每页 >= 8 条正文', (() => { const tabs = A.HELP_TABS; return tabs.length === 7 && tabs.every((t) => (A.HELP_PAGES[t.k] || []).reduce((n, s) => n + (s.l ? s.l.length : 0), 0) >= 8); })());

console.log('\n' + pass + ' passed, ' + fail + ' failed');
process.exit(fail ? 1 : 0);
