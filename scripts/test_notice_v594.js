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

function makeFakeTimerEnv() {
  let nextId = 1;
  const timers = new Map();
  return {
    setTimeout(fn, ms) {
      const id = nextId++;
      timers.set(id, { fn, ms: Number(ms) || 0, interval: false });
      return id;
    },
    clearTimeout(id) { timers.delete(id); },
    setInterval(fn, ms) {
      const id = nextId++;
      timers.set(id, { fn, ms: Number(ms) || 0, interval: true });
      return id;
    },
    clearInterval(id) { timers.delete(id); },
    runByDelay(targetMs) {
      const list = Array.from(timers.entries()).filter(([, t]) => !t.interval && t.ms === targetMs);
      for (const [id, t] of list) { timers.delete(id); t.fn(); }
    },
    tickIntervals(targetMs, times) {
      for (let i = 0; i < times; i++) {
        const list = Array.from(timers.entries()).filter(([, t]) => t.interval && t.ms === targetMs);
        for (const [, t] of list) t.fn();
      }
    },
  };
}

function makeMiniDom(sharedLs) {
  const store = sharedLs || Object.create(null);
  const localStorage = {
    getItem: k => (Object.prototype.hasOwnProperty.call(store, k) ? store[k] : null),
    setItem: (k, v) => { store[k] = String(v); },
    removeItem: k => { delete store[k]; },
    clear: () => { for (const k of Object.keys(store)) delete store[k]; },
  };

  function matchSel(el, sel) {
    if (!el || el.nodeType !== 1) return false;
    for (const part of String(sel).split(',').map(s => s.trim()).filter(Boolean)) {
      let ok = true, rest = part;
      const attrs = [...rest.matchAll(/\[([^\]=^]+)(?:(\^?=)["']?([^"'\]]*)["']?)?\]/g)];
      rest = rest.replace(/\[[^\]]+\]/g, '');
      for (const [, a, op, v] of attrs) {
        const g = el.getAttribute(a);
        if (!op) { if (g === null) ok = false; }
        else if (op === '=') { if (g !== v) ok = false; }
        else if (op === '^=') { if (g === null || !g.startsWith(v)) ok = false; }
      }
      const idM = rest.match(/#([A-Za-z0-9_-]+)/);
      if (idM) { if (el.id !== idM[1]) ok = false; rest = rest.replace(idM[0], ''); }
      const clsM = [...rest.matchAll(/\.([A-Za-z0-9_-]+)/g)];
      for (const [, c] of clsM) {
        if (!String(el.className || '').split(/\s+/).includes(c)) ok = false;
      }
      rest = rest.replace(/\.[A-Za-z0-9_-]+/g, '').trim();
      if (rest && el.tagName.toLowerCase() !== rest.toLowerCase()) ok = false;
      if (ok) return true;
    }
    return false;
  }

  class Node {
    constructor(tag) {
      this.nodeType = tag ? 1 : 3;
      this.tagName = tag ? String(tag).toUpperCase() : '';
      this.attrs = Object.create(null);
      this.children = [];
      this.parentNode = null;
      this.style = {};
      this.listeners = Object.create(null);
      this._text = '';
      this._rawHtml = '';
      this.disabled = false;
      this.value = '';
    }
    get id() { return this.attrs.id || ''; }
    set id(v) { this.attrs.id = String(v); }
    get className() { return this.attrs.class || ''; }
    set className(v) { this.attrs.class = String(v); }
    get firstChild() { return this.children[0] || null; }
    get isConnected() {
      let c = this;
      while (c) { if (c === document.body || c === document.head) return true; c = c.parentNode; }
      return false;
    }
    setAttribute(k, v) {
      this.attrs[k] = String(v);
      if (k === 'disabled') this.disabled = true;
    }
    getAttribute(k) { return Object.prototype.hasOwnProperty.call(this.attrs, k) ? this.attrs[k] : null; }
    hasAttribute(k) { return Object.prototype.hasOwnProperty.call(this.attrs, k); }
    removeAttribute(k) { delete this.attrs[k]; if (k === 'disabled') this.disabled = false; }
    appendChild(ch) {
      if (!ch) return ch;
      if (ch.parentNode) ch.parentNode.removeChild(ch);
      ch.parentNode = this;
      this.children.push(ch);
      return ch;
    }
    removeChild(ch) {
      const i = this.children.indexOf(ch);
      if (i >= 0) { this.children.splice(i, 1); ch.parentNode = null; }
      return ch;
    }
    contains(t) {
      let c = t;
      while (c) { if (c === this) return true; c = c.parentNode; }
      return false;
    }
    closest(sel) {
      let c = this;
      while (c) { if (c.nodeType === 1 && matchSel(c, sel)) return c; c = c.parentNode; }
      return null;
    }
    querySelectorAll(sel) {
      const out = [];
      const walk = n => {
        for (const ch of n.children) {
          if (ch.nodeType === 1 && matchSel(ch, sel)) out.push(ch);
          walk(ch);
        }
      };
      walk(this);
      return out;
    }
    querySelector(sel) { return this.querySelectorAll(sel)[0] || null; }
    addEventListener(t, fn) { (this.listeners[t] = this.listeners[t] || []).push(fn); }
    removeEventListener(t, fn) {
      if (!this.listeners[t]) return;
      this.listeners[t] = this.listeners[t].filter(f => f !== fn);
    }
    dispatchEvent(ev) {
      ev.target = ev.target || this;
      let cur = this;
      while (cur) {
        const list = (cur.listeners && cur.listeners[ev.type]) || [];
        for (const fn of list.slice()) fn.call(cur, ev);
        cur = ev.bubbles ? cur.parentNode : null;
      }
      return true;
    }
    click() {
      if (this.disabled) return;
      this.dispatchEvent({ type: 'click', target: this, bubbles: true, preventDefault() {}, stopPropagation() {} });
    }
    get textContent() {
      if (this.nodeType === 3) return this._text;
      if (!this.children.length) return this._text;
      return this.children.map(c => c.textContent).join('');
    }
    set textContent(v) {
      this.children = [];
      this._text = String(v == null ? '' : v);
    }
    get innerHTML() { return this._rawHtml; }
    set innerHTML(html) {
      this._rawHtml = String(html || '');
      this.children = [];
      this._text = '';
      parseInto(this, this._rawHtml);
    }
    focus() {}
    select() {}
  }

  function parseInto(root, html) {
    const stack = [root];
    const tokenRe = /<style[\s\S]*?<\/style>|<!--[\s\S]*?-->|<\/([A-Za-z0-9-]+)\s*>|<([A-Za-z0-9-]+)([^>]*)>|([^<]+)/g;
    const voidTags = new Set(['br', 'hr', 'img', 'input', 'meta', 'link', 'path', 'line', 'circle', 'rect', 'ellipse']);
    let m;
    while ((m = tokenRe.exec(html))) {
      const top = stack[stack.length - 1];
      if (m[0].startsWith('<style') || m[0].startsWith('<!--')) continue;
      if (m[1]) {
        const closeTag = m[1].toUpperCase();
        for (let i = stack.length - 1; i > 0; i--) {
          if (stack[i].tagName === closeTag) { stack.length = i; break; }
        }
      } else if (m[2]) {
        const tag = m[2];
        const attrStr = m[3] || '';
        const selfClose = /\/\s*$/.test(attrStr) || voidTags.has(tag.toLowerCase());
        const el = new Node(tag);
        const attrRe = /([A-Za-z0-9_:-]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'>]+)))?/g;
        let am;
        while ((am = attrRe.exec(attrStr))) {
          if (am[1] === '/') continue;
          el.setAttribute(am[1], am[2] !== undefined ? am[2] : (am[3] !== undefined ? am[3] : (am[4] !== undefined ? am[4] : '')));
        }
        el._rawHtml = '';
        top.appendChild(el);
        if (!selfClose) stack.push(el);
      } else if (m[4]) {
        const tn = new Node('');
        tn._text = m[4].replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, '&');
        top.appendChild(tn);
      }
    }
    if (root.children[0]) root.children[0]._rawHtml = html;
  }

  const docListeners = Object.create(null);
  const docEl = new Node('html');
  docEl.clientWidth = 412;
  docEl.clientHeight = 844;
  const bodyEl = new Node('body');
  const headEl = new Node('head');
  docEl.appendChild(headEl);
  docEl.appendChild(bodyEl);
  const document = {
    body: bodyEl,
    head: headEl,
    documentElement: docEl,
    hidden: false,
    activeElement: null,
    createElement: tag => new Node(tag),
    getElementById(id) {
      return this.documentElement.querySelector('#' + id) || null;
    },
    querySelector(sel) { return this.documentElement.querySelector(sel) || null; },
    querySelectorAll(sel) { return this.documentElement.querySelectorAll(sel); },
    addEventListener(t, fn) { (docListeners[t] = docListeners[t] || []).push(fn); },
    removeEventListener(t, fn) {
      if (!docListeners[t]) return;
      docListeners[t] = docListeners[t].filter(f => f !== fn);
    },
    dispatchEvent(ev) {
      for (const fn of (docListeners[ev.type] || []).slice()) fn(ev);
      return true;
    },
    execCommand() { return true; },
  };
  return { document, localStorage, store };
}

