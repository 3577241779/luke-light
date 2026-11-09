/* ============================================================================
 * Anti-Route v8 — 17/Shape 结构指纹
 *
 * 目的：名字可以伪造，手感可以模仿，回包形状很难一直装下去。记「这台渠道 +
 * 这个请求名」最近若干轮响应体的结构指纹（有没有 usage、usage 键集、有没有
 * 思考 token 字段、有没有 modelVersion、finish 取值），本轮整串没出现过时，
 * 在横幅和卡片上留一行黄色小字提醒「格式不像它」。
 *
 * 铁律：
 *   - 只提示。不改 rec.code、不写账本（ledAdd）、不拦请求、不判被换。
 *   - 只读 PEEKS[rid]（别处已经 clone 好的旁路取样），绝不碰 HTTP 响应体。
 *   - 关闸（cfg.shape !== 'on'）时：shapePush 不写、shapeJudge 一律返回 null。
 *   - 冷启动：少于 8 条**历史**样本没有指纹基线，不判（算上本轮要到第 9 轮）。
 *   - 只学「正常的轮次」：被换 / 无思考的轮次不入库，否则学成仿冒方。
 *
 * 指纹怎么算（5 段，用 | 连接）：
 *   u = 有没有 usage；k = usage 键排序后前 6 个；t = 有没有思考 token 字段；
 *   v = 有没有 modelVersion；f = finish 取值。
 *   3_net.js 的 absorbPeek 没有落 usage 对象，只落了 thoughts / reasoning /
 *   out / prompt 四个计数；shapeUsage 把它们拼回 usage 的形状再算，别猜。
 *
 * 存储：ar6.shape = { [渠道hash|请求名]: [ {sig,at}, ... ] }，每 key 最多
 * 24 条，超出丢最旧；超过 30 天没更新的样本不再参与判定。
 * ========================================================================== */

var SHAPE_KEY = 'ar6.shape';
var SHAPE_MAX = 24;       /* 每个 key 最多留 24 条，超出丢最旧 */
var SHAPE_MIN_N = 8;      /* 少于 8 条历史样本没有指纹基线，不判 */
var SHAPE_EXPIRE = 30 * 24 * 3600 * 1000;  /* 30 天 */

function shapeOn() {
  try { return !!cfg && String(cfg.shape == null ? '' : cfg.shape) === 'on'; }
  catch (e) { return false; }
}

function shapeRead() {
  try {
    var o = JSON.parse(HOST.localStorage.getItem(SHAPE_KEY) || '{}');
    if (!o || typeof o !== 'object' || Array.isArray(o)) return {};
    return o;
  } catch (e) { return {}; }
}

function shapeWrite(o) {
  try { HOST.localStorage.setItem(SHAPE_KEY, JSON.stringify(o)); } catch (e) {}
}

/* 渠道 + 请求名：口径必须和 16_base.js 的 baseId 一模一样，
   能复用就复用（baseId 是全局函数），免得两套 key 各自为政。 */
function shapeId(rec) {
  try {
    if (typeof baseId === 'function') return String(baseId(rec) || '');
  } catch (eBase) {}
  try {
    var b = '';
    try { b = String((rec && rec.base) || (typeof statBase === 'function' ? statBase() : '') || ''); }
    catch (e1) { b = ''; }
    var m = '';
    try { m = String((rec && rec.req) || ''); } catch (e2) { m = ''; }
    return (b ? String(hashStr(b)) : 'local') + '|' + m;
  } catch (e) { return ''; }
}

function shapeOf(k) {
  try {
    var all = shapeRead();
    var arr = all[k];
    return Array.isArray(arr) ? arr : [];
  } catch (e) { return []; }
}

/* 把 PEEKS 里散落的计数拼成 usage 的形状：
   absorbPeek 落的是 thoughts / reasoning / out / prompt；如果以后真存了
   usage 对象就优先用它。一个都没有 = 这一轮没看到 usage。 */
