/* test_ooc.mjs — v0.76 反 OOC 回归（只读构建产物，不联网、不碰聊天记录）
 *
 * 跑法：
 *   node test_ooc.mjs                       // 默认读同目录 antiroute-v8-desktop.js
 *   node test_ooc.mjs path/to/bundle.js
 *
 * 做法与 test_trunc.mjs 一致：把整包脚本丢进 vm，配一套假 DOM + 假 SillyTavern，
 * 然后只调 __AR6__ 上导出的纯函数，不启动 UI、不发请求。
 * 世界书 / 预设 / 聊天记录都是现造的假数据，一个字节都不来自真实用户。
 */
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const TARGET = process.argv[2] || path.join(HERE, 'antiroute-v8-desktop.js');
const SRC = fs.readFileSync(TARGET, 'utf8');

let pass = 0;
let fail = 0;

function ok(name, cond, expect, actual) {
  if (cond) {
    pass++;
    console.log('  ok   ' + name);
    return;
  }
  fail++;
  console.log('  FAIL ' + name);
  console.log('         期望 ' + expect);
  console.log('         实际 ' + actual);
}

function group(t) {
  console.log('\n' + t);
}

function j(v) {
  try { return JSON.stringify(v); } catch (e) { return String(v); }
}

/* ---------------- 假 DOM（够 3_net / 4_ui / 9_card 的启动期用） ---------------- */

function makeEl(tag) {
  const el = {
    tagName: String(tag || 'div').toUpperCase(),
    id: '',
    className: '',
    textContent: '',
    style: {},
    children: [],
    parentNode: null,
    attrs: {},
    appendChild(c) { if (c) { c.parentNode = el; el.children.push(c); } return c; },
    removeChild(c) { const i = el.children.indexOf(c); if (i >= 0) el.children.splice(i, 1); return c; },
    insertBefore(c) { if (c) { c.parentNode = el; el.children.unshift(c); } return c; },
    setAttribute(k, v) { el.attrs[k] = String(v); },
    getAttribute(k) { return Object.prototype.hasOwnProperty.call(el.attrs, k) ? el.attrs[k] : null; },
    removeAttribute(k) { delete el.attrs[k]; },
    addEventListener() {},
    removeEventListener() {},
    querySelector() { return null; },
    querySelectorAll() { return []; },
    classList: { add() {}, remove() {}, toggle() {}, contains() { return false; } },
    getBoundingClientRect() { return { top: 0, left: 0, width: 0, height: 0, bottom: 0, right: 0 }; },
    focus() {},
    blur() {},
    click() {},
    closest() { return null; },
    contains() { return false; },
    getContext() { return null; }
  };
  Object.defineProperty(el, 'innerHTML', {
    get() { return ''; },
    set(v) { el.children.length = 0; el.textContent = String(v == null ? '' : v); }
  });
  Object.defineProperty(el, 'firstChild', { get() { return el.children.length ? el.children[0] : null; } });
  Object.defineProperty(el, 'childNodes', { get() { return el.children; } });
  return el;
}

/* ---------------- 假宿主 + 打包脚本 ---------------- */

let CTX = null;

