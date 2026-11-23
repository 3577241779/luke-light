/* ===== 18_live.js ===== */
/* 18_live.js — LIVE 采样（S2 / S3）
 *
 * 目的：这一轮跑得怎么样（首字多久、正文/思考各多少字、卡了多久、注入了多少）
 * 就在面板/日志窗口里看到，不用等落库、不去接管响应流。
 *
 * 三条来源合流，谁先到算谁的，互不覆盖：
 *   1) 宿主事件 stream_token_received —— 只有「又来了一个 token」这个事实（快）；
 *   2) peekBody 的 clone 读循环        —— 字节数、原始片段（准，但不是每条都开）；
 *   3) startWatcher 的 150ms 轮询      —— chat.mes 的正文/思维链分档（最贴近肉眼）。
 *
 * 纪律（和护栏一致）：
 *   · 只存内存：不写 localStorage、不进 pushLog 的记录、不进导出结构；
 *   · safe 模式完全不采样；不起第二个定时器；文档隐藏时停表；
 *   · inflight 归零后不再 publish（没人看的东西不刷新）。
 */

var LIVE_BODY_KEYS = ['"text"', '"content"'];
var LIVE_THINK_KEYS = ['"thoughts"', '"reasoning"', '"reasoning_content"', '"thinking"', '"thought"', '"chain_of_thought"'];
var LIVE_TIER_MS = { stall: 3000, idle: 15000, quiet: 90000 };
var LIVE_PUB_MS = 600;      /* publish 节流 */
var LIVE_PP_MAX = 65536;    /* v3.1.1：peek 事件缓冲上限 64KB，爆了就结算，绝不憋死 */
var LIVE_TICK_MS = 1000;    /* 秒表 */

var LIVE = {
  on: false, seq: 0, rid: 0, t0: 0,
  bytes: 0, firstByteAt: 0, firstContentAt: 0,
  peek: { body: 0, think: 0 },      /* 响应体旁观 */
  pp: '',                            /* v3.1.1：按事件边界攒 peek 片段，整事件再喂 liveSplit */
  poll: { body: 0, think: 0 },      /* 聊天轮询 */
  tok: { body: 0, think: 0 },       /* 流事件（只有宿主给文本时才算字） */
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

/* 读一个 JSON 字符串字面量的字符数：s[at] 必须是开引号 */
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

/* 纯函数：把一段 SSE / JSON 片段拆成「正文」与「思考」两部分。
   只在 text/content 记正文；thoughts/reasoning/thinking 等变体一律进思考，
   不重复计入正文字数（S2 要求：剔除 thinking 变体）。 */
function liveSplit(s) {
  var out = { body: 0, think: 0 };
  try {
    var txt = String(s == null ? '' : s);
    var i = 0, guard = 0;
    while (i < txt.length && guard++ < 4000) {
      var b = liveFindKey(txt, i, LIVE_BODY_KEYS);
      var k = liveFindKey(txt, i, LIVE_THINK_KEYS);
      var hit, isThink;
      if (!b && !k) break;
      if (!k || (b && b.at < k.at)) { hit = b; isThink = false; } else { hit = k; isThink = true; }
      var q = txt.indexOf('"', hit.at + hit.len);
      if (q < 0) break;
      var seg = liveCountLiteral(txt, q);
      if (isThink) out.think += seg[0];
      else {
        var bodyTxt = txt.slice(q + 1, Math.max(q + 1, seg[1] - 1));
        var tg = liveTagSplit(bodyTxt);
        out.body += tg.body;
        out.think += tg.think;
      }
      i = seg[1];
    }
  } catch (e) {}
  return out;
}

/* 纯函数：把正文里的 <thinking>/<think>/<interleaving>/<SUOT> 段剥到思考侧 */
function liveTagSplit(t) {
  var raw = String(t == null ? '' : t);
  var think = 0;
  var body = raw.replace(/<(thinking|think|interleaving|SUOT)\b[^>]*>([\s\S]*?)<\/\1\s*>/gi, function (m, tag, inner) {
    think += String(inner || '').length;
    return '';
  });
  return { body: body.length, think: think };
}

function liveBytes(n) {
  try {
    var v = Number(n);
    if (!LIVE.on || liveSafe() || !isFinite(v) || v <= 0) return;
    var t = nowMs();
    LIVE.bytes += v;
    LIVE.src.peek++;
    if (!LIVE.firstByteAt) LIVE.firstByteAt = t;
    LIVE.lastByteAt = t;
    var g = LIVE.lastContentAt ? t - LIVE.lastContentAt : 0;
    if (g > LIVE.gapMaxMs) LIVE.gapMaxMs = g;
  } catch (e) {}
}

/* v3.1.1：响应体是流式的，一次 peek 可能只拿到半条 SSE。
   先按 '\n\n' 事件边界攒齐再喂 liveSplit：半截 JSON 里的 "content":"甲 会被当成正文，
   下一片又把同一段数一遍——字数就是这么虚高的。缓冲上限 64KB。 */
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
    if (!LIVE.firstContentAt) LIVE.firstContentAt = t;
    LIVE.lastContentAt = t;
  }
  LIVE.peek.body += sp.body;
  LIVE.peek.think += sp.think;
}

