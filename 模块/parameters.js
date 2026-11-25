/* ============================================================
 * parameters.js — 模块参数与播放倍率配置
 * 参数只保存偏离默认值的覆盖；绘制读取冻结缓存，不逐帧复制配置。
 * 外部输入先 validate；normalize 只负责内部容错与稳定的稀疏表示。
 * ============================================================ */
(function (global) {
  'use strict';
  var TG = global.TG, own = Object.prototype.hasOwnProperty;
  var schemaCache = new WeakMap(), valueCache = new WeakMap();
  var EMPTY = Object.freeze([]), SPEEDS = Object.freeze([0.25, 0.5, 0.75, 1, 1.25, 1.5, 2, 3]);

  function record(value) { return !!value && typeof value === 'object' && !Array.isArray(value); }
  function has(object, key) { return !!object && own.call(object, key); }
  function category(cat) {
    if (typeof cat !== 'string' || !has(TG.REG, cat)) return false;
    for (var i = 0; i < TG.CATS.length; i++) if (TG.CATS[i].id === cat) return true;
    return false;
  }
  function moduleOf(cat, id) {
    return category(cat) && typeof id === 'string' && has(TG.REG[cat], id) ? TG.get(cat, id) : null;
  }
  function target(cat, id) {
    var mod = moduleOf(cat, id);
    if (!mod) throw new Error('无法识别的模块参数目标：' + cat + '/' + id);
    return mod;
  }
  function decimalPlaces(value) {
    var parts = String(value).toLowerCase().split('e');
    return Math.max(0, (parts[0].split('.')[1] || '').length - Number(parts[1] || 0));
  }
  function onStep(value, spec) {
    var n = (value - spec.min) / spec.step;
    return Math.abs(n - Math.round(n)) < 1e-7;
  }
  function validNumber(value, spec) {
    if (typeof value !== 'number' || !Number.isFinite(value) || value < spec.min || value > spec.max) return false;
    if (spec.type === 'select') return spec.options.some(function (option) { return option.value === value; });
    return onStep(value, spec);
  }
  function canonicalNumber(value, spec) {
    if (typeof value !== 'number' || !Number.isFinite(value)) return spec.default;
    if (spec.type === 'select') return validNumber(value, spec) ? value : spec.default;
    var count = Math.max(0, Math.floor((spec.max - spec.min) / spec.step + 1e-7));
    var n = Math.max(0, Math.min(count, Math.round((value - spec.min) / spec.step)));
    return Number((spec.min + n * spec.step).toFixed(spec.precision));
  }
  function schema(cat, id) {
    var mod = target(cat, id), raw = mod.params;
    var cached = schemaCache.get(mod);
    if (cached && cached.raw === raw) return cached;
    var list = [], specs = Object.create(null), defaults = {};
    (Array.isArray(raw) ? raw : EMPTY).forEach(function (entry) {
      if (!record(entry) || typeof entry.key !== 'string' || !/^[A-Za-z][A-Za-z0-9_]*$/.test(entry.key) ||
          has(specs, entry.key) || !Number.isFinite(entry.min) || !Number.isFinite(entry.max) ||
          !Number.isFinite(entry.step) || entry.step <= 0 || entry.min > entry.max) {
        throw new Error('模块参数描述无效：' + cat + '/' + id);
      }
      var spec = {
        key: entry.key, label: entry.label || entry.key,
        min: entry.min, max: entry.max, step: entry.step, default: entry.default,
        type: entry.type === 'select' ? 'select' : 'number',
        precision: Math.min(12, Math.max(decimalPlaces(entry.min), decimalPlaces(entry.step)))
      };
      var descriptor = { key: spec.key, label: spec.label, min: spec.min, max: spec.max,
        step: spec.step, default: spec.default };
      ['unit', 'hint', 'type'].forEach(function (key) { if (has(entry, key)) descriptor[key] = entry[key]; });
      if (spec.type === 'select') {
        if (!Array.isArray(entry.options) || !entry.options.length) throw new Error('模块参数选项不能为空：' + spec.key);
        var seen = [];
        spec.options = entry.options.map(function (option) {
          if (!record(option) || !Number.isFinite(option.value) || option.value < spec.min || option.value > spec.max ||
              seen.indexOf(option.value) >= 0) throw new Error('模块参数选项无效：' + spec.key);
          seen.push(option.value);
          return Object.freeze({ value: option.value, label: String(option.label == null ? option.value : option.label) });
        });
        descriptor.options = spec.options = Object.freeze(spec.options);
      }
      if (!validNumber(spec.default, spec)) throw new Error('模块参数默认值无效：' + cat + '/' + id + '.' + spec.key);
      defaults[spec.key] = spec.default;
      specs[spec.key] = spec;
      list.push(Object.freeze(descriptor));
    });
    cached = { raw: raw, list: list.length ? Object.freeze(list) : EMPTY,
      specs: specs, defaults: Object.freeze(defaults) };
    schemaCache.set(mod, cached);
    return cached;
  }
  function schemas(cat, id) { return schema(cat, id).list; }

  function normalizedBlock(raw, entry) {
    var out = {};
    if (!record(raw)) return out;
    entry.list.forEach(function (descriptor) {
      var key = descriptor.key;
      if (!has(raw, key)) return;
      var spec = entry.specs[key], value = canonicalNumber(raw[key], spec);
      if (value !== spec.default) out[key] = value;
    });
    return out;
  }
  function normalize(raw) {
    var out = {};
    if (!record(raw)) return out;
    Object.keys(raw).sort().forEach(function (cat) {
      if (!category(cat) || !record(raw[cat])) return;
      var group = {};
      Object.keys(raw[cat]).sort().forEach(function (id) {
        if (!moduleOf(cat, id)) return;
        var block = normalizedBlock(raw[cat][id], schema(cat, id));
        if (Object.keys(block).length) group[id] = block;
      });
      if (Object.keys(group).length) out[cat] = group;
    });
    return out;
  }
  function validatePatch(cat, id, patch) {
    var entry = schema(cat, id), out = {};
    if (patch === undefined) return out;
    if (!record(patch)) throw new Error('模块参数必须是对象：' + cat + '/' + id);
    Object.keys(patch).forEach(function (key) {
      if (!has(entry.specs, key)) throw new Error('无法识别的模块参数：' + cat + '/' + id + '.' + key);
      var spec = entry.specs[key];
      if (!validNumber(patch[key], spec)) throw new Error('模块参数超出范围或步进无效：' + cat + '/' + id + '.' + key);
      // 显式默认值仍留在 patch 中，使它可以清除已有覆盖。
      out[key] = canonicalNumber(patch[key], spec);
    });
    return out;
  }
  function validate(raw) {
    if (raw === undefined) return {};
    if (!record(raw)) throw new Error('模块参数配置必须是对象');
    Object.keys(raw).forEach(function (cat) {
      if (!category(cat)) throw new Error('无法识别的参数类别：' + cat);
      var group = raw[cat];
      if (group === undefined) return;
      if (!record(group)) throw new Error('模块参数类别必须是对象：' + cat);
      Object.keys(group).forEach(function (id) { validatePatch(cat, id, group[id]); });
    });
    return normalize(raw);
  }
  function values(stack, cat, id) {
    var entry = schema(cat, id), tree = stack && stack.moduleParams;
    var group = record(tree) && has(tree, cat) ? tree[cat] : null;
    var raw = record(group) && has(group, id) ? group[id] : null;
    if (!record(raw) || !entry.list.length) return entry.defaults;
    var cache = valueCache.get(raw), old = cache && cache.get(entry), same = !!old;
    // 数量很小的参数比较不创建对象；也避免外部原地改写同一块配置时读到旧值。
    if (old) {
      for (var i = 0; i < entry.list.length; i++) {
        var key = entry.list[i].key, input = has(raw, key) ? raw[key] : undefined;
        if (!Object.is(old.inputs[i], input)) { same = false; break; }
      }
      if (same) return old.values;
    }
    var inputs = [], out = {};
    entry.list.forEach(function (descriptor) {
      var key = descriptor.key, spec = entry.specs[key], input = has(raw, key) ? raw[key] : undefined;
      inputs.push(input); out[key] = canonicalNumber(input, spec);
    });
    if (!cache) { cache = new Map(); valueCache.set(raw, cache); }
    var complete = Object.freeze(out);
    cache.set(entry, { inputs: inputs, values: complete });
    return complete;
  }
  function patch(raw, cat, id, update) {
    var changes = validatePatch(cat, id, update), out = validate(raw);
    var group = out[cat] || (out[cat] = {}), block = group[id] || (group[id] = {});
    Object.keys(changes).forEach(function (key) { block[key] = changes[key]; });
    return normalize(out);
  }
  function reset(raw, cat, id) {
    target(cat, id);
    var out = validate(raw);
    if (out[cat]) delete out[cat][id];
    return normalize(out);
  }

  function normalizePlayback(raw) {
    return { speed: record(raw) && has(raw, 'speed') && SPEEDS.indexOf(raw.speed) >= 0 ? raw.speed : 1 };
  }
  function validatePlayback(raw) {
    if (raw === undefined) return normalizePlayback();
    if (!record(raw)) throw new Error('播放设置必须是对象');
    Object.keys(raw).forEach(function (key) {
      if (key !== 'speed') throw new Error('无法识别的播放设置：' + key);
      if (typeof raw[key] !== 'number' || SPEEDS.indexOf(raw[key]) < 0) throw new Error('不支持的播放倍率');
    });
    return normalizePlayback(raw);
  }

  TG.moduleParams = {
    normalize: normalize, validate: validate, validatePatch: validatePatch,
    values: values, patch: patch, reset: reset, schemas: schemas
  };
  TG.playback = { speeds: SPEEDS, normalize: normalizePlayback, validate: validatePlayback };
})(window);
