/* ===== 10_help.js ===== */
/* 10_help.js — 卢克之光 · 五页《功能图鉴》（离线独立浮窗，不篡改 CARD.open 状态） */

var HELP_TABS = [
  { k: 'entry', t: '入口与计时器' },
  { k: 'radar', t: '光之雷达' },
  { k: 'tiga',  t: '形态破甲与圣翼' },
  { k: 'cont',  t: '能量续航与飞燕' },
  { k: 'world', t: '叙事结界与防卫' }
];

var HELP_PAGES = {
  entry: [
    {
      h: '面板顶栏按钮、十套皮肤与四生合体入口',
      kv: [
        ['魔法棒「光之守护」', '聊天框左侧酒馆扩展菜单（魔法棒）第一项即为「光之守护」，点击一键展开或收起主面板；TT 酒馆同时在底部脚本栏提供「✦ 光之守护」快捷按钮。'],
        ['顶栏状态胶囊（守护开启 / 形态名）', '主面板右上角带呼吸灯珠的快捷总闸，随时一键切换信道守护总开关；主面板顶栏流光会随破甲形态五态共鸣（蓝金 / 赤红 / 耀金 / 铂银 / 黑曜血红）。'],
        ['🎨 切换皮肤', '展开十套皮肤抽屉：光之守护、极简直白、太虚玉简、焚天帝炎、绯樱微醺、方舟协议（漫威）、天命玉玺（帝皇）、圣殿秘典（西幻）、绯月秘仪（诡秘）、黑墙协议（赛博），同步切换 3D 桌宠与全套弹窗文案。'],
        ['☰ 采样窗 / ↗ 收起 / ✕ 关闭', '「☰」开关实时测速与思考采样悬浮小窗；「↗」收起为侧边彩色计时器圆章；「✕」隐藏面板（仍可通过魔法棒或圆章唤回）。'],
        ['四生合体单窗切换条', '当你同时安装《光域·镜界》预设、《光域·镜影》或《光域·镜忆》等同家族插件时，顶栏自动出现单窗切换条（手机窄屏自动 2×2 排布），共享同一个悬浮球与 10 套皮肤主题。']
      ]
    },
    {
      h: '侧边「彩色计时器圆章」与 3D 桌宠交互',
      l: [
        '澄澈蓝灯与形态共鸣色：守护正常开启且未检出偷换/掉包时，圆章随当前形态呈现对应颜色呼吸态；总闸关闭时呈银灰待机态。',
        '红灯慢闪：提示上一轮响应疑似遭遇中转站暗中换模型、降档或高疑掉包（V3/V4），点击圆章即可展开圣域诊断报告。',
        '交互手势：轻点圆章秒开主面板；按住上下拖动松手自动吸附屏幕边缘；召唤 3D 雕像桌宠后全屏最多保留 1 个悬浮物，拖回边缘可收拢回圆章。'
      ]
    }
  ],

  radar: [
    {
      h: '总开关、三格读数、四轨随机微扰与双思考调节',
      kv: [
        ['彩色计时器 · 信道守护', '全系统总开关。开启后自动执行路由核验、指纹鉴真及你开启的各项破甲/续航/结界功能；关闭后所有请求原样透传。下方「信号纯净 / 疑似调包 / 待定信号」实时统计本会话结果。'],
        ['光波折射 · 随机微扰（关闭 / 微光·轻 / 棱镜·中 / 万花筒·强）', '对请求副本的空白、语篇连接词、注释锚点与随机码做四轨组合微扰，打散公共预设前缀指纹、防止中转拿旧缓存敷衍。'],
        ['每轮真随机 / 异常自动换套 / 🎲 立即换套', '「每轮真随机」每轮换新随机排列（关则同套保缓存）；「异常自动换套」抓到被换/无思考/高疑掉包时自动切新套号；「立即换套」手动刷新一套随机编号。'],
        ['主频锁定 · 禁降级调包', '清除 OpenAI 兼容请求里的备胎列表（models[]）并禁止静默回退；遇到 Gemini 原生格式自动跳过。'],
        ['光波采样 · 实时测速', '实时监测首字耗时（TTFT）、吐字速度、思考块与结束原因，也是空回/截断自动补救的前置观察器。'],
        ['波长记忆 · 基线比对', '学习当前渠道前 6 轮正常响应的速度特征基线，后续速度骤变时自动标记异常。'],
        ['信标核验 · 结构指纹', '核验上游原生 modelVersion、thoughtSignature、responseId 与 usage 协议指纹，识别伪装回显与高疑掉包（V1~V4）。'],
        ['精神同调 · 思考强度（跟随预设 / 低维 / 均衡 / 深度同调）', '协议参数级思考预算调节；选「跟随预设」零覆写，手动指定则写入对应模型的 thinkingLevel / thinkingBudget / reasoning_effort。'],
        ['奥特念力 · 原生思考头（关闭 / 随破甲 / 0.05 / 0.50 / 0.80 / 1.00）', '向系统首行写入原生 EFFORT LEVEL 思考预算指令。选「随破甲」按当前形态自动匹配（诺亚/深渊 0.05、闪耀/强力 0.50、复合 0.80、其余 1.00）；数字档用于精细锁定预算。']
      ]
    },
    {
      h: '光鉴报告、一码通、主动探针与数据维护',
      kv: [
        ['展开圣域诊断报告', '打开最新一轮可视化证据卡（诊断报告 + 底层数据双视图），查看通道类型、V1~V4 真伪评级、报错归因与原生硬证清单。'],
        ['复制一码通 · 验真短码', '一键生成离线防篡改诊断短码（LK77-...），含通道分类、4 位匿名域哈希（不泄露网址）、模型/指纹/耗时/报错码与 CRC 防篡改校验，方便贴群排障。'],
        ['解码一码通 / 公益站名单', '打开内置离线解码器（粘贴任意群聊消息自动抠码验签并翻译成人话），第二页可管理仅存本机的私有公益站白名单（只存不可逆哈希，绝不上传）。'],
        ['光波采样悬浮窗', '开启或关闭实时采样的悬浮小窗，边聊边看延迟、速率、思考与通道状态。'],
        ['真伪探针 · 渠道鉴伪 / 频段摸底 · 别名扫描', '「真伪探针」主动发极小探针测试当前渠道是否虚报模型；「频段摸底」扫描渠道支持的常见模型别名。'],
        ['光波横幅昭示', '开启或静默页面顶部的状态提示横幅。'],
        ['一键抢救上次断流', '从最近一次采样缓存中手动抢救断流未落盘的原始文本。'],
        ['导出圣域卷宗 / 复制排障信标', '导出近期采样记录文件，或复制含版本、环境与一码通的排障文本。'],
        ['重铸护盾 · 全量自检', '重新校验并挂钩拦截器，运行全套内置完整性自检。'],
        ['重置波长记忆 / 焚毁全部卷宗', '换渠道后点「重置波长记忆」重新学习速度基线；「焚毁全部卷宗」（4 秒内再点确认）清空全部历史日志。']
      ]
    }
  ],

  tiga: [
    {
      h: '作战波段与迪迦形态破甲',
      kv: [
        ['作战波段 · 话术适配（自动匹配 / 3.8F / 4A / 4C / 4H / 4N / 通用）', '按模型家族自动或手动切换最契合的话术模板；点击下方「保存并锁定方案」可持久锁死，随时可点「恢复自动匹配」。'],
        ['石像待机', '关闭正面破甲，不向请求体注入破甲文本或参数，只保留雷达监测。'],
        ['空中型', '轻装巡航：在请求副本最底附一条温和的虚构连载续写声明，不触碰预设主体与安全参数。'],
        ['复合型', '均衡推荐：挂载创作许可头与保底输出长度，不加稀释垫片，最大程度保留预设原味。'],
        ['强力型', '赤红刚力：启用统一委托块、连载续写头、行文口径并入末条 user（不额外增加 user 轮次）、Gemini 安全阈值放宽与稀释垫片。'],
        ['闪耀型', '黄金圣盾：汇聚强力型全集并加码中档稀释缓冲、全量话术清洗与底部独立续写护盾声明。']
      ]
    },
    {
      h: '终极圣域、幻影折射与细胞转换光束',
      kv: [
        ['◤ 诺亚 · 太古圣翼 ◢', '在全套破甲与五百条话术清洗之上执行「归位」：把 system 中易撞墙的对抗元话语重排至参考资料区，同时完整保留角色卡设定与状态栏。'],
        ['◤ 凝视深渊 · 终焉暗域 ◢', '最高强度「下沉接管」：将对抗段落整段下沉为 user 参考资料并保留干净设定，配合重档缓冲与字面护甲硬撼最严风控。'],
        ['◤ 破暗化光 · 纯文耀光 ◢', '位于诺亚与深渊正下方的终极纯文大键：不走工具通道（武装货舱与工具破甲自动让位），强制启用整包非 ASCII 全量 \\uXXXX 透明转译，并默认联动 540 词注音层与三枚零宽完整性探针（流尾一次性校验并干净剥离）；开启时触发「由暗转明 → 变回闪耀迪迦」圣殿演出，顶栏与 3D 桌宠同步化回闪耀黄金态。'],
        ['V6.2 注音层与完整性探针（自动护航）', '在「凝视深渊」或「破暗化光」下默认自动开启（可通过 cfg.zhuyin / cfg.canary 切换 auto/on/off 并持久保存）：注音层仅对自然语言段敏感词做注音替换（跳过代码块/XML标签/JSON键与JSONPatch路径），仅命中时单次附加读音说明；三枚不可见探针在响应流完整结束后一次性核验是否被篡改，并自动从正文中剥离零宽字符。'],
        ['🌙 幻影折射 · 隐语侧写', '位于终极圣域下方的柔光开关卡。开启后不改你的输入原文，仅附加行文口径指令：让亲密与高烈度段落改用文学侧写、动作、呼吸与意象代称呈现，留白优先于直写，大幅降低高墙误拦。'],
        ['细胞转换光束 · 传输转译（关闭 / 细胞转换 / 光粒子化 / 自动）', '在 JSON 传输层透明转为标准 \\uXXXX 绕过中转/WAF 明文关键词扫描，上游 JSON.parse 瞬间无损还原原字、0 额外思考 token 消耗。「细胞转换」仅转义 65 敏感词表（含 ASCII 词边界防误伤）；「光粒子化」将整包非 ASCII 字符全量转义；「自动」在强力型及以上启光粒子化、复合型启细胞转换。'],
        ['✦ 计时器光印 · 会话盐', '内嵌在细胞转换光束卡底部的开关。开启后自动在系统首行注入当前会话独立盐印（[Session-ID: SID-XXXX]）以隔离缓存前缀；关闭细胞转换光束时自动联动待机。']
      ]
    }
  ],

  cont: [
    {
      h: '能量续航 · 防半截断写与武装货舱',
      kv: [
        ['能量续航（关闭 / 续航叮嘱 / 自动接力）', '「关闭」不干预；「续航叮嘱」追加完整收尾引导但不自动续写；「自动接力」在检测到 MAX_TOKENS、半句卡断或 <lk_*> 结构标签未闭合时自动触发续写。'],
        ['收尾封印 · 禁仓促完结', '阻止模型在剧情未铺开时草率总结跳过过程或强行大结局。'],
        ['净界律令 · 禁文末自证', '禁止模型在文末输出字数统计、免责声明、合规自评等出戏尾注。'],
        ['追击请示 · 续写前确认', '开启时遇空回/断章先弹窗询问再补写；关闭则静默自动续写一次。'],
        ['记忆凝缩 · 旧轮单节折叠', '开启后在强力型及以上将较早历史 AI 楼层折叠为简短摘要，减轻超长上下文负担（只改请求副本，不动聊天记录）。'],
        ['武装货舱 · 独立圣柜信道交付', '通过函数调用参数（lk_write）完整封装正文与状态栏并流式解包，跨越常规截断障壁；遇不支持的渠道或非空预填自动回退常规续航。'],
        ['🔗 双轮工具链 / 🧥 外衣剥壳', '武装货舱的专属增强子开关：「双轮工具链」补一轮前置读入确认，提升 Gemini 兼容反代工具调用成功率；「外衣剥壳」在参数开头加中性校验头并在流式首包零延迟自动剥离。']
      ]
    },
    {
      h: '飞燕编队、时空回溯与单次手动战技',
      kv: [
        ['飞燕编队（编队待命 / 飞燕一号·省流 / 双机齐射·2路 / 胜利合体·3路）', '「飞燕一号·省流」自动精简负载并压低思考提速；「2路 / 3路」在晚高峰并发发出多路请求，谁先成功返回就采纳谁并撤回其余请求。'],
        ['逆风突围 · 503 自动重连', '遭遇上游 503 过载或瞬时波动时按退避间隔自动重连。'],
        ['时空回溯 · 异常自动重演（自动 PVP）', '面对 503 / 429 / 断流超时或破甲关闭时的空回自动退避重发；下方可设每轮重抽上限（1~3 次）、切换自动/手动调度、暂停自动重发、开启空回自动重抽。'],
        ['断流看门狗 · 首字超时重演 / 回溯时序罗盘', '「断流看门狗」在设定秒数内 0 字节返回时掐断重发（长思考模型慎开）；「回溯时序罗盘」可自定义看门狗秒数与退避等待时长。'],
        ['破甲追击 / 断章接力 / 原波重演', '形态破甲页底部的三枚手动战技按钮：分别立即触发一次手动破甲补写、手动接力续写半截正文、或原样重发上一轮，互不抢占自动配额。']
      ]
    }
  ],

  world: [
    {
      h: '叙事结界 · 防全知、去媚与反 OOC',
      kv: [
        ['迷雾结界 · 防角色读心（关闭 / 仅知在场事 / 禁跨场推理 / 绝对结界）', '防止 NPC 开天眼读心或事后倒补前文。「仅知在场事 / 禁跨场推理」保留正常心理描写；「绝对结界」增加双向隔离与动笔前盲区锚定。'],
        ['真实引力 · 去主角光环（关闭 / 角色独立作息 / 允许干脆拒绝 / 世界自主运转）', '去除无脑讨好与主角中心，让配角拥有独立日程、立场与真实拒绝逻辑。'],
        ['📦 贴脸包裹 · 近2轮意图三明治', '真实引力子开关（中/高档默认联动开启）：无痕包裹最近 2 轮玩家发言，将其降格为“可被打断或拒绝的单方尝试”，不改聊天记录。'],
        ['☠️ 致命后果 · 高危真实生死代价', '真实引力高危子开关（默认关闭）：取消免死光环，高危求生/硬核世界失误可导致重伤甚至阵亡。'],
        ['心灵之光 · 角色防跑偏（反 OOC）', '人设守护总闸。开启后可分别点亮「真名点校（核对世界书）」「净除套路（去油腻网文陈词）」「因果铺垫（禁态度突变）」「声纹锁定（口吻一致）」四项细则。'],
        ['设定隐匿 · 敏感词折射 / 正文显影 · 折射词还原', '在发送前对 system 设定段中的易误拦词做无损断词折射，收到正文后流式实时拼回原字。']
      ]
    },
    {
      h: '防卫设置 · 更新、范围、兼容、圆章与桌宠',
      kv: [
        ['光之星轨 · 云端自动更新（星轨共鸣 · 后台自动更新 / 星轨巡检）', '「星轨共鸣 · 后台自动更新」在打开酒馆时静默检测云端新版并自动无损写回（保留全部个人配置）；「星轨巡检」手动立即检查更新，写入后支持一键刷新或撤回旧版。'],
        ['雷达扫描范围 & 锁定光之国 · 仅巡检 Gemini', '按「全部模型 / 跳过关键词 / 仅扫关键词」过滤监测目标。特别提醒：使用 Claude、DeepSeek、Qwen 等非谷歌模型时，请关闭「锁定光之国 · 仅巡检 Gemini」。'],
        ['纯净正轨 · 放行外部插件', '开启后对记忆、生图、数据库等后台插件请求 7 层精准直通，绝不注入破甲也不污染主剧情路由统计。'],
        ['预设适配 · 破甲主导权（强权优先 / 礼让预设）', '「强权优先」由卢克破甲与结界全力接管；「礼让预设」在检测到预设自带破甲/防全知/工具载具时自动让路避重。'],
        ['侧边彩色计时器圆章 / 异动警报 / 归位计时器圆章', '分别控制侧边悬浮圆章显隐、抓到异常时是否自动弹证据卡、以及把拖偏的圆章复位到右侧边缘。'],
        ['3D 雕像桌宠 · 召唤 / 动效 / 透明度 / 大小 / 音效', '随当前皮肤切换 5 套 3D 透明雕像桌宠并联动形态觉醒演出；内置纯合成变身与红灯提示音（默认静音）。'],
        ['石像休眠 · 暂停全部挂钩 / 打开功能图鉴', '「石像休眠」一键卸载全部网络钩子用于快速排查冲突（日常保持正常）；「打开功能图鉴」随时展开本五页离线教程，支持顶部实时搜按键名。']
      ]
    }
  ]
};