function livePeekChunk(piece) {
  try {
    if (!LIVE.on || liveSafe()) return;
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
    /* 非流式 / 末尾没有空行：能整段解析就当场结算，别把真值扣在缓冲里 */
    if (liveIsWholeJson(rest) || rest.length > LIVE_PP_MAX) {
      LIVE.pp = '';
      liveFeedEvent(rest);
    }
  } catch (e) {}
}

/* 流事件：只当时间戳用；宿主真的带了 token 文本时才算字 */
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
    var sp = liveSplit(s);
    if (!sp.body && !sp.think) sp = liveTagSplit(s);
    LIVE.tok.body += sp.body;
    LIVE.tok.think += sp.think;
    if (sp.body > 0) {
      if (!LIVE.firstContentAt) LIVE.firstContentAt = t;
      LIVE.lastContentAt = t;
    }
  } catch (e) {}
}

/* 轮询：chat.mes 的正文 + extra.reasoning 的思维链 */
function livePoll(mes, reason) {
  try {
    if (!LIVE.on || liveSafe()) return;
    var body = liveTagSplit(mes);
    var think = String(reason == null ? '' : reason);
    var b = body.body, k = body.think + think.length;
    if (b > LIVE.poll.body) LIVE.poll.body = b;
    if (k > LIVE.poll.think) LIVE.poll.think = k;
    LIVE.src.poll++;
    if (b > 0 || k > 0) {
      var t = nowMs();
      if (!LIVE.firstContentAt) LIVE.firstContentAt = t;
      LIVE.lastContentAt = t;
    }
  } catch (e) {}
}

function liveTotals() {
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
  var ttc = LIVE.firstContentAt ? Math.max(1, LIVE.firstContentAt - t0) : 0;
  var idleB = LIVE.lastByteAt ? Math.max(0, t - LIVE.lastByteAt) : LIVE.idleByteMs;
  var idleC = LIVE.lastContentAt ? Math.max(0, t - LIVE.lastContentAt) : LIVE.idleContentMs;
  if (LIVE.on && !LIVE.lastByteAt) idleB = Math.max(0, t - t0);
  if (LIVE.on && !LIVE.lastContentAt) idleC = Math.max(0, t - t0);
  return {
    on: LIVE.on, running: LIVE.on && !!LIVE.timer, rid: LIVE.rid,
    src: { tok: LIVE.src.tok, peek: LIVE.src.peek, poll: LIVE.src.poll },
    bodyChars: tot.body, thinkChars: tot.think, bytes: LIVE.bytes,
    ttftMs: ttft, ttcMs: ttc, totalMs: totalMs,
    cps: LIVE.cps, ema: LIVE.ema,
    idleByteMs: idleB, idleContentMs: idleC, gapMaxMs: LIVE.gapMaxMs, stalls: LIVE.stalls,
    tier: LIVE.tier, tierText: liveTierText(LIVE.tier),
    plan: { added: LIVE.plan.added, edits: LIVE.plan.edits, ms: LIVE.plan.ms }
  };
}

