/* ===== 2_refract.js ===== */
/* ============================================================================
 * Anti-Route v6.0 — 2/4 Refraction
 * 三轨微扰（W 空白 / L 语篇词 / A 锚点）+ 预算裁剪 + 块级签名守卫 + 幂等
 * ========================================================================== */

var PROFILE = {
  off:   { tokens: 0,  w: 0, l: 0, a: 0, zones: 0 },
  light: { tokens: 18, w: 3, l: 1, a: 1, zones: 1 },
  mid:   { tokens: 56, w: 6, l: 2, a: 2, zones: 2 }
};
var HARD_TOKEN_CAP = 120;

var ANCHOR_TOPICS = ['rules', 'context', 'section', 'layout', 'style', 'frame', 'notes', 'spec'];
var ANCHOR_KINDS = ['part', 'block', 'node', 'unit', 'seg', 'item'];

/* 语篇连接词：零力度变化，绝不碰模态/否定/义务词 */
var DISCOURSE = [
  [/(^|[，。；：！？\n\s])(此外，|另外，)/g, ['此外，', '另外，']],
  [/(^|[，。；：！？\n\s])(因此，|所以，|因而，)/g, ['因此，', '所以，', '因而，']],
  [/(^|[，。；：！？\n\s])(总之，|总的来说，|简言之，)/g, ['总之，', '总的来说，', '简言之，']],
  [/(^|[，。；：！？\n\s])(例如，|比如，|譬如，)/g, ['例如，', '比如，', '譬如，']],
  [/(^|[，。；：！？\n\s])(同时，|与此同时，)/g, ['同时，', '与此同时，']],
  [/(^|[，。；：！？\n\s])(换言之，|换句话说，)/g, ['换言之，', '换句话说，']],
  [/(\b)(For example,)/g, ['For example,', 'For instance,']],
  [/(\b)(Therefore,)/g, ['Therefore,', 'Thus,', 'Hence,']],
  [/(\b)(However,)/g, ['However,', 'Nevertheless,']]
];