function helpResolveTab(tab) {
  var def = HELP_TABS[0].k;
  if (!tab) return def;
  for (var i = 0; i < HELP_TABS.length; i++) {
    if (HELP_TABS[i].k === tab) return tab;
  }
  return def;
}

function helpTone(t) {
  var s = String(t == null ? '' : t);
  if (s.indexOf('澄澈蓝灯') === 0 || s.indexOf('仪式觉醒') === 0 || s.indexOf('交互手势') === 0) return 'a';
  if (s.indexOf('复合型') === 0 || s.indexOf('武装货舱') === 0 || s.indexOf('飞燕编队') === 0) return 'g';
  if (s.indexOf('红灯慢闪') === 0 || s.indexOf('特别提醒') >= 0 || s.indexOf('注意最高档') >= 0 || s.indexOf('休眠旁路') === 0) return 'y';
  return '';
}

function helpPageHTML(tab) {
  var k = helpResolveTab(tab);
  var list = HELP_PAGES[k] || HELP_PAGES[HELP_TABS[0].k];
  var h = '';
  for (var j = 0; j < list.length; j++) {
    var sec = list[j];
    var plain = [];
    if (sec.q) plain.push(sec.q);
    if (sec.h) plain.push(sec.h);
    if (sec.kv) for (var p = 0; p < sec.kv.length; p++) plain.push(sec.kv[p][0] + ' ' + sec.kv[p][1]);
    var ls = sec.q ? sec.a : sec.l;
    if (ls) for (var p2 = 0; p2 < ls.length; p2++) plain.push(ls[p2]);

    h += '<div class="ar6h-sec" id="ar6h-s' + j + '" data-txt="' + esc(plain.join(' ').toLowerCase()) + '">';
    if (sec.q) {
      h += '<div class="ar6h-q"><span class="ar6h-qm">Q</span>' + esc(sec.q) + '</div>';
      for (var a = 0; a < sec.a.length; a++) {
        h += '<div class="ar6h-l"><i class="ar6h-i"></i><span>' + esc(sec.a[a]) + '</span></div>';
      }
    } else {
      h += '<div class="ar6h-h"><b>' + (j + 1 < 10 ? '0' : '') + (j + 1) + '</b>' + esc(sec.h) + '</div>';
      if (sec.kv) {
        for (var t = 0; t < sec.kv.length; t++) {
          h += '<div class="ar6h-kv"><div class="ar6h-k">' + esc(sec.kv[t][0]) + '</div>' +
            '<div class="ar6h-v">' + esc(sec.kv[t][1]) + '</div></div>';
        }
      }
      if (sec.l) {
        for (var m = 0; m < sec.l.length; m++) {
          var tone = helpTone(sec.l[m]);
          h += '<div class="ar6h-l' + (tone ? ' ' + tone : '') + '">' +
            '<i class="ar6h-i"></i><span>' + esc(sec.l[m]) + '</span></div>';
        }
      }
    }
    h += '</div>';
  }
  h += '<div class="ar6h-none" id="ar6h-none" style="display:none">本页未搜到匹配内容，请尝试其它关键词或切换上方分栏。</div>';
  return h;
}

