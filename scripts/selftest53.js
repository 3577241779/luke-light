'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');

function makeMockDom(opts = {}) {
  const store = new Map();
  const localStorage = {
    getItem(k) { return store.has(String(k)) ? store.get(String(k)) : null; },
    setItem(k, v) { store.set(String(k), String(v)); },
    removeItem(k) { store.delete(String(k)); },
    clear() { store.clear(); },
    key(i) { return [...store.keys()][i] ?? null; },
    get length() { return store.size; },
  };

  let idMap = new Map();

  function parseSimpleSelector(sel) {
    return sel.split(',').map(s => s.trim()).filter(Boolean);
  }

  function matchSingleSelector(el, s) {
    if (!el || el.nodeType !== 1) return false;
    // Handle tag#id, #id, .cls, [attr="val"], [attr^="val"], [attr], compound
    // Simple compound parser:
    let rest = s;
    // Handle descendant combinator (e.g. '#ar6-root .ar6-body' or 'style#ar6-style')
    if (rest.includes(' ')) {
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
    // Strip pseudo-classes like :has(...) if any
    rest = rest.replace(/:has\([^)]*\)/g, '');
    // Extract attribute selectors
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
    // Extract id
    const idMatch = rest.match(/#([A-Za-z0-9_-]+)/);
    if (idMatch) {
      if (el.id !== idMatch[1]) return false;
      rest = rest.replace(/#[A-Za-z0-9_-]+/, '');
    }
    // Extract classes
    const clsMatches = [...rest.matchAll(/\.([A-Za-z0-9_-]+)/g)];
    for (const m of clsMatches) {
      if (!el.classList.contains(m[1])) return false;
    }
    rest = rest.replace(/\.[A-Za-z0-9_-]+/g, '');
    // Remaining tag name
    if (rest && rest !== '*') {
      if (el.tagName.toLowerCase() !== rest.toLowerCase()) return false;
    }
    return true;
  }

  function matchesAny(el, selector) {
    const list = parseSimpleSelector(selector);
    return list.some(s => matchSingleSelector(el, s));
  }

  function decodeEntities(s) {
    return String(s)
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&amp;/g, '&');
  }

  function parseHTMLInto(parent, html, doc) {
    parent.children = [];
    const str = String(html || '');
    // Lightweight HTML tag tokenizer for test inspection (querySelector/getElementById/attributes/textContent)
    const tagRe = /<!--[\s\S]*?-->|<\/([a-zA-Z0-9_-]+)\s*>|<([a-zA-Z0-9_-]+)((?:\s+[^\s/>=]+(?:\s*=\s*(?:"[^"]*"|'[^']*'|[^\s"'=>]+))?)*)\s*(\/?)>/g;
    const stack = [parent];
    const voidTags = new Set(['br', 'hr', 'img', 'input', 'meta', 'link', 'path']);
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
        // Closing tag
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
    const listeners = new Map();
    const styleObj = {
      cssText: '',
      display: '',
      left: '',
      top: '',
      width: '',
      height: '',
      maxHeight: '',
      transform: '',
      setProperty(k, v) { this[k] = v; },
    };
    const classSet = new Set();
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
      offsetWidth: 360,
      offsetHeight: 480,
      offsetLeft: 20,
      offsetTop: 20,
      clientWidth: 360,
      clientHeight: 480,
      scrollWidth: 360,
      scrollHeight: 480,
      scrollTop: 0,
      scrollLeft: 0,
      get isConnected() {
        let cur = this;
        while (cur) {
          if (cur === doc.body || cur === doc.documentElement || cur.isShadowRoot) return true;
          cur = cur.parentNode;
        }
        return false;
      },
      get firstChild() { return this.children[0] || null; },
      get id() { return attrs.get('id') || ''; },
      set id(v) {
        const old = attrs.get('id');
        if (old && idMap.get(old) === this) idMap.delete(old);
        if (v) { attrs.set('id', String(v)); idMap.set(String(v), this); }
        else attrs.delete('id');
      },
      get className() { return [...classSet].join(' '); },
      set className(v) {
        classSet.clear();
        String(v || '').split(/\s+/).filter(Boolean).forEach(c => classSet.add(c));
        attrs.set('class', [...classSet].join(' '));
      },
      classList: {
        add(...cs) { cs.forEach(c => c && classSet.add(c)); attrs.set('class', [...classSet].join(' ')); },
        remove(...cs) { cs.forEach(c => classSet.delete(c)); attrs.set('class', [...classSet].join(' ')); },
        contains(c) { return classSet.has(c); },
      },
      setAttribute(k, v) {
        const ks = String(k);
        const vs = String(v);
        attrs.set(ks, vs);
        if (ks === 'id') idMap.set(vs, this);
        if (ks === 'class') {
          classSet.clear();
          vs.split(/\s+/).filter(Boolean).forEach(c => classSet.add(c));
        }
        if (ks === 'value') this.value = vs;
        if (ks === 'checked') this.checked = true;
        if (ks === 'type') this.type = vs;
      },
      getAttribute(k) { return attrs.has(String(k)) ? attrs.get(String(k)) : null; },
      removeAttribute(k) {
        const ks = String(k);
        if (ks === 'id') { const old = attrs.get('id'); if (old && idMap.get(old) === this) idMap.delete(old); }
        attrs.delete(ks);
      },
      appendChild(child) {
        if (!child) return child;
        if (child.parentNode) child.parentNode.removeChild(child);
        child.parentNode = this;
        this.children.push(child);
        if (child.id) idMap.set(child.id, child);
        return child;
      },
      insertBefore(child, ref) {
        if (!child) return child;
        if (child.parentNode) child.parentNode.removeChild(child);
        child.parentNode = this;
        const idx = ref ? this.children.indexOf(ref) : -1;
        if (idx >= 0) this.children.splice(idx, 0, child);
        else this.children.push(child);
        if (child.id) idMap.set(child.id, child);
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
      remove() {
        if (this.parentNode) this.parentNode.removeChild(this);
      },
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
      querySelector(sel) {
        return this.querySelectorAll(sel)[0] || null;
      },
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
        this.children = [];
        this._rawInner = String(v == null ? '' : v);
        this._textParts = [this._rawInner];
      },
      addEventListener(type, fn) {
        if (!listeners.has(type)) listeners.set(type, []);
        listeners.get(type).push(fn);
      },
      removeEventListener(type, fn) {
        if (!listeners.has(type)) return;
        const arr = listeners.get(type);
        const idx = arr.indexOf(fn);
        if (idx >= 0) arr.splice(idx, 1);
      },
      dispatchEvent(ev) {
        const arr = listeners.get(ev.type) || [];
        ev.target = ev.target || this;
        for (const fn of [...arr]) fn.call(this, ev);
        return true;
      },
      click() {
        this.dispatchEvent({ type: 'click', detail: 1, preventDefault() {}, stopPropagation() {} });
      },
      focus() { doc.activeElement = this; },
      select() {},
      setPointerCapture() {},
      releasePointerCapture() {},
      getBoundingClientRect() {
        return { left: 20, top: 20, width: 380, height: 500, right: 400, bottom: 520 };
      },
      attachShadow() {
        const sr = createElement('SHADOW-ROOT', doc);
        sr.isShadowRoot = true;
        this.shadowRoot = sr;
        return sr;
      },
    };
    return el;
  }

  const docListeners = new Map();
  const document = {
    hidden: false,
    activeElement: null,
    head: null,
    body: null,
    documentElement: null,
    defaultView: null,
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
    addEventListener(type, fn) {
      if (!docListeners.has(type)) docListeners.set(type, []);
      docListeners.get(type).push(fn);
    },
    removeEventListener(type, fn) {
      const arr = docListeners.get(type);
      if (!arr) return;
      const i = arr.indexOf(fn);
      if (i >= 0) arr.splice(i, 1);
    },
    dispatchEvent(ev) {
      const arr = docListeners.get(ev.type) || [];
      for (const fn of [...arr]) fn.call(document, ev);
      return true;
    },
    execCommand() { return true; },
  };
  document.documentElement = createElement('HTML', document);
  document.documentElement.clientWidth = opts.width || 1280;
  document.documentElement.clientHeight = opts.height || 800;
  document.head = createElement('HEAD', document);
  document.body = createElement('BODY', document);
  document.documentElement.appendChild(document.head);
  document.documentElement.appendChild(document.body);

  // Add SillyTavern #extensionsMenu and #extensionsMenuButton for wand testing
  const extBtn = createElement('DIV', document);
  extBtn.id = 'extensionsMenuButton';
  const extMenu = createElement('DIV', document);
  extMenu.id = 'extensionsMenu';
  document.body.appendChild(extBtn);
  document.body.appendChild(extMenu);

  const timers = new Set();
  const intervals = new Set();
  const winListeners = new Map();

  const win = {
    document,
    localStorage,
    innerWidth: opts.width || 1280,
    innerHeight: opts.height || 800,
    visualViewport: {
      width: opts.width || 1280,
      height: opts.height || 800,
      addEventListener() {},
      removeEventListener() {},
    },
    location: { href: 'http://127.0.0.1:8000/', origin: 'http://127.0.0.1:8000', host: '127.0.0.1:8000' },
    navigator: {
      userAgent: opts.ua || 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/131.0',
      clipboard: { writeText: () => Promise.resolve() },
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
    matchMedia: (q) => ({ matches: (opts.width || 1280) <= 820 && q.includes('max-width') }),
    getComputedStyle: (el) => ({
      display: (el && el.style && el.style.display) || 'block',
      height: '500px',
      maxHeight: '740px',
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
    addEventListener(type, fn) {
      if (!winListeners.has(type)) winListeners.set(type, []);
      winListeners.get(type).push(fn);
    },
    removeEventListener(type, fn) {
      const arr = winListeners.get(type);
      if (!arr) return;
      const i = arr.indexOf(fn);
      if (i >= 0) arr.splice(i, 1);
    },
    cleanup() {
      for (const t of timers) clearTimeout(t);
      for (const t of intervals) clearInterval(t);
      timers.clear();
      intervals.clear();
    },
  };
  win.XMLHttpRequest.prototype = { open() {}, send() {} };
  win.window = win;
  win.top = win;
  win.parent = win;
  win.globalThis = win;
  document.defaultView = win;
  return win;
}

async function runAsyncPipelineChecks(win, api, raw, fileLabel) {
  const errs = [];
  const check = (cond, msg) => { if (!cond) errs.push(msg); };

  // 1. Platform-specific button & UI_MODE / PLATFORM differentiation
  if (/TT酒馆适配|-tt\.json/i.test(fileLabel)) {
    check(
      raw.button && raw.button.enabled === true &&
      Array.isArray(raw.button.buttons) && raw.button.buttons[0] &&
      raw.button.buttons[0].name === '✦ 光之守护' && raw.button.buttons[0].visible === true,
      'TT build must enable native script button { enabled: true, buttons: [{ name: "✦ 光之守护", visible: true }] }'
    );
    check(api.PLATFORM === 'tt' && api.uiMode() === 'mobile', `TT build must set PLATFORM='tt' and uiMode()='mobile', got ${api.PLATFORM}/${api.uiMode()}`);
    check(!raw.content.includes('function ar6HostScore('), 'TT build must use enhanced ar6CanStore+DOM host resolver');
  } else if (/ST酒馆适配|-st\.json/i.test(fileLabel)) {
    check(
      raw.button && raw.button.enabled === false &&
      Array.isArray(raw.button.buttons) && raw.button.buttons[0] && raw.button.buttons[0].visible === false,
      'ST build top-level button should be { enabled: false, buttons: [{ visible: false }] }'
    );
    check(api.PLATFORM === 'st' && api.uiMode() === 'mobile', `ST mobile build must set PLATFORM='st' and uiMode()='mobile', got ${api.PLATFORM}/${api.uiMode()}`);
    check(raw.content.includes('function ar6HostScore('), 'ST build must retain ar6HostScore');
  } else {
    check(
      raw.button && raw.button.enabled === false &&
      Array.isArray(raw.button.buttons) && raw.button.buttons[0] && raw.button.buttons[0].visible === false,
      'Desktop build top-level button should be { enabled: false, buttons: [{ visible: false }] }'
    );
    check(api.PLATFORM === 'desktop' && api.uiMode() === 'desktop', `Desktop build must set PLATFORM='desktop' and uiMode()='desktop', got ${api.PLATFORM}/${api.uiMode()}`);
    check(!raw.content.includes('function ar6HostScore('), 'Desktop build must use enhanced ar6CanStore+DOM host resolver');
  }

  // 3. #ar6-pill tap without setPointerCapture on pointerdown
  api.setMinimized(true);
  api.setCfg('pillHide', false);
  api.syncPill();
  const pill = win.document.getElementById('ar6-pill');
  check(!!pill && pill.style.display !== 'none', '#ar6-pill should be visible when panel is minimized');
  let capCalledOnDown = false;
  if (pill) {
    const origCap = pill.setPointerCapture;
    pill.setPointerCapture = () => { capCalledOnDown = true; };
    pill.dispatchEvent({ type: 'pointerdown', button: 0, clientX: 1250, clientY: 500, pointerId: 7 });
    check(!capCalledOnDown, 'setPointerCapture must NOT be called in pointerdown');
    pill.setPointerCapture = origCap;
    pill.dispatchEvent({ type: 'pointerup', button: 0, clientX: 1251, clientY: 501, pointerId: 7 });
    check(api.isMinimized() === false, 'pointerup on #ar6-pill must open panel directly');
    pill.dispatchEvent({ type: 'click', detail: 1, preventDefault() {}, stopPropagation() {} });
    check(api.isMinimized() === false, 'synthetic click after pointerup must be deduplicated without closing panel');
  }

  // 4. Async SSE CRLF + flush + desensRestore + peekBody pipeline (with missing JSON/SSE content-type!)
  {
    const enc = new TextEncoder();
    const sseChunks = [
      'data: {"id":"1","model":"gpt-4o","choices":[{"index":0,"delta":{"tool_calls":[{"index":0,"id":"call_1","type":"function","function":{"name":"lk_write","arguments":"{\\"content\\":\\"月光洒在未\u00a6"}}]}}]}\r\n\r\n' +
      'data: {"id":"1","model":"gpt-4o","choices":[{"index":0,"delta":{"tool_calls":[{"index":0,"function":{"arguments":"成年少女与萝¦"}}]}}]}\r\n\r\n',
      // Flush-only chunk with NO trailing \n\n and multiple data: lines:
      'data: {"id":"1","model":"gpt-4o","choices":[{"index":0,"delta":{"tool_calls":[{"index":0,"function":{"arguments":"莉的肩头。\\"}"}}]},"finish_reason":"tool_calls"}]}\r\ndata: [DONE]'
    ];
    const bodyStream = new ReadableStream({
      start(ctrl) {
        for (const c of sseChunks) ctrl.enqueue(enc.encode(c));
        ctrl.close();
      }
    });
    const rawRes = new Response(bodyStream, {
      status: 200,
      headers: { 'content-type': 'application/octet-stream' }, // intentionally wrong Content-Type to test sniffing!
    });

    api.setCfg('enabled', true);
    api.setCfg('toolChan', 'on');
    api.setCfg('desens', 'a');
    api.setCfg('desensUnmask', true);
    const wrapped1 = await api.toolMaybeWrap(rawRes, { tool: true, desens: true });
    const wrapped2 = api.desensMaybeRestore(wrapped1, { tool: true, desens: true });
    const ev = api.newEvidence('gpt-4o', 200, 'sse');
    ev.rid = 880001;
    api.peekBody(wrapped2, ev);
    const finalText = await wrapped2.text();
    // Give peekBody's clone reader a microtask tick to finish settling
    await new Promise(r => setTimeout(r, 30));

    // Reconstruct chat text across SSE delta frames just as SillyTavern's SSE reader does
    let assembledChat = '';
    for (const ln of finalText.split(/\r?\n/)) {
      const m = /^data:\s*(.+)$/.exec(ln);
      if (!m || m[1].trim() === '[DONE]') continue;
      try {
        const j = JSON.parse(m[1]);
        const c0 = j.choices && j.choices[0];
        if (c0 && c0.delta && typeof c0.delta.content === 'string') assembledChat += c0.delta.content;
      } catch (_) {}
    }

    check(assembledChat === '月光洒在未成年少女与萝莉的肩头。', `Expected unwrapped & unmasked Chinese text, got: ${assembledChat}`);
    check(!finalText.includes('tool_calls'), 'Unwrapped SSE must not leak tool_calls');
    check(ev.chars >= 14 && ev.capture && ev.capture.bodyChars >= 14, `peekBody must count unwrapped chars > 0 (got ev.chars=${ev.chars}, bodyChars=${ev.capture && ev.capture.bodyChars})`);
  }

  // 5. Async HTTP 400 forced tool_choice auto-fallback to 'auto' in fetch hook
  {
    api.setCfg('enabled', true);
    api.setCfg('safe', false);
    api.setCfg('toolChan', 'on');
    api.setCfg('jailTool', 'off');
    api.setCfg('grab', 0);
    const seenChoices = [];
    // Reinstall hook over custom mock upstream fetch
    api.dispose();
    win.fetch = async (input, init) => {
      const b = JSON.parse(init.body);
      seenChoices.push(b.tool_choice);
      if (b.tool_choice && typeof b.tool_choice === 'object') {
        return new Response('{"error":{"message":"tool_choice object not supported"}}', {
          status: 400,
          headers: { 'content-type': 'application/json' },
        });
      }
      return new Response(JSON.stringify({
        id: 'cmpl-fb',
        model: 'gpt-4o',
        choices: [{
          index: 0,
          message: {
            role: 'assistant',
            content: null,
            tool_calls: [{
              id: 'tc_1',
              type: 'function',
              function: { name: 'lk_write', arguments: JSON.stringify({ content: '自动降级重试后的完整小说正文。' }) },
            }],
          },
          finish_reason: 'tool_calls',
        }],
      }), { status: 200, headers: { 'content-type': 'application/json' } });
    };
    api.boot();
    api.setCfg('enabled', true);
    api.setCfg('safe', false);
    api.setCfg('onlyGemini', false);
    api.setCfg('toolChan', 'on');
    api.setCfg('jailTool', 'off');

    const resFb = await win.fetch('https://relay.example.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        model: 'gpt-4o',
        chat_completion_source: 'custom',
        messages: [{ role: 'user', content: '请继续写下一章正文，人物在雨夜重逢。' }],
      }),
    });
    const jsonFb = await resFb.json();
    check(resFb.status === 200, `Expected 400->200 auto-retry, got status ${resFb.status}`);
    check(seenChoices.length === 2 && typeof seenChoices[0] === 'object' && seenChoices[1] === 'auto',
      `Expected [object, "auto"] tool_choice retry sequence, got ${JSON.stringify(seenChoices)}`);
    check(jsonFb.choices && jsonFb.choices[0].message.content === '自动降级重试后的完整小说正文。',
      `Expected unwrapped JSON content after 400 retry, got ${JSON.stringify(jsonFb)}`);
  }

  // 6. End-to-end SillyTavern /api/backends/chat-completions/generate chat -> report card -> runChannelVerify probe
  {
    api.dispose();
    win.localStorage.removeItem('ar6.log');
    let probeCalls = [];
    win.SillyTavern = {
      getContext: () => ({
        getRequestHeaders: () => ({ 'Content-Type': 'application/json', 'X-CSRF-Token': 'csrf-test-token' }),
      }),
    };
    win.fetch = async (input, init) => {
      const url = typeof input === 'string' ? input : input.url;
      const bodyObj = init && init.body ? JSON.parse(init.body) : {};
      const hdrs = init && init.headers ? init.headers : {};
      const isIntHdr = (typeof hdrs.get === 'function' ? hdrs.get('x-ar6-internal') : hdrs['x-ar6-internal']) === '1';
      if (isIntHdr) {
        probeCalls.push({ url, model: bodyObj.model, custom_model: bodyObj.custom_model, csrf: hdrs['X-CSRF-Token'] });
        return new Response(JSON.stringify({ error: { message: `model ${bodyObj.model} does not exist` } }), {
          status: 404,
          headers: { 'content-type': 'application/json' },
        });
      }
      const enc = new TextEncoder();
      const sse = [
        'data: {"id":"st-1","model":"models/gemini-2.5-flash","choices":[{"index":0,"delta":{"reasoning_content":"简短思考"}}]}\n\n',
        'data: {"id":"st-1","model":"models/gemini-2.5-flash","choices":[{"index":0,"delta":{"content":"这是一段来自酒馆后端转发的完整正文输出，用于验证模型调包检测与诊断报告展示。"}}],"finish_reason":"stop","usage":{"prompt_tokens":100,"completion_tokens":38,"reasoning_tokens":5}}\n\n',
        'data: [DONE]\n\n',
      ];
      return new Response(new ReadableStream({
        start(ctl) { for (const c of sse) ctl.enqueue(enc.encode(c)); ctl.close(); },
      }), { status: 200, headers: { 'content-type': 'text/event-stream' } });
    };

    api.boot();
    api.setCfg('enabled', true);
    api.setCfg('safe', false);
    api.setCfg('onlyGemini', true);
    api.setCfg('toolChan', 'off');

    // Note: NO `type` property in SillyTavern's chat-completions/generate JSON body!
    const stRes = await win.fetch('http://127.0.0.1:8000/api/backends/chat-completions/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': 'csrf-test-token' },
      body: JSON.stringify({
        messages: [
          { role: 'system', content: '世界观设定' },
          { role: 'user', content: '继续推进本轮剧情。' },
        ],
        model: 'gemini-4-hydrogen',
        temperature: 1,
        max_tokens: 4000,
        stream: true,
        chat_completion_source: 'custom',
        custom_url: 'https://my-relay.example.com/v1',
      }),
    });
    await stRes.text();
    await new Promise(r => setTimeout(r, 60));

    const logs = api.readLog();
    check(logs.length >= 1, `Expected ST backend chat to be logged in readLog(), got length=${logs.length}`);
    if (logs[0]) {
      const r0 = logs[0];
      check(r0.code === 'diff', `Expected tier drop gemini-4-hydrogen -> gemini-2.5-flash to be 'diff', got code=${r0.code} (${r0.note})`);
      check(r0.req === 'gemini-4-hydrogen' && r0.obs === 'gemini-2.5-flash', `Expected req/obs models to be recorded, got req=${r0.req}, obs=${r0.obs}`);
      check(r0.ttft > 0 && r0.total > 0 && r0.chars >= 20, `Expected non-null ttft/total/chars, got ttft=${r0.ttft}, total=${r0.total}, chars=${r0.chars}`);
      const cardHtml = api.cardHumanHTML(r0);
      check(cardHtml.includes('检测到疑似更换/降级模型') && cardHtml.includes('gemini-4-hydrogen') && cardHtml.includes('gemini-2.5-flash'),
        'Expected cardHumanHTML to clearly render requested model, observed model, and downgrade verdict');
    }

    // Verify runChannelVerify routes through ST backend with CSRF header & x-ar6-internal: '1'
    const verRes = await api.runChannelVerify();
    check(verRes && verRes.ok === true && verRes.echoes === false && api.verifiableCode() === 'yes',
      `Expected runChannelVerify via ST backend to succeed with echoes=false, got ${JSON.stringify(verRes)}`);
    check(probeCalls.length === 1 && probeCalls[0].url.includes('/api/backends/chat-completions/generate') && probeCalls[0].csrf === 'csrf-test-token',
      `Expected probeOnce to forward via ST backend with CSRF token, got ${JSON.stringify(probeCalls)}`);

    // Verify main panel header data-st="bad" synchronizes with latest 'diff' alert
    api.openPanel();
    const rootEl = win.document.getElementById('ar6-root');
    check(rootEl && rootEl.getAttribute('data-st') === 'bad', `Expected #ar6-root[data-st="bad"] on downgrade alert, got ${rootEl && rootEl.getAttribute('data-st')}`);
  }

  // 7. TT Tavern direct-fetch OpenAI (/api/v1/chat/completions + Bearer token) & Gemini Native (:streamGenerateContent?key=...) probes
  {
    api.dispose();
    delete win.SillyTavern;
    const directProbeCalls = [];
    win.fetch = async (input, init) => {
      const url = typeof input === 'string' ? input : input.url;
      const hdrs = init && init.headers ? init.headers : {};
      const getH = (k) => {
        if (typeof hdrs.get === 'function') return hdrs.get(k);
        for (const hk of Object.keys(hdrs)) if (hk.toLowerCase() === k.toLowerCase()) return hdrs[hk];
        return null;
      };
      if (getH('x-ar6-internal') === '1') {
        directProbeCalls.push({ url, auth: getH('authorization'), googKey: getH('x-goog-api-key'), body: JSON.parse(init.body) });
        return new Response(JSON.stringify({ error: { message: 'unknown model' } }), {
          status: 404,
          headers: { 'content-type': 'application/json' },
        });
      }
      if (url.includes(':streamGenerateContent')) {
        return new Response(
          'data: {"candidates":[{"content":{"parts":[{"text":"原生流式正文输出完成。"}]},"finishReason":"STOP"}],"modelVersion":"gemini-2.5-pro"}\n\n',
          { status: 200, headers: { 'content-type': 'text/event-stream' } }
        );
      }
      return new Response(
        'data: {"id":"tt-1","model":"gemini-2.5-pro","choices":[{"index":0,"delta":{"content":"TT直连反代流式正文输出完成。"},"finish_reason":"stop"}]}\n\n',
        { status: 200, headers: { 'content-type': 'text/event-stream' } }
      );
    };

    api.boot();
    api.setCfg('enabled', true);
    api.setCfg('safe', false);
    api.setCfg('onlyGemini', true);
    api.setCfg('dualBase', '');

    // 7a. TT direct OpenAI-compatible sub-path (/api/v1/chat/completions) with Bearer auth
    const ttRes1 = await win.fetch('https://tt-relay.example.com/api/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer sk-tt-secret-key-123456' },
      body: JSON.stringify({
        model: 'gemini-2.5-pro',
        messages: [{ role: 'user', content: '继续讲述故事。' }],
        stream: true,
      }),
    });
    await ttRes1.text();
    await new Promise(r => setTimeout(r, 40));
    const ttVer1 = await api.runChannelVerify();
    check(ttVer1 && ttVer1.ok === true && ttVer1.echoes === false, `Expected TT direct OpenAI probe to succeed, got ${JSON.stringify(ttVer1)}`);
    check(
      directProbeCalls.length === 1 &&
      directProbeCalls[0].url === 'https://tt-relay.example.com/api/v1/chat/completions' &&
      directProbeCalls[0].auth === 'Bearer sk-tt-secret-key-123456',
      `Expected TT direct probe to preserve /api/v1/chat/completions and Authorization header, got ${JSON.stringify(directProbeCalls)}`
    );
    // Ensure secret key is NEVER persisted in localStorage or exportText
    let leakedInLs = false;
    for (let i = 0; i < win.localStorage.length; i++) {
      const v = win.localStorage.getItem(win.localStorage.key(i)) || '';
      if (v.includes('sk-tt-secret-key-123456')) leakedInLs = true;
    }
    check(!leakedInLs && !api.exportText().includes('sk-tt-secret-key-123456'), 'Auth token must NEVER be persisted to localStorage or exportText()');

    // 7b. TT direct Gemini native endpoint (:streamGenerateContent?key=...&alt=sse)
    directProbeCalls.length = 0;
    const ttRes2 = await win.fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-pro:streamGenerateContent?key=AIzaTestKey999&alt=sse', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: '继续下一节小说剧情。' }] }],
      }),
    });
    await ttRes2.text();
    await new Promise(r => setTimeout(r, 40));
    const ttVer2 = await api.runChannelVerify();
    check(ttVer2 && ttVer2.ok === true && ttVer2.echoes === false, `Expected TT Gemini native probe to succeed, got ${JSON.stringify(ttVer2)}`);
    check(
      directProbeCalls.length === 1 &&
      directProbeCalls[0].url.includes('/v1beta/models/gemini-2.5-pro-zzz-nonexistent:generateContent?key=AIzaTestKey999') &&
      !directProbeCalls[0].url.includes('alt=sse') &&
      Array.isArray(directProbeCalls[0].body.contents),
      `Expected Gemini native probe URL & contents format, got ${JSON.stringify(directProbeCalls)}`
    );
  }

  // 8. Hot-reload / re-import seamless takeover within 30s lease window (no 30s deadlock)
  {
    const prevToken = win.__AR6HOLD && win.__AR6HOLD.token;
    check(!!prevToken && win.__AR6HOLD.alive === true, 'Expected active __AR6HOLD lease before hot-reload');
    const reloadScript = new vm.Script('"use strict";\n' + raw.content, { filename: fileLabel + ':reload' });
    reloadScript.runInContext(win);
    api = win.__AR6__;
    const newToken = win.__AR6HOLD && win.__AR6HOLD.token;
    check(!!newToken && newToken !== prevToken && api.isHooked() === true,
      `Expected hot-reload to cleanly dispose old instance and acquire new lease immediately (prev=${prevToken}, new=${newToken})`);
  }

  // 9. Late SSE chunk reconcile: finish() commits 'unknown' first, then peekBody final chunk flips to 'diff' & syncs LED_KEY + header bad state
  {
    api.ar6LsDel('ar6.log');
    api.ar6LsDel('ar7.led');
    api.setCfg('enabled', true);
    api.setCfg('onlyGemini', true);
    let streamCtrl = null;
    const enc = new TextEncoder();
    const slowRes = new Response(new ReadableStream({
      start(ctl) {
        streamCtrl = ctl;
        ctl.enqueue(enc.encode('data: {"choices":[{"index":0,"delta":{"content":"前半段正文先落进聊天栏。"}}]}\n\n'));
      },
    }), { status: 200, headers: { 'content-type': 'text/event-stream' } });

    const evLate = api.newEvidence('gemini-4-argon', 200, 'sse');
    evLate.sawText = true;
    evLate.outputChars = 12;
    const pkPromise = api.peekBody(slowRes, evLate);
    await new Promise(r => setTimeout(r, 20));
    // Simulate watcher committing finish() early before final chunk arrives (bypassing 6s wait by aging __peekAt)
    evLate.__peekAt = Date.now() - 7000;
    const earlyRec = api.finish(evLate, { base: 'https://late-test.example.com/v1' });
    check(earlyRec && earlyRec.code === 'unknown', `Expected early finish before model chunk to be 'unknown', got ${earlyRec && earlyRec.code}`);

    // Now push final SSE chunk carrying downgraded model name and close stream
    streamCtrl.enqueue(enc.encode('data: {"model":"gemini-2.5-flash","choices":[{"index":0,"delta":{"content":"后半段结尾。"},"finish_reason":"stop"}]}\n\ndata: [DONE]\n\n'));
    streamCtrl.close();
    await pkPromise;
    await new Promise(r => setTimeout(r, 20));

    const lateLogs = api.readLog();
    check(lateLogs[0] && lateLogs[0].code === 'diff' && lateLogs[0].obs === 'gemini-2.5-flash',
      `Expected late reconcile to flip log[0] from unknown -> diff, got ${JSON.stringify(lateLogs[0] && { code: lateLogs[0].code, obs: lateLogs[0].obs })}`);
    api.setCfg('dualBase', 'https://late-test.example.com/v1');
    const stLed = api.ledStat();
    api.setCfg('dualBase', '');
    check(stLed.n === 1 && stLed.bad === 1, `Expected late reconcile to backfill LED_KEY (n=1, bad=1), got ${JSON.stringify(stLed)}`);
  }

  // 10. Platform UI ergonomics: Mobile (ST/TT) blocks header drag & fits visualViewport keyboard; Desktop supports >6px drag & side-by-side Help
  {
    api.setCfg('padX', 0);
    api.setCfg('padY', 0);
    api.openPanel();
    const rootEl = win.document.getElementById('ar6-root');
    const boxEl = rootEl && rootEl.querySelector('.ar6-p');
    const headEl = rootEl && rootEl.querySelector('.ar6-mh');
    check(!!boxEl && !!headEl, 'Expected .ar6-p and .ar6-mh when panel is open');

    if (api.uiMode() === 'mobile') {
      // Mobile: dragging header must NOT translate .ar6-p
      headEl.dispatchEvent({ type: 'pointerdown', button: 0, clientX: 100, clientY: 30, pointerId: 11 });
      headEl.dispatchEvent({ type: 'pointermove', button: 0, clientX: 160, clientY: 80, pointerId: 11 });
      headEl.dispatchEvent({ type: 'pointerup', button: 0, clientX: 160, clientY: 80, pointerId: 11 });
      check(boxEl.style.transform === '', `Mobile panel must not drag/translate, got transform=${boxEl.style.transform}`);

      // Mobile soft keyboard shrink via visualViewport
      win.visualViewport.height = 420;
      win.visualViewport.offsetTop = 14;
      api.fitPanel(rootEl);
      check(rootEl.style.height === '420px' && rootEl.style.top === '14px',
        `Mobile fitPanel must track visualViewport height/offsetTop, got height=${rootEl.style.height}, top=${rootEl.style.top}`);
      win.visualViewport.height = 800;
      win.visualViewport.offsetTop = 0;
    } else {
      // Desktop: 3px jitter must NOT translate, 30px drag MUST translate
      headEl.dispatchEvent({ type: 'pointerdown', button: 0, clientX: 200, clientY: 30, pointerId: 12 });
      headEl.dispatchEvent({ type: 'pointermove', button: 0, clientX: 203, clientY: 32, pointerId: 12 });
      headEl.dispatchEvent({ type: 'pointerup', button: 0, clientX: 203, clientY: 32, pointerId: 12 });
      check(boxEl.style.transform === '', `Desktop <6px jitter must not translate panel, got ${boxEl.style.transform}`);

      headEl.dispatchEvent({ type: 'pointerdown', button: 0, clientX: 200, clientY: 30, pointerId: 13 });
      headEl.dispatchEvent({ type: 'pointermove', button: 0, clientX: 240, clientY: 55, pointerId: 13 });
      headEl.dispatchEvent({ type: 'pointerup', button: 0, clientX: 240, clientY: 55, pointerId: 13 });
      check(boxEl.style.transform.includes('translate('), `Desktop >6px drag must translate panel, got ${boxEl.style.transform}`);

      // Desktop side-by-side Help: clicking inside .ar6-p must NOT close #ar6-help, clicking outside closes #ar6-help first
      api.openHelp('entry');
      check(!!win.document.getElementById('ar6-help'), 'Expected #ar6-help to be open');
      await new Promise(r => setTimeout(r, 520)); // past PANEL_OPENED_AT 500ms guard
      win.document.dispatchEvent({ type: 'pointerdown', target: boxEl });
      check(!!win.document.getElementById('ar6-help'), 'Desktop clicking inside main panel must keep #ar6-help open');
      win.document.dispatchEvent({ type: 'pointerdown', target: win.document.body });
      check(!win.document.getElementById('ar6-help') && api.isMinimized() === false,
        'Desktop clicking empty backdrop must close #ar6-help first while keeping main panel open');
    }
  }

  // 11. Sandboxed iframe cross-window storage sync & zero-localStorage fallback
  {
    const topWin = makeMockDom({ width: 412, height: 915 });
    const iframeStore = new Map();
    const iframeWin = makeMockDom({ width: 0, height: 0 });
    iframeWin.localStorage = {
      getItem(k) { return iframeStore.has(String(k)) ? iframeStore.get(String(k)) : null; },
      setItem(k, v) { iframeStore.set(String(k), String(v)); },
      removeItem(k) { iframeStore.delete(String(k)); },
    };
    iframeWin.top = topWin;
    iframeWin.parent = topWin;
    const iframeCtx = vm.createContext(iframeWin);
    const s2 = new vm.Script('"use strict";\n' + raw.content, { filename: fileLabel + ':iframe' });
    s2.runInContext(iframeCtx);
    const iApi = iframeWin.__AR6__;
    iApi.ar6LsSet('ar6.test.sync', 'ok-123');
    check(
      topWin.localStorage.getItem('ar6.test.sync') === 'ok-123' &&
      iframeWin.localStorage.getItem('ar6.test.sync') === 'ok-123',
      'ar6LsSet must mirror across both HOST (top) and SELF_WIN (iframe) localStorage'
    );
    topWin.localStorage.removeItem('ar6.test.sync');
    check(iApi.ar6LsGet('ar6.test.sync') === 'ok-123', 'ar6LsGet must fall back to iframe localStorage if top storage cleared/blocked');
    iApi.ar6LsDel('ar6.test.sync');
    check(topWin.localStorage.getItem('ar6.test.sync') === null && iframeWin.localStorage.getItem('ar6.test.sync') === null,
      'ar6LsDel must clear both top and iframe localStorage');
    iApi.dispose();
    iframeWin.cleanup();
    topWin.cleanup();
  }

  // 12. V5.3 Engineering Regression Checks:
  //     (a) Static check: zero eval(), zero regex lookbehind, zero dead functions / orphan globals
  //     (b) Multi-turn HTTP 400 max_tokens adaptive fallback + learned channel cap + multi-channel recovery
  //     (c) Streaming toolWrapStream SSE wire integrity (carry-note dedupe + split armor escape + valid JSON lines)
  {
    const src = String(raw.content || '');
    check(!/\beval\s*\(/.test(src), 'Bundle must not contain eval() (strict CSP & V8/JSC optimization)');
    check(!/\(\?<[=!]/.test(src), 'Bundle must not contain regex lookbehind (?<= / (?<!) for iOS < 16.4 WebKit compatibility');
    const deadDecls = [
      'abLine', 'lastModelNameOld', 'tierMenuHTML', 'modelMenuHTML', 'menuChip',
      'genMenus', 'lkPresetNote', 'btnIco', 'toolJailCardHTML', 'srcName',
      'oocChip', 'lkHardTier', 'lkUltTier', 'LK_SD_TS', 'LK_HARD_TIERS',
      'LK_ULT_TIERS', 'TIER_MENU', 'MODEL_MENU', 'GEN_MENU'
    ];
    for (const nm of deadDecls) {
      const declRe = new RegExp(`\\b(?:function|var)\\s+${nm}\\b`);
      check(!declRe.test(src), `Dead symbol ${nm} must be removed from bundle`);
    }

    // (b) Multi-turn HTTP 400 max_tokens adaptive fallback
    const savedJail = api.getCfg().jail;
    const savedConf = api.getCfg().jailSupremeConfirmed;
    const savedTool = api.getCfg().toolChan;
    const savedPvp = api.getCfg().pvp;
    const savedOnlyGem = api.getCfg().onlyGemini;

    const seenMaxToks = [];
    api.dispose();
    win.fetch = async (url, init) => {
      const b = JSON.parse((init && init.body) || '{}');
      seenMaxToks.push({ url: String(url), max: b.max_tokens });
      if (b.max_tokens > 8192) {
        return new Response(JSON.stringify({ error: { message: 'Invalid max_tokens: must not exceed 8192' } }), {
          status: 400,
          headers: { 'content-type': 'application/json' },
        });
      }
      return new Response(JSON.stringify({
        id: 'ok-tok',
        model: 'gpt-4o',
        choices: [{ index: 0, message: { role: 'assistant', content: '正常正文输出，验证跨轮输出上限自适应封顶生效。' }, finish_reason: 'stop' }],
      }), { status: 200, headers: { 'content-type': 'application/json' } });
    };
    api.boot();
    api.setCfg('enabled', true);
    api.setCfg('safe', false);
    api.setCfg('onlyGemini', false);
    api.setCfg('jail', 'strong');
    api.setCfg('jailSupremeConfirmed', true);
    api.setCfg('toolChan', 'off');
    api.setCfg('pvp', 'off');

    const reqInit = {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: 'gpt-4o', max_tokens: 4000, messages: [{ role: 'user', content: '推进剧情第一轮' }] }),
    };
    const rTurn1 = await win.fetch('https://cap-ch1.example.com/v1/chat/completions', reqInit);
    check(rTurn1.status === 200, `Turn 1 400 max_tokens fallback should succeed with 200, got ${rTurn1.status}`);
    check(seenMaxToks.length === 2 && seenMaxToks[0].max === 32768 && seenMaxToks[1].max === 8192,
      `Turn 1 should retry from 32768 -> 8192, got ${JSON.stringify(seenMaxToks)}`);

    // Turn 2 on SAME channel: should remember 8192 cap immediately without hitting 400!
    seenMaxToks.length = 0;
    const rTurn2 = await win.fetch('https://cap-ch1.example.com/v1/chat/completions', reqInit);
    check(rTurn2.status === 200 && seenMaxToks.length === 1 && seenMaxToks[0].max === 8192,
      `Turn 2 on same channel must send max_tokens=8192 directly without 400 round-trip, got ${JSON.stringify(seenMaxToks)}`);

    // Turn 3 on DIFFERENT channel (with PVP enabled!): TOKBACK must NOT be locked out!
    api.setCfg('pvp', 'on');
    seenMaxToks.length = 0;
    const rTurn3 = await win.fetch('https://cap-ch2.example.com/v1/chat/completions', reqInit);
    check(rTurn3.status === 200 && seenMaxToks.length === 2 && seenMaxToks[1].max === 8192,
      `Turn 3 on new channel under PVP must still auto-clamp 400 -> 8192, got ${JSON.stringify(seenMaxToks)}`);

    // (c) Streaming toolWrapStream SSE wire integrity with carry-note prefix + repeated tool opening
    api.setCfg('pvp', 'off');
    api.setCfg('toolChan', 'on');
    const sseChunks = [
      'data: {"id":"chatcmpl-carry999","choices":[{"index":0,"delta":{"content":"林晚把伞收起来，走进旧书店"}}]}\n\n',
      'data: {"id":"chatcmpl-carry999","choices":[{"index":0,"delta":{"content":"，拍了拍肩上的雨水。"}}]}\n\n',
      'data: {"id":"chatcmpl-carry999","choices":[{"index":0,"delta":{"tool_calls":[{"index":0,"id":"tc1","type":"function","function":{"name":"lk_write","arguments":"{\\"content\\":\\"林晚把伞收起来，走进旧书店，拍了拍肩上的雨水。柜台后的老人抬起头。\\"}"}}]},"finish_reason":"tool_calls"}]}\n\n',
      'data: [DONE]\n\n',
    ];
    const enc = new win.TextEncoder();
    const dec = new win.TextDecoder();
    const rawStream = new ReadableStream({
      start(ctl) {
        for (const c of sseChunks) ctl.enqueue(enc.encode(c));
        ctl.close();
      }
    });
    const wrappedRes = api.toolWrapStream(new win.Response(rawStream, {
      status: 200,
      headers: { 'content-type': 'text/event-stream' },
    }));
    const reader = wrappedRes.body.getReader();
    let fullSse = '';
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      if (value) fullSse += dec.decode(value, { stream: true });
    }
    fullSse += dec.decode();
    let assembled = '';
    for (const line of fullSse.split(/\r?\n/)) {
      const t = line.trim();
      if (!t) continue;
      check(t.startsWith('data:'), `Every non-empty SSE line must start with data:, got: ${t}`);
      const payload = t.slice(5).trim();
      if (payload === '[DONE]') continue;
      let parsedLine = null;
      try { parsedLine = JSON.parse(payload); } catch (eJ) {
        check(false, `Corrupted SSE JSON payload: ${payload} (${eJ.message})`);
      }
      if (parsedLine && parsedLine.choices && parsedLine.choices[0] && parsedLine.choices[0].delta && parsedLine.choices[0].delta.content) {
        assembled += parsedLine.choices[0].delta.content;
      }
    }
    check(assembled === '林晚把伞收起来，走进旧书店，拍了拍肩上的雨水。柜台后的老人抬起头。',
      `Carry-note + tool dedupe assembled text mismatch: got "${assembled}"`);

    api.setCfg('jail', savedJail);
    api.setCfg('jailSupremeConfirmed', savedConf);
    api.setCfg('toolChan', savedTool);
    api.setCfg('pvp', savedPvp);
    api.setCfg('onlyGemini', savedOnlyGem);

    // (d) V5.4 ~ V5.76 Ritual Modal Child-Element Click Delegation + Awakening Screen FX
    if (api.VERSION === '5.4' || api.VERSION === '5.5' || api.VERSION === '5.6' || api.VERSION === '5.61' || api.VERSION === '5.65' || api.VERSION === '5.70' || api.VERSION === '5.71' || api.VERSION === '5.72' || api.VERSION === '5.73' || api.VERSION === '5.74' || api.VERSION === '5.75' || api.VERSION === '5.76') {
      api.openPanel();
      api.setUITab('jail');
      api.render();
      api.onPanelClick({
        target: { getAttribute: k => (k === 'data-ar6' ? 'tier:gatanothor' : null), parentNode: null },
        type: 'click',
      });
      const cardNoa = win.document.getElementById('ar6-card');
      check(!!cardNoa && cardNoa.textContent.includes('宇宙中的第一道光'), 'Clicking tier:gatanothor must open Noa ritual modal');
      const okBtn = cardNoa && cardNoa.querySelector('[data-ar6-card="ultok"]');
      const innerSpan = (okBtn && okBtn.children && okBtn.children[0]) || okBtn;
      if (innerSpan) {
        cardNoa.dispatchEvent({ type: 'click', target: innerSpan });
      }
      check(api.getCfg().jail === 'gatanothor', `Child-span click on Noa ultok must switch jail to gatanothor, got ${api.getCfg().jail}`);
      const fxNode = win.document.getElementById('ar6-fx');
      check(!!fxNode && fxNode.getAttribute('data-fx') === 'noa', 'Confirming Noa modal must mount #ar6-fx[data-fx="noa"]');
      const rootNode = win.document.getElementById('ar6-root');
      check(!!rootNode && rootNode.getAttribute('data-tier') === 'noa', 'Confirming Noa modal must set #ar6-root[data-tier="noa"]');
      api.clearAwakenFx();
      check(!win.document.getElementById('ar6-fx'), 'clearAwakenFx must remove #ar6-fx');
      api.setCfg('jail', savedJail);
    }
  }

  return errs;
}

