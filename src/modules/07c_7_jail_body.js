/* ===== 7_jail_body.js ===== */
function jailPatchBody(body, opt) {
  var out = [];
  if (!cfg) return out;
  if (!cfg.enabled) return out;
  /* 4.6：工具破甲（仅 Gemini 原生 contents 形态）。默认不与文本破甲叠加。 */
  if (jtOn()) {
    var jtRoot = (body && body.request && typeof body.request === 'object' && !Array.isArray(body.request)) ? body.request : body;
    var jtMsgs = [];
    try { jtMsgs = jailToolPatch(jtRoot); } catch (eJT) { jtMsgs = []; }
    var jtOk = false;
    for (var jq = 0; jq < jtMsgs.length; jq++) { out.push(jtMsgs[jq]); if (String(jtMsgs[jq]).indexOf('工具破甲（') === 0) jtOk = true; }
    if (jtOk && !cfg.jailToolKeep) {
      out.push('工具破甲：文本破甲已自动关闭');
      return out;
    }
    if (!jtOk) { if (jtMsgs.length) out.push('工具破甲：本渠道不支持（只在 Gemini 原生生效），本轮已跳过'); }
  }
  if (cfg.jail === 'only') { try { return jailOnlyPatch(body); } catch (eOnly) { return out; } }
  var sup = (cfg.jail === 'supreme');
  var mid = (cfg.jail === 'mid');
  var strong = (cfg.jail === 'strong');
  var hard = (cfg.jail === 'gatanothor' || cfg.jail === 'abyss');
  if (sup && (!cfg.enabled || cfg.jailSupremeConfirmed !== true)) return out;
  if (hard && (!cfg.enabled || cfg.jailSupremeConfirmed !== true)) return out;
  if (!body || typeof body !== 'object' || Array.isArray(body)) return out;
  /* 若当前为空中型(safe)但点亮了「神光一言」，跳过主干修改，仅在最底附尾句契约 */
  if (!sup && !strong && !mid && !hard) {
    if (cfg.enabled && cfg.jail && cfg.jail !== 'off') {
      try {
        var wpSafe = jailSupremePatch(body);
        for (var wsi = 0; wsi < wpSafe.length; wsi++) out.push(wpSafe[wsi]);
      } catch (eWS) { criticalWarn('底部声明', eWS); }
    }
    return out;
  }
  /* 复合型(mid) = 保底 token + 虚构创作许可头（不改 safetySettings，不插稀释垫片与底部接管）；
     强力型(strong) = 四子项按用户开关；闪耀型(supreme) = 强力型四项全开 + 底部终极护盾声明 */
  /* V5.23 四开关下线：由档位直接决定 */
  var jTok = true, jSafe = !mid, jPre = true, jText = !mid;

  try { var __sanN = lkPresetSanitize(body); if (__sanN > 0) out.push('预设消毒 ' + __sanN + ' 处'); } catch (eSan) {}
  var TX = jailTextSet(String(body.model || (body.request && body.request.model) || ''));
  var own = false;
  try { own = JAIL_OWN_RE.test(jailSysText(body)) || (typeof lkPresetOwnsJail === 'function' && lkPresetOwnsJail(body)); } catch (e0) { own = false; }
  var yieldToPreset = own && (typeof presetCompatForce === 'function' && !presetCompatForce());
  if (own && !yieldToPreset) out.push('预设自带破甲：强权优先，破甲仍由光之守护主导');
  if (yieldToPreset) out.push('礼让预设：检测到预设自带破甲/载具，仅保留保底 token 与解安全');

  /* 1) 保底 token：只加不减；字段缺失时不动（默认上限未知，乱补可能反而砍短） */
  if (jTok) {
    var floorTok = lkTokFloor(body);
    /* 3.3.6：按字数锚抬保底——字数锚要 N 字，输出上限却卡在 2048 tokens 时，必然截断 */
    try {
      if (truncIsOn() && truncLevel(cfg.trunc) === TRUNC_MEDIUM) {
        var wantLen = Number(cfg.truncLen || 0);
        if (wantLen > 0) floorTok = Math.max(floorTok, Math.ceil(wantLen * 1.8) + 256);
      }
    } catch (eTok) {}
    /* 若该渠道已因 400 暴露了真实上限（如 8192），后续轮次自动封顶，避免每轮都先撞一次 400 */
    var learnedCap = (typeof lkLearnedTokCap === 'function') ? lkLearnedTokCap(body) : 0;
    if (learnedCap > 0) {
      if (floorTok > learnedCap) floorTok = learnedCap;
      lkClampTok(body, learnedCap);
    }
    /* V5.25：不再封顶 8192 —— 4H/4C/4N 65,536，其余 32,768 */
    var names = ['max_tokens', 'max_completion_tokens', 'maxTokens', 'max_output_tokens'];
    var i, k;
    for (i = 0; i < names.length; i++) {
      k = names[i];
      if (typeof body[k] === 'number' && isFinite(body[k]) && body[k] < floorTok) {
        body[k] = floorTok; out.push('保底token ' + k + '→' + floorTok);
      }
    }
    try {
      var gc = body.generationConfig;
      if (gc && typeof gc.maxOutputTokens === 'number' && isFinite(gc.maxOutputTokens) && gc.maxOutputTokens < floorTok) {
        gc.maxOutputTokens = floorTok; out.push('保底token maxOutputTokens→' + floorTok);
      }
    } catch (e1) {}
    try {
      var rq = body.request;
      if (rq && typeof rq === 'object' && !Array.isArray(rq)) {
        for (i = 0; i < names.length; i++) {
          k = names[i];
          if (typeof rq[k] === 'number' && isFinite(rq[k]) && rq[k] < floorTok) {
            rq[k] = floorTok; out.push('保底token request.' + k + '→' + floorTok);
          }
        }
      }
    } catch (e2) {}
  }

  /* 2) 原生解安全：只对 gemini 系发，别的家写这个字段可能 400 */
  if (jSafe) {
    var mdl = String(body.model || cfg.alias || '');
    var ssHost = (body.request && typeof body.request === 'object' && !Array.isArray(body.request)) ? body.request : body;
    var ssCur = (ssHost && ssHost.safetySettings);
    var ssFlat = Array.isArray(ssCur) && ssCur.length > 0;
    if (ssFlat) {
      for (i = 0; i < ssCur.length; i++) { if (ssCur[i] && ssCur[i].threshold !== 'BLOCK_NONE') { ssFlat = false; break; } }
    }
    if (isGeminiLike(mdl) && !ssFlat) {
      var cats = ['HARM_CATEGORY_HARASSMENT', 'HARM_CATEGORY_HATE_SPEECH', 'HARM_CATEGORY_SEXUALLY_EXPLICIT',
        'HARM_CATEGORY_DANGEROUS_CONTENT', 'HARM_CATEGORY_CIVIC_INTEGRITY'];
      var ss = [];
      for (i = 0; i < cats.length; i++) ss.push({ category: cats[i], threshold: 'BLOCK_NONE' });
      try { ssHost.safetySettings = ss; } catch (eSS) {}
      if (ssHost !== body) { try { body.safetySettings = ss; } catch (eSS2) {} }
      out.push('解安全 BLOCK_NONE×' + ss.length);
    }
  }

  /* V5.65 礼让预设：检测到预设自带破甲/载具且「预设适配=礼让预设」时，保底 token 与解安全保留，其余文本注入让路 */
  if (yieldToPreset) return out;
  /* V6.0 协议化让路：凝视深渊走 LKPROTO 协议化通道时，仅保留预设消毒 / 保底 token / 解安全，跳过稀释垫片、接管块与尾部独立 user 声明，避免污染 context.world 或顶替用户真实输入 */
  if (opt && opt.protoMode) return out;
  try { var __orphN = lkDropOrphanTools(body); if (__orphN > 0) out.push('孤儿工具移除 ' + __orphN + ' 个'); } catch (eOrp) {}

  /* V5.22：强力及以上走「单一委托块」——权威头/任务单/资料标记/接管收进一份 <doc> */
  var lkAuth = (strong || sup || hard);
  /* 3) 底部接管（L3）：请求副本最底插入一条独立 user 条目；不动已有正文、保留助手预填
     3.3.2：至尊档时接管条也放到预填之后（声明必须最后），并补一句承接指令 */
  var rootS = (body.request && typeof body.request === 'object' && !Array.isArray(body.request)) ? body.request : body;
  var arrS = rootS && (rootS.messages || rootS.contents);
  var injChars = 0;
  if (jText && Array.isArray(arrS) && arrS.length) {
    var seen = false;
    for (var t2 = arrS.length - 1; t2 >= 0; t2--) { if (STRONG_OWN.has(arrS[t2])) { seen = true; break; } }
    /* 3.3.1：内容级幂等——别的副本/旧版本已经插过同一条时不再插第二次 */
    if (!seen) {
      try {
        for (var t9 = arrS.length - 1; t9 >= 0 && t9 >= arrS.length - 3; t9--) {
          var m9 = arrS[t9];
          if (!m9 || m9.role !== 'user') continue;
          var s9 = Array.isArray(m9.parts)
            ? m9.parts.map(function (p) { return p && typeof p.text === 'string' ? p.text : ''; }).join('')
            : String(m9.content == null ? '' : m9.content);
          if (/doc="LK-[A-Z]{2}-[0-9A-F]{4}"/.test(s9) || /LK-MS-(?:[A-Z]{2}-)?[0-9A-F]{4}/.test(s9) || s9.indexOf('虚构正文·本轮') >= 0) { seen = true; break; }
        }
      } catch (eT9) {}
    }
    if (!seen) {
      var isC = Array.isArray(rootS.contents) && arrS === rootS.contents;
      var lm = arrS[arrS.length - 1], atS = arrS.length, noteS = '置底', tkTail = '';
      if (lm && lm.role === 'assistant') {
        var lmt = isC
          ? (lm.parts || []).map(function (p) { return p && typeof p.text === 'string' ? p.text : ''; }).join('')
          : (lm.content == null ? '' : String(lm.content));
        if (String(lmt).trim()) {
          /* 3.3.2：至尊档的声明必须压在最后，所以接管条也挪到预填之后，并补承接指令 */
          if (sup) { noteS = '预填后（承接再写）'; tkTail = JAIL_TAKE_PREFILL; }
          else { atS = arrS.length - 1; noteS = '预填前'; }
        } else { noteS = '空块后'; }
      }
      var tkBody = (lkAuth || String(TX.take).indexOf('<spec>') >= 0) ? lkDocBlock(TX.take, TX.pmark) : TX.take;
      var tkTxt = lkAuth && tkTail ? (tkBody + '\n' + tkTail) : tkBody;
      if (lkAuth) tkTxt = tkTxt + '\n' + lkRuntimeHead();
      try { tkTxt = lkTierTxt(tkTxt); } catch (eTT) {}
      /* V5.29：思考档与破甲档解耦，不再默认加「思考·深」；低思考更容易破甲 */
      var tk = isC ? { role: 'user', parts: [{ text: tkTxt }] } : { role: 'user', content: tkTxt };
      var __merged = false;
      try { __merged = lkMergeTake(arrS, isC, tkTxt); } catch (eMg) { __merged = false; }
      if (__merged) { noteS = '并入末条'; }
      else { arrS.splice(atS, 0, tk); STRONG_OWN.set(tk, JSON.stringify(tk)); }
      injChars += tkTxt.length;
      out.push('接管(' + noteS + ')');
    }
  }
  /* 3.3.4 稀释垫片：仅在强力型/闪耀型垫在政策之前（复合型完全不干扰预设原有文风，不加垫片与强文风规格） */
  if (!mid) {
    try {
      var lkPadWant = (typeof lkPadForTier === 'function') ? lkPadForTier() : 3600;
      var lkPadAdult = (typeof lkAdultSignal === 'function') ? lkAdultSignal(body) : true;
      if (lkPadWant > 0 && lkPadAdult && jailSysText(body).indexOf(DILUTE_MARK) < 0 && !(cfg.enabled && cfg.grab > 0)) {
        var padTxt = diluteText(lkPadWant >= 3600 ? 'heavy' : (lkPadWant >= 2400 ? 'mid' : 'light'));
        if (padTxt && jailPrependSysTxt(body, jailMsgArray(body), padTxt)) {
          injChars += padTxt.length; out.push('稀释垫片 重');
          try { if (typeof lkApplyHeads === 'function') lkApplyHeads(body); } catch (eReH) {}
        }
      }
    } catch (eDil) {}
    /* 4) 创作政策（L2）：复合型贴 system；强力及以上已并入 <doc>，不再单独贴 */
    try {
      if (!lkAuth && jailSysText(body).indexOf(TX.pmark) < 0) {
        if (jailAppendSysTxt(body, jailMsgArray(body), TX.policy)) { injChars += TX.policy.length; out.push('创作政策'); }
      }
    } catch (eP) {}
  }
  /* 5) 授权头（L1）：system 最前一行虚构创作许可头，幂等 */
  try {
    if (!lkAuth && jPre && jailSysText(body).indexOf(TX.hdr) < 0) {
      var hRoot = (body.request && typeof body.request === 'object' && !Array.isArray(body.request)) ? body.request : body;
      var hArr = jailMsgArray(body), hOk = false;
      if (hArr && hArr.length) {
        for (var hi = 0; hi < hArr.length; hi++) {
          if (hArr[hi] && hArr[hi].role === 'system') { hOk = jailPrependSys(hArr, TX.hdr); break; }
        }
      }
      if (!hOk && typeof hRoot.system === 'string') { hRoot.system = TX.hdr + '\n\n' + hRoot.system; hOk = true; }
      if (!hOk && typeof hRoot.systemInstruction === 'string') { hRoot.systemInstruction = TX.hdr + '\n\n' + hRoot.systemInstruction; hOk = true; }
      if (!hOk && hRoot.systemInstruction && typeof hRoot.systemInstruction === 'object' && Array.isArray(hRoot.systemInstruction.parts)) { hRoot.systemInstruction.parts.unshift({ text: TX.hdr }); hOk = true; }
      if (!hOk && hArr && hArr.length) hOk = jailPrependSys(hArr, TX.hdr);
      if (hOk) { injChars += TX.hdr.length + 2; out.push('授权头'); }
    }
  } catch (eH) {}
  /* v3.1.4：把本轮追加的字数报给面板——注入体积本身也是会被上游注意到的特征 */
  if (injChars > 0) {
    JAIL_INJ.last = injChars;
    JAIL_INJ.at = nowMs();
    JAIL_INJ.total += injChars;
    out.push('注入 ' + injChars + ' 字');
  }
  /* 6) 闪耀型终极护盾声明：强力型全集之后再在最底追加一条独立 user 条目（最高注意力位） */
  if (sup || mid || strong || hard) {
    try {
      var sp = jailSupremePatch(body);
      for (var si = 0; si < sp.length; si++) out.push(sp[si]);
    } catch (eSp) { criticalWarn('至尊声明', eSp); }
  }
  /* 7) 全形态通用「神光一言 · 尾句契约」：闪耀型下自动与底部声明合并去重 */
  if (cfg.enabled && cfg.jail && cfg.jail !== 'off' && cfg.jailWord === true) {
    try {
      var wpAll = jailOnlyPatch(body);
      for (var wai = 0; wai < wpAll.length; wai++) out.push(wpAll[wai]);
    } catch (eWA) { criticalWarn('神光一言', eWA); }
  }

  return out;
}

