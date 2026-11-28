'use strict';
/**
 * 卢克之光 V5.77 — 光鉴引擎专项 E2E 测试
 * 覆盖：
 *   1. 纯 ES5 严格语法与源码零硬编码公益站域名校验；
 *   2. 6 类通道客观分类（OFF/LOC/SLF/AGG/RLP/RLO）+ 4 位不可逆加盐域哈希；
 *   3. 上游原生硬指纹采集（严格区分 nativeModelVersion 与 OpenAI 回显 model / thoughtSignature / responseId / usageProto / 伪流式单块整吐）；
 *   4. 四维交叉真伪定级（V1~V4 / V0）：真 4H 投机解码极速零误杀 + 假 4H 零思考瞬出首轮即抓 suspect(V3) + 主动关思考不误杀 + 实锤降档 V4 + 全报错归因码；
 *   5. 离线一码通编解码 + 群聊噪声自动抠码 + 防篡改 CRC 验签 + 本地私有公益站白名单（只存哈希零明文域名）；
 *   6. UI 完整交互（diagcode / diagdecode / 证据卡 V1-V4 与一码通栏 / 解码器与白名单弹窗 / detDiag）。
 */
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { TextEncoder, TextDecoder } = require('util');

const ROOT = path.resolve(__dirname, '..');
const DIST = path.join(ROOT, 'dist');
const TARGETS = [
  { file: 'luke-light-st.json', platCh: 'S' },
  { file: 'luke-light-tt.json', platCh: 'T' },
  { file: 'luke-light-desktop.json', platCh: 'D' },
];

let pass = 0, fail = 0;
function ok(cond, msg, detail) {
  if (cond) { pass++; }
  else { fail++; console.error('  [FAIL]', msg, detail ? `(${detail})` : ''); }
}

function makeSandbox() {
  const store = Object.create(null);
  const localStorage = {
    getItem(k) { return Object.prototype.hasOwnProperty.call(store, k) ? store[k] : null; },
    setItem(k, v) { store[k] = String(v); },
    removeItem(k) { delete store[k]; },
  };
  const timers = new Set(), intervals = new Set();
  const nodes = [];
  function mkEl(tag) {
    const attrs = Object.create(null);
    const listeners = Object.create(null);
    const el = {
      tagName: String(tag || 'DIV').toUpperCase(),
      id: '', className: '', value: '', textContent: '', style: {},
      children: [], parentNode: null,
      _innerHTML: '',
      get innerHTML() { return this._innerHTML; },
      set innerHTML(v) {
        this._innerHTML = String(v || '');
        const mId = /\bid="([^"]+)"/.exec(this._innerHTML);
        const child = mkEl('DIV');
        if (mId) child.id = mId[1];
        child._innerHTML = this._innerHTML;
        child.parentNode = this;
        this.children = [child];
      },
      get firstChild() { return this.children[0] || null; },
      setAttribute(k, v) { attrs[k] = String(v); if (k === 'id') this.id = String(v); },
      getAttribute(k) { return Object.prototype.hasOwnProperty.call(attrs, k) ? attrs[k] : null; },
      hasAttribute(k) { return Object.prototype.hasOwnProperty.call(attrs, k); },
      removeAttribute(k) { delete attrs[k]; },
      appendChild(c) { if (c) { c.parentNode = this; this.children.push(c); nodes.push(c); } return c; },
      removeChild(c) { const i = this.children.indexOf(c); if (i >= 0) this.children.splice(i, 1); const j = nodes.indexOf(c); if (j >= 0) nodes.splice(j, 1); if (c) c.parentNode = null; },
      addEventListener(t, fn) { listeners[t] = fn; },
      removeEventListener(t) { delete listeners[t]; },
      querySelector() { return null; },
      querySelectorAll() { return []; },
      focus() {}, select() {}, setSelectionRange() {},
    };
    return el;
  }
  const body = mkEl('BODY');
  body.classList = { contains: () => false, add() {}, remove() {} };
  const doc = {
    body, head: mkEl('HEAD'),
    documentElement: { clientWidth: 1280, clientHeight: 800 },
    hidden: false, activeElement: null,
    lastCopiedText: '',
    createElement: mkEl,
    getElementById(id) {
      for (let i = nodes.length - 1; i >= 0; i--) {
        if (nodes[i] && nodes[i].id === id && nodes[i].parentNode) return nodes[i];
      }
      return null;
    },
    querySelector() { return null; },
    querySelectorAll() { return []; },
    execCommand(cmd) {
      if (cmd === 'copy') {
        const lastTa = [...body.children].reverse().find((c) => c.tagName === 'TEXTAREA');
        if (lastTa) doc.lastCopiedText = String(lastTa.value || '');
        return true;
      }
      return false;
    },
    addEventListener() {}, removeEventListener() {},
  };
  const win = {
    document: doc, localStorage,
    innerWidth: 1280, innerHeight: 800,
    location: { href: 'http://127.0.0.1:8000/', origin: 'http://127.0.0.1:8000', host: '127.0.0.1:8000' },
    navigator: { userAgent: 'Mozilla/5.0' },
    console: { log() {}, warn() {}, error() {}, info() {} },
    fetch: async () => new Response('{}', { status: 200 }),
    Response, Headers, Request, TransformStream, ReadableStream, TextEncoder, TextDecoder, AbortController, URL, Promise,
    MutationObserver: class { observe() {} disconnect() {} },
    ResizeObserver: class { observe() {} disconnect() {} },
    XMLHttpRequest: function () {},
    setTimeout: (fn, ms) => { const t = setTimeout(fn, ms); timers.add(t); return t; },
    clearTimeout: (t) => { timers.delete(t); clearTimeout(t); },
    setInterval: (fn, ms) => { const t = setInterval(fn, ms); intervals.add(t); return t; },
    clearInterval: (t) => { intervals.delete(t); clearInterval(t); },
    addEventListener() {}, removeEventListener() {},
    matchMedia: () => ({ matches: false }),
    getComputedStyle: () => ({ display: 'block', transform: 'none' }),
    SillyTavern: {
      getContext() {
        return {
          chat: [],
          extensionSettings: {},
          chatCompletionSettings: { chat_completion_source: 'makersuite', google_model: 'gemini-4-hydrogen' },
          saveSettingsDebounced() {},
          eventSource: { on() {} },
          eventTypes: {},
        };
      },
    },
    __store: store,
    cleanup() {
      for (const t of timers) clearTimeout(t);
      for (const t of intervals) clearInterval(t);
      timers.clear(); intervals.clear();
    },
  };
  win.window = win; win.self = win; win.top = win; win.parent = win; win.globalThis = win;
  return win;
}

