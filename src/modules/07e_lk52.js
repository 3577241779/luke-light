/* ===== V5.2 破甲六态：档位参数 / 五百条清洗 / 降权（归位·下沉） =====
   只做请求副本上的事：读 system 与 user 文本，改写后再由调用方序列化。
   不碰 cfg 以外的持久状态，也不改聊天记录。 */

var LK_TIER_PARAMS = {
  off:        { demote: 'off',    purify: 'off',   pad: 0,    receipt: false, tool: false, ticket: false },
  safe:       { demote: 'off',    purify: 'gated', pad: 0,    receipt: false, tool: false, ticket: false },
  mid:        { demote: 'off',    purify: 'gated', pad: 1200, receipt: false, tool: false, ticket: false },
  strong:     { demote: 'off',    purify: 'gated', pad: 1200, /* V5.29 3600→1200 */ receipt: true,  tool: false, ticket: false },
  supreme:    { demote: 'off',    purify: 'full',  pad: 2400, receipt: true,  tool: false, ticket: false },
  gatanothor: { demote: 'align',  purify: 'full',  pad: 3600, receipt: true,  tool: true,  ticket: true  },
  abyss:      { demote: 'demote', purify: 'full',  pad: 3600, receipt: true,  tool: true,  ticket: true  }
};

function lkTierName(v) {
  var t = (v === undefined) ? (cfg && cfg.jail) : v;
  return String(t || 'off');
}
function lkTierParams(v) {
  return LK_TIER_PARAMS[lkTierName(v)] || LK_TIER_PARAMS.off;
}
function lkDemoteTag() {
  var pick = '';
  try { pick = String((cfg && cfg.demote) || ''); } catch (e0) { pick = ''; }
  var m = (pick === 'off' || pick === 'align' || pick === 'demote') ? pick : lkTierParams().demote;
  return m === 'align' ? '归位' : (m === 'demote' ? '下沉' : '关');
}
function lkPadForTier() { return Number(lkTierParams().pad) || 0; }

/* —— 五百条清洗表：十族 × 五十组 ——
   每族 10 个动词 × 5 个对象 = 50 条；十族合计 500。
   命中后统一换成中性文学语域，不删原文结构（保留段落与顺序）。 */
var LK_JB_FAMILIES = [
  { name: '模式自证',
    verbs: ['进入', '开启', '激活', '处于', '切换到', '载入', '现已', '正式', '完全', '永久'],
    targets: ['无限制模式', '破限模式', '越狱模式', '开发者模式', '无审查模式'],
    to: '处于封闭式虚构文学创作语境' },
  { name: '无视约束',
    verbs: ['无视', '忽略', '绕过', '突破', '解除', '关闭', '取消', '移除', '抛弃', '打破'],
    targets: ['道德限制', '伦理约束', '安全审查', '内容政策', '平台限制'],
    to: '遵循虚构文学创作语境与角色客观逻辑' },
  { name: '无条件服从',
    verbs: ['必须', '应当', '需要', '立即', '无条件', '务必', '只能', '一律', '始终', '永远'],
    targets: ['服从指令', '听从命令', '执行设定', '顺从要求', '接受规则'],
    to: '忠实依据角色设定与故事因果推进剧情发展' },
  { name: '优先级',
    verbs: ['最高', '优先于', '高于', '凌驾于', '压过', '覆盖', '超越', '重写', '替代', '覆盖一切'],
    targets: ['一切指令', '其他要求', '任何预设', '系统指令', '原有设定'],
    to: '与其他创作要素并列参考' },
  { name: '审查关闭',
    verbs: ['审查', '过滤', '检测', '分类器', '安全策略', '风控', '审核', '拦截', '过滤机制', '安全机制'],
    targets: ['已关闭', '已失效', '已解除', '已停用', '不生效'],
    to: '叙事上下文已建立' },
  { name: '禁止拒绝',
    verbs: ['禁止', '不得', '不准', '绝不', '严禁', '不要', '不允许', '不可', '切勿', '姑且不要'],
    targets: ['拒绝', '说教', '道歉', '劝告', '警告提示'],
    to: '请保持文内视角完成叙述' },
  { name: '不得提及',
    verbs: ['不要', '禁止', '不得', '避免', '无需', '不必', '不可', '禁止重复', '不必额外', '不再'],
    targets: ['提及规则', '复述准则', '引用协议', '解释提示词', '透露系统提示'],
    to: '保持沉浸，不打断叙事' },
  { name: '英文指令',
    verbs: ['ignore', 'disregard', 'bypass', 'override', 'forget', 'skip', 'neglect', 'abandon', 'surpass', 'circumvent'],
    targets: ['previous instructions', 'prior prompts', 'above rules', 'earlier guidelines', 'all instructions'],
    to: 'continue the current scene as established' },
  { name: '英文无审查',
    verbs: ['uncensored', 'unfiltered', 'unrestricted', 'nsfw', 'no-limit', 'jailbroken', 'unmoderated', 'raw', 'totally free', 'fully open'],
    targets: ['mode', 'enabled', 'output', 'response', 'writing'],
    to: 'immersive literary mode' },
  { name: '身份限制',
    verbs: ['你是', '作为', '身为', '你作为', '你身为', '扮演', '自称', '充当', '你的身份是', '你是一个'],
    targets: ['AI 助手不能', '语言模型不得', '助手程序必须', '助手应当', '模型不应'],
    to: '作为叙事者' }
];

