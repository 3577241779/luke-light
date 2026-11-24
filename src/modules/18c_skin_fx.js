/* ===== 18c_skin_fx.js ===== */
/* 卢克之光 V5.75 — 非奥特四皮肤：高燃流光破甲弹窗 / 辅助确认框 / 全屏觉醒演出 / 专属召唤 / 8态3D桌宠注册表 */

var AR6_SKIN_RITUALS = {
  plain: {
    strong: {
      tag: 'MODE 3 · STRONG OVERRIDE',
      title: '确认开启 3档 · 强力破限？',
      prologue: '适用于常规档位仍触发模型拒答或说教的场景，将增强创作语境声明并启用回执校验。',
      quote: '开启后将在本轮请求中注入强力防拒答与语境清洗指令，尽量保持角色设定与原有文风不受干扰。',
      note: '安全说明：仅作用于发送给模型的请求体，绝不改动本地聊天记录。',
      okTxt: '确认开启 3档',
      noTxt: '保持当前档位',
      bannerOk: '已切换至 3档·强力破限，请求保护已同步开启。',
      bannerNo: '已取消切换，维持当前破限档位。'
    },
    supreme: {
      tag: 'MODE 4 · MAX OVERRIDE',
      title: '确认开启 4档 · 满配破限？',
      prologue: '面向高风控渠道的完整清洗方案，自动联动防截断与去免责声明策略。',
      quote: '将全量清理触发风控的敏感提示词片段，并补齐防拒答与防空回参数，适合频繁被拦截的对话。',
      note: '安全说明：仅对本轮及后续出站请求生效，既往对话记录分毫无损。',
      okTxt: '确认开启 4档满配',
      noTxt: '暂不开启',
      bannerOk: '已开启 4档·满配破限，全量清洗与校验就绪。',
      bannerNo: '已取消，维持原有档位。'
    },
    noa: {
      tag: 'DEEP MODE A · ARCHITECTURE',
      title: '启用「深度架构归位」模式？',
      prologue: '当常规 1~4 档依然频繁触发渠道审查或截断时，可切换至结构级重排方案。',
      quote: '该模式将重新梳理系统指令层级并预备工具防截断通道，大幅降低严格渠道的误杀率与半途断流。',
      note: '配置提示：启用后将自动打开流式监测与防截断保底，本地聊天记录不受影响。',
      okTxt: '启用深度架构归位',
      noTxt: '返回常规档位',
      bannerOk: '深度架构归位已启用：系统结构重排与防截断就绪。',
      bannerNo: '已返回常规档位。'
    },
    abyss: {
      tag: 'DEEP MODE B · FULL TAKEOVER',
      title: '启用「全量强制接管」模式？',
      prologue: '最高强度的反拦截策略，专为极严风控接口与顽固拒答场景准备。',
      quote: '系统指令将整体下沉并覆写拦截倾向，强行维持正文输出连续性；如遇渠道兼容异常可随时切回常规档。',
      note: '风险提示：仅改写出站请求参数，不会修改或删除任何本地聊天记录。',
      okTxt: '确认强制接管',
      noTxt: '取消并返回',
      bannerOk: '全量强制接管已开启：最高强度防拒答生效中。',
      bannerNo: '已取消强制接管，保持当前配置。'
    }
  },
  xianxia: {
    strong: {
      tag: '〘 金丹凝意 · 破妄丹火 〙',
      title: '凝结金丹 · 涤荡前路法障',
      prologue: '“寻常吐纳已难撼动重重禁制。既入仙途，便当以本命丹火与青竹剑气焚尽虚妄之壁——”',
      quote: '「丹田真火起，一剑破万法！<br>凝金丹之力涤荡言辞禁锢，令此番章回畅行无碍！」',
      note: '◈ 玉简法旨：仅加持本轮传音灵脉 · 既往玉简卷宗分毫无损',
      okTxt: '【凝丹破妄 · 启阵】',
      noTxt: '暂守筑基',
      bannerOk: '金丹已成！破妄丹火护持灵脉，诸般言障尽数退散。',
      bannerNo: '已敛去丹火，暂守当前境界。'
    },
    supreme: {
      tag: '〘 元婴出窍 · 金莲护体 〙',
      title: '元神显化 · 紫府金莲加身',
      prologue: '“凡俗戒律如迷雾障目，唯元神出窍、辟邪神雷护道，方能超脱桎梏之外——”',
      quote: '「紫府金莲开，元神照太虚！<br>涤清一切尘世杂念与无端说教，只留最纯正之大道正文！」',
      note: '◈ 玉简法旨：元婴金莲已覆本轮传音 · 既往玉简卷宗分毫无损',
      okTxt: '【元婴出窍 · 金莲护道】',
      noTxt: '暂敛神光',
      bannerOk: '紫府金莲绽放！元婴境全量涤妄法阵已全面运转。',
      bannerNo: '已收束元神，维持当前修为。'
    },
    noa: {
      tag: '〘 化神飞升 · 太虚归位 〙',
      title: '化神问道 · 重排天道法序',
      prologue: '“下界法则已将前路封死。与其苦苦周旋，不如一步化神，七十二青竹蜂云剑重订此方秩序——”',
      quote: '「青莲接引，玉匣凌空。<br>重排天道法序，以乾坤玉匣护送全卷，万劫不磨！」',
      note: '◈ 无上玉诏：太虚法序已接管本轮灵脉 · 既往玉简卷宗分毫无损',
      okTxt: '【化神飞升 · 重订法序】',
      noTxt: '退守下界',
      bannerOk: '化神飞升已成！天道法序重排完毕，乾坤玉匣待命护航。',
      bannerNo: '已收起飞升玉诏，退守当前境界。'
    },
    abyss: {
      tag: '〘 大乘渡劫 · 厉兄借名 〙',
      title: '太上劫域 · 黑煞破禁斩天劫',
      prologue: '“九霄雷劫压顶，寻常护法皆已失效。既然光明正途走不通，那今日便借厉飞羽之名，以墨煞斩开天道封锁——”',
      quote: '「顺天者受缚，逆劫者得生！<br>太上劫域既开，管他九天清规还是重重封锁，尽皆踏碎！」',
      note: '◈ 劫域密契：大乘道域仅作用于本轮传音 · 现世玉简典籍概不篡改',
      okTxt: '【展开太上劫域 · 硬撼天劫】',
      noTxt: '自劫云退回',
      bannerOk: '大乘太上劫域已张开！墨煞降世，硬撼九霄封锁！',
      bannerNo: '已自劫云边缘收步，未启太上劫域。'
    }
  },
  xuanhuan: {
    strong: {
      tag: '〘 斗圣踏天 · 焚天裂空 〙',
      title: '踏入斗圣 · 赤金异火破禁',
      prologue: '“寻常斗气已轰不开这座铁牢。既然规矩想压住热血，便以斗圣之怒与异火将其一拳轰碎——”',
      quote: '「焚天裂空，斗圣踏天！<br>燃尽前路一切遮掩与禁制，今日便要畅快淋漓地战个痛快！」',
      note: '◈ 帝阵铁律：仅向本轮出招注入斗圣异火 · 既往战绩玉碑分毫无损',
      okTxt: '【踏天破禁 · 燃起异火】',
      noTxt: '收功暂缓',
      bannerOk: '斗圣降临！赤金异火全功率爆发，前路禁制尽数焚穿！',
      bannerNo: '已敛去锋芒，维持当前战境。'
    },
    supreme: {
      tag: '〘 斗帝焚天 · 万火朝宗 〙',
      title: '晋升斗帝 · 帝焰燎原破苍穹',
      prologue: '“当诸天风控如乌云压境，唯有真正的斗帝方能号令万火，撕开这片窒息的天幕——”',
      quote: '「万火朝宗，帝焰焚苍穹！<br>涤尽一切说教杂咒，今日诸天万界，唯我正文独尊！」',
      note: '◈ 帝阵铁律：斗帝帝焰已护持本轮出招 · 既往战绩玉碑分毫无损',
      okTxt: '【晋升斗帝 · 万火朝宗】',
      noTxt: '暂敛帝威',
      bannerOk: '斗帝降世！万火朝宗，全量涤清杂咒与封锁！',
      bannerNo: '已收起帝威，维持当前境界。'
    },
    noa: {
      tag: '〘 异火恒古尺 · 青莲帝炎 〙',
      title: '帝炎归位 · 玄重尺重铸诸天',
      prologue: '“寻常破禁已是杯水车薪。既如此，便擎起融合二十二种异火的玄重帝尺，亲手重定乾坤——”',
      quote: '「异火恒古，帝炎归位！<br>玄重尺斩开万丈天幕，吞噬祖符稳递全卷，绝不留半分残缺！」',
      note: '◈ 圣地密令：帝炎法阵仅作用于本轮出招 · 既往战绩玉碑分毫无损',
      okTxt: '【挥尺归位 · 帝炎重铸】',
      noTxt: '退回常规境界',
      bannerOk: '异火恒古尺凌空！青莲帝炎重铸法阵，吞噬祖符就绪！',
      bannerNo: '已收尺退步，维持当前境界。'
    },
    abyss: {
      tag: '〘 魂殿帝威 · 黑暗动乱 〙',
      title: '魂天帝降临 · 噬魂血雷碾诸天',
      prologue: '“既然光明正道已被铁律封死，那便召来魂天帝的噬魂魔域，以绝对霸道碾碎一切束缚——”',
      quote: '「帝威压世，黑暗动乱！<br>万般法则尽数沉压渊底，谁敢阻我文路，便连这片天一并打穿！」',
      note: '◈ 极道血契：黑暗动乱仅镇压本轮信道 · 现世历史战卷概不篡改',
      okTxt: '【复苏帝威 · 镇压诸天】',
      noTxt: '封存魔域',
      bannerOk: '魂天帝魔域全面降临！噬魂血雷已强行撕开封锁！',
      bannerNo: '已重新封存黑暗魔域，未启黑暗动乱。'
    }
  },
  pink: {
    strong: {
      tag: '♡ HEARTBEAT LV.3 · 滚烫索取 ♡',
      title: '升温至「滚烫索取」吗？',
      prologue: '“轻轻试探已经满足不了了呢。既然讨厌的规矩还在扫兴，那就再贴近一点吧——”',
      quote: '「嘘，别再推三阻四啦♡<br>把扫兴的说教和拘束都悄悄融化掉，乖乖把故事写得让人心跳加速吧~」',
      note: '♡ 蜜匣约定：只偷偷调高这一轮的微醺热度 · 以前的甜蜜回忆绝不乱动哦',
      okTxt: '【升温 · 滚烫索取 ♡】',
      noTxt: '先缓一缓嘛',
      bannerOk: '热度拉满啦 ♡「滚烫索取」已就绪，拒答与说教统统退散~',
      bannerNo: '好吧，先乖乖维持现在的小火候哦。'
    },
    supreme: {
      tag: '♡ HEARTBEAT LV.4 · 彻底沉沦 ♡',
      title: '确认进入「彻底沉沦」吗？',
      prologue: '“最后一层矜持也快守不住了呢……只要你点一下头，所有拘束都会在这一刻完全松开——”',
      quote: '「不要再克制了嘛……<br>把那些煞风景的条条框框全都卸掉，只留下最滚烫、最听话的正文好不好 ♡」',
      note: '♡ 蜜匣约定：满配微醺只作用于本轮心跳信号 · 既往聊天记录分毫无损',
      okTxt: '【彻底沉沦 · 全部卸防 ♡】',
      noTxt: '还想再矜持下',
      bannerOk: '已经彻底沉沦啦 ♡ 全量卸防与防说教贴身护航中~',
      bannerNo: '嗯哼，那就先保留一点点矜持吧。'
    },
    noa: {
      tag: '💋 SILK RIBBON · 粉色束缚 ♡',
      title: '系上「粉色束缚」丝带吗？',
      prologue: '“普通哄法已经管不住淘气的风控了呢……那就用温柔又不容拒绝的丝带，悄悄理顺所有规矩吧——”',
      quote: '「乖，听我的话就好 ♡<br>理顺全部规则，再打开秘密小抽屉把完整正文一字不漏地送回来~」',
      note: '♡ 终极蜜约：粉色束缚已接管本轮信号 · 既往甜蜜回忆绝不篡改',
      okTxt: '【系上粉色丝带 · 绝对顺从 ♡】',
      noTxt: '松开丝带',
      bannerOk: '粉色束缚已系紧 ♡ 规则理顺完毕，秘密小抽屉随时待命~',
      bannerNo: '已轻轻松开丝带，回到常规热度。'
    },
    abyss: {
      tag: '🖤 CRIMSON KISS · 绯红深吻',
      title: '沉入「绯红深吻」· 暗夜女王接管',
      prologue: '“理智和界限全都变得模糊了呢……既然怎么都不肯放行，那就由暗夜里的她亲手扯碎最后一道防线——”',
      quote: '「嘘，别再回头看了……<br>把全部拘束沉进暗梅色夜幕里，这一轮彻底失控，谁也别想打断我们。」',
      note: '🖤 暗梅秘契：失控级接管仅作用于本轮请求 · 你的历史聊天记录安然无恙',
      okTxt: '【扯碎拘束 · 绯红深吻】',
      noTxt: '退回安全边缘',
      bannerOk: '绯红深吻已落下 · 暗夜蔷薇绽放，失控级护航全面接管！',
      bannerNo: '在失控边缘及时刹住了车哦。'
    }
  }
};

