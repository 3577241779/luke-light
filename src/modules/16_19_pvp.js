/* ===== 19_pvp.js ===== */
/* 19_pvp.js — 自动 PVP（自动重发 / 超时 / 空回）
 *
 * 为什么单开一层：
 *   破甲（7_jail）和抗截断（14_trunc）都在「酒馆已经拿到 200」之后才动手，
 *   而 503 / 429 / 连接被掐这种请求根本走不到 finish()——它们看不见。
 *   自动 PVP 补的就是这个缺口，分两层：
 *     1) 重发层：在 fetch 钩子里、把 Response 交还酒馆之前原地重发，对外仍只算一次请求；
 *     2) 空回层：200 却一个字都没有、而且破甲关着，才由它补一枪。
 *   两层都过 resumeGate / RS.turnKey：同一轮只补一次；破甲或抗截断先认领，它绝不再动。
 * 不做的事：不换渠道、不读完整响应体（保住流式首字）、绝不把「用户按了停止」当失败重发。
 */

/* ---- 关键参数（下面是默认值；v3.1 起实际值从 cfg 读，面板「自定义」里能改） ---- */
var PVP_CODES = [408, 429, 500, 502, 503, 504, 507, 508, 520, 521, 522, 523, 524, 529];
var PVP_WAIT_MS = 1200;                 /* 第 1 次重发前的等待 */
var PVP_STEP_MS = 1400;                 /* 每多一次加多少 */
var PVP_WAIT_MAX = 8000;                /* 单次等待上限（Retry-After 也按它封顶） */
var PVP_GAP_MS = 800;                   /* 两次重发之间的最小间隔 */
var PVP_WIN_MS = 60000;                 /* 滑窗窗口 */
var PVP_WIN_MAX = 6;                    /* 一分钟最多重发几次 */
var PVP_COOL_MS = 30000;                /* 额度打光后的冷却 */
var PVP_RETRY_AFTER_MAX = 8000;         /* 旧字段，仍兼容（读配置时的上限） */
var PVP_RA_CAP = 30000;                 /* v3.1.4：上游 Retry-After 排队上限 30 秒 */
var PVP_WATCH_MS = 90000;               /* 首字看门狗阈值（默认关） */

function pvpCfgNum(v, def, lo, hi) {
  var n = Number(v);
  if (!isFinite(n)) n = def;
  if (n < lo) n = lo;
  if (n > hi) n = hi;
  return Math.round(n);
}
function pvpWaitFirst() { return pvpCfgNum(cfg && cfg.pvpWait, PVP_WAIT_MS, 500, 10000); }
function pvpStepMs() { return pvpCfgNum(cfg && cfg.pvpStep, PVP_STEP_MS, 0, 5000); }
function pvpWaitCap() { return pvpCfgNum(cfg && cfg.pvpWaitMax, PVP_WAIT_MAX, 1000, 30000); }
function pvpGapMs() { return pvpCfgNum(cfg && cfg.pvpGap, PVP_GAP_MS, 0, 5000); }
function pvpWinMaxN() { return pvpCfgNum(cfg && cfg.pvpWinMax, PVP_WIN_MAX, 1, 12); }
function pvpCoolMs() { return pvpCfgNum(cfg && cfg.pvpCool, 30, 0, 300) * 1000; }
function pvpWatchMs() { return pvpCfgNum(cfg && cfg.pvpWatchSec, 90, 30, 300) * 1000; }

var PVP = {
  try: 0, ok: 0,                        /* 本次会话：重发次数 / 救回来几次 */
  lastCode: 0, lastNote: '', lastAt: 0,
  coolUntil: 0,                         /* 冷却截止 */
  failRun: 0,                           /* 连续几轮重发都没救回来 */
  win: [],                              /* 滑窗时间戳 */
  round: { tries: 0, last: '' },        /* 当前这一轮的重发记账 */
  hintAt: 0,                            /* 关着时遇到 503 的提醒节流 */
  watchTimers: []
};

function pvpDisposed() {
  try { return (typeof DISPOSED !== 'undefined') && DISPOSED; } catch (e) { return false; }
}

function pvpOn() { return !!(cfg && cfg.pvp === 'on'); }
function pvpPaused() { return !!(cfg && cfg.pvpPause === true); }
function pvpManual() { return !!(cfg && cfg.pvpAuto === false); }
/* 自动重发的总条件：开着 + 不是手动 + 没暂停 */
function pvpAuto() { return pvpOn() && !pvpPaused() && !pvpManual(); }

function pvpMax() {
  var n = Number(cfg && cfg.pvpMax);
  if (!isFinite(n)) n = 2;
  n = Math.floor(n);
  return n < 1 ? 1 : (n > 3 ? 3 : n);
}

/* 用户按了停止 ≠ 失败。命中就把错误原样抛回去，一次都不重发。 */
var PVP_ABORT_RE = /(aborterror|aborted|request aborted|clicked stop|用户取消|手动停止|已取消生成|user aborted|cancell)/i;
function pvpAbortLike(e) {
  if (!e) return false;
  try { if (String((e && e.name) || '') === 'AbortError') return true; } catch (e0) {}
  return PVP_ABORT_RE.test(String((e && e.message) || e || ''));
}

