/* ===== 9_card.js ===== */
/* ============================================================================
 * 卢克之光 V5.0 — 9/9 诊断证据卡（深空银蓝高对比视觉 / 模型归一核验 / 与功能图鉴独立互不误关）
 * ========================================================================== */

var CARD = { open: false, rid: 0 };

var CARD_COLOR = {
  diff: '#f43f5e',
  suspect: '#f97316',
  thin: '#fcd34d',
  echo: '#94a3b8',
  unknown: '#94a3b8',
  same: '#34d399',
  skip: '#38bdf8',
  aux: '#94a3b8',
  quota: '#a78bfa',
  blocked: '#f43f5e',
  gate: '#fb923c',
  empty: '#94a3b8',
  error: '#f43f5e'
};

function cardColor(code) {
  return CARD_COLOR[code] || '#94a3b8';
}

function reportCapture(rec) {
  var c = rec && rec.capture;
  var pk = cardPeek(rec);
  if (c && typeof c === 'object') {
    return {
      bodyChars: c.bodyChars != null ? c.bodyChars : (rec && rec.chars),
      thinkChars: c.thinkChars,
      thinkTokens: c.thinkTokens != null ? c.thinkTokens : (pk && pk.thoughts != null ? pk.thoughts : null),
      firstByteMs: c.firstByteMs,
      firstThinkMs: c.firstThinkMs,
      firstContentMs: c.firstContentMs != null ? c.firstContentMs : (rec && rec.ttft),
      totalMs: c.totalMs != null ? c.totalMs : (rec && rec.total),
      source: c.source || (rec && rec.src),
      status: c.status,
      error: c.error,
      settleReason: c.settleReason || (rec && rec.truncNote),
      lateReconciled: c.lateReconciled
    };
  }
  return {
    bodyChars: rec && rec.chars,
    thinkChars: null,
    thinkTokens: pk && pk.thoughts != null ? pk.thoughts : null,
    firstByteMs: rec && rec.ttft,
    firstThinkMs: null,
    firstContentMs: rec && rec.ttft,
    totalMs: rec && rec.total,
    source: rec && rec.src,
    status: null,
    error: null,
    settleReason: rec && rec.truncNote,
    lateReconciled: null
  };
}

function reportValue(v, suffix) {
  return v == null || v === '' || (typeof v === 'number' && !isFinite(v)) ? '未知' : String(v) + (suffix || '');
}

function reportTimelineText(rec) {
  var cp = reportCapture(rec);
  return [
    '证据时间线（相对请求开始；未知不是 0）',
    '首字节：' + reportValue(cp.firstByteMs, ' ms'),
    '首思考：' + reportValue(cp.firstThinkMs, ' ms'),
    '首正文：' + reportValue(cp.firstContentMs, ' ms'),
    '结束：' + reportValue(cp.totalMs, ' ms'),
    '正文：' + reportValue(cp.bodyChars, ' 字') + ' / 思考：' + reportValue(cp.thinkChars, ' 字') + ' / 思考 token：' + reportValue(cp.thinkTokens),
    '来源：' + reportValue(cp.source) + ' / 状态：' + reportValue(cp.status),
    '错误：' + reportValue(cp.error) + ' / 收尾：' + reportValue(cp.settleReason),
    '晚到合并：' + (cp.lateReconciled == null ? '未知' : (cp.lateReconciled ? '是' : '否'))
  ].join('\n');
}

function reportTimelineHTML(rec) {
  return '<section aria-label="证据时间线" style="margin:10px 16px;padding:10px 12px;border-left:3px solid #38bdf8;border-radius:0 8px 8px 0;background:#162032;color:#cbd5e1;white-space:pre-wrap;overflow-wrap:anywhere;font-size:11.8px;line-height:1.68">' + esc(reportTimelineText(rec)) + '</section>';
}

function cardRate(rec) {
  var cp = reportCapture(rec);
  var n = Number(cp.totalMs);
  var c = Number(cp.bodyChars);
  if (!isFinite(n) || n <= 0 || !isFinite(c) || c <= 0) return 0;
  return Math.round(c * 1000 / n);
}

function cardSpark(vals) {
  var chars = '▁▂▃▄▅▆▇█';
  var arr = (vals || []).filter(function (v) { return typeof v === 'number' && isFinite(v); });
  if (!arr.length) return '';
  var min = Math.min.apply(null, arr);
  var max = Math.max.apply(null, arr);
  var span = max - min;
  var out = '';
  for (var i = 0; i < arr.length; i++) {
    var idx = span <= 0 ? 4 : Math.round((arr[i] - min) / span * 7);
    if (idx < 0) idx = 0; if (idx > 7) idx = 7;
    out += chars.charAt(idx);
  }
  return out;
}

function cardPeek(rec) {
  try {
    if (!rec || rec.rid == null) return null;
    return PEEKS[rec.rid] || null;
  } catch (e) { return null; }
}

function cardShownModel(rec) {
  var pk = cardPeek(rec);
  var bodyModel = (pk && (pk.modelVersion || pk.model)) || '';
  if (bodyModel) return bodyModel;
  if (rec && rec.served) return String(rec.served);
  if (rec && rec.obs && rec.obs !== '—') return String(rec.obs);
  return '';
}

function cardModelsMatch(req, obs) {
  var a = String(req || '').trim(), b = String(obs || '').trim();
  if (!a || !b || a === '—' || b === '—') return false;
  if (a === b) return true;
  try {
    if (typeof normModelIdentity === 'function') {
      var ia = normModelIdentity(a), ib = normModelIdentity(b);
      if (ia && ib && ia === ib) return true;
    }
    if (typeof normModelName === 'function') {
      var na = normModelName(a), nb = normModelName(b);
      if (na && nb && na === nb) return true;
    }
  } catch (e) {}
  return false;
}

function cardOneLine(rec) {
  var pk = cardPeek(rec);
  var req = rec.req || '?';
  var obs = cardShownModel(rec);
  var tail = '';
  if (rec.code === 'diff') {
    tail = obs ? ('请求 ' + req + ' → 上游回 ' + obs) : ('请求 ' + req + '，但证据与请求不符');
  } else if (rec.code === 'suspect') {
    tail = '请求 ' + req + ' → 触发特征倒挂（' + (rec.fpGrade || 'V3') + '），高度疑似后台降级/偷换';
  } else if (rec.code === 'thin') {
    tail = '请求 ' + req + '，正文 ' + reportValue(reportCapture(rec).bodyChars, ' 字') + '，思考 token：' + reportValue(reportCapture(rec).thinkTokens);
  } else if (rec.code === 'echo') {
    tail = '请求 ' + req + '，返回标签与请求不同，但该渠道不读 model（回显）';
  } else if (rec.code === 'same') {
    var gTag = rec.fpGrade === 'V1' ? '硬证验真 V1' : (rec.fpGrade === 'V2' ? '仅回显无硬证 V2' : '一致');
    tail = '请求 ' + req + ' → 实测 ' + (obs || req) + '（' + gTag + '）';
  } else if (rec.code === 'skip') {
    tail = '请求 ' + req + '，当前已按扫描范围规则跳过（' + (rec.note || '范围外') + '）';
  } else if (rec.code === 'aux') {
    tail = '请求 ' + req + '，属于后台辅助请求（不计入正文调包率）';
  } else {
    tail = '请求 ' + req + '，暂未取得上游模型字段（' + (rec.verdict || '未知') + '）';
  }
  if (pk && pk.nativeModelVersion && tail.indexOf(pk.nativeModelVersion) < 0) tail += '｜原生 modelVersion: ' + pk.nativeModelVersion;
  return tail;
}

function cardDiagCodeOf(rec) {
  try {
    if (rec && rec.diagCode) return String(rec.diagCode);
    if (typeof lkBuildDiagCode === 'function') return lkBuildDiagCode(rec, null);
  } catch (e) {}
  return '';
}

function cardChannelSummary(rec) {
  var ch = (rec && rec.ch) || null;
  if (!ch && typeof lkClassifyChannel === 'function') {
    try { ch = lkClassifyChannel((typeof lastReq !== 'undefined' && lastReq && lastReq.url) || '', null, null); } catch (e0) {}
  }
  if (!ch) return { text: '未识别通道', color: '#94a3b8', code: 'OFF', hash: '0000', wlHit: null };
  var meta = (typeof LK_CH_META !== 'undefined' && LK_CH_META[ch.code]) || { label: ch.code, short: ch.code, color: '#94a3b8' };
  var wlHit = (typeof lkMatchPubWhitelist === 'function') ? lkMatchPubWhitelist(ch.hash) : null;
  if (wlHit) {
    return { text: '✅ 公益站 · ' + wlHit.label + '（' + meta.short + ' #' + ch.hash + '）', color: '#34d399', code: ch.code, hash: ch.hash, wlHit: wlHit };
  }
  if (ch.code === 'OFF') return { text: '🟢 官方直连 (OFF)', color: '#34d399', code: ch.code, hash: '0000', wlHit: null };
  return { text: meta.label + ' (' + ch.code + (ch.hash && ch.hash !== '0000' ? (' #' + ch.hash) : '') + ')', color: meta.color, code: ch.code, hash: ch.hash || '0000', wlHit: null };
}

function cardDiagBoxHTML(rec) {
  var dCode = cardDiagCodeOf(rec);
  var chInfo = cardChannelSummary(rec);
  var grade = (rec && rec.fpGrade) || 'V0';
  var gMeta = (typeof LK_FP_GRADE_META !== 'undefined' && LK_FP_GRADE_META[grade]) || { label: '未定级', color: '#94a3b8' };
  var errCode = (rec && rec.errCode) || ((typeof lkClassifyErrorCode === 'function') ? lkClassifyErrorCode(null, rec) : 'E000');
  var eMeta = (typeof LK_ERR_META !== 'undefined' && LK_ERR_META[errCode]) || { label: errCode };
  var h = '<div style="margin:10px 16px 6px;padding:10px 12px;border-radius:10px;background:rgba(12,45,72,.38);border:1px solid rgba(56,189,248,.34)">';
  h += '<div style="display:flex;align-items:center;justify-content:space-between;gap:6px;flex-wrap:wrap;margin-bottom:6px">' +
    '<span style="font-size:11px;font-weight:700;color:' + chInfo.color + '">' + esc(chInfo.text) + '</span>' +
    '<span style="font-size:10.5px;font-weight:700;padding:1px 7px;border-radius:999px;background:' + gMeta.color + '22;color:' + gMeta.color + ';border:1px solid ' + gMeta.color + '55">' + esc(grade + ' · ' + gMeta.label) + '</span>' +
    '</div>';
  if (dCode) {
    h += '<div style="font-family:ui-monospace,Consolas,monospace;font-size:11.5px;font-weight:700;color:#e0f2fe;background:#080d18;border:1px solid rgba(56,189,248,.28);border-radius:7px;padding:6px 8px;word-break:break-all;letter-spacing:.02em">' + esc(dCode) + '</div>';
  }
  h += '<div style="display:flex;align-items:center;justify-content:space-between;gap:6px;margin-top:6px;font-size:10.5px;color:#94a3b8">' +
    '<span>报错归因：<b style="color:#e2e8f0">' + esc(errCode + ' · ' + eMeta.label) + '</b></span>' +
    '<span style="display:inline-flex;gap:5px">' +
      '<button type="button" data-ar6-card="copycode" style="padding:3px 8px;border-radius:6px;border:1px solid #38bdf8;background:#0c2d48;color:#f0f9ff;font-size:11px;font-weight:700;cursor:pointer">复制一码通</button>' +
      '<button type="button" data-ar6-card="decode" style="padding:3px 8px;border-radius:6px;border:1px solid rgba(148,163,184,.4);background:#162032;color:#cbd5e1;font-size:11px;cursor:pointer">解码/白名单</button>' +
    '</span></div>';
  h += '</div>';
  return h;
}

