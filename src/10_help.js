/* 10_help.js — 内置说明页（离线，不联网）
 写法约定（v0.7）：按「你现在卡在哪」排页，每条一句「看到什么，点什么」；
 不写原理、不写技术词、不写数字状态码。页面数据结构：{h,l} 或 {h,kv} 或 {q,a}。
 v0.7：七页重写（说明升级后用户只需翻一页就知道下一步点哪） */

var HELP_TABS = [
 { k: 'how', t: '装完先做啥' },
 { k: 'map', t: '按钮在哪' },
 { k: 'narr', t: '防全知去媚' },
 { k: 'jail', t: '不肯写时' },
 { k: 'read', t: '结果怎么看' },
 { k: 'faq', t: '出问题了' },
 { k: 'trunc', t: '抗截断' }
];

var HELP_PAGES = {

 /* ---------------- 装完先做啥 ---------------- */
 
how: [
 { h: '装完先做啥', l: [
 '装完只做一件事：照常聊一轮。',
 '面板里多出一行记录，就是装好了。',
 '没多：先看面板上那句提示——多数是「只查 Gemini」把你要查的模型挡在外面。',
 '你要查的不是 Gemini：点「更多」，把「只查 Gemini」关掉。',
 '觉得答得短、没思考、变笨：点「看报告」，先截图。',
 '工具栏只有一个按钮，点它就开面板。',
 '那个按钮点不动：扩展菜单里点「魔法棒」，开的是同一个面板。',
 '两个都点不动：控制台跑 __AR6__openPanel()。',
 '剩下的都不用点。'
 ] }
],

 /* ---------------- 面板在哪一层 ---------------- */
 map: [
 { h: '按钮在哪', l: [
 '打开面板只有四块：总开关、数字行、三张卡、底部两个按钮。',
 '想改哪一项，就点那一项：点一下换一档，再点换下一档。',
 '卡 1 是「防路由」总开关：关掉就完全不管，请求原样发出去。',
 '卡 2 是「破甲 + 抗截断」：右边那个档位点一下换一档。',
 '卡 3 是「叙述层」：防全知、去媚，各点一下换一档。',
 '卡 4 是「反 OOC」：一下开关。',
 '「看报告」：这一轮的证据和原文，能复制、能截图。',
 '「更多」：所有细项都收在里面，不点开照样能用。',
 '「更多」里从上到下是：更新 / 防护细项 / 反 OOC 细项 / 数据 / 地址与凭据。',
 '「数据」里有：导出记录、说明、清空、重建基线。',
 '点面板外面、点 ✕、按 Esc，都能关掉。'
 ] }
],

 /* ---------------- 防全知去媚 ---------------- */
 narr: [
 { h: '防全知去媚', l: [
 '卡 3 两行，各点一下换一档：关 → 轻 → 强。',
 '默认都关，不点也没事。',
 '⚠ 想让它「抢话」（替你的角色说话、替你想、替你选）：防全知别开。',
 '因为它禁止写内心话，也禁止替任何角色做决定——包括你的角色。',
 '想留着心理描写、只想把镜头收住：点「轻」，别点「强」。',
 '它说出你没说过的事：防全知「轻」。',
 '还这样：再点到「强」，多数人「轻」就够。',
 '角色天天围着你转、太好哄：去媚「轻」。',
 '写着写着世界只剩你俩：去媚推到「强」。',
 '写日常、轻喜剧：两个都别开，人物会变钝。',
 '做对比实验：两个都关，不然说不清是谁的功劳。',
 '关掉就断干净，不会留在后面几轮。'
 ] },
 { h: '🎭 反 OOC', l: [
 '它管：角色别写着写着变成另一个人。',
 '卡 4 是总开关；四项细调在「更多 → 反 OOC 细项」。',
 '点名——动笔前把这一场有谁点一遍，各自对一遍世界书里自己的条目。',
 '反模板——不许用「眼底闪过」「嘴角勾起」这类谁都能做的动作包打发情绪。',
 '变更门槛——态度变了，得说得出是哪件事改的；说不出来就别写。',
 '口吻一致——把这句话换给另一个人说也成立，那就是写错了。',
 '世界书：读你当前角色卡绑的那本，换角色就换书；没绑就只用其余三项。',
 '和预设打架：预设里也写了同类条目时会弹窗问你——用我们的，还是用预设的。选哪个都行，我们不动预设一个字。',
 '它不做什么：不改你的世界书、不写聊天记录、不额外调用模型。'
 ] }
],

 /* ---------------- 不肯写 / 写一半断 ---------------- */
 jail: [
 { h: '不肯写时', l: [
 '这页管两件事：它不肯写，和它写一半停。',
 '一句话都不写、怎么问都不写：卡 2 的档位点到「中档」。',
 '中档只管事后：发现不对，弹窗问你补不补。',
 '还是不肯：再点到「强力」，它会改你的请求。',
 '开强力会弹一次确认：看清那两行字再点。',
 '代价是：判定会变糊，也可能更容易被拦。',
 '弹窗三个键：补一次、不用了、别再问我。',
 '默认「先问你」，宁可多点一下，别莫名多一段。',
 '后悔了：把「补前先问」点回开。',
 '只想手动补：卡 2 下面直接点「补一次」，不用等它判断。',
 '补完还不行：别硬补，换渠道或换模型。'
 ] }
],

 /* ---------------- 结果怎么看 ---------------- */
 read: [
 { h: '结果怎么看', l: [
 '红：回来的不是你要的模型，能直接截图。',
 '红的时候：点「看报告」拿原文，然后换渠道。',
 '黄：名字对，但这轮没思考，或思考被压没了。',
 '黄的时候：也在报告里，看「停止原因」那行。',
 '绿：名字对、正文也完整，这轮算正常。',
 '灰：没拿到能判断的东西，不是「没事」。',
 '灰的时候：先确认「只查 Gemini」没把它挡在外面。',
 '「只是回显」：渠道不读名字，差异不能当证据。',
 '「无正文」：真空回就重发；没读到别当降级。',
 '等级 A/B/C：只说明证据硬不硬，C 就多攒几轮。'
 ] }
],

 /* ---------------- 出问题了 ---------------- */
 faq: [
 { h: '出问题了', l: [
 '装了两个：留一个，另一个先禁用。',
 '设置会自己带过来，删之前不用备份。',
 '一条记录都没有：先聊一轮；还空白，看是不是只查 Gemini。',
 '手机面板只露半截：先试试能不能上下滑；滑不动就把截图发出来。',
 '想整段发给别人：说明页底部「复制这段」，一次一页。',
 '点了「检查更新」没反应：看红字写什么；「更多」里能看到状态行。',
 '装了新版本但没生效：刷一次页面；还不行点「↩ 撤销更新」。',
 '换了渠道、旧记录还留着：点「更多 → 重建基线」，让它按新渠道重新学。',
 '它自己发请求、你没说话：先别关窗口，抓日志。',
 '有人说这脚本能保证不换模型：别信。',
 '名字对得上别急着高兴：先看这台渠道认不认名字。',
 '高思考有没有生效：这边看不出来，别指望它测。'
 ] }
],

 /* ---------------- 抗截断 ---------------- */
 trunc: [
 { h: '抗截断', l: [
 '卡 2 右边那个档位，点一下换一档。',
 '顺序：关 → 轻 → 中 → 关，点错再点。',
 '回复老停在半句、逗号上：换「轻档」。',
 '刚开头就收尾、明显短：也换「轻档」。',
 '轻档还断、又懒得每次点：升「中档」。',
 '中档会自己接一段，不用你动手。',
 '只想让 AI 说短话：别开，它偏要写长。',
 '想比两个渠道：先关掉，不然说不清是谁的问题。',
 '为什么停：报告里有「停止原因」那一行。',
 '一轮只补一次；补完还断，就是真到上限了。',
 '被审核拦的：它认得出，但补了也没用。'
 ] }
]

};