/* 只认这几种状态码：其中 408 / 429 / 5xx / Cloudflare 52x 是「换一次可能就好」 */
function pvpRetryableStatus(s) {
  var n = Number(s || 0);
  if (!n) return false;
  for (var i = 0; i < PVP_CODES.length; i++) { if (PVP_CODES[i] === n) return true; }
  return false;
}

function pvpPurgeWin(t) {
  var now = (typeof t === 'number') ? t : nowMs();
  while (PVP.win.length && now - PVP.win[0] > PVP_WIN_MS) PVP.win.shift();
}

function pvpWinLeft() {
  var t = nowMs();
  pvpPurgeWin(t);
  if (PVP.coolUntil && t < PVP.coolUntil) return 0;
  var left = pvpWinMaxN() - PVP.win.length;
  return left > 0 ? left : 0;
}

/* 第 n 次重发之前等多久：首次等待 + (n-1)×递增，封顶，再取 Retry-After 和最小间隔 */
function pvpDelay(n, ra) {
  /* v3.1.4：上游给了 Retry-After 就按它排队，不再叠加自己的退避曲线——
     否则「等 8 秒 + 退避 8 秒」= 16 秒，反而错过上游放行窗口 */
  if (ra > 0) return Math.max(Math.min(ra, PVP_RA_CAP), pvpGapMs());
  var i = Math.max(0, (Number(n) || 1) - 1);
  var base = pvpWaitFirst() + i * pvpStepMs();
  if (base > pvpWaitCap()) base = pvpWaitCap();
  if (base < pvpGapMs()) base = pvpGapMs();
  return base;
}

/* Retry-After：秒数、HTTP 日期都认，认不出来就当没有 */
function pvpRetryAfter(res) {
  try {
    var hd = res && res.headers;
    if (!hd || typeof hd.get !== 'function') return 0;
    var v = hd.get('retry-after');
    if (v === null || v === undefined || v === '') return 0;
    var n = Number(v);
    if (isFinite(n) && n > 0) return Math.min(n * 1000, PVP_RA_CAP);
    var dt = Date.parse(String(v));
    if (isFinite(dt)) { var d = dt - Date.now(); return d > 0 ? Math.min(d, PVP_RA_CAP) : 0; }
  } catch (e) {}
  return 0;
}

function pvpSleep(ms) {
  return new Promise(function (resolve) { setTimeout(resolve, Math.max(pvpGapMs(), ms || 0)); });
}

function pvpSpend(code, why) {
  var t = nowMs();
  PVP.try++;
  PVP.win.push(t);
  PVP.lastCode = Number(code || 0);
  PVP.lastNote = String(why || '');
  PVP.lastAt = t;
  PVP.round.tries++;
  PVP.round.last = PVP.lastNote;
  pvpPurgeWin(t);
  if (PVP.win.length >= pvpWinMaxN()) {
    PVP.coolUntil = t + pvpCoolMs();
    try { banner('♻️ 一分钟内重发太多次，先冷却 ' + Math.round(pvpCoolMs() / 1000) + ' 秒（上游多半在限流）', 'warn'); } catch (e) {}
  }
}

function pvpNote(code, why) {
  PVP.lastCode = Number(code || 0);
  PVP.lastNote = String(why || '');
  PVP.lastAt = nowMs();
}

function pvpUserAborted(init) {
  try { return !!(init && init.signal && init.signal.aborted); } catch (e) { return false; }
}

/* 请求体是流（ReadableStream / getReader）时只能发一次，重发会报 body already used */
function pvpBodyReusable(init) {
  try {
    var b = init && init.body;
    return !(b && typeof b === 'object' && typeof b.getReader === 'function');
  } catch (e) { return true; }
}

/* 关着的时候也让人知道「这一下本来能救」：同一状态码 2 分钟内只提醒一次 */
function pvpHintIfOff(st, internal) {
  try {
    if (!cfg || !cfg.enabled || internal || cfg.safe || pvpOn()) return;
    if (!pvpRetryableStatus(st)) return;
    var t = nowMs();
    if (PVP.hintAt && t - PVP.hintAt < 120000) return;
    PVP.hintAt = t;
    banner('♻️ 上游 ' + st + '：面板里把「自动 PVP」打开就会自动重发（这次没开，只报错）', 'warn');
  } catch (e) {}
}

