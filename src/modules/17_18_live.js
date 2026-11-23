/* ===== 18_live.js ===== */
/* 18_live.js — LIVE 采样（S2 / S3 → V5.7 单一真相源重构）
 *
 * V5.7 核心升级：
 *   1) ar6CreateTagSplitter：跨 SSE 分片有状态通用思考/规划标签状态机，自动兼容各类前缀/后缀自定义思考标签与注释块；
 *   2) ar6CreateToolArgTracker：增量解包 tool_calls / function_call / functionCall / input_json_delta 正文；
 *   3) LIVE 直接消费 capture318Parser 的结构化增量（liveStructDelta / liveStructMeta），
 *      彻底根治 Gemini thought:true、reasoning_details、跨帧 <think> 与载具工具流误判；
 *   4) 修复 liveToken 累计串误累加膨胀，并向采样悬浮窗实时提供模型与路由信号。
 */

var LIVE_BODY_KEYS = ['"text"', '"content"'];
var LIVE_THINK_KEYS = ['"thoughts"', '"reasoning"', '"reasoning_content"', '"thinking"', '"thought"', '"chain_of_thought"'];
var LIVE_TIER_MS = { stall: 3000, idle: 15000, quiet: 90000 };
var LIVE_PUB_MS = 600;
var LIVE_PP_MAX = 65536;
var LIVE_TICK_MS = 1000;

/* 通用推理/思考/规划标签通配规则（不硬编码特定第三方预设名，自动覆盖各类 *_think* / think_* / *_plan* / 中文思考审校标签与注释思考块） */
var AR6_THINK_TAG_SRC = '(?:[a-z0-9_-]{1,20}_)?(?:thinking|think|thought|cot|interleaving|suot|planning|plan|draft|scratchpad|reasoning|reason|tuiyan|review|audit)(?:_[a-z0-9_-]{1,20})?~?|report_[a-z0-9_-]{1,16}~?|[\\u4e00-\\u9fa5]{0,3}(?:思考|推演|规划|审核|审校|草稿|思维链|构思)';
var AR6_BODY_WRAP_RE = /<\/?(?:content|zw)\b[^>]*>/gi;
var AR6_THINK_OPEN_RE = new RegExp('<(' + AR6_THINK_TAG_SRC + ')(?:\\s[^>]*)?>|<!--\\s*(?:run|plan|cot|jp|[a-z]*think[a-z]*)\\b', 'i');
var AR6_THINK_PAIR_RE = new RegExp('<(' + AR6_THINK_TAG_SRC + ')(?:\\s[^>]*)?>([\\s\\S]*?)<\\/\\1\\s*>|<!--\\s*(?:run|plan|cot|jp|[a-z]*think[a-z]*)\\b[\\s\\S]*?-->', 'gi');
var AR6_THINK_UNCLOSED_RE = new RegExp('<(' + AR6_THINK_TAG_SRC + ')(?:\\s[^>]*)?>([\\s\\S]*)$|<!--\\s*(?:run|plan|cot|jp|[a-z]*think[a-z]*)\\b([\\s\\S]*)$', 'i');

/* 跨 SSE 分片有状态标签状态机：实时拆分流式思考与正文，支持半截标签跨帧拼接 */
function ar6CreateTagSplitter() {
  var inTag = '';
  var pending = '';
  var MAX_HOLD = 40;

  function stripWrap(s) {
    return s ? s.replace(AR6_BODY_WRAP_RE, '') : '';
  }

  function findClose(buf, tag) {
    if (tag === '<!--') {
      var ci = buf.indexOf('-->');
      return ci >= 0 ? { idx: ci, end: ci + 3 } : null;
    }
    var escTag = tag.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    var rx = new RegExp('<\\/' + escTag + '\\s*>', 'i');
    var m = rx.exec(buf);
    return m ? { idx: m.index, end: m.index + m[0].length } : null;
  }

  function holdTailIndex(buf, isInside) {
    var lt = buf.lastIndexOf('<');
    if (!isInside) {
      if (lt >= 0 && buf.length - lt <= MAX_HOLD && buf.indexOf('>', lt) < 0) return lt;
      return buf.length;
    }
    if (inTag === '<!--') {
      var d = buf.lastIndexOf('-');
      if (d >= 0 && buf.length - d <= 3) {
        if (buf.slice(d) === '-' || buf.slice(d) === '--') return d;
        if (d > 0 && buf.slice(d - 1) === '--') return d - 1;
      }
      return buf.length;
    }
    if (lt >= 0 && buf.length - lt <= MAX_HOLD && buf.indexOf('>', lt) < 0) return lt;
    return buf.length;
  }

  function step(chunk, isFlush) {
    var outBody = '', outThink = '';
    var buf = pending + String(chunk == null ? '' : chunk);
    pending = '';
    var guard = 0;
    while (buf.length && guard++ < 4000) {
      if (!inTag) {
        var om = AR6_THINK_OPEN_RE.exec(buf);
        if (!om) {
          var cut = isFlush ? buf.length : holdTailIndex(buf, false);
          outBody += stripWrap(buf.slice(0, cut));
          pending = buf.slice(cut);
          break;
        }
        if (om.index > 0) outBody += stripWrap(buf.slice(0, om.index));
        inTag = om[1] ? String(om[1]).toLowerCase() : '<!--';
        buf = buf.slice(om.index + om[0].length);
      } else {
        var cm = findClose(buf, inTag);
        if (!cm) {
          var cut2 = isFlush ? buf.length : holdTailIndex(buf, true);
          outThink += buf.slice(0, cut2);
          pending = buf.slice(cut2);
          break;
        }
        if (cm.idx > 0) outThink += buf.slice(0, cm.idx);
        inTag = '';
        buf = buf.slice(cm.end);
      }
    }
    return { body: outBody, think: outThink, inThink: !!inTag };
  }

  return {
    feed: function (chunk) { return step(chunk, false); },
    flush: function () { return step('', true); },
    inThink: function () { return !!inTag; }
  };
}

