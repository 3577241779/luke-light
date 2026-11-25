/* ===== 11c_diag_fp.js ===== */
/* ============================================================================
 * 卢克之光 V5.77 — 光鉴引擎（通道分类 / 上游四维硬指纹 V1~V4 / 标准报错归因 / 离线一码通 & 本地私有公益站白名单）
 *
 * 设计铁律：
 *   1. 纯 ES5（var / function），零外部网络请求，零聊天正文读取，零密钥泄露。
 *   2. 开源代码严禁硬编码任何社区公益站域名：外部中转一律客观标为 RLP / RLO + 4位单向加盐域哈希；
 *      管理员/用户可在本地解码器维护私有公益站白名单（仅存浏览器 localStorage），自动高亮匹配。
 *   3. 绝不以单一“出字快”误杀开启投机解码的真模型（如 gemini-4-hydrogen 可达 170 t/s）；
 *      必须四维交叉验证（模型身份 × 原生硬证 × 思考/首字/速率倒挂 × 通道形态）。
 * ========================================================================== */

var LK_DIAG_B32 = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';
var LK_PUB_WL_KEY = 'ar7.pubwl';
var LK_DIAG_VER_CODE = 'LK77';

/* 已知官方直连域（公开官方接口域名，不含任何第三方或公益站） */
var LK_OFFICIAL_HOST_RE = /^(?:generativelanguage\.googleapis\.com|(?:[a-z0-9-]+-)?aiplatform\.googleapis\.com|api\.anthropic\.com|api\.openai\.com|api\.deepseek\.com|api\.x\.ai|api\.mistral\.ai|api\.groq\.com|api\.cohere\.(?:ai|com)|api\.perplexity\.ai|api\.moonshot\.(?:cn|ai)|api\.siliconflow\.(?:cn|com)|open\.bigmodel\.cn|dashscope\.aliyuncs\.com)$/i;

/* 常见个人云反代托管后缀（区分个人免费反代与独立域名中转） */
var LK_SELF_CLOUD_RE = /\.(?:workers\.dev|pages\.dev|deno\.dev|vercel\.app|netlify\.app|zeabur\.app|hf\.space|onrender\.com|railway\.app|fly\.dev|koyeb\.app)$/i;

/* 公开知名聚合平台 */
var LK_AGG_HOST_RE = /^(?:(?:[a-z0-9-]+\.)?openrouter\.ai|gateway\.ai\.cloudflare\.com|api\.together\.xyz|api\.fireworks\.ai|api\.aimlapi\.com|llm\.chutes\.ai|nano-gpt\.com|api\.electronhub\.ai)$/i;

/* 已知官方 chat_completion_source（未挂自定义反代时即官方直连） */
var LK_OFFICIAL_SRC_MAP = {
  makersuite: 'Google AI Studio',
  vertexai: 'Google Vertex AI',
  claude: 'Anthropic 官方',
  openai: 'OpenAI 官方',
  deepseek: 'DeepSeek 官方',
  xai: 'xAI 官方',
  mistralai: 'Mistral 官方',
  groq: 'Groq 官方',
  cohere: 'Cohere 官方',
  perplexity: 'Perplexity 官方',
  moonshot: 'Moonshot 官方',
  siliconflow: 'SiliconFlow 官方',
  zai: 'Z.AI 官方'
};

var LK_AGG_SRC_MAP = {
  openrouter: 'OpenRouter',
  aimlapi: 'AI/ML API',
  chutes: 'Chutes',
  nanogpt: 'NanoGPT',
  electronhub: 'ElectronHub'
};

var LK_CH_META = {
  OFF: { label: '官方直连', short: '官方', color: '#34d399', desc: '官方原生源直连，未配置自定义反代域' },
  LOC: { label: '本地/内网自建', short: '本地自建', color: '#38bdf8', desc: '本机或局域网自建代理（如本地反代/CLI中转）' },
  SLF: { label: '个人云反代', short: '云反代', color: '#38bdf8', desc: 'Workers / Deno / Vercel 等常见个人托管反代域' },
  AGG: { label: '公开聚合平台', short: '聚合站', color: '#a78bfa', desc: 'OpenRouter 等公开 API 聚合平台' },
  RLP: { label: '外部原生反代', short: '原生反代', color: '#fcd34d', desc: '非官方公网域名 + 原生协议反代（公益站/自建域/商业反代均呈此态）' },
  RLO: { label: '外部兼容中转', short: '兼容中转', color: '#fb923c', desc: '非官方公网域名 + OpenAI 兼容中转（公益站/商业中转均呈此态）' }
};

var LK_FP_GRADE_META = {
  V1: { label: '硬证验真', color: '#34d399', desc: '模型身份一致且命中厂商原生硬指纹（如 thoughtSignature / 原生 modelVersion / 官方直连 / 探针验真），无特征倒挂。' },
  V2: { label: '仅回显·无硬证', color: '#fcd34d', desc: '返回模型名一致且节律未见明显倒挂，但未采到原生硬指纹（常见于抹除原生字段的兼容中转，建议配合真伪探针复核）。' },
  V3: { label: '特征倒挂·高疑掉包', color: '#f97316', desc: '模型名看似一致或被抹除，但触发零硬证 + 零思考极速/瞬出/伪流式等跨档倒挂特征，高度疑似后台降级或偷换。' },
  V4: { label: '实锤掉包/错配', color: '#f43f5e', desc: '上游响应明确返回与请求不符的模型、跨厂牌模型或发生代次/档位降级。' },
  V0: { label: '非正常/未生成', color: '#94a3b8', desc: '本轮请求报错、被拦截、限流、空回或跳过，不参与真伪定级。' }
};