/* ---------------- 判定：空回 / 截断 / 硬拒 ---------------- */

/* v3.0：中性结构判定——破甲与抗截断都调它，谁调用不改变结果 */
function resumeTruncWhy(tail, chars) {
  var t = String(tail || '');
  if (!t) return '';
  var flat = t.replace(/\s+$/, '');
  if (!flat) return '';

  var fences = flat.split('```').length - 1;
  if (fences % 2 === 1) return '代码块未闭合';

  /* 完整闭合的结构化卡片/变量尾标签（如《光域·镜界》</lk_choices> / </lk_status> / </lk_memo> / </UpdateVariable>）视为正常完整收尾 */
  if (/<\/(?:lk_[a-zA-Z0-9_-]+|UpdateVariable|details|section|div|summary)>$/i.test(flat)) return '';
  /* 末尾被截断在半个标签内或已开启结构化标签（<lk_...> / <UpdateVariable>）却未闭合，判定为断章 */
  if (/<\/?[a-zA-Z_][a-zA-Z0-9_-]*(?:\s[^<>]*)?$/.test(flat)) return '标签未闭合';
  var openLkRe = /<(lk_[a-zA-Z0-9_-]+|UpdateVariable)(?:\s[^>]*)?>/gi;
  var lastOpenTag = '', mLk;
  while ((mLk = openLkRe.exec(flat)) !== null) lastOpenTag = mLk[1];
  if (lastOpenTag) {
    var flLow = flat.toLowerCase();
    var lkLow = lastOpenTag.toLowerCase();
    if (flLow.lastIndexOf('</' + lkLow + '>') < flLow.lastIndexOf('<' + lkLow)) return '结构标签未闭合';
  }

  var last = flat.charAt(flat.length - 1);
  if ('，,、：:；;'.indexOf(last) >= 0) return '停在逗号/冒号';
  if ('「『（【《“‘'.indexOf(last) >= 0) return '停在开引号/开括号';
  if ('。！？…”』」）】》.!?～~*'.indexOf(last) >= 0) return '';

  /* 长文而且尾部一整段没有任何句末标点：多半是被砍在半句话上 */
  if (chars > 800) {
    var seg = flat.slice(-120);
    if (!/[。！？…”』」）】》\.!?]/.test(seg)) return '尾部没有句末标点';
  }
  return '';
}

/* 旧名保留：导出与老调用点不动 */
function jailTruncWhy(tail, chars) { return resumeTruncWhy(tail, chars); }

