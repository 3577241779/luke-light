/* ============================================================================
 * Anti-Route v8 — 18/Upd 新版本检查与一键更新
 *
 * 目的：脚本跑在「酒馆助手」的脚本表里，自己有权限改这张表——所以能做到
 * 「点一下就把新版换上去」：先 GET 版本文件问「最新是几」，确认有新版，
 * 再 GET 新包，校验里面的 VERSION 与版本文件一致，写回脚本表并保存。
 * 装完需要用户自己刷新一次页面（脚本不能替你刷新）。
 *
 * 铁律：
 *   - 只下载「版本文件」和「脚本包」这两类内容，不 eval、不执行远程代码。
 *   - 只发 GET；只认 http:// 和 https://，其它协议一律拒绝。
 *   - 默认关（cfg.upd === 'off'）只管「开面板自动查」；一键检查更新是用户
 *     主动点，不受这个开关限制（见 updQuick）。
 *   - 写失败宁可报错，也不谎报「已装」（见 updInstall 的 nosave 分支）。
 *   - 查不到不是故障：超时、404、文件写错、断网，全部静默，不打扰用户。
 *
 * 存储：ar6.upd = { at: 毫秒时间戳, latest: '1.2.3', url: '...', pkgUrl: '...' }
 * ========================================================================== */

var UPD_KEY = 'ar6.upd';
var UPD_TTL = 8000;   /* 8 秒。版本文件只是一个几十字节的小文本，超过就是网络有问题 */
var UPD_PKG_TTL = 30000;   /* 包有几百 KB，给 30 秒 */
var UPD_URL_MAX = 500;

/* 内置地址：用户不用填任何东西，点一下就能查、就能装。
   桌面版和 TT 版指向各自的版本文件，靠打包时注入的 UI_MODE 区分。 */
var UPD_URL_D = 'https://raw.githubusercontent.com/3577241779/luke-light/main/dist/version.json';
var UPD_URL_D_M = 'https://raw.githubusercontent.com/3577241779/luke-light/main/dist/version-mobile.json';

function updDefUrl() {
  try {
    if (typeof UI_MODE !== 'undefined' && String(UI_MODE) === 'mobile') return UPD_URL_D_M;
  } catch (e0) {}
  return UPD_URL_D;
}

/* 谁在用这个地址：填了就用填的，没填就用内置的。空着 = 走内置。 */
function updUrl() {
  var u = '';
  try { u = String((cfg && cfg.updUrl) || '').trim(); } catch (e1) { u = ''; }
  return updUrlOk(u) ? u : updDefUrl();
}

/* 内置地址不显示成「已填」，让用户知道这是出厂自带的 */
function updUrlIsDefault() {
  var u = '';
  try { u = String((cfg && cfg.updUrl) || '').trim(); } catch (e2) { u = ''; }
  return !updUrlOk(u);
}

/* 版本号只认「数字 + 点」，前面可以带一个 v。带 -beta 这种后缀的一律不认：
   版本比较是按数字段比的，认不出来还硬比会得出错误的「谁更新」。 */
var UPD_VER_RE = /^\d+\.\d+(?:\.\d+)?$/;
var UPD_LINE_RE = /^v?(\d+\.\d+(?:\.\d+)?)$/;

function updOn() {
  try { return !!cfg && String(cfg.upd == null ? '' : cfg.upd) === 'check'; }
  catch (e) { return false; }
}

/* 只放行 http/https：版本文件是普通静态文本，没有理由用别的协议；
   长度上限是防手滑把整篇文档粘进来（500 已经远超正常 URL）。 */
function updUrlOk(u) {
  try {
    var s = String(u == null ? '' : u).trim();
    if (!s || s.length >= UPD_URL_MAX) return false;
    /* 从文档里粘地址最常见的两种事故：中间夹空格、只剩下 https:// */
    if (/[\s\u0000-\u001f]/.test(s)) return false;
    if (s.indexOf('http://') !== 0 && s.indexOf('https://') !== 0) return false;
    var rest = s.slice(s.indexOf('://') + 3);
    if (rest.length < 3 || rest.charAt(0) === '/') return false;
    return true;
  } catch (e) { return false; }
}

/* 版本文件允许两种写法：
 *   JSON：{"version":"1.2.3"} / {"tag":"v1.2.3"}（GitHub release 的 tag_name 也认）
 *   纯文本：整份文件就一行 1.2.3 或 v1.2.3
 * 统一去掉前导 v 再返回：比较和显示都靠纯数字，两套写法在别处会打架。 */
