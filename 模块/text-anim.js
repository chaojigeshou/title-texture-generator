/* ============================================================
 * text-anim.js — 标题文字动画（与字材、整卡动效独立）
 * 完整排版只计算一次；颜色保持字材 alpha，运动只操作缓存的标题像素。
 * PNG / 暂停预览显示完整标题；GIF 可用 renderFrame 的 textTime 独立采样。
 * ============================================================ */
(function (global) {
  'use strict';
  var TG = global.TG, W = TG.W, H = TG.H;
  var DEFAULTS = { color: 'none', motion: 'none', speed: 1, strength: 0.65, scope: 'all' };
  var SPEEDS = [0.5, 0.75, 1, 1.5, 2];
  var SCOPES = ['all', 'main', 'suffix'];
  var COLORS = [
    { id: 'none', name: '原字色', hint: '保留当前字材与颜色。' },
    { id: 'rainbow', name: '彩虹流光', hint: '彩虹渐变沿标题流动，保留字材轮廓与透明度。' },
    { id: 'aurora', name: '极光渐变', hint: '青绿、蓝紫柔和交替，适合冷光与全息字材。' },
    { id: 'shimmer', name: '流金扫亮', hint: '一束暖白高光循环掠过文字。' },
    { id: 'pulse', name: '柔光呼吸', hint: '文字亮度缓慢起伏，始终保持可读。' }
  ];
  var MOTIONS = [
    { id: 'none', name: '静止', hint: '文字保持静止。' },
    { id: 'typewriter', name: '打字机', hint: '文字逐个显现，完整停留后淡出循环。' },
    { id: 'wave', name: '文字波浪', hint: '文字沿稳定基线轻轻起伏。' },
    { id: 'bounce', name: '逐字轻跳', hint: '文字依次轻跳，完整标题始终可见。' },
    { id: 'reveal', name: '柔边扫入', hint: '文字从左向右显现，完整停留后淡出。' },
    { id: 'popin', name: '逐字弹入', hint: '每个字从小到大弹入并轻轻回稳，完整停留后淡出。' },
    { id: 'unfold', name: '折页展开', hint: '每个字沿中间纵向折缝向两边展开，完整停留后淡出。' },
    { id: 'assemble', name: '碎片归位', hint: '每个字分成四块，从不同方向旋转归位，完整停留后淡出。' }
  ];
  var colorIds = COLORS.map(function (x) { return x.id; });
  var motionIds = MOTIONS.map(function (x) { return x.id; });
  var fields = Object.keys(DEFAULTS);
  var own = Object.prototype.hasOwnProperty;

  function isRecord(raw) { return !!raw && typeof raw === 'object' && !Array.isArray(raw); }
  function normalize(raw) {
    raw = isRecord(raw) ? raw : {};
    return {
      color: own.call(raw, 'color') && colorIds.indexOf(raw.color) >= 0 ? raw.color : DEFAULTS.color,
      motion: own.call(raw, 'motion') && motionIds.indexOf(raw.motion) >= 0 ? raw.motion : DEFAULTS.motion,
      speed: own.call(raw, 'speed') && SPEEDS.indexOf(raw.speed) >= 0 ? raw.speed : DEFAULTS.speed,
      strength: own.call(raw, 'strength') && typeof raw.strength === 'number' && isFinite(raw.strength) ? TG.clamp(raw.strength, 0.1, 1) : DEFAULTS.strength,
      scope: own.call(raw, 'scope') && SCOPES.indexOf(raw.scope) >= 0 ? raw.scope : DEFAULTS.scope
    };
  }
  function validate(raw) {
    if (raw === undefined) return normalize();
    if (!isRecord(raw)) throw new Error('文字动画配置必须是对象');
    Object.keys(raw).forEach(function (key) {
      if (fields.indexOf(key) < 0) throw new Error('无法识别的文字动画字段：' + key);
      var value = raw[key], valid = true;
      if (key === 'color') valid = colorIds.indexOf(value) >= 0;
      else if (key === 'motion') valid = motionIds.indexOf(value) >= 0;
      else if (key === 'speed') valid = typeof value === 'number' && SPEEDS.indexOf(value) >= 0;
      else if (key === 'strength') valid = typeof value === 'number' && isFinite(value) && value >= 0.1 && value <= 1;
      else if (key === 'scope') valid = SCOPES.indexOf(value) >= 0;
      if (!valid) throw new Error('不支持的文字动画参数：' + key);
    });
    return normalize(raw);
  }
  function active(stack) {
    var opt = normalize(stack && stack.textAnim);
    return opt.color !== 'none' || opt.motion !== 'none';
  }
  function duration(stack) { return 2400 / normalize(stack && stack.textAnim).speed; }
  function phaseAt(t, period) {
    t = typeof t === 'number' && isFinite(t) ? t : 0;
    return ((t % period) + period) % period / period;
  }
  function smooth(x) { x = TG.clamp(x, 0, 1); return x * x * (3 - 2 * x); }

  var measure = null;

  function pixel(value, scale, max) { return TG.clamp(Math.round(value * scale), 0, max); }
  function makeUnits(base) {
    var L = base.L, S = base.S, width = base.canvas.width, units = [];
    var mainRight = width, suffixLeft = 0;
    if (L.separator) {
      mainRight = pixel((L.ax + L.wA + L.diaX - L.dia) / 2, S, width);
      suffixLeft = pixel((L.diaX + L.dia + L.bx) / 2, S, width);
      suffixLeft = Math.max(mainRight, suffixLeft);
    } else if (L.main && !L.suffix) suffixLeft = width;
    else if (!L.main && L.suffix) mainRight = 0;
    if (!measure) measure = TG.newCanvas(8, 8).getContext('2d');

    function part(text, name, x, size, left, right) {
      if (!text || right <= left) return;
      var chars = TG.graphemes(text), prefix = '', cursor = left;
      measure.font = '700 ' + size + 'px ' + L.font;
      chars.forEach(function (ch, i) {
        prefix += ch;
        var edge = i === chars.length - 1 ? right : pixel(x + measure.measureText(prefix).width, S, width);
        edge = Math.max(cursor, Math.min(right, edge));
        if (edge > cursor) {
          units.push({ part: name, text: ch, x: cursor, w: edge - cursor });
          cursor = edge;
        } else if (units.length && units[units.length - 1].part === name) units[units.length - 1].text += ch;
      });
    }
    part(L.main, 'main', L.ax, L.fA, 0, mainRight);
    if (L.separator && suffixLeft > mainRight) units.push({ part: 'separator', text: '◆', x: mainRight, w: suffixLeft - mainRight });
    part(L.suffix, 'suffix', L.bx, L.fB, suffixLeft, width);
    return { units: units, mainRight: mainRight, suffixLeft: suffixLeft };
  }

  function reset(ctx, width, height) {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
    ctx.clearRect(0, 0, width, height);
  }
  function strip(ctx, source, x, width, dy) {
    if (width > 0) ctx.drawImage(source, x, 0, width, source.height, x, dy || 0, width, source.height);
  }
  function maskStrip(ctx, base, x, width) {
    if (width <= 0) return;
    var mask = base.fullMask;
    ctx.save();
    ctx.beginPath(); ctx.rect(x, 0, width, base.canvas.height); ctx.clip();
    ctx.drawImage(mask.canvas, mask.x * base.S, mask.y * base.S);
    ctx.restore();
  }

  function prepareDefault(base, layers) {
    if (Array.isArray(base.L.parts) && Array.isArray(layers.parts)) return prepareParts(base, layers);
    var options = normalize(base.stack.textAnim);
    var width = base.canvas.width, height = base.canvas.height;
    var info = makeUnits(base), selected = info.units.filter(function (unit) {
      return options.scope === 'all' || unit.part === options.scope;
    });
    var left = 0, right = width;
    if (options.scope === 'main') right = base.L.main ? info.mainRight : 0;
    if (options.scope === 'suffix') left = base.L.suffix ? info.suffixLeft : width;
    var colored = TG.newCanvas(width, height), current = TG.newCanvas(width, height);
    var maskCanvas = TG.newCanvas(width, height), scene = TG.newCanvas(width, height);
    base.textLayer = layers.title;
    base.fullMask = base.mask;
    base.currentTextLayer = current;
    base.currentMask = { canvas: maskCanvas, x: 0, y: 0, w: W, h: H };
    var state = {
      options: options, before: layers.before, after: layers.after, colored: colored,
      current: current, scene: scene, units: selected, left: left, right: right,
      colorCtx: colored.getContext('2d'), textCtx: current.getContext('2d'),
      maskCtx: maskCanvas.getContext('2d'), sceneCtx: scene.getContext('2d'),
      width: width, height: height, phase: 0, opacity: 1,
      visibleCount: selected.length, totalCount: selected.length, key: null, staticView: null
    };
    state.view = {
      canvas: scene, mask: base.currentMask, item: base.item, stack: base.stack,
      S: base.S, pal: base.pal, L: base.L, layer: base.layer, glow: base.glow
    };
    // 只为逐字位移缓存裁剪小图；总像素面积最多约等于一张标题层，
    // 不为每个字符复制整张卡。颜色动画可直接从复用的着色层裁剪。
    if (options.motion === 'wave' || options.motion === 'bounce') {
      selected.forEach(function (unit) {
        unit.canvas = TG.newCanvas(unit.w, height);
        unit.canvas.getContext('2d').drawImage(layers.title, -unit.x, 0);
        unit.mask = TG.newCanvas(unit.w, height);
        unit.mask.getContext('2d').drawImage(base.fullMask.canvas, base.fullMask.x * base.S - unit.x, base.fullMask.y * base.S);
      });
    }
    base.textAnimation = state;
    return state;
  }

  function productionMotion(id) {
    return id === 'popin' || id === 'unfold' || id === 'assemble';
  }

  /* 新入场效果单独准备几何；旧模式沿用原来的缓存与绘制路径。
     首尾字素的切片包含外侧留白，缩放/旋转必须使用真正的字心，
     不能直接使用切片中点。测宽、分片和轨迹全部只在准备时计算。 */
  function productionUnits(base, state, units, L) {
    var S = base.S, height = state.height, partName = '', prefix = '';
    var total = Math.max(1, state.totalCount - 1), motion = state.options.motion;
    var strength = state.options.strength;
    if (!measure) measure = TG.newCanvas(8, 8).getContext('2d');
    for (var i = 0; i < units.length; i++) {
      var unit = units[i], size = unit.part === 'suffix' ? L.fB : L.fA;
      var cx, cy, advance, glyphHeight;
      if (unit.part === 'separator') {
        cx = L.diaX * S; cy = (L.baseline - 14) * S;
        advance = glyphHeight = Math.max(1, L.dia * S);
      } else {
        if (partName !== unit.part) { partName = unit.part; prefix = ''; }
        measure.font = '700 ' + size + 'px ' + L.font;
        var start = measure.measureText(prefix).width;
        prefix += unit.text;
        var end = measure.measureText(prefix).width, metrics = measure.measureText(unit.text);
        var ascent = Number.isFinite(metrics.actualBoundingBoxAscent) ? metrics.actualBoundingBoxAscent : size * 0.82;
        var descent = Number.isFinite(metrics.actualBoundingBoxDescent) ? metrics.actualBoundingBoxDescent : size * 0.18;
        cx = ((unit.part === 'suffix' ? L.bx : L.ax) + (start + end) / 2) * S;
        cy = (L.baseline + (descent - ascent) / 2) * S;
        advance = Math.max(1, (end - start) * S);
        glyphHeight = Math.max(1, (ascent + descent) * S);
      }
      var index = typeof unit.index === 'number' && unit.index >= 0 ? unit.index : i;
      var geometry = {
        cx: cx, cy: cy, start: 0.035 + index / total * 0.24,
        duration: motion === 'unfold' ? 0.32 : 0.28,
        rise: (7 + strength * 12) * S, overshoot: 0.65 + strength * 1.1,
        shear: 0.10 + strength * 0.28, pieces: []
      };
      var midX = Math.max(unit.x, Math.min(unit.x + unit.w, Math.round(cx)));
      var midY = Math.max(0, Math.min(height, Math.round(cy)));
      if (motion === 'unfold') {
        if (midX > unit.x) geometry.pieces.push({ x: unit.x, y: 0, w: midX - unit.x, h: height, side: 1 });
        if (midX < unit.x + unit.w) geometry.pieces.push({ x: midX, y: 0, w: unit.x + unit.w - midX, h: height, side: -1 });
      } else if (motion === 'assemble') {
        var xs = [unit.x, midX, unit.x + unit.w], ys = [0, midY, height], order = [0, 2, 3, 1];
        var spread = (6 + strength * 12) * S;
        for (var row = 0; row < 2; row++) for (var col = 0; col < 2; col++) {
          if (xs[col + 1] <= xs[col] || ys[row + 1] <= ys[row]) continue;
          var n = row * 2 + col, dx = col ? 1 : -1, dy = row ? 1 : -1;
          geometry.pieces.push({
            x: xs[col], y: ys[row], w: xs[col + 1] - xs[col], h: ys[row + 1] - ys[row],
            px: cx + dx * advance * 0.23, py: cy + dy * glyphHeight * 0.23,
            dx: dx * spread * (0.82 + ((index + n) % 3) * 0.08),
            dy: dy * spread * (0.60 + ((index * 3 + n) % 3) * 0.06),
            angle: ((index + n) % 2 ? 1 : -1) * (0.14 + strength * 0.26),
            delay: order[n] * 0.024
          });
        }
      }
      unit.production = geometry;
    }
  }

  function prepare(base, layers) {
    var state = prepareDefault(base, layers);
    if (!productionMotion(state.options.motion)) return state;
    state.production = true;
    if (state.multiPart) {
      for (var i = 0; i < state.parts.length; i++) {
        var part = state.parts[i];
        if (part.selected) productionUnits(base, state, part.units, part.L);
      }
    } else {
      // 普通旧字材的 font mask 可能不包含材质孔洞/晕边；新效果以实际
      // 标题 alpha 生成一次完整遮罩，之后颜色和遮罩采用相同变换。
      var actualMask = TG.newCanvas(state.width, state.height), maskCtx = actualMask.getContext('2d');
      maskCtx.drawImage(layers.title, 0, 0);
      maskCtx.globalCompositeOperation = 'source-in';
      maskCtx.fillStyle = '#ffffff'; maskCtx.fillRect(0, 0, state.width, state.height);
      maskCtx.globalCompositeOperation = 'source-over';
      base.fullMask = { canvas: actualMask, x: 0, y: 0, w: W, h: H };
      productionUnits(base, state, state.units, base.L);
    }
    return state;
  }

  function mappedPiece(ctx, mask, source, sourceMask, x, y, w, h, a, b, c, d, e, f, opacity) {
    if (w <= 0 || h <= 0 || opacity <= 0) return;
    ctx.save(); mask.save();
    try {
      ctx.setTransform(a, b, c, d, e, f); mask.setTransform(a, b, c, d, e, f);
      ctx.globalAlpha = mask.globalAlpha = opacity;
      ctx.drawImage(source, x, y, w, h, x, y, w, h);
      mask.drawImage(sourceMask, x, y, w, h, x, y, w, h);
    } finally { mask.restore(); ctx.restore(); }
  }

  function productionUnit(base, state, unit, source, sourceMask, phase) {
    var ctx = state.textCtx, mask = state.maskCtx, geometry = unit.production;
    var progress = TG.clamp((phase - geometry.start) / geometry.duration, 0, 1);
    if (progress <= 0 || state.opacity <= 0) return;
    state.visibleCount++;
    var motion = state.options.motion, height = state.height, fade = state.opacity;
    if (progress >= 1 && motion !== 'assemble') {
      ctx.globalAlpha = mask.globalAlpha = fade;
      strip(ctx, source, unit.x, unit.w, 0); strip(mask, sourceMask, unit.x, unit.w, 0);
    } else if (motion === 'popin') {
      var back = progress - 1;
      var eased = 1 + (geometry.overshoot + 1) * back * back * back + geometry.overshoot * back * back;
      var scale = 0.18 + eased * 0.82, dy = (1 - smooth(progress)) * geometry.rise;
      mappedPiece(ctx, mask, source, sourceMask, unit.x, 0, unit.w, height,
        scale, 0, 0, scale, geometry.cx * (1 - scale), geometry.cy * (1 - scale) + dy,
        fade * smooth(progress / 0.18));
    } else if (motion === 'unfold') {
      var opened = smooth(progress), sx = Math.sin(opened * Math.PI / 2);
      for (var i = 0; i < geometry.pieces.length; i++) {
        var half = geometry.pieces[i], shear = half.side * geometry.shear * (1 - opened);
        mappedPiece(ctx, mask, source, sourceMask, half.x, half.y, half.w, half.h,
          sx, shear, 0, 1, geometry.cx * (1 - sx), -shear * geometry.cx,
          fade * smooth(progress / 0.14));
      }
    } else if (motion === 'assemble') {
      for (var j = 0; j < geometry.pieces.length; j++) {
        var piece = geometry.pieces[j];
        var local = TG.clamp((phase - geometry.start - piece.delay) / geometry.duration, 0, 1);
        if (local <= 0) continue;
        var remain = 1 - smooth(local), angle = piece.angle * remain;
        var a = Math.cos(angle), b = Math.sin(angle), c = -b;
        mappedPiece(ctx, mask, source, sourceMask, piece.x, piece.y, piece.w, piece.h,
          a, b, c, a, piece.px + piece.dx * remain - a * piece.px - c * piece.py,
          piece.py + piece.dy * remain - b * piece.px - a * piece.py,
          fade * smooth(local / 0.16));
      }
    }
  }

  function composeProduction(base, state, phase) {
    var ctx = state.textCtx, mask = state.maskCtx, settled = phase >= 0.66;
    reset(ctx, state.width, state.height); reset(mask, state.width, state.height);
    state.phase = phase; state.visibleCount = 0;
    // 留出完整阅读和收尾空帧；24帧循环的首尾都不会突然露出全字。
    state.opacity = phase <= 0.82 ? 1 : 1 - smooth((phase - 0.82) / 0.12);
    if (state.multiPart) {
      for (var p = 0; p < state.parts.length; p++) {
        var part = state.parts[p];
        if (!part.selected) continue;
        var source = partColor(state, part, phase);
        if (settled) {
          ctx.globalAlpha = mask.globalAlpha = state.opacity;
          ctx.drawImage(source, 0, 0); mask.drawImage(part.mask, 0, 0);
          if (state.opacity > 0) state.visibleCount += part.units.length;
        } else {
          for (var u = 0; u < part.units.length; u++) productionUnit(base, state, part.units[u], source, part.mask, phase);
        }
      }
      ctx.globalAlpha = mask.globalAlpha = 1;
      ctx.globalCompositeOperation = mask.globalCompositeOperation = 'destination-over';
      for (var r = 0; r < state.parts.length; r++) {
        var rest = state.parts[r];
        if (!rest.selected) { ctx.drawImage(rest.canvas, 0, 0); mask.drawImage(rest.mask, 0, 0); }
      }
      ctx.globalCompositeOperation = mask.globalCompositeOperation = 'source-over';
    } else {
      colorize(base, state, phase);
      if (settled) {
        ctx.globalAlpha = mask.globalAlpha = state.opacity;
        strip(ctx, state.colored, state.left, state.right - state.left, 0);
        strip(mask, base.fullMask.canvas, state.left, state.right - state.left, 0);
        if (state.opacity > 0) state.visibleCount = state.units.length;
      } else {
        for (var n = 0; n < state.units.length; n++) productionUnit(base, state, state.units[n], state.colored, base.fullMask.canvas, phase);
      }
      addRest(base, state);
    }
    var scene = state.sceneCtx;
    reset(scene, state.width, state.height);
    scene.drawImage(state.before, 0, 0); scene.drawImage(state.current, 0, 0); scene.drawImage(state.after, 0, 0);
  }

  /* 多行 / 错位构图：每段已由 core 独立绘制，不能再从联合图层按全高
     竖条切分主副字，否则同一 x 范围内的另一行会一起移动或提前出现。
     只共用一张着色暂存画布；字素直接裁剪各段源图，不逐帧分配画布。 */
  function prepareParts(base, layers) {
    var options = normalize(base.stack.textAnim);
    var width = base.canvas.width, height = base.canvas.height;
    var colored = TG.newCanvas(width, height), current = TG.newCanvas(width, height);
    var maskCanvas = TG.newCanvas(width, height), scene = TG.newCanvas(width, height);
    var state = {
      multiPart: true, options: options, before: layers.before, after: layers.after,
      colored: colored, current: current, scene: scene, parts: [], units: [], left: 0, right: width,
      colorCtx: colored.getContext('2d'), textCtx: current.getContext('2d'),
      maskCtx: maskCanvas.getContext('2d'), sceneCtx: scene.getContext('2d'),
      width: width, height: height, phase: 0, opacity: 1,
      visibleCount: 0, totalCount: 0, key: null, staticView: null,
      revealLeft: width, revealRight: 0
    };
    // 同名的竖排分段保持 core 提供的顺序；所有主字先于副字阅读。
    var ordered = layers.parts.filter(function (part) { return part.part === 'main'; })
      .concat(layers.parts.filter(function (part) { return part.part === 'suffix'; }));
    ordered.forEach(function (entry, index) {
      var mask = entry.mask && entry.mask.canvas || entry.mask;
      var partBase = { canvas: entry.canvas, textLayer: entry.canvas, L: entry.L, S: base.S, pal: base.pal };
      var units = makeUnits(partBase).units;
      var selected = options.scope === 'all' || options.scope === entry.part;
      var offset = selected ? state.units.length : -1;
      units.forEach(function (unit, unitIndex) {
        unit.part = entry.part; unit.partIndex = index;
        unit.index = selected ? offset + unitIndex : -1;
        if (selected) state.units.push(unit);
      });
      var part = {
        part: entry.part, canvas: entry.canvas, mask: mask, L: entry.L,
        units: units, selected: selected, offset: offset, base: partBase,
        colorState: {
          options: Object.assign({}, options, { scope: entry.part }),
          colorCtx: state.colorCtx, width: width, height: height, left: 0, right: width
        }
      };
      state.parts.push(part);
      if (selected) {
        var bounds = entry.L.bbox;
        var left = bounds && isFinite(bounds.x) ? pixel(bounds.x, base.S, width) : 0;
        var right = bounds && isFinite(bounds.x + bounds.w) ? pixel(bounds.x + bounds.w, base.S, width) : width;
        state.revealLeft = Math.min(state.revealLeft, left);
        state.revealRight = Math.max(state.revealRight, right);
      }
    });
    if (state.revealRight < state.revealLeft) state.revealLeft = state.revealRight = 0;
    state.totalCount = state.visibleCount = state.units.length;
    base.textLayer = layers.title;
    base.fullMask = base.mask;
    base.currentTextLayer = current;
    base.currentMask = { canvas: maskCanvas, x: 0, y: 0, w: W, h: H };
    state.view = {
      canvas: scene, mask: base.currentMask, item: base.item, stack: base.stack,
      S: base.S, pal: base.pal, L: base.L, layer: base.layer, glow: base.glow
    };
    base.textAnimation = state;
    return state;
  }

  function partColor(state, part, phase) {
    if (!part.selected || state.options.color === 'none') return part.canvas;
    colorize(part.base, part.colorState, phase);
    return state.colored;
  }

  function composeParts(base, state, phase, isStatic) {
    var ctx = state.textCtx, mask = state.maskCtx, options = state.options;
    var motion = isStatic ? 'none' : options.motion, count = state.units.length;
    reset(ctx, state.width, state.height);
    reset(mask, state.width, state.height);
    state.phase = phase; state.visibleCount = count; state.opacity = 1;
    var progress = 1;
    if (motion === 'typewriter' || motion === 'reveal') {
      progress = motion === 'typewriter' ? TG.clamp((phase - 0.04) / 0.56, 0, 1) : smooth(phase / 0.60);
      var fadeStart = 0.88 - options.strength * 0.04;
      state.opacity = phase <= fadeStart ? 1 : 1 - smooth((phase - fadeStart) / (1 - fadeStart));
      state.visibleCount = Math.min(count, Math.ceil(progress * count));
    }
    ctx.globalAlpha = mask.globalAlpha = state.opacity;
    state.parts.forEach(function (part) {
      // 静态输出按原来的层顺序合成；动态时未选段稍后原样补回。
      if (!part.selected && !isStatic) return;
      var source = partColor(state, part, phase);
      if (!part.selected || motion === 'none') {
        ctx.drawImage(source, 0, 0); mask.drawImage(part.mask, 0, 0);
      } else if (motion === 'typewriter') {
        var visible = Math.max(0, Math.min(part.units.length, state.visibleCount - part.offset));
        if (!visible) return;
        var last = part.units[visible - 1], edge = last.x + last.w;
        strip(ctx, source, 0, edge, 0);
        strip(mask, part.mask, 0, edge, 0);
      } else if (motion === 'wave' || motion === 'bounce') {
        part.units.forEach(function (unit, index) {
          var angle = phase * Math.PI * 2 - (part.offset + index) * 0.55;
          var dy = motion === 'wave' ? Math.sin(angle) * 6 * options.strength : -Math.pow(Math.max(0, Math.sin(angle)), 2) * 9 * options.strength;
          dy *= base.S;
          strip(ctx, source, unit.x, unit.w, dy);
          strip(mask, part.mask, unit.x, unit.w, dy);
        });
      } else if (motion === 'reveal' && progress > 0) {
        ctx.drawImage(source, 0, 0); mask.drawImage(part.mask, 0, 0);
      }
    });
    if (motion === 'reveal' && progress > 0 && progress < 1) {
      var soft = (5 + 15 * options.strength) * base.S;
      var edge = state.revealLeft - soft + progress * (state.revealRight - state.revealLeft + soft * 2);
      feather(ctx, state, edge, soft); feather(mask, state, edge, soft);
    }
    if (!isStatic) {
      // 位移后的选中段可覆盖原段；未选择的另一行不会被着色、裁切或淡出。
      ctx.globalAlpha = mask.globalAlpha = 1;
      ctx.globalCompositeOperation = mask.globalCompositeOperation = 'destination-over';
      state.parts.forEach(function (part) {
        if (part.selected) return;
        ctx.drawImage(part.canvas, 0, 0); mask.drawImage(part.mask, 0, 0);
      });
      ctx.globalCompositeOperation = mask.globalCompositeOperation = 'source-over';
    }
    var scene = state.sceneCtx;
    reset(scene, state.width, state.height);
    scene.drawImage(state.before, 0, 0);
    scene.drawImage(state.current, 0, 0);
    scene.drawImage(state.after, 0, 0);
  }

  function colorize(base, state, phase) {
    var ctx = state.colorCtx, options = state.options, L = base.L;
    reset(ctx, state.width, state.height);
    strip(ctx, base.textLayer, state.left, state.right - state.left, 0);
    if (options.color === 'none' || state.right <= state.left) return;
    var x0 = (options.scope === 'suffix' ? L.bx : L.ax) * base.S;
    var x1 = (options.scope === 'main' ? L.ax + L.wA : L.bx + L.wB) * base.S;
    if (options.scope === 'all' && !L.suffix) x1 = (L.ax + L.wA) * base.S;
    var span = Math.max(1, x1 - x0), gradient, i;
    ctx.save();
    ctx.globalCompositeOperation = 'source-atop';
    if (options.color === 'rainbow') {
      gradient = ctx.createLinearGradient(x0, 0, x0 + span, 0);
      for (i = 0; i <= 8; i++) gradient.addColorStop(i / 8, 'hsl(' + ((phase * 360 + i * 45) % 360).toFixed(2) + ',92%,65%)');
      ctx.fillStyle = gradient;
      ctx.globalAlpha = options.strength * 0.86;
    } else if (options.color === 'aurora') {
      gradient = ctx.createLinearGradient(x0, L.baseline * base.S, x0 + span, (L.baseline - L.fA) * base.S);
      for (i = 0; i <= 4; i++) {
        var hue = 210 + Math.sin(phase * Math.PI * 2 + i * 1.25) * 65;
        gradient.addColorStop(i / 4, 'hsl(' + hue.toFixed(2) + ',85%,70%)');
      }
      ctx.fillStyle = gradient;
      ctx.globalAlpha = options.strength * 0.82;
    } else if (options.color === 'shimmer') {
      var half = Math.max(16 * base.S, span * 0.14);
      var center = x0 - half * 2 + phase * (span + half * 4);
      gradient = ctx.createLinearGradient(center - half, 0, center + half, 0);
      gradient.addColorStop(0, 'rgba(255,235,180,0)');
      gradient.addColorStop(0.40, 'rgba(255,235,180,0.28)');
      gradient.addColorStop(0.50, 'rgba(255,253,235,0.98)');
      gradient.addColorStop(0.60, 'rgba(255,235,180,0.28)');
      gradient.addColorStop(1, 'rgba(255,235,180,0)');
      ctx.fillStyle = gradient;
      ctx.globalAlpha = options.strength;
    } else {
      ctx.fillStyle = TG.mix(base.pal.base, '#ffffff', 0.88);
      ctx.globalAlpha = options.strength * (0.10 + 0.62 * (0.5 - 0.5 * Math.cos(phase * Math.PI * 2)));
    }
    ctx.fillRect(0, 0, state.width, state.height);
    ctx.restore();
  }

  function feather(ctx, state, edge, width) {
    var gradient = ctx.createLinearGradient(edge - width, 0, edge + width, 0);
    gradient.addColorStop(0, '#ffffff'); gradient.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.save(); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'destination-in';
    ctx.fillStyle = gradient; ctx.fillRect(0, 0, state.width, state.height); ctx.restore();
  }
  function addRest(base, state) {
    // 未选中的主字/后缀/分隔符保持原样；位移的文字可自然覆盖其边缘。
    var ctx = state.textCtx, mask = state.maskCtx;
    ctx.globalAlpha = mask.globalAlpha = 1;
    ctx.globalCompositeOperation = mask.globalCompositeOperation = 'destination-over';
    strip(ctx, base.textLayer, 0, state.left, 0);
    strip(ctx, base.textLayer, state.right, state.width - state.right, 0);
    maskStrip(mask, base, 0, state.left);
    maskStrip(mask, base, state.right, state.width - state.right);
    ctx.globalCompositeOperation = mask.globalCompositeOperation = 'source-over';
  }

  function compose(base, state, phase, isStatic) {
    var ctx = state.textCtx, mask = state.maskCtx, opt = state.options;
    var motion = isStatic ? 'none' : opt.motion, count = state.units.length;
    colorize(base, state, phase);
    reset(ctx, state.width, state.height);
    reset(mask, state.width, state.height);
    state.phase = phase; state.visibleCount = count; state.opacity = 1;
    if (motion === 'typewriter' || motion === 'reveal') {
      var progress = motion === 'typewriter' ? TG.clamp((phase - 0.04) / 0.56, 0, 1) : smooth(phase / 0.60);
      var fadeStart = 0.88 - opt.strength * 0.04;
      var opacity = phase <= fadeStart ? 1 : 1 - smooth((phase - fadeStart) / (1 - fadeStart));
      state.opacity = opacity;
      ctx.globalAlpha = mask.globalAlpha = opacity;
      if (motion === 'typewriter') {
        state.visibleCount = Math.min(count, Math.ceil(progress * count));
        var edge = state.visibleCount ? state.units[state.visibleCount - 1].x + state.units[state.visibleCount - 1].w : state.left;
        strip(ctx, state.colored, state.left, edge - state.left, 0);
        maskStrip(mask, base, state.left, edge - state.left);
      } else if (progress > 0) {
        state.visibleCount = Math.min(count, Math.ceil(progress * count));
        strip(ctx, state.colored, state.left, state.right - state.left, 0);
        maskStrip(mask, base, state.left, state.right - state.left);
        if (progress < 1) {
          var soft = (5 + 15 * opt.strength) * base.S;
          var end = state.left - soft + progress * (state.right - state.left + soft * 2);
          feather(ctx, state, end, soft); feather(mask, state, end, soft);
        }
      } else state.visibleCount = 0;
    } else if (motion === 'wave' || motion === 'bounce') {
      state.units.forEach(function (unit, index) {
        var angle = phase * Math.PI * 2 - index * 0.55;
        var dy = motion === 'wave' ? Math.sin(angle) * 6 * opt.strength : -Math.pow(Math.max(0, Math.sin(angle)), 2) * 9 * opt.strength;
        dy *= base.S;
        if (opt.color === 'none') ctx.drawImage(unit.canvas, unit.x, dy);
        else strip(ctx, state.colored, unit.x, unit.w, dy);
        mask.drawImage(unit.mask, unit.x, dy);
      });
    } else {
      strip(ctx, state.colored, state.left, state.right - state.left, 0);
      maskStrip(mask, base, state.left, state.right - state.left);
    }
    addRest(base, state);
    var scene = state.sceneCtx;
    reset(scene, state.width, state.height);
    scene.drawImage(state.before, 0, 0);
    scene.drawImage(state.current, 0, 0);
    scene.drawImage(state.after, 0, 0);
  }

  function draw(base, time, isStatic) {
    var state = base.textAnimation;
    if (!state) return base;
    if (isStatic && state.staticView) return state.staticView;
    var phase = isStatic ? 0.5 : phaseAt(time, 2400 / state.options.speed);
    var key = isStatic ? 'static' : phase;
    if (state.key !== key) {
      if (state.production && !isStatic) composeProduction(base, state, phase);
      else if (state.multiPart) composeParts(base, state, phase, !!isStatic);
      else compose(base, state, phase, !!isStatic);
      state.key = key;
    }
    if (isStatic) {
      // 静态结果有独立缓存，不会在下一次预览帧更新时被覆盖。
      var canvas = TG.newCanvas(state.width, state.height);
      canvas.getContext('2d').drawImage(state.scene, 0, 0);
      state.staticView = {
        canvas: canvas, mask: base.fullMask, item: base.item, stack: base.stack,
        S: base.S, pal: base.pal, L: base.L, layer: base.layer, glow: base.glow
      };
      return state.staticView;
    }
    return state.view;
  }

  TG.textAnimation = {
    normalize: normalize, validate: validate, active: active, duration: duration,
    colors: COLORS, motions: MOTIONS, prepare: prepare, draw: draw
  };
})(window);
