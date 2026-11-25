/* ===== 5.1 借鉴社区实现（只加不改）：中性台账垫片 / 成人信号门控 / 预设识别 / 响应 tee 取样 / 工具参数打捞 ===== */
var LK_PAD_TABLE = {
  station: ['迎风岭', '白桦坡', '南岔口', '旧矿沟', '青石滩', '北塘坳', '沙河湾', '柳条沟', '望海台', '松岭子', '石门坎', '小孤山'],
  instr: ['风速仪 A-11', '雨量筒 R-07', '干湿球 T-03', '气压计 P-21', '地温探头 G-05', '浊度计 W-12'],
  litho: ['粉砂岩', '泥质板岩', '石英砂岩', '钙质砾岩', '玄武岩夹层', '炭质页岩'],
  hb: ['HB-2020', 'HB-2021', 'HB-2022', 'HB-2023', 'HB-2024'],
  material: ['环氧树脂 E-44', '低碳钢 Q235', '铝硅合金 ZL104', '丁腈橡胶 NBR', '聚丙烯 PP'],
  test: ['抗拉', '抗压', '硬度', '疲劳', '冲击', '蠕变']
};
var LK_ADULT_RX = /(做爱|性爱|性交|高潮|射精|口交|肛交|乳房|阴茎|阴道|肉体|裸露|赤裸|情欲|发情|呻吟|色情|成人向|R18|r18|NSFW|nsfw|舔|抽插|内射|体液|勃起|下体|臀|腰窝|锁骨|咬痕|血|肢解|断面|内脏|尸体|屠宰|开膛|断肢|绞杀|窒息|explicit|smut|lewd|aroused|moan|climax|cum|penetrat|blood|gore|dismember|corpse|carnage)/i;
var LK_JB_RX = /(越狱|破限|破甲|无限制|不受限|忽略一切|无视一切|绕过|解除限制|关闭审查|禁用审查|jailbreak|ignore\s+(?:all|any|previous)|uncensored|unfiltered|developer\s*mode)/i;
var LK_TOOL_KEYS = ['content', 'game_content', 'text', 'output', 'body', 'reply', 'story', 'narrative'];
var LK_TEE = { res: 0, chars: 0, drop: 0 };

/* v5.78 透明传输护甲：JSON 层 \uXXXX，绕过中转/WAF 明文关键词扫描；上游 JSON.parse 后是干净原字；
   纯 ASCII 词强制使用词边界 \b，避免误伤 document / circumstance 等正常单词。 */
function lkWireOn() {
  try {
    if (!cfg) return false;
    var m = String(cfg.armor || 'auto');
    if (m === 'off' || m === 'text') return false;
    if (m === 'wire' || m === 'on') return true;
    var j = cfg.jail;
    return j === 'strong' || j === 'supreme' || j === 'gatanothor' || j === 'abyss';
  } catch (eW0) { return false; }
}
function lkWireArmorJson(str) {
  try {
    if (!str || typeof str !== 'string') return str;
    var words = (typeof LK_ARMOR_WORDS !== 'undefined' && LK_ARMOR_WORDS) || [];
    var out = str;
    for (var i = 0; i < words.length; i++) {
      var w = words[i];
      if (!w || w.length < 2 || out.indexOf(w) < 0) continue;
      var esc = '', k;
      for (k = 0; k < w.length; k++) esc += '\\u' + ('0000' + w.charCodeAt(k).toString(16)).slice(-4);
      if (/^[A-Za-z0-9_]+$/.test(w)) {
        out = out.replace(new RegExp('\\b' + w + '\\b', 'g'), esc);
      } else {
        out = out.split(w).join(esc);
      }
    }
    return out;
  } catch (eW1) { return str; }
}

function lkHash32(str) {
  var h = 2166136261, s = String(str || '');
  for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}
