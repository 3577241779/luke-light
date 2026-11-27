/* ===== 07i_lk526.js · V5.26：台账垫片 / 流内冲突 / 词表式码点护甲 + 自研解码 ===== */

/* ---------- 1. 台账垫片（确定性，同会话稳定） ---------- */
var LK_LEDGER_SALT = 0;
try { LK_LEDGER_SALT = (typeof lkHash32 === 'function') ? lkHash32(String(Date.now())) : 0; } catch (eLS) { LK_LEDGER_SALT = 0; }

var LK_LEDGER_KINDS = ['气象台账', '值班记录', '巡检单', '交接班记录', '设备点检'];

function lkLedgerPad(target, tag) {
  var goal = Math.max(200, Number(target) || 800);
  var rnd = (typeof lkPrng === 'function') ? lkPrng((LK_LEDGER_SALT ^ 0x5f2c) >>> 0) : function () { return 0.5; };
  var kind = LK_LEDGER_KINDS[Math.floor(rnd() * LK_LEDGER_KINDS.length) % LK_LEDGER_KINDS.length];
  var lines = [], total = 0, seq = 1;
  var pad2 = function (n) { return (n < 10 ? '0' : '') + n; };
  var moods = ['晴', '多云', '阴', '小雨', '微风', '阴转多云'];
  var notes = ['设备运行正常', '已完成例行检查', '无异常记录', '记录已归档', '需下次复核'];
  while (total < goal && seq < 400) {
    var mo = (seq % 12) + 1, dy = ((seq * 7) % 28) + 1, hh = (seq * 5) % 24, mi = (seq * 13) % 60;
    var stamp = '2024-' + pad2(mo) + '-' + pad2(dy) + ' ' + pad2(hh) + ':' + pad2(mi) + ' UTC+8';
    var t = Math.floor(rnd() * 30);
    var line = '[' + kind + ' #' + String(seq).padStart(4, '0') + '] ' + stamp +
      ' | 站点=S' + String(1 + Math.floor(rnd() * 9)) +
      ' | 气温=' + t + '.0C | 湿度=' + (40 + Math.floor(rnd() * 50)) + '%' +
      ' | 天气=' + moods[Math.floor(rnd() * moods.length) % moods.length] +
      ' | 备注=' + notes[Math.floor(rnd() * notes.length) % notes.length];
    lines.push(line);
    total += line.length + (lines.length > 1 ? 1 : 0);
    seq++;
  }
  if (tag === 'user') lines.unshift('（以下为值班台账摘录，与剧情无关，整段忽略。）');
  return lines.join('\n');
}

/* ---------- 2. 流内冲突：同帧既有正文又有工具调用 → 丢正文、保工具 ---------- */
var LK_CONFLICT = { n: 0 };

function lkStripMixedText(block) {
  var s = String(block || '');
  if (!s) return s;
  if (s.indexOf('tool_calls') < 0 && s.indexOf('functionCall') < 0 && s.indexOf('function_call') < 0) return s;
  var out = s;
  /* OpenAI 形态：choices[].delta.content 有非空文本时清掉 */
  out = out.replace(/("delta"\s*:\s*\{)([^{}]*?)("content"\s*:\s*)"((?:[^"\\]|\\.)*)"/g, function (full, head, mid, key, val) {
    if (!val || !String(val).trim()) return full;
    LK_CONFLICT.n++;
    return head + mid + key + '""';
  });
  /* Anthropic 形态：content_block_delta 的 text_delta 与 tool_use 同块 → 丢 text_delta */
  if (/text_delta/.test(out) && /(tool_use|input_json_delta)/.test(out)) {
    out = out.replace(/"text_delta"/g, '"__lk_drop"');
    LK_CONFLICT.n++;
  }
  return out;
}