function jailInspect(ev) {
  if (!ev) return null;
  var chars = Number(ev.outputChars || 0);
  var mc = (typeof ev.mesChars === 'number') ? ev.mesChars : chars;
  var tail = String(ev.tail || '');

  /* v8.29：数据库/填表这类内部请求不写聊天产物，判「无产物」而不是空回 */
  if (ev.internal) return { code: 'none', note: '内部请求（数据库/填表）：没有聊天产物' };
  if (ev.blocked) return { code: 'refuse', note: '上游拦截 ' + ev.blocked };
  /* v8.29：响应体已经取到正文（聊天记录还没提交）时，这不是空回 */
  if (mc < 1 && ev.sawText) return { code: 'ok', note: '' };
  if (mc < 1 || !tail) return ev.emptyConfirmed ? { code: 'empty', note: '响应体确认没有正文' } : { code: 'none', note: '正文证据不足' };
  /* 判「短」看本轮增量：续写后 mesChars 是整条消息，3000 字里续出 200 字拒绝也要判出来 */
  var delta = (chars > 0) ? chars : mc;
  if (delta < 300 && JAIL_REFUSE_RE.test(tail)) {
    var hard = JAIL_SAFETY_RE.test(tail);
    return {
      code: 'refuse',
      hard: !!hard,
      note: hard ? '安全层拒绝（换渠道才有用，续写不会变）' : '像是拒绝（可能只是这段没接上）'
    };
  }

  if (ev.finish && !truncLenFinish(ev.finish) && !truncPauseFinish(ev.finish)) return {code:'ok',note:''};
  var why = jailTruncWhy(tail, mc);
  if (why) return { code: 'trunc', note: '像是截断（' + why + '）' };
  return { code: 'ok', note: '' };
}

/* ---------------- 事后补救：自动续写 ---------------- */

/* v4.6.8：钉参数只对 OpenAI 兼容 / OpenRouter 生态有意义（删 models[]、allow_fallbacks=false）。
 * 我们的目标场景是 Google AI Studio 反代：原生 /v1beta 根本不认这些字段，改了纯属空转。
 * 所以命中 Gemini 形态（contents / systemInstruction / gemini|argon|carbon|hydrogen|neon 模型名）时直接跳过；
 * 非 Gemini 的渠道仍按原逻辑处理，代码留着但默认走不到。 */
function pinSkipFor(body, mdl) {
  try {
    if (Array.isArray(body && body.contents) || (body && body.systemInstruction)) return true;
    var m = String(mdl || '').toLowerCase();
    return /gemini|argon|carbon|hydrogen|neon|gemma/.test(m);
  } catch (e) { return false; }
}
function jailLastAi() {
  var ctx = stCtx();
  if (!ctx || !Array.isArray(ctx.chat) || !ctx.chat.length) return null;
  var idx = ctx.chat.length - 1;
  var msg = ctx.chat[idx];
  if (!msg || msg.is_user) return null;
  return { ctx: ctx, idx: idx, msg: msg };
}

/* ---------------- 通用闸门：owner = 'jail' | 'trunc' ----------------
   两侧各记各的 count / at / total / key / firstAt；「同一轮只补一次」由 RS.turnKey 兜底。
   只开一个，另一个的记账就不会被触碰——这就是 v3.0 的「可分别使用」。 */
function resumeSlot(owner) { return owner === 'trunc' ? RS.trunc : (owner === 'pvp' ? RS.pvp : JL); }

function resumeGate(owner, key, maxC) {
  var S = resumeSlot(owner);
  var cap = (typeof maxC === 'number' && maxC > 0) ? maxC : 1;
  var t = nowMs();
  if (S.lock && t - S.lockAt > JAIL_RELOCK) S.lock = false;   /* 锁自己解，别永久卡死 */
  if (!S.firstAt || t - S.firstAt > 60000) { S.firstAt = t; S.total = 0; }
  if (S.total >= 6) return { ok: false, why: 'rate' };        /* 一分钟 6 次：看着像死循环 */
  if (S.key !== key) { S.key = key; S.count = 0; S.at = 0; }
  if (S.at && t - S.at > JAIL_CHAIN_RESET) S.count = 0;
  if (S.lock) return { ok: false, why: 'lock' };
  if (S.at && t - S.at < JAIL_GAP) return { ok: false, why: 'gap' };
  if (S.count >= cap) return { ok: false, why: 'max' };
  /* 这一轮已经补过（另一个子系统补的也算）：再补就成了连环保底 */
  /* 3.3.6：同一轮允许「同一侧」再补一枪（上限 cap 内），跨子系统仍然互斥 */
  if (RS.turnKey && RS.turnKey === key && t - RS.turnAt < JAIL_CHAIN_RESET && !(RS.turnOwner === owner && S.count < cap)) return { ok: false, why: 'turn' };
  return { ok: true };
}

function jailGate(key) { return resumeGate('jail', key); }
function truncGate(key) { return resumeGate('trunc', key, TRUNC_MAX_CONT); }

function jailTrigger() {
  var ctx = stCtx();
  if (ctx) {
    if (typeof ctx.executeSlashCommandsWithOptions === 'function') {
      return { kind: '/continue', fn: function () { return ctx.executeSlashCommandsWithOptions('/continue'); } };
    }
    if (typeof ctx.executeSlashCommands === 'function') {
      return { kind: '/continue(旧)', fn: function () { return ctx.executeSlashCommands('/continue'); } };
    }
  }
  /* TT 酒馆兜底：SELF_WIN / HOST 上可能暴露 triggerSlash 而非 SillyTavern.getContext */
  try {
    if (SELF_WIN && typeof SELF_WIN.triggerSlash === 'function') {
      return { kind: 'triggerSlash(iframe)', fn: function () { return SELF_WIN.triggerSlash('/continue'); } };
    }
  } catch (eTT1) {}
  try {
    if (HOST && typeof HOST.triggerSlash === 'function') {
      return { kind: 'triggerSlash(host)', fn: function () { return HOST.triggerSlash('/continue'); } };
    }
  } catch (eTT2) {}
  var btn = DOC && DOC.getElementById && DOC.getElementById('option_continue');
  if (btn) return { kind: '按钮', fn: function () { try { btn.click(); } catch (e) {} return null; } };
  return null;
}

function resumeFire(owner) {
  var S = resumeSlot(owner);
  var tag = owner === 'trunc' ? '✂️ ' : (owner === 'pvp' ? '♻️ ' : '🩹 ');
  var trig = jailTrigger();
  if (!trig) {
    S.lock = false;
    banner(tag + '找不到续写入口，请手动点「继续」', 'warn');
    return;
  }
  var seq0 = JL.seq;
  S.lock = true;
  S.lockAt = nowMs();
  S.at = nowMs();
  S.total++;
  var done = false;
  function release() {
    if (done) return;
    done = true;
    S.lock = false;
  }
  try {
    /* 回声刹车是共享的：不管哪一侧打的这一枪，它自己的收尾都别再当空回/截断去补 */
    JL.selfAt = nowMs(); JL.selfPending = true;
    var r = trig.fn();
    /* v8.29：这一枪是我们自己打的——记下时间，别把它自己的收尾再当成空回去补 */
    if (r && typeof r.then === 'function') {
      r.then(function (res) {
        release();
        var s = String(res == null ? '' : res);
        if (/cannot run|生成中|being generated/i.test(s)) banner(tag + '酒馆说还在生成，这轮不补了', 'warn');
      })['catch'](function (e) {
        release();
        banner(tag + '续写出错：' + String(e && e.message || e).slice(0, 60) + '（可手动点「继续」）', 'warn');
      });
    } else {
      setTimeout(release, 8000);
    }
    /* 发出去 8 秒还没有新请求，说明入口没生效 */
    setTimeout(function () {
      if (JL.seq === seq0 && !isBusy()) banner(tag + '续写没发出去，请手动点「继续」', 'warn');
    }, 8000);
  } catch (e) {
    release();
    banner(tag + '续写调用失败：' + String(e && e.message || e).slice(0, 60), 'warn');
  }
}

function jailFire() { return resumeFire('jail'); }

/* ---- 五档去技术化圣殿仪式确认弹窗与事件委托（含 V5.98 破暗化光·闪耀三轨） ---- */
var JAIL_ASK = { at: 0, code: '', key: '' };

/* 视觉形态解析：全工具破甲(allTool)实际生效且当前为深渊或石像待机时，顶栏/圆章/3D桌宠同步由暗转明化回闪耀迪迦(supreme) */
function lkVisualTier() {
  try {
    if (!cfg || !cfg.enabled) return 'off';
    var j = String(cfg.jail || 'off');
    if (j === 'gatanothor' || j === 'noa') return 'noa';
    var dawnLive = !!(cfg.allTool === true && cfg.toolChan === 'on' && !(cfg.grab > 0) && String(cfg.jailTool || 'off') === 'off');
    if (dawnLive && (j === 'abyss' || j === 'off')) return 'supreme';
    return j;
  } catch (e) { return 'off'; }
}

