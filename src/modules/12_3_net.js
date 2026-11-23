/* ===== 3_net.js ===== */
/* ============================================================================
 * Anti-Route v6.0 — 3/4 Net
 * 请求钩子 / 零锁宿主观察器 / 判定器 / 两个探针
 * 关键：HTTP 200 不碰 res.body、不调用 tee() 与 clone()
 * ========================================================================== */

var origFetch = null;
var hooked = false;
var booted = false;
var lastReq = null;
var inflight = 0;

function nowMs() { return Date.now(); }

function urlOf(input) {
  try {
    if (typeof input === 'string') return input;
    if (input && typeof input.url === 'string') return input.url;
  } catch (e) {}
  return '';
}

function isGenerateUrl(u) {
  var s = String(u || '');
  if (!s) return false;
  /* 1) 桌面酒馆：请求先从服务端转发（/api/backends/chat-completions/generate） */
  if (/\/chat-completions\/generate\b/.test(s)) return true;
  /* 2) OpenAI 兼容直连：/v1/chat/completions、/v1/completions、/v1/responses、/v1/messages */
  if (/\/v1\/(?:chat\/completions|completions|responses|messages)\b/i.test(s)) return true;
  if (/\/chat\/completions\b/i.test(s) && s.indexOf('/chat-completions/') < 0) return true;
  /* 3) Gemini 原生：...:generateContent / :streamGenerateContent */
  if (/:(?:stream)?[gG]enerateContent\b/.test(s)) return true;
  return false;
}

/* ---------------- 证据与判定 ---------------- */

/* 已下线的 Gemini 型号：这类名字只可能是「请求标签」或网关回显，不能当身份证据 */
/* 只匹配「真的退役/不可用」的旧名（1.0 / 1.5 时代 + pro-vision + 早期 -001/-002 快照）。
   2.0 / 2.5 现在是主力在役模型，不能当退役处理——那会让「只有聊天标签」的降档判成 unknown。 */
var RETIRED_MODEL_RE = /gemini[\s._-]?(?:1\.1|1\.5)[\s._-]?(?:pro|flash|ultra)|gemini-pro-vision|(?:pro|flash)-00[12]/i;

var PEEK_SEQ = 0;
var PEEKS = {};

/* v3.1.4：实际服务模型可见。响应体里自述的 model 与请求期望值比对，
   单独记一次「被换模型」；不复用旧口径的被换率（那条只认响应可验证的证据）。 */
var SERVED = { last: '', want: '', at: 0, mismatch: 0, checked: 0 };