function shapeUsage(pk) {
  try {
    if (!pk || typeof pk !== 'object') return null;
    var u = pk.usage;
    if (u && typeof u === 'object' && !Array.isArray(u)) return u;
    /* absorbPeek 落的真实键名（最准）：thoughtsTokenCount / reasoning_tokens /
       prompt_tokens … 这些名字本身就是渠道指纹，优先用它。 */
    var uk = String(pk.usageKeys == null ? '' : pk.usageKeys);
    if (uk) {
      var ks0 = uk.split(',');
      var o0 = {};
      for (var j = 0; j < ks0.length; j++) {
        if (ks0[j]) o0[String(ks0[j])] = 1;
      }
      if (shapeKeys(o0).length) return o0;
    }
    var o = {};
    var any = false;
    var names = ['thoughts', 'reasoning', 'out', 'prompt'];
    for (var i = 0; i < names.length; i++) {
      var v = pk[names[i]];
      if (typeof v === 'number' && isFinite(v)) { o[names[i]] = v; any = true; }
    }
    return any ? o : null;
  } catch (e) { return null; }
}

function shapeKeys(u) {
  try {
    if (!u || typeof u !== 'object') return [];
    return Object.keys(u).sort();
  } catch (e) { return []; }
}

/* usage 里有没有思考 token 字段：键名匹配就算，不看数值（0 也是「有」）。 */
function shapeThinks(u) {
  try {
    var ks = shapeKeys(u);
    var re = /thought|reasoning|thinking/i;
    for (var i = 0; i < ks.length; i++) if (re.test(ks[i])) return true;
    return false;
  } catch (e) { return false; }
}

/* 一轮 → 一串短指纹；PEEKS 里没有这一轮就返回 ''（没数据不判）。 */
function shapeSig(rec) {
  try {
    if (typeof PEEKS === 'undefined' || !PEEKS || !rec || rec.rid == null) return '';
    var pk = PEEKS[rec.rid];
    if (!pk || typeof pk !== 'object') return '';
    var u = shapeUsage(pk);
    var ks = u ? shapeKeys(u) : [];
    var f = '';
    try { f = String(pk.finish == null ? '' : pk.finish).replace(/\|/g, '/'); }
    catch (eF) { f = ''; }
    return (u ? 'u1' : 'u0') + '|' +
      ks.slice(0, 6).join(',') + '|' +
      (u && shapeThinks(u) ? 't1' : 't0') + '|' +
      (pk.modelVersion ? 'v1' : 'v0') + '|' + f;
  } catch (e) { return ''; }
}

function shapeRowOk(r) {
  try {
    return !!r && typeof r === 'object' && typeof r.sig === 'string' && r.sig !== '';
  } catch (e) { return false; }
}

/* 基线只代表「以前」：本轮若已落库，判的时候把尾巴上那条自己摘掉；
   同时丢掉过期样本。 */
function shapeHist(arr, sig) {
  try {
    var out = [];
    var now = Date.now();
    for (var i = 0; i < arr.length; i++) {
      var r = arr[i];
      if (!shapeRowOk(r)) continue;
      var at = Number(r.at);
      if (isFinite(at) && at > 0 && now - at > SHAPE_EXPIRE) continue;
      out.push(r);
    }
    if (out.length && sig) {
      var last = out[out.length - 1];
      if (String(last.sig) === String(sig)) out.pop();
    }
    return out;
  } catch (e) { return []; }
}

/* 记一条。被换 / 无思考的轮次不入库，否则基线会学成仿冒方的样子；
   没取到响应体（sig === ''）也不写。 */
function shapePush(rec) {
  try {
    if (!rec || !shapeOn()) return null;
    if (rec.internal) return null;
    if (rec.code === 'diff' || rec.code === 'thin' || rec.code === 'skip') return null;
    var sig = shapeSig(rec);
    if (!sig) return null;
    var k = shapeId(rec);
    if (!k) return null;
    var all = shapeRead();
    /* 顺手清掉整库里的老 key，免得试过多少个代理就留多少个 */
    var now = Date.now();
    for (var kk in all) {
      if (!Object.prototype.hasOwnProperty.call(all, kk)) continue;
      var vv = all[kk];
      if (!Array.isArray(vv) || !vv.length) { delete all[kk]; continue; }
      var lastAt = Number(vv[vv.length - 1] && vv[vv.length - 1].at);
      if (isFinite(lastAt) && lastAt > 0 && now - lastAt > SHAPE_EXPIRE) delete all[kk];
    }
    var arr = Array.isArray(all[k]) ? all[k] : [];
    arr.push({ sig: sig, at: now });
    if (arr.length > SHAPE_MAX) arr = arr.slice(arr.length - SHAPE_MAX);
    all[k] = arr;
    shapeWrite(all);
    return { sig: sig, at: now };
  } catch (e) { return null; }
}

