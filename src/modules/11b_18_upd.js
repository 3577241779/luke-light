/* ===== 18_upd.js ===== */
/* ============================================================================
 * 卢克之光 V5.5 — 光之星轨 · 云端自动更新（18/Upd）
 *
 * 目的：通过 GitHub 仓库清单（dist/version.json）自动/手动核对最新版，
 * 按当前运行平台（st / tt / desktop）精准拉取对应脚本包，原地写回酒馆助手
 * 脚本表并保存，个人配置（ar6.cfg / ar6.log）独立存储 100% 无损保留。
 *
 * 铁律：
 *   - 只发 GET；只认 http:// 与 https://；绝不 eval 任何远程代码。
 *   - 网络请求直走未挂钩的原生 origFetch，绝不触发反路由采样与日志污染。
 *   - 严格校验 JSON 结构、体积上限（6MB）、VERSION 一致性及 PLATFORM 匹配，绝不错装。
 *   - 三级写入兼容：酒馆助手新版脚本树 API → extensionSettings.tavern_helper 递归扫描（支持文件夹）→ 只读环境手动下载兜底。
 *   - 写盘失败宁可回滚并报错，绝不谎报「已装」；刷新页面前内存保留备份，随时可一键撤回。
 *   - 后台自动检查遇到断网/超时一律保持静默，绝不弹错打扰聊天。
 * ========================================================================== */

var UPD_KEY = 'ar6.upd';
var UPD_TTL = 8000;
var UPD_PKG_TTL = 35000;
var UPD_PKG_MAX = 6 * 1024 * 1024;
var UPD_URL_MAX = 500;
var UPD_BOOT_DELAY = 4200;
var UPD_COOLDOWN = 6 * 60 * 60 * 1000;

var UPD_REPO = '3577241779/luke-light';
var UPD_BRANCH = 'main';
var UPD_MANIFEST_PATH = 'dist/version.json';
var UPD_SELF_NAME_RE = /卢克之光|Anti-?Route/i;
var UPD_VER_RE = /^\d+\.\d+(?:\.\d+)?$/;
var UPD_LINE_RE = /^v?(\d+\.\d+(?:\.\d+)?)$/;

var UPD_BAK = null;
var UPD_BUSY = false;
var UPD_NOSELF_WHY = '';
var UPD_BOOT_TIMER = null;
var UPD_FAST_HOST = '';
var UPD_RT = {
  checking: false,
  installing: false,
  installedVer: '',
  saveKind: '',
  fallbackUrl: '',
  lastErr: ''
};

function updPlatform() {
  try {
    if (typeof PLATFORM !== 'undefined') {
      var p = String(PLATFORM || '').toLowerCase();
      if (p === 'st' || p === 'tt' || p === 'desktop') return p;
    }
  } catch (e0) {}
  try {
    if (typeof uiMode === 'function' && uiMode() === 'mobile') return 'st';
  } catch (e1) {}
  return 'desktop';
}

function updPlatformLabel(plat) {
  var p = plat || updPlatform();
  if (p === 'st') return 'ST手机适配';
  if (p === 'tt') return 'TT手机适配';
  return '桌面宽屏版';
}

function updPkgFile(plat) {
  var p = plat || updPlatform();
  if (p === 'st') return 'dist/luke-light-st.json';
  if (p === 'tt') return 'dist/luke-light-tt.json';
  return 'dist/luke-light-desktop.json';
}

function updAutoOn() {
  try { return !(cfg && cfg.updAuto === false); }
  catch (e) { return true; }
}

function updUrlOk(u) {
  try {
    var s = String(u == null ? '' : u).trim();
    if (!s || s.length >= UPD_URL_MAX) return false;
    if (/[\s\u0000-\u001f]/.test(s)) return false;
    if (s.indexOf('http://') !== 0 && s.indexOf('https://') !== 0) return false;
    var rest = s.slice(s.indexOf('://') + 3);
    if (rest.length < 3 || rest.charAt(0) === '/') return false;
    return true;
  } catch (e) { return false; }
}

function updCmp(a, b) {
  try {
    var sa = String(a == null ? '' : a).trim().replace(/^v/i, '');
    var sb = String(b == null ? '' : b).trim().replace(/^v/i, '');
    if (!UPD_VER_RE.test(sa) || !UPD_VER_RE.test(sb)) return 0;
    var pa = sa.split('.');
    var pb = sb.split('.');
    var n = pa.length > pb.length ? pa.length : pb.length;
    for (var i = 0; i < n; i++) {
      var x = i < pa.length ? parseInt(pa[i], 10) : 0;
      var y = i < pb.length ? parseInt(pb[i], 10) : 0;
      if (!isFinite(x) || !isFinite(y)) return 0;
      if (x > y) return 1;
      if (x < y) return -1;
    }
    return 0;
  } catch (e) { return 0; }
}

function updState() {
  try {
    var raw = (typeof ar6LsGet === 'function')
      ? ar6LsGet(UPD_KEY)
      : (HOST && HOST.localStorage ? HOST.localStorage.getItem(UPD_KEY) : null);
    var o = JSON.parse(raw || '{}');
    if (!o || typeof o !== 'object' || Array.isArray(o)) return {};
    return o;
  } catch (e) { return {}; }
}

function updSave(o) {
  try {
    var txt = JSON.stringify(o || {});
    if (typeof ar6LsSet === 'function') ar6LsSet(UPD_KEY, txt);
    else if (HOST && HOST.localStorage) HOST.localStorage.setItem(UPD_KEY, txt);
  } catch (e) {}
}

function updHostOf(u) {
  try {
    var m = String(u || '').match(/^https?:\/\/([^\/]+)/i);
    return m ? m[1].toLowerCase() : '';
  } catch (e) { return ''; }
}