/* ---- 层 1：重发。递给酒馆的仍然只有一个 Response ---- */
function pvpFetch(next, thisArg, args, init) {
  /* 总开关关着 / 暂停 / 手动就一次都不多发（调用点已经判过，这里是兜底） */
  if (!cfg || !cfg.enabled || !pvpAuto()) return next.apply(thisArg, args);
  var attempt = 0, tokClamps = 0;
  PVP.round = { tries: 0, last: '' };

  function go() {
    if (pvpDisposed()) return Promise.reject(new Error('AR6 disposed'));
    attempt++;
    var state = { selfAbort: false };
    var useArgs = args, ctl = null, timer = 0;

    /* 首字看门狗：默认关。开着时只替换这一次请求的 signal，
       我们自己的 abort 记在 state.selfAbort 上，跟「用户按停止」严格区分。 */
    if (cfg.pvpWatch) {
      try {
        var AC = (typeof AbortController === 'function') ? AbortController
          : ((HOST && typeof HOST.AbortController === 'function') ? HOST.AbortController : null);
        if (AC) ctl = new AC();
      } catch (eAC) { ctl = null; }
      if (ctl) {
        try {
          /* v3.1.1：planRequest 把注入写进 args[1]（body 已改过的 init），
             从 init 复制会把破甲 / 抗截断 / 反OOC 的尾巴整段丢掉——以真正要发的那个为准 */
          var src0 = (args && args.length > 1 && args[1]) ? args[1] : init;
          var ni = {};
          for (var k in src0) { ni[k] = src0[k]; }
          ni.signal = ctl.signal;
          useArgs = [args[0], ni];
          if (init && init.signal && typeof init.signal.addEventListener === 'function') {
            init.signal.addEventListener('abort', function () { try { ctl.abort(); } catch (eS) {} });
          }
        } catch (eNI) { useArgs = args; ctl = null; }
      }
      if (ctl) {
        timer = setTimeout(function () {
          state.selfAbort = true;
          pvpNote(0, '首字超时 ' + Math.round(pvpWatchMs() / 1000) + ' 秒');
          try { ctl.abort(); } catch (eT) {}
        }, pvpWatchMs());
        PVP.watchTimers.push(timer);
      }
    }

    function clearT() {
      if (!timer) return;
      try { clearTimeout(timer); } catch (eC) {}
      var wi = PVP.watchTimers.indexOf(timer);
      if (wi >= 0) PVP.watchTimers.splice(wi, 1);
      timer = 0;
    }

    var pr;
    try { pr = next.apply(thisArg, useArgs); }
    catch (eSync) { clearT(); return Promise.reject(eSync); }
    if (!pr || typeof pr.then !== 'function') { clearT(); return pr; }

    return pr.then(function (res) {
      clearT();
      var st = res ? Number(res.status || 0) : 0;
      if (st === 400 && tokClamps < 2 && typeof lkTryTok400Clamp === 'function') {
        return lkTryTok400Clamp(res, args, false).then(function (a2) {
          if (!a2) return res;
          tokClamps++;
          args = a2;
          attempt = Math.max(0, attempt - 1);
          return go();
        });
      }
      if (!pvpRetryableStatus(st)) return res;
      if (!pvpAuto()) { pvpNote(st, pvpPaused() ? '已暂停，不重发' : '手动模式，不自动重发'); return res; }
      if (attempt > pvpMax()) { pvpNote(st, 'HTTP ' + st + '（重发额度用完）'); return res; }
      if (pvpWinLeft() <= 0) { pvpNote(st, 'HTTP ' + st + '（冷却中，不再重发）'); return res; }
      if (pvpUserAborted(init)) { pvpNote(0, '用户中止，不重发'); return res; }
      if (!pvpBodyReusable(init)) { pvpNote(st, '请求体是流，不能重发'); return res; }
      var ra = pvpRetryAfter(res);
      pvpSpend(st, 'HTTP ' + st);
      /* 这一包不要了：显式取消，别把错误体留在内存里 */
      try { if (res && res.body && typeof res.body.cancel === 'function') res.body.cancel(); } catch (eB) {}
      return pvpSleep(pvpDelay(attempt, ra)).then(go);
    }, function (err) {
      clearT();
      if (pvpAbortLike(err) && !state.selfAbort) { pvpNote(0, '用户中止，不重发'); throw err; }
      if (pvpUserAborted(init)) { pvpNote(0, '用户中止，不重发'); throw err; }
      if (!pvpAuto()) { pvpNote(0, pvpPaused() ? '已暂停，不重发' : '手动模式，不自动重发'); throw err; }
      if (!pvpBodyReusable(init)) { pvpNote(0, '请求体是流，不能重发'); throw err; }
      if (attempt > pvpMax() || pvpWinLeft() <= 0) {
        pvpNote(0, String((err && err.message) || err || '连接失败').slice(0, 40) + '（重发额度用完）');
        throw err;
      }
      pvpSpend(0, state.selfAbort ? '首字超时'
        : ('连接失败：' + String((err && err.message) || err || '').slice(0, 40)));
      return pvpSleep(pvpDelay(attempt, 0)).then(go);
    });
  }

  return go();
}

/* ---- 层 2：空回。只在「破甲关着」时接管，破甲开着就整段让给它 ---- */
function pvpKeyOf(cur) {
  return cur ? (String(cur.idx) + '|' + String(cur.msg.send_date || '')) : 'noctx';
}

