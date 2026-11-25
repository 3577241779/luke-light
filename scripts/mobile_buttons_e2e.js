'use strict';
/**
 * 卢克之光 V5.4 · ST / TT 手机端全按键真触控模拟与持久化 E2E 验证脚本
 * 覆盖窄屏手机视口 (375x812)、完整 W3C 捕获/目标/冒泡事件链、子元素触点 (<span>/<em>)、
 * pointerdown -> pointerup -> 280ms 延迟 -> 同坐标新节点/顶层浮层合成 click，
 * 以及双端 localStorage + SillyTavern extensionSettings.saveSettingsDebounced 跨重载持久化。
 */
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const DESKTOP_OUT_DIR = path.join(__dirname, '..', 'dist');
const MOBILE_TARGETS = [
  'luke-light-st.json',
  'luke-light-tt.json',
];

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function decodeEntities(s) {
  return String(s)
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&');
}

/**
 * 构造支持完整 W3C Capture -> Target -> Bubble 事件传播、ShadowDOM、
 * 窄屏手机视口 (375x812) 与持久化存储共享的真触控 DOM 沙箱
 */
function createMobileBrowserEnv(sharedStorageMap, platformOpts = {}) {
  const store = sharedStorageMap || new Map();
  const localStorage = {
    getItem(k) { return store.has(String(k)) ? store.get(String(k)) : null; },
    setItem(k, v) { store.set(String(k), String(v)); },
    removeItem(k) { store.delete(String(k)); },
    clear() { store.clear(); },
    key(i) { return [...store.keys()][i] ?? null; },
    get length() { return store.size; },
  };

  function parseSimpleSelector(sel) {
    return String(sel || '').split(',').map((s) => s.trim()).filter(Boolean);
  }

  function matchSingleSelector(el, s) {
    if (!el || el.nodeType !== 1) return false;
    let rest = s.trim();
    if (/\s+/.test(rest)) {
      const parts = rest.split(/\s+/);
      const last = parts.pop();
      if (!matchSingleSelector(el, last)) return false;
      let cur = el.parentNode;
      for (let i = parts.length - 1; i >= 0; i--) {
        while (cur && !matchSingleSelector(cur, parts[i])) cur = cur.parentNode;
        if (!cur) return false;
        cur = cur.parentNode;
      }
      return true;
    }
    rest = rest.replace(/:has\([^)]*\)/g, '');
    const attrMatches = [...rest.matchAll(/\[([^\]=^]+)(?:(\^?=)["']?([^"'\]]*)["']?)?\]/g)];
    rest = rest.replace(/\[[^\]]+\]/g, '');
    for (const m of attrMatches) {
      const [, attr, op, val] = m;
      const got = el.getAttribute(attr);
      if (!op) {
        if (got === null) return false;
      } else if (op === '=') {
        if (got !== val) return false;
      } else if (op === '^=') {
        if (got === null || !got.startsWith(val)) return false;
      }
    }
    const idMatch = rest.match(/#([A-Za-z0-9_-]+)/);
    if (idMatch) {
      if (el.id !== idMatch[1]) return false;
      rest = rest.replace(/#[A-Za-z0-9_-]+/, '');
    }
    const clsMatches = [...rest.matchAll(/\.([A-Za-z0-9_-]+)/g)];
    for (const m of clsMatches) {
      if (!el.classList.contains(m[1])) return false;
    }
    rest = rest.replace(/\.[A-Za-z0-9_-]+/g, '');
    if (rest && rest !== '*') {
      if (el.tagName.toLowerCase() !== rest.toLowerCase()) return false;
    }
    return true;
  }

  function matchesAny(el, selector) {
    return parseSimpleSelector(selector).some((s) => matchSingleSelector(el, s));
  }

  function makeEventTarget(node) {
    const map = new Map();
    node.__listeners = map;
    node.addEventListener = function (type, fn, opts) {
      if (typeof fn !== 'function') return;
      const capture = typeof opts === 'boolean' ? opts : !!(opts && opts.capture);
      if (!map.has(type)) map.set(type, []);
      const list = map.get(type);
      if (!list.some((x) => x.fn === fn && x.capture === capture)) {
        list.push({ fn, capture });
      }
    };
    node.removeEventListener = function (type, fn, opts) {
      const list = map.get(type);
      if (!list) return;
      const capture = typeof opts === 'boolean' ? opts : !!(opts && opts.capture);
      const idx = list.findIndex((x) => x.fn === fn && x.capture === capture);
      if (idx >= 0) list.splice(idx, 1);
    };
    node.dispatchEvent = function (rawEv) {
      return dispatchW3CEvent(node, rawEv);
    };
  }

  function buildEventPath(target) {
    const pathNodes = [];
    let cur = target;
    while (cur) {
      pathNodes.push(cur);
      if (cur.parentNode) {
        cur = cur.parentNode;
      } else if (cur.isShadowRoot && cur.host) {
        cur = cur.host;
      } else if (cur === document.documentElement) {
        cur = document;
      } else if (cur === document) {
        cur = win;
      } else {
        cur = null;
      }
    }
    return pathNodes;
  }

  function dispatchW3CEvent(target, rawEv) {
    const type = String(rawEv.type || '');
    const bubbles = rawEv.bubbles !== undefined ? !!rawEv.bubbles : true;
    const cancelable = rawEv.cancelable !== undefined ? !!rawEv.cancelable : true;
    let stopped = false;
    let immediateStopped = false;
    let defaultPrevented = false;

    const ev = Object.assign({}, rawEv, {
      type,
      bubbles,
      cancelable,
      target: rawEv.target || target,
      currentTarget: null,
      eventPhase: 0,
      get defaultPrevented() { return defaultPrevented; },
      preventDefault() { if (cancelable) defaultPrevented = true; },
      stopPropagation() { stopped = true; },
      stopImmediatePropagation() { stopped = true; immediateStopped = true; },
    });

    const pathNodes = buildEventPath(target);

    // 1. Capture phase (root -> parent of target)
    ev.eventPhase = 1;
    for (let i = pathNodes.length - 1; i >= 1; i--) {
      if (stopped) break;
      const cur = pathNodes[i];
      const list = (cur.__listeners && cur.__listeners.get(type)) ? [...cur.__listeners.get(type)] : [];
      ev.currentTarget = cur;
      for (const item of list) {
        if (!item.capture) continue;
        item.fn.call(cur, ev);
        if (immediateStopped) break;
      }
    }

    // 2. At-target phase
    if (!stopped) {
      ev.eventPhase = 2;
      ev.currentTarget = target;
      const list = (target.__listeners && target.__listeners.get(type)) ? [...target.__listeners.get(type)] : [];
      for (const item of list) {
        item.fn.call(target, ev);
        if (immediateStopped) break;
      }
    }

    // 3. Bubble phase (parent of target -> root)
    if (bubbles && !stopped) {
      ev.eventPhase = 3;
      for (let i = 1; i < pathNodes.length; i++) {
        if (stopped) break;
        const cur = pathNodes[i];
        const list = (cur.__listeners && cur.__listeners.get(type)) ? [...cur.__listeners.get(type)] : [];
        ev.currentTarget = cur;
        for (const item of list) {
          if (item.capture) continue;
          item.fn.call(cur, ev);
          if (immediateStopped) break;
        }
      }
    }

    // Browser default activation for <input type="checkbox|radio"> or wrapping <label> on click
    if (type === 'click' && !defaultPrevented && target && target.nodeType === 1) {
      let inp = (target.tagName === 'INPUT') ? target : null;
      if (!inp && target.closest) {
        const lbl = target.closest('label');
        if (lbl && lbl.querySelector) inp = lbl.querySelector('input');
      }
      if (inp && (inp.type === 'checkbox' || inp.type === 'radio')) {
        if (inp.type === 'checkbox') {
          inp.checked = !inp.checked;
          dispatchW3CEvent(inp, { type: 'change', bubbles: true, cancelable: false });
        } else if (inp.type === 'radio') {
          const nm = inp.getAttribute('name');
          if (nm && document.querySelectorAll) {
            for (const r of document.querySelectorAll(`input[name="${nm}"]`)) {
              r.checked = (r === inp);
            }
          } else {
            inp.checked = true;
          }
          dispatchW3CEvent(inp, { type: 'change', bubbles: true, cancelable: false });
        }
      }
    }

    return !defaultPrevented;
  }

  function parseHTMLInto(parent, html, doc) {
    for (const ch of parent.children) ch.parentNode = null;
    parent.children = [];
    const str = String(html || '');
    const tagRe = /<!--[\s\S]*?-->|<\/([a-zA-Z0-9_-]+)\s*>|<([a-zA-Z0-9_-]+)((?:\s+[^\s/>=]+(?:\s*=\s*(?:"[^"]*"|'[^']*'|[^\s"'=>]+))?)*)\s*(\/?)>/g;
    const stack = [parent];
    const voidTags = new Set(['br', 'hr', 'img', 'input', 'meta', 'link', 'path', 'circle', 'ellipse', 'line', 'rect', 'polygon', 'stop']);
    let lastIdx = 0;
    let m;
    while ((m = tagRe.exec(str)) !== null) {
      if (m.index > lastIdx) {
        const txt = decodeEntities(str.slice(lastIdx, m.index));
        if (txt) stack[stack.length - 1]._textParts.push(txt);
      }
      lastIdx = tagRe.lastIndex;
      if (m[0].startsWith('<!--')) continue;
      if (m[1]) {
        const closeTag = m[1].toUpperCase();
        for (let i = stack.length - 1; i >= 1; i--) {
          if (stack[i].tagName === closeTag) {
            stack.length = i;
            break;
          }
        }
      } else if (m[2]) {
        const tagName = m[2].toUpperCase();
        const attrStr = m[3] || '';
        const selfClose = !!m[4] || voidTags.has(m[2].toLowerCase());
        const el = createElement(tagName, doc);
        const attrRe = /([^\s/>=]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=>]+)))?/g;
        let am;
        while ((am = attrRe.exec(attrStr)) !== null) {
          const k = am[1];
          const v = am[2] !== undefined ? am[2] : (am[3] !== undefined ? am[3] : (am[4] !== undefined ? am[4] : ''));
          el.setAttribute(k, decodeEntities(v));
        }
        stack[stack.length - 1].appendChild(el);
        if (tagName === 'STYLE' || tagName === 'SCRIPT') {
          const closeRe = new RegExp(`</${m[2]}\\s*>`, 'ig');
          closeRe.lastIndex = tagRe.lastIndex;
          const cm = closeRe.exec(str);
          if (cm) {
            el._rawInner = str.slice(tagRe.lastIndex, cm.index);
            el._textParts.push(el._rawInner);
            tagRe.lastIndex = closeRe.lastIndex;
            lastIdx = tagRe.lastIndex;
          }
        } else if (!selfClose) {
          stack.push(el);
        }
      }
    }
    if (lastIdx < str.length) {
      stack[stack.length - 1]._textParts.push(decodeEntities(str.slice(lastIdx)));
    }
  }

  function createElement(tag, doc) {
    const attrs = new Map();
    const classSet = new Set();
    const styleObj = {
      _css: '',
      display: '',
      left: '',
      top: '',
      width: '',
      height: '',
      maxHeight: '',
      transform: '',
      zIndex: '',
      get cssText() { return this._css; },
      set cssText(v) {
        this._css = String(v || '');
        const dm = /display\s*:\s*([^;!]+)/i.exec(this._css);
        if (dm) this.display = dm[1].trim();
      },
      setProperty(k, v) { this[k] = v; },
    };
    const el = {
      nodeType: 1,
      tagName: String(tag || 'DIV').toUpperCase(),
      ownerDocument: doc,
      parentNode: null,
      children: [],
      _textParts: [],
      _rawInner: '',
      style: styleObj,
      hidden: false,
      value: '',
      checked: false,
      type: '',
      offsetWidth: 355,
      offsetHeight: 48,
      offsetLeft: 10,
      offsetTop: 10,
      clientWidth: 355,
      clientHeight: 48,
      scrollWidth: 355,
      scrollHeight: 600,
      scrollTop: 0,
      scrollLeft: 0,
      get isConnected() {
        let cur = this;
        while (cur) {
          if (cur === doc.body || cur === doc.documentElement) return true;
          if (cur.isShadowRoot && cur.host) { cur = cur.host; continue; }
          cur = cur.parentNode;
        }
        return false;
      },
      get firstChild() { return this.children[0] || null; },
      get nextSibling() {
        if (!this.parentNode) return null;
        const i = this.parentNode.children.indexOf(this);
        return (i >= 0 && i + 1 < this.parentNode.children.length) ? this.parentNode.children[i + 1] : null;
      },
      get id() { return attrs.get('id') || ''; },
      set id(v) {
        if (v) attrs.set('id', String(v));
        else attrs.delete('id');
      },
      get className() { return [...classSet].join(' '); },
      set className(v) {
        classSet.clear();
        String(v || '').split(/\s+/).filter(Boolean).forEach((c) => classSet.add(c));
        attrs.set('class', [...classSet].join(' '));
      },
      classList: {
        add(...cs) { cs.forEach((c) => c && classSet.add(c)); attrs.set('class', [...classSet].join(' ')); },
        remove(...cs) { cs.forEach((c) => classSet.delete(c)); attrs.set('class', [...classSet].join(' ')); },
        contains(c) { return classSet.has(c); },
      },
      setAttribute(k, v) {
        const ks = String(k);
        const vs = String(v);
        attrs.set(ks, vs);
        if (ks === 'class') {
          classSet.clear();
          vs.split(/\s+/).filter(Boolean).forEach((c) => classSet.add(c));
        }
        if (ks === 'style') {
          styleObj.cssText = vs;
        }
        if (ks === 'value') this.value = vs;
        if (ks === 'checked') this.checked = true;
        if (ks === 'type') this.type = vs;
      },
      getAttribute(k) { return attrs.has(String(k)) ? attrs.get(String(k)) : null; },
      removeAttribute(k) { attrs.delete(String(k)); },
      appendChild(child) {
        if (!child) return child;
        if (child.parentNode) child.parentNode.removeChild(child);
        child.parentNode = this;
        this.children.push(child);
        return child;
      },
      insertBefore(child, ref) {
        if (!child) return child;
        if (child.parentNode) child.parentNode.removeChild(child);
        child.parentNode = this;
        const idx = ref ? this.children.indexOf(ref) : -1;
        if (idx >= 0) this.children.splice(idx, 0, child);
        else this.children.push(child);
        return child;
      },
      removeChild(child) {
        const idx = this.children.indexOf(child);
        if (idx >= 0) {
          this.children.splice(idx, 1);
          child.parentNode = null;
        }
        return child;
      },
      remove() { if (this.parentNode) this.parentNode.removeChild(this); },
      contains(other) {
        let cur = other;
        while (cur) {
          if (cur === this) return true;
          cur = cur.parentNode;
        }
        return false;
      },
      closest(sel) {
        let cur = this;
        while (cur && cur.nodeType === 1) {
          if (matchesAny(cur, sel)) return cur;
          cur = cur.parentNode;
        }
        return null;
      },
      querySelector(sel) { return this.querySelectorAll(sel)[0] || null; },
      querySelectorAll(sel) {
        const out = [];
        function walk(node) {
          for (const ch of node.children) {
            if (matchesAny(ch, sel)) out.push(ch);
            walk(ch);
          }
        }
        walk(this);
        return out;
      },
      get innerHTML() { return this._rawInner; },
      set innerHTML(v) {
        this._rawInner = String(v == null ? '' : v);
        this._textParts = [];
        parseHTMLInto(this, this._rawInner, doc);
      },
      get textContent() {
        let s = this._textParts.join('');
        for (const ch of this.children) s += ch.textContent;
        return s;
      },
      set textContent(v) {
        for (const ch of this.children) ch.parentNode = null;
        this.children = [];
        this._rawInner = String(v == null ? '' : v);
        this._textParts = [this._rawInner];
      },
      click() {
        this.dispatchEvent({ type: 'click', bubbles: true, cancelable: true, detail: 1 });
      },
      focus() { doc.activeElement = this; },
      blur() {
        if (doc.activeElement === this) doc.activeElement = doc.body;
        this.dispatchEvent({ type: 'focusout', bubbles: true, cancelable: false });
      },
      select() {},
      setSelectionRange() {},
      setPointerCapture() {},
      releasePointerCapture() {},
      scrollIntoView() {},
      getBoundingClientRect() {
        return { left: 8, top: 24, width: 359, height: 680, right: 367, bottom: 704 };
      },
      attachShadow() {
        const sr = createElement('SHADOW-ROOT', doc);
        sr.isShadowRoot = true;
        sr.host = this;
        this.shadowRoot = sr;
        return sr;
      },
    };
    makeEventTarget(el);
    return el;
  }

  const document = {
    nodeType: 9,
    hidden: false,
    activeElement: null,
    head: null,
    body: null,
    documentElement: null,
    defaultView: null,
    lastCopiedText: '',
    createElement(tag) { return createElement(tag, document); },
    getElementById(id) {
      function findIn(node) {
        if (!node) return null;
        if (node.id === id) return node;
        for (const ch of node.children || []) {
          const hit = findIn(ch);
          if (hit) return hit;
        }
        return null;
      }
      return findIn(document.documentElement) || null;
    },
    querySelector(sel) { return document.documentElement.querySelector(sel); },
    querySelectorAll(sel) { return document.documentElement.querySelectorAll(sel); },
    execCommand(cmd) {
      if (cmd === 'copy' && document.activeElement && typeof document.activeElement.value === 'string') {
        document.lastCopiedText = document.activeElement.value;
      }
      return true;
    },
  };
  makeEventTarget(document);

  document.documentElement = createElement('HTML', document);
  document.documentElement.clientWidth = 375;
  document.documentElement.clientHeight = 812;
  document.head = createElement('HEAD', document);
  document.body = createElement('BODY', document);
  document.documentElement.appendChild(document.head);
  document.documentElement.appendChild(document.body);
  document.activeElement = document.body;

  if (platformOpts.withExtensionsMenu !== false) {
    const extBtn = createElement('DIV', document);
    extBtn.id = 'extensionsMenuButton';
    const extMenu = createElement('DIV', document);
    extMenu.id = 'extensionsMenu';
    document.body.appendChild(extBtn);
    document.body.appendChild(extMenu);
  }
  const sendTa = createElement('TEXTAREA', document);
  sendTa.id = 'send_textarea';
  const sendBut = createElement('DIV', document);
  sendBut.id = 'send_but';
  document.body.appendChild(sendTa);
  document.body.appendChild(sendBut);

  const timers = new Set();
  const intervals = new Set();

  const vvTarget = {
    width: 375,
    height: 812,
    offsetTop: 0,
  };
  makeEventTarget(vvTarget);

  const stState = platformOpts.stState || {
    extensionSettings: {},
    saveSettingsCalls: 0,
    generateCalls: 0,
    slashCalls: [],
    chat: [
      { is_user: false, name: 'Char', send_date: '2026-11-23T10:00:00Z', mes: '夜雨敲打着窗棂，远处的钟楼传来低沉的回响。' },
    ],
    presetPrompts: [],
  };

  const win = {
    document,
    localStorage,
    innerWidth: 375,
    innerHeight: 812,
    isSecureContext: false, // 模拟局域网 HTTP 手机酒馆 (http://192.168.1.x:8000)
    visualViewport: vvTarget,
    location: { href: 'http://192.168.1.8:8000/', origin: 'http://192.168.1.8:8000', host: '192.168.1.8:8000' },
    navigator: {
      userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1',
    },
    console: { log() {}, info() {}, warn() {}, error() {} },
    fetch: async () => new Response('{}', { status: 200, headers: { 'content-type': 'application/json' } }),
    Response,
    Headers,
    Request,
    TransformStream,
    ReadableStream,
    TextEncoder,
    TextDecoder,
    AbortController,
    URL,
    Promise,
    MutationObserver: class { observe() {} disconnect() {} },
    ResizeObserver: class { observe() {} disconnect() {} },
    XMLHttpRequest: function () {},
    matchMedia: (q) => ({
      matches: q.includes('max-width') || q.includes('pointer:coarse') || q.includes('pointer: coarse'),
    }),
    getComputedStyle: (el) => ({
      display: (el && el.style && el.style.display) || 'block',
      height: '680px',
      maxHeight: '720px',
      overflow: 'hidden',
      flexBasis: 'auto',
      transform: 'none',
      filter: 'none',
      willChange: 'auto',
      contain: 'none',
    }),
    requestAnimationFrame: (fn) => { const t = setTimeout(fn, 0); timers.add(t); return t; },
    setTimeout: (fn, ms) => { const t = setTimeout(fn, ms); timers.add(t); return t; },
    clearTimeout: (t) => { timers.delete(t); clearTimeout(t); },
    setInterval: (fn, ms) => { const t = setInterval(fn, ms); intervals.add(t); return t; },
    clearInterval: (t) => { intervals.delete(t); clearInterval(t); },
    SillyTavern: {
      getContext: () => ({
        chatId: 'mobile-e2e-chat',
        chat: stState.chat,
        extensionSettings: stState.extensionSettings,
        chatCompletionSettings: { prompts: stState.presetPrompts },
        saveSettingsDebounced: () => { stState.saveSettingsCalls++; },
        getRequestHeaders: () => ({ 'Content-Type': 'application/json', 'X-CSRF-Token': 'csrf-mob' }),
        Generate: (mode) => { stState.generateCalls++; return Promise.resolve(mode); },
        executeSlashCommandsWithOptions: (cmd) => { stState.slashCalls.push(cmd); return Promise.resolve('ok'); },
      }),
    },
    cleanup() {
      for (const t of timers) clearTimeout(t);
      for (const t of intervals) clearInterval(t);
      timers.clear();
      intervals.clear();
    },
  };
  makeEventTarget(win);
  win.XMLHttpRequest.prototype = { open() {}, send() {} };

  if (platformOpts.isTT) {
    const btnHandlers = new Map();
    win.getButtonEvent = (name) => `btn_ev_${name}`;
    win.eventOn = (evName, fn) => { btnHandlers.set(evName, fn); };
    win.__fireTTButton = (name) => {
      const fn = btnHandlers.get(`btn_ev_${name}`);
      if (fn) fn();
    };
    win.triggerSlash = (cmd) => { stState.slashCalls.push(cmd); return Promise.resolve('tt-ok'); };
  }

  win.window = win;
  win.top = win;
  win.parent = win;
  win.globalThis = win;
  document.defaultView = win;

  return { win, stState, store };
}