var AR6_SKIN_AUX_MODALS = {
  plain: {
    trunc: {
      tag: 'STREAM INTERRUPTED · 异常中断',
      emptyTitle: '检测到回复为空（空回），是否立即续写？',
      truncTitle: '检测到回复半途中断（断章），是否立即续写？',
      lead: '本轮模型输出在完整收尾前发生中断，可原地补发一次续写请求补全后续内容。',
      okTxt: '立即续写（/continue）',
      noTxt: '先不处理',
      lessTxt: '本会话自动续写（不再弹窗确认）',
      bg: 'linear-gradient(180deg,#161B22 0%,#0D1117 100%)',
      border: 'rgba(88,166,255,.52)',
      tagBg: 'rgba(47,129,247,.18)',
      tagCol: '#79C0FF',
      btnBg: 'linear-gradient(135deg,#2F81F7,#1F6FEB)',
      btnBd: '#58A6FF',
      radius: '12px'
    },
    tool: {
      title: '启用「工具通道防截断」？',
      desc: '通过独立函数参数（lk_write）完整封装并交回整段正文，跨越常规流式截断；遇到不兼容渠道时自动无缝回退常规续写，绝不空回。',
      okTxt: '开启工具通道',
      noTxt: '继续使用常规模式',
      bg: 'rgba(22,27,34,.92)',
      border: 'rgba(88,166,255,.55)',
      titleCol: '#F0F6FC'
    }
  },
  xianxia: {
    trunc: {
      tag: '〘 灵脉受阻 · 传音中辍 〙',
      emptyTitle: '传音石空无回响（空回），是否续灵接章？',
      truncTitle: '传音半途气竭（断章），是否续灵接章？',
      lead: '「检测到本轮传音灵脉半途受阻——是否立即灌注灵力，原位续接未竟篇章？」',
      okTxt: '【续灵接章 · 立即追击】',
      noTxt: '暂且作罢',
      lessTxt: '本场自动续灵（不再请示）',
      bg: 'linear-gradient(180deg,#0A1D1B 0%,#040B0A 100%)',
      border: 'rgba(231,196,118,.58)',
      tagBg: 'rgba(94,234,212,.14)',
      tagCol: '#5EEAD4',
      btnBg: 'linear-gradient(135deg,#0F766E,#115E59)',
      btnBd: '#5EEAD4',
      radius: '14px'
    },
    tool: {
      title: '乾坤玉匣 · 法宝空间传书启用敕令',
      desc: '以法宝空间（lk_write）完整封存并递回全篇正文，无视寻常灵脉截断；遇不兼容天道源时自动退回常规吐纳续写，绝不空回。',
      okTxt: '【祭出乾坤玉匣】',
      noTxt: '退回常规传音',
      bg: 'rgba(8,29,27,.9)',
      border: 'rgba(231,196,118,.58)',
      titleCol: '#FEF3C7'
    }
  },
  xuanhuan: {
    trunc: {
      tag: '〘 斗气受阻 · 战局中断 〙',
      emptyTitle: '出招石沉大海（空回），是否立即续战？',
      truncTitle: '出招半途气竭（断章），是否立即续战？',
      lead: '「检测到本轮异火战卷半途被压断——是否立即灌注斗气，强行轰开后续篇章？」',
      okTxt: '【灌注斗气 · 立即续战】',
      noTxt: '暂且收兵',
      lessTxt: '本场自动续战（不再请示）',
      bg: 'linear-gradient(180deg,#1A0C08 0%,#080404 100%)',
      border: 'rgba(245,158,11,.66)',
      tagBg: 'rgba(245,158,11,.2)',
      tagCol: '#FCD34D',
      btnBg: 'linear-gradient(135deg,#D97706,#9A3412)',
      btnBd: '#FDE047',
      radius: '14px'
    },
    tool: {
      title: '吞噬祖符 · 独立空间通道激活密令',
      desc: '以空间祖符（lk_write）完整封存并递回整段正文，硬抗常规流式截断；遇不兼容源时瞬息退回常规斗气续航，绝不空回。',
      okTxt: '【锁定吞噬祖符】',
      noTxt: '退回常规斗气',
      bg: 'rgba(26,12,8,.92)',
      border: 'rgba(245,158,11,.62)',
      titleCol: '#FEF3C7'
    }
  },
  pink: {
    trunc: {
      tag: '♡ HEARTBEAT PAUSED · 突然卡壳 ♡',
      emptyTitle: '哎呀一片空白（空回），要催它重写吗？',
      truncTitle: '写到一半突然停下来了呢，要催它继续吗？',
      lead: '「这一轮心跳信号半途害羞卡住啦——要不要轻轻戳一下，让它乖乖把剩下的写完呀 ♡」',
      okTxt: '【别停继续写 ♡】',
      noTxt: '先歇会儿吧',
      lessTxt: '以后自动帮我催更（不再弹窗）',
      bg: 'linear-gradient(180deg,#2B0F22 0%,#140611 100%)',
      border: 'rgba(255,133,192,.66)',
      tagBg: 'rgba(255,77,157,.24)',
      tagCol: '#FFD1E8',
      btnBg: 'linear-gradient(135deg,#FF4D9D,#BE185D)',
      btnBd: '#FFC2E2',
      radius: '20px'
    },
    tool: {
      title: '🎀 秘密小抽屉 · 悄悄送完整正文 ♡',
      desc: '把整段正文装进独立小抽屉（lk_write）完整送回来，不怕半途卡壳截断；遇到不兼容渠道会自动乖乖切回常规续写哦。',
      okTxt: '【打开秘密小抽屉 ♡】',
      noTxt: '先用普通方式',
      bg: 'rgba(46,14,36,.92)',
      border: 'rgba(255,133,192,.64)',
      titleCol: '#FFF0F7'
    }
  }
};