/* 归一：去通道前缀 / models/ / 日期与序号尾巴 / 大小写 */
function normModelName(m) {
  var s = String(m == null ? '' : m).trim().toLowerCase();
  s = s.replace(/^(?:models\/)+/, '');
  s = s.replace(/^(?:google|openrouter|vertex_ai|vertex|gemini|anthropic|openai|pggo|bdgo|aihubmix)\//, '');
  s = s.replace(/^pg-/, '');
  s = s.replace(/-\d{4}-\d{2}-\d{2}$/, '').replace(/-\d{3}$/, '');
  return s;
}

/* 内部请求：数据库/填表/柏宝书/柏宝绘/后台脚本等非正文传输识别 */
var INTERNAL_FETCH_KEY = (typeof Symbol === 'function' && Symbol.for) ? Symbol.for('acu.internal-generation-fetch') : null;
var ST_GEN = { at: 0, type: '', dryRun: false, stoppedAt: 0 };
var TH_GEN = { active: false, at: 0 };

function lkBodyTextSample(bodyObj) {
  var out = { sys: '', first: '', last: '', allHead: '', userTexts: [] };
  try {
    var root = (bodyObj && bodyObj.request && typeof bodyObj.request === 'object' && !Array.isArray(bodyObj.request)) ? bodyObj.request : bodyObj;
    if (!root || typeof root !== 'object') return out;
    if (typeof root.system === 'string') out.sys += root.system.slice(0, 2400) + '\n';
    if (typeof root.systemInstruction === 'string') out.sys += root.systemInstruction.slice(0, 2400) + '\n';
    else if (root.systemInstruction && Array.isArray(root.systemInstruction.parts)) {
      for (var si = 0; si < root.systemInstruction.parts.length; si++) {
        var sp = root.systemInstruction.parts[si];
        if (sp && typeof sp.text === 'string') out.sys += sp.text.slice(0, 1200) + '\n';
      }
    }
    var arr = Array.isArray(root.messages) ? root.messages : (Array.isArray(root.contents) ? root.contents : []);
    if (!arr.length) return out;
    function txtOf(m) {
      if (!m || typeof m !== 'object') return '';
      if (typeof m.content === 'string') return m.content;
      if (Array.isArray(m.content)) {
        var s = '';
        for (var k = 0; k < m.content.length; k++) {
          if (m.content[k] && typeof m.content[k].text === 'string') s += m.content[k].text + '\n';
        }
        return s;
      }
      if (Array.isArray(m.parts)) {
        var s2 = '';
        for (var p = 0; p < m.parts.length; p++) {
          if (m.parts[p] && typeof m.parts[p].text === 'string') s2 += m.parts[p].text + '\n';
        }
        return s2;
      }
      return '';
    }
    out.first = txtOf(arr[0]).slice(0, 2400);
    out.last = txtOf(arr[arr.length - 1]).slice(0, 2400);
    for (var i = 0; i < arr.length; i++) {
      var m = arr[i];
      if (!m) continue;
      var t = txtOf(m);
      if (!t) continue;
      if (m.role === 'system') {
        if (out.sys.length < 4800) out.sys += t.slice(0, 2000) + '\n';
      } else if (m.role === 'user') {
        out.userTexts.push(t);
      }
      if (i < 3 || i >= arr.length - 2) {
        if (out.allHead.length < 6000) out.allHead += t.slice(0, 1600) + '\n';
      }
    }
  } catch (e) {}
  return out;
}

/* 识别「最新用户楼层仅被嵌套在插件数据容器内」（如 <正文数据> / <当前表格数据> / <source_text>） */
var DATA_WRAPPER_RE = /<(?:正文数据|故事正文|当前表格数据|source_text|story_data|transcript|背景设定|待处理正文)(?:\s[^>]*)?>[\s\S]*?<\/(?:正文数据|故事正文|当前表格数据|source_text|story_data|transcript|背景设定|待处理正文)\s*>/gi;
function isFloorEmbeddedOnlyAsScriptData(sample) {
  try {
    var ctx = (typeof stCtx === 'function') ? stCtx() : null;
    if (!ctx || !Array.isArray(ctx.chat) || !ctx.chat.length) return false;
    var latestUser = '';
    for (var i = ctx.chat.length - 1; i >= 0; i--) {
      var cm = ctx.chat[i];
      if (cm && cm.is_user && !cm.is_system && typeof cm.mes === 'string' && cm.mes.trim()) {
        latestUser = cm.mes.trim();
        break;
      }
    }
    if (latestUser.length < 12) return false;
    var needle = latestUser.slice(0, Math.min(48, latestUser.length));
    var sawStandalone = false, sawWrapped = false;
    for (var u = 0; u < sample.userTexts.length; u++) {
      var ut = sample.userTexts[u].trim();
      if (!ut || ut.indexOf(needle) < 0) continue;
      DATA_WRAPPER_RE.lastIndex = 0;
      if (DATA_WRAPPER_RE.test(ut)) {
        DATA_WRAPPER_RE.lastIndex = 0;
        var stripped = ut.replace(DATA_WRAPPER_RE, '');
        if (stripped.indexOf(needle) < 0) { sawWrapped = true; continue; }
      }
      sawStandalone = true;
    }
    return sawWrapped && !sawStandalone;
  } catch (e) { return false; }
}

/* V5.65：7 层实码级「正文 vs 外部插件」分流器（精确覆盖柏宝书 / 柏宝绘 / 龙血玄黄数据库 / 结构化接口 / 酒馆助手脚本） */
var BAIBAI_BOOK_TASK_RE = /<nvwa_standalone_core>|【检查记录与最终结果输出协议】|【输出前核查】|【输出前思考\(逐楼核查\)】|【压缩任务的事实整理与核查】|你是严谨的剧情记忆整理员|你是剧情压缩助手|你是角色扮演续写场景中的上下文规划器|严格按格式输出[:：]?\s*一行INTENT|一行INTENT加恰好5行Q|【主角设定\(用户操控的主角本人设定,只读参考\)】/;
var BAIBAI_IMAGE_TASK_RE = /\[BBI_REQ:|你是严谨的剧情画面规划与生图提示词编写员|你是严谨的漫画分镜师与生图提示词编写员|你是外貌\s*tag\s*转换器|你是\s*ComfyUI\s*API\s*格式工作流的动态参数定位器/;
var ACU_DB_TASK_RE = /上方\s*CREATE\s+TABLE\s*仅用于说明表结构|严禁复制或输出\s*CREATE|以下为用户的额外填表要求|本次请求的全部要求与上下文写在名称以\s*turn_\s*开头的函数里|奶·数据库|MemoryBooks/;
var GENERIC_AUX_TASK_RE = /<tableEdit>|自动摘要|剧情总结|章节总结|记忆总结|提取.{0,6}(?:摘要|关键词|绘画|tag|prompt)|image\s*prompt|stable\s*diffusion|nai\s*prompt/i;

function classifyRequestTraffic(init, bodyObj, url) {
  var story = { isPlugin: false, isStory: true, kind: 'story', label: '正文', reason: '' };
  try {
    /* Layer 1：显式内部标记与声明式握手 */
    if (init && INTERNAL_FETCH_KEY && init[INTERNAL_FETCH_KEY] === true) {
      return { isPlugin: true, isStory: false, kind: 'acu_db', label: '龙血玄黄·数据库', reason: 'acu-symbol' };
    }
    var hd = init && init.headers;
    if (hd) {
      var xInt = (typeof hd.get === 'function')
        ? (hd.get('x-ar6-internal') || hd.get('x-st-internal'))
        : (hd['x-ar6-internal'] || hd['x-st-internal']);
      if (xInt) return { isPlugin: true, isStory: false, kind: 'internal_mark', label: '内部探针', reason: 'x-internal-header' };
    }
    if (ST_GEN.dryRun && ST_GEN.at && (nowMs() - ST_GEN.at < 5000)) {
      return { isPlugin: true, isStory: false, kind: 'script_aux', label: '预览生成', reason: 'dry-run' };
    }

    var u = String(url || '');
    var isStBackend = /\/api\/backends\/|\/chat-completions\/generate\b/.test(u);
    if (!isStBackend && /^https?:\/\//i.test(u)) {
      var sameOrigin = false;
      try {
        var baseHref = String((HOST && HOST.location && HOST.location.href) || 'http://localhost');
        sameOrigin = String(new URL(u, baseHref).origin) === String((HOST && HOST.location && HOST.location.origin) || '');
      } catch (eU) {}
      var hasStHost = !!(HOST && HOST.SillyTavern);
      var isDualTarget = !!(cfg && cfg.dualBase && u.indexOf(String(cfg.dualBase).replace(/\/+$/, '')) === 0);
      if (!sameOrigin && hasStHost && !isDualTarget && (!bodyObj || !bodyObj.chat_completion_source)) {
        return { isPlugin: true, isStory: false, kind: 'script_aux', label: '副API直连', reason: 'cross-origin-subapi' };
      }
    }

    if (!bodyObj || typeof bodyObj !== 'object') return story;
    var root = (bodyObj.request && typeof bodyObj.request === 'object' && !Array.isArray(bodyObj.request)) ? bodyObj.request : bodyObj;
    var reqType = String(bodyObj.type || root.type || '').toLowerCase();

    if (bodyObj.dryRun === true || root.dryRun === true) {
      return { isPlugin: true, isStory: false, kind: 'script_aux', label: '干跑请求', reason: 'body-dryrun' };
    }
    if (reqType && ['quiet', 'impersonate', 'dryrun', 'summarize', 'summary'].indexOf(reqType) >= 0) {
      return { isPlugin: true, isStory: false, kind: 'script_aux', label: '静默/辅助任务', reason: 'type:' + reqType };
    }
    if (bodyObj.quiet_prompt && String(bodyObj.quiet_prompt).replace(/\s+/g, '')) {
      return { isPlugin: true, isStory: false, kind: 'script_aux', label: 'Quiet 辅助', reason: 'quiet-prompt' };
    }
    if (ST_GEN.at && (nowMs() - ST_GEN.at < 8000) && (ST_GEN.type === 'quiet' || ST_GEN.type === 'impersonate')) {
      return { isPlugin: true, isStory: false, kind: 'script_aux', label: '静默/代写任务', reason: 'st-gen:' + ST_GEN.type };
    }

    /* 柏宝书 / 柏宝绘官方声明式握手：tool_choice === 'none' 且无 tools 且非 normal 正文类型 */
    var hasToolsArr = (Array.isArray(root.tools) && root.tools.length > 0) || (Array.isArray(root.functions) && root.functions.length > 0);
    if (root.tool_choice === 'none' && !hasToolsArr && reqType !== 'normal') {
      return { isPlugin: true, isStory: false, kind: 'baibai_book', label: '柏宝书/柏宝绘', reason: 'tool-choice-none-handshake' };
    }

    /* 龙血玄黄·数据库上下文工具化传输（turn_NNN_role）与 ping_check 连通探针 */
    if (Array.isArray(root.tools) && root.tools.length) {
      var hasTurnTool = false, onlyPingCheck = true;
      for (var ti = 0; ti < root.tools.length; ti++) {
        var tfn = root.tools[ti] && (root.tools[ti].function || root.tools[ti]);
        var tnm = String((tfn && tfn.name) || '');
        if (/^turn_\d+_/i.test(tnm)) hasTurnTool = true;
        if (tnm !== 'ping_check') onlyPingCheck = false;
      }
      if (hasTurnTool) return { isPlugin: true, isStory: false, kind: 'acu_db', label: '龙血玄黄·数据库', reason: 'acu-turn-tools' };
      if (onlyPingCheck) return { isPlugin: true, isStory: false, kind: 'probe_ping', label: '连通性测试', reason: 'ping-check' };
    }

    /* Layer 2~4：精准任务系统提示词指纹（不限消息条数、不限是否流式，且绝不误杀带 D0/D1 记忆注入的主剧情！） */
    var sample = lkBodyTextSample(bodyObj);
    var headBlob = sample.sys + '\n' + sample.first + '\n' + sample.last;
    if (BAIBAI_IMAGE_TASK_RE.test(headBlob) || (headBlob.indexOf('【角色固定外貌库】') >= 0 && headBlob.indexOf('--- 目标正文｜') >= 0)) {
      return { isPlugin: true, isStory: false, kind: 'baibai_image', label: '柏宝绘', reason: 'baibai-image-fingerprint' };
    }
    if (BAIBAI_BOOK_TASK_RE.test(headBlob)) {
      return { isPlugin: true, isStory: false, kind: 'baibai_book', label: '柏宝书', reason: 'baibai-book-fingerprint' };
    }
    if (ACU_DB_TASK_RE.test(headBlob)) {
      return { isPlugin: true, isStory: false, kind: 'acu_db', label: '龙血玄黄·数据库', reason: 'acu-db-fingerprint' };
    }

    /* Layer 5：结构化 JSON Schema / 响应格式锁（严格要求返回 JSON 的数据库/插件请求） */
    var rf = root.response_format || bodyObj.response_format;
    if (rf && typeof rf === 'object' && (rf.type === 'json_schema' || rf.type === 'json_object' || rf.json_schema)) {
      return { isPlugin: true, isStory: false, kind: 'structured_api', label: '结构化插件', reason: 'response-format-json' };
    }
    var gc = root.generationConfig || bodyObj.generationConfig;
    if (gc && typeof gc === 'object' && (gc.responseSchema || gc.response_schema || gc.responseMimeType === 'application/json')) {
      return { isPlugin: true, isStory: false, kind: 'structured_api', label: '结构化插件', reason: 'gemini-json-schema' };
    }
    /* ST custom_include_body 里携带 response_format（龙血玄黄严格 JSON 填表） */
    if (typeof bodyObj.custom_include_body === 'string' && /"response_format"|response_format\s*:/i.test(bodyObj.custom_include_body)) {
      return { isPlugin: true, isStory: false, kind: 'acu_db', label: '龙血玄黄·数据库', reason: 'custom-include-response-format' };
    }

    var msgs = Array.isArray(root.messages) ? root.messages : (Array.isArray(root.contents) ? root.contents : []);
    if (!msgs.length) return story;

    var inActiveChatGen = !!(ST_GEN.at && (nowMs() - ST_GEN.at < 8000) &&
      ['normal', 'swipe', 'continue', 'regenerate'].indexOf(ST_GEN.type) >= 0 &&
      root.stream !== false);
    var thBusy = !!(TH_GEN.active && TH_GEN.at && (nowMs() - TH_GEN.at < 8000));

    /* Layer 6：酒馆助手后台生成事件窗 & 最新楼层仅嵌作插件数据容器 */
    if (!inActiveChatGen && !reqType) {
      if (thBusy) {
        return { isPlugin: true, isStory: false, kind: 'script_aux', label: '酒馆助手脚本', reason: 'th-js-generation' };
      }
      if (isFloorEmbeddedOnlyAsScriptData(sample)) {
        return { isPlugin: true, isStory: false, kind: 'script_aux', label: '数据整理插件', reason: 'floor-embedded-data' };
      }
      if (GENERIC_AUX_TASK_RE.test(sample.first + ' ' + sample.last)) {
        if (root.stream === false || !isStBackend || msgs.length <= 12) {
          return { isPlugin: true, isStory: false, kind: 'script_aux', label: '表格/摘要插件', reason: 'generic-aux-keyword' };
        }
      }
    }

    /* Layer 7：酒馆连通性测试 ping（非流式 + 极小 max_tokens + <=2 条无 assistant） */
    if (!reqType && root.stream === false) {
      var maxT = Number(root.max_tokens != null ? root.max_tokens : 9999);
      if (maxT > 0 && maxT <= 64 && msgs.length <= 2) {
        var hasAsst = false;
        for (var ai = 0; ai < msgs.length; ai++) {
          if (String((msgs[ai] && msgs[ai].role) || '') === 'assistant') { hasAsst = true; break; }
        }
        if (!hasAsst && String(bodyObj.chat_completion_source || '') === 'custom' && (bodyObj.reverse_proxy || bodyObj.custom_url)) {
          return { isPlugin: true, isStory: false, kind: 'probe_ping', label: '连通性测试', reason: 'st-ping' };
        }
      }
    }
  } catch (eCls) {}
  return story;
}

function isNarrativeBody(body) {
  /* 什么算「正文」：真正写进聊天、你眼睛看到的那一段。
     不算的：替玩家写（impersonate）、quiet 生成（摘要/记忆/推进）、
     以及任何自带 quiet_prompt 或 type 不在白名单里的请求。 */
  try {
    if (ST_GEN.at && (nowMs() - ST_GEN.at < 8000) && (ST_GEN.type === 'quiet' || ST_GEN.type === 'impersonate')) return false;
    if (!body || typeof body !== 'object') return true;
    var t = String(body.type || '').toLowerCase();
    if (t === 'impersonate' || t === 'quiet') return false;
    if (body.quiet_prompt && String(body.quiet_prompt).replace(/\s+/g, '')) return false;
    if (t && ['normal', 'swipe', 'continue', 'regenerate'].indexOf(t) < 0) return false;
    return true;
  } catch (e) { return true; }
}

function lastReqBase() {
  /* 面板上不再让用户填反代地址：直接用最近一次真实生成请求里带的 base。
     只在内存里读，不落盘。 */
  try { return (lastReq && lastReq.base) || ''; } catch (e) { return ''; }
}

function isInternalRequest(init, bodyObj, url) {
  var c = classifyRequestTraffic(init, bodyObj, url);
  return !!(c && c.isPlugin);
}

function modelOutOfScope(model, url) {
  try {
    var m = String(model || '').trim().toLowerCase();
    var u = String(url || '').toLowerCase();
    var combined = (m + ' ' + u).trim();
    var mode = String((cfg && cfg.scope) || 'all');
    if (mode === 'only' || mode === 'skip') {
      var list = String((cfg && cfg.scopeList) || '').split(',');
      var keys = [];
      for (var i = 0; i < list.length; i++) {
        var k = String(list[i] || '').trim().toLowerCase();
        if (!k) continue;
        keys.push(k);
        if (k === 'ds') keys.push('deepseek');
      }
      if (keys.length && combined) {
        var hit = false;
        for (var j = 0; j < keys.length; j++) {
          if (combined.indexOf(keys[j]) >= 0) { hit = true; break; }
        }
        if (mode === 'skip' && hit) return true;
        if (mode === 'only' && !hit) return true;
      }
    }
    if (cfg && cfg.onlyGemini !== false) {
      if (/api\.deepseek\.com|api\.openai\.com|api\.anthropic\.com|api\.siliconflow\.cn|open\.bigmodel\.cn|dashscope\.aliyuncs\.com/.test(u)) {
        if (!/gemini|argon|carbon|hydrogen|neon|gemma/.test(m)) return true;
      }
      /* 只对「不走酒馆后端」的请求按模型名判族：主聊天常被渠道挂别名，
         真正想吃 Gemini 的请求名里也带 gemini/argon/...；副 API 通常直接给 deepseek 之类。 */
      if (!/\/api\/backends\/|\/chat-completions\/generate\b/.test(u)) {
        var fam = familyOf(m);
        if (fam && fam !== 'google') return true;
        if (/\bds[-_]|deepseek|^ds$/i.test(m)) return true;
      }
    }
  } catch (e) {}
  return false;
}


function pushObs(ev, val, src) {
  try {
    var v = String(val == null ? "" : val).trim();
    if (!v || ev.observed.indexOf(v) >= 0) return;
    ev.observed.push(v);
    if (!ev.observedSrc) ev.observedSrc = [];
    ev.observedSrc.push(src || "?");
  } catch (e) { }
}

function newEvidence(model, status, transport) {
  return {
    requestedModel: model, observed: [], observedSrc: [], status: status, transport: transport,
    verifiable: 'unknown',
    sawText: false, hasThink: false, hasReasonField: false,
    outputChars: 0, thoughtTok: 0, firstMs: 0, totalMs: 0, error: ''
  };
}

/* v0.13：检测范围。'in' 在范围内 / 'out' 不在 / 'anon' 没读到模型名 */
function scopeLabel() {
  var n = 0, a = String(cfg.scopeList || '').split(',');
  for (var i = 0; i < a.length; i++) { if (String(a[i] || '').trim()) n++; }
  if (cfg.scope === 'only') return '只查 ' + n + ' 项';
  if (cfg.scope === 'skip') return '跳过 ' + n + ' 项';
  return '全部';
}

function scopeMatch(model) {
  var mode = String(cfg.scope || 'all');
  if (mode !== 'only' && mode !== 'skip') return 'in';
  var list = String(cfg.scopeList || '').split(',');
  var keys = [];
  for (var i = 0; i < list.length; i++) {
    var k = String(list[i] || '').trim().toLowerCase();
    if (k) keys.push(k);
  }
  if (!keys.length) return 'in';          /* 列表空着就别静默把一切都漏掉 */
  var m = String(model || '').trim().toLowerCase();
  if (!m) return 'anon';                  /* 读不到模型名：不假装它在范围内，也不假装不在 */
  var hit = false;
  for (var j = 0; j < keys.length; j++) { if (m.indexOf(keys[j]) >= 0) { hit = true; break; } }
  if (mode === 'only') return hit ? 'in' : 'out';
  return hit ? 'out' : 'in';
}

var VERDICT = {
  same:    { label: '一致', color: 'ok' },
  diff:    { label: '被换', color: 'bad' },
  thin:    { label: '无思考', color: 'warn' },
  unknown: { label: '未知', color: 'gray' },
  quota:   { label: '配额', color: 'warn' },
  blocked: { label: '拦截', color: 'bad' },
  gate:    { label: '网关异常', color: 'bad' },
  empty:   { label: '无正文', color: 'gray' },
  echo:    { label: '回显', color: 'gray' },
  error:   { label: '失败', color: 'bad' },
  skip:    { label: '跳过', color: 'gray' }
};

/* 渠道「读得到思考」——只看近期、同家族的记录。
   旧版读前 30 条、无时间窗：任意一条历史 think=1 会让之后所有无思考轮次全判 thin。 */
function channelSeesThinking(model) {
  try {
    var log = readLog() || [];
    var fam = model ? familyOf(model) : '';
    var now = nowMs();
    for (var i = 0; i < log.length && i < 40; i++) {
      var r = log[i];
      if (!r || !r.think) continue;
      if (!r.at || now - Number(r.at) > 600000) continue;
      if (fam && r.req && familyOf(r.req) && familyOf(r.req) !== fam) continue;
      return true;
    }
  } catch (e) {}
  return false;
}

function verdictOf(ev) {
  if (ev.error) return { code: 'error', note: ev.error, conf: 'C' };
  if (ev.status === 429) return { code: 'quota', note: 'HTTP 429', conf: 'C' };
  if (ev.status >= 500) return { code: 'gate', note: 'HTTP ' + ev.status, conf: 'C' };
  if (ev.blocked) return { code: 'blocked', note: ev.blocked, conf: 'C' };
  if (!ev.sawText && ev.status >= 400) return { code: 'error', note: 'HTTP ' + ev.status, conf: 'C' };
  /* 4.7.2：先看范围，再谈正文——副 API 的未知/空回不该刷屏，也不该进台账 */
  try {
    if (cfg && cfg.onlyGemini && !ev.internal && !scopeHitGemini(ev)) {
      return { code: 'skip', note: '不在检查范围（只查 Gemini）：' + (shortName(ev.requestedModel) || '请求名未知'), conf: 'C' };
    }
    if (cfg && (String(cfg.scope) === 'skip' || String(cfg.scope) === 'only')) {
      var scEarly = scopeMatch(ev.requestedModel);
      if (scEarly === 'out') return { code: 'skip', note: '不在检测范围（' + scopeLabel() + '）', conf: 'C' };
    }
  } catch (eV0) {}
  /* v8.29：内部请求（数据库/填表）本来就不写聊天产物 ⇒ 没读到正文不等于空回 */
  if (!ev.sawText && ev.internal) {
    return { code: 'unknown', note: '内部请求（数据库或填表）：没有聊天产物，不判空回', conf: 'C' };
  }
  if (!ev.sawText) {
    if (ev.emptyConfirmed) return { code: 'empty', note: '响应体与聊天都没有正文（确认空回）', conf: 'C' };
    return { code: 'unknown', note: '正文证据不足（响应体未取到，旁路取样可能关闭）', conf: 'C' };
  }

  /* v0.13：到这里才看范围——空回/错误/拦截属于「回复没了」，跟哪个模型无关，先判；
     「有没有被换」才是模型相关的，模型不在范围内就只留一条灰记录 */
  /* v1.1 修 D3：旧的范围（scope/scopeList）只看请求名，会把「请求名写 deepseek、
     实际后端是 gemini」的轮次直接否决掉，导致 onlyGemini 的证据扩宽永远跑不到。
     onlyGemini 打开时，范围完全交给下面的 scopeHitGemini（请求名 + 证据）；关掉时才用它。 */
  /* 显式「跳过列表」仍然算数（那是用户手动点名不要查的）；只有「只查某几个」
     在 onlyGemini 打开时让位——那种组合会把 Gemini 自己也排除掉。 */
  if (!cfg || !cfg.onlyGemini || String(cfg.scope) === 'skip' || String(cfg.scope) === 'only') {
    var sc = scopeMatch(ev.requestedModel);
    if (sc === 'out') {
      return { code: 'skip', note: '不在检测范围（' + scopeLabel() + '）', conf: 'C' };
    }
  }
  /* v1.1 只查 Gemini：范围外的请求不判定，只留一行灰记录（空回/错误已经在上面判过了）。
     v1.1 修：原来只看「请求名」。反代常给同一个渠道换名字（比如请求名写 gpt-4o、
     实际后端是 gemini），只按请求名判会把真 Gemini 也拦在门外。现在请求名和
     响应体/标签里认到的名字，任何一个像 Gemini 就查。 */
  try {
    if (!scopeHitGemini(ev)) {
      return { code: 'skip', note: '不在检查范围（只查 Gemini）：' + (shortName(ev.requestedModel) || '请求名未知'), conf: 'C' };
    }
  } catch (eSC) {}

  var req = ev.requestedModel;
  var ver = ev.verifiable || 'unknown';          /* yes=可验 no=回显 unknown=未验 */
  var obs = [], srcs = [];
  for (var i0 = 0; i0 < ev.observed.length; i0++) {
    var x0 = String(ev.observed[i0] || '').trim();
    if (!x0 || /^(?:auto|router|default|unknown|any)$/i.test(x0)) continue;
    var s0 = (ev.observedSrc && ev.observedSrc[i0]) || '?';
    if (s0 === 'msg' && RETIRED_MODEL_RE.test(x0)) continue;   /* 旧标签不算证据 */
    obs.push(x0); srcs.push(s0);
  }

  /* 证据排序：响应体 > 聊天记录（标签）；同源按到达顺序 */
  var order = [], orderSrc = [];
  for (var s1 = 0; s1 < srcs.length; s1++) {
    if (srcs[s1] === 'body') { order.push(obs[s1]); orderSrc.push('body'); }
  }
  for (var s2 = 0; s2 < srcs.length; s2++) {
    if (srcs[s2] !== 'body') { order.push(obs[s2]); orderSrc.push(srcs[s2]); }
  }

  for (var i = 0; i < order.length; i++) {
    var a = normModel(req), b = normModel(order[i]);
    if (!a || !b) continue;
    var fromBody = orderSrc[i] === 'body';
    var same = (a === b);
    /* 名字不同但身份相同：渠道常给自己加 -ai / -vertex / -low 这类尾巴，
       那是路由别名与思考档，不是换了一个模型。 */
    var aliasOnly = false;
    if (!same) {
      var ia = normModelIdentity(a), ib = normModelIdentity(b);
      if (ia && ia === ib) { same = true; aliasOnly = true; }
    }
    var fa = familyOf(a), fb = familyOf(b);

    /* 渠道不读 model：聊天记录上的标签不可信；但响应体自述仍然有效 */
    if (ver === 'no' && !fromBody) {
      if (same) continue;
      continue;
    }

    var baseConf = fromBody ? ((ver === 'yes') ? 'A' : 'B') : (ver === 'yes' ? 'B' : 'C');

    if (same) {
      if (!ev.internal && isProLike(a) && !ev.hasThink && ev.usageZeroThink === true && channelSeesThinking(a)) {
        /* conf 必须与 same 同级：同一条「模型名一致」的证据，不能判 thin 时就升成 B */
        return { code: 'thin', note: '模型一致，但本轮没看到思考', conf: baseConf, obs: order[i] };
      }
      return { code: 'same', note: shortName(order[i]) + (fromBody ? '（响应体）' : '') + (aliasOnly ? '（同一模型，只是名称后缀不同）' : ''), conf: baseConf, obs: order[i] };
    }

    /* 跨厂牌：档位表不可比，直接算被换；且回显只会回请求的名字 ⇒ 跨族差异天然排除回显 */
    if (fa && fb && fa !== fb) {
      return {
        code: 'diff',
        note: '跨家族：' + shortName(a) + '（' + fa + '）→ ' + shortName(b) + '（' + fb + '）',
        conf: fromBody ? 'A' : baseConf, obs: order[i]
      };
    }

    var ta = tierOf(a), tb = tierOf(b);
    var ga = genOf(a), gb = genOf(b);
    var genMoved = ga > 0 && gb > 0 && Math.abs(ga - gb) >= 0.05;
    var tierDrop = ta > 0 && tb > 0 && tb < ta;
    var tierUp = ta > 0 && tb > 0 && tb > ta;

    /* 降档最要紧：说清"降了几档"，顺手带上代次——3.8 Flash → 3.1 Flash 这种要看得出来 */
    if (tierDrop) {
      /* 代次更新但档位更低（1.5 Pro → 3.8 Flash 这种）：两边各说各的，不硬判"降档" */
      var mixed = genMoved && gb > ga;
      return {
        code: 'diff',
        note: shortName(order[i]) + '（' +
          (mixed
            ? '代次 ' + ga + ' → ' + gb + '（更新），但档位 T' + ta + ' → T' + tb + '（更低）'
            : (genMoved ? '代次 ' + ga + ' → ' + gb + '，' : '') + '档位 T' + ta + ' → T' + tb + '，降档') +
          '）',
        conf: baseConf, obs: order[i]
      };
    }
    /* 档位没降、代次降了：一样是被换，只是话要说在代次上 */
    if (genMoved && gb < ga) {
      return {
        code: 'diff',
        note: shortName(order[i]) + '（代次 ' + ga + ' → ' + gb + '，降代' +
          (tierUp ? '，但档位 T' + ta + ' → T' + tb + ' 更高' : '') + '）',
        conf: baseConf, obs: order[i]
      };
    }
    /* 换成更新的模型：不是降级，但也不是你要的那个 */
    if (genMoved && gb > ga) {
      return {
        code: 'diff',
        note: shortName(order[i]) + '（代次 ' + ga + ' → ' + gb + '，换成了更新的模型）',
        conf: baseConf, obs: order[i]
      };
    }
    if (tierUp) {
      return {
        code: 'diff',
        note: shortName(order[i]) + '（档位 T' + ta + ' → T' + tb + '，换成了更高配置）',
        conf: baseConf, obs: order[i]
      };
    }
    /* 响应体说了一个不同的模型：即便同档，也是被换。
       但这个名字是渠道自己写的，不是上游的身份证——没拿到 modelVersion 时要说清楚。 */
    if (fromBody) {
      return {
        code: 'diff',
        note: '响应体自述 ' + shortName(b) + ' ≠ 请求 ' + shortName(a) +
          (ev.modelVersion ? '' : '（渠道未回传版本号，真实身份未知）'),
        conf: baseConf, obs: order[i]
      };
    }
    return { code: 'echo', note: '模型不同但无法定档：' + shortName(order[i]), conf: 'C', obs: order[i] };
  }
  return {
    code: 'unknown',
    note: ev.internal ? '内部请求（数据库/填表）：无聊天产物，响应体也未回传模型' :
      (ver === 'no' ? '渠道不可验，无身份证据' : '上游未回传模型标识'),
    conf: 'C'
  };
}

function finish(ev, meta) {
  if (DISPOSED || ev.__committed) return ev.__record || null;
  /* 聊天记录没提交（或提交慢了）时，别急着说"没有正文"：
     响应体里明明有文本就先等它落地，再用它兜底。 */
  /* v0.12：内部请求不取体，也就没有 PEEKS 可等——以前这里会空转 6 秒才落记录 */
  /* v1.1 修 D2：只查 Gemini 时，范围判定要靠响应体证据。正文已经出了、但 peek 还没读完时，
     如果现在按「请求名不是 google」收尾，就会把真 Gemini（反代换了名字）判成 skip，
     而且 peek 晚到的证据不会再触发重判。这里让这种情况下也等 peek。 */
  var needScopePeek = false;
  try {
    if (cfg && cfg.onlyGemini && !ev.internal) {
      var pk1 = PEEKS[ev.rid];
      needScopePeek = !(pk1 && pk1.done) && !scopeHitGemini(ev);
    }
  } catch (eSP) { needScopePeek = false; }
  if (ev.__peekStarted && ev.status === 200 && ev.rid && !ev.internal) {
    var pk0 = PEEKS[ev.rid];
    if (!ev.__peekAt) ev.__peekAt = nowMs();
    var waited = nowMs() - ev.__peekAt;
    /* 一路等它落地：流式结束与 peek 读完不同步，单次 900ms 常不够 */
    if ((!pk0 || !pk0.done) && ev.__peekPending && waited < 6000) {
      ev.__peekDefer = (ev.__peekDefer || 0) + 1;
      setTimeout(function () { try { finish(ev, meta); } catch (eD) {} }, 700);
      return null;
    }
    if (pk0 && pk0.hasText) {
      ev.sawText = true;
      ev.bodyText = true;
      if (!ev.outputChars || ev.outputChars < pk0.textChars) ev.outputChars = pk0.textChars;
    } else if (pk0 && pk0.done && !pk0.failed && !ev.sawText) {
      /* 响应体也读完了、确实没字：这才是真空回 */
      ev.emptyConfirmed = true;
    }
  }
  /* v1.1 检查范围：默认只查 Gemini。别的家族照常发、照常回，
     不判定（verdictOf 里直接返回 skip）、不建基线，但破甲 / 抗截断 / 反 OOC 不受影响。 */
  try {
    var tx0 = String(ev.head || ev.tail || '').replace(/\s+/g, '');
    var at0 = String(ev.asstTail || '').replace(/\s+/g, '').slice(-40);
    if (tx0 && at0.length >= 24 && tx0.indexOf(at0) === 0) ev.echoHead = true;
    if (ev.effort) ev.effortHint = true;
  } catch (eEH) {}
  ev.__committed = true;
  try { DET.rec++; DET.lastModel = String(ev.requestedModel || ''); DET.lastRecAt = Date.now(); } catch (eD0) {}
  var v = verdictOf(ev);
  /* v0.6 抗截断：先判「这一轮为什么停」，判定结果跟着记录走（关档时连看都不看） */
  var tRes = null;
  try { if (cfg && cfg.trunc && cfg.trunc !== 'off') tRes = truncInspect(ev); } catch (eTR) {}
  if (v && ev.bodyText && !ev.chatSaw) {
    ev.bodyOnly = true;
    v.note = (v.note ? v.note + '；' : '') + '正文来自响应体（聊天未提交）';
  }
  var rec = {
    at: nowMs(),
    req: shortName(ev.requestedModel),
    obs: shortName(v.obs || (ev.observed.length ? ev.observed[0] : '—')),
    src: (function () {
      try {
        if (v.obs) { var k = ev.observed.indexOf(v.obs); return k >= 0 ? (ev.observedSrc[k] || '') : ''; }
      } catch (eSrc) {}
      return (ev.observedSrc && ev.observedSrc[0]) || '';
    })(),
    retired: !!(ev.observed.length && RETIRED_MODEL_RE.test(String(ev.observed[0]))),
    code: v.code,
    conf: v.conf || 'C',
    verifiable: ev.verifiable || 'unknown',
    alias: cfg.alias || '',
    verdict: (VERDICT[v.code] || VERDICT.unknown).label,
    note: v.note,
    status: ev.status,
    ttft: ev.firstMs,
    total: ev.totalMs,
    chars: ev.outputChars,
    think: ev.hasThink ? 1 : ((ev.hasReasonField || ev.usageSeen) ? 0 : null),
    changed: (meta && meta.changed) || [],
    edits: (meta && meta.edits) || 0,
    added: (meta && meta.added) || 0,
    rid: ev.rid || 0,
    internal: !!ev.internal,
    bodyText: !!ev.bodyText,
    audit: (meta && meta.audit) || null,
    foreign: (meta && meta.foreign) || 0,
    base: (meta && meta.base) || '',
    errModel: ev.errModel || '',
    tooLong: !!ev.tooLong
  };
  /* v0.6 抗截断：只在真识别到截断时加两个字段，正常轮次的记录形状不变 */
  if (tRes && tRes.code) { rec.trunc = tRes.code; rec.truncNote = tRes.note; }
  /* v3.0 自动 PVP：这一轮重发过几次，报告里看得见 */
  if (ev.pvpUsed > 0) { rec.pvp = ev.pvpUsed; }
  /* v3.1.4：实际服务模型只在有值时写进记录，旧记录的键一个都不多 */
  if (ev.servedModel) rec.served = String(ev.servedModel).slice(0, 90);
  if (ev.routeHit) rec.routeHit = 1;
  /* 回显渠道：名字对不上不能当「被换」的证据，降到「回显」 */
  if (rec.code === 'diff' && rec.verifiable === 'no') {
    rec.code = 'echo';
    rec.verdict = '回显';
    rec.note = '这个渠道会回显你的模型名，名字对不上不能当证据';
  }
  /* 只算正文：辅助请求照记，但不进被换率（改了 code，统计与基线都会跳过它） */
  try {
    if (String(cfg && cfg.contentOnly) === 'on' && ev.narrative === false) {
      rec.code = 'aux';
      rec.verdict = '辅助请求';
      rec.note = '这类请求不算正文（摘要 / 自动标题 / 替玩家写 / quiet 生成）';
    }
  } catch (eAux) {}
  /* v1.1 两条零 token 线索：只写进 note，不改判定、不进被换率分子 */
  try {
    if (ev.echoHead && (rec.code === 'same' || rec.code === 'diff')) {
      rec.note = (rec.note ? rec.note + '；' : '') + '开头与上一轮原文逐字相同，可能是在回显历史，不是新写的';
    }
    if (ev.effortHint && rec.think === 0) {
      rec.note = (rec.note ? rec.note + '；' : '') + '请求里带了思考档指令，回包却没有思考 token：可能模型没照做，也可能中间层改过请求';
    }
  } catch (eNT) {}
  if (ev.capture) capture318Record(ev, rec);
  try { ev.__ledEntry = ledAdd(rec); } catch (eLed) {}
  ev.__record = rec;
  pushLog(rec);
  try { if (!ev.capture || CAP318_LIVE === ev.requestId) liveFinish(); } catch (eLf) {}
  /* v0.82 行为基线：记录落库后补一条样本（关闸 / 内部请求 / 字太少时自己跳过） */
  try { basePush(rec); } catch (eBase) {}
  /* v0.84 结构指纹：只记响应体结构，被换 / 无思考的轮次自己跳过 */
  try { shapePush(rec); } catch (eShape) {}
  render();
  v = {code:rec.code,note:rec.note};
  var kind = (VERDICT[rec.code] || VERDICT.unknown).color;
  if (v.code === 'skip' || v.code === 'aux') {
    /* 4.7.2：范围外与辅助请求只进台账，不弹顶部横幅（副 API 每轮一条太吵） */
  } else if (v.code === 'diff' || v.code === 'blocked' || v.code === 'gate') {
    banner('🔴 ' + rec.verdict + '：' + v.note + '（请求 ' + rec.req + '）', kind);
  } else if (v.code === 'thin') {
    banner('🟠 ' + rec.verdict + '：' + v.note + '（请求 ' + rec.req + '）', kind);
  } else if (v.code === 'empty') {
    banner('⚪ ' + rec.verdict + '：' + v.note + '（请求 ' + rec.req + '）', kind);
  } else if (v.code === 'same') {
    /* v0.82 行为基线：名字对得上、手感不对——这一种最该被看见，别让它只躺在卡片里 */
    var bSame = '';
    try { var bjS = baseJudge(rec); if (bjS && bjS.why !== 'slow') bSame = bjS.line; } catch (eBS) {}
    /* v0.84 结构指纹：名字和手感都过的时候，格式变了也要留一句 */
    var sShape = '';
    try { sShape = shapeLine(rec); } catch (eShape2) {}
    banner('🟢 一致：' + v.note + '（' + (rec.ttft ? (rec.ttft / 1000).toFixed(1) + 's 首字，' : '') + rec.chars + ' 字）' + (bSame ? '　⚠ ' + bSame : '') + (sShape ? '　🔬 ' + sShape : ''), kind);
  } else {
    banner('⚪ ' + rec.verdict + '：' + v.note, kind);
  }
  /* v7.1 破甲：事后补救挂在这里——每次生成收尾都必经这一点 */
  /* v0.6 抗截断：破甲之前先判截断归属——轻档只提示，中档补一次（返回值决定破甲还管不管） */
  var tCode = '';
  try { tCode = truncAfterFinish(ev, tRes) || ''; } catch (eTrunc) {}
  /* 抗截断认领了截断，破甲就别再插一脚；空回/拒绝仍归破甲 */
  if (tCode) { try { ev.__truncCode = tCode; } catch (eTC) {} }
  try { jailAfterFinish(ev); } catch (eJail) {}
  /* v3.0 自动 PVP：空回兜底——破甲关着时才接管，开着就整段让路（绝不两家一起补） */
  try { pvpAfterFinish(ev); } catch (ePvp) {}
  /* v7.3：判定为「被换 / 无思考」时自动弹证据卡（1.6s 后，等响应体取样落地） */
  try {
    if (!cfg.silent && cfg.cardAuto && (rec.code === 'diff' || rec.code === 'thin')) {
      setTimeout(function () {
        try {
          /* v8.0.3：破甲确认框 / 已打开的卡优先，别把用户手上的东西顶掉 */
          if (DISPOSED || cfg.silent || !cfg.cardAuto || (CARD && CARD.open)) return;
          if (typeof jailAskPending === 'function' && jailAskPending()) return;
          openCard(rec);
        } catch (eC) {}
      }, 1600);
    }
  } catch (eCard) {}
  return rec;
}

/* ---------------- 错误体解析（仅 >=400 时 clone） ---------------- */

/* 错误体只解析「上游说了什么」，绝不碰 sawText。
   v8.29 把整个函数 return 掉，连带把 blocked 也关死了——破甲「被拦截不补」那条刹车成了假的。
   现在拆成两件事：model 只留作展示（不 pushObs，4xx 不判被换），blocked / 超长才是判定输入。 */
function salvageError(text, ev) {
  if (typeof text !== 'string' || !text) return;
  var mre = /"(?:modelVersion|model)"\s*:\s*"([^"]{1,120})"/g;
  var m;
  while ((m = mre.exec(text)) !== null) {
    if (!ev.errModel) ev.errModel = String(m[1]).trim();
  }
  if (/131072|maximum context length|context_length_exceeded|reduce the length/i.test(text)) ev.tooLong = true;
  if (/PROHIBITED_CONTENT|BLOCKLIST|SAFETY|SPII|RECITATION/.test(text)) {
    var bm = /(PROHIBITED_CONTENT|BLOCKLIST|SAFETY|SPII|RECITATION)/.exec(text);
    ev.blocked = bm ? bm[1] : 'BLOCKED';
  }
  /* v0.12：这一句是 8.29 自激链的入口，永久删除——错误说明不是正文 */
}

