/* test_v831.mjs — 卢克之光 0.4 回归
 *  1) 叙述层（防全知 / 去媚）三档、文案边界、幂等、多行输入
 *  2) 叙述注入的位置与顺序（微扰之后、破甲之前）
 *  3) 工具栏 8 → 1
 *
 * 这一套专门盯 8.31 最容易翻车的三处：
 *   - 幂等：注入写在请求副本上，但请求副本在多轮里会被复用，剥不干净就会越滚越长；
 *   - 多行：原正则 ^(.+)$ 的死穴，改成代码注入后必须验它真的不再受换行影响；
 *   - 顺序：破甲的尾巴必须压在最后，否则「直接写」的强度会被叙述文案稀释。
 */
import fs from 'node:fs';
import vm from 'node:vm';

const TARGET = process.argv[2] || 'C:/Users/23548/Documents/deepseek-harness/default-workspace/_antiroute/v8/antiroute-v8-desktop.js';
const SRC = fs.readFileSync(TARGET, 'utf8');

let pass = 0, fail = 0;
function ok(n, c, e) { if (c) { pass++; console.log('  ok   ' + n); } else { fail++; console.log('  FAIL ' + n + (e ? ' — ' + e : '')); } }
function group(t) { console.log('\n' + t); }

function el(tag) {
  const o = {
    tagName: String(tag || 'div').toUpperCase(), id: '', innerHTML: '', textContent: '', value: '', style: {},
    children: [], parentNode: null, _click: [],
    appendChild(c) { c.parentNode = this; this.children.push(c); return c; },
    removeChild(c) { const i = this.children.indexOf(c); if (i >= 0) this.children.splice(i, 1); return c; },
    setAttribute(k, v) { if (k === 'style') this.style.cssText = String(v); else this[k] = v; },
    getAttribute(k) { return this[k] == null ? null : String(this[k]); },
    addEventListener() {}, removeEventListener() {}, select() {}, focus() {},
    querySelector() { return null; }, querySelectorAll() { return []; },
    classList: { add() {}, remove() {}, toggle() {}, contains() { return false; } },
    getBoundingClientRect() { return { width: 430, height: 400, top: 8, left: 8, right: 438, bottom: 408 }; }
  };
  Object.defineProperty(o, 'firstChild', { get: function () { return this.children[0] || null; } });
  return o;
}

function makeEnv(opt) {
  opt = opt || {};
  const env = { t: 1762400000000, warns: [] };
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
    navigator: { userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' },
    innerWidth: 1440, matchMedia: () => ({ matches: false }),
    addEventListener() {}, removeEventListener() {},
    setTimeout: () => 0, clearTimeout() {}, setInterval: () => 0, clearInterval() {},
    fetch: () => Promise.resolve({ status: 200, ok: true }),
    XMLHttpRequest: function () {},
    SillyTavern: { getContext: () => ({ chat: [], name1: opt.name1 || '阿明' }) },
    Promise, Math, JSON, String, Number, Object, Array, RegExp, Error, Boolean,
    TextDecoder: globalThis.TextDecoder, Map, Set,
    eventOn: (ev, f) => { handlers[(ev && ev.key) || String(ev)] = f; return { stop() {} }; },
    getButtonEvent: (name) => ({ key: name }),
    Date: (function () { const D = function () {}; D.now = () => env.t; D.parse = Date.parse; D.UTC = Date.UTC; return D; })()
  };
  win.window = win; win.self = win; win.globalThis = win; win.top = win; win.parent = win;
  vm.runInContext(SRC, vm.createContext(win), { filename: 'ar8.js' });
  env.api = win.__AR6__; env.win = win; env.doc = doc; env.handlers = handlers; env.store = store;
  return env;
}

const env = makeEnv();
const api = env.api;
function cfgSet(k, v) { api.setCfg(k, v); }
function reset() { cfgSet('know', 'off'); cfgSet('charm', 'off'); cfgSet('refract', 'off'); cfgSet('jail', 'off'); cfgSet('pin', false); cfgSet('think', 'off'); cfgSet('alias', ''); }