function normKeyForSlot(s) {
  const k = String(s || '');
  if (k === '● 已开启' || k === '○ 已关闭' || k.includes('● 已开启')) return 'toggle';
  if (k.startsWith('⏸ 暂停重发') || k.startsWith('⏸ 已暂停')) return 'pvp-pause';
  return k
    .replace(/[:：](?:开|关|听预设|已开启|已关闭|待机|随主闸待机|已挂载|未挂载|已暂停|自动|手动|轻档|中档|\d+次|on|off|safe|mid|strong|supreme|gatanothor|noa|abyss|only|auto|low|medium|high)$/, '')
    .replace(/\s(?:开|关)$/, '');
}

function pickInnerTouchChild(btn) {
  if (!btn || !btn.children || !btn.children.length) return btn;
  // 优先挑按钮内部的 <span> 或 <em> 子元素，真实模拟手指点在文字标签/状态角标上
  const emOrSpan = btn.querySelector('span, em, i');
  return emOrSpan || btn.children[0] || btn;
}

/**
 * 模拟真实手机 WebView 完整触控序列：
 * pointerdown(clientX:120, clientY:240)（打在子元素 <span>/<em> 上）
 * -> pointerup(clientX:120, clientY:240)
 * -> 延迟 280ms
 * -> 在当前顶层同坐标元素/重绘后新按钮子元素上派发合成 click(clientX:120, clientY:240)
 */