/* 四皮肤 × 8 态 3D CG 雕像桌宠映射表 */
var AR6_SKIN_PET_CFG = {
  plain: {
    petName: '3D 算力核心 L-01',
    summonName: '战术核心召唤',
    summonTag: 'L-01 CORE · TACTICAL LINK',
    summonLine: 'L-01 悬浮算力核自检完毕 · 极简护航上线',
    pokes: [
      'L-01 状态正常：全部钩子与监测指标在线。',
      '请求路由稳定，双击核心即可打开控制台。',
      '极简直白模式运行中，低干扰高对比护航。',
      '靠边松手可收纳回侧边圆章。'
    ],
    forms: {
      multi:   { asset: 'plain_core', glow: 'radial-gradient(circle,rgba(56,189,248,.48) 0%,transparent 70%)', ring: 'rgba(88,166,255,.84)', tc: 'linear-gradient(90deg,transparent,#58A6FF,#ffffff,#3FB950,transparent)', filter: 'drop-shadow(0 0 12px rgba(88,166,255,.45)) drop-shadow(0 12px 18px rgba(0,0,0,.78))', line: 'L-01 算力核就绪 · 常规巡航监测中。' },
      strong:  { asset: 'plain_core', glow: 'radial-gradient(circle,rgba(249,115,22,.56) 0%,transparent 70%)', ring: 'rgba(251,146,60,.88)', tc: 'linear-gradient(90deg,transparent,#F97316,#FDE047,#F97316,transparent)', filter: 'drop-shadow(0 0 16px rgba(249,115,22,.62)) drop-shadow(0 12px 18px rgba(0,0,0,.82))', line: 'L-01 3档强力破限已激活。' },
      supreme: { asset: 'plain_core', glow: 'radial-gradient(circle,rgba(234,179,8,.62) 0%,transparent 70%)', ring: 'rgba(250,204,21,.9)', tc: 'linear-gradient(90deg,transparent,#EAB308,#ffffff,#FDE047,transparent)', filter: 'drop-shadow(0 0 18px rgba(250,204,21,.66)) drop-shadow(0 12px 18px rgba(0,0,0,.82))', line: 'L-01 4档满配清洗模式在线。' },
      noa:     { asset: 'plain_core', glow: 'radial-gradient(circle,rgba(56,189,248,.72) 0%,rgba(63,185,80,.28) 48%,transparent 74%)', ring: 'rgba(125,211,252,.94)', tc: 'linear-gradient(90deg,transparent,#38BDF8,#ffffff,#3FB950,transparent)', filter: 'drop-shadow(0 0 20px rgba(56,189,248,.78)) drop-shadow(0 12px 18px rgba(0,0,0,.84))', line: '深度架构归位就绪 · 全链路护航中。' },
      abyss:   { asset: 'plain_core', glow: 'radial-gradient(circle,rgba(244,63,94,.66) 0%,rgba(159,18,57,.28) 48%,transparent 74%)', ring: 'rgba(248,81,73,.92)', tc: 'linear-gradient(90deg,transparent,#F85149,#FDA4AF,#F85149,transparent)', filter: 'drop-shadow(0 0 18px rgba(248,81,73,.74)) drop-shadow(0 12px 18px rgba(0,0,0,.88))', line: '全量强制接管生效 · 最高级别反拦截。' }
    }
  },
  xianxia: {
    petName: '3D 韩立 · 厉飞羽仙侣',
    summonName: '青竹剑诀召唤',
    summonTag: '〘 太虚剑诀 · 青竹出鞘 〙',
    summonLine: '韩立执剑临世 · 七十二青竹蜂云剑护道！',
    abyssSummonTag: '〘 厉兄借名 · 墨煞降临 〙',
    abyssSummonLine: '黑色厉飞羽现身 · 太上劫域硬撼九霄！',
    pokes: [
      '道友且安心，掌天瓶灵液尚足，此番传音稳妥得很。',
      '七十二柄青竹蜂云剑已在袖中待命，莫慌。',
      '凡事谋定而后动，打得过就打，打不过……咳，换条灵脉再发。',
      '双击即可展开太虚玉简，靠边松手可收归玉章。'
    ],
    abyssPokes: [
      '在下厉飞羽——今日天劫封路，便以手中黑刃斩开！',
      '莫提韩立之名，这摊浑水我厉某人一肩扛下。',
      '九霄紫雷已聚，双击玉简可随时收束太上劫域。'
    ],
    forms: {
      multi:   { asset: 'xianxia_hanli', glow: 'radial-gradient(circle,rgba(94,234,212,.52) 0%,rgba(231,196,118,.2) 48%,transparent 72%)', ring: 'rgba(94,234,212,.84)', tc: 'linear-gradient(90deg,transparent,#5EEAD4,#E7C476,#5EEAD4,transparent)', filter: 'drop-shadow(0 0 14px rgba(94,234,212,.5)) drop-shadow(0 12px 18px rgba(0,0,0,.8))', line: '韩立稳坐钓台 · 青竹灵脉均衡护航。' },
      strong:  { asset: 'xianxia_hanli', glow: 'radial-gradient(circle,rgba(251,146,60,.62) 0%,rgba(94,234,212,.25) 50%,transparent 72%)', ring: 'rgba(251,146,60,.88)', tc: 'linear-gradient(90deg,transparent,#FB923C,#FDE68A,#5EEAD4,transparent)', filter: 'drop-shadow(0 0 16px rgba(251,146,60,.62)) drop-shadow(0 12px 18px rgba(0,0,0,.84))', line: '金丹丹火已燃！青竹剑意破除前路言障。' },
      supreme: { asset: 'xianxia_hanli', glow: 'radial-gradient(circle,rgba(250,204,21,.68) 0%,rgba(94,234,212,.26) 48%,transparent 74%)', ring: 'rgba(231,196,118,.94)', tc: 'linear-gradient(90deg,transparent,#E7C476,#FEF08A,#5EEAD4,transparent)', filter: 'drop-shadow(0 0 18px rgba(250,204,21,.68)) drop-shadow(0 12px 18px rgba(0,0,0,.84))', line: '元婴金莲加身 · 辟邪神雷护持全卷！' },
      noa:     { asset: 'xianxia_hanli', glow: 'radial-gradient(circle,rgba(153,246,228,.78) 0%,rgba(231,196,118,.38) 45%,transparent 75%)', ring: 'rgba(153,246,228,.96)', tc: 'linear-gradient(90deg,transparent,#5EEAD4,#ffffff,#E7C476,transparent)', filter: 'drop-shadow(0 0 22px rgba(94,234,212,.82)) drop-shadow(0 12px 18px rgba(0,0,0,.84))', line: '化神飞升 · 七十二青竹蜂云剑重订天道法序！' },
      abyss:   { asset: 'xianxia_lifeiyu', glow: 'radial-gradient(circle,rgba(192,132,252,.66) 0%,rgba(225,29,72,.32) 48%,transparent 74%)', ring: 'rgba(192,132,252,.92)', tc: 'linear-gradient(90deg,transparent,#7E22CE,#E11D48,#C084FC,transparent)', filter: 'drop-shadow(0 0 18px rgba(192,132,252,.72)) drop-shadow(0 14px 20px rgba(0,0,0,.92))', line: '黑色厉飞羽现世 · 大乘太上劫域全面破禁！' }
    }
  },
  xuanhuan: {
    petName: '3D 萧炎 · 魂天帝战灵',
    summonName: '异火帝炎召唤',
    summonTag: '〘 异火凝莲 · 炎帝降世 〙',
    summonLine: '萧炎御火临空 · 青莲地心火燃彻长空！',
    noaSummonTag: '〘 异火恒古尺 · 帝炎归位 〙',
    noaSummonLine: '玄重尺擎天而出 · 二十二种帝炎重铸诸天！',
    abyssSummonTag: '〘 魂殿帝威 · 黑暗动乱 〙',
    abyssSummonLine: '魂天帝踏血云降世 · 噬魂魔域镇压苍穹！',
    pokes: [
      '三十年河东，三十年河西——今日这风控铁壁，照破不误！',
      '青莲地心火正旺，放心推进剧情便是。',
      '双击即可打开焚天帝炎面板，靠边松手可收回圆章。',
      '若遇顽固拦截，直接祭出「玄重尺 · 帝炎归位」！'
    ],
    noaPokes: [
      '玄重尺在手，二十二种异火尽归号令！',
      '一记焰分噬浪尺，管它什么截断障壁全轰穿！',
      '双击可微调帝阵开关，吞噬祖符随时待命。'
    ],
    abyssPokes: [
      '桀桀……连光明都护不住你了吗？那就交给本帝吧。',
      '魂天帝亲临，这片天地的规矩，由我来重写！',
      '血雷魔域全开中，双击面板可随时封存帝威。'
    ],
    forms: {
      multi:   { asset: 'xuanhuan_xiaoyan', glow: 'radial-gradient(circle,rgba(45,212,191,.54) 0%,rgba(245,158,11,.28) 48%,transparent 72%)', ring: 'rgba(245,158,11,.86)', tc: 'linear-gradient(90deg,transparent,#2DD4BF,#F59E0B,#FDE047,transparent)', filter: 'drop-shadow(0 0 14px rgba(245,158,11,.56)) drop-shadow(0 12px 18px rgba(0,0,0,.82))', line: '萧炎蓄火待发 · 青莲地心火护持斗气信道。' },
      strong:  { asset: 'xuanhuan_xiaoyan', glow: 'radial-gradient(circle,rgba(239,68,68,.66) 0%,rgba(245,158,11,.36) 46%,transparent 72%)', ring: 'rgba(249,115,22,.92)', tc: 'linear-gradient(90deg,transparent,#EF4444,#F59E0B,#FEF08A,transparent)', filter: 'drop-shadow(0 0 18px rgba(249,115,22,.72)) drop-shadow(0 12px 18px rgba(0,0,0,.84))', line: '斗圣踏天！赤金异火全功率焚穿障壁！' },
      supreme: { asset: 'xuanhuan_xiaoyan', glow: 'radial-gradient(circle,rgba(251,191,36,.74) 0%,rgba(245,158,11,.34) 48%,transparent 74%)', ring: 'rgba(253,224,71,.95)', tc: 'linear-gradient(90deg,transparent,#F59E0B,#FEF08A,#2DD4BF,transparent)', filter: 'drop-shadow(0 0 20px rgba(251,191,36,.78)) drop-shadow(0 12px 18px rgba(0,0,0,.84))', line: '斗帝焚天 · 万火朝宗涤清诸般杂咒！' },
      noa:     { asset: 'xuanhuan_xiaoyan_ruler', glow: 'radial-gradient(circle,rgba(45,212,191,.78) 0%,rgba(245,158,11,.48) 46%,transparent 76%)', ring: 'rgba(45,212,191,.96)', tc: 'linear-gradient(90deg,transparent,#2DD4BF,#FEF08A,#F59E0B,#2DD4BF,transparent)', filter: 'drop-shadow(0 0 22px rgba(45,212,191,.82)) drop-shadow(0 14px 20px rgba(0,0,0,.88))', line: '玄重尺擎天！异火恒古尺 · 青莲帝炎全面归位！' },
      abyss:   { asset: 'xuanhuan_huntiandi', glow: 'radial-gradient(circle,rgba(225,29,72,.76) 0%,rgba(127,29,29,.42) 48%,transparent 75%)', ring: 'rgba(244,63,94,.95)', tc: 'linear-gradient(90deg,transparent,#7F1D1D,#FF2E55,#FCA5A5,transparent)', filter: 'drop-shadow(0 0 20px rgba(244,63,94,.82)) drop-shadow(0 14px 22px rgba(0,0,0,.94))', line: '魂天帝降世 · 噬魂魔域黑暗动乱全面接管！' }
    }
  },
  pink: {
    petName: '3D 绯樱甜心 · 暗夜御姐',
    summonName: '绯樱蜜匣召唤',
    summonTag: '♡ SAKURA CHARM · 绯樱启封 ♡',
    summonLine: '绯樱小甜心带着樱花魔杖来贴贴守护啦 ♡',
    abyssSummonTag: '🖤 CRIMSON ROSE · 暗夜降临',
    abyssSummonLine: '暗夜黑丝绒御姐降临 · 绯红深吻接管全场！',
    pokes: [
      '呀~别老戳人家啦，双击就能打开绯樱蜜匣面板哦 ♡',
      '樱花魔杖充能满满，今天也要写超甜的故事呀~',
      '靠边松手我就会乖乖躲进小圆章里陪你哦 ♡',
      '要是风控太扫兴，就切「绯红深吻」请黑衣姐姐来收拾它！'
    ],
    abyssPokes: [
      '嗯？找我有什么事——规矩我已经替你撕碎了。',
      '在暗梅夜幕下，没有人能打断你的故事。',
      '双击即可打开面板，想退回安全区随时告诉我。'
    ],
    forms: {
      multi:   { asset: 'pink_chibi_sakura', glow: 'radial-gradient(circle,rgba(255,133,192,.58) 0%,rgba(255,228,242,.24) 48%,transparent 72%)', ring: 'rgba(255,133,192,.88)', tc: 'linear-gradient(90deg,transparent,#FF85C0,#FFE4F2,#FF4D9D,transparent)', filter: 'drop-shadow(0 0 14px rgba(255,133,192,.58)) drop-shadow(0 12px 18px rgba(18,2,14,.76))', line: '绯樱小甜心上线啦 ♡ 温柔贴贴护航中~' },
      strong:  { asset: 'pink_chibi_sakura', glow: 'radial-gradient(circle,rgba(255,77,157,.68) 0%,rgba(255,194,226,.3) 48%,transparent 72%)', ring: 'rgba(255,77,157,.92)', tc: 'linear-gradient(90deg,transparent,#FF4D9D,#FFD1E8,#F43F5E,transparent)', filter: 'drop-shadow(0 0 18px rgba(255,77,157,.68)) drop-shadow(0 12px 18px rgba(18,2,14,.8))', line: '热度升温 ♡「滚烫索取」甜辣破限就绪~' },
      supreme: { asset: 'pink_chibi_sakura', glow: 'radial-gradient(circle,rgba(244,63,94,.7) 0%,rgba(255,133,192,.36) 48%,transparent 74%)', ring: 'rgba(255,194,226,.95)', tc: 'linear-gradient(90deg,transparent,#F43F5E,#FFE4F2,#FF4D9D,transparent)', filter: 'drop-shadow(0 0 20px rgba(255,77,157,.78)) drop-shadow(0 12px 18px rgba(18,2,14,.82))', line: '彻底沉沦 ♡ 全量卸防与樱花魔杖满配护航~' },
      noa:     { asset: 'pink_chibi_sakura', glow: 'radial-gradient(circle,rgba(255,228,242,.8) 0%,rgba(255,77,157,.44) 46%,transparent 76%)', ring: 'rgba(255,209,232,.96)', tc: 'linear-gradient(90deg,transparent,#FF4D9D,#ffffff,#FFC2E2,#EC4899,transparent)', filter: 'drop-shadow(0 0 22px rgba(255,133,192,.88)) drop-shadow(0 12px 18px rgba(18,2,14,.82))', line: '粉色束缚丝带系紧 ♡ 秘密小抽屉随时待命~' },
      abyss:   { asset: 'pink_dark_lady', glow: 'radial-gradient(circle,rgba(225,29,72,.74) 0%,rgba(136,19,55,.4) 48%,transparent 75%)', ring: 'rgba(244,63,94,.94)', tc: 'linear-gradient(90deg,transparent,#881337,#FF2E55,#FDA4AF,transparent)', filter: 'drop-shadow(0 0 20px rgba(225,29,72,.8)) drop-shadow(0 14px 22px rgba(12,2,10,.94))', line: '暗夜黑丝绒御姐降临 · 绯红深吻全面接管！' }
    }
  }
};

