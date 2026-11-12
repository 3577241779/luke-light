/* test_shape.mjs — 结构指纹（_src/17_shape.js）离线测试
   跑法：node test_shape.mjs   （全绿退出码 0，有红退出码 1）
   不加载 3_net.js / 4_ui.js：只把 16_base.js 和 17_shape.js 塞进同一个 vm，
   给一个假的 localStorage + PEEKS + 计数器版 ledAdd。 */
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const SRC_BASE = fs.readFileSync(path.join(HERE, '_src', '16_base.js'), 'utf8');
const SRC_SHAPE = fs.readFileSync(path.join(HERE, '_src', '17_shape.js'), 'utf8');

let pass = 0;
let fail = 0;
function ok(name, cond, expect, actual) {
  if (cond) {
    pass++;
    console.log('  \u2713 ' + name);
  } else {
    fail++;
    console.log('  \u2717 ' + name);
    if (expect !== undefined) {
      console.log('      期望: ' + j(expect));
      console.log('      实际: ' + j(actual));
    }
  }
}
function j(v) {
  try { return JSON.stringify(v); } catch (e) { return String(v); }
}
function group(t) { console.log('\n【' + t + '】'); }

/* ---------------- vm 沙盘 ---------------- */
const store = {};
let CUR = 'chA';
const PEEKS = {};
let ledCalls = 0;
const sandbox = {
  cfg: { base: 'on', shape: 'on' },
  statKey: () => CUR,
  statBase: () => CUR,
  hashStr: (s) => String(s),
  PEEKS,
  ledAdd: () => { ledCalls++; },
  console,
  HOST: {
    localStorage: {
      getItem: (k) => (Object.prototype.hasOwnProperty.call(store, k) ? store[k] : null),
      setItem: (k, v) => { store[k] = String(v); },
      removeItem: (k) => { delete store[k]; }
    }
  }
};
vm.createContext(sandbox);
vm.runInContext(SRC_BASE, sandbox, { filename: '16_base.js' });
vm.runInContext(SRC_SHAPE, sandbox, { filename: '17_shape.js' });

/* ---------------- 小工具 ---------------- */
const DAY = 24 * 3600 * 1000;
let RID = 1000;

function peek(over) {
  return Object.assign({
    at: Date.now(), textChars: 40, hasText: true, model: 'm',
    modelVersion: 'v2', thoughts: 12, reasoning: null,
    out: 30, prompt: 100, finish: 'STOP', raw: '', done: true
  }, over || {});
}
/* peekOver 传 null = 这一轮没有 PEEK */
function mk(recOver, peekOver) {
  const r = Object.assign({ req: '', base: '' }, recOver || {});
  r.rid = ++RID;
  if (peekOver !== null) PEEKS[r.rid] = peek(peekOver);
  return r;
}
function all() { return JSON.parse(store['ar6.shape'] || '{}'); }
function rows(req, base) { return all()[(base || CUR) + '|' + (req || '')] || []; }
function push(r) { return sandbox.shapePush(r); }
function judge(r) { return sandbox.shapeJudge(r); }
function sig(recOver, peekOver) { return sandbox.shapeSig(mk(recOver, peekOver)); }
function parts(s) { return String(s).split('|'); }
function seed(n, recOver, peekOver) {
  const r = mk(recOver, peekOver);
  for (let i = 0; i < n; i++) push(r);
  return r;
}
function putArr(key, arr) {
  const o = all();
  o[key] = arr;
  store['ar6.shape'] = JSON.stringify(o);
}

/* 一组标准样本：u1 + out/prompt/thoughts + t1 + v1 + STOP */
const STD = { thoughts: 12, reasoning: null, out: 30, prompt: 100, modelVersion: 'v2', finish: 'STOP' };
/* 同渠道但少思考字段：u1 + out/prompt + t0 + v1 + STOP */
const NO_THINK = { thoughts: null, reasoning: null, out: 30, prompt: 100, modelVersion: 'v2', finish: 'STOP' };

