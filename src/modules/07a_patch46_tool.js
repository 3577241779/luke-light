/* ===== patch46-tool.js ===== */
/* patch46-tool.js —— 武装货舱交付（兼容接口工具参数抗截断）
   V5.0 / V4.8 五大根因全量修复版：
   1) 校验 chat_completion_source（非 custom/openai 直接跳过回退常规抗截断）；
   2) 末尾空白 assistant 块自动清理，非空 assistant 预填安全跳过回退常规抗截断；
   3) 引导语改为非自杀式双保险指令，且优先指定 tool_choice 函数名（遇 400 按渠道自动回退 auto）；
   4) 流式解包器支持 \r\n\r\n 与 \n\n、flush 全局 /gm、双重序列化解壳、delta.function_call 与伪流 message.tool_calls；
   5) Content-Type 缺失或 text/plain 时首包自动嗅探 SSE / JSON。 */

var TOOL_NAME = 'lk_write';
var TOOL_CONFIRM = false;
var TOOL_STAT = { hit: 0, miss: 0, partial: 0, last: '', lastAt: 0, streak: 0 };
var TOOL_AUTO_BASES = {};
var TOOL_DESC = '将本轮小说的完整正文写入 content 参数；保持连贯完整，不要分段拆调，不要留空。';
var TOOL_NOTE_TEXT = '「请优先调用 ' + TOOL_NAME + ' 函数并将完整小说正文放入其 content 参数中；若当前环境不支持调用该函数，请直接在普通回复中完整输出正文，切勿留空。」';

function toolParams() {
  return {
    type: 'object',
    properties: {
      content: { type: 'string', description: '本轮小说的完整正文，原文照写，不要摘要、不要解释。' }
    },
    required: ['content']
  };
}

function toolBaseKeyOf(body, hint) {
  try {
    var b = String(hint || (typeof deriveBase === 'function' && body ? deriveBase('', body) : '') || (typeof curBase === 'function' ? curBase() : '') || 'default');
    return b.replace(/\/+$/, '') || 'default';
  } catch (e) { return 'default'; }
}

function toolMarkChoiceFallback(baseKey) {
  var k = String(baseKey || (typeof curBase === 'function' ? curBase() : '') || 'default').replace(/\/+$/, '') || 'default';
  TOOL_AUTO_BASES[k] = 1;
  return k;
}

/* 历史里已经有工具轮 → 不掺和，避免把多轮工具流搅乱 */
function toolHistoryTouched(root) {
  var arr = root && root.messages;
  if (!Array.isArray(arr)) return false;
  for (var i = 0; i < arr.length; i++) {
    var m = arr[i];
    if (!m || typeof m !== 'object') continue;
    if (m.role === 'tool' || m.role === 'function') return true;
    if (m.tool_calls && m.tool_calls.length) return true;
    if (m.function_call) return true;
    if (m.role === 'assistant' && Array.isArray(m.content)) {
      for (var k = 0; k < m.content.length; k++) {
        if (m.content[k] && m.content[k].type === 'tool_use') return true;
      }
    }
  }
  return false;
}

function toolSourceUnsupported(body, root) {
  var src = '';
  try {
    src = String((body && body.chat_completion_source) || (root && root.chat_completion_source) || '').trim().toLowerCase();
  } catch (e) { src = ''; }
  if (src && src !== 'custom' && src !== 'openai') return src;
  return '';
}

/* 预检当前请求是否真正满足武装货舱启用条件（不满足时供 planRequest 无缝回退常规抗截断） */
function toolChanEligible(body) {
  try {
    if (!cfg || !cfg.enabled || cfg.toolChan !== 'on') return false;
    if (String(cfg.jailTool || 'off') !== 'off') return false;
    var root = (body && body.request && typeof body.request === 'object' && !Array.isArray(body.request)) ? body.request : body;
    if (!root || typeof root !== 'object') return false;
    if (toolSourceUnsupported(body, root)) return false;
    if (Array.isArray(root.contents)) return false;
    var arr = root.messages;
    if (!Array.isArray(arr) || !arr.length) return false;
    if (Array.isArray(root.tools) && root.tools.length) return false;
    if (root.functions && root.functions.length) return false;
    if (toolHistoryTouched(root)) return false;
    for (var i = arr.length - 1; i >= 0; i--) {
      var m = arr[i];
      if (!m) continue;
      if (m.role !== 'assistant') break;
      if (String(textOfMsg(m) || '').trim()) return false;
    }
    return true;
  } catch (e) { return false; }
}

