/* ===== 11_wand.js ===== */
/* 11_wand.js — 酒馆魔法棒「光之守护」入口 + 闪耀迪迦桌宠（无「光」字残块，靠边与彩色计时器圆章唯一合体） */
var WAND_ID = 'ar6-wand';
var WAND_SHEET = 'ar6-wand-sheet';
var WAND_SENDBTN = 'ar6-sendbtn';
var WAND_SEL_MENU = ['#extensionsMenu', '#extensions_menu', '[data-testid="extensions-menu"]'];
var WAND_SEL_BTN = ['#extensionsMenuButton', '[data-testid="extensions-menu-button"]'];
var WAND_STATE = 'none';
var WAND_OBS = null;
var WAND_TRIES = 0;

/* 迪迦神光棒四芒星徽 */
var WAND_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.65" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 2.2 14.5 9.5 21.8 12 14.5 14.5 12 21.8 9.5 14.5 2.2 12 9.5 9.5Z" fill="rgba(56,189,248,.2)"/><circle cx="12" cy="12" r="2.2" fill="currentColor"/></svg>';

var WAND_CSS = [
  '#ar6-wand{display:block;margin:2px 0 4px}',
  '#ar6-wand .ar6-wb{display:flex;align-items:center;gap:8px;width:100%;box-sizing:border-box;',
  'padding:0 10px;height:34px;border:0;border-radius:7px;cursor:pointer;',
  'background:transparent;color:inherit;font:500 13.5px/1.2 -apple-system,BlinkMacSystemFont,"Segoe UI","Microsoft YaHei",sans-serif;',
  'text-align:left;-webkit-tap-highlight-color:transparent;transition:background .12s ease}',
  '#ar6-wand .ar6-wb:hover{background:rgba(56,189,248,.1)}',
  '#ar6-wand .ar6-wb:active{background:rgba(56,189,248,.16)}',
  '#ar6-wand .ar6-wi{flex:0 0 20px;width:20px;height:20px;display:grid;place-items:center;color:#38bdf8;opacity:.96}',
  '#ar6-wand .ar6-wb[data-on="0"] .ar6-wi{color:#94a3b8}',
  '#ar6-wand .ar6-wi svg{width:19px;height:19px;display:block}',
  '#ar6-wand .ar6-wn{flex:1 1 auto;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-weight:600}',
  '#ar6-wand .ar6-ws{flex:0 0 auto;font-size:11.5px;font-weight:600;color:#94a3b8}',
  '#ar6-wand .ar6-ws::before{content:"";display:inline-block;width:6px;height:6px;border-radius:50%;',
  'background:currentColor;margin-right:5px;vertical-align:1px}',
  '#ar6-wand .ar6-ws[data-on="1"]{color:#38bdf8}',
  '#ar6-wand .ar6-ws[data-on="1"]::before{box-shadow:0 0 6px #38bdf8}',
  '@media (pointer:coarse){#ar6-wand .ar6-wb{height:44px;font-size:15px}}',
  '#ar6-sendbtn{order:3;display:flex;align-items:center;justify-content:center;width:28px;height:28px;margin:0 2px;',
  'border-radius:8px;cursor:pointer;color:#38bdf8;background:#0f182b;border:1px solid rgba(148,163,184,.32)}',
  '#ar6-sendbtn svg{width:17px;height:17px}'
].join('\n');

function wandDoc() { return DOC || (HOST && HOST.document) || null; }
function wandPick(list) {
  var d = wandDoc(); if (!d) return null;
  for (var i = 0; i < list.length; i++) { var n = d.querySelector(list[i]); if (n) return n; }
  return null;
}
function wandMenu() { return wandPick(WAND_SEL_MENU); }
function wandBtn() { return wandPick(WAND_SEL_BTN); }
function wandShown(el) {
  if (!el) return false;
  try { return HOST.getComputedStyle(el).display !== 'none'; } catch (e) { return el.offsetParent !== null; }
}
function wandLabel() {
  var on = !!(cfg && cfg.enabled);
  return { text: on ? '蓝灯守护中' : '石像待机', on: on ? '1' : '0' };
}
function syncWandLabel() {
  try {
    var d = wandDoc();
    var box = d && d.getElementById(WAND_ID);
    if (!box) return;
    var L = wandLabel();
    var wb = box.querySelector('.ar6-wb');
    var ws = box.querySelector('.ar6-ws');
    if (wb) wb.setAttribute('data-on', L.on);
    if (ws) { ws.setAttribute('data-on', L.on); ws.textContent = L.text; }
  } catch (e) {}
}
function ensureWandStyle() {
  var d = wandDoc(); if (!d || !d.head || d.getElementById('ar6-wand-style')) return;
  var st = d.createElement('style');
  st.id = 'ar6-wand-style';
  st.textContent = WAND_CSS;
  d.head.appendChild(st);
}

function wandRow() {
  var d = wandDoc();
  var L = wandLabel();
  var b = d.createElement('button');
  b.type = 'button';
  b.className = 'ar6-wb';
  b.setAttribute('data-ar6-wand-open', '1');
  b.setAttribute('data-on', L.on);
  b.title = '打开或收起 卢克之光 · 光之守护';
  var ic = d.createElement('span'); ic.className = 'ar6-wi'; ic.innerHTML = WAND_ICON;
  var tx = d.createElement('span'); tx.className = 'ar6-wn'; tx.textContent = '光之守护';
  var st = d.createElement('span'); st.className = 'ar6-ws';
  st.setAttribute('data-on', L.on); st.textContent = L.text;
  b.appendChild(ic); b.appendChild(tx); b.appendChild(st);
  b.addEventListener('click', function (ev) {
    ev.preventDefault(); ev.stopPropagation();
    if (DISPOSED) return;
    try {
      if (typeof panelOpen === 'function' && panelOpen()) {
        minimized = true;
        cfg.docked = false;
        MORE_OPEN = false;
        syncMin();
        render();
      } else {
        openPanelFromWand();
      }
    } catch (e) {}
    wandCloseMenu();
  });
  b.addEventListener('pointerdown', function (ev) { ev.stopPropagation(); }, true);
  return b;
}

function wandCloseMenu() {
  var m = wandMenu(), b = wandBtn();
  if (!m || !b || !wandShown(m)) return;
  try { b.click(); } catch (e) {}
}

var AR6_AVATAR_ID = 'ar6-avatar';
var AR6_AVATAR_KEY = 'ar6-pet-v2';
var avatarCleanup = null;
var AR6_PET_CTRL = null;
var AR6_PET_DEFAULT = {
  show: false, size: 1, opacity: 1, motion: 'calm', voice: true, autoDock: true,
  paused: false, x: null, y: null, side: 'right', docked: false,
  sfx: false, sfxPreset: 'tiga1996'
};
var AR6_PET_STATE = null;