var AR6_TOOL_BODY_KEYS = [
  'content', 'story', 'narrative', 'game_content', 'main_text',
  'text', 'output', 'reply', 'body', 'response', 'prose', 'story_text', 'scene'
];

function ar6UnescapeJsonSlice(src, startIdx) {
  var i = startIdx, buf = '', closed = false;
  while (i < src.length) {
    var c = src.charAt(i);
    if (c === '\\') {
      if (i + 1 >= src.length) break;
      var n = src.charAt(i + 1);
      if (n === 'u') {
        if (i + 6 > src.length) break;
        var hex = src.substr(i + 2, 4);
        if (!/^[0-9a-fA-F]{4}$/.test(hex)) break;
        buf += String.fromCharCode(parseInt(hex, 16));
        i += 6; continue;
      }
      var map = { n: '\n', r: '\r', t: '\t', b: '\b', f: '\f', '"': '"', '\\': '\\', '/': '/' };
      buf += (map[n] !== undefined) ? map[n] : n;
      i += 2; continue;
    }
    if (c === '"') { closed = true; break; }
    buf += c; i++;
  }
  return { text: buf, closed: closed };
}

function ar6ExtractToolText(raw) {
  if (!raw) return '';
  var src = String(raw);
  var tr = src.replace(/^\s+/, '');
  if (tr.charAt(0) === '"') {
    var uq = ar6UnescapeJsonSlice(tr, 1);
    if (uq.text) src = uq.text;
  }
  for (var k = 0; k < AR6_TOOL_BODY_KEYS.length; k++) {
    var rx = new RegExp('"' + AR6_TOOL_BODY_KEYS[k] + '"\\s*:\\s*"');
    var m = rx.exec(src);
    if (m) {
      var pulled = ar6UnescapeJsonSlice(src, m.index + m[0].length);
      if (pulled.text) return pulled.text;
    }
  }
  var all = '', rxAny = /"[^"\\]{1,40}"\s*:\s*"/g, m2, g = 0;
  while ((m2 = rxAny.exec(src)) !== null && g++ < 40) {
    var seg = ar6UnescapeJsonSlice(src, m2.index + m2[0].length);
    if (seg.text && seg.text.length >= 16) all += (all ? '\n' : '') + seg.text;
  }
  return all;
}

function ar6ExtractToolObj(obj, depth) {
  if (!obj || depth > 4) return '';
  if (typeof obj === 'string') return obj;
  if (Array.isArray(obj)) {
    var aOut = '';
    for (var i = 0; i < obj.length; i++) {
      var sub = ar6ExtractToolObj(obj[i], depth + 1);
      if (sub) aOut += (aOut ? '\n' : '') + sub;
    }
    return aOut;
  }
  if (typeof obj !== 'object') return '';
  for (var k = 0; k < AR6_TOOL_BODY_KEYS.length; k++) {
    var v = obj[AR6_TOOL_BODY_KEYS[k]];
    if (typeof v === 'string' && v) return v;
  }
  var joined = '';
  for (var kk in obj) {
    if (!Object.prototype.hasOwnProperty.call(obj, kk)) continue;
    var sv = ar6ExtractToolObj(obj[kk], depth + 1);
    if (sv && sv.length >= 16) joined += (joined ? '\n' : '') + sv;
  }
  return joined;
}