/* ==================================================================== */
group('A 指纹计算');
{
  ok('A1 没有 PEEK → 空串', sandbox.shapeSig(mk({}, null)) === '', "''", sandbox.shapeSig(mk({}, null)));
  ok('A2 没有 PEEK 时不抛错（rid 缺失）', sandbox.shapeSig({}) === '', "''", sandbox.shapeSig({}));

  const bare = sig({}, { thoughts: null, reasoning: null, out: null, prompt: null, modelVersion: '', finish: '' });
  ok('A3 什么都没有 → u0| |t0|v0|', bare === 'u0||t0|v0|', 'u0||t0|v0|', bare);

  const u1 = sig({}, { usage: { prompt_tokens: 12, completion_tokens: 4 } });
  ok('A4 usage 是对象 → u1', parts(u1)[0] === 'u1', 'u1', parts(u1)[0]);
  ok('A5 usage 键排序后连接', parts(u1)[1] === 'completion_tokens,prompt_tokens', 'completion_tokens,prompt_tokens', parts(u1)[1]);

  const oA = sig({}, { usage: { beta: 1, alpha: 2, gamma: 3 } });
  const oB = sig({}, { usage: { gamma: 3, alpha: 2, beta: 1 } });
  ok('A6 键序不同但指纹一致', oA === oB, oA, oB);
  ok('A7 排序结果 = a,b,c', parts(oA)[1] === 'alpha,beta,gamma', 'alpha,beta,gamma', parts(oA)[1]);

  const many = sig({}, { usage: { h: 8, g: 7, f: 6, e: 5, d: 4, c: 3, b: 2, a: 1 } });
  ok('A8 键集最多取 6 个', parts(many)[1] === 'a,b,c,d,e,f', 'a,b,c,d,e,f', parts(many)[1]);

  const t1 = sig({}, { usage: { reasoning_tokens: 5, prompt_tokens: 1 } });
  ok('A9 reasoning_tokens → t1', parts(t1)[2] === 't1', 't1', parts(t1)[2]);
  const t0 = sig({}, { usage: { prompt_tokens: 1, completion_tokens: 2 } });
  ok('A10 无思考键 → t0', parts(t0)[2] === 't0', 't0', parts(t0)[2]);

  const syn = sig({}, { thoughts: 0, reasoning: null, out: 5, prompt: 9, modelVersion: '', finish: '' });
  ok('A11 absorbPeek 真形状 → 拼出 usage', parts(syn)[0] === 'u1', 'u1', parts(syn)[0]);
  ok('A12 拼出的键集排序正确', parts(syn)[1] === 'out,prompt,thoughts', 'out,prompt,thoughts', parts(syn)[1]);
  ok('A13 thoughts 视为思考字段（0 也算有）', parts(syn)[2] === 't1', 't1', parts(syn)[2]);

  const syn2 = sig({}, { thoughts: null, reasoning: null, out: null, prompt: null, modelVersion: '', finish: '' });
  ok('A14 四个计数全空 → u0', parts(syn2)[0] === 'u0', 'u0', parts(syn2)[0]);

  const v1 = sig({}, { modelVersion: 'gemini-2.5-pro' });
  ok('A15 modelVersion 非空 → v1', parts(v1)[3] === 'v1', 'v1', parts(v1)[3]);
  const v0 = sig({}, { modelVersion: '' });
  ok('A16 modelVersion 空 → v0', parts(v0)[3] === 'v0', 'v0', parts(v0)[3]);

  const f = sig({}, { finish: 'MAX_TOKENS' });
  ok('A17 finish 原样进第 5 段', parts(f)[4] === 'MAX_TOKENS', 'MAX_TOKENS', parts(f)[4]);

  const full = sig({}, STD);
  ok('A18 整串恰好 5 段', parts(full).length === 5, 5, parts(full).length);
  ok('A19 标准样本整串', full === 'u1|out,prompt,thoughts|t1|v1|STOP', 'u1|out,prompt,thoughts|t1|v1|STOP', full);

  const arr = sig({}, { usage: [], thoughts: null, reasoning: null, out: null, prompt: null });
  ok('A20 usage 是数组不算数', parts(arr)[0] === 'u0', 'u0', parts(arr)[0]);

  const weird = mk({}, null);
  PEEKS[weird.rid] = 'not-an-object';
  ok('A21 PEEK 不是对象 → 空串', sandbox.shapeSig(weird) === '', "''", sandbox.shapeSig(weird));
}