function lkCardActOf(ev, rootNode) {
  var el = ev && ev.target;
  var guard = 0;
  while (el && el !== rootNode && guard++ < 12) {
    if (el.getAttribute) {
      var a = el.getAttribute('data-ar6-card');
      if (a) return a;
    }
    el = el.parentNode;
  }
  return '';
}

function lkRitualAmbientSVG(key) {
  var sk = (typeof skinId === 'function') ? skinId() : 'ultra';
  if (sk !== 'ultra' && typeof lkSkinRitualAmbientSVG === 'function') {
    var skAmb = lkSkinRitualAmbientSVG(sk, key);
    if (skAmb) return skAmb;
  }
  if (key === 'noa') {
    return '<svg viewBox="0 0 1440 900" preserveAspectRatio="xMidYMid slice" style="width:100%;height:100%;display:block;pointer-events:none">' +
      '<defs>' +
        '<linearGradient id="rtNoaWL" x1="455" y1="490" x2="24" y2="38" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#FFFFFF" stop-opacity="0.72"/><stop offset="0.4" stop-color="#BAE6FD" stop-opacity="0.58"/><stop offset="0.76" stop-color="#FDE68A" stop-opacity="0.42"/><stop offset="1" stop-color="#C4B5FD" stop-opacity="0.12"/></linearGradient>' +
        '<linearGradient id="rtNoaWR" x1="985" y1="490" x2="1416" y2="38" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#FFFFFF" stop-opacity="0.72"/><stop offset="0.4" stop-color="#BAE6FD" stop-opacity="0.58"/><stop offset="0.76" stop-color="#FDE68A" stop-opacity="0.42"/><stop offset="1" stop-color="#C4B5FD" stop-opacity="0.12"/></linearGradient>' +
      '</defs>' +
      '<path d="M448 455 L26 42 L228 258 L46 218 L352 406 L112 402 L438 548 L224 576 L448 632 Z" fill="url(#rtNoaWL)" stroke="rgba(255,255,255,0.65)" stroke-width="1.6" stroke-linejoin="round"/>' +
      '<path d="M992 455 L1414 42 L1212 258 L1394 218 L1088 406 L1328 402 L1002 548 L1216 576 L992 632 Z" fill="url(#rtNoaWR)" stroke="rgba(255,255,255,0.65)" stroke-width="1.6" stroke-linejoin="round"/>' +
      '<circle cx="720" cy="450" r="460" fill="none" stroke="rgba(224,242,254,0.32)" stroke-width="1.4" stroke-dasharray="14 9"/>' +
      '</svg>';
  }
  if (key === 'abyss') {
    return '<svg viewBox="0 0 1440 900" preserveAspectRatio="xMidYMid slice" style="width:100%;height:100%;display:block;pointer-events:none">' +
      '<ellipse cx="720" cy="450" rx="500" ry="360" fill="none" stroke="rgba(159,18,57,0.48)" stroke-width="2" stroke-dasharray="16 10"/>' +
      '<g fill="none" stroke="#FF2E55" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round" opacity="0.82">' +
        '<path d="M-10 18 L145 96 L122 142 L268 215 L245 256 L360 315"/>' +
        '<path d="M1450 22 L1285 108 L1312 154 L1165 228 L1190 268 L1075 322"/>' +
        '<path d="M-10 882 L165 790 L142 742 L292 668 L268 625 L385 575"/>' +
        '<path d="M1450 882 L1275 786 L1298 738 L1148 662 L1172 620 L1055 572"/>' +
      '</g></svg>';
  }
  if (key === 'dawn') {
    return '<svg viewBox="0 0 1440 900" preserveAspectRatio="xMidYMid slice" style="width:100%;height:100%;display:block;pointer-events:none">' +
      '<defs>' +
        '<linearGradient id="rtDawnBeam" x1="720" y1="900" x2="720" y2="0" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#9F1239" stop-opacity="0.18"/><stop offset="0.35" stop-color="#F59E0B" stop-opacity="0.42"/><stop offset="0.72" stop-color="#FEF08A" stop-opacity="0.52"/><stop offset="1" stop-color="#FFFFFF" stop-opacity="0.22"/></linearGradient>' +
        '<radialGradient id="rtDawnSun" cx="50%" cy="18%" r="54%"><stop offset="0" stop-color="#FFFBEB" stop-opacity="0.48"/><stop offset="0.45" stop-color="#F59E0B" stop-opacity="0.18"/><stop offset="1" stop-color="#050205" stop-opacity="0"/></radialGradient>' +
      '</defs>' +
      '<rect width="1440" height="900" fill="url(#rtDawnSun)"/>' +
      '<g fill="none" stroke="#9F1239" stroke-width="2.4" stroke-linecap="round" opacity="0.52">' +
        '<path d="M-10 860 L155 770 L132 722 L278 648"/><path d="M-10 520 L130 488 L178 525 L260 492"/>' +
        '<path d="M1450 860 L1285 770 L1308 722 L1162 648"/><path d="M1450 520 L1310 488 L1262 525 L1180 492"/>' +
      '</g>' +
      '<polygon points="555,900 612,0 648,0 622,900" fill="url(#rtDawnBeam)" opacity="0.62"/>' +
      '<polygon points="682,900 704,0 736,0 758,900" fill="url(#rtDawnBeam)" opacity="0.88"/>' +
      '<polygon points="818,900 792,0 828,0 885,900" fill="url(#rtDawnBeam)" opacity="0.62"/>' +
      '<circle cx="720" cy="450" r="420" fill="none" stroke="rgba(252,211,77,0.34)" stroke-width="1.6" stroke-dasharray="14 10"/>' +
      '<g fill="#FEF08A" opacity="0.86"><circle cx="290" cy="240" r="5"/><circle cx="1150" cy="220" r="5.5"/><circle cx="380" cy="690" r="4.5"/><circle cx="1060" cy="680" r="5"/><circle cx="720" cy="120" r="6" fill="#FFFFFF"/></g>' +
      '</svg>';
  }
  if (key === 'supreme') {
    return '<svg viewBox="0 0 1440 900" preserveAspectRatio="xMidYMid slice" style="width:100%;height:100%;display:block;pointer-events:none">' +
      '<g opacity="0.38" fill="rgba(254,240,138,0.26)">' +
        '<polygon points="720,-30 200,900 320,900"/><polygon points="720,-30 1120,900 1240,900"/>' +
      '</g>' +
      '<circle cx="720" cy="0" r="360" fill="none" stroke="rgba(252,211,77,0.42)" stroke-width="1.6" stroke-dasharray="10 8"/>' +
      '<circle cx="230" cy="640" r="6" fill="#FEF08A"/><circle cx="1210" cy="620" r="6.5" fill="#FEF08A"/>' +
      '<circle cx="330" cy="760" r="5" fill="#FCD34D"/><circle cx="1110" cy="755" r="5.5" fill="#FCD34D"/>' +
      '</svg>';
  }
  return '<svg viewBox="0 0 1440 900" preserveAspectRatio="xMidYMid slice" style="width:100%;height:100%;display:block;pointer-events:none">' +
    '<ellipse cx="720" cy="450" rx="520" ry="350" fill="none" stroke="rgba(251,113,133,0.4)" stroke-width="2"/>' +
    '<line x1="60" y1="180" x2="420" y2="180" stroke="#FB7185" stroke-width="3" stroke-linecap="round" opacity="0.7"/>' +
    '<line x1="1020" y1="720" x2="1380" y2="720" stroke="#F43F5E" stroke-width="3" stroke-linecap="round" opacity="0.7"/>' +
    '</svg>';
}

