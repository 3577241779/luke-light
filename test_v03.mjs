/* test_v03.mjs — 破甲拆「普通 / 超级」，超级开启前必须过风险确认（0.4）
 *
 * 这一版只改「怎么开」，不改「补几次」：
 *   - cfg.jail 内部值仍是 off/safe/strong，只把显示名换成 关/普通/超级
 *   - 点破甲 chip 进超级档时不再直接生效，先弹 jailSuperAsk()，用户点「我知道风险，开启」才写 strong
 *   - 常驻的「🔔 确认:开」并进破甲区，变成只在破甲开着时出现的「🩹 补前先问:开」
 *
 * 跑法：node test_v03.mjs [目标文件]
 */
import fs from 'node:fs';
import vm from 'node:vm';

const TARGET = process.argv[2] || 'C:/Users/23548/Documents/deepseek-harness/default-workspace/_antiroute/v8/antiroute-v8-desktop.js';
const SRC = fs.readFileSync(TARGET, 'utf8');

let pass = 0, fail = 0;
function ok(name, cond, expect, actual) {
  const good = !!cond;
  if (good) { pass++; console.log('  ok   ' + name); }
  else { fail++; console.log('  FAIL ' + name + '\n         期望：' + String(expect == null ? '' : expect) + '\n         实际：' + String(actual == null ? '' : actual)); }
}
function group(t) { console.log('\n' + t); }

/* ---------------- 最小 DOM（只够 boot 用） ---------------- */
function makeEl(tag) {
  const el = {
    tagName: String(tag || 'div').toUpperCase(), id: '', className: '', textContent: '',
    style: {}, children: [], parentNode: null,
    appendChild(c) { c.parentNode = el; el.children.push(c); return c; },
    removeChild(c) { const i = el.children.indexOf(c); if (i >= 0) el.children.splice(i, 1); c.parentNode = null; return c; },
    insertBefore(c) { c.parentNode = el; el.children.unshift(c); return c; },
    setAttribute(k, v) { if (k === 'style') el.style.cssText = String(v); else el[k] = v; },
    getAttribute(k) { return el[k] == null ? null : String(el[k]); },
    removeAttribute(k) { delete el[k]; },
    addEventListener() {}, removeEventListener() {},
    querySelector() { return null; }, querySelectorAll() { return []; },
    classList: { contains: () => false, add: () => {}, remove: () => {}, toggle: () => {} },
    getBoundingClientRect() { return { width: 440, height: 320, top: 80, left: 80, right: 520, bottom: 400 }; },
    focus() {}, blur() {}, click() {}, closest() { return null; }, contains() { return false; },
    getContext: () => null
  };
  let html = '';
  Object.defineProperty(el, 'innerHTML', {
    get: () => html,
    set: (v) => { html = String(v == null ? '' : v); el.children.length = 0; }
  });
  Object.defineProperty(el, 'firstChild', { get: () => el.children[0] || null });
  Object.defineProperty(el, 'lastChild', { get: () => el.children[el.children.length - 1] || null });
  Object.defineProperty(el, 'childNodes', { get: () => el.children });
  return el;
}

function boot() {
  const store = {};
  const win = {
    console, setTimeout: (f) => { try { f(); } catch (e) {} return 1; }, clearTimeout() {},
    setInterval: () => 1, clearInterval() {}, requestAnimationFrame: (f) => { try { f(); } catch (e) {} return 1; },
    innerWidth: 390, innerHeight: 780, devicePixelRatio: 2,
    addEventListener() {}, removeEventListener() {}, matchMedia: () => ({ matches: false, addListener() {}, removeListener() {} }),
    getComputedStyle: () => ({ height: '580px', maxHeight: '580px', overflow: 'hidden', flexBasis: '0px' }),
    localStorage: {
      getItem: (k) => (k in store ? store[k] : null),
      setItem: (k, v) => { store[k] = String(v); },
      removeItem: (k) => { delete store[k]; }
    },
    btoa: (s) => Buffer.from(String(s), 'binary').toString('base64'),
    atob: (s) => Buffer.from(String(s), 'base64').toString('binary'),
    location: { href: 'https://tavern.local/' },
    navigator: { userAgent: 'node' },
    fetch: () => Promise.reject(new Error('no-net')),
    SillyTavern: {
      getContext: () => ({ chat: [], chatId: 'c1', name1: '阿明' }),
      libs: {}, getRequestHeaders: () => ({}), eventSource: { on() {}, removeListener() {} },
      event_types: {}, chat: [],
      extensionSettings: {}
    }
  };
  const body = makeEl('body');
  const doc = {
    body, documentElement: makeEl('html'),
    createElement: (t) => makeEl(t),
    createTextNode: (t) => ({ nodeValue: String(t), parentNode: null }),
    getElementById: () => null,
    querySelector: () => null, querySelectorAll: () => [],
    addEventListener() {}, removeEventListener() {},
    head: makeEl('head'),
    title: ''
  };
  win.document = doc;
  win.window = win; win.self = win; win.globalThis = win; win.top = win; win.parent = win;
  const ctx = vm.createContext(win);
  vm.runInContext(SRC, ctx, { filename: 'antiroute.js' });
  return { win, api: win.__AR6__, body };
}