async function mobileTouchTap(win, finder, opts = {}) {
  const doc = win.document;
  const cx = opts.clientX != null ? opts.clientX : 120;
  const cy = opts.clientY != null ? opts.clientY : 240;

  const btn = typeof finder === 'function' ? finder() : doc.querySelector(finder);
  if (!btn) {
    throw new Error(`Button not found for tap: ${typeof finder === 'string' ? finder : (opts.label || 'custom finder')}`);
  }

  const downTarget = opts.directTarget ? btn : pickInnerTouchChild(btn);
  const origAr6 = btn.getAttribute ? btn.getAttribute('data-ar6') : null;
  const origNorm = origAr6 ? normKeyForSlot(origAr6) : null;

  const hadCardBefore = !!doc.getElementById('ar6-card');
  const hadPvpBefore = !!doc.getElementById('ar6-pvdbg');
  const hadHelpBefore = !!doc.getElementById('ar6-help');
  const hadLogBefore = !!doc.getElementById('ar6-logwin');
  const rootBefore = doc.getElementById('ar6-root');
  const hadPanelBefore = !!(rootBefore && rootBefore.getAttribute('data-min') !== '1' && rootBefore.style.display !== 'none');

  // 1. pointerdown on inner child
  downTarget.dispatchEvent({
    type: 'pointerdown',
    bubbles: true,
    cancelable: true,
    pointerId: 1,
    pointerType: 'touch',
    button: 0,
    clientX: cx,
    clientY: cy,
  });

  await sleep(12);

  // 2. pointerup on inner child
  downTarget.dispatchEvent({
    type: 'pointerup',
    bubbles: true,
    cancelable: true,
    pointerId: 1,
    pointerType: 'touch',
    button: 0,
    clientX: cx,
    clientY: cy,
  });

  // 3. 真实手机 WebView 280ms 合成 click 延迟
  await sleep(280);

  // 4. 计算此时 (cx, cy) 处的真实命中节点（含新弹出浮层穿透检测 & 原地 innerHTML 重建新节点检测）
  let clickTarget = null;
  const cardNow = doc.getElementById('ar6-card');
  const pvpNow = doc.getElementById('ar6-pvdbg');
  const helpNow = doc.getElementById('ar6-help');
  const logNow = doc.getElementById('ar6-logwin');
  const rootNow = doc.getElementById('ar6-root');
  const panelNow = !!(rootNow && rootNow.getAttribute('data-min') !== '1' && rootNow.style.display !== 'none');

  if (!hadCardBefore && cardNow) {
    // 刚弹出的 #ar6-card 全屏遮罩覆盖了 (120, 240)：模拟合成 click 打在遮罩或内部首个按钮上
    clickTarget = opts.synthHitCardBtn ? (cardNow.querySelector('[data-ar6-card]') || cardNow) : cardNow;
  } else if (!hadPvpBefore && pvpNow) {
    clickTarget = pvpNow.querySelector('[data-pvpact]') || pvpNow;
  } else if (!hadHelpBefore && helpNow) {
    clickTarget = helpNow.querySelector('[data-ar6-card]') || helpNow;
  } else if (!hadLogBefore && logNow) {
    clickTarget = logNow.querySelector('[data-ar6="lwclose"]') || logNow;
  } else if (!hadPanelBefore && panelNow) {
    // 从圆章 #ar6-pill 或桌宠双击唤起主面板后，主面板覆盖在原坐标之上
    const firstBtn = rootNow.querySelector('.ar6-body [data-ar6]') || rootNow.querySelector('[data-ar6]');
    clickTarget = firstBtn ? pickInnerTouchChild(firstBtn) : rootNow;
  } else if ((hadCardBefore && !cardNow && panelNow) || (hadPvpBefore && !pvpNow && panelNow)) {
    // 点遮罩关闭浮层后，底下主面板按钮暴露在 (120, 240)
    const underBtn = rootNow.querySelector('.ar6-body [data-ar6]') || rootNow.querySelector('[data-ar6]');
    clickTarget = underBtn ? pickInnerTouchChild(underBtn) : rootNow;
  } else if (downTarget.isConnected) {
    clickTarget = downTarget;
  } else if (typeof finder === 'function') {
    const reFound = finder();
    if (reFound && reFound.isConnected) clickTarget = pickInnerTouchChild(reFound);
  }

  if (!clickTarget && origNorm && panelNow) {
    // 原按钮因 innerHTML 重建被销毁，按归一化动作键在当前面板中定位原地重建的新按钮
    const allBtns = rootNow.querySelectorAll('[data-ar6]');
    for (const cand of allBtns) {
      if (cand.closest && cand.closest('[hidden]')) continue;
      const ca = cand.getAttribute('data-ar6') || '';
      if (ca === origAr6 || normKeyForSlot(ca) === origNorm) {
        clickTarget = pickInnerTouchChild(cand);
        break;
      }
    }
    // 若原按钮消失（如收起确认框导致下方其它按钮上移到手指坐标下），取当前分栏相邻按钮模拟位移幽灵点按
    if (!clickTarget) {
      const fallbackBtn = rootNow.querySelector('.ar6-body [data-ar6]');
      if (fallbackBtn) clickTarget = pickInnerTouchChild(fallbackBtn);
    }
  }

  if (clickTarget && clickTarget.isConnected) {
    clickTarget.dispatchEvent({
      type: 'click',
      bubbles: true,
      cancelable: true,
      detail: 1,
      clientX: cx,
      clientY: cy,
    });
  }
}

function bootBundleInEnv(bundleCode, envObj) {
  vm.runInNewContext(bundleCode, envObj.win, { timeout: 15000 });
  return envObj.win.__AR6__;
}

function findAr6Btn(win, prefixOrExact, exact = false) {
  const root = win.document.getElementById('ar6-root');
  if (!root) return null;
  const all = root.querySelectorAll('[data-ar6]');
  for (const el of all) {
    let hiddenParent = false;
    let p = el.parentNode;
    while (p && p !== root) {
      if (p.hidden) { hiddenParent = true; break; }
      p = p.parentNode;
    }
    if (hiddenParent) continue;
    const v = el.getAttribute('data-ar6') || '';
    if (exact ? v === prefixOrExact : (v === prefixOrExact || v.startsWith(prefixOrExact))) {
      return el;
    }
  }
  return null;
}