function updExtractRepoPath(u) {
  try {
    var clean = String(u || '').split('?')[0];
    var m = clean.match(/^https:\/\/raw\.githubusercontent\.com\/([^\/]+)\/([^\/]+)\/([^\/]+)\/(.+)$/);
    if (m) return { owner: m[1], repo: m[2], branch: m[3], path: m[4] };
    m = clean.match(/^https:\/\/(?:cdn|fastly)\.jsdelivr\.net\/gh\/([^\/]+)\/([^\/]+)@([^\/]+)\/(.+)$/);
    if (m) return { owner: m[1], repo: m[2], branch: m[3], path: m[4] };
  } catch (e) {}
  return null;
}

function updMirrorList(u) {
  var out = [];
  function pushUnique(url) {
    if (!updUrlOk(url)) return;
    if (out.indexOf(url) < 0) out.push(url);
  }
  var info = updExtractRepoPath(u);
  if (info) {
    var bust = '?t=' + Date.now();
    var cands = [
      'https://cdn.jsdelivr.net/gh/' + info.owner + '/' + info.repo + '@' + info.branch + '/' + info.path + bust,
      'https://raw.githubusercontent.com/' + info.owner + '/' + info.repo + '/' + info.branch + '/' + info.path + bust,
      'https://fastly.jsdelivr.net/gh/' + info.owner + '/' + info.repo + '@' + info.branch + '/' + info.path + bust
    ];
    if (UPD_FAST_HOST) {
      cands.sort(function (a, b) {
        var ha = updHostOf(a) === UPD_FAST_HOST ? 0 : 1;
        var hb = updHostOf(b) === UPD_FAST_HOST ? 0 : 1;
        return ha - hb;
      });
    }
    for (var i = 0; i < cands.length; i++) pushUnique(cands[i]);
    return out;
  }
  pushUnique(u);
  return out;
}

function updManifestUrl() {
  return 'https://cdn.jsdelivr.net/gh/' + UPD_REPO + '@' + UPD_BRANCH + '/' + UPD_MANIFEST_PATH;
}

function updDefaultPkgUrl(plat) {
  return 'https://cdn.jsdelivr.net/gh/' + UPD_REPO + '@' + UPD_BRANCH + '/' + updPkgFile(plat);
}

function updFetchCall(u, opts) {
  try {
    if (typeof origFetch === 'function') return origFetch.call(HOST || window, u, opts);
  } catch (e0) {}
  try {
    if (HOST && typeof HOST.fetch === 'function') return HOST.fetch(u, opts);
  } catch (e1) {}
  try {
    if (SELF_WIN && typeof SELF_WIN.fetch === 'function') return SELF_WIN.fetch(u, opts);
  } catch (e2) {}
  try {
    if (typeof fetch === 'function') return fetch(u, opts);
  } catch (e3) {}
  return null;
}

function updGetOnce(u, ttl) {
  return new Promise(function (resolve) {
    var done = false, timer = null, ctl = null;
    function fin(o) {
      if (done) return;
      done = true;
      try {
        if (timer) {
          if (HOST && typeof HOST.clearTimeout === 'function') HOST.clearTimeout(timer);
          else if (typeof clearTimeout === 'function') clearTimeout(timer);
        }
      } catch (eC) {}
      timer = null;
      resolve(o);
    }
    try {
      var opts = { method: 'GET', cache: 'no-store', headers: { 'Accept': 'application/json, text/plain' } };
      try {
        var AC = (HOST && typeof HOST.AbortController === 'function')
          ? HOST.AbortController
          : ((typeof AbortController === 'function') ? AbortController : null);
        if (AC) ctl = new AC();
      } catch (eA) { ctl = null; }
      if (ctl) { try { opts.signal = ctl.signal; } catch (eS) {} }
      try {
        var setT = (HOST && typeof HOST.setTimeout === 'function')
          ? HOST.setTimeout
          : ((typeof setTimeout === 'function') ? setTimeout : null);
        if (setT) {
          timer = setT.call(HOST || undefined, function () {
            try { if (ctl) ctl.abort(); } catch (eB) {}
            fin({ ok: false, err: 'net', timeout: true });
          }, ttl || UPD_TTL);
        }
      } catch (eT) { timer = null; }
      var p = updFetchCall(u, opts);
      if (!p || typeof p.then !== 'function') { fin({ ok: false, err: 'net' }); return; }
      Promise.resolve(p).then(function (res) {
        if (!res || res.ok === false) {
          fin({ ok: false, err: 'http', status: res ? res.status : 0 });
          return null;
        }
        return Promise.resolve(res.text()).then(function (text) {
          fin({ ok: true, text: String(text == null ? '' : text), via: updHostOf(u) });
        });
      }).then(null, function (e) {
        fin({ ok: false, err: 'net', cross: !!(e && String(e.name) === 'TypeError') });
      });
    } catch (e2) { fin({ ok: false, err: 'net' }); }
  });
}

function updGet(u, ttl, validateFn) {
  if (!updUrlOk(u)) return Promise.resolve({ ok: false, err: 'nourl' });
  var list = updMirrorList(u);
  if (!list.length) return Promise.resolve({ ok: false, err: 'nourl' });
  var errs = [];
  function next(idx) {
    if (idx >= list.length) {
      var bestHttp = null, bestVal = null, allCross = true, anyTimeout = false;
      for (var i = 0; i < errs.length; i++) {
        var er = errs[i] || {};
        if (er.valErr && !bestVal) bestVal = er;
        if (er.err === 'http' && !bestHttp) bestHttp = er;
        if (!er.cross) allCross = false;
        if (er.timeout) anyTimeout = true;
      }
      if (bestVal) return Promise.resolve(bestVal);
      return Promise.resolve({
        ok: false,
        err: bestHttp ? 'http' : 'net',
        status: bestHttp ? (bestHttp.status || 0) : 0,
        cross: !bestHttp && allCross,
        timeout: anyTimeout
      });
    }
    return updGetOnce(list[idx], ttl).then(function (r) {
      if (r && r.ok) {
        if (typeof validateFn === 'function') {
          var vr = validateFn(r.text);
          if (vr && !vr.ok) {
            vr.valErr = true;
            errs.push(vr);
            return next(idx + 1);
          }
        }
        if (r.via) UPD_FAST_HOST = r.via;
        return r;
      }
      errs.push(r || { err: 'net' });
      return next(idx + 1);
    });
  }
  return next(0);
}