var AR6_PET_FORMS = {
  multi: {
    asset: 'multi',
    glow: 'radial-gradient(circle,rgba(56,189,248,.52) 0%,transparent 68%)',
    ring: 'rgba(56,189,248,.78)',
    tc: 'linear-gradient(90deg,transparent,#38bdf8,#ffffff,#38bdf8,transparent)',
    filter: 'drop-shadow(0 12px 18px rgba(0,0,0,.78))',
    line: '迪迦复合型 · 均衡光之守护已就绪。'
  },
  strong: {
    asset: 'multi',
    glow: 'radial-gradient(circle,rgba(244,63,94,.68) 0%,rgba(251,146,60,.28) 45%,transparent 72%)',
    ring: 'rgba(251,113,133,.86)',
    tc: 'linear-gradient(90deg,transparent,#f43f5e,#fde047,#f43f5e,transparent)',
    filter: 'drop-shadow(0 0 14px rgba(244,63,94,.62)) drop-shadow(0 12px 18px rgba(0,0,0,.82)) saturate(1.24)',
    line: '赤红刚力解放！迪拉休姆光流就绪。'
  },
  supreme: {
    asset: 'glitter',
    glow: 'radial-gradient(circle,rgba(252,211,77,.74) 0%,rgba(217,119,6,.26) 48%,transparent 72%)',
    ring: 'rgba(252,211,77,.9)',
    tc: 'linear-gradient(90deg,transparent,#f59e0b,#ffffff,#fde68a,transparent)',
    filter: 'drop-shadow(0 0 16px rgba(252,211,77,.65)) drop-shadow(0 12px 18px rgba(0,0,0,.82))',
    line: '万千希望之光汇聚 · 闪耀迪迦加冕！'
  },
  noa: {
    asset: 'glitter',
    glow: 'radial-gradient(circle,rgba(255,255,255,.75) 0%,rgba(125,211,252,.45) 40%,rgba(196,181,253,.25) 60%,transparent 75%)',
    ring: 'rgba(226,232,240,.94)',
    tc: 'linear-gradient(90deg,transparent,#7dd3fc,#ffffff,#fde68a,#c4b5fd,transparent)',
    filter: 'drop-shadow(0 0 18px rgba(186,230,253,.85)) brightness(1.12) saturate(.56) contrast(1.06)',
    line: '宇宙第一道光归位 · 太古圣翼展开！'
  },
  abyss: {
    asset: 'abyss',
    glow: 'radial-gradient(circle,rgba(225,29,72,.68) 0%,rgba(136,19,55,.32) 48%,transparent 72%)',
    ring: 'rgba(255,46,85,.9)',
    tc: 'linear-gradient(90deg,transparent,#9f1239,#ff2e55,#fda4af,transparent)',
    filter: 'drop-shadow(0 0 16px rgba(255,46,85,.68)) drop-shadow(0 14px 20px rgba(0,0,0,.94))',
    line: '弃光入暗 · 终焉暗域全量沉渊接管。'
  }
};

function petCurrentForm() {
  try {
    if (cfg && !cfg.enabled) return 'multi';
    var j = String((cfg && cfg.jail) || 'off');
    if (j === 'gatanothor' || j === 'noa') return 'noa';
    if (j === 'abyss') return 'abyss';
    if (j === 'supreme') return 'supreme';
    if (j === 'strong') return 'strong';
  } catch (e) {}
  return 'multi';
}

function petClamp(v, def, lo, hi) {
  var n = Number(v);
  return Number.isFinite(n) ? Math.max(lo, Math.min(hi, n)) : def;
}
function petRead() {
  var d = {};
  for (var k in AR6_PET_DEFAULT) d[k] = AR6_PET_DEFAULT[k];
  try {
    var s = JSON.parse((ar6LsGet(AR6_AVATAR_KEY) || ar6LsGet('ar6-pet-v1')) || 'null');
    if (s && typeof s === 'object') {
      for (var k2 in d) if (s[k2] !== undefined) d[k2] = s[k2];
    }
  } catch (e) {}
  d.size = petClamp(d.size, 1, 0.7, 1.5);
  d.opacity = petClamp(d.opacity, 1, 0.35, 1);
  d.motion = (d.motion === 'calm' || d.motion === 'off') ? d.motion : 'full';
  d.show = !!d.show;
  d.voice = d.voice !== false;
  d.autoDock = d.autoDock !== false;
  d.paused = !!d.paused;
  d.side = d.side === 'left' ? 'left' : 'right';
  d.docked = !!d.docked;
  d.sfx = d.sfx === true;
  d.sfxPreset = (d.sfxPreset === 'glitter' || d.sfxPreset === 'dark' || d.sfxPreset === 'crisp') ? d.sfxPreset : 'tiga1996';
  return d;
}
function petSave() {
  try { if (AR6_PET_STATE) ar6LsSet(AR6_AVATAR_KEY, JSON.stringify(AR6_PET_STATE)); } catch (e) {}
}

function petIsExpanded() {
  var p = AR6_PET_STATE || petRead();
  AR6_PET_STATE = p;
  return !!(p.show && !p.docked);
}
function petIsDocked() {
  var p = AR6_PET_STATE || petRead();
  AR6_PET_STATE = p;
  return !!(p.show && p.docked);
}
function petViewport(w, d) {
  var vw = 0, vh = 0;
  try {
    vw = (w && w.visualViewport && w.visualViewport.width) || (w && w.innerWidth) || (d && d.documentElement && d.documentElement.clientWidth) || (HOST && HOST.innerWidth) || 360;
    vh = (w && w.visualViewport && w.visualViewport.height) || (w && w.innerHeight) || (d && d.documentElement && d.documentElement.clientHeight) || (HOST && HOST.innerHeight) || 720;
  } catch (eV) {}
  return { w: Math.max(240, Math.round(vw || 360)), h: Math.max(320, Math.round(vh || 720)) };
}
function petSummonFromPill() {
  var p = AR6_PET_STATE || petRead();
  var d = wandDoc();
  var w = (d && d.defaultView) || HOST;
  var vp = petViewport(w, d);
  var vw = vp.w, vh = vp.h;
  var ww = 128 * p.size, hh = 212 * p.size;
  var side = (cfg && cfg.pillSide === 'left') ? 'left' : 'right';
  var ry = ar6Num(cfg && cfg.pillY, 0.62, 0.08, 0.88);
  p.show = true;
  p.docked = false;
  p.side = side;
  p.x = (side === 'left') ? 10 : Math.max(6, vw - ww - 10);
  p.y = Math.max(8, Math.min(Math.max(8, vh - hh - 8), Math.round(vh * ry - hh * 0.45)));
  AR6_PET_STATE = p;
  petSave();
  try { avatarUnmount(); } catch (e0) {}
  try { avatarMount(); } catch (e1) {}
  try { if (AR6_PET_CTRL && AR6_PET_CTRL.setVisualState) AR6_PET_CTRL.setVisualState('edge-materialize'); } catch (eM) {}
  try { if (typeof syncPill === 'function') syncPill(); } catch (e2) {}
  var skP = (typeof skinId === 'function') ? skinId() : 'ultra';
  var pCfgP = (skP !== 'ultra' && typeof lkSkinPetConf === 'function') ? lkSkinPetConf(skP) : null;
  try {
    banner(pCfgP
      ? ('✦ ' + pCfgP.petName + ' 已展开守护（拖回边缘可收归圆章，面板内可随时重温' + pCfgP.summonName + '）')
      : '✦ 3D 迪迦已化光展开（拖回边缘再次合入圆章，面板内可随时重温神光棒变身）', 'ok');
  } catch (e3) {}
}

