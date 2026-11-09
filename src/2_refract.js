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
    if (body && typeof body.reverse_proxy === 'string' && body.reverse_proxy) return body.reverse_proxy.replace(/\/+$/, '');
    var u = new URL(url, HOST.location ? HOST.location.href : 'http://localhost');
    var path = u.pathname;
    var cut = path.indexOf('/api/backends/chat-completions');
    if (cut >= 0) return u.origin;
    return u.origin;
  } catch (e) { return cfg.dualBase || ''; }
}

function planRequest(rawBody, url, internal) {
  var out = { changed: [], model: '', base: '', body: rawBody };
  var edits = 0, added = 0;
  if (!rawBody) return out;
  var body;
  try { body = JSON.parse(rawBody); } catch (e) { return out; }
  if (!body || typeof body !== 'object' || Array.isArray(body)) return out;

  out.model = String(body.model || body.model_name || '');
  out.base = deriveBase(url, body);
  out.internal = !!internal;

  /* 内部请求（数据库/填表/静默生成）：body 是结构化协议，别名与微扰都可能毁表 */
  if (internal) {
    if (cfg.pin) {
      if (Array.isArray(body.models) && body.models.length) { delete body.models; out.changed.push('删models[]'); }
      if (Object.prototype.hasOwnProperty.call(body, 'allow_fallbacks') && body.allow_fallbacks !== false) {
        body.allow_fallbacks = false; out.changed.push('allow_fallbacks=false');
      }
    }
    if (out.changed.length) out.body = JSON.stringify(body);
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

  if (cfg.pin) {
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

  if (cfg.think === 'high') {
    var hasThink = body.thinking !== undefined || body.thinkingConfig !== undefined || body.reasoning_effort !== undefined;
    if (!hasThink) { body.reasoning_effort = 'high'; out.changed.push('reasoning_effort=high'); }
  }

  if (cfg.refract !== 'off') {
    var prof = PROFILE[cfg.refract] || PROFILE.off;
    var inner = body;
    if (body.request && typeof body.request === 'object' && !Array.isArray(body.request)) inner = body.request;
    var zones = pickZones(inner, '', prof.zones);
    var seedStr = String(out.base || '') + '|' + normModel(out.model) + '|' + saltKey('refract') + '|' + String(cfg.refractSeed || '');
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
  } catch (eNarr) {}

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
  } catch (eOoc) {}

  /* v0.7 抗截断（事前注入）：叙述之后、破甲之前。
     顺序：微扰 → 叙述 → 截断 → 破甲 → 序列化；破甲的「直接写」必须压在最末尾。
     关档 / 预设已经自带同类指令时 truncApply 返回 false，这里什么都不做，请求一个字节都不变。
     ★ 必须把改动报给 out.changed：下面只在这个数组非空时才 JSON.stringify 回去，
       裸调一次会让注入的块留在内存里、白写一轮。 */
  try {
    var tmsgs = (body.request && Array.isArray(body.request.messages)) ? body.request.messages : body.messages;
    if (typeof truncApply === 'function' && truncApply(tmsgs)) {
      out.changed.push('截断:' + truncLabel(cfg ? cfg.trunc : TRUNC_LIGHT));
    }
  } catch (eTrunc) {}

  /* v7.1 破甲（强力档）：放在微扰之后、序列化之前——放前面会被微扰再扰动一遍 */
  if (cfg.enabled && cfg.jail === 'strong') {
    try {
      var jch = jailPatchBody(body);
      for (var jz = 0; jz < jch.length; jz++) out.changed.push(jch[jz]);
    } catch (eJail) {}
  }

  /* v7.4：到底钉住了几个 + 有没有别的护盾在同一份请求里注入 */
  try { out.audit = lockAudit(body); } catch (eA) {}
  try { out.foreign = foreignShield(body); } catch (eF) {}

  /* 关键：只要动过 body，就必须序列化回去；否则钉参数只改了内存对象 */
  if (out.changed.length) out.body = JSON.stringify(body);

  out.edits = edits;
  out.added = added;
  return out;
}
