/* ============================================================
 * mod-frame.js — 基础边框模块（7 种）
 * 无边框 / 角标 / 双线 / 警示条 / 电路 / 裂纹 / 霓虹边
 * ============================================================ */
(function () {
  'use strict';
  var TG = window.TG, W = TG.W, H = TG.H;
  var css = TG.css, mix = TG.mix;
  var PAD = 5;
  function geom() { return { x: PAD, y: PAD, w: W - PAD * 2, h: H - PAD * 2 }; }

  // Explicitly register the empty frame used by minimalist templates, so saved
  // configurations can round-trip through the same registry as every other frame.
  TG.register('frame', {
    id: 'none', name: '无边框', hint: '不绘制边框，保留底板与文字',
    draw: function () {}
  });

  TG.register('frame', {
    id: 'corner', name: '角标', hint: '四角 L 形角标，通用',
    draw: function (g) {
      var ctx = g.ctx, G = geom(), pal = g.pal, tk = 22;
      ctx.save();
      ctx.strokeStyle = css(pal.base, 0.44);
      ctx.lineWidth = 1.4;
      [[G.x + 12, G.y + 12, 1, 1], [G.x + G.w - 12, G.y + 12, -1, 1],
       [G.x + 12, G.y + G.h - 12, 1, -1], [G.x + G.w - 12, G.y + G.h - 12, -1, -1]]
        .forEach(function (c) {
          ctx.beginPath();
          ctx.moveTo(c[0], c[1] + c[3] * tk);
          ctx.lineTo(c[0], c[1]);
          ctx.lineTo(c[0] + c[2] * tk, c[1]);
          ctx.stroke();
        });
      ctx.restore();
    }
  });

  TG.register('frame', {
    id: 'double', name: '双线', hint: '双层细线 + 端部小菱形，克制精致',
    draw: function (g) {
      var ctx = g.ctx, G = geom(), pal = g.pal;
      ctx.save();
      ctx.strokeStyle = css(pal.base, 0.34); ctx.lineWidth = 0.9;
      TG.roundRect(ctx, G.x + 5, G.y + 5, G.w - 10, G.h - 10, 12); ctx.stroke();
      ctx.strokeStyle = css(pal.base, 0.16);
      TG.roundRect(ctx, G.x + 9, G.y + 9, G.w - 18, G.h - 18, 10); ctx.stroke();
      ctx.fillStyle = css(pal.base, 0.55);
      [[G.x + G.w / 2, G.y + 5], [G.x + G.w / 2, G.y + G.h - 5]].forEach(function (p) {
        TG.diamond(ctx, p[0], p[1], 3.2); ctx.fill();
      });
      ctx.restore();
    }
  });

  TG.register('frame', {
    id: 'hazard', name: '警示条', hint: '上下警示斜纹 + 四角短标，管制/禁令风',
    draw: function (g) {
      var ctx = g.ctx, G = geom(), pal = g.pal;
      ctx.save();
      TG.roundRect(ctx, G.x, G.y, G.w, G.h, 16); ctx.clip();
      function band(y, h, dir) {
        ctx.save();
        ctx.beginPath(); ctx.rect(G.x, y, G.w, h); ctx.clip();
        ctx.fillStyle = 'rgba(255,170,40,0.09)';
        ctx.fillRect(G.x, y, G.w, h);
        ctx.strokeStyle = 'rgba(255,170,40,0.26)'; ctx.lineWidth = 4;
        for (var x = -h; x < G.w + h; x += 14) {
          ctx.beginPath(); ctx.moveTo(G.x + x, y + h); ctx.lineTo(G.x + x + h, y); ctx.stroke();
        }
        ctx.restore();
      }
      band(G.y, 7);
      band(G.y + G.h - 7, 7);
      ctx.restore();

      ctx.save();
      ctx.strokeStyle = 'rgba(255,170,40,0.45)'; ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(G.x + 14, G.y + 20); ctx.lineTo(G.x + 14, G.y + 20);
      ctx.stroke();
      // 四角短标
      [[G.x + 12, G.y + 18, 1, 1], [G.x + G.w - 12, G.y + 18, -1, 1],
       [G.x + 12, G.y + G.h - 18, 1, -1], [G.x + G.w - 12, G.y + G.h - 18, -1, -1]]
        .forEach(function (c) {
          ctx.beginPath();
          ctx.moveTo(c[0], c[1]);
          ctx.lineTo(c[0] + c[2] * 16, c[1]);
          ctx.moveTo(c[0], c[1]);
          ctx.lineTo(c[0], c[1] + c[3] * 12);
          ctx.stroke();
        });
      ctx.restore();
    }
  });

  TG.register('frame', {
    id: 'circuit', name: '电路', hint: '电路走线 + 焊点，奇点/协议风',
    draw: function (g) {
      var ctx = g.ctx, G = geom(), pal = g.pal, r = g.rand;
      ctx.save();
      ctx.strokeStyle = css(pal.base, 0.35); ctx.lineWidth = 1;
      function trace(x, y, len, dir) {
        ctx.beginPath();
        ctx.moveTo(x, y);
        var cx = x, cy = y;
        for (var i = 0; i < 3; i++) {
          var l = len * (0.4 + r() * 0.6);
          if (dir === 'h') { cx += l; } else { cy += l; }
          ctx.lineTo(cx, cy);
          dir = dir === 'h' ? 'v' : 'h';
        }
        ctx.stroke();
        ctx.fillStyle = css(pal.base, 0.6);
        ctx.beginPath(); ctx.arc(cx, cy, 1.8, 0, Math.PI * 2); ctx.fill();
      }
      trace(G.x + 16, G.y + 20, 14, 'h');
      trace(G.x + G.w - 16, G.y + G.h - 20, -14, 'h');
      trace(G.x + 20, G.y + G.h - 22, -12, 'v');
      trace(G.x + G.w - 22, G.y + 22, 12, 'v');
      // 边线断续
      ctx.strokeStyle = css(pal.base, 0.2);
      ctx.setLineDash([8, 6]);
      TG.roundRect(ctx, G.x + 6, G.y + 6, G.w - 12, G.h - 12, 12);
      ctx.stroke();
      ctx.restore();
    }
  });

  TG.register('frame', {
    id: 'crack', name: '裂纹', hint: '断裂裂纹 + 缺口，扭曲/侵蚀风',
    draw: function (g) {
      var ctx = g.ctx, G = geom(), pal = g.pal, r = g.rand;
      ctx.save();
      ctx.strokeStyle = 'rgba(255,255,255,0.18)'; ctx.lineWidth = 1;
      function crack(x, y, ang, len, depth) {
        if (depth <= 0) return;
        var nx = x + Math.cos(ang) * len, ny = y + Math.sin(ang) * len;
        ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(nx, ny); ctx.stroke();
        crack(nx, ny, ang + (r() - 0.5) * 0.9, len * (0.55 + r() * 0.3), depth - 1);
        if (r() > 0.55) crack(nx, ny, ang + (r() - 0.5) * 1.6, len * 0.5, depth - 1);
      }
      crack(G.x + G.w * 0.78, G.y + 4, 1.9, 22, 3);
      crack(G.x + 12, G.y + G.h * 0.72, -0.5, 18, 3);
      // 边框断口
      ctx.strokeStyle = css(pal.base, 0.4); ctx.lineWidth = 1.2;
      ctx.beginPath();
      for (var i = 0; i < 4; i++) {
        ctx.moveTo(G.x + 8 + i * 2, G.y + G.h - 8);
      }
      TG.roundRect(ctx, G.x + 1, G.y + 1, G.w - 2, G.h - 2, 16);
      ctx.stroke();
      ctx.restore();
    }
  });

  TG.register('frame', {
    id: 'neonedge', name: '霓虹边', hint: '整圈霓虹光管，最抢眼',
    draw: function (g) {
      var ctx = g.ctx, G = geom(), pal = g.pal;
      ctx.save();
      ctx.shadowColor = css(pal.base, 0.85);
      ctx.shadowBlur = 24;
      TG.roundRect(ctx, G.x + 2, G.y + 2, G.w - 4, G.h - 4, 14);
      ctx.strokeStyle = css(pal.base, 0.5); ctx.lineWidth = 2.2; ctx.stroke();
      ctx.shadowBlur = 10;
      ctx.strokeStyle = mix(pal.base, '#ffffff', 0.7); ctx.lineWidth = 1; ctx.stroke();
      ctx.restore();
    }
  });
})();

