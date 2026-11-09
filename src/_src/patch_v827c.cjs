/* patch_v827c.cjs — 让移动端面板上下/左右都能滑，滚动条常显 */
const fs = require('fs');
const path = require('path');
const S = (f) => path.join(__dirname, f);
function rep(file, anchor, next, count) {
  const p = S(file);
  let s = fs.readFileSync(p, 'utf8');
  const n = s.split(anchor).length - 1;
  if (n !== (count === undefined ? 1 : count)) throw new Error('count=' + n + ' :: ' + file + ' :: ' + anchor.slice(0, 50));
  fs.writeFileSync(p, s.split(anchor).join(next));
}

/* 移动面板：两轴都可滑 */
rep('4_ui.js',
  "'overflow-y:auto;overflow-x:hidden;-webkit-overflow-scrolling:touch;touch-action:pan-y;overscroll-behavior:contain;box-shadow:0 12px 36px rgba(0,0,0,.28);';",
  "'overflow:auto;-webkit-overflow-scrolling:touch;touch-action:pan-x pan-y;overscroll-behavior:contain;scrollbar-width:thin;box-shadow:0 12px 36px rgba(0,0,0,.28);';");

/* 滚动条常显且更粗（安卓 WebView 默认藏起来，露不出来就没人知道能滑） */
rep('4_ui.js',
  "  '#ar6-root::-webkit-scrollbar{width:6px;height:6px;}',",
  "  '#ar6-root::-webkit-scrollbar{width:9px;height:9px;}',\n" +
  "  '#ar6-root::-webkit-scrollbar-thumb{background:rgba(255,255,255,.26);border:2px solid transparent;background-clip:content-box;border-radius:6px;}',\n" +
  "  '#ar6-root::-webkit-scrollbar-thumb:hover{background:rgba(255,255,255,.42);background-clip:content-box;}',");

/* 表格横滑条也加粗 */
rep('4_ui.js',
  "  '.ar6-tw::-webkit-scrollbar{height:6px}',",
  "  '.ar6-tw::-webkit-scrollbar{height:9px}',");

/* 桌面分支也统一（宽度不变） */
rep('4_ui.js',
  "'max-height:min(78vh,820px);overflow-y:auto;overflow-x:hidden;' +",
  "'max-height:min(78vh,820px);overflow-y:auto;overflow-x:auto;scrollbar-width:thin;' +");

console.log('patched v8.27 scrollbars');