/* 历史里出现次数最多的那一串，平票取更近的一种（迭代时用 >=）。 */
function shapeRef(hist) {
  try {
    var counts = {};
    var order = [];
    for (var i = 0; i < hist.length; i++) {
      var s = String(hist[i].sig);
      if (!Object.prototype.hasOwnProperty.call(counts, s)) { counts[s] = 0; order.push(s); }
      counts[s]++;
    }
    var best = '';
    var bestN = -1;
    for (var j = 0; j < order.length; j++) {
      if (counts[order[j]] >= bestN) { bestN = counts[order[j]]; best = order[j]; }
    }
    return { sig: best, n: bestN };
  } catch (e) { return { sig: '', n: 0 }; }
}

function shapeStable(hist) {
  try {
    if (!hist.length) return false;
    var s = String(hist[0].sig);
    for (var i = 1; i < hist.length; i++) {
      if (String(hist[i].sig) !== s) return false;
    }
    return true;
  } catch (e) { return false; }
}

/* 哪一段不同 → 一句人话。别把整串指纹甩给用户。 */
function shapeSegDesc(pos, cur, ref) {
  try {
    if (pos === 2) return ref === 't1' ? '少了思考字段' : '多了思考字段';
    if (pos === 0) return ref === 'u1' ? '少了 usage' : '多了 usage';
    if (pos === 3) return ref === 'v1' ? '少了 modelVersion' : '多了 modelVersion';
    if (pos === 4) return 'finish 取值不同';
    if (pos === 1) {
      if (ref && cur) return 'usage 字段不一样';
      return ref ? 'usage 少了字段' : 'usage 多了字段';
    }
    return '返回字段不一样';
  } catch (e) { return '返回字段不一样'; }
}

/* 多段不同时只报最有信息量的一段：思考字段 → usage 有无 → modelVersion
   → finish → usage 键集。 */
function shapeDiff(cur, ref) {
  try {
    var a = String(ref || '').split('|');
    var b = String(cur || '').split('|');
    if (a.length !== 5 || b.length !== 5) return '字段组合和过去不一样';
    var order = [2, 0, 3, 4, 1];
    for (var i = 0; i < order.length; i++) {
      var p = order[i];
      if (a[p] !== b[p]) return shapeSegDesc(p, b[p], a[p]);
    }
    return '字段组合和过去不一样';
  } catch (e) { return '字段组合和过去不一样'; }
}

/* 判一轮。样本不足返回 null；命中返回 { why, line }。 */
function shapeJudge(rec) {
  try {
    if (!rec || !shapeOn()) return null;
    /* 判定和入库用同一道门槛：内部请求既不收，也不拿它下结论 */
    if (rec.internal) return null;
    var sig = shapeSig(rec);
    if (!sig) return null;
    var hist = shapeHist(shapeOf(shapeId(rec)), sig);
    if (hist.length < SHAPE_MIN_N) return null;
    for (var i = 0; i < hist.length; i++) {
      if (String(hist[i].sig) === sig) return null;
    }
    var d = shapeDiff(sig, shapeRef(hist).sig);
    var line;
    if (shapeStable(hist)) {
      line = '这台渠道过去 ' + hist.length + ' 轮的返回格式完全一样，这轮变了（' + d + '）';
    } else {
      line = '这一轮的返回格式和这台渠道过去 ' + hist.length + ' 轮都不一样（' + d + '），' +
        '可能是换了模型，也可能是渠道改了接口';
    }
    return { why: 'shape', line: line };
  } catch (e) { return null; }
}

/* 只出这一行字，卡片和横幅共用，避免两处各写一遍 */
function shapeLine(rec) {
  try {
    var sj = shapeJudge(rec);
    return (sj && sj.line) ? String(sj.line) : '';
  } catch (e) { return ''; }
}
