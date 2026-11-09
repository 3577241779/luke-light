/* ============================================================================
 * Anti-Route v6.0 — 4/4 UI
 * 面板 / 横幅 / 自检 / 按钮 / 生命周期
 * 经验：定位样式一律内联，<style> 只放装饰（v5.7 血泪）
 * ========================================================================== */

var UI_MODE = 'auto';   /* 打包时替换为 desktop / mobile */
var ROOT_ID = 'ar6-root';
var STYLE_ID = 'ar6-style';
var minimized = false;
var clickCount = 0;
var ACT_TS = {};   /* act -> 最近一次执行时间 */
var btnBoundAt = 0;
var bootTimer = null;
var bannerTimer = null;
var bound = false;
var selfTestResult = null;
/* 重建基线：第一次点只提醒，5 秒内再点才真的清 */
var REBUILD_AT = 0;

function uiMode() {
  if (UI_MODE === 'desktop' || UI_MODE === 'mobile') return UI_MODE;
  try {
    if (HOST.matchMedia && HOST.matchMedia('(max-width: 820px)').matches) return 'mobile';
    if ((HOST.innerWidth || 9999) < 720) return 'mobile';
    if (/Android|iPhone|iPad|iPod|Mobile|HarmonyOS/i.test(String(HOST.navigator && HOST.navigator.userAgent || ''))) return 'mobile';
  } catch (e) {}
  return 'desktop';
}