/* 一句话的语义色：做什么=蓝 / 什么时候开=绿 / 别开=黄 / 其余=灰 */
function helpTone(t) {
 var s = String(t == null ? '' : t);
 if (s.indexOf('做什么') === 0) return 'a';
 if (s.indexOf('什么时候') === 0) return (s.indexOf('别') >= 0) ? 'y' : 'g';
 if (s.indexOf('别') === 0) return 'y';
 if (s.indexOf('该做的事') === 0) return 'a';
 return '';
}

function helpPageHTML(tab) {
 var k = 'how';
 for (var i = 0; i < HELP_TABS.length; i++) if (HELP_TABS[i].k === tab) k = tab;
 var list = HELP_PAGES[k] || HELP_PAGES.how;
 var h = '';
 for (var j = 0; j < list.length; j++) {
 var sec = list[j];
 var plain = [];
 if (sec.q) plain.push(sec.q);
 if (sec.h) plain.push(sec.h);
 if (sec.kv) for (var p = 0; p < sec.kv.length; p++) plain.push(sec.kv[p][0] + ' ' + sec.kv[p][1]);
 var ls = sec.q ? sec.a : sec.l;
 if (ls) for (var p2 = 0; p2 < ls.length; p2++) plain.push(ls[p2]);

 h += '<div class="ar6h-sec" id="ar6h-s' + j + '" data-txt="' + esc(plain.join(' ').toLowerCase()) + '">';

 if (sec.q) {
 h += '<div class="ar6h-q"><span class="ar6h-qm">Q</span>' + esc(sec.q) + '</div>';
 for (var a = 0; a < sec.a.length; a++) {
 h += '<div class="ar6h-l"><i class="ar6h-i"></i><span>' + esc(sec.a[a]) + '</span></div>';
 }
 } else {
 h += '<div class="ar6h-h"><b>' + (j + 1 < 10 ? '0' : '') + (j + 1) + '</b>' + esc(sec.h) + '</div>';
 if (sec.kv) {
 for (var t = 0; t < sec.kv.length; t++) {
 h += '<div class="ar6h-kv"><div class="ar6h-k">' + esc(sec.kv[t][0]) + '</div>' +
 '<div class="ar6h-v">' + esc(sec.kv[t][1]) + '</div></div>';
 }
 }
 if (sec.l) {
 for (var m = 0; m < sec.l.length; m++) {
 var tone = helpTone(sec.l[m]);
 h += '<div class="ar6h-l' + (tone ? ' ' + tone : '') + '">' +
 '<i class="ar6h-i"></i><span>' + esc(sec.l[m]) + '</span></div>';
 }
 }
 }
 h += '</div>';
 }
 h += '<div class="ar6h-none" id="ar6h-none" style="display:none">这一页没有匹配的段落。换个词，或切到别的页签。</div>';
 return h;
}

