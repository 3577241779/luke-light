/* patch_v80.cjs — v8.0.0：归属修复（内部请求/证据优先/跨族判定）+ 版本与文案清理 */
const fs = require('fs');
const path = require('path');
const SRC = __dirname;

function read(f) { return fs.readFileSync(path.join(SRC, f), 'utf8'); }
function write(f, s) { fs.writeFileSync(path.join(SRC, f), s, 'utf8'); }
function rep(f, anchor, next, opt) {
  const s = read(f);
  const n = s.split(anchor).length - 1;
  if (n !== 1) throw new Error(f + ' anchor count ' + n + ' :: ' + anchor.slice(0, 60));
  write(f, s.replace(anchor, function () { return next; }));
  if (!opt || !opt.quiet) console.log('patched ' + f);
}

/* ================= 1_core.js ================= */
rep('1_core.js',
  ' * 设计来自 v5.7 的实战教训 + 折光边界 v1.1.1 的工程经验',
  ' * 设计来自 v5/v6/v7 的实战教训');
rep('1_core.js', "var VERSION = '7.6.0';", "var VERSION = '8.0.0';");
rep('1_core.js', '  v: 760', '  v: 800');
rep('1_core.js', 'if (s.v !== 760)', 'if (s.v !== 800)');
rep('1_core.js', '        d.v = 760;', '        d.v = 800;');

/* familyOf：跨家族判定（档位表只在同族内有意义） */
rep('1_core.js',
  'function isProLike(s) {\n  var t = tierOf(s);\n  return t === 3 || t === 4;\n}',
  `function isProLike(s) {
  var t = tierOf(s);
  return t === 3 || t === 4;
}

/* 厂牌：档位表跨厂牌不可比，先分族再比档 */
function familyOf(s) {
  var m = normModel(s);
  if (!m || isOpaqueModel(m)) return '';
  if (/gemini|gemma|argon|palm\\b/.test(m)) return 'google';
  if (/deepseek/.test(m)) return 'deepseek';
  if (/claude|anthropic/.test(m)) return 'anthropic';
  if (/gpt|chatgpt|^o[1-4](?:-|$)|openai/.test(m)) return 'openai';
  if (/qwen|glm|ernie|llama|mistral|kimi|moonshot|doubao|hunyuan|spark/.test(m)) return 'other';
  return '';
}`);

/* ================= 2_refract.js ================= */
rep('2_refract.js', 'function planRequest(rawBody, url) {', 'function planRequest(rawBody, url, internal) {');
rep('2_refract.js',
  "  out.model = String(body.model || body.model_name || '');\n  out.base = deriveBase(url, body);",
  `  out.model = String(body.model || body.model_name || '');
  out.base = deriveBase(url, body);
  out.internal = !!internal;

  /* 内部请求（数据库/填表/静默生成）：body 是结构化协议，别名与微扰都可能毁表 */
  if (internal) {
    if (cfg.pin) {
      if (Array.isArray(body.models) && body.models.length) { delete body.models; out.changed.push('删models[]'); }
      if (Object.prototype.hasOwnProperty.call(body, 'allow_fallbacks') && body.allow_fallbacks !== false) {
        body.allow_fallbacks = false; out.changed.push('allow_fallbacks=false');
      }
    }
    if (out.changed.length) out.body = JSON.stringify(body);
    out.edits = 0; out.added = 0;
    return out;
  }`);
rep('2_refract.js',
  "  if (out.changed.length) out.body = JSON.stringify(body);\n\n  return out;\n}",
  "  if (out.changed.length) out.body = JSON.stringify(body);\n\n  out.edits = edits;\n  out.added = added;\n  return out;\n}", { quiet: false });

/* ================= 3_net.js ================= */
rep('3_net.js',
  'var PEEK_SEQ = 0;\nvar PEEKS = {};',
  `var PEEK_SEQ = 0;
var PEEKS = {};

/* 内部请求：数据库/填表等插件用自带标记发起的生成请求，不写聊天产物 */
var INTERNAL_FETCH_KEY = (typeof Symbol === 'function' && Symbol.for) ? Symbol.for('acu.internal-generation-fetch') : null;

function isInternalRequest(init, bodyObj) {
  try {
    if (init && INTERNAL_FETCH_KEY && init[INTERNAL_FETCH_KEY] === true) return true;
  } catch (e0) {}
  try {
    var msgs = bodyObj && bodyObj.messages;
    if (!Array.isArray(msgs) || !msgs.length) return false;
    if (msgs.length > 2) return false;
    for (var i = 0; i < msgs.length; i++) {
      if (String((msgs[i] && msgs[i].role) || '') === 'assistant') return false;
    }
    return true;
  } catch (e1) { return false; }
}`);

