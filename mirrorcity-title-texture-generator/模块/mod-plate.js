/* ============================================================
 * mod-plate.js — 底板模块（7 种）
 * 称号牌主体材质；自带一圈基础描边，边框模块（frame）在此之上再叠加结构。
 * ============================================================ */
(function () {
  'use strict';
  var TG = window.TG, W = TG.W, H = TG.H;
  var css = TG.css, mix = TG.mix, mixArr = TG.mixArr;

  var PAD = 5, R = 16;
  function geom() { return { x: PAD, y: PAD, w: W - PAD * 2, h: H - PAD * 2, r: R }; }

  function baseBorder(g, alpha) {
    var ctx = g.ctx, G = geom(), pal = g.pal;
    ctx.save();
    var bg = ctx.createLinearGradient(G.x, G.y, G.x + G.w, G.y + G.h);
    bg.addColorStop(0, css(pal.base, alpha === undefined ? 0.75 : alpha));
    bg.addColorStop(0.45, mix(pal.base, '#ffffff', 0.35));
    bg.addColorStop(1, css(pal.base, 0.16));
    TG.roundRect(ctx, G.x + 0.6, G.y + 0.6, G.w - 1.2, G.h - 1.2, G.r);
    ctx.strokeStyle = bg; ctx.lineWidth = 1.4; ctx.stroke();
    TG.roundRect(ctx, G.x + 2.4, G.y + 2.4, G.w - 4.8, G.h - 4.8, G.r - 2);
    ctx.strokeStyle = 'rgba(255,255,255,0.055)'; ctx.lineWidth = 1; ctx.stroke();
    ctx.restore();
  }

  /* 平涂：最干净、体积最省，通用默认 */
  TG.register('plate', {
    id: 'flat', name: '平涂深色', hint: '平涂深底 + 顶部窄光，最通用也最省体积',
    draw: function (g) {
      var ctx = g.ctx, G = geom(), pal = g.pal;
      ctx.save();
      ctx.shadowColor = css(pal.base, 0.32); ctx.shadowBlur = 26;
      TG.roundRect(ctx, G.x, G.y, G.w, G.h, G.r);
      ctx.fillStyle = 'rgba(10,16,26,0.9)'; ctx.fill();
      ctx.restore();

      ctx.save();
      TG.roundRect(ctx, G.x, G.y, G.w, G.h, G.r);
      ctx.fillStyle = 'rgba(12,18,29,0.95)'; ctx.fill();
      ctx.clip();
      var top = ctx.createLinearGradient(0, G.y, 0, G.y + 26);
      top.addColorStop(0, 'rgba(255,255,255,0.06)'); top.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = top; ctx.fillRect(G.x, G.y, G.w, 26);
      var bot = ctx.createLinearGradient(0, G.y + G.h - 28, 0, G.y + G.h);
      bot.addColorStop(0, 'rgba(0,0,0,0)'); bot.addColorStop(1, 'rgba(0,0,0,0.35)');
      ctx.fillStyle = bot; ctx.fillRect(G.x, G.y + G.h - 28, G.w, 28);
      var left = ctx.createLinearGradient(G.x, 0, G.x + 70, 0);
      left.addColorStop(0, css(pal.base, 0.10)); left.addColorStop(1, css(pal.base, 0));
      ctx.fillStyle = left; ctx.fillRect(G.x, G.y, 70, G.h);
      ctx.restore();
      baseBorder(g);
    }
  });

  /* 玻璃：半透明、顶部弧光 + 斜反射 */
  TG.register('plate', {
    id: 'glass', name: '玻璃', hint: '半透明玻璃 + 顶部弧光 + 斜反射',
    draw: function (g) {
      var ctx = g.ctx, G = geom(), pal = g.pal;
      ctx.save();
      TG.roundRect(ctx, G.x, G.y, G.w, G.h, G.r);
      var gd = ctx.createLinearGradient(G.x, G.y, G.x + G.w * 0.4, G.y + G.h);
      gd.addColorStop(0, 'rgba(28,44,68,0.62)');
      gd.addColorStop(0.5, 'rgba(14,24,38,0.66)');
      gd.addColorStop(1, 'rgba(8,14,24,0.72)');
      ctx.fillStyle = gd; ctx.fill();
      ctx.clip();
      // 顶部弧光
      var arc = ctx.createLinearGradient(0, G.y, 0, G.y + 46);
      arc.addColorStop(0, 'rgba(255,255,255,0.16)');
      arc.addColorStop(0.45, 'rgba(255,255,255,0.05)');
      arc.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = arc;
      ctx.beginPath();
      ctx.ellipse(G.x + G.w / 2, G.y + 6, G.w * 0.56, 42, 0, 0, Math.PI * 2);
      ctx.fill();
      // 斜反射
      ctx.globalCompositeOperation = 'lighter';
      var sh = ctx.createLinearGradient(G.x, G.y + G.h, G.x + G.w * 0.75, G.y);
      sh.addColorStop(0, 'rgba(255,255,255,0)');
      sh.addColorStop(0.48, 'rgba(255,255,255,0.05)');
      sh.addColorStop(0.52, 'rgba(255,255,255,0.10)');
      sh.addColorStop(0.56, 'rgba(255,255,255,0.05)');
      sh.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = sh; ctx.fillRect(G.x, G.y, G.w, G.h);
      ctx.restore();
      baseBorder(g, 0.7);
    }
  });

  /* 黑金：近乎纯黑 + 金色内框 + 角部金属块 */
  TG.register('plate', {
    id: 'blackgold', name: '黑金', hint: '纯黑底 + 金色内框 + 角部金属块，最贵气',
    draw: function (g) {
      var ctx = g.ctx, G = geom(), pal = g.pal;
      var gold = pal.warm;
      ctx.save();
      ctx.shadowColor = 'rgba(255,215,94,0.34)'; ctx.shadowBlur = 28;
      TG.roundRect(ctx, G.x, G.y, G.w, G.h, G.r);
      ctx.fillStyle = '#08090c'; ctx.fill();
      ctx.restore();

      ctx.save();
      TG.roundRect(ctx, G.x, G.y, G.w, G.h, G.r);
      ctx.fillStyle = '#0b0c10'; ctx.fill();
      ctx.clip();
      var top = ctx.createLinearGradient(0, G.y, 0, G.y + 30);
      top.addColorStop(0, 'rgba(255,236,180,0.10)'); top.addColorStop(1, 'rgba(255,236,180,0)');
      ctx.fillStyle = top; ctx.fillRect(G.x, G.y, G.w, 30);
      // 角部金属块
      [[G.x, G.y, 1, 1], [G.x + G.w, G.y, -1, 1], [G.x, G.y + G.h, 1, -1], [G.x + G.w, G.y + G.h, -1, -1]]
        .forEach(function (c) {
          var lg = ctx.createLinearGradient(c[0], c[1], c[0] + c[2] * 46, c[1] + c[3] * 46);
          lg.addColorStop(0, 'rgba(255,236,180,0.22)');
          lg.addColorStop(1, 'rgba(255,236,180,0)');
          ctx.fillStyle = lg;
          ctx.beginPath();
          ctx.moveTo(c[0], c[1]);
          ctx.lineTo(c[0] + c[2] * 64, c[1]);
          ctx.lineTo(c[0], c[1] + c[3] * 46);
          ctx.closePath(); ctx.fill();
        });
      ctx.restore();

      // 金色内框
      ctx.save();
      var gb = ctx.createLinearGradient(G.x, G.y, G.x + G.w, G.y + G.h);
      gb.addColorStop(0, mix(gold, '#ffffff', 0.5));
      gb.addColorStop(0.35, gold);
      gb.addColorStop(0.7, mix(gold, '#5a3a08', 0.55));
      gb.addColorStop(1, mix(gold, '#ffffff', 0.35));
      TG.roundRect(ctx, G.x + 0.8, G.y + 0.8, G.w - 1.6, G.h - 1.6, G.r);
      ctx.strokeStyle = gb; ctx.lineWidth = 1.6; ctx.stroke();
      TG.roundRect(ctx, G.x + 4, G.y + 4, G.w - 8, G.h - 8, G.r - 3);
      ctx.strokeStyle = 'rgba(255,215,94,0.28)'; ctx.lineWidth = 0.8; ctx.stroke();
      ctx.restore();
    }
  });

  /* 纸底板：米白纸卡 + 折痕 + 装订孔 */
  TG.register('plate', {
    id: 'paper', name: '纸卡', hint: '米白纸卡 + 折痕 + 装订孔，配「墨印」字材',
    draw: function (g) {
      var ctx = g.ctx, G = geom(), pal = g.pal, r = g.rand;
      ctx.save();
      ctx.shadowColor = 'rgba(0,0,0,0.55)'; ctx.shadowBlur = 20; ctx.shadowOffsetY = 2;
      TG.roundRect(ctx, G.x, G.y, G.w, G.h, 4);
      var pg = ctx.createLinearGradient(0, G.y, 0, G.y + G.h);
      pg.addColorStop(0, '#f3ecda'); pg.addColorStop(0.6, '#e9e0c9'); pg.addColorStop(1, '#ddd2b8');
      ctx.fillStyle = pg; ctx.fill();
      ctx.restore();

      ctx.save();
      TG.roundRect(ctx, G.x, G.y, G.w, G.h, 4); ctx.clip();
      // 纤维
      ctx.strokeStyle = 'rgba(120,100,70,0.08)'; ctx.lineWidth = 0.6;
      for (var i = 0; i < 40; i++) {
        var x = G.x + r() * G.w, y = G.y + r() * G.h, len = 3 + r() * 12;
        ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + len, y + (r() - 0.5) * 3); ctx.stroke();
      }
      // 折痕
      var fold = ctx.createLinearGradient(0, G.y + G.h * 0.5, 0, G.y + G.h * 0.5 + 16);
      fold.addColorStop(0, 'rgba(255,255,255,0.35)');
      fold.addColorStop(0.5, 'rgba(150,130,95,0.14)');
      fold.addColorStop(1, 'rgba(255,255,255,0.22)');
      ctx.fillStyle = fold;
      ctx.fillRect(G.x, G.y + G.h * 0.5, G.w, 16);
      // 装订孔
      ctx.fillStyle = 'rgba(90,74,50,0.35)';
      for (var k = 0; k < 3; k++) {
        ctx.beginPath(); ctx.arc(G.x + 16, G.y + 34 + k * 22, 2.6, 0, Math.PI * 2); ctx.fill();
      }
      ctx.restore();

      ctx.save();
      TG.roundRect(ctx, G.x + 0.5, G.y + 0.5, G.w - 1, G.h - 1, 4);
      ctx.strokeStyle = 'rgba(120,100,70,0.45)'; ctx.lineWidth = 1; ctx.stroke();
      ctx.restore();
    }
  });

  /* 收容箱：金属灰 + 上下警示斜纹 + 铆钉 */
  TG.register('plate', {
    id: 'containment', name: '收容箱', hint: '金属灰 + 警示斜纹 + 铆钉，收容箱风格',
    draw: function (g) {
      var ctx = g.ctx, G = geom(), pal = g.pal;
      ctx.save();
      ctx.shadowColor = 'rgba(0,0,0,0.5)'; ctx.shadowBlur = 22;
      TG.roundRect(ctx, G.x, G.y, G.w, G.h, 6);
      var mg = ctx.createLinearGradient(0, G.y, 0, G.y + G.h);
      mg.addColorStop(0, '#232a33'); mg.addColorStop(0.45, '#171d25'); mg.addColorStop(1, '#0e1319');
      ctx.fillStyle = mg; ctx.fill();
      ctx.restore();

      ctx.save();
      TG.roundRect(ctx, G.x, G.y, G.w, G.h, 6); ctx.clip();
      // 上下警示斜纹
      function stripes(y0, hgt) {
        ctx.save();
        ctx.beginPath(); ctx.rect(G.x, y0, G.w, hgt); ctx.clip();
        ctx.fillStyle = 'rgba(255,190,60,0.10)';
        ctx.fillRect(G.x, y0, G.w, hgt);
        ctx.strokeStyle = 'rgba(255,190,60,0.22)'; ctx.lineWidth = 6;
        for (var x = -hgt; x < G.w + hgt; x += 18) {
          ctx.beginPath(); ctx.moveTo(G.x + x, y0 + hgt); ctx.lineTo(G.x + x + hgt, y0); ctx.stroke();
        }
        ctx.restore();
      }
      stripes(G.y, 12);
      stripes(G.y + G.h - 12, 12);
      // 铆钉
      ctx.fillStyle = 'rgba(255,255,255,0.14)';
      for (var i = 0; i < 9; i++) {
        var x = G.x + 22 + i * (G.w - 44) / 8;
        [G.y + 22, G.y + G.h - 22].forEach(function (y) {
          ctx.beginPath(); ctx.arc(x, y, 1.9, 0, Math.PI * 2); ctx.fill();
        });
      }
      // 内阴影
      var iv = ctx.createRadialGradient(W / 2, H / 2, H * 0.3, W / 2, H / 2, W * 0.62);
      iv.addColorStop(0, 'rgba(0,0,0,0)'); iv.addColorStop(1, 'rgba(0,0,0,0.5)');
      ctx.fillStyle = iv; ctx.fillRect(G.x, G.y, G.w, G.h);
      ctx.restore();

      ctx.save();
      TG.roundRect(ctx, G.x + 0.7, G.y + 0.7, G.w - 1.4, G.h - 1.4, 6);
      ctx.strokeStyle = 'rgba(255,190,60,0.35)'; ctx.lineWidth = 1.3; ctx.stroke();
      ctx.restore();
    }
  });

  /* 霓虹：深底 + 边缘霓虹光管 */
  TG.register('plate', {
    id: 'neon', name: '霓虹', hint: '深底 + 边缘霓虹光，后巷/夜店风',
    draw: function (g) {
      var ctx = g.ctx, G = geom(), pal = g.pal;
      ctx.save();
      TG.roundRect(ctx, G.x, G.y, G.w, G.h, G.r);
      ctx.fillStyle = 'rgba(6,10,18,0.94)'; ctx.fill();
      ctx.clip();
      var inn = ctx.createRadialGradient(W / 2, H / 2, H * 0.2, W / 2, H / 2, W * 0.6);
      inn.addColorStop(0, css(pal.base, 0.10));
      inn.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = inn; ctx.fillRect(G.x, G.y, G.w, G.h);
      ctx.restore();

      // 霓虹管：外发光 + 亮芯
      ctx.save();
      ctx.shadowColor = css(pal.base, 0.9); ctx.shadowBlur = 22;
      TG.roundRect(ctx, G.x + 1.2, G.y + 1.2, G.w - 2.4, G.h - 2.4, G.r);
      ctx.strokeStyle = css(pal.base, 0.55); ctx.lineWidth = 2.6; ctx.stroke();
      ctx.shadowBlur = 8;
      ctx.strokeStyle = mix(pal.base, '#ffffff', 0.6); ctx.lineWidth = 1.1; ctx.stroke();
      ctx.restore();
    }
  });

  /* 无底板：只留文字与光（可叠在任意背景上） */
  TG.register('plate', {
    id: 'none', name: '无底板', hint: '不画底板，只输出文字与光晕',
    draw: function () {}
  });
})();
