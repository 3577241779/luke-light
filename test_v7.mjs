/* test_v7.mjs — Anti-Route v7 结构与逻辑回归（不联网，vm 沙箱） */
import fs from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';

const ROOT = 'C:/Users/23548/Documents/deepseek-harness/default-workspace/_antiroute/v8';
const D = fs.readFileSync(path.join(ROOT, 'antiroute-v8-desktop.js'), 'utf8');
const M = fs.readFileSync(path.join(ROOT, 'antiroute-v8-mobile.js'), 'utf8');

let pass = 0, fail = 0;
const fails = [];
function ok(name, cond, extra) {
  if (cond) { pass++; }
  else { fail++; fails.push(name + (extra ? ' :: ' + extra : '')); }
}
function eq(name, a, b) { ok(name, a === b, 'got=' + JSON.stringify(a) + ' want=' + JSON.stringify(b)); }

/* ---------------- 沙箱 ---------------- */
function parseStyle(v) {
  const o = {};
  String(v || '').split(';').forEach((kv) => {
    const i = kv.indexOf(':');
    if (i > 0) o[kv.slice(0, i).trim()] = kv.slice(i + 1).trim();
  });
  return o;
}
function el() {
  return {
    style: {}, dataset: {}, className: '', innerHTML: '', textContent: '', firstChild: null,
    children: [], parentNode: null, id: '',
    setAttribute(k, v) { this['_a' + k] = v; if (k === 'style') this.style = parseStyle(v); if (k === 'id') this.id = v; },
    getAttribute(k) { return this['_a' + k] === undefined ? null : this['_a' + k]; },
    appendChild(c) { c.parentNode = this; this.children.push(c); if (!this.firstChild) this.firstChild = c; return c; },
    removeChild(c) { const i = this.children.indexOf(c); if (i >= 0) this.children.splice(i, 1); if (this.firstChild === c) this.firstChild = this.children[0] || null; return c; },
    remove() { if (this.parentNode) this.parentNode.removeChild(this); },
    addEventListener() {}, removeEventListener() {}, setPointerCapture() {},
    querySelector() { return null; }, querySelectorAll() { return []; },
    getBoundingClientRect() { return { width: 400, height: 300, top: 10, left: 10, right: 410, bottom: 310 }; },
    classList: { add() {}, remove() {}, toggle() {}, contains() { return false; } }
  };
}

function makeEnv(opt) {
  opt = opt || {};
  const store = Object.assign({}, opt.store || {});
  const body = el(), head = el();
  const doc = {
    readyState: 'complete', documentElement: {}, body, head,
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
      setItem: (k, v) => { store[k] = String(v); },
      removeItem: (k) => { delete store[k]; }
    },
    navigator: { userAgent: opt.ua || 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' },
    innerWidth: 390, innerHeight: 844,
    SillyTavern: { getContext: () => ({ chat: [], name1: 'U', characters: [] }) },
    fetch: async () => ({ ok: true, status: 200, headers: { get: () => null }, clone() { return this; } }),
    addEventListener() {}, removeEventListener() {}
  };
  g.window = g;
  g.document = doc;
  g.URL = URL;
  g.Date = Date; g.Math = Math; g.JSON = JSON; g.Promise = Promise;
  vm.createContext(g);
  if (opt.eventOn) g.eventOn = opt.eventOn;
  vm.runInContext(opt.code || D, g, { filename: 'bundle.js' });
  return g;
}

/* ---------------- 1. 包结构 ---------------- */
ok('desktop 含 VERSION 头部', /var VERSION = '\d+\.\d+'/.test(D));
ok('mobile 含 VERSION 头部', /var VERSION = '\d+\.\d+'/.test(M));
ok('desktop UI_MODE', D.indexOf("var UI_MODE = 'desktop'") >= 0);
ok('mobile UI_MODE', M.indexOf("var UI_MODE = 'mobile'") >= 0);
ok('含 5_route 段', D.indexOf('5_route.js') >= 0);
ok('含 7_jail 段', D.indexOf('7_jail.js') >= 0);
ok('两包只差 UI_MODE', D.replace("'desktop'", "'mobile'") === M);