function helpText(tab) {
 var k = 'how';
 for (var i = 0; i < HELP_TABS.length; i++) if (HELP_TABS[i].k === tab) k = tab;
 var list = HELP_PAGES[k] || HELP_PAGES.how;
 var out = [];
 for (var j = 0; j < list.length; j++) {
 var sec = list[j];
 if (sec.q) {
 out.push('Q：' + sec.q);
 for (var a = 0; a < sec.a.length; a++) out.push(sec.a[a]);
 out.push('');
 continue;
 }
 out.push('【' + sec.h + '】');
 if (sec.kv) for (var t = 0; t < sec.kv.length; t++) out.push(sec.kv[t][0] + ' → ' + sec.kv[t][1]);
 if (sec.l) for (var m = 0; m < sec.l.length; m++) out.push(sec.l[m]);
 out.push('');
 }
 return out.join('\n').replace(/\n+$/, '') + '\n\n—— 卢克之光 V' + VERSION + ' · 说明页 · 离线可用';
}

function helpCopy(tab) {
 var txt = helpText(tab);
 try {
 if (HOST.navigator && HOST.navigator.clipboard && HOST.navigator.clipboard.writeText) {
 HOST.navigator.clipboard.writeText(txt).then(function () { banner('已复制说明', 'ok'); }, function () { helpCopyFallback(txt); });
 return;
 }
 } catch (e) {}
 helpCopyFallback(txt);
}

function helpCopyFallback(txt) {
 try {
 var ta = DOC.createElement('textarea');
 ta.value = txt;
 ta.style.position = 'fixed';
 ta.style.left = '-9999px';
 DOC.body.appendChild(ta);
 ta.select();
 DOC.execCommand('copy');
 DOC.body.removeChild(ta);
 banner('已复制说明', 'ok');
 } catch (e) {
 banner('复制失败：手动选中文字', 'warn');
 }
}

/* v1.2：说明页从主面板里独立出来，是一个 position:fixed 的浮窗（#ar6-help）。
   尺寸由 CSS 兜底，JS 只在每次打开时算一次位置：有 cfg.helpX/helpY 就复原，没有就居中。
   头部可拖；页签条只负责横向滚动，不参与拖窗。 */
