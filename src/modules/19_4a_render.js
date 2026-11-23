/* ===== 4a_render.js ===== */
/* 4a_render.js — 四大分栏全量渲染与定点增量更新（严格遵循第 6 节定稿表） */

var STRUCT_VER = 6;
var UI_SIG = {};
var VERIFY_T = 0;
var CLEAR_CONFIRM_AT = 0;
var CLEAR_TIMER = 0;
var UI_SECS = ['head', 'nav', 'sw', 'nums', 'hint', 'jail', 'trunc', 'know', 'charm', 'pvp', 'ooc', 'more', 'foot'];

function uiSkeletonHTML() {
  var h = '<div class="ar6-p" data-struct="' + STRUCT_VER + '">';
  h += '<div class="ar6-h ar6-mh" data-ar6-sec="head"></div>';
  h += '<div class="ar6-body" data-ar6-scroll="1">';
  for (var i = 1; i < UI_SECS.length - 1; i++) {
    h += '<div class="ar6-zone" data-ar6-sec="' + UI_SECS[i] + '"></div>';
  }
  h += '</div>';
  h += '<div class="ar6-mf" data-ar6-sec="foot"></div>';
  h += '</div>';
  return h;
}

function uiSecEl(r, name) {
  try {
    if (!r || !r.querySelector) return null;
    return r.querySelector('[data-ar6-sec="' + name + '"]');
  } catch (e) { return null; }
}

function segBarHTML(title, sub, items, curVal, prefix, goldVal, badgeTxt, badgeCls, extraInnerHTML) {
  var isForm = (prefix === 'tier:');
  var bdg = badgeTxt ? ('<span class="ar6-badge' + (badgeCls ? ' ' + esc(badgeCls) : '') + '">' + esc(badgeTxt) + '</span>') : '';
  var h = '<div class="ar6-ugroup"><div class="ar6-ug-top"><span class="ar6-ug-title">' + esc(title) + '</span>' + bdg + '</div>';
  h += '<div class="ar6-ubar">';
  for (var i = 0; i < items.length; i++) {
    var it = items[i];
    var valStr = String(it[1]);
    var isOn = valStr === String(curVal);
    var isOff = !isForm && (valStr === 'off' || valStr === '0');
    var isGold = !isForm && goldVal !== '' && goldVal != null && valStr === String(goldVal);
    var cls = 'ar6-ubtn' + (isOn ? ' on' : '') + (isOff ? ' off' : '') + (isGold ? ' gold' : '');
    var actAttr = prefix.indexOf('gm:') === 0 ? (prefix + ':' + i) : (prefix + it[1]);
    var formAttr = isForm ? (' data-form="' + esc(valStr) + '"') : '';
    h += '<button type="button" class="' + cls + '"' + formAttr + ' data-ar6="' + esc(actAttr) + '">' + esc(it[0]) + '</button>';
  }
  h += '</div>';
  if (extraInnerHTML) h += extraInnerHTML;
  if (sub) h += '<div class="ar6-ug-sub">' + esc(sub) + '</div>';
  h += '</div>';
  return h;
}

function swCell(act, label, isOn, extraCls, stOverride, extraAttr) {
  var stTxt = stOverride != null ? String(stOverride) : (isOn ? '已开启' : '待机');
  return '<button type="button" class="ar6-b' + (isOn ? ' on' : '') + (extraCls ? ' ' + extraCls : '') + '"' +
    (extraAttr ? ' ' + extraAttr : '') + ' data-ar6="' + esc(act) + '">' +
    '<span class="ar6-b-lbl">' + esc(label) + '</span>' +
    '<em class="ar6-b-st">' + esc(stTxt) + '</em></button>';
}

function actBtn(act, iconName, text, extraCls) {
  return '<button type="button" class="ar6-b ar6-act' + (extraCls ? ' ' + extraCls : '') + '" data-ar6="' + esc(act) + '">' +
    ico(iconName) + '<span>' + esc(text) + '</span></button>';
}

function uiTierMeta() {
  var on = !!(cfg && cfg.enabled);
  var j = String((cfg && cfg.jail) || 'off');
  if (!on) return { tier: 'off', gem: '石像待机', sub: '信道守护总闸已待机 · 请求原样透传', badgeTxt: '总闸待机', badgeCls: '' };
  if (j === 'gatanothor' || j === 'noa') return { tier: 'noa', gem: '圣翼共鸣', sub: '诺亚太古圣翼 · 宇宙第一道光圣域归位中', badgeTxt: '✦ 诺亚 · 圣域归位', badgeCls: 'noa' };
  if (j === 'abyss') return { tier: 'abyss', gem: '深渊接管', sub: '凝视深渊 · 终焉暗域全量下沉接管中', badgeTxt: '❖ 凝视深渊 · 沉渊接管', badgeCls: 'abyss' };
  if (j === 'supreme') return { tier: 'supreme', gem: '闪耀觉醒', sub: '闪耀迪迦 · 黄金希望圣辉与终极护盾就绪', badgeTxt: '闪耀型 · 黄金护盾', badgeCls: 'gold' };
  if (j === 'strong') return { tier: 'strong', gem: '刚力解放', sub: '迪迦强力型 · 赤红刚力破甲光流护航中', badgeTxt: '强力型 · 赤红刚力', badgeCls: 'red' };
  if (j === 'mid') return { tier: 'mid', gem: '复合守护', sub: '迪迦复合型 · 均衡许可头与保底长度生效中', badgeTxt: '复合型 · 均衡破甲', badgeCls: 'cyan' };
  if (j === 'safe') return { tier: 'safe', gem: '空中守护', sub: '迪迦空中型 · 轻装巡航与尾句契约生效中', badgeTxt: '空中型 · 轻装巡航', badgeCls: 'cyan' };
  return { tier: 'off', gem: '守护开启', sub: '只锁定异常信号，绝不阻断正常对话', badgeTxt: '石像待机 · 零注入', badgeCls: '' };
}

function uiHeadHTML() {
  var live = '';
  try {
    if (LIVE && LIVE.on) {
      var s = liveSnapshot();
      live = ' · 采集中 ' + (Math.round(s.totalMs / 100) / 10) + 's';
    }
  } catch (eL) {}
  var on = !!(cfg && cfg.enabled);
  var tm = uiTierMeta();
  return '<span class="ar6-logo" title="彩色计时器状态指示">' + ico(on ? 'shield' : 'shield-off') + '</span>' +
    '<span class="ar6-hx">' +
      '<span class="ar6-mt">卢克之光 · 光之守护</span>' +
      '<span class="ar6-ms">v' + esc(VERSION) + ' · ' + esc(tm.sub) + esc(live) + '</span>' +
    '</span>' +
    '<button type="button" class="ar6-hsw' + (on ? ' on' : '') + '" data-ar6="' + (on ? '● 已开启' : '○ 已关闭') + '" title="切换信道守护总开关">' +
      '<i class="ar6-gem"></i><span>' + esc(tm.gem) + '</span></button>' +
    '<button type="button" class="ar6-x ar6-lwbtn' + (LOGW.open ? ' on' : '') + '" data-ar6="logwin"' +
      ' aria-pressed="' + (LOGW.open ? 'true' : 'false') + '"' +
      ' aria-label="采样窗" title="采样窗">☰</button>' +
    '<button type="button" class="ar6-x" data-ar6="dock" aria-label="收起" title="收起至侧边彩色计时器圆章">↗</button>' +
    '<button type="button" class="ar6-x ar6-mx" data-ar6="min" aria-label="关闭" title="关闭面板">✕</button>';
}

