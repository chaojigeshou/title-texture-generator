/* ============================================================
 * app.js — 界面与导出
 *   模板画廊 / 模块叠加编辑器 / 家族切换 / 实时预览 / PNG·GIF·海报导出
 * ============================================================ */
(function () {
  'use strict';
  var TG = window.TG;
  var $ = function (sel) { return document.querySelector(sel); };
  var $$ = function (sel) { return Array.prototype.slice.call(document.querySelectorAll(sel)); };

  var state = {
    familyId: 'prophet',
    templateId: 't_fixer',
    stack: null,
    dirty: false
  };
  state.stack = canonicalStack(TG.template('t_fixer').stack);
  state.familyId = TG.template('t_fixer').family;

  var cards = [];
  var iconCards = [];
  var changeRevision = 0;
  var lastSnapshot = '';
  var OPTION_FIELDS = { scale: 'optScale', frames: 'optFrames', delayMs: 'optDelay', gifScale: 'optGifScale', colors: 'optColors', iconSize: 'optIconSize', spriteColumns: 'optSpriteColumns', spritePadding: 'optSpritePadding', spriteScale: 'optSpriteScale', batchOutput: 'batchOutputKind' };
  var OPTION_VALUES = { scale: [1, 2, 3], frames: [8, 12, 16, 24, 32], delayMs: [40, 60, 80, 100], gifScale: [1, 1.5, 2], colors: [64, 128, 192, 256], iconSize: [128, 256, 384, 512], spriteColumns: [0, 1, 2, 4, 8], spritePadding: [0, 2, 4, 8], spriteScale: [1, 1.5, 2], batchOutput: [0, 1] };
  var OPTION_DEFAULTS = { scale: 2, frames: 16, delayMs: 60, gifScale: 1, colors: 128, iconSize: 256, spriteColumns: 0, spritePadding: 2, spriteScale: 1, batchOutput: 0 };
  var CUSTOM_LIMITS = { main: 32, suffix: 24, en: 96, desc: 160, mark: 8, code: 40 };

  function canonicalStack(raw) {
    var stack = JSON.parse(JSON.stringify(raw));
    if (!TG.get('layout', stack.layout)) stack.layout = 'inline';
    if (TG.textAnimation) stack.textAnim = TG.textAnimation.normalize(stack.textAnim);
    stack.moduleParams = TG.moduleParams ? TG.moduleParams.normalize(stack.moduleParams) : {};
    stack.playback = TG.playback ? TG.playback.normalize(stack.playback) : { speed: 1 };
    return stack;
  }

  function sameJSON(a, b) {
    function key(value) {
      return JSON.stringify(value, function (_name, entry) {
        if (!isRecord(entry)) return entry;
        var out = Object.create(null);
        Object.keys(entry).sort().forEach(function (name) { out[name] = entry[name]; });
        return out;
      });
    }
    return key(a) === key(b);
  }

  function notifyChange(reason) {
    var snapshot = JSON.stringify(configSnapshot());
    if (snapshot === lastSnapshot) {
      if (reason === 'config-import') window.dispatchEvent(new CustomEvent('titlegen:change', { detail: { reason: reason, revision: changeRevision } }));
      return false;
    }
    lastSnapshot = snapshot;
    changeRevision++;
    window.dispatchEvent(new CustomEvent('titlegen:change', { detail: { reason: reason || 'edit', revision: changeRevision } }));
    return true;
  }
  function isJobBusy() { return !!(TG.jobs && TG.jobs.isBusy()); }
  function yieldToUI(delay) { return new Promise(function (resolve) { setTimeout(resolve, delay || 0); }); }
  function safeFileName(value) {
    var name = String(value == null ? '' : value).normalize('NFC').replace(/[\x00-\x1f\x7f<>:"/\\|?*]/g, '_').trim().replace(/[. ]+$/g, '');
    if (!name || /^\.+$/.test(name)) name = '称号';
    if (/^(con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\.|$)/i.test(name)) name = '_' + name;
    if (name.length > 160) {
      var ext = /\.[a-z0-9]{1,8}$/i.exec(name);
      name = name.slice(0, 160 - (ext ? ext[0].length : 0)).replace(/[. ]+$/g, '') + (ext ? ext[0] : '');
    }
    return name;
  }

  /* ---------------- 自定义称号 ---------------- */
  var CUSTOM = { main: '我的称号', suffix: '称号', en: 'CUSTOM TITLE', desc: '自定义铭文', mark: '我', color: '#ffd75e', code: 'X-01' };
  var BATCH = TG.batch ? TG.batch.normalize() : { text: '', format: 'lines', defaults: { main: '', suffix: '', en: '', desc: '', mark: '', code: '', color: '#ffd75e' } };
  function syncCustomFamily() {
    TG.addFamily({
      id: 'custom', name: '自定义', header: 'CUSTOM TITLE', exportPrefix: '自定义',
      kind: 'original', sources: [],
      hint: '在「文案 / 主题」中修改文字与配色',
      loreNote: '自定义文案由使用者编辑；名称、描述与编号不代表世界观中的官方设定。',
      items: [{
        key: 'custom', main: CUSTOM.main, suffix: CUSTOM.suffix, en: CUSTOM.en, desc: CUSTOM.desc,
        color: CUSTOM.color, mark: CUSTOM.mark, code: CUSTOM.code
      }]
    });
  }

  function randomStack() {
    if (isJobBusy()) return;
    function pick(cat) { var l = TG.list(cat); return l[Math.floor(Math.random() * l.length)].id; }
    function pickMany(cat, n) {
      var l = TG.list(cat).slice(), out = [];
      for (var i = 0; i < n && l.length; i++) {
        out.push(l.splice(Math.floor(Math.random() * l.length), 1)[0].id);
      }
      return out;
    }
    state.stack = canonicalStack({
      layout: pick('layout'), bg: pick('bg'), plate: pick('plate'), frame: pick('frame'), badge: pick('badge'), text: pick('text'),
      decos: pickMany('deco', 1 + Math.floor(Math.random() * 3)),
      motions: pickMany('motion', 1 + Math.floor(Math.random() * 3)),
      header: true, subline: true,
      theme: TG.themes && TG.themes.length ? TG.themes[Math.floor(Math.random() * TG.themes.length)].id : 'default'
    });
    state.dirty = true;
    syncStackUI();
    syncTemplateActive();
    buildCards();
    notifyChange('random');
    toast('随机叠加：' + famStackLabel());
  }

  /* ---------------- 参数 ---------------- */
  function readOpts() {
    var out = {};
    Object.keys(OPTION_FIELDS).forEach(function (key) {
      var el = $('#' + OPTION_FIELDS[key]);
      var value = el ? Number(el.value) : NaN;
      out[key] = OPTION_VALUES[key].indexOf(value) >= 0 ? value : OPTION_DEFAULTS[key];
    });
    return out;
  }

  // Keep the old 100% sampling clock intact. Global speed changes the encoded
  // interval, not the logical pixels sampled for each frame in that cycle.
  function gifTiming(overrides, capturedStack) {
    var opts = Object.assign(readOpts(), overrides || {});
    var stack = capturedStack || state.stack;
    var animated = TG.hasAnimation ? TG.hasAnimation(stack) : (stack.motions || []).length > 0;
    var period = TG.animationDuration ? TG.animationDuration(stack) : 0;
    var automatic = period > 0;
    var requestedFrames = Number(opts.frames);
    var frames = animated ? Math.max(automatic ? 8 : 1, Math.min(120, Number.isFinite(requestedFrames) ? Math.floor(requestedFrames) : OPTION_DEFAULTS.frames)) : 1;
    var requestedDelay = Number(opts.delayMs);
    var referenceDelay = automatic ? Math.max(20, Math.round(period / frames / 10) * 10) :
      Math.max(20, Math.min(2000, Number.isFinite(requestedDelay) ? Math.round(requestedDelay / 10) * 10 : OPTION_DEFAULTS.delayMs));
    var speed = TG.playback ? TG.playback.normalize(stack.playback).speed : 1;
    var delay = speed === 1 ? referenceDelay : Math.max(20, Math.round(referenceDelay / speed / 10) * 10);
    return { frames: frames, delayMs: delay, durationMs: frames * delay, automatic: automatic,
      referenceDelayMs: referenceDelay, referenceDurationMs: frames * referenceDelay, speed: speed };
  }
  function sampleAnimation(phase, timing, frameIndex, capturedStack) {
    var frames = timing.frames, exact = frameIndex !== undefined;
    if (exact) {
      if (!Number.isInteger(frameIndex)) throw new Error('动画帧序号必须是整数');
      frameIndex = Math.max(0, Math.min(frames - 1, frameIndex));
      phase = frameIndex / frames;
    } else {
      if (phase === undefined) phase = 0;
      if (typeof phase !== 'number' || !Number.isFinite(phase)) throw new Error('动画相位必须是有限数值');
      phase = phase < 0 ? 0 : phase >= 1 ? (frames - 1) / frames : phase;
      frameIndex = Math.max(0, Math.min(frames - 1, Math.floor(phase * frames)));
    }
    var stack = capturedStack || state.stack;
    var textPeriod = TG.textAnimation && TG.textAnimation.active(stack) ? TG.textAnimation.duration(stack) : 0;
    // Integer-frame paths retain the original multiply/divide order, including
    // floating-point results at fractional text speeds. Continuous UI phases
    // use the same reference cycle without quantizing the visible preview.
    var t = exact ? frameIndex * timing.referenceDelayMs : phase * frames * timing.referenceDelayMs;
    var textTime = textPeriod ? (exact ? frameIndex * textPeriod / frames : phase * textPeriod) : t;
    return { phase: phase, frameIndex: frameIndex, t: t, textTime: textTime, loopPhase: phase, timing: timing };
  }
  function animationSample(phase, overrides) {
    return sampleAnimation(phase, gifTiming(overrides), overrides ? overrides.frameIndex : undefined);
  }
  function isTransparent() { return state.stack.bg === 'transparent'; }
  function family() { return TG.family(state.familyId); }
  function familyPrefix() { return family().exportPrefix || family().name; }
  function fileLabel(item) {
    var prefix = familyPrefix();
    if (item.main === prefix) return safeFileName(prefix + (item.suffix || ''));
    return safeFileName(prefix + '_' + item.main + (item.suffix || ''));
  }

  /* ---------------- 配置资产 ---------------- */
  function hasFamily(id) {
    return TG.families.some(function (f) { return f.id === id; });
  }
  function hasTemplate(id) {
    return TG.templates.some(function (t) { return t.id === id; });
  }
  function hasModule(cat, id) {
    return typeof id === 'string' && TG.list(cat).some(function (m) { return m.id === id; });
  }
  function sanitizeStack(raw) {
    var base = canonicalStack(TG.template('t_fixer').stack);
    raw = raw || {};
    ['layout', 'bg', 'plate', 'frame', 'badge', 'text'].forEach(function (cat) {
      if (hasModule(cat, raw[cat])) base[cat] = raw[cat];
    });
    ['decos', 'motions'].forEach(function (cat) {
      if (Array.isArray(raw[cat])) {
        base[cat] = raw[cat].filter(function (id, i, arr) {
          return arr.indexOf(id) === i && hasModule(cat.slice(0, -1), id);
        });
      }
    });
    if (typeof raw.header === 'boolean') base.header = raw.header;
    if (typeof raw.subline === 'boolean') base.subline = raw.subline;
    if (TG.theme) base.theme = TG.theme(typeof raw.theme === 'string' ? raw.theme : base.theme).id;
    if (TG.textAnimation) base.textAnim = TG.textAnimation.normalize(raw.textAnim);
    base.moduleParams = TG.moduleParams ? TG.moduleParams.normalize(raw.moduleParams) : {};
    base.playback = TG.playback ? TG.playback.normalize(raw.playback) : { speed: 1 };
    return base;
  }
  function syncCustomInputs() {
    var map = { czMain: 'main', czSuffix: 'suffix', czDesc: 'desc', czEn: 'en', czMark: 'mark', czCode: 'code', czColor: 'color' };
    Object.keys(map).forEach(function (id) { var el = $('#' + id); if (el) el.value = CUSTOM[map[id]] || ''; });
  }
  function isRecord(value) { return !!value && typeof value === 'object' && !Array.isArray(value); }
  function validateOptions(raw) {
    var options = readOpts();
    if (raw === undefined) return options;
    if (!isRecord(raw)) throw new Error('输出参数必须是对象');
    Object.keys(OPTION_FIELDS).forEach(function (key) {
      if (!Object.prototype.hasOwnProperty.call(raw, key)) return;
      if (typeof raw[key] !== 'number' || OPTION_VALUES[key].indexOf(raw[key]) < 0) throw new Error('不支持的输出参数：' + key);
      options[key] = raw[key];
    });
    return options;
  }
  function validateCustom(raw) {
    var custom = Object.assign({}, CUSTOM);
    if (raw === undefined) return custom;
    if (!isRecord(raw)) throw new Error('自定义文案必须是对象');
    Object.keys(CUSTOM).forEach(function (key) {
      if (!Object.prototype.hasOwnProperty.call(raw, key)) return;
      var value = raw[key];
      if (typeof value !== 'string') throw new Error('自定义字段必须是文字：' + key);
      if (key === 'color') {
        if (!/^#[0-9a-f]{6}$/i.test(value)) throw new Error('颜色必须为六位十六进制值，例如 #ffd75e');
      } else if (value.length > CUSTOM_LIMITS[key] || /[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/.test(value)) {
        throw new Error('自定义字段过长或包含控制字符：' + key);
      }
      custom[key] = value;
    });
    return custom;
  }
  function validateStack(raw) {
    if (raw === undefined) return sanitizeStack({});
    if (!isRecord(raw)) throw new Error('模块配置必须是对象');
    ['layout', 'bg', 'plate', 'frame', 'badge', 'text'].forEach(function (cat) {
      if (Object.prototype.hasOwnProperty.call(raw, cat) && !hasModule(cat, raw[cat])) throw new Error('无法识别的模块：' + cat);
    });
    ['decos', 'motions'].forEach(function (key) {
      if (!Object.prototype.hasOwnProperty.call(raw, key)) return;
      if (!Array.isArray(raw[key]) || raw[key].length > TG.list(key.slice(0, -1)).length || raw[key].some(function (id) { return !hasModule(key.slice(0, -1), id); })) throw new Error('无法识别的模块列表：' + key);
    });
    ['header', 'subline'].forEach(function (key) {
      if (Object.prototype.hasOwnProperty.call(raw, key) && typeof raw[key] !== 'boolean') throw new Error('模块开关必须为布尔值：' + key);
    });
    if (Object.prototype.hasOwnProperty.call(raw, 'theme') && (typeof raw.theme !== 'string' || !(TG.themes || []).some(function (t) { return t.id === raw.theme; }))) throw new Error('无法识别的主题');
    if (TG.textAnimation && Object.prototype.hasOwnProperty.call(raw, 'textAnim')) TG.textAnimation.validate(raw.textAnim);
    if (Object.prototype.hasOwnProperty.call(raw, 'moduleParams')) {
      if (!TG.moduleParams) throw new Error('模块参数组件未加载');
      TG.moduleParams.validate(raw.moduleParams);
    }
    if (Object.prototype.hasOwnProperty.call(raw, 'playback')) {
      if (!TG.playback) throw new Error('动画时间组件未加载');
      TG.playback.validate(raw.playback);
    }
    return sanitizeStack(raw);
  }

  function setTextAnimation(patch, reason) {
    if (isJobBusy()) throw new Error('请等待当前导出结束后再调整文字动画');
    if (!TG.textAnimation) throw new Error('文字动画模块未加载');
    if (!isRecord(patch)) throw new Error('文字动画参数必须是对象');
    TG.textAnimation.validate(patch);
    var next = TG.textAnimation.normalize(Object.assign({}, state.stack.textAnim, patch));
    if (JSON.stringify(next) === JSON.stringify(state.stack.textAnim)) return configSnapshot();
    state.stack = Object.assign({}, state.stack, { textAnim: next });
    state.dirty = true;
    syncStackUI(); syncTemplateActive(); refreshPreviews(true);
    notifyChange(typeof reason === 'string' && /^text-animation-/.test(reason) ? reason : 'text-animation-change');
    return configSnapshot();
  }
  function commitStackField(field, next, reason, fallback, prefix) {
    if (sameJSON(next, state.stack[field])) return configSnapshot();
    var update = {}; update[field] = next;
    state.stack = Object.assign({}, state.stack, update);
    state.dirty = true;
    syncStackUI(); syncTemplateActive(); refreshPreviews(true);
    notifyChange(typeof reason === 'string' && reason.indexOf(prefix) === 0 ? reason : fallback);
    return configSnapshot();
  }
  function setModuleParams(cat, id, patch, reason) {
    if (isJobBusy()) throw new Error('请等待当前导出结束后再调整模块参数');
    if (!TG.moduleParams) throw new Error('模块参数组件未加载');
    var checked = TG.moduleParams.validatePatch(cat, id, patch);
    var next = TG.moduleParams.patch(state.stack.moduleParams, cat, id, checked);
    return commitStackField('moduleParams', next, reason, 'module-param-change', 'module-param-');
  }
  function resetModuleParams(cat, id) {
    if (isJobBusy()) throw new Error('请等待当前导出结束后再重置模块参数');
    if (!TG.moduleParams) throw new Error('模块参数组件未加载');
    var next = TG.moduleParams.reset(state.stack.moduleParams, cat, id);
    return commitStackField('moduleParams', next, 'module-param-reset', 'module-param-reset', 'module-param-');
  }
  function setPlayback(patch, reason) {
    if (isJobBusy()) throw new Error('请等待当前导出结束后再调整播放速度');
    if (!TG.playback) throw new Error('动画时间组件未加载');
    if (!isRecord(patch)) throw new Error('动画播放参数必须是对象');
    TG.playback.validate(patch);
    var next = TG.playback.normalize(Object.assign({}, state.stack.playback, patch));
    return commitStackField('playback', next, reason, 'playback-change', 'playback-');
  }
  function mergeModuleParams(current, patch) {
    var next = TG.moduleParams.normalize(current);
    Object.keys(patch || {}).forEach(function (cat) {
      if (patch[cat] === undefined) return;
      Object.keys(patch[cat]).forEach(function (id) {
        next = TG.moduleParams.patch(next, cat, id, patch[cat][id]);
      });
    });
    return next;
  }
  function syncOptions(options) {
    Object.keys(OPTION_FIELDS).forEach(function (key) {
      var el = $('#' + OPTION_FIELDS[key]);
      if (el) el.value = String(options[key]);
    });
  }
  function configSnapshot() {
    return {
      kind: 'mirrorcity-titlegen-config', version: 1,
      familyId: state.familyId, templateId: state.templateId, dirty: state.dirty,
      stack: JSON.parse(JSON.stringify(state.stack)), custom: JSON.parse(JSON.stringify(CUSTOM)), options: readOpts(), batch: JSON.parse(JSON.stringify(BATCH))
    };
  }
  function applyConfig(cfg, reason) {
    if (!isRecord(cfg) || cfg.kind !== 'mirrorcity-titlegen-config') throw new Error('不是可识别的称号生成器配置');
    if (cfg.version !== undefined && cfg.version !== 1) throw new Error('不支持的配置版本：' + String(cfg.version));
    if (cfg.familyId !== undefined && (typeof cfg.familyId !== 'string' || !hasFamily(cfg.familyId))) throw new Error('无法识别的家族');
    if (cfg.templateId !== undefined && (typeof cfg.templateId !== 'string' || !hasTemplate(cfg.templateId))) throw new Error('无法识别的模板');
    if (cfg.dirty !== undefined && typeof cfg.dirty !== 'boolean') throw new Error('自定义状态必须为布尔值');
    // Validate every field before changing CUSTOM, state, or any output control.
    var nextCustom = validateCustom(cfg.custom);
    var nextStack = validateStack(cfg.stack);
    var nextOptions = validateOptions(cfg.options);
    var nextBatch = TG.batch ? TG.batch.validate(cfg.batch) : BATCH;
    CUSTOM = nextCustom;
    BATCH = nextBatch;
    syncCustomFamily();
    state.familyId = hasFamily(cfg.familyId) ? cfg.familyId : 'custom';
    state.templateId = hasTemplate(cfg.templateId) ? cfg.templateId : 't_fixer';
    state.stack = nextStack;
    state.dirty = cfg.dirty === undefined ? true : !!cfg.dirty;
    syncOptions(nextOptions);
    $('#optFamily').value = state.familyId;
    syncCustomInputs();
    buildCards();
    syncStackUI();
    syncTemplateActive();
    refreshPreviews(true);
    notifyChange(reason || 'config-import');
  }
  function setBatch(patch, reason) {
    if (isJobBusy()) throw new Error('请等待当前导出结束后再编辑批量文案');
    if (!TG.batch || !isRecord(patch)) throw new Error('批量文案参数必须是对象');
    var candidate = Object.assign({}, BATCH, patch);
    if (Object.prototype.hasOwnProperty.call(patch, 'defaults') && isRecord(patch.defaults)) candidate.defaults = Object.assign({}, BATCH.defaults, patch.defaults);
    var next = TG.batch.validate(candidate);
    if (sameJSON(next, BATCH)) return configSnapshot();
    BATCH = next;
    notifyChange(typeof reason === 'string' && /^batch-/.test(reason) ? reason : 'batch-change');
    return configSnapshot();
  }
  function customizeItem(idxOrKey) {
    if (isJobBusy()) throw new Error('请等待当前导出结束后再编辑文案');
    var items = family().items;
    var item = idxOrKey === undefined ? items[0] :
      (typeof idxOrKey === 'number' ? (Number.isInteger(idxOrKey) ? items[idxOrKey] : null) :
        items.find(function (entry) { return entry.key === idxOrKey; }));
    if (!item) throw new Error('找不到要编辑的称号');
    var cfg = configSnapshot();
    cfg.custom = {};
    Object.keys(CUSTOM).forEach(function (key) { cfg.custom[key] = item[key] == null ? '' : item[key]; });
    cfg.familyId = 'custom';
    cfg.dirty = true;
    applyConfig(cfg, 'custom-copy');
    return configSnapshot();
  }
  function exportConfig() {
    return runSingleExport('导出配置', function () {
      var json = JSON.stringify(configSnapshot(), null, 2);
      return { blob: new Blob([json], { type: 'application/json;charset=utf-8' }), name: 'mirrorcity-title-config.json' };
    });
  }
  function importConfig(file) {
    if (isJobBusy()) return;
    if (file.size > 1024 * 1024) { toast('配置导入失败：文件超过 1 MB'); return; }
    var reader = new FileReader();
    reader.onload = function () {
      try {
        if (isJobBusy()) throw new Error('请等待当前导出结束后再导入');
        applyConfig(JSON.parse(reader.result)); toast('已导入配置 · ' + family().name);
      }
      catch (e) { console.error(e); toast('配置导入失败：' + e.message); }
    };
    reader.onerror = function () { toast('配置导入失败：无法读取文件'); };
    reader.readAsText(file, 'utf-8');
  }

  /* ---------------- 卡片渲染 ---------------- */
  function baseFor(item, scale) {
    return TG.makeBase(item, state.stack, scale);
  }

  function buildCards() {
    var grid = $('#grid');
    grid.innerHTML = '';
    cards = [];
    family().items.forEach(function (item) {
      var card = document.createElement('div');
      card.className = 'card';

      var shot = document.createElement('div');
      shot.className = 'shot';
      var cv = document.createElement('canvas');
      // Keep the final aspect ratio while offscreen previews wait to be drawn.
      cv.width = TG.W; cv.height = TG.H;
      shot.appendChild(cv);
      card.appendChild(shot);

      var meta = document.createElement('div');
      meta.className = 'meta';
      var name = document.createElement('div');
      name.className = 'name';
      var dot = document.createElement('span');
      dot.className = 'dot';
      dot.style.background = item.color;
      dot.style.boxShadow = '0 0 10px ' + item.color;
      var b = document.createElement('b');
      b.textContent = item.main + (item.suffix || '');
      var em = document.createElement('em');
      em.textContent = item.desc || item.en || '';
      name.appendChild(dot); name.appendChild(b); name.appendChild(em);
      meta.appendChild(name);

      var btns = document.createElement('div');
      btns.className = 'btns';
      var bp = document.createElement('button');
      bp.className = 'btn ghost sm';
      bp.textContent = '制成 PNG';
      var bgif = document.createElement('button');
      bgif.className = 'btn blue sm';
      bgif.textContent = '制成 GIF';
      btns.appendChild(bp); btns.appendChild(bgif);
      meta.appendChild(btns);
      card.appendChild(meta);
      grid.appendChild(card);

      var entry = { item: item, canvas: cv, base: null, scale: 0, card: card, needsPaint: true };
      cards.push(entry);

      bp.addEventListener('click', function () {
        runSingleExport('导出 PNG', function () {
          return { blob: pngBlob(item, readOpts().scale), name: fileLabel(item) + '.png' };
        });
      });
      bgif.addEventListener('click', function () {
        runSingleExport('导出 GIF', function () {
          return { blob: new Blob([gifBytes(item, readOpts())], { type: 'image/gif' }), name: fileLabel(item) + '.gif' };
        });
      });
    });
    buildIconCards();
  }

  function buildIconCards() {
    var grid = $('#iconGrid');
    if (!grid) return;
    grid.innerHTML = '';
    iconCards = [];
    family().items.forEach(function (item) {
      var card = document.createElement('div'); card.className = 'icon-card';
      var shot = document.createElement('div'); shot.className = 'icon-shot';
      var cv = document.createElement('canvas'); cv.width = 128; cv.height = 128; shot.appendChild(cv); card.appendChild(shot);
      var label = document.createElement('div'); label.className = 'icon-name'; label.textContent = item.main + (item.suffix || ''); card.appendChild(label);
      var btn = document.createElement('button'); btn.className = 'btn blue sm'; btn.textContent = '制成图标'; card.appendChild(btn);
      grid.appendChild(card);
      var entry = { item: item, canvas: cv, base: null, card: card };
      iconCards.push(entry);
      btn.addEventListener('click', function () {
        runSingleExport('导出图标', function () {
          return { blob: iconBlob(item, readOpts().iconSize), name: fileLabel(item) + '_图标.png' };
        });
      });
    });
  }

  function previewViewport(container) {
    if (!container || container.closest('[inert]')) return null;
    var bounds = container.getBoundingClientRect();
    var visible = { top: Math.max(0, bounds.top), bottom: Math.min(window.innerHeight, bounds.bottom),
      left: Math.max(0, bounds.left), right: Math.min(window.innerWidth, bounds.right) };
    return visible.bottom > visible.top && visible.right > visible.left ? visible : null;
  }
  function previewVisible(element, viewport) {
    if (!viewport) return false;
    var bounds = element.getBoundingClientRect();
    return bounds.width > 0 && bounds.height > 0 && bounds.bottom > viewport.top && bounds.top < viewport.bottom &&
      bounds.right > viewport.left && bounds.left < viewport.right;
  }

  function refreshIconPreviews() {
    var grid = $('#iconGrid');
    if (!grid || !iconCards.some(function (entry) { return !entry.base; })) return;
    // Output is a separate tab and scroll area: build icons only when revealed.
    var viewport = previewViewport(grid.closest('.panes') || grid);
    if (!previewVisible(grid, viewport)) return;
    iconCards.forEach(function (entry) {
      if (entry.base || !previewVisible(entry.card, viewport)) return;
      entry.base = TG.makeIcon(entry.item, state.stack, 0.5);
      entry.canvas.width = entry.base.width; entry.canvas.height = entry.base.height;
      var ctx = entry.canvas.getContext('2d');
      ctx.clearRect(0, 0, entry.canvas.width, entry.canvas.height);
      ctx.drawImage(entry.base, 0, 0);
    });
  }

  function ensureBase(entry) {
    var cardW = entry.card.clientWidth || 330;
    var want = Math.min(2, Math.max(1, Math.round((cardW / TG.W) * 1.5 * 10) / 10));
    if (entry.base && Math.abs(want - entry.scale) < 0.02) return entry.base;
    entry.scale = want;
    entry.base = baseFor(entry.item, want);
    entry.canvas.width = entry.base.canvas.width;
    entry.canvas.height = entry.base.canvas.height;
    entry.needsPaint = true;
    return entry.base;
  }

  function refreshPreviews(force) {
    // Invalidate now, draw in the next visible animation frame. Multiple edits
    // in one frame share one rebuild; hidden cards keep the invalidation until
    // they enter their scroll viewport. Export creates its own full-size base.
    cards.forEach(function (entry) {
      if (force) entry.base = null;
      entry.needsPaint = true;
    });
    if (force) iconCards.forEach(function (entry) { entry.base = null; });
  }

  var lastFrame = 0;
  function loop(ts) {
    requestAnimationFrame(loop);
    if (document.hidden || isJobBusy()) return;
    if (ts - lastFrame < 42) return;
    lastFrame = ts;
    var sample = TG.previewSample;
    var shared = sample && (sample.mode === 'static' || sample.mode === 'frame');
    var t = shared && Number.isFinite(sample.t) ? sample.t : Number.isFinite(TG.previewTime) ? TG.previewTime : ts;
    var animated = !TG.previewPaused && (TG.hasAnimation ? TG.hasAnimation(state.stack) : (state.stack.motions || []).length > 0) && (!shared || sample.mode === 'frame');
    var showFrame = shared ? sample.mode === 'frame' : animated;
    var grid = $('#grid'), viewport = previewViewport(grid && (grid.closest('.stage') || grid));
    cards.forEach(function (entry) {
      if (!animated && !entry.needsPaint && entry.base) return;
      if (!previewVisible(entry.card, viewport)) return;
      var base = ensureBase(entry);
      if (!animated && !entry.needsPaint) return;
      var frame = showFrame ? TG.renderFrame(base, t, shared ? { textTime: sample.textTime, loopPhase: sample.loopPhase } : undefined) : TG.renderStatic(base);
      var ctx = entry.canvas.getContext('2d');
      if (entry.canvas.width !== frame.width || entry.canvas.height !== frame.height) {
        entry.canvas.width = frame.width; entry.canvas.height = frame.height;
      }
      ctx.clearRect(0, 0, entry.canvas.width, entry.canvas.height);
      ctx.drawImage(frame, 0, 0);
      entry.needsPaint = false;
    });
    refreshIconPreviews();
  }

  /* ---------------- 导出 ---------------- */
  function pngBlob(item, scale) {
    var base = baseFor(item, scale);
    var url = TG.renderStatic(base).toDataURL('image/png');
    var bin = atob(url.slice(url.indexOf(',') + 1));
    var u8 = new Uint8Array(bin.length);
    for (var i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i);
    return new Blob([u8], { type: 'image/png' });
  }

  function iconBlob(item, size) {
    var base = TG.makeIcon(item, state.stack, size / TG.ICON_SIZE);
    var url = base.toDataURL('image/png');
    var bin = atob(url.slice(url.indexOf(',') + 1));
    var u8 = new Uint8Array(bin.length);
    for (var i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i);
    return new Blob([u8], { type: 'image/png' });
  }

  // A production job holds its own document and time samples. Rendering never
  // borrows the live editor's state, even if a programmatic edit happens while
  // a long export yields to the event loop. Canvases are built only on demand.
  function freezeData(value) {
    if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
    Object.keys(value).forEach(function (key) { freezeData(value[key]); });
    return Object.freeze(value);
  }
  function captureOptions(raw) {
    if (raw === undefined) raw = {};
    if (!isRecord(raw)) throw new Error('素材渲染参数必须是对象');
    Object.keys(raw).forEach(function (key) {
      if (['scale', 'frames', 'delayMs', 'config'].indexOf(key) < 0) throw new Error('无法识别的素材渲染参数：' + key);
    });
    if (raw.scale !== undefined && [0.5, 1, 1.5, 2, 3].indexOf(raw.scale) < 0) throw new Error('不支持的素材倍率');
    if (raw.frames !== undefined && (!Number.isInteger(raw.frames) || raw.frames < 1 || raw.frames > 120)) throw new Error('素材帧数必须为 1–120 的整数');
    if (raw.delayMs !== undefined && (!Number.isInteger(raw.delayMs) || raw.delayMs < 20 || raw.delayMs > 2000)) throw new Error('素材帧间隔必须为 20–2000 毫秒的整数');
    return raw;
  }
  function captureConfig(raw) {
    if (raw === undefined) return configSnapshot();
    if (!isRecord(raw) || raw.kind !== 'mirrorcity-titlegen-config' || raw.version !== 1) throw new Error('无法识别的素材配置快照');
    if (!hasFamily(raw.familyId) || !hasTemplate(raw.templateId) || typeof raw.dirty !== 'boolean') throw new Error('素材配置快照不完整');
    var stack = validateStack(raw.stack), custom = validateCustom(raw.custom), options = validateOptions(raw.options);
    var batch = TG.batch ? TG.batch.validate(raw.batch) : BATCH;
    return { kind: raw.kind, version: 1, familyId: raw.familyId, templateId: raw.templateId, dirty: raw.dirty,
      stack: stack, custom: custom, options: options, batch: JSON.parse(JSON.stringify(batch)) };
  }
  function capturedSequence(cfg, item, label, overrides) {
    cfg = JSON.parse(JSON.stringify(cfg)); item = JSON.parse(JSON.stringify(item));
    var opts = Object.assign({}, cfg.options, overrides), scale = overrides.scale === undefined ? cfg.options.scale : overrides.scale;
    var timing = gifTiming(opts, cfg.stack), samples = [], base = null, disposed = false;
    for (var i = 0; i < timing.frames; i++) samples.push(sampleAnimation(i / timing.frames, timing, i, cfg.stack));
    function ensure() {
      if (disposed) throw new Error('素材渲染快照已释放');
      if (!base) base = TG.makeBase(item, cfg.stack, scale);
      return base;
    }
    var session = {
      config: freezeData(JSON.parse(JSON.stringify(cfg))), item: freezeData(JSON.parse(JSON.stringify(item))), label: label,
      timing: freezeData(JSON.parse(JSON.stringify(timing))), samples: freezeData(JSON.parse(JSON.stringify(samples))),
      width: Math.round(TG.W * scale), height: Math.round(TG.H * scale),
      // The returned canvas is borrowed. Copy/encode it before the next call.
      renderFrame: function (index) {
        if (!Number.isInteger(index) || index < 0 || index >= samples.length) throw new Error('动画帧序号超出素材范围');
        var sample = samples[index];
        return TG.renderFrame(ensure(), sample.t, { textTime: sample.textTime, loopPhase: sample.loopPhase });
      },
      renderStatic: function () { return TG.renderStatic(ensure()); },
      renderIcon: function (size) {
        if (disposed) throw new Error('素材渲染快照已释放');
        size = size === undefined ? cfg.options.iconSize : size;
        if ([128, 256, 384, 512].indexOf(size) < 0) throw new Error('不支持的素材图标尺寸');
        return TG.makeIcon(item, cfg.stack, size / TG.ICON_SIZE);
      },
      dispose: function () { disposed = true; base = null; }
    };
    return Object.freeze(session);
  }
  function captureSequence(idxOrKey, rawOptions) {
    var options = captureOptions(rawOptions), cfg = captureConfig(options.config), fam = TG.family(cfg.familyId), items = fam.items;
    if (cfg.familyId === 'custom') items = [Object.assign({ key: 'custom', header: fam.header }, cfg.custom)];
    var item = idxOrKey === undefined ? items[0] : typeof idxOrKey === 'number' ?
      (Number.isInteger(idxOrKey) ? items[idxOrKey] : null) : items.find(function (entry) { return entry.key === idxOrKey; });
    if (!item) throw new Error('找不到要制作素材的称号');
    var prefix = fam.exportPrefix || fam.name;
    var label = safeFileName((item.main === prefix ? '' : prefix + '_') + item.main + (item.suffix || ''));
    return capturedSequence(cfg, item, label, options);
  }
  function captureItem(rawItem, rawOptions) {
    if (!isRecord(rawItem) || typeof rawItem.main !== 'string') throw new Error('素材文案必须包含主字');
    var options = captureOptions(rawOptions), cfg = captureConfig(options.config);
    var item = validateCustom(Object.assign({ main: '', suffix: '', en: '', desc: '', mark: '', code: '', color: '#ffd75e' }, rawItem));
    item.key = 'batch'; item.header = 'CUSTOM TITLE';
    return capturedSequence(cfg, item, safeFileName(item.main + item.suffix), options);
  }

  function gifBytes(item, opts) {
    var scale = opts.gifScale || 1;
    var base = baseFor(item, scale);
    var timing = gifTiming(opts), frameCount = timing.frames;
    var list = [];
    for (var i = 0; i < frameCount; i++) {
      var sample = sampleAnimation(i / frameCount, timing, i);
      var cv = TG.renderFrame(base, sample.t, { textTime: sample.textTime, loopPhase: sample.loopPhase });
      var data = cv.getContext('2d').getImageData(0, 0, cv.width, cv.height).data;
      list.push({ data: data, w: cv.width, h: cv.height });
    }
    var transparent = isTransparent();
    var maxColors = Math.min(256, opts.colors) - (transparent ? 1 : 0);
    return window.GIFEncoder.encode({
      width: base.canvas.width,
      height: base.canvas.height,
      frames: list,
      transparent: transparent,
      delayMs: timing.delayMs,
      loop: 0,
      maxColors: Math.max(16, maxColors),
      bg: [7, 11, 18]
    });
  }

  function download(blob, name) {
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = safeFileName(name);
    document.body.appendChild(a);
    a.click();
    setTimeout(function () { URL.revokeObjectURL(url); a.remove(); }, 1200);
  }
  function bytesToBase64(u8) {
    var s = '', chunk = 0x8000;
    for (var i = 0; i < u8.length; i += chunk) {
      s += String.fromCharCode.apply(null, u8.subarray(i, i + chunk));
    }
    return btoa(s);
  }

  /* ---------------- 海报 ---------------- */
  function renderPoster(scale) {
    var items = family().items;
    var PW = 900, cardW = 780, cardH = cardW * TG.H / TG.W, gapY = 14, y0 = 306;
    var PH = Math.round(y0 + items.length * (cardH + gapY) + 210);
    var cv = TG.newCanvas(PW * scale, PH * scale);
    var ctx = cv.getContext('2d');
    ctx.setTransform(scale, 0, 0, scale, 0, 0);

    var bg = ctx.createLinearGradient(0, 0, PW * 0.6, PH);
    bg.addColorStop(0, '#0b1424'); bg.addColorStop(0.5, '#070d18'); bg.addColorStop(1, '#04070d');
    ctx.fillStyle = bg; ctx.fillRect(0, 0, PW, PH);
    var glow = ctx.createRadialGradient(PW * 0.25, 60, 20, PW * 0.25, 60, 520);
    glow.addColorStop(0, 'rgba(255,215,94,0.13)'); glow.addColorStop(1, 'rgba(255,215,94,0)');
    ctx.fillStyle = glow; ctx.fillRect(0, 0, PW, 620);
    var glow2 = ctx.createRadialGradient(PW * 0.86, 260, 20, PW * 0.86, 260, 460);
    glow2.addColorStop(0, 'rgba(90,169,255,0.11)'); glow2.addColorStop(1, 'rgba(90,169,255,0)');
    ctx.fillStyle = glow2; ctx.fillRect(0, 0, PW, 700);

    ctx.save();
    ctx.strokeStyle = 'rgba(255,255,255,0.022)';
    ctx.lineWidth = 1;
    for (var gx = 0; gx < PW; gx += 45) { ctx.beginPath(); ctx.moveTo(gx, 0); ctx.lineTo(gx, PH); ctx.stroke(); }
    for (var gy = 0; gy < PH; gy += 45) { ctx.beginPath(); ctx.moveTo(0, gy); ctx.lineTo(PW, gy); ctx.stroke(); }
    ctx.restore();

    ctx.save();
    ctx.textAlign = 'center';
    ctx.font = '600 13px ' + TG.FONT;
    if ('letterSpacing' in ctx) ctx.letterSpacing = '7px';
    ctx.fillStyle = 'rgba(255,215,94,0.7)';
    ctx.fillText('MIRROR CITY  ·  TITLE PACK', PW / 2, 78);

    var tg = ctx.createLinearGradient(0, 96, 0, 190);
    tg.addColorStop(0, '#fffdf0'); tg.addColorStop(0.42, '#ffe9a8');
    tg.addColorStop(0.66, '#ffd75e'); tg.addColorStop(1, '#a97b28');
    ctx.font = '700 76px ' + TG.FONT;
    if ('letterSpacing' in ctx) ctx.letterSpacing = '10px';
    ctx.shadowColor = 'rgba(255,215,94,0.45)'; ctx.shadowBlur = 34;
    ctx.fillStyle = tg;
    ctx.fillText(family().name, PW / 2, 178);
    ctx.restore();

    ctx.save();
    ctx.textAlign = 'center';
    ctx.font = '600 17px ' + TG.FONT;
    if ('letterSpacing' in ctx) ctx.letterSpacing = '5px';
    ctx.fillStyle = 'rgba(200,214,232,0.85)';
    var tplName = state.dirty ? '自定义模块叠加' : TG.template(state.templateId).name;
    ctx.fillText(items.length + ' 款称号  ·  ' + tplName, PW / 2, 216);
    ctx.font = '500 12.5px ' + TG.FONT;
    if ('letterSpacing' in ctx) ctx.letterSpacing = '2.5px';
    ctx.fillStyle = 'rgba(140,158,182,0.85)';
    ctx.fillText('PNG 静态 + GIF 动态双格式  /  模块化模板  /  ' + famStackLabel(), PW / 2, 244);
    ctx.restore();

    ctx.save();
    var ln = ctx.createLinearGradient(70, 0, PW - 70, 0);
    ln.addColorStop(0, 'rgba(255,215,94,0)');
    ln.addColorStop(0.5, 'rgba(255,215,94,0.55)');
    ln.addColorStop(1, 'rgba(255,215,94,0)');
    ctx.fillStyle = ln;
    ctx.fillRect(70, 268, PW - 140, 1);
    ctx.restore();

    var x = (PW - cardW) / 2, y = y0;
    var S = (cardW / TG.W) * 1.6;
    items.forEach(function (item, i) {
      var base = TG.makeBase(item, state.stack, S);
      ctx.drawImage(TG.renderStatic(base), x, y, cardW, cardH);
      ctx.save();
      ctx.font = '600 10.5px ' + TG.FONT;
      ctx.textAlign = 'left';
      ctx.fillStyle = 'rgba(140,158,182,0.55)';
      if ('letterSpacing' in ctx) ctx.letterSpacing = '2px';
      ctx.fillText((i + 1 < 10 ? '0' : '') + (i + 1), x + 2, y - 5);
      ctx.restore();
      y += cardH + gapY;
    });

    var footTop = y + 26;
    ctx.save();
    var ln2 = ctx.createLinearGradient(70, 0, PW - 70, 0);
    ln2.addColorStop(0, 'rgba(255,215,94,0)');
    ln2.addColorStop(0.5, 'rgba(255,215,94,0.45)');
    ln2.addColorStop(1, 'rgba(255,215,94,0)');
    ctx.fillStyle = ln2;
    ctx.fillRect(70, footTop, PW - 140, 1);
    ctx.textAlign = 'center';
    ctx.font = '600 15px ' + TG.FONT;
    if ('letterSpacing' in ctx) ctx.letterSpacing = '3px';
    ctx.fillStyle = 'rgba(255,215,94,0.92)';
    ctx.fillText('5 元一份  含 PNG / GIF / 方形图标', PW / 2, footTop + 52);
    ctx.font = '600 15px ' + TG.FONT;
    if ('letterSpacing' in ctx) ctx.letterSpacing = '2px';
    ctx.fillStyle = 'rgba(226,235,247,0.92)';
    ctx.fillText('购买请联系  小小  QQ：2023926776', PW / 2, footTop + 90);
    ctx.font = '500 11.5px ' + TG.FONT;
    if ('letterSpacing' in ctx) ctx.letterSpacing = '1.6px';
    ctx.fillStyle = 'rgba(120,138,160,0.8)';
    ctx.fillText('本贴图包由 AI 制作  介意勿买', PW / 2, footTop + 122);
    ctx.restore();

    return cv;
  }

  function famStackLabel() {
    var st = state.stack;
    var short = function (cat, id) { var m = TG.get(cat, id); return m ? m.name : '无'; };
    return short('layout', st.layout) + ' · ' + short('plate', st.plate) + ' · ' + short('text', st.text);
  }

  function stackKey(cat) {
    return cat === 'deco' ? 'decos' : cat === 'motion' ? 'motions' : cat;
  }

  function selectedModuleIds(cat) {
    var value = state.stack[stackKey(cat.id)];
    if (cat.single) return value ? [value] : [];
    return Array.isArray(value) ? value : [];
  }

  function refreshModuleSummary() {
    var list = $('#moduleSummaryList');
    if (!list) return;
    list.innerHTML = '';
    var total = 0;
    TG.CATS.forEach(function (cat) {
      var ids = selectedModuleIds(cat);
      total += ids.length;
      var names = ids.map(function (id) {
        var mod = TG.get(cat.id, id);
        return mod ? mod.name : id;
      });
      var row = document.createElement('div');
      row.className = 'module-summary-row';
      var label = document.createElement('span'); label.textContent = cat.label;
      var value = document.createElement('b');
      value.textContent = names.length ? names.join(' · ') : '未选择';
      if (!names.length) value.className = 'empty';
      row.appendChild(label); row.appendChild(value); list.appendChild(row);
    });
    var count = $('#moduleSelectedCount');
    if (count) count.textContent = total + ' 项';
  }

  function clearModuleGroup(cat) {
    if (isJobBusy()) return;
    if (!(state.stack[stackKey(cat)] || []).length) return;
    state.stack[stackKey(cat)] = [];
    state.dirty = true;
    syncStackUI();
    syncTemplateActive();
    refreshPreviews(true);
    notifyChange('clear-' + cat);
    toast('已清空' + (cat === 'deco' ? '装饰' : '动效层'));
  }

  /* ---------------- UI 构建 ---------------- */
  function buildFamilyChips() {
    var wrap = $('#families');
    wrap.innerHTML = '';
    TG.families.forEach(function (f) {
      var b = document.createElement('button');
      b.className = 'fam';
      b.dataset.id = f.id;
      b.textContent = f.name + ' · ' + f.items.length;
      b.title = f.hint;
      b.addEventListener('click', function () {
        if (isJobBusy()) return;
        if (state.familyId === f.id) return;
        state.familyId = f.id;
        $('#optFamily').value = f.id;
        buildCards();
        syncStackUI();
        notifyChange('family');
        toast('已切换到：' + f.name + ' · ' + f.hint);
      });
      wrap.appendChild(b);
    });
  }

  function buildTemplateGallery() {
    var wrap = $('#templates');
    wrap.innerHTML = '';
    TG.templates.forEach(function (t) {
      var b = document.createElement('button');
      b.className = 'tpl';
      b.dataset.id = t.id;
      b.innerHTML = '<span class="tpl-name">' + t.name + '</span><span class="tpl-tag">' + t.tag + '</span><span class="tpl-hint">' + t.hint + '</span>';
      if (t.tag === '新构图') {
        var sampleFamily = TG.family(t.family), sample = Object.assign({ header: sampleFamily.header }, sampleFamily.items[0]);
        var preview = document.createElement('canvas');
        preview.className = 'tpl-preview'; preview.width = 280; preview.height = 80;
        preview.setAttribute('aria-hidden', 'true');
        function paintPreview() {
          var rendered = TG.renderStatic(TG.makeBase(sample, t.stack, 0.5)), pc = preview.getContext('2d');
          pc.clearRect(0, 0, preview.width, preview.height); pc.drawImage(rendered, 0, 0);
        }
        paintPreview(); b.insertBefore(preview, b.firstChild);
        if (document.fonts) document.fonts.ready.then(function () { if (preview.isConnected) paintPreview(); });
        b.classList.add('has-preview');
      }
      b.addEventListener('click', function () { applyTemplate(t.id); });
      wrap.appendChild(b);
    });
    syncTemplateActive();
  }
  function syncTemplateActive() {
    $$('#templates .tpl').forEach(function (b) {
      b.classList.toggle('on', !state.dirty && b.dataset.id === state.templateId);
    });
    $('#curName').textContent = state.dirty ? '自定义叠加' : TG.template(state.templateId).name;
  }

  function buildThemeUI() {
    var wrap = $('#themes');
    if (!wrap || !TG.themes) return;
    wrap.innerHTML = '';
    TG.themes.forEach(function (t) {
      var b = document.createElement('button');
      b.className = 'fam theme-chip';
      b.dataset.id = t.id;
      b.innerHTML = '<span class="theme-dot" style="background:' + t.accent + ';box-shadow:0 0 10px ' + t.accent + '"></span>' + t.name + ' · ' + t.tag;
      b.title = '光效 ' + t.glow + ' · 密度 ' + t.density + ' · 动效 ' + t.motion;
      b.addEventListener('click', function () {
        if (isJobBusy()) return;
        if ((state.stack.theme || 'default') === t.id) return;
        state.stack.theme = t.id;
        state.dirty = true;
        syncStackUI();
        syncTemplateActive();
        refreshPreviews(true);
        notifyChange('theme');
        toast('已切换主题：' + t.name);
      });
      wrap.appendChild(b);
    });
  }
  function syncThemeUI() {
    var id = state.stack.theme || 'default';
    $$('#themes .theme-chip').forEach(function (b) { b.classList.toggle('on', b.dataset.id === id); });
    var t = TG.theme ? TG.theme(id) : null;
    var name = $('#themeName');
    if (name) name.textContent = t ? t.name : id;
  }

  function applyTemplate(id) {
    if (isJobBusy()) return;
    var t = TG.template(id);
    state.templateId = id;
    state.dirty = false;
    state.stack = canonicalStack(t.stack);
    if (state.familyId !== t.family) {
      state.familyId = t.family;
      $('#optFamily').value = t.family;
      buildCards();
    }
    syncStackUI();
    syncTemplateActive();
    refreshPreviews(true);
    notifyChange('template');
    toast('已套用模板：' + t.name + '（' + family().name + '）');
  }

  function buildModuleUI() {
    var wrap = $('#modules');
    wrap.innerHTML = '';
    TG.CATS.forEach(function (cat) {
      var group = document.createElement('div');
      group.className = 'mod-group';
      group.dataset.cat = cat.id;
      var head = document.createElement('div');
      head.className = 'mod-head';
      head.innerHTML = '<b>' + cat.label + '</b><span>' + cat.hint + '</span>';
      group.appendChild(head);
      var chips = document.createElement('div');
      chips.className = 'chips';
      chips.setAttribute('role', 'group');
      chips.setAttribute('aria-label', cat.label + '，' + (cat.single ? '单选' : '可多选'));
      TG.list(cat.id).forEach(function (mod) {
        var b = document.createElement('button');
        var animated = cat.id === 'motion' || mod.layer === 'motion';
        b.type = 'button';
        b.className = 'chip';
        b.dataset.cat = cat.id;
        b.dataset.id = mod.id;
        if (mod.collection) b.dataset.collection = mod.collection;
        if (animated) b.dataset.anim = '1';
        b.textContent = mod.name + (animated ? ' ▶' : '');
        b.title = (mod.hint || '') + (cat.id === 'motion' ? '（实时预览与 GIF 显示；PNG 不绘制此动效层）' :
          mod.layer === 'motion' ? '（实时预览与 GIF 显示动画；PNG 保留代表帧）' : '');
        b.addEventListener('click', function () {
          if (isJobBusy()) return;
          var key = stackKey(cat.id);
          if (cat.single) {
            if (state.stack[key] === mod.id) return;
            state.stack[key] = mod.id;
          }
          else {
            var arr = state.stack[key] || (state.stack[key] = []);
            var i = arr.indexOf(mod.id);
            if (i >= 0) arr.splice(i, 1); else arr.push(mod.id);
          }
          state.dirty = true;
          syncStackUI();
          syncTemplateActive();
          refreshPreviews(true);
          notifyChange('module-' + cat.id);
        });
        chips.appendChild(b);
      });
      group.appendChild(chips);
      wrap.appendChild(group);
    });
  }

  function syncStackUI() {
    var st = state.stack;
    $$('#modules .chip').forEach(function (b) {
      var cat = b.dataset.cat, id = b.dataset.id;
      var key = stackKey(cat);
      var on = cat === 'deco' || cat === 'motion'
        ? (st[key] || []).indexOf(id) >= 0
        : st[key] === id;
      b.classList.toggle('on', on);
    });
    $$('#families .fam').forEach(function (b) {
      b.classList.toggle('on', b.dataset.id === state.familyId);
    });
    var cp = $('#customPanel');
    if (cp) cp.classList.toggle('hidden', state.familyId !== 'custom');
    $('#stackSummary').textContent = famStackLabel();
    var clearDeco = $('#btnClearDeco'), clearMotion = $('#btnClearMotion');
    if (clearDeco) clearDeco.disabled = isJobBusy() || !(st.decos || []).length;
    if (clearMotion) clearMotion.disabled = isJobBusy() || !(st.motions || []).length;
    refreshModuleSummary();
    syncThemeUI();
  }

  /* ---------------- 全部导出 ---------------- */
  function toast(msg) {
    var el = $('#toast');
    el.textContent = msg;
    el.classList.add('on');
    clearTimeout(toast._t);
    toast._t = setTimeout(function () { el.classList.remove('on'); }, 2200);
  }

  async function runSingleExport(label, work) {
    if (!TG.jobs) { toast('导出任务控制器尚未就绪'); return; }
    var token = TG.jobs.start(label, 1);
    if (token == null) return;
    var result = { message: '', success: 0, failed: 0, cancelled: false };
    try {
      await yieldToUI(20);
      if (TG.jobs.cancelled(token)) {
        result.cancelled = true; result.message = '已取消：' + label;
        return;
      }
      var output = work();
      await yieldToUI(10);
      if (TG.jobs.cancelled(token)) {
        result.cancelled = true; result.message = '已取消：' + label;
        return;
      }
      download(output.blob, output.name);
      result.success = 1;
      result.message = '已生成并提交下载：' + safeFileName(output.name) + ' · ' + (output.blob.size / 1024).toFixed(0) + ' KB';
      TG.jobs.progress(token, 1, result.message);
    } catch (e) {
      console.error(e);
      result.failed = 1;
      result.message = label + '失败：' + e.message;
    } finally {
      TG.jobs.finish(token, result);
      toast(result.message);
    }
  }

  async function runAll(kind) {
    if (!TG.jobs) { toast('导出任务控制器尚未就绪'); return; }
    var items = family().items.slice();
    var type = kind === 'icon' ? '图标' : kind.toUpperCase();
    var token = TG.jobs.start('批量导出 ' + type, items.length);
    if (token == null) return;
    var result = { message: '', success: 0, failed: 0, cancelled: false };
    var total = 0;
    var interrupted = false;
    var opts = readOpts();
    try {
      for (var idx = 0; idx < items.length; idx++) {
        await yieldToUI(idx === 0 ? 20 : 60);
        if (TG.jobs.cancelled(token)) { result.cancelled = true; break; }
        var item = items[idx];
        try {
          var blob;
          var name = fileLabel(item);
          if (kind === 'png') {
            blob = pngBlob(item, opts.scale); name += '.png';
          } else if (kind === 'icon') {
            blob = iconBlob(item, opts.iconSize); name += '_图标.png';
          } else {
            blob = new Blob([gifBytes(item, opts)], { type: 'image/gif' }); name += '.gif';
          }
          // The encoder is synchronous. Give a queued cancel event a chance to
          // run before submitting this item, including the final one, to download.
          await yieldToUI(10);
          if (TG.jobs.cancelled(token)) { result.cancelled = true; break; }
          download(blob, name);
          total += blob.size;
          result.success++;
        } catch (e) {
          result.failed++;
          console.error('导出失败：' + fileLabel(item), e);
          toast(type + ' 导出失败：' + fileLabel(item) + ' · ' + e.message);
        }
        TG.jobs.progress(token, idx + 1, type + ' · ' + (idx + 1) + '/' + items.length + ' · 成功 ' + result.success + ' · 失败 ' + result.failed);
      }
    } catch (e) {
      interrupted = true;
      console.error(e);
      result.message = '批量导出中断：' + e.message + '；';
    } finally {
      result.message += (result.cancelled ? '已取消' : interrupted ? '导出中断' : result.failed ? '导出结束' : '已完成生成') + '：成功 ' + result.success + '，失败 ' + result.failed + '，未处理 ' + Math.max(0, items.length - result.success - result.failed) + ' · ' + (total / 1024 / 1024).toFixed(2) + ' MB';
      TG.jobs.finish(token, result);
      toast(result.message);
    }
  }

  /* ---------------- 初始化 ---------------- */
  function init() {
    syncCustomFamily();
    var totalModules = TG.CATS.reduce(function (n, cat) { return n + TG.list(cat.id).length; }, 0);
    var statTemplates = $('#statTemplates');
    var statFamilies = $('#statFamilies');
    var statModules = $('#statModules');
    if (statTemplates) statTemplates.textContent = TG.templates.length;
    if (statFamilies) statFamilies.textContent = TG.families.length;
    if (statModules) statModules.textContent = totalModules;
    buildTemplateGallery();
    buildModuleUI();
    $('#btnClearDeco').addEventListener('click', function () { clearModuleGroup('deco'); });
    $('#btnClearMotion').addEventListener('click', function () { clearModuleGroup('motion'); });
    buildFamilyChips();
    buildThemeUI();

    var famSel = $('#optFamily');
    TG.families.forEach(function (f) {
      var o = document.createElement('option');
      o.value = f.id; o.textContent = f.name + '（' + f.items.length + '）';
      famSel.appendChild(o);
    });
    famSel.value = state.familyId;
    famSel.addEventListener('change', function () {
      if (isJobBusy()) { famSel.value = state.familyId; return; }
      state.familyId = famSel.value;
      buildCards();
      syncStackUI();
      notifyChange('family');
      toast('已切换到：' + family().name + ' · ' + family().hint);
    });

    $('#btnAllPng').addEventListener('click', function (e) { runAll('png', e.currentTarget); });
    $('#btnAllGif').addEventListener('click', function (e) { runAll('gif', e.currentTarget); });
    $('#btnAllIcon').addEventListener('click', function (e) { runAll('icon', e.currentTarget); });
    $('#btnPoster').addEventListener('click', function () {
      runSingleExport('导出合集海报', function () {
        var cv = renderPoster(Math.min(readOpts().scale, 2));
        var url = cv.toDataURL('image/png');
        var bin = atob(url.slice(url.indexOf(',') + 1));
        var u8 = new Uint8Array(bin.length);
        for (var i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i);
        return { blob: new Blob([u8], { type: 'image/png' }), name: safeFileName(familyPrefix() + '_合集海报.png') };
      });
    });
    $('#btnReset').addEventListener('click', function () { applyTemplate(state.templateId); });
    $('#btnRandom').addEventListener('click', randomStack);
    $('#btnExportConfig').addEventListener('click', exportConfig);
    $('#btnImportConfig').addEventListener('click', function () { $('#configFile').click(); });
    $('#configFile').addEventListener('change', function (e) {
      if (e.target.files && e.target.files[0]) importConfig(e.target.files[0]);
      e.target.value = '';
    });

    /* 自定义文案面板 */
    var CZ_FIELDS = { czMain: 'main', czSuffix: 'suffix', czDesc: 'desc', czEn: 'en', czMark: 'mark', czCode: 'code', czColor: 'color' };
    Object.keys(CZ_FIELDS).forEach(function (id) {
      var el = $('#' + id);
      if (!el) return;
      el.value = CUSTOM[CZ_FIELDS[id]] || '';
      if (CUSTOM_LIMITS[CZ_FIELDS[id]]) el.maxLength = CUSTOM_LIMITS[CZ_FIELDS[id]];
      el.addEventListener('input', function () {
        if (isJobBusy()) { el.value = CUSTOM[CZ_FIELDS[id]]; return; }
        var key = CZ_FIELDS[id], value = el.value;
        if (key === 'color') { if (!/^#[0-9a-f]{6}$/i.test(value)) return; }
        else value = value.replace(/[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/g, '').slice(0, CUSTOM_LIMITS[key]);
        if (el.value !== value) el.value = value;
        if (CUSTOM[key] === value) return;
        CUSTOM[key] = value;
        syncCustomFamily();
        if (state.familyId === 'custom') buildCards();
        notifyChange('custom-' + key);
      });
    });

    Object.keys(OPTION_FIELDS).forEach(function (key) {
      var el = $('#' + OPTION_FIELDS[key]);
      if (el) el.addEventListener('change', function () { notifyChange('output-options'); });
    });

    buildCards();
    syncCustomInputs();
    syncStackUI();
    requestAnimationFrame(loop);
    window.addEventListener('resize', function () {
      cards.forEach(function (c) { c.base = null; });
    });
    window.addEventListener('titlegen:preview', function () {
      cards.forEach(function (c) { c.needsPaint = true; });
    });
    notifyChange('init');
  }

  /* ---------------- 自动化接口（headless 导出用） ---------------- */
  window.TITLEGEN = {
    ready: false,
    revision: function () { return changeRevision; },
    notify: notifyChange,
    safeFileName: safeFileName,
    families: function () {
      return TG.families.map(function (f) { return { id: f.id, name: f.name, count: f.items.length }; });
    },
    templates: function () {
      return TG.templates.map(function (t) { return { id: t.id, name: t.name, tag: t.tag, family: t.family, stack: t.stack }; });
    },
    modules: function () {
      var out = {};
      TG.CATS.forEach(function (c) {
        out[c.id] = TG.list(c.id).map(function (m) {
          var parameters = TG.moduleParams ? TG.moduleParams.schemas(c.id, m.id) : m.params || [];
          return { id: m.id, name: m.name, animated: c.id === 'motion' || m.layer === 'motion',
            parameters: JSON.parse(JSON.stringify(parameters)) };
        });
      });
      return out;
    },
    themes: function () {
      return (TG.themes || []).map(function (t) { return { id: t.id, name: t.name, tag: t.tag }; });
    },
    config: function () { return configSnapshot(); },
    setTextAnimation: setTextAnimation,
    setModuleParams: setModuleParams,
    resetModuleParams: resetModuleParams,
    setPlayback: setPlayback,
    setBatch: setBatch,
    gifTiming: gifTiming,
    animationSample: animationSample,
    captureSequence: captureSequence,
    captureItem: captureItem,
    customize: customizeItem,
    loadConfig: function (cfg) { applyConfig(cfg); return configSnapshot(); },
    exportConfigJSON: function (pretty) { return JSON.stringify(configSnapshot(), null, pretty === false ? 0 : 2); },
    applyConfigJSON: function (json) {
      applyConfig(typeof json === 'string' ? JSON.parse(json) : json);
      return configSnapshot();
    },
    frameBase64: function (idxOrKey, t, overrides) {
      var item = pickItem(idxOrKey);
      var opts = Object.assign(readOpts(), overrides || {});
      var base = TG.makeBase(item, state.stack, opts.scale);
      var cv = TG.renderFrame(base, t || 0, { textTime: opts.textTime, loopPhase: opts.loopPhase });
      return cv.toDataURL('image/png').split(',')[1];
    },
    frameIndexBase64: function (idxOrKey, frameIndex, overrides) {
      var item = pickItem(idxOrKey);
      var opts = Object.assign(readOpts(), overrides || {});
      var sample = sampleAnimation(0, gifTiming(opts), frameIndex);
      var base = TG.makeBase(item, state.stack, opts.scale);
      var cv = TG.renderFrame(base, sample.t, { textTime: sample.textTime, loopPhase: sample.loopPhase });
      return cv.toDataURL('image/png').split(',')[1];
    },
    set: function (cfg) {
      cfg = cfg || {};
      if (!isRecord(cfg)) throw new Error('设置参数必须是对象');
      var hasStack = Object.prototype.hasOwnProperty.call(cfg, 'stack') && cfg.stack !== undefined;
      // Compute and validate the entire candidate before changing a template,
      // family, module selection, or DOM. Batch export may use this low-level
      // API while a job is busy; interactive editors use the guarded methods.
      if (hasStack) validateStack(cfg.stack);
      var nextFamily = state.familyId, nextTemplate = state.templateId, nextStack = state.stack, nextDirty = state.dirty;
      if (cfg.template) {
        var t = TG.template(cfg.template);
        nextTemplate = hasTemplate(cfg.template) ? cfg.template : 't_fixer';
        nextDirty = false;
        nextStack = canonicalStack(t.stack);
        var fam = cfg.family || t.family;
        if (fam && hasFamily(fam)) nextFamily = fam;
      }
      if (cfg.family && hasFamily(cfg.family)) nextFamily = cfg.family;
      if (hasStack) {
        var merged = Object.assign({}, nextStack, cfg.stack);
        if (Object.prototype.hasOwnProperty.call(cfg.stack, 'moduleParams') && TG.moduleParams) {
          // Retain explicit defaults until patch() sees them, so they can
          // remove old overrides instead of disappearing during normalize().
          merged.moduleParams = mergeModuleParams(nextStack.moduleParams, cfg.stack.moduleParams);
        }
        if (Object.prototype.hasOwnProperty.call(cfg.stack, 'playback')) merged.playback = Object.assign({}, nextStack.playback, cfg.stack.playback);
        var normalized = sanitizeStack(merged);
        if (!sameJSON(nextStack, normalized)) nextDirty = true;
        nextStack = normalized;
      }
      var changed = nextFamily !== state.familyId || nextTemplate !== state.templateId || nextDirty !== state.dirty || !sameJSON(nextStack, state.stack);
      if (changed) {
        var needCards = nextFamily !== state.familyId;
        state.familyId = nextFamily; state.templateId = nextTemplate; state.stack = nextStack; state.dirty = nextDirty;
        if (needCards) { $('#optFamily').value = nextFamily; buildCards(); }
        syncStackUI(); syncTemplateActive(); refreshPreviews(true);
        notifyChange('api-set');
      }
      return { family: state.familyId, template: state.templateId, stack: JSON.parse(JSON.stringify(state.stack)), items: family().items.length };
    },
    items: function () {
      return family().items.map(function (it, i) {
        return { idx: i, key: it.key, main: it.main, suffix: it.suffix, label: fileLabel(it), color: it.color };
      });
    },
    pngBase64: function (idxOrKey, overrides) {
      var item = pickItem(idxOrKey);
      var opts = Object.assign(readOpts(), overrides || {});
      var base = TG.makeBase(item, state.stack, opts.scale);
      return TG.renderStatic(base).toDataURL('image/png').split(',')[1];
    },
    iconBase64: function (idxOrKey, overrides) {
      var item = pickItem(idxOrKey);
      var opts = Object.assign(readOpts(), overrides || {});
      var size = opts.size || opts.iconSize || TG.ICON_SIZE;
      var base = TG.makeIcon(item, state.stack, size / TG.ICON_SIZE);
      return { b64: base.toDataURL('image/png').split(',')[1], size: size, label: fileLabel(item) };
    },
    gifBase64: function (idxOrKey, overrides) {
      var item = pickItem(idxOrKey);
      var opts = Object.assign(readOpts(), overrides || {});
      var bytes = gifBytes(item, opts);
      return { b64: bytesToBase64(bytes), bytes: bytes.length, label: fileLabel(item) };
    },
    buildZipBase64: function (overrides) {
      if (!window.TG.zip) throw new Error('ZIP 模块未加载');
      var opts = Object.assign(readOpts(), overrides || {});
      var fam = family();
      var files = [];
      var dec = function (b64) {
        var bin = atob(b64), u8 = new Uint8Array(bin.length);
        for (var i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i);
        return u8;
      };
      fam.items.forEach(function (item, i) {
        files.push({ name: fileLabel(item) + '.png', data: dec(TG.renderStatic(TG.makeBase(item, state.stack, opts.scale)).toDataURL('image/png').split(',')[1]) });
        var g = window.TITLEGEN.gifBase64(i, { gifScale: opts.gifScale, frames: opts.frames, delayMs: opts.delayMs, colors: opts.colors });
        files.push({ name: fileLabel(item) + '.gif', data: dec(g.b64) });
        var ic = window.TITLEGEN.iconBase64(i, { iconSize: opts.iconSize });
        files.push({ name: '图标/' + fileLabel(item) + '.png', data: dec(ic.b64) });
      });
      files.push({ name: '本次配置.json', data: new TextEncoder().encode(JSON.stringify(configSnapshot(), null, 2)) });
      var bytes = window.TG.zip(files);
      var bin2 = '', chunk = 0x8000;
      for (var k = 0; k < bytes.length; k += chunk) bin2 += String.fromCharCode.apply(null, bytes.subarray(k, k + chunk));
      return { b64: btoa(bin2), bytes: bytes.length, files: files.length, family: fam.id };
    },
    posterBase64: function (overrides) {
      var opts = Object.assign(readOpts(), overrides || {});
      var cv = renderPoster(opts.posterScale || Math.min(opts.scale, 2));
      return cv.toDataURL('image/png').split(',')[1];
    }
  };
  function pickItem(idxOrKey) {
    var items = family().items;
    if (typeof idxOrKey === 'number') return items[idxOrKey] || items[0];
    for (var i = 0; i < items.length; i++) if (items[i].key === idxOrKey) return items[i];
    return items[0];
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', function () { init(); window.TITLEGEN.ready = true; });
  else { init(); window.TITLEGEN.ready = true; }
})();