function petSettingsHTML() {
  var p = AR6_PET_STATE || petRead();
  var skNow = (typeof skinId === 'function') ? skinId() : 'ultra';
  var pConf = (skNow !== 'ultra' && typeof lkSkinPetConf === 'function') ? lkSkinPetConf(skNow) : null;
  var petTitle = pConf ? (pConf.petName + ' 桌宠') : '3D 迪迦 · 光之伙伴桌宠';
  var petHead = pConf ? (pConf.petName + ' &amp; ' + esc(pConf.summonName)) : '3D 迪迦 · 光之伙伴桌宠 &amp; 神光棒召唤';
  var sumLabel = pConf ? ('✦ ' + pConf.summonName + ' · 召唤/复位') : '✦ 神光棒变身 · 召唤/复位';
  var petMotionDesc = pConf
    ? (pConf.petName + ' 随当前皮肤与破甲形态自动切换专属 3D 造型与光环，双击立绘开主面板。')
    : '3D 迪迦随破甲形态自动变身（诺亚展动态圣翼 / 深渊黑曜化红），雷达抓到调包时胸口计时器红灯急闪；双击立绘开主面板。';
  var petIdleTip = pConf
    ? ('召唤时播放当前皮肤专属「' + esc(pConf.summonName) + '」演出并唤醒 3D 雕像立绘至边缘守护；切换皮肤即时换宠，全屏最多保留一个悬浮物。')
    : '召唤时在屏幕中央升起可点击 3D 神光棒，变身登场后化光飞掠至边缘守护；全屏始终最多保留一个悬浮物。';
  var petSt = p.show ? (p.docked ? '已合入圆章' : '守护中') : '待机';
  var h = '<div class="ar6-mmore-h">' + petHead + '</div>';
  h += '<div class="ar6-tgrid">' +
    '<button type="button" class="ar6-b span-2' + (p.show ? ' gold on' : '') + '" data-ar6="pet-show"><span class="ar6-b-lbl">' + esc(petTitle) + '</span><em class="ar6-b-st">' + petSt + '</em></button>' +
    '<button type="button" class="ar6-b' + (p.voice ? ' on' : '') + '" data-ar6="pet-voice"><span class="ar6-b-lbl">互动台词气泡</span><em class="ar6-b-st">' + (p.voice ? '已开启' : '待机') + '</em></button>' +
    '<button type="button" class="ar6-b' + (p.autoDock ? ' on' : '') + '" data-ar6="pet-auto"><span class="ar6-b-lbl">靠边自动合入圆章</span><em class="ar6-b-st">' + (p.autoDock ? '已开启' : '待机') + '</em></button>' +
    actBtn('pet-reset', 'refresh', sumLabel, 'gold on span-2') +
    '</div>';
  if (p.show) {
    h += '<div class="ar6-tgrid" style="margin-top:6px">' +
      '<button type="button" class="ar6-b' + (p.sfx ? ' on' : '') + '" data-ar6="pet-sfx"><span class="ar6-b-lbl">变身音效 · 纯合成</span><em class="ar6-b-st">' + (p.sfx ? '已开启' : '静音') + '</em></button>' +
      actBtn('pet-sfx-alert', 'bell', '试听红灯警报') +
      '</div>';
    var curP = p.sfxPreset || 'tiga1996';
    var sfxItems = [['1996原味', 'tiga1996'], ['闪耀圣域', 'glitter'], ['黑暗深渊', 'dark'], ['利落短音', 'crisp']];
    h += '<div class="ar6-ugroup" style="margin-top:6px"><div class="ar6-ug-top"><span class="ar6-ug-title">变身声学方案（点击试听并选中）</span><span class="ar6-badge cyan">0KB 无版权</span></div><div class="ar6-ubar">';
    for (var si = 0; si < sfxItems.length; si++) {
      var onS = (curP === sfxItems[si][1]);
      h += '<button type="button" class="ar6-ubtn' + (onS ? ' on' : '') + '" data-ar6="pet-sfx-' + sfxItems[si][1] + '">' + esc(sfxItems[si][0]) + '</button>';
    }
    h += '</div></div>';

    h += segBarHTML('桌宠动效', petMotionDesc, [
      ['全效律动', 'full'],
      ['柔和呼吸', 'calm'],
      ['完全静止', 'off']
    ], String(p.motion || 'calm'), 'gm:motion', '');
    h += segBarHTML('桌宠不透明度', '', [['70% 半透', 0.7], ['90% 适中', 0.9], ['100% 实心', 1]], p.opacity, 'gm:opacity', '');
    h += segBarHTML('桌宠显示比例', '', [['80% 小巧', 0.8], ['100% 标准', 1], ['115% 偏大', 1.15], ['150% 特大', 1.5]], p.size, 'gm:size', '');
  } else {
    h += '<div class="ar6-dline">' + petIdleTip + '</div>';
  }
  return h;
}

function petAction(act) {
  var p = AR6_PET_STATE || petRead();
  var launchSummon = false;
  if (act === 'pet-show') {
    if (p.show) { p.show = false; p.docked = false; }
    else { p.show = true; p.docked = false; launchSummon = true; }
  } else if (act === 'pet-voice') p.voice = !p.voice;
  else if (act === 'pet-auto') p.autoDock = !p.autoDock;
  else if (act === 'pet-motion') p.motion = p.motion === 'full' ? 'calm' : (p.motion === 'calm' ? 'off' : 'full');
  else if (act === 'pet-opacity') p.opacity = p.opacity >= 0.99 ? 0.7 : (p.opacity < 0.8 ? 0.9 : 1);
  else if (act === 'pet-size') p.size = p.size < 0.9 ? 1 : (p.size < 1.1 ? 1.15 : (p.size < 1.3 ? 1.5 : 0.8));
  else if (act === 'pet-pause') p.paused = !p.paused;
  else if (act === 'pet-reset') { p.x = null; p.y = null; p.docked = false; p.show = true; launchSummon = true; }
  else if (act === 'pet-sfx') {
    p.sfx = !p.sfx;
    AR6_PET_STATE = p;
    petSave();
    if (p.sfx && typeof ar6SfxPlay === 'function') ar6SfxPlay(p.sfxPreset || 'tiga1996', true);
    try { banner(p.sfx ? '🔊 特摄合成音效已开启（纯代码 0KB）' : '🔇 特摄合成音效已静音', p.sfx ? 'ok' : 'gray'); } catch (eB0) {}
    return;
  } else if (act === 'pet-sfx-alert') {
    if (typeof ar6SfxPlay === 'function') ar6SfxPlay('timerAlert', true);
    try { banner('🚨 试听：彩色计时器单音晶体红灯警报', 'warn'); } catch (eB1) {}
    return;
  } else if (act.indexOf('pet-sfx-') === 0) {
    var pk = act.slice(8);
    if (pk === 'tiga1996' || pk === 'glitter' || pk === 'dark' || pk === 'crisp') {
      p.sfxPreset = pk;
      p.sfx = true;
      AR6_PET_STATE = p;
      petSave();
      if (typeof ar6SfxPlay === 'function') ar6SfxPlay(pk, true);
      return;
    }
  }
  AR6_PET_STATE = p;
  petSave();
  if (!p.show && cfg && cfg.pillHide && typeof hasAltEntry === 'function' && !hasAltEntry()) {
    cfg.pillHide = false;
    try { if (typeof saveCfg === 'function') saveCfg(); } catch (ePH) {}
    try { banner('已关闭桌宠并自动恢复侧边计时器圆章，防止失去唤起入口', 'ok'); } catch (ePB) {}
  }
  if (typeof avatarMount === 'function') {
    try { avatarUnmount(); } catch (e) {}
    try { avatarMount(); } catch (eM) {
      try { banner('桌宠设置已保存，但挂载异常：' + String(eM && eM.message || eM), 'warn', true); } catch (e2) {}
    }
  }
  try { if (typeof syncPill === 'function') syncPill(); } catch (eP) {}
  if (launchSummon && p.show && !p.docked && typeof triggerSparklenceSummon === 'function') {
    try { triggerSparklenceSummon({ minimizeOnFire: act === 'pet-reset' }); } catch (eSp) {}
  }
}