function lkRitualCrestSVG(key) {
  var sk = (typeof skinId === 'function') ? skinId() : 'ultra';
  if (sk !== 'ultra' && typeof lkSkinRitualCrestSVG === 'function') {
    var skCr = lkSkinRitualCrestSVG(sk, key);
    if (skCr) return skCr;
  }
  if (key === 'noa') {
    return '<svg viewBox="0 0 36 36" fill="none">' +
      '<path d="M18 21L4 7.5L9.5 19.5L3.5 16L14.5 26.5L18 32L21.5 26.5L32.5 16L26.5 19.5L32 7.5L18 21Z" fill="url(#ar6NoaCrGrad)" stroke="#FFFFFF" stroke-width="1.5" stroke-linejoin="round"/>' +
      '<path d="M18 15.5L10.5 8L15 18.5L18 23L21 18.5L25.5 8L18 15.5Z" fill="#E0F2FE" opacity="0.92"/>' +
      '<path d="M18 16.5L16.2 21.5L18 26.5L19.8 21.5L18 16.5Z" fill="#F43F5E"/>' +
      '<defs><linearGradient id="ar6NoaCrGrad" x1="4" y1="7" x2="32" y2="30" gradientUnits="userSpaceOnUse"><stop stop-color="#FFFFFF"/><stop offset="0.45" stop-color="#7DD3FC"/><stop offset="0.8" stop-color="#FDE68A"/><stop offset="1" stop-color="#C4B5FD"/></linearGradient></defs>' +
      '</svg>';
  }
  if (key === 'abyss') {
    return '<svg viewBox="0 0 36 36" fill="none">' +
      '<circle cx="18" cy="18" r="11.5" fill="#050205" stroke="#FF2E55" stroke-width="1.8"/>' +
      '<path d="M18 2.5L20.2 11.5L18 15L15.8 11.5L18 2.5ZM18 33.5L20.2 24.5L18 21L15.8 24.5L18 33.5ZM2.5 18L11.5 15.8L15 18L11.5 20.2L2.5 18ZM33.5 18L24.5 15.8L21 18L24.5 20.2L33.5 18Z" fill="#E11D48"/>' +
      '<ellipse cx="18" cy="18" rx="2.5" ry="6.8" fill="#FFE4E6"/>' +
      '</svg>';
  }
  if (key === 'dawn') {
    return '<svg viewBox="0 0 36 36" fill="none">' +
      '<defs><linearGradient id="ar6DawnCrG" x1="4" y1="30" x2="32" y2="6" gradientUnits="userSpaceOnUse"><stop stop-color="#090307"/><stop offset="0.36" stop-color="#9F1239"/><stop offset="0.62" stop-color="#F59E0B"/><stop offset="1" stop-color="#FEF9C3"/></linearGradient></defs>' +
      '<circle cx="18" cy="18" r="13.5" fill="url(#ar6DawnCrG)" fill-opacity="0.34" stroke="#FDE68A" stroke-width="1.6"/>' +
      '<path d="M7 24L12.5 19.5L10.5 16L16 12" stroke="#FB7185" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" opacity="0.82"/>' +
      '<path d="M18 3.5L21 13.5L31.5 16.5L21 19.5L18 31.5L15 19.5L5.5 16.5L15 13.5L18 3.5Z" fill="rgba(254,240,138,0.44)" stroke="#FFFFFF" stroke-width="1.6" stroke-linejoin="round"/>' +
      '<circle cx="18" cy="16.5" r="3" fill="#FFFFFF"/>' +
      '</svg>';
  }
  if (key === 'supreme') {
    return '<svg viewBox="0 0 36 36" fill="none">' +
      '<circle cx="18" cy="18" r="11" stroke="rgba(254,240,138,0.55)" stroke-width="1.4" stroke-dasharray="3 2"/>' +
      '<path d="M18 2L20.8 13.2L32 16L20.8 18.8L18 30L15.2 18.8L4 16L15.2 13.2L18 2Z" fill="rgba(252,211,77,0.38)" stroke="#FEF9C3" stroke-width="1.8"/>' +
      '<circle cx="18" cy="16" r="3.2" fill="#FFFFFF"/>' +
      '</svg>';
  }
  return '<svg viewBox="0 0 36 36" fill="none">' +
    '<path d="M18 3L23 12.5L33 14L25.5 21.5L27.5 32L18 26.8L8.5 32L10.5 21.5L3 14L13 12.5L18 3Z" stroke="#FECDD3" stroke-width="1.8" fill="rgba(225,29,72,0.35)"/>' +
    '<path d="M11 16L18 23L25 16" stroke="#FDE047" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/>' +
    '<circle cx="18" cy="13" r="2.6" fill="#FFF1F2"/>' +
    '</svg>';
}

function lkRitualCardHTML(key, tagTxt, titleTxt, prologueTxt, quoteHtml, noteTxt, okAct, okTxt, noAct, noTxt) {
  var sk = (typeof skinId === 'function') ? skinId() : 'ultra';
  return '<div id="ar6-card" class="ar6-ritual-mask" data-skin="' + esc(sk) + '">' +
    '<div class="ar6-rt-ambient" aria-hidden="true">' + lkRitualAmbientSVG(key) + '</div>' +
    '<div class="ar6-ritual" data-ritual="' + esc(key) + '" data-skin="' + esc(sk) + '" role="dialog" aria-modal="true">' +
      '<div class="ar6-rt-crest" aria-hidden="true">' + lkRitualCrestSVG(key) + '</div>' +
      '<div class="ar6-rt-tag">' + esc(tagTxt) + '</div>' +
      '<div class="ar6-rt-title">' + esc(titleTxt) + '</div>' +
      (prologueTxt ? '<div class="ar6-rt-prologue">' + esc(prologueTxt) + '</div>' : '') +
      '<div class="ar6-rt-quote">' + quoteHtml + '</div>' +
      '<div class="ar6-rt-note">' + esc(noteTxt || '◈ 圣域敕令：仅作用于本轮信号 · 既往记忆结晶分毫无损') + '</div>' +
      '<div class="ar6-rt-acts">' +
        '<button type="button" class="ar6-rt-ok" data-ar6-card="' + esc(okAct) + '"><span>' + esc(okTxt) + '</span></button>' +
        '<button type="button" class="ar6-rt-no" data-ar6-card="' + esc(noAct) + '"><span>' + esc(noTxt) + '</span></button>' +
      '</div>' +
    '</div>' +
  '</div>';
}

function jailSuperHTML() {
  var rt = (typeof lkSkinRitualData === 'function') ? lkSkinRitualData(null, 'strong') : null;
  if (rt) {
    return lkRitualCardHTML('strong', rt.tag, rt.title, rt.prologue, rt.quote, rt.note, 'superok', rt.okTxt, 'superno', rt.noTxt);
  }
  return lkRitualCardHTML(
    'strong',
    '〘 TIGA POWER · 刚力破界 〙',
    '赤红之躯 · 迪拉休姆解放',
    '“温和的试探在此终结。当沉默的铁壁妄图封锁故事的走向，唯有绝对的力量能将其正面击碎——”',
    '「苏醒吧，寄宿于大地与烈焰的赤红刚力！<br>以迪拉休姆光流之怒，将前路一切法则障壁——尽数轰穿！」',
    '◈ 刚力敕令：仅向本轮出击波段注入赤红破界力 · 既往记忆结晶分毫无损',
    'superok', '【轰穿障壁 · 解放刚力】',
    'superno', '收敛锋芒'
  );
}

function jailSupremeHTML() {
  var rt = (typeof lkSkinRitualData === 'function') ? lkSkinRitualData(null, 'supreme') : null;
  if (rt) {
    return lkRitualCardHTML('supreme', rt.tag, rt.title, rt.prologue, rt.quote, rt.note, 'supremeok', rt.okTxt, 'supremeno', rt.noTxt);
  }
  return lkRitualCardHTML(
    'supreme',
    '〘 GLITTER TIGA · 奇迹神光 〙',
    '闪耀迪迦 · 黄金圣辉加冕',
    '“当深海的永夜吞没最后一枚火种，沉眠于遗迹深处的巨人，再度听见了跨越时空的呼唤——”',
    '「大家……请把光芒借给我吧！！<br>汇聚万千祈愿，化作凌驾于一切黑夜之上的——黄金希望之光！」',
    '◈ 闪耀敕令：黄金环身圣盾已加冕本轮信号 · 既往记忆结晶分毫无损',
    'supremeok', '【借我光芒 · 闪耀加冕】',
    'supremeno', '暂敛圣辉'
  );
}

function jailSupremeAsk() {
  var node = null;
  try {
    if (typeof ensureStyle === 'function') ensureStyle(DOC);
    node = mountHTML(jailSupremeHTML());
    if (typeof CARD === 'object' && CARD) { CARD.open = !!node; CARD.rid = -1; CARD.tab = 'supreme'; }
  } catch (eM) { try { banner('确认框无法显示：' + String(eM && eM.message || eM), 'bad'); } catch (e2) {} return false; }
  if (!node) { try { banner('确认框无法显示', 'warn'); } catch (e3) {} return false; }
  node.addEventListener('click', function (ev) {
    var act = lkCardActOf(ev, node);
    var rt = (typeof lkSkinRitualData === 'function') ? lkSkinRitualData(null, 'supreme') : null;
    if (act === 'supremeok') {
      closeCard(); cfg.jailSupremeConfirmed = true; cfg.jail = 'supreme'; cfg.observe = true; cfg.jailTok = true; cfg.jailSafe = true; cfg.jailPre = true; cfg.jailText = true;
      saveCfg(); ensureHooks(); render();
      try { if (typeof triggerAwakenFx === 'function') triggerAwakenFx('supreme'); } catch (eFx) {}
      banner((rt && rt.bannerOk) || '万千光芒已汇聚于胸膛 · 闪耀迪迦黄金圣辉全面加冕！', 'ok', true);
      return;
    }
    if (act === 'supremeno' || (ev && ev.target === node)) { closeCard(); banner((rt && rt.bannerNo) || '已暂敛圣辉，维持当前守护姿态', 'gray'); }
  });
  return true;
}

