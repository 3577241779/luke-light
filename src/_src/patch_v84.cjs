/* patch_v84.cjs — v8.4.0：取消常驻悬浮球与控制盘；魔法棒点一下直接出面板（右侧），关掉即消失 */
const fs = require('fs');
const path = require('path');
const S = (f) => path.join(__dirname, f);
let n = 0;
function rep(file, anchor, next, all) {
  let s = fs.readFileSync(S(file), 'utf8');
  const c = s.split(anchor).length - 1;
  if (!c) throw new Error('missing in ' + file + ': ' + anchor.slice(0, 50));
  if (!all && c !== 1) throw new Error('x' + c + ' in ' + file);
  fs.writeFileSync(S(file), all ? s.split(anchor).join(next) : s.replace(anchor, next));
  n++; console.log('  ok ' + file + ' #' + n);
}

/* 版本 */
rep('1_core.js', "var VERSION = '8.3.0';", "var VERSION = '8.4.0';");
rep('1_core.js', '  v: 830,', '  v: 840,');
rep('1_core.js', 's.v !== 830', 's.v !== 840');

/* 收起态完全隐藏（不再画球/控制盘） */
rep('4_ui.js',
`  var html = '';
  if (minimized) {
    r.className = '';`,
`  var html = '';
  if (minimized) {
    /* v8.4：不再常驻悬浮球/控制盘 —— 收起即完全隐藏，用扩展菜单「魔法棒」或工具栏重开 */
    r.setAttribute('data-min', '1');
    html = '';
    r.innerHTML = '';
    try { r.style.display = 'none'; } catch (eMin) {}
    return true;
  }
  if (minimized) {
    r.className = '';`);

/* 面板头部加一个可拖的圆点（就是用户说的"悬浮球"） */
rep('4_ui.js',
`      '<button class="ar6-x" data-ar6="help" title="使用说明">❔</button>' +`,
`      '<span class="ar6-hb" data-ar6-grip="1" title="按住拖动"></span>' +
      '<button class="ar6-x" data-ar6="help" title="使用说明">❔</button>' +`);

/* 打开面板的统一入口 */
rep('4_ui.js', 'function syncMin() {',
`function openPanelFromWand() {
  minimized = false;
  try { PAD_OPEN = false; } catch (eP0) {}
  try { cfg.min = false; if (typeof saveCfg === 'function') saveCfg(); } catch (eP1) {}
  try { closeCard(); } catch (eP2) {}
  render();
  try {
    var r = root();
    if (r) {
      r.setAttribute('style', panelStyle(uiMode(), false));
      var vw = (HOST.visualViewport && HOST.visualViewport.width) || HOST.innerWidth || 390;
      var w = uiMode() === 'mobile' ? Math.min(vw * 0.92, 380) : 440;
      cfg.mx = Math.max(8, Math.round(vw - w - 12));
      cfg.my = Math.max(72, Math.round(((HOST.visualViewport && HOST.visualViewport.height) || HOST.innerHeight || 700) * 0.18));
      saveCfg();
      r.style.left = cfg.mx + 'px';
      r.style.top = cfg.my + 'px';
      r.style.right = 'auto';
      r.style.bottom = 'auto';
    }
  } catch (eP3) {}
  return true;
}

function syncMin() {`);

/* 面板风格支持 mx/my（桌面也认） */
rep('4_ui.js',
`    'max-height:min(78vh,820px);overflow-y:auto;overflow-x:hidden;';`,
`    'max-height:min(78vh,820px);overflow-y:auto;overflow-x:hidden;' +
    'left:' + (cfg.mx == null ? '' : (cfg.mx + 'px;')) + 'top:' + (cfg.my == null ? '' : (cfg.my + 'px;'));`);

/* 头部的圆点样式 */
rep('4_ui.js', "  '.ar6-x:hover{color:#e6edf3;background:rgba(255,255,255,.07);}',",
`  '.ar6-x:hover{color:#e6edf3;background:rgba(255,255,255,.07);}',
  '.ar6-hb{width:18px;height:18px;border-radius:50%;margin-left:6px;cursor:grab;touch-action:none;',
  'background:radial-gradient(circle at 35% 30%,#9ecbff,#3d7fe0 65%,#1f4d96);',
  'box-shadow:0 0 0 1px rgba(255,255,255,.28) inset,0 2px 8px rgba(61,127,224,.55);flex:0 0 18px}',
  '.ar6-hb:active{cursor:grabbing}',`);

/* 魔法棒：一行即开面板 */
rep('../build_v8.mjs', '8.3.0', '8.4.0', true);

console.log('\n共 ' + n + ' 处');
