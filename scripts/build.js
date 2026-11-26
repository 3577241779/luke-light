'use strict';
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const SRC_MOD = path.join(ROOT, 'src/modules');
const DIST_DIR = path.join(ROOT, 'dist');
const DESKTOP_OUT_DIR = process.env.LUKE_OUT_DIR || '';
const REPO_RAW_CDN = 'https://cdn.jsdelivr.net/gh/3577241779/luke-light@v5.98/dist';
const CHANGELOG_LATEST = 'V5.98 · 新增全工具破甲「破暗化光 · 闪耀三轨」（正文/状态/选项三路函数投递 + 自动补回执防 400 + save_chapter 升级），按键上调至诺亚与深渊正下方并配备第 5 套「由暗转明 → 变回闪耀迪迦」圣殿仪式弹窗、两段式黑迪迦裂解化光演出、3D 桌宠与顶栏闪耀联动及全 10 套皮肤深度适配。';

const MODULE_ORDER = [
  '01_1_core.js',
  '02_2_refract.js',
  '03_12_narr.js',
  '04_15_ooc.js',
  '05_5_route.js',
  '06_13_stats.js',
  '07_7_jail.js',
  '07a_patch46_tool.js',
  '07b_patch57_tooljail.js',
  '07c_7_jail_body.js',
  '07d_lk51.js',
  '07e_lk52.js',
  '07f_lk521.js',
  '07g_lk522.js',
  '07h_lk523.js',
  '07i_lk526.js',
  '08_14_trunc.js',
  '09_8_probe.js',
  '10_16_base.js',
  '11_17_shape.js',
  '11b_18_upd.js',
  '11c_diag_fp.js',
  '12_3_net.js',
  '13_9_card.js',
  '14_10_help.js',
  '15a_pet_asset.js',
  '15c_skin_pet_assets.js',
  '15b_sparklence.js',
  '15_11_wand.js',
  '16_19_pvp.js',
  '17_18_live.js',
  '18_4_ui.js',
  '18a_skins.js',
  '18c_skin_fx.js',
  '18b_prism_panel.js',
  '19_4a_render.js',
  '20_4b_logwin.js',
  '21_boot_selftest.js',
];

const TT_DESKTOP_HOST_RESOLVER = [
  '/* 宿主解析（TT / 桌面版）：优先同时具备可访问 DOM 与可用 localStorage 的那一层，仅在完整就绪时缓存。 */',
  'function resolveHostWindow() {',
  '  try {',
  '    var cached = window.__AR6_HOST__;',
  '    if (cached && cached.document && cached.document.body && ar6CanStore(cached)) return cached;',
  '  } catch (eC) {}',
  '  var cands = [];',
  '  try { if (window.top) cands.push(window.top); } catch (e0) {}',
  '  try { if (window.parent) cands.push(window.parent); } catch (e1) {}',
  '  cands.push(window);',
  '  var best = null, storeOnly = null, fallback = null;',
  '  for (var i = 0; i < cands.length; i++) {',
  '    var w = cands[i];',
  '    if (!w) continue;',
  '    var dup = false;',
  '    for (var j = 0; j < i; j++) { if (cands[j] === w) { dup = true; break; } }',
  '    if (dup) continue;',
  '    var hasDoc = false, hasBody = false;',
  '    try { hasDoc = !!w.document; hasBody = !!(w.document && w.document.body); } catch (eD) {}',
  '    if (ar6CanStore(w)) {',
  '      if (hasBody) { best = w; break; }',
  '      if (hasDoc && !storeOnly) storeOnly = w;',
  '    }',
  '    if (!fallback && hasDoc) fallback = w;',
  '  }',
  '  best = best || storeOnly || fallback || window;',
  '  try { if (best && best.document && best.document.body && ar6CanStore(best)) window.__AR6_HOST__ = best; } catch (eW) {}',
  '  return best;',
  '}',
].join('\n');

const TARGETS = [
  {
    id: 'st',
    platform: 'st',
    uiMode: 'mobile',
    fileName: '卢克之光 V5.98·ST酒馆适配.json',
    distName: 'luke-light-st.json',
    name: '卢克之光 V5.98·ST酒馆适配',
    info: '卢克之光 V5.98「光之守护」· 手机 ST 酒馆适配（破暗化光·闪耀三轨全工具破甲 / 10皮肤×18态3D雕像桌宠 / 四生合体单悬浮球与热更自愈 / 开源防骗免责首弹 / 真协议思考强度切换 / 光鉴四维硬指纹）',
    scoredHost: true,
    buttonEnabled: false,
  },
  {
    id: 'tt',
    platform: 'tt',
    uiMode: 'mobile',
    fileName: '卢克之光 V5.98·TT酒馆适配.json',
    distName: 'luke-light-tt.json',
    name: '卢克之光 V5.98·TT酒馆适配',
    info: '卢克之光 V5.98「光之守护」· TT 酒馆适配（破暗化光·闪耀三轨全工具破甲 / 10皮肤×18态3D雕像桌宠 / 四生合体单悬浮球与热更自愈 / 开源防骗免责首弹 / 真协议思考强度切换 / 光鉴四维硬指纹 / TT 双入口）',
    scoredHost: false,
    buttonEnabled: true,
  },
  {
    id: 'desktop',
    platform: 'desktop',
    uiMode: 'desktop',
    fileName: '卢克之光 V5.98·桌面版.json',
    distName: 'luke-light-desktop.json',
    name: '卢克之光 V5.98·桌面版',
    info: '卢克之光 V5.98「光之守护」· 电脑桌面版（破暗化光·闪耀三轨全工具破甲 / 10皮肤×18态3D雕像桌宠 / 四生合体单悬浮球与热更自愈 / 开源防骗免责首弹 / 真协议思考强度切换 / 光鉴四维硬指纹 / 桌面宽屏拖拽）',
    scoredHost: false,
    buttonEnabled: false,
  },
];

