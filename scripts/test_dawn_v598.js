'use strict';
/**
 * 卢克之光 V5.99 专项回归测试：破暗化光 · 闪耀三轨（allTool 全工具破甲 + 五项冲突根治 + 暗转明闪耀仪式 + 10 皮肤联动）
 */
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { TextEncoder, TextDecoder } = require('util');

const DIST_DIR = path.join(__dirname, '..', 'dist');
const TARGETS = ['luke-light-st.json', 'luke-light-tt.json', 'luke-light-desktop.json'];
const SKINS = ['ultra', 'plain', 'xianxia', 'xuanhuan', 'pink', 'marvel', 'imperial', 'westfantasy', 'eldritch', 'cyberpunk'];

let pass = 0, fail = 0;
function check(cond, msg, detail) {
  if (cond) { pass++; }
  else { fail++; console.error('  [FAIL]', msg, detail ? `(${detail})` : ''); }
}

function makeEl(tag, doc) {
  const attrs = Object.create(null);
  const listeners = Object.create(null);
  let _innerHTML = '';
  const el = {
    nodeType: 1,
    tagName: String(tag || 'DIV').toUpperCase(),
    id: '', className: '', style: {}, textContent: '', value: '',
    children: [], childNodes: [], parentNode: null,
    get firstChild() { return el.childNodes[0] || null; },
    get firstElementChild() { return el.children[0] || null; },
    classList: {
      add(c) { if (!(' ' + el.className + ' ').includes(' ' + c + ' ')) el.className = (el.className ? el.className + ' ' : '') + c; },
      remove(c) { el.className = (' ' + el.className + ' ').replace(' ' + c + ' ', ' ').trim(); },
      contains(c) { return (' ' + el.className + ' ').includes(' ' + c + ' '); },
    },
    getAttribute(k) { return Object.prototype.hasOwnProperty.call(attrs, k) ? attrs[k] : null; },
    setAttribute(k, v) { attrs[k] = String(v); if (k === 'id') el.id = String(v); if (k === 'class') el.className = String(v); },
    removeAttribute(k) { delete attrs[k]; if (k === 'id') el.id = ''; if (k === 'class') el.className = ''; },
    appendChild(c) {
      if (c && c.parentNode && c.parentNode !== el) c.parentNode.removeChild(c);
      c.parentNode = el; el.children.push(c); el.childNodes.push(c); return c;
    },
    removeChild(c) {
      el.children = el.children.filter((x) => x !== c);
      el.childNodes = el.childNodes.filter((x) => x !== c);
      if (c) c.parentNode = null;
      return c;
    },
    addEventListener(t, fn) { (listeners[t] = listeners[t] || []).push(fn); },
    removeEventListener(t, fn) { listeners[t] = (listeners[t] || []).filter((x) => x !== fn); },
    dispatchEvent(ev) {
      ev.target = ev.target || el;
      for (const fn of (listeners[ev.type] || [])) fn(ev);
      return true;
    },
    closest(sel) {
      let cur = el;
      while (cur) {
        if (sel.startsWith('#') && cur.id === sel.slice(1)) return cur;
        if (sel.startsWith('.') && cur.classList && cur.classList.contains(sel.slice(1))) return cur;
        if (sel.startsWith('[') && sel.endsWith(']')) {
          const k = sel.slice(1, -1).split('=')[0];
          if (cur.getAttribute && cur.getAttribute(k) !== null) return cur;
        }
        cur = cur.parentNode;
      }
      return null;
    },
    contains(n) {
      let cur = n;
      while (cur) { if (cur === el) return true; cur = cur.parentNode; }
      return false;
    },
    querySelector(sel) {
      const all = el.querySelectorAll(sel);
      return all[0] || null;
    },
    querySelectorAll(sel) {
      const out = [];
      const walk = (n) => {
        for (const ch of (n.children || [])) {
          if (sel.startsWith('#') && ch.id === sel.slice(1)) out.push(ch);
          else if (sel.startsWith('.') && ch.classList && ch.classList.contains(sel.slice(1))) out.push(ch);
          else if (sel.startsWith('[data-ar6-card')) {
            if (ch.getAttribute && ch.getAttribute('data-ar6-card')) out.push(ch);
          } else if (sel.startsWith('[data-ar6]')) {
            if (ch.getAttribute && ch.getAttribute('data-ar6') !== null) out.push(ch);
          }
          walk(ch);
        }
      };
      walk(el);
      return out;
    },
    getBoundingClientRect() { return { left: 0, top: 0, width: 320, height: 480, right: 320, bottom: 480 }; },
    attachShadow() {
      const sh = makeEl('shadow-root', doc);
      el.shadowRoot = sh;
      return sh;
    },
  };
  Object.defineProperty(el, 'innerHTML', {
    get() { return _innerHTML; },
    set(v) {
      _innerHTML = String(v == null ? '' : v);
      el.children = []; el.childNodes = [];
      // Parse top-level root element id/attrs/data-ritual + card action buttons so mountHTML & click delegation work
      const rootM = /<div\b([^>]*)>/i.exec(_innerHTML);
      if (rootM && el.tagName === 'DIV' && _innerHTML.indexOf('id="ar6-card"') >= 0) {
        const card = makeEl('div', doc);
        const idM = /id="([^"]+)"/.exec(rootM[1]);
        if (idM) card.setAttribute('id', idM[1]);
        const skM = /data-skin="([^"]+)"/.exec(rootM[1]);
        if (skM) card.setAttribute('data-skin', skM[1]);
        const ritM = /data-ritual="([^"]+)"/.exec(_innerHTML);
        if (ritM) card.setAttribute('data-ritual', ritM[1]);
        card.innerHTML = '';
        card._raw = _innerHTML;
        const btnRe = /data-ar6-card="([^"]+)"/g;
        let bm;
        while ((bm = btnRe.exec(_innerHTML)) !== null) {
          const b = makeEl('button', doc);
          b.setAttribute('data-ar6-card', bm[1]);
          card.appendChild(b);
        }
        el.appendChild(card);
      }
    },
  });
  return el;
}

