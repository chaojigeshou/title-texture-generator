/* ============================================================
 * mod-structures.js — 物件结构模块
 *   4 底板 / 3 徽记 / 3 静态装饰。以轮廓、分件与负空间区分。
 *   content 为正文安全坐标；reserveRight 为右侧装饰占位。
 *   所有物件均为原创视觉构件，不表示作品中的官方资产。
 * ============================================================ */
(function () {
  'use strict';
  var TG = window.TG;
  var css = TG.css, mix = TG.mix;

  function poly(ctx, points) {
    ctx.beginPath();
    points.forEach(function (p, i) { if (i) ctx.lineTo(p[0], p[1]); else ctx.moveTo(p[0], p[1]); });
    ctx.closePath();
  }

  function gradient(ctx, x0, y0, x1, y1, stops) {
    var gd = ctx.createLinearGradient(x0, y0, x1, y1);
    stops.forEach(function (stop) { gd.addColorStop(stop[0], stop[1]); });
    return gd;
  }

  function field(g, key, fallback) {
    var value = g.item && g.item[key];
    return value == null || value === '' ? fallback : String(value);
  }

  function label(ctx, text, x, y, width, size, color, minSize) {
    ctx.save();
    ctx.font = '700 ' + size + 'px ' + TG.FONT;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    if ('letterSpacing' in ctx) ctx.letterSpacing = '0px';
    ctx.fillStyle = color;
    ctx.fillText(TG.fitLabel(ctx, text, width, minSize === undefined ? size : minSize), x, y);
    ctx.restore();
  }

  /* ---------------- 底板：轮廓就是物件 ---------------- */

  var TICKET_CONTENT = { left: 32, right: 426, top: 34, bottom: 132 };
  var SCROLL_CONTENT = { left: 50, right: 510, top: 37, bottom: 132 };

  function ticketPath(ctx) {
    ctx.beginPath(); ctx.moveTo(22, 18);
    for (var x = 22; x < 538; x += 12) {
      ctx.lineTo(x + 6, 21); ctx.lineTo(Math.min(x + 12, 538), 18);
    }
    ctx.lineTo(550, 30); ctx.lineTo(550, 68);
    ctx.arc(550, 80, 12, -Math.PI / 2, Math.PI / 2, true);
    ctx.lineTo(550, 130); ctx.lineTo(538, 142);
    for (var bx = 538; bx > 22; bx -= 12) {
      ctx.lineTo(bx - 6, 139); ctx.lineTo(Math.max(bx - 12, 22), 142);
    }
    ctx.lineTo(10, 130); ctx.lineTo(10, 92);
    ctx.arc(10, 80, 12, Math.PI / 2, -Math.PI / 2, true);
    ctx.lineTo(10, 30); ctx.closePath();
  }

  TG.register('plate', {
    id: 'ticket', name: '齿口票券', collection: 'distinct',
    hint: '检票凹口、齿边与独立右票根；主文案避开撕线与票根',
    params: [{ key: 'stubWidth', label: '票根宽度', min: 80, max: 150, step: 2, default: 110, unit: 'px',
      hint: '改变右侧票根与撕线位置，正文同步避让。' }],
    content: TICKET_CONTENT, sharp: true,
    contentFor: function (params) {
      if (params.stubWidth === 110) return TICKET_CONTENT;
      return { left: 32, right: 536 - params.stubWidth, top: 34, bottom: 132 };
    },
    draw: function (g) {
      var ctx = g.ctx, pal = g.pal;
      var width = TG.moduleParams.values(g.stack, 'plate', 'ticket').stubWidth;
      var changed = width !== 110, seam = changed ? 550 - width : 440;
      var center = changed ? 494 - (width - 110) / 2 : 494;
      ctx.save();
      ctx.save(); ctx.translate(1, 3); ticketPath(ctx);
      ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.fill(); ctx.restore();
      ticketPath(ctx);
      ctx.fillStyle = gradient(ctx, 0, 18, 0, 142, [[0, '#303942'], [0.5, '#242c34'], [1, '#19212a']]);
      ctx.fill();
      ctx.save(); ticketPath(ctx); ctx.clip();
      ctx.fillStyle = '#c8bea7'; ctx.fillRect(seam, 18, width, 124);
      ctx.fillStyle = 'rgba(255,255,255,0.05)'; ctx.fillRect(26, 27, changed ? 512 - width : 402, 5);
      ctx.fillStyle = 'rgba(0,0,0,0.12)'; ctx.fillRect(changed ? seam + 1 : 441, 18, 5, 124);
      ctx.strokeStyle = 'rgba(236,229,209,0.48)'; ctx.lineWidth = 1;
      ctx.setLineDash([3, 4]); ctx.beginPath(); ctx.moveTo(seam, 25); ctx.lineTo(seam, 135); ctx.stroke();
      ctx.setLineDash([]);
      ctx.strokeStyle = 'rgba(40,42,40,0.35)'; ctx.beginPath();
      ctx.moveTo(changed ? seam + 19 : 459, 48); ctx.lineTo(533, 48);
      ctx.moveTo(changed ? seam + 19 : 459, 108); ctx.lineTo(533, 108); ctx.stroke();
      label(ctx, 'TICKET', center, 37, changed ? width - 34 : 76, 9, '#3b3e3d');
      label(ctx, field(g, 'code', '--'), center, 77, changed ? width - 32 : 78, 18, '#252b30', 10);
      label(ctx, 'DETACH', center, 122, changed ? width - 34 : 76, 7, '#51514b');
      ctx.restore();
      ticketPath(ctx); ctx.strokeStyle = mix(pal.base, '#ced5dc', 0.74); ctx.lineWidth = 1.1; ctx.stroke();
      ctx.restore();
    }
  });

  function folderPath(ctx) {
    ctx.beginPath(); ctx.moveTo(10, 34); ctx.lineTo(10, 18);
    ctx.quadraticCurveTo(10, 8, 22, 8); ctx.lineTo(134, 8);
    ctx.quadraticCurveTo(140, 8, 144, 14); ctx.lineTo(156, 30);
    ctx.lineTo(538, 30); ctx.quadraticCurveTo(550, 30, 550, 42);
    ctx.lineTo(550, 140); ctx.quadraticCurveTo(550, 150, 540, 150);
    ctx.lineTo(20, 150); ctx.quadraticCurveTo(10, 150, 10, 140); ctx.closePath();
  }

  TG.register('plate', {
    id: 'folder', name: '分类文件夹', collection: 'distinct',
    hint: '凸起分类页签、错层纸页和厚书脊；正文保留在前盖内',
    content: { left: 46, right: 530, top: 39, bottom: 133 }, sharp: true,
    draw: function (g) {
      var ctx = g.ctx, pal = g.pal;
      ctx.save();
      poly(ctx, [[25, 23], [546, 20], [546, 143], [20, 146]]);
      ctx.fillStyle = '#a4a49a'; ctx.fill();
      ctx.strokeStyle = '#d2d0c4'; ctx.lineWidth = 1; ctx.stroke();
      [59, 96].forEach(function (y, i) {
        TG.roundRect(ctx, 537, y, 17, 20, 3);
        ctx.fillStyle = i ? '#5e686f' : '#9a907a'; ctx.fill();
        ctx.strokeStyle = 'rgba(221,223,217,0.4)'; ctx.stroke();
      });
      folderPath(ctx);
      ctx.fillStyle = gradient(ctx, 0, 8, 0, 150, [[0, '#73654e'], [0.17, '#4c4437'], [0.18, '#38352e'], [1, '#242720']]);
      ctx.fill(); ctx.strokeStyle = '#a39b85'; ctx.lineWidth = 1.2; ctx.stroke();
      ctx.save(); folderPath(ctx); ctx.clip();
      ctx.fillStyle = 'rgba(0,0,0,0.25)'; ctx.fillRect(17, 35, 13, 104);
      ctx.fillStyle = 'rgba(225,217,193,0.17)'; ctx.fillRect(30, 37, 2, 100);
      ctx.strokeStyle = 'rgba(223,215,193,0.30)'; ctx.lineWidth = 0.9;
      ctx.beginPath(); ctx.moveTo(39, 35); ctx.lineTo(535, 35); ctx.stroke();
      [141, 144].forEach(function (y) {
        ctx.strokeStyle = 'rgba(213,210,189,0.28)';
        ctx.beginPath(); ctx.moveTo(38, y); ctx.lineTo(534, y); ctx.stroke();
      });
      ctx.fillStyle = css(pal.base, 0.28); ctx.fillRect(44, 16, 3, 8);
      label(ctx, field(g, 'code', 'INDEX'), 94, 20, 84, 9, '#e7e1d1');
      ctx.restore();
      ctx.restore();
    }
  });

  TG.register('plate', {
    id: 'banner', name: '折带横幅', collection: 'distinct',
    hint: '双燕尾、折回背面与中央带面三层叠合；四角留空',
    content: { left: 62, right: 498, top: 42, bottom: 124 }, sharp: true,
    draw: function (g) {
      var ctx = g.ctx, pal = g.pal;
      ctx.save();
      var tail = gradient(ctx, 0, 44, 0, 143, [[0, '#58616c'], [0.5, '#323c46'], [1, '#1c242e']]);
      poly(ctx, [[6, 44], [80, 44], [80, 143], [6, 143], [24, 95]]);
      ctx.fillStyle = tail; ctx.fill(); ctx.strokeStyle = '#818b96'; ctx.lineWidth = 1; ctx.stroke();
      poly(ctx, [[480, 44], [554, 44], [536, 95], [554, 143], [480, 143]]);
      ctx.fillStyle = tail; ctx.fill(); ctx.stroke();
      poly(ctx, [[46, 130], [80, 130], [80, 143]]);
      ctx.fillStyle = '#0b111a'; ctx.fill();
      poly(ctx, [[514, 130], [480, 143], [480, 130]]); ctx.fill();
      TG.roundRect(ctx, 46, 28, 468, 102, 2);
      ctx.fillStyle = gradient(ctx, 0, 28, 0, 130, [[0, mix(pal.base, '#37424c', 0.83)], [0.18, '#303a45'], [1, '#1b2531']]);
      ctx.fill(); ctx.strokeStyle = '#bbc2ca'; ctx.lineWidth = 1.2; ctx.stroke();
      ctx.strokeStyle = css(pal.base, 0.35); ctx.lineWidth = 0.8;
      ctx.beginPath(); ctx.moveTo(55, 35); ctx.lineTo(505, 35);
      ctx.moveTo(55, 123); ctx.lineTo(505, 123); ctx.stroke();
      ctx.strokeStyle = 'rgba(245,248,255,0.18)';
      ctx.beginPath(); ctx.moveTo(47, 31); ctx.lineTo(47, 127);
      ctx.moveTo(513, 31); ctx.lineTo(513, 127); ctx.stroke();
      ctx.restore();
    }
  });

  function scrollPaper(ctx, delta) {
    if (delta) {
      var left = 37 + delta, right = 523 - delta;
      ctx.beginPath(); ctx.moveTo(left, 25);
      ctx.bezierCurveTo(150, 31, 407, 21, right, 25);
      ctx.lineTo(right, 139); ctx.bezierCurveTo(398, 134, 161, 144, left, 139);
      ctx.bezierCurveTo(45 + delta, 110, 44 + delta, 54, left, 25); ctx.closePath();
      return;
    }
    // 默认值使用原路径和原运算顺序，避免旧版像素发生变化。
    ctx.beginPath(); ctx.moveTo(37, 25);
    ctx.bezierCurveTo(150, 31, 407, 21, 523, 25);
    ctx.lineTo(523, 139); ctx.bezierCurveTo(398, 134, 161, 144, 37, 139);
    ctx.bezierCurveTo(45, 110, 44, 54, 37, 25); ctx.closePath();
  }

  function roller(ctx, x, width) {
    if (width !== undefined && width !== 16) {
      var radius = width / 2, cap = radius + 5;
      TG.roundRect(ctx, x - radius, 20, width, 124, Math.min(4, width / 4));
      ctx.fillStyle = gradient(ctx, x - radius, 0, x + radius, 0, [[0, '#30383e'], [0.3, '#b6bfc3'], [0.55, '#e1e3da'], [1, '#404b50']]);
      ctx.fill(); ctx.strokeStyle = '#b1b9bb'; ctx.lineWidth = 0.8; ctx.stroke();
      [20, 143].forEach(function (y) {
        TG.roundRect(ctx, x - cap, y - 4, width + 10, 8, 3);
        ctx.fillStyle = '#525e63'; ctx.fill();
        ctx.strokeStyle = '#c4cac7'; ctx.lineWidth = 1; ctx.stroke();
        ctx.beginPath(); ctx.moveTo(x - cap + 3, y - 1); ctx.lineTo(x + cap - 3, y - 1);
        ctx.strokeStyle = 'rgba(245,244,223,0.50)'; ctx.stroke();
      });
      return;
    }
    TG.roundRect(ctx, x - 8, 20, 16, 124, 4);
    ctx.fillStyle = gradient(ctx, x - 8, 0, x + 8, 0, [[0, '#30383e'], [0.3, '#b6bfc3'], [0.55, '#e1e3da'], [1, '#404b50']]);
    ctx.fill(); ctx.strokeStyle = '#b1b9bb'; ctx.lineWidth = 0.8; ctx.stroke();
    [20, 143].forEach(function (y) {
      TG.roundRect(ctx, x - 13, y - 4, 26, 8, 3);
      ctx.fillStyle = '#525e63'; ctx.fill();
      ctx.strokeStyle = '#c4cac7'; ctx.lineWidth = 1; ctx.stroke();
      ctx.beginPath(); ctx.moveTo(x - 10, y - 1); ctx.lineTo(x + 10, y - 1);
      ctx.strokeStyle = 'rgba(245,244,223,0.50)'; ctx.stroke();
    });
  }

  TG.register('plate', {
    id: 'scroll', name: '双轴卷幅', collection: 'distinct',
    hint: '两端实体卷轴与卷入纸幅；正文避开圆柱和轴头',
    params: [{ key: 'rollerWidth', label: '卷轴粗细', min: 10, max: 28, step: 2, default: 16, unit: 'px',
      hint: '同时改变圆柱、轴头和卷入纸边，正文同步避让。' }],
    content: SCROLL_CONTENT, sharp: true,
    contentFor: function (params) {
      if (params.rollerWidth === 16) return SCROLL_CONTENT;
      var delta = (params.rollerWidth - 16) / 2;
      return { left: 50 + delta, right: 510 - delta, top: 37, bottom: 132 };
    },
    draw: function (g) {
      var ctx = g.ctx;
      var width = TG.moduleParams.values(g.stack, 'plate', 'scroll').rollerWidth;
      var changed = width !== 16, delta = changed ? (width - 16) / 2 : 0;
      var paperLeft = changed ? 37 + delta : 37, paperRight = changed ? 523 - delta : 523;
      ctx.save();
      ctx.save(); ctx.translate(0, 3); scrollPaper(ctx, delta);
      ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.fill(); ctx.restore();
      scrollPaper(ctx, delta);
      ctx.fillStyle = gradient(ctx, 0, 25, 0, 140, [[0, '#5d594b'], [0.12, '#393a32'], [0.87, '#2d302a'], [1, '#5c5849']]);
      ctx.fill(); ctx.strokeStyle = '#aaa68e'; ctx.lineWidth = 1; ctx.stroke();
      ctx.save(); scrollPaper(ctx, delta); ctx.clip();
      ctx.fillStyle = gradient(ctx, paperLeft, 0, changed ? 58 + delta : 58, 0, [[0, '#a4a28c'], [0.45, '#797d69'], [1, 'rgba(89,93,75,0)']]);
      ctx.fillRect(paperLeft, 25, 21, 115);
      ctx.fillStyle = gradient(ctx, changed ? 502 - delta : 502, 0, paperRight, 0, [[0, 'rgba(89,93,75,0)'], [0.55, '#797d69'], [1, '#a4a28c']]);
      ctx.fillRect(changed ? 502 - delta : 502, 25, 21, 115);
      ctx.strokeStyle = 'rgba(219,216,188,0.17)'; ctx.lineWidth = 0.7;
      [32, 134].forEach(function (y) {
        ctx.beginPath(); ctx.moveTo(changed ? 54 + delta : 54, y);
        ctx.bezierCurveTo(190, y + 2, 370, y - 2, changed ? 506 - delta : 506, y); ctx.stroke();
      });
      ctx.restore();
      if (changed) { roller(ctx, 30, width); roller(ctx, 530, width); }
      else { roller(ctx, 30); roller(ctx, 530); }
      ctx.restore();
    }
  });

  /* ---------------- 徽记：保留 (54,80) 的本地中心 ---------------- */

  function reel(ctx, x, y) {
    ctx.beginPath(); ctx.arc(x, y, 10, 0, Math.PI * 2);
    ctx.fillStyle = '#899499'; ctx.fill(); ctx.strokeStyle = '#c3cbd0'; ctx.lineWidth = 1; ctx.stroke();
    ctx.beginPath(); ctx.arc(x, y, 6.3, 0, Math.PI * 2);
    ctx.fillStyle = '#243039'; ctx.fill();
    for (var i = 0; i < 3; i++) {
      var a = -Math.PI / 2 + i * Math.PI * 2 / 3;
      ctx.beginPath(); ctx.arc(x + Math.cos(a) * 4, y + Math.sin(a) * 4, 1.6, 0, Math.PI * 2);
      ctx.fillStyle = '#c6cece'; ctx.fill();
    }
    ctx.beginPath(); ctx.arc(x, y, 1.8, 0, Math.PI * 2);
    ctx.fillStyle = '#161e26'; ctx.fill();
  }

  TG.register('badge', {
    id: 'cassette', name: '双轴磁带', collection: 'distinct',
    hint: '横向磁带壳、双卷盘和梯形走带口；标记位于上沿标签',
    draw: function (g) {
      var ctx = g.ctx, pal = g.pal;
      ctx.save();
      TG.roundRect(ctx, 17, 49, 74, 61, 6);
      ctx.fillStyle = gradient(ctx, 0, 49, 0, 110, [[0, '#68727c'], [0.18, '#4a5660'], [1, '#222d37']]);
      ctx.fill(); ctx.strokeStyle = '#bac3c8'; ctx.lineWidth = 1.2; ctx.stroke();
      TG.roundRect(ctx, 25, 54, 58, 11, 2);
      ctx.fillStyle = '#c3c3b3'; ctx.fill();
      label(ctx, field(g, 'mark', 'REC'), 54, 59.5, 49, 8, '#252f35');
      TG.roundRect(ctx, 24, 67, 60, 25, 5);
      ctx.fillStyle = '#111a24'; ctx.fill(); ctx.strokeStyle = '#74838d'; ctx.lineWidth = 0.8; ctx.stroke();
      ctx.fillStyle = mix(pal.base, '#7e7f73', 0.72); ctx.fillRect(37, 71, 34, 3); ctx.fillRect(37, 84, 34, 3);
      reel(ctx, 38, 79.5); reel(ctx, 70, 79.5);
      poly(ctx, [[32, 96], [76, 96], [82, 107], [26, 107]]);
      ctx.fillStyle = '#19232c'; ctx.fill(); ctx.strokeStyle = '#77838a'; ctx.stroke();
      [34, 74].forEach(function (x) {
        ctx.beginPath(); ctx.arc(x, 102, 2, 0, Math.PI * 2); ctx.fillStyle = '#adb7b9'; ctx.fill();
      });
      ctx.fillStyle = '#626c73'; ctx.fillRect(45, 100, 18, 3);
      [[22, 55], [86, 55], [22, 104], [86, 104]].forEach(function (p) {
        ctx.beginPath(); ctx.arc(p[0], p[1], 1.6, 0, Math.PI * 2); ctx.fillStyle = '#1b252e'; ctx.fill();
        ctx.strokeStyle = '#7b858a'; ctx.lineWidth = 0.6;
        ctx.beginPath(); ctx.moveTo(p[0] - 1, p[1]); ctx.lineTo(p[0] + 1, p[1]); ctx.stroke();
      });
      ctx.restore();
    }
  });

  function bottlePath(ctx) {
    ctx.beginPath(); ctx.moveTo(44, 39); ctx.lineTo(64, 39); ctx.lineTo(64, 48);
    ctx.bezierCurveTo(64, 54, 74, 53, 74, 63); ctx.lineTo(74, 112);
    ctx.quadraticCurveTo(74, 124, 63, 124); ctx.lineTo(45, 124);
    ctx.quadraticCurveTo(34, 124, 34, 112); ctx.lineTo(34, 63);
    ctx.bezierCurveTo(34, 53, 44, 54, 44, 48); ctx.closePath();
  }

  TG.register('badge', {
    id: 'ampoule', name: '标本安瓿', collection: 'distinct',
    hint: '瓶盖、细颈、玻璃瓶身与独立液面；标记收在瓶身标签内',
    params: [{ key: 'liquidDepth', label: '液面高度', min: 14, max: 56, step: 2, default: 40, unit: 'px',
      hint: '改变瓶内液量；液面、渐变与气泡一起移动，瓶体尺寸保持不变。' }],
    draw: function (g) {
      var ctx = g.ctx, pal = g.pal;
      var depth = TG.moduleParams.values(g.stack, 'badge', 'ampoule').liquidDepth;
      var changed = depth !== 40, surface = changed ? 124 - depth : 84;
      ctx.save();
      bottlePath(ctx);
      ctx.fillStyle = 'rgba(142,169,179,0.19)'; ctx.fill();
      ctx.strokeStyle = '#a9c0c7'; ctx.lineWidth = 1.3; ctx.stroke();
      ctx.save(); bottlePath(ctx); ctx.clip();
      ctx.fillStyle = gradient(ctx, 0, changed ? surface - 1 : 83, 0, 124, [[0, mix(pal.base, '#a9c4c3', 0.3)], [0.08, mix(pal.base, '#23535e', 0.55)], [1, '#16313c']]);
      ctx.fillRect(34, surface, 40, changed ? depth + 1 : 41);
      ctx.beginPath(); ctx.ellipse(54, surface, 19, 3, 0, 0, Math.PI * 2);
      ctx.fillStyle = css(pal.base, 0.55); ctx.fill();
      ctx.strokeStyle = 'rgba(219,243,241,0.66)'; ctx.lineWidth = 0.8; ctx.stroke();
      [[61, 100, 2.1], [46, 111, 1.4], [62, 116, 1.1]].forEach(function (p) {
        var y = changed ? surface + (p[1] - 84) * depth / 40 : p[1];
        ctx.beginPath(); ctx.arc(p[0], y, p[2], 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(221,241,239,0.48)'; ctx.stroke();
      });
      ctx.fillStyle = 'rgba(230,247,249,0.2)'; ctx.fillRect(38, 54, 3, 58);
      ctx.restore();
      TG.roundRect(ctx, 39, 63, 30, 17, 1);
      ctx.fillStyle = '#c7cdc5'; ctx.fill();
      label(ctx, field(g, 'mark', '--'), 54, 71.5, 25, 10, '#24323a', 8);
      TG.roundRect(ctx, 40, 27, 28, 13, 3);
      ctx.fillStyle = gradient(ctx, 40, 0, 68, 0, [[0, '#38444e'], [0.35, '#b4c0c5'], [0.65, '#87969c'], [1, '#303d46']]);
      ctx.fill(); ctx.strokeStyle = '#c3ced1'; ctx.lineWidth = 0.8; ctx.stroke();
      ctx.strokeStyle = 'rgba(18,35,43,0.6)';
      for (var x = 44; x <= 64; x += 5) {
        ctx.beginPath(); ctx.moveTo(x, 29); ctx.lineTo(x, 38); ctx.stroke();
      }
      ctx.strokeStyle = 'rgba(240,250,251,0.6)'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(39, 60); ctx.lineTo(39, 110); ctx.quadraticCurveTo(39, 117, 44, 118); ctx.stroke();
      ctx.restore();
    }
  });

  TG.register('badge', {
    id: 'microchip', name: '针脚芯片', collection: 'distinct',
    hint: '四侧离散金属针脚、封装定位缺口和中央晶片；保留针脚间空隙',
    params: [{ key: 'pinCount', label: '每侧针脚', min: 3, max: 7, step: 1, default: 5, unit: '根',
      hint: '四侧针脚在原有边界内重新分布，针脚之间保留空隙。' }],
    draw: function (g) {
      var ctx = g.ctx, pal = g.pal;
      var count = TG.moduleParams.values(g.stack, 'badge', 'microchip').pinCount;
      ctx.save();
      for (var i = 0; i < count; i++) {
        var p = count === 5 ? 38 + i * 8 : 38 + i * 32 / (count - 1);
        var q = count === 5 ? 64 + i * 8 : 64 + i * 32 / (count - 1);
        ctx.fillStyle = '#939fa5';
        ctx.fillRect(p - 2, 48, 4, 12); ctx.fillRect(p - 2, 100, 4, 12);
        ctx.fillRect(20, q - 2, 14, 4); ctx.fillRect(74, q - 2, 14, 4);
        ctx.fillStyle = '#d3d8d6';
        ctx.fillRect(p - 1, 48, 1, 10); ctx.fillRect(p - 1, 102, 1, 10);
        ctx.fillRect(20, q - 1, 12, 1); ctx.fillRect(76, q - 1, 12, 1);
      }
      ctx.beginPath(); ctx.moveTo(36, 58); ctx.lineTo(48, 58);
      ctx.arc(54, 58, 6, Math.PI, 0, true); ctx.lineTo(72, 58);
      ctx.lineTo(76, 62); ctx.lineTo(76, 98); ctx.lineTo(72, 102);
      ctx.lineTo(36, 102); ctx.lineTo(32, 98); ctx.lineTo(32, 62); ctx.closePath();
      ctx.fillStyle = gradient(ctx, 32, 58, 76, 102, [[0, '#3b4650'], [0.4, '#202c36'], [1, '#101b25']]);
      ctx.fill(); ctx.strokeStyle = '#8c9aa5'; ctx.lineWidth = 1.2; ctx.stroke();
      TG.roundRect(ctx, 39, 69, 30, 23, 1);
      ctx.fillStyle = mix(pal.base, '#273846', 0.8); ctx.fill();
      ctx.strokeStyle = css(pal.base, 0.65); ctx.lineWidth = 0.8; ctx.stroke();
      label(ctx, field(g, 'mark', 'IC'), 54, 80, 25, 11, '#dce5e6', 8);
      ctx.fillStyle = '#c5ced1'; ctx.beginPath(); ctx.arc(37, 96, 1.5, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    }
  });

  /* ---------------- 装饰：提供实际占位 ---------------- */

  TG.register('deco', {
    id: 'photoPocket', name: '照片插袋', collection: 'distinct', reserveRight: 100,
    hint: '右侧倾斜相片、回形夹与透明插袋；为标题和副行预留右侧空间',
    params: [{ key: 'width', label: '插袋宽度', min: 60, max: 94, step: 2, default: 78, unit: 'px',
      hint: '一起调整相片、插袋和回形夹的横向尺寸，正文占位同步变化。' }],
    reserveRightFor: function (params) {
      return params.width === 78 ? 100 : 100 + (params.width - 78) / 2;
    },
    draw: function (g) {
      var ctx = g.ctx;
      var width = TG.moduleParams.values(g.stack, 'deco', 'photoPocket').width;
      ctx.save();
      if (width !== 78) { ctx.translate(500, 0); ctx.scale(width / 78, 1); ctx.translate(-500, 0); }
      ctx.save(); ctx.translate(500, 85); ctx.rotate(-0.045);
      ctx.fillStyle = 'rgba(0,0,0,0.42)'; ctx.fillRect(-31, -36, 66, 78);
      ctx.fillStyle = '#d2d2c4'; ctx.fillRect(-33, -38, 66, 76);
      ctx.strokeStyle = '#f0eee0'; ctx.lineWidth = 0.8; ctx.strokeRect(-33, -38, 66, 76);
      ctx.fillStyle = gradient(ctx, -27, -32, 27, 20, [[0, '#64737c'], [1, '#263440']]);
      ctx.fillRect(-27, -32, 54, 52);
      ctx.save(); ctx.beginPath(); ctx.rect(-27, -32, 54, 52); ctx.clip();
      ctx.strokeStyle = 'rgba(214,223,226,0.17)'; ctx.lineWidth = 0.7;
      [-14, -1, 12].forEach(function (y) {
        ctx.beginPath(); ctx.moveTo(-27, y); ctx.lineTo(27, y); ctx.stroke();
      });
      ctx.beginPath(); ctx.ellipse(0, -13, 7, 9, 0, 0, Math.PI * 2);
      ctx.fillStyle = '#c2cccd'; ctx.fill();
      ctx.beginPath(); ctx.moveTo(-18, 20); ctx.quadraticCurveTo(-16, 1, -5, -1);
      ctx.lineTo(5, -1); ctx.quadraticCurveTo(16, 1, 18, 20); ctx.closePath();
      ctx.fillStyle = '#acb9bd'; ctx.fill();
      ctx.restore();
      label(ctx, field(g, 'code', '--'), 0, 29, 54, 7, '#36434c');
      ctx.restore();
      poly(ctx, [[461, 91], [539, 88], [539, 120], [532, 128], [463, 128]]);
      ctx.fillStyle = 'rgba(160,193,205,0.12)'; ctx.fill();
      ctx.strokeStyle = 'rgba(197,220,225,0.60)'; ctx.lineWidth = 0.9; ctx.stroke();
      ctx.strokeStyle = 'rgba(238,249,248,0.32)';
      ctx.beginPath(); ctx.moveTo(466, 95); ctx.lineTo(534, 92); ctx.stroke();
      poly(ctx, [[539, 120], [532, 128], [532, 121]]);
      ctx.fillStyle = 'rgba(210,231,235,0.24)'; ctx.fill();
      // 回形夹放在相片左上，给右上锁扣保留间隔。
      ctx.strokeStyle = '#cbd3d4'; ctx.lineWidth = 2; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(478, 49); ctx.lineTo(478, 35);
      ctx.bezierCurveTo(478, 29, 487, 29, 487, 35); ctx.lineTo(487, 49);
      ctx.bezierCurveTo(487, 55, 481, 55, 481, 49); ctx.lineTo(481, 37); ctx.stroke();
      ctx.restore();
    }
  });

  TG.register('deco', {
    id: 'lockSeal', name: '锁扣封签', collection: 'distinct', reserveRight: 20,
    hint: '右上实体锁梁、锁体与穿接封带；置于标题上方，不横穿字身',
    draw: function (g) {
      var ctx = g.ctx, pal = g.pal;
      ctx.save();
      poly(ctx, [[496, 20], [555, 20], [555, 29], [496, 29], [502, 24.5]]);
      ctx.fillStyle = '#66727b'; ctx.fill(); ctx.strokeStyle = '#a9b4ba'; ctx.lineWidth = 0.8; ctx.stroke();
      [507, 512, 549].forEach(function (x) {
        ctx.beginPath(); ctx.arc(x, 24.5, 1.3, 0, Math.PI * 2); ctx.fillStyle = '#28333d'; ctx.fill();
      });
      ctx.lineCap = 'round'; ctx.lineWidth = 5; ctx.strokeStyle = '#29343d';
      ctx.beginPath(); ctx.moveTo(524, 25); ctx.lineTo(524, 18);
      ctx.arc(532, 18, 8, Math.PI, 0); ctx.lineTo(540, 25); ctx.stroke();
      ctx.lineWidth = 2.5; ctx.strokeStyle = '#c3cdd0'; ctx.stroke();
      TG.roundRect(ctx, 518, 23, 28, 18, 3);
      ctx.fillStyle = gradient(ctx, 518, 23, 546, 41, [[0, '#b5b9ad'], [0.5, '#7f8987'], [1, '#4c5b60']]);
      ctx.fill(); ctx.strokeStyle = '#d3d9d0'; ctx.lineWidth = 0.9; ctx.stroke();
      ctx.fillStyle = '#25343f'; ctx.beginPath(); ctx.arc(532, 30.5, 2.4, 0, Math.PI * 2); ctx.fill();
      poly(ctx, [[531, 31], [533, 31], [534, 36], [530, 36]]); ctx.fill();
      ctx.fillStyle = css(pal.base, 0.7); ctx.fillRect(521, 26, 2, 10);
      ctx.restore();
    }
  });

  TG.register('deco', {
    id: 'patchCable', name: '插头线缆', collection: 'distinct', reserveRight: 0,
    hint: '下沿弯折绝缘线、护套与金属插头；占用 y136–153，位于副行下方',
    draw: function (g) {
      var ctx = g.ctx, pal = g.pal;
      ctx.save();
      ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      ctx.beginPath(); ctx.moveTo(19, 141); ctx.lineTo(43, 141);
      ctx.bezierCurveTo(50, 141, 48, 149, 58, 149); ctx.lineTo(89, 149);
      ctx.lineWidth = 7; ctx.strokeStyle = '#111b24'; ctx.stroke();
      ctx.lineWidth = 4; ctx.strokeStyle = mix(pal.base, '#8d9ca3', 0.6); ctx.stroke();
      ctx.lineWidth = 1; ctx.strokeStyle = 'rgba(233,242,241,0.65)'; ctx.stroke();
      TG.roundRect(ctx, 84, 142, 15, 11, 3);
      ctx.fillStyle = '#273742'; ctx.fill(); ctx.strokeStyle = '#6e818b'; ctx.lineWidth = 0.8; ctx.stroke();
      for (var x = 88; x <= 94; x += 3) {
        ctx.beginPath(); ctx.moveTo(x, 144); ctx.lineTo(x, 151); ctx.stroke();
      }
      poly(ctx, [[98, 136], [123, 136], [128, 141], [128, 151], [98, 151]]);
      ctx.fillStyle = gradient(ctx, 0, 136, 0, 151, [[0, '#d0d6d3'], [0.42, '#9aa8ac'], [1, '#4e646e']]);
      ctx.fill(); ctx.strokeStyle = '#c0ced0'; ctx.lineWidth = 0.9; ctx.stroke();
      ctx.fillStyle = '#445560'; ctx.fillRect(104, 140, 12, 6);
      ctx.fillStyle = '#c1b381'; ctx.fillRect(128, 140, 13, 3); ctx.fillRect(128, 147, 13, 3);
      ctx.fillStyle = '#eee3b4'; ctx.fillRect(135, 140, 5, 1); ctx.fillRect(135, 147, 5, 1);
      ctx.restore();
    }
  });
})();