function ar6CreateToolArgTracker() {
  var acc = Object.create(null);
  var emitted = Object.create(null);
  return {
    feedStr: function (slotKey, frag) {
      if (typeof frag !== 'string' || !frag) return '';
      var k = String(slotKey || '0');
      acc[k] = (acc[k] || '') + frag;
      var full = ar6ExtractToolText(acc[k]);
      var prev = emitted[k] || 0;
      if (full.length <= prev) return '';
      emitted[k] = full.length;
      return full.slice(prev);
    },
    feedObj: function (slotKey, obj) {
      if (!obj) return '';
      var k = String(slotKey || 'obj0');
      var full = (typeof obj === 'string') ? ar6ExtractToolText(obj) : ar6ExtractToolObj(obj, 0);
      var prev = emitted[k] || 0;
      if (!full || full.length <= prev) return '';
      emitted[k] = full.length;
      return full.slice(prev);
    }
  };
}

var LIVE = {
  on: false, seq: 0, rid: 0, t0: 0,
  requestId: '',
  reqModel: '', servedModel: '', trafficLabel: '正文',
  thinkTokens: 0, outTokens: 0, usageZeroThink: false,
  bytes: 0, firstByteAt: 0, firstThinkAt: 0, firstContentAt: 0,
  struct: { body: 0, think: 0, chunks: 0, toolBody: false },
  peek: { body: 0, think: 0 },
  pp: '',
  poll: { body: 0, think: 0 },
  tok: { body: 0, think: 0 },
  lastTokRaw: '',
  tokSplitter: null,
  src: { tok: 0, peek: 0, poll: 0 },
  lastByteAt: 0, lastContentAt: 0, gapMaxMs: 0, stalls: 0, stallMark: false,
  idleByteMs: 0, idleContentMs: 0, tier: 'live',
  cps: 0, ema: 0,
  plan: { added: 0, edits: 0, ms: 0 },
  timer: null, pubAt: 0, paused: false, last: null
};

function liveSafe() {
  try { return !!(cfg && cfg.safe); } catch (e) { return false; }
}

function liveTierOf(ms) {
  if (ms >= LIVE_TIER_MS.quiet) return 'quiet';
  if (ms >= LIVE_TIER_MS.idle) return 'idle';
  if (ms >= LIVE_TIER_MS.stall) return 'stall';
  return 'live';
}

function liveTierText(t) {
  if (t === 'quiet') return '静默 90s+';
  if (t === 'idle') return '静默 15s+';
  if (t === 'stall') return '静默 3s+';
  return '流式中';
}

function liveCountLiteral(s, at) {
  var i = at + 1, cnt = 0, n = s.length;
  while (i < n) {
    var c = s.charAt(i);
    if (c === '\\') { cnt++; i += 2; continue; }
    if (c === '"') return [cnt, i + 1];
    cnt++; i++;
  }
  return [cnt, n];
}

function liveFindKey(s, from, keys) {
  var best = -1, bestLen = 0;
  for (var i = 0; i < keys.length; i++) {
    var p = s.indexOf(keys[i], from);
    if (p < 0) continue;
    if (best < 0 || p < best) { best = p; bestLen = keys[i].length; }
  }
  if (best < 0) return null;
  return { at: best, len: bestLen };
}

