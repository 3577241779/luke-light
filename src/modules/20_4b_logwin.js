/* ===== 4b_logwin.js ===== */
/* 4b_logwin.js — S4b 独立日志窗口
 *
 * 和主面板的关系：同一份数据（readLog / LIVE），不同的 root 和生命周期。
 * 主面板只管面板，日志窗口只管日志；关一个不影响另一个（审查报告 S3 那类
 * 「关说明窗顺手把报告卡也清了」的串状态问题，不在这里重犯）。
 */

var LOGWIN_ID = 'ar6-logwin';
var LOGWIN_STYLE_ID = 'ar6-logwin-style';
var LOGWIN_Z = 2147483500;
var LOGW = { open: false, filter: 'all', bound: false };
var LW_DRAG = null;
var LW_FILTER_AT = 0, LW_FILTER_V = '';

var LOGW_CSS = [
  '#ar6-logwin{position:fixed;left:auto;top:auto;z-index:' + LOGWIN_Z + ';width:348px;max-width:calc(100vw - 16px);',
  'max-height:min(560px,calc(100vh - 24px));box-sizing:border-box;display:flex;flex-direction:column;',
  'background:linear-gradient(180deg,#0F182B 0%,#080D18 100%);color:#F0F9FF;border:1.5px solid rgba(148,163,184,.42);border-radius:14px;',
  'box-shadow:0 0 0 1px rgba(56,189,248,.14),0 18px 50px rgba(2,6,23,.78);',
  'font:12.5px/1.45 -apple-system,"Microsoft YaHei",system-ui,sans-serif;',
  'padding:0;overflow:hidden;animation:ar6-fade .14s linear;}',
  '#ar6-logwin .ar6-lwp{display:flex;flex-direction:column;min-height:0;flex:1 1 auto;overflow:hidden;}',
  '#ar6-logwin .ar6-lwh{display:flex;align-items:center;gap:8px;padding:8px 10px;cursor:grab;',
  'background:linear-gradient(95deg,rgba(14,165,233,.18) 0%,rgba(22,32,50,.88) 55%,rgba(15,24,43,.96) 100%);border-bottom:1px solid rgba(148,163,184,.28);}',
  '#ar6-logwin .ar6-lwh:active{cursor:grabbing;}',
  '#ar6-logwin .ar6-lwt{font-weight:700;letter-spacing:.02em;color:#F8FAFC;}',
  '#ar6-logwin .ar6-lwstate{font-size:11px;color:#94A3B8;flex:1 1 auto;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}',
  '#ar6-logwin .ar6-lwx{flex:0 0 auto;width:28px;height:28px;line-height:1;border-radius:7px;border:1px solid rgba(148,163,184,.36);',
  'background:#162032;color:#CBD5E1;cursor:pointer;font-size:13px;touch-action:manipulation;}',
  '#ar6-logwin .ar6-lwx:hover{border-color:#38BDF8;color:#F0F9FF;background:#0C2D48;}',
  '#ar6-logwin .ar6-lwlive{padding:8px 10px;border-bottom:1px solid rgba(148,163,184,.22);background:rgba(8,13,24,.72);}',
  '#ar6-logwin .ar6-lwtag{display:inline-block;font-size:11px;padding:1px 7px;border-radius:999px;margin-right:6px;}',
  '#ar6-logwin .ar6-lwtag.live{color:#7DD3FC;background:rgba(56,189,248,.16);border:1px solid rgba(56,189,248,.5);}',
  '#ar6-logwin .ar6-lwtag.gray{color:#94A3B8;background:#162032;border:1px solid rgba(148,163,184,.32);}',
  '#ar6-logwin .ar6-lwsrc{font-size:11px;color:#94A3B8;}',
  '#ar6-logwin .ar6-lwroute{display:flex;align-items:center;flex-wrap:wrap;gap:5px;margin-top:6px;padding:4px 7px;border-radius:7px;background:#111B2E;border:1px solid rgba(148,163,184,.24);font-size:11px;color:#CBD5E1;}',
  '#ar6-logwin .ar6-lwroute.ok{border-color:rgba(56,189,248,.42);color:#BAE6FD;}',
  '#ar6-logwin .ar6-lwroute.bad{border-color:rgba(244,63,94,.65);background:rgba(136,19,55,.26);color:#FDA4AF;}',
  '#ar6-logwin .ar6-lwroute.warn{border-color:rgba(245,158,11,.6);background:rgba(120,53,15,.26);color:#FDE68A;}',
  '#ar6-logwin .ar6-lwrbdg{font-size:10px;font-weight:700;padding:1px 5px;border-radius:4px;background:rgba(56,189,248,.18);color:#7DD3FC;}',
  '#ar6-logwin .ar6-lwrm{flex:1 1 auto;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}',
  '#ar6-logwin .ar6-lwrwarn{font-size:10px;font-weight:700;padding:1px 5px;border-radius:4px;background:rgba(245,158,11,.22);color:#FCD34D;}',
  '#ar6-logwin .ar6-lwk{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:5px 6px;margin-top:7px;}',
  '#ar6-logwin .ar6-lwcell{background:#162032;border:1px solid rgba(148,163,184,.24);border-radius:7px;padding:4px 5px;',
  'font-size:10px;color:#94A3B8;text-align:center;font-variant-numeric:tabular-nums;}',
  '#ar6-logwin .ar6-lwcell b{display:block;font-size:13.5px;color:#F0F9FF;font-variant-numeric:tabular-nums;}',
  '#ar6-logwin .ar6-lwcell i{display:block;font-style:normal;font-size:9.5px;color:#7DD3FC;margin-top:1px;}',
  '#ar6-logwin .ar6-lwf{display:flex;gap:6px;padding:7px 10px;border-bottom:1px solid rgba(148,163,184,.22);background:#0B1220;}',
  '#ar6-logwin .ar6-lwfr{display:inline-flex;align-items:center;gap:5px;font-size:11.5px;color:#CBD5E1;',
  'padding:3px 8px;border:1px solid rgba(148,163,184,.32);border-radius:999px;cursor:pointer;background:#162032;touch-action:manipulation;}',
  '#ar6-logwin .ar6-lwfr input[type=radio]{margin:0;accent-color:#38BDF8;width:12px;height:12px;cursor:pointer;}',
  '#ar6-logwin .ar6-lwfr.on{border-color:#38BDF8;color:#F0F9FF;background:#0C2D48;}',
  '#ar6-logwin .ar6-lwfr:has(input:checked){border-color:#38BDF8;color:#F0F9FF;background:#0C2D48;}',
  '#ar6-logwin .ar6-lwfr input:focus-visible{outline:2px solid #38BDF8;outline-offset:2px;}',
  '#ar6-logwin .ar6-lwl{flex:1 1 auto;overflow-y:auto;overflow-x:hidden;-webkit-overflow-scrolling:touch;padding:8px 8px 4px;}',
  '#ar6-logwin .ar6-lwc{display:flex;flex-direction:column;gap:3px;width:100%;box-sizing:border-box;',
  'text-align:left;padding:8px 9px;margin-bottom:6px;border-radius:10px;border:1px solid rgba(148,163,184,.28);',
  'background:#162032;color:#F0F9FF;cursor:pointer;font:inherit;font-variant-numeric:tabular-nums;touch-action:manipulation;}',
  '#ar6-logwin .ar6-lwc:hover{border-color:#38BDF8;background:#0C2D48;}',
  '#ar6-logwin .ar6-lwc:focus-visible{outline:2px solid #38BDF8;outline-offset:2px;}',
  '#ar6-logwin .ar6-lwch{display:flex;align-items:center;justify-content:space-between;gap:8px;}',
  '#ar6-logwin .ar6-lwt2{font-size:11px;color:#94A3B8;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}',
  '#ar6-logwin .ar6-lwcb{flex:0 0 auto;font-size:11px;font-weight:700;}',
  '#ar6-logwin .ar6-lwd{font-size:12px;color:#E2E8F0;overflow-wrap:anywhere;line-height:1.35;}',
  '#ar6-logwin .ar6-lwm{font-size:11px;color:#94A3B8;font-variant-numeric:tabular-nums;}',
  '#ar6-logwin .ar6-lwe{font-size:11.5px;color:#94A3B8;padding:6px 4px 10px;line-height:1.6;}',
  '#ar6-logwin .ar6-lwn{flex:0 0 auto;display:flex;align-items:center;justify-content:space-between;gap:6px;',
  'padding:6px 10px calc(6px + env(safe-area-inset-bottom,0px));border-top:1px solid rgba(148,163,184,.22);',
  'font-size:11px;color:#94A3B8;background:#0B1220;font-variant-numeric:tabular-nums;}',
  '#ar6-logwin .ar6-lwsalv{flex:0 0 auto;padding:3px 9px;border-radius:7px;border:1px solid rgba(56,189,248,.48);',
  'background:rgba(14,116,144,.22);color:#E0F2FE;font-size:11px;font-weight:700;cursor:pointer;line-height:1.35;}',
  '#ar6-logwin .ar6-lwsalv:hover{border-color:#38BDF8;background:rgba(2,132,199,.36);color:#FFF;}',
  '@media (max-width:767px){#ar6-logwin{width:calc(100vw - 16px);max-height:72vh;border-radius:14px;}}',
  '@media (prefers-reduced-motion:reduce){#ar6-logwin{animation:none;}}',
  '#ar6-root .ar6-lwbtn{margin-left:auto;}',
  '#ar6-root .ar6-lwbtn.on{color:#F0F9FF;border-color:#38BDF8;background:#0C2D48;}'
].join(String.fromCharCode(10));

/* v3.1.2：贴边收纳后留在屏幕边缘的把手。
   旧版点了「贴边收纳」整块面板就 display:none，边缘什么都没有，只能再去找工具栏按钮；
   有了这个把手，点它就能把面板点回来（data-ar6="dock-open"）。 */
var AR6_DOCK_CSS = [
  '#ar6-root .ar6-dock{position:fixed;right:0;top:50%;transform:translateY(-50%);',
  'display:flex;align-items:center;justify-content:center;width:30px;height:64px;padding:0;',
  'border:1.5px solid #38bdf8;border-right:0;border-radius:14px 0 0 14px;',
  'background:linear-gradient(145deg,#162238,#0b1120);color:#7dd3fc;font-size:15px;line-height:1;',
  'box-shadow:-6px 0 18px rgba(0,0,0,.35);cursor:pointer;pointer-events:auto;z-index:2147483003;',
  'touch-action:none;cursor:grab;user-select:none;-webkit-user-select:none;-webkit-tap-highlight-color:transparent;}',
  '#ar6-root .ar6-dock:hover{background:linear-gradient(145deg,#2a323d,#171c23);border-color:rgba(227,180,92,.8);}',
  '#ar6-root .ar6-dock:focus-visible{outline:2px solid #e3b45c;outline-offset:2px;}',
  '#ar6-root .ar6-dock[data-drag="1"]{cursor:grabbing;opacity:.94;transition:none;}',
  '#ar6-root .ar6-dock[data-side="left"]{left:0;right:auto;border-radius:0 12px 12px 0;border:1px solid rgba(227,180,92,.55);border-left:0;box-shadow:6px 0 18px rgba(0,0,0,.35);}'
].join(String.fromCharCode(10));

function logWinRoot() {
  try { return DOC ? DOC.getElementById(LOGWIN_ID) : null; } catch (e) { return null; }
}

function logFilterOf(r) {
  var c = String((r && r.code) || 'other');
  if (c === 'same') return 'ok';
  if (c === 'diff' || c === 'thin' || c === 'suspect' || c === 'unknown') return 'bad';
  return 'err';
}

function logFilterHTML() {
  var fs = [['all', '全部'], ['bad', '可疑'], ['ok', '一致'], ['err', '其它']];
  var h = '<div class="ar6-lwf" role="radiogroup" aria-label="日志筛选">';
  for (var i = 0; i < fs.length; i++) {
    var fOn = (LOGW.filter === fs[i][0]);
    h += '<label class="ar6-lwfr' + (fOn ? ' on' : '') + '"><input type="radio" name="ar6-logf" value="' + fs[i][0] + '" data-ar6="logf"' +
      (fOn ? ' checked' : '') + '><span>' + esc(fs[i][1]) + '</span></label>';
  }
  return h + '</div>';
}

function logRecCardHTML(r, i) {
  var v = { t: '—', c: '#8b949e' };
  try { v = cardHumanVerdict(r); } catch (e) {}
  var code = '';
  try { code = cardCodeLabel(r && r.code); } catch (e2) { code = String((r && r.code) || ''); }
  var hh = '';
  try {
    var at = new Date(Number(r && r.at) || 0);
    hh = ('0' + at.getHours()).slice(-2) + ':' + ('0' + at.getMinutes()).slice(-2) + ':' + ('0' + at.getSeconds()).slice(-2);
  } catch (e3) {}
  var cp = reportCapture(r);
  var secs = cp.totalMs == null ? null : Math.round(Number(cp.totalMs) / 100) / 10;
  var chars = reportValue(cp.bodyChars);
  var think = cp.thinkChars;
  var edits = Number(r && r.edits) || 0;
  var added = Number(r && r.added) || 0;
  var fpTag = '';
  try {
    var g0 = r && r.fpGrade ? String(r.fpGrade) : '';
    var ch0 = r && r.ch && r.ch.code ? String(r.ch.code) : '';
    var wl0 = (r && r.ch && r.ch.hash && typeof lkMatchPubWhitelist === 'function') ? lkMatchPubWhitelist(r.ch.hash) : null;
    if (g0 || ch0) fpTag = ' · ' + (wl0 ? ('公益站:' + wl0.label) : ch0) + (g0 ? ((ch0 ? '/' : '') + g0) : '');
  } catch (eFpTag) {}
  var meta = (secs == null ? '未知' : secs + 's') + ' · ' + chars + ' 字' + (think ? ' · 思考 ' + think : '') +
    fpTag +
    (edits || added ? ' · 注入 +' + added + '/改' + edits : '');
  return '<button class="ar6-lwc" data-ar6="lwcard" data-i="' + i + '">' +
    '<span class="ar6-lwch"><span class="ar6-lwt2">' + esc(hh) + ' · ' + esc(String(code)) + '</span>' +
    '<span class="ar6-lwcb" style="color:' + v.c + '">' + esc(String(v.t)) + '</span></span>' +
    '<span class="ar6-lwd">' + esc(String((r && r.req) || '')) + ' → ' + esc(String((r && r.obs) || '未知')) + '</span>' +
    '<span class="ar6-lwm">' + esc(meta) + '</span>' +
    (r && r.routeHit ? '<span class="ar6-lwm" style="color:#e3b341">服务模型：' +
      esc(String(r.served || '?')) + '（和请求里的对不上）</span>' : '') +
    '</button>';
}