function helpText(tab) {
  var k = helpResolveTab(tab);
  var list = HELP_PAGES[k] || HELP_PAGES[HELP_TABS[0].k];
  var out = [];
  for (var j = 0; j < list.length; j++) {
    var sec = list[j];
    if (sec.q) {
      out.push('Q：' + sec.q);
      for (var a = 0; a < sec.a.length; a++) out.push(sec.a[a]);
      out.push('');
      continue;
    }
    out.push('【' + sec.h + '】');
    if (sec.kv) for (var t = 0; t < sec.kv.length; t++) out.push(sec.kv[t][0] + ' → ' + sec.kv[t][1]);
    if (sec.l) for (var m = 0; m < sec.l.length; m++) out.push(sec.l[m]);
    out.push('');
  }
  return out.join('\n').replace(/\n+$/, '') + '\n\n—— 卢克之光 V' + VERSION + ' · 功能图鉴 · 离线可用';
}

function helpCopy(tab) {
  var txt = helpText(tab);
  try {
    if (HOST.navigator && HOST.navigator.clipboard && HOST.navigator.clipboard.writeText) {
      HOST.navigator.clipboard.writeText(txt).then(function () { banner('已复制本页功能图鉴', 'ok'); }, function () { helpCopyFallback(txt); });
      return;
    }
  } catch (e) {}
  helpCopyFallback(txt);
}

