/* 15_ooc.js — v0.76 反 OOC：点名 / 反模板 / 变更门槛 / 口吻一致
 *
 * 四件事，四个开关，各管各的：
 *   点名      —— 先认出这一轮在场的是谁，再让他们各自对照世界书；
 *   反模板    —— 同一类情绪别用现成的动作包（眼底闪过、嘴角勾起…）；
 *   变更门槛  —— 态度 / 关系 / 立场变了，要指得出是哪件事改的；
 *   口吻一致  —— 说话方式、称呼、口癖跟前文一致（换人检验）。
 *
 * 三条不变量（与 12_narr.js 同）：
 *   1) 预设只读：这里只决定自己注不注，从不删改请求体里预设的任何内容；
 *   2) 幂等：注入前先剥掉上一次的块，注一次和注十次结果完全一样；
 *   3) 失败安全：任何一步抛错都退化成「什么都不注」，绝不让它弄坏正常请求。
 *
 * 注入通道：优先酒馆自己的扩展提示位（setExtensionPrompt，IN_CHAT / depth 4）；
 * 宿主没有这个方法时回落成「贴末条 user 消息尾部」，与叙述层同一位置。
 *   ★ 扩展提示位是宿主持久保存的：写进去之后由宿主自己在下一轮拼提示时带上，
 *     所以这条路径不改请求体、也不会和回落路径同时生效（oocApply 返回 true 时
 *     planRequest 不会再调 oocBodyPatch）。
 *
 * 世界书：只读 ctx.characters[this_chid].data.extensions.world → loadWorldInfo(book)。
 *   loadWorldInfo 在部分版本上是 Promise，这里只吃同步返回值；拿到 Promise 就当
 *   拿不到（宁可这一轮不点名，也不把请求挂死）。
 */

var OOC_TAG = '〔AR-OOC 1.0〕';
var OOC_KEY = 'ar6.ooc';
var OOC_ITEMS = ['roll', 'tpl', 'chg', 'voice'];
var OOC_CFGKEY = { roll: 'oocRoll', tpl: 'oocTpl', chg: 'oocChg', voice: 'oocVoice' };
var OOC_LABEL = { roll: '点名', tpl: '反模板', chg: '变更门槛', voice: '口吻一致' };

/* ---------------- 文案 ----------------
   四段各自成块，各自带同一个头（OOC_TAG），中间空一行。
   面板预览与注入用的是同一份文案，不许只改一边：
   改一个字，用户面板上看到的和这里给的就不是同一份东西了。
   {{user}} 原样保留，输出前由 oocFill() 换成真名（拿不到就换「你」）。 */
var OOC_SEG_TPL = OOC_TAG + '\n' +
  '同一类情绪，不要用现成的动作包打发——眼底闪过、嘴角勾起、喉结滚动、\n' +
  '呼吸一滞、身子一僵，这类动作谁都能做，写了等于没写。\n' +
  '\n' +
  '不要用一句话概括一个人的全部性格，也不要让他只当「那个温柔的人」。\n' +
  '\n' +
  '他做的动作，得是这个人做得出来的动作。';

var OOC_SEG_CHG = OOC_TAG + '\n' +
  '一个人对另一个人的态度、关系、立场变了，要指得出是哪件事改变的、中间经过什么。\n' +
  '\n' +
  '说不出缘由的变化，不要写。';

var OOC_SEG_VOICE = OOC_TAG + '\n' +
  '他的说话方式、称呼、口癖、句子长短，跟前文保持一致。\n' +
  '\n' +
  '检验方法：把这句话换给另一个人说，如果照样成立，那就是写错了，重写。';

/* 点名：名单由调用方拼，「、」连接 + 「。」 */
function oocRollSeg(names) {
  var list = String((names || []).join('、')).replace(/[、\s]+$/, '');
  return OOC_TAG + '\n' +
    '本轮涉及的角色：' + list + '。\n' +
    '\n' +
    '动笔前，逐一对照世界书里他们各自的条目——\n' +
    '他怎么说话、对{{user}}是什么态度、什么事他不会做。\n' +
    '\n' +
    '世界书写了的，以世界书为准；世界书没写的，按前文已经写过的演，不要改。';
}