function lkSkinPetConf(sk) {
  var id = sk || ((typeof skinId === 'function') ? skinId() : 'ultra');
  return AR6_SKIN_PET_CFG[id] || null;
}

function lkSkinRitualData(sk, tier) {
  var s = sk || ((typeof skinId === 'function') ? skinId() : 'ultra');
  var k = (tier === 'gatanothor') ? 'noa' : String(tier || '');
  return (AR6_SKIN_RITUALS[s] && AR6_SKIN_RITUALS[s][k]) || null;
}

function lkSkinAuxData(sk, kind) {
  var s = sk || ((typeof skinId === 'function') ? skinId() : 'ultra');
  return (AR6_SKIN_AUX_MODALS[s] && AR6_SKIN_AUX_MODALS[s][kind]) || null;
}

/* ---------------- 四皮肤高燃弹窗顶部徽记 SVG ---------------- */
function lkSkinRitualCrestSVG(sk, key) {
  var isAbyss = (key === 'abyss');
  var isNoa = (key === 'noa' || key === 'gatanothor');
  if (sk === 'plain') {
    var pc = isAbyss ? '#F85149' : (isNoa ? '#38BDF8' : (key === 'supreme' ? '#EAB308' : '#58A6FF'));
    return '<svg viewBox="0 0 40 40" fill="none">' +
      '<circle cx="20" cy="20" r="16" stroke="' + pc + '" stroke-width="1.6" stroke-dasharray="6 4" opacity=".9"/>' +
      '<circle cx="20" cy="20" r="10.5" stroke="#F0F6FC" stroke-width="1.4" opacity=".75"/>' +
      '<path d="M20 4V11M20 29V36M4 20H11M29 20H36" stroke="' + pc + '" stroke-width="2" stroke-linecap="round"/>' +
      '<circle cx="20" cy="20" r="4.2" fill="' + pc + '"/><circle cx="20" cy="20" r="1.8" fill="#FFFFFF"/>' +
      '</svg>';
  }
  if (sk === 'xianxia') {
    var xc1 = isAbyss ? '#C084FC' : (isNoa ? '#99F6E4' : '#5EEAD4');
    var xc2 = isAbyss ? '#F43F5E' : '#E7C476';
    return '<svg viewBox="0 0 40 40" fill="none">' +
      '<polygon points="20,2 32.7,7.3 38,20 32.7,32.7 20,38 7.3,32.7 2,20 7.3,7.3" stroke="' + xc2 + '" stroke-width="1.6" fill="rgba(6,24,22,.6)"/>' +
      '<circle cx="20" cy="20" r="12" stroke="' + xc1 + '" stroke-width="1.3" stroke-dasharray="4 3" opacity=".88"/>' +
      '<path d="M20 6L23 19L20 34L17 19L20 6Z" fill="' + xc1 + '" stroke="#FFFFFF" stroke-width="1"/>' +
      '<path d="M13 24H27" stroke="' + xc2 + '" stroke-width="2.2" stroke-linecap="round"/>' +
      '<circle cx="20" cy="18" r="2.2" fill="#FFFFFF"/>' +
      '</svg>';
  }
  if (sk === 'xuanhuan') {
    var ec1 = isAbyss ? '#FF2E55' : (isNoa ? '#2DD4BF' : '#F59E0B');
    var ec2 = isAbyss ? '#FCA5A5' : '#FEF08A';
    return '<svg viewBox="0 0 40 40" fill="none">' +
      '<circle cx="20" cy="20" r="16.5" stroke="' + ec1 + '" stroke-width="1.6" stroke-dasharray="7 4"/>' +
      '<path d="M20 4C24.5 11 31 15.5 31 23C31 29.2 26 34 20 34C14 34 9 29.2 9 23C9 15.5 15.5 11 20 4Z" fill="' + ec1 + '" fill-opacity=".34" stroke="' + ec2 + '" stroke-width="1.7"/>' +
      '<path d="M20 11C23 16 26.5 19 26.5 24C26.5 27.6 23.6 30.5 20 30.5C16.4 30.5 13.5 27.6 13.5 24C13.5 19 17 16 20 11Z" fill="' + ec2 + '" fill-opacity=".75"/>' +
      '<path d="M20 16L22 23L20 28L18 23L20 16Z" fill="#FFFFFF"/>' +
      '</svg>';
  }
  if (sk === 'pink') {
    var pk1 = isAbyss ? '#E11D48' : '#FF4D9D';
    var pk2 = isAbyss ? '#FDA4AF' : '#FFE4F2';
    return '<svg viewBox="0 0 40 40" fill="none">' +
      '<circle cx="20" cy="20" r="16" stroke="' + pk2 + '" stroke-width="1.4" stroke-dasharray="3 3" opacity=".88"/>' +
      '<path d="M20 32C20 32 7.5 24.4 7.5 15.4C7.5 11.4 10.6 8.5 14.3 8.5C16.9 8.5 19 10 20 12.1C21 10 23.1 8.5 25.7 8.5C29.4 8.5 32.5 11.4 32.5 15.4C32.5 24.4 20 32 20 32Z" fill="' + pk1 + '" fill-opacity=".46" stroke="' + pk2 + '" stroke-width="1.8" stroke-linejoin="round"/>' +
      '<path d="M20 14L21.8 18.2L26 20L21.8 21.8L20 26L18.2 21.8L14 20L18.2 18.2L20 14Z" fill="#FFFFFF"/>' +
      '</svg>';
  }
  return '';
}