function loadTarget(fileName, sharedLs) {
  const fullPath = path.join(DIST, fileName);
  const raw = JSON.parse(fs.readFileSync(fullPath, 'utf8'));
  const { document, localStorage, store } = makeMiniDom(sharedLs);
  const ft = makeFakeTimerEnv();
  const win = {
    document, localStorage,
    innerWidth: 412, innerHeight: 844,
    navigator: { userAgent: 'Mozilla/5.0' },
    console: { log() {}, warn() {}, info() {}, error() {} },
    fetch: async () => new Response('{}', { status: 200 }),
    setTimeout: ft.setTimeout, clearTimeout: ft.clearTimeout,
    setInterval: ft.setInterval, clearInterval: ft.clearInterval,
    addEventListener() {}, removeEventListener() {},
    CustomEvent: function (t, o) { this.type = t; this.detail = o && o.detail; },
    dispatchEvent() {},
    URL, TextEncoder, TextDecoder, Response, Headers, Request,
  };
  win.window = win; win.top = win; win.parent = win; win.self = win; win.globalThis = win;
  const ctx = vm.createContext(win);
  new vm.Script(raw.content, { filename: fileName }).runInContext(ctx);
  return { win, api: win.__AR6__, ft, store };
}

for (const fileName of TARGETS) {
  console.log(`\n=== V5.94 版权防骗与法律免责弹窗专项测试: ${fileName} ===`);
  const store = Object.create(null);
  const r1 = loadTarget(fileName, store);
  const { win, api, ft } = r1;

  check(api && api.VERSION === '6.8', `${fileName}: VERSION === 6.8`, api && api.VERSION);
  check(typeof api.isNoticeAcked === 'function' && typeof api.openNoticeModal === 'function' && typeof api.closeNoticeModal === 'function', `${fileName}: 声明弹窗 API 完整导出`);
  check(api.isNoticeAcked() === false, `${fileName}: 首次加载/云端更新后 isNoticeAcked 为 false`);
  check(!win.document.getElementById('ar6-notice-modal'), `${fileName}: boot 同步阶段不阻塞 DOM`);

  // 触发 900ms 首弹定时器
  ft.runByDelay(900);
  const modal = win.document.getElementById('ar6-notice-modal');
  check(!!modal, `${fileName}: 900ms 后自动强制弹出 #ar6-notice-modal`);
  check(modal && modal.getAttribute('data-ar6-forced') === '1', `${fileName}: 首次弹窗标记 data-ar6-forced="1"`);

  // 检查零外链、单主按钮、手机防超宽/防超高布局、8 层法律厚甲文案
  const html = modal ? modal.innerHTML : '';
  const modalStyle = modal ? String(modal.getAttribute('style') || '') : '';
  const txt = modal ? modal.textContent : '';
  const btns = modal ? modal.querySelectorAll('button') : [];
  check(btns.length === 1, `${fileName}: 弹窗内严格只有唯一一个主按钮`, `got=${btns.length}`);
  check(modalStyle.includes('right:auto') && modalStyle.includes('bottom:auto') && modalStyle.includes('box-sizing:border-box') && !modalStyle.includes('inset:0') && !modalStyle.includes('height:100%'), `${fileName}: 遮罩使用显式视口高 + border-box 绝不被压扁进 40px 顶栏`, modalStyle);
  check(!modal.getAttribute('role'), `${fileName}: 外层遮罩不挂 role="dialog" 防主题 CSS 误命中`);
  check(html.includes('max-height:816px') && html.includes('white-space:normal'), `${fileName}: 手机动态锁高(innerHeight-28)且主按钮允许换行不撑宽`);
  check(!/https?:\/\/|github\.com|jsdelivr/i.test(html), `${fileName}: 弹窗内零外部链接、零仓库地址`);
  check(txt.includes('类脑社区（类脑 ΟΔΥΣΣΕΙΑ）') && txt.includes('上当受骗'), `${fileName}: 含类脑社区免费开源与付费即受骗红框警示`);
  check(txt.includes('非商业、非营利') && txt.includes('中华人民共和国著作权法') && txt.includes('计算机软件保护条例'), `${fileName}: 含非商业许可与著作权法依据`);
  check(txt.includes('并非生成式人工智能服务提供者') && txt.includes('不收集、不存储、不上传'), `${fileName}: 含纯本地工具中立与零数据收集声明`);
  check(txt.includes('网络安全法') && txt.includes('生成式人工智能服务管理暂行办法') && txt.includes('已满 18 周岁'), `${fileName}: 含四部核心法规与成年人准入红线`);
  check(txt.includes('服务条款') && txt.includes('现状（AS-IS）') && txt.includes('在适用法律允许的最大范围内'), `${fileName}: 含第三方 ToS 切割与 AS-IS 最大范围豁免`);
  check(txt.includes('通知—删除') && txt.includes('不影响其余条款之完整效力'), `${fileName}: 含视觉版权避风港与条款可分割性`);

  // 首次强制模式：3s 倒计时拦截 + 遮罩不可关 + Esc 不可关 + closeNoticeModal(false) 不可关
  const agreeBtn = btns[0];
  check(agreeBtn && agreeBtn.getAttribute('data-locked') === '1' && agreeBtn.textContent.includes('3s'), `${fileName}: 首次主按钮进入 3 秒阅读冷静期`, agreeBtn && agreeBtn.textContent);
  agreeBtn.dispatchEvent({ type: 'click', target: agreeBtn, bubbles: true });
  check(!!win.document.getElementById('ar6-notice-modal') && !api.isNoticeAcked(), `${fileName}: 倒计时未结束时点击主按钮不放行`);
  modal.dispatchEvent({ type: 'click', target: modal, bubbles: true });
  check(!!win.document.getElementById('ar6-notice-modal'), `${fileName}: 强制模式点击遮罩空白不关闭`);
  win.document.dispatchEvent({ type: 'keydown', key: 'Escape' });
  check(!!win.document.getElementById('ar6-notice-modal'), `${fileName}: 强制模式按 Esc 不可跳过`);
  check(api.closeNoticeModal(false) === false && !!win.document.getElementById('ar6-notice-modal'), `${fileName}: 强制模式非 forceClose 不可关闭`);

  // 推进 3 秒倒计时 → 解锁 → 手机 pointerdown+pointerup 触控即可关闭同意
  ft.tickIntervals(1000, 3);
  check(agreeBtn.getAttribute('data-locked') === '0' && agreeBtn.textContent.includes('我已满 18 周岁'), `${fileName}: 3 秒后主按钮自动解锁`, agreeBtn.textContent);
  agreeBtn.dispatchEvent({ type: 'pointerdown', clientX: 100, clientY: 700, bubbles: true });
  agreeBtn.dispatchEvent({ type: 'pointerup', clientX: 102, clientY: 701, bubbles: true });
  check(!win.document.getElementById('ar6-notice-modal'), `${fileName}: 手机触控 pointerup 同意后声明弹窗立即关闭`);
  check(api.isNoticeAcked() === true, `${fileName}: 同意后 isNoticeAcked() === true`);
  check(store['ar6.notice.ack'] === api.NOTICE_VER, `${fileName}: localStorage 持久化写入 ar6.notice.ack`);

  // 面板设置页常驻入口与手动复看模式（含樱花浅色皮肤对比度检查）
  api.openPanel();
  api.setUITab('scope');
  api.setCfg('skin', 'pink');
  api.render();
  const entryBtn = win.document.querySelector('[data-ar6="notice-open"]');
  check(!!entryBtn && entryBtn.textContent.includes('版权、防骗与法律免责声明'), `${fileName}: 面板设置页存在常驻复看声明按钮`);
  api.onPanelClick({ target: entryBtn, type: 'click' });
  const reviewModal = win.document.getElementById('ar6-notice-modal');
  check(!!reviewModal && reviewModal.getAttribute('data-ar6-forced') === '0', `${fileName}: 点击常驻入口以非强制复看模式打开声明`);
  check(reviewModal && reviewModal.innerHTML.includes('#fff9fc') && reviewModal.innerHTML.includes('#831843'), `${fileName}: 浅色樱花皮 pink 下启用独立高对比配色`);
  const reviewBtn = reviewModal && reviewModal.querySelector('[data-ar6-nm="agree"]');
  check(reviewBtn && reviewBtn.getAttribute('data-locked') === '0' && reviewBtn.textContent.includes('已阅 · 关闭声明'), `${fileName}: 手动复看模式 0 秒立即可关`);
  win.document.dispatchEvent({ type: 'keydown', key: 'Escape' });
  check(!win.document.getElementById('ar6-notice-modal'), `${fileName}: 手动复看模式支持 Esc 关闭`);

  // 图鉴页脚常驻开源注记检查
  api.onPanelClick({ target: { getAttribute: k => (k === 'data-ar6' ? 'help' : null), parentNode: null }, type: 'click' });
  const helpNode = win.document.getElementById('ar6-help');
  check(!!helpNode && helpNode.textContent.includes('类脑社区免费开源') && helpNode.textContent.includes('严禁商业倒卖'), `${fileName}: 功能图鉴页脚含类脑开源防倒卖注记`);

  // V5.97 ST 手机 Edge 专项：body 坍缩为 0px 或挂 transform/contain 时逃逸挂载至 documentElement (<html>)
  win.getComputedStyle = el => (el === win.document.body ? { transform: 'translateZ(0)', filter: 'none', backdropFilter: 'none', perspective: 'none', contain: 'layout' } : {});
  win.document.body.getBoundingClientRect = () => ({ width: 412, height: 0 });
  api.openNoticeModal(false);
  const escapedModal = win.document.getElementById('ar6-notice-modal');
  check(!!escapedModal && escapedModal.parentNode === win.document.documentElement, `${fileName}: body=0px/含 transform 时弹窗自动逃逸挂载至 html 根避免 20px 压扁`);
  api.closeNoticeModal(true);
  delete win.getComputedStyle;
  delete win.document.body.getBoundingClientRect;

  // dispose 清理校验
  api.openNoticeModal(true);
  check(!!win.document.getElementById('ar6-notice-modal'), `${fileName}: dispose 前弹窗已挂载`);
  api.dispose();
  check(!win.document.getElementById('ar6-notice-modal'), `${fileName}: dispose() 彻底移除声明弹窗与定时器`);

  // 模拟第二次进入酒馆（保留相同 localStorage）：绝不再自动弹出
  const r2 = loadTarget(fileName, store);
  check(r2.api.isNoticeAcked() === true, `${fileName}: 二次进入酒馆保留已读状态`);
  r2.ft.runByDelay(900);
  check(!r2.win.document.getElementById('ar6-notice-modal'), `${fileName}: 二次进入酒馆不再自动弹出声明`);
  r2.api.dispose();
}

console.log(`\n========== V5.94 声明弹窗专项测试汇总：PASS=${pass} FAIL=${fail} ==========`);
process.exit(fail ? 1 : 0);
