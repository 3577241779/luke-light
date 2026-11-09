/* patch_ui8.cjs — v8 UI 重做：深色玻璃主题（不动结构与 data-ar6 契约） */
const fs = require('fs');
const path = require('path');
const F = path.join(__dirname, '4_ui.js');
let s = fs.readFileSync(F, 'utf8');

const START = 'var CSS_TEXT = [';
const END = "].join('\\n');";
const i0 = s.indexOf(START);
const i1 = s.indexOf(END, i0);
if (i0 < 0 || i1 < 0) throw new Error('CSS block not found');

const css = `var CSS_TEXT = [
  '#ar6-root{font:13px/1.55 -apple-system,BlinkMacSystemFont,"Segoe UI","Microsoft YaHei",sans-serif;color:#e6edf3;--ar-line:rgba(255,255,255,.09);--ar-soft:rgba(255,255,255,.045);--ar-mut:#8b949e;--ar-acc:#58a6ff;--ar-ok:#3fb950;--ar-warn:#d29922;--ar-bad:#f85149;}',
  '#ar6-root *{box-sizing:border-box;}',
  '#ar6-root{pointer-events:auto;}',
  '.ar6-p,.ar6-pill,.ar6-b,.ar6-x{pointer-events:auto;}',
  '.ar6-p{background:linear-gradient(180deg,rgba(22,27,34,.97),rgba(13,17,23,.98));border:1px solid var(--ar-line);border-radius:16px;overflow:hidden;box-shadow:0 24px 64px rgba(0,0,0,.62),0 0 0 1px rgba(255,255,255,.03) inset;backdrop-filter:blur(12px);}',
  '.ar6-h{display:flex;align-items:center;gap:8px;padding:11px 14px;background:linear-gradient(180deg,rgba(255,255,255,.055),rgba(255,255,255,0));border-bottom:1px solid var(--ar-line);}',
  '.ar6-h b{font-size:13.5px;font-weight:650;letter-spacing:.3px;color:#f0f6fc;}',
  '.ar6-ver{font-size:10px;color:var(--ar-mut);border:1px solid var(--ar-line);border-radius:999px;padding:1px 7px;font-variant-numeric:tabular-nums;}',
  '.ar6-dot{width:8px;height:8px;border-radius:50%;background:#6e7681;flex:none;box-shadow:0 0 0 3px rgba(110,118,129,.16);}',
  '.ar6-dot.ok{background:var(--ar-ok);box-shadow:0 0 0 3px rgba(63,185,80,.18),0 0 10px rgba(63,185,80,.5);}',
  '.ar6-dot.warn{background:var(--ar-warn);box-shadow:0 0 0 3px rgba(210,153,34,.18);}',
  '.ar6-dot.bad{background:var(--ar-bad);box-shadow:0 0 0 3px rgba(248,81,73,.18),0 0 10px rgba(248,81,73,.5);}',
  '.ar6-sp{flex:1;}',
  '.ar6-x{border:0;background:transparent;font-size:15px;line-height:1;color:var(--ar-mut);cursor:pointer;padding:3px 5px;border-radius:6px;}',
  '.ar6-x:hover{color:#e6edf3;background:rgba(255,255,255,.07);}',
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
  '.ar6-b.on{background:rgba(63,185,80,.14);border-color:rgba(63,185,80,.42);color:#7ee787;}',
  '.ar6-b.warn{border-color:rgba(210,153,34,.4);background:rgba(210,153,34,.12);color:#f2cc60;}',
  '.ar6-b.danger{color:#ff7b72;border-color:rgba(248,81,73,.32);}',
  '.ar6-input{display:flex;gap:7px;padding:0 14px 10px;}',
  '.ar6-input input{flex:1;min-width:0;border:1px solid var(--ar-line);background:rgba(1,4,9,.55);color:#e6edf3;border-radius:8px;padding:6px 9px;font-size:11px;font-family:ui-monospace,Consolas,monospace;}',
  '.ar6-input input:focus{outline:none;border-color:rgba(88,166,255,.55);box-shadow:0 0 0 3px rgba(88,166,255,.14);}',
  '.ar6-tbl{padding:0 10px 10px;max-height:250px;overflow:auto;}',
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
  '.ar6-mobile .ar6-tbl{max-height:44vh;}',
  '.ar6-st .ok{color:#7ee787;}.ar6-st .bad{color:#ff7b72;}.ar6-st .warn{color:#f2cc60;}'
${END}`;

s = s.slice(0, i0) + css + s.slice(i1 + END.length);
fs.writeFileSync(F, s, 'utf8');
console.log('patched 4_ui.js (theme v8)');