/* ---------------- 配置 ---------------- */

function oocFlag(v, dflt) {
  if (v === undefined || v === null) return dflt;
  return !!v;
}

/* 总闸关 → 返回 null（调用方一律当「什么都不做」）。
   注意：读的是 cfg 里的存值；CFG_DEFAULT 的默认值是 off，迁移不重跑。 */
function oocCfg() {
  var c = (cfg && typeof cfg === 'object') ? cfg : null;
  if (!c) return null;
  if (String(c.ooc == null ? 'off' : c.ooc) !== 'on') return null;
  return {
    roll: oocFlag(c.oocRoll, true),
    tpl: oocFlag(c.oocTpl, true),
    chg: oocFlag(c.oocChg, false),
    voice: oocFlag(c.oocVoice, true)
  };
}

/* 单项是否开着（面板渲染用；总闸关时一律当关） */
function oocOnOf(item) {
  var c = oocCfg();
  if (!c) return false;
  return !!c[item];
}

/* ---------------- 宿主上下文（老 ST 可能什么都没有） ---------------- */

function oocCtx() {
  try {
    if (typeof stCtx === 'function') {
      var c = stCtx();
      if (c) return c;
    }
  } catch (e0) {}
  try {
    var st = (typeof HOST !== 'undefined' && HOST) ? HOST.SillyTavern : null;
    if (st && typeof st.getContext === 'function') return st.getContext();
  } catch (e1) {}
  return null;
}

/* 这个角色绑的世界书名；没绑返回空串 */
function oocBook() {
  try {
    var c = oocCtx();
    if (!c) return '';
    var list = c.characters;
    var id = c.this_chid;
    if (list == null || id == null || id === '') return '';
    var n = +id;
    if (!isFinite(n) || n < 0) return '';
    var ch = list[n];
    if (!ch) return '';
    var d = ch.data;
    var ext = d && d.extensions;
    var w = ext && ext.world;
    return String(w == null ? '' : w).trim();
  } catch (e) { return ''; }
}

/* 世界书条目 → 人物名单。只认两种写法：
   P1  comment 带 [角色] / [人物] / [NPC] … 前缀；
   P2  comment 本身就是 2~6 字的纯名字，且每个 key 也都是 2~6 字纯名字。 */
var OOC_NAME_RE = /^[\u4e00-\u9fa5A-Za-z·]{2,6}$/;
var OOC_P1_RE = /^\[(角色|人物|NPC|npc|char|Char)\]\s*/;

function oocTrim(s) {
  return String(s == null ? '' : s).replace(/^[\s\u3000]+|[\s\u3000]+$/g, '');
}

function oocKeys(e) {
  var out = [];
  if (!e || !Array.isArray(e.key)) return out;
  for (var i = 0; i < e.key.length; i++) {
    var k = oocTrim(e.key[i]);
    if (!k) continue;
    if (out.indexOf(k) < 0) out.push(k);
  }
  return out;
}

/* 世界书数据的同步缓存。
   新版酒馆的 ctx.loadWorldInfo 返回 Promise，同步路径拿不到；这里把 Promise
   的结果回填进来，下一次渲染 / 下一轮请求就能用（TTL 30 秒，改完世界书不用刷新）。
   key 是书名；只缓存成功解析过的整本数据。 */
var OOC_BOOK_CACHE = {};
var OOC_BOOK_WAIT = {};
var OOC_BOOK_TTL = 30000;

