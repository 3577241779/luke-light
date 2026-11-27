'use strict';
/**
 * 卢克之光 V5.61 · 神光棒变身 120Hz/144Hz 高刷屏 + 冻帧看门狗 + 勋章/桌宠防双消失回归测试
 *
 * 复现并验证 V5.6 实机 Bug（首次点击神光棒变身后 3D 迪迦与侧边计时器圆章同时消失，刷新才出现）：
 *   1. 120Hz 高刷屏全四幕演出（真实推进虚拟时钟 + Canvas 2D + 8.33ms/帧 RAF，不手动调 closeSparklence）
 *   2. 144Hz 高刷屏「神光棒变身 · 召唤/复位」自动收起主面板 + 完整落位
 *   3. RAF 完全冻结/节流场景（0 帧 RAF，纯靠彗星墙钟兜底与 3.5s 硬看门狗完成落位）
 *   4. 防双消失自愈律（桌宠节点丢失时 syncPill 自动重建，绝不同时隐藏桌宠与圆章）
 *   5. 浏览器反指纹全零画布回读保护（ar6MatteSprite 绝不把立绘抠成全透明）
 */
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const DESKTOP_OUT_DIR = path.join(__dirname, '..', 'dist');
const TARGETS = [
  'luke-light-st.json',
  'luke-light-tt.json',
  'luke-light-desktop.json',
];

function createCanvasMock(state, opts = {}) {
  return {
    setTransform() {},
    clearRect() { state.clearCalls++; },
    save() {},
    restore() {},
    translate() {},
    rotate() {},
    beginPath() {},
    closePath() {},
    moveTo() {},
    lineTo() {},
    quadraticCurveTo() {},
    arc() { state.arcCalls++; },
    fill() { state.fillCalls++; },
    stroke() { state.strokeCalls++; },
    fillRect() { state.fillCalls++; },
    drawImage() {},
    getImageData(x, y, w, h) {
      const data = new Uint8ClampedArray(w * h * 4);
      if (!opts.blankReadback) {
        for (let i = 0; i < data.length; i += 4) {
          data[i] = 180; data[i + 1] = 200; data[i + 2] = 240; data[i + 3] = 255;
        }
      }
      return { data, width: w, height: h };
    },
    putImageData() {},
    createLinearGradient() { return { addColorStop() {} }; },
    createRadialGradient() { return { addColorStop() {} }; },
    globalAlpha: 1,
    fillStyle: '',
    strokeStyle: '',
    lineWidth: 1,
    lineCap: 'butt',
    shadowColor: '',
    shadowBlur: 0,
  };
}

