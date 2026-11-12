/* ============================================================================
 * Anti-Route v7.3-test — 9/9 证据卡（给人看、能截图、能转发）
 *
 * 目的：把"我觉得被降智了"变成一张能直接截图的卡片。
 * 左：我请求的是什么
 * 右：上游说它给了什么（响应体原文）
 * 下：这一轮的形体证据（思考 token / 首字 / 字数 / 速率）
 * 底：原始的、未经加工的响应片段 —— 让人无法狡辩"这是脚本自己编的"
 *
 * 铁律：只读不写、绝不阻塞生成；所有 DOM 都是内联样式（不依赖页面 CSS）。
 * ========================================================================== */

var CARD = { open: false, rid: 0 };

var CARD_COLOR = {
 diff: '#f85149',
 thin: '#d29922',
 echo: '#8b949e',
 unknown: '#8b949e',
 same: '#3fb950',
 quota: '#a371f7',
 blocked: '#f85149',
 gate: '#d29922',
 empty: '#8b949e',
 error: '#8b949e'
};

function cardColor(code) {
 return CARD_COLOR[code] || '#8b949e';
}

function cardRate(rec) {
 var n = Number(rec.total) || 0;
 var c = Number(rec.chars) || 0;
 if (!n || !c) return 0;
 return Math.round(c * 1000 / n);
}

/* 用方块字符画趋势：不需要 canvas，截图也清楚 */
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

function cardOneLine(rec) {
 var pk = cardPeek(rec);
 var req = rec.req || '?';
 var obs = rec.obs && rec.obs !== '—' ? rec.obs : '';
 var tail = '';
 if (rec.code === 'diff') {
 tail = obs ? ('请求 ' + req + ' → 上游回 ' + obs) : ('请求 ' + req + '，但证据与请求不符');
 } else if (rec.code === 'thin') {
 tail = '请求 ' + req + '，正文 ' + rec.chars + ' 字，思考 token 为 0';
 } else if (rec.code === 'echo') {
 tail = '请求 ' + req + '，返回标签与请求不同，但该渠道不读 model（回显）';
 } else if (rec.code === 'same') {
 tail = '请求 ' + req + '，返回一致';
 } else {
 tail = '请求 ' + req + '，无法判断（' + (rec.verdict || '') + '）';
 }
 if (pk && pk.modelVersion) tail += '｜modelVersion: ' + pk.modelVersion;
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
 lines.push('【Anti-Route 证据】' + ts);
 lines.push('判定：' + (rec.verdict || '') + '（证据等级 ' + (rec.conf || 'C') + '）');
 lines.push(cardOneLine(rec));
 lines.push('原因：' + (rec.note || ''));
 lines.push('思考token：' + (pk && pk.thoughts != null ? pk.thoughts : (rec.think ? '观测到' : '0/未观测到')) +
 ' ｜ 首字：' + (rec.ttft ? rec.ttft + 'ms' : '—') +
 ' ｜ 正文：' + (rec.chars || 0) + ' 字 ｜ 速率：' + cardRate(rec) + ' 字/秒');
 if (pk && (pk.model || pk.modelVersion)) {
 lines.push('上游自述：model=' + (pk.model || '—') + ' modelVersion=' + (pk.modelVersion || '—'));
 }
 if (pk && pk.raw) lines.push('原始片段：' + pk.raw.slice(0, 200));
 lines.push('渠道：' + (rec.base || '—'));
 lines.push('版本：卢克之光 V' + VERSION + '（内核 Anti-Route 8.31）');
 return lines.join('\n');
}