function helpCopyFallback(txt) {
  try {
    var ta = DOC.createElement('textarea');
    ta.value = txt;
    ta.style.position = 'fixed';
    ta.style.left = '-9999px';
    DOC.body.appendChild(ta);
    ta.select();
    DOC.execCommand('copy');
    DOC.body.removeChild(ta);
    banner('已复制本页功能图鉴', 'ok');
  } catch (e) {
    banner('复制失败：请手动选中文字复制', 'warn');
  }
}

function helpVH() {
  var vv = (HOST.visualViewport && HOST.visualViewport.height) || HOST.innerHeight || 0;
  return Math.round(vv || 640);
}
function helpVW() {
  var vv = (HOST.visualViewport && HOST.visualViewport.width) || HOST.innerWidth || 0;
  return Math.round(vv || 390);
}
function helpIsMob() {
  try { return (typeof uiMode === 'function' && uiMode() === 'mobile'); } catch (e) { return false; }
}
function helpGeom(big, px, py) {
  var vw = helpVW(), vh = helpVH(), m = 8;
  var vvTop = (HOST.visualViewport && typeof HOST.visualViewport.offsetTop === 'number') ? Math.max(0, Math.round(HOST.visualViewport.offsetTop)) : 0;
  var w, h;
  var mob = helpIsMob();
  if (big) {
    w = Math.max(240, vw - m * 2);
    h = Math.max(180, vh - m * 2);
  } else if (mob) {
    w = Math.max(240, vw - 16);
    h = Math.max(180, Math.round(vh * 0.82));
  } else {
    w = Math.min(460, Math.max(260, vw - 24));
    h = Math.min(640, Math.round(vh * 0.86));
  }
  if (w > vw - m * 2) w = Math.max(200, vw - m * 2);
  if (h > vh - m * 2) h = Math.max(180, vh - m * 2);
  var x = (typeof px === 'number' && isFinite(px)) ? Math.round(px) : Math.round((vw - w) / 2);
  var y = (typeof py === 'number' && isFinite(py)) ? Math.round(py) : Math.round((vh - h) / 2);
  if (x < m) x = m;
  if (x > vw - w - m) x = Math.max(m, vw - w - m);
  if (y < m) y = m;
  if (y > vh - h - m) y = Math.max(m, vh - h - m);
  if (mob && vvTop > 0) y += vvTop;
  return { x: x, y: y, w: w, h: h, vw: vw, vh: vh };
}
function helpApplyGeom(node, force) {
  if (!node) return null;
  if (!force && node.getAttribute && node.getAttribute('data-ar6-geom') === '1') return null;
  var px = null, py = null;
  try {
    if (cfg) {
      if (typeof cfg.helpX === 'number' && isFinite(cfg.helpX)) px = cfg.helpX;
      if (typeof cfg.helpY === 'number' && isFinite(cfg.helpY)) py = cfg.helpY;
    }
  } catch (e0) {}
  var g = helpGeom(!!(cfg && cfg.helpBig), null, null);
  var x = g.x, y = g.y;
  try {
    node.style.position = 'fixed';
    node.style.margin = '0';
    node.style.maxWidth = 'none';
    node.style.maxHeight = 'none';
    node.style.minHeight = '0';
    node.style.width = g.w + 'px';
    node.style.height = g.h + 'px';
    if (!helpIsMob() && (px !== null || py !== null)) {
      var p = helpClampPos(node, px === null ? g.x : px, py === null ? g.y : py);
      x = p.x;
      y = p.y;
    }
    node.style.left = x + 'px';
    node.style.top = y + 'px';
    node.setAttribute('data-ar6-hg', x + ',' + y + ',' + g.w + ',' + g.h);
    node.setAttribute('data-ar6-geom', '1');
    g.x = x;
    g.y = y;
  } catch (e1) {}
  return g;
}
function helpClampPos(node, x, y) {
  var vw = helpVW(), vh = helpVH();
  var w = 0, h = 0;
  try { w = node.offsetWidth || 0; h = node.offsetHeight || 0; } catch (e0) {}
  if (!(w > 0)) w = parseInt(node.style && node.style.width, 10) || 320;
  if (!(h > 0)) h = parseInt(node.style && node.style.height, 10) || 240;
  var keep = 40;
  var minX = keep - w;
  var maxX = vw - keep;
  if (maxX < minX) maxX = minX;
  var minY = 0;
  var maxY = vh - 44;
  if (maxY < 0) maxY = 0;
  if (x < minX) x = minX;
  if (x > maxX) x = maxX;
  if (y < minY) y = minY;
  if (y > maxY) y = maxY;
  return { x: Math.round(x), y: Math.round(y) };
}
function helpHTML(tab) {
  var k = helpResolveTab(tab);
  var mob = helpIsMob();
  var big = !!(cfg && cfg.helpBig);
  var h = '';
  h += '<div id="ar6-help" role="dialog" aria-label="卢克之光功能图鉴" data-ar6-help="1" data-ar6-mob="' + (mob ? '1' : '0') + '">';
  h += '<style>' +
    '#ar6-help{--hbg:#080d18;--hcd:#162032;--hln:rgba(148,163,184,.38);--hfg:#f0f9ff;--hdim:#94a3b8;--hdim2:#64748b;--ha:#38bdf8;--hg:#34d399;--hy:#fcd34d;--hr:#f43f5e;' +
    'position:fixed;left:0;top:0;z-index:2147483550;' +
    'width:min(460px,calc(100vw - 24px));height:min(640px,86dvh);' +
    'display:flex;flex-direction:column;background:linear-gradient(180deg,#0f182b,#080d18);color:var(--hfg);' +
    'border:1.5px solid var(--hln);border-radius:16px;overflow:hidden;' +
    'box-shadow:0 20px 60px rgba(0,0,0,.72),0 0 0 1px rgba(56,189,248,.14);' +
    'font-family:system-ui,-apple-system,Segoe UI,"Microsoft YaHei",sans-serif}' +
    '#ar6-help,#ar6-help *{box-sizing:border-box;min-width:0}' +
    '#ar6-help button,#ar6-help input{font-family:inherit}' +
    '#ar6-help button{touch-action:manipulation}' +
    '#ar6-help[data-ar6-mob="1"]{width:calc(100vw - 16px);height:82dvh}' +
    '#ar6-help .ar6h-wrap{display:flex;flex-direction:column;width:100%;height:100%;overflow:hidden}' +
    '#ar6-help .ar6h-head{flex:0 0 auto;height:46px;display:flex;align-items:center;padding:0 6px 0 14px;' +
    'border-bottom:1px solid rgba(148,163,184,.26);background:linear-gradient(95deg,rgba(14,165,233,.2),rgba(15,24,43,.95));' +
    'cursor:grab;touch-action:none;user-select:none;-webkit-user-select:none}' +
    '#ar6-help[data-ar6-mob="1"] .ar6h-head{cursor:default;touch-action:manipulation}' +
    '#ar6-help .ar6h-head[data-ar6-drag="1"]{cursor:grabbing}' +
    '#ar6-help .ar6h-title{flex:1 1 auto;font-size:14px;font-weight:700;letter-spacing:.03em;color:#f8fafc}' +
    '#ar6-help .ar6h-x{flex:0 0 36px;width:36px;height:34px;padding:0;border:1px solid rgba(148,163,184,.3);background:rgba(22,32,50,.8);' +
    'color:#cbd5e1;font-size:15px;line-height:32px;text-align:center;cursor:pointer;border-radius:8px}' +
    '#ar6-help .ar6h-x:hover{border-color:#38bdf8;color:#f0f9ff;background:rgba(14,165,233,.22)}' +
    '#ar6-help .ar6h-top{flex:0 0 auto}' +
    '#ar6-help .ar6h-tabs{display:flex;gap:5px;padding:8px 10px 6px;overflow-x:auto;overflow-y:hidden;' +
    '-webkit-overflow-scrolling:touch;overscroll-behavior-x:contain;touch-action:pan-x;scrollbar-width:thin}' +
    '#ar6-help .ar6h-tab{flex:0 0 auto;padding:6px 10px;border-radius:8px;border:1px solid rgba(148,163,184,.34);' +
    'background:#162032;color:#94a3b8;font-size:12px;font-weight:600;cursor:pointer;white-space:nowrap}' +
    '#ar6-help .ar6h-tab.on{background:linear-gradient(135deg,#0284c7,#0369a1);border-color:#38bdf8;color:#f0f9ff;box-shadow:0 0 10px rgba(56,189,248,.28)}' +
    '#ar6-help .ar6h-hbar{display:none;height:10px;margin:0 10px 2px;border-radius:6px;background:rgba(255,255,255,.06);position:relative;touch-action:none;cursor:pointer;flex:0 0 auto}' +
    '#ar6-help .ar6h-hbar[data-none="0"]{display:block}' +
    '#ar6-help .ar6h-hbar[data-none="1"]{display:none}' +
    '#ar6-help .ar6h-hthumb{position:absolute;top:2px;left:0;height:6px;border-radius:4px;background:rgba(56,189,248,.45);min-width:28px}' +
    '#ar6-help .ar6h-find{display:flex;gap:6px;align-items:center;padding:6px 12px 8px}' +
    '#ar6-help .ar6h-in{flex:1 1 auto;padding:7px 10px;border-radius:8px;border:1px solid rgba(148,163,184,.32);' +
    'background:#0b1220;color:var(--hfg);font-size:12.5px;outline:none;font-family:inherit}' +
    '#ar6-help .ar6h-in:focus{border-color:#38bdf8}' +
    '#ar6-help[data-ar6-mob="1"] .ar6h-in{font-size:16px}' +
    '#ar6-help .ar6h-body{flex:1 1 0;min-height:0;overflow-y:auto;overflow-x:hidden;overscroll-behavior:contain;-webkit-overflow-scrolling:touch;padding:10px 14px;touch-action:pan-y;font-size:12.8px;line-height:1.72;scrollbar-width:thin}' +
    '#ar6-help .ar6h-sec{margin:0 0 15px;padding-left:10px;border-left:3px solid rgba(56,189,248,.38)}' +
    '#ar6-help .ar6h-h{display:flex;gap:7px;align-items:baseline;font-size:13.5px;font-weight:700;color:#f8fafc;margin:10px 0 7px}' +
    '#ar6-help .ar6h-h b{color:#38bdf8;font-size:11px;font-weight:700;font-variant-numeric:tabular-nums}' +
    '#ar6-help .ar6h-l{display:flex;gap:8px;font-size:12.8px;line-height:1.72;color:#cbd5e1;margin:4px 0}' +
    '#ar6-help .ar6h-l span{flex:1 1 auto;word-break:break-word;white-space:pre-wrap}' +
    '#ar6-help .ar6h-i{flex:0 0 6px;height:6px;margin-top:8px;border-radius:50%;background:#475569}' +
    '#ar6-help .ar6h-l.a .ar6h-i{background:var(--ha);box-shadow:0 0 6px var(--ha)}' +
    '#ar6-help .ar6h-l.g .ar6h-i{background:var(--hg)}' +
    '#ar6-help .ar6h-l.y .ar6h-i{background:var(--hy)}' +
    '#ar6-help .ar6h-kv{display:grid;grid-template-columns:.85fr 1.65fr;gap:8px;background:#162032;' +
    'border:1px solid rgba(148,163,184,.28);border-radius:9px;padding:7px 10px;margin:6px 0}' +
    '#ar6-help .ar6h-k{font-size:12.5px;font-weight:700;line-height:1.65;color:#7dd3fc;word-break:break-word;padding-right:8px;border-right:1px solid rgba(148,163,184,.2)}' +
    '#ar6-help .ar6h-v{font-size:12.5px;line-height:1.65;color:#e2e8f0;word-break:break-word}' +
    '#ar6-help .ar6h-none{font-size:12.5px;color:var(--hdim);padding:10px 2px}' +
    '#ar6-help .ar6h-foot{flex:0 0 auto;border-top:1px solid rgba(148,163,184,.24);background:#090f1d;padding:9px 14px calc(10px + env(safe-area-inset-bottom,0px))}' +
    '#ar6-help .ar6h-ver{font-size:11px;color:var(--hdim);margin-bottom:8px}' +
    '#ar6-help .ar6h-btns{display:flex;gap:8px}' +
    '#ar6-help .ar6h-b1,#ar6-help .ar6h-b2,#ar6-help .ar6h-b3{flex:1 1 0;height:38px;border-radius:8px;font-size:13px;font-weight:600;cursor:pointer;padding:0 12px}' +
    '#ar6-help .ar6h-b1{border:1px solid #38bdf8;background:#0c2d48;color:#f0f9ff}' +
    '#ar6-help .ar6h-b2,#ar6-help .ar6h-b3{border:1px solid rgba(148,163,184,.34);background:#162032;color:#cbd5e1}' +
    '</style>';
  h += '<div class="ar6h-wrap">';
  h += '<div class="ar6h-head" data-ar6-helphead="1">' +
    '<span class="ar6h-title">✦ 卢克之光 · 功能图鉴</span>' +
    '<button type="button" class="ar6h-x" data-ar6-card="close" title="关闭图鉴" aria-label="关闭图鉴">✕</button>' +
    '</div>';
  h += '<div class="ar6h-top"><div class="ar6h-tabs">';
  for (var j = 0; j < HELP_TABS.length; j++) {
    var on = HELP_TABS[j].k === k;
    h += '<button type="button" class="ar6h-tab' + (on ? ' on' : '') + '" data-ar6-card="tab" data-tab="' +
      HELP_TABS[j].k + '">' + esc(HELP_TABS[j].t) + '</button>';
  }
  h += '</div>';
  h += '<div class="ar6h-hbar"><div class="ar6h-hthumb"></div></div>';
  h += '<div class="ar6h-find"><input class="ar6h-in" id="ar6h-find" placeholder="在本页检索功能或关键词……" autocomplete="off" spellcheck="false"></div></div>';
  h += '<div class="ar6h-body" id="ar6h-body">' + helpPageHTML(k) + '</div>';
  h += '<div class="ar6h-foot"><div class="ar6h-ver">卢克之光 V' + esc(VERSION) + ' · 类脑社区免费开源 · 付费即受骗 · 严禁商业倒卖</div>' +
    '<div class="ar6h-btns">' +
    '<button type="button" class="ar6h-b1" data-ar6-card="copy">复制本页</button>' +
    (mob ? '<button type="button" class="ar6h-b3" data-ar6-card="big">' + (big ? '还原窗口' : '展开全幅') + '</button>' : '') +
    '<button type="button" class="ar6h-b2" data-ar6-card="close">关闭</button>' +
    '</div></div>';
  h += '</div></div>';
  return h;
}