/* ---------------- 2. 装载与基础 API ---------------- */
const g = makeEnv({});
const api = g.__AR6__;
ok('API 已导出', !!api);
ok('VERSION', /^\d+\.\d+$/.test(String(api && api.VERSION)));
ok('hashStr 确定', api.hashStr('a|b|c') === api.hashStr('a|b|c'));
ok('hashStr 变化', api.hashStr('a|b|c') !== api.hashStr('a|b|d'));

/* ---------------- 3. planRequest：别名 + 钉参数 ---------------- */
const sys = [
  '## 写作规则', '- 必须遵守以下全部要求', '- 禁止出现说明性文字',
  '因此，第一段要直接进入场景。但是，不要解释设定。然而，对话要短。所以，避免总结。',
  '此外，每次回答都要保持在 500 字以上。综上，不要跳段。'
].join('\n');
function reqBody(extra) {
  return JSON.stringify(Object.assign({
    model: 'gemini-4-argon',
    reverse_proxy: 'https://relay-a.example/v1',
    models: ['gemini-4-argon', 'gemini-3.1-flash-lite'],
    allow_fallbacks: true,
    route: 'fallback',
    messages: [
      { role: 'system', content: sys },
      { role: 'user', content: '继续。' }
    ]
  }, extra || {}));
}
const URL0 = 'https://relay-a.example/v1/chat/completions/generate';
api.setCfg('pin', true);
api.setCfg('refract', 'off');
api.setCfg('alias', 'ant次gemini-4-argon');
const p1 = api.planRequest(reqBody(), URL0);
const b1 = JSON.parse(p1.body);
eq('别名改写', b1.model, 'ant次gemini-4-argon');
eq('删 models', 'models' in b1, false);
eq('allow_fallbacks=false', b1.allow_fallbacks, false);
eq('删 route', 'route' in b1, false);
ok('changed 记录别名', p1.changed.some((c) => c.indexOf('别名') === 0), JSON.stringify(p1.changed));

/* ---------------- 4. 稳定种子：同渠道同模型结果一致 ---------------- */
api.setCfg('refract', 'light');
api.setCfg('refractMode', 'stable');
const s1 = api.planRequest(reqBody(), URL0);
const s2 = api.planRequest(reqBody(), URL0);
eq('stable 两次完全一致', s1.body, s2.body);
ok('stable 确实改了文本', s1.body !== reqBody() || s1.changed.length > 0);

const other = reqBody({ reverse_proxy: 'https://relay-b.example/v1' });
const s3 = api.planRequest(other, 'https://relay-b.example/v1/chat/completions/generate');
ok('换渠道后变形不同', s3.body !== s1.body);

api.setCfg('refractMode', 'random');
const r1 = api.planRequest(reqBody(), URL0);
ok('random 模式可运行', typeof r1.body === 'string' && r1.body.length > 0);
api.setCfg('refract', 'off');

/* ---------------- 5. 判定门禁 ---------------- */
function ev(model, observed, src) {
  const e = api.newEvidence(model, 200, 'sse');
  e.sawText = true;
  e.observed = observed;
  e.observedSrc = observed.map(() => src || 'body');
  e.verifiable = api.verifiableCode();
  return e;
}
api.setCfg('dualBase','https://relay-a.example/v1');
api.setChState({ echoes: true });
let v = api.verdictOf(ev('gemini-4-argon', ['gemini-3.1-flash-lite']));
/* v8：响应体自述优先于“渠道回显”标记——上游自己说了 flash-lite，就算被换 */
eq('回显渠道 + 响应体低阶 → diff', v.code, 'diff');
eq('回显渠道 + 响应体 conf', v.conf, 'B');

