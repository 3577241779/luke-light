/* patch_v828.cjs — 移动端面板改成「固定高度 + 内部滚动区」，并把拖动彻底让给滚动 */
const fs = require('fs');
const path = require('path');
function rep(file, anchor, next, cnt) {
  const p = path.join(__dirname, file);
  let s = fs.readFileSync(p, 'utf8');
  const n = s.split(anchor).length - 1;
  if (n !== (cnt === undefined ? 1 : cnt)) throw new Error('count=' + n + ' :: ' + file + ' :: ' + anchor.slice(0, 60));
  fs.writeFileSync(p, s.split(anchor).join(next));
}

/* ---------- 1. 版本 ---------- */
rep('1_core.js', "var VERSION = '8.27.0';", "var VERSION = '8.28.0';");
rep('1_core.js', 'v: 827,', 'v: 828,');
rep('1_core.js', 'if (s.v !== 827) {', 'if (s.v !== 828) {');
rep('1_core.js', '        d.v = 827;', '        d.v = 828;');

/* ---------- 2. 结构：头部固定，其余进 .ar6-body ---------- */
rep('4_ui.js',
  "'</div>';\n\n    html += '<div class=\"ar6-st\">'",
  "'</div><div class=\"ar6-body\" data-ar6-scroll=\"1\">';\n\n    html += '<div class=\"ar6-st\">'");

rep('4_ui.js',
  "'<span>保留 ' + readLog().length + '/' + (cfg.keep || MAX_LOG) + '</span></div>';\n\n    html += '</div>';",
  "'<span>保留 ' + readLog().length + '/' + (cfg.keep || MAX_LOG) + '</span></div>';\n\n    html += '</div></div>';");

/* ---------- 3. CSS：卡片列布局 + 内部滚动 + 可见滚动条 ---------- */
rep('4_ui.js',
  "  '#ar6-root .ar6-body{overflow-y:auto;overscroll-behavior:contain;-webkit-overflow-scrolling:touch}',",
  "  '#ar6-root .ar6-body{flex:1 1 auto;min-height:0;overflow:auto;overscroll-behavior:contain;" +
  "-webkit-overflow-scrolling:touch;touch-action:pan-x pan-y;scrollbar-width:thin;padding-bottom:6px;}',\n" +
  "  '#ar6-root .ar6-body::-webkit-scrollbar{width:9px;height:9px;}',\n" +
  "  '#ar6-root .ar6-body::-webkit-scrollbar-thumb{background:rgba(255,255,255,.24);border:2px solid transparent;background-clip:content-box;border-radius:6px;}',\n" +
  "  '#ar6-root .ar6-p{display:flex;flex-direction:column;max-height:100%;min-height:0;overflow:hidden;}',\n" +
  "  '#ar6-root .ar6-h{flex:0 0 auto;position:relative;z-index:3;}',\n" +
  "  '#ar6-root .ar6-p>.ar6-h{position:sticky;top:0}',");

/* 窄屏时不要再把 .ar6-p 的 overflow 放开（会破坏上面的裁剪） */
rep('4_ui.js',
  "  '@media (max-width:520px){.ar6-p{overflow:visible;}.ar6-bodySpace{overflow-y:auto;}}',",
  "  '@media (max-width:520px){#ar6-root .ar6-p{overflow:hidden;}}',");

/* ---------- 4. 固定高度：用真实视口算像素，不依赖 vh ---------- */
rep('4_ui.js',
  "function mountAll() {",
  "function fitPanel(el) {\n" +
  "  try {\n" +
  "    if (!el || minimized) return;\n" +
  "    var vv = (HOST.visualViewport && HOST.visualViewport.height) || HOST.innerHeight || 720;\n" +
  "    var mode = uiMode();\n" +
  "    var maxH = Math.round(vv * (mode === 'mobile' ? 0.72 : 0.78));\n" +
  "    if (mode !== 'mobile') maxH = Math.min(maxH, 820);\n" +
  "    if (maxH < 240) maxH = 240;\n" +
  "    el.style.height = maxH + 'px';\n" +
  "    el.style.maxHeight = maxH + 'px';\n" +
  "    el.style.display = 'flex';\n" +
  "    el.style.flexDirection = 'column';\n" +
  "    el.style.overflow = 'hidden';\n" +
  "  } catch (e) {}\n" +
  "}\n\nfunction mountAll() {");

rep('4_ui.js',
  "  if (!minimized && panelEl) { try { installRootDrag(r, 'panel'); } catch (eRD) {} }",
  "  if (!minimized) { try { fitPanel(r); } catch (eFP) {} }\n" +
  "  if (!minimized && panelEl) { try { installRootDrag(r, 'panel'); } catch (eRD) {} }");

console.log('patched v8.28 scroll container');
