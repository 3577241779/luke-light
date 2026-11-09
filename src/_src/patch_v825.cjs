/* patch_v825.cjs — v8.25：日志恢复可横向滑动的表格；破甲续写强制弹窗确认 + 每轮最多 1 次 */
const fs = require('fs');
const path = require('path');
const S = (f) => path.join(__dirname, f);
let n = 0;
function rep(file, anchor, next) {
  const p = S(file); let s = fs.readFileSync(p, 'utf8');
  const c = s.split(anchor).length - 1;
  if (c !== 1) throw new Error('count=' + c + ' :: ' + file + ' :: ' + anchor.slice(0, 50));
  fs.writeFileSync(p, s.replace(anchor, next)); n++; console.log('  ok ' + file);
}

/* 版本：8.25 */
rep('1_core.js', "var VERSION = '8.5.0';", "var VERSION = '8.25.0';");
rep('1_core.js', '  v: 850,', '  v: 825,');
rep('1_core.js', 's.v !== 850', 's.v !== 825');
/* 迁移：强制把「续写确认」打开（老配置里 false 的一律改回 true） */
rep('1_core.js', `  if (s.v !== 825) {`,
`  if (s.v !== 825) {
    d.jailConfirm = true;`);

/* 日志：恢复 8 列表格，外层横向滚动，最小宽度保证不压字 */
rep('4_ui.js', `function renderTable(log) {
  if (!log || !log.length) return '<div class="ar6-empty">还没有记录。发一轮对话后，这里会出现一行：请求 → 上游 · 判定 · 首字 · 字数。</div>';`,
`function renderTable(log) {
  if (!log || !log.length) return '<div class="ar6-empty">还没有记录。发一轮对话后，发一轮对话后这里会出现一行；左右滑动可看全所有列。</div>';`);

rep('4_ui.js', `  return '<div class="ar6-log">' + rows + '</div>';
}
function srcName(s) {
  s = String(s || '');
  if (s.indexOf('body') >= 0) return '响应体';
  if (s.indexOf('msg') >= 0) return '消息';
  return '未验';
}`,
`  return '<div class="ar6-tw"><table class="ar6-t"><thead><tr>' +
    '<th class="c1">时间</th><th class="c2">请求模型</th><th class="c3">上游 · 来源</th><th class="c4">判定</th>' +
    '<th class="c5">首字</th><th class="c6">字数</th><th class="c7">思考</th><th class="c8">改动</th>' +
    '</tr></thead><tbody>' + trs + '</tbody></table></div>';
}`);

/* 把 rows 的构造改成 <tr>（复用原来的单元格，但加上 class） */
rep('4_ui.js', `  var rows = log.slice(0, 14).map(function (r) {`,
`  var trs = log.slice(0, 14).map(function (r) {`);
rep('4_ui.js', `    return '<div class="ar6-lr">' +
      '<div class="ar6-l1"><b class="ar6-lt">' + hhmm(r.at) + '</b>' +
        '<span class="ar6-tag ' + kc + '">' + esc(r.verdict || '') + '</span>' +
        '<span class="ar6-lm"><em>' + req + '</em>' + (same ? '' : '<i class="ar6-arrow">→</i><em class="up">' + obs + '</em>') + src + '</span>' +
      '</div>' +
      '<div class="ar6-l2">' +
        '<span>首字 <b>' + tr + '</b></span>' +
        '<span>字数 <b>' + esc(String(Math.round(Number(r.chars) || 0))) + '</b></span>' +
        '<span>思考 <b>' + (r.think ? '有' : '—') + '</b></span>' +
        '<span>改动 <b>' + (Number(r.edits) ? '+' + esc(String(Math.round(Number(r.edits)))) : '—') + '</b></span>' +
      '</div>' +
    '</div>';`,
`    return '<tr>' +
      '<td class="c1">' + hhmm(r.at) + '</td>' +
      '<td class="c2 ar6-mono">' + req + '</td>' +
      '<td class="c3 ar6-mono">' + (same ? obs : obs) + src + '</td>' +
      '<td class="c4"><span class="ar6-tag ' + kc + '">' + esc(r.verdict || '') + '</span></td>' +
      '<td class="c5">' + tr + '</td>' +
      '<td class="c6">' + esc(String(Math.round(Number(r.chars) || 0))) + '</td>' +
      '<td class="c7">' + (r.think ? '✓' : '—') + '</td>' +
      '<td class="c8">' + (Number(r.edits) ? '+' + esc(String(Math.round(Number(r.edits)))) : '—') + '</td>' +
    '</tr>';`);

/* 表格 CSS：横向滚动 + 列宽 + 首列吸附 */
rep('4_ui.js', "  '.ar6-log{display:flex;flex-direction:column;gap:6px}',",
`  '.ar6-tw{overflow-x:auto;overflow-y:visible;-webkit-overflow-scrolling:touch;margin:0 -2px;padding:0 2px}',
  '.ar6-tw::-webkit-scrollbar{height:6px}',
  '.ar6-tw::-webkit-scrollbar-thumb{background:rgba(255,255,255,.16);border-radius:3px}',
  '.ar6-t{min-width:560px;width:100%;border-collapse:separate;border-spacing:0;font-size:11.5px;table-layout:fixed}',
  '.ar6-t th{position:sticky;top:0;z-index:2;text-align:left;font-weight:500;color:#8b949e;background:#12161d;',
  'padding:5px 7px;border-bottom:1px solid var(--ar-ln);white-space:nowrap}',
  '.ar6-t td{padding:6px 7px;border-bottom:1px solid rgba(255,255,255,.05);color:#c9d1d9;',
  'white-space:nowrap;overflow:hidden;text-overflow:ellipsis}',
  '.ar6-t tbody tr:hover td{background:rgba(88,166,255,.06)}',
  '.ar6-t .c1{width:52px;color:#8b949e;font-family:ui-monospace,Menlo,monospace}',
  '.ar6-t .c2{width:132px}', '.ar6-t .c3{width:170px}', '.ar6-t .c4{width:72px}',
  '.ar6-t .c5{width:52px}', '.ar6-t .c6{width:56px}', '.ar6-t .c7{width:44px}', '.ar6-t .c8{width:48px}',
  '.ar6-log{display:none}',`);

/* 破甲：每轮最多 1 次；且默认必须弹窗 */
rep('7_jail.js', "  var max = Number(cfg.jailMax || 2);", "  var max = 1; /* v8.25：一轮最多补 1 次，第二次必须用户自己点 */");
rep('7_jail.js', `  if (cfg.jailConfirm === false) {
    jailSchedule(j, JL.count + 1, max);
    return;
  }
  jailOffer(j);`,
`  if (cfg.jailConfirm === false && JL.count < 1) {
    jailSchedule(j, JL.count + 1, max);
    return;
  }
  jailOffer(j);`);

const bp = S('../build_v8.mjs');
let bs = fs.readFileSync(bp, 'utf8');
fs.writeFileSync(bp, bs.split('8.5.0').join('8.25.0'));
console.log('\n共 ' + n + ' 处');