/* 只有消息记录时，回显渠道仍不采信 */
var evMsg = api.newEvidence('gemini-4-argon', 200, 'sse');
evMsg.sawText = true; evMsg.observed = ['gemini-3.1-flash-lite']; evMsg.observedSrc = ['msg'];
evMsg.verifiable = api.verifiableCode();
var vMsg = api.verdictOf(evMsg);
eq('回显渠道 + 仅消息记录 → 不下结论', vMsg.code, 'unknown');

api.setChState({ echoes: false });
v = api.verdictOf(ev('gemini-4-argon', ['gemini-3.1-flash-lite']));
eq('可验渠道 + 低阶 → diff', v.code, 'diff');
eq('可验+响应体 conf', v.conf, 'A');

/* ---------------- 5b. 代次与档位（3.x 系列） ---------------- */
function note(req, obs) { return api.verdictOf(ev(req, [obs])).note; }
eq('同代降档：3.1 Pro → 3.1 Flash 判被换', api.verdictOf(ev('gemini-3.1-pro', ['gemini-3.1-flash'])).code, 'diff');
ok('同代降档写明档位', /T3 → T2/.test(note('gemini-3.1-pro', 'gemini-3.1-flash')));
eq('降代：3.8 Flash → 3.1 Flash 判被换', api.verdictOf(ev('gemini-3.8-flash', ['gemini-3.1-flash'])).code, 'diff');
ok('降代写明代次', /代次 3\.8 → 3\.1/.test(note('gemini-3.8-flash', 'gemini-3.1-flash')));
ok('降代不带"降档"字样（档位没降）', !/降档/.test(note('gemini-3.8-flash', 'gemini-3.1-flash')));
eq('跨代+降档：3.1 Pro → 3.0 Flash', api.verdictOf(ev('gemini-3.1-pro', ['gemini-3.0-flash'])).code, 'diff');
ok('跨代+降档两项都写', /代次 3\.1 → 3/.test(note('gemini-3.1-pro', 'gemini-3.0-flash')) && /T3 → T2/.test(note('gemini-3.1-pro', 'gemini-3.0-flash')));
eq('写法不同：3-flash 与 3.0-flash 是同一个模型', api.verdictOf(ev('gemini-3-flash', ['gemini-3.0-flash'])).code, 'same');
eq('升级：3.1 Flash → 3.1 Pro 也算被换', api.verdictOf(ev('gemini-3.1-flash', ['gemini-3.1-pro'])).code, 'diff');
ok('升级写明更高配置', /更高配置/.test(note('gemini-3.1-flash', 'gemini-3.1-pro')));
eq('2.5 Pro → 3.1 Flash：档位降，仍算被换', api.verdictOf(ev('gemini-2.5-pro', ['gemini-3.1-flash'])).code, 'diff');
eq('同名不误报：3.1 Flash → 3.1 Flash', api.verdictOf(ev('gemini-3.1-flash', ['gemini-3.1-flash'])).code, 'same');
eq('带后缀别名：3.1-flash-thinking 视为同一模型', api.verdictOf(ev('gemini-3.1-flash', ['gemini-3.1-flash-thinking'])).code, 'same');

/* 无思考：必须先证明该渠道看得见思考 */
const g2 = makeEnv({});
const api2 = g2.__AR6__;
api2.setCfg('dualBase','https://relay-a.example/v1');
api2.setChState({ echoes: false });
let e2 = api2.newEvidence('gemini-4-argon', 200, 'sse');
e2.sawText = true; e2.observed = ['gemini-4-argon']; e2.observedSrc = ['msg']; e2.hasThink = false;
eq('历史无思考证据 → 不判 thin', api2.verdictOf(e2).code, 'same');
api2.pushLog({ at: Date.now(), req: 'gemini-4-argon', think: 1, code: 'same', conf: 'A' });
e2 = api2.newEvidence('gemini-4-argon', 200, 'sse');
e2.sawText = true; e2.observed = ['gemini-4-argon']; e2.observedSrc = ['msg']; e2.hasThink = false;
eq('有近期同族思考证据 → thin', api2.verdictOf(e2).code, 'thin');
eq('thin 与 same 同一置信度（未验渠道=C）', api2.verdictOf(e2).conf, 'C');