function boot() {
  const store = {};
  const win = {
    console,
    setTimeout(f) { try { if (typeof f === 'function') f(); } catch (e) {} return 1; },
    clearTimeout() {},
    setInterval() { return 1; },
    clearInterval() {},
    requestAnimationFrame(f) { try { if (typeof f === 'function') f(); } catch (e) {} return 1; },
    cancelAnimationFrame() {},
    innerWidth: 504,
    innerHeight: 805,
    devicePixelRatio: 2,
    visualViewport: { width: 504, height: 805, addEventListener() {}, removeEventListener() {} },
    addEventListener() {},
    removeEventListener() {},
    matchMedia() { return { matches: false, addListener() {}, removeListener() {} }; },
    getComputedStyle() { return { height: '0px', maxHeight: '0px', overflow: 'hidden', flexBasis: '0px' }; },
    localStorage: {
      getItem(k) { return Object.prototype.hasOwnProperty.call(store, k) ? store[k] : null; },
      setItem(k, v) { store[k] = String(v); },
      removeItem(k) { delete store[k]; },
      key() { return null; },
      length: 0
    },
    btoa: globalThis.btoa,
    atob: globalThis.atob,
    location: { href: 'http://127.0.0.1/' },
    navigator: { userAgent: 'node' },
    fetch() { return Promise.reject(new Error('no-net')); },
    MutationObserver: class { observe() {} disconnect() {} },
    ResizeObserver: class { observe() {} disconnect() {} },
    SillyTavern: {
      getContext() { return CTX; },
      libs: {},
      getRequestHeaders() { return {}; },
      eventSource: { on() {}, removeListener() {} },
      event_types: {},
      extensionSettings: {}
    }
  };
  const body = makeEl('body');
  win.document = {
    body,
    documentElement: makeEl('html'),
    head: makeEl('head'),
    title: '',
    createElement(t) { return makeEl(t); },
    createTextNode(t) { return { nodeValue: String(t) }; },
    getElementById() { return null; },
    querySelector() { return null; },
    querySelectorAll() { return []; },
    addEventListener() {},
    removeEventListener() {}
  };
  win.window = win;
  win.self = win;
  win.globalThis = win;
  win.top = win;
  win.parent = win;
  vm.createContext(win);
  vm.runInContext(SRC, win, { filename: 'antiroute.js' });
  return { win, api: win.__AR6__ };
}

/* ---------------- 造数据 ---------------- */

function ctxOf(over) {
  const base = {
    chat: [],
    chatId: 'c1',
    name1: '阿明',
    characters: [{ data: { extensions: { world: '残阳帝国' } } }],
    this_chid: 0,
    loadWorldInfo() { return { entries: {} }; },
    preset: null
  };
  if (over) {
    for (const k in over) base[k] = over[k];
  }
  return base;
}

/* 世界书条目：{uid: {comment, key, disable}} */
function bookCtx(entries, over) {
  return ctxOf(Object.assign({
    loadWorldInfo() { return { entries }; }
  }, over || {}));
}

const TAG = '〔AR-OOC 1.0〕';

function countTag(s) {
  const t = String(s == null ? '' : s);
  let n = 0;
  let i = 0;
  while ((i = t.indexOf(TAG, i)) >= 0) { n++; i += TAG.length; }
  return n;
}

/* ---------------- 开跑 ---------------- */

CTX = ctxOf();
const booted = boot();
const A = booted.api;
const win = booted.win;
if (!A) {
  console.log('包里没有 __AR6__：' + TARGET);
  process.exit(2);
}
const cfg = A.getCfg();

function cfgOn() {
  cfg.ooc = 'on';
  cfg.oocRoll = true;
  cfg.oocTpl = true;
  cfg.oocChg = true;
  cfg.oocVoice = true;
  cfg.oocPolicy = '';
  A.oocResetChoice();
}

function cfgOff() {
  cfg.ooc = 'off';
  cfg.oocPolicy = '';
  A.oocResetChoice();
}

/* ---------- A. 配置与总闸 ---------- */
group('A. 配置与总闸');

cfgOff();
CTX = ctxOf();
ok('总闸关时 oocText() 返回空串', A.oocText() === '', '""', j(A.oocText()));
ok('总闸关时 oocCfg() 返回 null', A.oocCfg() === null, 'null', j(A.oocCfg()));
ok('总闸关时 oocOnOf(roll) 为 false', A.oocOnOf('roll') === false, 'false', j(A.oocOnOf('roll')));
ok('总闸关时 oocTokens() 为 0', A.oocTokens() === 0, '0', j(A.oocTokens()));

cfgOn();
ok('总闸开时 oocCfg() 有四项', A.oocCfg() && typeof A.oocCfg() === 'object' &&
  A.oocCfg().roll === true && A.oocCfg().tpl === true, 'object', j(A.oocCfg()));
ok('总闸开时 oocLabel() 为四项之和', A.oocLabel() === '点名+反模板+变更门槛+口吻一致',
  '点名+反模板+变更门槛+口吻一致', A.oocLabel());

