/* patch_v826.cjs — v8.26：修「碰一下面板按钮被快速切换几十次」 */
const fs = require('fs');
const path = require('path');
const S = (f) => path.join(__dirname, f);
let n = 0;
function rep(file, anchor, next) {
  const p = S(file); let s = fs.readFileSync(p, 'utf8');
  const c = s.split(anchor).length - 1;
  if (c !== 1) throw new Error('count=' + c + ' :: ' + file + ' :: ' + anchor.slice(0, 50));
  fs.writeFileSync(p, s.replace(anchor, next)); n++; console.log('  ok ' + file);
}

rep('1_core.js', "var VERSION = '8.25.0';", "var VERSION = '8.26.0';");
rep('1_core.js', '  v: 825,', '  v: 826,');
rep('1_core.js', 's.v !== 825', 's.v !== 826');

/* 1) 指针：记录 pointerId 与按下时刻；抬起时只认同一根手指、且按住 <900ms */
rep('4_ui.js', '        var sx = 0, sy = 0, seen = 0;',
  '        var sx = 0, sy = 0, seen = 0, seenId = -1, seenAt = 0;');
rep('4_ui.js',
`        n.addEventListener('pointerdown', function (ev) {
          try { sx = ev.clientX || 0; sy = ev.clientY || 0; seen = 1; } catch (e) {}
        }, true);`,
`        n.addEventListener('pointerdown', function (ev) {
          try {
            sx = ev.clientX || 0; sy = ev.clientY || 0; seen = 1;
            seenId = (ev.pointerId == null ? -1 : ev.pointerId);
            seenAt = Date.now();
          } catch (e) {}
        }, true);`);
rep('4_ui.js',
`            if (!seen) return;
            var dx = Math.abs((ev.clientX || 0) - sx), dy = Math.abs((ev.clientY || 0) - sy);
            seen = 0;
            if (dx > 8 || dy > 8) return;   /* 滑动起手不触发按钮 */
            fire(ev);`,
`            if (!seen) return;
            var dx = Math.abs((ev.clientX || 0) - sx), dy = Math.abs((ev.clientY || 0) - sy);
            var pid = (ev.pointerId == null ? -1 : ev.pointerId);
            var held = Date.now() - seenAt;
            seen = 0;
            if (dx > 8 || dy > 8) return;                              /* 滑动起手不触发 */
            if (seenId !== -1 && pid !== -1 && pid !== seenId) return;  /* 不是同一根手指 */
            if (held > 900) return;                                     /* 长按后抬起不算点击 */
            fire(ev);`);

/* 2) 同一动作的最小间隔 + 熔断（防宿主重复派发） */
rep('4_ui.js', 'function onPanelClick(e) {',
`var ACT_GAP = {};
var ACT_FREEZE = 0;
var ACT_TRIP_AT = 0;

function onPanelClick(e) {`);
rep('4_ui.js',
`      var ty0 = (e && e.type) || 'click';
      var nowT = Date.now();
      var rec0 = ACT_TS[a0];
      if (ty0 === 'click' && rec0 && rec0.type === 'pointerdown' && nowT - rec0.ts < 600) return;
      ACT_TS[a0] = { type: ty0, ts: nowT };`,
`      var ty0 = (e && e.type) || 'click';
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
      ACT_TS[a0] = { type: ty0, ts: nowT };`);

const bp = S('../build_v8.mjs');
let bs = fs.readFileSync(bp, 'utf8');
fs.writeFileSync(bp, bs.split('8.25.0').join('8.26.0'));
console.log('\n共 ' + n + ' 处');
