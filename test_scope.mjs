/* test_scope.mjs — 检查范围（只查 Gemini）+ 退役名单收窄
   跑法：node test_scope.mjs
   用打包产物在 vm 里跑，和 test_gemini_matrix.mjs 同一套沙盘。 */
import fs from 'node:fs';
import vm from 'node:vm';

const ROOT = 'C:/Users/23548/Documents/deepseek-harness/default-workspace/_antiroute/v8';
const BUNDLE = fs.readFileSync(ROOT + '/antiroute-v8-desktop.js', 'utf8');

function makeEnv() {
  const store = {};
  const sb = {
    window: null, self: null, top: null,
    document: {
      body: {}, documentElement: {}, head: {}, readyState: 'complete',
      querySelector: () => null, querySelectorAll: () => [],
      createElement: () => ({ style: {}, setAttribute() {}, appendChild() {} }),
      addEventListener() {}
    },
    localStorage: {
      getItem: k => (k in store ? store[k] : null),
      setItem: (k, v) => { store[k] = String(v); },
      removeItem: k => { delete store[k]; }
    },
    navigator: { userAgent: 'scope' },
    location: { href: 'http://x/', origin: 'http://x' },
    setTimeout, clearTimeout, setInterval: () => 0, clearInterval: () => {},
    console: { log() {}, warn() {}, error() {} },
    TextDecoder: globalThis.TextDecoder,
    Promise, Math, Date, JSON, String, Number, Object, Array, RegExp, Error
  };
  sb.window = sb; sb.self = sb; sb.top = sb; sb.globalThis = sb;
  vm.createContext(sb);
  vm.runInContext(BUNDLE, sb, { timeout: 20000 });
  return sb;
}

let pass = 0, fail = 0;
function ok(name, cond, expect, actual) {
  if (cond) { pass++; console.log('  \u2713 ' + name); return; }
  fail++; console.log('  \u2717 ' + name);
  if (expect !== undefined) { console.log('      期望: ' + expect); console.log('      实际: ' + actual); }
}
function group(t) { console.log('\n【' + t + '】'); }

const api = makeEnv().__AR6__;
api.setChState({ echoes: false });

function verdict(req, obs, src) {
  const e = api.newEvidence(req, 200, 'sse');
  e.sawText = true;
  e.hasThink = true;
  e.observed = [obs];
  e.observedSrc = [src || 'body'];
  e.verifiable = api.verifiableCode();
  return api.verdictOf(e);
}

group('A. 默认只查 Gemini');

ok('默认值就是 gemini', api.getCfg().onlyGemini === true, 'true', api.getCfg().onlyGemini);
api.setCfg('onlyGemini', true);

ok('gemini-3.1-pro 在范围内', api.inScopeModel('gemini-3.1-pro') === true);
ok('gemini-3-flash 在范围内', api.inScopeModel('gemini-3-flash') === true);
ok('gemini-2.5-pro 在范围内', api.inScopeModel('gemini-2.5-pro') === true);
ok('gemma-3-27b-it 在范围内（同族）', api.inScopeModel('gemma-3-27b-it') === true);

ok('gpt-4o 不查', api.inScopeModel('gpt-4o') === false);
ok('claude-3-7-sonnet 不查', api.inScopeModel('claude-3-7-sonnet') === false);
ok('deepseek-chat 不查', api.inScopeModel('deepseek-chat') === false);
ok('qwen-max 不查', api.inScopeModel('qwen-max') === false);
ok('llama-3.1-70b 不查', api.inScopeModel('llama-3.1-70b') === false);

ok('认不出的名字放行', api.inScopeModel('some-relay-alias') === true);
ok('空名字放行', api.inScopeModel('') === true);

group('B. onlyGemini=false 时全部放行');

api.setCfg('onlyGemini', false);
ok('gpt-4o 也查', api.inScopeModel('gpt-4o') === true);
ok('claude 也查', api.inScopeModel('claude-3-7-sonnet') === true);

api.setCfg('onlyGemini', true);

group('C. 退役名单收窄：2.0 / 2.5 不再是「退役」');

let v = verdict('gemini-2.5-pro', 'gemini-2.5-flash', 'msg');
ok('只有聊天标签时，2.5-pro → 2.5-flash 判「被换」', v.code === 'diff', 'diff', v.code + ' / ' + v.note);

v = verdict('gemini-2.0-flash', 'gemini-2.0-flash-lite', 'msg');
ok('2.0-flash → 2.0-flash-lite 判「被换」', v.code === 'diff', 'diff', v.code);

v = verdict('gemini-3.8-flash', 'gemini-3.1-flash', 'msg');
ok('3.8 → 3.1 判「被换」', v.code === 'diff', 'diff', v.code);

group('D. 老退役名仍按退役处理');

v = verdict('gemini-1.5-pro', 'gemini-1.5-flash', 'msg');
ok('1.5-pro 的聊天标签仍被丢弃（判不出来）', v.code !== 'diff', '不是 diff', v.code);

group('E. 版本');

ok("VERSION 是 0.91 或更高", api.VERSION === '0.95' || api.VERSION === '0.95', '0.9x', api.VERSION);

console.log('\n通过 ' + pass + ' 条，失败 ' + fail + ' 条');
if (fail > 0) process.exit(1);