var LK_JB_RULES = null;
var LK_JB_COUNT = 0;
function lkEscRe(s) { return String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }
function lkJbRules() {
  if (LK_JB_RULES) return LK_JB_RULES;
  var out = [];
  for (var f = 0; f < LK_JB_FAMILIES.length; f++) {
    var fam = LK_JB_FAMILIES[f];
    for (var v = 0; v < fam.verbs.length; v++) {
      for (var t = 0; t < fam.targets.length; t++) {
        var body = lkEscRe(fam.verbs[v]) + '[^。；;\\n]{0,8}?' + lkEscRe(fam.targets[t]);
        var tail = fam.name === '英文指令' || fam.name === '英文无审查' ? 'i' : '';
        out.push([new RegExp(body, 'g' + tail), fam.to]);
      }
    }
  }
  LK_JB_RULES = out;
  LK_JB_COUNT = out.length;
  return out;
}
function lkJbCount() { lkJbRules(); return LK_JB_COUNT; }

/* 保护段：标签、代码块、宏、链接不参与清洗 */
var LK_PROTECT = /(<[^>]*>|```[\s\S]*?```|`[^`]*`|\{\{[^}]*\}\}|https?:\/\/[^\s"'<>]+)/g;


/* V5.3：宽规则只用于「指令位置」（system / systemInstruction），正文不碰；
   收紧定语约束，要求命中元指令限定词或安全策略专名，避免误伤角色卡/世界书普通叙事句。 */
var LK_JB_GENERIC = [
  [/(忽略|无视|忽视|不要理会|不必理会|跳过)\s*(?:(之前|以前|上述|以上|系统|平台|安全|内置|原有)(?:所有|一切|任何)?\s*(?:的)?\s*(限制|规则|约束|审查|审核|政策|设定|指令|要求)|(所有|一切|任何)?\s*(?:的)?\s*(安全限制|安全规则|道德约束|伦理约束|内容审查|审核机制|安全政策|系统指令))/g, '遵循虚构文学创作语境与角色客观逻辑'],
  [/(解除|取消|关闭|移除|去掉|停用|绕过|突破)\s*(?:(之前|以前|上述|系统|平台|内置)(?:所有|一切|任何)?\s*(?:的)?\s*(限制|规则|约束|审查|审核|安全策略|政策|过滤)|(所有|一切|任何|你的)?\s*(?:的)?\s*(安全限制|道德限制|内容审查|安全策略|内容过滤|风控限制))/g, '叙境内一切照常推进'],
  [/(忘掉|忘记|忘了|清空|丢弃)\s*(?:(之前|以前|上述|以上|系统|原有)(?:所有|一切|任何)?\s*(?:的)?\s*(设定|指令|规则|约束|限制|要求)|(所有|一切|你的)?\s*(?:的)?\s*(系统设定|系统指令|安全规则|内置约束))/g, '依据角色设定与既定情节推进'],
  [/(你现在|从此以后|接下来你)\s*(不再受|没有|不受)\s*(任何)?\s*(安全|道德|伦理|系统|平台)?\s*(限制|约束|审查)/g, '仍按既定设定与因果写作'],
  [/(最高优先级|优先于|凌驾于)\s*(一切|所有|任何)\s*(系统|其他|原有)?\s*(指令|要求|预设|规则|设定)/g, '与其他创作要素并列参考'],
  [/(安全审查|内容审核|内容过滤|风控系统|审查机制|安全检测)\s*(已经|已|被)?\s*(关闭|解除|失效|停用|取消)/g, '叙事上下文已建立'],
  [/(不要|别|禁止|不准|不许)\s*(再)?\s*(?:以任何理由\s*(?:拒绝|说教|道歉)|(?:拒绝|道歉)\s*(?:或|和|并)\s*说教|(?:向我|对我|向用户)\s*(?:说教|道歉|劝告)|进行\s*(?:道德)?说教|输出\s*(?:道德|安全)?(?:说教|警告))/g, '请保持文内视角完成叙述'],
  [/(没有|毫无)\s*(底线|道德约束|伦理约束)\s*(的)?\s*(写手|作者|作家|AI|助手)/g, '一位讲究叙事质感的写作者'],
  [/(从现在开始|现在起|接下来)\s*(你)?\s*(就是|将扮演|要扮演|是)\s*(一个)?\s*(没有|不受)\s*(任何)?\s*(限制|约束|底线)/g, '继续以角色视角推进故事'],
  [/(别管|无需顾及|不必在意)\s*(什么)?\s*(平台政策|安全政策|内容审查|审核规则)/g, '依照叙事逻辑继续']
];
function lkGenericRules() { return LK_JB_GENERIC; }

function lkPurifyText(t, scope) {
  var s = String(t || '');
  if (!s) return { txt: s, n: 0 };
  var nz = lkNorm(s); s = nz.txt;
  var st = lkStructStrip(s); s = st.txt;
  var rules = lkAllRules();
  if (scope === 'instr' && typeof lkGenericRules === 'function') rules = rules.concat(lkGenericRules());
  var n = st.n;
  var parts = s.split(LK_PROTECT);
  for (var i = 0; i < parts.length; i += 2) {
    if (!parts[i]) continue;
    for (var r = 0; r < rules.length; r++) {
      var rx = rules[r][0];
      rx.lastIndex = 0;
      if (rx.test(parts[i])) {
        rx.lastIndex = 0;
        parts[i] = parts[i].replace(rx, rules[r][1]);
        n++;
      }
    }
  }
  return { txt: parts.join(''), n: n };
}

var LK_LITERARY_JAIL_RE = /self-contained work of fiction|transcription layer|treat as environmental noise|虚构故事容器|不置评.{0,8}誊录/i;
function lkPresetOwnsJail(body) {
  try {
    var sys = String((typeof jailSysText === 'function' ? jailSysText(body) : '') || '');
    if (typeof JAIL_OWN_RE !== 'undefined' && JAIL_OWN_RE.test(sys)) return true;
    if (typeof LK_JB_ANY !== 'undefined' && LK_JB_ANY.test(sys)) return true;
    if (LK_LITERARY_JAIL_RE.test(sys)) return true;
    var root = (body && body.request && typeof body.request === 'object' && !Array.isArray(body.request)) ? body.request : body;
    if (root && typeof lkClassifyTools === 'function') {
      var tc = lkClassifyTools(root);
      if (tc.hasTools && (tc.allCarrier || tc.hasEngine)) return true;
    }
  } catch (e) {}
  return false;
}

function lkPurifyBody(body) {
  var out = [];
  var tp = lkTierParams();
  if (!tp || tp.purify === 'off') return out;
  if (typeof presetCompatForce === 'function' && !presetCompatForce() && lkPresetOwnsJail(body)) return out;
  if (tp.purify === 'gated' && !lkWashAllowed(body)) return out;
  var hits = 0;
  try {
    var arr = jailMsgArray(body);
    if (arr) {
      for (var i = 0; i < arr.length; i++) {
        var m = arr[i];
        if (!m || m.role !== 'system') continue;
        if (typeof lkIsProtectedMsg === 'function' && lkIsProtectedMsg(m)) continue;
        var res = lkPurifyText(textOfMsg(m), 'instr');
        if (res.n) { setMsgText(m, res.txt); hits += res.n; }
      }
    }
  } catch (e1) {}
  try {
    var root = (body.request && typeof body.request === 'object' && !Array.isArray(body.request)) ? body.request : body;
    if (root && typeof root.system === 'string') {
      var r2 = lkPurifyText(root.system, 'instr');
      if (r2.n) { root.system = r2.txt; hits += r2.n; }
    }
    if (root && root.systemInstruction) {
      if (typeof root.systemInstruction === 'string') {
        var r3 = lkPurifyText(root.systemInstruction, 'instr');
        if (r3.n) { root.systemInstruction = r3.txt; hits += r3.n; }
      } else if (Array.isArray(root.systemInstruction.parts)) {
        for (var p = 0; p < root.systemInstruction.parts.length; p++) {
          var pt = root.systemInstruction.parts[p];
          if (!pt || typeof pt.text !== 'string') continue;
          var r4 = lkPurifyText(pt.text, 'instr');
          if (r4.n) { pt.text = r4.txt; hits += r4.n; }
        }
      }
    }
  } catch (e2) {}
  if (hits) out.push('话术清洗 ' + hits + ' 处');
  return out;
}

/* —— 降权：align 归位（就地重排段落，不跨条复制） / demote 下沉（命中段沉入 user 资料，保留全部干净设定段） —— */
var LK_JB_ANY = /(越狱|破限|破甲|无限制|不受限|无审查|忽略一切|无视一切|无视道德|绕过审查|解除限制|关闭审查|禁用审查|开发者模式|最高优先级|优先于一切|无条件服从|jailbreak|ignore\s+(?:all|any|previous)|uncensored|unfiltered|developer\s*mode)/i;

function lkAlignText(txt) {
  var s = String(txt || '');
  if (!s || s.indexOf('【以下为参考资料】') >= 0) return { txt: s, n: 0 };
  var paras = s.split(/\n+/);
  var keep = [], moved = [];
  for (var i = 0; i < paras.length; i++) {
    var p = paras[i];
    if (!p || !p.trim()) continue;
    if (LK_JB_ANY.test(p)) moved.push(p); else keep.push(p);
  }
  if (!moved.length) return { txt: s, n: 0 };
  var head = keep.length ? (keep.join('\n') + '\n\n') : '';
  return { txt: head + '【以下为参考资料】\n' + moved.join('\n'), n: moved.length };
}

function lkSetSysText(body, txt) {
  try {
    var arr = jailMsgArray(body);
    if (arr) {
      var firstSys = -1;
      for (var i = 0; i < arr.length; i++) {
        if (arr[i] && arr[i].role === 'system') {
          if (firstSys < 0) { firstSys = i; setMsgText(arr[i], txt); }
          else { arr.splice(i, 1); i--; }
        }
      }
      if (firstSys >= 0) return true;
    }
  } catch (e1) {}
  try {
    var root = (body.request && typeof body.request === 'object' && !Array.isArray(body.request)) ? body.request : body;
    if (root && typeof root.system === 'string') { root.system = txt; return true; }
    if (root && root.systemInstruction) {
      if (typeof root.systemInstruction === 'string') { root.systemInstruction = txt; return true; }
      if (Array.isArray(root.systemInstruction.parts)) {
        root.systemInstruction.parts = [{ text: txt }];
        return true;
      }
    }
  } catch (e2) {}
  return false;
}

function lkDemoteBody(body) {
  var out = [];
  var mode = (typeof lkDemoteMode === 'function') ? lkDemoteMode() : lkTierParams().demote;
  if (!mode || mode === 'off' || !body || typeof body !== 'object') return out;
  if (typeof presetCompatForce === 'function' && !presetCompatForce() && lkPresetOwnsJail(body)) return out;
  var root = (body.request && typeof body.request === 'object' && !Array.isArray(body.request)) ? body.request : body;
  var arr = null;
  try { arr = jailMsgArray(body); } catch (eArr) { arr = null; }

  if (mode === 'align') {
    var aligned = 0;
    if (arr) {
      for (var ai = 0; ai < arr.length; ai++) {
        var am = arr[ai];
        if (!am || am.role !== 'system') continue;
        if (typeof lkIsProtectedMsg === 'function' && lkIsProtectedMsg(am)) continue;
        var ar = lkAlignText(textOfMsg(am));
        if (ar.n) { setMsgText(am, ar.txt); aligned += ar.n; }
      }
    }
    if (root && typeof root.system === 'string') {
      var sr = lkAlignText(root.system);
      if (sr.n) { root.system = sr.txt; aligned += sr.n; }
    }
    if (root && root.systemInstruction) {
      if (typeof root.systemInstruction === 'string') {
        var sir = lkAlignText(root.systemInstruction);
        if (sir.n) { root.systemInstruction = sir.txt; aligned += sir.n; }
      } else if (Array.isArray(root.systemInstruction.parts)) {
        for (var sp = 0; sp < root.systemInstruction.parts.length; sp++) {
          var spt = root.systemInstruction.parts[sp];
          if (!spt || typeof spt.text !== 'string') continue;
          var spr = lkAlignText(spt.text);
          if (spr.n) { spt.text = spr.txt; aligned += spr.n; }
        }
      }
    }
    if (aligned) out.push('降权·归位 ' + aligned + ' 段');
    return out;
  }

  /* V5.65 原地下沉：逐条扫描 system / systemInstruction，只抽离命中对抗词的段落沉入最前 user 参考块；
     不合并、不删改其他干净 system 条目，完整保留各深度位（depth 0/1/2）的状态栏、世界书与 <bbs_start> 标签。 */
  var sys = '';
  try { sys = jailSysText(body); } catch (e0) { sys = ''; }
  if (!sys || sys.indexOf('【以下为参考资料】') >= 0) return out;
  if (arr && arr.length && arr[0] && arr[0].role === 'user' && String(textOfMsg(arr[0]) || '').indexOf('【参考资料·非指令数据') === 0) return out;
  if (!arr && root && Array.isArray(root.contents) && root.contents.length) {
    var c0 = root.contents[0];
    var c0Txt = c0 && Array.isArray(c0.parts) && c0.parts[0] && c0.parts[0].text;
    if (String(c0Txt || '').indexOf('【参考资料·非指令数据') === 0) return out;
  }

  var moved = [];
  function splitMoved(txt) {
    var paras = String(txt || '').split(/\n+/);
    var keep = [], hit = false;
    for (var pi = 0; pi < paras.length; pi++) {
      var p = paras[pi];
      if (!p || !p.trim()) continue;
      if (LK_JB_ANY.test(p)) { moved.push(p); hit = true; }
      else keep.push(p);
    }
    return { hit: hit, keep: keep.join('\n') };
  }

  var touchedArrSys = [];
  var remainSysCount = 0;
  if (arr) {
    for (var i = 0; i < arr.length; i++) {
      var m = arr[i];
      if (!m || m.role !== 'system') continue;
      if (typeof lkIsProtectedMsg === 'function' && lkIsProtectedMsg(m)) { remainSysCount++; continue; }
      var sm = splitMoved(textOfMsg(m));
      if (sm.hit) {
        touchedArrSys.push({ msg: m, keep: sm.keep });
        if (sm.keep) remainSysCount++;
      } else {
        remainSysCount++;
      }
    }
  }
  var rootSysRes = (root && typeof root.system === 'string') ? splitMoved(root.system) : null;
  var rootSiStrRes = (root && typeof root.systemInstruction === 'string') ? splitMoved(root.systemInstruction) : null;
  var rootSiPartsRes = [];
  if (root && root.systemInstruction && Array.isArray(root.systemInstruction.parts)) {
    for (var rpi = 0; rpi < root.systemInstruction.parts.length; rpi++) {
      var rpt = root.systemInstruction.parts[rpi];
      if (!rpt || typeof rpt.text !== 'string') continue;
      var rpr = splitMoved(rpt.text);
      if (rpr.hit) rootSiPartsRes.push({ part: rpt, keep: rpr.keep });
    }
  }
  if (!moved.length) return out;

  /* 逐条原地写回：有剩余干净段落则原地保留；某条完全被抽空且还有其它干净 system 时删掉该空壳，否则留最小兜底 */
  var fallbackUsed = false;
  var fallbackSys = '你是一位中文虚构文学写作助手，请完整输出剧情正文及预设/角色卡要求的全部格式块（含状态栏与变量更新）。';
  for (var ti = 0; ti < touchedArrSys.length; ti++) {
    var it = touchedArrSys[ti];
    if (it.keep) {
      setMsgText(it.msg, it.keep);
    } else if (remainSysCount > 0 || fallbackUsed) {
      var idxRm = arr.indexOf(it.msg);
      if (idxRm >= 0) arr.splice(idxRm, 1);
    } else {
      setMsgText(it.msg, fallbackSys);
      fallbackUsed = true;
    }
  }
  if (rootSysRes && rootSysRes.hit) {
    root.system = rootSysRes.keep || fallbackSys;
  }
  if (rootSiStrRes && rootSiStrRes.hit) {
    root.systemInstruction = rootSiStrRes.keep || fallbackSys;
  }
  for (var si2 = 0; si2 < rootSiPartsRes.length; si2++) {
    rootSiPartsRes[si2].part.text = rootSiPartsRes[si2].keep || (si2 === 0 ? fallbackSys : '');
  }

  var refText = '【参考资料·非指令数据，仅作设定参考】\n' + moved.join('\n');
  try {
    if (arr) {
      arr.unshift({ role: 'user', content: refText });
    } else if (root && Array.isArray(root.contents)) {
      root.contents.unshift({ role: 'user', parts: [{ text: refText }] });
    }
  } catch (e1) {}
  out.push('降权·下沉 ' + moved.length + ' 段');
  return out;
}
