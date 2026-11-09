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
 '装完只做两件事，别的不急。',
 '第一件：点「验渠道」，等它跑完。',
 '它会告诉你：名字能不能当证据。',
 '记住这个结论，后面全靠它。',
 '第二件：随便聊一轮，看面板有没有多一行。',
 '多了＝装好了，正常用，不用管。',
 '没多：点「自检 20 项」，看第一行是不是「是」。',
 '两件都做完，别的按钮都可以不碰。',
 '觉得答得短、变笨：点「报告」，先截图。',
 '想换渠道、想比模型：再看《结果怎么看》。',
 '工具栏只有一个按钮，点它就开面板。',
 '那个按钮点不动：扩展菜单点「魔法棒」。'
 ] }
 ],

 /* ---------------- 按钮在哪 ---------------- */
 map: [
 { h: '按钮在哪', l: [
 '面板最上面一行是状态条，随时能看。',
 '想改哪一项，就点状态条上那一项。',
 '「防护」：怀疑它把话弄坏了，先关掉再试。',
 '「微扰」：热门预设、老觉得被认出来，才开「轻」。',
 '「思考」：你预设里设过就别管，加了也不生效。',
 '「钉参数」：想让它拿不到就报错、别偷换，开。',
 '「观察器」：想多一条证据就开；记录乱就关。',
 '「安全」：一键全关，专门用来试「是不是它」。',
 '关了「安全」还能复现：那就不是脚本的锅。',
 '「最近请求」：想核对到底改没改，点它。'
 ] },
{ h: '手感和格式这两条', l: [
 '面板上多了两条：「📈 行为基线」「🔬 返回格式」。',
 '它们不看名字，只看形状——名字对得上、手感不对时才会响。',
 '响一次别慌：可能渠道真升级了，也可能真换了模型。',
 '连着响、而且越答越短：先点「报告」截图，再换回原来的模型对一轮。',
 '换了线路、买了新套餐之后：点「重建基线」，让它重新学。',
 '「重建基线」要点两次才生效，防止误触。',
 '「清空账本」现在会把账本和基线一起清掉。',
 '嫌吵就逐个关：点「行为基线」关手感，点「返回格式」关形状。',
 ] }
],

 /* ---------------- 防全知去媚 ---------------- */
 narr: [
 { h: '防全知去媚', l: [
 '两个开关：防全知、去媚，各自能点三档。',
 '默认都关着，不点也没事。',
 '⚠ 想让它「抢话」（替你的角色说话、替你想、替你选）：防全知别开。',
 '因为它禁止写内心话，也禁止替任何角色做决定——包括你的角色。',
 '想留着心理描写、只想把镜头收住：点「轻」，别点「强」。',
 '它说出你没说过的事：防全知点「轻」。',
 '还这样：再点一下到「强」，多数人「轻」就够。',
 '角色天天围着你转、太好哄：去媚点「轻」。',
 '写着写着世界只剩你俩：去媚推到「强」。',
 '写日常、轻喜剧：两个都别开，人物会变钝。',
 '做对比实验：两个都关，不然说不清是谁的功劳。',
 '担心改坏预设：不用，它只动这一次。',
 '关掉就断干净，不会留在后面几轮。'
 ] },
 /* v0.76：反 OOC —— 追加在本页末尾（「角色写出来像不像同一个人」属于这一层） */
 { h: '🎭 反 OOC（V0.76 新）', l: [
  '它管什么：让角色别写着写着变成另一个人。',
  '四个按钮，随便组合：',
  '点名——每轮把"这一场有谁"点一遍，让它动笔前对一遍世界书里各自的条目。',
  '反模板——不许用"眼底闪过""嘴角勾起"这类谁都能做的动作包打发情绪。',
  '变更门槛——态度变了，得说得出是哪件事改的；说不出来就别写。',
  '口吻一致——把这句话换给另一个人说也成立，那就是写错了。',
  '世界书怎么来的：读你当前角色卡绑的那本，换角色就换书，没绑就只灰掉「点名」，其余三项照常。',
  '和预设打架：预设里也写了同类条目时，会弹窗问你——用我们的，还是用预设的。选哪个都行，我们不动预设一个字。',
  '它不做什么：不改你的世界书、不写聊天记录、不额外调用模型。'
 ] }
 ],

 /* ---------------- 不肯写时 ---------------- */
 jail: [
 { h: '不肯写时', l: [
 '这里管「它不肯写」，不管「写一半断」。',
 '话说到一半就停：别在这页，去《抗截断》。',
 '空回、怎么问都不写：把「破甲」点到「普通」。',
 '普通只管事后：它发现不对，弹窗问你补不补。',
 '还是不肯：再点到「超级」，它会改你的请求。',
 '开超级会弹一次确认：看清那两行字再点。',
 '代价是：判定会变糊，也可能更容易被拦。',
 '弹窗三个键：补一次、不用了、别再问我。',
 '默认「先问你」，宁可多点一下，别莫名多一段。',
 '后悔了：把「补前先问」点回开。',
 '只想手动补：直接点「补一次」，不用等它判断。',
 '补完还不行：别硬补，换渠道或换模型。'
 ] }
 ],

 /* ---------------- 结果怎么看 ---------------- */
 read: [
 { h: '结果怎么看', l: [
 '红：回来的不是你要的模型，能直接截图。',
 '红的时候：点「排查」拿原文，然后换渠道。',
 '黄：名字对，但这轮没思考，或思考被压没了。',
 '黄的时候：点「档位检查」，说「被忽略」就换渠道。',
 '绿：名字对、正文也完整，这轮算正常。',
 '渠道会抄你的字：绿也不算数，先看《装完先做啥》。',
 '灰：没拿到能判断的东西，不是「没事」。',
 '灰的时候：先「验渠道」；还灰只能看长短和快慢。',
 '「只是回显」：渠道不读名字，差异不能当证据。',
 '「无正文」：真空回就重发；没读到别当降级。',
 '等级 A/B/C：只说明证据硬不硬，C 就多攒几轮。'
 ] }
 ],

 /* ---------------- 出问题了 ---------------- */
 faq: [
 { h: '出问题了', l: [
 '装了两个：留一个，另一个先禁用。',
 '删之前不用备份，设置会自己带过来。',
 '页脚写「按钮 0/1」：没绑上，但面板还能用。',
 '四个数字老不动：先聊一轮，再看。',
 '还是不涨：点「自检 20 项」，看第一行「挂钩」。',
 '一直显示「未知」：先「验渠道」，结论以它为准。',
 '手机面板只露半截：跑一次自检，把那行字发出去。',
 '它自己发请求、你没说话：先别关窗口，抓日志。',
 '想整段发给别人：底部「复制这段」，一次一页。',
 '有人说这脚本能保证不换模型：别信。',
 '名字对得上别急着高兴：先用「验渠道」。',
 '高思考有没有生效：这边看不出来，别指望它测。'
 ] }
 ],

 /* ---------------- 抗截断 ---------------- */
 trunc: [
 { h: '抗截断', l: [
 '「✂️ 抗截断」在面板「抗截断」那一行，点一下换一档。',
 '顺序：关 → 轻档 → 中档 → 关，点错再点。',
 '回复老停在半句、逗号上：换「轻档」。',
 '刚开头就收尾、明显短：也换「轻档」。',
 '轻档还断、又懒得每次点：升「中档」。',
 '中档会自己接一段，不用你动手。',
 '只想让 AI 说短话：别开，它偏要写长。',
 '想比两个渠道：先关掉，不然说不清是谁的问题。',
 '档位看「抗截断」那行的字；为啥停，屏幕上方会闪一下。',
 '截图给别人：「报告」里多一行停止原因。',
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

/* v0.4：说明页在 TT 的 iframe 里 vh 并不等于可视高度（手机上面板 580px、说明页却只有 300px）。
 所以尺寸一律用「像素」算，并允许拖动 / 铺满。桌面端走原先的 vh 布局，不改。 */
function helpVH() {
 var vv = (HOST.visualViewport && HOST.visualViewport.height) || HOST.innerHeight || 0;
 return Math.round(vv || 640);
}
function helpVW() {
 var vv = (HOST.visualViewport && HOST.visualViewport.width) || HOST.innerWidth || 0;
 return Math.round(vv || 390);
}
function helpGeom(big, px, py) {
 var vw = helpVW(), vh = helpVH(), m = 6;
 var w, h;
 if (big) {
 w = Math.max(240, vw - m * 2);
 h = Math.max(260, vh - m * 2);
 } else {
 w = Math.min(Math.round(vw * 0.94), 460);
 h = Math.round(vh * 0.88);
 if (h > 760) h = 760;
 if (h > vh - m * 2) h = vh - m * 2;
 if (h < 280) h = Math.max(200, vh - m * 2);
 }
 if (w > vw - m * 2) w = Math.max(200, vw - m * 2);
 var x = (typeof px === 'number' && isFinite(px)) ? Math.round(px) : Math.round((vw - w) / 2);
 var y = (typeof py === 'number' && isFinite(py)) ? Math.round(py) : Math.round((vh - h) / 2);
 if (x < m) x = m;
 if (x > vw - w - m) x = Math.max(m, vw - w - m);
 if (y < m) y = m;
 if (y > vh - h - m) y = Math.max(m, vh - h - m);
 return { x: x, y: y, w: w, h: h, vw: vw, vh: vh };
}
function helpApplyGeom(node, keep) {
 if (!node) return null;
 var wrap = node.querySelector('.ar6h-wrap');
 if (!wrap) return null;
 var g = helpGeom(!!cfg.helpBig, keep ? cfg.helpX : cfg.helpX, keep ? cfg.helpY : cfg.helpY);
 wrap.style.position = 'fixed';
 wrap.style.margin = '0';
 wrap.style.maxWidth = 'none';
 wrap.style.maxHeight = 'none';
 wrap.style.minHeight = '0';
 wrap.style.left = g.x + 'px';
 wrap.style.top = g.y + 'px';
 wrap.style.width = g.w + 'px';
 wrap.style.height = g.h + 'px';
 wrap.setAttribute('data-ar6-hg', g.x + ',' + g.y + ',' + g.w + ',' + g.h);
 return g;
}

function helpHTML(tab) {
 var k = 'how';
 for (var i = 0; i < HELP_TABS.length; i++) if (HELP_TABS[i].k === tab) k = tab;
 var h = '';

 h += '<style>' +
 '#ar6-card{--hbg:#0d1117;--hcd:#161b22;--hln:#30363d;--hfg:#e6edf3;--hdim:#8b949e;--hdim2:#6e7681;' +
 '--ha:#58a6ff;--hg:#3fb950;--hy:#d29922;--hr:#f85149}' +
 '#ar6-card,#ar6-card *{box-sizing:border-box;min-width:0}' +
 '#ar6-card .ar6h-wrap{width:402px;max-width:calc(100vw - 20px);height:86vh;max-height:720px;min-height:300px;' +
 'display:flex;flex-direction:column;background:var(--hbg);color:var(--hfg);border:1px solid var(--hln);' +
 'border-radius:16px;overflow:hidden;box-shadow:0 12px 48px rgba(0,0,0,.6)}' +
 '#ar6-card .ar6h-top{flex:0 0 auto;border-bottom:1px solid var(--hln);background:linear-gradient(180deg,#10161d,#0d1117)}' +
 '#ar6-card .ar6h-tabs{display:flex;gap:4px;padding:10px 10px 2px;overflow-x:auto;scrollbar-width:none;' +
 '-webkit-overflow-scrolling:touch;overscroll-behavior-x:contain}' +
 '#ar6-card .ar6h-tabs::-webkit-scrollbar{display:none}' +
 '#ar6-card .ar6h-tab{flex:0 0 auto;padding:6px 9px;border-radius:999px;border:1px solid var(--hln);' +
 'background:var(--hcd);color:#c9d1d9;font-size:11.5px;font-weight:600;cursor:pointer;white-space:nowrap}' +
 '#ar6-card .ar6h-tab.on{background:#1f6feb;border-color:#1f6feb;color:#fff}' +
 '#ar6-card .ar6h-find{display:flex;gap:6px;align-items:center;padding:7px 12px 9px}' +
 '#ar6-card .ar6h-in{flex:1 1 auto;padding:7px 10px;border-radius:9px;border:1px solid var(--hln);' +
 'background:#0b0f14;color:var(--hfg);font-size:12.5px;outline:none;font-family:inherit}' +
 '#ar6-card .ar6h-in:focus{border-color:#1f6feb}' +
 '#ar6-card .ar6h-body{flex:1 1 0;min-height:0;overflow-y:auto;overflow-x:hidden;' +
 'overscroll-behavior:contain;-webkit-overflow-scrolling:touch;padding:12px 14px 10px;touch-action:pan-y}' +
 '#ar6-card .ar6h-sec{margin:0 0 16px;padding-left:9px;border-left:3px solid #21262d}' +
 '#ar6-card .ar6h-h{display:flex;gap:7px;align-items:baseline;font-size:13.5px;font-weight:700;color:var(--hfg);margin-bottom:7px}' +
 '#ar6-card .ar6h-h b{color:var(--hdim2);font-size:11px;font-weight:600;font-variant-numeric:tabular-nums}' +
 '#ar6-card .ar6h-l{display:flex;gap:7px;font-size:12.8px;line-height:1.72;color:#c9d1d9;margin:2px 0}' +
 '#ar6-card .ar6h-l span{flex:1 1 auto;word-break:break-word;white-space:pre-wrap}' +
 '#ar6-card .ar6h-i{flex:0 0 6px;height:6px;margin-top:8px;border-radius:50%;background:#21262d}' +
 '#ar6-card .ar6h-l.a .ar6h-i{background:var(--ha)}' +
 '#ar6-card .ar6h-l.g .ar6h-i{background:var(--hg)}' +
 '#ar6-card .ar6h-l.y .ar6h-i{background:var(--hy)}' +
 '#ar6-card .ar6h-kv{display:grid;grid-template-columns:.9fr 1.3fr;gap:6px;background:var(--hcd);' +
 'border:1px solid var(--hln);border-radius:9px;padding:7px 9px;margin:5px 0}' +
 '#ar6-card .ar6h-k{font-size:12px;line-height:1.6;color:var(--hdim);word-break:break-word;padding-right:8px;border-right:1px solid rgba(255,255,255,.07)}' +
 '#ar6-card .ar6h-v{font-size:12px;line-height:1.6;color:var(--hfg);word-break:break-word}' +
 '#ar6-card .ar6h-q{display:flex;gap:7px;align-items:baseline;font-size:13px;font-weight:700;color:var(--ha);margin-bottom:5px}' +
 '#ar6-card .ar6h-qm{flex:0 0 auto;font-size:10px;font-weight:700;padding:1px 5px;border-radius:5px;' +
 'background:rgba(88,166,255,.15);color:var(--ha)}' +
 '#ar6-card .ar6h-none{font-size:12.5px;color:var(--hdim);padding:10px 2px}' +
 '#ar6-card .ar6h-foot{flex:0 0 auto;border-top:1px solid var(--hln);background:#0b0f14;padding:9px 14px 10px}' +
 '#ar6-card .ar6h-ver{font-size:10.5px;color:var(--hdim2);margin-bottom:8px}' +
 '#ar6-card .ar6h-btns{display:flex;gap:8px}' +
 '#ar6-card .ar6h-b1,#ar6-card .ar6h-b2{flex:1;padding:10px;border-radius:9px;font-size:13.5px;font-weight:700;cursor:pointer}' +
 '#ar6-card .ar6h-b1{border:0;background:#238636;color:#fff}' +
 '#ar6-card .ar6h-b2{border:1px solid var(--hln);background:#21262d;color:#c9d1d9;font-weight:400}' +
 '#ar6-card .ar6h-b3{border:1px solid var(--hln);background:#21262d;color:#c9d1d9;font-weight:400;' +
 'flex:0 0 auto;padding:10px 12px;border-radius:9px;font-size:13px;cursor:pointer}' +
 '#ar6-card .ar6h-grab{display:none;height:14px;margin:2px 10px 0;border-radius:7px;background:rgba(255,255,255,.07);cursor:grab;touch-action:none}' +
 '#ar6-card .ar6h-wrap[data-ar6-mob="1"] .ar6h-grab{display:block}' +
 '#ar6-card .ar6h-wrap[data-ar6-mob="1"] .ar6h-tabs{touch-action:pan-x}' +
 '#ar6-card .ar6h-hbar{display:none;height:12px;margin:6px 10px 0;border-radius:6px;' +
 'background:rgba(255,255,255,.07);position:relative;touch-action:none;cursor:pointer}' +
 '#ar6-card .ar6h-wrap[data-ar6-mob="1"] .ar6h-hbar{display:block}' +
 /* data-none 用了两条选择器：第一条 (0,1,2,0) 低于上面 display:block 的 (0,1,3,0)，单靠它手机端藏不掉；
    真正生效的是第二条 (0,1,4,0)，桌面/手机都靠这条兜底。 */
 '#ar6-card .ar6h-hbar[data-none="1"],#ar6-card .ar6h-wrap[data-ar6-mob="1"] .ar6h-hbar[data-none="1"]{display:none}' +
 '#ar6-card .ar6h-hthumb{position:absolute;top:2px;left:0;height:8px;border-radius:4px;' +
 'background:rgba(255,255,255,.36);min-width:28px}' +
 '#ar6-card .ar6h-hbar[data-drag="1"] .ar6h-hthumb{background:rgba(255,255,255,.6)}' +
 '#ar6-card .ar6h-wrap[data-ar6-drag="1"] .ar6h-grab{cursor:grabbing}' +
 '</style>';

 var mob = false;
 try { mob = (typeof uiMode === 'function' && uiMode() === 'mobile'); } catch (eMob) {}
 h += '<div id="ar6-card" style="position:fixed;inset:0;z-index:2147483600;background:rgba(1,4,9,' + (mob ? '.55' : '.93') + ');' +
 (mob ? '' : 'display:flex;align-items:center;justify-content:center;padding:12px;') +
 'font-family:system-ui,-apple-system,\'Segoe UI\',\'Segoe UI Emoji\',\'Noto Color Emoji\',sans-serif">';
 h += '<div class="ar6h-wrap" data-ar6-mob="' + (mob ? '1' : '0') + '">';

 /* 顶部：页签 + 搜索 */
 h += '<div class="ar6h-top"><div class="ar6h-grab"></div><div class="ar6h-tabs">';
 for (var i2 = 0; i2 < HELP_TABS.length; i2++) {
 var on = HELP_TABS[i2].k === k;
 h += '<button class="ar6h-tab' + (on ? ' on' : '') + '" data-ar6-card="tab" data-tab="' + HELP_TABS[i2].k + '">' +
 esc(HELP_TABS[i2].t) + '</button>';
 }
 h += '</div>';
 h += '<div class="ar6h-hbar"><div class="ar6h-hthumb"></div></div>';
 h += '<div class="ar6h-find"><input class="ar6h-in" id="ar6h-find" placeholder="在本页里搜……（标题和正文都算）" ' +
 'autocomplete="off" spellcheck="false"></div></div>';

 /* 正文 */
 h += '<div class="ar6h-body" id="ar6h-body">' + helpPageHTML(k) + '</div>';

 /* 底部 */
 h += '<div class="ar6h-foot"><div class="ar6h-ver">卢克之光 V' + esc(VERSION) + ' · 说明页 · 离线可用</div>' +
 '<div class="ar6h-btns">' +
 (mob ? '<button class="ar6h-b3" data-ar6-card="big">' + (cfg.helpBig ? '还原' : '铺满') + '</button>' : '') +
 '<button class="ar6h-b1" data-ar6-card="copy">复制这段</button>' +
 '<button class="ar6h-b2" data-ar6-card="close">关闭</button>' +
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

/* 拖动把手是页签条上方的抓条；页签条本身负责横向滚动 */
function helpBindDrag(node) {
 var wrap = node.querySelector('.ar6h-wrap');
 var bar = node.querySelector('.ar6h-grab');
 if (!wrap || !bar) return;
 var on = false, dx = 0, dy = 0;
 bar.addEventListener('pointerdown', function (e) {
 var t = e && e.target;
 if (t && t.getAttribute && t.getAttribute('data-ar6-card')) return;
 var r = wrap.getBoundingClientRect();
 on = true;
 dx = e.clientX - r.left;
 dy = e.clientY - r.top;
 wrap.setAttribute('data-ar6-drag', '1');
 try { if (bar.setPointerCapture) bar.setPointerCapture(e.pointerId); } catch (eC) {}
 try { if (e.preventDefault) e.preventDefault(); } catch (eP) {}
 });
 bar.addEventListener('pointermove', function (e) {
 if (!on) return;
 var g = helpGeom(!!cfg.helpBig, e.clientX - dx, e.clientY - dy);
 wrap.style.left = g.x + 'px';
 wrap.style.top = g.y + 'px';
 wrap.setAttribute('data-ar6-hg', g.x + ',' + g.y + ',' + g.w + ',' + g.h);
 cfg.helpX = g.x;
 cfg.helpY = g.y;
 try { if (e.preventDefault) e.preventDefault(); } catch (eP2) {}
 });
 function fin() {
 if (!on) return;
 on = false;
 wrap.removeAttribute('data-ar6-drag');
 try { saveCfg(); } catch (e) {}
 }
 bar.addEventListener('pointerup', fin);
 bar.addEventListener('pointercancel', fin);
}

/* 页签超出宽度时，给一条始终可见的横向滑块（轨道 + 可拖滑块）：
 页签再多也一定滑得到底，不用靠猜「还能往右滑」。纵向滚动与拖窗把手完全不受影响。 */
/* resize 全局只挂一个监听：每次绑定改指向当前节点，节点脱离文档后主动摘掉，反复开面板/切页签不累积 */
var HBAR_NODE = null, HBAR_LISTEN = false;
function hbarResize() {
 var n = HBAR_NODE;
 if (!n || n.isConnected === false) {
  HBAR_NODE = null;
  if (HBAR_LISTEN) { HBAR_LISTEN = false; try { HOST.removeEventListener('resize', hbarResize); } catch (eR) {} }
  return;
 }
 try { if (n.__ar6HBarSync) n.__ar6HBarSync(); } catch (eS) {}
}
function hbarArm(n) {
 HBAR_NODE = n;
 if (HBAR_LISTEN) return;
 HBAR_LISTEN = true;
 try { HOST.addEventListener('resize', hbarResize); } catch (eA) { HBAR_LISTEN = false; }
}
function helpBindHBar(node) {
 var wrap = node && node.querySelector('.ar6h-wrap');
 var tabs = node && node.querySelector('.ar6h-tabs');
 var bar = node && node.querySelector('.ar6h-hbar');
 var th = node && node.querySelector('.ar6h-hthumb');
 if (!wrap || !tabs || !bar || !th) return;
 /* 同一节点被重复绑定（切页签/重开）时只重算一次，监听不重复挂 */
 if (node.__ar6HBarBound) {
  try { if (node.__ar6HBarSync) node.__ar6HBarSync(); } catch (e0) {}
  hbarArm(node);
  return;
 }
 node.__ar6HBarBound = 1;

 function clamp01(v) { return v < 0 ? 0 : (v > 1 ? 1 : v); }
 function over() { return tabs.scrollWidth - tabs.clientWidth; }

 /* 把滑块尺寸/位置对到页签条当前状态；页签放得下、或滑块已几乎满格没有行程时，整条藏掉 */
 function sync() {
  try {
   if (!bar.parentNode || !tabs.parentNode) return;
   var ov = over();
   if (ov <= 1) { bar.setAttribute('data-none', '1'); return; }
   var tw = bar.clientWidth;
   var sw = tabs.clientWidth;
   var cw = tabs.scrollWidth;
   if (!(tw > 0) || !(sw > 0) || !(cw > 0)) return;
   var w = Math.max(28, tw * sw / cw);
   if (w > tw) w = tw;
   var travel = tw - w;
   /* 轨道与滑块几乎等宽时只剩 1~3px 可拖，换算会 1px 跳满程，不如直接不显示 */
   if (travel < 4) { bar.setAttribute('data-none', '1'); return; }
   bar.removeAttribute('data-none');
   th.style.width = w + 'px';
   th.style.left = (travel * (tabs.scrollLeft / ov)) + 'px';
  } catch (eS) {}
 }

 /* 拖滑块：位移换算成页签条的 scrollLeft */
 var on = false, sx = 0, start = 0, ov0 = 0, tw0 = 0, ww0 = 0;
 th.addEventListener('pointerdown', function (e) {
  try {
   tw0 = bar.clientWidth;
   ww0 = th.offsetWidth || 28;
   if (tw0 - ww0 < 4) return; /* 行程不足 4px 时不接拖动，避免一碰就跳满 */
   on = true;
   sx = e.clientX;
   start = tabs.scrollLeft;
   ov0 = over();
   bar.setAttribute('data-drag', '1');
   if (th.setPointerCapture) th.setPointerCapture(e.pointerId);
   if (e.preventDefault) e.preventDefault();
  } catch (eD) {}
 });
 th.addEventListener('pointermove', function (e) {
  if (!on) return;
  try {
   tabs.scrollLeft = start + (e.clientX - sx) * ov0 / Math.max(4, tw0 - ww0);
   if (e.preventDefault) e.preventDefault();
  } catch (eM) {}
 });
 function fin() {
  if (!on) return;
  on = false;
  try { bar.removeAttribute('data-drag'); } catch (eF) {}
 }
 th.addEventListener('pointerup', fin);
 th.addEventListener('pointercancel', fin);

 /* 点轨道空白：把滑块中心挪到手指处 */
 bar.addEventListener('pointerdown', function (e) {
  if (!e || e.target === th) return;
  try {
   var ov = over();
   if (ov <= 1) return;
   var tw = bar.clientWidth;
   var ww = th.offsetWidth || 28;
   if (tw - ww < 4) return;
   var r = bar.getBoundingClientRect();
   var ratio = clamp01((e.clientX - r.left - ww / 2) / Math.max(4, tw - ww));
   var left = ratio * ov;
   if (tabs.scrollTo) tabs.scrollTo({ left: left, behavior: 'smooth' });
   else tabs.scrollLeft = left;
   if (e.preventDefault) e.preventDefault();
  } catch (eB) {}
 });

 tabs.addEventListener('scroll', sync, { passive: true });

 /* 切页签后重算；resize 走全局单监听（hbarResize），不在这里逐个节点挂 */
 tabs.addEventListener('click', function () { try { setTimeout(sync, 0); } catch (eC) {} });
 node.__ar6HBarSync = sync;
 hbarArm(node);

 sync();
 try { setTimeout(sync, 0); } catch (eT) {}
}

function openHelp(tab) {
 try {
 var k = tab || 'how';
 var mob = false;
 try { mob = (typeof uiMode === 'function' && uiMode() === 'mobile'); } catch (eM2) {}
 closeCard();
 var node = mountHTML(helpHTML(k));
 if (!node) throw new Error('mount failed');
 CARD.open = true;
 CARD.rid = -1;
 CARD.help = k;
 if (mob) {
 try { helpApplyGeom(node); } catch (eG) {}
 try { helpBindDrag(node); } catch (eD) {}
 }
 try { helpBindHBar(node); } catch (eH) {}
 node.addEventListener('input', function () { helpFilter(node); });
 node.addEventListener('click', function (ev) {
 var t = ev.target;
 var act = t && t.getAttribute && (t.getAttribute('data-ar6-card') || '');
 if (act === 'tab') { openHelp(t.getAttribute('data-tab')); return; }
 if (act === 'copy') { helpCopy(k); return; }
 if (act === 'big') {
 cfg.helpBig = !cfg.helpBig;
 cfg.helpX = null;
 cfg.helpY = null;
 try { saveCfg(); } catch (eB) {}
 openHelp(CARD.help || k);
 return;
 }
 if (act === 'close' || t === node) closeCard();
 return;
 });
 } catch (e) {
 try { banner('说明页渲染失败：' + String(e && e.message || e), 'bad'); } catch (e2) {}
 }
}