function updParse(text) {
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
          if (UPD_VER_RE.test(v)) return v;
        }
      }
    } catch (eJ) { /* 不是 JSON 就走下面的按行扫 */ }
    var lines = s.split(/\r?\n/);
    for (var j = 0; j < lines.length; j++) {
      var m = UPD_LINE_RE.exec(String(lines[j]).trim());
      if (m) return m[1];
    }
    return '';
  } catch (e) { return ''; }
}

/* 按点分段比数字，缺位补 0（1.2 == 1.2.0）。
   任一非法返回 0——返回 0 表示「说不清」，调用方据此不下「有新版本」的结论。 */
function updCmp(a, b) {
  try {
    var sa = String(a == null ? '' : a).trim();
    var sb = String(b == null ? '' : b).trim();
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
    var o = JSON.parse(HOST.localStorage.getItem(UPD_KEY) || '{}');
    if (!o || typeof o !== 'object' || Array.isArray(o)) return {};
    return o;
  } catch (e) { return {}; }
}

function updSave(o) {
  try { HOST.localStorage.setItem(UPD_KEY, JSON.stringify(o)); } catch (e) {}
}

/* 只查，不装。force 只给「用户手动点检查」用：关着闸也允许查一次，
   但自动路径（updBoot）必须尊重 updOn()。 */
/* 取文本：主地址失败就换镜像。为什么要镜像——GitHub release 下载会 302 到
   release-assets.githubusercontent.com，那一跳没有 Access-Control-Allow-Origin，
   浏览器 fetch 会被跨域策略直接拦掉；raw 与 jsDelivr 都带 ACAO: *。 */
function updMirror(u) {
  try {
    var t = String(u);
    var m = t.match(/^https:\/\/raw\.githubusercontent\.com\/([^\/]+)\/([^\/]+)\/([^\/]+)\/(.+)$/);
    if (m) return 'https://cdn.jsdelivr.net/gh/' + m[1] + '/' + m[2] + '@' + m[3] + '/' + m[4];
    m = t.match(/^https:\/\/cdn\.jsdelivr\.net\/gh\/([^\/]+)\/([^\/]+)@([^\/]+)\/(.+)$/);
    if (m) return 'https://raw.githubusercontent.com/' + m[1] + '/' + m[2] + '/' + m[3] + '/' + m[4];
  } catch (eM) {}
  return '';
}

function updGetOnce(u, ttl) {
  return new Promise(function (resolve) {
    var done = false, timer = null, ctl = null;
    function fin(o) {
      if (done) return;
      done = true;
      try {
        if (timer) {
          if (typeof HOST.clearTimeout === 'function') HOST.clearTimeout(timer);
          else if (typeof clearTimeout === 'function') clearTimeout(timer);
        }
      } catch (eC) {}
      timer = null;
      resolve(o);
    }
    try {
      if (!HOST || typeof HOST.fetch !== 'function') { fin({ ok: false, err: 'net' }); return; }
      var opts = { method: 'GET', cache: 'no-store', headers: { 'Accept': 'text/plain, application/json' } };
      try { if (typeof HOST.AbortController === 'function') ctl = new HOST.AbortController(); } catch (eA) { ctl = null; }
      if (ctl) { try { opts.signal = ctl.signal; } catch (eS) {} }
      try {
        var setT = (typeof HOST.setTimeout === 'function') ? HOST.setTimeout : (typeof setTimeout === 'function' ? setTimeout : null);
        if (setT) {
          timer = setT.call(HOST, function () {
            try { if (ctl) ctl.abort(); } catch (eB) {}
            fin({ ok: false, err: 'net', timeout: true });
          }, ttl || UPD_TTL);
        }
      } catch (eT) { timer = null; }
      Promise.resolve(HOST.fetch(u, opts)).then(function (res) {
        if (!res || res.ok === false) { fin({ ok: false, err: 'http', status: res ? res.status : 0 }); return null; }
        return Promise.resolve(res.text()).then(function (text) { fin({ ok: true, text: String(text == null ? '' : text) }); });
      }).then(null, function (e) {
        fin({ ok: false, err: 'net', cross: !!(e && String(e.name) === 'TypeError') });
      });
    } catch (e2) { fin({ ok: false, err: 'net' }); }
  });
}