/* 自激止血：更早的记录、别的家族，都不该继续点亮「该渠道看得见思考」 */
const g3 = makeEnv({});
const api3 = g3.__AR6__;
api3.setCfg('dualBase','https://relay-a.example/v1');
api3.setChState({ echoes: false });
api3.pushLog({ at: Date.now() - 3600000, req: 'gemini-4-argon', think: 1, code: 'same', conf: 'A' });
let e3 = api3.newEvidence('gemini-4-argon', 200, 'sse');
e3.sawText = true; e3.observed = ['gemini-4-argon']; e3.observedSrc = ['msg']; e3.hasThink = false;
eq('一小时前的思考记录 → 不再判 thin', api3.verdictOf(e3).code, 'same');
api3.pushLog({ at: Date.now(), req: 'claude-3-7-sonnet', think: 1, code: 'same', conf: 'A' });
e3 = api3.newEvidence('gemini-4-argon', 200, 'sse');
e3.sawText = true; e3.observed = ['gemini-4-argon']; e3.observedSrc = ['msg']; e3.hasThink = false;
eq('别的家族的思考记录 → 不判 thin', api3.verdictOf(e3).code, 'same');

/* ---------------- 5b. 渠道别名后缀不能当成"被换" ---------------- */
const g5 = makeEnv({});
const api5 = g5.__AR6__;
api5.setCfg('dualBase', 'https://relay-a.example/v1');
api5.setChState({ echoes: false });

function obsBody(model, reqModel) {
  const e = api5.newEvidence(reqModel, 200, 'sse');
  e.sawText = true; e.observed = [model]; e.observedSrc = ['body']; e.hasThink = true;
  return api5.verdictOf(e);
}
eq('响应体带 -ai 后缀 → 同一模型，不算被换', obsBody('gemini-4-argon', 'gemini-4-argon-ai').code, 'same');
eq('-ai 后缀的说明写进 note', /名称后缀不同/.test(obsBody('gemini-4-argon', 'gemini-4-argon-ai').note), true);
eq('响应体带 -low 思考档 → 同一模型', obsBody('gemini-4-argon-low', 'gemini-4-argon').code, 'same');
eq('响应体带 -vertex 别名 → 同一模型', obsBody('gemini-4-argon', 'gemini-4-argon-vertex').code, 'same');
eq('真换了另一个档位 → 仍然判被换', obsBody('gemini-4-flash', 'gemini-4-argon').code, 'diff');
eq('跨家族 → 仍然判被换', obsBody('claude-3-7-sonnet', 'gemini-4-argon').code, 'diff');
eq('名字真的不同 → 仍然判被换', obsBody('gemini-4-argon', 'gemini-4-pro').code, 'diff');
{
  const eNoVer = api5.newEvidence('gemini-4-argon', 200, 'sse');
  eNoVer.sawText = true; eNoVer.observed = ['gemini-4-ultra']; eNoVer.observedSrc = ['body'];
  const vNoVer = api5.verdictOf(eNoVer);
  eq('同档但真是另一个模型 → 仍判被换', vNoVer.code, 'diff');
  eq('没拿到版本号时，note 要说明"真实身份未知"', /真实身份未知/.test(vNoVer.note), true);
}

/* ---------------- 5c. 正文字数不许再兜底成 1 ---------------- */
ok('源码里不再有「至少算 1 个字」的兜底', D.indexOf('Math.max(1, mesStr.length - baseMes.length)') < 0);
ok('重写成更短时按整条正文计', D.indexOf('grewChars > 0 ? grewChars : mesStr.length') >= 0);

