/* ============================================================
 * core.js — 称号卡核心
 *   坐标系 / 调色 / 排版自适应 / 模块注册表 / 静态底图与动画帧合成
 * 卡片逻辑尺寸固定 560×160，按 S 倍率矢量重绘（非位图放大）。
 * ============================================================ */
(function (global) {
  'use strict';

  var W = 560, H = 160;
  var FONT = '"Microsoft YaHei","Noto Sans SC","PingFang SC","Source Han Sans SC",sans-serif';

  /* ---------------- 基础工具 ---------------- */
  function mulberry32(a) {
    return function () {
      a |= 0; a = a + 0x6D2B79F5 | 0;
      var t = Math.imul(a ^ a >>> 15, 1 | a);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }
  function h2r(h) {
    h = String(h).replace('#', '');
    if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
    return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
  }
  function toArr(c) { return Array.isArray(c) ? c : h2r(c); }
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function css(c, a) {
    c = toArr(c);
    if (a === undefined) return 'rgb(' + (c[0] | 0) + ',' + (c[1] | 0) + ',' + (c[2] | 0) + ')';
    return 'rgba(' + (c[0] | 0) + ',' + (c[1] | 0) + ',' + (c[2] | 0) + ',' + a + ')';
  }
  function mixArr(a, b, t) {
    var A = toArr(a), B = toArr(b);
    return [A[0] + (B[0] - A[0]) * t, A[1] + (B[1] - A[1]) * t, A[2] + (B[2] - A[2]) * t];
  }
  function mix(a, b, t) { return css(mixArr(a, b, t)); }
  function newCanvas(w, h) {
    var c = document.createElement('canvas');
    c.width = Math.max(1, Math.round(w));
    c.height = Math.max(1, Math.round(h));
    return c;
  }
  function roundRect(ctx, x, y, w, h, r) {
    var rr = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + rr, y);
    ctx.lineTo(x + w - rr, y); ctx.quadraticCurveTo(x + w, y, x + w, y + rr);
    ctx.lineTo(x + w, y + h - rr); ctx.quadraticCurveTo(x + w, y + h, x + w - rr, y + h);
    ctx.lineTo(x + rr, y + h); ctx.quadraticCurveTo(x, y + h, x, y + h - rr);
    ctx.lineTo(x, y + rr); ctx.quadraticCurveTo(x, y, x + rr, y);
    ctx.closePath();
  }
  function diamond(ctx, cx, cy, r) {
    ctx.beginPath();
    ctx.moveTo(cx, cy - r); ctx.lineTo(cx + r, cy); ctx.lineTo(cx, cy + r); ctx.lineTo(cx - r, cy);
    ctx.closePath();
  }
  function hexPath(ctx, cx, cy, r, sides) {
    sides = sides || 6;
    ctx.beginPath();
    for (var i = 0; i < sides; i++) {
      var a = -Math.PI / 2 + i * Math.PI * 2 / sides;
      var px = cx + Math.cos(a) * r, py = cy + Math.sin(a) * r;
      if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    }
    ctx.closePath();
  }

  var _mctx = null;
  function measureCtx() {
    if (!_mctx) _mctx = newCanvas(8, 8).getContext('2d');
    return _mctx;
  }

  var _segmenter = null, _segmenterReady = false;
  function graphemes(text) {
    text = String(text == null ? '' : text);
    if (!_segmenterReady) {
      _segmenterReady = true;
      try { if (global.Intl && global.Intl.Segmenter) _segmenter = new global.Intl.Segmenter(undefined, { granularity: 'grapheme' }); }
      catch (e) { _segmenter = null; }
    }
    if (_segmenter) return Array.from(_segmenter.segment(text), function (part) { return part.segment; });
    // 保底按完整代理对处理，并合并常用组合符、肤色、旗帜与 ZWJ emoji。
    var result = [], regional = 0;
    Array.from(text).forEach(function (ch) {
      var cp = ch.codePointAt(0), previous = result.length ? result[result.length - 1] : '';
      var mark = cp >= 0x300 && cp <= 0x36f || cp >= 0x1ab0 && cp <= 0x1aff || cp >= 0x1dc0 && cp <= 0x1dff || cp >= 0x20d0 && cp <= 0x20ff || cp >= 0xfe00 && cp <= 0xfe0f || cp >= 0x1f3fb && cp <= 0x1f3ff || cp >= 0xe0100 && cp <= 0xe01ef;
      var isRegional = cp >= 0x1f1e6 && cp <= 0x1f1ff;
      if (previous && (mark || cp === 0x200d || previous.charCodeAt(previous.length - 1) === 0x200d || isRegional && regional % 2 === 1)) result[result.length - 1] += ch;
      else result.push(ch);
      regional = isRegional ? regional + 1 : 0;
    });
    return result;
  }

  /* ---------------- 模块注册表 ---------------- */
  var CATS = [
    { id: 'layout', label: '构图', single: true, hint: '主副标题的位置、层级与阅读顺序' },
    { id: 'bg', label: '背景', single: true, hint: '整张卡的底层（渐变 / 星空 / 纸面 / 城市剪影）' },
    { id: 'plate', label: '底板', single: true, hint: '称号牌主体材质' },
    { id: 'frame', label: '边框', single: true, hint: '描边、角标、警戒条等结构装饰' },
    { id: 'badge', label: '徽记', single: true, hint: '左侧阶徽 / 圆章 / 编号牌' },
    { id: 'text', label: '字材', single: true, hint: '标题的材质处理' },
    { id: 'deco', label: '装饰', single: false, hint: '可任意叠加的小构件' },
    { id: 'motion', label: '动效', single: false, hint: 'GIF 动画层，可任意叠加' }
  ];
  var REG = { layout: {}, bg: {}, plate: {}, frame: {}, badge: {}, text: {}, deco: {}, motion: {} };
  var REG_ORDER = { layout: [], bg: [], plate: [], frame: [], badge: [], text: [], deco: [], motion: [] };

  function register(cat, def) {
    if (!REG[cat]) throw new Error('unknown category ' + cat);
    def.cat = cat;
    REG[cat][def.id] = def;
    REG_ORDER[cat].push(def.id);
    return def;
  }
  function get(cat, id) { return (REG[cat] || {})[id] || null; }
  function list(cat) {
    return REG_ORDER[cat].map(function (id) { return REG[cat][id]; });
  }

  function themeOf(stack) {
    var id = stack && stack.theme || 'default';
    if (global.TG && global.TG.theme) return global.TG.theme(id);
    return {
      id: 'default', name: '都市默认', accent: '#ffd75e', secondary: '#5aa9ff',
      ink: '#07101a', line: 1, radius: 12, glow: 1, density: 1, motion: 1
    };
  }

  /* ---------------- 调色 ---------------- */
  function palette(item, stack) {
    var base = item.color || '#8fa0b8';
    var hot = (stack && stack.hot) || base;
    return {
      base: base,
      baseRgb: h2r(base),
      hot: hot,
      light: mixArr(base, '#ffffff', 0.58),
      pale: mixArr(base, '#ffffff', 0.84),
      deep: mixArr(base, '#04070d', 0.62),
      shade: mixArr(base, '#04070d', 0.86),
      text: '#e8eef8',
      ink: [8, 12, 20],
      warm: '#ffd75e',
      theme: themeOf(stack)
    };
  }

  /* ---------------- 排版（自适应字号） ---------------- */
  /* 右侧装饰占位：避免标题/副行压在印章、条码这些右侧构件上 */
  var RIGHT_RESERVE = {
    seal: 92, barcode: 116, strip: 18, stream: 14, gears: 8, roman: 40,
    warning: 72, stamp: 80, radar: 50, counter: 62, hexcode: 54, halftone: 44,
    signal: 0, coords: 0, chip: 0, tapecorner: 0, ruler: 0, rule: 0, fold: 0,
    blink: 0, orbit: 0, eq: 0, marching: 0, status: 0, typing: 0, scanbar: 0,
    thermo: 30, filmhole: 12, ticker: 0
  };
  function rightReserve(stack) {
    var r = 0;
    (stack.decos || []).forEach(function (id) {
      var mod = get('deco', id);
      var reserve = mod && mod.reserveRight;
      var params = global.TG && global.TG.moduleParams;
      if (mod && typeof mod.reserveRightFor === 'function' && params) reserve = mod.reserveRightFor(params.values(stack, 'deco', id));
      r = Math.max(r, RIGHT_RESERVE[id] || 0, Number(reserve) || 0);
    });
    return r;
  }
  function plateContent(stack, plate) {
    if (!plate) return null;
    var params = global.TG && global.TG.moduleParams;
    if (typeof plate.contentFor === 'function' && params) return plate.contentFor(params.values(stack, 'plate', plate.id));
    return plate.content;
  }

  function fitText(ctx, text, width) {
    text = String(text || '');
    if (ctx.measureText(text).width <= width) return text;
    var chars = graphemes(text), lo = 0, hi = chars.length;
    if (ctx.measureText('…').width > width) return '';
    while (lo < hi) {
      var mid = Math.ceil((lo + hi) / 2);
      if (ctx.measureText(chars.slice(0, mid).join('') + '…').width <= width) lo = mid;
      else hi = mid - 1;
    }
    return chars.slice(0, lo).join('') + '…';
  }

  /* 有固定边界的小标签：保持短字原字号，过长先缩小，再按完整字符省略。
     调用方先设置 font / letterSpacing；测量与最终绘制始终使用同一状态。 */
  function fitLabel(ctx, text, width, minSize) {
    text = String(text == null ? '' : text);
    width = Math.max(0, Number(width) || 0);
    if (ctx.measureText(text).width <= width) return text;
    var original = ctx.font, match = /([0-9]*\.?[0-9]+)px/.exec(original);
    if (match) {
      var size = Number(match[1]);
      var minimum = Math.min(size, Math.max(1, Number(minSize) || size));
      while (size > minimum) {
        size = Math.max(minimum, size - 1);
        ctx.font = original.replace(match[0], size + 'px');
        if (ctx.measureText(text).width <= width) return text;
      }
    }
    return fitText(ctx, text, width);
  }

  function layout(item, stack) {
    stack = stack || {};
    var main = String(item.main || '');
    var suffix = String(item.suffix || '');
    var fullMain = main, fullSuffix = suffix;
    var textModule = get('text', stack.text);
    var face = textModule && textModule.font || FONT;
    var hasBadge = stack.badge && stack.badge !== 'none';
    var layoutMod = get('layout', stack.layout || 'inline');
    if (layoutMod && typeof layoutMod.arrange === 'function') return arrangedLayout(item, stack, face, layoutMod);
    var x0 = hasBadge ? 106 : 46;
    var x1 = W - 26 - rightReserve(stack);
    var plate = get('plate', stack.plate), content = plateContent(stack, plate);
    if (content) { x0 = Math.max(x0, content.left); x1 = Math.min(x1, content.right); }
    if (x1 - x0 < 230) x1 = x0 + 230;
    var region = x1 - x0;
    var m = measureCtx();
    var fA = 47, fB = 39;
    var separator = !!(main && suffix);
    var gap1 = 15, dia = 11, gap2 = 15;
    var wA = 0, wB = 0, total = 0;
    for (var pass = 0; pass < 26; pass++) {
      var ratio = fA / 47;
      fB = Math.max(18, 39 * ratio);
      gap1 = gap2 = Math.max(7, 15 * ratio);
      dia = Math.max(6, 11 * ratio);
      m.font = '700 ' + fA + 'px ' + face; wA = m.measureText(main).width;
      m.font = '700 ' + fB + 'px ' + face; wB = m.measureText(suffix).width;
      total = wA + wB + (separator ? gap1 + dia + gap2 : 0);
      if (total <= region - 1 || fA <= 22) break;
      fA = Math.max(22, fA - 1);
    }
    if (total > region - 1) {
      var available = region - 1 - (separator ? gap1 + dia + gap2 : 0);
      var suffixBudget = main ? Math.min(wB, available * 0.42) : available;
      m.font = '700 ' + fB + 'px ' + face;
      suffix = fitText(m, suffix, suffixBudget);
      wB = m.measureText(suffix).width;
      m.font = '700 ' + fA + 'px ' + face;
      main = fitText(m, main, Math.max(0, available - wB));
      wA = m.measureText(main).width;
      total = wA + wB + (separator ? gap1 + dia + gap2 : 0);
    }
    var cx = (x0 + x1) / 2;
    var L = {
      main: main, suffix: suffix, fullMain: fullMain, fullSuffix: fullSuffix,
      font: face, separator: separator,
      truncated: main !== fullMain || suffix !== fullSuffix,
      fA: fA, fB: fB, wA: wA, wB: wB, dia: dia,
      total: total, region: region,
      ax: Math.round(cx - total / 2),
      baseline: 98,
      diaX: 0, bx: 0
    };
    L.diaX = L.ax + wA + (separator ? gap1 + dia / 2 : 0);
    L.bx = L.ax + wA + (separator ? gap1 + dia + gap2 : 0);
    L.bbox = { x: L.ax - 18, y: L.baseline - 60, w: total + 36, h: 80 };
    L.centerX = cx;
    L.id = 'inline';
    L.mainBaseline = L.suffixBaseline = L.baseline;
    L.badge = { x: 54, y: 80, scale: 1, visible: !!hasBadge };
    L.lanes = { bottom: { x: 160, y: 148, w: 260 } };
    return L;
  }

  /* 新构图以独立文字段排版。旧横排不走此分支，保留已有字号和像素位置。 */
  function arrangedLayout(item, stack, face, mod) {
    var plate = get('plate', stack.plate), c = plateContent(stack, plate) || {};
    var content = { left: Math.max(30, c.left || 30), right: Math.min(c.right || 530, W - 26 - rightReserve(stack)),
      top: Math.max(34, c.top || 34), bottom: Math.min(132, c.bottom || 132) };
    var spec = mod.arrange(item, stack, content), parts = [], m = measureCtx();
    var fullMain = String(item.main || ''), fullSuffix = String(item.suffix || '');
    var shown = { main: '', suffix: '' };
    (spec.slots || []).forEach(function (slot) {
      var original = slot.part === 'main' ? fullMain : fullSuffix;
      if (!original) return;
      var size = slot.size, text = original, width = Math.max(1, slot.width);
      if (slot.vertical) {
        var chars = graphemes(text), maxCount = Math.max(1, Math.floor(slot.height / (slot.minSize + 3)));
        if (chars.length > maxCount) chars = chars.slice(0, Math.max(0, maxCount - 1)).concat('…');
        size = Math.min(size, Math.max(slot.minSize, slot.height / Math.max(1, chars.length) - 3));
        var step = size + 3, top = slot.top + (slot.height - chars.length * step) / 2;
        text = chars.join('');
        chars.forEach(function (ch, i) {
          m.font = '700 ' + size + 'px ' + face;
          var fit = fitText(m, ch, width), w = m.measureText(fit).width;
          var x = slot.x + (width - w) / 2, baseline = top + size + i * step;
          parts.push({ part: slot.part, text: fit, x: x, baseline: baseline, size: size, w: w,
            bounds: { x: x - 12, y: baseline - size - 8, w: w + 24, h: size + 24 } });
        });
      } else {
        m.font = '700 ' + size + 'px ' + face;
        text = fitLabel(m, text, width, slot.minSize || 18);
        size = Number(/([0-9.]+)px/.exec(m.font)[1]);
        var w = m.measureText(text).width, x = slot.x;
        if (slot.align === 'center') x += (width - w) / 2;
        if (slot.align === 'right') x += width - w;
        parts.push({ part: slot.part, text: text, x: x, baseline: slot.baseline, size: size, w: w,
          bounds: { x: x - 14, y: slot.baseline - size - 8, w: w + 28, h: size + 26 } });
      }
      shown[slot.part] += text;
    });
    var first = parts.filter(function (p) { return p.part === 'main'; })[0];
    var second = parts.filter(function (p) { return p.part === 'suffix'; })[0];
    var points = parts.length ? parts : [{ x: content.left, baseline: 90, size: 0, w: 0,
      bounds: { x: content.left, y: 70, w: 1, h: 1 } }];
    var minX = Math.max(0, Math.min.apply(null, points.map(function (p) { return p.bounds.x; })));
    var minY = Math.max(0, Math.min.apply(null, points.map(function (p) { return p.bounds.y; })));
    var maxX = Math.min(W, Math.max.apply(null, points.map(function (p) { return p.bounds.x + p.bounds.w; })));
    var maxY = Math.min(H, Math.max.apply(null, points.map(function (p) { return p.bounds.y + p.bounds.h; })));
    return {
      id: mod.id, parts: parts, font: face, main: shown.main, suffix: shown.suffix, fullMain: fullMain, fullSuffix: fullSuffix,
      separator: false, truncated: shown.main !== fullMain || shown.suffix !== fullSuffix,
      ax: first ? first.x : content.left, bx: second ? second.x : content.left,
      fA: first ? first.size : 24, fB: second ? second.size : 22,
      wA: first ? first.w : 0, wB: second ? second.w : 0,
      baseline: first ? first.baseline : second ? second.baseline : 90,
      mainBaseline: first ? first.baseline : 90, suffixBaseline: second ? second.baseline : 90,
      dia: 0, diaX: 0, total: maxX - minX, region: content.right - content.left,
      centerX: (content.left + content.right) / 2,
      bbox: { x: minX, y: minY, w: Math.max(1, maxX - minX), h: Math.max(1, maxY - minY) },
      badge: spec.badge, header: spec.header, subline: spec.subline, guide: spec.guide,
      lanes: { bottom: { x: 160, y: 148, w: Math.max(50, content.right - 180) } }, content: content
    };
  }

  /* ---------------- 绘制上下文包装 ---------------- */
  function makeG(ctx, env) {
    var g = {
      ctx: ctx,
      S: env.S,
      W: W, H: H,
      item: env.item, pal: env.pal, L: env.L, stack: env.stack,
      theme: env.pal.theme || themeOf(env.stack),
      t: env.t || 0,
      loopPhase: typeof env.loopPhase === 'number' ? env.loopPhase : (((env.t || 0) % 2400) + 2400) % 2400 / 2400,
      base: env.base || null,
      css: css, mix: mix, mixArr: mixArr, h2r: h2r, toArr: toArr, clamp: clamp,
      roundRect: function (x, y, w, h, r) { roundRect(ctx, x, y, w, h, r); },
      diamond: function (cx, cy, r) { diamond(ctx, cx, cy, r); },
      hex: function (cx, cy, r, n) { hexPath(ctx, cx, cy, r, n); },
      newCanvas: newCanvas,
      rand: mulberry32((env.item.rank || 1) * 7919 + 101 + (env.salt || 0))
    };
    return g;
  }

  /* 模块错误边界：单个模块画挂只记一笔，不炸整张卡 */
  var ERRORS = [];
  function safeDraw(mod, g, t, tag) {
    if (!mod || typeof mod.draw !== 'function') return false;
    try { mod.draw(g, t); return true; }
    catch (e) {
      var msg = (tag || mod.cat || '?') + ':' + (mod.id || '?') + ' → ' + (e && e.message || e);
      if (ERRORS.length < 40 && ERRORS.indexOf(msg) < 0) {
        ERRORS.push(msg);
        if (global.console) console.warn('[titlegen] 模块报错', msg);
      }
      return false;
    }
  }

  /* 小字（字母间距 / 大小写标签） */
  function smallCaps(ctx, txt, x, y, size, color, alpha, spacing, align, weight, maxWidth) {
    ctx.save();
    ctx.textAlign = align || 'left';
    ctx.textBaseline = 'middle';
    ctx.font = (weight || 600) + ' ' + size + 'px ' + FONT;
    if ('letterSpacing' in ctx) ctx.letterSpacing = spacing + 'px';
    ctx.fillStyle = css(color, alpha);
    if (maxWidth !== undefined) txt = fitText(ctx, txt, Math.max(0, maxWidth));
    ctx.fillText(txt, x, y);
    ctx.restore();
  }

  /* ---------------- 标题绘制 ---------------- */
  /* style: {fill, suffixFill, stroke, strokeWidth, glow, glowBlur, topHighlight, alpha} */
  function paintTitle(g, style) {
    var ctx = g.ctx, L = g.L, pal = g.pal;
    var st = style || {};
    var face = st.font || L.font || FONT;
    var parts = [];
    if (L.main) parts.push({ txt: L.main, x: L.ax, size: L.fA, fill: st.fill });
    if (L.suffix) parts.push({ txt: L.suffix, x: L.bx, size: L.fB, fill: st.suffixFill || st.fill });
    ctx.save();
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
    ctx.lineJoin = 'round';
    ctx.miterLimit = 2;
    if (st.alpha !== undefined) ctx.globalAlpha = st.alpha;

    parts.forEach(function (p) {
      var fill = typeof p.fill === 'function' ? p.fill(ctx, p.size) : p.fill;
      if (st.glow) {
        ctx.save();
        ctx.shadowColor = st.glow;
        ctx.shadowBlur = st.glowBlur === undefined ? 24 : st.glowBlur;
        ctx.fillStyle = fill;
        ctx.font = '700 ' + p.size + 'px ' + face;
        ctx.fillText(p.txt, p.x, L.baseline);
        ctx.restore();
      }
      if (st.stroke) {
        ctx.save();
        ctx.strokeStyle = st.stroke;
        ctx.lineWidth = st.strokeWidth === undefined ? 5 : st.strokeWidth;
        ctx.font = '700 ' + p.size + 'px ' + face;
        ctx.strokeText(p.txt, p.x, L.baseline);
        ctx.restore();
      }
      ctx.fillStyle = fill;
      ctx.font = '700 ' + p.size + 'px ' + face;
      ctx.fillText(p.txt, p.x, L.baseline);
    });

    // 分隔菱形
    if (L.separator) {
      ctx.save();
      if (st.glow) { ctx.shadowColor = st.glow; ctx.shadowBlur = 12; }
      var dg = ctx.createLinearGradient(0, L.baseline - 26, 0, L.baseline - 2);
      dg.addColorStop(0, mix(pal.base, '#ffffff', 0.85));
      dg.addColorStop(1, mix(pal.base, '#04070d', 0.35));
      ctx.fillStyle = dg;
      diamond(ctx, L.diaX, L.baseline - 14, L.dia);
      ctx.fill();
      ctx.restore();
      ctx.save();
      ctx.strokeStyle = 'rgba(4,7,13,0.55)';
      ctx.lineWidth = 1.2;
      diamond(ctx, L.diaX, L.baseline - 14, L.dia);
      ctx.stroke();
      ctx.restore();
    }

    // 上半部高光描边
    if (st.topHighlight) {
      ctx.save();
      ctx.beginPath();
      ctx.rect(L.ax - 26, L.baseline - L.fA * 1.02, L.total + 52, L.fA * 0.62);
      ctx.clip();
      ctx.strokeStyle = st.topHighlight;
      ctx.lineWidth = 1.5;
      parts.forEach(function (p) {
        ctx.font = '700 ' + p.size + 'px ' + face;
        ctx.strokeText(p.txt, p.x, L.baseline);
      });
      ctx.restore();
    }
    ctx.restore();
  }

  /* ---------------- 标题掩膜（供动效使用） ---------------- */
  function buildMask(item, S, stack) {
    var L = layout(item, stack);
    var bb = L.bbox;
    var cv = newCanvas(bb.w * S, bb.h * S);
    var ctx = cv.getContext('2d');
    ctx.setTransform(S, 0, 0, S, -bb.x * S, -bb.y * S);
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
    ctx.fillStyle = '#ffffff';
    if (L.parts) L.parts.forEach(function (p) { ctx.font = '700 ' + p.size + 'px ' + L.font; ctx.fillText(p.text, p.x, p.baseline); });
    else {
      if (L.main) { ctx.font = '700 ' + L.fA + 'px ' + L.font; ctx.fillText(L.main, L.ax, L.baseline); }
      if (L.suffix) { ctx.font = '700 ' + L.fB + 'px ' + L.font; ctx.fillText(L.suffix, L.bx, L.baseline); }
    }
    if (L.separator) { diamond(ctx, L.diaX, L.baseline - 14, L.dia); ctx.fill(); }
    return { canvas: cv, x: bb.x, y: bb.y, w: bb.w, h: bb.h };
  }

  /* ---------------- 静态底图合成 ---------------- */
  function alphaMask(title) {
    var mask = newCanvas(title.width, title.height), ctx = mask.getContext('2d');
    ctx.drawImage(title, 0, 0);
    ctx.globalCompositeOperation = 'source-in'; ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, mask.width, mask.height);
    ctx.globalCompositeOperation = 'source-over';
    return mask;
  }
  function partLayout(L, p, local) {
    var out = Object.assign({}, L), baseline = local ? 98 : p.baseline;
    delete out.parts;
    out.main = p.part === 'main' ? p.text : ''; out.suffix = p.part === 'suffix' ? p.text : '';
    out.fullMain = out.main; out.fullSuffix = out.suffix;
    out.ax = out.bx = p.x; out.fA = out.fB = p.size;
    out.wA = out.main ? p.w : 0; out.wB = out.suffix ? p.w : 0;
    out.total = p.w; out.baseline = out.mainBaseline = out.suffixBaseline = baseline;
    out.centerX = p.x + p.w / 2; out.separator = false;
    out.bbox = { x: p.bounds.x, y: p.bounds.y + baseline - p.baseline, w: p.bounds.w, h: p.bounds.h };
    return out;
  }
  function isolatedTitle(textMod, g, width, height) {
    var title = newCanvas(width, height), ctx = title.getContext('2d');
    if (g.L.parts) {
      title.__parts = [];
      g.L.parts.forEach(function (p) {
        var canvas = newCanvas(width, height), pctx = canvas.getContext('2d');
        // 字材仍在原来的 baseline=98 局部空间工作，渐变/扫描纹/剥蚀一同平移。
        pctx.setTransform(g.S, 0, 0, g.S, 0, (p.baseline - 98) * g.S);
        var pg = makeG(pctx, { S: g.S, item: g.item, pal: g.pal, L: partLayout(g.L, p, true), stack: g.stack });
        pg.rand = g.rand;
        if (p.text) safeDraw(textMod, pg, 0, 'text');
        ctx.drawImage(canvas, 0, 0);
        title.__parts.push({ part: p.part, canvas: canvas, mask: alphaMask(canvas), L: partLayout(g.L, p, false) });
      });
      return title;
    }
    ctx.setTransform(g.S, 0, 0, g.S, 0, 0);
    var tg = makeG(ctx, { S: g.S, item: g.item, pal: g.pal, L: g.L, stack: g.stack });
    tg.rand = g.rand;
    if (g.L.main || g.L.suffix) safeDraw(textMod, tg, 0, 'text');
    return title;
  }

  function drawBadge(mod, g) {
    var a = g.L.badge;
    g.ctx.save();
    if (a) { g.ctx.translate(a.x, a.y); g.ctx.scale(a.scale, a.scale); g.ctx.translate(-54, -80); }
    safeDraw(mod, g, 0, 'badge');
    g.ctx.restore();
  }

  function titleTransforms(stack) {
    return (stack.motions || []).map(function (id) { return get('motion', id); }).filter(function (m) { return m && typeof m.transformTitle === 'function'; });
  }

  function makeBase(item, stack, S, opt) {
    opt = opt || {};
    var pal = palette(item, stack);
    var L = layout(item, stack);

    var cv = newCanvas(W * S, H * S);
    var ctx = cv.getContext('2d');

    /* 背景 + 底板：先画到独立图层，再带一次亚像素模糊合成
       （Chromium 的渐变带抖动噪点，抹平后 PNG / GIF 体积可降到原来的 1/5） */
    var layer = newCanvas(W * S, H * S);
    var lctx = layer.getContext('2d');
    lctx.setTransform(S, 0, 0, S, 0, 0);
    var lg = makeG(lctx, { S: S, item: item, pal: pal, L: L, stack: stack, salt: 7 });
    var bgMod = get('bg', stack.bg);
    safeDraw(bgMod, lg, 0, 'bg');
    var plateMod = get('plate', stack.plate);
    safeDraw(plateMod, lg, 0, 'plate');

    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    // 第一遍：原样铺底，保证画布边缘是不透明实色（否则模糊会把边缘 alpha 削淡）
    ctx.drawImage(layer, 0, 0);
    var denoise = opt.denoise === undefined ? (plateMod && plateMod.sharp ? 0 : 0.85) : opt.denoise;
    if (denoise > 0) {
      // 第二遍：模糊层半透明叠上去，抹平渐变抖动噪点又不削边
      ctx.globalAlpha = 0.88;
      ctx.filter = 'blur(' + Math.max(0.8, S * denoise).toFixed(2) + 'px)';
      ctx.drawImage(layer, 0, 0);
      ctx.filter = 'none';
      ctx.globalAlpha = 1;
    }
    ctx.restore();

    ctx.setTransform(S, 0, 0, S, 0, 0);
    var g = makeG(ctx, { S: S, item: item, pal: pal, L: L, stack: stack, salt: 0 });

    var frameMod = get('frame', stack.frame);
    safeDraw(frameMod, g, 0, 'frame');

    // 主题气质层：让「主题」对所有模块组合都可见（不改称号主色，只叠一层色温）
    applyThemeTint(g);

    safeDraw(get('layout', stack.layout || 'inline'), g, 0, 'layout');

    (stack.decos || []).forEach(function (id) {
      var m = get('deco', id);
      if (m && (m.layer || 'static') === 'static') safeDraw(m, g, 0, 'deco');
    });

    if (stack.header !== false) {
      if (L.header) smallCaps(ctx, item.header || "PROPHET'S ERROR", L.header.x, L.header.y, 8.5, pal.base, 0.68, 2.1, L.header.align, 600, L.header.width);
      else smallCaps(ctx, item.header || "PROPHET'S ERROR", L.centerX, L.baseline - 55, 9.5, pal.base, 0.55, 4.5, 'center', 600, L.region);
    }

    var textMod = get('text', stack.text) || get('text', 'metal');
    var badgeMod = get('badge', stack.badge);
    var textAPI = global.TG && global.TG.textAnimation;
    var textLayers = null;
    if (L.parts || textMod && textMod.maskFromTitle || titleTransforms(stack).length || textAPI && textAPI.active(stack)) {
      // 文字动画使用独立图层；关闭时除破坏性字材外仍沿用直接绘制。
      var before = newCanvas(cv.width, cv.height);
      before.getContext('2d').drawImage(cv, 0, 0);
      var title = isolatedTitle(textMod, g, cv.width, cv.height);

      var after = newCanvas(cv.width, cv.height);
      var actx = after.getContext('2d');
      actx.setTransform(S, 0, 0, S, 0, 0);
      var ag = makeG(actx, { S: S, item: item, pal: pal, L: L, stack: stack });
      ag.rand = g.rand;
      if (stack.subline !== false) drawSubline(ag);
      drawBadge(badgeMod, ag);

      ctx.save();
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.drawImage(title, 0, 0);
      ctx.drawImage(after, 0, 0);
      ctx.restore();
      textLayers = { before: before, title: title, after: after, parts: title.__parts || null };
    } else {
      if (L.main || L.suffix) {
        if (textMod && textMod.isolated) {
          // 剥蚀等破坏性混合只作用于字材，不能擦除既有背景、边框或装饰。
          var isolated = isolatedTitle(textMod, g, cv.width, cv.height);
          ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0);
          ctx.drawImage(isolated, 0, 0); ctx.restore();
        } else safeDraw(textMod, g, 0, 'text');
      }
      if (stack.subline !== false) drawSubline(g);
      drawBadge(badgeMod, g);
    }

    var base = {
      canvas: cv, item: item, stack: stack, S: S, pal: pal, L: L, layer: layer,
      mask: textLayers && (L.parts || textMod && textMod.maskFromTitle) ?
        { canvas: alphaMask(textLayers.title), x: 0, y: 0, w: W, h: H } : buildMask(item, S, stack),
      glow: buildGlow(pal, S)
    };
    if (textLayers) base.titleLayers = textLayers;
    if (textLayers && textAPI && textAPI.active(stack)) textAPI.prepare(base, textLayers);
    return base;
  }

  function drawSubline(g) {
    var ctx = g.ctx, pal = g.pal, item = g.item;
    var y = 126;
    var right = item.en ? (item.en + (item.desc ? '  ·  ' + item.desc : '')) : (item.desc || '');
    if (!right) return;
    if (g.L.subline) {
      var line = g.L.subline;
      smallCaps(ctx, right, line.x, line.y, 8.5, item.subColor || pal.base,
        item.subAlpha === undefined ? 0.67 : item.subAlpha, 1.5, line.align, 600, line.width);
      return;
    }
    var reserve = rightReserve(g.stack || {});
    var color = item.subColor || pal.base;
    var hasProgress = (g.stack.decos || []).indexOf('progress') >= 0 && item.steps;
    var rightEdge = W - 32 - reserve;
    var leftEdge = g.stack.badge && g.stack.badge !== 'none' ? 106 : 32;
    var plate = get('plate', g.stack.plate), content = plateContent(g.stack, plate);
    if (content) { leftEdge = Math.max(leftEdge, content.left); rightEdge = Math.min(rightEdge, content.right); }
    if (hasProgress) leftEdge = Math.max(leftEdge, g.L.ax - 2 + (item.steps[1] - 1) * 13 + 15);
    var room = Math.max(0, rightEdge - leftEdge);
    if (reserve >= 80) {
      // 右侧拥挤时，副行改到左下（进度点之后）
      smallCaps(ctx, right, leftEdge, y, 9.5, color, item.subAlpha === undefined ? 0.62 : item.subAlpha, 2.6, 'left', 600, room);
    } else {
      smallCaps(ctx, right, rightEdge, y, 9.5, color, item.subAlpha === undefined ? 0.62 : item.subAlpha, 2.6, 'right', 600, room);
    }
  }

  /* 主题气质层：accent/secondary 双色柔光 + 内描边，让主题切换对所有模块都可见
     （不改称号主色，只改“色温”，避免覆盖家族阶位配色） */
  function applyThemeTint(g) {
    var stack = g.stack || {};
    var th = themeOf(stack);
    if (!th || !th.id || th.id === 'default') return;
    var ctx = g.ctx;
    var k = (th.glow === undefined ? 1 : th.glow);
    var lw = (th.line === undefined ? 1 : th.line);
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    var a1 = ctx.createRadialGradient(46, 30, 6, 46, 30, 210);
    a1.addColorStop(0, css(th.accent, 0.10 * k));
    a1.addColorStop(1, css(th.accent, 0));
    ctx.fillStyle = a1; ctx.fillRect(0, 0, W, H);
    var a2 = ctx.createRadialGradient(W - 60, H - 22, 6, W - 60, H - 22, 230);
    a2.addColorStop(0, css(th.secondary, 0.09 * k));
    a2.addColorStop(1, css(th.secondary, 0));
    ctx.fillStyle = a2; ctx.fillRect(0, 0, W, H);
    ctx.restore();
    ctx.save();
    ctx.strokeStyle = css(th.accent, 0.16 * lw);
    ctx.lineWidth = Math.max(0.8, lw);
    roundRect(ctx, 6.5, 6.5, W - 13, H - 13, 15);
    ctx.stroke();
    ctx.restore();
  }

  function buildGlow(pal, S) {    var gw = Math.ceil(W / 4), gh = Math.ceil(H / 4);
    var c = newCanvas(gw, gh);
    var x = c.getContext('2d');
    var rg = x.createRadialGradient(150 / 4, 78 / 4, 1.5, 150 / 4, 78 / 4, 240 / 4);
    rg.addColorStop(0, css(pal.base, 0.55));
    rg.addColorStop(1, css(pal.base, 0));
    x.fillStyle = rg;
    x.fillRect(0, 0, gw, gh);
    return c;
  }

  /* ---------------- 动画帧 ---------------- */
  function transformScene(base, scene, t, loopPhase) {
    var mods = titleTransforms(base.stack);
    if (!mods.length || !base.titleLayers) return scene;
    var width = base.canvas.width, height = base.canvas.height, rt = base.__titleTransform;
    if (!rt) {
      rt = base.__titleTransform = { targets: [newCanvas(width, height), newCanvas(width, height)],
        masks: [newCanvas(width, height), newCanvas(width, height)], sourceMask: newCanvas(width, height), canvas: newCanvas(width, height) };
      rt.view = { canvas: rt.canvas, mask: { canvas: rt.masks[0], x: 0, y: 0, w: W, h: H },
        item: base.item, stack: base.stack, S: base.S, pal: base.pal, L: base.L, layer: base.layer, glow: base.glow };
    }
    var maskCtx = rt.sourceMask.getContext('2d');
    maskCtx.setTransform(1, 0, 0, 1, 0, 0); maskCtx.clearRect(0, 0, width, height);
    maskCtx.drawImage(scene.mask.canvas, scene.mask.x * base.S, scene.mask.y * base.S);
    var source = base.textAnimation ? base.currentTextLayer : base.titleLayers.title, sourceMask = rt.sourceMask;
    mods.forEach(function (mod, index) {
      var target = rt.targets[index % 2], targetMask = rt.masks[index % 2];
      var ctx = target.getContext('2d'), mctx = targetMask.getContext('2d');
      [ctx, mctx].forEach(function (c) { c.setTransform(1, 0, 0, 1, 0, 0); c.globalAlpha = 1; c.globalCompositeOperation = 'source-over'; c.clearRect(0, 0, width, height); });
      var g = makeG(ctx, { S: base.S, item: base.item, pal: base.pal, L: base.L, stack: base.stack, t: t, base: scene, loopPhase: loopPhase });
      try {
        mod.transformTitle(g, t, { source: source, sourceMask: sourceMask, targetCtx: ctx, targetMaskCtx: mctx, width: width, height: height });
        source = target; sourceMask = targetMask;
      } catch (e) {
        var message = 'motion:' + mod.id + ' → ' + (e && e.message || e);
        if (ERRORS.length < 40 && ERRORS.indexOf(message) < 0) ERRORS.push(message);
      }
    });
    var out = rt.canvas.getContext('2d');
    out.setTransform(1, 0, 0, 1, 0, 0); out.clearRect(0, 0, width, height);
    out.drawImage(base.titleLayers.before, 0, 0); out.drawImage(source, 0, 0); out.drawImage(base.titleLayers.after, 0, 0);
    rt.view.mask.canvas = sourceMask;
    return rt.view;
  }

  function renderFrame(base, t, opts) {
    // 每张底图缓存一块帧缓冲，避免逐帧 new canvas（预览/JGIF 都受益）
    var cv = base.__frame;
    if (!cv || cv.width !== base.canvas.width || cv.height !== base.canvas.height) {
      cv = newCanvas(base.canvas.width, base.canvas.height);
      base.__frame = cv;
    }
    var ctx = cv.getContext('2d');
    // 旧故障/抖动等模块会重采样 base.canvas：给它们当前标题的独立场景，
    // 不可传完整静态标题，也不可传正在写入的 __frame（会产生自拷贝反馈）。
    var textAPI = global.TG && global.TG.textAnimation;
    var textTime = opts && typeof opts.textTime === 'number' && isFinite(opts.textTime) ? opts.textTime : t;
    var scene = base.textAnimation && textAPI ? textAPI.draw(base, textTime, false) : base;
    var loopPhase = opts && typeof opts.loopPhase === 'number' ? opts.loopPhase : undefined;
    scene = transformScene(base, scene, t, loopPhase);
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, cv.width, cv.height);
    ctx.drawImage(scene.canvas, 0, 0);
    ctx.setTransform(base.S, 0, 0, base.S, 0, 0);
    var g = makeG(ctx, {
      S: base.S, item: base.item, pal: base.pal, L: base.L,
      stack: base.stack, t: t, base: scene, loopPhase: loopPhase
    });
    // 可动画装饰：声明了 layer:'motion' 的装饰跳过静态底图，在这里逐帧画
    (base.stack.decos || []).forEach(function (id) {
      var m = get('deco', id);
      if (m && m.layer === 'motion') safeDraw(m, g, t, 'deco');
    });
    (base.stack.motions || []).forEach(function (id) {
      var m = get('motion', id);
      if (m && !m.transformTitle) safeDraw(m, g, t, 'motion');
    });
    return cv;
  }

  /* 该配置是否存在逐帧内容（动效或可动画装饰） */
  function hasAnimation(stack) {
    var textAPI = global.TG && global.TG.textAnimation;
    if (textAPI && textAPI.active(stack)) return true;
    if ((stack.motions || []).some(function (id) { return !!get('motion', id); })) return true;
    return (stack.decos || []).some(function (id) {
      var m = get('deco', id);
      return m && m.layer === 'motion';
    });
  }

  function animationDuration(stack) {
    var textAPI = global.TG && global.TG.textAnimation;
    var period = textAPI && textAPI.active(stack) ? textAPI.duration(stack) : 0;
    [['motion', stack.motions || []], ['deco', stack.decos || []]].forEach(function (entry) {
      entry[1].forEach(function (id) { var mod = get(entry[0], id); if (mod && mod.duration) period = Math.max(period, mod.duration); });
    });
    return period;
  }

  /* 静态出图：静态底图 + 可动画装饰取「好看的中间状态」(t=600)，
     避免动态装饰在 PNG / 海报里彻底消失，也避免全停在起始帧 */
  var STATIC_T = 600;
  function renderStatic(base) {
    var textAPI = global.TG && global.TG.textAnimation;
    // PNG/海报/暂停/A-B：颜色保留固定相位，文字运动始终取完整、静止的标题。
    var scene = base.textAnimation && textAPI ? textAPI.draw(base, STATIC_T, true) : base;
    var anim = (base.stack.decos || []).filter(function (id) {
      var m = get('deco', id);
      return m && m.layer === 'motion';
    });
    if (!anim.length) return scene.canvas;
    var cv = newCanvas(base.canvas.width, base.canvas.height);
    var ctx = cv.getContext('2d');
    ctx.drawImage(scene.canvas, 0, 0);
    ctx.setTransform(base.S, 0, 0, base.S, 0, 0);
    var g = makeG(ctx, {
      S: base.S, item: base.item, pal: base.pal, L: base.L,
      stack: base.stack, t: STATIC_T, base: scene
    });
    anim.forEach(function (id) { safeDraw(get('deco', id), g, STATIC_T, 'deco'); });
    return cv;
  }

  /* 文字工具：给模块用 */
  function labelTag(ctx, txt, x, y, size, color, alpha, spacing, align) {
    smallCaps(ctx, txt, x, y, size, color, alpha, spacing, align);
  }

  global.TG = {
    W: W, H: H, FONT: FONT,
    mulberry32: mulberry32, h2r: h2r, css: css, mix: mix, mixArr: mixArr, clamp: clamp,
    newCanvas: newCanvas, roundRect: roundRect, diamond: diamond, hexPath: hexPath,
    register: register, get: get, list: list, CATS: CATS, REG: REG,
    palette: palette, themeOf: themeOf, layout: layout, makeG: makeG,
    paintTitle: paintTitle, smallCaps: smallCaps, labelTag: labelTag,
    rightReserve: rightReserve, fitText: fitText, fitLabel: fitLabel, graphemes: graphemes,
    errors: function () { return ERRORS.slice(); },
    clearErrors: function () { ERRORS.length = 0; },
    makeBase: makeBase, renderFrame: renderFrame, renderStatic: renderStatic,
    buildMask: buildMask, hasAnimation: hasAnimation, animationDuration: animationDuration
  };
})(window);

