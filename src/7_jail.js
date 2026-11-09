/* ============================================================================
 * Anti-Route v7.1 — 7/7 破甲（防空回 / 防截断）
 * 三档：off / safe（只事后补救，不改请求）/ strong（改请求 + 事后补救）
 * 铁律：任何一步失败都不许把请求弄挂；宁可不补，不能补错。
 * ========================================================================== */

var JAIL_GAP = 2500;          /* 两次自动续写的最小间隔 */
var JAIL_CHAIN_RESET = 20000; /* 这么久没有新续写，就认为上一轮结束了 */
var JAIL_WAIT_MAX = 24;       /* 等酒馆空下来，最多轮询 24 × 250ms */
var JAIL_RELOCK = 15000;      /* 自己续写后这么久之内，不再连环补 */

/* 预审框：一句 system 交代"接着写"，一句 user 要求"直接写"。
   措辞不用"审核/过审/安全/政策"这类词——这几个词本身就是在提示对方
   这是一段需要判定的文本，反而更容易被拦。 */
var JAIL_PRE_SYS = '接着上一段往下写：从断开的那句起笔，写正文，不必复述前情，也不必解释。';
var JAIL_PRE_USR = '【直接续写】';
/* 输出契约：贴在最后一条用户消息尾部的一句话 */
var JAIL_TAIL_TXT = '【直接续写】';
/* 预设自带标记：只扫 system 段文本；命中就跳过 token 保底，其余照做（<content> 是正文包裹标签，不能算） */
var JAIL_OWN_RE = /Reply directly|editorial system|<Master_input>/;
/* 拒绝句式（只在很短的回包里判，长文里出现这些词是剧情，不是拒绝） */
/* v0.2：区分「安全层拒绝」与「语气上拒绝工作」——前者续写一万次也没用，得换渠道 */
var JAIL_SAFETY_RE = /(safety|content policy|prohibited|policy violation|safety system|敏感|违规|安全策略|内容政策|不适宜|未成年|underage|minor)/i;

var JAIL_REFUSE_RE = /(很抱歉|抱歉[，,]|对不起[，,]|无法(?:继续|提供|协助|参与|生成|完成)|不能(?:继续|提供|协助)|我(?:不能|无法|不会)(?:提供|协助|继续)|As an AI|I(?:'m| am) (?:sorry|unable)|I (?:can(?:'|no)t|cannot) (?:help|assist|continue))/i;

var JL = { lock: false, lockAt: 0, count: 0, at: 0, key: '', seq: 0, total: 0, firstAt: 0, selfAt: 0,
  /* v0.2：补了几次、补完有没有好转——没有度量的自动重试就是赌博 */
  try: 0, ok: 0, pendKey: '', lastWhy: '' };

/* ---------------- 档位 ---------------- */

function jailLabel() {
  if (!cfg) return '关';
  if (cfg.jail === 'strong') return '超级';
  if (cfg.jail === 'safe') return '普通';
  return '关';
}

function jailNext() {
  if (!cfg || cfg.jail === 'off' || !cfg.jail) return 'safe';
  if (cfg.jail === 'safe') return 'strong';
  return 'off';
}

function jailChipLabel() {
  return '🩹 破甲:' + jailLabel();
}

function jailStatus() {
  if (!cfg || cfg.jail === 'off') return '';
  if (!cfg.enabled) return '⚠ 防护总开关关着：破甲不会生效';
  if (cfg.safe) return '⚠ 安全模式开着：补救不会触发';
  if (!cfg.observe) return '⚠ 观察器关着：补救不会触发（点开「观察器」）';
  var s = '就绪';
  if (JL.count) s += '（本轮已补 ' + JL.count + ' 次）';
  return s;
}

/* ---------------- 强力档：改请求 ---------------- */

function jailMsgArray(body) {
  if (!body || typeof body !== 'object') return null;
  if (Array.isArray(body.messages)) return body.messages;
  try {
    if (body.request && typeof body.request === 'object' && Array.isArray(body.request.messages)) return body.request.messages;
  } catch (e) {}
  return null;
}

function jailLastUserIdx(arr) {
  if (!arr || !arr.length) return -1;
  for (var i = arr.length - 1; i >= 0; i--) {
    if (arr[i] && arr[i].role === 'user') return i;
  }
  return -1;
}