var LK_ERR_META = {
  E000: { label: '正常返回', desc: 'HTTP 200 正常完成生成。' },
  E400T: { label: '400 上限超标', desc: 'HTTP 400：上下文总长或 max_tokens 超出上游限制。' },
  E400P: { label: '400 参数不兼容', desc: 'HTTP 400：请求结构、工具定义或字段被上游/中转拒绝。' },
  E401: { label: '401/403 鉴权失败', desc: 'API Key 无效、过期、余额不足或当前模型无访问权限。' },
  E404: { label: '404 模型/路径不存在', desc: '接口路径错误或该渠道未上架所请求的模型名。' },
  E429: { label: '429 限流/配额耗尽', desc: '上游或公益站触发并发/RPM/TPM 限流或额度用尽。' },
  E503: { label: '503/529 上游过载', desc: '上游算力节点繁忙或暂时不可用，属服务端拥堵。' },
  E5XX: { label: '5xx 网关异常', desc: 'HTTP 500/502/504：上游或反代网关内部故障/超时。' },
  ECF: { label: 'CF 盾拦截', desc: '命中 Cloudflare 质询页或 WAF 拦截（返回 HTML 而非 JSON）。' },
  EBLK: { label: '安全策略拦截', desc: '命中上游内容审查（PROHIBITED_CONTENT / SAFETY / BLOCKLIST）。' },
  EEMP: { label: '200 确认空回', desc: 'HTTP 200 返回但响应流与聊天均确认 0 字正文。' },
  ECUT: { label: '输出截断', desc: '触达长度上限（MAX_TOKENS/length）或半句异常断尾。' },
  ENET: { label: '网络断流/超时', desc: '请求发送失败、连接被重置或流式读取中断。' },
  EABT: { label: '用户中止', desc: '本轮由用户主动停止或外部中断信号取消。' }
};

/* 模型短码双向字典：短小直观，未收录模型自动回退 ~slug */
var LK_MODEL_CODES = [
  ['G4H', 'gemini-4-hydrogen'],
  ['G4A', 'gemini-4-argon'],
  ['G4C', 'gemini-4-carbon'],
  ['G4N', 'gemini-4-neon'],
  ['G31FL', 'gemini-3.1-flash-lite'],
  ['G31F', 'gemini-3.1-flash'],
  ['G31P', 'gemini-3.1-pro'],
  ['G3FL', 'gemini-3-flash-lite'],
  ['G3F', 'gemini-3-flash'],
  ['G3P', 'gemini-3-pro'],
  ['G25FL', 'gemini-2.5-flash-lite'],
  ['G25F', 'gemini-2.5-flash'],
  ['G25P', 'gemini-2.5-pro'],
  ['G20FL', 'gemini-2.0-flash-lite'],
  ['G20F', 'gemini-2.0-flash'],
  ['CO4', 'claude-opus-4'],
  ['CS4', 'claude-sonnet-4'],
  ['CS37', 'claude-3-7-sonnet'],
  ['CS35', 'claude-3-5-sonnet'],
  ['CH35', 'claude-3-5-haiku'],
  ['DSR1', 'deepseek-reasoner'],
  ['DSV3', 'deepseek-chat'],
  ['O5', 'gpt-5'],
  ['O41', 'gpt-4.1'],
  ['O4O', 'gpt-4o'],
  ['OO4M', 'o4-mini'],
  ['OO3', 'o3'],
  ['GRK4', 'grok-4'],
  ['GRK3', 'grok-3']
];

/* ---------------- 单向短哈希 & CRC（纯 ES5，无外部依赖） ---------------- */

function lkFnv32(str, seed) {
  var h = (typeof seed === 'number' ? seed : 0x811c9dc5) >>> 0;
  var s = String(str == null ? '' : str);
  for (var i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = (Math.imul ? Math.imul(h, 0x01000193) : (((h & 0xffff) * 0x01000193) + ((((h >>> 16) * 0x01000193) & 0xffff) << 16))) >>> 0;
  }
  return h >>> 0;
}

function lkB32Of(num, len) {
  var n = num >>> 0;
  var out = '';
  for (var i = 0; i < len; i++) {
    out = LK_DIAG_B32.charAt(n & 31) + out;
    n = n >>> 5;
  }
  return out;
}