function logListHTML() {
  var log = readLog() || [];
  if (!log.length) return '<div class="ar6-lwe">还没有记录。跑一轮对话，这里会多一张卡；点卡片能看证据与原文。</div>';
  var out = '', n = 0;
  for (var i = 0; i < log.length && n < 60; i++) {
    if (LOGW.filter !== 'all' && logFilterOf(log[i]) !== LOGW.filter) continue;
    out += logRecCardHTML(log[i], i);
    n++;
  }
  if (!n) return '<div class="ar6-lwe">这个筛选下没有记录。</div>';
  return out;
}

function logFootHTML() {
  var log = readLog() || [];
  var hasRaw = !!(typeof LK_LAST_RAW !== 'undefined' && LK_LAST_RAW && LK_LAST_RAW.bytes > 0);
  var salvLbl = (typeof sk === 'function') ? sk('actSalvage', '抢救上次') : '抢救上次';
  return '<span>共 ' + log.length + ' / ' + MAX_LOG + ' 条</span>' +
    '<button type="button" class="ar6-lwsalv" data-ar6="lwsalvage" title="从 4MB 原始流缓存一键抢救上次未落盘正文">' +
    '🛟 ' + esc(salvLbl) + (hasRaw ? ' (' + Math.max(1, Math.round(LK_LAST_RAW.bytes / 1024)) + 'K)' : '') + '</button>';
}

function liveLineHTML() {
  var s = null;
  try { s = liveSnapshot(); } catch (e) { s = null; }
  if (!s) return '<div class="ar6-lwlive" data-ar6-lwlive="1"></div>';
  var running = !!s.on;
  var src = s.src || { tok: 0, peek: 0, poll: 0 };
  var tag = running
    ? '<span class="ar6-lwtag live">' + esc(s.tierText) + '</span>'
    : '<span class="ar6-lwtag gray">' + (s.totalMs ? '上一轮' : '待命') + '</span>';
  if (!running && !s.totalMs) {
    return '<div class="ar6-lwlive" data-ar6-lwlive="1">' + tag +
      '<span class="ar6-lwsrc">还没有采样</span>' +
      '<div class="ar6-lwe">发一轮对话，这里会实时显示首字、字数、静默与注入开销。' +
      (cfg.safe ? '（安全模式下不采样）' : '') + '</div></div>';
  }
  var secs = Math.round(s.totalMs / 100) / 10;
  var ttc = s.ttcMs ? Math.round(s.ttcMs / 100) / 10 : 0;
  var ttt = s.tttMs ? Math.round(s.tttMs / 100) / 10 : 0;
  var ttft = s.ttftMs ? Math.round(s.ttftMs / 100) / 10 : 0;
  var firstDisp = ttc ? (ttc + 's') : (ttt ? ('思' + ttt + 's') : (ttft ? (ttft + 's') : '—'));
  var idle = Math.round(Math.max(s.idleByteMs || 0, s.idleContentMs || 0) / 100) / 10;
  var kb = Math.round((s.bytes || 0) / 102.4) / 10;
  var plan = s.plan || {};
  var bodySub = s.toolBody ? '工具流' : '';
  var thinkSub = s.thinkTokens ? (s.thinkTokens + ' tok') : (s.zeroThinkWarn ? '零思考预警' : '');
  var cells = [
    ['总耗时', secs + 's', ''],
    ['首字', firstDisp, ttc ? '正文首字' : (ttt ? '思考首字' : '')],
    ['正文', String(s.bodyChars || 0), bodySub],
    ['思考', String(s.thinkChars || 0), thinkSub],
    ['字/秒', String(s.ema || s.cps || 0), ''],
    ['静默', idle + 's', ''],
    ['字节', kb + 'K', ''],
    ['卡顿', String(s.stalls || 0), ''],
    ['注入', '+' + (plan.added || 0) + ' 改' + (plan.edits || 0) + ' · ' + (plan.ms || 0) + 'ms', '']
  ];
  var reqShort = s.reqModel ? (typeof shortName === 'function' ? shortName(s.reqModel) : s.reqModel) : '待识别';
  var srvShort = s.servedModel ? (typeof shortName === 'function' ? shortName(s.servedModel) : s.servedModel) : '等待回传';
  var routeCls = s.modelMismatch ? 'bad' : (s.zeroThinkWarn ? 'warn' : (s.servedModel ? 'ok' : ''));
  var routeVerdict = s.modelMismatch ? '疑似路由/换芯' : (s.zeroThinkWarn ? '零思考异常' : (s.servedModel ? '模型一致' : ''));
  var routeBar = '<div class="ar6-lwroute' + (routeCls ? ' ' + routeCls : '') + '">' +
    '<span class="ar6-lwrbdg">' + esc(s.trafficLabel || '正文') + '</span>' +
    '<span class="ar6-lwrm" title="' + esc(String(s.reqModel || '') + ' → ' + String(s.servedModel || '')) + '">' +
      esc(reqShort + ' → ' + srvShort) + '</span>' +
    (routeVerdict ? '<span class="ar6-lwrwarn">' + esc(routeVerdict) + '</span>' : '') +
    '</div>';
  var skipTxt = (typeof DET !== 'undefined' && DET && DET.pluginSkip) ? (' · 放行插件 ' + DET.pluginSkip) : '';
  var h = '<div class="ar6-lwlive" data-ar6-lwlive="1">' + tag +
    '<span class="ar6-lwsrc">' + (s.structActive ? '结构流' : '事件') + ' ' + (src.tok || 0) + ' · 旁观 ' + (src.peek || 0) + ' · 轮询 ' + (src.poll || 0) + esc(skipTxt) + '</span>' +
    routeBar;
  h += '<div class="ar6-lwk">';
  for (var i = 0; i < cells.length; i++) {
    h += '<span class="ar6-lwcell"><b>' + esc(cells[i][1]) + '</b>' + esc(cells[i][0]) +
      (cells[i][2] ? '<i>' + esc(cells[i][2]) + '</i>' : '') + '</span>';
  }
  return h + '</div></div>';
}

function logWinHTML() {
  return '<div class="ar6-lwp" role="dialog" aria-label="运行日志">' +
    '<div class="ar6-lwh">' +
      '<span class="ar6-lwt">运行日志</span>' +
      '<span class="ar6-lwstate" data-ar6-lwstate="1"></span>' +
      '<button class="ar6-lwx" data-ar6="lwclose" aria-label="关闭日志窗口" title="关闭">✕</button>' +
    '</div>' +
    liveLineHTML() +
    logFilterHTML() +
    '<div class="ar6-lwl" data-ar6-lwlist="1">' + logListHTML() + '</div>' +
    '<div class="ar6-lwn" data-ar6-lwfoot="1">' + logFootHTML() + '</div>' +
    '</div>';
}

function lwStateText() {
  try {
    if (LIVE && LIVE.on) return '采样中 · ' + LIVE.tier;
    if (LIVE && LIVE.last) return '待命 · 上轮 ' + (Math.round((LIVE.last.totalMs || 0) / 100) / 10) + 's';
  } catch (e) {}
  return '待命';
}

function lwApplyPos(node) {
  try {
    if (!node) return;
    var vw = (HOST.visualViewport && HOST.visualViewport.width) || HOST.innerWidth || 360;
    var vh = (HOST.visualViewport && HOST.visualViewport.height) || HOST.innerHeight || 640;
    node.removeAttribute('data-full');
    node.style.borderRadius = '14px';
    if (uiMode() === 'mobile' || vw < 768) {
      node.style.width = 'calc(100vw - 16px)';
      node.style.maxHeight = '72vh';
      node.style.left = '8px';
      node.style.top = Math.max(20, Math.round(vh * 0.22)) + 'px';
      return;
    }
    node.style.width = '';
    node.style.maxHeight = '';
    var w = node.offsetWidth || 348, h = node.offsetHeight || 380;
    var x = (cfg.logX == null) ? Math.max(8, vw - w - 14) : Number(cfg.logX);
    var y = (cfg.logY == null) ? Math.max(8, Math.min(64, vh - h - 8)) : Number(cfg.logY);
    if (!isFinite(x)) x = Math.max(8, vw - w - 14);
    if (!isFinite(y)) y = 64;
    x = Math.min(Math.max(6, x), Math.max(6, vw - w - 6));
    y = Math.min(Math.max(6, y), Math.max(6, vh - Math.min(h, vh - 12) - 6));
    node.style.left = Math.round(x) + 'px';
    node.style.top = Math.round(y) + 'px';
  } catch (e) {}
}

function lwSyncState() {
  try {
    var node = logWinRoot();
    if (!node) return;
    var st = node.querySelector('[data-ar6-lwstate]');
    if (st) st.textContent = lwStateText();
  } catch (e) {}
}

function paintLogWin(full) {
  try {
    if (DISPOSED || !DOC || !DOC.body) return false;
    if (!LOGW.open) return false;
    ensureStyle(DOC);
    var node = logWinRoot();
    if (!node) {
      node = DOC.createElement('div');
      node.id = LOGWIN_ID;
      node.setAttribute('data-ar6-lw', '1');
      try { node.addEventListener('click', onLogWinClick, false); } catch (e1) {}
      try { node.addEventListener('change', onLogWinChange, false); } catch (e2) {}
      try { node.addEventListener('pointerdown', onLogWinDown, true); } catch (e3) {}
      try { node.addEventListener('dblclick', onLogWinDbl, false); } catch (e4) {}
      DOC.body.appendChild(node);
    }
    LOGW.bound = true;
    try {
      var lwSk = (typeof skinId === 'function') ? skinId() : 'ultra';
      if (typeof ar6SetAttrIfDiff === 'function') ar6SetAttrIfDiff(node, 'data-skin', lwSk);
      else if (node.getAttribute('data-skin') !== lwSk) node.setAttribute('data-skin', lwSk);
    } catch (eSkLw) {}
    var keepScroll = 0;
    try { var lw = node.querySelector('.ar6-lwl'); if (lw) keepScroll = lw.scrollTop || 0; } catch (e5) {}
    node.innerHTML = logWinHTML();
    lwApplyPos(node);
    try { var lw2 = node.querySelector('.ar6-lwl'); if (lw2 && keepScroll > 0) lw2.scrollTop = keepScroll; } catch (e6) {}
    lwSyncState();
    return true;
  } catch (e) { return false; }
}

/* 只刷「实时那段」：不重建列表，不抢滚动条、不抢焦点 */
function paintLogWinLive() {
  try {
    if (!LOGW.open) return false;
    var node = logWinRoot();
    if (!node) return false;
    var box = node.querySelector('[data-ar6-lwlive]');
    var parent = box && box.parentNode;
    if (box) box.innerHTML = '';
    var fresh = liveLineHTML();
    if (box && parent) {
      var wrap = DOC.createElement('div');
      wrap.innerHTML = fresh;
      while (wrap.firstChild) parent.insertBefore(wrap.firstChild, box);
      if (box.parentNode === parent) parent.removeChild(box);
    }
    lwSyncState();
    return true;
  } catch (e) { return false; }
}

function syncLogBtn() {
  try {
    if (typeof patchRole === 'function') patchRole();
  } catch (e) {}
}

function syncLogWin() {
  try {
    if (DISPOSED) return false;
    if (cfg.logWin && !LOGW.open) return openLogWin(true);
    if (!cfg.logWin && LOGW.open) return closeLogWin(true);
  } catch (e) {}
  return false;
}

function openLogWin(quiet) {
  try {
    if (DISPOSED || !DOC || !DOC.body) return false;
    LOGW.open = true;
    if (!quiet) { cfg.logWin = true; saveCfg(); }
    paintLogWin(true);
    syncLogBtn();
    return true;
  } catch (e) { return false; }
}

function closeLogWin(quiet) {
  try {
    LOGW.open = false;
    if (!quiet) { cfg.logWin = false; saveCfg(); }
    var node = logWinRoot();
    if (node && node.parentNode) node.parentNode.removeChild(node);
    syncLogBtn();
    return true;
  } catch (e) { return false; }
}

function toggleLogWin() {
  return LOGW.open ? closeLogWin(false) : openLogWin(false);
}

function onLogWinClick(e) {
  try {
    var t = e && e.target;
    if (!t || !t.closest) return;
    var b = t.closest('[data-ar6]');
    if (!b) return;
    var act = b.getAttribute('data-ar6') || '';
    if (act === 'lwclose') { closeLogWin(false); return; }
    if (act === 'lwsalvage') {
      if (typeof lkSalvageLastRaw === 'function') lkSalvageLastRaw(true);
      return;
    }
    if (act === 'lwcard') {
      var i = Number(b.getAttribute('data-i'));
      var log = readLog() || [];
      if (isFinite(i) && log[i]) openCard(log[i], 'human');
      return;
    }
  } catch (e2) {}
}