function updGet(u, ttl) {
  if (!updUrlOk(u)) return Promise.resolve({ ok: false, err: 'nourl' });
  return updGetOnce(u, ttl).then(function (r) {
    if (r && r.ok) return r;
    var m = updMirror(u);
    if (!m) return r;
    return updGetOnce(m, ttl).then(function (r2) {
      if (r2 && r2.ok) return r2;
      /* 两侧都失败：把信息量大的那个报上去。404 之类是 http，不是「没网」，
         混成 net 会让人去查网络和跨域，而真正原因是路径没了。 */
      var e1 = (r && r.err) || 'net', e2 = (r2 && r2.err) || 'net';
      var isHttp = (e1 === 'http' || e2 === 'http');
      return {
        ok: false,
        err: isHttp ? 'http' : 'net',
        status: (r && r.status) || (r2 && r2.status) || 0,
        cross: !!(r && r.cross) && !!(r2 && r2.cross),
        timeout: !!(r && r.timeout) || !!(r2 && r2.timeout),
        both: true,
        tried: [e1, e2]
      };
    });
  });
}

function updCheck(force) {
  return new Promise(function (fin) {
    try {
      if (!updOn() && !force) { fin({ ok: false, err: 'off' }); return; }
      var u = updUrl();
      if (!updUrlOk(u)) { fin({ ok: false, err: 'nourl' }); return; }
      updGet(u, UPD_TTL).then(function (r) {
        if (!r || !r.ok) { fin({ ok: false, err: (r && r.err) || 'net', status: r && r.status, cross: r && r.cross }); return; }
        var full = updParseFull(r.text);
        var v = full && full.v;
        if (!v) { fin({ ok: false, err: 'parse' }); return; }
        updSave({ at: Date.now(), latest: v, url: u, pkgUrl: (full && full.url) || '' });
        fin({ ok: true, latest: v, pkgUrl: (full && full.url) || '', newer: updCmp(v, VERSION) > 0 });
      })['catch'](function () { fin({ ok: false, err: 'net' }); });
    } catch (e) { fin({ ok: false, err: 'net' }); }
  });
}

/* 有新版才说话。文案只说「有新版本」，不许承诺「已经帮你更新」——
   这个脚本没有那个能力。 */
function updLine() {
  try {
    var st = updState();
    var v = (st.latest == null) ? '' : String(st.latest).trim();
    if (!v) return '';
    if (!UPD_VER_RE.test(v)) return '';
    if (updCmp(v, VERSION) <= 0) return '';
    return '有新版本 v' + v + '（当前 v' + VERSION + '）';
  } catch (e) { return ''; }
}

/* 启动时查一次。关着闸、没填地址、查询失败、没有新版：一律安静；
   只有「确实有新版」才占一条横幅，别让每次开酒馆都弹一句没用的话。 */
function updBoot() {
  try {
    if (!updOn()) return;
    if (!updUrlOk(updUrl())) return;
    updCheck().then(function (r) {
      try {
        if (r && r.ok && r.newer) {
          banner('⬆ ' + updLine() + '　面板里「版本文件地址」可以下载', 'warn');
        }
      } catch (e2) {}
    }).then(null, function () {});
  } catch (e) {}
}

/* ==========================================================================
 * 一键更新（v0.99）
 *
 * 上一版只能「告诉你有没有新版」。这一版再往下走一步：把新包取回来，
 * 直接写进酒馆助手的脚本表，然后让你刷新一下。
 *
 * 为什么能写：脚本跑在酒馆助手用 srcdoc 建的 iframe 里，同源、没有 sandbox，
 * 所以 window.parent 就是酒馆页；脚本表在 extension_settings.tavern_helper.scripts，
 * 找到自己那一条，换掉 content，再存一次即可。
 *
 * 三条保险：
 *   1. 只认「确实是我们自己」的那一条（名字 / 版本行），找不到宁可不装；
 *   2. 新包必须先解析成功、必须带 VERSION 行，否则一个字节都不写；
 *   3. 旧内容留在内存里，装完给一个「撤销」，刷新前随时能退回去。
 * ========================================================================== */

var UPD_PKG_MAX = 4 * 1024 * 1024;  /* 4MB：现在整包 ~440KB，留足余量但不无限 */
var UPD_BAK = null;
var UPD_BUSY = false;   /* 装的时候按一次，防止连点叠加 */                  /* { idx, content } —— 只在内存里，刷新即失效 */
var UPD_SELF_NAME_RE = /卢克之光|Anti-?Route/i;

