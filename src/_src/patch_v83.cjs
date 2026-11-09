/* patch_v83.cjs — v8.3.0：3 红 + 2 黄修复 + 安全清理 + 魔法棒接线 */
const fs = require('fs');
const path = require('path');
const S = (f) => path.join(__dirname, f);

let n = 0;
function rep(file, anchor, next, all) {
  let s = fs.readFileSync(S(file), 'utf8');
  const cnt = s.split(anchor).length - 1;
  if (cnt === 0) throw new Error('anchor missing in ' + file + ': ' + anchor.slice(0, 60));
  if (!all && cnt !== 1) throw new Error('anchor x' + cnt + ' in ' + file + ': ' + anchor.slice(0, 60));
  s = all ? s.split(anchor).join(next) : s.replace(anchor, next);
  fs.writeFileSync(S(file), s);
  n++;
  console.log('  patched ' + file + ' #' + n);
}

/* ---------- 1_core: 版本 ---------- */
rep('1_core.js', "var VERSION = '8.2.0';", "var VERSION = '8.3.0';");
rep('1_core.js', '  v: 820,', '  v: 830,');
rep('1_core.js', 's.v !== 820', 's.v !== 830');
rep('1_core.js', 'd.v = 820', 'd.v = 830');

/* ---------- 6_float: 🔴1 先量后清 ---------- */
rep('6_float.js',
`    r.style.transform = '';
    r.style.transition = '';
    if (moved && !cancelled) {
      /* 必须在清 transform 之前量：rect 含 translate3d */
      var b = r.getBoundingClientRect();
      var w = b.width || 320, h = b.height || 240;
      var c = floatClampPx(b.left, b.top, w, h);
      r.style.transform = '';
      r.style.transition = '';`,
`    if (moved && !cancelled) {
      /* 先量 rect（含 translate3d），再清 transform —— 顺序反了会弹回原位 */
      var b = r.getBoundingClientRect();
      var w = b.width || 320, h = b.height || 240;
      var c = floatClampPx(b.left, b.top, w, h);
      r.style.transform = '';
      r.style.transition = '';`);

/* ---------- 6_float: 🟡5 黄色预警可达 ---------- */
rep('6_float.js',
`      /* v8.0.3：kpi 没有 warn 字段，黄色态用被换占比判断 */
      var n = Number(k.total) || 0;
      var bad = Number(k.bad) || 0;
      code = bad > 0 ? 'bad' : (n >= 4 && bad / n >= 0.15 ? 'warn' : 'ok');`,
`      /* v8.3：kpi 只给 eff，没有 total；warn 必须先判，否则永远不可达 */
      var n = Number(k.eff) || 0;
      var bad = Number(k.bad) || 0;
      code = (n >= 4 && bad / n >= 0.15) ? 'warn' : (bad > 0 ? 'bad' : 'ok');`);

/* ---------- 6_float: 💭6 边框不占布局 ---------- */
rep('6_float.js',
`    'display:flex;align-items:center;justify-content:center;position:fixed;z-index:2147483000;left:0;top:0;' +`,
`    'box-sizing:border-box;display:flex;align-items:center;justify-content:center;position:fixed;z-index:2147483000;left:0;top:0;' +`);

/* ---------- 6_float: 💭7 320–450ms 空档 ---------- */
rep('6_float.js', 'if (Date.now() - downAt < 320)', 'if (Date.now() - downAt < 450)');

/* ---------- 4_ui: 🔴2 滑块不再压面板 ---------- */
rep('4_ui.js',
`      var rr = DOC.getElementById(ROOT_ID);
      if (rr) {
        floatApplyPosition(rr, minimized);`,
`      var rr = DOC.getElementById(ROOT_ID);
      if (rr && minimized) {
        /* v8.3：展开态只改坐标，不动盒子尺寸（否则整块面板被压成球） */
        floatApplyPosition(rr, true);`);

/* ---------- 4_ui: 🟡4 fEdge 用 0 判断 ---------- */
rep('4_ui.js', '(cfg.fxN || 1) < 0.5 ?', '((isFinite(Number(cfg.fxN)) ? Number(cfg.fxN) : 1) < 0.5) ?', true);

/* ---------- 4_ui: XSS 双保险 ---------- */
rep('4_ui.js',
`      '<td>' + (r.chars || 0) + '</td>' +`,
`      '<td>' + esc(String(Math.round(Number(r.chars) || 0))) + '</td>' +`);
rep('4_ui.js',
`      '<td>' + (r.edits ? '+' + r.edits : '—') + '</td>' +`,
`      '<td>' + (Number(r.edits) ? '+' + esc(String(Math.round(Number(r.edits)))) : '—') + '</td>' +`);

/* ---------- 4_ui: key 改 password ---------- */
rep('4_ui.js',
`'<input data-ar6="key" placeholder="API Key（可留空）" value="' + esc(cfg.dualKey) + '">' +`,
`'<input data-ar6="key" type="password" autocomplete="off" spellcheck="false" placeholder="API Key（可留空）" value="' + esc(cfg.dualKey) + '">' +`);

/* ---------- 4_ui: dispose 清残留 ---------- */
rep('4_ui.js',
`  booted = false; bound = false;
}`,
`  step('移除魔法棒', function () { try { unmountWandEntry(); } catch (eW) {} });
  step('清理残留', function () {
    try { closeCard(); } catch (eC) {}
    ['ar6-bn2'].forEach(function (id) {
      var el = DOC && DOC.getElementById(id);
      if (el && el.parentNode) el.parentNode.removeChild(el);
    });
    var st = DOC ? DOC.querySelectorAll('style#ar6-style,style#ar6-style82') : [];
    for (var i = 0; i < st.length; i++) if (st[i].parentNode) st[i].parentNode.removeChild(st[i]);
    BTN_BOUND = {}; BTN_OK = 0;
  });
  booted = false; bound = false;
}`);

/* ---------- 4_ui: boot 挂魔法棒 ---------- */
rep('4_ui.js', "step('按钮', function () { bindScriptButtons(); });",
`step('按钮', function () { bindScriptButtons(); });
  step('魔法棒', function () { try { mountWandEntry(); } catch (eM) {} });`);

/* ---------- build: 接入 11_wand + 版本 ---------- */
rep('build_v8.mjs', "const PARTS = [", "const PARTS = [\n  '11_wand.js',");
rep('build_v8.mjs', "8.2.0", "8.3.0", true);

console.log('\n完成：' + n + ' 处');