/* ---------- B. 世界书识人 ---------- */
group('B. 世界书识人');

const BOOK = {
  1: { comment: '[角色] 林秀轩', key: ['林秀轩', '林处长'] },
  2: { comment: '周默', key: ['周默', '小周'] },
  3: { comment: '[地点] 城南', key: ['城南'] },
  4: { comment: '林秀轩今天去城南办事', key: ['林秀轩'] },
  5: { comment: '陈默', key: ['陈默', '那个男人的名字'] },
  6: { comment: '[NPC] 老陈', key: ['老陈'], disable: true },
  7: { comment: '周默', key: ['周默'] },
  8: { comment: '[人物] 苏晚', key: ['苏晚'] },
  9: { comment: '苏晚', key: ['苏晚'] }
};

CTX = bookCtx(BOOK);
let people = A.oocPeople('残阳帝国');
let pmap = {};
for (let i = 0; i < people.length; i++) pmap[people[i].name] = people[i];

ok('P1 前缀 [角色] 林秀轩 → 林秀轩', pmap['林秀轩'] && pmap['林秀轩'].name === '林秀轩',
  '林秀轩', j(Object.keys(pmap)));
ok('P1 前缀 [人物] 苏晚 → 苏晚', !!pmap['苏晚'], '苏晚', j(Object.keys(pmap)));
ok('P2 纯名字 周默 + key[周默,小周] → 通过', !!pmap['周默'], '周默', j(Object.keys(pmap)));
ok('反例 [地点] 城南 → 不认', !pmap['城南'] && !pmap['[地点] 城南'], '不认', j(Object.keys(pmap)));
ok('反例 7 字以上 comment → 不认', !pmap['林秀轩今天去城南办事'], '不认', j(Object.keys(pmap)));
ok('反例 key 里有 7 字（那个男人的名字）→ 不认', !pmap['陈默'], '不认', j(Object.keys(pmap)));
ok('disable:true 的 [NPC] 老陈 跳过', !pmap['老陈'], '不认', j(Object.keys(pmap)));
ok('重名条目去重（周默只留一个）',
  people.filter((p) => p.name === '周默').length === 1, '1', j(people.filter((p) => p.name === '周默').length));
ok('重名不同来源（[人物] 苏晚 / 苏晚）去重后 1 个', people.filter((p) => p.name === '苏晚').length === 1,
  '1', j(people.filter((p) => p.name === '苏晚').length));
ok('keys 原样带出来', pmap['林秀轩'] && pmap['林秀轩'].keys.indexOf('林处长') >= 0, '含林处长', j(pmap['林秀轩'] && pmap['林秀轩'].keys));

CTX = ctxOf({
  loadWorldInfo() { return Promise.resolve({ entries: BOOK }); }
});
ok('loadWorldInfo 返回 Promise → 当拿不到（[]）', A.oocPeople('残阳帝国').length === 0, '0',
  j(A.oocPeople('残阳帝国').length));

CTX = ctxOf();
ok('没绑世界书 → oocPeople 空', A.oocPeople('').length === 0, '0', j(A.oocPeople('').length));

/* this_chid 是字符串也要认 */
CTX = ctxOf({
  this_chid: '0',
  loadWorldInfo() { return { entries: { 1: { comment: '[角色] 林秀轩', key: ['林秀轩'] } } }; }
});
ok('this_chid 为字符串 "0" 也能取到世界书', A.oocBook() === '残阳帝国', '残阳帝国', j(A.oocBook()));

/* entries 是数组也认 */
CTX = ctxOf({
  loadWorldInfo() {
    return { entries: [{ comment: '[角色] 林秀轩', key: ['林秀轩'] }, { comment: '[角色] 周默', key: ['周默'] }] };
  }
});
ok('entries 为数组时同样识别', A.oocPeople('残阳帝国').length === 2, '2', j(A.oocPeople('残阳帝国').length));