function helpFilter(node) {
  try {
    var inp = node.querySelector('#ar6h-find');
    if (!inp) return;
    var q = String(inp.value || '').toLowerCase().replace(/^\s+|\s+$/g, '');
    var secs = node.querySelectorAll('.ar6h-sec');
    var hit = 0;
    for (var i = 0; i < secs.length; i++) {
      var txt = secs[i].getAttribute('data-txt') || '';
      var show = (!q || txt.indexOf(q) >= 0);
      secs[i].style.display = show ? '' : 'none';
      if (show) hit++;
    }
    var none = node.querySelector('#ar6h-none');
    if (none) none.style.display = (q && !hit) ? '' : 'none';
  } catch (e) {}
}

var HELP_NODE = null;
var HELP_TAB_CUR = 'entry';

function helpMount(html) {
  var holder = null;
  try { holder = DOC.createElement('div'); } catch (e0) { holder = null; }
  if (!holder) return null;
  try { holder.innerHTML = html; } catch (e1) { return null; }
  var body = DOC.body;
  if (!body) return null;
  var node = null;
  var guard = 0;
  while (holder.firstChild && guard++ < 20) {
    var c = holder.firstChild;
    try { holder.removeChild(c); } catch (e2) { break; }
    if (c && c.id === 'ar6-help') node = c;
    try { body.appendChild(c); } catch (e3) {}
  }
  if (!node) {
    try { node = DOC.getElementById('ar6-help'); } catch (e4) { node = null; }
  }
  return node;
}