/* ---------------- [一] 文案本身 ---------------- */
group('[一] 文案：三档都真在、也没有踩到护盾指纹');
{
  const K = api.NARR_KNOW, C = api.NARR_CHARM;
  ok('防全知 lite 存在', typeof K.lite === 'string' && K.lite.length > 20);
  ok('防全知 lite 够短（< 120 字）', K.lite.length < 120, String(K.lite.length));
  ok('防全知 full 够长（> 200 字）', K.full.length > 200, String(K.full.length));
  ok('防全知 full 有落笔自检', K.full.indexOf('【写完自己过一遍，不要输出】') >= 0);
  ok('防全知 lite 用「画面可以拉远」开场', K.lite.indexOf('画面可以拉远') >= 0);
  ok('防全知 full 有来源四问（归不进这四样）', K.full.indexOf('归不进这四样的') >= 0);
  ok('防全知 full 堵了事后传播（没写到在场）', K.full.indexOf('没有写到在场的人') >= 0);
  ok('去媚 lite 的核是「别人有别人的日子」', C.lite.indexOf('别人有别人的日子') >= 0);
  ok('去媚 full 有换人检验', C.full.indexOf('素不相识的路人') >= 0);
  ok('去媚 full 认「装作没听见」也是拒绝', C.full.indexOf('装作没听见') >= 0);
  ok('去媚 lite 存在', typeof C.lite === 'string' && C.lite.length > 20);
  ok('去媚 full 存在', C.full.length > 150, String(C.full.length));
  ok('去媚 full 不再出现「唯一通关」', C.full.indexOf('唯一') < 0);
  ok('去媚 full 删掉了「死亡」结局诱导', C.full.indexOf('死亡') < 0);
  ok('去媚 full 换成「世界自己转」', C.full.indexOf('这个世界自己转') >= 0);
  const all = K.lite + K.full + C.lite + C.full;
  ok('不带 HTML 注释指纹（护盾会误报）', all.indexOf('<!--') < 0);
  ok('不带 ANTI_ROUTE 指纹', all.indexOf('ANTI_ROUTE') < 0 && all.indexOf('IZUMI') < 0);
  ok('不命中破甲自带标记', /Reply directly|editorial system|<Master_input>/.test(all) === false);
  ok('没有半角 <user> 遗漏在结果里（narrFill 会换掉）', api.narrUserName() === '阿明', api.narrUserName());
}

/* ---------------- [二] 档位工具 ---------------- */
group('[二] 档位：循环与非法值');
{
  ok('narrTag off', api.narrTag('off') === '关');
  ok('narrTag lite', api.narrTag('lite') === '轻');
  ok('narrTag full', api.narrTag('full') === '强');
  ok('narrNext off→lite', api.narrNext('off') === 'lite');
  ok('narrNext lite→full', api.narrNext('lite') === 'full');
  ok('narrNext full→off', api.narrNext('full') === 'off');
  ok('非法值当关处理', api.narrTag('whatever') === '关');
  ok('默认两个都是关', api.getCfg().know === 'off' && api.getCfg().charm === 'off');
}

/* ---------------- [三] narrBody ---------------- */
group('[三] 拼装：空、带标记、内外层顺序');
{
  reset();
  ok('两个都关 → 空串', api.narrBody() === '', JSON.stringify(api.narrBody()));
  cfgSet('know', 'lite');
  const b1 = api.narrBody();
  ok('开了就有块', b1.length > 20);
  ok('块以 〔AR-NAR 开头', b1.indexOf('〔AR-NAR') === 0, b1.slice(0, 14));
  ok('块有闭合标记', b1.indexOf('〔/AR-NAR〕') > 0);
  ok('lite 的 token 估算 < 200', api.narrTokens() < 200, String(api.narrTokens()));
  cfgSet('charm', 'lite');
  const both = api.narrBody();
  const iCharm = both.indexOf('世界不围着人转');
  const iKnow = both.indexOf('视角与认知');
  ok('去媚在外层、防全知在内层', iCharm >= 0 && iKnow > iCharm, iCharm + '/' + iKnow);
  ok('两块只出现一次（没重复拼）', both.split('〔AR-NAR').length === 2);
  cfgSet('charm', 'full'); cfgSet('know', 'full');
  ok('双强档 token 估算在 700~950 之间', api.narrTokens() > 700 && api.narrTokens() < 950, String(api.narrTokens()));
}