/* ==================================================================== */
group('B 冷启动 / 上限');
{
  CUR = 'chB';
  const hist = seed(7, {}, STD);
  ok('B1 7 条历史照写入', rows('').length === 7, 7, rows('').length);

  const cur = mk({}, NO_THINK);
  ok('B2 7 条历史不判', judge(cur) === null, null, judge(cur));

  push(hist);
  ok('B3 第 8 条落库', rows('').length === 8, 8, rows('').length);
  const hit = judge(mk({}, NO_THINK));
  ok('B4 8 条历史开始判', !!hit && hit.why === 'shape', 'shape', hit && hit.why);

  CUR = 'chB2';
  const cap = mk({ req: 'cap' }, Object.assign({}, STD, { finish: 'F0' }));
  for (let i = 0; i < 30; i++) {
    PEEKS[cap.rid].finish = 'F' + i;
    push(cap);
  }
  const capRows = rows('cap');
  ok('B5 每 key 最多 24 条', capRows.length === 24, 24, capRows.length);
  ok('B6 超出丢最旧（第一条是 F6）', parts(capRows[0].sig)[4] === 'F6', 'F6', parts(capRows[0].sig)[4]);
  ok('B7 最新一条是 F29', parts(capRows[23].sig)[4] === 'F29', 'F29', parts(capRows[23].sig)[4]);
  ok('B8 每行只有 sig/at', Object.keys(capRows[0]).sort().join(',') === 'at,sig', 'at,sig', Object.keys(capRows[0]).sort().join(','));
}

/* ==================================================================== */
group('C 命中与差异描述');
{
  CUR = 'chC1';
  seed(8, {}, STD);
  const cur = mk({}, NO_THINK);
  const res = judge(cur);
  ok('C1 整串没见过 → 判出', !!res && res.why === 'shape', 'shape', res && res.why);
  ok('C2 稳定历史用肯定措辞', !!res && res.line.indexOf('完全一样') >= 0, true, res && res.line);
  ok('C3 差异描述只报思考字段', !!res && res.line.indexOf('思考') >= 0, true, res && res.line);
  ok('C4 不把整串 sig 甩给用户', !!res && res.line.indexOf(sandbox.shapeSig(cur)) < 0, true, res && res.line);
  ok('C5 line 里没有 u1| 原始片段', !!res && res.line.indexOf('u1|') < 0, true, res && res.line);

  ok('C6 老 sig 不判', judge(mk({}, STD)) === null, null, judge(mk({}, STD)));
  ok('C7 shapeLine 和 judge.line 一致', sandbox.shapeLine(mk({}, NO_THINK)) === (judge(mk({}, NO_THINK)) || {}).line, 'same', sandbox.shapeLine(mk({}, NO_THINK)));

  CUR = 'chC2';
  seed(8, {}, { usage: { prompt_tokens: 10, completion_tokens: 5 }, thoughts: null, reasoning: null, out: null, prompt: null, modelVersion: 'v2', finish: 'STOP' });
  const rU = judge(mk({}, { usage: null, thoughts: null, reasoning: null, out: null, prompt: null, modelVersion: 'v2', finish: 'STOP' }));
  ok('C8 usage 有无不同 → 提 usage', !!rU && rU.line.indexOf('usage') >= 0, true, rU && rU.line);

  CUR = 'chC3';
  seed(8, {}, STD);
  const rV = judge(mk({}, { modelVersion: '' }));
  ok('C9 modelVersion 不同 → 提 modelVersion', !!rV && rV.line.indexOf('modelVersion') >= 0, true, rV && rV.line);

  CUR = 'chC4';
  seed(8, {}, STD);
  const rF = judge(mk({}, { finish: 'MAX_TOKENS' }));
  ok('C10 finish 不同 → 提 finish', !!rF && rF.line.indexOf('finish') >= 0, true, rF && rF.line);

  CUR = 'chC5';
  seed(4, {}, STD);
  seed(4, {}, Object.assign({}, STD, { finish: 'MAX_TOKENS' }));
  const rMix = judge(mk({}, { modelVersion: '', finish: 'STOP' }));
  ok('C11 历史不唯一 → 也说判出', !!rMix && rMix.why === 'shape', 'shape', rMix && rMix.why);
  ok('C12 历史不唯一用保留措辞', !!rMix && rMix.line.indexOf('完全一样') < 0, true, rMix && rMix.line);
  ok('C13 不唯一时含「不一样」', !!rMix && rMix.line.indexOf('不一样') >= 0, true, rMix && rMix.line);

  CUR = 'chC6';
  seed(8, {}, { usage: { reasoning_tokens: 5, prompt_tokens: 1 }, thoughts: null, reasoning: null, out: null, prompt: null, modelVersion: 'v2', finish: 'STOP' });
  const rT = judge(mk({}, { thoughts: null, reasoning: null, out: null, prompt: null, modelVersion: 'v2', finish: 'STOP' }));
  ok('C14 t 优先于 u：只报思考字段', !!rT && rT.line.indexOf('思考') >= 0 && rT.line.indexOf('usage') < 0, true, rT && rT.line);
}