function toolLastUserIdx(arr) {
  for (var i = arr.length - 1; i >= 0; i--) if (arr[i] && arr[i].role === 'user') return i;
  return -1;
}

/* 往最后一条 user 追加非自杀式双保险引导语。遇 parts 形态就 push 一个 text part。 */
function toolAppendNote(root) {
  var arr = root && root.messages;
  if (!Array.isArray(arr)) return false;
  var i = toolLastUserIdx(arr);
  if (i < 0) return false;
  var note = TOOL_NOTE_TEXT;
  try { if (typeof lkToolNoteAddon === 'function') note = note + lkToolNoteAddon(); } catch (eN) {}
  var m = arr[i];
  if (typeof m.content === 'string') {
    if (m.content.indexOf(TOOL_NAME) >= 0) return false;
    m.content = m.content + '\n\n' + note;
    return true;
  }
  if (Array.isArray(m.content)) {
    for (var k = 0; k < m.content.length; k++) {
      if (m.content[k] && typeof m.content[k].text === 'string' && m.content[k].text.indexOf(TOOL_NAME) >= 0) return false;
    }
    m.content.push({ type: 'text', text: note });
    return true;
  }
  if (Array.isArray(m.parts)) {
    for (var p = 0; p < m.parts.length; p++) {
      if (m.parts[p] && typeof m.parts[p].text === 'string' && m.parts[p].text.indexOf(TOOL_NAME) >= 0) return false;
    }
    m.parts.push({ text: note });
    return true;
  }
  return false;
}

/* 请求侧：注入 lk_write 工具定义。返回给 out.changed 的说明数组。 */
function toolChanPatch(body, meta) {
  var out = [];
  try {
    if (!cfg || !cfg.enabled || cfg.toolChan !== 'on') return out;
    if (String(cfg.jailTool || 'off') !== 'off') return out;
    var root = (body && body.request && typeof body.request === 'object' && !Array.isArray(body.request)) ? body.request : body;
    if (!root || typeof root !== 'object') return out;
    var badSrc = toolSourceUnsupported(body, root);
    if (badSrc) {
      out.push('武装货舱：渠道源(' + badSrc + ')非兼容接口，已跳过并回退常规能量续航');
      return out;
    }
    if (Array.isArray(root.contents)) { out.push('武装货舱：Gemini 原生形态不支持，已跳过'); return out; }
    var arr = root.messages;
    if (!Array.isArray(arr) || !arr.length) { out.push('武装货舱：没有消息列表，已跳过'); return out; }
    if (Array.isArray(root.tools) && root.tools.length) { out.push('武装货舱：请求里已有 tools，已跳过'); return out; }
    if (root.functions && root.functions.length) { out.push('武装货舱：请求里已有 functions，已跳过'); return out; }
    if (toolHistoryTouched(root)) { out.push('武装货舱：历史里有工具轮，已跳过'); return out; }

    if (meta && meta.prefillBlocked) {
      out.push('武装货舱：检测到末尾非空助手预填，已跳过并回退常规能量续航');
      return out;
    }
    /* 清理末尾空白 assistant 占位块；若存在非空 assistant 预填则严禁强挂 tools */
    var poppedEmpty = 0;
    while (arr.length > 0 && arr[arr.length - 1] && arr[arr.length - 1].role === 'assistant') {
      var tailTxt = String(textOfMsg(arr[arr.length - 1]) || '');
      if (!tailTxt.trim()) {
        arr.pop();
        poppedEmpty++;
      } else {
        out.push('武装货舱：检测到末尾非空助手预填，已跳过并回退常规能量续航');
        return out;
      }
    }
    if (poppedEmpty > 0 && meta) meta.poppedEmptyAsst = true;
    if (!arr.length || toolLastUserIdx(arr) < 0) {
      out.push('武装货舱：无有效 user 消息，已跳过');
      return out;
    }

    root.tools = [{
      type: 'function',
      function: { name: TOOL_NAME, description: TOOL_DESC, parameters: toolParams() }
    }];
    var bKey = toolBaseKeyOf(body, meta && meta.base);
    if (TOOL_AUTO_BASES[bKey]) {
      root.tool_choice = 'auto';
      if (meta) { meta.baseKey = bKey; meta.forcedChoice = false; }
    } else {
      root.tool_choice = { type: 'function', function: { name: TOOL_NAME } };
      if (meta) { meta.baseKey = bKey; meta.forcedChoice = true; }
    }
    toolAppendNote(root);
    out.push('武装货舱：已发 ' + TOOL_NAME + (poppedEmpty ? '（已清理末尾空助手块）' : ''));
    return out;
  } catch (eT) { try { criticalWarn('武装货舱请求', eT); } catch (eT2) {} return out; }
}

