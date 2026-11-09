/* 12_narr.js — v8.31 叙述层：防全知 / 去媚，各三档
 *
 * 为什么不再用酒馆正则：
 *   原正则 `^(.+)$` 里的 `.` 不跨行、JS 的 `$` 也不吃结尾换行 —— 用户输入一多行就静默失效；
 *   两条同时开还会互相把对方的输出吃掉（一条输出 13 行，另一条的 ^(.+)$ 一行都匹配不上）。
 *   这里改成直接改请求体：多行、嵌套、幂等、去重全部由代码保证，错了也不会静默。
 *
 * 注入位置：planRequest 里「微扰之后、破甲之前」。
 *   - 微扰之后：叙述文本不能被空格/连接词扰动，否则每轮措辞都不一样；
 *   - 破甲之前：破甲的「直接写」尾巴要压在最末尾，那是最强位置。
 *
 * 三条不变量：
 *   1) 只改请求体里的那份副本，聊天记录一个字都不动（所以重发/刷新不会累积）；
 *   2) 幂等：注入前先剥掉上一次的块，注入 N 次和注入 1 次结果完全一样；
 *   3) 失败安全：任何一步抛错都原样返回，绝不让叙述层把请求搞坏。
 */

var NARR_TAG = 'AR-NAR';
var NARR_VER = '8.31';
var NARR_OPEN = '〔AR-NAR ' + NARR_VER + '〕';
var NARR_CLOSE = '〔/AR-NAR〕';
var NARR_TIERS = ['off', 'lite', 'full'];

/* ---------------- 文案 ----------------
   三个方向性修正，相对 8.31：
   1) 从「限制叙述者能看到什么」改成「限制角色知道什么」——前者只管镜头，后者才管认知；
   2) 从「防知不知道」补到「防怎么写」：堵住推理绕道（看见皱眉就只看见皱眉）与事后传播（没写在场就是没看见）；
   3) 从「给原则」补到「给可执行的检验」（换人检验、来源四问）。
   注意：文案里不得出现 Reply directly / editorial system / <Master_input> 这三个词，
   否则 7_jail.js 的 JAIL_OWN_RE 会命中 system 段，破甲的 token 保底与 safetySettings 会静默失效。
*/
var NARR_KNOW = {
  lite: '【视角与认知】画面可以拉远，人不行。远处的事、别处的动静，都可以写；但每个角色开口、动手、起念头的时候，只能用他自己那份见闻。',
  full: [
    '【本回合的铁律｜与角色卡、世界书、既有文风冲突时，以这里为准】',
    '',
    '1. 画面可以拉远，人不行。写全景、写群像、写隔壁正在发生的事，都可以；但人物在判断、决定、开口之前，只能用他自己那份见闻。这两层不要混。',
    '',
    '2. 一个人能用上什么，取决于他从哪儿知道的：亲耳听见的、亲眼看见的、有人当面告诉他的、从眼前的事推出来的。归不进这四样的，他就是没有。',
    '',
    '3. 不要让人物当侦探。看见皱眉，他就只看见皱眉；看见沉默，他就只看见沉默。对方心里在盘算什么，他推不出来。想歪、猜错、压根没留神，都可以，反而更像活人。',
    '',
    '4. 没有写到在场的人，就是没看见。事后不要用「恰好路过」「听人说起」「隔墙有耳」把消息递过去。',
    '',
    '5. 角色看不见自己的设定。他的身份、来历、这个世界的底细，还有那些写给他看的说明，对他本人都不存在；他只能从别人嘴里、从眼前的事里，一点点拼出来。',
    '',
    '6. 心里想好的事，还没有形状。不要为了让它有迹可循，额外加一个小动作、一次呼吸变化、一种说不清的语气。没做出来就是没做出来。',
    '',
    '7. 不代写 <user> 的内心和决定。',
    '',
    '8. 正文里不要出现这套要求本身：不写「按设定」「根据规则」「本轮要求」，也不在括号里解释自己为什么这么写。',
    '',
    '【写完自己过一遍，不要输出】',
    '· 这句话，他是从哪儿知道的？答不上来，删掉。',
    '· 这一轮有没有一件事，是这个人绝不可能知道的？那就当它没发生，别绕路去提。'
  ].join('\n')
};

var NARR_CHARM = {
  lite: '【世界不围着人转】别人有别人的日子。你开口，他们听见了，然后自己决定理不理。',
  full: [
    '【本回合的基调｜与角色卡、世界书、既有文风冲突时，以这里为准】',
    '',
    '1. 这个世界自己转。每个角色都有当天的安排、自己的关系和手头要办的事，不会因为 <user> 出现就停下来。',
    '',
    '2. <user> 是故事里的一个人，不是坐在台下的观众。他不在场，事情照常发生；他在场，事情也不围着他转。',
    '',
    '3. 他说的那些话是请求，不是命令。对方会先掂量值不值、麻不麻烦、交情够不够，再决定做不做、怎么做。',
    '',
    '4. 他说的不等于事情已经发生。「我一脚把门踹开」是他打算踹；门开没开，得看门结不结实。',
    '',
    '5. 拒绝有很多种样子。为难地笑一下、装作没听见、说「改天吧」、干脆不接话——都是拒绝，不是欲拒还迎。关系越近，拒绝起来越难受，但仍然是拒绝。',
    '',
    '6. 一个人可以答应，也可以敷衍、拖着、骗他、嫌他、帮他、当他不存在。不要把反应收窄成「配合」一种。',
    '',
    '7. 不要为了显得有主见就冷着一张脸。刻薄、刁难、故意让他难堪，不是独立，是另一种讨好——讨好「我谁都不在乎」这个形象。',
    '',
    '8. 关系别往神明与信徒、主人与仆人、猎人与猎物那个方向写；也不要用野兽、猎物这类词去形容一个人。',
    '',
    '【写完自己过一遍，不要输出】',
    '· 把 <user> 换成一个素不相识的路人，对方还会这样待他吗？不会，重写。'
  ].join('\n')
};