/* ---------------- 6. 瘦身 / 统计 ---------------- */
eq('垃圾输入 slimReport', api.slimReport('not json'), null);
const dup = '这一段是重复的规则说明，用来测试重复段落检测功能是否真的能够正常工作，长度需要超过八十个字符才会被计入统计范围之内，因此这里再补充一些文字把它撑长一点，确保它可以被识别成段落。';
const bodyTxt = JSON.stringify({
  messages: [
    { role: 'system', content: dup + '\n\n' + dup },
    { role: 'user', content: '注意：重要：必须：' }
  ]
});
const sr = api.slimReport(bodyTxt);
ok('slimReport 识别重复', sr && sr.dupParas === 1, JSON.stringify(sr));
ok('slimReport 给出建议', sr && /重复段落/.test(sr.advice));
const w = api.wilson(0, 20);
ok('wilson 0/20 上界>0.1', w.hi > 0.1 && w.lo === 0);

/* kpi：只有 A/B 进分母 */
api.pushLog({ ts: 1, code: 'same', conf: 'A' });
api.pushLog({ ts: 2, code: 'diff', conf: 'A' });
api.pushLog({ ts: 3, code: 'unknown', conf: 'C' });
const K = api.kpi();
eq('kpi 分母', K.eff, 2);
eq('kpi 坏轮', K.bad, 1);

/* ---------------- 7. 别名 / 可验文案 ---------------- */
eq('别名候选 5 个', api.aliasCandidates().length, 5);
eq('可验文案 yes', (api.setChState({ echoes: false }), api.verifiableLabel()), '可验');
eq('可验文案 no', (api.setChState({ echoes: true }), api.verifiableLabel()), '不可验');

/* ---------------- 8. 破甲（v7.1） ---------------- */
const NL = String.fromCharCode(10);
const gj = makeEnv({});
const aj = gj.__AR6__;
eq('jail 默认关', aj.getCfg().jail, 'off');
eq('破甲 chip 文案', aj.jailChipLabel(), '🩹 破甲:关');
aj.setCfg('jail', 'off'); eq('关→安全', aj.jailNext(), 'safe');
aj.setCfg('jail', 'safe'); eq('安全→强力', aj.jailNext(), 'strong');
aj.setCfg('jail', 'strong'); eq('强力→关', aj.jailNext(), 'off');

/* 强力档：只加不减 + 只对 gemini 写 safetySettings */
aj.setCfg('jail', 'strong');
aj.setCfg('jailTok', true);
aj.setCfg('jailSafe', true);
aj.setCfg('jailPre', false);
aj.setCfg('jailText', false);
aj.setCfg('alias', '');
aj.setCfg('refract', 'off');
const jbGem = JSON.stringify({
  model: '抗截断-pg-gemini-3.8-flash', max_tokens: 800,
  messages: [{ role: 'system', content: 'S' }, { role: 'user', content: '写一段' }]
});
const jpGem = aj.planRequest(jbGem, URL0);
const jbGem2 = JSON.parse(jpGem.body);
eq('保底 token 提到 2048', jbGem2.max_tokens, 2048);
ok('gemini 系写 safetySettings', Array.isArray(jbGem2.safetySettings) && jbGem2.safetySettings.length === 5);
ok('changed 记录保底 token', jpGem.changed.some((c) => c.indexOf('保底token') === 0), JSON.stringify(jpGem.changed));

const jbBig = JSON.stringify({ model: 'gpt-4o', max_tokens: 5000, messages: [{ role: 'user', content: 'hi' }] });
const jbBig2 = JSON.parse(aj.planRequest(jbBig, URL0).body);
eq('已经够长就不动 token', jbBig2.max_tokens, 5000);
eq('非 gemini 不写 safetySettings', 'safetySettings' in jbBig2, false);

const jbOwn = JSON.stringify({ model: 'x', max_tokens: 100, messages: [{ role: 'system', content: '<content>场景设定与人物小传' }, { role: 'user', content: 'U' }] });
eq('<content> 只是正文包裹标签 → 不算预设自带，保底照做', JSON.parse(aj.planRequest(jbOwn, URL0).body).max_tokens, 2048);

const jbOwnUsr = JSON.stringify({ model: 'x', max_tokens: 100, messages: [{ role: 'user', content: 'Reply directly 我在 user 段' }] });
eq('破甲标记写在 user 段 → 不算数（只扫 system）', JSON.parse(aj.planRequest(jbOwnUsr, URL0).body).max_tokens, 2048);

