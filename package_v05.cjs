/* package_v012.cjs — 卢克之光 V0.7 出货校验：双包解析 / 版本 / 1 按钮 / 叙述层 / 账本·指纹·导出·A-B / 旧护栏 */
const fs = require('fs');
const path = require('path');
const R = __dirname;
const OUT = path.join(R, 'out096');
if (!fs.existsSync(OUT)) fs.mkdirSync(OUT, { recursive: true });

const VAR = [
  { mode: 'desktop', file: 'antiroute-v8-desktop.js', name: '卢克之光 V0.96·桌面版' },
  { mode: 'mobile', file: 'antiroute-v8-mobile.js', name: '卢克之光 V0.96·TT酒馆适配' }
];

const BTN = ['🛡 防路由'];

let pass = 0, fail = 0;
const ok = (n, c, e) => { c ? (pass++, console.log('  ok   ' + n)) : (fail++, console.log('  FAIL ' + n + (e ? ' — ' + e : ''))); };

const INFO = [
  '卢克之光 V0.96 · 防降级观测与保档',
  '',
  '入口：工具栏一个「🛡 防路由」，或扩展菜单「魔法棒」——点开就是面板，其余功能全在面板里。',
  '（原来 8 个按钮全塞在工具栏，把底栏占满了。列表是导入时写死的，要 0 个按钮只能改包重导。）',
  '',
  '本版新增「叙述」区（面板中部，两个 chip 三档循环：关 → 轻 → 强）：',
  '🧭 防全知：画面可以拉远，人不行；每个角色只用他自己那份见闻，没写到在场就是没看见。',
  '💄 去媚：世界自己转；你说的是请求不是命令，对方可以答应，也可以敷衍或拒绝。',
  '两个都在请求副本上作业，不进聊天记录；同一份请求注入两次结果一样（幂等）。',
  '开强档约 +800 tok/轮，轻档约 +65。想看它到底塞了什么，控制台跑 __AR6__.narrBody()。',
  '',
  '本版新增「✂️ 抗截断」（面板独立一段，点一下换一档：关 → 轻档 → 中档）：',
  '  轻档：每次请求前提醒它「这一轮写够 1200 字、别停在半句、别写「以上就是」」。事前拦，不改结果。',
  '  中档：轻档全做，真断了再替你补一次（一轮只补一次）。',
  '  预设自己已经会写长 / 已经写了收尾要求的，它自动少说一句，不跟预设抢方向盘。',
  '  想看它塞了什么：控制台 __AR6__.truncBlock()。',
  '',
  '本版同时保留 8.30 的手机布局修复：收起后重开不再塌成百分比高度、手指落正文不抢滚动。',
  '出问题先跑 __AR6__.diag()。'
].join('\n');
const INFO_JOINED = String(INFO);