function onLogWinChange(e) {
  try {
    var t = e && e.target;
    if (!t || !t.closest) return;
    var inp = t.closest('input[type=radio]');
    if (!inp) return;
    var v = String(inp.value || 'all');
    var now = nowMs();
    /* 300ms 去重令牌：宿主偶尔把一次点按连发两次 change */
    if (v === LW_FILTER_V && now - LW_FILTER_AT < 300) return;
    LW_FILTER_V = v;
    LW_FILTER_AT = now;
    if (LOGW.filter === v) return;
    LOGW.filter = v;
    paintLogWin(true);
    /* 重绘换了节点：把焦点还给同一档，键盘继续能走 */
    try {
      var node = logWinRoot();
      var again = node && node.querySelector('input[type=radio][value="' + v + '"]');
      if (again && again.focus) again.focus();
    } catch (eF) {}
  } catch (e) {}
}

function onLogWinDown(e) {
  try {
    if (uiMode() === 'mobile') return;
    var t = e && e.target;
    if (!t || !t.closest) return;
    var head = t.closest('.ar6-lwh');
    if (!head) return;
    if (t.closest('button,input,label,a')) return;
    var node = logWinRoot();
    if (!node) return;
    LW_DRAG = {
      node: node, sx: e.clientX || 0, sy: e.clientY || 0,
      ox: node.offsetLeft || 0, oy: node.offsetTop || 0, moved: false
    };
    try { if (node.setPointerCapture && e.pointerId != null) node.setPointerCapture(e.pointerId); } catch (eC) {}
    try { DOC.addEventListener('pointermove', onLogWinMove, true); } catch (eM) {}
    try { DOC.addEventListener('pointerup', onLogWinUp, true); } catch (eU) {}
  } catch (e) {}
}

function onLogWinMove(e) {
  try {
    if (!LW_DRAG) return;
    var node = LW_DRAG.node;
    var vw = (HOST.visualViewport && HOST.visualViewport.width) || HOST.innerWidth || 360;
    var vh = (HOST.visualViewport && HOST.visualViewport.height) || HOST.innerHeight || 640;
    var w = node.offsetWidth || 344, h = node.offsetHeight || 380;
    var nx = LW_DRAG.ox + ((e.clientX || 0) - LW_DRAG.sx);
    var ny = LW_DRAG.oy + ((e.clientY || 0) - LW_DRAG.sy);
    nx = Math.min(Math.max(6, nx), Math.max(6, vw - w - 6));
    ny = Math.min(Math.max(6, ny), Math.max(6, vh - Math.min(h, vh - 12) - 6));
    node.style.left = Math.round(nx) + 'px';
    node.style.top = Math.round(ny) + 'px';
    LW_DRAG.moved = true;
    try { e.preventDefault(); } catch (eP) {}
  } catch (e) {}
}

function onLogWinUp() {
  try {
    try { DOC.removeEventListener('pointermove', onLogWinMove, true); } catch (e1) {}
    try { DOC.removeEventListener('pointerup', onLogWinUp, true); } catch (e2) {}
    if (LW_DRAG && LW_DRAG.moved) {
      var node = LW_DRAG.node;
      cfg.logX = node.offsetLeft || 0;
      cfg.logY = node.offsetTop || 0;
      saveCfg();
    }
  } catch (e) {}
  LW_DRAG = null;
}

function onLogWinDbl(e) {
  try {
    var t = e && e.target;
    if (!t || !t.closest) return;
    if (!t.closest('.ar6-lwh')) return;
    if (t.closest('button,input,label,a')) return;
    cfg.logX = null;
    cfg.logY = null;
    saveCfg();
    lwApplyPos(logWinRoot());
  } catch (e) {}
}

function logWinDispose() {
  try {
    try { DOC.removeEventListener('pointermove', onLogWinMove, true); } catch (e1) {}
    try { DOC.removeEventListener('pointerup', onLogWinUp, true); } catch (e2) {}
    LW_DRAG = null;
    var node = logWinRoot();
    if (node && node.parentNode) node.parentNode.removeChild(node);
    LOGW.open = false;
    LOGW.bound = false;
  } catch (e) {}
}


function verifyVisible() {
  try {
    if (minimized) return;   /* 关闭态不检查：0×0 是正常的 */
    var el = DOC && DOC.getElementById(ROOT_ID);
    if (!el) return;
    var b = el.getBoundingClientRect();
    /* 0×0 / 被挪到屏幕外：重建整条 style（弹窗没有位置记忆，重建就是复位） */
    if (!b || b.width < 12 || b.height < 12 || b.top < -5000 || b.left < -5000) {
      var mode = uiMode();
      el.setAttribute('style', panelStyle(mode, false));
      el.style.zIndex = '2147483000';
      if (el.parentNode !== DOC.body) DOC.body.appendChild(el);
      if (HOST.console) HOST.console.warn('[AR6] 面板位置异常，已复位');
    }
    try { fitPanel(el); } catch (eFB) {}
  } catch (e) {}
}

/* v8.30：一行体检。手机上「只有上半截」时先看这个——
   css.h 有没有写死成 px、body 的 clientHeight/scrollHeight 是否分离、面板底边(fit)有没有超出可视区。 */
/* 复制必须看 promise：clipboard 被拒时旧代码照样报「已复制」。 */
function copyToFallback(body, label) {
  try {
    if (DOC && DOC.body) {
      var ta = DOC.createElement('textarea');
      ta.value = body;
      ta.setAttribute('readonly', 'readonly');
      ta.style.cssText = 'position:fixed;left:-9999px;top:0;font-size:16px;opacity:0;';
      DOC.body.appendChild(ta);
      try { ta.focus(); } catch (eFc) {}
      ta.select();
      try { ta.setSelectionRange(0, body.length); } catch (eSel) {}
      var ok = false;
      try { ok = !!DOC.execCommand('copy'); } catch (eEx) { ok = false; }
      DOC.body.removeChild(ta);
      if (ok) {
        banner(label + ' 已复制（' + body.length + ' 字）', 'ok');
        return true;
      }
    }
  } catch (eFb) {}
  banner(label + ' 复制受限，已打印到控制台（也可在诊断报告页手动长按复制）', 'warn', true);
  try { HOST.console.log(body); } catch (e3) {}
  return false;
}

function copyTo(txt, label) {
  var body = String(txt == null ? '' : txt);
  try {
    var nav = HOST.navigator;
    if (nav && nav.clipboard && nav.clipboard.writeText) {
      nav.clipboard.writeText(body).then(function () {
        banner(label + ' 已复制（' + body.length + ' 字）', 'ok');
      }, function () {
        copyToFallback(body, label);
      });
      return;
    }
  } catch (e) {}
  copyToFallback(body, label);
}

function ar6Diag() {
  try {
    var el = DOC && DOC.getElementById(ROOT_ID);
    if (!el) return 'no-panel';
    var b = el.getBoundingClientRect();
    var body = el.querySelector ? el.querySelector('.ar6-body') : null;
    var hd = el.querySelector ? el.querySelector('.ar6-h') : null;
    var vv = (HOST.visualViewport && HOST.visualViewport.height) || HOST.innerHeight || 0;
    var cs = (HOST.getComputedStyle ? HOST.getComputedStyle(el) : null);
    var bcs = (body && HOST.getComputedStyle ? HOST.getComputedStyle(body) : null);
    return 'v=' + VERSION + '|mode=' + uiMode() + '|min=' + (minimized ? 1 : 0) +
      '|rect=' + Math.round(b.left) + ',' + Math.round(b.top) + ',' + Math.round(b.width) + 'x' + Math.round(b.height) +
      '|css.h=' + (cs ? cs.height : '?') + '|css.maxH=' + (cs ? cs.maxHeight : '?') + '|css.ov=' + (cs ? cs.overflow : '?') +
      '|body=' + (body ? body.clientHeight + '/' + body.scrollHeight + '@' + (body.scrollTop || 0) : 'none') +
      '|bodytf=' + (function () { try {
        var bcs2 = (HOST.getComputedStyle ? HOST.getComputedStyle(DOC.body) : null);
        if (!bcs2) return '-';
        return (bcs2.transform || 'none') + ',' + (bcs2.filter || 'none') + ',' +
          (bcs2.willChange || 'auto') + ',' + (bcs2.contain || 'none');
      } catch (e) { return 'err'; } })() +
      '|basis=' + (bcs ? bcs.flexBasis : '?') +
      '|head=' + (hd ? hd.offsetHeight : '?') +
      '|vh=' + (HOST.innerHeight || 0) + '|vv=' + Math.round(vv) +
      '|fit=' + (vv && b.bottom <= vv + 2 ? 'yes' : 'NO');
  } catch (e) { return 'err:' + (e && e.message ? e.message : e); }
}


function profileLabel() {
  if (cfg.refract === 'light') return '轻';
  if (cfg.refract === 'mid') return '中';
  if (cfg.refract === 'heavy') return '强';
  return '关';
}

function stateOfRun() {
  var s = { kind: 'gray', short: '待命', line: '等待第一轮生成…' };
  if (!cfg.enabled) { s.kind = 'gray'; s.short = '已关'; s.line = '防护已关闭（请求原样透传）'; return s; }
  var alertBad = false;
  try { alertBad = (typeof pillHasAlert === 'function') && pillHasAlert(); } catch (eA) { alertBad = false; }
  s.kind = alertBad ? 'bad' : 'ok';
  s.short = alertBad ? '异动告警' : '防护中';
  s.line = '<b>防护开</b> · 钉参数 ' + (cfg.pin ? '开' : '关') + ' · 微扰 ' + profileLabel() +
    ' · 思考 ' + thinkTag() + ' · 观察 ' + (cfg.observe ? '开' : '关');
  return s;
}



/* ---------------- 事件 ---------------- */

var ACT_GAP = {};

/* ---------------- 反 OOC（v0.76） ---------------- */

/* 子 chip：总闸关、或这一项已经让给预设 → 变灰。
   变灰只是「看着像不能点」，真正的拦截在 oocToggle 里，别把逻辑写在样式上。 */
/* 点一个子 chip：总闸关 → 只提示；已让给预设 → 收回来；否则开关 + 必要时问一次 */
function oocToggle(item) {
  var key = OOC_CFGKEY[item];
  if (!key) return;
  if (String(cfg.ooc || 'off') !== 'on') {
    banner('先点上面的「🎭 反 OOC」把总闸打开，这几个细项才生效', 'warn', true);
    return;
  }
  if (oocChoice(item) === 'preset') {
    oocSetChoice(item, 'script');
    cfg[key] = true;
    try { saveCfg(); } catch (e0) {}
    render();
    banner((OOC_LABEL[item] || item) + '：改回用我们的', 'ok');
    return;
  }
  var next = !oocOnOf(item);
  cfg[key] = next;
  try { saveCfg(); } catch (e1) {}
  render();
  banner((OOC_LABEL[item] || item) + '：' + (next ? '开' : '关'), next ? 'ok' : 'gray');
  if (!next) return;
  /* 刚打开：预设里要是也管了这一项，先问一句用谁的 */
  var ask = [], sig = null;
  try { ask = oocAsk(); } catch (e2) { ask = []; }
  if (ask.indexOf(item) < 0) return;
  try { sig = oocSig(); } catch (e3) { sig = null; }
  if (!sig || !sig.hits || !sig.hits[item]) return;
  var hits = {};
  hits[item] = sig.hits[item];
  oocConflictDialog(hits, function () { try { render(); } catch (e4) {} });
}

/* v0.84 防全知提示：它是唯一会禁止「写内心话 / 替角色做决定」的开关。
   想抢话的人开了它会被绑住，所以开之前说明一次，给个「以后不再提醒」。 */
function knowTipDialog(next) {
  var h = '<style>#ar6-card,#ar6-card *{box-sizing:border-box;min-width:0}</style>';
  h += '<div id="ar6-card" style="' + cardOverlayCss() +
    'z-index:2147483600;background:rgba(4,8,18,.84);font-family:system-ui,-apple-system,\'Microsoft YaHei\',sans-serif">';
  h += '<div style="width:402px;max-width:calc(100vw - 20px);max-height:' + cardBoxMaxH(92) +
    ';overflow-x:hidden;overflow:auto;background:linear-gradient(180deg,#0F182B 0%,#080D18 100%);color:#F0F9FF;border:1.5px solid rgba(148,163,184,.42);' +
    'border-radius:16px;box-shadow:0 16px 52px rgba(2,6,23,.82);padding:16px 16px 13px">';

  h += '<div style="font-size:15px;font-weight:700;margin-bottom:6px;line-height:1.45;color:#F8FAFC">' +
    '开启「绝对结界」前请注意</div>';
  h += '<div style="font-size:12px;color:#CBD5E1;line-height:1.7">' +
    '绝对结界管的是「谁有权知道、谁有权决定」。开启之后：<br>' +
    '· 同步禁止描写任何角色心理活动；<br>' +
    '· 同步禁止代写主角言行与替你做决定。' +
    '</div>';
  h += '<div style="margin-top:10px;padding:9px 11px;border-radius:9px;background:rgba(217,119,6,.14);' +
    'border:1px solid rgba(252,211,77,.38);font-size:12px;color:#FEF3C7;line-height:1.65">' +
    '如果你希望保留细腻的心理活动描写，请选择前两档（「仅知在场事」或「禁跨场推理」），不要选「绝对结界」。' +
    '</div>';

  h += '<div style="display:flex;gap:8px;margin-top:14px">' +
    '<button type="button" class="ar6-b on" data-ar6-card="knowok" style="flex:1;justify-content:center;padding:8px 12px;border-radius:8px;border:1px solid #38BDF8;background:#0C2D48;color:#F0F9FF;cursor:pointer;font-weight:700;touch-action:manipulation">知道了，开启</button>' +
    '<button type="button" class="ar6-b" data-ar6-card="knowno" style="flex:1;justify-content:center;padding:8px 12px;border-radius:8px;border:1px solid rgba(148,163,184,.36);background:#162032;color:#CBD5E1;cursor:pointer;touch-action:manipulation">暂不开启</button>' +
    '</div>';
  h += '<label style="display:flex;gap:7px;align-items:center;margin-top:11px;font-size:11px;' +
    'color:#94A3B8;cursor:pointer;touch-action:manipulation">' +
    '<input type="checkbox" data-ar6-chk="1" style="accent-color:#38BDF8">' +
    '<span>以后不再提醒</span></label>';
  h += '</div></div>';

  var node = null;
  try { node = mountHTML(h); } catch (e) { node = null; }
  if (!node) { cfg.know = next; saveCfg(); render(); return; }
  try { if (typeof CARD === 'object' && CARD) { CARD.open = true; CARD.rid = -1; } } catch (eK0) {}

  node.addEventListener('click', function (ev) {
    if (ev && ev.target === node) {
      try { closeCard(); } catch (eK1) {}
      banner('迷雾结界保持不变：' + narrTag(cfg.know), 'gray');
      return;
    }
    var t = ev && ev.target, btn = null;
    while (t && t !== node) {
      if (t.getAttribute && t.getAttribute('data-ar6-card')) { btn = t; break; }
      t = t.parentNode;
    }
    if (!btn) return;
    var act = btn.getAttribute('data-ar6-card');
    var chk = null;
    try { chk = node.querySelector('[data-ar6-chk="1"]'); } catch (e3) { chk = null; }
    try { closeCard(); } catch (e2) {}
    if (act === 'knowno') {
      banner('迷雾结界保持不变：' + narrTag(cfg.know), 'gray');
      return;
    }
    if (chk && chk.checked) cfg.knowTip = 'off';
    cfg.know = next;
    try { if (typeof prismSyncSynergyGuard === 'function') prismSyncSynergyGuard(); } catch (eSgK) {}
    saveCfg(); render();
    banner('迷雾结界：' + narrTag(cfg.know), cfg.know === 'off' ? 'gray' : 'ok');
  });
}

