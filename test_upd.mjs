/* test_upd.mjs — 新版本检查（_src/18_upd.js）离线测试
   跑法：node test_upd.mjs   （全绿退出码 0，有红退出码 1）
   不加载 3_net.js / 4_ui.js：只把 18_upd.js 塞进 vm，
   给假的 cfg / VERSION / banner / localStorage / fetch / 定时器。 */
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const SRC_FILE = path.join(HERE, '_src', '18_upd.js');
const SRC = fs.readFileSync(SRC_FILE, 'utf8');
const VER = (fs.readFileSync(path.join(HERE, '_src', '1_core.js'), 'utf8').match(/var VERSION = '([^']+)'/) || [])[1] || '0';

let pass = 0;
let fail = 0;
function ok(name, cond, expect, actual) {
  if (cond) {
    pass++;
    console.log('  \u2713 ' + name);
  } else {
    fail++;
    console.log('  \u2717 ' + name);
    if (expect !== undefined) {
      console.log('      期望: ' + j(expect));
      console.log('      实际: ' + j(actual));
    }
  }
}
function j(v) {
  try { return JSON.stringify(v); } catch (e) { return String(v); }
}
function group(t) { console.log('\n【' + t + '】'); }

/* ---------------- vm 沙盘 ---------------- */
const store = {};
const cfg = { upd: 'off', updUrl: '' };
let bannerCalls = [];
let bannerText = '';
let bannerKind = '';

/* 假 fetch：模式可切。默认 200 + 合法 JSON。 */
let fetchCalls = 0;
let lastUrl = '';
let lastOpts = null;
let fetchMode = 'ok';
let respStatus = 200;
let respBody = '{"version":"1.2.3"}';
const respQueue = [];   /* 依次消费的响应体：一键更新要连发两次请求 */
let hasOkField = true;
let pendingReject = null;
let abortedCount = 0;

let timers = [];
let clearCalls = 0;

const HOST = {
  localStorage: {
    getItem: (k) => (Object.prototype.hasOwnProperty.call(store, k) ? store[k] : null),
    setItem: (k, v) => { store[k] = String(v); },
    removeItem: (k) => { delete store[k]; }
  },
  setTimeout: (fn, ms) => {
    /* 1300ms 是安装后等防抖窗口的那一下：真跑起来会让测试等 1.3 秒，
       且沙盘不会自己推进时间，所以直接排到下一个宏任务。其余（超时类）照旧挂起。 */
    if (ms === 1300) { setImmediate(fn); return { fn: fn, ms: ms, dead: false }; }
    const t = { fn: fn, ms: ms, dead: false };
    timers.push(t);
    return t;
  },
  clearTimeout: (t) => {
    clearCalls++;
    if (t && typeof t === 'object') t.dead = true;
  }
};

HOST.fetch = function (url, opts) {
  fetchCalls++;
  lastUrl = String(url);
  lastOpts = opts;
  if (fetchMode === 'throw') throw new Error('sync boom');
  if (fetchMode === 'reject') return Promise.reject(new Error('net down'));
  if (fetchMode === 'never') {
    return new Promise(function (res2, rej2) { pendingReject = rej2; });
  }
  if (fetchMode === 'nofetch') return null;
  const bodyNow = respQueue.length ? respQueue.shift() : respBody;
  const r = {
    status: respStatus,
    text: function () { return Promise.resolve(bodyNow); }
  };
  /* 只按 ok === false 判失败，所以「有 ok 字段」和「没有 ok 字段」都要能测 */
  if (hasOkField) r.ok = respStatus >= 200 && respStatus < 300;
  return Promise.resolve(r);
};

const sandbox = {
  cfg: cfg,
  VERSION: VER,
  HOST: HOST,
  localStorage: HOST.localStorage,
  banner: function (msg, kind) {
    bannerCalls.push({ msg: String(msg), kind: String(kind) });
    bannerText = String(msg);
    bannerKind = String(kind);
  },
  console: console,
  setTimeout: HOST.setTimeout,
  clearTimeout: HOST.clearTimeout
};
vm.createContext(sandbox);
vm.runInContext(SRC, sandbox, { filename: '18_upd.js' });

const U = sandbox;

/* ---------------- 小工具 ---------------- */
function reset(o) {
  o = o || {};
  cfg.upd = o.upd === undefined ? 'off' : o.upd;
  cfg.updUrl = o.url === undefined ? '' : o.url;
  delete store['ar6.upd'];
  fetchCalls = 0;
  lastUrl = '';
  lastOpts = null;
  fetchMode = 'ok';
  respStatus = 200;
  respBody = '{"version":"1.2.3"}';
  hasOkField = true;
  pendingReject = null;
  abortedCount = 0;
  timers = [];
  clearCalls = 0;
  bannerCalls = [];
  bannerText = '';
  bannerKind = '';
  delete HOST.AbortController;
  if (o.abortable) {
    HOST.AbortController = function () {
      this.signal = { aborted: false };
      this.abort = function () {
        abortedCount++;
        this.signal.aborted = true;
        if (pendingReject) {
          var rj = pendingReject;
          pendingReject = null;
          rj(new Error('aborted'));
        }
      };
    };
  }
}
function lastTimer() { return timers.length ? timers[timers.length - 1] : null; }
function okResp(o) { reset(o); return U.updCheck(true); }