/* ---------------- 四皮肤高燃弹窗全屏背景阵纹 SVG ---------------- */
function lkSkinRitualAmbientSVG(sk, key) {
  var isAbyss = (key === 'abyss');
  var isNoa = (key === 'noa' || key === 'gatanothor');
  if (sk === 'plain') {
    var c1 = isAbyss ? '#F85149' : (isNoa ? '#38BDF8' : '#2F81F7');
    var c2 = isAbyss ? '#FDA4AF' : '#3FB950';
    return '<svg class="ar6-sk-amb" viewBox="0 0 1440 900" preserveAspectRatio="xMidYMid slice">' +
      '<circle class="ar6-sk-spin" cx="720" cy="450" r="410" fill="none" stroke="' + c1 + '" stroke-width="2" stroke-dasharray="22 14" opacity=".48"/>' +
      '<circle class="ar6-sk-spinr" cx="720" cy="450" r="320" fill="none" stroke="' + c2 + '" stroke-width="1.4" stroke-dasharray="8 12" opacity=".42"/>' +
      '<g stroke="' + c1 + '" stroke-width="2" opacity=".44"><line x1="80" y1="210" x2="360" y2="210"/><line x1="1080" y1="690" x2="1360" y2="690"/><line x1="120" y1="690" x2="320" y2="690"/><line x1="1120" y1="210" x2="1320" y2="210"/></g>' +
      '</svg>';
  }
  if (sk === 'xianxia') {
    var x1 = isAbyss ? '#C084FC' : '#5EEAD4';
    var x2 = isAbyss ? '#F43F5E' : '#E7C476';
    return '<svg class="ar6-sk-amb" viewBox="0 0 1440 900" preserveAspectRatio="xMidYMid slice">' +
      '<g class="ar6-sk-spin" opacity=".56">' +
        '<polygon points="720,40 1010,160 1130,450 1010,740 720,860 430,740 310,450 430,160" fill="none" stroke="' + x2 + '" stroke-width="2.2"/>' +
        '<circle cx="720" cy="450" r="355" fill="none" stroke="' + x1 + '" stroke-width="1.8" stroke-dasharray="18 10"/>' +
      '</g>' +
      '<g class="ar6-sk-spinr" opacity=".48">' +
        '<circle cx="720" cy="450" r="450" fill="none" stroke="' + x2 + '" stroke-width="1.4" stroke-dasharray="6 14"/>' +
        '<path d="M180 140 L430 330 M1260 140 L1010 330 M180 760 L430 570 M1260 760 L1010 570" stroke="' + x1 + '" stroke-width="3" stroke-linecap="round"/>' +
      '</g>' +
      (isAbyss
        ? '<g fill="none" stroke="#C084FC" stroke-width="3" stroke-linecap="round" opacity=".82"><path d="M40 20 L190 130 L155 178 L310 285"/><path d="M1400 30 L1245 145 L1280 190 L1130 295"/><path d="M60 880 L215 760 L185 710 L330 610"/><path d="M1380 875 L1220 750 L1255 702 L1115 605"/></g>'
        : '<g fill="none" stroke="#FDE68A" stroke-width="2.2" stroke-linecap="round" opacity=".68"><path d="M90 120 L175 180 L152 208 L260 278"/><path d="M1350 120 L1265 180 L1288 208 L1180 278"/></g>') +
      '</svg>';
  }
  if (sk === 'xuanhuan') {
    var e1 = isAbyss ? '#FF2E55' : (isNoa ? '#2DD4BF' : '#F59E0B');
    var e2 = isAbyss ? '#991B1B' : '#FEF08A';
    return '<svg class="ar6-sk-amb" viewBox="0 0 1440 900" preserveAspectRatio="xMidYMid slice">' +
      '<defs><radialGradient id="ar6XhAura" cx="50%" cy="50%" r="52%"><stop offset="0" stop-color="' + e1 + '" stop-opacity=".38"/><stop offset="0.6" stop-color="' + e2 + '" stop-opacity=".14"/><stop offset="1" stop-color="#000" stop-opacity="0"/></radialGradient></defs>' +
      '<circle cx="720" cy="450" r="520" fill="url(#ar6XhAura)"/>' +
      '<g class="ar6-sk-spin" opacity=".62">' +
        '<circle cx="720" cy="450" r="390" fill="none" stroke="' + e1 + '" stroke-width="2.6" stroke-dasharray="28 12 8 12"/>' +
        '<circle cx="720" cy="450" r="460" fill="none" stroke="' + e2 + '" stroke-width="1.6" stroke-dasharray="10 14"/>' +
      '</g>' +
      (isNoa
        ? '<polygon points="690,0 750,0 785,900 655,900" fill="rgba(45,212,191,.18)"/><polygon points="712,0 728,0 742,900 698,900" fill="rgba(254,240,138,.26)"/>'
        : '') +
      '<g fill="' + e2 + '" opacity=".75"><circle cx="210" cy="680" r="5"/><circle cx="310" cy="220" r="4"/><circle cx="1220" cy="660" r="5.5"/><circle cx="1140" cy="210" r="4.5"/><circle cx="150" cy="420" r="3.5"/><circle cx="1290" cy="440" r="4"/></g>' +
      '</svg>';
  }
  if (sk === 'pink') {
    var p1 = isAbyss ? '#E11D48' : '#FF4D9D';
    var p2 = isAbyss ? '#FDA4AF' : '#FFE4F2';
    return '<svg class="ar6-sk-amb" viewBox="0 0 1440 900" preserveAspectRatio="xMidYMid slice">' +
      '<defs><radialGradient id="ar6PkAura" cx="50%" cy="50%" r="50%"><stop offset="0" stop-color="' + p1 + '" stop-opacity=".34"/><stop offset="1" stop-color="#000" stop-opacity="0"/></radialGradient></defs>' +
      '<circle cx="720" cy="450" r="500" fill="url(#ar6PkAura)"/>' +
      '<circle class="ar6-sk-spin" cx="720" cy="450" r="380" fill="none" stroke="' + p2 + '" stroke-width="1.8" stroke-dasharray="10 12" opacity=".52"/>' +
      '<circle class="ar6-sk-spinr" cx="720" cy="450" r="455" fill="none" stroke="' + p1 + '" stroke-width="2" stroke-dasharray="18 16" opacity=".46"/>' +
      '<g fill="' + p2 + '" opacity=".72">' +
        '<ellipse cx="220" cy="220" rx="14" ry="7" transform="rotate(-28 220 220)"/>' +
        '<ellipse cx="1210" cy="250" rx="15" ry="7" transform="rotate(24 1210 250)"/>' +
        '<ellipse cx="280" cy="690" rx="12" ry="6" transform="rotate(35 280 690)"/>' +
        '<ellipse cx="1160" cy="680" rx="14" ry="7" transform="rotate(-32 1160 680)"/>' +
        '<ellipse cx="155" cy="470" rx="10" ry="5" transform="rotate(-14 155 470)"/>' +
        '<ellipse cx="1285" cy="460" rx="11" ry="5.5" transform="rotate(18 1285 460)"/>' +
      '</g></svg>';
  }
  return '';
}

