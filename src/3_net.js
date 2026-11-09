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
  return /\/chat-completions\/generate\b/.test(String(u || ''));
}

/* ---------------- 证据与判定 ---------------- */

/* 已下线的 Gemini 型号：这类名字只可能是「请求标签」或网关回显，不能当身份证据 */
/* 只匹配「真的退役/不可用」的旧名（1.0 / 1.5 时代 + pro-vision + 早期 -001/-002 快照）。
   2.0 / 2.5 现在是主力在役模型，不能当退役处理——那会让「只有聊天标签」的降档判成 unknown。 */
var RETIRED_MODEL_RE = /gemini[\s._-]?(?:1\.0|1\.5)[\s._-]?(?:pro|flash|ultra)|gemini-pro-vision|(?:pro|flash)-00[12]/i;

var PEEK_SEQ = 0;
var PEEKS = {};

/* 内部请求：数据库/填表等插件用自带标记发起的生成请求，不写聊天产物 */
var INTERNAL_FETCH_KEY = (typeof Symbol === 'function' && Symbol.for) ? Symbol.for('acu.internal-generation-fetch') : null;

function isInternalRequest(init, bodyObj) {
  try {
    if (init && INTERNAL_FETCH_KEY && init[INTERNAL_FETCH_KEY] === true) return true;
  } catch (e0) {}
  try {
    var msgs = bodyObj && bodyObj.messages;
    if (!Array.isArray(msgs) || !msgs.length) return false;
    /* v8.29：正常的酒馆生成请求一定带 type（normal/swipe/quiet…）；插件自己拼的 body 没有 */
    if (bodyObj.type) return false;
    if (msgs.length > 2) return false;
    for (var i = 0; i < msgs.length; i++) {
      if (String((msgs[i] && msgs[i].role) || '') === 'assistant') return false;
    }
    /* 光看条数会把「首轮 system+user」误判成内部请求，那样永远读不到正文。
       必须再有证据说明它走的是自带渠道：custom 渠道 + 反代地址。 */
    if (String(bodyObj.chat_completion_source || '') !== 'custom') return false;
    if (!bodyObj.reverse_proxy) return false;
    return true;
  } catch (e1) { return false; }
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
  /* v8.29：内部请求（数据库/填表）本来就不写聊天产物 ⇒ 没读到正文不等于空回 */
  if (!ev.sawText && ev.internal) {
    return { code: 'unknown', note: '内部请求（数据库或填表）：没有聊天产物，不判空回', conf: 'C' };
  }
  if (!ev.sawText) {
    if (ev.emptyConfirmed) return { code: 'empty', note: '响应体与聊天都没有正文（确认空回）', conf: 'C' };
    return { code: 'empty', note: '没读到正文（响应体未取到，旁路取样可能关闭）', conf: 'C' };
  }

  /* v0.13：到这里才看范围——空回/错误/拦截属于「回复没了」，跟哪个模型无关，先判；
     「有没有被换」才是模型相关的，模型不在范围内就只留一条灰记录 */
  /* v0.100 修 D3：旧的范围（scope/scopeList）只看请求名，会把「请求名写 deepseek、
     实际后端是 gemini」的轮次直接否决掉，导致 onlyGemini 的证据扩宽永远跑不到。
     onlyGemini 打开时，范围完全交给下面的 scopeHitGemini（请求名 + 证据）；关掉时才用它。 */
  /* 显式「跳过列表」仍然算数（那是用户手动点名不要查的）；只有「只查某几个」
     在 onlyGemini 打开时让位——那种组合会把 Gemini 自己也排除掉。 */
  if (!cfg || !cfg.onlyGemini || String(cfg.scope) === 'skip') {
    var sc = scopeMatch(ev.requestedModel);
    if (sc === 'out') {
      return { code: 'skip', note: '不在检测范围（' + scopeLabel() + '）', conf: 'C' };
    }
  }
  /* v0.100 只查 Gemini：范围外的请求不判定，只留一行灰记录（空回/错误已经在上面判过了）。
     v0.100 修：原来只看「请求名」。反代常给同一个渠道换名字（比如请求名写 gpt-4o、
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
      if (!ev.internal && isProLike(a) && !ev.hasThink && channelSeesThinking(a)) {
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
  /* 聊天记录没提交（或提交慢了）时，别急着说"没有正文"：
     响应体里明明有文本就先等它落地，再用它兜底。 */
  /* v0.12：内部请求不取体，也就没有 PEEKS 可等——以前这里会空转 6 秒才落记录 */
  /* v0.100 修 D2：只查 Gemini 时，范围判定要靠响应体证据。正文已经出了、但 peek 还没读完时，
     如果现在按「请求名不是 google」收尾，就会把真 Gemini（反代换了名字）判成 skip，
     而且 peek 晚到的证据不会再触发重判。这里让这种情况下也等 peek。 */
  var needScopePeek = false;
  try {
    if (cfg && cfg.onlyGemini && !ev.internal) {
      var pk1 = PEEKS[ev.rid];
      needScopePeek = !(pk1 && pk1.done) && !scopeHitGemini(ev);
    }
  } catch (eSP) { needScopePeek = false; }
  if ((!ev.sawText || needScopePeek) && ev.status === 200 && ev.rid && !ev.internal) {
    var pk0 = PEEKS[ev.rid];
    if (!ev.__peekAt) ev.__peekAt = nowMs();
    var waited = nowMs() - ev.__peekAt;
    /* 一路等它落地：流式结束与 peek 读完不同步，单次 900ms 常不够 */
    if ((!pk0 || !pk0.done) && waited < 6000) {
      ev.__peekDefer = (ev.__peekDefer || 0) + 1;
      setTimeout(function () { try { finish(ev, meta); } catch (eD) {} }, 700);
      return null;
    }
    if (pk0 && pk0.hasText) {
      ev.sawText = true;
      ev.bodyText = true;
      if (!ev.outputChars || ev.outputChars < pk0.textChars) ev.outputChars = pk0.textChars;
    } else if (pk0 && pk0.done) {
      /* 响应体也读完了、确实没字：这才是真空回 */
      ev.emptyConfirmed = true;
    }
  }
  /* v0.100 检查范围：默认只查 Gemini。别的家族照常发、照常回，
     不判定（verdictOf 里直接返回 skip）、不建基线，但破甲 / 抗截断 / 反 OOC 不受影响。 */
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
  /* 回显渠道：名字对不上不能当「被换」的证据，降到「回显」 */
  if (rec.code === 'diff' && rec.verifiable === 'no') {
    rec.code = 'echo';
    rec.verdict = '回显';
    rec.note = '这个渠道会回显你的模型名，名字对不上不能当证据';
  }
  try { ledAdd(rec); } catch (eLed) {}
  pushLog(rec);
  /* v0.82 行为基线：记录落库后补一条样本（关闸 / 内部请求 / 字太少时自己跳过） */
  try { basePush(rec); } catch (eBase) {}
  /* v0.84 结构指纹：只记响应体结构，被换 / 无思考的轮次自己跳过 */
  try { shapePush(rec); } catch (eShape) {}
  render();
  var kind = (VERDICT[v.code] || VERDICT.unknown).color;
  if (v.code === 'diff' || v.code === 'blocked' || v.code === 'gate') {
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
  /* v7.3：判定为「被换 / 无思考」时自动弹证据卡（1.6s 后，等响应体取样落地） */
  try {
    if (cfg.cardAuto && (v.code === 'diff' || v.code === 'thin')) {
      setTimeout(function () {
        try {
          /* v8.0.3：破甲确认框 / 已打开的卡优先，别把用户手上的东西顶掉 */
          if (CARD && CARD.open) return;
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
    if (typeof res.clone !== 'function') return;
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

function absorbPeek(text, rid, ev) {
  try {
    var s = String(text || '');
    if (!s) return;
    /* 头部放正文、尾部放 usage：只切头部会把最后一帧的 token 统计整段丢掉 */
    if (s.length > 420000) s = s.slice(0, 300000) + '\n' + s.slice(-120000);
    var hasUsage = /"(?:thoughtsTokenCount|reasoning_tokens|candidatesTokenCount|promptTokenCount)"/.test(s);
    var pick = function (re) { var m = re.exec(s); return m ? m[1] : ''; };
    var mv = pick(/"(?:modelVersion)"\s*:\s*"([^"]{1,80})"/);
    var md = pick(/"model"\s*:\s*"([^"]{1,80})"/);
    var tt = pick(/"thoughtsTokenCount"\s*:\s*(\d+)/);
    var rt = pick(/"reasoning_tokens"\s*:\s*(\d+)/);
    var ct = pick(/"candidatesTokenCount"\s*:\s*(\d+)/);
    var pt = pick(/"promptTokenCount"\s*:\s*(\d+)/);
    var fin = pick(/"finishReason"\s*:\s*"([A-Z_]+)"/) || pick(/"finish_reason"\s*:\s*"([a-z_]+)"/);
    var hit = mv || md;
    var at = hit ? s.indexOf(hit) : 0;
    var raw = hit ? s.slice(Math.max(0, at - 90), at + 240) : s.slice(0, 260);
    raw = raw.replace(/\s+/g, ' ').trim();
    /* 结构指纹：这一段响应里究竟出现了哪几个 token 统计字段（排序后逗号连接）。
       键名本身就是指纹——同一家渠道很少改命名，换模型 / 换实现才会改。 */
    var UKEYS = ['candidatesTokenCount', 'completion_tokens', 'promptTokenCount',
      'prompt_tokens', 'reasoning_tokens', 'thoughtsTokenCount', 'totalTokenCount', 'total_tokens'];
    var ukeys = [];
    for (var ui = 0; ui < UKEYS.length; ui++) {
      if (s.indexOf('"' + UKEYS[ui] + '"') >= 0) ukeys.push(UKEYS[ui]);
    }
    /* 响应体里到底有没有正文——这是一条独立于聊天记录的真相来源 */
    var tlen = 0;
    try { tlen = bodyTextChars(s); } catch (eTL) { tlen = 0; }
    PEEKS[rid] = {
      at: nowMs(),
      textChars: tlen,
      hasText: tlen > 0,
      model: md,
      modelVersion: mv,
      thoughts: tt ? Number(tt) : null,
      reasoning: rt ? Number(rt) : null,
      out: ct ? Number(ct) : null,
      prompt: pt ? Number(pt) : null,
      finish: fin,
      raw: raw,
      usageKeys: ukeys.join(','),
      done: true
    };
    /* 响应体自述的模型是强证据：既写日志，也进判定 */
    try {
      if (ev && mv) ev.modelVersion = String(mv);
      if (ev && hit) pushObs(ev, hit, 'body');
      /* 看到过 usage 就算「真的读到过」：此后 thoughts==0 是证据，不再是「没看到」 */
      if (ev && hasUsage) {
        ev.usageSeen = true;
        ev.usageZeroThink = !(tt && Number(tt) > 0 || rt && Number(rt) > 0);
      }
      if (ev && !ev.internal && (tt && Number(tt) > 0 || rt && Number(rt) > 0)) {
        ev.hasThink = true;
        ev.hasReasonField = true;
        ev.thoughtTok = Number(tt || rt || 0);
      }
      if (ev && tlen > 0) { ev.bodyChars = tlen; }
      /* v0.6 抗截断：把已经抽好的 finish 抄进事件，判定要用它（空值不覆盖） */
      if (ev && fin) ev.finish = fin;
    } catch (eEv) {}
    if (typeof render === 'function' && CARD && CARD.open && CARD.rid === rid) {
      try {
        /* v8.0.3：只换数据，保留用户正在看的页签与滚动位置 */
        var keepTab = CARD.tab || 'human';
        var keepTop = 0;
        try {
          var sc = DOC.getElementById('ar6-card');
          if (sc) { var inner = sc.querySelector('[data-ar6-cardbody]'); if (inner) keepTop = inner.scrollTop || 0; }
        } catch (eS) {}
        var lg = readLog(), target = null;
        for (var li = 0; li < lg.length; li++) { if (lg[li] && lg[li].rid === rid) { target = lg[li]; break; } }
        openCard(target || null, keepTab);
        try {
          var sc2 = DOC.getElementById('ar6-card');
          if (sc2) { var in2 = sc2.querySelector('[data-ar6-cardbody]'); if (in2) in2.scrollTop = keepTop; }
        } catch (eS2) {}
      } catch (e0) {}
    }
  } catch (e) {}
}

function peekBody(res, ev) {
  try {
    if (!cfg.peek || cfg.safe) return null;
    if (ev && ev.internal) return null;   /* 内部请求的响应体不是正文，不采 */
    if (!res || typeof res.clone !== 'function') return;
    var rid = ev && ev.rid;
    if (!rid) return;
    var cl = res.clone();
    if (!cl) return;
    if (cl.body && typeof cl.body.getReader === 'function') {
      var rd = cl.body.getReader();
      var dec = null;
      try { dec = HOST.TextDecoder ? new HOST.TextDecoder() : null; } catch (e1) { dec = null; }
      var buf = '';
      var tail = '';
      var total = 0;
      var done = false;
      var finishPeek = function () {
        if (done) return;
        done = true;
        /* usage / finish_reason 都在 SSE 最后一帧：只留头部会把它整段切掉 */
        absorbPeek(tail ? (buf + '\n' + tail) : buf, rid, ev);
        /* 读到空内容也要留痕：否则无法区分"确实没正文"与"根本没取到" */
        if (!PEEKS[rid]) PEEKS[rid] = { at: nowMs(), textChars: 0, hasText: false, done: true, raw: '' };
      };
      var step = function () {
        rd.read().then(function (r) {
          if (done) return;
          if (r.done) { finishPeek(); return; }
          total += r.value && r.value.length ? r.value.length : 0;
          var piece = '';
          try { piece = dec ? dec.decode(r.value, { stream: true }) : ''; } catch (e2) { piece = ''; }
          if (total <= 400000) buf += piece;
          else {
            tail += piece;
            if (tail.length > 60000) tail = tail.slice(-60000);
          }
          /* 兜底：真遇到超大响应就不读了，避免把内存吃穿 */
          if (total > 8000000) { try { rd.cancel(); } catch (e3) {} finishPeek(); return; }
          step();
        })['catch'](function () { finishPeek(); });
      };
      step();
      return;
    }
    cl.text().then(function (t) {
      absorbPeek(t, rid, ev);
      if (!PEEKS[rid]) PEEKS[rid] = { at: nowMs(), textChars: 0, hasText: false, done: true, raw: '' };
    })['catch'](function () {});
  } catch (e) {}
}

/* ---------------- 零锁宿主观察器 ---------------- */

function stCtx() {
  try {
    var st = HOST.SillyTavern;
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
    try { w.eventOn('stream_token_received', function () { EV_TICK.lastTokenAt = nowMs(); }); } catch (e1) {}
    try { w.eventOn('generation_ended', function () { EV_TICK.lastEndAt = nowMs(); EV_TICK.seq++; }); } catch (e2) {}
    EV_TICK.bound = true;
    return true;
  } catch (e) { return false; }
}

function startWatcher(ev, meta, reqStart) {
  var ctx = stCtx();
  if (!ctx || !Array.isArray(ctx.chat)) {
    ev.sawText = true;
    finish(ev, meta);
    return;
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
          if (joined.length > 0 && !ev.firstMs) ev.firstMs = Math.max(1, t - reqStart);
          if (joined.length !== lastLen) { lastLen = joined.length; lastChange = t; }
          if (joined.length) {
            ev.sawText = true;
            ev.chatSaw = true;
            /* 只续写（消息没新增）时，本轮产出 = 现在正文 − 认领时的正文。
               负数是「重写成了更短的」：那时整条都是新写的，不能报成 1 个字；
               也不能拿 1 当兜底——那是编数字，面板会显示"正文 1 字"。 */
            var grewChars = mesStr.length - baseMes.length;
            ev.outputChars = contOnly ? (grewChars > 0 ? grewChars : mesStr.length) : joined.length;
            /* 破甲要判断"正文"和"结尾"，思维链不算正文 */
            ev.mesChars = mesStr.length;
            ev.tail = mesStr.slice(-600);
            if (reason.trim() || /<(?:thinking|think|interleaving|SUOT)\b/i.test(mesStr)) {
              ev.hasThink = true;
              ev.hasReasonField = true;
              ev.thoughtTok = estimateTokens(reason);
            }
          }
        }
      }
      var ended = EV_TICK.seq > evSeq0;
      if (ended && !evEndAt) evEndAt = EV_TICK.lastEndAt || t;
      /* 有正文才算有结果；事件说结束了也算（此时 chat 通常已提交） */
      var progress = ev.internal ? (ev.sawText ? 1 : 0) : lastLen;
      var settled = progress > 0 && (!isBusy() || t - lastChange > 2200 || ended);
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
        clearInterval(timer);
        ev.totalMs = Math.max(1, t - reqStart);
        finish(ev, meta);
      }
    } catch (e3) {
      clearInterval(timer);
      try { ev.totalMs = Math.max(1, nowMs() - reqStart); finish(ev, meta); } catch (e4) {}
    }
  }, 150);
  WATCHERS.push(timer);
}

