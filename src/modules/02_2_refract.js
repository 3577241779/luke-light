/* ===== 2_refract.js ===== */
/* ============================================================================
 * Anti-Route v6.0 → 卢克之光 V5.73 — 2/4 Refraction v2
 * 四轨随机排列组合微扰（W 空白 / L 语篇词 / A 锚点 / R 随机数排列）
 * + 真随机换套（Suite Rotation）+ 预算裁剪 + 块级签名守卫 + 幂等
 * ========================================================================== */

var PROFILE = {
  off:   { tokens: 0,   w: 0, l: 0, a: 0, r: 0, zones: 0 },
  light: { tokens: 24,  w: 3, l: 1, a: 1, r: 1, zones: 1 },
  mid:   { tokens: 64,  w: 6, l: 3, a: 2, r: 2, zones: 2 },
  heavy: { tokens: 108, w: 9, l: 4, a: 2, r: 3, zones: 3 }
};
var HARD_TOKEN_CAP = 120;

var REFRACT_SEQ = 0;
var LAST_REFRACT = null;

var ANCHOR_TOPICS = ['rules', 'context', 'section', 'layout', 'style', 'frame', 'notes', 'spec', 'folio', 'draft', 'chapter', 'margin'];
var ANCHOR_KINDS = ['part', 'block', 'node', 'unit', 'seg', 'item', 'slot', 'chunk', 'slice', 'entry'];
var REFRACT_TAGS = ['ctx', 'ref', 'doc', 'arc', 'idx', 'seg'];
var REFRACT_DOMAINS = ['doc', 'manuscript', 'folio', 'draft', 'ledger', 'sheet', 'archive', 'edition', 'issue', 'record', 'catalog', 'volume'];
var REFRACT_SEPS = [' · ', ' | ', ' / ', ' ; ', ' - '];
var REFRACT_SHELLS = ['slash_hash', 'slash_angle', 'lkr_hash', 'r0_hash', 'tilde_hash', 'html'];
var REFRACT_ALPHABET = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';

/* 语篇连接词（25 组）：零力度变化，绝不碰模态/否定/义务词 */
var DISCOURSE = [
  [/(^|[，。；：！？\n\s])(此外，|另外，|再者，)/g, ['此外，', '另外，', '再者，']],
  [/(^|[，。；：！？\n\s])(因此，|所以，|因而，|由此，)/g, ['因此，', '所以，', '因而，', '由此，']],
  [/(^|[，。；：！？\n\s])(总之，|总的来说，|简言之，|总而言之，)/g, ['总之，', '总的来说，', '简言之，', '总而言之，']],
  [/(^|[，。；：！？\n\s])(例如，|比如，|譬如，|诸如，)/g, ['例如，', '比如，', '譬如，', '诸如，']],
  [/(^|[，。；：！？\n\s])(同时，|与此同时，|同步地，)/g, ['同时，', '与此同时，', '同步地，']],
  [/(^|[，。；：！？\n\s])(换言之，|换句话说，|也就是说，)/g, ['换言之，', '换句话说，', '也就是说，']],
  [/(^|[，。；：！？\n\s])(然而，|不过，|但是，)/g, ['然而，', '不过，', '但是，']],
  [/(^|[，。；：！？\n\s])(其次，|接着，|随后，)/g, ['其次，', '接着，', '随后，']],
  [/(^|[，。；：！？\n\s])(首先，|第一，|起初，)/g, ['首先，', '第一，', '起初，']],
  [/(^|[，。；：！？\n\s])(最后，|最终，|末了，)/g, ['最后，', '最终，', '末了，']],
  [/(^|[，。；：！？\n\s])(具体而言，|具体来说，|详细来看，)/g, ['具体而言，', '具体来说，', '详细来看，']],
  [/(^|[，。；：！？\n\s])(一般而言，|通常来说，|一般来说，)/g, ['一般而言，', '通常来说，', '一般来说，']],
  [/(^|[，。；：！？\n\s])(相应地，|对应地，|据此，)/g, ['相应地，', '对应地，', '据此，']],
  [/(^|[，。；：！？\n\s])(尤其，|特别是，|尤其是，)/g, ['尤其，', '特别是，', '尤其是，']],
  [/(^|[，。；：！？\n\s])(同理，|同样地，|类似地，)/g, ['同理，', '同样地，', '类似地，']],
  [/(^|[，。；：！？\n\s])(在此基础上，|基于此，|在此前提下，)/g, ['在此基础上，', '基于此，', '在此前提下，']],
  [/(\b)(For example,|For instance,)/g, ['For example,', 'For instance,']],
  [/(\b)(Therefore,|Thus,|Hence,|Consequently,)/g, ['Therefore,', 'Thus,', 'Hence,', 'Consequently,']],
  [/(\b)(However,|Nevertheless,|Nonetheless,)/g, ['However,', 'Nevertheless,', 'Nonetheless,']],
  [/(\b)(Furthermore,|Moreover,|Additionally,)/g, ['Furthermore,', 'Moreover,', 'Additionally,']],
  [/(\b)(Meanwhile,|Simultaneously,)/g, ['Meanwhile,', 'Simultaneously,']],
  [/(\b)(In summary,|In brief,|Overall,)/g, ['In summary,', 'In brief,', 'Overall,']],
  [/(\b)(Specifically,|In particular,|Namely,)/g, ['Specifically,', 'In particular,', 'Namely,']],
  [/(\b)(Similarly,|Likewise,)/g, ['Similarly,', 'Likewise,']],
  [/(\b)(In addition,|Besides,)/g, ['In addition,', 'Besides,']]
];

