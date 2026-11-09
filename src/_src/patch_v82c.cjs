/* patch_v82c.cjs — v8.2 交互：控制盘渲染 / 找回入口 / 点空白 / 滚动保位 / 轻点判定 */
const fs = require('fs');
const path = require('path');
const S = (f) => path.join(__dirname, f);

function rep(file, anchor, next) {
  const p = S(file);
  let s = fs.readFileSync(p, 'utf8');
  const n = s.split(anchor).length - 1;
  if (n !== 1) throw new Error(file + ' anchor count=' + n + ' :: ' + anchor.slice(0, 70));
  s = s.replace(anchor, next);
  fs.writeFileSync(p, s);
  console.log('patched ' + file);
}

/* 1) 收起态：控制盘 / 球（带环与流光）；不再有 hidden 分支 */
rep('4_ui.js', `  if (minimized) {
    r.className = '';
    r.setAttribute('style', panelStyle(mode, true));
    var fm = String(cfg.floatMode || 'dock');
    if (fm === 'hidden') {
      r.setAttribute('style', 'position:fixed;left:-9999px;top:0;width:1px;height:1px;overflow:hidden;opacity:0;');
      html += '<div class="ar6-pill" data-ar6="expand"></div>';
    } else {
      r.setAttribute('style', floatStyle());
      html += '<div class="ar6-pill" data-ar6="expand" style="all:unset;position:absolute;inset:0;display:flex;align-items:center;justify-content:center;cursor:pointer;">' +
        floatIconMarkup() +
        '<span class="ar6-dot ' + st.kind + '" style="position:absolute;right:1px;bottom:1px;width:8px;height:8px;"></span>' +
        '</div>';
    }
  } else {`,
`  if (minimized) {
    r.className = '';
    r.setAttribute('style', panelStyle(mode, true));
    r.setAttribute('data-min', '1');
    r.setAttribute('data-st', PAD_OPEN ? 'ok' : st.kind);
    r.setAttribute('data-rm', cfg.rm || cfg.fx === 'off' ? '1' : '0');
    if (PAD_OPEN) {
      r.setAttribute('style', floatStyle());
      html += '<div class="ar6-pad">' +
        '<div class="ar6-pad-h" data-ar6-grip="1">' + ico('ghost') +
        '<b>位置</b><button class="ar6-x" data-ar6="padclose" title="收起">✕</button></div>' +
        '<label class="ar6-pad-r"><span>左右</span><input type="range" min="0" max="100" step="1" data-ar6-pad="x" value="' + Math.round((cfg.fxN || 0) * 100) + '"></label>' +
        '<label class="ar6-pad-r"><span>上下</span><input type="range" min="0" max="100" step="1" data-ar6-pad="y" value="' + Math.round((cfg.fyN || 0) * 100) + '"></label>' +
        '<div class="ar6-grip" data-ar6-grip="1">按住这里移动</div>' +
        '<div class="ar6-pad-f">' +
        '<button class="ar6-b" data-ar6="padpanel">' + ico('file') + '<span>面板</span></button>' +
        '<button class="ar6-b" data-ar6="tuck">' + ico('ghost') + '<span>贴边</span></button>' +
        '</div></div>';
    } else {
      r.setAttribute('style', floatStyle());
      var tab = String(cfg.floatMode || 'dock') === 'tuck';
      html += '<div class="ar6-pill" data-ar6="expand" style="all:unset;position:absolute;inset:0;display:flex;align-items:center;justify-content:center;cursor:pointer;-webkit-tap-highlight-color:transparent;">' +
        '<span class="ar6-ring"></span><span class="ar6-sheen"></span>' +
        (tab ? '<span class="ar6-tabmark"></span>' : floatIconMarkup()) +
        '<span class="ar6-dot ' + st.kind + '" style="position:absolute;right:1px;bottom:1px;width:8px;height:8px;"></span>' +
        '</div>';
    }
  } else {`);

