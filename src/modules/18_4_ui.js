/* ===== 4_ui.js ===== */
/* ============================================================================
 * 卢克之光 V5.0「光之守护」— 4/4 UI
 * 单套语义化「光之国银钛装甲 · 彩色计时器四态」深空银蓝主题 / 自适应视口 / 局部动作键去重
 * ========================================================================== */

/* @UI_MODE_START@ */
var UI_MODE = 'auto';     /* 打包时按三端注入 mobile(手机ST/TT) 或 desktop(电脑桌面端) */
/* @UI_MODE_END@ */
var ROOT_ID = 'ar6-root';
var STYLE_ID = 'ar6-style';
var PANEL_OPENED_AT = 0;  /* 三端顶层统一显式声明，严格模式下零 ReferenceError */
var minimized = false;
var MORE_OPEN = false;
var PANEL_SHOWN = false;
var clickCount = 0;
var ACT_TS = {};
var btnBoundAt = 0;
var bootTimer = null;
var bannerTimer = null;
var FX_TIMER = null;
var bound = false;
var selfTestResult = null;
var REBUILD_AT = 0;

function uiMode() {
  if (UI_MODE === 'desktop' || UI_MODE === 'mobile') return UI_MODE;
  try {
    if ((HOST.innerWidth || 9999) < 768) return 'mobile';
    if (HOST.matchMedia && HOST.matchMedia('(max-width: 767px)').matches) return 'mobile';
    if (/Android|iPhone|iPad|iPod|Mobile|HarmonyOS/i.test(String((HOST.navigator && HOST.navigator.userAgent) || ''))) return 'mobile';
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

/* ---------------- 单套语义化深空银蓝主题（废除旧版四套暗棕猪肝红冲突表） ---------------- */

var CSS_TEXT = [
  '#ar6-root{--ar-bg0:#080D18;--ar-bg1:#0F182B;--ar-stby:#162032;--ar-on:#0C2D48;--ar-sil:#94A3B8;--ar-sil-hi:#CBD5E1;--ar-ink:#F0F9FF;--ar-cyan:#38BDF8;--ar-cyan-dk:#0284C7;--ar-gold:#FCD34D;--ar-red:#F43F5E;--ar-line:rgba(148,163,184,.42);--ar-soft:rgba(148,163,184,.24);font:12.5px/1.5 -apple-system,BlinkMacSystemFont,"Segoe UI","PingFang SC","Microsoft YaHei",sans-serif;color:#F0F9FF;overscroll-behavior:contain;touch-action:pan-y;-webkit-overflow-scrolling:touch;pointer-events:auto;}',
  '#ar6-root *{box-sizing:border-box;}',
  '@keyframes ar6TimerRed{0%,100%{box-shadow:0 0 0 0 rgba(244,63,94,.45),inset 0 0 10px rgba(244,63,94,.28);border-color:#F43F5E;}50%{box-shadow:0 0 16px 3px rgba(244,63,94,.72),inset 0 0 16px rgba(244,63,94,.48);border-color:#FDA4AF;}}',
  '@keyframes ar6SpeciumFlow{0%{background-position:0% 50%}100%{background-position:200% 50%}}',
  '@keyframes ar6NoaPrism{0%{background-position:0% 50%}50%{background-position:100% 50%}100%{background-position:200% 50%}}',
  '@keyframes ar6AbyssBreath{0%,100%{border-color:rgba(225,29,72,.58);box-shadow:0 0 16px rgba(225,29,72,.28),inset 0 0 18px rgba(136,19,55,.34);}50%{border-color:rgba(251,113,133,.92);box-shadow:0 0 26px rgba(244,63,94,.56),inset 0 0 26px rgba(190,18,60,.52);}}',
  '@keyframes ar6NoaHalo{0%,100%{box-shadow:0 0 18px rgba(186,230,253,.42),0 0 34px rgba(253,230,138,.18),inset 0 1px 0 rgba(255,255,255,.85);}50%{box-shadow:0 0 26px rgba(186,230,253,.72),0 0 46px rgba(196,181,253,.34),inset 0 1px 0 #FFFFFF;}}',
  '@keyframes ar6WingSweep{0%{transform:translateX(-130%) skewX(-24deg)}100%{transform:translateX(230%) skewX(-24deg)}}',
  '@keyframes ar6CrestPulse{0%,100%{transform:translateY(0) scale(1)}50%{transform:translateY(-2px) scale(1.04)}}',
  '@keyframes ar6FxBurst{0%{opacity:.28;transform:scale(.975)}14%{opacity:1;transform:scale(1)}76%{opacity:.95;transform:scale(1.008)}100%{opacity:0;transform:scale(1.028)}}',
  '@keyframes ar6FxFloat{0%,100%{transform:scale(1);opacity:.96}50%{transform:scale(1.018);opacity:1}}',
  '@keyframes ar6FxStar{0%,100%{opacity:.72;transform:scale(.9)}50%{opacity:1;transform:scale(1.16)}}',
  '@keyframes ar6FxRift{0%,100%{opacity:.9;filter:drop-shadow(0 0 8px rgba(244,63,94,.85))}45%{opacity:1;filter:drop-shadow(0 0 15px rgba(255,46,85,1))}72%{opacity:.82;filter:drop-shadow(0 0 6px rgba(190,18,60,.75))}}',
  '@keyframes ar6FxRise{0%{transform:translateY(26px);opacity:.55}55%{opacity:1}100%{transform:translateY(-36px);opacity:.2}}',
  '@keyframes ar6FxStreak{0%{transform:translateX(-18%);opacity:.35}35%{opacity:1}100%{transform:translateX(18%);opacity:0}}',
  '@keyframes ar6-fade{from{opacity:0}to{opacity:1}}',
  '@keyframes ar6-pop{from{opacity:0;transform:scale(.985)}to{opacity:1;transform:scale(1)}}',
  '#ar6-root svg.ar6-i{width:14px!important;height:14px!important;min-width:14px!important;min-height:14px!important;max-width:14px!important;max-height:14px!important;flex:0 0 14px!important;display:inline-block!important;vertical-align:-2px;fill:none!important;stroke:currentColor!important;stroke-width:1.75!important;stroke-linecap:round!important;stroke-linejoin:round!important;overflow:visible!important;}',
  '#ar6-root .ar6-b svg.ar6-i{width:13px!important;height:13px!important;min-width:13px!important;max-width:13px!important;flex:0 0 13px!important;}',
  /* 触控流畅滚动：严禁在 .ar6-mk 上写 touch-action:none */
  '#ar6-root button[data-ar6],#ar6-root .ar6-mk{touch-action:manipulation;-webkit-tap-highlight-color:transparent;user-select:none;-webkit-user-select:none;}',
  '#ar6-root .ar6-p{position:relative;display:flex;flex-direction:column;width:min(540px,calc(100vw - 24px));max-width:100%;min-width:0;height:auto;max-height:min(750px,92vh);overflow:hidden;background:linear-gradient(180deg,#0F182B 0%,#080D18 100%);border:1.5px solid rgba(148,163,184,.42);border-radius:16px;box-shadow:0 0 0 1px rgba(56,189,248,.14),0 24px 64px rgba(2,6,23,.82);color:#F0F9FF;pointer-events:auto;transition:transform .18s cubic-bezier(.2,.8,.2,1),opacity .18s,border-color .24s ease,box-shadow .24s ease,background .24s ease;}',
  '#ar6-root.ar6-mobile .ar6-p{width:calc(100vw - 16px);border-radius:14px;max-height:calc(100% - 16px);}',
  '#ar6-root .ar6-p::before{content:"";position:absolute;top:0;left:0;right:0;height:3.5px;background:linear-gradient(90deg,#38BDF8,#E0F2FE 35%,#FCD34D 68%,#38BDF8);background-size:200% 100%;animation:ar6SpeciumFlow 7s linear infinite;opacity:.96;pointer-events:none;z-index:5;}',
  /* 页头公共区 */
  '#ar6-root .ar6-h{flex:0 0 auto;position:sticky;top:0;z-index:3;display:flex;align-items:center;gap:8px;min-height:54px;padding:10px 12px;background:linear-gradient(95deg,rgba(14,165,233,.18) 0%,rgba(22,32,50,.86) 55%,rgba(15,24,43,.96) 100%);border-bottom:1px solid rgba(148,163,184,.3);transition:background .24s ease,border-color .24s ease;}',
  '#ar6-root .ar6-mh{cursor:grab;touch-action:none;user-select:none;-webkit-user-select:none;}',
  '#ar6-root.ar6-mobile .ar6-mh{cursor:default;touch-action:manipulation;}',
  '#ar6-root .ar6-mh.ar6-dragging{cursor:grabbing;}',
  '#ar6-root .ar6-logo{width:34px;height:34px;flex:0 0 34px;border-radius:50%;display:flex;align-items:center;justify-content:center;background:radial-gradient(circle at 35% 32%,#E0F2FE 0%,#38BDF8 38%,#0284C7 76%,#082F49 100%);border:2px solid #CBD5E1;box-shadow:0 0 12px rgba(56,189,248,.55),inset 0 1px 2px #FFF;color:#FFF;transition:all .24s ease;}',
  '#ar6-root .ar6-logo svg:not(.ar6-i){width:20px;height:20px;display:block;}',
  '#ar6-root .ar6-logo svg.ar6-i{width:18px!important;height:18px!important;min-width:18px!important;max-width:18px!important;flex:0 0 18px!important;stroke:#FFF!important;stroke-width:1.9!important;}',
  '#ar6-root .ar6-hx{display:flex;flex-direction:column;min-width:0;flex:1 1 auto;}',
  '#ar6-root .ar6-mt{display:flex;align-items:center;gap:6px;color:#F8FAFC;font-size:14px;font-weight:700;letter-spacing:.3px;line-height:1.25;}',
  '#ar6-root .ar6-ver{font-size:10.5px;font-weight:700;padding:1px 6px;border-radius:5px;background:rgba(148,163,184,.18);border:1px solid rgba(148,163,184,.32);color:#E2E8F0;letter-spacing:.2px;}',
  '#ar6-root .ar6-ms{display:block;color:#94A3B8;font-size:11px;line-height:1.3;margin-top:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}',
  '#ar6-root .ar6-hsw{display:inline-flex;align-items:center;gap:6px;padding:5px 10px;border-radius:999px;font-size:11.5px;font-weight:700;cursor:pointer;border:1px solid rgba(148,163,184,.42);background:#162032;color:#94A3B8;transition:all .15s ease;flex:0 0 auto;}',
  '#ar6-root .ar6-hsw .ar6-gem{width:8px;height:8px;border-radius:50%;background:#64748B;flex:0 0 8px;}',
  '#ar6-root .ar6-hsw.on{background:#0C2D48;border-color:#38BDF8;color:#F0F9FF;box-shadow:0 0 12px rgba(56,189,248,.26);}',
  '#ar6-root .ar6-hsw.on .ar6-gem{background:#38BDF8;box-shadow:0 0 8px #7DD3FC;}',
  '#ar6-root .ar6-x{width:30px;height:30px;flex:0 0 30px;display:inline-flex;align-items:center;justify-content:center;border:1px solid rgba(148,163,184,.32);background:#162032;color:#CBD5E1;border-radius:8px;font-size:13px;padding:0;cursor:pointer;transition:all .12s ease;}',
  '#ar6-root .ar6-x:hover,#ar6-root .ar6-x.on{border-color:#38BDF8;color:#F0F9FF;background:#0C2D48;}',
  /* 面板滚动主体 */
  '#ar6-root .ar6-body{flex:1 1 auto;min-height:0;overflow-y:auto;overflow-x:hidden;overscroll-behavior:contain;-webkit-overflow-scrolling:touch;touch-action:pan-y;scrollbar-width:thin;padding-bottom:calc(8px + env(safe-area-inset-bottom,0px));}',
  '#ar6-root .ar6-body::-webkit-scrollbar{width:8px;height:8px;}',
  '#ar6-root .ar6-body::-webkit-scrollbar-thumb{background:rgba(148,163,184,.32);border:2px solid transparent;background-clip:content-box;border-radius:6px;}',
  /* 单行四格银钛战术导航 */
  '#ar6-root .ar6-nav{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:6px;padding:8px 12px;background:rgba(8,13,24,.78);border-bottom:1px solid rgba(148,163,184,.22);}',
  '#ar6-root .ar6-navb{position:relative;width:100%;text-align:center;justify-content:center;padding:7px 4px;font:600 12.5px/1.2 inherit;border-radius:8px;border:1px solid rgba(148,163,184,.32);background:#162032;color:#94A3B8;cursor:pointer;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;clip-path:polygon(0 0,calc(100% - 6px) 0,100% 6px,100% 100%,6px 100%,0 calc(100% - 6px));transition:all .12s ease;}',
  '#ar6-root .ar6-nav-dot{position:absolute;top:4px;right:5px;width:6px;height:6px;border-radius:50%;background:#FCD34D;box-shadow:0 0 8px rgba(252,211,77,.95);pointer-events:none;}',
  '#ar6-root .ar6-b:active,#ar6-root .ar6-ubtn:active{transform:scale(.97);}',
  '#ar6-root .ar6-navb:hover{border-color:#7DD3FC;color:#E2E8F0;}',
  '#ar6-root .ar6-navb[aria-pressed="true"]{background:linear-gradient(135deg,#0284C7,#0C2D48);border-color:#38BDF8;color:#F0F9FF;box-shadow:0 0 14px rgba(56,189,248,.3);}',
  /* ---- 形态共鸣顶栏与壳体 (#ar6-root[data-tier="..."]) ---- */
  '#ar6-root[data-tier="safe"] .ar6-p{border-color:rgba(96,165,250,.52);box-shadow:0 0 28px rgba(96,165,250,.2),0 24px 64px rgba(2,6,23,.86);}',
  '#ar6-root[data-tier="safe"] .ar6-p::before{background:linear-gradient(90deg,#38BDF8,#818CF8 40%,#E0F2FE 70%,#38BDF8);background-size:200% 100%;}',
  '#ar6-root[data-tier="safe"] .ar6-logo{background:radial-gradient(circle at 35% 32%,#EFF6FF 0%,#60A5FA 38%,#2563EB 76%,#312E81 100%);border-color:#BFDBFE;box-shadow:0 0 14px rgba(96,165,250,.68),inset 0 1px 2px #FFF;}',
  '#ar6-root[data-tier="mid"] .ar6-p{border-color:rgba(167,139,250,.52);box-shadow:0 0 28px rgba(167,139,250,.22),0 24px 64px rgba(2,6,23,.86);}',
  '#ar6-root[data-tier="mid"] .ar6-p::before{background:linear-gradient(90deg,#7C3AED,#38BDF8 35%,#FB7185 70%,#7C3AED);background-size:200% 100%;}',
  '#ar6-root[data-tier="mid"] .ar6-logo{background:radial-gradient(circle at 35% 32%,#F5F3FF 0%,#A78BFA 38%,#6D28D9 72%,#4C1D95 100%);border-color:#DDD6FE;box-shadow:0 0 14px rgba(167,139,250,.68),inset 0 1px 2px #FFF;}',
  /* 强力型：赤红刚力共鸣 */
  '#ar6-root[data-tier="strong"] .ar6-p{border-color:rgba(251,113,133,.62);box-shadow:0 0 32px rgba(244,63,94,.26),0 24px 64px rgba(2,6,23,.88);}',
  '#ar6-root[data-tier="strong"] .ar6-p::before{height:3.5px;background:linear-gradient(90deg,#991B1B,#FB7185 28%,#FDE047 52%,#F43F5E 76%,#991B1B);background-size:200% 100%;animation:ar6SpeciumFlow 4s linear infinite;}',
  '#ar6-root[data-tier="strong"] .ar6-h{background:linear-gradient(95deg,rgba(190,18,60,.26) 0%,rgba(28,19,36,.9) 55%,rgba(15,24,43,.96) 100%);border-bottom-color:rgba(251,113,133,.32);}',
  '#ar6-root[data-tier="strong"] .ar6-logo{background:radial-gradient(circle at 35% 32%,#FFF1F2 0%,#FB7185 38%,#BE123C 76%,#4C0519 100%);border-color:#FECDD3;box-shadow:0 0 16px rgba(251,113,133,.78),inset 0 1px 2px #FFF;}',
  '#ar6-root[data-tier="strong"] .ar6-hsw.on{background:rgba(136,19,55,.55);border-color:#FB7185;color:#FFF1F2;box-shadow:0 0 14px rgba(251,113,133,.32);}',
  '#ar6-root[data-tier="strong"] .ar6-hsw.on .ar6-gem{background:#FB7185;box-shadow:0 0 8px #FDA4AF;}',
  '#ar6-root[data-tier="strong"] .ar6-navb[aria-pressed="true"]{background:linear-gradient(135deg,#BE123C,#7F1D1D);border-color:#FB7185;color:#FFF1F2;box-shadow:0 0 14px rgba(251,113,133,.32);}',
  /* 闪耀型：璀璨黄金共鸣 */
  '#ar6-root[data-tier="supreme"] .ar6-p{border-color:rgba(252,211,77,.68);box-shadow:0 0 36px rgba(251,191,36,.28),0 24px 64px rgba(2,6,23,.88);}',
  '#ar6-root[data-tier="supreme"] .ar6-p::before{height:3.5px;background:linear-gradient(90deg,#B45309,#FDE68A 26%,#FFFFFF 50%,#FCD34D 74%,#B45309);background-size:200% 100%;animation:ar6SpeciumFlow 4.5s linear infinite;}',
  '#ar6-root[data-tier="supreme"] .ar6-h{background:linear-gradient(95deg,rgba(217,119,6,.26) 0%,rgba(31,26,20,.9) 55%,rgba(15,24,43,.96) 100%);border-bottom-color:rgba(252,211,77,.34);}',
  '#ar6-root[data-tier="supreme"] .ar6-logo{background:radial-gradient(circle at 35% 32%,#FFFFFF 0%,#FDE68A 36%,#D97706 76%,#78350F 100%);border-color:#FEF3C7;box-shadow:0 0 18px rgba(252,211,77,.85),inset 0 1px 3px #FFF;}',
  '#ar6-root[data-tier="supreme"] .ar6-hsw.on{background:rgba(146,64,14,.52);border-color:#FCD34D;color:#FEF3C7;box-shadow:0 0 14px rgba(252,211,77,.34);}',
  '#ar6-root[data-tier="supreme"] .ar6-hsw.on .ar6-gem{background:#FCD34D;box-shadow:0 0 9px #FEF08A;}',
  '#ar6-root[data-tier="supreme"] .ar6-navb[aria-pressed="true"]{background:linear-gradient(135deg,#D97706,#78350F);border-color:#FCD34D;color:#FEF3C7;box-shadow:0 0 14px rgba(252,211,77,.34);}',
  /* 诺亚：太古铂银圣翼棱光共鸣 */
  '#ar6-root[data-tier="noa"] .ar6-p,#ar6-root[data-tier="gatanothor"] .ar6-p{border-color:rgba(226,232,240,.78);box-shadow:0 0 0 1px rgba(186,230,253,.35),0 0 38px rgba(125,211,252,.26),0 0 68px rgba(253,230,138,.12),0 26px 68px rgba(2,6,23,.88);}',
  '#ar6-root[data-tier="noa"] .ar6-p::before,#ar6-root[data-tier="gatanothor"] .ar6-p::before{height:4px;background:linear-gradient(90deg,#E2E8F0 0%,#7DD3FC 20%,#FFFFFF 42%,#FDE68A 60%,#C4B5FD 78%,#FFFFFF 92%,#E2E8F0 100%);background-size:200% 100%;animation:ar6NoaPrism 4.8s linear infinite;box-shadow:0 1px 12px rgba(186,230,253,.75);}',
  '#ar6-root[data-tier="noa"] .ar6-h,#ar6-root[data-tier="gatanothor"] .ar6-h{background:linear-gradient(95deg,rgba(226,232,240,.2) 0%,rgba(56,189,248,.15) 32%,rgba(22,33,52,.92) 68%,rgba(15,24,43,.97) 100%);border-bottom-color:rgba(226,232,240,.36);}',
  '#ar6-root[data-tier="noa"] .ar6-logo,#ar6-root[data-tier="gatanothor"] .ar6-logo{background:radial-gradient(circle at 36% 30%,#FFFFFF 0%,#E0F2FE 34%,#7DD3FC 62%,#334155 92%);border:2px solid #FFFFFF;box-shadow:0 0 18px rgba(186,230,253,.92),0 0 30px rgba(253,230,138,.38),inset 0 1px 3px #FFFFFF;color:#0F172A;}',
  '#ar6-root[data-tier="noa"] .ar6-logo svg.ar6-i,#ar6-root[data-tier="gatanothor"] .ar6-logo svg.ar6-i{stroke:#0C4A6E!important;filter:drop-shadow(0 0 2px #FFF);}',
  '#ar6-root[data-tier="noa"] .ar6-hsw.on,#ar6-root[data-tier="gatanothor"] .ar6-hsw.on{background:linear-gradient(135deg,rgba(241,245,249,.22),rgba(14,116,144,.42));border-color:#E2E8F0;color:#FFFFFF;box-shadow:0 0 16px rgba(186,230,253,.42),inset 0 1px 0 rgba(255,255,255,.35);}',
  '#ar6-root[data-tier="noa"] .ar6-hsw.on .ar6-gem,#ar6-root[data-tier="gatanothor"] .ar6-hsw.on .ar6-gem{background:linear-gradient(135deg,#FFFFFF,#7DD3FC,#FDE68A);box-shadow:0 0 10px #FFFFFF,0 0 16px #7DD3FC;}',
  '#ar6-root[data-tier="noa"] .ar6-navb[aria-pressed="true"],#ar6-root[data-tier="gatanothor"] .ar6-navb[aria-pressed="true"]{background:linear-gradient(135deg,#334155 0%,#0369A1 55%,#1E293B 100%);border-color:#E2E8F0;color:#FFFFFF;box-shadow:0 0 14px rgba(186,230,253,.36);}',
  /* 凝视深渊：黑曜石底 + 暗血红裂隙流光顶冠 + 黑曜血瞳圆章 + 暗红守护开关 */
  '#ar6-root[data-tier="abyss"] .ar6-p{background:linear-gradient(180deg,#0D060B 0%,#060408 55%,#040306 100%);border-color:rgba(225,29,72,.68);box-shadow:0 0 0 1px rgba(159,18,57,.42),0 0 42px rgba(225,29,72,.34),0 26px 70px rgba(0,0,0,.95);}',
  '#ar6-root[data-tier="abyss"] .ar6-p::before{height:4px;background:linear-gradient(90deg,#090306 0%,#9F1239 22%,#FF2E55 48%,#FDA4AF 52%,#881337 78%,#090306 100%);background-size:200% 100%;animation:ar6SpeciumFlow 4.2s linear infinite;box-shadow:0 1px 14px rgba(244,63,94,.85);}',
  '#ar6-root[data-tier="abyss"] .ar6-h{background:linear-gradient(95deg,rgba(136,19,55,.34) 0%,rgba(18,5,11,.94) 55%,rgba(8,4,8,.98) 100%);border-bottom-color:rgba(225,29,72,.34);}',
  '#ar6-root[data-tier="abyss"] .ar6-logo{background:radial-gradient(circle at 38% 35%,#FF2E55 0%,#9F1239 38%,#090306 78%,#000000 100%);border:2px solid #FB7185;box-shadow:0 0 18px rgba(244,63,94,.88),inset 0 0 8px rgba(255,46,85,.65);color:#FFF1F2;}',
  '#ar6-root[data-tier="abyss"] .ar6-hsw.on{background:linear-gradient(135deg,#2A0510,#120307);border-color:#F43F5E;color:#FFE4E6;box-shadow:0 0 16px rgba(244,63,94,.42);}',
  '#ar6-root[data-tier="abyss"] .ar6-hsw.on .ar6-gem{background:#FF2E55;box-shadow:0 0 10px #FF2E55;}',
  '#ar6-root[data-tier="abyss"] .ar6-navb[aria-pressed="true"]{background:linear-gradient(135deg,#881337,#2A0510);border-color:#FB7185;color:#FFE4E6;box-shadow:0 0 14px rgba(244,63,94,.36);}',
  /* 最高优先级铁律：总闸关闭石像待机灰核 (data-off-master="1") 与调包红灯告警 (data-st="bad") 严禁被 [data-tier] 覆盖 */
  '#ar6-root[data-off-master="1"] .ar6-p{border-color:rgba(148,163,184,.38)!important;box-shadow:0 24px 64px rgba(2,6,23,.82)!important;}',
  '#ar6-root[data-off-master="1"] .ar6-p::before{height:3px!important;background:linear-gradient(90deg,#475569,#94A3B8 50%,#475569)!important;box-shadow:none!important;animation:none!important;opacity:.72!important;}',
  '#ar6-root[data-off-master="1"] .ar6-logo{background:radial-gradient(circle at 35% 32%,#94A3B8 0%,#475569 55%,#1E293B 100%)!important;border-color:#94A3B8!important;box-shadow:none!important;color:#FFF!important;opacity:.82;animation:none!important;}',
  '#ar6-root[data-off-master="1"] .ar6-logo svg.ar6-i{stroke:#FFF!important;filter:none!important;}',
  '#ar6-root[data-st="bad"] .ar6-p{border-color:#F43F5E!important;box-shadow:0 0 0 1px rgba(244,63,94,.45),0 0 32px rgba(244,63,94,.32),0 24px 64px rgba(2,6,23,.86)!important;}',
  '#ar6-root[data-st="bad"] .ar6-p::before{height:4px!important;background:linear-gradient(90deg,#F43F5E,#FDA4AF,#F43F5E)!important;box-shadow:0 1px 14px rgba(244,63,94,.85)!important;animation:ar6TimerRed 1.2s ease-in-out infinite!important;opacity:1!important;}',
  '#ar6-root[data-st="bad"] .ar6-logo{background:radial-gradient(circle at 35% 32%,#FFE4E6 0%,#F43F5E 45%,#881337 90%)!important;border-color:#FDA4AF!important;color:#FFF!important;animation:ar6TimerRed 1.2s ease-in-out infinite!important;opacity:1!important;}',
  '#ar6-root[data-st="bad"] .ar6-logo svg.ar6-i{stroke:#FFF!important;filter:none!important;}',
  /* 主开关卡片（待机银钛 #162032 / 开启澄澈蓝 #0C2D48） */
  '#ar6-root .ar6-mk{position:relative;display:flex;flex-direction:column;align-items:stretch;width:calc(100% - 24px);margin:10px 12px 0;padding:11px 13px;border-radius:12px;background:#162032;border:1px solid rgba(148,163,184,.36);color:#94A3B8;font:inherit;text-align:left;cursor:pointer;transition:all .15s ease;}',
  '#ar6-root .ar6-mk.on{background:linear-gradient(135deg,#0C2D48 0%,rgba(15,24,43,.96) 100%);border-color:#38BDF8;color:#F0F9FF;box-shadow:0 0 16px rgba(56,189,248,.18),inset 3px 0 0 #38BDF8;}',
  '#ar6-root .ar6-mk-t{display:flex;align-items:center;justify-content:space-between;gap:10px;padding-right:48px;font-size:13.5px;font-weight:700;color:#F0F9FF;}',
  '#ar6-root .ar6-mk-st{font-size:11.5px;font-weight:600;color:#94A3B8;}',
  '#ar6-root .ar6-mk.on .ar6-mk-st{color:#38BDF8;}',
  '#ar6-root .ar6-mk-d{display:block;margin-top:4px;font-size:12px;line-height:1.52;color:#94A3B8;}',
  '#ar6-root .ar6-sw{position:absolute;right:12px;top:12px;width:34px;height:19px;border-radius:999px;background:#1E293B;border:1px solid #64748B;transition:all .16s ease;}',
  '#ar6-root .ar6-sw::after{content:"";position:absolute;left:2px;top:1px;width:15px;height:15px;border-radius:50%;background:#CBD5E1;transition:transform .16s ease,background .16s ease;}',
  '#ar6-root .ar6-sw[data-on="1"]{background:#0284C7;border-color:#7DD3FC;}',
  '#ar6-root .ar6-sw[data-on="1"]::after{transform:translateX(14px);background:#FFFFFF;box-shadow:0 0 6px #BAE6FD;}',
  /* 三格读数与提示条 */
  '#ar6-root .ar6-nums{display:flex;gap:8px;padding:10px 12px 0;min-width:0;}',
  '#ar6-root .ar6-n{flex:1 1 0;min-width:0;text-align:center;padding:10px 4px 8px;border-radius:11px;background:#162032;border:1px solid rgba(148,163,184,.28);}',
  '#ar6-root .ar6-n b{display:block;font-size:20px;font-weight:700;color:#F0F9FF;font-variant-numeric:tabular-nums;line-height:1.15;}',
  '#ar6-root .ar6-n span{display:block;font-size:11px;color:#94A3B8;margin-top:3px;}',
  '#ar6-root .ar6-hint{margin:10px 12px 0;padding:9px 11px;border-radius:10px;font-size:11.8px;line-height:1.58;color:#CBD5E1;background:rgba(12,45,72,.45);border:1px solid rgba(56,189,248,.28);}',
  /* 统一银钛战术卡片 (.ar6-ugroup)、胶囊徽标 (.ar6-badge) 与行内分段光能槽 (.ar6-ubar) */
  '#ar6-root .ar6-ugroup{margin:9px 12px 0;padding:10px 12px;border-radius:12px;background:linear-gradient(180deg,rgba(22,32,50,.8) 0%,rgba(13,20,35,.88) 100%);border:1px solid rgba(148,163,184,.28);box-shadow:inset 0 1px 0 rgba(255,255,255,.04);}',
  '#ar6-root[data-tier="abyss"] .ar6-ugroup{background:linear-gradient(180deg,rgba(24,9,16,.84) 0%,rgba(10,5,10,.92) 100%);border-color:rgba(225,29,72,.24);}',
  '#ar6-root .ar6-ug-top{display:flex;align-items:center;justify-content:space-between;gap:8px;flex-wrap:wrap;margin-bottom:7px;}',
  '#ar6-root .ar6-ug-title{display:inline-flex;align-items:center;gap:6px;font-size:12.8px;font-weight:700;color:#F8FAFC;letter-spacing:.2px;}',
  '#ar6-root .ar6-ug-title::before{content:"";width:3px;height:12px;border-radius:2px;background:#38BDF8;box-shadow:0 0 6px rgba(56,189,248,.8);flex:0 0 3px;}',
  '#ar6-root[data-tier="strong"] .ar6-ug-title::before{background:#FB7185;box-shadow:0 0 8px rgba(251,113,133,.85);}',
  '#ar6-root[data-tier="supreme"] .ar6-ug-title::before{background:#FCD34D;box-shadow:0 0 8px rgba(252,211,77,.85);}',
  '#ar6-root[data-tier="noa"] .ar6-ug-title::before,#ar6-root[data-tier="gatanothor"] .ar6-ug-title::before{background:linear-gradient(180deg,#FFFFFF,#7DD3FC,#FDE68A);box-shadow:0 0 8px rgba(186,230,253,.9);}',
  '#ar6-root[data-tier="abyss"] .ar6-ug-title::before{background:#F43F5E;box-shadow:0 0 8px rgba(244,63,94,.9);}',
  '#ar6-root .ar6-badge{font-size:10.8px;font-weight:600;line-height:1.25;padding:2px 8px;border-radius:999px;background:rgba(15,23,42,.78);border:1px solid rgba(148,163,184,.28);color:#94A3B8;white-space:nowrap;}',
  '#ar6-root .ar6-badge.cyan{color:#7DD3FC;border-color:rgba(56,189,248,.36);background:rgba(12,45,72,.55);}',
  '#ar6-root .ar6-badge.noa{color:#F8FAFC;border-color:rgba(226,232,240,.62);background:linear-gradient(90deg,rgba(51,65,85,.85),rgba(14,116,144,.55));box-shadow:0 0 10px rgba(186,230,253,.25);}',
  '#ar6-root .ar6-badge.abyss{color:#FECDD3;border-color:rgba(244,63,94,.55);background:rgba(136,19,55,.45);}',
  '#ar6-root .ar6-badge.gold{color:#FEF3C7;border-color:rgba(252,211,77,.55);background:rgba(180,83,9,.42);}',
  '#ar6-root .ar6-badge.red{color:#FFE4E6;border-color:rgba(251,113,133,.55);background:rgba(159,18,57,.45);}',
  '#ar6-root .ar6-ug-sub{font-size:11.6px;color:#94A3B8;line-height:1.5;margin-top:6px;}',
  /* 兼容旧终极条类名 (.ar6-ult / .ar6-ultb) */
  '#ar6-root .ar6-ult{margin-top:10px;padding-top:10px;border-top:1px dashed rgba(148,163,184,.28);}',
  '#ar6-root .ar6-zone>.ar6-ult{margin:10px 12px 0;}',
  '#ar6-root .ar6-ult-h{font-size:11.4px;color:#94A3B8;margin:0 2px 7px;}',
  '#ar6-root .ar6-ultb{display:flex;align-items:center;justify-content:center;gap:8px;width:100%;min-height:34px;margin-top:6px;border-radius:8px;border:1px solid rgba(148,163,184,.3);background:#1B2739;color:#CBD5E1;font-size:12.5px;font-weight:600;cursor:pointer;}',
  '#ar6-root .ar6-ultb i{font-style:normal;font-size:11px;font-weight:400;color:#7C8BA1;}',
  '#ar6-root .ar6-ultb.deep{background:#141D2B;border-color:rgba(244,63,94,.22);}',
  '#ar6-root .ar6-ultb.on{background:rgba(12,45,72,.9);border-color:#38BDF8;color:#E0F2FE;box-shadow:0 0 10px rgba(56,189,248,.22);}',
  '#ar6-root .ar6-ultb.on i{color:#7DD3FC;}',
  '#ar6-root .ar6-ultb.deep.on{border-color:#FDA4AF;color:#FFF1F2;box-shadow:0 0 10px rgba(253,164,175,.18);}',
  /* 「终极圣域 · 超越界限」双殿堂仪式大键 (.ar6-ult-wrap / .ar6-ult-head / .ar6-ult-grid / .ar6-temple-btn) */
  '#ar6-root .ar6-ult-wrap{margin-top:9px;padding-top:8px;border-top:1px dashed rgba(148,163,184,.24);}',
  '#ar6-root .ar6-zone>.ar6-ult-wrap{margin:9px 12px 0;padding:10px 12px;border-radius:12px;background:rgba(22,32,50,.76);border:1px solid rgba(148,163,184,.26);}',
  '#ar6-root .ar6-ult-head{display:flex;align-items:center;justify-content:center;gap:8px;font-size:11px;font-weight:700;letter-spacing:.8px;color:#CBD5E1;margin-bottom:7px;}',
  '#ar6-root .ar6-ult-head::before,#ar6-root .ar6-ult-head::after{content:"";flex:1;height:1px;background:linear-gradient(90deg,transparent,rgba(148,163,184,.36),transparent);}',
  '#ar6-root .ar6-ult-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;}',
  '#ar6-root .ar6-temple-btn{position:relative;overflow:hidden;display:flex;align-items:center;justify-content:flex-start;gap:9px;width:100%;min-width:0;min-height:56px;margin-top:0;padding:8px 11px;border-radius:10px;text-align:left;cursor:pointer;font-family:inherit;clip-path:polygon(0 0,calc(100% - 8px) 0,100% 8px,100% 100%,8px 100%,0 calc(100% - 8px));transition:transform .15s ease,box-shadow .22s ease,border-color .22s ease;}',
  '#ar6-root .ar6-temple-btn:hover{transform:translateY(-1px);}',
  '#ar6-root .ar6-temple-btn:active{transform:scale(.985);}',
  '#ar6-root .ar6-temple-ico{width:32px;height:32px;flex:0 0 32px;border-radius:8px;display:flex;align-items:center;justify-content:center;position:relative;z-index:2;}',
  '#ar6-root .ar6-temple-ico svg{width:22px;height:22px;display:block;}',
  '#ar6-root .ar6-temple-txt{display:flex;flex-direction:column;min-width:0;flex:1 1 auto;position:relative;z-index:2;}',
  '#ar6-root .ar6-temple-name{font-size:12.4px;font-weight:800;letter-spacing:.2px;line-height:1.25;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}',
  '#ar6-root .ar6-temple-sub{font-size:10.8px;font-weight:500;font-style:normal;line-height:1.3;margin-top:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}',
  '#ar6-root .ar6-temple-wingbg{position:absolute;right:-8px;top:-6px;width:92px;height:68px;pointer-events:none;opacity:.26;z-index:1;}',
  /* 诺亚殿堂大键：银白铂金金属拉丝底 + 斜向棱镜流光扫掠 + 激活态全盛圣辉（深靛字 #0B172A） */
  '#ar6-root .ar6-temple-btn.noa{background:repeating-linear-gradient(0deg,rgba(255,255,255,.05) 0px,rgba(255,255,255,.05) 1px,transparent 1px,transparent 3px),linear-gradient(135deg,#27364B 0%,#3D526E 36%,#243B55 68%,#334155 100%);border:1.5px solid rgba(226,232,240,.52);box-shadow:0 4px 14px rgba(2,6,23,.45),inset 0 1px 0 rgba(255,255,255,.28);color:#F8FAFC;}',
  '#ar6-root .ar6-temple-btn.noa::after{content:"";position:absolute;top:0;bottom:0;width:48%;background:linear-gradient(90deg,transparent,rgba(255,255,255,.22),rgba(186,230,253,.28),rgba(253,230,138,.18),transparent);transform:translateX(-130%) skewX(-24deg);animation:ar6WingSweep 5.6s ease-in-out infinite;pointer-events:none;z-index:1;}',
  '#ar6-root .ar6-temple-btn.noa .ar6-temple-ico{background:linear-gradient(135deg,rgba(255,255,255,.22),rgba(125,211,252,.22));border:1px solid rgba(226,232,240,.6);box-shadow:0 0 10px rgba(186,230,253,.35);}',
  '#ar6-root .ar6-temple-btn.noa .ar6-temple-name{color:#F8FAFC;text-shadow:0 1px 6px rgba(125,211,252,.35);}',
  '#ar6-root .ar6-temple-btn.noa .ar6-temple-sub,#ar6-root .ar6-temple-btn.noa i{color:#BAE6FD;}',
  '#ar6-root .ar6-temple-btn.noa.on,#ar6-root .ar6-ultb.ar6-temple-btn.noa.on{background:repeating-linear-gradient(0deg,rgba(15,23,42,.035) 0px,rgba(15,23,42,.035) 1px,transparent 1px,transparent 3px),linear-gradient(132deg,#F8FAFC 0%,#E0F2FE 34%,#FFFFFF 52%,#FEF3C7 78%,#E2E8F0 100%);border:1.5px solid #FFFFFF;color:#0B172A;animation:ar6NoaHalo 3.6s ease-in-out infinite;}',
  '#ar6-root .ar6-temple-btn.noa.on .ar6-temple-ico{background:linear-gradient(135deg,#0F172A,#1E3A5F);border-color:#38BDF8;box-shadow:0 0 12px rgba(56,189,248,.55);}',
  '#ar6-root .ar6-temple-btn.noa.on .ar6-temple-name{color:#0B172A;text-shadow:0 1px 0 rgba(255,255,255,.9);}',
  '#ar6-root .ar6-temple-btn.noa.on .ar6-temple-sub,#ar6-root .ar6-temple-btn.noa.on i{color:#0369A1;font-weight:700;}',
  '#ar6-root .ar6-temple-btn.noa.on .ar6-temple-wingbg{opacity:.45;}',
  /* 凝视深渊殿堂大键：纯黑曜石底 (#050508 -> #16040A) + 暗血红呼吸边框 + 激活态深红蚀光全盛（兼容 .ar6-ultb.deep.on） */
  '#ar6-root .ar6-temple-btn.abyss,#ar6-root .ar6-ultb.deep.ar6-temple-btn.abyss{background:radial-gradient(circle at 88% 22%,rgba(190,18,60,.24) 0%,transparent 58%),linear-gradient(135deg,#050508 0%,#0D0408 54%,#16040A 100%);border:1.5px solid rgba(225,29,72,.55);animation:ar6AbyssBreath 3.4s ease-in-out infinite;color:#FFE4E6;}',
  '#ar6-root .ar6-temple-btn.abyss .ar6-temple-ico{background:radial-gradient(circle at 50% 50%,#2A040E 0%,#070306 100%);border:1px solid rgba(244,63,94,.62);box-shadow:0 0 12px rgba(225,29,72,.45);}',
  '#ar6-root .ar6-temple-btn.abyss .ar6-temple-name{color:#FFE4E6;text-shadow:0 0 10px rgba(244,63,94,.55);}',
  '#ar6-root .ar6-temple-btn.abyss .ar6-temple-sub,#ar6-root .ar6-temple-btn.abyss i{color:#FDA4AF;opacity:.88;}',
  '#ar6-root .ar6-temple-btn.abyss .ar6-temple-wingbg{opacity:.48;}',
  '#ar6-root .ar6-temple-btn.abyss.on,#ar6-root .ar6-ultb.deep.ar6-temple-btn.abyss.on{background:radial-gradient(circle at 82% 24%,rgba(244,63,94,.36) 0%,transparent 62%),linear-gradient(135deg,#060306 0%,#1B040C 52%,#2B0612 100%);border:1.5px solid #FF2E55;box-shadow:0 0 24px rgba(244,63,94,.62),inset 0 0 22px rgba(190,18,60,.45);animation:none;color:#FFFFFF;}',
  '#ar6-root .ar6-temple-btn.abyss.on .ar6-temple-ico{border-color:#FFE4E6;box-shadow:0 0 16px rgba(255,46,85,.85);}',
  '#ar6-root .ar6-temple-btn.abyss.on .ar6-temple-name{color:#FFFFFF;text-shadow:0 0 12px rgba(255,46,85,.95);}',
  '#ar6-root .ar6-temple-btn.abyss.on .ar6-temple-sub,#ar6-root .ar6-temple-btn.abyss.on i{color:#FECDD3;font-weight:700;opacity:1;}',
  /* 分段光能槽与迪迦五形态专属高亮色 */
  '#ar6-root .ar6-ubar{display:flex;flex-wrap:wrap;gap:5px;}',
  '#ar6-root .ar6-ubtn{flex:1 1 auto;min-width:52px;min-height:32px;padding:5px 8px;text-align:center;justify-content:center;font:600 12px/1.2 inherit;border-radius:7px;border:1px solid rgba(148,163,184,.34);background:#162032;color:#94A3B8;cursor:pointer;transition:all .12s ease;}',
  '#ar6-root .ar6-ubtn:hover{border-color:#7DD3FC;color:#F0F9FF;}',
  '#ar6-root .ar6-ubtn.on{background:#0C2D48;border-color:#38BDF8;color:#F0F9FF;box-shadow:0 0 10px rgba(56,189,248,.28);}',
  '#ar6-root .ar6-ubtn.off.on{background:#1E293B;border-color:#94A3B8;color:#F0F9FF;box-shadow:inset 2px 0 0 #94A3B8;}',
  '#ar6-root .ar6-ubtn.gold.on{background:linear-gradient(135deg,#D97706,#B45309);border-color:#FCD34D;color:#FEF3C7;box-shadow:0 0 12px rgba(252,211,77,.35);}',
  '#ar6-root .ar6-ubtn[data-form="off"].on{background:#26334D;border-color:#475569;color:#CBD5E1;box-shadow:none;}',
  '#ar6-root .ar6-ubtn[data-form="safe"].on{background:linear-gradient(135deg,#2563EB,#4C1D95);border-color:#60A5FA;color:#EFF6FF;box-shadow:0 0 12px rgba(96,165,250,.34);}',
  '#ar6-root .ar6-ubtn[data-form="mid"].on{background:linear-gradient(135deg,#6D28D9 0%,#7F1D1D 100%);border-color:#A78BFA;color:#F5F3FF;box-shadow:0 0 12px rgba(167,139,250,.34);}',
  '#ar6-root .ar6-ubtn[data-form="strong"].on{background:linear-gradient(135deg,#BE123C,#991B1B);border-color:#FB7185;color:#FFF1F2;box-shadow:0 0 12px rgba(251,113,133,.36);}',
  '#ar6-root .ar6-ubtn[data-form="supreme"].on{background:linear-gradient(135deg,#D97706,#B45309);border-color:#FCD34D;color:#FEF3C7;box-shadow:0 0 14px rgba(252,211,77,.42);}',
  /* 规整双列战术开关矩阵 (.ar6-tgrid) 与开关胶囊按钮 (.ar6-b) */
  '#ar6-root .ar6-tgrid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:6px;padding:5px 0;}',
  '#ar6-root .ar6-tgrid.cols-3{grid-template-columns:repeat(3,minmax(0,1fr));}',
  '#ar6-root .ar6-b,#ar6-root .ar6-cyc{display:inline-flex;align-items:center;gap:6px;min-height:34px;padding:5px 10px;border-radius:8px;font:600 11.9px/1.2 inherit;white-space:nowrap;background:#162032;border:1px solid rgba(148,163,184,.36);color:#94A3B8;cursor:pointer;clip-path:polygon(0 0,calc(100% - 6px) 0,100% 6px,100% 100%,6px 100%,0 calc(100% - 6px));transition:transform .1s ease,border-color .14s ease,background .14s ease,color .14s ease;}',
  '#ar6-root .ar6-tgrid .ar6-b{width:100%;min-width:0;}',
  '#ar6-root .ar6-b.span-2{grid-column:1 / -1;}',
  '#ar6-root .ar6-b::before{content:"";width:7px;height:7px;border-radius:50%;background:#475569;border:1px solid #94A3B8;flex:0 0 7px;}',
  '#ar6-root .ar6-b>span,#ar6-root .ar6-b .ar6-b-lbl,#ar6-root .ar6-b .ar6-b-left{min-width:0;overflow:hidden;text-overflow:ellipsis;text-align:left;}',
  '#ar6-root .ar6-b .ar6-b-st,#ar6-root .ar6-b .ar6-b-state{margin-left:auto;flex:0 0 auto;font-style:normal;font-size:10.6px;font-weight:700;line-height:1.25;padding:1px 6px;border-radius:4px;background:rgba(8,13,24,.68);color:#64748B;}',
  '#ar6-root .ar6-b.ar6-act::before,#ar6-root .ar6-b.act::before{display:none;}',
  '#ar6-root .ar6-b.ar6-act,#ar6-root .ar6-b.act{justify-content:center;text-align:center;background:#182438;border-color:rgba(148,163,184,.44);color:#E2E8F0;}',
  '#ar6-root .ar6-b.ar6-act>span,#ar6-root .ar6-b.act>span{text-align:center;}',
  '#ar6-root .ar6-b.on,#ar6-root .ar6-cyc.on{background:#0C2D48;border-color:#38BDF8;color:#F0F9FF;box-shadow:0 0 12px rgba(56,189,248,.2),inset 2px 0 0 #38BDF8;}',
  '#ar6-root .ar6-b.on::before{background:#38BDF8;border-color:#E0F2FE;box-shadow:0 0 8px #38BDF8;}',
  '#ar6-root .ar6-b.on .ar6-b-st,#ar6-root .ar6-b.on .ar6-b-state{background:rgba(56,189,248,.2);color:#BAE6FD;}',
  '#ar6-root .ar6-b.gold.on,#ar6-root .ar6-pri{background:linear-gradient(135deg,rgba(217,119,6,.36),rgba(180,83,9,.48));border-color:#FCD34D;color:#FEF3C7;box-shadow:0 0 14px rgba(252,211,77,.26);}',
  '#ar6-root .ar6-b.gold.on::before{background:#FCD34D;border-color:#FEF9C3;box-shadow:0 0 8px #FCD34D;}',
  '#ar6-root .ar6-b.gold.on .ar6-b-st,#ar6-root .ar6-b.gold.on .ar6-b-state{background:rgba(252,211,77,.22);color:#FEF08A;}',
  '#ar6-root .ar6-b.danger{background:#162032;border-color:rgba(148,163,184,.38);color:#CBD5E1;}',
  '#ar6-root .ar6-b.danger::before{background:#64748B;border-color:#94A3B8;}',
  /* 计时器红灯闪烁告警：仅用于异动告警与清空记录 4 秒二次确认 */
  '#ar6-root .ar6-b.confirm-red{background:linear-gradient(135deg,#881337,#4C0519);border-color:#F43F5E;color:#FFE4E6;animation:ar6TimerRed 1s ease-in-out infinite;}',
  '#ar6-root .ar6-b.confirm-red::before{background:#F43F5E;border-color:#FFE4E6;box-shadow:0 0 8px #F43F5E;}',
  '#ar6-root .ar6-b.confirm-red .ar6-b-st{background:rgba(244,63,94,.28);color:#FFE4E6;}',
  '#ar6-root .ar6-b:hover,#ar6-root .ar6-cyc:hover{border-color:#7DD3FC;color:#F0F9FF;}',
  '#ar6-root .ar6-b:active,#ar6-root .ar6-cyc:active,#ar6-root .ar6-ubtn:active{transform:scale(.97);}',
  '#ar6-root .ar6-b[data-off="1"]{opacity:.58;border-style:dashed;}',
  /* 区块布局、输入框与说明文字 */
  '#ar6-root .ar6-more{margin:10px 12px 8px;padding-top:2px;border-top:1px solid rgba(148,163,184,.18);}',
  '#ar6-root .ar6-mmore-h{font-size:11.8px;font-weight:700;letter-spacing:.4px;color:#7DD3FC;padding:10px 0 4px;display:flex;align-items:center;gap:6px;}',
  '#ar6-root .ar6-mmore-h::before{content:"";width:3px;height:12px;background:#38BDF8;border-radius:2px;box-shadow:0 0 6px #38BDF8;}',
  '#ar6-root .ar6-mrow{display:flex;flex-wrap:wrap;gap:6px;padding:5px 0;}',
  '#ar6-root .ar6-mind{margin:6px 12px 0;padding:0;}',
  '#ar6-root .ar6-dline{font-size:11.6px;color:#94A3B8;line-height:1.55;margin-top:4px;}',
  '#ar6-root .ar6-input{display:flex;gap:7px;padding:4px 0 8px;}',
  '#ar6-root .ar6-input input{flex:1;min-width:0;border:1px solid rgba(148,163,184,.36);background:#0B1220;color:#F0F9FF;border-radius:8px;padding:7px 10px;font-size:12px;font-family:inherit;}',
  '#ar6-root .ar6-input input:focus{outline:none;border-color:#38BDF8;box-shadow:0 0 0 2px rgba(56,189,248,.18);}',
  '#ar6-root .ar6-mf{display:none;}',
  /* 窄屏自适应折行规则 */
  '@media (max-width:440px){#ar6-root .ar6-temple-btn{padding:7px 9px;gap:7px;min-height:52px;}#ar6-root .ar6-temple-name{font-size:11.7px;}#ar6-root .ar6-temple-sub{font-size:10.3px;}}',
  '@media (max-width:400px){#ar6-root .ar6-tgrid.cols-3{grid-template-columns:1fr;}}',
  '@media (max-width:380px){#ar6-root .ar6-ult-grid{grid-template-columns:1fr;gap:6px;}}',
  '@media (max-width:350px){#ar6-root .ar6-tgrid{grid-template-columns:1fr;}}',
  /* 手机端窄屏适配：输入框防 iOS 放大、标题单行省略、按钮触控优化、视口高度优先 100dvh */
  '@media (max-width:600px){#ar6-root .ar6-input input{font-size:16px!important;}#ar6-root .ar6-mt{white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}#ar6-root button[data-ar6],#ar6-root .ar6-b,#ar6-root .ar6-ubtn,#ar6-root .ar6-navb,#ar6-root .ar6-hsw,#ar6-root .ar6-x{touch-action:manipulation;}}',
  /* ---- 四态圣殿仪式确认弹窗 (#ar6-card.ar6-ritual-mask / .ar6-ritual[data-ritual="..."])，直接挂在 DOC.body 下 ---- */
  '#ar6-card.ar6-ritual-mask{position:fixed;inset:0;z-index:2147483600;display:flex;align-items:center;justify-content:center;padding:16px;background:rgba(3,6,15,.72);-webkit-backdrop-filter:blur(4px);backdrop-filter:blur(4px);font:13px/1.5 -apple-system,BlinkMacSystemFont,"Segoe UI","PingFang SC","Microsoft YaHei",sans-serif;box-sizing:border-box;animation:ar6-fade .18s ease;}',
  '#ar6-card.ar6-ritual-mask *,.ar6-ritual,.ar6-ritual *{box-sizing:border-box;min-width:0;}',
  '.ar6-rt-ambient{position:absolute;inset:0;pointer-events:none;overflow:hidden;z-index:0;}',
  '.ar6-rt-ambient svg{width:100%;height:100%;display:block;}',
  '.ar6-ritual{position:relative;z-index:1;overflow:hidden;width:min(428px,calc(100vw - 24px));max-height:88vh;overflow-y:auto;border-radius:20px;padding:24px 22px 20px;text-align:center;color:#F8FAFC;box-shadow:0 24px 72px rgba(0,0,0,.85);animation:ar6-pop .2s cubic-bezier(.2,.8,.2,1);}',
  '.ar6-ritual::before{content:"";position:absolute;top:0;left:0;right:0;height:3.5px;z-index:3;pointer-events:none;}',
  '.ar6-rt-crest{position:relative;z-index:2;width:68px;height:68px;margin:0 auto 12px;border-radius:50%;display:flex;align-items:center;justify-content:center;animation:ar6CrestPulse 3.2s ease-in-out infinite;}',
  '.ar6-rt-crest svg{width:40px;height:40px;display:block;position:relative;z-index:2;}',
  '.ar6-rt-tag{position:relative;z-index:2;display:inline-block;font-size:10.5px;font-weight:800;letter-spacing:1.5px;padding:3px 10px;border-radius:999px;margin-bottom:8px;text-transform:uppercase;}',
  '.ar6-rt-title{position:relative;z-index:2;font-size:20px;font-weight:800;letter-spacing:.5px;line-height:1.3;margin:0 0 10px;}',
  '.ar6-rt-prologue{position:relative;z-index:2;font-size:12.2px;line-height:1.65;font-style:italic;color:#CBD5E1;margin:0 4px 12px;padding:0 4px;opacity:.92;letter-spacing:.2px;}',
  '.ar6-rt-quote{position:relative;z-index:2;padding:15px 16px;border-radius:13px;font-size:14px;font-weight:600;line-height:1.78;letter-spacing:.25px;margin:0 0 12px;}',
  '.ar6-rt-note{position:relative;z-index:2;font-size:11.4px;font-weight:600;color:rgba(226,232,240,.88);letter-spacing:.3px;margin:0 0 16px;padding:7px 10px;border-radius:9px;background:rgba(15,23,42,.55);border:1px solid rgba(148,163,184,.22);}',
  '.ar6-rt-acts{position:relative;z-index:2;display:grid;grid-template-columns:1.38fr 1fr;gap:10px;}',
  '.ar6-rt-ok,.ar6-rt-no,.ar6-ritual [data-ar6-card$="ok"],.ar6-ritual [data-ar6-card$="no"]{display:inline-flex;align-items:center;justify-content:center;gap:6px;width:100%;min-height:42px;padding:10px 14px;border-radius:11px;font:700 13px/1.2 inherit;cursor:pointer;transition:transform .14s ease,box-shadow .18s ease,filter .18s ease;}',
  '.ar6-rt-ok:hover,.ar6-rt-no:hover,.ar6-ritual [data-ar6-card$="ok"]:hover,.ar6-ritual [data-ar6-card$="no"]:hover{transform:translateY(-1px);filter:brightness(1.06);}',
  '.ar6-rt-ok:active,.ar6-rt-no:active,.ar6-ritual [data-ar6-card$="ok"]:active,.ar6-ritual [data-ar6-card$="no"]:active{transform:scale(.98);}',
  '.ar6-rt-no,.ar6-ritual [data-ar6-card$="no"]{font-weight:600;background:rgba(22,32,50,.85);border:1px solid rgba(148,163,184,.36);color:#CBD5E1;}',
  /* 圣殿弹窗 1：strong 赤红刚力 */
  '.ar6-ritual[data-ritual="strong"]{background:radial-gradient(circle at 50% 0%,rgba(225,29,72,.32) 0%,transparent 62%),linear-gradient(180deg,#1D0B14 0%,#0D0912 100%);border:1.5px solid rgba(251,113,133,.72);box-shadow:0 0 42px rgba(225,29,72,.36),0 24px 72px rgba(0,0,0,.88);}',
  '.ar6-ritual[data-ritual="strong"]::before{background:linear-gradient(90deg,#991B1B,#FB7185,#FDE047,#FB7185,#991B1B);background-size:200% 100%;animation:ar6SpeciumFlow 4s linear infinite;}',
  '.ar6-ritual[data-ritual="strong"] .ar6-rt-crest{background:radial-gradient(circle,rgba(251,113,133,.32) 0%,rgba(153,27,27,.45) 70%);border:1.5px solid #FB7185;box-shadow:0 0 24px rgba(244,63,94,.55);color:#FFF1F2;}',
  '.ar6-ritual[data-ritual="strong"] .ar6-rt-tag{background:rgba(159,18,57,.45);border:1px solid rgba(251,113,133,.55);color:#FECDD3;}',
  '.ar6-ritual[data-ritual="strong"] .ar6-rt-title{color:#FFE4E6;text-shadow:0 0 16px rgba(251,113,133,.45);}',
  '.ar6-ritual[data-ritual="strong"] .ar6-rt-prologue{color:#FECDD3;}',
  '.ar6-ritual[data-ritual="strong"] .ar6-rt-quote{background:rgba(136,19,55,.28);border:1px solid rgba(251,113,133,.38);color:#FFF1F2;}',
  '.ar6-ritual[data-ritual="strong"] .ar6-rt-note{color:#FECDD3;border-color:rgba(251,113,133,.3);}',
  '.ar6-ritual[data-ritual="strong"] .ar6-rt-ok,.ar6-ritual[data-ritual="strong"] [data-ar6-card$="ok"]{background:linear-gradient(135deg,#E11D48,#991B1B);border:1px solid #FDA4AF;color:#FFF1F2;box-shadow:0 0 20px rgba(225,29,72,.48);}',
  /* 圣殿弹窗 2：supreme 璀璨黄金 */
  '.ar6-ritual[data-ritual="supreme"]{background:radial-gradient(circle at 50% -5%,rgba(252,211,77,.36) 0%,transparent 65%),linear-gradient(180deg,#1F1709 0%,#0E0B07 100%);border:1.5px solid #FCD34D;box-shadow:0 0 48px rgba(251,191,36,.38),0 24px 72px rgba(0,0,0,.88);}',
  '.ar6-ritual[data-ritual="supreme"]::before{background:linear-gradient(90deg,#B45309,#FDE68A,#FFFFFF,#FCD34D,#B45309);background-size:200% 100%;animation:ar6SpeciumFlow 4.5s linear infinite;}',
  '.ar6-ritual[data-ritual="supreme"] .ar6-rt-crest{background:radial-gradient(circle,rgba(254,243,199,.42) 0%,rgba(180,83,9,.45) 72%);border:1.5px solid #FDE68A;box-shadow:0 0 28px rgba(252,211,77,.68);color:#FEF9C3;}',
  '.ar6-ritual[data-ritual="supreme"] .ar6-rt-tag{background:rgba(180,83,9,.42);border:1px solid rgba(252,211,77,.6);color:#FEF3C7;}',
  '.ar6-ritual[data-ritual="supreme"] .ar6-rt-title{color:#FEF08A;text-shadow:0 0 18px rgba(252,211,77,.55);}',
  '.ar6-ritual[data-ritual="supreme"] .ar6-rt-prologue{color:#FDE68A;}',
  '.ar6-ritual[data-ritual="supreme"] .ar6-rt-quote{background:linear-gradient(180deg,rgba(180,83,9,.24),rgba(120,53,15,.22));border:1px solid rgba(252,211,77,.45);color:#FFFBEB;box-shadow:inset 0 0 20px rgba(252,211,77,.1);}',
  '.ar6-ritual[data-ritual="supreme"] .ar6-rt-note{color:#FDE68A;border-color:rgba(252,211,77,.3);}',
  '.ar6-ritual[data-ritual="supreme"] .ar6-rt-ok,.ar6-ritual[data-ritual="supreme"] [data-ar6-card$="ok"]{background:linear-gradient(135deg,#F59E0B 0%,#D97706 55%,#B45309 100%);border:1px solid #FEF08A;color:#FFFBEB;text-shadow:0 1px 2px rgba(120,53,15,.7);box-shadow:0 0 22px rgba(251,191,36,.52);}',
  /* 圣殿弹窗 3：noa 神圣铂银棱镜圣翼 */
  '.ar6-ritual[data-ritual="noa"]{background:radial-gradient(ellipse 85% 50% at 50% -8%,rgba(224,242,254,.36) 0%,rgba(196,181,253,.14) 48%,transparent 75%),repeating-linear-gradient(0deg,rgba(255,255,255,.02) 0px,rgba(255,255,255,.02) 1px,transparent 1px,transparent 3px),linear-gradient(180deg,#162238 0%,#0C1424 100%);border:1.5px solid #E2E8F0;box-shadow:0 0 0 1px rgba(186,230,253,.45),0 0 54px rgba(125,211,252,.42),0 0 90px rgba(253,230,138,.18),0 26px 76px rgba(2,6,23,.9);}',
  '.ar6-ritual[data-ritual="noa"]::before{height:4px;background:linear-gradient(90deg,#E2E8F0,#7DD3FC,#FFFFFF,#FDE68A,#C4B5FD,#FFFFFF,#E2E8F0);background-size:200% 100%;animation:ar6NoaPrism 4.5s linear infinite;}',
  '.ar6-ritual[data-ritual="noa"] .ar6-rt-crest{background:radial-gradient(circle,rgba(255,255,255,.92) 0%,rgba(186,230,253,.45) 55%,rgba(51,65,85,.5) 100%);border:2px solid #FFFFFF;box-shadow:0 0 28px rgba(186,230,253,.88),0 0 48px rgba(253,230,138,.36);color:#0F172A;}',
  '.ar6-ritual[data-ritual="noa"] .ar6-rt-tag{background:linear-gradient(90deg,rgba(226,232,240,.22),rgba(56,189,248,.24),rgba(253,230,138,.2));border:1px solid rgba(226,232,240,.65);color:#F8FAFC;}',
  '.ar6-ritual[data-ritual="noa"] .ar6-rt-title{color:#F8FAFC;background:linear-gradient(90deg,#FFFFFF 0%,#E0F2FE 45%,#FEF3C7 85%,#FFFFFF 100%);-webkit-background-clip:text;background-clip:text;-webkit-text-fill-color:transparent;filter:drop-shadow(0 2px 12px rgba(186,230,253,.45));}',
  '.ar6-ritual[data-ritual="noa"] .ar6-rt-prologue{color:#E0F2FE;}',
  '.ar6-ritual[data-ritual="noa"] .ar6-rt-quote{background:linear-gradient(135deg,rgba(241,245,249,.12) 0%,rgba(56,189,248,.1) 52%,rgba(253,230,138,.09) 100%);border:1px solid rgba(226,232,240,.48);box-shadow:inset 0 1px 0 rgba(255,255,255,.3),0 0 24px rgba(125,211,252,.14);color:#F8FAFC;}',
  '.ar6-ritual[data-ritual="noa"] .ar6-rt-note{color:#BAE6FD;border-color:rgba(186,230,253,.32);}',
  '.ar6-ritual[data-ritual="noa"] .ar6-rt-ok,.ar6-ritual[data-ritual="noa"] [data-ar6-card$="ok"]{background:linear-gradient(135deg,#FFFFFF 0%,#E0F2FE 42%,#FEF3C7 82%,#F1F5F9 100%);border:1.5px solid #FFFFFF;color:#0B172A;font-weight:800;box-shadow:0 0 24px rgba(186,230,253,.65),0 0 40px rgba(253,230,138,.25);}',
  /* 圣殿弹窗 4：abyss 纯黑深渊 + 血红裂隙 + 纯黑底(#040103)血红发光字引语匣 */
  '.ar6-ritual[data-ritual="abyss"]{background:radial-gradient(circle at 50% 0%,rgba(159,18,57,.28) 0%,transparent 60%),linear-gradient(180deg,#090307 0%,#030204 100%);border:1.5px solid #E11D48;box-shadow:0 0 0 1px rgba(136,19,55,.6),0 0 56px rgba(225,29,72,.48),inset 0 0 42px rgba(136,19,55,.26),0 28px 80px rgba(0,0,0,.96);}',
  '.ar6-ritual[data-ritual="abyss"]::before{height:4px;background:linear-gradient(90deg,#050204,#9F1239,#FF2E55,#9F1239,#050204);background-size:200% 100%;animation:ar6SpeciumFlow 4.2s linear infinite;}',
  '.ar6-ritual[data-ritual="abyss"] .ar6-rt-crest{background:radial-gradient(circle,#1F040B 0%,#040204 75%);border:1.5px solid #FF2E55;box-shadow:0 0 28px rgba(244,63,94,.72),inset 0 0 14px rgba(225,29,72,.55);color:#FB7185;}',
  '.ar6-ritual[data-ritual="abyss"] .ar6-rt-tag{background:#140308;border:1px solid rgba(244,63,94,.62);color:#FDA4AF;}',
  '.ar6-ritual[data-ritual="abyss"] .ar6-rt-title{color:#FFE4E6;text-shadow:0 0 16px rgba(244,63,94,.82);}',
  '.ar6-ritual[data-ritual="abyss"] .ar6-rt-prologue{color:#FDA4AF;opacity:.88;}',
  '.ar6-ritual[data-ritual="abyss"] .ar6-rt-quote{background:#040103;border:1px solid rgba(225,29,72,.68);box-shadow:inset 0 0 26px rgba(159,18,57,.42),0 0 18px rgba(225,29,72,.22);color:#FB7185;text-shadow:0 0 12px rgba(244,63,94,.85),0 0 22px rgba(190,18,60,.65);font-weight:700;}',
  '.ar6-ritual[data-ritual="abyss"] .ar6-rt-note{color:#FDA4AF;background:rgba(15,3,8,.78);border-color:rgba(225,29,72,.35);}',
  '.ar6-ritual[data-ritual="abyss"] .ar6-rt-ok,.ar6-ritual[data-ritual="abyss"] [data-ar6-card$="ok"]{background:linear-gradient(135deg,#9F1239 0%,#4C0519 100%);border:1px solid #FF2E55;color:#FFE4E6;text-shadow:0 0 8px rgba(255,46,85,.7);box-shadow:0 0 24px rgba(225,29,72,.58);}',
  '.ar6-ritual[data-ritual="abyss"] .ar6-rt-no,.ar6-ritual[data-ritual="abyss"] [data-ar6-card$="no"]{background:#0D060A;border-color:rgba(148,163,184,.3);color:#94A3B8;}',
  '@media (max-width:480px){.ar6-ritual{padding:20px 16px 18px;}.ar6-rt-title{font-size:18.5px;}.ar6-rt-quote{font-size:13.2px;padding:13px;}.ar6-rt-acts{grid-template-columns:1fr;gap:8px;}}',
  /* ---- 全屏屏幕光流觉醒动效层 (#ar6-fx) ---- */
  '#ar6-fx{position:fixed;inset:0;pointer-events:none;z-index:2147483150;overflow:hidden;animation:ar6FxBurst 1.45s cubic-bezier(.16,.84,.28,1) forwards;}',
  '#ar6-fx .ar6-fx-edge{position:absolute;inset:0;}',
  '#ar6-fx .ar6-fx-svg{position:absolute;inset:0;width:100%;height:100%;display:block;animation:ar6FxFloat 2.4s ease-in-out infinite;}',
  '#ar6-fx[data-fx="strong"] .ar6-fx-edge{box-shadow:inset 0 0 95px rgba(225,29,72,.58),inset 0 0 34px rgba(251,191,36,.42);background:radial-gradient(ellipse 85% 65% at 50% 50%,transparent 48%,rgba(159,18,57,.3) 100%);}',
  '#ar6-fx[data-fx="supreme"] .ar6-fx-edge{box-shadow:inset 0 0 105px rgba(251,191,36,.52),inset 0 0 38px rgba(254,243,199,.48);background:radial-gradient(ellipse 80% 50% at 50% 0%,rgba(254,243,199,.34) 0%,rgba(245,158,11,.12) 45%,transparent 78%);}',
  '#ar6-fx[data-fx="noa"] .ar6-fx-edge{box-shadow:inset 0 0 110px rgba(125,211,252,.52),inset 0 0 42px rgba(255,255,255,.62);background:radial-gradient(ellipse 78% 54% at 50% 12%,rgba(224,242,254,.32) 0%,rgba(196,181,253,.14) 44%,transparent 78%),radial-gradient(ellipse 90% 80% at 50% 50%,transparent 52%,rgba(186,230,253,.24) 100%);}',
  '#ar6-fx[data-fx="abyss"] .ar6-fx-edge{box-shadow:inset 0 0 130px rgba(0,0,0,.95),inset 0 0 85px rgba(159,18,57,.72),inset 0 0 28px rgba(255,46,85,.55);background:radial-gradient(ellipse 68% 62% at 50% 50%,transparent 28%,rgba(8,2,5,.68) 74%,rgba(3,0,3,.94) 100%);}',
  '#ar6-fx .ar6-fx-star{animation:ar6FxStar 1.8s ease-in-out infinite;transform-box:fill-box;transform-origin:center;}',
  '#ar6-fx .ar6-fx-rift{animation:ar6FxRift 1.4s ease-in-out infinite;}',
  '#ar6-fx .ar6-fx-mote-a{animation:ar6FxRise 1.45s ease-out forwards;}',
  '#ar6-fx .ar6-fx-mote-b{animation:ar6FxRise 1.45s cubic-bezier(.2,.7,.3,1) forwards;}',
  '#ar6-fx .ar6-fx-beam{animation:ar6FxStreak 1.3s ease-out forwards;}',
  /* 顶部横幅通知 (#ar6-bn2) */
  '#ar6-bn2{position:fixed;left:50%;transform:translateX(-50%) translateY(-8px);z-index:2147483650;display:flex;align-items:flex-start;gap:9px;max-width:min(560px,92vw);padding:9px 11px 9px 12px;border-radius:12px;background:rgba(15,24,43,.96);border:1px solid rgba(148,163,184,.38);border-left-width:3px;box-shadow:0 12px 32px rgba(0,0,0,.55);font:13px/1.5 -apple-system,"Microsoft YaHei",sans-serif;color:#F0F9FF;opacity:0;pointer-events:auto;transition:opacity .18s ease,transform .18s cubic-bezier(.2,.8,.2,1);}',
  '#ar6-bn2[data-in="1"]{opacity:1;transform:translateX(-50%) translateY(0);}',
  '#ar6-bn2[data-kind="ok"]{border-left-color:#38BDF8;}',
  '#ar6-bn2[data-kind="warn"]{border-left-color:#FCD34D;}',
  '#ar6-bn2[data-kind="bad"]{border-left-color:#F43F5E;}',
  '#ar6-bn2[data-kind="gray"]{border-left-color:#64748B;}',
  '#ar6-bn2 .ar6-bi{flex:0 0 auto;width:18px;height:18px;margin-top:1px;color:#38BDF8;}',
  '#ar6-bn2[data-kind="warn"] .ar6-bi{color:#FCD34D;}',
  '#ar6-bn2[data-kind="bad"] .ar6-bi{color:#F43F5E;}',
  '#ar6-bn2[data-kind="gray"] .ar6-bi{color:#94A3B8;}',
  '#ar6-bn2 .ar6-bt{flex:1;min-width:0;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;}',
  '#ar6-bn2 .ar6-bx{flex:0 0 auto;border:0;background:transparent;color:#94A3B8;font-size:14px;line-height:1;padding:2px;cursor:pointer;}',
  /* ---- V5.74 双生协同单窗样式 (.ar6-dualbar / .ar6-pr-*)，继承皮肤与终极形态配色 ---- */
  '#ar6-root .ar6-dualbar{display:flex;align-items:center;gap:6px;padding:7px 12px;background:rgba(8,13,24,.9);border-bottom:1px solid var(--ar-line,rgba(148,163,184,.28));flex-wrap:nowrap;}',
  '#ar6-root .ar6-dualbtn{flex:1 1 0;min-width:0;display:inline-flex;align-items:center;justify-content:center;gap:4px;min-height:31px;padding:4px 8px;border-radius:8px;border:1px solid var(--ar-soft,rgba(148,163,184,.34));background:var(--ar-stby,#162032);color:var(--ar-sil,#94A3B8);font:700 11.8px/1.2 inherit;cursor:pointer;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;touch-action:manipulation;transition:all .14s ease;}',
  '#ar6-root .ar6-dualbtn:hover{border-color:var(--ar-cyan,#38BDF8);color:var(--ar-ink,#F0F9FF);}',
  '#ar6-root .ar6-dualbtn.on{background:linear-gradient(135deg,var(--ar-cyan-dk,#0284C7),var(--ar-on,#0C2D48));border-color:var(--ar-cyan,#38BDF8);color:var(--ar-ink,#F0F9FF);box-shadow:0 0 12px rgba(56,189,248,.28);}',
  '#ar6-root .ar6-dual-bdg{flex:0 0 auto;font-size:10.5px;font-weight:700;padding:2px 7px;border-radius:999px;background:rgba(56,189,248,.14);border:1px solid rgba(56,189,248,.38);color:#7DD3FC;white-space:nowrap;}',
  '#ar6-root .ar6-pr-area{padding:8px 0 4px;}',
  '#ar6-root .ar6-pr-tabs{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:5px;padding:0 12px 8px;}',
  '#ar6-root .ar6-pr-tab{display:inline-flex;align-items:center;justify-content:center;min-height:31px;padding:4px 6px;border-radius:8px;border:1px solid var(--ar-soft,rgba(148,163,184,.3));background:var(--ar-stby,#162032);color:var(--ar-sil,#94A3B8);font:600 11.8px/1.2 inherit;cursor:pointer;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;touch-action:manipulation;transition:all .12s ease;}',
  '#ar6-root .ar6-pr-tab:hover{border-color:var(--ar-cyan,#38BDF8);color:var(--ar-ink,#F0F9FF);}',
  '#ar6-root .ar6-pr-tab.on{background:linear-gradient(135deg,var(--ar-cyan-dk,#0284C7),var(--ar-on,#0C2D48));border-color:var(--ar-cyan,#38BDF8);color:var(--ar-ink,#F0F9FF);box-shadow:0 0 10px rgba(56,189,248,.26);}',
  '#ar6-root .ar6-pr-search{display:flex;align-items:center;gap:6px;padding:0 12px 8px;}',
  '#ar6-root .ar6-pr-search input{flex:1 1 auto;min-width:0;border:1px solid var(--ar-line,rgba(148,163,184,.36));background:#0B1220;color:var(--ar-ink,#F0F9FF);border-radius:8px;padding:7px 10px;font-size:12px;font-family:inherit;}',
  '#ar6-root .ar6-pr-search input:focus{outline:none;border-color:var(--ar-cyan,#38BDF8);box-shadow:0 0 0 2px rgba(56,189,248,.18);}',
  '#ar6-root .ar6-pr-syn{margin:0 12px 8px;padding:8px 11px;border-radius:10px;background:rgba(12,45,72,.38);border:1px solid rgba(56,189,248,.28);font-size:11.6px;line-height:1.48;color:#CBD5E1;}',
  '#ar6-root .ar6-pr-syn.active{background:linear-gradient(135deg,rgba(12,45,72,.78),rgba(15,24,43,.92));border-color:var(--ar-cyan,#38BDF8);box-shadow:0 0 14px rgba(56,189,248,.18);}',
  '#ar6-root .ar6-pr-syn-t{display:flex;align-items:center;justify-content:space-between;gap:6px;flex-wrap:wrap;font-weight:700;color:#F0F9FF;}',
  '#ar6-root .ar6-pr-syn-d{margin-top:3px;font-size:11.2px;color:#94A3B8;}',
  '#ar6-root .ar6-pr-list .ar6-tgrid{align-items:stretch;}',
  '#ar6-root .ar6-b.ar6-pr-sw{display:flex;flex-direction:column;align-items:stretch;justify-content:flex-start;gap:4px;min-height:46px;height:auto;padding:7px 9px;white-space:normal;text-align:left;}',
  '#ar6-root .ar6-b.ar6-pr-sw::before{display:none;}',
  '#ar6-root .ar6-pr-swtop{display:flex;align-items:center;gap:6px;width:100%;min-width:0;}',
  '#ar6-root .ar6-pr-dot{width:7px;height:7px;border-radius:50%;background:#475569;border:1px solid #94A3B8;flex:0 0 7px;display:inline-block;}',
  '#ar6-root .ar6-b.ar6-pr-sw.on .ar6-pr-dot{background:var(--ar-cyan,#38BDF8);border-color:#E0F2FE;box-shadow:0 0 8px var(--ar-cyan,#38BDF8);}',
  '#ar6-root .ar6-b.ar6-pr-sw.gold.on .ar6-pr-dot{background:var(--ar-gold,#FCD34D);border-color:#FEF9C3;box-shadow:0 0 8px var(--ar-gold,#FCD34D);}',
  '#ar6-root .ar6-pr-swdesc{display:block;font-size:10.8px;font-weight:400;line-height:1.4;color:var(--ar-sil,#94A3B8);white-space:normal;word-break:break-word;}',
  '#ar6-root .ar6-b.ar6-pr-sw.on .ar6-pr-swdesc{color:var(--ar-sil-hi,#CBD5E1);}',
  '#ar6-root .ar6-pr-rdescs{margin-top:6px;display:flex;flex-direction:column;gap:3px;padding:6px 8px;border-radius:8px;background:rgba(8,13,24,.46);border:1px solid rgba(148,163,184,.18);}',
  '#ar6-root .ar6-pr-rdesc{font-size:11px;line-height:1.42;color:var(--ar-sil,#94A3B8);word-break:break-word;}',
  '#ar6-root .ar6-pr-rdesc.on{color:var(--ar-ink,#F0F9FF);}',
  '#ar6-root .ar6-pr-rdesc b{font-weight:700;color:var(--ar-sil-hi,#CBD5E1);}',
  '#ar6-root .ar6-pr-rdesc.on b{color:var(--ar-cyan,#38BDF8);}',
  '#ar6-root .ar6-pr-txwrap{margin-top:8px;padding-top:8px;border-top:1px dashed rgba(148,163,184,.2);}',
  '#ar6-root .ar6-pr-txhead{display:flex;align-items:center;justify-content:space-between;gap:8px;}',
  '#ar6-root .ar6-pr-txlbl{font-size:12.2px;font-weight:700;color:#E2E8F0;}',
  '#ar6-root .ar6-pr-tx{width:100%;min-height:68px;resize:vertical;border:1px solid var(--ar-line,rgba(148,163,184,.36));background:#0B1220;color:var(--ar-ink,#F0F9FF);border-radius:8px;padding:7px 9px;font:12px/1.5 inherit;margin-top:4px;}',
  '#ar6-root .ar6-pr-tx:focus{outline:none;border-color:var(--ar-cyan,#38BDF8);box-shadow:0 0 0 2px rgba(56,189,248,.18);}',
  '#ar6-root .ar6-pr-txfoot{display:flex;align-items:center;justify-content:space-between;gap:8px;margin-top:6px;}',
  '#ar6-root .ar6-pr-bdls{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:7px;padding:4px 0;}',
  '#ar6-root .ar6-pr-bdl{display:flex;flex-direction:column;align-items:stretch;gap:4px;padding:9px 10px;border-radius:10px;border:1px solid var(--ar-soft,rgba(148,163,184,.32));background:var(--ar-stby,#162032);color:var(--ar-ink,#F0F9FF);text-align:left;font-family:inherit;cursor:pointer;touch-action:manipulation;transition:all .14s ease;}',
  '#ar6-root .ar6-pr-bdl:hover{border-color:var(--ar-cyan,#38BDF8);}',
  '#ar6-root .ar6-pr-bdl.on{background:linear-gradient(135deg,rgba(12,45,72,.85),rgba(15,24,43,.96));border-color:var(--ar-gold,#FCD34D);box-shadow:0 0 14px rgba(252,211,77,.2);}',
  '#ar6-root .ar6-pr-bdl-top{display:flex;align-items:center;justify-content:space-between;gap:5px;flex-wrap:wrap;}',
  '#ar6-root .ar6-pr-bdl-name{font-size:12.3px;font-weight:700;color:#F8FAFC;}',
  '#ar6-root .ar6-pr-bdl-desc{font-size:11.2px;line-height:1.45;color:#94A3B8;}',
  '#ar6-root .ar6-pr-bdl-meta{font-size:10.5px;color:#7DD3FC;margin-top:auto;}',
  /* 皮肤与终极形态继承 */
  '#ar6-root[data-tier="strong"] .ar6-dualbtn.on,#ar6-root[data-tier="strong"] .ar6-pr-tab.on{background:linear-gradient(135deg,#BE123C,#7F1D1D);border-color:#FB7185;color:#FFF1F2;}',
  '#ar6-root[data-tier="supreme"] .ar6-dualbtn.on,#ar6-root[data-tier="supreme"] .ar6-pr-tab.on{background:linear-gradient(135deg,#D97706,#78350F);border-color:#FCD34D;color:#FEF3C7;}',
  '#ar6-root[data-tier="noa"] .ar6-dualbtn.on,#ar6-root[data-tier="gatanothor"] .ar6-dualbtn.on,#ar6-root[data-tier="noa"] .ar6-pr-tab.on,#ar6-root[data-tier="gatanothor"] .ar6-pr-tab.on{background:linear-gradient(135deg,#334155,#0369A1);border-color:#E2E8F0;color:#FFFFFF;}',
  '#ar6-root[data-tier="abyss"] .ar6-dualbtn.on,#ar6-root[data-tier="abyss"] .ar6-pr-tab.on{background:linear-gradient(135deg,#881337,#2A0510);border-color:#FB7185;color:#FFE4E6;}',
  '#ar6-root[data-skin="plain"] .ar6-dualbar{background:#0D1117;border-bottom-color:rgba(240,246,252,.1);}',
  '#ar6-root[data-skin="plain"] .ar6-dualbtn,#ar6-root[data-skin="plain"] .ar6-pr-tab,#ar6-root[data-skin="plain"] .ar6-pr-bdl{background:#161B22;border-color:rgba(240,246,252,.14);color:#8B949E;}',
  '#ar6-root[data-skin="plain"] .ar6-dualbtn.on,#ar6-root[data-skin="plain"] .ar6-pr-tab.on{background:#1F6FEB;border-color:#58A6FF;color:#FFFFFF;box-shadow:none;}',
  '#ar6-root[data-skin="plain"] .ar6-pr-search input,#ar6-root[data-skin="plain"] .ar6-pr-tx{background:#0D1117;border-color:rgba(240,246,252,.16);}',
  '#ar6-root[data-skin="xianxia"] .ar6-dualbar{background:rgba(5,16,15,.88);border-bottom-color:rgba(231,196,118,.24);}',
  '#ar6-root[data-skin="xianxia"] .ar6-dualbtn,#ar6-root[data-skin="xianxia"] .ar6-pr-tab,#ar6-root[data-skin="xianxia"] .ar6-pr-bdl{background:rgba(13,38,35,.78);border-color:rgba(231,196,118,.24);color:#99C2B8;}',
  '#ar6-root[data-skin="xianxia"] .ar6-dualbtn.on,#ar6-root[data-skin="xianxia"] .ar6-pr-tab.on{background:linear-gradient(135deg,#115E59,#0B3A37);border-color:#E7C476;color:#FEF3C7;}',
  '#ar6-root[data-skin="xianxia"] .ar6-pr-search input,#ar6-root[data-skin="xianxia"] .ar6-pr-tx{background:rgba(6,20,19,.88);border-color:rgba(94,234,212,.25);}',
  '#ar6-root[data-skin="xuanhuan"] .ar6-dualbar{background:rgba(11,6,5,.9);border-bottom-color:rgba(245,158,11,.26);}',
  '#ar6-root[data-skin="xuanhuan"] .ar6-dualbtn,#ar6-root[data-skin="xuanhuan"] .ar6-pr-tab,#ar6-root[data-skin="xuanhuan"] .ar6-pr-bdl{background:#1B0D09;border-color:rgba(245,158,11,.28);color:#D6B18B;}',
  '#ar6-root[data-skin="xuanhuan"] .ar6-dualbtn.on,#ar6-root[data-skin="xuanhuan"] .ar6-pr-tab.on{background:linear-gradient(135deg,#B45309,#7C2D12);border-color:#FCD34D;color:#FFFBEB;}',
  '#ar6-root[data-skin="xuanhuan"] .ar6-pr-search input,#ar6-root[data-skin="xuanhuan"] .ar6-pr-tx{background:#120907;border-color:rgba(245,158,11,.32);}',
  '#ar6-root[data-skin="pink"] .ar6-dualbar{background:rgba(24,8,20,.88);border-bottom:1px dashed rgba(255,166,212,.3);}',
  '#ar6-root[data-skin="pink"] .ar6-dualbtn,#ar6-root[data-skin="pink"] .ar6-pr-tab,#ar6-root[data-skin="pink"] .ar6-pr-bdl{background:rgba(56,18,44,.8);border-color:rgba(255,148,204,.3);color:#E2A9C8;border-radius:12px;}',
  '#ar6-root[data-skin="pink"] .ar6-dualbtn.on,#ar6-root[data-skin="pink"] .ar6-pr-tab.on{background:linear-gradient(135deg,#FF4D9D,#BE185D);border-color:#FFD1E8;color:#FFFFFF;}',
  '#ar6-root[data-skin="pink"] .ar6-pr-search input,#ar6-root[data-skin="pink"] .ar6-pr-tx{background:rgba(32,10,26,.88);border-color:rgba(255,148,204,.32);}',
  '#ar6-root[data-skin="plain"] .ar6-pr-rdescs{background:#0D1117;border-color:rgba(240,246,252,.12);}',
  '#ar6-root[data-skin="xianxia"] .ar6-pr-rdescs{background:rgba(6,20,19,.72);border-color:rgba(231,196,118,.22);}',
  '#ar6-root[data-skin="xuanhuan"] .ar6-pr-rdescs{background:rgba(18,9,7,.76);border-color:rgba(245,158,11,.24);}',
  '#ar6-root[data-skin="pink"] .ar6-pr-rdescs{background:rgba(32,10,26,.74);border-color:rgba(255,148,204,.28);}',
  '@media (max-width:600px){#ar6-root .ar6-pr-search input,#ar6-root .ar6-pr-tx{font-size:16px!important;}#ar6-root .ar6-dualbar{padding:6px 10px;gap:5px;}#ar6-root .ar6-dual-bdg{display:none;}}',
  '@media (max-width:460px){#ar6-root .ar6-pr-list .ar6-tgrid{grid-template-columns:1fr;}}',
  '@media (max-width:350px){#ar6-root .ar6-pr-bdls{grid-template-columns:1fr;}#ar6-root .ar6-pr-tabs{grid-template-columns:repeat(2,minmax(0,1fr));}}',
  '.ar6-i{width:14px;height:14px;flex:0 0 auto;fill:none;stroke:currentColor;stroke-width:1.75;stroke-linecap:round;stroke-linejoin:round;}',
  '#ar6-root[data-rm="1"] *,#ar6-root[data-rm="1"] .ar6-p::before{animation:none!important;transition-duration:.01ms!important;}',
  '@media (prefers-reduced-motion:reduce){#ar6-root *,#ar6-root .ar6-p::before,#ar6-card *,#ar6-fx,#ar6-fx *,#ar6-bn2{animation:none!important;transition-duration:.01ms!important;}}'
].join('\n');

var AR6_GOLD_CSS = '';
var AR6_TEMPLE_CSS = '';
var V82_CSS = '';

function ensureStyle(d) {
  if (!d || !d.head) return;
  /* 清理旧版残留的多套冲突样式表节点 */
  try {
    var legacy = d.querySelectorAll('style#ar6-style82,style#ar6-gold-style,style#ar6-temple-style-v2');
    for (var li = 0; li < legacy.length; li++) if (legacy[li].parentNode) legacy[li].parentNode.removeChild(legacy[li]);
  } catch (eLg) {}
  [[STYLE_ID, CSS_TEXT], ['ar6-skin-style', (typeof SKIN_CSS_TEXT === 'string') ? SKIN_CSS_TEXT : ''], ['ar6-skinfx-style', (typeof SKIN_FX_CSS_TEXT === 'string') ? SKIN_FX_CSS_TEXT : ''], ['ar6-logwin-style', LOGW_CSS], ['ar6-dock-style', AR6_DOCK_CSS]].forEach(function (pair) {
    var nodes = d.querySelectorAll('style#' + pair[0]), node = nodes[0];
    for (var i = 1; i < nodes.length; i++) if (nodes[i].parentNode) nodes[i].parentNode.removeChild(nodes[i]);
    if (!node) { node = d.createElement('style'); node.id = pair[0]; d.head.appendChild(node); }
    if (node.textContent !== pair[1]) node.textContent = pair[1];
    node.setAttribute('data-v', 'v' + VERSION);
  });
}

var BANNER_KIND = { ok: '#38bdf8', warn: '#fcd34d', bad: '#f43f5e', gray: '#64748b' };
var BN_RANK = { gray: 1, ok: 2, warn: 3, bad: 4 };
var BN_STATE = { kind: '', at: 0 };

function banner(msg, kind, force) {
  if (DISPOSED || (cfg && cfg.silent && !force)) return;
  try {
    if (!DOC || !DOC.body) return;
    var k = BANNER_KIND[kind] ? kind : 'gray';
    var now = Date.now();
    if (BN_STATE.at && now - BN_STATE.at < 1600 && (BN_RANK[k] || 1) <= (BN_RANK[BN_STATE.kind] || 1)) return;
    BN_STATE.kind = k; BN_STATE.at = now;

    var old = DOC.getElementById('ar6-bn2');
    if (old && old.parentNode) old.parentNode.removeChild(old);
    var el = DOC.createElement('div');
    el.id = 'ar6-bn2';
    el.setAttribute('data-kind', k);
    el.setAttribute('role', k === 'bad' ? 'alert' : 'status');
    el.style.top = 'calc(8px + env(safe-area-inset-top, 0px))';
    el.innerHTML = '<span class="ar6-bi">' + ico(k === 'bad' ? 'alert' : (k === 'warn' ? 'warn' : (k === 'ok' ? 'check' : 'info'))) + '</span>' +
      '<span class="ar6-bt">' + esc(String(msg == null ? '' : msg).replace(/^[^\u4e00-\u9fa5A-Za-z0-9]+/, '')) + '</span>' +
      '<button class="ar6-bx" aria-label="关闭">✕</button>';
    DOC.body.appendChild(el);
    var close = function () { try { el.parentNode.removeChild(el); } catch (e) {} };
    el.querySelector('.ar6-bx').addEventListener('click', function (ev) { try { ev.stopPropagation(); } catch (e) {} close(); });
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

function panelStyle(mode) {
  var base = 'position:fixed;left:0;top:0;right:auto;bottom:auto;width:100vw;box-sizing:border-box;' +
    'height:100vh;height:var(--TH-viewport-height,100dvh);z-index:2147483000;display:flex;justify-content:center;' +
    'background:rgba(4,8,18,.64);-webkit-backdrop-filter:blur(3px);backdrop-filter:blur(3px);overflow:hidden;';
  if (mode === 'mobile') {
    return base + 'align-items:flex-start;padding:10px 8px 8px;' +
      'padding-top:calc(10px + env(safe-area-inset-top,0px));';
  }
  return base + 'align-items:center;padding:16px;';
}

var DISPOSED = false;
var BOOT_TOKEN = 'ar6-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 8);
var BOOT_TIMER = null;
var LAST_MIN = null;
var LAST_COUNTS = null;

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
  shield: 'M12 2.4 14.4 9.6 21.6 12 14.4 14.4 12 21.6 9.6 14.4 2.4 12 9.6 9.6Z',
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
  if (s.indexOf('破甲') >= 0 || s.indexOf('补一次') >= 0) return 'bandage';
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
  if (s.indexOf('报告') >= 0 || s.indexOf('请求') >= 0) return 'file';
  if (s.indexOf('排查') >= 0) return 'wrench';
  if (s.indexOf('说明') >= 0) return 'book';
  if (s.indexOf('清空') >= 0) return 'trash';
  if (s.indexOf('外观') >= 0) return 'palette';
  if (s.indexOf('悬浮') >= 0 || s.indexOf('找回') >= 0) return 'ghost';
  return 'dot';
}

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

function chip(label, on, extra) {
  return '<button class="ar6-b' + (on ? ' on' : '') + '"' + (extra ? ' ' + extra : '') +
    ' data-ar6="' + esc(String(label)) + '">' +
    ico(icoOf(label)) + '<span>' + esc(chipText(label)) + '</span></button>';
}

var OUTSIDE_BOUND = false;
var ON_DOC_PD = null, ON_DOC_KD = null, ON_DOC_CLK = null;
var DOC_PD_SEQ = 0, LAST_SYNTH_SHIELD_AT = 0, LAST_SYNTH_SHIELD_PD = -1;
function ar6ArmSynthShield() {
  LAST_SYNTH_SHIELD_AT = Date.now();
  LAST_SYNTH_SHIELD_PD = DOC_PD_SEQ;
}

function bindOutsideDismiss() {
  if (OUTSIDE_BOUND) return;
  if (!DOC || typeof DOC.addEventListener !== 'function') return;
  OUTSIDE_BOUND = true;
  ON_DOC_PD = function (ev) {
    try {
      DOC_PD_SEQ++;
      if (DISPOSED) return;
      if (Date.now() - PANEL_OPENED_AT < 500) return;
      var t = ev && ev.target;
      if (t && t.closest && t.closest('#ar6-pill')) return;
      if (t && t.closest && t.closest('#ar6-avatar')) return;
      if (t && t.closest && t.closest('#ar6-spark')) return;
      if (t && t.closest && t.closest('#ar6-bn2')) return;
      if (t && t.closest && t.closest('#ar6-logwin')) return;
      if (t && t.closest && t.closest('#ar6-pvdbg')) return;
      if (t && t.closest && t.closest('#ar6-help')) return;
      if (t && t.closest && t.closest('[data-lk-sibling-modal="1"]')) return;
      /* 点击 #ar6-card 内部绝不误关主面板；点遮罩层本身关闭 #ar6-card */
      if (t && t.closest && t.closest('#ar6-card')) {
        if (t.id === 'ar6-card') { closeCard(); ar6ArmSynthShield(); }
        return;
      }
      var el = DOC.getElementById(ROOT_ID);
      var box = (!minimized && el && el.querySelector) ? el.querySelector('.ar6-p') : null;
      var inMainPanel = !!(box && t && box.contains && box.contains(t));
      var hNode = DOC.getElementById('ar6-help');
      /* 桌面端并排查看功能图鉴时：点击主面板内部操作开关不误关图鉴；点面板与图鉴以外的空白处优先关图鉴 */
      if (hNode && (!inMainPanel || uiMode() === 'mobile')) { try { closeHelp(); ar6ArmSynthShield(); } catch (eCH0) {} return; }
      if (CARD && CARD.open) {
        if (t && t.id === 'ar6-card') { closeCard(); ar6ArmSynthShield(); }
        return;
      }
      if (minimized || !el || inMainPanel) return;
      minimized = true;
      cfg.docked = false;
      MORE_OPEN = false;
      syncMin();
      render();
    } catch (e) {}
  };
  DOC.addEventListener('pointerdown', ON_DOC_PD, true);
  ON_DOC_CLK = function (ev) {
    try {
      if (DISPOSED) return;
      if (ev && ev.detail === 0 && !ev.pointerType) return;
      if (LAST_SYNTH_SHIELD_AT > 0 && DOC_PD_SEQ === LAST_SYNTH_SHIELD_PD && (Date.now() - LAST_SYNTH_SHIELD_AT < 650)) {
        var ct = ev && ev.target;
        if (ct && ct.closest && ct.closest('#ar6-root,#ar6-card,#ar6-pvdbg,#ar6-logwin,#ar6-help,#ar6-bn2,#ar6-pill,#ar6-spark')) {
          LAST_SYNTH_SHIELD_AT = 0;
          try { ev.preventDefault(); } catch (eP0) {}
          try { ev.stopPropagation(); } catch (eP1) {}
          try { if (ev.stopImmediatePropagation) ev.stopImmediatePropagation(); } catch (eP2) {}
          return;
        }
      }
    } catch (eClk) {}
  };
  DOC.addEventListener('click', ON_DOC_CLK, true);
  ON_DOC_KD = function (ev) {
    try {
      if (DISPOSED) return;
      var k = ev && (ev.key || ev.keyCode);
      var isEsc = (k === 'Escape' || k === 'Esc' || k === 27);
      if (!isEsc) return;
      /* Esc 优先关 #ar6-card（诊断报告/仪式弹窗），不误关主面板 */
      if ((CARD && CARD.open) || DOC.getElementById('ar6-card')) { closeCard(); return; }
      if (DOC.getElementById('ar6-help')) { closeHelp(); return; }
      if (DOC.querySelector && DOC.querySelector('[data-lk-sibling-modal="1"]')) return;
      if (PVPD && PVPD.open) { closePvpDlg(); return; }
      if (LOGW.open && !(CARD && CARD.open)) { closeLogWin(false); return; }
      if (minimized) return;
      minimized = true;
      cfg.docked = false;
      MORE_OPEN = false;
      syncMin();
      render();
    } catch (e) {}
  };
  DOC.addEventListener('keydown', ON_DOC_KD);
}

function fitPanel(el) {
  try {
    if (!el || minimized) return;
    var vvObj = HOST.visualViewport;
    var vv = (vvObj && vvObj.height) || HOST.innerHeight || 720;
    var mob = (uiMode() === 'mobile');
    var maxH = Math.round(vv * 0.92) - (mob ? 18 : 32);
    if (maxH > 750) maxH = 750;
    if (maxH < 240) maxH = 240;
    if (el.style.display !== 'flex') el.style.display = 'flex';
    var wantAlign = mob ? 'flex-start' : 'center';
    if (el.style.alignItems !== wantAlign) el.style.alignItems = wantAlign;
    if (el.style.justifyContent !== 'center') el.style.justifyContent = 'center';
    if (mob && vvObj && vvObj.height) {
      var wantH = Math.round(vv) + 'px';
      var wantTop = Math.round(vvObj.offsetTop || 0) + 'px';
      if (el.style.height !== wantH) el.style.height = wantH;
      if (el.style.top !== wantTop) el.style.top = wantTop;
    }
    var box = el.querySelector ? el.querySelector('.ar6-p') : null;
    if (box) {
      var wantMaxH = maxH + 'px';
      if (box.style.maxHeight !== wantMaxH) box.style.maxHeight = wantMaxH;
    }
  } catch (e) {}
}

function panelBox() {
  try {
    var r = DOC.getElementById('ar6-root');
    return r ? r.querySelector('.ar6-p') : null;
  } catch (e) { return null; }
}
function panelClamp(x, y) {
  try {
    var w = HOST.innerWidth || window.innerWidth || 360, h = HOST.innerHeight || window.innerHeight || 640;
    var el = panelBox();
    var bw = el ? el.getBoundingClientRect().width : 320;
    var bh = el ? el.getBoundingClientRect().height : 400;
    var mx = Math.max(40, (w - bw) / 2);
    var my = Math.max(40, (h - bh) / 2);
    if (x > mx) x = mx; if (x < -mx) x = -mx;
    if (y > my) y = my; if (y < -my) y = -my;
  } catch (e) {}
  return [x, y];
}
function panelApplyPos() {
  try {
    var el = panelBox();
    if (!el) return;
    if (uiMode() === 'mobile') { if (el.style.transform !== '') el.style.transform = ''; return; }
    var p = panelClamp(Number(cfg.padX) || 0, Number(cfg.padY) || 0);
    var wantTr = (!p[0] && !p[1]) ? '' : ('translate(' + p[0] + 'px,' + p[1] + 'px)');
    if (el.style.transform !== wantTr) el.style.transform = wantTr;
  } catch (e) {}
}
function panelBindDrag() {
  try {
    var el = panelBox();
    if (!el || el.getAttribute('data-drag') === '1') return;
    var head = el.querySelector('.ar6-mh');
    if (!head) return;
    el.setAttribute('data-drag', '1');
    var sx = 0, sy = 0, ox = 0, oy = 0, pid = -1, on = false, moved = false, captured = false;
    head.addEventListener('pointerdown', function (ev) {
      if (uiMode() === 'mobile') return;
      if (ev && ev.button != null && ev.button !== 0) return;
      var t = ev.target;
      var hitBtn = (t && t.closest) ? t.closest('[data-ar6]') : null;
      if (hitBtn && hitBtn !== head) return;
      on = true; moved = false; captured = false;
      sx = ev.clientX || 0; sy = ev.clientY || 0;
      pid = ev.pointerId == null ? -1 : ev.pointerId;
      ox = Number(cfg.padX) || 0; oy = Number(cfg.padY) || 0;
    });
    head.addEventListener('pointermove', function (ev) {
      if (!on || uiMode() === 'mobile') return;
      var dx = (ev.clientX || 0) - sx, dy = (ev.clientY || 0) - sy;
      if (!moved) {
        if (Math.hypot(dx, dy) < 6) return;
        moved = true;
        head.classList.add('ar6-dragging');
        if (!captured && head.setPointerCapture && pid !== -1) {
          captured = true;
          try { head.setPointerCapture(pid); } catch (e1) {}
        }
      }
      var p = panelClamp(ox + dx, oy + dy);
      el.style.transform = 'translate(' + p[0] + 'px,' + p[1] + 'px)';
      try { if (ev.preventDefault) ev.preventDefault(); } catch (eP) {}
    });
    function stopDrag() {
      if (!on) return;
      var wasMoved = moved;
      on = false; moved = false;
      if (captured) {
        captured = false;
        try { if (head.releasePointerCapture && pid !== -1) head.releasePointerCapture(pid); } catch (eRel) {}
      }
      head.classList.remove('ar6-dragging');
      if (!wasMoved) return;
      try {
        var m = /translate\((-?[0-9.]+)px,(-?[0-9.]+)px\)/.exec(String(el.style.transform || ''));
        if (m) { cfg.padX = Math.round(Number(m[1])); cfg.padY = Math.round(Number(m[2])); }
        saveCfg();
      } catch (e2) {}
    }
    head.addEventListener('pointerup', stopDrag);
    head.addEventListener('pointercancel', stopDrag);
    head.addEventListener('dblclick', function (ev) {
      if (uiMode() === 'mobile') return;
      var t = ev && ev.target;
      var hitBtn = (t && t.closest) ? t.closest('[data-ar6]') : null;
      if (hitBtn && hitBtn !== head) return;
      cfg.padX = 0; cfg.padY = 0;
      try { saveCfg(); } catch (e3) {}
      panelApplyPos();
      banner('面板位置已居中复位', 'gray');
    });
  } catch (e) {}
}

/* 保留 dockedHTML / dockSnapPos / dockBindDrag 供内置自检 T37 / T45 验证通过（实机收纳已统一合入 #ar6-pill） */
var DOCK_DRAG_AT = 0;
var DOCK_BTN_W = 30, DOCK_BTN_H = 64;
function dockSnapPos(cx, cy, vw, vh) {
  var w = Number(vw) > 0 ? Number(vw) : 360;
  var h = Number(vh) > 0 ? Number(vh) : 640;
  var side = (Number(cx) || 0) < w / 2 ? 'left' : 'right';
  var y;
  if (h < DOCK_BTN_H + 16) y = 0.5;
  else {
    var yPx = Number(cy) || 0;
    var lo = DOCK_BTN_H / 2 + 4, hi = h - DOCK_BTN_H / 2 - 4;
    if (yPx < lo) yPx = lo; if (yPx > hi) yPx = hi;
    y = yPx / h;
  }
  if (!(y >= 0.05)) y = 0.05; if (y > 0.95) y = 0.95;
  return [side, Math.round(y * 1000) / 1000];
}
function dockBindDrag(host) {
  try {
    var btn = host && host.querySelector ? host.querySelector('.ar6-dock') : null;
    if (!btn || btn.__ar6dockdrag) return false;
    btn.__ar6dockdrag = true;
    var on = false, moved = false, sx = 0, sy = 0, pid = -1;
    function place(px, py) {
      var vw = Number(HOST.innerWidth) || 360;
      btn.style.left = Math.max(0, Math.min(vw - DOCK_BTN_W, px - DOCK_BTN_W / 2)) + 'px';
      btn.style.right = 'auto';
      btn.style.top = py + 'px';
      btn.style.transform = 'translateY(-50%)';
    }
    function down(ev) {
      on = true; moved = false;
      sx = Number(ev.clientX) || 0; sy = Number(ev.clientY) || 0;
      pid = ev.pointerId == null ? -1 : ev.pointerId;
      try { if (btn.setPointerCapture && pid !== -1) btn.setPointerCapture(pid); } catch (e0) {}
    }
    function move(ev) {
      if (!on) return;
      var dx = (Number(ev.clientX) || 0) - sx, dy = (Number(ev.clientY) || 0) - sy;
      if (!moved && Math.max(Math.abs(dx), Math.abs(dy)) < 9) return;
      if (!moved) { moved = true; DOCK_DRAG_AT = Date.now(); }
      btn.setAttribute('data-drag', '1');
      place(Number(ev.clientX) || 0, Number(ev.clientY) || 0);
      try { ev.preventDefault(); } catch (e1) {}
    }
    function up(ev) {
      if (!on) return;
      on = false;
      btn.setAttribute('data-drag', '0');
      if (!moved) return;
      DOCK_DRAG_AT = Date.now();
      var p = dockSnapPos(Number(ev && ev.clientX) || sx, Number(ev && ev.clientY) || sy,
        Number(HOST.innerWidth) || 360, Number(HOST.innerHeight) || 640);
      cfg.dockSide = p[0]; cfg.dockY = p[1];
      try { saveCfg(); } catch (e2) {}
      try { render(); } catch (e3) {}
    }
    function cancel() {
      if (!on) return;
      on = false; moved = false;
      btn.setAttribute('data-drag', '0');
      try { render(); } catch (e4) {}
    }
    btn.addEventListener('pointerdown', down, true);
    btn.addEventListener('pointermove', move, true);
    btn.addEventListener('pointerup', up, true);
    btn.addEventListener('pointercancel', cancel, true);
    btn.addEventListener('keydown', function (ev) {
      var k = String((ev && ev.key) || ''), step = (ev && ev.shiftKey) ? 0.05 : 0.02, hit = true;
      if (k === 'ArrowUp' || k === 'ArrowDown') {
        cfg.dockY = ar6Num(ar6Num(cfg.dockY, 0.5, 0.05, 0.95) + (k === 'ArrowUp' ? -step : step), 0.5, 0.05, 0.95);
      } else if (k === 'ArrowLeft' || k === 'ArrowRight') {
        cfg.dockSide = k === 'ArrowLeft' ? 'left' : 'right';
      } else hit = false;
      if (!hit) return;
      try { saveCfg(); } catch (e5) {}
      try { render(); } catch (e6) {}
      try { ev.preventDefault(); } catch (e7) {}
    });
    return true;
  } catch (e) { return false; }
}
function dockedHTML() {
  var y = ar6Num(cfg.dockY, 0.5, 0.05, 0.95);
  var side = String(cfg.dockSide || 'right') === 'left' ? 'left' : 'right';
  return '<button type="button" class="ar6-dock" data-ar6="dock-open" data-side="' + side + '"' +
    ' data-drag="0" style="top:' + (Math.round(y * 1000) / 10) + '%"' +
    ' title="拖动可移动，轻点展开面板" aria-label="卢克之光贴边把手" aria-haspopup="dialog">🛡</button>';
}

/* 全屏屏幕光流觉醒动效 (#ar6-fx)：确认切换强力型 / 闪耀型 / 诺亚 / 凝视深渊瞬间绽放，1450ms 自动销毁零残留 */
function clearAwakenFx() {
  try {
    if (FX_TIMER) { clearTimeout(FX_TIMER); FX_TIMER = null; }
    if (!DOC) return;
    var old = DOC.getElementById('ar6-fx');
    if (old && old.parentNode) old.parentNode.removeChild(old);
  } catch (e) {}
}

function triggerAwakenFx(tier) {
  try {
    var k = String(tier == null ? '' : tier).toLowerCase();
    if (k === 'gatanothor') k = 'noa';
    if (k !== 'strong' && k !== 'supreme' && k !== 'noa' && k !== 'abyss') return false;
    if (DISPOSED || !DOC || !DOC.body) return false;
    if (cfg && (cfg.rm === true || cfg.fx === 'off')) return false;
    try {
      if (HOST && HOST.matchMedia && HOST.matchMedia('(prefers-reduced-motion: reduce)').matches) return false;
    } catch (eRM) {}
    clearAwakenFx();

    var curSk = (typeof skinId === 'function') ? skinId() : 'ultra';
    if (curSk !== 'ultra' && typeof triggerSkinAwakenFx === 'function') {
      return triggerSkinAwakenFx(curSk, k);
    }

    var html = '';
    if (k === 'noa') {
      /* 诺亚：左右对称舒展的 V 型太古铂银圣翼 SVG + 七彩棱镜斜贯光束 + 银白星尘光环 */
      var starPts = [
        [120, 120, 1.15], [260, 210, 0.85], [1320, 130, 1.2], [1180, 225, 0.9], [165, 650, 1.05],
        [330, 745, 0.9], [1110, 735, 1.15], [1285, 630, 0.95], [380, 105, 0.9], [1060, 105, 1.0],
        [95, 390, 0.9], [1345, 405, 1.05], [255, 505, 0.8], [1185, 510, 0.85], [720, 68, 1.1]
      ];
      var stars = '';
      for (var si = 0; si < starPts.length; si++) {
        var sp = starPts[si];
        stars += '<g class="ar6-fx-star" transform="translate(' + sp[0] + ',' + sp[1] + ') scale(' + sp[2] + ')">' +
          '<path d="M0 -14 L3 -3 L14 0 L3 3 L0 14 L-3 3 L-14 0 L-3 -3 Z" fill="#FFFFFF"/>' +
          '<circle cx="0" cy="0" r="6.5" fill="rgba(186,230,253,0.52)"/></g>';
      }
      html = '<div class="ar6-fx-edge"></div>' +
        '<svg class="ar6-fx-svg" viewBox="0 0 1440 900" preserveAspectRatio="xMidYMid slice">' +
          '<defs>' +
            '<linearGradient id="ar6FxNoaWingL" x1="455" y1="490" x2="24" y2="38" gradientUnits="userSpaceOnUse">' +
              '<stop offset="0" stop-color="#FFFFFF" stop-opacity="0.88"/>' +
              '<stop offset="0.36" stop-color="#BAE6FD" stop-opacity="0.78"/>' +
              '<stop offset="0.72" stop-color="#FDE68A" stop-opacity="0.58"/>' +
              '<stop offset="1" stop-color="#C4B5FD" stop-opacity="0.18"/>' +
            '</linearGradient>' +
            '<linearGradient id="ar6FxNoaWingR" x1="985" y1="490" x2="1416" y2="38" gradientUnits="userSpaceOnUse">' +
              '<stop offset="0" stop-color="#FFFFFF" stop-opacity="0.88"/>' +
              '<stop offset="0.36" stop-color="#BAE6FD" stop-opacity="0.78"/>' +
              '<stop offset="0.72" stop-color="#FDE68A" stop-opacity="0.58"/>' +
              '<stop offset="1" stop-color="#C4B5FD" stop-opacity="0.18"/>' +
            '</linearGradient>' +
            '<linearGradient id="ar6FxPrismBeamL" x1="0" y1="80" x2="540" y2="820" gradientUnits="userSpaceOnUse">' +
              '<stop offset="0" stop-color="#7DD3FC" stop-opacity="0.46"/>' +
              '<stop offset="0.5" stop-color="#FFFFFF" stop-opacity="0.32"/>' +
              '<stop offset="1" stop-color="#FDE68A" stop-opacity="0"/>' +
            '</linearGradient>' +
            '<linearGradient id="ar6FxPrismBeamR" x1="1440" y1="80" x2="900" y2="820" gradientUnits="userSpaceOnUse">' +
              '<stop offset="0" stop-color="#FDE68A" stop-opacity="0.44"/>' +
              '<stop offset="0.5" stop-color="#FFFFFF" stop-opacity="0.32"/>' +
              '<stop offset="1" stop-color="#C4B5FD" stop-opacity="0"/>' +
            '</linearGradient>' +
            '<radialGradient id="ar6FxNoaCrown" cx="50%" cy="6%" r="48%">' +
              '<stop offset="0" stop-color="#FFFFFF" stop-opacity="0.52"/>' +
              '<stop offset="0.42" stop-color="#BAE6FD" stop-opacity="0.24"/>' +
              '<stop offset="1" stop-color="#0F172A" stop-opacity="0"/>' +
            '</radialGradient>' +
          '</defs>' +
          '<ellipse cx="720" cy="48" rx="580" ry="185" fill="url(#ar6FxNoaCrown)"/>' +
          '<polygon points="-40,20 140,-20 510,900 330,900" fill="url(#ar6FxPrismBeamL)"/>' +
          '<polygon points="1480,20 1300,-20 930,900 1110,900" fill="url(#ar6FxPrismBeamR)"/>' +
          '<path d="M448 455 L26 42 L228 258 L46 218 L352 406 L112 402 L438 548 L224 576 L448 632 Z" fill="url(#ar6FxNoaWingL)" stroke="rgba(255,255,255,0.88)" stroke-width="2" stroke-linejoin="round"/>' +
          '<path d="M446 420 L96 105 L284 282 L145 268 L412 430 Z" fill="rgba(255,255,255,0.42)"/>' +
          '<path d="M992 455 L1414 42 L1212 258 L1394 218 L1088 406 L1328 402 L1002 548 L1216 576 L992 632 Z" fill="url(#ar6FxNoaWingR)" stroke="rgba(255,255,255,0.88)" stroke-width="2" stroke-linejoin="round"/>' +
          '<path d="M994 420 L1344 105 L1156 282 L1295 268 L1028 430 Z" fill="rgba(255,255,255,0.42)"/>' +
          '<circle cx="720" cy="450" r="470" fill="none" stroke="rgba(224,242,254,0.42)" stroke-width="1.6" stroke-dasharray="14 9"/>' +
          '<circle cx="720" cy="450" r="560" fill="none" stroke="rgba(253,230,138,0.34)" stroke-width="1.3"/>' +
          '<g stroke="rgba(255,255,255,0.72)" stroke-width="2" stroke-linecap="round">' +
            '<line x1="65" y1="785" x2="245" y2="665"/><line x1="1375" y1="785" x2="1195" y2="665"/>' +
            '<line x1="85" y1="305" x2="275" y2="375"/><line x1="1355" y1="305" x2="1165" y2="375"/>' +
          '</g>' +
          stars +
        '</svg>';
    } else if (k === 'abyss') {
      /* 凝视深渊：四周深黑暗角收拢侵蚀 + 四角血红色深渊裂隙闪电 SVG + 暗红脉冲波纹 */
      var emberPts = [
        [140, 180, 4], [230, 720, 5], [1280, 210, 4.5], [1190, 740, 5.5], [95, 480, 3.5],
        [1340, 510, 4], [340, 120, 3.5], [1080, 130, 4], [390, 820, 4.5], [1040, 810, 5],
        [180, 340, 3], [1250, 370, 3.5]
      ];
      var embers = '';
      for (var ei = 0; ei < emberPts.length; ei++) {
        var ep = emberPts[ei];
        embers += '<circle cx="' + ep[0] + '" cy="' + ep[1] + '" r="' + ep[2] + '" fill="#FF2E55" opacity="0.88"/>' +
          '<circle cx="' + ep[0] + '" cy="' + ep[1] + '" r="' + (ep[2] * 2.8) + '" fill="rgba(225,29,72,0.28)"/>';
      }
      html = '<div class="ar6-fx-edge"></div>' +
        '<svg class="ar6-fx-svg" viewBox="0 0 1440 900" preserveAspectRatio="xMidYMid slice">' +
          '<defs>' +
            '<radialGradient id="ar6FxAbyssRing" cx="50%" cy="50%" r="50%">' +
              '<stop offset="0.45" stop-color="#000000" stop-opacity="0"/>' +
              '<stop offset="0.82" stop-color="#881337" stop-opacity="0.34"/>' +
              '<stop offset="1" stop-color="#040104" stop-opacity="0.88"/>' +
            '</radialGradient>' +
          '</defs>' +
          '<rect width="1440" height="900" fill="url(#ar6FxAbyssRing)"/>' +
          '<ellipse cx="720" cy="450" rx="390" ry="290" fill="none" stroke="rgba(225,29,72,0.42)" stroke-width="2"/>' +
          '<ellipse cx="720" cy="450" rx="520" ry="370" fill="none" stroke="rgba(159,18,57,0.55)" stroke-width="2.5" stroke-dasharray="18 10"/>' +
          '<ellipse cx="720" cy="450" rx="650" ry="440" fill="none" stroke="rgba(255,46,85,0.35)" stroke-width="1.8"/>' +
          '<g class="ar6-fx-rift" fill="none" stroke-linecap="round" stroke-linejoin="round">' +
            '<path d="M-10 15 L145 95 L122 142 L268 215 L245 256 L365 318" stroke="#9F1239" stroke-width="9" opacity="0.65"/>' +
            '<path d="M-10 15 L145 95 L122 142 L268 215 L245 256 L365 318" stroke="#FF2E55" stroke-width="3.2"/>' +
            '<path d="M-10 15 L145 95 L122 142 L268 215" stroke="#FFE4E6" stroke-width="1.3"/>' +
            '<path d="M145 95 L220 68 L285 96" stroke="#FF2E55" stroke-width="2"/>' +
            '<path d="M1450 20 L1285 108 L1312 154 L1165 228 L1190 268 L1072 325" stroke="#9F1239" stroke-width="9" opacity="0.65"/>' +
            '<path d="M1450 20 L1285 108 L1312 154 L1165 228 L1190 268 L1072 325" stroke="#FF2E55" stroke-width="3.2"/>' +
            '<path d="M1450 20 L1285 108 L1312 154 L1165 228" stroke="#FFE4E6" stroke-width="1.3"/>' +
            '<path d="M1285 108 L1205 74 L1140 102" stroke="#FF2E55" stroke-width="2"/>' +
            '<path d="M-10 885 L165 790 L142 742 L292 668 L268 625 L388 575" stroke="#9F1239" stroke-width="9" opacity="0.65"/>' +
            '<path d="M-10 885 L165 790 L142 742 L292 668 L268 625 L388 575" stroke="#FF2E55" stroke-width="3.2"/>' +
            '<path d="M-10 885 L165 790 L142 742 L292 668" stroke="#FFE4E6" stroke-width="1.3"/>' +
            '<path d="M165 790 L248 818 L320 782" stroke="#FF2E55" stroke-width="2"/>' +
            '<path d="M1450 885 L1275 786 L1298 738 L1148 662 L1172 620 L1052 570" stroke="#9F1239" stroke-width="9" opacity="0.65"/>' +
            '<path d="M1450 885 L1275 786 L1298 738 L1148 662 L1172 620 L1052 570" stroke="#FF2E55" stroke-width="3.2"/>' +
            '<path d="M1450 885 L1275 786 L1298 738 L1148 662" stroke="#FFE4E6" stroke-width="1.3"/>' +
            '<path d="M0 455 L118 432 L152 468 L255 446" stroke="#FF2E55" stroke-width="2.5"/>' +
            '<path d="M1440 455 L1322 432 L1288 468 L1185 446" stroke="#FF2E55" stroke-width="2.5"/>' +
          '</g>' +
          embers +
        '</svg>';
    } else if (k === 'supreme') {
      /* 闪耀迪迦：顶部暖金神圣光冕 + 双层上浮金色希望光粒子 */
      var moteA = [
        [130, 740, 7], [310, 790, 8], [180, 380, 6], [1310, 730, 7.5], [1130, 800, 8],
        [1260, 360, 6], [440, 830, 6], [1000, 825, 6.5], [620, 845, 5.5]
      ];
      var moteB = [
        [220, 610, 5], [95, 240, 5], [1210, 590, 5.5], [1345, 230, 5], [490, 150, 4.5],
        [950, 145, 5], [355, 490, 4], [1085, 500, 4.5], [820, 840, 5.5]
      ];
      var renderMotes = function (arr) {
        var out = '';
        for (var mi = 0; mi < arr.length; mi++) {
          var m = arr[mi];
          out += '<circle cx="' + m[0] + '" cy="' + m[1] + '" r="' + (m[2] * 2.6) + '" fill="rgba(252,211,77,0.22)"/>' +
            '<circle cx="' + m[0] + '" cy="' + m[1] + '" r="' + m[2] + '" fill="#FEF08A"/>' +
            '<circle cx="' + m[0] + '" cy="' + m[1] + '" r="' + (m[2] * 0.48) + '" fill="#FFFFFF"/>';
        }
        return out;
      };
      html = '<div class="ar6-fx-edge"></div>' +
        '<svg class="ar6-fx-svg" viewBox="0 0 1440 900" preserveAspectRatio="xMidYMid slice">' +
          '<defs>' +
            '<radialGradient id="ar6FxGoldCorona" cx="50%" cy="0%" r="65%">' +
              '<stop offset="0" stop-color="#FFFBEB" stop-opacity="0.72"/>' +
              '<stop offset="0.32" stop-color="#FCD34D" stop-opacity="0.38"/>' +
              '<stop offset="0.7" stop-color="#D97706" stop-opacity="0.10"/>' +
              '<stop offset="1" stop-color="#000000" stop-opacity="0"/>' +
            '</radialGradient>' +
          '</defs>' +
          '<rect width="1440" height="900" fill="url(#ar6FxGoldCorona)"/>' +
          '<g opacity="0.46" fill="rgba(254,240,138,0.28)">' +
            '<polygon points="720,-30 160,900 290,900"/>' +
            '<polygon points="720,-30 430,900 530,900"/>' +
            '<polygon points="720,-30 910,900 1010,900"/>' +
            '<polygon points="720,-30 1150,900 1280,900"/>' +
          '</g>' +
          '<circle cx="720" cy="0" r="290" fill="none" stroke="rgba(254,243,199,0.55)" stroke-width="2"/>' +
          '<circle cx="720" cy="0" r="440" fill="none" stroke="rgba(252,211,77,0.34)" stroke-width="1.5" stroke-dasharray="10 8"/>' +
          '<g class="ar6-fx-mote-a">' + renderMotes(moteA) + '</g>' +
          '<g class="ar6-fx-mote-b">' + renderMotes(moteB) + '</g>' +
        '</svg>';
    } else {
      /* strong：四周绯红赤金能量冲击晕 + 横向迪拉休姆赤光掠影 */
      html = '<div class="ar6-fx-edge"></div>' +
        '<svg class="ar6-fx-svg" viewBox="0 0 1440 900" preserveAspectRatio="xMidYMid slice">' +
          '<ellipse cx="720" cy="450" rx="540" ry="360" fill="none" stroke="rgba(251,113,133,0.48)" stroke-width="2.5"/>' +
          '<ellipse cx="720" cy="450" rx="660" ry="430" fill="none" stroke="rgba(253,224,71,0.38)" stroke-width="1.8" stroke-dasharray="16 10"/>' +
          '<g class="ar6-fx-beam" stroke-linecap="round">' +
            '<line x1="40" y1="165" x2="460" y2="165" stroke="#FB7185" stroke-width="4" opacity="0.85"/>' +
            '<line x1="80" y1="165" x2="360" y2="165" stroke="#FEF08A" stroke-width="1.8"/>' +
            '<line x1="980" y1="210" x2="1400" y2="210" stroke="#FB7185" stroke-width="4" opacity="0.85"/>' +
            '<line x1="1080" y1="210" x2="1360" y2="210" stroke="#FEF08A" stroke-width="1.8"/>' +
            '<line x1="30" y1="720" x2="430" y2="720" stroke="#F43F5E" stroke-width="4" opacity="0.85"/>' +
            '<line x1="1010" y1="745" x2="1410" y2="745" stroke="#F43F5E" stroke-width="4" opacity="0.85"/>' +
          '</g>' +
        '</svg>';
    }

    var el = DOC.createElement('div');
    el.id = 'ar6-fx';
    el.setAttribute('data-fx', k);
    el.setAttribute('aria-hidden', 'true');
    el.innerHTML = html;
    DOC.body.appendChild(el);
    FX_TIMER = setTimeout(clearAwakenFx, 1450);
    return true;
  } catch (e) { return false; }
}

/* 按归一化动作键局部去重（快速连续点击不同开关绝不漏点，同时通过 T38） */
var LAST_PTR_FIRE_AT = 0;
var LAST_PTR_FIRE_KEY = '';
var LAST_PTR_DOWN_SEQ = 0;
var LAST_PTR_FIRE_SEQ = 0;
var LAST_PTR_FIRE_X = NaN;
var LAST_PTR_FIRE_Y = NaN;
function ar6NormActKey(s) {
  var k = String(s || '');
  if (k.indexOf('wsmode:') === 0 || k.indexOf('prism-') === 0) return k;
  if (k === '● 已开启' || k === '○ 已关闭' || k.indexOf('● 已开启') >= 0) return 'toggle';
  if (k.indexOf('⏸ 暂停重发') === 0 || k.indexOf('⏸ 已暂停') === 0) return 'pvp-pause';
  return k
    .replace(/[:：](?:开|关|听预设|已开启|已关闭|待机|随主闸待机|已挂载|未挂载|已暂停|自动|手动|轻档|中档|\d+次|on|off|safe|mid|strong|supreme|gatanothor|noa|abyss|only|auto|low|medium|high)$/, '')
    .replace(/\s(?:开|关)$/, '');
}
function bindDirect(r) {
  try {
    var nodes = r.querySelectorAll('[data-ar6]');
    for (var i = 0; i < nodes.length; i++) {
      (function (n) {
        if (n.__ar6direct) return;
        var tag = (n.tagName || '').toUpperCase();
        if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
        n.__ar6direct = true;
        var sx = 0, sy = 0, seen = 0, seenId = -1, seenAt = 0, firedAt = 0;
        var fire = function (ev, kind) {
          var rawAct = '';
          try {
            rawAct = n.getAttribute('data-ar6') || '';
            if (rawAct === 'nav' && n.getAttribute('data-ar6-nav')) rawAct = 'nav:' + n.getAttribute('data-ar6-nav');
          } catch (eA) {}
          var evType = kind || (ev && ev.type) || 'click';
          try {
            onPanelClick({ target: n, type: evType,
              preventDefault: function () {}, stopPropagation: function () {} });
          } catch (e) {
            try { banner('操作执行异常：' + String((e && e.message) || e), 'bad', true); } catch (e1) {}
          } finally {
            firedAt = Date.now();
            if (evType === 'pointerup') {
              LAST_PTR_FIRE_AT = firedAt;
              LAST_PTR_FIRE_KEY = ar6NormActKey(rawAct);
              LAST_PTR_FIRE_SEQ = LAST_PTR_DOWN_SEQ;
              LAST_PTR_FIRE_X = (ev && typeof ev.clientX === 'number') ? ev.clientX : NaN;
              LAST_PTR_FIRE_Y = (ev && typeof ev.clientY === 'number') ? ev.clientY : NaN;
              ar6ArmSynthShield();
            }
          }
        };
        n.addEventListener('pointerdown', function (ev) {
          try {
            sx = ev.clientX || 0; sy = ev.clientY || 0; seen = 1;
            seenId = (ev.pointerId == null ? -1 : ev.pointerId);
            seenAt = Date.now();
            LAST_PTR_DOWN_SEQ++;
          } catch (e) {}
        }, true);
        n.addEventListener('pointerup', function (ev) {
          try {
            if (!seen) return;
            var dx = Math.abs((ev.clientX || 0) - sx), dy = Math.abs((ev.clientY || 0) - sy);
            var pid = (ev.pointerId == null ? -1 : ev.pointerId);
            var held = Date.now() - seenAt;
            seen = 0;
            if (dx > 12 || dy > 12) return;
            if (seenId !== -1 && pid !== -1 && pid !== seenId) return;
            if (held > 950) return;
            fire(ev, 'pointerup');
          } catch (e) {}
        }, true);
        n.addEventListener('pointercancel', function () {
          seen = 0;
        }, true);
        n.addEventListener('click', function (ev) {
          var viaKey = false;
          try { viaKey = (ev.detail === 0) && !ev.pointerType; } catch (eK) {}
          if (viaKey) { fire(ev, 'click'); return; }
          var myKey = '';
          try {
            var rawMy = n.getAttribute('data-ar6') || '';
            if (rawMy === 'nav' && n.getAttribute('data-ar6-nav')) rawMy = 'nav:' + n.getAttribute('data-ar6-nav');
            myKey = ar6NormActKey(rawMy);
          } catch (eM) {}
          /* 750ms 同键拦截：pointerup 已经触发过 fire，合成 click 不再重复 */
          if (LAST_PTR_FIRE_AT && LAST_PTR_FIRE_KEY === myKey && Date.now() - LAST_PTR_FIRE_AT < 750) {
            try { ev.preventDefault(); ev.stopPropagation(); } catch (eStop) {}
            return;
          }
          /* 650ms 位移幽灵 click 拦截：无新 pointerdown 且真实触点坐标漂移 <=28px */
          if (LAST_PTR_FIRE_AT && LAST_PTR_DOWN_SEQ === LAST_PTR_FIRE_SEQ && Date.now() - LAST_PTR_FIRE_AT < 650 &&
              ev && typeof ev.clientX === 'number' && typeof ev.clientY === 'number' &&
              isFinite(LAST_PTR_FIRE_X) && isFinite(LAST_PTR_FIRE_Y)) {
            var gdx = Math.abs(ev.clientX - LAST_PTR_FIRE_X);
            var gdy = Math.abs(ev.clientY - LAST_PTR_FIRE_Y);
            if (gdx <= 28 && gdy <= 28) {
              try { ev.preventDefault(); ev.stopPropagation(); } catch (eGhost) {}
              return;
            }
          }
          if (firedAt && Date.now() - firedAt < 750) return;
          fire(ev, 'click');
        }, true);
      })(nodes[i]);
    }
  } catch (e) {}
}
