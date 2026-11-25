/* Shared export task state. One task at a time; cancellation occurs between items. */
(function () {
  'use strict';
  var TG = window.TG;
  var active = null, seq = 0, locked = new Map(), observer = null;
  var last = null;
  function byId(id) { return document.getElementById(id); }
  function exempt(el) { return el.id === 'btnExportCancel' || el.id === 'btnExportDismiss'; }
  function lockOne(el) {
    if (!el || !el.matches || !el.matches('button,input,select,textarea') || exempt(el)) return;
    if (!locked.has(el)) locked.set(el, !!el.disabled);
    el.disabled = true;
  }
  function lockTree(root) {
    lockOne(root);
    if (root.querySelectorAll) Array.prototype.forEach.call(root.querySelectorAll('button,input,select,textarea'), lockOne);
  }
  function snapshot(job, message) {
    return {
      busy: !!active, id: job && job.id, label: job && job.label || '',
      total: job && job.total || 0, done: job && job.done || 0,
      cancelled: !!(job && job.cancelRequested), message: message || ''
    };
  }
  function paint(job, message) {
    var panel = byId('exportProgress'), bar = byId('exportProgressBar');
    var text = byId('exportProgressText'), cancel = byId('btnExportCancel'), dismiss = byId('btnExportDismiss');
    if (panel) { panel.hidden = false; panel.setAttribute('aria-busy', active ? 'true' : 'false'); }
    if (bar) {
      bar.max = Math.max(1, job.total); bar.value = job.done;
      bar.setAttribute('aria-label', job.label + ' ' + job.done + '/' + job.total);
    }
    if (text) text.textContent = message || job.label + ' · ' + job.done + '/' + job.total;
    if (cancel) {
      cancel.hidden = !active;
      cancel.disabled = !!job.cancelRequested;
      cancel.textContent = job.cancelRequested ? '正在取消…' : '取消导出';
    }
    if (dismiss) { dismiss.hidden = !!active; dismiss.disabled = false; }
    window.dispatchEvent(new CustomEvent('titlegen:job', { detail: snapshot(job, message) }));
  }
  function requestCancel() {
    if (!active || active.cancelRequested) return;
    active.cancelRequested = true;
    paint(active, '正在取消；当前图片处理完后停止。已下载的文件会保留。');
  }
  function start(label, total) {
    if (active) return null;
    active = { id: ++seq, label: String(label || '导出'), total: Math.max(1, Number(total) || 1), done: 0, cancelRequested: false };
    locked = new Map();
    lockTree(document);
    observer = new MutationObserver(function (records) {
      if (!active) return;
      records.forEach(function (record) { Array.prototype.forEach.call(record.addedNodes, lockTree); });
    });
    observer.observe(document.body, { childList: true, subtree: true });
    paint(active, active.label + ' · 准备中');
    return active;
  }
  function finish(token, result) {
    if (!token || active !== token) return;
    result = result || {};
    if (result.cancelled) token.cancelRequested = true;
    if (typeof result.success === 'number' || typeof result.failed === 'number') {
      token.done = Math.min(token.total, Math.max(token.done, (result.success || 0) + (result.failed || 0)));
    }
    if (observer) { observer.disconnect(); observer = null; }
    active = null;
    locked.forEach(function (disabled, el) { el.disabled = disabled; });
    locked.clear();
    var message = result.message || (token.cancelRequested ? '已取消导出' : result.failed ? '导出结束，部分文件失败' : '导出完成');
    last = Object.assign(snapshot(token, message), { success: result.success || 0, failed: result.failed || 0 });
    paint(token, message);
  }
  TG.jobs = {
    start: start,
    isBusy: function () { return !!active; },
    cancelled: function (token) { return !token || !!token.cancelRequested; },
    cancel: requestCancel,
    progress: function (token, done, message) {
      if (!token || active !== token) return;
      token.done = Math.max(0, Math.min(token.total, Number(done) || 0));
      paint(token, message);
    },
    finish: finish,
    status: function () { return active ? snapshot(active) : last; }
  };
  document.addEventListener('click', function (event) {
    if (!active || !event.target.closest) return;
    var control = event.target.closest('button,input,select,textarea');
    if (control && !exempt(control)) { event.preventDefault(); event.stopImmediatePropagation(); }
  }, true);
  document.addEventListener('keydown', function (event) {
    if (active && event.key === 'Escape') { event.preventDefault(); requestCancel(); }
  });
  function bind() {
    var cancel = byId('btnExportCancel'), dismiss = byId('btnExportDismiss');
    if (cancel) cancel.addEventListener('click', requestCancel);
    if (dismiss) dismiss.addEventListener('click', function () { var panel = byId('exportProgress'); if (!active && panel) panel.hidden = true; });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', bind);
  else bind();
})();