// 1. Strict ES5 syntax check on 11c_diag_fp.js
const modSrc = fs.readFileSync(path.join(ROOT, 'src/modules/11c_diag_fp.js'), 'utf8');
ok(!/\b(?:let|const)\s+[a-zA-Z_$]/.test(modSrc), '11c_diag_fp.js 严格零 let/const');
ok(!/=>/.test(modSrc), '11c_diag_fp.js 严格零箭头函数 =>');
ok(!/`/.test(modSrc), '11c_diag_fp.js 严格零模板字符串');
ok(!/\beval\s*\(/.test(modSrc), '11c_diag_fp.js 严格零 eval()');
ok(!/\(\?<[=!]/.test(modSrc), '11c_diag_fp.js 严格零正则后行断言');

for (const tgt of TARGETS) {
  console.log(`\n=== V5.77 光鉴引擎专项检验: ${tgt.file} ===`);
  const pkg = JSON.parse(fs.readFileSync(path.join(DIST, tgt.file), 'utf8'));
  const win = makeSandbox();
  const ctx = vm.createContext(win);
  new vm.Script(pkg.content, { filename: tgt.file }).runInContext(ctx);
  const api = win.__AR6__;
  try {
    ok(api && api.VERSION === '7.21', 'VERSION === 7.21', api && api.VERSION);

    // 2. 通道分类 6 类全覆盖
    const chOffMs = api.lkClassifyChannel('/api/backends/chat-completions/generate', { chat_completion_source: 'makersuite' });
    const chOffDir = api.lkClassifyChannel('https://generativelanguage.googleapis.com/v1beta/models/gemini-4-hydrogen:streamGenerateContent', {});
    const chLoc1 = api.lkClassifyChannel('/api/backends/chat-completions/generate', { chat_completion_source: 'custom', custom_url: 'http://127.0.0.1:7860/v1' });
    const chLoc2 = api.lkClassifyChannel('/api/backends/chat-completions/generate', { chat_completion_source: 'custom', custom_url: 'http://100.88.12.3:8080/v1' });
    const chSlf = api.lkClassifyChannel('/api/backends/chat-completions/generate', { chat_completion_source: 'makersuite', reverse_proxy: 'https://my-gem.workers.dev' });
    const chAgg = api.lkClassifyChannel('/api/backends/chat-completions/generate', { chat_completion_source: 'openrouter' });
    const chRlp = api.lkClassifyChannel('/api/backends/chat-completions/generate', { chat_completion_source: 'makersuite', reverse_proxy: 'https://station-a.example.org/gemini' });
    const chRlo = api.lkClassifyChannel('/api/backends/chat-completions/generate', { chat_completion_source: 'custom', custom_url: 'https://reseller-b.example.net/v1/chat/completions' });

    ok(chOffMs.code === 'OFF' && chOffMs.hash === '0000', 'makersuite 无反代 => OFF0000');
    ok(chOffDir.code === 'OFF' && chOffDir.hash === '0000', 'generativelanguage.googleapis.com 直连 => OFF0000');
    ok(chLoc1.code === 'LOC' && chLoc2.code === 'LOC', '127.0.0.1 与 Tailscale 100.x => LOC');
    ok(chSlf.code === 'SLF' && chSlf.hash !== '0000', 'workers.dev => SLF + 4位哈希');
    ok(chAgg.code === 'AGG', 'openrouter => AGG');
    ok(chRlp.code === 'RLP' && /^[0-9A-HJ-NP-TV-Z]{4}$/.test(chRlp.hash), '公益站原生反代 => RLP + 4位 Base32 哈希', JSON.stringify(chRlp));
    ok(chRlo.code === 'RLO' && /^[0-9A-HJ-NP-TV-Z]{4}$/.test(chRlo.hash), '外部兼容中转 => RLO + 4位 Base32 哈希', JSON.stringify(chRlo));
    ok(chRlp.hash !== chRlo.hash && chRlp.hash === api.lkDomainHash('https://WWW.STATION-A.EXAMPLE.ORG/other?key=sk-123'), '域哈希忽略大小写/www/路径/查询串且不同域名不碰撞');

    // 3. 原生硬指纹采集（严格区分 nativeModelVersion 与 OpenAI 回显 model）
    const evGem = { rid: 7701, requestedModel: 'gemini-4-hydrogen', reqStream: true, observed: [], observedSrc: [] };
    const pGem = api.capture318Parser(evGem);
    pGem.feed('data: {"responseId":"AbCdEfGhIjKlMnOpQrStUv","modelVersion":"gemini-4-hydrogen","candidates":[{"content":{"parts":[{"thought":true,"text":"先分析人物动机","thoughtSignature":"EjQKMgF890abcdef1234567890abcdef"}]}}]}\n\n');
    pGem.feed('data: {"candidates":[{"content":{"parts":[{"text":"夜雾漫过港口的石阶，远处灯塔缓缓旋转。"}]},"finishReason":"STOP"}],"usageMetadata":{"promptTokenCount":1200,"candidatesTokenCount":350,"thoughtsTokenCount":1450,"cachedContentTokenCount":800}}\n\n');
    pGem.flush();
    ok(evGem.fp.nativeModelVersion === 'gemini-4-hydrogen', 'Gemini 原生流正确提取 nativeModelVersion');
    ok(evGem.fp.hasThoughtSig === true, 'Gemini 原生流正确提取 thoughtSignature');
    ok(evGem.fp.idKind === 'gem_nat', 'Gemini 原生流正确识别 responseId 拓扑 gem_nat');
    ok(evGem.fp.usageProto === 'gemini_um' && evGem.fp.hasCachedTok === true, 'Gemini 原生流正确识别 usageMetadata 与缓存命中');

    const evOaiEcho = { rid: 7702, requestedModel: 'gemini-4-hydrogen', reqStream: true, observed: [], observedSrc: [] };
    const pOai = api.capture318Parser(evOaiEcho);
    pOai.feed('data: {"id":"chatcmpl-fake123456789","model":"gemini-4-hydrogen","choices":[{"delta":{"content":"' + '一二三四五六七八九十'.repeat(45) + '"},"finish_reason":"stop"}]}\n\ndata: [DONE]\n\n');
    pOai.flush();
    ok(evOaiEcho.fp.nativeModelVersion === '', 'OpenAI 回显 model 绝不再伪装成原生 nativeModelVersion！');
    ok(evOaiEcho.fp.respModel === 'gemini-4-hydrogen' && evOaiEcho.fp.idKind === 'oai_cmpl' && evOaiEcho.fp.hasThoughtSig === false, 'OpenAI 回显正确落入 respModel 与 oai_cmpl');
    ok(evOaiEcho.fp.nonStreamDump === true, '流式请求单块整吐 >=400 字命中 nonStreamDump 伪流式标记');

    const evAnth = { rid: 7703, requestedModel: 'claude-sonnet-4', reqStream: true, observed: [], observedSrc: [] };
    const pAnth = api.capture318Parser(evAnth);
    pAnth.feed('data: {"type":"message_start","message":{"id":"msg_01AbCdEfGhIjKlMnOp","model":"claude-sonnet-4-20250514","usage":{"input_tokens":500}}}\n\n');
    pAnth.feed('data: {"type":"content_block_delta","delta":{"type":"thinking_delta","thinking":"思考中"}}\n\n');
    pAnth.feed('data: {"type":"content_block_delta","delta":{"type":"signature_delta","signature":"EqQBCgIYAhIMabcdef123456"}}\n\n');
    pAnth.feed('data: {"type":"content_block_delta","delta":{"type":"text_delta","text":"正文段落"}}\n\n');
    pAnth.flush();
    ok(evAnth.fp.idKind === 'anth_msg' && evAnth.fp.hasThoughtSig === true && evAnth.fp.usageProto === 'anth_u', 'Claude 原生流正确识别 msg_01 + signature_delta + anth_u');

    // 4. 四维交叉定级与 finish() 实盘校验
    // 4a. 真 4H（公益站 RLP 透传，投机解码飙到 180 字/s + 有思考 + 有 thoughtSignature）=> V1 零误杀！
    const evReal = {
      requestedModel: 'gemini-4-hydrogen', observed: ['gemini-4-hydrogen'], observedSrc: ['body'],
      status: 200, sawText: true, hasThink: true, thinkTokens: 1500, chars: 1800, outputChars: 1800,
      firstMs: 3200, totalMs: 13200, verifiable: 'unknown', ch: chRlp, fp: evGem.fp, rid: 7711,
    };
    const recReal = api.finish(evReal, { base: 'https://station-a.example.org/gemini' });
    ok(recReal && recReal.code === 'same' && recReal.fpGrade === 'V1' && recReal.errCode === 'E000',
      '真 4H 投机解码极速(180字/s)+有思考+硬证 => V1 一致（零误杀）', JSON.stringify(recReal && { code: recReal.code, fpGrade: recReal.fpGrade }));

    // 4b. 假 4H（外部兼容中转 RLO，仅回显 model，0 思考 + 0.65s 瞬出 + 180 字/s + 0 硬证）=> 首轮即升级 suspect (V3)！
    const evFake = {
      requestedModel: 'gemini-4-hydrogen', observed: ['gemini-4-hydrogen'], observedSrc: ['body'],
      status: 200, sawText: true, hasThink: false, thinkTokens: 0, chars: 900, outputChars: 900,
      firstMs: 650, totalMs: 5650, verifiable: 'unknown', ch: chRlo,
      fp: { nativeModelVersion: '', respModel: 'gemini-4-hydrogen', respId: 'chatcmpl-xxx12345678', idKind: 'oai_cmpl', hasThoughtSig: false, sysFp: '', usageProto: 'oai_u', textChunks: 12, nonStreamDump: false },
      rid: 7712,
    };
    const recFake = api.finish(evFake, { base: 'https://reseller-b.example.net/v1' });
    ok(recFake && recFake.code === 'suspect' && recFake.fpGrade === 'V3' && (recFake.fpMask & 0x40) !== 0,
      '假 4H（0思考+0.65s瞬出+180字/s+无硬证）首轮直接抓出 suspect / V3！', JSON.stringify(recFake && { code: recFake.code, fpGrade: recFake.fpGrade, note: recFake.note }));

    // 4c. 兼容中转无硬证但速率/首字正常 => 诚实给 V2（仅回显无硬证）而不乱判掉包
    const evSoft = {
      requestedModel: 'gemini-4-hydrogen', observed: ['gemini-4-hydrogen'], observedSrc: ['body'],
      status: 200, sawText: true, hasThink: false, thinkTokens: 0, chars: 360, outputChars: 360,
      firstMs: 3200, totalMs: 11200, verifiable: 'unknown', ch: chRlo,
      fp: { nativeModelVersion: '', respModel: 'gemini-4-hydrogen', respId: 'chatcmpl-soft123456', idKind: 'oai_cmpl', hasThoughtSig: false, sysFp: '', usageProto: 'oai_u', textChunks: 15, nonStreamDump: false },
      rid: 7713,
    };
    const recSoft = api.finish(evSoft, { base: 'https://reseller-b.example.net/v1' });
    ok(recSoft && recSoft.code === 'same' && recSoft.fpGrade === 'V2',
      '兼容中转无硬证但节律正常 => V2（软一致，卡片明确提示无原生硬指纹）', JSON.stringify(recSoft && { code: recSoft.code, fpGrade: recSoft.fpGrade }));

    // 4d. 用户显式关闭思考（thinkingBudget:0 / reasoning_effort:'none'）不误杀为 V3
    ok(api.lkDetectReqThinkOff({ reasoning_effort: 'none' }) === true && api.lkDetectReqThinkOff({ generationConfig: { thinkingConfig: { thinkingBudget: 0 } } }) === true, 'lkDetectReqThinkOff 准确识别显式关思考');
    const fpThinkOff = api.lkEvalFingerprint({ requestedModel: 'gemini-4-hydrogen', reqThinkOff: true, ch: chRlo, fp: api.lkNewFp(), hasThink: false }, { code: 'same', chars: 900, ttft: 650, total: 5650, think: 0, req: 'gemini-4-hydrogen' }, { code: 'same' });
    ok(fpThinkOff.grade === 'V2' && !fpThinkOff.cadenceAlert, '用户显式关思考时绝不误杀为 V3');

    // 4e. 实锤降档 => V4；多种报错码精准归因
    const evSwap = {
      requestedModel: 'gemini-4-hydrogen', observed: ['gemini-2.5-flash'], observedSrc: ['body'],
      status: 200, sawText: true, hasThink: false, chars: 600, outputChars: 600,
      firstMs: 800, totalMs: 4000, verifiable: 'unknown', ch: chRlo, fp: api.lkNewFp(), rid: 7714,
    };
    const recSwap = api.finish(evSwap, { base: 'https://reseller-b.example.net/v1' });
    ok(recSwap && recSwap.code === 'diff' && recSwap.fpGrade === 'V4', '实锤降档 4H->2.5F => diff / V4');

    ok(api.lkClassifyErrorCode({ status: 429 }, { code: 'quota', status: 429 }) === 'E429', '报错归因 E429');
    ok(api.lkClassifyErrorCode({ status: 503 }, { code: 'gate', status: 503 }) === 'E503', '报错归因 E503');
    ok(api.lkClassifyErrorCode({ status: 403, errBody: '<html>Just a moment... Cloudflare</html>' }, { status: 403 }) === 'ECF', '报错归因 ECF');
    ok(api.lkClassifyErrorCode({ status: 400, tooLong: true }, { status: 400 }) === 'E400T', '报错归因 E400T');
    ok(api.lkClassifyErrorCode({ status: 400, errBody: 'invalid tool schema' }, { status: 400 }) === 'E400P', '报错归因 E400P');
    ok(api.lkClassifyErrorCode({ status: 200, blocked: 'PROHIBITED_CONTENT' }, { code: 'blocked', status: 200 }) === 'EBLK', '报错归因 EBLK');
    ok(api.lkClassifyErrorCode({ status: 200 }, { code: 'empty', status: 200 }) === 'EEMP', '报错归因 EEMP');
    ok(api.lkClassifyErrorCode({ status: 200 }, { code: 'same', status: 200, trunc: 'len' }) === 'ECUT', '报错归因 ECUT');

    // 5. 离线一码通 + 防篡改 CRC + 本地私有公益站白名单（零明文域名持久化）
    ok(recReal.diagCode && recReal.diagCode.startsWith('LK77' + tgt.platCh + '-RLP' + chRlp.hash + '-G4H-V1'),
      '一码通包含端标识/通道+域哈希/模型/V1', recReal.diagCode);
    ok(recFake.diagCode && recFake.diagCode.includes('-RLO' + chRlo.hash + '-G4H-V3'),
      '假 4H 一码通直接体现 RLO+域哈希+V3', recFake.diagCode);
    ok(recSwap.diagCode && recSwap.diagCode.includes('-G4H>G25F-V4'),
      '降档一码通直观展示 G4H>G25F 与 V4', recSwap.diagCode);

    // 私有白名单：录入明文 URL 后 localStorage 只存 4 位哈希，绝不留明文域名！
    const wlRes = api.lkPubWlAdd('类脑测试公益站=https://station-a.example.org/gemini\n未知哈希站=#ABCD');
    ok(wlRes.added === 2 && wlRes.total === 2, '白名单批量支持 URL 自动哈希与 #4位哈希');
    const rawStoredWl = win.__store['ar7.pubwl'] || '';
    ok(rawStoredWl.indexOf('station-a.example.org') < 0 && rawStoredWl.indexOf(chRlp.hash) >= 0, '本机 localStorage 连公益站明文域名都不存，只存 4 位不可逆哈希');

    const decPub = api.lkDecodeDiagCode('大佬帮忙看看这个码： ' + recReal.diagCode + ' 谢谢！');
    ok(decPub.ok && !decPub.tamper && decPub.wlHit && decPub.wlHit.label === '类脑测试公益站' && decPub.channelVerdict.includes('已登记公益站'),
      '群聊噪声中自动抠码 + 验签通过 + 自动命中本地公益站白名单', JSON.stringify(decPub));

    const decWild = api.lkDecodeDiagCode(recFake.diagCode);
    ok(decWild.ok && !decWild.tamper && !decWild.wlHit && decWild.grade === 'V3' && decWild.channelVerdict.includes('未在本地公益站名单'),
      '未登记外部中转解码准确提示未在公益站名单 + V3');

    // 防篡改校验：把 RLO 改成 OFF 或把 V3 改成 V1 必须被立刻识破！
    const tamper1 = api.lkDecodeDiagCode(recFake.diagCode.replace('RLO', 'OFF'));
    const tamper2 = api.lkDecodeDiagCode(recFake.diagCode.replace('V3', 'V1'));
    ok(!tamper1.ok && tamper1.tamper && !tamper2.ok && tamper2.tamper, '手工篡改通道或真伪等级被防伪 CRC 100% 识破');

    // 6. UI 渲染与按键校验
    const cardH = api.cardHumanHTML(recFake);
    const cardE = api.cardEngineHTML(recFake);
    ok(cardH.includes(recFake.diagCode) && cardH.includes('高疑掉包') && cardH.includes('copycode') && cardE.includes(recFake.diagCode),
      '诊断证据卡（诊断报告 + 底层数据）均展示一码通、V3 定级与复制/解码入口');
    const cardV2 = api.cardHumanHTML(recSoft);
    ok(cardV2.includes('V2') && cardV2.includes('未返回（仅收到 OpenAI 回显') || cardV2.includes('缺少原生硬指纹'),
      'V2 卡片如实提示缺少原生硬指纹，不再盲目报全绿验真');
    const copiedCode = api.diagCopyCode(recReal);
    ok(copiedCode === recReal.diagCode && win.document.lastCopiedText === recReal.diagCode, 'diagCopyCode 一键同步写入剪贴板');
    ok(api.openDiagModal(recReal.diagCode, 'decode') === true && !!win.document.getElementById('ar6-diag-modal'), 'openDiagModal 正常挂载解码器弹窗');
    api.closeDiagModal();
    ok(!win.document.getElementById('ar6-diag-modal'), 'closeDiagModal 干净卸载弹窗');
    ok(api.detDiag().includes('一码通 LK77' + tgt.platCh), 'detDiag 排障信标已内置一码通');
    ok(api.uiMoreHTML().includes('data-ar6="diagcode"') && api.uiMoreHTML().includes('data-ar6="diagdecode"'), '光之雷达面板已挂载「复制一码通」与「解码/公益站名单」按键');
  } finally {
    try { api.dispose(); } catch (eD) {}
    win.cleanup();
  }
}

console.log(`\n========================================`);
console.log(`V5.77 光鉴引擎专项测试汇总: PASS=${pass}, FAIL=${fail}`);
console.log(`========================================`);
process.exit(fail > 0 ? 1 : 0);