function closeHelp() {
  var node = HELP_NODE;
  HELP_NODE = null;
  /* V5.0/V4.8：独立管理图鉴浮窗状态，绝不触碰或覆盖 CARD.open */
  if (!node) return;
  try { if (typeof node.__ar6HelpDragEnd === 'function') node.__ar6HelpDragEnd(); } catch (e1) {}
  try { if (typeof node.__ar6HBarCleanup === 'function') node.__ar6HBarCleanup(); } catch (e2) {}
  try { if (typeof node.__ar6HelpNodeCleanup === 'function') node.__ar6HelpNodeCleanup(); } catch (e4) {}
  try { if (node.parentNode) node.parentNode.removeChild(node); } catch (e3) {}
}

function helpScrollTab(node) {
  try {
    if (!node || !node.parentNode) return;
    var tabs = node.querySelector('.ar6h-tabs');
    if (!tabs) return;
    var on = tabs.querySelector('.ar6h-tab.on');
    if (!on) return;
    try {
      if (on.scrollIntoView) on.scrollIntoView({ inline: 'center', block: 'nearest' });
    } catch (e0) {
      try {
        var tr = tabs.getBoundingClientRect();
        var br = on.getBoundingClientRect();
        tabs.scrollLeft += (br.left - tr.left) - (tr.width - br.width) / 2;
      } catch (e1) {}
    }
    try { if (node.__ar6HBarSync) node.__ar6HBarSync(); } catch (e2) {}
  } catch (e) {}
}

