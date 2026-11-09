/* ============================================================================
 * Anti-Route v8 — 16/Base 行为基线
 *
 * 目的：名字可以伪造，速度和思考习惯伪造不了。记「这台渠道 + 这个请求名」
 * 最近若干轮的首字耗时 / 出字速率 / 思考习惯，本轮明显偏离中位数时，在
 * 卡片和横幅上留一行黄色小字提醒「手感不像它」。
 *
 * 铁律：
 *   - 只提示。不改 rec.code、不写账本（ledAdd）、不拦请求、不判被换。
 *   - 关闸（cfg.base !== 'on'）时：basePush 不写、baseJudge 一律返回 null。
 *   - 冷启动：少于 12 条**历史**样本没有基线，不判（算上本轮要到第 13 轮）。
 *   - 基线只学「正常的轮次」：被换 / 无思考的轮次不入库，否则学成仿冒方。
 *
 * 存储：ar6.base = { [渠道hash|请求名]: [ {t,s,c,r,at}, ... ] }，每 key 最多
 * 24 条，超出丢最旧；超过 30 天没更新的样本不再参与判定。
 * ========================================================================== */

var BASE_KEY = 'ar6.base';
var BASE_MAX = 24;        /* 每个 key 最多留 24 条，超出丢最旧 */
var BASE_MIN_N = 12;      /* 少于 12 条历史样本没有基线，不判 */
var BASE_EXPIRE = 30 * 24 * 3600 * 1000;  /* 30 天 */

function baseOn() {
  try { return !!cfg && String(cfg.base == null ? '' : cfg.base) === 'on'; }
  catch (e) { return false; }
}

function baseRead() {
  try {
    var o = JSON.parse(HOST.localStorage.getItem(BASE_KEY) || '{}');
    if (!o || typeof o !== 'object' || Array.isArray(o)) return {};
    return o;
  } catch (e) { return {}; }
}

function baseWrite(o) {
  try { HOST.localStorage.setItem(BASE_KEY, JSON.stringify(o)); } catch (e) {}
}

/* 渠道 + 请求名：同一台反代下 chat 和 reasoner 的基线必须分开，
   否则「多在有思考」会被另一条模型的 0 拉平成了误报。 */
function baseId(rec) {
  var b = '';
  try { b = String((rec && rec.base) || (typeof statBase === 'function' ? statBase() : '') || ''); }
  catch (e) { b = ''; }
  var m = '';
  try { m = String((rec && rec.req) || ''); } catch (e) { m = ''; }
  return (b ? String(hashStr(b)) : 'local') + '|' + m;
}

function baseOf(k) {
  var all = baseRead();
  var arr = all[k];
  return Array.isArray(arr) ? arr : [];
}

/* 思考 token 数：旁路读到过就用真数，读不到返回 0（只能用 0/1 标记兜底） */
function baseThoughts(rec) {
  try {
    if (typeof PEEKS === 'undefined' || !PEEKS || !rec || rec.rid == null) return 0;
    var pk = PEEKS[rec.rid];
    if (!pk || pk.thoughts == null) return 0;
    var n = Number(pk.thoughts);
    return (isFinite(n) && n > 0) ? n : 0;
  } catch (e) { return 0; }
}

/* 出字速率：只算「出字阶段」，把首字前的等待和思考时间从分母里剥掉，
   否则「这轮没思考」会让速率自己翻倍，被误判成「出字快」。 */
function baseSpeed(chars, total, ttft) {
  var span = Number(total) - Number(ttft);
  if (!isFinite(chars) || chars <= 0) return 0;
  if (!isFinite(span) || span <= 0) return 0;
  return chars / (span / 1000);
}

/* 一轮 → 一条样本。收不了（字太少 / 没首字 / 没耗时）返回 null。 */
function baseRow(rec) {
  if (!rec) return null;
  var chars = Number(rec.chars);
  var ttft = Number(rec.ttft);
  var total = Number(rec.total);
  if (!isFinite(chars) || chars < 50) return null;
  if (!isFinite(ttft) || ttft <= 0) return null;
  if (!isFinite(total) || total <= 0) return null;
  var s = baseSpeed(chars, total, ttft);
  var c = (rec.think === 0 || rec.think === 1) ? rec.think : null;
  var r = null;
  if (c !== null) {
    var tk = baseThoughts(rec);
    /* r = 思考 token / 正文字数；拿不到思考 token 时用 1 表示「这一轮有思考」。
       不写成 1/chars：那会把中位数压到 0.002 左右，0.1 的门槛永远够不到。 */
    r = c === 0 ? 0 : (tk > 0 ? tk / chars : 1);
  }
  return {
    t: Math.round(ttft),
    s: Math.round(s * 10) / 10,
    c: c,
    r: (r === null) ? null : (Math.round(r * 1000) / 1000),
    at: Date.now()
  };
}

function baseMed(arr) {
  var a = [];
  for (var i = 0; i < arr.length; i++) {
    /* 只认真正的数字：Number(null)===0 会把坏行当成「0 毫秒」拉低中位数 */
    if (typeof arr[i] !== 'number' || !isFinite(arr[i])) continue;
    a.push(arr[i]);
  }
  if (!a.length) return 0;
  a.sort(function (x, y) { return x - y; });
  var m = a.length >> 1;
  return (a.length % 2) ? a[m] : (a[m - 1] + a[m]) / 2;
}

function baseRowOk(r) {
  return !!r && typeof r === 'object' &&
    typeof r.t === 'number' && isFinite(r.t) && r.t > 0 &&
    typeof r.s === 'number' && isFinite(r.s) && r.s > 0;
}