function readErrorBody(res, ev) {
  try {
    if (typeof res.clone !== 'function') {
      criticalWarn('错误响应体不可 clone', new Error('Response.clone unavailable'));
      finish(ev, null);
      return;
    }
    res.clone().text().then(function (t) {
      salvageError(t, ev);
      if (!ev.errModel) ev.errModel = '';
      ev.sawText = ev.sawText || false;
      if (!ev.error) ev.error = '';
      finish(ev, null);
    }).catch(function () { finish(ev, null); });
  } catch (e) { finish(ev, null); }
}


/* ---------------- 响应体旁路取样（只为证据卡，不阻塞主流程） ---------------- */

/* 扫响应体里 "text"/"content" 这类真正承载正文的字段，估出字符量。
   不用正则：转义太容易写错，而且这里只要一个近似值 + 有没有。 */
function bodyTextChars(s) {
  var total = 0;
  var i = 0;
  var n = s.length;
  while (i < n && total < 200000) {
    var k1 = s.indexOf('"text"', i);
    var k2 = s.indexOf('"content"', i);
    var at, klen;
    if (k1 < 0 && k2 < 0) break;
    if (k1 < 0) { at = k2; klen = 9; }
    else if (k2 < 0) { at = k1; klen = 6; }
    else if (k1 < k2) { at = k1; klen = 6; }
    else { at = k2; klen = 9; }
    var q = s.indexOf('"', at + klen);
    if (q < 0) break;
    var j = q + 1;
    var cnt = 0;
    var closed = false;
    while (j < n) {
      var c = s.charAt(j);
      if (c === '\\') { cnt++; j += 2; continue; }
      if (c === '"') { closed = true; break; }
      cnt++;
      j++;
    }
    if (closed) total += cnt;
    i = j + 1;
  }
  return total;
}