var AR6_PET_CSS = [
  ':host{display:block;font:12px/1.4 system-ui,sans-serif;color:#fff0cc}',
  ':host::before,:host::after{display:none!important}',
  '*{box-sizing:border-box}',
  'button{font:inherit;color:inherit;cursor:pointer}',
  '.pet{position:relative;width:100%;height:100%;perspective:650px}',
  '.face{pointer-events:auto;touch-action:none;position:relative;display:flex;align-items:center;justify-content:center;width:100%;height:100%;padding:24px 4px 12px;border:0;background:transparent;animation:ar6float 3.4s ease-in-out infinite;-webkit-tap-highlight-color:transparent}',
  '.back-glow{position:absolute;inset:18% 8% 12%;border-radius:9999px;filter:blur(16px);opacity:.55;pointer-events:none;transition:background .45s ease}',
  '.holo-r1{position:absolute;width:82%;aspect-ratio:1/1;bottom:-20%;left:9%;border-radius:9999px;border:2px solid rgba(56,189,248,.76);box-shadow:0 0 16px rgba(56,189,248,.45),inset 0 0 12px rgba(56,189,248,.28);animation:ar6ring 7s linear infinite;pointer-events:none}',
  '.holo-r2{position:absolute;width:58%;aspect-ratio:1/1;bottom:-10%;left:21%;border-radius:9999px;border:1.5px dashed rgba(186,230,253,.62);animation:ar6ringRev 5s linear infinite;pointer-events:none}',
  ':host([data-live="1"]) .holo-r1{animation-duration:2.1s!important}',
  ':host([data-live="1"]) .holo-r2{animation-duration:1.5s!important}',
  '.noa-wings{position:absolute;inset:0;pointer-events:none;opacity:0;transform:scale(.5);transition:opacity .55s ease,transform .65s cubic-bezier(.16,1,.3,1);z-index:1}',
  ':host([data-form="noa"]) .noa-wings{opacity:1;transform:scale(1)}',
  '.nw-l{position:absolute;right:52%;top:8%;width:84%;height:70%;transform-origin:92% 52%;animation:ar6nwL 2.8s ease-in-out infinite}',
  '.nw-r{position:absolute;left:52%;top:8%;width:84%;height:70%;transform-origin:8% 52%;animation:ar6nwR 2.8s ease-in-out infinite}',
  '.abyss-rift{position:absolute;left:-14%;right:-14%;top:10%;aspect-ratio:1/1;pointer-events:none;opacity:0;transition:opacity .45s ease;animation:ar6abPulse 3.6s ease-in-out infinite;z-index:1}',
  ':host([data-form="abyss"]) .abyss-rift{opacity:1}',
  '.portrait{position:relative;z-index:2;height:100%;display:flex;align-items:center;justify-content:center;transform-style:preserve-3d;transition:transform .16s ease}',
  '.sframe{position:relative;height:100%;display:flex;align-items:center;justify-content:center}',
  '.simg{display:block;width:100%;height:100%;object-fit:contain;pointer-events:none;transition:filter .32s ease}',
  ':host([data-skin]:not([data-skin="ultra"])) .noa-wings,:host([data-skin]:not([data-skin="ultra"])) .tgem,:host([data-skin]:not([data-skin="ultra"])) .thalo{display:none!important}',
  '.tgem,.thalo{position:absolute;pointer-events:none;opacity:0;transform:translate(-50%,-50%);mix-blend-mode:screen}',
  '.tgem{clip-path:polygon(50% 0%,100% 42%,50% 100%,0% 42%);background:radial-gradient(circle at 50% 45%,#fff5f5 0%,#ff2a55 48%,#e11d48 85%,transparent 100%)}',
  '.thalo{border-radius:9999px;background:radial-gradient(circle,rgba(255,42,85,.85) 0%,rgba(255,42,85,.25) 45%,transparent 72%)}',
  ':host([data-alert="1"]) .tgem,:host([data-alert="1"]) .thalo{animation:ar6redGem .68s ease-in-out infinite}',
  '.tc-ring{position:absolute;left:-24%;right:-24%;height:12px;border-radius:9999px;pointer-events:none;opacity:0;z-index:5}',
  '.tc-ring.down{animation:ar6tcDown .58s cubic-bezier(.22,1,.36,1) forwards}',
  '.tc-ring.up{animation:ar6tcUp .58s cubic-bezier(.22,1,.36,1) forwards}',
  '.speech{position:absolute;z-index:6;left:-28%;right:-28%;top:0;padding:3px 8px;border-radius:9999px;background:rgba(6,11,24,.82);border:1px solid rgba(56,189,248,.42);text-align:center;font-size:11px;font-weight:600;color:#fef3c7;text-shadow:0 1px 2px #000;pointer-events:none;opacity:0;transition:opacity .25s ease;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}',
  '.speech.on{opacity:1}',
  '@keyframes ar6float{0%,100%{transform:translateY(0)}50%{transform:translateY(-6px)}}',
  '@keyframes ar6happy{50%{transform:translateY(-8px) scale(1.03)}}',
  '@keyframes ar6ring{from{transform:rotateX(74deg) rotateZ(0)}to{transform:rotateX(74deg) rotateZ(360deg)}}',
  '@keyframes ar6ringRev{from{transform:rotateX(74deg) rotateZ(360deg)}to{transform:rotateX(74deg) rotateZ(0)}}',
  '@keyframes ar6nwL{0%,100%{transform:perspective(460px) rotateY(20deg) rotateZ(-4deg) scale(1);filter:drop-shadow(0 0 12px rgba(186,230,253,.9))}50%{transform:perspective(460px) rotateY(38deg) rotateZ(6deg) scale(1.06);filter:drop-shadow(0 0 22px rgba(253,230,138,.95))}}',
  '@keyframes ar6nwR{0%,100%{transform:perspective(460px) rotateY(-20deg) rotateZ(4deg) scale(1);filter:drop-shadow(0 0 12px rgba(186,230,253,.9))}50%{transform:perspective(460px) rotateY(-38deg) rotateZ(-6deg) scale(1.06);filter:drop-shadow(0 0 22px rgba(253,230,138,.95))}}',
  '@keyframes ar6abPulse{0%,100%{transform:scale(.95) rotate(0);opacity:.72}50%{transform:scale(1.08) rotate(180deg);opacity:1}}',
  '@keyframes ar6redGem{0%,100%{opacity:.15;transform:translate(-50%,-50%) scale(.9)}32%{opacity:1;transform:translate(-50%,-50%) scale(1.26)}62%{opacity:.22;transform:translate(-50%,-50%) scale(.95)}}',
  '@keyframes ar6tcDown{0%{top:-6%;opacity:0;transform:scaleX(.5)}18%{opacity:1;transform:scaleX(1.15)}85%{opacity:.95;transform:scaleX(1.05)}100%{top:104%;opacity:0;transform:scaleX(.6)}}',
  '@keyframes ar6tcUp{0%{top:104%;opacity:0;transform:scaleX(.5)}20%{opacity:1;transform:scaleX(1.18)}85%{opacity:.95;transform:scaleX(1.05)}100%{top:-8%;opacity:0;transform:scaleX(.6)}}',
  ':host([data-happy="true"]) .face{animation:ar6happy .45s ease-in-out infinite}',
  ':host([data-motion="calm"]) .face{animation-duration:5.2s}',
  ':host([data-hidden="true"]) .face,:host([data-motion="off"]) .face,:host([data-paused="true"]) .face,:host([data-motion="off"]) .nw-l,:host([data-motion="off"]) .nw-r,:host([data-motion="off"]) .holo-r1,:host([data-motion="off"]) .holo-r2{animation:none!important}',
  '@media(prefers-reduced-motion:reduce){.face,.nw-l,.nw-r,.holo-r1,.holo-r2,.abyss-rift{animation:none!important}.portrait{transition:none!important;transform:none!important}}'
].join('');