/* 40 人上限 */
{
  const many = {};
  for (let i = 0; i < 60; i++) many[100 + i] = { comment: '[角色] 人' + i, key: ['人' + i] };
  CTX = bookCtx(many);
  ok('识别上限 40 个', A.oocPeople('残阳帝国').length === 40, '40', j(A.oocPeople('残阳帝国').length));
}

/* ---------- C. 在场判定 ---------- */
group('C. 在场判定');

{
  const ps = [
    { name: '林秀轩', keys: ['林秀轩', '林处长'] },
    { name: '周默', keys: ['周默', '小周'] }
  ];
  ok('最近两条消息里出现「林处长」→ 林秀轩在场',
    A.oocPresent(ps, '林处长皱了皱眉。').indexOf('林秀轩') >= 0,
    '含林秀轩', j(A.oocPresent(ps, '林处长皱了皱眉。')));
  ok('一条都没提到 → 空', A.oocPresent(ps, '今天天气不错。').length === 0, '[]',
    j(A.oocPresent(ps, '今天天气不错。')));
}

CTX = bookCtx(BOOK, {
  chat: [
    { mes: '很久以前，林秀轩来过一次。' },
    { mes: '嗯。' },
    { mes: '林处长看着窗外。' },
    { mes: '周默没说话。' }
  ]
});
{
  const names = A.oocPresent(A.oocPeople('残阳帝国'), A.oocRecent());
  ok('只看最近两条：林秀轩在（林处长）、周默在', names.indexOf('林秀轩') >= 0 && names.indexOf('周默') >= 0,
    '含林秀轩与周默', j(names));
}

CTX = bookCtx(BOOK, {
  chat: [
    { mes: '林秀轩来过。' },
    { mes: '嗯。' },
    { mes: '嗯。' }
  ]
});
ok('更早的消息不算在场', A.oocRecent().indexOf('林秀轩') < 0, '不含林秀轩', j(A.oocRecent()));

{
  const ps = [];
  for (let i = 0; i < 8; i++) ps.push({ name: '人' + i, keys: ['人' + i] });
  const hit = A.oocPresent(ps, '人0 人1 人2 人3 人4 人5 人6 人7');
  ok('在场上限 6 个', hit.length === 6, '6', j(hit));
}

{
  const ps = [
    { name: '甲', keys: ['甲'] },
    { name: '乙', keys: ['乙'] }
  ];
  const hit = A.oocPresent(ps, '甲 甲 甲 乙');
  ok('按出现次数降序（甲 3 次在前）', hit[0] === '甲' && hit[1] === '乙', '["甲","乙"]', j(hit));
}

/* ---------- D. 四段文案 ---------- */
group('D. 四段文案');

cfgOn();
CTX = bookCtx(BOOK, { chat: [{ mes: '林处长看着窗外。' }, { mes: '周默没说话。' }] });
{
  const t = A.oocText();
  const iRoll = t.indexOf('本轮涉及的角色：');
  const iTpl = t.indexOf('同一类情绪，不要用现成的动作包打发');
  const iChg = t.indexOf('一个人对另一个人的态度、关系、立场变了');
  const iVoice = t.indexOf('他的说话方式、称呼、口癖、句子长短');
  ok('点名段在', iRoll >= 0, '>=0', iRoll);
  ok('四段顺序：点名 → 反模板 → 变更门槛 → 口吻',
    iRoll >= 0 && iRoll < iTpl && iTpl < iChg && iChg < iVoice, '递增', j([iRoll, iTpl, iChg, iVoice]));
  ok('四段关键句各出现 1 次',
    t.split('同一类情绪，不要用现成的动作包打发').length - 1 === 1 &&
    t.split('一个人对另一个人的态度、关系、立场变了').length - 1 === 1 &&
    t.split('他的说话方式、称呼、口癖、句子长短').length - 1 === 1,
    '各 1 次', 'tpl/chg/voice 计数见上');
  ok('四段各带一个 OOC_TAG（共 4 个）', countTag(t) === 4, '4', j(countTag(t)));
  ok('点名段带名单「林秀轩」', /本轮涉及的角色：[^\n]*林秀轩/.test(t), '含林秀轩', j(t.split('\n')[1]));
  ok('{{user}} 换成真名「阿明」', t.indexOf('对阿明是什么态度') >= 0, '对阿明', j(t.indexOf('对阿明是什么态度')));
  ok('文案里不残留 {{user}}', t.indexOf('{{user}}') < 0, '-1', j(t.indexOf('{{user}}')));
}

