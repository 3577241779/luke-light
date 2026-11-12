/* test_base.mjs — v0.82 行为基线（_src/16_base.js）回归
 * 跑法：node test_base.mjs
 * 只读源码 + 假 localStorage，不起浏览器、不碰构建产物。
 *
 * v0.82 复审后口径：
 *   - key = 渠道 + 请求名（同反代下 chat / reasoner 不共用基线）
 *   - 样本带 at 时间戳，30 天过期
 *   - 被换（diff）/ 无思考（thin）的轮次不入库，避免基线学成仿冒方
 *   - 速率分母 = total - ttft（只算出字段，不吃思考时间）
 */
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const SRC = fs.readFileSync(path.join(HERE, '_src', '16_base.js'), 'utf8');

const store = {};
let CUR = 'chA';
const sandbox = {
  cfg: { base: 'on' },
  statKey: () => CUR,
  statBase: () => CUR,
  hashStr: (s) => String(s),
  console,
  HOST: {
    localStorage: {
      getItem(k) { return Object.prototype.hasOwnProperty.call(store, k) ? store[k] : null; },
      setItem(k, v) { store[k] = String(v); },
      removeItem(k) { delete store[k]; }
    }
  }
};
vm.createContext(sandbox);
vm.runInContext(SRC, sandbox, { filename: '16_base.js' });

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
function j(v) { try { return JSON.stringify(v); } catch (e) { return String(v); } }
function all() { return JSON.parse(store['ar6.base'] || '{}'); }
function rows(k, req) {
  const key = (k || CUR) + '|' + (req || '');
  return all()[key] || [];
}
function push(over) {
  const rec = Object.assign({ ttft: 2000, total: 10000, chars: 500, think: 1 }, over || {});
  return sandbox.basePush(rec);
}
function judge(over) {
  const rec = Object.assign({ ttft: 2000, total: 10000, chars: 500, think: 1 }, over || {});
  return sandbox.baseJudge(rec);
}
function seed(n, over) { for (let i = 0; i < n; i++) push(over); }

/* ------------------------------------------------------------------ A */
group('A. 样本不足 / 正常轮不判 / 四条规则');
CUR = 'chA';
ok('A1 零样本不判', sandbox.baseJudge({ ttft: 2000, total: 10000, chars: 500, think: 1 }) === null, null, 'judged');
seed(11);
ok('A2 11 条只入库不判', rows().length === 11, 11, rows().length);
ok('A3 11 条时判为 null', judge() === null, null, j(judge()));
push();
ok('A4 满 12 条正常轮不判', judge() === null, null, j(judge()));
const jFast = judge({ ttft: 800 });
ok('A5 首字快 2.5 倍判 fast', jFast && jFast.why === 'fast', 'fast', jFast && jFast.why);
ok('A6 fast 文案提到中位', !!(jFast && jFast.line && jFast.line.indexOf('中位') >= 0), '含中位', jFast && jFast.line);
const rowFast = push({ ttft: 800 });
ok('A7 basePush 返回样本且 t=800', !!rowFast && rowFast.t === 800, 't=800', rowFast && rowFast.t);
ok('A8 落库后共 13 条', rows().length === 13, 13, rows().length);
ok('A9 本轮已落库也按「以前」判', (() => { const r = judge({ ttft: 800 }); return r && r.why === 'fast'; })(), 'fast', 'no');
ok('A10 双参调用同样可用', (() => { const r = sandbox.baseJudge({ req: 'x' }, { ttft: 800, total: 10000, chars: 500, think: 1 }); return r && r.why === 'fast'; })(), 'fast', 'no');
ok('A11 刚好 2 倍（1000ms）不判', judge({ ttft: 1000 }) === null, null, j(judge({ ttft: 1000 })));
const jRate = judge({ total: 4000 });
ok('A12 出字 2.5 倍判 rate', jRate && jRate.why === 'rate', 'rate', jRate && jRate.why);
ok('A13 rate 文案给出倍数', !!(jRate && jRate.line && jRate.line.indexOf('倍') >= 0), '含倍', jRate && jRate.line);
const jThink = judge({ think: 0 });
ok('A14 思考归零判 think', jThink && jThink.why === 'think', 'think', jThink && jThink.why);
ok('A15 think 文案说明本轮没思考', !!(jThink && jThink.line && jThink.line.indexOf('思考') >= 0), '含思考', jThink && jThink.line);
ok('A16 思考未知（null）不算归零', judge({ think: null }) === null, null, j(judge({ think: null })));
const jSlow = judge({ ttft: 7000 });
ok('A17 首字 3.5 倍判 slow', jSlow && jSlow.why === 'slow', 'slow', jSlow && jSlow.why);
ok('A18 slow 措辞温和（提到可能只是网络）', !!(jSlow && jSlow.line && jSlow.line.indexOf('慢') >= 0), '含慢', jSlow && jSlow.line);
ok('A19 正常轮始终不判', judge({ ttft: 2100 }) === null, null, j(judge({ ttft: 2100 })));
const probe = { ttft: 1900, total: 9000, chars: 600, think: 1, code: 'weak' };
const before = j(probe);
sandbox.basePush(probe);
sandbox.baseJudge(probe);
ok('A20 判定不修改轮次记录', j(probe) === before, before, j(probe));
ok('A21 不写账本键 ar7.led', !store['ar7.led'], '无', store['ar7.led']);

