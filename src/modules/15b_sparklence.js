/* ===== 11b_sparklence.js ===== */
/* ============================================================================
 * 卢克之光 V5.6 — 神光棒互动变身召唤演出 / 化光彗星流光跃迁 / Type Change 特效 / 1996 迪迦拟真声学引擎
 *
 * 设计铁律：
 *   - 100% 纯代码 Web Audio 合成音效（0 KB 外部音频，零版权风险，默认静音开关，防社死）。
 *   - 60fps 全屏演出画布严格 pointer-events:none，结束或中断立刻彻底卸载，零内存/RAF 泄漏。
 *   - 手机端点击神光棒防穿透（ar6ArmSynthShield）且支持点击空白处/跳过按钮秒退，绝不锁死酒馆界面。
 *   - 若系统开启减弱动效（cfg.rm）或桌宠动效为静止（motion === 'off'），自动降级为柔和现身不闪屏。
 * ========================================================================== */

var AR6_SPARK_ID = 'ar6-spark';
var AR6_SPFX_ID = 'ar6-spfx';
var AR6_SPARK_STYLE_ID = 'ar6-spark-style';

var AR6_SFX_CTX = null;
var AR6_SFX_REV = null;
var AR6_SFX_OUT = null;

var AR6_SPARK_RUN = {
  active: false,
  timers: [],
  raf: 0,
  onCancel: null
};

var AR6_TC_RAF = 0;

function ar6SfxOn() {
  try {
    var p = AR6_PET_STATE || (typeof petRead === 'function' ? petRead() : null);
    return !!(p && p.sfx === true);
  } catch (e) { return false; }
}

function ar6SfxPreset() {
  try {
    var p = AR6_PET_STATE || (typeof petRead === 'function' ? petRead() : null);
    var v = String((p && p.sfxPreset) || 'tiga1996');
    if (v === 'tiga1996' || v === 'glitter' || v === 'dark' || v === 'crisp') return v;
  } catch (e) {}
  return 'tiga1996';
}

function ar6EnsureAudio() {
  try {
    if (!AR6_SFX_CTX) {
      var W = (DOC && DOC.defaultView) || HOST || window;
      var AC = (W && (W.AudioContext || W.webkitAudioContext)) ||
        (typeof AudioContext === 'function' ? AudioContext : null);
      if (!AC) return null;
      AR6_SFX_CTX = new AC();
      var comp = AR6_SFX_CTX.createDynamicsCompressor();
      comp.threshold.value = -10;
      comp.ratio.value = 4.5;
      comp.connect(AR6_SFX_CTX.destination);
      AR6_SFX_OUT = comp;

      var rate = AR6_SFX_CTX.sampleRate || 44100;
      var len = Math.floor(rate * 1.35);
      var buf = AR6_SFX_CTX.createBuffer(2, len, rate);
      for (var ch = 0; ch < 2; ch++) {
        var arr = buf.getChannelData(ch);
        for (var i = 0; i < len; i++) {
          arr[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3.0) * 0.4;
        }
      }
      AR6_SFX_REV = AR6_SFX_CTX.createConvolver();
      AR6_SFX_REV.buffer = buf;
      var wet = AR6_SFX_CTX.createGain();
      wet.gain.value = 0.26;
      AR6_SFX_REV.connect(wet);
      wet.connect(AR6_SFX_OUT);
    }
    if (AR6_SFX_CTX.state === 'suspended' && typeof AR6_SFX_CTX.resume === 'function') {
      try { AR6_SFX_CTX.resume(); } catch (eR) {}
    }
    return AR6_SFX_CTX;
  } catch (e) { return null; }
}

function ar6AudioRoute(node, wetAmt) {
  if (!node || !AR6_SFX_OUT || !AR6_SFX_CTX) return;
  node.connect(AR6_SFX_OUT);
  if (AR6_SFX_REV && wetAmt > 0) {
    var g = AR6_SFX_CTX.createGain();
    g.gain.value = wetAmt;
    node.connect(g);
    g.connect(AR6_SFX_REV);
  }
}

