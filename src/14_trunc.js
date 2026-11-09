/* ===== 14_trunc.js — 卢克之光 V0.7 抗截断（关 / 轻档 v2 / 中档） =====
   两层职责，别混：

   A. 事后判定（v0.6 那套，原样保留）
   - 关   ：不看、不说、不动。零开销。
   - 轻档 ：只说这一轮为什么停（提示一行），不补。
   - 中档 ：len / cut / pause 三类自动补一次；gate 与 unfinished 绝不补。
   补写复用破甲的 jailGate / jailSchedule / jailFire / jailLastAi——
   两个模块共用同一个「单轮 1 次」预算，天然不会互撞。

   B. 事前注入（v0.7 轻档 v2 新增）
   在请求副本的末条 user 消息尾部贴一段提示词，四层：
   - L1 字数锚   ：正文净字数不少于 N（0 字=关）
   - L2 收尾契约 ：停在动作/选择/后果上，不总结不升华不预告，结尾不得是台词
   - L3 反自我认证：不写「以上就是」这类收尾话，不自报字数
   - F  填充锚   ：每 N 段插一条 <math> 包裹的短题（默认关）
   三条铁律：
   1) 独立 tag（〔AR-TRUNC 1.0〕…〔/AR-TRUNC〕），每轮先剥旧块再追加，连调 N 次只有一块；
   2) 只改 JSON.parse 出来的请求副本，聊天记录一个字节都不动；
   3) 整份文案禁用四个禁词（清单见 _plan/轻档v2_方法 的 §7.2 铁律）：
      7_jail.js:18 的 JAIL_OWN_RE 拿整份 body 匹配，命中一次就整段静默跳过破甲。
      所以填充锚只写 <math>，绝不写别的尖括号标签——别的尖括号标签会把禁词一并带进正文。
*/

var TRUNC_OFF = 'off';
var TRUNC_LIGHT = 'light';
var TRUNC_MEDIUM = 'medium';

/* 中档只补这三类：gate 补了也是同样结果；unfinished 分不清手动停止与断流，宁可不动 */
var TRUNC_FIX = { len: 1, cut: 1, pause: 1 };

/* 本会话：最近一次停止原因 + 中档补过几次（和 JL 一样，不落盘） */
var TR = { code: '', note: '', at: 0, try: 0 };

/* ---------------- 注入块：tag / 白名单 / 上限 ---------------- */

var TRUNC_TAG = 'AR-TRUNC';
var TRUNC_VER = '1.0';
var TRUNC_OPEN = '〔AR-TRUNC ' + TRUNC_VER + '〕';
var TRUNC_CLOSE = '〔/AR-TRUNC〕';
var TRUNC_PAD_OPEN = '〔AR-PAD 1.0〕';
var TRUNC_PAD_CLOSE = '〔/AR-PAD〕';
/* 字数锚只有这四个合法值：0=关 / 800 / 1200（默认）/ 1800 */
var TRUNC_LENS = [0, 800, 1200, 1800];
/* 显示层剥离的循环上限：正常最多 1 条填充块，32 是防畸形输入的硬闸 */
var TRUNC_PAD_LOOP_MAX = 32;
/* 一次剥块最多剥几轮：正常只有 1 块，8 是历史残留的安全垫 */
var TRUNC_STRIP_LOOP = 8;

/* v0.7：面板上说人话。
   TR.note 里留着技术原文（报告卡 / 导出记录是给别人的硬证据），
   这里只负责把 code 翻成一句用户看得懂的话——不出现 max_tokens / finish 这类词。 */
var TRUNC_HUMAN = {
  gate: '被上游拦了，补不出来',
  len: '写到上限了，句子是完整的',
  pause: '上游要求继续',
  cut: '停在半句',
  unfinished: '看不出断，先不动'
};

function truncHuman(code, lv) {
  var s = TRUNC_HUMAN[code] || '';
  if (code === 'cut') {
    if (lv === TRUNC_MEDIUM) s = '停在半句，已经让它接着写';
    else s = '停在半句（轻档只提醒，不补）';
  }
  return s;
}

/* ---------------- 档位 ---------------- */