function cardText(rec) {
  if (!rec) return '';
  var d = new Date(Number(rec.at) || Date.now());
  var pad = function (n) { return (n < 10 ? '0' : '') + n; };
  var ts = d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()) + ' ' +
    pad(d.getHours()) + ':' + pad(d.getMinutes());
  var pk = cardPeek(rec);
  var dCode = cardDiagCodeOf(rec);
  var chInfo = cardChannelSummary(rec);
  var lines = [];
  lines.push('【卢克之光 · 诊断证据卡】' + ts);
  if (dCode) lines.push('一码通：' + dCode);
  lines.push('通道：' + chInfo.text + ' ｜ 真伪定级：' + (rec.fpGrade || 'V0') + ' ｜ 报错码：' + (rec.errCode || 'E000'));
  lines.push('判定：' + (rec.verdict || '') + '（证据等级 ' + (rec.conf || 'C') + '）');
  lines.push(cardOneLine(rec));
  lines.push('原因：' + (rec.note || '—'));
  lines.push(reportTimelineText(rec));
  if (pk) {
    lines.push('硬指纹：原生modelVersion=' + (pk.nativeModelVersion || '无') + ' ｜ 回显model=' + (pk.respModel || pk.model || '无') + ' ｜ thoughtSignature=' + (pk.hasThoughtSig ? '有' : '无') + ' ｜ 响应ID=' + (pk.idKind || 'none') + (pk.sysFp ? ('/' + pk.sysFp) : ''));
  }
  if (pk && pk.raw) lines.push('原始片段：' + pk.raw.slice(0, 240));
  lines.push('版本：卢克之光 V' + VERSION + '（光之守护）');
  return lines.join('\n');
}

function cardCopy(rec) {
  var txt = cardText(rec);
  try {
    if (HOST.navigator && HOST.navigator.clipboard && HOST.navigator.clipboard.writeText) {
      HOST.navigator.clipboard.writeText(txt).then(function () {
        banner('诊断报告文本已复制', 'ok');
      })['catch'](function () { cardCopyFallback(txt); });
      return;
    }
  } catch (e) {}
  cardCopyFallback(txt);
}

function cardCopyFallback(txt) {
  try {
    var ta = DOC.createElement('textarea');
    ta.value = txt;
    ta.setAttribute('style', 'position:fixed;left:-9999px;top:0;opacity:0');
    DOC.body.appendChild(ta);
    ta.select();
    DOC.execCommand('copy');
    DOC.body.removeChild(ta);
    banner('诊断报告文本已复制', 'ok');
  } catch (e) {
    banner('复制失败，请直接截图保存', 'warn');
  }
}

function cardBars(vals, color) {
  var arr = (vals || []).filter(function (v) { return typeof v === 'number' && isFinite(v); });
  if (!arr.length) return '';
  var max = Math.max.apply(null, arr);
  var h = '';
  for (var i = 0; i < arr.length; i++) {
    var pct = max > 0 ? Math.max(6, Math.round(arr[i] / max * 100)) : 6;
    var last = i === arr.length - 1;
    h += '<div style="flex:1;display:flex;align-items:flex-end;height:34px">' +
      '<div style="width:100%;height:' + pct + '%;background:' + (last ? color : '#0284c7') +
      ';border-radius:2px"></div></div>';
  }
  return '<div style="display:flex;gap:2px;align-items:flex-end">' + h + '</div>';
}

function cardOverlayCss() {
  var mob = false;
  try { mob = (typeof uiMode === 'function' && uiMode() === 'mobile'); } catch (e) {}
  if (!mob) return 'position:fixed;inset:0;display:flex;align-items:center;justify-content:center;padding:12px;';
  return 'position:fixed;left:0;top:0;width:100vw;height:var(--TH-viewport-height,100vh);' +
    'display:flex;align-items:center;justify-content:center;padding:12px;overflow-y:auto;';
}

function cardBoxMaxH(vhPct) {
  var mob = false;
  try { mob = (typeof uiMode === 'function' && uiMode() === 'mobile'); } catch (e) {}
  if (!mob) return vhPct + 'vh';
  return 'calc(var(--TH-viewport-height,100vh) - 24px)';
}

function cardTabBar(tab) {
  var on = 'background:linear-gradient(135deg,#0284c7,#0c2d48);border:1px solid #38bdf8;color:#f0f9ff;font-weight:700';
  var off = 'background:#162032;border:1px solid rgba(148,163,184,.34);color:#94a3b8;font-weight:600';
  var h = '<div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;padding:12px 16px 2px">';
  h += '<button type="button" data-ar6-card="tab" data-tab="human" style="min-height:34px;border-radius:8px;font-size:13px;cursor:pointer;' + (tab === 'engine' ? off : on) + '">诊断报告</button>';
  h += '<button type="button" data-ar6-card="tab" data-tab="engine" style="min-height:34px;border-radius:8px;font-size:13px;cursor:pointer;' + (tab === 'engine' ? on : off) + '">底层数据</button>';
  return h + '</div>';
}

function cardHumanVerdict(rec) {
  var c = rec.code;
  if (c === 'diff') return { t: '检测到疑似更换/降级模型（V4）', s: '请求模型与上游实测返回模型不一致，可直接复制一码通或截图留存证据。', c: '#f43f5e' };
  if (c === 'suspect') return { t: '触发特征倒挂 · 高度疑似后台掉包（V3）', s: (rec.fpNote || '高档模型零思考且瞬出/极速、且渠道未提供任何厂商原生硬指纹（modelVersion / thoughtSignature），高度疑似暗中切到快模型或劣质套壳。'), c: '#f97316' };
  if (c === 'thin') return { t: '模型名一致，但未观测到思考输出（V3）', s: '该渠道此前存在思考输出而本轮思考 token 为 0，疑似思考预算被压缩或切到非思考链路。', c: '#fcd34d' };
  if (c === 'same') {
    if (rec.fpGrade === 'V2') {
      return { t: '模型名一致，但缺少原生硬指纹（V2 软一致）', s: '中转回包里的模型名与请求一致且节律未见明显倒挂，但未采到原生 modelVersion / thoughtSignature 等硬证（可能是网关仅原样回显名称），建议点「真伪探针」复核。', c: '#fcd34d' };
    }
    return { t: '本轮模型核验一致' + (rec.fpGrade === 'V1' ? '（V1 原生硬证验真）' : ''), s: (rec.fpNote || '上游返回的模型标识与你请求的模型一致，且命中厂商原生特征，未发现明显跨代或降档特征。'), c: '#34d399' };
  }
  if (c === 'echo') return { t: '渠道仅原样回显模型名', s: '经探针核验该网关不校验请求的 model 字段，因此返回同名仅作参考、不作硬证据。', c: '#94a3b8' };
  if (c === 'skip') {
    if (/只查 Gemini/i.test(String(rec.note || ''))) {
      return { t: '非 Gemini 模型（当前已跳过核验）', s: '当前开启了「仅监测 Gemini 家族」。若你正在使用 Claude、DeepSeek、GPT 等模型，请前往第 4 栏「防卫设置」关闭「仅监测 Gemini 家族」。', c: '#38bdf8' };
    }
    return { t: '已按扫描过滤规则跳过', s: '该请求模型命中了你在「防卫设置」中设置的过滤范围，未执行路由比对。', c: '#38bdf8' };
  }
  if (c === 'aux') return { t: '后台辅助请求（不计入调包率）', s: '该轮属于摘要、自动标题或替写类辅助生成，已开启「仅统计正文对话」，不计入被换率。', c: '#94a3b8' };
  if (c === 'quota') return { t: '上游额度或频率受限（HTTP 429）', s: '这是接口限流而非偷换模型，可开启逆风重抽（PVP）自动退避重发。', c: '#a78bfa' };
  if (c === 'blocked') return { t: '请求被上游安全策略拦截', s: '属于内容审查拦截而非模型降档，可切换迪迦形态或开启设定词脱敏。', c: '#f43f5e' };
  if (c === 'gate') return { t: '上游网关返回异常（5xx）', s: '中转站或上游节点繁忙报错，可开启 503 自动重连或飞燕编队抢跑。', c: '#fb923c' };
  if (c === 'empty') {
    if (/确认空回/.test(String(rec.note || ''))) {
      return { t: '本轮响应确认为 0 字空回', s: '响应体与聊天栏均无正文文字，可点击「强行破甲补写」或「本轮原样重发」。', c: '#fcd34d' };
    }
    return { t: '未采到正文文本', s: '本轮未从响应流取到正文（可能是特殊格式或取样被跳过），暂不判为降级。', c: '#94a3b8' };
  }
  if (c === 'error') return { t: '请求发送或响应报错', s: 'HTTP 请求未成功返回，请检查酒馆 API 连接配置与密钥额度。', c: '#f43f5e' };
  return { t: '上游未回传模型身份字段', s: '本轮正文已正常返回，但中转站抹去了响应体里的 model / modelVersion 标识；可点击主面板「真伪探针」主动验明渠道，或依靠手感记忆与回包指纹持续监测。', c: '#94a3b8' };
}