function makeSandbox() {
  const store = Object.create(null);
  const localStorage = {
    getItem(k) { return Object.prototype.hasOwnProperty.call(store, k) ? store[k] : null; },
    setItem(k, v) { store[k] = String(v); },
    removeItem(k) { delete store[k]; },
  };
  const timers = new Set();
  const intervals = new Set();
  const doc = {
    body: null, head: null, documentElement: null,
    createElement(t) { return makeEl(t, doc); },
    getElementById(id) {
      const find = (n) => {
        if (!n) return null;
        if (n.id === id) return n;
        for (const ch of (n.children || [])) { const r = find(ch); if (r) return r; }
        return null;
      };
      return find(doc.documentElement) || find(doc.body) || find(doc.head);
    },
    querySelector(sel) {
      if (sel.startsWith('#')) return doc.getElementById(sel.slice(1));
      return doc.body.querySelector(sel);
    },
    querySelectorAll(sel) { return doc.body.querySelectorAll(sel); },
    addEventListener() {}, removeEventListener() {},
  };
  doc.documentElement = makeEl('html', doc);
  doc.head = makeEl('head', doc);
  doc.body = makeEl('body', doc);
  doc.documentElement.appendChild(doc.head);
  doc.documentElement.appendChild(doc.body);

  const win = {
    document: doc, localStorage,
    location: { href: 'http://127.0.0.1:8000/', origin: 'http://127.0.0.1:8000', protocol: 'http:' },
    navigator: { userAgent: 'Mozilla/5.0 Chrome/125.0' },
    innerWidth: 1280, innerHeight: 800,
    visualViewport: { width: 1280, height: 800, offsetTop: 0, addEventListener() {}, removeEventListener() {} },
    matchMedia: () => ({ matches: false }),
    requestAnimationFrame: (fn) => setTimeout(fn, 0),
    fetch: async () => ({ ok: true, status: 200, headers: new Headers(), text: async () => '{}' }),
    Headers, Request, Response, URL, URLSearchParams, AbortController, TextEncoder, TextDecoder,
    console, Math, Date, JSON, RegExp, Error, TypeError, Array, Object, Number, String, Boolean, Promise, Map, Set,
    setTimeout(fn, ms) { const t = setTimeout(() => { timers.delete(t); try { fn(); } catch (_) {} }, ms); timers.add(t); return t; },
    clearTimeout(t) { timers.delete(t); clearTimeout(t); },
    setInterval(fn, ms) { const t = setInterval(() => { try { fn(); } catch (_) {} }, ms); intervals.add(t); return t; },
    clearInterval(t) { intervals.delete(t); clearInterval(t); },
    addEventListener() {}, removeEventListener() {},
    cleanup() {
      for (const t of timers) clearTimeout(t);
      for (const t of intervals) clearInterval(t);
      timers.clear(); intervals.clear();
    },
  };
  win.window = win; win.self = win; win.top = win; win.parent = win; win.globalThis = win;
  return win;
}