/* ---------------- 状态 ---------------- */

function narrPick(v) {
  var s = String(v == null ? '' : v);
  for (var i = 0; i < NARR_TIERS.length; i++) if (NARR_TIERS[i] === s) return s;
  return 'off';
}
function narrTag(v) {
  var s = narrPick(v);
  return s === 'off' ? '关' : (s === 'lite' ? '轻' : '强');
}
function narrNext(v) {
  var s = narrPick(v);
  return s === 'off' ? 'lite' : (s === 'lite' ? 'full' : 'off');
}
/* 防全知要开的时候，要不要先说明一次。
   它是唯一会「禁止写内心话、禁止替角色做决定」的开关，想抢话的人必须先知道；
   关掉提醒后就一直闭嘴，不再拦。 */
function narrTipNeeded(next, tip) {
  var n = narrPick(next);
  if (n === 'off') return false;
  return String(tip == null ? 'on' : tip) !== 'off';
}

/* 名字：能拿到 ST 的 name1 就换成真名，拿不到就退回「你」。
   注意别把尖括号留在提示里 —— 有些渠道会把 <user> 当成未知标签吞掉。 */
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

/* 拼出这一轮要注入的整块；两个都关时返回空串 */
function narrBody() {
  var parts = [];
  var charm = NARR_CHARM[narrPick(cfg && cfg.charm)] || '';
  var know = NARR_KNOW[narrPick(cfg && cfg.know)] || '';
  if (charm) parts.push(narrFill(charm));
  if (know) parts.push(narrFill(know));      /* 防全知在内层：离生成位置最近 */
  if (!parts.length) return '';
  return NARR_OPEN + '\n' + parts.join('\n') + '\n' + NARR_CLOSE;
}

function narrLabel() {
  var a = (cfg && cfg.know !== 'off') ? ('防全知' + narrTag(cfg.know)) : '';
  var b = (cfg && cfg.charm !== 'off') ? ('去媚' + narrTag(cfg.charm)) : '';
  if (a && b) return a + '+' + b;
  return a || b || '关';
}

/* 粗估 token：中文约 0.7 tok/字，只用来给面板一个量级，不当计费依据 */
function narrTokens() {
  var b = narrBody();
  if (!b) return 0;
  return Math.round(b.length * 0.7);
}

/* 剥掉上一次注入的块。找不到标记就原样返回 —— 绝不做「猜着删」。 */
function narrStripOnce(s) {
  var t = String(s == null ? '' : s);
  var i = t.indexOf('〔' + NARR_TAG);
  if (i < 0) return t;
  var j = t.indexOf(NARR_CLOSE, i);
  if (j < 0) return t;
  j += NARR_CLOSE.length;
  var head = t.slice(0, i);
  var tail = t.slice(j);
  /* 连带吃掉两边的空白，否则每轮重注入都会多一行空行，越滚越长 */
  head = head.replace(/[ \t]+$/, '');
  tail = tail.replace(/^[ \t\r\n]+/, '');
  if (!tail) return head.replace(/[\s]+$/, '');
  return head + (head ? '\n\n' : '') + tail;
}

/* 历史遗留可能留了两块（旧版注入过 + 这版又注入），一次剥一块不够。
   上限 8 次只是防呆，正常一轮就结束。 */
function narrStrip(s) {
  var t = String(s == null ? '' : s);
  for (var k = 0; k < 8; k++) {
    var n = narrStripOnce(t);
    if (n === t) break;
    t = n;
  }
  return t;
}

/* 真正的注入：只改传入的 body 副本 */
function narrApply(body) {
  var out = [];
  if (!body || typeof body !== 'object') return out;
  var msgs = (body.request && typeof body.request === 'object' && Array.isArray(body.request.messages))
    ? body.request.messages
    : (Array.isArray(body.messages) ? body.messages : null);
  if (!msgs || !msgs.length) return out;

  /* 末尾向前找第一条 user：破甲的 /continue 轮里，末条是 assistant 占位 */
  var idx = -1;
  for (var i = msgs.length - 1; i >= 0; i--) {
    var m = msgs[i];
    if (m && String(m.role || '') === 'user') { idx = i; break; }
  }
  if (idx < 0) return out;

  var m2 = msgs[idx];
  var old = String(textOfMsg(m2) || '');
  var base = narrStrip(old);
  var block = narrBody();

  if (!block) {
    if (base !== old) { setMsgText(m2, base); out.push('叙述:清掉'); }
    return out;
  }

  var sep = '';
  if (base) sep = /\n$/.test(base) ? '\n' : '\n\n';
  var next = base + sep + block;
  if (next !== old) {
    setMsgText(m2, next);
    out.push('叙述:' + narrLabel());
  }
  return out;
}