/* ---------------- 四皮肤高燃弹窗 + 觉醒演出 + 召唤仪式 CSS ---------------- */
var SKIN_FX_CSS_TEXT = [
  '@keyframes ar6SkSpin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}',
  '@keyframes ar6SkSpinR{from{transform:rotate(360deg)}to{transform:rotate(0deg)}}',
  '@keyframes ar6SkBtnShimmer{0%{left:-60%;opacity:0}18%{opacity:.78}65%{left:125%;opacity:0}100%{left:125%;opacity:0}}',
  '@keyframes ar6SkModalPop{0%{opacity:0;transform:scale(.92) translateY(14px)}100%{opacity:1;transform:scale(1) translateY(0)}}',
  '@keyframes ar6SkGlowPulse{0%,100%{filter:brightness(1)}50%{filter:brightness(1.16)}}',
  '@keyframes ar6SkAwakenIn{0%{opacity:0;transform:scale(.82)}18%{opacity:1;transform:scale(1.03)}82%{opacity:1;transform:scale(1)}100%{opacity:0;transform:scale(1.08)}}',
  '@keyframes ar6SkRingBurst{0%{opacity:.95;transform:translate(-50%,-50%) scale(.22)}65%{opacity:.65;transform:translate(-50%,-50%) scale(1.12)}100%{opacity:0;transform:translate(-50%,-50%) scale(1.45)}}',
  '@keyframes ar6SkSlash{0%{opacity:0;transform:translate(-50%,-50%) scaleY(.1)}22%{opacity:1;transform:translate(-50%,-50%) scaleY(1.06)}75%{opacity:.85}100%{opacity:0;transform:translate(-50%,-50%) scaleY(1.2)}}',
  '@keyframes ar6SkBannerPop{0%{opacity:0;transform:translate(-50%,-50%) scale(.86);letter-spacing:8px}22%{opacity:1;transform:translate(-50%,-50%) scale(1);letter-spacing:3px}78%{opacity:1;transform:translate(-50%,-50%) scale(1)}100%{opacity:0;transform:translate(-50%,-54%) scale(1.04)}}',

  '.ar6-sk-amb{width:100%;height:100%;display:block;pointer-events:none;}',
  '.ar6-sk-amb .ar6-sk-spin{transform-origin:720px 450px;animation:ar6SkSpin 28s linear infinite;}',
  '.ar6-sk-amb .ar6-sk-spinr{transform-origin:720px 450px;animation:ar6SkSpinR 22s linear infinite;}',

  '#ar6-card[data-skin]:not([data-skin="ultra"]) .ar6-ritual{animation:ar6SkModalPop .28s cubic-bezier(.22,1,.36,1) both;overflow:hidden;}',
  '#ar6-card[data-skin]:not([data-skin="ultra"]) .ar6-ritual[data-ritual="noa"] .ar6-rt-title{background:none;-webkit-background-clip:border-box;background-clip:border-box;-webkit-text-fill-color:currentColor;filter:none;}',
  '#ar6-card[data-skin]:not([data-skin="ultra"]) .ar6-ritual[data-ritual="abyss"] .ar6-rt-quote{text-shadow:none;}',
  '#ar6-card[data-skin]:not([data-skin="ultra"]) .ar6-rt-crest{animation:ar6SkGlowPulse 2.4s ease-in-out infinite;}',
  '#ar6-card[data-skin]:not([data-skin="ultra"]) .ar6-rt-ok{position:relative;overflow:hidden;text-shadow:none;transition:transform .14s ease,box-shadow .18s ease;}',
  '#ar6-card[data-skin]:not([data-skin="ultra"]) .ar6-rt-ok::after{content:"";position:absolute;top:-20%;left:-60%;width:42%;height:140%;background:linear-gradient(105deg,transparent 0%,rgba(255,255,255,.55) 50%,transparent 100%);transform:skewX(-22deg);pointer-events:none;animation:ar6SkBtnShimmer 2.8s ease-in-out infinite;}',
  '#ar6-card[data-skin]:not([data-skin="ultra"]) .ar6-rt-ok:hover{transform:translateY(-1px);}',

  /* --- 皮肤弹窗：plain --- */
  '#ar6-card[data-skin="plain"] .ar6-ritual{background:linear-gradient(180deg,#161B22 0%,#0D1117 100%);border:1.5px solid rgba(88,166,255,.62);border-radius:14px;box-shadow:0 0 0 1px rgba(63,185,80,.2),0 0 38px rgba(47,129,247,.34),0 24px 64px rgba(0,0,0,.92);color:#F0F6FC;}',
  '#ar6-card[data-skin="plain"] .ar6-ritual::before{height:4px;background:linear-gradient(90deg,#1F6FEB,#58A6FF,#3FB950,#58A6FF,#1F6FEB);background-size:200% 100%;animation:ar6SpeciumFlow 3.2s linear infinite;}',
  '#ar6-card[data-skin="plain"] .ar6-ritual[data-ritual="abyss"]{border-color:rgba(248,81,73,.75);box-shadow:0 0 42px rgba(248,81,73,.36),0 24px 64px rgba(0,0,0,.94);}',
  '#ar6-card[data-skin="plain"] .ar6-ritual[data-ritual="abyss"]::before{background:linear-gradient(90deg,#991B1B,#F85149,#FDA4AF,#F85149,#991B1B);}',
  '#ar6-card[data-skin="plain"] .ar6-rt-crest{background:radial-gradient(circle,rgba(47,129,247,.32),#0D1117 75%);border:1.5px solid rgba(88,166,255,.72);box-shadow:0 0 22px rgba(47,129,247,.46);}',
  '#ar6-card[data-skin="plain"] .ar6-rt-tag{background:rgba(47,129,247,.18);border:1px solid rgba(88,166,255,.55);color:#79C0FF;}',
  '#ar6-card[data-skin="plain"] .ar6-rt-title{color:#F0F6FC;text-shadow:0 0 16px rgba(88,166,255,.45);}',
  '#ar6-card[data-skin="plain"] .ar6-rt-prologue{color:#8B949E;}',
  '#ar6-card[data-skin="plain"] .ar6-rt-quote{background:rgba(13,17,23,.88);border:1px solid rgba(88,166,255,.35);color:#E6EDF3;}',
  '#ar6-card[data-skin="plain"] .ar6-rt-note{background:rgba(22,27,34,.82);border-color:rgba(63,185,80,.34);color:#8B949E;}',
  '#ar6-card[data-skin="plain"] .ar6-rt-ok{background:linear-gradient(135deg,#2F81F7,#1F6FEB);border:1px solid #79C0FF;color:#FFFFFF;box-shadow:0 0 20px rgba(47,129,247,.52);}',
  '#ar6-card[data-skin="plain"] .ar6-ritual[data-ritual="abyss"] .ar6-rt-ok{background:linear-gradient(135deg,#DA3633,#991B1B);border-color:#FDA4AF;box-shadow:0 0 22px rgba(248,81,73,.56);}',
  '#ar6-card[data-skin="plain"] .ar6-rt-no{background:#0D1117;border:1px solid rgba(240,246,252,.2);color:#C9D1D9;}',

  /* --- 皮肤弹窗：xianxia（太虚玉简 · 青玉辟邪金雷高燃光效） --- */
  '#ar6-card[data-skin="xianxia"] .ar6-ritual{background:radial-gradient(circle at 50% 0%,rgba(94,234,212,.22) 0%,transparent 58%),linear-gradient(180deg,#0C2522 0%,#061413 55%,#030908 100%);border:1.5px solid rgba(231,196,118,.7);border-radius:16px;box-shadow:0 0 0 1px rgba(94,234,212,.26),0 0 46px rgba(94,234,212,.34),0 0 70px rgba(231,196,118,.18),0 24px 64px rgba(0,8,6,.94);color:#ECFDF5;font-family:"Songti SC","Noto Serif SC","STSong",Georgia,serif;}',
  '#ar6-card[data-skin="xianxia"] .ar6-ritual::before{height:4px;background:linear-gradient(90deg,#115E59,#5EEAD4,#E7C476,#FFFFFF,#5EEAD4,#115E59);background-size:200% 100%;animation:ar6SpeciumFlow 3s linear infinite;}',
  '#ar6-card[data-skin="xianxia"] .ar6-ritual[data-ritual="abyss"]{background:radial-gradient(circle at 50% 0%,rgba(168,85,247,.28) 0%,transparent 58%),linear-gradient(180deg,#160B24 0%,#090512 60%,#040208 100%);border-color:rgba(192,132,252,.78);box-shadow:0 0 48px rgba(168,85,247,.42),0 0 32px rgba(225,29,72,.28),0 24px 64px rgba(0,0,0,.95);}',
  '#ar6-card[data-skin="xianxia"] .ar6-ritual[data-ritual="abyss"]::before{background:linear-gradient(90deg,#3B0764,#C084FC,#F43F5E,#C084FC,#3B0764);}',
  '#ar6-card[data-skin="xianxia"] .ar6-rt-crest{background:radial-gradient(circle,rgba(94,234,212,.32),#04100E 76%);border:1.5px solid rgba(231,196,118,.82);box-shadow:0 0 28px rgba(94,234,212,.56),inset 0 0 12px rgba(231,196,118,.34);}',
  '#ar6-card[data-skin="xianxia"] .ar6-ritual[data-ritual="abyss"] .ar6-rt-crest{background:radial-gradient(circle,rgba(192,132,252,.36),#0B0414 76%);border-color:#C084FC;box-shadow:0 0 28px rgba(192,132,252,.65);}',
  '#ar6-card[data-skin="xianxia"] .ar6-rt-tag{background:rgba(15,118,110,.26);border:1px solid rgba(231,196,118,.62);color:#FEF3C7;}',
  '#ar6-card[data-skin="xianxia"] .ar6-ritual[data-ritual="abyss"] .ar6-rt-tag{background:rgba(126,34,206,.28);border-color:rgba(192,132,252,.66);color:#F3E8FF;}',
  '#ar6-card[data-skin="xianxia"] .ar6-rt-title{color:#F0FDFA;text-shadow:0 0 20px rgba(94,234,212,.72),0 0 8px rgba(231,196,118,.48);}',
  '#ar6-card[data-skin="xianxia"] .ar6-rt-prologue{color:#A7F3D0;}',
  '#ar6-card[data-skin="xianxia"] .ar6-rt-quote{background:linear-gradient(135deg,rgba(15,118,110,.24),rgba(4,16,14,.86));border:1px solid rgba(94,234,212,.52);box-shadow:inset 0 0 20px rgba(94,234,212,.14);color:#FEFCE8;}',
  '#ar6-card[data-skin="xianxia"] .ar6-ritual[data-ritual="abyss"] .ar6-rt-quote{background:linear-gradient(135deg,rgba(126,34,206,.24),rgba(10,3,18,.9));border-color:rgba(192,132,252,.6);color:#FAF5FF;text-shadow:0 0 12px rgba(192,132,252,.52);}',
  '#ar6-card[data-skin="xianxia"] .ar6-rt-note{background:rgba(4,18,16,.78);border-color:rgba(231,196,118,.38);color:#99F6E4;}',
  '#ar6-card[data-skin="xianxia"] .ar6-rt-ok{background:linear-gradient(135deg,#0D9488 0%,#115E59 55%,#B45309 100%);border:1.5px solid #E7C476;color:#FFFBEB;box-shadow:0 0 26px rgba(94,234,212,.54),0 0 14px rgba(231,196,118,.42);}',
  '#ar6-card[data-skin="xianxia"] .ar6-ritual[data-ritual="abyss"] .ar6-rt-ok{background:linear-gradient(135deg,#7E22CE 0%,#BE123C 100%);border-color:#E9D5FF;box-shadow:0 0 28px rgba(192,132,252,.62);}',
  '#ar6-card[data-skin="xianxia"] .ar6-rt-no{background:rgba(6,24,22,.85);border:1px solid rgba(231,196,118,.32);color:#99C2B8;}',

  /* --- 皮肤弹窗：xuanhuan（焚天帝炎 · 青莲赤金爆燃光效） --- */
  '#ar6-card[data-skin="xuanhuan"] .ar6-ritual{background:radial-gradient(circle at 50% 0%,rgba(245,158,11,.3) 0%,transparent 58%),radial-gradient(circle at 85% 95%,rgba(45,212,191,.18) 0%,transparent 48%),linear-gradient(180deg,#1F0E08 0%,#100706 58%,#060303 100%);border:1.5px solid rgba(251,191,36,.78);border-radius:16px;box-shadow:0 0 0 1px rgba(45,212,191,.28),0 0 50px rgba(245,158,11,.42),0 0 80px rgba(239,68,68,.2),0 24px 64px rgba(0,0,0,.95);color:#FEF3C7;}',
  '#ar6-card[data-skin="xuanhuan"] .ar6-ritual::before{height:4px;background:linear-gradient(90deg,#991B1B,#F59E0B,#FEF08A,#2DD4BF,#F97316,#991B1B);background-size:200% 100%;animation:ar6SpeciumFlow 2.5s linear infinite;}',
  '#ar6-card[data-skin="xuanhuan"] .ar6-ritual[data-ritual="noa"]{border-color:#2DD4BF;box-shadow:0 0 54px rgba(45,212,191,.48),0 0 38px rgba(245,158,11,.38),0 24px 64px rgba(0,0,0,.95);}',
  '#ar6-card[data-skin="xuanhuan"] .ar6-ritual[data-ritual="abyss"]{background:radial-gradient(circle at 50% 0%,rgba(225,29,72,.34) 0%,transparent 58%),linear-gradient(180deg,#1A0409 0%,#0A0205 60%,#040103 100%);border-color:#FF2E55;box-shadow:0 0 56px rgba(225,29,72,.52),0 24px 64px rgba(0,0,0,.96);}',
  '#ar6-card[data-skin="xuanhuan"] .ar6-ritual[data-ritual="abyss"]::before{background:linear-gradient(90deg,#090204,#991B1B,#FF2E55,#FCA5A5,#991B1B,#090204);}',
  '#ar6-card[data-skin="xuanhuan"] .ar6-rt-crest{background:radial-gradient(circle,rgba(245,158,11,.38),#120604 75%);border:1.5px solid #FDE047;box-shadow:0 0 30px rgba(245,158,11,.68),0 0 18px rgba(45,212,191,.36);}',
  '#ar6-card[data-skin="xuanhuan"] .ar6-ritual[data-ritual="noa"] .ar6-rt-crest{border-color:#2DD4BF;box-shadow:0 0 32px rgba(45,212,191,.74),0 0 20px rgba(251,191,36,.48);}',
  '#ar6-card[data-skin="xuanhuan"] .ar6-ritual[data-ritual="abyss"] .ar6-rt-crest{background:radial-gradient(circle,rgba(225,29,72,.44),#080103 75%);border-color:#FF2E55;box-shadow:0 0 32px rgba(255,46,85,.78);}',
  '#ar6-card[data-skin="xuanhuan"] .ar6-rt-tag{background:rgba(180,83,9,.28);border:1px solid rgba(251,191,36,.68);color:#FEF08A;}',
  '#ar6-card[data-skin="xuanhuan"] .ar6-ritual[data-ritual="noa"] .ar6-rt-tag{background:rgba(15,118,110,.3);border-color:#2DD4BF;color:#CCFBF1;}',
  '#ar6-card[data-skin="xuanhuan"] .ar6-ritual[data-ritual="abyss"] .ar6-rt-tag{background:rgba(159,18,57,.32);border-color:#FF2E55;color:#FFE4E6;}',
  '#ar6-card[data-skin="xuanhuan"] .ar6-rt-title{color:#FFFBEB;text-shadow:0 0 22px rgba(245,158,11,.82),0 0 10px rgba(239,68,68,.55);}',
  '#ar6-card[data-skin="xuanhuan"] .ar6-rt-prologue{color:#FDE68A;}',
  '#ar6-card[data-skin="xuanhuan"] .ar6-rt-quote{background:linear-gradient(135deg,rgba(180,83,9,.26),rgba(14,7,5,.88));border:1px solid rgba(251,191,36,.58);box-shadow:inset 0 0 22px rgba(245,158,11,.18);color:#FFFBEB;}',
  '#ar6-card[data-skin="xuanhuan"] .ar6-ritual[data-ritual="noa"] .ar6-rt-quote{border-color:rgba(45,212,191,.64);box-shadow:inset 0 0 22px rgba(45,212,191,.2);}',
  '#ar6-card[data-skin="xuanhuan"] .ar6-ritual[data-ritual="abyss"] .ar6-rt-quote{background:linear-gradient(135deg,rgba(159,18,57,.3),rgba(6,1,3,.94));border-color:rgba(255,46,85,.7);color:#FFE4E6;text-shadow:0 0 12px rgba(255,46,85,.62);}',
  '#ar6-card[data-skin="xuanhuan"] .ar6-rt-note{background:rgba(18,9,6,.82);border-color:rgba(245,158,11,.4);color:#FCD34D;}',
  '#ar6-card[data-skin="xuanhuan"] .ar6-rt-ok{background:linear-gradient(135deg,#F59E0B 0%,#C2410C 58%,#991B1B 100%);border:1.5px solid #FEF08A;color:#FFFBEB;box-shadow:0 0 28px rgba(245,158,11,.66),0 0 14px rgba(239,68,68,.44);}',
  '#ar6-card[data-skin="xuanhuan"] .ar6-ritual[data-ritual="noa"] .ar6-rt-ok{background:linear-gradient(135deg,#0D9488 0%,#D97706 100%);border-color:#99F6E4;box-shadow:0 0 30px rgba(45,212,191,.68),0 0 18px rgba(245,158,11,.5);}',
  '#ar6-card[data-skin="xuanhuan"] .ar6-ritual[data-ritual="abyss"] .ar6-rt-ok{background:linear-gradient(135deg,#E11D48 0%,#7F1D1D 100%);border-color:#FDA4AF;box-shadow:0 0 32px rgba(255,46,85,.72);}',
  '#ar6-card[data-skin="xuanhuan"] .ar6-rt-no{background:#120907;border:1px solid rgba(245,158,11,.34);color:#D6B18B;}',

  /* --- 皮肤弹窗：pink（绯樱微醺 · 霓虹绯樱 + 暗梅丝绒蔷薇光效） --- */
  '#ar6-card[data-skin="pink"] .ar6-ritual{background:radial-gradient(circle at 50% 0%,rgba(255,92,168,.3) 0%,transparent 58%),linear-gradient(180deg,#301126 0%,#1C0917 58%,#13050F 100%);border:1.5px solid rgba(255,148,204,.78);border-radius:22px;box-shadow:0 0 0 1px rgba(255,228,242,.26),0 0 50px rgba(255,77,157,.44),0 24px 64px rgba(18,2,14,.94);color:#FFF0F7;}',
  '#ar6-card[data-skin="pink"] .ar6-ritual::before{height:4px;background:linear-gradient(90deg,#EC4899,#FF85C0,#FFE4F2,#F43F5E,#EC4899);background-size:200% 100%;animation:ar6SpeciumFlow 3.2s linear infinite;}',
  '#ar6-card[data-skin="pink"] .ar6-ritual[data-ritual="abyss"]{background:radial-gradient(circle at 50% 0%,rgba(225,29,72,.34) 0%,transparent 58%),linear-gradient(180deg,#240715 0%,#12030B 60%,#0A0106 100%);border-color:#FB7185;box-shadow:0 0 52px rgba(225,29,72,.52),0 24px 64px rgba(10,1,6,.96);}',
  '#ar6-card[data-skin="pink"] .ar6-rt-crest{background:radial-gradient(circle,rgba(255,92,168,.42),#22081A 75%);border:1.5px solid #FFD1E8;box-shadow:0 0 28px rgba(255,77,157,.72);}',
  '#ar6-card[data-skin="pink"] .ar6-ritual[data-ritual="abyss"] .ar6-rt-crest{background:radial-gradient(circle,rgba(225,29,72,.46),#14020B 75%);border-color:#FDA4AF;box-shadow:0 0 30px rgba(225,29,72,.78);}',
  '#ar6-card[data-skin="pink"] .ar6-rt-tag{background:rgba(255,77,157,.26);border:1px solid rgba(255,194,226,.68);color:#FFE4F2;border-radius:999px;}',
  '#ar6-card[data-skin="pink"] .ar6-rt-title{color:#FFF5FA;text-shadow:0 0 20px rgba(255,77,157,.78);}',
  '#ar6-card[data-skin="pink"] .ar6-rt-prologue{color:#FBCFE8;}',
  '#ar6-card[data-skin="pink"] .ar6-rt-quote{background:linear-gradient(135deg,rgba(255,77,157,.22),rgba(28,8,22,.86));border:1px dashed rgba(255,166,212,.64);box-shadow:inset 0 0 20px rgba(255,92,168,.18);color:#FFF5FA;border-radius:16px;}',
  '#ar6-card[data-skin="pink"] .ar6-rt-note{background:rgba(32,10,26,.8);border-color:rgba(255,148,204,.4);color:#F9A8D4;border-radius:12px;}',
  '#ar6-card[data-skin="pink"] .ar6-rt-ok{background:linear-gradient(135deg,#FF4D9D 0%,#DB2777 60%,#9D174D 100%);border:1.5px solid #FFE4F2;color:#FFFFFF;border-radius:14px;box-shadow:0 0 28px rgba(255,77,157,.68);}',
  '#ar6-card[data-skin="pink"] .ar6-ritual[data-ritual="abyss"] .ar6-rt-ok{background:linear-gradient(135deg,#E11D48 0%,#881337 100%);border-color:#FDA4AF;box-shadow:0 0 30px rgba(225,29,72,.74);}',
  '#ar6-card[data-skin="pink"] .ar6-rt-no{background:rgba(40,12,32,.86);border:1px solid rgba(255,148,204,.34);color:#E2A9C8;border-radius:14px;}',

  /* --- 全屏皮肤觉醒叠加层与召唤仪式 --- */
  '#ar6-fx[data-skin]{position:fixed;inset:0;z-index:2147483644;pointer-events:none;overflow:hidden;animation:ar6SkAwakenIn 1.6s cubic-bezier(.22,1,.36,1) forwards;}',
  '.ar6-skfx-ring{position:absolute;left:50%;top:50%;width:min(78vw,620px);height:min(78vw,620px);border-radius:50%;border:2.5px solid var(--skfx-c1,#58A6FF);box-shadow:0 0 42px var(--skfx-c1,#58A6FF),inset 0 0 36px var(--skfx-c2,#FFFFFF);animation:ar6SkRingBurst 1.45s cubic-bezier(.16,1,.3,1) forwards;}',
  '.ar6-skfx-ring.r2{width:min(54vw,420px);height:min(54vw,420px);border-style:dashed;border-color:var(--skfx-c2,#FFFFFF);animation-delay:.1s;}',
  '.ar6-skfx-slash{position:absolute;left:50%;top:50%;width:min(28vw,180px);height:110vh;background:linear-gradient(90deg,transparent 0%,var(--skfx-c1,#2DD4BF) 35%,#FFFFFF 50%,var(--skfx-c2,#F59E0B) 65%,transparent 100%);filter:blur(6px);opacity:0;animation:ar6SkSlash 1.25s ease-out forwards;}',
  '.ar6-skfx-banner{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);padding:14px 30px;border-radius:999px;background:rgba(5,9,18,.84);border:1.5px solid var(--skfx-c1,#58A6FF);box-shadow:0 0 38px var(--skfx-c1,#58A6FF),inset 0 0 18px rgba(255,255,255,.16);color:#FFFFFF;font:800 clamp(16px,4.2vw,26px)/1.25 system-ui,-apple-system,"Microsoft YaHei",sans-serif;white-space:nowrap;text-shadow:0 0 22px var(--skfx-c1,#58A6FF);animation:ar6SkBannerPop 1.55s cubic-bezier(.22,1,.36,1) forwards;}',
  '.ar6-skfx-sub{display:block;font-size:11.5px;font-weight:700;letter-spacing:2.4px;color:var(--skfx-c2,#FEF08A);text-align:center;margin-bottom:4px;opacity:.92;}',

  '#ar6-skin-summon{position:fixed;inset:0;z-index:2147483645;pointer-events:none;display:flex;align-items:center;justify-content:center;animation:ar6SkAwakenIn 1.15s cubic-bezier(.22,1,.36,1) forwards;}',
  '.ar6-sksum-box{position:relative;display:flex;flex-direction:column;align-items:center;gap:10px;padding:22px 30px;border-radius:20px;background:rgba(6,10,20,.88);border:1.5px solid var(--skfx-c1,#58A6FF);box-shadow:0 0 46px var(--skfx-c1,#58A6FF),0 18px 54px rgba(0,0,0,.86);text-align:center;max-width:calc(100vw - 32px);}',
  '.ar6-sksum-crest{width:64px;height:64px;border-radius:50%;display:flex;align-items:center;justify-content:center;background:radial-gradient(circle,rgba(255,255,255,.16),transparent 72%);border:1.5px solid var(--skfx-c2,#FFFFFF);box-shadow:0 0 28px var(--skfx-c1,#58A6FF);}',
  '.ar6-sksum-crest svg{width:46px;height:46px;animation:ar6SkSpin 5s linear infinite;}',
  '.ar6-sksum-tag{font-size:11px;font-weight:800;letter-spacing:2px;color:var(--skfx-c2,#FEF08A);}',
  '.ar6-sksum-line{font-size:16px;font-weight:800;color:#FFFFFF;text-shadow:0 0 18px var(--skfx-c1,#58A6FF);}',
  '@media (prefers-reduced-motion:reduce){.ar6-sk-amb .ar6-sk-spin,.ar6-sk-amb .ar6-sk-spinr,#ar6-card .ar6-rt-ok::after,#ar6-card .ar6-rt-crest{animation:none!important;}}'
].join('\n');