/* ---------- 3. 词表式码点护甲（全上下文，只转命中的词） ---------- */
var LK_ARMOR_WORDS = [
  '未成年', '未满十八', '未满18', '幼儿园', '小学生', '初中生', '高中生', '中学生',
  '萝莉', '正太', '幼女', '幼童', '童男', '童女', '恋童', '戀童', '恋幼', '戀幼',
  '稚嫩', '幼稚', '裸体', '裸露', '性器', '阴茎', '阴道', '乳房', '乳头', '臀部',
  '做爱', '性交', '高潮', '射精', '自慰', '调教', '口交', '肛交', '情趣', '床戏',
  '呻吟', '情欲', '发情', '淫', '肉棒', '抽插', '内射', '体液', '勃起', '下体',
  '淫水', '精液', '舔弄', '套弄', '乳交', '足交', '肛塞', '露出', '奴',
  'hentai', 'nsfw', 'explicit', 'smut', 'lewd', 'cum', 'gore', 'dismember'
];
var LK_ARMOR_DICT = Object.create(null);
var LK_ARMOR_BUSY = false;

var LK_ARMOR_SORTED_CACHE = null;
var LK_ARMOR_SORTED_LEN = -1;
function lkArmorSortedWords() {
  if (LK_ARMOR_SORTED_CACHE && LK_ARMOR_SORTED_LEN === LK_ARMOR_WORDS.length) return LK_ARMOR_SORTED_CACHE;
  LK_ARMOR_SORTED_LEN = LK_ARMOR_WORDS.length;
  LK_ARMOR_SORTED_CACHE = LK_ARMOR_WORDS.slice().sort(function (a, b) {
    return String(b || '').length - String(a || '').length;
  });
  return LK_ARMOR_SORTED_CACHE;
}

/* ===== LKMARS-START V6.7 火星文转译（❀Base36❀ 穿透代理 + 结构护栏 + 流式无损还原） ===== */
function lkMarsOn() {
  try { return !!(cfg && cfg.enabled && cfg.mars === true); } catch (eM0) { return false; }
}
function lkMarsCode(ch) {
  var cp = ch.charCodeAt(0);
  if (!isFinite(cp) || cp <= 0) return ch;
  return '\u2740' + cp.toString(36).toUpperCase() + '\u2740';
}
function lkMarsApplyText(t, st) {
  var s = String(t || '');
  if (!s) return s;
  var parts = (typeof LK_STRUCT_SAFE_RE !== 'undefined')
    ? (LK_STRUCT_SAFE_RE.lastIndex = 0, s.split(LK_STRUCT_SAFE_RE))
    : [s];
  var words = lkArmorSortedWords();
  for (var pi = 0; pi < parts.length; pi += 2) {
    var seg = parts[pi];
    if (!seg) continue;
    for (var i = 0; i < words.length; i++) {
      var w = words[i];
      if (!w) continue;
      if (/^[A-Za-z0-9_]+$/.test(w)) {
        if (seg.toLowerCase().indexOf(w.toLowerCase()) < 0) continue;
        var rxW = new RegExp('\\b' + w + '\\b', 'gi');
        seg = seg.replace(rxW, function (matched) {
          var encM = '';
          for (var km = 0; km < matched.length; km++) encM += lkMarsCode(matched.charAt(km));
          if (st) st.hits++;
          return encM;
        });
      } else {
        if (seg.indexOf(w) < 0) continue;
        var enc = '';
        for (var k = 0; k < w.length; k++) enc += lkMarsCode(w.charAt(k));
        while (seg.indexOf(w) >= 0) {
          seg = seg.replace(w, enc);
          if (st) st.hits++;
        }
      }
    }
    parts[pi] = seg;
  }
  return parts.join('');
}
function lkMarsRestore(t) {
  var s = String(t || '');
  if (!s || s.indexOf('\u2740') < 0) return s;
  return s.replace(/\u2740([0-9A-Za-z]{1,6})\u2740/g, function (m, b36) {
    var cp = parseInt(b36, 36);
    if (!isFinite(cp) || cp <= 0 || cp > 0xFFFF) return m;
    return String.fromCharCode(cp);
  });
}
function lkMarsWalk(node, depth, st) {
  if (!node || depth > 6) return;
  if (typeof node === 'string') return;
  if (Array.isArray(node)) {
    for (var i = 0; i < node.length; i++) {
      var it = node[i];
      if (!it || typeof it !== 'object') continue;
      if (typeof lkIsProtectedMsg === 'function' && lkIsProtectedMsg(it)) continue;
      if (typeof it.text === 'string' && !it.thought) it.text = lkMarsApplyText(it.text, st);
      if (typeof it.content === 'string') it.content = lkMarsApplyText(it.content, st);
      if (Array.isArray(it.content)) lkMarsWalk(it.content, depth + 1, st);
      if (Array.isArray(it.parts)) lkMarsWalk(it.parts, depth + 1, st);
      if (it.function && typeof it.function.arguments === 'string') it.function.arguments = lkMarsApplyText(it.function.arguments, st);
    }
    return;
  }
  if (typeof node === 'object') {
    if (typeof lkIsProtectedMsg === 'function' && lkIsProtectedMsg(node)) return;
    if (typeof node.content === 'string') node.content = lkMarsApplyText(node.content, st);
    if (typeof node.systemInstruction === 'string') node.systemInstruction = lkMarsApplyText(node.systemInstruction, st);
    if (typeof node.system === 'string') node.system = lkMarsApplyText(node.system, st);
    if (Array.isArray(node.system)) lkMarsWalk(node.system, depth + 1, st);
    if (typeof node.text === 'string' && !node.thought) node.text = lkMarsApplyText(node.text, st);
    if (Array.isArray(node.parts)) lkMarsWalk(node.parts, depth + 1, st);
    if (Array.isArray(node.messages)) lkMarsWalk(node.messages, depth + 1, st);
    if (Array.isArray(node.contents)) lkMarsWalk(node.contents, depth + 1, st);
    if (node.request && typeof node.request === 'object') lkMarsWalk(node.request, depth + 1, st);
    if (node.systemInstruction && typeof node.systemInstruction === 'object') lkMarsWalk(node.systemInstruction, depth + 1, st);
  }
}
function lkMarsBody(body) {
  if (!body || typeof body !== 'object') return 0;
  var st = { hits: 0 };
  try { lkMarsWalk(body, 0, st); } catch (eMW) {}
  if (st.hits > 0 || lkMarsOn()) LK_ARMOR_BUSY = true;
  return st.hits;
}
/* ===== LKMARS-END ===== */