var ANCHOR_STRIP = /(?:^|\n)[ \t]*(?:<!--[ \t]*(?:ctx|ref):[^>]*-->|\[\/\/\]:[ \t]*#[ \t]*\((?:ctx|ref):[^)]*\))[ \t]*(?=\n|$)/g;

var W_STRIP_LIST = /^([ \t]*(?:[-*+]|\d+\.|>))[ \t]{2,}/gm;
var W_STRIP_GAP = /\n[ \t]{1,3}\n/g;

function stripArtifacts(text) {
  if (typeof text !== 'string') return text;

  /* 1) 整行删除锚点（连同它带来的换行），避免首行残留空行 */
  var lines = text.split('\n');
  var kept = [];
  for (var i = 0; i < lines.length; i++) {
    if (/^[ \t]*(?:<!--[ \t]*(?:ctx|ref):[^>]*-->|\[\/\/\]:[ \t]*#[ \t]*\((?:ctx|ref):[^)]*\))[ \t]*$/.test(lines[i])) continue;
    kept.push(lines[i]);
  }
  var out = kept.join('\n');

  /* 2) 还原空白轨：段落间隙与列表标记后的多余空格回到 1 个 */
  out = out.replace(W_STRIP_GAP, '\n\n').replace(W_STRIP_LIST, '$1 ');
  return out;
}

/* ---------------- 随机源（seeded LCG，可复现） ---------------- */

function makeRng(seed) {
  var s = (seed >>> 0) || 0x20261101;
  return function () {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

/* ---------------- 块级签名 ---------------- */

function blockSignature(text) {
  var lines = String(text || '').split('\n');
  var h = [0, 0, 0, 0, 0, 0], li = 0, q = 0, tb = 0, fence = 0;
  for (var i = 0; i < lines.length; i++) {
    var ln = lines[i];
    if (!ln.trim()) continue;
    if (/^[ \t]*(?:<!--|\/\/\]:[ \t]*#)/.test(ln)) continue;
    var mh = /^[ \t]*(#{1,6})[ \t]+\S/.exec(ln);
    if (mh) { h[mh[1].length - 1]++; continue; }
    if (/^[ \t]*(?:[-+*]|\d{1,4}[.)])[ \t]+\S/.test(ln)) { li++; continue; }
    if (/^[ \t]*>/.test(ln)) { q++; continue; }
    if (/^[ \t]*\|.*\|[ \t]*$/.test(ln)) { tb++; continue; }
    if (/^[ \t]*(?:`{3,}|~{3,})/.test(ln)) { fence++; continue; }
  }
  return h.join(',') + '|' + li + '|' + q + '|' + tb + '|' + fence;
}

/* ---------------- W 轨：块级结构空白 ---------------- */

function findWSites(text, spans) {
  var sites = [];
  var patterns = [
    /^(#{1,6})([ \t]{1,2})(?=\S)/gm,
    /^([ \t]{0,3}[-+*])([ \t]{1,2})(?=\S)/gm,
    /^([ \t]{0,3}\d{1,4}[.)])([ \t]{1,2})(?=\S)/gm,
    /^([ \t]{0,3}>)([ \t]{1,2})(?=\S)/gm
  ];
  for (var i = 0; i < patterns.length; i++) {
    var re = new RegExp(patterns[i].source, 'gm');
    var m;
    var guard = 0;
    while ((m = re.exec(text)) !== null && guard++ < 500) {
      var pos = m.index + m[1].length + m[2].length;
      if (isProtected(spans, m.index, pos)) continue;
      sites.push({ pos: pos, kind: 'inline' });
    }
  }
  var gapRe = /([^\n>`~|}])\n(\n)(?=\S)/g;
  var gm;
  var g2 = 0;
  while ((gm = gapRe.exec(text)) !== null && g2++ < 500) {
    var gp = gm.index + 1;
    if (isProtected(spans, gp - 1, gp + 2)) continue;
    sites.push({ pos: gp + 1, kind: 'gap' });
  }
  sites.sort(function (a, b) { return a.pos - b.pos; });
  return sites;
}

function planW(text, spans, max, rng) {
  if (max <= 0) return [];
  var sites = findWSites(text, spans);
  if (!sites.length) return [];
  var picked = [];
  var startIdx = Math.floor(rng() * sites.length);
  for (var step = 0; step < sites.length && picked.length < max; step++) {
    var s = sites[(startIdx + step) % sites.length];
    var clash = false;
    for (var k = 0; k < picked.length; k++) if (Math.abs(picked[k].pos - s.pos) < 36) { clash = true; break; }
    if (clash) continue;
    picked.push(s);
  }
  return picked.map(function (s) {
    return {
      track: 'W', start: s.pos, end: s.pos,
      text: s.kind === 'gap' ? ' ' : ' ',
      weight: 1
    };
  });
}

/* ---------------- L 轨：语篇连接词轮换 ---------------- */

function planL(text, spans, max, rng) {
  if (max <= 0) return [];
  var cands = [];
  for (var i = 0; i < DISCOURSE.length; i++) {
    var re = new RegExp(DISCOURSE[i][0].source, DISCOURSE[i][0].flags);
    var alts = DISCOURSE[i][1];
    var m;
    var guard = 0;
    while ((m = re.exec(text)) !== null && guard++ < 200) {
      var lead = m[1] || '';
      var word = m[2] || '';
      if (!word) continue;
      var start = m.index + lead.length;
      var end = start + word.length;
      if (isProtected(spans, start, end)) continue;
      var pool = [];
      for (var a = 0; a < alts.length; a++) if (alts[a] !== word) pool.push(alts[a]);
      if (!pool.length) continue;
      cands.push({ start: start, end: end, text: pool[Math.floor(rng() * pool.length)] });
    }
  }
  if (!cands.length) return [];
  var picked = [];
  var offset = Math.floor(rng() * cands.length);
  for (var s = 0; s < cands.length && picked.length < max; s++) {
    var c = cands[(offset + s) % cands.length];
    var clash2 = false;
    for (var p = 0; p < picked.length; p++) if (Math.abs(picked[p].start - c.start) < 60) { clash2 = true; break; }
    if (clash2) continue;
    picked.push(c);
  }
  return picked.map(function (c) {
    return { track: 'L', start: c.start, end: c.end, text: c.text, weight: 1 };
  });
}

/* ---------------- A 轨：块级安全锚点 ---------------- */

function buildAnchor(rng, html) {
  var topic = ANCHOR_TOPICS[Math.floor(rng() * ANCHOR_TOPICS.length)];
  var kind = ANCHOR_KINDS[Math.floor(rng() * ANCHOR_KINDS.length)];
  var hex = Math.floor(rng() * 0xffff).toString(16);
  while (hex.length < 4) hex = '0' + hex;
  var tag = rng() < 0.5 ? 'ctx' : 'ref';
  return html ? '<!-- ' + tag + ': ' + topic + ' / ' + kind + ' ' + hex + ' -->'
              : '[//]: # (' + tag + ': ' + topic + ' / ' + kind + ' ' + hex + ')';
}

function isBlockLine(line) {
  var s = String(line || '');
  return /^[ \t]{0,3}(?:[-+*]|\d{1,4}[.)])[ \t]+\S/.test(s) ||
         /^[ \t]{0,3}>/.test(s) ||
         /^[ \t]{0,3}\|.*\|[ \t]*$/.test(s) ||
         /^[ \t]{2,}\S/.test(s);
}

function findAnchorSites(text, spans) {
  var out = [];
  var idx = -1;
  var guard = 0;
  while ((idx = text.indexOf('\n', idx + 1)) !== -1 && guard++ < 4000) {
    if (isProtected(spans, idx, idx + 1)) continue;
    var lineStart = text.lastIndexOf('\n', idx - 1) + 1;
    var prevLine = text.slice(lineStart, idx);
    var nextNl = text.indexOf('\n', idx + 1);
    var nextLine = text.slice(idx + 1, nextNl === -1 ? text.length : nextNl);
    var prevTrim = prevLine.replace(/\s+$/, '');
    if (/[:：<{`\\]$/.test(prevTrim)) continue;
    if (isBlockLine(prevLine) && (isBlockLine(nextLine) || !nextLine.trim())) continue;
    var prevHeading = /^[ \t]{0,3}#{1,6}[ \t]+\S/.test(prevLine);
    var nextHeading = /^[ \t]{0,3}#{1,6}[ \t]+\S/.test(nextLine);
    var blankBoundary = !prevTrim && !isBlockLine(nextLine);
    if (prevHeading || nextHeading || blankBoundary) out.push(idx);
  }
  return out;
}

function planA(text, spans, isHead, max, rng) {
  if (max <= 0) return [];
  var sites = findAnchorSites(text, spans);
  var html = rng() < 0.5;
  var acts = [];
  if (isHead && !isProtected(spans, 0, 1)) {
    var a0 = buildAnchor(rng, html) + '\n';
    acts.push({ track: 'A', start: 0, end: 0, text: a0, weight: estimateTokens(a0) });
    return acts;
  }
  if (!sites.length) return acts;
  var pool = [];
  for (var i = 0; i < sites.length; i++) {
    if (sites[i] >= 4 && sites[i] <= 320) pool.push(sites[i]);
  }
  var target = pool.length ? pool[Math.floor(rng() * pool.length)] : sites[0];
  var ins = '\n' + buildAnchor(rng, !html);
  acts.push({ track: 'A', start: target, end: target, text: ins, weight: estimateTokens(ins) });
  return acts;
}

/* ---------------- 应用（含预算裁剪与签名守卫） ---------------- */

function refractZone(text, opt, rng) {
  var empty = { changed: false, text: text, added: 0, edits: 0, tracks: { W: 0, L: 0, A: 0 } };
  var cleaned = stripArtifacts(text);
  if (typeof cleaned !== 'string' || cleaned.replace(/\s/g, '').length < 40) return empty;

  var spans = collectSpans(cleaned);
  if (spans.length === 1 && spans[0][0] === 0 && spans[0][1] >= cleaned.length) return empty;

  var acts = [];
  if (opt.w > 0) acts = acts.concat(planW(cleaned, spans, opt.w, rng));
  if (opt.l > 0) acts = acts.concat(planL(cleaned, spans, opt.l, rng));
  if (opt.a > 0) acts = acts.concat(planA(cleaned, spans, opt.isHead, opt.a, rng));
  if (!acts.length) return empty;

  var total = 0;
  for (var i = 0; i < acts.length; i++) total += acts[i].weight;
  while (total > opt.budget && acts.length) {
    var dropA = -1, dropL = -1;
    for (var j = 0; j < acts.length; j++) {
      if (acts[j].track === 'A' && dropA < 0) dropA = j;
      if (acts[j].track === 'L' && dropL < 0) dropL = j;
    }
    var di = dropA >= 0 ? dropA : (dropL >= 0 ? dropL : acts.length - 1);
    total -= acts[di].weight;
    acts.splice(di, 1);
  }
  if (!acts.length) return empty;

  acts.sort(function (x, y) { return y.start - x.start || y.end - x.end; });
  var out = cleaned;
  var lastStart = 1e9;
  var applied = 0;
  var tracks = { W: 0, L: 0, A: 0 };
  for (var k = 0; k < acts.length; k++) {
    var act = acts[k];
    if (act.end > lastStart) continue;
    if (act.start > 0 && isProtected(spans, act.start, act.end)) continue;
    out = out.slice(0, act.start) + act.text + out.slice(act.end);
    lastStart = act.start;
    applied++;
    tracks[act.track]++;
  }
  if (!applied || out === cleaned) return empty;

  if (blockSignature(cleaned) !== blockSignature(out)) return empty;

  return { changed: true, text: out, added: Math.max(1, Math.ceil(total)), edits: applied, tracks: tracks };
}

/* ---------------- 请求改写 ---------------- */

function textOfMsg(m) {
  if (!m) return '';
  if (typeof m.content === 'string') return m.content;
  if (Array.isArray(m.content)) {
    for (var i = 0; i < m.content.length; i++) {
      if (m.content[i] && m.content[i].type === 'text') return m.content[i].text || '';
    }
  }
  return '';
}

function setMsgText(m, v) {
  if (typeof m.content === 'string') { m.content = v; return; }
  if (Array.isArray(m.content)) {
    for (var i = 0; i < m.content.length; i++) {
      if (m.content[i] && m.content[i].type === 'text') { m.content[i].text = v; return; }
    }
  }
}

function deriveBase(url, body) {
  try {
    var b = (body && body.request && typeof body.request === 'object' && !Array.isArray(body.request)) ? body.request : body;
    var proxy = (body && (body.custom_url || body.reverse_proxy)) || (b && (b.custom_url || b.reverse_proxy));
    if (typeof proxy === 'string' && proxy.trim()) return proxy.trim().replace(/\/+$/, '');
    var u = new URL(url, HOST.location ? HOST.location.href : 'http://localhost');
    var path = u.pathname || '';
    if (path.indexOf('/api/backends/chat-completions') >= 0 || path.indexOf('/api/backends/text-completions') >= 0) {
      var src = String((body && body.chat_completion_source) || (b && b.chat_completion_source) || '').trim().toLowerCase();
      if (src && src !== 'custom') return u.origin + '/st/' + src;
      return u.origin;
    }
    /* 直连 Gemini 原生端点：保留 /v1beta/models/... 之前的网关前缀（如自定义子路径） */
    var mIdx = path.search(/\/v1(?:beta\d*)?\/models\//i);
    if (mIdx >= 0) return (u.origin + path.slice(0, mIdx)).replace(/\/+$/, '');
    var mIdx2 = path.search(/\/models\/[^/?:]+:(?:streamGenerateContent|generateContent)/i);
    if (mIdx2 >= 0) return (u.origin + path.slice(0, mIdx2)).replace(/\/+$/, '');
    /* TT 酒馆 / 前端直连兼容端点：保留 /v1 或 /api/v1 等真实路由前缀，避免 openAIUrl 拼丢子路径报 404 */
    var cleanPath = path.replace(/\/+$/, '').replace(/\/(?:chat\/completions|completions|messages|responses)$/i, '');
    if (cleanPath && cleanPath !== '/') return u.origin + cleanPath;
    return u.origin;
  } catch (e) { return cfg.dualBase || ''; }
}

/* V4.5.2：模型名也可能只出现在 URL 里（Gemini 原生：/v1beta/models/gemini-4-carbon:generateContent） */
function modelFromUrl(u) {
  var s = String(u || "");
  var m = s.match(/\/models\/([A-Za-z0-9._\-]+)(?::|\?|$)/);
  if (m && m[1] && !/^(?:$|generateContent$)/.test(m[1])) return m[1];
  m = s.match(/[?&]model=([^&#]+)/);
  if (m && m[1]) { try { return decodeURIComponent(m[1]); } catch (eD) { return m[1]; } }
  m = s.match(/\/model\/([A-Za-z0-9._\-]+)/);
  if (m && m[1]) return m[1];
  return "";
}
function extractReqModel(body, url) {
  try {
    var b = (body && body.request && typeof body.request === 'object' && !Array.isArray(body.request)) ? body.request : body;
    var cand = [];
    if (b && typeof b === 'object') {
      cand.push(
        b.model, body && body.model,
        b.model_name, body && body.model_name,
        body && body.custom_model, b.custom_model,
        body && body.makersuite_model, b.makersuite_model,
        body && body.google_model, body && body.vertexai_model,
        body && body.claude_model, body && body.openai_model,
        body && body.openrouter_model, body && body.deepseek_model,
        body && body.xai_model, body && body.groq_model,
        body && body.mistralai_model, body && body.cohere_model,
        body && body.perplexity_model, body && body.moonshot_model,
        body && body.siliconflow_model, body && body.nanogpt_model,
        body && body.chutes_model, body && body.ai21_model,
        body && body.api_model
      );
    }
    var fallbackOpaque = '';
    for (var i = 0; i < cand.length; i++) {
      if (typeof cand[i] !== 'string') continue;
      var s = cand[i].trim();
      if (!s) continue;
      if (/^(?:custom|default|auto|none)$/i.test(s)) {
        if (!fallbackOpaque) fallbackOpaque = s;
        continue;
      }
      return s;
    }
    var fromU = modelFromUrl(url);
    if (fromU) return fromU;
    /* ST 后端兜底：从酒馆上下文读取当前激活的模型名 */
    if (/\/api\/backends\//.test(String(url || ''))) {
      try {
        var st = (HOST && HOST.SillyTavern) || (typeof SELF_WIN !== 'undefined' && SELF_WIN && SELF_WIN.SillyTavern);
        var ctx = st && typeof st.getContext === 'function' ? st.getContext() : null;
        if (ctx) {
          if (typeof ctx.getChatCompletionModel === 'function') {
            var cm = String(ctx.getChatCompletionModel() || '').trim();
            if (cm && !/^(?:custom|default|none)$/i.test(cm)) return cm;
          }
          var oai = ctx.chatCompletionSettings;
          if (oai && typeof oai === 'object') {
            var src = String((body && body.chat_completion_source) || oai.chat_completion_source || '').toLowerCase();
            var bySrc = (src === 'custom' && oai.custom_model) ||
              (src === 'makersuite' && (oai.google_model || oai.makersuite_model)) ||
              (src === 'vertexai' && oai.vertexai_model) ||
              (src === 'claude' && oai.claude_model) ||
              (src === 'openai' && oai.openai_model) ||
              (src === 'openrouter' && oai.openrouter_model) ||
              (src === 'deepseek' && oai.deepseek_model) ||
              oai.custom_model || oai.google_model || oai.openai_model || oai.claude_model || '';
            if (bySrc && String(bySrc).trim()) return String(bySrc).trim();
          }
          if (ctx.model && String(ctx.model).trim()) return String(ctx.model).trim();
        }
      } catch (eCtx) {}
    }
    return fallbackOpaque || '';
  } catch (e) { return ''; }
}

function requestRewriteAllowed(body, url) {
  var b = body && body.request && typeof body.request === 'object' && !Array.isArray(body.request) ? body.request : body;
  if (!b || typeof b !== 'object') return false;
  var hasMessages = Array.isArray(b.messages);
  var hasContents = Array.isArray(b.contents) || !!b.systemInstruction;
  var model = extractReqModel(body, url);
  var apiPath = '';
  try { apiPath = String(new URL(url, HOST.location && HOST.location.href || 'http://localhost').pathname || ''); }
  catch (e) { criticalWarn('请求路径识别', e); }
  var providerText = '';
  try {
    if (body.provider && typeof body.provider === 'object' && !Array.isArray(body.provider)) providerText = JSON.stringify(body.provider);
  } catch (eProvider) { criticalWarn('provider识别', eProvider); }
  var knownProvider = /(?:google|gemini|deepseek|openrouter|vertex|fireworks|together|qwen|claude|anthropic|openai|gpt|proxy|pggo|bdgo|aihubmix)/i.test(model) ||
    (hasContents && /(?:generateContent|v1beta)/i.test(apiPath)) ||
    /(?:openrouter|google|deepseek|anthropic|openai)/i.test(providerText);
  if (!knownProvider && /(?:chat\/completions|\/messages|streamGenerateContent|generateContent|completions)/i.test(apiPath)) knownProvider = true;
  if (!knownProvider && cfg && cfg.alias) knownProvider = true;
  return (hasMessages || hasContents) && knownProvider;
}

function criticalWarn(label, err) {
  try { if (HOST && HOST.console && typeof HOST.console.warn === 'function') HOST.console.warn('[AR6] ' + label + ' 失败：', err); } catch (e) {}
}

function planRequest(rawBody, url, internal) {
  var out = { changed: [], desens: false, armor: false, tool: false, model: '', base: '', body: rawBody };
  var edits = 0, added = 0;
  if (!rawBody) return out;
  var body;
  try { body = JSON.parse(rawBody); }
  catch (e) { out.reason = 'invalid-json'; criticalWarn('请求体JSON解析', e); return out; }
  if (!body || typeof body !== 'object' || Array.isArray(body)) return out;

  var assistantBefore = assistantSnapshot(body);
  out.model = extractReqModel(body, url);
  out.base = deriveBase(url, body);
  out.internal = !!internal;
  try { Object.defineProperty(body, '__lkUrl', { value: String(url || ''), configurable: true }); } catch (eUrl) {}

  if (!requestRewriteAllowed(body, url)) {
    out.reason = 'unknown-provider';
    return out;
  }

  /* 内部请求（数据库/填表/静默生成）：body 是结构化协议，别名与微扰都可能毁表 */
  if (internal) {
    if (cfg.pin && !pinSkipFor(body, out.model)) {
      if (Array.isArray(body.models) && body.models.length) { delete body.models; out.changed.push('删models[]'); }
      if (Object.prototype.hasOwnProperty.call(body, 'allow_fallbacks') && body.allow_fallbacks !== false) {
        body.allow_fallbacks = false; out.changed.push('allow_fallbacks=false');
      }
    }
    if (out.changed.length) {
      try { out.body = JSON.stringify(body); }
      catch (eInternal) { out.body = rawBody; out.changed = []; out.reason = 'serialize-failed'; criticalWarn('内部请求序列化', eInternal); }
    }
    out.edits = 0; out.added = 0;
    return out;
  }

  /* L3 别名钉死：非空时把 model 改写成本值 */
  if (cfg.alias) {
    var wantModel = String(cfg.alias);
    if (body.model && String(body.model) !== wantModel) {
      body.model = wantModel;
      out.changed.push('别名→' + wantModel);
      out.model = wantModel;
    }
  }

  if (cfg.pin && !pinSkipFor(body, out.model || (body && body.model))) {
    if (Array.isArray(body.models) && body.models.length) { delete body.models; out.changed.push('删models[]'); }
    if (Object.prototype.hasOwnProperty.call(body, 'allow_fallbacks') && body.allow_fallbacks !== false) {
      body.allow_fallbacks = false; out.changed.push('allow_fallbacks=false');
    }
    if (Object.prototype.hasOwnProperty.call(body, 'openrouter_allow_fallbacks') && body.openrouter_allow_fallbacks !== false) {
      body.openrouter_allow_fallbacks = false; out.changed.push('openrouter_allow_fallbacks=false');
    }
    if (Object.prototype.hasOwnProperty.call(body, 'openrouter_use_fallback') && body.openrouter_use_fallback !== false) {
      body.openrouter_use_fallback = false; out.changed.push('openrouter_use_fallback=false');
    }
    if (body.provider && typeof body.provider === 'object' && !Array.isArray(body.provider) &&
        Object.prototype.hasOwnProperty.call(body.provider, 'allow_fallbacks') && body.provider.allow_fallbacks !== false) {
      body.provider.allow_fallbacks = false; out.changed.push('provider.allow_fallbacks=false');
    }
    if (body.route !== undefined && body.route !== null) { delete body.route; out.changed.push('删route'); }
  }

  /* 3.3.7 思考档：自动 / 低 / 中 / 高（用户自由切换） */
  try {
    var tch = thinkApply(body, out);
    for (var tz = 0; tz < tch.length; tz++) out.changed.push(tch[tz]);
  } catch (eThink) { criticalWarn('思考档', eThink); }

  if (cfg.refract !== 'off') {
    var prof = PROFILE[cfg.refract] || PROFILE.off;
    var inner = body;
    if (body.request && typeof body.request === 'object' && !Array.isArray(body.request)) inner = body.request;
    var zones = pickZones(inner, '', prof.zones);
    var seedStr = 'refract|' + normModel(out.model) + '|' + saltKey('refract') + '|' + String(cfg.refractSeed || '') + '|' + refractChatKey(inner);
    var seedNum = (cfg.refractMode === 'random') ? (Date.now() ^ 0x5f3759df) : hashStr(seedStr);
    var rng = makeRng(seedNum >>> 0);
    var touched = 0, tk = { W: 0, L: 0, A: 0 };
    var budget = Math.min(prof.tokens, HARD_TOKEN_CAP);
    for (var i = 0; i < zones.length; i++) {
      if (budget <= 0) break;
      var before = zones[i].get();
      var res = refractZone(before, {
        w: prof.w, l: prof.l, a: prof.a, isHead: i === 0, budget: budget
      }, rng);
      if (!res.changed) continue;
      zones[i].set(res.text);
      touched++;
      added += res.added;
      edits += res.edits;
      budget -= res.added;
      tk.W += res.tracks.W; tk.L += res.tracks.L; tk.A += res.tracks.A;
    }
    if (touched > 0) {
      out.changed.push('微扰' + touched + '区/W' + tk.W + '·L' + tk.L + '·A' + tk.A + '/+' + added + 'tok');
    }
  }

  /* v8.31 叙述层：防全知 / 去媚。
     放在微扰之后（否则每轮措辞会被空格和连接词扰动，同一份文案两种说法）、
     破甲之前（破甲的「直接写」尾巴必须压在最末尾，那是最强位置）。
     注：这里改的是 JSON.parse 出来的副本，聊天记录一个字节都不动。
     关档时也照样调一次：它的另一个职责是「把上一轮留下的块剥干净」，
     真靠开关判断跳过，遇到带残留块的请求体就永远剥不掉了。整个调用只是两次 indexOf，可忽略。 */
  try {
    var nch = narrApply(body);
    for (var nz = 0; nz < nch.length; nz++) out.changed.push(nch[nz]);
  } catch (eNarr) { criticalWarn('叙述层', eNarr); }

  /* v0.76 反 OOC：紧跟叙述层。
     有 setExtensionPrompt 通道时只写通道（oocApply 返回 true），
     请求体里只保留「剥掉上一轮残留块」这一个动作——两边都塞会重复注入两遍。
     没有通道（老版本酒馆 / 测试环境）才回落到贴末条 user 消息尾部。
     关档时也照调一次：它的另一个职责是把上一轮留下的块剥干净。 */
  try {
    if (typeof oocApply === 'function' && !oocApply()) {
      var och = oocBodyPatch(body);
      for (var oz = 0; oz < och.length; oz++) out.changed.push(och[oz]);
    }
  } catch (eOoc) { criticalWarn('反 OOC', eOoc); }

  /* V5.0/V4.8：预先探测原始消息末尾是否存在非空 assistant 预填，以及武装货舱(toolChan)是否可启用；
     若当前环境不支持武装货舱或带非空预填，则自动回退常规能量续航(truncApply)，绝不两边落空。 */
  var origPrefill = false;
  try {
    var origRoot = (body.request && typeof body.request === 'object' && !Array.isArray(body.request)) ? body.request : body;
    var origMsgs = origRoot && Array.isArray(origRoot.messages) ? origRoot.messages : null;
    if (origMsgs && origMsgs.length) {
      for (var opi = origMsgs.length - 1; opi >= 0; opi--) {
        var opm = origMsgs[opi];
        if (!opm) continue;
        if (opm.role !== 'assistant') break;
        if (String(textOfMsg(opm) || '').trim()) { origPrefill = true; break; }
      }
    }
  } catch (eOpf) { origPrefill = false; }

  var wantToolChan = !(cfg.enabled && cfg.grab > 0) && cfg.enabled && cfg.toolChan === 'on' && String(cfg.jailTool || 'off') === 'off';
  var toolWillRun = wantToolChan && !origPrefill && (typeof toolChanEligible === 'function' ? toolChanEligible(body) : true);

  try {
    var tmsgs = (body.request && Array.isArray(body.request.messages)) ? body.request.messages : body.messages;
    if (!toolWillRun && typeof truncApply === 'function' && truncApply(tmsgs)) {
      out.changed.push('截断:' + truncLabel(cfg ? cfg.trunc : TRUNC_LIGHT));
    }
  } catch (eTrunc) { criticalWarn('抗截断', eTrunc); }

  if ((cfg.jail === 'supreme' || cfg.jail === 'gatanothor' || cfg.jail === 'abyss') && assistantSnapshot(body) !== assistantBefore) {
    out.changed = []; out.body = rawBody; out.reason = 'assistant-protection'; return out;
  }

  /* v7.1 破甲：放在微扰之后、序列化之前——放前面会被微扰再扰动一遍 */
  if (cfg.enabled) {
    try {
      var pch = lkPurifyBody(body);
      for (var pz = 0; pz < pch.length; pz++) out.changed.push(pch[pz]);
      var dmt = lkDemoteBody(body);
      for (var dz0 = 0; dz0 < dmt.length; dz0++) out.changed.push(dmt[dz0]);
      var wch = washPatchBody(body);
      for (var wz = 0; wz < wch.length; wz++) out.changed.push(wch[wz]);
      var hst = lkHistoryStrip(body);
      for (var hz0 = 0; hz0 < hst.length; hz0++) out.changed.push(hst[hz0]);
      try { if (lkSingleSection(body)) out.changed.push('单节折叠'); } catch (eSS) {}
      try { if (!toolWillRun && lkReceiptInject(body)) out.changed.push('尾句回执'); } catch (eRC) {}
      try { if (lkPrefixStable(body)) out.changed.push('前缀稳定'); } catch (ePS) {}
      try {
        var skipArmorForPreset = (typeof presetCompatForce === 'function' && !presetCompatForce() &&
          typeof lkPresetOwnsJail === 'function' && lkPresetOwnsJail(body));
        if (!skipArmorForPreset && typeof lkArmorOn === 'function' && lkArmorOn()) {
          var arHits = lkArmorApply(body);
          if (arHits > 0) { out.armor = true; out.changed.push('码点护甲 ' + arHits + ' 处'); }
        }
      } catch (eAR) {}
      /* 以上四步（降权下沉/历史剥离/单节折叠/码点护甲）属于预期的请求副本整理；
         刷新快照基线后继续用 assistant-protection 守护后续 jailPatchBody / desensPatchBody，
         避免多轮对话在闪耀/加坦杰厄/深渊三档下误触发整包回退。 */
      assistantBefore = assistantSnapshot(body);
    } catch (eWash) { criticalWarn('预设话术中和', eWash); }
  }

  var wantTool = !!(cfg.jailTool && cfg.jailTool !== 'off');
  var wantJail = (cfg.jail === 'mid' || cfg.jail === 'strong' || cfg.jail === 'supreme' || cfg.jail === 'gatanothor' || cfg.jail === 'abyss' || cfg.jail === 'only' || (cfg.jail && cfg.jail !== 'off' && cfg.jailWord === true));
  if (cfg.enabled && (wantJail || wantTool)) {
    try {
      var jch = jailPatchBody(body);
      for (var jz = 0; jz < jch.length; jz++) out.changed.push(jch[jz]);
    } catch (eJail) { criticalWarn('破甲请求补丁', eJail); }
  }

  /* 3.2.7 设定段脱敏（档 A）：在破甲之后、序列化之前跑；只改 system 段，正文不动 */
  if (cfg.enabled && cfg.desens === 'a' && (cfg.jail === 'mid' || cfg.jail === 'strong' || cfg.jail === 'supreme' || cfg.jail === 'gatanothor' || cfg.jail === 'abyss')) {
    try {
      var dch = desensPatchBody(body);
      if (dch.length) out.desens = true;
      for (var dz = 0; dz < dch.length; dz++) out.changed.push(dch[dz]);
    } catch (eDs) { criticalWarn('设定脱敏', eDs); }
  }

  if (wantToolChan) {
    try {
      var toolMeta = { prefillBlocked: origPrefill, base: out.base, poppedEmptyAsst: false };
      var tch2 = toolChanPatch(body, toolMeta);
      for (var t2 = 0; t2 < tch2.length; t2++) out.changed.push(tch2[t2]);
      out.tool = tch2.join('').indexOf('已发') >= 0;
      if (toolMeta.poppedEmptyAsst) assistantBefore = assistantSnapshot(body);
      if (out.tool) {
        out.toolBaseKey = String(toolMeta.baseKey || out.base || curBase() || 'default').replace(/\/+$/, '');
        out.toolForcedChoice = !!toolMeta.forcedChoice;
      }
    } catch (eTool) { criticalWarn('工具通道', eTool); }
  }

  if ((cfg.jail === 'supreme' || cfg.jail === 'gatanothor' || cfg.jail === 'abyss') && assistantSnapshot(body) !== assistantBefore) {
    out.changed=[]; out.body=rawBody; out.reason='assistant-protection'; return out;
  }
  if (cfg.jail === 'supreme' && JAIL_INJ.skip) out.reason='至尊跳过：'+JAIL_INJ.skip;

  /* v7.4：到底钉住了几个 + 有没有别的护盾在同一份请求里注入 */
  try { out.audit = lockAudit(body); } catch (eA) { criticalWarn('锁定审计', eA); }
  try { out.foreign = foreignShield(body); } catch (eF) { criticalWarn('外来护盾', eF); }

  if (out.changed.length) {
    try { out.body = JSON.stringify(body); try { JAIL_INJ.ver = jailVerify(out.body); } catch (eV) {} }
    catch (eSerialize) { out.body = rawBody; out.changed = []; out.reason = 'serialize-failed'; criticalWarn('请求序列化', eSerialize); }
  }
  out.edits = edits;
  out.added = added;
  return out;
}

