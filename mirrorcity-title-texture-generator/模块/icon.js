/* ============================================================
 * icon.js — 称号图标渲染器
 * 独立于 560×160 的称号条，逻辑尺寸 256×256。
 * 复用当前家族数据、称号色、主题和模块栈，但采用图标专用构图。
 * ============================================================ */
(function () {
  'use strict';
  var TG = window.TG, SIZE = 256;
  var FONT = TG.FONT;

  function css(c, a) { return TG.css(c, a); }
  function roundRect(ctx, x, y, w, h, r) { TG.roundRect(ctx, x, y, w, h, r); }
  function hex(ctx, cx, cy, r) { TG.hexPath(ctx, cx, cy, r, 6); }
  function theme(stack) { return TG.theme ? TG.theme(stack && stack.theme || 'default') : { accent: '#ffd75e', secondary: '#5aa9ff', ink: '#07101a', line: 1, radius: 12, glow: 1, density: 1 }; }
  function markOf(item) { return item.mark || String(item.main || '').slice(0, 1) || '?'; }

  function drawBackground(ctx, item, stack, th, r) {
    if ((stack.bg || 'transparent') === 'transparent') return;
    var bg0 = th.ink || '#07101a', bg1 = '#02040a';
    if (stack.bg === 'paper') { bg0 = '#eee4ce'; bg1 = '#cfc0a2'; }
    if (stack.bg === 'blood') { bg0 = '#1a080d'; bg1 = '#050207'; }
    if (stack.bg === 'void') { bg0 = '#1b0820'; bg1 = '#050209'; }
    var gd = ctx.createLinearGradient(0, 0, SIZE, SIZE);
    gd.addColorStop(0, bg0); gd.addColorStop(0.55, mixColor(bg0, item.color || th.secondary, 0.14)); gd.addColorStop(1, bg1);
    ctx.fillStyle = gd; ctx.fillRect(0, 0, SIZE, SIZE);
    var glow = ctx.createRadialGradient(SIZE * 0.5, SIZE * 0.45, 4, SIZE * 0.5, SIZE * 0.45, 160);
    glow.addColorStop(0, css(item.color || th.accent, 0.17)); glow.addColorStop(1, css(item.color || th.accent, 0));
    ctx.fillStyle = glow; ctx.fillRect(0, 0, SIZE, SIZE);
    ctx.save();
    if (stack.bg === 'terminal' || stack.bg === 'grid' || stack.bg === 'hexmesh') {
      ctx.strokeStyle = css(th.accent, 0.10); ctx.lineWidth = 0.7;
      for (var x = 0; x <= SIZE; x += 16) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, SIZE); ctx.stroke(); }
      for (var y = 0; y <= SIZE; y += 16) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(SIZE, y); ctx.stroke(); }
    } else if (stack.bg === 'rain' || stack.bg === 'night') {
      ctx.strokeStyle = css(th.secondary, 0.16); ctx.lineWidth = 0.8;
      for (var i = 0; i < 24; i++) { var rx = r() * (SIZE + 30) - 15, ry = r() * SIZE; ctx.beginPath(); ctx.moveTo(rx, ry); ctx.lineTo(rx - 6, ry + 18); ctx.stroke(); }
    } else if (stack.bg === 'void') {
      ctx.strokeStyle = css(th.accent, 0.16); ctx.lineWidth = 0.7;
      for (var j = 0; j < 4; j++) { ctx.beginPath(); ctx.ellipse(128, 126, 70 + j * 18, 24 + j * 6, -0.2, 0, Math.PI * 2); ctx.stroke(); }
    }
    ctx.restore();
  }

  function mixColor(a, b, t) {
    var A = TG.h2r(a), B = TG.h2r(b);
    return css([A[0] + (B[0] - A[0]) * t, A[1] + (B[1] - A[1]) * t, A[2] + (B[2] - A[2]) * t]);
  }

  function drawPlate(ctx, stack, th, color) {
    if (stack.plate === 'none') return;
    var radius = stack.plate === 'slab' ? 22 : stack.plate === 'paper' ? 10 : 26;
    ctx.save();
    roundRect(ctx, 17, 17, 222, 222, radius);
    var gd = ctx.createLinearGradient(20, 18, 236, 238);
    if (stack.plate === 'paper') { gd.addColorStop(0, '#f3ead8'); gd.addColorStop(1, '#d8c9aa'); }
    else if (stack.plate === 'holo' || stack.plate === 'glass' || stack.plate === 'neon') { gd.addColorStop(0, css(th.secondary, 0.28)); gd.addColorStop(0.52, 'rgba(12,23,42,0.72)'); gd.addColorStop(1, css(color, 0.16)); }
    else { gd.addColorStop(0, 'rgba(24,32,46,0.94)'); gd.addColorStop(1, 'rgba(3,6,12,0.96)'); }
    ctx.fillStyle = gd; ctx.fill();
    ctx.strokeStyle = css(color, stack.plate === 'neon' ? 0.62 : 0.28); ctx.lineWidth = stack.plate === 'slab' ? 2 : 1;
    ctx.stroke();
    if (stack.plate === 'holo' || stack.plate === 'glass') {
      ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = css(th.accent, 0.07);
      for (var x = -220; x < 300; x += 38) ctx.fillRect(x, 0, 9, SIZE);
    }
    ctx.restore();
  }

  function drawFrame(ctx, stack, th, color) {
    if (stack.frame === 'none') return;
    ctx.save();
    var line = th.line || 1;
    ctx.strokeStyle = css(color, stack.frame === 'neonedge' ? 0.78 : 0.48); ctx.lineWidth = line;
    roundRect(ctx, 10, 10, 236, 236, stack.frame === 'circuit' ? 14 : 18); ctx.stroke();
    if (stack.frame === 'neonedge') { ctx.shadowColor = css(color, 0.8); ctx.shadowBlur = 18; ctx.stroke(); }
    if (stack.frame === 'asym' || stack.frame === 'circuit') {
      ctx.strokeStyle = css(th.secondary, 0.5); ctx.setLineDash([18, 7, 3, 7]);
      roundRect(ctx, 15, 15, 226, 226, 12); ctx.stroke(); ctx.setLineDash([]);
    }
    if (stack.frame === 'hazard' || stack.frame === 'tape') {
      ctx.fillStyle = 'rgba(255,170,40,0.24)'; ctx.fillRect(12, 20, 232, 9); ctx.fillRect(12, 236, 232, 8);
      ctx.strokeStyle = 'rgba(255,180,50,0.42)'; ctx.lineWidth = 3;
      for (var x = 8; x < 250; x += 18) { ctx.beginPath(); ctx.moveTo(x, 29); ctx.lineTo(x + 9, 20); ctx.moveTo(x, 244); ctx.lineTo(x + 9, 236); ctx.stroke(); }
    }
    ctx.restore();
  }

  function has(list, id) { return (list || []).indexOf(id) >= 0; }

  function drawIconDecorations(ctx, item, stack, th, color, r) {
    var decos = stack.decos || [];
    ctx.save();
    if (has(decos, 'roman')) {
      ctx.textAlign = 'right'; ctx.textBaseline = 'middle'; ctx.font = '700 58px ' + FONT;
      ctx.fillStyle = css(color, 0.08); ctx.fillText(item.roman || item.code || '', 232, 128);
    }
    if (has(decos, 'number')) {
      ctx.strokeStyle = css(th.accent, 0.28); ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(25, 47); ctx.lineTo(88, 47); ctx.stroke();
    }
    if (has(decos, 'coords')) {
      ctx.textAlign = 'right'; ctx.textBaseline = 'middle'; ctx.font = '600 7px Consolas, monospace';
      ctx.fillStyle = css(th.secondary, 0.66); ctx.fillText('S-26.04 / 41.7', 231, 68); ctx.fillText('LOCAL // 03:17', 231, 77);
    }
    if (has(decos, 'signal')) {
      ctx.textAlign = 'left'; ctx.textBaseline = 'middle'; ctx.font = '600 7px Consolas, monospace';
      ctx.fillStyle = css(th.accent, 0.7); ctx.fillText('SYNC', 24, 183);
      for (var s = 0; s < 8; s++) { ctx.fillStyle = css(s < 6 ? th.accent : th.secondary, s < 6 ? 0.78 : 0.25); ctx.fillRect(52 + s * 5, 178 - (s % 3) * 3, 3.5, 7 + (s % 3) * 2); }
    }
    if (has(decos, 'warning')) {
      ctx.save(); ctx.translate(192, 86); ctx.rotate(-0.08); ctx.fillStyle = css(th.secondary, 0.82); ctx.fillRect(0, 0, 40, 14); ctx.fillStyle = th.ink || '#07101a'; ctx.font = '700 6px Consolas, monospace'; ctx.textAlign = 'center'; ctx.fillText('WARNING', 20, 9); ctx.restore();
    }
    if (has(decos, 'stamp') || has(decos, 'seal')) {
      ctx.save(); ctx.translate(211, 182); ctx.rotate(-0.18); ctx.strokeStyle = css(has(decos, 'seal') ? '#c0392b' : th.accent, 0.62); ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(0, 0, 20, 0, Math.PI * 2); ctx.stroke(); ctx.lineWidth = 0.7; ctx.beginPath(); ctx.arc(0, 0, 15, 0, Math.PI * 2); ctx.stroke(); ctx.font = '700 5px Consolas, monospace'; ctx.textAlign = 'center'; ctx.fillText(has(decos, 'seal') ? 'ARCHIVE' : 'VERIFIED', 0, 2); ctx.restore();
    }
    if (has(decos, 'barcode')) {
      var bx = 216, by = 105;
      ctx.fillStyle = css(color, 0.55);
      for (var b = 0; b < 15; b++) { var bw = b % 4 === 0 ? 2 : 1; ctx.fillRect(bx, by, bw, 42); bx += bw + 1.3; }
    }
    if (has(decos, 'strip')) {
      var gd = ctx.createLinearGradient(0, 35, 0, 218); gd.addColorStop(0, css(color, 0)); gd.addColorStop(0.5, css(color, 0.8)); gd.addColorStop(1, css(color, 0));
      ctx.fillStyle = gd; ctx.fillRect(232, 35, 2.2, 183);
    }
    if (has(decos, 'stream')) {
      for (var st = 0; st < 3; st++) { ctx.fillStyle = css(color, 0.18); for (var sy = 64; sy < 193; sy += 8) if (r() > 0.35) ctx.fillRect(218 + st * 4, sy, 1.3, 3); }
    }
    if (has(decos, 'veins')) {
      ctx.strokeStyle = 'rgba(190,30,40,0.52)'; ctx.lineWidth = 1;
      for (var v = 0; v < 3; v++) { var vx = 28 + r() * 45; ctx.beginPath(); ctx.moveTo(vx, 238); ctx.lineTo(vx - 8, 230); ctx.lineTo(vx + 4, 223); ctx.lineTo(vx - 2, 214); ctx.stroke(); }
    }
    if (has(decos, 'runes')) {
      ctx.strokeStyle = css(color, 0.52); ctx.lineWidth = 1;
      [[27, 27], [229, 27], [27, 229], [229, 229]].forEach(function (p, i) { ctx.save(); ctx.translate(p[0], p[1]); ctx.rotate(Math.PI / 4 + i * 0.2); ctx.strokeRect(-5, -5, 10, 10); ctx.beginPath(); ctx.moveTo(-9, 0); ctx.lineTo(-6, 0); ctx.moveTo(6, 0); ctx.lineTo(9, 0); ctx.stroke(); ctx.restore(); });
    }
    if (has(decos, 'gears')) {
      ctx.strokeStyle = css(color, 0.35); ctx.lineWidth = 1;
      [ [38, 67, 10], [218, 196, 8] ].forEach(function (p) { ctx.beginPath(); ctx.arc(p[0], p[1], p[2], 0, Math.PI * 2); ctx.stroke(); ctx.beginPath(); ctx.arc(p[0], p[1], p[2] * 0.5, 0, Math.PI * 2); ctx.stroke(); });
    }
    if (has(decos, 'chip')) {
      ctx.fillStyle = css(color, 0.16); ctx.strokeStyle = css(color, 0.42); ctx.lineWidth = 1; roundRect(ctx, 22, 88, 50, 15, 7); ctx.fill(); ctx.stroke(); ctx.font = '700 6px Consolas, monospace'; ctx.fillStyle = css(color, 0.9); ctx.textAlign = 'center'; ctx.fillText((item.chip || item.en || 'MIRROR').slice(0, 9), 47, 98);
    }
    ctx.restore();
  }

  function drawIconMotion(ctx, stack, th, color, r) {
    var motions = stack.motions || [];
    ctx.save();
    if (has(motions, 'scanline')) { ctx.strokeStyle = css(th.accent, 0.14); ctx.lineWidth = 1; for (var y = 34; y < 224; y += 9) { ctx.beginPath(); ctx.moveTo(18, y); ctx.lineTo(238, y); ctx.stroke(); } }
    if (has(motions, 'rain')) { ctx.strokeStyle = css(th.secondary, 0.2); ctx.lineWidth = 1; for (var i = 0; i < 24; i++) { var x = r() * 270 - 7, yy = r() * 250; ctx.beginPath(); ctx.moveTo(x, yy); ctx.lineTo(x - 7, yy + 18); ctx.stroke(); } }
    if (has(motions, 'particles') || has(motions, 'spark')) { for (var p = 0; p < 18; p++) { var px = 22 + r() * 212, py = 24 + r() * 208; ctx.fillStyle = css(p % 2 ? th.accent : th.secondary, 0.22 + r() * 0.3); ctx.beginPath(); ctx.arc(px, py, 1 + r() * 1.4, 0, Math.PI * 2); ctx.fill(); } }
    if (has(motions, 'chromatic')) { ctx.strokeStyle = 'rgba(255,70,100,0.2)'; ctx.lineWidth = 1; ctx.strokeRect(13, 13, 230, 230); ctx.strokeStyle = 'rgba(70,190,255,0.2)'; ctx.strokeRect(16, 16, 224, 224); }
    if (has(motions, 'flicker')) { ctx.fillStyle = css(th.accent, 0.06); for (var f = 0; f < 9; f++) ctx.fillRect(25 + f * 25, 20, 7, 216); }
    if (has(motions, 'glitch')) { ctx.fillStyle = css(th.secondary, 0.2); for (var g = 0; g < 5; g++) ctx.fillRect(28 + r() * 175, 66 + r() * 126, 10 + r() * 24, 2 + r() * 4); }
    if (has(motions, 'sheen')) { var sg = ctx.createLinearGradient(28, 220, 220, 30); sg.addColorStop(0, css('#ffffff', 0)); sg.addColorStop(0.48, css('#ffffff', 0.16)); sg.addColorStop(0.55, css('#ffffff', 0)); ctx.fillStyle = sg; ctx.fillRect(20, 20, 216, 216); }
    if (has(motions, 'pulse') || has(motions, 'breath') || has(motions, 'edgebreath')) { ctx.strokeStyle = css(color, 0.18); ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(128, 128, 92, 0, Math.PI * 2); ctx.stroke(); }
    ctx.restore();
  }

  function badgeLayout(stack) {
    var kind = stack.badge || 'hex';
    if (kind === 'none') return { cx: 128, cy: 122, r: 0 };
    if (kind === 'square') return { cx: 128, cy: 120, r: 62 };
    if (kind === 'crest') return { cx: 128, cy: 120, r: 66 };
    return { cx: 128, cy: 120, r: 66 };
  }

  function drawBadge(ctx, item, stack, th, color, r) {
    var kind = stack.badge || 'hex', layout = badgeLayout(stack), cx = layout.cx, cy = layout.cy, radius = layout.r;
    ctx.save();
    ctx.shadowColor = css(color, 0.65 * (th.glow || 1)); ctx.shadowBlur = 22 * (th.glow || 1);
    if (kind === 'medallion' || kind === 'signal' || kind === 'tag') {
      ctx.fillStyle = css(th.ink || '#07101a', 0.82); ctx.beginPath(); ctx.arc(cx, cy, radius, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = css(color, 0.82); ctx.lineWidth = 3; ctx.stroke();
      ctx.shadowBlur = 0; ctx.strokeStyle = css(th.accent, 0.45); ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(cx, cy, radius - 12, 0, Math.PI * 2); ctx.stroke();
      if (kind === 'signal') {
        for (var s = 0; s < 5; s++) { ctx.fillStyle = css(s < 3 ? th.accent : th.secondary, s < 3 ? 0.9 : 0.28); ctx.fillRect(91 + s * 10, 166 - (s % 3) * 5, 7, 7 + (s % 3) * 5); }
      }
    } else if (kind === 'square') {
      ctx.fillStyle = css(th.ink || '#07101a', 0.9); roundRect(ctx, cx - radius, cy - radius, radius * 2, radius * 2, 12); ctx.fill(); ctx.strokeStyle = css(color, 0.85); ctx.lineWidth = 3; ctx.stroke();
    } else if (kind === 'crest') {
      ctx.fillStyle = css(th.ink || '#07101a', 0.9); ctx.strokeStyle = css(color, 0.82); ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(cx, cy - radius - 8); ctx.lineTo(cx + radius, cy - radius + 12); ctx.lineTo(cx + radius - 12, cy + radius - 12); ctx.quadraticCurveTo(cx, cy + radius + 12, cx - radius + 12, cy + radius - 12); ctx.lineTo(cx - radius, cy - radius + 12); ctx.closePath(); ctx.fill(); ctx.stroke();
    } else if (kind !== 'none') {
      ctx.fillStyle = css(th.ink || '#07101a', 0.88); hex(ctx, cx, cy, radius); ctx.fill(); ctx.strokeStyle = css(color, 0.84); ctx.lineWidth = 3; ctx.stroke();
      ctx.shadowBlur = 0; ctx.strokeStyle = css(th.accent, 0.46); ctx.lineWidth = 1; hex(ctx, cx, cy, radius - 12); ctx.stroke();
    }
    ctx.restore();

    var mark = markOf(item), face = stack.text === 'terminal' || stack.text === 'pixel' ? '700 72px Consolas, ' + FONT : '700 78px ' + FONT;
    ctx.save(); ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.font = face;
    ctx.shadowColor = css(color, 0.72 * (th.glow || 1)); ctx.shadowBlur = 16 * (th.glow || 1);
    ctx.fillStyle = css(color, 0.96); ctx.fillText(mark, cx, cy - 2);
    ctx.shadowBlur = 0; ctx.lineWidth = 1.5; ctx.strokeStyle = css('#ffffff', 0.34); ctx.strokeText(mark, cx, cy - 2);
    ctx.restore();
  }

  function drawLabels(ctx, item, stack, th, color) {
    ctx.save(); ctx.textBaseline = 'middle'; ctx.font = '600 10px Consolas, monospace';
    ctx.fillStyle = css(th.accent, 0.7); ctx.textAlign = 'left'; ctx.fillText(item.code || item.key || 'TITLE', 25, 39);
    ctx.textAlign = 'right'; ctx.fillStyle = css(th.secondary, 0.65); ctx.fillText(item.en || item.suffix || '', 231, 39);
    var title = (item.main || '') + (item.suffix ? ' · ' + item.suffix : '');
    var titleSize = 15;
    while (titleSize > 10) { ctx.font = '700 ' + titleSize + 'px ' + FONT; if (ctx.measureText(title).width <= 172) break; titleSize -= 0.75; }
    ctx.textAlign = 'center'; ctx.fillStyle = css(color, 0.92); ctx.fillText(title, 128, 211);
    var desc = item.desc || '', descSize = 9;
    while (descSize > 7 && ctx.measureText(desc).width > 172) { descSize -= 0.5; ctx.font = '500 ' + descSize + 'px ' + FONT; }
    ctx.font = '500 ' + descSize + 'px ' + FONT; ctx.fillStyle = css(th.accent, 0.62); ctx.fillText(desc, 128, 228);
    if ((stack.decos || []).indexOf('progress') >= 0 && item.steps) {
      var done = item.steps[0], total = item.steps[1];
      var py = stack.frame === 'hazard' || stack.frame === 'tape' ? 221 : 238;
      var px = py === 221 ? 24 : 92;
      for (var i = 0; i < total; i++) { ctx.fillStyle = css(i < done ? color : th.secondary, i < done ? 0.9 : 0.22); ctx.beginPath(); ctx.arc(px + i * 8, py, 2.1, 0, Math.PI * 2); ctx.fill(); }
    }
    ctx.restore();
  }

  TG.makeIcon = function (item, stack, scale) {
    scale = scale || 1;
    var cv = TG.newCanvas(SIZE * scale, SIZE * scale), ctx = cv.getContext('2d');
    ctx.setTransform(scale, 0, 0, scale, 0, 0);
    stack = stack || {};
    var th = theme(stack), color = item.color || th.accent;
    var r = TG.mulberry32((item.rank || item.key || 'title').toString().split('').reduce(function (n, c) { return n + c.charCodeAt(0); }, 17));
    drawBackground(ctx, item, stack, th, r);
    drawPlate(ctx, stack, th, color);
    drawIconMotion(ctx, stack, th, color, r);
    drawIconDecorations(ctx, item, stack, th, color, r);
    drawFrame(ctx, stack, th, color);
    drawBadge(ctx, item, stack, th, color, r);
    drawLabels(ctx, item, stack, th, color);
    return cv;
  };
  TG.ICON_SIZE = SIZE;
})();
