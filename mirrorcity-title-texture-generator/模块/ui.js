/* ============================================================
 * ui.js — 工作台：事件同步 / 大预览 / 搜索 / 对照 / 历史 / 草稿 / ZIP
 * 通过 TITLEGEN 的快照和 titlegen:change 同步，逐帧只使用缓存的底图。
 * 导出统一使用 TG.jobs；全模板导出期间不写入用户历史或草稿。
 * ============================================================ */
(function () {
  'use strict';
  var $ = function (s) { return document.querySelector(s); };
  var $$ = function (s) { return Array.prototype.slice.call(document.querySelectorAll(s)); };
  var TG = window.TG;
  var state = {
    idx: 0, cfg: null, cfgKey: '', items: [], filmKey: '', renderKey: '', baseKey: '', base: null,
    raf: 0, lastFrame: 0, clock: 0, internal: 0, applyReason: '', replaying: false,
    compareOn: false, compareCfg: null, comparePinned: false, previewChoice: null, templateTag: '',
    previewMode: 'static', previewFrame: null, previewDuration: 0, previewTiming: null
  };
  var historyState = { past: [], future: [], key: '', at: 0 };
  var moduleView = { infoCat: '', infoId: '', roving: Object.create(null) };
  var parameterView = { key: '', groups: [] };
  var media = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : null;
  var editorMedia = window.matchMedia ? window.matchMedia('(max-width: 1279px)') : null;
  var libraryMedia = window.matchMedia ? window.matchMedia('(max-width: 959px)') : null;
  var drawer = { panel: null, returnFocus: null, blocked: [] };
  var heroCanvas = null;
  var FAV_KEY = 'mirrorcity.titlegen.favs.v1';
  var favoriteReadIssue = false;
  var DRAFT_KEY = 'mirrorcity.titlegen.draft.v1';
  var pendingDraft = null, draftTimer = 0, draftDirty = false;

  function copy(value) { return JSON.parse(JSON.stringify(value)); }
  function busy() { return !!(TG.jobs && TG.jobs.isBusy()); }
  function nextTask() { return new Promise(function (resolve) { setTimeout(resolve, 0); }); }
  function setText(id, value) { var el = document.getElementById(id); if (el && el.textContent !== String(value)) el.textContent = value; }
  function toast(msg) {
    var el = $('#toast');
    if (!el) return;
    el.textContent = msg; el.classList.add('on');
    clearTimeout(toast.timer);
    toast.timer = setTimeout(function () { el.classList.remove('on'); }, 3200);
  }
  function templateName(cfg) {
    if (!cfg) return '—';
    var tpl = TG.template(cfg.templateId);
    return (tpl && tpl.name || '自定义') + (cfg.dirty ? ' · 已调整' : '');
  }
  function currentItem() { return state.items[state.idx] || state.items[0]; }

  /* ---------------- 分页与键盘选择 ---------------- */
  var TABS = { tpl: 'paneTpl', mod: 'paneMod', theme: 'paneTheme', make: 'paneMake', out: 'paneOut' };
  function tabId(tab) { return Object.keys(TABS).filter(function (key) { return TABS[key] === tab.dataset.pane; })[0]; }
  function activateTab(id) {
    var pane = TABS[id];
    if (!pane) return;
    $$('.tab').forEach(function (tab) {
      var on = tab.dataset.pane === pane;
      tab.classList.toggle('on', on); tab.setAttribute('aria-selected', on ? 'true' : 'false'); tab.tabIndex = on ? 0 : -1;
    });
    $$('.pane').forEach(function (p) { var on = p.id === pane; p.classList.toggle('on', on); p.hidden = !on; });
    $$('[data-editor-step]').forEach(function (button) {
      if (button.dataset.editorStep === (id === 'theme' ? 'mod' : id)) button.setAttribute('aria-current', 'step');
      else button.removeAttribute('aria-current');
    });
    if (id === 'mod') filterModules();
    window.dispatchEvent(new CustomEvent('titlegen:tab', { detail: { tab: id } }));
  }
  function initTabs() {
    var tabs = $$('.tab');
    tabs.forEach(function (tab) {
      tab.addEventListener('click', function () {
        var id = tabId(tab);
        activateTab(id);
        if (window.history.replaceState && !/^#cfg=/.test(location.hash)) window.history.replaceState(null, '', '#' + id);
      });
      tab.addEventListener('keydown', function (e) {
        if (busy()) return;
        var next = tabs.indexOf(tab);
        if (e.key === 'ArrowRight') next++;
        else if (e.key === 'ArrowLeft') next--;
        else if (e.key === 'Home') next = 0;
        else if (e.key === 'End') next = tabs.length - 1;
        else return;
        e.preventDefault(); next = (next + tabs.length) % tabs.length;
        activateTab(tabId(tabs[next])); tabs[next].focus();
      });
    });
    $$('[data-editor-step]').forEach(function (button) { button.addEventListener('click', function () { activateTab(button.dataset.editorStep); }); });
    activateTab(TABS[(location.hash || '').slice(1)] ? location.hash.slice(1) : 'tpl');
  }
  function choiceButtons(wrap) {
    return Array.prototype.filter.call(wrap.querySelectorAll('button'), function (button) { return !button.hidden && !button.classList.contains('hide'); });
  }
  function syncRoving(wrap) {
    if (!wrap) return;
    var buttons = choiceButtons(wrap), focus = buttons.indexOf(document.activeElement) >= 0 ? document.activeElement : null;
    var selected = buttons.filter(function (button) { return button.getAttribute('aria-pressed') === 'true'; })[0];
    var target = focus || selected || buttons[0];
    Array.prototype.forEach.call(wrap.querySelectorAll('button'), function (button) { button.tabIndex = button === target ? 0 : -1; });
  }
  function paintChoices() {
    ['#templates .tpl', '#families .fam', '#themes .theme-chip', '#modules .chip'].forEach(function (selector) {
      $$(selector).forEach(function (button) { button.setAttribute('aria-pressed', button.classList.contains('on') ? 'true' : 'false'); });
    });
    ['templates', 'families', 'themes', 'film', 'templateTags', 'textAnimColors', 'textAnimMotions'].forEach(function (id) { syncRoving(document.getElementById(id)); });
  }
  function initChoiceNavigation() {
    ['templates', 'families', 'themes', 'film', 'templateTags', 'textAnimColors', 'textAnimMotions'].forEach(function (id) {
      var wrap = document.getElementById(id); if (!wrap) return;
      wrap.addEventListener('focusin', function () { syncRoving(wrap); });
      wrap.addEventListener('keydown', function (e) {
        if (!e.target.matches('button') || e.altKey || e.ctrlKey || e.metaKey) return;
        var buttons = choiceButtons(wrap).filter(function (button) { return !button.disabled; }), at = buttons.indexOf(e.target), next = at;
        if (at < 0) return;
        var columns = id === 'templates' || id === 'textAnimColors' || id === 'textAnimMotions' ? getComputedStyle(wrap).gridTemplateColumns.split(' ').length : 1;
        if (e.key === 'ArrowRight') next++;
        else if (e.key === 'ArrowLeft') next--;
        else if (e.key === 'ArrowDown') next += columns;
        else if (e.key === 'ArrowUp') next -= columns;
        else if (e.key === 'Home') next = 0;
        else if (e.key === 'End') next = buttons.length - 1;
        else return;
        e.preventDefault(); next = (next + buttons.length) % buttons.length;
        buttons[next].focus({ preventScroll: true }); buttons[next].scrollIntoView({ block: 'nearest', inline: 'nearest' });
      });
    });
    initModuleNavigation(); paintChoices();
  }

  /* ---------------- 模板、模块与称号筛选 ---------------- */
  function filterTemplates() {
    var tq = $('#tplSearch'), tc = $('#tplSearchClear'), kw = (tq && tq.value || '').trim().toLowerCase(), count = 0;
    $$('#templates .tpl').forEach(function (el) {
      var tpl = TG.template(el.dataset.id), text = [tpl.name, tpl.tag, tpl.hint, tpl.id].join(' ').toLowerCase();
      var hit = (!kw || text.indexOf(kw) >= 0) && (!state.templateTag || tpl.tag === state.templateTag);
      el.classList.toggle('hide', !hit); el.hidden = !hit; if (hit) count++;
    });
    $$('#templateTags button').forEach(function (button) { button.setAttribute('aria-pressed', button.dataset.tag === state.templateTag ? 'true' : 'false'); });
    setText('activeTemplateTag', state.templateTag || '全部标签');
    setText('templateResultCount', count + ' / ' + TG.templates.length + ' 套模板' + (state.templateTag ? ' · ' + state.templateTag : ' · 全部标签'));
    var empty = $('#tplEmpty'); if (empty) empty.hidden = count > 0;
    if (tc) { tc.hidden = !kw && !state.templateTag; tc.disabled = (!kw && !state.templateTag) || busy(); }
    syncRoving($('#templates')); syncRoving($('#templateTags'));
  }
  function buildTemplateTags() {
    var wrap = $('#templateTags'); if (!wrap) return;
    var tags = [], counts = Object.create(null);
    TG.templates.forEach(function (template) { if (!template.tag) return; if (!counts[template.tag]) tags.push(template.tag); counts[template.tag] = (counts[template.tag] || 0) + 1; });
    wrap.textContent = '';
    [''].concat(tags).forEach(function (tag) {
      var button = document.createElement('button'), count = document.createElement('span');
      button.type = 'button'; button.className = 'filter-tag'; button.dataset.tag = tag; button.textContent = tag || '全部标签';
      count.textContent = String(tag ? counts[tag] : TG.templates.length); button.appendChild(count);
      button.addEventListener('click', function () { state.templateTag = tag; filterTemplates(); }); wrap.appendChild(button);
    });
  }
  function filterTitles(moveSelection) {
    var input = $('#titleSearch'), kw = (input && input.value || '').trim().toLowerCase(), clear = $('#titleSearchClear');
    var film = $('#film'), grid = $('#grid'), matches = [];
    state.items.forEach(function (it, i) {
      var text = [it.main, it.suffix, it.en, it.desc, it.code, it.mark, it.label].join(' ').toLowerCase();
      var hit = !kw || text.indexOf(kw) >= 0; if (hit) matches.push(i);
      if (film && film.children[i]) film.children[i].hidden = !hit;
      if (grid && grid.children[i]) grid.children[i].hidden = !hit;
    });
    var empty = $('#titleEmpty'); if (empty) empty.hidden = matches.length > 0;
    setText('titleResultCount', kw ? matches.length + ' / ' + state.items.length + ' 条匹配' : state.items.length + ' 条称号');
    if (clear) { clear.hidden = !kw; clear.disabled = !kw || busy(); }
    if (moveSelection && matches.length && matches.indexOf(state.idx) < 0) select(matches[0], false);
    syncRoving(film);
  }
  function moduleCategory(button) {
    return TG.CATS.filter(function (cat) { return cat.id === button.dataset.cat; })[0];
  }
  function moduleAnimated(button, mod) {
    return button.dataset.cat === 'motion' || button.dataset.anim === '1' || mod && mod.layer === 'motion';
  }
  function moduleShown(button) {
    var group = button && button.closest('.mod-group');
    return !!(button && !button.hidden && !button.classList.contains('hide') && group && !group.hidden);
  }
  function moduleButtons(wrap) {
    return Array.prototype.filter.call(wrap.querySelectorAll('.chip'), function (button) { return moduleShown(button) && !button.disabled; });
  }
  function syncModuleRoving(wrap) {
    var all = Array.prototype.slice.call(wrap.querySelectorAll('.chip')), buttons = moduleButtons(wrap);
    var cat = all[0] && all[0].dataset.cat, focus = buttons.indexOf(document.activeElement) >= 0 ? document.activeElement : null;
    var remembered = buttons.filter(function (button) { return button.dataset.id === moduleView.roving[cat]; })[0];
    var target = focus || remembered || buttons.filter(function (button) { return button.classList.contains('on'); })[0] || buttons[0];
    all.forEach(function (button) { button.tabIndex = button === target ? 0 : -1; });
    if (target) moduleView.roving[cat] = target.dataset.id;
  }
  function paintModuleInfo(preferred) {
    var shown = $$('#modules .chip').filter(moduleShown);
    var focused = shown.indexOf(document.activeElement) >= 0 ? document.activeElement : null;
    var previous = shown.filter(function (button) { return button.dataset.cat === moduleView.infoCat && button.dataset.id === moduleView.infoId; })[0];
    var button = moduleShown(preferred) ? preferred : focused || previous || shown.filter(function (entry) { return entry.classList.contains('on'); })[0] || shown[0];
    if (button) {
      var cat = moduleCategory(button), mod = TG.get(button.dataset.cat, button.dataset.id), animated = moduleAnimated(button, mod);
      moduleView.infoCat = button.dataset.cat; moduleView.infoId = button.dataset.id;
      setText('modInfoTitle', mod && mod.name || button.textContent);
      setText('modInfoMeta', [cat && cat.label || button.dataset.cat, cat && cat.single ? '单选替换' : '可叠加', animated ? '动画' : '静态', button.classList.contains('on') ? '已选' : '未选'].join(' · '));
      var hint = mod && mod.hint || '选择后在当前称号中查看效果。';
      if (animated) hint += ' 在播放中的预览与 GIF 内呈现动画。';
      if (button.dataset.cat === 'text' && button.dataset.id === 'typer' || button.dataset.cat === 'deco' && button.dataset.id === 'typing') {
        hint += ' 称号文字逐字出现，请到「文案 / 主题」的「文字动画」中设置。';
      }
      setText('modInfoHint', hint);
    } else {
      setText('modInfoTitle', '没有可查看的模块'); setText('modInfoMeta', '调整筛选条件后继续浏览');
      setText('modInfoHint', '筛选只改变模块列表，不会移除当前组合。');
    }
    var tune = $('#btnModuleParameters');
    if (tune) {
      tune.hidden = !button || !TG.moduleParams || !TG.moduleParams.schemas(button.dataset.cat, button.dataset.id).length;
      tune.disabled = busy();
      tune.textContent = button && button.classList.contains('on') ? '调节此模块' : '选择并调节';
    }
    var info = $('#modInfo'), modules = $('#modules');
    if (info && modules) modules.style.setProperty('--module-help-height', (getComputedStyle(info).position === 'sticky' ? info.offsetHeight : 0) + 'px');
  }
  function revealModule(button) {
    if (!canFocus(button)) return;
    button.scrollIntoView({ block: 'nearest', inline: 'nearest' });
    var panes = $('#console .panes'), info = $('#modInfo');
    if (!panes || !info) return;
    var top = panes.getBoundingClientRect().top + 8;
    if (getComputedStyle(info).position === 'sticky') top = Math.max(top, info.getBoundingClientRect().bottom + 8);
    var buttonTop = button.getBoundingClientRect().top;
    if (buttonTop < top) panes.scrollTop -= top - buttonTop;
  }

  /* ---------------- 模块参数：按所选模块生成，编辑时保持控件与焦点 ---------------- */
  function selectedParameterModules() {
    var groups = [], stack = state.cfg && state.cfg.stack || {};
    if (!TG.moduleParams) return groups;
    TG.CATS.forEach(function (cat) {
      var ids = cat.single ? [stack[cat.id]] : stack[cat.id === 'deco' ? 'decos' : 'motions'] || [];
      ids.forEach(function (id) {
        var schemas = TG.moduleParams.schemas(cat.id, id), mod = TG.get(cat.id, id);
        if (mod && schemas.length) groups.push({ cat: cat.id, id: id, name: mod.name, label: cat.label, schemas: schemas });
      });
    });
    return groups;
  }
  function parameterLabel(value, schema) {
    return String(Math.round(value * 1000) / 1000) + (schema.unit || '');
  }
  function paintModuleParameters() {
    var wrap = $('#moduleParamsFields'); if (!wrap || !state.cfg || !TG.moduleParams) return;
    var groups = selectedParameterModules(), key = groups.map(function (g) { return g.cat + '.' + g.id; }).join('|');
    if (key !== parameterView.key) {
      wrap.textContent = ''; parameterView.key = key; parameterView.groups = [];
      groups.forEach(function (g) {
        var section = document.createElement('fieldset'), head = document.createElement('div'), title = document.createElement('h4'), reset = document.createElement('button');
        var prefix = 'param-' + g.cat + '-' + g.id;
        section.className = 'module-param-group'; section.id = prefix; section.setAttribute('aria-labelledby', prefix + '-title');
        head.className = 'module-param-head'; title.id = prefix + '-title'; title.textContent = g.label + ' · ' + g.name;
        reset.type = 'button'; reset.className = 'btn quiet sm'; reset.textContent = '还原'; reset.setAttribute('aria-label', '还原' + g.name + '参数');
        reset.addEventListener('click', function () {
          if (busy()) return;
          try { window.TITLEGEN.resetModuleParams(g.cat, g.id); }
          catch (e) { toast('还原参数失败：' + e.message); }
        });
        head.appendChild(title); head.appendChild(reset); section.appendChild(head);
        var fields = [];
        g.schemas.forEach(function (schema) {
          var label = document.createElement('label'), row = document.createElement('span'), name = document.createElement('span'), output = document.createElement('output');
          var input = document.createElement(schema.options ? 'select' : 'input'), hint = document.createElement('small');
          label.className = 'field module-param-field'; name.textContent = schema.label; input.id = prefix + '-' + schema.key;
          output.setAttribute('for', input.id); row.appendChild(name); row.appendChild(output); label.appendChild(row);
          if (schema.options) schema.options.forEach(function (choice) { var option = document.createElement('option'); option.value = choice.value; option.textContent = choice.label; input.appendChild(option); });
          else { input.type = 'range'; input.min = schema.min; input.max = schema.max; input.step = schema.step; }
          input.setAttribute('aria-label', g.name + ' · ' + schema.label);
          hint.id = input.id + '-hint'; hint.textContent = schema.hint || '默认 ' + parameterLabel(schema.default, schema) + '，可随时还原。';
          input.setAttribute('aria-describedby', hint.id); label.appendChild(input); label.appendChild(hint); section.appendChild(label);
          function apply() {
            if (busy()) return;
            var patch = {}; patch[schema.key] = Number(input.value);
            try { window.TITLEGEN.setModuleParams(g.cat, g.id, patch, 'module-param-' + g.cat + '-' + g.id + '-' + schema.key); }
            catch (e) { paintModuleParameters(); toast('参数设置失败：' + e.message); }
          }
          input.addEventListener('change', apply); if (!schema.options) input.addEventListener('input', apply);
          fields.push({ schema: schema, input: input, output: output });
        });
        wrap.appendChild(section); parameterView.groups.push({ cat: g.cat, id: g.id, fields: fields, reset: reset });
      });
    }
    var count = 0, raw = state.cfg.stack.moduleParams || {};
    parameterView.groups.forEach(function (g) {
      var values = TG.moduleParams.values(state.cfg.stack, g.cat, g.id);
      g.reset.disabled = busy() || !raw[g.cat] || !raw[g.cat][g.id] || !Object.keys(raw[g.cat][g.id]).length;
      g.fields.forEach(function (field) {
        var value = values[field.schema.key], input = field.input;
        if (Number(input.value) !== value) input.value = value;
        input.disabled = busy();
        field.output.textContent = field.schema.options ? '' : parameterLabel(value, field.schema);
        input.setAttribute('aria-valuetext', field.schema.options ? input.selectedOptions[0].textContent : parameterLabel(value, field.schema));
        count++;
      });
    });
    setText('moduleParamsCount', count + ' 项可调'); var empty = $('#moduleParamsEmpty'); if (empty) empty.hidden = count > 0;
  }
  function initModuleParameters() {
    $$('#modules .chip').forEach(function (button) {
      if (TG.moduleParams && TG.moduleParams.schemas(button.dataset.cat, button.dataset.id).length) button.dataset.adjustable = 'true';
    });
    var action = $('#btnModuleParameters');
    if (action) action.addEventListener('click', function () {
      if (busy()) return;
      var cat = moduleView.infoCat, id = moduleView.infoId;
      var chip = $$('#modules .chip').filter(function (b) { return b.dataset.cat === cat && b.dataset.id === id; })[0];
      if (!chip) return;
      if (!chip.classList.contains('on')) chip.click();
      paintModuleParameters();
      var panel = $('#moduleParamsPanel'), section = document.getElementById('param-' + cat + '-' + id);
      if (panel && section) {
        panel.open = true; var control = section.querySelector('input,select');
        if (control) control.focus({ preventScroll: true });
        section.scrollIntoView({ block: 'center', inline: 'nearest' });
      }
    });
    paintModuleParameters(); paintModuleInfo();
  }
  function filterModules() {
    var search = $('#modSearch'), category = $('#modCategory'), anim = $('#modAnimOnly'), selected = $('#modSelectedOnly');
    var onlyNew = !!($('#modNewOnly') && $('#modNewOnly').checked);
    var kw = (search && search.value || '').trim().toLowerCase(), catId = category && category.value || '';
    var onlyAnim = !!(anim && anim.checked), onlySelected = !!(selected && selected.checked);
    var chips = $$('#modules .chip'), focus = document.activeElement, focusAt = chips.indexOf(focus), count = 0, selectedCount = 0;
    chips.forEach(function (button) {
      var cat = moduleCategory(button), mod = TG.get(button.dataset.cat, button.dataset.id), on = button.classList.contains('on');
      var text = [mod && mod.name, mod && mod.hint, button.dataset.id, cat && cat.label, button.dataset.cat].join(' ').toLowerCase();
      var hit = (!kw || text.indexOf(kw) >= 0) && (!catId || button.dataset.cat === catId) &&
        (!onlyAnim || moduleAnimated(button, mod)) && (!onlySelected || on) && (!onlyNew || mod && mod.collection === 'distinct');
      button.classList.toggle('hide', !hit); button.hidden = !hit;
      if (hit) count++; if (on) selectedCount++;
    });
    $$('#modules .mod-group').forEach(function (group) { group.hidden = !group.querySelector('.chip:not(.hide)'); });
    $$('#modules .chips').forEach(syncModuleRoving);
    setText('modResultCount', count + ' / ' + chips.length + ' 项匹配 · 共已选 ' + selectedCount + ' 项');
    var empty = $('#modEmpty'); if (empty) empty.hidden = count > 0;
    var clear = $('#modSearchClear'), filtered = !!(kw || catId || onlyAnim || onlySelected || onlyNew);
    if (clear) { clear.hidden = !filtered; clear.disabled = !filtered || busy(); }
    ['deco', 'motion'].forEach(function (id) {
      var button = document.getElementById(id === 'deco' ? 'btnClearDeco' : 'btnClearMotion');
      var value = state.cfg && state.cfg.stack[id === 'deco' ? 'decos' : 'motions'];
      if (button) button.disabled = busy() || !Array.isArray(value) || !value.length;
    });
    // 取消已选项可能将当前焦点一起筛掉；优先移到同组的相邻模块。
    if (focusAt >= 0 && !moduleShown(focus) && !busy()) {
      var visible = chips.filter(function (button) { return moduleShown(button) && !button.disabled; });
      var sameGroup = visible.filter(function (button) { return button.dataset.cat === focus.dataset.cat; });
      var candidates = sameGroup.length ? sameGroup : visible;
      var next = candidates.filter(function (button) { return chips.indexOf(button) > focusAt; })[0] || candidates[candidates.length - 1];
      if (next) { next.focus({ preventScroll: true }); paintModuleInfo(next); revealModule(next); }
      else focusFirst([selected && selected.checked ? selected : category, search]);
    }
    paintModuleInfo();
  }
  function initModuleNavigation() {
    var modules = $('#modules'); if (!modules) return;
    var pointerFocus = null;
    modules.addEventListener('pointerdown', function (event) { pointerFocus = event.target.closest('.chip'); }, true);
    modules.addEventListener('pointercancel', function () { pointerFocus = null; }, true);
    document.addEventListener('keydown', function () { pointerFocus = null; }, true);
    modules.addEventListener('focusin', function (event) {
      var button = event.target.closest('.chip'); if (!button || !moduleShown(button)) return;
      moduleView.roving[button.dataset.cat] = button.dataset.id;
      syncModuleRoving(button.closest('.chips'));
      // 指针聚焦发生在按下与点击之间；此时改说明高度会移动点击目标。
      if (pointerFocus !== button && button.matches(':focus-visible')) { paintModuleInfo(button); revealModule(button); }
    });
    modules.addEventListener('click', function (event) {
      pointerFocus = null;
      var button = event.target.closest('.chip'); if (!button || !moduleShown(button)) return;
      moduleView.roving[button.dataset.cat] = button.dataset.id;
      syncModuleRoving(button.closest('.chips')); paintModuleInfo(button);
    });
    modules.addEventListener('keydown', function (event) {
      if (busy() || event.altKey || event.ctrlKey || event.metaKey || !event.target.matches('.chip')) return;
      var buttons = moduleButtons(event.target.closest('.chips')), at = buttons.indexOf(event.target), next = at;
      if (at < 0) return;
      if (event.key === 'ArrowRight' || event.key === 'ArrowDown') next++;
      else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') next--;
      else if (event.key === 'Home') next = 0;
      else if (event.key === 'End') next = buttons.length - 1;
      else return;
      event.preventDefault(); next = (next + buttons.length) % buttons.length;
      buttons[next].focus({ preventScroll: true }); paintModuleInfo(buttons[next]); revealModule(buttons[next]);
    });
    $$('#modules .chips').forEach(syncModuleRoving);
  }
  function initFilters() {
    var tq = $('#tplSearch'), mq = $('#modSearch'), anim = $('#modAnimOnly'), category = $('#modCategory'), selected = $('#modSelectedOnly');
    var tc = $('#tplSearchClear'), mc = $('#modSearchClear');
    if (category) {
      TG.CATS.forEach(function (cat) {
        var option = document.createElement('option'); option.value = cat.id;
        option.textContent = cat.label + ' · ' + TG.list(cat.id).length; category.appendChild(option);
      });
      category.addEventListener('change', filterModules);
    }
    if (tq) { tq.addEventListener('input', filterTemplates); tq.addEventListener('search', filterTemplates); }
    if (mq) { mq.addEventListener('input', filterModules); mq.addEventListener('search', filterModules); }
    if (anim) anim.addEventListener('change', filterModules);
    if (selected) selected.addEventListener('change', filterModules);
    if ($('#modNewOnly')) $('#modNewOnly').addEventListener('change', filterModules);
    if ($('#btnDistinctTemplates')) {
      $('#btnDistinctTemplates').textContent = '浏览 ' + TG.templates.filter(function (t) { return t.tag === '新构图'; }).length + ' 套新搭配';
      $('#btnDistinctTemplates').addEventListener('click', function () { state.templateTag = '新构图'; if (tq) tq.value = ''; filterTemplates(); });
    }
    if ($('#btnDistinctModules')) $('#btnDistinctModules').addEventListener('click', function () {
      if (busy()) return;
      if (mq) mq.value = ''; if (anim) anim.checked = false; if (selected) selected.checked = false; if (category) category.value = '';
      if ($('#modNewOnly')) $('#modNewOnly').checked = true;
      $('#tabMod').click(); filterModules();
      if ($('#modNewOnly')) $('#modNewOnly').focus({ preventScroll: true });
    });
    if (tc) tc.addEventListener('click', function () { state.templateTag = ''; if (tq) { tq.value = ''; tq.focus(); } filterTemplates(); });
    if (mc) mc.addEventListener('click', function () {
      if (mq) { mq.value = ''; mq.focus(); } if (anim) anim.checked = false;
      if (selected) selected.checked = false; if (category) category.value = '';
      if ($('#modNewOnly')) $('#modNewOnly').checked = false; filterModules();
    });
    var titleInput = $('#titleSearch'), titleClear = $('#titleSearchClear');
    if (titleInput) { titleInput.addEventListener('input', function () { filterTitles(true); }); titleInput.addEventListener('search', function () { filterTitles(true); }); }
    if (titleClear) titleClear.addEventListener('click', function () { if (titleInput) { titleInput.value = ''; titleInput.focus(); } filterTitles(false); });
    buildTemplateTags(); filterTemplates(); filterModules(); filterTitles(false);
    window.addEventListener('titlegen:job', function (e) { if (!e.detail || !e.detail.busy) { filterTemplates(); filterModules(); filterTitles(false); } });
  }

  /* ---------------- 资料库 / 编辑抽屉：共享遮罩、焦点与导出取消 ---------------- */
  function panelElement(kind) { return document.getElementById(kind === 'library' ? 'libraryPanel' : 'console'); }
  function isCompact(kind) {
    var query = kind === 'library' ? libraryMedia : editorMedia;
    return query ? query.matches : window.innerWidth <= (kind === 'library' ? 959 : 1279);
  }
  function restoreBackground() {
    drawer.blocked.forEach(function (entry) { entry.el.inert = entry.inert; }); drawer.blocked = [];
  }
  function canFocus(el) {
    return el && el.isConnected && !el.disabled && !el.closest('[inert]') && el.getClientRects().length && getComputedStyle(el).visibility !== 'hidden';
  }
  function focusFirst(candidates) {
    for (var i = 0; i < candidates.length; i++) {
      if (!canFocus(candidates[i])) continue;
      candidates[i].focus({ preventScroll: true });
      if (document.activeElement === candidates[i]) return true;
    }
    return false;
  }
  function drawerFocusables() {
    var panel = drawer.panel && panelElement(drawer.panel); if (!panel) return [];
    return Array.prototype.filter.call(panel.querySelectorAll('button,input,select,textarea,a[href],summary,[tabindex]'), function (el) {
      return el.tabIndex >= 0 && canFocus(el);
    });
  }
  function focusPanel(kind) {
    var candidates = kind === 'library'
      ? [$('#btnLibraryClose'), $('#titleSearch'), $('#film .fl.on'), $('#optFamily')]
      : [$('#console .tab.on'), $('#btnEditorClose')];
    return focusFirst(candidates);
  }
  function focusPanelEntry(kind) {
    if (!isCompact(kind) && focusPanel(kind)) return true;
    var candidates = kind === 'library'
      ? [$('#btnMobileLibrary'), $('#btnOpenLibrary')]
      : [$('#btnMobileEdit'), $('#btnOpenEditor'), $('#btnOutputSettings')];
    return focusFirst(candidates.concat($$('[data-open-' + kind + ']')));
  }
  function syncPanelAccess() {
    ['editor', 'library'].forEach(function (kind) {
      var panel = panelElement(kind), open = drawer.panel === kind, compact = isCompact(kind);
      if (panel) {
        panel.inert = !!(drawer.panel && !open) || (compact && !open);
        if (compact && !open) panel.setAttribute('aria-hidden', 'true'); else panel.removeAttribute('aria-hidden');
        if (open) { panel.setAttribute('role', 'dialog'); panel.setAttribute('aria-modal', 'true'); }
        else { panel.removeAttribute('aria-modal'); if (panel.getAttribute('role') === 'dialog') panel.removeAttribute('role'); }
      }
      $$('[data-open-' + kind + ']').forEach(function (button) { button.setAttribute('aria-expanded', open || !compact ? 'true' : 'false'); });
    });
  }
  function closePanels(restoreFocus) {
    var kind = drawer.panel, panel = kind && panelElement(kind), target = drawer.returnFocus;
    var hadFocus = panel && panel.contains(document.activeElement), backdrop = $('#editorBackdrop');
    drawer.panel = null; drawer.returnFocus = null;
    document.body.classList.remove('editor-open', 'library-open'); restoreBackground();
    if (backdrop) backdrop.hidden = true;
    if (hadFocus && isCompact(kind) && panel.contains(document.activeElement)) document.activeElement.blur();
    syncPanelAccess();
    if (kind && restoreFocus !== false) {
      if (!focusFirst([target])) focusPanelEntry(kind);
    }
  }
  function closeHeaderMenus(except) {
    $$('#projectMenu, #batchExportMenu').forEach(function (menu) { if (menu !== except) menu.open = false; });
  }
  function openPanel(kind, opener) {
    if (busy()) return;
    var panel = panelElement(kind); if (!panel) return;
    var returnFocus = opener || document.activeElement;
    if (drawer.panel && drawer.panel !== kind) closePanels(false);
    closeHeaderMenus();
    if (!isCompact(kind)) { focusPanel(kind); return; }
    if (drawer.panel !== kind) {
      drawer.panel = kind; drawer.returnFocus = returnFocus;
      document.body.classList.remove('editor-open', 'library-open'); document.body.classList.add(kind + '-open');
      syncPanelAccess();
      var backdrop = $('#editorBackdrop'); if (backdrop) backdrop.hidden = false;
      focusPanel(kind);
      ['.cmd', '#previewStage', '.foot', '#mobileEditBar', '#skipEditor', '#exportProgress', kind === 'library' ? '#console' : '#libraryPanel'].forEach(function (selector) {
        var el = $(selector);
        if (el && el !== panel && !el.contains(panel) && !panel.contains(el) && !drawer.blocked.some(function (entry) { return entry.el === el; })) {
          drawer.blocked.push({ el: el, inert: el.inert }); el.inert = true;
        }
      });
    } else focusPanel(kind);
  }
  function showPreview() {
    closePanels(false);
    var hero = $('#heroPreview');
    if (hero) {
      if (!hero.hasAttribute('tabindex')) hero.tabIndex = -1;
      focusFirst([hero]);
      hero.scrollIntoView({ block: 'start', behavior: media && media.matches ? 'auto' : 'smooth' });
    }
  }
  function openEditor(pane, opener) {
    if (busy()) return;
    if (pane && TABS[pane]) activateTab(pane);
    openPanel('editor', opener);
  }
  function initDrawer() {
    $$('[data-open-editor]').forEach(function (button) { button.addEventListener('click', function () { openEditor(button.dataset.openEditor, button); }); });
    $$('[data-open-library]').forEach(function (button) { button.addEventListener('click', function () { openPanel('library', button); }); });
    ['btnEditorClose', 'btnLibraryClose', 'editorBackdrop'].forEach(function (id) { var button = document.getElementById(id); if (button) button.addEventListener('click', function () { closePanels(true); }); });
    var skip = $('#skipEditor'); if (skip) skip.addEventListener('click', function (e) { e.preventDefault(); openEditor('', skip); });
    var preview = $('#btnMobilePreview'); if (preview) preview.addEventListener('click', showPreview);
    document.addEventListener('keydown', function (e) {
      if (!drawer.panel) return;
      if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); closePanels(true); return; }
      if (e.key !== 'Tab') return;
      var controls = drawerFocusables(), first = controls[0], last = controls[controls.length - 1];
      if (!first) { e.preventDefault(); return; }
      if (e.shiftKey && (document.activeElement === first || controls.indexOf(document.activeElement) < 0)) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && (document.activeElement === last || controls.indexOf(document.activeElement) < 0)) { e.preventDefault(); first.focus(); }
    }, true);
    var lastMode = '', recentPanelFocus = null;
    function panelForFocus(target) {
      return ['editor', 'library'].filter(function (kind) { var panel = panelElement(kind); return panel && panel.contains(target); })[0];
    }
    document.addEventListener('focusin', function (event) {
      if (event.target === document.body || event.target === document.documentElement) return;
      var kind = panelForFocus(event.target);
      recentPanelFocus = kind ? { kind: kind, target: event.target } : null;
    }, true);
    document.addEventListener('pointerdown', function (event) {
      if (!recentPanelFocus) return;
      var panel = panelElement(recentPanelFocus.kind);
      if (!panel || !panel.contains(event.target)) recentPanelFocus = null;
    }, true);
    var onMode = function () {
      var mode = (isCompact('editor') ? '1' : '0') + (isCompact('library') ? '1' : '0');
      if (mode === lastMode) return;
      var previousMode = lastMode, active = document.activeElement;
      lastMode = mode;
      var focusedPanel = drawer.panel || panelForFocus(active);
      /* Edge may blur a newly hidden panel before dispatching the media change. */
      if (!focusedPanel && recentPanelFocus && (active === document.body || active === document.documentElement)) {
        var remembered = recentPanelFocus, modeIndex = remembered.kind === 'editor' ? 0 : 1;
        var rememberedPanel = panelElement(remembered.kind);
        if (previousMode.charAt(modeIndex) === '0' && mode.charAt(modeIndex) === '1' &&
            remembered.target.isConnected && rememberedPanel && rememberedPanel.contains(remembered.target)) focusedPanel = remembered.kind;
      }
      closePanels(false);
      if (focusedPanel) focusPanelEntry(focusedPanel);
    };
    [editorMedia, libraryMedia].forEach(function (query) {
      if (query && query.addEventListener) query.addEventListener('change', onMode); else if (query && query.addListener) query.addListener(onMode);
    });
    if (!editorMedia || !libraryMedia) window.addEventListener('resize', onMode);
    var menus = $$('#projectMenu, #batchExportMenu');
    document.addEventListener('click', function (e) { menus.forEach(function (menu) { if (!menu.contains(e.target)) menu.open = false; }); });
    menus.forEach(function (menu) {
      menu.addEventListener('click', function (e) { if (e.target.closest('button, a[href]')) menu.open = false; });
      menu.addEventListener('toggle', function () { if (menu.open) closeHeaderMenus(menu); });
      menu.addEventListener('keydown', function (e) {
        if (e.key === 'Escape' && menu.open) { e.preventDefault(); menu.open = false; focusFirst([menu.querySelector('summary')]); }
      });
    });
    $$('[data-export-target]').forEach(function (button) {
      button.addEventListener('click', function () { if (busy()) return; closePanels(false); var target = document.getElementById(button.dataset.exportTarget); if (target && !target.disabled) target.click(); });
    });
    var exportJobActive = false;
    window.addEventListener('titlegen:job', function (event) {
      var active = !!(event.detail && event.detail.busy);
      if (active) {
        var wasOpen = !!drawer.panel;
        if (wasOpen) closePanels(false);
        closeHeaderMenus();
        if (wasOpen || !exportJobActive) focusFirst([$('#btnExportCancel')]);
      }
      exportJobActive = active;
    });
    onMode();
  }

  /* 背景只是页面上的检查底色，不会写入配置或 Canvas。 */
  function initPreviewBackground() {
    function setBackground(value) {
      document.body.dataset.previewBg = value;
      $$('.preview-backgrounds button').forEach(function (button) { button.setAttribute('aria-pressed', button.dataset.previewBg === value ? 'true' : 'false'); });
    }
    $$('.preview-backgrounds button').forEach(function (button) { button.addEventListener('click', function () { setBackground(button.dataset.previewBg); }); });
    setBackground('checker');
  }
  function initCustomize() {
    $$('[data-customize-current]').forEach(function (button) {
      button.addEventListener('click', function () {
        if (busy() || !currentItem()) return;
        try {
          if (state.cfg.familyId !== 'custom') {
            if (!window.TITLEGEN.customize) throw new Error('文案编辑接口尚未加载，请刷新页面');
            window.TITLEGEN.customize(state.idx);
          }
          openEditor('theme', button);
          var input = $('#czMain'); if (input) { input.focus({ preventScroll: true }); input.scrollIntoView({ block: 'nearest' }); }
        } catch (e) { toast('无法编辑文案：' + e.message); }
      });
    });
  }

  /* ---------------- 文字动画：配置、控件与实际 GIF 时间 ---------------- */
  function textAnimationConfig(stack) {
    if (TG.textAnimation && TG.textAnimation.normalize) return TG.textAnimation.normalize(stack && stack.textAnim);
    return { color: 'none', motion: 'none', speed: 1, strength: 0.65, scope: 'all' };
  }
  function hasTextAnimation(stack) {
    return !!(TG.textAnimation && TG.textAnimation.active && TG.textAnimation.active(stack));
  }
  function currentGifTiming() {
    if (window.TITLEGEN && window.TITLEGEN.gifTiming) return window.TITLEGEN.gifTiming();
    var opts = state.cfg && state.cfg.options || {}, frames = Number(opts.frames) || 16, delay = Number(opts.delayMs) || 60;
    return { frames: frames, delayMs: delay, durationMs: frames * delay, automatic: false };
  }
  function durationLabel(ms) { return (Number(ms) / 1000).toFixed(2).replace(/\.?0+$/, '') + ' 秒'; }
  function textAnimationChoices(kind) {
    var list = TG.textAnimation && TG.textAnimation[kind === 'color' ? 'colors' : 'motions'];
    list = Array.isArray(list) ? list.slice() : [];
    if (!list.some(function (entry) { return entry.id === 'none'; })) {
      list.unshift({ id: 'none', name: '关闭', hint: kind === 'color' ? '保留当前字材与颜色。' : '文字保持静止。' });
    }
    return list;
  }
  function paintTextAnimation() {
    if (!state.cfg) return;
    var cfg = textAnimationConfig(state.cfg.stack), active = hasTextAnimation(state.cfg.stack);
    var available = !!(TG.textAnimation && window.TITLEGEN && window.TITLEGEN.setTextAnimation), locked = busy() || !available;
    ['color', 'motion'].forEach(function (kind) {
      var wrap = $(kind === 'color' ? '#textAnimColors' : '#textAnimMotions'), choice;
      textAnimationChoices(kind).forEach(function (entry) { if (entry.id === cfg[kind]) choice = entry; });
      if (wrap) Array.prototype.forEach.call(wrap.querySelectorAll('button'), function (button) {
        var selected = button.getAttribute('data-text-anim-' + kind) === cfg[kind];
        button.setAttribute('aria-pressed', selected ? 'true' : 'false'); button.classList.toggle('on', selected); button.disabled = locked;
      });
      setText(kind === 'color' ? 'textAnimColorHint' : 'textAnimMotionHint', choice && choice.hint || '');
      syncRoving(wrap);
    });
    [['textAnimSpeed', cfg.speed], ['textAnimStrength', cfg.strength], ['textAnimScope', cfg.scope]].forEach(function (pair) {
      var el = $('#' + pair[0]); if (!el) return;
      var value = String(pair[1]); if (el.value !== value) el.value = value;
      el.disabled = locked || !active;
    });
    setText('textAnimStrengthValue', Math.round(cfg.strength * 100) + '%');
    var strength = $('#textAnimStrength'); if (strength) strength.setAttribute('aria-valuetext', Math.round(cfg.strength * 100) + '%');
    ['btnTextAnimReplay', 'btnTextAnimClear'].forEach(function (id) { var button = $('#' + id); if (button) button.disabled = locked || !active; });
    setText('textAnimStatus', active ? '已启用' : '关闭');
    var hint = '选择一种颜色变化或文字运动，查看动画效果。';
    if (!available) hint = '文字动画组件尚未加载，请刷新页面。';
    else if (active) {
      var timing = currentGifTiming();
      hint = '循环播放 · GIF ' + timing.frames + ' 帧，' + durationLabel(timing.durationMs) + ' / 轮（' + timing.delayMs + ' ms / 帧）。';
      if (timing.frames < 24) hint += '建议选择 24–32 帧，让变化更连贯。';
      hint += 'PNG 与海报保留完整文字，图标沿用徽记。';
      if (previewPaused()) hint += '预览已暂停，可点击“重播文字动画”播放。';
      var item = currentItem() || {};
      if (cfg.scope === 'main' && !item.main) hint += '当前称号没有主字，可调整作用范围。';
      if (cfg.scope === 'suffix' && !item.suffix) hint += '当前称号没有后缀，可调整作用范围。';
    }
    setText('textAnimHint', hint);
  }
  function editTextAnimation(patch, reason) {
    if (busy()) return;
    try {
      if (!window.TITLEGEN || !window.TITLEGEN.setTextAnimation) throw new Error('文字动画接口尚未加载');
      window.TITLEGEN.setTextAnimation(patch, 'text-animation-' + reason);
    } catch (e) { paintTextAnimation(); toast('文字动画设置失败：' + e.message); }
  }
  function resetPreviewClock() { state.clock = 0; state.lastFrame = 0; state.previewFrame = null; TG.previewTime = 0; }
  function textReplayKey(item) {
    item = item || {};
    return JSON.stringify([item.key, item.main, item.suffix, item.en, item.desc, item.mark, item.code]);
  }
  function initTextAnimation() {
    ['color', 'motion'].forEach(function (kind) {
      var wrap = $(kind === 'color' ? '#textAnimColors' : '#textAnimMotions'); if (!wrap) return;
      wrap.textContent = '';
      textAnimationChoices(kind).forEach(function (entry) {
        var button = document.createElement('button');
        button.type = 'button'; button.className = 'text-anim-choice'; button.textContent = entry.name; button.title = entry.hint || '';
        button.setAttribute('data-text-anim-' + kind, entry.id); button.setAttribute('aria-pressed', 'false');
        button.addEventListener('click', function () { var patch = {}; patch[kind] = entry.id; editTextAnimation(patch, kind); });
        wrap.appendChild(button);
      });
    });
    [['textAnimSpeed', 'speed'], ['textAnimScope', 'scope'], ['textAnimStrength', 'strength']].forEach(function (pair) {
      var el = $('#' + pair[0]); if (!el) return;
      function apply() { var patch = {}; patch[pair[1]] = pair[1] === 'scope' ? el.value : Number(el.value); editTextAnimation(patch, pair[1]); }
      el.addEventListener('change', apply);
      if (pair[1] === 'strength') el.addEventListener('input', apply);
    });
    var replay = $('#btnTextAnimReplay'), clear = $('#btnTextAnimClear');
    if (replay) replay.addEventListener('click', function () {
      if (busy() || !state.cfg || !hasTextAnimation(state.cfg.stack)) return;
      resetPreviewClock(); state.previewMode = 'frame'; state.previewChoice = false; syncPreviewControl();
    });
    if (clear) clear.addEventListener('click', function () { editTextAnimation({ color: 'none', motion: 'none' }, 'clear'); });
    window.addEventListener('titlegen:job', function () { paintTextAnimation(); if (!busy()) paintOutputSummary(); });
    paintTextAnimation();
  }

  /* ---------------- 统计、胶片与选中条目 ---------------- */
  function paintStats() {
    setText('statTemplates', TG.templates.length);
    setText('statFamilies', TG.families.length);
    setText('statThemes', (TG.themes || []).length);
    setText('statModules', TG.CATS.reduce(function (n, cat) { return n + TG.list(cat.id).length; }, 0));
    var fam = TG.family(state.cfg.familyId);
    setText('stageCount', state.items.length + ' 张 · ' + fam.name);
    setText('familyTitle', fam.name); setText('familyDescription', fam.hint || '选择称号，再为它搭配样式。');
    paintKind('familyKind', fam.kind);
  }
  function paintCounts() {
    var stack = state.cfg.stack, decos = (stack.decos || []).length, motions = (stack.motions || []).length;
    var total = TG.CATS.reduce(function (count, cat) {
      var key = cat.id === 'deco' ? 'decos' : cat.id === 'motion' ? 'motions' : cat.id, selected = stack[key];
      return count + (cat.single ? (selected ? 1 : 0) : Array.isArray(selected) ? selected.length : 0);
    }, 0);
    setText('moduleSelectedCount', total + ' 项');
    setText('moduleSummary', '装饰 ' + decos + ' · 动效 ' + motions);
    var badge = $('#modErrors'), errors = TG.errors ? TG.errors() : [];
    if (!errors.length) { if (badge) badge.remove(); return; }
    if (!badge) {
      badge = document.createElement('span'); badge.id = 'modErrors'; badge.className = 'module-error';
      badge.style.cssText = 'color:#e0653c;font-size:11px;margin-left:8px;cursor:help';
      var foot = $('.console-foot'); if (foot) foot.appendChild(badge);
    }
    badge.textContent = '⚠ ' + errors.length + ' 个模块报错'; badge.title = errors.join('\n');
  }
  function syncSelection() {
    var film = $('#film'), grid = $('#grid');
    if (film) Array.prototype.forEach.call(film.children, function (el, i) {
      el.classList.toggle('on', i === state.idx); el.setAttribute('aria-pressed', i === state.idx ? 'true' : 'false');
    });
    if (grid) Array.prototype.forEach.call(grid.children, function (el, i) {
      var it = state.items[i] || {}, name = (it.main || '') + (it.suffix || '') || '未命名称号';
      el.classList.toggle('sel', i === state.idx); el.setAttribute('aria-current', i === state.idx ? 'true' : 'false');
      el.setAttribute('role', 'group'); el.tabIndex = 0; el.setAttribute('aria-label', name + '，按 Enter 在主预览中查看');
      var cv = el.querySelector('canvas'); if (cv) { cv.setAttribute('role', 'img'); cv.setAttribute('aria-label', name + '贴图'); }
    });
    syncRoving(film);
  }
  function buildFilm() {
    var wrap = $('#film'); if (!wrap) return;
    var key = JSON.stringify(state.items.map(function (it) { return [it.key, it.main, it.suffix, it.color, it.label]; }));
    if (key !== state.filmKey) {
      wrap.textContent = '';
      state.items.forEach(function (it, i) {
        var b = document.createElement('button'), dot = document.createElement('i'), text = document.createElement('span');
        b.type = 'button'; b.className = 'fl'; b.dataset.idx = String(i);
        dot.style.background = it.color || '#8fa0b8'; dot.style.boxShadow = '0 0 8px ' + (it.color || '#8fa0b8');
        text.textContent = (it.main || '') + (it.suffix || '') || '未命名称号';
        b.appendChild(dot); b.appendChild(text); b.title = text.textContent + ' · ' + (it.label || '');
        b.addEventListener('click', function () {
          if (busy()) return;
          select(i, false);
          if (drawer.panel === 'library' && isCompact('library')) showPreview();
        }); wrap.appendChild(b);
      });
      state.filmKey = key;
    }
    syncSelection();
  }
  function updateRenderKey() {
    state.renderKey = JSON.stringify({ item: currentItem(), family: state.cfg.familyId, stack: state.cfg.stack, scale: 1.6 });
  }
  function select(i, scroll) {
    if (busy() || !state.items.length) return;
    var previousIndex = state.idx;
    state.idx = Math.max(0, Math.min(state.items.length - 1, i));
    if (previousIndex !== state.idx) resetPreviewClock();
    updateRenderKey(); syncSelection(); paintHeroMeta(); paintTextAnimation(); paintCompare(); schedulePreview();
    if (previousIndex !== state.idx) window.dispatchEvent(new CustomEvent('titlegen:preview', { detail: { paused: previewPaused(), mode: state.previewMode } }));
    if (previousIndex !== state.idx) window.dispatchEvent(new CustomEvent('titlegen:selection', { detail: { index: state.idx } }));
    var grid = $('#grid'), card = grid && grid.children[state.idx];
    if (scroll && card && card.scrollIntoView) card.scrollIntoView({ block: 'nearest', behavior: media && media.matches ? 'auto' : 'smooth' });
  }
  function initCardSelect() {
    var grid = $('#grid'); if (!grid) return;
    grid.addEventListener('click', function (e) {
      if (e.target.closest('button')) return;
      var card = e.target.closest('.card'); if (card) select(Array.prototype.indexOf.call(grid.children, card), false);
    });
    grid.addEventListener('keydown', function (e) {
      if (!e.target.classList.contains('card') || (e.key !== 'Enter' && e.key !== ' ')) return;
      e.preventDefault(); select(Array.prototype.indexOf.call(grid.children, e.target), false);
    });
  }
  function paintKind(id, kind) {
    var el = document.getElementById(id); if (!el) return;
    var label = kind === 'canon' ? '世界观条目' : kind === 'original' ? '项目原创' : '';
    el.hidden = !label; el.dataset.kind = kind || ''; if (el.textContent !== label) el.textContent = label;
  }
  function paintTitleInfo() {
    var item = currentItem() || {}, family = TG.family(state.cfg.familyId);
    var lore = item.loreNote !== undefined ? item.loreNote : family.loreNote;
    var sources = item.sources !== undefined ? item.sources : family.sources;
    sources = Array.isArray(sources) ? sources : [];
    var links = item.sourceLinks !== undefined ? item.sourceLinks : family.sourceLinks;
    links = (Array.isArray(links) ? links : []).filter(function (link) {
      if (!link || typeof link.title !== 'string' || typeof link.url !== 'string') return false;
      try { return new URL(link.url).protocol === 'https:'; } catch (_) { return false; }
    });
    paintKind('titleKind', item.kind || family.kind);
    setText('titleDescription', item.desc || '这条称号还没有填写铭文。');
    setText('titleLoreNote', lore || ''); var row = $('#titleLoreRow'); if (row) row.hidden = !lore;
    var wrap = $('#titleSources'), sourceKey = JSON.stringify([sources, links]);
    if (wrap && wrap.dataset.sources !== sourceKey) {
      wrap.textContent = ''; wrap.dataset.sources = sourceKey;
      sources.forEach(function (source) { var code = document.createElement('code'); code.className = 'source-chip'; code.textContent = String(source); wrap.appendChild(code); });
      links.forEach(function (link) {
        var anchor = document.createElement('a'); anchor.className = 'source-link';
        anchor.href = link.url; anchor.textContent = link.title; anchor.target = '_blank'; anchor.rel = 'noopener noreferrer';
        wrap.appendChild(anchor);
      });
    }
    if (wrap) wrap.hidden = !sources.length && !links.length;
  }
  function paintOutputSummary() {
    var opts = state.cfg.options || {}, width = TG.W || 560, height = TG.H || 160;
    var pngScale = Number(opts.scale) || 2, gifScale = Number(opts.gifScale) || 1, timing = currentGifTiming();
    var png = 'PNG ' + Math.round(width * pngScale) + ' × ' + Math.round(height * pngScale);
    var gif = 'GIF ' + Math.round(width * gifScale) + ' × ' + Math.round(height * gifScale) + ' · ' + timing.frames + ' 帧 · ' + durationLabel(timing.durationMs) + ' · ' + timing.delayMs + ' ms / 帧';
    var icon = '图标 ' + (Number(opts.iconSize) || 256) + ' × ' + (Number(opts.iconSize) || 256);
    setText('summaryPng', png); setText('summaryGif', gif); setText('summaryIcon', icon);
    setText('outputSummaryInline', png + '；' + gif + ' · ' + (Number(opts.colors) || 128) + ' 色；' + icon + '。当前系列共 ' + state.items.length + ' 条称号。');
    var delaySelect = $('#optDelay');
    if (delaySelect) {
      delaySelect.disabled = busy() || timing.automatic;
      delaySelect.title = timing.automatic ? '文字动画或机械循环按完整周期自动计算帧间隔，关闭这些效果后恢复手动值。' : 'GIF 每帧的显示间隔';
    }
    var timingHint = timing.automatic
      ? '文字动画 / 机械循环按完整周期计算：' + durationLabel(timing.durationMs) + ' / 轮，' + timing.frames + ' 帧，' + timing.delayMs + ' ms / 帧（10 ms 精度）。手动值 ' + (Number(opts.delayMs) || 60) + ' ms 已保留。建议选择 24–32 帧。'
      : '手动基础帧间隔 ' + (Number(opts.delayMs) || 60) + ' ms；当前 GIF 共 ' + timing.frames + ' 帧，实际 ' + timing.delayMs + ' ms / 帧，时长 ' + durationLabel(timing.durationMs) + '。启用文字动画或机械循环后自动计算完整周期。';
    if (timing.speed && timing.speed !== 1) timingHint += '整体速度 ' + timing.speed + '×，按 GIF 的 10 ms 精度取整，最短 20 ms / 帧。';
    setText('gifTimingHint', timingHint);
  }
  function paintHeroMeta() {
    var it = currentItem(); if (!it) { setText('heroName', '没有称号'); setText('heroMeta', ''); return; }
    setText('heroName', (it.main || '') + (it.suffix || ''));
    var bits = it.en ? [it.en] : [];
    bits.push(TG.family(state.cfg.familyId).name, templateName(state.cfg));
    if (TG.theme) bits.push('主题 · ' + TG.theme(state.cfg.stack.theme || 'default').name);
    setText('heroMeta', bits.join(' · '));
    var cv = $('#heroCanvas'); if (cv) cv.setAttribute('aria-label', ((it.main || '') + (it.suffix || '') || '未命名称号') + '，当前样式预览');
    setText('btnCustomizeCurrent', state.cfg.familyId === 'custom' ? '继续编辑文案' : '编辑这条文案');
    var entry = $('#customEntry'); if (entry) entry.hidden = state.cfg.familyId === 'custom';
    paintTitleInfo();
  }

  /* ---------------- 大预览：缓存、暂停与后台节流 ---------------- */
  function previewPaused() { return state.previewChoice === null ? !!(media && media.matches) : state.previewChoice; }
  function previewTiming() { return state.previewTiming || currentGifTiming(); }
  function previewPhase() {
    var timing = previewTiming();
    return timing.durationMs > 0 ? (state.clock % timing.durationMs) / timing.durationMs : 0;
  }
  function previewFrameIndex() {
    var timing = previewTiming();
    return state.previewFrame !== null ? Math.min(timing.frames - 1, state.previewFrame) : Math.min(timing.frames - 1, Math.floor(previewPhase() * timing.frames + 1e-9));
  }
  function previewSample(animated) {
    var sample = { mode: 'static', t: 0, textTime: 0, loopPhase: 0 };
    if ((animated || state.previewMode === 'frame') && state.cfg && TG.hasAnimation(state.cfg.stack)) {
      var sampled = window.TITLEGEN.animationSample(previewPhase(), state.previewFrame === null ? undefined : { frameIndex: state.previewFrame });
      sample = { mode: 'frame', t: sampled.t, textTime: sampled.textTime, loopPhase: sampled.loopPhase };
    }
    TG.previewSample = sample; TG.previewTime = sample.t;
    return sample;
  }
  function paintTimeline() {
    var timing = previewTiming(), enabled = !!(state.cfg && TG.hasAnimation(state.cfg.stack)), locked = busy() || !enabled;
    var index = previewFrameIndex(), seek = $('#timelineSeek'), speed = $('#playbackSpeed');
    if (seek) {
      seek.max = Math.max(0, timing.frames - 1); seek.value = index; seek.disabled = locked;
      seek.setAttribute('aria-valuetext', '第 ' + (index + 1) + ' 帧，共 ' + timing.frames + ' 帧');
    }
    if (speed) { speed.value = timing.speed || 1; speed.disabled = locked; }
    ['timelinePrev', 'timelineNext', 'timelineReplay', 'heroFrame'].forEach(function (id) { var el = document.getElementById(id); if (el) el.disabled = locked; });
    var prev = $('#timelinePrev'), next = $('#timelineNext'), still = $('#timelineStatic');
    if (prev) prev.disabled = locked || index <= 0;
    if (next) next.disabled = locked || index >= timing.frames - 1;
    if (still) { still.disabled = busy() || !enabled; still.setAttribute('aria-pressed', previewPaused() && state.previewMode === 'static' ? 'true' : 'false'); }
    var staticView = previewPaused() && state.previewMode === 'static';
    setText('timelinePosition', !enabled ? '当前组合无动画' : staticView ? '完整静态图 · ' + durationLabel(timing.durationMs) + ' / 轮'
      : '第 ' + (index + 1) + ' / ' + timing.frames + ' 帧 · ' + (index * timing.delayMs / 1000).toFixed(2) + ' / ' + (timing.durationMs / 1000).toFixed(2) + ' 秒');
    setText('timelineHint', enabled ? '拖动可逐帧检查；整体速度同步到 GIF。“导出此帧”保存选中画面，PNG 保留完整文字。' : '为当前组合添加文字动画、动态装饰或动效后，即可逐帧检查和调整整体速度。');
  }
  function seekPreview(index) {
    if (busy() || !state.cfg || !TG.hasAnimation(state.cfg.stack)) return;
    var timing = previewTiming();
    index = Math.max(0, Math.min(timing.frames - 1, Math.round(Number(index) || 0)));
    state.clock = index * timing.durationMs / timing.frames; state.previewFrame = index;
    state.lastFrame = 0; state.previewMode = 'frame'; state.previewChoice = true;
    syncPreviewControl();
  }
  function ensureBase() {
    if (!currentItem()) return null;
    if (!state.base || state.baseKey !== state.renderKey) {
      state.base = TG.makeBase(currentItem(), state.cfg.stack, 1.6); state.baseKey = state.renderKey;
    }
    if (heroCanvas && (heroCanvas.width !== state.base.canvas.width || heroCanvas.height !== state.base.canvas.height)) {
      heroCanvas.width = state.base.canvas.width; heroCanvas.height = state.base.canvas.height;
    }
    return state.base;
  }
  function drawPreview(animated) {
    var sample = previewSample(animated);
    var base = ensureBase(); if (!base || !heroCanvas) return;
    var ctx = heroCanvas.getContext('2d'), frame = sample.mode === 'frame' ? TG.renderFrame(base, sample.t, { textTime: sample.textTime, loopPhase: sample.loopPhase }) : TG.renderStatic(base);
    ctx.clearRect(0, 0, heroCanvas.width, heroCanvas.height); ctx.drawImage(frame, 0, 0);
    paintTimeline();
  }
  function canAnimate() { return !document.hidden && !busy() && !previewPaused() && state.cfg && TG.hasAnimation(state.cfg.stack); }
  function animationFrame(ts) {
    state.raf = 0;
    if (!canAnimate()) { state.lastFrame = 0; return; }
    if (!state.lastFrame || ts - state.lastFrame >= 40) {
      state.clock += state.lastFrame ? Math.min(150, ts - state.lastFrame) : 0; state.lastFrame = ts;
      try { drawPreview(true); } catch (e) { console.error(e); toast('预览失败：' + e.message); return; }
    }
    state.raf = requestAnimationFrame(animationFrame);
  }
  function schedulePreview() {
    if (state.raf) cancelAnimationFrame(state.raf);
    state.raf = 0;
    if (document.hidden || busy() || !state.cfg) { state.lastFrame = 0; return; }
    var animated = canAnimate();
    if (!animated) state.lastFrame = 0;
    try { drawPreview(animated); } catch (e) { console.error(e); toast('预览失败：' + e.message); return; }
    if (animated) state.raf = requestAnimationFrame(animationFrame);
  }
  function syncPreviewControl() {
    var paused = previewPaused(), btn = $('#previewPause');
    TG.previewPaused = paused;
    if (btn) {
      btn.setAttribute('aria-pressed', paused ? 'true' : 'false');
      btn.textContent = paused ? '播放预览' : '暂停预览';
      btn.title = state.previewChoice === null && media && media.matches ? '已按系统减少动态效果设置暂停' : '只控制预览，不影响导出动画';
    }
    paintTextAnimation();
    schedulePreview();
    paintTimeline();
    window.dispatchEvent(new CustomEvent('titlegen:preview', { detail: { paused: paused, mode: state.previewMode } }));
  }
  function initPreview() {
    heroCanvas = $('#heroCanvas');
    var btn = $('#previewPause');
    if (btn) btn.addEventListener('click', function () {
      if (busy()) return;
      state.previewChoice = !previewPaused(); state.previewMode = state.previewChoice ? 'static' : 'frame';
      state.previewFrame = null; state.lastFrame = 0; syncPreviewControl();
    });
    var seek = $('#timelineSeek'), prev = $('#timelinePrev'), next = $('#timelineNext'), replay = $('#timelineReplay'), still = $('#timelineStatic'), speed = $('#playbackSpeed');
    if (seek) seek.addEventListener('input', function () { seekPreview(seek.value); });
    if (prev) prev.addEventListener('click', function () { seekPreview(previewFrameIndex() - 1); });
    if (next) next.addEventListener('click', function () { seekPreview(previewFrameIndex() + 1); });
    if (replay) replay.addEventListener('click', function () {
      if (busy()) return;
      resetPreviewClock(); state.previewMode = 'frame'; state.previewChoice = false; syncPreviewControl();
    });
    if (still) still.addEventListener('click', function () {
      if (busy()) return;
      state.previewMode = 'static'; state.previewChoice = true; state.previewFrame = null; state.lastFrame = 0; syncPreviewControl();
    });
    if (speed) speed.addEventListener('change', function () {
      if (busy()) return;
      try { window.TITLEGEN.setPlayback({ speed: Number(speed.value) }, 'playback-speed'); }
      catch (e) { paintTimeline(); toast('速度设置失败：' + e.message); }
    });
    if (media) {
      var onChange = function () { if (state.previewChoice === null) syncPreviewControl(); };
      if (media.addEventListener) media.addEventListener('change', onChange); else if (media.addListener) media.addListener(onChange);
    }
    document.addEventListener('visibilitychange', schedulePreview);
    window.addEventListener('titlegen:job', function () { schedulePreview(); paintHistory(); paintTimeline(); paintModuleParameters(); if (!busy()) paintCompare(); });
    syncPreviewControl();
  }

  /* ---------------- A/B：同一内容比较两套样式 ---------------- */
  function paintCompare() {
    if (!state.compareOn || !currentItem() || busy()) return;
    var baseline = state.compareCfg || state.cfg;
    function draw(id, cfg) {
      var cv = $('#' + id); if (!cv) return;
      var base = TG.makeBase(currentItem(), cfg.stack, 1.1), frame = TG.renderStatic(base);
      cv.width = frame.width; cv.height = frame.height;
      var ctx = cv.getContext('2d'); ctx.clearRect(0, 0, cv.width, cv.height); ctx.drawImage(frame, 0, 0);
    }
    draw('cmpA', state.cfg); draw('cmpB', baseline);
    var labels = $$('#compareWrap .cmp-tag');
    var a = $('#cmpLabelA') || labels[0], b = $('#cmpLabelB') || labels[1];
    if (a) a.textContent = '当前 · ' + templateName(state.cfg);
    if (b) b.textContent = (state.comparePinned ? '固定对照 · ' : '上一个配置 · ') + templateName(baseline);
  }
  function initCompare() {
    state.compareCfg = copy(state.cfg);
    var btn = $('#heroCompare'), pin = $('#btnPinCompare');
    function toggle(on) {
      state.compareOn = on;
      if (btn) { btn.setAttribute('aria-pressed', on ? 'true' : 'false'); btn.classList.toggle('primary', on); }
      var wrap = $('#compareWrap'); if (wrap) wrap.hidden = !on;
      paintCompare();
    }
    if (btn) btn.addEventListener('click', function () { toggle(!state.compareOn); });
    if (pin) pin.addEventListener('click', function () {
      if (busy()) return;
      state.compareCfg = copy(state.cfg); state.comparePinned = true;
      pin.textContent = '更新对照'; pin.setAttribute('aria-pressed', 'true');
      toggle(true); toast('已设为对照：' + templateName(state.cfg));
    });
    if (location.hash === '#compare') toggle(true);
  }

  /* ---------------- 事件同步、撤销与重做 ---------------- */
  function paintHistory() {
    var undo = $('#btnUndo'), redo = $('#btnRedo');
    if (undo) { undo.disabled = busy() || !historyState.past.length; undo.title = historyState.past.length ? '撤销上一次编辑（Ctrl/Cmd+Z）' : '没有可撤销的编辑'; }
    if (redo) { redo.disabled = busy() || !historyState.future.length; redo.title = historyState.future.length ? '重做（Ctrl/Cmd+Shift+Z）' : '没有可重做的编辑'; }
    var restore = $('#btnRestoreDraft'), dismiss = $('#btnDismissDraft');
    if (restore) restore.disabled = busy() || !pendingDraft;
    if (dismiss) dismiss.disabled = busy() || !pendingDraft;
  }
  function historyMergeKey(reason) {
    var active = document.activeElement;
    if (!active || !active.id || !/^(INPUT|TEXTAREA)$/.test(active.tagName)) return '';
    if (/^(checkbox|radio|file|button|submit)$/.test(active.type || '')) return '';
    if (/config|import|share|draft|favorite|undo|redo|template|family|theme|random|reset|clear|api|^set/.test(reason)) return '';
    return reason + ':' + active.id;
  }
  function syncFromApp(reason, options) {
    if (state.internal) return;
    options = options || {};
    var cfg = window.TITLEGEN.config(), key = JSON.stringify(cfg), prev = state.cfg, changed = key !== state.cfgKey;
    var previousIndex = state.idx, previousText = textReplayKey(currentItem());
    var previousPhase = state.previewDuration > 0 ? (state.clock % state.previewDuration) / state.previewDuration : 0;
    if (changed && prev && options.record !== false && !state.replaying) {
      var mergeKey = historyMergeKey(reason), now = Date.now();
      if (!mergeKey || mergeKey !== historyState.key || now - historyState.at > 900) {
        historyState.past.push(prev); if (historyState.past.length > 30) historyState.past.shift();
      }
      historyState.future = []; historyState.key = mergeKey; historyState.at = now;
    }
    if (changed && prev && options.compare !== false && !state.comparePinned &&
        (prev.templateId !== cfg.templateId || JSON.stringify(prev.stack) !== JSON.stringify(cfg.stack))) state.compareCfg = prev;
    if (prev && prev.familyId !== cfg.familyId && options.preserveIndex !== true) {
      state.idx = 0; var search = $('#titleSearch'); if (search) search.value = '';
    }
    state.cfg = cfg; state.cfgKey = key;
    var family = TG.family(cfg.familyId), info = window.TITLEGEN.items();
    state.items = family.items.map(function (it, i) { return Object.assign({}, it, info[i] || {}); });
    state.idx = Math.max(0, Math.min(state.items.length - 1, state.idx));
    state.previewTiming = currentGifTiming(); state.previewDuration = state.previewTiming.durationMs;
    state.clock = previousPhase * state.previewDuration;
    if (state.previewFrame !== null) {
      state.previewFrame = Math.min(state.previewTiming.frames - 1, Math.round(previousPhase * state.previewTiming.frames));
      state.clock = state.previewFrame * state.previewDuration / state.previewTiming.frames;
    }
    var oldAnimation = textAnimationConfig(prev && prev.stack), newAnimation = textAnimationConfig(cfg.stack);
    if (!prev || prev.familyId !== cfg.familyId || previousIndex !== state.idx || previousText !== textReplayKey(currentItem()) ||
        oldAnimation.color !== newAnimation.color || oldAnimation.motion !== newAnimation.motion) resetPreviewClock();
    updateRenderKey(); buildFilm(); filterTitles(false); paintStats(); paintHeroMeta(); paintOutputSummary();
    paintTextAnimation(); paintChoices(); filterModules(); paintModuleParameters(); schedulePreview(); paintTimeline(); paintCounts(); paintCompare(); paintHistory();
    window.dispatchEvent(new CustomEvent('titlegen:preview', { detail: { paused: previewPaused(), mode: state.previewMode } }));
    var explicitConfig = /^(config-import|share|draft|favorite)$/.test(reason);
    if ((changed || explicitConfig) && prev && options.persist !== false) {
      if (pendingDraft) { pendingDraft = null; showDraftPrompt(); }
      scheduleDraft();
    }
  }
  function applyUIConfig(cfg, reason) {
    state.applyReason = reason;
    try { window.TITLEGEN.applyConfigJSON(cfg); }
    finally { state.applyReason = ''; }
  }
  function replay(direction) {
    if (busy()) return;
    var source = direction === 'undo' ? historyState.past : historyState.future;
    var target = direction === 'undo' ? historyState.future : historyState.past;
    if (!source.length) return;
    var cfg = source.pop(), previous = state.cfg;
    target.push(previous); state.replaying = true; historyState.key = '';
    try { applyUIConfig(cfg, direction); }
    catch (e) { source.push(cfg); target.pop(); toast((direction === 'undo' ? '撤销' : '重做') + '失败：' + e.message); }
    finally { state.replaying = false; paintHistory(); }
  }
  function initHistory() {
    var undo = $('#btnUndo'), redo = $('#btnRedo');
    if (undo) undo.addEventListener('click', function () { replay('undo'); });
    if (redo) redo.addEventListener('click', function () { replay('redo'); });
    document.addEventListener('keydown', function (e) {
      if (!(e.ctrlKey || e.metaKey) || e.altKey || e.isComposing || busy()) return;
      var el = e.target; if (el && (el.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName))) return;
      if (e.key.toLowerCase() === 'z') { e.preventDefault(); replay(e.shiftKey ? 'redo' : 'undo'); }
      else if (e.key.toLowerCase() === 'y') { e.preventDefault(); replay('redo'); }
    });
    paintHistory();
  }

  /* ---------------- 自动草稿：先提示，不覆盖分享或导入 ---------------- */
  function showDraftPrompt() {
    var banner = $('#draftBanner'); if (banner) banner.hidden = !pendingDraft;
    var restore = $('#btnRestoreDraft'), dismiss = $('#btnDismissDraft');
    if (restore) restore.hidden = !pendingDraft;
    if (dismiss) dismiss.hidden = !pendingDraft;
    paintHistory();
  }
  function saveDraft() {
    clearTimeout(draftTimer); draftTimer = 0;
    if (!draftDirty || !state.cfg || pendingDraft) return;
    if (state.internal || busy()) { draftTimer = setTimeout(saveDraft, 700); return; }
    try {
      localStorage.setItem(DRAFT_KEY, JSON.stringify({ version: 1, at: Date.now(), cfg: state.cfg }));
      draftDirty = false; setText('draftStatus', '草稿已自动保存到此浏览器');
    } catch (e) { setText('draftStatus', '此浏览器暂不能保存草稿，请导出配置'); }
  }
  function scheduleDraft() { draftDirty = true; setText('draftStatus', '正在保存草稿…'); clearTimeout(draftTimer); draftTimer = setTimeout(saveDraft, 650); }
  function initDraft(shared) {
    try {
      var stored = JSON.parse(localStorage.getItem(DRAFT_KEY) || 'null');
      if (!shared && stored && stored.cfg && stored.cfg.kind === 'mirrorcity-titlegen-config' && JSON.stringify(stored.cfg) !== state.cfgKey) pendingDraft = stored;
      setText('draftStatus', pendingDraft ? '发现上次草稿，可恢复；直接编辑会开始保存新草稿' : shared ? '已应用分享配置' : stored ? '当前草稿已保存' : '编辑后自动保存到此浏览器');
    } catch (e) { setText('draftStatus', '草稿不可用，可使用配置文件保存'); }
    showDraftPrompt();
    var restore = $('#btnRestoreDraft'), dismiss = $('#btnDismissDraft');
    if (restore) restore.addEventListener('click', function () {
      if (!pendingDraft || busy()) return;
      var draft = pendingDraft;
      try { applyUIConfig(draft.cfg, 'draft'); pendingDraft = null; showDraftPrompt(); scheduleDraft(); toast('已恢复上次草稿'); }
      catch (e) { pendingDraft = draft; showDraftPrompt(); toast('草稿恢复失败：' + e.message); }
    });
    if (dismiss) dismiss.addEventListener('click', function () {
      if (busy()) return;
      pendingDraft = null;
      try { localStorage.removeItem(DRAFT_KEY); } catch (e) {}
      showDraftPrompt(); setText('draftStatus', '已忽略旧草稿；下次编辑会自动保存');
    });
    if (shared) scheduleDraft();
    window.addEventListener('pagehide', saveDraft);
  }

  /* ---------------- 分享与收藏 ---------------- */
  function encodeShare() {
    var text = JSON.stringify(window.TITLEGEN.config());
    var bytes = new TextEncoder().encode(text), binary = '';
    for (var i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
    return location.href.split('#')[0] + '#cfg=' + btoa(binary).replace(/=+$/, '');
  }
  function decodeShare() {
    var match = /^#cfg=(.+)$/.exec(location.hash || ''); if (!match) return false;
    try {
      var bytes = b64ToU8(decodeURIComponent(match[1]));
      window.TITLEGEN.applyConfigJSON(new TextDecoder('utf-8', { fatal: true }).decode(bytes));
      return true;
    } catch (e) { console.warn('share decode failed', e); toast('分享配置无法读取：' + e.message); return false; }
  }
  function initShare() {
    var btn = $('#btnShare'); if (!btn) return;
    btn.addEventListener('click', function () {
      var url = encodeShare(), done = function () { toast('分享链接已复制（' + url.length + ' 字符）'); };
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(url).then(done, function () { window.prompt('复制这个链接：', url); });
      else window.prompt('复制这个链接：', url);
    });
  }
  function loadFavs() {
    favoriteReadIssue = false;
    try {
      var list = JSON.parse(localStorage.getItem(FAV_KEY) || '[]');
      if (!Array.isArray(list)) { favoriteReadIssue = true; return []; }
      var valid = list.filter(function (fav) {
        return fav && typeof fav === 'object' && !Array.isArray(fav) && typeof fav.name === 'string' &&
          fav.cfg && typeof fav.cfg === 'object' && !Array.isArray(fav.cfg) &&
          fav.cfg.kind === 'mirrorcity-titlegen-config' && fav.cfg.version === 1;
      });
      favoriteReadIssue = valid.length !== list.length || valid.length > 12;
      // Reading never rewrites the original stored value. An explicit save or
      // delete persists the usable list, retaining the documented twelve limit.
      return valid.slice(0, 12);
    } catch (e) { favoriteReadIssue = true; return []; }
  }
  function saveFavs(list) {
    try { localStorage.setItem(FAV_KEY, JSON.stringify(list.slice(0, 12))); return true; }
    catch (e) { toast('收藏保存失败，请导出配置保留'); return false; }
  }
  function paintFavs() {
    var wrap = $('#favList'); if (!wrap) return;
    var favs = loadFavs(); wrap.textContent = '';
    if (favoriteReadIssue) {
      var issue = document.createElement('span'); issue.className = 'hint';
      issue.textContent = '部分收藏无法读取或超过 12 条，仅显示可用收藏；原存储在保存或删除前保留。'; wrap.appendChild(issue);
    }
    if (!favs.length) {
      var tip = document.createElement('span'); tip.className = 'hint'; tip.textContent = '还没有收藏；调好一套后点「收藏当前」'; wrap.appendChild(tip); return;
    }
    favs.forEach(function (fav, i) {
      var btn = document.createElement('button'); btn.className = 'fam fav-chip'; btn.textContent = fav.name;
      btn.title = '套用这个收藏 · 右键删除';
      btn.addEventListener('click', function () {
        if (busy()) return;
        try { applyUIConfig(fav.cfg, 'favorite'); toast('已套用收藏：' + fav.name); }
        catch (e) { toast('收藏无法套用：' + e.message); }
      });
      btn.addEventListener('contextmenu', function (e) {
        e.preventDefault(); if (busy()) return;
        var list = loadFavs(); list.splice(i, 1); if (saveFavs(list)) { paintFavs(); toast('已删除收藏'); }
      });
      wrap.appendChild(btn);
    });
  }
  function initFavs() {
    var btn = $('#btnFav');
    if (btn) btn.addEventListener('click', function () {
      var cfg = window.TITLEGEN.config(), name = TG.family(cfg.familyId).name + '·' + templateName(cfg);
      if (TG.theme && cfg.stack.theme !== 'default') name += '·' + TG.theme(cfg.stack.theme).name;
      var list = loadFavs(); list.unshift({ name: name, cfg: cfg, at: Date.now() });
      if (saveFavs(list)) { paintFavs(); toast('已收藏：' + name + '（右键可删）'); }
    });
    paintFavs();
  }

  /* ---------------- 共享导出锁与下载 ---------------- */
  function b64ToU8(b64) {
    var bin = atob(b64), bytes = new Uint8Array(bin.length);
    for (var i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return bytes;
  }
  function safeName(name) {
    var clean = String(name || '称号').replace(/[\\/:*?"<>|\x00-\x1f]+/g, '_').replace(/[. ]+$/, '');
    if (/^(con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\.|$)/i.test(clean)) clean = '_' + clean;
    return clean || '称号';
  }
  function downloadBytes(bytes, name, mime) {
    var blob = new Blob([bytes], { type: mime }), url = URL.createObjectURL(blob), a = document.createElement('a');
    a.href = url; a.download = name; document.body.appendChild(a);
    try { a.click(); } finally { setTimeout(function () { URL.revokeObjectURL(url); a.remove(); }, 1500); }
    return blob.size;
  }
  function beginJob(label, total) {
    if (!TG.jobs) { toast('导出任务模块未加载，请刷新页面'); return null; }
    var token = TG.jobs.start(label, total);
    if (!token) toast('已有导出任务，请等待完成或取消');
    return token;
  }
  function finishJob(token, result, btn, label) {
    if (btn) btn.textContent = label;
    try { TG.jobs.finish(token, result); }
    finally { paintHistory(); if (result.message) toast(result.message); }
  }
  async function exportHero(kind, btn) {
    var item = currentItem(); if (!item) return;
    if (busy()) return;
    var frameIndex = kind === 'frame' ? previewFrameIndex() : 0;
    if (kind === 'frame') seekPreview(frameIndex);
    var token = beginJob(kind === 'frame' ? '导出选中动画帧' : '导出当前 ' + kind.toUpperCase(), 1); if (!token) return;
    var label = btn.textContent, idx = state.idx, opts = copy(state.cfg.options || {}), name = safeName(item.label), result = { success: 0, failed: 0, cancelled: false };
    btn.textContent = kind === 'gif' ? '编码中…' : '生成中…';
    try {
      await nextTask();
      if (TG.jobs.cancelled(token)) { result.cancelled = true; return; }
      var bytes, mime;
      if (kind === 'png') { bytes = b64ToU8(window.TITLEGEN.pngBase64(idx, opts)); mime = 'image/png'; name += '.png'; }
      else if (kind === 'gif') { bytes = b64ToU8(window.TITLEGEN.gifBase64(idx, opts).b64); mime = 'image/gif'; name += '.gif'; }
      else if (kind === 'frame') { bytes = b64ToU8(window.TITLEGEN.frameIndexBase64(idx, frameIndex, opts)); mime = 'image/png'; name += '_帧' + String(frameIndex + 1).padStart(2, '0') + '.png'; }
      else { bytes = b64ToU8(window.TITLEGEN.iconBase64(idx, opts).b64); mime = 'image/png'; name += '_图标.png'; }
      await nextTask();
      if (TG.jobs.cancelled(token)) { result.cancelled = true; return; }
      downloadBytes(bytes, name, mime); result.success = 1;
      result.message = '已导出 ' + name + ' · ' + (bytes.length / 1024).toFixed(0) + ' KB';
      TG.jobs.progress(token, 1, result.message);
    } catch (e) { result.failed = 1; result.message = '导出失败：' + e.message; console.error(e); }
    finally {
      if (result.cancelled) result.message = '已取消本次导出';
      finishJob(token, result, btn, label);
    }
  }
  function initHeroActions() {
    [['heroPng', 'png'], ['heroGif', 'gif'], ['heroIcon', 'icon'], ['heroFrame', 'frame']].forEach(function (pair) {
      var btn = $('#' + pair[0]); if (btn) btn.addEventListener('click', function () { exportHero(pair[1], btn); });
    });
  }
  function packageFiles(files, failures, name) {
    if (failures.length) files.push({ name: '_导出失败说明.txt', data: new TextEncoder().encode('本次为部分导出，以下内容未能生成：\n\n' + failures.join('\n')) });
    var bytes = TG.zip(files);
    downloadBytes(bytes, name, 'application/zip');
    return bytes.length;
  }
  async function runZip(btn) {
    if (!TG.zip) { toast('ZIP 模块未加载'); return; }
    var cfg = window.TITLEGEN.config(), items = window.TITLEGEN.items(), opts = copy(cfg.options || {});
    var token = beginJob('打包当前系列', items.length * 3 + 2); if (!token) return;
    var label = btn.textContent, files = [], failures = [], done = 0, result = { success: 0, failed: 0, cancelled: false };
    async function add(name, make) {
      await nextTask(); if (TG.jobs.cancelled(token)) return false;
      try { files.push({ name: name, data: b64ToU8(make()) }); result.success++; }
      catch (e) { failures.push(name + '：' + e.message); result.failed++; console.warn('ZIP export failed', name, e); }
      done++; TG.jobs.progress(token, done, '已处理 ' + done + '/' + (items.length * 3 + 2));
      btn.textContent = '打包中 ' + done + '/' + (items.length * 3 + 2); return true;
    }
    try {
      for (var i = 0; i < items.length; i++) {
        var item = items[i], prefix = safeName(item.label);
        if (!await add(prefix + '.png', function () { return window.TITLEGEN.pngBase64(i, opts); })) break;
        if (!await add(prefix + '.gif', function () { return window.TITLEGEN.gifBase64(i, opts).b64; })) break;
        if (!await add('图标/' + prefix + '.png', function () { return window.TITLEGEN.iconBase64(i, opts).b64; })) break;
      }
      if (TG.jobs.cancelled(token)) { result.cancelled = true; return; }
      await add('_合集海报.png', function () { return window.TITLEGEN.posterBase64({ scale: 1 }); });
      await nextTask(); if (TG.jobs.cancelled(token)) { result.cancelled = true; return; }
      if (!result.success) throw new Error('没有成功生成可打包的图片');
      files.push({ name: '本次配置.json', data: new TextEncoder().encode(JSON.stringify(cfg, null, 2)) });
      var name = safeName('称号包_' + TG.family(cfg.familyId).name + '_' + templateName(cfg)) + (failures.length ? '_部分失败' : '') + '.zip';
      var size = packageFiles(files, failures, name);
      TG.jobs.progress(token, items.length * 3 + 2, '打包完成');
      result.message = '已导出 ' + name + ' · ' + (size / 1024 / 1024).toFixed(2) + ' MB · 成功 ' + result.success + ' 项' + (result.failed ? '，失败 ' + result.failed + ' 项（详见包内说明）' : '');
    } catch (e) { result.failed++; result.message = '打包失败：' + e.message; console.error(e); }
    finally {
      if (result.cancelled) result.message = '已取消打包 · 已处理 ' + done + ' 项，未生成下载包';
      finishJob(token, result, btn, label);
    }
  }
  async function runZipAll(btn) {
    if (!TG.zip) { toast('ZIP 模块未加载'); return; }
    var keep = window.TITLEGEN.config(), keepIndex = state.idx, templates = TG.templates.slice();
    var token = beginJob('打包全部模板', templates.length * 3 + 1); if (!token) return;
    var label = btn.textContent, files = [], failures = [], done = 0, result = { success: 0, failed: 0, cancelled: false };
    state.internal++;
    try {
      for (var i = 0; i < templates.length; i++) {
        await nextTask(); if (TG.jobs.cancelled(token)) { result.cancelled = true; break; }
        var template = templates[i], items, idx, item;
        try {
          window.TITLEGEN.set({ template: template.id }); items = window.TITLEGEN.items();
          idx = Math.min(items.length - 1, 1); item = items[idx]; if (!item) throw new Error('模板没有可用条目');
        } catch (e) {
          failures.push(template.name + '：' + e.message); result.failed += 3; done += 3;
          TG.jobs.progress(token, done, '模板失败：' + template.name); continue;
        }
        var prefix = safeName(template.name) + '/' + safeName(item.label);
        var outputs = [
          { name: prefix + '.png', make: function () { return window.TITLEGEN.pngBase64(idx, { scale: 2 }); } },
          { name: prefix + '.gif', make: function () { return window.TITLEGEN.gifBase64(idx, { gifScale: 1, frames: 12, delayMs: 60, colors: 96 }).b64; } },
          { name: prefix + '_图标.png', make: function () { return window.TITLEGEN.iconBase64(idx, { iconSize: 128 }).b64; } }
        ];
        for (var j = 0; j < outputs.length; j++) {
          await nextTask(); if (TG.jobs.cancelled(token)) { result.cancelled = true; break; }
          try { files.push({ name: outputs[j].name, data: b64ToU8(outputs[j].make()) }); result.success++; }
          catch (e) { failures.push(outputs[j].name + '：' + e.message); result.failed++; console.warn('ZIP template export failed', template.id, e); }
          done++; btn.textContent = '打包 ' + (i + 1) + '/' + templates.length;
          TG.jobs.progress(token, done, template.name + ' · ' + (j + 1) + '/3');
        }
        if (result.cancelled) break;
      }
      await nextTask(); if (TG.jobs.cancelled(token)) result.cancelled = true;
      if (result.cancelled) return;
      if (!result.success) throw new Error('没有成功生成可打包的图片');
      files.push({ name: '导出前的配置.json', data: new TextEncoder().encode(JSON.stringify(keep, null, 2)) });
      var name = '模板全览_' + templates.length + '套' + (failures.length ? '_部分失败' : '') + '.zip';
      var size = packageFiles(files, failures, name);
      TG.jobs.progress(token, templates.length * 3 + 1, '打包完成');
      result.message = '已导出 ' + name + ' · ' + (size / 1024 / 1024).toFixed(2) + ' MB · 成功 ' + result.success + ' 项' + (result.failed ? '，失败 ' + result.failed + ' 项（详见包内说明）' : '');
    } catch (e) { result.failed++; result.message = '全模板打包失败：' + e.message; console.error(e); }
    finally {
      var restoreError = null;
      try { window.TITLEGEN.applyConfigJSON(keep); }
      catch (e) {
        try { if (!window.TITLEGEN.loadConfig) throw e; window.TITLEGEN.loadConfig(keep); }
        catch (fallbackError) { restoreError = fallbackError; }
      }
      state.internal--; state.idx = keepIndex;
      try { syncFromApp('export-restore', { record: false, persist: false, compare: false, preserveIndex: true }); }
      catch (e) { restoreError = restoreError || e; }
      if (result.cancelled) result.message = '已取消全模板打包 · 已处理 ' + done + ' 项，未生成下载包';
      if (restoreError) { result.failed++; result.message = (result.message || '任务已结束') + '；恢复原配置失败：' + restoreError.message; }
      finishJob(token, result, btn, label);
    }
  }

  /* ---------------- 启动 ---------------- */
  function boot() {
    if (!window.TITLEGEN || !window.TITLEGEN.ready) { setTimeout(boot, 60); return; }
    window.TITLEGEN.selection = function () { return { index: state.idx, item: currentItem() ? copy(currentItem()) : null }; };
    window.TITLEGEN.openEditor = function (pane) { openEditor(pane, document.activeElement); };
    var shared = decodeShare();
    syncFromApp('init', { record: false, persist: false, compare: false });
    initTabs(); initFilters(); initModuleParameters(); initTextAnimation(); initChoiceNavigation(); initDrawer(); initPreviewBackground(); initCustomize();
    initCardSelect(); initPreview(); initCompare(); initHistory();
    initShare(); initFavs(); initHeroActions(); initDraft(shared);
    window.addEventListener('titlegen:change', function (event) {
      var reason = state.applyReason || event.detail && event.detail.reason || 'change';
      syncFromApp(reason);
    });
    var zip = $('#btnZip'), all = $('#btnZipAll');
    if (zip) zip.addEventListener('click', function () { runZip(zip); });
    if (all) all.addEventListener('click', function () { runZipAll(all); });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();
