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
    total += line.length + 1;
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
  '做爱', '性交', '高潮', '射精', '自慰', '调教', '口交', '肛交', '情趣', '床戏'
];
var LK_ARMOR_DICT = Object.create(null);
var LK_ARMOR_BUSY = false;

function lkArmorOn() {
  try {
    var j = cfg && cfg.jail;
    if (cfg && cfg.armor === 'off') return false;
    if (cfg && cfg.armor === 'on') return true;
    return j === 'strong' || j === 'supreme' || j === 'gatanothor' || j === 'abyss';
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

function lkArmorEscText(txt, st) {
  var s = String(txt || '');
  for (var i = 0; i < LK_ARMOR_WORDS.length; i++) {
    var w = LK_ARMOR_WORDS[i];
    if (s.indexOf(w) < 0) continue;
    var esc = '';
    for (var k = 0; k < w.length; k++) esc += lkArmorEsc(w.charAt(k));
    while (s.indexOf(w) >= 0) {
      s = s.replace(w, esc);
      if (st) st.hits++;
    }
  }
  return s;
}

function lkArmorWalk(node, depth, st) {
  if (!node || depth > 6) return;
  if (typeof node === 'string') return;
  if (Array.isArray(node)) {
    for (var i = 0; i < node.length; i++) {
      var it = node[i];
      if (it && typeof it === 'object') {
        if (typeof it.text === 'string') it.text = lkArmorEscText(it.text, st);
        if (typeof it.content === 'string') it.content = lkArmorEscText(it.content, st);
        if (typeof it.systemInstruction === 'string') it.systemInstruction = lkArmorEscText(it.systemInstruction, st);
        lkArmorWalk(it, depth + 1, st);
      }
    }
    return;
  }
  if (typeof node === 'object') {
    if (typeof node.content === 'string') node.content = lkArmorEscText(node.content, st);
    if (typeof node.systemInstruction === 'string') node.systemInstruction = lkArmorEscText(node.systemInstruction, st);
    if (typeof node.system === 'string') node.system = lkArmorEscText(node.system, st);
    if (typeof node.text === 'string') node.text = lkArmorEscText(node.text, st);
    if (Array.isArray(node.parts)) lkArmorWalk(node.parts, depth + 1, st);
    if (Array.isArray(node.messages)) lkArmorWalk(node.messages, depth + 1, st);
    if (Array.isArray(node.contents)) lkArmorWalk(node.contents, depth + 1, st);
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
  /* DOUBLE：JSON 串里的 \\uXXXX 先解一层 */
  s = s.replace(/\\\\u([0-9A-Fa-f]{4})/g, function (full, hex) {
    var seq2 = '\\u' + String(hex).toUpperCase();
    if (LK_ARMOR_DICT[seq2]) return LK_ARMOR_DICT[seq2];
    var code2 = parseInt(hex, 16);
    if (code2 >= 0x2E80 && code2 <= 0x9FFF) return String.fromCharCode(code2);
    return full;
  });
  var keys = Object.keys(LK_ARMOR_DICT);
  for (var i = 0; i < keys.length; i++) {
    var seq = keys[i];
    if (s.indexOf(seq) >= 0) s = s.split(seq).join(LK_ARMOR_DICT[seq]);
  }
  /* 兜底：4 位十六进制且能解成 CJK 的残留（大小写都认） */
  s = s.replace(/\\u([0-9A-Fa-f]{4})/g, function (full, hex) {
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
      var m = /\\{1,2}(?:u[0-9A-Fa-f]{0,3})?$/.exec(s);
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
  var m = /\\{1,2}(?:u[0-9A-Fa-f]{0,3})?$/.exec(s);
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