/* 基线只代表「以前」：本轮若已落库，判的时候把它从样本尾巴上摘掉；
   同时丢掉过期样本。 */
function baseHist(arr, rec) {
  var out = [];
  var now = Date.now();
  for (var i = 0; i < arr.length; i++) {
    if (!baseRowOk(arr[i])) continue;
    var at = Number(arr[i].at);
    if (isFinite(at) && at > 0 && now - at > BASE_EXPIRE) continue;
    out.push(arr[i]);
  }
  if (out.length && rec) {
    var row = baseRow(rec);
    var last = out[out.length - 1];
    if (row && Number(last.t) === row.t && Number(last.s) === row.s && last.c === row.c) out.pop();
  }
  return out;
}

function baseSec(ms) {
  return (Math.round(Number(ms) / 100) / 10).toFixed(1);
}

/* 记一条。只收 chars>=50 且 ttft>0 的正常轮次；
   被换 / 无思考的轮次不入库，否则基线会学成仿冒方的样子。 */
function basePush(req, rec) {
  try {
    if (!rec) { rec = req; req = null; }
    if (!rec || !baseOn()) return null;
    if (rec.internal) return null;
    if (rec.code === 'diff' || rec.code === 'thin' || rec.code === 'skip') return null;
    var row = baseRow(rec);
    if (!row) return null;
    var k = baseId(rec);
    var all = baseRead();
    /* 顺手清掉整库里的老 key，免得试过多少个代理就留多少个 */
    var now = Date.now();
    for (var kk in all) {
      if (!Object.prototype.hasOwnProperty.call(all, kk)) continue;
      var vv = all[kk];
      if (!Array.isArray(vv) || !vv.length) { delete all[kk]; continue; }
      var lastAt = Number(vv[vv.length - 1] && vv[vv.length - 1].at);
      if (isFinite(lastAt) && lastAt > 0 && now - lastAt > BASE_EXPIRE) delete all[kk];
    }
    var arr = Array.isArray(all[k]) ? all[k] : [];
    arr.push(row);
    if (arr.length > BASE_MAX) arr = arr.slice(arr.length - BASE_MAX);
    all[k] = arr;
    baseWrite(all);
    return row;
  } catch (e) { return null; }
}

/* 判一轮。样本不足返回 null；命中返回 { why, line }。
   顺序：快 → 思考归零 → 速率 → 慢。
   「思考归零」排在速率前面：一轮不思考会让速率分母变小，先解释最具体的那件事。 */
function baseJudge(req, rec) {
  try {
    if (!rec) { rec = req; req = null; }
    if (!rec || !baseOn()) return null;
    /* 判定和入库用同一道门槛：一边说「这轮数据不可用」，一边拿它下结论是不对的 */
    if (rec.internal) return null;
    var row = baseRow(rec);
    if (!row) return null;
    var hist = baseHist(baseOf(baseId(rec)), rec);
    if (hist.length < BASE_MIN_N) return null;

    var tArr = [];
    var sArr = [];
    var rArr = [];
    for (var i = 0; i < hist.length; i++) {
      tArr.push(hist[i].t);
      sArr.push(hist[i].s);
      /* 只有明确知道「想没想」的轮次才进思考分母 */
      if (hist[i].c === 0 || hist[i].c === 1) rArr.push(Number(hist[i].r) || 0);
    }
    var tMed = baseMed(tArr);
    var sMed = baseMed(sArr);
    var rMed = baseMed(rArr);

    var ttft = Number(rec.ttft);
    var s = row.s;

    /* 1) 首字突然快一倍多（中位本身太小时不判：500ms 的抖动没意义） */
    if (isFinite(ttft) && ttft > 0 && tMed > 800 && ttft < tMed / 2.2) {
      return {
        why: 'fast',
        line: '本轮首字 ' + baseSec(ttft) + 's，比这台渠道的中位 ' + baseSec(tMed) + 's 快了一倍多'
      };
    }
    /* 2) 平时在想，这轮一句都没想 */
    if (rec.think === 0 && rMed > 0.1) {
      return {
        why: 'think',
        line: '这台渠道近 ' + hist.length + ' 轮多在有思考，本轮一点都没有'
      };
    }
    /* 3) 出字速率翻倍。
       首字本身就很慢时不判速率：分母被首字吃掉，剩下的窗口算出来必然偏快，
       那是「开头慢」，不是「出字快」。 */
    var slowStart = (isFinite(ttft) && ttft > 0 && tMed > 0 && ttft > tMed * 1.5);
    if (!slowStart && s > 0 && sMed > 0 && s > sMed * 2.2) {
      return {
        why: 'rate',
        line: '本轮出字 ' + (s / sMed).toFixed(1) + ' 倍于这台渠道的中位'
      };
    }
    /* 4) 慢很多：措辞放软，慢本来就可能只是网络 */
    if (isFinite(ttft) && ttft > 0 && tMed > 0 && ttft > tMed * 3) {
      return {
        why: 'slow',
        line: '本轮首字 ' + baseSec(ttft) + 's，比平时慢一些，也可能只是网络抖动'
      };
    }
    return null;
  } catch (e) { return null; }
}

/* 只出这一行字，卡片和横幅共用，避免两处各写一遍 */
function baseLine(rec) {
  try {
    var bj = baseJudge(rec);
    return (bj && bj.line) ? String(bj.line) : '';
  } catch (e) { return ''; }
}