/* 解壳反代二次 JSON.stringify 的转义字符串（兼容完整闭合与流式半截分片） */
function toolUnquoteRaw(raw) {
  var src = String(raw || '');
  var trimmed = src.replace(/^\s+/, '');
  if (trimmed.charAt(0) !== '"') return src;
  try {
    var parsed = JSON.parse(trimmed.replace(/\s+$/, ''));
    if (typeof parsed === 'string') return parsed;
  } catch (e0) {
    var inner = '', qi = 1;
    while (qi < trimmed.length) {
      var qc = trimmed.charAt(qi);
      if (qc === '\\') {
        if (qi + 1 >= trimmed.length) break;
        var qn = trimmed.charAt(qi + 1);
        if (qn === 'u') {
          if (qi + 6 > trimmed.length) break;
          var qhex = trimmed.substr(qi + 2, 4);
          if (!/^[0-9a-fA-F]{4}$/.test(qhex)) break;
          inner += String.fromCharCode(parseInt(qhex, 16));
          qi += 6; continue;
        }
        var qmap = { n: '\n', r: '\r', t: '\t', b: '\b', f: '\f', '"': '"', '\\': '\\', '/': '/' };
        inner += (qmap[qn] !== undefined) ? qmap[qn] : qn;
        qi += 2; continue;
      }
      if (qc === '"') break;
      inner += qc; qi++;
    }
    if (inner) return inner;
  }
  return src;
}

/* 从参数 JSON 的累积文本里抽出 content 字符串（支持流式半截与双重序列化） */
function toolPull(raw) {
  var res = { text: '', closed: false, started: false };
  if (!raw) return res;
  var src = toolUnquoteRaw(raw);
  var m = /"content"\s*:\s*"/.exec(src);
  if (!m) { try { var lkAlt = (typeof lkAltToolPull === 'function') ? lkAltToolPull(src) : null; if (lkAlt) return lkAlt; } catch (eAlt) {} return res; }
  res.started = true;
  var i = m.index + m[0].length, buf = '';
  while (i < src.length) {
    var c = src.charAt(i);
    if (c === '\\') {
      if (i + 1 >= src.length) break;
      var n = src.charAt(i + 1);
      if (n === 'u') {
        if (i + 6 > src.length) break;
        var hex = src.substr(i + 2, 4);
        if (!/^[0-9a-fA-F]{4}$/.test(hex)) break;
        buf += String.fromCharCode(parseInt(hex, 16));
        i += 6; continue;
      }
      var map = { n: '\n', r: '\r', t: '\t', b: '\b', f: '\f', '"': '"', '\\': '\\', '/': '/' };
      buf += (map[n] !== undefined) ? map[n] : n;
      i += 2; continue;
    }
    if (c === '"') { res.closed = true; break; }
    buf += c; i++;
  }
  res.text = buf;
  return res;
}

function toolCopyHeaders(res, H) {
  var headers = new H.Headers();
  try {
    res.headers.forEach(function (v, k) {
      var lk = String(k).toLowerCase();
      if (lk === 'content-length' || lk === 'content-encoding' || lk === 'transfer-encoding') return;
      headers.set(k, v);
    });
  } catch (eH) {}
  return headers;
}