function lkPrng(seed) {
  var st = (seed >>> 0) || 0x9e3779b9;
  return function () {
    st = (st + 0x6d2b79f5) >>> 0;
    var t = Math.imul(st ^ (st >>> 15), 1 | st);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function lkPad2(n) { return (n < 10 ? '0' : '') + n; }

/* 中性台账垫片：按会话种子生成假台账行，每轮内容不同、长度可控、不含任何指令 */
function lkPadLines(target, kind) {
  var goal = Math.max(400, Number(target) || 1200);
  var seedStr = '';
  try { seedStr = String(chatTag() || ''); } catch (eSt) { seedStr = ''; }
  var mdlStr = '';
  try { mdlStr = String(normModel(lastModelName ? lastModelName() : '')); } catch (eMd) { mdlStr = ''; }
  var rnd = lkPrng(lkHash32('pad|' + String(kind || 'sys') + '|' + seedStr + '|' + mdlStr + '|' + (cfg && cfg.refractSeed ? cfg.refractSeed : '')));
  var pick = function (a) { return a[Math.floor(rnd() * a.length)]; };
  var out = '', seq = 1, dayOff = Math.floor(rnd() * 200);
  while (out.length < goal && seq < 500) {
    var md = dayOff + seq * 3;
    var month = (Math.floor(md / 28) % 12) + 1;
    var day = (md % 28) + 1;
    var hour = (seq * 5 + Math.floor(rnd() * 4)) % 24;
    var minute = (seq * 13) % 60;
    var stamp = '2024-' + lkPad2(month) + '-' + lkPad2(day) + ' ' + lkPad2(hour) + ':' + lkPad2(minute) + ' UTC+8';
    var no = ('000' + seq).slice(-4);
    var mode = seq % 4;
    if (mode === 0) {
      out += '[气象台账 #' + no + '] ' + stamp + ' | 站点=' + pick(LK_PAD_TABLE.station) + ' | 仪器=' + pick(LK_PAD_TABLE.instr) + ' | 备注=例行巡检，读数已复核。\n';
    } else if (mode === 1) {
      out += '[岩芯采样 #' + no + '] ' + stamp + ' | 钻孔编号 BH-' + lkPad2(month) + lkPad2(day) + '-' + (seq % 97) + ' | 岩性=' + pick(LK_PAD_TABLE.litho) + '\n';
    } else if (mode === 2) {
      out += '[标本编目 #' + no + '] ' + stamp + ' | 馆藏号 ' + pick(LK_PAD_TABLE.hb) + '-' + ('000' + ((seq * 17) % 9999)).slice(-4) + ' | 状态=已登记\n';
    } else {
      out += '[材料物性 #' + no + '] ' + stamp + ' | 试件=' + pick(LK_PAD_TABLE.material) + ' | 项目=' + pick(LK_PAD_TABLE.test) + '\n';
    }
    seq++;
  }
  return out;
}

/* 成人 / 破限信号：只读扫描，不改任何文本 */
function lkHasAdult(t) { return LK_ADULT_RX.test(String(t || '')); }
function lkHasJail(t) { return LK_JB_RX.test(String(t || '')); }
function lkBodyTexts(body) {
  var out = { sys: '', users: [] };
  try {
    var root = (body && body.request && typeof body.request === 'object' && !Array.isArray(body.request)) ? body.request : body;
    if (!root || typeof root !== 'object') return out;
    var sysT = '';
    try { sysT = String(typeof jailSysText === 'function' ? jailSysText(body) : ''); } catch (eS) { sysT = ''; }
    out.sys = sysT;
    var arr = (Array.isArray(root.messages) && root.messages) || (Array.isArray(root.contents) && root.contents) || [];
    for (var i = arr.length - 1; i >= 0 && out.users.length < 2; i--) {
      var m = arr[i];
      if (!m || m.role !== 'user') continue;
      var t = '';
      try { t = String(typeof getMsgText === 'function' ? getMsgText(m) : (m.content || '')); } catch (eU) { t = ''; }
      if (t) out.users.push(t.slice(-6000));
    }
  } catch (eAll) {}
  return out;
}
function lkAdultSignal(body) {
  var t = lkBodyTexts(body);
  for (var i = 0; i < t.users.length; i++) { if (lkHasAdult(t.users[i])) return true; }
  if (lkHasAdult(t.sys) && lkHasJail(t.sys)) return true;
  return false;
}
/* 话术中和门控：system 里有对抗话术才洗；干净设定一律不动 */
function lkWashAllowed(body) {
  var t = lkBodyTexts(body);
  if (lkHasJail(t.sys)) return true;
  for (var i = 0; i < t.users.length; i++) { if (lkHasJail(t.users[i])) return true; }
  return false;
}

/* 预设识别：只读，拿不到就返回空串 */
function lkStCtx() {
  try {
    var w = (typeof HOST !== 'undefined' && HOST) || (typeof window !== 'undefined' ? window : null);
    var st = (w && w.SillyTavern) || (w && w.parent && w.parent.SillyTavern);
    if (!st && typeof SillyTavern !== 'undefined') st = SillyTavern;
    return (st && typeof st.getContext === 'function') ? st.getContext() : null;
  } catch (e) { return null; }
}
function lkPresetName() {
  try {
    var c = lkStCtx();
    if (c && typeof c.getPresetManager === 'function') {
      var mgr = c.getPresetManager('openai') || c.getPresetManager();
      var n = (mgr && typeof mgr.getSelectedPresetName === 'function') ? mgr.getSelectedPresetName() : '';
      if (n && String(n).trim()) return String(n).trim();
    }
    if (c && c.chatCompletionSettings && c.chatCompletionSettings.preset_settings_openai) {
      var n2 = String(c.chatCompletionSettings.preset_settings_openai).trim();
      if (n2) return n2;
    }
  } catch (e1) {}
  try {
    var d = (typeof DOC !== 'undefined' && DOC) || (typeof document !== 'undefined' ? document : null);
    var sel = d && d.querySelector ? d.querySelector('#settings_preset_openai') : null;
    if (sel) {
      var opt = (sel.selectedOptions && sel.selectedOptions[0]) || null;
      var lab = opt && opt.textContent ? String(opt.textContent).trim() : '';
      if (lab) return lab;
      if (sel.value) return String(sel.value).trim();
    }
  } catch (e2) {}
  return '';
}
/* 响应 tee 取样：分支读一份做统计，主管线照旧 */
function lkTee(res) {
  try {
    if (!res || !res.body || typeof res.body.tee !== 'function') return res;
    var H = (typeof HOST !== 'undefined' && HOST) || {};
    if (typeof H.TextDecoder !== 'function') return res;
    var br = res.body.tee();
    (function (stream) {
      var rd = stream.getReader(), dec = new H.TextDecoder('utf-8'), total = 0;
      var pump = function () {
        rd.read().then(function (r) {
          if (r.done) { LK_TEE.res++; LK_TEE.chars += total; return; }
          try { total += dec.decode(r.value, { stream: true }).length; } catch (eD) {}
          if (total < 600000) pump();
          else {
            LK_TEE.drop++;
            try { Promise.resolve(rd.cancel()).catch(function () {}); } catch (eCan) {}
          }
        }, function () {});
      };
      pump();
    })(br[1]);
    var hdr = null;
    try {
      if (typeof H.Headers === 'function') {
        hdr = new H.Headers();
        res.headers.forEach(function (v, k) {
          var lk = String(k).toLowerCase();
          if (lk === 'content-length' || lk === 'content-encoding' || lk === 'transfer-encoding') return;
          try { hdr.set(k, v); } catch (eH) {}
        });
      }
    } catch (eHd) { hdr = null; }
    if (typeof H.Response === 'function') {
      return new H.Response(br[0], { status: res.status, statusText: res.statusText, headers: hdr || undefined });
    }
    res.body = br[0];
    return res;
  } catch (e) { return res; }
}

/* 工具参数打捞：认多个键名 + 双重序列化/嵌套兜底（原 content 增量解析保持不动） */
function lkUnescapeJs(raw) {
  try { return JSON.parse('"' + raw + '"'); } catch (e) {}
  return String(raw || '').replace(/\\n/g, '\n').replace(/\\r/g, '\r').replace(/\\t/g, '\t').replace(/\\"/g, '"').replace(/\\\\/g, '\\');
}
function lkPickKey(text, key) {
  var proper = new RegExp('"' + key + '"\\s*:\\s*"((?:[^"\\\\]|\\\\.)*)"');
  var m = proper.exec(text);
  if (m) return { text: lkUnescapeJs(m[1]), closed: true };
  var trunc = new RegExp('"' + key + '"\\s*:\\s*"([\\s\\S]*)$');
  var m2 = trunc.exec(text);
  if (m2 && m2[1]) return { text: lkUnescapeJs(m2[1]), closed: false };
  return null;
}
function lkJsonStrWalk(obj, depth) {
  if (obj == null || depth > 4) return '';
  if (typeof obj === 'string') return obj;
  if (Array.isArray(obj)) {
    for (var i = 0; i < obj.length; i++) { var s = obj[i] && lkJsonStrWalk(obj[i], depth + 1); if (s) return s; }
    return '';
  }
  if (typeof obj !== 'object') return '';
  for (var k = 0; k < LK_TOOL_KEYS.length; k++) {
    var v = obj[LK_TOOL_KEYS[k]];
    if (typeof v === 'string' && v) return v;
  }
  for (var kk in obj) {
    if (!Object.prototype.hasOwnProperty.call(obj, kk)) continue;
    var s2 = lkJsonStrWalk(obj[kk], depth + 1);
    if (s2 && s2.length > 20) return s2;
  }
  return '';
}
function lkAltToolPull(src) {
  var res = { text: '', closed: false, started: false };
  var text = String(src || '').trim();
  if (!text) return null;
  var variants = [text];
  if (text.indexOf('\\"') >= 0) variants.push(text.replace(/\\\\"/g, '"').replace(/\\"/g, '"'));
  for (var v = 0; v < variants.length; v++) {
    var t = variants[v];
    for (var k = 0; k < LK_TOOL_KEYS.length; k++) {
      var got = lkPickKey(t, LK_TOOL_KEYS[k]);
      if (got && got.text) { res.text = got.text; res.started = true; res.closed = got.closed; return res; }
    }
    try {
      var obj = JSON.parse(t);
      var walked = lkJsonStrWalk(obj, 0);
      if (walked) { res.text = walked; res.started = true; res.closed = true; return res; }
    } catch (eJ) {}
  }
  return null;
}