function oocBookCached(book, c) {
  var hit = OOC_BOOK_CACHE[book];
  if (hit) {
    if ((Date.now() - hit.at) < OOC_BOOK_TTL) return hit.data;
    delete OOC_BOOK_CACHE[book];
  }
  var data;
  try { data = c.loadWorldInfo(book); } catch (e0) { return null; }
  if (data && typeof data.then === 'function') {
    /* Promise 不认识，也没法在这里 await —— 挂一次 then 回填，这一轮先当拿不到 */
    if (!OOC_BOOK_WAIT[book]) {
      OOC_BOOK_WAIT[book] = 1;
      try {
        data.then(function (d) {
          delete OOC_BOOK_WAIT[book];
          if (d && typeof d === 'object') OOC_BOOK_CACHE[book] = { data: d, at: Date.now() };
        }, function () { delete OOC_BOOK_WAIT[book]; });
      } catch (e1) { delete OOC_BOOK_WAIT[book]; }
    }
    return null;
  }
  if (!data || typeof data !== 'object') return null;
  return data;
}

function oocPeople(bookName) {
  var out = [];
  var book = oocTrim(bookName);
  if (!book) return out;
  var c = oocCtx();
  if (!c || typeof c.loadWorldInfo !== 'function') return out;
  var data = oocBookCached(book, c);
  if (!data) return out;
  var ent = data.entries;
  if (!ent || typeof ent !== 'object') return out;

  var seen = {};
  var i, e, cm, nm, keys, m;
  var uids = [];
  if (Array.isArray(ent)) {
    for (i = 0; i < ent.length; i++) uids.push(i);
  } else {
    for (var k in ent) if (Object.prototype.hasOwnProperty.call(ent, k)) uids.push(k);
  }

  for (i = 0; i < uids.length && out.length < 40; i++) {
    e = ent[uids[i]];
    if (!e || typeof e !== 'object') continue;
    if (e.disable === true) continue;
    cm = oocTrim(e.comment);
    if (!cm) continue;
    nm = '';
    keys = oocKeys(e);
    m = OOC_P1_RE.exec(cm);
    if (m) {
      nm = oocTrim(cm.slice(m[0].length));
      if (!nm) continue;
    } else if (OOC_NAME_RE.test(cm) && keys.length) {
      var ok = true;
      for (var j = 0; j < keys.length; j++) {
        if (!OOC_NAME_RE.test(keys[j])) { ok = false; break; }
      }
      if (!ok) continue;
      nm = cm;
    } else {
      continue;
    }
    if (seen[nm]) continue;
    seen[nm] = 1;
    out.push({ name: nm, keys: keys });
  }
  return out;
}

/* 在场：按 key 在最近两条消息里出现几次排序，取前 6。
   次数相同按世界书里的先后，保证同一段对话里名单稳定。 */
function oocPresent(people, text) {
  var out = [];
  if (!people || !people.length) return out;
  var t = String(text == null ? '' : text);
  if (!t) return out;
  var hit = [];
  for (var i = 0; i < people.length; i++) {
    var p = people[i];
    if (!p) continue;
    var ks = p.keys || [];
    var n = 0;
    for (var j = 0; j < ks.length; j++) {
      var k = String(ks[j] == null ? '' : ks[j]);
      if (!k) continue;
      var at = t.indexOf(k);
      while (at >= 0) {
        n++;
        at = t.indexOf(k, at + k.length);
        if (n > 99) break;
      }
    }
    if (n > 0) hit.push({ name: String(p.name || ''), n: n, i: i });
  }
  if (!hit.length) return out;
  hit.sort(function (a, b) { return (b.n - a.n) || (a.i - b.i); });
  for (var q = 0; q < hit.length && q < 6; q++) out.push(hit[q].name);
  return out;
}

/* 最近两条消息的正文；ctx.chat 不可用时返回空串 */
function oocRecent() {
  try {
    var c = oocCtx();
    if (!c) return '';
    var ch = c.chat;
    if (!ch || !ch.length) return '';
    var from = ch.length - 2;
    if (from < 0) from = 0;
    var parts = [];
    for (var i = from; i < ch.length; i++) {
      var m = ch[i];
      if (!m) continue;
      parts.push(String(m.mes == null ? '' : m.mes));
    }
    return parts.join('\n');
  } catch (e) { return ''; }
}

/* ---------------- 冲突选项（只在本会话内，不落配置） ----------------
   'script' = 用我们的；'preset' = 听预设的（这一段就不注了）。 */
var OOC_CHOICE = {};