function toolCreateUnwrapper() {
  var acc = {}, emittedByKey = {}, totalEmitted = 0, sawTool = false;
  var plainPrefix = '', dedupedTool = false, pendingDedup = '';
  var armorStream = (typeof lkCreateArmorStream === 'function') ? lkCreateArmorStream() : null;
  var canUnmask = function () {
    return !!(cfg && cfg.enabled && cfg.desens === 'a' && cfg.desensUnmask !== false &&
      typeof desensSafeCut === 'function' && typeof desensRestoreTxt === 'function');
  };
  var hasArmor = function () {
    return !!(typeof LK_ARMOR_BUSY !== 'undefined' && LK_ARMOR_BUSY && typeof lkArmorRestore === 'function');
  };
  function restoreChunk(s) {
    if (!s) return '';
    if (canUnmask()) return desensRestoreTxt(s);
    if (hasArmor()) return lkArmorRestore(s);
    return s;
  }
  function dedupAgainstPrefix(s, isDone) {
    if (dedupedTool) return s;
    if (!plainPrefix) { dedupedTool = true; return s; }
    pendingDedup += s;
    if (!isDone && pendingDedup.length < Math.min(plainPrefix.length, 48)) return '';
    dedupedTool = true;
    var res = (typeof lkFrameDedupe === 'function') ? lkFrameDedupe(plainPrefix, pendingDedup) : pendingDedup;
    pendingDedup = '';
    return res;
  }

  function feed(key, frag, isFinal) {
    var k = String(key);
    acc[k] = (acc[k] || '') + frag;
    var pulled = toolPull(acc[k]);
    var txt = pulled.text;
    var prev = emittedByKey[k] || 0;
    var end = txt.length;
    var done = !!(isFinal || pulled.closed);
    if (!done && (canUnmask() || hasArmor()) && end > prev && typeof desensSafeCut === 'function') {
      var safe = desensSafeCut(txt);
      if (safe < prev) safe = prev;
      end = safe;
    }
    if (end <= prev) {
      if (done && !dedupedTool && pendingDedup) return dedupAgainstPrefix('', true);
      return '';
    }
    var add = txt.slice(prev, end);
    emittedByKey[k] = end;
    add = restoreChunk(add);
    add = dedupAgainstPrefix(add, done);
    totalEmitted += add.length;
    return add;
  }

  function drainHeld() {
    var rest = '';
    for (var k in acc) {
      if (!Object.prototype.hasOwnProperty.call(acc, k)) continue;
      rest += feed(k, '', true);
    }
    if (!dedupedTool && pendingDedup) {
      var left = dedupAgainstPrefix('', true);
      totalEmitted += left.length;
      rest += left;
    }
    return rest;
  }

  function flushLeftoverFrame() {
    var tailTxt = drainHeld();
    if (armorStream && hasArmor()) tailTxt += armorStream.flush();
    if (!tailTxt) return '';
    return 'data: ' + JSON.stringify({ choices: [{ index: 0, delta: { content: tailTxt }, finish_reason: null }] }) + '\n\n';
  }

  function handleObj(o) {
    if (!o || typeof o !== 'object') return o;
    var ch = Array.isArray(o.choices) ? o.choices[0] : null;
    if (!ch) return o;
    var d = ch.delta;

    /* 1) 标准流式 delta.tool_calls */
    if (d && Array.isArray(d.tool_calls) && d.tool_calls.length) {
      sawTool = true;
      if (d.content && String(d.content).trim() && typeof LK_CONFLICT !== 'undefined') LK_CONFLICT.n++;
      var isEnd1 = (ch.finish_reason === 'tool_calls' || ch.finish_reason === 'function_call');
      var add = '';
      for (var i = 0; i < d.tool_calls.length; i++) {
        var tc = d.tool_calls[i] || {};
        var idx = (typeof tc.index === 'number') ? tc.index : 0;
        var f = tc.function || {};
        if (typeof f.arguments === 'string') add += feed('d' + idx, f.arguments, isEnd1);
      }
      if (isEnd1) add += drainHeld();
      ch.delta = add ? { content: add } : {};
      if (isEnd1) ch.finish_reason = 'stop';
      else delete ch.finish_reason;
      return o;
    }

    /* 2) 旧式流式 delta.function_call */
    if (d && d.function_call && typeof d.function_call === 'object') {
      sawTool = true;
      if (d.content && String(d.content).trim() && typeof LK_CONFLICT !== 'undefined') LK_CONFLICT.n++;
      var isEnd2 = (ch.finish_reason === 'tool_calls' || ch.finish_reason === 'function_call');
      var fcAdd = (typeof d.function_call.arguments === 'string') ? feed('dfc', d.function_call.arguments, isEnd2) : '';
      if (isEnd2) fcAdd += drainHeld();
      ch.delta = fcAdd ? { content: fcAdd } : {};
      if (isEnd2) ch.finish_reason = 'stop';
      else delete ch.finish_reason;
      return o;
    }

    /* 3) 伪流单帧 ch.message.tool_calls / ch.message.function_call */
    var msg = ch.message;
    if (msg && Array.isArray(msg.tool_calls) && msg.tool_calls.length) {
      sawTool = true;
      var mAdd = '';
      for (var mi = 0; mi < msg.tool_calls.length; mi++) {
        var mtc = msg.tool_calls[mi] || {};
        var midx = (typeof mtc.index === 'number') ? mtc.index : mi;
        var mf = mtc.function || {};
        if (typeof mf.arguments === 'string') mAdd += feed('m' + midx, mf.arguments, true);
      }
      mAdd += drainHeld();
      msg.content = mAdd || restoreChunk(String(msg.content || ''));
      delete msg.tool_calls;
      if ('function_call' in msg) delete msg.function_call;
      if (d && typeof d === 'object' && !d.content && mAdd) d.content = mAdd;
      ch.finish_reason = 'stop';
      return o;
    }
    if (msg && msg.function_call && typeof msg.function_call === 'object') {
      sawTool = true;
      var mfc = (typeof msg.function_call.arguments === 'string') ? feed('mfc', msg.function_call.arguments, true) : '';
      mfc += drainHeld();
      msg.content = mfc || restoreChunk(String(msg.content || ''));
      delete msg.function_call;
      if (d && typeof d === 'object' && !d.content && mfc) d.content = mfc;
      ch.finish_reason = 'stop';
      return o;
    }

    /* 4) 结束帧 finish_reason === 'tool_calls' / 'function_call' */
    if (ch.finish_reason === 'tool_calls' || ch.finish_reason === 'function_call') {
      var tailAdd = drainHeld();
      if (d) ch.delta = { content: tailAdd };
      ch.finish_reason = 'stop';
      sawTool = true;
      return o;
    }

    /* 5) 普通文本帧（工具调用前的 1–2 句开头或未调工具透传）：仅在解析后的文本字段上还原并记前缀，绝不改动外层 SSE 帧头 */
    if (d && typeof d.content === 'string' && d.content) {
      var plain = d.content;
      if (armorStream && hasArmor()) plain = armorStream.feed(plain);
      if (canUnmask()) plain = desensRestoreTxt(plain);
      d.content = plain;
      if (!sawTool && plain) plainPrefix = (plainPrefix + plain).slice(-400);
    } else if (msg && typeof msg.content === 'string' && msg.content) {
      msg.content = restoreChunk(msg.content);
    }
    return o;
  }

  function processDataPayload(payload, rawLine) {
    var trimmed = String(payload || '').trim();
    if (!trimmed || trimmed === '[DONE]') return rawLine;
    try {
      var o = JSON.parse(trimmed);
      var r = handleObj(o);
      return 'data: ' + JSON.stringify(r);
    } catch (eL) { return rawLine; }
  }

  function processEventBlock(block) {
    var lines = block.split(/\r?\n/);
    var out = [];
    for (var i = 0; i < lines.length; i++) {
      var ln = lines[i];
      var m = /^data:\s?(.*)$/.exec(ln);
      if (m) out.push(processDataPayload(m[1], ln));
      else out.push(ln);
    }
    return out.join('\n');
  }

  function finalizeStats() {
    if (sawTool) { TOOL_STAT.hit++; TOOL_STAT.streak = 0; }
    else { TOOL_STAT.miss++; TOOL_STAT.streak++; }
    TOOL_STAT.last = sawTool ? ('收到 ' + totalEmitted + ' 字') : '普通回复透传（未调工具）';
    TOOL_STAT.lastAt = Date.now();
    try { toolAutoOff(); } catch (eS) {}
  }

  return {
    handleObj: handleObj,
    processDataPayload: processDataPayload,
    processEventBlock: processEventBlock,
    flushLeftoverFrame: flushLeftoverFrame,
    finalizeStats: finalizeStats,
    sawTool: function () { return sawTool; }
  };
}