/* 从 iframe 往上找酒馆页的 extension_settings。找不到就返回 null：
   宁可让「一键更新」不可用，也不要瞎猜路径去写别人的配置。 */
function updHostCtx() {
  /* 酒馆的设置对象不在 window 上（script.js 是 ES module，extension_settings 只是模块内的变量），
     唯一稳定的入口是 SillyTavern.getContext()。先问它，问不到再退回老办法（window 上直接挂着）。 */
  try {
    var w0 = HOST;
    for (var d0 = 0; d0 < 4 && w0; d0++) {
      var c = null;
      try { if (w0.SillyTavern && typeof w0.SillyTavern.getContext === 'function') c = w0.SillyTavern.getContext(); } catch (eC0) { c = null; }
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
  } catch (e0) {}

  try {
    var w = HOST;
    for (var d = 0; d < 4 && w; d++) {
      try {
        if (w.extension_settings && typeof w.extension_settings === 'object') {
          var sv = null, kind = '';
          try {
            if (typeof w.saveSettings === 'function') { sv = w.saveSettings; kind = 'sync'; }
            else if (typeof w.saveSettingsDebounced === 'function') { sv = w.saveSettingsDebounced; kind = 'debounce'; }
          } catch (eS0) { sv = null; kind = ''; }
          return { settings: w.extension_settings, save: sv, saveKind: kind, loc: w.location || null, via: 'win' };
        }
      } catch (eI) {}
      try { w = w.parent; } catch (eP) { w = null; }
    }
    return null;
  } catch (e) { return null; }
}

/* 在脚本表里认自己：优先名字，其次版本行。两个都不中的一律不当成自己。
   桌面包和 TT 包同时装着时，表里会有两条都像「自己」——这里按
   「版本号等于当前在跑的版本」「名字里的形态对得上」打分，取最高分；
   分不出高低就返回 -1（宁可不装，也不能装到另一条上去）。 */
function updSelfIndex(list) {
  try {
    if (!list || !list.length) return -1;
    var best = -1, bestScore = -1, tie = false;
    var mob = false;
    try { mob = (typeof UI_MODE !== 'undefined' && String(UI_MODE) === 'mobile'); } catch (eM) {}
    for (var i = 0; i < list.length; i++) {
      var it = list[i];
      if (!it || typeof it.content !== 'string') continue;
      var nm = String(it.name || '');
      var byName = UPD_SELF_NAME_RE.test(nm) && it.content.indexOf('var VERSION') >= 0;
      var byBody = !byName && it.content.indexOf('var VERSION') >= 0 && it.content.indexOf('AR6') >= 0;
      if (!byName && !byBody) continue;

      var sc = byName ? 2 : 1;
      var cv = '';
      try { cv = (it.content.match(/var VERSION\s*=\s*'([^']+)'/) || [])[1] || ''; } catch (eV) {}
      if (cv && cv === VERSION) sc += 4;
      if (/TT|移动|手机|mobile/i.test(nm) === mob) sc += 1;
      /* enabled 是「哪条真在跑」最直接的信号，停用的那条不该被选中 */
      if (it.enabled === false) sc -= 10;

      if (sc > bestScore) { bestScore = sc; best = i; tie = false; }
      else if (sc === bestScore) { tie = true; }
    }
    /* 分不出高低就不装：宁可让用户手动导一次，也不能把更新写进另一条 */
    if (best >= 0 && tie) return -1;
    return best;
  } catch (e) { return -1; }
}

/* 版本文件里可以带一个 url，指向新包本体。没有 url 就退化成「只提示」。 */
function updParseFull(text) {
  var out = { v: '', url: '' };
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
        var u = o.url || o.download || o.file;
        if (u && updUrlOk(u)) out.url = String(u).trim();
        if (out.v) return out;
      }
    } catch (eJ) {}
    out.v = updParse(s);
    return out;
  } catch (e) { return out; }
}