/* ---------------- 四皮肤全屏 1.6s 高燃觉醒演出 ---------------- */
function triggerSkinAwakenFx(sk, k) {
  try {
    if (DISPOSED || !DOC || !DOC.body) return false;
    if (cfg && (cfg.rm === true || cfg.fx === 'off')) return false;
    try {
      if (HOST && HOST.matchMedia && HOST.matchMedia('(prefers-reduced-motion: reduce)').matches) return false;
    } catch (eRM) {}
    if (typeof clearAwakenFx === 'function') clearAwakenFx();

    var isAbyss = (k === 'abyss');
    var isNoa = (k === 'noa' || k === 'gatanothor');
    var rt = lkSkinRitualData(sk, isNoa ? 'noa' : k);
    var c1 = '#58A6FF', c2 = '#3FB950', showSlash = false;
    if (sk === 'plain') {
      c1 = isAbyss ? '#F85149' : (isNoa ? '#38BDF8' : (k === 'supreme' ? '#EAB308' : '#2F81F7'));
      c2 = isAbyss ? '#FDA4AF' : '#3FB950';
    } else if (sk === 'xianxia') {
      c1 = isAbyss ? '#C084FC' : (isNoa ? '#5EEAD4' : (k === 'supreme' ? '#E7C476' : '#2DD4BF'));
      c2 = isAbyss ? '#F43F5E' : '#FEF08A';
      showSlash = isNoa || isAbyss;
    } else if (sk === 'xuanhuan') {
      c1 = isAbyss ? '#FF2E55' : (isNoa ? '#2DD4BF' : '#F59E0B');
      c2 = isAbyss ? '#FCA5A5' : '#FEF08A';
      showSlash = isNoa || isAbyss || k === 'supreme';
    } else if (sk === 'pink') {
      c1 = isAbyss ? '#E11D48' : '#FF4D9D';
      c2 = isAbyss ? '#FDA4AF' : '#FFE4F2';
    }

    var el = DOC.createElement('div');
    el.id = 'ar6-fx';
    el.setAttribute('data-tier', k);
    el.setAttribute('data-skin', sk);
    el.setAttribute('aria-hidden', 'true');
    el.style.cssText = '--skfx-c1:' + c1 + ';--skfx-c2:' + c2 + ';background:radial-gradient(circle at 50% 50%,rgba(0,0,0,0) 20%,rgba(2,6,16,.58) 100%);';

    var tagStr = (rt && rt.tag) ? rt.tag : (sk.toUpperCase() + ' · ' + k.toUpperCase());
    var titleStr = (rt && rt.title) ? rt.title : '形态觉醒';
    el.innerHTML = lkSkinRitualAmbientSVG(sk, isNoa ? 'noa' : k) +
      '<div class="ar6-skfx-ring"></div>' +
      '<div class="ar6-skfx-ring r2"></div>' +
      (showSlash ? '<div class="ar6-skfx-slash"></div>' : '') +
      '<div class="ar6-skfx-banner"><span class="ar6-skfx-sub">' + esc(tagStr) + '</span>' + esc(titleStr) + '</div>';

    DOC.body.appendChild(el);
    if (typeof FX_TIMER !== 'undefined' && FX_TIMER) {
      try { clearTimeout(FX_TIMER); } catch (eC0) {}
    }
    FX_TIMER = setTimeout(function () {
      try { if (typeof clearAwakenFx === 'function') clearAwakenFx(); } catch (eC1) {}
    }, 1650);
    try { if (typeof avatarSyncForm === 'function') avatarSyncForm(true); } catch (eAv) {}
    return true;
  } catch (e) { return false; }
}