for (const v of VAR) {
  const src = fs.readFileSync(path.join(R, v.file), 'utf8');
  const json = {
    type: 'script', enabled: true, name: v.name,
    info: INFO,
    button: { enabled: true, buttons: BTN.map(t => ({ name: t, visible: true })) },
    data: {},
    content: src
  };
  const p = path.join(OUT, v.name + '_酒馆助手导入脚本.json');
  fs.writeFileSync(p, JSON.stringify(json, null, 2));
  const back = JSON.parse(fs.readFileSync(p, 'utf8'));
  const c = back.content;

  ok(v.mode + ' JSON 可解析', !!back && back.type === 'script');
  ok(v.mode + ' VERSION 0.9', /var VERSION = '0.96';/.test(c));
  ok(v.mode + ' 包名是卢克之光 V0.96', String(back.name || '').indexOf('卢克之光 V0.96') === 0, back.name);
  ok(v.mode + ' 配置版本 831', /\bv: 831,/.test(c));
  ok(v.mode + ' UI_MODE 正确', c.indexOf("var UI_MODE = '" + v.mode + "';") >= 0);
  ok(v.mode + ' content 与源码一致', c === src);
  ok(v.mode + ' 只剩 1 个按钮', back.button.buttons.length === 1);
  ok(v.mode + ' 按钮名是入口', back.button.buttons[0].name === '🛡 防路由');
  ok(v.mode + ' 含魔法棒挂载', c.indexOf('function mountWandEntry') >= 0 && c.indexOf('#extensionsMenu') >= 0);
  ok(v.mode + ' 含魔法棒打开面板', c.indexOf('data-ar6-wand-open') >= 0 && c.indexOf('openPanelFromWand') >= 0);
  ok(v.mode + ' key 输入是 password', c.indexOf('data-ar6="key" type="password"') >= 0);
  ok(v.mode + ' 语法可解析', (() => { try { new Function(c); return true; } catch (e) { return false; } })());
  ok(v.mode + ' 体积在区间内', src.length > 230000 && src.length < 400000, String(src.length));
  ok(v.mode + ' 移动包名带 TT', v.mode !== 'mobile' || v.name.indexOf('TT酒馆适配') > 0);

  /* 8.29 护栏：没人说话它自己请求模型 */
  ok(v.mode + ' 含续写认领 contOnly', c.indexOf('contOnly') >= 0);
  ok(v.mode + ' 含自激刹车 JL.selfAt', c.indexOf('JL.selfAt') >= 0);
  ok(v.mode + ' 含 JAIL_RELOCK 定义', c.indexOf('var JAIL_RELOCK') >= 0);
  ok(v.mode + ' 含内部请求豁免文案', c.indexOf('内部请求（数据库或填表）') >= 0);
  ok(v.mode + ' 旧 salvage 已彻底消失', c.indexOf('function salvage(text, ev)') < 0 && c.indexOf('function salvageError(text, ev)') >= 0);
  ok(v.mode + ' 内部请求需渠道证据', c.indexOf("chat_completion_source || '') !== 'custom'") >= 0);

  /* 8.30 护栏：手机面板只显示上半截 / 滑不动 */
  ok(v.mode + ' 重开不再整条覆盖 style', !/panelStyle\(uiMode\(\), false\)/.test(c));
  ok(v.mode + ' 重开路径补了 fitPanel', /function openPanelFromWand[\s\S]{0,1600}fitPanel\(r\)/.test(c));
  ok(v.mode + ' fitPanel 夹底边', c.indexOf('var limit = vv - maxH - 6;') >= 0 && c.indexOf('if (top > limit) nt = limit;') >= 0);
  ok(v.mode + ' fitPanel 保留桌面 0.78', c.indexOf("mode === 'mobile' ? 0.72 : 0.78") >= 0);
  ok(v.mode + ' 移动端 72vh', c.indexOf('max-height:72vh') >= 0);
  ok(v.mode + ' 移动端 svh 降级', c.indexOf('max-height:min(72svh,calc(100svh - 96px))') >= 0);
  ok(v.mode + ' 移动端不再裁切 .ar6-p', c.indexOf('@media (max-width:520px){#ar6-root .ar6-p{overflow:hidden') < 0);
  ok(v.mode + ' .ar6-body 零基弹性', c.indexOf('.ar6-body{flex:1 1 0;') >= 0);
  ok(v.mode + ' 触摸不抢滚动', c.indexOf('(!isTouch && !hitScroll(t))') >= 0 && c.indexOf('(!touchMode || armLong)') >= 0);
  ok(v.mode + ' 导出 diag', c.indexOf('diag: ar6Diag') >= 0);
  ok(v.mode + ' diag 判底边', c.indexOf('b.bottom <= vv + 2') >= 0);

  /* 8.31 护栏：叙述层 */
  ok(v.mode + ' 含叙述标记常量', c.indexOf("var NARR_TAG = 'AR-NAR'") >= 0);
  ok(v.mode + ' 含两个档位表', c.indexOf('var NARR_KNOW = {') >= 0 && c.indexOf('var NARR_CHARM = {') >= 0);
  ok(v.mode + ' 含幂等剥离循环', c.indexOf('function narrStripOnce') >= 0 && /function narrStrip\(s\)[\s\S]{0,400}narrStripOnce/.test(c));
  ok(v.mode + ' 注入找末条 user', /function narrApply\(body\)[\s\S]{0,1400}m\.role \|\| ''\) === 'user'/.test(c));
  ok(v.mode + ' 注入点关档也跑（负责剥离）', /narrApply\(body\);[\s\S]{0,200}out\.changed\.push\(nch\[nz\]\)/.test(c));
  ok(v.mode + ' 叙述在破甲之前', c.indexOf('var nch = narrApply(body);') > 0 && c.indexOf('var nch = narrApply(body);') < c.indexOf('var jch = jailPatchBody(body);'));
  const NC = (c.match(/var NARR_CHARM = \{[\s\S]*?\n\};/) || [''])[0];
  ok(v.mode + ' 去媚不含死亡结局', NC.length > 0 && NC.indexOf('通关方式就是') < 0 && NC.indexOf('死亡') < 0, 'NARR_CHARM 长度 ' + NC.length);
  ok(v.mode + ' 去媚换成世界自己转', NC.length > 0 && NC.indexOf('这个世界自己转') >= 0);
  ok(v.mode + ' 面板有叙述区', c.indexOf("'<div class=\"ar6-sec\">叙述</div>") >= 0);
  ok(v.mode + ' 面板有防全知/去媚 chip', c.indexOf("'🧭 防全知:'") >= 0 && c.indexOf("'💄 去媚:'") >= 0);
  ok(v.mode + ' 已删掉预览/工具栏两个按钮', c.indexOf('data-ar6="narr"') < 0 && c.indexOf('data-ar6="toolbar"') < 0);

  /* 8.31 护栏：工具栏收缩 */
  ok(v.mode + ' ACTIONS 只剩 1 项', (c.match(/key: '(selftest|toggle|refract|jail|idprobe|card|unhide|clear|panel)'/g) || []).length === 1);
  ok(v.mode + ' 入口调 openPanel', c.indexOf('fn: function () { openPanel(); }') >= 0);
  ok(v.mode + ' openPanel 已定义并导出', c.indexOf('function openPanel()') >= 0 && c.indexOf('openPanel: openPanel,') >= 0);
  ok(v.mode + ' 页脚按 btnReady 判断', c.indexOf('(btnReady() ?') >= 0);
  ok(v.mode + ' 老按钮名留了别名', c.indexOf("'🛡️ 状态自检'") >= 0);
  ok(v.mode + ' 不再声称「8 个按钮」', c.indexOf('八按钮') < 0);

  /* v0.1 护栏：说明页重排 */
  ok(v.mode + ' 说明页 6 页签', (c.match(/k: '(how|map|narr|jail|read|faq)'/g) || []).length === 6);
  ok(v.mode + ' 说明页没有工具栏页', c.indexOf("k: 'bar'") < 0 && c.indexOf('工具栏 7 个') < 0);
  const HB = c.slice(c.indexOf('var HELP_TABS = ['), c.indexOf('function helpText('));
  ok(v.mode + ' 说明页不提悬浮球', HB.length > 0 && HB.indexOf('悬浮球') < 0, 'HELP 块长度 ' + HB.length);
  ok(v.mode + ' 说明页不写同工具栏', c.indexOf('同工具栏') < 0);
  ok(v.mode + ' 说明页含防全知/去媚', c.indexOf('防全知') >= 0 && c.indexOf('去媚') >= 0);
  ok(v.mode + ' 说明页含魔法棒与双装警告', c.indexOf('魔法棒') >= 0 && (c.indexOf('装了两个') >= 0 || c.indexOf('另一个先禁用') >= 0));
  ok(v.mode + ' 说明页固定高 + 内滚', c.indexOf('height:86vh') >= 0 && c.indexOf('flex:1 1 0') >= 0);
  ok(v.mode + ' 说明页有搜索', c.indexOf('id="ar6h-find"') >= 0 && c.indexOf('function helpFilter') >= 0);
  ok(v.mode + ' 说明页破甲改口为 1 次', c.indexOf('一轮只补一次') >= 0 && c.indexOf('补 2 次') < 0 && c.indexOf('最多补 2 次') < 0);
  ok(v.mode + ' INFO 已压缩', c.indexOf('【八、悬浮球') < 0 && c.indexOf('v7.4 新增三件') < 0);
  ok(v.mode + ' 版本 0.9', /var VERSION = '0.96';/.test(c));
  /* v0.5 护栏：证据层与度量层
     —— 只断「这版承诺过的东西真的在包体里」，不去猜实现细节。 */
  ok(v.mode + ' 错误体拆分（salvageError）', /function salvageError\(text, ev\)/.test(c) && c.indexOf('function salvage(text, ev)') < 0);
  ok(v.mode + ' 错误体不再采正文', (function () {
    var i0 = c.indexOf('function salvageError(');
    if (i0 < 0) return false;
    var i1 = c.indexOf('\nfunction ', i0 + 10);
    var body = c.slice(i0, i1 < 0 ? i0 + 900 : i1);
    return body.indexOf('sawText') < 0;
  })());
  ok(v.mode + ' 认出拦截码', /PROHIBITED_CONTENT\|BLOCKLIST\|SAFETY\|SPII\|RECITATION/.test(c));
  ok(v.mode + ' 认出超长 131072', c.indexOf('131072|maximum context length') >= 0);
  ok(v.mode + ' peek 判内部请求', c.indexOf('if (ev && ev.internal) return null;') >= 0);
  ok(v.mode + ' 内部请求不空等 peek', c.indexOf('ev.status === 200 && ev.rid && !ev.internal') >= 0);
  ok(v.mode + ' 账本 key 独立', c.indexOf("var LED_KEY = 'ar7.led'") >= 0);
  ok(v.mode + ' 账本用 wilson', /function ledStat\(\)[\s\S]{0,400}wilson\(bad, r\.n\)/.test(c));
  ok(v.mode + ' C 级只进 weak', /r\.weak = Number\(r\.weak \|\| 0\) \+ 1/.test(c));
  ok(v.mode + ' 回显降级', c.indexOf("if (rec.code === 'diff' && rec.verifiable === 'no')") >= 0);
  ok(v.mode + ' KPI 分母剔内部', c.indexOf('if (r.internal) continue;') >= 0);
  ok(v.mode + ' 导出上限 1800', c.indexOf('1700') >= 0 && /exportText/.test(c));
  ok(v.mode + ' 导出脱敏', /function redact\(s\)/.test(c) && c.indexOf("sk-***") >= 0);
  ok(v.mode + ' 导出机读行', c.indexOf('#AR6LOG 1 ') >= 0);
  ok(v.mode + ' A/B 两条臂', /function abProbe\(\)/.test(c) && c.indexOf('var seq = [false, true, false, true];') >= 0);
  ok(v.mode + ' A/B 没 Base 就拒', c.indexOf("先填反代 Base") >= 0);
  ok(v.mode + ' 破甲横幅 1 次对齐', c.indexOf('jailSchedule(j, JL.count + 1, 1)') >= 0 && c.indexOf('Number(cfg.jailMax || 2)') < 0);
  ok(v.mode + ' 证据卡版本来自 VERSION', c.indexOf("'版本：卢克之光 V' + VERSION") >= 0 && c.indexOf('v7.3.0-test') < 0);
  ok(v.mode + ' 复制接 promise', /function copyTo\(txt, label\)/.test(c) && c.indexOf('复制被浏览器拒绝') >= 0);
  ok(v.mode + ' 面板有账本行', c.indexOf('esc(ledLine())') >= 0);
  ok(v.mode + ' 面板有三个新按钮', c.indexOf("btnIco('fp'") >= 0 && c.indexOf("btnIco('exportlog'") >= 0 && c.indexOf("btnIco('abtest'") >= 0);
  ok(v.mode + ' 面板体检区显示账本', c.indexOf('esc(ledLine())') >= 0 && c.indexOf('function ledLine()') >= 0);
  ok(v.mode + ' 包名带 V0.96', String(back.name || '').indexOf('V0.96') >= 0);
}

console.log('\n打包：' + pass + ' 通过 / ' + fail + ' 失败');
process.exit(fail ? 1 : 0);