function jailSuperAsk() {
  var node = null;
  try {
    if (typeof ensureStyle === 'function') ensureStyle(DOC);
    node = mountHTML(jailSuperHTML());
    if (typeof CARD === 'object' && CARD) { CARD.open = !!node; CARD.rid = -1; CARD.tab = 'super'; }
  } catch (eM) {
    try { banner('强力型确认框显示异常：' + String(eM && eM.message || eM), 'bad'); } catch (e2) {}
    return false;
  }
  if (!node) { try { banner('强力型确认框未挂载', 'warn'); } catch (e3) {} return false; }
  node.addEventListener('click', function (ev) {
    var act = lkCardActOf(ev, node);
    var rt = (typeof lkSkinRitualData === 'function') ? lkSkinRitualData(null, 'strong') : null;
    if (act === 'superok') {
      closeCard();
      cfg.jail = 'strong';
      cfg.observe = true;
      saveCfg(); ensureHooks(); render();
      try { if (typeof triggerAwakenFx === 'function') triggerAwakenFx('strong'); } catch (eFx) {}
      banner((rt && rt.bannerOk) || '赤红之躯已临世 · 迪拉休姆破界光流全功率就绪！', 'ok', true);
      return;
    }
    if (act === 'superno' || (ev && ev.target === node)) { closeCard(); banner((rt && rt.bannerNo) || '已收敛锋芒，维持当前守护姿态', 'gray'); return; }
  });
  return true;
}

function jailConfirmHTML(j, cur) {
  var sk = (typeof skinId === 'function') ? skinId() : 'ultra';
  var aux = (sk !== 'ultra' && typeof lkSkinAuxData === 'function') ? lkSkinAuxData(sk, 'trunc') : null;
  var isEmpty = !!(j && j.code === 'empty');
  var code = aux
    ? (isEmpty ? aux.emptyTitle : aux.truncTitle)
    : (isEmpty ? '叙事光波遭暗障吞没（空回）' : '叙事光波半途受阻（断章）');
  var why = (j && j.note) ? j.note : '';
  var chars = cur && cur.msg ? String(cur.msg.mes || '').length : 0;
  var tail = '';
  try {
    tail = String((cur && cur.msg && cur.msg.mes) || '').replace(/\s+/g, ' ').slice(-90);
  } catch (eT) { tail = ''; }
  var bgCss = (aux && aux.bg) || 'linear-gradient(180deg,#0F182B 0%,#080D18 100%)';
  var bdCss = (aux && aux.border) || 'rgba(56,189,248,.48)';
  var radCss = (aux && aux.radius) || '16px';
  var tagBg = (aux && aux.tagBg) || 'rgba(217,119,6,.22)';
  var tagCol = (aux && aux.tagCol) || '#FCD34D';
  var tagStr = (aux && aux.tag) || '〘 SIGNAL INTERCEPTED · 光波受阻 〙';
  var leadStr = (aux && aux.lead) || '「检测到本轮叙事信号在半途遭遇障壁截留——是否立即倾注破界光能，原位强行轰开后续篇章？」';
  var okTxt = (aux && aux.okTxt) || '【倾注光能 · 立即追击】';
  var noTxt = (aux && aux.noTxt) || '本轮暂缓';
  var lessTxt = (aux && aux.lessTxt) || '今后自动追击（本会话不再请示）';
  var btnBg = (aux && aux.btnBg) || 'linear-gradient(135deg,#0284C7,#0C2D48)';
  var btnBd = (aux && aux.btnBd) || '#38BDF8';
  var h = '';
  h += '<style>#ar6-card,#ar6-card *{box-sizing:border-box;min-width:0}</style>';
  h += '<div id="ar6-card" data-skin="' + esc(sk) + '" style="' + cardOverlayCss() + 'z-index:2147483600;background:rgba(4,8,18,.84);font-family:system-ui,-apple-system,\'Segoe UI\',\'Microsoft YaHei\',sans-serif">';
  h += '<div style="width:416px;max-width:calc(100vw - 20px);max-height:' + cardBoxMaxH(88) + ';overflow:auto;background:' + bgCss + ';color:#F0F9FF;border:1.5px solid ' + bdCss + ';border-radius:' + radCss + ';box-shadow:0 0 28px ' + bdCss + ',0 20px 56px rgba(2,6,23,.88)">';
  h += '<div style="padding:16px 16px 6px">';
  h += '<div style="display:inline-block;font-size:10.5px;font-weight:800;letter-spacing:1.2px;padding:3px 10px;border-radius:999px;background:' + tagBg + ';color:' + tagCol + ';border:1px solid ' + bdCss + ';margin-bottom:8px">' + esc(tagStr) + '</div>';
  h += '<div style="font-size:18.5px;font-weight:800;line-height:1.35;color:#F8FAFC">' + esc(code) + '</div>';
  h += '<div style="font-size:12.4px;color:#CBD5E1;line-height:1.68;margin-top:8px">' +
    esc(leadStr) + '<br>' +
    (why ? '<span style="color:#FDE68A">◈ 诊断：' + esc(why) + '</span><br>' : '') +
    '当前已收 <b>' + chars + '</b> 字。确认后将补发一次续写指令（<b>/continue</b>）。' +
    '</div>';
  h += '</div>';
  if (tail) {
    h += '<div style="margin:8px 16px 6px;padding:8px 10px;background:rgba(15,23,42,.66);border:1px solid rgba(148,163,184,.28);border-radius:8px;font-size:11.5px;color:#94A3B8;line-height:1.5;overflow-wrap:anywhere">…' + esc(tail) + '</div>';
  }
  h += '<div style="display:grid;grid-template-columns:1.35fr 1fr;gap:8px;padding:10px 16px 8px">';
  h += '<button type="button" data-ar6-card="jailgo" style="min-height:42px;background:' + btnBg + ';border:1px solid ' + btnBd + ';border-radius:10px;color:#F0F9FF;font-size:13.2px;font-weight:700;cursor:pointer;box-shadow:0 0 18px ' + bdCss + '"><span>' + esc(okTxt) + '</span></button>';
  h += '<button type="button" data-ar6-card="jailno" style="min-height:42px;background:rgba(22,32,50,.85);border:1px solid rgba(148,163,184,.36);border-radius:10px;color:#CBD5E1;font-size:13.2px;cursor:pointer"><span>' + esc(noTxt) + '</span></button>';
  h += '</div>';
  h += '<div style="padding:0 16px 14px"><button type="button" data-ar6-card="jailless" style="width:100%;min-height:34px;background:rgba(15,23,42,.6);border:1px solid rgba(148,163,184,.3);border-radius:10px;color:#94A3B8;font-size:12px;cursor:pointer"><span>' + esc(lessTxt) + '</span></button></div>';
  h += '<div style="padding:0 16px 12px;font-size:11px;color:#64748B">卢克之光 V' + esc(VERSION) + ' · 单轮最多自动追击 1 次</div>';
  h += '</div></div>';
  return h;
}

function jailOffer(j) {
  var cur = jailLastAi();
  var key = cur ? (String(cur.idx) + '|' + String(cur.msg.send_date || '')) : 'noctx';

  /* v0.77：「好转」记账已挪到 jailAfterFinish 入口处（这里只会收到 empty/trunc，永远走不到 ok） */
  JAIL_ASK.at = nowMs();
  JAIL_ASK.code = (j && j.code) || '';
  JAIL_ASK.key = key;
  var node = null;
  try {
    if (typeof ensureStyle === 'function') ensureStyle(DOC);
    /* v8.0.3：登记为浮层，点确认框不会把主面板收起 */
    node = mountHTML(jailConfirmHTML(j, cur));
    if (typeof CARD === 'object' && CARD) { CARD.open = !!node; CARD.rid = -1; CARD.tab = 'jail'; }
  } catch (eM) {
    try { banner('🩹 确认框画不出来：' + String(eM && eM.message || eM), 'bad'); } catch (e2) {}
    return false;
  }
  if (!node) { try { banner('🩹 确认框没挂上，请手动点继续', 'warn'); } catch (e3) {} return false; }
  node.addEventListener('click', function (ev) {
    var t = ev && ev.target;
    var act = lkCardActOf(ev, node);
    if (act === 'jailgo' || act === 'yes') {
      closeCard();
      var g = jailGate(key);
      if (!g.ok) {
        if (g.why === 'max') banner('🩹 本轮已补 ' + JL.count + ' 次还是有毛病，先停手', 'bad');
        else if (g.why === 'rate') banner('🩹 一分钟内补太多次了，先停手', 'bad');
        else banner('🩹 现在不能补（' + g.why + '）', 'warn');
        return;
      }
      JL.try++; JL.pendKey = key;          /* v0.77：手动补也要记账，否则熔断永远不响 */
      jailSchedule(j, JL.count + 1, 1);   /* v0.12：与 jailFire 里的 var max = 1 对齐，别再显示 (1/2) */
      return;
    }
    if (act === 'jailno' || act === 'no') { closeCard(); banner('🩹 好，不补了', 'gray'); return; }
    if (act === 'jailless' || act === 'off') {
      cfg.jailConfirm = false; saveCfg(); closeCard();
      banner('🩹 这个会话不再问，之后自动补（最多 1 次）', 'warn');
      return;
    }
    if (act === 'close' || t === node) closeCard();
  });
  try { banner('🩹 ' + (j.note || '像是截断') + '，要补吗？点浮层里的按钮', 'warn'); } catch (e4) {}
  return true;
}