/* ------------------------------------------------------------------ B */
group('B. 中位本身太小时不判「快」');
CUR = 'chLow';
seed(12, { ttft: 500 });
ok('B1 低延迟渠道 12 条', rows().length === 12, 12, rows().length);
ok('B2 中位 500ms 时 100ms 也不判', judge({ ttft: 100 }) === null, null, j(judge({ ttft: 100 })));

/* ------------------------------------------------------------------ C */
group('C. 历史本来就不思考 → 不判 think');
CUR = 'chN';
seed(12, { think: 0 });
ok('C1 无思考基线 r 全为 0', rows().every((r) => r.r === 0), '全 0', j(rows().slice(0, 3)));
ok('C2 思考归零但历史也不思考，不判', judge({ think: 0 }) === null, null, j(judge({ think: 0 })));

/* ------------------------------------------------------------------ D */
group('D. 冷启动边界：11 条不判，12 条才判');
CUR = 'chB';
seed(11);
ok('D1 11 条判 null', judge({ ttft: 800 }) === null, null, j(judge({ ttft: 800 })));
push();
ok('D2 12 条判 fast', (() => { const r = judge({ ttft: 800 }); return r && r.why === 'fast'; })(), 'fast', 'no');

/* ------------------------------------------------------------------ E */
group('E. 最多 24 条，超出丢最旧');
CUR = 'chCap';
for (let i = 0; i < 30; i++) push({ ttft: 1000 + i });
const cap = rows();
ok('E1 只留 24 条', cap.length === 24, 24, cap.length);
ok('E2 最旧的是第 7 条（t=1006）', cap[0].t === 1006, 1006, cap[0].t);
ok('E3 最新的是第 30 条（t=1029）', cap[23].t === 1029, 1029, cap[23].t);
ok('E4 样本结构为 at,c,r,s,t', Object.keys(cap[0]).sort().join(',') === 'at,c,r,s,t', 'at,c,r,s,t', Object.keys(cap[0]).join(','));
ok('E5 速率 = 500 / ((10000-1006)/1000) ≈ 55.6', cap[0].s === 55.6, 55.6, cap[0].s);
ok('E6 思考标记 c=1、占比 r=1', cap[0].c === 1 && cap[0].r === 1, '1/1', cap[0].c + '/' + cap[0].r);
ok('E7 样本带时间戳', typeof cap[0].at === 'number' && cap[0].at > 0, '>0', cap[0].at);

/* ------------------------------------------------------------------ F */
group('F. 不该收的轮次一条都不收');
CUR = 'chRej';
ok('F1 chars<50 不收', push({ chars: 49 }) === null, null, '收下');
ok('F2 ttft=0 不收', push({ ttft: 0 }) === null, null, '收下');
ok('F3 total=0 不收', push({ total: 0 }) === null, null, '收下');
ok('F4 internal 请求不收', push({ internal: true }) === null, null, '收下');
ok('F5 被拒轮次没写进存储', rows().length === 0, 0, rows().length);

/* ------------------------------------------------------------------ G */
group('G. 关闸（cfg.base !== on）不写不判');
CUR = 'chA';
sandbox.cfg.base = 'off';
ok('G1 关闸时命中样本也不判', judge({ ttft: 800 }) === null, null, j(judge({ ttft: 800 })));
ok('G2 关闸时 basePush 返回 null', push({ ttft: 777 }) === null, null, '写了');
ok('G3 关闸时存储不新增渠道', rows('chA').length === 14, 14, rows('chA').length);
sandbox.cfg.base = 'on';
ok('G4 开闸后恢复判定', (() => { const r = judge({ ttft: 800 }); return r && r.why === 'fast'; })(), 'fast', 'no');