async function runSuiteForTarget(fileName) {
  const fullPath = path.join(DESKTOP_OUT_DIR, fileName);
  const raw = JSON.parse(fs.readFileSync(fullPath, 'utf8'));
  const isTT = /TT酒馆适配|-tt\.json/i.test(fileName);
  const sharedStore = new Map();
  const assertions = [];
  const failures = [];

  function check(cond, name, detail = '') {
    if (cond) {
      assertions.push(name);
    } else {
      failures.push(`${name}${detail ? ' — ' + detail : ''}`);
    }
  }

  const env1 = createMobileBrowserEnv(sharedStore, {
    isTT,
    withExtensionsMenu: !isTT,
  });
  let api = bootBundleInEnv(raw.content, env1);
  let win = env1.win;
  const stState = env1.stState;

  try {
    check(api.uiMode() === 'mobile', '窄屏手机模式识别 uiMode()===mobile', `got ${api.uiMode()}`);
    check(api.PLATFORM === (isTT ? 'tt' : 'st'), `平台常量识别 PLATFORM===${isTT ? 'tt' : 'st'}`, `got ${api.PLATFORM}`);

    // 0. 从侧边彩色计时器圆章 #ar6-pill 真触控唤起主面板（验证合成 click 不误触主面板内开关）
    const cfgBeforeOpen = JSON.stringify(api.getCfg());
    const pill = win.document.getElementById('ar6-pill');
    check(!!pill && pill.style.display !== 'none', '初始收起态侧边圆章 #ar6-pill 可见');
    await mobileTouchTap(win, () => win.document.getElementById('ar6-pill'), { clientX: 350, clientY: 500 });
    check(api.isMinimized() === false, '点按 #ar6-pill 打开主面板且不被合成 click 关回');
    check(api.getCfg().enabled === true, '打开面板瞬间合成 click 未误触顶栏/卡片开关');

    // =========================================================================
    // 第 1 栏：光之雷达 (route) 全按键真触控测试
    // =========================================================================
    await mobileTouchTap(win, () => win.document.querySelector('[data-ar6="nav"][data-ar6-nav="route"]'));

    // 1.1 顶栏总开关 & 卡片总开关 ● 已开启 <-> ○ 已关闭（绝不回弹）
    await mobileTouchTap(win, () => win.document.querySelector('.ar6-hsw[data-ar6]'));
    check(api.getCfg().enabled === false, '顶栏总开关 ● 已开启 -> ○ 已关闭 不回弹', `enabled=${api.getCfg().enabled}`);
    await mobileTouchTap(win, () => win.document.querySelector('.ar6-mk[data-ar6]'));
    check(api.getCfg().enabled === true, '卡片总开关 ○ 已关闭 -> ● 已开启 不回弹', `enabled=${api.getCfg().enabled}`);

    // 1.2 光波折射 gm:refract:0/1/2
    await mobileTouchTap(win, () => findAr6Btn(win, 'gm:refract:1', true));
    check(api.getCfg().refract === 'light', 'gm:refract:1 切换微光级');
    await mobileTouchTap(win, () => findAr6Btn(win, 'gm:refract:2', true));
    check(api.getCfg().refract === 'mid', 'gm:refract:2 切换棱镜级');
    await mobileTouchTap(win, () => findAr6Btn(win, 'gm:refract:0', true));
    check(api.getCfg().refract === 'off', 'gm:refract:0 切回关闭');

    // 1.3 第 1 栏 4 个子开关（开 -> 关 -> 开）
    await mobileTouchTap(win, () => findAr6Btn(win, '📌 钉参数:'));
    check(api.getCfg().pin === false, '📌 钉参数 关 不回弹');
    await mobileTouchTap(win, () => findAr6Btn(win, '📌 钉参数:'));
    check(api.getCfg().pin === true, '📌 钉参数 开 不回弹');

    await mobileTouchTap(win, () => findAr6Btn(win, '👁 观察器:'));
    check(api.getCfg().observe === false, '👁 观察器 关 不回弹');
    await mobileTouchTap(win, () => findAr6Btn(win, '👁 观察器:'));
    check(api.getCfg().observe === true, '👁 观察器 开 不回弹');

    await mobileTouchTap(win, () => findAr6Btn(win, '📈 行为基线:'));
    check(api.getCfg().base === 'off', '📈 行为基线 关 不回弹');
    await mobileTouchTap(win, () => findAr6Btn(win, '📈 行为基线:'));
    check(api.getCfg().base === 'on', '📈 行为基线 开 不回弹');

    await mobileTouchTap(win, () => findAr6Btn(win, '🔬 返回格式:'));
    check(api.getCfg().shape === 'off', '🔬 返回格式 关 不回弹');
    await mobileTouchTap(win, () => findAr6Btn(win, '🔬 返回格式:'));
    check(api.getCfg().shape === 'on', '🔬 返回格式 开 不回弹');

    // 1.4 精神同调 gm:think:0/1/2/3
    await mobileTouchTap(win, () => findAr6Btn(win, 'gm:think:1', true));
    check(api.getCfg().think === 'low', 'gm:think:1 低维');
    await mobileTouchTap(win, () => findAr6Btn(win, 'gm:think:2', true));
    check(api.getCfg().think === 'medium', 'gm:think:2 均衡');
    await mobileTouchTap(win, () => findAr6Btn(win, 'gm:think:3', true));
    check(api.getCfg().think === 'high', 'gm:think:3 深度同调');
    await mobileTouchTap(win, () => findAr6Btn(win, 'gm:think:0', true));
    check(api.getCfg().think === 'auto', 'gm:think:0 跟随预设');

    // 1.5 silent 横幅静默开关
    await mobileTouchTap(win, () => findAr6Btn(win, 'silent', true));
    check(api.getCfg().silent === true, 'silent 开启静默不回弹');
    await mobileTouchTap(win, () => findAr6Btn(win, 'silent', true));
    check(api.getCfg().silent === false, 'silent 恢复昭示不回弹');

    // 1.6 probe:verify & probe:alias 空地址不死锁 + 并发锁测试
    api.setCfg('dualBase', '');
    await mobileTouchTap(win, () => findAr6Btn(win, 'probe:verify', true));
    await mobileTouchTap(win, () => findAr6Btn(win, 'probe:alias', true));

    let probeHits = 0;
    let releaseProbe = null;
    win.fetch = async (input, init) => {
      const hdrs = (init && init.headers) || {};
      const isInt = (typeof hdrs.get === 'function' ? hdrs.get('x-ar6-internal') : hdrs['x-ar6-internal']) === '1';
      if (isInt) {
        probeHits++;
        await new Promise((r) => { releaseProbe = r; });
        return new Response(JSON.stringify({ error: { message: 'model does not exist' } }), {
          status: 404,
          headers: { 'content-type': 'application/json' },
        });
      }
      return new Response('data: {"id":"1","model":"gemini-4-hydrogen","choices":[{"index":0,"delta":{"content":"正文测试内容。"},"finish_reason":"stop"}]}\n\ndata: [DONE]\n\n', {
        status: 200,
        headers: { 'content-type': 'text/event-stream' },
      });
    };
    api.dispose();
    api.boot();
    api.openPanel();
    api.setCfg('dualBase', 'https://relay.example.com/v1');

    // 触发第一次 probe:verify（挂起中），紧接着触发第二次验证并发互斥锁
    const p1 = api.runChannelVerify();
    const p2 = await api.runChannelVerify();
    check(probeHits === 1 && p2 && p2.ok === false && String(p2.msg || '').includes('正在运行'),
      'probe:verify 空地址后未死锁且并发互斥锁生效', `probeHits=${probeHits}, p2=${JSON.stringify(p2)}`);
    if (releaseProbe) releaseProbe();
    const p1Res = await p1;
    check(p1Res && p1Res.ok === true && p1Res.echoes === false, 'probe:verify 完成后正常释放锁并返回可验结果');

    // 1.7 写入一条日志后测试 report 诊断报告弹窗 + logwin 采样悬浮窗 + exportlog/diagcopy/diagcheck/rebuild/clear
    api.pushLog({
      rid: 501,
      at: Date.now(),
      code: 'diff',
      conf: 'A',
      req: 'gemini-4-hydrogen',
      obs: 'gemini-2.5-flash',
      src: 'body',
      ttft: 420,
      total: 1650,
      chars: 128,
      base: 'https://relay.example.com/v1',
      note: '测试降级样本',
    });
    api.render();

    await mobileTouchTap(win, () => findAr6Btn(win, 'report', true));
    check(!!win.document.getElementById('ar6-card') && api.isMinimized() === false,
      'report 点开诊断报告弹窗不被 280ms 合成 click 秒关，且主面板保持打开');
    if (win.document.getElementById('ar6-card')) {
      // 在报告弹窗点切换 engine 标签页，再点关闭
      await mobileTouchTap(win, () => win.document.querySelector('#ar6-card [data-ar6-card="tab"][data-tab="engine"]'));
      check(!!win.document.getElementById('ar6-card') && !api.isMinimized(), '诊断报告内部切页不误关主面板');
      await mobileTouchTap(win, () => win.document.querySelector('#ar6-card [data-ar6-card="copy"]'));
      await mobileTouchTap(win, () => win.document.querySelector('#ar6-card [data-ar6-card="close"]'));
      check(!win.document.getElementById('ar6-card') && !api.isMinimized(), '关闭诊断报告后主面板保持打开');
    }

    // logwin 开关 + 筛选胶囊 .on + clear 联动刷新 + lwclose 关闭
    await mobileTouchTap(win, () => findAr6Btn(win, 'logwin', true));
    const lwNode = win.document.getElementById('ar6-logwin');
    check(!!lwNode && api.LOGW.open === true, 'logwin 打开光波采样悬浮窗不被 280ms 合成 click 秒关');
    if (win.document.getElementById('ar6-logwin')) {
      const badRadio = win.document.querySelector('#ar6-logwin input[value="bad"]');
      if (badRadio) await mobileTouchTap(win, () => badRadio, { directTarget: true });
      check(api.LOGW.filter === 'bad' && !!win.document.querySelector('#ar6-logwin .ar6-lwfr.on'),
        'logwin 筛选切换为可疑并带 .ar6-lwfr.on 高亮类');
    }

    await mobileTouchTap(win, () => findAr6Btn(win, 'exportlog', true));
    check(win.document.lastCopiedText.length > 10, '局域网 HTTP 环境 exportlog 走 textarea+execCommand 成功复制');
    win.document.lastCopiedText = '';
    await mobileTouchTap(win, () => findAr6Btn(win, 'diagcopy', true));
    check(win.document.lastCopiedText.includes('版本 5.81'), '局域网 HTTP 环境 diagcopy 同步落剪贴板');

    await mobileTouchTap(win, () => findAr6Btn(win, 'diagcheck', true));
    const bnAfterDiag = win.document.getElementById('ar6-bn2');
    check(!!bnAfterDiag && bnAfterDiag.textContent.includes('115/115'), 'diagcheck 执行全量 115 项自检并弹横幅', `got=${bnAfterDiag && bnAfterDiag.textContent}`);

    // rebuild 双击确认
    await mobileTouchTap(win, () => findAr6Btn(win, 'rebuild', true));
    await mobileTouchTap(win, () => findAr6Btn(win, 'rebuild', true));

    // clear 双击焚毁卷宗（同步刷新打开中的 #ar6-logwin）
    await mobileTouchTap(win, () => findAr6Btn(win, 'clear', true));
    check(api.readLog().length === 1, 'clear 首次点击进入 4 秒红灯确认态，不提前清空');
    await mobileTouchTap(win, () => findAr6Btn(win, 'clear', true));
    check(api.readLog().length === 0, 'clear 二次点击清空日志');
    if (win.document.getElementById('ar6-logwin')) {
      check(win.document.getElementById('ar6-logwin').textContent.includes('还没有记录'),
        'clear 实时刷新已打开的 #ar6-logwin');
      await mobileTouchTap(win, () => win.document.querySelector('#ar6-logwin [data-ar6="lwclose"]'));
      check(!win.document.getElementById('ar6-logwin') && api.LOGW.open === false, 'lwclose 关闭采样悬浮窗');
    }

    // =========================================================================
    // 第 2 栏：形态破甲 (jail / trunc / pvp) 全按键真触控测试
    // =========================================================================
    await mobileTouchTap(win, () => win.document.querySelector('[data-ar6="nav"][data-ar6-nav="jail"]'));

    // 2.1 抗截断（能量续航）全键开合与零回弹验证
    await mobileTouchTap(win, () => findAr6Btn(win, 'gm:trunc:0', true));
    check(api.getCfg().trunc === 'off', 'gm:trunc:0 关闭抗截断不回弹', `got ${api.getCfg().trunc}`);
    const tailBtnWhenOff = findAr6Btn(win, '🔚 收尾契约:');
    check(!!tailBtnWhenOff && tailBtnWhenOff.getAttribute('data-off') === '1' && tailBtnWhenOff.textContent.includes('随主闸待机'),
      '抗截断关闭时收尾契约呈现 data-off=1 与随主闸待机');

    // gm:trunc:1 续航叮嘱 + 二次点击关闭
    await mobileTouchTap(win, () => findAr6Btn(win, 'gm:trunc:1', true));
    check(api.getCfg().trunc === 'light', 'gm:trunc:1 开启续航叮嘱不回弹', `got ${api.getCfg().trunc}`);
    await mobileTouchTap(win, () => findAr6Btn(win, 'gm:trunc:1', true));
    check(api.getCfg().trunc === 'off', 'gm:trunc:1 二次点击切回 off 不回弹', `got ${api.getCfg().trunc}`);

    // gm:trunc:2 自动接力 + 二次点击关闭 + 再开回 medium 测子项
    await mobileTouchTap(win, () => findAr6Btn(win, 'gm:trunc:2', true));
    check(api.getCfg().trunc === 'medium', 'gm:trunc:2 开启自动接力不回弹', `got ${api.getCfg().trunc}`);
    await mobileTouchTap(win, () => findAr6Btn(win, 'gm:trunc:2', true));
    check(api.getCfg().trunc === 'off', 'gm:trunc:2 二次点击切回 off 不回弹', `got ${api.getCfg().trunc}`);
    await mobileTouchTap(win, () => findAr6Btn(win, 'gm:trunc:2', true));
    check(api.getCfg().trunc === 'medium', 'gm:trunc:2 重新开启为 medium');

    // 🔚 收尾契约（开 -> 关 -> 开）
    check(api.getCfg().truncTail === true, '收尾契约初始为开');
    await mobileTouchTap(win, () => findAr6Btn(win, '🔚 收尾契约:'));
    check(api.getCfg().truncTail === false, '🔚 收尾契约 开->关 绝不回弹', `got ${api.getCfg().truncTail}`);
    await mobileTouchTap(win, () => findAr6Btn(win, '🔚 收尾契约:'));
    check(api.getCfg().truncTail === true, '🔚 收尾契约 关->开 绝不回弹', `got ${api.getCfg().truncTail}`);

    // 🚫 反自我认证（开 -> 关 -> 开）
    check(api.getCfg().truncNoCert === true, '反自我认证初始为开');
    await mobileTouchTap(win, () => findAr6Btn(win, '🚫 反自我认证:'));
    check(api.getCfg().truncNoCert === false, '🚫 反自我认证 开->关 绝不回弹', `got ${api.getCfg().truncNoCert}`);
    await mobileTouchTap(win, () => findAr6Btn(win, '🚫 反自我认证:'));
    check(api.getCfg().truncNoCert === true, '🚫 反自我认证 关->开 绝不回弹', `got ${api.getCfg().truncNoCert}`);

    // 🔔 补前先问（开 -> 关 -> 开）
    check(api.getCfg().jailConfirm === true, '补前先问初始为开');
    await mobileTouchTap(win, () => findAr6Btn(win, '🔔 补前先问:'));
    check(api.getCfg().jailConfirm === false, '🔔 补前先问 开->关 绝不回弹', `got ${api.getCfg().jailConfirm}`);
    await mobileTouchTap(win, () => findAr6Btn(win, '🔔 补前先问:'));
    check(api.getCfg().jailConfirm === true, '🔔 补前先问 关->开 绝不回弹', `got ${api.getCfg().jailConfirm}`);

    // 📑 单节折叠（关 -> 开 -> 关）
    check(api.getCfg().singleSec === false, '单节折叠初始为关');
    await mobileTouchTap(win, () => findAr6Btn(win, '📑 单节折叠:'));
    check(api.getCfg().singleSec === true, '📑 单节折叠 关->开 绝不回弹', `got ${api.getCfg().singleSec}`);
    await mobileTouchTap(win, () => findAr6Btn(win, '📑 单节折叠:'));
    check(api.getCfg().singleSec === false, '📑 单节折叠 开->关 绝不回弹', `got ${api.getCfg().singleSec}`);

    // 🧰 工具通道（点开弹确认框且未提前写 'on' -> 点 tool-off 退回保持 'off' -> 再点开点 tool-on 开启为 'on' -> 再点主按钮关闭为 'off'）
    check(api.getCfg().toolChan === 'off', '工具通道初始 off');
    await mobileTouchTap(win, () => findAr6Btn(win, '🧰 工具通道:'));
    const savedMidTool = JSON.parse(win.localStorage.getItem('ar6.cfg') || '{}');
    check(api.getCfg().toolChan === 'off' && savedMidTool.toolChan !== 'on' && !!findAr6Btn(win, 'tool-on', true),
      '点 🧰 工具通道:关 仅展开确认框，绝不提前把 toolChan=on 写内存或落盘',
      `mem=${api.getCfg().toolChan}, ls=${savedMidTool.toolChan}`);

    await mobileTouchTap(win, () => findAr6Btn(win, 'tool-off', true));
    check(api.getCfg().toolChan === 'off' && !findAr6Btn(win, 'tool-on', true),
      '点 tool-off 退回常规信道后保持 off 且收起确认框，无位移幽灵误触');

    await mobileTouchTap(win, () => findAr6Btn(win, '🧰 工具通道:'));
    await mobileTouchTap(win, () => findAr6Btn(win, 'tool-on', true));
    check(api.getCfg().toolChan === 'on' && JSON.parse(win.localStorage.getItem('ar6.cfg')).toolChan === 'on',
      '点 tool-on 正式开启武装货舱并持久化为 on');

    await mobileTouchTap(win, () => findAr6Btn(win, '🧰 工具通道:'));
    check(api.getCfg().toolChan === 'off' && JSON.parse(win.localStorage.getItem('ar6.cfg')).toolChan === 'off',
      '已开启态再点 🧰 工具通道:开 直接关闭为 off 且绝不回弹', `got ${api.getCfg().toolChan}`);

    // 2.2 7 档破甲形态切换（含强力/闪耀/诺亚/深渊弹窗取消与确认 + 遮罩点击不穿透）
    await mobileTouchTap(win, () => findAr6Btn(win, 'tier:safe', true));
    check(api.getCfg().jail === 'safe', 'tier:safe 空中型直切');
    await mobileTouchTap(win, () => findAr6Btn(win, 'tier:mid', true));
    check(api.getCfg().jail === 'mid', 'tier:mid 复合型直切');

    // 强力型：点开不闪退 -> 点取消保持 mid -> 再点开点确认切 strong
    await mobileTouchTap(win, () => findAr6Btn(win, 'tier:strong', true), { synthHitCardBtn: true });
    check(!!win.document.getElementById('ar6-card') && api.getCfg().jail === 'mid',
      'tier:strong 打开仪式弹窗不被 280ms 合成 click 秒关或误点确认', `hasCard=${!!win.document.getElementById('ar6-card')}, jail=${api.getCfg().jail}`);
    if (win.document.getElementById('ar6-card')) {
      await mobileTouchTap(win, () => win.document.querySelector('#ar6-card [data-ar6-card="superno"]'));
      check(!win.document.getElementById('ar6-card') && api.getCfg().jail === 'mid' && !api.isMinimized(),
        '强力型点收敛锋芒取消后保持 mid 且主面板不误关');
    }
    await mobileTouchTap(win, () => findAr6Btn(win, 'tier:strong', true));
    if (win.document.getElementById('ar6-card')) {
      await mobileTouchTap(win, () => win.document.querySelector('#ar6-card [data-ar6-card="superok"]'));
    }
    check(api.getCfg().jail === 'strong' && !!win.document.getElementById('ar6-fx'),
      '强力型确认开启并触发屏幕觉醒光流 #ar6-fx', `jail=${api.getCfg().jail}`);

    // 闪耀型：取消 + 确认
    await mobileTouchTap(win, () => findAr6Btn(win, 'tier:supreme', true));
    check(!!win.document.getElementById('ar6-card') && api.getCfg().jail === 'strong',
      'tier:supreme 仪式弹窗稳定打开', `hasCard=${!!win.document.getElementById('ar6-card')}`);
    if (win.document.getElementById('ar6-card')) {
      const cfgSnapMask = JSON.stringify(api.getCfg());
      await mobileTouchTap(win, () => win.document.querySelector('#ar6-card'), { directTarget: true });
      check(!win.document.getElementById('ar6-card') && api.getCfg().jail === 'strong' && !api.isMinimized() && JSON.stringify(api.getCfg()) === cfgSnapMask,
        '点闪耀型弹窗黑底遮罩安全关闭弹窗，不误关主面板且不穿透篡改底下按钮');
    }
    await mobileTouchTap(win, () => findAr6Btn(win, 'tier:supreme', true));
    if (win.document.getElementById('ar6-card')) {
      await mobileTouchTap(win, () => win.document.querySelector('#ar6-card [data-ar6-card="supremeok"]'));
    }
    check(api.getCfg().jail === 'supreme' && api.getCfg().jailSupremeConfirmed === true,
      '闪耀型确认加冕生效', `jail=${api.getCfg().jail}`);

    // 诺亚：取消 + 确认
    await mobileTouchTap(win, () => findAr6Btn(win, 'tier:gatanothor', true));
    check(!!win.document.getElementById('ar6-card'), 'tier:gatanothor 诺亚仪式弹窗稳定打开');
    if (win.document.getElementById('ar6-card')) {
      await mobileTouchTap(win, () => win.document.querySelector('#ar6-card [data-ar6-card="ultno"]'));
      check(api.getCfg().jail === 'supreme', '诺亚点退回凡世之光保持原形态');
    }
    await mobileTouchTap(win, () => findAr6Btn(win, 'tier:gatanothor', true));
    if (win.document.getElementById('ar6-card')) {
      await mobileTouchTap(win, () => win.document.querySelector('#ar6-card [data-ar6-card="ultok"]'));
    }
    check(api.getCfg().jail === 'gatanothor' && win.document.getElementById('ar6-root').getAttribute('data-tier') === 'noa',
      '诺亚确认降临并同步顶栏 data-tier=noa', `jail=${api.getCfg().jail}`);

    // 凝视深渊：取消 + 确认 -> 回石像待机
    await mobileTouchTap(win, () => findAr6Btn(win, 'tier:abyss', true));
    if (win.document.getElementById('ar6-card')) {
      await mobileTouchTap(win, () => win.document.querySelector('#ar6-card [data-ar6-card="ultno"]'));
      check(api.getCfg().jail === 'gatanothor', '深渊取消退回保持诺亚');
    }
    await mobileTouchTap(win, () => findAr6Btn(win, 'tier:abyss', true));
    if (win.document.getElementById('ar6-card')) {
      await mobileTouchTap(win, () => win.document.querySelector('#ar6-card [data-ar6-card="ultok"]'));
    }
    check(api.getCfg().jail === 'abyss' && win.document.getElementById('ar6-root').getAttribute('data-tier') === 'abyss',
      '凝视深渊确认开启并同步顶栏 data-tier=abyss', `jail=${api.getCfg().jail}`);
    await mobileTouchTap(win, () => findAr6Btn(win, 'tier:off', true));
    check(api.getCfg().jail === 'off', 'tier:off 切回石像待机');

    // 2.3 飞燕编队 gm:grab & 503重试 & 自动 PVP & 暂停重发 & 空回也补 & 看门狗 & pvpdlg 手机端禁自动 focus
    await mobileTouchTap(win, () => findAr6Btn(win, 'gm:grab:2', true));
    check(api.getCfg().grab === 2, 'gm:grab:2 切换双机齐射');
    await mobileTouchTap(win, () => findAr6Btn(win, 'gm:grab:0', true));
    check(api.getCfg().grab === 0, 'gm:grab:0 切回编队待命');

    await mobileTouchTap(win, () => findAr6Btn(win, '🔁 503重试:'));
    check(api.getCfg().retry503 === 'off', '🔁 503重试 开->关 不回弹');
    await mobileTouchTap(win, () => findAr6Btn(win, '🔁 503重试:'));
    check(api.getCfg().retry503 === 'on', '🔁 503重试 关->开 不回弹');

    await mobileTouchTap(win, () => findAr6Btn(win, '♻️ 自动 PVP:'));
    check(api.getCfg().pvp === 'on', '♻️ 自动 PVP 关->开 不回弹');

    await mobileTouchTap(win, () => findAr6Btn(win, 'gm:pvpmax:2', true));
    check(api.getCfg().pvpMax === 3, 'gm:pvpmax:2 设重抽上限 3 次');

    // 重点：⏸ 暂停重发 <-> ⏸ 已暂停 变名按钮绝不回弹！
    await mobileTouchTap(win, () => findAr6Btn(win, '⏸ 暂停重发') || findAr6Btn(win, '⏸ 已暂停'));
    check(api.getCfg().pvpPause === true, '⏸ 暂停重发 -> ⏸ 已暂停 绝不回弹', `pvpPause=${api.getCfg().pvpPause}`);
    await mobileTouchTap(win, () => findAr6Btn(win, '⏸ 已暂停') || findAr6Btn(win, '⏸ 暂停重发'));
    check(api.getCfg().pvpPause === false, '⏸ 已暂停 -> ⏸ 暂停重发 绝不回弹', `pvpPause=${api.getCfg().pvpPause}`);

    await mobileTouchTap(win, () => findAr6Btn(win, '♻️ 空回也补:'));
    check(api.getCfg().pvpEmpty === false, '♻️ 空回也补 开->关 不回弹');
    await mobileTouchTap(win, () => findAr6Btn(win, '♻️ 空回也补:'));
    check(api.getCfg().pvpEmpty === true, '♻️ 空回也补 关->开 不回弹');

    await mobileTouchTap(win, () => findAr6Btn(win, '⏱ 首字看门狗:'));
    check(api.getCfg().pvpWatch === true, '⏱ 首字看门狗 关->开 不回弹');
    await mobileTouchTap(win, () => findAr6Btn(win, '⏱ 首字看门狗:'));
    check(api.getCfg().pvpWatch === false, '⏱ 首字看门狗 开->关 不回弹');

    // pvpdlg：验证手机端打开绝不自动 focus 数字框，内部 manual/auto/save 有效
    win.document.activeElement = win.document.body;
    await mobileTouchTap(win, () => findAr6Btn(win, 'pvpdlg', true));
    const pvpModal = win.document.getElementById('ar6-pvdbg');
    check(!!pvpModal, 'pvpdlg 打开自动 PVP 罗盘弹窗且不被 280ms 合成 click 误触关闭');
    const activeTagAfterPvpOpen = win.document.activeElement && win.document.activeElement.getAttribute
      ? win.document.activeElement.getAttribute('data-pvpk')
      : null;
    check(!activeTagAfterPvpOpen, '手机端打开 pvpdlg 绝不自动 focus 输入框弹软键盘', `active pvpk=${activeTagAfterPvpOpen}`);

    if (win.document.getElementById('ar6-pvdbg')) {
      await mobileTouchTap(win, () => win.document.querySelector('#ar6-pvdbg [data-pvpact="manual"]'));
      check(api.getCfg().pvpAuto === false, 'pvpdlg 点手动模式生效');
      await mobileTouchTap(win, () => win.document.querySelector('#ar6-pvdbg [data-pvpact="auto"]'));
      check(api.getCfg().pvpAuto === true, 'pvpdlg 点自动重发模式生效');
      await mobileTouchTap(win, () => win.document.querySelector('#ar6-pvdbg [data-pvpact="save"]'));
      check(!win.document.getElementById('ar6-pvdbg') && !api.isMinimized(), 'pvpdlg 点保存关闭弹窗且主面板保持打开');
    }

    // 单次手动战技：jailnow / truncnow / pvpnow（含末条为 user 消息时原位重发）
    stState.chat = [
      { is_user: true, name: 'User', send_date: '2026-11-23T10:05:00Z', mes: '继续推演剧情' },
    ];
    api.resetJL();
    api.resetPVP();
    const genBefore = stState.generateCalls;
    await mobileTouchTap(win, () => findAr6Btn(win, 'pvpnow', true));
    check(stState.generateCalls === genBefore + 1, '末条为 user 消息时点 pvpnow 原位调用 Generate 重发');

    stState.chat.push({ is_user: false, name: 'Char', send_date: '2026-11-23T10:06:00Z', mes: '她推开沉重的木门，风雪扑面而来，' });
    api.resetJL();
    await mobileTouchTap(win, () => findAr6Btn(win, 'jailnow', true));
    if (win.document.getElementById('ar6-card')) {
      await mobileTouchTap(win, () => win.document.querySelector('#ar6-card [data-ar6-card="jailno"]'));
    }
    api.resetRS();
    await mobileTouchTap(win, () => findAr6Btn(win, 'truncnow', true));
    await mobileTouchTap(win, () => findAr6Btn(win, '♻️ 自动 PVP:'));
    check(api.getCfg().pvp === 'off', '关闭自动 PVP');

    // 2.4 作战波段「保存并锁定方案」+ localStorage & saveSettingsDebounced 持久化（稍后跨实例重载校验）
    await mobileTouchTap(win, () => findAr6Btn(win, 'model:4h', true));
    check(api.getCfg().modelProfile === '4h', '切换 model:4h 波段');
    await mobileTouchTap(win, () => findAr6Btn(win, 'model:4a', true));
    check(api.getCfg().modelProfile === '4a', '切换 model:4a 波段');
    const saveBtnBefore = findAr6Btn(win, 'model-save', true);
    check(!!saveBtnBefore && saveBtnBefore.textContent.includes('保存并锁定'), '未锁定时 model-save 显示保存并锁定提示');

    const debouncedBefore = stState.saveSettingsCalls;
    await mobileTouchTap(win, () => findAr6Btn(win, 'model-save', true));
    const saveBtnAfter = findAr6Btn(win, 'model-save', true);
    const lsCfgAfterModelSave = JSON.parse(win.localStorage.getItem('ar6.cfg') || '{}');
    check(
      lsCfgAfterModelSave.modelProfile === '4a' &&
      stState.extensionSettings['ar6.cfg'] &&
      stState.extensionSettings['ar6.cfg'].modelProfile === '4a' &&
      stState.saveSettingsCalls > debouncedBefore &&
      !!saveBtnAfter && saveBtnAfter.textContent.includes('方案已保存'),
      '点击 model-save 后 modelProfile=4a 同步写入 localStorage + extensionSettings 并触发 saveSettingsDebounced，按钮切换已保存锁定态'
    );

    // =========================================================================
    // 第 3 栏：叙事结界 (ooc / know / charm / desens) 全按键真触控测试
    // =========================================================================
    await mobileTouchTap(win, () => win.document.querySelector('[data-ar6="nav"][data-ar6-nav="ooc"]'));

    // 3.1 gm:know（点绝对结界弹确认框，点内部按钮绝不误关主面板）
    await mobileTouchTap(win, () => findAr6Btn(win, 'gm:know:1', true));
    check(api.getCfg().know === 'lite', 'gm:know:1 仅知在场事');
    await mobileTouchTap(win, () => findAr6Btn(win, 'gm:know:2', true));
    check(api.getCfg().know === 'mid', 'gm:know:2 禁跨场推理');
    await mobileTouchTap(win, () => findAr6Btn(win, 'gm:know:3', true));
    check(!!win.document.getElementById('ar6-card') && api.getCfg().know === 'mid' && !api.isMinimized(),
      'gm:know:3 弹出绝对结界确认框且不被 280ms 合成 click 秒关');
    if (win.document.getElementById('ar6-card')) {
      await mobileTouchTap(win, () => win.document.querySelector('#ar6-card [data-ar6-card="knowno"]'));
      check(!win.document.getElementById('ar6-card') && api.getCfg().know === 'mid' && !api.isMinimized(),
        '绝对结界确认框点暂不开启后保持 mid 且绝不误关主面板');
    }

    await mobileTouchTap(win, () => findAr6Btn(win, 'gm:know:3', true));
    if (win.document.getElementById('ar6-card')) {
      const noTipChk = win.document.querySelector('#ar6-card [data-ar6-chk="1"]');
      if (noTipChk) await mobileTouchTap(win, () => noTipChk, { directTarget: true });
      await mobileTouchTap(win, () => win.document.querySelector('#ar6-card [data-ar6-card="knowok"]'));
    }
    check(api.getCfg().know === 'full' && api.getCfg().knowTip === 'off' && !api.isMinimized(),
      '绝对结界勾选不再提醒并点知道了开启，成功设为 full 且主面板保持打开', `know=${api.getCfg().know}`);
    await mobileTouchTap(win, () => findAr6Btn(win, 'gm:know:0', true));
    check(api.getCfg().know === 'off', 'gm:know:0 关闭迷雾结界');

    // 3.2 gm:charm + V5.7 双子开关（📦 贴脸包裹 & ☠️ 致命后果）零回弹与联动校验
    await mobileTouchTap(win, () => findAr6Btn(win, 'gm:charm:1', true));
    check(api.getCfg().charm === 'lite' && api.narrCharmWrapOn() === false, 'gm:charm:1 角色独立作息（auto 默认不自动开贴脸包裹）');
    await mobileTouchTap(win, () => findAr6Btn(win, 'gm:charm:2', true));
    check(api.getCfg().charm === 'mid' && api.narrCharmWrapOn() === true, 'gm:charm:2 允许干脆拒绝自动联动开启贴脸包裹');
    await mobileTouchTap(win, () => findAr6Btn(win, 'charm-wrap', true));
    check(api.getCfg().charmWrap === 'off' && api.narrCharmWrapOn() === false, '📦 贴脸包裹 中档联动开->关 不回弹');
    await mobileTouchTap(win, () => findAr6Btn(win, 'charm-wrap', true));
    check(api.getCfg().charmWrap === 'on' && api.narrCharmWrapOn() === true, '📦 贴脸包裹 关->开 不回弹');
    await mobileTouchTap(win, () => findAr6Btn(win, 'charm-lethal', true));
    check(api.getCfg().charmLethal === true && api.narrCharmLethalOn() === true, '☠️ 致命后果 关->开 不回弹');
    await mobileTouchTap(win, () => findAr6Btn(win, 'charm-lethal', true));
    check(api.getCfg().charmLethal === false && api.narrCharmLethalOn() === false, '☠️ 致命后果 开->关 不回弹');
    await mobileTouchTap(win, () => findAr6Btn(win, 'gm:charm:3', true));
    check(api.getCfg().charm === 'full' && api.narrCharmWrapOn() === true, 'gm:charm:3 世界自主运转');
    await mobileTouchTap(win, () => findAr6Btn(win, 'gm:charm:0', true));
    check(api.getCfg().charm === 'off' && api.narrCharmWrapOn() === false && api.narrCharmLethalOn() === false, 'gm:charm:0 关闭真实引力并同步待机子开关');

    // 3.3 反 OOC 总闸（带预设冲突弹窗）+ 4 子项（含 :听预设 切换不回弹）
    stState.presetPrompts = [
      { name: 'Anti-OOC Rule', enabled: true, content: '严禁OOC，角色出场必须严格核对世界书人设，禁止套路化霸总台词。' },
    ];
    await mobileTouchTap(win, () => findAr6Btn(win, '🎭 反OOC:'));
    check(api.getCfg().ooc === 'on', '🎭 反OOC 总闸开启');
    if (win.document.getElementById('ar6-card')) {
      await mobileTouchTap(win, () => win.document.querySelector('#ar6-card [data-ar6-card="preset"]'));
      check(!win.document.getElementById('ar6-card') && !api.isMinimized(),
        '反 OOC 冲突弹窗点保留预设规则不误关主面板');
    } else {
      // 若预设签名未命中则手动置 roll 为 preset 以实测 :听预设 变名按钮触控不回弹
      api.oocSetChoice('roll', 'preset');
      api.render();
    }
    if (api.oocChoice('roll') !== 'preset') {
      api.oocSetChoice('roll', 'preset');
      api.render();
    }
    const presetRollBtn = findAr6Btn(win, '🧩 点名:听预设', true);
    check(!!presetRollBtn, '反 OOC 子项渲染 🧩 点名:听预设 状态');
    await mobileTouchTap(win, () => findAr6Btn(win, '🧩 点名:'));
    check(api.oocChoice('roll') === 'script' && api.getCfg().oocRoll === true,
      '点按 🧩 点名:听预设 切回脚本规则为开，280ms 合成 click 绝不将其弹回关',
      `choice=${api.oocChoice('roll')}, oocRoll=${api.getCfg().oocRoll}`);

    // 4 子项逐一开关验证
    for (const [prefix, key] of [
      ['🧩 点名:', 'oocRoll'],
      ['🚫 反模板:', 'oocTpl'],
      ['🔒 变更门槛:', 'oocChg'],
      ['🗣 口吻一致:', 'oocVoice'],
    ]) {
      const initVal = !!api.getCfg()[key];
      await mobileTouchTap(win, () => findAr6Btn(win, prefix));
      check(!!api.getCfg()[key] === !initVal, `${prefix} 第一次切换不回弹`);
      await mobileTouchTap(win, () => findAr6Btn(win, prefix));
      check(!!api.getCfg()[key] === initVal, `${prefix} 第二次切换不回弹`);
    }
    stState.presetPrompts = [];
    await mobileTouchTap(win, () => findAr6Btn(win, '🎭 反OOC:'));
    check(api.getCfg().ooc === 'off', '🎭 反OOC 总闸关闭不回弹');

    // 3.4 设定脱敏 & 还原正文
    await mobileTouchTap(win, () => findAr6Btn(win, '设定脱敏:'));
    check(api.getCfg().desens === 'off', '设定脱敏 开->关 不回弹');
    await mobileTouchTap(win, () => findAr6Btn(win, '设定脱敏:'));
    check(api.getCfg().desens === 'a', '设定脱敏 关->开 不回弹');

    await mobileTouchTap(win, () => findAr6Btn(win, '还原正文:'));
    check(api.getCfg().desensUnmask === false, '还原正文 开->关 不回弹');
    await mobileTouchTap(win, () => findAr6Btn(win, '还原正文:'));
    check(api.getCfg().desensUnmask === true, '还原正文 关->开 不回弹');

    // =========================================================================
    // 第 4 栏：防卫设置 (upd / scope / pill / pet / safe / help) 全按键真触控测试
    // =========================================================================
    await mobileTouchTap(win, () => win.document.querySelector('[data-ar6="nav"][data-ar6-nav="scope"]'));

    // 4.0 V5.5 光之星轨 · 云端自动更新（单开关默认开 + 防 280ms 回弹 + 手动检查按键就绪）
    check(api.getCfg().updAuto === true && api.updAutoOn() === true, 'V5.5 星轨共鸣后台自动更新默认开启');
    check(!!findAr6Btn(win, 'upd-check', true) && win.document.getElementById('ar6-root').textContent.includes('星轨巡检 · 手动检查更新'),
      '防卫设置顶部挂载「光之星轨 · 云端自动更新」与手动检查更新按键');
    await mobileTouchTap(win, () => findAr6Btn(win, 'upd-auto', true));
    check(api.getCfg().updAuto === false && api.updAutoOn() === false, 'upd-auto 开->关 不回弹');
    await mobileTouchTap(win, () => findAr6Btn(win, 'upd-auto', true));
    check(api.getCfg().updAuto === true && api.updAutoOn() === true, 'upd-auto 关->开 不回弹');

    // 4.1 scope:all/skip/only + savescope + 只查 Gemini + 只算正文
    await mobileTouchTap(win, () => findAr6Btn(win, 'scope:only', true));
    check(api.getCfg().scope === 'only', 'scope:only 切换仅扫关键词');
    const scopeInp = win.document.querySelector('input[data-ar6="scope"]');
    scopeInp.value = 'gemini-4,claude';
    scopeInp.dispatchEvent({ type: 'input', bubbles: true });
    await mobileTouchTap(win, () => findAr6Btn(win, 'savescope', true));
    check(api.getCfg().scopeList === 'gemini-4,claude', 'savescope 保存关键词列表');

    // 验证 onlyGemini=true 时 scope:only 交集过滤真实生效
    const evOnlyOut = api.newEvidence('gemini-2.5-flash', 200, 'sse');
    evOnlyOut.sawText = true;
    check(api.verdictOf(evOnlyOut).code === 'skip', 'onlyGemini 开启下 scope:only 对非匹配关键词模型返回 skip');

    await mobileTouchTap(win, () => findAr6Btn(win, 'scope:all', true));
    check(api.getCfg().scope === 'all', 'scope:all 切回全部模型');

    await mobileTouchTap(win, () => findAr6Btn(win, '🟦 只查 Gemini:'));
    check(api.getCfg().onlyGemini === false, '🟦 只查 Gemini 开->关 不回弹');
    await mobileTouchTap(win, () => findAr6Btn(win, '🟦 只查 Gemini:'));
    check(api.getCfg().onlyGemini === true, '🟦 只查 Gemini 关->开 不回弹');

    await mobileTouchTap(win, () => findAr6Btn(win, '📄 只算正文:'));
    check(api.getCfg().contentOnly === 'off', '📄 只算正文 开->关 不回弹');
    await mobileTouchTap(win, () => findAr6Btn(win, '📄 只算正文:'));
    check(api.getCfg().contentOnly === 'on', '📄 只算正文 关->开 不回弹');

    await mobileTouchTap(win, () => findAr6Btn(win, 'preset-compat', true));
    check(api.getCfg().presetCompat === 'off', '⚔️ 预设适配 强权优先->礼让预设 不回弹');
    await mobileTouchTap(win, () => findAr6Btn(win, 'preset-compat', true));
    check(api.getCfg().presetCompat === 'on', '⚔️ 预设适配 礼让预设->强权优先 不回弹');

    // 4.2 pill-toggle / cardauto-toggle / pill-reset / 迪迦桌宠双击立绘开面板 & 关桌宠防失联
    await mobileTouchTap(win, () => findAr6Btn(win, 'cardauto-toggle', true));
    check(api.getCfg().cardAuto === true, 'cardauto-toggle 关->开 不回弹');
    await mobileTouchTap(win, () => findAr6Btn(win, 'cardauto-toggle', true));
    check(api.getCfg().cardAuto === false, 'cardauto-toggle 开->关 不回弹');

    await mobileTouchTap(win, () => findAr6Btn(win, 'pill-toggle', true));
    check(api.getCfg().pillHide === true, '具备备用入口时 pill-toggle 隐藏圆章生效');
    await mobileTouchTap(win, () => findAr6Btn(win, 'pill-reset', true));
    check(api.getCfg().pillHide === false && api.getCfg().pillSide === 'right', 'pill-reset 复位并重新显示圆章');

    // 召唤 3D CG 雕像迪迦 + 神光棒点击弹翼 + 诺亚/深渊形态联动 + 音效开关 + 子设置 + 双击立绘打开主面板
    await mobileTouchTap(win, () => findAr6Btn(win, 'pet-show', true));
    const sparkOv = win.document.getElementById('ar6-spark');
    check(!!sparkOv && sparkOv.getAttribute('data-ar6-spark') === 'waiting', 'V5.6 召唤 3D 迪迦弹出屏幕中央可点击 3D 神光棒浮层');
    if (sparkOv) {
      await mobileTouchTap(win, () => sparkOv.querySelector('[data-ar6-sp="fire"]'), { directTarget: true });
      check(sparkOv.getAttribute('data-ar6-spark') === 'firing', '点击 3D 神光棒触发双翼弹开与变身序列');
      api.closeSparklence(true);
      check(!win.document.getElementById('ar6-spark'), 'closeSparklence 彻底清理神光棒浮层并呈现边缘 3D 迪迦');
    }
    const avatarEl = win.document.getElementById('ar6-avatar');
    check(!!avatarEl && api.petIsExpanded() === true, 'pet-show 召唤 3D CG 雕像迪迦桌宠');

    // 验证诺亚动态圣翼与凝视深渊黑曜红形态实时联动
    const prevJailPet = api.getCfg().jail;
    api.setCfg('jail', 'gatanothor');
    api.avatarSyncForm(false);
    check(win.document.getElementById('ar6-avatar').getAttribute('data-form') === 'noa', '切换诺亚形态同步触发 3D 桌宠 data-form="noa"（展开动态圣翼）');
    api.setCfg('jail', 'abyss');
    api.avatarSyncForm(false);
    check(win.document.getElementById('ar6-avatar').getAttribute('data-form') === 'abyss', '切换凝视深渊形态同步触发 3D 桌宠 data-form="abyss"（黑曜血红）');
    api.setCfg('jail', prevJailPet);
    api.avatarSyncForm(false);

    // 验证纯代码特摄音效开关与预设切换
    await mobileTouchTap(win, () => findAr6Btn(win, 'pet-sfx', true));
    await mobileTouchTap(win, () => findAr6Btn(win, 'pet-sfx-glitter', true));
    check(JSON.parse(win.localStorage.getItem('ar6-pet-v2')).sfx === true && JSON.parse(win.localStorage.getItem('ar6-pet-v2')).sfxPreset === 'glitter',
      'V5.6 0KB 纯合成特摄音效开关与「闪耀圣域」预设落盘成功');
    await mobileTouchTap(win, () => findAr6Btn(win, 'pet-sfx', true));

    await mobileTouchTap(win, () => findAr6Btn(win, 'pet-voice', true));
    await mobileTouchTap(win, () => findAr6Btn(win, 'pet-auto', true));
    await mobileTouchTap(win, () => findAr6Btn(win, 'gm:motion:0', true));
    await mobileTouchTap(win, () => findAr6Btn(win, 'gm:opacity:1', true));
    await mobileTouchTap(win, () => findAr6Btn(win, 'gm:size:2', true));

    // 收起主面板，模拟手机端在桌宠 .face 上连续两次触控轻点（双击打开主面板，且合成 click 不误触面板按钮）
    await mobileTouchTap(win, () => win.document.querySelector('#ar6-root [data-ar6="min"]'));
    check(api.isMinimized() === true, '点顶栏 ✕ 收起主面板');
    const liveAvatar = win.document.getElementById('ar6-avatar');
    const faceBtn = liveAvatar && liveAvatar.shadowRoot && liveAvatar.shadowRoot.querySelector('.face');
    check(!!faceBtn, '桌宠 ShadowDOM .face 触控层存在');
    if (faceBtn) {
      faceBtn.dispatchEvent({ type: 'pointerdown', bubbles: true, cancelable: true, pointerId: 2, button: 0, clientX: 280, clientY: 600 });
      faceBtn.dispatchEvent({ type: 'pointerup', bubbles: true, cancelable: true, pointerId: 2, button: 0, clientX: 280, clientY: 600 });
      await sleep(90);
      faceBtn.dispatchEvent({ type: 'pointerdown', bubbles: true, cancelable: true, pointerId: 3, button: 0, clientX: 280, clientY: 600 });
      faceBtn.dispatchEvent({ type: 'pointerup', bubbles: true, cancelable: true, pointerId: 3, button: 0, clientX: 280, clientY: 600 });
      await sleep(280);
      // 派发合成 click 到刚弹出的主面板同坐标按钮上，验证不被误触
      const exposedPanelBtn = win.document.querySelector('#ar6-root .ar6-body [data-ar6]');
      if (exposedPanelBtn) {
        pickInnerTouchChild(exposedPanelBtn).dispatchEvent({
          type: 'click', bubbles: true, cancelable: true, detail: 1, clientX: 280, clientY: 600,
        });
      }
    }
    check(api.isMinimized() === false, '手机端双击迪迦桌宠立绘成功唤起主面板且不被合成 click 误触');
    if (api.isMinimized()) api.openPanel();

    // 测试无魔法棒/无脚本栏时隐藏圆章后再关桌宠自动恢复圆章防失联
    await mobileTouchTap(win, () => win.document.querySelector('[data-ar6="nav"][data-ar6-nav="scope"]'));
    if (!isTT) {
      const wItem = win.document.getElementById('ar6-wand');
      if (wItem) wItem.remove();
      await mobileTouchTap(win, () => findAr6Btn(win, 'pill-toggle', true));
      check(api.getCfg().pillHide === true, '桌宠展开作为备用入口时允许隐藏圆章');
      await mobileTouchTap(win, () => findAr6Btn(win, 'pet-show', true));
      check(api.petIsExpanded() === false && api.getCfg().pillHide === false,
        '无其它入口时关闭桌宠自动恢复侧边圆章 pillHide=false 防止失联');
    } else {
      await mobileTouchTap(win, () => findAr6Btn(win, 'pet-show', true));
      check(api.petIsExpanded() === false, 'TT 端关闭桌宠生效');
    }

    // 4.3 安全模式 🩺 安全:关 <-> 🩺 安全:开
    await mobileTouchTap(win, () => findAr6Btn(win, '🩺 安全:'));
    check(api.getCfg().safe === true && api.isHooked() === false, '开启石像休眠安全模式并卸载挂钩');
    await mobileTouchTap(win, () => findAr6Btn(win, '🩺 安全:'));
    check(api.getCfg().safe === false && api.isHooked() === true, '关闭安全模式恢复信道挂钩');

    // 4.4 help 功能图鉴（打开不被合成 click 误触、tiga 页含保存并锁定方案说明、展开全幅、关闭不误关主面板）
    await mobileTouchTap(win, () => findAr6Btn(win, 'help', true));
    const helpNode = win.document.getElementById('ar6-help');
    check(!!helpNode && !api.isMinimized(), 'help 打开功能图鉴弹窗且不被 280ms 合成 click 误触');
    if (win.document.getElementById('ar6-help')) {
      await mobileTouchTap(win, () => win.document.querySelector('#ar6-help [data-ar6-card="tab"][data-tab="tiga"]'));
      check(win.document.getElementById('ar6-help').textContent.includes('保存并锁定方案'),
        '功能图鉴 tiga 页包含作战波段「保存并锁定方案」指引');
      await mobileTouchTap(win, () => win.document.querySelector('#ar6-help [data-ar6-card="tab"][data-tab="world"]'));
      check(win.document.getElementById('ar6-help').textContent.includes('星轨共鸣 · 后台自动更新'),
        '功能图鉴 world 页包含 V5.5 星轨共鸣自动更新说明');
      await mobileTouchTap(win, () => win.document.querySelector('#ar6-help [data-ar6-card="big"]'));
      check(api.getCfg().helpBig === true, '手机端功能图鉴展开全幅生效');
      await mobileTouchTap(win, () => win.document.querySelector('#ar6-help [data-ar6-card="close"]'));
      check(!win.document.getElementById('ar6-help') && !api.isMinimized(), '关闭功能图鉴后主面板保持打开');
    }

    // 关掉 upd-auto 验证跨重载也能保留关闭态（不会强行回弹为默认 true）
    await mobileTouchTap(win, () => findAr6Btn(win, 'upd-auto', true));
    check(api.getCfg().updAuto === false, '重载前将 updAuto 设为 false');

    // =========================================================================
    // 跨重载持久化测试（模拟关闭网页重新打开酒馆，验证抗截断关闭与波段 4a 锁定均不丢失，再恢复 model:auto）
    // =========================================================================
    await mobileTouchTap(win, () => win.document.querySelector('[data-ar6="nav"][data-ar6-nav="jail"]'));
    await mobileTouchTap(win, () => findAr6Btn(win, 'gm:trunc:0', true));
    await mobileTouchTap(win, () => findAr6Btn(win, '🔚 收尾契约:'));
    check(api.getCfg().trunc === 'off' && api.getCfg().truncTail === false && api.getCfg().modelProfile === '4a',
      '重载前确认 trunc=off, truncTail=false, modelProfile=4a');

    api.dispose();
    env1.win.cleanup();

    // 全新浏览器沙箱实例（仅共享持久化 localStorage + extensionSettings）模拟刷新重进酒馆
    const env2 = createMobileBrowserEnv(sharedStore, {
      isTT,
      withExtensionsMenu: !isTT,
      stState,
    });
    const api2 = bootBundleInEnv(raw.content, env2);
    const win2 = env2.win;
    api2.openPanel();

    check(api2.getCfg().modelProfile === '4a', '模拟重载后作战波段 modelProfile=4a 持久保留不回退', `got ${api2.getCfg().modelProfile}`);
    check(api2.getCfg().updAuto === false && api2.updAutoOn() === false, '模拟重载后 updAuto=false 持久保留不回弹为开启', `got ${api2.getCfg().updAuto}`);
    check(api2.getCfg().trunc === 'off' && api2.getCfg().truncTail === false,
      '模拟重载后抗截断关闭态 trunc=off 与子项 truncTail=false 持久保留不复活',
      `trunc=${api2.getCfg().trunc}, truncTail=${api2.getCfg().truncTail}`);

    await mobileTouchTap(win2, () => win2.document.querySelector('[data-ar6="nav"][data-ar6-nav="jail"]'));
    const lockedBadgeHtml = win2.document.getElementById('ar6-root').textContent;
    check(lockedBadgeHtml.includes('已锁定') && !!findAr6Btn(win2, 'model:auto', true),
      '重载后面板自动呈现「🔒 已锁定 · 4A 专属波段」与「恢复自动匹配」快捷副键');

    // 点击副键「恢复自动匹配」(model:auto) 再点 model-save 锁定回 auto
    const autoShortcutBtn = win2.document.querySelector('.ar6-tgrid [data-ar6="model:auto"]') || findAr6Btn(win2, 'model:auto', true);
    await mobileTouchTap(win2, () => autoShortcutBtn);
    check(api2.getCfg().modelProfile === 'auto', '点击恢复自动匹配切回 model:auto 不回弹');
    await mobileTouchTap(win2, () => findAr6Btn(win2, 'model-save', true));
    check(JSON.parse(win2.localStorage.getItem('ar6.cfg')).modelProfile === 'auto', '保存并锁定回 auto 成功落盘');

    api2.dispose();
    env2.win.cleanup();
  } catch (unexpectedErr) {
    failures.push(`UNEXPECTED_THROW: ${unexpectedErr && unexpectedErr.stack ? unexpectedErr.stack.split('\n').slice(0, 3).join(' | ') : unexpectedErr} (isMin=${api.isMinimized()}, hasRoot=${!!win.document.getElementById('ar6-root')})`);
  } finally {
    try { env1.win.cleanup(); } catch (_) {}
  }

  return { fileName, passed: assertions.length, failed: failures.length, failures };
}

(async () => {
  let totalPassed = 0;
  let totalFailed = 0;
  const results = await Promise.all(MOBILE_TARGETS.map((f) => runSuiteForTarget(f)));
  for (const res of results) {
    totalPassed += res.passed;
    totalFailed += res.failed;
    console.log(`[MOBILE-E2E] ${res.fileName}: ${res.passed}/${res.passed + res.failed} assertions passed`);
    if (res.failures.length) {
      for (const fail of res.failures) {
        console.error(`  ✗ ${fail}`);
      }
    }
  }
  if (totalFailed > 0) {
    process.exit(1);
  }
  process.exit(0);
})();