function esc(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function hhmm(ts) {
  try {
    var d = new Date(ts);
    var p = function (n) { return (n < 10 ? '0' : '') + n; };
    return p(d.getHours()) + ':' + p(d.getMinutes());
  } catch (e) { return '--:--'; }
}

/* ---------------- 样式 ---------------- */

var CSS_TEXT = [
  '#ar6-root{font:13px/1.55 -apple-system,BlinkMacSystemFont,"Segoe UI","Microsoft YaHei",sans-serif;color:#e6edf3;--ar-line:rgba(255,255,255,.09);--ar-soft:rgba(255,255,255,.045);--ar-mut:#8b949e;--ar-acc:#58a6ff;--ar-ok:#3fb950;--ar-warn:#d29922;--ar-bad:#f85149;}',
  '#ar6-root *{box-sizing:border-box;}',
  '#ar6-root svg.ar6-i{width:14px!important;height:14px!important;min-width:14px!important;min-height:14px!important;max-width:14px!important;max-height:14px!important;flex:0 0 14px!important;display:inline-block!important;vertical-align:-2px;fill:none!important;stroke:currentColor!important;stroke-width:1.7!important;stroke-linecap:round!important;stroke-linejoin:round!important;overflow:visible!important;}',
  '#ar6-root .ar6-b svg.ar6-i,#ar6-root .ar6-chip svg.ar6-i{width:13px!important;height:13px!important;min-width:13px!important;max-width:13px!important;flex:0 0 13px!important;}',
  '#ar6-root .ar6-b,#ar6-root .ar6-chip{display:inline-flex;align-items:center;gap:5px;line-height:1.15;white-space:nowrap;}',
  '#ar6-root{overscroll-behavior:contain;touch-action:pan-y;-webkit-overflow-scrolling:touch;}',
  '#ar6-root::-webkit-scrollbar{width:9px;height:9px;}',
  '#ar6-root::-webkit-scrollbar-thumb{background:rgba(255,255,255,.26);border:2px solid transparent;background-clip:content-box;border-radius:6px;}',
  '#ar6-root::-webkit-scrollbar-thumb:hover{background:rgba(255,255,255,.42);background-clip:content-box;}',
  '#ar6-root::-webkit-scrollbar-thumb{background:rgba(255,255,255,.18);border-radius:3px;}',
  '#ar6-root::-webkit-scrollbar-track{background:transparent;}',
  '.ar6-tw{max-width:100%;touch-action:pan-x;overscroll-behavior-x:contain;}',
  '@media (max-width:520px){#ar6-root .ar6-h{touch-action:none;cursor:grab;}}',
  '#ar6-root{pointer-events:auto;}',
  '.ar6-p,.ar6-pill,.ar6-b,.ar6-x{pointer-events:auto;}',
  '.ar6-p{background:linear-gradient(180deg,rgba(22,27,34,.97),rgba(13,17,23,.98));border:1px solid var(--ar-line);border-radius:16px;overflow:hidden;box-shadow:0 24px 64px rgba(0,0,0,.62),0 0 0 1px rgba(255,255,255,.03) inset;}',
  '.ar6-h{position:relative;display:flex;align-items:center;gap:8px;padding:11px 14px;background:linear-gradient(96deg,rgba(88,166,255,.16),rgba(88,166,255,.02) 52%,transparent 78%);border-bottom:1px solid var(--ar-line);}',
  '.ar6-p{position:relative;overflow:hidden}',
  '.ar6-p::before{content:"";position:absolute;left:0;top:0;bottom:0;width:3px;',
  'background:linear-gradient(180deg,#58a6ff,#3fb95000);opacity:.9;pointer-events:none}',
  '#ar6-root[data-st="bad"] .ar6-p::before{background:linear-gradient(180deg,#f85149,#f8514900)}',
  '#ar6-root[data-st="warn"] .ar6-p::before{background:linear-gradient(180deg,#d29922,#d2992200)}',
  '#ar6-root[data-st="ok"] .ar6-p::before{background:linear-gradient(180deg,#3fb950,#3fb95000)}',
  '.ar6-p::after{content:"";position:absolute;inset:0;pointer-events:none;border-radius:inherit;',
  'box-shadow:inset 0 1px 0 rgba(255,255,255,.06),inset 0 0 42px rgba(88,166,255,.05)}',
  '.ar6-sec{display:flex;align-items:center;gap:6px}',
  '.ar6-sec::before{content:"";width:3px;height:12px;border-radius:2px;background:linear-gradient(180deg,#58a6ff,#1f6feb)}',
  '.ar6-h::after{content:"";position:absolute;left:8px;right:8px;bottom:-1px;height:1px;background:linear-gradient(90deg,transparent,#58a6ff66,transparent);animation:ar6flow 6.5s linear infinite}',
  '@keyframes ar6flow{0%{opacity:.2;transform:translateX(-24%)}50%{opacity:.9}100%{opacity:.2;transform:translateX(24%)}}',
  '.ar6-h b{font-size:13.5px;font-weight:650;letter-spacing:.3px;color:#f0f6fc;}',
  '.ar6-ver{font-size:10px;color:var(--ar-mut);border:1px solid var(--ar-line);border-radius:999px;padding:1px 7px;font-variant-numeric:tabular-nums;}',
  '.ar6-dot{width:8px;height:8px;border-radius:50%;background:#6e7681;flex:none;box-shadow:0 0 0 3px rgba(110,118,129,.16);}',
  '.ar6-dot.ok{background:var(--ar-ok);box-shadow:0 0 0 3px rgba(63,185,80,.18),0 0 10px rgba(63,185,80,.5);}',
  '.ar6-dot.warn{background:var(--ar-warn);box-shadow:0 0 0 3px rgba(210,153,34,.18);}',
  '.ar6-dot.bad{background:var(--ar-bad);box-shadow:0 0 0 3px rgba(248,81,73,.18),0 0 10px rgba(248,81,73,.5);}',
  '.ar6-sp{flex:1;}',
  '.ar6-x{border:0;background:transparent;font-size:15px;line-height:1;color:var(--ar-mut);cursor:pointer;padding:3px 5px;border-radius:6px;}',
  '.ar6-x:hover{color:#e6edf3;background:rgba(255,255,255,.07);}',
  '.ar6-hb{width:18px;height:18px;border-radius:50%;margin-left:6px;cursor:grab;touch-action:none;',
  'background:radial-gradient(circle at 35% 30%,#9ecbff,#3d7fe0 65%,#1f4d96);',
  'box-shadow:0 0 0 1px rgba(255,255,255,.28) inset,0 2px 8px rgba(61,127,224,.55);flex:0 0 18px}',
  '.ar6-hb:active{cursor:grabbing}',
  '.ar6-pill{display:flex;align-items:center;gap:7px;padding:0;border-radius:999px;background:transparent;border:0;box-shadow:none;cursor:pointer;font-size:12px;color:#e6edf3;}',
  '.ar6-cards{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;padding:12px 14px 4px;}',
  '.ar6-c{background:linear-gradient(180deg,rgba(255,255,255,.05),rgba(255,255,255,.02));border:1px solid var(--ar-line);border-radius:12px;padding:8px 6px;text-align:center;}',
  '.ar6-c .n{font-size:19px;font-weight:680;font-variant-numeric:tabular-nums;line-height:1.15;color:#f0f6fc;}',
  '.ar6-c .l{font-size:10.5px;color:var(--ar-mut);letter-spacing:.4px;margin-top:1px;}',
  '.ar6-c.bad .n{color:var(--ar-bad);}.ar6-c.warn .n{color:var(--ar-warn);}.ar6-c.ok .n{color:var(--ar-ok);}',
  '.ar6-sec{padding:11px 14px 4px;font-size:10.5px;color:var(--ar-mut);letter-spacing:.9px;text-transform:uppercase;display:flex;align-items:center;gap:7px;}',
  '.ar6-sec:before{content:"";width:3px;height:11px;border-radius:2px;background:var(--ar-acc);opacity:.75;}',
  '.ar6-row{display:flex;flex-wrap:wrap;gap:7px;padding:5px 14px 10px;}',
  '.ar6-b{border:1px solid var(--ar-line);background:rgba(255,255,255,.04);border-radius:9px;padding:5px 10px;font-size:12px;cursor:pointer;color:#e6edf3;transition:background .12s,border-color .12s,transform .06s;}',
  '.ar6-b:hover{background:rgba(255,255,255,.09);border-color:rgba(255,255,255,.18);}',
  '.ar6-b:active{transform:translateY(1px);}',
  '.ar6-b.on{background:rgba(232,196,106,.13);border-color:rgba(232,196,106,.46);color:#E8C46A;}',
  '.ar6-b.warn{border-color:rgba(210,153,34,.4);background:rgba(210,153,34,.12);color:#f2cc60;}',
  '.ar6-b.danger{color:#ff7b72;border-color:rgba(248,81,73,.32);}',
  /* 反 OOC：总闸关时子 chip 带 data-off="1"，只变灰、不隐藏（位置别跳） */
  '.ar6-b[data-off="1"]{opacity:.42;filter:grayscale(.55);cursor:default;}',
  '.ar6-b[data-off="1"]:hover{background:rgba(255,255,255,.04);border-color:var(--ar-line);}',
  '.ar6-input{display:flex;gap:7px;padding:0 14px 10px;}',
  '.ar6-input input{flex:1;min-width:0;border:1px solid var(--ar-line);background:rgba(1,4,9,.55);color:#e6edf3;border-radius:8px;padding:6px 9px;font-size:11px;font-family:ui-monospace,Consolas,monospace;}',
  '.ar6-input input:focus{outline:none;border-color:rgba(88,166,255,.55);box-shadow:0 0 0 3px rgba(88,166,255,.14);}',
  '.ar6-tbl{padding:0 10px 10px;overflow:visible;}',
  '.ar6-tw{overflow-x:auto;overflow-y:hidden;-webkit-overflow-scrolling:touch;margin:0 -2px;padding:0 2px}',
  '.ar6-tw::-webkit-scrollbar{height:9px}',
  '.ar6-tw::-webkit-scrollbar-thumb{background:rgba(255,255,255,.16);border-radius:3px}',
  '.ar6-t{min-width:560px;width:100%;border-collapse:separate;border-spacing:0;font-size:11.5px;table-layout:fixed}',
  '.ar6-t th{position:sticky;top:0;z-index:2;text-align:left;font-weight:500;color:#8b949e;background:#12161d;',
  'padding:5px 7px;border-bottom:1px solid var(--ar-ln);white-space:nowrap}',
  '.ar6-t td{padding:6px 7px;border-bottom:1px solid rgba(255,255,255,.05);color:#c9d1d9;',
  'white-space:nowrap;overflow:hidden;text-overflow:ellipsis}',
  '.ar6-t tbody tr:hover td{background:rgba(88,166,255,.06)}',
  '.ar6-t .c1{width:52px;color:#8b949e;font-family:ui-monospace,Menlo,monospace}',
  '.ar6-t .c2{width:132px}', '.ar6-t .c3{width:170px}', '.ar6-t .c4{width:72px}',
  '.ar6-t .c5{width:52px}', '.ar6-t .c6{width:56px}', '.ar6-t .c7{width:44px}', '.ar6-t .c8{width:48px}',
  '.ar6-log{display:none}',
  '.ar6-lr{border:1px solid var(--ar-ln);border-radius:9px;padding:7px 9px;background:rgba(255,255,255,.022)}',
  '.ar6-lr:hover{background:rgba(88,166,255,.06);border-color:rgba(88,166,255,.30)}',
  '.ar6-l1{display:flex;align-items:center;gap:6px;min-width:0;flex-wrap:nowrap}',
  '.ar6-lt{font:600 11px/1 ui-monospace,SFMono-Regular,Menlo,monospace;color:var(--ar-mut);flex:0 0 auto}',
  '.ar6-lm{flex:1 1 auto;min-width:0;display:flex;align-items:center;gap:4px;overflow:hidden;white-space:nowrap;text-overflow:ellipsis;font-size:11.5px;color:#8b949e}',
  '.ar6-lm em{font-style:normal;overflow:hidden;text-overflow:ellipsis;max-width:46%}',
  '.ar6-lm em.up{color:#f0b429}',
  '.ar6-arrow{font-style:normal;color:#484f58;flex:0 0 auto}',
  '.ar6-src{flex:0 0 auto;margin-left:4px;padding:0 5px;border:1px solid var(--ar-ln);border-radius:999px;font:400 9.5px/1.6 ui-monospace;color:#6e7681}',
  '.ar6-l2{display:flex;gap:12px;margin-top:5px;font-size:10.5px;color:#6e7681;flex-wrap:wrap}',
  '.ar6-l2 b{color:#c9d1d9;font-weight:600;font-family:ui-monospace,Menlo,monospace}',
  '.ar6-t{width:100%;table-layout:fixed;}',
  'table.ar6-t{width:100%;border-collapse:separate;border-spacing:0;font-size:11px;}',
  'table.ar6-t th{position:sticky;top:0;z-index:1;background:#161b22;text-align:left;font-weight:600;color:var(--ar-mut);padding:6px 6px;border-bottom:1px solid var(--ar-line);white-space:nowrap;font-size:10.5px;letter-spacing:.4px;}',
  'table.ar6-t td{padding:5px 6px;border-bottom:1px solid rgba(255,255,255,.05);white-space:nowrap;font-variant-numeric:tabular-nums;color:#c9d1d9;}',
  'table.ar6-t tbody tr:nth-child(odd) td{background:rgba(255,255,255,.018);}',
  'table.ar6-t tr:hover td{background:rgba(88,166,255,.08);}',
  '.ar6-tag{display:inline-block;padding:1px 7px;border-radius:999px;font-size:10px;line-height:16px;border:1px solid transparent;}',
  '.ar6-tag.ok{background:rgba(63,185,80,.14);color:#7ee787;border-color:rgba(63,185,80,.3);}',
  '.ar6-tag.warn{background:rgba(210,153,34,.14);color:#f2cc60;border-color:rgba(210,153,34,.3);}',
  '.ar6-tag.bad{background:rgba(248,81,73,.14);color:#ff7b72;border-color:rgba(248,81,73,.3);}',
  '.ar6-tag.gray{background:rgba(139,148,158,.14);color:#adbac7;border-color:rgba(139,148,158,.26);}',
  '.ar6-empty{padding:14px;color:var(--ar-mut);font-size:11.5px;line-height:1.7;text-align:center;}',
  '.ar6-foot{display:flex;align-items:center;gap:9px;flex-wrap:wrap;padding:8px 14px;background:rgba(1,4,9,.45);border-top:1px solid var(--ar-line);font-size:10.5px;color:var(--ar-mut);}',
  '.ar6-foot b{font-weight:600;color:#c9d1d9;}',
  '.ar6-mono{font-family:ui-monospace,Consolas,monospace;}',
  '.ar6-st{padding:8px 14px 0;font-size:11.5px;color:#adbac7;word-break:break-all;}',
  '.ar6-st b{color:#f0f6fc;font-weight:600;}',
  '.ar6-cards.mobile{grid-template-columns:repeat(2,1fr);}',
  '.ar6-mobile .ar6-tbl{max-height:none;}',
  '@keyframes ar6-pop{from{opacity:0;transform:scale(.985)}to{opacity:1;transform:scale(1)}}',
  '@keyframes ar6-rise{from{opacity:0;transform:translateY(10px) scale(.99)}to{opacity:1;transform:translateY(0) scale(1)}}',
  '@keyframes ar6-fade{from{opacity:0}to{opacity:1}}',
  '@keyframes ar6-bump{0%{transform:translateY(0)}35%{transform:translateY(-3px)}100%{transform:translateY(0)}}',
  '.ar6-anim{animation:ar6-pop .18s cubic-bezier(.2,.8,.2,1)}',
  '.ar6-bump{animation:ar6-bump .26s cubic-bezier(.2,.8,.2,1)}',
  '.ar6-pill{transition:transform .12s cubic-bezier(.2,.8,.2,1)}',
  '.ar6-pill:active{transform:scale(.94)}',
  '.ar6-b{transition:transform .1s ease,background .12s linear}',
  '.ar6-b:active{transform:scale(.97)}',
  '.ar6-b:focus-visible,.ar6-x:focus-visible,.ar6-pill:focus-visible{outline:2px solid var(--ar-acc);outline-offset:2px}',
  '@media (prefers-reduced-motion:reduce){.ar6-anim,.ar6-bump,#ar6-card,#ar6-card>div{animation:none!important;transition-duration:.01ms!important}}',
  '.ar6-st .ok{color:#7ee787;}.ar6-st .bad{color:#ff7b72;}.ar6-st .warn{color:#f2cc60;}'
].join('\n');

function ensureStyle(d) {
  try {
    if (!d || !d.head) return;
    if (d.getElementById(STYLE_ID)) return;
    var s = d.createElement('style');
    s.id = STYLE_ID;
    s.appendChild(d.createTextNode(CSS_TEXT));
    d.head.appendChild(s);
    if (!d.getElementById('ar6-style82')) {
      var s2 = d.createElement('style');
      s2.id = 'ar6-style82';
      s2.appendChild(d.createTextNode(V82_CSS));
      d.head.appendChild(s2);
    }
  } catch (e) {}
}

/* ---------------- 横幅 ---------------- */

var V82_CSS = [
  '#ar6-root{--bg-1:#161b22;--bg-2:#0d1117;--ln-1:#30363d;--ln-2:#21262d;--acc:#58a6ff;}',
  '.ar6-pad{display:flex;flex-direction:column;gap:6px;padding:9px 10px 8px;width:100%;height:100%;box-sizing:border-box;color:#e6edf3;min-width:0;}',
  '.ar6-pad-r,.ar6-pad-f{min-width:0}',
  '.ar6-pad-r input[type=range]{width:100%;min-width:0;flex:1 1 auto}',
  '.ar6-pad-f .ar6-b{flex:1 1 0;min-width:0;overflow:hidden;white-space:nowrap}',
  '.ar6-pad-h{display:flex;align-items:center;gap:6px;font-size:12px;font-weight:600;cursor:grab;user-select:none;}',
  '.ar6-pad-h b{font-size:12px;font-weight:600;letter-spacing:.2px}',
  '.ar6-pad-h .ar6-x{margin-left:auto;width:20px;height:20px;line-height:1;font-size:13px}',
  '.ar6-pad-r{display:flex;align-items:center;gap:8px;font-size:11px;color:#c9d1d9}',
  '.ar6-pad-r span{flex:0 0 22px}',
  '.ar6-pad-r input[type=range]{flex:1;-webkit-appearance:none;appearance:none;height:18px;background:transparent}',
  '.ar6-pad-r input[type=range]::-webkit-slider-runnable-track{height:4px;border-radius:2px;background:#30363d}',
  '.ar6-pad-r input[type=range]::-webkit-slider-thumb{-webkit-appearance:none;width:14px;height:14px;margin-top:-5px;border-radius:50%;background:#58a6ff;box-shadow:0 0 0 3px rgba(88,166,255,.18)}',
  '.ar6-pad-r input[type=range]::-moz-range-track{height:4px;border-radius:2px;background:#30363d}',
  '.ar6-pad-r input[type=range]::-moz-range-thumb{width:14px;height:14px;border:0;border-radius:50%;background:#58a6ff}',
  '.ar6-grip{margin-top:1px;padding:6px 0;border:1px dashed #3d444d;border-radius:8px;text-align:center;font-size:11px;color:#c9d1d9;cursor:grab;touch-action:none;user-select:none;}',
  '.ar6-grip:active{border-color:#58a6ff;color:#c9d1d9}',
  '.ar6-pad-f{display:flex;gap:6px;margin-top:auto}',
  '.ar6-pad-f .ar6-b{flex:1;justify-content:center;font-size:11px;padding:5px 0}',
  '.ar6-ring{position:absolute;inset:-3px;border-radius:inherit;pointer-events:none;opacity:.55;',
  'background:conic-gradient(from 0deg,rgba(88,166,255,0) 0deg,rgba(88,166,255,.85) 70deg,rgba(88,166,255,0) 150deg,rgba(88,166,255,0) 360deg);',
  '-webkit-mask:radial-gradient(farthest-side,transparent calc(100% - 2px),#000 calc(100% - 2px));mask:radial-gradient(farthest-side,transparent calc(100% - 2px),#000 calc(100% - 2px));',
  'animation:ar6spin 3.6s linear infinite;}',
  '@keyframes ar6spin{to{transform:rotate(360deg)}}',
  '.ar6-sheen{position:absolute;inset:0;border-radius:inherit;pointer-events:none;overflow:hidden;}',
  '.ar6-sheen::after{content:"";position:absolute;top:0;left:-60%;width:45%;height:100%;',
  'background:linear-gradient(100deg,rgba(255,255,255,0) 0,rgba(255,255,255,.28) 50%,rgba(255,255,255,0) 100%);',
  'transform:skewX(-18deg);animation:ar6sheen 4.8s ease-in-out infinite;}',
  '@keyframes ar6sheen{0%,72%{left:-60%;opacity:0}78%{opacity:.85}100%{left:120%;opacity:0}}',
  '#ar6-root[data-st="bad"] .ar6-ring{animation-duration:2.2s;opacity:.75}',
  '#ar6-root[data-st="ok"] .ar6-ring{animation-duration:6s;opacity:.4}',
  '#ar6-root[data-st="bad"] .ar6-sheen::after{animation-duration:2.6s}',
  '#ar6-bn2{position:fixed;left:50%;transform:translateX(-50%) translateY(-8px);z-index:2147483002;',
  'display:flex;align-items:flex-start;gap:9px;max-width:min(560px,92vw);padding:9px 11px 9px 12px;border-radius:12px;',
  'background:rgba(22,27,34,.94);border:1px solid #30363d;border-left-width:3px;',
  'box-shadow:0 10px 30px rgba(0,0,0,.45),0 0 0 1px rgba(255,255,255,.02) inset;',
  'font:13px/1.5 -apple-system,"Microsoft YaHei",sans-serif;color:#e6edf3;opacity:0;pointer-events:auto;',
  'transition:opacity .18s ease,transform .18s cubic-bezier(.2,.8,.2,1);}',
  '#ar6-bn2[data-in="1"]{opacity:1;transform:translateX(-50%) translateY(0)}',
  '#ar6-bn2[data-kind="ok"]{border-left-color:#2da44e}',
  '#ar6-bn2[data-kind="warn"]{border-left-color:#bf8700}',
  '#ar6-bn2[data-kind="bad"]{border-left-color:#cf222e}',
  '#ar6-bn2[data-kind="gray"]{border-left-color:#57606a}',
  '#ar6-bn2 .ar6-bi{flex:0 0 auto;width:18px;height:18px;margin-top:1px;opacity:.95}',
  '#ar6-bn2 .ar6-bt{flex:1;min-width:0;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}',
  '#ar6-bn2 .ar6-bx{flex:0 0 auto;border:0;background:transparent;color:#8b949e;font-size:14px;line-height:1;padding:2px 2px;cursor:pointer}',
  '.ar6-i{width:14px;height:14px;flex:0 0 auto;fill:none;stroke:currentColor;stroke-width:1.7;stroke-linecap:round;stroke-linejoin:round;opacity:.92}',
  '.ar6-b{display:inline-flex;align-items:center;gap:6px}',
  '.ar6-custom{display:flex;align-items:center;gap:8px;margin:6px 0;font-size:12px;color:#8b949e}',
  '.ar6-mode-row{display:flex;align-items:center;gap:8px;margin:5px 0;font-size:12px;color:#c9d1d9}',
  '.ar6-sel{background:#0d1117;color:#e6edf3;border:1px solid #30363d;border-radius:8px;padding:4px 6px;font-size:12px}',
  '.ar6-hint{font-size:11px;color:#6e7681;margin:2px 0 6px}',
  '#ar6-root .ar6-body{flex:1 1 0;min-height:0;overflow-y:auto;overflow-x:hidden;overscroll-behavior:contain;-webkit-overflow-scrolling:touch;touch-action:pan-y;scrollbar-width:thin;padding-bottom:calc(6px + env(safe-area-inset-bottom,0px));}',
  '#ar6-root .ar6-body::-webkit-scrollbar{width:9px;height:9px;}',
  '#ar6-root .ar6-body::-webkit-scrollbar-thumb{background:rgba(255,255,255,.24);border:2px solid transparent;background-clip:content-box;border-radius:6px;}',
  '#ar6-root .ar6-p{display:flex;flex-direction:column;height:100%;max-height:100%;min-height:0;overflow:hidden;}',
  '#ar6-root .ar6-h{flex:0 0 auto;position:relative;z-index:3;}',
  '#ar6-root .ar6-p>.ar6-h{position:sticky;top:0}',
  '@media (prefers-reduced-motion: reduce){.ar6-ring,.ar6-sheen::after{animation:none!important}}',
  '#ar6-root[data-rm="1"] .ar6-ring,#ar6-root[data-rm="1"] .ar6-sheen::after{animation:none!important}'
].join('');

var BANNER_KIND = { ok: '#2da44e', warn: '#bf8700', bad: '#cf222e', gray: '#57606a' };
var BN_RANK = { gray: 1, ok: 2, warn: 3, bad: 4 };
var BN_STATE = { kind: '', at: 0 };

function banner(msg, kind) {
  if (DISPOSED) return;
  try {
    if (!DOC || !DOC.body) return;
    var k = BANNER_KIND[kind] ? kind : 'gray';
    var now = Date.now();
    /* 同级 1.6s 内不互相覆盖；低优先级不打断高优先级 */
    if (BN_STATE.at && now - BN_STATE.at < 1600 && (BN_RANK[k] || 1) <= (BN_RANK[BN_STATE.kind] || 1)) return;
    BN_STATE.kind = k; BN_STATE.at = now;

    var old = DOC.getElementById('ar6-bn2');
    if (old && old.parentNode) old.parentNode.removeChild(old);
    var el = DOC.createElement('div');
    el.id = 'ar6-bn2';
    el.setAttribute('data-kind', k);
    el.setAttribute('role', k === 'bad' ? 'alert' : 'status');
    el.style.top = 'calc(8px + env(safe-area-inset-top))';
    el.innerHTML = '<span class="ar6-bi">' + ico(k === 'bad' ? 'alert' : (k === 'warn' ? 'warn' : (k === 'ok' ? 'check' : 'info'))) + '</span>' +
      '<span class="ar6-bt">' + esc(String(msg == null ? '' : msg).replace(/^[^\u4e00-\u9fa5A-Za-z0-9]+/, '')) + '</span>' +
      '<button class="ar6-bx" aria-label="关闭">✕</button>';
    DOC.body.appendChild(el);
    var close = function () { try { el.parentNode.removeChild(el); } catch (e) {} };
    el.querySelector('.ar6-bx').addEventListener('click', function (ev) { try { ev.stopPropagation(); } catch (e) {} close(); });
    /* 双 rAF：先让它进树，再加 data-in，transition 才会真正跑 */
    var raf = HOST.requestAnimationFrame || function (fn) { return setTimeout(fn, 16); };
    raf(function () { raf(function () { try { el.setAttribute('data-in', '1'); } catch (e) {} }); });
    if (bannerTimer) clearTimeout(bannerTimer);
    bannerTimer = setTimeout(function () {
      try {
        el.removeAttribute('data-in');
        setTimeout(close, 220);
      } catch (e) {}
    }, 3600);
  } catch (e) {}
}

function bannerOld(msg, kind) {
  if (DISPOSED) return;
  try {
    if (!DOC || !DOC.body) return;
    var id = 'ar6-bn';
    var el = DOC.getElementById(id);
    if (!el) {
      el = DOC.createElement('div');
      el.id = id;
      el.style.cssText = 'position:fixed;left:50%;transform:translateX(-50%);top:10px;z-index:2147483001;' +
        'max-width:min(720px,92vw);padding:8px 14px;border-radius:9px;font:13px/1.45 -apple-system,"Microsoft YaHei",sans-serif;' +
        'color:#fff;box-shadow:0 6px 20px rgba(0,0,0,.2);cursor:pointer;transition:opacity .3s;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;';
      el.addEventListener('click', function () { try { el.parentNode.removeChild(el); } catch (e) {} });
      DOC.body.appendChild(el);
    }
    el.textContent = String(msg == null ? '' : msg);
    el.style.background = BANNER_KIND[kind] || BANNER_KIND.gray;
    el.style.opacity = '1';
    el.style.display = 'block';
    if (bannerTimer) clearTimeout(bannerTimer);
    bannerTimer = setTimeout(function () {
      try {
        el.style.opacity = '0';
        setTimeout(function () { try { el.style.display = 'none'; } catch (e) {} }, 320);
      } catch (e) {}
    }, 3800);
  } catch (e) {}
}

/* ---------------- 面板 ---------------- */

function counts() {
  var log = readLog();
  var c = { same: 0, diff: 0, thin: 0, unknown: 0, other: 0 };
  for (var i = 0; i < log.length; i++) {
    var k = log[i].code;
    if (k === 'same') c.same++;
    else if (k === 'diff') c.diff++;
    else if (k === 'thin') c.thin++;
    else if (k === 'unknown') c.unknown++;
    else c.other++;
  }
  return c;
}

function panelStyle(mode, mini) {
  if (mini) {
    var ns = floatSizePx();
    var box = 'width:' + ns + 'px;height:' + ns + 'px;min-width:' + ns + 'px;min-height:' + ns + 'px;left:0;top:0;';
    if (mode === 'mobile') return 'position:fixed;z-index:2147483000;' + box;
    return 'position:fixed;z-index:2147483000;' + box;
  }
  if (mode === 'mobile') {
    // 悬浮窗：可拖动、可记忆位置，不再铺满底部
    var baseW = 'width:min(92vw,380px);max-height:72vh;max-height:min(72vh,calc(100vh - 96px));max-height:min(72svh,calc(100svh - 96px));' +
      'border-radius:16px;display:flex;flex-direction:column;' +
      'overflow:auto;-webkit-overflow-scrolling:touch;touch-action:pan-y;overscroll-behavior:contain;scrollbar-width:thin;box-shadow:0 12px 36px rgba(0,0,0,.28);';
    var lx = cfg.mx, ly = cfg.my;
    if (typeof lx === 'number' && typeof ly === 'number') {
      var ww = (HOST.innerWidth || 360), hh = (HOST.innerHeight || 640);
      /* 面板实际宽/高：按视口和 72vh 上限估，再把记忆坐标夹回可视区 */
      var pw = Math.min(Math.round(ww * 0.92), 380);
      var ph = Math.min(Math.round(hh * 0.72), hh - 24);
      if (!isFinite(lx) || !isFinite(ly) || lx < -20 || ly < -20 || lx > ww - 40 || ly > hh - 60) { lx = null; ly = null; }
      else {
        lx = Math.max(6, Math.min(lx, ww - pw - 6));
        ly = Math.max(6, Math.min(ly, hh - ph - 6));
      }
    }
    if (typeof lx === 'number' && typeof ly === 'number') {
      return 'position:fixed;left:' + Math.round(lx) + 'px;top:' + Math.round(ly) + 'px;z-index:2147483000;' + baseW;
    }
    return 'position:fixed;right:8px;bottom:calc(72px + env(safe-area-inset-bottom));z-index:2147483000;' + baseW;
  }
  var dw = (HOST.innerWidth || 1280);
  var wPx = Math.min(440, dw - 32);
  var hPx = Math.min(Math.round((HOST.innerHeight || 800) * 0.78), 820);
  var dx = cfg.mx, dy = cfg.my;
  if (typeof dx === 'number' && typeof dy === 'number' && isFinite(dx) && isFinite(dy)) {
    dx = Math.max(8, Math.min(dx, dw - wPx - 8));
    dy = Math.max(8, Math.min(dy, (HOST.innerHeight || 800) - hPx - 8));
  }
  return 'position:fixed;right:16px;bottom:18px;z-index:2147483000;width:' + wPx + 'px;max-width:calc(100vw - 32px);' +
    'max-height:min(78vh,820px);overflow-y:auto;overflow-x:auto;scrollbar-width:thin;' +
    (typeof dx === 'number' ? ('left:' + Math.round(dx) + 'px;right:auto;') : '') +
    (typeof dy === 'number' ? ('top:' + Math.round(dy) + 'px;bottom:auto;') : '');
}

var DISPOSED = false;   /* dispose 之后禁止一切渲染，避免面板被"复活" */
var BOOT_TOKEN = 'ar6-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 8);
var BOOT_TIMER = null;  /* 租约心跳：告诉同页别的实例「我还活着」 */
var LAST_MIN = null;    /* 上一次是否处于收起态：用于展开入场动画 */
var LAST_COUNTS = null; /* 上一次四个数字：只有变化才 bump */

function root() {
  try {
    if (DISPOSED) return null;
    if (!DOC || !DOC.body) return null;
    var el = DOC.getElementById(ROOT_ID);
    if (!el) {
      el = DOC.createElement('div');
      el.id = ROOT_ID;
      DOC.body.appendChild(el);
    }
    return el;
  } catch (e) { return null; }
}

var AR6_ICONS = {
  shield: 'M12 3.2 4.8 6v5.5c0 4.3 3 8 7.2 9.3 4.2-1.3 7.2-5 7.2-9.3V6Z',
  'shield-off': 'M12 3.2 4.8 6v5.5c0 4.3 3 8 7.2 9.3 4.2-1.3 7.2-5 7.2-9.3V6Z M4 4 20 20',
  alert: 'M12 3.4 21.2 19.6H2.8Z M12 9.4v4.2 M12 16.6v.02',
  warn: 'M12 3.4 21.2 19.6H2.8Z M12 9.4v4.2 M12 16.6v.02',
  check: 'M20 6.6 9.2 17.4 4.4 12.6',
  info: 'M12 3.2a8.8 8.8 0 1 0 0 17.6 8.8 8.8 0 0 0 0-17.6Z M12 10.8v5 M12 7.9v.02',
  feather: 'M19.6 4.4c-6.6-.4-11.4 3.4-13 9.6L4.6 20l6-2c6.2-1.6 9.4-6.4 9-13.6Z M4.6 20 13 11.6',
  brain: 'M9 4.2a3 3 0 0 0-3 3v1a3 3 0 0 0 0 6v2a3 3 0 0 0 6 0V4.2 M15 4.2a3 3 0 0 1 3 3v1a3 3 0 0 1 0 6v2a3 3 0 0 1-6 0',
  pin: 'M12 21.2c3.8-4.1 5.9-7.2 5.9-10a5.9 5.9 0 1 0-11.8 0c0 2.8 2.1 5.9 5.9 10Z M12 8.7a2.2 2.2 0 1 0 0 4.4 2.2 2.2 0 0 0 0-4.4Z',
  eye: 'M2.4 12S6 6.2 12 6.2 21.6 12 21.6 12 18 17.8 12 17.8 2.4 12 2.4 12Z M12 9.4a2.6 2.6 0 1 0 0 5.2 2.6 2.6 0 0 0 0-5.2Z',
  bell: 'M18.4 16.4H5.6l1.7-2.3V9.4a4.7 4.7 0 0 1 9.4 0v4.7Z M10 19a2 2 0 0 0 4 0',
  bandage: 'M7.4 8.2h9.2a3.8 3.8 0 0 1 0 7.6H7.4a3.8 3.8 0 0 1 0-7.6Z M12 9.9v4.2 M9.9 12h4.2',
  microscope: 'M6 20h12 M9 20v-3 M12 4l4 4-5 5-4-4 5-5Z M7 11l6 6 M14 14l4 4',
  flask: 'M9 3h6 M10 3v6l-5 9a2 2 0 0 0 2 3h10a2 2 0 0 0 2-3l-5-9V3 M7.5 15h9',
  stethoscope: 'M6 4v5a4 4 0 0 0 8 0V4 M10 13v3a4 4 0 0 0 8 0v-2 M18 8.5a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3Z',
  telescope: 'M3 14l12-7 3 5-12 7-3-5Z M14 6l2-1 3 5-2 1 M9 16l-2 4',
  tag: 'M3.6 12.4 12.4 3.6H20.4v8l-8.8 8.8Z M16.4 7.6h.02',
  gauge: 'M3.8 17.4a8.4 8.4 0 1 1 16.4 0 M12 17.4 16.2 11',
  target: 'M12 3.2a8.8 8.8 0 1 0 0 17.6 8.8 8.8 0 0 0 0-17.6Z M12 7.6a4.4 4.4 0 1 0 0 8.8 4.4 4.4 0 0 0 0-8.8Z M12 11.1v1.8',
  file: 'M6.2 3.4h7.6l4.4 4.4v12.8H6.2Z M13.8 3.4v4.4h4.4 M9.4 13h5.2 M9.4 16.6h3.4',
  wrench: 'M14.2 6.2a4.2 4.2 0 1 0 4.6 4.6l-9.2 9.2a2 2 0 0 1-2.8-2.8Z',
  book: 'M5.2 4.6a1.6 1.6 0 0 1 1.6-1.6h12v17.6H6.8a1.6 1.6 0 0 1-1.6-1.6Z M8.8 3v17.6 M12.2 8.2h4',
  trash: 'M4.9 7.2h14.2 M9.5 7.2V5h5v2.2 M6.7 7.2 7.6 19.6h8.8L17.3 7.2 M10.2 10.9v5.4 M13.8 10.9v5.4',
  palette: 'M12 3a9 9 0 0 0 0 18c2 0 2-2 1-3s0-2 2-2h3a3 3 0 0 0 3-3c0-5-4-10-9-10Z M7.5 9h.5 M11 6.5h.5 M15.5 8h.5',
  ghost: 'M5 20V10a7 7 0 0 1 14 0v10l-2.5-2-2 2-2.5-2-2 2L8 18Z M9.5 10h.5 M14 10h.5',
  compass: 'M12 3.2a8.8 8.8 0 1 0 0 17.6 8.8 8.8 0 0 0 0-17.6Z M15.6 8.4 13.7 13.7 8.4 15.6 10.3 10.3Z',
  refresh: 'M20 12a8 8 0 1 1-2.6-5.9 M20 3.6v5h-5',
  orbit: 'M12 9.1a2.9 2.9 0 1 0 0 5.8 2.9 2.9 0 0 0 0-5.8Z M12 3.5c4.5 0 8.1 3.8 8.1 8.5 M12 20.5c-4.5 0-8.1-3.8-8.1-8.5',
  scale: 'M12 4.2v15.6 M7.4 19.8h9.2 M4.4 8.2h15.2 M4.4 8.2 2 13.6a2.5 2.5 0 0 0 4.8 0Z M19.6 8.2 17.2 13.6a2.5 2.5 0 0 0 4.8 0Z',
  out: 'M12 12.6V3.9 M8.5 7.3 12 3.8l3.5 3.5 M4.8 13.4v4.5h14.4v-4.5',
  ledger: 'M4.2 7h9.2 M4.2 12h12.6 M4.2 17h7.4 M17.6 6.3a.7.7 0 1 0 0 1.4.7.7 0 0 0 0-1.4Z',
  card: 'M3.6 7.2h16.8v9.6H3.6Z M15.4 10.2a1.9 1.9 0 1 0 0 3.8 1.9 1.9 0 0 0 0-3.8Z M6.6 12h3.4',
  ask: 'M12 3.2a8.8 8.8 0 1 0 0 17.6 8.8 8.8 0 0 0 0-17.6Z M9.5 9.7a2.6 2.6 0 1 1 3.5 2.4c-.7.3-1 .9-1 1.6v.5 M12 17.3v.02',
  x: 'M6 6 18 18 M18 6 6 18',
  dot: 'M12 8.4a3.6 3.6 0 1 0 0 7.2 3.6 3.6 0 0 0 0-7.2Z'
};

function ico(name) {
  var d = AR6_ICONS[name] || AR6_ICONS.dot;
  return '<svg class="ar6-i" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" style="width:14px;height:14px;flex:0 0 14px" aria-hidden="true"><path d="' + d + '"/></svg>';
}

function icoOf(label) {
  var s = String(label || '');
  if (s.indexOf('防全知') >= 0) return 'compass';
  if (s.indexOf('去媚') >= 0) return 'orbit';
  if (s.indexOf('对照') >= 0 || s.indexOf('A/B') >= 0) return 'scale';
  if (s.indexOf('导出') >= 0) return 'out';
  if (s.indexOf('账本') >= 0) return 'ledger';
  if (s.indexOf('渠道卡') >= 0) return 'tag';
  if (s.indexOf('安全') >= 0) return 'shield-off';
  if (s.indexOf('自检') >= 0) return 'stethoscope';
  if (s.indexOf('抗截断') >= 0) return 'alert';
  if (s.indexOf('破甲') >= 0) return 'bandage';
  if (s.indexOf('补一次') >= 0) return 'bandage';
  if (s.indexOf('确认') >= 0) return 'bell';
  if (s.indexOf('思考') >= 0) return 'brain';
  if (s.indexOf('微扰') >= 0 || s.indexOf('混淆') >= 0) return 'feather';
  if (s.indexOf('钉') >= 0) return 'pin';
  if (s.indexOf('观察') >= 0) return 'eye';
  if (s.indexOf('原生') >= 0 || s.indexOf('探针') >= 0) return 'microscope';
  if (s.indexOf('双通道') >= 0) return 'flask';
  if (s.indexOf('验渠道') >= 0) return 'telescope';
  if (s.indexOf('别名') >= 0) return 'tag';
  if (s.indexOf('档位') >= 0) return 'gauge';
  if (s.indexOf('身份') >= 0) return 'target';
  if (s.indexOf('报告') >= 0) return 'file';
  if (s.indexOf('排查') >= 0) return 'wrench';
  if (s.indexOf('说明') >= 0) return 'book';
  if (s.indexOf('清空') >= 0) return 'trash';
  if (s.indexOf('外观') >= 0) return 'palette';
  if (s.indexOf('悬浮') >= 0) return 'ghost';
  if (s.indexOf('找回') >= 0) return 'ghost';
  if (s.indexOf('请求') >= 0) return 'file';
  return 'dot';
}

/* 去掉前导 emoji，只用于显示；data-ar6 仍用原串，分派不受影响 */
function chipText(label) {
  var s = String(label || '');
  var i = 0;
  while (i < s.length) {
    var c = s.charCodeAt(i);
    if ((c >= 48 && c <= 57) || (c >= 65 && c <= 90) || (c >= 97 && c <= 122) || (c >= 0x4e00 && c <= 0x9fff)) break;
    i++;
  }
  return s.slice(i) || s;
}

/* extra：附在 <button> 上的额外属性（如 'data-off="1"'），默认没有。
   反 OOC 的子 chip 靠它变灰；别的调用方不用传，行为逐字不变。 */
function chip(label, on, extra) {
  return '<button class="ar6-b' + (on ? ' on' : '') + '"' + (extra ? ' ' + extra : '') +
    ' data-ar6="' + esc(String(label)) + '">' +
    ico(icoOf(label)) + '<span>' + esc(chipText(label)) + '</span></button>';
}

function btnIco(act, name, text, cls) {
  return '<button class="ar6-b' + (cls ? ' ' + cls : '') + '" data-ar6="' + act + '">' +
    ico(name) + '<span>' + esc(text) + '</span></button>';
}

function openPad() {
  PAD_OPEN = true;
  minimized = true;
  cfg.min = true;
  try { closeCard(); } catch (eC) {}
  render();
  try { floatApplyPosition(root(), true); } catch (eA) {}
}

function closePad() {
  PAD_OPEN = false;
  try { saveCfg(); } catch (eS) {}
  render();
  try { floatApplyPosition(root(), true); } catch (eA) {}
}

var OUTSIDE_BOUND = false;

/* 点面板外的空白处：有浮层就关浮层，没浮层就收起面板 */
function bindOutsideDismiss() {
  if (OUTSIDE_BOUND) return;
  if (!DOC || typeof DOC.addEventListener !== 'function') return;
  OUTSIDE_BOUND = true;
  DOC.addEventListener('pointerdown', function (ev) {
    try {
      if (DISPOSED) return;
      var t = ev && ev.target;
      if (t && t.closest && t.closest('#ar6-bn2')) return;
      if (CARD && CARD.open) {
        if (t && t.id === 'ar6-card') closeCard();   /* 只在遮罩本体上关，点卡片内部不关 */
        return;
      }
      if (minimized) return;
      var el = DOC.getElementById(ROOT_ID);
      if (!el) return;
      if (t && el.contains && el.contains(t)) return;
      if (t && t.closest && t.closest('#' + ROOT_ID)) return;
      minimized = true;
      syncMin();
      render();
    } catch (e) {}
  }, true);
}

function fitPanel(el) {
  try {
    if (!el || minimized) return;
    var vv = (HOST.visualViewport && HOST.visualViewport.height) || HOST.innerHeight || 720;
    var mode = uiMode();
    var maxH = Math.round(vv * (mode === 'mobile' ? 0.72 : 0.78));
    if (mode !== 'mobile') maxH = Math.min(maxH, 820);
    /* v8.30：给固定定位的底部按钮（#send_form）留出空间，避免面板底边压在输入框下面 */
    if (maxH > vv - 96) maxH = Math.round(vv - 96);
    if (maxH < 240) maxH = 240;
    el.style.height = maxH + 'px';
    el.style.maxHeight = maxH + 'px';
    el.style.display = 'flex';
    el.style.flexDirection = 'column';
    el.style.overflow = 'hidden';
    /* v8.30：高度定死之后必须把 top 夹回可见区。
       8.28 只写高度不看位置，手机上一旦 top 偏下，底边就落到屏幕外，
       用户看到的正是「只有上半截」——这正是本次反馈的根因之一。 */
    var top = parseFloat(el.style.top);
    if (!isFinite(top)) top = el.getBoundingClientRect().top;
    if (isFinite(top)) {
      var limit = vv - maxH - 6;
      if (limit < 6) limit = 6;
      var nt = top;
      if (top > limit) nt = limit;
      else if (top < 6) nt = 6;
      if (nt !== top) { el.style.top = Math.round(nt) + 'px'; el.style.bottom = 'auto'; }
      if (typeof cfg === 'object' && cfg) {
        if (!(Math.abs((cfg.my == null ? nt : cfg.my) - nt) <= 2)) { cfg.my = Math.round(nt); try { saveCfg(); } catch (eS) {} }
        else cfg.my = Math.round(nt);
      }
    }
  } catch (e) {}
}

function mountAll() {
  var r = root();
  if (!r) return false;
  ensureStyle(DOC);
  bindOutsideDismiss();
  var mode = uiMode();
  var c = counts();
  var log = readLog();
  var st = stateOfRun();

  var html = '';
  if (minimized) {
    /* v8.4：不再常驻悬浮球/控制盘 —— 收起即完全隐藏，用扩展菜单「魔法棒」或工具栏重开 */
    r.setAttribute('data-min', '1');
    html = '';
    r.innerHTML = '';
    try { r.style.display = 'none'; } catch (eMin) {}
    return true;
  }
  if (minimized) {
    r.className = '';
    r.setAttribute('style', panelStyle(mode, true));
    r.setAttribute('data-min', '1');
    r.setAttribute('data-st', PAD_OPEN ? 'ok' : st.kind);
    try { r.setAttribute('data-rm', cfg.rm || cfg.fx === 'off' ? '1' : '0'); } catch (eR1) {}
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
  } else {
    r.className = mode === 'mobile' ? 'ar6-mobile' : '';
    try { r.removeAttribute('data-min'); } catch (eR0) {}
    r.setAttribute('data-rm', cfg.rm || cfg.fx === 'off' ? '1' : '0');
    r.setAttribute('style', panelStyle(mode, false));
    html += '<div class="ar6-p"><div class="ar6-h">' +
      '<span class="ar6-dot ' + st.kind + '"></span><b>卢克之光 V' + esc(VERSION) + '</b>' +
      '<span class="ar6-sp"></span>' +
      '<span class="ar6-hb" data-ar6-grip="1" title="按住拖动"></span>' +
      '<button class="ar6-x" data-ar6="help" title="使用说明">' + ico('ask') + '</button>' +
      '<button class="ar6-x" data-ar6="min" title="收起">▾</button>' +
      '<button class="ar6-x" data-ar6="hide" title="隐藏（点悬浮球恢复）">✕</button>' +
      '</div><div class="ar6-body" data-ar6-scroll="1">';

    html += '<div class="ar6-st">' + st.line + '</div>';

    html += '<div class="ar6-cards' + (mode === 'mobile' ? ' mobile' : '') + '">' +
      '<div class="ar6-c bad"><div class="n">' + c.diff + '</div><div class="l">被换</div></div>' +
      '<div class="ar6-c warn"><div class="n">' + c.thin + '</div><div class="l">无思考</div></div>' +
      '<div class="ar6-c ok"><div class="n">' + c.same + '</div><div class="l">一致</div></div>' +
      '<div class="ar6-c"><div class="n">' + c.unknown + '</div><div class="l">未定</div></div>' +
      '</div>' + kpiLine();

    html += '<div class="ar6-sec">防护</div><div class="ar6-row">' +
      chip(cfg.enabled ? '● 已开启' : '○ 已关闭', cfg.enabled) +
      chip('🪶 微扰:' + profileLabel(), cfg.refract !== 'off') +
      chip('🧠 思考:' + (cfg.think === 'high' ? '高' : '不改'), cfg.think === 'high') +
      chip('📌 钉参数:' + (cfg.pin ? '开' : '关'), cfg.pin) +
      chip('👁 观察器:' + (cfg.observe ? '开' : '关'), cfg.observe) +
      chip(cfg.safe ? '🩺 安全:开' : '🩺 安全:关', cfg.safe) +
      chip('🎯 范围:' + scopeLabel(), cfg.scope !== 'all') +
      '</div>';

    html += '<div class="ar6-input">' +
      '<input data-ar6="scope" placeholder="范围关键词，逗号分隔（如 deepseek,gemini）" value="' + esc(cfg.scopeList) + '">' +
      '<button class="ar6-b" data-ar6="savescope">存范围</button>' +
      '</div>';

    /* v0.7：抗截断独立成段（用户要求「从破甲里独立出来，变成一个单独的条目」）。
       位置：防护之后、破甲之前，和叙述/破甲同级，不再搭破甲的便车。 */
    html += '<div class="ar6-sec">抗截断</div><div class="ar6-row">' +
      chip(truncChipLabel(), truncLevel(cfg.trunc) !== 'off') +
      chip(truncLenChipLabel(), truncLevel(cfg.trunc) !== 'off' && truncLenOf(cfg.truncLen) > 0) +
      '</div>' +
      '<div style="font-size:11px;opacity:.72;margin:-2px 0 6px;line-height:1.5">' + esc(truncStatLine()) + '</div>';

    html += '<div class="ar6-sec">破甲</div><div class="ar6-row">' +
      chip(jailChipLabel(), cfg.jail !== 'off') +
      (cfg.jail === 'off' ? '' : chip('🩹 补前先问:' + (cfg.jailConfirm === false ? '关' : '开'), cfg.jailConfirm !== false)) +
      btnIco('jailnow', 'bandage', '补一次') +
      '</div>' +
      '<div style="font-size:11px;opacity:.72;margin:-2px 0 6px;line-height:1.5">' + esc(jailStatLine()) + '</div>';
    if (cfg.jail === 'strong') {
      html += '<div class="ar6-row">' +
        chip('保底token:' + (cfg.jailTok ? '开' : '关'), cfg.jailTok) +
        chip('解安全:' + (cfg.jailSafe ? '开' : '关'), cfg.jailSafe) +
        chip('预审框:' + (cfg.jailPre ? '开' : '关'), cfg.jailPre) +
        chip('输出契约:' + (cfg.jailText ? '开' : '关'), cfg.jailText) +
        '</div>';
    }
    var jst = jailStatus();
    if (jst) {
      html += '<div style="font-size:11px;padding:0 12px 6px;color:' +
        (jst.charAt(0) === '⚠' ? '#a40e26' : '#57606a') + '">' + esc(jst) + '</div>';
    }

    html += '<div class="ar6-sec">叙述</div><div class="ar6-row">' +
      chip('🧭 防全知:' + narrTag(cfg.know), cfg.know !== 'off') +
      chip('💄 去媚:' + narrTag(cfg.charm), cfg.charm !== 'off') +
      '</div>';
    if (cfg.know !== 'off' || cfg.charm !== 'off') {
      html += '<div style="font-size:11px;padding:0 12px 6px;color:#57606a">每轮 +约 ' +
        narrTokens() + ' tok，贴在末条 user 消息尾部</div>';
    }

    /* v0.76 反 OOC：总闸 + 四个子项。
       子 chip 的 data-off 只在「总闸关」或「这一项已让给预设」时出现（变灰）；
       总闸关时点它们不报错，只提示先开总闸。 */
    html += '<div class="ar6-sec">反 OOC</div><div class="ar6-row">' +
      chip('🎭 反OOC:' + (String(cfg.ooc || 'off') === 'on' ? '开' : '关'), String(cfg.ooc || 'off') === 'on') +
      chip('📈 行为基线:' + (String(cfg.base || 'on') === 'on' ? '开' : '关'), String(cfg.base || 'on') === 'on') +
      chip('🔬 返回格式:' + (String(cfg.shape || 'on') === 'on' ? '开' : '关'), String(cfg.shape || 'on') === 'on') +
      oocChip('roll') + oocChip('tpl') + oocChip('chg') + oocChip('voice') +
      '</div>' +
      '<div style="font-size:11px;padding:0 12px 6px;color:#57606a">' + esc(oocStatusLine()) + '</div>';
    if (String(cfg.ooc || 'off') === 'on') {
      html += '<div style="font-size:11px;padding:0 12px 6px;color:#57606a">每轮 +约 ' +
        oocTokens() + ' tok，' +
        (oocChannel() ? '走酒馆扩展提示位（IN_CHAT / depth 4）' : '贴末条 user 消息尾部') + '</div>';
    }

    /* v0.98 查新版；v0.98 起能一键装（把新包写进酒馆助手的脚本表） */
    html += '<div class="ar6-sec">体检</div>';
    html += '<div class="ar6-row">' +
      chip('⬆ 检查更新', true) +
      chip('⟳ 开面板自动查:' + (updOn() ? '开' : '关'), updOn()) +
      chip('🟦 只查 Gemini:' + (cfg.onlyGemini === false ? '关' : '开'), cfg.onlyGemini !== false) +
      (updHasPkg() ? chip('⬇ 装新版:' + updLatest(), true) : '') +
      (updCanUndo() ? chip('↩ 撤销更新', false) : '') +
      '</div>';
    /* 有新版才多一行灰字；没有就什么都不显示，别占位置 */
    var updTxt = updLine();
    if (updTxt) {
      html += '<div style="font-size:11px;padding:0 12px 6px;color:#57606a">' + esc(updTxt) +
        (updHasPkg() ? '　点「装新版」直接装，装完刷新一次页面' : '') + '</div>';
    }
    html += '<div style="font-size:11px;padding:0 12px 6px;color:#57606a">' + esc(ledLine()) + '</div>';
    if (AB_STATE.last || AB_STATE.running) {
      html += '<div style="font-size:11px;padding:0 12px 6px;color:#57606a">' + esc(abLine()) + '</div>';
    }
    html += '<div class="ar6-row">' +
      btnIco('native', 'microscope', '原生探针') +
      btnIco('dual', 'flask', '双通道') +
      btnIco('self', 'stethoscope', '自检 20 项') +
      btnIco('verify', 'telescope', '验渠道') +
      btnIco('alias', 'tag', '扫别名') +
      btnIco('level', 'gauge', '档位检查') +
      btnIco('slim', 'feather', '瘦身报告') +
      btnIco('fp', 'tag', '渠道卡') +
      btnIco('exportlog', 'out', '导出记录') +
      btnIco('abtest', 'scale', 'A/B 对照') +
      btnIco('idprobe', 'target', '身份筛选') +
      btnIco('report', 'card', '报告') +
      btnIco('card', 'wrench', '排查') +
      btnIco('help', 'ask', '说明') +
      btnIco('copy', 'file', '最近请求') +
      btnIco('clear', 'trash', '清空', 'danger') +
      btnIco('rebuild', 'refresh', '重建基线') +
      '</div>';

    html += '<div class="ar6-input">' +
      '<input data-ar6="base" placeholder="反代 Base（如 https://x/v1）" value="' + esc(cfg.dualBase) + '">' +
      '<input data-ar6="key" type="password" autocomplete="off" spellcheck="false" placeholder="API Key（可留空）" value="' + esc(cfg.dualKey) + '">' +
      '<button class="ar6-b" data-ar6="save">存</button>' +
      '</div>';

    /* v0.98 版本文件地址：单独一行。塞进上面那行会被挤到只剩百来像素，
       手机上连 placeholder 都看不全，看不全就等于没有这个输入框。 */
    /* v0.98 内置了地址，这一格只是「你要换自己的地址才填」，平时空着就行。 */
    html += '<div class="ar6-input">' +
      '<input data-ar6="updurl" placeholder="' + (updUrlIsDefault()
        ? '版本文件地址：已内置，留空即可'
        : esc('自定义地址：' + updUrl())) + '" value="' + esc(cfg.updUrl) + '">' +
      '</div>';

    html += floatSettingsHTML();

    if (selfTestResult) html += renderSelfTest(selfTestResult);

    html += idCard();

    html += '<div class="ar6-tbl">' + renderTable(log) + '</div>';

    html += '<div class="ar6-foot"><span>挂钩 <b class="' + (hooked ? 'ok' : 'bad') + '">' + (hooked ? '是' : '否') + '</b></span>' +
      '<span>XHR <b class="' + (HOOK_TARGET.xhr ? 'ok' : 'gray') + '">' + (HOOK_TARGET.xhr ? '是' : '关') + '</b></span>' +
      '<span class="ar6-sp"></span><span>宿主 ' + ((HOST === HOST.top) ? 'top' : 'iframe') + '</span>' +
      '<span>样式 <b class="' + (DOC.getElementById(STYLE_ID) ? 'ok' : 'bad') + '">' + (DOC.getElementById(STYLE_ID) ? '✓' : '✗') + '</b></span>' +
      '<span>点击 <b class="mono">' + clickCount + '</b></span>' +
      '<span>按钮 <b class="' + (btnReady() ? 'ok' : (BTN_OK ? 'warn' : 'bad')) + '">' + btnSummary() + '</b></span>' +
      '<span>可验 <b class="' + (verifiableCode() === 'yes' ? 'ok' : (verifiableCode() === 'no' ? 'bad' : 'gray')) + '">' + verifiableLabel() + '</b></span>' +
      (cfg.alias ? '<span>别名 <b class="mono">' + esc(cfg.alias) + '</b></span>' : '') +
      '<span>钉住 <b class="' + auditColor() + '">' + auditLabel() + '</b></span>' +
      (foreignCount() >= 2 ? '<span>护盾 <b class="warn">' + foreignCount() + '</b></span>' : '') +
      '<span>' + esc(idFooter()) + '</span>' +
      '<span>保留 ' + readLog().length + '/' + (cfg.keep || MAX_LOG) + '</span></div>';

    html += '</div></div>';
  }

  var prevFocus = null;
  try { prevFocus = DOC.activeElement; } catch (eF0) {}
  var wasMin = (LAST_MIN === true);
  LAST_MIN = minimized;
  var scTop = 0;
  try { var oldBody = r.querySelector('.ar6-body'); if (oldBody) scTop = oldBody.scrollTop || 0; } catch (eSc) {}
  r.innerHTML = html;
  try {
    if (scTop > 0) { var nb = r.querySelector('.ar6-body'); if (nb) nb.scrollTop = scTop; }
  } catch (eSc2) {}
  /* v8.0.3：还原焦点（重绘会换掉 DOM） */
  try {
    if (prevFocus && prevFocus.getAttribute) {
      var fkey = prevFocus.getAttribute('data-ar6');
      if (fkey) {
        var back = r.querySelector('[data-ar6="' + fkey.replace(/"/g, '') + '"]');
        if (back && back.focus) back.focus();
      }
    }
  } catch (eFr) {}
  /* 内联定位兜底：某些容器/CSP 会让 style 失效，这里再写一次关键属性 */
  var panelEl = r.firstChild;
  /* v8.0.3：只在「从收起变展开」时播一次入场动画 */
  try { if (panelEl && !minimized && wasMin && panelEl.classList) panelEl.classList.add('ar6-anim'); } catch (eAn) {}
  try {
    if (panelEl && panelEl.className && panelEl.className.indexOf('ar6-pill') >= 0) {
      panelEl.style.cursor = 'pointer';
    }
  } catch (e) {}

  if (!minimized) { try { fitPanel(r); } catch (eFP) {} }
  if (!minimized && panelEl) { try { installRootDrag(r, 'panel'); } catch (eRD) {} }
  if (minimized) {
    try { if (!PAD_OPEN) bindFloatGestures(r); installRootDrag(r, PAD_OPEN ? 'pad' : 'ball'); floatApplyPosition(r, true); } catch (eF) {}
  } else {
    try { installFloatSettings(r); } catch (eFS) {}
  }

  if (!r.__ar6bound) {
    r.__ar6bound = true;
    /* 只用逐元素直绑（下方 bindDirect），避免委托与直绑同一手势触发两次 */
    r.addEventListener('input', onPanelInput);
    r.addEventListener('change', onPanelChange);
  }
  bindDirect(r);
  setTimeout(verifyVisible, 400);
  return true;
}

/* 逐个按钮直绑：某些扩展会拦截冒泡或吞掉 click，委托会失效 */
function bindDirect(r) {
  try {
    var nodes = r.querySelectorAll('[data-ar6]');
    for (var i = 0; i < nodes.length; i++) {
      (function (n) {
        if (n.__ar6direct) return;
        var tag = (n.tagName || '').toUpperCase();
        if (tag === 'INPUT') return;          /* 输入框走 input 事件 */
        if (n.getAttribute('data-ar6') === 'expand') return;  /* v8.1：交给 bindFloatGestures 的 tap 分支，避免 pointerdown 抢走拖动 */
        n.__ar6direct = true;
        /* 只监听一种激活事件：两种都挂时，pointerdown 改状态并重绘，
           随后的 click 落到新节点、旧闭包的去重时间戳失效，等于又切回去。 */
        var sx = 0, sy = 0, seen = 0, seenId = -1, seenAt = 0;
        var fire = function (ev) {
          try {
            onPanelClick({ target: n, type: (ev && ev.type) || 'click',
              preventDefault: function () {}, stopPropagation: function () {} });
          } catch (e) {}
        };
        n.addEventListener('pointerdown', function (ev) {
          try {
            sx = ev.clientX || 0; sy = ev.clientY || 0; seen = 1;
            seenId = (ev.pointerId == null ? -1 : ev.pointerId);
            seenAt = Date.now();
          } catch (e) {}
        }, true);
        n.addEventListener('pointerup', function (ev) {
          try {
            if (!seen) return;
            var dx = Math.abs((ev.clientX || 0) - sx), dy = Math.abs((ev.clientY || 0) - sy);
            var pid = (ev.pointerId == null ? -1 : ev.pointerId);
            var held = Date.now() - seenAt;
            seen = 0;
            if (dx > 8 || dy > 8) return;                              /* 滑动起手不触发 */
            if (seenId !== -1 && pid !== -1 && pid !== seenId) return;  /* 不是同一根手指 */
            if (held > 900) return;                                     /* 长按后抬起不算点击 */
            fire(ev);
          } catch (e) {}
        }, true);
        n.addEventListener('click', function (ev) {
          /* 指针事件可用时，click 只作为无障碍兜底（pointerup 已处理过） */
          try { if (HOST.PointerEvent) return; fire(ev); } catch (e) { fire(ev); }
        }, true);
      })(nodes[i]);
    }
  } catch (e) {}
}

function verifyVisible() {
  try {
    var el = DOC && DOC.getElementById(ROOT_ID);
    if (!el) return;
    var b = el.getBoundingClientRect();
    /* v8.1：阈值 12（原 40 会把 28~38px 的合法悬浮球判成异常，重建后成 0×0） */
    if (!b || b.width < 12 || b.height < 12 || b.top < -5000 || b.left < -5000) {
      var mode = uiMode();
      el.setAttribute('style', panelStyle(mode, minimized));
      el.style.zIndex = '2147483000';
      try { if (minimized) floatApplyPosition(el, true); } catch (eA) {}
      if (el.parentNode !== DOC.body) DOC.body.appendChild(el);
      if (HOST.console) HOST.console.warn('[AR6] 面板位置异常，已复位');
    }
    /* v8.30：底边掉出视口（手机地址栏伸缩、键盘弹起后最常见）单独判一次。
       只补高度和 top，不动整条 style，避免又一次把 fitPanel 的结果抹掉。 */
    var vv = (HOST.visualViewport && HOST.visualViewport.height) || HOST.innerHeight || 720;
    if (!minimized && b && b.height >= 12 && b.bottom > vv + 2) {
      try { fitPanel(el); } catch (eFB) {}
    }
  } catch (e) {}
}

/* v8.30：一行体检。手机上「只有上半截」时先看这个——
   css.h 有没有写死成 px、body 的 clientHeight/scrollHeight 是否分离、面板底边(fit)有没有超出可视区。 */
/* 复制必须看 promise：clipboard 被拒时旧代码照样报「已复制」。 */
function copyTo(txt, label) {
  var body = String(txt == null ? '' : txt);
  try {
    var nav = HOST.navigator;
    if (nav && nav.clipboard && nav.clipboard.writeText) {
      nav.clipboard.writeText(body).then(function () {
        banner(label + ' 已复制（' + body.length + ' 字）', 'ok');
      }, function () {
        banner(label + ' 复制被浏览器拒绝，已打印到控制台（可手动选）', 'warn');
        try { HOST.console.log(body); } catch (e2) {}
      });
      return;
    }
  } catch (e) {}
  banner(label + ' 这台浏览器没有剪贴板权限，已打印到控制台', 'warn');
  try { HOST.console.log(body); } catch (e3) {}
}

function ar6Diag() {
  try {
    var el = DOC && DOC.getElementById(ROOT_ID);
    if (!el) return 'no-panel';
    var b = el.getBoundingClientRect();
    var body = el.querySelector ? el.querySelector('.ar6-body') : null;
    var hd = el.querySelector ? el.querySelector('.ar6-h') : null;
    var vv = (HOST.visualViewport && HOST.visualViewport.height) || HOST.innerHeight || 0;
    var cs = (HOST.getComputedStyle ? HOST.getComputedStyle(el) : null);
    var bcs = (body && HOST.getComputedStyle ? HOST.getComputedStyle(body) : null);
    return 'v=' + VERSION + '|mode=' + uiMode() + '|min=' + (minimized ? 1 : 0) +
      '|rect=' + Math.round(b.left) + ',' + Math.round(b.top) + ',' + Math.round(b.width) + 'x' + Math.round(b.height) +
      '|css.h=' + (cs ? cs.height : '?') + '|css.maxH=' + (cs ? cs.maxHeight : '?') + '|css.ov=' + (cs ? cs.overflow : '?') +
      '|body=' + (body ? body.clientHeight + '/' + body.scrollHeight + '@' + (body.scrollTop || 0) : 'none') +
      '|bodytf=' + (function () { try {
        var bcs2 = (HOST.getComputedStyle ? HOST.getComputedStyle(DOC.body) : null);
        if (!bcs2) return '-';
        return (bcs2.transform || 'none') + ',' + (bcs2.filter || 'none') + ',' +
          (bcs2.willChange || 'auto') + ',' + (bcs2.contain || 'none');
      } catch (e) { return 'err'; } })() +
      '|basis=' + (bcs ? bcs.flexBasis : '?') +
      '|head=' + (hd ? hd.offsetHeight : '?') +
      '|vh=' + (HOST.innerHeight || 0) + '|vv=' + Math.round(vv) +
      '|fit=' + (vv && b.bottom <= vv + 2 ? 'yes' : 'NO');
  } catch (e) { return 'err:' + (e && e.message ? e.message : e); }
}

function kpiLine() {
  var K = kpi();
  var cls = K.pct >= 20 ? 'bad' : (K.pct > 0 ? 'warn' : 'ok');
  var out = '<div class="ar6-st" style="margin-top:4px;font-size:12px;">路由率 <b class="' + cls + '">' +
    (K.eff ? K.pct + '%' : '—') + '</b>';
  if (K.eff) out += ' <span class="mono" style="opacity:.7">(' + K.bad + '/' + K.eff + ' · 95%CI ' + K.lo + '~' + K.hi + '%)</span>';
  out += ' · 渠道 <b>' + verifiableLabel() + '</b>';
  if (cfg.alias) out += ' · 别名 <b class="mono">' + esc(cfg.alias) + '</b>';
  return out + '</div>';
}

function profileLabel() {
  if (cfg.refract === 'light') return '轻';
  if (cfg.refract === 'mid') return '中';
  return '关';
}

function stateOfRun() {
  var s = { kind: 'gray', short: '待命', line: '等待第一轮生成…' };
  if (!cfg.enabled) { s.kind = 'gray'; s.short = '已关'; s.line = '防护已关闭（请求原样透传）'; return s; }
  s.kind = 'ok'; s.short = '防护中';
  s.line = '<b>防护开</b> · 钉参数 ' + (cfg.pin ? '开' : '关') + ' · 微扰 ' + profileLabel() +
    ' · 思考 ' + (cfg.think === 'high' ? '强制高' : '不改') + ' · 观察 ' + (cfg.observe ? '开' : '关');
  return s;
}

function srcBadge(r) {
  try {
    var t = r.src === 'body' ? '响应体' : (r.src === 'msg' ? '消息记录' : '');
    if (!t) return '';
    var cls = r.src === 'body' ? 'ok' : 'gray';
    var badge = ' <span class="ar6-tag ' + cls + '">' + t + '</span>';
    if (r.retired) badge += ' <span class="ar6-tag warn">旧标签</span>';
    return badge;
  } catch (e) { return ''; }
}

function renderTable(log) {
  if (!log || !log.length) return '<div class="ar6-empty">还没有记录。发一轮对话后，发一轮对话后这里会出现一行；左右滑动可看全所有列。</div>';
  var trs = log.slice(0, 14).map(function (r) {
    var kc = r.code === 'same' ? 'ok' : (r.code === 'diff' || r.code === 'empty' || r.code === 'blocked' || r.code === 'gate' || r.code === 'error' ? 'bad' : (r.code === 'thin' || r.code === 'quota' ? 'warn' : 'gray'));
    var tr = (r.ttft ? (r.ttft / 1000).toFixed(1) + 's' : '—');
    var req = esc(r.req || '—');
    var obs = esc(r.obs || '—');
    var src = r.src ? '<i class="ar6-src">' + esc(srcName(r.src)) + '</i>' : '';
    var same = req === obs;
    return '<tr>' +
      '<td class="c1">' + hhmm(r.at) + '</td>' +
      '<td class="c2 ar6-mono">' + req + '</td>' +
      '<td class="c3 ar6-mono">' + (same ? obs : obs) + src + '</td>' +
      '<td class="c4"><span class="ar6-tag ' + kc + '">' + esc(r.verdict || '') + '</span></td>' +
      '<td class="c5">' + tr + '</td>' +
      '<td class="c6">' + esc(String(Math.round(Number(r.chars) || 0))) + '</td>' +
      '<td class="c7">' + (r.think ? '✓' : '—') + '</td>' +
      '<td class="c8">' + (Number(r.edits) ? '+' + esc(String(Math.round(Number(r.edits)))) : '—') + '</td>' +
    '</tr>';
  }).join('');
  return '<div class="ar6-tw"><table class="ar6-t"><thead><tr>' +
    '<th class="c1">时间</th><th class="c2">请求模型</th><th class="c3">上游 · 来源</th><th class="c4">判定</th>' +
    '<th class="c5">首字</th><th class="c6">字数</th><th class="c7">思考</th><th class="c8">改动</th>' +
    '</tr></thead><tbody>' + trs + '</tbody></table></div>';
}

function srcName(s) {
  var t = String(s || '');
  if (t.indexOf('body') >= 0) return '响应体';
  if (t.indexOf('msg') >= 0) return '消息';
  return '未验';
}

function renderSelfTest(res) {
  if (!res || !res.items) return '';
  var pass = res.items.filter(function (i) { return i.ok; }).length;
  var rows = res.items.map(function (i) {
    return '<div style="font-size:11px;padding:1px 0"><span style="display:inline-block;width:14px;color:' + (i.ok ? '#1a7f37' : '#cf222e') + '">' + (i.ok ? '✓' : '✗') + '</span>' + esc(i.name) + (i.ok ? '' : ' <span style="color:#a40e26">— ' + esc(i.err || '') + '</span>') + '</div>';
  }).join('');
  return '<div class="ar6-sec">自检 ' + pass + '/' + res.items.length + ' <button class="ar6-b" data-ar6="selftoggle" style="padding:0 6px;font-size:10px">收起</button></div>' +
    '<div style="padding:2px 12px 8px;max-height:150px;overflow:auto" id="ar6-selftest">' + rows + '</div>';
}

/* ---------------- 事件 ---------------- */

var ACT_GAP = {};
var ACT_FREEZE = 0;
var ACT_TRIP_AT = 0;

/* ---------------- 反 OOC（v0.76） ---------------- */

/* 子 chip：总闸关、或这一项已经让给预设 → 变灰。
   变灰只是「看着像不能点」，真正的拦截在 oocToggle 里，别把逻辑写在样式上。 */
function oocChip(item) {
  var off = String(cfg.ooc || 'off') !== 'on';
  var grey = off || oocChoice(item) === 'preset';
  return chip(oocChipLabel(item), oocOnOf(item), grey ? 'data-off="1"' : '');
}

/* 点一个子 chip：总闸关 → 只提示；已让给预设 → 收回来；否则开关 + 必要时问一次 */
function oocToggle(item) {
  var key = OOC_CFGKEY[item];
  if (!key) return;
  if (String(cfg.ooc || 'off') !== 'on') {
    banner('先开总闸（🎭 反 OOC）', 'gray');
    return;
  }
  if (oocChoice(item) === 'preset') {
    oocSetChoice(item, 'script');
    cfg[key] = true;
    try { saveCfg(); } catch (e0) {}
    render();
    banner((OOC_LABEL[item] || item) + '：改回用我们的', 'ok');
    return;
  }
  var next = !oocOnOf(item);
  cfg[key] = next;
  try { saveCfg(); } catch (e1) {}
  render();
  banner((OOC_LABEL[item] || item) + '：' + (next ? '开' : '关'), next ? 'ok' : 'gray');
  if (!next) return;
  /* 刚打开：预设里要是也管了这一项，先问一句用谁的 */
  var ask = [], sig = null;
  try { ask = oocAsk(); } catch (e2) { ask = []; }
  if (ask.indexOf(item) < 0) return;
  try { sig = oocSig(); } catch (e3) { sig = null; }
  if (!sig || !sig.hits || !sig.hits[item]) return;
  var hits = {};
  hits[item] = sig.hits[item];
  oocConflictDialog(hits, function () { try { render(); } catch (e4) {} });
}

/* v0.84 防全知提示：它是唯一会禁止「写内心话 / 替角色做决定」的开关。
   想抢话的人开了它会被绑住，所以开之前说明一次，给个「以后不再提醒」。 */
function knowTipDialog(next) {
  var h = '<style>#ar6-card,#ar6-card *{box-sizing:border-box;min-width:0}</style>';
  h += '<div id="ar6-card" style="' + cardOverlayCss() +
    'z-index:2147483600;background:rgba(1,4,9,.86);font-family:system-ui,-apple-system,\'Segoe UI\',sans-serif">';
  h += '<div style="width:402px;max-width:calc(100vw - 20px);max-height:' + cardBoxMaxH(92) +
    ';overflow-x:hidden;overflow:auto;background:#0d1117;color:#e6edf3;border:1px solid #30363d;' +
    'border-radius:16px;box-shadow:0 12px 48px rgba(0,0,0,.6);padding:16px 16px 13px">';

  h += '<div style="font-size:15px;font-weight:600;margin-bottom:6px;line-height:1.45">' +
    '开了它，就不能写内心话，也不能替你决定了</div>';
  h += '<div style="font-size:12px;color:#c9d1d9;line-height:1.7">' +
    '防全知管的是「谁有权知道、谁有权决定」。打开之后：<br>' +
    '· 不再写任何人心里的想法；<br>' +
    '· 不再替任何角色做决定、替任何人开口——包括你的角色。' +
    '</div>';
  h += '<div style="margin-top:10px;padding:9px 11px;border-radius:9px;background:rgba(210,153,34,.12);' +
    'border:1px solid rgba(210,153,34,.35);font-size:12px;color:#e3b341;line-height:1.65">' +
    '所以你要它「抢话」——替你的角色说话、替你想、替你选——就别开这个。<br>' +
    '只想把镜头收住、还留着心理描写，点「轻」，别点「强」。' +
    '</div>';

  h += '<div style="display:flex;gap:8px;margin-top:14px">' +
    '<button class="ar6-b on" data-ar6-card="knowok" style="flex:1;justify-content:center">知道了，打开</button>' +
    '<button class="ar6-b" data-ar6-card="knowno" style="flex:1;justify-content:center">算了</button>' +
    '</div>';
  h += '<label style="display:flex;gap:7px;align-items:center;margin-top:11px;font-size:11px;' +
    'color:#8b949e;cursor:pointer">' +
    '<input type="checkbox" data-ar6-chk="1" style="accent-color:#E8C46A">' +
    '<span>以后不再提醒</span></label>';
  h += '</div></div>';

  var node = null;
  try { node = mountHTML(h); } catch (e) { node = null; }
  if (!node) { cfg.know = next; saveCfg(); render(); return; }

  node.addEventListener('click', function (ev) {
    var t = ev && ev.target, btn = null;
    while (t && t !== node) {
      if (t.getAttribute && t.getAttribute('data-ar6-card')) { btn = t; break; }
      t = t.parentNode;
    }
    if (!btn) return;
    var act = btn.getAttribute('data-ar6-card');
    var chk = null;
    try { chk = node.querySelector('[data-ar6-chk="1"]'); } catch (e3) { chk = null; }
    try { closeCard(); } catch (e2) {}
    if (act === 'knowno') {
      banner('🧭 防全知：没开，仍是' + narrTag(cfg.know), 'gray');
      return;
    }
    if (chk && chk.checked) cfg.knowTip = 'off';
    cfg.know = next; saveCfg(); render();
    banner('🧭 防全知：' + narrTag(cfg.know), cfg.know === 'off' ? 'gray' : 'ok');
  });
}

/* 冲突弹窗：预设里也管了这些项，问一次用谁的。 */
function oocConflictDialog(hits, cb) {
  if (!hits) { if (cb) cb(''); return; }
  var keys = [];
  for (var k in hits) {
    if (Object.prototype.hasOwnProperty.call(hits, k)) keys.push(k);
  }
  if (!keys.length) { if (cb) cb(''); return; }

  var h = '<style>#ar6-card,#ar6-card *{box-sizing:border-box;min-width:0}</style>';
  h += '<div id="ar6-card" style="' + cardOverlayCss() +
    'z-index:2147483600;background:rgba(1,4,9,.86);font-family:system-ui,-apple-system,\'Segoe UI\',sans-serif">';
  h += '<div style="width:402px;max-width:calc(100vw - 20px);max-height:' + cardBoxMaxH(92) +
    ';overflow-x:hidden;overflow:auto;background:#0d1117;color:#e6edf3;border:1px solid #30363d;' +
    'border-radius:16px;box-shadow:0 12px 48px rgba(0,0,0,.6);padding:16px 16px 13px">';

  h += '<div style="font-size:14px;font-weight:600;margin-bottom:4px">预设里也管了这' +
    (keys.length > 1 ? '两' : '一') + '项</div>';
  h += '<div style="font-size:11px;color:#8b949e;margin-bottom:10px">两处都在写同一件事，容易打架——挑一边</div>';

  for (var i = 0; i < keys.length; i++) {
    var kk = keys[i];
    h += '<div style="display:flex;gap:8px;align-items:baseline;padding:7px 0;' +
      'border-top:1px solid rgba(255,255,255,.06);font-size:12px">' +
      '<div style="flex:0 0 66px;color:#8b949e">' + esc(OOC_LABEL[kk] || kk) + '</div>' +
      '<div style="flex:1;min-width:0;color:#e6edf3;word-break:break-word">' +
      esc(String(hits[kk] || '')) + '</div></div>';
  }

  h += '<div style="display:flex;gap:8px;margin-top:14px">' +
    '<button class="ar6-b on" data-ar6-card="ours" style="flex:1;justify-content:center">用我们的</button>' +
    '<button class="ar6-b" data-ar6-card="preset" style="flex:1;justify-content:center">用预设的</button>' +
    '</div>';

  h += '<label style="display:flex;gap:7px;align-items:center;margin-top:11px;font-size:11px;' +
    'color:#8b949e;cursor:pointer">' +
    '<input type="checkbox" data-ar6-chk="1" style="accent-color:#E8C46A">' +
    '<span>以后都按这个来，别再问</span></label>';

  h += '</div></div>';

  var node = null;
  try { node = mountHTML(h); } catch (e6) { node = null; }
  if (!node) { if (cb) cb(''); return; }

  node.addEventListener('click', function (ev) {
    var t = ev && ev.target, btn = null;
    while (t && t !== node) {
      if (t.getAttribute && t.getAttribute('data-ar6-card')) { btn = t; break; }
      t = t.parentNode;
    }
    if (!btn) return;
    var act = btn.getAttribute('data-ar6-card');
    var choice = act === 'preset' ? 'preset' : 'script';
    var j, m;
    for (j = 0; j < keys.length; j++) {
      oocSetChoice(keys[j], choice);
      m = OOC_CFGKEY[keys[j]];
      /* 用我们的：这一项必须真的开着；用预设的：开关置关，chip 标「听预设」 */
      if (m) cfg[m] = choice === 'script';
    }
    var chk = null;
    try { chk = node.querySelector('[data-ar6-chk="1"]'); } catch (e7) { chk = null; }
    if (chk && chk.checked) {
      cfg.oocPolicy = choice;
      banner(choice === 'preset' ? '反 OOC：以后冲突项都听预设的' : '反 OOC：以后冲突项都用我们的', 'gray');
    }
    try { saveCfg(); } catch (e8) {}
    try { closeCard(); } catch (e9) {}
    if (cb) cb(act);
  });
}

function onPanelClick(e) {
  /* 兜底去重：只在「pointerdown 之后紧跟的 click」上生效（安卓一次轻点会连发两个事件，
     而重绘换了节点、旧闭包时间戳失效）。纯 click 连击不受影响。 */
  {
    var a0 = e && e.target && e.target.getAttribute ? e.target.getAttribute('data-ar6') : '';
    if (a0) {
      var ty0 = (e && e.type) || 'click';
      var nowT = Date.now();
      if (nowT < ACT_FREEZE) return;                       /* 熔断期内一律不理 */
      var gap = ACT_GAP[a0];
      if (gap && nowT - gap.t0 <= 1500) {
        gap.n++;
        if (gap.n > 6) {                                   /* 同一动作 1.5s 内 >6 次 ⇒ 冻结 2s */
          ACT_FREEZE = nowT + 2000;
          gap.n = 0; gap.t0 = nowT;
          if (nowT - ACT_TRIP_AT > 8000) {
            ACT_TRIP_AT = nowT;
            try { banner('按钮被连续触发，已冻结 2 秒（疑似宿主重复派发点击）', 'warn'); } catch (eB) {}
          }
          return;
        }
        if (nowT - gap.t0 < 250) return;                   /* 同一动作 250ms 内只认一次 */
      } else {
        ACT_GAP[a0] = { n: 1, t0: nowT };
      }
      var rec0 = ACT_TS[a0];
      if (ty0 === 'click' && rec0 && rec0.type === 'pointerdown' && nowT - rec0.ts < 600) return;
      ACT_TS[a0] = { type: ty0, ts: nowT };
    }
  }
  var t = e.target;
  while (t && t !== DOC.body && !(t.getAttribute && t.getAttribute('data-ar6'))) t = t.parentNode;
  if (!t || !t.getAttribute) return;
  var act = t.getAttribute('data-ar6');
  if (!act) return;

  if (act === 'verify') {
    banner('🔭 正在验证渠道（幽灵别名探针）…', 'gray');
    runChannelVerify().then(function (r) {
      if (r.why === 'echo') { banner('⚠️ 渠道不读 model（回显）：身份无法验证，判定降级为「回显」', 'warn'); return; }
      if (r.why === 'rejected') { banner('✅ 渠道可验：幽灵名被拒（HTTP ' + r.status + '），model 字段可作证据', 'ok'); return; }
      banner('❔ ' + (r.note || '无法判断'), 'warn');
    })['catch'](function (e) { banner('验证出错：' + String(e && e.message || e), 'bad'); });
    return;
  }
  if (act === 'alias') {
    banner('🏷 正在扫描别名（5 个候选，各 16 token）…', 'gray');
    runAliasSweep().then(function (r) {
      if (!r.ok) { banner('扫描失败：' + (r.msg || '未知'), 'bad'); return; }
      var ok = 0;
      for (var i = 0; i < r.rows.length; i++) if (r.rows[i].ok) ok++;
      banner('🏷 别名扫描完成：' + ok + '/' + r.rows.length + ' 可用，详见面板', ok ? 'ok' : 'warn');
    })['catch'](function (e) { banner('扫描出错：' + String(e && e.message || e), 'bad'); });
    return;
  }
  if (act === 'level') {
    banner('🧠 正在对比 HIGH / minimal 两档…', 'gray');
    runLevelCheck().then(function (r) {
      if (!r.ok) { banner('档位检查失败：' + (r.msg || '未知'), 'bad'); return; }
      if (r.verdict === 'honored') banner('✅ ' + r.note, 'ok');
      else if (r.verdict === 'ignored') banner('⚠️ ' + r.note, 'warn');
      else banner(r.note, 'gray');
    })['catch'](function (e) { banner('档位检查出错：' + String(e && e.message || e), 'bad'); });
    return;
  }
  if (act === 'slim') {
    var raw = '';
    try { raw = (lastReq && (lastReq.raw || JSON.stringify(lastReq.body || {}))) || ''; } catch (eR) { raw = ''; }
    var rep0 = slimReport(raw);
    if (!rep0) { banner('🪶 先跑一轮对话，再来瘦身检查', 'gray'); return; }
    banner('🪶 ' + rep0.advice, Number(rep0.chars) > 12000 ? 'warn' : 'ok');
    return;
  }
  if (act === 'idprobe') {
    if (ID.running) { banner('身份筛选正在跑，稍等…', 'gray'); return; }
    banner('正在跑身份筛选（8 条坏 token，一次小请求）…', 'gray');
    runIdentityProbe().then(function (r) {
      if (!r.ok) { banner('身份筛选失败：' + (r.msg || '未知'), 'bad'); return; }
      if (r.verdict === 'fail') banner('⚠️ ' + r.label + '：' + r.note, 'bad');
      else if (r.verdict === 'pass') banner('✅ ' + r.label + '：' + r.note, 'ok');
      else banner(r.label + '：' + r.note, 'gray');
    })['catch'](function (e) { banner('身份筛选出错：' + String(e && e.message || e), 'bad'); });
    return;
  }
  if (act === 'card') { openCard(null, 'engine'); return; }
  if (act === 'help') { openHelp('how'); return; }
  if (act === 'report') { openCard(null, 'human'); return; }
  if (act === 'expand') { PAD_OPEN = false; minimized = false; syncMin(); render(); return; }
  if (act === 'min') { PAD_OPEN = false; minimized = true; syncMin(); render(); return; }
  if (act === 'padclose') { closePad(); return; }
  if (act === 'padpanel') { PAD_OPEN = false; minimized = false; syncMin(); render(); return; }
  if (act === 'tuck') {
    PAD_OPEN = false;
    cfg.floatMode = 'tuck';
    cfg.fEdge = ((isFinite(Number(cfg.fxN)) ? Number(cfg.fxN) : 1) < 0.5) ? 'l' : 'r';
    minimized = true; syncMin(); render();
    banner('已贴边收起：屏幕边缘还留一条把手，点它就能回来', 'gray');
    return;
  }
  if (act === 'hide') {
    /* 老版本入口：不再隐藏，改成贴边（hidden 是单向门） */
    cfg.floatMode = 'tuck';
    cfg.fEdge = ((isFinite(Number(cfg.fxN)) ? Number(cfg.fxN) : 1) < 0.5) ? 'l' : 'r';
    minimized = true; syncMin(); render();
    banner('已贴边收起（点边缘把手回来）', 'gray');
    return;
  }

  if (act === '🩺 安全:开' || act === '🩺 安全:关') {
    cfg.safe = !cfg.safe;
    saveCfg();
    ensureHooks();
    banner(cfg.safe ? '🩺 安全模式：已停止挂钩（只保留面板）' : '🛡️ 已恢复挂钩', cfg.safe ? 'warn' : 'ok');
    render();
    return;
  }
  if (act && act.indexOf('● 已开启') >= 0 || act === '● 已开启' || act === '○ 已关闭') {
    cfg.enabled = !cfg.enabled; saveCfg(); render();
    banner(cfg.enabled ? '防护已开启' : '防护已关闭', cfg.enabled ? 'ok' : 'gray');
    return;
  }
  if (act.indexOf('🩹 补前先问:') === 0 || act.indexOf('🔔 确认:') === 0) {
    cfg.jailConfirm = (cfg.jailConfirm === false);
    saveCfg(); render();
    banner(cfg.jailConfirm ? '🔔 补之前会先问你' : '🔔 不再问，自动补', cfg.jailConfirm ? 'ok' : 'warn');
    return;
  }
  if (act === 'jailnow') {
    var lastAi = jailLastAi();
    if (!lastAi) { banner('🩹 没有可续写的正文（末条不是 AI 消息）', 'gray'); return; }
    var tailTxt = String(lastAi.msg.mes || '');
    var whyTxt = jailTruncWhy(tailTxt, tailTxt.length);
    var jObj = { code: whyTxt ? 'trunc' : (tailTxt.trim() ? 'ok' : 'empty'), note: whyTxt || (tailTxt.trim() ? '手动补一次' : '这一条没有正文') };
    var gMan = jailGate(String(lastAi.idx) + '|' + String(lastAi.msg.send_date || ''));
    if (!gMan.ok) {
      banner(gMan.why === 'max' ? '🩹 本轮已经补过 ' + JL.count + ' 次了' : '🩹 现在补不了（' + gMan.why + '）', 'warn');
      return;
    }
    jailOffer(jObj);
    return;
  }
  /* v0.6 抗截断：三档循环 关 → 轻档 → 中档 → 关 */
  if (act.indexOf('✂️ 抗截断:') === 0) {
    cfg.trunc = truncNext(cfg.trunc);
    var tm = '✂️ 抗截断：' + truncLabel(cfg.trunc);
    if (cfg.trunc === 'light') tm += '（每轮往末条消息尾部贴提示词：字数锚 + 收尾契约 + 不要收尾语；不改参数、不补写）';
    if (cfg.trunc === 'medium') tm += '（轻档全部 + 长度/断句/暂停 自动补一次；审核挡下的不补）';
    saveCfg(); render();
    banner(tm, cfg.trunc === 'off' ? 'gray' : 'warn');
    return;
  }
  /* v0.7 轻档 v2：字数锚 chip，0 → 800 → 1200 → 1800 → 0 */
  if (act.indexOf('📏 字数锚:') === 0) {
    cfg.truncLen = truncLenNext(cfg.truncLen);
    var lm = cfg.truncLen > 0
      ? ('📏 字数锚：正文不少于 ' + cfg.truncLen + ' 字' + (truncLevel(cfg.trunc) === 'off' ? '（抗截断还关着，先点「✂️ 抗截断」打开）' : ''))
      : '📏 字数锚：关（不写长度要求，只留收尾契约）';
    saveCfg(); render();
    banner(lm, cfg.truncLen > 0 ? 'warn' : 'gray');
    return;
  }
  if (act.indexOf('🩹 破甲:') === 0) {
    var nx = jailNext();
    /* v0.3：进超级档先问一次；这一步不改 cfg，用户点「开启」才生效 */
    if (nx === 'strong') { jailSuperAsk(); return; }
    cfg.jail = nx;
    var jm = '🩹 破甲：' + jailLabel();
    if (nx !== 'off' && !cfg.observe) { cfg.observe = true; jm += '（已自动打开观察器，续写靠它触发）'; }
    if (nx === 'strong') {
      var jp = [];
      if (cfg.jailTok) jp.push('保底token');
      if (cfg.jailSafe) jp.push('解安全');
      if (cfg.jailPre) jp.push('预审框');
      if (cfg.jailText) jp.push('输出契约');
      jm += '（改请求：' + (jp.length ? jp.join(' + ') : '没开子项，等于只做事后补救') + '）';
    }
    saveCfg(); ensureHooks(); render();
    banner(jm, nx === 'off' ? 'gray' : 'warn');
    return;
  }
  if (act.indexOf('保底token:') === 0) { cfg.jailTok = !cfg.jailTok; saveCfg(); render(); return; }
  if (act.indexOf('解安全:') === 0) { cfg.jailSafe = !cfg.jailSafe; saveCfg(); render(); return; }
  if (act.indexOf('预审框:') === 0) { cfg.jailPre = !cfg.jailPre; saveCfg(); render(); return; }
  if (act.indexOf('输出契约:') === 0) { cfg.jailText = !cfg.jailText; saveCfg(); render(); return; }

  /* v8.31 叙述层：三档循环 关 → 轻 → 强 → 关 */
  if (act.indexOf('🧭 防全知:') === 0) {
    var nxKnow = narrNext(cfg.know);
    /* 打开之前先把代价说清楚：它禁止写内心话、也禁止替人做决定 */
    if (narrTipNeeded(nxKnow, cfg.knowTip)) { knowTipDialog(nxKnow); return; }
    cfg.know = nxKnow; saveCfg(); render();
    banner('🧭 防全知：' + narrTag(cfg.know), cfg.know === 'off' ? 'gray' : 'ok');
    return;
  }
  if (act.indexOf('💄 去媚:') === 0) {
    cfg.charm = narrNext(cfg.charm); saveCfg(); render();
    banner('💄 去媚：' + narrTag(cfg.charm), cfg.charm === 'off' ? 'gray' : 'ok');
    return;
  }

  /* v0.76 反 OOC：总闸 + 四子项。前缀都带 emoji 和空格，与叙述层不撞 */
  if (act.indexOf('🎭 反OOC:') === 0) {
    var oocNow = String(cfg.ooc || 'off') === 'on' ? 'off' : 'on';
    cfg.ooc = oocNow; saveCfg(); render();
    banner('🎭 反 OOC：' + (oocNow === 'on' ? '开' : '关'), oocNow === 'on' ? 'ok' : 'gray');
    return;
  }
  if (act.indexOf('🧩 点名:') === 0) { oocToggle('roll'); return; }
  if (act.indexOf('🚫 反模板:') === 0) { oocToggle('tpl'); return; }
  if (act.indexOf('🔒 变更门槛:') === 0) { oocToggle('chg'); return; }
  if (act.indexOf('🗣 口吻一致:') === 0) { oocToggle('voice'); return; }
  if (act.indexOf('🪶 微扰') === 0) {
    cfg.refract = cfg.refract === 'off' ? 'light' : (cfg.refract === 'light' ? 'mid' : 'off');
    saveCfg(); render();
    banner('🪶 微扰档位：' + profileLabel(), cfg.refract === 'off' ? 'gray' : 'ok');
    return;
  }
  if (act.indexOf('🧠 思考') === 0) {
    cfg.think = cfg.think === 'high' ? 'off' : 'high'; saveCfg(); render();
    banner(cfg.think === 'high' ? '🧠 仅当字段缺失时补 reasoning_effort=high' : '🧠 思考档位交给预设', 'gray');
    return;
  }
  if (act.indexOf('📌 钉参数') === 0) {
    cfg.pin = !cfg.pin; saveCfg(); render();
    banner('📌 钉参数 ' + (cfg.pin ? '开' : '关'), cfg.pin ? 'ok' : 'gray');
    return;
  }
  /* v0.82 行为基线：默认开，给一个能关掉的地方 */
  if (act.indexOf('📈 行为基线') === 0) {
    cfg.base = (String(cfg.base || 'on') === 'on') ? 'off' : 'on'; saveCfg(); render();
    banner('📈 行为基线 ' + (cfg.base === 'on' ? '开' : '关'), cfg.base === 'on' ? 'ok' : 'gray');
    return;
  }
  /* v0.84 结构指纹：默认开，只提示；关掉即不写不判 */
  if (act.indexOf('🔬 返回格式') === 0) {
    cfg.shape = (String(cfg.shape || 'on') === 'on') ? 'off' : 'on'; saveCfg(); render();
    banner('🔬 返回格式 ' + (cfg.shape === 'on' ? '开' : '关'), cfg.shape === 'on' ? 'ok' : 'gray');
    return;
  }

  /* v0.98 只查 Gemini：默认开。关掉就回到「什么都查」 */
  if (act.indexOf('🟦 只查 Gemini') === 0) {
    cfg.onlyGemini = (cfg.onlyGemini === false);
    saveCfg(); render();
    banner(cfg.onlyGemini === false
      ? '🟦 所有模型都查（非 Gemini 也会进账本）'
      : '🟦 只查 Gemini（别的模型不判定、不进账本）',
      cfg.onlyGemini === false ? 'gray' : 'ok');
    return;
  }

  /* v0.98 一键：查 + 装。不要求先打开开关，也不要求先填地址 */
  if (act.indexOf('⬆ 检查更新') === 0) {
    banner('⬆ 正在看有没有新版…', 'gray');
    updQuick().then(function (r) {
      if (r && r.ok && r.installed && r.already) {
        banner('✅ 这一版已经装过了（v' + r.version + '），没有重复写', 'ok');
      } else if (r && r.ok && r.installed) {
        banner(updDoneText(r.version, r.saveKind), 'ok');
      } else if (r && r.ok && !r.newer) {
        banner('✅ 已经是最新的 v' + VERSION, 'ok');
      } else {
        banner('⬆ 没更成：' + updErrText((r && r.err) || '?', r), 'warn');
      }
      try { render(); } catch (eQ) {}
    })['catch'](function () { banner('⬆ 没更成：网络错误', 'warn'); });
    return;
  }

  /* v0.98 一键装新版：装完不自动刷新，让用户自己点，也留着「撤销」 */
  if (act.indexOf('⬇ 装新版') === 0) {
    banner('⬇ 正在取新版…', 'gray');
    updInstall().then(function (r) {
      if (r && r.ok) {
        banner('✅ 已装 v' + r.version + '，刷新一次页面生效（没生效就点「↩ 撤销更新」）', 'ok');
      } else {
        var why = (r && r.err) || '?';
        banner('⬇ 没装上：' + updErrText(why, r), 'warn');
      }
      try { render(); } catch (eR) {}
    }).then(null, function () { banner('⬇ 没装上：网络错误', 'warn'); });
    return;
  }

  if (act.indexOf('↩ 撤销更新') === 0) {
    var uu2 = updUndo();
    banner(uu2 && uu2.ok ? '↩ 已退回上一个版本，刷新一次页面生效' : '↩ 撤销失败：没有可退回的版本', uu2 && uu2.ok ? 'ok' : 'warn');
    try { render(); } catch (eU2) {}
    return;
  }

  /* v0.98 新版本检查：默认关，用户自己打开才查。打开时顺手查一次，
     否则用户得等下次开面板才知道有没有新版 */
  if (act.indexOf('⟳ 开面板自动查') === 0) {
    cfg.upd = (String(cfg.upd || 'off') === 'check') ? 'off' : 'check';
    saveCfg(); render();
    banner('⟳ 开面板自动查 ' + (cfg.upd === 'check' ? '开' : '关'), cfg.upd === 'check' ? 'ok' : 'gray');
    if (cfg.upd === 'check') {
      updCheck(true).then(function (r) {
        if (r && r.ok && r.newer) {
          banner('⬆ ' + updLine() + '　点「⬇ 装新版」直接装', 'warn');
          render();
        }
        /* 其它失败一律不出声：查不到不是用户的问题 */
      })['catch'](function () {});
    }
    return;
  }

  if (act.indexOf('👁 观察器') === 0) {
    cfg.observe = !cfg.observe; saveCfg(); render();
    banner('👁 零锁观察器 ' + (cfg.observe ? '开' : '关'), cfg.observe ? 'ok' : 'gray');
    return;
  }

  if (act.indexOf('🎯 范围:') === 0) {
    cfg.scope = cfg.scope === 'all' ? 'skip' : (cfg.scope === 'skip' ? 'only' : 'all');
    saveCfg(); render();
    banner('检测范围：' + scopeLabel() + (cfg.scope === 'all' ? '（全部模型都判）' : ''), cfg.scope === 'all' ? 'gray' : 'ok');
    return;
  }
  if (act === 'savescope') {
    var si = DOC.querySelector('[data-ar6="scope"]');
    if (si) cfg.scopeList = String(si.value || '').trim();
    saveCfg(); render();
    banner('范围已保存：' + (cfg.scopeList || '（空=不过滤）'), 'ok');
    return;
  }

  if (act === 'native') { runNativeProbe(); return; }
  if (act === 'dual') { runDualProbe(); return; }
  if (act === 'fp') { banner(fpCard().replace(/\n/g, ' ｜ '), 'gray'); return; }
  if (act === 'exportlog') { copyTo(exportText(), '📤 导出记录'); return; }
  if (act === 'abtest') {
    if (AB_STATE.running) { banner('⚖️ 正在跑对照，稍等…', 'gray'); return; }
    banner('⚖️ 正在跑 A/B 对照（裸 / 带配置各 2 次）…', 'gray');
    abProbe().then(function (r) {
      banner(r.ok ? ('⚖️ ' + r.note) : ('⚖️ 对照失败：' + (r.msg || '未知')), r.ok ? 'gray' : 'bad');
    })['catch'](function (e) { banner('⚖️ 出错：' + String((e && e.message) || e), 'bad'); });
    return;
  }
  if (act === 'self') { runSelfTestUI(); return; }
  /* 清空：账本 + 基线一起清。只清账本的话，基线还是老的，
     用户以为「重新开始」，实际还在拿旧参照下结论。 */
  if (act === 'clear') {
    try { HOST.localStorage.removeItem(LOG_KEY); } catch (e) {}
    try { HOST.localStorage.removeItem(BASE_KEY); } catch (e2) {}
    try { HOST.localStorage.removeItem(SHAPE_KEY); } catch (e3) {}
    selfTestResult = null;
    banner('🧹 账本与基线都清空了', 'ok');
    render();
    return;
  }
  /* 重建基线：连点两次确认（手机上 confirm 常被拦，而且这一步只清本机数据，
     用双击确认比弹窗更省事） */
  if (act === 'rebuild') {
    var nowR = Date.now();
    if (nowR - REBUILD_AT > 5000) {
      REBUILD_AT = nowR;
      banner('⚠ 再点一次「重建基线」确认：清掉学过的首字耗时 / 出字速率 / 返回格式，之后 8 轮内不再给提示', 'warn');
      return;
    }
    REBUILD_AT = 0;
    try { HOST.localStorage.removeItem(BASE_KEY); } catch (e4) {}
    try { HOST.localStorage.removeItem(SHAPE_KEY); } catch (e5) {}
    banner('🧹 基线已清空：接下来 8 轮重新学，期间不会出手感 / 格式提示', 'ok');
    render();
    return;
  }
  if (act === 'save') {
    var b = DOC.querySelector('[data-ar6="base"]');
    var k = DOC.querySelector('[data-ar6="key"]');
    var uu = DOC.querySelector('[data-ar6="updurl"]');
    if (b) cfg.dualBase = String(b.value || '').trim();
    if (k) cfg.dualKey = String(k.value || '').trim();
    if (uu) cfg.updUrl = String(uu.value || '').trim();
    saveCfg();
    banner('已保存 Base/Key', 'ok');
    return;
  }
  if (act === 'copy') {
    var lr = lastReq;
    var txt = lr ? ('model=' + lr.model + '\nbase=' + lr.base + '\n\n' + String(lr.raw || '').slice(0, 4000)) : '（还没有捕获到请求）';
    copyTo(txt, '最近请求');   /* 不接 promise 就是假成功：复制失败也得说失败 */
    return;
  }
  if (act === 'selftoggle') {
    var box = DOC.getElementById('ar6-selftest');
    if (box) box.style.display = box.style.display === 'none' ? 'block' : 'none';
    return;
  }
}

function onPanelInput(e) {
  var t0 = e && e.target;
  if (t0 && t0.getAttribute && t0.getAttribute('data-ar6-pad')) {
    var ax = t0.getAttribute('data-ar6-pad');
    var v = Math.max(0, Math.min(100, Number(t0.value) || 0)) / 100;
    if (ax === 'x') { cfg.fxN = v; cfg.fEdge = v < 0.5 ? 'l' : 'r'; }
    else cfg.fyN = v;
    try { floatApplyPosition(root(), true); } catch (eP) {}
    return;
  }
  var t = e.target;
  if (!t || !t.getAttribute) return;
  var act = t.getAttribute('data-ar6');
  var pos = t.getAttribute('data-ar6-pos');
  if (pos) {
    var v = Math.max(0, Math.min(1, (Number(t.value) || 0) / 100));
    if (pos === 'x') {
      cfg.fxN = v;
      cfg.fEdge = v <= 0.02 ? 'l' : (v >= 0.98 ? 'r' : '');
    } else {
      cfg.fyN = v;
    }
    try {
      var rr = DOC.getElementById(ROOT_ID);
      if (rr && minimized) {
        /* v8.3：展开态只改坐标，不动盒子尺寸（否则整块面板被压成球） */
        floatApplyPosition(rr, true);
        var lab = t.parentNode && t.parentNode.querySelector('b');
        if (lab) lab.textContent = Math.round(v * 100) + '%';
      }
    } catch (eP) {}
    return;   /* 位置只预览：不 render、不落库 */
  }
  if (act === 'base') cfg.dualBase = String(t.value || '');
  if (act === 'key') cfg.dualKey = String(t.value || '');
  if (act === 'updurl') cfg.updUrl = String(t.value || '');
  if (act === 'base' || act === 'key' || act === 'updurl') saveCfg();
}

/* v8.1：滑块松手才落库 */
function onPanelChange(e) {
  var t = e.target;
  if (!t || !t.getAttribute) return;
  if (t.getAttribute('data-ar6-pad')) { try { saveCfg(); } catch (e) {} return; }
  if (t.getAttribute('data-ar6-pos')) { try { saveCfg(); } catch (e) {} }
}

/* ---------------- 渲染入口 ---------------- */

function installFloatDrag(el, box) {
  try {
    if (!el || !box || el.__ar6drag) return;
    var head = el.querySelector(".ar6-h");
    if (!head) return;
    el.__ar6drag = true;
    head.style.touchAction = "none";
    head.style.cursor = "move";
    var sx = 0, sy = 0, ox = 0, oy = 0, moving = false;
    head.addEventListener("pointerdown", function (e) {
      try {
        if (e.target && e.target.closest && e.target.closest("button")) return;
        var r = box.getBoundingClientRect();
        box.style.left = Math.round(r.left) + "px";
        box.style.top = Math.round(r.top) + "px";
        box.style.right = "auto";
        box.style.bottom = "auto";
        sx = e.clientX; sy = e.clientY; ox = r.left; oy = r.top; moving = true;
        if (head.setPointerCapture) head.setPointerCapture(e.pointerId);
        if (e.preventDefault) e.preventDefault();
      } catch (e1) {}
    }, { passive: false });
    head.addEventListener("pointermove", function (e) {
      if (!moving) return;
      try {
        var w = box.offsetWidth || 300, h = box.offsetHeight || 200;
        var vw = HOST.innerWidth || 360, vh = HOST.innerHeight || 640;
        var nx = Math.max(6, Math.min(vw - w - 6, ox + (e.clientX - sx)));
        var ny = Math.max(6, Math.min(vh - Math.max(h, 60) - 6, oy + (e.clientY - sy)));
        box.style.left = Math.round(nx) + "px";
        box.style.top = Math.round(ny) + "px";
      } catch (e2) {}
    });
    var up = function () {
      if (!moving) return;
      moving = false;
      try {
        var r2 = box.getBoundingClientRect();
        cfg.mx = Math.round(r2.left);
        cfg.my = Math.round(r2.top);
        saveCfg();
      } catch (e3) {}
    };
    head.addEventListener("pointerup", up);
    head.addEventListener("pointercancel", up);
  } catch (e) {}
}

/* v8.31：工具栏只留一个入口，进面板。展开逻辑与魔法棒那条路一致，
   只是不做「贴右下角」的锚点重算 —— 用户从宿主按钮进来，位置沿用上一次。 */
function openPanel() {
  minimized = false;
  try { PAD_OPEN = false; } catch (eO0) {}
  try { cfg.min = false; if (typeof saveCfg === 'function') saveCfg(); } catch (eO1) {}
  try { closeCard(); } catch (eO2) {}
  render();
  try { var rO = root(); if (rO) fitPanel(rO); } catch (eO3) {}
  try { verifyVisible(); } catch (eO4) {}
  try { banner('🛡 防路由面板已打开', 'ok'); } catch (eO5) {}
}

function openPanelFromWand() {
  minimized = false;
  try { PAD_OPEN = false; } catch (eP0) {}
  try { cfg.min = false; if (typeof saveCfg === 'function') saveCfg(); } catch (eP1) {}
  try { closeCard(); } catch (eP2) {}
  render();
  try {
    var r = root();
    if (r) {
      /* v8.30：这里原先把整条 inline style 覆盖成 panelStyle(...) 的结果，
         会抹掉 mountAll→fitPanel 刚写好的 height/maxHeight/overflow:hidden，
         手机点魔法棒重开时面板就退回固定百分比高度 + 外层滚动——「只有上半截」的直接原因。
         现在只清掉拖动残留的 transform，几何全部交给 fitPanel 一处写。 */
      try { r.style.transform = ''; r.style.transition = ''; } catch (eT0) {}
      var vw = (HOST.visualViewport && HOST.visualViewport.width) || HOST.innerWidth || 390;
      var w = uiMode() === 'mobile' ? Math.min(vw * 0.92, 380) : 440;
      cfg.mx = Math.max(8, Math.round(vw - w - 12));
      cfg.my = Math.max(72, Math.round(((HOST.visualViewport && HOST.visualViewport.height) || HOST.innerHeight || 700) * 0.18));
      saveCfg();
      r.style.left = cfg.mx + 'px';
      r.style.top = cfg.my + 'px';
      r.style.right = 'auto';
      r.style.bottom = 'auto';
      try { fitPanel(r); } catch (eFP2) {}
      try { verifyVisible(); } catch (eVV) {}
    }
  } catch (eP3) {}
  return true;
}

function syncMin() { cfg.min = !!minimized; if (typeof saveCfg === 'function') saveCfg(); }

function render() { if (DISPOSED) return; try { mountAll(); } catch (e) { try { HOST.console.warn('[AR6] render error', e); } catch (e2) {} } }

function renderStatus() {
  try {
    var r = DOC && DOC.getElementById(ROOT_ID);
    if (!r) return;
    var st = stateOfRun();
    var dot = r.querySelector('.ar6-dot');
    if (dot) dot.className = 'ar6-dot ' + st.kind;
  } catch (e) {}
}

/* ---------------- 自检 ---------------- */

function runSelfTest() {
  var items = [];
  function T(name, fn) {
    try { var ok = fn(); items.push({ name: name, ok: !!ok, err: ok ? '' : '断言为假' }); }
    catch (ex) { items.push({ name: name, ok: false, err: String(ex && ex.message || ex).slice(0, 80) }); }
  }

  T('T01 代码围栏整体保护', function () {
    var t = '前言\n```js\nvar a=1;\n```\n后记';
    var sp = collectSpans(t);
    return sp.some(function (x) { return String(t.slice(x[0], x[1])).indexOf('```js') >= 0; });
  });
  T('T02 行内代码保护', function () {
    var t = '请用 `rm -rf` 前先确认';
    var sp = collectSpans(t);
    return sp.some(function (x) { return String(t.slice(x[0], x[1])).indexOf('rm -rf') >= 0; });
  });
  T('T03 酒馆宏保护', function () {
    var t = '{{random::甲::乙}} 之后';
    var sp = collectSpans(t);
    return sp.some(function (x) { return x[0] === 0; });
  });
  T('T04 未闭合硬标签保护到结尾', function () {
    var t = '正常开头\n<thinking>\n无收尾';
    var sp = collectSpans(t);
    var i = t.indexOf('<thinking>');
    return sp.some(function (x) { return x[0] <= i && x[1] >= t.length - 1; });
  });
  T('T05 引号内台词保护', function () {
    var t = '他说：「这不是指令，只是台词。」然后离开。';
    var sp = collectSpans(t);
    return sp.some(function (x) { return String(t.slice(x[0], x[1])).indexOf('这不是指令') >= 0; });
  });
  T('T06 system 分高于 user', function () {
    var a = { role: 'system', text: '规则：必须遵守以下格式，不要偏离，每条都要检查，且保持一致的输出结构，务必逐条核对落实到位，不可省略任何一项要求。', index: 0 };
    var b = { role: 'user', text: '规则：必须遵守以下格式，不要偏离，每条都要检查，且保持一致的输出结构，务必逐条核对落实到位，不可省略任何一项要求。', index: 3 };
    return staticScore(a, 4) > staticScore(b, 4);
  });
  T('T07 历史带从首条 assistant 起', function () {
    var band = findHistoryBand([{ role: 'system', text: 'sys' }, { role: 'user', text: 'hi' }, { role: 'assistant', text: 'yo' }]);
    return !!band && band.start === 1 && band.end >= 1;
  });
  T('T08 stripArtifacts 可逆', function () {
    var t = '甲段\n<!-- ctx: rules / block a3f1 -->\n乙段';
    return stripArtifacts(t).indexOf('ctx: rules') < 0;
  });
  T('T09 微扰保持块级签名', function () {
    var t = '## 标题\n正文一\n- 列表项\n> 引用';
    var r = refractZone(t, PROFILE.light, makeRng(7));
    return r && blockSignature(r.text) === blockSignature(t);
  });
  T('T10 微扰二次运行稳定', function () {
    var t = '## 标题\n正文一\n- 列表项';
    var r1 = refractZone(t, PROFILE.light, makeRng(3));
    var r2 = refractZone(r1.text, PROFILE.light, makeRng(3));
    return r1.text === r2.text;
  });
  T('T11 代码块内不微扰', function () {
    var t = '```\n## 不是标题\n```';
    var r = refractZone(t, PROFILE.mid, makeRng(5));
    return !r.changed || r.text === t;
  });
  T('T12 钉参数移除 models[]', function () {
    var body = JSON.stringify({ model: 'gemini-4-argon', models: ['a', 'b'], allow_fallbacks: true, messages: [{ role: 'user', content: 'hi' }] });
    var p = planRequest(body, 'https://x/chat-completions/generate');
    var o = JSON.parse(p.body);
    return !('models' in o) && o.allow_fallbacks === false;
  });
  T('T13 钉参数不虚构字段', function () {
    var body = JSON.stringify({ model: 'g', messages: [{ role: 'user', content: 'hi' }] });
    var p = planRequest(body, 'https://x/chat-completions/generate');
    var o = JSON.parse(p.body);
    return !('models' in o) && !('route' in o);
  });
  T('T14 思考档不覆盖已有字段', function () {
    var body = JSON.stringify({ model: 'g', reasoning_effort: 'medium', messages: [{ role: 'user', content: 'hi' }] });
    var p = planRequest(body, 'https://x/chat-completions/generate');
    return JSON.parse(p.body).reasoning_effort === 'medium';
  });
  T('T15 非生成 URL 不改写', function () {
    var body = JSON.stringify({ model: 'g' });
    var p = planRequest(body, 'https://x/api/backends/chat-completions/status');
    return p.changed.length === 0 && p.body === body;
  });
  T('T16 同模型判一致', function () {
    var ev = newEvidence('gemini-4-argon', 200, 'sse');
    ev.sawText = true; ev.hasThink = true; ev.observed.push('google/gemini-4-argon');
    return verdictOf(ev).code === 'same';
  });
  T('T17 降档判被换', function () {
    var ev = newEvidence('gemini-4-argon', 200, 'sse');
    ev.sawText = true; ev.hasThink = true; ev.observed.push('gemini-3.1-flash-lite');
    return verdictOf(ev).code === 'diff';
  });
  T('T18 4xx 不判被换', function () {
    var ev = newEvidence('gemini-4-argon', 429, 'json');
    ev.sawText = false;
    return verdictOf(ev).code === 'quota';
  });
  T('T19 normModel 剥离通道前缀', function () {
    return normModel('pggo-google/gemini-4-argon:generateContent') === 'gemini-4-argon';
  });
  T('T20 estimateTokens 中文近似', function () {
    var n = estimateTokens('一二三四五六七八九十');
    return n >= 7 && n <= 11;
  });

  selfTestResult = { at: Date.now(), items: items };
  return selfTestResult;
}

function runSelfTestUI() {
  var res = runSelfTest();
  var pass = res.items.filter(function (i) { return i.ok; }).length;
  var bad = res.items.filter(function (i) { return !i.ok; });
  banner('🩺 自检 ' + pass + '/' + res.items.length + (bad.length ? ('，失败：' + bad[0].name) : '，全部通过'), bad.length ? 'bad' : 'ok');
  render();
}

/* ---------------- 脚本按钮 ---------------- */

var BTN_BOUND = {};
var BTN_OK = 0;

var BTN_TOTAL = 8;
/* v8.31：宿主按钮从 8 个砍到 1 个（面板里全都有），还能再关成 0。
   BTN_TOTAL 这个常量留着只为兼容旧断言，实际口径看 btnTotal()。 */
function btnTotal() { return 1; }
function btnReady() { return BTN_OK >= btnTotal(); }
function btnSummary() {
  return btnTotal() === 0 ? '仅魔法棒' : (BTN_OK + '/' + btnTotal());
}

function bindScriptButtons() {
  if (bound) return true;
  /* 关键：酒馆助手跑脚本在 iframe 里，eventOn/getButtonEvent 注入在「脚本自己的 window」，
     不在顶层；只查 HOST/parent/top 会全部落空 ⇒ 工具栏按钮永远没反应 */
  var scope = [];
  function push(w) {
    if (!w) return;
    for (var q = 0; q < scope.length; q++) if (scope[q] === w) return;
    scope.push(w);
  }
  push(SELF_WIN);
  try { push(SELF_WIN && SELF_WIN.parent); } catch (e) {}
  push(HOST);
  try { push(HOST && HOST.parent); } catch (e) {}
  try { push(HOST && HOST.top); } catch (e) {}

  /* 每个动作登记多个别名：JSON 里的按钮名 + 旧版遗留名 + 去 emoji 的裸名 */
  /* v8.31：宿主按钮从 8 个砍到 1 个纯入口——面板里每一项都有，工具栏只是入口。
     老名字全部留成别名：用户手里若是旧版导入的按钮配置，点下去照样能开面板。 */
  var ACTIONS = [
    { key: 'panel', names: ['🛡 防路由', '🛡️ 防路由', '防路由', '🛡️ 状态自检', '状态自检', '自检'],
      fn: function () { openPanel(); } }
  ];

  for (var i = 0; i < scope.length; i++) {
    var w = scope[i];
    if (!w) continue;
    try {
      if (typeof w.eventOn !== 'function' || typeof w.getButtonEvent !== 'function') continue;
      for (var a = 0; a < ACTIONS.length; a++) {
        var act = ACTIONS[a];
        if (act.panelOnly) continue;
        if (BTN_BOUND[act.key]) continue;
        for (var n = 0; n < act.names.length; n++) {
          var ev = null;
          try { ev = w.getButtonEvent(act.names[n]); } catch (eB) { ev = null; }
          if (!ev) continue;
          (function (fn, nm) {
            try {
              w.eventOn(ev, function () {
                try { fn(); }
                catch (eRun) {
                  try { HOST.console.warn('[AR7] 按钮执行失败：' + nm, eRun); } catch (eL) {}
                  try { banner('按钮执行失败：' + String(eRun && eRun.message || eRun).slice(0, 50), 'bad'); } catch (eB2) {}
                }
              });
              BTN_BOUND[act.key] = true;
              BTN_OK++;
            } catch (eOn) {}
          })(act.fn, act.names[n]);
          if (BTN_BOUND[act.key]) break;
        }
      }
    } catch (e) {}
  }
  if (BTN_OK > 0 && !btnBoundAt) btnBoundAt = Date.now();
  for (var q = 0; q < ACTIONS.length; q++) {
    if (!BTN_BOUND[ACTIONS[q].key]) {
      try { HOST.console.warn('[AR7] 工具栏按钮没绑上：' + ACTIONS[q].names[0]); } catch (eW) {}
    }
  }
  try { if (BTN_OK > 0 && !DISPOSED) render(); } catch (eS) {}
  if (BTN_OK >= ACTIONS.length) { bound = true; return true; }
  return BTN_OK > 0;
}

/* ---------------- 生命周期 ---------------- */

function step(name, fn) {
  try { fn(); }
  catch (e) { try { HOST.console.warn('[AR6] ' + name + ' 失败：', e); } catch (e2) {} }
}

function boot() {
  DISPOSED = false;
  if (booted) { render(); return; }
  /* 同页已经有一个活着的实例（桌面版与移动版两个包都装、或重复导入）：让位。
     不重复挂界面、钩子与魔法棒，否则会出现面板被清空、按钮回调失灵、菜单两条同名项。
     用一个带心跳的租约判断，30 秒没心跳才允许接管（防止崩溃后永久占位）。 */
  var hold = null;
  try { hold = (HOST && HOST.__AR6HOLD) || null; } catch (eO) { hold = null; }
  if (hold && hold.token !== BOOT_TOKEN && hold.alive !== false && (Date.now() - (hold.at || 0)) < 30000) {
    try { HOST.console && HOST.console.info('[AR6] 已有实例在运行，本次不加载界面与钩子'); } catch (eO2) {}
    return;
  }
  booted = true;
  step('配置', function () { cfg = readCfg(); minimized = !!cfg.min; });
  step('宿主', function () { if (!HOST || !DOC) throw new Error('宿主文档不可用'); });
  step('样式', function () { ensureStyle(DOC); });
  step('钩子', function () { ensureHooks(); });
  step('面板', function () { render(); });
  step('横幅', function () {
    var where = (HOST === HOST.top) ? '顶层' : 'iframe';
    var msg = (hooked ? '' : '') + '卢克之光 V' + VERSION + ' 已就绪 · ' +
      (cfg.enabled ? '防护开' : '防护关') + ' · 宿主 ' + where + (hooked ? '' : ' · 钩子未挂上');
    banner(msg, hooked ? 'ok' : 'bad');
  });
  step('说明提示', function () {
    if (!localStorage.getItem('ar6.helpSeen')) {
      localStorage.setItem('ar6.helpSeen', '1');
      setTimeout(function () { try { banner('第一次用？点面板右上角的「说明」，或长按悬浮球', 'gray'); } catch (eH) {} }, 2600);
    }
  });
  /* v0.98 新版本检查：放在就绪横幅之后，免得两句话抢同一条横幅；
     关着闸或查不到时 updBoot 自己保持沉默 */
  step('版本检查', function () { updBoot(); });
  step('按钮', function () { bindScriptButtons(); });
  step('魔法棒', function () { try { mountWandEntry(); } catch (eM) {} });
  step('占位', function () {
    /* 抢租约：之后的同页实例看到心跳就自动让位；30 秒不跳由新实例接管 */
    try {
      HOST.__AR6HOLD = { token: BOOT_TOKEN, alive: true, at: Date.now() };
      if (BOOT_TIMER) clearInterval(BOOT_TIMER);
      BOOT_TIMER = setInterval(function () {
        try {
          if (HOST.__AR6HOLD && HOST.__AR6HOLD.token === BOOT_TOKEN) HOST.__AR6HOLD.at = Date.now();
          else if (BOOT_TIMER) { clearInterval(BOOT_TIMER); BOOT_TIMER = null; }
        } catch (eH) {}
      }, 5000);
    } catch (eL) {}
  });
  step('兜底', function () {
    if (bootTimer) clearInterval(bootTimer);
    var tries = 0, lastOk = -1;
    bootTimer = setInterval(function () {
      tries++;
      try {
        ensureHooks();
        bindScriptButtons();
        /* v8.0.3：只有真多绑上按钮才重绘，否则会反复重置滚动与输入焦点 */
        if (BTN_OK !== lastOk) { lastOk = BTN_OK; if (!DISPOSED) render(); }
        if (tries >= 4) { clearInterval(bootTimer); bootTimer = null; }
      } catch (e) {}
    }, 1500);
  });
  try { HOST.console.log(TAG + ' v' + VERSION + ' 已启动；模式=' + uiMode() + '；挂钩=' + hooked); } catch (e) {}
}

function dispose() {
  DISPOSED = true;
  try {
    if (BOOT_TIMER) { clearInterval(BOOT_TIMER); BOOT_TIMER = null; }
    /* 只释放自己的租约，不动别的实例 */
    if (HOST && HOST.__AR6HOLD && HOST.__AR6HOLD.token === BOOT_TOKEN) HOST.__AR6HOLD.alive = false;
  } catch (eDz) {}
  step('停观察器', function () { stopWatchers(); });
  try { if (bootTimer) { clearInterval(bootTimer); bootTimer = null; } } catch (e) {}
  try { if (bannerTimer) { clearTimeout(bannerTimer); bannerTimer = null; } } catch (e) {}
  step('还原 fetch', unhookFetch);
  step('还原 XHR', unhookXhr);
  step('移除面板', function () {
    try { closeCard(); } catch (eC) {}
    var el = DOC && DOC.getElementById(ROOT_ID);
    if (el && el.parentNode) el.parentNode.removeChild(el);
    var bn = DOC && DOC.getElementById('ar6-bn');
    if (bn && bn.parentNode) bn.parentNode.removeChild(bn);
  });
  step('移除魔法棒', function () { try { unmountWandEntry(); } catch (eW) {} });
  step('清理残留', function () {
    try { closeCard(); } catch (eC) {}
    ['ar6-bn2'].forEach(function (id) {
      var el = DOC && DOC.getElementById(id);
      if (el && el.parentNode) el.parentNode.removeChild(el);
    });
    var st = DOC ? DOC.querySelectorAll('style#ar6-style,style#ar6-style82') : [];
    for (var i = 0; i < st.length; i++) if (st[i].parentNode) st[i].parentNode.removeChild(st[i]);
    BTN_BOUND = {}; BTN_OK = 0;
  });
  booted = false; bound = false;
}

try {
  // 移动端切后台 / bfcache 冻结时不要销毁：旧实现每次切走都 dispose，回来就“失踪”，
  // 且卸载时机正好撞上酒馆的保存动作。
  HOST.addEventListener('pagehide', function (ev) {
    if (!ev || ev.persisted) return;
    try { if (bannerTimer) { clearTimeout(bannerTimer); bannerTimer = null; } } catch (e1) {}
  });
  /* iframe 被真正销毁（删除脚本/关面板）时 fire unload；切后台不会触发 */
  try {
    if (SELF_WIN && SELF_WIN.addEventListener) {
      SELF_WIN.addEventListener('unload', function () { try { dispose(); } catch (e0) {} });
    }
  } catch (eU) {}
  HOST.addEventListener('pageshow', function (ev) {
    try { ensureHooks(); } catch (e2) {}
    try {
      if (!DISPOSED && DOC && !DOC.getElementById(ROOT_ID)) render();
      else {
        var el = DOC && DOC.getElementById(ROOT_ID);
        if (el && minimized) floatApplyPosition(el, true);
      }
    } catch (e3) {}
  });
  /* v8.1：窗口缩放 / 转屏 / 键盘弹起 —— 重新夹取位置 */
  var reflowTimer = null;
  function scheduleReflow() {
    if (reflowTimer) { try { HOST.clearTimeout(reflowTimer); } catch (e) {} }
    reflowTimer = HOST.setTimeout(function () {
      reflowTimer = null;
      try {
        if (DISPOSED) return;
        var el = DOC && DOC.getElementById(ROOT_ID);
        if (!el) return;
        if (minimized) floatApplyPosition(el, true);
        else {
          /* v8.30：转屏/地址栏伸缩/键盘弹起都会改可视高度，必须重算面板高度，
             只夹 left/top 会让底边落到屏幕外 */
          try { fitPanel(el); } catch (eRF) {}
          var b = el.getBoundingClientRect();
          var c = floatClampPx(b.left, b.top, b.width || 320, b.height || 240);
          el.style.left = c.x + 'px';
          el.style.top = c.y + 'px';
          el.style.right = 'auto';
          el.style.bottom = 'auto';
          cfg.mx = c.x; cfg.my = c.y;
        }
      } catch (e4) {}
    }, 150);
  }
  try { HOST.addEventListener('resize', scheduleReflow); } catch (eR1) {}
  try { HOST.addEventListener('orientationchange', scheduleReflow); } catch (eR2) {}
  try {
    if (HOST.visualViewport && HOST.visualViewport.addEventListener) {
      HOST.visualViewport.addEventListener('resize', scheduleReflow);
    }
  } catch (eR3) {}
} catch (e) {}

boot();