/* handleFetch：识别内部请求 + 传参 */
rep('3_net.js',
  "  var rawBody = init && typeof init.body === 'string' ? init.body : '';\n  var plan = null;\n  var outArgs = args;\n  try {\n    plan = planRequest(rawBody, url);",
  `  var rawBody = init && typeof init.body === 'string' ? init.body : '';
  var plan = null;
  var outArgs = args;
  var internal = false;
  try {
    var parsedForInternal = null;
    try { parsedForInternal = rawBody ? JSON.parse(rawBody) : null; } catch (ePI) {}
    internal = isInternalRequest(init, parsedForInternal);
  } catch (eInt) { internal = false; }
  try {
    plan = planRequest(rawBody, url, internal);`);

/* newEvidence 后带上 internal */
rep('3_net.js',
  "      var ev = newEvidence(plan ? plan.model : '', res.status, 'sse');",
  "      var ev = newEvidence(plan ? plan.model : '', res.status, 'sse');\n      ev.internal = internal;");

/* absorbPeek 增加 ev 参数并回填 body 证据 */
rep('3_net.js', 'function absorbPeek(text, rid) {', 'function absorbPeek(text, rid, ev) {');
rep('3_net.js',
  "    if (typeof render === 'function' && CARD && CARD.open && CARD.rid === rid) {",
  `    /* 响应体自述的模型是强证据：既写日志，也进判定 */
    try {
      if (ev && hit) pushObs(ev, hit, 'body');
      if (ev && !ev.internal && (tt && Number(tt) > 0 || rt && Number(rt) > 0)) {
        ev.hasThink = true;
        ev.hasReasonField = true;
        ev.thoughtTok = Number(tt || rt || 0);
      }
      if (ev && tlen > 0) { ev.bodyChars = tlen; }
    } catch (eEv) {}
    if (typeof render === 'function' && CARD && CARD.open && CARD.rid === rid) {`);
rep('3_net.js', '        absorbPeek(buf, rid);', '        absorbPeek(buf, rid, ev);');
rep('3_net.js', '      absorbPeek(t, rid);', '      absorbPeek(t, rid, ev);');

/* startWatcher：内部请求不读聊天 */
rep('3_net.js',
  '      var c = stCtx();\n      var chat = c && Array.isArray(c.chat) ? c.chat : null;\n      if (chat && chat.length) {',
  '      var c = ev.internal ? null : stCtx();\n      var chat = c && Array.isArray(c.chat) ? c.chat : null;\n      if (chat && chat.length) {');
rep('3_net.js',
  '      var settled = lastLen > 0 && (!isBusy() || t - lastChange > 2200 || ended);\n      var stopped = sawBusy && !isBusy() && lastLen > 0 && t - reqStart > 1200 && t - lastChange > 900;',
  `      var progress = ev.internal ? (ev.sawText ? 1 : 0) : lastLen;
      var settled = progress > 0 && (!isBusy() || t - lastChange > 2200 || ended);
      var stopped = !ev.internal && sawBusy && !isBusy() && progress > 0 && t - reqStart > 1200 && t - lastChange > 900;`);
rep('3_net.js',
  '      if (wants && lastLen === 0 && !timeout) {',
  '      if (wants && progress === 0 && !timeout) {');

/* freshness fail-closed + 只看新消息 */
rep('3_net.js',
  "              var stamp = msg.gen_finished || msg.send_date || '';\n              var ts = Date.parse(stamp);\n              if (!isNaN(ts) && ts + 8000 < reqStart) freshMsg = false;",
  `              var stamp = (ex.gen_finished) || msg.gen_finished || (ex.gen_started) || msg.send_date || '';
              var ts = Date.parse(stamp);
              /* 解析不了就当"不新鲜"：宁可少一条标签，也不认领别人的消息 */
              if (isNaN(ts) || ts + 8000 < reqStart) freshMsg = false;`);
rep('3_net.js',
  '        var changed = chat.length > baseLen || (msg && String(msg.mes || \'\') !== baseMes);',
  '        var changed = chat.length > baseLen;')

/* verdictOf 重写：body 优先 + 跨族判定 + 内部请求说明 */
const oldVerdictStart = `  for (var i = 0; i < obs.length; i++) {
    var a = normModel(req), b = normModel(obs[i]);`;
