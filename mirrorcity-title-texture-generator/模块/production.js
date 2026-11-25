/* ============================================================
 * production.js — 动画精灵图 PNG / 帧数据 / 配置 ZIP
 * 只消费 TITLEGEN 的帧序列快照；不修改编辑状态、不发起下载。
 * 任务锁由调用方持有，取消在每帧及 PNG / ZIP 编码后检查。
 * ============================================================ */
(function () {
  'use strict';
  var TG = window.TG, api = window.TITLEGEN, own = Object.prototype.hasOwnProperty;
  var COLUMNS = [0, 1, 2, 4, 8], PADDING = [0, 2, 4, 8], SCALES = [1, 1.5, 2];
  var MAX_SIDE = 8192, MAX_PIXELS = 16777216;
  var IMAGE_NAME = 'spritesheet.png', META_NAME = 'spritesheet.json', CONFIG_NAME = '本次配置.json';

  function record(value) { return !!value && typeof value === 'object' && !Array.isArray(value); }
  function has(value, key) { return own.call(value, key); }
  function copy(value) { return JSON.parse(JSON.stringify(value)); }
  function optionError(message) {
    var error = new TypeError(message); error.code = 'INVALID_SPRITE_OPTION'; return error;
  }
  function settings(raw, cfg) {
    if (raw === undefined) raw = {};
    if (!record(raw)) throw optionError('精灵图设置必须是对象');
    Object.keys(raw).forEach(function (key) {
      if (['columns', 'padding', 'scale', 'frames', 'delayMs'].indexOf(key) < 0) throw optionError('无法识别的精灵图设置：' + key);
    });
    var options = cfg.options || {};
    var out = {
      columns: has(raw, 'columns') ? raw.columns : (options.spriteColumns === undefined ? 0 : options.spriteColumns),
      padding: has(raw, 'padding') ? raw.padding : (options.spritePadding === undefined ? 2 : options.spritePadding),
      scale: has(raw, 'scale') ? raw.scale : (options.spriteScale === undefined ? 1 : options.spriteScale),
      frames: has(raw, 'frames') ? raw.frames : options.frames,
      delayMs: has(raw, 'delayMs') ? raw.delayMs : options.delayMs
    };
    if (COLUMNS.indexOf(out.columns) < 0) throw optionError('精灵图列数必须是自动、1、2、4 或 8');
    if (PADDING.indexOf(out.padding) < 0) throw optionError('精灵图间隔必须是 0、2、4 或 8 像素');
    if (SCALES.indexOf(out.scale) < 0) throw optionError('精灵图倍率必须是 1、1.5 或 2');
    if (!Number.isInteger(out.frames) || out.frames < 1 || out.frames > 120) throw optionError('精灵图帧数必须是 1 到 120 的整数');
    if (!Number.isInteger(out.delayMs) || out.delayMs < 20 || out.delayMs > 2000) throw optionError('精灵图基础帧间隔必须是 20 到 2000 毫秒的整数');
    return out;
  }
  function renderOptions(opts) { return { scale: opts.scale, frames: opts.frames, delayMs: opts.delayMs }; }
  function geometry(columns, count, width, height, padding) {
    columns = Math.min(columns, count);
    var rows = Math.ceil(count / columns);
    var w = columns * width + (columns + 1) * padding;
    var h = rows * height + (rows + 1) * padding;
    return { columns: columns, rows: rows, width: w, height: h, pixels: w * h };
  }
  function fits(value) { return value.width <= MAX_SIDE && value.height <= MAX_SIDE && value.pixels <= MAX_PIXELS; }
  function limitError(value, automatic) {
    var message;
    if (value.pixels > MAX_PIXELS) message = '精灵图共 ' + value.pixels.toLocaleString() + ' 像素，超过 ' + MAX_PIXELS.toLocaleString() + ' 像素上限，请减少帧数或倍率。';
    else message = '精灵图尺寸 ' + value.width + ' × ' + value.height + ' 超过单边 ' + MAX_SIDE + ' 像素上限，请' + (automatic ? '减少帧数或倍率。' : '调整列数或降低倍率。');
    var error = new RangeError(message); error.code = 'SPRITE_SHEET_LIMIT';
    error.dimensions = copy(value); error.limits = { maxSide: MAX_SIDE, maxPixels: MAX_PIXELS };
    return error;
  }
  function makePlan(opts, timing) {
    var count = timing.frames, frameWidth = Math.round(TG.W * opts.scale), frameHeight = Math.round(TG.H * opts.scale);
    if (!Number.isInteger(count) || count < 1 || count > 120 || frameWidth < 1 || frameHeight < 1) throw new Error('动画帧尺寸或数量无效');
    var chosen;
    if (opts.columns === 0) {
      var seen = {}, candidates = [1, 2, 4, 8].map(function (columns) { return geometry(columns, count, frameWidth, frameHeight, opts.padding); }).filter(function (candidate) {
        if (seen[candidate.columns]) return false; seen[candidate.columns] = true; return true;
      });
      var valid = candidates.filter(fits);
      if (!valid.length) {
        candidates.sort(function (a, b) { return a.pixels - b.pixels || Math.max(a.width, a.height) - Math.max(b.width, b.height); });
        throw limitError(candidates[0], true);
      }
      valid.sort(function (a, b) {
        return Math.abs(Math.log(a.width / a.height)) - Math.abs(Math.log(b.width / b.height)) || a.pixels - b.pixels || a.columns - b.columns;
      });
      chosen = valid[0];
    } else {
      chosen = geometry(opts.columns, count, frameWidth, frameHeight, opts.padding);
      if (!fits(chosen)) throw limitError(chosen, false);
    }
    return {
      width: chosen.width, height: chosen.height, frameWidth: frameWidth, frameHeight: frameHeight,
      frameCount: count, columns: chosen.columns, rows: chosen.rows, padding: opts.padding, scale: opts.scale,
      requestedColumns: opts.columns, automaticColumns: opts.columns === 0,
      pixels: chosen.pixels, rgbaBytes: chosen.pixels * 4, total: count + 2,
      timing: copy(timing), limits: { maxSide: MAX_SIDE, maxPixels: MAX_PIXELS }
    };
  }
  function estimateSpriteSheet(raw) {
    var cfg = api.config(), opts = settings(raw, cfg);
    return makePlan(opts, api.gifTiming(renderOptions(opts)));
  }
  function metadata(sequence, plan) {
    var source = sequence.item || {}, config = sequence.config;
    if (sequence.width !== plan.frameWidth || sequence.height !== plan.frameHeight || sequence.samples.length !== plan.frameCount) throw new Error('精灵图快照尺寸或帧数与估算不一致');
    var frames = sequence.samples.map(function (sample, index) {
      return {
        filename: 'frame_' + String(index).padStart(4, '0'), index: index,
        frame: { x: plan.padding + (index % plan.columns) * (plan.frameWidth + plan.padding),
          y: plan.padding + Math.floor(index / plan.columns) * (plan.frameHeight + plan.padding), w: plan.frameWidth, h: plan.frameHeight },
        rotated: false, trimmed: false,
        spriteSourceSize: { x: 0, y: 0, w: plan.frameWidth, h: plan.frameHeight },
        sourceSize: { w: plan.frameWidth, h: plan.frameHeight },
        duration: plan.timing.delayMs, startMs: index * plan.timing.delayMs,
        sample: { phase: sample.phase, frameIndex: sample.frameIndex, t: sample.t, textTime: sample.textTime, loopPhase: sample.loopPhase }
      };
    });
    return {
      kind: 'mirrorcity-titlegen-spritesheet', version: 1, frames: frames,
      meta: {
        app: 'mirrorcity-titlegen', image: IMAGE_NAME, config: CONFIG_NAME, format: 'RGBA8888',
        size: { w: plan.width, h: plan.height }, frameSize: { w: plan.frameWidth, h: plan.frameHeight },
        scale: String(plan.scale), columns: plan.columns, rows: plan.rows, padding: plan.padding,
        origin: 'top-left', order: 'row-major', loop: 0, durationMs: plan.timing.durationMs,
        timing: copy(plan.timing),
        title: { familyId: config.familyId, key: source.key || '', main: source.main || '', suffix: source.suffix || '', label: sequence.label }
      }
    };
  }
  function requireCapture() {
    if (typeof api.captureSequence !== 'function') throw new Error('帧序列接口未加载，请刷新页面');
  }
  function capture(idxOrKey, raw) {
    requireCapture();
    var cfg = api.config(), opts = settings(raw, cfg);
    // Reject invalid/oversized output before allocating even the frame base.
    makePlan(opts, api.gifTiming(renderOptions(opts)));
    var sequence = api.captureSequence(idxOrKey, renderOptions(opts));
    try { return { sequence: sequence, plan: makePlan(opts, sequence.timing) }; }
    catch (error) { if (sequence.dispose) sequence.dispose(); throw error; }
  }
  function spriteSheetMetadata(idxOrKey, raw) {
    var captured = capture(idxOrKey, raw);
    try { return metadata(captured.sequence, captured.plan); }
    finally { if (captured.sequence.dispose) captured.sequence.dispose(); }
  }
  function controlOptions(raw) {
    if (raw === undefined) return {};
    if (!record(raw)) throw optionError('精灵图任务控制必须是对象');
    Object.keys(raw).forEach(function (key) { if (key !== 'token' && key !== 'onProgress') throw optionError('无法识别的任务控制：' + key); });
    if (raw.onProgress !== undefined && typeof raw.onProgress !== 'function') throw optionError('onProgress 必须是函数');
    if (raw.token != null && (!record(raw.token) || !TG.jobs || typeof TG.jobs.cancelled !== 'function')) throw optionError('导出任务令牌无效');
    return raw;
  }
  function cancelled(control) {
    if (control.token != null && TG.jobs.cancelled(control.token)) {
      var error = new Error('已取消精灵图导出'); error.name = 'AbortError'; error.code = 'SPRITE_EXPORT_CANCELLED'; throw error;
    }
  }
  function report(control, plan, phase, done, message) {
    if (control.token != null) TG.jobs.progress(control.token, done, message);
    if (control.onProgress) control.onProgress({ phase: phase, done: done, total: plan.total, message: message });
    cancelled(control);
  }
  async function checkpoint(control) {
    await new Promise(function (resolve) { setTimeout(resolve, 10); });
    cancelled(control);
  }
  function pngBlob(canvas) {
    return new Promise(function (resolve, reject) {
      if (typeof canvas.toBlob !== 'function') { reject(new Error('浏览器不支持 PNG 图片编码')); return; }
      canvas.toBlob(function (blob) {
        if (!blob) reject(new Error('无法编码该尺寸的精灵图，请减少帧数或倍率'));
        else resolve(blob);
      }, 'image/png');
    });
  }
  async function spriteSheetZip(idxOrKey, raw, rawControl) {
    var control = controlOptions(rawControl), sequence = null, canvas = null;
    cancelled(control);
    if (typeof TG.zip !== 'function') throw new Error('ZIP 模块未加载');
    var captured = capture(idxOrKey, raw), plan = captured.plan;
    sequence = captured.sequence;
    try {
      var sheet = metadata(sequence, plan);
      report(control, plan, 'prepare', 0, '准备精灵图 · ' + plan.frameCount + ' 帧 · ' + plan.width + ' × ' + plan.height);
      await checkpoint(control);
      canvas = document.createElement('canvas'); canvas.width = plan.width; canvas.height = plan.height;
      if (canvas.width !== plan.width || canvas.height !== plan.height) throw new Error('浏览器无法创建该尺寸的精灵图');
      var ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('浏览器无法创建精灵图画布');
      for (var i = 0; i < plan.frameCount; i++) {
        cancelled(control);
        var frame = sequence.renderFrame(i), rect = sheet.frames[i].frame;
        if (!frame || frame.width !== rect.w || frame.height !== rect.h) throw new Error('第 ' + (i + 1) + ' 帧尺寸无效');
        // renderFrame returns a borrowed canvas. Copy it before rendering or
        // yielding again; do not retain its pixels as a future frame source.
        ctx.drawImage(frame, rect.x, rect.y);
        report(control, plan, 'frames', i + 1, '精灵图 · 已绘制 ' + (i + 1) + '/' + plan.frameCount + ' 帧');
        await checkpoint(control);
      }
      report(control, plan, 'png', plan.frameCount, '正在编码精灵图 PNG…');
      var blob = await pngBlob(canvas);
      cancelled(control);
      var png = new Uint8Array(await blob.arrayBuffer());
      cancelled(control);
      report(control, plan, 'png', plan.frameCount + 1, 'PNG 已生成，准备打包帧数据与配置…');
      await checkpoint(control);
      var enc = new TextEncoder();
      var bytes = TG.zip([
        { name: IMAGE_NAME, data: png },
        { name: META_NAME, data: enc.encode(JSON.stringify(sheet, null, 2)) },
        { name: CONFIG_NAME, data: enc.encode(JSON.stringify(sequence.config, null, 2)) }
      ]);
      // ZIP is synchronous. A queued cancel must still prevent the caller from
      // receiving a completed package after the final synchronous operation.
      await checkpoint(control);
      report(control, plan, 'complete', plan.total, '精灵图已打包 · ' + plan.frameCount + ' 帧');
      return { bytes: bytes, name: api.safeFileName(sequence.label + '_动画精灵图.zip'), metadata: sheet, plan: plan };
    } finally {
      if (canvas) canvas.width = canvas.height = 1;
      if (sequence && sequence.dispose) sequence.dispose();
    }
  }

  TG.production = { estimateSpriteSheet: estimateSpriteSheet, spriteSheetMetadata: spriteSheetMetadata, spriteSheetZip: spriteSheetZip,
    limits: Object.freeze({ maxSide: MAX_SIDE, maxPixels: MAX_PIXELS }) };
  api.estimateSpriteSheet = estimateSpriteSheet;
  api.spriteSheetMetadata = spriteSheetMetadata;
  api.spriteSheetZip = spriteSheetZip;
})();