function cardEvidenceItems(rec) {
  var cp = reportCapture(rec);
  var pk = cardPeek(rec);
  var bodyModel = (pk && (pk.modelVersion || pk.model)) || (rec && rec.served) || '';
  var it = [];
  var fromBody = String(rec.src || '') === 'body' || !!bodyModel;
  var shownModel = bodyModel || (fromBody && rec.obs && rec.obs !== '—' ? rec.obs : '');
  var anyObs = shownModel || (rec.obs && rec.obs !== '—' ? rec.obs : '');
  var matched = cardModelsMatch(rec.req, anyObs);

  it.push({
    k: '响应体里的模型标识',
    v: shownModel || (rec.obs && rec.obs !== '—' ? rec.obs + '（来自酒馆消息标签，非响应体直读）' : '未取得（该渠道响应体未携带 model 字段）'),
    lv: shownModel ? '强' : (rec.obs && rec.obs !== '—' ? '弱' : '缺失')
  });
  it.push({
    k: '与请求的模型是否一致',
    v: matched
      ? (shownModel && rec.verifiable === 'yes' ? '一致（响应体实测且渠道按名分发）' : (shownModel ? '一致（' + shownModel + '）' : '一致（可能是标签回显）'))
      : (anyObs ? ('不一致（请求 ' + (rec.req || '—') + ' vs 实测 ' + anyObs + '）') : '未取得'),
    lv: matched ? (shownModel && rec.verifiable !== 'no' ? '强' : '弱') : (anyObs ? '强' : '缺失')
  });
  var tc = cp.thinkChars;
  var tk = cp.thinkTokens;
  var hasTh = (tc != null && Number(tc) > 0) || (tk != null && Number(tk) > 0) || rec.think === 1;
  var zeroTh = !hasTh && (tc === 0 || tk === 0 || rec.think === 0);
  it.push({
    k: '有没有思考内容',
    v: hasTh ? '有' : (zeroTh ? '没有' : '未观测'),
    lv: hasTh ? '形态' : (zeroTh ? '弱' : '缺失')
  });
  if (rec.bodyText) it.push({ k: '正文是怎么拿到的', v: '从 HTTP 响应流直接解析取得', lv: '形态' });
  it.push({ k: '思考 token 数', v: tk == null ? '未计量（渠道未返回 reasoning_tokens）' : String(tk), lv: tk == null ? '缺失' : '形态' });
  it.push({ k: '正文字符数', v: reportValue(cp.bodyChars, ' 字'), lv: (cp.bodyChars != null) ? '形态' : '缺失' });
  it.push({ k: '首字节 / 首思考 / 首正文', v: reportValue(cp.firstByteMs, ' ms') + ' / ' + reportValue(cp.firstThinkMs, ' ms') + ' / ' + reportValue(cp.firstContentMs, ' ms'), lv: (cp.firstContentMs != null || cp.firstByteMs != null) ? '形态' : '缺失' });
  it.push({ k: '采样状态 / 来源', v: reportValue(cp.status) + ' / ' + reportValue(cp.source), lv: cp.status != null || cp.source != null ? '形态' : '缺失' });
  it.push({ k: '收尾原因 / 晚到合并', v: reportValue(cp.settleReason) + ' / ' + (cp.lateReconciled == null ? '未知' : (cp.lateReconciled ? '是' : '否')), lv: cp.settleReason != null || cp.lateReconciled != null ? '形态' : '缺失' });
  var chInfo = cardChannelSummary(rec);
  it.push({
    k: '接入通道与匿名域哈希',
    v: chInfo.text,
    lv: (chInfo.code === 'OFF' || chInfo.wlHit) ? '强' : '形态'
  });
  var natMv = (pk && pk.nativeModelVersion) || '';
  it.push({
    k: '原生 modelVersion（防回显伪造）',
    v: natMv ? natMv : (shownModel ? ('未返回（仅收到 OpenAI 回显 model=' + shownModel + '）') : '未取得'),
    lv: natMv ? '强' : '缺失'
  });
  it.push({
    k: '思考加密签名 (thoughtSignature)',
    v: (pk && pk.hasThoughtSig) ? '已采到厂商原生思考签名（极难伪造）' : '未返回',
    lv: (pk && pk.hasThoughtSig) ? '强' : '缺失'
  });
  it.push({
    k: '响应 ID 拓扑 / 系统指纹',
    v: (pk && (pk.respId || pk.sysFp)) ? ((pk.idKind || 'none') + (pk.respId ? (' · ' + String(pk.respId).slice(0, 28)) : '') + (pk.sysFp ? (' · ' + pk.sysFp) : '')) : '未取得',
    lv: (pk && (pk.idKind === 'gem_nat' || pk.idKind === 'anth_msg' || pk.sysFp)) ? '强' : ((pk && pk.respId) ? '形态' : '缺失')
  });
  return it;
}

function cardTally(items) {
  var r = { strong: 0, shape: 0, weak: 0, missing: 0 };
  for (var i = 0; i < items.length; i++) {
    var lv = items[i].lv;
    if (lv === '强') r.strong++;
    else if (lv === '形态') r.shape++;
    else if (lv === '弱') r.weak++;
    else r.missing++;
  }
  return r;
}

function cardCodeLabel(code) {
  var m = {
    diff: '疑似调包', suspect: '高疑掉包', thin: '未见思考', empty: '0字空回', same: '核验一致',
    echo: '标签回显', unknown: '未回传模型名', skip: '范围外跳过', aux: '辅助请求',
    quota: '配额限流', blocked: '安全拦截', gate: '网关异常', error: '请求失败'
  };
  return m[code] || String(code || '记录');
}

function cardEngineHTML(rec) {
  var pk = cardPeek(rec);
  var col = cardColor(rec.code);
  var shown = cardShownModel(rec);
  var obs = shown || '（上游未回传）';
  var obsCol = rec.code === 'diff' ? '#f43f5e' : (rec.code === 'same' ? '#34d399' : '#e2e8f0');
  var rate = cardRate(rec);
  var cp = reportCapture(rec);
  var thinkTxt = reportValue(cp.thinkTokens);
  var log = readLog().slice(0, 12).reverse();
  var charsArr = [];
  for (var i = 0; i < log.length; i++) { var cv = reportCapture(log[i]).bodyChars; if (cv != null && isFinite(Number(cv))) charsArr.push(Number(cv)); }
  var spark = cardSpark(charsArr);
  var h = '';
  h += '<style>#ar6-card,#ar6-card *{box-sizing:border-box;min-width:0}#ar6-card{animation:ar6-fade .14s linear}@media (prefers-reduced-motion:reduce){#ar6-card,#ar6-card>div{animation:none}}</style>';
  h += '<div id="ar6-card" style="' + cardOverlayCss() + 'z-index:2147483600;background:rgba(4,8,18,.84);font-family:system-ui,-apple-system,\'Microsoft YaHei\',sans-serif">';
  h += '<div style="width:420px;max-width:calc(100vw - 18px);max-height:' + cardBoxMaxH(92) + ';overflow-x:hidden;overflow-y:auto;background:linear-gradient(180deg,#0f182b 0%,#080d18 100%);color:#f0f9ff;border:1.5px solid rgba(148,163,184,.42);border-radius:16px;box-shadow:0 20px 56px rgba(2,6,23,.85)">';
  h += cardTabBar('engine');
  h += cardDiagBoxHTML(rec);
  h += reportTimelineHTML(rec);

  h += '<div style="background:' + col + '1f;border-bottom:2px solid ' + col + ';padding:12px 16px">';
  h += '<div style="font-size:18px;font-weight:700;color:' + col + ';line-height:1.3">' + esc(cardCodeLabel(rec.code)) + '</div>';
  h += '<div style="font-size:12px;color:#94a3b8;margin-top:5px">证据等级 <b style="color:#f0f9ff">' + esc(rec.conf || 'C') + '</b> · ' + esc(new Date(Number(rec.at) || Date.now()).toLocaleString()) + '</div>';
  h += '</div>';

  h += '<div style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;padding:12px 16px 6px">';
  h += '<div style="min-width:0;background:#162032;border:1px solid rgba(148,163,184,.28);border-radius:10px;padding:10px">' +
    '<div style="font-size:11px;color:#94a3b8">请求模型</div>' +
    '<div style="font-size:14px;font-weight:700;margin-top:4px;color:#7dd3fc;overflow-wrap:anywhere;word-break:break-word">' + esc(rec.req || '—') + '</div></div>';
  h += '<div style="min-width:0;background:#162032;border:1px solid rgba(148,163,184,.28);border-radius:10px;padding:10px">' +
    '<div style="font-size:11px;color:#94a3b8">上游实测回包</div>' +
    '<div style="font-size:14px;font-weight:700;margin-top:4px;overflow-wrap:anywhere;word-break:break-word;color:' + obsCol + '">' + esc(obs) + '</div></div>';
  h += '</div>';

  h += '<div style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;padding:8px 16px">';
  var cell = function (k, v, c) {
    return '<div style="background:#162032;border:1px solid rgba(148,163,184,.28);border-radius:10px;padding:8px 10px">' +
      '<div style="font-size:11px;color:#94a3b8">' + k + '</div>' +
      '<div style="font-size:16px;font-weight:700;margin-top:2px;color:' + (c || '#f0f9ff') + '">' + esc(String(v)) + '</div></div>';
  };
  h += cell('思考 token', thinkTxt, thinkTxt === '0' ? '#fcd34d' : '#f0f9ff');
  h += cell('首正文用时', reportValue(cp.firstContentMs, ' ms'));
  h += cell('正文字数', reportValue(cp.bodyChars));
  h += cell('吐字速率', rate ? (rate + ' 字/秒') : '未知', rate >= 120 ? '#fcd34d' : '#f0f9ff');
  h += '</div>';

  h += '<div style="padding:4px 16px 10px;font-size:12px;color:#cbd5e1;line-height:1.55">判定依据：' + esc(rec.note || '—') + '</div>';

  if (rec.trunc) {
    h += '<div style="padding:0 16px 10px;font-size:12px;color:#fcd34d;line-height:1.5">本轮停止原因：' + esc(rec.truncNote || rec.trunc) + '</div>';
  }
  var bl = '';
  try { bl = baseLine(rec); } catch (eBj) {}
  if (bl) h += '<div style="padding:0 16px 10px;font-size:12px;color:#fcd34d;line-height:1.5">手感记忆比对：' + esc(bl) + '</div>';
  var sl = '';
  try { sl = shapeLine(rec); } catch (eSh) {}
  if (sl) h += '<div style="padding:0 16px 10px;font-size:12px;color:#fcd34d;line-height:1.5">回包指纹核验：' + esc(sl) + '</div>';

  if (pk && pk.raw) {
    h += '<div style="margin:0 16px 10px;background:#080d18;border:1px solid rgba(56,189,248,.28);border-radius:10px;padding:10px">' +
      '<div style="font-size:11px;color:#7dd3fc;margin-bottom:4px">响应流原始帧片段（未经加工）</div>' +
      '<div style="font-family:ui-monospace,Consolas,monospace;font-size:10.5px;color:#a7f3d0;word-break:break-all;line-height:1.45;max-height:104px;overflow:auto">' +
      esc(pk.raw) + '</div></div>';
  } else {
    h += '<div style="margin:0 16px 10px;font-size:11.5px;color:#94a3b8">（本轮无原始流片段存档：历史旧记录或响应为空）</div>';
  }

  if (spark) {
    h += '<div style="padding:0 16px 10px">' +
      '<div style="font-size:11px;color:#94a3b8;margin-bottom:4px">近 ' + charsArr.length + ' 轮正文字数趋势（最右为本轮）</div>' +
      cardBars(charsArr, col) + '</div>';
  }

  h += '<div style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;padding:12px 16px 14px;border-top:1px solid rgba(148,163,184,.22)">';
  h += '<button type="button" data-ar6-card="copy" style="min-height:40px;background:#0c2d48;border:1px solid #38bdf8;border-radius:9px;color:#f0f9ff;font-size:13.5px;font-weight:700;cursor:pointer">复制报告文本</button>';
  h += '<button type="button" data-ar6-card="close" style="min-height:40px;background:#162032;border:1px solid rgba(148,163,184,.36);border-radius:9px;color:#cbd5e1;font-size:13.5px;cursor:pointer">关闭</button>';
  h += '</div>';
  h += '<div style="padding:0 16px 12px;font-size:10.5px;color:#64748b">卢克之光 V' + esc(VERSION || '') + ' · 渠道 ' + esc(rec.base || '—') + '</div>';
  h += '</div></div>';
  return h;
}