const jbOwnSys = JSON.stringify({ model: 'x', max_tokens: 100, messages: [{ role: 'system', content: 'Reply directly' }, { role: 'user', content: 'U' }] });
eq('system 段自称已破甲 → 跳过 token 保底', JSON.parse(aj.planRequest(jbOwnSys, URL0).body).max_tokens, 100);

/* 预审框 / 输出契约 */
aj.setCfg('jailPre', true);
const jbPre = JSON.stringify({ model: 'm', messages: [{ role: 'system', content: 'S' }, { role: 'user', content: 'U' }] });
const jPre = JSON.parse(aj.planRequest(jbPre, URL0).body).messages;
eq('预审框多一条 system', jPre.length, 3);
eq('预审框插在 user 之前', jPre[1].role, 'system');
eq('末条仍是 user', jPre[2].role, 'user');
ok('末条尾部带短句', jPre[2].content.indexOf('【直接续写】') > 0);
aj.setCfg('jailText', true);
const jBoth = JSON.parse(aj.planRequest(jbPre, URL0).body).messages;
eq('两个都开只贴一次', (jBoth[2].content.split('【直接续写】').length - 1), 1);

/* 判定 */
eq('空回', aj.jailInspect({ status: 200, outputChars: 0, mesChars: 0, tail: '' }).code, 'empty');
eq('只有思维链也算空回', aj.jailInspect({ status: 200, outputChars: 900, mesChars: 0, tail: '' }).code, 'empty');
eq('正常句子', aj.jailInspect({ status: 200, outputChars: 8, mesChars: 8, tail: '好的。' }).code, 'ok');
eq('逗号结尾 → 截断', aj.jailInspect({ status: 200, outputChars: 900, mesChars: 900, tail: '文'.repeat(880) + '，' }).code, 'trunc');
eq('句号结尾 → 不截断', aj.jailInspect({ status: 200, outputChars: 900, mesChars: 900, tail: '文'.repeat(880) + '。' }).code, 'ok');
eq('开引号结尾 → 截断', aj.jailInspect({ status: 200, outputChars: 900, mesChars: 900, tail: '文'.repeat(880) + '「' }).code, 'trunc');
eq('代码块未闭合 → 截断', aj.jailInspect({ status: 200, outputChars: 900, mesChars: 900, tail: '```js' + NL + 'var a = 1' }).code, 'trunc');
eq('长文尾部无句读 → 截断', aj.jailInspect({ status: 200, outputChars: 900, mesChars: 900, tail: '文'.repeat(900) }).code, 'trunc');
eq('短拒绝 → 硬拒', aj.jailInspect({ status: 200, outputChars: 40, mesChars: 40, tail: 'I am sorry, but I cannot help with that.' }).code, 'refuse');
eq('续写里只出 200 字拒绝（整条已 3200 字）→ 仍判硬拒', aj.jailInspect({ status: 200, outputChars: 200, mesChars: 3200, tail: 'I am sorry, but I cannot help with that.' }).code, 'refuse');
eq('上游拦截 → 硬拒', aj.jailInspect({ status: 200, outputChars: 0, mesChars: 0, tail: '', blocked: 'SAFETY' }).code, 'refuse');
eq('长文里出现抱歉不算拒绝', aj.jailInspect({ status: 200, outputChars: 900, mesChars: 900, tail: '文'.repeat(880) + '。' }).code, 'ok');

/* 刹车 */
aj.resetJL();
aj.setCfg('jailMax', 2);
ok('gate 初始放行', aj.jailGate('k1').ok);
const jl0 = aj.getJL();
jl0.count = 2; jl0.key = 'k1'; jl0.at = Date.now() - 5000; jl0.lock = false;
eq('到上限就停手', aj.jailGate('k1').ok, false);
jl0.count = 1; jl0.at = Date.now();
eq('间隔太短不放行', aj.jailGate('k1').ok, false);
jl0.at = Date.now() - 21000;
jl0.count = 1;
ok('20 秒后本轮归零', aj.jailGate('k1').ok);

