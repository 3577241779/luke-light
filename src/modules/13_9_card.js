/* ===== 9_card.js ===== */
/* ============================================================================
 * 卢克之光 V5.0 — 9/9 诊断证据卡（深空银蓝高对比视觉 / 模型归一核验 / 与功能图鉴独立互不误关）
 * ========================================================================== */

var CARD = { open: false, rid: 0 };

var CARD_COLOR = {
  diff: '#f43f5e',
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
  } else if (rec.code === 'thin') {
    tail = '请求 ' + req + '，正文 ' + reportValue(reportCapture(rec).bodyChars, ' 字') + '，思考 token：' + reportValue(reportCapture(rec).thinkTokens);
  } else if (rec.code === 'echo') {
    tail = '请求 ' + req + '，返回标签与请求不同，但该渠道不读 model（回显）';
  } else if (rec.code === 'same') {
    tail = '请求 ' + req + ' → 实测 ' + (obs || req) + '（一致）';
  } else if (rec.code === 'skip') {
    tail = '请求 ' + req + '，当前已按扫描范围规则跳过（' + (rec.note || '范围外') + '）';
  } else if (rec.code === 'aux') {
    tail = '请求 ' + req + '，属于后台辅助请求（不计入正文调包率）';
  } else {
    tail = '请求 ' + req + '，暂未取得上游模型字段（' + (rec.verdict || '未知') + '）';
  }
  if (pk && pk.modelVersion && tail.indexOf(pk.modelVersion) < 0) tail += '｜modelVersion: ' + pk.modelVersion;
  return tail;
}

function cardText(rec) {
  if (!rec) return '';
  var d = new Date(Number(rec.at) || Date.now());
  var pad = function (n) { return (n < 10 ? '0' : '') + n; };
  var ts = d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()) + ' ' +
    pad(d.getHours()) + ':' + pad(d.getMinutes());
  var pk = cardPeek(rec);
  var lines = [];
  lines.push('【卢克之光 · 诊断证据卡】' + ts);
  lines.push('判定：' + (rec.verdict || '') + '（证据等级 ' + (rec.conf || 'C') + '）');
  lines.push(cardOneLine(rec));
  lines.push('原因：' + (rec.note || '—'));
  lines.push(reportTimelineText(rec));
  if (pk && (pk.model || pk.modelVersion)) {
    lines.push('上游自述：model=' + (pk.model || '—') + ' modelVersion=' + (pk.modelVersion || '—'));
  }
  if (pk && pk.raw) lines.push('原始片段：' + pk.raw.slice(0, 240));
  lines.push('渠道：' + (rec.base || '—'));
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
  if (c === 'diff') return { t: '检测到疑似更换/降级模型', s: '请求模型与上游实测返回模型不一致，可直接复制或截图留存证据。', c: '#f43f5e' };
  if (c === 'thin') return { t: '模型名一致，但未观测到思考输出', s: '该渠道此前存在思考输出而本轮思考 token 为 0，疑似思考预算被压缩或切到非思考链路。', c: '#fcd34d' };
  if (c === 'same') return { t: '本轮模型核验一致', s: '上游返回的模型标识与你请求的模型一致，未发现明显跨代或降档特征。', c: '#34d399' };
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
  it.push({ k: '原生 modelVersion', v: (pk && pk.modelVersion) ? pk.modelVersion : '未取得', lv: (pk && pk.modelVersion) ? '强' : '缺失' });
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
    diff: '疑似调包', thin: '未见思考', empty: '0字空回', same: '核验一致',
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
      if (act === 'tab') { openCard(rec, btn.getAttribute('data-tab')); return; }
      if (act === 'close') closeCard();
    });
  } catch (e) {
    try { banner('诊断报告渲染失败：' + String(e && e.message || e), 'bad', true); } catch (e2) {}
  }
}