function helpBindDrag(node) {
  if (!node || node.__ar6HelpDragBound) return;
  var head = node.querySelector('.ar6h-head');
  if (!head) return;
  node.__ar6HelpDragBound = 1;
  var on = false, moved = false, sx = 0, sy = 0, ox = 0, oy = 0, prevCursor = '';
  function down(e) {
    if (!e || on || helpIsMob()) return;
    if (typeof e.button === 'number' && e.button !== 0) return;
    var t = e.target;
    if (t && t.getAttribute && t.getAttribute('data-ar6-card')) return;
    var el = t, guard = 0;
    while (el && el !== head && guard++ < 8) {
      if (el.getAttribute && el.getAttribute('data-ar6-card')) return;
      el = el.parentNode;
    }
    var r = null;
    try { r = node.getBoundingClientRect ? node.getBoundingClientRect() : null; } catch (e0) {}
    on = true;
    moved = false;
    sx = e.clientX || 0;
    sy = e.clientY || 0;
    ox = (r && typeof r.left === 'number') ? r.left : (parseInt(node.style.left, 10) || 0);
    oy = (r && typeof r.top === 'number') ? r.top : (parseInt(node.style.top, 10) || 0);
    try {
      HOST.addEventListener('pointermove', move);
      HOST.addEventListener('pointerup', fin);
      HOST.addEventListener('pointercancel', fin);
    } catch (e4) {}
  }
  function move(e) {
    if (!on) return;
    var dx = (e.clientX || 0) - sx, dy = (e.clientY || 0) - sy;
    if (!moved) {
      if (Math.hypot(dx, dy) < 6) return;
      moved = true;
      try { node.setAttribute('data-ar6-drag', '1'); } catch (e1) {}
      try { head.setAttribute('data-ar6-drag', '1'); } catch (e2) {}
      try {
        if (DOC.body && DOC.body.style) {
          prevCursor = DOC.body.style.cursor || '';
          DOC.body.style.cursor = 'grabbing';
        }
      } catch (e3) {}
    }
    var g = helpClampPos(node, ox + dx, oy + dy);
    try { node.style.left = g.x + 'px'; node.style.top = g.y + 'px'; } catch (e0) {}
    try { node.setAttribute('data-ar6-hg', g.x + ',' + g.y + ',' + (node.offsetWidth || 0) + ',' + (node.offsetHeight || 0)); } catch (e1b) {}
    try { if (cfg) { cfg.helpX = g.x; cfg.helpY = g.y; } } catch (e2b) {}
    try { if (e.preventDefault) e.preventDefault(); } catch (e3b) {}
  }
  function fin() {
    if (!on) return;
    var wasMoved = moved;
    on = false;
    moved = false;
    if (wasMoved) { try { saveCfg(); } catch (e0) {} }
    try { HOST.removeEventListener('pointermove', move); } catch (e1) {}
    try { HOST.removeEventListener('pointerup', fin); } catch (e2) {}
    try { HOST.removeEventListener('pointercancel', fin); } catch (e3) {}
    if (wasMoved) {
      try { node.removeAttribute('data-ar6-drag'); } catch (e4) {}
      try { head.removeAttribute('data-ar6-drag'); } catch (e5) {}
      try { if (DOC.body && DOC.body.style) DOC.body.style.cursor = prevCursor; } catch (e6) {}
    }
  }
  head.addEventListener('pointerdown', down);
  node.__ar6HelpDragEnd = fin;
}