function helpVH() {
 var vv = (HOST.visualViewport && HOST.visualViewport.height) || HOST.innerHeight || 0;
 return Math.round(vv || 640);
}
function helpVW() {
 var vv = (HOST.visualViewport && HOST.visualViewport.width) || HOST.innerWidth || 0;
 return Math.round(vv || 390);
}
function helpIsMob() {
 try { return (typeof uiMode === 'function' && uiMode() === 'mobile'); } catch (e) { return false; }
}
function helpGeom(big, px, py) {
 var vw = helpVW(), vh = helpVH(), m = 8;
 var w, h;
 var mob = helpIsMob();
 if (big) {
  w = Math.max(240, vw - m * 2);
  h = Math.max(260, vh - m * 2);
 } else if (mob) {
  w = Math.max(240, vw - 16);
  h = Math.max(260, Math.round(vh * 0.86));
 } else {
  w = Math.min(430, Math.max(240, vw - 20));
  h = Math.min(620, Math.round(vh * 0.86));
 }
 if (w > vw - m * 2) w = Math.max(200, vw - m * 2);
 if (h > vh - m * 2) h = Math.max(200, vh - m * 2);
 var x = (typeof px === 'number' && isFinite(px)) ? Math.round(px) : Math.round((vw - w) / 2);
 var y = (typeof py === 'number' && isFinite(py)) ? Math.round(py) : Math.round((vh - h) / 2);
 if (x < m) x = m;
 if (x > vw - w - m) x = Math.max(m, vw - w - m);
 if (y < m) y = m;
 if (y > vh - h - m) y = Math.max(m, vh - h - m);
 return { x: x, y: y, w: w, h: h, vw: vw, vh: vh };
}
/* 只在「本次打开」时套一次几何；之后由拖动改 left/top，render 不再重算。 */
function helpApplyGeom(node) {
 if (!node) return null;
 if (node.getAttribute && node.getAttribute('data-ar6-geom') === '1') return null;
 var px = null, py = null;
 try {
  if (cfg) {
   if (typeof cfg.helpX === 'number' && isFinite(cfg.helpX)) px = cfg.helpX;
   if (typeof cfg.helpY === 'number' && isFinite(cfg.helpY)) py = cfg.helpY;
  }
 } catch (e0) {}
 var g = helpGeom(!!(cfg && cfg.helpBig), null, null);
 var x = g.x, y = g.y;
 try {
  node.style.position = 'fixed';
  node.style.margin = '0';
  node.style.maxWidth = 'none';
  node.style.maxHeight = 'none';
  node.style.minHeight = '0';
  node.style.width = g.w + 'px';
  node.style.height = g.h + 'px';
  if (px !== null || py !== null) {
   var p = helpClampPos(node, px === null ? g.x : px, py === null ? g.y : py);
   x = p.x;
   y = p.y;
  }
  node.style.left = x + 'px';
  node.style.top = y + 'px';
  node.setAttribute('data-ar6-hg', x + ',' + y + ',' + g.w + ',' + g.h);
  node.setAttribute('data-ar6-geom', '1');
  g.x = x;
  g.y = y;
 } catch (e1) {}
 return g;
}
/* 拖窗边界：至少留 40px 在视口里；纵向保证 44px 的头部还够得着。 */
function helpClampPos(node, x, y) {
 var vw = helpVW(), vh = helpVH();
 var w = 0, h = 0;
 try { w = node.offsetWidth || 0; h = node.offsetHeight || 0; } catch (e0) {}
 if (!(w > 0)) w = parseInt(node.style && node.style.width, 10) || 320;
 if (!(h > 0)) h = parseInt(node.style && node.style.height, 10) || 240;
 var keep = 40;
 var minX = keep - w;
 var maxX = vw - keep;
 if (maxX < minX) maxX = minX;
 var minY = 0;
 var maxY = vh - 44;
 if (maxY < 0) maxY = 0;
 if (x < minX) x = minX;
 if (x > maxX) x = maxX;
 if (y < minY) y = minY;
 if (y > maxY) y = maxY;
 return { x: Math.round(x), y: Math.round(y) };
}
function helpHTML(tab) {
 var k = 'how';
 for (var i = 0; i < HELP_TABS.length; i++) if (HELP_TABS[i].k === tab) k = tab;
 var mob = helpIsMob();
 var big = !!(cfg && cfg.helpBig);
 var h = '';
 h += '<div id="ar6-help" role="dialog" aria-label="说明" data-ar6-extra="1" data-ar6-help="1" data-ar6-mob="' + (mob ? '1' : '0') + '">';
 h += '<style>' +
  '#ar6-help{--hbg:#0d1117;--hcd:#161b22;--hln:#30363d;--hfg:#e6edf3;--hdim:#8b949e;--hdim2:#6e7681;--ha:#58a6ff;--hg:#3fb950;--hy:#d29922;--hr:#f85149;' +
  'position:fixed;left:0;top:0;z-index:2147483100;' +
  'width:min(430px,calc(100vw - 20px));height:min(620px,86vh);' +
  'display:flex;flex-direction:column;background:var(--hbg);color:var(--hfg);' +
  'border:1px solid var(--hln);border-radius:16px;overflow:hidden;' +
  'box-shadow:0 12px 48px rgba(0,0,0,.6);' +
  'font-family:system-ui,-apple-system,Segoe UI,Noto Color Emoji,sans-serif}' +
  '#ar6-help,#ar6-help *{box-sizing:border-box;min-width:0}' +
  '#ar6-help button,#ar6-help input{font-family:inherit}' +
  '#ar6-help[data-ar6-mob="1"]{width:calc(100vw - 16px);height:86vh}' +
  '#ar6-help .ar6h-wrap{display:flex;flex-direction:column;width:100%;height:100%;overflow:hidden}' +
  '#ar6-help .ar6h-head{flex:0 0 auto;height:44px;display:flex;align-items:center;padding:0 2px 0 14px;' +
  'border-bottom:1px solid var(--hln);background:linear-gradient(180deg,#10161d,var(--hbg));' +
  'cursor:grab;touch-action:none;user-select:none;-webkit-user-select:none}' +
  '#ar6-help .ar6h-head[data-ar6-drag="1"]{cursor:grabbing}' +
  '#ar6-help .ar6h-title{flex:1 1 auto;font-size:14px;font-weight:700;letter-spacing:.02em}' +
  '#ar6-help .ar6h-x{flex:0 0 44px;width:44px;height:44px;padding:0;border:0;background:transparent;' +
  'color:var(--hdim);font-size:18px;line-height:44px;text-align:center;cursor:pointer;border-radius:8px}' +
  '#ar6-help .ar6h-x:hover{background:rgba(255,255,255,.06);color:var(--hfg)}' +
  '#ar6-help .ar6h-top{flex:0 0 auto}' +
  '#ar6-help .ar6h-tabs{display:flex;gap:4px;padding:8px 10px 6px;overflow-x:auto;overflow-y:hidden;' +
  '-webkit-overflow-scrolling:touch;overscroll-behavior-x:contain;touch-action:pan-x;' +
  'scrollbar-width:thin;scrollbar-color:rgba(255,255,255,.28) transparent}' +
  '#ar6-help .ar6h-tabs::-webkit-scrollbar{height:4px}' +
  '#ar6-help .ar6h-tabs::-webkit-scrollbar-track{background:transparent}' +
  '#ar6-help .ar6h-tabs::-webkit-scrollbar-thumb{background:rgba(255,255,255,.28);border-radius:2px}' +
  '#ar6-help .ar6h-tab{flex:0 0 auto;padding:6px 9px;border-radius:999px;border:1px solid var(--hln);' +
  'background:var(--hcd);color:#c9d1d9;font-size:11.5px;font-weight:600;cursor:pointer;white-space:nowrap}' +
  '#ar6-help .ar6h-tab.on{background:#1f6feb;border-color:#1f6feb;color:#fff}' +
  '#ar6-help .ar6h-hbar{display:none;height:12px;margin:0 10px 2px;border-radius:6px;' +
  'background:rgba(255,255,255,.07);position:relative;touch-action:none;cursor:pointer;flex:0 0 auto}' +
  '#ar6-help .ar6h-hbar[data-none="0"]{display:block}' +
  '#ar6-help .ar6h-hbar[data-none="1"]{display:none}' +
  '#ar6-help .ar6h-hthumb{position:absolute;top:2px;left:0;height:8px;border-radius:4px;' +
  'background:rgba(255,255,255,.36);min-width:28px}' +
  '#ar6-help .ar6h-hbar[data-drag="1"] .ar6h-hthumb{background:rgba(255,255,255,.6)}' +
  '#ar6-help .ar6h-find{display:flex;gap:6px;align-items:center;padding:7px 12px 9px}' +
  '#ar6-help .ar6h-in{flex:1 1 auto;padding:7px 10px;border-radius:9px;border:1px solid var(--hln);' +
  'background:#0b0f14;color:var(--hfg);font-size:12.5px;outline:none;font-family:inherit}' +
  '#ar6-help .ar6h-in:focus{border-color:#1f6feb}' +
  '#ar6-help[data-ar6-mob="1"] .ar6h-in{font-size:16px}' +
  '#ar6-help .ar6h-body{flex:1 1 0;min-height:0;overflow-y:auto;overflow-x:hidden;' +
  'overscroll-behavior:contain;-webkit-overflow-scrolling:touch;padding:12px 14px 10px;' +
  'touch-action:pan-y;font-size:13px;line-height:1.75;' +
  'scrollbar-width:thin;scrollbar-color:rgba(255,255,255,.22) transparent}' +
  '#ar6-help .ar6h-body::-webkit-scrollbar{width:6px}' +
  '#ar6-help .ar6h-body::-webkit-scrollbar-thumb{background:rgba(255,255,255,.22);border-radius:3px}' +
  '#ar6-help .ar6h-sec{margin:0 0 16px;padding-left:9px;border-left:3px solid #21262d}' +
  '#ar6-help .ar6h-h{display:flex;gap:7px;align-items:baseline;font-size:13.5px;font-weight:700;' +
  'color:var(--hfg);margin:14px 0 7px}' +
  '#ar6-help .ar6h-h b{color:var(--hdim2);font-size:11px;font-weight:600;font-variant-numeric:tabular-nums}' +
  '#ar6-help .ar6h-l{display:flex;gap:7px;font-size:13px;line-height:1.75;color:#c9d1d9;margin:2px 0}' +
  '#ar6-help .ar6h-l span{flex:1 1 auto;word-break:break-word;white-space:pre-wrap}' +
  '#ar6-help .ar6h-i{flex:0 0 6px;height:6px;margin-top:9px;border-radius:50%;background:#21262d}' +
  '#ar6-help .ar6h-l.a .ar6h-i{background:var(--ha)}' +
  '#ar6-help .ar6h-l.g .ar6h-i{background:var(--hg)}' +
  '#ar6-help .ar6h-l.y .ar6h-i{background:var(--hy)}' +
  '#ar6-help .ar6h-kv{display:grid;grid-template-columns:.9fr 1.3fr;gap:6px;background:var(--hcd);' +
  'border:1px solid var(--hln);border-radius:9px;padding:7px 9px;margin:5px 0}' +
  '#ar6-help .ar6h-k{font-size:12.5px;line-height:1.7;color:var(--hdim);word-break:break-word;' +
  'padding-right:8px;border-right:1px solid rgba(255,255,255,.07)}' +
  '#ar6-help .ar6h-v{font-size:12.5px;line-height:1.7;color:var(--hfg);word-break:break-word}' +
  '#ar6-help .ar6h-q{display:flex;gap:7px;align-items:baseline;font-size:13px;font-weight:700;' +
  'color:var(--ha);margin-bottom:5px}' +
  '#ar6-help .ar6h-qm{flex:0 0 auto;font-size:10px;font-weight:700;padding:1px 5px;border-radius:5px;' +
  'background:rgba(88,166,255,.15);color:var(--ha)}' +
  '#ar6-help .ar6h-none{font-size:12.5px;color:var(--hdim);padding:10px 2px}' +
  '#ar6-help .ar6h-foot{flex:0 0 auto;border-top:1px solid var(--hln);background:#0b0f14;padding:9px 14px 10px}' +
  '#ar6-help .ar6h-ver{font-size:10.5px;color:var(--hdim2);margin-bottom:8px}' +
  '#ar6-help .ar6h-btns{display:flex;gap:8px}' +
  '#ar6-help .ar6h-b1,#ar6-help .ar6h-b2,#ar6-help .ar6h-b3{flex:1 1 0;height:40px;border-radius:9px;' +
  'font-size:13.5px;font-weight:700;cursor:pointer;padding:0 12px}' +
  '#ar6-help .ar6h-b1{border:0;background:#238636;color:#fff}' +
  '#ar6-help .ar6h-b2{border:1px solid var(--hln);background:var(--hcd);color:#c9d1d9;font-weight:400}' +
  '#ar6-help .ar6h-b3{border:1px solid var(--hln);background:var(--hcd);color:#c9d1d9;font-weight:400}' +
  '</style>';
 h += '<div class="ar6h-wrap">';
 h += '<div class="ar6h-head" data-ar6-helphead="1">' +
  '<span class="ar6h-title">说明</span>' +
  '<button type="button" class="ar6h-x" data-ar6-card="close" title="关闭" aria-label="关闭">✕</button>' +
  '</div>';
 h += '<div class="ar6h-top"><div class="ar6h-tabs">';
 for (var j = 0; j < HELP_TABS.length; j++) {
  var on = HELP_TABS[j].k === k;
  h += '<button type="button" class="ar6h-tab' + (on ? ' on' : '') + '" data-ar6-card="tab" data-tab="' +
   HELP_TABS[j].k + '">' + esc(HELP_TABS[j].t) + '</button>';
 }
 h += '</div>';
 h += '<div class="ar6h-hbar"><div class="ar6h-hthumb"></div></div>';
 h += '<div class="ar6h-find"><input class="ar6h-in" id="ar6h-find" placeholder="在本页里搜……（标题和正文都算）" ' +
  'autocomplete="off" spellcheck="false"></div></div>';
 h += '<div class="ar6h-body" id="ar6h-body">' + helpPageHTML(k) + '</div>';
 h += '<div class="ar6h-foot"><div class="ar6h-ver">卢克之光 V' + esc(VERSION) + ' · 说明页 · 离线可用</div>' +
  '<div class="ar6h-btns">' +
  '<button type="button" class="ar6h-b1" data-ar6-card="copy">复制这段</button>' +
  (mob ? '<button type="button" class="ar6h-b3" data-ar6-card="big">' + (big ? '还原' : '铺满') + '</button>' : '') +
  '<button type="button" class="ar6h-b2" data-ar6-card="close">关闭</button>' +
  '</div></div>';
 h += '</div></div>';
 return h;
}
function helpFilter(node) {
 try {
  var inp = node.querySelector('#ar6h-find');
  if (!inp) return;
  var q = String(inp.value || '').toLowerCase().replace(/^\s+|\s+$/g, '');
  var secs = node.querySelectorAll('.ar6h-sec');
  var hit = 0;
  for (var i = 0; i < secs.length; i++) {
   var txt = secs[i].getAttribute('data-txt') || '';
   var show = (!q || txt.indexOf(q) >= 0);
   secs[i].style.display = show ? '' : 'none';
   if (show) hit++;
  }
  var none = node.querySelector('#ar6h-none');
  if (none) none.style.display = (q && !hit) ? '' : 'none';
 } catch (e) {}
}
var HELP_NODE = null;
function helpMount(html) {
 var holder = null;
 try { holder = DOC.createElement('div'); } catch (e0) { holder = null; }
 if (!holder) return null;
 try { holder.innerHTML = html; } catch (e1) { return null; }
 var body = DOC.body;
 if (!body) return null;
 var node = null;
 var guard = 0;
 while (holder.firstChild && guard++ < 20) {
  var c = holder.firstChild;
  try { holder.removeChild(c); } catch (e2) { break; }
  if (c && c.id === 'ar6-help') node = c;
  try { body.appendChild(c); } catch (e3) {}
 }
 if (!node) {
  try { node = DOC.getElementById('ar6-help'); } catch (e4) { node = null; }
 }
 return node;
}
function closeHelp() {
 var node = HELP_NODE;
 HELP_NODE = null;
 try { if (CARD) { CARD.open = false; CARD.help = ''; } } catch (e0) {}
 if (!node) return;
 try { if (typeof node.__ar6HelpDragEnd === 'function') node.__ar6HelpDragEnd(); } catch (e1) {}
 try { if (typeof node.__ar6HBarCleanup === 'function') node.__ar6HBarCleanup(); } catch (e2) {}
 try { if (typeof node.__ar6HelpNodeCleanup === 'function') node.__ar6HelpNodeCleanup(); } catch (e4) {}
 try { if (node.parentNode) node.parentNode.removeChild(node); } catch (e3) {}
}
/* 打开时把当前页签滚进可视区中间（try/catch 包住，老 WebView 里静默失败）。 */
function helpScrollTab(node) {
 try {
  if (!node || !node.parentNode) return;
  var tabs = node.querySelector('.ar6h-tabs');
  if (!tabs) return;
  var on = tabs.querySelector('.ar6h-tab.on');
  if (!on) return;
  try {
   if (on.scrollIntoView) on.scrollIntoView({ inline: 'center', block: 'nearest' });
  } catch (e0) {
   try {
    var tr = tabs.getBoundingClientRect();
    var br = on.getBoundingClientRect();
    tabs.scrollLeft += (br.left - tr.left) - (tr.width - br.width) / 2;
   } catch (e1) {}
  }
  try { if (node.__ar6HBarSync) node.__ar6HBarSync(); } catch (e2) {}
 } catch (e) {}
}
/* 头部拖动：pointerdown 绑在头部（排除 data-ar6-card 的 ✕），move/up 临时挂 window。 */
function helpBindDrag(node) {
 if (!node || node.__ar6HelpDragBound) return;
 var head = node.querySelector('.ar6h-head');
 if (!head) return;
 node.__ar6HelpDragBound = 1;
 var on = false, sx = 0, sy = 0, ox = 0, oy = 0, prevCursor = '';
 function down(e) {
  if (!e || on) return;
  if (typeof e.button === 'number' && e.button !== 0) return;
  var t = e.target;
  if (t && t.getAttribute && t.getAttribute('data-ar6-card')) return;
  var el = t, guard = 0;
  while (el && el !== head && guard++ < 8) {
   if (el.getAttribute && el.getAttribute('data-ar6-card')) return;
   el = el.parentNode;
  }
  var r = null;
  try { r = node.getBoundingClientRect ? node.getBoundingClientRect() : null; } catch (e0) {}
  on = true;
  sx = e.clientX || 0;
  sy = e.clientY || 0;
  ox = (r && typeof r.left === 'number') ? r.left : (parseInt(node.style.left, 10) || 0);
  oy = (r && typeof r.top === 'number') ? r.top : (parseInt(node.style.top, 10) || 0);
  try { node.setAttribute('data-ar6-drag', '1'); } catch (e1) {}
  try { head.setAttribute('data-ar6-drag', '1'); } catch (e2) {}
  try {
   if (DOC.body && DOC.body.style) {
    prevCursor = DOC.body.style.cursor || '';
    DOC.body.style.cursor = 'grabbing';
   }
  } catch (e3) {}
  try {
   HOST.addEventListener('pointermove', move);
   HOST.addEventListener('pointerup', fin);
   HOST.addEventListener('pointercancel', fin);
  } catch (e4) {}
  try { if (e.preventDefault) e.preventDefault(); } catch (e5) {}
 }
 function move(e) {
  if (!on) return;
  var g = helpClampPos(node, ox + ((e.clientX || 0) - sx), oy + ((e.clientY || 0) - sy));
  try { node.style.left = g.x + 'px'; node.style.top = g.y + 'px'; } catch (e0) {}
  try { node.setAttribute('data-ar6-hg', g.x + ',' + g.y + ',' + (node.offsetWidth || 0) + ',' + (node.offsetHeight || 0)); } catch (e1) {}
  try { if (cfg) { cfg.helpX = g.x; cfg.helpY = g.y; } } catch (e2) {}
  try { if (e.preventDefault) e.preventDefault(); } catch (e3) {}
 }
 function fin() {
  if (!on) return;
  on = false;
  try { saveCfg(); } catch (e0) {}
  try { HOST.removeEventListener('pointermove', move); } catch (e1) {}
  try { HOST.removeEventListener('pointerup', fin); } catch (e2) {}
  try { HOST.removeEventListener('pointercancel', fin); } catch (e3) {}
  try { node.removeAttribute('data-ar6-drag'); } catch (e4) {}
  try { head.removeAttribute('data-ar6-drag'); } catch (e5) {}
  try { if (DOC.body && DOC.body.style) DOC.body.style.cursor = prevCursor; } catch (e6) {}
 }
 head.addEventListener('pointerdown', down);
 node.__ar6HelpDragEnd = fin;
}
/* 页签横向滚动条：内容不溢出时隐藏；拖拇指 / 点轨道都能滚页签条。 */
function helpBindHBar(node) {
 var wrap = node && node.querySelector('.ar6h-wrap');
 var tabs = node && node.querySelector('.ar6h-tabs');
 var bar = node && node.querySelector('.ar6h-hbar');
 var th = node && node.querySelector('.ar6h-hthumb');
 if (!wrap || !tabs || !bar || !th) return;
 if (node.__ar6HBarBound) {
  try { if (node.__ar6HBarSync) node.__ar6HBarSync(); } catch (eB) {}
  return;
 }
 node.__ar6HBarBound = 1;
 var on = false, sx = 0, start = 0, ov0 = 0, tw0 = 0, ww0 = 0;
 var ro = null, gone = false;
 function clamp01(v) { return v < 0 ? 0 : (v > 1 ? 1 : v); }
 function over() { return (tabs.scrollWidth || 0) - (tabs.clientWidth || 0); }
 function hideBar() { try { bar.setAttribute('data-none', '1'); } catch (e0) {} }
 function showBar() { try { bar.setAttribute('data-none', '0'); } catch (e1) {} }
 function sync() {
  try {
   if (!node.parentNode || !tabs.parentNode || !bar.parentNode) return;
   var ov = over();
   if (ov <= 1) { hideBar(); return; }
   showBar();
   var tw = bar.clientWidth || 0;
   var sw = tabs.clientWidth || 0;
   var cw = tabs.scrollWidth || 0;
   if (!(tw > 0) || !(sw > 0) || !(cw > 0)) return;
   var w = Math.max(28, tw * sw / cw);
   if (w > tw) w = tw;
   var travel = tw - w;
   if (travel < 4) { hideBar(); return; }
   th.style.width = w + 'px';
   th.style.left = (travel * (tabs.scrollLeft / ov)) + 'px';
  } catch (e2) {}
 }
 function thDown(e) {
  try {
   tw0 = bar.clientWidth || 0;
   ww0 = th.offsetWidth || 28;
   if (tw0 - ww0 < 4) return;
   on = true;
   sx = e.clientX || 0;
   start = tabs.scrollLeft || 0;
   ov0 = over();
   bar.setAttribute('data-drag', '1');
   if (th.setPointerCapture && e.pointerId != null) th.setPointerCapture(e.pointerId);
   if (e.preventDefault) e.preventDefault();
  } catch (e3) {}
 }
 function thMove(e) {
  if (!on) return;
  try {
   tabs.scrollLeft = start + ((e.clientX || 0) - sx) * ov0 / Math.max(4, tw0 - ww0);
   if (e.preventDefault) e.preventDefault();
  } catch (e4) {}
 }
 function thUp() {
  if (!on) return;
  on = false;
  try { bar.removeAttribute('data-drag'); } catch (e5) {}
 }
 function barDown(e) {
  if (!e || e.target === th) return;
  try {
   var ov = over();
   if (ov <= 1) return;
   var tw = bar.clientWidth || 0;
   var ww = th.offsetWidth || 28;
   if (tw - ww < 4) return;
   var r = bar.getBoundingClientRect ? bar.getBoundingClientRect() : null;
   if (!r) return;
   var ratio = clamp01(((e.clientX || 0) - r.left - ww / 2) / Math.max(4, tw - ww));
   var left = ratio * ov;
   if (tabs.scrollTo) tabs.scrollTo({ left: left, behavior: 'smooth' });
   else tabs.scrollLeft = left;
   if (e.preventDefault) e.preventDefault();
  } catch (e6) {}
 }
 function onScroll() { sync(); }
 function onResize() {
  if (gone) return;
  if (!node.parentNode) { cleanup(); return; }
  sync();
 }
 function cleanup() {
  if (gone) return;
  gone = true;
  try { if (ro && ro.disconnect) ro.disconnect(); } catch (e7) {}
  ro = null;
  try { tabs.removeEventListener('scroll', onScroll); } catch (e8) {}
  try { th.removeEventListener('pointerdown', thDown); } catch (e9) {}
  try { th.removeEventListener('pointermove', thMove); } catch (e10) {}
  try { th.removeEventListener('pointerup', thUp); } catch (e11) {}
  try { th.removeEventListener('pointercancel', thUp); } catch (e12) {}
  try { th.removeEventListener('lostpointercapture', thUp); } catch (e13) {}
  try { bar.removeEventListener('pointerdown', barDown); } catch (e14) {}
  try { HOST.removeEventListener('resize', onResize); } catch (e15) {}
 }
 th.addEventListener('pointerdown', thDown);
 th.addEventListener('pointermove', thMove);
 th.addEventListener('pointerup', thUp);
 th.addEventListener('pointercancel', thUp);
 th.addEventListener('lostpointercapture', thUp);
 bar.addEventListener('pointerdown', barDown);
 tabs.addEventListener('scroll', onScroll, false);
 try {
  if (HOST.ResizeObserver) {
   ro = new HOST.ResizeObserver(function () {
    if (!node.parentNode) { cleanup(); return; }
    sync();
   });
   ro.observe(tabs);
   ro.observe(wrap);
  } else {
   HOST.addEventListener('resize', onResize);
  }
 } catch (e16) {
  try { HOST.addEventListener('resize', onResize); } catch (e17) {}
 }
 node.__ar6HBarSync = sync;
 node.__ar6HBarCleanup = cleanup;
 sync();
 try { setTimeout(function () { if (node.parentNode) sync(); }, 0); } catch (e18) {}
}
function openHelp(tab) {
 try {
  var k = tab || 'how';
  closeHelp();
  try { closeCard(); } catch (e0) {}
  var node = helpMount(helpHTML(k));
  if (!node) throw new Error('mount failed');
  HELP_NODE = node;
  try { if (CARD) { CARD.open = true; CARD.rid = -1; CARD.help = k; } } catch (e1) {}
  try { helpApplyGeom(node); } catch (e2) {}
  try { helpBindDrag(node); } catch (e3) {}
  try { helpBindHBar(node); } catch (e4) {}
  var onInput = function () { helpFilter(node); };
  var onCardClick = function (ev) {
   var t = ev && ev.target;
   var el = t, act = '', guard = 0;
   while (el && el !== node && guard++ < 8) {
    if (el.getAttribute) {
     var a = el.getAttribute('data-ar6-card');
     if (a) { act = a; break; }
    }
    el = el.parentNode;
   }
   if (!act) return;
   if (act === 'tab') { openHelp(el.getAttribute('data-tab')); return; }
   if (act === 'copy') {
    helpCopy(k);
    try {
     var orig = el.getAttribute('data-ar6-label');
     if (!orig) { orig = el.textContent || '复制这段'; el.setAttribute('data-ar6-label', orig); }
     el.textContent = '已复制';
     setTimeout(function () {
      try { el.textContent = orig; } catch (eT) {}
     }, 1200);
    } catch (eC) {}
    return;
   }
   if (act === 'big') {
    try { cfg.helpBig = !cfg.helpBig; cfg.helpX = null; cfg.helpY = null; saveCfg(); } catch (eB) {}
    openHelp((CARD && CARD.help) || k);
    return;
   }
   if (act === 'close') closeHelp();
  };
  node.addEventListener('input', onInput);
  node.addEventListener('click', onCardClick);
  node.__ar6HelpNodeCleanup = function () {
   try { node.removeEventListener('input', onInput); } catch (eN0) {}
   try { node.removeEventListener('click', onCardClick); } catch (eN1) {}
  };
  try { setTimeout(function () { helpScrollTab(node); }, 0); } catch (e5) {}
 } catch (e) {
  try { banner('说明页渲染失败：' + String((e && e.message) || e), 'bad'); } catch (e2) {}
 }
}