/* 响应侧：SSE 流式与伪流解包（兼容 \r\n\r\n 与 \n\n，全链路保持合法 SSE data: {...} 帧结构） */
function toolWrapStream(res) {
  try {
    var H = HOST || {};
    if (typeof H.TransformStream !== 'function' || typeof H.Response !== 'function' ||
        typeof H.TextDecoder !== 'function' || typeof H.TextEncoder !== 'function') return res;
    var dec = new H.TextDecoder('utf-8'), enc = new H.TextEncoder();
    var buf = '';
    var uw = toolCreateUnwrapper();

    var ts = new H.TransformStream({
      transform: function (chunk, ctl) {
        buf += dec.decode(chunk, { stream: true });
        var sep;
        while ((sep = /\r?\n\r?\n/.exec(buf)) !== null) {
          var rawBlock = buf.slice(0, sep.index);
          buf = buf.slice(sep.index + sep[0].length);
          var outBlock = uw.processEventBlock(rawBlock);
          if (outBlock) ctl.enqueue(enc.encode(outBlock + '\n\n'));
        }
      },
      flush: function (ctl) {
        buf += dec.decode();
        if (buf.trim()) {
          var trimmedBuf = buf.trim();
          if (!/^data:/m.test(buf) && trimmedBuf.charAt(0) === '{') {
            /* 兼容反代挂着 text/event-stream 头却返回整包 JSON 的情况 */
            try {
              var jObj = JSON.parse(trimmedBuf);
              uw.handleObj(jObj);
              ctl.enqueue(enc.encode(JSON.stringify(jObj)));
              buf = '';
              uw.finalizeStats();
              return;
            } catch (eJ) {}
          }
          var flushed = buf.replace(/^data:\s?(.*)$/gm, function (full, p1) {
            return uw.processDataPayload(p1, full);
          });
          if (!/\n\n$/.test(flushed)) flushed = flushed.replace(/\r?\n?$/, '\n\n');
          ctl.enqueue(enc.encode(flushed));
        }
        try {
          var leftFrame = uw.flushLeftoverFrame();
          if (leftFrame) ctl.enqueue(enc.encode(leftFrame));
        } catch (eLF) {}
        buf = '';
        uw.finalizeStats();
      }
    });
    return new H.Response(res.body.pipeThrough(ts), { status: res.status, statusText: res.statusText, headers: toolCopyHeaders(res, H) });
  } catch (e) { return res; }
}