function liveSplitJsonObj(obj, out) {
  if (!obj || typeof obj !== 'object') return;
  if (Array.isArray(obj)) {
    for (var ai = 0; ai < obj.length; ai++) liveSplitJsonObj(obj[ai], out);
    return;
  }
  if (Array.isArray(obj.candidates)) {
    for (var ci = 0; ci < obj.candidates.length; ci++) {
      var parts = obj.candidates[ci] && obj.candidates[ci].content && obj.candidates[ci].content.parts;
      if (!Array.isArray(parts)) continue;
      for (var pi = 0; pi < parts.length; pi++) {
        var pt = parts[pi];
        if (!pt || typeof pt !== 'object') continue;
        if (pt.thought === true) {
          if (typeof pt.text === 'string') out.think += pt.text.length;
        } else if (typeof pt.text === 'string') {
          var tgG = liveTagSplit(pt.text);
          out.body += tgG.body; out.think += tgG.think;
        } else if (pt.functionCall && pt.functionCall.args) {
          var fcTxt = ar6ExtractToolObj(pt.functionCall.args, 0);
          var tgF = liveTagSplit(fcTxt);
          out.body += tgF.body; out.think += tgF.think;
        }
      }
    }
    return;
  }
  if (Array.isArray(obj.choices)) {
    for (var oi = 0; oi < obj.choices.length; oi++) {
      var ch = obj.choices[oi];
      if (!ch || typeof ch !== 'object') continue;
      liveSplitJsonObj(ch.delta || ch.message || ch, out);
    }
    return;
  }
  if (obj.delta && typeof obj.delta === 'object') {
    liveSplitJsonObj(obj.delta, out);
    return;
  }
  if (obj.type === 'thinking_delta' && typeof obj.thinking === 'string') { out.think += obj.thinking.length; return; }
  if (obj.type === 'text_delta' && typeof obj.text === 'string') {
    var tgA = liveTagSplit(obj.text); out.body += tgA.body; out.think += tgA.think; return;
  }
  var rStr = obj.reasoning_content || obj.reasoning || obj.thoughts || obj.thinking || obj.chain_of_thought || '';
  if (typeof rStr === 'string' && rStr) out.think += rStr.length;
  if (Array.isArray(obj.reasoning_details)) {
    for (var ri = 0; ri < obj.reasoning_details.length; ri++) {
      var rd = obj.reasoning_details[ri];
      if (rd && typeof rd === 'object') {
        var rdt = rd.text || rd.summary || rd.content || '';
        if (typeof rdt === 'string') out.think += rdt.length;
      }
    }
  }
  if (typeof obj.thought === 'string' && obj.thought) out.think += obj.thought.length;
  if (typeof obj.content === 'string' && obj.content) {
    var tgC = liveTagSplit(obj.content); out.body += tgC.body; out.think += tgC.think;
  } else if (Array.isArray(obj.content)) {
    for (var ki = 0; ki < obj.content.length; ki++) {
      var cp = obj.content[ki];
      if (!cp || typeof cp !== 'object') continue;
      if (cp.thought === true || cp.type === 'thinking' || cp.type === 'reasoning') {
        out.think += String(cp.thinking || cp.text || '').length;
      } else if (typeof cp.text === 'string') {
        var tgP = liveTagSplit(cp.text); out.body += tgP.body; out.think += tgP.think;
      }
    }
  } else if (typeof obj.text === 'string' && obj.text && obj.thought !== true) {
    var tgT = liveTagSplit(obj.text); out.body += tgT.body; out.think += tgT.think;
  }
  if (Array.isArray(obj.tool_calls)) {
    for (var ti = 0; ti < obj.tool_calls.length; ti++) {
      var fn = obj.tool_calls[ti] && obj.tool_calls[ti].function;
      if (fn && typeof fn.arguments === 'string') {
        var tt = ar6ExtractToolText(fn.arguments);
        var tgTc = liveTagSplit(tt); out.body += tgTc.body; out.think += tgTc.think;
      }
    }
  }
}

function liveSplit(s) {
  var out = { body: 0, think: 0 };
  try {
    var txt = String(s == null ? '' : s);
    var trimmed = txt.trim();
    if (!trimmed) return out;
    var parsedAny = false;
    if (trimmed.indexOf('data:') >= 0) {
      var lines = trimmed.split(/\r?\n/);
      for (var li = 0; li < lines.length; li++) {
        var ln = lines[li].trim();
        if (ln.indexOf('data:') !== 0) continue;
        var pay = ln.slice(5).trim();
        if (!pay || pay === '[DONE]') continue;
        try { liveSplitJsonObj(JSON.parse(pay), out); parsedAny = true; } catch (eJ1) {}
      }
      if (parsedAny) return out;
    } else if (trimmed.charAt(0) === '{' || trimmed.charAt(0) === '[') {
      try { liveSplitJsonObj(JSON.parse(trimmed), out); return out; } catch (eJ2) {}
    }

    var i = 0, guard = 0;
    while (i < txt.length && guard++ < 4000) {
      var b = liveFindKey(txt, i, LIVE_BODY_KEYS);
      var k = liveFindKey(txt, i, LIVE_THINK_KEYS);
      var hit, isThink;
      if (!b && !k) break;
      if (!k || (b && b.at < k.at)) { hit = b; isThink = false; } else { hit = k; isThink = true; }
      var after = hit.at + hit.len;
      while (after < txt.length && /[\s:]/.test(txt.charAt(after))) after++;
      if (after >= txt.length || txt.charAt(after) !== '"') {
        i = after + 1;
        continue;
      }
      var seg = liveCountLiteral(txt, after);
      if (isThink) out.think += seg[0];
      else {
        var bodyTxt = txt.slice(after + 1, Math.max(after + 1, seg[1] - 1));
        var tg = liveTagSplit(bodyTxt);
        out.body += tg.body;
        out.think += tg.think;
      }
      i = seg[1];
    }
  } catch (e) {}
  return out;
}