/* Request-local structured collector. Counts use decoded JS string length; unknown remains null. */
var CAP318_LIVE = null;
var CAP318_SESSION = Date.now().toString(36) + '-' + Math.random().toString(36).slice(2);
function capture318(ev, start) {
  if (ev.capture) return ev.capture;
  ev.__captureStart = start == null ? nowMs() : start;
  if (!ev.rid) ev.rid = ++PEEK_SEQ;
  ev.requestId = ev.requestId || CAP318_SESSION + ':' + ev.rid;
  return ev.capture = {
    requestId: ev.requestId, bodyChars: null, thinkChars: null, thinkTokens: null,
    firstByteMs: null, firstThinkMs: null, firstContentMs: null, totalMs: null,
    source: 'none', provider: null, status: 'unavailable', error: null,
    settleReason: null, finishReason: null, finishEvidence: [], lateReconciled: false
  };
}
function capture318Record(ev, rec) {
  var c = ev.capture;
  if (!c) return;
  if (c.bodyChars == null && typeof ev.outputChars === 'number' && ev.outputChars > 0) c.bodyChars = ev.outputChars;
  if (c.firstContentMs == null && typeof ev.firstMs === 'number' && ev.firstMs > 0) c.firstContentMs = ev.firstMs;
  if (c.totalMs == null && typeof ev.totalMs === 'number' && ev.totalMs > 0) c.totalMs = ev.totalMs;
  if (c.thinkChars == null && typeof ev.thinkChars === 'number' && (ev.sawThink || ev.usageSeen || c.status === 'complete')) c.thinkChars = ev.thinkChars;
  if (c.thinkTokens == null && typeof ev.thinkTokens === 'number' && (ev.usageSeen || ev.thinkTokens > 0)) c.thinkTokens = ev.thinkTokens;
  rec.requestId = ev.requestId;
  rec.capture = JSON.parse(JSON.stringify(c));
  if (c.bodyChars != null) rec.chars = c.bodyChars;
  if (c.firstContentMs != null) rec.ttft = c.firstContentMs;
  if (c.totalMs != null) rec.total = c.totalMs;
  var th = (c.thinkChars > 0 || c.thinkTokens > 0 || ev.hasThink) ? 1
    : ((c.thinkChars === 0 || c.thinkTokens === 0 || ev.hasReasonField || ev.usageSeen) ? 0 : rec.think);
  rec.think = th;
  if (c.finishReason) rec.finish = c.finishReason;
}
function capture318ApplyLateVerdict(ev, rec) {
  try {
    if (!ev || !rec) return;
    if (ev.chars > 0 && !ev.sawText) ev.sawText = true;
    if (ev.servedModel) rec.served = String(ev.servedModel).slice(0, 90);
    if (ev.routeHit) rec.routeHit = 1;
    /* 晚到响应体补齐了模型或正文证据时，重算判定并同步更新报告字段 */
    if (rec.code !== 'aux') {
      var v = verdictOf(ev);
      if (v && v.code) {
        var nextCode = v.code;
        var nextVerdict = (VERDICT[nextCode] || VERDICT.unknown).label;
        var nextNote = v.note;
        if (nextCode === 'diff' && rec.verifiable === 'no') {
          nextCode = 'echo';
          nextVerdict = '回显';
          nextNote = '这个渠道会回显你的模型名，名字对不上不能当证据';
        }
        rec.code = nextCode;
        rec.conf = v.conf || rec.conf || 'C';
        rec.verdict = nextVerdict;
        rec.note = nextNote;
        var obsPick = v.obs || (ev.observed && ev.observed.length ? ev.observed[0] : '');
        if (obsPick) {
          rec.obs = shortName(obsPick);
          var k = ev.observed ? ev.observed.indexOf(obsPick) : -1;
          if (k >= 0 && ev.observedSrc && ev.observedSrc[k]) rec.src = ev.observedSrc[k];
        }
      }
    }
  } catch (eLV) {}
}
function capture318Reconcile(ev) {
  if (!ev.__record || DISPOSED) return;
  var prevCode = ev.__record.code;
  ev.capture.lateReconciled = true;
  capture318ApplyLateVerdict(ev, ev.__record);
  capture318Record(ev, ev.__record);
  var rows = readLog(), found = false;
  for (var i = 0; i < rows.length; i++) {
    if (rows[i] && rows[i].requestId === ev.requestId) {
      capture318ApplyLateVerdict(ev, rows[i]);
      capture318Record(ev, rows[i]);
      found = true;
      break;
    }
  }
  if (found) {
    try { ar6LsSet(LOG_KEY, JSON.stringify(rows)); }
    catch (e) { ev.capture.persistenceError = String(e.message || e); }
  }
  try { if (typeof ledReconcile === 'function') ev.__ledEntry = ledReconcile(ev.__ledEntry, ev.__record); } catch (eLR) {}
  if (prevCode !== ev.__record.code) {
    try {
      if (ev.__record.code === 'same') {
        basePush(ev.__record);
        shapePush(ev.__record);
      } else if (ev.__record.code === 'diff' || ev.__record.code === 'thin') {
        var recL = ev.__record;
        var kindL = (VERDICT[recL.code] || VERDICT.unknown).color;
        banner((recL.code === 'diff' ? '🔴 ' : '🟠 ') + recL.verdict + '：' + recL.note + '（请求 ' + recL.req + '）', kindL, true);
        if (!cfg.silent && cfg.cardAuto && !(CARD && CARD.open)) {
          setTimeout(function () {
            try {
              if (DISPOSED || cfg.silent || !cfg.cardAuto || (CARD && CARD.open)) return;
              if (typeof jailAskPending === 'function' && jailAskPending()) return;
              openCard(recL);
            } catch (eCL) {}
          }, 800);
        }
      }
    } catch (eLvSync) {}
  }
  try { if (typeof render === 'function') render(); } catch (e) {}
}
function buildPeekEntry(ev, done, failed) {
  var entry = {
    done: !!done,
    failed: !!failed,
    hasText: !!ev.sawText,
    textChars: ev.chars || 0,
    model: ev.respModel || ev.modelVersion || '',
    modelVersion: ev.modelVersion || '',
    finish: ev.finishReason || ev.finish || '',
    raw: ev.rawSample || ''
  };
  if (ev.usageKeys) entry.usageKeys = ev.usageKeys;
  if (typeof ev.thinkTokens === 'number' && (ev.usageSeen || ev.thinkTokens > 0)) entry.thoughts = ev.thinkTokens;
  if (typeof ev.outTokens === 'number' && ev.outTokens > 0) entry.out = ev.outTokens;
  if (typeof ev.promptTokens === 'number' && ev.promptTokens > 0) entry.prompt = ev.promptTokens;
  return entry;
}
function capture318Parser(ev) {
  ev = ev || {};
  var cap = capture318(ev);
  var startAt = ev.__captureStart || nowMs();
  if (typeof ev.sawText !== 'boolean') ev.sawText = false;
  if (typeof ev.sawThink !== 'boolean') ev.sawThink = false;
  if (typeof ev.chars !== 'number') ev.chars = 0;
  if (typeof ev.thinkChars !== 'number') ev.thinkChars = 0;
  if (typeof ev.thinkTokens !== 'number') ev.thinkTokens = 0;
  if (typeof ev.outTokens !== 'number') ev.outTokens = 0;
  if (typeof ev.promptTokens !== 'number') ev.promptTokens = 0;
  if (typeof ev.peekChunks !== 'number') ev.peekChunks = 0;
  if (typeof ev.peekText !== 'string') ev.peekText = '';
  if (typeof ev.rawSample !== 'string') ev.rawSample = '';
  if (!Array.isArray(ev.observed)) ev.observed = [];
  if (!Array.isArray(ev.observedSrc)) ev.observedSrc = [];

  var lineBuf = '';
  var sawSSE = false;
  var jsonMode = false;
  var usageKeysMap = {};
  var tagSplitter = (typeof ar6CreateTagSplitter === 'function') ? ar6CreateTagSplitter() : null;
  var toolTracker = (typeof ar6CreateToolArgTracker === 'function') ? ar6CreateToolArgTracker() : null;
  var liveFeedAllowed = !ev.internal || String(cfg && cfg.contentOnly) === 'off';

  /* 非 SSE JSON / Gemini JSON 数组增量括号扫描状态 */
  var jBuf = '';
  var jPos = 0;
  var jDepth = 0;
  var jInStr = false;
  var jEsc = false;
  var jStart = -1;
  var MAX_PEEK_TEXT = 32768;
  var MAX_RAW_SAMPLE = 800;
  var MAX_JBUF = 524288;

  function recordUsageKeys(uObj) {
    if (!uObj || typeof uObj !== 'object') return;
    ev.usageSeen = true;
    var ks = Object.keys(uObj);
    for (var i = 0; i < ks.length; i++) if (ks[i]) usageKeysMap[ks[i]] = 1;
    ev.usageKeys = Object.keys(usageKeysMap).sort().join(',');
  }

  function pushLiveMeta() {
    try {
      if (!liveFeedAllowed || CAP318_LIVE !== ev.requestId || typeof liveStructMeta !== 'function') return;
      liveStructMeta(ev.requestId, {
        servedModel: ev.modelVersion || ev.respModel || '',
        thinkTokens: ev.thinkTokens || 0,
        outTokens: ev.outTokens || 0,
        usageZeroThink: !!ev.usageZeroThink
      });
    } catch (eLM) {}
  }

  function setModel(m) {
    if (!m || typeof m !== 'string') return;
    var clean = m.trim();
    if (!clean) return;
    ev.modelVersion = clean;
    if (!ev.respModel) ev.respModel = clean;
    if ('actualModel' in ev) ev.actualModel = clean;
    pushObs(ev, clean, 'body');
    pushLiveMeta();
  }

  function setFinish(r) {
    if (!r) return;
    ev.finishReason = String(r);
  }

  function commitBodyText(txt, via) {
    if (typeof txt !== 'string' || !txt) return;
    ev.chars += txt.length;
    ev.textLen = ev.chars;
    ev.peekChars = ev.chars;
    if (via === 'tool') ev.sawToolBody = true;
    if (/\S/.test(txt)) {
      ev.sawText = true;
      var dt = Math.max(1, nowMs() - startAt);
      if (cap.firstContentMs == null) cap.firstContentMs = dt;
      if (!ev.firstMs) ev.firstMs = dt;
    }
    if (ev.peekText.length < MAX_PEEK_TEXT) {
      ev.peekText += txt.slice(0, MAX_PEEK_TEXT - ev.peekText.length);
    }
    ev.tailText = (ev.tailText ? ev.tailText + txt : txt).slice(-512);
    try {
      if (liveFeedAllowed && CAP318_LIVE === ev.requestId && typeof liveStructDelta === 'function') {
        liveStructDelta(ev.requestId, txt.length, 0, via || 'text');
      }
    } catch (eLB1) {}
  }

  function addThinkText(txt) {
    if (typeof txt !== 'string' || !txt) return;
    ev.thinkChars += txt.length;
    ev.thinkLen = ev.thinkChars;
    if (/\S/.test(txt)) {
      ev.sawThink = true;
      ev.hasThink = true;
      ev.hasReasonField = true;
      ev.usageZeroThink = false;
      if (cap.firstThinkMs == null) cap.firstThinkMs = Math.max(1, nowMs() - startAt);
    }
    try {
      if (liveFeedAllowed && CAP318_LIVE === ev.requestId && typeof liveStructDelta === 'function') {
        liveStructDelta(ev.requestId, 0, txt.length, 'think');
      }
    } catch (eLT1) {}
  }

  function addText(txt, via) {
    if (typeof txt !== 'string' || !txt) return;
    if (tagSplitter) {
      var sp = tagSplitter.feed(txt);
      if (sp.think) addThinkText(sp.think);
      if (sp.body) commitBodyText(sp.body, via || 'text');
      return;
    }
    commitBodyText(txt, via || 'text');
  }

  function tryParseObj(raw) {
    if (!raw) return false;
    var obj;
    try {
      obj = JSON.parse(raw);
    } catch (_) {
      return false;
    }
    if (!obj || typeof obj !== 'object') return false;
    if (Array.isArray(obj)) {
      for (var i = 0; i < obj.length; i++) {
        if (obj[i] && typeof obj[i] === 'object') absorbObj(obj[i]);
      }
      return true;
    }
    absorbObj(obj);
    return true;
  }

  function absorbObj(obj) {
    ev.peekChunks += 1;

    /* 1. 模型版本提取（兼容 Gemini modelVersion / OpenAI model / OpenRouter served_model / Claude message.model） */
    setModel(obj.modelVersion || obj.model || obj.served_model || (obj.message && obj.message.model) || (obj.response && obj.response.model));

    /* 2. 200 响应体夹带错误对象检测 */
    if (obj.error) {
      var em = typeof obj.error === 'string'
        ? obj.error
        : (obj.error.message || obj.error.code || obj.error.type || 'stream-error');
      ev.errObj = obj.error;
      ev.errMsg = String(em);
    }

    /* 3. OpenAI Chat / Completions（流式 delta 与非流式 message，含 reasoning_details 与 tool_calls 正文解包） */
    if (Array.isArray(obj.choices)) {
      for (var i = 0; i < obj.choices.length; i++) {
        var c = obj.choices[i];
        if (!c || typeof c !== 'object') continue;
        if (c.finish_reason) setFinish(c.finish_reason);

        var msg = c.delta || c.message || null;
        if (msg && typeof msg === 'object') {
          var rTxt = msg.reasoning_content || msg.reasoning || msg.thinking || '';
          if (typeof rTxt === 'string' && rTxt) addThinkText(rTxt);
          if (Array.isArray(msg.reasoning_details)) {
            for (var rdi = 0; rdi < msg.reasoning_details.length; rdi++) {
              var rd = msg.reasoning_details[rdi];
              if (!rd || typeof rd !== 'object') continue;
              var rdStr = rd.text || rd.summary || rd.content || '';
              if (typeof rdStr === 'string' && rdStr) addThinkText(rdStr);
            }
          }

          var content = msg.content;
          if (typeof content === 'string') {
            addText(content, 'text');
          } else if (Array.isArray(content)) {
            for (var k = 0; k < content.length; k++) {
              var cp = content[k];
              if (!cp || typeof cp !== 'object') continue;
              if (cp.thought === true || cp.type === 'thinking' || cp.type === 'reasoning') {
                addThinkText(cp.thinking || cp.text || '');
              } else if (typeof cp.text === 'string') {
                addText(cp.text, 'text');
              }
            }
          }

          /* V5.7 工具通道正文增量采样（兼容 lk_write 及通用正文交付类工具参数提取） */
          if (toolTracker) {
            if (Array.isArray(msg.tool_calls) && msg.tool_calls.length) {
              for (var tci = 0; tci < msg.tool_calls.length; tci++) {
                var tc = msg.tool_calls[tci];
                var tfn = tc && tc.function;
                if (tfn && typeof tfn.arguments === 'string' && tfn.arguments) {
                  var tcIdx = (typeof tc.index === 'number') ? tc.index : tci;
                  var tDelta = toolTracker.feedStr('oai_' + i + '_' + tcIdx, tfn.arguments);
                  if (tDelta) addText(tDelta, 'tool');
                }
              }
            }
            if (msg.function_call && typeof msg.function_call.arguments === 'string' && msg.function_call.arguments) {
              var fcDelta = toolTracker.feedStr('oai_fc_' + i, msg.function_call.arguments);
              if (fcDelta) addText(fcDelta, 'tool');
            }
          }
        } else if (typeof c.text === 'string') {
          addText(c.text, 'text');
        }
      }
    }

    /* 4. OpenAI Responses API 兼容 */
    if (obj.type === 'response.output_text.delta' && typeof obj.delta === 'string') {
      addText(obj.delta, 'text');
    } else if (obj.type === 'response.reasoning_summary_text.delta' && typeof obj.delta === 'string') {
      addThinkText(obj.delta);
    }

    /* 5. Gemini 原生格式（promptFeedback + candidates[].content.parts[]，含 thought:true 与 functionCall.args） */
    if (obj.promptFeedback && obj.promptFeedback.blockReason) {
      ev.blockReason = String(obj.promptFeedback.blockReason);
      setFinish(ev.blockReason);
    }
    if (Array.isArray(obj.candidates)) {
      for (var ci = 0; ci < obj.candidates.length; ci++) {
        var cand = obj.candidates[ci];
        if (!cand || typeof cand !== 'object') continue;
        if (cand.finishReason) setFinish(cand.finishReason);
        if (cand.modelVersion) setModel(cand.modelVersion);

        var parts = cand.content && cand.content.parts;
        if (Array.isArray(parts)) {
          for (var pi = 0; pi < parts.length; pi++) {
            var part = parts[pi];
            if (!part || typeof part !== 'object') continue;
            if (part.thought === true) {
              if (typeof part.text === 'string') addThinkText(part.text);
            } else if (part.functionCall && part.functionCall.args && toolTracker) {
              var gFcDelta = toolTracker.feedObj('gem_' + ci + '_' + pi + '_' + String(part.functionCall.name || ''), part.functionCall.args);
              if (gFcDelta) addText(gFcDelta, 'tool');
            } else if (typeof part.text === 'string') {
              addText(part.text, 'text');
            }
          }
        }
      }
    }

    /* 6. Claude / Anthropic 流式与非流式兼容（含 input_json_delta 工具参数） */
    if (obj.type === 'content_block_delta' && obj.delta) {
      if (obj.delta.type === 'text_delta' && typeof obj.delta.text === 'string') {
        addText(obj.delta.text, 'text');
      } else if (obj.delta.type === 'thinking_delta' && typeof obj.delta.thinking === 'string') {
        addThinkText(obj.delta.thinking);
      } else if (obj.delta.type === 'input_json_delta' && typeof obj.delta.partial_json === 'string' && toolTracker) {
        var aDelta = toolTracker.feedStr('anth_' + String(obj.index || 0), obj.delta.partial_json);
        if (aDelta) addText(aDelta, 'tool');
      }
    } else if (obj.type === 'message_delta' && obj.delta && obj.delta.stop_reason) {
      setFinish(obj.delta.stop_reason);
    } else if (obj.type === 'message' && Array.isArray(obj.content)) {
      for (var ai = 0; ai < obj.content.length; ai++) {
        var blk = obj.content[ai];
        if (!blk || typeof blk !== 'object') continue;
        if (blk.type === 'thinking') addThinkText(blk.thinking || blk.text || '');
        else if (blk.type === 'text') addText(blk.text || '', 'text');
        else if (blk.type === 'tool_use' && blk.input && toolTracker) {
          var tuDelta = toolTracker.feedObj('anth_tu_' + ai, blk.input);
          if (tuDelta) addText(tuDelta, 'tool');
        }
      }
    }

    /* 7. Token 统计（使用 Math.max 防止流式累计快照被重复累加，同步推到采样悬浮窗） */
    var u = obj.usage || (obj.response && obj.response.usage);
    if (u && typeof u === 'object') {
      recordUsageKeys(u);
      if (u.completion_tokens_details && typeof u.completion_tokens_details === 'object') recordUsageKeys(u.completion_tokens_details);
      var pTok = u.prompt_tokens || u.input_tokens || 0;
      if (pTok > ev.promptTokens) ev.promptTokens = pTok;
      var oTok = u.completion_tokens || u.output_tokens || 0;
      if (oTok > ev.outTokens) ev.outTokens = oTok;
      var hasRKey = ('reasoning_tokens' in u) ||
        (u.completion_tokens_details && ('reasoning_tokens' in u.completion_tokens_details)) ||
        (u.output_tokens_details && ('reasoning_tokens' in u.output_tokens_details));
      var rTok = (u.completion_tokens_details && u.completion_tokens_details.reasoning_tokens)
        || (u.output_tokens_details && u.output_tokens_details.reasoning_tokens)
        || u.reasoning_tokens || 0;
      if (rTok > ev.thinkTokens) {
        ev.thinkTokens = rTok;
        ev.thoughtTok = rTok;
        ev.sawThink = true;
        ev.hasThink = true;
        ev.usageZeroThink = false;
      } else if (hasRKey && rTok === 0 && !ev.hasThink) {
        ev.usageZeroThink = true;
      }
      pushLiveMeta();
    }

    var um = obj.usageMetadata;
    if (um && typeof um === 'object') {
      recordUsageKeys(um);
      if (typeof um.promptTokenCount === 'number' && um.promptTokenCount > ev.promptTokens) {
        ev.promptTokens = um.promptTokenCount;
      }
      var umOut = (typeof um.candidatesTokenCount === 'number') ? um.candidatesTokenCount
        : ((typeof um.outputTokenCount === 'number') ? um.outputTokenCount : -1);
      if (umOut > ev.outTokens) {
        ev.outTokens = umOut;
      }
      if (typeof um.thoughtsTokenCount === 'number') {
        if (um.thoughtsTokenCount > ev.thinkTokens) {
          ev.thinkTokens = um.thoughtsTokenCount;
          ev.thoughtsTokenCount = um.thoughtsTokenCount;
          ev.thoughtTok = um.thoughtsTokenCount;
        }
        if (um.thoughtsTokenCount > 0) {
          ev.sawThink = true;
          ev.hasThink = true;
          ev.usageZeroThink = false;
        } else if (!ev.hasThink) {
          ev.usageZeroThink = true;
        }
      }
      pushLiveMeta();
    }
  }

  function isBalancedObj(s) {
    var t = s.replace(/^\s+|\s+$/g, '');
    if (t.charAt(0) !== '{' || t.charAt(t.length - 1) !== '}') return false;
    var d = 0, inS = false, esc = false;
    for (var i = 0; i < t.length; i++) {
      var ch = t.charAt(i);
      if (inS) {
        if (esc) esc = false;
        else if (ch === '\\') esc = true;
        else if (ch === '"') inS = false;
      } else {
        if (ch === '"') inS = true;
        else if (ch === '{') d++;
        else if (ch === '}') {
          d--;
          if (d === 0) return i === t.length - 1;
          if (d < 0) return false;
        }
      }
    }
    return false;
  }

  function feedJsonScanner(chunk) {
    if (!chunk) return;
    jBuf += chunk;
    if (jBuf.length > MAX_JBUF && jDepth === 0) {
      jBuf = '';
      jPos = 0;
      return;
    }
    for (var i = jPos; i < jBuf.length; i++) {
      var ch = jBuf.charAt(i);
      if (jInStr) {
        if (jEsc) jEsc = false;
        else if (ch === '\\') jEsc = true;
        else if (ch === '"') jInStr = false;
      } else {
        if (ch === '"') {
          if (jDepth > 0) jInStr = true;
        } else if (ch === '{') {
          if (jDepth === 0) jStart = i;
          jDepth++;
        } else if (ch === '}') {
          if (jDepth > 0) {
            jDepth--;
            if (jDepth === 0 && jStart >= 0) {
              var slice = jBuf.slice(jStart, i + 1);
              tryParseObj(slice);
              jBuf = jBuf.slice(i + 1);
              i = -1;
              jPos = 0;
              jStart = -1;
              continue;
            }
          }
        }
      }
    }
    jPos = jBuf.length;
    if (jDepth === 0 && jBuf.length > 4096) {
      jBuf = '';
      jPos = 0;
    }
  }

  function handleLine(rawLine) {
    var line = rawLine.replace(/\r$/, '');
    var trimmed = line.replace(/^\s+/, '');
    if (!trimmed) return;

    if (trimmed.indexOf('data:') === 0) {
      sawSSE = true;
      var payload = trimmed.slice(5).replace(/^\s+/, '');
      if (!payload || payload === '[DONE]') return;
      tryParseObj(payload);
      return;
    }

    /* 忽略 SSE 元数据与注释行 */
    if (
      trimmed.charAt(0) === ':' ||
      trimmed.indexOf('event:') === 0 ||
      trimmed.indexOf('id:') === 0 ||
      trimmed.indexOf('retry:') === 0
    ) {
      sawSSE = true;
      return;
    }

    if (!sawSSE) {
      jsonMode = true;
      feedJsonScanner(line + '\n');
    }
  }

  function push(chunk, isFinal) {
    if (typeof chunk === 'string' && chunk) {
      if (cap.firstByteMs == null) cap.firstByteMs = Math.max(1, nowMs() - startAt);
      if (ev.rawSample.length < MAX_RAW_SAMPLE) {
        ev.rawSample += chunk.slice(0, MAX_RAW_SAMPLE - ev.rawSample.length);
      }
      if (jsonMode && !sawSSE) {
        feedJsonScanner(chunk);
      } else {
        lineBuf += chunk;
        var nl = lineBuf.indexOf('\n');
        while (nl >= 0) {
          var oneLine = lineBuf.slice(0, nl);
          lineBuf = lineBuf.slice(nl + 1);
          handleLine(oneLine);
          nl = lineBuf.indexOf('\n');
        }

        /* 处理单行无换行的输入（兼容单元测试 absorbPeek 直接传单行 JSON 或单行 SSE） */
        if (lineBuf) {
          var rem = lineBuf.replace(/^\s+/, '');
          if (!sawSSE && (rem.charAt(0) === '{' || rem.charAt(0) === '[')) {
            jsonMode = true;
            var toScan = lineBuf;
            lineBuf = '';
            feedJsonScanner(toScan);
          } else if (rem.indexOf('data:') === 0) {
            var sseData = rem.slice(5).replace(/^\s+/, '');
            if (sseData === '[DONE]') {
              sawSSE = true;
              lineBuf = '';
            } else if (isBalancedObj(sseData) && tryParseObj(sseData)) {
              sawSSE = true;
              lineBuf = '';
            }
          }
        }
      }
    }
    if (isFinal === true) flush();
    return ev;
  }

  function flush(lastChunk) {
    if (typeof lastChunk === 'string' && lastChunk) push(lastChunk, false);
    if (lineBuf) {
      var rest = lineBuf;
      lineBuf = '';
      handleLine(rest);
    }
    if (jBuf) {
      var tail = jBuf.replace(/^\s+|\s+$/g, '');
      jBuf = '';
      jPos = 0;
      jDepth = 0;
      jInStr = false;
      jEsc = false;
      jStart = -1;
      if (tail) tryParseObj(tail);
    }
    if (tagSplitter) {
      var tf = tagSplitter.flush();
      if (tf.think) addThinkText(tf.think);
      if (tf.body) commitBodyText(tf.body, 'text');
    }
    return ev;
  }

  /* 同时支持函数调用 p(chunk) 与方法调用 p.push/p.feed/p.flush/p.end */
  push.push = push;
  push.feed = push;
  push.write = push;
  push.chunk = push;
  push.absorb = push;
  push.flush = flush;
  push.finish = flush;
  push.end = flush;
  push.done = flush;
  push.ev = ev;

  return push;
}

