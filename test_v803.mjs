/* test_v803.mjs — v8.0.4 的 10 条修复：结构断言 + 关键行为 */
import fs from 'node:fs';
import vm from 'node:vm';

const SRC = fs.readFileSync(new URL('./antiroute-v8-desktop.js', import.meta.url), 'utf8');
let pass = 0, fail = 0;
const ok = (n, c, x) => { if (c) { pass++; console.log('  ok   ' + n); } else { fail++; console.log('  FAIL ' + n + (x ? ' :: ' + x : '')); } };

function el(tag) {
  const e = {
    tagName: tag || 'div', id: '', style: {}, children: [], parentNode: null, className: '',
    textContent: '', value: '',
    attrs: {},
    setAttribute(k, v) { this.attrs[k] = String(v); }, getAttribute(k) { return k in this.attrs ? this.attrs[k] : null; },
    appendChild(c) { this.children.push(c); c.parentNode = this; return c; },
    removeChild(c) { const i = this.children.indexOf(c); if (i >= 0) this.children.splice(i, 1); return c; },
    addEventListener() {}, removeEventListener() {}, setPointerCapture() {},
    contains(n) { if (n === this) return true; for (const c of this.children) if (c === n || (c.contains && c.contains(n))) return true; return false; },
    closest(sel) { const id = String(sel).replace('#', ''); let p = this; while (p) { if (p.id === id) return p; p = p.parentNode; } return null; },
    focus() { this._focused = true; },
    querySelector(sel) {
      const id = String(sel).replace('#', '');
      const find = (n) => { for (const c of n.children) { if (c.id === id) return c; const r = find(c); if (r) return r; } return null; };
      return find(this);
    },
    querySelectorAll() { return []; },
    getBoundingClientRect() { return { width: 400, height: 300, top: 0, left: 0, right: 400, bottom: 300 }; },
    classList: { list: [], add(c) { this.list.push(c); }, remove() {}, contains(c) { return this.list.indexOf(c) >= 0; } }
  };
  Object.defineProperty(e, 'firstChild', { get() { return e.children.length ? e.children[0] : null; }, configurable: true });
  Object.defineProperty(e, 'innerHTML', {
    get() { return e._html || ''; },
    set(v) {
      e._html = String(v); e.children = [];
      const wrap = el('div'); if (/id="ar6-card"/.test(e._html)) wrap.id = 'ar6-card';
      e.children.push(wrap);
      if (/DataDump/.test(e._html)) { /* noop */ }
    }, configurable: true
  });
  return e;
}

function makeEnv() {
  const store = {};
  const doc = {
    readyState: 'complete', documentElement: el('html'), body: el('body'), head: el('head'),
    activeElement: null,
    createElement: (t) => el(t), createTextNode: (t) => ({ textContent: t }),
    getElementById(id) {
      const find = (n) => { for (const c of n.children) { if (c.id === id) return c; const r = find(c); if (r) return r; } return null; };
      return find(doc.body);
    },
    querySelector(sel) { return doc.getElementById(String(sel).replace('#', '')); },
    querySelectorAll() { return []; },
    addEventListener() {}, removeEventListener() {}, execCommand() { return true; }
  };
  const g = {
    console, navigator: { userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)', deviceMemory: 8 },
    innerWidth: 1440, innerHeight: 900,
    setTimeout: (f) => { try { return setTimeout(f, 0); } catch (e) { return 0; } }, clearTimeout: () => {},
    setInterval: () => 1, clearInterval: () => {},
    localStorage: { getItem: (k) => (k in store ? store[k] : null), setItem: (k, v) => { store[k] = String(v); }, removeItem: (k) => { delete store[k]; } },
    SillyTavern: { getContext: () => ({ chat: [], name1: 'U', characters: [] }) },
    fetch: async () => ({ ok: true, status: 200, headers: { get: () => null }, clone() { return this; }, text: async () => '{}' }),
    addEventListener() {}, removeEventListener() {}
  };
  g.window = g; g.document = doc;
  vm.createContext(g);
  vm.runInContext(SRC, g, { filename: 'bundle.js' });
  return { api: g.__AR6__, doc, g };
}

const { api, doc } = makeEnv();

console.log('\n[1] 证据卡：engine 页签在卡片容器内部');
{
  const html = api.cardHTML({ at: Date.now(), code: 'diff', verdict: '被换', conf: 'A', req: 'a', obs: 'b', chars: 10, ttft: 400, total: 3000, src: 'body' }, 'engine');
  const iCard = html.indexOf('id="ar6-card"');
  const iTab = html.indexOf('data-ar6-card="tab"');
  const iHead = html.indexOf('border-bottom:2px solid');
  ok('页签出现在卡片之后', iCard >= 0 && iTab > iCard, 'card=' + iCard + ' tab=' + iTab);
  ok('页签在结论条之前', iTab > 0 && iHead > iTab, 'tab=' + iTab + ' head=' + iHead);
}