function liveTagSplit(t) {
  var raw = String(t == null ? '' : t);
  if (!raw) return { body: 0, think: 0 };
  var think = 0;
  AR6_THINK_PAIR_RE.lastIndex = 0;
  var body = raw.replace(AR6_THINK_PAIR_RE, function (m, tag, inner) {
    if (inner != null) think += String(inner).length;
    else think += Math.max(0, m.length - 7);
    return '';
  });
  var um = AR6_THINK_UNCLOSED_RE.exec(body);
  if (um) {
    var uInner = um[2] != null ? um[2] : (um[3] || '');
    think += String(uInner).length;
    body = body.slice(0, um.index);
  }
  body = body.replace(AR6_BODY_WRAP_RE, '');
  return { body: body.length, think: think };
}

function liveBytes(n) {
  try {
    if (!LIVE.on || liveSafe()) return;
    var v = Number(n);
    if (!isFinite(v) || v <= 0) return;
    var t = nowMs();
    LIVE.bytes += v;
    LIVE.src.peek++;
    if (!LIVE.firstByteAt) LIVE.firstByteAt = t;
    LIVE.lastByteAt = t;
    var g = LIVE.lastContentAt ? t - LIVE.lastContentAt : 0;
    if (g > LIVE.gapMaxMs) LIVE.gapMaxMs = g;
  } catch (e) {}
}

function liveStructDelta(reqId, bodyAdd, thinkAdd, via) {
  try {
    if (!LIVE.on || liveSafe()) return;
    if (reqId && LIVE.requestId && reqId !== LIVE.requestId) return;
    var b = Number(bodyAdd) || 0;
    var k = Number(thinkAdd) || 0;
    var t = nowMs();
    LIVE.struct.chunks++;
    if (!LIVE.firstByteAt) LIVE.firstByteAt = t;
    LIVE.lastByteAt = t;
    if (k > 0) {
      LIVE.struct.think += k;
      if (!LIVE.firstThinkAt) LIVE.firstThinkAt = t;
      LIVE.lastContentAt = t;
    }
    if (b > 0) {
      LIVE.struct.body += b;
      if (via === 'tool') LIVE.struct.toolBody = true;
      if (!LIVE.firstContentAt) LIVE.firstContentAt = t;
      LIVE.lastContentAt = t;
    }
  } catch (e) {}
}

function liveStructMeta(reqId, meta) {
  try {
    if (!LIVE.on || liveSafe() || !meta) return;
    if (reqId && LIVE.requestId && reqId !== LIVE.requestId) return;
    if (meta.servedModel) LIVE.servedModel = String(meta.servedModel);
    if (typeof meta.thinkTokens === 'number' && meta.thinkTokens > LIVE.thinkTokens) LIVE.thinkTokens = meta.thinkTokens;
    if (typeof meta.outTokens === 'number' && meta.outTokens > LIVE.outTokens) LIVE.outTokens = meta.outTokens;
    if (meta.usageZeroThink === true && !LIVE.struct.think && !LIVE.thinkTokens) LIVE.usageZeroThink = true;
    else if (LIVE.struct.think > 0 || LIVE.thinkTokens > 0) LIVE.usageZeroThink = false;
  } catch (e) {}
}

function liveIsWholeJson(s) {
  var t = String(s == null ? '' : s).trim();
  if (!t) return false;
  if (t.charAt(0) === 'd' && /^data:/.test(t)) {
    var lines = t.split('\n'), out = [];
    for (var i = 0; i < lines.length; i++) {
      var ln = lines[i];
      if (/^data:/.test(ln)) out.push(ln.slice(5).replace(/^\s+/, ''));
      else if (ln.trim() === '' || ln.charAt(0) === ':') continue;
      else out.push(ln);
    }
    t = out.join('');
  }
  try { JSON.parse(t); return true; } catch (e) { return false; }
}

function liveFeedEvent(text) {
  var s = String(text == null ? '' : text);
  if (!s) return;
  var sp = liveSplit(s);
  if (sp.body > 0 || sp.think > 0) {
    var t = nowMs();
    if (sp.think > 0 && !LIVE.firstThinkAt) LIVE.firstThinkAt = t;
    if (sp.body > 0 && !LIVE.firstContentAt) LIVE.firstContentAt = t;
    LIVE.lastContentAt = t;
  }
  LIVE.peek.body += sp.body;
  LIVE.peek.think += sp.think;
}