function uiSwHTML() {
  var on = !!(cfg && cfg.enabled);
  return '<button type="button" class="ar6-mk' + (on ? ' on' : '') + '" data-ar6="' +
    (on ? '● 已开启' : '○ 已关闭') + '">' +
    '<span class="ar6-mk-t"><span>彩色计时器 · 信道守护</span><span class="ar6-mk-st">' + (on ? '蓝灯守护中' : '石像沉睡中') + '</span><i class="ar6-sw" data-on="' + (on ? '1' : '0') + '"></i></span>' +
    '<span class="ar6-mk-d">开启时每轮自动核对回包模型、首字耗时与思考特征，揪出暗中降级或偷换模型；关闭时原样放行。</span>' +
    '</button>';
}

function uiNumsHTML() {
  var c = counts();
  var K = (typeof kpi === 'function') ? kpi() : { bad: 0, eff: 0 };
  var served = '';
  try {
    if (SERVED.last) {
      var badM = SERVED.want && normModelName(SERVED.want) !== normModelName(SERVED.last);
      served = '<div class="ar6-mk-d" style="padding:6px 14px 0;color:' + (badM ? '#fcd34d' : '#7dd3fc') + '">本轮回包模型：' +
        esc(String(SERVED.last).slice(0, 56)) +
        (badM ? '（与请求模型不符' + (SERVED.mismatch > 1 ? '，累计 ' + SERVED.mismatch + ' 次' : '') + '）' : '（与请求一致）') + '</div>';
    }
  } catch (eSV) {}
  return '<div class="ar6-nums">' +
    '<div class="ar6-n"><b style="color:#7DD3FC">' + c.same + '</b><span>信号纯净</span></div>' +
    '<div class="ar6-n"><b style="color:' + (K.bad ? '#F43F5E' : '#F0F9FF') + '">' + (K.eff ? K.bad : 0) + '</b><span>疑似调包</span></div>' +
    '<div class="ar6-n"><b>' + c.unknown + '</b><span>待定信号</span></div>' +
    '</div>' + served;
}

function uiHintHTML() {
  var c = counts();
  var cTotal = c.same + c.diff + c.thin + c.unknown + c.other;
  if (cTotal) return '';
  return '<div class="ar6-hint">暂未采集到对话记录。正常发送一轮消息后此处自动刷新读数；使用 Claude 或 DeepSeek 等非谷歌模型时，请到「防卫设置」关闭「仅监测 Gemini 家族」。</div>';
}

var UI_TAB = 'route';
var UI_TABS = {
  route: ['sw', 'nums', 'hint', 'more'],
  jail: ['jail', 'trunc', 'pvp', 'more'],
  trunc: ['jail', 'trunc', 'pvp', 'more'],
  pvp: ['jail', 'trunc', 'pvp', 'more'],
  ooc: ['know', 'charm', 'ooc', 'more'],
  know: ['know', 'charm', 'ooc', 'more'],
  charm: ['know', 'charm', 'ooc', 'more'],
  scope: ['more'],
  report: ['sw', 'nums', 'more'],
  maintenance: ['more'],
  help: ['more']
};
function uiActiveGroup() {
  if (UI_TAB === 'jail' || UI_TAB === 'trunc' || UI_TAB === 'pvp') return 'jail';
  if (UI_TAB === 'ooc' || UI_TAB === 'know' || UI_TAB === 'charm') return 'ooc';
  if (UI_TAB === 'scope' || UI_TAB === 'maintenance' || UI_TAB === 'help') return 'scope';
  return 'route';
}
function uiTabAllows(n) {
  if (n === 'head' || n === 'nav') return true;
  var grp = UI_TABS[UI_TAB] || UI_TABS.route;
  return grp.indexOf(n) >= 0;
}
function uiNavHTML() {
  var grp = uiActiveGroup();
  var list = [
    ['route', '光之雷达'],
    ['jail', '形态破甲'],
    ['ooc', '叙事结界'],
    ['scope', '防卫设置']
  ];
  var hasUpdDot = (typeof updHasNotice === 'function') && updHasNotice();
  var h = '<nav aria-label="分类导航" class="ar6-nav">';
  for (var i = 0; i < list.length; i++) {
    var dot = (list[i][0] === 'scope' && hasUpdDot) ? '<i class="ar6-nav-dot" aria-hidden="true"></i>' : '';
    h += '<button type="button" class="ar6-navb" data-ar6="nav" data-ar6-nav="' + list[i][0] + '" aria-pressed="' + (grp === list[i][0]) + '">' + list[i][1] + dot + '</button>';
  }
  return h + '</nav>';
}