function pvpAfterFinish(ev) {
  if (!cfg || !cfg.enabled || !pvpOn() || cfg.safe) return '';
  if (!pvpAuto()) return '';
  if (cfg.pvpEmpty === false) return '';
  if (cfg.jail !== 'off') return '';                    /* 交还破甲，绝不两家一起打 */
  if (!ev || ev.status !== 200 || ev.error || ev.userAborted) return '';
  if (ev.internal || ev.narrative === false || ev.selfContinuation) return '';
  try { if (typeof ST_GEN !== 'undefined' && ST_GEN && ST_GEN.stoppedAt && (nowMs() - ST_GEN.stoppedAt < 15000)) return ''; } catch (ePS) {}
  var j = null;
  try { j = jailInspect(ev); } catch (e) { j = null; }
  if (!j || j.code !== 'empty') return '';
  var key = pvpKeyOf(jailLastAi());
  var g = resumeGate('pvp', key);
  if (!g.ok) {
    if (g.why !== 'turn') { try { banner('♻️ ' + pvpWhy(g.why), 'warn'); } catch (e2) {} }
    return '';
  }
  pvpNote(0, '空回');
  PVP.try++;
  resumeSchedule('pvp', { code: 'pvp', note: '一个字都没有（空回）' }, 1, 1);
  return 'pvp';
}

function pvpWhy(why) {
  if (why === 'max') return '这一轮已经重试过一次了';
  if (why === 'turn') return '这一轮已经补过一次，不重复补';
  if (why === 'gap') return '刚试过，等一下再试';
  if (why === 'rate') return '一分钟内补太多次了，先停手';
  if (why === 'lock') return '上一次还没走完';
  return '现在重试不了（' + why + '）';
}

/* ---- 面板 ---- */
function pvpStatLine() {
  if (!pvpOn()) return '自动 PVP：关（503 / 429 / 超时不会自动重发）';
  var t = Number(PVP.try || 0), k = Number(PVP.ok || 0);
  var s = '自动 PVP：' + (pvpPaused() ? '已暂停' : (pvpManual() ? '手动' : '自动'));
  s += ' · 重发 ' + t + ' 次';
  if (t) s += ' · 救回来 ' + k + ' 次';
  s += ' · 上限 ' + pvpMax() + ' 次 · 首等 ' + (pvpWaitFirst() / 1000) + 's';
  return s;
}

function pvpStatus() {
  if (!pvpOn()) return '';
  if (!cfg.enabled) return '⚠ 防护总开关关着：不会重发';
  if (cfg.safe) return '⚠ 安全模式开着：不重发、不补';
  if (pvpPaused()) return '⏸ 已暂停：自动重发停手（点「已暂停」恢复；手动补一次不受影响）';
  if (pvpManual()) return '🖐 手动模式：只在点「重试一次」时补，不会自动重发';
  if (PVP.coolUntil && nowMs() < PVP.coolUntil) return '⚠ 冷却中：' + Math.max(1, Math.ceil((PVP.coolUntil - nowMs()) / 1000)) + ' 秒后自动恢复（上游在限流）';
  if (PVP.failRun >= 2) return '⚠ 连续 ' + PVP.failRun + ' 轮没救回来，换个渠道试试';
  if (PVP.lastNote) return '最近一次：' + PVP.lastNote;
  return '就绪：只在 503 / 429 / 超时' + (cfg.jail !== 'off' ? ' / 空回（归破甲）' : ' / 空回') + '时动手';
}

function uiPvpHTML() {
  var on = pvpOn();
  var grabN = Number(cfg.grab || 0);
  var grabBdg = grabN > 0 ? (grabN + ' 路并发护航') : '单路常规';
  var watchActive = !!(on && pvpAuto() && cfg.pvpWatch);
  var watchSt = !cfg.pvpWatch ? '待机' : (!on ? '随PVP待命' : (!pvpAuto() ? '随自动待命' : '已开启'));
  var watchAttr = (cfg.pvpWatch && !watchActive) ? 'data-off="1"' : '';
  var pvpGrid = '<div class="ar6-tgrid">' +
    swCell('🔁 503重试:' + (cfg.retry503 === 'off' ? '关' : '开'), '逆风突围 · 503 自动重连', cfg.retry503 !== 'off') +
    swCell('♻️ 自动 PVP:' + (on ? '开' : '关'), '时空回溯 · 异常自动重演', on) +
    swCell('⏱ 首字看门狗:' + (cfg.pvpWatch ? '开' : '关'), '断流看门狗 · 首字超时重演', watchActive, '', watchSt, watchAttr) +
    actBtn('pvpdlg', 'wrench', '回溯时序罗盘') +
    '</div>';
  var h = segBarHTML('飞燕编队 · 高峰并发抢跑', '高峰拥堵时同步发出多路请求，采纳最先响应的一路并自动撤回其余请求；遇到 503、429、超时或空回可自动退避重发。', MENU_SPEC.grab.items, String(cfg.grab || 0), 'gm:grab', '3', grabBdg, grabN >= 3 ? 'gold' : (grabN > 0 ? 'cyan' : ''), pvpGrid);

  if (on) {
    var schedOn = !pvpPaused() && !pvpManual();
    var schedSt = pvpPaused() ? '已暂停' : (pvpManual() ? '手动模式' : '自动巡航');
    var subPvpGrid = '<div class="ar6-tgrid">' +
      swCell(pvpPaused() ? '⏸ 已暂停' : '⏸ 暂停重发', '重抽调度状态', schedOn, '', schedSt) +
      swCell('♻️ 空回也补:' + (cfg.pvpEmpty === false ? '关' : '开'), '空回自动重抽', cfg.jail === 'off' && cfg.pvpEmpty !== false && schedOn, '', cfg.jail !== 'off' ? '形态接管' : (cfg.pvpEmpty === false ? '待机' : (!schedOn ? '随自动待命' : '已开启'))) +
      '</div>';
    h += segBarHTML('单轮逆风重抽上限', pvpStatLine(), [
      ['最多 1 次', 1],
      ['最多 2 次', 2],
      ['最多 3 次', 3]
    ], pvpMax(), 'gm:pvpmax', 3, '上限 ' + pvpMax() + ' 次', 'cyan', subPvpGrid);
  }

  var st = pvpStatus();
  if (st) {
    h += '<div class="ar6-dline ar6-mind" style="color:' + (st.charAt(0) === '⚠' ? '#fda4af' : '#94a3b8') + '">' + esc(st) + '</div>';
  }
  return h;
}