function cardHumanHTML(rec) {
  var cp = reportCapture(rec);
  var bodyChars = cp.bodyChars;
  var totalMs = cp.totalMs;
  var v = cardHumanVerdict(rec);
  var items = cardEvidenceItems(rec);
  var tally = cardTally(items);
  var rate = cardRate(rec);
  var shown = cardShownModel(rec);
  var bl = '';
  try { bl = baseLine(rec); } catch (eBj) {}
  var sl = '';
  try { sl = shapeLine(rec); } catch (eSh) {}
  var lvColor = { '强': '#34d399', '形态': '#38bdf8', '弱': '#fcd34d', '缺失': '#64748b' };
  var h = '';
  h += '<style>#ar6-card,#ar6-card *{box-sizing:border-box;min-width:0}#ar6-card{animation:ar6-fade .14s linear}@media (prefers-reduced-motion:reduce){#ar6-card,#ar6-card>div{animation:none}}</style>';
  h += '<div id="ar6-card" style="' + cardOverlayCss() + 'z-index:2147483600;background:rgba(4,8,18,.84);font-family:system-ui,-apple-system,\'Microsoft YaHei\',sans-serif">';
  h += '<div style="width:420px;max-width:calc(100vw - 18px);max-height:' + cardBoxMaxH(92) + ';overflow-x:hidden;overflow-y:auto;background:linear-gradient(180deg,#0f182b 0%,#080d18 100%);color:#f0f9ff;border:1.5px solid rgba(148,163,184,.42);border-radius:16px;box-shadow:0 20px 56px rgba(2,6,23,.85)">';
  h += cardTabBar('human');
  h += '<div data-ar6-cardbody="1" style="padding:14px 16px 10px;border-bottom:1px solid rgba(148,163,184,.22)">';
  h += '<div style="display:inline-block;font-size:11px;padding:2px 9px;border-radius:999px;background:' + v.c + '22;color:' + v.c + ';border:1px solid ' + v.c + '55;margin-bottom:8px;font-weight:700">' + esc(cardCodeLabel(rec.code)) + '</div>';
  h += '<div style="font-size:19px;font-weight:700;line-height:1.35;color:' + v.c + '">' + esc(v.t) + '</div>';
  h += '<div style="font-size:12.5px;color:#cbd5e1;line-height:1.58;margin-top:6px">' + esc(v.s) + '</div>';
  if (rec.note) {
    h += '<div style="margin-top:8px;padding:7px 10px;border-radius:8px;background:rgba(12,45,72,.45);border:1px solid rgba(56,189,248,.25);font-size:11.8px;color:#e2e8f0;line-height:1.5">本轮详情：' + esc(rec.note) + '</div>';
  }
  h += '</div>';

  h += cardDiagBoxHTML(rec);

  /* 请求模型 vs 实测模型 直观对照栏 */
  h += '<div style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:6px;padding:10px 16px 4px">';
  h += '<div style="background:#162032;border:1px solid rgba(148,163,184,.28);border-radius:8px;padding:7px 9px">' +
    '<div style="font-size:10.5px;color:#94a3b8">请求模型</div>' +
    '<div style="font-size:13.5px;font-weight:700;color:#7dd3fc;margin-top:2px;overflow-wrap:anywhere">' + esc(rec.req && rec.req !== '—' ? rec.req : '未识别') + '</div></div>';
  h += '<div style="background:#162032;border:1px solid rgba(148,163,184,.28);border-radius:8px;padding:7px 9px">' +
    '<div style="font-size:10.5px;color:#94a3b8">实测回包模型</div>' +
    '<div style="font-size:13.5px;font-weight:700;color:' + (shown ? (rec.code === 'diff' ? '#fda4af' : '#6ee7b7') : '#94a3b8') + ';margin-top:2px;overflow-wrap:anywhere">' + esc(shown || '渠道未回传') + '</div></div>';
  h += '</div>';

  /* 耗时 / 速率 / 字数 三格读数 */
  h += '<div style="display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:6px;padding:4px 16px 4px;text-align:center">';
  h += '<div style="background:#162032;border:1px solid rgba(148,163,184,.24);border-radius:8px;padding:6px 4px"><div style="font-size:15px;font-weight:700;color:#f0f9ff">' + (isFinite(Number(totalMs)) && totalMs != null ? (Math.round(Number(totalMs) / 100) / 10) + 's' : '未知') + '</div><div style="font-size:10px;color:#94a3b8;margin-top:2px">总耗时</div></div>';
  h += '<div style="background:#162032;border:1px solid rgba(148,163,184,.24);border-radius:8px;padding:6px 4px"><div style="font-size:15px;font-weight:700;color:#f0f9ff">' + (rate ? (rate + ' 字/s') : '未知') + '</div><div style="font-size:10px;color:#94a3b8;margin-top:2px">吐字速率</div></div>';
  h += '<div style="background:#162032;border:1px solid rgba(148,163,184,.24);border-radius:8px;padding:6px 4px"><div style="font-size:15px;font-weight:700;color:#f0f9ff">' + esc(reportValue(bodyChars)) + '</div><div style="font-size:10px;color:#94a3b8;margin-top:2px">正文字数</div></div>';
  h += '</div>';

  h += reportTimelineHTML(rec);
  h += '<div style="padding:6px 16px 4px;font-size:12px;font-weight:700;color:#7dd3fc">核验证据清单</div>';
  h += '<div style="padding:2px 16px 8px">';
  for (var i = 0; i < items.length; i++) {
    var it = items[i];
    var c = lvColor[it.lv] || '#94a3b8';
    h += '<div style="display:flex;align-items:flex-start;gap:8px;padding:5px 0;border-bottom:1px dashed rgba(148,163,184,.18)">' +
      '<div style="flex:0 0 auto;font-size:10px;padding:1px 6px;border-radius:999px;background:' + c + '22;color:' + c + ';border:1px solid ' + c + '55;margin-top:1px;font-weight:700">' + esc(it.lv) + '</div>' +
      '<div style="flex:1 1 auto;font-size:12.3px;color:#e2e8f0;line-height:1.45">' + esc(it.k) +
      '<div style="font-size:11.2px;color:#94a3b8;margin-top:1px;overflow-wrap:anywhere">' + esc(String(it.v)) + '</div></div></div>';
  }
  h += '</div>';
  h += '<div style="margin:0 16px 10px;padding:9px 10px;background:#162032;border:1px solid rgba(148,163,184,.28);border-radius:8px;font-size:12px;color:#cbd5e1;line-height:1.5">' +
    '强证据 <b style="color:#34d399">' + tally.strong + '</b> · 形态 <b style="color:#38bdf8">' + tally.shape + '</b> · 弱 <b style="color:#fcd34d">' + tally.weak + '</b> · 缺失 <b style="color:#64748b">' + tally.missing + '</b>' +
    '<div style="font-size:11px;color:#94a3b8;margin-top:3px">说明：响应体直读且非回显渠道计为「强」；仅消息标签或回显渠道计为「弱」。</div></div>';
  if (bl) h += '<div style="margin:0 16px 10px;font-size:12px;color:#fcd34d;line-height:1.5">手感记忆比对：' + esc(bl) + '</div>';
  if (sl) h += '<div style="margin:0 16px 10px;font-size:12px;color:#fcd34d;line-height:1.5">回包指纹核验：' + esc(sl) + '</div>';
  h += '<div style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;padding:10px 16px 14px;border-top:1px solid rgba(148,163,184,.22)">';
  h += '<button type="button" data-ar6-card="copy" style="min-height:40px;background:#0c2d48;border:1px solid #38bdf8;border-radius:9px;color:#f0f9ff;font-size:13.5px;font-weight:700;cursor:pointer">复制报告文本</button>';
  h += '<button type="button" data-ar6-card="close" style="min-height:40px;background:#162032;border:1px solid rgba(148,163,184,.36);border-radius:9px;color:#cbd5e1;font-size:13.5px;cursor:pointer">关闭</button>';
  h += '</div>';
  h += '<div style="padding:0 16px 12px;font-size:10.5px;color:#64748b">' + esc(new Date(Number(rec.at) || Date.now()).toLocaleString()) + ' · 卢克之光 V' + esc(VERSION || '') + ' · 渠道 ' + esc(rec.base || '—') + '</div>';
  h += '</div></div>';
  return h;
}

function cardHTML(rec, tab) {
  var t = tab === 'human' ? 'human' : 'engine';
  if (t === 'human') return cardHumanHTML(rec);
  return cardEngineHTML(rec);
}

function closeCard() {
  CARD.open = false;
  /* V5.0：独立管理证据卡与确认框，绝不误关《功能图鉴》(#ar6-help) */
  try {
    var el = DOC.getElementById('ar6-card');
    if (el && el.parentNode) el.parentNode.removeChild(el);
  } catch (e) {}
  try {
    var ex = DOC.querySelectorAll('[data-ar6-extra="1"]');
    for (var i = 0; i < ex.length; i++) {
      if (ex[i] && ex[i].id !== 'ar6-help' && ex[i].parentNode) ex[i].parentNode.removeChild(ex[i]);
    }
  } catch (e2) {}
}

function mountHTML(html) {
  try { closeCard(); } catch (eOld) {}
  var frag = DOC.createElement('div');
  frag.innerHTML = html;
  var node = null;
  var guard = 0;
  while (guard++ < 40) {
    var c = frag.firstChild;
    if (!c) break;
    try { frag.removeChild(c); } catch (eR) {}
    if (c && c.id === 'ar6-card') node = c;
    else { try { c.setAttribute('data-ar6-extra', '1'); } catch (eX) {} }
    DOC.body.appendChild(c);
  }
  if (!node) { try { node = DOC.getElementById('ar6-card'); } catch (eG) {} }
  return node;
}

function openCard(rec, tab) {
  try {
    if (!rec) {
      var log = readLog() || [];
      for (var i = 0; i < log.length; i++) {
        if (log[i] && !log[i].internal) { rec = log[i]; break; }
      }
      if (!rec) rec = log[0] || null;
      if (!rec) {
        var hint = (typeof DET !== 'undefined' && DET && DET.gen > 0 && typeof detVerdict === 'function')
          ? ('（' + detVerdict() + '）')
          : '：请先正常发送一轮对话，系统会自动采集并生成诊断报告';
        banner('暂无可展示的对话采样记录' + hint, 'gray', true);
        return;
      }
    }
    closeCard();
    var node = mountHTML(cardHTML(rec, tab));
    if (!node) throw new Error('mount failed');
    CARD.open = true;
    CARD.rid = rec.rid || 0;
    node.addEventListener('click', function (ev) {
      var t = ev && ev.target;
      if (t === node) { closeCard(); return; }
      var btn = null, cur = t;
      while (cur && cur !== node) {
        if (cur.getAttribute && cur.getAttribute('data-ar6-card')) { btn = cur; break; }
        cur = cur.parentNode;
      }
      if (!btn) return;
      var act = btn.getAttribute('data-ar6-card') || '';
      if (act === 'copy') { cardCopy(rec); return; }
      if (act === 'copycode') { diagCopyCode(rec); return; }
      if (act === 'decode') { openDiagModal(cardDiagCodeOf(rec), 'decode'); return; }
      if (act === 'tab') { openCard(rec, btn.getAttribute('data-tab')); return; }
      if (act === 'close') closeCard();
    });
  } catch (e) {
    try { banner('诊断报告渲染失败：' + String(e && e.message || e), 'bad', true); } catch (e2) {}
  }
}

