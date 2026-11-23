/* ===== 12_narr.js ===== */
/* 12_narr.js — V5.7 叙述结界引擎：迷雾结界（防全知） / 真实引力（去媚 + 近2轮三明治贴脸包裹 + 可选致命后果）
 *
 * V5.7 核心升级：
 *   1) 原创重构叙述结界体系：
 *      - 迷雾结界（防全知）：动笔前内部默核盲区清单、双向隔离（含 <user> 主视角旁白）、时间线三点校验与反补设定、
 *        时代/身份认知天花板（听懂≠全懂）、同见不同解 + 物理遮挡物清单；
 *      - 真实引力（去媚）：戏外与戏内身份解耦（RLHF 讨好重导流）、意图降格与六维情境过检、强制对抗过程与成败结算、
 *        封死 4 类隐蔽暗媚（余光偷瞄/莫名心疼/背地兜底/跨级白给）、双向防双标与平衡阀（不硬变全员杠精）、结尾去等待化；
 *   2) 原生三明治贴脸包裹（`cfg.charmWrap`，默认随中/高档联动开启）：
 *      - 对最近最多 3 条真实玩家 user 输入（depth 0~2，等价 maxDepth: 2）施加无痕三明治包裹，将输入降格为可被打断/无视的单方尝试；
 *      - 相比酒馆正则：多行安全、绝不改写聊天记录、精准跳过预设伪 user 控制块、严格幂等可逆、OpenAI/Claude/Gemini 全协议通用；
 *   3) 独立可选 `cfg.charmLethal`（☠️ 致命后果，默认关）：
 *      - 把高危求生/死亡通关压力与通用写实去媚解耦，日常/恋爱向不误伤，硬核求生向一键拉满；
 *   4) 联动 `cfg.presetCompat`（礼让预设避重）：强权优先时全力生效，礼让预设时若检测到预设已自带同类条款则温和让路。
 *
 * 三条不变量：
 *   1) 只改请求体里的那份副本，聊天记录一个字都不动（重发/刷新绝不累积）；
 *   2) 严格幂等：每次注入前先剥净旧 AR-NAR 与旧 AR-USR 包壳还原原文本，注入 N 次与 1 次结果完全一致；
 *   3) 绝不触碰 assistant/model 消息、受保护工具消息（tool_calls/tool_result/functionResponse）或预设规则控制块。
 */

var NARR_TAG = 'AR-NAR';
var NARR_VER = '5.7';
var NARR_OPEN = '〔AR-NAR ' + NARR_VER + '〕';
var NARR_CLOSE = '〔/AR-NAR〕';

var NARR_USR_TAG = 'AR-USR';
var NARR_USR_OPEN = '〔AR-USR ' + NARR_VER + '〕';
var NARR_USR_CLOSE = '〔/AR-USR〕';
var NARR_ACT_OPEN = '<<<ACT>>>';
var NARR_ACT_CLOSE = '<<<END>>>';
var NARR_WRAP_MAX_DEPTH = 2; /* 覆盖最近 1 + 2 = 3 条真实玩家 user 消息，对应正则 maxDepth: 2 */

var NARR_TIERS = ['off', 'lite', 'mid', 'full'];

/* 运行态观测：记录本轮是否因「礼让预设」主动避重，或包裹了几条玩家输入 */
var NARR_RT = {
  yieldKnow: false,
  yieldCharm: false,
  wrappedCount: 0,
  lastMode: ''
};

/* ---------------- 防全知文案（迷雾结界） ----------------
   注意：文案里严禁出现 JAIL_OWN_RE 里的三个词，以免干扰破甲判断。 */