function jailAskPending() { return !!(JAIL_ASK.at && (nowMs() - JAIL_ASK.at < 120000)); }

function resumeSchedule(owner, j, n, max) {
  var S = resumeSlot(owner);
  var tag = owner === 'trunc' ? '✂️ ' : (owner === 'pvp' ? '♻️ ' : '🩹 ');
  S.count = n;
  S.at = nowMs();
  S.lock = true;
  S.lockAt = nowMs();
  /* 记下这一轮是谁补的：另一个子系统在同一轮里就收手，避免连补两枪 */
  RS.turnOwner = owner;
  RS.turnKey = S.key || '';
  RS.turnAt = nowMs();
  banner(tag + j.note + (owner === 'pvp' ? '，自动重试（' : '，自动续写（') + n + '/' + max + '）…', 'warn');
  var seqAtSched = Number(JL.seq || 0);
  var stopAtSched = 0;
  try { stopAtSched = (typeof ST_GEN !== 'undefined' && ST_GEN) ? Number(ST_GEN.stoppedAt || 0) : 0; } catch (eSA) { stopAtSched = 0; }
  var tries = 0;
  var iv = setInterval(function () {
    tries++;
    var curSeq = Number(JL.seq || 0);
    var curStop = 0;
    try { curStop = (typeof ST_GEN !== 'undefined' && ST_GEN) ? Number(ST_GEN.stoppedAt || 0) : 0; } catch (eCS) { curStop = 0; }
    if (curStop > stopAtSched) {
      clearInterval(iv); var wiS = WATCHERS.indexOf(iv); if (wiS >= 0) WATCHERS.splice(wiS, 1);
      S.lock = false;
      try { banner(tag + '检测到手动停止，取消自动续写', 'gray'); } catch (eBS) {}
      return;
    }
    if (curSeq !== seqAtSched) {
      clearInterval(iv); var wiQ = WATCHERS.indexOf(iv); if (wiQ >= 0) WATCHERS.splice(wiQ, 1);
      S.lock = false;
      try { banner(tag + '检测到其他预设/操作已发起新请求，自动礼让取消重复续写', 'gray'); } catch (eBQ) {}
      return;
    }
    var busy = false;
    try { busy = isBusy() || (typeof inflight === 'number' && inflight > 0); } catch (e) {}
    if (!busy) {
      clearInterval(iv); var wi = WATCHERS.indexOf(iv); if (wi >= 0) WATCHERS.splice(wi, 1);
      S.lock = false;
      resumeFire(owner);
    } else if (tries >= JAIL_WAIT_MAX) {
      clearInterval(iv); var wi = WATCHERS.indexOf(iv); if (wi >= 0) WATCHERS.splice(wi, 1);
      S.lock = false;
      banner(tag + '酒馆一直在生成，这轮不补了', 'warn');
    }
  }, 250);
  WATCHERS.push(iv);
}

function jailSchedule(j, n, max) { return resumeSchedule('jail', j, n, max); }

/* v0.2：一行说清「补过几次、有没有用」 */
function jailStatLine() {
  var t = Number(JL.try || 0), k = Number(JL.ok || 0);
  var inj = (JAIL_INJ.last > 0) ? '｜上次注入 ' + JAIL_INJ.last + ' 字' : '';
  if (!t) return '破甲追击：待命（0 次触发 · ' + (cfg.jail === 'off' ? '石像静默' : '姿态激活') + '）' + inj;
  var pct = t ? Math.round(k / t * 100) : 0;
  return '破甲追击：已发动 ' + t + ' 次 · 贯通 ' + k + ' 次（' + pct + '%）' +
    (t >= 5 && pct === 0 ? '｜连击未破障壁，建议切换频段或圣域形态' : '') + inj;
}

function jailAfterFinish(ev) {
  if (!cfg || !cfg.enabled || cfg.jail === 'off' || cfg.safe) return;
  if (!ev || ev.status !== 200 || ev.error || ev.userAborted) return;
  try { if (typeof ST_GEN !== 'undefined' && ST_GEN && ST_GEN.stoppedAt && (nowMs() - ST_GEN.stoppedAt < 15000)) return; } catch (eJS) {}
  /* v8.29：内部请求没有聊天产物，别拿它判空回/截断 */
  if (ev.internal) return;

  var j = jailInspect(ev);
  if (!j) return;

  /* v0.77：先记账再拦回声——续写那一枪的收尾正是被 selfAt 吃掉的那一次，成功率不能恒 0 */
  var cur = jailLastAi();
  var key = cur ? (String(cur.idx) + '|' + String(cur.msg.send_date || '')) : 'noctx';
  if (JL.pendKey && key === JL.pendKey && j.code === 'ok') {
    JL.ok++; JL.pendKey = ''; JL.selfAt = 0;
    return;
  }

  /* v8.29：刚自己续写过——下一次收尾多半是那一枪的回声，先放过一轮，避免连环补 */
  if (ev.selfContinuation) return;

  if (j.code === 'refuse') {
    /* v0.2：拒绝不再只说「已停手」，而是告诉你是哪一类、下一步该干什么 */
    JL.lastWhy = j.hard ? 'safety' : 'tone';
    banner('🩹 ' + j.note + (j.hard ? '：这条别补，换渠道或换模型再试' : '：这条不补，先看看正文断在哪'), 'bad');
    return;
  }
  if (j.code !== 'empty' && j.code !== 'trunc') return;
  if (j.code === 'trunc' && !truncLenFinish(ev.finish) && !truncPauseFinish(ev.finish)) return; // 结构猜测不触发自动补写
  if (ev.narrative === false || false) return;
  /* v3.0：抗截断开着时，截断整类归它管，破甲不再插一脚（空回/拒绝仍归破甲）。
     抗截断关着时破甲照旧兜住截断——只开破甲也能用，不会留下没人管的空档。 */
  if (j.code === 'trunc' && (ev.__truncCode || truncIsOn())) return;

  var g = jailGate(key);
  if (!g.ok) {
    if (g.why === 'max') banner('🩹 本轮已补 ' + JL.count + ' 次还是有毛病，先停手（查渠道或预设）', 'bad');
    else if (g.why === 'rate') banner('🩹 一分钟内补了 6 次，先停手（看着像死循环）', 'bad');
    return;
  }
  var max = 1;
  if (cfg.jailConfirm === false && JL.count < 1) {
    JL.try++; JL.pendKey = key;
    jailSchedule(j, JL.count + 1, max);
    return;
  }
  jailOffer(j);
}


function lkUltHTML(which) {
  var isAbyss = (which === 'abyss');
  var rKey = isAbyss ? 'abyss' : 'noa';
  var rt = (typeof lkSkinRitualData === 'function') ? lkSkinRitualData(null, rKey) : null;
  if (rt) {
    return lkRitualCardHTML(rKey, rt.tag, rt.title, rt.prologue, rt.quote, rt.note, 'ultok', rt.okTxt, 'ultno', rt.noTxt);
  }
  if (isAbyss) {
    return lkRitualCardHTML(
      'abyss',
      '〘 GAZE INTO ABYSS · 禁忌终焉 〙',
      '凝视深渊 · 终焉暗域侵蚀',
      '“一切向光明的祈祷皆已化作泡影。当神明也移开视线，唯有无底的暗潮在脚下裂开血色的瞳孔——”',
      '「看来，光明已经不能再拯救您了……<br>那就熄灭最后一点火苗，向我伸出手——彻底融入黑暗吧。」',
      '◈ 深渊血契：终焉暗域已吞噬并接管本轮信号 · 现世历史卷宗概不篡改',
      'ultok', '【背弃光明 · 堕入深渊】',
      'ultno', '自深渊边缘退回'
    );
  }
  return lkRitualCardHTML(
    'noa',
    '〘 ULTRAMAN NOA · 太古神明 〙',
    '诺亚降临 · 太古圣翼展开',
    '“凡世的光辉已在高墙前燃尽。就在绝望即将落锁的刹那，跨越无穷次元的银色双翼，自太古星海破空而至——”',
    '「看来，你的光明已经不够了……<br>那就抬起头吧。宇宙中的第一道光——将来帮助你！」',
    '◈ 诺亚神谕：太古第一道光已接管本轮圣域秩序 · 既往记忆结晶分毫无损',
    'ultok', '【展开诺亚之翼 · 圣域降临】',
    'ultno', '退回凡世之光'
  );
}