console.log('=== 18_upd.js 测试（' + SRC.length + ' 字节源码）===');

/* ---------------- A 协议校验 ---------------- */
group('A 协议校验 updUrlOk');
ok('A1 http:// 通过', U.updUrlOk('http://x.com/v.txt') === true, true, U.updUrlOk('http://x.com/v.txt'));
ok('A2 https:// 通过', U.updUrlOk('https://x.com/v.txt') === true, true, U.updUrlOk('https://x.com/v.txt'));
ok('A3 前后空格能容忍（会 trim）', U.updUrlOk('  https://x.com/v.txt  ') === true, true, U.updUrlOk('  https://x.com/v.txt  '));
ok('A4 javascript: 拒绝', U.updUrlOk('javascript:alert(1)') === false, false, U.updUrlOk('javascript:alert(1)'));
ok('A5 file: 拒绝', U.updUrlOk('file:///C:/v.txt') === false, false, U.updUrlOk('file:///C:/v.txt'));
ok('A6 空串拒绝', U.updUrlOk('') === false, false, U.updUrlOk(''));
ok('A7 非字符串拒绝', U.updUrlOk(null) === false && U.updUrlOk(123) === false, false, [U.updUrlOk(null), U.updUrlOk(123)]);
ok('A8 超长串拒绝（>=500）', U.updUrlOk('https://x.com/' + 'a'.repeat(600)) === false, false, 'len490?');
ok('A9 499 字符仍通过', (function () {
  var head = 'https://x.com/';
  var s = head + 'a'.repeat(499 - head.length);
  return s.length === 499 && U.updUrlOk(s) === true;
})(), true);

/* ---------------- B 版本解析 ---------------- */
group('B 版本解析 updParse');
ok('B1 JSON.version', U.updParse('{"version":"1.2.3"}') === '1.2.3', '1.2.3', U.updParse('{"version":"1.2.3"}'));
ok('B2 JSON.tag 带 v 前缀 → 去 v', U.updParse('{"tag":"v1.2.3"}') === '1.2.3', '1.2.3', U.updParse('{"tag":"v1.2.3"}'));
ok('B3 JSON.tag_name', U.updParse('{"tag_name":"v2.0.1"}') === '2.0.1', '2.0.1', U.updParse('{"tag_name":"v2.0.1"}'));
ok('B4 JSON 两位版本', U.updParse('{"version":"1.1"}') === '1.1', '1.1', U.updParse('{"version":"1.1"}'));
ok('B5 纯文本 1.2.3', U.updParse('1.2.3') === '1.2.3', '1.2.3', U.updParse('1.2.3'));
ok('B6 纯文本 v1.2.3', U.updParse('v1.2.3\n') === '1.2.3', '1.2.3', U.updParse('v1.2.3\n'));
ok('B7 多行取第一个像版本号的行', U.updParse('# note\n\nv1.4.0\n1.5.0\n') === '1.4.0', '1.4.0', U.updParse('# note\n\nv1.4.0\n1.5.0\n'));
ok('B8 乱文本返回空串', U.updParse('hello world') === '', '', U.updParse('hello world'));
ok('B9 JSON 里版本非法且没有版本行 → 空串', U.updParse('{"version":"nightly"}') === '', '', U.updParse('{"version":"nightly"}'));
ok('B10 带后缀的版本不认（1.2.3-beta）', U.updParse('v1.2.3-beta') === '', '', U.updParse('v1.2.3-beta'));
ok('B11 null/空串返回空串', U.updParse(null) === '' && U.updParse('') === '', '', [U.updParse(null), U.updParse('')]);
ok('B12 数组 JSON 不当作对象解析', U.updParse('[1,2,3]') === '', '', U.updParse('[1,2,3]'));

/* ---------------- C 版本比较 ---------------- */
group('C 版本比较 updCmp');
ok('C1 1.2.3 > 1.2.2 → 1', U.updCmp('1.2.3', '1.2.2') === 1, 1, U.updCmp('1.2.3', '1.2.2'));
ok('C2 1.2.2 < 1.2.3 → -1', U.updCmp('1.2.2', '1.2.3') === -1, -1, U.updCmp('1.2.2', '1.2.3'));
ok('C3 1.2 == 1.2.0 → 0', U.updCmp('1.2', '1.2.0') === 0, 0, U.updCmp('1.2', '1.2.0'));
ok('C4 按数字比，不按字符串（1.2.10 > 1.2.9）', U.updCmp('1.2.10', '1.2.9') === 1, 1, U.updCmp('1.2.10', '1.2.9'));
ok('C5 非法输入 → 0', U.updCmp('abc', '1.1') === 0, 0, U.updCmp('abc', '1.1'));
ok('C6 空串 → 0', U.updCmp('', '1.0.0') === 0, 0, U.updCmp('', '1.0.0'));
ok('C7 带 v 前缀不认 → 0', U.updCmp('v1.2.3', '1.2.2') === 0, 0, U.updCmp('v1.2.3', '1.2.2'));
ok('C8 相等 → 0', U.updCmp('2.0.0', '2.0.0') === 0, 0, U.updCmp('2.0.0', '2.0.0'));