/* 取回新包并装进去。返回 { ok, err, version } */
function updInstall() {
  return new Promise(function (fin) {
    var done = false;
    function end(o) { if (done) return; done = true; UPD_BUSY = false; fin(o); }
    if (UPD_BUSY) { fin({ ok: false, err: 'busy' }); return; }
    UPD_BUSY = true;
    try {
      var st = updState();
      var pkgUrl = String((st && st.pkgUrl) || '').trim();
      var want = String((st && st.latest) || '').trim();
      if (!updUrlOk(pkgUrl)) { end({ ok: false, err: 'nopkg' }); return; }

      var ctx0 = updHostCtx();
      var list0 = ctx0 && ctx0.settings && ctx0.settings.tavern_helper && ctx0.settings.tavern_helper.scripts;
      if (!ctx0) { end({ ok: false, err: 'nohost' }); return; }
      if (updSelfIndex(list0) < 0) { end({ ok: false, err: 'noself' }); return; }

      updGet(pkgUrl, UPD_PKG_TTL).then(function (rr) {
        if (!rr || !rr.ok) {
          end({ ok: false, err: (rr && rr.err) || 'net', status: rr && rr.status, cross: rr && rr.cross, timeout: rr && rr.timeout });
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

          var pv = '';
          try { pv = (body.match(/var VERSION\s*=\s*'([^']+)'/) || [])[1] || ''; } catch (eG) {}
          if (!pv || !UPD_VER_RE.test(pv)) { end({ ok: false, err: 'badpkg' }); return; }
          if (want && UPD_VER_RE.test(want) && updCmp(pv, want) !== 0) {
            end({ ok: false, err: 'mismatch', got: pv, want: want });
            return;
          }

          /* 下载可能耗几十秒，宿主有机会在这期间换掉设置对象；写之前重新定位一次 */
          var ctx = updHostCtx();
          var list = ctx && ctx.settings && ctx.settings.tavern_helper && ctx.settings.tavern_helper.scripts;
          var idx = updSelfIndex(list);
          if (!ctx || idx < 0) { end({ ok: false, err: 'noself' }); return; }

          var curV = '';
          try { curV = (String(list[idx].content).match(/var VERSION\s*=\s*'([^']+)'/) || [])[1] || ''; } catch (eC) {}
          if (curV && curV === pv) { end({ ok: true, already: true, version: pv }); return; }
          if (!ctx.save) { end({ ok: false, err: 'nosave' }); return; }

          var bak = { name: list[idx].name, info: list[idx].info, content: list[idx].content };
          list[idx].content = body;
          if (pkg.name && typeof pkg.name === 'string' && pkg.name.length <= 80) list[idx].name = pkg.name;
          if (pkg.info && typeof pkg.info === 'string' && pkg.info.length <= 200) list[idx].info = pkg.info;

          function rollback() {
            try {
              if (list[idx]) { list[idx].content = bak.content; list[idx].name = bak.name; list[idx].info = bak.info; }
            } catch (eR) {}
          }

          /* saveSettings 是 async：不 await 就等于「发出去就算成功」 */
          Promise.resolve().then(function () { return ctx.save(); }).then(function () {
            var c2 = updHostCtx();
            var l2 = c2 && c2.settings && c2.settings.tavern_helper && c2.settings.tavern_helper.scripts;
            var i2 = updSelfIndex(l2);
            if (i2 < 0 || String(l2[i2].content).indexOf('var VERSION = \'' + pv + '\'') < 0) {
              rollback();
              end({ ok: false, err: 'nosave' });
              return;
            }
            UPD_BAK = { idx: i2, name: bak.name, info: bak.info, content: bak.content, body: body };
            end({ ok: true, version: pv, saveKind: ctx.saveKind || '' });
          }, function () { rollback(); end({ ok: false, err: 'nosave' }); });
        });
      }).then(null, function () { end({ ok: false, err: 'net' }); });
    } catch (e) { UPD_BUSY = false; end({ ok: false, err: 'net' }); }
  });
}

/* 一键：查 + 装。用户只点一下，不用先填地址、也不用先打开开关。
   返回 { ok, newer, installed, version|latest, err }。 */
function updQuick() {
  if (UPD_BUSY) return Promise.resolve({ ok: false, err: 'busy' });
  return updCheck(true).then(function (r) {
    if (!r || !r.ok) return { ok: false, err: (r && r.err) || 'net', status: (r && r.status) || 0, cross: !!(r && r.cross), timeout: !!(r && r.timeout) };
    if (!r.newer) return { ok: true, newer: false, latest: r.latest || '' };
    if (!updUrlOk(String((r && r.pkgUrl) || ''))) return { ok: false, err: 'nopkg', latest: r.latest || '' };
    return updInstall().then(function (i) {
      if (i && i.ok) return { ok: true, newer: true, installed: true, already: !!(i.already), version: i.version || r.latest || '', saveKind: i.saveKind || '' };
      return { ok: false, err: (i && i.err) || 'net', latest: r.latest || '', status: (i && i.status) || 0, cross: !!(i && i.cross), timeout: !!(i && i.timeout) };
    });
  }).then(null, function () { return { ok: false, err: 'net' }; });
}

/* 装成功之后的提示语：走的是同步保存就催刷新，走防抖保存就先等两秒 */
function updDoneText(version, saveKind) {
  var v = String(version == null ? '' : version);
  if (String(saveKind) === 'sync') {
    return '✅ 已装 v' + v + '，刷新一次页面生效（没生效就点「↩ 撤销更新」）';
  }
  return '✅ 已装 v' + v + '，等两秒再刷新页面（设置还在往盘上写），没生效就点「↩ 撤销更新」';
}

/* 撤销：把刚换掉的那份放回去（只在本次会话有效） */
function updUndo() {
  try {
    if (!UPD_BAK) return { ok: false, err: 'nobak' };
    var ctx = updHostCtx();
    var list = ctx && ctx.settings && ctx.settings.tavern_helper && ctx.settings.tavern_helper.scripts;
    if (!list) return { ok: false, err: 'nohost' };
    var idx = updSelfIndex(list);
    if (idx < 0) return { ok: false, err: 'noself' };
    /* 只认「这格确实还是我装进去的那份」才敢写回，免得覆盖到别人的脚本 */
    if (UPD_BAK.body && String(list[idx].content).indexOf(String(UPD_BAK.body).slice(0, 120)) < 0) {
      return { ok: false, err: 'nomatch' };
    }
    if (!ctx.save) return { ok: false, err: 'nosave' };
    var old = { content: list[idx].content, name: list[idx].name, info: list[idx].info };
    list[idx].content = UPD_BAK.content;
    if (UPD_BAK.name != null) list[idx].name = UPD_BAK.name;
    if (UPD_BAK.info != null) list[idx].info = UPD_BAK.info;
    try { ctx.save(); } catch (eS) {
      list[idx].content = old.content; list[idx].name = old.name; list[idx].info = old.info;
      return { ok: false, err: 'nosave' };
    }
    UPD_BAK = null;
    return { ok: true, saveKind: ctx.saveKind || '' };
  } catch (e) { return { ok: false, err: 'net' }; }
}

function updCanUndo() {
  try { return !!UPD_BAK; } catch (e) { return false; }
}

function updLatest() {
  try {
    var st = updState();
    return String((st && st.latest) || '').trim();
  } catch (e) { return ''; }
}

/* 「装新版」这个按钮出不出现，只看三件事：有包地址、版本号合法、确实比现在新 */
function updHasPkg() {
  try {
    var st = updState();
    if (!st || !updUrlOk(st.pkgUrl)) return false;
    var v = String(st.latest || '').trim();
    if (!v || !UPD_VER_RE.test(v)) return false;
    return updCmp(v, VERSION) > 0;
  } catch (e) { return false; }
}

/* 出错也要说人话：错误码是给我们看的，提示牌是给用户看的 */
function updErrText(code, r) {
  var m = {
    off: '自动更新没开',
    nourl: '没填版本文件地址',
    net: (r && r.timeout) ? '等太久了，没收到回音（网络慢或被拦）' : (r && r.cross ? '被浏览器拦了跨域请求（地址没有跨域头）' : '连不上更新地址（网络不通，或浏览器拦了跨域）'),
    http: '更新地址打不开' + (r && r.status ? '（HTTP ' + r.status + '）' : '') + '——多半是版本文件路径变了',
    parse: '版本文件看不懂（应该是 0.96 或 {"version":"0.99"}）',
    nopkg: '版本文件里没给新包地址（要加一个 url 字段）',
    nohost: '找不到酒馆的设置，这个入口在当前形态下用不了',
    noself: '脚本表里没认出自己——手动粘贴进来的装不了，请手动重新导入',
    big: '新包超过 4MB，不装',
    empty: '更新地址回了个空文件',
    busy: '正在装，稍等一下',
    nomatch: '这条脚本已经不是刚装进去的那份了，不敢覆盖——请手动重新导入',
    badpkg: '新包不是有效的脚本（没有 VERSION 行）',
    mismatch: '新包版本和版本文件对不上',
    nosave: '写进酒馆设置时没成功——这次没装成，稍后再点一次',
    nobak: '没有可退回的版本'
  };
  return m[code] || ('出错了（' + code + '）');
}
