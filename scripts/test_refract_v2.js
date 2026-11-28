'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const bundlePath = path.join(__dirname, '..', 'dist', 'luke-light-st.json');
const pkg = JSON.parse(fs.readFileSync(bundlePath, 'utf8'));

let pass = 0, fail = 0;
function ok(name, cond, detail) {
  if (cond) { pass++; console.log('  [PASS]', name); }
  else { fail++; console.error('  [FAIL]', name, detail || ''); }
}

function makeEnv() {
  const ls = {};
  const win = {
    location: { href: 'http://localhost:8000/' },
    localStorage: {
      getItem: (k) => (Object.prototype.hasOwnProperty.call(ls, k) ? ls[k] : null),
      setItem: (k, v) => { ls[k] = String(v); },
      removeItem: (k) => { delete ls[k]; },
    },
    console,
    navigator: { userAgent: 'Mozilla/5.0' },
    innerWidth: 400,
    innerHeight: 800,
    setTimeout: () => 0,
    clearTimeout: () => {},
    setInterval: () => 0,
    clearInterval: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    matchMedia: () => ({ matches: false }),
    URL: URL,
    crypto: require('crypto').webcrypto,
    document: {
      body: {
        appendChild: () => {},
        classList: { contains: () => false },
        contains: () => false,
      },
      head: { appendChild: () => {} },
      documentElement: { clientWidth: 400, clientHeight: 800 },
      getElementById: () => null,
      querySelector: () => null,
      querySelectorAll: () => [],
      createElement: () => ({
        setAttribute: () => {},
        appendChild: () => {},
        addEventListener: () => {},
        querySelector: () => null,
        querySelectorAll: () => [],
        style: {},
      }),
      createTextNode: () => ({}),
      addEventListener: () => {},
      removeEventListener: () => {},
    },
    fetch: () => Promise.resolve({ ok: true, status: 200, text: () => Promise.resolve('{}') }),
  };
  win.window = win;
  win.top = win;
  win.parent = win;
  win.globalThis = win;
  const ctx = vm.createContext(win);
  vm.runInContext(pkg.content, ctx, { filename: 'luke-light-v574.js' });
  return { win, api: win.__AR6__ };
}

const { api } = makeEnv();

console.log('\n=== Refract v2 专项测试（V7.0） ===');
ok('VERSION 为 7.0', api.VERSION === '7.0', api.VERSION);

const sampleSystem = [
  '# 角色与叙事规则',
  '',
  '必须遵守以下格式要求，严格保持人物一致性。',
  '',
  '- 首先，描写应当细腻真实。',
  '- 其次，此外，不得越权替主角做决定。',
  '- 因此，请按时间顺序推进剧情。',
  '',
  '```js',
  '// 代码块绝对不能被微扰改动',
  'const keep = "此外，因此，必须保留";',
  '```',
  '',
  '<!-- 用户自己的注释不能被误删 -->',
  '',
  '> 例如，在对话中保持角色口吻。',
  '',
  '最后，{{user}} 的台词“此外，不要动引号里的内容”必须原封不动。'
].join('\n');

const sampleSys2 = [
  '## 场景与格式准则',
  '',
  '务必严格执行以下输出规范，不可省略。',
  '',
  '1. 同时，保持环境描写自然。',
  '2. 然而，切忌重复相同动作模板。',
  '3. 换言之，让情节自然发展。',
  '',
  '总之，保持高质量长文输出。'
].join('\n');

function makeReqBody() {
  return JSON.stringify({
    model: 'gemini-2.5-pro',
    messages: [
      { role: 'system', content: sampleSystem },
      { role: 'system', content: sampleSys2 },
      { role: 'user', content: '你好，开始第一章。' }
    ]
  });
}

// 1. 重档 heavy + 四轨微扰
api.setCfg('enabled', true);
api.setCfg('refract', 'heavy');
api.setCfg('refractMode', 'stable');
api.setCfg('refractSeed', '');
const s1 = api.refractRollSuite('test1');
ok('refractRollSuite 生成 XXXX-XXXX 可读套号', /^[2-9A-HJ-NP-Z]{4}-[2-9A-HJ-NP-Z]{4}$/.test(s1), s1);