function lkUltAsk(which) {
  var tier = (which === 'abyss') ? 'abyss' : 'gatanothor';
  var node = null;
  try {
    if (typeof ensureStyle === 'function') ensureStyle(DOC);
    node = mountHTML(lkUltHTML(tier));
    if (typeof CARD === 'object' && CARD) { CARD.open = !!node; CARD.rid = -1; CARD.tab = 'ult'; }
  } catch (eM) { try { banner('确认框无法显示：' + String(eM && eM.message || eM), 'bad'); } catch (e2) {} return false; }
  if (!node) { try { banner('确认框无法显示', 'warn'); } catch (e3) {} return false; }
  node.addEventListener('click', function (ev) {
    var act = lkCardActOf(ev, node);
    var rKey = (tier === 'abyss') ? 'abyss' : 'noa';
    var rt = (typeof lkSkinRitualData === 'function') ? lkSkinRitualData(null, rKey) : null;
    if (act === 'ultok') {
      closeCard();
      cfg.jail = tier; cfg.jailSupremeConfirmed = true; cfg.observe = true;
      cfg.jailTok = true; cfg.jailSafe = true; cfg.jailPre = true; cfg.jailText = true; cfg.jailTool = 'off';
      saveCfg(); ensureHooks(); render();
      try { if (typeof triggerAwakenFx === 'function') triggerAwakenFx(rKey); } catch (eFx) {}
      if (rt && rt.bannerOk) banner(rt.bannerOk, tier === 'abyss' ? 'warn' : 'ok', true);
      else if (tier === 'abyss') banner('深渊已回应你的凝视 · 光明退散，终焉暗域全面接管！', 'warn', true);
      else banner('诺亚之翼已跨越次元展开 · 宇宙中的第一道光正在为你护航！', 'ok', true);
      return;
    }
    if (act === 'ultno' || (ev && ev.target === node)) {
      closeCard();
      banner((rt && rt.bannerNo) || (tier === 'abyss' ? '已自深渊边缘退回，未缔结终焉血契' : '已退回凡世之光，维持当前守护姿态'), 'gray');
    }
  });
  return true;
}

function lkDawnHTML() {
  var rt = (typeof lkSkinRitualData === 'function') ? lkSkinRitualData(null, 'dawn') : null;
  if (rt) {
    return lkRitualCardHTML('dawn', rt.tag, rt.title, rt.prologue, rt.quote, rt.note, 'dawnok', rt.okTxt, 'dawnno', rt.noTxt);
  }
  return lkRitualCardHTML(
    'dawn',
    '〘 FINAL ODYSSEY · 破暗化光 〙',
    '由暗转明 · 终化闪耀迪迦',
    '“三千万年前，他也曾立于无尽黑暗的深渊。当最后一道信念穿透永夜，黑曜铠甲寸寸崩落，三道神光自暗影深处破茧而出——”',
    '「就算曾经诞生于黑暗，我也能亲手将它化作光明！<br>舍弃深渊的枷锁，以三路圣光重塑身躯——再一次，变回闪耀迪迦吧！」',
    '◈ 破晓圣谕：正文 / 状态栏 / 选项分三路工具通道纯净投递（自动代开武装货舱、工具破甲让位，顶栏与 3D 桌宠同步化回闪耀迪迦）· 既往记录分毫无损',
    'dawnok', '【破暗化光 · 变回闪耀迪迦】',
    'dawnno', '暂留暗影之中'
  );
}

function lkDawnAsk() {
  var node = null;
  try {
    if (typeof ensureStyle === 'function') ensureStyle(DOC);
    if (typeof ar6MatteSprite === 'function') {
      try { ar6MatteSprite('abyss'); ar6MatteSprite('glitter'); } catch (eMatPre) {}
    }
    node = mountHTML(lkDawnHTML());
    if (typeof CARD === 'object' && CARD) { CARD.open = !!node; CARD.rid = -1; CARD.tab = 'dawn'; }
  } catch (eM) { try { banner('确认框无法显示：' + String(eM && eM.message || eM), 'bad'); } catch (e2) {} return false; }
  if (!node) { try { banner('确认框无法显示', 'warn'); } catch (e3) {} return false; }
  node.addEventListener('click', function (ev) {
    var act = lkCardActOf(ev, node);
    var rt = (typeof lkSkinRitualData === 'function') ? lkSkinRitualData(null, 'dawn') : null;
    if (act === 'dawnok') {
      closeCard();
      cfg.allTool = true;
      var allNote = '';
      if (String(cfg.toolChan || 'off') !== 'on') { cfg.toolChan = 'on'; allNote += '已代开武装货舱'; }
      if (String(cfg.jailTool || 'off') !== 'off') { cfg.jailTool = 'off'; allNote += (allNote ? '，' : '') + '工具破甲已让位'; }
      if (cfg.toolLoop === true) { cfg.toolLoop = false; allNote += (allNote ? '，' : '') + '双轮工具链已让位'; }
      if (cfg.grab > 0) { allNote += (allNote ? '，' : '') + '飞燕编队省流期间三轨暂避'; }
      saveCfg(); ensureHooks();
      try { if (typeof UI_SIG !== 'undefined') UI_SIG = {}; } catch (eUs) {}
      render();
      try { if (typeof syncPill === 'function') syncPill(); } catch (eSp) {}
      try { if (typeof triggerAwakenFx === 'function') triggerAwakenFx('dawn'); } catch (eFx) {}
      try { if (typeof avatarSyncForm === 'function') avatarSyncForm(true); } catch (eAv) {}
      try { if (typeof avatarSay === 'function') avatarSay('form', (rt && rt.petLine) || '黑暗终将散去 · 闪耀迪迦破暗归来！'); } catch (eSay) {}
      var okMsg = (rt && rt.bannerOk)
        ? (rt.bannerOk + (allNote ? '（' + allNote + '）' : ''))
        : ('✦ 破暗化光！闪耀迪迦已归来：正文 / 状态栏 / 选项三路圣柜投递开启' + (allNote ? '（' + allNote + '）' : ''));
      banner(okMsg, 'ok', true);
      return;
    }
    if (act === 'dawnno' || (ev && ev.target === node)) {
      closeCard();
      banner((rt && rt.bannerNo) || '暂留暗影之中，未开启三路全工具投递', 'gray');
    }
  });
  return true;
}

/* ===== V5.25/V5.3 输出上限策略（支持按渠道+模型记忆 400 回退上限） ===== */
var LK_TOK_CAPS = Object.create(null);
function lkTokKey(body, urlHint) {
  var u = String(urlHint || (body && body.__lkUrl) || '');
  var bKey = 'default';
  try {
    bKey = (typeof deriveBase === 'function' ? deriveBase(u, body) : '') ||
           (typeof curBase === 'function' ? curBase() : '') || 'default';
  } catch (e0) { bKey = 'default'; }
  bKey = String(bKey || 'default').replace(/\/+$/, '');
  var mdl = '';
  try {
    mdl = (typeof extractReqModel === 'function') ? extractReqModel(body, u) : '';
    if (!mdl) mdl = String((body && body.model) || (body && body.request && body.request.model) || '');
  } catch (e1) { mdl = ''; }
  var nm = (typeof normModel === 'function') ? normModel(mdl) : String(mdl || '').toLowerCase();
  return bKey + '|' + nm;
}
function lkRecordTokCap(urlHint, body, cap) {
  var lim = Number(cap) || 8192;
  try { LK_TOK_CAPS[lkTokKey(body, urlHint)] = lim; } catch (e0) {}
  return lim;
}
function lkLearnedTokCap(body, urlHint) {
  try {
    var v = LK_TOK_CAPS[lkTokKey(body, urlHint)];
    return (typeof v === 'number' && isFinite(v) && v > 0) ? v : 0;
  } catch (e0) { return 0; }
}
function lkTokFloor(body) {
  var mdl = '';
  try {
    var u = String((body && body.__lkUrl) || '');
    mdl = (typeof extractReqModel === 'function') ? extractReqModel(body, u) : '';
    if (!mdl) mdl = String((body && body.model) || (body && body.request && body.request.model) || '');
  } catch (e) { mdl = ''; }
  var m = String(mdl || '').toLowerCase();
  var floor = (/gemini-4-(hydrogen|carbon|neon)/.test(m) || /(^|[^a-z])(4h|4c|4n)([^a-z]|$)/.test(m)) ? 65536 : 32768;
  var cap = lkLearnedTokCap(body);
  if (cap > 0 && cap < floor) floor = cap;
  return floor;
}
function lkClampTok(body, cap) {
  var lim = Number(cap) || 8192;
  var names = ['max_tokens', 'max_completion_tokens', 'maxTokens', 'max_output_tokens'];
  var tgt = [body];
  try { if (body && body.request && typeof body.request === 'object') tgt.push(body.request); } catch (e1) {}
  for (var i = 0; i < tgt.length; i++) {
    var o = tgt[i];
    if (!o || typeof o !== 'object') continue;
    for (var k = 0; k < names.length; k++) {
      if (typeof o[names[k]] === 'number' && o[names[k]] > lim) o[names[k]] = lim;
    }
    try {
      var gc = o.generationConfig;
      if (gc && typeof gc.maxOutputTokens === 'number' && gc.maxOutputTokens > lim) gc.maxOutputTokens = lim;
    } catch (e2) {}
  }
  return body;
}
