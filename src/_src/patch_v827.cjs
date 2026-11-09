/* patch_v827.cjs — TT 移动端：图标被宿主样式放大 + 面板/表格没法滑 */
const fs = require('fs');
const path = require('path');
const S = (f) => path.join(__dirname, f);

function rep(file, anchor, next, count) {
  const p = S(file);
  let s = fs.readFileSync(p, 'utf8');
  const n = s.split(anchor).length - 1;
  if (n !== (count === undefined ? 1 : count)) {
    throw new Error('anchor count=' + n + ' in ' + file + ' :: ' + anchor.slice(0, 60));
  }
  s = s.split(anchor).join(next);
  fs.writeFileSync(p, s);
  return true;
}

/* 1) 版本号 */
rep('1_core.js', "var VERSION = '8.26.0';", "var VERSION = '8.27.0';");
rep('1_core.js', 'v: 826,', 'v: 827,');
rep('1_core.js', 'if (d.v !== 827) {', 'if (d.v !== 827) {');

/* 2) 图标：内联尺寸 + 内联 style，防宿主 svg 规则覆盖 */
rep('4_ui.js',
  "  return '<svg class=\"ar6-i\" viewBox=\"0 0 24 24\" aria-hidden=\"true\"><path d=\"' + d + '\"/></svg>';",
  "  return '<svg class=\"ar6-i\" width=\"14\" height=\"14\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.7\" stroke-linecap=\"round\" stroke-linejoin=\"round\" style=\"width:14px;height:14px;flex:0 0 14px\" aria-hidden=\"true\"><path d=\"' + d + '\"/></svg>';");

/* 3) CSS：图标强制尺寸、面板可滑、滚动条可见、表格横向可滑 */
rep('4_ui.js',
  "  '#ar6-root *{box-sizing:border-box;}',",
  "  '#ar6-root *{box-sizing:border-box;}',\n" +
  "  '#ar6-root svg.ar6-i{width:14px!important;height:14px!important;min-width:14px!important;min-height:14px!important;max-width:14px!important;max-height:14px!important;flex:0 0 14px!important;display:inline-block!important;vertical-align:-2px;fill:none!important;stroke:currentColor!important;stroke-width:1.7!important;stroke-linecap:round!important;stroke-linejoin:round!important;overflow:visible!important;}',\n" +
  "  '#ar6-root .ar6-b svg.ar6-i,#ar6-root .ar6-chip svg.ar6-i{width:13px!important;height:13px!important;min-width:13px!important;max-width:13px!important;flex:0 0 13px!important;}',\n" +
  "  '#ar6-root .ar6-b,#ar6-root .ar6-chip{display:inline-flex;align-items:center;gap:5px;line-height:1.15;white-space:nowrap;}',\n" +
  "  '#ar6-root{overscroll-behavior:contain;touch-action:pan-y;-webkit-overflow-scrolling:touch;}',\n" +
  "  '#ar6-root::-webkit-scrollbar{width:6px;height:6px;}',\n" +
  "  '#ar6-root::-webkit-scrollbar-thumb{background:rgba(255,255,255,.18);border-radius:3px;}',\n" +
  "  '#ar6-root::-webkit-scrollbar-track{background:transparent;}',\n" +
  "  '.ar6-tw{max-width:100%;touch-action:pan-x;overscroll-behavior-x:contain;}',\n" +
  "  '@media (max-width:520px){.ar6-p{overflow:visible;}.ar6-bodySpace{overflow-y:auto;}}',");

/* 4) 移动面板：显式允许纵向滚动 + 惯性 */
rep('4_ui.js',
  "      'overflow-y:auto;overflow-x:hidden;box-shadow:0 12px 36px rgba(0,0,0,.28);';",
  "      'overflow-y:auto;overflow-x:hidden;-webkit-overflow-scrolling:touch;touch-action:pan-y;overscroll-behavior:contain;box-shadow:0 12px 36px rgba(0,0,0,.28);';");

console.log('patched v8.27.0');