/* ---- v3.1 自定义面板：重发时间 / 上限 / 暂停 / 自动-手动，全部手填 ---- */
var PVPD = { open: false, el: null };

var PVP_DLG_CSS = [
  '#ar6-pvdbg{position:fixed;inset:0;z-index:2147483560;background:rgba(4,8,18,.76);-webkit-backdrop-filter:blur(3px);backdrop-filter:blur(3px);display:flex;align-items:center;justify-content:center;padding:12px;overscroll-behavior:contain;}',
  '#ar6-pvdbg .ar6-pvd{box-sizing:border-box;width:min(436px,100%);max-height:88vh;max-height:88dvh;overflow:auto;overscroll-behavior:contain;background:linear-gradient(180deg,#0F182B 0%,#080D18 100%);border:1.5px solid rgba(148,163,184,.42);border-radius:16px;color:#F0F9FF;font-size:13px;box-shadow:0 0 0 1px rgba(56,189,248,.14),0 22px 56px rgba(2,6,23,.85);}',
  '#ar6-pvdbg button,#ar6-pvdbg label,#ar6-pvdbg input{touch-action:manipulation;-webkit-tap-highlight-color:transparent;}',
  '#ar6-pvdbg .ar6-pvd-h{display:flex;align-items:center;justify-content:space-between;padding:12px 14px 9px;background:linear-gradient(95deg,rgba(14,165,233,.18) 0%,rgba(22,32,50,.88) 60%,rgba(15,24,43,.96) 100%);border-bottom:1px solid rgba(148,163,184,.28);font-weight:700;font-size:14px;color:#F8FAFC;}',
  '#ar6-pvdbg .ar6-pvd-x{background:#162032;border:1px solid rgba(148,163,184,.34);border-radius:7px;color:#CBD5E1;font-size:16px;line-height:1;min-width:34px;min-height:34px;padding:4px 8px;cursor:pointer;}',
  '#ar6-pvdbg .ar6-pvd-x:hover{border-color:#38BDF8;color:#F0F9FF;background:#0C2D48;}',
  '#ar6-pvdbg .ar6-pvd-b{padding:10px 14px 4px;}',
  '#ar6-pvdbg .ar6-pvd-row{display:flex;gap:6px;flex-wrap:wrap;align-items:center;margin:6px 0 4px;}',
  '#ar6-pvdbg .ar6-pvd-seg{flex:1 1 auto;min-height:36px;border:1px solid rgba(148,163,184,.34);border-radius:8px;background:#162032;color:#94A3B8;cursor:pointer;padding:4px 8px;font-size:12px;font-weight:600;}',
  '#ar6-pvdbg .ar6-pvd-seg.on{border-color:#38BDF8;background:#0C2D48;color:#F0F9FF;box-shadow:0 0 10px rgba(56,189,248,.22);}',
  '#ar6-pvdbg .ar6-pvd-tip{color:#94A3B8;font-size:12px;line-height:1.52;margin:4px 0 8px;}',
  '#ar6-pvdbg .ar6-pvd-f{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:7px 0;border-bottom:1px dashed rgba(148,163,184,.2);}',
  '#ar6-pvdbg .ar6-pvd-f span{flex:1 1 auto;line-height:1.4;color:#E2E8F0;}',
  '#ar6-pvdbg .ar6-pvd-f i{display:block;color:#94A3B8;font-size:11px;font-style:normal;margin-top:2px;}',
  '#ar6-pvdbg input[type=number]{width:86px;min-height:32px;box-sizing:border-box;text-align:right;background:#0B1220;border:1px solid rgba(148,163,184,.36);border-radius:7px;color:#F0F9FF;padding:4px 8px;font-size:13px;font-variant-numeric:tabular-nums;}',
  '#ar6-pvdbg input[type=number]:focus{outline:none;border-color:#38BDF8;box-shadow:0 0 0 2px rgba(56,189,248,.18);}',
  '#ar6-pvdbg input[type=checkbox]{width:18px;height:18px;accent-color:#38BDF8;}',
  '#ar6-pvdbg .ar6-pvd-f2{display:flex;gap:8px;padding:10px 14px;padding-bottom:calc(10px + env(safe-area-inset-bottom, 0px));}',
  '#ar6-pvdbg .ar6-pvd-f2 button{flex:1 1 auto;min-height:38px;border:1px solid rgba(148,163,184,.36);border-radius:8px;background:#162032;color:#CBD5E1;cursor:pointer;font-size:12.5px;font-weight:600;padding:6px 8px;}',
  '#ar6-pvdbg .ar6-pvd-f2 button:hover{border-color:#7DD3FC;color:#F0F9FF;}',
  '#ar6-pvdbg .ar6-pvd-f2 button.primary{border-color:#38BDF8;background:linear-gradient(135deg,#0284C7,#0C2D48);color:#F0F9FF;font-weight:700;}',
  '#ar6-pvdbg .ar6-pvd-st{padding:0 14px 12px;color:#94A3B8;font-size:12px;line-height:1.5;}',
  '@media (max-width:600px),(pointer:coarse){#ar6-pvdbg input[type=number]{font-size:16px;min-height:38px;width:92px}#ar6-pvdbg input[type=checkbox]{width:20px;height:20px}}'
].join('\n');