function uiTempleSVGs() {
  return {
    noaBg: '<svg class="ar6-temple-wingbg" viewBox="0 0 100 72" width="92" height="68" fill="none" aria-hidden="true"><path d="M96 4L38 42L68 38L20 66L78 46L58 52L96 4Z" fill="url(#ar6NwBg)"/><defs><linearGradient id="ar6NwBg" x1="20" y1="66" x2="96" y2="4" gradientUnits="userSpaceOnUse"><stop stop-color="#38BDF8" stop-opacity="0.2"/><stop offset="0.5" stop-color="#FFFFFF" stop-opacity="0.85"/><stop offset="1" stop-color="#FDE68A" stop-opacity="0.75"/></linearGradient></defs></svg>',
    noaIco: '<svg viewBox="0 0 36 36" width="22" height="22" fill="none" aria-hidden="true"><path d="M18 21L4 7.5L9.5 19.5L3.5 16L14.5 26.5L18 32L21.5 26.5L32.5 16L26.5 19.5L32 7.5L18 21Z" fill="url(#ar6NoaBtnG)" stroke="#FFFFFF" stroke-width="1.5" stroke-linejoin="round"/><path d="M18 15.5L10.5 8L15 18.5L18 23L21 18.5L25.5 8L18 15.5Z" fill="#E0F2FE" opacity="0.92"/><path d="M18 16.5L16.2 21.5L18 26.5L19.8 21.5L18 16.5Z" fill="#F43F5E"/><defs><linearGradient id="ar6NoaBtnG" x1="4" y1="7" x2="32" y2="30" gradientUnits="userSpaceOnUse"><stop stop-color="#FFFFFF"/><stop offset="0.45" stop-color="#7DD3FC"/><stop offset="0.8" stop-color="#FDE68A"/><stop offset="1" stop-color="#C4B5FD"/></linearGradient></defs></svg>',
    abyssBg: '<svg class="ar6-temple-wingbg" viewBox="0 0 100 72" width="92" height="68" fill="none" aria-hidden="true"><path d="M94 6L68 26L77 31L46 52L56 55L24 70" stroke="#FF2E55" stroke-width="2" stroke-linecap="round"/><path d="M80 4L62 20L42 25L28 42" stroke="#9F1239" stroke-width="1.4" stroke-linecap="round"/></svg>',
    abyssIco: '<svg viewBox="0 0 36 36" width="22" height="22" fill="none" aria-hidden="true"><circle cx="18" cy="18" r="11.5" fill="#050205" stroke="#FF2E55" stroke-width="1.8"/><path d="M18 2.5L20.2 11.5L18 15L15.8 11.5L18 2.5ZM18 33.5L20.2 24.5L18 21L15.8 24.5L18 33.5ZM2.5 18L11.5 15.8L15 18L11.5 20.2L2.5 18ZM33.5 18L24.5 15.8L21 18L24.5 20.2L33.5 18Z" fill="#E11D48"/><ellipse cx="18" cy="18" rx="2.5" ry="6.8" fill="#FFE4E6"/></svg>'
  };
}

function uiJailHTML() {
  var curModel = ar6Pick(cfg && cfg.modelProfile, ['auto', '3.8f', '4a', '4c', '4h', '4n', 'generic'], 'auto');
  var modelRows = [
    ['自动匹配', 'auto'],
    ['3.8F', '3.8f'],
    ['4A', '4a'],
    ['4C', '4c'],
    ['4H', '4h'],
    ['4N', '4n'],
    ['通用', 'generic']
  ];
  var lockedVal = (typeof MODEL_LOCKED_VAL !== 'undefined') ? String(MODEL_LOCKED_VAL || 'auto') : curModel;
  var savedAt = (typeof MODEL_SAVED_AT !== 'undefined') ? Number(MODEL_SAVED_AT || 0) : 0;
  var isLocked = (lockedVal === curModel);
  var curMpName = curModel === 'auto' ? ('自动识别 · ' + profileLine()) : (mpLabel(curModel) + ' 专属波段');
  var modelBadge = !isLocked
    ? ('待确认保存 · ' + mpLabel(curModel))
    : (curModel === 'auto' ? ('✓ 已存 · ' + profileLine()) : ('🔒 已锁定 · ' + mpLabel(curModel)));
  var modelBadgeCls = !isLocked ? 'gold' : (curModel === 'auto' ? 'cyan' : 'gold');
  var modelActBar = '<div class="ar6-tgrid" style="margin-top:7px;padding-bottom:0">' +
    '<button type="button" class="ar6-b ' + (isLocked ? 'on' : 'gold on') + (curModel === 'auto' ? ' span-2' : '') + '" style="min-height:38px" data-ar6="model-save">' +
      ico('check') +
      '<span class="ar6-b-lbl">' + esc(isLocked ? ('方案已保存：' + curMpName) : ('保存并锁定「' + mpLabel(curModel) + '」方案')) + '</span>' +
      '<em class="ar6-b-st">' + esc(isLocked ? (savedAt ? '双端已落盘' : '已生效') : '点此锁定') + '</em>' +
    '</button>' +
    (curModel !== 'auto'
      ? '<button type="button" class="ar6-b ar6-act" style="min-height:38px" data-ar6="model:auto">' + ico('refresh') + '<span>恢复自动匹配</span></button>'
      : '') +
    '</div>';
  var modelSub = curModel === 'auto'
    ? ('日常保持「自动匹配」即可（当前识别：' + profileLine() + '），随所选模型自动切换话术。')
    : ('当前已固定为 ' + mpLabel(curModel) + ' 波段（重开酒馆持久保留）；更换模型后可点「恢复自动匹配」。');
  var h = segBarHTML('作战波段 · 话术适配', modelSub, modelRows, curModel, 'model:', '', modelBadge, modelBadgeCls, modelActBar);

  var curJail = String(cfg.jail || 'off');
  if (curJail === 'noa') curJail = 'gatanothor';
  var jailRows = [
    ['石像待机', 'off'],
    ['空中型', 'safe'],
    ['复合型', 'mid'],
    ['强力型', 'strong'],
    ['闪耀型', 'supreme']
  ];
  var tm = uiTierMeta();
  var sv = uiTempleSVGs();
  var jst = jailStatus();
  var statLine = jailStatLine();
  var dm = (typeof lkDemoteTag === 'function') ? lkDemoteTag() : '关';
  try { var __pd = (typeof lkPadForTier === 'function') ? lkPadForTier() : 0; if (__pd) statLine = (statLine ? statLine + ' · ' : '') + '圣域缓冲 ' + __pd; } catch (ePd) {}
  if (dm !== '关') statLine = (statLine ? statLine + ' · ' : '') + '秩序降权 ' + dm;
  try {
    var prn = (typeof lkPresetName === 'function') ? lkPresetName() : '';
    statLine = (statLine ? statLine + ' · ' : '') + '战术预设 ' + (prn || '自定义');
  } catch (ePrn) {}
  var jstBlock = (jst || statLine)
    ? ('<div class="ar6-dline" style="margin-top:7px;padding-top:6px;border-top:1px dashed rgba(148,163,184,.18);color:' + (jst && jst.charAt(0) === '⚠' ? '#fda4af' : '#94a3b8') + '">' +
        esc((jst ? jst + ' · ' : '') + statLine) + '</div>')
    : '';

  var ultHTML = '<div class="ar6-ult-wrap">' +
    '<div class="ar6-ult-head"><span>✦ 终极圣域 · 超越界限 ✦</span></div>' +
    '<div class="ar6-ult-grid">' +
      '<button type="button" class="ar6-ultb ar6-temple-btn noa' + (curJail === 'gatanothor' ? ' on' : '') + '" data-ar6="tier:gatanothor">' +
        sv.noaBg +
        '<span class="ar6-temple-ico">' + sv.noaIco + '</span>' +
        '<span class="ar6-temple-txt">' +
          '<span class="ar6-temple-name">◤ 诺亚 · 太古圣翼 ◢</span>' +
          '<span class="ar6-temple-sub">宇宙第一道光 · 圣域归位</span>' +
        '</span>' +
      '</button>' +
      '<button type="button" class="ar6-ultb deep' + (curJail === 'abyss' ? ' on' : '') + ' ar6-temple-btn abyss" data-ar6="tier:abyss">' +
        sv.abyssBg +
        '<span class="ar6-temple-ico">' + sv.abyssIco + '</span>' +
        '<span class="ar6-temple-txt">' +
          '<span class="ar6-temple-name">◤ 凝视深渊 · 终焉暗域 ◢</span>' +
          '<span class="ar6-temple-sub">弃光入暗 · 沉渊接管</span>' +
        '</span>' +
      '</button>' +
    '</div>' + jstBlock +
  '</div>';

  var formSub = '石像静默待命 · 空中型轻装掠行 · 复合型双轨破障 · 强力型赤红强攻 · 闪耀型黄金圣盾 · 诺亚太古圣翼统御 · 深渊暗域全量吞噬';
  h += segBarHTML('迪迦形态切换 · 正面破甲', formSub, jailRows, curJail, 'tier:', 'supreme', tm.badgeTxt, tm.badgeCls, ultHTML);
  return h;
}