function absorbPeek(text,rid,ev){
  if(!ev)return;
  var legacyRecord=ev.__record&&!ev.requestId&&!ev.__record.requestId?ev.__record:null;
  ev.rid=rid; capture318(ev);
  var p=capture318Parser(ev);
  try{ p.feed(String(text||'')); p.end('body-eof',null); }catch(ePeek){}
  /* 把解析结果接回 capture 与 PEEKS */
  try{
    var cp=ev.capture;
    if(cp){
      cp.bodyChars=ev.chars; cp.thinkChars=ev.thinkChars; cp.thinkTokens=ev.thinkTokens;
      if(ev.finishReason)cp.finishReason=String(ev.finishReason);
      if(ev.blockReason)cp.error=String(ev.blockReason);
      if(cp.source==='none'||cp.source==='unavailable')cp.source='peek';
      if(cp.status==='unavailable')cp.status='complete';
    }
    ev.bodyChars=ev.chars; ev.thinkChars=ev.thinkChars; ev.thinkTokens=ev.thinkTokens;
    if(ev.rid) PEEKS[ev.rid] = buildPeekEntry(ev, true, false);
  }catch(eCap){}
  /* 实际服务模型：只在有值时记一笔；归一后同名不算被换（与报告口径一致） */
  try{
    var smv=String(ev.modelVersion||ev.respModel||'');
    if(smv){
      pushObs(ev, smv, 'body');
      if(!ev.__srv){
        ev.__srv=1; ev.servedModel=smv;
        var want=String(ev.requestedModel||(lastReq&&lastReq.model)||SERVED.want||'');
        SERVED.last=smv; SERVED.at=nowMs(); SERVED.checked=(SERVED.checked||0)+1;
        if(want){
          SERVED.want=want;
          if(normModelName(want)!==normModelName(smv)){ SERVED.mismatch=(SERVED.mismatch||0)+1; ev.routeHit=true; }
        }
      }
    }
  }catch(eSrv){}
  if(legacyRecord)patchRecChars(legacyRecord,ev.bodyChars);
  try{
    if(!ev.internal&&typeof lkLimitWatch==='function'&&ev.finishReason){
      var bk1=(typeof lastReqBase==='function'&&lastReqBase())||'default';
      if(!lkLimitWatch(ev.outTokens,ev.finishReason,bk1)&&ev.thinkTokens>0){
        lkLimitWatch((ev.outTokens||0)+ev.thinkTokens,ev.finishReason,bk1);
      }
    }
  }catch(eLW1){}
}
function peekBody(res,ev){
  var c=capture318(ev);
  var allowPeek = !ev.internal || String(cfg && cfg.contentOnly) === 'off';
  if(!cfg.peek||cfg.safe||!allowPeek||!res||typeof res.clone!=='function'){c.settleReason='sampling-disabled';return null;}
  var clone;
  try{clone=res.clone();}catch(e){c.status='failed';c.error=String(e.message||e);c.settleReason='clone-error';return null;}
  ev.__peekStarted=true;ev.__peekPending=true;c.status='streaming';
  return new Promise(function(resolve){
    var done=false,reader=null,bytes=0,p=capture318Parser(ev),timer=setTimeout(function(){settle('timeout','sampling-timeout');cancel();},120000);
    function cancel(){try{if(reader)Promise.resolve(reader.cancel()).catch(function(){});}catch(e){}}
    function settle(reason,error){
      if(done)return;
      done=true;clearTimeout(timer);ev.__peekPending=false;
      if(!DISPOSED){
        try{p.end(reason,error);}catch(eEnd){}
        try{
          var elapsed=Math.max(1,nowMs()-(ev.__captureStart||nowMs()));
          if(c.totalMs==null)c.totalMs=ev.totalMs||elapsed;
          if(!ev.totalMs)ev.totalMs=c.totalMs;
          if(c.firstContentMs==null&&ev.firstMs)c.firstContentMs=ev.firstMs;
          if(!ev.firstMs&&c.firstContentMs!=null)ev.firstMs=c.firstContentMs;
          c.bodyChars=ev.chars; c.thinkChars=ev.thinkChars; c.thinkTokens=ev.thinkTokens;
          c.settleReason=reason; c.status=error?'failed':'complete';
          if(error)c.error=error;
          if(ev.finishReason){c.finishReason=String(ev.finishReason); if(!ev.finish)ev.finish=String(ev.finishReason);}
          if(ev.blockReason)c.error=String(ev.blockReason);
          if(c.source==='none'||c.source==='unavailable')c.source='peek';
          ev.bodyChars=ev.chars;
          if(!ev.outputChars||ev.outputChars<ev.chars)ev.outputChars=ev.chars;
          if(ev.tailText&&!ev.tail)ev.tail=ev.tailText;
          var smv2=String(ev.modelVersion||ev.respModel||'');
          if(smv2){
            pushObs(ev,smv2,'body');
            if(!ev.__srv){
              ev.__srv=1; ev.servedModel=smv2;
              var want=String(ev.requestedModel||(lastReq&&lastReq.model)||SERVED.want||'');
              SERVED.last=smv2; SERVED.at=nowMs(); SERVED.checked=(SERVED.checked||0)+1;
              if(want){
                SERVED.want=want;
                if(normModelName(want)!==normModelName(smv2)){ SERVED.mismatch=(SERVED.mismatch||0)+1; ev.routeHit=true; }
              }
            }
          }
          if(ev.rid)PEEKS[ev.rid]=buildPeekEntry(ev,true,!!error);
          if(ev.__record)capture318Reconcile(ev);
          if(!ev.internal&&typeof lkLimitWatch==='function'&&ev.finishReason){
            var bk2=(typeof lastReqBase==='function'&&lastReqBase())||'default';
            if(!lkLimitWatch(ev.outTokens,ev.finishReason,bk2)&&ev.thinkTokens>0){
              lkLimitWatch((ev.outTokens||0)+ev.thinkTokens,ev.finishReason,bk2);
            }
          }
        }catch(eSync){}
      }
      resolve();
    }
    try{
      if(clone.body&&typeof clone.body.getReader==='function'){
        reader=clone.body.getReader();
        var decoder=new HOST.TextDecoder();
        function step(){
          Promise.resolve(reader.read()).then(function(r){
            if(done)return;
            if(DISPOSED){settle('disposed','disposed');cancel();return;}
            if(r.done){var rest=decoder.decode();if(rest){p.feed(rest);try{if(allowPeek)livePeekChunk(rest);}catch(eL0){}}settle('body-eof',null);return;}
            if(c.firstByteMs==null)c.firstByteMs=Math.max(1,nowMs()-(ev.__captureStart||nowMs()));
            bytes+=r.value.byteLength;
            try{if(allowPeek)liveBytes(r.value.byteLength);}catch(eLb){}
            if(bytes>8000000){settle('byte-limit','sampling-byte-limit');cancel();return;}
            var sChunk=decoder.decode(r.value,{stream:true});
            if(sChunk){p.feed(sChunk);try{if(allowPeek)livePeekChunk(sChunk);}catch(eL1){}}
            step();
          }).catch(function(e){settle('read-error',String(e.message||e));cancel();});
        }
        step();
      } else {
        Promise.resolve(clone.text()).then(function(t){
          try{var st=String(t||'');p.feed(st);try{if(allowPeek&&st)livePeekChunk(st);}catch(eL2){}settle('body-eof',null);}
          catch(e){settle('parse-error',String(e.message||e));}
        },function(e){settle('read-error',String(e.message||e));});
      }
    }catch(e){settle('read-error',String(e.message||e));cancel();}
  });
}



/* ---------------- 零锁宿主观察器 ---------------- */

function stCtx() {
  try {
    var st = (HOST && HOST.SillyTavern) || (typeof SELF_WIN !== 'undefined' && SELF_WIN && SELF_WIN.SillyTavern);
    if (st && typeof st.getContext === 'function') return st.getContext();
  } catch (e) {}
  return null;
}

function isBusy() {
  try {
    if (HOST.is_send_press || HOST.is_generating) return true;
    var body = DOC && DOC.body;
    if (body && body.classList && body.classList.contains('generating')) return true;
    var stop = DOC && DOC.getElementById && DOC.getElementById('mes_stop');
    if (stop && stop.style && stop.style.display !== 'none') return true;
  } catch (e) {}
  return false;
}

var WATCHERS = [];   /* 正在跑的观察器定时器，dispose 时统一清 */

function stopWatchers() {
  try {
    for (var i2 = 0; i2 < WATCHERS.length; i2++) clearInterval(WATCHERS[i2]);
    WATCHERS.length = 0;
  } catch (e) {}
}

/* 核心事件快通道：有事件就以事件为准，没有就回退轮询 */
var EV_TICK = { seq: 0, lastTokenAt: 0, lastEndAt: 0, bound: false };
function bindStreamEvents() {
  if (EV_TICK.bound) return true;
  try {
    var w = SELF_WIN || null;
    if (!w || typeof w.eventOn !== 'function') return false;
    try { w.eventOn('stream_token_received', function (d) { EV_TICK.lastTokenAt = nowMs(); try { liveToken(d); } catch (eLv) {} }); } catch (e1) {}
    try { w.eventOn('generation_ended', function () { EV_TICK.lastEndAt = nowMs(); EV_TICK.seq++; TH_GEN.active = false; }); } catch (e2) {}
    try { w.eventOn('generation_stopped', function () { TH_GEN.active = false; }); } catch (e3) {}
    try { w.eventOn('js_generation_started', function () { TH_GEN.active = true; TH_GEN.at = nowMs(); }); } catch (e4) {}
    try { w.eventOn('js_generation_ended', function () { TH_GEN.active = false; }); } catch (e5) {}
    try { w.eventOn('user_message_rendered', function () { TH_GEN.active = false; }); } catch (e6) {}
    EV_TICK.bound = true;
    return true;
  } catch (e) { return false; }
}

/* v3.1.1：收尾判定的停顿阈值。流还在跑就别急着收——3.1 之前固定 2.2s，
   长正文里一次思考停顿就被判「写完了」，记录和补写都抢在半句话上。 */
function settleMsOf(ended) {
  return ended ? 2200 : 20000;
}

function startWatcher(ev, meta, reqStart) {
  var ctx = stCtx();
  if (!ctx || !Array.isArray(ctx.chat)) {
    /* V4.7.0：被 handleFetch 提前调用时不能按 0 字结算，改为报告没启动 */
    return false;
  }
  var baseLen = ctx.chat.length;
  var baseMes = baseLen ? String(ctx.chat[baseLen - 1] && ctx.chat[baseLen - 1].mes || '') : '';
  var lastLen = 0;
  var lastChange = nowMs();
  var sawBusy = false;
  var polls = 0;
  var evSeq0 = EV_TICK.seq;
  var evEndAt = 0;
  var graceUntil = 0;
  bindStreamEvents();

  var timer = setInterval(function () {
    polls++;
    var t = nowMs();
    try {
      if (isBusy()) sawBusy = true;
      var c = ev.internal ? null : stCtx();
      var chat = c && Array.isArray(c.chat) ? c.chat : null;
      if (chat && chat.length) {
        var msg = chat[chat.length - 1];
        var isAi = msg && !msg.is_user;
        /* v8.29：/continue、swipe、regenerate 不新增消息，末条原地改写也要认领。
           认领条件 = 聊天变长，或「末条是 AI + 正文非空 + 与认领时不一样」。 */
        var grew = chat.length > baseLen;
        var mesNow = String((msg && msg.mes) || '');
        var contOnly = !grew && isAi && mesNow.length > 0 && mesNow !== baseMes;
        if (isAi && (grew || contOnly)) {
          var mesStr = mesNow;
          var reason = '';
          try {
            var ex = msg.extra || {};
            reason = String(ex.reasoning || ex.thinking || '');
            /* 只在本轮生成窗口内的消息上取标签；老聊天/导入记录里的 model 是历史标签 */
            var freshMsg = true;
            try {
              var stamp = (ex.gen_finished) || msg.gen_finished || (ex.gen_started) || msg.send_date || '';
              var ts = Date.parse(stamp);
              /* 解析不了就当"不新鲜"：宁可少一条标签，也不认领别人的消息 */
              if (isNaN(ts) || ts + 8000 < reqStart) freshMsg = false;
            } catch (eS) { }
            if (freshMsg && ex.model && normModel(ex.model)) pushObs(ev, ex.model, 'msg');
            if (freshMsg && ex.api_model) pushObs(ev, ex.api_model, 'msg');
          } catch (e2) {}
          var joined = mesStr + (reason ? '\n' + reason : '');
          var spMes = (typeof liveTagSplit === 'function') ? liveTagSplit(mesStr) : { body: mesStr.length, think: 0 };
          var pureBodyLen = spMes.body;
          var mesThinkLen = spMes.think + reason.length;
          if (joined.length > 0 && !ev.firstMs) ev.firstMs = Math.max(1, t - reqStart);
          if (joined.length !== lastLen) { lastLen = joined.length; lastChange = t; }
          try { livePoll(mesStr, reason); } catch (eLp) {}
          if (joined.length) {
            ev.sawText = true;
            ev.chatSaw = true;
            /* V5.65：outputChars 只计纯正文字数，不再把 extra.reasoning 或思考标签内容拼进正文，避免污染速率与基线 */
            var grewChars = mesStr.length - baseMes.length;
            var pureNow = pureBodyLen > 0 ? pureBodyLen : mesStr.length;
            ev.outputChars = contOnly ? (grewChars > 0 ? grewChars : pureNow) : pureNow;
            ev.mesChars = pureNow;
            ev.head = mesStr.slice(0, 160);
            ev.tail = mesStr.slice(-600);
            if (mesThinkLen > 0) {
              ev.hasThink = true;
              ev.hasReasonField = true;
              if (!ev.thinkChars || mesThinkLen > ev.thinkChars) ev.thinkChars = mesThinkLen;
              if (!ev.thoughtTok) ev.thoughtTok = estimateTokens(reason || mesStr.slice(0, spMes.think));
            }
          }
        }
      }
      var ended = EV_TICK.seq > evSeq0;
      if (ended && !evEndAt) evEndAt = EV_TICK.lastEndAt || t;
      /* 有正文才算有结果；事件说结束了也算（此时 chat 通常已提交） */
      var progress = ev.internal ? (ev.sawText ? 1 : 0) : lastLen;
      var settled = progress > 0 && (!isBusy() || t - lastChange > settleMsOf(ended) || ended);
      var stopped = !ev.internal && sawBusy && !isBusy() && progress > 0 && t - reqStart > 1200 && t - lastChange > 900;
      var noCtx = !stCtx() && polls >= 3;
      var timeout = t - reqStart > 120000;
      var wants = settled || stopped || noCtx || timeout || (ended && t - reqStart > 600);
      if (wants && progress === 0 && !timeout) {
        /* 宽限复查：流式期间 chat.mes 可能还没提交，别急着判空回 */
        if (!graceUntil) graceUntil = t + 1500;
        if (t < graceUntil) return;
      }
      if (wants) {
        clearInterval(timer); var wi = WATCHERS.indexOf(timer); if (wi >= 0) WATCHERS.splice(wi, 1);
        ev.totalMs = Math.max(1, t - reqStart);
        finish(ev, meta);
      }
    } catch (e3) {
      clearInterval(timer); var wi = WATCHERS.indexOf(timer); if (wi >= 0) WATCHERS.splice(wi, 1);
      try { ev.totalMs = Math.max(1, nowMs() - reqStart); finish(ev, meta); } catch (e4) {}
    }
  }, 150);
  WATCHERS.push(timer);
  return true;
}

/* ---------------- 请求处理 ---------------- */

/* ---------- 3.2.8 正文还原（档 A 的输出侧）----------
   模型会把读到的「未-成年」照抄进正文。这里只把**我们自己插的**那几个连字符合回去：
   左右两侧都必须是已知断词的一半，正文里正常的连字符、破折号一律不碰。 */