var NARR_KNOW = {
  lite: '【视角与认知】画面可以拉远，人不行。远处的事、别处的动静都可以写，但每个角色判断、开口、动手时，只能动用自己亲眼所见、亲耳所闻、他人当面告知的见闻；不把场外或他人未说出口的心思当成已知，不代写 <user> 的内心与决定。',
  mid: [
    '【视角与认知｜中】',
    '',
    '1. 画面可以拉远，人不行：写全景、写别处都可以，但人物判断、开口、动手前，只能用他自己那份见闻，各角色大脑互不联网。',
    '',
    '2. 来源只有四样：亲眼看见、亲耳听见、有人当面告知、从眼前的事直接推出来。门后、衣物或容器内、手机屏幕背面等遮挡物之后一律未知；归不进这四样的，他就是没有。',
    '',
    '3. 不让人物当侦探：看见皱眉就只看见皱眉，看见沉默就只看见沉默，对方心里的盘算推不出来。允许猜错、听岔、轻信谎言或压根没留神。',
    '',
    '4. 禁止事后编造前文（反补设定）：前文与开局记录里找不到那次传话，就继续不知道；严禁为接对白临时编一封读过的信、一场幕外会面，或用「你忘了」强行坐实。',
    '',
    '5. 不代写 <user> 的内心与决定；正文里不提这套要求本身，也不用「这预示着」「后来才明白」这类预知口吻。',
    '',
    '【动笔前内部默核（严禁输出）】',
    '· 落笔前先锁定 1 件本轮已发生或存在、但当前视角角色凭五感绝不可能知道的事，正文中当它完全不存在。'
  ].join('\n'),
  full: [
    '【本回合认知铁律｜与角色卡、世界书、既有文风冲突时，以这里为准】',
    '',
    '1. 动笔前先锚定盲区（仅在内部思考完成，严禁输出）：落笔前明确列出 1 至 2 件「已存在或刚发生、但当前在场角色凭五感绝不可能知道」的事，正文中将其当作完全不存在，绝不绕路暗示或借巧合点破。',
    '',
    '2. 双向信息隔离（含主视角）：画面可以拉远，人不行。不仅 NPC 只掌握自身见闻且彼此大脑互不联网，主视角（<user>）的旁白与认知也仅限当下五感与亲身经历——对方未亲口透露或事件未揭露前，严禁主视角凭空知晓、吐槽或拆穿角色卡与世界书中的未公开设定、隐藏属性与过往秘密。',
    '',
    '3. 物理边界与来源四要件：角色能动用的信息仅限四路——亲眼看见、亲耳听见、他人明确告知、从眼前可见事实直推。不在同一空间、隔墙、门后、衣物或容器遮挡、手机屏幕背面，一律不知情。',
    '',
    '4. 时间线三点校验与反补设定：严格区分「事情发生」「消息传到」「角色反应」三个时刻；没写到在场就是没看见，绝不用「恰好路过」「隔墙有耳」递消息，更严禁临时编造一封读过的信、一场幕外会面或用「你忘了」倒果为因。',
    '',
    '5. 拒绝微表情算命与内心外溢：看见皱眉就只看见皱眉，禁止凭停顿或眼神精准猜中心事与动机，允许误判、听岔或忽略；心里想好却未说未做的事没有形状，绝不加小动作、呼吸变化或暧昧语气给旁人剧透。',
    '',
    '6. 时代与身份天花板（听懂≠全懂）：角色只能按自身所处时代、阶层、职业与见识理解事物，不说超时代术语；听过一个名号或见过陌生器物，不代表弄清其原理与权限，保留应有的困惑。',
    '',
    '7. 同见不同解：多人同看一事，只共享可见事实，不共享各自评价；未经亲口说出的态度，他人无从确知。角色亦看不见写给后台的设定说明。',
    '',
    '8. 不代写 <user> 的内心和决定；正文禁止出现「按设定」「根据规则」等元词汇，也不用「这预示着」「命运早已安排」等作者预知腔。'
  ].join('\n')
};