function oocChoice(item) {
  var v = OOC_CHOICE[String(item == null ? '' : item)];
  return (v === 'script' || v === 'preset') ? v : '';
}

function oocSetChoice(item, v) {
  var k = String(item == null ? '' : item);
  if (OOC_ITEMS.indexOf(k) < 0) return '';
  if (v !== 'script' && v !== 'preset') { delete OOC_CHOICE[k]; return ''; }
  OOC_CHOICE[k] = v;
  return v;
}

function oocResetChoice() {
  for (var i = 0; i < OOC_ITEMS.length; i++) delete OOC_CHOICE[OOC_ITEMS[i]];
}

/* ---------------- 拼接 ---------------- */

/* {{user}} → 真名（拿不到就用「你」）。这里不碰尖括号，文案里也没有 <user>。 */
function oocFill(t) {
  var s = String(t == null ? '' : t);
  if (s.indexOf('{{user}}') < 0) return s;
  var n = '';
  try { if (typeof narrUserName === 'function') n = narrUserName(); } catch (e) {}
  return s.split('{{user}}').join(n || '你');
}

/* 这一轮要注的整块；总闸关 / 四项全关时返回空串 */
function oocText() {
  var c = oocCfg();
  if (!c) return '';
  var parts = [];

  /* 先算「这一轮提到了谁」。世界书里一个人物都认不出来时不做拦截
     （可能是没绑世界书，不能因此把功能关掉）；但只要认得出人物、
     而最近两条消息里一个都没提到，就整块不注——没人在场的时候
     跟模型讲「别写 OOC」只是噪音，还白花 token。 */
  var names = [];
  var known = 0;
  try {
    var book = oocBook();
    if (book) {
      var people = oocPeople(book);
      known = people.length;
      if (known) names = oocPresent(people, oocRecent());
    }
  } catch (e0) { names = []; known = 0; }
  if (known > 0 && !names.length) return '';

  /* 1) 点名：认不出人就不注这一段（写「本轮涉及的角色：。」没有意义） */
  if (c.roll && oocChoice('roll') !== 'preset') {
    if (names.length) parts.push(oocFill(oocRollSeg(names)));
  }

  /* 2~4) 反模板 → 变更门槛 → 口吻一致（顺序固定，别按开关顺序拼） */
  if (c.tpl && oocChoice('tpl') !== 'preset') parts.push(oocFill(OOC_SEG_TPL));
  if (c.chg && oocChoice('chg') !== 'preset') parts.push(oocFill(OOC_SEG_CHG));
  if (c.voice && oocChoice('voice') !== 'preset') parts.push(oocFill(OOC_SEG_VOICE));

  return parts.join('\n\n');
}

/* 粗估 token（中文约 0.7 tok/字），只给面板一个量级 */
function oocTokens() {
  var t = '';
  try { t = oocText(); } catch (e) { t = ''; }
  return t ? Math.round(t.length * 0.7) : 0;
}

function oocLabel() {
  var c = oocCfg();
  if (!c) return '关';
  var out = [];
  for (var i = 0; i < OOC_ITEMS.length; i++) {
    var k = OOC_ITEMS[i];
    if (!c[k] || oocChoice(k) === 'preset') continue;
    out.push(OOC_LABEL[k]);
  }
  return out.length ? out.join('+') : '关';
}

/* ---------------- 注入 ---------------- */

/* 剥掉上一次注入的块。
   我们的块永远是整块贴在尾部（四段各带同一个头，块内没有别人的东西），
   所以从第一个标记砍到结尾即可；剥完把尾部空白收掉，免得每轮多一行空行。 */
function oocStrip(s) {
  var t = String(s == null ? '' : s);
  var i = t.indexOf(OOC_TAG);
  if (i < 0) return t;
  return t.slice(0, i).replace(/[ \t\r\n]+$/, '');
}

/* 扩展提示位通道：拿得到 ctx 且它真的有 setExtensionPrompt 才算 */
function oocChannel() {
  try {
    var c = oocCtx();
    if (c && typeof c.setExtensionPrompt === 'function') return c;
  } catch (e) {}
  return null;
}

