/* ============================================================================
 * Anti-Route v6.0 — 1/4 Core
 * 宿主 / 存储 / 模型归一化 / 保护区 / 静态区选择
 * 设计来自 v5/v6/v7 的实战教训
 * ========================================================================== */

var VERSION = '0.100';
var TAG = '[AR6]';
var CFG_KEY = 'ar6.cfg';
var LOG_KEY = 'ar6.log';
var MAX_LOG = 40;

/* ---------------- 宿主 ---------------- */

function resolveHostWindow() {
  var cands = [];
  try { if (window.top) cands.push(window.top); } catch (e) {}
  try { if (window.parent) cands.push(window.parent); } catch (e) {}
  cands.push(window);
  for (var i = 0; i < cands.length; i++) {
    var w = cands[i];
    try {
      if (w && w.document && w.document.body && w.document.documentElement) return w;
    } catch (e) {}
  }
  return window;
}

/* 脚本自己所在的 window —— 酒馆助手的 eventOn/getButtonEvent 通常注入在这一层 */
var SELF_WIN = null;
try {
  SELF_WIN = (typeof window !== 'undefined' && window) ? window
    : ((typeof globalThis !== 'undefined') ? globalThis : null);
} catch (e) { SELF_WIN = null; }

var HOST = resolveHostWindow();
var DOC = null;
try { DOC = HOST.document; } catch (e) { DOC = null; }
if (!DOC) { try { DOC = document; } catch (e) {} }

/* ---------------- 存储 ---------------- */

var CFG_DEFAULT = {
  enabled: true,          // 总开关
  pin: true,              // 钉死路由参数（删 models[] / allow_fallbacks=false）
  think: 'off',           // off | high（只在字段缺失时补）
  refract: 'off',         // off | light | mid（三轨微扰档位）
  observe: true,          // 零锁观察器
  dualBase: '',           // 双通道指纹：base url
  dualKey: '',            // 双通道指纹：key
  min: false,             // 面板是否收成小球
  xhr: false,             // 是否挂钩 XMLHttpRequest（默认关；只用 fetch 更稳）
  safe: false,            // 安全模式：完全不挂钩，只留面板与横幅（排查用）
  mx: null,               // 移动端悬浮窗 left（px，null=默认右下）
  my: null,               // 移动端悬浮窗 top
  keep: 30,
  alias: '',              /* 别名钉死：非空时把请求的 model 改写成本值 */
  refractMode: 'stable',  /* stable=同会话固定变形（保前缀缓存）| random=每轮随机（实验） */
  refractSeed: '',        /* 用户盐：改一下，变形结果就换一套 */
  saltWin: 30,            /* 窗口盐：同一聊天在 N 分钟内保持同一套变形（0=关） */
  floatMode: 'dock',      /* dock=吸边半隐藏 | float=常驻 | tuck=贴边把手 */
  floatSize: 44, floatShape: 'circle', floatOpacity: 45, floatDock: 40,
  floatIcon: '', floatBg: '#ffffff', floatBorder: true, floatShadow: true,
  floatX: null, floatY: null, fxN: 1, fyN: 0.82, fEdge: '',
  /* v7.1 破甲：off | safe（只事后补救，不改请求）| strong（改请求 + 事后补救） */
  jail: 'off',
  jailConfirm: true,      /* 补之前先问一句（关掉=自动补） */
  jailMax: 2,             /* 同一轮最多自动续写几次 */
  jailTok: true,          /* 强力档：保底 max_tokens 2048（只加不减） */
  jailSafe: true,         /* 强力档：gemini 系 safetySettings 全 BLOCK_NONE */
  jailPre: false,         /* 强力档：预审框（system + user 各一句） */
  jailText: false,         /* 强力档：输出契约（贴在末条 user 消息尾部） */
  /* v0.6 抗截断：off | light（只提示，不补）| medium（len/cut/pause 补一次） */
  trunc: 'off',
  /* v0.7 抗截断 · 轻档 v2：事前往末条 user 尾部贴提示词（不改参数、不碰响应体、不补写）
     truncLen 只认 0 / 800 / 1200 / 1800（0=关，默认 1200） */
  truncTail: true,         /* L2 收尾契约 */
  truncLen: 1200,          /* L1 字数锚 */
  truncNoCert: true,       /* L3 反自我认证 */
  truncPad: 'off',         /* F 填充锚：off | math */
  truncPadEvery: 2,        /* 填充锚：每 N 段插一条 */
  truncStrip: true,        /* 填充块的显示层剥离 */
  peek: true,              /* 旁路克隆响应体取 model/modelVersion（只读，不阻塞） */
  cardAuto: true,          /* 判为「被换/无思考」时自动弹证据卡 */
  /* v0.82 行为基线：on | off（只提示，不判被换、不进账本；关闸时不写也不判） */
  base: 'on',
  /* v0.84 结构指纹：on | off（只提示；关闸时不写也不判，不进被换率） */
  shape: 'on',
  /* v0.100 只查 Gemini：true=只判定 google 家族；false=所有认得出家族的都判定
     （注意：和上面 v0.13 的 scope/scopeList 不是一回事，那组是「按列表过滤」） */
  onlyGemini: true,
  /* v0.100 自动更新：off | check（只查「有没有新版」，不自动下载、不自动替换）
     updUrl 指向一个纯文本或 JSON 的版本文件；留空则只显示「未配置」 */
  upd: 'off',
  updUrl: '',
  /* v0.76 反 OOC：off | on（总闸关时四个子项一律不生效，也不注任何字）
     子项：点名（世界书认人）/ 反模板 / 变更门槛 / 口吻一致。
     oocPolicy 只记冲突弹窗上「以后都按这个来」的全局选择：'' | script | preset */
  ooc: 'off',
  oocRoll: true,
  oocTpl: true,
  oocChg: false,
  oocVoice: true,
  oocPolicy: '',
  /* v8.31 叙述层：off | lite | full（贴在末条 user 消息尾部，只改请求副本） */
  know: 'off',             /* 防全知 */
  knowTip: 'on',           /* 打开防全知前先说明「它会禁止内心话与替人做决定」 */
  charm: 'off',            /* 去媚 */
  /* v0.13 检测范围：只有会被路由的模型才需要判「有没有被换」 */
  helpX: null,
  helpY: null,
  helpBig: false,
  scope: 'all',              /* all=全部都查 | only=只查列表内 | skip=跳过列表内 */
  scopeList: 'deepseek',     /* 逗号分隔关键词，按包含匹配，不分大小写 */
  v: 831,
  fx: 'full',
  rm: false,
  padSeen: false
};