/* 打开面板后清掉收起态标记 */
rep('4_ui.js', `    r.className = mode === 'mobile' ? 'ar6-mobile' : '';
    r.setAttribute('style', panelStyle(mode, false));`,
`    r.className = mode === 'mobile' ? 'ar6-mobile' : '';
    r.removeAttribute('data-min');
    r.setAttribute('data-rm', cfg.rm || cfg.fx === 'off' ? '1' : '0');
    r.setAttribute('style', panelStyle(mode, false));`);

/* 2) 滚动保位：重建时把 .ar6-body 的 scrollTop 接回去 */
rep('4_ui.js', `  r.innerHTML = html;`,
`  var scTop = 0;
  try { var oldBody = r.querySelector('.ar6-body'); if (oldBody) scTop = oldBody.scrollTop || 0; } catch (eSc) {}
  r.innerHTML = html;
  try {
    if (scTop > 0) { var nb = r.querySelector('.ar6-body'); if (nb) nb.scrollTop = scTop; }
  } catch (eSc2) {}`);

/* 3) 分派：expand 打开面板（不打开盘）；min 收起；tuck 贴边；pad 三个动作 */
rep('4_ui.js', `  if (act === 'expand') { minimized = false; cfg.mx = null; cfg.my = null; syncMin(); render(); return; }
  if (act === 'min') { minimized = true; cfg.mx = null; cfg.my = null; syncMin(); render(); return; }
  if (act === 'hide') {
    /* 永不用 display:none —— 收成小球，随时点得回来 */
    minimized = true; syncMin(); render();
    banner(cfg.floatMode === 'hidden'
      ? '已隐藏（工具栏 🛡️ 或面板里改回 Dock 可找回）'
      : '已收起到右下角小球，点它恢复', 'gray');
    return;
  }`,
`  if (act === 'expand') { PAD_OPEN = false; minimized = false; syncMin(); render(); return; }
  if (act === 'min') { PAD_OPEN = false; minimized = true; syncMin(); render(); return; }
  if (act === 'padclose') { closePad(); return; }
  if (act === 'padpanel') { PAD_OPEN = false; minimized = false; syncMin(); render(); return; }
  if (act === 'tuck') {
    PAD_OPEN = false;
    cfg.floatMode = 'tuck';
    cfg.fEdge = (cfg.fxN || 1) < 0.5 ? 'l' : 'r';
    minimized = true; syncMin(); render();
    banner('已贴边收起：屏幕边缘还留一条把手，点它就能回来', 'gray');
    return;
  }
  if (act === 'hide') {
    /* 老版本入口：不再隐藏，改成贴边（hidden 是单向门） */
    cfg.floatMode = 'tuck';
    cfg.fEdge = (cfg.fxN || 1) < 0.5 ? 'l' : 'r';
    minimized = true; syncMin(); render();
    banner('已贴边收起（点边缘把手回来）', 'gray');
    return;
  }`);

/* 4) 直接绑定：改成 pointerup + 位移小于 8px 才算点击 */
rep('4_ui.js', `        var fire = function (ev) {
          try {
            onPanelClick({ target: n, type: (ev && ev.type) || 'click',
              preventDefault: function () {}, stopPropagation: function () {} });
          } catch (e) {}
        };
        n.addEventListener('pointerdown', fire, true);
        n.addEventListener('click', fire, true);   /* 双挂是安全的：去重已移到脚本作用域（ACT_TS） */`,
`        var sx = 0, sy = 0, seen = 0;
        var fire = function (ev) {
          try {
            onPanelClick({ target: n, type: (ev && ev.type) || 'click',
              preventDefault: function () {}, stopPropagation: function () {} });
          } catch (e) {}
        };
        n.addEventListener('pointerdown', function (ev) {
          try { sx = ev.clientX || 0; sy = ev.clientY || 0; seen = 1; } catch (e) {}
        }, true);
        n.addEventListener('pointerup', function (ev) {
          try {
            if (!seen) return;
            var dx = Math.abs((ev.clientX || 0) - sx), dy = Math.abs((ev.clientY || 0) - sy);
            seen = 0;
            if (dx > 8 || dy > 8) return;   /* 滑动起手不触发按钮 */
            fire(ev);
          } catch (e) {}
        }, true);
        n.addEventListener('click', function (ev) {
          /* 指针事件可用时，click 只作为无障碍兜底（pointerup 已处理过） */
          try { if (HOST.PointerEvent) return; fire(ev); } catch (e) { fire(ev); }
        }, true);`);

