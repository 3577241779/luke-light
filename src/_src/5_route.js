/* ============================================================================
 * Anti-Route v7 — 5/6 Route
 * 渠道可验性门禁 / 别名钉死 / 瘦身报告 / 路由率 KPI / 档位可观测性检查
 * 原则：全部是「旁路探针 + 展示」，不在生成路径上加任何计算
 * ========================================================================== */

var CH_KEY = 'ar7.ch';
var ALIAS_CACHE = null;

/* ---------------- 渠道状态 ---------------- */

function chKeyOf(base, key) {
  return String(hashStr(String(base || '').replace(/\/+$/, '') + '|' + String(key || '')));
}

/* 当前渠道基址：优先面板里填的，其次用上一轮请求实际发往的 base */
function curBase() {
  var b = String(cfg.dualBase || '').replace(/\/+$/, '');
  if (b) return b;
  try { if (lastReq && lastReq.base) return String(lastReq.base).replace(/\/+$/, ''); } catch (e) {}
  return '';
}

function readChAll() {
  try {
    var o = JSON.parse(HOST.localStorage.getItem(CH_KEY) || '{}');
    return (o && typeof o === 'object') ? o : {};
  } catch (e) { return {}; }
}

function writeChAll(o) {
  try { HOST.localStorage.setItem(CH_KEY, JSON.stringify(o)); } catch (e) {}
}

function chState() {
  var b = curBase();
  if (!b) return { echoes: null, at: 0, base: '' };
  var all = readChAll();
  var st = all[chKeyOf(b, cfg.dualKey || '')];
  if (!st || typeof st !== 'object') return { echoes: null, at: 0, base: b };
  st.base = b;
  return st;
}

function setChState(st) {
  var b = curBase();
  if (!b) return false;
  var all = readChAll();
  var next = { echoes: st.echoes, at: nowMs(), base: b, note: st.note || '' };
  all[chKeyOf(b, cfg.dualKey || '')] = next;
  writeChAll(all);
  return true;
}

/* 可验性标签：true=回显不可验 / false=可验 / null=未验 */
function verifiableLabel() {
  var st = chState();
  if (st.echoes === true) return '不可验';
  if (st.echoes === false) return '可验';
  return '未验';
}

function verifiableCode() {
  var st = chState();
  if (st.echoes === true) return 'no';
  if (st.echoes === false) return 'yes';
  return 'unknown';
}

/* ---------------- 最小探针 ---------------- */

function probeFetchFn() {
  try { if (typeof probeFetch === 'function' && probeFetch) return probeFetch; } catch (e) {}
  try { return HOST.fetch; } catch (e) { return null; }
}

function probeOnce(url, bodyObj, ms) {
  return new Promise(function (resolve) {
    var done = false;
    var timer = setTimeout(function () {
      if (done) return;
      done = true;
      resolve({ status: 0, model: '', err: 'timeout' });
    }, ms || 20000);
    var f = probeFetchFn();
    if (!f) { clearTimeout(timer); resolve({ status: 0, model: '', err: 'no-fetch' }); return; }
    var init = {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(bodyObj)
    };
    try {
      if (cfg.dualKey) init.headers.Authorization = 'Bearer ' + cfg.dualKey;
    } catch (e) {}
    var p;
    try {
      p = f.call(HOST, url, init);
    } catch (e) {
      clearTimeout(timer); resolve({ status: 0, model: '', err: 'throw' }); return;
    }
    p.then(function (res) {
      var out = { status: res.status, model: '', err: '', ctx: '' };
      return res.text().then(function (t) {
        out.raw = String(t || '').slice(0, 4000);
        try {
          var j = JSON.parse(t);
          out.model = String(j.model || (j.candidates && j.candidates[0] && j.candidates[0].modelVersion) || '');
          if (j.error && j.error.message) out.err = String(j.error.message).slice(0, 120);
        } catch (e) {
          var m = /"(?:model|modelVersion)"\s*:\s*"([^"]{1,120})"/.exec(t || '');
          if (m) out.model = m[1];
          if (/131072|token count exceeds/i.test(t || '')) out.ctx = '131072';
        }
        return out;
      }).catch(function () { return out; });
    }).then(function (out2) {
      if (done) return;
      done = true;
      clearTimeout(timer);
      resolve(out2);
    }).catch(function () {
      if (done) return;
      done = true;
      clearTimeout(timer);
      resolve({ status: 0, model: '', err: 'network' });
    });
  });
}

