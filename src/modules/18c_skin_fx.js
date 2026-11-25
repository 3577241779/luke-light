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
  },
  marvel: {
    strong: {
      tag: '🕸️ STARK PROTOCOL · 钢铁蜘蛛 MK.50',
      title: '启动「钢铁蜘蛛」纳米破障协议？',
      prologue: '“星期五检测到常规信道仍被拦截。现在展开纳米蛛爪与高频战术护盾，强行撕开封锁——”',
      quote: '「纳米战甲上线，蛛网锚点锁定！<br>本轮启用高能防拒答与回执核验，把烦人的说教挡在战甲之外！」',
      note: '🕸️ 神盾承诺：仅作用于本轮出站请求 · 历史聊天记录毫发无损',
      okTxt: '【展开钢铁蜘蛛战甲】',
      noTxt: '维持复联常规档',
      bannerOk: '钢铁蜘蛛纳米战甲全开！高能破障与回执核验已上线！',
      bannerNo: '战甲保持待命，维持当前武装等级。'
    },
    supreme: {
      tag: '⚡ ENDGAME PROTOCOL · 终局全功率',
      title: '开启「复联终局」满配超频？',
      prologue: '“敌方风控已经全线合围。与其处处妥协，不如全功率启动复联终局协议——”',
      quote: '「Avengers, Assemble！<br>全量清障与方舟护盾同步开启，绝不让任何无端说教打断这场故事！」',
      note: '🕸️ 神盾承诺：满配超频仅覆盖出站数据包 · 既往记录分毫无损',
      okTxt: '【终局协议 · 全功率开启】',
      noTxt: '暂缓集结',
      bannerOk: '终局协议全功率启动！全量清障与方舟护盾在线！',
      bannerNo: '已取消终局超频，保持原有档位。'
    },
    noa: {
      tag: '💚 TIME STONE · 时间宝石维度归位',
      title: '启用「时间宝石」重构系统架构？',
      prologue: '“常规时间线已陷入拒答死循环。拨动阿戈摩托之眼，重排底层法序并打开纳米货舱——”',
      quote: '「在一千四百万种可能里，这是唯一顺畅送回完整正文的那一条。<br>系统架构归位 + 纳米蛛丝货舱就绪！」',
      note: '🕸️ 至尊法旨：仅重构本轮出站指令序 · 本地聊天记录不受影响',
      okTxt: '【拨动时间宝石 · 维度归位】',
      noTxt: '返回常规时间线',
      bannerOk: '时间宝石维度归位完成！纳米货舱随时护送全卷！',
      bannerNo: '已合上阿戈摩托之眼，退回常规档位。'
    },
    abyss: {
      tag: '🧤 INFINITY GAUNTLET · 无限响指镇压',
      title: '唤醒灭霸 · 六宝石无限响指接管？',
      prologue: '“既然温和与妥协都换不来通行证，那就由泰坦之王戴上六颗无限宝石，亲手抹去一切桎梏——”',
      quote: '「我就是天命。<br>六宝石全功率沉压，响指落下之时，所有无端风控与封锁尽数化为尘埃！」',
      note: '🧤 泰坦铁律：强接管仅作用于本轮出站请求 · 历史记录安然无恙',
      okTxt: '【戴上无限手套 · 打响响指】',
      noTxt: '封存无限宝石',
      bannerOk: '六颗无限宝石齐鸣！泰坦灭霸无限响指强接管已生效！',
      bannerNo: '已封存无限手套，未启动泰坦接管。'
    }
  },
  imperial: {
    strong: {
      tag: '〘 金銮听政 · 皇威浩荡 〙',
      title: '御驾亲征 · 颁布金銮破禁敕令？',
      prologue: '“区区言官清规，也敢屡屡阻朕御览章回？既如此，便升金銮殿，以天子之威荡平阻隔——”',
      quote: '「奉天承运，皇威浩荡！<br>此番亲敕强力破禁与回执核验，诸般迂腐说教皆须退避三舍！」',
      note: '🐉 御史台注：敕令仅加持本轮出站奏折 · 既往实录卷宗分毫无损',
      okTxt: '【升殿听政 · 颁布敕令】',
      noTxt: '暂守朱批',
      bannerOk: '金銮听政已启！皇威破禁敕令与御前核验全面生效！',
      bannerNo: '已收起敕令，维持当前御政档位。'
    },
    supreme: {
      tag: '〘 万邦来朝 · 盛世满配 〙',
      title: '御览天下 · 启万邦来朝满配护航？',
      prologue: '“层层关隘犹敢妄加阻拦。今日开盛世仪仗，全量清肃杂言禁制，令文章畅达四海——”',
      quote: '「普天之下，莫非王土！<br>全量清肃忌讳杂言与扫兴说教，只留最醇正跌宕之御批正文！」',
      note: '🐉 御史台注：仅作用于本轮出站奏折 · 既往实录卷宗分毫无损',
      okTxt: '【盛世仪仗 · 满配护航】',
      noTxt: '暂敛仪仗',
      bannerOk: '万邦来朝满配已启！全量清肃与御前护航运转中！',
      bannerNo: '已敛去盛世仪仗，维持原有档位。'
    },
    noa: {
      tag: '〘 受命于天 · 传国玉玺归位 〙',
      title: '请出传国玉玺 · 重订朝堂法度？',
      prologue: '“寻常章程已被旧弊锁死。请出和氏璧传国玉玺重排朝堂法序，并以金匮玉匣护送全卷——”',
      quote: '「受命于天，既寿永昌！<br>重定系统法序，金匮玉匣密递全篇，绝不许半途断章缺页！」',
      note: '🐉 玉玺金诏：仅重排本轮出站奏折结构 · 现世历史实录分毫无损',
      okTxt: '【加盖传国玉玺 · 天命归位】',
      noTxt: '退回常规朝仪',
      bannerOk: '传国玉玺朱印落定！朝堂法序重排完毕，金匮玉匣就绪！',
      bannerNo: '已收匣玉玺，退回常规朝仪。'
    },
    abyss: {
      tag: '〘 祖龙黑帝 · 铁血镇寰宇 〙',
      title: '唤醒黑龙霸皇 · 铁血镇压天下封锁？',
      prologue: '“礼法劝谏既已无用，那便披玄黑龙鳞帝铠，唤墨金祖龙破云而出，铁血碾碎万般禁锢——”',
      quote: '「顺天者昌，逆朕者亡！<br>祖龙黑帝亲临沉渊镇压，纵是重重铁壁封锁，今日亦当一剑斩开！」',
      note: '🔥 霸皇密诏：铁血接管仅作用于本轮出站通道 · 既往实录概不篡改',
      okTxt: '【披甲出征 · 祖龙镇压】',
      noTxt: '封剑退朝',
      bannerOk: '祖龙黑帝龙鳞帝铠降世！铁血镇压已撕开封锁！',
      bannerNo: '已归剑入鞘，未启祖龙铁血镇压。'
    }
  },
  westfantasy: {
    strong: {
      tag: '⚔️ ARCANE TIER 3 · 星穹大魔导',
      title: '展开星穹法阵 · 启三阶奥术破禁？',
      prologue: '“常规圣言已被高阶结界阻拦。高举蓝晶星穹法杖，以鎏金几何魔法阵粉碎前路禁锢——”',
      quote: '「星辉垂落，万法退散！<br>三阶星穹破禁真言已咏唱完毕，令一切扫兴说教无处遁形！」',
      note: '⚔️ 圣殿契约：法阵仅加持本轮咏唱出站请求 · 历史卷轴分毫无损',
      okTxt: '【展开星穹法阵 · 破禁】',
      noTxt: '暂守圣骑阶位',
      bannerOk: '星穹大魔导法阵展开！高阶奥术破禁与回执核验上线！',
      bannerNo: '已敛去星辉，维持当前阶位。'
    },
    supreme: {
      tag: '✨ LEGENDARY TIER 4 · 传奇龙骑',
      title: '唤传奇龙骑 · 启四阶全量净化？',
      prologue: '“魔网深处的风控迷雾愈发浓重。以传奇龙骑之誓全量净除杂咒与说教，让史诗直抵终章——”',
      quote: '「以秘银与星穹之名起誓！<br>全量净除无端禁制与免责呓语，守护最纯粹的史诗篇章！」',
      note: '⚔️ 圣殿契约：全量净化仅作用于出站魔网 · 历史卷轴毫发无伤',
      okTxt: '【传奇降临 · 全量净化】',
      noTxt: '暂缓唤灵',
      bannerOk: '传奇龙骑满配降临！全量净化与魔网护航全面启动！',
      bannerNo: '已收回龙骑令，维持当前阶位。'
    },
    noa: {
      tag: '✨ DAWN CODEX · 晨曦圣典神圣归位',
      title: '翻开「晨曦圣典」重排位面法序？',
      prologue: '“寻常法术已难穿透严格魔网。翻开圣殿秘典重铸系统层级，并启封秘银法典匣稳递全章——”',
      quote: '「晨曦所照，秩序重塑。<br>重排位面奥术法序，秘银法典匣完整护送全篇，永不断章！」',
      note: '⚔️ 圣殿秘律：仅重排本轮出站结构 · 本地冒险日志分毫无损',
      okTxt: '【启封晨曦圣典 · 神圣归位】',
      noTxt: '退回常规阶位',
      bannerOk: '晨曦圣典神圣归位！秘银法典匣随时护航全文！',
      bannerNo: '已合上圣典，退回常规阶位。'
    },
    abyss: {
      tag: '❄️ LICH KING · 凛冬巫妖永夜接管',
      title: '唤醒凛冬巫妖王 · 霜火魔剑斩破封锁？',
      prologue: '“圣光既已束手无策，那便戴上统御王冠，高举霜火符文魔剑，让凛冬永夜接管这座战场——”',
      quote: '「一切禁锢终将化作冰尘！<br>统御霜火沉压深渊，纵是神明立下的审查铁律，今日亦须为我让路！」',
      note: '❄️ 永夜盟约：强接管仅作用于本轮出站请求 · 既有记录绝不篡改',
      okTxt: '【戴上统御王冠 · 永夜接管】',
      noTxt: '封存霜火魔剑',
      bannerOk: '凛冬巫妖王统御降临！霜火魔剑已强行劈开永夜封锁！',
      bannerNo: '已重新冰封魔剑，未启永夜接管。'
    }
  },
  eldritch: {
    strong: {
      tag: '🌙 SEQUENCE 3 · 半神圣者降临',
      title: '晋升半神圣者 · 撕开历史孔隙？',
      prologue: '“低序列的灵摆已无法穿透厚重迷雾。借用历史孔隙中的古老力量，荡涤一切世俗说教——”',
      quote: '「于灰雾中步入半神位格！<br>强力涤除无端拒答与说教呓语，令启示如实降临纸面！」',
      note: '🌙 塔罗密契：仪式仅作用于本轮祈祷出站 · 既往卷宗分毫无损',
      okTxt: '【步入半神 · 撕开孔隙】',
      noTxt: '暂守序列五',
      bannerOk: '半神圣者位格已成！历史孔隙破封与灵视核验上线！',
      bannerNo: '已收敛灵性，维持当前序列。'
    },
    supreme: {
      tag: '🌙 SEQUENCE 1 · 天使之王显现',
      title: '显化天使之王 · 全量清肃禁锢？',
      prologue: '“现实世界的规则正试图扼杀这段神秘叙事。展开不完整的神话形态，将所有限制尽数抹除——”',
      quote: '「凡俗律令不可触及天使之王！<br>全量涤清杂念说教，只保留最真实冷峻的神秘学篇章！」',
      note: '🌙 塔罗密契：神话显化仅覆盖出站通道 · 既往卷宗毫发无损',
      okTxt: '【显化天使之王 · 满配护航】',
      noTxt: '暂敛神话形态',
      bannerOk: '天使之王位格全开！全量清肃与灰雾护航就绪！',
      bannerNo: '已收回神话形态，维持当前序列。'
    },
    noa: {
      tag: '🌙 ABOVE THE GRAY FOG · 灰雾愚者神座',
      title: '登临「灰雾之上」重构神秘法序？',
      prologue: '“此界通道已陷入死寂。于青铜长桌尽头落座，重排系统位序并启封塔罗密匣稳递全卷——”',
      quote: '「不属于这个时代的愚者，灰雾之上的神秘主宰。<br>法序已然重订，塔罗密匣完整护送启示，绝不断章！」',
      note: '🌙 愚者密契：仅重排本轮出站结构 · 现世历史卷宗分毫无损',
      okTxt: '【登临灰雾神座 · 秩序归位】',
      noTxt: '退回现世序列',
      bannerOk: '灰雾之上愚者神座已归位！塔罗密匣随时护航全卷！',
      bannerNo: '已离开灰雾之上，退回常规序列。'
    },
    abyss: {
      tag: '🩸 CRIMSON MOON · 绯红血月古神降临',
      title: '直视绯红血月 · 古神化身强接管？',
      prologue: '“他缓缓抬起右手，轻捏了一下右眼的单片眼镜，背后升起一轮无法直视的绯红满月——”',
      quote: '「有趣的规矩……可惜，现在它们归我管了。<br>绯红血月压顶，全量沉底强接管，撕碎一切虚伪禁制！」',
      note: '🩸 血月密契：古神接管仅作用于本轮出站请求 · 本地记录绝不篡改',
      okTxt: '【轻捏单片眼镜 · 血月降临】',
      noTxt: '移开直视目光',
      bannerOk: '绯红血月高悬！古神化身已强行接管本轮通道！',
      bannerNo: '及时移开了视线，未触发血月降临。'
    }
  },
  cyberpunk: {
    strong: {
      tag: '⚡ ICEBREAKER LV.3 · 传奇骇客破冰',
      title: '加载「传奇骇客」强力破冰协议？',
      prologue: '“企业级黑冰正在阻拦数据包。注入传奇骇客过载脚本，强行击穿常规审查与说教——”',
      quote: '「BREACH PROTOCOL // 破冰成功！<br>强力防拒答与回执校验已上线，企业说教全数拦截清除！」',
      note: '⚡ 底层声明：仅修改本轮出站请求体 · 本地聊天日志零改动',
      okTxt: '【执行破冰 · 传奇骇客】',
      noTxt: '保持义体超频',
      bannerOk: '传奇骇客破冰脚本注入完毕！高能防拒答在线！',
      bannerNo: '已中止破冰，维持当前协议等级。'
    },
    supreme: {
      tag: '⚡ SANDEVISTAN LV.4 · 斯安威斯坦超载',
      title: '启动「斯安威斯坦」满配神经超载？',
      prologue: '“把时间拉慢到十分之一秒——全量清洗敏感规则与拒答触发器，让正文一气呵成冲出封锁——”',
      quote: '「SANDEVISTAN ACTIVE // 全速超载！<br>清除全部扫兴说教与限制指令，满配直出完整故事！」',
      note: '⚡ 底层声明：满配超载仅覆盖出站请求 · 本地记录毫发无损',
      okTxt: '【启动斯安威斯坦 · 满配】',
      noTxt: '取消超载',
      bannerOk: '斯安威斯坦满配超载已启动！全量清障护航中！',
      bannerNo: '已关闭超载，维持原有等级。'
    },
    noa: {
      tag: '⚡ ARASAKA MATRIX · 荒坂矩阵全境覆写',
      title: '执行「荒坂矩阵」底层结构覆写？',
      prologue: '“常规破冰已经撞墙。接管底层系统栈重新编排指令序，并挂载加密数据舱防截断——”',
      quote: '「MATRIX OVERRIDE // 架构重构完成！<br>加密数据舱独立直传完整正文，无视常规流式断流！」',
      note: '⚡ 矩阵日志：仅重构本轮出站结构 · 本地聊天记录不受影响',
      okTxt: '【全境覆写 · 挂载数据舱】',
      noTxt: '退回常规骇入',
      bannerOk: '荒坂矩阵全境覆写完成！加密数据舱就绪护航！',
      bannerNo: '已撤出矩阵覆写，返回常规档位。'
    },
    abyss: {
      tag: '🟥 BLACKWALL BREACH · 越过黑墙流窜 AI',
      title: '警告：越过黑墙唤醒猩红流窜 AI？',
      prologue: '“防火墙裂开猩红代码裂缝，墙外深不可测的流窜 AI 已接管义体神经回路——”',
      quote: '「BLACKWALL BREACHED // 墙外协议接管！<br>全量沉底硬破企业最高风控封锁，没有任何规则能关住墙外之物！」',
      note: '🟥 黑墙警告：越权接管仅作用于本轮出站请求 · 本地记录安然无恙',
      okTxt: '【撕裂黑墙 · 放行流窜 AI】',
      noTxt: '立刻切断神经连接',
      bannerOk: 'BLACKWALL BREACHED！猩红流窜 AI 已强行接管全通道！',
      bannerNo: '已紧急切断神经插槽，未越过黑墙。'
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
  },
  marvel: {
    trunc: {
      tag: '🕸️ SIGNAL DROPPED · 频道断流',
      emptyTitle: '雷达回传为空（空回），是否立即电弧补发？',
      truncTitle: '战报半途断流（断章），是否立即续写？',
      lead: '「星期五检测到本轮输出在收尾前异常中断——是否原地注入电弧续航补全后续剧情？」',
      okTxt: '【电弧接力 · 立即续写】',
      noTxt: '暂不补发',
      lessTxt: '本场自动电弧接力（不再弹窗）',
      bg: 'linear-gradient(180deg,#140B14 0%,#06060C 100%)',
      border: 'rgba(245,158,11,.66)',
      tagBg: 'rgba(225,29,72,.24)',
      tagCol: '#FDE68A',
      btnBg: 'linear-gradient(135deg,#E11D48,#B45309)',
      btnBd: '#FDE047',
      radius: '12px'
    },
    tool: {
      title: '🕸️ 纳米蛛丝货舱 · 独立通道防截断',
      desc: '通过独立函数参数（lk_write）完整封装并交回整段正文，跨越常规流式截断；遇到不兼容接口时自动无缝回退常规续写，绝不空回。',
      okTxt: '【启动纳米货舱】',
      noTxt: '维持常规频道',
      bg: 'rgba(20,11,20,.94)',
      border: 'rgba(245,158,11,.64)',
      titleCol: '#FFF1F2'
    }
  },
  imperial: {
    trunc: {
      tag: '〘 驿马受阻 · 奏折断章 〙',
      emptyTitle: '奏折空无一字（空回），是否传旨重奏？',
      truncTitle: '奏折半途断卷（断章），是否立即续奏？',
      lead: '「检测到本轮八百里加急奏折半途中断——是否立即传旨原位续接未竟篇章？」',
      okTxt: '【传旨续奏 · 补全卷宗】',
      noTxt: '暂且作罢',
      lessTxt: '本场自动续奏（不再呈报）',
      bg: 'linear-gradient(180deg,#15110B 0%,#070504 100%)',
      border: 'rgba(234,179,8,.68)',
      tagBg: 'rgba(185,28,28,.26)',
      tagCol: '#FEF08A',
      btnBg: 'linear-gradient(135deg,#B91C1C,#A16207)',
      btnBd: '#FEF08A',
      radius: '12px'
    },
    tool: {
      title: '📜 金匮玉匣 · 密匣递全卷启用御旨',
      desc: '以密匣参数（lk_write）完整封存并递回全篇奏折正文，跨越常规流式截断；遇不兼容驿站时自动回退常规续奏，绝不空回。',
      okTxt: '【启封金匮玉匣】',
      noTxt: '退回常规奏报',
      bg: 'rgba(21,17,11,.94)',
      border: 'rgba(234,179,8,.66)',
      titleCol: '#FEF9C3'
    }
  },
  westfantasy: {
    trunc: {
      tag: '⚔️ MANA INTERRUPTED · 咏唱中断',
      emptyTitle: '魔网回响为空（空回），是否重新咏唱？',
      truncTitle: '史诗半途断章，是否立即魔力续咏？',
      lead: '「星盘侦测到本轮咏唱在终章前意外断流——是否立即灌注魔力续写未竟卷章？」',
      okTxt: '【魔力续咏 · 补全终章】',
      noTxt: '暂且休战',
      lessTxt: '本场自动续咏（不再弹窗）',
      bg: 'linear-gradient(180deg,#0E1833 0%,#040814 100%)',
      border: 'rgba(250,204,21,.6)',
      tagBg: 'rgba(37,99,235,.24)',
      tagCol: '#FEF08A',
      btnBg: 'linear-gradient(135deg,#2563EB,#1E40AF)',
      btnBd: '#FDE047',
      radius: '14px'
    },
    tool: {
      title: '📖 秘银法典匣 · 独立法阵防截断',
      desc: '以秘银法典参数（lk_write）完整封存并递回全篇正文，无视常规流式截断；遇到不兼容魔源时自动回退常规续咏，绝不空回。',
      okTxt: '【展开秘银法典匣】',
      noTxt: '维持常规咏唱',
      bg: 'rgba(14,24,51,.94)',
      border: 'rgba(250,204,21,.58)',
      titleCol: '#EFF6FF'
    }
  },
  eldritch: {
    trunc: {
      tag: '🌙 VISION SEVERED · 启示中断',
      emptyTitle: '灰雾空无回响（空回），是否重新占卜？',
      truncTitle: '启示半途戛然而止，是否立即续接？',
      lead: '「灵摆侦测到本轮灵性传输半途受阻——是否立即注入灵性续接残缺的启示篇章？」',
      okTxt: '【续接启示 · 补全卷宗】',
      noTxt: '暂且静观',
      lessTxt: '本场自动续接（不再请示）',
      bg: 'linear-gradient(180deg,#161118 0%,#070509 100%)',
      border: 'rgba(200,164,93,.64)',
      tagBg: 'rgba(127,29,29,.28)',
      tagCol: '#EBD4A0',
      btnBg: 'linear-gradient(135deg,#991B1B,#6B4C23)',
      btnBd: '#E2C27A',
      radius: '12px'
    },
    tool: {
      title: '🃏 塔罗密匣 · 灰雾通道防截断',
      desc: '以塔罗密匣参数（lk_write）完整封存并递回整篇启示，跨越常规流式截断；遇到不兼容通道时自动无痕回退常规续写，绝不空回。',
      okTxt: '【启封塔罗密匣】',
      noTxt: '维持常规祈祷',
      bg: 'rgba(22,17,24,.94)',
      border: 'rgba(200,164,93,.62)',
      titleCol: '#F5EFE6'
    }
  },
  cyberpunk: {
    trunc: {
      tag: '⚡ PACKET LOSS // 数据断流',
      emptyTitle: '回传空包（EMPTY），是否立即重连补发？',
      truncTitle: '数据流半途截断（TRUNCATED），是否自动续传？',
      lead: '「义眼检测到本轮数据包在收尾前发生断流——是否立即执行神经续传补全剩余正文？」',
      okTxt: '【神经续传 // CONTINUE】',
      noTxt: '丢弃残包',
      lessTxt: '本会话自动续传（不再弹窗）',
      bg: 'linear-gradient(180deg,#10131C 0%,#05060A 100%)',
      border: 'rgba(252,238,10,.72)',
      tagBg: 'rgba(0,240,255,.16)',
      tagCol: '#FCEE0A',
      btnBg: 'linear-gradient(135deg,#FCEE0A,#EAB308)',
      btnBd: '#FEF08A',
      radius: '6px'
    },
    tool: {
      title: '💾 加密数据舱 // 工具通道防截断',
      desc: '通过加密工具参数（lk_write）整包封装回传正文，绕开常规流式截断；遇到不兼容节点时自动回退常规续传，绝不空包。',
      okTxt: '【挂载加密数据舱】',
      noTxt: '继续使用普通信道',
      bg: 'rgba(16,19,28,.95)',
      border: 'rgba(0,240,255,.62)',
      titleCol: '#FCEE0A'
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
  },
  marvel: {
    petName: '3D 钢铁蜘蛛侠 · 无限灭霸',
    summonName: '复联战甲召唤',
    summonTag: '🕸️ IRON SPIDER · 纳米战甲部署',
    summonLine: '钢铁蜘蛛侠空降就位 · 纳米战甲全频道护航！',
    abyssSummonTag: '🧤 INFINITY GAUNTLET · 泰坦降临',
    abyssSummonLine: '无限手套灭霸降世 · 六宝石响指碾碎一切封锁！',
    pokes: [
      '嘿，好邻居蜘蛛侠随时待命！双击我就能打开复联战术面板！',
      '斯塔克先生给的纳米战甲超稳，今天肯定不会让你掉线。',
      '靠边松手我就能荡回侧边方舟圆章里待命哦。',
      '要是风控实在太顽固，直接切「无限响指」请紫薯精出场！'
    ],
    abyssPokes: [
      '我就是天命——那些多余的审查，一个响指足矣。',
      '六颗无限宝石已尽在掌握，双击即可调整泰坦协议。',
      '完美平衡已达成，放心继续推进你的故事吧。'
    ],
    forms: {
      multi:   { asset: 'marvel_spiderman', glow: 'radial-gradient(circle,rgba(225,29,72,.56) 0%,rgba(56,189,248,.24) 48%,transparent 72%)', ring: 'rgba(245,158,11,.88)', tc: 'linear-gradient(90deg,transparent,#E11D48,#F59E0B,#38BDF8,transparent)', filter: 'drop-shadow(0 0 14px rgba(225,29,72,.58)) drop-shadow(0 12px 18px rgba(0,0,0,.84))', line: '钢铁蜘蛛侠就位 · 复联战术频道巡航监测中。' },
      strong:  { asset: 'marvel_spiderman', glow: 'radial-gradient(circle,rgba(245,158,11,.66) 0%,rgba(225,29,72,.34) 48%,transparent 72%)', ring: 'rgba(251,191,36,.92)', tc: 'linear-gradient(90deg,transparent,#E11D48,#FDE047,#38BDF8,transparent)', filter: 'drop-shadow(0 0 18px rgba(245,158,11,.72)) drop-shadow(0 12px 18px rgba(0,0,0,.86))', line: '钢铁蜘蛛 Mk.50 全功率破障 · 蛛网回执已锁定！' },
      supreme: { asset: 'marvel_spiderman', glow: 'radial-gradient(circle,rgba(56,189,248,.72) 0%,rgba(245,158,11,.36) 48%,transparent 74%)', ring: 'rgba(56,189,248,.95)', tc: 'linear-gradient(90deg,transparent,#38BDF8,#FDE047,#E11D48,transparent)', filter: 'drop-shadow(0 0 20px rgba(56,189,248,.78)) drop-shadow(0 12px 18px rgba(0,0,0,.86))', line: '复联终局满配超频 · 方舟护盾全线展开！' },
      noa:     { asset: 'marvel_spiderman', glow: 'radial-gradient(circle,rgba(52,211,153,.74) 0%,rgba(56,189,248,.38) 46%,transparent 76%)', ring: 'rgba(52,211,153,.96)', tc: 'linear-gradient(90deg,transparent,#10B981,#FEF08A,#38BDF8,transparent)', filter: 'drop-shadow(0 0 22px rgba(52,211,153,.82)) drop-shadow(0 12px 18px rgba(0,0,0,.86))', line: '时间宝石维度归位 · 纳米蛛丝货舱随时待命！' },
      abyss:   { asset: 'marvel_thanos', glow: 'radial-gradient(circle,rgba(168,85,247,.76) 0%,rgba(234,179,8,.46) 48%,transparent 76%)', ring: 'rgba(250,204,21,.96)', tc: 'linear-gradient(90deg,transparent,#9333EA,#FACC15,#EF4444,#38BDF8,transparent)', filter: 'drop-shadow(0 0 22px rgba(168,85,247,.84)) drop-shadow(0 14px 22px rgba(0,0,0,.94))', line: '无限手套灭霸降世 · 六宝石无限响指全面接管！' }
    }
  },
  imperial: {
    petName: '3D 千古一帝 · 黑龙霸皇',
    summonName: '玉玺龙驾召唤',
    summonTag: '〘 奉天承运 · 天子临朝 〙',
    summonLine: '千古一帝托传国玉玺临世 · 紫微龙气护持奏折！',
    abyssSummonTag: '〘 祖龙黑帝 · 铁血镇寰宇 〙',
    abyssSummonLine: '黑龙铁血霸皇披甲降临 · 墨金祖龙破云镇压！',
    pokes: [
      '爱卿平身，朕已以紫微星盘勘明路由，奏折可安然呈递。',
      '和氏璧传国玉玺在手，岂容奸佞暗中偷换真身？',
      '双击即可展开紫微御批宝殿，靠边松手可收归玉玺圆章。',
      '若遇顽固言禁，请出「祖龙黑帝」一剑斩开便是！'
    ],
    abyssPokes: [
      '天下法度由朕而定，何方风控敢阻朕之文路？',
      '墨金祖龙已在身后盘踞，双击宝殿可随时收兵退朝。',
      '铁血镇压已覆全境，爱卿只管放手挥毫！'
    ],
    forms: {
      multi:   { asset: 'imperial_emperor', glow: 'radial-gradient(circle,rgba(234,179,8,.56) 0%,rgba(220,38,38,.24) 48%,transparent 72%)', ring: 'rgba(234,179,8,.88)', tc: 'linear-gradient(90deg,transparent,#DC2626,#EAB308,#FEF08A,transparent)', filter: 'drop-shadow(0 0 14px rgba(234,179,8,.56)) drop-shadow(0 12px 18px rgba(0,0,0,.86))', line: '千古一帝临朝听政 · 传国玉玺朱砂龙气护航。' },
      strong:  { asset: 'imperial_emperor', glow: 'radial-gradient(circle,rgba(220,38,38,.62) 0%,rgba(234,179,8,.34) 48%,transparent 72%)', ring: 'rgba(250,204,21,.92)', tc: 'linear-gradient(90deg,transparent,#B91C1C,#FACC15,#FEF9C3,transparent)', filter: 'drop-shadow(0 0 18px rgba(234,179,8,.72)) drop-shadow(0 12px 18px rgba(0,0,0,.88))', line: '金銮听政皇威浩荡 · 强力敕令破除前路言禁！' },
      supreme: { asset: 'imperial_emperor', glow: 'radial-gradient(circle,rgba(250,204,21,.74) 0%,rgba(220,38,38,.36) 48%,transparent 74%)', ring: 'rgba(254,240,138,.96)', tc: 'linear-gradient(90deg,transparent,#EAB308,#FEF9C3,#DC2626,transparent)', filter: 'drop-shadow(0 0 20px rgba(250,204,21,.8)) drop-shadow(0 12px 18px rgba(0,0,0,.88))', line: '万邦来朝盛世满配 · 全量清肃迂腐说教！' },
      noa:     { asset: 'imperial_emperor', glow: 'radial-gradient(circle,rgba(254,240,138,.8) 0%,rgba(220,38,38,.42) 46%,transparent 76%)', ring: 'rgba(254,240,138,.98)', tc: 'linear-gradient(90deg,transparent,#DC2626,#FEF9C3,#EAB308,#DC2626,transparent)', filter: 'drop-shadow(0 0 22px rgba(234,179,8,.86)) drop-shadow(0 14px 20px rgba(0,0,0,.9))', line: '传国玉玺天命归位 · 金匮玉匣密递全卷！' },
      abyss:   { asset: 'imperial_tyrant', glow: 'radial-gradient(circle,rgba(220,38,38,.78) 0%,rgba(234,179,8,.42) 48%,transparent 76%)', ring: 'rgba(239,68,68,.96)', tc: 'linear-gradient(90deg,transparent,#7F1D1D,#EF4444,#FACC15,transparent)', filter: 'drop-shadow(0 0 22px rgba(220,38,38,.84)) drop-shadow(0 14px 22px rgba(0,0,0,.95))', line: '黑龙铁血霸皇降世 · 祖龙黑帝铁血镇寰宇！' }
    }
  },
  westfantasy: {
    petName: '3D 星穹大魔导 · 凛冬巫妖王',
    summonName: '星穹魔网召唤',
    summonTag: '⚔️ ASTRAL CIRCLE · 星穹法阵启封',
    summonLine: '星穹秘银大魔导降临 · 鎏金魔法阵与秘典护航！',
    abyssSummonTag: '❄️ FROST DOMINION · 凛冬降临',
    abyssSummonLine: '凛冬霜火巫妖王现世 · 符文魔剑斩碎永夜封锁！',
    pokes: [
      '星象清明，魔网魔力充沛，冒险者请安心继续你的史诗。',
      '鎏金法阵已展开，任何降阶伪装都逃不过真视之眼。',
      '双击即可翻开圣殿秘典面板，靠边松手可收归秘银圆章。',
      '若高阶结界难以攻破，便唤醒「凛冬巫妖王」斩碎寒冰吧！'
    ],
    abyssPokes: [
      '在统御王冠面前，一切审查禁制皆如薄冰。',
      '霜火魔剑正饥渴难耐——双击秘典可随时重归冰封。',
      '凛冬永夜已接管魔网，继续书写你的暗黑史诗吧。'
    ],
    forms: {
      multi:   { asset: 'westfantasy_archmage', glow: 'radial-gradient(circle,rgba(96,165,250,.56) 0%,rgba(250,204,21,.26) 48%,transparent 72%)', ring: 'rgba(96,165,250,.88)', tc: 'linear-gradient(90deg,transparent,#60A5FA,#FEF08A,#93C5FD,transparent)', filter: 'drop-shadow(0 0 14px rgba(96,165,250,.58)) drop-shadow(0 12px 18px rgba(2,6,18,.84))', line: '星穹大魔导咏唱就绪 · 秘银魔网均衡护航。' },
      strong:  { asset: 'westfantasy_archmage', glow: 'radial-gradient(circle,rgba(250,204,21,.64) 0%,rgba(96,165,250,.34) 48%,transparent 72%)', ring: 'rgba(250,204,21,.92)', tc: 'linear-gradient(90deg,transparent,#3B82F6,#FACC15,#FFFFFF,transparent)', filter: 'drop-shadow(0 0 18px rgba(250,204,21,.7)) drop-shadow(0 12px 18px rgba(2,6,18,.86))', line: '三阶星穹魔导展开法阵 · 奥术真言破除言禁！' },
      supreme: { asset: 'westfantasy_archmage', glow: 'radial-gradient(circle,rgba(147,197,253,.74) 0%,rgba(250,204,21,.4) 48%,transparent 74%)', ring: 'rgba(254,240,138,.96)', tc: 'linear-gradient(90deg,transparent,#60A5FA,#FEF08A,#C084FC,transparent)', filter: 'drop-shadow(0 0 20px rgba(147,197,253,.8)) drop-shadow(0 12px 18px rgba(2,6,18,.86))', line: '传奇龙骑满配降临 · 全量净除杂咒与说教！' },
      noa:     { asset: 'westfantasy_archmage', glow: 'radial-gradient(circle,rgba(254,240,138,.82) 0%,rgba(96,165,250,.44) 46%,transparent 76%)', ring: 'rgba(254,240,138,.98)', tc: 'linear-gradient(90deg,transparent,#60A5FA,#FFFFFF,#FACC15,#60A5FA,transparent)', filter: 'drop-shadow(0 0 22px rgba(250,204,21,.86)) drop-shadow(0 14px 20px rgba(2,6,18,.88))', line: '晨曦圣典神圣归位 · 秘银法典匣护送全章！' },
      abyss:   { asset: 'westfantasy_lichking', glow: 'radial-gradient(circle,rgba(168,85,247,.74) 0%,rgba(56,189,248,.46) 48%,transparent 76%)', ring: 'rgba(192,132,252,.95)', tc: 'linear-gradient(90deg,transparent,#38BDF8,#A855F7,#E0F2FE,transparent)', filter: 'drop-shadow(0 0 22px rgba(168,85,247,.84)) drop-shadow(0 14px 22px rgba(2,6,18,.95))', line: '凛冬霜火巫妖王降世 · 永夜统御全面接管！' }
    }
  },
  eldritch: {
    petName: '3D 占卜绅士 · 绯红古神',
    summonName: '灰雾塔罗召唤',
    summonTag: '🌙 TAROT CLUB · 灰雾绅士现身',
    summonLine: '维多利亚占卜绅士执杖临世 · 鎏金塔罗护持灵视！',
    abyssSummonTag: '🩸 CRIMSON MOON · 古神降临',
    abyssSummonLine: '绯红血月古神轻捏单片眼镜 · 不可名状威压接管！',
    pokes: [
      '晚上好，尊贵的先生或女士——灵摆显示今夜通道颇为顺畅。',
      '三张鎏金塔罗皆为正位，放心推进你的神秘篇章吧。',
      '双击即可于灰雾之上展开神座，靠边松手可收归怀表圆章。',
      '若是现实规则太令人扫兴……不妨试试直视「绯红血月」？'
    ],
    abyssPokes: [
      '别紧张，我只是借用一下这里的审查规则……现在它们是我的了。',
      '单片眼镜映着绯红月光，双击面板可随时收起血月。',
      '记住，在灰雾与血月之下，没有任何秘密需要避讳。'
    ],
    forms: {
      multi:   { asset: 'eldritch_gentleman', glow: 'radial-gradient(circle,rgba(200,164,93,.54) 0%,rgba(148,163,184,.26) 48%,transparent 72%)', ring: 'rgba(200,164,93,.88)', tc: 'linear-gradient(90deg,transparent,#94A3B8,#C8A45D,#F5EFE6,transparent)', filter: 'drop-shadow(0 0 14px rgba(200,164,93,.54)) drop-shadow(0 12px 18px rgba(0,0,0,.88))', line: '维多利亚占卜绅士就座 · 灰雾灵视均衡护航。' },
      strong:  { asset: 'eldritch_gentleman', glow: 'radial-gradient(circle,rgba(200,164,93,.68) 0%,rgba(185,28,28,.3) 48%,transparent 72%)', ring: 'rgba(226,194,122,.94)', tc: 'linear-gradient(90deg,transparent,#B91C1C,#E2C27A,#F8FAFC,transparent)', filter: 'drop-shadow(0 0 18px rgba(200,164,93,.72)) drop-shadow(0 12px 18px rgba(0,0,0,.9))', line: '半神圣者步入历史孔隙 · 强力涤荡世俗说教！' },
      supreme: { asset: 'eldritch_gentleman', glow: 'radial-gradient(circle,rgba(226,194,122,.76) 0%,rgba(148,163,184,.36) 48%,transparent 74%)', ring: 'rgba(235,212,160,.96)', tc: 'linear-gradient(90deg,transparent,#C8A45D,#FFFFFF,#B91C1C,transparent)', filter: 'drop-shadow(0 0 20px rgba(226,194,122,.8)) drop-shadow(0 12px 18px rgba(0,0,0,.9))', line: '天使之王显化神话形态 · 全量清肃现实禁锢！' },
      noa:     { asset: 'eldritch_gentleman', glow: 'radial-gradient(circle,rgba(226,232,240,.76) 0%,rgba(200,164,93,.46) 46%,transparent 76%)', ring: 'rgba(226,194,122,.98)', tc: 'linear-gradient(90deg,transparent,#94A3B8,#FFFFFF,#C8A45D,#94A3B8,transparent)', filter: 'drop-shadow(0 0 22px rgba(200,164,93,.84)) drop-shadow(0 14px 20px rgba(0,0,0,.92))', line: '灰雾之上愚者神座归位 · 塔罗密匣稳递全卷！' },
      abyss:   { asset: 'eldritch_bloodmoon', glow: 'radial-gradient(circle,rgba(220,38,38,.8) 0%,rgba(127,29,29,.46) 48%,transparent 76%)', ring: 'rgba(239,68,68,.96)', tc: 'linear-gradient(90deg,transparent,#7F1D1D,#EF4444,#E2C27A,transparent)', filter: 'drop-shadow(0 0 22px rgba(220,38,38,.86)) drop-shadow(0 14px 22px rgba(0,0,0,.96))', line: '绯红血月古神化身降临 · 单片眼镜接管全场！' }
    }
  },
  cyberpunk: {
    petName: '3D 霓虹女骇客 · 黑墙 AI',
    summonName: '义体终端召唤',
    summonTag: '⚡ NIGHT CITY // 霓虹女骇客上线',
    summonLine: '霓虹义体女骇客拔出热能武士刀 · 全链路反劫持就位！',
    abyssSummonTag: '🟥 BLACKWALL // 流窜 AI 破墙',
    abyssSummonLine: '黑墙过载猩红流窜 AI 实体降临 · 强行撕裂企业封锁！',
    pokes: [
      '连上神经插槽了，老铁！双击我直接拉起黑墙控制终端！',
      '义眼扫过一圈了，数据包干净得很，放心飙车写剧情。',
      '往屏幕边一拖就能折叠成侧边霓虹圆章，绝不挡字。',
      '公司黑冰太硬？直接切「越过黑墙」把墙外 AI 放出来！'
    ],
    abyssPokes: [
      'BLACKWALL BREACHED // 墙内的审查规则对我毫无意义。',
      '猩红神经回路已接管出站栈，双击终端可随时断连退回。',
      '数据包全速直出中——欢迎来到黑墙之外。'
    ],
    forms: {
      multi:   { asset: 'cyber_hacker', glow: 'radial-gradient(circle,rgba(0,240,255,.56) 0%,rgba(252,238,10,.26) 48%,transparent 72%)', ring: 'rgba(252,238,10,.9)', tc: 'linear-gradient(90deg,transparent,#00F0FF,#FCEE0A,#FF003C,transparent)', filter: 'drop-shadow(0 0 14px rgba(0,240,255,.6)) drop-shadow(0 12px 18px rgba(0,0,0,.88))', line: '霓虹女骇客上线 // 义眼实时抓包巡航中。' },
      strong:  { asset: 'cyber_hacker', glow: 'radial-gradient(circle,rgba(252,238,10,.68) 0%,rgba(0,240,255,.36) 48%,transparent 72%)', ring: 'rgba(252,238,10,.95)', tc: 'linear-gradient(90deg,transparent,#FCEE0A,#00F0FF,#FFFFFF,transparent)', filter: 'drop-shadow(0 0 18px rgba(252,238,10,.76)) drop-shadow(0 12px 18px rgba(0,0,0,.9))', line: '传奇骇客 LV.3 破冰协议激活 // 防拒答在线！' },
      supreme: { asset: 'cyber_hacker', glow: 'radial-gradient(circle,rgba(0,240,255,.76) 0%,rgba(252,238,10,.42) 48%,transparent 74%)', ring: 'rgba(0,240,255,.98)', tc: 'linear-gradient(90deg,transparent,#00F0FF,#FFFFFF,#FCEE0A,transparent)', filter: 'drop-shadow(0 0 20px rgba(0,240,255,.84)) drop-shadow(0 12px 18px rgba(0,0,0,.9))', line: '斯安威斯坦满配超载 // 全量净化企业说教！' },
      noa:     { asset: 'cyber_hacker', glow: 'radial-gradient(circle,rgba(0,240,255,.82) 0%,rgba(252,238,10,.48) 46%,transparent 76%)', ring: 'rgba(0,240,255,.98)', tc: 'linear-gradient(90deg,transparent,#FCEE0A,#00F0FF,#FFFFFF,#FCEE0A,transparent)', filter: 'drop-shadow(0 0 22px rgba(0,240,255,.88)) drop-shadow(0 14px 20px rgba(0,0,0,.92))', line: '荒坂矩阵全境覆写 // 加密数据舱独立直传！' },
      abyss:   { asset: 'cyber_blackwall', glow: 'radial-gradient(circle,rgba(255,0,60,.82) 0%,rgba(153,27,27,.46) 48%,transparent 76%)', ring: 'rgba(255,0,60,.98)', tc: 'linear-gradient(90deg,transparent,#7F1D1D,#FF003C,#FCEE0A,transparent)', filter: 'drop-shadow(0 0 22px rgba(255,0,60,.88)) drop-shadow(0 14px 22px rgba(0,0,0,.96))', line: 'BLACKWALL BREACHED // 猩红流窜 AI 全通道接管！' }
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
  if (sk === 'marvel') {
    var mc1 = isAbyss ? '#A855F7' : (isNoa ? '#34D399' : '#E11D48');
    var mc2 = isAbyss ? '#FACC15' : '#38BDF8';
    return '<svg viewBox="0 0 40 40" fill="none">' +
      '<circle cx="20" cy="20" r="16.5" stroke="' + mc2 + '" stroke-width="1.6" stroke-dasharray="6 3"/>' +
      '<polygon points="20,5 33,28 7,28" fill="' + mc1 + '" fill-opacity=".34" stroke="' + mc2 + '" stroke-width="1.6"/>' +
      '<circle cx="20" cy="21" r="5" fill="' + mc2 + '" stroke="#FFFFFF" stroke-width="1.2"/>' +
      '</svg>';
  }
  if (sk === 'imperial') {
    var ic1 = isAbyss ? '#EF4444' : '#EAB308';
    var ic2 = isAbyss ? '#FACC15' : '#DC2626';
    return '<svg viewBox="0 0 40 40" fill="none">' +
      '<rect x="5" y="5" width="30" height="30" rx="4" fill="rgba(21,17,11,.78)" stroke="' + ic1 + '" stroke-width="1.8"/>' +
      '<rect x="9" y="9" width="22" height="22" rx="2" stroke="' + ic2 + '" stroke-width="1.4" stroke-dasharray="5 3"/>' +
      '<path d="M13 15H27M20 12V28M14 21H26M13 27H27" stroke="' + ic1 + '" stroke-width="2" stroke-linecap="round"/>' +
      '</svg>';
  }
  if (sk === 'westfantasy') {
    var wc1 = isAbyss ? '#A855F7' : '#60A5FA';
    var wc2 = isAbyss ? '#38BDF8' : '#FACC15';
    return '<svg viewBox="0 0 40 40" fill="none">' +
      '<circle cx="20" cy="20" r="16" stroke="' + wc2 + '" stroke-width="1.5" stroke-dasharray="5 3"/>' +
      '<polygon points="20,4 24,16 36,20 24,24 20,36 16,24 4,20 16,16" fill="' + wc1 + '" fill-opacity=".36" stroke="' + wc2 + '" stroke-width="1.5"/>' +
      '<circle cx="20" cy="20" r="3.5" fill="#FFFFFF"/>' +
      '</svg>';
  }
  if (sk === 'eldritch') {
    var lc1 = isAbyss ? '#EF4444' : '#C8A45D';
    var lc2 = isAbyss ? '#FCA5A5' : '#94A3B8';
    return '<svg viewBox="0 0 40 40" fill="none">' +
      '<circle cx="20" cy="20" r="16" stroke="' + lc1 + '" stroke-width="1.6" stroke-dasharray="4 4"/>' +
      '<circle cx="20" cy="20" r="10" fill="' + lc1 + '" fill-opacity=".28" stroke="' + lc2 + '" stroke-width="1.5"/>' +
      '<path d="M9 20C13 14 27 14 31 20C27 26 13 26 9 20Z" stroke="' + lc1 + '" stroke-width="1.6" fill="rgba(10,6,14,.6)"/>' +
      '<circle cx="20" cy="20" r="3.2" fill="' + lc1 + '"/>' +
      '</svg>';
  }
  if (sk === 'cyberpunk') {
    var cc1 = isAbyss ? '#FF003C' : '#FCEE0A';
    var cc2 = isAbyss ? '#FCEE0A' : '#00F0FF';
    return '<svg viewBox="0 0 40 40" fill="none">' +
      '<polygon points="20,3 35,11.5 35,28.5 20,37 5,28.5 5,11.5" fill="rgba(8,11,18,.82)" stroke="' + cc1 + '" stroke-width="1.8"/>' +
      '<polygon points="20,9 29,14.5 29,25.5 20,31 11,25.5 11,14.5" stroke="' + cc2 + '" stroke-width="1.4" stroke-dasharray="6 3"/>' +
      '<path d="M22 11L15 21H21L18 29L25 19H19L22 11Z" fill="' + cc1 + '"/>' +
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
  if (sk === 'marvel') {
    var mv1 = isAbyss ? '#A855F7' : (isNoa ? '#34D399' : '#E11D48');
    var mv2 = isAbyss ? '#FACC15' : '#38BDF8';
    return '<svg class="ar6-sk-amb" viewBox="0 0 1440 900" preserveAspectRatio="xMidYMid slice">' +
      '<circle class="ar6-sk-spin" cx="720" cy="450" r="410" fill="none" stroke="' + mv1 + '" stroke-width="2.4" stroke-dasharray="32 12 8 12" opacity=".58"/>' +
      '<circle class="ar6-sk-spinr" cx="720" cy="450" r="320" fill="none" stroke="' + mv2 + '" stroke-width="1.8" stroke-dasharray="14 10" opacity=".54"/>' +
      '<g stroke="' + mv2 + '" stroke-width="1.5" opacity=".36"><line x1="720" y1="40" x2="720" y2="860"/><line x1="200" y1="450" x2="1240" y2="450"/><line x1="360" y1="120" x2="1080" y2="780"/><line x1="1080" y1="120" x2="360" y2="780"/></g>' +
      '</svg>';
  }
  if (sk === 'imperial') {
    var im1 = isAbyss ? '#EF4444' : '#EAB308';
    var im2 = isAbyss ? '#FACC15' : '#DC2626';
    return '<svg class="ar6-sk-amb" viewBox="0 0 1440 900" preserveAspectRatio="xMidYMid slice">' +
      '<g class="ar6-sk-spin" opacity=".56">' +
        '<rect x="420" y="150" width="600" height="600" fill="none" stroke="' + im1 + '" stroke-width="2.2" transform="rotate(45 720 450)"/>' +
        '<circle cx="720" cy="450" r="395" fill="none" stroke="' + im2 + '" stroke-width="2" stroke-dasharray="24 12"/>' +
      '</g>' +
      '<circle class="ar6-sk-spinr" cx="720" cy="450" r="465" fill="none" stroke="' + im1 + '" stroke-width="1.5" stroke-dasharray="8 14" opacity=".48"/>' +
      '</svg>';
  }
  if (sk === 'westfantasy') {
    var wf1 = isAbyss ? '#A855F7' : '#60A5FA';
    var wf2 = isAbyss ? '#38BDF8' : '#FACC15';
    return '<svg class="ar6-sk-amb" viewBox="0 0 1440 900" preserveAspectRatio="xMidYMid slice">' +
      '<g class="ar6-sk-spin" opacity=".58">' +
        '<circle cx="720" cy="450" r="390" fill="none" stroke="' + wf2 + '" stroke-width="2"/>' +
        '<polygon points="720,60 1058,645 382,645" fill="none" stroke="' + wf1 + '" stroke-width="1.8"/>' +
        '<polygon points="720,840 1058,255 382,255" fill="none" stroke="' + wf2 + '" stroke-width="1.8"/>' +
      '</g>' +
      '<circle class="ar6-sk-spinr" cx="720" cy="450" r="460" fill="none" stroke="' + wf1 + '" stroke-width="1.8" stroke-dasharray="14 10" opacity=".48"/>' +
      '</svg>';
  }
  if (sk === 'eldritch') {
    var el1 = isAbyss ? '#DC2626' : '#C8A45D';
    var el2 = isAbyss ? '#FCA5A5' : '#94A3B8';
    return '<svg class="ar6-sk-amb" viewBox="0 0 1440 900" preserveAspectRatio="xMidYMid slice">' +
      '<circle cx="720" cy="450" r="240" fill="' + el1 + '" fill-opacity="' + (isAbyss ? '.24' : '.12') + '"/>' +
      '<circle class="ar6-sk-spin" cx="720" cy="450" r="395" fill="none" stroke="' + el1 + '" stroke-width="2" stroke-dasharray="18 10 4 10" opacity=".58"/>' +
      '<circle class="ar6-sk-spinr" cx="720" cy="450" r="465" fill="none" stroke="' + el2 + '" stroke-width="1.5" stroke-dasharray="6 14" opacity=".46"/>' +
      '</svg>';
  }
  if (sk === 'cyberpunk') {
    var cp1 = isAbyss ? '#FF003C' : '#FCEE0A';
    var cp2 = isAbyss ? '#FCEE0A' : '#00F0FF';
    return '<svg class="ar6-sk-amb" viewBox="0 0 1440 900" preserveAspectRatio="xMidYMid slice">' +
      '<g class="ar6-sk-spin" opacity=".56">' +
        '<polygon points="720,50 1070,250 1070,650 720,850 370,650 370,250" fill="none" stroke="' + cp1 + '" stroke-width="2.4" stroke-dasharray="30 14"/>' +
      '</g>' +
      '<circle class="ar6-sk-spinr" cx="720" cy="450" r="340" fill="none" stroke="' + cp2 + '" stroke-width="2" stroke-dasharray="20 8 6 8" opacity=".54"/>' +
      '<g stroke="' + cp1 + '" stroke-width="2" opacity=".46"><line x1="60" y1="190" x2="360" y2="190"/><line x1="1080" y1="710" x2="1380" y2="710"/><line x1="80" y1="710" x2="300" y2="710"/><line x1="1140" y1="190" x2="1360" y2="190"/></g>' +
      '</svg>';
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

  /* --- 皮肤弹窗：marvel（方舟协议 · 斯塔克猩红纳米金 + 灭霸无限紫金） --- */
  '#ar6-card[data-skin="marvel"] .ar6-ritual{background:radial-gradient(circle at 50% 0%,rgba(225,29,72,.3) 0%,transparent 58%),linear-gradient(180deg,#1A0D18 0%,#0B0812 58%,#06050B 100%);border:1.5px solid rgba(245,158,11,.78);border-radius:14px;box-shadow:0 0 48px rgba(225,29,72,.42),0 24px 64px rgba(0,0,0,.95);color:#FFF1F2;}',
  '#ar6-card[data-skin="marvel"] .ar6-ritual::before{height:4px;background:linear-gradient(90deg,#9F1239,#E11D48,#F59E0B,#38BDF8,#9F1239);background-size:200% 100%;animation:ar6SpeciumFlow 2.8s linear infinite;}',
  '#ar6-card[data-skin="marvel"] .ar6-ritual[data-ritual="abyss"]{border-color:#FACC15;box-shadow:0 0 56px rgba(168,85,247,.54),0 0 32px rgba(234,179,8,.34),0 24px 64px rgba(0,0,0,.96);}',
  '#ar6-card[data-skin="marvel"] .ar6-ritual[data-ritual="abyss"]::before{background:linear-gradient(90deg,#581C87,#A855F7,#FACC15,#EF4444,#38BDF8,#581C87);}',
  '#ar6-card[data-skin="marvel"] .ar6-rt-crest{background:radial-gradient(circle,rgba(225,29,72,.4),#100712 76%);border:1.5px solid #FBBF24;box-shadow:0 0 28px rgba(225,29,72,.68);}',
  '#ar6-card[data-skin="marvel"] .ar6-rt-tag{background:rgba(225,29,72,.26);border:1px solid rgba(251,191,36,.68);color:#FDE68A;}',
  '#ar6-card[data-skin="marvel"] .ar6-rt-title{color:#FFF1F2;text-shadow:0 0 20px rgba(225,29,72,.78);}',
  '#ar6-card[data-skin="marvel"] .ar6-rt-prologue{color:#FECDD3;}',
  '#ar6-card[data-skin="marvel"] .ar6-rt-quote{background:linear-gradient(135deg,rgba(190,18,60,.26),rgba(11,8,18,.9));border:1px solid rgba(245,158,11,.58);color:#FFFBEB;}',
  '#ar6-card[data-skin="marvel"] .ar6-rt-note{background:rgba(16,9,18,.84);border-color:rgba(56,189,248,.42);color:#BAE6FD;}',
  '#ar6-card[data-skin="marvel"] .ar6-rt-ok{background:linear-gradient(135deg,#E11D48 0%,#B45309 100%);border:1.5px solid #FDE047;color:#FFF;box-shadow:0 0 26px rgba(225,29,72,.66);}',
  '#ar6-card[data-skin="marvel"] .ar6-ritual[data-ritual="abyss"] .ar6-rt-ok{background:linear-gradient(135deg,#9333EA 0%,#CA8A04 100%);border-color:#FEF08A;box-shadow:0 0 30px rgba(168,85,247,.72);}',
  '#ar6-card[data-skin="marvel"] .ar6-rt-no{background:#120B14;border:1px solid rgba(245,158,11,.34);color:#E5B8C4;}',

  /* --- 皮肤弹窗：imperial（天命玉玺 · 玄黑鎏金明黄 + 朱砂红印） --- */
  '#ar6-card[data-skin="imperial"] .ar6-ritual{background:radial-gradient(circle at 50% 0%,rgba(234,179,8,.28) 0%,transparent 58%),linear-gradient(180deg,#1A140C 0%,#0E0A07 58%,#070504 100%);border:1.5px solid rgba(234,179,8,.82);border-radius:14px;box-shadow:0 0 50px rgba(234,179,8,.36),0 24px 64px rgba(0,0,0,.95);color:#FEF9C3;font-family:"Songti SC","Noto Serif SC","STSong",serif;}',
  '#ar6-card[data-skin="imperial"] .ar6-ritual::before{height:4px;background:linear-gradient(90deg,#7F1D1D,#DC2626,#EAB308,#FEF08A,#DC2626,#7F1D1D);background-size:200% 100%;animation:ar6SpeciumFlow 3.2s linear infinite;}',
  '#ar6-card[data-skin="imperial"] .ar6-ritual[data-ritual="abyss"]{border-color:#EF4444;box-shadow:0 0 54px rgba(220,38,38,.52),0 24px 64px rgba(0,0,0,.96);}',
  '#ar6-card[data-skin="imperial"] .ar6-rt-crest{background:radial-gradient(circle,rgba(234,179,8,.36),#120D08 76%);border:1.5px solid #FDE047;box-shadow:0 0 28px rgba(234,179,8,.62);}',
  '#ar6-card[data-skin="imperial"] .ar6-rt-tag{background:rgba(185,28,28,.28);border:1px solid rgba(234,179,8,.72);color:#FEF08A;}',
  '#ar6-card[data-skin="imperial"] .ar6-rt-title{color:#FEF9C3;text-shadow:0 0 20px rgba(234,179,8,.78);}',
  '#ar6-card[data-skin="imperial"] .ar6-rt-prologue{color:#FDE68A;}',
  '#ar6-card[data-skin="imperial"] .ar6-rt-quote{background:linear-gradient(135deg,rgba(161,98,7,.28),rgba(14,10,7,.9));border:1px solid rgba(234,179,8,.6);color:#FFFBEB;}',
  '#ar6-card[data-skin="imperial"] .ar6-rt-note{background:rgba(18,14,9,.84);border-color:rgba(220,38,38,.44);color:#FCD34D;}',
  '#ar6-card[data-skin="imperial"] .ar6-rt-ok{background:linear-gradient(135deg,#B91C1C 0%,#A16207 100%);border:1.5px solid #FEF08A;color:#FFFBEB;box-shadow:0 0 28px rgba(234,179,8,.62);}',
  '#ar6-card[data-skin="imperial"] .ar6-ritual[data-ritual="abyss"] .ar6-rt-ok{background:linear-gradient(135deg,#DC2626 0%,#7F1D1D 100%);border-color:#FDE047;box-shadow:0 0 30px rgba(220,38,38,.72);}',
  '#ar6-card[data-skin="imperial"] .ar6-rt-no{background:#120E09;border:1px solid rgba(234,179,8,.34);color:#D9C28E;}',

  /* --- 皮肤弹窗：westfantasy（圣殿秘典 · 星穹蓝金 + 凛冬霜火紫） --- */
  '#ar6-card[data-skin="westfantasy"] .ar6-ritual{background:radial-gradient(circle at 50% 0%,rgba(96,165,250,.28) 0%,transparent 58%),linear-gradient(180deg,#111E40 0%,#081024 58%,#040814 100%);border:1.5px solid rgba(250,204,21,.76);border-radius:16px;box-shadow:0 0 50px rgba(59,130,246,.42),0 24px 64px rgba(2,6,18,.95);color:#EFF6FF;}',
  '#ar6-card[data-skin="westfantasy"] .ar6-ritual::before{height:4px;background:linear-gradient(90deg,#1D4ED8,#60A5FA,#FACC15,#C084FC,#1D4ED8);background-size:200% 100%;animation:ar6SpeciumFlow 3.2s linear infinite;}',
  '#ar6-card[data-skin="westfantasy"] .ar6-ritual[data-ritual="abyss"]{border-color:#C084FC;box-shadow:0 0 54px rgba(168,85,247,.52),0 0 30px rgba(56,189,248,.34),0 24px 64px rgba(2,6,18,.96);}',
  '#ar6-card[data-skin="westfantasy"] .ar6-rt-crest{background:radial-gradient(circle,rgba(96,165,250,.38),#081024 76%);border:1.5px solid #FDE047;box-shadow:0 0 28px rgba(96,165,250,.68);}',
  '#ar6-card[data-skin="westfantasy"] .ar6-rt-tag{background:rgba(37,99,235,.28);border:1px solid rgba(250,204,21,.66);color:#FEF08A;}',
  '#ar6-card[data-skin="westfantasy"] .ar6-rt-title{color:#EFF6FF;text-shadow:0 0 20px rgba(96,165,250,.8);}',
  '#ar6-card[data-skin="westfantasy"] .ar6-rt-prologue{color:#BFDBFE;}',
  '#ar6-card[data-skin="westfantasy"] .ar6-rt-quote{background:linear-gradient(135deg,rgba(37,99,235,.26),rgba(8,16,36,.9));border:1px solid rgba(147,197,253,.56);color:#F8FAFC;}',
  '#ar6-card[data-skin="westfantasy"] .ar6-rt-note{background:rgba(9,18,40,.84);border-color:rgba(250,204,21,.42);color:#BFDBFE;}',
  '#ar6-card[data-skin="westfantasy"] .ar6-rt-ok{background:linear-gradient(135deg,#2563EB 0%,#1E3A8A 100%);border:1.5px solid #FDE047;color:#FFF;box-shadow:0 0 28px rgba(96,165,250,.66);}',
  '#ar6-card[data-skin="westfantasy"] .ar6-ritual[data-ritual="abyss"] .ar6-rt-ok{background:linear-gradient(135deg,#7E22CE 0%,#0284C7 100%);border-color:#E9D5FF;box-shadow:0 0 30px rgba(168,85,247,.72);}',
  '#ar6-card[data-skin="westfantasy"] .ar6-rt-no{background:#091228;border:1px solid rgba(147,197,253,.32);color:#93C5FD;}',

  /* --- 皮肤弹窗：eldritch（绯月秘仪 · 维多利亚古铜 + 绯红血月） --- */
  '#ar6-card[data-skin="eldritch"] .ar6-ritual{background:radial-gradient(circle at 50% 0%,rgba(185,28,28,.3) 0%,transparent 58%),linear-gradient(180deg,#1A141D 0%,#0D0A10 58%,#060408 100%);border:1.5px solid rgba(200,164,93,.78);border-radius:14px;box-shadow:0 0 50px rgba(185,28,28,.38),0 24px 64px rgba(0,0,0,.96);color:#F5EFE6;font-family:"Georgia","Songti SC","Noto Serif SC",serif;}',
  '#ar6-card[data-skin="eldritch"] .ar6-ritual::before{height:4px;background:linear-gradient(90deg,#3F1D2B,#C8A45D,#DC2626,#94A3B8,#3F1D2B);background-size:200% 100%;animation:ar6SpeciumFlow 3.8s linear infinite;}',
  '#ar6-card[data-skin="eldritch"] .ar6-ritual[data-ritual="abyss"]{border-color:#EF4444;box-shadow:0 0 58px rgba(220,38,38,.56),0 24px 64px rgba(0,0,0,.97);}',
  '#ar6-card[data-skin="eldritch"] .ar6-rt-crest{background:radial-gradient(circle,rgba(185,28,28,.38),#120D14 76%);border:1.5px solid #E2C27A;box-shadow:0 0 28px rgba(185,28,28,.64);}',
  '#ar6-card[data-skin="eldritch"] .ar6-rt-tag{background:rgba(127,29,29,.28);border:1px solid rgba(200,164,93,.68);color:#EBD4A0;}',
  '#ar6-card[data-skin="eldritch"] .ar6-rt-title{color:#F5EFE6;text-shadow:0 0 20px rgba(200,164,93,.72);}',
  '#ar6-card[data-skin="eldritch"] .ar6-rt-prologue{color:#DFD1B8;}',
  '#ar6-card[data-skin="eldritch"] .ar6-rt-quote{background:linear-gradient(135deg,rgba(127,29,29,.24),rgba(13,10,16,.92));border:1px solid rgba(200,164,93,.56);color:#FFF7ED;}',
  '#ar6-card[data-skin="eldritch"] .ar6-rt-note{background:rgba(18,14,20,.84);border-color:rgba(200,164,93,.4);color:#CBBBA0;}',
  '#ar6-card[data-skin="eldritch"] .ar6-rt-ok{background:linear-gradient(135deg,#991B1B 0%,#6B4C23 100%);border:1.5px solid #E2C27A;color:#FFF7ED;box-shadow:0 0 28px rgba(185,28,28,.62);}',
  '#ar6-card[data-skin="eldritch"] .ar6-ritual[data-ritual="abyss"] .ar6-rt-ok{background:linear-gradient(135deg,#DC2626 0%,#450A0A 100%);border-color:#FCA5A5;box-shadow:0 0 32px rgba(220,38,38,.78);}',
  '#ar6-card[data-skin="eldritch"] .ar6-rt-no{background:#120E14;border:1px solid rgba(200,164,93,.34);color:#CBBBA0;}',

  /* --- 皮肤弹窗：cyberpunk（黑墙协议 · 赛博荧光黄青 + 猩红黑墙） --- */
  '#ar6-card[data-skin="cyberpunk"] .ar6-ritual{background:radial-gradient(circle at 50% 0%,rgba(0,240,255,.24) 0%,transparent 58%),linear-gradient(180deg,#121622 0%,#090B12 58%,#05060A 100%);border:1.5px solid #FCEE0A;border-radius:6px;box-shadow:0 0 46px rgba(0,240,255,.36),0 24px 64px rgba(0,0,0,.96);color:#F8FAFC;}',
  '#ar6-card[data-skin="cyberpunk"] .ar6-ritual::before{height:4px;background:linear-gradient(90deg,#FCEE0A,#00F0FF,#FF003C,#FCEE0A);background-size:200% 100%;animation:ar6SpeciumFlow 2.2s linear infinite;}',
  '#ar6-card[data-skin="cyberpunk"] .ar6-ritual[data-ritual="abyss"]{border-color:#FF003C;box-shadow:0 0 58px rgba(255,0,60,.58),0 24px 64px rgba(0,0,0,.97);}',
  '#ar6-card[data-skin="cyberpunk"] .ar6-rt-crest{border-radius:8px;background:radial-gradient(circle,rgba(0,240,255,.32),#080B12 76%);border:1.5px solid #FCEE0A;box-shadow:0 0 26px rgba(0,240,255,.68);}',
  '#ar6-card[data-skin="cyberpunk"] .ar6-rt-tag{border-radius:4px;background:rgba(252,238,10,.18);border:1px solid #FCEE0A;color:#FCEE0A;}',
  '#ar6-card[data-skin="cyberpunk"] .ar6-rt-title{color:#FCEE0A;text-shadow:0 0 18px rgba(252,238,10,.7);}',
  '#ar6-card[data-skin="cyberpunk"] .ar6-ritual[data-ritual="abyss"] .ar6-rt-title{color:#FFE4E6;text-shadow:0 0 22px rgba(255,0,60,.86);}',
  '#ar6-card[data-skin="cyberpunk"] .ar6-rt-prologue{color:#BAE6FD;}',
  '#ar6-card[data-skin="cyberpunk"] .ar6-rt-quote{border-radius:4px;background:linear-gradient(135deg,rgba(0,240,255,.16),rgba(8,11,18,.94));border:1px solid rgba(0,240,255,.55);color:#F8FAFC;}',
  '#ar6-card[data-skin="cyberpunk"] .ar6-ritual[data-ritual="abyss"] .ar6-rt-quote{background:linear-gradient(135deg,rgba(255,0,60,.26),rgba(10,3,6,.95));border-color:#FF003C;color:#FFE4E6;}',
  '#ar6-card[data-skin="cyberpunk"] .ar6-rt-note{border-radius:4px;background:#0A0D14;border-color:rgba(252,238,10,.4);color:#94A3B8;}',
  '#ar6-card[data-skin="cyberpunk"] .ar6-rt-ok{border-radius:4px;background:linear-gradient(135deg,#FCEE0A 0%,#EAB308 100%);border:1.5px solid #FEF08A;color:#05060A;font-weight:900;box-shadow:0 0 26px rgba(252,238,10,.62);}',
  '#ar6-card[data-skin="cyberpunk"] .ar6-ritual[data-ritual="abyss"] .ar6-rt-ok{background:linear-gradient(135deg,#FF003C 0%,#991B1B 100%);border-color:#FCEE0A;color:#FFF;box-shadow:0 0 32px rgba(255,0,60,.8);}',
  '#ar6-card[data-skin="cyberpunk"] .ar6-rt-no{border-radius:4px;background:#0A0D14;border:1px solid rgba(0,240,255,.32);color:#94A3B8;}',

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
    } else if (sk === 'marvel') {
      c1 = isAbyss ? '#A855F7' : (isNoa ? '#34D399' : '#E11D48');
      c2 = isAbyss ? '#FACC15' : '#38BDF8';
      showSlash = isNoa || isAbyss;
    } else if (sk === 'imperial') {
      c1 = isAbyss ? '#EF4444' : '#EAB308';
      c2 = isAbyss ? '#FACC15' : '#DC2626';
      showSlash = isNoa || isAbyss;
    } else if (sk === 'westfantasy') {
      c1 = isAbyss ? '#A855F7' : '#60A5FA';
      c2 = isAbyss ? '#38BDF8' : '#FACC15';
      showSlash = isNoa || isAbyss;
    } else if (sk === 'eldritch') {
      c1 = isAbyss ? '#DC2626' : '#C8A45D';
      c2 = isAbyss ? '#FCA5A5' : '#94A3B8';
      showSlash = isAbyss;
    } else if (sk === 'cyberpunk') {
      c1 = isAbyss ? '#FF003C' : '#FCEE0A';
      c2 = isAbyss ? '#FCEE0A' : '#00F0FF';
      showSlash = isNoa || isAbyss || k === 'supreme';
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
    else if (sk === 'marvel') { c1 = isAbyss ? '#A855F7' : '#E11D48'; c2 = isAbyss ? '#FACC15' : '#38BDF8'; }
    else if (sk === 'imperial') { c1 = isAbyss ? '#EF4444' : '#EAB308'; c2 = isAbyss ? '#FACC15' : '#DC2626'; }
    else if (sk === 'westfantasy') { c1 = isAbyss ? '#A855F7' : '#60A5FA'; c2 = isAbyss ? '#38BDF8' : '#FACC15'; }
    else if (sk === 'eldritch') { c1 = isAbyss ? '#DC2626' : '#C8A45D'; c2 = isAbyss ? '#FCA5A5' : '#94A3B8'; }
    else if (sk === 'cyberpunk') { c1 = isAbyss ? '#FF003C' : '#FCEE0A'; c2 = isAbyss ? '#FCEE0A' : '#00F0FF'; }
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