/* ---------------- D 抓取 ---------------- */
group('D 抓取 updCheck');
reset({ upd: 'check', url: 'https://x.com/v.json' });
let r = await U.updCheck();
ok('D1 200 + 合法 JSON → ok:true', r && r.ok === true, true, r);
ok('D2 latest 正确', r && r.latest === '1.2.3', '1.2.3', r && r.latest);
ok('D3 newer 正确（1.2.3 > 0.92）', r && r.newer === true, true, r && r.newer);
ok('D4 请求方法 GET', lastOpts && lastOpts.method === 'GET', 'GET', lastOpts && lastOpts.method);
ok('D5 cache: no-store', lastOpts && lastOpts.cache === 'no-store', 'no-store', lastOpts && lastOpts.cache);
ok('D6 Accept 头存在', !!(lastOpts && lastOpts.headers && lastOpts.headers['Accept']), true, lastOpts && lastOpts.headers);
ok('D7 请求的是配置里的 URL', lastUrl === 'https://x.com/v.json', 'https://x.com/v.json', lastUrl);
ok('D8 只发一次请求', fetchCalls === 1, 1, fetchCalls);

reset({ upd: 'check', url: 'https://x.com/v.json' });
respStatus = 404;
respBody = 'nope';
r = await U.updCheck();
ok('D9 404 → err:http + status', r && r.ok === false && r.err === 'http' && r.status === 404, { err: 'http', status: 404 }, r);

reset({ upd: 'check', url: 'https://x.com/v.json' });
respBody = 'totally not a version';
r = await U.updCheck();
ok('D10 文本乱 → err:parse', r && r.ok === false && r.err === 'parse', { err: 'parse' }, r);

reset({ upd: 'check', url: 'https://x.com/v.json' });
respBody = '{"version":"0.5"}';
r = await U.updCheck();
ok('D11 最新版更旧 → ok:true 但 newer:false', r && r.ok === true && r.newer === false, { ok: true, newer: false }, r);

reset({ upd: 'check', url: 'https://x.com/v.json' });
hasOkField = false;
r = await U.updCheck();
ok('D12 响应没有 ok 字段也按成功处理', r && r.ok === true, true, r);

reset({ upd: 'check', url: 'https://x.com/v.json' });
fetchMode = 'throw';
r = await U.updCheck();
ok('D13 fetch 同步抛错 → err:net（不炸）', r && r.err === 'net', { err: 'net' }, r);

reset({ upd: 'check', url: 'https://x.com/v.json' });
fetchMode = 'reject';
r = await U.updCheck();
ok('D14 fetch 异步 reject → err:net', r && r.err === 'net', { err: 'net' }, r);

reset({ upd: 'check', url: 'https://x.com/v.json', abortable: true });
fetchMode = 'never';
const pNever = U.updCheck();
const tNever = lastTimer();
ok('D15 8 秒定时器已挂上（8000ms）', tNever && tNever.ms === 8000, 8000, tNever && tNever.ms);
tNever.fn();
r = await pNever;
ok('D16 超时 abort → err:net，且确实调了 abort', r && r.err === 'net' && abortedCount === 1, { err: 'net', aborted: 1 }, { err: r && r.err, aborted: abortedCount });
ok('D17 收口后清掉定时器', clearCalls >= 1 && tNever.dead === true, true, { clearCalls: clearCalls, dead: tNever.dead });

/* ---------------- E 关闸 ---------------- */
group('E 关闸（默认关）');
reset({ upd: 'off', url: 'https://x.com/v.json' });
r = await U.updCheck();
ok('E1 off 且 !force → err:off', r && r.ok === false && r.err === 'off', { err: 'off' }, r);
ok('E2 关闸时一个请求都没发', fetchCalls === 0, 0, fetchCalls);

reset({ upd: 'off', url: 'https://x.com/v.json' });
r = await U.updCheck(true);
ok('E3 force 时关闸也能查一次', r && r.ok === true && fetchCalls === 1, true, { r: r, fetchCalls: fetchCalls });

reset({ upd: 'check', url: 'https://x.com/v.json' });
ok('E4 updOn() 读 cfg.upd=check 为真', U.updOn() === true, true, U.updOn());
reset({ upd: 'off', url: '' });
ok('E5 updOn() 关着为假', U.updOn() === false, false, U.updOn());