/* 幽灵名探针：4xx ⇒ 按名分发（可验）；200 ⇒ 不读名字（回显） */
function runChannelVerify() {
  var base = String(cfg.dualBase || '').replace(/\/+$/, '');
  if (!base) return Promise.resolve({ ok: false, msg: '先填反代 Base' });
  var real = String(cfg.alias || (lastReq && lastReq.model) || 'gemini-4-argon');
  var ghost = real + '-zzz-nonexistent';
  var url = openAIUrl(base);
  var body = {
    model: ghost,
    messages: [{ role: 'user', content: 'ping' }],
    max_tokens: 16,
    stream: false
  };
  return probeOnce(url, body, 20000).then(function (r) {
    var echoes = null, note = '', why = '';
    var msg = String((r && r.err) || '');
    if (r.status >= 400 && r.status < 500 && r.status !== 429) {
      /* 4xx 不等于「按名分发」：401/403 是认证没过、402 是没钱，
         这两种根本没走到查模型那一步，不能拿来当证据。 */
      if (r.status === 401 || r.status === 403) {
        why = 'auth';
        note = '认证被拒（HTTP ' + r.status + '）：请求没走到「按名分发」这一步，判断不了';
      } else if (r.status === 402) {
        why = 'quota';
        note = '额度/计费被拒（HTTP 402）：判断不了';
      } else if (/model|not found|does not exist|unknown|no such|invalid/i.test(msg)) {
        why = 'rejected';
        echoes = false;
        note = '幽灵名被拒（HTTP ' + r.status + '）：网关按名分发，model 字段可作证据';
      } else {
        why = 'unclear';
        note = 'HTTP ' + r.status + ' 被拒，但错误与模型名无关' + (msg ? '（' + msg + '）' : '') + '：判断不了';
      }
    } else if (r.status === 200) {
      why = 'echo';
      echoes = true;
      note = '幽灵名也返回 200 ⇒ 网关不读 model，回传的 model 一律视为标签/回显';
    } else if (r.status === 0) {
      why = 'net';
      note = '探针失败：' + (r.err || '网络错误');
    } else {
      why = 'unclear';
      note = 'HTTP ' + r.status + '，无法定性（稍后重试）';
    }
    if (echoes !== null) setChState({ echoes: echoes, note: note });
    render();
    return { ok: echoes !== null, echoes: echoes, status: r.status, note: note,
      ghost: ghost, why: why, err: msg, raw: String((r && r.raw) || '').slice(0, 300) };
  });
}

/* ---------------- 别名钉死 ---------------- */

function aliasBaseName() {
  var m = String(cfg.alias || (lastReq && lastReq.model) || 'gemini-4-argon');
  return m.replace(/^(?:google\/|models\/|pg-)/i, '');
}

function aliasCandidates() {
  var x = aliasBaseName();
  var list = [
    x,
    'google/' + x,
    'models/' + x,
    'pg-' + x,
    x + '-high'
  ];
  var seen = {}, out = [];
  for (var i = 0; i < list.length; i++) {
    var v = list[i];
    if (!v || seen[v]) continue;
    seen[v] = 1;
    out.push(v);
  }
  return out.slice(0, 5);
}

