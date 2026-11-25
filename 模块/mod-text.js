/* ============================================================
 * mod-text.js — 字材模块（6 种）
 * 标题的材质处理；都通过 TG.paintTitle 绘制，动效模块可复用其掩膜。
 * ============================================================ */
(function () {
  'use strict';
  var TG = window.TG, FONT = TG.FONT;
  var css = TG.css, mix = TG.mix, mixArr = TG.mixArr;

  function metalFill(pal, tint) {
    tint = tint === undefined ? 1 : tint;
    return function (ctx, size) {
      var L = arguments.length ? null : null;
      var base = pal.base;
      var gd = ctx.createLinearGradient(0, 98 - size * 0.8, 0, 98 + size * 0.2);
      gd.addColorStop(0.00, mix(base, '#ffffff', 0.68 * tint));
      gd.addColorStop(0.26, mix(base, '#ffffff', 0.40 * tint));
      gd.addColorStop(0.46, mix(base, '#ffffff', 0.08));
      gd.addColorStop(0.68, base);
      gd.addColorStop(0.88, mix(base, '#04070d', 0.45));
      gd.addColorStop(1.00, mix(base, '#04070d', 0.70));
      return gd;
    };
  }

  /* 金属：最经典的称号字 */
  TG.register('text', {
    id: 'metal', name: '金属', hint: '金属渐变 + 外发光 + 暗描边 + 顶部高光',
    draw: function (g) {
      var pal = g.pal;
      TG.paintTitle(g, {
        fill: metalFill(pal, 1),
        suffixFill: metalFill(pal, 0.82),
        glow: css(pal.base, 0.85),
        glowBlur: 30,
        stroke: 'rgba(3,6,12,0.92)',
        strokeWidth: 6.4,
        topHighlight: 'rgba(255,255,255,0.42)'
      });
    }
  });

  /* 霓虹：光管 */
  TG.register('text', {
    id: 'neon', name: '霓虹', hint: '多层光晕 + 亮芯，夜店/后巷',
    draw: function (g) {
      var pal = g.pal;
      TG.paintTitle(g, {
        fill: css(pal.base, 0.85),
        glow: css(pal.base, 0.9),
        glowBlur: 34
      });
      TG.paintTitle(g, {
        fill: mix(pal.base, '#ffffff', 0.2),
        glow: css(pal.base, 0.7),
        glowBlur: 14
      });
      TG.paintTitle(g, {
        fill: mix(pal.base, '#ffffff', 0.72),
        stroke: css(pal.base, 0.75),
        strokeWidth: 1.4
      });
    }
  });

  /* 空心描边 */
  TG.register('text', {
    id: 'hollow', name: '空心', hint: '粗描边空心字，极简/铭牌',
    draw: function (g) {
      var pal = g.pal;
      TG.paintTitle(g, {
        fill: 'rgba(10,16,26,0.35)',
        glow: css(pal.base, 0.55),
        glowBlur: 16
      });
      TG.paintTitle(g, {
        fill: 'rgba(10,16,26,0.0)',
        stroke: css(pal.base, 0.95),
        strokeWidth: 2.6
      });
      TG.paintTitle(g, {
        fill: 'rgba(255,255,255,0.06)',
        stroke: 'rgba(255,255,255,0.35)',
        strokeWidth: 0.9
      });
    }
  });

  /* 墨印：纸档案上的印刷字（深色底自动反白，避免在深色底板上看不见） */
  TG.register('text', {
    id: 'ink', name: '墨印', hint: '印刷墨字：纸底用深墨、深底自动反白',
    draw: function (g) {
      var st = g.stack || {};
      var light = st.bg === 'paper' || st.plate === 'paper';
      var mainInk = light ? ['#2a3346', '#141a26'] : ['#f4f8ff', '#c8d6ea'];
      TG.paintTitle(g, { fill: light ? 'rgba(27,33,48,0.30)' : 'rgba(255,255,255,0.16)', alpha: 0.9 });
      g.ctx.save();
      g.ctx.translate(1.2, 1.1);
      TG.paintTitle(g, { fill: light ? 'rgba(60,52,40,0.28)' : 'rgba(120,140,170,0.22)' });
      g.ctx.restore();
      TG.paintTitle(g, {
        fill: function (ctx, size) {
          var gd = ctx.createLinearGradient(0, 98 - size * 0.7, 0, 98 + size * 0.2);
          gd.addColorStop(0, mainInk[0]);
          gd.addColorStop(1, mainInk[1]);
          return gd;
        },
        stroke: light ? 'rgba(255,255,255,0.35)' : 'rgba(6,10,16,0.85)',
        strokeWidth: light ? 0.8 : 1.6
      });
    }
  });

  /* 血纹：暗红渐变 + 血色辉光 */
  TG.register('text', {
    id: 'blood', name: '血纹', hint: '暗红渐变 + 血色辉光，适用于暗色风格',
    draw: function (g) {
      var pal = g.pal;
      TG.paintTitle(g, {
        fill: 'rgba(60,6,10,0.9)',
        glow: 'rgba(180,20,28,0.9)',
        glowBlur: 34
      });
      TG.paintTitle(g, {
        fill: function (ctx, size) {
          var gd = ctx.createLinearGradient(0, 98 - size * 0.8, 0, 98 + size * 0.25);
          gd.addColorStop(0, '#ff8d84');
          gd.addColorStop(0.32, '#e23a3a');
          gd.addColorStop(0.62, '#9d1119');
          gd.addColorStop(1, '#4a060b');
          return gd;
        },
        stroke: 'rgba(20,2,4,0.9)',
        strokeWidth: 4.6,
        topHighlight: 'rgba(255,190,180,0.45)'
      });
    }
  });

  /* 全息：青/品红分离 + 亮芯 */
  TG.register('text', {
    id: 'holo', name: '全息', hint: '青品红分离 + 亮芯，数据/全息投影',
    draw: function (g) {
      var pal = g.pal;
      g.ctx.save();
      g.ctx.globalCompositeOperation = 'lighter';
      g.ctx.translate(-1.6, -0.6);
      TG.paintTitle(g, { fill: 'rgba(60,220,255,0.45)' });
      g.ctx.translate(3.2, 1.2);
      TG.paintTitle(g, { fill: 'rgba(255,80,200,0.42)' });
      g.ctx.restore();
      TG.paintTitle(g, {
        fill: function (ctx, size) {
          var gd = ctx.createLinearGradient(0, 98 - size * 0.8, 0, 98 + size * 0.2);
          gd.addColorStop(0, '#ffffff');
          gd.addColorStop(0.4, mix(pal.base, '#ffffff', 0.55));
          gd.addColorStop(1, mix(pal.base, '#04070d', 0.25));
          return gd;
        },
        glow: css(pal.base, 0.8),
        glowBlur: 26,
        stroke: 'rgba(4,10,18,0.75)',
        strokeWidth: 3.4
      });
      // 扫描细纹
      var L = g.L, ctx = g.ctx;
      ctx.save();
      ctx.beginPath();
      ctx.rect(L.ax - 20, L.baseline - L.fA, L.total + 40, L.fA * 1.2);
      ctx.clip();
      ctx.globalCompositeOperation = 'lighter';
      ctx.strokeStyle = 'rgba(255,255,255,0.08)';
      ctx.lineWidth = 1;
      for (var y = L.baseline - L.fA; y < L.baseline + 12; y += 4) {
        ctx.beginPath(); ctx.moveTo(L.ax - 20, y); ctx.lineTo(L.ax + L.total + 20, y); ctx.stroke();
      }
      ctx.restore();
    }
  });
})();