/* 非流式：choices[0].message.tool_calls / function_call → message.content */
function toolFixJson(obj) {
  try {
    var ch = Array.isArray(obj && obj.choices) ? obj.choices[0] : null;
    if (!ch || !ch.message) return false;
    var msg = ch.message;
    var rawArgs = '';
    if (Array.isArray(msg.tool_calls) && msg.tool_calls.length) {
      for (var i = 0; i < msg.tool_calls.length; i++) {
        var tc = msg.tool_calls[i];
        if (tc && tc.function && typeof tc.function.arguments === 'string') rawArgs += tc.function.arguments;
      }
    } else if (msg.function_call && typeof msg.function_call.arguments === 'string') {
      rawArgs = msg.function_call.arguments;
    } else {
      return false;
    }
    var pulled = toolPull(String(rawArgs));
    if (pulled.text) {
      var cleanTxt = pulled.text;
      if (cfg && cfg.enabled && cfg.desens === 'a' && cfg.desensUnmask !== false && typeof desensRestoreTxt === 'function') {
        cleanTxt = desensRestoreTxt(cleanTxt);
      } else if (typeof LK_ARMOR_BUSY !== 'undefined' && LK_ARMOR_BUSY && typeof lkArmorRestore === 'function') {
        cleanTxt = lkArmorRestore(cleanTxt);
      }
      msg.content = cleanTxt;
      delete msg.tool_calls;
      if ('function_call' in msg) delete msg.function_call;
      ch.finish_reason = 'stop';
      TOOL_STAT.hit++;
      TOOL_STAT.streak = 0;
      TOOL_STAT.last = '收到 ' + cleanTxt.length + ' 字';
    } else {
      TOOL_STAT.miss++;
      TOOL_STAT.streak++;
      TOOL_STAT.last = '工具参数无有效正文';
    }
    return true;
  } catch (e) { return false; }
}