/* ============================================================================
 * V5.77 — 一键复制一码通 + 离线解码器 & 本机私有公益站白名单弹窗
 * ========================================================================== */

function diagCopyRaw(txt, okMsg) {
  var s = String(txt || '');
  if (!s) return false;
  var copied = false;
  try {
    if (DOC && DOC.body && DOC.createElement) {
      var ta = DOC.createElement('textarea');
      ta.value = s;
      ta.setAttribute('readonly', '');
      ta.style.cssText = 'position:fixed;left:-9999px;top:0;opacity:0;font-size:16px;pointer-events:none';
      DOC.body.appendChild(ta);
      ta.focus();
      ta.select();
      try { ta.setSelectionRange(0, s.length); } catch (eSel) {}
      copied = !!(DOC.execCommand && DOC.execCommand('copy'));
      DOC.body.removeChild(ta);
    }
  } catch (e0) { copied = false; }
  if (copied) {
    try { banner(okMsg || '一码通已复制', 'ok', true); } catch (eB0) {}
    return true;
  }
  try {
    if (HOST && HOST.navigator && HOST.navigator.clipboard && HOST.navigator.clipboard.writeText) {
      HOST.navigator.clipboard.writeText(s).then(function () {
        try { banner(okMsg || '一码通已复制', 'ok', true); } catch (eB1) {}
      })['catch'](function () {
        try { banner('复制失败，请手动选中一码通复制', 'warn', true); } catch (eB2) {}
      });
      return true;
    }
  } catch (e1) {}
  try { banner('复制失败，请手动选中一码通复制', 'warn', true); } catch (eB3) {}
  return false;
}

function diagCopyCode(rec) {
  var code = cardDiagCodeOf(rec);
  if (!code) {
    try { banner('暂无可生成的一码通诊断码', 'warn', true); } catch (e0) {}
    return '';
  }
  diagCopyRaw(code, '一码通已复制：' + code);
  return code;
}

var DIAG_MODAL = { open: false, tab: 'decode', input: '', decoded: null };

function closeDiagModal() {
  DIAG_MODAL.open = false;
  try {
    var el = DOC && DOC.getElementById && DOC.getElementById('ar6-diag-modal');
    if (el && el.parentNode) el.parentNode.removeChild(el);
  } catch (e) {}
}

function diagDecodeResultHTML(res) {
  if (!res) return '<div style="font-size:12px;color:#94a3b8;padding:8px 0">在上方粘贴任意 <b>LK77-...</b> 一码通（可直接粘贴整段群聊消息，自动提取），点「立即解码」即可离线验签并展开全部字段。</div>';
  if (!res.ok && !res.tamper) {
    return '<div style="padding:10px 12px;border-radius:9px;background:rgba(244,63,94,.14);border:1px solid rgba(244,63,94,.45);color:#fda4af;font-size:12.5px">' + esc(res.error) + '</div>';
  }
  var h = '';
  if (res.tamper) {
    h += '<div style="margin-bottom:8px;padding:9px 11px;border-radius:9px;background:rgba(244,63,94,.2);border:1px solid #f43f5e;color:#fda4af;font-size:12px;font-weight:700">❌ ' + esc(res.error) + '</div>';
  } else {
    h += '<div style="margin-bottom:8px;padding:7px 11px;border-radius:9px;background:rgba(52,211,153,.14);border:1px solid rgba(52,211,153,.45);color:#6ee7b7;font-size:12px;font-weight:700">✓ 防伪校验通过（未篡改） · V' + esc(res.version) + ' · ' + esc(res.platform) + '</div>';
  }
  var row = function (k, v, col) {
    return '<div style="display:flex;justify-content:space-between;gap:10px;padding:6px 0;border-bottom:1px dashed rgba(148,163,184,.2);font-size:12px">' +
      '<span style="color:#94a3b8;flex:0 0 auto">' + esc(k) + '</span>' +
      '<span style="color:' + (col || '#f0f9ff') + ';font-weight:700;text-align:right;overflow-wrap:anywhere">' + esc(v) + '</span></div>';
  };
  h += '<div style="background:#111b2e;border:1px solid rgba(148,163,184,.28);border-radius:10px;padding:6px 11px">';
  h += row('接入通道', res.channelVerdict, res.channelColor);
  h += row('请求 → 实测模型', res.reqModel + ' → ' + res.obsModel + (res.modelMismatch ? '（不符）' : (res.obsOmitted ? '（未回传）' : '（同名）')), res.modelMismatch ? '#fda4af' : '#7dd3fc');
  h += row('四维真伪定级', res.grade + ' · ' + res.gradeMeta.label, res.gradeMeta.color);
  h += row('首字 / 速率 / 思考', (res.ttftSec ? (res.ttftSec.toFixed(1) + 's') : '未知') + ' · ' + (res.netCps ? (res.netCps + ' 字/s') : '未知') + ' · ' + res.thinkDesc, '#e2e8f0');
  h += row('报错归因', res.errCode + ' · ' + res.errMeta.label, res.errCode === 'E000' ? '#34d399' : '#fcd34d');
  h += '</div>';
  h += '<div style="margin-top:8px;padding:8px 10px;border-radius:9px;background:#080d18;border:1px solid rgba(56,189,248,.22);font-size:11.5px;color:#cbd5e1;line-height:1.55">';
  h += '<div><b style="color:#7dd3fc">硬证清单：</b>' + esc(res.proofs.length ? res.proofs.join(' ｜ ') : '无任何厂商原生硬证（仅回显或未上报）') + '</div>';
  if (res.flags.length) h += '<div style="color:#fda4af;margin-top:4px"><b>异常告警：</b>' + esc(res.flags.join(' ｜ ')) + '</div>';
  h += '<div style="color:#94a3b8;margin-top:4px">' + esc(res.gradeMeta.desc) + '</div>';
  h += '</div>';
  return h;
}

function diagWhitelistHTML() {
  var list = (typeof lkPubWlRead === 'function') ? lkPubWlRead() : [];
  var curCh = cardChannelSummary(null);
  var h = '<div style="font-size:11.8px;color:#cbd5e1;line-height:1.55;margin-bottom:8px;padding:8px 10px;border-radius:9px;background:rgba(56,189,248,.1);border:1px solid rgba(56,189,248,.28)">' +
    '<b>隐私承诺：</b>公益站白名单<b>仅存你自己的浏览器 localStorage</b>，开源代码零硬编码域名；输入网址后会自动转为 <b>4 位不可逆加盐哈希</b>，连本机都不存明文网址。</div>';
  h += '<div style="display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:8px;padding:7px 10px;border-radius:8px;background:#162032;border:1px solid rgba(148,163,184,.28);font-size:11.5px">' +
    '<span style="color:#cbd5e1;overflow-wrap:anywhere">当前渠道：<b>' + esc(curCh.text) + '</b></span>' +
    ((curCh.hash && curCh.hash !== '0000' && !curCh.wlHit)
      ? '<button type="button" data-ar6-dm="regcur" style="flex:0 0 auto;padding:4px 8px;border-radius:6px;border:1px solid #34d399;background:rgba(52,211,153,.16);color:#6ee7b7;font-size:11px;font-weight:700;cursor:pointer">登记当前为公益站</button>'
      : '') +
    '</div>';
  h += '<textarea data-ar6-dm-in="wl" rows="3" placeholder="每行一条，支持：\n类脑公益1号=https://你的公益站域名\n或直接按哈希：类脑公益2号=#7K2M" style="width:100%;padding:8px 10px;border-radius:9px;border:1px solid rgba(148,163,184,.36);background:#080d18;color:#f0f9ff;font-size:12px;font-family:ui-monospace,Consolas,monospace;resize:vertical"></textarea>';
  h += '<div style="display:flex;gap:8px;margin:8px 0 10px">' +
    '<button type="button" data-ar6-dm="wladd" style="flex:1;min-height:36px;border-radius:8px;border:1px solid #34d399;background:rgba(52,211,153,.18);color:#6ee7b7;font-size:12.5px;font-weight:700;cursor:pointer">转为哈希并存入本机白名单</button>' +
    '</div>';
  h += '<div style="font-size:11.5px;font-weight:700;color:#7dd3fc;margin-bottom:5px">本机已登记公益站（' + list.length + ' 个）</div>';
  if (!list.length) {
    h += '<div style="font-size:11.5px;color:#94a3b8;padding:8px 0">暂未登记任何公益站。添加后，解码一码通或查看报告时会自动高亮标注「✅ 已登记公益站」。</div>';
  } else {
    for (var i = 0; i < list.length; i++) {
      h += '<div style="display:flex;align-items:center;justify-content:space-between;gap:8px;padding:6px 9px;margin-bottom:5px;border-radius:8px;background:#162032;border:1px solid rgba(148,163,184,.24);font-size:12px">' +
        '<span><b style="color:#6ee7b7">' + esc(list[i].label) + '</b> <code style="color:#7dd3fc">#' + esc(list[i].hash) + '</code></span>' +
        '<button type="button" data-ar6-dm="wldel" data-hash="' + esc(list[i].hash) + '" style="padding:2px 7px;border-radius:6px;border:1px solid rgba(244,63,94,.45);background:rgba(244,63,94,.14);color:#fda4af;font-size:11px;cursor:pointer">删除</button>' +
        '</div>';
    }
  }
  return h;
}