/* 冲突弹窗：预设里也管了这些项，问一次用谁的。 */
function oocConflictDialog(hits, cb) {
  if (!hits) { if (cb) cb(''); return; }
  var keys = [];
  for (var k in hits) {
    if (Object.prototype.hasOwnProperty.call(hits, k)) keys.push(k);
  }
  if (!keys.length) { if (cb) cb(''); return; }

  var h = '<style>#ar6-card,#ar6-card *{box-sizing:border-box;min-width:0}</style>';
  h += '<div id="ar6-card" style="' + cardOverlayCss() +
    'z-index:2147483600;background:rgba(4,8,18,.84);font-family:system-ui,-apple-system,\'Microsoft YaHei\',sans-serif">';
  h += '<div style="width:402px;max-width:calc(100vw - 20px);max-height:' + cardBoxMaxH(92) +
    ';overflow-x:hidden;overflow:auto;background:linear-gradient(180deg,#0F182B 0%,#080D18 100%);color:#F0F9FF;border:1.5px solid rgba(148,163,184,.42);' +
    'border-radius:16px;box-shadow:0 16px 52px rgba(2,6,23,.82);padding:16px 16px 13px">';

  h += '<div style="font-size:14px;font-weight:700;margin-bottom:4px;color:#F8FAFC">预设里也包含同类护栏（' + keys.length + ' 项）</div>';
  h += '<div style="font-size:11.5px;color:#94A3B8;margin-bottom:10px">避免重复约束互相冲突，请选择保留哪一方：</div>';

  for (var i = 0; i < keys.length; i++) {
    var kk = keys[i];
    h += '<div style="display:flex;gap:8px;align-items:baseline;padding:7px 0;' +
      'border-top:1px solid rgba(148,163,184,.18);font-size:12px">' +
      '<div style="flex:0 0 72px;color:#7DD3FC">' + esc(OOC_LABEL[kk] || kk) + '</div>' +
      '<div style="flex:1;min-width:0;color:#E2E8F0;word-break:break-word">' +
      esc(String(hits[kk] || '')) + '</div></div>';
  }

  h += '<div style="display:flex;gap:8px;margin-top:14px">' +
    '<button type="button" class="ar6-b on" data-ar6-card="ours" style="flex:1;justify-content:center;padding:8px 12px;border-radius:8px;border:1px solid #38BDF8;background:#0C2D48;color:#F0F9FF;cursor:pointer;font-weight:700;touch-action:manipulation">采用光之守护</button>' +
    '<button type="button" class="ar6-b" data-ar6-card="preset" style="flex:1;justify-content:center;padding:8px 12px;border-radius:8px;border:1px solid rgba(148,163,184,.36);background:#162032;color:#CBD5E1;cursor:pointer;touch-action:manipulation">保留预设规则</button>' +
    '</div>';

  h += '<label style="display:flex;gap:7px;align-items:center;margin-top:11px;font-size:11px;' +
    'color:#94A3B8;cursor:pointer;touch-action:manipulation">' +
    '<input type="checkbox" data-ar6-chk="1" style="accent-color:#38BDF8">' +
    '<span>记住此选择，后续不再询问</span></label>';

  h += '</div></div>';

  var node = null;
  try { node = mountHTML(h); } catch (e6) { node = null; }
  if (!node) { if (cb) cb(''); return; }
  try { if (typeof CARD === 'object' && CARD) { CARD.open = true; CARD.rid = -1; } } catch (eO0) {}

  node.addEventListener('click', function (ev) {
    if (ev && ev.target === node) {
      try { closeCard(); } catch (eO1) {}
      if (cb) cb('');
      return;
    }
    var t = ev && ev.target, btn = null;
    while (t && t !== node) {
      if (t.getAttribute && t.getAttribute('data-ar6-card')) { btn = t; break; }
      t = t.parentNode;
    }
    if (!btn) return;
    var act = btn.getAttribute('data-ar6-card');
    var choice = act === 'preset' ? 'preset' : 'script';
    var j, m;
    for (j = 0; j < keys.length; j++) {
      oocSetChoice(keys[j], choice);
      m = OOC_CFGKEY[keys[j]];
      if (m) cfg[m] = choice === 'script';
    }
    var chk = null;
    try { chk = node.querySelector('[data-ar6-chk="1"]'); } catch (e7) { chk = null; }
    if (chk && chk.checked) {
      cfg.oocPolicy = choice;
      banner(choice === 'preset' ? '心灵之光：后续冲突项均保留预设规则' : '心灵之光：后续冲突项均采用光之守护规则', 'gray');
    }
    try { saveCfg(); } catch (e8) {}
    try { closeCard(); } catch (e9) {}
    if (cb) cb(act);
  });
}

/* v3.1.2：「补前先问」的标签是 🔔，处理分支却只认 🩹 / 🔔 确认，导致这颗键点了没反应。
   三种写法都认，顺手把判定抽出来给自检用。 */
function jailConfirmHit(act) {
  var a = String(act || '');
  return a.indexOf('🩹 补前先问:') === 0 ||
    a.indexOf('🔔 补前先问:') === 0 ||
    a.indexOf('🔔 确认:') === 0;
}