/* 非流式 JSON：整体缓冲，改完再吐出去（保持 Response 形态） */
function toolWrapJson(res) {
  try {
    var H = HOST || {};
    if (typeof H.TransformStream !== 'function' || typeof H.Response !== 'function' ||
        typeof H.TextDecoder !== 'function' || typeof H.TextEncoder !== 'function') return res;
    var dec = new H.TextDecoder('utf-8'), enc = new H.TextEncoder(), buf = '';
    var ts = new H.TransformStream({
      transform: function (chunk, ctl) { buf += dec.decode(chunk, { stream: true }); },
      flush: function (ctl) {
        buf += dec.decode();
        var outTxt = buf;
        try {
          var obj = JSON.parse(buf);
          if (toolFixJson(obj)) outTxt = JSON.stringify(obj);
          else { TOOL_STAT.miss++; TOOL_STAT.streak++; }
        } catch (eP) {
          /* 若挂着 json 头实际发的是 data: SSE 流，自动降级按 SSE 全局解包 */
          if (/^data:\s?/m.test(buf)) {
            var uw = toolCreateUnwrapper();
            outTxt = buf.replace(/^data:\s?(.*)$/gm, function (full, p1) {
              return uw.processDataPayload(p1, full);
            });
            uw.finalizeStats();
            if (outTxt) ctl.enqueue(enc.encode(outTxt));
            buf = '';
            return;
          }
        }
        TOOL_STAT.lastAt = Date.now();
        try { toolAutoOff(); } catch (eA) {}
        if (outTxt) ctl.enqueue(enc.encode(outTxt));
        buf = '';
      }
    });
    return new H.Response(res.body.pipeThrough(ts), { status: res.status, statusText: res.statusText, headers: toolCopyHeaders(res, H) });
  } catch (e) { return res; }
}

/* Content-Type 缺失或 text/plain 时：在首个非空分片嗅探 data:/event: (SSE) 或 { (JSON) */
function toolWrapSniff(res) {
  try {
    var H = HOST || {};
    if (typeof H.TransformStream !== 'function' || typeof H.Response !== 'function' ||
        typeof H.TextDecoder !== 'function' || typeof H.TextEncoder !== 'function') return res;
    var dec = new H.TextDecoder('utf-8'), enc = new H.TextEncoder();
    var mode = '', buf = '';
    var uw = toolCreateUnwrapper();

    function pumpSse(ctl) {
      var sep;
      while ((sep = /\r?\n\r?\n/.exec(buf)) !== null) {
        var rawBlock = buf.slice(0, sep.index);
        buf = buf.slice(sep.index + sep[0].length);
        var outBlock = uw.processEventBlock(rawBlock);
        if (outBlock) ctl.enqueue(enc.encode(outBlock + '\n\n'));
      }
    }

    var ts = new H.TransformStream({
      transform: function (chunk, ctl) {
        var s = dec.decode(chunk, { stream: true });
        if (mode === 'pass') { if (s) ctl.enqueue(enc.encode(s)); return; }
        buf += s;
        if (!mode) {
          var lead = buf.replace(/^\s+/, '');
          if (!lead) return;
          if (lead.charAt(0) === '{') {
            mode = 'json';
          } else if (/^(?:data:|event:|:)/i.test(lead)) {
            mode = 'sse';
          } else if (lead.length >= 6) {
            mode = 'pass';
            ctl.enqueue(enc.encode(buf));
            buf = '';
            return;
          } else {
            return;
          }
        }
        if (mode === 'sse') pumpSse(ctl);
      },
      flush: function (ctl) {
        buf += dec.decode();
        if (mode === 'sse' || (!mode && /^(?:data:|event:)/i.test(buf.replace(/^\s+/, '')))) {
          if (buf.trim()) {
            var flushed = buf.replace(/^data:\s?(.*)$/gm, function (full, p1) {
              return uw.processDataPayload(p1, full);
            });
            if (!/\n\n$/.test(flushed)) flushed = flushed.replace(/\r?\n?$/, '\n\n');
            ctl.enqueue(enc.encode(flushed));
          }
          buf = '';
          uw.finalizeStats();
          return;
        }
        if (mode === 'json' || (!mode && buf.replace(/^\s+/, '').charAt(0) === '{')) {
          var outTxt = buf;
          try {
            var obj = JSON.parse(buf);
            if (toolFixJson(obj)) outTxt = JSON.stringify(obj);
            else { TOOL_STAT.miss++; TOOL_STAT.streak++; }
          } catch (eJ) {}
          TOOL_STAT.lastAt = Date.now();
          try { toolAutoOff(); } catch (eA) {}
          if (outTxt) ctl.enqueue(enc.encode(outTxt));
          buf = '';
          return;
        }
        if (buf) ctl.enqueue(enc.encode(buf));
        buf = '';
      }
    });
    return new H.Response(res.body.pipeThrough(ts), { status: res.status, statusText: res.statusText, headers: toolCopyHeaders(res, H) });
  } catch (e) { return res; }
}

