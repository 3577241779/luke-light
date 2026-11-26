/* ===== 18b_prism_panel.js ===== */
/* 18b_prism_panel.js — V5.74 双生协同单窗内核（《光域·镜界 V0.1》独立/双开三态无缝接管） */

var PRISM_VIEW = 'luke';
var PRISM_TAB = 'cot';
var PRISM_SEARCH = '';
var PRISM_SHOW_DESC = true;
var PRISM_CHOICE_MODE = 'send';
var PRISM_CH_LAST_EL = null;
var PRISM_CH_LAST_AT = 0;
var PRISM_DRAFTS = {};
var PRISM_OPT_EN = {};
var PRISM_OPT_TX = {};
var PRISM_OPT_TTL = 3000;
var PRISM_SYNC_GUARD = false;
var PRISM_EVT_BOUND = false;
var PRISM_EVT_REFS = [];

/* ---- V5.76→V5.96 四生合体：同生态兄弟面板槽位注册中心 (lightlens / lightmemo 等) ---- */
var AR6_SIBLINGS = {};
var AR6_SIB_SRC = {};      /* id -> 'direct' | 'queue' */
var AR6_SIB_ORDER = [];
var AR6_SIB_MOUNTED = null; /* { id: string, el: HTMLElement, spec: object } */

function siblingValid(spec) {
  return !!(spec && typeof spec === 'object' && spec.id && typeof spec.mount === 'function');
}

function listSiblings() {
  var out = [];
  for (var i = 0; i < AR6_SIB_ORDER.length; i++) {
    var s = AR6_SIBLINGS[AR6_SIB_ORDER[i]];
    if (s) out.push(s);
  }
  return out;
}

function hasAnySibling() {
  return AR6_SIB_ORDER.length > 0;
}

function getSiblingById(id) {
  return (id && AR6_SIBLINGS[String(id)]) ? AR6_SIBLINGS[String(id)] : null;
}

function unmountActiveSibling() {
  if (!AR6_SIB_MOUNTED) return;
  var cur = AR6_SIB_MOUNTED;
  AR6_SIB_MOUNTED = null;
  try {
    if (cur.spec && typeof cur.spec.unmount === 'function') {
      cur.spec.unmount(cur.el);
    } else if (cur.el) {
      cur.el.innerHTML = '';
    }
  } catch (eU) {}
}

function registerSibling(spec) {
  if (!siblingValid(spec)) return function () {};
  var id = String(spec.id);
  var prevSpec = AR6_SIBLINGS[id];
  var isNew = !prevSpec;
  var isHotReload = !isNew && prevSpec !== spec && prevSpec.mount !== spec.mount;
  AR6_SIBLINGS[id] = spec;
  AR6_SIB_SRC[id] = 'direct';
  if (isNew) AR6_SIB_ORDER.push(id);
  if (isNew || isHotReload) {
    try { if (typeof UI_SIG === 'object' && UI_SIG) UI_SIG = {}; } catch (eS) {}
    try { if (typeof minimized === 'undefined' || !minimized) { if (typeof render === 'function') render(); } } catch (eR) {}
  }
  return function unregisterSibling() {
    if (AR6_SIBLINGS[id] !== spec) return;
    if (AR6_SIB_MOUNTED && AR6_SIB_MOUNTED.id === id) unmountActiveSibling();
    delete AR6_SIBLINGS[id];
    delete AR6_SIB_SRC[id];
    var nextOrd = [];
    for (var i = 0; i < AR6_SIB_ORDER.length; i++) {
      if (AR6_SIB_ORDER[i] !== id) nextOrd.push(AR6_SIB_ORDER[i]);
    }
    AR6_SIB_ORDER = nextOrd;
    if (PRISM_VIEW === 'sibling:' + id) PRISM_VIEW = 'luke';
    try { if (typeof UI_SIG === 'object' && UI_SIG) UI_SIG = {}; } catch (eS2) {}
    try { if (typeof render === 'function') render(); } catch (eR2) {}
  };
}

function syncGlobalSiblings() {
  var ws = prismWins();
  var seenInQueue = {};
  var changed = false;
  for (var i = 0; i < ws.length; i++) {
    try {
      var arr = ws[i] && ws[i].__LK_SIBLINGS__;
      if (!Array.isArray(arr)) continue;
      for (var j = 0; j < arr.length; j++) {
        if (siblingValid(arr[j])) {
          var id = String(arr[j].id);
          seenInQueue[id] = true;
          if (!AR6_SIBLINGS[id]) {
            AR6_SIBLINGS[id] = arr[j];
            AR6_SIB_SRC[id] = 'queue';
            AR6_SIB_ORDER.push(id);
            changed = true;
          } else if (AR6_SIB_SRC[id] === 'queue' && AR6_SIBLINGS[id] !== arr[j]) {
            AR6_SIBLINGS[id] = arr[j];
            changed = true;
          }
        }
      }
    } catch (eG) {}
  }
  /* 清理来源为共享队列 __LK_SIBLINGS__ 但已退场移除的过期兄弟（保留 direct 直连活跃项） */
  if (AR6_SIB_ORDER.length > 0) {
    var nextOrd = [];
    for (var k = 0; k < AR6_SIB_ORDER.length; k++) {
      var sid = AR6_SIB_ORDER[k];
      if (AR6_SIB_SRC[sid] === 'queue' && !seenInQueue[sid]) {
        if (AR6_SIB_MOUNTED && AR6_SIB_MOUNTED.id === sid) unmountActiveSibling();
        delete AR6_SIBLINGS[sid];
        delete AR6_SIB_SRC[sid];
        if (PRISM_VIEW === 'sibling:' + sid) PRISM_VIEW = 'luke';
        changed = true;
      } else {
        nextOrd.push(sid);
      }
    }
    AR6_SIB_ORDER = nextOrd;
  }
  return changed;
}

function openSiblingPanel(id) {
  syncGlobalSiblings();
  var sib = getSiblingById(id);
  try { PANEL_OPENED_AT = Date.now(); } catch (e0) {}
  try { minimized = false; } catch (e1) {}
  try { MORE_OPEN = false; } catch (e2) {}
  try {
    if (typeof cfg === 'object' && cfg) {
      cfg.docked = false;
      cfg.min = false;
      if (typeof saveCfg === 'function') saveCfg();
    }
  } catch (e3) {}
  PRISM_VIEW = sib ? ('sibling:' + sib.id) : 'luke';
  try { if (typeof UI_SIG === 'object' && UI_SIG) UI_SIG = {}; } catch (e4) {}
  try { if (typeof render === 'function') render(); } catch (e5) {}
  try { if (typeof syncPill === 'function') syncPill(); } catch (e6) {}
  return PRISM_VIEW;
}

function prismSetOptEn(id, val) {
  if (!id) return;
  PRISM_OPT_EN[String(id)] = { v: !!val, exp: Date.now() + PRISM_OPT_TTL };
}

function prismSetOptTx(id, val) {
  if (!id) return;
  PRISM_OPT_TX[String(id)] = { v: String(val == null ? '' : val), exp: Date.now() + PRISM_OPT_TTL };
}

function prismPromptId(p) {
  if (!p || typeof p !== 'object') return '';
  if (p.identifier != null && String(p.identifier) !== '') return String(p.identifier);
  if (p.id != null && String(p.id) !== '') return String(p.id);
  return '';
}

var PRISM_DEFAULT_TABS = [
  { id: 'cot', label: '思维链', icon: '🧠', title: '镜界推演 · 专属思维链中枢' },
  { id: 'world_char', label: '角色世界', icon: '🎭', title: '世界基调 · 立体群像与心声' },
  { id: 'intimacy', label: '亲密特化', icon: '🔥', title: '亲密强度 · 词轨与感官专精' },
  { id: 'style', label: '文风去油', icon: '✒️', title: '16大文风 · 节奏与8维去油' },
  { id: 'data_ui', label: '变量前端', icon: '📦', title: '卡调DM · MVU变量与互动前端' },
  { id: 'bundles', label: '一键配装', icon: '⚡', title: '六大场景一键配装方案' }
];

function prismWins() {
  var out = [];
  function push(w) {
    if (!w) return;
    for (var i = 0; i < out.length; i++) if (out[i] === w) return;
    out.push(w);
  }
  try { if (typeof HOST !== 'undefined' && HOST) push(HOST); } catch (e0) {}
  try { if (typeof SELF_WIN !== 'undefined' && SELF_WIN) push(SELF_WIN); } catch (e1) {}
  try { if (typeof window !== 'undefined' && window) push(window); } catch (e2) {}
  return out;
}

function prismBridge() {
  var ws = prismWins();
  for (var i = 0; i < ws.length; i++) {
    try {
      var b = ws[i] && ws[i].__LK_PRISM_BRIDGE__;
      if (b && typeof b === 'object') return b;
    } catch (e) {}
  }
  return null;
}

