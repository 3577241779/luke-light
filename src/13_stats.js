/* ============================================================================
 * Anti-Route v7 — 13/Stats  渠道账本 / 指纹卡 / 记录导出 / A-B 对照
 * 原则：只做「度量与展示」。不碰生成请求、不 clone 200、不代替用户做决定。
 *   - 账本：按渠道累计有结论的轮次（不吃日志 40 条上限），给 wilson 区间
 *   - 指纹卡：把「这个渠道能不能验」聚成一段话，回显渠道自动降权
 *   - 导出：一段 <=1800 字的可粘贴文本 + 一行 base64 机读载荷
 *   - A/B：裸请求 vs 当前配置，各 2 次，只报倾向不报结论
 * ========================================================================== */

var LED_KEY = 'ar7.led';
var AB_STATE = { running: false, last: null };

function statBase() {
  try { return String(curBase() || '').replace(/\/+$/, ''); } catch (e) { return ''; }
}

/* 账本按 base 归并：同一个反代换 key 不该分家 */
function statKey() {
  var b = statBase();
  return b ? String(hashStr(b)).slice(0, 10) : 'local';
}

function readLed() {
  try {
    var o = JSON.parse(HOST.localStorage.getItem(LED_KEY) || '{}');
    return (o && typeof o === 'object') ? o : {};
  } catch (e) { return {}; }
}

function writeLed(o) {
  try { HOST.localStorage.setItem(LED_KEY, JSON.stringify(o)); } catch (e) {}
}

function ledEmpty() {
  return { n: 0, same: 0, diff: 0, thin: 0, echo: 0, blocked: 0, weak: 0, at: 0 };
}

function ledRow() {
  var all = readLed();
  var r = all[statKey()];
  if (!r || typeof r !== 'object') return ledEmpty();
  var o = ledEmpty();
  var keys = ['n', 'same', 'diff', 'thin', 'echo', 'blocked', 'weak', 'at'];
  for (var i = 0; i < keys.length; i++) {
    var v = Number(r[keys[i]]);
    o[keys[i]] = isFinite(v) ? v : 0;
  }
  return o;
}

/* 只收「有结论」的轮次：内部请求、C 级、unknown/empty/error 都不进分母。
   这条是路由率一直被高估的原因——分母混进来了不算数的轮次。 */
function ledAdd(rec) {
  try {
    if (!rec || rec.internal) return;
    var conf = rec.conf || 'C';
    var c = rec.code;
    if (c !== 'same' && c !== 'diff' && c !== 'thin' && c !== 'echo' && c !== 'blocked') return;
    var all = readLed();
    var k = statKey();
    var r = all[k];
    if (!r || typeof r !== 'object') r = ledEmpty();
    r.at = nowMs();
    if (conf === 'A' || conf === 'B') {
      r.n = Number(r.n || 0) + 1;
      r[c] = Number(r[c] || 0) + 1;
    } else {
      /* C 级也记，但只记「弱证据」一格：混进被换率就是把猜的当成的 */
      r.weak = Number(r.weak || 0) + 1;
    }
    all[k] = r;
    writeLed(all);
  } catch (e) {}
}

/* 被换率 = 不该出现的三种（被换 / 无思考 / 回显）占全部有结论轮次 */
function ledStat() {
  var r = ledRow();
  var bad = r.diff + r.thin + r.echo;
  var w = wilson(bad, r.n);
  return {
    n: r.n, bad: bad,
    pct: r.n ? Math.round(w.p * 1000) / 10 : 0,
    lo: Math.round(w.lo * 1000) / 10,
    hi: Math.round(w.hi * 1000) / 10,
    enough: r.n >= 5,
    row: r
  };
}

function ledLine() {
  var s = ledStat();
  if (!s.n) return '渠道账本：还没有有结论的轮次（先聊两轮）';
  var ci = s.enough ? ('（95% 区间 ' + s.lo + '–' + s.hi + '%）') : '（样本不足，先别当结论）';
  var weak = Number(s.row && s.row.weak || 0);
  return '渠道账本 n=' + s.n + ' · 被换 ' + s.pct + '%' + ci +
    (weak ? '，另有 ' + weak + ' 轮证据太弱未计入' : '');
}

/* ---------------- 渠道指纹卡（不做新存储，只把已有观测聚成一句话） ---------------- */