/* ---------------- [四] narrStrip ---------------- */
group('[四] 剥离：不猜着删、多行原文完好');
{
  ok('没标记原样返回', api.narrStrip('你好') === '你好');
  ok('只有开头没闭合就放弃', api.narrStrip('你好\n〔AR-NAR 8.31〕\n残块') === '你好\n〔AR-NAR 8.31〕\n残块');
  const src = '第一行\n\n第二行   ';
  const injected = src + '\n\n〔AR-NAR 8.31〕\n中间\n〔/AR-NAR〕';
  ok('剥掉块', api.narrStrip(injected).indexOf('〔AR-NAR') < 0);
  ok('原文的多行结构还在', api.narrStrip(injected).indexOf('第一行\n\n第二行') === 0);
  const twice = injected + '\n\n〔AR-NAR 8.31〕\n块2\n〔/AR-NAR〕';
  ok('两个块一起剥干净', api.narrStrip(twice).indexOf('〔AR-NAR') < 0);
}

/* ---------------- [五] narrApply ---------------- */
group('[五] 注入：末条 user、幂等、多行、嵌套');
{
  reset();
  cfgSet('know', 'lite'); cfgSet('charm', 'lite');

  const body = { messages: [{ role: 'user', content: '我先说话' }, { role: 'assistant', content: '占位' }] };
  const c1 = api.narrApply(body);
  ok('changed 里有叙述', c1.join('|').indexOf('叙述:') >= 0, c1.join('|'));
  ok('注入到 user 而不是末条 assistant', body.messages[0].content.indexOf('〔AR-NAR') > 0);
  ok('assistant 占位没被动', body.messages[1].content === '占位');
  const t1 = body.messages[0].content;
  ok('原文在前、块在后', t1.indexOf('我先说话') === 0);
  ok('lite 块里没有残留 <user> 占位符', t1.indexOf('<user>') < 0);
  cfgSet('know', 'full'); cfgSet('charm', 'full');
  const fullTxt = api.narrBody();
  ok('<user> 换成了真名（强档确实带占位符）', fullTxt.indexOf('阿明') > 0 && fullTxt.indexOf('<user>') < 0, fullTxt.slice(0, 24).replace(/\n/g, '/'));
  cfgSet('know', 'lite'); cfgSet('charm', 'lite');

  const c2 = api.narrApply(body);
  ok('第二次注入什么都不改', c2.length === 0, c2.join('|'));
  ok('内容与第一次逐字相同（幂等）', body.messages[0].content === t1);

  const multi = { messages: [{ role: 'user', content: '第一行\n第三行\n\n空行后' }] };
  api.narrApply(multi);
  ok('多行输入不被吞', multi.messages[0].content.indexOf('第一行\n第三行\n\n空行后') === 0);
  ok('多行输入也注入成功', multi.messages[0].content.indexOf('〔AR-NAR') > 0);

  const nested = { request: { messages: [{ role: 'user', content: '嵌套' }] } };
  api.narrApply(nested);
  ok('body.request.messages 也能注入', nested.request.messages[0].content.indexOf('〔AR-NAR') > 0);

  ok('空 body 不抛', api.narrApply({}).length === 0);
  ok('没有 user 消息就不动', api.narrApply({ messages: [{ role: 'system', content: 's' }] }).length === 0);

  reset();
  const back = { messages: [{ role: 'user', content: t1 }] };
  const c3 = api.narrApply(back);
  ok('关档后能剥回去', back.messages[0].content.indexOf('〔AR-NAR') < 0, c3.join('|'));
  ok('剥回去后正文还在', back.messages[0].content.indexOf('我先说话') === 0);
}

