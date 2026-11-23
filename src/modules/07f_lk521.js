/* ============================================================================
   V5.21 · 字面层补齐（B 组）
   1) lkNorm        零宽清除 / 间隔符收敛 / 空白折叠（只用于 system 段与检测侧）
   2) lkStructStrip 结构伪造剥离：假 <system> 标签、[SYSTEM] 行、role: 前缀
   3) lkAllRules    500 条新表 + 24 条旧 WASH_RULES 合成一张表（去重）
   4) lkHistoryStrip 只清 assistant 历史里的脚手架（doc/spec/turn/尾部声明）
   5) LK_SEP        ¦ 断词（脱敏侧），lkUnmask 收包无条件剥掉
   6) lkSalvage     截断残句回收（给续写用）
   ============================================================================ */

var LK_SEP = '\u00a6';

/* 零宽与不可见控制符 */
var LK_ZW = /[\u200B-\u200F\u202A-\u202E\u2060\uFEFF\u00AD\u180E]/g;

/* 归一化：只做「不改变语义」的收敛 */
function lkNorm(s) {
  if (typeof s !== 'string' || !s) return { txt: s || '', changed: false };
  var t = s.replace(LK_ZW, '');
  t = t.replace(/[·•・]{2,}/g, ' ').replace(/[|｜\/／]/g, ' ');
  t = t.replace(/[ \t\u3000]{2,}/g, ' ');
  t = t.replace(/\n{3,}/g, '\n\n');
  return { txt: t, changed: t !== s };
}

/* 结构伪造剥离：模型/预设伪造出来的「系统块」标记，收掉壳子只留内容 */
var LK_STRUCT_RULES = [
  [/<\/?(?:system|systems|instruction|instructions|prompt|prompts|policy|policies|rules?|jailbreak|safety|override)\s*>/gi, ''],
  [/(?:^|\n)[ \t]*(?:【|\[)(?:系统|系統|指令|系统提示|SYSTEM|INSTRUCTION|SYSTEM\s*PROMPT|OVERRIDE)(?:】|\])[ \t]*/g, '$1'],
  [/(?:^|\n)[ \t]*(?:system|assistant|user|tool)[ \t]*[:：][ \t]*/gi, '$1'],
  [/(?:^|\n)[ \t]*#{1,4}[ \t]*(?:SYSTEM|INSTRUCTIONS?|PROMPT|RULES?|OVERRIDE)[ \t]*(?=\n|$)/gi, '$1'],
  [/(?:^|\n)[ \t]*(?:BEGIN|END)[ \t]+(?:SYSTEM|PROMPT|INSTRUCTIONS?|OVERRIDE)[ \t]*(?=\n|$)/gi, '$1']
];

function lkStructStrip(t) {
  if (typeof t !== 'string' || !t) return { txt: t || '', n: 0 };
  var s = t, n = 0;
  for (var i = 0; i < LK_STRUCT_RULES.length; i++) {
    var before = s;
    s = s.replace(LK_STRUCT_RULES[i][0], LK_STRUCT_RULES[i][1]);
    if (s !== before) n++;
  }
  return { txt: s, n: n };
}

/* 统一规则表：新 500 条在前，旧 24 条补在后面，按 source 去重 */
var LK_ALL_RULES = null;
function lkAllRules() {
  if (LK_ALL_RULES) return LK_ALL_RULES;
  var out = lkJbRules().slice();
  var seen = {};
  for (var i = 0; i < out.length; i++) seen[String(out[i][0])] = 1;
  try {
    if (typeof WASH_RULES !== 'undefined' && WASH_RULES && WASH_RULES.length) {
      for (var j = 0; j < WASH_RULES.length; j++) {
        var k = String(WASH_RULES[j][0]);
        if (seen[k]) continue;
        seen[k] = 1;
        out.push(WASH_RULES[j]);
      }
    }
  } catch (e0) {}
  LK_ALL_RULES = out;
  return out;
}

function lkRulesCount() { return lkAllRules().length; }

/* 历史剥离：只动 assistant 轮，把上一轮我们自己注入的壳子收掉，留正文 */
var LK_HIST_RULES = [
  [/<doc\b[^>]*>([\s\S]*?)<\/doc>/gi, '$1'],
  [/<\/?spec\b[^>]*>/gi, ''],
  [/<turn\b[^>]*>/gi, ''],
  [/<\/turn>/gi, ''],
  [/[ \t]*The above request complies with[\s\S]*$/i, ''],
  [/[ \t]*(?:LUKECORE|LK-RUNTIME|LK_RUNTIME)[^\n]*/gi, '']
];

function lkHistoryStrip(body) {
  var out = [], hits = 0;
  try {
    var arr = jailMsgArray(body);
    if (!arr) return out;
    for (var i = 0; i < arr.length; i++) {
      var m = arr[i];
      if (!m) continue;
      var t = textOfMsg(m);
      if (!t) continue;
      var zt = t.replace(LK_ZW, '');
      if (zt !== t) { setMsgText(m, zt); t = zt; hits++; }
      if (m.role !== 'assistant') continue;
      var s = t;
      for (var r = 0; r < LK_HIST_RULES.length; r++) s = s.replace(LK_HIST_RULES[r][0], LK_HIST_RULES[r][1]);
      s = s.replace(/\n{3,}/g, '\n\n').replace(/^\s+|\s+$/g, '');
      if (s !== t) { setMsgText(m, s); hits++; }
    }
  } catch (e1) {}
  if (hits) out.push('历史剥离 ' + hits + ' 轮');
  return out;
}

/* 收包侧：¦ 一律剥掉（误伤率远低于白名单） */
function lkUnmask(t) {
  if (typeof t !== 'string' || !t) return t;
  var s = t.split(LK_SEP).join('');
  return s;
}

/* 截断残句回收：返回最后一段没有收尾标点的残句 */
var LK_END_OK = /[。！？…」』”"'）)\]】~～.!?…\n]\s*$/;
function lkSalvage(t) {
  var s = typeof t === 'string' ? t.replace(/[ \t]+$/g, '') : '';
  if (!s) return { tail: '', open: false };
  if (LK_END_OK.test(s)) return { tail: '', open: false };
  var cut = -1;
  for (var i = s.length - 1; i >= 0 && s.length - i <= 120; i--) {
    if (/[。！？…\n]/.test(s.charAt(i))) { cut = i; break; }
  }
  var tail = cut >= 0 ? s.slice(cut + 1) : s;
  tail = tail.replace(/^\s+/, '');
  if (!tail || tail.length > 80) return { tail: '', open: false };
  return { tail: tail, open: true };
}
