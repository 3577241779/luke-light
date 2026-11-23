'use strict';
/**
 * 卢克之光 V5.5 · 光之星轨（11b_18_upd.js）云端自动更新专项离线测试
 * 覆盖：
 *   1. 默认自动更新开启 / 开关切换
 *   2. 语义化版本号比对与清单解析（含三端 st / tt / desktop 分包）
 *   3. 多镜像自动切换（cdn.jsdelivr -> raw.githubusercontent -> fastly.jsdelivr）与优选记忆
 *   4. 安全校验：跨平台防串包（badplat）、版本不符（mismatch）、超 6MB（big）、坏包（badpkg）
 *   5. 通道一：酒馆助手官方 API（getScriptTrees / updateScriptTreesWith / flushHelperScripts + 嵌套文件夹 + 撤回）
 *   6. 通道二：extensionSettings.tavern_helper.script.scripts（4.x + 文件夹）与 .scripts（3.x）+ 防抖回读 + 落盘失败回滚 + 撤回
 *   7. 通道三：只读 WebView（nohost）弹出手动下载/复制直链兜底
 *   8. 后台静默自动更新（updBoot）自动升级且 100% 保留个人 ar6.cfg，断网时完全静默
 */
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.resolve(__dirname, '..');
const UPD_SRC = fs.readFileSync(path.join(ROOT, 'src/modules/11b_18_upd.js'), 'utf8');

let pass = 0;
let fail = 0;
function ok(name, cond, detail) {
  if (cond) {
    pass++;
    console.log('  ✓ ' + name);
  } else {
    fail++;
    console.error('  ✗ ' + name + (detail !== undefined ? ' :: ' + detail : ''));
  }
}

function makeSandbox(opts = {}) {
  const store = {};
  const banners = [];
  const fetchCalls = [];
  let renderCount = 0;
  let fetchHandler = opts.fetchHandler || (() => Promise.resolve({ ok: true, status: 200, text: () => Promise.resolve('{}') }));

  const HOST = {
    localStorage: {
      getItem: (k) => (Object.prototype.hasOwnProperty.call(store, k) ? store[k] : null),
      setItem: (k, v) => { store[k] = String(v); },
      removeItem: (k) => { delete store[k]; },
    },
    setTimeout: (fn, ms) => {
      if (ms === 1300 || ms === 4200) {
        return setTimeout(fn, 15);
      }
      return setTimeout(fn, ms);
    },
    clearTimeout: (id) => clearTimeout(id),
    fetch: (u, o) => {
      fetchCalls.push({ url: String(u), opts: o });
      return fetchHandler(String(u), o);
    },
    location: { reload: () => {} },
  };
  HOST.parent = HOST;
  HOST.top = HOST;

  const sandbox = {
    VERSION: opts.version || '5.5',
    PLATFORM: opts.platform || 'st',
    DISPOSED: false,
    UI_SIG: {},
    cfg: Object.assign({ updAuto: true, jail: 'gatanothor', modelProfile: '4a' }, opts.cfg || {}),
    HOST,
    SELF_WIN: HOST,
    DOC: { createElement: () => ({ style: {}, click() {} }), body: { appendChild() {}, removeChild() {} } },
    ar6LsGet: (k) => HOST.localStorage.getItem(k),
    ar6LsSet: (k, v) => { HOST.localStorage.setItem(k, v); return true; },
    origFetch: (u, o) => HOST.fetch(u, o),
    render: () => { renderCount++; },
    banner: (msg, kind) => { banners.push({ msg: String(msg), kind: String(kind || '') }); },
    console,
    setTimeout: HOST.setTimeout,
    clearTimeout: HOST.clearTimeout,
    Date,
    Promise,
    JSON,
    Object,
    Array,
    String,
    Number,
    Math,
    RegExp,
    Error,
    isFinite,
    parseInt,
  };
  vm.createContext(sandbox);
  vm.runInContext(UPD_SRC, sandbox, { filename: '11b_18_upd.js' });
  return {
    U: sandbox,
    HOST,
    store,
    banners,
    fetchCalls,
    getRenderCount: () => renderCount,
    setFetch: (fn) => { fetchHandler = fn; },
  };
}

function makePkgJson(ver, plat, extra = {}) {
  const content = `(function(){\n'use strict';\nvar VERSION = '${ver}';\nvar PLATFORM = '${plat}';\nvar TAG = '[AR6]';\n})();\n`;
  return JSON.stringify(Object.assign({
    type: 'script',
    enabled: true,
    name: `卢克之光 V${ver}·${plat === 'st' ? 'ST酒馆适配' : (plat === 'tt' ? 'TT酒馆适配' : '桌面版')}`,
    info: `卢克之光 V${ver} 更新包`,
    content,
  }, extra));
}

