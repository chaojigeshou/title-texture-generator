/* ============================================================
 * mod-badge.js — 徽记模块（5 种）
 * 卡片左侧的身份标记：item.mark（1~2 字）或首字。
 * ============================================================ */
(function () {
  'use strict';
  var TG = window.TG, W = TG.W, H = TG.H;
  var css = TG.css, mix = TG.mix;

  function markOf(item) {
    if (item.mark) return item.mark;
    var chars = TG.graphemes(item.main || '?');
    return chars.length > 2 ? chars[0] : chars.join('');
  }
  function subOf(item) { return item.markSub || '阶'; }

  /* 六边形阶徽 */
  TG.register('badge', {
    id: 'hex', name: '六边阶徽', hint: '六边形 + 汉字 + 小字，适用于阶位档案',
    draw: function (g) {
      var ctx = g.ctx, pal = g.pal, item = g.item;
      var cx = 54, cy = 80, R = 27;
      ctx.save();
      ctx.shadowColor = css(pal.base, 0.7); ctx.shadowBlur = 18;
      TG.hexPath(ctx, cx, cy, R, 6);
      var gd = ctx.createLinearGradient(cx, cy - R, cx, cy + R);
      gd.addColorStop(0, mix(pal.base, '#ffffff', 0.30));
      gd.addColorStop(0.5, mix(pal.base, '#04070d', 0.32));
      gd.addColorStop(1, mix(pal.base, '#04070d', 0.62));
      ctx.fillStyle = gd; ctx.fill();
      ctx.restore();

      ctx.save();
      TG.hexPath(ctx, cx, cy, R, 6);
      ctx.strokeStyle = css(pal.base, 0.85); ctx.lineWidth = 1.5; ctx.stroke();

      var mark = markOf(item);
      var size = TG.graphemes(mark).length > 1 ? 19 : 23;
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.font = '700 ' + size + 'px ' + TG.FONT;
      ctx.shadowColor = 'rgba(0,0,0,0.7)'; ctx.shadowBlur = 6;
      var tg = ctx.createLinearGradient(cx, cy - 14, cx, cy + 10);
      tg.addColorStop(0, '#ffffff');
      tg.addColorStop(1, mix(pal.base, '#ffffff', 0.3));
      ctx.fillStyle = tg;
      ctx.fillText(TG.fitLabel(ctx, mark, 42, 12), cx, cy - 4);

      ctx.shadowBlur = 0;
      ctx.font = '700 9px ' + TG.FONT;
      if ('letterSpacing' in ctx) ctx.letterSpacing = '1px';
      ctx.fillStyle = css(pal.base, 0.7);
      ctx.fillText(TG.fitText(ctx, subOf(item), 40), cx, cy + 14);
      ctx.restore();
    }
  });

  /* 圆章：双环 + 中心字 + 弧线刻度 */
  TG.register('badge', {
    id: 'medallion', name: '圆章', hint: '双环圆章 + 刻度弧，色彩级/徽章风',
    draw: function (g) {
      var ctx = g.ctx, pal = g.pal, item = g.item;
      var cx = 54, cy = 80, R = 26;
      ctx.save();
      ctx.shadowColor = css(pal.base, 0.7); ctx.shadowBlur = 16;
      var gd = ctx.createRadialGradient(cx - 6, cy - 8, 4, cx, cy, R);
      gd.addColorStop(0, mix(pal.base, '#04070d', 0.22));
      gd.addColorStop(1, mix(pal.base, '#04070d', 0.78));
      ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2);
      ctx.fillStyle = gd; ctx.fill();
      ctx.restore();

      ctx.save();
      ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2);
      ctx.strokeStyle = css(pal.base, 0.9); ctx.lineWidth = 1.6; ctx.stroke();
      ctx.beginPath(); ctx.arc(cx, cy, R - 5, 0, Math.PI * 2);
      ctx.strokeStyle = css(pal.base, 0.35); ctx.lineWidth = 0.9; ctx.stroke();
      // 刻度
      for (var i = 0; i < 24; i++) {
        var a = i * Math.PI * 2 / 24;
        var r1 = R - 3.2, r2 = R - (i % 6 === 0 ? 6.5 : 4.6);
        ctx.beginPath();
        ctx.moveTo(cx + Math.cos(a) * r1, cy + Math.sin(a) * r1);
        ctx.lineTo(cx + Math.cos(a) * r2, cy + Math.sin(a) * r2);
        ctx.strokeStyle = css(pal.base, i % 6 === 0 ? 0.5 : 0.25);
        ctx.lineWidth = 1;
        ctx.stroke();
      }
      var mark = markOf(item);
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.font = '700 ' + (TG.graphemes(mark).length > 1 ? 18 : 22) + 'px ' + TG.FONT;
      var tg = ctx.createLinearGradient(cx, cy - 12, cx, cy + 12);
      tg.addColorStop(0, '#ffffff');
      tg.addColorStop(1, mix(pal.base, '#ffffff', 0.25));
      ctx.fillStyle = tg;
      ctx.fillText(TG.fitLabel(ctx, mark, 38, 12), cx, cy + 1);
      ctx.restore();
    }
  });

  /* 编号方块 */
  TG.register('badge', {
    id: 'square', name: '编号方块', hint: '方形编号牌，协议/管制风',
    draw: function (g) {
      var ctx = g.ctx, pal = g.pal, item = g.item;
      var x = 26, y = 54, w = 56, h = 52;
      ctx.save();
      ctx.shadowColor = css(pal.base, 0.45); ctx.shadowBlur = 14;
      TG.roundRect(ctx, x, y, w, h, 6);
      var gd = ctx.createLinearGradient(x, y, x + w, y + h);
      gd.addColorStop(0, 'rgba(18,26,40,0.96)');
      gd.addColorStop(1, 'rgba(8,12,20,0.96)');
      ctx.fillStyle = gd; ctx.fill();
      ctx.restore();

      ctx.save();
      TG.roundRect(ctx, x + 0.6, y + 0.6, w - 1.2, h - 1.2, 6);
      ctx.strokeStyle = css(pal.base, 0.75); ctx.lineWidth = 1.3; ctx.stroke();
      // 顶部小条
      ctx.fillStyle = css(pal.base, 0.7);
      ctx.fillRect(x + 8, y + 7, w - 16, 2);
      var mark = markOf(item);
      var count = TG.graphemes(mark).length;
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.font = '700 ' + (count >= 3 ? 13 : count === 2 ? 16 : 21) + 'px ' + TG.FONT;
      ctx.fillStyle = '#ffffff';
      ctx.fillText(TG.fitLabel(ctx, mark, w - 12, 10), x + w / 2, y + h / 2 + 2);
      if (item.code) {
        ctx.font = '600 8px ' + TG.FONT;
        if ('letterSpacing' in ctx) ctx.letterSpacing = '1.2px';
        ctx.fillStyle = css(pal.base, 0.75);
        ctx.fillText(TG.fitText(ctx, item.code, w - 12), x + w / 2, y + h - 9);
      }
      ctx.restore();
    }
  });

  /* 吊牌：圆角竖牌 + 孔 */
  TG.register('badge', {
    id: 'tag', name: '吊牌', hint: '竖排吊牌，标签/工牌风',
    draw: function (g) {
      var ctx = g.ctx, pal = g.pal, item = g.item;
      var x = 30, y = 40, w = 44, h = 80;
      ctx.save();
      ctx.shadowColor = 'rgba(0,0,0,0.5)'; ctx.shadowBlur = 12;
      TG.roundRect(ctx, x, y, w, h, 8);
      var gd = ctx.createLinearGradient(x, y, x + w, y + h);
      gd.addColorStop(0, 'rgba(22,30,44,0.95)');
      gd.addColorStop(1, 'rgba(9,14,22,0.95)');
      ctx.fillStyle = gd; ctx.fill();
      ctx.restore();

      ctx.save();
      TG.roundRect(ctx, x + 0.6, y + 0.6, w - 1.2, h - 1.2, 8);
      ctx.strokeStyle = css(pal.base, 0.6); ctx.lineWidth = 1.1; ctx.stroke();
      // 挂孔
      ctx.beginPath(); ctx.arc(x + w / 2, y + 10, 3, 0, Math.PI * 2);
      ctx.strokeStyle = css(pal.base, 0.55); ctx.lineWidth = 1.2; ctx.stroke();
      // 竖排字保持完整 emoji；长标记仅省略显示，不修改保存的文字。
      var mark = markOf(item);
      var chars = TG.graphemes(mark);
      if (chars.length > 5) chars = chars.slice(0, 4).concat('…');
      var fs = chars.length >= 5 ? 10 : chars.length >= 3 ? 12 : 17;
      var step = chars.length >= 5 ? 11 : chars.length >= 3 ? 15 : 20;
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.font = '700 ' + fs + 'px ' + TG.FONT;
      ctx.fillStyle = '#eef4ff';
      var startY = y + h / 2 - (chars.length - 1) * (step / 2) + 4;
      chars.forEach(function (ch, i) { ctx.fillText(TG.fitText(ctx, ch, w - 12), x + w / 2, startY + i * step); });
      ctx.restore();
    }
  });

  /* 无徽记：标题区域左移，画面更满 */
  TG.register('badge', {
    id: 'none', name: '无徽记', hint: '不放徽记，标题自动左移居中',
    draw: function () {}
  });
})();