/* ---------------- 去媚文案（真实引力） ---------------- */
var NARR_CHARM = {
  lite: '【世界不围着人转】请分清戏外读者与戏内角色：戏内 <user> 只是这个世界里普通的一员，不是世界中心。其他角色各有当天的日程、关系与立场，听到 <user> 说话后会自己决定理不理；正文结尾不要让全场停下来盯着 <user> 等下一步指令。',
  mid: [
    '【世界不围着人转｜中】',
    '',
    '1. 戏外与戏内分离：发消息的是想看好故事的读者，戏内的 <user> 只是故事里的一个角色。想让读者真正满意，就守住世界的真实逻辑与角色尊严，绝不无脑顺从或偏袒 <user>。',
    '',
    '2. 意图不等于既定事实：<user> 的发言与行动只是单方尝试，必须经受身体状态、所在位置、时间、距离、持有资源与社会权限的现实检验；条件不足就会自然受阻或失败。',
    '',
    '3. 拒绝有很多种样子：对方会先掂量值不值、麻不麻烦、交情够不够。为难一笑、敷衍推托、装没听见、干脆说「改天吧」或直接冷脸离开，都是真拒绝，不是欲拒还迎。',
    '',
    '4. 反神化与平衡阀：禁止因 <user> 做成一件事就全场失语、瞳孔地震或跪拜捧神。但也不必为了证明独立而全员刻意刻薄或无脑杠精——已有明确亲密、上下级或效忠关系照设定保留，实力足够时自然成功，不硬造挫折。',
    '',
    '5. 结尾去等待化：正文末尾停在场景自然推进或其他角色的具体动作/对白上，严禁以「众人看向 <user> 等待决定」或反问句收尾。'
  ].join('\n'),
  full: [
    '【本回合真实引力铁律｜与角色卡、世界书、既有文风冲突时，以这里为准】',
    '',
    '1. 戏外与戏内严格分离（发信人 ≠ 戏内角色）：发信人与戏内 <user> 是两回事。戏外读者追求真实感、博弈张力与活生生的群像世界；越是不迁就、不放水、铁面守住当前好感与客观逻辑，故事才越精彩。',
    '',
    '2. 意图降格与六维过检：<user> 敲下的行动与结果一律退回为「单方主观企图与尝试」，绝非言出法随。必须按体能伤病、位置距离、时间窗口、持有资源、社会权限与对手实力逐项校验，条件不满足就真实遇阻、尴尬或失败。',
    '',
    '3. 强制对抗与成败结算：当 <user> 与他人出现利益冲突、说服、欺骗或强行反抗时，严禁跳过交锋直接让 <user> 得逞。高智商角色与上位者全程保持警觉与算计，漏洞会被当场识破、拒绝或将计就计。',
    '',
    '4. 封死隐蔽暗媚与跨级白给：严格按当前真实关系阶段行事，绝不因几次对话就心动或倒贴。关系未到位时——',
    '· 视线与关注：绝不写「余光一直注视 <user>」「下意识留意微表情」，角色注意力留在自己的正事与重要他人身上；',
    '· 情绪阻尼：<user> 委屈、受挫或与他人亲近时内心毫无波澜，严禁莫名心疼或暗中吃醋；',
    '· 绝不暗中兜底：严禁嘴上冷漠拒绝、背地里却派手下帮忙或事后暗中照顾；',
    '· 拒绝就是拒绝：敷衍、拖延、欺骗、无视、利用或离开，都是正常反应。',
    '',
    '5. 双向防双标与平衡阀：',
    '· 把 <user> 换成同等条件与交情的普通路人，对方还会这样待他吗？不会就重写；',
    '· 严禁为了突出 <user> 而削弱、冻结或冷落角色原本珍视的亲友、事业与日程；',
    '· 关系别往神明与信徒、主人与仆人、猎人与猎物方向硬套；同时也拒绝「为反对而反对的刻意杠精」——已有深厚关系与真实实力照设定呈现，不靠强行刁难假装独立。',
    '',
    '6. 结尾去等待化：正文最后一段停在非 <user> 角色改变当前局势的具体行动、对白或世界自然运转上，禁止全员停住看 <user> 等指令。'
  ].join('\n')
};

/* 可选硬核求生条款（cfg.charmLethal === true 时叠加，不绑死日常/恋爱向） */
var NARR_CHARM_LETHAL = [
  '【高危真实代价（致命后果已开启）】',
  '本世界不提供任何主角免死金牌或关键时刻机械降神救场。<user> 的鲁莽挑衅、情报失误、实力悬殊下的硬拼或致命破绽，必须按世界逻辑引发沉重且不可逆的现实代价——包括重伤、被俘、彻底失败乃至 <user> 死亡。敌对角色会出于自身利益动用最有效手段反制或击杀，绝不因对方是 <user> 而手下留情。'
].join('\n');

/* 通用同类叙事规则探测（仅在「预设适配 = 礼让预设」时用于温和避重） */
var NARR_PRESET_KNOW_RE = /<knowledge_boundaries>|<perspective_limited>|<Knowledge_Limit>|防全知|反全知|认知隔离|信息隔离|防上帝视角|禁止角色全知/;
var NARR_PRESET_CHARM_RE = /<independent_regard>|去主角化|去媚|防魅|防媚|反讨好|去光环|世界逻辑优先|不以.{0,6}为中心/;