/* ==================================================================== */
group('D 关闸');
{
  CUR = 'chD';
  seed(8, {}, STD);
  sandbox.cfg.shape = 'off';
  ok('D1 shapeOn 关闸为 false', sandbox.shapeOn() === false, false, sandbox.shapeOn());

  const rNew = mk({}, { finish: 'MAX_TOKENS' });
  ok('D2 关闸时 push 返回 null', push(rNew) === null, null, push(rNew));
  ok('D3 关闸时 push 不写存储', rows('').length === 8, 8, rows('').length);
  ok('D4 关闸时 judge 返回 null', judge(mk({}, { finish: 'MAX_TOKENS' })) === null, null, judge(mk({}, { finish: 'MAX_TOKENS' })));

  sandbox.cfg.shape = 'on';
  ok('D5 开闸后 shapeOn 为 true', sandbox.shapeOn() === true, true, sandbox.shapeOn());
  ok('D6 开闸后同一轮判出', !!judge(mk({}, { finish: 'MAX_TOKENS' })), 'object', judge(mk({}, { finish: 'MAX_TOKENS' })));

  sandbox.cfg.shape = 'open';
  ok('D7 只认精确的 on', sandbox.shapeOn() === false, false, sandbox.shapeOn());
  sandbox.cfg.shape = 'on';
  ok('D8 恢复后仍判出', !!judge(mk({}, { finish: 'MAX_TOKENS' })), 'object', judge(mk({}, { finish: 'MAX_TOKENS' })));
}

/* ==================================================================== */
group('E 投毒防护');
{
  CUR = 'chE';
  seed(8, {}, STD);
  const before = rows('').length;
  const rDiff = mk({ req: '', code: 'diff' }, { finish: 'MAX_TOKENS' });
  ok('E1 被换轮次不写', push(rDiff) === null, null, push(rDiff));
  const rThin = mk({ req: '', code: 'thin' }, { finish: 'MAX_TOKENS' });
  ok('E2 无思考轮次不写', push(rThin) === null, null, push(rThin));
  const rInt = mk({ req: '', internal: true }, { finish: 'MAX_TOKENS' });
  ok('E3 内部请求不写', push(rInt) === null, null, push(rInt));
  const rNo = mk({ req: '' }, null);
  ok('E4 没取到响应体不写', push(rNo) === null, null, push(rNo));
  ok('E5 四条都被挡在库外', rows('').length === before, before, rows('').length);
  ok('E6 内部请求也不判', judge(mk({ req: '', internal: true }, { finish: 'MAX_TOKENS' })) === null, null, judge(mk({ req: '', internal: true }, { finish: 'MAX_TOKENS' })));
}

/* ==================================================================== */
group('F 隔离');
{
  CUR = 'chF';
  seed(8, { req: 'pro' }, STD);
  ok('F1 pro 的样本落 pro 的 key', rows('pro').length === 8, 8, rows('pro').length);
  ok('F2 flash 的 key 还是空的', rows('flash').length === 0, 0, rows('flash').length);
  ok('F3 换请求名不共享历史', judge(mk({ req: 'flash' }, NO_THINK)) === null, null, judge(mk({ req: 'flash' }, NO_THINK)));
  ok('F4 原请求名照常判出', !!judge(mk({ req: 'pro' }, NO_THINK)), 'object', judge(mk({ req: 'pro' }, NO_THINK)));

  seed(8, { base: 'chG', req: 'x' }, STD);
  ok('F5 不同渠道分开存', rows('x', 'chG').length === 8, 8, rows('x', 'chG').length);
  const keys = Object.keys(all());
  ok('F6 两个 key 同时存在', keys.indexOf('chF|pro') >= 0 && keys.indexOf('chG|x') >= 0, 'both', keys.join(','));
  ok('F7 不带渠道时看不到 chG 的历史', judge(mk({ req: 'x' }, NO_THINK)) === null, null, judge(mk({ req: 'x' }, NO_THINK)));
  ok('F8 带渠道时照常判出', !!judge(mk({ base: 'chG', req: 'x' }, NO_THINK)), 'object', judge(mk({ base: 'chG', req: 'x' }, NO_THINK)));
}