function fpCard() {
  var b = statBase() || '（未知渠道）';
  var st = { echoes: null };
  try { st = chState() || st; } catch (e) {}
  var ver = (st.echoes === true) ? '回显（名字对不上不能当证据）'
    : (st.echoes === false ? '可验（名字能当证据）' : '未验（先点「🔭 验渠道」）');
  var ali = 0;
  try { ali = (ALIAS_CACHE && ALIAS_CACHE.length) || 0; } catch (e2) { ali = 0; }
  var s = ledStat();
  var lines = [
    '🏷 渠道 ' + String(b).replace(/^https?:\/\//, '').slice(0, 42),
    '可验性：' + ver,
    '别名：' + (ali ? ali + ' 个可用' : '未扫（点「🏷 扫别名」）'),
    '账本：' + (s.n ? ('n=' + s.n + '，被换 ' + s.pct + '%' + (s.enough ? '' : '（样本不足）')) : '空'),
    '结论：' + (st.echoes === true
      ? '这个渠道会回显你的模型名，跨家族「被换」一律降级为「无法判定」。'
      : (st.echoes === false ? '名字可作为 B 级证据；跨家族且在响应体自述时才是 A 级。' : '未验渠道只有 C 级证据，别拿它下结论。'))
  ];
  return lines.join('\n');
}

/* ---------------- 记录导出 ---------------- */

function b64(s) {
  try {
    if (HOST.btoa) return HOST.btoa(unescape(encodeURIComponent(String(s))));
  } catch (e) {}
  return '';
}

function redact(s) {
  return String(s == null ? '' : s)
    .replace(/sk-[A-Za-z0-9_\-]{6,}/g, 'sk-***')
    .replace(/([?&](?:key|token|api_key)=)[^&\s]+/gi, '$1***');
}

function hhmm(ms) {
  try {
    var d = new Date(ms);
    return ('0' + d.getHours()).slice(-2) + ':' + ('0' + d.getMinutes()).slice(-2);
  } catch (e) { return '--:--'; }
}

/* 从新到旧取，直到 1800 字上限；宁可少几轮，也不要导出一段被截断的糊字 */
function exportText() {
  var log = readLog() || [];
  var s = ledStat();
  var head = [
    '卢克之光 V' + VERSION + ' · 记录导出',
    '渠道：' + (statBase() || '（未知）'),
    '账本：n=' + s.n + '，被换 ' + s.pct + '%（' + s.lo + '–' + s.hi + '%）' + (s.enough ? '' : ' 样本不足'),
    '---'
  ];
  var body = [];
  var used = head.join('\n').length;
  var picked = [];
  for (var i = log.length - 1; i >= 0; i--) {
    var r = log[i];
    if (!r) continue;
    var line = hhmm(r.at) + ' ' + (r.req || '—') + ' → ' + (r.obs || '—') +
      ' [' + (r.verdict || '?') + '/' + (r.conf || 'C') + ']' +
      (r.status ? ' HTTP' + r.status : '') +
      (r.chars ? ' ' + r.chars + '字' : '') +
      (r.internal ? ' (内部)' : '') +
      (r.note ? ' — ' + redact(r.note) : '');
    if (used + line.length + 1 > 1700) break;
    used += line.length + 1;
    body.push(line);
    picked.push({
      t: r.at, req: r.req, obs: r.obs, code: r.code, conf: r.conf,
      st: r.status, ch: r.chars, in: r.internal ? 1 : 0, n: redact(r.note)
    });
  }
  var payload = b64(JSON.stringify({
    v: VERSION, base: statBase(), led: { n: s.n, bad: s.bad, pct: s.pct }, rec: picked
  }));
  var out = head.join('\n') + '\n' + body.join('\n');
  if (payload) out += '\n#AR6LOG 1 ' + payload;
  return out;
}

/* ---------------- A/B 对照（裸请求 vs 当前配置） ---------------- */

function abBody(framed) {
  var b = {
    model: (cfg.alias || (lastReq && lastReq.model) || 'gemini-4-argon'),
    messages: [{ role: 'user', content: '说一句「好」。' }],
    max_tokens: 24,
    stream: false
  };
  if (!framed) return b;
  try {
    var p = planRequest(JSON.stringify(b), openAIUrl(statBase()), false);
    if (p && p.body && p.body !== JSON.stringify(b)) return JSON.parse(p.body);
  } catch (e) {}
  return b;
}

function abArm(framed) {
  var url = openAIUrl(statBase());
  return probeOnce(url, abBody(framed), 45000).then(function (r) {
    return { framed: framed, status: r.status, model: r.model || '', err: r.err || '' };
  });
}

/* 2×2：只报「配置有没有改变观测到的名字」，不下「谁更好」的结论 */
function abProbe() {
  if (AB_STATE.running) return Promise.resolve({ ok: false, msg: '正在跑' });
  if (!statBase()) return Promise.resolve({ ok: false, msg: '先填反代 Base' });
  AB_STATE.running = true;
  render();
  var seq = [false, true, false, true];
  var out = [];
  var step = function (i) {
    if (i >= seq.length) return Promise.resolve(out);
    return abArm(seq[i]).then(function (r) { out.push(r); return step(i + 1); });
  };
  return step(0).then(function (arr) {
    AB_STATE.running = false;
    var plain = [], framed = [];
    for (var i = 0; i < arr.length; i++) (arr[i].framed ? framed : plain).push(arr[i]);
    var same = function (a) { return a[0] && a[1] && a[0].model && a[0].model === a[1].model; };
    var note;
    if (!plain.length || !plain[0].model) note = '裸请求没拿到 model，对照不成立（可能渠道不写 model 字段）';
    else if (same(plain) && same(framed)) note = '两臂各自稳定，且配置没有改变观测名——配置是安全的';
    else if (same(plain) && !same(framed)) note = '开了配置后名字开始跳——配置可能碰到渠道兼容性';
    else note = '裸请求自己就不稳定——这不是配置的问题，是渠道本身在变';
    var res = { ok: true, plain: plain, framed: framed, note: note, at: nowMs() };
    AB_STATE.last = res;
    render();
    return res;
  })['catch'](function (e) {
    AB_STATE.running = false;
    render();
    return { ok: false, msg: String(e && e.message || e) };
  });
}

function abLine() {
  if (AB_STATE.running) return '⚖️ A/B 对照正在跑…';
  var r = AB_STATE.last;
  if (!r) return '⚖️ A/B 对照：还没跑过（各 2 次小请求，约 10 秒）';
  var f = function (a) {
    return a.map(function (x) { return (x.model || ('HTTP' + x.status)); }).join(' / ');
  };
  return '⚖️ 裸：' + f(r.plain) + ' ｜ 带配置：' + f(r.framed) + ' — ' + r.note;
}