var DESENS_UNMASK_RULES = [
  [/\u00a6/g, ''],
  [/未-成年/g, '未成年'],
  [/未满-(18|十八)/g, '未满$1'],
  [/幼-儿园/g, '幼儿园'],
  [/(小学|初中|高中|中学)-生/g, '$1生'],
  [/萝-莉/g, '萝莉'],
  [/正-太/g, '正太'],
  [/幼-(女|童)/g, '幼$1'],
  [/童-(男|女)/g, '童$1'],
  [/(恋|戀)-(童|幼)/g, '$1$2'],
  [/稚-嫩/g, '稚嫩'],
  [/幼-稚/g, '幼稚'],
  [/(十[一二三四五六七八九])-\s*(岁|歲|周岁)/g, '$1$2'],
  [/(^|[^\d])(1[0-7])-\s*(岁|歲|周岁)/g, '$1$2$3'],
];
/* 我们可能插出来的完整断词：流式切块时，末尾若是其中任何一个的前缀就先攥住 */
var DESENS_MASKED = ['未\u00a6成年', '未满\u00a618', '未满\u00a6十八', '幼\u00a6儿园', '小学\u00a6生', '初中\u00a6生', '高中\u00a6生',
  '中学\u00a6生', '萝\u00a6莉', '正\u00a6太', '幼\u00a6女', '幼\u00a6童', '童\u00a6男', '童\u00a6女', '恋\u00a6童', '戀\u00a6童', '恋\u00a6幼',
  '戀\u00a6幼', '稚\u00a6嫩', '幼\u00a6稚'];
function desensRestoreTxt(t) {
  if (typeof t !== 'string' || !t) return t;
  var s = t;
  for (var i = 0; i < DESENS_UNMASK_RULES.length; i++) s = s.replace(DESENS_UNMASK_RULES[i][0], DESENS_UNMASK_RULES[i][1]);
  try { if (typeof LK_ARMOR_BUSY !== 'undefined' && LK_ARMOR_BUSY && typeof lkArmorRestore === 'function') s = lkArmorRestore(s); } catch (eAR3) {}
  return s;
}
function desensSafeCut(s) {
  var best = s.length;
  for (var i = 0; i < DESENS_MASKED.length; i++) {
    var p = DESENS_MASKED[i];
    for (var k = 1; k < p.length && k <= s.length; k++) {
      if (s.slice(s.length - k) === p.slice(0, k)) { if (s.length - k < best) best = s.length - k; }
    }
  }
  /* 末尾停在 ¦ 上：半截断词先攥住 */
  var mi = s.lastIndexOf('\u00a6');
  if (mi >= 0 && s.length - mi <= 3) best = Math.min(best, mi);
  /* 数字 / 十X + 连字符结尾：还差一个「岁」 */
  var mDig = /(?:^|[^\d])((1[0-7])|(十[一二三四五六七八九]))-$/.exec(s);
  if (mDig) {
    var hold = (mDig[2] || mDig[3]).length + 1;
    best = Math.min(best, s.length - hold);
  }
  /* 码点护甲转义半截（\、\\、\u、\u4e、\\u4e2）：跨分片先攥住，绝不放出半截转义 */
  var mArm = /\\{1,2}(?:u[0-9A-Fa-f]{0,3})?$/.exec(s);
  if (mArm) best = Math.min(best, mArm.index);
  return best < 0 ? 0 : best;
}
function desensWrapResponse(res) {
  try {
    var H = HOST || {};
    if (typeof H.TransformStream !== 'function' || typeof H.Response !== 'function' || typeof H.TextDecoder !== 'function' || typeof H.TextEncoder !== 'function') return res;
    var dec = new H.TextDecoder('utf-8');
    var enc = new H.TextEncoder();
    var tail = '';
    var ts = new H.TransformStream({
      transform: function (chunk, ctl) {
        var s = tail + dec.decode(chunk, { stream: true });
        var cut = desensSafeCut(s);
        tail = s.slice(cut);
        var head = s.slice(0, cut);
        if (head) ctl.enqueue(enc.encode(desensRestoreTxt(head)));
      },
      flush: function (ctl) {
        var all = desensRestoreTxt(tail + dec.decode());
        if (all) ctl.enqueue(enc.encode(all));
        tail = '';
      }
    });
    var headers = new H.Headers();
    try {
      res.headers.forEach(function (v, k) {
        var lk = String(k).toLowerCase();
        if (lk === 'content-length' || lk === 'content-encoding' || lk === 'transfer-encoding') return;
        headers.set(k, v);
      });
    } catch (eH2) {}
    return new H.Response(res.body.pipeThrough(ts), { status: res.status, statusText: res.statusText, headers: headers });
  } catch (e) { return res; }
}
var DESENS_FIXED = 0;
function desensMaybeRestore(res, plan, internal) {
  try {
    if (!res || internal || !cfg.enabled) return res;
    if (!plan) return res;
    /* 若武装货舱已接管解包，文本字段已在对象层完成脱敏与护甲还原，避免双重包裹响应流 */
    if (plan.tool && cfg.toolChan === 'on') return res;
    var needDesens = !!(plan.desens && cfg.desens === 'a' && cfg.desensUnmask !== false);
    var needArmor = !!plan.armor;
    if (!needDesens && !needArmor) return res;
    if (!(res.status >= 200 && res.status < 300)) return res;
    if (!res.body || typeof res.body.getReader !== 'function') return res;
    var ct = '';
    try { ct = String(res.headers && res.headers.get ? res.headers.get('content-type') : ''); } catch (eC) {}
    if (ct && !/json|event-stream|text/i.test(ct)) return res;
    var wrapped = desensWrapResponse(res);
    if (wrapped !== res) DESENS_FIXED += 1;
    return wrapped;
  } catch (e) { return res; }
}

/* patch51-retry.js —— V4.3：503/429 自动退避重试（2s→5s→10s + 抖动，最多 3 次；不降级换模型） */

/* ---- 常量与状态 ---- */
/* ===== 4.4 抢资源模式：服务端按「项目配额 + 请求要占多少 token」准入，
   这里做两件事：① 省资源（关稀释、关工具通道、思考压 LOW）；
   ② 并发抢跑（同一份请求同时发 K 路，谁先 2xx 用谁，其余立刻 abort）。 */
var GRAB_MAX = 3;
var GRAB_STAT = { win: 0, lose: 0, race: 0 };
function grabOn() { return !!(cfg && cfg.enabled && !cfg.safe && Number(cfg.grab) > 0); }
function grabK() { return Math.max(0, Math.min(GRAB_MAX, Number(cfg && cfg.grab) || 0)); }
function grabTag(v) {
  var k = Number(v) || 0;
  if (k <= 0) return '关';
  if (k === 1) return '省资源';
  return k + '路抢跑';
}
function grabFetch(next, thisArg, args) {
  var k = grabK();
  if (k <= 1) return retryFetch(next, thisArg, args);
  if (args && args[1] && args[1].signal) return retryFetch(next, thisArg, args);
  var acs = [], started = 0, done = 0, settled = false;
  function stopAll() { for (var i = 0; i < acs.length; i++) { try { acs[i].abort(); } catch (eA) {} } }
  var race = new HOST.Promise(function (resolve, reject) {
    function fire() {
      if (settled || started >= k) return;
      var idx = started++;
      var call = args;
      if (idx > 0 && args && args.length > 1) {
        var init = {}, src = args[1] || {};
        for (var key in src) { if (Object.prototype.hasOwnProperty.call(src, key)) init[key] = src[key]; }
        try { var ac = new HOST.AbortController(); init.signal = ac.signal; acs.push(ac); } catch (eAc) {}
        call = [args[0], init];
      }
      var pr;
      GRAB_STAT.race++;
      try { pr = next.apply(thisArg, call); } catch (e0) { pr = HOST.Promise.reject(e0); }
      pr.then(function (res) {
        if (settled) { try { if (res && res.body && res.body.cancel) res.body.cancel(); } catch (eC) {} return; }
        var code = res && res.status;
        if (code >= 200 && code < 300) { settled = true; GRAB_STAT.win++; stopAll(); resolve(res); return; }
        done++;
        if (done >= k) { settled = true; stopAll(); resolve(res); }
      }, function (err) {
        if (settled) return;
        done++;
        if (done >= k) { settled = true; stopAll(); reject(err); }
      });
      if (started < k) { retrySleep(300).then(function () { if (!settled) fire(); }); }
    }
    fire();
  });
  return race.then(function (res) {
    if (res && res.status === 400 && typeof lkTryTok400Clamp === 'function') {
      return lkTryTok400Clamp(res, args, false).then(function (a2) {
        return a2 ? retryFetch(next, thisArg, a2, false) : res;
      });
    }
    if (res && res.status >= 500) { GRAB_STAT.lose++; return retryFetch(next, thisArg, args); }
    return res;
  });
}
var RETRY_STAT = { n: 0, ok: 0, giveUp: 0, last: '', lastAt: 0 };
var RETRY_CODES = { 408: 1, 425: 1, 429: 1, 500: 1, 502: 1, 503: 1, 504: 1 };
var RETRY_WAIT = [2000, 5000, 10000];
var RETRY_MAX = 3;
var TOKBACK = { used: 0, n: 0, retry: null };

function lkTryTok400Clamp(res, args, internal) {
  if (!res || res.status !== 400 || internal || !args || !args[1] || typeof args[1].body !== 'string') {
    return Promise.resolve(null);
  }
  if (typeof res.clone !== 'function') return Promise.resolve(null);
  return res.clone().text().then(function (tk) {
    if (!/max[_ ]?output[_ ]?tokens|max_completion_tokens|max_tokens|maxtokens|output[ _-]?token|token[ _-]?(?:limit|count)/i.test(String(tk || ''))) return null;
    var b2;
    try { b2 = JSON.parse(String(args[1].body || '{}')); } catch (eP) { return null; }
    var u = '';
    try { u = urlOf(args[0]); } catch (eU) { u = ''; }
    try { if (typeof lkRecordTokCap === 'function') lkRecordTokCap(u, b2, 8192); } catch (eRC) {}
    var a2 = args.slice();
    var ni = {};
    for (var k in args[1]) if (Object.prototype.hasOwnProperty.call(args[1], k)) ni[k] = args[1][k];
    ni.body = JSON.stringify(lkClampTok(b2, 8192));
    a2[1] = ni;
    TOKBACK.used = 1;
    TOKBACK.n++;
    try { banner('上游拒了输出上限，已降到 8192 重发并记住该渠道上限', 'warn', true); } catch (eB2) {}
    return a2;
  }, function () { return null; });
}

function retryOn() { return !(cfg && cfg.retry503 === 'off'); }

function retryJitter(base) {
  /* 抖动只往长里加 0~600ms：避免整点齐刷刷重试，也避免比既定节奏更急 */
  return base + Math.floor(Math.random() * 600);
}

function retrySleep(ms) {
  return new Promise(function (resolve) {
    try { (HOST && HOST.setTimeout ? HOST.setTimeout : setTimeout)(resolve, ms); }
    catch (e) { try { setTimeout(resolve, ms); } catch (e2) { resolve(); } }
  });
}

function retryWhy(res) {
  var st = res && res.status;
  if (!RETRY_CODES[st]) return '';
  return 'HTTP ' + st;
}

function retryStatLine() {
  if (!RETRY_STAT.n) return '';
  return ' · 重试 ' + RETRY_STAT.n + ' 次' + (RETRY_STAT.giveUp ? '（放弃 ' + RETRY_STAT.giveUp + '）' : '');
}

/* 只重发，不改任何东西：同一个 next / thisArg / args；body 是字符串所以可以原样再发。
   三条红线：① 内部请求（摘要/标题）不重试；② 4xx 里的“确定性错误”不重试（仅 token 上限 400 单轮夹到 8192 补发一次）；③ 用户中断不重试。 */
function retryFetch(next, thisArg, args, internal) {
  var attempt = 0, tokClamped = false;
  function loop() {
    var p;
    try { p = next.apply(thisArg, args); } catch (eThrow) { p = Promise.reject(eThrow); }
    if (!p || typeof p.then !== 'function') return p;
    return p.then(function (res) {
      /* V5.25/V5.3：上游嫌输出上限太大（400 且提到 token 上限）→ 本次请求降到 8192 重发一次并记入渠道上限表 */
      if (res && res.status === 400 && !tokClamped && !internal) {
        return lkTryTok400Clamp(res, args, internal).then(function (a2) {
          if (!a2) return res;
          tokClamped = true;
          args = a2;
          return loop();
        });
      }
      var why = retryWhy(res);
      if (!why || internal || !retryOn() || attempt >= RETRY_MAX) {
        if (attempt > 0 && res && res.status < 400) RETRY_STAT.ok++;
        return res;
      }
      attempt++;
      RETRY_STAT.n++; RETRY_STAT.last = why + ' @ ' + new Date().toTimeString().slice(0, 8); RETRY_STAT.lastAt = Date.now();
      var w = retryJitter(RETRY_WAIT[attempt - 1] || 10000);
      try { banner('渠道 ' + why + '：' + Math.round(w / 1000) + ' 秒后自动重试（第 ' + attempt + '/' + RETRY_MAX + ' 次）', 'warn', true); } catch (eB) {}
      try { criticalWarn('上游 ' + why + '，第 ' + attempt + ' 次重试', null); } catch (eC) {}
      return retrySleep(w).then(loop);
    }, function (err) {
      var msg = String((err && err.message) || err || '');
      var aborted = (err && err.name === 'AbortError') || /abort|aborted|cancel/i.test(msg);
      if (aborted || internal || !retryOn() || attempt >= RETRY_MAX) {
        if (attempt > 0) RETRY_STAT.giveUp++;
        throw err;
      }
      attempt++;
      RETRY_STAT.n++; RETRY_STAT.last = '网络 ' + msg.slice(0, 40) + ' @ ' + new Date().toTimeString().slice(0, 8); RETRY_STAT.lastAt = Date.now();
      var w2 = retryJitter(RETRY_WAIT[attempt - 1] || 10000);
      try { banner('请求没发出去：' + Math.round(w2 / 1000) + ' 秒后自动重试（第 ' + attempt + '/' + RETRY_MAX + ' 次）', 'warn', true); } catch (eB2) {}
      return retrySleep(w2).then(loop);
    });
  }
  return loop();
}


var SAFE_AUTH_HDR_RE = /^(?:authorization|x-api-key|x-goog-api-key|api-key)$/i;
function extractSafeAuthHeaders(init) {
  var out = null;
  try {
    var h = init && init.headers;
    if (!h) return null;
    var put = function (k, v) {
      var ks = String(k || '').trim();
      if (!SAFE_AUTH_HDR_RE.test(ks) || v == null || v === '') return;
      if (!out) out = {};
      out[ks] = String(v);
    };
    if (typeof h.forEach === 'function') {
      h.forEach(function (val, key) { put(key, val); });
    } else if (Array.isArray(h)) {
      for (var i = 0; i < h.length; i++) {
        if (h[i] && h[i].length >= 2) put(h[i][0], h[i][1]);
      }
    } else if (typeof h === 'object') {
      for (var k in h) {
        if (Object.prototype.hasOwnProperty.call(h, k)) put(k, h[k]);
      }
    }
  } catch (e) {}
  return out;
}

function isAcuInterceptedError(err) {
  try {
    if (!err) return false;
    if (err.code === 'ACU_HOST_GENERATION_INTERCEPTED') return true;
    var msg = String(err.message || err || '');
    if (/ACU_HOST_GENERATION_INTERCEPTED|酒馆原发送已取消.*数据库/.test(msg)) return true;
  } catch (e) {}
  return false;
}