function diagModalHTML() {
  var on = 'background:linear-gradient(135deg,#0284c7,#0c2d48);border:1px solid #38bdf8;color:#f0f9ff;font-weight:700';
  var off = 'background:#162032;border:1px solid rgba(148,163,184,.34);color:#94a3b8;font-weight:600';
  var isWl = DIAG_MODAL.tab === 'whitelist';
  var h = '<div id="ar6-diag-modal" style="' + cardOverlayCss() + 'z-index:2147483605;background:rgba(4,8,18,.86);font-family:system-ui,-apple-system,\'Microsoft YaHei\',sans-serif">';
  h += '<div style="width:440px;max-width:calc(100vw - 18px);max-height:' + cardBoxMaxH(92) + ';overflow-x:hidden;overflow-y:auto;background:linear-gradient(180deg,#0f182b 0%,#080d18 100%);color:#f0f9ff;border:1.5px solid rgba(56,189,248,.45);border-radius:16px;box-shadow:0 20px 56px rgba(2,6,23,.88);padding:14px 16px">';
  h += '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px">' +
    '<div style="font-size:15.5px;font-weight:700;color:#7dd3fc">光鉴一码通 · 离线解码与公益站名单</div>' +
    '<button type="button" data-ar6-dm="close" style="width:28px;height:28px;border-radius:7px;border:1px solid rgba(148,163,184,.38);background:#162032;color:#cbd5e1;cursor:pointer">✕</button>' +
    '</div>';
  h += '<div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-bottom:12px">' +
    '<button type="button" data-ar6-dm="tab" data-tab="decode" style="min-height:34px;border-radius:8px;font-size:12.5px;cursor:pointer;' + (isWl ? off : on) + '">一码通解码器</button>' +
    '<button type="button" data-ar6-dm="tab" data-tab="whitelist" style="min-height:34px;border-radius:8px;font-size:12.5px;cursor:pointer;' + (isWl ? on : off) + '">本机公益站白名单</button>' +
    '</div>';
  if (!isWl) {
    h += '<textarea data-ar6-dm-in="code" rows="2" placeholder="粘贴 LK77-... 诊断码（或整段含码聊天文本）" style="width:100%;padding:8px 10px;border-radius:9px;border:1px solid rgba(56,189,248,.38);background:#080d18;color:#e0f2fe;font-size:12px;font-family:ui-monospace,Consolas,monospace;resize:vertical">' + esc(DIAG_MODAL.input || '') + '</textarea>';
    h += '<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:6px;margin:8px 0 10px">' +
      '<button type="button" data-ar6-dm="run" style="min-height:34px;border-radius:8px;border:1px solid #38bdf8;background:#0c2d48;color:#f0f9ff;font-size:12px;font-weight:700;cursor:pointer">立即解码</button>' +
      '<button type="button" data-ar6-dm="fillcur" style="min-height:34px;border-radius:8px;border:1px solid rgba(148,163,184,.36);background:#162032;color:#cbd5e1;font-size:12px;cursor:pointer">填入本轮码</button>' +
      '<button type="button" data-ar6-dm="copydec" style="min-height:34px;border-radius:8px;border:1px solid rgba(148,163,184,.36);background:#162032;color:#cbd5e1;font-size:12px;cursor:pointer">复制解码文本</button>' +
      '</div>';
    h += diagDecodeResultHTML(DIAG_MODAL.decoded);
  } else {
    h += diagWhitelistHTML();
  }
  h += '</div></div>';
  return h;
}

function openDiagModal(initialCode, tab) {
  try {
    closeDiagModal();
    DIAG_MODAL.tab = (tab === 'whitelist') ? 'whitelist' : 'decode';
    if (typeof initialCode === 'string') {
      DIAG_MODAL.input = initialCode;
      DIAG_MODAL.decoded = (initialCode.trim() && typeof lkDecodeDiagCode === 'function') ? lkDecodeDiagCode(initialCode) : null;
    }
    var wrap = DOC.createElement('div');
    wrap.innerHTML = diagModalHTML();
    var node = wrap.firstChild;
    if (!node) return false;
    DOC.body.appendChild(node);
    DIAG_MODAL.open = true;
    node.addEventListener('click', function (ev) {
      var t = ev && ev.target;
      if (t === node) { closeDiagModal(); return; }
      var btn = null, cur = t;
      while (cur && cur !== node) {
        if (cur.getAttribute && cur.getAttribute('data-ar6-dm')) { btn = cur; break; }
        cur = cur.parentNode;
      }
      if (!btn) return;
      var act = btn.getAttribute('data-ar6-dm') || '';
      if (act === 'close') { closeDiagModal(); return; }
      if (act === 'tab') {
        var cIn = node.querySelector && node.querySelector('[data-ar6-dm-in="code"]');
        if (cIn) DIAG_MODAL.input = String(cIn.value || '');
        openDiagModal(DIAG_MODAL.input, btn.getAttribute('data-tab'));
        return;
      }
      if (act === 'run') {
        var inp = node.querySelector && node.querySelector('[data-ar6-dm-in="code"]');
        var raw = inp ? String(inp.value || '') : DIAG_MODAL.input;
        openDiagModal(raw, 'decode');
        return;
      }
      if (act === 'fillcur') {
        var curCode = (typeof lkBuildDiagCode === 'function') ? lkBuildDiagCode(null, null) : '';
        openDiagModal(curCode, 'decode');
        return;
      }
      if (act === 'copydec') {
        if (DIAG_MODAL.decoded && typeof lkDiagDecodeText === 'function') {
          diagCopyRaw(lkDiagDecodeText(DIAG_MODAL.decoded), '解码报告已复制');
        } else {
          banner('请先粘贴一码通并点「立即解码」', 'warn', true);
        }
        return;
      }
      if (act === 'regcur') {
        var curCh = cardChannelSummary(null);
        if (curCh && curCh.hash && curCh.hash !== '0000' && typeof lkPubWlAdd === 'function') {
          lkPubWlAdd('当前公益站=#' + curCh.hash);
          banner('已将当前渠道 #' + curCh.hash + ' 存入本机公益站白名单', 'ok', true);
          openDiagModal(DIAG_MODAL.input, 'whitelist');
        }
        return;
      }
      if (act === 'wladd') {
        var wIn = node.querySelector && node.querySelector('[data-ar6-dm-in="wl"]');
        var wRaw = wIn ? String(wIn.value || '') : '';
        if (typeof lkPubWlAdd === 'function') {
          var r = lkPubWlAdd(wRaw);
          if (r.added || r.updated) {
            banner('白名单已更新：新增 ' + r.added + '，更新 ' + r.updated + '（共 ' + r.total + ' 个）', 'ok', true);
          } else {
            banner('未识别到有效域名或 4 位哈希，请检查格式', 'warn', true);
          }
          openDiagModal(DIAG_MODAL.input, 'whitelist');
        }
        return;
      }
      if (act === 'wldel') {
        var dh = btn.getAttribute('data-hash') || '';
        if (dh && typeof lkPubWlRemove === 'function') {
          lkPubWlRemove(dh);
          banner('已移除 #' + dh, 'ok', true);
          openDiagModal(DIAG_MODAL.input, 'whitelist');
        }
      }
    });
    return true;
  } catch (e) { return false; }
}

/* ---------------- V5.94 开源免费、防骗警示与法律免责声明弹窗 ---------------- */
var NOTICE_KEY = 'ar6.notice.ack';
var NOTICE_VER = '5.94-v1';
var NOTICE_MODAL = { open: false, forced: false, waitLeft: 0, unlockAt: 0, timer: null, bootTimer: null, onResize: null };

function isNoticeAcked() {
  try {
    if (String(ar6LsGet(NOTICE_KEY) || '') === NOTICE_VER) return true;
  } catch (eN0) {}
  try {
    if (cfg && String(cfg.noticeAck || '') === NOTICE_VER) return true;
  } catch (eN1) {}
  return false;
}

function markNoticeAcked() {
  try { ar6LsSet(NOTICE_KEY, NOTICE_VER); } catch (eN2) {}
  try {
    if (cfg && typeof cfg === 'object') {
      cfg.noticeAck = NOTICE_VER;
      if (typeof saveCfg === 'function') saveCfg();
    }
  } catch (eN3) {}
  return true;
}

function noticeStopBoot() {
  try {
    if (NOTICE_MODAL.bootTimer) {
      clearTimeout(NOTICE_MODAL.bootTimer);
      NOTICE_MODAL.bootTimer = null;
    }
  } catch (eNB) {}
}

function noticeTheme() {
  var sk = 'ultra';
  try { if (typeof skinId === 'function') sk = String(skinId() || 'ultra'); } catch (eSk) {}
  if (sk === 'pink') {
    return {
      bg: 'linear-gradient(180deg,#fff9fc 0%,#fff1f7 100%)',
      bd: 'rgba(219,39,119,.46)',
      sh: '0 22px 58px rgba(131,24,67,.28)',
      headBg: 'linear-gradient(95deg,rgba(244,114,182,.2),rgba(255,241,247,.96))',
      headBd: 'rgba(219,39,119,.24)',
      badgeBg: 'rgba(225,29,72,.12)',
      badgeBd: 'rgba(225,29,72,.38)',
      badgeInk: '#be123c',
      title: '#831843',
      secBg: 'rgba(255,255,255,.86)',
      secBd: 'rgba(219,39,119,.22)',
      secTitle: '#9d174d',
      ink: '#3b1628',
      dim: '#6b324c',
      alertBg: '#fff1f2',
      alertBd: '#e11d48',
      alertTitle: '#9f1239',
      alertInk: '#4c0519',
      footBg: 'rgba(255,241,247,.96)',
      btnBg: 'linear-gradient(135deg,#db2777,#be185d)',
      btnBd: '#f472b6',
      btnInk: '#ffffff',
      btnOffBg: '#f3d7e4',
      btnOffBd: 'rgba(157,23,77,.28)',
      btnOffInk: '#831843'
    };
  }
  var map = {
    plain: { bg: 'linear-gradient(180deg,#181c24 0%,#101319 100%)', bd: 'rgba(148,163,184,.42)', headBg: 'rgba(30,36,48,.96)', title: '#f1f5f9', secTitle: '#cbd5e1', btnBg: 'linear-gradient(135deg,#334155,#1e293b)', btnBd: '#94a3b8' },
    xianxia: { bg: 'linear-gradient(180deg,#0b1d1c 0%,#061111 100%)', bd: 'rgba(45,212,191,.48)', headBg: 'linear-gradient(95deg,rgba(20,184,166,.2),rgba(6,17,17,.96))', title: '#99f6e4', secTitle: '#5eead4', btnBg: 'linear-gradient(135deg,#0f766e,#115e59)', btnBd: '#2dd4bf' },
    xuanhuan: { bg: 'linear-gradient(180deg,#1d120c 0%,#100906 100%)', bd: 'rgba(251,146,60,.52)', headBg: 'linear-gradient(95deg,rgba(234,88,12,.22),rgba(16,9,6,.96))', title: '#fed7aa', secTitle: '#fdba74', btnBg: 'linear-gradient(135deg,#c2410c,#9a3412)', btnBd: '#fb923c' },
    marvel: { bg: 'linear-gradient(180deg,#12182b 0%,#090d18 100%)', bd: 'rgba(239,68,68,.52)', headBg: 'linear-gradient(95deg,rgba(220,38,38,.22),rgba(15,23,42,.96))', title: '#fecaca', secTitle: '#7dd3fc', btnBg: 'linear-gradient(135deg,#dc2626,#991b1b)', btnBd: '#fca5a5' },
    imperial: { bg: 'linear-gradient(180deg,#1b150c 0%,#0e0b06 100%)', bd: 'rgba(234,179,8,.56)', headBg: 'linear-gradient(95deg,rgba(202,138,4,.24),rgba(14,11,6,.96))', title: '#fef08a', secTitle: '#fcd34d', btnBg: 'linear-gradient(135deg,#b45309,#78350f)', btnBd: '#fcd34d' },
    westfantasy: { bg: 'linear-gradient(180deg,#13162b 0%,#090b18 100%)', bd: 'rgba(129,140,248,.52)', headBg: 'linear-gradient(95deg,rgba(99,102,241,.22),rgba(9,11,24,.96))', title: '#e0e7ff', secTitle: '#a5b4fc', btnBg: 'linear-gradient(135deg,#4f46e5,#3730a3)', btnBd: '#a5b4fc' },
    eldritch: { bg: 'linear-gradient(180deg,#1a0d16 0%,#0d060b 100%)', bd: 'rgba(225,29,72,.52)', headBg: 'linear-gradient(95deg,rgba(159,18,57,.26),rgba(13,6,11,.96))', title: '#fecdd3', secTitle: '#fda4af', btnBg: 'linear-gradient(135deg,#9f1239,#6b0f2a)', btnBd: '#fb7185' },
    cyberpunk: { bg: 'linear-gradient(180deg,#120d1f 0%,#080510 100%)', bd: 'rgba(244,63,94,.52)', headBg: 'linear-gradient(95deg,rgba(236,72,153,.22),rgba(8,5,16,.96))', title: '#fde047', secTitle: '#67e8f9', btnBg: 'linear-gradient(135deg,#be123c,#7e22ce)', btnBd: '#38bdf8' }
  };
  var c = map[sk] || {
    bg: 'linear-gradient(180deg,#0f182b 0%,#080d18 100%)',
    bd: 'rgba(56,189,248,.5)',
    headBg: 'linear-gradient(95deg,rgba(14,165,233,.22),rgba(15,24,43,.96))',
    title: '#7dd3fc',
    secTitle: '#7dd3fc',
    btnBg: 'linear-gradient(135deg,#0284c7,#0369a1)',
    btnBd: '#38bdf8'
  };
  return {
    bg: c.bg,
    bd: c.bd,
    sh: '0 24px 66px rgba(2,6,23,.9)',
    headBg: c.headBg,
    headBd: 'rgba(148,163,184,.26)',
    badgeBg: 'rgba(244,63,94,.18)',
    badgeBd: 'rgba(251,113,133,.5)',
    badgeInk: '#fecdd3',
    title: c.title,
    secBg: 'rgba(22,32,50,.72)',
    secBd: 'rgba(148,163,184,.22)',
    secTitle: c.secTitle,
    ink: '#e2e8f0',
    dim: '#94a3b8',
    alertBg: 'rgba(159,18,57,.26)',
    alertBd: 'rgba(251,113,133,.72)',
    alertTitle: '#fecdd3',
    alertInk: '#fff1f2',
    footBg: 'rgba(8,13,24,.94)',
    btnBg: c.btnBg,
    btnBd: c.btnBd,
    btnInk: '#f8fafc',
    btnOffBg: '#1e293b',
    btnOffBd: 'rgba(148,163,184,.34)',
    btnOffInk: '#94a3b8'
  };
}