function onPanelClick(e) {
  /* 按归一化动作键局部去重：快速连续点击不同开关绝不漏点 */
  {
    /* 先向上冒泡取 [data-ar6] 节点，确保子元素点击也能正确获取 act */
    var t0 = e && e.target;
    var a0Node = t0;
    while (a0Node && a0Node !== DOC.body && !(a0Node.getAttribute && a0Node.getAttribute('data-ar6'))) a0Node = a0Node.parentNode;
    var a0 = (a0Node && a0Node.getAttribute) ? a0Node.getAttribute('data-ar6') : '';
    if (a0 === 'nav' && a0Node && a0Node.getAttribute && a0Node.getAttribute('data-ar6-nav')) {
      a0 = 'nav:' + a0Node.getAttribute('data-ar6-nav');
    }
    if (a0) {
      a0 = (typeof ar6NormActKey === 'function') ? ar6NormActKey(a0) : ((a0.indexOf('wsmode:') === 0 || a0.indexOf('prism-') === 0 || a0.indexOf('tier:') === 0 || a0.indexOf('model:') === 0 || a0.indexOf('scope:') === 0 || a0.indexOf('think:') === 0 || a0.indexOf('gm:') === 0 || a0.indexOf('skin:') === 0 || a0.indexOf('refract:') === 0 || a0.indexOf('probe:') === 0) ? a0 : String(a0).replace(/[:：](?:开|关|听预设|已开启|已关闭|待机|随主闸待机|已挂载|未挂载|已暂停|自动|手动|轻档|中档|\d+次)$/, '').replace(/\s(?:开|关)$/, ''));
      var ty0 = (e && e.type) || 'click';
      var nowT = Date.now();
      if (ty0 === 'click' && LAST_PTR_FIRE_AT && LAST_PTR_FIRE_KEY === a0 && nowT - LAST_PTR_FIRE_AT < 750) return;
      var gap = ACT_GAP[a0];
      if (gap && nowT - gap.t0 < 120) return;
      ACT_GAP[a0] = { n: 1, t0: nowT };
      var rec0 = ACT_TS[a0];
      if (ty0 === 'click' && rec0 && (rec0.type === 'pointerup' || rec0.type === 'pointerdown') && nowT - rec0.ts < 750) return;
      ACT_TS[a0] = { type: ty0, ts: nowT };
      /* 用户点击通过去重后置 BN_STATE.at = 0 确保 'gray' 关闭横幅不被吞 */
      try { BN_STATE.at = 0; } catch (eBn0) {}
    }
  }
  var t = e.target;
  while (t && t !== DOC.body && !(t.getAttribute && t.getAttribute('data-ar6'))) t = t.parentNode;
  if (!t || !t.getAttribute) return;
  var act = t.getAttribute('data-ar6');
  if (!act) return;
  if (act.indexOf('pet-') === 0) {
    /* v3.1.3：桌宠按钮先改状态再挂角色；挂角色失败不能连累重绘——
       否则这一排 8 个按钮看起来全都没反应（面板不刷新，标签不变）。 */
    try { petAction(act); }
    catch (eP) { try { banner('桌宠设置没保存成功：' + String((eP && eP.message) || eP), 'bad', true); } catch (eB) {} }
    UI_SIG = {};
    render();
    return;
  }

  if (act.indexOf('wsmode:') === 0) {
    if (typeof setPrismView === 'function') setPrismView(act.slice(7));
    return;
  }
  if (act.indexOf('prism-tab:') === 0) {
    if (typeof PRISM_TAB !== 'undefined') PRISM_TAB = act.slice(10) || 'cot';
    UI_SIG = {};
    render();
    return;
  }
  if (act === 'prism-search-clear') {
    if (typeof PRISM_SEARCH !== 'undefined') PRISM_SEARCH = '';
    UI_SIG = {};
    render();
    return;
  }
  if (act === 'prism-desc-toggle') {
    if (typeof PRISM_SHOW_DESC !== 'undefined') PRISM_SHOW_DESC = !PRISM_SHOW_DESC;
    UI_SIG = {};
    render();
    return;
  }
  if (act.indexOf('prism-sw:') === 0 || act.indexOf('prism-core:') === 0) {
    var swIdP = act.indexOf('prism-sw:') === 0 ? act.slice(9) : act.slice(11);
    if (typeof prismTogglePrompt === 'function') prismTogglePrompt(swIdP);
    return;
  }
  if (act.indexOf('prism-rad:') === 0) {
    var restR = act.slice(10), ciR = restR.indexOf(':');
    var rgR = ciR >= 0 ? restR.slice(0, ciR) : '';
    var idR = ciR >= 0 ? restR.slice(ciR + 1) : restR;
    if (typeof prismSelectRadio === 'function') prismSelectRadio(rgR, idR);
    return;
  }
  if (act.indexOf('prism-bdl:') === 0) {
    if (typeof prismApplyBundle === 'function') prismApplyBundle(act.slice(10));
    return;
  }
  if (act.indexOf('prism-save:') === 0) {
    var txIdP = act.slice(11), txValP = '', foundTxP = false;
    try {
      var rNodeP = DOC && DOC.getElementById(ROOT_ID);
      var txNodes = rNodeP && rNodeP.querySelectorAll ? rNodeP.querySelectorAll('[data-ar6-prism-tx]') : [];
      for (var txi = 0; txi < txNodes.length; txi++) {
        if (txNodes[txi].getAttribute && txNodes[txi].getAttribute('data-ar6-prism-tx') === txIdP) {
          txValP = String(txNodes[txi].value || '');
          foundTxP = true;
          break;
        }
      }
    } catch (eTxR) {}
    if (!foundTxP && typeof PRISM_DRAFTS === 'object' && PRISM_DRAFTS && Object.prototype.hasOwnProperty.call(PRISM_DRAFTS, txIdP)) {
      txValP = String(PRISM_DRAFTS[txIdP] || '');
    }
    if (typeof prismSaveCustomText === 'function') prismSaveCustomText(txIdP, txValP);
    return;
  }

  if (act === 'dock-open') {
    if (DOCK_DRAG_AT && Date.now() - DOCK_DRAG_AT < 600) { DOCK_DRAG_AT = 0; return; }
    minimized = false;
    cfg.min = false;
    cfg.docked = false;
    saveCfg();
    render();
    return;
  }
  if (act === 'min') {
    minimized = true;
    cfg.docked = false;
    MORE_OPEN = false;
    syncMin();
    render();
    return;
  }
  if (act === 'dock') {
    cfg.docked = false;
    cfg.pillHide = false;
    minimized = true;
    MORE_OPEN = false;
    syncMin();
    render();
    return;
  }
  if (act === 'pill-toggle') {
    if (!cfg.pillHide && typeof hasAltEntry === 'function' && !hasAltEntry()) {
      banner('当前酒馆未检测到魔法棒或工具栏入口，为防面板失联已保留侧边圆章（可按住上下拖动移位）', 'warn', true);
      return;
    }
    cfg.pillHide = !cfg.pillHide;
    saveCfg();
    render();
    banner(cfg.pillHide
      ? ((typeof PLATFORM !== 'undefined' && PLATFORM === 'tt')
          ? '已隐藏侧边计时器圆章（可从酒馆脚本栏「光之守护」重新打开）'
          : '已隐藏侧边计时器圆章（可从酒馆魔法棒菜单重新打开）')
      : '已开启侧边彩色计时器圆章', 'ok', true);
    return;
  }
  if (act === 'pill-reset') {
    cfg.pillSide = 'right';
    cfg.pillY = 0.62;
    cfg.pillHide = false;
    saveCfg();
    render();
    banner('计时器徽章已复位至右侧边缘', 'ok', true);
    return;
  }
  if (act === 'cardauto-toggle') {
    cfg.cardAuto = !cfg.cardAuto;
    saveCfg();
    render();
    banner(cfg.cardAuto ? '已开启异动自动弹证据卡' : '已改为静默红灯提醒（不打断阅读）', 'ok');
    return;
  }
  if (act === 'upd-auto') {
    cfg.updAuto = (cfg.updAuto === false);
    saveCfg();
    UI_SIG = {};
    render();
    banner(cfg.updAuto
      ? '✦ 光之星轨：后台自动更新已开启（打开酒馆自动追新，个人配置全数保留）'
      : '✦ 光之星轨：已切为仅手动巡检模式（平时零联网，点击按钮时才检查）', cfg.updAuto ? 'ok' : 'gray', true);
    return;
  }
  if (act === 'upd-check') {
    if (typeof updQuick !== 'function') { banner('当前构建未挂载星轨更新模块', 'warn', true); return; }
    banner('✦ 正在连线光之星轨，巡检云端最新版本…', 'gray', true);
    updQuick().then(function (r) {
      if (r && r.ok && r.installed && r.already) {
        banner('✦ V' + r.version + ' 已在本会话就绪，刷新一次页面即可生效', 'ok', true);
      } else if (r && r.ok && r.installed) {
        banner(updDoneText(r.version, r.saveKind), 'ok', true);
      } else if (r && r.ok && !r.newer) {
        banner('✦ 光之星轨已是最新 V' + VERSION + '（无需升级）', 'ok', true);
      } else {
        banner('✦ 星轨同步受阻：' + updErrText((r && r.err) || '?', r), 'warn', true);
      }
      try { UI_SIG = {}; render(); } catch (eUR) {}
    })['catch'](function () {
      banner('✦ 星轨同步受阻：网络异常，请稍后重试', 'warn', true);
      try { UI_SIG = {}; render(); } catch (eUR2) {}
    });
    return;
  }
  if (act === 'upd-reload') {
    try {
      if (HOST && HOST.location && typeof HOST.location.reload === 'function') {
        HOST.location.reload();
        return;
      }
      if (SELF_WIN && SELF_WIN.location && typeof SELF_WIN.location.reload === 'function') {
        SELF_WIN.location.reload();
        return;
      }
    } catch (eRel) {}
    banner('✦ 请手动刷新一次酒馆网页，新版即刻生效', 'ok', true);
    return;
  }
  if (act === 'upd-undo') {
    var uRes = (typeof updUndo === 'function') ? updUndo() : { ok: false, err: 'nobak' };
    if (uRes && uRes.ok) {
      banner('↩ 时空回溯完成：已退回更新前版本，刷新页面即刻恢复', 'ok', true);
    } else {
      banner('↩ 时空回溯未执行：' + ((typeof updErrText === 'function') ? updErrText((uRes && uRes.err) || 'nobak', uRes) : '暂无备份'), 'warn', true);
    }
    try { UI_SIG = {}; render(); } catch (eUU) {}
    return;
  }
  if (act === 'upd-download') {
    if (typeof updDownloadFallback !== 'function') return;
    banner('✦ 正在打包下载新版脚本文件…', 'gray', true);
    updDownloadFallback().then(function (okD) {
      banner(okD ? '✦ 新版脚本已触发下载，在酒馆助手中导入覆盖即可' : '✦ 已尝试新窗口打开新版地址，保存后导入酒馆助手即可', okD ? 'ok' : 'warn', true);
    })['catch'](function () {
      banner('✦ 下载未成功，请点击「复制新版直链」用浏览器打开', 'warn', true);
    });
    return;
  }
  if (act === 'upd-copylink') {
    var stL = (typeof updState === 'function') ? updState() : {};
    var linkU = (typeof UPD_RT !== 'undefined' && UPD_RT && UPD_RT.fallbackUrl) || (stL && stL.pkgUrl) || ((typeof updDefaultPkgUrl === 'function') ? updDefaultPkgUrl() : '');
    if (linkU) copyTo(linkU, '新版直链');
    return;
  }
  if (act === 'probe:verify') {
    banner('正在向当前渠道发送真伪校验探针…', 'gray', true);
    try {
      runChannelVerify().then(function (r) {
        banner((r && r.msg) ? r.msg : '渠道校验已完成', (r && r.ok) ? 'ok' : 'warn', true);
        render();
      });
    } catch (ePV) { banner('渠道校验未启动：' + String(ePV && ePV.message || ePV), 'warn', true); }
    return;
  }
  if (act === 'probe:alias') {
    banner('正在扫描当前渠道可用模型别名…', 'gray', true);
    try {
      runAliasSweep().then(function (r) {
        banner((r && r.msg) ? r.msg : '别名扫描已完成', (r && r.ok) ? 'ok' : 'warn', true);
        render();
      });
    } catch (ePA) { banner('别名扫描未启动：' + String(ePA && ePA.message || ePA), 'warn', true); }
    return;
  }
  if (act.indexOf('scope:') === 0) {
    var scVal = act.slice(6);
    if (scVal === 'all' || scVal === 'skip' || scVal === 'only') {
      cfg.scope = scVal;
      saveCfg();
      render();
      banner('检测范围已切为：' + scopeLabel(), 'ok');
    }
    return;
  }
  if (act === 'silent') {
    cfg.silent = !cfg.silent;
    if (cfg.silent) ['ar6-bn','ar6-bn2'].forEach(function(id){ var n=DOC.getElementById(id); if(n && n.parentNode) n.parentNode.removeChild(n); });
    saveCfg(); render(); return;
  }
  if (act === 'help') { openHelp('entry'); return; }
  if (act === 'notice-open') {
    try { if (typeof openNoticeModal === 'function') openNoticeModal(false); } catch (eNmO) {}
    return;
  }
  if (act === 'diagcopy') {
    var okc = false;
    try { okc = detCopy(); } catch (eDC) { okc = false; }
    try { banner(okc ? '诊断已复制，粘贴发我' : '复制失败：手选报告页文字发我也行', okc ? 'ok' : 'warn', true); } catch (eB) {}
    return;
  }
  if (act === 'diagcode') {
    try { if (typeof diagCopyCode === 'function') diagCopyCode(null); } catch (eDC2) {}
    return;
  }
  if (act === 'diagdecode') {
    try { if (typeof openDiagModal === 'function') openDiagModal('', 'decode'); } catch (eDM) {}
    return;
  }
  if (act === 'diagcheck') {
    try { DET.tries++; installFetchHook(); try { bindStEvents(); } catch (eSB) {} try { installXhrDetect(); } catch (eXD2) {} } catch (eCH) {}
    var stPass = 0, stTotal = 0, stFails = [];
    try {
      if (typeof runSelfTest === 'function') {
        var stR = runSelfTest();
        var stArr = (stR && stR.items) || [];
        stTotal = stArr.length;
        for (var sIdx = 0; sIdx < stTotal; sIdx++) {
          if (stArr[sIdx] && stArr[sIdx].ok) stPass++;
          else if (stArr[sIdx]) stFails.push(stArr[sIdx].name);
        }
      }
    } catch (eST) {}
    try { UI_SIG = {}; render(); } catch (eRF) {}
    try { BN_STATE.at = 0; BN_STATE.kind = ''; } catch (eBnD) {}
    try {
      var stTxt = stTotal
        ? ('护盾自检完成：' + stPass + '/' + stTotal + ' 项通过 · 挂钩 ' + DET.wins + ' 个窗口' + (stFails.length ? ('（异常：' + stFails.slice(0, 2).join('、') + '）') : ''))
        : ('已自检：挂钩 ' + DET.wins + ' 个窗口');
      banner(stTxt, (DET.wins && !stFails.length) ? 'ok' : 'warn', true);
    } catch (eB2) {}
    return;
  }
  if (act.indexOf('关闭工具破甲') === 0) { cfg.jailTool = 'off'; saveCfg(); render(); return; }
  if (act === '共存:开/关') {
    cfg.jailToolKeep = !cfg.jailToolKeep;
    saveCfg(); render(); return;
  }
  if (act === 'skin-toggle') {
    SKIN_BAR_OPEN = !SKIN_BAR_OPEN;
    UI_SIG = {}; render();
    return;
  }
  if (act.indexOf('skin:') === 0) {
    var skNext = act.slice(5);
    if (typeof AR6_SKINS !== 'undefined' && AR6_SKINS[skNext]) {
      cfg.skin = skNext;
      SKIN_BAR_OPEN = false;
      saveCfg(); UI_SIG = {}; render();
      try { if (typeof prismEmitSkinChanged === 'function') prismEmitSkinChanged(skNext); } catch (eSkEv) {}
      try { if (LOGW && LOGW.open) paintLogWin(true); } catch (eLwS) {}
      var spObj = AR6_SKINS[skNext];
      banner('🎨 皮肤已切换为「' + spObj.icon + ' ' + spObj.name + '」', 'ok', true);
    }
    return;
  }
  if (act === 'logwin') { toggleLogWin(); return; }
  if (act === 'report') { openCard(null, 'human'); return; }
  if (act === 'close') {
    minimized = true;
    MORE_OPEN = false;
    syncMin();
    render();
    return;
  }
  if (act === 'nav' && t.getAttribute('data-ar6-nav')) {
    var tab=t.getAttribute('data-ar6-nav');
    if(UI_TABS[tab]) { UI_TAB=tab; UI_SIG={}; TOOL_CONFIRM=false; render();
      try { var root=DOC.getElementById(ROOT_ID); paintSections(UI_SECS,true); var btn=root.querySelector('[data-ar6-nav="'+tab+'"]'); if(btn)btn.focus(); }catch(eNav){}
    }
    return;
  }
  if (act === 'more') {
    UI_TAB = UI_TAB === 'maintenance' ? 'route' : 'maintenance'; UI_SIG = {}; MORE_OPEN = false;
    render();
    if (MORE_OPEN) {
      try { var mb = DOC.querySelector('#' + ROOT_ID + ' .ar6-body'); if (mb) mb.scrollTop = mb.scrollHeight; } catch (eMb) {}
    }
    return;
  }
  if (act === '🩺 安全:开' || act === '🩺 安全:关') {
    cfg.safe = !cfg.safe;
    saveCfg();
    ensureHooks();
    banner(cfg.safe ? '🩺 安全模式：已停止挂钩（只保留面板）' : '🛡️ 已恢复挂钩', cfg.safe ? 'warn' : 'ok');
    render();
    return;
  }
  if (act && act.indexOf('● 已开启') >= 0 || act === '● 已开启' || act === '○ 已关闭') {
    toggleEnabled('面板总开关', act.indexOf('已开启') < 0);
    return;
  }
  if (jailConfirmHit(act)) {
    cfg.jailConfirm = (cfg.jailConfirm === false);
    saveCfg(); render();
    banner(cfg.jailConfirm ? '🔔 补之前会先问你' : '🔔 不再问，自动补', cfg.jailConfirm ? 'ok' : 'warn');
    return;
  }
  if (act === 'jailnow') {
    var lastAi = jailLastAi();
    if (!lastAi) { banner('🩹 没有可续写的正文（末条不是 AI 消息）', 'gray', true); return; }
    var tailTxt = String(lastAi.msg.mes || '');
    var whyTxt = jailTruncWhy(tailTxt, tailTxt.length);
    var jObj = { code: whyTxt ? 'trunc' : (tailTxt.trim() ? 'ok' : 'empty'), note: whyTxt || (tailTxt.trim() ? '手动补一次' : '这一条没有正文') };
    var gMan = jailGate(String(lastAi.idx) + '|' + String(lastAi.msg.send_date || ''));
    if (!gMan.ok) {
      banner(gMan.why === 'max' ? '🩹 本轮已经补过 ' + JL.count + ' 次了' : '🩹 现在补不了（' + gMan.why + '）', 'warn');
      return;
    }
    jailOffer(jObj);
    return;
  }
  /* v3.0：抗截断自己的一枪——不占用破甲的配额，和「破甲」里的补一次互不影响 */
  if (act === 'truncnow') {
    var lastT = jailLastAi();
    if (!lastT) { banner('✂️ 没有可续写的正文（末条不是 AI 消息）', 'gray', true); return; }
    var tTxt = String(lastT.msg.mes || '');
    var wT = resumeTruncWhy(tTxt, tTxt.length);
    var gT = truncGate(String(lastT.idx) + '|' + String(lastT.msg.send_date || ''));
    if (!gT.ok) {
      var whyG = gT.why === 'max' ? ('本轮已经补过 ' + RS.trunc.count + ' 次了')
        : (gT.why === 'turn' ? '这一轮已经补过一次，不重复补' : ('现在补不了（' + gT.why + '）'));
      banner('✂️ ' + whyG, 'warn');
      return;
    }
    if (truncLevel(cfg.trunc) === TRUNC_OFF) banner('✂️ 抗截断现在是关的：这一枪只补这一次，下一轮记得把档位打开', 'warn');
    TR.try++;
    /* v3.1.1：补完就把「补过 N 次」画出来——签名不清掉的话增量层会把这次重绘吃掉 */
    UI_SIG['trunc'] = '';
    try { paintSections(['trunc', 'head'], true); } catch (eRP) {}
    resumeSchedule('trunc', { code: 'trunc', note: wT || '手动补一次' }, RS.trunc.count + 1, TRUNC_MAX_CONT);
    return;
  }
  /* ===== v3.0 自动 PVP ===== */
  if (act.indexOf('♻️ 自动 PVP:') === 0) {
    cfg.pvp = pvpOn() ? 'off' : 'on';
    if (cfg.pvp === 'on') { PVP.failRun = 0; PVP.coolUntil = 0; }
    saveCfg(); render();
    banner(cfg.pvp === 'on'
      ? ('♻️ 自动 PVP 已开：谷歌上游 503 / 429 / 超时 / 空回时自动重发（每轮最多 ' + pvpMax() + ' 次）')
      : '♻️ 自动 PVP 已关：请求失败就照旧失败，不再重发', cfg.pvp === 'on' ? 'ok' : 'gray');
    return;
  }
  if (act.indexOf('🔁 重发上限:') === 0) {
    cfg.pvpMax = pvpMax() >= 3 ? 1 : (pvpMax() + 1);
    saveCfg(); render();
    banner('🔁 每轮最多重发 ' + pvpMax() + ' 次（总共尝试 ' + (pvpMax() + 1) + ' 次）', 'warn');
    return;
  }
  if (act.indexOf('♻️ 空回也补:') === 0) {
    cfg.pvpEmpty = (cfg.pvpEmpty === false);
    saveCfg(); render();
    banner('♻️ 空回补一枪：' + (cfg.pvpEmpty ? '开（只在破甲关着时接管，破甲开着归破甲）' : '关'),
      cfg.pvpEmpty ? 'warn' : 'gray');
    return;
  }
  if (act.indexOf('⏱ 首字看门狗:') === 0) {
    cfg.pvpWatch = !cfg.pvpWatch;
    saveCfg(); render();
    banner('⏱ 首字看门狗：' + (cfg.pvpWatch
      ? ('开（' + Math.round(pvpWatchMs() / 1000) + ' 秒一个字节都没来就掐掉重发；长思考的模型别开）')
      : '关'), cfg.pvpWatch ? 'warn' : 'gray');
    return;
  }
  if (act === 'pvpnow') { pvpNowAction(); return; }
  if (act === 'pvpdlg') { openPvpDlg(); return; }
  if (act.indexOf('🎛 模式:') === 0) {
    cfg.pvpAuto = pvpManual();
    saveCfg(); render();
    banner(cfg.pvpAuto ? '🖐 自动模式：503 / 429 / 超时自己重发' : '🖐 手动模式：只在你点「重试一次」时补',
      cfg.pvpAuto ? 'ok' : 'warn');
    return;
  }
  if (act.indexOf('⏸ 暂停重发') === 0 || act.indexOf('⏸ 已暂停') === 0) {
    cfg.pvpPause = !pvpPaused();
    saveCfg(); render();
    banner(pvpPaused() ? '⏸ 自动重发已暂停（手动补一次仍可用）' : '▶ 自动重发已恢复', pvpPaused() ? 'warn' : 'ok');
    return;
  }
  /* v0.6 抗截断：三档循环 关 → 轻档 → 中档 → 关 */
  if (act.indexOf('✂️ 抗截断:') === 0) {
    cfg.trunc = truncNext(cfg.trunc);
    var tm = '✂️ 抗截断：' + truncLabel(cfg.trunc);
    if (cfg.trunc === 'light') tm += '（每轮往末条消息尾部贴提示词：字数锚 + 收尾契约 + 不要收尾语；不改参数、不补写）';
    if (cfg.trunc === 'medium') tm += '（轻档全部 + 长度/断句/暂停 自动补一次；审核挡下的不补）';
    saveCfg(); render();
    banner(tm, cfg.trunc === 'off' ? 'gray' : 'warn');
    return;
  }
  /* v0.7 轻档 v2：字数锚 chip，0 → 800 → 1200 → 1800 → 0 */
  if (act.indexOf('📏 字数锚:') === 0) {
    cfg.truncLen = truncLenNext(cfg.truncLen);
    var lm = cfg.truncLen > 0
      ? ('📏 字数锚：正文不少于 ' + cfg.truncLen + ' 字' + (truncLevel(cfg.trunc) === 'off' ? '（抗截断还关着，先点「✂️ 抗截断」打开）' : ''))
      : '📏 字数锚：关（不写长度要求，只留收尾契约）';
    saveCfg(); render();
    banner(lm, cfg.truncLen > 0 ? 'warn' : 'gray');
    return;
  }
  if (act.indexOf('🪄 填充锚:') === 0) {
    cfg.truncPad = String(cfg.truncPad || 'off') === 'off' ? 'math' : 'off';
    saveCfg(); render();
    banner('🪄 填充锚：' + (String(cfg.truncPad) === 'off' ? '关' : ('开（每 ' + cfg.truncPadEvery + ' 段一条短题）')),
      String(cfg.truncPad) === 'off' ? 'gray' : 'warn');
    return;
  }
  if (act.indexOf('🧽 剥填充:') === 0) {
    cfg.truncStrip = (cfg.truncStrip === false);
    saveCfg(); render();
    banner('🧽 显示层剥填充：' + (cfg.truncStrip ? '开（填充块不显示在聊天里）' : '关'), cfg.truncStrip ? 'ok' : 'gray');
    return;
  }
  if (act.indexOf('🔚 收尾契约:') === 0) {
    cfg.truncTail = (cfg.truncTail === false);
    saveCfg(); render();
    banner('🔚 收尾契约：' + (cfg.truncTail ? '开' : '关'), cfg.truncTail ? 'ok' : 'gray');
    return;
  }
  if (act.indexOf('🚫 反自我认证:') === 0) {
    cfg.truncNoCert = (cfg.truncNoCert === false);
    saveCfg(); render();
    banner('🚫 反自我认证：' + (cfg.truncNoCert ? '开' : '关'), cfg.truncNoCert ? 'ok' : 'gray');
    return;
  }
  if (act.indexOf('📑 单节折叠:') === 0) {
    cfg.singleSec = (cfg.singleSec !== true);
    saveCfg(); render();
    banner('📑 旧轮单节折叠：' + (cfg.singleSec ? '已开启（强力型以上仅发最近两节全文）' : '待机（保留完整历史上下文）'), cfg.singleSec ? 'warn' : 'gray');
    return;
  }
  if (act.indexOf('🔁 503重试:') === 0) {
    cfg.retry503 = (cfg.retry503 === 'off') ? 'on' : 'off';
    saveCfg(); render();
    banner('🔁 503 自动重连：' + (cfg.retry503 === 'off' ? '已关闭' : '已开启'), cfg.retry503 === 'off' ? 'gray' : 'ok');
    return;
  }
  if (act === 'tool-on') {
    cfg.toolChan = 'on';
    if (String(cfg.jailTool || 'off') !== 'off') cfg.jailTool = 'off';
    TOOL_CONFIRM = false;
    saveCfg(); render();
    banner('🧰 武装货舱已开启（独立圣柜信道交付）', 'ok');
    return;
  }
  if (act === 'tool-off') {
    var wasToolOn = (cfg.toolChan === 'on');
    cfg.toolChan = 'off';
    TOOL_CONFIRM = false;
    saveCfg(); UI_SIG = {}; render();
    banner(wasToolOn ? '🧰 武装货舱：已关闭，退回常规能量续航信道' : '🧰 已取消开启武装货舱（保持常规信道）', 'gray');
    return;
  }
  if (act.indexOf('gm:toolchan:') === 0) {
    if (act.charAt(act.length - 1) === '1') { TOOL_CONFIRM = true; render(); return; }
    cfg.toolChan = 'off';
    TOOL_CONFIRM = false; saveCfg(); UI_SIG = {}; render();
    banner('🧰 武装货舱：已关闭', 'gray');
    return;
  }
  if (act.indexOf('🧰 工具通道:') === 0) {
    if (cfg.toolChan === 'on') {
      cfg.toolChan = 'off';
      TOOL_CONFIRM = false;
      saveCfg(); UI_SIG = {}; render();
      banner('🧰 武装货舱：已关闭', 'gray');
      return;
    }
    TOOL_CONFIRM = !TOOL_CONFIRM;
    render();
    if (TOOL_CONFIRM) {
      var skTool = (typeof skinId === 'function') ? skinId() : 'ultra';
      var auxTool = (skTool !== 'ultra' && typeof lkSkinAuxData === 'function') ? lkSkinAuxData(skTool, 'tool') : null;
      banner(auxTool
        ? ('请确认下方说明后再点 ' + auxTool.okTxt + ' 开启')
        : '请确认下方「武装货舱」说明后再点【锁定圣柜信道】开启', 'warn');
    }
    return;
  }
  if (act === 'tool-loop') {
    cfg.toolLoop = (cfg.toolLoop !== true);
    var yieldedAll = false;
    if (cfg.toolLoop && cfg.allTool === true) { cfg.allTool = false; yieldedAll = true; }
    saveCfg(); UI_SIG = {}; render();
    if (yieldedAll) {
      try { if (typeof syncPill === 'function') syncPill(); } catch (eSpTl) {}
      try { if (typeof avatarSyncForm === 'function') avatarSyncForm(true); } catch (eAvTl) {}
    }
    banner(cfg.toolLoop
      ? ('🔗 双轮工具链：已开启（合成读入轮 + tool_choice=auto，适配 Gemini 兼容反代' + (yieldedAll ? '；破暗化光已让位' : '') + '）')
      : '🔗 双轮工具链：已关闭（恢复单轮工具调用模式）', cfg.toolLoop ? 'ok' : 'gray');
    return;
  }
  if (act === 'tool-cover') {
    cfg.toolCover = (cfg.toolCover !== true);
    saveCfg(); UI_SIG = {}; render();
    banner(cfg.toolCover
      ? '🧥 外衣剥壳：已开启（附加原创校验头并在流式输出首包零延迟自动剥离）'
      : '🧥 外衣剥壳：已关闭', cfg.toolCover ? 'ok' : 'gray');
    return;
  }
  if (act === 'salvagelast') {
    if (typeof lkSalvageLastRaw === 'function') lkSalvageLastRaw(true);
    return;
  }
  if (act.indexOf('gm:grab:') === 0) {
    var gi = Number(act.slice(8)) || 0;
    try { menuApply('grab', gi); } catch (eG) { criticalWarn('抢资源', eG); }
    try { saveCfg(); } catch (eGS) {}
    try { BN_STATE.at = 0; } catch (eBn2) {}
    try { if (typeof syncPill === 'function') syncPill(); } catch (eSpGb) {}
    try { if (typeof avatarSyncForm === 'function') avatarSyncForm(true); } catch (eAvGb) {}
    var gtag = grabTag(cfg.grab);
    var grabAllTip = (cfg.allTool === true) ? (cfg.grab > 0 ? ' · 破暗化光暂避' : ' · 破暗化光已恢复') : '';
    if (cfg.grab > 0) banner('抢资源：' + gtag + (cfg.grab > 1 ? '（同一份请求并发，先到的胜出）' : '（关稀释、关工具通道、思考压 LOW）') + grabAllTip, 'ok', true);
    else banner('抢资源：关' + grabAllTip, 'ok', true);
    UI_SIG = {}; render(); return;
  }
  if (act.indexOf('gm:') === 0) {
    var gparts = act.slice(3).split(':');
    var gk = gparts[0], gidx = Number(gparts[1]);
    if (gk === 'effort' && MENU_SPEC.effort && MENU_SPEC.effort.items[gidx]) {
      cfg.effort = MENU_SPEC.effort.items[gidx][1];
      saveCfg(); UI_SIG = {}; render();
      var efLbl = (typeof effortTag === 'function') ? effortTag() : String(cfg.effort);
      banner((typeof sk === 'function' ? sk('effortTitle', '奥特念力 · 原生思考头') : '奥特念力') + '：' + efLbl, cfg.effort === 'off' ? 'gray' : 'ok');
      return;
    }
    if (gk === 'wire' && MENU_SPEC.wire && MENU_SPEC.wire.items[gidx]) {
      cfg.wire = MENU_SPEC.wire.items[gidx][1];
      saveCfg(); UI_SIG = {}; render();
      var wLbl = (typeof wireTag === 'function') ? wireTag() : MENU_SPEC.wire.items[gidx][0];
      banner((typeof sk === 'function' ? sk('wireTitle', '细胞转换光束 · 传输转译') : '细胞转换光束') + '：' + wLbl, cfg.wire === 'off' ? 'gray' : 'ok');
      return;
    }
    if (gk === 'know' && gidx === 3 && String(cfg.know || 'off') !== 'full' && narrTipNeeded('full', cfg.knowTip)) {
      knowTipDialog('full');
      return;
    }
    if (gk === 'trunc') {
      var curTr = truncLevel(cfg.trunc);
      var wantTr = (gidx === 1) ? 'light' : ((gidx === 2) ? 'medium' : 'off');
      if (wantTr !== 'off' && curTr === wantTr) wantTr = 'off';
      cfg.trunc = wantTr;
      var syncClosedTool = false;
      if (wantTr === 'off') {
        TOOL_CONFIRM = false;
        if (cfg.toolChan === 'on') { cfg.toolChan = 'off'; syncClosedTool = true; }
      }
      saveCfg(); UI_SIG = {}; render();
      if (wantTr === 'off') {
        var trCloseSuffix = syncClosedTool ? '（已同步关闭武装货舱）' : '（不注入收尾契约、不自动续写）';
        banner('✂️ 能量续航：已关闭' + trCloseSuffix, 'gray');
      } else if (wantTr === 'light') {
        banner('✂️ 能量续航：续航叮嘱（附加收尾封印与净界律令，不自动追击）', 'ok');
      } else {
        banner('✂️ 能量续航：自动接力（长度截断或半句卡断时自动续写）', 'ok');
      }
      return;
    }
    try { menuApply(gk, gidx); } catch (eGen) { criticalWarn('档位菜单', eGen); }
    if ((gk === 'know' || gk === 'charm') && typeof prismSyncSynergyGuard === 'function') {
      try { prismSyncSynergyGuard(); } catch (eSg0) {}
    }
    saveCfg(); UI_SIG = {}; render();
    var spGm = MENU_SPEC[gk];
    if (spGm && spGm.items && spGm.items[gidx]) {
      var gmIt = spGm.items[gidx];
      var gmOff = (String(gmIt[1]) === 'off' || String(gmIt[1]) === '0');
      banner(spGm.label + '：' + gmIt[0], gmOff ? 'gray' : 'ok');
    }
    return;
  }
  if (act.indexOf('神光一言:') === 0) {
    cfg.jailWord = !cfg.jailWord;
    saveCfg(); ensureHooks(); render();
    banner(cfg.jailWord ? '神光一言已挂载：将在开启形态末尾附虚构续写契约' : '神光一言已卸下', cfg.jailWord ? 'ok' : 'gray');
    return;
  }
  if (act === 'salt:toggle') {
    var curSaltOff = String((cfg && cfg.salt) || 'auto') === 'off';
    cfg.salt = curSaltOff ? 'auto' : 'off';
    saveCfg(); UI_SIG = {}; render();
    var wOffS = (typeof lkWireMode === 'function') ? (lkWireMode() === 'off') : (String((cfg && cfg.wire) || 'auto') === 'off');
    var sTag = (typeof lkSaltTag === 'function') ? lkSaltTag() : 'SID-5EED';
    banner(cfg.salt !== 'off'
      ? ('✦ 计时器光印已开启（' + sTag + (wOffS ? '，请先开启上方细胞转换光束后生效' : '，已为当前会话注入独立盐印') + '）')
      : '计时器光印已关闭（不再注入 Session-ID）', cfg.salt !== 'off' ? (wOffS ? 'warn' : 'ok') : 'gray');
    return;
  }
  if (act === 'mars:toggle') {
    cfg.mars = !(cfg && cfg.mars === true);
    saveCfg(); ensureHooks(); UI_SIG = {}; render();
    var marsOnTxt = (typeof sk === 'function')
      ? sk('marsBannerOn', '☄️ 火星文转译已开启：敏感词化作 ❀Base36❀ 星语密文穿透封锁，回包无损还原')
      : '☄️ 火星文转译已开启：敏感词化作 ❀Base36❀ 星语密文穿透封锁，回包无损还原';
    var marsOffTxt = (typeof sk === 'function')
      ? sk('marsBannerOff', '☄️ 火星文转译已关闭：恢复常规传输')
      : '☄️ 火星文转译已关闭：恢复常规传输';
    banner(cfg.mars ? marsOnTxt : marsOffTxt, cfg.mars ? 'ok' : 'gray');
    return;
  }
  if (act.indexOf('sem:') === 0) {
    var wantSem = act.slice(4);
    cfg.semantic = (wantSem === 'toggle') ? ((typeof lkSemOn === 'function' && lkSemOn()) ? 'off' : 'on') : (wantSem === 'on' ? 'on' : 'off');
    saveCfg(); ensureHooks(); UI_SIG = {}; render();
    var semOnTxt = (typeof sk === 'function') ? sk('semBannerOn', '🌙 幻影折射已展开：亲密段落改走意象侧写') : '🌙 幻影折射已展开：亲密段落改走意象侧写';
    var semOffTxt = (typeof sk === 'function') ? sk('semBannerOff', '幻影折射已收起：恢复直写') : '幻影折射已收起：恢复直写';
    banner(cfg.semantic === 'on' ? semOnTxt : semOffTxt, cfg.semantic === 'on' ? 'ok' : 'gray');
    return;
  }
  if (act.indexOf('alltool:') === 0) {
    var turningOn = !(cfg && cfg.allTool === true);
    if (turningOn) {
      if (typeof lkDawnAsk === 'function') { lkDawnAsk(); return; }
      cfg.allTool = true;
      cfg.jail = 'off';
      cfg.jailSupremeConfirmed = false;
      var allNote = '';
      if (String(cfg.toolChan || 'off') === 'on') { allNote += '武装货舱本轮让位'; }
      if (String(cfg.jailTool || 'off') !== 'off') { allNote += (allNote ? '，' : '') + '工具破甲已让位'; }
      if (cfg.toolLoop === true) { allNote += (allNote ? '，' : '') + '双轮工具链已让位'; }
      cfg.jailTool = 'off';
      cfg.toolLoop = false;
      if (cfg.grab > 0) { allNote += (allNote ? '，' : '') + '飞燕编队省流期间破暗化光暂避'; }
      saveCfg(); ensureHooks(); UI_SIG = {}; render();
      try { if (typeof syncPill === 'function') syncPill(); } catch (eSpA) {}
      try { if (typeof avatarSyncForm === 'function') avatarSyncForm(true); } catch (eAvA) {}
      banner('✦ 破暗化光已开启：纯文全量转译 + 注音/探针护航，不走工具通道' + (allNote ? '（' + allNote + '）' : ''), 'ok', true);
      return;
    }
    cfg.allTool = false;
    cfg.jail = 'off';
    cfg.jailSupremeConfirmed = false;
    saveCfg(); ensureHooks(); UI_SIG = {}; render();
    try { if (typeof syncPill === 'function') syncPill(); } catch (eSpB) {}
    try { if (typeof avatarSyncForm === 'function') avatarSyncForm(true); } catch (eAvB) {}
    var offMsg = (typeof sk === 'function') ? sk('allToolBannerOff', '破暗化光已收束：已归位石像待机') : '破暗化光已收束：已归位石像待机';
    banner(offMsg, 'gray');
    return;
  }
  if (act.indexOf('tier:') === 0) {
    var want = act.slice(5);
    if (want === 'noa') want = 'gatanothor';
    if (want === 'strong') { jailSuperAsk(); return; }
    if (want === 'supreme') { jailSupremeAsk(); return; }
    if (want === 'gatanothor' || want === 'abyss') { lkUltAsk(want); return; }
    cfg.allTool = false;
    cfg.jail = (want === 'off' ? 'off' : want);
    if (want === 'off') cfg.jailTool = 'off';   /* 形态切回石像待机时工具域破甲一起待机 */
    if (cfg.jail !== 'supreme' && cfg.jail !== 'gatanothor' && cfg.jail !== 'abyss') cfg.jailSupremeConfirmed = false;
    if (cfg.jail !== 'off' && !cfg.observe) cfg.observe = true;
    saveCfg(); ensureHooks(); UI_SIG = {}; render();
    try { if (typeof syncPill === 'function') syncPill(); } catch (eSpT) {}
    try { if (typeof avatarSyncForm === 'function') avatarSyncForm(true); } catch (eAvT) {}
    var spTier = (typeof skinSpec === 'function') ? skinSpec() : null;
    var skTierKey = (want === 'off') ? 'idle' : want;
    var skTierSub = (spTier && spTier.id !== 'ultra' && spTier.tiers && spTier.tiers[skTierKey] && spTier.tiers[skTierKey].sub) ? spTier.tiers[skTierKey].sub : '';
    if (skTierSub) banner(skTierSub, want === 'off' ? 'gray' : 'ok');
    else if (want === 'off') banner('光芒已敛入超古代石像 · 全信道静默待命', 'gray');
    else if (want === 'safe') banner('迪迦·空中型已展开 · 极速轻装掠行姿态就绪', 'ok');
    else if (want === 'mid') banner('迪迦·复合型已展开 · 光之巨人双轨破障姿态就绪', 'ok');
    else banner('迪迦形态切换：' + ((typeof jailFormName === 'function') ? jailFormName() : jailLabel()), 'ok');
    return;
  }
  if (act.indexOf('保底token:') === 0) { cfg.jailTok = !cfg.jailTok; saveCfg(); render(); return; }
  if (act.indexOf('解安全:') === 0) { cfg.jailSafe = !cfg.jailSafe; saveCfg(); render(); return; }
  if (act.indexOf('授权头:') === 0) { cfg.jailPre = !cfg.jailPre; saveCfg(); render(); return; }
  if (act.indexOf('底部接管:') === 0) { cfg.jailText = !cfg.jailText; saveCfg(); render(); return; }
  if (act.indexOf('设定脱敏:') === 0) {
    cfg.desens = (cfg.desens === 'a') ? 'off' : 'a';
    saveCfg(); render();
    banner('设定隐匿：' + (cfg.desens === 'a' ? '已开启（敏感词无损折射）' : '已关闭'), cfg.desens === 'a' ? 'ok' : 'gray');
    return;
  }
  if (act.indexOf('还原正文:') === 0) {
    cfg.desensUnmask = (cfg.desensUnmask === false);
    saveCfg(); render();
    banner('正文显影：' + (cfg.desensUnmask ? '已开启（响应实时还原）' : '已关闭'), cfg.desensUnmask ? 'ok' : 'gray');
    return;
  }
  if (act.indexOf('model:') === 0) {
    var nextMp = ar6Pick(act.slice(6) || 'auto', ['auto', '3.8f', '4a', '4c', '4h', '4n', 'generic'], 'auto');
    cfg.modelProfile = nextMp;
    saveCfg(); render();
    var mpTxt = (nextMp === 'auto' && typeof profileLine === 'function') ? profileLine() : ((typeof mpLabel === 'function') ? mpLabel(nextMp) : String(nextMp));
    var curLocked = (typeof MODEL_LOCKED_VAL !== 'undefined') ? MODEL_LOCKED_VAL : nextMp;
    banner('波段已切至：' + mpTxt + (curLocked !== nextMp ? '（可点「保存并锁定」核验双端持久化）' : ''), 'ok');
    return;
  }
  if (act === 'model-save') {
    cfg.modelProfile = ar6Pick(cfg.modelProfile, ['auto', '3.8f', '4a', '4c', '4h', '4n', 'generic'], 'auto');
    try { STORE_FAILS = 0; } catch (eSF) {}
    saveCfg();
    var verifyHit = null;
    try { if (typeof storeReadAll === 'function') verifyHit = storeReadAll(); } catch (eVR) { verifyHit = null; }
    try { MODEL_LOCKED_VAL = cfg.modelProfile; MODEL_SAVED_AT = Date.now(); } catch (eML) {}
    UI_SIG = {};
    render();
    var lockLabel = (cfg.modelProfile === 'auto')
      ? ('自动匹配（' + ((typeof profileLine === 'function') ? profileLine() : '自动') + '）')
      : (((typeof mpLabel === 'function') ? mpLabel(cfg.modelProfile) : cfg.modelProfile) + ' 专属波段');
    if (verifyHit && verifyHit.raw) {
      banner('✓ 波段方案「' + lockLabel + '」已保存锁定（存储源：' + verifyHit.src + '，重开酒馆不丢失）', 'ok', true);
    } else {
      banner('⚠ 波段方案「' + lockLabel + '」已在当前会话锁定（当前 WebView 限制本地存储，重开网页需重选）', 'warn', true);
    }
    return;
  }
  if (act.indexOf('think:') === 0) { var tk2 = act.slice(6); if (tk2 === 'auto' || tk2 === 'low' || tk2 === 'medium' || tk2 === 'high') { cfg.think = tk2; saveCfg(); render(); banner('思考强度：' + thinkTag(), 'ok'); return; } }

  /* v8.31 叙述层：三档循环 关 → 轻 → 强 → 关 */
  if (act.indexOf('🧭 防全知:') === 0) {
    var nxKnow = narrNext(cfg.know);
    /* 打开之前先把代价说清楚：它禁止写内心话、也禁止替人做决定 */
    if (nxKnow !== cfg.know && narrTipNeeded(nxKnow, cfg.knowTip)) { knowTipDialog(nxKnow); return; }
    cfg.know = nxKnow; saveCfg(); render();
    banner('🧭 防全知：' + narrTag(cfg.know), cfg.know === 'off' ? 'gray' : 'ok');
    return;
  }
  if (act.indexOf('💄 去媚:') === 0 || act.indexOf('💄 防媚:') === 0) {
    cfg.charm = narrNext(cfg.charm); saveCfg(); UI_SIG = {}; render();
    banner('💄 去媚：' + narrTag(cfg.charm), cfg.charm === 'off' ? 'gray' : 'ok');
    return;
  }
  if (act === 'charm-wrap') {
    var charmOffW = narrPick(cfg.charm) === 'off';
    if (charmOffW) {
      cfg.charmWrap = (String(cfg.charmWrap || 'auto') === 'on') ? 'off' : 'on';
      saveCfg(); UI_SIG = {}; render();
      banner(cfg.charmWrap === 'on'
        ? '📦 贴脸包裹：已设为常开（开启上方「真实引力」任意档位后即刻包裹近 2 轮输入）'
        : '📦 贴脸包裹：已关闭（中/高档亦不额外包裹用户输入）', cfg.charmWrap === 'on' ? 'ok' : 'gray');
      return;
    }
    var curWrapOn = (typeof narrCharmWrapOn === 'function') ? narrCharmWrapOn() : false;
    cfg.charmWrap = curWrapOn ? 'off' : 'on';
    saveCfg(); UI_SIG = {}; render();
    banner(cfg.charmWrap === 'on'
      ? '📦 贴脸包裹：已开启（无痕三明治包裹近 2 轮玩家输入，不改聊天记录）'
      : '📦 贴脸包裹：已关闭（仅保留规则块，不包裹玩家发言）', cfg.charmWrap === 'on' ? 'ok' : 'gray');
    return;
  }
  if (act === 'charm-lethal') {
    cfg.charmLethal = (cfg.charmLethal !== true);
    var charmOffL = narrPick(cfg.charm) === 'off';
    saveCfg(); UI_SIG = {}; render();
    if (charmOffL) {
      banner(cfg.charmLethal
        ? '☠️ 致命后果：已勾选待命（开启上方「真实引力」任意档位后生效）'
        : '☠️ 致命后果：已关闭', cfg.charmLethal ? 'warn' : 'gray');
    } else {
      banner(cfg.charmLethal
        ? '☠️ 致命后果：已开启（高危世界无免死光环，失误可致重伤乃至死亡）'
        : '☠️ 致命后果：已关闭（恢复常规写实阻力，不强制致命结局）', cfg.charmLethal ? 'warn' : 'gray');
    }
    return;
  }

  /* v0.76 反 OOC：总闸 + 四子项。前缀都带 emoji 和空格，与叙述层不撞 */
  if (act.indexOf('🎭 反OOC:') === 0) {
    var oocNow = String(cfg.ooc || 'off') === 'on' ? 'off' : 'on';
    cfg.ooc = oocNow;
    try { if (oocNow === 'on' && typeof prismSyncSynergyGuard === 'function') prismSyncSynergyGuard(); } catch (eSgO) {}
    saveCfg(); render();
    banner('🎭 反 OOC：' + (oocNow === 'on' ? '开' : '关'), oocNow === 'on' ? 'ok' : 'gray');
    if (oocNow === 'on') {
      var askAll = [], sigAll = null;
      try { askAll = (typeof oocAsk === 'function') ? oocAsk() : []; } catch (eOA) { askAll = []; }
      try { sigAll = (askAll && askAll.length && typeof oocSig === 'function') ? oocSig() : null; } catch (eOS) { sigAll = null; }
      if (askAll && askAll.length && sigAll && sigAll.hits) {
        var hitsAll = {}, hasHit = false;
        for (var ai = 0; ai < askAll.length; ai++) {
          var ak = askAll[ai];
          if (oocOnOf(ak) && sigAll.hits[ak]) { hitsAll[ak] = sigAll.hits[ak]; hasHit = true; }
        }
        if (hasHit) oocConflictDialog(hitsAll, function () { try { UI_SIG = {}; render(); } catch (eOR) {} });
      }
    }
    return;
  }
  if (act.indexOf('🧩 点名:') === 0) { oocToggle('roll'); return; }
  if (act.indexOf('🚫 反模板:') === 0) { oocToggle('tpl'); return; }
  if (act.indexOf('🔒 变更门槛:') === 0) { oocToggle('chg'); return; }
  if (act.indexOf('🗣 口吻一致:') === 0) { oocToggle('voice'); return; }
  if (act === 'refract:mode') {
    cfg.refractMode = (cfg.refractMode === 'random') ? 'stable' : 'random';
    saveCfg(); UI_SIG = {}; render();
    banner(cfg.refractMode === 'random'
      ? '🎲 微扰已切为「每轮真随机」：每发一轮都重新摇随机数与排列组合'
      : '🧊 微扰已切为「同套保缓存」：本会话固定当前套号，可点「立即换套」手动刷新', 'ok');
    return;
  }
  if (act === 'refract:auto') {
    cfg.refractAutoRotate = !cfg.refractAutoRotate;
    saveCfg(); UI_SIG = {}; render();
    banner(cfg.refractAutoRotate
      ? '🎲 异常自动换套已开启：监测到被换/无思考/速度异常时自动切换新随机套号'
      : '🎲 异常自动换套已关闭', cfg.refractAutoRotate ? 'ok' : 'gray');
    return;
  }
  if (act === 'refract:roll') {
    var nextSuite = (typeof refractRollSuite === 'function') ? refractRollSuite('manual') : '';
    if (cfg.refract === 'off') {
      cfg.refract = 'mid';
      saveCfg();
    }
    UI_SIG = {}; render();
    banner('🎲 微扰已换套 → #' + (nextSuite || 'NEW') + '（下轮发送即启用全新随机数排列组合）', 'ok');
    return;
  }
  if (act.indexOf('🪶 微扰') === 0) {
    cfg.refract = cfg.refract === 'off' ? 'light' : (cfg.refract === 'light' ? 'mid' : (cfg.refract === 'mid' ? 'heavy' : 'off'));
    saveCfg(); render();
    banner('🪶 微扰档位：' + profileLabel(), cfg.refract === 'off' ? 'gray' : 'ok');
    return;
  }
  if (act.indexOf('🧠 思考') === 0) {
    var tIdx = THINK_LEVELS.indexOf(cfg.think);
    var tNext = THINK_LEVELS[(tIdx < 0 ? 0 : tIdx + 1) % THINK_LEVELS.length];
    cfg.think = tNext; saveCfg(); render();
    banner('🧠 思考:' + thinkTag() + (tNext === 'auto' ? '（交回预设/模型默认）' : '（' + tNext + ' 已写进请求）'), 'gray');
    return;
  }
  if (act.indexOf('📌 钉参数') === 0) {
    cfg.pin = !cfg.pin; saveCfg(); render();
    banner('📌 钉参数 ' + (cfg.pin ? '开' : '关'), cfg.pin ? 'ok' : 'gray');
    return;
  }
  /* v0.82 行为基线：默认开，给一个能关掉的地方 */
  if (act.indexOf('📈 行为基线') === 0) {
    cfg.base = (String(cfg.base || 'on') === 'on') ? 'off' : 'on'; saveCfg(); render();
    banner('📈 行为基线 ' + (cfg.base === 'on' ? '开' : '关'), cfg.base === 'on' ? 'ok' : 'gray');
    return;
  }
  /* v0.84 结构指纹：默认开，只提示；关掉即不写不判 */
  if (act.indexOf('🔬 返回格式') === 0) {
    cfg.shape = (String(cfg.shape || 'on') === 'on') ? 'off' : 'on'; saveCfg(); render();
    banner('🔬 返回格式 ' + (cfg.shape === 'on' ? '开' : '关'), cfg.shape === 'on' ? 'ok' : 'gray');
    return;
  }

  /* v1.1 只查 Gemini：默认开。关掉就回到「什么都查」 */
  if (act.indexOf('🟦 只查 Gemini') === 0) {
    cfg.onlyGemini = (cfg.onlyGemini === false);
    saveCfg(); render();
    banner(cfg.onlyGemini === false
      ? '🟦 所有模型都查（非 Gemini 也会进账本）'
      : '🟦 只查 Gemini（别的模型不判定、不进账本）',
      cfg.onlyGemini === false ? 'gray' : 'ok');
    return;
  }

  /* V5.65 纯净正轨 · 只检正文放行外部插件：默认开 */
  if (act.indexOf('📄 只算正文') === 0) {
    cfg.contentOnly = (cfg.contentOnly === 'off') ? 'on' : 'off';
    saveCfg(); UI_SIG = {}; render();
    banner(cfg.contentOnly === 'off'
      ? '📄 纯净正轨已关：全域监测含插件请求（仍禁往插件注入小说破甲）'
      : '📄 纯净正轨已开：柏宝书 / 柏宝绘 / 数据库等外部插件零干预直通，仅守护与采样正文',
      cfg.contentOnly === 'off' ? 'gray' : 'ok', true);
    return;
  }

  /* V5.65 预设适配主导权：开=卢克之光强权优先 | 关=礼让预设 */
  if (act === 'preset-compat') {
    cfg.presetCompat = (String(cfg.presetCompat || 'on') === 'off') ? 'on' : 'off';
    saveCfg(); UI_SIG = {}; render();
    banner(cfg.presetCompat === 'off'
      ? '🕊 预设适配已切为「礼让预设」：遇到预设自带破甲与载具自动让路，保留光之雷达与精准采样'
      : '⚔️ 预设适配已切为「强权优先」：卢克之光破甲第一顺位主导（保留多字段业务引擎工具不硬拆）',
      cfg.presetCompat === 'off' ? 'gray' : 'ok', true);
    return;
  }


  if (act.indexOf('👁 观察器') === 0) {
    cfg.observe = !cfg.observe; saveCfg(); render();
    banner('👁 零锁观察器 ' + (cfg.observe ? '开' : '关'), cfg.observe ? 'ok' : 'gray');
    return;
  }

  if (act.indexOf('🎯 范围:') === 0) {
    cfg.scope = cfg.scope === 'all' ? 'skip' : (cfg.scope === 'skip' ? 'only' : 'all');
    saveCfg(); render();
    banner('检测范围：' + scopeLabel() + (cfg.scope === 'all' ? '（全部模型都判）' : ''), cfg.scope === 'all' ? 'gray' : 'ok');
    return;
  }
  if (act === 'savescope') {
    var si = DOC.querySelector('[data-ar6="scope"]');
    if (si) cfg.scopeList = String(si.value || '').trim();
    saveCfg(); render();
    banner('范围已保存：' + (cfg.scopeList || '（空=不过滤）'), 'ok');
    return;
  }

  if (act === 'exportlog') { copyTo(exportText(), '📤 导出记录'); return; }
  /* 清空：账本 + 基线一起清。只清账本的话，基线还是老的，
     用户以为「重新开始」，实际还在拿旧参照下结论。 */
  if (act === 'clear') {
    var nowC = Date.now();
    if (nowC - CLEAR_CONFIRM_AT > 4000) {
      CLEAR_CONFIRM_AT = nowC;
      if (CLEAR_TIMER) { try { clearTimeout(CLEAR_TIMER); } catch (eCT0) {} }
      CLEAR_TIMER = setTimeout(function () {
        CLEAR_TIMER = 0;
        CLEAR_CONFIRM_AT = 0;
        if (!DISPOSED) { UI_SIG = {}; render(); }
      }, 4050);
      UI_SIG = {};
      render();
      banner('红灯安全确认：4 秒内再次点击「清空」才会彻底抹除日志、账本与基线', 'warn', true);
      return;
    }
    CLEAR_CONFIRM_AT = 0;
    if (CLEAR_TIMER) { try { clearTimeout(CLEAR_TIMER); } catch (eCT1) {} CLEAR_TIMER = 0; }
    try { ar6LsDel(LOG_KEY); } catch (e) {}
    try { ar6LsDel(LED_KEY); } catch (eL) {}
    try { ar6LsDel(BASE_KEY); } catch (e2) {}
    try { ar6LsDel(SHAPE_KEY); } catch (e3) {}
    try { if (typeof SERVED === 'object' && SERVED) { SERVED.last = ''; SERVED.want = ''; SERVED.mismatch = 0; SERVED.checked = 0; } } catch (eSv) {}
    selfTestResult = null;
    UI_SIG = {};
    banner('已清空全部历史记录、渠道账本与速度基线', 'ok', true);
    render();
    try { if (LOGW && LOGW.open) paintLogWin(true); } catch (eLW) {}
    return;
  }
  /* 重建基线：连点两次确认（手机上 confirm 常被拦，而且这一步只清本机数据，
     用双击确认比弹窗更省事） */
  if (act === 'rebuild') {
    var nowR = Date.now();
    if (nowR - REBUILD_AT > 5000) {
      REBUILD_AT = nowR;
      banner('⚠ 再点一次「重建基线」确认：清掉学过的首字耗时 / 出字速率 / 返回格式，之后 8 轮内不再给提示', 'warn', true);
      return;
    }
    REBUILD_AT = 0;
    try { ar6LsDel(BASE_KEY); } catch (e4) {}
    try { ar6LsDel(SHAPE_KEY); } catch (e5) {}
    banner('🧹 基线已清空：接下来 8 轮重新学，期间不会出手感 / 格式提示', 'ok');
    render();
    return;
  }
  if (act === 'selftoggle') {
    var box = DOC.getElementById('ar6-selftest');
    if (box) box.style.display = box.style.display === 'none' ? 'block' : 'none';
    return;
  }
}