try { lkFetchGuard(); } catch (eFG) {}
function handleFetch(next, thisArg, args) {
  var input = args[0];
  var init = args[1];
  var url = urlOf(input);
  DET.seen++; DET.lastUrl = url; DET.lastAt = Date.now();
  if (!isGenerateUrl(url)) { DET.notGen++; return next.apply(thisArg, args); }
  DET.gen++;
  /* 破甲用这个计数判断"续写到底发出去没有" */
  try { JL.seq++; } catch (eJ) {}
  if (input && typeof input === 'object' && typeof input.clone === 'function') {
    DET.clone++;
    return next.apply(thisArg, args);
  }

  var rawBody = init && typeof init.body === 'string' ? init.body : '';
  var plan = null;
  var outArgs = args;
  var internal = false;
  var narrative = true;
  var traffic = { isPlugin: false, isStory: true, kind: 'story', label: '正文', reason: '' };
  try {
    var parsedForInternal = null;
    try { parsedForInternal = rawBody ? JSON.parse(rawBody) : null; } catch (ePI) {}
    traffic = classifyRequestTraffic(init, parsedForInternal, url);
    internal = !!(traffic && traffic.isPlugin);
    narrative = isNarrativeBody(parsedForInternal) && !internal;
  } catch (eInt) { internal = false; }
  if (internal) DET.internal++;
  /* V5.65：范围外的模型、自身内部探针、以及「只检正文=开」时的所有外部插件/非正文请求，
     一律在最前端零干扰原样直通——不改请求体、不挂采样窗、不污染路由率与基线。 */
  try {
    var quickModel = extractReqModel(parsedForInternal, url);
    var isOwnProbe = !!(traffic && (traffic.kind === 'internal_mark' || traffic.kind === 'probe_ping'));
    var bypassPlugin = (internal || !narrative) && String(cfg && cfg.contentOnly) !== 'off';
    if (modelOutOfScope(quickModel, url) || isOwnProbe || bypassPlugin) {
      if (bypassPlugin && !isOwnProbe) {
        DET.pluginSkip = (DET.pluginSkip || 0) + 1;
        DET.lastPlugin = String((traffic && traffic.label) || '外部插件');
      }
      return next.apply(thisArg, args);
    }
  } catch (eScopeQuick) { criticalWarn('范围前置放行', eScopeQuick); }
  var planMs = 0;
  try {
    var planT0 = nowMs();
    plan = planRequest(rawBody, url, internal);
    planMs = nowMs() - planT0;
    if (cfg.enabled && plan.changed.length && plan.body !== rawBody) {
      var newInit = {};
      for (var k in init) newInit[k] = init[k];
      newInit.body = plan.body;
      outArgs = [input, newInit];
    }
    var asstTail = '', effortHint = false;
    try {
      var bodyObj = parsedForInternal || (plan.body ? JSON.parse(plan.body) : null);
      var msgsB = (bodyObj && bodyObj.request && Array.isArray(bodyObj.request.messages))
        ? bodyObj.request.messages : ((bodyObj && Array.isArray(bodyObj.messages)) ? bodyObj.messages : []);
      for (var mbi = msgsB.length - 1; mbi >= 0; mbi--) {
        if (String((msgsB[mbi] && msgsB[mbi].role) || '') === 'assistant') {
          asstTail = String(textOfMsg(msgsB[mbi]) || '').slice(-160);
          break;
        }
      }
      var sysB = String((bodyObj && bodyObj.system) || '') + '\n' + (typeof jailSysText === 'function' ? jailSysText(bodyObj) : '');
      effortHint = /EFFORT LEVEL|think silently/i.test(sysB);
    } catch (eLB) {}
    if (plan.model) lastReq = { url: url, raw: rawBody, model: plan.model, base: plan.base || '', asstTail: asstTail, effort: effortHint, authHeaders: extractSafeAuthHeaders(init) };
  } catch (e) { plan = null; }

  var selfContinuation = false;
  if (!internal && narrative && JL.selfPending) {
    selfContinuation = nowMs() - JL.selfAt < 90000 && parsedForInternal && parsedForInternal.type === 'continue';
    if (selfContinuation || nowMs() - JL.selfAt >= 90000) JL.selfPending = false;
  }
  var started = nowMs();
  var ev = newEvidence(plan ? plan.model : '', 0, 'sse');
  ev.internal = internal; ev.selfContinuation = selfContinuation; ev.asstTail = asstTail; ev.effort = effortHint; ev.narrative = narrative;
  ev.trafficKind = (traffic && traffic.kind) || 'story';
  ev.trafficLabel = (traffic && traffic.label) || '正文';
  capture318(ev, started);
  var allowLive = !internal || String(cfg && cfg.contentOnly) === 'off';
  if (allowLive) CAP318_LIVE = ev.requestId;
  inflight++;
  /* S2：只采样，不接管响应流；开启纯净正轨时插件已前置放行，关闭时允许观测并带徽标 */
  try {
    if (allowLive) {
      liveStart(started, {
        added: plan ? plan.added : 0,
        edits: plan ? plan.edits : 0,
        ms: planMs,
        reqModel: (plan && plan.model) || '',
        trafficLabel: ev.trafficLabel || '正文',
        requestId: ev.requestId
      });
    }
  } catch (eLive0) {}

  /* v3.0 自动 PVP：失败类请求交给重发层（对外仍只算一次请求）。
     内部请求 / 安全模式 / 非叙述请求一律不碰——重发它们会打乱摘要与标题。 */
  var p, pvpRound = null;
  if (cfg.enabled && pvpAuto() && !internal && !cfg.safe && narrative) {
    p = pvpFetch(next, thisArg, outArgs, init);
    try { pvpRound = PVP.round; } catch (ePv0) {}
  } else {
    p = (grabOn() && !internal) ? grabFetch(next, thisArg, outArgs) : retryFetch(next, thisArg, outArgs, internal);
  }
  if (!p || typeof p.then !== 'function') { inflight--; return p; }

  return p.then(function (res) {
    inflight--;
    try {
      ev.status = res.status;
      /* v3.0 自动 PVP：重发过就在这条记录上留痕，救没救回来都算 */
      try {
        if (pvpRound && pvpRound.tries) {
          ev.pvpUsed = pvpRound.tries;
          if (res.status === 200 || res.status === 204) { PVP.ok++; PVP.failRun = 0; }
        }
      } catch (ePv1) {}
      try { ev.verifiable = verifiableCode(); } catch (eVer) { ev.verifiable = 'unknown'; }
      if (res.status === 400 && plan && plan.tool && plan.toolForcedChoice && typeof toolMarkChoiceFallback === 'function') {
        try {
          toolMarkChoiceFallback(plan.toolBaseKey);
          if (!internal && rawBody && pvpBodyReusable(init)) {
            var fbPlan = planRequest(rawBody, url, internal);
            if (fbPlan && fbPlan.body) {
              var fbInit = {};
              for (var fk in init) fbInit[fk] = init[fk];
              fbInit.body = fbPlan.body;
              plan = fbPlan;
              inflight++;
              return Promise.resolve(next.apply(thisArg, [input, fbInit])).then(function (res2) {
                inflight--;
                ev.status = res2.status;
                if (res2.status >= 400) { ev.capture.status='failed';ev.capture.source='http';ev.capture.error='HTTP '+res2.status;ev.capture.settleReason='http-error';ev.capture.totalMs=nowMs()-started; readErrorBody(res2, ev); return res2; }
                try { res2 = lkTee(res2); } catch (eTee2) {}
                try { res2 = toolMaybeWrap(res2, plan, internal); } catch (eTw2) {}
                try { res2 = desensMaybeRestore(res2, plan, internal); } catch (eDa2) {}
                var pk2 = peekBody(res2, ev);
                var watching2 = (typeof startWatcher === 'function') ? !!startWatcher(ev, plan, started) : false;
                if (!watching2 && pk2 && typeof pk2.then === 'function') {
                  var fbCommitTimer = setTimeout(function () { if (!DISPOSED && !ev.__committed) finish(ev, plan); }, 125000);
                  pk2.then(function () { clearTimeout(fbCommitTimer); try { if (!ev.__committed) finish(ev, plan); } catch (eF0) {} }, function () { clearTimeout(fbCommitTimer); try { if (!ev.__committed) finish(ev, plan); } catch (eF1) {} });
                } else if (!watching2) {
                  try { if (!ev.__committed) finish(ev, plan); } catch (eF3) {}
                }
                return res2;
              }, function (errFb) {
                inflight--;
                try {
                  ev.error = String(errFb && errFb.message || errFb || 'fetch failed').slice(0, 80);
                  ev.totalMs = Math.max(1, nowMs() - started);
                  ev.capture.status = 'failed'; ev.capture.error = ev.error; ev.capture.source = 'fetch'; ev.capture.totalMs = ev.totalMs; ev.capture.settleReason = 'fetch-rejected';
                  finish(ev, plan);
                } catch (eFbFin) {}
                throw errFb;
              });
            }
          }
        } catch (eFb) {}
      }
      if (res.status === 204) { ev.capture.bodyChars=0;ev.capture.status='complete';ev.capture.source='http';ev.capture.settleReason='http-204';ev.capture.totalMs=nowMs()-started; finish(ev, plan); return res; }
      if (res.status >= 400) { ev.capture.status='failed';ev.capture.source='http';ev.capture.error='HTTP '+res.status;ev.capture.settleReason='http-error';ev.capture.totalMs=nowMs()-started; try { pvpHintIfOff(res.status, internal); } catch (ePh) {} readErrorBody(res, ev); return res; }
      /* V5.0/V4.8 严格响应流管道顺序：先解包 lk_write 工具流 → 再还原脱敏连字符 → 最后交 peekBody 克隆采样 */
      try { res = lkTee(res); } catch (eTee) {}
      try { res = toolMaybeWrap(res, plan, internal); } catch (eTw) {}
      try { res = desensMaybeRestore(res, plan, internal); } catch (eDa) {}
      var pk = peekBody(res, ev);
      /* Host chat polling has no request identity and can claim concurrent responses. */
      var watching = (typeof startWatcher === 'function') ? !!startWatcher(ev, plan, started) : false;
      /* v8.0.3：观察器关掉时 200 也要落一条（只算响应体证据），否则整轮不记录、破甲失联 */
      if (!watching && pk && typeof pk.then === 'function') {
        var captureCommitTimer=setTimeout(function(){if(!DISPOSED&&!ev.__committed)finish(ev,plan);},125000);
        pk.then(function () {
          clearTimeout(captureCommitTimer);
          try { if (!ev.__committed) finish(ev, plan); } catch (eF) {}
        }, function () {
          clearTimeout(captureCommitTimer);
          try { if (!ev.__committed) finish(ev, plan); } catch (eF) {}
        });
      } else if (!watching) {
        /* v0.12：没观察器、也没取体（内部请求或关掉 peek）时，这一轮就没人收尾了。
           直接收——不然内部请求会连记录都没有，账本和日志都看不到它。 */
        try { if (!ev.__committed) finish(ev, plan); } catch (eF2) {}
      }
      return res;
    } catch (e2) {
      try { HOST.console && HOST.console.warn('[AR6] post-response error', e2 && e2.message); } catch (eW) {}
      return res;
    }
  }, function (err) {
    inflight--;
    /* V5.65：龙血玄黄·数据库零层模式主动取消酒馆原发送时，静默放手不记故障、不弹红灯 */
    if (isAcuInterceptedError(err)) {
      try { if (CAP318_LIVE === ev.requestId) liveFinish(); } catch (eAcuL) {}
      throw err;
    }
    try {
      ev.error = String(err && err.message || err || 'fetch failed').slice(0, 80);
      ev.totalMs = Math.max(1, nowMs() - started);
      ev.capture.status = 'failed'; ev.capture.error = ev.error; ev.capture.source = 'fetch'; ev.capture.totalMs = ev.totalMs; ev.capture.settleReason = 'fetch-rejected';
      finish(ev, plan);
    } catch (e3) {}
    try { if (pvpRound && pvpRound.tries) { PVP.failRun++; } } catch (ePv2) {}
    throw err;
  });
}

/* ---------------- 钩子安装 / 还原 ---------------- */

/* 我们装过的每一层（dispose 时统一置为透传，而不会删掉别人的包装） */
var ourWrappers = [];
/* 3.3.1：记录外层若是别的版本/别的副本装的 AR6 壳，我们仍要再包一层 */
var LAYER_OLD = '';
/* 探针专用：最早捕获的那层原始 fetch */
var probeFetch = null;
/* 最后一次挂上去的那层 + 它当时接管的下一层（仅用于安全还原） */
var exposedFetch = null;
var exposedPrev = null;

/* V5.65：检测 fetch 包装链中是否已包含当前版本的有效 __ar6 钩子，避免反复抢压柏宝绘 rawCaptureFetch / 龙血玄黄零层 / 世界书访问器 */
var AR6_FETCH_REENTRY = (typeof WeakSet === 'function') ? new WeakSet() : null;
var AR6_ACCESSOR_MODE = false;

function fetchChainHasCurrent(fn) {
  try {
    var cur = fn;
    for (var depth = 0; depth < 14 && typeof cur === 'function'; depth++) {
      if (cur.__ar6 && cur.__ar6v === VERSION && !cur.__ar6dead) return true;
      var nxt = cur.__ar6prev ||
        (cur.__acuHostGenerationInterceptor__ && cur.__acuHostGenerationInterceptor__.original) ||
        cur.original || cur.__orig || cur._origFetch || cur._yzmOriginalFetch || null;
      if (!nxt || nxt === cur) break;
      cur = nxt;
    }
  } catch (e) {}
  return false;
}

function installFetchHookOn(w) {
  try {
    if (!w || typeof w.fetch !== 'function') return false;
    var isHost = (w === HOST);
    if (w.fetch.__ar6 && w.fetch.__ar6v === VERSION && !w.fetch.__ar6dead) {
      if (isHost) { exposedFetch = w.fetch; hooked = true; }
      return true;
    }
    /* 外层被临时钩子（柏宝绘 rawCaptureFetch / 龙血玄黄零层 / 世界书访问器）包住，但我们的钩子仍在链中有效运行时，不再强抢重套 */
    if (fetchChainHasCurrent(w.fetch)) {
      if (isHost) hooked = true;
      return true;
    }
    if (isHost) {
      if (w.fetch.__ar6 && !w.fetch.__ar6dead) LAYER_OLD = String(w.fetch.__ar6v || '旧版');
      if (w.fetch === exposedFetch) { hooked = true; return true; }
      if (!origFetch) origFetch = w.fetch;
      if (!probeFetch) probeFetch = w.fetch;
    }

    /* 检测外层访问器守卫（例如 世界书管理器 __wbmCacheInspectorPatchState 的 Object.defineProperty(win, 'fetch', {get,set})） */
    var desc = null;
    try { desc = Object.getOwnPropertyDescriptor(w, 'fetch'); } catch (eDesc) { desc = null; }
    var isAccessor = !!(desc && (typeof desc.get === 'function' || typeof desc.set === 'function'));
    var prevBefore = w.fetch;
    var wbmState = null;
    try { wbmState = w.__wbmCacheInspectorPatchState || null; } catch (eWbm) { wbmState = null; }
    var prev = (isAccessor && wbmState && typeof wbmState.delegate === 'function' && wbmState.delegate !== prevBefore)
      ? wbmState.delegate
      : prevBefore;
    var dead = false;
    var wrapped = function (input, init) {
      if (dead) return prev.apply(this, arguments);
      /* 重入锁防死循环（与未知外层访问器守卫共存的硬底线） */
      var lockObj = (init && typeof init === 'object') ? init : ((input && typeof input === 'object') ? input : null);
      if (AR6_FETCH_REENTRY && lockObj) {
        if (AR6_FETCH_REENTRY.has(lockObj)) return prev.apply(this, arguments);
        AR6_FETCH_REENTRY.add(lockObj);
      }
      try {
        var ret = handleFetch(prev, this, arguments);
        if (AR6_FETCH_REENTRY && lockObj) {
          if (ret && typeof ret.then === 'function') {
            ret.then(function () { try { AR6_FETCH_REENTRY.delete(lockObj); } catch (eD1) {} },
                     function () { try { AR6_FETCH_REENTRY.delete(lockObj); } catch (eD2) {} });
          } else {
            try { AR6_FETCH_REENTRY.delete(lockObj); } catch (eD3) {}
          }
        }
        return ret;
      } catch (err) {
        if (AR6_FETCH_REENTRY && lockObj) { try { AR6_FETCH_REENTRY.delete(lockObj); } catch (eD4) {} }
        try { DET.err++; if (w.console) w.console.warn('[AR6] hook error, fallback', err); } catch (e1) {}
        return prev.apply(this, arguments);
      }
    };
    wrapped.__ar6 = true; wrapped.__ar6v = VERSION; wrapped.__ar6prev = prev;
    ourWrappers.push({ fn: wrapped, kill: function () { dead = true; wrapped.__ar6dead = true; } });
    w.fetch = wrapped;
    var landed = false;
    try { landed = (w.fetch === wrapped); } catch (eLnd) { landed = false; }
    if (!landed && isAccessor) {
      /* 外层访问器把 wrapped 吸收为下层 delegate：同步修正 prev 指向外层原本的底层函数，防自调环路 */
      try {
        if (wbmState && typeof wbmState.original === 'function' && wbmState.original !== w.fetch && wbmState.original !== wrapped) {
          prev = wbmState.original;
          wrapped.__ar6prev = prev;
        }
      } catch (eFixP) {}
      if (isHost) { AR6_ACCESSOR_MODE = true; exposedFetch = wrapped; exposedPrev = prev; hooked = true; }
      return true;
    }
    if (isHost) { exposedFetch = wrapped; exposedPrev = prev; hooked = true; }
    return true;
  } catch (e) { return false; }
}
function hookWinList() {
  var out = [];
  function add(w) { try { if (w && typeof w.fetch === 'function' && out.indexOf(w) < 0) out.push(w); } catch (e) {} }
  add(SELF_WIN); add(window); add(HOST);
  try { add(HOST.top); } catch (e1) {}
  try { add(HOST.parent); } catch (e2) {}
  try {
    var doc = HOST.document;
    if (doc && doc.querySelectorAll) {
      var fr = doc.querySelectorAll('iframe');
      for (var i = 0; i < fr.length && i < 8; i++) { try { add(fr[i].contentWindow); } catch (e3) {} }
    }
  } catch (e4) {}
  return out;
}
/* 4.1：不再是「只挂 HOST 那一个 window」——酒馆助手 / ST 可能在 top 或 iframe 里发请求，
   漏一个就整份报告是空的。全部可挂的都挂上，谁发都能被看见。 */
function installFetchHook() {
  var wins = hookWinList(), ok = false;
  HOOK_WINS = wins;
  for (var i = 0; i < wins.length; i++) { try { if (installFetchHookOn(wins[i])) ok = true; else DET.blocked++; } catch (e) { DET.blocked++; } }
  try { DET.tries++; } catch (eT) {}
  DET.wins = HOOK_WINS.length;
  if (ok) hooked = true;
  return ok;
}
/* 4.1→V5.65 自愈：仅在钩子真的彻底脱离调用链时才补挂；
   若已以访问器守卫模式或外层合作链（柏宝绘/龙血玄黄）正常工作，绝不每 3 秒反复强抢覆盖。 */
function startHookWatch() {
  if (HOOK_WATCH_T || DISPOSED) return;
  HOOK_WATCH_T = setInterval(function () {
    if (DISPOSED) { try { clearInterval(HOOK_WATCH_T); } catch (e0) {} HOOK_WATCH_T = 0; return; }
    if (cfg && cfg.safe) return;
    try {
      if (AR6_ACCESSOR_MODE && exposedFetch && !exposedFetch.__ar6dead) return;
      if (HOST.fetch && fetchChainHasCurrent(HOST.fetch)) return;
      var lost = !(HOST.fetch && HOST.fetch.__ar6v === VERSION);
      installFetchHook();
      if (lost && HOST.fetch && (HOST.fetch.__ar6v === VERSION || AR6_ACCESSOR_MODE)) DET.rearm++;
    } catch (e) {}
  }, 3000);
}

function unhookFetch() {
  try {
    /* 1) 让所有我们装过的层立刻退化为纯透传（不删链，避免破坏别人的包装） */
    for (var i = 0; i < ourWrappers.length; i++) {
      try { ourWrappers[i].kill(); } catch (e0) {}
    }
    ourWrappers.length = 0;
    /* 2) 仅当我们确实在最外层时才还原，绝不覆盖后来别人装的包装 */
    if (exposedFetch && HOST.fetch === exposedFetch && exposedPrev) HOST.fetch = exposedPrev;
    exposedFetch = null;
    exposedPrev = null;
    origFetch = null;
    probeFetch = null;
    AR6_ACCESSOR_MODE = false;
    HOOK_TARGET.fetch = null;
    hooked = false;
  } catch (e) {}
}

