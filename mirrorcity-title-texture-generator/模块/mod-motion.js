/* ============================================================
 * mod-motion.js — 动效模块（可任意叠加，仅影响 GIF / 预览）
 * 静止帧（PNG）不跑动效；每组动效以 2400ms 为一个循环。
 * ============================================================ */
(function () {
  'use strict';
  var TG = window.TG, W = TG.W, H = TG.H;
  var css = TG.css, mix = TG.mix;
  var LOOP = 2400;

  function norm(t) { return ((t % LOOP) + LOOP) % LOOP / LOOP; }

  function starShape(ctx, r) {
    ctx.beginPath();
    ctx.moveTo(0, -r);
    ctx.quadraticCurveTo(r * 0.16, -r * 0.16, r, 0);
    ctx.quadraticCurveTo(r * 0.16, r * 0.16, 0, r);
    ctx.quadraticCurveTo(-r * 0.16, r * 0.16, -r, 0);
    ctx.quadraticCurveTo(-r * 0.16, -r * 0.16, 0, -r);
    ctx.closePath();
  }

  /* 金属扫光：只在字形内扫过 */
  TG.register('motion', {
    id: 'sheen', name: '扫光', hint: '一条高光沿标题扫过（仅字形内）',
    draw: function (g, t) {
      var base = g.base, S = g.S, mask = base.mask, ctx = g.ctx;
      var p = norm(t) / 1;
      var bandX = -120 + p * (W + 240);
      var width = Math.max(1, Math.round(mask.w * S)), height = Math.max(1, Math.round(mask.h * S));
      var st = base.__sheen;
      if (!st || st.width !== width || st.height !== height) st = base.__sheen = g.newCanvas(width, height);
      var sctx = st.getContext('2d');
      // 掩膜可能来自正在打字/位移的标题，每帧重绘内容，仅复用画布容量。
      sctx.setTransform(1, 0, 0, 1, 0, 0);
      sctx.globalAlpha = 1; sctx.globalCompositeOperation = 'source-over';
      sctx.clearRect(0, 0, st.width, st.height);
      sctx.drawImage(mask.canvas, 0, 0);
      sctx.globalCompositeOperation = 'source-in';
      var gd = sctx.createLinearGradient((bandX - mask.x - 62) * S, 0, (bandX - mask.x + 62) * S, 0);
      gd.addColorStop(0.00, 'rgba(255,255,255,0)');
      gd.addColorStop(0.42, 'rgba(255,255,255,0.55)');
      gd.addColorStop(0.50, 'rgba(255,255,255,0.98)');
      gd.addColorStop(0.58, 'rgba(255,255,255,0.55)');
      gd.addColorStop(1.00, 'rgba(255,255,255,0)');
      sctx.fillStyle = gd;
      sctx.fillRect(0, 0, st.width, st.height);
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = 0.5;
      ctx.drawImage(st, mask.x, mask.y, mask.w, mask.h);
      ctx.restore();
    }
  });

  /* 呼吸光 */
  TG.register('motion', {
    id: 'breath', name: '呼吸光', hint: '整卡柔和明暗呼吸',
    draw: function (g, t) {
      var base = g.base, ctx = g.ctx, pal = g.pal;
      var b = 0.5 + 0.5 * Math.sin(t / 900 * Math.PI);
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = 0.11 + 0.12 * b;
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(base.glow, 0, 0, W, H);
      ctx.restore();
    }
  });

  /* 星尘 */
  TG.register('motion', {
    id: 'spark', name: '星尘', hint: '随机四角星闪烁',
    draw: function (g, t) {
      var ctx = g.ctx, pal = g.pal, r = g.rand;
      for (var i = 0; i < 15; i++) {
        var rx = 22 + r() * (W - 44), ry = 16 + r() * (H - 32);
        var phase = r() * Math.PI * 2, speed = 0.7 + r() * 1.7, size = 0.9 + r() * 2.3;
        var k = 0.5 + 0.5 * Math.sin(t / 400 * speed + phase);
        var a = Math.pow(k, 2.6);
        if (a < 0.03) continue;
        ctx.save();
        ctx.translate(rx, ry);
        ctx.globalAlpha = a * 0.85;
        var rg = ctx.createRadialGradient(0, 0, 0, 0, 0, size * 2.6);
        rg.addColorStop(0, css(pal.base, 0.55));
        rg.addColorStop(1, css(pal.base, 0));
        ctx.fillStyle = rg;
        ctx.beginPath(); ctx.arc(0, 0, size * 2.6, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,0.95)';
        starShape(ctx, size * (0.55 + 0.75 * a));
        ctx.fill();
        ctx.restore();
      }
    }
  });

  /* 上升光尘 */
  TG.register('motion', {
    id: 'drift', name: '光尘', hint: '缓缓上升的光点',
    draw: function (g, t) {
      var ctx = g.ctx, pal = g.pal, r = g.rand;
      for (var i = 0; i < 8; i++) {
        var rx = 36 + r() * (W - 72), sp = 0.12 + r() * 0.22, ph = r();
        var prog = ((t / 1400 * sp + ph) % 1);
        var yy = H - 16 - prog * (H - 18);
        var a = Math.sin(prog * Math.PI) * 0.5;
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        ctx.globalAlpha = a;
        ctx.fillStyle = css(pal.base, 0.85);
        ctx.beginPath(); ctx.arc(rx, yy, 1.1 + r() * 0.7, 0, Math.PI * 2); ctx.fill();
        ctx.restore();
      }
    }
  });

  /* 扫描线 */
  TG.register('motion', {
    id: 'scanline', name: '扫描线', hint: '横向扫描光带 + 细密扫描纹',
    draw: function (g, t) {
      var ctx = g.ctx, pal = g.pal;
      var y = norm(t) * (H + 40) - 20;
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      var gd = ctx.createLinearGradient(0, y - 18, 0, y + 18);
      gd.addColorStop(0, css(pal.base, 0));
      gd.addColorStop(0.5, css(pal.base, 0.22));
      gd.addColorStop(1, css(pal.base, 0));
      ctx.fillStyle = gd;
      ctx.fillRect(0, y - 18, W, 36);
      ctx.strokeStyle = 'rgba(255,255,255,0.05)';
      ctx.lineWidth = 1;
      for (var yy = 6; yy < H; yy += 3) {
        ctx.beginPath(); ctx.moveTo(0, yy); ctx.lineTo(W, yy); ctx.stroke();
      }
      ctx.restore();
    }
  });

  /* 霓虹闪烁：整体亮度脉动 + 偶发瞬闪 */
  TG.register('motion', {
    id: 'flicker', name: '闪烁', hint: '霓虹灯管式亮度抖动',
    draw: function (g, t) {
      var ctx = g.ctx, pal = g.pal;
      var ph = t / 130;
      var f = 0.5 + 0.5 * Math.sin(ph) * Math.sin(ph * 0.37);
      var spike = Math.max(0, Math.sin(t / 700) * Math.sin(t / 233)) > 0.93 ? 1 : 0;
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = 0.05 + 0.10 * f + 0.16 * spike;
      ctx.drawImage(g.base.glow, 0, 0, W, H);
      ctx.restore();
    }
  });

  /* 故障：切片位移 + 分离色边 */
  TG.register('motion', {
    id: 'glitch', name: '故障', hint: '周期性切片错位 + 色边（扭曲侵蚀）',
    draw: function (g, t) {
      var base = g.base, ctx = g.ctx, S = g.S;
      var active = (t % 800) < 260;   // 800ms 一个周期，前 260ms 活跃 → GIF 里多数帧能看到
      if (!active) return;
      ctx.save();
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      var r = TG.mulberry32(Math.floor(t / 120) * 131 + 7);
      for (var i = 0; i < 5; i++) {
        var sy = Math.floor(r() * H) * S;
        var sh = Math.ceil((4 + r() * 16) * S);
        var dx = (r() - 0.5) * 26 * S;
        ctx.globalCompositeOperation = 'source-over';
        ctx.drawImage(base.canvas, 0, sy, base.canvas.width, sh, dx, sy, base.canvas.width, sh);
      }
      // 色边
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = 0.25;
      ctx.drawImage(base.canvas, -2.5 * S, 0);
      ctx.drawImage(base.canvas, 2.5 * S, 1.5 * S);
      ctx.restore();
    }
  });

  /* 血脉冲 */
  TG.register('motion', {
    id: 'pulse', name: '血脉冲', hint: '底部脉冲光带（心跳节奏）',
    draw: function (g, t) {
      var ctx = g.ctx, pal = g.pal;
      var beat = Math.pow(0.5 + 0.5 * Math.sin(t / 620 * Math.PI), 3);
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      var gd = ctx.createLinearGradient(0, H - 46, 0, H - 6);
      gd.addColorStop(0, 'rgba(190,26,34,0)');
      gd.addColorStop(1, 'rgba(220,40,48,' + (0.12 + 0.30 * beat).toFixed(3) + ')');
      ctx.fillStyle = gd;
      ctx.fillRect(0, H - 46, W, 40);
      ctx.restore();
    }
  });

  /* 呼吸描边：沿着牌面轮廓明暗（无需文字掩膜，通用） */
  TG.register('motion', {
    id: 'edgebreath', name: '描边呼吸', hint: '牌面轮廓明暗呼吸',
    draw: function (g, t) {
      var ctx = g.ctx, pal = g.pal;
      var b = 0.5 + 0.5 * Math.sin(t / 1100 * Math.PI);
      ctx.save();
      ctx.globalAlpha = 0.10 + 0.28 * b;
      ctx.strokeStyle = css(pal.base, 0.6);
      ctx.lineWidth = 1.2;
      TG.roundRect(ctx, 5.5, 5.5, W - 11, H - 11, 16);
      ctx.stroke();
      ctx.restore();
    }
  });
})();