/* ---------------- F 地址留空走内置 ---------------- */
group('F 地址留空 / 非法 → 用内置地址');
reset({ upd: 'check', url: '' });
ok('F1 留空时 updUrlIsDefault 为真', U.updUrlIsDefault() === true, true, U.updUrlIsDefault());
ok('F2 留空时 updUrl 返回内置地址', U.updUrl().indexOf('dist/version') > 0 && U.updUrl().indexOf('http') === 0, true, U.updUrl());
r = await U.updCheck();
ok('F3 留空也能查（不再报 nourl）', r && r.ok === true, true, r);
ok('F4 留空时确实发了一次请求', fetchCalls === 1, 1, fetchCalls);

reset({ upd: 'check', url: 'javascript:alert(1)' });
ok('F5 非法协议也回落内置地址', U.updUrlIsDefault() === true, true, U.updUrlIsDefault());
r = await U.updCheck();
ok('F6 非法协议不报 nourl', r && r.ok === true, true, r);

reset({ upd: 'check', url: 'https://x.com/v.json' });
ok('F7 填了合法地址就用填的', U.updUrl() === 'https://x.com/v.json', 'https://x.com/v.json', U.updUrl());
ok('F8 填了合法地址就不算内置', U.updUrlIsDefault() === false, false, U.updUrlIsDefault());

/* ---------------- G 落库 ---------------- */
group('G 落库 ar6.upd');
reset({ upd: 'check', url: 'https://x.com/v.json' });
r = await U.updCheck();
const saved = JSON.parse(store['ar6.upd'] || '{}');
ok('G1 成功后 ar6.upd 里有 latest', saved.latest === '1.2.3', '1.2.3', saved.latest);
ok('G2 ar6.upd 里有 url', saved.url === 'https://x.com/v.json', 'https://x.com/v.json', saved.url);
ok('G3 ar6.upd 里有数字时间戳 at', typeof saved.at === 'number' && saved.at > 0, true, saved.at);
ok('G4 updState() 读得回来', U.updState().latest === '1.2.3', '1.2.3', U.updState().latest);

reset();
store['ar6.upd'] = '{坏 json';
ok('G5 存储损坏时 updState() 返回 {}', j(U.updState()) === '{}', '{}', U.updState());
store['ar6.upd'] = '[]';
ok('G6 存的是数组也返回 {}', j(U.updState()) === '{}', '{}', U.updState());

/* ---------------- H 不打扰 ---------------- */
group('H 不打扰 updLine');
reset();
ok('H1 没有记录 → 空串', U.updLine() === '', '', U.updLine());
reset();
store['ar6.upd'] = JSON.stringify({ latest: '1.1', url: 'u' });
ok('H2 等于当前版本 → 空串', U.updLine() === '', '', U.updLine());
reset();
store['ar6.upd'] = JSON.stringify({ latest: '0.50', url: 'u' });
ok('H3 比当前旧 → 空串', U.updLine() === '', '', U.updLine());
reset();
store['ar6.upd'] = JSON.stringify({ latest: '1.2.3', url: 'u' });
ok('H4 有新版 → 文案带新旧两个版本', U.updLine() === '有新版本 v1.2.3（当前 v1.1）', '有新版本 v1.2.3（当前 v1.1）', U.updLine());
ok('H5 文案不承诺「已自动更新」', U.updLine().indexOf('自动更新') < 0, true, U.updLine());
reset();
store['ar6.upd'] = JSON.stringify({ latest: 'garbage', url: 'u' });
ok('H6 latest 非法 → 空串', U.updLine() === '', '', U.updLine());

/* ---------------- I 安全 ---------------- */
group('I 安全（源码静态检查）');
ok('I1 源码没有 eval(', SRC.indexOf('eval(') < 0, true, SRC.indexOf('eval('));
ok('I2 源码没有 new Function(', SRC.indexOf('new Function(') < 0, true, SRC.indexOf('new Function('));
ok('I3 源码没有 document.write', SRC.indexOf('document.write') < 0, true, SRC.indexOf('document.write'));
ok('I4 源码没有 innerHTML 注入', SRC.indexOf('innerHTML') < 0, true, SRC.indexOf('innerHTML'));
ok('I5 只出现 GET 这一种方法', SRC.indexOf("method: 'GET'") >= 0 && SRC.indexOf('POST') < 0, true, SRC.indexOf('POST'));

/* ---------------- J 启动 updBoot ---------------- */
group('J 启动 updBoot');
reset({ upd: 'off', url: 'https://x.com/v.json' });
U.updBoot();
await new Promise((res2) => setTimeout(res2, 30));
ok('J1 关闸时 updBoot 不发请求', fetchCalls === 0, 0, fetchCalls);
ok('J2 关闸时 updBoot 不弹横幅', bannerCalls.length === 0, 0, bannerCalls.length);