var HOOK_TARGET = { fetch: null, xhr: null };
var HOOK_WINS = [];
var HOOK_WATCH_T = 0;
function stCtxApi() {
  try {
    var st = (HOST && HOST.SillyTavern) || (SELF_WIN && SELF_WIN.SillyTavern);
    return (st && typeof st.getContext === 'function') ? st.getContext() : null;
  } catch (e) { return null; }
}
function bindStEvents() {
  try {
    if (DET.evtBound) return true;
    var c = stCtxApi();
    if (!c || !c.eventSource || !c.eventTypes) return false;
    var ET = c.eventTypes;
    var bump = function () {
      try {
        DET.evts++; DET.lastAt = Date.now();
        try { if (c.model) DET.lastModel = String(c.model); } catch (eM) {}
      } catch (e) {}
    };
    if (ET.GENERATION_STARTED != null) {
      c.eventSource.on(ET.GENERATION_STARTED, function (type, options, dryRun) {
        ST_GEN.at = Date.now();
        ST_GEN.type = String(type || 'normal').toLowerCase();
        ST_GEN.dryRun = !!dryRun;
        if (ST_GEN.type === 'normal' || ST_GEN.type === 'swipe' || ST_GEN.type === 'continue' || ST_GEN.type === 'regenerate') {
          TH_GEN.active = false;
        }
        bump();
      });
    }
    if (ET.GENERATION_STOPPED != null) {
      c.eventSource.on(ET.GENERATION_STOPPED, function () {
        ST_GEN.stoppedAt = Date.now();
        ST_GEN.at = 0;
        bump();
      });
    }
    if (ET.GENERATION_ENDED != null) {
      c.eventSource.on(ET.GENERATION_ENDED, function () {
        ST_GEN.at = 0;
        bump();
      });
    }
    if (ET.MESSAGE_SENT != null) c.eventSource.on(ET.MESSAGE_SENT, bump);
    if (ET.MESSAGE_RECEIVED != null) c.eventSource.on(ET.MESSAGE_RECEIVED, bump);
    DET.evtBound = true;
    return true;
  } catch (e) { return false; }
}
function detDiag() {
  var L = [];
  L.push('版本 ' + VERSION + ' · ' + (uiMode() === 'desktop' ? '桌面宽屏态' : '移动紧凑态'));
  try { L.push('宿主 ' + String((SELF_WIN.location && SELF_WIN.location.href) || '').slice(0, 120)); } catch (e1) {}
  L.push('挂钩窗口 ' + DET.wins + ' · 探测 ' + DET.tries + ' · 跨窗口受阻 ' + DET.blocked);
  L.push('见请求 ' + DET.seen + ' · 非生成 ' + DET.notGen + ' · 命中生成 ' + DET.gen + ' · 内部 ' + DET.internal + ' · 记账 ' + DET.rec);
  L.push('ST 事件 ' + DET.evts + (DET.evtBound ? '（已绑定）' : '（未绑定）') + ' · 重挂 ' + DET.rearm);
  L.push('最近地址 ' + String(DET.lastUrl || '无').slice(0, 160));
  L.push('最近模型 ' + (DET.lastModel || '未取到'));
  L.push('开关 总开关=' + (cfg.enabled ? '开' : '关') + ' 形态=' + jailFormName() + (cfg.jailWord ? '+神光一言' : '') + ' 只查Gemini=' + (cfg.onlyGemini === false ? '关' : '开') + ' 飞燕编队=' + grabTag(cfg.grab));
  L.push('判定 ' + detVerdict());
  return L.join('\n');
}
function detCopy() {
  var t = detDiag();
  /* 优先用宿主 DOC 的 <textarea> + execCommand('copy') 同步落剪贴板：
     兼容局域网 HTTP 手机酒馆（无 Clipboard API）与沙箱 iframe（writeText 异步静默拒绝） */
  var copied = false;
  try {
    if (DOC && DOC.body && DOC.createElement) {
      var ta = DOC.createElement('textarea');
      ta.value = t;
      ta.setAttribute('readonly', '');
      ta.style.cssText = 'position:fixed;left:-9999px;top:0;opacity:0;font-size:16px;pointer-events:none';
      DOC.body.appendChild(ta);
      ta.focus();
      ta.select();
      try { ta.setSelectionRange(0, t.length); } catch (eSel) {}
      copied = !!(DOC.execCommand && DOC.execCommand('copy'));
      DOC.body.removeChild(ta);
    }
  } catch (e2) { copied = false; }
  if (copied) return true;
  try {
    var wClip = (HOST && HOST.isSecureContext !== false && HOST.navigator && HOST.navigator.clipboard)
      ? HOST.navigator.clipboard
      : ((SELF_WIN && SELF_WIN.isSecureContext !== false && SELF_WIN.navigator && SELF_WIN.navigator.clipboard)
        ? SELF_WIN.navigator.clipboard : null);
    if (wClip && typeof wClip.writeText === 'function') {
      var pr = wClip.writeText(t);
      if (pr && typeof pr['catch'] === 'function') pr['catch'](function () {});
      return true;
    }
  } catch (eC) {}
  return false;
}

function installXhrDetect() {
  /* 4.1：XHR 通道也挂（只做检测记账，不改请求体——改写由 fetch 那条路负责） */
  try {
    var X = HOST.XMLHttpRequest;
    if (!X || !X.prototype || !X.prototype.send) return false;
    if (X.prototype.send.__ar6d) return true;
    var origOpen = X.prototype.open, origSend = X.prototype.send;
    var wOpen = function (m, u) { try { this.__ar6url = String(u || ''); } catch (e) {} return origOpen.apply(this, arguments); };
    var wSend = function (body) {
      try {
        var u = this.__ar6url || '';
        DET.seen++; DET.lastUrl = u; DET.lastAt = Date.now();
        if (!isGenerateUrl(u)) DET.notGen++; else DET.gen++;
      } catch (e) {}
      return origSend.call(this, body);
    };
    wOpen.__ar6d = true; wSend.__ar6d = true;
    X.prototype.open = wOpen; X.prototype.send = wSend;
    return true;
  } catch (e) { return false; }
}
/* 4.1 检测层计数：所有「为什么没记账」都在这里留痕，报告页直接读它 */
var DET = { seen: 0, notGen: 0, clone: 0, internal: 0, pluginSkip: 0, lastPlugin: '', gen: 0, rec: 0, err: 0, rearm: 0,
            wins: 0, lastUrl: '', lastAt: 0, lastModel: '', lastRecAt: 0,
            evts: 0, blocked: 0, tries: 0, evtBound: false };
function detVerdict() {
  if (!DET.wins) return '钩子一个窗口都没挂上：脚本很可能跑在沙箱 iframe 里，拿不到发请求的那个窗口。点「复制诊断」把内容发我。';
  if (!DET.seen && DET.evts) return 'ST 事件已经动过 ' + DET.evts + ' 次，但一次请求都没经过钩子：请求可能是别的窗口或别的通道发的。';
  if (!DET.seen) return '钩子挂在 ' + DET.wins + ' 个窗口上，但还没有请求经过：先发一条消息试试。';
  if (!DET.gen) return '经过 ' + DET.seen + ' 个请求，没有一个匹配生成地址。最近一次：' + (DET.lastUrl || '未知');
  if (!DET.rec) return '命中 ' + DET.gen + ' 个生成请求，但没有落账：可能都被判成内部请求，或响应里没取到正文。';
  return '最近一次记账：' + (DET.lastModel ? shortName(DET.lastModel) : '模型未知') +
    ' · ' + (DET.lastRecAt ? new Date(DET.lastRecAt).toLocaleTimeString() : '');
}
function detLine() {
  return '检测层：⚡强制 · 挂钩窗口 ' + DET.wins + ' · 见请求 ' + DET.seen + ' · 命中生成 ' + DET.gen +
    ' · 内部 ' + DET.internal + ' · 记账 ' + DET.rec + (DET.rearm ? ' · 重挂 ' + DET.rearm : '') +
    (DET.evts ? ' · ST事件 ' + DET.evts : '') + (DET.blocked ? ' · 跨窗口受阻 ' + DET.blocked : '') +
    (DET.tries > 1 ? ' · 探测 ' + DET.tries : '') + (DET.err ? ' · 报错 ' + DET.err : '') +
    retryStatLine() + (RETRY_STAT.last ? ' · 最近 ' + RETRY_STAT.last : '');
}

function ensureHooks() {
  /* 已 dispose：不得因为 pageshow/定时器/重试链把钩子重新挂回去 */
  if (DISPOSED) return false;
  if (cfg.safe) { unhookFetch(); unhookXhr(); renderStatus(); return false; }
  var ok = installFetchHook();
  if (ok && HOST.fetch.__ar6) HOOK_TARGET.fetch = HOST.fetch;
  if (cfg.xhr) installXhrHook(); else unhookXhr();
  renderStatus();
  return ok;
}

var XHR_DEAD = false;   /* 卸载后旧原型方法只透传，不改写请求 */

function installXhrHook() {
  try {
    XHR_DEAD = false;
    var X = HOST.XMLHttpRequest;
    if (!X || !X.prototype) return false;
    if (X.prototype.send && X.prototype.send.__ar6) return true;
    var origOpen = X.prototype.open;
    var origSend = X.prototype.send;
    var wrappedOpen = function (m, u) {
      if (XHR_DEAD) return origOpen.apply(this, arguments);
      try { this.__ar6url = String(u || ''); } catch (e) {}
      return origOpen.apply(this, arguments);
    };
    var wrappedSend = function (body) {
      if (XHR_DEAD) return origSend.call(this, body);
      try {
        var u = this.__ar6url || '';
        if (isGenerateUrl(u) && cfg.enabled && typeof body === 'string' && body.trim().charAt(0) === '{') {
          var bodyObj = null; try { bodyObj = JSON.parse(body); } catch (eBody) {}
          var internal = isInternalRequest(this, bodyObj);
          var plan = planRequest(body, u, internal);
          if (plan.changed.length && plan.body !== body) { body = plan.body; }
          this.__ar6plan = plan;
        }
      } catch (e) {}
      return origSend.call(this, body);
    };
    wrappedOpen.__ar6 = true;
    wrappedSend.__ar6 = true;
    wrappedSend.__ar6orig = origSend;
    wrappedOpen.__ar6orig = origOpen;
    X.prototype.open = wrappedOpen;
    X.prototype.send = wrappedSend;
    HOOK_TARGET.xhr = { X: X, origOpen: origOpen, origSend: origSend };
    return true;
  } catch (e) { return false; }
}

function unhookXhr() {
  try {
    XHR_DEAD = true;
    var rec = HOOK_TARGET.xhr;
    if (!rec) return;
    if (rec.X.prototype.open.__ar6) rec.X.prototype.open = rec.origOpen;
    if (rec.X.prototype.send.__ar6) rec.X.prototype.send = rec.origSend;
    HOOK_TARGET.xhr = null;
  } catch (e) {}
}

/* ---------------- 探针 ---------------- */

function httpJson(url, opts, timeoutMs) {
  var f = probeFetch || origFetch || HOST.fetch;
  return new Promise(function (resolve, reject) {
    var done = false;
    var timer = setTimeout(function () {
      if (!done) { done = true; reject(new Error('timeout')); }
    }, timeoutMs || 20000);
    try {
      f(url, opts).then(function (res) {
        return res.text().then(function (t) {
          if (done) return;
          done = true; clearTimeout(timer);
          resolve({ status: res.status, text: t });
        });
      }).catch(function (e) {
        if (done) return;
        done = true; clearTimeout(timer);
        reject(e);
      });
    } catch (e) {
      if (!done) { done = true; clearTimeout(timer); reject(e); }
    }
  });
}

function stripApiSuffix(b) {
  return String(b || '').replace(/\/+$/, '')
    .replace(/\/(?:chat\/completions|completions|messages)$/, '')
    .replace(/\/v1beta\d*$/, '')
    .replace(/\/v1$/, '');
}

function openAIUrl(base) {
  var b = String(base || '').replace(/\/chat\/completions\/?$/, '').replace(/\/+$/, '');
  if (!b) return '';
  return b + '/chat/completions';
}

function nativeUrl(base, model) {
  var m = String(model || '').replace(/:streamGenerateContent$/, '').replace(/:generateContent$/, '');
  return stripApiSuffix(base) + '/v1beta/models/' + encodeURIComponent(m) + ':generateContent';
}

var PROBE_APPROVED = {};
function probeUrlAllowed(url) {
  var u;
  var pageHref = (HOST.location && HOST.location.href) || 'http://localhost';
  try { u = new URL(String(url || ''), pageHref); } catch (e) { return { ok: false, msg: 'URL 无效' }; }
  if (u.protocol !== 'http:' && u.protocol !== 'https:') return { ok: false, msg: '仅允许 HTTP(S) 探针' };
  if (u.username || u.password) return { ok: false, msg: '探针 URL 不允许携带账号密码' };
  var exact = u.href;
  /* 同源酒馆后端接口（如 /api/backends/chat-completions/generate）直接允许 */
  try {
    if (HOST.location && HOST.location.origin && u.origin === HOST.location.origin) {
      PROBE_APPROVED[exact] = true;
      return { ok: true, url: exact };
    }
  } catch (eOrig) {}
  var bases = [cfg && cfg.dualBase, lastReqBase(), lastReq && lastReq.base], host = '';
  for (var i = 0; i < bases.length; i++) {
    if (!bases[i]) continue;
    try {
      var candHost = new URL(String(bases[i]), u.href).host;
      if (candHost && u.host === candHost) { host = candHost; break; }
      if (!host && candHost) host = candHost;
    } catch (e2) {}
  }
  if (!host) return { ok: false, msg: '没有可核对的渠道地址，请先正常发一轮消息' };
  /* 命中当前已核验会话渠道域名时直接放行，避免嵌入式 WebView 静默拦截 window.confirm */
  if (u.host === host) {
    PROBE_APPROVED[exact] = true;
    return { ok: true, url: exact };
  }
  if (!PROBE_APPROVED[exact]) {
    var ok = false;
    try { ok = !!(HOST.confirm && HOST.confirm('即将向跨域地址发送探针请求：\n' + exact + '\n\n确认继续？')); } catch (e3) {}
    if (!ok) return { ok: false, msg: '探针地址不在当前渠道域名内且未获确认' };
    PROBE_APPROVED[exact] = true;
  }
  return { ok: true, url: exact };
}
function ensureProbeUrl(url) { var r = probeUrlAllowed(url); if (!r.ok) { try { banner('⚪ 探针未发送：' + r.msg, 'gray'); } catch (e) {} return ''; } return r.url; }

var probeBusy = false;

function runNativeProbe() {
  if (probeBusy) return;
  var base = cfg.dualBase || (lastReq && lastReq.base) || '';
  var model = (lastReq && lastReq.model) || '';
  if (!base || !model) { banner('⚪ 探针需要先发一轮，或在面板填 Base', 'gray'); return; }
  probeBusy = true;
  banner('🔬 原生探针请求中…', 'gray');
  var probeTarget = ensureProbeUrl(nativeUrl(base, model));
  if (!probeTarget) { probeBusy = false; return; }
  var body = { contents: [{ role: 'user', parts: [{ text: 'ping' }] }], generationConfig: { maxOutputTokens: 8, temperature: 0 } };
  var headers = { 'content-type': 'application/json' };
  httpJson(probeTarget, { method: 'POST', headers: headers, body: JSON.stringify(body) }, 25000)
    .then(function (r) {
      probeBusy = false;
      if (r.status >= 400 && /invalid|unsupported|400|422/.test(String(r.status))) {
        return httpJson(probeTarget, { method: 'POST', headers: headers, body: JSON.stringify({ contents: [{ role: 'user', parts: [{ text: 'ping' }] }] }) }, 25000)
          .then(function (r2) { reportNative(r2, model); });
      }
      reportNative(r, model);
    })
    .catch(function (e) {
      probeBusy = false;
      banner('🔴 原生探针失败：' + String(e && e.message || e).slice(0, 60), 'bad');
    });
}

function reportNative(r, model) {
  var mv = '';
  try {
    var j = JSON.parse(r.text);
    mv = String((j.modelVersion || j.model || '') || '');
  } catch (e) {}
  var vt = mv ? tierOf(mv) : 0;
  var rt = tierOf(model);
  if (!mv) banner('⚪ 原生端点返回 ' + r.status + '，无 modelVersion（该反代可能不支持 /v1beta）', 'gray');
  else if (rt > 0 && vt > 0 && vt < rt) banner('🔴 原生端点确认降档：请求 T' + rt + ' → 实际 ' + mv, 'bad');
  else banner('🟢 原生端点返回 modelVersion=' + mv, 'ok');
  render();
}

function runDualProbe() {
  if (probeBusy) return;
  var base = openAIUrl(cfg.dualBase);
  var model = (lastReq && lastReq.model) || '';
  if (!base || !model) { banner('⚪ 双通道指纹需要先发一轮，或在面板填 Base', 'gray'); return; }
  var probeTarget = ensureProbeUrl(base);
  if (!probeTarget) return;
  probeBusy = true;
  banner('🔬 双通道指纹请求中…', 'gray');
  var headers = { 'content-type': 'application/json' };
  var ghost = model + '-zzz-not-a-real-model';
  function ask(m) {
    return httpJson(probeTarget, {
      method: 'POST', headers: headers,
      body: JSON.stringify({ model: m, messages: [{ role: 'user', content: 'hi' }], max_tokens: 8, stream: false })
    }, 25000).then(function (r) { return r.status; }).catch(function () { return 0; });
  }
  Promise.all([ask(model), ask(ghost)]).then(function (codes) {
    probeBusy = false;
    var real = codes[0], g = codes[1];
    if (!real || real >= 400) banner('🔴 真名请求失败（HTTP ' + real + '），链路不可用', 'bad');
    else if (!g) banner('⚪ 幽灵名请求没发出去（网络错误），判断不了', 'gray');
    else if (g === 200) banner('🟠 宽松模式：幽灵名也返回 200 ⇒ 网关不校验 model，回传的 model 字段不可信', 'warn');
    /* 401/403 是认证没过、402 是没钱、429 是限流、5xx 是上游挂了——
       这几种都没走到「查模型名」那一步，不能当成「按名分发」。 */
    else if (g >= 400 && g < 500 && g !== 401 && g !== 403 && g !== 402 && g !== 429) banner('🟢 严格模式：幽灵名被拒（HTTP ' + g + '）⇒ 网关按名分发，model 字段可信', 'ok');
    else banner('⚪ 幽灵名回 HTTP ' + g + '：既不是「拒绝模型名」，也不是 200，判断不了', 'gray');
    render();
  });
}


try { TOKBACK.retry = retryFetch; } catch (eTB) {}