const s3 = read('3_net.js');
const idxStart = s3.indexOf(oldVerdictStart);
if (idxStart < 0) throw new Error('verdict block not found');
const endMark = `  return {
    code: 'unknown',
    note: (ver === 'no' ? '渠道不可验，无身份证据' : '上游未回传模型标识'),
    conf: 'C'
  };
}`;
const idxEnd = s3.indexOf(endMark, idxStart);
if (idxEnd < 0) throw new Error('verdict end not found');
const newBlock = `  /* 证据排序：响应体 > 聊天记录（标签）；同源按到达顺序 */
  var order = [], orderSrc = [];
  for (var s1 = 0; s1 < srcs.length; s1++) {
    if (srcs[s1] === 'body') { order.push(obs[s1]); orderSrc.push('body'); }
  }
  for (var s2 = 0; s2 < srcs.length; s2++) {
    if (srcs[s2] !== 'body') { order.push(obs[s2]); orderSrc.push(srcs[s2]); }
  }

  for (var i = 0; i < order.length; i++) {
    var a = normModel(req), b = normModel(order[i]);
    if (!a || !b) continue;
    var fromBody = orderSrc[i] === 'body';
    var same = (a === b);
    var fa = familyOf(a), fb = familyOf(b);

    /* 渠道不读 model：聊天记录上的标签不可信；但响应体自述仍然有效 */
    if (ver === 'no' && !fromBody) {
      if (same) continue;
      continue;
    }

    var baseConf = fromBody ? ((ver === 'yes') ? 'A' : 'B') : (ver === 'yes' ? 'B' : 'C');

    if (same) {
      if (!ev.internal && isProLike(a) && !ev.hasThink && channelSeesThinking()) {
        return { code: 'thin', note: '模型一致但本轮没有思考', conf: 'B', obs: order[i] };
      }
      return { code: 'same', note: shortName(order[i]) + (fromBody ? '（响应体）' : ''), conf: baseConf, obs: order[i] };
    }

    /* 跨厂牌：档位表不可比，直接算被换 */
    if (fa && fb && fa !== fb) {
      return {
        code: 'diff',
        note: '跨家族：' + shortName(a) + '（' + fa + '）→ ' + shortName(b) + '（' + fb + '）',
        conf: baseConf, obs: order[i]
      };
    }

    var ta = tierOf(a), tb = tierOf(b);
    if (ta > 0 && tb > 0 && tb < ta) {
      return { code: 'diff', note: shortName(order[i]) + ' (T' + tb + '<T' + ta + ')', conf: baseConf, obs: order[i] };
    }
    /* 响应体说了一个不同的模型：即便同档，也是被换 */
    if (fromBody) {
      return { code: 'diff', note: '响应体：' + shortName(b) + ' ≠ 请求 ' + shortName(a), conf: baseConf, obs: order[i] };
    }
    return { code: 'echo', note: '模型不同但无法定档：' + shortName(order[i]), conf: 'C', obs: order[i] };
  }
  return {
    code: 'unknown',
    note: ev.internal ? '内部请求（数据库/填表）：无聊天产物，响应体也未回传模型' :
      (ver === 'no' ? '渠道不可验，无身份证据' : '上游未回传模型标识'),
    conf: 'C'
  };
}`;
write('3_net.js', s3.slice(0, idxStart) + newBlock + s3.slice(idxEnd + endMark.length));
console.log('patched 3_net.js (verdictOf)');

/* finish：用判定选中的那条观测 + 内部请求标记 + 思考来自响应体 */
rep('3_net.js',
  "    obs: ev.observed.length ? shortName(ev.observed[0]) : '—',\n    src: (ev.observedSrc && ev.observedSrc[0]) || '',",
  `    obs: shortName(v.obs || (ev.observed.length ? ev.observed[0] : '—')),
    src: (function () {
      try {
        if (v.obs) { var k = ev.observed.indexOf(v.obs); return k >= 0 ? (ev.observedSrc[k] || '') : ''; }
      } catch (eSrc) {}
      return (ev.observedSrc && ev.observedSrc[0]) || '';
    })(),`);
rep('3_net.js',
  "    think: ev.hasThink ? 1 : 0,",
  "    think: ev.hasThink ? 1 : (ev.hasReasonField ? 0 : null),");
rep('3_net.js',
  "    rid: ev.rid || 0,",
  "    rid: ev.rid || 0,\n    internal: !!ev.internal,");

console.log('v8.0.0 patches applied');
