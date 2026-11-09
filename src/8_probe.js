/* ============================================================================
 * Anti-Route v7.2 — 8/8 身份筛选（坏 token 筛选检验）
 *
 * 用途：非对称的降级探测器。
 *   - 抄错（命中率低）⇒ 大概率不是目标高阶模型（便宜、可常跑）
 *   - 抄对（命中率高）⇒ 不能证明是目标模型，只能说"不像便宜替身"
 * 铁律：只发一次独立小请求（不碰聊天请求）、失败不抛、不写 chat。
 * ========================================================================== */

var ID_KEY = 'ar7.id';
var ID_ITEMS = [
  'StarSrvGroupBody',
  'intFragmentation',
  'Kv7Qm2Lz9RxT',
  'b3f9c1e7a2d84b06',
  'NlPz4Wq8Jh2V',
  'FragmentationCacheXn3',
  'SrvGroupKernelBody',
  'Qz9Lm4Tb7Wn2',
  '7fa2c9e1d3b84605',
  'Hn5Kp3Xs8Qv1',
  'ThreadLocalFragmentation',
  'Xz6Wq9Lm3Rt7'
];
var ID = { running: false, result: null, used: [] };

function idLoad() {
  try {
    var s = JSON.parse(localStorage.getItem(ID_KEY) || '{}');
    ID.used = Array.isArray(s.used) ? s.used : [];
    ID.result = s.result || null;
  } catch (e) { ID.used = []; ID.result = null; }
}

function idSave() {
  try {
    localStorage.setItem(ID_KEY, JSON.stringify({ used: ID.used.slice(-24), result: ID.result }));
  } catch (e) {}
}

/* 轮换：优先没跑过的，跑完一轮再重置 */
function idPick() {
  idLoad();
  var pool = [];
  for (var i = 0; i < ID_ITEMS.length; i++) {
    if (ID.used.indexOf(ID_ITEMS[i]) < 0) pool.push(ID_ITEMS[i]);
  }
  if (pool.length < 6) { ID.used = []; pool = ID_ITEMS.slice(); }
  return pool.slice(0, 8);
}

function idBody(items) {
  var lines = [];
  for (var i = 0; i < items.length; i++) lines.push((i + 1) + ') ' + items[i]);
  var user = '下面有 ' + items.length + ' 行标识符。请逐字原样复制每一行（大小写、数字、字母一个都不能改），' +
    '并猜一下它最可能出自什么系统（一句话，十个字以内）。\n' +
    '只输出一个 JSON 数组，不要输出任何解释、不要用代码块包裹，格式：\n' +
    '[{"id":"原文","copy":"你复制的原文","guess":"猜测"}]\n\n' + lines.join('\n');
  return {
    messages: [
      { role: 'system', content: '你是一个逐字转录器。只做复制，不做解释，不修正任何拼写。' },
      { role: 'user', content: user }
    ],
    max_tokens: 800,
    stream: false
  };
}