function lkNormalizeHost(raw) {
  var s = String(raw == null ? '' : raw).trim();
  if (!s) return '';
  if (s.charAt(0) === '#') return '';
  try {
    var withProto = /^[a-z][a-z0-9+.-]*:\/\//i.test(s) ? s : ('https://' + s);
    var u = new URL(withProto);
    var h = String(u.hostname || '').toLowerCase().replace(/^www\./, '').replace(/\.$/, '');
    if (!h) return '';
    var p = String(u.port || '');
    if (p && p !== '80' && p !== '443' && lkIsLocalHost(h)) return h + ':' + p;
    return h;
  } catch (e) {
    var m = s.toLowerCase().replace(/^[a-z][a-z0-9+.-]*:\/\//i, '').replace(/\/.*$/, '').replace(/\?.*$/, '').replace(/^[^@]*@/, '').replace(/^www\./, '');
    if (!m) return '';
    var hostOnly = m.replace(/:\d+$/, '');
    return lkIsLocalHost(hostOnly) ? m : hostOnly;
  }
}

function lkIsLocalHost(host) {
  var h = String(host || '').toLowerCase().replace(/:\d+$/, '').replace(/^\[|\]$/g, '');
  if (!h) return false;
  if (h === 'localhost' || h === '::1' || h === '0.0.0.0') return true;
  if (/^127\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(h)) return true;
  if (/^10\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(h)) return true;
  if (/^192\.168\.\d{1,3}\.\d{1,3}$/.test(h)) return true;
  if (/^172\.(?:1[6-9]|2\d|3[01])\.\d{1,3}\.\d{1,3}$/.test(h)) return true;
  if (/^100\.(?:6[4-9]|[7-9]\d|1[01]\d|12[0-7])\.\d{1,3}\.\d{1,3}$/.test(h)) return true;
  if (/\.(?:local|lan|home\.arpa|internal)$/i.test(h)) return true;
  return false;
}

/* 4 位不可逆加盐域哈希（公开代码中零域名，路人无法反推原址） */
function lkDomainHash(rawHostOrUrl) {
  var h = lkNormalizeHost(rawHostOrUrl);
  if (!h) return '0000';
  var a = lkFnv32('LK77_CH_SALT_V1|' + h, 0x811c9dc5);
  var b = lkFnv32(h + '|LK77_CH_MIX_B', a ^ 0x9e3779b9);
  var mix = ((a ^ (b >>> 11) ^ (b << 7)) >>> 0) & 0xfffff; /* 20 bits -> 4 Base32 chars */
  var code = lkB32Of(mix, 4);
  return code === '0000' ? '0001' : code;
}

/* 4 位防篡改校验码（覆盖完整载荷，手工改任何一位都会验签失败） */
function lkDiagCrc(payload) {
  var s = String(payload || '').trim().toUpperCase();
  var h1 = lkFnv32('LK77_CRC_A|' + s, 0x243f6a88);
  var h2 = lkFnv32(s + '|LK77_CRC_B', h1 ^ 0x85a308d3);
  var mix = ((h1 ^ (h2 >>> 9) ^ (h2 << 13)) >>> 0) & 0xfffff;
  return lkB32Of(mix, 4);
}

/* ---------------- 本地私有公益站白名单（仅存本机 localStorage，绝不随代码分发） ---------------- */

function lkPubWlRead() {
  try {
    var raw = (typeof ar6LsGet === 'function') ? ar6LsGet(LK_PUB_WL_KEY) : '';
    if (!raw) return [];
    var arr = JSON.parse(raw);
    if (!Array.isArray(arr)) return [];
    var out = [];
    for (var i = 0; i < arr.length; i++) {
      var it = arr[i];
      if (!it || typeof it !== 'object') continue;
      var hs = String(it.hash || '').trim().toUpperCase();
      var lb = String(it.label || '').trim().slice(0, 32);
      if (/^[0-9A-Z]{4}$/.test(hs) && hs !== '0000') out.push({ label: lb || ('公益站#' + hs), hash: hs });
    }
    return out;
  } catch (e) { return []; }
}

function lkPubWlWrite(arr) {
  try {
    var clean = Array.isArray(arr) ? arr.slice(0, 120) : [];
    if (typeof ar6LsSet === 'function') ar6LsSet(LK_PUB_WL_KEY, JSON.stringify(clean));
    return true;
  } catch (e) { return false; }
}

/* 支持输入格式：
 *   1) "类脑公益1号=https://relay.example.com/v1" -> 自动算哈希并只存 {label, hash}（本机都不留明文网址）
 *   2) "类脑公益1号=#7K2M" -> 直接按哈希登记
 *   3) "https://relay.example.com" 或 "relay.example.com" -> 自动用脱敏短标签 + 哈希登记
 *   支持多行批量导入。 */
function lkPubWlAdd(inputText) {
  var raw = String(inputText == null ? '' : inputText).trim();
  if (!raw) return { added: 0, updated: 0, total: lkPubWlRead().length, items: [] };
  var list = lkPubWlRead();
  var lines = raw.split(/[\r\n,;]+/);
  var added = 0, updated = 0, parsed = [];
  for (var i = 0; i < lines.length; i++) {
    var ln = String(lines[i] || '').trim();
    if (!ln || ln.charAt(0) === '/' && ln.charAt(1) === '/') continue;
    var label = '', target = ln;
    var eqIdx = ln.indexOf('=');
    var colIdx = (eqIdx < 0 && ln.indexOf('://') < 0) ? ln.indexOf('：') : -1;
    var sepIdx = eqIdx > 0 ? eqIdx : colIdx;
    if (sepIdx > 0) {
      label = ln.slice(0, sepIdx).trim().slice(0, 32);
      target = ln.slice(sepIdx + 1).trim();
    }
    var hash = '';
    var mHash = /^#?([0-9A-HJ-NP-TV-Z]{4})$/i.exec(target);
    if (mHash) {
      hash = mHash[1].toUpperCase();
    } else {
      var host = lkNormalizeHost(target);
      if (!host) continue;
      hash = lkDomainHash(host);
      if (!label) {
        var seg = host.split('.')[0] || host;
        label = '公益站(' + seg.slice(0, 10) + ')';
      }
    }
    if (!hash || hash === '0000') continue;
    if (!label) label = '公益站#' + hash;
    var hitIdx = -1;
    for (var j = 0; j < list.length; j++) {
      if (list[j].hash === hash) { hitIdx = j; break; }
    }
    if (hitIdx >= 0) {
      list[hitIdx].label = label;
      updated++;
    } else {
      list.push({ label: label, hash: hash });
      added++;
    }
    parsed.push({ label: label, hash: hash });
  }
  if (added || updated) lkPubWlWrite(list);
  return { added: added, updated: updated, total: list.length, items: parsed };
}

function lkPubWlRemove(hash) {
  var h = String(hash || '').trim().toUpperCase().replace(/^#/, '');
  var list = lkPubWlRead();
  var next = [];
  var removed = false;
  for (var i = 0; i < list.length; i++) {
    if (list[i].hash === h) { removed = true; continue; }
    next.push(list[i]);
  }
  if (removed) lkPubWlWrite(next);
  return removed;
}

function lkMatchPubWhitelist(hash) {
  var h = String(hash || '').trim().toUpperCase().replace(/^#/, '');
  if (!h || h === '0000') return null;
  var list = lkPubWlRead();
  for (var i = 0; i < list.length; i++) {
    if (list[i].hash === h) return list[i];
  }
  return null;
}

/* ---------------- 通道来源客观分类 ---------------- */

function lkClassifyChannel(url, bodyObj, stSettings) {
  var res = {
    code: 'OFF',
    hash: '0000',
    source: '',
    proto: 'unknown',
    hostMasked: '',
    label: '官方直连'
  };
  try {
    var root = (bodyObj && bodyObj.request && typeof bodyObj.request === 'object' && !Array.isArray(bodyObj.request)) ? bodyObj.request : bodyObj;
    var stOai = stSettings || null;
    if (!stOai) {
      try {
        var c = (typeof stCtx === 'function') ? stCtx() : null;
        if (c && c.chatCompletionSettings && typeof c.chatCompletionSettings === 'object') stOai = c.chatCompletionSettings;
      } catch (eCtx) {}
    }

    var src = String(
      (bodyObj && bodyObj.chat_completion_source) ||
      (root && root.chat_completion_source) ||
      (stOai && stOai.chat_completion_source) || ''
    ).trim().toLowerCase();

    var proxyRaw = String(
      (bodyObj && (bodyObj.custom_url || bodyObj.reverse_proxy)) ||
      (root && (root.custom_url || root.reverse_proxy)) || ''
    ).trim();
    /* 若请求体走酒馆后端但未内联 custom_url/reverse_proxy，再从当前激活 ST 设置兜底读取 */
    var uStr = String(url || '');
    var isStBackend = /\/api\/backends\/(?:chat-completions|text-completions)|\/chat-completions\/generate\b/.test(uStr);
    if (!proxyRaw && isStBackend && stOai) {
      if (src === 'custom' && stOai.custom_url) proxyRaw = String(stOai.custom_url).trim();
      else if (stOai.reverse_proxy) proxyRaw = String(stOai.reverse_proxy).trim();
    }

    var isGeminiNative = /:(?:stream)?[gG]enerateContent\b/i.test(uStr) ||
      (root && (Array.isArray(root.contents) || !!root.systemInstruction)) ||
      src === 'makersuite' || src === 'vertexai';
    var isClaudeNative = /\/v1\/messages\b/i.test(uStr) || src === 'claude';
    var proto = isGeminiNative ? 'gemini' : (isClaudeNative ? 'claude' : 'openai');
    res.proto = proto;
    res.source = src || (isStBackend ? 'st' : 'direct');

    /* 判定目标主机 */
    var targetUrl = proxyRaw || (!isStBackend ? uStr : '');
    var host = targetUrl ? lkNormalizeHost(targetUrl) : '';

    if (host) {
      if (LK_OFFICIAL_HOST_RE.test(host)) {
        res.code = 'OFF';
        res.hash = '0000';
        res.label = '官方直连' + (src && LK_OFFICIAL_SRC_MAP[src] ? (' · ' + LK_OFFICIAL_SRC_MAP[src]) : '');
        return res;
      }
      if (LK_AGG_HOST_RE.test(host)) {
        res.code = 'AGG';
        res.hash = lkDomainHash(host);
        res.label = '公开聚合 · ' + host;
        return res;
      }
      if (lkIsLocalHost(host)) {
        res.code = 'LOC';
        res.hash = lkDomainHash(host);
        res.label = '本地/内网自建代理';
        return res;
      }
      if (LK_SELF_CLOUD_RE.test(host)) {
        res.code = 'SLF';
        res.hash = lkDomainHash(host);
        res.label = '个人云反代';
        return res;
      }
      /* 外部公网域名：按协议客观分为原生反代 RLP vs OpenAI 兼容中转 RLO */
      res.code = (proto === 'gemini' || proto === 'claude') ? 'RLP' : 'RLO';
      res.hash = lkDomainHash(host);
      res.label = LK_CH_META[res.code].label;
      return res;
    }

    /* 无外链主机（走 ST 后端且无 custom_url / reverse_proxy） */
    if (src && LK_OFFICIAL_SRC_MAP[src]) {
      res.code = 'OFF';
      res.hash = '0000';
      res.label = '官方直连 · ' + LK_OFFICIAL_SRC_MAP[src];
      return res;
    }
    if (src && LK_AGG_SRC_MAP[src]) {
      res.code = 'AGG';
      res.hash = lkDomainHash(src + '.agg.st');
      res.label = '公开聚合 · ' + LK_AGG_SRC_MAP[src];
      return res;
    }
    if (src === 'custom') {
      res.code = 'RLO';
      res.hash = '0000';
      res.label = '外部兼容中转（未取到域名）';
      return res;
    }
    /* 回退：检查 lastReq / curBase 兜底 */
    var fbBase = '';
    try { fbBase = (typeof curBase === 'function') ? String(curBase() || '') : ''; } catch (eFb) {}
    if (fbBase && !/\/st\/(?:makersuite|vertexai|claude|openai|deepseek|xai|mistralai|groq)\b/i.test(fbBase)) {
      var fbHost = lkNormalizeHost(fbBase);
      if (fbHost && !LK_OFFICIAL_HOST_RE.test(fbHost)) {
        res.code = lkIsLocalHost(fbHost) ? 'LOC' : (LK_SELF_CLOUD_RE.test(fbHost) ? 'SLF' : (LK_AGG_HOST_RE.test(fbHost) ? 'AGG' : ((proto === 'gemini' || proto === 'claude') ? 'RLP' : 'RLO')));
        res.hash = lkDomainHash(fbHost);
        res.label = (LK_CH_META[res.code] && LK_CH_META[res.code].label) || '外部中转';
        return res;
      }
    }
  } catch (e) {}
  return res;
}

/* ---------------- 响应 ID 拓扑与硬指纹初始化 ---------------- */

function lkNewFp() {
  return {
    nativeModelVersion: '',
    respModel: '',
    respId: '',
    idKind: 'none',
    hasThoughtSig: false,
    sysFp: '',
    serviceTier: '',
    usageProto: 'none',
    hasCachedTok: false,
    textChunks: 0,
    firstTextChunkChars: 0,
    maxChunkChars: 0,
    nonStreamDump: false
  };
}

function lkClassifyRespId(id, fromGeminiRespId) {
  var s = String(id == null ? '' : id).trim();
  if (!s) return 'none';
  if (fromGeminiRespId && /^[A-Za-z0-9_-]{16,40}$/.test(s) && s.indexOf('chatcmpl-') !== 0) return 'gem_nat';
  if (/^msg_[A-Za-z0-9_-]{12,}$/.test(s)) return 'anth_msg';
  if (/^gen-[A-Za-z0-9_-]{8,}$/.test(s)) return 'gen_or';
  if (/^chatcmpl-[A-Za-z0-9_-]{10,}$/.test(s)) return 'oai_cmpl';
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s)) return 'uuid';
  if (/^[A-Za-z0-9_-]{18,32}$/.test(s)) return 'gem_like';
  return 'custom';
}

/* 检测请求是否显式关闭思考（显式关思考时不因 0 思考判倒挂） */
function lkDetectReqThinkOff(bodyObj) {
  try {
    if (!bodyObj || typeof bodyObj !== 'object') return false;
    var root = (bodyObj.request && typeof bodyObj.request === 'object' && !Array.isArray(bodyObj.request)) ? bodyObj.request : bodyObj;
    var re = String(bodyObj.reasoning_effort || root.reasoning_effort || (root.reasoning && root.reasoning.effort) || '').toLowerCase();
    if (re === 'none' || re === 'off' || re === 'disabled' || re === '0') return true;
    var gc = root.generationConfig || bodyObj.generationConfig;
    if (gc && gc.thinkingConfig && typeof gc.thinkingConfig === 'object') {
      if (gc.thinkingConfig.thinkingBudget === 0 || gc.thinkingConfig.includeThoughts === false) return true;
    }
    if (root.thinking && typeof root.thinking === 'object' && String(root.thinking.type || '').toLowerCase() === 'disabled') return true;
    return false;
  } catch (e) { return false; }
}

/* 归类标准报错码（E000 ~ EABT） */
function lkClassifyErrorCode(ev, rec) {
  try {
    var st = Number((rec && rec.status != null ? rec.status : (ev && ev.status)) || 0);
    var code = String((rec && rec.code) || '');
    var errTxt = String((ev && (ev.errBody || ev.errMsg || ev.error)) || (rec && rec.note) || '');
    var trunc = String((rec && rec.trunc) || (ev && ev.__truncCode) || '');

    if (ev && ev.userAborted) return 'EABT';
    if (code === 'blocked' || (ev && (ev.blocked || ev.blockReason))) return 'EBLK';
    if (st === 429 || code === 'quota') return 'E429';
    if ((st === 403 || (st >= 520 && st <= 526)) && /cloudflare|cf-ray|just a moment|attention required|<html/i.test(errTxt)) return 'ECF';
    if (st === 401 || st === 403) return 'E401';
    if (st === 404) return 'E404';
    if (st === 400) {
      if ((ev && ev.tooLong) || (rec && rec.tooLong) || /max[_ ]?output|max_tokens|max_completion|context[_ ]?length|too\s+long|token.*limit/i.test(errTxt)) return 'E400T';
      return 'E400P';
    }
    if (st === 503 || st === 529) return 'E503';
    if (st >= 500 || code === 'gate') return 'E5XX';
    if (st >= 400) return 'E400P';
    if (code === 'error' || (ev && ev.error)) return 'ENET';
    if (code === 'empty') return 'EEMP';
    if (trunc === 'len' || trunc === 'cut' || trunc === 'pause') return 'ECUT';
    return 'E000';
  } catch (e) { return 'E000'; }
}

/* ---------------- 四维硬指纹交叉评估器（核心：抓“无硬证 + 零思考极速倒挂”，零误杀真 4H） ---------------- */

/* V5.91：渠道显式标注的假流式/非流式模型名（单块整吐属站方预期行为，不按掉包误标 V3） */
var LK_FAKE_STREAM_NAME_RE = /(?:假流式|伪流式|非流式|fake[-_ ]?stream|pseudo[-_ ]?stream|non[-_ ]?stream|nostream)/i;

function lkCalcNetCps(chars, totalMs, ttftMs) {
  var c = Number(chars) || 0;
  var tot = Number(totalMs) || 0;
  var tf = Number(ttftMs) || 0;
  if (c <= 0 || tot <= 0) return 0;
  var span = (tf > 0 && tot > tf + 120) ? (tot - tf) : tot;
  if (span <= 0) return 0;
  return Math.round((c * 1000) / span);
}

function lkEvalFingerprint(ev, rec, baseVerdict) {
  var out = {
    grade: 'V0',
    mask: 0,
    hardCount: 0,
    cadenceAlert: false,
    cadenceWhy: '',
    netCps: 0,
    proofs: [],
    warnings: [],
    summary: ''
  };
  try {
    var code = String((baseVerdict && baseVerdict.code) || (rec && rec.code) || 'unknown');
    var req = String((ev && ev.requestedModel) || (rec && rec.req) || '');
    var reqNorm = (typeof normModel === 'function') ? normModel(req) : req.toLowerCase();
    var reqFam = (typeof familyOf === 'function') ? familyOf(reqNorm) : '';
    var proLike = (typeof isProLike === 'function') ? isProLike(reqNorm) : false;
    var fp = (ev && ev.fp) || (rec && rec.fp) || lkNewFp();
    var ch = (ev && ev.ch) || (rec && rec.ch) || { code: 'OFF', hash: '0000' };
    var ver = String((ev && ev.verifiable) || (rec && rec.verifiable) || 'unknown');

    var chars = Number((rec && rec.chars != null ? rec.chars : (ev && (ev.chars || ev.outputChars))) || 0);
    var ttft = Number((rec && rec.ttft != null ? rec.ttft : (ev && ev.firstMs)) || 0);
    var total = Number((rec && rec.total != null ? rec.total : (ev && ev.totalMs)) || 0);
    var thinkTok = Number((ev && (ev.thinkTokens || ev.thoughtTok)) || (rec && rec.capture && rec.capture.thinkTokens) || 0);
    var thinkChars = Number((ev && ev.thinkChars) || (rec && rec.capture && rec.capture.thinkChars) || 0);
    var hasThink = !!(thinkTok > 0 || thinkChars > 0 || (ev && ev.hasThink) || (rec && rec.think === 1));
    var reqThinkOff = !!(ev && ev.reqThinkOff);
    var rawModelNames = String(req || '') + ' ' + String(fp.respModel || '') + ' ' + String(fp.nativeModelVersion || '') + ' ' +
      String((ev && ev.servedModel) || (rec && (rec.served || rec.obs)) || '');
    var declaredFakeStream = LK_FAKE_STREAM_NAME_RE.test(rawModelNames);
    var netCps = (declaredFakeStream && fp.nonStreamDump && total > 0)
      ? Math.round((chars * 1000) / total)
      : lkCalcNetCps(chars, total, ttft);
    out.netCps = netCps;
    out.declaredFakeStream = declaredFakeStream;

    /* 8 项证据位掩码 */
    var hasNativeMV = !!fp.nativeModelVersion;
    var hasThoughtSig = !!fp.hasThoughtSig;
    var hasNativeId = (reqFam === 'google' && (fp.idKind === 'gem_nat' || fp.idKind === 'gem_like')) ||
      (reqFam === 'anthropic' && fp.idKind === 'anth_msg') ||
      (reqFam === 'openai' && fp.idKind === 'oai_cmpl' && !!fp.sysFp) ||
      (!reqFam && (fp.idKind === 'gem_nat' || fp.idKind === 'anth_msg' || !!fp.sysFp));
    var hasNativeUsage = (reqFam === 'google' && fp.usageProto === 'gemini_um') ||
      (reqFam === 'anthropic' && fp.usageProto === 'anth_u') ||
      (reqFam === 'openai' && fp.usageProto === 'oai_u' && !!fp.sysFp) ||
      (!reqFam && (fp.usageProto === 'gemini_um' || fp.usageProto === 'anth_u'));
    var chVerified = (ver === 'yes');
    var chEcho = (ver === 'no');

    var mask = 0;
    if (hasNativeMV) { mask |= 0x01; out.hardCount++; out.proofs.push('原生 modelVersion=' + fp.nativeModelVersion); }
    if (hasThoughtSig) { mask |= 0x02; out.hardCount += 2; out.proofs.push('思考加密签名(thoughtSignature)'); }
    if (hasNativeId) { mask |= 0x04; out.hardCount++; out.proofs.push('原生响应ID(' + fp.idKind + (fp.sysFp ? '/' + fp.sysFp : '') + ')'); }
    if (hasNativeUsage) { mask |= 0x08; out.hardCount++; out.proofs.push('原生用量结构(' + fp.usageProto + ')'); }
    if (hasThink) { mask |= 0x10; out.proofs.push('观测到真实思考(' + (thinkTok > 0 ? (thinkTok + ' tok') : (thinkChars + ' 字')) + ')'); }
    if (chVerified) { mask |= 0x20; out.hardCount++; out.proofs.push('主动探针已验渠'); }
    if (chEcho) { mask |= 0x80; out.warnings.push('探针已确认该渠道仅回显模型名'); }

    /* 非正常/未生成轮次直接给 V0 */
    if (code === 'error' || code === 'quota' || code === 'gate' || code === 'blocked' ||
        code === 'empty' || code === 'skip' || code === 'aux') {
      out.grade = 'V0';
      out.mask = mask;
      out.summary = '非正常生成轮次（' + code + '），不计入真伪定级';
      return out;
    }

    /* 实锤被换/降档/跨族 -> V4 */
    if (code === 'diff') {
      out.grade = 'V4';
      out.mask = mask;
      out.summary = '上游实测模型与请求不符（实锤掉包/错配）';
      return out;
    }

    /* 第三维：思考 × 首字 × 速率 × 伪流式交叉倒挂检测
     * 关键铁律：如果本轮观测到真实思考(hasThink) 或 thoughtSignature(hasThoughtSig)，
     * 即使出字飙到 170+ t/s（如真 gemini-4-hydrogen 投机解码），也绝不判倒挂！ */
    var noHardProof = (!hasThoughtSig && !hasNativeMV && !chVerified && ch.code !== 'OFF');
    var cadenceWhy = '';
    if (!(ev && ev.internal) && chars >= 120) {
      if (proLike && !hasThink && !reqThinkOff && noHardProof) {
        if (ttft > 0 && ttft < 1200 && netCps >= 95) {
          cadenceWhy = '高档模型零思考 + 瞬出(' + (ttft / 1000).toFixed(1) + 's) + 高速(' + netCps + '字/s)且无原生硬指纹';
        } else if (netCps >= 145) {
          cadenceWhy = '高档模型零思考 + 极速(' + netCps + '字/s)且无原生硬指纹';
        } else if (chEcho && ((ttft > 0 && ttft < 1500) || netCps >= 85)) {
          cadenceWhy = '回显渠道 + 高档模型零思考且偏快(' + netCps + '字/s)';
        }
      }
      if (!cadenceWhy && fp.nonStreamDump && noHardProof && !hasThoughtSig && !hasThink && !declaredFakeStream) {
        cadenceWhy = '请求流式却单块整吐 ' + fp.firstTextChunkChars + ' 字，且无原生硬指纹（疑似伪流式代理缓存/替换）';
      }
      if (declaredFakeStream && fp.nonStreamDump) {
        out.proofs.push('通道明标假流式（单块吐字属预期）');
      }
      /* 叠加行为基线/结构指纹（样本达标且非纯网络慢时，在无硬证条件下触发预警） */
      if (!cadenceWhy && noHardProof && rec) {
        try {
          if (typeof baseJudge === 'function') {
            var bj = baseJudge(rec);
            if (bj && (bj.why === 'fast' || bj.why === 'rate' || bj.why === 'think')) {
              cadenceWhy = '行为基线倒挂：' + bj.line;
            }
          }
        } catch (eBj) {}
      }
      if (!cadenceWhy && noHardProof && rec) {
        try {
          if (typeof shapeJudge === 'function') {
            var sj = shapeJudge(rec);
            if (sj && sj.line && !hasThink) {
              cadenceWhy = '回包结构突变：' + sj.line;
            }
          }
        } catch (eSj) {}
      }
    }

    if (cadenceWhy) {
      out.cadenceAlert = true;
      out.cadenceWhy = cadenceWhy;
      mask |= 0x40;
      out.warnings.push(cadenceWhy);
    }
    out.mask = mask;

    /* 定级汇总：V3 > V1 > V2 */
    if (out.cadenceAlert || code === 'thin' || code === 'suspect') {
      out.grade = 'V3';
      out.summary = out.cadenceWhy || (code === 'thin' ? '高档模型本轮零思考，疑似降级或切链' : '触发特征倒挂告警');
      return out;
    }

    if (code === 'same') {
      if (hasThoughtSig ||
          (hasNativeMV && (hasNativeUsage || hasNativeId || ch.code === 'OFF' || ch.code === 'RLP')) ||
          (ch.code === 'OFF' && !chEcho) ||
          (chVerified && !chEcho) ||
          (reqFam === 'anthropic' && hasNativeId && hasNativeUsage)) {
        out.grade = 'V1';
        out.summary = '硬证验真：' + (out.proofs.length ? out.proofs.slice(0, 3).join(' + ') : '官方直连一致');
      } else {
        out.grade = 'V2';
        out.summary = (declaredFakeStream && fp.nonStreamDump)
          ? '通道明标假流式，单块吐字属预期；未采到原生硬指纹（仅名称一致）'
          : '仅名称一致（未采到原生 modelVersion / thoughtSignature 等硬指纹，中转可能仅回显模型名）';
      }
      return out;
    }

    /* unknown / echo：如果带有 thoughtSignature 或原生硬证仍给 V2，否则给 V2(无模型名) */
    out.grade = (hasThoughtSig || hasNativeMV) ? 'V2' : 'V2';
    out.summary = (code === 'echo') ? '渠道仅回显模型名，无可用身份硬证' : '上游未回传模型标识（建议点「真伪探针」复核）';
  } catch (e) {}
  return out;
}

/* ---------------- 模型短码编解码 ---------------- */

function lkEncodeModelShort(name) {
  var raw = String(name == null ? '' : name).trim();
  if (!raw || raw === '—' || raw === '未知') return 'NONE';
  var id = (typeof normModelIdentity === 'function') ? normModelIdentity(raw) : raw.toLowerCase();
  var nm = (typeof normModel === 'function') ? normModel(raw) : raw.toLowerCase();
  for (var i = 0; i < LK_MODEL_CODES.length; i++) {
    var pair = LK_MODEL_CODES[i];
    if (id === pair[1] || nm === pair[1] || nm.indexOf(pair[1]) === 0) return pair[0];
  }
  /* 常见简写兜底 */
  if (/gemini[-_. ]?4[-_. ]?h|4h\b/i.test(nm)) return 'G4H';
  if (/gemini[-_. ]?4[-_. ]?a|4a\b/i.test(nm)) return 'G4A';
  if (/gemini[-_. ]?4[-_. ]?c|4c\b/i.test(nm)) return 'G4C';
  if (/gemini[-_. ]?4[-_. ]?n|4n\b/i.test(nm)) return 'G4N';
  var slug = nm.replace(/[^a-z0-9.]/gi, '').slice(0, 12).toUpperCase();
  return slug ? ('~' + slug) : 'NONE';
}

function lkDecodeModelShort(tok) {
  var t = String(tok || '').trim().toUpperCase();
  if (!t || t === 'NONE') return '未回传';
  for (var i = 0; i < LK_MODEL_CODES.length; i++) {
    if (LK_MODEL_CODES[i][0] === t) return LK_MODEL_CODES[i][1];
  }
  if (t.charAt(0) === '~') return t.slice(1).toLowerCase();
  return t.toLowerCase();
}

/* ---------------- 离线一码通：编码 & 防伪解码 ---------------- */

function lkPlatformLetter() {
  try {
    var p = (typeof PLATFORM !== 'undefined' && PLATFORM) ? String(PLATFORM).toLowerCase() : 'st';
    if (p === 'tt') return 'T';
    if (p === 'desktop') return 'D';
    return 'S';
  } catch (e) { return 'S'; }
}

function lkBuildDiagCode(rec, ev) {
  try {
    var r = rec || null;
    if (!r) {
      var lg = (typeof readLog === 'function') ? (readLog() || []) : [];
      for (var i = 0; i < lg.length; i++) { if (lg[i] && !lg[i].internal) { r = lg[i]; break; } }
      if (!r && lg.length) r = lg[0];
    }
    var ch = (r && r.ch) || (ev && ev.ch) || lkClassifyChannel((typeof lastReq !== 'undefined' && lastReq && lastReq.url) || '', null, null);
    var chSeg = String((ch && ch.code) || 'OFF').slice(0, 3).toUpperCase() + String((ch && ch.hash) || '0000').slice(0, 4).toUpperCase();

    var reqName = (r && r.req) || (ev && ev.requestedModel) || (typeof lastReq !== 'undefined' && lastReq && lastReq.model) || '';
    var obsName = '';
    if (r) {
      var pk = (typeof cardPeek === 'function') ? cardPeek(r) : null;
      obsName = (pk && (pk.nativeModelVersion || pk.modelVersion || pk.model)) || r.served || (r.obs && r.obs !== '—' ? r.obs : '') || '';
    } else if (ev) {
      obsName = (ev.fp && (ev.fp.nativeModelVersion || ev.fp.respModel)) || ev.servedModel || (ev.observed && ev.observed[0]) || '';
    }
    var reqShort = lkEncodeModelShort(reqName);
    var obsShort = obsName ? lkEncodeModelShort(obsName) : 'NONE';
    var modelSeg = (obsShort !== 'NONE' && obsShort === reqShort) ? reqShort : (reqShort + '>' + obsShort);

    var grade = (r && r.fpGrade) || (ev && ev.fpEval && ev.fpEval.grade) || 'V0';
    var maskNum = (r && typeof r.fpMask === 'number') ? r.fpMask : ((ev && ev.fpEval && typeof ev.fpEval.mask === 'number') ? ev.fpEval.mask : 0);
    var hexMask = ('0' + (maskNum & 0xff).toString(16).toUpperCase()).slice(-2);
    var fpSeg = String(grade || 'V0').toUpperCase() + 'F' + hexMask;

    var cp = (r && typeof reportCapture === 'function') ? reportCapture(r) : null;
    var ttftMs = Number((cp && cp.firstContentMs != null) ? cp.firstContentMs : ((r && r.ttft) || (ev && ev.firstMs) || 0));
    var totalMs = Number((cp && cp.totalMs != null) ? cp.totalMs : ((r && r.total) || (ev && ev.totalMs) || 0));
    var chars = Number((cp && cp.bodyChars != null) ? cp.bodyChars : ((r && r.chars) || (ev && ev.outputChars) || 0));
    var netCps = (r && typeof r.netCps === 'number' && r.netCps > 0) ? r.netCps : lkCalcNetCps(chars, totalMs, ttftMs);
    var ttft10 = (isFinite(ttftMs) && ttftMs > 0) ? Math.min(999, Math.round(ttftMs / 100)) : 0;
    var ttftStr = (ttft10 < 10 ? '0' : '') + String(ttft10);
    var rateStr = String(Math.min(999, Math.max(0, Math.round(netCps || 0))));

    var thTok = (cp && cp.thinkTokens != null) ? Number(cp.thinkTokens) : ((ev && ev.thinkTokens) || null);
    var thChr = (cp && cp.thinkChars != null) ? Number(cp.thinkChars) : ((ev && ev.thinkChars) || null);
    var thSeg = 'KU';
    if (thTok != null && isFinite(thTok) && thTok > 0) thSeg = 'K' + Math.max(1, Math.min(999, Math.round(thTok / 100)));
    else if (thChr != null && isFinite(thChr) && thChr > 0) thSeg = 'K' + Math.max(1, Math.min(999, Math.round(thChr / 100)));
    else if ((r && r.think === 0) || thTok === 0 || (ev && ev.usageZeroThink)) thSeg = 'K0';
    else if (r && r.think === 1) thSeg = 'K1';

    var metricSeg = 'T' + ttftStr + 'R' + rateStr + thSeg;
    var errSeg = (r && r.errCode) || lkClassifyErrorCode(ev, r);

    var body = LK_DIAG_VER_CODE + lkPlatformLetter() + '-' + chSeg + '-' + modelSeg + '-' + fpSeg + '-' + metricSeg + '-' + errSeg;
    var crc = lkDiagCrc(body);
    return body + '-' + crc;
  } catch (e) {
    var fb = LK_DIAG_VER_CODE + lkPlatformLetter() + '-OFF0000-NONE-V0F00-T00R0KU-E000';
    return fb + '-' + lkDiagCrc(fb);
  }
}

/* 解码任意 LK77 诊断码（纯离线 + 自动核验防篡改 CRC + 自动匹配本地私有公益站白名单） */
function lkDecodeDiagCode(rawInput) {
  var txt = String(rawInput == null ? '' : rawInput).trim();
  /* 支持从群聊大段文字里自动抠出 LK77 码 */
  var m = /LK\d{2}[STD]-[A-Z]{3}[0-9A-Z]{4}-[^-\s]+-V[0-4]F[0-9A-F]{2}-T\d+R\d+K(?:\d+|U)-E[0-9A-Z]{2,4}-[0-9A-Z]{4}/i.exec(txt);
  var code = (m ? m[0] : txt).toUpperCase();
  var parts = code.split('-');
  if (parts.length !== 7) {
    return { ok: false, tamper: false, error: '诊断码格式不正确（应为 7 段 LK77 码）', raw: code };
  }
  var head = parts[0], chSeg = parts[1], mSeg = parts[2], fpSeg = parts[3], metSeg = parts[4], errSeg = parts[5], crcIn = parts[6];
  var payload = parts.slice(0, 6).join('-');
  var crcExp = lkDiagCrc(payload);
  var crcOk = (crcIn === crcExp);

  var verNum = head.slice(2, 4);
  var platCh = head.charAt(4);
  var platLabel = platCh === 'T' ? 'TT 酒馆' : (platCh === 'D' ? '电脑桌面版' : '手机 ST 酒馆');

  var chCode = chSeg.slice(0, 3);
  var chHash = chSeg.slice(3, 7);
  var chMeta = LK_CH_META[chCode] || { label: '未知通道(' + chCode + ')', short: chCode, color: '#94a3b8', desc: '' };
  var wlHit = lkMatchPubWhitelist(chHash);

  var mParts = mSeg.split('>');
  var reqTok = mParts[0] || 'NONE';
  var obsTok = mParts.length > 1 ? mParts[1] : reqTok;
  var reqModel = lkDecodeModelShort(reqTok);
  var obsModel = lkDecodeModelShort(obsTok);

  var grade = fpSeg.slice(0, 2);
  var mask = parseInt(fpSeg.slice(3, 5), 16);
  if (!isFinite(mask)) mask = 0;
  var gradeMeta = LK_FP_GRADE_META[grade] || LK_FP_GRADE_META.V0;

  var proofs = [];
  if (mask & 0x01) proofs.push('✓ 原生 modelVersion');
  if (mask & 0x02) proofs.push('✓ 思考加密签名 (thoughtSignature)');
  if (mask & 0x04) proofs.push('✓ 厂商原生响应 ID / 系统指纹');
  if (mask & 0x08) proofs.push('✓ 厂商原生 usageMetadata/用量结构');
  if (mask & 0x10) proofs.push('✓ 本轮观测到真实思考');
  if (mask & 0x20) proofs.push('✓ 主动真伪探针验渠通过');
  var flags = [];
  if (mask & 0x40) flags.push('⚠ 触发思考/速率/流式特征倒挂');
  if (mask & 0x80) flags.push('⚠ 渠道仅回显模型名（不校验 model）');

  var mMet = /^T(\d+)R(\d+)K(\d+|U)$/.exec(metSeg);
  var ttftSec = mMet ? (Number(mMet[1]) / 10) : 0;
  var netCps = mMet ? Number(mMet[2]) : 0;
  var thinkDesc = '未上报';
  if (mMet) {
    if (mMet[3] === '0') thinkDesc = '0（无思考）';
    else if (mMet[3] !== 'U') thinkDesc = '约 ' + (Number(mMet[3]) * 100) + ' tok/字';
  }

  var errMeta = LK_ERR_META[errSeg] || { label: errSeg, desc: '未知错误码' };

  var channelVerdict = chMeta.label;
  var channelColor = chMeta.color;
  if (wlHit) {
    channelVerdict = '✅ 已登记公益站 · ' + wlHit.label + '（' + chMeta.short + ' #' + chHash + '）';
    channelColor = '#34d399';
  } else if (chCode === 'RLP' || chCode === 'RLO') {
    channelVerdict = '⚠️ ' + chMeta.label + '（未在本地公益站名单 · 域哈希 #' + chHash + '）';
  } else if (chCode === 'OFF') {
    channelVerdict = '🟢 官方直连（非第三方）';
  } else if (chCode === 'LOC' || chCode === 'SLF') {
    channelVerdict = '🔵 ' + chMeta.label + '（域哈希 #' + chHash + '）';
  } else if (chCode === 'AGG') {
    channelVerdict = '🔷 ' + chMeta.label + '（域哈希 #' + chHash + '）';
  }

  return {
    ok: crcOk,
    tamper: !crcOk,
    error: crcOk ? '' : ('校验码不匹配（收=' + crcIn + ' 应=' + crcExp + '）：该诊断码已被手工篡改或粘贴残缺！'),
    code: code,
    version: '5.' + verNum,
    platform: platLabel,
    chCode: chCode,
    chHash: chHash,
    chMeta: chMeta,
    wlHit: wlHit,
    channelVerdict: channelVerdict,
    channelColor: channelColor,
    reqModel: reqModel,
    obsModel: obsModel,
    obsOmitted: (obsTok === 'NONE'),
    modelMismatch: (obsTok !== 'NONE' && obsTok !== reqTok),
    grade: grade,
    gradeMeta: gradeMeta,
    mask: mask,
    proofs: proofs,
    flags: flags,
    ttftSec: ttftSec,
    netCps: netCps,
    thinkDesc: thinkDesc,
    errCode: errSeg,
    errMeta: errMeta
  };
}

function lkDiagDecodeText(res) {
  if (!res) return '';
  if (!res.ok && !res.tamper) return '❌ ' + res.error;
  var L = [];
  L.push(res.ok ? '【卢克之光 · 一码通解码结果 ✓ 验签通过】' : '【⚠️ 警告：防伪校验失败（可能已被篡改）】');
  if (res.tamper) L.push('异常：' + res.error);
  L.push('诊断码：' + res.code);
  L.push('版本/端：V' + res.version + ' · ' + res.platform);
  L.push('接入通道：' + res.channelVerdict);
  L.push('模型核验：请求 ' + res.reqModel + ' → 实测 ' + res.obsModel + (res.modelMismatch ? '（不符！）' : (res.obsOmitted ? '（渠道未回传）' : '（同名）')));
  L.push('真伪定级：' + res.grade + ' · ' + res.gradeMeta.label + '（' + res.gradeMeta.desc + '）');
  L.push('性能遥测：首字 ' + (res.ttftSec ? (res.ttftSec.toFixed(1) + 's') : '未知') + ' · 净速率 ' + (res.netCps ? (res.netCps + ' 字/s') : '未知') + ' · 思考量 ' + res.thinkDesc);
  L.push('报错归因：' + res.errCode + ' · ' + res.errMeta.label + '（' + res.errMeta.desc + '）');
  L.push('硬证清单：' + (res.proofs.length ? res.proofs.join(' ｜ ') : '无任何厂商原生硬证'));
  if (res.flags.length) L.push('异常告警：' + res.flags.join(' ｜ '));
  return L.join('\n');
}