function prismTavernHelper() {
  var ws = prismWins();
  var gp = null;
  var upw = null;
  try { if (typeof getPreset === 'function') gp = getPreset; } catch (eG0) {}
  try { if (typeof updatePresetWith === 'function') upw = updatePresetWith; } catch (eU0) {}
  for (var i = 0; i < ws.length; i++) {
    try {
      var w = ws[i];
      if (!w) continue;
      var th = w.TavernHelper;
      if (th && typeof th === 'object') {
        if (typeof th.getPreset === 'function' && typeof th.updatePresetWith === 'function') return th;
        if (!gp && typeof th.getPreset === 'function') {
          gp = (function (obj) { return function (n) { return obj.getPreset(n); }; })(th);
        }
        if (!upw && typeof th.updatePresetWith === 'function') {
          upw = (function (obj) { return function (n, fn, opt) { return obj.updatePresetWith(n, fn, opt); }; })(th);
        }
      }
      if (!gp && typeof w.getPreset === 'function') {
        gp = (function (winObj) { return function (n) { return winObj.getPreset(n); }; })(w);
      }
      if (!upw && typeof w.updatePresetWith === 'function') {
        upw = (function (winObj) { return function (n, fn, opt) { return winObj.updatePresetWith(n, fn, opt); }; })(w);
      }
    } catch (e) {}
  }
  if (gp || upw) return { getPreset: gp, updatePresetWith: upw };
  return null;
}

function prismObjMatch(p) {
  if (!p || typeof p !== 'object') return false;
  try {
    if (p.extensions && p.extensions.lk_prism_meta && p.extensions.lk_prism_meta.signature === 'lk_prism_v1') {
      return true;
    }
  } catch (e0) {}
  try {
    if (Array.isArray(p.prompts)) {
      for (var i = 0; i < p.prompts.length; i++) {
        if (prismPromptId(p.prompts[i]) === 'lk_prism_manifest') return true;
      }
    }
  } catch (e1) {}
  return false;
}

function prismLookupFromMgr(mgr) {
  if (!mgr) return null;
  var name = '';
  try {
    if (typeof mgr.getSelectedPresetName === 'function') name = String(mgr.getSelectedPresetName() || '');
  } catch (eN) {}
  if (name) {
    try {
      if (typeof mgr.getCompletionPresetByName === 'function') {
        var pByName = mgr.getCompletionPresetByName(name);
        if (pByName && typeof pByName === 'object') return pByName;
      }
    } catch (eB) {}
  }
  try {
    if (typeof mgr.getPresetList === 'function') {
      var list = mgr.getPresetList();
      if (list && list.presets) {
        if (Array.isArray(list.presets)) {
          if (name && list.preset_names && list.preset_names[name] != null) {
            var idx = list.preset_names[name];
            if (list.presets[idx]) return list.presets[idx];
          }
          for (var i = 0; i < list.presets.length; i++) {
            if (prismObjMatch(list.presets[i])) return list.presets[i];
          }
        } else if (typeof list.presets === 'object') {
          if (name && list.presets[name]) return list.presets[name];
        }
      }
    }
  } catch (eL) {}
  return null;
}

function prismPresetTargets() {
  var out = [];
  function add(p) {
    if (!p || typeof p !== 'object') return;
    for (var i = 0; i < out.length; i++) if (out[i] === p) return;
    out.push(p);
  }
  try {
    var ctx = (typeof stCtx === 'function') ? stCtx() : null;
    if (ctx) {
      if (ctx.chatCompletionSettings && prismObjMatch(ctx.chatCompletionSettings)) add(ctx.chatCompletionSettings);
      if (ctx.preset && prismObjMatch(ctx.preset)) add(ctx.preset);
      if (typeof ctx.getPresetManager === 'function') {
        var mgr = ctx.getPresetManager('openai') || ctx.getPresetManager();
        var pmObj = prismLookupFromMgr(mgr);
        if (prismObjMatch(pmObj)) add(pmObj);
      }
    }
  } catch (eC) {}
  try {
    var th = prismTavernHelper();
    if (th && typeof th.getPreset === 'function') {
      var thObj = th.getPreset('in_use');
      if (prismObjMatch(thObj)) add(thObj);
    }
  } catch (eT) {}
  return out;
}

function prismFindPresetObj() {
  var list = prismPresetTargets();
  return list.length ? list[0] : null;
}

function isPrismPresetActive() {
  try {
    var b = prismBridge();
    if (b && typeof b.isActivePreset === 'function') {
      try {
        if (b.isActivePreset()) return true;
      } catch (eB) {}
    }
    var ctx = (typeof stCtx === 'function') ? stCtx() : null;
    if (ctx) {
      if (ctx.chatCompletionSettings && prismObjMatch(ctx.chatCompletionSettings)) return true;
      if (ctx.preset && prismObjMatch(ctx.preset)) return true;
      if (typeof ctx.getPresetManager === 'function') {
        var mgr = ctx.getPresetManager('openai') || ctx.getPresetManager();
        var pmObj = prismLookupFromMgr(mgr);
        if (prismObjMatch(pmObj)) return true;
      }
    }
    var th = prismTavernHelper();
    if (th && typeof th.getPreset === 'function') {
      var thObj = th.getPreset('in_use');
      if (prismObjMatch(thObj)) return true;
    }
  } catch (e) {}
  return false;
}

function getPrismView() {
  syncGlobalSiblings();
  if (typeof PRISM_VIEW === 'string' && PRISM_VIEW.indexOf('sibling:') === 0) {
    var sid = PRISM_VIEW.slice(8);
    if (getSiblingById(sid)) return PRISM_VIEW;
    PRISM_VIEW = 'luke';
    return 'luke';
  }
  if (PRISM_VIEW === 'prism' && isPrismPresetActive()) return 'prism';
  PRISM_VIEW = 'luke';
  return 'luke';
}

function setPrismView(v) {
  syncGlobalSiblings();
  var next = 'luke';
  if (v === 'prism' && isPrismPresetActive()) {
    next = 'prism';
  } else if (typeof v === 'string' && v.indexOf('sibling:') === 0 && getSiblingById(v.slice(8))) {
    next = v;
  }
  if (PRISM_VIEW !== next && AR6_SIB_MOUNTED) {
    unmountActiveSibling();
  }
  PRISM_VIEW = next;
  if (next === 'prism') {
    try { prismSyncSynergyGuard(); } catch (eG) {}
  }
  try { if (typeof UI_SIG === 'object' && UI_SIG) UI_SIG = {}; } catch (eS) {}
  try {
    if (typeof DOC !== 'undefined' && DOC && DOC.querySelector) {
      var bd = DOC.querySelector('#' + ROOT_ID + ' .ar6-body');
      if (bd) bd.scrollTop = 0;
    }
  } catch (eSc) {}
  try { if (typeof render === 'function' && (typeof DISPOSED === 'undefined' || !DISPOSED)) render(); } catch (eR) {}
  return PRISM_VIEW;
}

function openPrismPanel() {
  try { PANEL_OPENED_AT = Date.now(); } catch (e0) {}
  try { minimized = false; } catch (e1) {}
  try { MORE_OPEN = false; } catch (e2) {}
  try {
    if (typeof cfg === 'object' && cfg) {
      cfg.docked = false;
      cfg.min = false;
      if (typeof saveCfg === 'function') saveCfg();
    }
  } catch (e3) {}
  PRISM_VIEW = isPrismPresetActive() ? 'prism' : 'luke';
  if (PRISM_VIEW === 'prism') {
    try { prismSyncSynergyGuard(); } catch (eG) {}
  }
  try { if (typeof UI_SIG === 'object' && UI_SIG) UI_SIG = {}; } catch (e4) {}
  try { if (typeof render === 'function') render(); } catch (e5) {}
  try { if (typeof syncPill === 'function') syncPill(); } catch (e6) {}
  return PRISM_VIEW;
}

function prismPickActiveOrder(preset) {
  if (!preset || !Array.isArray(preset.prompt_order)) return null;
  var orders = preset.prompt_order;
  var fallback = null;
  for (var i = 0; i < orders.length; i++) {
    var o = orders[i];
    if (!o || !Array.isArray(o.order)) continue;
    if (Number(o.character_id) === 100001) return o.order;
    if (Number(o.character_id) === 100000 && !fallback) fallback = o.order;
    if (!fallback) fallback = o.order;
  }
  return fallback;
}

function prismExtractTextValue(rawContent) {
  var s = String(rawContent == null ? '' : rawContent);
  var m = /\{\{setvar::([^:}]+)::([\s\S]*?)\}\}/.exec(s);
  if (m) return m[2];
  return s.replace(/^\{\{trim\}\}/, '');
}

function prismInjectTextValue(oldContent, varName, nextVal) {
  var v = String(nextVal == null ? '' : nextVal);
  var safeV = v.replace(/\}\}/g, '｝｝');
  var oldStr = String(oldContent == null ? '' : oldContent);
  var re = /\{\{setvar::([^:}]+)::([\s\S]*?)\}\}/;
  if (re.test(oldStr)) {
    return oldStr.replace(re, function (_, vn) {
      return '{{setvar::' + vn + '::' + safeV + '}}';
    });
  }
  if (oldStr.indexOf('{{setvar::') < 0 && !varName) {
    return v;
  }
  if (varName) {
    return '{{trim}}{{setvar::' + String(varName) + '::' + safeV + '}}';
  }
  return v;
}