function livePeekChunk(piece) {
  try {
    if (!LIVE.on || liveSafe()) return;
    if (LIVE.struct.chunks > 0) return;
    var s = String(piece == null ? '' : piece);
    if (!s) return;
    var buf = String(LIVE.pp || '') + s;
    var cut = buf.lastIndexOf('\n\n');
    if (cut >= 0) {
      var head = buf.slice(0, cut);
      LIVE.pp = buf.slice(cut + 2);
      var parts = head.split('\n\n');
      for (var i = 0; i < parts.length; i++) if (parts[i]) liveFeedEvent(parts[i]);
    } else {
      LIVE.pp = buf;
    }
    var rest = String(LIVE.pp || '');
    if (!rest) return;
    if (liveIsWholeJson(rest) || rest.length > LIVE_PP_MAX) {
      LIVE.pp = '';
      liveFeedEvent(rest);
    }
  } catch (e) {}
}

function liveToken(data) {
  try {
    if (!LIVE.on || liveSafe()) return;
    var t = nowMs();
    LIVE.src.tok++;
    if (!LIVE.firstByteAt) LIVE.firstByteAt = t;
    LIVE.lastByteAt = t;
    var s = (typeof data === 'string') ? data : '';
    if (!s && data && typeof data === 'object') {
      s = String(data.token || data.text || data.chunk || '');
    }
    if (!s) return;
    if (LIVE.struct.chunks > 0) return;
    var prevRaw = LIVE.lastTokRaw || '';
    var isCumulative = prevRaw.length >= 4 && s.length >= prevRaw.length && s.indexOf(prevRaw) === 0;
    if (isCumulative) {
      var spCum = liveTagSplit(s);
      LIVE.tok.body = spCum.body;
      LIVE.tok.think = spCum.think;
      LIVE.lastTokRaw = s;
      if (spCum.think > 0 && !LIVE.firstThinkAt) LIVE.firstThinkAt = t;
      if (spCum.body > 0) {
        if (!LIVE.firstContentAt) LIVE.firstContentAt = t;
        LIVE.lastContentAt = t;
      }
      return;
    }
    if (!LIVE.tokSplitter) LIVE.tokSplitter = ar6CreateTagSplitter();
    if (!prevRaw) LIVE.lastTokRaw = s;
    var piece = LIVE.tokSplitter.feed(s);
    LIVE.tok.body += piece.body.length;
    LIVE.tok.think += piece.think.length;
    if (piece.think.length > 0 && !LIVE.firstThinkAt) LIVE.firstThinkAt = t;
    if (piece.body.length > 0) {
      if (!LIVE.firstContentAt) LIVE.firstContentAt = t;
      LIVE.lastContentAt = t;
    }
  } catch (e) {}
}

function livePoll(mes, reason) {
  try {
    if (!LIVE.on || liveSafe()) return;
    var body = liveTagSplit(mes);
    var think = String(reason == null ? '' : reason);
    var b = body.body, k = body.think + think.length;
    if (b > LIVE.poll.body) LIVE.poll.body = b;
    if (k > LIVE.poll.think) LIVE.poll.think = k;
    LIVE.src.poll++;
    if (k > 0 && !LIVE.firstThinkAt) LIVE.firstThinkAt = nowMs();
    if (b > 0 || k > 0) {
      var t = nowMs();
      if (b > 0 && !LIVE.firstContentAt) LIVE.firstContentAt = t;
      LIVE.lastContentAt = t;
    }
  } catch (e) {}
}

function liveTotals() {
  if (LIVE.struct && LIVE.struct.chunks > 0) {
    var sb = LIVE.struct.body;
    var sk = Math.max(LIVE.struct.think, LIVE.poll.think);
    if (sb === 0 && LIVE.poll.body > 0 && !LIVE.struct.think) sb = LIVE.poll.body;
    return { body: sb, think: sk };
  }
  return {
    body: Math.max(LIVE.peek.body, LIVE.poll.body, LIVE.tok.body),
    think: Math.max(LIVE.peek.think, LIVE.poll.think, LIVE.tok.think)
  };
}

