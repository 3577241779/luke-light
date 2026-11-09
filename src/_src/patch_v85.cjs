/* patch_v85.cjs — v8.5.0：日志行改为两行式（不再挤压错位）；魔法棒行与 ST 菜单项同款；面板视觉升级 */
const fs = require('fs');
const path = require('path');
const S = (f) => path.join(__dirname, f);
let n = 0;
function rep(file, anchor, next) {
  let s = fs.readFileSync(S(file), 'utf8');
  const c = s.split(anchor).length - 1;
  if (c !== 1) throw new Error('count=' + c + ' in ' + file + ' :: ' + anchor.slice(0, 60));
  fs.writeFileSync(S(file), s.replace(anchor, next));
  n++; console.log('  ok ' + file + ' #' + n);
}

rep('1_core.js', "var VERSION = '8.4.0';", "var VERSION = '8.5.0';");
rep('1_core.js', '  v: 840,', '  v: 850,');
rep('1_core.js', 's.v !== 840', 's.v !== 850');

/* ---------- 1. 日志：两行式，绝不互相压字 ---------- */
const oldTable = fs.readFileSync(S('4_ui.js'), 'utf8');
const startMark = 'function renderTable(log) {';
const endMark = 'function renderSelfTest(res) {';
const i0 = oldTable.indexOf(startMark), i1 = oldTable.indexOf(endMark);
if (i0 < 0 || i1 < 0) throw new Error('renderTable 定位失败');
const newTable = `function renderTable(log) {
  if (!log || !log.length) return '<div class="ar6-empty">还没有记录。发一轮对话后，这里会出现一行：请求 → 上游 · 判定 · 首字 · 字数。</div>';
  var rows = log.slice(0, 14).map(function (r) {
    var kc = r.code === 'same' ? 'ok' : (r.code === 'diff' || r.code === 'empty' || r.code === 'blocked' || r.code === 'gate' || r.code === 'error' ? 'bad' : (r.code === 'thin' || r.code === 'quota' ? 'warn' : 'gray'));
    var tr = (r.ttft ? (r.ttft / 1000).toFixed(1) + 's' : '—');
    var req = esc(r.req || '—');
    var obs = esc(r.obs || '—');
    var src = r.src ? '<i class="ar6-src">' + esc(srcName(r.src)) + '</i>' : '';
    var same = req === obs;
    return '<div class="ar6-lr">' +
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
    '</div>';
  }).join('');
  return '<div class="ar6-log">' + rows + '</div>';
}
function srcName(s) {
  s = String(s || '');
  if (s.indexOf('body') >= 0) return '响应体';
  if (s.indexOf('msg') >= 0) return '消息';
  return '未验';
}

`;
fs.writeFileSync(S('4_ui.js'), oldTable.slice(0, i0) + newTable + oldTable.slice(i1));
n++; console.log('  ok 4_ui.js 日志两行式 #' + n);

/* ---------- 2. 日志与面板的 CSS ---------- */
rep('4_ui.js', "  '.ar6-tbl{padding:0 10px 10px;overflow:visible;}',",
`  '.ar6-tbl{padding:0 10px 10px;overflow:visible;}',
  '.ar6-log{display:flex;flex-direction:column;gap:6px}',
  '.ar6-lr{border:1px solid var(--ar-ln);border-radius:9px;padding:7px 9px;background:rgba(255,255,255,.022)}',
  '.ar6-lr:hover{background:rgba(88,166,255,.06);border-color:rgba(88,166,255,.30)}',
  '.ar6-l1{display:flex;align-items:center;gap:6px;min-width:0;flex-wrap:nowrap}',
  '.ar6-lt{font:600 11px/1 ui-monospace,SFMono-Regular,Menlo,monospace;color:var(--ar-mut);flex:0 0 auto}',
  '.ar6-lm{flex:1 1 auto;min-width:0;display:flex;align-items:center;gap:4px;overflow:hidden;white-space:nowrap;text-overflow:ellipsis;font-size:11.5px;color:#8b949e}',
  '.ar6-lm em{font-style:normal;overflow:hidden;text-overflow:ellipsis;max-width:46%}',
  '.ar6-lm em.up{color:#f0b429}',
  '.ar6-arrow{font-style:normal;color:#484f58;flex:0 0 auto}',
  '.ar6-src{flex:0 0 auto;margin-left:4px;padding:0 5px;border:1px solid var(--ar-ln);border-radius:999px;font:400 9.5px/1.6 ui-monospace;color:#6e7681}',
  '.ar6-l2{display:flex;gap:12px;margin-top:5px;font-size:10.5px;color:#6e7681;flex-wrap:wrap}',
  '.ar6-l2 b{color:#c9d1d9;font-weight:600;font-family:ui-monospace,Menlo,monospace}',`);