function onPanelInput(e) {
  var t = e && e.target;
  if (!t || !t.getAttribute) return;
  if (t.getAttribute('data-ar6-prism-search') === '1' || t.getAttribute('data-ar6') === 'prism-search') {
    if (typeof PRISM_SEARCH !== 'undefined') PRISM_SEARCH = String(t.value || '');
    if (typeof prismRefreshListInPlace === 'function') prismRefreshListInPlace();
    return;
  }
  var pTxId = t.getAttribute('data-ar6-prism-tx');
  if (pTxId) {
    if (typeof PRISM_DRAFTS === 'object' && PRISM_DRAFTS) PRISM_DRAFTS[pTxId] = String(t.value || '');
    return;
  }
  var k = t.getAttribute('data-ar6');
  if (!k) return;
  if (k === 'scope') { cfg.scopeList = String(t.value || ''); try { saveCfg(); } catch (e4) {} }
  if (k === 'grab') {
    var gv = Math.max(0, Math.min(GRAB_MAX, Number(t.value || 0) || 0));
    cfg.grab = gv;
    try { saveCfg(); } catch (e5g) {}
    try { var gl = DOC.getElementById('ar6-grab-lab'); if (gl) gl.textContent = grabTag(gv); } catch (e6g) {}
    try { BN_STATE.at = 0; } catch (eBn) {}
    if (gv > 0) banner('抢资源：' + grabTag(gv) + (gv > 1 ? '（同一份请求并发，先到的胜出）' : '（关稀释、关工具通道、思考压 LOW）'), 'ok', true);
    return;
  }

}

function onPanelChange(e) {
  var t = e.target;
  if (!t || !t.getAttribute) return;
  var k = t.getAttribute('data-ar6');
  if (k === 'scope') { cfg.scopeList = String(t.value || '').trim(); saveCfg(); banner('过滤关键词已自动保存', 'ok'); return; }
  try { saveCfg(); } catch (e) {}
}

/* ---------------- 渲染入口 ---------------- */