/* 写扩展提示位。true = 这一次走的就是这条通道；false = 交给 oocBodyPatch 回落。
   文本为空时写空串，等于把上一轮留下的块清掉（不然关掉总闸之后它还在）。 */
function oocApply() {
  var text = '';
  try { text = oocText(); } catch (e0) { text = ''; }
  var c = oocChannel();
  if (!c) return false;
  try {
    c.setExtensionPrompt(OOC_KEY, text, 1, 4, false, 0);
    return true;
  } catch (e1) { return false; }
}

/* 回落通道：贴到最后一条 role==='user' 的 content 尾部（与 narrApply 同一位置）。
   只改传进来的 body 副本，聊天记录一个字节都不动。
   返回改动描述数组，调用方必须 push 到 out.changed，否则不会序列化。 */
function oocBodyPatch(body) {
  var out = [];
  if (!body || typeof body !== 'object') return out;
  var msgs = (body.request && typeof body.request === 'object' && Array.isArray(body.request.messages))
    ? body.request.messages
    : (Array.isArray(body.messages) ? body.messages : null);
  if (!msgs || !msgs.length) return out;

  var idx = -1;
  for (var i = msgs.length - 1; i >= 0; i--) {
    var m = msgs[i];
    if (m && String(m.role || '') === 'user') { idx = i; break; }
  }
  if (idx < 0) return out;

  var m2 = msgs[idx];
  var old = '';
  try { old = String(textOfMsg(m2) || ''); } catch (e0) { old = ''; }
  var base = oocStrip(old);
  var block = '';
  try { block = oocText(); } catch (e1) { block = ''; }

  if (!block) {
    if (base !== old) {
      try { setMsgText(m2, base); } catch (e2) { return out; }
      out.push('反OOC:清掉');
    }
    return out;
  }

  var sep = '';
  if (base) sep = /\n$/.test(base) ? '\n' : '\n\n';
  var next = base + sep + block;
  if (next !== old) {
    try { setMsgText(m2, next); } catch (e3) { return out; }
    out.push('反OOC:' + oocLabel());
  }
  return out;
}

/* ---------------- 预设签名：预设是不是已经自带同类指令 ----------------
   §1 的四组关键词，只认有没有，不认强弱。扫的是「真正启用」的条目：
   prompt_order[].order[] 里 enabled===true 的，用 .identifier 映射回 prompts[i]，
   映射不上就按同一位置的索引对齐（老预设没有 identifier）。 */
var OOC_SIG_WORDS = {
  tpl: ['模板', '脸谱', '刻板', '桥段', 'stereotyp', 'trope', 'cliché'],
  chg: ['变化', '缘由', '转变', '动机', 'event', 'process'],
  voice: ['口吻', '说话方式', '口头禅', 'voice', 'tone', 'speech pattern'],
  roll: ['世界书', '人设', '角色设定', 'lorebook', 'persona']
};

function oocHitWord(words, text) {
  var s = String(text == null ? '' : text).toLowerCase();
  for (var i = 0; i < words.length; i++) {
    var w = String(words[i] || '').toLowerCase();
    if (w && s.indexOf(w) >= 0) return w;
  }
  return '';
}

function oocSigName(p, text) {
  var nm = oocTrim(p && (p.name || p.identifier));
  var sn = String(text == null ? '' : text).replace(/\s+/g, ' ').replace(/^[\s\u3000]+/, '').slice(0, 20);
  if (nm && sn) return nm + ' · ' + sn;
  return nm || sn;
}

/* 当前预设对象；拿不到就返回 null（拿不到 = 不弹窗，不会误判） */
function oocPreset() {
  try {
    var c = oocCtx();
    if (c) {
      if (c.preset && Array.isArray(c.preset.prompt_order)) return c.preset;
      if (c.presetManager && Array.isArray(c.presetManager.prompt_order)) return c.presetManager;
      if (typeof c.getPresetManager === 'function') {
        var pm = c.getPresetManager();
        if (pm && Array.isArray(pm.prompt_order)) return pm;
      }
    }
  } catch (e0) {}
  try {
    var st = (typeof HOST !== 'undefined' && HOST) ? HOST.SillyTavern : null;
    if (st && typeof st.getPresetManager === 'function') {
      var pm2 = st.getPresetManager();
      if (pm2 && Array.isArray(pm2.prompt_order)) return pm2;
    }
  } catch (e1) {}
  return null;
}

