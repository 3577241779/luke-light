/* ============================================================================
 * Anti-Route v8 — 18/Upd 新版本检查
 *
 * 目的：这是「酒馆助手」里导入的一段脚本，不是浏览器扩展，自己没有安装 /
 * 替换能力——改不了自己，也不能下载覆盖自己。所以这里能做的只有一件事：
 * 定期去一个版本文件问一句「现在最新是几」，发现比 VERSION 新，就在横幅和
 * 面板上留一句提示 + 一个地址，剩下由用户自己下载导入。
 *
 * 铁律：
 *   - 绝不下载脚本、绝不 eval 远程内容、绝不上传任何东西。
 *   - 只发 GET；只认 http:// 和 https://，其它协议一律拒绝。
 *   - 默认关（cfg.upd === 'off'）。用户自己打开才查，关着的时候连一个请求
 *     都不发（force 只给「手动检查」这条入口用，见 updCheck 的注释）。
 *   - 查不到不是故障：超时、404、文件写错、断网，全部静默，不打扰用户。
 *
 * 存储：ar6.upd = { at: 毫秒时间戳, latest: '1.2.3', url: '...' }
 * ========================================================================== */

var UPD_KEY = 'ar6.upd';
var UPD_TTL = 8000;   /* 8 秒。版本文件只是一个几十字节的小文本，超过就是网络有问题 */
var UPD_URL_MAX = 500;

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
    if (s.indexOf('http://') !== 0 && s.indexOf('https://') !== 0) return false;
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
function updCheck(force) {
  return new Promise(function (resolve) {
    var timer = null;
    var done = false;

    /* 收口：只 resolve 一次，并保证 8 秒的定时器一定被清掉，
       否则一次成功的检查会给页面留一个 8 秒后才响的空定时器。 */
    function fin(o) {
      if (done) return;
      done = true;
      if (timer !== null) {
        try {
          if (typeof HOST.clearTimeout === 'function') HOST.clearTimeout(timer);
          else if (typeof clearTimeout === 'function') clearTimeout(timer);
        } catch (eC) {}
        timer = null;
      }
      resolve(o);
    }

    try {
      if (!updOn() && !force) { fin({ ok: false, err: 'off' }); return; }

      var u = '';
      try { u = String((cfg && cfg.updUrl) || '').trim(); } catch (eU) { u = ''; }
      if (!updUrlOk(u)) { fin({ ok: false, err: 'nourl' }); return; }
      if (!HOST || typeof HOST.fetch !== 'function') { fin({ ok: false, err: 'net' }); return; }

      var opts = {
        method: 'GET',
        cache: 'no-store',
        headers: { 'Accept': 'text/plain, application/json' }
      };

      /* 没有 AbortController 的宿主不硬造：定时器到点直接判超时，
         两条路都不让一个卡死的请求挂住面板。 */
      var ctl = null;
      try {
        if (typeof HOST.AbortController === 'function') ctl = new HOST.AbortController();
      } catch (eA) { ctl = null; }
      if (ctl) {
        try { opts.signal = ctl.signal; } catch (eS) {}
      }
      try {
        var setT = (typeof HOST.setTimeout === 'function') ? HOST.setTimeout
          : (typeof setTimeout === 'function' ? setTimeout : null);
        if (setT) {
          timer = setT.call(HOST, function () {
            try {
              if (ctl) ctl.abort();
              else fin({ ok: false, err: 'net' });
            } catch (eB) {}
          }, UPD_TTL);
        }
      } catch (eT) { timer = null; }

      Promise.resolve(HOST.fetch(u, opts)).then(function (res) {
        /* res.ok === false 才算失败：有的宿主返回的对象没有 ok 字段，
           用 !res.ok 会把正常响应误判成失败。 */
        if (!res || res.ok === false) {
          fin({ ok: false, err: 'http', status: res ? res.status : 0 });
          return null;
        }
        return Promise.resolve(res.text()).then(function (text) {
          var full = updParseFull(text);
          var v = full && full.v;
          if (!v) { fin({ ok: false, err: 'parse' }); return; }
          updSave({ at: Date.now(), latest: v, url: u, pkgUrl: (full && full.url) || '' });
          fin({ ok: true, latest: v, pkgUrl: (full && full.url) || '', newer: updCmp(v, VERSION) > 0 });
        });
      }).then(null, function () {
        /* 断网、被 abort、跨域被拦……对用户都是同一件事：这次没查到 */
        fin({ ok: false, err: 'net' });
      });
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
    var u = '';
    try { u = String((cfg && cfg.updUrl) || '').trim(); } catch (e1) { return; }
    if (!updUrlOk(u)) return;
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
 * 一键更新（v0.93）
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
var UPD_BAK = null;                  /* { idx, content } —— 只在内存里，刷新即失效 */
var UPD_SELF_NAME_RE = /卢克之光|Anti-?Route/i;

/* 从 iframe 往上找酒馆页的 extension_settings。找不到就返回 null：
   宁可让「一键更新」不可用，也不要瞎猜路径去写别人的配置。 */
function updHostCtx() {
  try {
    var w = HOST;
    for (var d = 0; d < 4 && w; d++) {
      try {
        if (w.extension_settings && typeof w.extension_settings === 'object') {
          return {
            settings: w.extension_settings,
            save: (typeof w.saveSettingsDebounced === 'function') ? w.saveSettingsDebounced : null,
            loc: w.location || null
          };
        }
      } catch (eI) {}
      try { w = w.parent; } catch (eP) { w = null; }
    }
    return null;
  } catch (e) { return null; }
}

/* 在脚本表里认自己：优先名字，其次版本行。两个都不中的一律不当成自己。 */
function updSelfIndex(list) {
  try {
    if (!list || !list.length) return -1;
    for (var i = 0; i < list.length; i++) {
      var it = list[i];
      if (!it || typeof it.content !== 'string') continue;
      var nm = String(it.name || '');
      if (UPD_SELF_NAME_RE.test(nm) && it.content.indexOf('var VERSION') >= 0) return i;
    }
    for (var j = 0; j < list.length; j++) {
      var c = list[j] && list[j].content;
      if (typeof c !== 'string') continue;
      if (c.indexOf('var VERSION') >= 0 && c.indexOf('AR6') >= 0) return j;
    }
    return -1;
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
  return new Promise(function (resolve) {
    function fin(o) { try { resolve(o); } catch (e) {} }
    try {
      var st = updState();
      var pkgUrl = String((st && st.pkgUrl) || '').trim();
      var want = String((st && st.latest) || '').trim();
      if (!updUrlOk(pkgUrl)) { fin({ ok: false, err: 'nopkg' }); return; }

      var ctx = updHostCtx();
      if (!ctx) { fin({ ok: false, err: 'nohost' }); return; }
      var th = ctx.settings && ctx.settings.tavern_helper;
      var list = th && th.scripts;
      var idx = updSelfIndex(list);
      if (idx < 0) { fin({ ok: false, err: 'noself' }); return; }

      Promise.resolve(HOST.fetch(pkgUrl, { method: 'GET', cache: 'no-store' })).then(function (res) {
        if (!res || res.ok === false) { fin({ ok: false, err: 'http', status: res ? res.status : 0 }); return null; }
        return Promise.resolve(res.text()).then(function (text) {
          if (!text || text.length > UPD_PKG_MAX) { fin({ ok: false, err: 'big' }); return; }
          var pkg = null;
          try { pkg = JSON.parse(text); } catch (eP) { pkg = null; }
          var body = pkg && typeof pkg.content === 'string' ? pkg.content : '';
          if (!body || body.indexOf('var VERSION') < 0) { fin({ ok: false, err: 'badpkg' }); return; }

          var got = '';
          try { got = (body.match(/var VERSION\s*=\s*'([^']+)'/) || [])[1] || ''; } catch (eG) {}
          if (want && got && UPD_VER_RE.test(got) && updCmp(got, want) !== 0) {
            fin({ ok: false, err: 'mismatch', got: got, want: want });
            return;
          }

          UPD_BAK = { idx: idx, content: list[idx].content };
          list[idx].content = body;
          if (pkg.name && typeof pkg.name === 'string') list[idx].name = pkg.name;
          try { if (ctx.save) ctx.save(); } catch (eS) {}
          fin({ ok: true, version: got || want });
        });
      }).then(null, function () { fin({ ok: false, err: 'net' }); });
    } catch (e) { fin({ ok: false, err: 'net' }); }
  });
}

/* 撤销：把刚换掉的那份放回去（只在本次会话有效） */
function updUndo() {
  try {
    if (!UPD_BAK) return { ok: false, err: 'nobak' };
    var ctx = updHostCtx();
    var list = ctx && ctx.settings && ctx.settings.tavern_helper && ctx.settings.tavern_helper.scripts;
    if (!list || !list[UPD_BAK.idx]) return { ok: false, err: 'nohost' };
    list[UPD_BAK.idx].content = UPD_BAK.content;
    try { if (ctx.save) ctx.save(); } catch (eS) {}
    UPD_BAK = null;
    return { ok: true };
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
    net: '网络没通，或等太久超时了',
    http: '对方返回了错误' + (r && r.status ? '（' + r.status + '）' : ''),
    parse: '版本文件看不懂（应该是 0.93 或 {"version":"0.93"}）',
    nopkg: '版本文件里没给新包地址（要加一个 url 字段）',
    nohost: '找不到酒馆的设置，这个入口在当前形态下用不了',
    noself: '脚本表里没认出自己——手动粘贴进来的装不了，请手动重新导入',
    big: '新包超过 4MB，不装',
    badpkg: '新包不是有效的脚本（没有 VERSION 行）',
    mismatch: '新包版本和版本文件对不上',
    nobak: '没有可退回的版本'
  };
  return m[code] || ('出错了（' + code + '）');
}