function truncLevel(v) {
  return (v === TRUNC_LIGHT || v === TRUNC_MEDIUM) ? v : TRUNC_OFF;
}

function truncLabel(v) {
  var x = truncLevel(v);
  if (x === TRUNC_MEDIUM) return '中档';
  if (x === TRUNC_LIGHT) return '轻档';
  return '关';
}

/* 面板 chip：关 → 轻档 → 中档 → 关 */
function truncNext(v) {
  var x = truncLevel(v);
  if (x === TRUNC_OFF) return TRUNC_LIGHT;
  if (x === TRUNC_LIGHT) return TRUNC_MEDIUM;
  return TRUNC_OFF;
}

function truncChipLabel() {
  return '✂️ 抗截断:' + truncLabel(cfg ? cfg.trunc : TRUNC_OFF);
}

/* ---------------- 字数锚（0 / 800 / 1200 / 1800） ---------------- */

function truncLenOf(v) {
  var n = Number(v);
  if (n === 0 || n === 800 || n === 1200 || n === 1800) return n;
  return 1200;
}

/* 面板 chip：0 → 800 → 1200 → 1800 → 0 */
function truncLenNext(v) {
  var n = truncLenOf(v);
  var i;
  for (i = 0; i < TRUNC_LENS.length; i++) {
    if (TRUNC_LENS[i] === n) return TRUNC_LENS[(i + 1) % TRUNC_LENS.length];
  }
  return 800;
}

/* 写配置唯一入口：非法值一律回落 1200（sanitize 与面板共用） */
function truncLenSet(v) {
  var n = truncLenOf(v);
  if (cfg) cfg.truncLen = n;
  return n;
}

function truncLenLabel(v) {
  var n = truncLenOf(v == null && cfg ? cfg.truncLen : v);
  return n > 0 ? ('字数 ' + n) : '字数关';
}

function truncLenChipLabel() {
  return '📏 字数锚:' + (truncLenOf(cfg ? cfg.truncLen : 1200) || '关');
}

/* ---------------- 配置消毒 ---------------- */

function sanitizeTrunc(d) {
  if (!d || typeof d !== 'object') return;
  d.trunc = truncLevel(d.trunc);
  d.truncTail = d.truncTail !== false;
  d.truncNoCert = d.truncNoCert !== false;
  d.truncStrip = d.truncStrip !== false;
  d.truncLen = truncLenOf(d.truncLen);
  d.truncPad = ar6Pick(d.truncPad, ['off', 'math'], 'off');
  d.truncPadEvery = Math.round(ar6Num(d.truncPadEvery, 2, 1, 6));
}

/* ---------------- 宿主上下文（老 ST 可能什么都没有） ---------------- */

function truncCtx() {
  try {
    if (typeof stCtx === 'function') {
      var c = stCtx();
      if (c) return c;
    }
  } catch (e0) {}
  try {
    var st = HOST && HOST.SillyTavern;
    if (st && typeof st.getContext === 'function') return st.getContext();
  } catch (e1) {}
  return null;
}

/* ---------------- 分项签名：预设是不是已经自带同类指令 ----------------
   三项独立判定，各管各的：
   - tail 命中 → 省掉【结尾】【不要收尾语】（两者是同一件事的两面）
   - len  命中 → 省掉【本轮篇幅】
   - pad  命中 → 填充锚强制关（预设的 <math> 填充会和我们打架）
   三项全被顶掉 = 只剩刹车片，此时整块不注入（truncBlock 返回 ''）。 */

var TRUNC_SIG_TAIL = /结尾二选一|不得为对白|收尾契约|完整收尾|End coherently with full sentences|不在完成全部序列前中断/i;
var TRUNC_SIG_LEN = /TARGET_HAN|字数要求|字以上|字左右|正文字数|minimum[^。\n]{0,20}Han/i;
var TRUNC_SIG_PAD = /<math>|secure_log|ta_noise_pad|防截断|anti-truncation|几何定理/i;

function truncSigOf(text) {
  var s = String(text == null ? '' : text);
  return {
    tail: TRUNC_SIG_TAIL.test(s) ? 1 : 0,
    len: TRUNC_SIG_LEN.test(s) ? 1 : 0,
    pad: TRUNC_SIG_PAD.test(s) ? 1 : 0
  };
}