function oocMatchPrompt(prompts, o, j) {
  var id = (o && o.identifier != null) ? String(o.identifier) : '';
  if (id) {
    for (var i = 0; i < prompts.length; i++) {
      var p = prompts[i];
      if (p && String(p.identifier == null ? '' : p.identifier) === id) return p;
    }
  }
  var q = prompts[j];
  return (q && typeof q === 'object') ? q : null;
}

function oocSig(preset) {
  var sig = { tpl: false, chg: false, voice: false, roll: false, hits: {} };
  var p = null;
  try { p = preset || oocPreset(); } catch (e0) { p = null; }
  if (!p || typeof p !== 'object') return sig;
  var prompts = Array.isArray(p.prompts) ? p.prompts : [];
  var orders = Array.isArray(p.prompt_order) ? p.prompt_order : [];
  if (!orders.length) return sig;

  var used = {};
  for (var i = 0; i < orders.length; i++) {
    var ord = orders[i] && orders[i].order;
    if (!Array.isArray(ord)) continue;
    for (var j = 0; j < ord.length; j++) {
      var o = ord[j];
      if (!o || o.enabled !== true) continue;      /* 只认真正启用的条目 */
      var pr = oocMatchPrompt(prompts, o, j);
      if (!pr) continue;
      var mk = String(pr.identifier == null ? j : pr.identifier);
      if (used[mk]) continue;
      used[mk] = 1;
      var text = String(pr.content == null ? '' : pr.content);
      if (!text) continue;
      for (var t = 0; t < OOC_ITEMS.length; t++) {
        var k = OOC_ITEMS[t];
        if (sig[k]) continue;
        if (!oocHitWord(OOC_SIG_WORDS[k], text)) continue;
        sig[k] = true;
        sig.hits[k] = oocSigName(pr, text);
      }
    }
  }
  return sig;
}

/* 需要问的项：开着 + 预设也管了 + 还没定过。
   一旦用户勾了「以后都按这个来」（cfg.oocPolicy），就直接按全局策略落定，不再问。 */
function oocAsk() {
  var out = [];
  var c = oocCfg();
  if (!c) return out;
  var pol = String((cfg && cfg.oocPolicy) || '');
  if (pol !== 'script' && pol !== 'preset') pol = '';
  var sig = null;
  try { sig = oocSig(); } catch (e0) { return out; }
  for (var i = 0; i < OOC_ITEMS.length; i++) {
    var k = OOC_ITEMS[i];
    if (!c[k]) continue;
    if (!sig[k]) continue;
    if (oocChoice(k)) continue;
    if (pol) { OOC_CHOICE[k] = pol; continue; }
    out.push(k);
  }
  return out;
}

/* ---------------- 面板 ---------------- */

/* 子 chip 上的字：开 / 关 / 听预设（听预设时 chip 本身置灰） */
var OOC_ICON = { roll: '🧩', tpl: '🚫', chg: '🔒', voice: '🗣' };

function oocChipLabel(item) {
  var k = String(item == null ? '' : item);
  var nm = OOC_LABEL[k] || k;
  var ic = OOC_ICON[k] || '🎛';
  if (oocChoice(k) === 'preset') return ic + ' ' + nm + ':听预设';
  return ic + ' ' + nm + ':' + (oocOnOf(k) ? '开' : '关');
}

/* 状态行：世界书 + 认出来几个人。只读，不改任何状态。 */
function oocStatusLine() {
  try {
    var book = oocBook();
    if (!book) return '这个角色没绑世界书';
    var people = oocPeople(book);
    if (!people.length) return '世界书：' + book + ' · 没认出人物条目';
    return '世界书：' + book + ' · 识别到 ' + people.length + ' 个人物';
  } catch (e) { return ''; }
}