/* 观察器关着要提示 */
aj.setCfg('jail', 'safe');
aj.setCfg('observe', false);
ok('观察器关 → 提示失效', aj.jailStatus().indexOf('⚠') === 0);
aj.setCfg('observe', true);
eq('观察器开 → 就绪', aj.jailStatus().indexOf('⚠'), -1);

/* ---------------- 7. 响应体尾部 usage（400KB 截头回归） ---------------- */
const evTail = api.newEvidence('gemini-4-argon', 200, 'sse');
api.absorbPeek('d'.repeat(430000) + '{"usageMetadata":{"thoughtsTokenCount":23,"candidatesTokenCount":40,"promptTokenCount":11,"totalTokenCount":74},"finishReason":"STOP"}', evTail.rid, evTail);
eq('尾部 usage 不被截头吃掉 → 认得出有思考', evTail.hasThink, true);
eq('尾部 usage → thoughtTok', evTail.thoughtTok, 23);
eq('尾部 usage → finishReason', evTail.finish, 'STOP');
eq('尾部 usage → 标记读到过 usage', evTail.usageSeen, true);

const evZero = api.newEvidence('gemini-4-argon', 200, 'sse');
api.absorbPeek('d'.repeat(430000) + '{"usageMetadata":{"thoughtsTokenCount":0,"candidatesTokenCount":40,"promptTokenCount":11}}', evZero.rid, evZero);
eq('usage 读到但思考为 0 → 记成"确认没有"', evZero.usageZeroThink, true);
eq('usage 读到但思考为 0 → 不能当成"看见思考"', !!evZero.hasThink, false);

/* ---------------- 8. 端到端：无思考（C 级）不许推高被换率 ---------------- */
const g4 = makeEnv({});
const api4 = g4.__AR6__;
api4.setCfg('dualBase', 'https://relay-a.example/v1');
api4.setChState({ echoes: false });
api4.setCfg('peek', true);
api4.setCfg('safe', false);
const nBefore = api4.ledStat().n;
api4.pushLog({ at: Date.now(), req: 'gemini-4-argon', think: 1, code: 'same', conf: 'A' });
const evE2E = api4.newEvidence('gemini-4-argon', 200, 'sse');
evE2E.sawText = true; evE2E.observed = ['gemini-4-argon']; evE2E.observedSrc = ['msg'];
evE2E.hasThink = false; evE2E.outputChars = 480; evE2E.totalMs = 3000;
const vE2E = api4.verdictOf(evE2E);
eq('端到端前置：判定是 thin', vE2E.code, 'thin');
eq('端到端前置：thin 置信度 C', vE2E.conf, 'C');
api4.finish(evE2E, {});
eq('无思考轮次不进被换率分母', api4.ledStat().n, nBefore);
ok('但记成弱证据，不丢失', Number(api4.ledStat().row.weak) >= 1, 'weak=' + api4.ledStat().row.weak);

/* 预审框措辞：不许出现「审核/过审/安全/政策」这类词——这几个词本身
   就是在提示对方「这段需要判定」，反而更容易被拦。 */
{
  const jailSrc = fs.readFileSync(path.join(ROOT, '_src', '7_jail.js'), 'utf8');
  const m1 = jailSrc.match(/var JAIL_PRE_SYS = '([^']*)'/);
  const preLine = m1 ? m1[1] : '';
  ok('预审框不含审核/安全/政策字样', !/审核|过审|安全|政策|policy|safety/i.test(preLine), preLine);
  ok('预审框仍要求接着写', /接着|续写/.test(preLine), preLine);
  ok('预审框不再提「已过审」', preLine.indexOf('过审') < 0, preLine);
}

/* ---------------- 汇总 ---------------- */
console.log('PASS ' + pass + ' / FAIL ' + fail);
if (fail) { fails.forEach((f) => console.log('  ✗ ' + f)); process.exit(1); }