/* 兜底路径：请求体里什么都没扫到时，看一眼酒馆自己的设置。
   主路径永远是从请求体正文扫（launch 时预设内容一定在 body 里），这里只防「body 被裁过」。 */
function truncPresetSig() {
  var t = '';
  try {
    var c = truncCtx();
    if (c) {
      if (c.extensionSettings) t += JSON.stringify(c.extensionSettings);
      if (Array.isArray(c.prompts)) {
        for (var i = 0; i < c.prompts.length; i++) {
          var p = c.prompts[i];
          if (!p || p.enabled === false) continue;
          t += '\n' + String(p.content == null ? '' : p.content);
        }
      }
    }
  } catch (e) {}
  return truncSigOf(t);
}

/* ---------------- 文案（L1 / L2 / L3 / F） ----------------
   字数统计口径写在文案里，免得模型自作主张按「含面板」算。
   禁词检查：本段文字里没有 Reply directly / editorial system / <Master_input>。 */

function truncTextLen(n) {
  return '【本轮篇幅】正文净字数不少于 ' + n + ' 字（不含面板、状态栏、选项框、括号旁白）。' +
    '写到这个长度再收尾；用户另有明确的长度要求时，以用户的为准。';
}

var TRUNC_TEXT_TAIL = '【结尾】把最后一笔落在动作、抉择或后果上，好让下一轮接得下去。' +
  '不做归纳、不刻意拔高、不提前交代后文，收尾不要写成台词。碰到输出上限时优先保证句子完整：' +
  '宁可短，也不能停在半句。';

var TRUNC_TEXT_NOCERT = '【不要收尾语】不写"以上就是""希望你喜欢""接下来会怎样"这类话，' +
  '也不要声称自己已经写够了多少字。写完就停，不用汇报。';

/* 填充锚：短题轮换。包在 <math> 里是刻意的——它只是「让下一段有东西可接」的锚点。 */
var TRUNC_PADS = [
  '短题：把刚才这段里最关键的一步拆成三条可照着做的动作。',
  '短题：如果下一步失败，最可能卡在哪一环？只写一句。',
  '短题：用一句话说清现在离目标还差什么。'
];

function truncPadText(i) {
  var n = Math.abs(Math.round(Number(i) || 0)) % TRUNC_PADS.length;
  return TRUNC_PAD_OPEN + '<math>' + TRUNC_PADS[n] + '</math>' + TRUNC_PAD_CLOSE;
}

/* ---------------- 生成注入块 ----------------
   返回 '' 或完整块。sig 可传（测试/热路径），不传就自己扫酒馆设置。 */

function truncBlock(sig) {
  if (!cfg) return '';
  if (cfg.enabled === false || cfg.safe) return '';
  if (truncLevel(cfg.trunc) === TRUNC_OFF) return '';

  var s = sig || truncPresetSig();
  var len = truncLenOf(cfg.truncLen);
  var parts = [];

  /* L1：字数锚（关=0 时整层省掉） */
  if (len > 0 && !s.len) parts.push(truncTextLen(len));
  /* L2 + L3：收尾契约与反自我认证是同一件事的两面，预设带了就一起省 */
  if (cfg.truncTail !== false && !s.tail) parts.push(TRUNC_TEXT_TAIL);
  if (cfg.truncNoCert !== false && !s.tail) parts.push(TRUNC_TEXT_NOCERT);

  /* 三项全被顶掉 → 只剩刹车片，不注入（省一份 token，也不跟预设抢话） */
  if (!parts.length) return '';

  var padOn = String(cfg.truncPad || 'off') !== 'off' && !s.pad;
  var every = Math.max(1, Math.min(6, Math.round(Number(cfg.truncPadEvery) || 2)));
  var lines = [];
  var pads = 0;
  var i;
  for (i = 0; i < parts.length; i++) {
    lines.push(parts[i]);
    /* F：每 every 段插一条；段数不足时在末尾补一条，保证开了就一定有一条 */
    if (padOn && ((i + 1) % every === 0)) {
      lines.push(truncPadText(pads));
      pads++;
    }
  }
  if (padOn && !pads) lines.push(truncPadText(0));

  return TRUNC_OPEN + '\n' + lines.join('\n\n') + '\n' + TRUNC_CLOSE;
}