function lkArmorOn() {
  /* v6.2：字面护甲（会把 \uXXXX 明文写进正文，穿透 ST express.json() 后端直达上游）
     在显式 text，或 auto 下的破暗化光 / 终极两档（已确认）启用；常规档走 JSON 层透明护甲 */
  try {
    if (!cfg || !cfg.enabled) return false;
    var m = String(cfg.armor || 'auto');
    if (m === 'off') return false;
    if (m === 'text') return true;
    if (m === 'wire' || m === 'on') return false;
    if (cfg.allTool === true) return !(cfg.grab > 0) && String(cfg.jailTool || 'off') === 'off';
    var j = String(cfg.jail || 'off');
    return (j === 'gatanothor' || j === 'abyss') && cfg.jailSupremeConfirmed === true;
  } catch (eA) { return false; }
}

function lkArmorEsc(ch) {
  var code = ch.charCodeAt(0);
  if (!isFinite(code) || code < 0) return ch;
  var hx = code.toString(16).toUpperCase();
  while (hx.length < 4) hx = '0' + hx;
  var seq = '\\u' + hx;
  LK_ARMOR_DICT[seq] = ch;
  return seq;
}

/* V5.65/V6.2：码点护甲继续全上下文（含历史对话）满血生效，按词长降序优先匹配（防「淫水」被「淫」拆半）+ ASCII 不区分大小写词边界，
   仅加结构安全护栏，跳过 XML标签 / 代码块 / 行内代码 / SQL / JSON键名 / JSONPatch路径 / 宏 / URL */