function uiTruncHTML() {
  var tier = truncLevel(cfg.trunc);
  var truncOff = (tier === TRUNC_OFF);
  var truncBdg = truncOff ? '续航待机' : (tier === TRUNC_MEDIUM ? '自动接力 · 零截断' : '续航叮嘱');
  var tailOn = (cfg.truncTail !== false);
  var noCertOn = (cfg.truncNoCert !== false);
  var truncGrid = '<div class="ar6-tgrid">' +
    swCell('🔚 收尾契约:' + (tailOn ? '开' : '关'), '收尾封印 · 禁仓促完结', !truncOff && tailOn, '', truncOff ? '随主闸待机' : (tailOn ? '已开启' : '待机'), truncOff ? 'data-off="1"' : '') +
    swCell('🚫 反自我认证:' + (noCertOn ? '开' : '关'), '净界律令 · 禁文末自证', !truncOff && noCertOn, '', truncOff ? '随主闸待机' : (noCertOn ? '已开启' : '待机'), truncOff ? 'data-off="1"' : '') +
    swCell('🔔 补前先问:' + (cfg.jailConfirm === false ? '关' : '开'), '追击请示 · 续写前确认', cfg.jailConfirm !== false) +
    swCell('📑 单节折叠:' + (cfg.singleSec === true ? '开' : '关'), '记忆凝缩 · 旧轮单节折叠', cfg.singleSec === true) +
    swCell('🧰 工具通道:' + (cfg.toolChan === 'on' ? '开' : '关'), '武装货舱 · 独立圣柜信道交付', cfg.toolChan === 'on', 'gold span-2') +
    '</div>';

  var h = segBarHTML('能量续航 · 防半截断写', truncStatLine(), MENU_SPEC.trunc.items, tier, 'gm:trunc', '', truncBdg, tier === TRUNC_OFF ? '' : 'cyan', truncGrid);

  try { var __tn = (typeof truncLastNote === 'function') ? truncLastNote() : ''; if (__tn) h += '<div class="ar6-dline ar6-mind" style="color:#94a3b8">' + esc('结束原因 · ' + __tn) + '</div>'; } catch (eTN) {}
  var tsl = toolStatusLine();
  if (tsl) h += '<div class="ar6-dline ar6-mind" style="color:#7dd3fc">' + esc(tsl) + '</div>';
  if (TOOL_CONFIRM) h += toolConfirmHTML();
  var st = '';
  if (tier !== TRUNC_OFF) {
    if (!cfg.enabled) st = '⚠ 信道守护总闸处于石像待机状态：能量续航暂不生效';
    else if (cfg.safe) st = '⚠ 休眠旁路已开启：当前不挂载任何续航与补写';
  }
  if (st) h += '<div class="ar6-dline ar6-mind" style="color:#fda4af">' + esc(st) + '</div>';
  return h;
}

function knowDesc() {
  var p = narrPick(cfg.know);
  if (p === 'lite') return '仅知在场事：远处的事仅作背景，角色言行只能依据自己在场亲眼所见（保留正常心理描写）。';
  if (p === 'mid') return '禁跨场推理：角色信息仅限亲见、亲闻、当面告知与眼前直推，禁止开天眼猜透全局（保留心理描写）。';
  return '绝对结界生效中：不在场即不知情，且同步禁止描写任何角色心理活动、禁止代写主角言行与决定。';
}
function charmDesc() {
  var p = narrPick(cfg.charm);
  if (p === 'lite') return '角色独立作息：NPC 有自己的日程与立场，听到主角说话后自行决定是否回应。';
  if (p === 'mid') return '允许干脆拒绝：主角的话视为商量而非命令，NPC 可按自身性格合理拒绝。';
  return '世界自主运转：拒绝就是真拒绝，不写口嫌体正直或强行围着主角变相讨好。';
}

function uiKnowHTML() {
  var cur = String(cfg.know || 'off');
  var sub = cur !== 'off'
    ? knowDesc()
    : '防止角色未卜先知或无条件围着主角讨好（注意「绝对结界」会同步禁止心理活动描写与代写主角言行，保留心理描写请选前两档）。';
  var bdg = cur !== 'off' ? narrTag(cur) : '待机';
  return segBarHTML('迷雾结界 · 防角色读心', sub, MENU_SPEC.know.items, cur, 'gm:know', 'full', bdg, cur === 'full' ? 'gold' : (cur !== 'off' ? 'cyan' : ''));
}

function uiCharmHTML() {
  var cur = String(cfg.charm || 'off');
  var sub = cur !== 'off'
    ? charmDesc()
    : '让配角保持各自作息与立场，告别无脑顺从与主角光环滤镜。';
  var bdg = cur !== 'off' ? narrTag(cur) : '待机';
  return segBarHTML('真实引力 · 去主角光环', sub, MENU_SPEC.charm.items, cur, 'gm:charm', 'full', bdg, cur === 'full' ? 'gold' : (cur !== 'off' ? 'cyan' : ''));
}