reset({ upd: 'check', url: 'https://x.com/v.json' });
respBody = '{"version":"9.9.9"}';
U.updBoot();
await new Promise((res2) => setTimeout(res2, 30));
ok('J3 有新版时弹一条横幅', bannerCalls.length === 1, 1, bannerCalls);
ok('J4 横幅带 ⬆ 和版本文案', bannerText.indexOf('\u2b06') === 0 && bannerText.indexOf('有新版本 v9.9.9') > 0, true, bannerText);
ok('J5 横幅类型是 warn', bannerKind === 'warn', 'warn', bannerKind);

reset({ upd: 'check', url: 'https://x.com/v.json' });
respBody = '{"version":"0.1"}';
U.updBoot();
await new Promise((res2) => setTimeout(res2, 30));
ok('J6 没新版时不弹横幅', bannerCalls.length === 0, 0, bannerCalls.length);

reset({ upd: 'check', url: 'https://x.com/v.json' });
respStatus = 500;
U.updBoot();
await new Promise((res2) => setTimeout(res2, 30));
ok('J7 查询失败时静默', bannerCalls.length === 0, 0, bannerCalls.length);

/* ---------------- K 接线检查（别的文件有没有真的用上） ---------------- */
group('K 接线检查（4_ui.js / build_v8.mjs）');
const SRC_UI = fs.readFileSync(path.join(HERE, '_src', '4_ui.js'), 'utf8');
const SRC_BUILD = fs.readFileSync(path.join(HERE, 'build_v8.mjs'), 'utf8');
ok('K1 面板里有 chip 分派分支', SRC_UI.indexOf("act.indexOf('\u2b06 \u68c0\u67e5\u66f4\u65b0') === 0") >= 0, true);
ok('K1b 一键按钮接了 updQuick', SRC_UI.indexOf('updQuick()') >= 0, true);
ok('K2 面板里有版本地址输入框', SRC_UI.indexOf('data-ar6="updurl"') >= 0, true);
ok('K3 save 分支会读 updurl', SRC_UI.indexOf("querySelector('[data-ar6=\"updurl\"]')") >= 0, true);
ok('K4 启动时调了 updBoot', SRC_UI.indexOf('updBoot();') >= 0, true);
ok('K5 状态行用了 updLine()', SRC_UI.indexOf('var updTxt = updLine();') >= 0, true);
ok('K6 build 的 PARTS 里有 18_upd.js', SRC_BUILD.indexOf("'18_upd.js'") >= 0, true);
ok('K7 18_upd.js 排在 4_ui.js 之前', (function () {
  var a = SRC_BUILD.indexOf("'18_upd.js'");
  var b = SRC_BUILD.indexOf("'4_ui.js'");
  return a > 0 && b > a;
})(), true);
ok('K8 __AR6__ 导出了 updCheck / updLine / updParse / updCmp / updState / updOn',
  ['updOn: updOn', 'updCheck: updCheck', 'updParse: updParse', 'updCmp: updCmp', 'updLine: updLine', 'updState: updState']
    .every((s) => SRC_BUILD.indexOf(s) >= 0), true);


/* ---------------- L 一键安装 / 撤销 ---------------- */
group('[L] 一键安装与撤销');

/* 造一个假的酒馆设置：extension_settings.tavern_helper.scripts */
function mkHost(list) {
  HOST.extension_settings = { tavern_helper: { scripts: list } };
  HOST.saved = 0;
  HOST.saveSettingsDebounced = function () { HOST.saved++; };
}
function mkList() {
  return [
    { name: '别人的脚本', content: 'var OTHER = 1;' },
    { name: '卢克之光 V0.0.1·桌面版', content: "var VERSION = '0.0.1'; /* AR6 */" }
  ];
}
function pkgBody(ver) {
  return JSON.stringify({
    name: '卢克之光 V' + VER + '·桌面版',
    type: 'script',
    content: "var VERSION = '" + ver + "'; /* AR6 */"
  });
}

reset();
mkHost(mkList());
store['ar6.upd'] = JSON.stringify({ latest: '9.9', url: 'https://x/v.txt', pkgUrl: 'https://x/pkg.json' });

ok('L1 认自己：按名字命中第 2 条',
  U.updSelfIndex(HOST.extension_settings.tavern_helper.scripts) === 1,
  1, U.updSelfIndex(HOST.extension_settings.tavern_helper.scripts));
ok('L2 名字不像但带 VERSION+AR6 也能认出',
  U.updSelfIndex([{ name: 'x', content: "var VERSION = '1.1'; AR6" }]) === 0,
  0, U.updSelfIndex([{ name: 'x', content: "var VERSION = '1.1'; AR6" }]));
ok('L3 认不出就返回 -1', U.updSelfIndex([{ name: 'x', content: 'nothing' }]) === -1, -1, U.updSelfIndex([{ name: 'x', content: 'nothing' }]));
ok('L4 空表返回 -1', U.updSelfIndex([]) === -1, -1, U.updSelfIndex([]));