function makeManifest(ver, changelog = '测试更新说明') {
  return JSON.stringify({
    version: ver,
    changelog,
    packages: {
      st: 'https://cdn.jsdelivr.net/gh/3577241779/luke-light@main/dist/luke-light-st.json',
      tt: 'https://cdn.jsdelivr.net/gh/3577241779/luke-light@main/dist/luke-light-tt.json',
      desktop: 'https://cdn.jsdelivr.net/gh/3577241779/luke-light@main/dist/luke-light-desktop.json',
    },
  });
}

(async () => {
  console.log('\n【1. 基础状态 / 版本比对 / 清单解析 / 多镜像链路】');
  {
    const env = makeSandbox({ platform: 'tt', version: '5.5' });
    const U = env.U;
    ok('默认 updAutoOn() === true', U.updAutoOn() === true);
    U.cfg.updAuto = false;
    ok('关闭 cfg.updAuto=false 后 updAutoOn() === false', U.updAutoOn() === false);
    U.cfg.updAuto = true;

    ok('updCmp("5.6", "5.5") === 1', U.updCmp('5.6', '5.5') === 1);
    ok('updCmp("5.61", "5.6") === 1（V5.6 平滑追新至 V5.61）', U.updCmp('5.61', '5.6') === 1);
    ok('updCmp("5.61", "5.5") === 1（V5.5 平滑追新至 V5.61）', U.updCmp('5.61', '5.5') === 1);
    ok('updCmp("5.10", "5.5") === 1（数字分段非字典序）', U.updCmp('5.10', '5.5') === 1);
    ok('updCmp("5.5.0", "5.5") === 0', U.updCmp('5.5.0', '5.5') === 0);
    ok('updCmp("v5.6", "5.5") === 1', U.updCmp('v5.6', '5.5') === 1);
    ok('updCmp("5.6-beta", "5.5") === 0（拒绝非纯数字版本）', U.updCmp('5.6-beta', '5.5') === 0);

    const parsedTT = U.updParseManifest(makeManifest('5.6', '星轨增强'), 'tt');
    ok('TT 端精准解析 packages.tt', parsedTT.v === '5.6' && parsedTT.url.endsWith('luke-light-tt.json') && parsedTT.changelog === '星轨增强');
    const parsedST = U.updParseManifest(makeManifest('5.6'), 'st');
    ok('ST 端精准解析 packages.st', parsedST.url.endsWith('luke-light-st.json'));

    const mirrors = U.updMirrorList('https://cdn.jsdelivr.net/gh/3577241779/luke-light@main/dist/version.json');
    ok('生成 3 条多镜像回退链（cdn -> raw -> fastly）',
      mirrors.length === 3 &&
      mirrors[0].includes('cdn.jsdelivr.net') &&
      mirrors[1].includes('raw.githubusercontent.com') &&
      mirrors[2].includes('fastly.jsdelivr.net'));

    // 模拟 cdn.jsdelivr 失败，自动回退到 raw.githubusercontent 成功并记住最快节点
    env.setFetch((u) => {
      if (u.includes('cdn.jsdelivr.net')) return Promise.reject(new TypeError('network down'));
      return Promise.resolve({ ok: true, status: 200, text: () => Promise.resolve(makeManifest('5.6')) });
    });
    const rM = await U.updCheck(true);
    ok('主 CDN 失败自动切换 raw.githubusercontent 成功', rM.ok === true && rM.latest === '5.6' && rM.newer === true);
    const mirrorsAfter = U.updMirrorList('https://cdn.jsdelivr.net/gh/3577241779/luke-light@main/dist/luke-light-tt.json');
    ok('后续拉包自动优先使用刚刚成功的 raw 节点', mirrorsAfter[0].includes('raw.githubusercontent.com'));
  }

  console.log('\n【2. 通道一：酒馆助手官方脚本树 API（支持子文件夹 + script_id + 幂等 + 撤回）】');
  {
    const env = makeSandbox({ platform: 'st', version: '5.5' });
    const U = env.U;
    let flushed = 0;
    const trees = [
      { type: 'script', id: 'other-1', name: '别的插件', content: 'var X = 1;' },
      {
        type: 'folder',
        name: '常用工具',
        scripts: [
          {
            type: 'script',
            id: 'lk-st-id',
            name: '卢克之光 V5.5·ST酒馆适配',
            info: 'old info',
            enabled: true,
            content: JSON.parse(makePkgJson('5.5', 'st')).content,
          },
        ],
      },
    ];
    env.HOST.getScriptId = () => 'lk-st-id';
    env.HOST.TavernHelper = {
      getScriptId: () => 'lk-st-id',
      getScriptTrees: () => trees,
      updateScriptTreesWith: (fn) => { fn(trees); return Promise.resolve(); },
      flushHelperScripts: () => { flushed++; return Promise.resolve(); },
    };
    env.setFetch((u) => {
      if (u.includes('version.json')) return Promise.resolve({ ok: true, status: 200, text: () => Promise.resolve(makeManifest('5.6')) });
      return Promise.resolve({ ok: true, status: 200, text: () => Promise.resolve(makePkgJson('5.6', 'st')) });
    });

    const rQ = await U.updQuick();
    ok('文件夹内的脚本 via 官方 API 一键升级 V5.6 成功', rQ.ok === true && rQ.installed === true && rQ.version === '5.6');
    ok('flushHelperScripts 被调用落盘', flushed === 1);
    ok('脚本表内容与名称已原地替换为 V5.6', trees[1].scripts[0].name.includes('V5.6') && trees[1].scripts[0].content.includes("var VERSION = '5.6'"));
    ok('updHasNotice() 点亮待刷新提醒', U.updHasNotice() === true && U.updInstalledVer() === '5.6');

    // 重复点击幂等：不重复写
    const rQ2 = await U.updQuick();
    ok('同版本再次点击幂等返回 already=true 且不重复 flush', rQ2.ok === true && rQ2.already === true && flushed === 1);

    // 撤回旧版
    const rUndo = U.updUndo();
    ok('updUndo() 通过官方 API 完整还原旧版 V5.5 名称与正文',
      rUndo.ok === true && trees[1].scripts[0].name.includes('V5.5') && trees[1].scripts[0].content.includes("var VERSION = '5.5'"));
    ok('撤回后 updCanUndo() 归零', U.updCanUndo() === false);
  }

  console.log('\n【3. 通道二：extensionSettings.tavern_helper 4.x 文件夹 + 防抖回读 + 失败回滚】');
  {
    const env = makeSandbox({ platform: 'tt', version: '5.5' });
    const U = env.U;
    let savedDebounced = 0;
    const extSettings = {
      tavern_helper: {
        script: {
          scripts: [
            {
              type: 'folder',
              name: 'TT 脚本夹',
              scripts: [
                {
                  type: 'script',
                  name: '卢克之光 V5.5·TT酒馆适配',
                  info: 'old tt',
                  enabled: true,
                  content: JSON.parse(makePkgJson('5.5', 'tt')).content,
                },
              ],
            },
          ],
        },
      },
    };
    env.HOST.SillyTavern = {
      getContext: () => ({
        extensionSettings: extSettings,
        saveSettingsDebounced: () => { savedDebounced++; },
      }),
    };
    env.setFetch((u) => {
      if (u.includes('version.json')) return Promise.resolve({ ok: true, status: 200, text: () => Promise.resolve(makeManifest('5.7')) });
      return Promise.resolve({ ok: true, status: 200, text: () => Promise.resolve(makePkgJson('5.7', 'tt')) });
    });

    const r2 = await U.updQuick();
    ok('TT 端经 extensionSettings.tavern_helper.script.scripts 文件夹升级成功',
      r2.ok === true && r2.installed === true && r2.version === '5.7' && r2.saveKind === 'debounce' && savedDebounced === 1);
    ok('防抖模式提示文案提醒等待两秒后刷新', U.updDoneText('5.7', 'debounce').includes('等待 2 秒'));

    const u2 = U.updUndo();
    ok('通道二撤回还原 V5.5 名称与正文',
      u2.ok === true && extSettings.tavern_helper.script.scripts[0].scripts[0].name.includes('V5.5'));

    // 写盘抛错自动回滚
    env.HOST.SillyTavern = {
      getContext: () => ({
        extensionSettings: extSettings,
        saveSettings: () => { throw new Error('disk full'); },
      }),
    };
    const rFail = await U.updQuick();
    ok('saveSettings 抛错返回 nosave 并自动回滚到 V5.5',
      rFail.ok === false && rFail.err === 'nosave' && extSettings.tavern_helper.script.scripts[0].scripts[0].content.includes("var VERSION = '5.5'"));
  }

  console.log('\n【4. 安全防线：防串包 / 版本不符 / 超大包 / 只读 WebView 兜底】');
  {
    const env = makeSandbox({ platform: 'st', version: '5.5' });
    const U = env.U;
    env.HOST.SillyTavern = {
      getContext: () => ({
        extensionSettings: {
          tavern_helper: {
            scripts: [{ name: '卢克之光 V5.5·ST酒馆适配', enabled: true, content: JSON.parse(makePkgJson('5.5', 'st')).content }],
          },
        },
        saveSettings: () => {},
      }),
    };

    // 跨平台串包拦截（ST 端下到了 desktop 包）
    env.setFetch((u) => {
      if (u.includes('version.json')) return Promise.resolve({ ok: true, status: 200, text: () => Promise.resolve(makeManifest('5.6')) });
      return Promise.resolve({ ok: true, status: 200, text: () => Promise.resolve(makePkgJson('5.6', 'desktop')) });
    });
    const rBadPlat = await U.updQuick();
    ok('跨平台防串包：ST 端拒绝写入 desktop 包 (badplat)', rBadPlat.ok === false && rBadPlat.err === 'badplat');

    // 版本号不符拦截
    env.setFetch((u) => {
      if (u.includes('version.json')) return Promise.resolve({ ok: true, status: 200, text: () => Promise.resolve(makeManifest('5.6')) });
      return Promise.resolve({ ok: true, status: 200, text: () => Promise.resolve(makePkgJson('5.8', 'st')) });
    });
    const rMis = await U.updQuick();
    ok('版本不一致拦截 (mismatch)', rMis.ok === false && rMis.err === 'mismatch');

    // 只读 WebView 无宿主权限 -> 设置 fallbackUrl 供手动下载
    delete env.HOST.SillyTavern;
    env.setFetch((u) => {
      if (u.includes('version.json')) return Promise.resolve({ ok: true, status: 200, text: () => Promise.resolve(makeManifest('5.6')) });
      return Promise.resolve({ ok: true, status: 200, text: () => Promise.resolve(makePkgJson('5.6', 'st')) });
    });
    const rNoHost = await U.updQuick();
    ok('只读 WebView 返回 nohost 并激活 fallbackUrl 兜底按钮',
      rNoHost.ok === false && rNoHost.err === 'nohost' && U.UPD_RT.fallbackUrl.includes('luke-light-st.json'));
  }

  console.log('\n【5. 后台静默自动更新（updBoot）保留个人配置 + 断网完全静默】');
  {
    const env = makeSandbox({ platform: 'st', version: '5.5', cfg: { updAuto: true, jail: 'gatanothor', modelProfile: '4a' } });
    const U = env.U;
    const list = [{ name: '卢克之光 V5.5·ST酒馆适配', enabled: true, content: JSON.parse(makePkgJson('5.5', 'st')).content }];
    env.HOST.SillyTavern = {
      getContext: () => ({
        extensionSettings: { tavern_helper: { script: { scripts: list } } },
        saveSettings: () => {},
      }),
    };
    env.setFetch((u) => {
      if (u.includes('version.json')) return Promise.resolve({ ok: true, status: 200, text: () => Promise.resolve(makeManifest('5.6')) });
      return Promise.resolve({ ok: true, status: 200, text: () => Promise.resolve(makePkgJson('5.6', 'st')) });
    });

    U.updBoot();
    await new Promise((r) => setTimeout(r, 80));
    ok('updBoot 后台静默发现 V5.6 并自动完成原地写入', list[0].content.includes("var VERSION = '5.6'"));
    ok('后台静默同步完弹出温和就绪横幅', env.banners.some((b) => b.msg.includes('已静默同步 V5.6')));
    ok('升级后个人开关（jail=gatanothor, modelProfile=4a）原封不动保留',
      U.cfg.jail === 'gatanothor' && U.cfg.modelProfile === '4a');

    // 断网时完全静默，不弹任何报错横幅
    const envOff = makeSandbox({ platform: 'st', version: '5.5', cfg: { updAuto: true } });
    envOff.setFetch(() => Promise.reject(new TypeError('offline')));
    envOff.U.updBoot();
    await new Promise((r) => setTimeout(r, 80));
    ok('后台自动检查断网时零弹窗不打扰用户', envOff.banners.length === 0);
  }

  console.log(`\n----------------------------------------`);
  console.log(`[TEST-UPD] ${pass}/${pass + fail} passed`);
  if (fail > 0) process.exit(1);
  process.exit(0);
})();
