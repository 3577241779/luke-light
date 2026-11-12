/* 谷歌全家桶：把所有代次 × 档位两两对打，用「独立算出来的期望」核对判定结果。
   期望值不调用被测代码里的 tierOf/genOf，避免自己验自己。 */
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
    navigator: { userAgent: 'matrix' },
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

const api = makeEnv().__AR6__;
api.setCfg('dualBase', 'https://relay-a.example/v1');
api.setChState({ echoes: false });

/* ---------- 独立期望：只看名字 ---------- */
const GEN = { '1.0': 1.0, '1.5': 1.5, '2.0': 2.0, '2.5': 2.5, '3': 3, '3.0': 3, '3.1': 3.1, '3.5': 3.5, '3.6': 3.6, '3.7': 3.7, '3.8': 3.8, '4': 4 };
function myGen(n) {
  const m = n.toLowerCase().match(/gemini-(\d(?:\.\d)?)[-.]/);
  if (!m) return 0;
  return GEN[m[1]] || 0;
}
function myTier(n) {
  const s = n.toLowerCase();
  if (/flash-lite|flash-8b|-lite\b|-nano\b/.test(s)) return 1;
  if (/argon|-ultra\b|ultra-/.test(s)) return 4;
  if (/-pro\b|-pro-/.test(s)) return 3;
  if (/-flash\b|-flash-/.test(s)) return 2;
  return 0;
}
function myIdent(n) {
  let t = n.toLowerCase();
  for (let i = 0; i < 4; i++) {
    const before = t;
    t = t.replace(/[-_.](?:ai|api|vertex|gcp|exp|experimental|preview|latest|thinking|think|nothink|nocot|low|medium|high|minimal|xhigh)$/, '');
    t = t.replace(/[-_.](?:v)?\d{1,2}(?:[-_.]\d{1,2}){1,2}$/, '');
    t = t.replace(/[-_.](?:v)?\d{3,}$/, '');
    if (t === before) break;
  }
  t = t.replace(/\.0(?=[-_.]|$)/, '');
  return t;
}

/* ---------- 谷歌模型清单 ---------- */
const MODELS = [
  'gemini-1.0-pro', 'gemini-1.5-pro', 'gemini-1.5-flash', 'gemini-1.5-flash-8b', 'gemini-1.5-pro-002',
  'gemini-2.0-flash', 'gemini-2.0-flash-lite', 'gemini-2.0-flash-exp', 'gemini-2.0-pro-exp',
  'gemini-2.5-pro', 'gemini-2.5-flash', 'gemini-2.5-flash-lite', 'gemini-2.5-pro-preview-06-05', 'gemini-2.5-flash-preview-09-2025',
  'gemini-3-pro-preview', 'gemini-3.0-flash', 'gemini-3-flash',
  'gemini-3.1-pro', 'gemini-3.1-flash', 'gemini-3.1-flash-lite', 'gemini-3.1-pro-preview',
  'gemini-3.5-flash', 'gemini-3.5-pro',
  'gemini-3.6-flash', 'gemini-3.7-flash', 'gemini-3.8-flash',
  'gemini-4-argon', 'gemini-4-argon-low', 'gemini-4-pro', 'gemini-4-flash', 'gemini-4-flash-lite',
  'gemma-3-27b-it', 'gemma-2-9b-it'
];

let pass = 0, fail = 0;
const fails = [];
function chk(name, cond, extra) {
  if (cond) pass++; else { fail++; if (fails.length < 40) fails.push(name + (extra ? ' :: ' + extra : '')); }
}

function verdict(req, obs) {
  const e = api.newEvidence(req, 200, 'sse');
  e.sawText = true;
  e.hasThink = true;
  e.observed = [obs];
  e.observedSrc = ['body'];
  e.verifiable = api.verifiableCode();
  return api.verdictOf(e);
}

/* —— 不变量 1：全部被认成 google —— */
for (const m of MODELS) chk('family google: ' + m, api.familyOf(m) === 'google', String(api.familyOf(m)));

/* —— 不变量 2：自反一致 —— */
for (const m of MODELS) chk('self same: ' + m, verdict(m, m).code === 'same', verdict(m, m).note);

/* —— 不变量 3：两两对打，绝不 unknown，方向语义正确 —— */
for (const a of MODELS) {
  for (const b of MODELS) {
    const r = verdict(a, b);
    chk('no unknown: ' + a + ' / ' + b, r.code !== 'unknown', r.code);

    const sameIdent = myIdent(a) === myIdent(b);
    if (sameIdent) {
      chk('ident equal => same: ' + a + ' / ' + b, r.code === 'same', r.code + ' ' + r.note);
      continue;
    }
    chk('ident differ => diff: ' + a + ' / ' + b, r.code === 'diff', r.code + ' ' + r.note);

    const ga = myGen(a), gb = myGen(b), ta = myTier(a), tb = myTier(b);
    const genDown = ga > 0 && gb > 0 && gb < ga - 0.001;
    const genUp = ga > 0 && gb > 0 && gb > ga + 0.001;
    const tierDown = ta > 0 && tb > 0 && tb < ta;
    const tierUp = ta > 0 && tb > 0 && tb > ta;

    if (tierDown && genUp) {
      chk('mixed 更新但更低：两边都写: ' + a + ' / ' + b, /代次/.test(r.note) && /档位/.test(r.note) && /更低/.test(r.note), r.note);
    } else if (tierDown) {
      chk('降档要说降档: ' + a + ' / ' + b, /降档/.test(r.note), r.note);
    } else if (genDown && tierUp) {
      chk('mixed 更旧但更高中档: ' + a + ' / ' + b, /降代/.test(r.note) && /更高/.test(r.note), r.note);
    } else if (genDown) {
      chk('降代要说降代: ' + a + ' / ' + b, /降代/.test(r.note), r.note);
    } else if (genUp || tierUp) {
      chk('升级措辞: ' + a + ' / ' + b, /更高配置|更新的模型/.test(r.note), r.note);
    }
  }
}

/* —— 不变量 4：写法归一 —— */
const EQUIV = [
  ['gemini-3-flash', 'gemini-3.0-flash'],
  ['gemini-3.1-flash', 'gemini-3.1-flash-preview'],
  ['gemini-3.1-flash', 'gemini-3.1-flash-ai'],
  ['gemini-3.1-flash', 'gemini-3.1-flash-thinking'],
  ['gemini-3.1-flash', 'gemini-3.1-flash-low'],
  ['gemini-4-argon', 'gemini-4-argon-ai'],
  ['gemini-2.5-pro', 'gemini-2.5-pro-preview-06-05']
];
for (const [a, b] of EQUIV) chk('equiv: ' + a + ' ≡ ' + b, verdict(a, b).code === 'same', verdict(a, b).code + ' ' + verdict(a, b).note);

/* —— 不变量 5：别的厂牌绝不认成 google —— */
for (const m of ['claude-3-7-sonnet', 'gpt-4o', 'deepseek-chat', 'qwen-max', 'glm-4', 'kimi-k2']) {
  chk('not google: ' + m, api.familyOf(m) !== 'google', String(api.familyOf(m)));
}

console.log('PASS ' + pass + ' / FAIL ' + fail);
if (fail) {
  for (const f of fails) console.log('  ✗ ' + f);
  process.exit(1);
}