function prismCollectSnapshot() {
  var targets = prismPresetTargets();
  var preset = targets.length ? targets[0] : null;
  var b = prismBridge();
  var bSnap = null;
  if (b && typeof b.getSnapshot === 'function') {
    try { bSnap = b.getSnapshot(); } catch (eBS) { bSnap = null; }
  }
  var meta = null;
  try {
    if (preset && preset.extensions && preset.extensions.lk_prism_meta) {
      meta = preset.extensions.lk_prism_meta;
    } else {
      for (var ti = 0; ti < targets.length; ti++) {
        if (targets[ti] && targets[ti].extensions && targets[ti].extensions.lk_prism_meta) {
          meta = targets[ti].extensions.lk_prism_meta;
          break;
        }
      }
      if (!meta && bSnap && bSnap.meta) meta = bSnap.meta;
    }
  } catch (eM) { meta = null; }

  var items = (meta && meta.items && typeof meta.items === 'object') ? meta.items : {};
  var enabledMap = {};
  var textMap = {};
  var promptMap = {};

  if (preset && Array.isArray(preset.prompts)) {
    for (var pi = 0; pi < preset.prompts.length; pi++) {
      var pr = preset.prompts[pi];
      var prId = prismPromptId(pr);
      if (pr && prId) promptMap[prId] = pr;
    }
  }

  var activeOrder = prismPickActiveOrder(preset);
  var orderMap = {};
  if (activeOrder) {
    for (var oi = 0; oi < activeOrder.length; oi++) {
      var oe = activeOrder[oi];
      var oeId = prismPromptId(oe);
      if (oe && oeId) orderMap[oeId] = !!oe.enabled;
    }
  }

  var bridgeStates = (bSnap && (bSnap.enabledMap || bSnap.enabled || bSnap.states || bSnap.itemsState)) || null;
  var bridgeTexts = (bSnap && (bSnap.texts || bSnap.customTexts || bSnap.textMap)) || null;
  var nowTs = Date.now();

  var keys = Object.keys(items);
  var activeCount = 0;
  for (var i = 0; i < keys.length; i++) {
    var id = keys[i];
    var it = items[id] || {};
    var en;
    if (Object.prototype.hasOwnProperty.call(orderMap, id)) {
      en = orderMap[id];
    } else if (promptMap[id] && typeof promptMap[id].enabled === 'boolean') {
      en = promptMap[id].enabled;
    } else if (bridgeStates && Object.prototype.hasOwnProperty.call(bridgeStates, id)) {
      en = !!bridgeStates[id];
    } else {
      en = !!(it.locked || it.defaultEnabled);
    }
    var optEn = PRISM_OPT_EN[id];
    if (optEn) {
      if (optEn.exp > nowTs) en = !!optEn.v;
      else { try { delete PRISM_OPT_EN[id]; } catch (eOptE) {} }
    }
    if (it.locked) en = true;
    enabledMap[id] = !!en;
    if (en) activeCount++;

    if (it.kind === 'text') {
      if (promptMap[id]) {
        textMap[id] = prismExtractTextValue(promptMap[id].content);
      } else if (bridgeTexts && Object.prototype.hasOwnProperty.call(bridgeTexts, id)) {
        textMap[id] = String(bridgeTexts[id] == null ? '' : bridgeTexts[id]);
      } else {
        textMap[id] = '';
      }
      var optTx = PRISM_OPT_TX[id];
      if (optTx) {
        if (optTx.exp > nowTs) textMap[id] = String(optTx.v == null ? '' : optTx.v);
        else { try { delete PRISM_OPT_TX[id]; } catch (eOptT) {} }
      }
    }
  }

  return {
    preset: preset,
    meta: meta,
    items: items,
    keys: keys,
    enabledMap: enabledMap,
    textMap: textMap,
    activeCount: activeCount,
    totalCount: keys.length
  };
}

function prismCountActive() {
  try {
    var snap = prismCollectSnapshot();
    return snap.activeCount || 0;
  } catch (e) { return 0; }
}

function prismSetEntryEnabled(preset, id, val) {
  if (!preset || typeof preset !== 'object') return false;
  var changed = false;
  var flag = !!val;
  if (Array.isArray(preset.prompts)) {
    for (var i = 0; i < preset.prompts.length; i++) {
      var p = preset.prompts[i];
      if (p && prismPromptId(p) === id) {
        if (p.enabled !== flag) { p.enabled = flag; changed = true; }
      }
    }
  }
  if (Array.isArray(preset.prompt_order)) {
    for (var j = 0; j < preset.prompt_order.length; j++) {
      var block = preset.prompt_order[j];
      if (!block || !Array.isArray(block.order)) continue;
      var found = false;
      for (var k = 0; k < block.order.length; k++) {
        var oe = block.order[k];
        if (oe && prismPromptId(oe) === id) {
          if (oe.enabled !== flag) { oe.enabled = flag; changed = true; }
          found = true;
        }
      }
      if (!found && (Number(block.character_id) === 100000 || Number(block.character_id) === 100001 || preset.prompt_order.length === 1)) {
        block.order.push({ identifier: id, enabled: flag });
        changed = true;
      }
    }
  }
  return changed;
}

function prismMutatePreset(mutatorFn, metaInfo) {
  if (PRISM_SYNC_GUARD) return false;
  PRISM_SYNC_GUARD = true;
  var mutated = false;
  var hasAsync = false;
  var thRet = null;
  try {
    var th = prismTavernHelper();
    if (th && typeof th.updatePresetWith === 'function') {
      try {
        thRet = th.updatePresetWith('in_use', function (cur) {
          if (cur && prismObjMatch(cur)) {
            if (mutatorFn(cur)) mutated = true;
          }
          return cur;
        }, { render: 'debounced' });
      } catch (eTH) { thRet = null; }
    }

    var seen = [];
    var targets = prismPresetTargets();
    for (var ti = 0; ti < targets.length; ti++) {
      var obj = targets[ti];
      if (!obj || typeof obj !== 'object') continue;
      var dup = false;
      for (var si = 0; si < seen.length; si++) if (seen[si] === obj) { dup = true; break; }
      if (dup) continue;
      seen.push(obj);
      if (mutatorFn(obj)) mutated = true;
    }

    var ctx = (typeof stCtx === 'function') ? stCtx() : null;
    if (ctx && typeof ctx.saveSettingsDebounced === 'function') {
      try { ctx.saveSettingsDebounced(); } catch (eSD) {}
    }

    var b = prismBridge();
    if (b) {
      try {
        if (typeof b.onSync === 'function') b.onSync(metaInfo || {});
        else if (typeof b.syncNow === 'function') b.syncNow();
      } catch (eBr) {}
    }

    if (thRet && typeof thRet.then === 'function') {
      hasAsync = true;
      thRet.then(function () {
        try {
          var ctx2 = (typeof stCtx === 'function') ? stCtx() : null;
          if (ctx2 && typeof ctx2.saveSettingsDebounced === 'function') {
            try { ctx2.saveSettingsDebounced(); } catch (eSD2) {}
          }
          var b2 = prismBridge();
          if (b2 && typeof b2.syncNow === 'function' && !PRISM_SYNC_GUARD) {
            PRISM_SYNC_GUARD = true;
            try { b2.syncNow(); } catch (eBr2) {} finally { PRISM_SYNC_GUARD = false; }
          }
          if (typeof UI_SIG === 'object' && UI_SIG) UI_SIG = {};
          if (typeof render === 'function' && (typeof DISPOSED === 'undefined' || !DISPOSED)) render();
        } catch (eThDone) {}
      }, function () {});
    }
  } finally {
    PRISM_SYNC_GUARD = false;
  }
  return !!(mutated || hasAsync);
}

function prismLukeNarrOwns() {
  try {
    return !!(typeof cfg === 'object' && cfg && (cfg.know !== 'off' || cfg.charm !== 'off' || cfg.ooc === 'on'));
  } catch (e) { return false; }
}

function prismSyncSynergyGuard() {
  if (!prismLukeNarrOwns() || !isPrismPresetActive()) return false;
  var snap = prismCollectSnapshot();
  if (!snap.enabledMap || !snap.enabledMap.base_standalone_guard) return false;
  if (snap.preset) {
    prismSetOptEn('base_standalone_guard', false);
    return prismMutatePreset(function (p) {
      return prismSetEntryEnabled(p, 'base_standalone_guard', false);
    }, { type: 'synergy-yield', id: 'base_standalone_guard' });
  }
  var b = prismBridge();
  if (b && typeof b.togglePrompt === 'function') {
    try { b.togglePrompt('base_standalone_guard', false); return true; } catch (eB) {}
  }
  return false;
}