/* ---------------- 请求处理 ---------------- */

function handleFetch(next, thisArg, args) {
  var input = args[0];
  var init = args[1];
  var url = urlOf(input);
  if (!isGenerateUrl(url)) return next.apply(thisArg, args);
  /* 破甲用这个计数判断"续写到底发出去没有" */
  try { JL.seq++; } catch (eJ) {}
  if (input && typeof input === 'object' && typeof input.clone === 'function') {
    return next.apply(thisArg, args);
  }

  var rawBody = init && typeof init.body === 'string' ? init.body : '';
  var plan = null;
  var outArgs = args;
  var internal = false;
  try {
    var parsedForInternal = null;
    try { parsedForInternal = rawBody ? JSON.parse(rawBody) : null; } catch (ePI) {}
    internal = isInternalRequest(init, parsedForInternal);
  } catch (eInt) { internal = false; }
  try {
    plan = planRequest(rawBody, url, internal);
    if (cfg.enabled && plan.changed.length && plan.body !== rawBody) {
      var newInit = {};
      for (var k in init) newInit[k] = init[k];
      newInit.body = plan.body;
      outArgs = [input, newInit];
    }
    if (plan.model) lastReq = { url: url, raw: rawBody, model: plan.model, base: plan.base || '' };
  } catch (e) { plan = null; }

  var started = nowMs();
  inflight++;

  var p = next.apply(thisArg, outArgs);
  if (!p || typeof p.then !== 'function') { inflight--; return p; }

  return p.then(function (res) {
    inflight--;
    try {
      var ev = newEvidence(plan ? plan.model : '', res.status, 'sse');
      ev.internal = internal;
      try { ev.verifiable = verifiableCode(); } catch (eVer) { ev.verifiable = 'unknown'; }
      if (res.status === 204) { ev.sawText = true; finish(ev, plan); return res; }
      if (res.status >= 400) { readErrorBody(res, ev); return res; }
      ev.rid = ++PEEK_SEQ;
      var watching = false;
      if (cfg.observe && !cfg.safe) { startWatcher(ev, plan, started); watching = true; }
      var pk = peekBody(res, ev);
      /* v8.0.3：观察器关掉时 200 也要落一条（只算响应体证据），否则整轮不记录、破甲失联 */
      if (!watching && pk && typeof pk.then === 'function') {
        pk.then(function () {
          try { if (!ev.__finished) { ev.__finished = true; finish(ev, plan); } } catch (eF) {}
        }, function () {
          try { if (!ev.__finished) { ev.__finished = true; finish(ev, plan); } } catch (eF) {}
        });
      } else if (!watching) {
        /* v0.12：没观察器、也没取体（内部请求或关掉 peek）时，这一轮就没人收尾了。
           直接收——不然内部请求会连记录都没有，账本和日志都看不到它。 */
        try { if (!ev.__finished) { ev.__finished = true; finish(ev, plan); } } catch (eF2) {}
      }
      return res;
    } catch (e2) {
      try { HOST.console && HOST.console.warn('[AR6] post-response error', e2 && e2.message); } catch (eW) {}
      return res;
    }
  }, function (err) {
    inflight--;
    try {
      var ev2 = newEvidence(plan ? plan.model : '', 0, 'none');
      ev2.error = String(err && err.message || err || 'fetch failed').slice(0, 80);
      ev2.totalMs = Math.max(1, nowMs() - started);
      finish(ev2, plan);
    } catch (e3) {}
    throw err;
  });
}