function noticeBtnLabel(forced, waitLeft) {
  if (!forced) return '已阅 · 关闭声明';
  if (waitLeft > 0) return '请阅读声明（' + waitLeft + 's）';
  return '我已满 18 周岁，知晓免费开源并同意全部声明';
}

function noticeViewportH() {
  var h = 0;
  try {
    if (HOST && HOST.visualViewport && HOST.visualViewport.height > 120) h = HOST.visualViewport.height;
  } catch (e0) {}
  try {
    var ih = HOST && HOST.innerHeight ? Number(HOST.innerHeight) : 0;
    if (ih > 120 && (!h || ih < h)) h = ih;
  } catch (e1) {}
  try {
    var ch = DOC && DOC.documentElement && DOC.documentElement.clientHeight ? Number(DOC.documentElement.clientHeight) : 0;
    if (ch > 120 && (!h || ch < h)) h = ch;
  } catch (e2) {}
  return h > 120 ? Math.floor(h) : 0;
}

function noticeBoxMaxH() {
  var vh = noticeViewportH();
  if (vh > 180) return Math.max(220, vh - 28) + 'px';
  return '84dvh';
}

function noticeModalHTML(forced, waitLeft) {
  var th = noticeTheme();
  var locked = !!(forced && waitLeft > 0);
  var secStyle = 'margin:0 0 8px;padding:8px 10px;border-radius:10px;background:' + th.secBg + ';border:1px solid ' + th.secBd + ';font-size:12px;line-height:1.62;color:' + th.ink + ';word-break:break-word;overflow-wrap:anywhere';
  var hTitleStyle = 'font-size:12.4px;font-weight:700;color:' + th.secTitle + ';margin:0 0 4px';
  var btnStyle = 'display:block;width:100%;max-width:100%;min-height:44px;padding:10px 12px;border-radius:10px;font-size:13px;font-weight:700;line-height:1.35;white-space:normal;word-break:break-word;text-align:center;touch-action:manipulation;-webkit-tap-highlight-color:transparent;transition:all .16s ease;' +
    (locked
      ? ('cursor:not-allowed;opacity:.78;background:' + th.btnOffBg + ';border:1px solid ' + th.btnOffBd + ';color:' + th.btnOffInk)
      : ('cursor:pointer;opacity:1;background:' + th.btnBg + ';border:1px solid ' + th.btnBd + ';color:' + th.btnInk + ';box-shadow:0 6px 20px rgba(2,6,23,.32)'));
  var boxMaxH = noticeBoxMaxH();

  var h = '<div id="ar6-notice-modal" role="dialog" aria-modal="true" aria-label="卢克之光版权防骗与法律免责声明" data-ar6-forced="' + (forced ? '1' : '0') + '" style="position:fixed;inset:0;left:0;top:0;right:0;bottom:0;width:100%;height:100%;box-sizing:border-box;display:flex;align-items:center;justify-content:center;padding:10px;overflow:hidden;z-index:2147483606;background:rgba(4,8,18,.88);font-family:system-ui,-apple-system,Segoe UI,\'PingFang SC\',\'Microsoft YaHei\',sans-serif">';
  h += '<style>#ar6-notice-modal,#ar6-notice-modal *{box-sizing:border-box!important;min-width:0}#ar6-notice-modal button[data-ar6-nm]{width:100%!important;max-width:100%!important;white-space:normal!important;word-break:break-word!important;pointer-events:auto!important;touch-action:manipulation!important;margin:0!important}</style>';
  h += '<div data-ar6-nm-box="1" style="width:100%;max-width:460px;max-height:' + boxMaxH + ';display:flex;flex-direction:column;overflow:hidden;background:' + th.bg + ';color:' + th.ink + ';border:1.5px solid ' + th.bd + ';border-radius:14px;box-shadow:' + th.sh + '">';

  /* 固定顶栏（无外链、无关闭叉号） */
  h += '<div style="flex:0 0 auto;padding:10px 13px 9px;background:' + th.headBg + ';border-bottom:1px solid ' + th.headBd + '">' +
    '<div style="display:inline-block;padding:2px 8px;margin-bottom:4px;border-radius:999px;font-size:10.5px;font-weight:700;letter-spacing:.3px;background:' + th.badgeBg + ';border:1px solid ' + th.badgeBd + ';color:' + th.badgeInk + '">免费开源 · 严禁倒卖 · 使用前必读</div>' +
    '<div style="font-size:14.5px;font-weight:800;line-height:1.32;color:' + th.title + ';word-break:break-word">《卢克之光》开源声明、防骗警示与法律免责协议</div>' +
    '<div style="font-size:11px;color:' + th.dim + ';margin-top:2px">版本 V' + esc(VERSION) + ' · 类脑社区（类脑 ΟΔΥΣΣΕΙΑ）免费开源发布</div>' +
    '</div>';

  /* 可滚动正文区 */
  h += '<div style="flex:1 1 auto;min-height:0;overflow-y:auto;overflow-x:hidden;-webkit-overflow-scrolling:touch;touch-action:pan-y;overscroll-behavior:contain;padding:10px 12px">';

  /* 核心红框：反倒卖防诈骗警示 */
  h += '<div style="margin:0 0 10px;padding:10px 12px;border-radius:11px;background:' + th.alertBg + ';border:1.5px solid ' + th.alertBd + ';font-size:12.5px;line-height:1.68;color:' + th.alertInk + '">' +
    '<div style="font-size:13.2px;font-weight:800;color:' + th.alertTitle + ';margin-bottom:4px">⚠️ 严正防骗警示：如果您是付费购买的，您已经上当受骗！</div>' +
    '本插件为作者在<b>类脑社区（类脑 ΟΔΥΣΣΕΙΑ）</b>独立开发并<b>永久免费、无偿分享</b>的开源前端脚本。作者从未授权任何个人、商家、店铺或社群在淘宝、闲鱼、拼多多、小红书、微信/QQ 群、网盘或任何第三方平台进行收费售卖、打包整合收费、付费代装、会员制分发或引流牟利。<b>若您为此支付了任何费用，请立即申请退款并举报倒卖者。</b>原作者与社区不介入、亦不承担任何第三方交易纠纷、财产损失及售后责任。' +
    '</div>';

  /* 一、开源属性与非商业使用许可 */
  h += '<div style="' + secStyle + '">' +
    '<div style="' + hTitleStyle + '">一、开源属性与非商业使用许可（著作权声明）</div>' +
    '1. 本插件仅限个人在<b>非商业、非营利</b>前提下，用于技术学习、前端界面研究、脚本调试与合法合规的个人交流测试。<br>' +
    '2. 依据《中华人民共和国著作权法》及《计算机软件保护条例》，作者对本插件依法享有完整著作权与署名权。未经作者书面明确授权，<b>严禁任何个人或组织将本插件整体、部分代码或衍生打包产物用于任何直接或间接的商业盈利活动</b>（包括但不限于有偿倒卖、整合包收费、去除或篡改版权声明、冒名分发及借壳收费），违者作者保留依法追责及向平台投诉下架的权利。' +
    '</div>';

  /* 二、纯本地前端工具中立与零数据收集声明 */
  h += '<div style="' + secStyle + '">' +
    '<div style="' + hTitleStyle + '">二、纯本地前端工具中立与零数据收集声明</div>' +
    '本插件仅为运行于用户<b>本地浏览器环境</b>的前端交互与请求格式辅助脚本，<b>并非生成式人工智能服务提供者</b>：本插件不内置任何 AI 模型、不提供任何算力或 API 代理服务、不架设后端服务器，亦不收集、不存储、不上传用户的 API 密钥、接口地址或任何聊天记录。所有生成内容均由用户自行接入的第三方接口直接返回，与作者及社区无任何关联。' +
    '</div>';

  /* 三、严格使用边界与合规红线 */
  h += '<div style="' + secStyle + '">' +
    '<div style="' + hTitleStyle + '">三、严格使用边界与合规红线</div>' +
    '1. <b>法律法规遵守</b>：使用者须严格遵守<b>中华人民共和国现行法律法规</b>（包括但不限于《网络安全法》《数据安全法》《个人信息保护法》《生成式人工智能服务管理暂行办法》等）以及<b>使用者所在国家或地区的全部适用法律、监管规定、公序良俗与行业规范</b>。<br>' +
    '2. <b>严禁违法违规用途</b>：严禁将本插件用于制作、复制、传播或辅助任何违法违规活动，包括但不限于：危害国家安全、暴力恐怖、极端主义、淫秽色情、赌博诈骗、洗钱、网络攻击、编造传播虚假信息、侵害未成年人合法权益，或侵犯他人隐私权、肖像权、名誉权、商业秘密及知识产权的行为。<br>' +
    '3. <b>成年人准入限制</b>：本插件仅面向<b>已满 18 周岁、具备完全民事行为能力</b>的成年人提供学习与合法合规的个人虚构创作辅助；<b>未满 18 周岁者严禁使用</b>，请立即关闭页面并彻底删除本脚本。<br>' +
    '4. <b>虚构边界与非专业建议</b>：鉴于人工智能技术固有的不确定性与“幻觉”特征，第三方模型生成的全部内容均属虚构参考，<b>绝不代表作者或社区立场，不构成任何医疗、法律、金融、心理或现实行为建议</b>，请勿轻信或用于现实决策。' +
    '</div>';

  /* 四、第三方接口与平台合规责任 */
  h += '<div style="' + secStyle + '">' +
    '<div style="' + hTitleStyle + '">四、第三方接口与平台合规责任</div>' +
    '使用者自行配置并调用任何第三方大模型、中转 API 或第三方宿主软件时，<b>须自行审阅并严格遵守相应服务商的《服务条款》（ToS）与合规政策</b>。因接入第三方服务产生的费用消耗、额度异常、账号封禁、数据泄露、服务中断或平台违约风险，均由使用者自行承担全部后果。' +
    '</div>';

  /* 五、按现状提供与最大范围责任豁免 */
  h += '<div style="' + secStyle + '">' +
    '<div style="' + hTitleStyle + '">五、“按现状”提供与最大范围责任豁免</div>' +
    '本插件严格按<b>“现状（AS-IS）”与“现有（AS-AVAILABLE）”</b>免费提供，不附带任何明示或默示担保（包括但不限于适销性、稳定性、兼容性、无缺陷及特定用途适用性担保）。<b>在适用法律允许的最大范围内</b>，作者及发布社区不对因下载、安装、使用、无法使用、误用、二次修改或传播本插件所引发的任何直接、间接、偶然、特殊、衍生或惩罚性损失（包括数据遗失、设备异常、经济损失及一切民事、行政或刑事法律责任）承担任何赔偿或连带责任；<b>一切行为后果与法律责任均由实际使用者及违规行为人独立承担</b>。' +
    '</div>';

  /* 六、界面主题与第三方知识产权避风港 */
  h += '<div style="' + secStyle + '">' +
    '<div style="' + hTitleStyle + '">六、界面主题与第三方知识产权避风港（通知—删除）</div>' +
    '本插件内置的部分主题皮肤与视觉装饰仅作个人非商业性质的界面美化交流与同人致敬，不涉及任何商业盈利；所涉原作角色、设定及商标之知识产权均归其原权利人所有。若任何权利人认为相关视觉元素存在侵权，请告知作者，核实后将第一时间无条件移除。' +
    '</div>';

  /* 七、生效、强制退出与条款独立性 */
  h += '<div style="' + secStyle + ';margin-bottom:2px">' +
    '<div style="' + hTitleStyle + '">七、生效、强制退出与条款独立性</div>' +
    '点击下方按钮或继续使用本插件，即视为您已完整阅读、充分理解并无条件接受本声明全部条款；<b>如您未满 18 周岁或不同意其中任何一条，请立即停止使用、关闭页面并从酒馆中彻底删除本插件</b>。若本声明部分条款依适用法律被认定无效或不可执行，不影响其余条款之完整效力。' +
    '</div>';

  h += '</div>';

  /* 固定底栏：唯一主按钮（不用 disabled 硬锁，改用 data-locked + 实时时间戳解锁，防移动端 WebView 冻结卡死） */
  h += '<div style="flex:0 0 auto;padding:9px 12px calc(10px + env(safe-area-inset-bottom,0px));background:' + th.footBg + ';border-top:1px solid ' + th.headBd + '">' +
    '<button type="button" data-ar6-nm="agree" data-locked="' + (locked ? '1' : '0') + '" aria-disabled="' + (locked ? 'true' : 'false') + '" style="' + btnStyle + '">' + esc(noticeBtnLabel(forced, waitLeft)) + '</button>' +
    '</div>';

  h += '</div></div>';
  return h;
}