/* name1 空 → 你 */
CTX = bookCtx(BOOK, { name1: '', chat: [{ mes: '林处长看着窗外。' }] });
ok('拿不到名字时 {{user}} → 你', A.oocText().indexOf('对你是什么态度') >= 0, '对你', j(A.oocText().indexOf('对你是什么态度')));

/* ---------- E. 让路（听预设） ---------- */
group('E. 让路（听预设）');

cfgOn();
CTX = bookCtx(BOOK, { chat: [{ mes: '林处长看着窗外。' }] });
A.oocSetChoice('tpl', 'preset');
{
  const t = A.oocText();
  ok('tpl 让给预设后反模板段不出现', t.indexOf('同一类情绪，不要用现成的动作包打发') < 0, '-1',
    j(t.indexOf('同一类情绪，不要用现成的动作包打发')));
  ok('其余三段仍在（tag 3 个）', countTag(t) === 3, '3', j(countTag(t)));
  ok('oocLabel 去掉「反模板」', A.oocLabel() === '点名+变更门槛+口吻一致', '点名+变更门槛+口吻一致', A.oocLabel());
  ok('子 chip 显示「听预设」', A.oocChipLabel('tpl') === '🚫 反模板:听预设', '🚫 反模板:听预设', A.oocChipLabel('tpl'));
}
A.oocSetChoice('tpl', 'script');
ok('改回 script 后反模板段回来了', A.oocText().indexOf('同一类情绪，不要用现成的动作包打发') >= 0,
  '>=0', j(A.oocText().indexOf('同一类情绪，不要用现成的动作包打发')));

/* ---------- F. 注入与幂等 ---------- */
group('F. 注入与幂等');

cfgOff();
CTX = ctxOf();
ok('没有 setExtensionPrompt：oocApply() 返回 false', A.oocApply() === false, 'false', j(A.oocApply()));

{
  const calls = [];
  CTX = ctxOf({
    setExtensionPrompt() { calls.push(Array.prototype.slice.call(arguments)); }
  });
  cfgOn();
  cfg.oocRoll = false;
  const got = A.oocApply();
  ok('有 setExtensionPrompt：oocApply() 返回 true', got === true, 'true', j(got));
  ok('通道 key 为 ar6.ooc', calls.length === 1 && calls[0][0] === 'ar6.ooc', 'ar6.ooc',
    j(calls.length ? calls[0][0] : null));
  ok('通道参数为 (key, text, 1, 4, false, 0)',
    calls.length === 1 && calls[0][2] === 1 && calls[0][3] === 4 && calls[0][4] === false && calls[0][5] === 0,
    '1,4,false,0', j(calls.length ? calls[0].slice(2) : null));
  ok('通道写入的就是 oocText()', calls.length === 1 && calls[0][1] === A.oocText(), '同 oocText', 'diff');
  cfgOff();
  calls.length = 0;
  A.oocApply();
  ok('关总闸时通道写空串（清掉上一轮旧块）', calls.length === 1 && calls[0][1] === '', '""',
    j(calls.length ? calls[0][1] : null));
}

/* 回落：贴末条 user 消息 */
cfgOn();
cfg.oocRoll = false;
cfg.oocChg = false;
CTX = ctxOf();
{
  const body = { messages: [{ role: 'system', content: 'sys' }, { role: 'user', content: '你好' }] };
  const ch = A.oocBodyPatch(body);
  const got = body.messages[1].content;
  ok('回落：追加到末条 user 消息', ch.length === 1 && got.indexOf('你好\n\n' + TAG) === 0,
    '以「你好\\n\\n〔AR-OOC」开头', j(got.slice(0, 24)));
  ok('回落：改动描述以「反OOC:」开头', ch.length === 1 && ch[0].indexOf('反OOC:') === 0, '反OOC:…', j(ch));
  const before = got;
  const ch2 = A.oocBodyPatch(body);
  ok('连续 patch 两次不重复注入', ch2.length === 0 && body.messages[1].content === before, '[] 且内容不变',
    j(ch2));
}