var ANCHOR_STRIP = /(?:^|\n)[ \t]*(?:<!--[ \t]*(?:ctx|ref|doc|arc|idx|seg):[^>]*-->|\[(?:\/\/|lk-r|r[0-9]|~)\]:[ \t]*(?:#|<>)[ \t]*\((?:ctx|ref|doc|arc|idx|seg):[^)]*\))[ \t]*(?=\n|$)/g;
var REFRACT_LINE_RE = /^[ \t]*(?:<!--[ \t]*(?:ctx|ref|doc|arc|idx|seg):[^>]*-->|\[(?:\/\/|lk-r|r[0-9]|~)\]:[ \t]*(?:#|<>)[ \t]*\((?:ctx|ref|doc|arc|idx|seg):[^)]*\))[ \t]*$/;

var W_STRIP_LIST = /^([ \t]*(?:#{1,6}|[-*+]|\d{1,4}[.)]|>))[ \t]{2,}/gm;
var W_STRIP_GAP = /\n[ \t]{1,4}\n/g;

function stripArtifacts(text) {
  if (typeof text !== 'string') return text;

  /* 1) 整行删除锚点与随机数标记（连同它带来的换行），避免首行残留空行 */
  var lines = text.split('\n');
  var kept = [];
  for (var i = 0; i < lines.length; i++) {
    if (REFRACT_LINE_RE.test(lines[i])) continue;
    kept.push(lines[i]);
  }
  var out = kept.join('\n');

  /* 2) 还原空白轨：段落间隙与标题/列表/引用标记后的多余空格回到 1 个 */
  out = out.replace(W_STRIP_GAP, '\n\n').replace(W_STRIP_LIST, '$1 ');
  return out;
}

/* ---------------- 真随机熵源 / 种子 RNG / 洗牌与换套 ---------------- */

function refractEntropy() {
  REFRACT_SEQ = (REFRACT_SEQ + 1) >>> 0;
  var a = 0, b = 0;
  try {
    var cr = (typeof HOST !== 'undefined' && HOST && HOST.crypto) || (typeof crypto !== 'undefined' ? crypto : null);
    if (cr && typeof cr.getRandomValues === 'function') {
      var u = new Uint32Array(2);
      cr.getRandomValues(u);
      a = u[0] >>> 0;
      b = u[1] >>> 0;
    }
  } catch (eC) {}
  if (!a) a = ((Date.now() & 0xffffffff) ^ Math.floor(Math.random() * 0xffffffff)) >>> 0;
  if (!b) b = Math.floor(Math.random() * 0xffffffff) >>> 0;
  var mixed = (a ^ ((b << 13) | (b >>> 19)) ^ (REFRACT_SEQ * 2654435761)) >>> 0;
  return mixed || 0x9e3779b9;
}

function makeRng(seed) {
  var s = (seed >>> 0) || 0x20261101;
  return function () {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

function refractShuffle(arr, rng) {
  var out = arr.slice();
  for (var i = out.length - 1; i > 0; i--) {
    var j = Math.floor(rng() * (i + 1));
    var tmp = out[i]; out[i] = out[j]; out[j] = tmp;
  }
  return out;
}

function refractMakeCode(rng) {
  var r = rng || makeRng(refractEntropy());
  var s = '';
  for (var i = 0; i < 8; i++) {
    if (i === 4) s += '-';
    s += REFRACT_ALPHABET.charAt(Math.floor(r() * REFRACT_ALPHABET.length));
  }
  return s;
}

function refractRollSuite(reason) {
  var code = refractMakeCode(makeRng(refractEntropy()));
  try {
    if (typeof cfg === 'object' && cfg) {
      cfg.refractSeed = code;
      if (typeof saveCfg === 'function') saveCfg();
    }
  } catch (e0) {}
  LAST_REFRACT = {
    suite: code,
    mode: (cfg && cfg.refractMode === 'random') ? 'random' : 'stable',
    level: (cfg && cfg.refract) || 'off',
    zones: 0,
    tracks: { W: 0, L: 0, A: 0, R: 0 },
    added: 0,
    edits: 0,
    reason: String(reason || 'manual'),
    at: Date.now()
  };
  return code;
}

function refractSuiteCode() {
  try {
    if (cfg && cfg.refractMode === 'random') {
      return (LAST_REFRACT && LAST_REFRACT.suite) ? LAST_REFRACT.suite : '随机待生成';
    }
    var seed = String((cfg && cfg.refractSeed) || '').trim();
    if (seed) return seed;
    var derived = hashStr('suite|' + (typeof chatTag === 'function' ? chatTag() : 'chat') + '|' + (typeof saltKey === 'function' ? saltKey('refract') : 'free'));
    return refractMakeCode(makeRng(derived));
  } catch (e) { return 'AUTO'; }
}

function refractStatusLine() {
  var lv = String((cfg && cfg.refract) || 'off');
  if (lv === 'off') return '当前待机：开启后将对系统提示静态区执行四轨随机微扰（空白/语篇词/锚点/随机数排列）。';
  var modeTxt = (cfg && cfg.refractMode === 'random') ? '每轮真随机' : '同套保缓存';
  var autoTxt = (cfg && cfg.refractAutoRotate) ? ' · 异常自动换套' : '';
  var code = refractSuiteCode();
  var tail = '';
  if (LAST_REFRACT && LAST_REFRACT.edits > 0) {
    var t = LAST_REFRACT.tracks || {};
    tail = ' · 上轮 ' + (LAST_REFRACT.zones || 0) + '区 W' + (t.W || 0) + '·L' + (t.L || 0) + '·A' + (t.A || 0) + '·R' + (t.R || 0) + ' (+' + (LAST_REFRACT.added || 0) + 'tok)';
  } else {
    tail = ' · 下轮发送生效';
  }
  return '套号 #' + code + ' · ' + modeTxt + autoTxt + tail;
}

/* ---------------- 块级签名 ---------------- */

function blockSignature(text) {
  var lines = String(text || '').split('\n');
  var h = [0, 0, 0, 0, 0, 0], li = 0, q = 0, tb = 0, fence = 0;
  for (var i = 0; i < lines.length; i++) {
    var ln = lines[i];
    if (!ln.trim()) continue;
    if (REFRACT_LINE_RE.test(ln)) continue;
    if (/^[ \t]*(?:<!--|\[?\/\/\]:[ \t]*#)/.test(ln)) continue;
    var mh = /^[ \t]*(#{1,6})[ \t]+\S/.exec(ln);
    if (mh) { h[mh[1].length - 1]++; continue; }
    if (/^[ \t]*(?:[-+*]|\d{1,4}[.)])[ \t]+\S/.test(ln)) { li++; continue; }
    if (/^[ \t]*>/.test(ln)) { q++; continue; }
    if (/^[ \t]*\|.*\|[ \t]*$/.test(ln)) { tb++; continue; }
    if (/^[ \t]*(?:`{3,}|~{3,})/.test(ln)) { fence++; continue; }
  }
  return h.join(',') + '|' + li + '|' + q + '|' + tb + '|' + fence;
}

/* ---------------- W 轨：块级结构空白（洗牌 + 1~2 空格随机组合） ---------------- */

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
  var order = refractShuffle(sites, rng);
  var picked = [];
  for (var step = 0; step < order.length && picked.length < max; step++) {
    var s = order[step];
    var clash = false;
    for (var k = 0; k < picked.length; k++) if (Math.abs(picked[k].pos - s.pos) < 32) { clash = true; break; }
    if (clash) continue;
    picked.push(s);
  }
  return picked.map(function (s) {
    var pad = rng() < 0.35 ? '  ' : ' ';
    return {
      track: 'W', start: s.pos, end: s.pos,
      text: pad,
      weight: 1
    };
  });
}

/* ---------------- L 轨：语篇连接词洗牌轮换 ---------------- */

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
  var order = refractShuffle(cands, rng);
  var picked = [];
  for (var s = 0; s < order.length && picked.length < max; s++) {
    var c = order[s];
    var clash2 = false;
    for (var p = 0; p < picked.length; p++) if (Math.abs(picked[p].start - c.start) < 52) { clash2 = true; break; }
    if (clash2) continue;
    picked.push(c);
  }
  return picked.map(function (c) {
    return { track: 'L', start: c.start, end: c.end, text: c.text, weight: 1 };
  });
}

/* ---------------- 壳封装（规避 foreignShield 的 <=1 条 HTML 注释约束） ---------------- */

function wrapRefractLine(tag, body, rng, state) {
  var shells = REFRACT_SHELLS.slice();
  if (state && state.htmlUsed >= 1) {
    shells = shells.filter(function (x) { return x !== 'html'; });
  }
  var pick = shells[Math.floor(rng() * shells.length)];
  var payload = tag + ': ' + body;
  if (pick === 'html') {
    if (state) state.htmlUsed++;
    return '<!-- ' + payload + ' -->';
  }
  if (pick === 'slash_angle') return '[//]: <> (' + payload + ')';
  if (pick === 'lkr_hash') return '[lk-r]: # (' + payload + ')';
  if (pick === 'r0_hash') return '[r' + Math.floor(rng() * 10) + ']: # (' + payload + ')';
  if (pick === 'tilde_hash') return '[~]: # (' + payload + ')';
  return '[//]: # (' + payload + ')';
}

/* ---------------- A 轨：块级安全锚点 ---------------- */

function buildAnchor(rng, state) {
  var topic = ANCHOR_TOPICS[Math.floor(rng() * ANCHOR_TOPICS.length)];
  var kind = ANCHOR_KINDS[Math.floor(rng() * ANCHOR_KINDS.length)];
  var hex = Math.floor(rng() * 0xffff).toString(16);
  while (hex.length < 4) hex = '0' + hex;
  var tag = rng() < 0.5 ? 'ctx' : 'ref';
  var sep = rng() < 0.5 ? ' / ' : ' · ';
  return wrapRefractLine(tag, topic + sep + kind + ' ' + hex, rng, state);
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

function planA(text, spans, isHead, max, rng, state) {
  if (max <= 0) return [];
  var sites = findAnchorSites(text, spans);
  var acts = [];
  if (isHead && !isProtected(spans, 0, 1)) {
    var a0 = buildAnchor(rng, state) + '\n';
    acts.push({ track: 'A', start: 0, end: 0, text: a0, weight: estimateTokens(a0) });
    if (max <= 1 || !sites.length) return acts;
  }
  if (!sites.length) return acts;
  var pool = [];
  for (var i = 0; i < sites.length; i++) {
    if (sites[i] >= 4 && sites[i] <= 480) pool.push(sites[i]);
  }
  var cands = refractShuffle(pool.length ? pool : sites, rng);
  var target = cands[0];
  var ins = '\n' + buildAnchor(rng, state);
  acts.push({ track: 'A', start: target, end: target, text: ins, weight: estimateTokens(ins) });
  return acts;
}

/* ---------------- R 轨：高熵随机数排列组合（多槽洗牌 + 多形态编码） ---------------- */

function buildRandomCode(rng) {
  var mode = Math.floor(rng() * 4);
  if (mode === 0) {
    var h1 = Math.floor(rng() * 0xffff).toString(16);
    var h2 = Math.floor(rng() * 0xffff).toString(16);
    while (h1.length < 4) h1 = '0' + h1;
    while (h2.length < 4) h2 = '0' + h2;
    return h1 + h2;
  }
  if (mode === 1) {
    var s = '';
    for (var i = 0; i < 7; i++) s += REFRACT_ALPHABET.charAt(Math.floor(rng() * REFRACT_ALPHABET.length));
    return s;
  }
  if (mode === 2) {
    var n1 = 1000 + Math.floor(rng() * 9000);
    var n2 = 100 + Math.floor(rng() * 900);
    return String(n1) + '-' + String(n2);
  }
  var p = REFRACT_ALPHABET.charAt(Math.floor(rng() * REFRACT_ALPHABET.length));
  var d = Math.floor(rng() * 9) + 1;
  var hx = Math.floor(rng() * 0xfffff).toString(16).toUpperCase();
  while (hx.length < 5) hx = '0' + hx;
  return p + d + '-' + hx;
}

function buildRandomPermLine(rng, state) {
  var tag = REFRACT_TAGS[Math.floor(rng() * REFRACT_TAGS.length)];
  var dom = REFRACT_DOMAINS[Math.floor(rng() * REFRACT_DOMAINS.length)];
  var code = buildRandomCode(rng);
  var revKinds = ['v', 'rev-', 'sec-', 'p.', 'ch-', 'b.'];
  var rev = revKinds[Math.floor(rng() * revKinds.length)] + String(1 + Math.floor(rng() * 99));
  var chkKinds = ['chk:', 'id:', 'sig:', 'no:'];
  var chkVal = Math.floor(rng() * 0xffff).toString(16);
  while (chkVal.length < 4) chkVal = '0' + chkVal;
  var chk = chkKinds[Math.floor(rng() * chkKinds.length)] + chkVal;

  var slots = refractShuffle([dom, code, rev, chk], rng);
  var take = rng() < 0.45 ? 3 : 4;
  var sep = REFRACT_SEPS[Math.floor(rng() * REFRACT_SEPS.length)];
  return wrapRefractLine(tag, slots.slice(0, take).join(sep), rng, state);
}

function planR(text, spans, isHead, max, rng, state) {
  if (max <= 0) return [];
  var acts = [];
  var sites = findAnchorSites(text, spans);
  var usedPos = [];
  function tooClose(pos) {
    for (var i = 0; i < usedPos.length; i++) if (Math.abs(usedPos[i] - pos) < 40) return true;
    return false;
  }

  /* 头部或末尾也可作为安全位点，与段落边界共同参与排列抽选 */
  var pool = [];
  if (!isProtected(spans, 0, 1)) pool.push({ pos: 0, head: true });
  for (var s = 0; s < sites.length; s++) pool.push({ pos: sites[s], head: false });
  if (!isProtected(spans, Math.max(0, text.length - 1), text.length)) pool.push({ pos: text.length, tail: true });

  var shuffled = refractShuffle(pool, rng);
  /* 如果是首区且允许头部插入，优先保证至少一条靠近前部以打散前缀哈希 */
  if (isHead && !isProtected(spans, 0, 1) && rng() < 0.72) {
    var line0 = buildRandomPermLine(rng, state) + '\n';
    acts.push({ track: 'R', start: 0, end: 0, text: line0, weight: estimateTokens(line0) });
    usedPos.push(0);
  }
  for (var k = 0; k < shuffled.length && acts.length < max; k++) {
    var item = shuffled[k];
    if (tooClose(item.pos)) continue;
    var line = buildRandomPermLine(rng, state);
    var ins = item.head ? (line + '\n') : ('\n' + line);
    acts.push({ track: 'R', start: item.pos, end: item.pos, text: ins, weight: estimateTokens(ins) });
    usedPos.push(item.pos);
  }
  return acts;
}

/* ---------------- 应用（四轨随机排列组合 + 预算裁剪 + 签名守卫） ---------------- */

function refractZone(text, opt, rng) {
  var empty = { changed: false, text: text, added: 0, edits: 0, tracks: { W: 0, L: 0, A: 0, R: 0 } };
  var cleaned = stripArtifacts(text);
  if (typeof cleaned !== 'string' || cleaned.replace(/\s/g, '').length < 40) return empty;

  var spans = collectSpans(cleaned);
  if (spans.length === 1 && spans[0][0] === 0 && spans[0][1] >= cleaned.length) return empty;

  var state = { htmlUsed: (cleaned.match(/<!--/g) || []).length };
  var rMax = typeof opt.r === 'number' ? opt.r : 0;
  var budgetCap = (typeof opt.budget === 'number' && opt.budget > 0) ? opt.budget : (typeof opt.tokens === 'number' && opt.tokens > 0 ? opt.tokens : HARD_TOKEN_CAP);

  /* 四轨本身也按随机数洗牌顺序规划，避免固定模板分布 */
  var trackOrder = refractShuffle(['W', 'L', 'A', 'R'], rng);
  var acts = [];
  for (var ti = 0; ti < trackOrder.length; ti++) {
    var tkName = trackOrder[ti];
    if (tkName === 'W' && opt.w > 0) acts = acts.concat(planW(cleaned, spans, opt.w, rng));
    else if (tkName === 'L' && opt.l > 0) acts = acts.concat(planL(cleaned, spans, opt.l, rng));
    else if (tkName === 'A' && opt.a > 0) acts = acts.concat(planA(cleaned, spans, opt.isHead, opt.a, rng, state));
    else if (tkName === 'R' && rMax > 0) acts = acts.concat(planR(cleaned, spans, opt.isHead, rMax, rng, state));
  }
  if (!acts.length) return empty;

  var total = 0;
  for (var i = 0; i < acts.length; i++) total += acts[i].weight;
  while (total > budgetCap && acts.length) {
    var dropA = -1, dropL = -1, dropR = -1, rCnt = 0;
    for (var j = 0; j < acts.length; j++) {
      if (acts[j].track === 'R') { rCnt++; if (dropR < 0) dropR = j; }
      if (acts[j].track === 'A' && dropA < 0) dropA = j;
      if (acts[j].track === 'L' && dropL < 0) dropL = j;
    }
    var di = dropA >= 0 ? dropA : (dropL >= 0 ? dropL : (rCnt > 1 ? dropR : acts.length - 1));
    total -= acts[di].weight;
    acts.splice(di, 1);
  }
  if (!acts.length) return empty;

  acts.sort(function (x, y) { return y.start - x.start || y.end - x.end; });
  var out = cleaned;
  var lastStart = 1e9;
  var applied = 0;
  var tracks = { W: 0, L: 0, A: 0, R: 0 };
  for (var k = 0; k < acts.length; k++) {
    var act = acts[k];
    if (act.end > lastStart) continue;
    if (act.start > 0 && act.start < cleaned.length && isProtected(spans, act.start, act.end)) continue;
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
  var out = { changed: [], desens: false, armor: false, tool: false, canary: false, model: '', base: '', body: rawBody };
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
    var isRand = cfg.refractMode === 'random';
    var seedStr = 'refract|' + normModel(out.model) + '|' + saltKey('refract') + '|' + String(cfg.refractSeed || '') + '|' + refractChatKey(inner);
    var seedNum = isRand ? refractEntropy() : hashStr(seedStr);
    var suiteTag = isRand ? refractMakeCode(makeRng(seedNum >>> 0)) : refractSuiteCode();
    var rng = makeRng(seedNum >>> 0);
    var touched = 0, tk = { W: 0, L: 0, A: 0, R: 0 };
    var budget = Math.min(prof.tokens, HARD_TOKEN_CAP);
    for (var i = 0; i < zones.length; i++) {
      if (budget <= 0) break;
      var before = zones[i].get();
      var res = refractZone(before, {
        w: prof.w, l: prof.l, a: prof.a, r: prof.r, isHead: i === 0, budget: budget
      }, rng);
      if (!res.changed) continue;
      zones[i].set(res.text);
      touched++;
      added += res.added;
      edits += res.edits;
      budget -= res.added;
      tk.W += res.tracks.W; tk.L += res.tracks.L; tk.A += res.tracks.A; tk.R += (res.tracks.R || 0);
    }
    if (touched > 0) {
      LAST_REFRACT = {
        suite: suiteTag,
        mode: isRand ? 'random' : 'stable',
        level: cfg.refract,
        zones: touched,
        tracks: { W: tk.W, L: tk.L, A: tk.A, R: tk.R },
        added: added,
        edits: edits,
        at: Date.now()
      };
      out.changed.push('微扰[' + suiteTag + ']' + touched + '区/W' + tk.W + '·L' + tk.L + '·A' + tk.A + '·R' + tk.R + '/+' + added + 'tok');
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

  var protoWillRun = !origPrefill && (typeof lkProtoEligible === 'function' ? lkProtoEligible(body) : false);
  var wantToolChan = !protoWillRun && !(cfg.allTool === true) && !(cfg.enabled && cfg.grab > 0) && cfg.enabled && cfg.toolChan === 'on' && String(cfg.jailTool || 'off') === 'off';
  var toolWillRun = wantToolChan && !origPrefill && (typeof toolChanEligible === 'function' ? toolChanEligible(body) : true);

  try {
    var tmsgs = (body.request && Array.isArray(body.request.messages)) ? body.request.messages : body.messages;
    if (!toolWillRun && !protoWillRun && typeof truncApply === 'function' && truncApply(tmsgs)) {
      out.changed.push('截断:' + truncLabel(cfg ? cfg.trunc : TRUNC_LIGHT));
    }
  } catch (eTrunc) { criticalWarn('抗截断', eTrunc); }

  if ((cfg.jail === 'supreme' || cfg.jail === 'gatanothor' || cfg.jail === 'abyss') && assistantSnapshot(body) !== assistantBefore) {
    out.changed = []; out.body = rawBody; out.reason = 'assistant-protection'; return out;
  }

  /* v7.1 破甲：放在微扰之后、序列化之前——放前面会被微扰再扰动一遍 */
  var skipForPreset = false;
  var zhEncoded = false;
  if (cfg.enabled) {
    try {
      skipForPreset = (typeof presetCompatForce === 'function' && !presetCompatForce() &&
        typeof lkPresetOwnsJail === 'function' && lkPresetOwnsJail(body));
      /* v5.78：先降权再清洗——先洗会把降权要抓的同类词洗没，归位/下沉几乎 0 命中；
         V6.0 协议化通道自带全量 system→context.world 降权，跳过 lkDemoteBody 避免抽空设定段并污染对话流 */
      if (!protoWillRun) {
        var dmt = lkDemoteBody(body);
        for (var dz0 = 0; dz0 < dmt.length; dz0++) out.changed.push(dmt[dz0]);
      }
      var pch = lkPurifyBody(body);
      for (var pz = 0; pz < pch.length; pz++) out.changed.push(pch[pz]);
      var hst = lkHistoryStrip(body);
      for (var hz0 = 0; hz0 < hst.length; hz0++) out.changed.push(hst[hz0]);
      try { if (lkSingleSection(body)) out.changed.push('单节折叠'); } catch (eSS) {}
      try { if (!toolWillRun && !protoWillRun && lkReceiptInject(body)) out.changed.push('尾句回执'); } catch (eRC) {}
      try { if (lkPrefixStable(body)) out.changed.push('前缀稳定'); } catch (ePS) {}
      /* V6.2 注音层：仅编码自然语言段（受 LK_STRUCT_SAFE_RE 护栏保护），abyss 协议化模式下延迟至协议化后再单次贴注音说明避免 4 倍复制 */
      try {
        if (!skipForPreset && !(cfg.grab > 0) && typeof lkZhuyinApply === 'function') {
          var zhHits = lkZhuyinApply(body, { skipNote: protoWillRun });
          if (zhHits && zhHits.length) {
            zhEncoded = true;
            out.changed.push(zhHits[0]);
          }
        }
      } catch (eZh) {}
      try {
        if (!skipForPreset && typeof lkMarsOn === 'function' && lkMarsOn() && typeof lkMarsBody === 'function') {
          var marsHits = lkMarsBody(body);
          out.armor = true;
          out.mars = true;
          if (marsHits > 0) out.changed.push('火星文 ' + marsHits + ' 处');
        } else if (!skipForPreset && typeof lkArmorOn === 'function' && lkArmorOn()) {
          var arHits = lkArmorApply(body);
          if (arHits > 0) { out.armor = true; out.changed.push('码点护甲 ' + arHits + ' 处'); }
        }
      } catch (eAR) {}
      /* 以上步骤（降权下沉/历史剥离/单节折叠/注音层/码点护甲）属于预期的请求副本整理；
         刷新快照基线后继续用 assistant-protection 守护后续 jailPatchBody / desensPatchBody，
         避免多轮对话在闪耀/加坦杰厄/深渊三档下误触发整包回退。 */
      assistantBefore = assistantSnapshot(body);
    } catch (eWash) { criticalWarn('预设话术中和', eWash); }
  }
  if (!out.armor && typeof LK_ARMOR_BUSY !== 'undefined') LK_ARMOR_BUSY = false;

  var wantTool = !!(cfg.jailTool && cfg.jailTool !== 'off');
  var wantJail = (cfg.jail === 'mid' || cfg.jail === 'strong' || cfg.jail === 'supreme' || cfg.jail === 'gatanothor' || cfg.jail === 'abyss' || cfg.jail === 'only' || (cfg.jail && cfg.jail !== 'off' && cfg.jailWord === true));
  if (cfg.enabled && (wantJail || wantTool)) {
    try {
      var jch = jailPatchBody(body, protoWillRun ? { protoMode: true } : null);
      for (var jz = 0; jz < jch.length; jz++) {
        out.changed.push(jch[jz]);
        if (String(jch[jz]).indexOf('已注入确认回合') >= 0) assistantBefore = assistantSnapshot(body);
      }
    } catch (eJail) { criticalWarn('破甲请求补丁', eJail); }
  }

  /* 3.2.7 设定段脱敏（档 A）：在破甲之后、序列化之前跑；只改 system 段，正文不动 */
  var dawnLiveDs = !!(cfg.allTool === true && !(cfg.grab > 0) && String(cfg.jailTool || 'off') === 'off');
  if (cfg.enabled && cfg.desens === 'a' && (dawnLiveDs || cfg.jail === 'mid' || cfg.jail === 'strong' || cfg.jail === 'supreme' || cfg.jail === 'gatanothor' || cfg.jail === 'abyss')) {
    try {
      var dch = desensPatchBody(body);
      if (dch.length) out.desens = true;
      for (var dz = 0; dz < dch.length; dz++) out.changed.push(dch[dz]);
    } catch (eDs) { criticalWarn('设定脱敏', eDs); }
  }

  /* V6.0 协议化通道（凝视深渊）：在完成清洗与脱敏后直接重写为 soliumbra_reply + context 协议形态，
     完整保留世界书设定、历史时间顺序与本轮真实用户输入 */
  if (protoWillRun && typeof lkProtocolize === 'function') {
    try {
      var protoMeta = { base: out.base };
      var prCh = lkProtocolize(body, protoMeta);
      if (prCh && prCh.length) {
        for (var pz2 = 0; pz2 < prCh.length; pz2++) out.changed.push(prCh[pz2]);
        out.proto = true;
        out.tool = true;
        out.toolBaseKey = String(protoMeta.baseKey || out.base || curBase() || 'default').replace(/\/+$/, '');
        out.toolForcedChoice = !!protoMeta.forcedChoice;
        assistantBefore = assistantSnapshot(body);
      }
    } catch (eProto) { criticalWarn('协议化', eProto); }
  }

  /* V6.2：在协议化之后单次挂载【注音说明】（仅当实际命中编码）与【校验】探针，杜绝 abyss 4 倍复制 */
  if (cfg.enabled && !skipForPreset && !(cfg.grab > 0)) {
    try {
      if (protoWillRun && zhEncoded && typeof lkZhAttachNote === 'function') {
        lkZhAttachNote(body);
      }
    } catch (eZhN) {}
    try {
      if (typeof lkCanaryAttach === 'function' && lkCanaryAttach(body)) {
        out.canary = true;
        out.changed.push('探针 3 枚');
      }
    } catch (eCn) {}
  }

  if (wantToolChan) {
    try {
      var toolMeta = { prefillBlocked: origPrefill, base: out.base, poppedEmptyAsst: false };
      var tch2 = toolChanPatch(body, toolMeta);
      for (var t2 = 0; t2 < tch2.length; t2++) out.changed.push(tch2[t2]);
      out.tool = tch2.join('').indexOf('已发') >= 0;
      if (toolMeta.poppedEmptyAsst || toolMeta.toolLoop) assistantBefore = assistantSnapshot(body);
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

  var preWireChars = rawBody.length;
  if (out.changed.length) {
    try {
      var rawSerialized = JSON.stringify(body);
      try { JAIL_INJ.ver = jailVerify(rawSerialized); } catch (eV) {}
      out.body = rawSerialized;
      preWireChars = rawSerialized.length;
      try {
        if (cfg.enabled && typeof lkWireOn === 'function' && lkWireOn()) {
          var wOut = lkWireApply(out.body);
          if (wOut && wOut !== out.body) {
            out.body = wOut;
            out.changed.push('透明护甲(' + ((typeof lkWireIsAllMode === 'function' && lkWireIsAllMode()) ? '全量' : '词表') + ')');
          }
        }
      } catch (eWA) {}
    }
    catch (eSerialize) { out.body = rawBody; out.changed = []; out.reason = 'serialize-failed'; criticalWarn('请求序列化', eSerialize); }
  } else if (cfg.enabled && typeof lkWireOn === 'function' && lkWireOn()) {
    try {
      var wOnly = lkWireApply(rawBody);
      if (wOnly && wOnly !== rawBody) {
        out.body = wOnly;
        out.changed.push('透明护甲(' + ((typeof lkWireIsAllMode === 'function' && lkWireIsAllMode()) ? '全量' : '词表') + ')');
        try { JAIL_INJ.ver = jailVerify(rawBody); } catch (eV2) {}
      }
    } catch (eWA2) {}
  }
  out.rawChars = rawBody.length;
  out.preWireChars = preWireChars;
  out.sentChars = String(out.body || '').length;
  out.edits = edits;
  out.added = added;
  return out;
}