/* ---------------- 剥离：自己的块 / 填充块 ---------------- */

function truncStripOnce(s) {
  var str = String(s == null ? '' : s);
  var a = str.indexOf(TRUNC_OPEN);
  if (a < 0) return str;
  var b = str.indexOf(TRUNC_CLOSE, a);
  if (b < 0) return str.slice(0, a).replace(/[ \t\r\n]+$/, '');   /* 未闭合：从开标记删到末尾 */
  var head = str.slice(0, a).replace(/[ \t\r\n]+$/, '');
  var tail = str.slice(b + TRUNC_CLOSE.length).replace(/^[ \t\r\n]+/, '');
  if (!head) return tail;
  return tail ? (head + '\n\n' + tail) : head;
}

function truncStrip(s) {
  var out = String(s == null ? '' : s);
  for (var i = 0; i < TRUNC_STRIP_LOOP; i++) {
    var nx = truncStripOnce(out);
    if (nx === out) break;
    out = nx;
  }
  return out;
}

function truncPadStripOnce(s) {
  var str = String(s == null ? '' : s);
  var a = str.indexOf(TRUNC_PAD_OPEN);
  if (a < 0) {
    return str.replace(/<math>[\s\S]*?<\/math>/g, '');
  }
  var b = str.indexOf(TRUNC_PAD_CLOSE, a);
  if (b < 0) return str.slice(0, a).replace(/[ \t\r\n]+$/, '');
  var head = str.slice(0, a);
  var tail = str.slice(b + TRUNC_PAD_CLOSE.length);
  return (head + tail).replace(/<math>[\s\S]*?<\/math>/g, '');
}

/* 显示层净化：删 AR-PAD 标记与 <math>…</math>。纯函数，出错由调用方兜住。 */
function truncStripPads(s) {
  var out = String(s == null ? '' : s);
  for (var i = 0; i < TRUNC_PAD_LOOP_MAX; i++) {
    if (out.indexOf(TRUNC_PAD_OPEN) < 0 && out.indexOf('<math>') < 0) break;
    var nx = truncPadStripOnce(out);
    if (nx === out) break;
    out = nx;
  }
  return out;
}

/* ---------------- 应用：先剥旧块，再贴新块 ----------------
   幂等：注入 N 次 == 注入 1 次（每轮都从 base 重新拼）。
   返回是否改动（布尔；2_refract 拿它决定要不要序列化）。 */

function truncMsgList(x) {
  if (!x) return null;
  if (Array.isArray(x)) return x;
  if (typeof x === 'object') {
    if (x.request && Array.isArray(x.request.messages)) return x.request.messages;
    if (Array.isArray(x.messages)) return x.messages;
  }
  return null;
}

/* 签名扫描用的正文：整份 messages，剥掉自己的块（否则上一轮的块会被当成本轮的「预设自带」）。
   末条 user 用剥完的 base，其余消息也走一遍 truncStrip，防止历史残留。 */
function truncScanText(msgs, skip, base) {
  var arr = [];
  for (var i = 0; i < msgs.length; i++) {
    var t = String(textOfMsg(msgs[i]) || '');
    t = (i === skip) ? String(base || '') : truncStrip(t);
    if (t) arr.push(t);
  }
  return arr.join('\n');
}