ok('L4b 两条同名同版本 → 平局拒装（返回 -1）',
  U.updSelfIndex([
    { name: '卢克之光', content: "var VERSION = '1.1'; AR6" },
    { name: '卢克之光', content: "var VERSION = '1.1'; AR6" }
  ]) === -1, -1, U.updSelfIndex([{ name: '卢克之光', content: "var VERSION = '1.1'; AR6" }, { name: '卢克之光', content: "var VERSION = '1.1'; AR6" }]));

ok('L4c 停用的那条不选',
  U.updSelfIndex([
    { name: '卢克之光', enabled: false, content: "var VERSION = '1.1'; AR6" },
    { name: '卢克之光 · TT酒馆适配', enabled: true, content: "var VERSION = '1.1'; AR6" }
  ]) === 1, 1, U.updSelfIndex([{ name: '卢克之光', enabled: false, content: "var VERSION = '1.1'; AR6" }, { name: '卢克之光 · TT酒馆适配', enabled: true, content: "var VERSION = '1.1'; AR6" }]));

ok('L4d 只有 getContext 时也能拿到设置（酒馆真实形态）', (function () {
  var keepS = HOST.extension_settings;
  delete HOST.extension_settings;
  HOST.SillyTavern = { getContext: function () { return { extensionSettings: keepS, saveSettingsDebounced: function () {} }; } };
  var got = U.updHostCtx();
  var okk = !!got && got.settings === keepS && got.saveKind === 'debounce';
  HOST.extension_settings = keepS;
  delete HOST.SillyTavern;
  return okk;
})(), true, 'via=ctx');

ok('L5 updHostCtx 能拿到设置', !!U.updHostCtx() && U.updHostCtx().settings === HOST.extension_settings, true, !!U.updHostCtx());
const keep = HOST.extension_settings;
delete HOST.extension_settings;
ok('L6 没有设置时 updHostCtx 返回 null', U.updHostCtx() === null, null, U.updHostCtx());
HOST.extension_settings = keep;

ok('L7 有包地址 + 版本更新 → 按钮出现', U.updHasPkg() === true, true, U.updHasPkg());
delete store['ar6.upd'];
ok('L8 没有记录 → 按钮不出现', U.updHasPkg() === false, false, U.updHasPkg());

ok('L9 updParseFull 取到版本与包地址',
  JSON.stringify(U.updParseFull('{"version":"1.1","url":"https://x/p.json"}')) === '{"v":"1.1","url":"https://x/p.json"}',
  'v/url 都有', JSON.stringify(U.updParseFull('{"version":"1.1","url":"https://x/p.json"}')));
ok('L10 只给版本不给地址也能用', U.updParseFull('1.1').url === '', '', U.updParseFull('1.1').url);
ok('L11 非 http 的包地址被拒', U.updParseFull('{"version":"1.1","url":"file:///x"}').url === '', '',
  U.updParseFull('{"version":"1.1","url":"file:///x"}').url);

mkHost(mkList());
store['ar6.upd'] = JSON.stringify({ latest: '1.1', pkgUrl: 'https://x/pkg.json' });
fetchMode = 'ok'; respStatus = 200; respBody = pkgBody('1.1');

const snapL = HOST.extension_settings.tavern_helper.scripts[1].content;
const p1 = U.updInstall();
await new Promise(function (r) { setImmediate(r); });
const r1 = await p1;
ok('L12 装成功', r1 && r1.ok === true, true, r1);
ok('L13 装的是版本文件里那一版', r1 && r1.version === VER, VER, r1 && r1.version);
ok('L14 脚本表被改写', HOST.extension_settings.tavern_helper.scripts[1].content.indexOf("'" + VER + "'") >= 0, true,
  HOST.extension_settings.tavern_helper.scripts[1].content);
ok('L15 存了一次设置', HOST.saved === 1, 1, HOST.saved);
ok('L16 装完能撤销', U.updCanUndo() === true, true, U.updCanUndo());
ok('L17 撤销把旧内容放回去', (function () {
  const r = U.updUndo();
  return r.ok === true && HOST.extension_settings.tavern_helper.scripts[1].content === snapL;
})(), true);
ok('L18 撤销之后不能再撤销', U.updCanUndo() === false, false, U.updCanUndo());

mkHost(mkList()); store['ar6.upd'] = JSON.stringify({ latest: '1.1', pkgUrl: '' });
const r2 = await U.updInstall();
ok('L19 没有包地址 → nopkg', r2 && r2.err === 'nopkg', 'nopkg', r2 && r2.err);

mkHost(mkList());
store['ar6.upd'] = JSON.stringify({ latest: '1.1', pkgUrl: 'https://x/p.json' });
HOST.extension_settings.tavern_helper.scripts = [{ name: 'nobody', content: 'x' }];
const r3 = await U.updInstall();
ok('L20 认不出自己 → noself，且一个字节都没动', r3 && r3.err === 'noself' && HOST.saved === 0, 'noself', r3 && r3.err);