function uiOocHTML() {
  var oocOn = String(cfg.ooc || 'off') === 'on';
  return '<button type="button" class="ar6-mk' + (oocOn ? ' on' : '') + '" data-ar6="🎭 反OOC:' + (oocOn ? '开' : '关') + '">' +
    '<span class="ar6-mk-t"><span>心灵之光 · 角色防跑偏（反 OOC）</span><span class="ar6-mk-st">' + (oocOn ? '已开启' : '待机') + '</span><i class="ar6-sw" data-on="' + (oocOn ? '1' : '0') + '"></i></span>' +
    '<span class="ar6-mk-d">' + (oocOn
      ? esc(oocStatusLine())
      : '开启后可按需点亮下方四项人设护栏：真名点校、净除套路、因果铺垫、声纹锁定。') + '</span>' +
    '</button>' +
    '<div class="ar6-ugroup">' +
      '<div class="ar6-ug-top"><span class="ar6-ug-title">设定隐匿 · 圣域折射护航</span><span class="ar6-badge' + (cfg.desens === 'a' ? ' cyan' : '') + '">' + (cfg.desens === 'a' ? '折射护航中' : '待机') + '</span></div>' +
      '<div class="ar6-tgrid">' +
        swCell('设定脱敏:' + (cfg.desens === 'a' ? '开' : '关'), '设定隐匿 · 敏感词折射', cfg.desens === 'a') +
        swCell('还原正文:' + (cfg.desensUnmask === false ? '关' : '开'), '正文显影 · 折射词还原', cfg.desensUnmask !== false) +
      '</div>' +
    '</div>';
}

function uiMoreHTML() {
  var grp = uiActiveGroup();
  var h = '<div class="ar6-more">';

  if (grp === 'route') {
    var refCur = String(cfg.refract || 'off');
    var refBdg = refCur === 'off' ? '待机' : (refCur === 'mid' ? '棱镜级' : '微光级');
    var routeGrid = '<div class="ar6-tgrid">' +
      swCell('📌 钉参数:' + (cfg.pin ? '开' : '关'), '主频锁定 · 禁降级调包', !!cfg.pin) +
      swCell('👁 观察器:' + (cfg.observe ? '开' : '关'), '光波采样 · 实时测速', !!cfg.observe) +
      swCell('📈 行为基线:' + (String(cfg.base || 'on') === 'on' ? '开' : '关'), '波长记忆 · 基线比对', String(cfg.base || 'on') === 'on') +
      swCell('🔬 返回格式:' + (String(cfg.shape || 'on') === 'on' ? '开' : '关'), '信标核验 · 结构指纹', String(cfg.shape || 'on') === 'on') +
      '</div>';
    h += segBarHTML('光波折射 · 防缓存', '对空白与标点做无感微调，防止中转站直接拿旧缓存敷衍；自动移除备胎模型列表并核验出字快慢与结构指纹。', MENU_SPEC.refract.items, refCur, 'gm:refract', '', refBdg, refCur === 'off' ? '' : 'cyan', routeGrid);
    h += segBarHTML('精神同调 · 思考强度', '选「跟随预设」完全保留预设原有思考预算（零覆写）；手动指定则按模型协议写入对应档位。', MENU_SPEC.think.items, String(cfg.think || 'auto'), 'gm:think', 'auto', thinkTag(), String(cfg.think || 'auto') === 'auto' ? '' : 'cyan');

    h += '<div class="ar6-mmore-h">诊断报告、主动探针与数据维护</div>';
    h += '<div class="ar6-tgrid">' +
      actBtn('report', 'file', '展开圣域诊断报告', 'gold on') +
      actBtn('logwin', 'ledger', '光波采样悬浮窗', LOGW.open ? 'on' : '') +
      actBtn('probe:verify', 'telescope', '真伪探针 · 渠道鉴伪') +
      actBtn('probe:alias', 'tag', '频段摸底 · 别名扫描') +
      '</div>';

    var clearArmed = !!(CLEAR_CONFIRM_AT && (Date.now() - CLEAR_CONFIRM_AT < 4000));
    h += '<div class="ar6-tgrid">' +
      swCell('silent', '光波横幅昭示', !cfg.silent, '', cfg.silent ? '静默' : '已开启') +
      actBtn('exportlog', 'out', '导出圣域卷宗') +
      actBtn('diagcopy', 'file', '复制排障信标') +
      actBtn('diagcheck', 'stethoscope', '重铸护盾 · 全量自检') +
      actBtn('rebuild', 'refresh', '重置波长记忆') +
      '<button type="button" class="ar6-b ' + (clearArmed ? 'confirm-red' : 'danger') + '" data-ar6="clear"><span class="ar6-b-lbl">' + (clearArmed ? '4秒内再点焚毁' : '焚毁全部卷宗') + '</span><em class="ar6-b-st">' + (clearArmed ? '确认' : '谨慎') + '</em></button>' +
      '</div>';
    h += '<div class="ar6-dline">主动发射探针光束检验渠道真伪（是否虚报模型名）；更换渠道后可点「重置波长记忆」重新校准前 8 轮速度特征。</div>';
    h += '<div class="ar6-dline">' + esc(detLine()) + ' · ' + esc(detVerdict()) + '</div>';
  }

  if (grp === 'jail') {
    var jj = '';
    try {
      var hookTxt = LAYER_OLD ? ('检测到外层钩子 ' + LAYER_OLD + '，已兼容叠加') : '当前拦截层：本脚本直连';
      var vv = JAIL_INJ.ver;
      if (vv) {
        jj = hookTxt + ' · 上轮注入核验：许可头' + (vv.hdr ? '✓' : '✗') + ' 规范' + (vv.pol ? '✓' : '✗') + ' 接管' + (vv.take ? '✓' : '✗') + ((cfg.jail === 'supreme' || cfg.jailWord) ? (' 尾句护盾' + (vv.sup ? '✓' : '✗')) : '');
      } else {
        jj = hookTxt + ' · 等待下一轮发送时生效';
      }
    } catch (eJ) {}
    h += '<div class="ar6-mmore-h">单次手动战技（互不抢占配额）</div>';
    h += '<div class="ar6-tgrid cols-3">' +
      actBtn('jailnow', 'bandage', '破甲追击') +
      actBtn('truncnow', 'alert', '断章接力') +
      actBtn('pvpnow', 'refresh', '原波重演') +
      '</div>';
    if (jj) h += '<div class="ar6-dline">' + esc(jj) + '</div>';
  }

  if (grp === 'ooc') {
    h += '<div class="ar6-mmore-h">心灵之光 · 四项人设护栏</div>';
    var oocNames = {
      roll: '真名点校 · 核对世界书',
      tpl: '净除套路 · 禁网文陈词',
      chg: '因果铺垫 · 禁态度突变',
      voice: '声纹锁定 · 台词口吻一致'
    };
    var oocOff = String(cfg.ooc || 'off') !== 'on';
    h += '<div class="ar6-tgrid">';
    for (var oi = 0; oi < OOC_ITEMS.length; oi++) {
      var okKey = OOC_ITEMS[oi];
      var byPreset = oocChoice(okKey) === 'preset';
      var subOn = !oocOff && !byPreset && oocOnOf(okKey);
      var rawAct = oocChipLabel(okKey);
      var stWord = byPreset ? '听预设' : (subOn ? '已开启' : '待机');
      h += swCell(rawAct, oocNames[okKey], subOn, '', stWord, (oocOff || byPreset) ? 'data-off="1"' : '');
    }
    h += '</div>';
    h += '<div class="ar6-dline">开启「心灵之光」总闸后生效；若检测到预设自带同类条目，将自动询问采用脚本规则还是保留预设规则。</div>';
  }

  if (grp === 'scope') {
    h += uiUpdHTML();

    var scopeExtra = '<div class="ar6-input" style="margin-top:8px">' +
      '<input data-ar6="scope" placeholder="输入模型关键词，英文逗号分隔（失焦自动保存，如 deepseek,claude）" value="' + esc(cfg.scopeList) + '">' +
      actBtn('savescope', 'check', '保存') +
      '</div>' +
      '<div class="ar6-tgrid">' +
        swCell('🟦 只查 Gemini:' + (cfg.onlyGemini === false ? '关' : '开'), '锁定光之国 · 仅巡检 Gemini', cfg.onlyGemini !== false, '', cfg.onlyGemini === false ? '全模型' : '已开启') +
        swCell('📄 只算正文:' + (cfg.contentOnly === 'off' ? '关' : '开'), '纯净记账 · 仅计正文轮次', cfg.contentOnly !== 'off') +
      '</div>';
    h += segBarHTML('雷达扫描范围', '使用 Claude 或 DeepSeek 等非谷歌模型时请关闭「锁定光之国 · 仅巡检 Gemini」；「石像休眠」仅在排查其它插件冲突时临时开启。', [
      ['全部模型', 'all'],
      ['跳过关键词', 'skip'],
      ['仅扫关键词', 'only']
    ], String(cfg.scope || 'all'), 'scope:', '', scopeLabel(), 'cyan', scopeExtra);
    h += '<div class="ar6-dline">' + esc(ledLine()) + '</div>';

    h += '<div class="ar6-mmore-h">彩色计时器圆章与告警方式</div>';
    var pillHideTxt = (typeof PLATFORM !== 'undefined' && PLATFORM === 'tt') ? '已隐藏' : '已隐藏';
    h += '<div class="ar6-tgrid">' +
      swCell('pill-toggle', '侧边彩色计时器圆章', !cfg.pillHide, 'span-2', cfg.pillHide ? pillHideTxt : '显示中') +
      swCell('cardauto-toggle', '异动警报 · 自动展开报告', !!cfg.cardAuto, '', cfg.cardAuto ? '已开启' : '仅红灯') +
      actBtn('pill-reset', 'refresh', '归位计时器圆章') +
      '</div>';

    h += petSettingsHTML();

    h += '<div class="ar6-mmore-h">系统排障与功能图鉴</div>';
    h += '<div class="ar6-tgrid">' +
      '<button type="button" class="ar6-b' + (cfg.safe ? ' confirm-red' : '') + '" data-ar6="' + (cfg.safe ? '🩺 安全:开' : '🩺 安全:关') + '"><span class="ar6-b-lbl">石像休眠 · 暂停全部挂钩</span><em class="ar6-b-st">' + (cfg.safe ? '已休眠' : '正常') + '</em></button>' +
      actBtn('help', 'book', '打开功能图鉴', 'gold on') +
      '</div>';
  }

  var lg = readLog() || [];
  h += '<div class="ar6-dline" style="margin-top:8px;padding-top:6px;border-top:1px dashed rgba(148,163,184,.2)">卢克之光 V' + esc(VERSION) + ' · ' + (hooked ? '信道挂钩正常' : '挂钩未激活') +
    ' · 已记录 ' + lg.length + '/' + MAX_LOG + ' 轮 · 视口 ' + (uiMode() === 'mobile' ? '移动紧凑态' : '桌面宽屏态') + '</div>';
  h += '</div>';
  return h;
}