function cardCopy(rec) {
 var txt = cardText(rec);
 try {
 if (HOST.navigator && HOST.navigator.clipboard && HOST.navigator.clipboard.writeText) {
 HOST.navigator.clipboard.writeText(txt).then(function () {
 banner('证据文本已复制，可以直接发出去', 'ok');
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
 banner('证据文本已复制', 'ok');
 } catch (e) {
 banner('复制失败，请长按卡片截图', 'warn');
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
 '<div style="width:100%;height:' + pct + '%;background:' + (last ? color : '#1f6feb') +
 ';border-radius:2px"></div></div>';
 }
 return '<div style="display:flex;gap:2px;align-items:flex-end">' + h + '</div>';
}

/* v0.5.1：浮层尺寸。手机端 iframe 里 fixed 的包含块可能被宿主压扁（高度≈0），
   那样 inset:0 会塌成一条线、align-items:center 把卡片顶出屏幕一半。
   这里显式按视口单位撑开（vw/vh 不受包含块影响），桌面端原样返回 inset:0。 */
function cardOverlayCss() {
  var mob = false;
  try { mob = (typeof uiMode === 'function' && uiMode() === 'mobile'); } catch (e) {}
  if (!mob) return 'position:fixed;inset:0;display:flex;align-items:center;justify-content:center;padding:12px;';
  return 'position:fixed;left:0;top:0;width:100vw;height:var(--TH-viewport-height,100vh);' +
    'display:flex;align-items:center;justify-content:center;padding:12px;overflow-y:auto;';
}

/* 内容盒最大高度：手机端按宿主给的真实可视高度算，桌面端保持原来的 vh */
function cardBoxMaxH(vhPct) {
  var mob = false;
  try { mob = (typeof uiMode === 'function' && uiMode() === 'mobile'); } catch (e) {}
  if (!mob) return vhPct + 'vh';
  return 'calc(var(--TH-viewport-height,100vh) - 24px)';
}

function cardEngineHTML(rec) {
 var pk = cardPeek(rec);
 var col = cardColor(rec.code);
 var obs = (rec.obs && rec.obs !== '—') ? rec.obs : '（未回传）';
 var obsCol = rec.code === 'diff' ? '#f85149' : (rec.code === 'same' ? '#3fb950' : '#c9d1d9');
 var rate = cardRate(rec);
 var thinkTxt = (pk && pk.thoughts != null) ? String(pk.thoughts) : (rec.think ? '有' : '0');
 var log = readLog().slice(0, 12).reverse();
 var charsArr = [];
 for (var i = 0; i < log.length; i++) charsArr.push(Number(log[i].chars) || 0);
 var spark = cardSpark(charsArr);
 var h = '';
 h += '<style>#ar6-card,#ar6-card *{box-sizing:border-box;min-width:0}#ar6-card{animation:ar6-fade .14s linear}#ar6-card>div{animation:ar6-rise .2s cubic-bezier(.2,.8,.2,1)}@media (prefers-reduced-motion:reduce){#ar6-card,#ar6-card>div{animation:none}}</style>';
 h += '<div id="ar6-card" style="' + cardOverlayCss() + 'z-index:2147483600;background:rgba(1,4,9,.86);font-family:system-ui,-apple-system,\'Segoe UI\',sans-serif">';
 h += '<div style="width:402px;max-width:calc(100vw - 20px);max-height:' + cardBoxMaxH(92) + ';overflow-x:hidden;overflow:auto;background:#0d1117;color:#e6edf3;border:1px solid #30363d;border-radius:16px;box-shadow:0 12px 48px rgba(0,0,0,.6)">';
 h += cardTabBar('engine');

 /* 顶部结论条 */
 h += '<div style="background:' + col + '22;border-bottom:2px solid ' + col + ';padding:14px 16px">';
 h += '<div style="font-size:20px;font-weight:700;color:' + col + ';line-height:1.3">' +
 esc(rec.verdict || '未知') + '</div>';
 h += '<div style="font-size:12px;color:#8b949e;margin-top:6px">证据等级 <b style="color:#e6edf3">' +
 esc(rec.conf || 'C') + '</b> · ' + esc(new Date(Number(rec.at) || Date.now()).toLocaleString()) + '</div>';
 h += '</div>';

 /* 请求 vs 返回 */
 h += '<div style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;padding:14px 16px 6px">';
 h += '<div style="min-width:0;background:#161b22;border:1px solid #30363d;border-radius:10px;padding:10px">' +
 '<div style="font-size:11px;color:#8b949e">我请求的</div>' +
 '<div style="font-size:15px;font-weight:600;margin-top:4px;overflow-wrap:anywhere;word-break:break-word">' + esc(rec.req || '—') + '</div></div>';
 h += '<div style="min-width:0;background:#161b22;border:1px solid #30363d;border-radius:10px;padding:10px">' +
 '<div style="font-size:11px;color:#8b949e">上游回的</div>' +
 '<div style="font-size:15px;font-weight:600;margin-top:4px;overflow-wrap:anywhere;word-break:break-word;color:' + obsCol + '">' + esc(obs) + '</div></div>';
 h += '</div>';

 /* 形体证据 */
 h += '<div style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;padding:8px 16px">';
 var cell = function (k, v, c) {
 return '<div style="background:#161b22;border:1px solid #30363d;border-radius:10px;padding:8px 10px">' +
 '<div style="font-size:11px;color:#8b949e">' + k + '</div>' +
 '<div style="font-size:17px;font-weight:700;margin-top:2px;color:' + (c || '#e6edf3') + '">' + esc(String(v)) + '</div></div>';
 };
 h += cell('思考 token', thinkTxt, (thinkTxt === '0' || thinkTxt === '有') ? (thinkTxt === '0' ? '#d29922' : '#3fb950') : '#e6edf3');
 h += cell('首字用时', rec.ttft ? (rec.ttft + ' ms') : '—');
 h += cell('正文字数', rec.chars || 0);
 h += cell('速率', rate ? (rate + ' 字/秒') : '—', rate >= 120 ? '#d29922' : '#e6edf3');
 h += '</div>';

 /* 依据 */
 h += '<div style="padding:4px 16px 10px;font-size:12px;color:#c9d1d9;line-height:1.5">依据：' + esc(rec.note || '—') + '</div>';

/* v0.6 抗截断：只在识别到截断时多一行，版式不动 */
 if (rec.trunc) {
 h += '<div style="padding:0 16px 10px;font-size:12px;color:#d29922;line-height:1.5">本轮停止原因：' + esc(rec.truncNote || rec.trunc) + '</div>';
 }

/* v0.82 行为基线：只在命中时多一行黄色小字；不改判定、不进账本 */
 var bl = '';
 try { bl = baseLine(rec); } catch (eBj) {}
 if (bl) {
 h += '<div style="padding:0 16px 10px;font-size:12px;color:#d29922;line-height:1.5">行为基线：' + esc(bl) + '</div>';
 }

/* v0.84 结构指纹：命中才多一行黄色小字，和上面同一版式 */
 var sl = '';
 try { sl = shapeLine(rec); } catch (eSh) {}
 if (sl) {
 h += '<div style="padding:0 16px 10px;font-size:12px;color:#d29922;line-height:1.5">结构指纹：' + esc(sl) + '</div>';
 }

 /* 原始片段 */
 if (pk && pk.raw) {
 h += '<div style="margin:0 16px 10px;background:#010409;border:1px solid #21262d;border-radius:10px;padding:10px">' +
 '<div style="font-size:11px;color:#8b949e;margin-bottom:4px">响应原文（未加工）</div>' +
 '<div style="font-family:ui-monospace,Consolas,monospace;font-size:10.5px;color:#7ee787;word-break:break-all;line-height:1.45;max-height:96px;overflow:hidden">' +
 esc(pk.raw) + '</div></div>';
 } else {
 h += '<div style="margin:0 16px 10px;font-size:11px;color:#8b949e">（没抓到响应体：可能是渠道缓存/流式未回传，或本轮观察器未开）</div>';
 }

 /* 趋势 */
 if (spark) {
 h += '<div style="padding:0 16px 10px">' +
 '<div style="font-size:11px;color:#8b949e;margin-bottom:4px">近 ' + charsArr.length + ' 轮正文字数（最后一根=本轮）</div>' +
 cardBars(charsArr, col) + '</div>';
 }

 /* 底部按钮 */
 h += '<div style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;padding:12px 16px 16px;border-top:1px solid #21262d">';
 h += '<button data-ar6-card="copy" style="flex:1;min-height:42px;background:#238636;border:0;border-radius:10px;color:#fff;font-size:14px;font-weight:600">复制文本</button>';
 h += '<button data-ar6-card="close" style="flex:1;min-height:42px;background:#21262d;border:1px solid #30363d;border-radius:10px;color:#c9d1d9;font-size:14px">关闭</button>';
 h += '</div>';
 h += '<div style="padding:0 16px 12px;font-size:10px;color:#484f58">Anti-Route v' + esc(VERSION || '') + ' · 渠道 ' + esc(rec.base || '—') + '</div>';
 h += '</div></div>';
 return h;
}

/* ---------------- 报告（给人看） ---------------- */

function cardTabBar(tab) {
 var on = 'background:#1f6feb;border:1px solid #1f6feb;color:#fff';
 var off = 'background:#161b22;border:1px solid #30363d;color:#c9d1d9';
 var h = '<div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;padding:10px 16px 0">';
 h += '<button data-ar6-card="tab" data-tab="human" style="min-height:34px;border-radius:8px;font-size:13px;' + (tab === 'engine' ? off : on) + '">报告</button>';
 h += '<button data-ar6-card="tab" data-tab="engine" style="min-height:34px;border-radius:8px;font-size:13px;' + (tab === 'engine' ? on : off) + '">排查</button>';
 return h + '</div>';
}

function cardHumanVerdict(rec) {
 var c = rec.code;
 if (c === 'diff') return { t: '这一轮被换了模型', s: '请求的和回来的不是同一个模型。这条是最硬的证据，可以直接截图。', c: '#f85149' };
 if (c === 'thin') return { t: '模型没变，但它没在思考', s: '回复还在，可是没有任何思考过程 —— 常见于思考档位被压到最低。', c: '#d29922' };
 if (c === 'same') return { t: '这一轮正常', s: '回来的模型与请求一致，正文也完整。', c: '#3fb950' };
 if (c === 'echo') return { t: '渠道只是把名字回显回来', s: '它不读模型名，所以「名字对得上」不能当成证据。', c: '#8b949e' };
 if (c === 'quota') return { t: '额度用完了', s: '这是限流，不是偷偷换模型。', c: '#a371f7' };
 if (c === 'blocked') return { t: '被上游拦了', s: '内容安全拦截，不是降级。', c: '#f85149' };
 if (c === 'empty') {
 if (/确认空回/.test(String(rec.note || ''))) {
 return { t: '这一轮确实没有正文', s: '聊天和响应体里都没有文字——真正的空回，重发一次通常就好。', c: '#8b949e' };
 }
 return { t: '没读到正文（不是模型的问题）', s: '这次没从响应体拿到文字（旁路取样可能关着），先别当成降级。', c: '#8b949e' };
 }
 if (c === 'error') return { t: '请求失败了', s: 'HTTP 报错，先看渠道和密钥。', c: '#f85149' };
 return { t: '这一轮看不出来', s: '没拿到能判断的字段 —— 不是「没事」，是「没看见」。', c: '#8b949e' };
}

function cardEvidenceItems(rec) {
 var pk = cardPeek(rec);
 var bodyModel = (pk && (pk.modelVersion || pk.model)) || '';
 var it = [];
 var fromBody = String(rec.src || '') === 'body';
 var shownModel = bodyModel || (fromBody && rec.obs && rec.obs !== '—' ? rec.obs : '');
 it.push({ k: '响应体里的模型标识', v: shownModel || (rec.obs && rec.obs !== '—' ? rec.obs + '（来自聊天记录，不是响应体）' : '未取得'), lv: shownModel ? '强' : (rec.obs && rec.obs !== '—' ? '弱' : '缺失') });
 it.push({ k: '与请求的模型是否一致', v: (rec.req && rec.obs && rec.req === rec.obs) ? '一致（可能是回声）' : (rec.obs && rec.obs !== '—' ? '不一致' : '未取得'), lv: (rec.req && rec.obs && rec.req === rec.obs) ? '弱' : (rec.obs && rec.obs !== '—' ? '强' : '缺失') });
 it.push({ k: '有没有思考链', v: rec.think ? '有' : '没有', lv: rec.think ? '形态' : '弱' });
 if (rec.bodyText) it.push({ k: '正文是怎么拿到的', v: '聊天没提交，从响应体读到的', lv: '形态' });
 it.push({ k: '思考 token 数', v: (pk && pk.thoughts != null) ? String(pk.thoughts) : (rec.think ? '有（未计量）' : '0'), lv: '形态' });
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
 var m = { diff: '被换', thin: '未观测到思考', empty: '无正文', same: '一致', echo: '只是回显', unknown: '无法判断', quota: '配额', blocked: '被拦', gate: '网关报错', error: '请求失败' };
 return m[code] || String(code || '记录');
}

function cardHumanHTML(rec) {
 var v = cardHumanVerdict(rec);
 var items = cardEvidenceItems(rec);
 var tally = cardTally(items);
 var rate = cardRate(rec);
 var secs = Math.round((Number(rec.total) || 0) / 100) / 10;
 /* v0.82 行为基线：命中才显示，没命中一个字节都不多 */
 var bl = '';
 try { bl = baseLine(rec); } catch (eBj) {}
 /* v0.84 结构指纹：命中才显示，同样只提示格式 */
 var sl = '';
 try { sl = shapeLine(rec); } catch (eSh) {}
 var lvColor = { '强': '#3fb950', '形态': '#58a6ff', '弱': '#d29922', '缺失': '#6e7681' };
 var h = '';
 h += '<style>#ar6-card,#ar6-card *{box-sizing:border-box;min-width:0}#ar6-card{animation:ar6-fade .14s linear}#ar6-card>div{animation:ar6-rise .2s cubic-bezier(.2,.8,.2,1)}@media (prefers-reduced-motion:reduce){#ar6-card,#ar6-card>div{animation:none}}</style>';
 h += '<div id="ar6-card" style="' + cardOverlayCss() + 'z-index:2147483600;background:rgba(1,4,9,.86);font-family:system-ui,-apple-system,\'Segoe UI\',sans-serif">';
 h += '<div style="width:402px;max-width:calc(100vw - 20px);max-height:' + cardBoxMaxH(92) + ';overflow-x:hidden;overflow:auto;background:#0d1117;color:#e6edf3;border:1px solid #30363d;border-radius:16px;box-shadow:0 12px 48px rgba(0,0,0,.6)">';
 h += cardTabBar('human');
 h += '<div data-ar6-cardbody="1" style="padding:14px 16px 10px;border-bottom:1px solid #21262d">';
 h += '<div style="display:inline-block;font-size:11px;padding:3px 8px;border-radius:999px;background:' + v.c + '22;color:' + v.c + ';border:1px solid ' + v.c + '55;margin-bottom:8px">' + esc(cardCodeLabel(rec.code)) + '</div>';
 h += '<div style="font-size:21px;font-weight:700;line-height:1.3;color:' + v.c + '">' + esc(v.t) + '</div>';
 h += '<div style="font-size:12.5px;color:#c9d1d9;line-height:1.55;margin-top:6px">' + esc(v.s) + '</div>';
 h += '</div>';
 h += '<div style="display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:6px;padding:10px 16px 4px;text-align:center">';
 h += '<div style="background:#161b22;border:1px solid #30363d;border-radius:8px;padding:6px 4px"><div style="font-size:16px;font-weight:700;color:#e6edf3">' + esc(rec.obs && rec.obs !== '—' ? rec.obs : '未知') + '</div><div style="font-size:10px;color:#8b949e;margin-top:2px">在算的模型</div></div>';
 h += '<div style="background:#161b22;border:1px solid #30363d;border-radius:8px;padding:6px 4px"><div style="font-size:16px;font-weight:700;color:#e6edf3">' + secs + 's</div><div style="font-size:10px;color:#8b949e;margin-top:2px">' + (rate ? rate + ' 字/秒' : '耗时') + '</div></div>';
 h += '<div style="background:#161b22;border:1px solid #30363d;border-radius:8px;padding:6px 4px"><div style="font-size:16px;font-weight:700;color:#e6edf3">' + (Number(rec.chars) || 0) + '</div><div style="font-size:10px;color:#8b949e;margin-top:2px">正文字数</div></div>';
 h += '</div>';
 h += '<div style="padding:10px 16px 4px;font-size:12px;color:#8b949e">证据清单</div>';
 h += '<div style="padding:4px 16px 8px">';
 for (var i = 0; i < items.length; i++) {
 var it = items[i];
 var c = lvColor[it.lv] || '#8b949e';
 h += '<div style="display:flex;align-items:flex-start;gap:8px;padding:5px 0;border-bottom:1px dashed #21262d">' +
 '<div style="flex:0 0 auto;font-size:10px;padding:1px 6px;border-radius:999px;background:' + c + '22;color:' + c + ';border:1px solid ' + c + '55;margin-top:1px">' + esc(it.lv) + '</div>' +
 '<div style="flex:1 1 auto;font-size:12.5px;color:#c9d1d9;line-height:1.45">' + esc(it.k) +
 '<div style="font-size:11px;color:#8b949e;margin-top:1px;overflow-wrap:anywhere">' + esc(String(it.v)) + '</div></div></div>';
 }
 h += '</div>';
 h += '<div style="margin:0 16px 10px;padding:9px 10px;background:#161b22;border:1px solid #30363d;border-radius:8px;font-size:12px;color:#c9d1d9;line-height:1.5">' +
 '强证据 <b style="color:#3fb950">' + tally.strong + '</b> · 形态 <b style="color:#58a6ff">' + tally.shape + '</b> · 弱 <b style="color:#d29922">' + tally.weak + '</b> · 缺失 <b style="color:#6e7681">' + tally.missing + '</b>' +
 '<div style="font-size:11px;color:#8b949e;margin-top:3px">只统计真证据：模型名对得上但渠道回显时，那条只算「弱」。</div></div>';
 /* v0.82 行为基线：一行黄色小字，只提示手感，不动上面的判定 */
 if (bl) {
 h += '<div style="margin:0 16px 10px;font-size:12px;color:#d29922;line-height:1.5">行为基线：' + esc(bl) + '</div>';
 }
 /* v0.84 结构指纹：命中才多一行，同样只提示 */
 if (sl) {
 h += '<div style="margin:0 16px 10px;font-size:12px;color:#d29922;line-height:1.5">结构指纹：' + esc(sl) + '</div>';
 }
 h += '<div style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;padding:10px 16px 14px;border-top:1px solid #21262d">';
 h += '<button data-ar6-card="copy" style="min-height:42px;background:#238636;border:0;border-radius:10px;color:#fff;font-size:14px;font-weight:600">复制文本</button>';
 h += '<button data-ar6-card="close" style="min-height:42px;background:#21262d;border:1px solid #30363d;border-radius:10px;color:#c9d1d9;font-size:14px">关闭</button>';
 h += '</div>';
 h += '<div style="padding:0 16px 12px;font-size:10px;color:#484f58">' + esc(new Date(Number(rec.at) || Date.now()).toLocaleString()) + ' · Anti-Route v' + esc(VERSION || '') + ' · 渠道 ' + esc(rec.base || '—') + '</div>';
 h += '</div></div>';
 return h;
}

function cardHTML(rec, tab) {
 var t = tab === 'human' ? 'human' : 'engine';
 if (t === 'human') return cardHumanHTML(rec);
 /* v8.0.3：页签已挂进卡片容器，这里不再拼到遮罩外层 */
 return cardEngineHTML(rec);
}

function closeCard() {
 CARD.open = false;
 /* v1.2：说明浮窗现在是独立窗口，它自己的拖动/滚动监听要有人收尾 */
 try { if (typeof closeHelp === 'function') closeHelp(); } catch (eH) {}
 try {
 var el = DOC.getElementById('ar6-card');
 if (el && el.parentNode) el.parentNode.removeChild(el);
 } catch (e) {}
 /* v8.0.3：mountHTML 会把 <style> 等兄弟节点也 append 到 body，一起清掉 */
 try {
 var ex = DOC.querySelectorAll('[data-ar6-extra="1"]');
 for (var i = 0; i < ex.length; i++) { if (ex[i] && ex[i].parentNode) ex[i].parentNode.removeChild(ex[i]); }
 } catch (e2) {}
}

function mountHTML(html) {
 /* 同一时刻只留一个浮层：先清旧的，避免叠加成一摞 */
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
 var log = readLog();
 rec = log && log[0];
 if (!rec) { banner('还没有记录，先跑一轮', 'gray'); return; }
 }
 closeCard();
 var node = mountHTML(cardHTML(rec, tab));
 if (!node) throw new Error('mount failed');
 CARD.open = true;
 CARD.rid = rec.rid || 0;
 node.addEventListener('click', function (ev) {
 var t = ev.target;
 var act = t && t.getAttribute && (t.getAttribute('data-ar6-card') || '');
 if (act === 'copy') { cardCopy(rec); return; }
 if (act === 'tab') { openCard(rec, t.getAttribute('data-tab')); return; }
 if (act === 'close' || t === node) closeCard();
 });
 } catch (e) {
 try { banner('证据卡渲染失败：' + String(e && e.message || e), 'bad'); } catch (e2) {}
 }
}