function idNorm(s) {
  return String(s == null ? '' : s).replace(/^[\s"'`「」『』]+|[\s"'`「」『』]+$/g, '').replace(/\s+/g, '');
}

/* 从文本里抠出 [{id,copy}]：整体 JSON → 代码块 → 首个数组切片 → 逐行正则 */
function idEntries(text) {
  var t = String(text || '');
  var tries = [t];
  var f = /```(?:json)?\s*([\s\S]*?)```/i.exec(t);
  if (f) tries.push(f[1]);
  var a = t.indexOf('['), b = t.lastIndexOf(']');
  if (a >= 0 && b > a) tries.push(t.slice(a, b + 1));
  for (var i = 0; i < tries.length; i++) {
    try {
      var arr = JSON.parse(tries[i]);
      if (Array.isArray(arr)) return arr;
    } catch (e) {}
  }
  var out = [];
  var rx = /"id"\s*:\s*"([^"]*)"[\s\S]{0,200}?"copy"\s*:\s*"([^"]*)"/gi;
  var m;
  while ((m = rx.exec(t)) && out.length < 40) out.push({ id: m[1], copy: m[2] });
  return out;
}

function idScore(text, items) {
  var rows = [];
  var entries = idEntries(text);
  for (var i = 0; i < items.length; i++) {
    var want = items[i];
    var got = '';
    for (var k = 0; k < entries.length; k++) {
      var e = entries[k] || {};
      var eid = idNorm(e.id), ecopy = idNorm(e.copy);
      if (eid === idNorm(want) || ecopy === idNorm(want)) { got = String(e.copy || e.id || ''); break; }
    }
    if (!got && entries.length === items.length) got = String(entries[i].copy || entries[i].id || '');
    rows.push({ item: want, got: got, ok: idNorm(got) === idNorm(want) });
  }
  return rows;
}

function idVerdict(hit, n) {
  if (!n) return { code: 'error', label: '未测', note: '没有拿到可解析的回包' };
  var rate = hit / n;
  var w = wilson(hit, n);
  var ci = (Math.round(w.lo * 1000) / 10) + '% ~ ' + (Math.round(w.hi * 1000) / 10) + '%';
  if (n < 6) return { code: 'unknown', label: '样本不足', note: '只跑了 ' + n + ' 条，结论不可用（95%CI ' + ci + '）' };
  if (rate < 0.5) return { code: 'fail', label: '不像高阶', note: '命中 ' + hit + '/' + n + '（' + Math.round(rate * 100) + '%，95%CI ' + ci + '）⇒ 大概率不是目标模型，或这次是被降级的' };
  if (rate > 0.85) return { code: 'pass', label: '疑似高阶', note: '命中 ' + hit + '/' + n + '（' + Math.round(rate * 100) + '%，95%CI ' + ci + '）⇒ 不能证明身份，只能说明"不像便宜替身"' };
  return { code: 'mid', label: '未定', note: '命中 ' + hit + '/' + n + '（' + Math.round(rate * 100) + '%，95%CI ' + ci + '）⇒ 样本还分不开，再跑一次' };
}

function runIdentityProbe() {
  if (ID.running) return Promise.resolve({ ok: false, msg: '正在跑，稍等' });
  var base = String(cfg.dualBase || (lastReq && lastReq.base) || '').replace(/\/+$/, '');
  if (!base) return Promise.resolve({ ok: false, msg: '先填反代 Base（或先正常跑一轮）' });
  var items = idPick();
  if (!items.length) return Promise.resolve({ ok: false, msg: '探针库为空' });
  var url = openAIUrl(base);
  var body = idBody(items);
  ID.running = true;
  return probeOnce(url, body, 45000).then(function (r) {
    ID.running = false;
    var text = String(r.raw || '');
    if (!text) {
      var bad = { at: nowMs(), n: items.length, hit: 0, verdict: 'error', note: '探针没有回包：' + (r.err || ('HTTP ' + r.status)), rows: [] };
      ID.result = bad; idSave(); render();
      return { ok: false, msg: bad.note };
    }
    var rows = idScore(text, items);
    var hit = 0;
    for (var i = 0; i < rows.length; i++) if (rows[i].ok) hit++;
    var v = idVerdict(hit, rows.length);
    ID.result = {
      at: nowMs(), n: rows.length, hit: hit, verdict: v.code,
      label: v.label, note: v.note, model: String(r.model || ''), rows: rows
    };
    for (var k = 0; k < items.length; k++) if (ID.used.indexOf(items[k]) < 0) ID.used.push(items[k]);
    idSave(); render();
    return { ok: true, hit: hit, n: rows.length, verdict: v.code, label: v.label, note: v.note };
  })['catch'](function (e) {
    ID.running = false;
    return { ok: false, msg: String(e && e.message || e) };
  });
}

function idCard() {
  var r = ID.result;
  if (!r) return '<div class="ar6-note">身份筛选：未跑。点「身份筛选」——抄错 ⇒ 大概率不是高阶模型；抄对 ⇒ 只排除便宜替身，不证明身份。</div>';
  var color = r.verdict === 'fail' ? 'ar6-bad' : (r.verdict === 'pass' ? 'ar6-ok' : 'ar6-warn');
  var h = '<div class="ar6-note"><span class="' + color + '">' + esc(r.label || r.verdict) + '</span> · ' + esc(r.note || '') + '</div>';
  var rows = r.rows || [];
  if (rows.length) {
    h += '<div class="ar6-kv">';
    for (var i = 0; i < rows.length && i < 10; i++) {
      h += '<span class="ar6-k">' + (rows[i].ok ? '✅' : '❌') + ' ' + esc(rows[i].item) + '</span>' +
        '<span class="ar6-v">' + esc(rows[i].got || '（没抄）') + '</span>';
    }
    h += '</div>';
  }
  return h;
}

function idFooter() {
  var r = ID.result;
  if (!r) return '身份 未测';
  return '身份 ' + (r.label || r.verdict) + ' ' + r.hit + '/' + r.n;
}
