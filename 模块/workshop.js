/* 素材工坊界面。文案清单与排布参数由 app 配置管理；查看条目不写配置。 */
(function () {
  'use strict';
  var TG = window.TG, api = window.TITLEGEN;
  var $ = function (id) { return document.getElementById(id); };
  var view = { parsed: null, batchKey: '', rowKey: '', row: 0, previewKey: '', previewTimer: 0, spriteKey: '', estimateKey: '', estimate: null, estimateError: '', jobBusy: false };
  function copy(value) { return JSON.parse(JSON.stringify(value)); }
  function text(id, value) { var el = $(id); if (el && el.textContent !== String(value)) el.textContent = value; }
  function busy() { return !!(TG.jobs && TG.jobs.isBusy()); }
  function toast(message) {
    var el = $('toast'); if (!el) return;
    el.textContent = message; el.classList.add('on'); clearTimeout(toast.timer);
    toast.timer = setTimeout(function () { el.classList.remove('on'); }, 3600);
  }
  function selected() {
    if (api.selection) return api.selection();
    var cfg = api.config(); return { index: 0, item: TG.family(cfg.familyId).items[0] };
  }
  function fields(item) {
    var out = {};
    TG.batch.fields.forEach(function (field) { out[field.key] = item && typeof item[field.key] === 'string' ? item[field.key] : field.key === 'color' ? '#ffd75e' : ''; });
    return out;
  }
  function message(error) { return typeof error === 'string' ? error : error && (error.message || error.reason) || String(error); }
  function formatErrors(errors) { return (errors || []).map(function (error) { return error && error.line ? '第 ' + error.line + ' 行' + (error.column ? '第 ' + error.column + ' 列' : '') + '：' + message(error) : message(error); }); }
  function setBatch(patch, reason) {
    if (busy()) return;
    try { api.setBatch(patch, reason); }
    catch (error) { toast(error.message); paint(); }
  }
  function openWorkshop(section) {
    if (busy()) return;
    api.openEditor('make');
    $('spriteWorkshop').open = section !== 'batch'; $('batchWorkshop').open = section === 'batch';
    paint();
    var target = $(section === 'batch' ? 'batchText' : 'optSpriteColumns');
    if (target) { target.focus({ preventScroll: true }); target.scrollIntoView({ block: 'nearest', behavior: 'instant' }); }
  }
  function paintSprite() {
    var current = selected(), item = current.item || {};
    text('spriteCurrent', '当前称号：' + (item.main || '') + (item.suffix || '') + '。按时间轴顺序收齐一轮动画。');
    var error = '', plan = null;
    try { plan = api.estimateSpriteSheet(); }
    catch (e) { error = e.message; }
    $('spriteEstimate').dataset.error = error ? 'true' : 'false';
    $('btnSpriteZip').disabled = busy() || !!error || !current.item;
    if (error) { text('spriteEstimate', error); $('spriteLayout').textContent = ''; view.spriteKey = ''; return; }
    text('spriteEstimate', plan.width + ' × ' + plan.height + ' px · ' + plan.columns + ' 列 × ' + plan.rows + ' 行\n' +
      plan.frameCount + ' 帧 · ' + plan.timing.delayMs + ' ms / 帧 · ' + (plan.timing.durationMs / 1000).toFixed(2) + ' 秒 / 轮');
    var key = [plan.columns, plan.rows, plan.frameCount].join(':');
    if (view.spriteKey !== key) {
      view.spriteKey = key; var layout = $('spriteLayout'); layout.textContent = ''; layout.style.gridTemplateColumns = 'repeat(' + plan.columns + ', minmax(0, 1fr))';
      for (var i = 0; i < plan.columns * plan.rows; i++) {
        var cell = document.createElement('span'); cell.textContent = i < plan.frameCount ? String(i + 1).padStart(2, '0') : '—';
        cell.dataset.empty = i < plan.frameCount ? 'false' : 'true'; layout.appendChild(cell);
      }
    }
    text('spritePackageNote', plan.frameCount === 1 ? '当前组合无动画，素材包保留一帧完整画面。添加文字运动或动效后会自动输出整轮动画。' :
      '素材包包含精灵图 PNG、帧数据 JSON 和本次配置。帧数与整体速度沿用当前动画设置，循环不重复追加末帧。');
  }
  function parseBatch(cfg) {
    var key = JSON.stringify(cfg.batch);
    if (key !== view.batchKey || !view.parsed) { view.batchKey = key; view.parsed = TG.batch.parse(cfg.batch); }
    return view.parsed;
  }
  function chosenItem() { return view.parsed && view.parsed.items[view.row]; }
  function paintRows(parsed) {
    var rows = parsed.rows.filter(function (row) { return row.valid; });
    var key = JSON.stringify(rows.map(function (row) { return [row.line, row.item.main, row.item.suffix]; }));
    view.row = Math.max(0, Math.min(parsed.items.length - 1, view.row));
    var select = $('batchPreviewItem');
    if (view.rowKey !== key) {
      view.rowKey = key; select.textContent = '';
      if (!rows.length) { var empty = document.createElement('option'); empty.value = '0'; empty.textContent = '暂无可预览条目'; select.appendChild(empty); }
      rows.forEach(function (row, index) {
        var option = document.createElement('option'); option.value = String(index);
        option.textContent = '第 ' + row.line + ' 行 · ' + row.item.main + (row.item.suffix || ''); select.appendChild(option);
      });
    }
    select.value = String(view.row); select.disabled = busy() || !rows.length;
    $('btnBatchEditItem').disabled = busy() || !rows.length;
  }
  function paintBatchPreview() {
    clearTimeout(view.previewTimer); view.previewTimer = 0;
    if ($('paneMake').hidden || !$('batchWorkshop').open || busy() || document.hidden) return;
    var item = chosenItem(), cv = $('batchPreviewCanvas'), empty = $('batchPreviewEmpty');
    cv.hidden = !item; empty.hidden = !!item;
    if (!item) { view.previewKey = ''; empty.textContent = '填入有效文案后，可在这里检查当前样式。'; text('batchPreviewCaption', '完整静态预览；动画输出沿用当前样式的效果。'); return; }
    var cfg = api.config(), key = JSON.stringify([item, cfg.stack]);
    if (key === view.previewKey) return;
    var sequence = null;
    try {
      sequence = api.captureItem(item, { scale: 1, config: cfg });
      var frame = sequence.renderStatic(), ctx = cv.getContext('2d');
      ctx.clearRect(0, 0, cv.width, cv.height); ctx.drawImage(frame, 0, 0);
      cv.setAttribute('aria-label', item.main + (item.suffix || '') + '，批量文案完整静态预览');
      text('batchPreviewCaption', '完整静态预览 · ' + (item.en || item.desc || '项目原创文案') + '。动画输出沿用当前样式。');
      view.previewKey = key;
    } catch (error) { view.previewKey = ''; cv.hidden = true; empty.hidden = false; empty.textContent = '预览失败：' + error.message; }
    finally { if (sequence) sequence.dispose(); }
  }
  function paintBatch() {
    var cfg = api.config(), batch = cfg.batch, parsed = parseBatch(cfg);
    if ($('batchText').value !== batch.text) $('batchText').value = batch.text;
    if ($('batchFormat').value !== batch.format) $('batchFormat').value = batch.format;
    text('batchFormatHint', batch.format === 'tsv' ? '从表格复制 7 列，无需表头：主字 / 后缀 / 英文 / 铭文 / 徽记 / 编号 / 颜色。缺少的列用默认值；已有空单元格保持为空，颜色须填 #RRGGBB。' : '每行填写一个主字，其余字段使用下方固定默认值。空行自动忽略。');
    TG.batch.fields.forEach(function (field) {
      var input = $('batchDefault-' + field.key); if (input && input.value !== batch.defaults[field.key]) input.value = batch.defaults[field.key];
    });
    var errorMessages = formatErrors(parsed.errors), errors = $('batchErrors'), errorKey = JSON.stringify(errorMessages);
    errors.hidden = !errorMessages.length;
    if (errors.dataset.key !== errorKey) {
      errors.dataset.key = errorKey; errors.textContent = '';
      errorMessages.slice(0, 10).forEach(function (error) { var li = document.createElement('li'); li.textContent = error; errors.appendChild(li); });
      if (errorMessages.length > 10) { var more = document.createElement('li'); more.textContent = '另有 ' + (errorMessages.length - 10) + ' 项待修正。'; errors.appendChild(more); }
    }
    text('batchStatus', parsed.empty ? '清单为空，先填入文案。' : parsed.items.length + ' 条有效文案 / ' + parsed.totalRows + ' 行' +
      (parsed.ignoredBlankLines ? ' · 忽略 ' + parsed.ignoredBlankLines + ' 个空行' : '') + (errorMessages.length ? ' · 请先修正待处理项' : ' · 可以制作'));
    paintRows(parsed);
    var estimateKey = JSON.stringify([batch, cfg.stack, cfg.options]), estimate, failed = '';
    if (view.estimateKey !== estimateKey) {
      view.estimateKey = estimateKey; view.estimate = null; view.estimateError = '';
      try { view.estimate = TG.batch.estimate(batch, { config: cfg, formats: $('batchOutputKind').value === '1' ? ['gif'] : ['png', 'icon'] }); }
      catch (error) { view.estimateError = error.message; }
    }
    estimate = view.estimate; failed = view.estimateError;
    if (estimate && !estimate.ok) failed = formatErrors(estimate.errors).join('；');
    $('batchEstimate').dataset.error = failed && !parsed.empty ? 'true' : 'false';
    text('batchEstimate', parsed.empty ? '填入文案后显示图片数量与尺寸。' : failed ||
      (estimate.outputFiles + ' 个图片文件 + 3 份清单\n' + estimate.width + ' × ' + estimate.height + ' px' +
      ($('batchOutputKind').value === '1' ? ' · 每条 ' + estimate.frames + ' 帧' : ' · 图标 ' + estimate.iconSize + ' × ' + estimate.iconSize) + ' · ' +
      (estimate.rawBytes / 1048576).toFixed(1) + ' MiB 像素处理量'));
    $('btnBatchZip').disabled = busy() || !!failed || !estimate || !estimate.ok || !parsed.ok || parsed.empty;
    clearTimeout(view.previewTimer); view.previewTimer = setTimeout(paintBatchPreview, 100);
  }
  function paint() { if (!api.ready || !TG.batch) return; paintSprite(); paintBatch(); }
  function download(bytes, name) {
    var blob = new Blob([bytes], { type: 'application/zip' }), url = URL.createObjectURL(blob), link = document.createElement('a');
    link.href = url; link.download = api.safeFileName(name); document.body.appendChild(link);
    try { link.click(); } finally { setTimeout(function () { URL.revokeObjectURL(url); link.remove(); }, 1500); }
  }
  async function exportProduction(kind) {
    if (busy()) return;
    var cfg = api.config(), index = selected().index, formats = $('batchOutputKind').value === '1' ? ['gif'] : ['png', 'icon'];
    var plan;
    try {
      plan = kind === 'sprite' ? api.estimateSpriteSheet() : TG.batch.estimate(cfg.batch, { config: cfg, formats: formats });
      if (kind === 'batch' && !plan.ok) throw new Error(formatErrors(plan.errors).join('；') || '请先填入有效文案');
    } catch (error) { toast(error.message); return; }
    var token = TG.jobs.start(kind === 'sprite' ? '制作动画精灵图' : '制作批量文案素材', plan.total); if (!token) return;
    var result = { success: 0, failed: 0, cancelled: false }, button = $(kind === 'sprite' ? 'btnSpriteZip' : 'btnBatchZip'), label = button.textContent;
    button.textContent = '制作中…';
    try {
      var output = kind === 'sprite' ? await api.spriteSheetZip(index, undefined, { token: token }) :
        await TG.batch.exportZip(cfg.batch, { config: cfg, formats: formats, token: token,
          onProgress: function (progress) { TG.jobs.progress(token, progress.done, progress.message); } });
      if (TG.jobs.cancelled(token)) { var cancelled = new Error('导出已取消'); cancelled.name = 'AbortError'; throw cancelled; }
      download(output.bytes, output.name);
      result.success = kind === 'sprite' ? 3 : output.success;
      result.message = '已生成 ' + output.name + ' · ' + (output.bytes.length / 1048576).toFixed(2) + ' MB';
    } catch (error) {
      result.cancelled = error.name === 'AbortError'; result.failed = result.cancelled ? 0 : 1;
      result.message = result.cancelled ? '已取消本次制作，未生成下载包。' : '制作失败：' + error.message;
      if (!result.cancelled) console.error(error);
    } finally {
      button.textContent = label; TG.jobs.finish(token, result); paint(); toast(result.message);
    }
  }
  function initDefaults() {
    var wrap = $('batchDefaultsFields');
    TG.batch.fields.filter(function (field) { return field.key !== 'main'; }).forEach(function (field) {
      var label = document.createElement('label'), name = document.createElement('span'), input = document.createElement('input');
      label.className = 'field'; name.textContent = field.label; input.id = 'batchDefault-' + field.key;
      input.type = field.key === 'color' ? 'color' : 'text'; if (field.maxLength) input.maxLength = field.maxLength;
      input.addEventListener('input', function () { var defaults = copy(api.config().batch.defaults); defaults[field.key] = input.value; setBatch({ defaults: defaults }, 'batch-default-' + field.key); });
      label.appendChild(name); label.appendChild(input); wrap.appendChild(label);
    });
  }
  function boot() {
    if (!api || !api.ready || !api.selection || !TG.batch) { setTimeout(boot, 50); return; }
    initDefaults();
    document.querySelectorAll('[data-open-production]').forEach(function (button) { button.addEventListener('click', function () { openWorkshop(button.dataset.openProduction); }); });
    document.querySelectorAll('[data-workshop-output]').forEach(function (button) { button.addEventListener('click', function () { if (!busy()) api.openEditor('out'); }); });
    document.querySelectorAll('[data-motion-idea]').forEach(function (button) { button.addEventListener('click', function () {
      if (busy()) return;
      api.setTextAnimation({ motion: button.dataset.motionIdea }, 'text-animation-preset');
      $('timelineReplay').click(); toast('已应用文字运动，主预览从头播放。');
    }); });
    $('batchText').addEventListener('input', function () { setBatch({ text: this.value }, 'batch-text'); });
    $('batchFormat').addEventListener('change', function () { setBatch({ format: this.value }, 'batch-format'); });
    $('batchOutputKind').addEventListener('change', paintBatch);
    $('batchPreviewItem').addEventListener('change', function () { if (busy()) return; view.row = Number(this.value) || 0; paintBatchPreview(); });
    $('btnBatchDefaults').addEventListener('click', function () { var item = selected().item; if (item) setBatch({ defaults: fields(item) }, 'batch-defaults-copy'); });
    $('btnBatchFamily').addEventListener('click', function () {
      if (busy()) return; var family = TG.family(api.config().familyId);
      try {
        setBatch({ text: TG.batch.serialize(family.items, 'tsv'), format: 'tsv' }, 'batch-family-copy');
        toast('已载入 ' + family.items.length + ' 条文案，可在清单内继续修改。');
      } catch (error) { toast('无法载入当前系列：' + error.message); }
    });
    $('btnBatchExample').addEventListener('click', function () {
      var batch = api.config().batch;
      var examples = ['晨雾巡行', '旧街拾光', '归途守望'].map(function (main, index) { return { main: main, suffix: '纪念', en: ['MORNING WALK', 'OLD STREET', 'HOMEWARD'][index], desc: '自定义原创示例', mark: ['晨', '街', '归'][index], code: 'X-0' + (index + 1), color: ['#79d9dc', '#ffd75e', '#c3b4ff'][index] }; });
      setBatch({ text: TG.batch.serialize(examples, batch.format) }, 'batch-example');
    });
    $('btnBatchEditItem').addEventListener('click', function () {
      var item = chosenItem(); if (!item || busy()) return;
      var cfg = api.config(); cfg.custom = fields(item); cfg.familyId = 'custom'; cfg.dirty = true;
      api.loadConfig(cfg); api.openEditor('theme'); $('czMain').focus({ preventScroll: true }); $('czMain').scrollIntoView({ block: 'nearest', behavior: 'instant' });
      toast('已复制此条文案，可继续编辑；制作清单仍然保留。');
    });
    $('btnSpriteZip').addEventListener('click', function () { exportProduction('sprite'); });
    $('btnBatchZip').addEventListener('click', function () { exportProduction('batch'); });
    ['spriteWorkshop', 'batchWorkshop'].forEach(function (id) { $(id).addEventListener('toggle', paintBatchPreview); });
    window.addEventListener('titlegen:change', paint); window.addEventListener('titlegen:selection', paintSprite);
    window.addEventListener('titlegen:tab', function (event) { if (event.detail.tab === 'make') paint(); });
    window.addEventListener('titlegen:job', function () { var next = busy(); if (view.jobBusy !== next) { view.jobBusy = next; paint(); } });
    document.addEventListener('visibilitychange', function () { if (!document.hidden) paintBatchPreview(); });
    if (document.fonts) document.fonts.ready.then(function () { view.previewKey = ''; paintBatchPreview(); });
    paint();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();
