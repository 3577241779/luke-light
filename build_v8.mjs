/* build_v7.mjs — 拼接 v8 源文件，生成桌面/移动两个酒馆助手导入包 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const SRC = 'C:/Users/23548/Documents/deepseek-harness/default-workspace/_antiroute/v8/_src';
const OUT = 'C:/Users/23548/Documents/deepseek-harness/default-workspace/_antiroute/v8';
const DESKTOP = 'C:/Users/23548/Desktop/卢克之光';
const BRAND = '卢克之光';

const PARTS = ['1_core.js', '2_refract.js', '12_narr.js', '15_ooc.js', '5_route.js', '13_stats.js', '6_float.js', '7_jail.js', '14_trunc.js', '8_probe.js', '16_base.js', '17_shape.js', '18_upd.js', '3_net.js',
  '9_card.js', '10_help.js', '11_wand.js', '4_ui.js'];

const EXPORT_BLOCK = `
/* ---- 测试出口（浏览器中无副作用） ---- */
var AR6_API = {
  VERSION: VERSION,
  runIdentityProbe: runIdentityProbe,
  idScore: idScore,
  idVerdict: idVerdict,
  idPick: idPick,
  idEntries: idEntries,
  idCard: idCard,
  openCard: openCard,
  closeCard: closeCard,
  cardText: cardText,
  getSafeBox: getSafeBox,
  floatClampPx: floatClampPx,
  floatLayoutPx: floatLayoutPx,
  floatSaveFromPx: floatSaveFromPx,
  installRootDrag: installRootDrag,
  bindFloatGestures: bindFloatGestures,
  floatApplyPosition: floatApplyPosition,
  cardHTML: cardHTML,
  cardHumanHTML: cardHumanHTML,
  cardEngineHTML: cardEngineHTML,
  /* v0.82 行为基线：只提示，不进账本 */
  basePush: basePush,
  baseJudge: baseJudge,
  openHelp: openHelp,
  helpHTML: helpHTML,
  helpText: helpText,
  /* v0.7：说明页数据结构也导出去，测试直接验「七页 / 每页 >=8 条 / 无技术词」 */
  HELP_TABS: HELP_TABS,
  HELP_PAGES: HELP_PAGES,
  truncHuman: truncHuman,
  cardEvidenceItems: cardEvidenceItems,
  cardSpark: cardSpark,
  absorbPeek: absorbPeek,
  isInternalRequest: isInternalRequest,
  familyOf: familyOf,
  inScopeModel: inScopeModel,
  pushObs: pushObs,
  newEvidence: newEvidence,
  getCfg: function () { return cfg; },
  setCfg: function (k, v) { cfg[k] = v; saveCfg(); },
  runSelfTest: runSelfTest,
  render: render,
  /* ---- v8.30 布局体检 ---- */
  diag: ar6Diag,
  scopeMatch: scopeMatch, scopeLabel: scopeLabel,
  jailStatLine: jailStatLine,
  jailSuperHTML: jailSuperHTML,
  jailSuperAsk: jailSuperAsk,
  jailLabel: jailLabel,
  helpGeom: helpGeom,
  helpApplyGeom: helpApplyGeom,
  exportText: exportText,
  abProbe: abProbe,
  ledLine: ledLine,
  ledStat: ledStat,
  fpCard: fpCard,
  AB_STATE: AB_STATE,
  fitPanel: fitPanel,
  openPanel: openPanel,
  openPanelFromWand: openPanelFromWand,
  /* ---- v8.31 叙述层 ---- */
  narrBody: narrBody,
  narrApply: narrApply,
  narrStrip: narrStrip,
  narrTag: narrTag,
  narrNext: narrNext,
  narrTokens: narrTokens,
  narrUserName: narrUserName,
  narrLabel: narrLabel,
  NARR_KNOW: NARR_KNOW,
  NARR_CHARM: NARR_CHARM,
  /* ---- v0.76 反 OOC ---- */
  oocText: oocText,
  oocCfg: oocCfg,
  oocBook: oocBook,
  oocPeople: oocPeople,
  oocPresent: oocPresent,
  oocRecent: oocRecent,
  oocFill: oocFill,
  oocStrip: oocStrip,
  oocApply: oocApply,
  oocBodyPatch: oocBodyPatch,
  oocSig: oocSig,
  oocAsk: oocAsk,
  oocChoice: oocChoice,
  oocSetChoice: oocSetChoice,
  oocResetChoice: oocResetChoice,
  oocOnOf: oocOnOf,
  oocChipLabel: oocChipLabel,
  oocStatusLine: oocStatusLine,
  oocTokens: oocTokens,
  oocLabel: oocLabel,
  oocChannel: oocChannel,
  OOC_TAG: OOC_TAG,
  OOC_ITEMS: OOC_ITEMS,
  OOC_CHOICE: OOC_CHOICE,
  boot: boot,
  dispose: dispose,
  uiMode: uiMode,
  planRequest: planRequest,
  refractZone: refractZone,
  collectSpans: collectSpans,
  isProtected: isProtected,
  staticScore: staticScore,
  findHistoryBand: findHistoryBand,
  blockSignature: blockSignature,
  stripArtifacts: stripArtifacts,
  normModel: normModel,
  tierOf: tierOf,
  estimateTokens: estimateTokens,
  chatTag: function () { return chatTag(); },
  saltKey: function (t) { return saltKey(t); },
  saltWindow: function () { return saltWindow(); },
  lockAudit: function (b) { return lockAudit(b); },
  auditLabel: function () { return auditLabel(); },
  auditColor: function () { return auditColor(); },
  foreignShield: function (b) { return foreignShield(b); },
  foreignCount: function () { return foreignCount(); },
  verdictOf: verdictOf,
  newEvidence: newEvidence,
  finish: finish,
  readLog: readLog,
  pushLog: pushLog,
  collectCount: function () { return readLog().length; },
  isHooked: function () { return !!hooked; },
  ensureHooks: ensureHooks,
  installXhrHook: installXhrHook,
  unhookXhr: unhookXhr,
  runNativeProbe: runNativeProbe,
  runDualProbe: runDualProbe,
  openAIUrl: openAIUrl,
  nativeUrl: nativeUrl,
  getLastReq: function () { return lastReq; },
  setMinimized: function (v) { minimized = !!v; render(); },
  isMinimized: function () { return !!minimized; },
  sanitizeFloat: function (o) { return sanitizeFloat(o); },
  floatBoxSize: function () { return floatBoxSize(); },
  banner: function (m, k) { return banner(m, k); },
  btnSummary: function () { return btnSummary(); },
  isPadOpen: function () { return !!PAD_OPEN; },
  openPad: function () { return openPad(); },
  closePad: function () { return closePad(); },
  isButtonsBound: function () { return !!bound; },
  bindScriptButtons: bindScriptButtons,
  btnSummary: btnSummary,
  jailConfirmHTML: jailConfirmHTML,
  jailOffer: jailOffer,
  jailAfterFinish: jailAfterFinish,
  jailGate: function (k) { return jailGate(k); },
  btnOk: function () { return BTN_OK; },
  btnBound: function () { return BTN_BOUND; },
  /* ---- v7 新增 ---- */
  hashStr: hashStr,
  kpi: kpi,
  wilson: wilson,
  slimReport: slimReport,
  aliasCandidates: aliasCandidates,
  runAliasSweep: runAliasSweep,
  runChannelVerify: runChannelVerify,
  verifiableCode: verifiableCode,
  verifiableLabel: verifiableLabel,
  chState: chState,
  setChState: setChState,
  runLevelCheck: runLevelCheck,
  floatStyle: floatStyle,
  floatIconMarkup: floatIconMarkup,
  floatSizePx: floatSizePx,
  floatSettingsHTML: floatSettingsHTML,
  /* ---- v7.1 破甲 ---- */
  jailLabel: jailLabel,
  jailNext: jailNext,
  jailChipLabel: jailChipLabel,
  jailStatus: jailStatus,
  jailPatchBody: jailPatchBody,
  jailInspect: jailInspect,
  jailTruncWhy: jailTruncWhy,
  jailAfterFinish: jailAfterFinish,
  jailGate: jailGate,
  jailTrigger: jailTrigger,
  jailLastAi: jailLastAi,
  getJL: function () { return JL; },
  resetJL: function () { JL.count = 0; JL.at = 0; JL.key = ''; JL.lock = false; },
  JAIL_PRE_SYS: JAIL_PRE_SYS,
  JAIL_PRE_USR: JAIL_PRE_USR,
  JAIL_TAIL_TXT: JAIL_TAIL_TXT,
  /* ---- v0.6 抗截断 ---- */
  truncInspect: truncInspect,
  truncAfterFinish: truncAfterFinish,
  truncNext: truncNext,
  truncLevel: truncLevel,
  truncLabel: truncLabel,
  truncChipLabel: truncChipLabel,
  truncStatLine: truncStatLine,
  /* ---- v0.7 抗截断 · 轻档 v2（事前注入） ---- */
  truncBlock: truncBlock,
  truncApply: truncApply,
  truncPadHook: truncPadHook,
  truncPresetSig: truncPresetSig,
  truncSigOf: truncSigOf,
  truncStrip: truncStrip,
  truncStripPads: truncStripPads,
  truncLenOf: truncLenOf,
  truncLenNext: truncLenNext,
  truncLenSet: truncLenSet,
  truncLenLabel: truncLenLabel,
  truncLenChipLabel: truncLenChipLabel,
  sanitizeTrunc: sanitizeTrunc,
  TRUNC_OPEN: TRUNC_OPEN,
  TRUNC_CLOSE: TRUNC_CLOSE,
  TRUNC_TEXT_TAIL: TRUNC_TEXT_TAIL,
  TRUNC_TEXT_NOCERT: TRUNC_TEXT_NOCERT,
  TRUNC_LENS: TRUNC_LENS,
  TRUNC_FIX: TRUNC_FIX,
  getTR: function () { return TR; },
  resetTR: function () { TR.code = ''; TR.note = ''; TR.at = 0; TR.try = 0; },
  /* ---- v0.93 新版本检查与一键安装 ---- */
  updOn: updOn,
  updUrlOk: updUrlOk,
  updParse: updParse,
  updCmp: updCmp,
  updCheck: updCheck,
  updState: updState,
  updLine: updLine,
  updBoot: updBoot,
  updParseFull: updParseFull,
  updHostCtx: updHostCtx,
  updSelfIndex: updSelfIndex,
  updInstall: updInstall,
  updUndo: updUndo,
  updCanUndo: updCanUndo,
  updHasPkg: updHasPkg,
  updLatest: updLatest,
  updErrText: updErrText
};
try { if (typeof globalThis !== 'undefined') globalThis.__AR6__ = AR6_API; } catch (e) {}
`;

const VERSION_M = /var VERSION = '([^']+)'/.exec(fs.readFileSync(path.join(SRC, '1_core.js'), 'utf8'));
const V = VERSION_M ? VERSION_M[1] : '0.0.0';

function readParts() {
  return PARTS.map((p) => {
    const f = path.join(SRC, p);
    const code = fs.readFileSync(f, 'utf8');
    return `/* ===== ${p} ===== */\n${code}`;
  }).join('\n');
}

function buildSource(mode) {
  const body = readParts();
  const withMode = body.replace("var UI_MODE = 'auto';", `var UI_MODE = '${mode}';`);
  if (withMode === body) throw new Error('UI_MODE 占位未找到');
  return `(function () {\n${withMode}\n${EXPORT_BLOCK}\n})();\n`;
}

const INFO = [
  BRAND + ' V' + V + ' · 防降级观测与保档（内核 = Anti-Route 8.31；桌面/移动各一份，别同时装）',
  '',
  '【一句话】它决定不了上游给你哪个模型，但能让「被换了」看得见、截得图、能重试，并把几个「允许换模型」的开关钉死。',
  '',
  '【怎么用】导入 → 正常聊一轮 → 面板多一行记录。装完先点一次「🔭 验渠道」：4xx = 渠道认模型名，名字能当证据；200 = 不认，以后「名字对得上」一律不算数。',
  '工具栏只剩 1 个「🛡 防路由」；扩展菜单里的「魔法棒」是第二条入口；都打不开就控制台跑 __AR6__.openPanel()。',
  '',
  '【面板有什么】防护（总闸 / 微扰 / 思考 / 钉参数 / 观察器 / 安全）· 叙述（🧭 防全知、💄 去媚，各三档）· 破甲（关 / 安全 / 强力 + 确认 + 补一次）· 抗截断（关 / 轻档 / 中档）· 体检（原生探针 / 双通道 / 自检 20 项 / 验渠道 / 扫别名 / 档位检查 / 瘦身报告 / 身份筛选）· 记录与输入框。',
  '',
  '【叙述层】🧭 防全知：画面可以拉远，人不行——每个角色只用他自己那份见闻，除了「看不看得见」，还管得住「他怎么知道的」。💄 去媚：世界自己转，你的话是请求不是命令，对方可以答应，也可以敷衍。轻档约 +65 tok/轮，双强约 +800。想看实际内容：__AR6__.narrBody()。',
  '',
  '【破甲】默认关。安全＝只做事后检查，发现空回或截断就问你；强力＝额外改请求（补「直接写」、max_tokens 保底 2048）。同一轮最多补 1 次，自己补过之后 90 秒内不再自动补。',
  '【抗截断 · V0.6 新】独立三档：关 / 轻档 / 中档。轻档只告诉你「这一轮为什么停」——被 max_tokens 掐断 / 停在半句 / 上游要求继续 / 被安全层拦 / 没给结束原因；中档对前三种自动补一次，后两种任何档位都不补。它不改任何收到的内容，也查不了「内容被静默替换但一切正常」的情况（那种没有信号）。',
  '',
  '【诚实的边界】模型由上游决定；渠道不读 model 时名字永远不能当证据；微扰对语义分类器无效；本包与任何别的护盾都不要同时装，会互相抵消。',
  '',
  '【检测范围】面板「🎯 范围」三档：全部 → 跳过列表内 → 只查列表内。关键词按包含匹配（填 deepseek 就命中 deepseek-chat / deepseek-r1）。不在范围的轮次只留一条「跳过」灰记录，不进路由率，也不影响空回与破甲。',
  '看数字：面板「体检」下面那行就是渠道账本——n 是有结论的轮数，被换率带 95% 区间，样本不足会直说。',
  '要给别人看：点「📤 导出记录」，复制一段 ≤1800 字的文本（含一行机读码），默认不含任何 key。',
  '详细说明在面板「❔ 说明」里：6 页、可搜索、离线可用。',
].join('\n');

/* v8.31：8 个按钮砍到 1 个。面板里每项功能都在，工具栏只留一个不依赖扩展菜单的入口——
   魔法棒要是被宿主改版搞挂了，这是唯一的活路。 */
const BUTTONS = [
  { name: '🛡 防路由', visible: true }
];

function writeJson(file, name, content) {
  const obj = {
    id: crypto.randomUUID(),
    name,
    type: 'script',
    content,
    info: INFO,
    enabled: true,
    button: { enabled: true, buttons: BUTTONS }
  };
  const txt = JSON.stringify(obj, null, 2);
  fs.writeFileSync(file, txt, 'utf8');
  // 回读校验
  const back = JSON.parse(fs.readFileSync(file, 'utf8'));
  if (back.content !== content) throw new Error('回读 content 不一致: ' + file);
  return Buffer.byteLength(txt, 'utf8');
}

const variants = [
  { mode: 'desktop', name: BRAND + ' V' + V + '·桌面版', file: BRAND + '_V' + V + '_桌面版_酒馆助手导入脚本.json' },
  { mode: 'mobile', name: BRAND + ' V' + V + '·TT酒馆适配', file: BRAND + '_V' + V + '_移动版_TT酒馆适配_酒馆助手导入脚本.json' }
];

const lines = [];
/* v0.7 起构建只往 OUT 写，不再往桌面写：
   桌面目录是「交付区」，只放 package_v05.cjs 打出来的正式包。
   以前构建也往桌面丢一份裸包，命名是「卢克之光_V0.7_桌面版_…」，
   和正式包「卢克之光 V0.7·桌面版_…」并存，用户会装错。 */
for (const v of variants) {
  const code = buildSource(v.mode);
  fs.writeFileSync(path.join(OUT, `antiroute-v8-${v.mode}.js`), code, 'utf8');
  const size = writeJson(path.join(OUT, v.file), v.name, code);
  lines.push(`${v.mode}: content=${code.length} chars, json=${size} B`);
}
console.log(lines.join('\n'));