function pvpDlgNumRow(key, label, hint, lo, hi, step) {
  var v = Number(cfg && cfg[key]);
  if (!isFinite(v)) v = 0;
  return '<label class="ar6-pvd-f"><span>' + esc(label) +
    (hint ? '<i>' + esc(hint) + '</i>' : '') + '</span>' +
    '<input type="number" data-pvpk="' + esc(key) + '" min="' + lo + '" max="' + hi +
    '" step="' + (step || 1) + '" value="' + v + '"></label>';
}

function pvpDlgHTML() {
  var on = pvpOn();
  var h = '<div class="ar6-pvd" role="dialog" aria-modal="true" aria-label="自动 PVP 设置">' +
    '<div class="ar6-pvd-h"><span>⚙ 自动 PVP 设置</span>' +
      '<button class="ar6-pvd-x" data-pvpact="close" type="button" aria-label="关闭">×</button></div>' +
    '<div class="ar6-pvd-b">' +
      '<div class="ar6-pvd-row">' +
        '<button class="ar6-pvd-seg' + (!pvpManual() ? ' on' : '') + '" data-pvpact="auto" type="button">自动重发</button>' +
        '<button class="ar6-pvd-seg' + (pvpManual() ? ' on' : '') + '" data-pvpact="manual" type="button">手动</button>' +
        '<button class="ar6-pvd-seg' + (pvpPaused() ? ' on' : '') + '" data-pvpact="pause" type="button">' +
          (pvpPaused() ? '已暂停' : '暂停') + '</button>' +
      '</div>' +
      '<div class="ar6-pvd-tip">' + (on
        ? '自动：遇到 503 / 429 / 超时 / 空回自己重发。手动：只在你点「重试一次」时补。暂停：自动重发先停手，手动补一次不受影响。'
        : '自动 PVP 现在是关的：先把面板上的「自动 PVP」打开，这里的设置才会生效。') + '</div>' +
      pvpDlgNumRow('pvpMax', '每轮最多重发几次', '1-3；总共尝试 = 这个数 + 1', 1, 3, 1) +
      pvpDlgNumRow('pvpWait', '第一次等多久（毫秒）', '收到 503 后先等这么久再发', 500, 10000, 100) +
      pvpDlgNumRow('pvpStep', '每多一次再加（毫秒）', '第 2 次 = 首次 + 这个数，以此类推', 0, 5000, 100) +
      pvpDlgNumRow('pvpWaitMax', '单次最长等（毫秒）', '封顶；上游给的 Retry-After 也按它截断', 1000, 30000, 500) +
      pvpDlgNumRow('pvpGap', '两次之间至少隔（毫秒）', '防止连发把上游惹毛', 0, 5000, 100) +
      pvpDlgNumRow('pvpWinMax', '一分钟内最多重发几次', '超了就冷却，防止死循环', 1, 12, 1) +
      pvpDlgNumRow('pvpCool', '冷却多少秒', '额度打光后停手的时间', 0, 300, 5) +
      pvpDlgNumRow('pvpWatchSec', '首字看门狗（秒）', '开着看门狗时，这么久一个字节都没来就掐掉重发', 30, 300, 5) +
      '<label class="ar6-pvd-f"><span>空回也补一枪<i>200 但一个字都没有时补一次（破甲开着时归破甲）</i></span>' +
        '<input type="checkbox" data-pvpk="pvpEmpty"' + (cfg.pvpEmpty !== false ? ' checked' : '') + '></label>' +
      '<label class="ar6-pvd-f"><span>首字看门狗开关<i>长思考的模型别开，90 秒可能掐掉正常思考</i></span>' +
        '<input type="checkbox" data-pvpk="pvpWatch"' + (cfg.pvpWatch ? ' checked' : '') + '></label>' +
    '</div>' +
    '<div class="ar6-pvd-f2">' +
      '<button data-pvpact="save" class="primary" type="button">保存</button>' +
      '<button data-pvpact="def" type="button">恢复默认</button>' +
      '<button data-pvpact="now" type="button">立即补一次</button>' +
    '</div>' +
    '<div class="ar6-pvd-st" id="ar6-pvd-st">' + esc(pvpStatus() || (on ? '就绪' : '未开启')) + '</div>' +
  '</div>';
  return h;
}