mkHost(mkList());
respBody = '{"name":"x","content":"no version here"}';
const r4 = await U.updInstall();
ok('L21 包里没有 VERSION 行 → badpkg', r4 && r4.err === 'badpkg', 'badpkg', r4 && r4.err);
ok('L22 badpkg 不改脚本表', HOST.extension_settings.tavern_helper.scripts[1].content === snapL, snapL,
  HOST.extension_settings.tavern_helper.scripts[1].content);

respBody = pkgBody('0.91');
const r5 = await U.updInstall();
ok('L23 版本对不上 → mismatch', r5 && r5.err === 'mismatch', 'mismatch', r5 && r5.err);

respBody = '不是 json';
const r6 = await U.updInstall();
ok('L24 不是 JSON → badpkg', r6 && r6.err === 'badpkg', 'badpkg', r6 && r6.err);

respStatus = 404; respBody = pkgBody('1.1');
const r7 = await U.updInstall();
ok('L25 404 → http', r7 && r7.err === 'http', 'http', r7 && r7.err);

respStatus = 200; respBody = pkgBody('1.1'); fetchMode = 'reject';
const r8 = await U.updInstall();
ok('L26 网络挂 → net', r8 && r8.err === 'net', 'net', r8 && r8.err);
fetchMode = 'ok';

ok('L27 错误码都有人话', ['nopkg', 'noself', 'badpkg', 'mismatch', 'net', 'nohost', 'nobak']
  .every(function (c) { return U.updErrText(c).length > 0; }), true);
ok('L28 未知错误码也有兜底', U.updErrText('zzz').indexOf('zzz') >= 0, true);

ok('L29 面板有「装新版」chip', SRC_UI.indexOf('⬇ 装新版') >= 0, true);
ok('L30 面板有「撤销更新」chip', SRC_UI.indexOf('↩ 撤销更新') >= 0, true);
ok('L31 分派接上了 updInstall', SRC_UI.indexOf('updInstall().then') >= 0, true);
ok('L32 分派接上了 updUndo', SRC_UI.indexOf('updUndo()') >= 0, true);
ok('L33 导出补齐', ['updInstall: updInstall', 'updUndo: updUndo', 'updHasPkg: updHasPkg']
  .every(function (s) { return SRC_BUILD.indexOf(s) >= 0; }), true);

/* ---------------- M 一键：查 + 装 ---------------- */
group("M updQuick 一键");

/* 用远超当前的版本号，升版时这组不会自己变红 */
mkHost(mkList());
reset({ upd: "off", url: "" });          /* 开关关着、地址没填，照样能一键 */
fetchMode = "ok"; respStatus = 200;
respQueue.push("{\"version\":\"9.9\",\"url\":\"https://x/pkg.json\"}", pkgBody("9.9"));
const q1 = await U.updQuick();
ok("M1 关闸 + 空地址也能一键完成", q1 && q1.ok === true && q1.installed === true, true, q1);
ok("M2 装上的版本是 9.9", q1 && q1.version === "9.9", "9.9", q1 && q1.version);
ok("M3 脚本表真的被改写", HOST.extension_settings.tavern_helper.scripts[1].content.indexOf("9.9") >= 0, true);
ok("M4 用的是内置地址（不是空串）", lastUrl.length > 8, true, lastUrl);

mkHost(mkList());
reset({ upd: "off", url: "" });
fetchCalls = 0;
respQueue.push("{\"version\":\"0.1\",\"url\":\"https://x/pkg.json\"}");
const q2 = await U.updQuick();
ok("M5 比当前旧 → 不装", q2 && q2.ok === true && q2.newer === false, true, q2);
ok("M6 没有新版时只发一次请求", fetchCalls === 1, 1, fetchCalls);

mkHost(mkList());
reset({ upd: "off", url: "" });
const snap3 = HOST.extension_settings.tavern_helper.scripts[1].content;
respQueue.push("{\"version\":\"9.9\",\"url\":\"https://x/pkg.json\"}", "{坏包}");
const q3 = await U.updQuick();
ok("M7 包坏了 → 报错但不改脚本表", q3 && q3.ok === false && q3.err === "badpkg", true, q3);
ok("M8 报错时脚本表原样", HOST.extension_settings.tavern_helper.scripts[1].content === snap3, snap3, HOST.extension_settings.tavern_helper.scripts[1].content);


/* ---------------- N 组：0.95 审查后加固的四处 ---------------- */
console.log('\nN 组 地址校验 / 幂等安装 / 落盘失败 / 撤销还原名字');

ok('N1 "https://" 不算合法地址', U.updUrlOk('https://') === false, false, U.updUrlOk('https://'));
ok('N2 地址中间带空格不算合法', U.updUrlOk('https://x/a b.json') === false, false, U.updUrlOk('https://x/a b.json'));
ok('N3 正常地址仍然合法', U.updUrlOk('https://github.com/a/b/releases/download/v1/version.json') === true, true, U.updUrlOk('https://github.com/a/b/releases/download/v1/version.json'));