var cfg = null;

function ar6Num(v, def, lo, hi) {
  var n = Number(v);
  if (!isFinite(n)) n = def;
  return Math.max(lo, Math.min(hi, n));
}

function ar6Pick(v, list, def) {
  var s = String(v == null ? '' : v);
  for (var i = 0; i < list.length; i++) if (list[i] === s) return s;
  return def;
}

/* 浮球族字段消毒：NaN 会写出 left:NaNpx，hidden 是单向门 */
function sanitizeFloat(d) {
  if (!d || typeof d !== 'object') return;
  if (String(d.floatMode) === 'hidden') d.floatMode = 'tuck';
  d.floatMode = ar6Pick(d.floatMode, ['dock', 'float', 'tuck'], 'dock');
  d.floatSize = Math.round(ar6Num(d.floatSize, 44, 28, 80));
  d.floatOpacity = Math.round(ar6Num(d.floatOpacity, 45, 10, 100));
  d.floatDock = Math.round(ar6Num(d.floatDock, 45, 20, 80));
  d.floatShape = ar6Pick(d.floatShape, ['circle', 'square'], 'circle');
  if (!/^#[0-9a-fA-F]{6}$/.test(String(d.floatBg))) d.floatBg = '#0d1117';
  var ico = String(d.floatIcon || '');
  d.floatIcon = (ico.length <= 4096 && /^(https?:\/\/|data:image\/(png|jpeg|webp|gif);base64,)/i.test(ico)) ? ico : '';
  d.floatBorder = d.floatBorder !== false;
  d.floatShadow = d.floatShadow !== false;
  d.fxN = ar6Num(d.fxN, 1, 0, 1);
  d.fyN = ar6Num(d.fyN, 0.82, 0, 1);
  d.fEdge = ar6Pick(d.fEdge, ['l', 'r'], d.fxN < 0.5 ? 'l' : 'r');
  if (typeof d.mx !== 'number' || !isFinite(d.mx)) d.mx = null;
  if (typeof d.my !== 'number' || !isFinite(d.my)) d.my = null;
  d.fx = ar6Pick(d.fx, ['full', 'calm', 'off'], 'full');
  d.rm = !!d.rm;
  d.min = !!d.min;
}

function readCfg() {
  var d = {};
  for (var k in CFG_DEFAULT) d[k] = CFG_DEFAULT[k];
  try {
    var raw = HOST.localStorage.getItem(CFG_KEY);
    if (raw) {
      var s = JSON.parse(raw);
      for (var k2 in s) if (Object.prototype.hasOwnProperty.call(CFG_DEFAULT, k2)) d[k2] = s[k2];
      // 版本迁移：v1 配置没有 refract 字段时，强制回到 off（不沿用旧噪声开关）
      if (!('refract' in s)) d.refract = 'off';
      /* 6.6 迁移：旧版默认开的 XHR 钩子会从旧配置继承下来，强制关掉一次 */
      if (s.v !== 831) {
    d.jailConfirm = true;
        /* 只有 v6 及更早的配置才强制关一次 XHR；v7.0.0 起的用户选择就地保留 */
        if (typeof s.v !== 'number' || s.v < 700) d.xhr = false;
        if (!('peek' in s) || typeof s.v !== 'number' || s.v < 730) d.peek = true;
        if (!('cardAuto' in s)) d.cardAuto = true;
        if (!('alias' in s)) d.alias = '';
        if (!('refractMode' in s)) d.refractMode = 'stable';
        if (!('floatMode' in s)) d.floatMode = 'dock';
        if (!('jail' in s)) d.jail = 'off';
        if (!('jailConfirm' in s)) d.jailConfirm = true;
        if (!('jailMax' in s)) d.jailMax = 2;
        if (!('jailTok' in s)) d.jailTok = true;
        if (!('jailSafe' in s)) d.jailSafe = true;
        if (!('jailPre' in s)) d.jailPre = false;
        if (!('jailText' in s)) d.jailText = false;
        if (!('saltWin' in s)) d.saltWin = 30;
        if (!('fxN' in s)) { d.fxN = 1; d.fyN = 0.82; d.fEdge = ''; }
        if (!('know' in s)) d.know = 'off';
        if (!('charm' in s)) d.charm = 'off';
        if (!('helpX' in s)) d.helpX = null;
        if (!('helpY' in s)) d.helpY = null;
        if (!('helpBig' in s)) d.helpBig = false;
        d.v = 831;
        try { HOST.localStorage.setItem(CFG_KEY, JSON.stringify(d)); } catch (e3) {}
      }
    }
  } catch (e) {}
  try { sanitizeFloat(d); } catch (eS) {}
  try { sanitizeTrunc(d); } catch (eT) {}
  return d;
}

/* 稳定种子：同一个 seedStr 永远得到同一个数，用来做「会话内固定」的微扰 */
function hashStr(s) {
  var h = 5381, i;
  s = String(s || '');
  for (i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0;
  return h >>> 0;
}

/* v7.4 窗口盐：同一「聊天 + 时间窗」内保持同一套变形——
   窗内前缀稳定（缓存能命中），跨窗轮换（指纹不固定）。 */
function chatTag() {
  try {
    var c = stCtx();
    if (c) {
      var id = c.chatId || c.chat_id || '';
      if (id) return 'c' + String(id).slice(0, 20);
      var arr = c.chat;
      if (arr && arr.length) {
        var m0 = arr[0] || {};
        var s0 = String(m0.send_date || '') + '|' + String(m0.name || '') + '|' + String(arr.length);
        return 'h' + hashStr(s0);
      }
    }
  } catch (e) {}
  return 'nochat';
}

function saltWindow() {
  var n = Number(cfg.saltWin);
  if (!isFinite(n) || n <= 0) return 0;
  return Math.min(240, Math.round(n));
}

function saltKey(tag) {
  var w = saltWindow();
  var bucket = w ? String(Math.floor(Date.now() / (w * 60000))) : 'free';
  return chatTag() + '|' + bucket + '|' + String(tag || '');
}

function saveCfg() {
  try { HOST.localStorage.setItem(CFG_KEY, JSON.stringify(cfg)); } catch (e) {}
}

function readLog() {
  try {
    var raw = HOST.localStorage.getItem(LOG_KEY);
    if (!raw) return [];
    var arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr : [];
  } catch (e) { return []; }
}

function pushLog(rec) {
  var arr = readLog();
  arr.unshift(rec);              /* 最新在前：面板表格直接取前 N 条 */
  var cap = MAX_LOG;
  if (typeof cfg === 'object' && cfg && cfg.keep) cap = Math.min(MAX_LOG, Math.max(10, cfg.keep));
  if (arr.length > cap) arr.length = cap;
  try { HOST.localStorage.setItem(LOG_KEY, JSON.stringify(arr)); } catch (e) {}
  return arr;
}

cfg = readCfg();

/* ---------------- 模型归一化 ---------------- */

var KNOWN_PREFIX = /^(?:models\/|google\/|openrouter\/|vertex_ai\/|vertex\/|gemini\/|custom\/|litellm\/|fireworks\/|together\/|pggo-|bdgo-|aihubmix-|proxy-|pg-)/;

function normModel(s) {
  var t = String(s == null ? '' : s).trim();
  if (!t) return '';
  try { t = decodeURIComponent(t); } catch (e) {}
  t = t.toLowerCase().split('?')[0].replace(/^https?:\/\/[^/]+\//, '');
  for (var i = 0; i < 6; i++) {
    var before = t;
    t = t.replace(/^[^\x00-\x7f]+[-_\s]*/, '').replace(KNOWN_PREFIX, '');
    if (t === before) break;
  }
  t = t.replace(/:(generatecontent|streamgeneratecontent|counttokens).*$/, '');
  return t.trim();
}

/* 「是不是同一个模型」用的名字归一：剥掉渠道别名与档位后缀。
   -ai / -vertex 是中转给自己标的路由方式，-low / -high 是思考档，都不改变模型身份。
   只用于判等，不改 normModel：档位表还得靠原始名字里的 pro / flash / argon。 */
var ID_TAIL_RE = /[-_.](?:ai|api|vertex|gcp|openai|azure|exp|experimental|preview|latest|thinking|think|nothink|nocot|low|medium|high|minimal|xhigh)$/;
function normModelIdentity(s) {
  var t = normModel(s);
  if (!t) return '';
  for (var i = 0; i < 4; i++) {
    var before = t;
    t = t.replace(ID_TAIL_RE, '');
    /* 日期尾巴：-2025-08-07 / -20250807 / -001 / -v2 */
    t = t.replace(/[-_.](?:v)?\d{1,2}(?:[-_.]\d{1,2}){1,2}$/, '');
    t = t.replace(/[-_.](?:v)?\d{1,4}$/, function (m0) {
      /* 纯数字尾巴只在 ≥3 位或带 v 时剥：别把 gpt-4 / gemini-3 的数字吃掉 */
      return /^[-_.]v/i.test(m0) || /\d{3,}/.test(m0) ? '' : m0;
    });
    if (t === before) break;
  }
  /* 3.0 和 3 是同一条代次线上的两种写法：gemini-3.0-flash ≡ gemini-3-flash。
     不归一的话，渠道换个写法就能被当成「换了模型」。 */
  t = t.replace(/\.0(?=[-_.]|$)/g, '');
  return t;
}

function isOpaqueModel(s) {
  var m = normModel(s);
  if (!m) return true;
  return /^(?:auto|router|default|unknown|any|best|lb)$/.test(m);
}

function isNonChatModel(s) {
  var m = normModel(s);
  return /(?:embedding|embedcontent|imagen|veo|aqa|image-only|tts|audio-only)/.test(m);
}

function isGeminiLike(s) {
  var m = normModel(s);
  if (!m || isOpaqueModel(m)) return false;
  if (/(?:gemma|claude|deepseek|gpt|o1|o3|qwen|llama|glm|ernie)/.test(m)) return false;
  return /gemini/.test(m) || /argon|flash|lite|pro/.test(m) === false ? /gemini/.test(m) : /gemini/.test(m);
}

/* 档位：1=lite/8b, 2=flash, 3=pro, 4=argon/ultra, 0=未知 */
function tierOf(s) {
  var m = normModel(s);
  if (!m || isOpaqueModel(m)) return 0;
  if (/(?:flash[-_. ]?lite|flash[-_. ]?8b|\blite\b|\bnano\b)/.test(m)) return 1;
  if (/\b(?:argon|ultra)\b/.test(m)) return 4;
  if (/\bpro\b/.test(m)) return 3;
  if (/\bflash\b/.test(m)) return 2;
  return 0;
}

/* 代次：gemini-3.1-flash → 3.1，gemini-3-flash → 3，gemini-2.5-pro → 2.5。
   只认「主版本[.次版本]」这种写法，认不出就返回 0（不比代次、不瞎猜）。 */
function genOf(s) {
  var m = normModel(s);
  if (!m || isOpaqueModel(m)) return 0;
  var g = m.match(/(?:^|[-_.])(\d{1,2})(?:[._](\d{1,2}))?(?=[-_.]|$)/);
  if (!g) return 0;
  var maj = Number(g[1]);
  if (!isFinite(maj) || maj <= 0) return 0;
  var min = g[2] == null ? 0 : Number(g[2]);
  if (!isFinite(min) || min < 0 || min > 9) return 0;
  return maj + min / 10;
}

function isProLike(s) {
  var t = tierOf(s);
  return t === 3 || t === 4;
}

/* 厂牌：档位表跨厂牌不可比，先分族再比档 */
function familyOf(s) {
  var m = normModel(s);
  if (!m || isOpaqueModel(m)) return '';
  if (/gemini|gemma|argon|palm\b/.test(m)) return 'google';
  if (/deepseek/.test(m)) return 'deepseek';
  if (/claude|anthropic/.test(m)) return 'anthropic';
  if (/gpt|chatgpt|^o[1-4](?:-|$)|openai/.test(m)) return 'openai';
  if (/qwen|glm|ernie|llama|mistral|kimi|moonshot|doubao|hunyuan|spark/.test(m)) return 'other';
  return '';
}

/* v0.100 检查范围：默认只查 Gemini 家族。
   scope=all 或认不出族（''）时放行——认不出的名字宁可不管，也别乱判。 */
/* v0.100：只查 Gemini 时，「算不算 Gemini」不能只看请求名。
   反代经常把同一个渠道换个名字（请求名写 gpt-4o，后端其实是 gemini），
   只按请求名判会把真 Gemini 也拦掉。规则：
     1) 关掉这个开关 → 什么都查；
     2) 请求名认出是 google → 查；
     3) 请求名认不出（空、别名、router）→ 查（宁可多查，不可漏查）；
     4) 请求名明确是别的家族 → 再看证据里有没有 google，有就查，没有才跳过。 */
function scopeHitGemini(ev) {
  try {
    if (!cfg || cfg.onlyGemini === false) return true;
    var rq = ev && ev.requestedModel ? String(ev.requestedModel) : '';
    var f = rq ? familyOf(rq) : '';
    if (!f) return true;
    if (f === 'google') return true;
    var obs = (ev && ev.observed) || [];
    for (var i = 0; i < obs.length; i++) {
      if (familyOf(String(obs[i] || '')) === 'google') return true;
    }
    return false;
  } catch (e) { return true; }
}

function inScopeModel(s) {
  try {
    if (!cfg || cfg.onlyGemini === false) return true;
    var f = familyOf(s);
    if (!f) return true;
    return f === 'google';
  } catch (e) { return true; }
}

function shortName(s) {
  var m = normModel(s);
  if (!m) return '—';
  return m.length > 26 ? m.slice(0, 25) + '…' : m;
}

/* ---------------- token 估算（CJK 0.85 / 拉丁 1÷3.5 / 其他 0.9） ---------------- */

function estimateTokens(str) {
  if (typeof str !== 'string' || !str) return 0;
  var cjk = 0, latin = 0, other = 0;
  for (var i = 0; i < str.length; i++) {
    var cp = str.codePointAt ? str.codePointAt(i) : str.charCodeAt(i);
    if (cp > 0xffff) i++;
    if (cp >= 0x3400 && cp <= 0x9fff) cjk++;
    else if (cp <= 0x7f) latin++;
    else other++;
  }
  return Math.ceil(cjk * 0.85 + latin / 3.5 + other * 0.9);
}

/* ---------------- 保护区 ----------------
 * 12 类：YAML frontmatter / 代码围栏 / 行内代码 / 酒馆宏 / 状态机标签 / 协议围栏
 *        / XML 标签本身 / 既有注释与引用定义 / URL 与链接 / LaTeX / 引号台词 / 未闭合标签到结尾
 */

var HARD_TAGS = 'UpdateVariable|JSONPatch|jsonpatch|mvu|status|StatusBlock|Status_block|state|panel|options|tool_call|function_call|run_tool_replacement|worldcustomfunction|worldsystem|KonataExtraInformation|IzumiEdit|stat_data|delta_data|variables|StatusPlaceHolderImpl|thinking|think|dream_think|simple_thinking|interleav|Interleaved_thinking|interactive_input';

var SPAN_RULES = [
  /(^|\n)([ \t]{0,3})(`{3,}|~{3,})[^\n]*\n[\s\S]*?\n\2\3[ \t]*(?=\n|$)/g,
  /(`+)([^`\n]+?)\1/g,
  /\{\{[\s\S]{0,4000}?\}\}|<%[\s\S]{0,4000}?%>/g,
  new RegExp('<(' + HARD_TAGS + ')\\b[^>]*>[\\s\\S]*?<\\/\\1\\s*>', 'gi'),
  /<<<\|catgodml\|[\s\S]*?>>>|\[\[IZUMI_CHAT_INDEX_V1\]\]/g,
  /<\/?[A-Za-z\u4e00-\u9fa5][\w:\u4e00-\u9fa5.-]*(?:\s[^<>]{0,400})?>/g,
  /<!--[\s\S]*?-->|^\[\/\/\]:\s*#\s*\([^\n]*\)/gm,
  /\bhttps?:\/\/[^\s<>()]+|!?\[[^\]]*\]\([^)]+\)/g,
  /\$\$[\s\S]*?\$\$|\$[^$\n]{1,400}\$|\\\([\s\S]*?\\\)|\\\[[\s\S]*?\\\]/g,
  /“[^”\n]{1,600}”|「[^」\n]{1,600}」|『[^』\n]{1,600}』|"[^"\n]{1,600}"/g
];

function collectSpans(text) {
  var spans = [];
  if (typeof text !== 'string' || !text) return spans;

  var yaml = /^---[ \t]*\r?\n[\s\S]{1,4000}?\r?\n---[ \t]*(?:\r?\n|$)/.exec(text);
  if (yaml) spans.push([0, yaml[0].length]);

  var trimmed = text.trim();
  if ((trimmed.charAt(0) === '{' && trimmed.slice(-1) === '}') ||
      (trimmed.charAt(0) === '[' && trimmed.slice(-1) === ']')) {
    try { JSON.parse(trimmed); return [[0, text.length]]; } catch (e) {}
  }

  for (var r = 0; r < SPAN_RULES.length; r++) {
    var re = new RegExp(SPAN_RULES[r].source, SPAN_RULES[r].flags);
    var m;
    var guard = 0;
    while ((m = re.exec(text)) !== null && guard++ < 4000) {
      var s = m.index + (m[1] && m[1].length && SPAN_RULES[r] === SPAN_RULES[0] ? m[2].length : 0);
      spans.push([m.index, m.index + m[0].length]);
      if (m[0].length === 0) re.lastIndex++;
    }
  }

  // 未闭合硬标签：从开标签一路保护到结尾
  var openRe = new RegExp('<(' + HARD_TAGS + ')\\b[^>]*>', 'gi');
  var om;
  var oguard = 0;
  while ((om = openRe.exec(text)) !== null && oguard++ < 500) {
    var name = om[1];
    var closeRe = new RegExp('<\\/' + name + '\\s*>', 'i');
    var after = text.slice(om.index + om[0].length);
    if (!closeRe.test(after)) spans.push([om.index, text.length]);
  }

  spans.sort(function (a, b) { return a[0] - b[0] || a[1] - b[1]; });
  var merged = [];
  for (var i = 0; i < spans.length; i++) {
    var cur = spans[i];
    if (cur[1] <= cur[0]) continue;
    if (merged.length && cur[0] <= merged[merged.length - 1][1]) {
      merged[merged.length - 1][1] = Math.max(merged[merged.length - 1][1], cur[1]);
    } else merged.push([cur[0], cur[1]]);
  }
  return merged;
}

function isProtected(spans, start, end) {
  if (!spans || !spans.length) return false;
  var lo = 0, hi = spans.length - 1;
  var qs = Math.min(start, end);
  var qe = Math.max(start + 1, end);
  while (lo <= hi) {
    var mid = (lo + hi) >> 1;
    if (qe <= spans[mid][0]) hi = mid - 1;
    else if (qs >= spans[mid][1]) lo = mid + 1;
    else return true;
  }
  return false;
}

/* ---------------- 静态区评分 ---------------- */

var INSTR_WORDS = /必须|禁止|不得|严禁|请勿|务必|严格|规则|准则|规范|格式|输出|设定|要求|注意|重要|优先|示例|指令|遵循|扮演|描写|文风|字数|段落|\b(?:must|shall|require|format|rule|instruction|guideline|never|do not|output|response|system|character|roleplay|constraint)\b/gi;
var NARR_WORDS = /说道|问道|看着|望向|走进|转身|笑了笑|低声|轻声|沉默|抬头|叹气|眼神|目光|呼吸|手指|窗外|嘴角|点头|摇头|心想|声音|\b(?:said|asked|looked|smiled|whispered|sighed|walked|turned|nodded|eyes|voice|hand|felt|thought)\b/gi;
var QUOTE_RE = /“[^”\n]{2,200}”|「[^」\n]{2,200}」|"[^"\n]{2,200}"/g;
var MARKUP_RE = /^(?:[ \t]*#{1,6}[ \t]+\S|[ \t]*[-+*][ \t]+\S|[ \t]*\d+[.)][ \t]+\S|[ \t]*>[ \t]+\S)|<\/?[A-Za-z][\w:.-]*\b/gm;

function density(text, re) {
  if (!text) return 0;
  var hits = text.match(new RegExp(re.source, re.flags));
  return ((hits ? hits.length : 0) * 1000) / Math.max(80, text.length);
}

function staticScore(node, total) {
  var text = node.text || '';
  if (text.replace(/\s/g, '').length < 40) return -50;
  if (node.isLastUser) return -100;
  if (node.isPrefill) return -90;

  var score = 0;
  var role = node.role;
  if (role === 'system' || role === 'developer') score += 42;
  else if (role === 'user') score += 8;
  else if (role === 'assistant' || role === 'model') score -= 25;

  if (node.index === 0) score += 20;
  else if (node.index < 3) score += 14;

  var ins = density(text, INSTR_WORDS);
  var nar = density(text, NARR_WORDS);
  var quo = density(text, QUOTE_RE);
  var mark = density(text, MARKUP_RE);

  score += Math.min(32, ins * 3.8);
  score += Math.min(16, mark * 2.5);
  score -= Math.min(38, nar * 2.6 + quo * 3.2);
  if (ins >= 3.5 && mark >= 2.0 && nar < 2.0) score += 18;

  return Math.max(-100, Math.min(100, score));
}

function hasRuleMarkup(text) {
  if (typeof text !== 'string' || text.length < 80) return false;
  if (/^[ \t]*#{1,6}[ \t]+\S/m.test(text)) return true;
  var lists = text.match(/^[ \t]*(?:[-+*]|\d+[.)])[ \t]+\S/gm);
  if (lists && lists.length >= 2) return true;
  return /<(?:rules?|instructions?|guidelines?|system|config|writing_style|world_info)\b/i.test(text);
}

/* 历史带：首条 assistant 及其之后（含触发它的那条 user）全部视为历史 */
function findHistoryBand(nodes) {
  var firstAssistant = -1;
  for (var i = 0; i < nodes.length; i++) {
    if (nodes[i].role === 'assistant' || nodes[i].role === 'model') { firstAssistant = i; break; }
  }
  if (firstAssistant < 0) return null;
  var start = firstAssistant;
  for (var j = firstAssistant - 1; j >= 0; j--) {
    if (nodes[j].role === 'user') { start = j; break; }
  }
  var lastUser = -1;
  for (var k = nodes.length - 1; k >= 0; k--) if (nodes[k].isLastUser) { lastUser = k; break; }
  var end = lastUser >= 0 ? lastUser - 1 : nodes.length - 1;
  if (end < start) return null;
  return { start: start, end: end, memberCount: end - start + 1 };
}

/* ---------------- 区选择 ---------------- */

function getMsgText(m) {
  if (!m) return '';
  if (typeof m.content === 'string') return m.content;
  if (Array.isArray(m.content)) {
    for (var i = 0; i < m.content.length; i++) {
      var p = m.content[i];
      if (p && p.type === 'text' && typeof p.text === 'string') return p.text;
    }
  }
  if (typeof m.text === 'string') return m.text;
  return '';
}

function pickZones(inner, channel, maxZones) {
  var zones = [];
  var msgs = Array.isArray(inner.messages) ? inner.messages : null;

  if (!msgs && (Array.isArray(inner.contents) || inner.systemInstruction)) {
    var si = inner.systemInstruction;
    if (si && Array.isArray(si.parts)) {
      for (var p = 0; p < si.parts.length; p++) {
        (function (part) {
          if (!part || typeof part.text !== 'string') return;
          if (part.text.replace(/\s/g, '').length < 60) return;
          zones.push({ get: function () { return part.text; }, set: function (v) { part.text = v; }, score: 100, why: 'systemInstruction.parts[' + p + ']' });
        })(si.parts[p]);
      }
    } else if (si && typeof si.text === 'string' && si.text.replace(/\s/g, '').length >= 60) {
      zones.push({ get: function () { return si.text; }, set: function (v) { si.text = v; }, score: 100, why: 'systemInstruction.text' });
    }
    return zones.slice(0, maxZones);
  }

  if (!msgs || !msgs.length) return zones;

  var lastUserIdx = -1;
  for (var i = msgs.length - 1; i >= 0; i--) {
    var r = String(msgs[i] && msgs[i].role || '').toLowerCase();
    if (r === 'user' && getMsgText(msgs[i]).trim()) { lastUserIdx = i; break; }
  }

  var nodes = [];
  for (var j = 0; j < msgs.length; j++) {
    var m = msgs[j];
    if (!m || typeof m !== 'object') continue;
    var role = String(m.role || 'user').toLowerCase();
    if (role === 'tool' || role === 'function' || m.tool_calls || m.function_call) continue;
    var text = getMsgText(m);
    if (!text || !text.trim()) continue;
    nodes.push({
      index: j, role: role, text: text,
      isLastUser: j === lastUserIdx,
      isPrefill: (role === 'assistant' || role === 'model') && j === msgs.length - 1 && j > lastUserIdx,
      msg: m
    });
  }

  var band = findHistoryBand(nodes);
  var headIdx = band ? band.start : nodes.length;

  for (var k = 0; k < nodes.length; k++) {
    var n = nodes[k];
    if (n.isLastUser || n.isPrefill) continue;
    if (n.role === 'assistant' || n.role === 'model') continue;
    if (band && k >= band.start && k <= band.end) continue;
    var sc = staticScore(n, nodes.length);
    if (sc < 52) continue;
    if (n.role === 'user' && !hasRuleMarkup(n.text)) continue;
    zones.push({
      score: sc,
      why: 'msg[' + n.index + '](' + n.role + ',' + Math.round(sc) + ')',
      get: (function (msg) { return function () { return getMsgText(msg); }; })(n.msg),
      set: (function (msg) { return function (v) { if (typeof msg.content === 'string') msg.content = v; else msg.content = [{ type: 'text', text: v }]; }; })(n.msg)
    });
  }

  zones.sort(function (a, b) { return b.score - a.score; });
  return zones.slice(0, maxZones);
}