function liveSnapshot() {
  var t = nowMs();
  var tot = liveTotals();
  var t0 = LIVE.t0 || t;
  var totalMs = LIVE.on ? Math.max(1, t - t0) : (LIVE.last ? LIVE.last.totalMs : 0);
  var ttft = LIVE.firstByteAt ? Math.max(1, LIVE.firstByteAt - t0) : 0;
  var ttt = LIVE.firstThinkAt ? Math.max(1, LIVE.firstThinkAt - t0) : 0;
  var ttc = LIVE.firstContentAt ? Math.max(1, LIVE.firstContentAt - t0) : 0;
  var idleB = LIVE.lastByteAt ? Math.max(0, t - LIVE.lastByteAt) : LIVE.idleByteMs;
  var idleC = LIVE.lastContentAt ? Math.max(0, t - LIVE.lastContentAt) : LIVE.idleContentMs;
  if (LIVE.on && !LIVE.lastByteAt) idleB = Math.max(0, t - t0);
  if (LIVE.on && !LIVE.lastContentAt) idleC = Math.max(0, t - t0);
  var reqM = LIVE.reqModel || '';
  var srvM = LIVE.servedModel || '';
  var mismatch = !!(reqM && srvM && typeof normModelName === 'function' && normModelName(reqM) !== normModelName(srvM));
  var zeroThinkWarn = !!(reqM && typeof isProLike === 'function' && isProLike(normModel(reqM)) &&
    tot.body >= 120 && tot.think === 0 && LIVE.thinkTokens === 0);
  return {
    on: LIVE.on, running: LIVE.on && !!LIVE.timer, rid: LIVE.rid,
    reqModel: reqM, servedModel: srvM, trafficLabel: LIVE.trafficLabel || '正文',
    modelMismatch: mismatch, zeroThinkWarn: zeroThinkWarn,
    toolBody: !!(LIVE.struct && LIVE.struct.toolBody),
    structActive: !!(LIVE.struct && LIVE.struct.chunks > 0),
    thinkTokens: LIVE.thinkTokens || 0, outTokens: LIVE.outTokens || 0,
    src: { tok: LIVE.src.tok, peek: LIVE.src.peek, poll: LIVE.src.poll },
    bodyChars: tot.body, thinkChars: tot.think, bytes: LIVE.bytes,
    ttftMs: ttft, tttMs: ttt, ttcMs: ttc, totalMs: totalMs,
    cps: LIVE.cps, ema: LIVE.ema,
    idleByteMs: idleB, idleContentMs: idleC, gapMaxMs: LIVE.gapMaxMs, stalls: LIVE.stalls,
    tier: LIVE.tier, tierText: liveTierText(LIVE.tier),
    plan: { added: LIVE.plan.added, edits: LIVE.plan.edits, ms: LIVE.plan.ms }
  };
}

function liveCps() {
  try {
    var tot = liveTotals();
    if (!LIVE.firstContentAt || !tot.body) return 0;
    var sec = Math.max(0.25, (nowMs() - LIVE.firstContentAt) / 1000);
    return Math.round((tot.body / sec) * 10) / 10;
  } catch (e) { return 0; }
}

function liveTick() {
  if (!LIVE.on) return false;
  var t = nowMs(), t0 = LIVE.t0 || t;
  LIVE.idleByteMs = LIVE.lastByteAt ? Math.max(0, t - LIVE.lastByteAt) : Math.max(0, t - t0);
  LIVE.idleContentMs = LIVE.lastContentAt ? Math.max(0, t - LIVE.lastContentAt) : Math.max(0, t - t0);
  var g = Math.max(LIVE.idleByteMs, LIVE.idleContentMs);
  if (g > LIVE.gapMaxMs) LIVE.gapMaxMs = g;
  if (LIVE.idleContentMs >= LIVE_TIER_MS.stall) {
    if (!LIVE.stallMark) { LIVE.stalls++; LIVE.stallMark = true; }
  } else LIVE.stallMark = false;
  LIVE.tier = liveTierOf(LIVE.idleContentMs);
  var cps = liveCps();
  LIVE.cps = cps;
  if (cps > 0) LIVE.ema = LIVE.ema ? Math.round((LIVE.ema * 0.7 + cps * 0.3) * 10) / 10 : cps;
  livePublish(true);
  return true;
}

function liveStartTimer() {
  try {
    if (DISPOSED || LIVE.timer) return false;
    if (!LIVE.on) return false;
    if (!(Number(inflight) > 0)) return false;
    LIVE.timer = setInterval(function () {
      try {
        if (DISPOSED || !LIVE.on) { liveStopTimer(); return; }
        if (DOC && DOC.hidden) return;
        liveTick();
      } catch (e) {}
    }, LIVE_TICK_MS);
    return true;
  } catch (e) { return false; }
}

function liveStopTimer() {
  try { if (LIVE.timer) clearInterval(LIVE.timer); } catch (e) {}
  LIVE.timer = null;
}

function livePublish(force) {
  try {
    if (DISPOSED || liveSafe()) return false;
    if (!LIVE.on && !force) return false;
    var t = nowMs();
    if (!force && LIVE.pubAt && t - LIVE.pubAt < LIVE_PUB_MS) return false;
    LIVE.pubAt = t;
    if (typeof paintLogWinLive === 'function') paintLogWinLive();
    try {
      var r = DOC && DOC.getElementById(ROOT_ID);
      if (r && !minimized && typeof paintSections === 'function') paintSections(['head'], false);
    } catch (eH) {}
    return true;
  } catch (e) { return false; }
}