/* ==================================================================== */
group('G 过期');
{
  const now = Date.now();
  const sA = sig({ req: 'old' }, STD);

  CUR = 'chG1';
  putArr('chG1|old', Array.from({ length: 8 }, () => ({ sig: sA, at: now - 31 * DAY })));
  ok('G1 31 天前的样本不算历史', judge(mk({ req: 'old' }, { finish: 'MAX_TOKENS' })) === null, null, judge(mk({ req: 'old' }, { finish: 'MAX_TOKENS' })));

  CUR = 'chG2';
  putArr('chG2|old', Array.from({ length: 8 }, () => ({ sig: sA, at: now - 29 * DAY })));
  ok('G2 29 天前的样本还能用', !!judge(mk({ req: 'old' }, { finish: 'MAX_TOKENS' })), 'object', judge(mk({ req: 'old' }, { finish: 'MAX_TOKENS' })));

  CUR = 'chG3';
  const mixed = [];
  for (let i = 0; i < 7; i++) mixed.push({ sig: sA, at: now - 1000 });
  mixed.push({ sig: sA, at: now - 40 * DAY });
  putArr('chG3|mix', mixed);
  ok('G3 7 新 + 1 旧 → 样本不足', judge(mk({ req: 'mix' }, { finish: 'MAX_TOKENS' })) === null, null, judge(mk({ req: 'mix' }, { finish: 'MAX_TOKENS' })));

  putArr('chG3|mix', Array.from({ length: 8 }, () => ({ sig: sA, at: now - 1000 })));
  ok('G4 补满 8 条新样本 → 判出', !!judge(mk({ req: 'mix' }, { finish: 'MAX_TOKENS' })), 'object', judge(mk({ req: 'mix' }, { finish: 'MAX_TOKENS' })));
}

/* ==================================================================== */
group('H 只提示');
{
  CUR = 'chH';
  seed(8, {}, STD);
  const r = mk({ code: 'same' }, NO_THINK);
  const codeBefore = r.code;
  const recBefore = JSON.stringify(r);
  const storeBefore = store['ar6.shape'];
  const cfgBefore = JSON.stringify(sandbox.cfg);
  const peekBefore = JSON.stringify(PEEKS);
  const ledBefore = ledCalls;
  const res = judge(r);

  ok('H1 rec.code 没被改', r.code === codeBefore, codeBefore, r.code);
  ok('H2 账本函数没被调用', ledCalls === ledBefore, 0, ledCalls - ledBefore);
  ok('H3 判定不写存储', store['ar6.shape'] === storeBefore, 'unchanged', 'changed');
  ok('H4 rec 一个字段都没动', JSON.stringify(r) === recBefore, recBefore, JSON.stringify(r));
  ok('H5 返回值只有 why/line', !!res && Object.keys(res).sort().join(',') === 'line,why', 'line,why', res && Object.keys(res).sort().join(','));
  ok('H6 配置没被判定改', JSON.stringify(sandbox.cfg) === cfgBefore, cfgBefore, JSON.stringify(sandbox.cfg));
  ok('H7 PEEKS 没被判定改', JSON.stringify(PEEKS) === peekBefore, 'unchanged', 'changed');

  push(mk({}, NO_THINK));
  ok('H8 入库也不写账本', ledCalls === ledBefore, ledBefore, ledCalls);
}

/* ==================================================================== */
group('I ES5 源码检查');
{
  ok('I1 没有箭头函数 =>', SRC_SHAPE.indexOf('=>') < 0, 'none', SRC_SHAPE.indexOf('=>'));
  ok('I2 没有 const ', /\bconst\s/.test(SRC_SHAPE) === false, 'none', (SRC_SHAPE.match(/\bconst\s/g) || []).length);
  ok('I3 没有 let ', /\blet\s/.test(SRC_SHAPE) === false, 'none', (SRC_SHAPE.match(/\blet\s/g) || []).length);
  ok('I4 没有模板字符串反引号', SRC_SHAPE.indexOf('`') < 0, 'none', SRC_SHAPE.indexOf('`'));
  ok('I5 没有 async', /\basync\b/.test(SRC_SHAPE) === false, 'none', (SRC_SHAPE.match(/\basync\b/g) || []).length);
  ok('I6 没有 await', /\bawait\b/.test(SRC_SHAPE) === false, 'none', (SRC_SHAPE.match(/\bawait\b/g) || []).length);
  ok('I7 没有 class', /\bclass\s/.test(SRC_SHAPE) === false, 'none', (SRC_SHAPE.match(/\bclass\s/g) || []).length);
  ok('I8 确实用 var 声明', SRC_SHAPE.indexOf('var ') >= 0, true, SRC_SHAPE.indexOf('var ') >= 0);
}

/* ==================================================================== */
const total = pass + fail;
console.log('\n=== ' + total + ' checks: ' + pass + ' passed, ' + fail + ' failed ===');
if (fail) process.exit(1);