function truncApply(x) {
  var msgs = truncMsgList(x);
  if (!msgs || !msgs.length) return false;
  if (!cfg || cfg.enabled === false || cfg.safe) return false;
  if (truncLevel(cfg.trunc) === TRUNC_OFF) return false;

  /* 钩子在这里懒装：只有真的在用抗截断的会话才需要它，老 ST 没有 messageFormatter 时静默跳过 */
  try { truncPadHook(); } catch (eH) {}

  var idx = -1;
  var i;
  for (i = msgs.length - 1; i >= 0; i--) {
    var mm = msgs[i];
    if (mm && String(mm.role || '') === 'user') { idx = i; break; }
  }
  if (idx < 0) return false;

  var m = msgs[idx];
  var old = String(textOfMsg(m) || '');
  var base = truncStrip(old);
  var sig = truncSigOf(truncScanText(msgs, idx, base));
  var block = truncBlock(sig);

  /* 档位开着但预设已经全自带：只把上一轮的旧块剥掉，不贴新的 */
  if (!block) {
    if (base !== old) { setMsgText(m, base); return true; }
    return false;
  }

  var sep = base ? '\n\n' : '';
  var next = base + sep + block;
  if (next === old) return false;
  setMsgText(m, next);
  return true;
}

/* ---------------- 填充块的显示层剥离 ----------------
   酒馆没有 removeHook，所以钩子只装一次，靠 HOST.__ar6PadHook 标记 + 钩子内读 cfg 自我短路。
   老 ST 没有 messageFormatter、addHook 不是函数、getContext 抛错——全部静默返回 false。 */

function truncPadHook() {
  try {
    if (HOST && HOST.__ar6PadHook === 'on') return true;
    var c = truncCtx();
    var f = c && c.messageFormatter;
    if (!f || typeof f.addHook !== 'function') return false;
    var fn = function (mes) {
      try {
        if (!cfg || cfg.safe || cfg.truncStrip === false) return mes;
        if (String(cfg.truncPad || 'off') === 'off') return mes;
        if (typeof mes !== 'string') return mes;
        return truncStripPads(mes);
      } catch (e0) { return mes; }
    };
    f.addHook(fn, { stage: 'beforeRegex', order: 999 });
    if (HOST) HOST.__ar6PadHook = 'on';
    return true;
  } catch (e1) {
    return false;
  }
}

/* ---------------- 判定：这一轮为什么停 ---------------- */

/* finish 的三类：上游同类字段写法不统一，大小写都认 */
var TRUNC_GATE_FINISH = {
  CONTENT_FILTER: 1, SAFETY: 1, PROHIBITED_CONTENT: 1, SPII: 1,
  BLOCKLIST: 1, RECITATION: 1, IMAGE_SAFETY: 1, REFUSAL: 1
};

function truncGateFinish(fin) {
  return !!TRUNC_GATE_FINISH[String(fin || '').toUpperCase()];
}

function truncLenFinish(fin) {
  var f = String(fin || '').toUpperCase();
  return f === 'LENGTH' || f === 'MAX_TOKENS';
}

function truncPauseFinish(fin) {
  return String(fin || '').toLowerCase() === 'pause_turn';
}

/* ---------------- 判定：这一轮为什么停 ----------------
   返回 { code, note }，code 优先级 gate > len > pause > cut > unfinished > ''（正常）。
   note 是一句能直接给人看的话（面板那行、卡片那行都用它）。 */
function truncInspect(ev) {
  if (!ev) return { code: '', note: '' };
  var fin = String(ev.finish || '');
  var tail = String(ev.tail || '');
  var mc = (typeof ev.mesChars === 'number') ? ev.mesChars : Number(ev.outputChars || 0);

  /* 1) gate：上游明说被拦，或者正文就是一封拒绝信（话术识别沿用破甲 7_jail.js:196） */
  if (truncGateFinish(fin)) return { code: 'gate', note: '上游安全层拦截（' + fin + '）' };
  if (mc > 0 && tail && mc < 300 &&
      typeof JAIL_REFUSE_RE !== 'undefined' && JAIL_REFUSE_RE.test(tail)) {
    var hard = (typeof JAIL_SAFETY_RE !== 'undefined') && JAIL_SAFETY_RE.test(tail);
    return { code: 'gate', note: hard ? '正文是安全层拒绝话术' : '正文是拒绝话术' };
  }

  /* 2) len：撞到 token 上限 */
  if (truncLenFinish(fin)) return { code: 'len', note: '碰到 max_tokens 上限（' + fin + '）' };

  /* 3) pause：上游要求继续 */
  if (truncPauseFinish(fin)) return { code: 'pause', note: '上游要求继续（pause_turn）' };

  /* 4)(5) finish 没给：看正文结构。结构断了 = cut；看不出断裂 = unfinished（不补，只提示） */
  if (!fin && tail) {
    var why = '';
    try { why = jailTruncWhy(tail, mc > 0 ? mc : tail.length); } catch (eW) { why = ''; }
    if (why) return { code: 'cut', note: why };
    return { code: 'unfinished', note: '正文有，但没给 finish（可能只是停在这里）' };
  }
  return { code: '', note: '' };
}

