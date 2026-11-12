/* test_knowtip.mjs — v0.84 防全知提示（弹窗 + 说明页）
 * 跑法：node test_knowtip.mjs
 * 一、行为：narrTipNeeded / narrNext 的三档循环（在 vm 里跑真源码）
 * 二、结构：弹窗与说明页真的有那几句话、开关真的被拦在生效之前
 */
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const rd = (p) => fs.readFileSync(path.join(HERE, p), 'utf8');

const NARR = rd('_src/12_narr.js');
const UI = rd('_src/4_ui.js');
const HELP = rd('_src/10_help.js');

const sandbox = { console };
vm.createContext(sandbox);
vm.runInContext(NARR, sandbox, { filename: '12_narr.js' });

let pass = 0;
let fail = 0;
const failures = [];
function ok(name, cond, expect, actual) {
  if (cond) { pass++; console.log('  ✓ ' + name); }
  else {
    fail++;
    failures.push(name);
    console.log('  ✗ ' + name + '  期望=' + expect + '  实际=' + actual);
  }
}
function group(t) { console.log('\n' + t); }

/* ------------------------------------------------------------------ A */
group('A. 什么时候该提醒');
ok('A1 关→轻：要提醒', sandbox.narrTipNeeded('lite', 'on') === true, true, sandbox.narrTipNeeded('lite', 'on'));
ok('A2 轻→强：要提醒', sandbox.narrTipNeeded('full', 'on') === true, true, sandbox.narrTipNeeded('full', 'on'));
ok('A3 提醒关掉后不再拦', sandbox.narrTipNeeded('full', 'off') === false, false, sandbox.narrTipNeeded('full', 'off'));
ok('A4 关掉防全知时不提醒', sandbox.narrTipNeeded('off', 'on') === false, false, sandbox.narrTipNeeded('off', 'on'));
ok('A5 旧配置没这个键时默认提醒', sandbox.narrTipNeeded('lite', undefined) === true, true, sandbox.narrTipNeeded('lite', undefined));
ok('A6 null 也当默认提醒', sandbox.narrTipNeeded('lite', null) === true, true, sandbox.narrTipNeeded('lite', null));
ok('A7 乱值不当成「已关」', sandbox.narrTipNeeded('lite', '') === true, true, sandbox.narrTipNeeded('lite', ''));

/* ------------------------------------------------------------------ B */
group('B. 三档循环没被改坏');
ok('B1 off → lite', sandbox.narrNext('off') === 'lite', 'lite', sandbox.narrNext('off'));
ok('B2 lite → full', sandbox.narrNext('lite') === 'full', 'full', sandbox.narrNext('lite'));
ok('B3 full → off', sandbox.narrNext('full') === 'off', 'off', sandbox.narrNext('full'));
ok('B4 未知值当作 off', sandbox.narrNext('xxx') === 'lite', 'lite', sandbox.narrNext('xxx'));

/* ------------------------------------------------------------------ C */
group('C. 弹窗真的存在且话说到位');
ok('C1 有 knowTipDialog', UI.indexOf('function knowTipDialog(') >= 0, '有', '无');
ok('C2 弹窗说明「不能写内心话」', UI.indexOf('不能写内心话') >= 0, '有', '无');
ok('C3 弹窗说明「不能替你决定」', UI.indexOf('也不能替你决定了') >= 0, '有', '无');
ok('C4 弹窗点明「抢话」冲突', UI.indexOf('「抢话」') >= 0, '有', '无');
ok('C5 弹窗给出「点轻别点强」的退路', UI.indexOf('点「轻」，别点「强」') >= 0, '有', '无');
ok('C6 有「知道了，打开」按钮', UI.indexOf('knowok') >= 0, '有', '无');
ok('C7 有「算了」按钮', UI.indexOf('knowno') >= 0, '有', '无');
ok('C8 有「以后不再提醒」勾选', UI.indexOf('以后不再提醒') >= 0, '有', '无');

/* ------------------------------------------------------------------ D */
group('D. 开关被拦在生效之前');
const disp = UI.slice(UI.indexOf("act.indexOf('🧭 防全知:')"));
const head = disp.slice(0, 400);
ok('D1 分派里先算下一档', head.indexOf('narrNext(cfg.know)') >= 0, '有', head.slice(0, 80));
ok('D2 需要提醒时先弹窗并 return', /narrTipNeeded\(nxKnow, cfg\.knowTip\)[\s\S]{0,60}knowTipDialog\(nxKnow\)[\s\S]{0,20}return;/.test(head), '弹窗后 return', head);
ok('D3 弹窗路径里没有先写 cfg.know', !/narrTipNeeded\(nxKnow, cfg\.knowTip\)[\s\S]{0,40}cfg\.know = nxKnow/.test(head), '未先写入', head);
ok('D4 点「算了」不改变 cfg.know', /knowno[\s\S]{0,200}return;/.test(UI), '直接返回', '无');
ok('D5 勾选后才关掉提醒', /if \(chk && chk\.checked\) cfg\.knowTip = 'off';/.test(UI), '有', '无');
ok('D6 弹窗关闭后仍会应用选择', /cfg\.know = next; saveCfg\(\); render\(\);/.test(UI), '有', '无');

/* ------------------------------------------------------------------ E */
group('E. 说明页写清楚了');
ok('E1 说明页提到「抢话」', HELP.indexOf('抢话') >= 0, '有', '无');
ok('E2 说明页写「禁止写内心话」', HELP.indexOf('禁止写内心话') >= 0, '有', '无');
ok('E3 说明页写「禁止替任何角色做决定」', HELP.indexOf('禁止替任何角色做决定') >= 0, '有', '无');
ok('E4 说明页仍保留原来的三档说明', HELP.indexOf('关 → 轻 → 强') >= 0, '有', '无');
ok('E5 说明页没有多出一个页签', (HELP.match(/k: 'narr'/g) || []).length === 1, 1, (HELP.match(/k: 'narr'/g) || []).length);

/* ------------------------------------------------------------------ F */
group('F. 提醒文案不得让破甲静默失效');
const forbidden = ['Reply directly', 'editorial system', '<Master_input>', '<content>'];
for (let i = 0; i < forbidden.length; i++) {
  ok('F' + (i + 1) + ' 不含禁词 ' + forbidden[i],
    UI.indexOf(forbidden[i]) < 0 && HELP.indexOf(forbidden[i]) < 0, '不含', '含');
}

console.log('\n=== ' + pass + ' passed, ' + fail + ' failed ===');
if (fail) {
  console.log('失败项：' + failures.join(' / '));
  process.exit(1);
}