function avatarSyncForm(animate) {
  try {
    if (AR6_PET_CTRL && typeof AR6_PET_CTRL.syncForm === 'function') {
      AR6_PET_CTRL.syncForm(animate !== false);
    }
  } catch (e) {}
}

function avatarSetVisualState(mode) {
  try {
    if (AR6_PET_CTRL && typeof AR6_PET_CTRL.setVisualState === 'function') {
      AR6_PET_CTRL.setVisualState(mode);
    }
  } catch (e) {}
}

function avatarEdgeTarget() {
  try {
    if (AR6_PET_CTRL && typeof AR6_PET_CTRL.edgeTarget === 'function') {
      return AR6_PET_CTRL.edgeTarget();
    }
  } catch (e) {}
  return { x: 280, y: 420 };
}

function avatarSay(kind, customText) {
  try {
    if (AR6_PET_CTRL && typeof AR6_PET_CTRL.say === 'function') {
      AR6_PET_CTRL.say(kind, customText);
    }
  } catch (e) {}
}

function avatarMount() {
  var d = wandDoc();
  if (!d || !d.body || DISPOSED) return;
  AR6_PET_STATE = AR6_PET_STATE || petRead();
  var p = AR6_PET_STATE;
  var w = d.defaultView || HOST;
  if (!p.show || p.docked) {
    avatarUnmount();
    try { if (typeof syncPill === 'function') syncPill(); } catch (eSP0) {}
    return;
  }
  var old = d.getElementById(AR6_AVATAR_ID);
  if (old && avatarCleanup) {
    try { if (typeof syncPill === 'function') syncPill(); } catch (eSP1) {}
    try { avatarSyncForm(false); } catch (eSF0) {}
    return;
  }
  avatarUnmount();
  var b = d.createElement('div');
  b.id = AR6_AVATAR_ID;
  var sh = b.attachShadow({ mode: 'open' });
  sh.innerHTML = '<style>' + AR6_PET_CSS + '</style>' +
    '<section class="pet" aria-label="3D 迪迦光之伙伴">' +
      '<div class="speech" role="status" aria-live="polite"></div>' +
      '<button type="button" class="face" title="拖动可移位（靠边松手合入计时器圆章），双击打开主面板" aria-label="3D 迪迦光之伙伴：双击打开控制面板">' +
        '<span class="back-glow"></span>' +
        '<span class="noa-wings">' +
          '<svg class="nw-l" viewBox="0 0 180 220" fill="none"><defs><linearGradient id="ar6NwL" x1="170" y1="120" x2="10" y2="20" gradientUnits="userSpaceOnUse"><stop offset="0%" stop-color="#fff" stop-opacity=".96"/><stop offset="35%" stop-color="#bae6fd" stop-opacity=".88"/><stop offset="72%" stop-color="#fde68a" stop-opacity=".72"/><stop offset="100%" stop-color="#c4b5fd" stop-opacity=".2"/></linearGradient></defs><path d="M166 112 L24 16 L66 78 L12 68 L74 114 L26 126 L94 148 L52 168 L138 152 Z" fill="url(#ar6NwL)" stroke="#fff" stroke-width="1.5"/><path d="M164 116 L54 44 L88 94 L46 96 L104 128 Z" fill="#fff" opacity=".56"/></svg>' +
          '<svg class="nw-r" viewBox="0 0 180 220" fill="none"><defs><linearGradient id="ar6NwR" x1="10" y1="120" x2="170" y2="20" gradientUnits="userSpaceOnUse"><stop offset="0%" stop-color="#fff" stop-opacity=".96"/><stop offset="35%" stop-color="#bae6fd" stop-opacity=".88"/><stop offset="72%" stop-color="#fde68a" stop-opacity=".72"/><stop offset="100%" stop-color="#c4b5fd" stop-opacity=".2"/></linearGradient></defs><path d="M14 112 L156 16 L114 78 L168 68 L106 114 L154 126 L86 148 L128 168 L42 152 Z" fill="url(#ar6NwR)" stroke="#fff" stroke-width="1.5"/><path d="M16 116 L126 44 L92 94 L134 96 L76 128 Z" fill="#fff" opacity=".56"/></svg>' +
        '</span>' +
        '<span class="abyss-rift"><svg viewBox="0 0 240 240" width="100%" height="100%" fill="none"><circle cx="120" cy="120" r="96" stroke="#ff2e55" stroke-width="2" stroke-dasharray="18 10 6 12" opacity=".88"/><circle cx="120" cy="120" r="78" stroke="#9f1239" stroke-width="1.5" stroke-dasharray="6 8" opacity=".75"/><path d="M22 65 L68 95 L52 108 L85 130 M218 175 L172 145 L188 132 L155 110" stroke="#ff2e55" stroke-width="2.2" stroke-linecap="round"/></svg></span>' +
        '<span class="holo-r1"></span><span class="holo-r2"></span>' +
        '<span class="portrait"><span class="sframe"><img class="simg" alt=""><span class="thalo"></span><span class="tgem"></span><span class="tc-ring"></span></span></span>' +
      '</button>' +
    '</section>';

  var face = sh.querySelector('.face');
  var portrait = sh.querySelector('.portrait');
  var sframe = sh.querySelector('.sframe');
  var simg = sh.querySelector('.simg');
  var backGlow = sh.querySelector('.back-glow');
  var holoR1 = sh.querySelector('.holo-r1');
  var tgem = sh.querySelector('.tgem');
  var thalo = sh.querySelector('.thalo');
  var tcRing = sh.querySelector('.tc-ring');
  var speech = sh.querySelector('.speech');

  var ww = Math.round(128 * p.size), hh = Math.round(212 * p.size);
  var imgBoxH = Math.max(80, hh - 36);
  var initVp = petViewport(w, d);
  var state = {
    x: Number.isFinite(p.x) ? p.x : Math.max(8, initVp.w - ww - 14),
    y: Number.isFinite(p.y) ? p.y : Math.max(40, initVp.h - hh - 28),
    side: p.side,
    paused: p.paused,
    form: petCurrentForm(),
    skin: (typeof skinId === 'function') ? skinId() : 'ultra',
    alert: false,
    visualMode: 'landed'
  };
  var drag = null, down = null, timers = [], last = 0, recent = [];
  var lastTapAt = 0;
  var visSeq = 0;
  var syncSeq = 0;

  function later(fn, ms) {
    var id = w.setTimeout(function () {
      timers = timers.filter(function (x) { return x !== id; });
      fn();
    }, ms);
    timers.push(id);
  }

  function resolvePetProfile(formKey, skKey) {
    var sk = skKey || ((typeof skinId === 'function') ? skinId() : 'ultra');
    if (sk !== 'ultra' && typeof lkSkinPetConf === 'function') {
      var pc = lkSkinPetConf(sk);
      if (pc && pc.forms) {
        var pf = pc.forms[formKey] || pc.forms.multi;
        var aObjSk = (typeof AR6_SKIN_PET_ASSETS !== 'undefined' && AR6_SKIN_PET_ASSETS[pf.asset]) ? AR6_SKIN_PET_ASSETS[pf.asset] : null;
        if (pf && aObjSk) return { sk: sk, prof: pf, aKey: pf.asset, aObj: aObjSk, pConf: pc };
      }
    }
    var profU = AR6_PET_FORMS[formKey] || AR6_PET_FORMS.multi;
    var aKeyU = profU.asset || 'multi';
    var aObjU = (typeof AR6_PET_ASSETS !== 'undefined' && AR6_PET_ASSETS[aKeyU]) ? AR6_PET_ASSETS[aKeyU] : null;
    return { sk: 'ultra', prof: profU, aKey: aKeyU, aObj: aObjU, pConf: null };
  }

  function applySpriteAsset(formKey, skKey) {
    var res = resolvePetProfile(formKey, skKey);
    var prof = res.prof, aKey = res.aKey, aObj = res.aObj, effSk = res.sk;
    var ratio = (aObj && aObj.w && aObj.h) ? (aObj.w / aObj.h) : 0.4023;
    var rawFw = Math.round(imgBoxH * ratio);
    var maxWCap = ratio > 1.2 ? Math.round(ww * 1.28) : Math.round(ww * 1.18);
    var fw = (effSk === 'ultra') ? rawFw : Math.max(76, Math.min(maxWCap, rawFw));
    if (sframe) sframe.style.width = fw + 'px';
    if (effSk === 'ultra' && aObj && aObj.timer && tgem && thalo) {
      tgem.style.left = aObj.timer.x + '%';
      tgem.style.top = aObj.timer.y + '%';
      tgem.style.width = aObj.timer.w + '%';
      tgem.style.height = aObj.timer.h + '%';
      thalo.style.left = aObj.timer.x + '%';
      thalo.style.top = aObj.timer.y + '%';
      thalo.style.width = (aObj.timer.w * 3.1) + '%';
      thalo.style.height = (aObj.timer.h * 2.5) + '%';
    }
    if (simg && aObj) {
      if (aObj.alphaReady) {
        simg.src = aObj.raw;
      } else {
        simg.src = (typeof AR6_PET_ALPHA_CACHE !== 'undefined' && AR6_PET_ALPHA_CACHE[aKey]) ? AR6_PET_ALPHA_CACHE[aKey] : aObj.raw;
        if (typeof ar6MatteSprite === 'function') {
          ar6MatteSprite(aKey, function (u) {
            try {
              var curRes = resolvePetProfile(state.form, state.skin);
              if (simg && u && curRes.aKey === aKey) simg.src = u;
            } catch (eM) {}
          });
        }
      }
      simg.style.filter = prof.filter;
    }
    if (backGlow) backGlow.style.background = prof.glow;
    if (holoR1) {
      holoR1.style.borderColor = prof.ring;
      holoR1.style.boxShadow = '0 0 16px ' + prof.ring + ',inset 0 0 12px ' + prof.ring;
    }
    b.setAttribute('data-form', formKey);
    b.setAttribute('data-skin', effSk);
    if (face && res.pConf) {
      face.setAttribute('aria-label', res.pConf.petName + '：双击打开控制面板');
      face.setAttribute('title', '拖动可移位（靠边松手合入侧边圆章），双击打开主面板');
    } else if (face) {
      face.setAttribute('aria-label', '3D 迪迦光之伙伴：双击打开控制面板');
      face.setAttribute('title', '拖动可移位（靠边松手合入计时器圆章），双击打开主面板');
    }
  }

  function layout() {
    var vp = petViewport(w, d);
    var vw = vp.w, vh = vp.h;
    state.x = Math.max(0, Math.min(Math.max(0, vw - ww), state.x));
    state.y = Math.max(0, Math.min(Math.max(0, vh - hh), state.y));
    var sparkOn = !!(typeof AR6_SPARK_RUN !== 'undefined' && AR6_SPARK_RUN && AR6_SPARK_RUN.active);
    if (!sparkOn && state.visualMode !== 'landed' && state.visualMode !== 'edge-materialize') {
      state.visualMode = 'landed';
    }
    if (state.visualMode !== 'landed') return;
    b.style.cssText = 'position:fixed!important;left:' + Math.round(state.x) + 'px!important;top:' + Math.round(state.y) + 'px!important;width:' + ww + 'px!important;height:' + hh + 'px!important;border:0!important;border-radius:0!important;background:none!important;box-shadow:none!important;padding:0!important;right:auto!important;bottom:auto!important;z-index:2147482999!important;pointer-events:none;touch-action:none;user-select:none;opacity:' + p.opacity + ';visibility:visible;transform:none;transition:none;';
    b.setAttribute('data-paused', String(p.paused));
    b.setAttribute('data-motion', p.motion);
    b.setAttribute('data-opacity', String(p.opacity));
    b.setAttribute('data-scale', String(p.size));
  }

  function say(kind, customText) {
    if (!p.voice || p.docked || p.paused) return;
    var txt = customText ? String(customText) : '';
    if (!txt) {
      var curRes = resolvePetProfile(state.form, state.skin);
      if (curRes.pConf) {
        if (kind === 'summon' || kind === 'open' || kind === 'form') {
          txt = (curRes.prof && curRes.prof.line) || curRes.pConf.summonLine;
        } else {
          var skPool = (state.form === 'abyss' && curRes.pConf.abyssPokes)
            ? curRes.pConf.abyssPokes
            : ((state.form === 'noa' && curRes.pConf.noaPokes) ? curRes.pConf.noaPokes : curRes.pConf.pokes);
          var fPool = (skPool || []).filter(function (t) { return recent.indexOf(t) < 0; });
          if (!fPool.length) fPool = skPool || ['守护在线。'];
          txt = fPool[Math.floor(Math.random() * fPool.length)];
        }
      } else {
        var lines = {
          tap: ['收到你的光了。', '光芒稳定，放心吧。', '今天也一起守护。'],
          rub: ['这束光很温柔。', '能量补满，随时出击。', '有你在，很安心。'],
          drag: ['抵达新阵位，光线稳定。', '这里视野不错。'],
          open: ['光，已回应你的呼唤。', '光之伙伴，重新连接。']
        };
        var a = lines[kind] || lines.tap;
        var pool = a.filter(function (t) { return recent.indexOf(t) < 0; });
        if (!pool.length) pool = a;
        txt = pool[Math.floor(Math.random() * pool.length)];
      }
    }
    if (!customText && Date.now() - last < 450) return;
    last = Date.now();
    recent.push(txt);
    if (recent.length > 6) recent.shift();
    speech.textContent = txt;
    speech.classList.add('on');
    b.setAttribute('data-happy', 'true');
    later(function () { b.removeAttribute('data-happy'); speech.classList.remove('on'); }, customText ? 2600 : 1800);
  }

  function syncForm(animate) {
    var sparkOn = !!(typeof AR6_SPARK_RUN !== 'undefined' && AR6_SPARK_RUN && AR6_SPARK_RUN.active);
    if (!sparkOn && state.visualMode !== 'landed' && state.visualMode !== 'edge-materialize') {
      setVisualState('landed');
    }
    var nextForm = petCurrentForm();
    var nextSkin = (typeof skinId === 'function') ? skinId() : 'ultra';
    var alertNow = !!(cfg && cfg.enabled && typeof pillHasAlert === 'function' && pillHasAlert());
    var liveNow = !!(typeof LIVE !== 'undefined' && LIVE && LIVE.on);
    b.setAttribute('data-live', liveNow ? '1' : '0');
    b.setAttribute('data-alert', alertNow ? '1' : '0');

    if (alertNow && !state.alert) {
      state.alert = true;
      say('alert', '⚠ 检测到渠道模型异动！双击查看报告');
      if (typeof ar6SfxPlay === 'function') ar6SfxPlay('timerAlert', false);
    } else if (!alertNow && state.alert) {
      state.alert = false;
    }

    if (nextForm !== state.form || nextSkin !== state.skin) {
      state.form = nextForm;
      state.skin = nextSkin;
      var mySync = ++syncSeq;
      var nextRes = resolvePetProfile(nextForm, nextSkin);
      var prof = nextRes.prof;
      var isAbyss = (nextForm === 'abyss');
      if (animate && state.visualMode === 'landed' && p.motion !== 'off' && !(cfg && cfg.rm)) {
        if (typeof ar6SfxPlay === 'function') ar6SfxPlay(isAbyss ? 'typeDark' : 'typeChange', false);
        if (tcRing) {
          tcRing.className = 'tc-ring';
          tcRing.style.background = prof.tc;
          tcRing.style.boxShadow = '0 0 22px ' + prof.ring + ',0 0 36px #fff';
          try { void tcRing.offsetWidth; } catch (eOw) {}
          tcRing.className = 'tc-ring ' + (isAbyss ? 'up' : 'down');
        }
        if (simg) {
          simg.style.filter = isAbyss
            ? 'brightness(.35) contrast(2) drop-shadow(0 0 24px #ff2e55)'
            : 'brightness(3.2) contrast(1.1) drop-shadow(0 0 28px #fff)';
        }
        if (typeof ar6PlayTypeChangeFx === 'function') {
          ar6PlayTypeChangeFx(state.x + ww / 2, state.y + hh * 0.54, nextForm);
        }
        later(function () {
          if (mySync !== syncSeq) return;
          var liveRes = resolvePetProfile(state.form, state.skin);
          applySpriteAsset(state.form, state.skin);
          say('form', (liveRes && liveRes.prof && liveRes.prof.line) || prof.line);
        }, 190);
      } else {
        applySpriteAsset(state.form, state.skin);
      }
    }
  }

  function setVisualState(mode) {
    var mySeq = ++visSeq;
    state.visualMode = mode || 'landed';
    var vp = petViewport(w, d);
    var vw = vp.w, vh = vp.h;
    var prof = resolvePetProfile(state.form, state.skin).prof;
    if (mode === 'hidden-for-summon') {
      b.style.cssText = 'position:fixed!important;left:50%!important;top:50%!important;width:' + ww + 'px!important;height:' + hh + 'px!important;transform:translate(-50%,-50%) scale(.6)!important;opacity:0!important;visibility:hidden!important;pointer-events:none!important;z-index:2147483642!important;';
      return;
    }
    if (mode === 'center-rise') {
      b.style.cssText = 'position:fixed!important;left:50%!important;top:64%!important;width:' + ww + 'px!important;height:' + hh + 'px!important;transform:translate(-50%,-50%) scale(.82)!important;opacity:0!important;visibility:visible!important;pointer-events:none!important;z-index:2147483642!important;transition:none!important;';
      if (simg) simg.style.filter = 'brightness(5.2) contrast(1.3) drop-shadow(0 0 32px #fff)';
      try { void b.offsetWidth; } catch (eO1) {}
      b.style.cssText = 'position:fixed!important;left:50%!important;top:50%!important;width:' + ww + 'px!important;height:' + hh + 'px!important;transform:translate(-50%,-50%) scale(1.26)!important;opacity:1!important;visibility:visible!important;pointer-events:none!important;z-index:2147483642!important;transition:top .54s cubic-bezier(.16,1,.3,1),transform .54s cubic-bezier(.16,1,.3,1),opacity .24s ease!important;';
      if (tcRing) {
        tcRing.className = 'tc-ring';
        tcRing.style.background = 'linear-gradient(90deg,transparent,#7dd3fc,#fff,#fde68a,transparent)';
        tcRing.style.boxShadow = '0 0 26px #fff';
        try { void tcRing.offsetWidth; } catch (eO2) {}
        tcRing.className = 'tc-ring up';
      }
      later(function () {
        if (mySeq !== visSeq) return;
        var resC = resolvePetProfile(state.form, state.skin);
        if (simg) simg.style.filter = (resC && resC.prof && resC.prof.filter) || prof.filter;
        say('open', (resC && resC.pConf) ? ((resC.prof && resC.prof.line) || resC.pConf.summonLine) : '光，已回应你的呼唤。');
      }, 220);
      return;
    }
    if (mode === 'dissolve-to-orb') {
      if (simg) simg.style.filter = 'brightness(5) drop-shadow(0 0 32px #fff)';
      b.style.cssText = 'position:fixed!important;left:50%!important;top:50%!important;width:' + ww + 'px!important;height:' + hh + 'px!important;transform:translate(-50%,-50%) scale(.16)!important;opacity:0!important;visibility:visible!important;pointer-events:none!important;z-index:2147483642!important;transition:transform .22s ease-in,opacity .2s ease-in!important;';
      return;
    }
    if (mode === 'edge-materialize') {
      state.x = Math.max(0, Math.min(Math.max(0, vw - ww), state.x));
      state.y = Math.max(0, Math.min(Math.max(0, vh - hh), state.y));
      b.style.cssText = 'position:fixed!important;left:' + Math.round(state.x) + 'px!important;top:' + Math.round(state.y) + 'px!important;width:' + ww + 'px!important;height:' + hh + 'px!important;transform:scale(.45)!important;opacity:0!important;visibility:visible!important;pointer-events:none!important;z-index:2147483642!important;transition:none!important;';
      if (simg) simg.style.filter = 'brightness(4.5) drop-shadow(0 0 26px #fff)';
      try { void b.offsetWidth; } catch (eO3) {}
      b.style.cssText = 'position:fixed!important;left:' + Math.round(state.x) + 'px!important;top:' + Math.round(state.y) + 'px!important;width:' + ww + 'px!important;height:' + hh + 'px!important;transform:scale(1)!important;opacity:' + p.opacity + '!important;visibility:visible!important;pointer-events:none!important;z-index:2147483642!important;transition:transform .36s cubic-bezier(.16,1,.3,1),opacity .22s ease!important;';
      later(function () {
        if (mySeq !== visSeq) return;
        var resE = resolvePetProfile(state.form, state.skin);
        if (simg) simg.style.filter = (resE && resE.prof && resE.prof.filter) || prof.filter;
        say('open', (resE && resE.pConf) ? ((resE.prof && resE.prof.line) || resE.pConf.summonLine) : '抵达边缘阵位 · 光之守护已就绪！');
      }, 220);
      later(function () {
        if (mySeq !== visSeq) return;
        state.visualMode = 'landed';
        layout();
      }, 460);
      return;
    }
    state.visualMode = 'landed';
    layout();
    if (simg) simg.style.filter = prof.filter;
  }

  function edgeTarget() {
    var vp = petViewport(w, d);
    var vw = vp.w, vh = vp.h;
    var tx = Math.max(0, Math.min(Math.max(0, vw - ww), state.x));
    var ty = Math.max(0, Math.min(Math.max(0, vh - hh), state.y));
    return { x: tx + ww / 2, y: ty + hh / 2 };
  }

  function dockToPill() {
    var vp = petViewport(w, d);
    var vw = vp.w, vh = vp.h;
    state.side = (state.x + ww / 2 < vw / 2) ? 'left' : 'right';
    p.docked = true;
    p.side = state.side;
    p.x = state.x;
    p.y = state.y;
    petSave();
    if (cfg) {
      cfg.pillSide = state.side;
      cfg.pillY = ar6Num((state.y + hh * 0.45) / Math.max(1, vh), 0.62, 0.08, 0.88);
      cfg.pillHide = false;
      try { saveCfg(); } catch (eS) {}
    }
    avatarUnmount();
    try { if (typeof syncPill === 'function') syncPill(); } catch (eSP) {}
    try { UI_SIG = {}; if (!minimized) render(); } catch (eR) {}
  }
  function start(e) {
    if (e.button != null && e.button !== 0) return;
    e.preventDefault();
    drag = null;
    down = { id: e.pointerId, x: e.clientX, y: e.clientY, ox: state.x, oy: state.y, t: Date.now() };
    say('tap');
  }
  function move(e) {
    if (!down || down.id !== e.pointerId) return;
    var dx = e.clientX - down.x, dy = e.clientY - down.y;
    if (Math.hypot(dx, dy) > 12 || drag) {
      if (!drag) {
        drag = true;
        try { if (face.setPointerCapture && e.pointerId != null) face.setPointerCapture(e.pointerId); } catch (eCap) {}
      }
      state.x = down.ox + dx;
      state.y = down.oy + dy;
      layout();
    }
    if (!drag && Math.abs(dx) + Math.abs(dy) > 3) say('rub');
    if (!drag && !p.paused && p.motion !== 'off') {
      var r = face.getBoundingClientRect();
      portrait.style.transform = 'perspective(540px) rotateX(' + (-(e.clientY - r.top - r.height / 2) / 11) + 'deg) rotateY(' + ((e.clientX - r.left - r.width / 2) / 11) + 'deg)';
    }
  }
  function end(e) {
    if (!down || down.id !== e.pointerId) return;
    var moved = !!drag;
    try { if (moved && face.releasePointerCapture && e.pointerId != null) face.releasePointerCapture(e.pointerId); } catch (eRel) {}
    drag = null;
    down = null;
    portrait.style.transform = '';
    if (moved) {
      var vw = petViewport(w, d).w;
      if (p.autoDock && (state.x <= 18 || state.x + ww >= vw - 18)) {
        dockToPill();
        return;
      }
      p.x = state.x;
      p.y = state.y;
      petSave();
      say('drag');
    } else {
      var nowEnd = Date.now();
      if (lastTapAt && nowEnd - lastTapAt < 320) {
        lastTapAt = 0;
        try { if (typeof ar6ArmSynthShield === 'function') ar6ArmSynthShield(); } catch (eSh) {}
        try { if (typeof openPanel === 'function') openPanel(); } catch (eDB) {}
        return;
      }
      lastTapAt = nowEnd;
      if (nowEnd - last > 350) say('rub');
    }
  }

  face.addEventListener('pointerdown', start);
  face.addEventListener('pointermove', move);
  face.addEventListener('pointerup', end);
  face.addEventListener('pointercancel', function () { down = null; drag = null; portrait.style.transform = ''; });
  face.addEventListener('dblclick', function (ev) {
    try { ev.preventDefault(); ev.stopPropagation(); } catch (e0) {}
    try { if (typeof openPanel === 'function') openPanel(); } catch (e1) {}
  });
  b.addEventListener('pointerdown', function (e) { e.stopPropagation(); });
  b.addEventListener('click', function (e) { e.stopPropagation(); });

  function visibility() {
    b.setAttribute('data-hidden', String(d.hidden));
    if (d.hidden) { down = null; drag = null; portrait.style.transform = ''; }
  }
  w.addEventListener('resize', layout);
  d.addEventListener('visibilitychange', visibility);
  d.body.appendChild(b);
  applySpriteAsset(state.form, state.skin);
  layout();
  visibility();
  syncForm(false);
  AR6_PET_CTRL = { syncForm: syncForm, setVisualState: setVisualState, edgeTarget: edgeTarget, say: say, getVisualMode: function () { return state.visualMode; } };
  try { if (typeof syncPill === 'function') syncPill(); } catch (eSP2) {}
  avatarCleanup = function () {
    AR6_PET_CTRL = null;
    timers.forEach(function (id) { w.clearTimeout(id); });
    w.removeEventListener('resize', layout);
    d.removeEventListener('visibilitychange', visibility);
    b.remove();
  };
}