function runAliasSweep() {
  var base = String(cfg.dualBase || '').replace(/\/+$/, '');
  if (!base) return Promise.resolve({ ok: false, msg: '先填反代 Base' });
  var url = openAIUrl(base);
  var cands = aliasCandidates();
  var rows = [];
  var chain = Promise.resolve();
  cands.forEach(function (name) {
    chain = chain.then(function () {
      var body = { model: name, messages: [{ role: 'user', content: 'ping' }], max_tokens: 16, stream: false };
      return probeOnce(url, body, 20000).then(function (r) {
        var ok = r.status === 200;
        var same = String(r.model || '').replace(/^models\//i, '').toLowerCase() === String(name).replace(/^models\//i, '').toLowerCase();
        rows.push({
          alias: name, status: r.status, model: r.model || '—',
          ctx: r.ctx, ok: ok, echo: ok && same
        });
      });
    });
  });
  return chain.then(function () {
    ALIAS_CACHE = rows;
    render();
    return { ok: true, rows: rows };
  });
}

/* ---------------- 瘦身报告（只读） ---------------- */

function slimReport(raw) {
  var body = null;
  try { body = JSON.parse(raw || (lastReq && lastReq.raw) || ''); } catch (e) { return null; }
  if (!body) return null;
  var msgs = Array.isArray(body.messages) ? body.messages : [];
  var text = '';
  for (var i = 0; i < msgs.length; i++) {
    var c = msgs[i] && msgs[i].content;
    if (typeof c === 'string') text += c + '\n\n';
  }
  var paras = text.split(/\n{2,}/).filter(function (p) { return p.trim().length >= 80; });
  var seen = {}, dupParas = 0, dupChars = 0;
  for (var j = 0; j < paras.length; j++) {
    var k = paras[j].trim().slice(0, 200);
    if (seen[k]) { dupParas++; dupChars += paras[j].length; } else seen[k] = 1;
  }
  var em = text.match(/(?:注意|强调|重要|必须|务必|切记)[：:，,]/g) || [];
  var sysCount = 0;
  for (var t = 0; t < msgs.length; t++) if (msgs[t] && msgs[t].role === 'system') sysCount++;
  return {
    chars: text.length,
    messages: msgs.length,
    systemCount: sysCount,
    dupParas: dupParas,
    dupChars: dupChars,
    emphasis: em.length,
    advice: (dupParas > 0 ? '有 ' + dupParas + ' 个重复段落（约 ' + dupChars + ' 字），可合并。' : '没有发现重复段落。') +
            (em.length > 12 ? ' 强调类词出现 ' + em.length + ' 次，密度偏高。' : '')
  };
}

/* ---------------- 路由率 KPI ---------------- */

function wilson(k, n) {
  if (!n) return { lo: 0, hi: 0, p: 0 };
  var z = 1.96, p = k / n;
  var d = 1 + z * z / n;
  var c = p + z * z / (2 * n);
  var a = z * Math.sqrt(p * (1 - p) / n + z * z / (4 * n * n));
  var lo = (c - a) / d, hi = (c + a) / d;
  return { p: p, lo: Math.max(0, lo), hi: Math.min(1, hi) };
}

function kpi() {
  var log = readLog() || [];
  var eff = 0, bad = 0;
  for (var i = 0; i < log.length; i++) {
    var r = log[i];
    if (!r) continue;
    if (r.internal) continue;   /* 插件请求不进路由率分母 */
    var conf = r.conf || 'C';
    if (conf !== 'A' && conf !== 'B') continue;
    if (r.code === 'skip') continue;   /* 不在检测范围的不进路由率 */
    if (r.code === 'unknown' || r.code === 'empty' || r.code === 'error') continue;
    eff++;
    if (r.code === 'diff' || r.code === 'thin' || r.code === 'echo') bad++;
  }
  var w = wilson(bad, eff);
  return { bad: bad, eff: eff, pct: eff ? Math.round(w.p * 1000) / 10 : 0, lo: Math.round(w.lo * 1000) / 10, hi: Math.round(w.hi * 1000) / 10, verifiable: verifiableCode() };
}

/* ---------------- 档位可观测性检查 ---------------- */

var LEVEL_TEST = { running: false, result: null };

function levelProbe(levelLabel, effort) {
  var base = String(cfg.dualBase || '').replace(/\/+$/, '');
  var url = openAIUrl(base);
  var body = {
    model: cfg.alias || (lastReq && lastReq.model) || 'gemini-4-argon',
    messages: [{ role: 'user', content: '用一句话解释：为什么天空是蓝色的？' }],
    max_tokens: 96,
    stream: false,
    reasoning_effort: effort
  };
  var t0 = nowMs();
  return probeOnce(url, body, 60000).then(function (r) {
    var dt = nowMs() - t0;
    var chars = 0;
    try {
      var j = JSON.parse(r.model ? '' : '');
    } catch (e) {}
    return { level: levelLabel, effort: effort, status: r.status, ms: dt, model: r.model, err: r.err };
  });
}

function runLevelCheck() {
  if (LEVEL_TEST.running) return Promise.resolve({ ok: false, msg: '正在跑' });
  var base = String(cfg.dualBase || '').replace(/\/+$/, '');
  if (!base) return Promise.resolve({ ok: false, msg: '先填反代 Base' });
  LEVEL_TEST.running = true;
  render();
  return levelProbe('高', 'high')
    .then(function (a) { return levelProbe('低', 'minimal').then(function (b) { return [a, b]; }); })
    .then(function (arr) {
      var a = arr[0], b = arr[1];
      var verdict = 'unknown', note = '';
      if (!a.status || !b.status) {
        note = '两档都没拿到响应（' + (a.err || b.err || '网络错误') + '），无法判断';
      } else if (a.status !== 200 && b.status !== 200) {
        note = '两档都非 200（' + a.status + '/' + b.status + '），无法判断';
      } else {
        var faster = b.ms > 0 && a.ms > 0 ? (a.ms / b.ms) : 0;
        if (faster >= 1.25 || faster <= 0.8) { verdict = 'honored'; note = '两档耗时差 ' + Math.round((faster - 1) * 100) + '%，参数看起来被尊重'; }
        else { verdict = 'ignored'; note = '两档耗时几乎相同（' + a.ms + 'ms vs ' + b.ms + 'ms），reasoning_effort 疑似被忽略'; }
      }
      LEVEL_TEST.running = false;
      LEVEL_TEST.result = { verdict: verdict, note: note, rows: arr };
      render();
      return { ok: true, verdict: verdict, note: note, rows: arr };
    })['catch'](function (e) {
      LEVEL_TEST.running = false;
      render();
      return { ok: false, msg: String(e && e.message || e) };
    });
}

/* ---------------- v7.4 锁定审计 / 外来护盾 ---------------- */

var LOCK_FIELDS = ['allow_fallbacks', 'openrouter_allow_fallbacks', 'openrouter_use_fallback', 'provider.allow_fallbacks'];
var LAST_AUDIT = null;
var LAST_FOREIGN = 0;

function readLockField(body, path) {
  if (!body || typeof body !== 'object') return undefined;
  if (path.indexOf('.') < 0) return Object.prototype.hasOwnProperty.call(body, path) ? body[path] : undefined;
  var parts = path.split('.');
  var cur = body;
  for (var i = 0; i < parts.length; i++) {
    if (!cur || typeof cur !== 'object' || !Object.prototype.hasOwnProperty.call(cur, parts[i])) return undefined;
    cur = cur[parts[i]];
  }
  return cur;
}

function lockAudit(body) {
  var rows = [], pinned = 0, present = 0;
  for (var i = 0; i < LOCK_FIELDS.length; i++) {
    var v = readLockField(body, LOCK_FIELDS[i]);
    var has = v !== undefined;
    var ok = has && v === false;
    if (has) present++;
    if (ok) pinned++;
    rows.push({ name: LOCK_FIELDS[i], present: has, locked: ok });
  }
  LAST_AUDIT = { total: LOCK_FIELDS.length, present: present, pinned: pinned, rows: rows };
  return LAST_AUDIT;
}

function auditLabel() {
  return LAST_AUDIT ? (LAST_AUDIT.pinned + '/' + LAST_AUDIT.total) : '—';
}

function auditColor() {
  if (!LAST_AUDIT) return 'gray';
  if (LAST_AUDIT.pinned === LAST_AUDIT.total) return 'ok';
  if (LAST_AUDIT.pinned > 0) return 'warn';
  return 'gray';
}

function foreignShield(body) {
  var msgs = body && Array.isArray(body.messages) ? body.messages : null;
  if (!msgs || !msgs.length) { LAST_FOREIGN = 0; return 0; }
  var hits = 0;
  var n = Math.min(12, msgs.length);
  for (var i = 0; i < n; i++) {
    var m = msgs[i];
    if (!m) continue;
    var t = typeof m.content === 'string' ? m.content : '';
    if (!t) continue;
    var c1 = (t.match(/<!--/g) || []).length;
    if (c1 >= 2) hits++;
    var c2 = (t.match(/^\[[a-zA-Z0-9_]{4,}\]:\s*#/gm) || []).length;
    if (c2 >= 2) hits++;
    var c3 = (t.match(/[\u200b\u200c\u200d\ufeff]{3,}/g) || []).length;
    if (c3 >= 2) hits++;
    if (/\[(?:IZUMI_ANTI_ROUTE|ANTI_ROUTE|GEMINI_ANTI_ROUTE)\]/i.test(t)) hits++;
  }
  LAST_FOREIGN = hits;
  return hits;
}

function foreignCount() { return LAST_FOREIGN; }