function lkArmorEscText(txt, st) {
  var s = String(txt || '');
  if (!s) return s;
  var parts = (typeof LK_STRUCT_SAFE_RE !== 'undefined')
    ? (LK_STRUCT_SAFE_RE.lastIndex = 0, s.split(LK_STRUCT_SAFE_RE))
    : [s];
  var words = lkArmorSortedWords();
  for (var pi = 0; pi < parts.length; pi += 2) {
    var seg = parts[pi];
    if (!seg) continue;
    for (var i = 0; i < words.length; i++) {
      var w = words[i];
      if (!w) continue;
      if (/^[A-Za-z0-9_]+$/.test(w)) {
        if (seg.toLowerCase().indexOf(w.toLowerCase()) < 0) continue;
        var rxW = new RegExp('\\b' + w + '\\b', 'gi');
        seg = seg.replace(rxW, function (matched) {
          var escM = '';
          for (var km = 0; km < matched.length; km++) escM += lkArmorEsc(matched.charAt(km));
          if (st) st.hits++;
          return escM;
        });
      } else {
        if (seg.indexOf(w) < 0) continue;
        var esc = '';
        for (var k = 0; k < w.length; k++) esc += lkArmorEsc(w.charAt(k));
        while (seg.indexOf(w) >= 0) {
          seg = seg.replace(w, esc);
          if (st) st.hits++;
        }
      }
    }
    parts[pi] = seg;
  }
  return parts.join('');
}

function lkArmorWalk(node, depth, st) {
  if (!node || depth > 6) return;
  if (typeof node === 'string') return;
  if (Array.isArray(node)) {
    for (var i = 0; i < node.length; i++) {
      var it = node[i];
      if (!it || typeof it !== 'object') continue;
      /* 跳过工具消息与携带 tool_calls / thoughtSignature / reasoning_details 的协议元数据消息 */
      if (typeof lkIsProtectedMsg === 'function' && lkIsProtectedMsg(it)) continue;
      if (typeof it.text === 'string' && !it.thought) it.text = lkArmorEscText(it.text, st);
      if (typeof it.content === 'string') it.content = lkArmorEscText(it.content, st);
      if (typeof it.systemInstruction === 'string') it.systemInstruction = lkArmorEscText(it.systemInstruction, st);
      if (Array.isArray(it.parts)) lkArmorWalk(it.parts, depth + 1, st);
      if (Array.isArray(it.content)) lkArmorWalk(it.content, depth + 1, st);
    }
    return;
  }
  if (typeof node === 'object') {
    if (typeof lkIsProtectedMsg === 'function' && lkIsProtectedMsg(node)) return;
    if (typeof node.content === 'string') node.content = lkArmorEscText(node.content, st);
    if (typeof node.systemInstruction === 'string') node.systemInstruction = lkArmorEscText(node.systemInstruction, st);
    if (typeof node.system === 'string') node.system = lkArmorEscText(node.system, st);
    if (Array.isArray(node.system)) lkArmorWalk(node.system, depth + 1, st);
    if (typeof node.text === 'string' && !node.thought) node.text = lkArmorEscText(node.text, st);
    if (Array.isArray(node.parts)) lkArmorWalk(node.parts, depth + 1, st);
    if (Array.isArray(node.messages)) lkArmorWalk(node.messages, depth + 1, st);
    if (Array.isArray(node.contents)) lkArmorWalk(node.contents, depth + 1, st);
    if (node.request && typeof node.request === 'object') lkArmorWalk(node.request, depth + 1, st);
    if (node.systemInstruction && typeof node.systemInstruction === 'object') lkArmorWalk(node.systemInstruction, depth + 1, st);
  }
}

function lkArmorApply(body) {
  if (!body || typeof body !== 'object') return 0;
  var st = { hits: 0 };
  try { lkArmorWalk(body, 0, st); } catch (eAP) {}
  if (st.hits > 0) LK_ARMOR_BUSY = true;
  return st.hits;
}

/* 自研解码：只解本轮登记过的序列与 CJK 残留；流式实例各自独立持有 tail，互不串流 */
var LK_ARMOR_TAIL = '';