function liveCps() {
  try {
    var tot = liveTotals();
    if (!LIVE.firstContentAt) return 0;
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

/* 秒表：只在 inflight>0 且文档可见时跑 */
function liveStartTimer() {
  try {
    if (DISPOSED || LIVE.timer) return false;
    if (!LIVE.on) return false;
    if (!(Number(inflight) > 0)) return false;
    LIVE.timer = setInterval(function () {
      try {
        if (DISPOSED || !LIVE.on) { liveStopTimer(); return; }
        if (DOC && DOC.hidden) return;   /* 后台停表，回来继续 */
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
    var t = nowMs();
    if (!force && t - LIVE.pubAt < LIVE_PUB_MS) return false;
    LIVE.pubAt = t;
    if (typeof paintLogWinLive === 'function') paintLogWinLive();
    /* 日志窗口关着的时候，主面板头部给一个「采集中 N s」的活体反馈：
       每秒只重画头部这一小块（S1 的定点补丁），不碰正文。 */
    try {
      if (typeof LOGW !== 'undefined' && !LOGW.open && LIVE.on && typeof paintSections === 'function') {
        var sec = Math.round(liveSnapshot().totalMs / 1000);
        if (sec !== LIVE.__sec) { LIVE.__sec = sec; paintSections(['head'], false); }
      }
    } catch (eH) {}
    return true;
  } catch (e) { return false; }
}

function liveStart(startAt, plan) {
  try {
    if (liveSafe()) { LIVE.on = false; liveStopTimer(); return false; }
    LIVE.seq++;
    LIVE.on = true;
    LIVE.rid = 0;
    LIVE.t0 = Number(startAt) || nowMs();
    LIVE.bytes = 0;
    LIVE.firstByteAt = 0; LIVE.firstContentAt = 0;
    LIVE.peek = { body: 0, think: 0 };
    LIVE.pp = '';
    LIVE.poll = { body: 0, think: 0 };
    LIVE.tok = { body: 0, think: 0 };
    LIVE.src = { tok: 0, peek: 0, poll: 0 };
    LIVE.lastByteAt = 0; LIVE.lastContentAt = 0;
    LIVE.gapMaxMs = 0; LIVE.stalls = 0; LIVE.stallMark = false;
    LIVE.idleByteMs = 0; LIVE.idleContentMs = 0; LIVE.tier = 'live';
    LIVE.cps = 0; LIVE.ema = 0;
    LIVE.plan = {
      added: Number(plan && plan.added) || 0,
      edits: Number(plan && plan.edits) || 0,
      ms: Number(plan && plan.ms) || 0
    };
    LIVE.pubAt = 0;
    LIVE.__sec = -1;
    liveBindVisibility();
    liveStartTimer();
    livePublish(true);
    return true;
  } catch (e) { return false; }
}

function liveFinish() {
  try {
    if (!LIVE.on) return false;
    LIVE.idleByteMs = LIVE.lastByteAt ? Math.max(0, nowMs() - LIVE.lastByteAt) : Math.max(0, nowMs() - (LIVE.t0 || nowMs()));
    LIVE.idleContentMs = LIVE.lastContentAt ? Math.max(0, nowMs() - LIVE.lastContentAt) : Math.max(0, nowMs() - (LIVE.t0 || nowMs()));
    LIVE.on = false;
    liveStopTimer();
    LIVE.last = liveSnapshot();
    livePublish(true);
    try { if (typeof LOGW !== 'undefined' && LOGW && LOGW.open) paintLogWin(true); } catch (eP) {}
    return true;
  } catch (e) { return false; }
}

function liveDispose() {
  try {
    liveStopTimer();
    LIVE.on = false;
  } catch (e) {}
}

/* 文档可见性：隐藏即停表（S3），回来再续 */
var LIVE_VIS_BOUND = false;
var LIVE_VIS_HANDLER = null;
function liveBindVisibility() {
  if (LIVE_VIS_BOUND) return;
  try {
    if (!DOC || typeof DOC.addEventListener !== 'function') return;
    LIVE_VIS_HANDLER = function () {
      try {
        if (DISPOSED) return;
        if (DOC.hidden) { liveStopTimer(); livePublish(true); }
        else if (LIVE.on) { liveStartTimer(); livePublish(true); }
      } catch (e) {}
    };
    DOC.addEventListener('visibilitychange', LIVE_VIS_HANDLER);
    LIVE_VIS_BOUND = true;
  } catch (e) {}
}
function liveUnbindVisibility() {
  try {
    if (DOC && LIVE_VIS_HANDLER) DOC.removeEventListener('visibilitychange', LIVE_VIS_HANDLER);
  } catch (e) {}
  LIVE_VIS_HANDLER = null;
  LIVE_VIS_BOUND = false;
}