function avatarUnmount() {
  if (typeof closeSparklence === 'function') { try { closeSparklence(false); } catch (eSpU) {} }
  AR6_PET_CTRL = null;
  if (avatarCleanup) { avatarCleanup(); avatarCleanup = null; }
  var d = wandDoc(), b = d && d.getElementById(AR6_AVATAR_ID);
  if (b) b.remove();
}

function mountWandEntry() {
  if (DISPOSED) return false;
  var d = wandDoc(); if (!d || !d.body) return false;
  ensureWandStyle();
  try { avatarMount(); } catch (eAM) {}
  var menu = wandMenu();
  if (!menu) { wandFallback(); wandRetry(); return false; }
  var old = d.getElementById(WAND_ID);
  if (old && old.parentNode) old.parentNode.removeChild(old);
  var box = d.createElement('div');
  box.id = WAND_ID;
  box.appendChild(wandRow());
  menu.insertBefore(box, menu.firstChild);
  WAND_STATE = 'menu';
  wandDropFallback();
  try { if (HOST) HOST.__ar6Wand = { mount: mountWandEntry, unmount: unmountWandEntry, state: function () { return WAND_STATE; } }; } catch (eE) {}
  wandWatch();
  return true;
}

function wandFallback() {
  if (DISPOSED) return;
  var d = wandDoc(); if (!d || !d.body || d.getElementById(WAND_SENDBTN)) return;
  var host = d.getElementById('leftSendForm') || d.getElementById('rightSendForm');
  if (!host) { WAND_STATE = 'none'; return; }
  var b = d.createElement('div');
  b.id = WAND_SENDBTN; b.title = '光之守护（卢克之光控制面板）';
  b.innerHTML = WAND_ICON;
  b.addEventListener('click', function (ev) {
    ev.preventDefault(); ev.stopPropagation();
    try { openPanelFromWand(); } catch (e) {}
  });
  host.appendChild(b);
  WAND_STATE = 'sendform';
}
function wandDropFallback() {
  var d = wandDoc(); if (!d) return;
  var b = d.getElementById(WAND_SENDBTN);
  if (b && b.parentNode) b.parentNode.removeChild(b);
}
function wandRetry() {
  if (DISPOSED || WAND_TRIES >= 12 || WAND_STATE === 'menu') return;
  WAND_TRIES++;
  try { HOST.setTimeout(function () { if (!DISPOSED) mountWandEntry(); }, 500); } catch (e) {}
}
function wandWatch() {
  if (WAND_OBS || DISPOSED) return;
  var d = wandDoc(); if (!d || !d.body || !HOST.MutationObserver) return;
  WAND_OBS = new HOST.MutationObserver(function () {
    if (DISPOSED) return;
    var m = wandMenu();
    if (m && !m.querySelector('#' + WAND_ID)) mountWandEntry();
  });
  try { WAND_OBS.observe(d.body, { childList: true }); } catch (e) {}
}

function unmountWandEntry() {
  avatarUnmount();
  try { if (WAND_OBS) { WAND_OBS.disconnect(); WAND_OBS = null; } } catch (e) {}
  var d = wandDoc(); if (!d) return;
  var st = d.getElementById('ar6-wand-style');
  if (st && st.parentNode) st.parentNode.removeChild(st);
  [WAND_ID, WAND_SENDBTN, WAND_SHEET].forEach(function (id) {
    var n = d.getElementById(id);
    if (n && n.parentNode) n.parentNode.removeChild(n);
  });
  try { if (HOST && HOST.__ar6Wand) delete HOST.__ar6Wand; } catch (e2) {}
  WAND_STATE = 'none';
}