function updParseManifest(text, plat) {
  var p = plat || updPlatform();
  var out = { v: '', url: '', changelog: '' };
  try {
    var s = String(text == null ? '' : text);
    try {
      var o = JSON.parse(s);
      if (o && typeof o === 'object' && !Array.isArray(o)) {
        var names = ['version', 'tag', 'tag_name'];
        for (var i = 0; i < names.length; i++) {
          var raw = o[names[i]];
          if (raw == null) continue;
          var v = String(raw).trim().replace(/^v/i, '');
          if (UPD_VER_RE.test(v)) { out.v = v; break; }
        }
        if (o.packages && typeof o.packages === 'object') {
          var pu = o.packages[p] || o.packages[String(p).toLowerCase()];
          if (pu && updUrlOk(pu)) out.url = String(pu).trim();
        }
        if (!out.url) {
          var u = o.url || o.download || o.file;
          if (u && updUrlOk(u)) out.url = String(u).trim();
        }
        if (!out.url && out.v) out.url = updDefaultPkgUrl(p);
        if (typeof o.changelog === 'string') out.changelog = o.changelog.trim().slice(0, 160);
        if (out.v) return out;
      }
    } catch (eJ) {}
    var lines = s.split(/\r?\n/);
    for (var j = 0; j < lines.length; j++) {
      var m = UPD_LINE_RE.exec(String(lines[j]).trim());
      if (m) {
        out.v = m[1];
        out.url = updDefaultPkgUrl(p);
        return out;
      }
    }
  } catch (e) {}
  return out;
}

function updLatestTagManifest(ttl) {
  var apiUrl = 'https://data.jsdelivr.com/v1/packages/gh/' + UPD_REPO + '?t=' + Date.now();
  return updGetOnce(apiUrl, ttl).then(function (r) {
    if (!r || !r.ok || !r.text) return { ok: false, err: 'net' };
    var bestTag = '', bestVer = '';
    try {
      var o = JSON.parse(String(r.text));
      var vers = o && Array.isArray(o.versions) ? o.versions : [];
      for (var i = 0; i < vers.length; i++) {
        var it = vers[i];
        var raw = typeof it === 'string' ? it : (it && (it.version || it.name || ''));
        var tagStr = String(raw || '').trim();
        var clean = tagStr.replace(/^v/i, '');
        if (!UPD_VER_RE.test(clean)) continue;
        if (!bestVer || updCmp(clean, bestVer) > 0) {
          bestVer = clean;
          bestTag = tagStr;
        }
      }
    } catch (eJ) { return { ok: false, err: 'parse' }; }
    if (!bestTag) return { ok: false, err: 'parse' };
    var tagRef = /^v/i.test(bestTag) ? bestTag : ('v' + bestTag);
    var mUrl = 'https://cdn.jsdelivr.net/gh/' + UPD_REPO + '@' + tagRef + '/' + UPD_MANIFEST_PATH;
    return updGetOnce(mUrl, ttl).then(function (r2) {
      if (r2 && r2.ok) return r2;
      if (tagRef !== bestTag) {
        return updGetOnce('https://cdn.jsdelivr.net/gh/' + UPD_REPO + '@' + bestTag + '/' + UPD_MANIFEST_PATH, ttl);
      }
      return r2 || { ok: false, err: 'net' };
    });
  })['catch'](function () { return { ok: false, err: 'net' }; });
}

function updCheck(force) {
  return new Promise(function (fin) {
    try {
      if (!force && !updAutoOn()) { fin({ ok: false, err: 'off' }); return; }
      var u = updManifestUrl();
      UPD_RT.checking = true;
      try { UI_SIG = {}; if (typeof render === 'function') render(); } catch (eR0) {}
      var rawDirectUrl = 'https://raw.githubusercontent.com/' + UPD_REPO + '/' + UPD_BRANCH + '/' + UPD_MANIFEST_PATH + '?t=' + Date.now();
      Promise.all([
        updGet(u, UPD_TTL),
        updLatestTagManifest(UPD_TTL),
        updGetOnce(rawDirectUrl, UPD_TTL)
      ]).then(function (list) {
        UPD_RT.checking = false;
        var r0 = list[0];
        var plat = updPlatform();
        var best = null;
        for (var i = 0; i < list.length; i++) {
          var ri = list[i];
          if (!ri || !ri.ok) continue;
          var parsed = updParseManifest(ri.text, plat);
          if (!parsed || !parsed.v) continue;
          if (!best || updCmp(parsed.v, best.full.v) > 0) {
            best = { r: ri, full: parsed };
          }
        }
        if (!best) {
          var anyOk = (r0 && r0.ok) || (list[1] && list[1].ok) || (list[2] && list[2].ok);
          var errCode = anyOk ? 'parse' : ((r0 && r0.err) || 'net');
          UPD_RT.lastErr = errCode;
          try { UI_SIG = {}; if (typeof render === 'function') render(); } catch (eR1) {}
          fin({ ok: false, err: errCode, status: r0 && r0.status, cross: r0 && r0.cross, timeout: r0 && r0.timeout });
          return;
        }
        var full = best.full;
        var v = full.v;
        UPD_RT.lastErr = '';
        var prev = updState();
        var nextSt = {
          at: Date.now(),
          latest: v,
          url: u,
          pkgUrl: full.url || updDefaultPkgUrl(plat),
          changelog: full.changelog || '',
          installedVer: (prev && prev.installedVer && updCmp(prev.installedVer, VERSION) > 0) ? prev.installedVer : ''
        };
        updSave(nextSt);
        var newer = updCmp(v, VERSION) > 0;
        if (!newer) UPD_RT.fallbackUrl = '';
        try { UI_SIG = {}; if (typeof render === 'function') render(); } catch (eR3) {}
        fin({ ok: true, latest: v, pkgUrl: nextSt.pkgUrl, changelog: nextSt.changelog, newer: newer });
      })['catch'](function () {
        UPD_RT.checking = false;
        UPD_RT.lastErr = 'net';
        try { UI_SIG = {}; if (typeof render === 'function') render(); } catch (eR4) {}
        fin({ ok: false, err: 'net' });
      });
    } catch (e) {
      UPD_RT.checking = false;
      fin({ ok: false, err: 'net' });
    }
  });
}