function prismTogglePrompt(id, forceVal) {
  var snap = prismCollectSnapshot();
  var item = snap.items ? snap.items[id] : null;
  if (item && item.locked) {
    try {
      if (typeof banner === 'function') banner('🔒 核心模块「' + (item.label || id) + '」为架构基石，保持常驻开启', 'warn', true);
    } catch (eB0) {}
    return false;
  }
  if (item && item.kind === 'radio' && item.radioGroup && forceVal !== false) {
    return prismSelectRadio(item.radioGroup, id);
  }
  var cur = !!snap.enabledMap[id];
  var next = (typeof forceVal === 'boolean') ? forceVal : !cur;

  if (id === 'base_standalone_guard' && next === true && prismLukeNarrOwns()) {
    prismSyncSynergyGuard();
    try {
      if (typeof UI_SIG === 'object' && UI_SIG) UI_SIG = {};
      if (typeof render === 'function') render();
      if (typeof banner === 'function') banner('🛡️ 卢克叙事结界已接管防全知/去媚/反OOC，预设兜底自动避让', 'ok', true);
    } catch (eY) {}
    return false;
  }

  if (snap.preset) {
    prismSetOptEn(id, next);
    prismMutatePreset(function (p) {
      return prismSetEntryEnabled(p, id, next);
    }, { type: 'toggle', id: id, enabled: next });
  } else {
    var b = prismBridge();
    if (b && typeof b.togglePrompt === 'function') {
      try { b.togglePrompt(id, next); } catch (eBT) {}
    } else {
      return false;
    }
  }

  try { if (typeof UI_SIG === 'object' && UI_SIG) UI_SIG = {}; } catch (eU) {}
  try { if (typeof render === 'function' && (typeof DISPOSED === 'undefined' || !DISPOSED)) render(); } catch (eR) {}
  try {
    if (typeof banner === 'function') {
      banner((next ? '✦ 已开启「' : '○ 已待机「') + ((item && item.label) || id) + '」', next ? 'ok' : 'gray');
    }
  } catch (eB1) {}
  return true;
}

function prismSelectRadio(radioGroup, id) {
  var snap = prismCollectSnapshot();
  var items = snap.items || {};
  var targetItem = items[id] || null;
  var rg = radioGroup || (targetItem && targetItem.radioGroup) || '';

  if (snap.preset) {
    var optKeys = Object.keys(items);
    for (var oi = 0; oi < optKeys.length; oi++) {
      var ok = optKeys[oi];
      var oit = items[ok];
      if (oit && rg && oit.radioGroup === rg && ok !== id) prismSetOptEn(ok, false);
    }
    prismSetOptEn(id, true);
    prismMutatePreset(function (p) {
      var changed = false;
      var keys = Object.keys(items);
      for (var i = 0; i < keys.length; i++) {
        var k = keys[i];
        var it = items[k];
        if (!it) continue;
        if (rg && it.radioGroup === rg && k !== id) {
          if (prismSetEntryEnabled(p, k, false)) changed = true;
        }
      }
      if (prismSetEntryEnabled(p, id, true)) changed = true;
      return changed;
    }, { type: 'radio', radioGroup: rg, id: id });
  } else {
    var b = prismBridge();
    if (b && typeof b.selectRadio === 'function') {
      try { b.selectRadio(rg, id); } catch (eBR) {}
    } else {
      return false;
    }
  }

  try { if (typeof UI_SIG === 'object' && UI_SIG) UI_SIG = {}; } catch (eU) {}
  try { if (typeof render === 'function' && (typeof DISPOSED === 'undefined' || !DISPOSED)) render(); } catch (eR) {}
  try {
    if (typeof banner === 'function') {
      banner('✦ 已切换至「' + ((targetItem && targetItem.label) || id) + '」', 'ok');
    }
  } catch (eB) {}
  return true;
}

function prismSaveCustomText(id, val) {
  var snap = prismCollectSnapshot();
  var item = snap.items ? snap.items[id] : null;
  var v = String(val == null ? '' : val);
  try { delete PRISM_DRAFTS[id]; } catch (eD) {}

  if (snap.preset) {
    var shouldEnableOpt = !!v.trim();
    prismSetOptTx(id, v);
    prismSetOptEn(id, shouldEnableOpt);
    prismMutatePreset(function (p) {
      var changed = false;
      if (Array.isArray(p.prompts)) {
        for (var i = 0; i < p.prompts.length; i++) {
          var pr = p.prompts[i];
          if (pr && prismPromptId(pr) === id) {
            var nextContent = prismInjectTextValue(pr.content, item && item.varName, v);
            if (pr.content !== nextContent) { pr.content = nextContent; changed = true; }
          }
        }
      }
      var shouldEnable = !!v.trim();
      if (prismSetEntryEnabled(p, id, shouldEnable)) changed = true;
      return changed;
    }, { type: 'text', id: id, value: v });
  } else {
    var b = prismBridge();
    if (b && typeof b.updateCustomText === 'function') {
      try { b.updateCustomText(id, v); } catch (eBTx) {}
    } else {
      return false;
    }
  }

  try { if (typeof UI_SIG === 'object' && UI_SIG) UI_SIG = {}; } catch (eU) {}
  try { if (typeof render === 'function' && (typeof DISPOSED === 'undefined' || !DISPOSED)) render(); } catch (eR) {}
  try {
    if (typeof banner === 'function') {
      banner('💾 已保存写入「' + ((item && item.label) || id) + '」', 'ok', true);
    }
  } catch (eB) {}
  return true;
}

function prismApplyBundle(bundleId) {
  var snap = prismCollectSnapshot();
  var meta = snap.meta;
  var bundles = (meta && Array.isArray(meta.bundles)) ? meta.bundles : [];
  var bdl = null;
  for (var i = 0; i < bundles.length; i++) {
    if (bundles[i] && bundles[i].id === bundleId) { bdl = bundles[i]; break; }
  }
  if (!bdl) return false;

  if (snap.preset) {
    var itemsOpt = snap.items || {};
    var enArrOpt = Array.isArray(bdl.enable) ? bdl.enable : [];
    var disArrOpt = Array.isArray(bdl.disable) ? bdl.disable : [];
    var enSetOpt = {};
    var rgSeenOpt = {};
    for (var oeIdx = 0; oeIdx < enArrOpt.length; oeIdx++) {
      var oeid = enArrOpt[oeIdx];
      enSetOpt[oeid] = true;
      if (itemsOpt[oeid] && itemsOpt[oeid].radioGroup) rgSeenOpt[itemsOpt[oeid].radioGroup] = true;
    }
    var allKeysOpt = Object.keys(itemsOpt);
    for (var okIdx = 0; okIdx < allKeysOpt.length; okIdx++) {
      var ork = allKeysOpt[okIdx];
      var orit = itemsOpt[ork];
      if (orit && orit.radioGroup && rgSeenOpt[orit.radioGroup] && !enSetOpt[ork] && !orit.locked) {
        prismSetOptEn(ork, false);
      }
    }
    for (var odIdx = 0; odIdx < disArrOpt.length; odIdx++) {
      var odid = disArrOpt[odIdx];
      if (itemsOpt[odid] && itemsOpt[odid].locked) continue;
      prismSetOptEn(odid, false);
    }
    for (var onIdx = 0; onIdx < enArrOpt.length; onIdx++) {
      var onid = enArrOpt[onIdx];
      if (onid === 'base_standalone_guard' && prismLukeNarrOwns()) {
        prismSetOptEn(onid, false);
        continue;
      }
      prismSetOptEn(onid, true);
    }
    prismMutatePreset(function (p) {
      var changed = false;
      var items = snap.items || {};
      var enArr = Array.isArray(bdl.enable) ? bdl.enable : [];
      var disArr = Array.isArray(bdl.disable) ? bdl.disable : [];
      var enSet = {};
      var rgSeen = {};
      for (var eIdx = 0; eIdx < enArr.length; eIdx++) {
        var eid = enArr[eIdx];
        enSet[eid] = true;
        if (items[eid] && items[eid].radioGroup) rgSeen[items[eid].radioGroup] = true;
      }
      var allKeys = Object.keys(items);
      for (var rIdx = 0; rIdx < allKeys.length; rIdx++) {
        var rk = allKeys[rIdx];
        var rit = items[rk];
        if (rit && rit.radioGroup && rgSeen[rit.radioGroup] && !enSet[rk] && !rit.locked) {
          if (prismSetEntryEnabled(p, rk, false)) changed = true;
        }
      }
      for (var dIdx = 0; dIdx < disArr.length; dIdx++) {
        var did = disArr[dIdx];
        if (items[did] && items[did].locked) continue;
        if (prismSetEntryEnabled(p, did, false)) changed = true;
      }
      for (var nIdx = 0; nIdx < enArr.length; nIdx++) {
        var nid = enArr[nIdx];
        if (nid === 'base_standalone_guard' && prismLukeNarrOwns()) {
          if (prismSetEntryEnabled(p, nid, false)) changed = true;
          continue;
        }
        if (prismSetEntryEnabled(p, nid, true)) changed = true;
      }
      return changed;
    }, { type: 'bundle', id: bundleId });
  } else {
    var b = prismBridge();
    if (b && typeof b.applyBundle === 'function') {
      try { b.applyBundle(bundleId); } catch (eBB) {}
    } else {
      return false;
    }
  }

  try { if (typeof UI_SIG === 'object' && UI_SIG) UI_SIG = {}; } catch (eU) {}
  try { if (typeof render === 'function' && (typeof DISPOSED === 'undefined' || !DISPOSED)) render(); } catch (eR) {}
  try {
    if (typeof banner === 'function') {
      banner('⚡ 已一键配装：' + (bdl.name || bundleId), 'ok', true);
    }
  } catch (eB) {}
  return true;
}

