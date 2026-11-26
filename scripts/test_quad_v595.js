'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const DIST = path.resolve(__dirname, '../dist');
const TARGETS = ['luke-light-st.json', 'luke-light-tt.json', 'luke-light-desktop.json'];

let pass = 0, fail = 0;
function check(cond, label, detail) {
  if (cond) pass++;
  else { fail++; console.error(`  [FAIL] ${label}${detail ? ' :: ' + detail : ''}`); }
}

function loadTarget(fileName) {
  const fullPath = path.join(DIST, fileName);
  const raw = JSON.parse(fs.readFileSync(fullPath, 'utf8'));
  const store = Object.create(null);
  const localStorage = {
    getItem: k => (Object.prototype.hasOwnProperty.call(store, k) ? store[k] : null),
    setItem: (k, v) => { store[k] = String(v); },
    removeItem: k => { delete store[k]; },
  };
  const styles = [];
  const rootEl = {
    id: 'ar6-root',
    tagName: 'DIV',
    style: {},
    attrs: Object.create(null),
    isConnected: true,
    _slot: { id: 'slot-memo', innerHTML: '', style: {}, setAttribute() {}, getAttribute() { return null; } },
    setAttribute(k, v) { this.attrs[k] = String(v); },
    getAttribute(k) { return Object.prototype.hasOwnProperty.call(this.attrs, k) ? this.attrs[k] : null; },
    hasAttribute(k) { return Object.prototype.hasOwnProperty.call(this.attrs, k); },
    removeAttribute(k) { delete this.attrs[k]; },
    querySelector(sel) {
      if (String(sel || '').includes('data-ar6-sib-slot')) return this._slot;
      return null;
    },
    querySelectorAll() { return []; },
    addEventListener() {}, removeEventListener() {},
  };
  const doc = {
    body: { appendChild(el) { return el; }, removeChild() {}, children: [] },
    head: { appendChild(el) { styles.push(el); return el; }, removeChild() {} },
    documentElement: { clientWidth: 360, clientHeight: 800, style: {} },
    getElementById(id) { return id === 'ar6-root' ? rootEl : null; },
    querySelector() { return null; },
    querySelectorAll() { return []; },
    createElement(tag) {
      return {
        tagName: String(tag || 'DIV').toUpperCase(),
        style: {}, innerHTML: '', textContent: '',
        setAttribute() {}, getAttribute() { return null; }, removeAttribute() {},
        appendChild() {}, removeChild() {}, addEventListener() {}, removeEventListener() {},
        querySelector() { return null; }, querySelectorAll() { return []; },
      };
    },
    addEventListener() {}, removeEventListener() {},
  };
  const winListeners = Object.create(null);
  const dispatched = [];
  const win = {
    document: doc, localStorage,
    innerWidth: 360, innerHeight: 800,
    navigator: { userAgent: 'Mobile' },
    console: { log() {}, warn() {}, info() {}, error() {} },
    fetch: async () => new Response('{}', { status: 200 }),
    setTimeout: () => 0, clearTimeout() {}, setInterval: () => 0, clearInterval() {},
    addEventListener(t, fn) { (winListeners[t] = winListeners[t] || []).push(fn); },
    removeEventListener(t, fn) { if (winListeners[t]) winListeners[t] = winListeners[t].filter(f => f !== fn); },
    CustomEvent: function (t, o) { this.type = t; this.detail = o && o.detail; },
    dispatchEvent(ev) {
      dispatched.push(ev);
      const ls = (ev && ev.type && winListeners[ev.type]) || [];
      for (const fn of ls.slice()) fn(ev);
      return true;
    },
    SillyTavern: {
      getContext: () => ({ chat: [{ is_user: true, mes: 'hi' }, { is_user: false, mes: 'story' }] }),
    },
    URL, TextEncoder, TextDecoder, Response, Headers, Request,
  };
  win.window = win; win.top = win; win.parent = win; win.self = win; win.globalThis = win;
  const ctx = vm.createContext(win);
  new vm.Script(raw.content, { filename: fileName }).runInContext(ctx);
  return { win, api: win.__AR6__, styles, rawCode: raw.content, dispatched };
}