(async () => {
for (const fileName of TARGETS) {
  console.log(`\n=== V5.99 破暗化光·闪耀三轨全量校验: ${fileName} ===`);
  const win = makeSandbox();
  const raw = JSON.parse(fs.readFileSync(path.join(DIST_DIR, fileName), 'utf8'));
  vm.runInNewContext(raw.content, win, { filename: fileName });
  const api = win.__AR6__;
  try {
    check(api && api.VERSION === '5.99', `${fileName}: VERSION === 5.99`, api && api.VERSION);
    check(typeof api.lkDawnHTML === 'function' && typeof api.lkDawnAsk === 'function' && typeof api.lkVisualTier === 'function',
      `${fileName}: 导出 lkDawnHTML / lkDawnAsk / lkVisualTier`);
    check(api.getCfg().allTool === false, `${fileName}: 默认 allTool === false`);

    // 1. 位置验证：alltool:toggle 紧邻诺亚与凝视深渊正下方（.ar6-ult-wrap 内部），且早于 sem:toggle
    api.openPanel();
    api.setUITab('jail');
    api.setCfg('jail', 'abyss');
    api.setCfg('allTool', false);
    const jailHtmlIdle = api.uiJailHTML();
    const idxNoa = jailHtmlIdle.indexOf('tier:gatanothor');
    const idxAbyss = jailHtmlIdle.indexOf('tier:abyss');
    const idxDawn = jailHtmlIdle.indexOf('alltool:toggle');
    const idxSem = jailHtmlIdle.indexOf('sem:toggle');
    check(idxNoa > 0 && idxAbyss > idxNoa && idxDawn > idxAbyss && idxSem > idxDawn,
      `${fileName}: 按键位置精确落在诺亚 & 深渊正下方、幻影折射正上方`, `noa=${idxNoa} abyss=${idxAbyss} dawn=${idxDawn} sem=${idxSem}`);
    check(jailHtmlIdle.includes('ar6-temple-btn dawn') && jailHtmlIdle.includes('破暗化光 · 闪耀三轨'),
      `${fileName}: 奥特原皮按键样式与文案正确`);

    // 2. 点击 alltool:toggle -> 弹出第 5 套仪式弹窗（data-ritual="dawn"）-> 点确认变回闪耀迪迦！
    api.setCfg('toolChan', 'off');
    api.setCfg('jailTool', 'on');
    api.setCfg('fx', 'on');
    api.onPanelClick({ target: { getAttribute: (k) => (k === 'data-ar6' ? 'alltool:toggle' : null), parentNode: null }, type: 'click' });
    const card = win.document.getElementById('ar6-card');
    check(!!card && card._raw && card._raw.includes('data-ritual="dawn"') && card._raw.includes('变回闪耀迪迦'),
      `${fileName}: 点击破暗化光正确弹出第 5 套「由暗转明 → 变回闪耀迪迦」圣殿仪式弹窗`);
    check(api.getCfg().allTool === false, `${fileName}: 未点确认前不提前打开 cfg.allTool`);

    // 点确认按钮 dawnok
    const okBtn = card.querySelectorAll('[data-ar6-card]').find((b) => b.getAttribute('data-ar6-card') === 'dawnok');
    check(!!okBtn, `${fileName}: 弹窗含 dawnok 确认按钮`);
    card.dispatchEvent({ type: 'click', target: okBtn });
    check(api.getCfg().allTool === true, `${fileName}: 点确认后 cfg.allTool === true`);
    check(api.getCfg().toolChan === 'on' && api.getCfg().jailTool === 'off',
      `${fileName}: 确认开启后自动代开武装货舱且让出旧版工具破甲`);

    // 验证两段式黑转闪耀全屏演出 DOM
    const fxEl = win.document.getElementById('ar6-fx');
    check(!!fxEl && fxEl.getAttribute('data-fx') === 'dawn' && fxEl.innerHTML.includes('ar6-dawn-dark') && fxEl.innerHTML.includes('ar6-dawn-glitter') && fxEl.innerHTML.includes('闪耀迪迦归来'),
      `${fileName}: 确认后触发两段式黑暗裂解 → 闪耀迪迦归来全屏演出 (#ar6-fx[data-fx="dawn"])`);

    // 3. 视觉形态 & 3D 桌宠闪耀迪迦联动（cfg.jail='abyss' + allTool=true => 顶栏/圆章/桌宠变回闪耀 supreme）
    check(api.lkVisualTier() === 'supreme', `${fileName}: 深渊 + 破暗化光下 lkVisualTier() === 'supreme'`);
    const rootEl = win.document.getElementById('ar6-root');
    check(rootEl && rootEl.getAttribute('data-tier') === 'supreme' && rootEl.getAttribute('data-alltool') === '1',
      `${fileName}: #ar6-root 顶栏流光同步转为 supreme 闪耀金并挂 data-alltool="1"`);
    check(api.uiJailHTML().includes('ar6-temple-btn dawn on') && api.uiJailHTML().includes('✦ 破暗闪耀'),
      `${fileName}: 激活态按键亮起闪耀金徽标「✦ 破暗闪耀」`);

    // 再次点击 alltool:toggle（等待越过 400ms 防连点去抖窗口）-> 无需二次确认直接关闭，并还原回深渊视觉
    await new Promise((r) => setTimeout(r, 420));
    api.onPanelClick({ target: { getAttribute: (k) => (k === 'data-ar6' ? 'alltool:toggle' : null), parentNode: null }, type: 'click' });
    check(api.getCfg().allTool === false && api.lkVisualTier() === 'abyss',
      `${fileName}: 再次点击立即关闭并干净还原回 abyss 视觉`);
    check(rootEl && rootEl.getAttribute('data-tier') === 'abyss' && !rootEl.getAttribute('data-alltool'),
      `${fileName}: 关闭后 #ar6-root 恢复 data-tier="abyss" 并移除 data-alltool`);

    // 4. 后端三路全工具路由 + 多轮 tool 回执自动补齐防 400 + save_chapter 升级校验
    api.setCfg('allTool', true);
    api.setCfg('toolChan', 'on');
    api.setCfg('toolLoop', false);
    api.setCfg('grab', 0);
    api.setCfg('jailTool', 'off');
    api.setCfg('jail', 'abyss');
    const reqBody = {
      model: 'gemini-4-hydrogen',
      chat_completion_source: 'openai',
      messages: [
        { role: 'system', content: '故事世界设定' },
        { role: 'user', content: '第一轮剧情' },
        { role: 'assistant', content: null, tool_calls: [{ id: 'call_prev_1', type: 'function', function: { name: 'save_prose', arguments: '{"content":"上轮正文"}' } }] },
        { role: 'user', content: '继续下一章' },
      ],
    };
    const plan = api.planRequest(JSON.stringify(reqBody), '/api/backends/chat-completions/generate', false);
    const outB = JSON.parse(plan.body);
    const toolNames = Array.isArray(outB.tools) ? outB.tools.map((t) => t && t.function && t.function.name) : [];
    check(toolNames.length === 3 && toolNames.includes('save_prose') && toolNames.includes('save_status') && toolNames.includes('save_options'),
      `${fileName}: allTool=true 注入三路独立工具 [save_prose, save_status, save_options]`, toolNames.join(','));
    const hasReceipt = outB.messages.some((m) => m && m.role === 'tool' && m.tool_call_id === 'call_prev_1' && String(m.content || '').includes('"ok":true'));
    check(hasReceipt, `${fileName}: lkToolReceipts 自动为未闭环的历史 save_prose 补齐 {ok:true} 工具回执防 400`);

    // 4b. V5.99 冲突修复专项校验（5 大冲突逐一断言）
    // (i) allTool + toolLoop 互斥：即便 toolLoop=true，allTool 优先且不发 lk_read_turn、日志不错报
    api.setCfg('toolLoop', true);
    const planLoop = api.planRequest(JSON.stringify({
      model: 'gemini-4-hydrogen', chat_completion_source: 'custom',
      messages: [{ role: 'user', content: '测试双轮互斥' }],
    }), '/api/backends/chat-completions/generate', false);
    const outLoop = JSON.parse(planLoop.body);
    const loopNames = (outLoop.tools || []).map((t) => t.function.name);
    check(loopNames.length === 3 && !loopNames.includes('lk_read_turn') && !planLoop.changed.join('|').includes('双轮工具链'),
      `${fileName}: V5.99 allTool 优先于 toolLoop 且日志准确不错报`, loopNames.join(','));
    api.setCfg('toolLoop', false);

    // (ii) 工具定义兼容 <lk_cot> / <thinking> / <UpdateVariable>；不重复拼 LK_CARRY_NOTE；lkTypesetTxt 不写“全程自然语言直出”
    const proseDesc = outB.tools.find((t) => t.function.name === 'save_prose').function.description;
    const statusDesc = outB.tools.find((t) => t.function.name === 'save_status').function.description;
    check(proseDesc.includes('<lk_cot>') && statusDesc.includes('<UpdateVariable>'),
      `${fileName}: V5.99 三路描述明确兼容《光域·镜界》<lk_cot> 与 <UpdateVariable>`);
    const lastUserAll = outB.messages.filter((m) => m.role === 'user').pop();
    check(String(lastUserAll.content || '').includes('依次调用 save_prose') && !String(lastUserAll.content || '').includes('【正文通道】'),
      `${fileName}: V5.99 三路模式不重复叠加单轨 LK_CARRY_NOTE`);
    check(typeof api.lkTypesetTxt === 'function' && !api.lkTypesetTxt().includes('全程自然语言直出'),
      `${fileName}: V5.99 工具通道生效时 lkTypesetTxt 自动消除与工具调用打架的话术`);

    // (iii) 幂等查重 & 白名单同步：连跑两次 toolChanPatch 不重复追加；lkClassifyTools 不把 save_status 误判成外部业务引擎；lkDropOrphanTools 保护三路工具
    const dupBody = { messages: [{ role: 'user', content: '含 save_chapter 字样的玩家输入' }] };
    api.toolChanPatch(dupBody, {});
    const lenAfter1 = dupBody.messages[0].content.length;
    check(dupBody.messages[0].content.includes('依次调用 save_prose'),
      `${fileName}: V5.99 输入含 save_chapter 时三路提示词不被误跳过`);
    delete dupBody.tools;
    api.toolChanPatch(dupBody, {});
    check(dupBody.messages[0].content.length === lenAfter1,
      `${fileName}: V5.99 三路模式 toolAppendNote 严格幂等不重复追加`);
    const clsOwn = api.lkClassifyTools({ tools: outB.tools });
    check(clsOwn && clsOwn.allCarrier === true && clsOwn.hasEngine === false,
      `${fileName}: V5.99 lkClassifyTools 正确将 save_prose/save_status/save_options 识别为自家载具而非外部引擎`, JSON.stringify(clsOwn));
    const orpBody = { messages: [{ role: 'user', content: '无工具名正文' }], tools: JSON.parse(JSON.stringify(outB.tools)) };
    const droppedOrp = api.lkDropOrphanTools(orpBody);
    check(droppedOrp === 0 && Array.isArray(orpBody.tools) && orpBody.tools.length === 3,
      `${fileName}: V5.99 lkDropOrphanTools 完整保护三路工具不被误删`, `dropped=${droppedOrp}`);

    // (iv) 流式工具名分片 save_p + rose 不再误判成外部工具 + 三路解包（流式/非流式/断流抢救）自动补 \n\n 分段
    const uwChunk = api.toolCreateUnwrapper();
    const cf1 = uwChunk.handleObj({ choices: [{ index: 0, delta: { tool_calls: [{ index: 0, id: 'c1', type: 'function', function: { name: 'save_p', arguments: '' } }] }, finish_reason: null }] });
    const cf2 = uwChunk.handleObj({ choices: [{ index: 0, delta: { tool_calls: [{ index: 0, function: { name: 'rose', arguments: '{"content":"分片正文。"}' } }] }, finish_reason: null }] });
    const cf3 = uwChunk.handleObj({ choices: [{ index: 0, delta: { tool_calls: [{ index: 1, id: 'c2', type: 'function', function: { name: 'save_status', arguments: '{"content":"<lk_status>HP:99</lk_status>"}' } }] }, finish_reason: null }] });
    const cf4 = uwChunk.handleObj({ choices: [{ index: 0, delta: { tool_calls: [{ index: 2, id: 'c3', type: 'function', function: { name: 'save_options', arguments: '{"content":"<lk_choices>1.前进</lk_choices>"}' } }] }, finish_reason: 'tool_calls' }] });
    const joinedStream = [cf1, cf2, cf3, cf4].map((x) => (x && x.choices && x.choices[0] && x.choices[0].delta && x.choices[0].delta.content) || '').join('');
    check(!cf1.choices[0].delta.tool_calls && joinedStream === '分片正文。\n\n<lk_status>HP:99</lk_status>\n\n<lk_choices>1.前进</lk_choices>',
      `${fileName}: V5.99 流式分片 save_p+rose 正常解包且三路自动以 \\n\\n 分段`, JSON.stringify(joinedStream));

    const nonStreamObj = {
      choices: [{
        message: {
          role: 'assistant', content: null,
          tool_calls: [
            { id: 'n1', type: 'function', function: { name: 'save_prose', arguments: '{"content":"非流正文。"}' } },
            { id: 'n2', type: 'function', function: { name: 'save_status', arguments: '{"content":"<lk_status>MP:50</lk_status>"}' } },
            { id: 'n3', type: 'function', function: { name: 'save_options', arguments: '{"content":"1.A\\n2.B"}' } },
          ],
        },
        finish_reason: 'tool_calls',
      }],
    };
    api.toolFixJson(nonStreamObj);
    check(nonStreamObj.choices[0].message.content === '非流正文。\n\n<lk_status>MP:50</lk_status>\n\n1.A\n2.B',
      `${fileName}: V5.99 非流式 toolFixJson 三路按槽独立提取并以 \\n\\n 分隔`, JSON.stringify(nonStreamObj.choices[0].message.content));

    const salvRaw = 'data: {"choices":[{"delta":{"tool_calls":[{"index":0,"function":{"name":"save_prose","arguments":"{\\"content\\":\\"抢救正文\\"}"}}]}}]}\n\n'
      + 'data: {"choices":[{"delta":{"tool_calls":[{"index":1,"function":{"name":"save_status","arguments":"{\\"content\\":\\"抢救状态\\"}"}}]}}]}\n\n';
    const salvRes = api.lkSalvageIncompleteText(salvRaw, 'save_chapter');
    check(salvRes && salvRes.text === '抢救正文\n\n抢救状态',
      `${fileName}: V5.99 断流抢救 lkSalvageIncompleteText 多槽按 \\n\\n 分段`, JSON.stringify(salvRes));

    // (v) 双向开关防假亮灯：关武装货舱 / 开 tool-loop / 飞燕编队暂避
    api.setCfg('allTool', true);
    api.setCfg('toolChan', 'on');
    api.setCfg('grab', 2);
    check(api.lkVisualTier() === 'abyss' && api.uiJailHTML().includes('飞燕暂避'),
      `${fileName}: V5.99 飞燕编队开启时保留 allTool 配置但视觉与文案显式标「飞燕暂避」不假亮`);
    api.setCfg('grab', 0);
    await new Promise((r) => setTimeout(r, 420));
    api.onPanelClick({ target: { getAttribute: (k) => (k === 'data-ar6' ? 'tool-off' : null), parentNode: null }, type: 'click' });
    check(api.getCfg().toolChan === 'off' && api.getCfg().allTool === false && api.lkVisualTier() === 'abyss',
      `${fileName}: V5.99 关闭武装货舱同步收束 allTool 并还原深渊视觉`);
    api.setCfg('toolChan', 'on');
    api.setCfg('allTool', true);
    await new Promise((r) => setTimeout(r, 420));
    api.onPanelClick({ target: { getAttribute: (k) => (k === 'data-ar6' ? 'tool-loop' : null), parentNode: null }, type: 'click' });
    check(api.getCfg().toolLoop === true && api.getCfg().allTool === false,
      `${fileName}: V5.99 手动开启双轮工具链时自动让位关闭 allTool`);
    api.setCfg('toolLoop', false);

    // 单工具模式 save_chapter 检验
    api.setCfg('allTool', false);
    api.setCfg('toolChan', 'on');
    const plan1 = api.planRequest(JSON.stringify({
      model: 'gemini-4-hydrogen',
      chat_completion_source: 'openai',
      messages: [{ role: 'system', content: '世界' }, { role: 'user', content: '继续' }],
    }), '/api/backends/chat-completions/generate', false);
    const out1 = JSON.parse(plan1.body);
    check(Array.isArray(out1.tools) && out1.tools.length === 1 && out1.tools[0].function.name === 'save_chapter',
      `${fileName}: 关闭 allTool 后回退单路 save_chapter 工具`);

    // 5. 全 10 套皮肤专属暗转明按键文案 + 第 5 套仪式弹窗 + 觉醒演出全覆盖
    for (const skId of SKINS) {
      api.setCfg('skin', skId);
      api.setCfg('allTool', false);
      const jHtml = api.uiJailHTML();
      const dModal = api.lkDawnHTML();
      check(jHtml.includes('alltool:toggle') && jHtml.includes('ar6-temple-btn dawn'),
        `${fileName}: 皮肤[${skId}] 正常渲染破暗化光按键`);
      check(dModal.includes('data-ritual="dawn"') && dModal.includes(`data-skin="${skId}"`) && dModal.includes('data-ar6-card="dawnok"'),
        `${fileName}: 皮肤[${skId}] 专属 dawn 仪式弹窗完整渲染`);
      api.triggerAwakenFx('dawn');
      const skFx = win.document.getElementById('ar6-fx');
      check(!!skFx && (skId === 'ultra' ? skFx.getAttribute('data-fx') === 'dawn' : skFx.getAttribute('data-skin') === skId),
        `${fileName}: 皮肤[${skId}] dawn 觉醒全屏演出成功挂载`);
    }
    api.setCfg('skin', 'ultra');
  } finally {
    try { api.dispose(); } catch (_) {}
    win.cleanup();
  }
}

console.log(`\n========== V5.99 破暗化光专项回归汇总：PASS=${pass} FAIL=${fail} ==========`);
process.exit(fail > 0 ? 1 : 0);
})();