function uiPrismSig() {
  try {
    syncGlobalSiblings();
    var sibSig = AR6_SIB_ORDER.join(',');
    var curView = getPrismView();
    if (!isPrismPresetActive()) {
      return sibSig ? ('S:' + curView + ':' + sibSig) : '0';
    }
    var snap = prismCollectSnapshot();
    var bits = [];
    for (var i = 0; i < snap.keys.length; i++) {
      var id = snap.keys[i];
      bits.push(snap.enabledMap[id] ? '1' : '0');
    }
    var txSig = '';
    for (var j = 0; j < snap.keys.length; j++) {
      var tid = snap.keys[j];
      if (snap.items[tid] && snap.items[tid].kind === 'text') {
        txSig += '|' + tid + '=' + (snap.textMap[tid] || '');
      }
    }
    return [
      '1',
      curView,
      sibSig,
      PRISM_TAB,
      PRISM_SEARCH,
      PRISM_SHOW_DESC ? 'D1' : 'D0',
      prismLukeNarrOwns() ? 'L1' : 'L0',
      snap.activeCount,
      bits.join(''),
      txSig
    ].join(':');
  } catch (e) { return '0'; }
}

function uiPrismDualBarHTML(pView) {
  syncGlobalSiblings();
  var view = pView || getPrismView();
  var prismOn = isPrismPresetActive();
  var sibs = listSiblings();
  if (!prismOn && sibs.length === 0) return '';

  var totalMembers = 1 + (prismOn ? 1 : 0) + sibs.length;
  var lukeOn = (view === 'luke');
  var barCls = 'ar6-dualbar' + (totalMembers >= 4 ? ' ar6-quad' : '');
  var h = '<div class="' + barCls + '" role="tablist" aria-label="光域生态单窗切换">' +
    '<button type="button" class="ar6-dualbtn' + (lukeOn ? ' on' : '') + '" data-ar6="wsmode:luke" aria-pressed="' + (lukeOn ? 'true' : 'false') + '">🛡️ 卢克之光</button>';

  if (prismOn) {
    var cnt = prismCountActive();
    var pOn = (view === 'prism');
    h += '<button type="button" class="ar6-dualbtn' + (pOn ? ' on' : '') + '" data-ar6="wsmode:prism" aria-pressed="' + (pOn ? 'true' : 'false') + '">🪞 光域预设 · <span>' + cnt + '</span></button>';
  }

  for (var i = 0; i < sibs.length; i++) {
    var sb = sibs[i];
    var sKey = 'sibling:' + sb.id;
    var sOn = (view === sKey);
    h += '<button type="button" class="ar6-dualbtn' + (sOn ? ' on' : '') + '" data-ar6="wsmode:' + esc(sKey) + '" aria-pressed="' + (sOn ? 'true' : 'false') + '">' +
      esc((sb.icon ? sb.icon + ' ' : '') + (sb.label || sb.id)) + '</button>';
  }

  var badgeTxt = totalMembers >= 4
    ? '⚡ 四生合体'
    : (totalMembers === 3 ? '⚡ 三生合体' : '⚡ 双生联动');
  h += '<span class="ar6-dual-bdg">' + badgeTxt + '</span></div>';
  return h;
}

function prismMatchesQuery(q, id, it) {
  if (!q) return true;
  var hay = [id, it.label || '', it.desc || '', it.sec || '', it.badge || '', it.varName || ''].join(' ').toLowerCase();
  return hay.indexOf(q) >= 0;
}

function prismSwCell(act, label, isOn, extraCls, stOverride, extraAttr, desc) {
  var showDesc = (typeof PRISM_SHOW_DESC === 'undefined' || PRISM_SHOW_DESC) && !!desc;
  if (!showDesc) return swCell(act, label, isOn, extraCls, stOverride, extraAttr);
  var stTxt = stOverride != null ? String(stOverride) : (isOn ? '已开启' : '待机');
  return '<button type="button" class="ar6-b ar6-pr-sw' + (isOn ? ' on' : '') + (extraCls ? ' ' + extraCls : '') + '"' +
    (extraAttr ? ' ' + extraAttr : '') + ' data-ar6="' + esc(act) + '">' +
    '<span class="ar6-pr-swtop"><i class="ar6-pr-dot" aria-hidden="true"></i><span class="ar6-b-lbl">' + esc(label) + '</span>' +
    '<em class="ar6-b-st">' + esc(stTxt) + '</em></span>' +
    '<span class="ar6-pr-swdesc">' + esc(desc) + '</span></button>';
}

function prismRenderSectionsHTML(snap, itemIds, groupByTab) {
  var items = snap.items || {};
  var enabledMap = snap.enabledMap || {};
  var secOrder = [];
  var secMap = {};
  var metaTabs = (snap.meta && Array.isArray(snap.meta.tabs)) ? snap.meta.tabs : PRISM_DEFAULT_TABS;
  var tabTitleMap = {};
  for (var ti = 0; ti < metaTabs.length; ti++) {
    tabTitleMap[metaTabs[ti].id] = (metaTabs[ti].icon ? metaTabs[ti].icon + ' ' : '') + (metaTabs[ti].label || metaTabs[ti].id);
  }

  for (var i = 0; i < itemIds.length; i++) {
    var id = itemIds[i];
    var it = items[id];
    if (!it) continue;
    var secName = String(it.sec || '基础配置');
    var key = groupByTab ? ((tabTitleMap[it.tab] || it.tab || '') + ' · ' + secName) : secName;
    if (!secMap[key]) {
      secMap[key] = [];
      secOrder.push(key);
    }
    secMap[key].push(id);
  }

  var html = '';
  for (var si = 0; si < secOrder.length; si++) {
    var sKey = secOrder[si];
    var list = secMap[sKey];
    var onCnt = 0;
    for (var ci = 0; ci < list.length; ci++) {
      if (enabledMap[list[ci]]) onCnt++;
    }
    html += '<div class="ar6-ugroup">' +
      '<div class="ar6-ug-top"><span class="ar6-ug-title">' + esc(sKey) + '</span>' +
      '<span class="ar6-badge' + (onCnt > 0 ? ' cyan' : '') + '">' + onCnt + '/' + list.length + ' 启用</span></div>';

    var idx = 0;
    while (idx < list.length) {
      var curId = list[idx];
      var curIt = items[curId];
      if (!curIt) { idx++; continue; }

      if (curIt.kind === 'radio' && curIt.radioGroup) {
        var rg = curIt.radioGroup;
        var rgIds = [];
        while (idx < list.length && items[list[idx]] && items[list[idx]].kind === 'radio' && items[list[idx]].radioGroup === rg) {
          rgIds.push(list[idx]);
          idx++;
        }
        var activeDesc = '';
        var rDescsHtml = '';
        var showDescOn = (typeof PRISM_SHOW_DESC === 'undefined' || PRISM_SHOW_DESC);
        html += '<div class="ar6-ubar">';
        for (var ri = 0; ri < rgIds.length; ri++) {
          var rid = rgIds[ri];
          var rit = items[rid];
          var isOn = !!enabledMap[rid];
          if (isOn && rit.desc) activeDesc = rit.desc;
          var cls = 'ar6-ubtn' + (isOn ? ' on' : '') + (rit.badge === '推荐' ? ' gold' : '');
          html += '<button type="button" class="' + cls + '" data-ar6="prism-rad:' + esc(rg) + ':' + esc(rid) + '" title="' + esc(rit.desc || rit.label || rid) + '">' +
            esc(rit.label || rid) + '</button>';
          if (showDescOn && rit.desc) {
            rDescsHtml += '<div class="ar6-pr-rdesc' + (isOn ? ' on' : '') + '"><b>' + esc(rit.label || rid) + '：</b>' + esc(rit.desc) + '</div>';
          }
        }
        html += '</div>';
        if (rDescsHtml) {
          html += '<div class="ar6-pr-rdescs">' + rDescsHtml + '</div>';
        } else if (activeDesc) {
          html += '<div class="ar6-ug-sub">' + esc(activeDesc) + '</div>';
        }
        continue;
      }

      if (curIt.kind === 'text') {
        var tVal = Object.prototype.hasOwnProperty.call(PRISM_DRAFTS, curId)
          ? PRISM_DRAFTS[curId]
          : (snap.textMap && snap.textMap[curId] != null ? snap.textMap[curId] : '');
        var txOn = !!enabledMap[curId];
        html += '<div class="ar6-pr-txwrap">' +
          '<div class="ar6-pr-txhead">' +
            '<span class="ar6-pr-txlbl">' + esc(curIt.label || curId) + '</span>' +
            '<span class="ar6-badge' + (txOn ? ' cyan' : '') + '">' + (txOn ? '已写入启用' : '留空不占Token') + '</span>' +
          '</div>' +
          (curIt.desc ? '<div class="ar6-dline" style="margin:2px 0 6px">' + esc(curIt.desc) + '</div>' : '') +
          '<textarea class="ar6-pr-tx" rows="3" data-ar6-prism-tx="' + esc(curId) + '" placeholder="' + esc(curIt.placeholder || '输入自定义指令内容，留空保存即可关闭…') + '">' + esc(tVal) + '</textarea>' +
          '<div class="ar6-pr-txfoot">' +
            '<span class="ar6-dline" style="margin:0">' + (curIt.varName ? ('槽位变量：' + esc(curIt.varName)) : '') + '</span>' +
            '<button type="button" class="ar6-b ar6-act gold on" data-ar6="prism-save:' + esc(curId) + '"><span>💾 保存写入</span></button>' +
          '</div>' +
        '</div>';
        idx++;
        continue;
      }

      /* toggle / core 开关双列矩阵 */
      html += '<div class="ar6-tgrid">';
      while (idx < list.length && items[list[idx]] && items[list[idx]].kind !== 'text' && !(items[list[idx]].kind === 'radio' && items[list[idx]].radioGroup)) {
        var swId = list[idx];
        var swIt = items[swId];
        var swOn = !!enabledMap[swId];
        var isLocked = !!swIt.locked;
        var isYielded = (swId === 'base_standalone_guard' && prismLukeNarrOwns() && !swOn);
        var actName = isLocked ? ('prism-core:' + swId) : ('prism-sw:' + swId);
        var stWord = isLocked ? '🔒 核心' : (isYielded ? '已让路' : (swOn ? '已开启' : (swIt.badge || '待机')));
        var extraCls = (swIt.badge === '推荐' ? ' gold' : '');
        var extraAttr = 'title="' + esc(swIt.desc || swIt.label || swId) + '"' + (isYielded ? ' data-off="1"' : '');
        html += prismSwCell(actName, swIt.label || swId, swOn, extraCls, stWord, extraAttr, swIt.desc || '');
        idx++;
      }
      html += '</div>';
    }
    html += '</div>';
  }
  return html;
}