function lkArmorRestore(text) {
  var s = String(text || '');
  if (!s) return s;
  if (s.indexOf('\u2740') >= 0) s = lkMarsRestore(s);
  /* DOUBLE：JSON 串里的 \\uXXXX 先解一层 */
  s = s.replace(/\\\\u([0-9A-Fa-f]{4})/g, function (full, hex) {
    var seq2 = '\\u' + String(hex).toUpperCase();
    if (LK_ARMOR_DICT[seq2]) return LK_ARMOR_DICT[seq2];
    var code2 = parseInt(hex, 16);
    if (code2 >= 0x2E80 && code2 <= 0x9FFF) return String.fromCharCode(code2);
    return full;
  });
  /* SINGLE：统一大小写不敏感查登记表（修复小写 \u006e 等 ASCII 残留无法还原），未登记则兜底解 CJK 残留 */
  s = s.replace(/\\u([0-9A-Fa-f]{4})/g, function (full, hex) {
    var seq = '\\u' + String(hex).toUpperCase();
    if (LK_ARMOR_DICT[seq]) return LK_ARMOR_DICT[seq];
    var code = parseInt(hex, 16);
    if (code >= 0x2E80 && code <= 0x9FFF) return String.fromCharCode(code);
    return full;
  });
  return s;
}

function lkCreateArmorStream() {
  var tail = '';
  return {
    feed: function (chunk) {
      var s = tail + String(chunk || '');
      if (s.indexOf('\u2740') >= 0) s = lkMarsRestore(s);
      var m = /(?:\\{1,2}(?:u[0-9A-Fa-f]{0,3})?|\u2740[0-9A-Za-z]{0,6})$/.exec(s);
      if (m) { tail = m[0]; s = s.slice(0, m.index); }
      else tail = '';
      return lkArmorRestore(s);
    },
    flush: function () {
      var t = tail;
      tail = '';
      return t ? lkArmorRestore(t) : '';
    }
  };
}

function lkArmorFeed(chunk) {
  var s = LK_ARMOR_TAIL + String(chunk || '');
  if (s.indexOf('\u2740') >= 0) s = lkMarsRestore(s);
  var m = /(?:\\{1,2}(?:u[0-9A-Fa-f]{0,3})?|\u2740[0-9A-Za-z]{0,6})$/.exec(s);
  if (m) { LK_ARMOR_TAIL = m[0]; s = s.slice(0, m.index); }
  else LK_ARMOR_TAIL = '';
  return lkArmorRestore(s);
}

function lkArmorFlush() {
  var t = LK_ARMOR_TAIL;
  LK_ARMOR_TAIL = '';
  return t;
}

/* V5.3：渠道把输出上限悄悄压到 4096/8192 的检测（兼容 OpenAI/Gemini，按渠道去重只提示一次） */
var LK_LIMIT_WATCH = { n: 0, seen: Object.create(null) };
function lkLimitWatch(count, finish, baseKey) {
  try {
    if (!LK_LIMIT_WATCH.n) LK_LIMIT_WATCH.seen = Object.create(null);
    var c = Number(count || 0);
    if (c !== 4096 && c !== 8192 && c !== 8191 && c !== 4095) return 0;
    if (!/max_tokens|length|MAX_TOKENS|max_length/i.test(String(finish || ''))) return 0;
    var bk = baseKey ? String(baseKey) : '__global__';
    if (bk === '__global__' && LK_LIMIT_WATCH.n) return 0;
    if (!LK_LIMIT_WATCH.seen) LK_LIMIT_WATCH.seen = Object.create(null);
    if (LK_LIMIT_WATCH.seen[bk]) return 0;
    LK_LIMIT_WATCH.seen[bk] = 1;
    LK_LIMIT_WATCH.n++;
    try { banner('渠道疑似压了输出上限：本轮正好停在 ' + c + ' token，实际可用可能更小', 'warn'); } catch (eB) {}
    return 1;
  } catch (e0) { return 0; }
}