function createVirtualDomSandbox(opts = {}) {
  let now = 1000;
  let nextTimerId = 1;
  let nextRafId = 1;
  const timers = new Map();
  const rafs = new Map();
  const canvasStats = { clearCalls: 0, arcCalls: 0, fillCalls: 0, strokeCalls: 0 };
  const store = new Map();

  const localStorage = {
    getItem(k) { return store.has(String(k)) ? store.get(String(k)) : null; },
    setItem(k, v) { store.set(String(k), String(v)); },
    removeItem(k) { store.delete(String(k)); },
    clear() { store.clear(); },
    key(i) { return [...store.keys()][i] ?? null; },
    get length() { return store.size; },
  };

  function matchSingle(el, s) {
    if (!el || el.nodeType !== 1) return false;
    let rest = s.trim();
    if (!rest) return false;
    if (rest.includes(' ')) {
      const parts = rest.split(/\s+/);
      const last = parts.pop();
      if (!matchSingle(el, last)) return false;
      let cur = el.parentNode;
      for (let i = parts.length - 1; i >= 0; i--) {
        while (cur && !matchSingle(cur, parts[i])) cur = cur.parentNode;
        if (!cur) return false;
        cur = cur.parentNode;
      }
      return true;
    }
    rest = rest.replace(/:has\([^)]*\)/g, '');
    const attrMatches = [...rest.matchAll(/\[([^\]=^]+)(?:(\^?=)["']?([^"'\]]*)["']?)?\]/g)];
    rest = rest.replace(/\[[^\]]+\]/g, '');
    const idM = rest.match(/#([A-Za-z0-9_-]+)/);
    const clsMs = [...rest.matchAll(/\.([A-Za-z0-9_-]+)/g)].map(m => m[1]);
    const tagPart = rest.replace(/#[A-Za-z0-9_-]+/g, '').replace(/\.[A-Za-z0-9_-]+/g, '').trim();
    if (tagPart && tagPart !== '*' && el.tagName.toLowerCase() !== tagPart.toLowerCase()) return false;
    if (idM && el.id !== idM[1]) return false;
    for (const c of clsMs) {
      if (!String(el.className || '').split(/\s+/).includes(c)) return false;
    }
    for (const m of attrMatches) {
      const k = m[1].trim(), op = m[2], v = m[3];
      const av = el.getAttribute(k);
      if (av === null) return false;
      if (op === '=' && av !== v) return false;
      if (op === '^=' && !av.startsWith(v)) return false;
    }
    return true;
  }

  function matches(el, sel) {
    return String(sel || '').split(',').some(s => matchSingle(el, s));
  }

  function parseHtmlInto(parent, html) {
    parent.childNodes = [];
    const stack = [parent];
    const tokenRe = /<!--[\s\S]*?-->|<\/([A-Za-z0-9_-]+)\s*>|<([A-Za-z0-9_-]+)([^>]*?)(\/?)>|([^<]+)/g;
    const voidTags = new Set(['input', 'img', 'br', 'hr', 'meta', 'link', 'path', 'circle', 'ellipse', 'line', 'polygon', 'stop', 'rect']);
    let m;
    while ((m = tokenRe.exec(String(html || '')))) {
      if (m[0].startsWith('<!--')) continue;
      if (m[1]) {
        const tag = m[1].toUpperCase();
        for (let i = stack.length - 1; i >= 1; i--) {
          if (stack[i].tagName === tag) { stack.length = i; break; }
        }
      } else if (m[2]) {
        const tag = m[2];
        const attrStr = m[3] || '';
        const selfClose = !!m[4] || voidTags.has(tag.toLowerCase());
        const node = createEl(tag);
        const aRe = /([A-Za-z0-9_:-]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/g;
        let am;
        while ((am = aRe.exec(attrStr))) {
          const k = am[1];
          const v = am[2] !== undefined ? am[2] : (am[3] !== undefined ? am[3] : (am[4] !== undefined ? am[4] : ''));
          node.setAttribute(k, v);
        }
        stack[stack.length - 1].appendChild(node);
        if (!selfClose) stack.push(node);
      } else if (m[5]) {
        stack[stack.length - 1].childNodes.push({
          nodeType: 3,
          textContent: m[5],
          parentNode: stack[stack.length - 1],
        });
      }
    }
  }

  function createEl(tagName) {
    const el = {
      nodeType: 1,
      tagName: String(tagName || 'DIV').toUpperCase(),
      attrs: Object.create(null),
      childNodes: [],
      parentNode: null,
      shadowRoot: null,
      listeners: Object.create(null),
      hidden: false,
      width: 0,
      height: 0,
      style: {
        _css: '',
        get cssText() { return this._css; },
        set cssText(v) {
          this._css = String(v || '');
          const parts = this._css.split(';');
          for (const part of parts) {
            const idx = part.indexOf(':');
            if (idx <= 0) continue;
            const prop = part.slice(0, idx).trim().replace(/-([a-z])/g, (_, c) => c.toUpperCase());
            const val = part.slice(idx + 1).replace(/!important/gi, '').trim();
            if (prop) this[prop] = val;
          }
        },
        setProperty(k, v) { this[k] = String(v); },
      },
      classList: {
        add(...cs) {
          const set = new Set(String(el.className || '').split(/\s+/).filter(Boolean));
          cs.forEach(c => set.add(c));
          el.className = [...set].join(' ');
        },
        remove(...cs) {
          const set = new Set(String(el.className || '').split(/\s+/).filter(Boolean));
          cs.forEach(c => set.delete(c));
          el.className = [...set].join(' ');
        },
        contains(c) { return String(el.className || '').split(/\s+/).includes(c); },
      },
      get id() { return this.attrs.id || ''; },
      set id(v) { this.attrs.id = String(v || ''); },
      get className() { return this.attrs.class || ''; },
      set className(v) { this.attrs.class = String(v || ''); },
      get children() { return this.childNodes.filter(n => n.nodeType === 1); },
      get firstChild() { return this.childNodes[0] || null; },
      get innerHTML() { return this._rawHtml || ''; },
      set innerHTML(v) { this._rawHtml = String(v || ''); parseHtmlInto(this, this._rawHtml); },
      get textContent() {
        return this.childNodes.map(n => n.textContent || '').join('');
      },
      set textContent(v) {
        this.childNodes = [{ nodeType: 3, textContent: String(v == null ? '' : v), parentNode: this }];
      },
      getAttribute(k) { return Object.prototype.hasOwnProperty.call(this.attrs, k) ? this.attrs[k] : null; },
      setAttribute(k, v) {
        this.attrs[k] = String(v);
        if (k === 'style') this.style.cssText = String(v);
      },
      removeAttribute(k) { delete this.attrs[k]; },
      appendChild(child) {
        if (child.parentNode && child.parentNode.removeChild) child.parentNode.removeChild(child);
        child.parentNode = this;
        this.childNodes.push(child);
        return child;
      },
      insertBefore(child, ref) {
        if (child.parentNode && child.parentNode.removeChild) child.parentNode.removeChild(child);
        child.parentNode = this;
        const idx = ref ? this.childNodes.indexOf(ref) : -1;
        if (idx >= 0) this.childNodes.splice(idx, 0, child);
        else this.childNodes.push(child);
        return child;
      },
      removeChild(child) {
        const idx = this.childNodes.indexOf(child);
        if (idx >= 0) { this.childNodes.splice(idx, 1); child.parentNode = null; }
        return child;
      },
      remove() { if (this.parentNode) this.parentNode.removeChild(this); },
      contains(other) {
        let cur = other;
        while (cur) { if (cur === this) return true; cur = cur.parentNode; }
        return false;
      },
      closest(sel) {
        let cur = this;
        while (cur && cur.nodeType === 1) {
          if (matches(cur, sel)) return cur;
          cur = cur.parentNode;
        }
        return null;
      },
      querySelectorAll(sel) {
        const out = [];
        const walk = (node) => {
          for (const ch of node.childNodes || []) {
            if (ch.nodeType === 1) {
              if (matches(ch, sel)) out.push(ch);
              walk(ch);
            }
          }
        };
        walk(this);
        return out;
      },
      querySelector(sel) { return this.querySelectorAll(sel)[0] || null; },
      attachShadow() {
        const sr = createEl('#shadow');
        sr.host = this;
        this.shadowRoot = sr;
        return sr;
      },
      addEventListener(type, fn, cap) {
        if (!this.listeners[type]) this.listeners[type] = [];
        this.listeners[type].push({ fn, cap: !!cap });
      },
      removeEventListener(type, fn) {
        if (!this.listeners[type]) return;
        this.listeners[type] = this.listeners[type].filter(x => x.fn !== fn);
      },
      dispatchEvent(ev) {
        const e = Object.assign({
          target: this,
          currentTarget: this,
          defaultPrevented: false,
          _stopped: false,
          _immStopped: false,
          preventDefault() { this.defaultPrevented = true; },
          stopPropagation() { this._stopped = true; },
          stopImmediatePropagation() { this._stopped = true; this._immStopped = true; },
        }, ev);
        const pathNodes = [];
        let cur = this;
        while (cur) { pathNodes.push(cur); cur = cur.parentNode; }
        pathNodes.push(doc);
        // Capture
        for (let i = pathNodes.length - 1; i >= 1; i--) {
          if (e._stopped) break;
          const list = (pathNodes[i].listeners && pathNodes[i].listeners[e.type]) || [];
          for (const h of [...list]) {
            if (h.cap) { h.fn.call(pathNodes[i], e); if (e._immStopped) break; }
          }
        }
        // Target
        if (!e._stopped) {
          const list = (this.listeners && this.listeners[e.type]) || [];
          for (const h of [...list]) {
            h.fn.call(this, e);
            if (e._immStopped) break;
          }
        }
        // Bubble
        for (let i = 1; i < pathNodes.length; i++) {
          if (e._stopped) break;
          const list = (pathNodes[i].listeners && pathNodes[i].listeners[e.type]) || [];
          for (const h of [...list]) {
            if (!h.cap) { h.fn.call(pathNodes[i], e); if (e._immStopped) break; }
          }
        }
        return !e.defaultPrevented;
      },
      getBoundingClientRect() {
        return { left: 10, top: 10, right: 360, bottom: 700, width: 350, height: 690 };
      },
      get offsetWidth() { return this._ow || 350; },
      get offsetHeight() { return this._oh || 500; },
      get clientWidth() { return this._cw || 350; },
      set clientWidth(v) { this._cw = Number(v) || 350; },
      get clientHeight() { return this._ch || 500; },
      set clientHeight(v) { this._ch = Number(v) || 500; },
      get scrollHeight() { return 500; },
      scrollTop: 0,
      focus() {},
      click() { this.dispatchEvent({ type: 'click', bubbles: true, cancelable: true, detail: 1 }); },
    };
    if (el.tagName === 'CANVAS') {
      el.getContext = (kind) => (kind === '2d' ? createCanvasMock(canvasStats, opts) : null);
      el.toDataURL = () => (opts.blankDataUrl ? 'data:,' : 'data:image/png;base64,' + 'A'.repeat(128));
    }
    return el;
  }

  const head = createEl('head');
  const body = createEl('body');
  const docEl = createEl('html');
  docEl.clientWidth = opts.width || 390;
  docEl.clientHeight = opts.height || 844;
  docEl.appendChild(head);
  docEl.appendChild(body);

  const doc = {
    nodeType: 9,
    head,
    body,
    documentElement: docEl,
    hidden: false,
    listeners: Object.create(null),
    createElement: createEl,
    getElementById(id) {
      return docEl.querySelector('#' + id);
    },
    querySelector(sel) { return docEl.querySelector(sel); },
    querySelectorAll(sel) { return docEl.querySelectorAll(sel); },
    addEventListener(type, fn, cap) {
      if (!this.listeners[type]) this.listeners[type] = [];
      this.listeners[type].push({ fn, cap: !!cap });
    },
    removeEventListener(type, fn) {
      if (!this.listeners[type]) return;
      this.listeners[type] = this.listeners[type].filter(x => x.fn !== fn);
    },
  };

  function vSetTimeout(fn, ms) {
    const id = nextTimerId++;
    timers.set(id, { id, fn, at: now + Math.max(0, Number(ms) || 0) });
    return id;
  }
  function vClearTimeout(id) { timers.delete(id); }

  function vRaf(fn) {
    const id = nextRafId++;
    rafs.set(id, fn);
    return id;
  }
  function vCancelRaf(id) { rafs.delete(id); }

  class FakeImage {
    constructor() { this.naturalWidth = 145; this.naturalHeight = 360; this._src = ''; }
    get src() { return this._src; }
    set src(v) {
      this._src = String(v || '');
      vSetTimeout(() => { if (typeof this.onload === 'function') this.onload(); }, 5);
    }
  }

  const win = {
    document: doc,
    localStorage,
    innerWidth: opts.width || 390,
    innerHeight: opts.height || 844,
    devicePixelRatio: 2,
    visualViewport: { width: opts.width || 390, height: opts.height || 844, offsetTop: 0 },
    navigator: { userAgent: opts.mobile ? 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) Mobile' : 'Mozilla/5.0 Chrome/126.0' },
    performance: { now: () => now },
    setTimeout: vSetTimeout,
    clearTimeout: vClearTimeout,
    setInterval: () => 0,
    clearInterval: () => {},
    requestAnimationFrame: vRaf,
    cancelAnimationFrame: vCancelRaf,
    matchMedia: () => ({ matches: false }),
    getComputedStyle: (el) => el.style || {},
    addEventListener() {},
    removeEventListener() {},
    fetch: () => Promise.resolve({ ok: true, status: 200, text: () => Promise.resolve('{}') }),
    Image: FakeImage,
    console,
    Date,
    Math,
    JSON,
    Object,
    Array,
    String,
    Number,
    Boolean,
    RegExp,
    Error,
    Promise,
    Map,
    Set,
    Uint8Array,
    Int32Array,
    Uint8ClampedArray,
    isFinite,
    isNaN,
    parseInt,
    parseFloat,
    encodeURIComponent,
    decodeURIComponent,
  };
  win.window = win;
  win.self = win;
  win.top = win;
  win.parent = win;
  win.globalThis = win;
  doc.defaultView = win;

  function flushTimersDue() {
    let guard = 0;
    while (guard++ < 500) {
      let earliest = null;
      for (const t of timers.values()) {
        if (t.at <= now && (!earliest || t.at < earliest.at || (t.at === earliest.at && t.id < earliest.id))) {
          earliest = t;
        }
      }
      if (!earliest) break;
      timers.delete(earliest.id);
      earliest.fn();
    }
  }

  function advance(totalMs, hz = 120) {
    const stepMs = hz > 0 ? (1000 / hz) : 25;
    const endAt = now + totalMs;
    while (now < endAt) {
      now = Math.min(endAt, now + stepMs);
      flushTimersDue();
      if (hz > 0 && !opts.freezeRaf) {
        const pending = [...rafs.entries()];
        rafs.clear();
        for (const [, fn] of pending) fn(now);
        flushTimersDue();
      }
    }
  }

  return { win, doc, advance, canvasStats, rafs, timers };
}

function runForTarget(fileName) {
  const fullPath = path.join(DESKTOP_OUT_DIR, fileName);
  const raw = JSON.parse(fs.readFileSync(fullPath, 'utf8'));
  const script = new vm.Script('"use strict";\n' + raw.content, { filename: fileName });
  const isMobile = !/桌面版|-desktop\.json/i.test(fileName);
  const errs = [];
  let checks = 0;
  function check(cond, msg) {
    checks++;
    if (!cond) errs.push(`[${fileName}] ${msg}`);
  }

  // ---- Scenario 1: 初次使用 + 120Hz 高刷屏完整四幕神光棒变身（严禁手动调 closeSparklence）----
  {
    const env = createVirtualDomSandbox({ width: isMobile ? 390 : 1280, height: isMobile ? 844 : 800, mobile: isMobile });
    const ctx = vm.createContext(env.win);
    script.runInContext(ctx);
    env.advance(100, 120);
    const api = env.win.__AR6__;
    check(api && api.VERSION === '6.8', `VERSION 应为 6.8，实际 ${api && api.VERSION}`);

    // 初次使用：未开启桌宠，先进入防卫设置并点开「3D 迪迦 · 光之伙伴桌宠」
    api.openPanel();
    api.setUITab('scope');
    api.render();
    const petShowBtn = env.doc.querySelector('[data-ar6="pet-show"]');
    check(!!petShowBtn, '初次使用应渲染 pet-show 按钮');
    petShowBtn.dispatchEvent({ type: 'pointerdown', pointerId: 1, clientX: 120, clientY: 320 });
    petShowBtn.dispatchEvent({ type: 'pointerup', pointerId: 1, clientX: 120, clientY: 320 });

    const sparkOv = env.doc.getElementById('ar6-spark');
    check(!!sparkOv && sparkOv.getAttribute('data-ar6-spark') === 'waiting', '初次点击开启应弹出 #ar6-spark 等待点击');
    check(api.avatarVisualMode() === 'hidden-for-summon', '等待变身期间 #ar6-avatar 应为 hidden-for-summon');

    // 点击神光棒点火变身！
    const wandBtn = sparkOv.querySelector('[data-ar6-sp="fire"]');
    wandBtn.dispatchEvent({ type: 'pointerdown', pointerId: 2, clientX: 195, clientY: 422 });
    wandBtn.dispatchEvent({ type: 'pointerup', pointerId: 2, clientX: 195, clientY: 422 });
    check(sparkOv.getAttribute('data-ar6-spark') === 'firing', '点击神光棒进入 firing 状态');

    // 推进至 650ms（Act 3 中央破光现身）
    env.advance(650, 120);
    check(!env.doc.getElementById('ar6-spark'), '650ms 时应撤去神光棒浮层 #ar6-spark');
    check(api.avatarVisualMode() === 'center-rise', `650ms 时应处于 center-rise，实际 ${api.avatarVisualMode()}`);

    // 推进至 1400ms（旧版 V5.6 在 1340ms 处 120Hz RAF 彻底断流！）
    env.advance(750, 120);
    check(api.AR6_SPARK_RUN.active === true && api.AR6_SPARK_RUN.raf !== 0, '120Hz 高刷屏越过 1340ms 后 RAF 必须持续存活（彻底根治 V5.6 断流 Bug）');

    // 推进至 1550ms（Act 4 坍缩成光球）
    env.advance(150, 120);
    check(api.avatarVisualMode() === 'dissolve-to-orb', `1550ms 时应进入 dissolve-to-orb，实际 ${api.avatarVisualMode()}`);

    // 推进至 3000ms（彗星飞掠 → 边缘凝实现身 → 自动清理结束，全程零手动 closeSparklence）
    env.advance(1450, 120);
    const av = env.doc.getElementById('ar6-avatar');
    check(!!av, '120Hz 演出自然结束后 #ar6-avatar 必须存在');
    check(!env.doc.getElementById('ar6-spfx') && !env.doc.getElementById('ar6-sp-flash'), '演出结束后画布 #ar6-spfx 与白闪层必须彻底销毁');
    check(api.AR6_SPARK_RUN.active === false && api.AR6_SPARK_RUN.raf === 0, '演出结束后 AR6_SPARK_RUN 必须清零');
    check(api.avatarVisualMode() === 'landed', `演出结束后 visualMode 必须为 landed，实际 ${api.avatarVisualMode()}`);
    check(av.style.cssText.includes('opacity:1;') && av.style.cssText.includes('visibility:visible;'),
      `演出结束后 #ar6-avatar 必须完全可见（opacity:1;visibility:visible），实际 ${av.style.cssText}`);
    check(env.canvasStats.strokeCalls > 20 && env.canvasStats.arcCalls > 100, '120Hz 彗星尾迹与粒子确实经过真实绘制');

    api.dispose();
  }

  // ---- Scenario 2: 144Hz + 「神光棒变身 · 召唤/复位」(pet-reset) 自动收起主面板无遮挡落位 ----
  {
    const env = createVirtualDomSandbox({ width: 390, height: 844, mobile: true });
    const ctx = vm.createContext(env.win);
    script.runInContext(ctx);
    env.advance(100, 144);
    const api = env.win.__AR6__;
    api.openPanel();
    api.setUITab('scope');
    api.render();
    const resetBtn = env.doc.querySelector('[data-ar6="pet-reset"]');
    check(!!resetBtn, 'pet-reset 按钮存在');
    resetBtn.dispatchEvent({ type: 'pointerdown', pointerId: 1, clientX: 150, clientY: 400 });
    resetBtn.dispatchEvent({ type: 'pointerup', pointerId: 1, clientX: 150, clientY: 400 });
    const wandBtn = env.doc.querySelector('#ar6-spark [data-ar6-sp="fire"]');
    check(!!wandBtn, 'pet-reset 弹出神光棒');
    wandBtn.dispatchEvent({ type: 'pointerdown', pointerId: 2, clientX: 195, clientY: 422 });
    wandBtn.dispatchEvent({ type: 'pointerup', pointerId: 2, clientX: 195, clientY: 422 });
    check(api.isMinimized() === true, '点击「神光棒变身 · 召唤/复位」后点火应自动收起主面板以无遮挡观赏变身');

    env.advance(3200, 144);
    const av = env.doc.getElementById('ar6-avatar');
    check(!!av && api.avatarVisualMode() === 'landed' && av.style.cssText.includes('opacity:1;'),
      '144Hz 高刷屏 pet-reset 自然结束并完整落位可见');
    api.dispose();
  }

  // ---- Scenario 3: RAF 完全冻结/后台节流（0 帧 RAF），靠墙钟兜底与 3.5s 看门狗绝不隐身 ----
  {
    const env = createVirtualDomSandbox({ width: 390, height: 844, mobile: true, freezeRaf: true });
    const ctx = vm.createContext(env.win);
    script.runInContext(ctx);
    env.advance(100, 0);
    const api = env.win.__AR6__;
    api.openPanel();
    api.setUITab('scope');
    api.render();
    const petShowBtn = env.doc.querySelector('[data-ar6="pet-show"]');
    petShowBtn.dispatchEvent({ type: 'pointerdown', pointerId: 1, clientX: 100, clientY: 300 });
    petShowBtn.dispatchEvent({ type: 'pointerup', pointerId: 1, clientX: 100, clientY: 300 });
    const wandBtn = env.doc.querySelector('#ar6-spark [data-ar6-sp="fire"]');
    wandBtn.dispatchEvent({ type: 'pointerdown', pointerId: 2, clientX: 195, clientY: 422 });
    wandBtn.dispatchEvent({ type: 'pointerup', pointerId: 2, clientX: 195, clientY: 422 });

    // 零 RAF 帧推进至 3600ms
    env.advance(3600, 0);
    const av = env.doc.getElementById('ar6-avatar');
    check(!!av && api.avatarVisualMode() === 'landed' && av.style.cssText.includes('opacity:1;') && av.style.cssText.includes('visibility:visible;'),
      'RAF 完全冻结（0 帧）场景下墙钟兜底与看门狗仍 100% 保证 3D 迪迦落位可见');
    check(!env.doc.getElementById('ar6-spark') && !env.doc.getElementById('ar6-spfx') && !env.doc.getElementById('ar6-sp-flash'),
      'RAF 冻结场景兜底结束后无任何浮层/画布残留');

    // ---- Scenario 4: 防双消失自愈律（外力误删 #ar6-avatar 后 syncPill 自动重建）----
    av.remove();
    check(!env.doc.getElementById('ar6-avatar'), '模拟外部 DOM 清理移除了 #ar6-avatar');
    api.syncPill();
    check(!!env.doc.getElementById('ar6-avatar'), 'syncPill 检测到桌宠展开态但节点丢失时必须自动重建 #ar6-avatar，杜绝与圆章同时消失');
    api.dispose();
  }

  // ---- Scenario 5: 反指纹全零画布回读保护（ar6MatteSprite 绝不输出全透明空图）----
  {
    const env = createVirtualDomSandbox({ width: 390, height: 844, mobile: true, blankReadback: true });
    const ctx = vm.createContext(env.win);
    script.runInContext(ctx);
    env.advance(50, 60);
    const api = env.win.__AR6__;
    let outUrl = '';
    api.ar6MatteSprite('multi', (u) => { outUrl = String(u || ''); });
    env.advance(50, 60);
    check(outUrl.startsWith('data:image/jpeg;base64,'),
      `画布 getImageData 全零时 ar6MatteSprite 必须回退原始 JPEG 防止整图变透明，实际前缀 ${outUrl.slice(0, 32)}`);
    api.dispose();
  }

  return { fileName, checks, errs };
}

(function main() {
  let totalChecks = 0;
  let allErrs = [];
  for (const f of TARGETS) {
    const r = runForTarget(f);
    totalChecks += r.checks;
    allErrs = allErrs.concat(r.errs);
    console.log(`[${r.fileName}] ${r.checks - r.errs.length}/${r.checks} V5.61 Sparklence 回归校验通过`);
  }
  if (allErrs.length) {
    console.error('\nFAILURES:');
    for (const e of allErrs) console.error('  ✗ ' + e);
    process.exit(1);
  }
  console.log(`\nALL PASSED: ${totalChecks}/${totalChecks} V5.61 高刷屏/看门狗/自愈回归校验全部通过！`);
})();