for (const fileName of TARGETS) {
  console.log(`\n=== V5.95 四生合体专项回归: ${fileName} ===`);
  const { win, api, rawCode } = loadTarget(fileName);

  check(api && api.VERSION === '5.99', `${fileName}: VERSION === 5.99`);

  // P0-1 & P0-2: 动态成员数徽标 + ar6-quad 手机 2×2 网格类
  const unregLens = api.registerSibling({ id: 'lightlens', label: '光域·镜影', icon: '🎞️', mount() {}, unmount() {} });
  const bar2 = api.uiPrismDualBarHTML('luke');
  check(bar2.includes('⚡ 双生联动') && !bar2.includes('ar6-quad'), `${fileName}: 2 成员（卢克+镜影）显示「⚡ 双生联动」且无 ar6-quad`, bar2);

  const unregMemo = api.registerSibling({ id: 'lightmemo', label: '光域·镜忆', icon: '🧠', mount() {}, unmount() {} });
  const bar3NoPrism = api.uiPrismDualBarHTML('luke');
  check(bar3NoPrism.includes('⚡ 三生合体') && !bar3NoPrism.includes('ar6-quad'), `${fileName}: 3 成员（卢克+镜影+镜忆，无镜界）显示「⚡ 三生合体」且无 ar6-quad`, bar3NoPrism);

  // 挂载光域·镜界桥接模拟四生合体
  win.__LK_PRISM_BRIDGE__ = {
    signature: 'LK-PRISM-V0.7',
    isActivePreset: () => true,
    getSnapshot: () => ({ active: true, enabledMap: { a: true, b: true }, items: {} }),
  };
  const bar4 = api.uiPrismDualBarHTML('luke');
  check(bar4.includes('ar6-dualbar ar6-quad') && bar4.includes('⚡ 四生合体'), `${fileName}: 4 成员（卢克+镜界+镜影+镜忆）加 ar6-quad 类且显示「⚡ 四生合体」`, bar4);
  check(bar4.includes('🧠 光域·镜忆') && bar4.includes('🎞️ 光域·镜影'), `${fileName}: 四生顶栏包含镜影与镜忆按钮`);
  check(rawCode.includes('#ar6-root .ar6-dualbar.ar6-quad{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:5px;}'), `${fileName}: 480px 窄屏 2×2 网格 CSS 已注入`);
  if (typeof unregMemo === 'function') unregMemo();
  if (typeof unregLens === 'function') unregLens();

  // P0-3: 5 套新皮肤四生顶栏 CSS 覆盖
  for (const sk of ['marvel', 'imperial', 'westfantasy', 'eldritch', 'cyberpunk']) {
    check(rawCode.includes(`#ar6-root[data-skin="${sk}"] .ar6-dualbar{`) && rawCode.includes(`#ar6-root[data-skin="${sk}"] .ar6-dualbtn.on`), `${fileName}: 皮肤 ${sk} 含 .ar6-dualbar 与 .ar6-dualbtn.on 主题色`);
  }

  // P1-1: 记忆插件旁路 Symbol 精准识别（且优先于 acu.internal-generation-fetch）
  const sMemo = Symbol.for('lk.memo.internal-fetch');
  const sBypass = Symbol.for('ar6.bypass');
  const sAcu = Symbol.for('acu.internal-generation-fetch');
  const c1 = api.classifyRequestTraffic({ [sMemo]: true }, {}, 'https://api.example.com/v1/chat/completions');
  check(c1.isPlugin === true && c1.kind === 'lk_memo' && c1.label === '光域·镜忆', `${fileName}: lk.memo.internal-fetch 归类为「光域·镜忆」`, JSON.stringify(c1));
  const c2 = api.classifyRequestTraffic({ [sBypass]: true, [sAcu]: true }, {}, 'https://api.example.com/v1/embeddings');
  check(c2.isPlugin === true && c2.kind === 'lk_memo' && c2.label === '光域·镜忆', `${fileName}: ar6.bypass + acu 双标优先归类为「光域·镜忆」`, JSON.stringify(c2));

  // P1-4: MAIN_STORY_MEM_INJECT_RE 白名单双保险（含 <lk_mem_ctx> / 【前情纪事】 / 【人物与世界回溯】 不误判为插件）
  for (const prefix of ['<lk_mem_ctx>历史回顾</lk_mem_ctx>', '【前情纪事】第1章', '【人物与世界回溯】角色A']) {
    const body = { messages: [{ role: 'system', content: '剧情扮演' }, { role: 'user', content: prefix + '\n自动摘要参考\n我推开门走进大厅' }] };
    const cr = api.classifyRequestTraffic({}, body, '/api/backends/chat-completions/generate');
    check(cr.isStory === true && cr.isPlugin === false, `${fileName}: 含白名单前缀 ${prefix.slice(0, 12)} 放行正文不被误判插件`, JSON.stringify(cr));
  }

  // P1-2: LIVE / isLive / isJailAskPending 导出
  check(api.LIVE && typeof api.LIVE === 'object' && typeof api.isLive === 'function' && typeof api.isJailAskPending === 'function', `${fileName}: AR6_API 导出 LIVE / isLive / isJailAskPending`);
  check(api.isLive() === false && api.isJailAskPending() === false, `${fileName}: 初始空闲态 isLive()=false 且 isJailAskPending()=false`);

  // P1-5: getSkinPalette 覆盖全 10 皮肤 + minimal 映射 + 未知兜底 + 返回副本防篡改
  check(typeof api.getSkinPalette === 'function', `${fileName}: 导出 getSkinPalette(skinId)`);
  for (const sk of api.AR6_SKIN_ORDER) {
    const pal = api.getSkinPalette(sk);
    check(pal && pal.id === sk && pal.bg0 && pal.bg1 && pal.card && pal.border && pal.accent && pal.ink && pal.muted && pal.radius && pal.font, `${fileName}: getSkinPalette('${sk}') 返回完整色板`, JSON.stringify(pal));
  }
  const palMin = api.getSkinPalette('minimal');
  check(palMin && palMin.id === 'plain', `${fileName}: getSkinPalette('minimal') 自动映射为 plain`);
  const palFb = api.getSkinPalette('nonexistent_skin');
  check(palFb && palFb.id === 'ultra', `${fileName}: getSkinPalette 未知皮肤安全回退 ultra`);
  palFb.accent = '#000000';
  check(api.getSkinPalette('ultra').accent === '#38BDF8', `${fileName}: getSkinPalette 返回独立副本防污染`);

  // P1-3: ar6:turn-settled 载荷包含 finalChars 与 chatIndex 源码校验
  check(rawCode.includes('finalChars: settledChars, chatIndex: settledChatIdx'), `${fileName}: ar6:turn-settled 增补 finalChars 与 chatIndex`);

  // V5.96 补强 A: syncGlobalSiblings() 过期队列兄弟清理 + 保留直连兄弟
  let qUnmounted = 0;
  const qSpec = { id: 'qmemo', label: '队列镜忆', icon: '🧠', mount() {}, unmount() { qUnmounted++; } };
  const dSpec = { id: 'dlens', label: '直连镜影', icon: '🎞️', mount() {}, unmount() {} };
  const unregDirect = api.registerSibling(dSpec);
  win.__LK_SIBLINGS__ = [qSpec];
  win.dispatchEvent(new win.CustomEvent('lk:siblings-changed'));
  check(api.listSiblings().some(s => s.id === 'qmemo') && api.listSiblings().some(s => s.id === 'dlens'), `${fileName}: 队列兄弟与直连兄弟同时在线`);
  api.openSiblingPanel('qmemo');
  check(api.getPrismView() === 'sibling:qmemo', `${fileName}: 已切到队列兄弟 qmemo 视图`);
  // 模拟队列兄弟仅从 __LK_SIBLINGS__ 移除并广播 lk:siblings-changed 退场
  win.__LK_SIBLINGS__ = [];
  win.dispatchEvent(new win.CustomEvent('lk:siblings-changed'));
  check(!api.listSiblings().some(s => s.id === 'qmemo'), `${fileName}: syncGlobalSiblings() 清理已从共享队列退场的过期兄弟`);
  check(api.listSiblings().some(s => s.id === 'dlens'), `${fileName}: 清理过期队列兄弟时不误删 direct 直连活跃兄弟`);
  check(qUnmounted === 1 && api.getPrismView() === 'luke', `${fileName}: 过期兄弟退场时自动卸载并回退 luke 视图`, `unmounted=${qUnmounted}, view=${api.getPrismView()}`);
  if (typeof unregDirect === 'function') unregDirect();

  // V5.96 补强 B: render() 热更 AR6_SIB_MOUNTED.spec !== sibSpec 重挂载 + 同引用幂等
  let m1 = 0, u1 = 0, m2 = 0, u2 = 0;
  const hot1 = { id: 'lightmemo', label: '光域·镜忆', icon: '🧠', mount() { m1++; }, unmount() { u1++; } };
  const hot2 = { id: 'lightmemo', label: '光域·镜忆 v2', icon: '🧠', mount() { m2++; }, unmount() { u2++; } };
  api.registerSibling(hot1);
  api.openSiblingPanel('lightmemo');
  check(m1 === 1 && u1 === 0, `${fileName}: 首次挂载 hot1 成功`, `m1=${m1}, u1=${u1}`);
  // 同引用重复注册必须幂等零重挂
  api.registerSibling(hot1);
  check(m1 === 1 && u1 === 0, `${fileName}: 同引用重复 registerSibling 严格幂等不重复挂载`, `m1=${m1}, u1=${u1}`);
  // 热更替换为新 spec 引用 hot2：自动卸载旧 hot1 并挂载新 hot2
  const unregHot2 = api.registerSibling(hot2);
  check(u1 === 1 && m2 === 1 && u2 === 0, `${fileName}: 热更新引用触发 AR6_SIB_MOUNTED.spec !== sibSpec 自动卸载旧实例并重挂新实例`, `u1=${u1}, m2=${m2}, u2=${u2}`);
  if (typeof unregHot2 === 'function') unregHot2();

  api.dispose();
}

console.log(`\n========== V5.95 四生合体专项回归汇总：PASS=${pass} FAIL=${fail} ==========`);
process.exit(fail ? 1 : 0);
