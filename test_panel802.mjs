/* test_panel802.mjs — 面板不超高 + 点空白处收起 + 点遮罩关浮层 */
import fs from 'node:fs';
import vm from 'node:vm';

const SRC = fs.readFileSync(new URL('./antiroute-v8-desktop.js', import.meta.url), 'utf8');
let pass = 0, fail = 0; const fails = [];
const ok = (n, c, x) => { if (c) { pass++; console.log('  ok   ' + n); } else { fail++; fails.push(n + (x ? ' :: ' + x : '')); console.log('  FAIL ' + n + (x ? ' :: ' + x : '')); } };

function el(tag) {
  const e = {
    tagName: tag || 'div', id: '', style: {}, dataset: {}, children: [], parentNode: null,
    innerHTML: '', textContent: '', className: '',
    setAttribute(k, v) { this['_a' + k] = v; }, getAttribute(k) { return this['_a' + k] === undefined ? null : this['_a' + k]; },
    appendChild(c) { this.children.push(c); c.parentNode = this; return c; },
    removeChild(c) { const i = this.children.indexOf(c); if (i >= 0) this.children.splice(i, 1); },
    addEventListener() {}, removeEventListener() {}, setPointerCapture() {},
    contains(n) { if (n === this) return true; for (const c of this.children) if (c === n || (c.contains && c.contains(n))) return true; return false; },
    closest(sel) {
      const id = sel.replace('#', '');
      let p = this; while (p) { if (p.id === id) return p; p = p.parentNode; } return null;
    },
    querySelector() { return null; }, querySelectorAll() { return []; },
    getBoundingClientRect() { return { width: 400, height: 300, top: 10, left: 10, right: 410, bottom: 310 }; },
    classList: { add() {}, remove() {}, toggle() {}, contains() { return false; } }
  };
  Object.defineProperty(e, 'firstChild', { get() { return e.children.length ? e.children[0] : null; }, configurable: true });
  Object.defineProperty(e, 'innerHTML', {
    get() { return e._html || ''; },
    set(v) {
      e._html = String(v); e.children = [];
      const hasCard = /id="ar6-card"/.test(e._html);
      const c = el('div');
      if (hasCard) c.id = 'ar6-card';
      e.children.push(c); c.parentNode = e;
      const c2 = el('div'); c2.className = 'inner'; e.children.push(c2); c2.parentNode = e;
    }, configurable: true });

  return e;
}

function makeEnv() {
  const store = {};
  const listeners = [];
  const doc = {
    readyState: 'complete', documentElement: el('html'), body: el('body'), head: el('head'),
    createElement: (t) => el(t), createTextNode: (t) => ({ textContent: t }),
    getElementById(id) {
      const find = (n) => {
        for (const c of n.children) { if (c.id === id) return c; const r = find(c); if (r) return r; }
        return null;
      };
      return find(doc.body);
    },
    querySelector(sel) {
      const id = String(sel).replace('#', '');
      return doc.getElementById(id);
    },
    querySelectorAll() { return []; },
    addEventListener(type, fn, cap) { listeners.push({ type, fn, cap: !!cap }); },
    removeEventListener() {}, execCommand() { return true; }
  };
  const g = {
    console, navigator: { userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' },
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
  return { api: g.__AR6__, doc, listeners, g };
}

const env = makeEnv();
const api = env.api;

console.log('\n[一] 面板高度受控');
const rootEl = env.doc.getElementById('ar6-root');
ok('面板已挂载', !!rootEl);
/* v1.1：高度上限不再是根节点的 style，而是 CSS —— 盒子 .ar6-p 背 max-height:min(740px,92vh)，
   滚动交给内部 .ar6-body；根节点只剩全屏遮罩的定位/背景。 */
ok('桌面面板 max-height 在 .ar6-p 的 CSS 里', /#ar6-root \.ar6-p\{[^}]*max-height:min\(740px,92vh\)/.test(SRC));
ok('面板内部可滚动（.ar6-body overflow-y:auto）', /#ar6-root \.ar6-body\{[^}]*overflow-y:auto/.test(SRC));
ok('盒子自身 overflow:hidden（滚动只给 body）', /#ar6-root \.ar6-p\{[^}]*overflow:hidden/.test(SRC));
const st = String(rootEl.getAttribute('style') || '');
ok('根节点只是遮罩，不再自己写 max-height', st.indexOf('max-height') < 0, st.slice(0, 120));

console.log('\n[二] 点遮罩空白 → 收起（以弹窗盒为界）');
const pd = env.listeners.filter((l) => l.type === 'pointerdown');
ok('注册了 pointerdown 捕获监听', pd.length >= 1, String(pd.length));
/* v1.1：bindOutsideDismiss 先判 minimized（只有 openPanel 会把它清掉），
   且命中判断改用弹窗盒 .ar6-p 的 contains —— 根节点本身是遮罩，contains 恒真。 */
api.openPanel();
const rootBox = env.doc.getElementById('ar6-root');
ok('打开面板后是展开态', api.getCfg().min !== true, String(api.getCfg().min));
const keepOut = el('button');
rootBox.querySelector = (sel) => (sel === '.ar6-p' ? { style: {}, contains: (n) => n === keepOut } : null);
const outside = el('div');
try { pd[0].fn({ target: outside }); } catch (e) { console.log('    (handler threw: ' + e.message + ')'); }
ok('点面板外 → 收起', api.getCfg().min === true, String(api.getCfg().min));

console.log('\n[三] 点面板内不收起');
api.openPanel();
const rootIn = env.doc.getElementById('ar6-root');
const inner = el('button');
if (rootIn) rootIn.appendChild(inner);
if (rootIn) rootIn.querySelector = (sel) => (sel === '.ar6-p' ? { style: {}, contains: (n) => n === inner } : null);
try { pd[0].fn({ target: inner }); } catch (e) {}
ok('点面板内 → 保持展开', api.getCfg().min !== true, String(api.getCfg().min));

console.log('\n[四] 浮层：点遮罩关闭，点卡片不关闭');
api.openHelp('how');
const card = env.doc.getElementById('ar6-card');
ok('说明浮层已挂载', !!card);
try { pd[0].fn({ target: card.children[0] }); } catch (e) {}
ok('点卡片内容不关闭', !!env.doc.getElementById('ar6-card'));
try { pd[0].fn({ target: card }); } catch (e) {}
ok('点遮罩关闭', !env.doc.getElementById('ar6-card'));

console.log('\n' + pass + ' passed, ' + fail + ' failed');
process.exit(fail === 0 ? 0 : 1);