function prismRenderBundlesHTML(snap, bundles) {
  var enabledMap = snap.enabledMap || {};
  var html = '<div class="ar6-pr-bdls">';
  for (var i = 0; i < bundles.length; i++) {
    var b = bundles[i];
    if (!b) continue;
    var enArr = Array.isArray(b.enable) ? b.enable : [];
    var disArr = Array.isArray(b.disable) ? b.disable : [];
    var hitEn = 0;
    for (var ei = 0; ei < enArr.length; ei++) {
      if (enabledMap[enArr[ei]]) hitEn++;
    }
    var isCurrent = enArr.length > 0 && hitEn === enArr.length;
    html += '<button type="button" class="ar6-pr-bdl' + (isCurrent ? ' on' : '') + '" data-ar6="prism-bdl:' + esc(b.id) + '">' +
      '<span class="ar6-pr-bdl-top">' +
        '<span class="ar6-pr-bdl-name">' + esc(b.name || b.id) + '</span>' +
        '<span class="ar6-badge' + (isCurrent ? ' gold' : ' cyan') + '">' + (isCurrent ? '当前配装' : (hitEn + '/' + enArr.length + ' 项')) + '</span>' +
      '</span>' +
      '<span class="ar6-pr-bdl-desc">' + esc(b.desc || '') + '</span>' +
      '<span class="ar6-pr-bdl-meta">启用 ' + enArr.length + ' 项 · 静默 ' + disArr.length + ' 项</span>' +
    '</button>';
  }
  html += '</div>';
  return html;
}

function uiPrismListHTML(snapArg) {
  var snap = snapArg || prismCollectSnapshot();
  if (!snap.meta) {
    return '<div class="ar6-hint">已识别《光域·镜界》预设，等待预设元数据就绪…</div>';
  }
  var q = String(PRISM_SEARCH || '').trim().toLowerCase();
  var items = snap.items || {};
  var bundles = Array.isArray(snap.meta.bundles) ? snap.meta.bundles : [];

  if (q) {
    var matchedIds = [];
    for (var i = 0; i < snap.keys.length; i++) {
      var id = snap.keys[i];
      if (prismMatchesQuery(q, id, items[id])) matchedIds.push(id);
    }
    var matchedBundles = [];
    for (var bi = 0; bi < bundles.length; bi++) {
      var b = bundles[bi];
      var bHay = [b.id || '', b.name || '', b.desc || ''].join(' ').toLowerCase();
      if (bHay.indexOf(q) >= 0) matchedBundles.push(b);
    }
    if (!matchedIds.length && !matchedBundles.length) {
      return '<div class="ar6-hint">未找到与「' + esc(PRISM_SEARCH) + '」匹配的预设模块或方案。</div>';
    }
    var out = '<div class="ar6-dline" style="margin:6px 12px 0">🔍 搜索「' + esc(PRISM_SEARCH) + '」命中 ' + matchedIds.length + ' 个模块' +
      (matchedBundles.length ? (' · ' + matchedBundles.length + ' 套方案') : '') + '</div>';
    if (matchedIds.length) out += prismRenderSectionsHTML(snap, matchedIds, true);
    if (matchedBundles.length) {
      out += '<div class="ar6-ugroup"><div class="ar6-ug-top"><span class="ar6-ug-title">匹配的场景一键配装</span></div>' +
        prismRenderBundlesHTML(snap, matchedBundles) + '</div>';
    }
    return out;
  }

  if (PRISM_TAB === 'bundles') {
    return '<div class="ar6-ugroup"><div class="ar6-ug-top"><span class="ar6-ug-title">' + bundles.length + ' 大场景一键配装方案</span>' +
      '<span class="ar6-badge cyan">0-Token 切换</span></div>' +
      prismRenderBundlesHTML(snap, bundles) +
      '<div class="ar6-ug-sub">点击任意场景卡即刻重排全套开关与文风轨道；仍可在上方各分栏继续微调单一项。</div></div>';
  }

  var tabIds = [];
  for (var k = 0; k < snap.keys.length; k++) {
    var key = snap.keys[k];
    if (items[key] && items[key].tab === PRISM_TAB) tabIds.push(key);
  }
  if (!tabIds.length) {
    return '<div class="ar6-hint">当前分栏暂无可配置条目。</div>';
  }
  return prismRenderSectionsHTML(snap, tabIds, false);
}

function uiPrismHTML() {
  if (!isPrismPresetActive()) return '';
  try { prismSyncSynergyGuard(); } catch (eG) {}
  var snap = prismCollectSnapshot();
  var meta = snap.meta || {};
  var tabs = (Array.isArray(meta.tabs) && meta.tabs.length) ? meta.tabs : PRISM_DEFAULT_TABS;

  var validTab = false;
  for (var ti = 0; ti < tabs.length; ti++) {
    if (tabs[ti].id === PRISM_TAB) { validTab = true; break; }
  }
  if (!validTab && tabs.length) PRISM_TAB = tabs[0].id;

  var tabsHtml = '<div class="ar6-pr-tabs" role="tablist" aria-label="光域预设功能分栏">';
  for (var i = 0; i < tabs.length; i++) {
    var tb = tabs[i];
    var on = (tb.id === PRISM_TAB);
    tabsHtml += '<button type="button" class="ar6-pr-tab' + (on ? ' on' : '') + '" data-ar6="prism-tab:' + esc(tb.id) + '" aria-pressed="' + (on ? 'true' : 'false') + '" title="' + esc(tb.title || tb.label) + '">' +
      '<span>' + esc((tb.icon ? tb.icon + ' ' : '') + tb.label) + '</span></button>';
  }
  tabsHtml += '</div>';

  var searchHtml = '<div class="ar6-pr-search">' +
    '<input type="text" data-ar6="prism-search" data-ar6-prism-search="1" value="' + esc(PRISM_SEARCH) + '" placeholder="🔍 搜索预设模块 / 文风 / 去油 / 思维链 / MVU…">' +
    (PRISM_SEARCH ? '<button type="button" class="ar6-b ar6-act" data-ar6="prism-search-clear"><span>清空</span></button>' : '') +
    '<button type="button" class="ar6-b ar6-act' + (PRISM_SHOW_DESC ? ' on' : '') + '" data-ar6="prism-desc-toggle" title="展开/收起逐条功能简介"><span>' + (PRISM_SHOW_DESC ? '📖 详述' : '📋 精简') + '</span></button>' +
    '</div>';

  var lukeOwns = prismLukeNarrOwns();
  var guardOn = !!(snap.enabledMap && snap.enabledMap.base_standalone_guard);
  var synParts = [];
  if (typeof cfg === 'object' && cfg) {
    if (cfg.know !== 'off') synParts.push('防全知(' + cfg.know + ')');
    if (cfg.charm !== 'off') synParts.push('去媚(' + cfg.charm + ')');
    if (cfg.ooc === 'on') synParts.push('反OOC');
  }
  var synHtml = '<div class="ar6-pr-syn' + (lukeOwns ? ' active' : '') + '">' +
    (lukeOwns
      ? ('<div class="ar6-pr-syn-t">🛡️ 卢克叙事结界已接管防全知/去媚/反OOC<span class="ar6-badge cyan">' + esc(synParts.join(' · ')) + '</span></div>' +
         '<div class="ar6-pr-syn-d">当前预设独立防线（base_standalone_guard）已自动让路静默，避免重复条款互相冲突。</div>')
      : ('<div class="ar6-pr-syn-t">⚡ 双生协同就绪 · ' + esc(meta.name || '光域·镜界') + '<span class="ar6-badge">' + snap.activeCount + '/' + snap.totalCount + ' 项激活</span></div>' +
         '<div class="ar6-pr-syn-d">卢克之光护航防路由与破甲续写 · 独立兜底守卫 ' + (guardOn ? '已开启' : '待机（按需在「角色世界」启用）') + '。</div>')) +
    '</div>';

  return '<div class="ar6-pr-area">' +
    tabsHtml +
    searchHtml +
    synHtml +
    '<div class="ar6-pr-list" data-ar6-prism-list="1">' + uiPrismListHTML(snap) + '</div>' +
    '</div>';
}