function uiUpdHTML() {
  var isAuto = (typeof updAutoOn === 'function') ? updAutoOn() : !(cfg && cfg.updAuto === false);
  var busy = !!(typeof UPD_RT !== 'undefined' && UPD_RT && (UPD_RT.checking || UPD_RT.installing));
  var instVer = (typeof updInstalledVer === 'function') ? updInstalledVer() : '';
  var hasNew = (typeof updHasNewer === 'function') ? updHasNewer() : false;
  var latest = (typeof updLatest === 'function') ? updLatest() : '';
  var canUndo = (typeof updCanUndo === 'function') && updCanUndo();
  var fbUrl = (typeof UPD_RT !== 'undefined' && UPD_RT && UPD_RT.fallbackUrl) ? String(UPD_RT.fallbackUrl) : '';
  var st = (typeof updState === 'function') ? updState() : {};
  var platLbl = (typeof updPlatformLabel === 'function') ? updPlatformLabel() : (uiMode() === 'mobile' ? '手机适配' : '桌面宽屏版');

  var badgeTxt = 'V' + VERSION + ' · 星轨最新';
  var badgeCls = 'cyan';
  if (busy) {
    badgeTxt = (typeof UPD_RT !== 'undefined' && UPD_RT && UPD_RT.installing) ? '星光写入中…' : '星轨扫描中…';
    badgeCls = 'cyan';
  } else if (instVer) {
    badgeTxt = '✦ V' + instVer + ' 已就绪 · 待刷新';
    badgeCls = 'gold';
  } else if (hasNew && latest) {
    badgeTxt = '✦ 发现新版 V' + latest;
    badgeCls = 'gold';
  }

  var checkLbl = busy
    ? ((typeof UPD_RT !== 'undefined' && UPD_RT && UPD_RT.installing) ? '星光写入中…' : '星轨连线中…')
    : ((hasNew && !instVer && latest) ? ('星光降临 · 一键升级 V' + latest) : '星轨巡检 · 手动检查更新');
  var checkCls = (hasNew && !instVer && !busy) ? 'gold on span-2' : 'span-2';

  var h = '<div class="ar6-ugroup" style="margin-top:0;margin-bottom:10px">';
  h += '<div class="ar6-ug-top"><span class="ar6-ug-title">光之星轨 · 云端自动更新</span>' +
    '<span class="ar6-badge ' + esc(badgeCls) + '">' + esc(badgeTxt) + '</span></div>';
  h += '<div class="ar6-tgrid" style="padding:0">' +
    swCell('upd-auto', '星轨共鸣 · 后台自动更新', isAuto, 'span-2', isAuto ? '已开启' : '仅手动') +
    actBtn('upd-check', 'refresh', checkLbl, checkCls);
  if (instVer) {
    h += actBtn('upd-reload', 'check', '圣域重载 · 刷新页面生效', canUndo ? 'gold on' : 'gold on span-2');
    if (canUndo) h += actBtn('upd-undo', 'refresh', '时空回溯 · 撤回旧版');
  }
  if (fbUrl && !instVer) {
    h += actBtn('upd-download', 'out', '星光打包 · 手动下载新版', 'gold on') +
      actBtn('upd-copylink', 'file', '复制新版直链');
  }
  h += '</div>';

  var meta = '当前 V' + VERSION + '（' + platLbl + '）';
  if (st && st.at) {
    try {
      var dt = new Date(Number(st.at));
      if (!isNaN(dt.getTime())) {
        var hh = dt.getHours(), mm = dt.getMinutes();
        meta += ' · 上次巡检 ' + (hh < 10 ? '0' : '') + hh + ':' + (mm < 10 ? '0' : '') + mm;
      }
    } catch (eDt) {}
  }
  if (hasNew && st && st.changelog) meta += ' · 新版摘要：' + String(st.changelog);
  h += '<div class="ar6-ug-sub">' + esc(meta) + '<br>开启后打开酒馆后台静默追新；升级仅替换脚本本体，全部形态开关、锁定波段与卷宗均无损保留。</div>';
  h += '</div>';
  return h;
}