function liveStart(t0, plan) {
  try {
    if (DISPOSED || liveSafe()) return false;
    liveStopTimer();
    var now = Number(t0) || nowMs();
    LIVE.on = true;
    LIVE.seq++;
    LIVE.rid = LIVE.seq;
    LIVE.t0 = now;
    LIVE.requestId = String((plan && plan.requestId) || '');
    LIVE.reqModel = String((plan && plan.reqModel) || '');
    LIVE.servedModel = '';
    LIVE.trafficLabel = String((plan && plan.trafficLabel) || '正文');
    LIVE.thinkTokens = 0;
    LIVE.outTokens = 0;
    LIVE.usageZeroThink = false;
    LIVE.bytes = 0;
    LIVE.firstByteAt = 0;
    LIVE.firstThinkAt = 0;
    LIVE.firstContentAt = 0;
    LIVE.struct = { body: 0, think: 0, chunks: 0, toolBody: false };
    LIVE.peek = { body: 0, think: 0 };
    LIVE.pp = '';
    LIVE.poll = { body: 0, think: 0 };
    LIVE.tok = { body: 0, think: 0 };
    LIVE.lastTokRaw = '';
    LIVE.tokSplitter = ar6CreateTagSplitter();
    LIVE.src = { tok: 0, peek: 0, poll: 0 };
    LIVE.lastByteAt = 0;
    LIVE.lastContentAt = 0;
    LIVE.gapMaxMs = 0;
    LIVE.stalls = 0;
    LIVE.stallMark = false;
    LIVE.idleByteMs = 0;
    LIVE.idleContentMs = 0;
    LIVE.tier = 'live';
    LIVE.cps = 0;
    LIVE.ema = 0;
    LIVE.plan = {
      added: Number(plan && plan.added) || 0,
      edits: Number(plan && plan.edits) || 0,
      ms: Number(plan && plan.ms) || 0
    };
    LIVE.pubAt = 0;
    liveStartTimer();
    livePublish(true);
    return true;
  } catch (e) { return false; }
}

function liveFinish() {
  try {
    if (!LIVE.on) return null;
    if (LIVE.pp && !(LIVE.struct && LIVE.struct.chunks > 0)) {
      var tail = LIVE.pp;
      LIVE.pp = '';
      liveFeedEvent(tail);
    }
    if (LIVE.tokSplitter && !(LIVE.struct && LIVE.struct.chunks > 0)) {
      var tf = LIVE.tokSplitter.flush();
      LIVE.tok.body += tf.body.length;
      LIVE.tok.think += tf.think.length;
    }
    var snap = liveSnapshot();
    LIVE.last = snap;
    LIVE.on = false;
    liveStopTimer();
    livePublish(true);
    try { if (typeof paintLogWin === 'function' && LOGW && LOGW.open) paintLogWin(true); } catch (eW) {}
    return snap;
  } catch (e) { LIVE.on = false; liveStopTimer(); return null; }
}

function liveReset() {
  try {
    liveStopTimer();
    LIVE.on = false;
    LIVE.last = null;
    LIVE.requestId = '';
    LIVE.reqModel = '';
    LIVE.servedModel = '';
    LIVE.trafficLabel = '正文';
    LIVE.thinkTokens = 0;
    LIVE.outTokens = 0;
    LIVE.usageZeroThink = false;
    LIVE.bytes = 0;
    LIVE.firstByteAt = 0;
    LIVE.firstThinkAt = 0;
    LIVE.firstContentAt = 0;
    LIVE.struct = { body: 0, think: 0, chunks: 0, toolBody: false };
    LIVE.peek = { body: 0, think: 0 };
    LIVE.pp = '';
    LIVE.poll = { body: 0, think: 0 };
    LIVE.tok = { body: 0, think: 0 };
    LIVE.lastTokRaw = '';
    LIVE.tokSplitter = null;
    LIVE.src = { tok: 0, peek: 0, poll: 0 };
    LIVE.lastByteAt = 0;
    LIVE.lastContentAt = 0;
    LIVE.gapMaxMs = 0;
    LIVE.stalls = 0;
    LIVE.stallMark = false;
    LIVE.idleByteMs = 0;
    LIVE.idleContentMs = 0;
    LIVE.tier = 'live';
    LIVE.cps = 0;
    LIVE.ema = 0;
    LIVE.plan = { added: 0, edits: 0, ms: 0 };
  } catch (e) {}
}