/* ---------------- 钩子安装 / 还原 ---------------- */

/* 我们装过的每一层（dispose 时统一置为透传，而不会删掉别人的包装） */
var ourWrappers = [];
/* 探针专用：最早捕获的那层原始 fetch */
var probeFetch = null;
/* 最后一次挂上去的那层 + 它当时接管的下一层（仅用于安全还原） */
var exposedFetch = null;
var exposedPrev = null;

function installFetchHook() {
  try {
    if (!HOST || typeof HOST.fetch !== 'function') return false;
    /* 复用别人已经装好的钩子：也算「挂上了」，否则横幅会误报「钩子未挂上」 */
    if (HOST.fetch.__ar6 && !HOST.fetch.__ar6dead) { exposedFetch = HOST.fetch; hooked = true; return true; }
    if (HOST.fetch === exposedFetch) { hooked = true; return true; }
    /* ★ 关键：prev 是本次安装的私有常量，之后任何重装都不会改写它。
       旧实现读共享的 origFetch，若别的扩展也包了一层 fetch，就会形成
       W2 → 别的包装 → W1 → 别的包装 → W1 … 的无限递归（栈溢出）。 */
    var prev = HOST.fetch;
    var dead = false;
    if (!origFetch) origFetch = prev;
    if (!probeFetch) probeFetch = prev;
    var wrapped = function (input, init) {
      if (dead) return prev.apply(this, arguments);
      try { return handleFetch(prev, this, arguments); }
      catch (err) {
        try { HOST.console && HOST.console.warn('[AR6] hook error, fallback', err); } catch (e1) {}
        return prev.apply(this, arguments);
      }
    };
    wrapped.__ar6 = true;
    ourWrappers.push({ fn: wrapped, kill: function () { dead = true; wrapped.__ar6dead = true; } });
    exposedFetch = wrapped;
    exposedPrev = prev;
    HOST.fetch = wrapped;
    hooked = true;
    return true;
  } catch (e) { return false; }
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
    HOOK_TARGET.fetch = null;
    hooked = false;
  } catch (e) {}
}