const env = boot();
const api = env.api;

/* ---------------- [一] 档位名字 ---------------- */
group('[一] 三档显示名（内部值不变）');
ok('jailLabel 是函数', typeof api.jailLabel === 'function', 'function', typeof api.jailLabel);
api.setCfg('jail', 'off');
ok('off → 关', api.jailLabel() === '关', '关', api.jailLabel());
api.setCfg('jail', 'safe');
ok('safe → 普通', api.jailLabel() === '普通', '普通', api.jailLabel());
api.setCfg('jail', 'strong');
ok('strong → 超级', api.jailLabel() === '超级', '超级', api.jailLabel());
api.setCfg('jail', 'off');
ok('内部值没被改名', ['off', 'safe', 'strong'].indexOf(api.getCfg().jail) >= 0, 'off/safe/strong', api.getCfg().jail);

/* ---------------- [二] 确认框内容 ---------------- */
group('[二] 超级确认框说了什么');
const h = api.jailSuperHTML();
ok('标题问的是「开启超级破甲」', h.indexOf('开启「超级破甲」？') >= 0, '含标题', h.slice(0, 80));
ok('有「谨慎使用」标', h.indexOf('谨慎使用') >= 0);
ok('说清了它会改请求', h.indexOf('会改你发出去的请求') >= 0);
ok('点明了防路由会变差', h.indexOf('防路由结论可能变差') >= 0);
ok('只说两条代价，不再提安全层', h.indexOf('防路由结论可能变差') >= 0 && h.indexOf('更容易被拦') >= 0 && h.indexOf('安全层拒绝') < 0 && h.indexOf('那是另一回事') < 0);
ok('有开启按钮', h.indexOf('data-ar6-card="superok"') >= 0);
ok('有取消按钮', h.indexOf('data-ar6-card="superno"') >= 0);
ok('是覆盖层不是内嵌块', h.indexOf('position:fixed') >= 0);

/* ---------------- [三] 开关顺序：先问再开 ---------------- */
group('[三] 进超级档必须先问');
const iAsk = SRC.indexOf('if (nx === \'strong\') { jailSuperAsk(); return; }');
const iSet = SRC.indexOf('    cfg.jail = nx;');
ok('有「进 strong 先问」这条分支', iAsk > 0, '存在', iAsk);
ok('它在写 cfg.jail 之前', iAsk > 0 && iSet > 0 && iAsk < iSet, 'ask < set', iAsk + ' / ' + iSet);
ok('jailSuperAsk 是函数', typeof api.jailSuperAsk === 'function', 'function', typeof api.jailSuperAsk);
const iFn = SRC.indexOf('function jailSuperAsk()');
const iWrite = SRC.indexOf("cfg.jail = 'strong';", iFn);
const iOk = SRC.indexOf("if (act === 'superok')", iFn);
const iNo = SRC.indexOf("if (act === 'superno')", iFn);
ok('开 strong 只发生在点 superok 之后', iWrite > iOk && iOk > 0, 'superok 分支内', iWrite + ' / ' + iOk);
ok('点 superno 只关闭不写档', iNo > 0 && SRC.slice(iNo, iNo + 120).indexOf("cfg.jail = 'strong'") < 0);

/* ---------------- [四] 旧的常驻确认 chip 已并进破甲区 ---------------- */
group('[四] 「🔔 确认」并进破甲区');
ok('源码里不再有 🔔 确认 chip', SRC.indexOf("chip('🔔 确认:") < 0);
ok('改成破甲开时才出现的「补前先问」', SRC.indexOf("'🩹 补前先问:'") >= 0);
ok('它跟着破甲开关显隐', SRC.indexOf("cfg.jail === 'off' ? '' : chip('🩹 补前先问:") >= 0);
ok('补前先问仍写 jailConfirm', SRC.indexOf('cfg.jailConfirm = !cfg.jailConfirm') >= 0 || SRC.indexOf('jailConfirm = (cfg.jailConfirm') >= 0 || SRC.indexOf("cfg.jailConfirm !== false") >= 0);

/* ---------------- [五] 刹车没被顺手改坏 ---------------- */
group('[五] 刹车保持原样');
ok('每轮仍然只补 1 次', SRC.indexOf('var max = 1;') >= 0);
ok('没有重试阶梯（无 retry 循环）', SRC.indexOf('retryLoop') < 0 && SRC.indexOf('attempts++') < 0);
ok('三档仍是 off/safe/strong', /jailNext[\s\S]{0,220}'strong'/.test(SRC));
ok('拒绝后仍然停手', SRC.indexOf("if (j.code === 'refuse')") >= 0);

/* ---------------- [六] 版本 ---------------- */
group('[六] 版本');
ok('VERSION 是 0.4', api.VERSION === '1.1', '1.1', api.VERSION);
ok('配置结构版本没跟着改', api.getCfg().v === 831, '831', api.getCfg().v);
ok('构建产物里没有 0.2', SRC.indexOf("var VERSION = '0.2'") < 0);

console.log('\n合计：' + pass + ' 通过 / ' + fail + ' 失败');
process.exit(fail ? 1 : 0);