function ensurePvpDlgCss() {
  try {
    if (!DOC || !DOC.getElementById) return;
    if (DOC.getElementById('ar6-pvpdlg-style')) return;
    var st = DOC.createElement('style');
    st.id = 'ar6-pvpdlg-style';
    st.textContent = PVP_DLG_CSS;
    (DOC.head || DOC.documentElement || DOC.body).appendChild(st);
  } catch (e) {}
}

function pvpDlgSync() {
  try {
    var el = PVPD.el;
    if (!el) return;
    var segs = el.querySelectorAll('[data-pvpact]');
    for (var i = 0; i < segs.length; i++) {
      var a = segs[i].getAttribute('data-pvpact');
      if (a === 'auto') segs[i].className = 'ar6-pvd-seg' + (!pvpManual() ? ' on' : '');
      if (a === 'manual') segs[i].className = 'ar6-pvd-seg' + (pvpManual() ? ' on' : '');
      if (a === 'pause') {
        segs[i].className = 'ar6-pvd-seg' + (pvpPaused() ? ' on' : '');
        segs[i].textContent = pvpPaused() ? '已暂停' : '暂停';
      }
    }
    var stEl = el.querySelector('#ar6-pvd-st');
    if (stEl) stEl.textContent = pvpStatus() || (pvpOn() ? '就绪' : '未开启');
  } catch (e) {}
}

function pvpDlgReadField(input) {
  try {
    var k = input.getAttribute('data-pvpk');
    if (!k) return;
    if (input.type === 'checkbox') cfg[k] = !!input.checked;
    else {
      var v = Number(input.value);
      if (!isFinite(v)) return;
      cfg[k] = v;
    }
    sanitizePvp(cfg);
    if (input.type !== 'checkbox') input.value = String(cfg[k]);
    saveCfg();
    render();
    pvpDlgSync();
  } catch (e) {}
}

function pvpDlgResyncInputs() {
  try {
    if (!PVPD.el) return;
    var ins = PVPD.el.querySelectorAll('[data-pvpk]');
    for (var i = 0; i < ins.length; i++) {
      var k = ins[i].getAttribute('data-pvpk');
      if (!k) continue;
      if (ins[i].type === 'checkbox') ins[i].checked = !!cfg[k];
      else ins[i].value = String(cfg[k]);
    }
  } catch (e) {}
}

function closePvpDlg() {
  try { if (PVPD.el && PVPD.el.parentNode) PVPD.el.parentNode.removeChild(PVPD.el); } catch (e) {}
  PVPD.el = null;
  PVPD.open = false;
}

function openPvpDlg() {
  if (DISPOSED) return;
  try {
    closePvpDlg();
    ensurePvpDlgCss();
    var bg = DOC.createElement('div');
    bg.id = 'ar6-pvdbg';
    bg.innerHTML = pvpDlgHTML();
    bg.addEventListener('pointerdown', function (e) {
      if (e && e.target === bg) {
        closePvpDlg();
        try { if (typeof ar6ArmSynthShield === 'function') ar6ArmSynthShield(); } catch (eSh) {}
      }
    });
    bg.addEventListener('click', function (e) {
      var t = e && e.target;
      var btn = (t && t.closest) ? t.closest('[data-pvpact]') : null;
      if (!btn) return;
      var act = btn.getAttribute('data-pvpact');
      if (act === 'close') { closePvpDlg(); return; }
      if (act === 'auto') { cfg.pvpAuto = true; saveCfg(); render(); pvpDlgSync(); return; }
      if (act === 'manual') { cfg.pvpAuto = false; saveCfg(); render(); pvpDlgSync(); return; }
      if (act === 'pause') { cfg.pvpPause = !pvpPaused(); saveCfg(); render(); pvpDlgSync();
        banner(pvpPaused() ? '⏸ 自动重发已暂停（手动补一次仍可用）' : '▶ 自动重发已恢复', pvpPaused() ? 'warn' : 'ok'); return; }
      if (act === 'now') { closePvpDlg(); pvpNowAction(); return; }
      if (act === 'def') {
        cfg.pvpAuto = true; cfg.pvpPause = false;
        cfg.pvpMax = 2; cfg.pvpWait = 1200; cfg.pvpStep = 1400; cfg.pvpWaitMax = 8000;
        cfg.pvpGap = 800; cfg.pvpWinMax = 6; cfg.pvpCool = 30; cfg.pvpEmpty = true;
        cfg.pvpWatch = false; cfg.pvpWatchSec = 90;
        sanitizePvp(cfg); saveCfg(); render(); pvpDlgResyncInputs(); pvpDlgSync();
        banner('⚙ 已恢复默认：上限 2 次，首次等 1.2 秒，每次 +1.4 秒', 'gray');
        return;
      }
      if (act === 'save') {
        var ins = PVPD.el ? PVPD.el.querySelectorAll('[data-pvpk]') : [];
        for (var i = 0; i < ins.length; i++) pvpDlgReadField(ins[i]);
        sanitizePvp(cfg); saveCfg(); render();
        banner('⚙ 自动 PVP 设置已保存（' + pvpMax() + ' 次上限，首次等 ' + (pvpWaitFirst() / 1000) + ' 秒）', 'ok');
        closePvpDlg();
        return;
      }
    });
    bg.addEventListener('change', function (e) {
      var t = e && e.target;
      if (t && t.getAttribute && t.getAttribute('data-pvpk')) pvpDlgReadField(t);
    });
    PVPD.el = bg;
    PVPD.open = true;
    (DOC.body || DOC.documentElement).appendChild(bg);
    /* 仅桌面端打开时把焦点放进第一个输入；手机端禁止自动 focus 以免弹起软键盘并强制放大视口 */
    try {
      if (!(typeof uiMode === 'function' && uiMode() === 'mobile')) {
        var f = bg.querySelector('[data-pvpk]');
        if (f && f.focus) f.focus();
      }
    } catch (eF) {}
  } catch (e) { closePvpDlg(); }
}