var HOOK_TARGET = { fetch: null, xhr: null };

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
          var plan = planRequest(body, u);
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

var probeBusy = false;

function runNativeProbe() {
  if (probeBusy) return;
  var base = cfg.dualBase || (lastReq && lastReq.base) || '';
  var key = cfg.dualKey || '';
  var model = (lastReq && lastReq.model) || '';
  if (!base || !model) { banner('⚪ 探针需要先发一轮，或在面板填 Base', 'gray'); return; }
  probeBusy = true;
  banner('🔬 原生探针请求中…', 'gray');
  var body = { contents: [{ role: 'user', parts: [{ text: 'ping' }] }], generationConfig: { maxOutputTokens: 8, temperature: 0 } };
  var headers = { 'content-type': 'application/json' };
  if (key) headers['x-goog-api-key'] = key;
  httpJson(nativeUrl(base, model), { method: 'POST', headers: headers, body: JSON.stringify(body) }, 25000)
    .then(function (r) {
      probeBusy = false;
      if (r.status >= 400 && /invalid|unsupported|400|422/.test(String(r.status))) {
        return httpJson(nativeUrl(base, model), { method: 'POST', headers: headers, body: JSON.stringify({ contents: [{ role: 'user', parts: [{ text: 'ping' }] }] }) }, 25000)
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
  var key = cfg.dualKey || '';
  var model = (lastReq && lastReq.model) || '';
  if (!base || !model) { banner('⚪ 双通道指纹需要先发一轮，或在面板填 Base', 'gray'); return; }
  probeBusy = true;
  banner('🔬 双通道指纹请求中…', 'gray');
  var headers = { 'content-type': 'application/json' };
  if (key) headers['authorization'] = 'Bearer ' + key;
  var ghost = model + '-zzz-not-a-real-model';
  function ask(m) {
    return httpJson(base, {
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