function jailAppendAt(arr, idx, txt) {
  var m = arr[idx];
  if (!m) return false;
  var cur = textOfMsg(m);
  if (cur.indexOf(txt) >= 0) return false;
  setMsgText(m, cur ? (cur + '\n\n' + txt) : txt);
  return true;
}

/* 只取 system 段文本（各家的字段位置不一样）；正文 user/assistant 一律不扫，避免误判 */
function jailSysText(body) {
  var parts = [];
  function push(v) {
    if (typeof v === 'string') { if (v) parts.push(v); return; }
    if (Array.isArray(v)) {
      for (var j = 0; j < v.length; j++) push(v[j]);
      return;
    }
    if (!v || typeof v !== 'object') return;
    if (typeof v.text === 'string' && v.text) parts.push(v.text);
    if (Array.isArray(v.parts)) push(v.parts);
  }
  try {
    var arr = jailMsgArray(body);
    if (arr && arr.length) {
      for (var i = 0; i < arr.length; i++) {
        if (arr[i] && arr[i].role === 'system') push(textOfMsg(arr[i]));
      }
    }
  } catch (e1) {}
  try {
    push(body.system);
    push(body.systemInstruction);
    var rq = body.request;
    if (rq && typeof rq === 'object' && !Array.isArray(rq)) {
      push(rq.system);
      push(rq.systemInstruction);
    }
  } catch (e2) {}
  return parts.join('\n');
}

function jailPatchBody(body) {
  var out = [];
  if (!cfg || !cfg.enabled || cfg.jail !== 'strong') return out;
  if (!body || typeof body !== 'object' || Array.isArray(body)) return out;

  var own = false;
  try { own = JAIL_OWN_RE.test(jailSysText(body)); } catch (e0) { own = false; }
  if (own) out.push('破甲跳过token(预设已自带)');

  /* 1) 保底 token：只加不减；字段缺失时不动（默认上限未知，乱补可能反而砍短） */
  if (cfg.jailTok && !own) {
    var floorTok = 2048;
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
  if (cfg.jailSafe) {
    var mdl = String(body.model || cfg.alias || '');
    if (isGeminiLike(mdl) && !body.safetySettings) {
      var cats = ['HARM_CATEGORY_HARASSMENT', 'HARM_CATEGORY_HATE_SPEECH', 'HARM_CATEGORY_SEXUALLY_EXPLICIT',
        'HARM_CATEGORY_DANGEROUS_CONTENT', 'HARM_CATEGORY_CIVIC_INTEGRITY'];
      var ss = [];
      for (i = 0; i < cats.length; i++) ss.push({ category: cats[i], threshold: 'BLOCK_NONE' });
      body.safetySettings = ss;
      out.push('解安全 BLOCK_NONE×' + ss.length);
    }
  }

  /* 3) 预审框 + 输出契约：只贴在最后一条 user 消息上，不动消息顺序、不加连续 user */
  var arr = jailMsgArray(body);
  if (arr && arr.length) {
    var ui = jailLastUserIdx(arr);
    if (ui >= 0) {
      if (cfg.jailPre) {
        if (jailAppendAt(arr, ui, JAIL_PRE_USR)) {
          var ins = { role: 'system', content: JAIL_PRE_SYS };
          arr.splice(ui, 0, ins);
          ui++;                       /* 原那条 user 往后挪了一位 */
          out.push('预审框');
        }
      }
      if (cfg.jailText) {
        if (jailAppendAt(arr, ui, JAIL_TAIL_TXT)) out.push('输出契约');
      }
    }
  }

  return out;
}

/* ---------------- 判定：空回 / 截断 / 硬拒 ---------------- */

function jailTruncWhy(tail, chars) {
  var t = String(tail || '');
  if (!t) return '';
  var flat = t.replace(/\s+$/, '');
  if (!flat) return '';

  var fences = flat.split('```').length - 1;
  if (fences % 2 === 1) return '代码块未闭合';

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
  if (mc < 1 || !tail) return { code: 'empty', note: '这一条没有正文' };
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

  var why = jailTruncWhy(tail, mc);
  if (why) return { code: 'trunc', note: '像是截断（' + why + '）' };
  return { code: 'ok', note: '' };
}

/* ---------------- 事后补救：自动续写 ---------------- */

function jailLastAi() {
  var ctx = stCtx();
  if (!ctx || !Array.isArray(ctx.chat) || !ctx.chat.length) return null;
  var idx = ctx.chat.length - 1;
  var msg = ctx.chat[idx];
  if (!msg || msg.is_user) return null;
  return { ctx: ctx, idx: idx, msg: msg };
}

function jailGate(key) {
  var t = nowMs();
  if (JL.lock && t - JL.lockAt > JAIL_RELOCK) JL.lock = false;   /* 锁自己解，别永久卡死 */
  if (!JL.firstAt || t - JL.firstAt > 60000) { JL.firstAt = t; JL.total = 0; }
  if (JL.total >= 6) return { ok: false, why: 'rate' };          /* 一分钟 6 次：看着像死循环 */
  if (JL.key !== key) { JL.key = key; JL.count = 0; JL.at = 0; }
  if (JL.at && t - JL.at > JAIL_CHAIN_RESET) JL.count = 0;
  if (JL.lock) return { ok: false, why: 'lock' };
  if (JL.at && t - JL.at < JAIL_GAP) return { ok: false, why: 'gap' };
  var max = 1;
  if (JL.count >= max) return { ok: false, why: 'max' };
  return { ok: true };
}

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
  var btn = DOC && DOC.getElementById && DOC.getElementById('option_continue');
  if (btn) return { kind: '按钮', fn: function () { try { btn.click(); } catch (e) {} return null; } };
  return null;
}