/* 入口：plan.tool 为真且 HTTP 200 时接管（支持标准头与无头首包嗅探） */
function toolMaybeWrap(res, plan, internal) {
  try {
    if (!res || internal || !cfg || !cfg.enabled) return res;
    if (cfg.toolChan !== 'on') return res;
    if (!plan || !plan.tool) return res;
    if (res.status !== 200 && !(res.status >= 200 && res.status < 300)) return res;
    if (!res.body || typeof res.body.getReader !== 'function') return res;
    var ct = '';
    try { ct = String(res.headers && res.headers.get ? res.headers.get('content-type') : ''); } catch (eC) {}
    if (ct && /event-stream/i.test(ct)) return toolWrapStream(res);
    if (ct && /\bjson\b/i.test(ct)) return toolWrapJson(res);
    return toolWrapSniff(res);
  } catch (e) { return res; }
}

function toolAutoOff() {
  if (TOOL_STAT.streak >= 3 && cfg && cfg.toolChan === 'on') {
    cfg.toolChan = 'off';
    try { saveCfg(); } catch (e1) {}
    try { banner('武装货舱交付：连续三轮未收到函数返回，已自动切回常规续航', 'warn'); } catch (e2) {}
    try { render(); } catch (e3) {}
  }
}

function toolStatusLine() {
  if (!cfg || cfg.toolChan !== 'on') return '';
  var s = '武装货舱 · 圣柜信道：已开启';
  if (TOOL_STAT.hit || TOOL_STAT.miss) s += ' · 成功解包 ' + TOOL_STAT.hit + ' / 透传 ' + TOOL_STAT.miss;
  if (TOOL_STAT.last) s += ' · 上次：' + TOOL_STAT.last;
  return s;
}

function toolConfirmHTML() {
  return '<div class="ar6-dlg" style="margin:8px 14px;padding:12px;border-radius:10px;background:rgba(12,45,72,.55);border:1px solid #38bdf8;">' +
    '<div style="font-weight:700;color:#f0f9ff;margin-bottom:6px">武装货舱 · 独立圣柜信道启用敕令</div>' +
    '<div style="font-size:12px;color:#cbd5e1;line-height:1.6">通过独立函数圣柜（lk_write）完整封装并交回整段正文，跨越常规流式截断障壁；遇到非兼容源或末尾带助手预填引子时，将自动无缝切回常规能量续航，绝不空回。</div>' +
    '<div class="ar6-mrow" style="margin-top:8px">' +
    '<button type="button" class="ar6-b gold on" data-ar6="tool-on"><span>【锁定圣柜信道】</span></button>' +
    '<button type="button" class="ar6-b" data-ar6="tool-off"><span>退回常规信道</span></button>' +
    '</div></div>';
}