function prismRefreshListInPlace() {
  try {
    var d = (typeof DOC !== 'undefined' && DOC) ? DOC : null;
    if (!d) return false;
    var r = d.getElementById(typeof ROOT_ID !== 'undefined' ? ROOT_ID : 'ar6-root');
    if (!r) return false;
    var listEl = r.querySelector('[data-ar6-prism-list="1"]');
    if (!listEl) return false;
    var html = uiPrismListHTML();
    if (listEl.innerHTML !== html) listEl.innerHTML = html;
    if (typeof bindDirect === 'function') bindDirect(listEl);
    if (typeof UI_SIG === 'object' && UI_SIG && typeof uiBaseSig === 'function') {
      UI_SIG.prism = (typeof UI_TAB !== 'undefined' ? UI_TAB : 'route') + '|' + uiBaseSig() + '|prism';
    }
    return true;
  } catch (e) { return false; }
}

function onPrismPresetSwitch() {
  try {
    if (typeof DISPOSED !== 'undefined' && DISPOSED) return;
    if (!isPrismPresetActive()) {
      PRISM_VIEW = 'luke';
      PRISM_OPT_EN = {};
      PRISM_OPT_TX = {};
      PRISM_DRAFTS = {};
    } else {
      prismSyncSynergyGuard();
    }
    if (typeof UI_SIG === 'object' && UI_SIG) UI_SIG = {};
    if (typeof minimized === 'undefined' || !minimized) {
      if (typeof render === 'function') render();
    }
  } catch (e) {}
}

function prismEmitLifecycle() {
  var ws = prismWins();
  for (var i = 0; i < ws.length; i++) {
    try {
      var w = ws[i];
      if (!w || typeof w.dispatchEvent !== 'function') continue;
      var ev = (typeof w.CustomEvent === 'function')
        ? new w.CustomEvent('ar6:lifecycle')
        : { type: 'ar6:lifecycle', bubbles: false, cancelable: false };
      w.dispatchEvent(ev);
      var evReady = (typeof w.CustomEvent === 'function')
        ? new w.CustomEvent('ar6:host-ready')
        : { type: 'ar6:host-ready', bubbles: false, cancelable: false };
      w.dispatchEvent(evReady);
    } catch (e) {}
  }
}

function prismEmitSkinChanged(skinName) {
  var skNow = skinName || ((typeof skinId === 'function') ? skinId() : 'ultra');
  var ws = prismWins();
  for (var i = 0; i < ws.length; i++) {
    try {
      var w = ws[i];
      if (!w || typeof w.dispatchEvent !== 'function') continue;
      var ev = (typeof w.CustomEvent === 'function')
        ? new w.CustomEvent('ar6:skin-changed', { detail: { skin: skNow } })
        : { type: 'ar6:skin-changed', detail: { skin: skNow }, bubbles: false, cancelable: false };
      w.dispatchEvent(ev);
    } catch (e) {}
  }
}

function prismDocs() {
  var out = [];
  function pushD(d) {
    if (!d || typeof d !== 'object') return;
    for (var i = 0; i < out.length; i++) if (out[i] === d) return;
    out.push(d);
  }
  try { if (typeof DOC !== 'undefined' && DOC) pushD(DOC); } catch (e0) {}
  var ws = prismWins();
  for (var i = 0; i < ws.length; i++) {
    try { if (ws[i] && ws[i].document) pushD(ws[i].document); } catch (e1) {}
  }
  return out;
}

function prismElHasClass(el, cls) {
  if (!el || el.nodeType !== 1) return false;
  var cn = '';
  try { cn = String(el.className || ''); } catch (e) { cn = ''; }
  return (' ' + cn + ' ').indexOf(' ' + cls + ' ') >= 0;
}

function prismElHasLkpClass(el, cls) {
  return prismElHasClass(el, cls) || prismElHasClass(el, 'custom-' + cls);
}

function prismIsChoiceWrap(el) {
  return prismElHasLkpClass(el, 'lkp-ch-wrap') || prismElHasLkpClass(el, 'lkp-choices');
}

function prismSetElClass(el, cls, on) {
  if (!el || el.nodeType !== 1) return;
  try {
    if (el.classList) {
      if (on) el.classList.add(cls);
      else el.classList.remove(cls);
      return;
    }
  } catch (eCL) {}
  var parts = String(el.className || '').split(/\s+/);
  var out = [];
  for (var i = 0; i < parts.length; i++) {
    if (parts[i] && parts[i] !== cls) out.push(parts[i]);
  }
  if (on) out.push(cls);
  el.className = out.join(' ');
}

function prismFindAncestor(el, pred) {
  var cur = el;
  while (cur && cur.nodeType === 1) {
    var cid = '';
    try { cid = String(cur.id || ''); } catch (eId) { cid = ''; }
    if (cid === 'ar6-root' || cid === 'lkp-standalone-root') return null;
    if (pred(cur)) return cur;
    cur = cur.parentNode;
  }
  return null;
}

function prismCollectCmodeBtns(rootEl) {
  if (!rootEl) return [];
  try {
    if (typeof rootEl.querySelectorAll === 'function') {
      var res = rootEl.querySelectorAll('[data-lkp-cmode]');
      if (res) return res;
    }
  } catch (eQ) {}
  var list = [];
  var walk = function (node) {
    if (!node || node.nodeType !== 1) return;
    if (node.getAttribute && node.getAttribute('data-lkp-cmode')) list.push(node);
    var ch = node.children || node.childNodes || [];
    for (var i = 0; i < ch.length; i++) walk(ch[i]);
  };
  walk(rootEl);
  return list;
}

function prismFireInputEvents(el, d) {
  if (!el) return;
  var types = ['input', 'change'];
  for (var i = 0; i < types.length; i++) {
    try {
      var evt = null;
      if (typeof Event === 'function') evt = new Event(types[i], { bubbles: true });
      else if (d && typeof d.createEvent === 'function') {
        evt = d.createEvent('Event');
        evt.initEvent(types[i], true, true);
      } else {
        evt = { type: types[i], bubbles: true };
      }
      if (typeof el.dispatchEvent === 'function') el.dispatchEvent(evt);
    } catch (eEv) {}
  }
  var ws = prismWins();
  for (var wi = 0; wi < ws.length; wi++) {
    try {
      var jq = ws[wi] && ws[wi].$;
      if (typeof jq === 'function') {
        jq(el).val(el.value).trigger('input').trigger('change');
        break;
      }
    } catch (eJQ) {}
  }
}

