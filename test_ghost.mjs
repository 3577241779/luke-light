/* test_ghost.mjs — 幽灵名探针的分类（_src/5_route.js::runChannelVerify）
   跑法：node test_ghost.mjs
   只加载 5_route.js，配一个假 fetch；不发真请求、不联网。

   要钉住的事：4xx 不等于「按名分发」。
   401/403 是认证没过、402 是没钱、429 是限流、5xx 是上游挂了——
   这几种都没走到「查模型名」那一步，不能拿来当「model 字段可信」的证据。 */
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const SRC = fs.readFileSync(path.join(HERE, '_src', '5_route.js'), 'utf8');

let pass = 0, fail = 0;
function ok(name, cond, expect, actual) {
  if (cond) { pass++; console.log('  ✓ ' + name); return; }
  fail++; console.log('  ✗ ' + name);
  if (expect !== undefined) { console.log('      期望: ' + j(expect)); console.log('      实际: ' + j(actual)); }
}
function j(v) { try { return JSON.stringify(v); } catch (e) { return String(v); } }
function group(t) { console.log('\n【' + t + '】'); }

/* ---------------- 每例一个新沙盘 ---------------- */
let NEXT = { status: 200, body: '{}' };
let calls = 0;
let lastBody = null;

function makeCtx() {
  const store = {};
  const sandbox = {
    cfg: { dualBase: 'https://relay.example/v1', dualKey: '', alias: 'gemini-4-argon' },
    lastReq: { model: 'gemini-4-argon' },
    lastReqBase: function () { return sandbox.cfg.dualBase || ''; },
    HOST: {
      localStorage: {
        getItem: function (k) { return Object.prototype.hasOwnProperty.call(store, k) ? store[k] : null; },
        setItem: function (k, v) { store[k] = String(v); },
        removeItem: function (k) { delete store[k]; }
      },
      fetch: function (url, init) {
        calls++;
        lastBody = JSON.parse(init.body);
        return Promise.resolve({
          status: NEXT.status,
          text: function () { return Promise.resolve(NEXT.body); }
        });
      }
    },
    nowMs: function () { return Date.now(); },
    hashStr: function (s) {
      var h = 5381, i;
      s = String(s);
      for (i = 0; i < s.length; i++) h = ((h * 33) ^ s.charCodeAt(i)) >>> 0;
      return h.toString(36);
    },
    render: function () {},
    banner: function () {},
    openAIUrl: function (b) { return String(b).replace(/\/+$/, '') + '/chat/completions'; },
    setTimeout: setTimeout,
    clearTimeout: clearTimeout,
    Promise: Promise,
    console: console
  };
  vm.createContext(sandbox);
  vm.runInContext(SRC, sandbox, { filename: '5_route.js' });
  return sandbox;
}

async function probe(status, body) {
  NEXT = { status: status, body: body || '{}' };
  calls = 0; lastBody = null;
  const ctx = makeCtx();
  const r = await ctx.runChannelVerify();
  return { r: r, echoes: ctx.chState().echoes };
}

/* ---------------- A. 认证 / 额度：不能当作证据 ---------------- */
group('A. 401 / 403 / 402 不算「按名分发」');

let p = await probe(403, '{"error":{"message":"Invalid API key"}}');
ok('403 → why=auth', p.r.why === 'auth', 'auth', p.r.why);
ok('403 → 状态没被写成 true/false', p.echoes === null || p.echoes === undefined, null, p.echoes);

p = await probe(401, '{"error":{"message":"unauthorized"}}');
ok('401 → why=auth', p.r.why === 'auth', 'auth', p.r.why);

p = await probe(402, '{"error":{"message":"insufficient balance"}}');
ok('402 → why=quota', p.r.why === 'quota', 'quota', p.r.why);
ok('402 → 状态没被写', p.echoes === null || p.echoes === undefined, null, p.echoes);

/* ---------------- B. 真被拒：错误里提到了模型名 ---------------- */
group('B. 400/404 且错误与模型名有关 → 按名分发');

p = await probe(400, '{"error":{"message":"model gemini-4-argon-zzz-nonexistent not found"}}');
ok('400+model not found → why=rejected', p.r.why === 'rejected', 'rejected', p.r.why);
ok('400+model not found → echoes=false', p.echoes === false, false, p.echoes);

p = await probe(404, '{"error":{"message":"The model does not exist"}}');
ok('404+does not exist → why=rejected', p.r.why === 'rejected', 'rejected', p.r.why);

/* ---------------- C. 拒了但跟模型名无关：判断不了 ---------------- */
group('C. 400 但错误与模型名无关 → 不猜');

p = await probe(400, '{"error":{"message":"messages must not be empty"}}');
ok('400+无关错误 → why=unclear', p.r.why === 'unclear', 'unclear', p.r.why);
ok('400+无关错误 → 状态没被写', p.echoes === null || p.echoes === undefined, null, p.echoes);

/* ---------------- D. 200 = 回显 ---------------- */
group('D. 200 = 网关不读 model');

p = await probe(200, '{"model":"gemini-4-argon","choices":[{"message":{"content":"pong"}}]}');
ok('200 → why=echo', p.r.why === 'echo', 'echo', p.r.why);
ok('200 → echoes=true', p.echoes === true, true, p.echoes);

/* ---------------- E. 其它状态码 ---------------- */
group('E. 429 / 5xx：都不猜');

p = await probe(429, '{"error":{"message":"rate limited"}}');
ok('429 → why=unclear', p.r.why === 'unclear', 'unclear', p.r.why);

p = await probe(500, '{"error":{"message":"internal"}}');
ok('500 → why=unclear', p.r.why === 'unclear', 'unclear', p.r.why);
ok('500 → 状态没被写', p.echoes === null || p.echoes === undefined, null, p.echoes);

/* ---------------- F. 探针本身长什么样 ---------------- */
group('F. 请求体与幽灵名');

p = await probe(400, '{"error":{"message":"model not found"}}');
ok('幽灵名 = 真名 + -zzz-nonexistent', lastBody && lastBody.model === 'gemini-4-argon-zzz-nonexistent',
  'gemini-4-argon-zzz-nonexistent', lastBody && lastBody.model);
ok('只发 1 次请求', calls === 1, 1, calls);
ok('max_tokens 很小（省额度）', lastBody && lastBody.max_tokens <= 16, '<=16', lastBody && lastBody.max_tokens);
ok('stream=false（要能读错误体）', lastBody && lastBody.stream === false, false, lastBody && lastBody.stream);
ok('返回里带 ghost 名', p.r.ghost === 'gemini-4-argon-zzz-nonexistent', true, p.r.ghost);

/* ---------------- G. 没填 Base ---------------- */
group('G. 没填反代地址');

const ctx2 = makeCtx();
ctx2.cfg.dualBase = '';
calls = 0;
const r2 = await ctx2.runChannelVerify();
ok('没填 Base → ok=false 且不发请求', r2.ok === false && calls === 0, 'ok=false', j(r2));

/* ---------------- 汇总 ---------------- */
console.log('\n通过 ' + pass + ' 条，失败 ' + fail + ' 条');
if (fail > 0) process.exit(1);