/* ---------------- 酒馆助手脚本定位与多代际安全写回 ---------------- */

function updCurrentScriptId() {
  try {
    if (SELF_WIN && typeof SELF_WIN.getScriptId === 'function') {
      var id0 = SELF_WIN.getScriptId();
      if (id0) return String(id0);
    }
  } catch (e0) {}
  try {
    var th = (SELF_WIN && SELF_WIN.TavernHelper) || (HOST && HOST.TavernHelper) || null;
    if (th && typeof th.getScriptId === 'function') {
      var id1 = th.getScriptId();
      if (id1) return String(id1);
    }
  } catch (e1) {}
  return '';
}

function updHelperApi() {
  var cands = [];
  try { if (SELF_WIN && SELF_WIN.TavernHelper) cands.push(SELF_WIN.TavernHelper); } catch (e0) {}
  try { if (SELF_WIN) cands.push(SELF_WIN); } catch (e1) {}
  try { if (HOST && HOST.TavernHelper) cands.push(HOST.TavernHelper); } catch (e2) {}
  for (var i = 0; i < cands.length; i++) {
    var api = cands[i];
    if (!api) continue;
    try {
      if (typeof api.getScriptTrees === 'function' && typeof api.updateScriptTreesWith === 'function') {
        return api;
      }
    } catch (e3) {}
  }
  return null;
}

function updHostCtx() {
  var roots = [];
  try { if (SELF_WIN) roots.push(SELF_WIN); } catch (e0) {}
  try { if (HOST && roots.indexOf(HOST) < 0) roots.push(HOST); } catch (e1) {}
  var seen = [];
  for (var r = 0; r < roots.length; r++) {
    var w0 = roots[r];
    for (var d0 = 0; d0 < 4 && w0; d0++) {
      if (seen.indexOf(w0) >= 0) break;
      seen.push(w0);
      var c = null;
      try {
        if (w0.SillyTavern && typeof w0.SillyTavern.getContext === 'function') c = w0.SillyTavern.getContext();
      } catch (eC0) { c = null; }
      if (c && c.extensionSettings && typeof c.extensionSettings === 'object') {
        var sv2 = null, kind2 = '';
        try {
          if (typeof c.saveSettings === 'function') { sv2 = c.saveSettings; kind2 = 'sync'; }
          else if (typeof c.saveSettingsDebounced === 'function') { sv2 = c.saveSettingsDebounced; kind2 = 'debounce'; }
        } catch (eS1) { sv2 = null; kind2 = ''; }
        return { settings: c.extensionSettings, save: sv2, saveKind: kind2, loc: (w0.location || null), via: 'ctx' };
      }
      try { w0 = w0.parent; } catch (eP0) { w0 = null; }
    }
  }
  for (var j = 0; j < seen.length; j++) {
    var w = seen[j];
    try {
      if (w.extension_settings && typeof w.extension_settings === 'object') {
        var sv = null, kind = '';
        try {
          if (typeof w.saveSettings === 'function') { sv = w.saveSettings; kind = 'sync'; }
          else if (typeof w.saveSettingsDebounced === 'function') { sv = w.saveSettingsDebounced; kind = 'debounce'; }
        } catch (eS0) { sv = null; kind = ''; }
        return { settings: w.extension_settings, save: sv, saveKind: kind, loc: (w.location || null), via: 'win' };
      }
    } catch (eI) {}
  }
  return null;
}

function updScriptsRoot(th) {
  try {
    if (!th || typeof th !== 'object') return null;
    if (th.script && Array.isArray(th.script.scripts)) return th.script.scripts;
    if (Array.isArray(th.scripts)) return th.scripts;
    if (Array.isArray(th.script)) return th.script;
  } catch (e) {}
  return null;
}

function updWalkScripts(arr, out, depth) {
  if (!Array.isArray(arr) || (depth || 0) > 8) return out;
  for (var i = 0; i < arr.length; i++) {
    var it = arr[i];
    if (!it || typeof it !== 'object') continue;
    if (it.type === 'folder' && Array.isArray(it.scripts)) {
      updWalkScripts(it.scripts, out, (depth || 0) + 1);
      continue;
    }
    if (typeof it.content === 'string') {
      out.push({ list: arr, idx: i, item: it });
    }
  }
  return out;
}