async function testJsonFile(jsonPath) {
  const raw = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
  const strictCode = '"use strict";\n' + raw.content;

  // 1. Strict syntax compile check
  const script = new vm.Script(strictCode, { filename: path.basename(jsonPath) });

  // 2. Execute in VM context
  const win = makeMockDom({ width: 1280, height: 800 });
  const ctx = vm.createContext(win);
  try {
    script.runInContext(ctx);
    const api = win.__AR6__;
    if (!api) throw new Error('__AR6__ not exported on globalThis');

    const res = api.runSelfTest();
    const failed = res.items.filter(x => !x.ok);

    // Also test openPanel() in strict mode!
    let openPanelErr = null;
    try {
      api.openPanel();
    } catch (e) {
      openPanelErr = e.message || String(e);
    }

    // Run async pipeline & UI integration checks on V5.3+ builds
    let asyncErrs = [];
    if (/V5\.(?:[34567]|61|65|70)|luke-light-/i.test(path.basename(jsonPath))) {
      asyncErrs = await runAsyncPipelineChecks(win, api, raw, path.basename(jsonPath));
    }

    return {
      file: path.basename(jsonPath),
      total: res.items.length,
      passed: res.items.length - failed.length,
      failed,
      openPanelErr,
      asyncErrs,
      meta: { name: raw.name, button: raw.button },
    };
  } finally {
    try { if (win.__AR6__ && win.__AR6__.dispose) win.__AR6__.dispose(); } catch (_) {}
    win.cleanup();
  }
}

if (require.main === module) {
  (async () => {
    const args = process.argv.slice(2);
    const files = args.length ? args : [
      path.join(__dirname, '..', 'dist', 'luke-light-st.json'),
      path.join(__dirname, '..', 'dist', 'luke-light-tt.json'),
      path.join(__dirname, '..', 'dist', 'luke-light-desktop.json'),
    ];
    let anyFail = false;
    for (const f of files) {
      const r = await testJsonFile(f);
      console.log(`[${r.file}] ${r.passed}/${r.total} sync tests passed | openPanelErr=${r.openPanelErr} | asyncErrs=${r.asyncErrs.length}`);
      if (r.failed.length) {
        anyFail = true;
        console.log('  SYNC FAILED:', r.failed);
      }
      if (r.openPanelErr) anyFail = true;
      if (r.asyncErrs.length) {
        anyFail = true;
        console.log('  ASYNC FAILED:', r.asyncErrs);
      }
    }
    if (anyFail) process.exit(1);
  })();
}

module.exports = { makeMockDom, testJsonFile };
