/* ============================================================
 * mod-expansion.js — 第二批高复用模块
 * 终端 / 雨夜 / 空洞 / 管制等风格的可组合模块。
 * ============================================================ */
(function () {
  'use strict';
  var TG = window.TG, W = TG.W, H = TG.H;
  var css = TG.css, mix = TG.mix;

  function theme(g) { return g.theme || { accent: '#ffd75e', secondary: '#5aa9ff', ink: '#07101a', line: 1, radius: 12, glow: 1, density: 1, motion: 1 }; }
  function accent(g, a) { return css(theme(g).accent, a); }
  function secondary(g, a) { return css(theme(g).secondary, a); }

  /* ---------------- 背景 ---------------- */
  TG.register('bg', {
    id: 'rain', name: '雨夜', hint: '冷色雨幕 + 城市反光，适合黑箱/后巷风',
    draw: function (g) {
      var ctx = g.ctx, r = g.rand, th = theme(g);
      var bg = ctx.createLinearGradient(0, 0, W, H);
      bg.addColorStop(0, '#0b1422'); bg.addColorStop(0.58, '#07101b'); bg.addColorStop(1, '#03070d');
      ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);
      var glow = ctx.createRadialGradient(W * 0.66, H * 0.86, 4, W * 0.66, H * 0.86, 230);
      glow.addColorStop(0, css(th.secondary, 0.25)); glow.addColorStop(1, css(th.secondary, 0));
      ctx.fillStyle = glow; ctx.fillRect(0, 0, W, H);
      ctx.save();
      ctx.strokeStyle = css(th.accent, 0.17); ctx.lineWidth = 0.7;
      var count = Math.round(36 * th.density);
      for (var i = 0; i < count; i++) {
        var x = r() * (W + 35) - 18, y = r() * H, len = 8 + r() * 18;
        ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x - 5, y + len); ctx.stroke();
      }
      ctx.strokeStyle = css(th.secondary, 0.18); ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(0, H * 0.79); ctx.lineTo(W, H * 0.79); ctx.stroke();
      ctx.restore();
    }
  });

  TG.register('bg', {
    id: 'terminal', name: '终端', hint: '深绿终端底纹 + 细网格 + 数据行',
    draw: function (g) {
      var ctx = g.ctx, r = g.rand, th = theme(g);
      ctx.fillStyle = th.ink || '#041016'; ctx.fillRect(0, 0, W, H);
      ctx.strokeStyle = css(th.accent, 0.10); ctx.lineWidth = 1;
      for (var x = 0; x <= W; x += 20) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); }
      for (var y = 0; y <= H; y += 20) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }
      ctx.font = '9px Consolas, monospace';
      for (var i = 0; i < 8; i++) {
        ctx.fillStyle = css(i % 3 ? th.secondary : th.accent, 0.13 + r() * 0.12);
        ctx.fillText((i % 2 ? 'SYS' : 'NODE') + ' 0x' + Math.floor(r() * 65535).toString(16).padStart(4, '0') + '  OK', 14 + r() * 70, 18 + i * 17);
      }
      var vg = ctx.createLinearGradient(0, 0, 0, H);
      vg.addColorStop(0, 'rgba(0,0,0,0.25)'); vg.addColorStop(0.5, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,0.45)');
      ctx.fillStyle = vg; ctx.fillRect(0, 0, W, H);
    }
  });

  TG.register('bg', {
    id: 'void', name: '空洞', hint: '深紫空洞 + 漂浮环纹，扭曲/终末风',
    draw: function (g) {
      var ctx = g.ctx, r = g.rand, th = theme(g);
      ctx.fillStyle = '#0b0611'; ctx.fillRect(0, 0, W, H);
      for (var i = 0; i < 7; i++) {
        var cx = r() * W, cy = r() * H, rr = 24 + r() * 90;
        var rg = ctx.createRadialGradient(cx, cy, 2, cx, cy, rr);
        rg.addColorStop(0, css(th.secondary, 0.16)); rg.addColorStop(1, css(th.secondary, 0));
        ctx.fillStyle = rg; ctx.fillRect(0, 0, W, H);
      }
      ctx.save(); ctx.strokeStyle = css(th.accent, 0.16); ctx.lineWidth = 0.8;
      for (var j = 0; j < 5; j++) {
        ctx.beginPath(); ctx.ellipse(W * 0.53, H * 0.52, 55 + j * 18, 15 + j * 4, -0.18, 0, Math.PI * 2); ctx.stroke();
      }
      ctx.restore();
    }
  });

  /* ---------------- 底板 ---------------- */
  TG.register('plate', {
    id: 'holo', name: '全息板', hint: '半透明青紫全息牌 + 斜向反射',
    draw: function (g) {
      var ctx = g.ctx, th = theme(g), r = th.radius || 12;
      var PAD = 5, W2 = W - PAD * 2, H2 = H - PAD * 2;
      // 1) 不透明深底：全息板也要能当“底板”用，不能靠背景透出来
      ctx.save();
      ctx.shadowColor = css(th.secondary, 0.30); ctx.shadowBlur = 24;
      TG.roundRect(ctx, PAD, PAD, W2, H2, r);
      ctx.fillStyle = 'rgba(7,13,22,0.94)'; ctx.fill();
      ctx.restore();

      // 2) 全息渐变 + 扫描竖纹（只画在牌面内）
      ctx.save();
      TG.roundRect(ctx, PAD, PAD, W2, H2, r); ctx.clip();
      var gd = ctx.createLinearGradient(0, PAD, W, H - PAD);
      gd.addColorStop(0, css(th.secondary, 0.22));
      gd.addColorStop(0.46, 'rgba(18,30,55,0.30)');
      gd.addColorStop(1, css(th.accent, 0.16));
      ctx.fillStyle = gd; ctx.fillRect(PAD, PAD, W2, H2);
      ctx.globalCompositeOperation = 'lighter';
      ctx.fillStyle = css(th.accent, 0.032);
      for (var x = PAD - H; x < W + H; x += 56) ctx.fillRect(x, PAD, 9, H2);
      var top = ctx.createLinearGradient(0, PAD, 0, PAD + 30);
      top.addColorStop(0, 'rgba(255,255,255,0.12)'); top.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = top; ctx.fillRect(PAD, PAD, W2, 30);
      ctx.restore();

      // 3) 全息描边
      ctx.save();
      ctx.shadowColor = css(th.accent, 0.45); ctx.shadowBlur = 12;
      ctx.strokeStyle = css(th.accent, 0.42); ctx.lineWidth = (th.line || 1) * 1.2;
      TG.roundRect(ctx, PAD + 0.8, PAD + 0.8, W2 - 1.6, H2 - 1.6, r); ctx.stroke();
      ctx.restore();

      // 4) 角部全息标
      ctx.save();
      ctx.strokeStyle = css(th.secondary, 0.55); ctx.lineWidth = 1;
      [[PAD + 12, PAD + 12, 1, 1], [W - PAD - 12, PAD + 12, -1, 1],
       [PAD + 12, H - PAD - 12, 1, -1], [W - PAD - 12, H - PAD - 12, -1, -1]].forEach(function (c) {
        ctx.beginPath();
        ctx.moveTo(c[0], c[1] + c[3] * 12);
        ctx.lineTo(c[0], c[1]);
        ctx.lineTo(c[0] + c[2] * 12, c[1]);
        ctx.stroke();
      });
      ctx.restore();
    }
  });

  TG.register('plate', {
    id: 'slab', name: '黑曜石', hint: '厚重黑色牌面 + 内凹台阶，Boss/传奇风',
    draw: function (g) {
      var ctx = g.ctx, th = theme(g);
      ctx.save();
      TG.roundRect(ctx, 18, 18, W - 36, H - 36, th.radius || 10);
      var gd = ctx.createLinearGradient(0, 18, 0, H - 18);
      gd.addColorStop(0, '#1a202c'); gd.addColorStop(0.45, '#0b1019'); gd.addColorStop(1, '#03050a');
      ctx.fillStyle = gd; ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.16)'; ctx.lineWidth = 1; ctx.stroke();
      ctx.strokeStyle = css(th.accent, 0.18); ctx.lineWidth = 2;
      TG.roundRect(ctx, 26, 26, W - 52, H - 52, Math.max(4, (th.radius || 10) - 4)); ctx.stroke();
      ctx.restore();
    }
  });

  /* ---------------- 边框 ---------------- */
  TG.register('frame', {
    id: 'asym', name: '不对称', hint: '断续边线 + 斜向切角，现代 UI 风',
    draw: function (g) {
      var ctx = g.ctx, th = theme(g);
      ctx.save(); ctx.strokeStyle = accent(g, 0.48); ctx.lineWidth = th.line || 1;
      ctx.beginPath(); ctx.moveTo(8, 32); ctx.lineTo(8, 8); ctx.lineTo(132, 8); ctx.moveTo(W - 126, 8); ctx.lineTo(W - 8, 8); ctx.lineTo(W - 8, 34); ctx.moveTo(8, H - 30); ctx.lineTo(8, H - 8); ctx.lineTo(170, H - 8); ctx.moveTo(W - 165, H - 8); ctx.lineTo(W - 8, H - 8); ctx.lineTo(W - 8, H - 32); ctx.stroke();
      ctx.strokeStyle = secondary(g, 0.38); ctx.setLineDash([18, 8, 3, 8]);
      TG.roundRect(ctx, 12, 12, W - 24, H - 24, 8); ctx.stroke();
      ctx.restore();
    }
  });

  TG.register('frame', {
    id: 'tape', name: '封条', hint: '上下编号封条 + 侧边封签，档案/管制风',
    draw: function (g) {
      var ctx = g.ctx, th = theme(g);
      ctx.save(); ctx.fillStyle = css(th.accent, 0.18); ctx.fillRect(0, 8, W, 9); ctx.fillRect(0, H - 17, W, 9);
      ctx.fillStyle = css(th.accent, 0.62); ctx.font = '600 7px Consolas, monospace';
      for (var x = 10; x < W; x += 54) { ctx.fillText('/// AUTH', x, 15); ctx.fillText('/// ARCH', x + 12, H - 10); }
      ctx.strokeStyle = css(th.accent, 0.5); ctx.lineWidth = 1.1;
      ctx.beginPath(); ctx.moveTo(18, 25); ctx.lineTo(18, H - 25); ctx.moveTo(W - 18, 25); ctx.lineTo(W - 18, H - 25); ctx.stroke();
      ctx.restore();
    }
  });

  /* ---------------- 徽记 ---------------- */
  TG.register('badge', {
    id: 'signal', name: '信号徽', hint: '圆形信号环 + 强度柱，终端/科技风',
    draw: function (g) {
      var ctx = g.ctx, pal = g.pal, th = theme(g), cx = 58, cy = 74;
      ctx.save(); ctx.strokeStyle = accent(g, 0.62); ctx.lineWidth = 1.2;
      ctx.beginPath(); ctx.arc(cx, cy, 25, 0, Math.PI * 2); ctx.stroke();
      ctx.strokeStyle = secondary(g, 0.35); ctx.beginPath(); ctx.arc(cx, cy, 31, -1.1, 1.1); ctx.stroke();
      ctx.fillStyle = css(pal.base, 0.9); ctx.beginPath(); ctx.arc(cx, cy, 5, 0, Math.PI * 2); ctx.fill();
      // 强度柱放在圆环内部下方，避免和 deco.signal 的底栏重叠
      for (var i = 0; i < 5; i++) {
        ctx.fillStyle = css(i < 3 ? th.accent : th.secondary, i < 3 ? 0.8 : 0.24);
        ctx.fillRect(cx - 12 + i * 6, cy + 18 - (i % 2) * 2, 4, 4 + (i % 2) * 3);
      }
      ctx.restore();
    }
  });

  TG.register('badge', {
    id: 'crest', name: '徽章', hint: '盾形徽章 + 中央菱标，协会/传奇风',
    draw: function (g) {
      var ctx = g.ctx, pal = g.pal, th = theme(g), cx = 58, cy = 80;
      ctx.save(); ctx.translate(cx, cy);
      ctx.fillStyle = css(th.ink, 0.86); ctx.strokeStyle = css(pal.base, 0.74); ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(0, -31); ctx.lineTo(24, -20); ctx.lineTo(20, 13); ctx.quadraticCurveTo(0, 34, -20, 13); ctx.lineTo(-24, -20); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.fillStyle = css(pal.base, 0.8); TG.diamond(ctx, 0, -2, 10); ctx.fill();
      ctx.strokeStyle = css(th.accent, 0.7); ctx.lineWidth = 1; TG.diamond(ctx, 0, -2, 16); ctx.stroke();
      ctx.restore();
    }
  });

  /* ---------------- 字材 ---------------- */
  TG.register('text', {
    id: 'terminal', name: '终端字', hint: '等宽数据字 + 青色光标边，协议/系统风',
    font: 'Consolas, "Microsoft YaHei", monospace',
    draw: function (g) {
      var th = theme(g), pal = g.pal, face = 'Consolas, "Microsoft YaHei", monospace';
      TG.paintTitle(g, { font: face, fill: css(th.secondary, 0.72), glow: css(th.secondary, 0.8), glowBlur: 25, stroke: css(th.ink, 0.9), strokeWidth: 4 });
      TG.paintTitle(g, { font: face, fill: function (ctx, size) { var gd = ctx.createLinearGradient(0, 98 - size, 0, 98); gd.addColorStop(0, '#eaffff'); gd.addColorStop(0.35, mix(th.accent, '#ffffff', 0.55)); gd.addColorStop(1, pal.base); return gd; }, stroke: css(th.ink, 0.8), strokeWidth: 1.6, topHighlight: css(th.accent, 0.55) });
    }
  });

  TG.register('text', {
    id: 'pixel', name: '像素字', hint: '硬边高对比字 + 电子彩边，街机/游戏风',
    font: '"Courier New", "Microsoft YaHei", monospace',
    draw: function (g) {
      var th = theme(g), pal = g.pal, face = '"Courier New", "Microsoft YaHei", monospace';
      g.ctx.save(); g.ctx.translate(-1.5, 1); TG.paintTitle(g, { font: face, fill: css(th.secondary, 0.72) }); g.ctx.restore();
      g.ctx.save(); g.ctx.translate(1.5, -1); TG.paintTitle(g, { font: face, fill: css(th.accent, 0.62) }); g.ctx.restore();
      TG.paintTitle(g, { font: face, fill: css(pal.light), stroke: css(th.ink, 0.94), strokeWidth: 4, topHighlight: 'rgba(255,255,255,0.7)' });
    }
  });

  /* ---------------- 装饰 ---------------- */
  TG.register('deco', {
    id: 'signal', name: '信号条', hint: '左下同步率/信号强度条',
    draw: function (g) {
      var ctx = g.ctx, th = theme(g), count = 8;
      ctx.save(); ctx.fillStyle = css(th.accent, 0.62); ctx.font = '600 7px Consolas, monospace'; ctx.fillText('SYNC', 26, 142);
      for (var i = 0; i < count; i++) { ctx.fillStyle = css(i < 6 ? th.accent : th.secondary, i < 6 ? 0.75 : 0.22); ctx.fillRect(56 + i * 6, 136 - (i % 3) * 2, 4, 6 + (i % 3) * 2); }
      ctx.restore();
    }
  });

  TG.register('deco', {
    id: 'coords', name: '坐标', hint: '右上坐标/时间戳小字（避开顶部封条）',
    draw: function (g) {
      var ctx = g.ctx, th = theme(g);
      ctx.save(); ctx.textAlign = 'right'; ctx.font = '600 7px Consolas, monospace'; ctx.fillStyle = css(th.secondary, 0.58);
      ctx.fillText('S-26.04 / 41.7', W - 24, 34); ctx.fillText('LOCAL // 03:17', W - 24, 43); ctx.restore();
    }
  });

  TG.register('deco', {
    id: 'warning', name: '警告牌', hint: '右侧警告标签，自动为副行预留空间',
    draw: function (g) {
      var ctx = g.ctx, th = theme(g);
      ctx.save(); ctx.translate(W - 73, 45); ctx.rotate(-0.08); ctx.fillStyle = css(th.secondary, 0.84); ctx.fillRect(0, 0, 56, 18); ctx.fillStyle = th.ink || '#07101a'; ctx.font = '700 8px Consolas, monospace'; ctx.textAlign = 'center'; ctx.fillText('WARNING', 28, 12); ctx.restore();
    }
  });

  TG.register('deco', {
    id: 'stamp', name: '档案章', hint: '右侧半透明圆章，档案/审批风',
    draw: function (g) {
      var ctx = g.ctx, th = theme(g), cx = W - 48, cy = 88;
      ctx.save(); ctx.globalAlpha = 0.55; ctx.strokeStyle = css(th.accent, 0.78); ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(cx, cy, 27, 0, Math.PI * 2); ctx.stroke(); ctx.lineWidth = 0.7; ctx.beginPath(); ctx.arc(cx, cy, 22, 0, Math.PI * 2); ctx.stroke(); ctx.fillStyle = css(th.accent, 0.74); ctx.font = '700 8px Consolas, monospace'; ctx.textAlign = 'center'; ctx.fillText('VERIFIED', cx, cy + 3); ctx.restore();
    }
  });

  /* ---------------- 动效 ---------------- */
  TG.register('motion', {
    id: 'rain', name: '雨幕', hint: '斜向雨线持续下落',
    draw: function (g, t) {
      var ctx = g.ctx, th = theme(g), r = g.rand, p = ((t % 2400) + 2400) % 2400 / 2400;
      ctx.save(); ctx.strokeStyle = css(th.secondary, 0.24); ctx.lineWidth = 0.7;
      for (var i = 0; i < 28; i++) { var x = (r() * (W + 50) + p * 70) % (W + 50) - 25, y = (r() * (H + 30) + p * 90) % (H + 30) - 20; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x - 4, y + 14); ctx.stroke(); }
      ctx.restore();
    }
  });

  TG.register('motion', {
    id: 'particles', name: '粒子', hint: '彩色微粒漂浮并闪烁',
    draw: function (g, t) {
      var ctx = g.ctx, th = theme(g), r = g.rand;
      for (var i = 0; i < 16; i++) {
        var x = 20 + r() * (W - 40), phase = r(), radius = 0.8 + r() * 1.8;
        var y = H - ((t / 1800 * (0.35 + phase * 0.3) + phase) % 1) * (H - 25);
        var a = Math.sin(((y / H) + t / 3200 + phase) * Math.PI);
        // 隐藏的粒子也消耗同样的随机数，后续粒子不会在显隐切换时换位置。
        if (a <= 0) continue;
        ctx.fillStyle = css(i % 2 ? th.accent : th.secondary, a * 0.65);
        ctx.beginPath(); ctx.arc(x, y, radius, 0, Math.PI * 2); ctx.fill();
      }
    }
  });

  TG.register('motion', {
    id: 'chromatic', name: '色差', hint: '周期性红蓝边缘分离',
    draw: function (g, t) {
      var base = g.base, ctx = g.ctx, S = g.S, k = 0.5 + 0.5 * Math.sin(t / 260);
      if (k < 0.72) return;
      ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = (k - 0.72) * 0.75; ctx.drawImage(base.canvas, -2.2 * S, 0); ctx.globalAlpha *= 0.8; ctx.drawImage(base.canvas, 2.2 * S, 1.1 * S); ctx.restore();
    }
  });
})();