console.log('\n[2] 瘦身报告：空数据不抛');
{
  let threw = false, msg = '';
  try { const r = api.slimReport(''); ok('空文本返回 falsy 或对象', r === null || typeof r === 'object'); } catch (e) { threw = true; msg = e.message; }
  ok('slimReport("") 不抛', !threw, msg);
  const r2 = api.slimReport(JSON.stringify({ messages: [{ role: 'user', content: 'x'.repeat(20000) }] }));
  ok('大请求返回 chars 数字', r2 && typeof r2.chars === 'number' && r2.chars > 0);
  ok('不再依赖 tokens 字段', r2 && !('tokens' in r2));
}

console.log('\n[3] 观察器关闭仍会记录（结构断言）');
ok('handleFetch 里有 !watching 的补 finish', /!\s*watching\s*&&\s*pk/.test(SRC));
ok('finish 幂等标记 ev.__finished', /__finished/.test(SRC));

console.log('\n[4] 自动卡不顶掉破甲确认 / 已开卡');
ok('cardAuto 前判断 CARD.open', /if \(CARD && CARD\.open\) return;/.test(SRC));
ok('cardAuto 前判断 jailAskPending', /jailAskPending\(\)\) return;/.test(SRC));

console.log('\n[5] 破甲确认框登记为浮层');
ok('jailOffer 设 CARD.open', /CARD\.open = true; CARD\.rid = -1; CARD\.tab = 'jail'/.test(SRC));

console.log('\n[6] 浮层 style 不泄漏');
{
  api.openHelp('how');
  const card = doc.getElementById('ar6-card');
  ok('浮层已挂载', !!card);
  api.closeCard();
  ok('关闭后卡片移除', !doc.getElementById('ar6-card'));
  ok('closeCard 会清 data-ar6-extra', /data-ar6-extra/.test(SRC));
}

console.log('\n[7] 迟到 peek 保留页签');
ok('保留 keepTab', /var keepTab = CARD\.tab \|\| 'human'/.test(SRC));
ok('按 rid 找记录', /lg\[li\]\.rid === rid/.test(SRC));

console.log('\n[8] 兜底重试不反复重绘');
ok('只在 BTN_OK 变化时 render', /if \(BTN_OK !== lastOk\)/.test(SRC));

/* v1.1：悬浮球 / 「已贴边收起」的 hidden 模式整块删了 —— 收起改走 ✕ / 点遮罩 / Esc */
console.log('\n[9] 旧 hidden 模式已删除，收起改走 ✕');
ok('贴边提示文案已随悬浮球删除', !/已贴边收起|ar6-ball|openPanelFromBall/.test(SRC));
ok('右上角 ✕ 是收起入口', /data-ar6="close" title="关闭">✕</.test(SRC));
ok('Esc 也能收起', /k === 'Escape'/.test(SRC));

console.log('\n[10] 悬浮球黄色态 → 数字行');
ok('不再读 k.warn', !/k\.warn/.test(SRC));
ok('悬浮球已不存在', !/ar6-ball/.test(SRC));
ok('「今天拦下」按有效样本取 K.bad', /\(K\.eff \? K\.bad : '—'\)/.test(SRC));

console.log('\n[11] 显示层：动画与性能');
ok('有 keyframes', /@keyframes ar6-rise/.test(SRC));
ok('尊重 reduced-motion', /prefers-reduced-motion/.test(SRC));
/* v1.1：毛玻璃只允许留在全屏遮罩（panelStyle）上；弹窗盒子自己不许带，否则整块变糊。
   全源共 2 次（-webkit + 标准），且都必须在 panelStyle 里。 */
{
  const all = (SRC.match(/backdrop-filter/g) || []).length;
  const p0 = SRC.indexOf('function panelStyle(');
  const p1 = SRC.indexOf('\n}\n', p0);
  const ps = p0 >= 0 && p1 > p0 ? SRC.slice(p0, p1 + 2) : '';
  ok('backdrop-filter 只剩遮罩一处（2 次）', all === 2 && (ps.match(/backdrop-filter/g) || []).length === 2, 'count=' + all);
}
ok('表格单层滚动', /\.ar6-tbl\{padding:0 10px 10px;overflow:visible;\}/.test(SRC));
ok('表格固定列宽', /table-layout:fixed/.test(SRC));
ok('焦点还原', /prevFocus\.getAttribute/.test(SRC));

console.log('\n' + pass + ' passed, ' + fail + ' failed');
process.exit(fail === 0 ? 0 : 1);