{
  const body = { messages: [{ role: 'system', content: 'sys' }] };
  ok('没有 user 消息 → 返回空数组', A.oocBodyPatch(body).length === 0, '[]', j(A.oocBodyPatch(body)));
}

{
  const body = { messages: [{ role: 'user', content: '你好' }] };
  cfgOff();
  CTX = ctxOf();
  ok('总闸关 → patch 不动请求', A.oocBodyPatch(body).length === 0 && body.messages[0].content === '你好',
    '[]', j(A.oocBodyPatch(body)));
}

/* 剥块 */
{
  const base = '正文在这里。';
  cfgOn();
  cfg.oocRoll = false;
  cfg.oocChg = false;
  CTX = ctxOf();
  const block = A.oocText();
  ok('oocStrip 能把块剥回去', A.oocStrip(base + '\n\n' + block) === base, base,
    j(A.oocStrip(base + '\n\n' + block)));
  ok('oocStrip 对没有标记的文本原样返回', A.oocStrip('干净的正文') === '干净的正文', '干净的正文',
    j(A.oocStrip('干净的正文')));
}

/* ---------- G. 预设签名 / 需要问什么 ---------- */
group('G. 预设签名');

const PRESET = {
  prompts: [
    { identifier: 'p1', name: '规则一', content: '禁止角色模块化：情绪不要用现成的套路模板打发。' },
    { identifier: 'p2', name: '规则二', content: '台词口吻约束，保持说话方式一致。' },
    { identifier: 'p3', name: '世界书绑定', content: '先读世界书里的人设。' }
  ],
  prompt_order: [{
    order: [
      { identifier: 'p1', enabled: true, position: 0 },
      { identifier: 'p2', enabled: false, position: 1 },
      { identifier: 'p3', enabled: true, position: 2 }
    ]
  }]
};

{
  const sig = A.oocSig(PRESET);
  ok('prompt_order 里启用的「模板」条目 → sig.tpl === true', sig.tpl === true, 'true', j(sig.tpl));
  ok('enabled:false 的「口吻」条目不算', sig.voice === false, 'false', j(sig.voice));
  ok('hits.tpl 带条目名与前缀', typeof sig.hits.tpl === 'string' && sig.hits.tpl.indexOf('规则一') === 0,
    '规则一 · …', j(sig.hits.tpl));
  ok('「世界书」条目 → sig.roll === true', sig.roll === true, 'true', j(sig.roll));
}

{
  const p2 = JSON.parse(JSON.stringify(PRESET));
  p2.prompt_order[0].order[1].enabled = true;
  const sig = A.oocSig(p2);
  ok('把口吻条目打开后 sig.voice === true', sig.voice === true, 'true', j(sig.voice));
}

{
  const sig = A.oocSig({ prompts: [{ identifier: 'x', content: '无关内容' }], prompt_order: [{ order: [{ identifier: 'x', enabled: true }] }] });
  ok('无关预设 → 四项全 false', !sig.tpl && !sig.chg && !sig.voice && !sig.roll, 'all false', j(sig));
}

cfgOn();
cfg.oocRoll = false;
cfg.oocChg = false;
cfg.oocVoice = true;
CTX = ctxOf({ preset: PRESET });
ok('开着 + 预设也管 + 没定过 → 需要问 tpl', A.oocAsk().indexOf('tpl') >= 0, '含 tpl', j(A.oocAsk()));
A.oocSetChoice('tpl', 'script');
ok('定过之后不再问', A.oocAsk().indexOf('tpl') < 0, '不含 tpl', j(A.oocAsk()));
cfg.oocPolicy = 'preset';
A.oocResetChoice();
ok('cfg.oocPolicy=preset → 直接落定、不弹窗', A.oocAsk().length === 0 && A.oocChoice('tpl') === 'preset',
  '[] 且 choice=preset', j(A.oocAsk()) + ' / ' + A.oocChoice('tpl'));

