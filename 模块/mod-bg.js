/* ============================================================
 * mod-bg.js — 背景模块（7 种）
 * 画在称号牌最底层：负责整张卡的气氛，不参与文字。
 * ============================================================ */
(function () {
  'use strict';
  var TG = window.TG, W = TG.W, H = TG.H;
  var css = TG.css, mix = TG.mix, mixArr = TG.mixArr;

  /* 透明：什么都不画，导出即纯卡片（四角全透） */
  TG.register('bg', {
    id: 'transparent', name: '透明', hint: '不画背景，只留称号牌本体',
    draw: function () {}
  });

  /* 夜色：深蓝渐变 + 暗角 + 星点 */
  TG.register('bg', {
    id: 'night', name: '夜色', hint: '深蓝渐变 + 星点 + 暗角',
    draw: function (g) {
      var ctx = g.ctx;
      var bg = ctx.createLinearGradient(0, 0, W * 0.55, H);
      bg.addColorStop(0, '#101b2c'); bg.addColorStop(0.55, '#0a121f'); bg.addColorStop(1, '#05080f');
      ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);
      var r = g.rand;
      for (var i = 0; i < 34; i++) {
        var x = r() * W, y = r() * H, s = 0.4 + r() * 1.1, a = 0.15 + r() * 0.55;
        ctx.fillStyle = 'rgba(255,255,255,' + a.toFixed(2) + ')';
        ctx.beginPath(); ctx.arc(x, y, s, 0, Math.PI * 2); ctx.fill();
      }
      var vg = ctx.createRadialGradient(W * 0.42, H * 0.34, 18, W * 0.42, H * 0.34, W * 0.72);
      vg.addColorStop(0, 'rgba(255,255,255,0.05)');
      vg.addColorStop(1, 'rgba(0,0,0,0.45)');
      ctx.fillStyle = vg; ctx.fillRect(0, 0, W, H);
    }
  });

  /* 网格：工程图纸感 */
  TG.register('bg', {
    id: 'grid', name: '网格', hint: '深底 + 细网格，工程/协议感',
    draw: function (g) {
      var ctx = g.ctx;
      ctx.fillStyle = '#070d16'; ctx.fillRect(0, 0, W, H);
      var glow = ctx.createRadialGradient(W * 0.5, H * 0.52, 10, W * 0.5, H * 0.52, W * 0.6);
      glow.addColorStop(0, css(g.pal.base, 0.10));
      glow.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = glow; ctx.fillRect(0, 0, W, H);
      ctx.strokeStyle = 'rgba(255,255,255,0.045)'; ctx.lineWidth = 1;
      for (var x = 0; x <= W; x += 24) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); }
      for (var y = 0; y <= H; y += 24) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }
      ctx.strokeStyle = css(g.pal.base, 0.10);
      for (var x2 = 0; x2 <= W; x2 += 120) { ctx.beginPath(); ctx.moveTo(x2, 0); ctx.lineTo(x2, H); ctx.stroke(); }
    }
  });

  /* 纸面：档案纸 + 纤维 + 老化边 */
  TG.register('bg', {
    id: 'paper', name: '纸面', hint: '米色档案纸 + 纤维纹理，配「墨印」字材',
    draw: function (g) {
      var ctx = g.ctx, r = g.rand;
      var bg = ctx.createLinearGradient(0, 0, W * 0.4, H);
      bg.addColorStop(0, '#efe6d2'); bg.addColorStop(0.55, '#e6dcc6'); bg.addColorStop(1, '#d8ccb2');
      ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);
      ctx.strokeStyle = 'rgba(120,100,70,0.10)'; ctx.lineWidth = 0.7;
      for (var i = 0; i < 90; i++) {
        var x = r() * W, y = r() * H, len = 3 + r() * 16, ang = r() * Math.PI;
        ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + Math.cos(ang) * len, y + Math.sin(ang) * len); ctx.stroke();
      }
      var vg = ctx.createRadialGradient(W * 0.5, H * 0.5, H * 0.35, W * 0.5, H * 0.5, W * 0.62);
      vg.addColorStop(0, 'rgba(120,100,70,0)');
      vg.addColorStop(1, 'rgba(90,70,45,0.30)');
      ctx.fillStyle = vg; ctx.fillRect(0, 0, W, H);
    }
  });

  /* 血雾：暗红雾层，配「血纹」「血脉冲」 */
  TG.register('bg', {
    id: 'blood', name: '血雾', hint: '暗底 + 血色雾层',
    draw: function (g) {
      var ctx = g.ctx, r = g.rand;
      ctx.fillStyle = '#0b0709'; ctx.fillRect(0, 0, W, H);
      for (var i = 0; i < 6; i++) {
        var cx = r() * W, cy = r() * H, rad = 60 + r() * 150;
        var rg = ctx.createRadialGradient(cx, cy, 4, cx, cy, rad);
        rg.addColorStop(0, 'rgba(140,26,34,' + (0.16 + r() * 0.16).toFixed(2) + ')');
        rg.addColorStop(1, 'rgba(140,26,34,0)');
        ctx.fillStyle = rg; ctx.fillRect(0, 0, W, H);
      }
      var vg = ctx.createRadialGradient(W * 0.5, H * 0.5, H * 0.3, W * 0.5, H * 0.5, W * 0.6);
      vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,0.55)');
      ctx.fillStyle = vg; ctx.fillRect(0, 0, W, H);
    }
  });

  /* 天际线：后巷城市剪影 + 霓虹地平光 */
  TG.register('bg', {
    id: 'skyline', name: '天际线', hint: '后巷剪影 + 霓虹地平光',
    draw: function (g) {
      var ctx = g.ctx, r = g.rand;
      ctx.fillStyle = '#05080f'; ctx.fillRect(0, 0, W, H);
      var hz = H * 0.72;
      var sky = ctx.createLinearGradient(0, hz - 80, 0, hz + 20);
      sky.addColorStop(0, 'rgba(0,0,0,0)');
      sky.addColorStop(0.72, css(g.pal.base, 0.16));
      sky.addColorStop(1, css(g.pal.base, 0.05));
      ctx.fillStyle = sky; ctx.fillRect(0, hz - 80, W, 100);
      // 楼群
      var x = 0;
      while (x < W) {
        var bw = 14 + r() * 34, bh = 18 + r() * 74;
        ctx.fillStyle = 'rgba(6,10,17,0.95)';
        ctx.fillRect(x, hz - bh, bw, bh + 30);
        // 窗
        for (var wy = hz - bh + 6; wy < hz - 4; wy += 8) {
          for (var wx = x + 4; wx < x + bw - 4; wx += 7) {
            if (r() > 0.62) {
              ctx.fillStyle = r() > 0.5 ? css(g.pal.base, 0.35 + r() * 0.4) : 'rgba(255,215,94,0.28)';
              ctx.fillRect(wx, wy, 2.2, 2.6);
            }
          }
        }
        x += bw + 3 + r() * 5;
      }
      var vg = ctx.createRadialGradient(W * 0.5, H * 0.4, H * 0.4, W * 0.5, H * 0.4, W * 0.66);
      vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,0.6)');
      ctx.fillStyle = vg; ctx.fillRect(0, 0, W, H);
    }
  });

  /* 六边网：奇点/共振底纹 */
  TG.register('bg', {
    id: 'hexmesh', name: '六边网', hint: '六边形网格底纹，奇点风格',
    draw: function (g) {
      var ctx = g.ctx;
      ctx.fillStyle = '#060a12'; ctx.fillRect(0, 0, W, H);
      var R = 18, dx = R * Math.sqrt(3), dy = R * 1.5;
      ctx.strokeStyle = css(g.pal.base, 0.13); ctx.lineWidth = 1;
      for (var row = -1; row * dy < H + R; row++) {
        for (var col = -1; col * dx < W + dx; col++) {
          var cx = col * dx + (row % 2 ? dx / 2 : 0), cy = row * dy;
          TG.hexPath(ctx, cx, cy, R - 2, 6);
          ctx.stroke();
        }
      }
      var gl = ctx.createRadialGradient(W * 0.5, H * 0.5, 6, W * 0.5, H * 0.5, W * 0.55);
      gl.addColorStop(0, css(g.pal.base, 0.16));
      gl.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = gl; ctx.fillRect(0, 0, W, H);
      var vg = ctx.createRadialGradient(W * 0.5, H * 0.5, H * 0.4, W * 0.5, H * 0.5, W * 0.7);
      vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,0.5)');
      ctx.fillStyle = vg; ctx.fillRect(0, 0, W, H);
    }
  });
})();