function updPickSelf(entries, preferBodyPrefix) {
  UPD_NOSELF_WHY = '';
  try {
    if (!entries || !entries.length) { UPD_NOSELF_WHY = 'none'; return null; }
    var curId = updCurrentScriptId();
    if (curId) {
      for (var k = 0; k < entries.length; k++) {
        var itK = entries[k].item;
        if (itK && String(itK.id || '') === curId) return entries[k];
      }
    }
    if (preferBodyPrefix) {
      for (var p = 0; p < entries.length; p++) {
        var itP = entries[p].item;
        if (itP && typeof itP.content === 'string' && itP.content.indexOf(preferBodyPrefix) >= 0) {
          return entries[p];
        }
      }
    }
    var best = null, bestScore = -999, tie = false, cand = 0;
    var myPlat = updPlatform();
    for (var i = 0; i < entries.length; i++) {
      var it = entries[i].item;
      if (!it || typeof it.content !== 'string') continue;
      var nm = String(it.name || '');
      var hasVer = it.content.indexOf('var VERSION') >= 0;
      var byName = UPD_SELF_NAME_RE.test(nm) && hasVer;
      var byBody = !byName && hasVer && (it.content.indexOf('AR6') >= 0 || it.content.indexOf('ar6.') >= 0);
      if (!byName && !byBody) continue;
      cand++;

      var sc = byName ? 2 : 1;
      var cv = '', cp = '';
      try { cv = (it.content.match(/var VERSION\s*=\s*'([^']+)'/) || [])[1] || ''; } catch (eV) {}
      try { cp = (it.content.match(/var PLATFORM\s*=\s*'([^']+)'/) || [])[1] || ''; } catch (eP) {}
      if (cv && cv === VERSION) sc += 6;
      if (cp && cp === myPlat) sc += 4;
      if (myPlat === 'st' && /ST|手机/i.test(nm)) sc += 2;
      if (myPlat === 'tt' && /TT/i.test(nm)) sc += 2;
      if (myPlat === 'desktop' && /桌面|desktop/i.test(nm)) sc += 2;
      if (it.enabled === false) sc -= 10;

      if (sc > bestScore) { bestScore = sc; best = entries[i]; tie = false; }
      else if (sc === bestScore) { tie = true; }
    }
    if (!cand) { UPD_NOSELF_WHY = 'none'; return null; }
    if (best && tie) { UPD_NOSELF_WHY = 'tie'; return null; }
    return best;
  } catch (e) {
    UPD_NOSELF_WHY = 'none';
    return null;
  }
}

function updTreeHasVersion(arr, pv) {
  var entries = updWalkScripts(arr, [], 0);
  var needle = "var VERSION = '" + pv + "'";
  for (var i = 0; i < entries.length; i++) {
    var c = String((entries[i].item && entries[i].item.content) || '');
    if (c.indexOf(needle) >= 0) return true;
  }
  return false;
}

function updWaitMs(ms) {
  return new Promise(function (res) {
    var setT = (HOST && typeof HOST.setTimeout === 'function')
      ? HOST.setTimeout
      : ((typeof setTimeout === 'function') ? setTimeout : null);
    if (!setT) { res(); return; }
    setT.call(HOST || undefined, res, ms);
  });
}

function updApplyToItem(target, pkg, body) {
  target.content = body;
  if (pkg.name && typeof pkg.name === 'string' && pkg.name.length <= 80) target.name = pkg.name;
  if (pkg.info && typeof pkg.info === 'string' && pkg.info.length <= 240) target.info = pkg.info;
}

function updInstallViaHelperApi(api, pkg, body, pv) {
  return Promise.resolve().then(function () {
    var trees = api.getScriptTrees({ type: 'global' });
    var entries = updWalkScripts(trees, [], 0);
    var hit = updPickSelf(entries);
    if (!hit) return { skip: true, err: UPD_NOSELF_WHY === 'tie' ? 'noself2' : 'noself' };

    var curV = '';
    try { curV = (String(hit.item.content).match(/var VERSION\s*=\s*'([^']+)'/) || [])[1] || ''; } catch (eC) {}
    if (curV && curV === pv) return { ok: true, already: true, version: pv, saveKind: 'sync' };

    var bak = {
      via: 'api',
      id: String(hit.item.id || ''),
      name: hit.item.name,
      info: hit.item.info,
      content: hit.item.content,
      body: body
    };
    var wrote = false;
    return Promise.resolve(api.updateScriptTreesWith(function (liveTrees) {
      var liveEntries = updWalkScripts(liveTrees, [], 0);
      var liveHit = null;
      if (bak.id) {
        for (var i = 0; i < liveEntries.length; i++) {
          if (String(liveEntries[i].item.id || '') === bak.id) { liveHit = liveEntries[i]; break; }
        }
      }
      if (!liveHit) liveHit = updPickSelf(liveEntries);
      if (liveHit && liveHit.item) {
        updApplyToItem(liveHit.item, pkg, body);
        wrote = true;
      }
      return liveTrees;
    }, { type: 'global' })).then(function () {
      if (!wrote) return { skip: true, err: 'noself' };
      if (typeof api.flushHelperScripts === 'function') {
        return Promise.resolve(api.flushHelperScripts()).then(null, function () {});
      }
      return null;
    }).then(function () {
      var checkTrees = api.getScriptTrees({ type: 'global' });
      if (!updTreeHasVersion(checkTrees, pv)) return { ok: false, err: 'nosave' };
      UPD_BAK = bak;
      return { ok: true, version: pv, saveKind: 'sync' };
    });
  })['catch'](function () {
    return { skip: true, err: 'nohost' };
  });
}

function updInstall() {
  return new Promise(function (fin) {
    var done = false;
    function end(o) {
      if (done) return;
      done = true;
      UPD_BUSY = false;
      UPD_RT.installing = false;
      if (o && o.ok) {
        UPD_RT.installedVer = String(o.version || '');
        UPD_RT.saveKind = String(o.saveKind || '');
        UPD_RT.fallbackUrl = '';
        UPD_RT.lastErr = '';
        var stOk = updState();
        stOk.installedVer = UPD_RT.installedVer;
        updSave(stOk);
      } else if (o && o.err) {
        UPD_RT.lastErr = o.err;
        if (o.err === 'nohost' || o.err === 'noself' || o.err === 'noself2' || o.err === 'nosave') {
          var stEr = updState();
          UPD_RT.fallbackUrl = String((stEr && stEr.pkgUrl) || updDefaultPkgUrl());
        }
      }
      try { UI_SIG = {}; if (typeof render === 'function') render(); } catch (eR) {}
      fin(o);
    }
    if (UPD_BUSY) { fin({ ok: false, err: 'busy' }); return; }
    UPD_BUSY = true;
    UPD_RT.installing = true;
    try { UI_SIG = {}; if (typeof render === 'function') render(); } catch (eR0) {}

    try {
      var st = updState();
      var pkgUrl = String((st && st.pkgUrl) || updDefaultPkgUrl()).trim();
      var want = String((st && st.latest) || '').trim();
      if (!updUrlOk(pkgUrl)) { end({ ok: false, err: 'nopkg' }); return; }

      var api0 = updHelperApi();
      var ctx0 = updHostCtx();
      var root0 = ctx0 && ctx0.settings && updScriptsRoot(ctx0.settings.tavern_helper);
      if (!api0 && !ctx0) { end({ ok: false, err: 'nohost' }); return; }
      if (!api0) {
        var preHit = updPickSelf(updWalkScripts(root0, [], 0));
        if (!preHit) { end({ ok: false, err: UPD_NOSELF_WHY === 'tie' ? 'noself2' : 'noself' }); return; }
      }

      /* V5.65：单条 CDN 镜像遇旧缓存版本号 mismatch / badplat 时自动顺延尝试下一条镜像 */
      var pkgValidator = function (rawTxt) {
        if (!rawTxt) return { ok: false, err: 'empty' };
        if (rawTxt.length > UPD_PKG_MAX) return { ok: false, err: 'big' };
        var pObj = null;
        try { pObj = JSON.parse(rawTxt); } catch (eV0) { pObj = null; }
        var pBody = pObj && typeof pObj.content === 'string' ? pObj.content : '';
        if (!pBody || pBody.indexOf('var VERSION') < 0) return { ok: false, err: 'badpkg' };
        var pVer = '', pPlat = '';
        try { pVer = (pBody.match(/var VERSION\s*=\s*'([^']+)'/) || [])[1] || ''; } catch (eV1) {}
        try { pPlat = (pBody.match(/var PLATFORM\s*=\s*'([^']+)'/) || [])[1] || ''; } catch (eV2) {}
        if (!pVer || !UPD_VER_RE.test(pVer)) return { ok: false, err: 'badpkg' };
        if (want && UPD_VER_RE.test(want) && updCmp(pVer, want) !== 0) {
          return { ok: false, err: 'mismatch', got: pVer, want: want };
        }
        if (pPlat && pPlat !== updPlatform()) {
          return { ok: false, err: 'badplat', got: pPlat, want: updPlatform() };
        }
        return { ok: true };
      };

      updGet(pkgUrl, UPD_PKG_TTL, pkgValidator).then(function (rr) {
        if (!rr || !rr.ok) {
          end({ ok: false, err: (rr && rr.err) || 'net', got: rr && rr.got, want: rr && rr.want, status: rr && rr.status, cross: rr && rr.cross, timeout: rr && rr.timeout });
          return null;
        }
        return Promise.resolve().then(function () {
          var text = rr.text;
          if (!text) { end({ ok: false, err: 'empty' }); return; }
          if (text.length > UPD_PKG_MAX) { end({ ok: false, err: 'big' }); return; }
          var pkg = null;
          try { pkg = JSON.parse(text); } catch (eP) { pkg = null; }
          var body = pkg && typeof pkg.content === 'string' ? pkg.content : '';
          if (!body || body.indexOf('var VERSION') < 0) { end({ ok: false, err: 'badpkg' }); return; }

          var pv = '', pp = '';
          try { pv = (body.match(/var VERSION\s*=\s*'([^']+)'/) || [])[1] || ''; } catch (eG) {}
          try { pp = (body.match(/var PLATFORM\s*=\s*'([^']+)'/) || [])[1] || ''; } catch (eP2) {}
          if (!pv || !UPD_VER_RE.test(pv)) { end({ ok: false, err: 'badpkg' }); return; }
          if (want && UPD_VER_RE.test(want) && updCmp(pv, want) !== 0) {
            end({ ok: false, err: 'mismatch', got: pv, want: want });
            return;
          }
          if (pp && pp !== updPlatform()) {
            end({ ok: false, err: 'badplat', got: pp, want: updPlatform() });
            return;
          }

          /* 通道一：优先尝试酒馆助手新版脚本树官方 API */
          var apiNow = updHelperApi();
          var tryApi = apiNow ? updInstallViaHelperApi(apiNow, pkg, body, pv) : Promise.resolve({ skip: true });
          return tryApi.then(function (ar) {
            if (ar && !ar.skip) {
              end(ar);
              return;
            }
            /* 通道二：直接读写 extension_settings.tavern_helper（递归支持子文件夹与双代际路径） */
            var ctx = updHostCtx();
            if (!ctx) { end({ ok: false, err: 'nohost' }); return; }
            var root = ctx.settings && updScriptsRoot(ctx.settings.tavern_helper);
            var hit = updPickSelf(updWalkScripts(root, [], 0));
            if (!hit) { end({ ok: false, err: UPD_NOSELF_WHY === 'tie' ? 'noself2' : 'noself' }); return; }

            var target = hit.item;
            var curV = '';
            try { curV = (String(target.content).match(/var VERSION\s*=\s*'([^']+)'/) || [])[1] || ''; } catch (eC) {}
            if (curV && curV === pv) { end({ ok: true, already: true, version: pv, saveKind: ctx.saveKind || '' }); return; }
            if (!ctx.save) { end({ ok: false, err: 'nosave' }); return; }

            var bak = { via: 'ctx', id: String(target.id || ''), name: target.name, info: target.info, content: target.content, body: body };
            updApplyToItem(target, pkg, body);

            function rollback() {
              try {
                target.content = bak.content;
                target.name = bak.name;
                target.info = bak.info;
              } catch (eRb) {}
            }

            var debounced = (ctx.saveKind === 'debounce');
            return Promise.resolve().then(function () { return ctx.save(); }).then(function () {
              if (debounced) return updWaitMs(1300);
              return null;
            }).then(function () {
              var c2 = updHostCtx();
              var r2 = c2 && c2.settings && updScriptsRoot(c2.settings.tavern_helper);
              if (!updTreeHasVersion(r2, pv)) {
                rollback();
                end({ ok: false, err: 'nosave' });
                return;
              }
              UPD_BAK = bak;
              end({ ok: true, version: pv, saveKind: debounced ? 'debounce' : 'sync' });
            }, function () {
              rollback();
              end({ ok: false, err: 'nosave' });
            });
          });
        });
      }).then(null, function () { end({ ok: false, err: 'net' }); });
    } catch (e) {
      end({ ok: false, err: 'net' });
    }
  });
}

function updUndo() {
  try {
    if (!UPD_BAK) return { ok: false, err: 'nobak' };
    var prefix = UPD_BAK.body ? String(UPD_BAK.body).slice(0, 140) : '';
    if (UPD_BAK.via === 'api') {
      var api = updHelperApi();
      if (api) {
        var restored = false;
        api.updateScriptTreesWith(function (trees) {
          var entries = updWalkScripts(trees, [], 0);
          var hit = null;
          if (UPD_BAK.id) {
            for (var i = 0; i < entries.length; i++) {
              if (String(entries[i].item.id || '') === UPD_BAK.id) { hit = entries[i]; break; }
            }
          }
          if (!hit) hit = updPickSelf(entries, prefix);
          if (hit && hit.item && (!prefix || String(hit.item.content).indexOf(prefix) >= 0)) {
            hit.item.content = UPD_BAK.content;
            if (UPD_BAK.name != null) hit.item.name = UPD_BAK.name;
            if (UPD_BAK.info != null) hit.item.info = UPD_BAK.info;
            restored = true;
          }
          return trees;
        }, { type: 'global' });
        if (restored) {
          try { if (typeof api.flushHelperScripts === 'function') api.flushHelperScripts(); } catch (eF) {}
          UPD_BAK = null;
          UPD_RT.installedVer = '';
          var stA = updState();
          stA.installedVer = '';
          updSave(stA);
          try { UI_SIG = {}; if (typeof render === 'function') render(); } catch (eRA) {}
          return { ok: true, saveKind: 'sync' };
        }
      }
    }

    var ctx = updHostCtx();
    var root = ctx && ctx.settings && updScriptsRoot(ctx.settings.tavern_helper);
    if (!root) return { ok: false, err: 'nohost' };
    var entries2 = updWalkScripts(root, [], 0);
    var hit2 = null;
    if (UPD_BAK.id) {
      for (var j = 0; j < entries2.length; j++) {
        if (String(entries2[j].item.id || '') === UPD_BAK.id) { hit2 = entries2[j]; break; }
      }
    }
    if (!hit2) hit2 = updPickSelf(entries2, prefix);
    if (!hit2 || !hit2.item) return { ok: false, err: 'noself' };
    if (prefix && String(hit2.item.content).indexOf(prefix) < 0) return { ok: false, err: 'nomatch' };
    if (!ctx.save) return { ok: false, err: 'nosave' };

    var old = { content: hit2.item.content, name: hit2.item.name, info: hit2.item.info };
    hit2.item.content = UPD_BAK.content;
    if (UPD_BAK.name != null) hit2.item.name = UPD_BAK.name;
    if (UPD_BAK.info != null) hit2.item.info = UPD_BAK.info;
    try { ctx.save(); } catch (eS) {
      hit2.item.content = old.content;
      hit2.item.name = old.name;
      hit2.item.info = old.info;
      return { ok: false, err: 'nosave' };
    }
    UPD_BAK = null;
    UPD_RT.installedVer = '';
    var stB = updState();
    stB.installedVer = '';
    updSave(stB);
    try { UI_SIG = {}; if (typeof render === 'function') render(); } catch (eRB) {}
    return { ok: true, saveKind: ctx.saveKind || '' };
  } catch (e) { return { ok: false, err: 'net' }; }
}

function updQuick() {
  if (UPD_BUSY) return Promise.resolve({ ok: false, err: 'busy' });
  return updCheck(true).then(function (r) {
    if (!r || !r.ok) {
      return { ok: false, err: (r && r.err) || 'net', status: (r && r.status) || 0, cross: !!(r && r.cross), timeout: !!(r && r.timeout) };
    }
    if (!r.newer) return { ok: true, newer: false, latest: r.latest || VERSION };
    return updInstall().then(function (i) {
      if (i && i.ok) {
        return { ok: true, newer: true, installed: true, already: !!i.already, version: i.version || r.latest || '', saveKind: i.saveKind || '' };
      }
      return {
        ok: false,
        newer: true,
        err: (i && i.err) || 'net',
        latest: r.latest || '',
        pkgUrl: r.pkgUrl || updDefaultPkgUrl(),
        status: (i && i.status) || 0,
        cross: !!(i && i.cross),
        timeout: !!(i && i.timeout)
      };
    });
  })['catch'](function () { return { ok: false, err: 'net' }; });
}

function updBoot() {
  try {
    if (UPD_BOOT_TIMER) { try { clearTimeout(UPD_BOOT_TIMER); } catch (e0) {} UPD_BOOT_TIMER = null; }
    if (!updAutoOn()) return;
    var setT = (HOST && typeof HOST.setTimeout === 'function')
      ? HOST.setTimeout
      : ((typeof setTimeout === 'function') ? setTimeout : null);
    if (!setT) return;
    UPD_BOOT_TIMER = setT.call(HOST || undefined, function () {
      UPD_BOOT_TIMER = null;
      try {
        if (DISPOSED || !updAutoOn() || UPD_BUSY) return;
        var st = updState();
        var recent = st && st.at && (Date.now() - Number(st.at) < UPD_COOLDOWN);
        var pendingNew = st && st.latest && updCmp(st.latest, VERSION) > 0 && (!st.installedVer || updCmp(st.latest, st.installedVer) > 0);
        if (recent && !pendingNew) return;
        updCheck(false).then(function (r) {
          if (DISPOSED || !r || !r.ok || !r.newer || !updAutoOn()) return;
          return updInstall().then(function (i) {
            if (DISPOSED) return;
            if (i && i.ok && !i.already) {
              try {
                banner('✦ 光之星轨已静默同步 V' + i.version + '：个人配置无损保留，下次刷新页面即刻生效', 'ok', true);
              } catch (eB1) {}
            } else if (i && !i.ok && (i.err === 'nohost' || i.err === 'noself' || i.err === 'nosave')) {
              try {
                banner('✦ 星轨探测到新版 V' + r.latest + '：请前往「防卫设置」一键下载新版包', 'warn', true);
              } catch (eB2) {}
            }
          });
        })['catch'](function () {});
      } catch (eRun) {}
    }, UPD_BOOT_DELAY);
  } catch (e) {}
}

function updStopBoot() {
  try {
    if (UPD_BOOT_TIMER) {
      if (HOST && typeof HOST.clearTimeout === 'function') HOST.clearTimeout(UPD_BOOT_TIMER);
      else if (typeof clearTimeout === 'function') clearTimeout(UPD_BOOT_TIMER);
      UPD_BOOT_TIMER = null;
    }
  } catch (e) {}
}

function updCanUndo() { return !!UPD_BAK; }

function updInstalledVer() {
  if (UPD_RT.installedVer && updCmp(UPD_RT.installedVer, VERSION) > 0) return UPD_RT.installedVer;
  var st = updState();
  if (st && st.installedVer && updCmp(st.installedVer, VERSION) > 0) return String(st.installedVer);
  return '';
}

function updLatest() {
  var st = updState();
  return String((st && st.latest) || '').trim();
}

function updHasNewer() {
  var v = updLatest();
  return !!(v && UPD_VER_RE.test(v) && updCmp(v, VERSION) > 0);
}

function updHasNotice() {
  return !!(updInstalledVer() || updHasNewer());
}

function updStatusSig() {
  var st = updState();
  return [
    updAutoOn() ? 1 : 0,
    UPD_RT.checking ? 1 : 0,
    UPD_RT.installing ? 1 : 0,
    updInstalledVer(),
    updLatest(),
    UPD_BAK ? 1 : 0,
    UPD_RT.fallbackUrl ? 1 : 0,
    String((st && st.at) || 0)
  ].join(':');
}

function updDoneText(version, saveKind) {
  var v = String(version == null ? '' : version);
  if (String(saveKind) === 'sync') {
    return '✦ 光之星轨升级完成：V' + v + ' 已写入酒馆，个人开关全数保留，刷新页面即刻生效';
  }
  return '✦ 光之星轨升级完成：V' + v + ' 正在落盘，请等待 2 秒后刷新页面生效（个人开关全数保留）';
}

function updErrText(code, r) {
  var m = {
    off: '后台自动更新已关闭',
    nourl: '未找到有效的星轨清单地址',
    net: (r && r.timeout) ? '星轨连接超时，请检查网络后重试' : (r && r.cross ? '浏览器拦截了跨域请求' : '暂时连不上 GitHub 与镜像节点，请稍后重试'),
    http: '云端版本清单暂不可达' + (r && r.status ? '（HTTP ' + r.status + '）' : ''),
    parse: '云端版本清单格式无法识别',
    nopkg: '版本清单中缺少当前平台的更新包地址',
    nohost: '当前酒馆环境不开放脚本表写入权限，请使用下方「手动下载新版」导入',
    noself: '脚本表中未定位到「卢克之光」，请确认已导入酒馆助手或点下方「手动下载新版」',
    noself2: '脚本表中存在多份同名「卢克之光」，请先删掉多余旧版后再试',
    big: '更新包超过 6MB 安全上限，已中止写入',
    empty: '云端返回了空内容',
    busy: '星轨同步进行中，请稍候…',
    nomatch: '当前脚本已被手动修改，无法安全回溯，请手动导入旧版',
    badpkg: '下载的包体缺少版本号校验信息，已中止写入',
    badplat: '下载的包体与当前运行平台不匹配，已中止写入防串包',
    mismatch: '下载包体版本号与星轨清单不一致，已中止写入',
    nosave: '写回酒馆设置时未通过落盘校验（已自动回滚），请重试或手动下载新版',
    nobak: '本次会话暂无可回溯的旧版快照'
  };
  return m[code] || ('星轨同步受阻（' + code + '）');
}

function updDownloadFallback() {
  var st = updState();
  var url = UPD_RT.fallbackUrl || String((st && st.pkgUrl) || updDefaultPkgUrl());
  var fileName = '卢克之光 V' + (updLatest() || VERSION) + '·' + (updPlatform() === 'st' ? 'ST酒馆适配' : (updPlatform() === 'tt' ? 'TT酒馆适配' : '桌面版')) + '.json';
  return updGet(url, UPD_PKG_TTL).then(function (r) {
    if (!r || !r.ok || !r.text) {
      try { if (HOST && typeof HOST.open === 'function') HOST.open(url, '_blank'); } catch (eO) {}
      return false;
    }
    try {
      var BlobCtor = (HOST && HOST.Blob) || Blob;
      var URLApi = (HOST && HOST.URL) || URL;
      var blob = new BlobCtor([r.text], { type: 'application/json;charset=utf-8' });
      var href = URLApi.createObjectURL(blob);
      var a = DOC.createElement('a');
      a.href = href;
      a.download = fileName;
      a.style.display = 'none';
      DOC.body.appendChild(a);
      a.click();
      setTimeout(function () {
        try { if (a.parentNode) a.parentNode.removeChild(a); } catch (e1) {}
        try { URLApi.revokeObjectURL(href); } catch (e2) {}
      }, 1500);
      return true;
    } catch (eB) {
      try { if (HOST && typeof HOST.open === 'function') HOST.open(url, '_blank'); } catch (eO2) {}
      return false;
    }
  });
}