/* ------------------------------------------------------------------ H */
group('H. 不同渠道互不污染');
CUR = 'chA';
const onA = judge({ ttft: 200 });
CUR = 'chLow';
const onLow = judge({ ttft: 200 });
ok('H1 同一轮在正常渠道判 fast', onA && onA.why === 'fast', 'fast', onA && onA.why);
ok('H2 同一轮在低延迟渠道不判', onLow === null, null, j(onLow));
ok('H3 渠道各存一份', rows('chA').length === 14 && rows('chLow').length === 12, '14/12', rows('chA').length + '/' + rows('chLow').length);
ok('H4 关闸渠道没被创建', !all()['chOff|'] && !all()['chRej|'], '无', Object.keys(all()).join(','));

/* ------------------------------------------------------------------ I */
group('I. 被换 / 无思考的轮次不入库（防基线自我投毒）');
CUR = 'chPoison';
seed(12);
ok('I1 12 条正常样本', rows().length === 12, 12, rows().length);
ok('I2 diff 轮次不收', push({ code: 'diff', ttft: 300 }) === null, null, '收下');
ok('I3 thin 轮次不收', push({ code: 'thin', think: 0 }) === null, null, '收下');
ok('I4 仍只有 12 条', rows().length === 12, 12, rows().length);
ok('I5 思考基线没被 thin 拉成 0', (() => {
  const r = judge({ think: 0 });
  return r && r.why === 'think';
})(), 'think', '未命中');

/* ------------------------------------------------------------------ J */
group('J. 同一渠道不同请求名分开记');
CUR = 'chA';
for (let i = 0; i < 12; i++) push({ req: 'gemini-3.1-pro', think: 1 });
ok('J1 请求名进了 key', rows('chA', 'gemini-3.1-pro').length === 12, 12, rows('chA', 'gemini-3.1-pro').length);
ok('J2 未带请求名的样本不受影响', rows('chA', '').length === 14, 14, rows('chA', '').length);
sandbox.basePush({ req: 'gemini-3.1-flash', ttft: 2000, total: 10000, chars: 500, think: 0 });
ok('J3 另一条模型不会污染 pro 的思考基线', (() => {
  const r = sandbox.baseJudge({ req: 'gemini-3.1-pro', ttft: 2000, total: 10000, chars: 500, think: 0 });
  return r && r.why === 'think';
})(), 'think', '未命中');

/* ------------------------------------------------------------------ K */
group('K. 过期样本不参与判定');
CUR = 'chOld';
const raw = [];
for (let i = 0; i < 13; i++) raw.push({ t: 2000, s: 62.5, c: 1, r: 1, at: Date.now() - 40 * 24 * 3600 * 1000 });
store['ar6.base'] = JSON.stringify({ 'chOld|': raw });
ok('K1 40 天前的样本全部过期 → 不判', judge({ ttft: 800 }) === null, null, j(judge({ ttft: 800 })));
store['ar6.base'] = JSON.stringify({ 'chOld|': raw.map((r) => Object.assign({}, r, { at: Date.now() })) });
ok('K2 时间刷新后重新可用', (() => { const r = judge({ ttft: 800 }); return r && r.why === 'fast'; })(), 'fast', 'no');

/* ------------------------------------------------------------------ L */
group('L. 判定与入库同一道门槛');
CUR = 'chGate';
seed(13);
ok('L1 字数不够的轮次不参与判定', judge({ chars: 49, ttft: 100 }) === null, null, j(judge({ chars: 49, ttft: 100 })));
ok('L2 内部请求不参与判定', judge({ internal: true, ttft: 100 }) === null, null, j(judge({ internal: true, ttft: 100 })));

/* ------------------------------------------------------------------ M */
group('M. 优先级：思考归零排在速率之前');
CUR = 'chOrd';
seed(13);
const jBoth = judge({ think: 0, total: 3000 });
ok('M1 同时命中 think 与 rate 时报 think', jBoth && jBoth.why === 'think', 'think', jBoth && jBoth.why);

console.log('\n=== ' + pass + ' passed, ' + fail + ' failed ===');
if (fail) {
  console.log('失败项：' + failures.join(' / '));
  process.exit(1);
}