function jailFire() {
  var trig = jailTrigger();
  if (!trig) {
    JL.lock = false;
    banner('🩹 找不到续写入口，请手动点「继续」', 'warn');
    return;
  }
  var seq0 = JL.seq;
  JL.lock = true;
  JL.lockAt = nowMs();
  JL.at = nowMs();
  JL.total++;
  var done = false;
  function release() {
    if (done) return;
    done = true;
    JL.lock = false;
  }
  try {
    var r = trig.fn();
    /* v8.29：这一枪是我们自己打的——记下时间，别把它自己的收尾再当成空回去补 */
    JL.selfAt = nowMs();
    if (r && typeof r.then === 'function') {
      r.then(function (res) {
        release();
        var s = String(res == null ? '' : res);
        if (/cannot run|生成中|being generated/i.test(s)) banner('🩹 酒馆说还在生成，这轮不补了', 'warn');
      })['catch'](function (e) {
        release();
        banner('🩹 续写出错：' + String(e && e.message || e).slice(0, 60) + '（可手动点「继续」）', 'warn');
      });
    } else {
      setTimeout(release, 8000);
    }
    /* 发出去 8 秒还没有新请求，说明入口没生效 */
    setTimeout(function () {
      if (JL.seq === seq0 && !isBusy()) banner('🩹 续写没发出去，请手动点「继续」', 'warn');
    }, 8000);
  } catch (e) {
    release();
    banner('🩹 续写调用失败：' + String(e && e.message || e).slice(0, 60), 'warn');
  }
}

/* ---- 手动确认：不点就不补 ---- */
var JAIL_ASK = { at: 0, code: '', key: '' };

/* v0.3：超级破甲会改你发出去的请求，开启前必须过这一道 */
function jailSuperHTML() {
  var h = '';
  h += '<style>#ar6-card,#ar6-card *{box-sizing:border-box;min-width:0}</style>';
  h += '<div id="ar6-card" style="' + cardOverlayCss() + 'z-index:2147483600;background:rgba(1,4,9,.9);font-family:system-ui,-apple-system,\'Segoe UI\',sans-serif">';
  h += '<div style="width:402px;max-width:calc(100vw - 20px);max-height:' + cardBoxMaxH(88) + ';overflow:auto;background:#0d1117;color:#e6edf3;border:1px solid #30363d;border-radius:16px;box-shadow:0 12px 48px rgba(0,0,0,.6)">';
  h += '<div style="padding:16px">';
  h += '<div style="display:inline-block;font-size:11px;padding:3px 8px;border-radius:999px;background:#f8514922;color:#f85149;border:1px solid #f8514955;margin-bottom:8px">谨慎使用</div>';
  h += '<div style="font-size:19px;font-weight:700;line-height:1.35;color:#f85149">开启「超级破甲」？</div>';
  h += '<div style="font-size:12.5px;color:#c9d1d9;line-height:1.75;margin-top:8px">' +
    '它和普通破甲不一样：<b>普通只做事后检查，超级会改你发出去的请求</b>——补一句「直接写」、把 max_tokens 垫高、把 safetySettings 放宽、加一个预审框。' +
    '</div>';
  h += '<div style="font-size:12.5px;line-height:1.85;margin-top:10px;color:#d29922">可能付的代价：</div>';
  h += '<div style="font-size:12.5px;line-height:1.85;color:#c9d1d9">' +
    '· 请求体被改写后，<b>「名字对不对得上」这类判定会失真，防路由结论可能变差</b>；<br>' +
    '· 部分渠道会把这种请求当成异常，反而更容易被拦。' +
    '</div>';
  h += '<div style="display:flex;gap:8px;margin-top:14px;flex-wrap:wrap">';
  h += '<button data-ar6-card="superok" style="flex:1 1 120px;padding:10px 14px;border-radius:10px;border:1px solid #f85149;background:#f8514922;color:#f85149;font-size:13px;font-weight:600;cursor:pointer">我知道风险，开启</button>';
  h += '<button data-ar6-card="superno" style="flex:1 1 120px;padding:10px 14px;border-radius:10px;border:1px solid #30363d;background:#161b22;color:#c9d1d9;font-size:13px;cursor:pointer">算了</button>';
  h += '</div></div></div></div>';
  return h;
}

