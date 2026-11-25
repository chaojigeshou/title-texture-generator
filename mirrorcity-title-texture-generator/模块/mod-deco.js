/* ============================================================
 * mod-deco.js — 装饰模块（可任意叠加）
 * 静态构件：进度钻石 / 编号 / 水印 / 符文 / 齿轮 / 数据流 / 血纹 / 印章 / 条码 / 竖条
 * ============================================================ */
(function () {
  'use strict';
  var TG = window.TG, W = TG.W, H = TG.H;
  var css = TG.css, mix = TG.mix;

  /* 阶位进度钻石 */
  TG.register('deco', {
    id: 'progress', name: '进度钻石', hint: '左侧阶位进度点（item.steps = [已亮, 总数]）',
    draw: function (g) {
      var item = g.item, pal = g.pal, ctx = g.ctx, L = g.L;
      if (!item.steps) return;
      var filled = item.steps[0], total = item.steps[1];
      var x = L.parts ? L.lanes.bottom.x : L.ax - 2;
      var y = L.parts ? L.lanes.bottom.y + 5 : 126;
      for (var i = 0; i < total; i++) {
        TG.diamond(ctx, x + i * 13, y, 3.4);
        if (i < filled) { ctx.fillStyle = css(pal.base, 0.95); ctx.fill(); }
        else { ctx.strokeStyle = 'rgba(255,255,255,0.18)'; ctx.lineWidth = 1; ctx.stroke(); }
      }
    }
  });

  /* 大号编号/罗马数字水印 */
  TG.register('deco', {
    id: 'roman', name: '数字水印', hint: '右下大号编号水印',
    draw: function (g) {
      var item = g.item, pal = g.pal, ctx = g.ctx;
      var txt = item.roman || item.code || '';
      if (!txt) return;
      ctx.save();
      ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
      ctx.font = '700 54px ' + TG.FONT;
      ctx.fillStyle = css(pal.base, 0.085);
      ctx.fillText(TG.fitText(ctx, txt, W - 44), W - 22, 76);
      ctx.restore();
    }
  });

  /* 左上编号 + 分隔线 */
  TG.register('deco', {
    id: 'number', name: '档案编号', hint: '左上角编号 + 细线',
    draw: function (g) {
      var item = g.item, pal = g.pal, L = g.L;
      var rank = item.rank;
      var txt = item.code || (rank == null || rank === '' ? 'NO.--' : 'NO.' + (rank < 10 ? '0' + rank : rank));
      var numberX = L.parts ? Math.max(L.content.left, L.content.right - 80) : L.ax - 2;
      var numberY = L.parts ? 20 : 46;
      TG.smallCaps(g.ctx, txt, numberX, numberY, 8.5, pal.base, 0.55, 2.4, 'left', 700, 76);
      g.ctx.save();
      g.ctx.strokeStyle = css(pal.base, 0.22);
      g.ctx.lineWidth = 0.8;
      g.ctx.beginPath();
      g.ctx.moveTo(numberX, numberY + 8);
      g.ctx.lineTo(numberX + 76, numberY + 8);
      g.ctx.stroke();
      g.ctx.restore();
    }
  });

  /* 四角符文 */
  TG.register('deco', {
    id: 'runes', name: '符文', hint: '四角小符文',
    draw: function (g) {
      var pal = g.pal, ctx = g.ctx;
      var pts = [[26, 26], [W - 26, 26], [26, H - 26], [W - 26, H - 26]];
      ctx.save();
      ctx.strokeStyle = css(pal.base, 0.5);
      ctx.lineWidth = 1;
      pts.forEach(function (p, i) {
        ctx.save();
        ctx.translate(p[0], p[1]);
        ctx.rotate(Math.PI / 4 + i * 0.2);
        ctx.beginPath(); ctx.rect(-4.5, -4.5, 9, 9); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(-8, 0); ctx.lineTo(-5, 0); ctx.moveTo(5, 0); ctx.lineTo(8, 0); ctx.stroke();
        ctx.restore();
      });
      ctx.restore();
    }
  });

  /* 齿轮 */
  TG.register('deco', {
    id: 'gears', name: '齿轮', hint: '机械齿轮，翼/工坊风',
    draw: function (g) {
      var pal = g.pal, ctx = g.ctx;
      function gear(cx, cy, R, teeth, alpha, spin) {
        ctx.save();
        ctx.translate(cx, cy); ctx.rotate(spin || 0);
        ctx.strokeStyle = css(pal.base, alpha); ctx.lineWidth = 1.1;
        ctx.beginPath(); ctx.arc(0, 0, R, 0, Math.PI * 2); ctx.stroke();
        ctx.beginPath(); ctx.arc(0, 0, R * 0.55, 0, Math.PI * 2); ctx.stroke();
        for (var i = 0; i < teeth; i++) {
          var a = i * Math.PI * 2 / teeth;
          ctx.beginPath();
          ctx.moveTo(Math.cos(a) * R, Math.sin(a) * R);
          ctx.lineTo(Math.cos(a) * (R + 4), Math.sin(a) * (R + 4));
          ctx.stroke();
        }
        ctx.restore();
      }
      gear(W - 34, 34, 14, 10, 0.34, 0.3);
      gear(34, H - 34, 9, 8, 0.26, 0.8);
    }
  });

  /* 数据流竖线 */
  TG.register('deco', {
    id: 'stream', name: '数据流', hint: '右侧竖向数据条',
    draw: function (g) {
      var pal = g.pal, ctx = g.ctx, r = g.rand;
      ctx.save();
      for (var i = 0; i < 3; i++) {
        var x = W - 16 - i * 5;
        for (var y = 20; y < H - 20; y += 6) {
          var a = 0.08 + r() * 0.3;
          ctx.fillStyle = css(pal.base, a);
          ctx.fillRect(x, y, 1.6, 2 + r() * 2);
        }
      }
      ctx.restore();
    }
  });

  /* 血纹 */
  TG.register('deco', {
    id: 'veins', name: '血纹', hint: '底部血色细血管',
    draw: function (g) {
      var ctx = g.ctx, r = g.rand;
      ctx.save();
      ctx.strokeStyle = 'rgba(190,30,40,0.45)';
      ctx.lineWidth = 1;
      for (var i = 0; i < 3; i++) {
        var x0 = 30 + r() * (W - 60), y0 = H - 8;
        ctx.beginPath();
        ctx.moveTo(x0, y0);
        var x = x0, y = y0;
        for (var s = 0; s < 4; s++) {
          x += (r() - 0.5) * 40; y -= 6 + r() * 12;
          ctx.quadraticCurveTo(x + (r() - 0.5) * 16, y + 6, x, y);
        }
        ctx.stroke();
      }
      ctx.restore();
    }
  });

  /* 印章 */
  TG.register('deco', {
    id: 'seal', name: '印章', hint: '右侧圆形印章（item.seal 可改文字）',
    draw: function (g) {
      var ctx = g.ctx, item = g.item;
      var cx = W - 48, cy = 80, R = 26;
      var col = item.sealColor || '#c0392b';
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(-0.18);
      ctx.strokeStyle = col;
      ctx.globalAlpha = 0.7;
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(0, 0, R, 0, Math.PI * 2); ctx.stroke();
      ctx.lineWidth = 0.9;
      ctx.beginPath(); ctx.arc(0, 0, R - 4, 0, Math.PI * 2); ctx.stroke();
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.font = '700 11px ' + TG.FONT;
      ctx.fillStyle = col;
      var txt = item.seal || '已归档';
      ctx.fillText(TG.fitText(ctx, txt, R * 2 - 10), 0, -1);
      ctx.font = '600 6px ' + TG.FONT;
      ctx.fillText('CITY ARCHIVE', 0, 11);
      ctx.restore();
    }
  });

  /* 条码 */
  TG.register('deco', {
    id: 'barcode', name: '条码', hint: '右下角条码 + 编号',
    draw: function (g) {
      var ctx = g.ctx, pal = g.pal, r = g.rand;
      var x = W - 96, y = H - 46, h = 16;
      ctx.save();
      ctx.fillStyle = css(pal.base, 0.55);
      for (var i = 0; i < 22; i++) {
        var w = r() > 0.6 ? 2 : 1;
        if (r() > 0.25) ctx.fillRect(x, y, w, h);
        x += w + 1.4;
      }
      ctx.font = '600 7px ' + TG.FONT;
      if ('letterSpacing' in ctx) ctx.letterSpacing = '1.6px';
      ctx.fillStyle = css(pal.base, 0.5);
      ctx.textAlign = 'left'; ctx.textBaseline = 'top';
      var rank = g.item.rank;
      var code = g.item.code || (rank == null || rank === '' ? '---' : '0' + rank);
      var label = code + '-MIRROR';
      ctx.fillText(TG.fitText(ctx, label, 74), W - 96, y + h + 2);
      ctx.restore();
    }
  });

  /* 右侧竖条 */
  TG.register('deco', {
    id: 'strip', name: '侧竖条', hint: '右侧发光竖条',
    draw: function (g) {
      var ctx = g.ctx, pal = g.pal;
      ctx.save();
      ctx.shadowColor = css(pal.base, 0.8); ctx.shadowBlur = 12;
      var gd = ctx.createLinearGradient(0, 16, 0, H - 16);
      gd.addColorStop(0, css(pal.base, 0));
      gd.addColorStop(0.5, css(pal.base, 0.85));
      gd.addColorStop(1, css(pal.base, 0));
      ctx.fillStyle = gd;
      ctx.fillRect(W - 13, 16, 2.2, H - 32);
      ctx.restore();
    }
  });

  /* 底部贴纸标签 */
  TG.register('deco', {
    id: 'chip', name: '身份贴片', hint: '左下角身份贴片（默认取 item.en，可用 item.chip 覆盖）',
    draw: function (g) {
      var ctx = g.ctx, pal = g.pal, L = g.L;
      var txt = g.item.chip || g.item.en;
      if (!txt) return;
      ctx.save();
      ctx.font = '700 8.5px ' + TG.FONT;
      if ('letterSpacing' in ctx) ctx.letterSpacing = '1.6px';
      var available = Math.max(0, W - 52 - TG.rightReserve(g.stack) - 22);
      txt = TG.fitText(ctx, txt, available);
      var w = ctx.measureText(txt).width + 22;
      var x = 26, y = H - 30;
      TG.roundRect(ctx, x, y, w, 16, 8);
      ctx.fillStyle = css(pal.base, 0.14); ctx.fill();
      ctx.strokeStyle = css(pal.base, 0.4); ctx.lineWidth = 0.9; ctx.stroke();
      TG.smallCaps(ctx, txt, x + 11, y + 8.5, 8.5, pal.base, 0.9, 1.6, 'left', 700);
      ctx.restore();
    }
  });
})();