/* 面板头部：流光下划 + 竖条高光 */
rep('4_ui.js', "  '.ar6-h{display:flex;align-items:center;gap:8px;padding:11px 14px;background:linear-gradient(180deg,rgba(255,255,255,.055),rgba(255,255,255,0));border-bottom:1px solid var(--ar-line);}',",
"  '.ar6-h{position:relative;display:flex;align-items:center;gap:8px;padding:11px 14px;background:linear-gradient(96deg,rgba(88,166,255,.15),rgba(88,166,255,.02) 52%,transparent 78%);border-bottom:1px solid var(--ar-line);}',
  '.ar6-h::after{content:"";position:absolute;left:8px;right:8px;bottom:-1px;height:1px;background:linear-gradient(90deg,transparent,#58a6ff66,#58a6ff00);animation:ar6flow 6.5s linear infinite}',
  '@keyframes ar6flow{0%{opacity:.25;transform:translateX(-24%)}50%{opacity:.9}100%{opacity:.25;transform:translateX(24%)}}',");

/* ---------- 3. 魔法棒：与 ST 菜单项同高同字 ---------- */
rep('11_wand.js',
`  'padding:8px 10px;border:1px solid rgba(255,255,255,.10);border-radius:9px;cursor:pointer;',
  'background:#161b22;color:#e6edf3;font:600 13px/1.2 -apple-system,BlinkMacSystemFont,"Segoe UI","Microsoft YaHei",sans-serif;',`,
`  'padding:0 10px;height:32px;border:0;border-radius:7px;cursor:pointer;',
  'background:transparent;color:inherit;font:400 13.5px/1.2 -apple-system,BlinkMacSystemFont,"Segoe UI","Microsoft YaHei",sans-serif;',`);
rep('11_wand.js', "  '#ar6-wand .ar6-wb:hover{background:#1c2230;border-color:rgba(88,166,255,.45)}',", "  '#ar6-wand .ar6-wb:hover{background:rgba(255,255,255,.07)}',");
rep('11_wand.js', "  '#ar6-wand .ar6-wb:active{background:#222a38}',", "  '#ar6-wand .ar6-wb:active{background:rgba(255,255,255,.11)}',");
rep('11_wand.js', "  '#ar6-wand .ar6-wi{flex:0 0 16px;width:16px;height:16px;display:grid;place-items:center;color:#58a6ff}',", "  '#ar6-wand .ar6-wi{flex:0 0 20px;width:20px;height:20px;display:grid;place-items:center;opacity:.92}',");
rep('11_wand.js', "  '#ar6-wand .ar6-wi svg{width:16px;height:16px;display:block}',", "  '#ar6-wand .ar6-wi svg{width:20px;height:20px;display:block}',");
rep('11_wand.js', "  '#ar6-wand .ar6-ws{flex:0 0 auto;font-size:10.5px;font-weight:400;color:#8b949e}',", "  '#ar6-wand .ar6-ws{flex:0 0 auto;font-size:11px;font-weight:400;color:#7d8590}',");
rep('11_wand.js', "  '@media (pointer:coarse){#ar6-wand .ar6-wb{padding:12px 12px;font-size:14px}}',", "  '@media (pointer:coarse){#ar6-wand .ar6-wb{height:44px;font-size:15px}}',");

rep('build_v8.mjs', '8.4.0', '8.5.0', true);
console.log('\n共 ' + n + ' 处');