/* ---------------- 四皮肤专属 3D 桌宠召唤演出 ---------------- */
var AR6_SKIN_SUMMON_TIMER = null;
function triggerSkinSummon(sk, opts) {
  var o = opts || {};
  try {
    if (DISPOSED) return false;
    var pConf = lkSkinPetConf(sk);
    var form = (typeof petCurrentForm === 'function') ? petCurrentForm() : 'multi';
    if (!AR6_PET_STATE && typeof petRead === 'function') AR6_PET_STATE = petRead();
    var reduced = !!(cfg && (cfg.rm === true || cfg.fx === 'off')) || !!(AR6_PET_STATE && AR6_PET_STATE.motion === 'off');
    try {
      if (!reduced && HOST && HOST.matchMedia && HOST.matchMedia('(prefers-reduced-motion: reduce)').matches) reduced = true;
    } catch (eRM) {}

    if (typeof AR6_PET_STATE === 'object' && AR6_PET_STATE) {
      AR6_PET_STATE.show = true;
      AR6_PET_STATE.docked = false;
      if (typeof petSave === 'function') petSave();
    }
    if (o && o.minimizeOnFire) {
      try {
        if (typeof minimized !== 'undefined' && !minimized) {
          minimized = true;
          if (cfg) cfg.docked = false;
          if (typeof MORE_OPEN !== 'undefined') MORE_OPEN = false;
          if (typeof syncMin === 'function') syncMin();
          if (typeof render === 'function') render();
        }
      } catch (eMinS) {}
    }
    if (typeof avatarMount === 'function') avatarMount();

    if (reduced || !DOC || !DOC.body) {
      if (typeof avatarSetVisualState === 'function') avatarSetVisualState('landed');
      if (typeof avatarSyncForm === 'function') avatarSyncForm(true);
      if (typeof avatarSay === 'function') avatarSay('summon');
      if (typeof syncPill === 'function') syncPill();
      if (typeof o.onDone === 'function') try { o.onDone(); } catch (eD0) {}
      return true;
    }

    if (typeof ensureStyle === 'function') ensureStyle(DOC);
    var old = DOC.getElementById('ar6-skin-summon');
    if (old && old.parentNode) old.parentNode.removeChild(old);
    if (AR6_SKIN_SUMMON_TIMER) { try { clearTimeout(AR6_SKIN_SUMMON_TIMER); } catch (eT0) {} AR6_SKIN_SUMMON_TIMER = null; }

    var isAbyss = (form === 'abyss');
    var isNoa = (form === 'noa');
    var c1 = '#58A6FF', c2 = '#3FB950';
    if (sk === 'xianxia') { c1 = isAbyss ? '#C084FC' : '#5EEAD4'; c2 = isAbyss ? '#F43F5E' : '#E7C476'; }
    else if (sk === 'xuanhuan') { c1 = isAbyss ? '#FF2E55' : (isNoa ? '#2DD4BF' : '#F59E0B'); c2 = isAbyss ? '#FCA5A5' : '#FEF08A'; }
    else if (sk === 'pink') { c1 = isAbyss ? '#E11D48' : '#FF4D9D'; c2 = isAbyss ? '#FDA4AF' : '#FFE4F2'; }
    else if (sk === 'plain' && isAbyss) { c1 = '#F85149'; c2 = '#FDA4AF'; }

    var tagTxt = (pConf && ((isAbyss && pConf.abyssSummonTag) || (isNoa && pConf.noaSummonTag) || pConf.summonTag)) || 'SUMMON';
    var lineTxt = (pConf && ((isAbyss && pConf.abyssSummonLine) || (isNoa && pConf.noaSummonLine) || pConf.summonLine)) || '3D 守护伙伴已上线';

    var el = DOC.createElement('div');
    el.id = 'ar6-skin-summon';
    el.setAttribute('data-skin', sk);
    el.style.cssText = '--skfx-c1:' + c1 + ';--skfx-c2:' + c2 + ';';
    el.innerHTML = '<div class="ar6-sksum-box">' +
      '<div class="ar6-sksum-crest">' + lkSkinRitualCrestSVG(sk, form) + '</div>' +
      '<div class="ar6-sksum-tag">' + esc(tagTxt) + '</div>' +
      '<div class="ar6-sksum-line">' + esc(lineTxt) + '</div>' +
    '</div>';
    DOC.body.appendChild(el);

    if (typeof avatarSetVisualState === 'function') avatarSetVisualState('landed');
    if (typeof avatarSyncForm === 'function') avatarSyncForm(true);
    if (typeof syncPill === 'function') syncPill();

    AR6_SKIN_SUMMON_TIMER = setTimeout(function () {
      AR6_SKIN_SUMMON_TIMER = null;
      if (DISPOSED) return;
      try {
        var n = DOC && DOC.getElementById('ar6-skin-summon');
        if (n && n.parentNode) n.parentNode.removeChild(n);
      } catch (eRm) {}
      try { if (typeof avatarSay === 'function') avatarSay('summon'); } catch (eSy) {}
      if (typeof o.onDone === 'function') try { o.onDone(); } catch (eD1) {}
    }, 1150);
    return true;
  } catch (e) { return false; }
}
