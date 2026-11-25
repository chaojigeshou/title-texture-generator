/* ============================================================
 * icon2.js — 方形图标改走模块系统
 *   同一个 stack 里的 背景 / 底板 / 边框 / 徽记 模块，换个「取景框」重画成 256×256
 *   载入顺序：icon.js 之后（直接覆盖 TG.makeIcon）
 * ============================================================ */
(function () {
  'use strict';
  var TG = window.TG;
  var SZ = 256;
  TG.ICON_SIZE = SZ;

  var OLD = TG.makeIcon;
  TG.makeIconV1 = OLD;

  function moduleG(ctx, item, stack, S, pal, L, t) {
    return TG.makeG(ctx, { S: S, item: item, pal: pal, L: L, stack: stack, t: t || 0, salt: 3 });
  }

  TG.makeIcon = function (item, stack, scale) {
    scale = scale || 1;
    var cv = TG.newCanvas(SZ * scale, SZ * scale);
    var ctx = cv.getContext('2d');
    ctx.setTransform(scale, 0, 0, scale, 0, 0);
    var pal = TG.palette(item, stack);
    var L = TG.layout(item, stack);
    var cx = SZ / 2, cy = SZ / 2;

    /** 把卡片坐标系映射到图标：以 (bx,by) 为中心放大 k 倍 */
    function focus(bx, by, k) {
      ctx.translate(cx, cy);
      ctx.scale(k, k);
      ctx.translate(-bx, -by);
    }

    var bg = TG.get('bg', stack.bg);
    var plate = TG.get('plate', stack.plate);
    var frame = TG.get('frame', stack.frame);
    var badge = TG.get('badge', stack.badge);

    // 1) 背景：取徽记附近的区域放大
    ctx.save();
    if (bg) {
      focus(54, 80, 1.5);
      bg.draw(moduleG(ctx, item, stack, scale, pal, L, 0));
    } else {
      ctx.fillStyle = 'rgba(9,13,20,0.96)';
      ctx.fillRect(0, 0, SZ, SZ);
    }
    ctx.restore();

    // 2) 底板 + 边框：同一取景框，让牌的圆角/描边自然成为图标的一部分
    ctx.save();
    focus(54, 80, 1.5);
    if (plate) { ctx.globalAlpha = 0.85; plate.draw(moduleG(ctx, item, stack, scale, pal, L, 0)); }
    if (frame) { ctx.globalAlpha = 0.5; frame.draw(moduleG(ctx, item, stack, scale, pal, L, 0)); }
    ctx.globalAlpha = 1;
    ctx.restore();

    // 3) 主题气质层（与卡片同色温）
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    var th = TG.themeOf ? TG.themeOf(stack) : null;
    if (th && th.id !== 'default') {
      var rg = ctx.createRadialGradient(cx, cy, 8, cx, cy, SZ * 0.62);
      rg.addColorStop(0, TG.css(th.accent, 0.10));
      rg.addColorStop(1, TG.css(th.accent, 0));
      ctx.fillStyle = rg; ctx.fillRect(0, 0, SZ, SZ);
    }
    ctx.restore();

    // 4) 徽记：放大到图标中心
    ctx.save();
    focus(54, 80, 2.15);
    if (badge && badge.id !== 'none') {
      badge.draw(moduleG(ctx, item, stack, scale, pal, L, 0));
    } else {
      var mark = item.mark || String(item.main || '?').slice(0, 1);
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.font = '700 56px ' + TG.FONT;
      ctx.shadowColor = TG.css(pal.base, 0.85); ctx.shadowBlur = 22;
      ctx.fillStyle = TG.css(TG.mixArr(pal.base, '#ffffff', 0.55), 0.98);
      ctx.fillText(mark, 54, 80);
    }
    ctx.restore();

    // 5) 外环 + 内环 + 角标
    ctx.save();
    ctx.beginPath(); ctx.arc(cx, cy, SZ * 0.42, 0, Math.PI * 2);
    ctx.strokeStyle = TG.css(pal.base, 0.55); ctx.lineWidth = 1.6; ctx.stroke();
    ctx.beginPath(); ctx.arc(cx, cy, SZ * 0.38, 0, Math.PI * 2);
    ctx.strokeStyle = TG.css(pal.base, 0.20); ctx.lineWidth = 1; ctx.stroke();
    // 四角刻度
    for (var i = 0; i < 4; i++) {
      var a = -Math.PI / 2 + i * Math.PI / 2;
      ctx.beginPath();
      ctx.moveTo(cx + Math.cos(a) * SZ * 0.42, cy + Math.sin(a) * SZ * 0.42);
      ctx.lineTo(cx + Math.cos(a) * SZ * 0.46, cy + Math.sin(a) * SZ * 0.46);
      ctx.strokeStyle = TG.css(pal.base, 0.7); ctx.lineWidth = 2; ctx.stroke();
    }
    // 底部标签
    var label = (item.suffix || '').slice(0, 4);
    if (label) {
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.font = '700 11px ' + TG.FONT;
      if ('letterSpacing' in ctx) ctx.letterSpacing = '2px';
      ctx.fillStyle = 'rgba(6,10,16,0.6)';
      TG.roundRect(ctx, cx - 34, SZ - 34, 68, 17, 8); ctx.fill();
      ctx.fillStyle = TG.css(TG.mixArr(pal.base, '#ffffff', 0.45), 0.95);
      ctx.fillText(label, cx, SZ - 25);
    }
    // 顶部编号
    if (item.en) {
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.font = '700 8px ' + TG.FONT;
      if ('letterSpacing' in ctx) ctx.letterSpacing = '1.6px';
      ctx.fillStyle = TG.css(pal.base, 0.55);
      ctx.fillText(String(item.en).slice(0, 12), cx, 26);
    }
    ctx.restore();

    // 6) 暗角
    ctx.save();
    var vg = ctx.createRadialGradient(cx, cy, SZ * 0.3, cx, cy, SZ * 0.72);
    vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,0.45)');
    ctx.fillStyle = vg; ctx.fillRect(0, 0, SZ, SZ);
    ctx.restore();

    return cv;
  };
})();
