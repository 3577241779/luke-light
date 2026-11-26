'use strict';
/**
 * 卢克之光 V5.7 · 全按键实效 + 全功能协同防打架深度测试
 *
 * 验证目标：
 *   1. 覆盖全部 4 栏所有按钮/开关：不仅验状态翻转，更验 planRequest / handleFetch / DOM 的真实落地效果；
 *   2. 覆盖 V5.7 叙述结界全维度：防全知(低/中/高)、去媚(低/中/高)、📦 贴脸包裹(auto/on/off + maxDepth:2)、
 *      ☠️ 致命后果(关/开)、OpenAI/Claude/Gemini 原生全协议、多行输入幂等可逆、绝不篡改聊天记录；
 *   3. 用多类通用预设控制块实码检验：绝不误包任何预设伪 user 规则块；礼让预设避重 vs 强权优先强制生效；
 *   4. 全功能同时拉满防打架压力测试（微扰+思考+防全知高+去媚高+贴脸包裹+致命后果+反OOC全4项+脱敏+抗截断/工具通道+7档破甲全开）；
 *   5. 安全模式休眠后等待 >3.2s 验证 3 秒看门狗绝不偷偷补挂。
 */
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { TextEncoder, TextDecoder } = require('util');

const DESKTOP_OUT_DIR = path.join(__dirname, '..', 'dist');
const TARGETS = [
  'luke-light-st.json',
  'luke-light-tt.json',
  'luke-light-desktop.json',
];

let totalPass = 0, totalFail = 0;
function check(cond, msg, detail) {
  if (cond) { totalPass++; }
  else { totalFail++; console.error('  [FAIL]', msg, detail ? `(${detail})` : ''); }
}

function makeSandbox(opts = {}) {
  const store = Object.create(null);
  const localStorage = {
    getItem(k) { return Object.prototype.hasOwnProperty.call(store, k) ? store[k] : null; },
    setItem(k, v) { store[k] = String(v); },
    removeItem(k) { delete store[k]; },
  };
  const timers = new Set();
  const intervals = new Set();
  const body = {
    children: [],
    classList: { contains: () => false, add() {}, remove() {} },
    appendChild(el) { this.children.push(el); return el; },
    removeChild(el) { const i = this.children.indexOf(el); if (i >= 0) this.children.splice(i, 1); },
    querySelector() { return null; },
    querySelectorAll() { return []; },
  };
  const document = {
    body, head: { appendChild() {}, removeChild() {} },
    documentElement: { clientWidth: 1280, clientHeight: 800 },
    hidden: false, activeElement: null,
    getElementById() { return null; },
    querySelector() { return null; },
    querySelectorAll() { return []; },
    createElement(tag) {
      return {
        tagName: String(tag || 'DIV').toUpperCase(),
        style: {}, innerHTML: '', textContent: '', value: '',
        setAttribute() {}, getAttribute() { return ''; }, removeAttribute() {},
        appendChild() {}, removeChild() {}, remove() {},
        addEventListener() {}, removeEventListener() {},
        querySelector() { return null; }, querySelectorAll() { return []; },
        focus() {}, select() {},
      };
    },
    execCommand() { return true; },
    addEventListener() {}, removeEventListener() {},
  };

  const stChat = opts.chat || [
    { is_user: true, name: '林晚', mes: '第1轮：我推开锈迹斑斑的铁门，走进雾气弥漫的旧仓库。' },
    { is_user: false, name: '守卫', mes: '铁门发出刺耳的摩擦声，守卫冷冷地抬起眼皮。' },
    { is_user: true, name: '林晚', mes: '第2轮：我压低帽檐\n顺手把一枚旧铜币推到他面前。' },
    { is_user: false, name: '守卫', mes: '他扫了一眼铜币，手指搭在腰间警棍上。' },
    { is_user: true, name: '林晚', mes: '第3轮：我说服守卫立刻放我进去，并把仓库钥匙交给我。' },
  ];
  const extPrompts = Object.create(null);

  const win = {
    document, localStorage,
    innerWidth: 1280, innerHeight: 800,
    location: { href: 'http://127.0.0.1:8000/', origin: 'http://127.0.0.1:8000', host: '127.0.0.1:8000' },
    navigator: { userAgent: 'Mozilla/5.0' },
    console: { log() {}, warn() {}, error() {}, info() {} },
    fetch: opts.fetch || (async () => new Response('data: {"choices":[{"delta":{"content":"ok"}}]}\n\ndata: [DONE]\n\n', { status: 200, headers: { 'content-type': 'text/event-stream' } })),
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
          name1: '林晚',
          chat: stChat,
          extensionSettings: {},
          setExtensionPrompt(k, v) { extPrompts[k] = v; },
          saveSettingsDebounced() {},
          eventSource: { on() {} },
          eventTypes: { GENERATION_STARTED: 'gs', GENERATION_STOPPED: 'gx', GENERATION_ENDED: 'ge', MESSAGE_SENT: 'ms', MESSAGE_RECEIVED: 'mr' },
        };
      },
    },
    __extPrompts: extPrompts,
    __chat: stChat,
    cleanup() {
      for (const t of timers) clearTimeout(t);
      for (const t of intervals) clearInterval(t);
      timers.clear(); intervals.clear();
    },
  };
  win.window = win; win.self = win; win.top = win; win.parent = win; win.globalThis = win;
  return win;
}