/* 幂等：装到同一版不重写、不覆盖备份 */
reset();
mkHost([
  { name: '别人的脚本', content: 'var OTHER = 1;' },
  { name: '卢克之光 V' + VER + '·桌面版', content: "var VERSION = '" + VER + "'; /* AR6 */" }
]);
store['ar6.upd'] = JSON.stringify({ latest: VER, url: 'https://x/v.txt', pkgUrl: 'https://x/pkg.json' });
HOST.saveSettings = function () { HOST.saved++; };
HOST.saveSettingsDebounced = function () { HOST.saved++; };
const before = HOST.extension_settings.tavern_helper.scripts[1].content;
const savedBefore = HOST.saved;
respQueue.push(pkgBody(VER));
const rN1 = await U.updInstall();
ok('N4 已装同一版 → ok 且 already', rN1 && rN1.ok === true && rN1.already === true, true, rN1);
ok('N5 已装同一版 → 内容没被重写', HOST.extension_settings.tavern_helper.scripts[1].content === before, true, 'same');
ok('N6 已装同一版 → 一次保存都没发', HOST.saved === savedBefore, savedBefore, HOST.saved);

/* 落盘失败：没有保存函数 / 保存抛错 */
reset();
mkHost(mkList());
store['ar6.upd'] = JSON.stringify({ latest: '9.9', url: 'https://x/v.txt', pkgUrl: 'https://x/pkg.json' });
HOST.extension_settings.tavern_helper.scripts[1].content = "var VERSION = '0.0.1'; /* AR6 */";
HOST.saveSettings = undefined;
HOST.saveSettingsDebounced = undefined;
respQueue.push(pkgBody('9.9'));
const rN2 = await U.updInstall();
ok('N7 没有保存函数 → nosave', rN2 && rN2.ok === false && rN2.err === 'nosave', 'nosave', rN2 && rN2.err);

reset();
mkHost(mkList());
store['ar6.upd'] = JSON.stringify({ latest: '9.9', url: 'https://x/v.txt', pkgUrl: 'https://x/pkg.json' });
HOST.extension_settings.tavern_helper.scripts[1].content = "var VERSION = '0.0.1'; /* AR6 */";
HOST.saveSettings = function () { throw new Error('disk full'); };
HOST.saveSettingsDebounced = function () { throw new Error('disk full'); };
respQueue.push(pkgBody('9.9'));
const rN3 = await U.updInstall();
ok('N8 保存抛错 → nosave', rN3 && rN3.ok === false && rN3.err === 'nosave', 'nosave', rN3 && rN3.err);
ok('N9 nosave 有中文人话', U.updErrText('nosave').indexOf('没装成') >= 0, true, U.updErrText('nosave'));

/* 撤销要连名字一起还原 */
reset();
mkHost(mkList());
store['ar6.upd'] = JSON.stringify({ latest: '9.9', url: 'https://x/v.txt', pkgUrl: 'https://x/pkg.json' });
HOST.saveSettings = function () { HOST.saved++; };
const nameBefore = HOST.extension_settings.tavern_helper.scripts[1].name;
respQueue.push(JSON.stringify({ name: '卢克之光 V9.9·桌面版', type: 'script', content: "var VERSION = '9.9'; /* AR6 */" }));
await U.updInstall();
ok('N10 装完名字被换成新包里的', HOST.extension_settings.tavern_helper.scripts[1].name === '卢克之光 V9.9·桌面版', '卢克之光 V9.9·桌面版', HOST.extension_settings.tavern_helper.scripts[1].name);
U.updUndo();
ok('N11 撤销后名字还原', HOST.extension_settings.tavern_helper.scripts[1].name === nameBefore, nameBefore, HOST.extension_settings.tavern_helper.scripts[1].name);

/* 成功提示按保存方式分叉 */
ok('N12 同步保存 → 直接说刷新', U.updDoneText('1.1', 'sync').indexOf('刷新一次') >= 0, true, U.updDoneText('1.1', 'sync'));
ok('N13 防抖保存 → 先说等两秒', U.updDoneText('1.1', 'debounce').indexOf('等两秒') >= 0, true, U.updDoneText('1.1', 'debounce'));

/* 认自己：双装时取版本对得上的那条 */
const two = [
  { name: '卢克之光 V0.1·TT酒馆适配', content: "var VERSION = '0.1'; AR6" },
  { name: '卢克之光 V' + VER + '·桌面版', content: "var VERSION = '" + VER + "'; AR6" }
];
ok('N14 双装时认出正在跑的那条', U.updSelfIndex(two) === 1, 1, U.updSelfIndex(two));

/* ---------------- 汇总 ---------------- */
console.log('\n----------------------------------------');
console.log('通过 ' + pass + ' 条，失败 ' + fail + ' 条（共 ' + (pass + fail) + ' 条）');
if (fail) {
  console.log('\u274c 有失败');
  process.exit(1);
}
console.log('\u2705 全绿');
