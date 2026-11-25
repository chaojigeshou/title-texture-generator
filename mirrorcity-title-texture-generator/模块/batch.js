/* ============================================================
 * batch.js — 独立批量文案清单、逐行校验与当前样式打包
 * 不增加 family，不修改选中称号，不调用 set / loadConfig。
 * 任务锁、进度面板与下载由调用方管理；本模块只生成完整 ZIP。
 * ============================================================ */
(function (global) {
  'use strict';
  var TG = global.TG, own = Object.prototype.hasOwnProperty;
  var FIELDS = Object.freeze([
    Object.freeze({ key: 'main', label: '主字', maxLength: 32 }),
    Object.freeze({ key: 'suffix', label: '后缀', maxLength: 24 }),
    Object.freeze({ key: 'en', label: '英文', maxLength: 96 }),
    Object.freeze({ key: 'desc', label: '说明', maxLength: 160 }),
    Object.freeze({ key: 'mark', label: '徽记', maxLength: 8 }),
    Object.freeze({ key: 'code', label: '编号', maxLength: 40 }),
    Object.freeze({ key: 'color', label: '颜色' })
  ]);
  var DEFAULTS = Object.freeze({ main: '', suffix: '', en: '', desc: '', mark: '', code: '', color: '#ffd75e' });
  var LIMITS = Object.freeze({ items: 32, text: 32768, totalPixels: 128 * 1024 * 1024,
    itemPixels: 16 * 1024 * 1024, outputBytes: 64 * 1024 * 1024 });
  var exporting = false;

  function has(value, key) { return !!value && own.call(value, key); }
  function record(value) { return !!value && typeof value === 'object' && !Array.isArray(value); }
  function clone(value) { return JSON.parse(JSON.stringify(value)); }
  function errorDetail(line, column, field, code, message) {
    return { line: line || 0, column: column || 0, field: field || '', code: code, message: message };
  }
  function fail(message, errors, name) {
    var error = new Error(message);
    error.name = name || 'BatchValidationError'; error.errors = errors || [];
    return error;
  }
  function malformedUnicode(value) {
    for (var i = 0; i < value.length; i++) {
      var n = value.charCodeAt(i);
      if (n >= 0xd800 && n <= 0xdbff) {
        var next = value.charCodeAt(++i);
        if (!(next >= 0xdc00 && next <= 0xdfff)) return true;
      } else if (n >= 0xdc00 && n <= 0xdfff) return true;
    }
    return false;
  }
  function fieldError(value, field, line, column) {
    if (typeof value !== 'string') return errorDetail(line, column, field.key, 'type', field.label + '必须是文字');
    if (field.key === 'color') {
      if (!/^#[0-9a-f]{6}$/i.test(value)) return errorDetail(line, column, field.key, 'color', '颜色必须是 #RRGGBB，例如 #ffd75e；空颜色不能导出');
      return null;
    }
    if (value.length > field.maxLength) return errorDetail(line, column, field.key, 'length', field.label + '最多 ' + field.maxLength + ' 个长度单位，当前为 ' + value.length);
    if (/[\x00-\x1f\x7f\u2028\u2029]/.test(value)) return errorDetail(line, column, field.key, 'control', field.label + '不能含制表符、换行或控制字符');
    if (malformedUnicode(value)) return errorDetail(line, column, field.key, 'unicode', field.label + '含不完整的 Unicode 字符');
    return null;
  }
  function normalize(raw) {
    raw = record(raw) ? raw : {};
    var defaults = {}, source = record(raw.defaults) ? raw.defaults : {};
    FIELDS.forEach(function (field) { defaults[field.key] = typeof source[field.key] === 'string' ? source[field.key] : DEFAULTS[field.key]; });
    return { text: typeof raw.text === 'string' ? raw.text : '', format: raw.format === 'tsv' ? 'tsv' : 'lines', defaults: defaults };
  }
  function validate(raw) {
    if (raw === undefined) return normalize();
    if (!record(raw)) throw fail('批量清单必须是对象');
    var errors = [];
    Object.keys(raw).forEach(function (key) {
      if (['text', 'format', 'defaults'].indexOf(key) < 0) errors.push(errorDetail(0, 0, key, 'unknown', '无法识别的批量清单字段：' + key));
    });
    if (has(raw, 'text') && typeof raw.text !== 'string') errors.push(errorDetail(0, 0, 'text', 'type', '批量文案必须是文字'));
    if (typeof raw.text === 'string' && raw.text.length > LIMITS.text) errors.push(errorDetail(0, 0, 'text', 'length', '批量输入最多 ' + LIMITS.text + ' 个长度单位'));
    if (has(raw, 'format') && raw.format !== 'lines' && raw.format !== 'tsv') errors.push(errorDetail(0, 0, 'format', 'format', '批量格式只能是 lines 或 tsv'));
    if (has(raw, 'defaults')) {
      if (!record(raw.defaults)) errors.push(errorDetail(0, 0, 'defaults', 'type', '批量默认值必须是对象'));
      else {
        Object.keys(raw.defaults).forEach(function (key) {
          if (!FIELDS.some(function (field) { return field.key === key; })) errors.push(errorDetail(0, 0, 'defaults.' + key, 'unknown', '无法识别的默认字段：' + key));
        });
        FIELDS.forEach(function (field, i) {
          if (!has(raw.defaults, field.key)) return;
          var detail = fieldError(raw.defaults[field.key], field, 0, i + 1);
          if (detail) { detail.field = 'defaults.' + field.key; errors.push(detail); }
        });
      }
    }
    if (errors.length) throw fail(errors[0].message, errors);
    // Invalid work-in-progress rows remain valid configuration data. parse()
    // diagnoses them and exportZip() refuses them before any rendering.
    return normalize(raw);
  }
  function parse(raw) {
    var cfg;
    try { cfg = validate(raw); }
    catch (error) { return { ok: false, empty: true, items: [], rows: [], errors: error.errors && error.errors.length ? error.errors : [errorDetail(0, 0, '', 'schema', error.message)], ignoredBlankLines: 0, totalRows: 0 }; }
    var text = cfg.text.replace(/^\ufeff/, '').replace(/\r\n?/g, '\n');
    var lines = text ? text.split('\n') : [], rows = [], items = [], errors = [], ignored = 0, total = 0, firstOverflow = 0;
    lines.forEach(function (line, index) {
      if (!line.trim()) { ignored++; return; }
      total++;
      if (total > LIMITS.items) { if (!firstOverflow) firstOverflow = index + 1; return; }
      var columns = cfg.format === 'tsv' ? line.split('\t') : [line];
      var item = {}, rowErrors = [];
      if (columns.length > FIELDS.length) rowErrors.push(errorDetail(index + 1, FIELDS.length + 1, '', 'columns', 'TSV 最多 7 列；请检查多余制表符（不支持单元格内制表符或换行）'));
      FIELDS.forEach(function (field, column) {
        item[field.key] = column < columns.length ? columns[column] : cfg.defaults[field.key];
        var detail = fieldError(item[field.key], field, index + 1, column + 1);
        if (detail) {
          if (cfg.format === 'lines' && column === 0 && line.indexOf('\t') >= 0) detail.message = '这行含制表符，请切换为 TSV 格式';
          rowErrors.push(detail);
        }
      });
      if (!item.main.trim() && !item.suffix.trim()) rowErrors.push(errorDetail(index + 1, 1, 'main', 'empty_title', '主字和后缀不能同时为空'));
      rows.push({ line: index + 1, number: total, item: item, errors: rowErrors, valid: !rowErrors.length });
      if (!rowErrors.length) items.push(item);
      Array.prototype.push.apply(errors, rowErrors);
    });
    if (firstOverflow) errors.push(errorDetail(firstOverflow, 0, '', 'rows', '每批最多 ' + LIMITS.items + ' 条，当前有 ' + total + ' 条；请拆成多批'));
    return { ok: !errors.length && total > 0, empty: total === 0, items: items, rows: rows,
      errors: errors, ignoredBlankLines: ignored, totalRows: total };
  }
  function serialize(items, format) {
    format = format === undefined ? 'tsv' : format;
    if (format !== 'lines' && format !== 'tsv') throw fail('批量格式只能是 lines 或 tsv');
    if (!Array.isArray(items) || items.length > LIMITS.items) throw fail('工作清单必须是最多 ' + LIMITS.items + ' 条的数组');
    return items.map(function (item, index) {
      if (!record(item)) throw fail('第 ' + (index + 1) + ' 条文案必须是对象');
      var values = FIELDS.map(function (field, column) {
        var value = has(item, field.key) ? item[field.key] : DEFAULTS[field.key];
        var detail = fieldError(value, field, index + 1, column + 1);
        if (detail) throw fail(detail.message, [detail]);
        return value;
      });
      if (!values[0].trim() && !values[1].trim()) throw fail('第 ' + (index + 1) + ' 条的主字和后缀不能同时为空');
      if (format === 'lines' && !values[0].trim()) throw fail('只有后缀的条目需要使用 TSV 格式');
      return format === 'lines' ? values[0] : values.join('\t');
    }).join('\n');
  }

  function formatsOf(raw) {
    if (raw === undefined) return ['png', 'icon'];
    if (!Array.isArray(raw)) throw fail('批量输出格式必须是数组');
    if (raw.length === 1 && raw[0] === 'gif') return ['gif'];
    if (raw.length === 2 && raw.indexOf('png') >= 0 && raw.indexOf('icon') >= 0) return ['png', 'icon'];
    throw fail('请选择 PNG 与图标，或单独 GIF');
  }
  function positiveInteger(value) { return Number.isInteger(value) && value > 0; }
  function makePlan(raw, options) {
    options = options || {};
    var parsed = parse(raw), formats = formatsOf(options.formats), cfg = validate(raw);
    if (!parsed.ok) return { ok: false, empty: parsed.empty, errors: parsed.errors, count: parsed.totalRows, items: parsed.items, formats: formats, limits: LIMITS };
    var api = global.TITLEGEN;
    if (!api || typeof api.captureItem !== 'function' || typeof api.config !== 'function') throw fail('批量绘制接口尚未加载');
    var config = clone(options.config === undefined ? api.config() : options.config);
    if (!record(config) || !record(config.options)) throw fail('批量输出需要完整的配置快照');
    config.batch = cfg;
    var gif = formats[0] === 'gif', scale = gif ? config.options.gifScale : config.options.scale;
    var capture = api.captureItem(parsed.items[0], { config: config, scale: scale });
    var width, height, timing, samples;
    try {
      width = capture.width; height = capture.height; timing = clone(capture.timing); samples = clone(capture.samples);
      if (!positiveInteger(width) || !positiveInteger(height) || !timing || !positiveInteger(timing.frames) || timing.frames > 120 || !Number.isFinite(timing.delayMs) || timing.delayMs < 20) throw fail('捕获接口返回了无效的图像尺寸或时序');
      if (!Array.isArray(samples) || samples.length !== timing.frames) throw fail('捕获接口返回了不完整的帧采样');
      config = clone(capture.config); config.batch = cfg;
    } finally { if (capture && typeof capture.dispose === 'function') capture.dispose(); }
    var iconSize = config.options.iconSize;
    if (formats.indexOf('icon') >= 0 && (!positiveInteger(iconSize) || iconSize > 4096)) throw fail('图标尺寸无效');
    var framePixels = width * height, itemPixels = gif ? framePixels * timing.frames : framePixels + iconSize * iconSize;
    var rawPixels = itemPixels * parsed.items.length, errors = [];
    if (itemPixels > LIMITS.itemPixels) errors.push(errorDetail(0, 0, '', 'item_pixels', '单条原始像素过多，请降低倍率或帧数'));
    if (rawPixels > LIMITS.totalPixels) errors.push(errorDetail(0, 0, '', 'total_pixels', '本批原始像素过多，请减少条目、倍率或帧数'));
    return { ok: !errors.length, errors: errors, count: parsed.items.length, items: parsed.items, rows: parsed.rows,
      formats: formats, outputFiles: parsed.items.length * formats.length, total: parsed.items.length * formats.length + 3,
      width: width, height: height, iconSize: iconSize, frames: gif ? timing.frames : 1,
      framePixels: framePixels, itemPixels: itemPixels, rawPixels: rawPixels, rawBytes: rawPixels * 4,
      limits: LIMITS, timing: timing, samples: samples, config: config, scale: scale, batch: cfg };
  }
  function estimate(raw, options) {
    try {
      var plan = makePlan(raw, options);
      var out = Object.assign({}, plan); delete out.config; delete out.batch; delete out.samples; delete out.rows;
      return out;
    } catch (error) {
      return { ok: false, errors: error.errors && error.errors.length ? error.errors : [errorDetail(0, 0, '', 'estimate', error.message)], limits: LIMITS };
    }
  }
  function abortIfNeeded(token) {
    if (token && TG.jobs && TG.jobs.cancelled(token)) throw fail('已取消批量导出，未生成下载包', [], 'AbortError');
  }
  function yieldTask() { return new Promise(function (resolve) { setTimeout(resolve, 0); }); }
  function verifyCanvas(canvas, width, height) {
    if (!canvas || canvas.width !== width || canvas.height !== height || typeof canvas.getContext !== 'function') throw fail('捕获画布尺寸与预检不一致', [], 'BatchExportError');
  }
  function canvasBytes(canvas, remaining) {
    return new Promise(function (resolve, reject) {
      if (typeof canvas.toBlob !== 'function') { reject(fail('当前浏览器不支持 PNG 编码', [], 'BatchExportError')); return; }
      canvas.toBlob(function (blob) {
        if (!blob) { reject(fail('PNG 编码失败', [], 'BatchExportError')); return; }
        if (blob.size > remaining) { reject(fail('批量 ZIP 超过 64 MiB，请拆成多批或降低输出设置', [], 'BatchLimitError')); return; }
        blob.arrayBuffer().then(function (buffer) { resolve(new Uint8Array(buffer)); }, reject);
      }, 'image/png');
    });
  }
  function fileStem(item, number) {
    var label = item.main + (item.suffix || '') || '称号';
    var api = global.TITLEGEN;
    label = api && typeof api.safeFileName === 'function' ? api.safeFileName(label) : label.replace(/[\\/:*?"<>|\x00-\x1f]+/g, '_').replace(/[. ]+$/, '') || '称号';
    return String(number).padStart(2, '0') + '_' + label;
  }

  async function exportZip(raw, options) {
    options = options || {};
    if (exporting) throw fail('已有批量打包正在进行，请等待完成或取消', [], 'BatchBusyError');
    if (options.onProgress !== undefined && typeof options.onProgress !== 'function') throw fail('进度回调必须是函数');
    if (TG.jobs && TG.jobs.isBusy() && (!options.token || TG.jobs.status().id !== options.token.id)) throw fail('请等待当前导出结束后再开始批量打包', [], 'BatchBusyError');
    exporting = true;
    try {
      abortIfNeeded(options.token);
      var plan = makePlan(raw, options);
      if (!plan.ok) throw fail(plan.errors.length ? plan.errors[0].message : '请先填写至少一条有效文案', plan.errors);
      if (typeof TG.zip !== 'function') throw fail('ZIP 组件尚未加载', [], 'BatchExportError');
      if (plan.formats[0] === 'gif' && (!global.GIFEncoder || typeof global.GIFEncoder.encode !== 'function')) throw fail('GIF 编码组件尚未加载', [], 'BatchExportError');
      var api = global.TITLEGEN, encoder = new TextEncoder(), files = [], zipBytes = 22, done = 0;
      var manifest = { kind: 'mirrorcity-titlegen-batch-manifest', version: 1, createdAt: new Date().toISOString(),
        columns: FIELDS.map(function (field) { return field.key; }), formats: plan.formats.slice(),
        configFile: '本次配置.json', worklistFile: '工作清单.tsv', count: plan.count,
        rawPixels: plan.rawPixels, rawBytes: plan.rawBytes, options: clone(plan.config.options),
        timing: plan.formats[0] === 'gif' ? clone(plan.timing) : null,
        samples: plan.formats[0] === 'gif' ? clone(plan.samples) : [], items: [] };
      function progress(message, row, format, stage) {
        if (options.onProgress) options.onProgress({ done: done, total: plan.total, message: message, row: row || 0, format: format || '', stage: stage || 'render' });
      }
      function append(name, data) {
        if (!(data instanceof Uint8Array)) data = new Uint8Array(data);
        var cost = data.byteLength + 76 + encoder.encode(name).length * 2;
        if (zipBytes + cost > LIMITS.outputBytes) throw fail('批量 ZIP 超过 64 MiB，请拆成多批或降低输出设置', [], 'BatchLimitError');
        files.push({ name: name, data: data }); zipBytes += cost;
      }
      progress('准备生成 ' + plan.count + ' 条批量文案', 0, '', 'prepare');
      for (var i = 0; i < plan.items.length; i++) {
        await yieldTask(); abortIfNeeded(options.token);
        var item = plan.items[i], capture = null, stem = fileStem(item, i + 1);
        var entry = { number: i + 1, line: plan.rows[i].line, item: clone(item), files: [] };
        try {
          capture = api.captureItem(item, { config: plan.config, scale: plan.scale });
          for (var j = 0; j < plan.formats.length; j++) {
            abortIfNeeded(options.token);
            var format = plan.formats[j], bytes, canvas, name, detail;
            progress('正在生成第 ' + (i + 1) + '/' + plan.count + ' 条 · ' + format.toUpperCase(), i + 1, format);
            if (format === 'gif') {
              var frames = [];
              try {
                for (var frame = 0; frame < plan.timing.frames; frame++) {
                  abortIfNeeded(options.token);
                  canvas = capture.renderFrame(frame); verifyCanvas(canvas, plan.width, plan.height);
                  frames.push({ data: canvas.getContext('2d').getImageData(0, 0, canvas.width, canvas.height).data, w: canvas.width, h: canvas.height });
                  if (frame % 4 === 3) { await yieldTask(); abortIfNeeded(options.token); }
                }
                var transparent = plan.config.stack.bg === 'transparent';
                bytes = global.GIFEncoder.encode({ width: plan.width, height: plan.height, frames: frames,
                  transparent: transparent, delayMs: plan.timing.delayMs, loop: 0,
                  maxColors: Math.max(16, Math.min(256, plan.config.options.colors) - (transparent ? 1 : 0)), bg: [7, 11, 18] });
              } finally { frames.length = 0; }
              name = 'GIF/' + stem + '.gif';
              detail = { file: name, format: format, width: plan.width, height: plan.height, bytes: bytes.byteLength,
                frames: plan.timing.frames, delayMs: plan.timing.delayMs, durationMs: plan.timing.durationMs, loop: 0, transparent: transparent };
            } else {
              var width = format === 'icon' ? plan.iconSize : plan.width, height = format === 'icon' ? plan.iconSize : plan.height;
              canvas = format === 'icon' ? capture.renderIcon(plan.iconSize) : capture.renderStatic();
              verifyCanvas(canvas, width, height);
              bytes = await canvasBytes(canvas, LIMITS.outputBytes - zipBytes);
              name = (format === 'icon' ? '图标/' : 'PNG/') + stem + '.png';
              detail = { file: name, format: format, width: width, height: height, bytes: bytes.byteLength, frames: 1 };
            }
            abortIfNeeded(options.token);
            append(name, bytes); entry.files.push(detail); done++;
            progress('已完成 ' + done + '/' + plan.outputFiles + ' 张贴图', i + 1, format);
          }
          manifest.items.push(entry);
        } catch (error) {
          if (error.name !== 'AbortError') {
            error.message = '第 ' + (i + 1) + ' 条（源文本第 ' + plan.rows[i].line + ' 行）：' + error.message;
            error.row = i + 1; error.line = plan.rows[i].line;
          }
          throw error;
        } finally { if (capture && typeof capture.dispose === 'function') capture.dispose(); }
      }
      abortIfNeeded(options.token);
      append('工作清单.tsv', encoder.encode(serialize(plan.items, 'tsv'))); done++; progress('已写入工作清单', 0, '', 'package');
      append('本次配置.json', encoder.encode(JSON.stringify(plan.config, null, 2))); done++; progress('已写入本次配置', 0, '', 'package');
      append('批次manifest.json', encoder.encode(JSON.stringify(manifest, null, 2))); done++; progress('正在组装完整 ZIP', 0, '', 'package');
      await yieldTask(); abortIfNeeded(options.token);
      var zip = TG.zip(files);
      if (zip.byteLength > LIMITS.outputBytes) throw fail('批量 ZIP 超过 64 MiB，请拆成多批或降低输出设置', [], 'BatchLimitError');
      await yieldTask(); abortIfNeeded(options.token);
      progress('完整 ZIP 已生成', 0, '', 'complete');
      return { bytes: zip, name: '批量称号_' + plan.count + '条_' + (plan.formats[0] === 'gif' ? 'GIF' : 'PNG图标') + '.zip',
        count: plan.count, success: plan.outputFiles, files: files.length, manifest: manifest };
    } finally { exporting = false; }
  }

  TG.batch = { fields: FIELDS, limits: LIMITS, defaults: DEFAULTS,
    normalize: normalize, validate: validate, parse: parse, serialize: serialize,
    estimate: estimate, exportZip: exportZip };
})(window);