function ar6SfxSnap(ctx, t, bright) {
  var offs = [0, 0.022];
  for (var k = 0; k < offs.length; k++) {
    var off = offs[k];
    var len = Math.floor((ctx.sampleRate || 44100) * 0.03);
    var buf = ctx.createBuffer(1, len, ctx.sampleRate || 44100);
    var d = buf.getChannelData(0);
    for (var i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.exp(-i / (len * 0.14));
    var src = ctx.createBufferSource();
    src.buffer = buf;
    var bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = (bright || 3400) + k * 1100;
    bp.Q.value = 2.6;
    var g = ctx.createGain();
    g.gain.setValueAtTime(0.52 - k * 0.14, t + off);
    g.gain.exponentialRampToValueAtTime(0.001, t + off + 0.032);
    src.connect(bp); bp.connect(g); ar6AudioRoute(g, 0.2);
    src.start(t + off);
  }
}

function ar6SfxSpiralFM(ctx, t, dur, fStart, fEnd, r0, r1) {
  var car = ctx.createOscillator();
  car.type = 'sawtooth';
  car.frequency.setValueAtTime(fStart, t);
  car.frequency.exponentialRampToValueAtTime(fEnd, t + dur);

  var car2 = ctx.createOscillator();
  car2.type = 'triangle';
  car2.frequency.setValueAtTime(fStart * 2.01, t);
  car2.frequency.exponentialRampToValueAtTime(fEnd * 1.5, t + dur);

  var lfo = ctx.createOscillator();
  lfo.type = 'sine';
  lfo.frequency.setValueAtTime(r0, t);
  lfo.frequency.linearRampToValueAtTime(r1, t + dur);
  var fmDepth = ctx.createGain();
  fmDepth.gain.setValueAtTime(95, t);
  fmDepth.gain.linearRampToValueAtTime(270, t + dur * 0.8);
  lfo.connect(fmDepth);
  fmDepth.connect(car.frequency);
  fmDepth.connect(car2.frequency);

  var bp = ctx.createBiquadFilter();
  bp.type = 'bandpass';
  bp.frequency.setValueAtTime(920, t);
  bp.frequency.exponentialRampToValueAtTime(5200, t + dur);
  bp.Q.value = 1.6;

  var am = ctx.createGain();
  am.gain.setValueAtTime(0.001, t);
  am.gain.linearRampToValueAtTime(0.3, t + 0.09);
  am.gain.setValueAtTime(0.33, t + dur * 0.78);
  am.gain.exponentialRampToValueAtTime(0.001, t + dur + 0.14);

  car.connect(bp); car2.connect(bp); bp.connect(am);
  ar6AudioRoute(am, 0.52);

  var nLen = Math.floor((ctx.sampleRate || 44100) * (dur + 0.14));
  var nBuf = ctx.createBuffer(1, nLen, ctx.sampleRate || 44100);
  var nd = nBuf.getChannelData(0);
  for (var i = 0; i < nLen; i++) nd[i] = Math.random() * 2 - 1;
  var nSrc = ctx.createBufferSource();
  nSrc.buffer = nBuf;
  var hp = ctx.createBiquadFilter();
  hp.type = 'bandpass';
  hp.Q.value = 2.0;
  hp.frequency.setValueAtTime(2200, t);
  hp.frequency.exponentialRampToValueAtTime(7600, t + dur);
  var ng = ctx.createGain();
  ng.gain.setValueAtTime(0.001, t);
  ng.gain.linearRampToValueAtTime(0.13, t + dur * 0.7);
  ng.gain.exponentialRampToValueAtTime(0.001, t + dur + 0.13);
  nSrc.connect(hp); hp.connect(ng); ar6AudioRoute(ng, 0.48);

  car.start(t); car2.start(t); lfo.start(t); nSrc.start(t);
  car.stop(t + dur + 0.16); car2.stop(t + dur + 0.16); lfo.stop(t + dur + 0.16); nSrc.stop(t + dur + 0.15);
}

function ar6SfxRiseBoom(ctx, t, deep) {
  var sub = ctx.createOscillator();
  sub.type = 'sine';
  sub.frequency.setValueAtTime(deep ? 95 : 135, t);
  sub.frequency.exponentialRampToValueAtTime(deep ? 28 : 42, t + 0.74);
  var sg = ctx.createGain();
  sg.gain.setValueAtTime(0.001, t);
  sg.gain.linearRampToValueAtTime(0.58, t + 0.03);
  sg.gain.exponentialRampToValueAtTime(0.001, t + 0.84);
  sub.connect(sg); ar6AudioRoute(sg, 0.34);
  sub.start(t); sub.stop(t + 0.86);

  var r1 = ctx.createOscillator(), r2 = ctx.createOscillator();
  r1.type = 'sawtooth'; r2.type = 'triangle';
  var base = deep ? 110 : 196;
  r1.frequency.setValueAtTime(base, t);
  r1.frequency.exponentialRampToValueAtTime(base * 2.5, t + 0.64);
  r2.frequency.setValueAtTime(base * 1.498, t);
  r2.frequency.exponentialRampToValueAtTime(base * 3.75, t + 0.64);
  var flt = ctx.createBiquadFilter();
  flt.type = 'lowpass';
  flt.frequency.setValueAtTime(420, t);
  flt.frequency.exponentialRampToValueAtTime(2800, t + 0.44);
  flt.frequency.exponentialRampToValueAtTime(900, t + 1.02);
  var rg = ctx.createGain();
  rg.gain.setValueAtTime(0.001, t);
  rg.gain.linearRampToValueAtTime(0.2, t + 0.14);
  rg.gain.exponentialRampToValueAtTime(0.001, t + 1.06);
  r1.connect(flt); r2.connect(flt); flt.connect(rg); ar6AudioRoute(rg, 0.62);
  r1.start(t); r2.start(t); r1.stop(t + 1.08); r2.stop(t + 1.08);
}

function ar6SfxPlay(kind, forcePreview) {
  try {
    if (!forcePreview && !ar6SfxOn()) return false;
    var ctx = ar6EnsureAudio();
    if (!ctx) return false;
    var t = ctx.currentTime + 0.02;
    var k = String(kind || ar6SfxPreset());

    if (k === 'tiga1996') {
      ar6SfxSnap(ctx, t, 3400);
      ar6SfxSpiralFM(ctx, t + 0.04, 0.78, 380, 2550, 34, 58);
      ar6SfxRiseBoom(ctx, t + 0.76, false);
      return true;
    }
    if (k === 'glitter') {
      ar6SfxSnap(ctx, t, 3800);
      ar6SfxSpiralFM(ctx, t + 0.04, 0.72, 520, 3100, 38, 62);
      ar6SfxRiseBoom(ctx, t + 0.72, false);
      var chord = [261.63, 392.0, 523.25, 659.25, 783.99];
      for (var c = 0; c < chord.length; c++) {
        var o = ctx.createOscillator();
        o.type = 'triangle';
        o.frequency.setValueAtTime(chord[c], t + 0.68);
        var g = ctx.createGain();
        g.gain.setValueAtTime(0.001, t + 0.68);
        g.gain.linearRampToValueAtTime(0.09, t + 0.92);
        g.gain.exponentialRampToValueAtTime(0.001, t + 2.1);
        o.connect(g); ar6AudioRoute(g, 0.82);
        o.start(t + 0.68); o.stop(t + 2.15);
      }
      return true;
    }
    if (k === 'dark') {
      ar6SfxSnap(ctx, t, 1600);
      ar6SfxSpiralFM(ctx, t + 0.05, 0.74, 210, 880, 22, 40);
      ar6SfxRiseBoom(ctx, t + 0.74, true);
      return true;
    }
    if (k === 'crisp') {
      ar6SfxSnap(ctx, t, 3600);
      ar6SfxSpiralFM(ctx, t + 0.03, 0.44, 580, 2900, 42, 64);
      return true;
    }
    if (k === 'whoosh') {
      var len = Math.floor((ctx.sampleRate || 44100) * 0.56);
      var buf = ctx.createBuffer(1, len, ctx.sampleRate || 44100);
      var d = buf.getChannelData(0);
      for (var i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
      var src = ctx.createBufferSource(); src.buffer = buf;
      var bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.Q.value = 3.4;
      bp.frequency.setValueAtTime(2600, t); bp.frequency.exponentialRampToValueAtTime(340, t + 0.5);
      var wg = ctx.createGain();
      wg.gain.setValueAtTime(0.001, t); wg.gain.linearRampToValueAtTime(0.3, t + 0.09);
      wg.gain.exponentialRampToValueAtTime(0.001, t + 0.53);
      src.connect(bp); bp.connect(wg); ar6AudioRoute(wg, 0.44);
      src.start(t);

      var lo = ctx.createOscillator(); lo.type = 'sine';
      lo.frequency.setValueAtTime(1650, t); lo.frequency.exponentialRampToValueAtTime(360, t + 0.44);
      var lg = ctx.createGain(); lg.gain.setValueAtTime(0.13, t); lg.gain.exponentialRampToValueAtTime(0.001, t + 0.45);
      lo.connect(lg); ar6AudioRoute(lg, 0.4);
      lo.start(t); lo.stop(t + 0.47);
      return true;
    }
    if (k === 'typeChange' || k === 'typeDark') {
      var isDk = (k === 'typeDark');
      var to = ctx.createOscillator(); to.type = isDk ? 'sawtooth' : 'triangle';
      to.frequency.setValueAtTime(isDk ? 420 : 1200, t);
      to.frequency.exponentialRampToValueAtTime(isDk ? 95 : 2600, t + 0.34);
      var tf = ctx.createBiquadFilter(); tf.type = 'bandpass'; tf.frequency.value = isDk ? 600 : 2200; tf.Q.value = 1.8;
      var tg = ctx.createGain();
      tg.gain.setValueAtTime(0.001, t); tg.gain.linearRampToValueAtTime(0.2, t + 0.05);
      tg.gain.exponentialRampToValueAtTime(0.001, t + 0.42);
      to.connect(tf); tf.connect(tg); ar6AudioRoute(tg, 0.52);
      to.start(t); to.stop(t + 0.44);
      return true;
    }
    if (k === 'timerAlert' || k === 'timerFast') {
      var beats = (k === 'timerFast') ? 4 : 3;
      var gap = (k === 'timerFast') ? 0.42 : 0.74;
      for (var b = 0; b < beats; b++) {
        var st = t + b * gap;
        var f0 = ctx.createOscillator(); f0.type = 'sine';
        f0.frequency.setValueAtTime(1120, st);
        f0.frequency.exponentialRampToValueAtTime(1174.66, st + 0.024);
        var g0 = ctx.createGain();
        g0.gain.setValueAtTime(0.001, st);
        g0.gain.linearRampToValueAtTime(0.26, st + 0.008);
        g0.gain.exponentialRampToValueAtTime(0.001, st + 0.33);
        f0.connect(g0); ar6AudioRoute(g0, 0.5);

        var f1 = ctx.createOscillator(); f1.type = 'sine'; f1.frequency.setValueAtTime(2349.32, st);
        var g1 = ctx.createGain(); g1.gain.setValueAtTime(0.1, st); g1.gain.exponentialRampToValueAtTime(0.001, st + 0.16);
        f1.connect(g1); ar6AudioRoute(g1, 0.42);

        var f2 = ctx.createOscillator(); f2.type = 'triangle'; f2.frequency.setValueAtTime(3240, st);
        var g2 = ctx.createGain(); g2.gain.setValueAtTime(0.055, st); g2.gain.exponentialRampToValueAtTime(0.001, st + 0.072);
        f2.connect(g2); ar6AudioRoute(g2, 0.32);

        f0.start(st); f0.stop(st + 0.35);
        f1.start(st); f1.stop(st + 0.18);
        f2.start(st); f2.stop(st + 0.09);
      }
      return true;
    }
  } catch (eAll) {}
  return false;
}

/* ---------------- 神光棒交互浮层样式 ---------------- */

function ensureSparkStyle(d) {
  try {
    if (!d || !d.head || d.getElementById(AR6_SPARK_STYLE_ID)) return;
    var s = d.createElement('style');
    s.id = AR6_SPARK_STYLE_ID;
    s.textContent = [
      '#' + AR6_SPARK_ID + '{position:fixed!important;inset:0!important;z-index:2147483644!important;display:flex;flex-direction:column;align-items:center;justify-content:center;background:radial-gradient(ellipse at 50% 45%,rgba(14,32,68,.84),rgba(3,7,18,.94));backdrop-filter:blur(4px);-webkit-backdrop-filter:blur(4px);opacity:0;transition:opacity .26s ease;touch-action:manipulation;user-select:none;}',
      '#' + AR6_SPARK_ID + '.show{opacity:1;}',
      '#' + AR6_SPARK_ID + ' .ar6-sp-stage{position:relative;display:flex;align-items:center;justify-content:center;}',
      '#' + AR6_SPARK_ID + ' .ar6-sp-ring{position:absolute;width:156px;height:156px;border-radius:9999px;border:2px solid rgba(252,211,77,.78);pointer-events:none;animation:ar6SpPulse 1.5s ease-out infinite;}',
      '#' + AR6_SPARK_ID + ' .ar6-sp-ring2{position:absolute;width:156px;height:156px;border-radius:9999px;border:1.5px solid rgba(125,211,252,.65);pointer-events:none;animation:ar6SpPulse 1.5s ease-out .55s infinite;}',
      '#' + AR6_SPARK_ID + ' .ar6-sp-wand{position:relative;width:156px;height:292px;padding:0;border:0;background:transparent;cursor:pointer;animation:ar6SpFloat 2.1s ease-in-out infinite;transition:transform .24s cubic-bezier(.22,1,.36,1),filter .24s ease;-webkit-tap-highlight-color:transparent;}',
      '#' + AR6_SPARK_ID + ' .ar6-sp-wand:hover{filter:drop-shadow(0 0 24px rgba(125,211,252,.82));transform:scale(1.04);}',
      '#' + AR6_SPARK_ID + ' .ar6-sp-layer{position:absolute;inset:0;width:100%;height:100%;object-fit:contain;pointer-events:none;}',
      '#' + AR6_SPARK_ID + ' .ar6-sp-lw{transform-origin:38.2% 37.5%;transform:rotate(25deg) translateX(5px);transition:transform .28s cubic-bezier(.16,1.52,.3,1),filter .2s ease;}',
      '#' + AR6_SPARK_ID + ' .ar6-sp-rw{transform-origin:61.8% 37.5%;transform:rotate(-25deg) translateX(-5px);transition:transform .28s cubic-bezier(.16,1.52,.3,1),filter .2s ease;}',
      '#' + AR6_SPARK_ID + ' .ar6-sp-wand.open{animation:none;transform:scale(1.18) translateY(-10px);filter:drop-shadow(0 0 42px rgba(254,240,138,1)) brightness(1.42);}',
      '#' + AR6_SPARK_ID + ' .ar6-sp-wand.open .ar6-sp-lw{transform:rotate(-16deg) translateX(-4px);filter:drop-shadow(0 0 20px rgba(254,240,138,.95));}',
      '#' + AR6_SPARK_ID + ' .ar6-sp-wand.open .ar6-sp-rw{transform:rotate(16deg) translateX(4px);filter:drop-shadow(0 0 20px rgba(254,240,138,.95));}',
      '#' + AR6_SPARK_ID + ' .ar6-sp-tip{margin-top:14px;padding:7px 18px;border-radius:9999px;font:700 12.5px/1.3 system-ui,sans-serif;letter-spacing:.12em;color:#FEF3C7;background:rgba(217,119,6,.28);border:1px solid rgba(252,211,77,.68);box-shadow:0 0 18px rgba(251,191,36,.28);transition:opacity .2s ease;}',
      '#' + AR6_SPARK_ID + ' .ar6-sp-skip{margin-top:12px;padding:6px 14px;border:0;background:transparent;color:rgba(148,163,184,.88);font:500 12px/1.2 system-ui,sans-serif;text-decoration:underline;cursor:pointer;}',
      '#ar6-sp-flash{position:fixed!important;inset:0!important;z-index:2147483646!important;background:#fff;opacity:0;pointer-events:none;transition:opacity .18s ease;}',
      '@keyframes ar6SpFloat{0%,100%{transform:translateY(0) scale(1)}50%{transform:translateY(-7px) scale(1.02)}}',
      '@keyframes ar6SpPulse{0%{transform:scale(.8);opacity:.92}100%{transform:scale(1.56);opacity:0}}'
    ].join('\n');
    d.head.appendChild(s);
  } catch (e) {}
}

function closeSparklence(restorePet) {
  try {
    var d = (typeof wandDoc === 'function') ? wandDoc() : DOC;
    var w = (d && d.defaultView) || HOST;
    for (var i = 0; i < AR6_SPARK_RUN.timers.length; i++) {
      try { if (w && w.clearTimeout) w.clearTimeout(AR6_SPARK_RUN.timers[i]); else clearTimeout(AR6_SPARK_RUN.timers[i]); } catch (e0) {}
    }
    AR6_SPARK_RUN.timers.length = 0;
    if (AR6_SPARK_RUN.raf) {
      try { if (w && w.cancelAnimationFrame) w.cancelAnimationFrame(AR6_SPARK_RUN.raf); } catch (e1) {}
      AR6_SPARK_RUN.raf = 0;
    }
    AR6_SPARK_RUN.active = false;
    AR6_SPARK_RUN.onCancel = null;
    if (d) {
      var ids = [AR6_SPARK_ID, AR6_SPFX_ID, 'ar6-sp-flash'];
      for (var j = 0; j < ids.length; j++) {
        var n = d.getElementById(ids[j]);
        if (n && n.parentNode) n.parentNode.removeChild(n);
      }
    }
    if (restorePet) {
      try {
        var ps = AR6_PET_STATE || (typeof petRead === 'function' ? petRead() : null);
        if (ps && ps.show && !ps.docked && d && !d.getElementById(AR6_AVATAR_ID) && typeof avatarMount === 'function') {
          avatarMount();
        }
      } catch (eRm) {}
      if (typeof avatarSetVisualState === 'function') {
        try { avatarSetVisualState('landed'); } catch (e2) {}
      }
      if (typeof syncPill === 'function') {
        try { syncPill(); } catch (e3) {}
      }
    }
  } catch (e) {}
}

function ar6SparkDelay(w, fn, ms) {
  var id = (w && typeof w.setTimeout === 'function' ? w.setTimeout : setTimeout)(function () {
    AR6_SPARK_RUN.timers = AR6_SPARK_RUN.timers.filter(function (x) { return x !== id; });
    if (!DISPOSED) { try { fn(); } catch (e) {} }
  }, ms);
  AR6_SPARK_RUN.timers.push(id);
  return id;
}

/* ---------------- 完整四幕：神光棒弹翼 → 垂直光柱白光剪影凝实 → 化光彗星飞掠 → 边缘光柱现身 ---------------- */

function triggerSparklenceSummon(opts) {
  opts = opts || {};
  var curSk = (typeof skinId === 'function') ? skinId() : 'ultra';
  if (curSk !== 'ultra' && typeof triggerSkinSummon === 'function') {
    return triggerSkinSummon(curSk, opts);
  }
  var d = (typeof wandDoc === 'function') ? wandDoc() : DOC;
  if (!d || !d.body || DISPOSED) return false;
  var w = d.defaultView || HOST;
  var p = AR6_PET_STATE || (typeof petRead === 'function' ? petRead() : null);
  var reduce = !!(cfg && cfg.rm) || !!(p && p.motion === 'off');
  if (!reduce) {
    try { if (w && w.matchMedia && w.matchMedia('(prefers-reduced-motion: reduce)').matches) reduce = true; } catch (eRM) {}
  }
  if (reduce) {
    if (typeof avatarSetVisualState === 'function') avatarSetVisualState('landed');
    return false;
  }

  closeSparklence(false);
  ensureSparkStyle(d);
  AR6_SPARK_RUN.active = true;

  /* 变身期间先隐去边缘立绘，待 Act 3 中央白光凝实登场 */
  if (typeof avatarSetVisualState === 'function') {
    try { avatarSetVisualState('hidden-for-summon'); } catch (eH) {}
  }

  /* 预先触发三层神光棒透明抠图 */
  var ov = d.createElement('div');
  ov.id = AR6_SPARK_ID;
  ov.setAttribute('data-ar6-spark', 'waiting');
  ov.innerHTML =
    '<div class="ar6-sp-stage">' +
      '<div class="ar6-sp-ring"></div><div class="ar6-sp-ring2"></div>' +
      '<button type="button" class="ar6-sp-wand" data-ar6-sp="fire" aria-label="点击神光棒变身">' +
        '<img class="ar6-sp-layer ar6-sp-lw" data-sp-img="spLwing" alt="">' +
        '<img class="ar6-sp-layer ar6-sp-rw" data-sp-img="spRwing" alt="">' +
        '<img class="ar6-sp-layer" data-sp-img="spBody" alt="">' +
      '</button>' +
    '</div>' +
    '<div class="ar6-sp-tip">✦ 点击神光棒 · 高举化光变身 ✦</div>' +
    '<button type="button" class="ar6-sp-skip" data-ar6-sp="skip">跳过演出</button>';
  d.body.appendChild(ov);

  var imgKeys = ['spBody', 'spLwing', 'spRwing'];
  for (var ik = 0; ik < imgKeys.length; ik++) {
    (function (k) {
      var el = ov.querySelector('[data-sp-img="' + k + '"]');
      if (!el) return;
      if (AR6_PET_ASSETS && AR6_PET_ASSETS[k]) el.src = AR6_PET_ASSETS[k].raw;
      if (typeof ar6MatteSprite === 'function') {
        ar6MatteSprite(k, function (u) { try { if (el && u) el.src = u; } catch (eI) {} });
      }
    })(imgKeys[ik]);
  }

  ar6SparkDelay(w, function () { if (ov) ov.classList.add('show'); }, 16);

  var wandBtn = ov.querySelector('[data-ar6-sp="fire"]');
  var skipBtn = ov.querySelector('[data-ar6-sp="skip"]');
  var tipEl = ov.querySelector('.ar6-sp-tip');
  var fired = false;

  function doSkip(ev) {
    try { if (ev) { ev.preventDefault(); ev.stopPropagation(); } } catch (eS) {}
    try { if (typeof ar6ArmSynthShield === 'function') ar6ArmSynthShield(); } catch (eSh) {}
    closeSparklence(true);
    if (typeof avatarSay === 'function') { try { avatarSay('open'); } catch (eSay) {} }
  }

  function doFire(ev) {
    try { if (ev) { ev.preventDefault(); ev.stopPropagation(); } } catch (eF) {}
    if (fired || !AR6_SPARK_RUN.active) return;
    fired = true;
    try { if (typeof ar6ArmSynthShield === 'function') ar6ArmSynthShield(); } catch (eSh2) {}
    ov.setAttribute('data-ar6-spark', 'firing');
    if (wandBtn) wandBtn.classList.add('open');
    if (tipEl) tipEl.style.opacity = '0';
    if (skipBtn) skipBtn.style.opacity = '0';

    /* 「神光棒变身 · 召唤/复位」触发变身时顺势收起主面板，让全屏四幕化光与边缘现身无遮挡呈现 */
    if (opts && opts.minimizeOnFire) {
      try {
        if (typeof minimized !== 'undefined' && !minimized) {
          minimized = true;
          if (cfg) cfg.docked = false;
          if (typeof MORE_OPEN !== 'undefined') MORE_OPEN = false;
          if (typeof syncMin === 'function') syncMin();
          if (typeof render === 'function') render();
        }
      } catch (eMinF) {}
    }

    /* 播放所选 1996 拟真特摄音效（默认静音，开启音效后生效） */
    ar6SfxPlay(ar6SfxPreset(), false);

    /* 硬性总兜底看门狗：无论高刷屏/后台切屏/低电量 RAF 降频，3.5s 后强制确保落位且绝不隐身 */
    ar6SparkDelay(w, function () {
      if (AR6_SPARK_RUN.active) closeSparklence(true);
    }, 3500);

    /* 启动时间增量驱动（60/90/120/144Hz 统一速率）全屏演出画布 */
    var vpBox = (typeof petViewport === 'function') ? petViewport(w, d) : { w: (w && w.innerWidth) || 360, h: (w && w.innerHeight) || 720 };
    var vw = vpBox.w, vh = vpBox.h;
    var cx = vw / 2, cy = vh / 2;
    var cv = null, ctx = null;
    try {
      cv = d.createElement('canvas');
      cv.id = AR6_SPFX_ID;
      var dpr = Math.min(2, (w && w.devicePixelRatio) || 1);
      cv.width = Math.max(1, Math.floor(vw * dpr));
      cv.height = Math.max(1, Math.floor(vh * dpr));
      cv.style.cssText = 'position:fixed!important;inset:0!important;width:100vw!important;height:100vh!important;z-index:2147483640!important;pointer-events:none!important;';
      d.body.appendChild(cv);
      ctx = cv.getContext && cv.getContext('2d');
      if (ctx) ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    } catch (eCv) { ctx = null; }

    var flash = d.createElement('div');
    flash.id = 'ar6-sp-flash';
    d.body.appendChild(flash);

    var nowFn = function () { return (w && w.performance && w.performance.now) ? w.performance.now() : Date.now(); };
    var parts = [];
    var vortex = { start: nowFn(), dur: 940 };
    var pillar = null;
    var comet = null;
    var cometLaunched = false;
    var cometDone = false;
    var lastFrameAt = nowFn();
    var curTier = (typeof petCurrentForm === 'function') ? petCurrentForm() : 'multi';
    var palMap = {
      multi: ['#38bdf8', '#e0f2fe', '#fde68a', '#ffffff'],
      strong: ['#fb7185', '#fde047', '#f43f5e', '#ffffff'],
      supreme: ['#fef08a', '#f59e0b', '#ffffff'],
      noa: ['#ffffff', '#bae6fd', '#fde68a', '#c4b5fd'],
      abyss: ['#ff2e55', '#9f1239', '#fda4af', '#ffffff']
    };
    var pal = palMap[curTier] || palMap.multi;

    function ensureLoop() {
      if (!AR6_SPARK_RUN.active || DISPOSED || AR6_SPARK_RUN.raf) return;
      if (ctx && w && typeof w.requestAnimationFrame === 'function') {
        lastFrameAt = nowFn();
        AR6_SPARK_RUN.raf = w.requestAnimationFrame(drawFrame);
      }
    }

    function burst(bx, by, n) {
      for (var i = 0; i < n; i++) {
        var ang = Math.random() * Math.PI * 2;
        var spd = 2.2 + Math.random() * 8.0;
        parts.push({
          x: bx, y: by,
          vx: Math.cos(ang) * spd, vy: Math.sin(ang) * spd,
          r: 1.8 + Math.random() * 3.4,
          life: 0, max: 520 + Math.random() * 440,
          col: pal[Math.floor(Math.random() * pal.length)]
        });
      }
      ensureLoop();
    }

    function finishComet(tgtPos) {
      if (cometDone || !AR6_SPARK_RUN.active || DISPOSED) return;
      cometDone = true;
      comet = null;
      pillar = { x: tgtPos.x, start: nowFn(), dur: 520, w: 72 };
      burst(tgtPos.x, tgtPos.y, 44);
      ensureLoop();
      if (typeof avatarSetVisualState === 'function') {
        avatarSetVisualState('edge-materialize');
      }
      ar6SparkDelay(w, function () {
        closeSparklence(true);
        try {
          if (typeof minimized !== 'undefined' && !minimized && typeof banner === 'function') {
            banner('✦ 3D 迪迦已变身落位边缘阵位（收起面板即可自由拖动，双击立绘随时唤起主面板）', 'ok');
          }
        } catch (eBnLand) {}
      }, 620);
    }

    function drawFrame() {
      AR6_SPARK_RUN.raf = 0;
      if (!AR6_SPARK_RUN.active || DISPOSED) return;
      var tNow = nowFn();
      var dt = Math.max(4, Math.min(50, tNow - lastFrameAt));
      lastFrameAt = tNow;
      var dtScale = dt / 16.6667;
      if (ctx) {
        ctx.clearRect(0, 0, vw, vh);
        if (vortex) {
          var vp = (tNow - vortex.start) / vortex.dur;
          if (vp >= 1) vortex = null;
          else {
            var maxR = Math.hypot(cx, cy) * 1.12;
            ctx.save();
            ctx.translate(cx, cy);
            for (var bi = 0; bi < 16; bi++) {
              var ang = (bi / 16) * Math.PI * 2 + vp * 6.4;
              var gr = ctx.createLinearGradient(0, 0, Math.cos(ang) * maxR, Math.sin(ang) * maxR);
              var cc = bi % 3 === 0 ? 'rgba(254,240,138,' : (bi % 3 === 1 ? 'rgba(125,211,252,' : 'rgba(232,121,249,');
              var al = Math.sin(vp * Math.PI) * 0.56;
              gr.addColorStop(0, 'rgba(255,255,255,' + (al * 1.35) + ')');
              gr.addColorStop(0.45, cc + al + ')');
              gr.addColorStop(1, cc + '0)');
              ctx.fillStyle = gr;
              ctx.beginPath();
              ctx.moveTo(0, 0);
              ctx.arc(0, 0, maxR * (0.28 + vp * 0.9), ang, ang + 0.15);
              ctx.closePath();
              ctx.fill();
            }
            var delays = [0, 0.16];
            for (var di = 0; di < delays.length; di++) {
              var rp = Math.max(0, (vp - delays[di]) / (1 - delays[di]));
              if (rp > 0) {
                ctx.strokeStyle = 'rgba(254,249,195,' + ((1 - rp) * 0.92) + ')';
                ctx.lineWidth = Math.max(1, (1 - rp) * 9);
                ctx.beginPath();
                ctx.arc(0, 0, rp * maxR * 0.88, 0, Math.PI * 2);
                ctx.stroke();
              }
            }
            ctx.restore();
          }
        }
        if (pillar) {
          var pp = (tNow - pillar.start) / pillar.dur;
          if (pp >= 1) pillar = null;
          else {
            var pa = Math.sin(pp * Math.PI);
            var pw = pillar.w * (1.25 - pp * 0.45);
            var pg = ctx.createLinearGradient(pillar.x - pw, 0, pillar.x + pw, 0);
            pg.addColorStop(0, 'rgba(255,255,255,0)');
            pg.addColorStop(0.32, 'rgba(125,211,252,' + (pa * 0.55) + ')');
            pg.addColorStop(0.5, 'rgba(255,255,255,' + (pa * 0.95) + ')');
            pg.addColorStop(0.68, 'rgba(253,230,138,' + (pa * 0.55) + ')');
            pg.addColorStop(1, 'rgba(255,255,255,0)');
            ctx.fillStyle = pg;
            ctx.fillRect(pillar.x - pw, 0, pw * 2, vh);
          }
        }
        if (comet) {
          var ct = Math.min(1, Math.max(0, (tNow - comet.start) / comet.dur));
          var ce = ct < 0.5 ? 2 * ct * ct : 1 - Math.pow(-2 * ct + 2, 2) / 2;
          var u = 1 - ce;
          var x = u*u*u*comet.sx + 3*u*u*ce*comet.c1x + 3*u*ce*ce*comet.c2x + ce*ce*ce*comet.ex;
          var y = u*u*u*comet.sy + 3*u*u*ce*comet.c1y + 3*u*ce*ce*comet.c2y + ce*ce*ce*comet.ey;
          comet.trail.push({ x: x, y: y });
          if (comet.trail.length > 24) comet.trail.shift();
          for (var sk = 0; sk < 2; sk++) {
            parts.push({
              x: x + (Math.random() - 0.5) * 14, y: y + (Math.random() - 0.5) * 14,
              vx: (Math.random() - 0.5) * 1.8, vy: (Math.random() - 0.5) * 1.8,
              r: 1.6 + Math.random() * 2.6, life: 0, max: 360,
              col: sk === 0 ? '#ffffff' : pal[0]
            });
          }
          for (var ti = 1; ti < comet.trail.length; ti++) {
            var fr = ti / comet.trail.length;
            ctx.strokeStyle = 'rgba(186,230,253,' + (fr * 0.85) + ')';
            ctx.lineWidth = fr * 20;
            ctx.lineCap = 'round';
            ctx.beginPath();
            ctx.moveTo(comet.trail[ti - 1].x, comet.trail[ti - 1].y);
            ctx.lineTo(comet.trail[ti].x, comet.trail[ti].y);
            ctx.stroke();
            ctx.strokeStyle = 'rgba(255,255,255,' + fr + ')';
            ctx.lineWidth = fr * 8;
            ctx.beginPath();
            ctx.moveTo(comet.trail[ti - 1].x, comet.trail[ti - 1].y);
            ctx.lineTo(comet.trail[ti].x, comet.trail[ti].y);
            ctx.stroke();
          }
          var og = ctx.createRadialGradient(x, y, 2, x, y, 34);
          og.addColorStop(0, '#ffffff');
          og.addColorStop(0.35, 'rgba(254,240,138,0.95)');
          og.addColorStop(0.7, 'rgba(56,189,248,0.45)');
          og.addColorStop(1, 'rgba(56,189,248,0)');
          ctx.fillStyle = og;
          ctx.beginPath();
          ctx.arc(x, y, 34, 0, Math.PI * 2);
          ctx.fill();
          if (ct >= 1) {
            var cbDone = comet.onDone;
            comet = null;
            if (cbDone) cbDone();
          }
        }
        for (var pi = parts.length - 1; pi >= 0; pi--) {
          var pt = parts[pi];
          pt.life += dt;
          if (pt.life >= pt.max) { parts.splice(pi, 1); continue; }
          pt.x += pt.vx * dtScale; pt.y += pt.vy * dtScale;
          ctx.globalAlpha = Math.sin((pt.life / pt.max) * Math.PI) * 0.88;
          ctx.fillStyle = pt.col;
          ctx.beginPath();
          ctx.arc(pt.x, pt.y, pt.r, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.globalAlpha = 1;
      }
      if (AR6_SPARK_RUN.active && (!cometLaunched || vortex || pillar || comet || parts.length > 0)) {
        ensureLoop();
      }
    }

    burst(cx, cy, 78);
    ensureLoop();

    /* 400ms 白光过曝瞬间 */
    ar6SparkDelay(w, function () { if (flash) flash.style.opacity = '0.9'; }, 400);

    /* Act 3 (580ms): 撤去神光棒，屏幕中央劈出垂直圣光柱 + 白光剪影破光凝实登场 */
    ar6SparkDelay(w, function () {
      if (ov && ov.parentNode) ov.parentNode.removeChild(ov);
      if (flash) flash.style.opacity = '0';
      pillar = { x: cx, start: nowFn(), dur: 760, w: 120 };
      burst(cx, cy, 42);
      ensureLoop();
      if (typeof avatarSetVisualState === 'function') {
        avatarSetVisualState('center-rise');
      }
    }, 580);

    /* Act 4 (1500ms): 迪迦坍缩化光彗星飞向边缘 + 边缘迷你光柱凝实现身 */
    ar6SparkDelay(w, function () {
      if (typeof avatarSetVisualState === 'function') {
        avatarSetVisualState('dissolve-to-orb');
      }
      burst(cx, cy, 36);
      ensureLoop();
      ar6SparkDelay(w, function () {
        if (!AR6_SPARK_RUN.active || DISPOSED) return;
        cometLaunched = true;
        ar6SfxPlay('whoosh', false);
        var tgt = (typeof avatarEdgeTarget === 'function') ? avatarEdgeTarget() : { x: vw - 80, y: vh * 0.56 };
        if (!ctx || !w || typeof w.requestAnimationFrame !== 'function') {
          /* 无 Canvas 或无 RAF 环境（如沙箱/低配 WebView）直接触发边缘现身并安全落位 */
          ar6SparkDelay(w, function () { finishComet(tgt); }, 60);
          return;
        }
        comet = {
          start: nowFn(),
          dur: 460,
          sx: cx, sy: cy,
          c1x: cx + (tgt.x - cx) * 0.28, c1y: Math.max(40, cy - 120),
          c2x: cx + (tgt.x - cx) * 0.85, c2y: Math.max(40, tgt.y - 80),
          ex: tgt.x, ey: tgt.y,
          trail: [],
          onDone: function () { finishComet(tgt); }
        };
        ensureLoop();
        /* 彗星抵达墙钟兜底：即使 RAF 被节流/挂起，超时依然 100% 完成边缘现身与落位 */
        ar6SparkDelay(w, function () { finishComet(tgt); }, comet.dur + 220);
      }, 200);
    }, 1500);
  }

  /* 移动端 pointerup + 桌面 click 统一防连点绑定 */
  if (wandBtn) {
    wandBtn.addEventListener('pointerup', doFire);
    wandBtn.addEventListener('click', doFire);
  }
  if (skipBtn) {
    skipBtn.addEventListener('pointerup', doSkip);
    skipBtn.addEventListener('click', doSkip);
  }
  ov.addEventListener('click', function (ev) {
    if (fired) return;
    if (ev && ev.target === ov) doSkip(ev);
  });

  return true;
}

/* ---------------- Type Change 瞬时画布特效（诺亚十字星芒 / 深渊血红雷电裂隙 / 粒子环） ---------------- */

function ar6PlayTypeChangeFx(cx, cy, formKey) {
  try {
    var d = (typeof wandDoc === 'function') ? wandDoc() : DOC;
    var w = (d && d.defaultView) || HOST;
    if (!d || !d.body || !w || DISPOSED) return;
    if ((cfg && cfg.rm) || (AR6_PET_STATE && AR6_PET_STATE.motion === 'off')) return;
    if (typeof w.requestAnimationFrame !== 'function') return;

    var old = d.getElementById('ar6-tcfx');
    if (old && old.parentNode) old.parentNode.removeChild(old);
    if (AR6_TC_RAF && w.cancelAnimationFrame) { w.cancelAnimationFrame(AR6_TC_RAF); AR6_TC_RAF = 0; }

    var vpTc = (typeof petViewport === 'function') ? petViewport(w, d) : { w: w.innerWidth || 360, h: w.innerHeight || 720 };
    var vw = vpTc.w, vh = vpTc.h;
    var cv = d.createElement('canvas');
    cv.id = 'ar6-tcfx';
    var dpr = Math.min(2, w.devicePixelRatio || 1);
    cv.width = Math.max(1, Math.floor(vw * dpr));
    cv.height = Math.max(1, Math.floor(vh * dpr));
    cv.style.cssText = 'position:fixed!important;inset:0!important;width:100vw!important;height:100vh!important;z-index:2147483001!important;pointer-events:none!important;';
    d.body.appendChild(cv);
    var ctx = cv.getContext && cv.getContext('2d');
    if (!ctx) { cv.remove(); return; }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    var palMap = {
      multi: ['#38bdf8', '#e0f2fe', '#ffffff'],
      strong: ['#fb7185', '#fde047', '#f43f5e'],
      supreme: ['#fef08a', '#f59e0b', '#ffffff'],
      noa: ['#ffffff', '#bae6fd', '#fde68a', '#c4b5fd'],
      abyss: ['#ff2e55', '#9f1239', '#fda4af']
    };
    var pal = palMap[formKey] || palMap.multi;
    var parts = [];
    for (var i = 0; i < 42; i++) {
      var a = Math.random() * Math.PI * 2, s = 1.6 + Math.random() * 6.4;
      parts.push({ x: cx, y: cy, vx: Math.cos(a) * s, vy: Math.sin(a) * s, r: 1.5 + Math.random() * 2.8, life: 0, max: 460 + Math.random() * 260, col: pal[Math.floor(Math.random() * pal.length)] });
    }
    var bolts = [];
    if (formKey === 'abyss') {
      for (var b = 0; b < 5; b++) {
        var ba = (b / 5) * Math.PI * 2 + Math.random() * 0.5;
        var pts = [{ x: cx, y: cy }], px = cx, py = cy;
        for (var k = 1; k <= 5; k++) {
          px += Math.cos(ba) * 24 + (Math.random() - 0.5) * 24;
          py += Math.sin(ba) * 24 + (Math.random() - 0.5) * 24;
          pts.push({ x: px, y: py });
        }
        bolts.push(pts);
      }
    }
    var start = (w.performance && w.performance.now) ? w.performance.now() : Date.now();
    var lastAt = start;
    var dur = 680;
    var tcDone = false;
    function endTc() {
      if (tcDone) return;
      tcDone = true;
      if (AR6_TC_RAF && w.cancelAnimationFrame) { try { w.cancelAnimationFrame(AR6_TC_RAF); } catch (eC) {} }
      AR6_TC_RAF = 0;
      try { if (cv && cv.parentNode) cv.parentNode.removeChild(cv); } catch (eR) {}
    }
    try { (w.setTimeout || setTimeout)(endTc, dur + 260); } catch (eT) {}
    function step() {
      if (tcDone || DISPOSED) { endTc(); return; }
      var now = (w.performance && w.performance.now) ? w.performance.now() : Date.now();
      var dt = Math.max(4, Math.min(50, now - lastAt));
      lastAt = now;
      var dtScale = dt / 16.6667;
      var p = (now - start) / dur;
      if (p >= 1) { endTc(); return; }
      ctx.clearRect(0, 0, vw, vh);
      if (formKey === 'noa') {
        var sa = Math.sin(p * Math.PI), sl = 155 * Math.sin(p * Math.PI * 0.72);
        ctx.save(); ctx.translate(cx, cy);
        ctx.fillStyle = 'rgba(255,255,255,' + (sa * 0.92) + ')';
        for (var ri = 0; ri < 2; ri++) {
          ctx.save(); ctx.rotate(ri * Math.PI / 2);
          ctx.beginPath(); ctx.moveTo(-sl, 0); ctx.quadraticCurveTo(0, -9 * sa, sl, 0);
          ctx.quadraticCurveTo(0, 9 * sa, -sl, 0); ctx.fill(); ctx.restore();
        }
        ctx.restore();
      }
      if (bolts.length) {
        ctx.save();
        ctx.strokeStyle = 'rgba(255,46,85,' + (1 - p) + ')';
        ctx.shadowColor = '#ff2e55'; ctx.shadowBlur = 12; ctx.lineWidth = 2.2;
        for (var bi = 0; bi < bolts.length; bi++) {
          ctx.beginPath();
          for (var pi = 0; pi < bolts[bi].length; pi++) {
            if (pi === 0) ctx.moveTo(bolts[bi][pi].x, bolts[bi][pi].y);
            else ctx.lineTo(bolts[bi][pi].x, bolts[bi][pi].y);
          }
          ctx.stroke();
        }
        ctx.restore();
      }
      for (var j = parts.length - 1; j >= 0; j--) {
        var pt = parts[j]; pt.life += dt;
        if (pt.life >= pt.max) { parts.splice(j, 1); continue; }
        pt.x += pt.vx * dtScale; pt.y += pt.vy * dtScale;
        ctx.globalAlpha = Math.sin((pt.life / pt.max) * Math.PI) * 0.88;
        ctx.fillStyle = pt.col;
        ctx.beginPath(); ctx.arc(pt.x, pt.y, pt.r, 0, Math.PI * 2); ctx.fill();
      }
      ctx.globalAlpha = 1;
      AR6_TC_RAF = w.requestAnimationFrame(step);
    }
    AR6_TC_RAF = w.requestAnimationFrame(step);
  } catch (e) {}
}