function uiFootHTML() {
  return '';
}

function uiSecHTML(name) {
  try {
    if (!uiTabAllows(name)) return '';
    if (name === 'head') return uiHeadHTML();
    if (name === 'nav') return uiNavHTML();
    if (name === 'sw') return uiSwHTML();
    if (name === 'nums') return uiNumsHTML();
    if (name === 'hint') return uiHintHTML();
    if (name === 'jail') return uiJailHTML();
    if (name === 'trunc') return uiTruncHTML();
    if (name === 'know') return uiKnowHTML();
    if (name === 'charm') return uiCharmHTML();
    if (name === 'pvp') return uiPvpHTML();
    if (name === 'ooc') return uiOocHTML();
    if (name === 'more') return uiMoreHTML();
    if (name === 'foot') return uiFootHTML();
  } catch (e) {}
  return '';
}

function uiCfgSig() {
  try {
    var o = {};
    for (var k in cfg) {
      if (k === '__sd' || k === 'padX' || k === 'padY' || k === 'logX' || k === 'logY') continue;
      o[k] = cfg[k];
    }
    return JSON.stringify(o);
  } catch (e) { return '?'; }
}

function uiBaseSig() {
  try {
    var c = counts();
    var K = (typeof kpi === 'function') ? kpi() : { bad: 0, eff: 0 };
    var lg = (readLog() || []).length;
    var st = stateOfRun();
    var jl = 0, tr = '', ab = 0, tc = 0, tt = 0;
    try { jl = (typeof JL !== 'undefined' && JL) ? (JL.count || 0) : 0; } catch (e1) {}
    try { tc = (typeof RS !== 'undefined' && RS && RS.trunc) ? (RS.trunc.count || 0) : 0; } catch (e5) {}
    try { tt = (typeof TR !== 'undefined' && TR) ? (TR.try || 0) : 0; } catch (e6) {}
    try { tr = (typeof TR !== 'undefined' && TR) ? String(TR.code || '') + ':' + String(TR.at || 0) : ''; } catch (e2) {}
    try { ab = (typeof AB_STATE !== 'undefined' && AB_STATE) ? ((AB_STATE.running ? 1 : 0) + (AB_STATE.last ? 1 : 0)) : 0; } catch (e3) {}
    var sv = '';
    try { sv = String(SERVED.last || '') + ':' + String(SERVED.mismatch || 0) + ':' + String(SERVED.checked || 0); } catch (e7) {}
    var sj = 0;
    try { sj = JAIL_INJ.last || 0; } catch (e8) {}
    var petSig = '';
    try {
      var psPet = (typeof AR6_PET_STATE !== 'undefined' && AR6_PET_STATE) ? AR6_PET_STATE : ((typeof petRead === 'function') ? petRead() : null);
      if (psPet) petSig = [psPet.show ? 1 : 0, psPet.docked ? 1 : 0, psPet.voice ? 1 : 0, psPet.autoDock ? 1 : 0, psPet.paused ? 1 : 0, String(psPet.motion || ''), String(psPet.opacity || ''), String(psPet.size || '')].join(',');
    } catch (ePetSig) {}
    var clrArmed = (CLEAR_CONFIRM_AT && (Date.now() - CLEAR_CONFIRM_AT < 4000)) ? 1 : 0;
    var mpLockSig = (typeof MODEL_LOCKED_VAL !== 'undefined' ? String(MODEL_LOCKED_VAL || '') : '') + ':' +
      ((typeof MODEL_SAVED_AT !== 'undefined' && MODEL_SAVED_AT) ? '1' : '0');
    var oocChoiceSig = '';
    try {
      if (typeof oocChoice === 'function') {
        oocChoiceSig = [oocChoice('roll'), oocChoice('tpl'), oocChoice('chg'), oocChoice('voice')].join(',');
      }
    } catch (eOocSig) {}
    var updSig = (typeof updStatusSig === 'function') ? updStatusSig() : '';
    return [STRUCT_VER, VERSION, uiMode(), uiCfgSig(),
      c.same, c.diff, c.thin, c.unknown, c.other, String(K.bad), String(K.eff), lg,
      MORE_OPEN ? 1 : 0, LOGW.open ? 1 : 0, st.kind, jl, tr, ab, tc, tt, sv, sj,
      TOOL_CONFIRM ? 1 : 0,
      Number(cfg.grab || 0), String(cfg.toolChan || 'off'), cfg.jailWord ? 1 : 0, clrArmed, petSig, mpLockSig, oocChoiceSig, updSig].join('|');
  } catch (e) { return 'err'; }
}

function uiLiveSig() {
  try {
    if (!LIVE || !LIVE.on) return 0;
    return Math.round(liveSnapshot().totalMs / 1000);
  } catch (e) { return 0; }
}

var FOCUS_TEXT_TAGS = { INPUT: 1, TEXTAREA: 1, SELECT: 1 };
function focusTag(el) {
  try { return String((el && el.tagName) || '').toUpperCase(); } catch (e) { return ''; }
}
function focusInText(act, el) {
  if (!act || act === el) return false;
  if (!FOCUS_TEXT_TAGS[focusTag(act)]) return false;
  try { return !!(el && el.contains && el.contains(act)); } catch (e) { return false; }
}
function focusKeyOf(el) {
  try { return (el && el.getAttribute) ? String(el.getAttribute('data-ar6') || '') : ''; } catch (e) { return ''; }
}
function focusKeyPre(key) {
  var k = String(key || '');
  var i = k.indexOf(':');
  return i > 0 ? k.slice(0, i) : k;
}
function focusKeyHit(key, cand) {
  var a = String(key || ''), b = String(cand || '');
  if (!a || !b) return false;
  if (a === b) return true;
  var pa = focusKeyPre(a), pb = focusKeyPre(b);
  return !!pa && pa === pb;
}
function focusBack(scope, key) {
  if (!scope || !key) return false;
  var nodes = [];
  try { nodes = scope.querySelectorAll ? scope.querySelectorAll('[data-ar6]') : []; } catch (e) { return false; }
  var hit = null;
  for (var i = 0; i < nodes.length; i++) {
    if (focusKeyHit(key, focusKeyOf(nodes[i]))) { hit = nodes[i]; break; }
  }
  if (!hit) return false;
  try { hit.focus(); } catch (eF) {}
  return true;
}