function pvpUserRetryTrigger(ctx) {
  if (ctx) {
    if (typeof ctx.Generate === 'function') {
      return { kind: 'Generate', fn: function () { return ctx.Generate('normal'); } };
    }
    if (typeof ctx.executeSlashCommandsWithOptions === 'function') {
      return { kind: '/trigger', fn: function () { return ctx.executeSlashCommandsWithOptions('/trigger'); } };
    }
    if (typeof ctx.executeSlashCommands === 'function') {
      return { kind: '/trigger(旧)', fn: function () { return ctx.executeSlashCommands('/trigger'); } };
    }
  }
  try {
    if (SELF_WIN && typeof SELF_WIN.triggerSlash === 'function') {
      return { kind: 'triggerSlash(iframe)', fn: function () { return SELF_WIN.triggerSlash('/trigger'); } };
    }
  } catch (eT1) {}
  try {
    if (HOST && typeof HOST.triggerSlash === 'function') {
      return { kind: 'triggerSlash(host)', fn: function () { return HOST.triggerSlash('/trigger'); } };
    }
  } catch (eT2) {}
  var regBtn = DOC && DOC.getElementById && DOC.getElementById('option_regenerate');
  if (regBtn) return { kind: '重生成按钮', fn: function () { try { regBtn.click(); } catch (eR) {} return null; } };
  try {
    var ta = DOC && DOC.getElementById && DOC.getElementById('send_textarea');
    var sBtn = DOC && DOC.getElementById && DOC.getElementById('send_but');
    if (sBtn && (!ta || !String(ta.value || '').trim())) {
      return { kind: '发送按钮', fn: function () { try { sBtn.click(); } catch (eS) {} return null; } };
    }
  } catch (eT3) {}
  return null;
}

/* 手动补一枪：走同一道闸门，不占破甲 / 抗截断的次数；支持末条为 user 消息（503/429 未落楼层）时回退重发 */
function pvpManualRetry() {
  try {
    if (typeof isBusy === 'function' && isBusy()) {
      banner('♻️ 酒馆正在生成中，请稍候再试', 'warn');
      return false;
    }
  } catch (eB) {}
  var lastPv = jailLastAi();
  if (lastPv) {
    var gPv = resumeGate('pvp', pvpKeyOf(lastPv));
    if (!gPv.ok) { banner('♻️ ' + pvpWhy(gPv.why), 'warn'); return false; }
    if (!pvpOn()) banner('♻️ 自动 PVP 现在是关的：这一枪只重试这一次', 'warn');
    pvpNote(0, '手动重试');
    PVP.try++;
    resumeSchedule('pvp', { code: 'pvp', note: '手动重试一次' }, 1, 1);
    return true;
  }
  var ctx = stCtx();
  if (ctx && Array.isArray(ctx.chat) && ctx.chat.length === 0) {
    banner('♻️ 当前会话还没有消息，无法重发', 'gray', true);
    return false;
  }
  var uIdx = (ctx && Array.isArray(ctx.chat) && ctx.chat.length) ? (ctx.chat.length - 1) : -1;
  var uMsg = uIdx >= 0 ? ctx.chat[uIdx] : null;
  var uKey = uMsg ? ('u' + uIdx + '|' + String(uMsg.send_date || '')) : 'u-tt';
  var gU = resumeGate('pvp', uKey);
  if (!gU.ok) { banner('♻️ ' + pvpWhy(gU.why), 'warn'); return false; }
  var trig = pvpUserRetryTrigger(ctx);
  if (!trig) {
    banner('♻️ 没有找到重发入口（末条非 AI 消息），请手动点酒馆发送或重生成', 'gray', true);
    return false;
  }
  var S = resumeSlot('pvp');
  S.count = 1; S.at = nowMs(); S.total++;
  RS.turnOwner = 'pvp'; RS.turnKey = uKey; RS.turnAt = nowMs();
  JL.selfAt = nowMs(); JL.selfPending = true;
  pvpNote(0, '手动重发');
  PVP.try++;
  banner('♻️ 末条为用户消息，正在原位重发生成…', 'ok');
  try {
    var r = trig.fn();
    if (r && typeof r['catch'] === 'function') {
      r['catch'](function (e) {
        banner('♻️ 重发出错：' + String((e && e.message) || e).slice(0, 60), 'warn');
      });
    }
  } catch (eF2) {
    banner('♻️ 重发调用失败：' + String((eF2 && eF2.message) || eF2).slice(0, 60), 'warn');
    return false;
  }
  return true;
}

function pvpNowAction() {
  return pvpManualRetry();
}

