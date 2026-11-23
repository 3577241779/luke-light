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

/* V5.65 结构安全保护段：代码块 / 行内代码 / XML标签 / ST宏 / URL / Markdown表格行 / SQL语句 / JSON键名与JSONPatch路径 */
var LK_STRUCT_SAFE_RE = /(```[\s\S]*?```|`[^`\n]*`|<[^>]*>|\{\{[^}]*\}\}|https?:\/\/[^\s"'<>]+|^[ \t]*\|[^\n]*\|[ \t]*$|\b(?:CREATE|ALTER|DROP|INSERT\s+(?:OR\s+REPLACE\s+)?INTO|REPLACE\s+INTO|UPDATE|DELETE\s+FROM|SELECT)\b[^;\n]*;?|"(?:[^"\\]|\\.)*"\s*:|"(?:\/[^"\s\\]+)+")/gm;

/* 判定消息是否携带工具调用/思考签名等协议元数据（不可被降权/清洗/码点破坏结构） */
function lkIsProtectedMsg(m) {
  if (!m || typeof m !== 'object') return false;
  if (m.role === 'tool' || m.role === 'function') return true;
  if (Array.isArray(m.tool_calls) && m.tool_calls.length) return true;
  if (m.function_call || m.tool_call_id) return true;
  if (m.thoughtSignature || m.thought_signature || m.reasoning_details || m.extra_content || m.provider_specific_fields) return true;
  if (Array.isArray(m.content)) {
    for (var i = 0; i < m.content.length; i++) {
      var c = m.content[i];
      if (c && typeof c === 'object' && (c.type === 'tool_use' || c.type === 'tool_result')) return true;
    }
  }
  if (Array.isArray(m.parts)) {
    for (var j = 0; j < m.parts.length; j++) {
      var p = m.parts[j];
      if (p && typeof p === 'object' && (p.functionCall || p.functionResponse || p.thoughtSignature || p.thought_signature)) return true;
    }
  }
  return false;
}

/* V5.65 预设适配主导权开关：默认 'on'（卢克之光强权优先），'off' 为礼让预设 */
function presetCompatForce() {
  try { return !(cfg && String(cfg.presetCompat) === 'off'); }
  catch (e) { return true; }
}

/* 通用区分「纯正文交付载具工具」与「结构化多字段业务引擎工具」（基于字段结构与通用语义动词，不绑定任何特定预设名） */
var LK_ENGINE_TOOL_RE = /(?:workflow|engine|state|table|database|phone|hud|status|scene|event|inventory|quest|memory|search|fetch|image|draw|ping_check)/i;
var LK_THINK_TOOL_RE = /^(?:think|thinking|plan|planning|cot|reason|reasoning|draft|scratchpad)(?:$|[_-])/i;
var LK_CARRIER_TOOL_RE = /^(?:lk_write|submit_story_output|game_content|emit_complete_response(?:_[a-zA-Z0-9_]+)?|write_to_file(?:_[a-zA-Z0-9_]+)?|[a-zA-Z0-9_-]+_(?:content|reply|story|response|output|narrative))$/i;
var LK_CARRIER_FIELD_RE = /^(?:text|content|story|reply|output|response|body|narrative|prose|main_text|game_content)$/i;
function lkClassifyTools(root) {
  var out = { hasTools: false, allCarrier: false, hasEngine: false, hasExternal: false, names: [] };
  if (!root || typeof root !== 'object') return out;
  var list = Array.isArray(root.tools) ? root.tools : (Array.isArray(root.functions) ? root.functions : null);
  if (!list || !list.length) return out;
  out.hasTools = true;
  var carrierCount = 0;
  for (var i = 0; i < list.length; i++) {
    var it = list[i];
    if (!it || typeof it !== 'object') continue;
    var fn = (it.function && typeof it.function === 'object') ? it.function : it;
    var nm = String(fn.name || '').trim();
    if (nm) out.names.push(nm);
    var props = fn.parameters && fn.parameters.properties;
    var propKeys = (props && typeof props === 'object') ? Object.keys(props) : [];
    var propCount = propKeys.length;
    /* 1) 参数字段 >= 3 或命中通用业务域动词：一律按业务引擎工具保护，严禁强拆 */
    if (propCount >= 3 || LK_ENGINE_TOOL_RE.test(nm)) {
      out.hasEngine = true;
      continue;
    }
    /* 2) 思考型辅助工具（如 think_* / plan_*）：按复合工具流保护，不强拆为单一正文载具 */
    if (LK_THINK_TOOL_RE.test(nm)) {
      out.hasExternal = true;
      continue;
    }
    /* 3) 参数简单（<= 2 字段）且命名属通用正文交付载具，或纯单字段 string 文本交付载具（如 { text: string }） */
    var isSingleTextCarrier = false;
    if (propCount === 1) {
      var onlyKey = propKeys[0];
      var onlySpec = props[onlyKey];
      var onlyType = onlySpec && typeof onlySpec.type === 'string' ? onlySpec.type.toLowerCase() : '';
      if (LK_CARRIER_FIELD_RE.test(onlyKey) && (!onlyType || onlyType === 'string')) {
        isSingleTextCarrier = true;
      }
    }
    if (LK_CARRIER_TOOL_RE.test(nm) || isSingleTextCarrier) {
      carrierCount++;
      continue;
    }
    out.hasExternal = true;
  }
  out.allCarrier = carrierCount > 0 && !out.hasEngine && !out.hasExternal;
  return out;
}

/* 归一化（V5.65）：先切出结构保护段，绝不破坏 XML 闭合标签、Markdown 表格竖线、URL 与 JSONPatch 路径；
   仅在普通自然语言段内清除零宽字符、收敛全角间隔符与汉字间插符混淆（如 越/狱、破|限）。 */
function lkNorm(s) {
  if (typeof s !== 'string' || !s) return { txt: s || '', changed: false };
  LK_STRUCT_SAFE_RE.lastIndex = 0;
  var parts = s.split(LK_STRUCT_SAFE_RE);
  for (var i = 0; i < parts.length; i += 2) {
    var seg = parts[i];
    if (!seg) continue;
    seg = seg.replace(LK_ZW, '');
    seg = seg.replace(/[·•・]{2,}/g, ' ').replace(/[｜／]/g, ' ');
    /* 只清汉字之间夹带的混淆斜杠/竖线（跑两遍覆盖 3~4 字连续插符） */
    seg = seg.replace(/([\u4e00-\u9fa5])[|\/]([\u4e00-\u9fa5])/g, '$1$2');
    seg = seg.replace(/([\u4e00-\u9fa5])[|\/]([\u4e00-\u9fa5])/g, '$1$2');
    seg = seg.replace(/[ \t\u3000]{2,}/g, ' ');
    seg = seg.replace(/\n{3,}/g, '\n\n');
    parts[i] = seg;
  }
  var t = parts.join('');
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