/* ---------------- [六] planRequest 端到端 ---------------- */
group('[六] 端到端：真的进了请求体，且压在破甲之前');
{
  reset();
  cfgSet('know', 'full');
  const raw = JSON.stringify({ model: 'm', messages: [{ role: 'user', content: '开场' }] });
  const out = api.planRequest(raw, 'https://x/v1/chat/completions', false);
  ok('changed 里记了叙述', out.changed.join('|').indexOf('叙述:') >= 0, out.changed.join('|'));
  const parsed = JSON.parse(out.body);
  ok('请求体里真的有标记', parsed.messages[0].content.indexOf('〔AR-NAR') > 0);
  ok('模型字段没被叙述改坏', parsed.model === 'm');

  reset();
  const out2 = api.planRequest(raw, 'https://x/v1/chat/completions', false);
  ok('关档后请求体干净', JSON.parse(out2.body).messages[0].content.indexOf('〔AR-NAR') < 0);

  /* 关档也要能把「残留的块」剥掉：靠开关判断跳过的话，这里会永远留一块 */
  cfgSet('know', 'off'); cfgSet('charm', 'off');
  const dirty = JSON.stringify({ model: 'm', messages: [{ role: 'user', content: '原文\n\n〔AR-NAR 8.31〕\n旧的块\n〔/AR-NAR〕' }] });
  const out2b = api.planRequest(dirty, 'https://x/v1/chat/completions', false);
  ok('关档时残留块被剥干净', JSON.parse(out2b.body).messages[0].content.indexOf('AR-NAR') < 0,
    JSON.parse(out2b.body).messages[0].content.slice(0, 40));
  ok('剥完原文还在', JSON.parse(out2b.body).messages[0].content.indexOf('原文') === 0);

  reset();
  cfgSet('know', 'full');
  cfgSet('jail', 'strong');
  cfgSet('enabled', true);
  cfgSet('jailText', true);
  cfgSet('jailPre', false);
  const out3 = api.planRequest(raw, 'https://x/v1/chat/completions', false);
  const txt = JSON.parse(out3.body).messages.filter((m) => m.role === 'user').pop().content;
  const iNarr = txt.indexOf('〔/AR-NAR〕');
  const iJail = txt.indexOf('【直接续写】');
  ok('破甲尾巴还在', iJail > 0);
  ok('叙述块排在破甲尾巴之前', iNarr >= 0 && iNarr < iJail, iNarr + '/' + iJail);

  reset();
  cfgSet('know', 'full');
  const out4 = api.planRequest(raw, 'https://x/v1/chat/completions', true);
  ok('内部请求不注入叙述', String(out4.body).indexOf('AR-NAR') < 0);
}

/* ---------------- [七] 工具栏收缩 ---------------- */
group('[七] 工具栏：8 → 1');
{
  const acts = SRC.match(/key: '(selftest|toggle|refract|jail|idprobe|card|unhide|clear|panel)'/g) || [];
  ok('ACTION 只剩 1 个', acts.length === 1, String(acts.length));
  ok('剩下的那个是 panel', acts.length === 1 && acts[0].indexOf('panel') >= 0);
  ok('面板入口调的是 openPanel', SRC.indexOf('fn: function () { openPanel(); }') >= 0);
  ok('openPanel 存在', SRC.indexOf('function openPanel()') >= 0);
  ok('BTN_TOTAL 口径改成 1', api.btnSummary() === '0/1' || api.btnSummary() === '1/1', api.btnSummary());
}

/* ---------------- [八] 版本 ---------------- */
group('[八] 版本 0.4 / cfg.v = 831');
{
  ok('api.VERSION', api.VERSION === '1.1', api.VERSION);
  ok('cfg.v', api.getCfg().v === 831, String(api.getCfg().v));
  const m = SRC.match(/var VERSION = '([^']+)';/);
  ok('源码 VERSION 行', !!m && m[1] === '1.1', m ? m[0] : '没找到');
  ok('没有 8.30.0 残留', SRC.indexOf("'8.30.0'") < 0);
  ok('源码里有 12_narr 的标记常量', SRC.indexOf("var NARR_TAG = 'AR-NAR'") >= 0);
}

console.log('\n=== v8.31 叙述层 + 工具栏回归：' + pass + ' passed, ' + fail + ' failed ===');
process.exit(fail ? 1 : 0);