/* ---------- H. 状态行 / 异常安全 ---------- */
group('H. 状态行与异常安全');

CTX = bookCtx(BOOK);
ok('状态行：世界书名 + 人数', A.oocStatusLine() === '世界书：残阳帝国 · 识别到 3 个人物', '世界书：残阳帝国 · 识别到 3 个人物',
  A.oocStatusLine());
ok('状态行：没绑世界书', (function () {
  CTX = ctxOf({ characters: [{ data: { extensions: {} } }] });
  return A.oocStatusLine() === '这个角色没绑世界书';
})(), '这个角色没绑世界书', A.oocStatusLine());

{
  CTX = bookCtx({});
  ok('状态行：认不出人物条目', A.oocStatusLine() === '世界书：残阳帝国 · 没认出人物条目',
    '世界书：残阳帝国 · 没认出人物条目', A.oocStatusLine());
}

{
  const keep = CTX;
  CTX = null;
  ok('ctx 为空时 oocText 不炸（返回字符串）', typeof A.oocText() === 'string', 'string', typeof A.oocText());
  CTX = keep;
}

{
  /* getContext 抛异常：所有 ooc 函数都不得把异常放出来 */
  cfgOn();
  CTX = ctxOf({ chat: [{ mes: '林处长看着窗外。' }] });
  const keepCtx = CTX;
  const keepGet = win.SillyTavern.getContext;
  win.SillyTavern.getContext = function () { throw new Error('boom'); };
  let threw = false;
  let out = null;
  try {
    out = A.oocText();
    A.oocStatusLine();
    A.oocBook();
    A.oocApply();
    A.oocPeople('残阳帝国');
  } catch (e) {
    threw = true;
  }
  ok('ctx 抛异常时不向外抛', threw === false, '不抛', threw ? '抛了' : '没抛');
  ok('ctx 抛异常时四项全关 → oocText() 空串', (function () {
    cfg.oocRoll = false; cfg.oocTpl = false; cfg.oocChg = false; cfg.oocVoice = false;
    const t = A.oocText();
    cfg.oocRoll = true; cfg.oocTpl = true; cfg.oocChg = true; cfg.oocVoice = true;
    return t === '';
  })(), '""', j(out));
  win.SillyTavern.getContext = keepGet;
  CTX = keepCtx;
}

/* 子 chip 文案 */
cfgOn();
cfg.oocRoll = false;
ok('chip 文案：关', A.oocChipLabel('roll') === '🧩 点名:关', '🧩 点名:关', A.oocChipLabel('roll'));
cfg.oocRoll = true;
ok('chip 文案：开', A.oocChipLabel('roll') === '🧩 点名:开', '🧩 点名:开', A.oocChipLabel('roll'));
ok('OOC_TAG 就是〔AR-OOC 1.0〕', A.OOC_TAG === TAG, TAG, j(A.OOC_TAG));
ok('OOC_ITEMS 四项齐全', A.OOC_ITEMS.join(',') === 'roll,tpl,chg,voice', 'roll,tpl,chg,voice', j(A.OOC_ITEMS));

/* ---------- I. 按需注入：没人在场就不注 ---------- */
cfgOn();
CTX = bookCtx(BOOK, { chat: [{ mes: '窗外下雨了。' }, { mes: '雨声很大。' }] });
ok('认得出人物、但最近两条没人名 → 整块不注', A.oocText() === '', '""', j(A.oocText()));

CTX = bookCtx(BOOK, { chat: [{ mes: '林处长看着窗外。' }] });
ok('提到人名 → 照常注入', A.oocText().length > 0, '>0', A.oocText().length);

CTX = ctxOf();
ok('认不出世界书 → 不做拦截（不因没绑世界书把功能关掉）', A.oocText().length > 0, '>0', A.oocText().length);

/* ---------- 汇总 ---------- */
console.log('\n通过 ' + pass + ' 条，失败 ' + fail + ' 条');
if (fail > 0) process.exit(1);