/* 5) 找回悬浮球：去掉 panelOnly；计数改 BTN_TOTAL */
rep('4_ui.js', `    { key: 'unhide', panelOnly: true, names: ['🫧 找回悬浮球', '找回悬浮球', '显示悬浮球', '🫧 显示悬浮球'],`,
`    { key: 'unhide', names: ['🫧 找回悬浮球', '找回悬浮球', '显示悬浮球', '🫧 显示悬浮球'],`);

rep('4_ui.js', `        cfg.floatMode = 'dock';
        cfg.fEdge = 'r';
        cfg.fxN = 1;
        minimized = false;
        saveCfg();
        render();
        banner('🫧 已恢复悬浮球（吸边模式）', 'ok');`,
`        cfg.floatMode = 'dock';
        cfg.fEdge = 'r';
        cfg.fxN = 1;
        PAD_OPEN = false;
        minimized = true;
        saveCfg();
        render();
        try { floatApplyPosition(root(), true); } catch (eA) {}
        banner('已把悬浮球放回右下角（也可以点边缘的把手）', 'ok');`);

rep('4_ui.js', `      '<span>按钮 <b class="' + (BTN_OK >= 7 ? 'ok' : (BTN_OK ? 'warn' : 'bad')) + '">' + btnSummary() + '</b></span>' +`,
`      '<span>按钮 <b class="' + (BTN_OK >= BTN_TOTAL ? 'ok' : (BTN_OK ? 'warn' : 'bad')) + '">' + btnSummary() + '</b></span>' +`);

rep('4_ui.js', `function btnSummary() { return BTN_OK + '/' + 7; }`,
`var BTN_TOTAL = 8;
function btnSummary() { return BTN_OK + '/' + BTN_TOTAL; }`);

/* 6) 点空白：提示条自己不算“外面” */
rep('4_ui.js', `      if (CARD && CARD.open) {`,
`      if (t && t.closest && t.closest('#ar6-bn2')) return;
      if (CARD && CARD.open) {`);

/* 7) 滑块：只在收起态改球；同时支持控制盘的 x/y */
rep('4_ui.js', `function onPanelInput(e) {`,
`function onPanelInput(e) {
  var t0 = e && e.target;
  if (t0 && t0.getAttribute && t0.getAttribute('data-ar6-pad')) {
    var ax = t0.getAttribute('data-ar6-pad');
    var v = Math.max(0, Math.min(100, Number(t0.value) || 0)) / 100;
    if (ax === 'x') { cfg.fxN = v; cfg.fEdge = v < 0.5 ? 'l' : 'r'; }
    else cfg.fyN = v;
    try { floatApplyPosition(root(), true); } catch (eP) {}
    return;
  }`);

rep('4_ui.js', `  if (!t || !t.getAttribute) return;
  if (t.getAttribute('data-ar6-pos')) { try { saveCfg(); } catch (e) {} }`,
`  if (!t || !t.getAttribute) return;
  if (t.getAttribute('data-ar6-pad')) { try { saveCfg(); } catch (e) {} return; }
  if (t.getAttribute('data-ar6-pos')) { try { saveCfg(); } catch (e) {} }`);

/* 8) 控制盘拖动：根节点按 pad 落库 */
rep('4_ui.js', `  if (!minimized && panelEl) installRootDrag(r, 'panel');`,
`  if (!minimized && panelEl) installRootDrag(r, 'panel');
  if (minimized) installRootDrag(r, PAD_OPEN ? 'pad' : 'ball');`);

console.log('done');
