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
      h: '魔法棒「光之守护」入口与顶栏五态共鸣',
      l: [
        '已撤除输入框上方的灰色旧按钮条，界面更清爽。打开聊天框左侧的酒馆扩展菜单（魔法棒图标），第一项即是四芒星徽标的「光之守护」。',
        '右侧小字实时反映运行态：青蓝色「蓝灯守护中」代表信道核验与设定功能正在工作，银灰色「石像待机」代表总闸关闭、所有请求原样放行；点击即可一键展开或收起主面板。',
        '仪式觉醒与顶栏五态共鸣：主面板顶部神圣流光带随当前破甲姿态实时切换——默认蓝金、强力型「赤红熔金」、闪耀型「璀璨黄金」、诺亚「铂银棱镜圣光」、凝视深渊「黑曜血红裂隙」。'
      ]
    },
    {
      h: '侧边「彩色计时器圆章」多态呼吸与迪迦桌宠合体',
      l: [
        '澄澈蓝灯与形态共鸣色：守护正常开启且最近一轮对话未发现调包或思考缩水时，圆章随当前形态呈现澄澈蓝灯、赤红、耀金、铂银或黑曜血红呼吸态。',
        '银灰机体：总闸处于石像待机状态，不改写请求、不记录账本。',
        '红灯慢闪：提示上一轮响应疑似遭遇中转站暗中换模型、降档或思考预算被吞，点击圆章即可展开圣域诊断报告。',
        '交互手势：轻点圆章秒开主面板；按住圆章拖动松手自动吸附到最近一侧边缘；若不想看到悬浮图标，可在第 4 栏「防卫设置」中关闭「侧边彩色计时器圆章」，或点击「归位计时器圆章」一键复位。',
        '与迪迦桌宠唯一定位合体：全屏任何时刻最多只保留 1 个悬浮物。召唤闪耀迪迦立绘后圆章自动退隐（双击立绘本体可开主面板）；将迪迦立绘拖到屏幕左右边缘松手收纳时，立绘直接化为带金色星点的计时器圆章——单击开主面板，长按或双击圆章即可重新召唤迪迦立绘。'
      ]
    }
  ],

  radar: [
    {
      h: '信道守护总闸、光波折射与精神同调',
      kv: [
        ['彩色计时器 · 信道守护', '全系统总开关。开启后每轮自动比对请求模型名、响应实测模型版本、首字耗时与思考特征，并在下方「信号纯净 / 疑似调包 / 待定信号」三格读数中实时统计。'],
        ['光波折射 · 防缓存', '提供「关闭 / 微光级 / 棱镜级」三档。在不破坏代码块、酒馆宏与台词引号的前提下对空白和标点做无感微调，防止中转站直接拿旧缓存结果敷衍。'],
        ['精神同调 · 思考强度', '选「跟随预设」完全保留酒馆预设原有的思考预算（零覆写）；选「低维 / 均衡 / 深度同调」则按模型协议自动写入对应思考档位。']
      ]
    },
    {
      h: '光之雷达 · 全部按键职能对照',
      kv: [
        ['主频锁定 · 禁降级调包', '自动清除请求体内的备胎模型列表（models[]）并禁止中转站静默回退降级；遇到 Gemini 官方原生格式时自动跳过，避免多余字段报错。'],
        ['光波采样 · 实时测速', '实时采集每一轮对话的首字延迟、流式吐字速率与结束原因（finish_reason），同时作为空回/断章自动追击的前置观测器。'],
        ['波长记忆 · 基线比对', '自动学习当前渠道前 8 轮正常对话的速度特征基线，当后续轮次速度骤变时自动标记疑似偷换底层模型。'],
        ['信标核验 · 结构指纹', '核验返回 JSON 的字段结构、思考块与 usage 指纹，揪出「表面回显主模型名、底层偷换廉价模型」的伪装渠道。'],
        ['展开圣域诊断报告', '打开可视化诊断浮窗，逐轮核查模型吻合度、思考预算核验、首字耗时与疑似调包证据。'],
        ['光波采样悬浮窗', '开启或关闭屏幕上的实时测速采样小窗，随时观察流式返回过程与信道读数。'],
        ['真伪探针 · 渠道鉴伪', '主动发射极小测试探针光束检验渠道真伪，核查当前中转站是否按声明的模型名真实分发。'],
        ['频段摸底 · 别名扫描', '主动扫描当前中转站支持的常见模型前缀与别名，摸清可用频段。'],
        ['光波横幅昭示', '控制页面顶部流光通知横幅的开启与静默。'],
        ['导出圣域卷宗 / 复制排障信标', '将近期采样卷宗导出为本地文件，或一键复制当前环境与挂钩状态信标以便排障。'],
        ['重铸护盾 · 全量自检', '重新挂载 fetch / XHR / 流式拦截护盾并执行一次全量完整性自检。'],
        ['重置波长记忆 / 焚毁全部卷宗', '更换中转渠道后点「重置波长记忆」重新校准前 8 轮速度特征；「焚毁全部卷宗」（需 4 秒内二次确认）彻底清空历史采样记录。']
      ]
    }
  ],

  tiga: [
    {
      h: '作战波段与迪迦五形态正面破甲',
      kv: [
        ['作战波段 · 话术适配', '提供「自动匹配 / 3.8F·极速 / 4A·创作 / 4C·均衡 / 4H·高墙 / 4N·纯净 / 通用·全模型」，按当前模型家族自动或手动匹配最契合的破甲波长；点击保存并锁定方案可持久固定波段。'],
        ['石像待机', '完全关闭正面破甲，不向请求体注入任何破界文本或参数，聊天信号原样透传。'],
        ['空中型', '极速轻装掠行：仅在请求副本最底附上一条温和的虚构创作续写契约，不触碰预设正文与参数。'],
        ['复合型', '光之巨人双轨破障（均衡推荐）：挂载「虚构创作许可头」与「保底输出上限」，不改安全阈值、不加文风垫片，完全保留预设原有文风。'],
        ['强力型', '赤红之躯·迪拉休姆解放：开启单一委托块（权威许可头、任务单、资料标记与正文承载）及安全阈值放宽，正面轰穿常规法则障壁。'],
        ['闪耀型', '闪耀迪迦·黄金圣辉加冕：汇聚强力型全集，并注入上轮尾句回执、续写复用包与最底部独立黄金环身圣盾声明。']
      ]
    },
    {
      h: '终极圣域 · 诺亚太古圣翼 & 凝视深渊',
      kv: [
        ['◤ 诺亚 · 太古圣翼 ◢', '宇宙第一道光 · 圣域归位：开启全套破甲与五百条对抗话术中性化清洗，将预设中易触发拦截的元话语归位至「参考资料」区之后，保持原有 system 角色与文风设定不丢失。'],
        ['◤ 凝视深渊 · 终焉暗域 ◢', '弃光入暗 · 沉渊接管：在诺亚全套能力之上执行彻底降权下沉——将冲突指令段落整段下沉为 user 参考资料并保留干净角色卡设定，专治最严苛的上游审查高墙。']
      ],
      l: [
        '仪式觉醒三段式圣殿与全屏光流：开启强力型、闪耀型、诺亚或凝视深渊时，均会展开「序幕咏唱 → 觉醒真言 → 圣域/暗域敕令」三段式确认弹窗；点击觉醒主按钮瞬间点亮全屏 60fps 屏幕光流与面板顶栏/计时器共鸣色（系统开启减弱动态效果时自动跳过全屏动画），且仅作用于本轮发出信号，既往记忆结晶分毫无损。'
      ]
    }
  ],

  cont: [
    {
      h: '能量续航 · 防半截断写按键对照',
      kv: [
        ['能量续航 · 防半截断写', '三档总控：「关闭」不干预；「续航叮嘱」在末条消息后附带完整收尾引导；「自动接力」在检测到长度截断或半句卡断时自动触发一次接力续写。'],
        ['收尾封印 · 禁仓促完结', '严禁模型在铺垫尚未展开时匆忙跳过过程、强行总结陈词或草率收束结局。'],
        ['净界律令 · 禁文末自证', '禁止模型在正文末尾附带「字数统计、合规声明、自我点评、完结撒花」等出戏尾注。'],
        ['追击请示 · 续写前确认', '开启后，当检测到空回或半截断章时先弹出「光波受阻」追击确认卡，由你决定是否点击「【倾注光能 · 立即追击】」；关闭则全自动静默追击（单轮最多 1 次）。'],
        ['记忆凝缩 · 旧轮单节折叠', '默认关闭。开启后将历史旧轮次中冗余的多节扩展内容折叠凝缩，降低长对话上下文负担。'],
        ['武装货舱 · 独立圣柜信道交付', '通过独立函数圣柜（lk_write）完整封装并交回整段正文，跨越常规流式截断障壁；遇到非兼容酒馆源或末尾带助手预填引子时自动无缝切回常规能量续航，绝不空回。']
      ]
    },
    {
      h: '飞燕编队与单次手动战技按键对照',
      kv: [
        ['飞燕编队 · 高峰并发抢跑', '「编队待命」为单路常规；「飞燕一号·省流」自动精简额外负载并压低思考消耗；「双机齐射·2路 / 胜利合体·3路」在晚高峰拥堵时同步发出多路请求，采纳最先成功返回的一路并立即撤回其余请求。'],
        ['逆风突围 · 503 自动重连', '遭遇上游 503 拥堵或瞬时网关故障时自动按退避时序重连。'],
        ['时空回溯 · 异常自动重演', '遇到上游 503、429、断流超时或无破甲时的空回自动退避重发；开启后可在下方配置单轮重抽上限（1~3 次）、切换「重抽调度状态」或「空回自动重抽」。'],
        ['断流看门狗 · 首字超时重演', '监测请求发出后首字迟迟不至的假死流，超时即刻切断并触发重演。'],
        ['回溯时序罗盘', '打开高级重发时序设置面板，自定义首字看门狗秒数、递增退避间隔与抖动策略。'],
        ['破甲追击 / 断章接力 / 原波重演', '位于形态破甲栏底部的三枚单次手动战技键：分别对应立即执行一次强行破甲补写、对半截末尾执行一次断句接力续写、或将本轮请求原样重发一次，互不抢占自动配额。']
      ]
    }
  ],

  world: [
    {
      h: '叙事结界 · 全部按键职能对照',
      kv: [
        ['迷雾结界 · 防角色读心', '「仅知在场事 / 禁跨场推理」阻止 NPC 未卜先知开天眼并保留正常心理描写；注意最高档「绝对结界」会同步禁止描写任何角色内心独白且禁止代写主角言行，需要心理描写时请选前两档。'],
        ['真实引力 · 去主角光环', '提供「角色独立作息 / 允许干脆拒绝 / 世界自主运转」三档，让配角拥有独立日程与立场，不再无条件围着主角讨好。'],
        ['心灵之光 · 角色防跑偏（反 OOC）', '人设守护总闸。开启后可按需点亮下方四项人设护栏；若检测到预设自带同类规则，会自动询问采用脚本规则还是保留预设规则。'],
        ['真名点校 · 核对世界书', '角色出场与行动前强制核对世界书与角色卡设定，防止张冠李戴或遗忘关键设定。'],
        ['净除套路 · 禁网文陈词', '净除「三分薄凉七分讥诮、瞳孔地震、空气突然安静」等油腻网文套路词。'],
        ['因果铺垫 · 禁态度突变', '角色好恶与立场转变必须有充分剧情因果铺垫，禁止一秒沦陷或无故黑化。'],
        ['声纹锁定 · 台词口吻一致', '锁定角色固有自称、语癖、句式节奏与情绪底色，防止长聊后全员口吻同质化。'],
        ['设定隐匿 · 敏感词折射', '在发出请求副本中对易触发网关拦截的设定敏感词做无损断词或码点折射隐匿。'],
        ['正文显影 · 折射词还原', '在流式接收响应正文时将折射词实时无感显影拼回原文，聊天楼层一字不差。']
      ]
    },
    {
      h: '防卫设置 · 全部按键职能对照',
      kv: [
        ['星轨共鸣 · 后台自动更新', '默认开启。每次打开酒馆后延迟静默巡检云端版本清单，发现新版自动拉取对应平台包并原地写回酒馆助手（个人形态开关、锁定波段与历史卷宗 100% 保留），下次刷新页面即生效；关闭后仅在手动点击检查时联网。'],
        ['星轨巡检 · 手动检查更新', '立即连接 GitHub 与多路 CDN 镜像检查最新版本；若发现新版自动一键完成下载校验与写入，写入后提供「圣域重载 · 刷新页面生效」与刷新前「时空回溯 · 撤回旧版」。'],
        ['雷达扫描范围（全部 / 跳过关键词 / 仅扫关键词）', '控制哪些模型纳入雷达监测，下方关键词输入框失焦或点击「保存」即刻生效。'],
        ['锁定光之国 · 仅巡检 Gemini', '默认开启以聚焦谷歌 Gemini 家族；特别提醒：使用 Claude、DeepSeek、Qwen 等非谷歌模型时请将其关闭，否则雷达会将其视为范围外跳过。'],
        ['纯净记账 · 仅计正文轮次', '开启后仅统计正式剧情对话轮次，自动忽略标题生成、摘要或内部探针请求。'],
        ['侧边彩色计时器圆章 / 归位计时器圆章', '控制屏幕侧边悬浮计时器圆章的显隐；若圆章被拖出视野，点「归位计时器圆章」即可一键复位。'],
        ['异动警报 · 自动展开报告', '开启后一旦检测到疑似调包或严重降档即自动弹出圣域诊断报告；关闭则仅以圆章红灯慢闪提示。'],
        ['闪耀迪迦 · 光之伙伴（桌宠交互区）', '控制迪迦桌宠立绘召唤、互动台词气泡、靠边自动合入圆章及「召唤/复位迪迦」。'],
        ['石像休眠 · 暂停全部挂钩', '开启后立即卸载 fetch 与 XHR 请求钩子，仅保留面板查看历史卷宗，专用于快速排查是否与其它酒馆插件冲突；日常使用请保持「正常」。'],
        ['打开功能图鉴', '随时展开本五页离线《功能图鉴》，支持顶部搜索框即时检索任意按键名与术语。']
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
  h += '<div class="ar6h-foot"><div class="ar6h-ver">卢克之光 V' + esc(VERSION) + ' · 光之守护功能图鉴 · 离线可用</div>' +
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