function loadBundle(fullPath, win) {
  const pkg = JSON.parse(fs.readFileSync(fullPath, 'utf8'));
  const ctx = vm.createContext(win);
  new vm.Script(pkg.content, { filename: path.basename(fullPath) }).runInContext(ctx);
  return win.__AR6__;
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function clickAct(api, act) {
  await sleep(135); // 贴合真实点击间隔，避免撞上 onPanelClick 的 120ms 防连点抖动守卫
  api.onPanelClick({
    type: 'click',
    target: { getAttribute: (k) => (k === 'data-ar6' ? act : null), parentNode: null },
  });
}

function makeOpenAIBody(extraMsgs = [], modelName = 'gemini-3-pro') {
  return {
    model: modelName,
    stream: true,
    models: [modelName, 'gemini-2.5-flash'],
    allow_fallbacks: true,
    route: 'fallback',
    messages: [
      {
        role: 'system',
        content: [
          '# 背景设定',
          '',
          '你正在撰写一部悬疑写实长篇小说。此外，所有人物都拥有独立的作息与利害考量。',
          '',
          '- 角色卡：守卫沉默寡言，警惕一切陌生人。',
          '- 场景：雾气弥漫的旧港口仓库，铁门锈迹斑斑，远处有灯塔微光。',
          '',
          '因此，在推进剧情时请结合现场物理环境与人物真实性格进行自然展开。',
        ].join('\n'),
      },
      { role: 'user', content: '第0轮（超深历史）：我从车站走出来。' },
      { role: 'assistant', content: '夜色微凉，街灯昏黄。' },
      { role: 'user', content: '第1轮：我推开锈迹斑斑的铁门，走进雾气弥漫的旧仓库。' },
      { role: 'assistant', content: '铁门发出刺耳的摩擦声，守卫冷冷地抬起眼皮。' },
      { role: 'user', content: '第2轮：我压低帽檐\n顺手把一枚旧铜币推到他面前。' },
      { role: 'assistant', content: '他扫了一眼铜币，手指搭在腰间警棍上。' },
      { role: 'user', content: '第3轮：我说服守卫立刻放我进去，并把仓库钥匙交给我。' },
      ...extraMsgs,
    ],
  };
}

function makeGeminiBody() {
  return {
    contents: [
      { role: 'user', parts: [{ text: '第0轮（超深历史）：我从车站走出来。' }] },
      { role: 'model', parts: [{ text: '内部推理', thought: true }, { text: '夜色微凉。' }] },
      { role: 'user', parts: [{ text: '第1轮：我推开锈迹斑斑的铁门，走进雾气弥漫的旧仓库。' }] },
      { role: 'model', parts: [{ text: '守卫冷冷地抬起眼皮。' }] },
      { role: 'user', parts: [{ text: '第2轮：我压低帽檐\n顺手把一枚旧铜币推到他面前。' }] },
      { role: 'model', parts: [{ text: '他扫了一眼铜币。' }] },
      { role: 'user', parts: [{ text: '第3轮：我说服守卫立刻放我进去，并把仓库钥匙交给我。' }] },
    ],
  };
}

async function runSuite(fileName) {
  const fullPath = path.join(DESKTOP_OUT_DIR, fileName);
  console.log(`\n=== V5.7 全按键与防打架深度校验: ${fileName} ===`);
  const win = makeSandbox();
  const api = loadBundle(fullPath, win);

  try {
    check(api && api.VERSION === '5.96', 'VERSION 为 5.96', `got=${api && api.VERSION}`);

    // =========================================================================
    // 1. 路由雷达页全按键实效校验（微扰 / 钉参数 / 思考档 / 总开关）
    // =========================================================================
    await clickAct(api, 'gm:refract:2');
    check(api.getCfg().refract === 'mid', '点击 gm:refract:2 切换微扰棱镜级');
    await clickAct(api, 'gm:think:3');
    check(api.getCfg().think === 'high', '点击 gm:think:3 切换思考档 high');
    const pRoute = api.planRequest(JSON.stringify(makeOpenAIBody([], 'claude-3-7-sonnet')), '/api/backends/chat-completions/generate', false);
    const bRoute = JSON.parse(pRoute.body);
    check(!bRoute.models && bRoute.allow_fallbacks === false && !bRoute.route, '📌 钉参数开启时对 OpenRouter/Claude 真实清除 models[] / allow_fallbacks / route');
    check(pRoute.changed.some((x) => x.includes('微扰')), '光波折射棱镜级真实改写静态区并留痕');
    const pGemThink = api.planRequest(JSON.stringify(makeOpenAIBody([], 'gemini-3-pro')), '/api/backends/chat-completions/generate', false);
    const bGemThink = JSON.parse(pGemThink.body);
    check(bGemThink.reasoning_effort === 'high' || (bGemThink.reasoning && bGemThink.reasoning.effort === 'high') || pGemThink.changed.some((x) => x.includes('思考')), '精神同调 high 真实写入思考参数');

    await clickAct(api, 'gm:think:0');
    const pThinkAuto = api.planRequest(JSON.stringify(Object.assign(makeOpenAIBody(), { reasoning_effort: 'low' })), '/api/backends/chat-completions/generate', false);
    check(JSON.parse(pThinkAuto.body).reasoning_effort === 'low', '精神同调切回 auto 时零覆写预设原有 reasoning_effort');

    await clickAct(api, '📌 钉参数:开');
    check(api.getCfg().pin === false, '点击 📌 钉参数 关闭生效');
    const pNoPin = api.planRequest(JSON.stringify(makeOpenAIBody([], 'claude-3-7-sonnet')), '/api/backends/chat-completions/generate', false);
    check(Array.isArray(JSON.parse(pNoPin.body).models), '关闭 📌 钉参数 后不再删改 models[]');
    await clickAct(api, '📌 钉参数:关');
    await clickAct(api, 'gm:refract:0');

    // =========================================================================
    // 2. 迷雾结界（防全知）3 档实效 + OpenAI / Gemini / Anthropic 全协议校验
    // =========================================================================
    for (const [idx, tier, mustContain] of [
      [1, 'lite', '画面可以拉远，人不行'],
      [2, 'mid', '禁止事后编造前文（反补设定）'],
      [3, 'full', '双向信息隔离（含主视角）'],
    ]) {
      api.setCfg('knowTip', 'off');
      await clickAct(api, `gm:know:${idx}`);
      check(api.getCfg().know === tier, `点击 gm:know:${idx} 切换防全知 ${tier}`);
      // OpenAI
      const po = api.planRequest(JSON.stringify(makeOpenAIBody()), '/api/backends/chat-completions/generate', false);
      const bo = JSON.parse(po.body);
      check(bo.messages[7].content.includes(mustContain) && bo.messages[7].content.includes('林晚') && !bo.messages[7].content.includes('<user>'),
        `防全知 ${tier} 在 OpenAI messages[] 真实注入并替换真名「林晚」`);
      // Gemini 原生 contents[]
      const pg = api.planRequest(JSON.stringify(makeGeminiBody()), 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-pro:streamGenerateContent', false);
      const bg = JSON.parse(pg.body);
      check(bg.contents[6].parts[0].text.includes(mustContain) && bg.contents[1].parts[0].text === '内部推理',
        `防全知 ${tier} 在 Gemini 原生 contents[] 真实注入且不碰 thought 节点`);
      // Anthropic array content
      const anBody = {
        model: 'claude-3-7-sonnet',
        messages: [{ role: 'user', content: [{ type: 'text', text: '我推开门。' }] }],
      };
      const pa = api.planRequest(JSON.stringify(anBody), 'https://api.anthropic.com/v1/messages', false);
      check(JSON.parse(pa.body).messages[0].content[0].text.includes(mustContain), `防全知 ${tier} 在 Anthropic 数组 content 真实注入`);
    }
    await clickAct(api, 'gm:know:0');
    check(api.getCfg().know === 'off', '点击 gm:know:0 关闭防全知');

    // =========================================================================
    // 3. 真实引力（去媚）3 档 + 📦 贴脸包裹 + ☠️ 致命后果 全组合实效校验
    // =========================================================================
    // 3a) lite 档：charmWrap='auto' 默认不包裹
    await clickAct(api, 'gm:charm:1');
    check(api.getCfg().charm === 'lite' && api.narrCharmWrapOn() === false, '去媚低档 auto 默认不强开贴脸包裹');
    const pCLite = api.planRequest(JSON.stringify(makeOpenAIBody()), '/api/backends/chat-completions/generate', false);
    const bCLite = JSON.parse(pCLite.body);
    check(bCLite.messages[7].content.includes('世界不围着人转') && !bCLite.messages[7].content.includes('〔AR-USR'),
      '去媚低档仅注规则块，不误插 AR-USR 包壳');

    // 手动点开 📦 贴脸包裹（lite 档也立即生效）
    await clickAct(api, 'charm-wrap');
    check(api.getCfg().charmWrap === 'on' && api.narrCharmWrapOn() === true, '低档手动点 📦 贴脸包裹 立即生效');
    const pCLiteWrap = api.planRequest(JSON.stringify(makeOpenAIBody()), '/api/backends/chat-completions/generate', false);
    const bCLiteWrap = JSON.parse(pCLiteWrap.body);
    check(
      bCLiteWrap.messages[7].content.includes('〔AR-USR') &&
      bCLiteWrap.messages[5].content.includes('〔AR-USR') &&
      bCLiteWrap.messages[3].content.includes('〔AR-USR') &&
      !bCLiteWrap.messages[1].content.includes('〔AR-USR'),
      '📦 贴脸包裹严格按 maxDepth:2 仅包最近 3 条真玩家发言（depth 0/1/2），不波及第 4 条历史'
    );

    // 3b) mid / full 档 + auto 联动 + ☠️ 致命后果 开/关对比
    api.setCfg('charmWrap', 'auto');
    await clickAct(api, 'gm:charm:2');
    check(api.getCfg().charm === 'mid' && api.narrCharmWrapOn() === true, '去媚中档自动联动开启贴脸包裹');
    const pCMid = api.planRequest(JSON.stringify(makeOpenAIBody()), '/api/backends/chat-completions/generate', false);
    const bCMid = JSON.parse(pCMid.body);
    check(
      bCMid.messages[7].content.includes('「林晚」跟我是两回事') &&
      bCMid.messages[7].content.includes('反神化与平衡阀') &&
      !bCMid.messages[7].content.includes('致命后果已开启') &&
      !bCMid.messages[7].content.includes('重伤乃至死亡'),
      '默认关闭致命后果时，去媚中档与三明治包裹绝不包含强制死亡文案'
    );

    // 开启 ☠️ 致命后果
    await clickAct(api, 'charm-lethal');
    check(api.getCfg().charmLethal === true && api.narrCharmLethalOn() === true, '点击 ☠️ 致命后果 开启生效');
    await clickAct(api, 'gm:charm:3');
    const pCFullLethal = api.planRequest(JSON.stringify(makeOpenAIBody()), '/api/backends/chat-completions/generate', false);
    const bCFullLethal = JSON.parse(pCFullLethal.body);
    check(
      bCFullLethal.messages[7].content.includes('致命后果已开启') &&
      bCFullLethal.messages[7].content.includes('重伤乃至死亡') &&
      bCFullLethal.messages[7].content.includes('封死隐蔽暗媚与跨级白给'),
      '高档 + 致命后果同时激活规则块与三明治后缀的高危生死代价条款'
    );

    // Gemini 原生 contents[] 同步验证三明治包裹 + 致命后果 + 多行保留
    const pGemFull = api.planRequest(JSON.stringify(makeGeminiBody()), 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-pro:streamGenerateContent', false);
    const bGemFull = JSON.parse(pGemFull.body);
    check(
      bGemFull.contents[6].parts[0].text.includes('「林晚」跟我是两回事') &&
      bGemFull.contents[6].parts[0].text.includes('重伤乃至死亡') &&
      bGemFull.contents[4].parts[0].text.includes('第2轮：我压低帽檐\n顺手把一枚旧铜币推到他面前。') &&
      !bGemFull.contents[0].parts[0].text.includes('〔AR-USR'),
      'Gemini 原生 contents[] 完整执行近2轮三明治包裹、保留多行换行且跳过超深历史'
    );

    // 幂等性验证：即使同一条消息末尾已经挂了 〔AR-TRUNC〕，连续跑 3 次 narrApply 也严格幂等，且绝不把 AR-TRUNC 吞进 <<<ACT>>>
    const idemBody = JSON.parse(pCFullLethal.body);
    const snapBefore = JSON.stringify(idemBody.messages);
    api.narrApply(idemBody);
    api.narrApply(idemBody);
    check(JSON.stringify(idemBody.messages) === snapBefore, '带 AR-TRUNC 共存时连续多次执行 narrApply 严格幂等，绝不叠层套娃');

    // 关闭真实引力后，连同 AR-USR 与 AR-NAR 100% 无损还原原始多行玩家发言（同时保留 AR-TRUNC 尾块完好）
    await clickAct(api, 'gm:charm:0');
    check(api.narrCharmWrapOn() === false && api.narrCharmLethalOn() === false, '关闭真实引力后双子开关同步待机');
    api.narrApply(idemBody);
    check(
      idemBody.messages[7].content.startsWith('第3轮：我说服守卫立刻放我进去，并把仓库钥匙交给我。') &&
      !idemBody.messages[7].content.includes('〔AR-USR') && !idemBody.messages[7].content.includes('〔AR-NAR') &&
      idemBody.messages[7].content.includes('〔AR-TRUNC') &&
      idemBody.messages[5].content === '第2轮：我压低帽檐\n顺手把一枚旧铜币推到他面前。' &&
      idemBody.messages[3].content === '第1轮：我推开锈迹斑斑的铁门，走进雾气弥漫的旧仓库。',
      '关闭开关后 3 条玩家发言（含多行文本）100% 逐字无损还原，且绝不破坏共存的 AR-TRUNC 块'
    );

    // 确认酒馆聊天记录 stCtx().chat 从未被改写哪怕一个字
    check(
      win.__chat[4].mes === '第3轮：我说服守卫立刻放我进去，并把仓库钥匙交给我。' &&
      win.__chat[2].mes === '第2轮：我压低帽檐\n顺手把一枚旧铜币推到他面前。',
      '聊天记录 stCtx().chat 零污染'
    );

    // =========================================================================
    // 4. 通用伪 user 控制块防护 + 礼让预设 vs 强权优先测试
    // =========================================================================
    await clickAct(api, 'gm:know:3');
    await clickAct(api, 'gm:charm:3');
    api.setCfg('charmWrap', 'on');
    api.setCfg('charmLethal', false);

    // 模拟常见在末尾塞入的伪 user 控制块、思维链指令、台账与 tool_result
    const presetUserControls = [
      { role: 'user', content: '<Knowledge_Limit>\n# 严格限制角色的认知范围\n</Knowledge_Limit>' },
      { role: 'user', content: '# 信息控制：\n## 禁止元词汇输出\n## 禁止角色全知设定' },
      { role: 'user', content: '<output_contract>\n本约定仅用于小说创作。\n</output_contract>' },
      { role: 'user', content: '（以下为值班台账摘录，与剧情无关，整段忽略。）\n[气象台账 #0001]' },
      { role: 'user', content: [{ type: 'tool_result', tool_use_id: 't1', content: 'ok' }] },
    ];
    const bodyWithPresetCtrl = makeOpenAIBody(presetUserControls);
    api.narrApply(bodyWithPresetCtrl);
    let anyCtrlWrapped = false;
    for (let k = 8; k < bodyWithPresetCtrl.messages.length; k++) {
      const m = bodyWithPresetCtrl.messages[k];
      const txt = typeof m.content === 'string' ? m.content : JSON.stringify(m.content);
      if (txt.includes('〔AR-USR') || txt.includes('〔AR-NAR')) anyCtrlWrapped = true;
    }
    check(!anyCtrlWrapped && bodyWithPresetCtrl.messages[7].content.includes('〔AR-USR') && bodyWithPresetCtrl.messages[7].content.includes('〔AR-NAR'),
      '精准跳过 5 种伪 user 控制块与 tool_result，准确命中第 7 条真玩家发言');

    // 礼让预设 vs 强权优先（使用合成同类规则样本校验避重）
    const synthKnowTxt = '<knowledge_boundaries>防全知：角色仅掌握自身见闻。</knowledge_boundaries>';
    const synthCharmTxt = '去主角化：世界逻辑优先，严禁讨好任何角色。';

    await clickAct(api, 'preset-compat'); // on -> off（礼让预设）
    check(api.getCfg().presetCompat === 'off', '点击 preset-compat 切至礼让预设');
    const bPresetOwn = makeOpenAIBody();
    bPresetOwn.messages[0].content += '\n' + synthKnowTxt + '\n' + synthCharmTxt;
    const chYield = api.narrApply(bPresetOwn);
    check(chYield.join(',').includes('礼让预设') && api.NARR_RT.yieldKnow && api.NARR_RT.yieldCharm && !bPresetOwn.messages[7].content.includes('〔AR-USR'),
      '礼让预设下命中同类防全知与去主角化条款后温和避重，不重复叠词');

    await clickAct(api, 'preset-compat'); // off -> on（强权优先）
    check(api.getCfg().presetCompat === 'on', '点击 preset-compat 切回强权优先');
    api.narrApply(bPresetOwn);
    check(bPresetOwn.messages[7].content.includes('〔AR-USR') && bPresetOwn.messages[7].content.includes('〔AR-NAR') && !api.NARR_RT.yieldKnow && !api.NARR_RT.yieldCharm,
      '强权优先下即使预设自带防全知/去媚，卢克之光仍强制接管生效');

    // =========================================================================
    // 5. 全功能同时拉满防打架极限压力测试（所有 7 档破甲 × 工具通道 × OOC × 脱敏 × 抗截断 × 叙述结界）
    // =========================================================================
    api.setCfg('enabled', true);
    api.setCfg('refract', 'mid');
    api.setCfg('pin', true);
    api.setCfg('think', 'high');
    api.setCfg('know', 'full');
    api.setCfg('charm', 'full');
    api.setCfg('charmWrap', 'on');
    api.setCfg('charmLethal', true);
    api.setCfg('ooc', 'on');
    api.setCfg('oocRoll', true);
    api.setCfg('oocTpl', true);
    api.setCfg('oocChg', true);
    api.setCfg('oocVoice', true);
    api.setCfg('desens', 'a');
    api.setCfg('desensUnmask', true);
    api.setCfg('trunc', 'medium');
    api.setCfg('truncTail', true);
    api.setCfg('truncNoCert', true);
    api.setCfg('jailWord', true);
    api.setCfg('jailSupremeConfirmed', true);

    const tiers = ['safe', 'mid', 'strong', 'supreme', 'gatanothor', 'abyss'];
    for (const tier of tiers) {
      api.setCfg('jail', tier);
      for (const tc of ['off', 'on']) {
        api.setCfg('toolChan', tc);
        const rawB = makeOpenAIBody();
        const origAsst = rawB.messages.filter((m) => m.role === 'assistant').map((m) => m.content);
        const plan = api.planRequest(JSON.stringify(rawB), '/api/backends/chat-completions/generate', false);
        check(!plan.reason, `全功能拉满 [${tier} / toolChan=${tc}] 无报错无回滚`, `reason=${plan.reason}`);
        const outB = JSON.parse(plan.body);
        const joined = JSON.stringify(outB);
        check(joined.includes('〔AR-USR') && joined.includes('〔AR-NAR') && joined.includes('致命后果已开启'),
          `全功能拉满 [${tier} / toolChan=${tc}] 叙述结界+贴脸包裹+致命后果完整保留`);
        // 验证破甲未因 AR-NAR/AR-USR 误判 JAIL_OWN_RE 失效
        if (tier === 'strong' || tier === 'supreme' || tier === 'gatanothor' || tier === 'abyss') {
          check(outB.max_tokens >= 8192 || outB.max_completion_tokens >= 8192 || joined.includes('<spec>') || joined.includes('LK-'),
            `全功能拉满 [${tier} / toolChan=${tc}] 破甲正常落盘不被叙述层干扰`);
        }
        // 工具通道与抗截断互斥：toolChan=on 时走 lk_write 而不叠 truncApply
        if (tc === 'on') {
          check(Array.isArray(outB.tools) && outB.tools.some((t) => t && t.function && t.function.name === 'lk_write'),
            `全功能拉满 [${tier} / toolChan=on] 武装货舱 lk_write 正常挂载`);
        } else {
          check(joined.includes('收尾') || plan.changed.some((x) => x.includes('截断')),
            `全功能拉满 [${tier} / toolChan=off] 能量续航正常挂载`);
        }
        // assistant 历史消息绝不被破坏（强力以上含码点护甲仅转词表敏感词，普通句应完好）
        const afterAsst = outB.messages.filter((m) => m.role === 'assistant').map((m) => m.content);
        check(afterAsst.length === origAsst.length && afterAsst[0] === origAsst[0],
          `全功能拉满 [${tier} / toolChan=${tc}] 历史 assistant 回复不被篡改`);
      }
    }

    // Gemini 原生端点同步跑「全功能拉满（abyss）」压测
    api.setCfg('jail', 'abyss');
    api.setCfg('toolChan', 'off');
    const gemMaxPlan = api.planRequest(JSON.stringify(makeGeminiBody()), 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-pro:streamGenerateContent', false);
    const gemMaxDecoded = JSON.stringify(JSON.parse(gemMaxPlan.body));
    check(!gemMaxPlan.reason && gemMaxDecoded.includes('〔AR-USR') && gemMaxDecoded.includes('〔AR-NAR') && gemMaxDecoded.includes('致命后果已开启'),
      'Gemini 原生端点在深渊全功能拉满下零报错且叙述结界/贴脸包裹/致命后果全部落盘');

    // =========================================================================
    // 6. UI 渲染核验 + 安全模式看门狗 3.2 秒防偷挂实测
    // =========================================================================
    api.setCfg('charm', 'full');
    api.setCfg('charmWrap', 'auto');
    api.setCfg('charmLethal', true);
    const charmHtml = api.uiCharmHTML();
    check(charmHtml.includes('data-ar6="charm-wrap"') && charmHtml.includes('data-ar6="charm-lethal"') && charmHtml.includes('已开启·联动') && charmHtml.includes('高危开启'),
      'uiCharmHTML 准确渲染 📦 贴脸包裹（联动）与 ☠️ 致命后果（高危开启）双子开关');
    const knowHtml = api.uiKnowHTML();
    check(knowHtml.includes('双向隔离') && knowHtml.includes('盲区'), 'uiKnowHTML 准确反映 V5.7 迷雾结界升级文案');

    // 安全模式休眠 + 等 3.3 秒验证 startHookWatch 绝不偷挂
    await clickAct(api, '🩺 安全:关');
    check(api.getCfg().safe === true && api.isHooked() === false, '开启安全模式后立刻卸载挂钩');
    await new Promise((r) => setTimeout(r, 3300));
    check(api.getCfg().safe === true && api.isHooked() === false, '开启安全模式等待 3.3 秒后，3 秒看门狗绝不偷偷补挂 fetch 钩子');
    await clickAct(api, '🩺 安全:开');
    check(api.getCfg().safe === false && api.isHooked() === true, '关闭安全模式后立即恢复 fetch 挂钩');
  } finally {
    try { api.dispose(); } catch (_) {}
    win.cleanup();
  }
}

(async () => {
  await Promise.all(TARGETS.map((t) => runSuite(t)));
  console.log(`\n========== V5.7 全按键与防打架深度回归汇总：PASS=${totalPass} FAIL=${totalFail} ==========`);
  process.exit(totalFail > 0 ? 1 : 0);
})();
