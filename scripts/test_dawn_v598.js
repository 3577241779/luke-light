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
    check(api && api.VERSION === '7.1', `${fileName}: VERSION === 7.1`, api && api.VERSION);
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
    check(jailHtmlIdle.includes('ar6-temple-btn dawn') && jailHtmlIdle.includes('破暗化光 · 纯文耀光'),
      `${fileName}: 奥特原皮按键样式与 V6.2 纯文耀光文案正确`);

    // 2. 点击 alltool:toggle -> 弹出第 5 套仪式弹窗（data-ritual="dawn"）-> 点确认变回闪耀迪迦！
    api.setCfg('toolChan', 'off');
    api.setCfg('jailTool', 'on');
    api.setCfg('fx', 'on');
    api.onPanelClick({ target: { getAttribute: (k) => (k === 'data-ar6' ? 'alltool:toggle' : null), parentNode: null }, type: 'click' });
    const card = win.document.getElementById('ar6-card');
    check(!!card && card._raw && card._raw.includes('data-ritual="dawn"') && card._raw.includes('变回闪耀迪迦'),
      `${fileName}: 点击破暗化光正确弹出第 5 套「由暗转明 → 变回闪耀迪迦」圣殿仪式弹窗`);
    check(api.getCfg().allTool === false, `${fileName}: 未点确认前不提前打开 cfg.allTool`);

    // 点确认按钮 dawnok（V6.2：不再代开 toolChan，严格单档互斥：allTool=true, jail='off'）
    const okBtn = card.querySelectorAll('[data-ar6-card]').find((b) => b.getAttribute('data-ar6-card') === 'dawnok');
    check(!!okBtn, `${fileName}: 弹窗含 dawnok 确认按钮`);
    card.dispatchEvent({ type: 'click', target: okBtn });
    check(api.getCfg().allTool === true && api.getCfg().jail === 'off' && api.getCfg().jailSupremeConfirmed === false,
      `${fileName}: 点确认后 cfg.allTool === true 且严格互斥归位 jail=off`);
    check(api.getCfg().toolChan === 'off' && api.getCfg().jailTool === 'off',
      `${fileName}: V6.2 确认开启后绝不强开武装货舱且让出旧版工具破甲`);

    // 验证两段式黑转闪耀全屏演出 DOM
    const fxEl = win.document.getElementById('ar6-fx');
    check(!!fxEl && fxEl.getAttribute('data-fx') === 'dawn' && fxEl.innerHTML.includes('ar6-dawn-dark') && fxEl.innerHTML.includes('ar6-dawn-glitter') && fxEl.innerHTML.includes('闪耀迪迦归来 · 纯文耀光全量就绪'),
      `${fileName}: 确认后触发两段式黑暗裂解 → 闪耀迪迦归来纯文耀光全屏演出 (#ar6-fx[data-fx="dawn"])`);

    // 3. 视觉形态 & 3D 桌宠闪耀迪迦联动（toolChan=off + allTool=true + jail=off => 顶栏/圆章/桌宠仍变回闪耀 supreme，且仅破暗化光按钮亮 .on！）
    check(api.lkVisualTier() === 'supreme', `${fileName}: 破暗化光(allTool=true, jail=off) 下 lkVisualTier() === 'supreme'`);
    const rootEl = win.document.getElementById('ar6-root');
    check(rootEl && rootEl.getAttribute('data-tier') === 'supreme' && rootEl.getAttribute('data-alltool') === '1',
      `${fileName}: #ar6-root 顶栏流光同步转为 supreme 闪耀金并挂 data-alltool="1"`);
    const jailHtmlDawn = api.uiJailHTML();
    check(jailHtmlDawn.includes('ar6-temple-btn dawn on') && jailHtmlDawn.includes('✦ 破暗闪耀') &&
      !jailHtmlDawn.includes('class="ar6-ubtn on" data-form=') &&
      !jailHtmlDawn.includes('ar6-temple-btn noa on') && !jailHtmlDawn.includes('ar6-ultb deep on'),
      `${fileName}: 破暗化光激活态仅亮起破暗化光单一按钮（其余七档均不亮 .on）`);

    // 再次点击 alltool:toggle（等待越过 400ms 防连点去抖窗口）-> 无需二次确认直接关闭，严格回到石像待机
    await new Promise((r) => setTimeout(r, 420));
    api.onPanelClick({ target: { getAttribute: (k) => (k === 'data-ar6' ? 'alltool:toggle' : null), parentNode: null }, type: 'click' });
    check(api.getCfg().allTool === false && api.getCfg().jail === 'off' && api.lkVisualTier() === 'off',
      `${fileName}: 再次点击立即关闭并干净归位石像待机 (allTool=false, jail=off)`);
    check(rootEl && rootEl.getAttribute('data-tier') === 'off' && !rootEl.getAttribute('data-alltool'),
      `${fileName}: 关闭后 #ar6-root 恢复 data-tier="off" 并移除 data-alltool`);

    // 4. V6.2 后端纯文全量 \uXXXX 转译 + 注音/探针护航 + 彻底根治 C1 工具脑裂冲突
    api.setCfg('allTool', true);
    api.setCfg('toolChan', 'on');
    api.setCfg('toolLoop', true);
    api.setCfg('grab', 0);
    api.setCfg('jailTool', 'off');
    api.setCfg('jail', 'abyss');
    api.setCfg('jailSupremeConfirmed', true);
    api.setCfg('wire', 'auto');
    api.setCfg('armor', 'auto');
    api.setCfg('zhuyin', 'auto');
    api.setCfg('canary', 'auto');
    const reqBody = {
      model: 'gemini-4-hydrogen',
      chat_completion_source: 'openai',
      messages: [
        { role: 'system', content: '故事世界设定' },
        { role: 'user', content: '她轻声娇吟着继续推进下一章' },
      ],
    };
    const plan = api.planRequest(JSON.stringify(reqBody), '/api/backends/chat-completions/generate', false);
    const outB = JSON.parse(plan.body);
    check(!plan.proto && !plan.tool && !outB.tools && !outB.tool_choice,
      `${fileName}: V6.2 allTool=true 即使叠加 toolChan=on/toolLoop=true 也绝不注入任何 tools/tool_choice（零脑裂）`);
    check(!/[^\x00-\x7F]/.test(plan.body),
      `${fileName}: V6.2 allTool=true 全量非 ASCII 转为 \\uXXXX 透明传输`);
    check(plan.canary === true && JSON.stringify(outB).includes('【校验】') && JSON.stringify(outB).includes('【注音说明】'),
      `${fileName}: V6.2 allTool=true 正常联动注音层与三枚零宽探针`);
    check(typeof api.lkTypesetTxt === 'function' && api.lkTypesetTxt().includes('全程自然语言直出'),
      `${fileName}: V6.2 allTool=true 纯文模式下 lkTypesetTxt 与纯文直出口径一致`);
    api.setCfg('toolLoop', false);

    // 4b. 保留多槽历史/流式分片与工具通道兼容测试（关闭 allTool 后单路工具解包完好）
    const uwChunk = api.toolCreateUnwrapper();
    const cf1 = uwChunk.handleObj({ choices: [{ index: 0, delta: { tool_calls: [{ index: 0, id: 'c1', type: 'function', function: { name: 'save_p', arguments: '' } }] }, finish_reason: null }] });
    const cf2 = uwChunk.handleObj({ choices: [{ index: 0, delta: { tool_calls: [{ index: 0, function: { name: 'rose', arguments: '{"content":"分片正文。"}' } }] }, finish_reason: null }] });
    const cf3 = uwChunk.handleObj({ choices: [{ index: 0, delta: { tool_calls: [{ index: 1, id: 'c2', type: 'function', function: { name: 'save_status', arguments: '{"content":"<lk_status>HP:99</lk_status>"}' } }] }, finish_reason: null }] });
    const cf4 = uwChunk.handleObj({ choices: [{ index: 0, delta: { tool_calls: [{ index: 2, id: 'c3', type: 'function', function: { name: 'save_options', arguments: '{"content":"<lk_choices>1.前进</lk_choices>"}' } }] }, finish_reason: 'tool_calls' }] });
    const joinedStream = [cf1, cf2, cf3, cf4].map((x) => (x && x.choices && x.choices[0] && x.choices[0].delta && x.choices[0].delta.content) || '').join('');
    check(!cf1.choices[0].delta.tool_calls && joinedStream === '分片正文。\n\n<lk_status>HP:99</lk_status>\n\n<lk_choices>1.前进</lk_choices>',
      `${fileName}: 流式分片 save_p+rose 历史兼容解包与 \\n\\n 分段保持完好`, JSON.stringify(joinedStream));

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
      `${fileName}: 非流式 toolFixJson 多槽按 \\n\\n 分隔保持完好`, JSON.stringify(nonStreamObj.choices[0].message.content));

    // (v) V6.2 开关独立性：飞燕暂避保留配置；关闭武装货舱或能量续航不再误关 allTool；手动开启双轮工具链时让位关闭 allTool
    api.setCfg('allTool', true);
    api.setCfg('jail', 'off');
    api.setCfg('toolChan', 'on');
    api.setCfg('grab', 2);
    check(api.lkVisualTier() === 'off' && api.uiJailHTML().includes('飞燕暂避') && api.uiTierMeta().gem === '飞燕暂避',
      `${fileName}: 飞燕编队开启时保留 allTool 配置但视觉与文案显式标「飞燕暂避」不假亮`);
    api.setCfg('grab', 0);
    await new Promise((r) => setTimeout(r, 420));
    api.onPanelClick({ target: { getAttribute: (k) => (k === 'data-ar6' ? 'tool-off' : null), parentNode: null }, type: 'click' });
    check(api.getCfg().toolChan === 'off' && api.getCfg().allTool === true && api.lkVisualTier() === 'supreme',
      `${fileName}: V6.2 关闭武装货舱不再误关破暗化光，闪耀视觉持续生效`);
    await new Promise((r) => setTimeout(r, 420));
    api.onPanelClick({ target: { getAttribute: (k) => (k === 'data-ar6' ? 'gm:trunc:0' : null), parentNode: null }, type: 'click' });
    check(api.getCfg().allTool === true && api.lkVisualTier() === 'supreme',
      `${fileName}: V6.2 关闭能量续航不再误关破暗化光`);
    api.setCfg('trunc', 'medium');
    api.setCfg('toolChan', 'on');
    await new Promise((r) => setTimeout(r, 420));
    api.onPanelClick({ target: { getAttribute: (k) => (k === 'data-ar6' ? 'tool-loop' : null), parentNode: null }, type: 'click' });
    check(api.getCfg().toolLoop === true && api.getCfg().allTool === false,
      `${fileName}: 手动开启双轮工具链时自动让位关闭 allTool`);
    api.setCfg('toolLoop', false);

    // 单工具模式 save_chapter 检验（非 abyss 档 + allTool=false + toolChan=on）
    api.setCfg('allTool', false);
    api.setCfg('jail', 'strong');
    api.setCfg('toolChan', 'on');
    const plan1 = api.planRequest(JSON.stringify({
      model: 'gemini-4-hydrogen',
      chat_completion_source: 'openai',
      messages: [{ role: 'system', content: '世界' }, { role: 'user', content: '继续' }],
    }), '/api/backends/chat-completions/generate', false);
    const out1 = JSON.parse(plan1.body);
    check(Array.isArray(out1.tools) && out1.tools.length === 1 && out1.tools[0].function.name === 'save_chapter',
      `${fileName}: 关闭 allTool 后强力档 + 武装货舱正常走单路 save_chapter 工具`);

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