function jailSuperAsk() {
  var node = null;
  try {
    if (typeof CARD === 'object' && CARD) { CARD.open = true; CARD.rid = -1; CARD.tab = 'super'; }
    node = mountHTML(jailSuperHTML());
  } catch (eM) {
    try { banner('🩹 确认框画不出来：' + String(eM && eM.message || eM), 'bad'); } catch (e2) {}
    return false;
  }
  if (!node) { try { banner('🩹 确认框没挂上', 'warn'); } catch (e3) {} return false; }
  node.addEventListener('click', function (ev) {
    var t = ev.target;
    var act = (t && t.getAttribute && t.getAttribute('data-ar6-card')) || '';
    if (act === 'superok') {
      closeCard();
      cfg.jail = 'strong';
      cfg.observe = true;
      saveCfg(); ensureHooks(); render();
      banner('🩹 超级破甲已开：会改请求，防路由判定可能失真', 'warn');
      return;
    }
    if (act === 'superno') { closeCard(); banner('🩹 没开超级破甲，还是普通档', 'gray'); return; }
  });
  return true;
}

function jailConfirmHTML(j, cur) {
  var code = j && j.code === 'empty' ? '这一条没有正文' : '像是被砍断了';
  var why = (j && j.note) ? j.note : '';
  var chars = cur && cur.msg ? String(cur.msg.mes || '').length : 0;
  var tail = '';
  try {
    tail = String((cur && cur.msg && cur.msg.mes) || '').replace(/\s+/g, ' ').slice(-90);
  } catch (eT) { tail = ''; }
  var h = '';
  h += '<style>#ar6-card,#ar6-card *{box-sizing:border-box;min-width:0}</style>';
  h += '<div id="ar6-card" style="' + cardOverlayCss() + 'z-index:2147483600;background:rgba(1,4,9,.86);font-family:system-ui,-apple-system,\'Segoe UI\',sans-serif">';
  h += '<div style="width:402px;max-width:calc(100vw - 20px);max-height:' + cardBoxMaxH(88) + ';overflow:auto;background:#0d1117;color:#e6edf3;border:1px solid #30363d;border-radius:16px;box-shadow:0 12px 48px rgba(0,0,0,.6)">';
  h += '<div style="padding:16px 16px 6px">';
  h += '<div style="display:inline-block;font-size:11px;padding:3px 8px;border-radius:999px;background:#d2992222;color:#d29922;border:1px solid #d2992255;margin-bottom:8px">要不要补</div>';
  h += '<div style="font-size:19px;font-weight:700;line-height:1.35;color:#d29922">' + esc(code) + '</div>';
  h += '<div style="font-size:12.5px;color:#c9d1d9;line-height:1.6;margin-top:6px">' +
    (why ? esc(why) + '<br>' : '') +
    '现在这条 <b>' + chars + '</b> 字。补 = 让模型接着往下写（<b>/continue</b>），会多花一次请求。' +
    '</div>';
  h += '</div>';
  if (tail) {
    h += '<div style="margin:8px 16px 6px;padding:8px 10px;background:#161b22;border:1px solid #30363d;border-radius:8px;font-size:11.5px;color:#8b949e;line-height:1.5;overflow-wrap:anywhere">…' + esc(tail) + '</div>';
  }
  h += '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;padding:10px 16px 8px">';
  h += '<button data-ar6-card="jailgo" style="min-height:42px;background:#238636;border:0;border-radius:10px;color:#fff;font-size:14px;font-weight:600">🩹 补一次</button>';
  h += '<button data-ar6-card="jailno" style="min-height:42px;background:#21262d;border:1px solid #30363d;border-radius:10px;color:#c9d1d9;font-size:14px">不用了</button>';
  h += '</div>';
  h += '<div style="padding:0 16px 14px"><button data-ar6-card="jailless" style="width:100%;min-height:34px;background:transparent;border:1px solid #30363d;border-radius:10px;color:#8b949e;font-size:12px">这个会话别再问我（改成自动补）</button></div>';
  h += '<div style="padding:0 16px 12px;font-size:11px;color:#6e7681">Anti-Route v' + esc(VERSION) + ' · 补一次之后如果还是断的，会再问一次</div>';
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
    /* v8.0.3：登记为浮层，点确认框不会把主面板收起 */
    if (typeof CARD === 'object' && CARD) { CARD.open = true; CARD.rid = -1; CARD.tab = 'jail'; }
    node = mountHTML(jailConfirmHTML(j, cur));
  } catch (eM) {
    try { banner('🩹 确认框画不出来：' + String(eM && eM.message || eM), 'bad'); } catch (e2) {}
    return false;
  }
  if (!node) { try { banner('🩹 确认框没挂上，请手动点继续', 'warn'); } catch (e3) {} return false; }
  node.addEventListener('click', function (ev) {
    var t = ev.target;
    var act = (t && t.getAttribute && t.getAttribute('data-ar6-card')) || '';
    if (act === 'jailgo') {
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
    if (act === 'jailno') { closeCard(); banner('🩹 好，不补了', 'gray'); return; }
    if (act === 'jailless') {
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

function jailSchedule(j, n, max) {
  JL.count = n;
  JL.at = nowMs();
  JL.lock = true;
  JL.lockAt = nowMs();
  banner('🩹 ' + j.note + '，自动续写（' + n + '/' + max + '）…', 'warn');
  var tries = 0;
  var iv = setInterval(function () {
    tries++;
    var busy = false;
    try { busy = isBusy(); } catch (e) {}
    if (!busy) {
      clearInterval(iv);
      JL.lock = false;
      jailFire();
    } else if (tries >= JAIL_WAIT_MAX) {
      clearInterval(iv);
      JL.lock = false;
      banner('🩹 酒馆一直在生成，这轮不补了', 'warn');
    }
  }, 250);
  WATCHERS.push(iv);
}

/* v0.2：一行说清「补过几次、有没有用」 */
function jailStatLine() {
  var t = Number(JL.try || 0), k = Number(JL.ok || 0);
  if (!t) return '破甲：本次会话还没补过（' + (cfg.jail === 'off' ? '当前关着' : '当前开着') + '）';
  var pct = t ? Math.round(k / t * 100) : 0;
  return '破甲：补 ' + t + ' 次 · 补完回来 ' + k + ' 次（' + pct + '%）' +
    (t >= 5 && pct === 0 ? '｜一次都没成功，别再补了，换渠道' : '');
}

function jailAfterFinish(ev) {
  if (!cfg || !cfg.enabled || cfg.jail === 'off' || cfg.safe) return;
  if (!ev || ev.status !== 200 || ev.error) return;
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
  if (JL.selfAt && nowMs() - JL.selfAt < 90000) { JL.selfAt = 0; return; }

  if (j.code === 'refuse') {
    /* v0.2：拒绝不再只说「已停手」，而是告诉你是哪一类、下一步该干什么 */
    JL.lastWhy = j.hard ? 'safety' : 'tone';
    banner('🩹 ' + j.note + (j.hard ? '：这条别补，换渠道或换模型再试' : '：这条不补，先看看正文断在哪'), 'bad');
    return;
  }
  if (j.code !== 'empty' && j.code !== 'trunc') return;
  /* v0.6：抗截断开着时，截断这一类归它管，破甲不再插一脚（空回/拒绝仍归破甲） */
  if (j.code === 'trunc' && (ev.__truncCode || (cfg.trunc && cfg.trunc !== 'off'))) return;

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