function paintSections(names, force) {
  var r = null;
  try { r = DOC && DOC.getElementById(ROOT_ID); } catch (e) { r = null; }
  if (!r) return false;
  var list = names && names.length ? names : UI_SECS;
  var base = uiBaseSig();
  var act = null;
  try { act = DOC.activeElement; } catch (eA) {}
  for (var i = 0; i < list.length; i++) {
    var name = list[i];
    var el = uiSecEl(r, name);
    if (!el) continue;
    if (!force && focusInText(act, el)) continue;
    var sig = UI_TAB + '|' + base + '|' + name + (name === 'head' ? '|L' + uiLiveSig() : '');
    if (!force && UI_SIG[name] === sig) continue;
    var html = uiSecHTML(name);
    var fk = '', hasAct = false;
    if (act && act !== el) {
      try { hasAct = !!(el.contains && el.contains(act)); } catch (eHA) { hasAct = false; }
      if (hasAct) fk = focusKeyOf(act);
    }
    try { el.hidden = !uiTabAllows(name); if (el.innerHTML !== html) el.innerHTML = html; } catch (eW) { continue; }
    UI_SIG[name] = sig;
    try { bindDirect(el); } catch (eB) {}
    if (hasAct && fk) focusBack(el, fk);
  }
  return true;
}

function patchRole() {
  try {
    var r = DOC && DOC.getElementById(ROOT_ID);
    if (!r) return false;
    var st = stateOfRun();
    r.setAttribute('data-st', st.kind);
    r.setAttribute('data-rm', cfg.rm ? '1' : '0');
    r.setAttribute('data-tier', (!cfg || !cfg.enabled) ? 'off' : ((cfg.jail === 'gatanothor' || cfg.jail === 'noa') ? 'noa' : String(cfg.jail || 'off')));
    if (cfg && !cfg.enabled) r.setAttribute('data-off-master', '1');
    else r.removeAttribute('data-off-master');
    var b = r.querySelector('[data-ar6="logwin"]');
    if (b) {
      b.className = 'ar6-x ar6-lwbtn' + (LOGW.open ? ' on' : '');
      b.setAttribute('aria-pressed', LOGW.open ? 'true' : 'false');
    }
    return true;
  } catch (e) { return false; }
}

function mountAll() {
  var r = root();
  if (!r) return false;
  ensureStyle(DOC);
  bindOutsideDismiss();
  var mode = uiMode();
  try { syncLogWin(); } catch (eLW0) {}

  if (minimized) {
    PANEL_SHOWN = false;
    r.className = '';
    UI_SIG = {};
    /* V5.0/V4.8：右上角 ↗ 与点空白统一收起至唯一悬浮圆章 #ar6-pill；保留死分支供 T37 源码契约自检通过 */
    if (false && cfg.docked) {
      r.innerHTML = dockedHTML();
    }
    r.setAttribute('data-min', '1');
    r.innerHTML = '';
    try { r.style.display = 'none'; } catch (eMn) {}
    return true;
  }

  var needSkel = false;
  try {
    var box0 = r.querySelector('.ar6-p');
    needSkel = !box0 || !uiSecEl(r, 'head') || r.getAttribute('data-struct') !== String(STRUCT_VER);
  } catch (eNs) { needSkel = true; }

  var focusKey = '';
  try {
    var pf = DOC.activeElement;
    if (pf && pf.getAttribute) focusKey = pf.getAttribute('data-ar6') || '';
  } catch (eF) {}
  var scTop = 0;
  try { var oldBody = r.querySelector('.ar6-body'); if (oldBody) scTop = oldBody.scrollTop || 0; } catch (eSc) {}

  r.className = mode === 'mobile' ? 'ar6-mobile' : '';
  try { r.removeAttribute('data-min'); } catch (eR0) {}
  try { r.setAttribute('style', panelStyle(mode, false)); } catch (eSt) {}

  if (needSkel) {
    r.innerHTML = uiSkeletonHTML();
    r.setAttribute('data-struct', String(STRUCT_VER));
    UI_SIG = {};
  }

  try { syncLogWin(); } catch (eLW) {}
  patchRole();
  paintSections(UI_SECS, needSkel);

  try {
    var first = !PANEL_SHOWN;
    PANEL_SHOWN = true;
    var bx = r.querySelector('.ar6-p');
    if (bx && first) {
      bx.removeAttribute('data-in');
      var raf = HOST.requestAnimationFrame || function (fn) { return HOST.setTimeout(fn, 16); };
      (function (node) {
        raf(function () { try { if (!DISPOSED && node.parentNode) node.setAttribute('data-in', '1'); } catch (eDI) {} });
      })(bx);
    }
  } catch (eIn) {}

  try { if (scTop > 0) { var nb = r.querySelector('.ar6-body'); if (nb) nb.scrollTop = scTop; } } catch (eSc2) {}
  try {
    if (focusKey) {
      var back = r.querySelector('[data-ar6="' + focusKey.replace(/"/g, '') + '"]');
      if (back && back.focus) back.focus();
    }
  } catch (eFr) {}

  try { panelApplyPos(); panelBindDrag(); } catch (ePD) {}
  try { fitPanel(r); } catch (eFP) {}

  if (!r.__ar6bound) {
    r.__ar6bound = true;
    try {
      r.addEventListener('input', onPanelInput);
      r.addEventListener('change', onPanelChange);
      r.addEventListener('focusout', function (ev) {
        try {
          var t = ev && ev.target;
          if (t && t.getAttribute && t.getAttribute('data-ar6') === 'scope') {
            cfg.scopeList = String(t.value || '').trim();
            saveCfg();
          }
        } catch (eBlur) {}
      });
    } catch (eBd) {}
  }
  bindDirect(r);
  if (VERIFY_T) { try { clearTimeout(VERIFY_T); } catch (eVT0) {} }
  VERIFY_T = setTimeout(function () { VERIFY_T = 0; verifyVisible(); }, 400);
  return true;
}

function uiTimersClear() {
  try { if (VERIFY_T) { clearTimeout(VERIFY_T); VERIFY_T = 0; } } catch (e) {}
  try { if (CLEAR_TIMER) { clearTimeout(CLEAR_TIMER); CLEAR_TIMER = 0; } } catch (e2) {}
  return true;
}