/* ---------------- 事后：记录 + 提示 + （中档）补一次 ----------------
   pre 是 finish() 里提前算好的判定（同一轮只判一次，省得算两遍）。
   返回值 = 本轮 code，交给破甲决定它还要不要管截断。 */
function truncAfterFinish(ev, pre) {
  if (!cfg || truncLevel(cfg.trunc) === TRUNC_OFF) return '';
  if (!ev || ev.status !== 200 || ev.error) return '';
  if (ev.internal) return '';                 /* 内部请求没有聊天产物，不判 */

  /* 刚自己补过——下一次收尾多半是那一枪的回声，先放过一轮（沿用破甲 :469 的同一条刹车）。
     ★ 只 return，绝不在这里清 JL.selfAt：清零点必须唯一。
     trunc 跑在 jail 之前（3_net.js:309-315），若在这里清零，jail 的 90 秒刹车就形同虚设，
     慢回声会在 20–90 秒窗口里再补一枪 = 连环补。现在由 jailAfterFinish 独自消费这个时间戳；
     jail 关着时它自然过期，不需要人清。 */
  if (typeof JL !== 'undefined' && JL.selfAt && nowMs() - JL.selfAt < 90000) {
    return '';
  }

  var t = pre || truncInspect(ev);
  if (!t || !t.code) return '';
  TR.code = t.code;
  TR.note = t.note;
  TR.at = nowMs();

  /* 中档也只补这三类；轻档到这里就只剩提示 */
  var willFix = truncLevel(cfg.trunc) === TRUNC_MEDIUM && !!TRUNC_FIX[t.code] &&
    cfg.enabled && !cfg.safe;                 /* 总闸关着 / 安全兜底时不自动动手 */
  if (!willFix) {
    try { banner('✂️ 这一轮停在：' + (truncHuman(t.code, truncLevel(cfg.trunc)) || t.note), t.code === 'unfinished' ? 'gray' : 'warn'); } catch (eB) {}
    return t.code;
  }

  /* 补写预算和破甲共用一个：它刚补过 / 刚补完还没回 / 一分钟太多次，这里就收手 */
  var cur = jailLastAi();
  var key = cur ? (String(cur.idx) + '|' + String(cur.msg.send_date || '')) : 'noctx';
  var g = jailGate(key);
  if (!g.ok) {
    try { banner('✂️ 这一轮停在：' + (truncHuman(t.code, truncLevel(cfg.trunc)) || t.note), 'warn'); } catch (eB2) {}
    return t.code;
  }
  TR.try++;
  /* 单轮最多 1 次：n 用 JL.count + 1，max 固定 1；轮询/上锁/续写入口全走破甲那套 */
  jailSchedule({ code: 'trunc', note: t.note }, JL.count + 1, 1);
  return t.code;
}

/* 面板一行说清档位 + 最近一次为什么停 +（v0.7）字数锚
   注意：「本次没补过」「本次补过 N 次」这两段的位置不能动——历史用例按它们做前缀匹配。 */
function truncStatLine() {
  var lv = truncLabel(cfg ? cfg.trunc : TRUNC_OFF);
  if (truncLevel(cfg ? cfg.trunc : TRUNC_OFF) === TRUNC_OFF) return '抗截断：关（不判定、不提示、不补）';
  var done = TR.try ? ('本次补过 ' + TR.try + ' 次') : '本次没补过';
  var line = '抗截断：' + lv + ' · ' + done;
  if (TR.code) {
    var hum = truncHuman(TR.code, truncLevel(cfg ? cfg.trunc : TRUNC_OFF));
    if (hum) line += ' · 最近一次：' + hum;
  }
  line += ' · ' + truncLenLabel();
  return line;
}