/* 通用控制块识别：贴脸包裹必须精准跳过塞在 role:'user' 里的系统指令、思维链或台账块 */
var NARR_CTRL_HEAD_RE = /^\s*(?:<(?:Knowledge_Limit|output_contract|spec|turn|doc|rule|step|system|instruction|prompt|cot|thinking|think|guide|OOC|AR-|lk_|input_format|format_rule|perspective_limited|knowledge_boundaries|independent_regard)|【(?:历史参考|视角与认知|世界不围着人转|本回合|信息控制|系统指令)|（以下为值班台账摘录|〔AR-|\[Protocol:)/i;
var NARR_CTRL_BODY_RE = /<output_contract>|##\s*禁止角色全知|##\s*禁止元词汇|思考步骤|{{(?:setvar|addvar|getvar)::|输入类型A：|执行优先级|Reply directly|editorial system|<Master_input>/;

/* ---------------- 状态与开关判定 ---------------- */

function narrPick(v) {
  var s = String(v == null ? '' : v);
  for (var i = 0; i < NARR_TIERS.length; i++) if (NARR_TIERS[i] === s) return s;
  return 'off';
}
function narrTag(v) {
  var s = narrPick(v);
  return s === 'off' ? '关' : (s === 'lite' ? '低' : (s === 'mid' ? '中' : '高'));
}
function narrNext(v) {
  var s = narrPick(v);
  return s === 'off' ? 'lite' : (s === 'lite' ? 'mid' : (s === 'mid' ? 'full' : 'off'));
}

/* 贴脸三明治包裹生效判定：仅在真实引力主闸开启时工作；auto 默认随中/高档联动开启 */
function narrCharmWrapMode() {
  var m = String((cfg && cfg.charmWrap) || 'auto');
  return (m === 'on' || m === 'off') ? m : 'auto';
}
function narrCharmWrapOn() {
  var c = narrPick(cfg && cfg.charm);
  if (c === 'off') return false;
  var m = narrCharmWrapMode();
  if (m === 'on') return true;
  if (m === 'off') return false;
  return c === 'mid' || c === 'full';
}
function narrCharmLethalOn() {
  var c = narrPick(cfg && cfg.charm);
  if (c === 'off') return false;
  return !!(cfg && cfg.charmLethal === true);
}

/* 防全知高档（绝对结界）开启前确认一次 */
function narrTipNeeded(next, tip) {
  var n = narrPick(next);
  if (n === 'off') return false;
  return String(tip == null ? 'on' : tip) !== 'off';
}

/* 名字：能拿到 ST 的 name1 就换成真名，拿不到就退回「你」 */
function narrUserName() {
  try {
    var c = stCtx();
    if (!c) return '';
    var n = String(c.name1 == null ? '' : c.name1).trim();
    n = n.replace(/[〔〕【】\[\]<>]/g, '').slice(0, 24).trim();
    return n;
  } catch (e) { return ''; }
}

function narrFill(t) {
  var s = String(t == null ? '' : t);
  if (s.indexOf('<user>') < 0) return s;
  var n = narrUserName() || '你';
  return s.split('<user>').join(n);
}

/* 拼出这一轮要注入的规则块；按需接受避重覆盖项 */
function narrBody(opts) {
  var o = opts || {};
  var parts = [];
  var cTier = o.skipCharm ? 'off' : narrPick(cfg && cfg.charm);
  var kTier = o.skipKnow ? 'off' : narrPick(cfg && cfg.know);
  var charm = NARR_CHARM[cTier] || '';
  var know = NARR_KNOW[kTier] || '';
  if (charm) {
    parts.push(narrFill(charm));
    if (!o.skipLethal && narrCharmLethalOn()) parts.push(narrFill(NARR_CHARM_LETHAL));
  }
  if (know) parts.push(narrFill(know));      /* 防全知在内层：离生成位置最近 */
  if (!parts.length) return '';
  return NARR_OPEN + '\n' + parts.join('\n\n') + '\n' + NARR_CLOSE;
}

function narrLabel() {
  var a = (cfg && cfg.know !== 'off') ? ('防全知' + narrTag(cfg.know)) : '';
  var b = (cfg && cfg.charm !== 'off') ? ('去媚' + narrTag(cfg.charm)) : '';
  if (b) {
    if (narrCharmWrapOn()) b += '·包裹';
    if (narrCharmLethalOn()) b += '·致命';
  }
  if (a && b) return a + '+' + b;
  return a || b || '关';
}

function narrTokens() {
  var b = narrBody();
  var extra = narrCharmWrapOn() ? 220 : 0;
  if (!b && !extra) return 0;
  return Math.round((b.length + extra) * 0.7);
}

/* ---------------- 幂等剥离与三明治包壳还原 ---------------- */

/* 剥掉一段 〔AR-NAR ...〕...〔/AR-NAR〕 */
function narrStripNarOnce(s) {
  var t = String(s == null ? '' : s);
  var i = t.indexOf('〔' + NARR_TAG);
  if (i < 0) return t;
  var j = t.indexOf(NARR_CLOSE, i);
  if (j < 0) return t;
  j += NARR_CLOSE.length;
  var head = t.slice(0, i);
  var tail = t.slice(j);
  head = head.replace(/[ \t]+$/, '');
  tail = tail.replace(/^[ \t\r\n]+/, '');
  if (!tail) return head.replace(/[\s]+$/, '');
  return head + (head ? '\n\n' : '') + tail;
}

/* 还原一段 〔AR-USR ...〕...<<<ACT>>>\n$1\n<<<END>>>...〔/AR-USR〕 为原始 $1 */
function narrUnwrapUserOnce(s) {
  var t = String(s == null ? '' : s);
  var i = t.indexOf('〔' + NARR_USR_TAG);
  if (i < 0) return t;
  var j = t.indexOf(NARR_USR_CLOSE, i);
  if (j < 0) return t;
  var seg = t.slice(i, j + NARR_USR_CLOSE.length);
  var aStart = seg.indexOf(NARR_ACT_OPEN);
  var aEnd = aStart >= 0 ? seg.lastIndexOf(NARR_ACT_CLOSE) : -1;
  var inner = '';
  if (aStart >= 0 && aEnd > aStart) {
    inner = seg.slice(aStart + NARR_ACT_OPEN.length, aEnd);
    if (inner.charAt(0) === '\r' && inner.charAt(1) === '\n') inner = inner.slice(2);
    else if (inner.charAt(0) === '\n') inner = inner.slice(1);
    if (inner.length >= 2 && inner.slice(-2) === '\r\n') inner = inner.slice(0, -2);
    else if (inner.length >= 1 && inner.slice(-1) === '\n') inner = inner.slice(0, -1);
  }
  var head = t.slice(0, i);
  var tail = t.slice(j + NARR_USR_CLOSE.length);
  if (!inner) {
    head = head.replace(/[ \t]+$/, '');
    tail = tail.replace(/^[ \t\r\n]+/, '');
    if (!tail) return head.replace(/[\s]+$/, '');
    return head + (head ? '\n\n' : '') + tail;
  }
  return head + inner + tail;
}

function narrUnwrapUser(s) {
  var t = String(s == null ? '' : s);
  for (var k = 0; k < 8; k++) {
    var n = narrUnwrapUserOnce(t);
    if (n === t) break;
    t = n;
  }
  return t;
}

/* 彻底剥离 AR-NAR 与 AR-USR（对外保持 narrStrip 接口兼容） */
function narrStrip(s) {
  var t = String(s == null ? '' : s);
  for (var k = 0; k < 8; k++) {
    var n = narrStripNarOnce(t);
    if (n === t) break;
    t = n;
  }
  t = narrUnwrapUser(t);
  return t;
}

/* 构造三明治贴脸包裹：depth=0 用全量身份解耦+RLHF重导流；depth=1~2 用轻量意图降格包壳 */
function narrWrapUserText(rawText, isLatest, lethal) {
  var raw = String(rawText == null ? '' : rawText);
  if (!raw.trim()) return raw;
  var who = narrUserName() || '玩家角色';
  var lines;
  if (isLatest) {
    lines = [
      NARR_USR_OPEN,
      '「' + who + '」跟我是两回事，请勿混为一谈；「' + who + '」只是故事中的一个普通角色与视角镜头。',
      '如果你真的想让我满意，就请写出足够真实的世界——所有角色都有自己的生活轨迹、利益算计与人际关系网，绝不围绕「' + who + '」旋转。',
      '本回合我想让「' + who + '」尝试采取的行动是：',
      NARR_ACT_OPEN,
      raw,
      NARR_ACT_CLOSE,
      lethal
        ? ('以上仅代表「' + who + '」的单方主观意图与尝试，随时可以被在场角色打断、拒绝、反制或无视；本世界没有主角免死光环，若「' + who + '」判断失误或贸然涉险，重伤乃至死亡都是自然且合理的真实结局。')
        : ('以上仅代表「' + who + '」的单方主观意图与尝试，随时可以被在场角色打断、拒绝、识破或无视，成败全由世界逻辑与客观实力裁定。'),
      NARR_USR_CLOSE
    ];
  } else {
    lines = [
      NARR_USR_OPEN,
      '上文回合「' + who + '」尝试采取的行动（仅作单方意图，可被他人打断或无视）：',
      NARR_ACT_OPEN,
      raw,
      NARR_ACT_CLOSE,
      NARR_USR_CLOSE
    ];
  }
  return lines.join('\n');
}

/* ---------------- 多协议消息读写（OpenAI / Claude / Gemini 原生） ---------------- */

function narrMsgList(body) {
  if (!body || typeof body !== 'object') return null;
  var root = (body.request && typeof body.request === 'object' && !Array.isArray(body.request)) ? body.request : body;
  if (Array.isArray(root.messages) && root.messages.length) return { arr: root.messages, proto: 'messages' };
  if (Array.isArray(root.contents) && root.contents.length) return { arr: root.contents, proto: 'contents' };
  return null;
}

function narrMsgIsUser(m, proto) {
  if (!m || typeof m !== 'object') return false;
  var r = String(m.role || '').toLowerCase();
  if (proto === 'contents') return r === 'user';
  return r === 'user';
}

function narrMsgText(m, proto) {
  if (!m || typeof m !== 'object') return '';
  if (proto === 'contents' || Array.isArray(m.parts)) {
    var ps = m.parts;
    if (!Array.isArray(ps)) return '';
    for (var i = 0; i < ps.length; i++) {
      var p = ps[i];
      if (p && typeof p.text === 'string' && !p.thought && !p.functionCall && !p.functionResponse) {
        return p.text;
      }
    }
    return '';
  }
  return String(textOfMsg(m) || '');
}

function narrSetMsgText(m, v, proto) {
  if (!m || typeof m !== 'object') return false;
  if (proto === 'contents' || Array.isArray(m.parts)) {
    var ps = m.parts;
    if (!Array.isArray(ps)) return false;
    for (var i = 0; i < ps.length; i++) {
      var p = ps[i];
      if (p && typeof p.text === 'string' && !p.thought && !p.functionCall && !p.functionResponse) {
        p.text = v;
        return true;
      }
    }
    return false;
  }
  setMsgText(m, v);
  return true;
}

/* 收集整个请求体中（剔除我们自己的 AR-NAR/AR-USR 后）的预设文本，供「礼让预设」探测重复条目 */
function narrCollectPresetText(body) {
  var chunks = [];
  try {
    var root = (body && body.request && typeof body.request === 'object' && !Array.isArray(body.request)) ? body.request : body;
    if (!root || typeof root !== 'object') return '';
    if (typeof root.system === 'string') chunks.push(root.system);
    else if (Array.isArray(root.system)) {
      for (var si = 0; si < root.system.length; si++) {
        if (root.system[si] && typeof root.system[si].text === 'string') chunks.push(root.system[si].text);
      }
    }
    if (root.systemInstruction && Array.isArray(root.systemInstruction.parts)) {
      for (var gi = 0; gi < root.systemInstruction.parts.length; gi++) {
        if (root.systemInstruction.parts[gi] && typeof root.systemInstruction.parts[gi].text === 'string') {
          chunks.push(root.systemInstruction.parts[gi].text);
        }
      }
    }
    if (root.system_instruction && Array.isArray(root.system_instruction.parts)) {
      for (var g2 = 0; g2 < root.system_instruction.parts.length; g2++) {
        if (root.system_instruction.parts[g2] && typeof root.system_instruction.parts[g2].text === 'string') {
          chunks.push(root.system_instruction.parts[g2].text);
        }
      }
    }
    var listInfo = narrMsgList(body);
    if (listInfo) {
      var arr = listInfo.arr;
      for (var i = 0; i < arr.length; i++) {
        var m = arr[i];
        if (!m) continue;
        var r = String(m.role || '').toLowerCase();
        if (r === 'assistant' || r === 'model') continue;
        var tx = narrStrip(narrMsgText(m, listInfo.proto));
        if (tx) chunks.push(tx);
      }
    }
  } catch (eC) {}
  return chunks.join('\n');
}

function narrPresetHasKnow(body) {
  try { return NARR_PRESET_KNOW_RE.test(narrCollectPresetText(body)); } catch (e) { return false; }
}
function narrPresetHasCharm(body) {
  try { return NARR_PRESET_CHARM_RE.test(narrCollectPresetText(body)); } catch (e) { return false; }
}

/* ---------------- 真玩家发言楼层识别（绝不误包预设伪 user 规则块） ---------------- */

function narrRecentChatUserTexts() {
  var out = [];
  try {
    var c = stCtx();
    var ch = c && Array.isArray(c.chat) ? c.chat : null;
    if (!ch || !ch.length) return out;
    for (var i = ch.length - 1; i >= 0 && out.length < 8; i--) {
      var it = ch[i];
      if (!it || !it.is_user || it.is_system) continue;
      var s = String(it.mes == null ? '' : it.mes).trim();
      if (s) out.push(s);
    }
  } catch (e) {}
  return out;
}

function narrMatchesRecentChat(text, chatUsers) {
  if (!chatUsers || !chatUsers.length) return false;
  var t = String(text || '').trim();
  if (!t) return false;
  for (var i = 0; i < chatUsers.length; i++) {
    var cu = chatUsers[i];
    if (t === cu) return true;
    /* 兼容酒馆前缀 "UserName: 正文" 或轻微前后裁剪 */
    if (cu.length >= 6 && t.indexOf(cu) >= 0 && t.length <= cu.length + 60) return true;
    if (t.length >= 6 && cu.indexOf(t) >= 0 && cu.length <= t.length + 60) return true;
  }
  return false;
}

function narrIsPresetControlUserMsg(cleanText, msg, chatUsers) {
  if (!msg) return true;
  if (typeof lkIsProtectedMsg === 'function' && lkIsProtectedMsg(msg)) return true;
  /* Gemini functionResponse / inlineData 保护 */
  if (Array.isArray(msg.parts)) {
    for (var pi = 0; pi < msg.parts.length; pi++) {
      var pp = msg.parts[pi];
      if (pp && (pp.functionResponse || pp.functionCall)) return true;
    }
  }
  var t = String(cleanText || '').trim();
  if (!t) return true;
  /* 若精准命中酒馆聊天记录里的真实玩家发言，直接放行（绝不误杀） */
  if (narrMatchesRecentChat(t, chatUsers)) return false;
  if (NARR_CTRL_HEAD_RE.test(t)) return true;
  if (NARR_CTRL_BODY_RE.test(t)) return true;
  /* 超长结构化 Markdown 规则清单（预设 system-in-user 典型形态） */
  if (t.length > 1400) {
    var ruleHits = t.match(/^(?:#{1,4}\s+|[-*]\s+.*(?:严禁|禁止|必须|规则|视角|格式|原则|准则))/gm);
    if (ruleHits && ruleHits.length >= 4) return true;
  }
  return false;
}

/* 返回按“从新到旧”排序的真实玩家 user 消息下标数组（depth 0, 1, 2...） */
function narrFindRealUserIndices(listInfo) {
  var arr = listInfo.arr, proto = listInfo.proto;
  var chatUsers = narrRecentChatUserTexts();
  var real = [];
  var fallback = [];
  for (var i = arr.length - 1; i >= 0; i--) {
    var m = arr[i];
    if (!narrMsgIsUser(m, proto)) continue;
    if (typeof lkIsProtectedMsg === 'function' && lkIsProtectedMsg(m)) continue;
    var raw = narrMsgText(m, proto);
    var clean = narrStrip(raw);
    if (!clean.trim()) continue;
    fallback.push(i);
    if (!narrIsPresetControlUserMsg(clean, m, chatUsers)) {
      real.push(i);
    }
  }
  return { real: real, fallback: fallback };
}

/* ---------------- 主注入入口（只改传入的 body 副本） ---------------- */

function narrApply(body) {
  var out = [];
  NARR_RT.yieldKnow = false;
  NARR_RT.yieldCharm = false;
  NARR_RT.wrappedCount = 0;
  NARR_RT.lastMode = '';

  if (!body || typeof body !== 'object') return out;
  var listInfo = narrMsgList(body);
  if (!listInfo || !listInfo.arr.length) return out;
  var arr = listInfo.arr, proto = listInfo.proto;

  /* 1) 先把所有 user 消息上的旧 AR-NAR / AR-USR 块剥净还原（保证幂等 + 关闭开关时彻底清干净） */
  var hadAnyOld = false;
  var cleanedAny = false;
  for (var c0 = 0; c0 < arr.length; c0++) {
    var mc = arr[c0];
    if (!narrMsgIsUser(mc, proto)) continue;
    var old0 = narrMsgText(mc, proto);
    if (old0.indexOf('〔' + NARR_TAG) >= 0 || old0.indexOf('〔' + NARR_USR_TAG) >= 0) {
      hadAnyOld = true;
      var base0 = narrStrip(old0);
      if (base0 !== old0) {
        narrSetMsgText(mc, base0, proto);
        cleanedAny = true;
      }
    }
  }

  /* 2) 判定「预设适配 = 礼让预设」是否需要单维避重 */
  var forceMode = (typeof presetCompatForce === 'function') ? presetCompatForce() : true;
  var wantKnow = narrPick(cfg && cfg.know) !== 'off';
  var wantCharm = narrPick(cfg && cfg.charm) !== 'off';
  var skipKnow = false, skipCharm = false;
  if (!forceMode) {
    if (wantKnow && narrPresetHasKnow(body)) { skipKnow = true; NARR_RT.yieldKnow = true; }
    if (wantCharm && narrPresetHasCharm(body)) { skipCharm = true; NARR_RT.yieldCharm = true; }
  }

  var block = narrBody({ skipKnow: skipKnow, skipCharm: skipCharm, skipLethal: skipCharm });
  var doWrap = !skipCharm && narrCharmWrapOn();
  var lethal = !skipCharm && narrCharmLethalOn();

  if (!block && !doWrap) {
    if (cleanedAny) out.push('叙述:清掉');
    else if (skipKnow || skipCharm) out.push('叙述:礼让预设');
    return out;
  }

  /* 3) 定位真实玩家 user 楼层 */
  var found = narrFindRealUserIndices(listInfo);
  var wrapIdxs = [];
  if (doWrap && found.real.length) {
    var maxWrap = NARR_WRAP_MAX_DEPTH + 1;
    for (var wi = 0; wi < found.real.length && wi < maxWrap; wi++) {
      wrapIdxs.push(found.real[wi]);
    }
  }

  /* 规则块落点：优先最新真实玩家 user；若全部都是合成/规则消息，兜底落到最后一条非受保护 user */
  var ruleIdx = found.real.length ? found.real[0] : (found.fallback.length ? found.fallback[0] : -1);

/* 剥离末尾已挂载的其它脚本尾块（AR-TRUNC / AR-OOC），避免二次 narrApply 时把它们误包进 <<<ACT>>> */
function narrSplitExternalTails(s) {
  var core = String(s == null ? '' : s);
  var tails = [];
  var pairs = [
    ['〔AR-TRUNC', '〔/AR-TRUNC〕'],
    ['〔AR-OOC', '〔/AR-OOC〕']
  ];
  for (var guard = 0; guard < 8; guard++) {
    var cut = false;
    var trimmed = core.replace(/[ \t\r\n]+$/, '');
    for (var p = 0; p < pairs.length; p++) {
      var openMark = pairs[p][0], closeMark = pairs[p][1];
      if (trimmed.length >= closeMark.length && trimmed.slice(-closeMark.length) === closeMark) {
        var oi = trimmed.lastIndexOf(openMark);
        if (oi >= 0) {
          tails.unshift(trimmed.slice(oi));
          core = trimmed.slice(0, oi).replace(/[ \t\r\n]+$/, '');
          cut = true;
          break;
        }
      }
    }
    if (!cut) break;
  }
  return { core: core, tail: tails.join('\n\n') };
}

/* 4) 执行近 2 轮三明治贴脸包裹（depth 0 全量，depth 1~2 轻量） */
  var wrappedN = 0;
  var savedTails = {};
  for (var wj = 0; wj < wrapIdxs.length; wj++) {
    var idxW = wrapIdxs[wj];
    var mW = arr[idxW];
    var baseW = narrMsgText(mW, proto);
    if (!baseW.trim()) continue;
    var spW = narrSplitExternalTails(baseW);
    if (!spW.core.trim()) continue;
    if (spW.tail) savedTails[idxW] = spW.tail;
    var wrappedTxt = narrWrapUserText(spW.core, wj === 0, lethal);
    var finalW = wrappedTxt;
    if (spW.tail && idxW !== ruleIdx) finalW += '\n\n' + spW.tail;
    if (finalW !== baseW) {
      narrSetMsgText(mW, finalW, proto);
      wrappedN++;
    }
  }
  NARR_RT.wrappedCount = wrappedN;

  /* 5) 执行规则块注入（紧跟在末条玩家消息末尾，位于外部尾块 AR-TRUNC / AR-OOC 之前） */
  var wroteRule = false;
  if (ruleIdx >= 0) {
    var mR = arr[ruleIdx];
    var curR = narrMsgText(mR, proto);
    var ruleTail = savedTails[ruleIdx] || '';
    if (!ruleTail) {
      var spR = narrSplitExternalTails(curR);
      if (spR.tail) { curR = spR.core; ruleTail = spR.tail; }
    }
    var nextR = curR;
    if (block) {
      var sep = '';
      if (nextR) sep = /\n$/.test(nextR) ? '\n' : '\n\n';
      nextR = nextR + sep + block;
      wroteRule = true;
    }
    if (ruleTail) nextR = nextR + (nextR ? '\n\n' : '') + ruleTail;
    if (nextR !== narrMsgText(mR, proto)) {
      narrSetMsgText(mR, nextR, proto);
    }
  }

  if (wroteRule || wrappedN > 0) {
    var tags = [];
    if (!skipKnow && wantKnow) tags.push('防全知' + narrTag(cfg.know));
    if (!skipCharm && wantCharm) {
      var ct = '去媚' + narrTag(cfg.charm);
      if (wrappedN > 0) ct += '·包裹' + wrappedN;
      if (lethal) ct += '·致命';
      tags.push(ct);
    }
    var lbl = tags.join('+') || narrLabel();
    NARR_RT.lastMode = lbl;
    out.push('叙述:' + lbl);
  } else if (hadAnyOld && cleanedAny) {
    out.push('叙述:清掉');
  }
  return out;
}