const p1 = api.planRequest(makeReqBody(), 'https://proxy.example/v1/chat/completions', false);
const b1 = JSON.parse(p1.body);
const last1 = api.getLastRefract();
ok('heavy 档命中微扰并记录四轨统计', !!last1 && last1.edits > 0 && last1.tracks.R >= 1, JSON.stringify(last1));
ok('总增量严格受 HARD_TOKEN_CAP (120) 封顶', p1.added > 0 && p1.added <= 120, 'added=' + p1.added);
ok('代码块完全不受微扰污染', b1.messages[0].content.includes('const keep = "此外，因此，必须保留";'));
ok('引号台词与酒馆宏完全受保护', b1.messages[0].content.includes('{{user}} 的台词“此外，不要动引号里的内容”'));
ok('用户自带注释完全保留不被 stripArtifacts 误删', b1.messages[0].content.includes('<!-- 用户自己的注释不能被误删 -->'));
ok('块级签名与原文完全一致', api.blockSignature(b1.messages[0].content) === api.blockSignature(sampleSystem));
ok('不触发 foreignShield 外来护盾误报', api.foreignShield(b1) === 0, 'foreign=' + api.foreignShield(b1));

// 2. 同套稳缓存模式：连续两轮输出逐字节一致
const p1b = api.planRequest(makeReqBody(), 'https://proxy.example/v1/chat/completions', false);
ok('同套保缓存模式：同套号下连续两轮 system 前缀逐字节一致', JSON.parse(p1b.body).messages[0].content === b1.messages[0].content);

// 3. 换套：点一下换套立刻产生不同前缀与新随机数排列组合
const s2 = api.refractRollSuite('test2');
ok('再次换套生成不同套号', s2 !== s1, `${s1} vs ${s2}`);
const p2 = api.planRequest(makeReqBody(), 'https://proxy.example/v1/chat/completions', false);
const b2 = JSON.parse(p2.body);
ok('换套后 system 文本确实变化（成功打散前缀哈希）', b2.messages[0].content !== b1.messages[0].content);

// 4. 每轮真随机模式：不换盐连发 5 次，次次不同
api.setCfg('refractMode', 'random');
const seenSet = new Set();
for (let i = 0; i < 5; i++) {
  const pr = api.planRequest(makeReqBody(), 'https://proxy.example/v1/chat/completions', false);
  seenSet.add(JSON.parse(pr.body).messages[0].content);
}
ok('每轮真随机模式：连续 5 轮产出 5 套完全不同的排列组合', seenSet.size === 5, 'unique=' + seenSet.size);

// 5. stripArtifacts 可逆性：对重档产物反复剥离能 100% 干净移除 A/R/W 痕迹且保留用户注释
const stripped = api.stripArtifacts(b1.messages[0].content);
ok('stripArtifacts 干净剥离所有 R/A 注释行且保留用户注释',
  stripped.includes('<!-- 用户自己的注释不能被误删 -->') &&
  !/\[(?:\/\/|lk-r|r\d|~)\]:/.test(stripped) &&
  !/<!--\s*(?:ctx|ref|doc|arc|idx|seg):/.test(stripped)
);
const stripped2 = api.stripArtifacts(stripped);
ok('stripArtifacts 重复调用幂等', stripped === stripped2);

// 6. 异常自动换套（联动 finish）
api.setCfg('refractMode', 'stable');
api.setCfg('refractAutoRotate', true);
api.setCfg('onlyGemini', false);
const beforeAutoSuite = api.getCfg().refractSeed;
const evDiff = api.newEvidence('gemini-2.5-pro', 200, 'sse');
evDiff.sawText = true;
evDiff.outputChars = 300;
evDiff.observed.push('gemini-2.5-flash');
evDiff.observedSrc.push('body');
evDiff.verifiable = 'yes';
api.finish(evDiff, { base: 'https://proxy.example', changed: [] });
const afterAutoSuite = api.getCfg().refractSeed;
ok('开启异常自动换套后，监测到被换(diff)自动切换新随机套号', afterAutoSuite !== beforeAutoSuite, `${beforeAutoSuite} -> ${afterAutoSuite}`);

// 7. 面板文案与状态行
const statusLine = api.refractStatusLine();
ok('refractStatusLine 包含套号与模式信息', statusLine.includes('套号 #') && statusLine.includes('同套保缓存'), statusLine);

console.log(`\n=== Refract v2 测试完成：${pass} 通过 / ${fail} 失败 ===`);
process.exit(fail > 0 ? 1 : 0);