function prismOnDocClick(ev) {
  try {
    if (typeof DISPOSED !== 'undefined' && DISPOSED) return;
    if (!ev || ev.defaultPrevented || ev.__lkpChHandled) return;
    var t = ev.target;
    if (!t || t.nodeType !== 1) {
      if (t && t.parentNode && t.parentNode.nodeType === 1) t = t.parentNode;
      else return;
    }
    var modeBtn = prismFindAncestor(t, function (n) {
      return !!(n.getAttribute && n.getAttribute('data-lkp-cmode') && !prismIsChoiceWrap(n));
    });
    var chBtn = modeBtn ? null : prismFindAncestor(t, function (n) {
      return prismElHasLkpClass(n, 'lkp-ch-btn') || !!(n.getAttribute && (n.getAttribute('data-lkp-send') || n.getAttribute('data-lkp-choice')));
    });
    var hitEl = modeBtn || chBtn;
    if (!hitEl) return;

    var nowC = Date.now();
    if ((hitEl.__lkpChAt && (nowC - hitEl.__lkpChAt) < 450) || (PRISM_CH_LAST_EL === hitEl && (nowC - PRISM_CH_LAST_AT) < 450)) return;
    hitEl.__lkpChAt = nowC;
    PRISM_CH_LAST_EL = hitEl;
    PRISM_CH_LAST_AT = nowC;

    var wrap = prismFindAncestor(hitEl, prismIsChoiceWrap);

    if (modeBtn) {
      var mVal = String(modeBtn.getAttribute('data-lkp-cmode') || 'send') === 'fill' ? 'fill' : 'send';
      PRISM_CHOICE_MODE = mVal;
      ev.__lkpChHandled = true;
      try { if (wrap && wrap.setAttribute) wrap.setAttribute('data-lkp-cmode', mVal); } catch (eWr) {}
      var btns = prismCollectCmodeBtns(wrap || modeBtn.parentNode);
      for (var bi = 0; bi < btns.length; bi++) {
        var b = btns[bi];
        if (!b || b === wrap || prismIsChoiceWrap(b)) continue;
        var bMode = String(b.getAttribute('data-lkp-cmode') || '');
        var isOn = (bMode === mVal);
        prismSetElClass(b, 'on', isOn);
        prismSetElClass(b, 'custom-on', isOn);
        try {
          if (b.setAttribute) {
            b.setAttribute('data-lkp-active', isOn ? '1' : '0');
            b.setAttribute('aria-pressed', isOn ? 'true' : 'false');
          }
        } catch (eAp) {}
      }
      try {
        var lsW = (typeof HOST !== 'undefined' && HOST && HOST.localStorage) ? HOST.localStorage : (typeof localStorage !== 'undefined' ? localStorage : null);
        if (lsW) lsW.setItem('lkp_choice_mode', mVal);
      } catch (eLsM) {}
      return;
    }

    if (chBtn) {
      ev.__lkpChHandled = true;
      try { if (typeof ev.preventDefault === 'function') ev.preventDefault(); } catch (ePr) {}
      var rawTx = '';
      if (chBtn.getAttribute) {
        rawTx = chBtn.getAttribute('data-lkp-send') || chBtn.getAttribute('data-lkp-choice') || chBtn.getAttribute('data-lkp-text') || chBtn.getAttribute('data-choice') || '';
      }
      if (!rawTx) {
        var spTx = chBtn.querySelector ? chBtn.querySelector('span') : null;
        rawTx = (spTx && spTx.textContent) || chBtn.textContent || '';
      }
      var tx = String(rawTx).replace(/^\s+|\s+$/g, '');
      if (!tx) return;

      var effMode = PRISM_CHOICE_MODE || 'send';
      if (wrap) {
        var foundWrapMode = '';
        if (wrap.getAttribute) {
          var wAttr = String(wrap.getAttribute('data-lkp-cmode') || '');
          if (wAttr === 'fill' || wAttr === 'send') foundWrapMode = wAttr;
        }
        if (!foundWrapMode) {
          var mBtns = prismCollectCmodeBtns(wrap);
          for (var mi = 0; mi < mBtns.length; mi++) {
            var mb = mBtns[mi];
            if (!mb || mb === wrap || prismIsChoiceWrap(mb)) continue;
            var mbAct = prismElHasLkpClass(mb, 'on') || (mb.getAttribute && mb.getAttribute('data-lkp-active') === '1');
            if (mbAct && mb.getAttribute) {
              var activeM = String(mb.getAttribute('data-lkp-cmode') || '');
              if (activeM === 'fill' || activeM === 'send') { foundWrapMode = activeM; break; }
            }
          }
        }
        if (foundWrapMode) effMode = foundWrapMode;
      } else if (chBtn.getAttribute && chBtn.getAttribute('data-lkp-mode')) {
        var bm = String(chBtn.getAttribute('data-lkp-mode'));
        if (bm === 'fill' || bm === 'send') effMode = bm;
      }

      var docs = prismDocs();
      var ta = null, sendBtn = null, hitDoc = null;
      for (var di = 0; di < docs.length; di++) {
        var d = docs[di];
        try {
          if (!ta && typeof d.getElementById === 'function') {
            var candTa = d.getElementById('send_textarea');
            if (candTa) { ta = candTa; hitDoc = d; }
          }
          if (!sendBtn && typeof d.getElementById === 'function') {
            var candSb = d.getElementById('send_but');
            if (candSb) sendBtn = candSb;
          }
        } catch (eLookup) {}
      }

      if (ta) {
        ta.value = tx;
        try { if (typeof ta.focus === 'function') ta.focus(); } catch (eFc) {}
        prismFireInputEvents(ta, hitDoc);
      }

      if (effMode === 'send') {
        if (sendBtn && !sendBtn.disabled) {
          if (typeof sendBtn.click === 'function') sendBtn.click();
          else if (typeof sendBtn.dispatchEvent === 'function') {
            try { sendBtn.dispatchEvent(typeof Event === 'function' ? new Event('click', { bubbles: true }) : { type: 'click', bubbles: true }); } catch (eC) {}
          }
        } else if (ta && typeof ta.dispatchEvent === 'function') {
          try {
            var kd = (typeof KeyboardEvent === 'function')
              ? new KeyboardEvent('keydown', { key: 'Enter', code: 'Enter', keyCode: 13, which: 13, bubbles: true })
              : { type: 'keydown', key: 'Enter', keyCode: 13, which: 13, bubbles: true };
            ta.dispatchEvent(kd);
          } catch (eKd) {}
        }
      } else if (ta) {
        try {
          if (typeof ta.setSelectionRange === 'function') ta.setSelectionRange(tx.length, tx.length);
          if (typeof ta.scrollIntoView === 'function') ta.scrollIntoView({ block: 'nearest' });
        } catch (eSr) {}
        try { if (typeof banner === 'function') banner('✏️ 已填入输入框，可微调后发送', 'ok'); } catch (eBn) {}
      }

      try {
        if (wrap && typeof wrap.querySelectorAll === 'function') {
          var allCh = wrap.querySelectorAll('.lkp-ch-btn, .custom-lkp-ch-btn, [data-lkp-send], [data-lkp-choice]');
          for (var ci = 0; ci < allCh.length; ci++) {
            prismSetElClass(allCh[ci], 'done', false);
            prismSetElClass(allCh[ci], 'custom-done', false);
            if (allCh[ci].setAttribute) allCh[ci].setAttribute('data-lkp-done', '0');
          }
        }
        prismSetElClass(chBtn, 'done', true);
        prismSetElClass(chBtn, 'custom-done', true);
        if (chBtn.setAttribute) chBtn.setAttribute('data-lkp-done', '1');
        var toastEl = (wrap && typeof wrap.querySelector === 'function') ? wrap.querySelector('.lkp-ch-toast, .custom-lkp-ch-toast') : null;
        if (toastEl) toastEl.textContent = (effMode === 'send' ? '⚡ 已直发：' : '✏️ 已填入输入框：') + tx.slice(0, 26);
      } catch (eDone) {}
    }
  } catch (e) {}
}

function prismBindStHooks() {
  try {
    if (PRISM_EVT_BOUND) return true;
    var boundAny = false;
    var ctx = (typeof stCtx === 'function') ? stCtx() : null;
    if (ctx && ctx.eventSource && typeof ctx.eventSource.on === 'function') {
      var ET = ctx.eventTypes || {};
      var evNames = [];
      if (ET.PRESET_CHANGED != null) evNames.push(ET.PRESET_CHANGED);
      if (ET.OAI_PRESET_CHANGED_AFTER != null) evNames.push(ET.OAI_PRESET_CHANGED_AFTER);
      else evNames.push('oai_preset_changed_after');
      if (ET.SETTINGS_UPDATED != null) evNames.push(ET.SETTINGS_UPDATED);
      for (var i = 0; i < evNames.length; i++) {
        var nm = evNames[i];
        var dup = false;
        for (var j = 0; j < i; j++) if (evNames[j] === nm) { dup = true; break; }
        if (dup) continue;
        ctx.eventSource.on(nm, onPrismPresetSwitch);
        PRISM_EVT_REFS.push({ es: ctx.eventSource, name: nm, fn: onPrismPresetSwitch });
        boundAny = true;
      }
    }
    var syncFn = function () {
      if (PRISM_SYNC_GUARD) return;
      onPrismPresetSwitch();
    };
    var sibChgFn = function () {
      var prevOrd = AR6_SIB_ORDER.join(',');
      var changed = syncGlobalSiblings();
      if (!changed && AR6_SIB_ORDER.join(',') === prevOrd) return;
      try { if (typeof UI_SIG === 'object' && UI_SIG) UI_SIG = {}; } catch (eS0) {}
      try { if (typeof minimized === 'undefined' || !minimized) { if (typeof render === 'function') render(); } } catch (eS1) {}
    };
    var ws = prismWins();
    for (var wi = 0; wi < ws.length; wi++) {
      try {
        if (ws[wi] && typeof ws[wi].addEventListener === 'function') {
          ws[wi].addEventListener('lkp:sync', syncFn);
          PRISM_EVT_REFS.push({ domTarget: ws[wi], name: 'lkp:sync', fn: syncFn });
          ws[wi].addEventListener('lk:siblings-changed', sibChgFn);
          PRISM_EVT_REFS.push({ domTarget: ws[wi], name: 'lk:siblings-changed', fn: sibChgFn });
          boundAny = true;
        }
      } catch (eW) {}
    }
    var docs = prismDocs();
    for (var di = 0; di < docs.length; di++) {
      try {
        var d = docs[di];
        if (d && typeof d.addEventListener === 'function') {
          d.addEventListener('lkp:sync', syncFn);
          PRISM_EVT_REFS.push({ domTarget: d, name: 'lkp:sync', fn: syncFn });
          d.addEventListener('click', prismOnDocClick, false);
          PRISM_EVT_REFS.push({ domTarget: d, name: 'click', fn: prismOnDocClick });
          boundAny = true;
        }
      } catch (eD) {}
    }
    PRISM_EVT_BOUND = boundAny;
    return boundAny;
  } catch (e) { return false; }
}

function prismUnbindStHooks() {
  try {
    for (var i = 0; i < PRISM_EVT_REFS.length; i++) {
      var rec = PRISM_EVT_REFS[i];
      if (!rec) continue;
      if (rec.domTarget && typeof rec.domTarget.removeEventListener === 'function') {
        rec.domTarget.removeEventListener(rec.name, rec.fn);
        continue;
      }
      if (!rec.es) continue;
      if (typeof rec.es.removeListener === 'function') rec.es.removeListener(rec.name, rec.fn);
      else if (typeof rec.es.off === 'function') rec.es.off(rec.name, rec.fn);
    }
  } catch (e) {}
  PRISM_EVT_REFS = [];
  PRISM_EVT_BOUND = false;
  PRISM_CH_LAST_EL = null;
  PRISM_CH_LAST_AT = 0;
}