function closeNoticeModal(forceClose) {
  try {
    if (NOTICE_MODAL.forced && !forceClose) return false;
    if (NOTICE_MODAL.timer) {
      clearInterval(NOTICE_MODAL.timer);
      NOTICE_MODAL.timer = null;
    }
    if (NOTICE_MODAL.onResize) {
      try { if (HOST && HOST.removeEventListener) HOST.removeEventListener('resize', NOTICE_MODAL.onResize); } catch (eR0) {}
      try { if (HOST && HOST.visualViewport && HOST.visualViewport.removeEventListener) HOST.visualViewport.removeEventListener('resize', NOTICE_MODAL.onResize); } catch (eR1) {}
      NOTICE_MODAL.onResize = null;
    }
    var old = DOC && DOC.getElementById('ar6-notice-modal');
    if (old && old.parentNode) old.parentNode.removeChild(old);
    NOTICE_MODAL.open = false;
    NOTICE_MODAL.forced = false;
    NOTICE_MODAL.waitLeft = 0;
    NOTICE_MODAL.unlockAt = 0;
    return true;
  } catch (e) { return false; }
}

function openNoticeModal(forced, opts) {
  try {
    if (DISPOSED || !DOC || !DOC.body) return false;
    closeNoticeModal(true);
    var isForced = !!forced;
    var waitSec = isForced ? 3 : 0;
    if (opts && typeof opts.waitSec === 'number' && isFinite(opts.waitSec)) {
      waitSec = Math.max(0, Math.floor(opts.waitSec));
    }
    NOTICE_MODAL.forced = isForced;
    NOTICE_MODAL.waitLeft = waitSec;
    NOTICE_MODAL.unlockAt = waitSec > 0 ? (Date.now() + waitSec * 1000) : 0;
    var wrap = DOC.createElement('div');
    wrap.innerHTML = noticeModalHTML(isForced, waitSec);
    var node = wrap.firstChild;
    if (!node) return false;
    DOC.body.appendChild(node);
    NOTICE_MODAL.open = true;

    var th = noticeTheme();
    var syncBoxSize = function () {
      try {
        var bx = node.querySelector && node.querySelector('[data-ar6-nm-box="1"]');
        if (bx) bx.style.maxHeight = noticeBoxMaxH();
      } catch (eSz) {}
    };
    NOTICE_MODAL.onResize = syncBoxSize;
    try { if (HOST && HOST.addEventListener) HOST.addEventListener('resize', syncBoxSize); } catch (eRs0) {}
    try { if (HOST && HOST.visualViewport && HOST.visualViewport.addEventListener) HOST.visualViewport.addEventListener('resize', syncBoxSize); } catch (eRs1) {}

    var syncBtn = function () {
      try {
        var b = node.querySelector && node.querySelector('[data-ar6-nm="agree"]');
        if (!b) return;
        var lck = !!(NOTICE_MODAL.forced && NOTICE_MODAL.waitLeft > 0);
        b.textContent = noticeBtnLabel(NOTICE_MODAL.forced, NOTICE_MODAL.waitLeft);
        b.setAttribute('data-locked', lck ? '1' : '0');
        b.setAttribute('aria-disabled', lck ? 'true' : 'false');
        if (!lck) {
          b.style.cursor = 'pointer';
          b.style.opacity = '1';
          b.style.background = th.btnBg;
          b.style.border = '1px solid ' + th.btnBd;
          b.style.color = th.btnInk;
          b.style.boxShadow = '0 6px 20px rgba(2,6,23,.32)';
        }
      } catch (eSb) {}
    };

    if (isForced && waitSec > 0) {
      NOTICE_MODAL.timer = setInterval(function () {
        if (DISPOSED || !NOTICE_MODAL.open) {
          if (NOTICE_MODAL.timer) { clearInterval(NOTICE_MODAL.timer); NOTICE_MODAL.timer = null; }
          return;
        }
        var byClock = NOTICE_MODAL.unlockAt ? Math.ceil((NOTICE_MODAL.unlockAt - Date.now()) / 1000) : 0;
        var byTick = Math.max(0, NOTICE_MODAL.waitLeft - 1);
        NOTICE_MODAL.waitLeft = Math.max(0, Math.min(byTick, byClock));
        syncBtn();
        if (NOTICE_MODAL.waitLeft <= 0 && NOTICE_MODAL.timer) {
          clearInterval(NOTICE_MODAL.timer);
          NOTICE_MODAL.timer = null;
        }
      }, 1000);
    }

    var lastActAt = 0;
    var handleAgree = function () {
      var now = Date.now();
      if (now - lastActAt < 300) return;
      if (NOTICE_MODAL.forced) {
        if (NOTICE_MODAL.waitLeft > 0 && NOTICE_MODAL.unlockAt && now >= NOTICE_MODAL.unlockAt) {
          NOTICE_MODAL.waitLeft = 0;
          syncBtn();
        }
        if (NOTICE_MODAL.waitLeft > 0) return;
        lastActAt = now;
        markNoticeAcked();
        closeNoticeModal(true);
        try { banner('已确认《卢克之光》开源免费与合规免责声明（可在「设置」随时复看）', 'ok', true); } catch (eBn) {}
      } else {
        lastActAt = now;
        closeNoticeModal(true);
      }
    };

    var pDownX = 0, pDownY = 0, pDownOk = false;
    var agreeEl = node.querySelector && node.querySelector('[data-ar6-nm="agree"]');
    if (agreeEl && agreeEl.addEventListener) {
      agreeEl.addEventListener('pointerdown', function (ev) {
        pDownOk = true;
        pDownX = (ev && typeof ev.clientX === 'number') ? ev.clientX : 0;
        pDownY = (ev && typeof ev.clientY === 'number') ? ev.clientY : 0;
      }, false);
      agreeEl.addEventListener('pointerup', function (ev) {
        if (!pDownOk) return;
        pDownOk = false;
        var dx = Math.abs(((ev && typeof ev.clientX === 'number') ? ev.clientX : pDownX) - pDownX);
        var dy = Math.abs(((ev && typeof ev.clientY === 'number') ? ev.clientY : pDownY) - pDownY);
        if (dx > 16 || dy > 16) return;
        handleAgree();
      }, false);
      agreeEl.addEventListener('pointercancel', function () { pDownOk = false; }, false);
    }

    node.addEventListener('click', function (ev) {
      var t = ev && ev.target;
      if (t === node) {
        if (!NOTICE_MODAL.forced) closeNoticeModal(true);
        return;
      }
      var btn = null, cur = t;
      while (cur && cur !== node) {
        if (cur.getAttribute && cur.getAttribute('data-ar6-nm')) { btn = cur; break; }
        cur = cur.parentNode;
      }
      if (!btn) return;
      if (btn.getAttribute('data-ar6-nm') === 'agree') handleAgree();
    });
    return true;
  } catch (e) { return false; }
}

function noticeBootCheck() {
  try {
    noticeStopBoot();
    if (DISPOSED || isNoticeAcked()) return false;
    NOTICE_MODAL.bootTimer = setTimeout(function () {
      NOTICE_MODAL.bootTimer = null;
      try {
        if (DISPOSED || isNoticeAcked()) return;
        if (DOC && DOC.getElementById('ar6-notice-modal')) return;
        openNoticeModal(true);
      } catch (eNbc) {}
    }, 900);
    return true;
  } catch (e) { return false; }
}