function buildContent(target) {
  const chunks = [];
  for (const modName of MODULE_ORDER) {
    const p = path.join(SRC_MOD, modName);
    if (!fs.existsSync(p)) {
      throw new Error(`Missing module file: ${p}`);
    }
    let code = fs.readFileSync(p, 'utf8');
    if (modName === '01_1_core.js') {
      const platRe = /\/\* @PLATFORM_CONFIG_START@ \*\/[\s\S]*?\/\* @PLATFORM_CONFIG_END@ \*\//;
      if (!platRe.test(code)) {
        throw new Error('Missing @PLATFORM_CONFIG_START@..@PLATFORM_CONFIG_END@ markers in 01_1_core.js');
      }
      code = code.replace(platRe, `var PLATFORM = '${target.platform}';`);

      const re = /\/\* @HOST_RESOLVER_START@ \*\/[\s\S]*?\/\* @HOST_RESOLVER_END@ \*\//;
      if (!re.test(code)) {
        throw new Error('Missing @HOST_RESOLVER_START@..@HOST_RESOLVER_END@ markers in 01_1_core.js');
      }
      if (target.scoredHost) {
        code = code
          .replace('/* @HOST_RESOLVER_START@ */\n', '')
          .replace('\n/* @HOST_RESOLVER_END@ */', '');
      } else {
        code = code.replace(re, TT_DESKTOP_HOST_RESOLVER);
      }
    }
    if (modName === '18_4_ui.js') {
      const uiRe = /\/\* @UI_MODE_START@ \*\/[\s\S]*?\/\* @UI_MODE_END@ \*\//;
      if (!uiRe.test(code)) {
        throw new Error('Missing @UI_MODE_START@..@UI_MODE_END@ markers in 18_4_ui.js');
      }
      code = code.replace(uiRe, `var UI_MODE = '${target.uiMode}';`);
    }
    chunks.push(code.trimEnd());
  }
  return "(function () {\n'use strict';\n" + chunks.join('\n\n') + '\n})();\n';
}

function buildAll() {
  fs.mkdirSync(DIST_DIR, { recursive: true });
  if (DESKTOP_OUT_DIR) fs.mkdirSync(DESKTOP_OUT_DIR, { recursive: true });

  const built = [];
  for (const t of TARGETS) {
    const content = buildContent(t);
    const jsonObj = {
      type: 'script',
      enabled: true,
      name: t.name,
      info: t.info,
      content,
      button: t.buttonEnabled
        ? {
            enabled: true,
            buttons: [
              {
                name: '✦ 光之守护',
                visible: true,
              },
            ],
          }
        : {
            enabled: false,
            buttons: [
              {
                name: '🛡 防路由',
                visible: false,
              },
            ],
          },
      data: {},
    };
    const serialized = JSON.stringify(jsonObj, null, 2) + '\n';
    const canonDistPath = path.join(DIST_DIR, t.distName);
    fs.writeFileSync(canonDistPath, serialized, 'utf8');
    if (DESKTOP_OUT_DIR) fs.writeFileSync(path.join(DESKTOP_OUT_DIR, t.fileName), serialized, 'utf8');
    built.push({ id: t.id, fileName: t.fileName, distName: t.distName, canonDistPath, chars: content.length });
    console.log(`[BUILT] ${t.distName} (${content.length} JS chars) -> ${canonDistPath}`);
  }
  const coreSrc = fs.readFileSync(path.join(SRC_MOD, '01_1_core.js'), 'utf8');
  const verMatch = coreSrc.match(/var VERSION\s*=\s*'([^']+)'/);
  const version = verMatch ? verMatch[1] : '5.5';
  const pkgBase = `https://cdn.jsdelivr.net/gh/3577241779/luke-light@v${version}/dist`;
  const manifest = {
    version,
    releasedAt: new Date().toISOString(),
    changelog: CHANGELOG_LATEST,
    packages: {
      st: `${pkgBase}/luke-light-st.json`,
      tt: `${pkgBase}/luke-light-tt.json`,
      desktop: `${pkgBase}/luke-light-desktop.json`,
    },
  };
  fs.writeFileSync(path.join(DIST_DIR, 'version.json'), JSON.stringify(manifest, null, 2) + '\n', 'utf8');
  console.log(`[BUILT] dist/version.json (v${version})`);
  return built;
}

if (require.main === module) {
  buildAll();
}

module.exports = { buildAll, TARGETS };