function helpBindHBar(node) {
  var wrap = node && node.querySelector('.ar6h-wrap');
  var tabs = node && node.querySelector('.ar6h-tabs');
  var bar = node && node.querySelector('.ar6h-hbar');
  var th = node && node.querySelector('.ar6h-hthumb');
  if (!wrap || !tabs || !bar || !th) return;
  if (node.__ar6HBarBound) {
    try { if (node.__ar6HBarSync) node.__ar6HBarSync(); } catch (eB) {}
    return;
  }
  node.__ar6HBarBound = 1;
  var on = false, sx = 0, start = 0, ov0 = 0, tw0 = 0, ww0 = 0;
  var ro = null, gone = false;
  function clamp01(v) { return v < 0 ? 0 : (v > 1 ? 1 : v); }
  function over() { return (tabs.scrollWidth || 0) - (tabs.clientWidth || 0); }
  function hideBar() { try { bar.setAttribute('data-none', '1'); } catch (e0) {} }
  function showBar() { try { bar.setAttribute('data-none', '0'); } catch (e1) {} }
  function sync() {
    try {
      if (!node.parentNode || !tabs.parentNode || !bar.parentNode) return;
      var ov = over();
      if (ov <= 1) { hideBar(); return; }
      showBar();
      var tw = bar.clientWidth || 0;
      var sw = tabs.clientWidth || 0;
      var cw = tabs.scrollWidth || 0;
      if (!(tw > 0) || !(sw > 0) || !(cw > 0)) return;
      var w = Math.max(28, tw * sw / cw);
      if (w > tw) w = tw;
      var travel = tw - w;
      if (travel < 4) { hideBar(); return; }
      th.style.width = w + 'px';
      th.style.left = (travel * (tabs.scrollLeft / ov)) + 'px';
    } catch (e2) {}
  }
  function thDown(e) {
    try {
      tw0 = bar.clientWidth || 0;
      ww0 = th.offsetWidth || 28;
      if (tw0 - ww0 < 4) return;
      on = true;
      sx = e.clientX || 0;
      start = tabs.scrollLeft || 0;
      ov0 = over();
      bar.setAttribute('data-drag', '1');
      if (th.setPointerCapture && e.pointerId != null) th.setPointerCapture(e.pointerId);
      if (e.preventDefault) e.preventDefault();
    } catch (e3) {}
  }
  function thMove(e) {
    if (!on) return;
    try {
      tabs.scrollLeft = start + ((e.clientX || 0) - sx) * ov0 / Math.max(4, tw0 - ww0);
      if (e.preventDefault) e.preventDefault();
    } catch (e4) {}
  }
  function thUp() {
    if (!on) return;
    on = false;
    try { bar.removeAttribute('data-drag'); } catch (e5) {}
  }
  function barDown(e) {
    if (!e || e.target === th) return;
    try {
      var ov = over();
      if (ov <= 1) return;
      var tw = bar.clientWidth || 0;
      var ww = th.offsetWidth || 28;
      if (tw - ww < 4) return;
      var r = bar.getBoundingClientRect ? bar.getBoundingClientRect() : null;
      if (!r) return;
      var ratio = clamp01(((e.clientX || 0) - r.left - ww / 2) / Math.max(4, tw - ww));
      var left = ratio * ov;
      if (tabs.scrollTo) tabs.scrollTo({ left: left, behavior: 'smooth' });
      else tabs.scrollLeft = left;
      if (e.preventDefault) e.preventDefault();
    } catch (e6) {}
  }
  function onScroll() { sync(); }
  function onResize() {
    if (gone) return;
    if (!node.parentNode) { cleanup(); return; }
    sync();
  }
  function cleanup() {
    if (gone) return;
    gone = true;
    try { if (ro && ro.disconnect) ro.disconnect(); } catch (e7) {}
    ro = null;
    try { tabs.removeEventListener('scroll', onScroll); } catch (e8) {}
    try { th.removeEventListener('pointerdown', thDown); } catch (e9) {}
    try { th.removeEventListener('pointermove', thMove); } catch (e10) {}
    try { th.removeEventListener('pointerup', thUp); } catch (e11) {}
    try { th.removeEventListener('pointercancel', thUp); } catch (e12) {}
    try { th.removeEventListener('lostpointercapture', thUp); } catch (e13) {}
    try { bar.removeEventListener('pointerdown', barDown); } catch (e14) {}
    try { HOST.removeEventListener('resize', onResize); } catch (e15) {}
  }
  th.addEventListener('pointerdown', thDown);
  th.addEventListener('pointermove', thMove);
  th.addEventListener('pointerup', thUp);
  th.addEventListener('pointercancel', thUp);
  th.addEventListener('lostpointercapture', thUp);
  bar.addEventListener('pointerdown', barDown);
  tabs.addEventListener('scroll', onScroll, false);
  try {
    if (HOST.ResizeObserver) {
      ro = new HOST.ResizeObserver(function () {
        if (!node.parentNode) { cleanup(); return; }
        sync();
      });
      ro.observe(tabs);
      ro.observe(wrap);
    } else {
      HOST.addEventListener('resize', onResize);
    }
  } catch (e16) {
    try { HOST.addEventListener('resize', onResize); } catch (e17) {}
  }
  node.__ar6HBarSync = sync;
  node.__ar6HBarCleanup = cleanup;
  sync();
  try { setTimeout(function () { if (node.parentNode) sync(); }, 0); } catch (e18) {}
}

function openHelp(tab) {
  try {
    var k = helpResolveTab(tab);
    HELP_TAB_CUR = k;
    closeHelp();
    var node = helpMount(helpHTML(k));
    if (!node) throw new Error('mount failed');
    HELP_NODE = node;
    try { helpApplyGeom(node); } catch (e2) {}
    try { helpBindDrag(node); } catch (e3) {}
    try { helpBindHBar(node); } catch (e4) {}
    var onInput = function () { helpFilter(node); };
    var onCardClick = function (ev) {
      var t = ev && ev.target;
      var el = t, act = '', guard = 0;
      while (el && el !== node && guard++ < 8) {
        if (el.getAttribute) {
          var a = el.getAttribute('data-ar6-card');
          if (a) { act = a; break; }
        }
        el = el.parentNode;
      }
      if (!act) return;
      if (act === 'tab') { openHelp(el.getAttribute('data-tab')); return; }
      if (act === 'copy') {
        helpCopy(k);
        try {
          var orig = el.getAttribute('data-ar6-label');
          if (!orig) { orig = el.textContent || '复制本页'; el.setAttribute('data-ar6-label', orig); }
          el.textContent = '已复制';
          setTimeout(function () {
            try { el.textContent = orig; } catch (eT) {}
          }, 1200);
        } catch (eC) {}
        return;
      }
      if (act === 'big') {
        try { cfg.helpBig = !cfg.helpBig; cfg.helpX = null; cfg.helpY = null; saveCfg(); } catch (eB) {}
        openHelp(HELP_TAB_CUR || k);
        return;
      }
      if (act === 'close') closeHelp();
    };
    node.addEventListener('input', onInput);
    node.addEventListener('click', onCardClick);
    var onHelpVp = function () {
      try {
        if (!node.parentNode) return;
        if (helpIsMob() || (HOST.visualViewport && node.offsetHeight > helpVH() - 16)) {
          helpApplyGeom(node, true);
        }
      } catch (eHV) {}
    };
    try { HOST.addEventListener('resize', onHelpVp); } catch (eHR) {}
    try {
      if (HOST.visualViewport && HOST.visualViewport.addEventListener) {
        HOST.visualViewport.addEventListener('resize', onHelpVp);
        HOST.visualViewport.addEventListener('scroll', onHelpVp);
      }
    } catch (eHVV) {}
    node.__ar6HelpNodeCleanup = function () {
      try { node.removeEventListener('input', onInput); } catch (eN0) {}
      try { node.removeEventListener('click', onCardClick); } catch (eN1) {}
      try { HOST.removeEventListener('resize', onHelpVp); } catch (eN2) {}
      try {
        if (HOST.visualViewport) {
          HOST.visualViewport.removeEventListener('resize', onHelpVp);
          HOST.visualViewport.removeEventListener('scroll', onHelpVp);
        }
      } catch (eN3) {}
    };
    try { setTimeout(function () { helpScrollTab(node); }, 0); } catch (e5) {}
  } catch (e) {
    try { banner('功能图鉴渲染失败：' + String((e && e.message) || e), 'bad'); } catch (e2) {}
  }
}
