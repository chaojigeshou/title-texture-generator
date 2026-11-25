/* ============================================================
 * mod-v2.js — 第四批：v2 扩展模块（每类 3 个，共 21 个）
 *   bg:   smoke / emberfield / deepsea
 *   plate: frost / stencil / velvet
 *   frame: stamp / ruled / split
 *   badge: key / qr / ribbon
 *   text:  frost / rust / typer
 *   deco:  thermo / filmhole / ticker(动)
 *   motion: steam / lightning / heartbeat
 * ============================================================ */
(function () {
  'use strict';
  var TG = window.TG, W = TG.W, H = TG.H;
  var css = TG.css, mix = TG.mix;
  var MONO = 'Consolas,"Cascadia Mono","Courier New",monospace';

  function th(g) { return g.theme || { accent: '#d2b273', secondary: '#7f9dc4', ink: '#07101a', line: 1, radius: 12, glow: 1 }; }
  function ac(g, a) { return css(th(g).accent, a); }
  function sc(g, a) { return css(th(g).secondary, a); }
  function loop(t, ms) { return ((t % ms) + ms) % ms / ms; }
  var PAD = 5;

  /* ================= 背景 ================= */

  /* 烟霾：灰雾带缓慢横移 */
  TG.register('bg', {
    id: 'smoke', name: '烟霾', hint: '灰雾带横移，烟霾战争/后巷清晨',
    draw: function (g) {
      var ctx = g.ctx, r = g.rand, th0 = th(g);
      ctx.fillStyle = '#0b0d11'; ctx.fillRect(0, 0, W, H);
      for (var i = 0; i < 7; i++) {
        var cy = 10 + r() * (H - 20), h = 8 + r() * 26;
        var gd = ctx.createLinearGradient(0, cy - h, 0, cy + h);
        gd.addColorStop(0, 'rgba(150,160,172,0)');
        gd.addColorStop(0.5, 'rgba(150,160,172,' + (0.05 + r() * 0.07).toFixed(3) + ')');
        gd.addColorStop(1, 'rgba(150,160,172,0)');
        ctx.fillStyle = gd;
        ctx.beginPath();
        ctx.ellipse(W * (0.15 + r() * 0.7), cy, 140 + r() * 160, h, 0, 0, Math.PI * 2);
        ctx.fill();
      }
      var vg = ctx.createRadialGradient(W * 0.5, H * 0.45, H * 0.3, W * 0.5, H * 0.45, W * 0.62);
      vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,0.6)');
      ctx.fillStyle = vg; ctx.fillRect(0, 0, W, H);
      var glow = ctx.createLinearGradient(0, H, 0, H - 60);
      glow.addColorStop(0, css(th0.secondary, 0.10)); glow.addColorStop(1, css(th0.secondary, 0));
      ctx.fillStyle = glow; ctx.fillRect(0, H - 60, W, 60);
    }
  });

  /* 余烬场：暗红地火 */
  TG.register('bg', {
    id: 'emberfield', name: '余烬场', hint: '暗红地火 + 灰烬层，废墟/战后',
    draw: function (g) {
      var ctx = g.ctx, r = g.rand;
      var bg = ctx.createLinearGradient(0, 0, 0, H);
      bg.addColorStop(0, '#0a0708'); bg.addColorStop(0.62, '#120a09'); bg.addColorStop(1, '#2a1108');
      ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);
      for (var i = 0; i < 5; i++) {
        var cx = r() * W, cy = H - 10 - r() * 30, rad = 40 + r() * 90;
        var rg = ctx.createRadialGradient(cx, cy, 2, cx, cy, rad);
        rg.addColorStop(0, 'rgba(255,120,40,0.20)');
        rg.addColorStop(1, 'rgba(255,120,40,0)');
        ctx.fillStyle = rg; ctx.fillRect(0, 0, W, H);
      }
      ctx.fillStyle = 'rgba(120,110,105,0.10)';
      for (var j = 0; j < 40; j++) {
        var x = r() * W, y = H - 26 + r() * 22;
        ctx.fillRect(x, y, 1 + r() * 2, 1);
      }
      var vg = ctx.createRadialGradient(W * 0.5, H * 0.4, H * 0.24, W * 0.5, H * 0.4, W * 0.6);
      vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,0.55)');
      ctx.fillStyle = vg; ctx.fillRect(0, 0, W, H);
    }
  });

  /* 大湖：深蓝水波 + 远处灯 */
  TG.register('bg', {
    id: 'deepsea', name: '深水夜航', hint: '深蓝水面波纹 + 远处船灯，适用于夜航题材',
    draw: function (g) {
      var ctx = g.ctx, r = g.rand;
      var bg = ctx.createLinearGradient(0, 0, 0, H);
      bg.addColorStop(0, '#04121c'); bg.addColorStop(0.55, '#061a26'); bg.addColorStop(1, '#031019');
      ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);
      var moon = ctx.createRadialGradient(W * 0.74, 26, 2, W * 0.74, 26, 90);
      moon.addColorStop(0, 'rgba(190,225,255,0.16)'); moon.addColorStop(1, 'rgba(190,225,255,0)');
      ctx.fillStyle = moon; ctx.fillRect(0, 0, W, H);
      ctx.strokeStyle = 'rgba(150,205,235,0.14)'; ctx.lineWidth = 0.8;
      for (var i = 0; i < 9; i++) {
        var y = 62 + i * 10;
        ctx.beginPath();
        for (var x = 0; x <= W; x += 12) {
          var yy = y + Math.sin(x / 34 + i) * (1.4 + i * 0.22);
          if (x === 0) ctx.moveTo(x, yy); else ctx.lineTo(x, yy);
        }
        ctx.stroke();
      }
      ctx.fillStyle = 'rgba(255,225,170,0.5)';
      for (var k = 0; k < 4; k++) { ctx.fillRect(60 + r() * (W - 120), 52 + r() * 8, 2, 2); }
      var vg = ctx.createRadialGradient(W * 0.5, H * 0.5, H * 0.3, W * 0.5, H * 0.5, W * 0.65);
      vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,0.55)');
      ctx.fillStyle = vg; ctx.fillRect(0, 0, W, H);
    }
  });

  /* ================= 底板 ================= */
  function shell(g, fill) {
    var ctx = g.ctx;
    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,0.55)'; ctx.shadowBlur = 24;
    TG.roundRect(ctx, PAD, PAD, W - PAD * 2, H - PAD * 2, th(g).radius || 12);
    ctx.fillStyle = fill; ctx.fill();
    ctx.restore();
  }

  /* 霜面 */
  TG.register('plate', {
    id: 'frost', name: '霜面', hint: '磨砂冰面 + 内霜纹，冷冻档案',
    draw: function (g) {
      var ctx = g.ctx, r = g.rand;
      shell(g, 'rgba(16,26,36,0.94)');
      ctx.save();
      TG.roundRect(ctx, PAD, PAD, W - PAD * 2, H - PAD * 2, 12); ctx.clip();
      var gd = ctx.createLinearGradient(0, PAD, W * 0.6, H);
      gd.addColorStop(0, 'rgba(190,240,255,0.10)');
      gd.addColorStop(0.5, 'rgba(140,190,220,0.04)');
      gd.addColorStop(1, 'rgba(255,255,255,0.06)');
      ctx.fillStyle = gd; ctx.fillRect(PAD, PAD, W - 10, H - 10);
      ctx.strokeStyle = 'rgba(220,245,255,0.16)'; ctx.lineWidth = 0.8;
      for (var i = 0; i < 26; i++) {
        var x = r() * W, y = r() * H, len = 6 + r() * 22, a = -0.9 + r() * 1.8;
        ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + Math.cos(a) * len, y + Math.sin(a) * len); ctx.stroke();
      }
      ctx.restore();
      ctx.save();
      TG.roundRect(ctx, PAD + 0.7, PAD + 0.7, W - 11, H - 11, 12);
      ctx.strokeStyle = 'rgba(200,240,255,0.34)'; ctx.lineWidth = 1.1; ctx.stroke();
      ctx.restore();
    }
  });

  /* 铁牌喷字 */
  TG.register('plate', {
    id: 'stencil', name: '铁牌', hint: '工业铁板 + 铆边 + 喷字模板框',
    draw: function (g) {
      var ctx = g.ctx, r = g.rand;
      shell(g, '#14171c');
      ctx.save();
      TG.roundRect(ctx, PAD, PAD, W - PAD * 2, H - PAD * 2, 4); ctx.clip();
      var met = ctx.createLinearGradient(0, PAD, 0, H - PAD);
      met.addColorStop(0, 'rgba(255,255,255,0.07)');
      met.addColorStop(0.4, 'rgba(255,255,255,0.01)');
      met.addColorStop(1, 'rgba(0,0,0,0.3)');
      ctx.fillStyle = met; ctx.fillRect(PAD, PAD, W - 10, H - 10);
      ctx.strokeStyle = 'rgba(255,255,255,0.05)'; ctx.lineWidth = 0.7;
      for (var i = 0; i < 18; i++) {
        var y = PAD + r() * (H - 10);
        ctx.beginPath(); ctx.moveTo(PAD, y); ctx.lineTo(W - PAD, y + (r() - 0.5) * 4); ctx.stroke();
      }
      ctx.restore();
      ctx.save();
      ctx.strokeStyle = 'rgba(190,200,214,0.22)'; ctx.lineWidth = 1;
      ctx.strokeRect(PAD + 5.5, PAD + 5.5, W - 21, H - 21);
      ctx.fillStyle = 'rgba(220,230,244,0.20)';
      for (var j = 0; j < 8; j++) {
        var bx = PAD + 10 + j * ((W - 20 - 10) / 7);
        ctx.beginPath(); ctx.arc(bx, H - PAD - 9, 1.6, 0, Math.PI * 2); ctx.fill();
      }
      ctx.restore();
    }
  });

  /* 绒面 */
  TG.register('plate', {
    id: 'velvet', name: '绒面', hint: '深紫绒布 + 缝线，剧院/色彩级',
    draw: function (g) {
      var ctx = g.ctx, r = g.rand;
      shell(g, '#150e19');
      ctx.save();
      TG.roundRect(ctx, PAD, PAD, W - PAD * 2, H - PAD * 2, 14); ctx.clip();
      var gd = ctx.createRadialGradient(W * 0.3, H * 0.2, 10, W * 0.3, H * 0.2, W * 0.7);
      gd.addColorStop(0, 'rgba(126,72,140,0.20)'); gd.addColorStop(1, 'rgba(40,20,46,0.05)');
      ctx.fillStyle = gd; ctx.fillRect(PAD, PAD, W - 10, H - 10);
      ctx.fillStyle = 'rgba(255,255,255,0.018)';
      for (var i = 0; i < 260; i++) ctx.fillRect(r() * W, r() * H, 1.2, 1.2);
      ctx.restore();
      ctx.save();
      TG.roundRect(ctx, PAD + 4.5, PAD + 4.5, W - 19, H - 19, 11);
      ctx.setLineDash([5, 4]);
      ctx.strokeStyle = 'rgba(226,196,150,0.38)'; ctx.lineWidth = 1; ctx.stroke();
      ctx.restore();
    }
  });

  /* ================= 边框 ================= */

  TG.register('frame', {
    id: 'stamp', name: '钢印', hint: '四角窄框 + 断口，机械压制感',
    draw: function (g) {
      var ctx = g.ctx;
      ctx.save();
      ctx.strokeStyle = ac(g, 0.34); ctx.lineWidth = 1;
      var L = 26;
      [[PAD + 8, PAD + 8, 1, 1], [W - PAD - 8, PAD + 8, -1, 1],
       [PAD + 8, H - PAD - 8, 1, -1], [W - PAD - 8, H - PAD - 8, -1, -1]].forEach(function (c) {
        ctx.beginPath();
        ctx.moveTo(c[0] + c[2] * L, c[1]);
        ctx.lineTo(c[0] + c[2] * 4, c[1]);
        ctx.moveTo(c[0], c[1] + c[3] * 4);
        ctx.lineTo(c[0], c[1] + c[3] * L);
        ctx.stroke();
      });
      ctx.restore();
    }
  });

  TG.register('frame', {
    id: 'ruled', name: '刻度边', hint: '四边刻度框，仪表/观测',
    draw: function (g) {
      var ctx = g.ctx;
      ctx.save();
      ctx.strokeStyle = ac(g, 0.26); ctx.lineWidth = 0.7;
      TG.roundRect(ctx, PAD + 3.5, PAD + 3.5, W - 17, H - 17, 10); ctx.stroke();
      var i;
      for (i = PAD + 12; i < W - PAD - 8; i += 6) {
        var h = (Math.round((i - PAD - 12) / 6) % 5 === 0) ? 5 : 2.4;
        ctx.beginPath(); ctx.moveTo(i, PAD + 3.5); ctx.lineTo(i, PAD + 3.5 + h); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(i, H - PAD - 3.5); ctx.lineTo(i, H - PAD - 3.5 - h); ctx.stroke();
      }
      for (i = PAD + 12; i < H - PAD - 8; i += 6) {
        var w = (Math.round((i - PAD - 12) / 6) % 5 === 0) ? 5 : 2.4;
        ctx.beginPath(); ctx.moveTo(PAD + 3.5, i); ctx.lineTo(PAD + 3.5 + w, i); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(W - PAD - 3.5, i); ctx.lineTo(W - PAD - 3.5 - w, i); ctx.stroke();
      }
      ctx.restore();
    }
  });

  TG.register('frame', {
    id: 'split', name: '中缝', hint: '左右分栏竖线 + 斜切角，档案分册',
    draw: function (g) {
      var ctx = g.ctx;
      ctx.save();
      ctx.strokeStyle = sc(g, 0.30); ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(PAD + 92, PAD + 8); ctx.lineTo(PAD + 92, H - PAD - 8); ctx.stroke();
      ctx.strokeStyle = ac(g, 0.30);
      ctx.beginPath();
      ctx.moveTo(PAD + 8, PAD + 20); ctx.lineTo(PAD + 20, PAD + 8);
      ctx.lineTo(W - PAD - 8, PAD + 8);
      ctx.moveTo(W - PAD - 20, H - PAD - 8); ctx.lineTo(W - PAD - 8, H - PAD - 20);
      ctx.lineTo(PAD + 8, H - PAD - 8);
      ctx.stroke();
      ctx.restore();
    }
  });

  /* ================= 徽记 ================= */

  TG.register('badge', {
    id: 'key', name: '钥匙牌', hint: '圆牌 + 钥匙孔 + 编号，旅店/委托',
    draw: function (g) {
      var ctx = g.ctx, cx = 54, cy = 80, R = 25;
      ctx.save();
      ctx.shadowColor = ac(g, 0.55); ctx.shadowBlur = 14;
      ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2);
      var gd = ctx.createLinearGradient(cx, cy - R, cx, cy + R);
      gd.addColorStop(0, 'rgba(36,44,58,0.98)'); gd.addColorStop(1, 'rgba(12,16,24,0.98)');
      ctx.fillStyle = gd; ctx.fill();
      ctx.restore();
      ctx.save();
      ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2);
      ctx.strokeStyle = ac(g, 0.75); ctx.lineWidth = 1.4; ctx.stroke();
      ctx.fillStyle = ac(g, 0.85);
      ctx.beginPath(); ctx.arc(cx, cy - 4, 5.2, 0, Math.PI * 2); ctx.fill();
      ctx.fillRect(cx - 2, cy - 2, 4, 14);
      ctx.fillRect(cx - 2, cy + 6, 8, 3);
      ctx.font = '700 7px ' + MONO; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillStyle = ac(g, 0.6);
      var code = TG.graphemes(g.item.code || '').slice(-4).join('') || '0001';
      ctx.fillText(TG.fitText(ctx, code, 28), cx, cy + 20);
      ctx.restore();
    }
  });

  TG.register('badge', {
    id: 'qr', name: '方码牌', hint: '二维码块阵 + 方框，数据/终端',
    draw: function (g) {
      var ctx = g.ctx, r = g.rand;
      var x0 = 32, y0 = 46, S = 48, cell = 4;
      ctx.save();
      TG.roundRect(ctx, x0 - 4, y0 - 4, S + 8, S + 8, 5);
      ctx.fillStyle = 'rgba(9,14,20,0.94)'; ctx.fill();
      ctx.strokeStyle = ac(g, 0.5); ctx.lineWidth = 1; ctx.stroke();
      ctx.fillStyle = ac(g, 0.82);
      for (var y = 0; y < S / cell; y++) {
        for (var x = 0; x < S / cell; x++) {
          if (r() > 0.52) ctx.fillRect(x0 + x * cell, y0 + y * cell, cell - 0.8, cell - 0.8);
        }
      }
      // 三个定位角
      ctx.fillStyle = 'rgba(9,14,20,0.98)';
      [[0, 0], [1, 0], [0, 1]].forEach(function (p) {
        ctx.fillRect(x0 + p[0] * (S - 14), y0 + p[1] * (S - 14), 14, 14);
        ctx.strokeStyle = ac(g, 0.85); ctx.lineWidth = 2;
        ctx.strokeRect(x0 + p[0] * (S - 14) + 1, y0 + p[1] * (S - 14) + 1, 12, 12);
      });
      ctx.restore();
    }
  });

  TG.register('badge', {
    id: 'ribbon', name: '绶带', hint: '顶部绶带 + 中心字，授勋/纪念',
    draw: function (g) {
      var ctx = g.ctx, it = g.item;
      var mark = it.mark || TG.graphemes(it.main || '?')[0];
      ctx.save();
      // 绶带
      ctx.beginPath();
      ctx.moveTo(30, 40); ctx.lineTo(78, 40); ctx.lineTo(70, 118); ctx.lineTo(54, 108); ctx.lineTo(38, 118);
      ctx.closePath();
      var gd = ctx.createLinearGradient(30, 40, 78, 118);
      gd.addColorStop(0, mix(th(g).accent, '#ffffff', 0.25));
      gd.addColorStop(0.5, th(g).accent);
      gd.addColorStop(1, mix(th(g).accent, '#04070d', 0.55));
      ctx.fillStyle = gd; ctx.fill();
      ctx.strokeStyle = 'rgba(0,0,0,0.45)'; ctx.lineWidth = 1; ctx.stroke();
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.font = '700 20px ' + TG.FONT;
      ctx.fillStyle = 'rgba(18,12,4,0.85)';
      ctx.fillText(TG.fitLabel(ctx, mark, 34, 11), 54, 74);
      ctx.restore();
    }
  });

  /* ================= 字材 ================= */

  TG.register('text', {
    id: 'frost', name: '冰晶', hint: '白蓝渐变 + 冷光描边，冷冻档案',
    draw: function (g) {
      TG.paintTitle(g, { fill: 'rgba(200,240,255,0.7)', glow: 'rgba(150,220,255,0.85)', glowBlur: 30 });
      TG.paintTitle(g, {
        fill: function (ctx, size) {
          var gd = ctx.createLinearGradient(0, 98 - size * 0.85, 0, 98 + size * 0.2);
          gd.addColorStop(0, '#ffffff');
          gd.addColorStop(0.42, '#d6f2ff');
          gd.addColorStop(0.72, '#8ec8e8');
          gd.addColorStop(1, '#3f7391');
          return gd;
        },
        stroke: 'rgba(6,20,30,0.8)',
        strokeWidth: 3.6,
        topHighlight: 'rgba(255,255,255,0.6)'
      });
      // 冰棱高光
      var L = g.L, ctx = g.ctx;
      ctx.save();
      ctx.beginPath(); ctx.rect(L.ax - 20, L.baseline - L.fA, L.total + 40, L.fA * 0.5); ctx.clip();
      ctx.globalCompositeOperation = 'lighter';
      ctx.strokeStyle = 'rgba(220,250,255,0.5)'; ctx.lineWidth = 0.8;
      for (var i = 0; i < 9; i++) {
        var x = L.ax + (i + 0.5) * (L.total / 9);
        ctx.beginPath(); ctx.moveTo(x, L.baseline - L.fA * 0.95); ctx.lineTo(x + 6, L.baseline - L.fA * 0.2); ctx.stroke();
      }
      ctx.restore();
    }
  });

  TG.register('text', {
    id: 'rust', name: '锈蚀', hint: '橙锈渐变 + 剥落噪点，废墟/老铁', isolated: true,
    draw: function (g) {
      var r = g.rand, ctx = g.ctx;
      TG.paintTitle(g, { fill: 'rgba(60,28,10,0.85)', glow: 'rgba(255,120,40,0.5)', glowBlur: 24 });
      TG.paintTitle(g, {
        fill: function (c, size) {
          var gd = c.createLinearGradient(0, 98 - size * 0.8, 0, 98 + size * 0.2);
          gd.addColorStop(0, '#f0b070');
          gd.addColorStop(0.45, '#c8702c');
          gd.addColorStop(0.8, '#7a3d13');
          gd.addColorStop(1, '#3c1c08');
          return gd;
        },
        stroke: 'rgba(20,10,4,0.85)',
        strokeWidth: 4,
        topHighlight: 'rgba(255,220,170,0.4)'
      });
      // 剥落坑
      var L = g.L;
      ctx.save();
      ctx.globalCompositeOperation = 'destination-out';
      for (var i = 0; i < 26; i++) {
        var x = L.ax + r() * L.total, y = L.baseline - r() * L.fA * 0.9;
        ctx.globalAlpha = 0.25 + r() * 0.45;
        ctx.beginPath(); ctx.arc(x, y, 0.6 + r() * 1.6, 0, Math.PI * 2); ctx.fill();
      }
      ctx.restore();
    }
  });

  TG.register('text', {
    id: 'typer', name: '等宽铅字', hint: '等宽铅字 + 轻微错印，卷宗/旧档案',
    font: '"Cascadia Mono",Consolas,"Courier New",monospace',
    draw: function (g) {
      var face = '"Cascadia Mono",Consolas,"Courier New",monospace';
      g.ctx.save();
      g.ctx.translate(0.4, -0.3);
      TG.paintTitle(g, { font: face, fill: 'rgba(20,24,32,0.55)' });
      g.ctx.restore();
      TG.paintTitle(g, {
        font: face,
        fill: function (ctx, size) {
          var gd = ctx.createLinearGradient(0, 98 - size * 0.8, 0, 98 + size * 0.1);
          gd.addColorStop(0, '#f4f6fa');
          gd.addColorStop(0.6, '#c9d3e0');
          gd.addColorStop(1, '#8b98aa');
          return gd;
        },
        stroke: 'rgba(8,12,18,0.8)',
        strokeWidth: 2.6
      });
    }
  });

  /* ================= 装饰 ================= */

  /* 温度计（静态） */
  TG.register('deco', {
    id: 'thermo', name: '温度计', hint: '右侧竖向温度柱',
    draw: function (g) {
      var ctx = g.ctx, x = W - 20, y0 = 42, y1 = H - 42, level = 0.62;
      ctx.save();
      ctx.strokeStyle = sc(g, 0.35); ctx.lineWidth = 1;
      TG.roundRect(ctx, x - 3, y0, 6, y1 - y0, 3); ctx.stroke();
      var h = (y1 - y0 - 4) * level;
      var gd = ctx.createLinearGradient(0, y1, 0, y0);
      gd.addColorStop(0, css('#e0653c', 0.9)); gd.addColorStop(1, css('#5aa9ff', 0.85));
      ctx.fillStyle = gd;
      TG.roundRect(ctx, x - 2, y1 - 2 - h, 4, h, 2); ctx.fill();
      ctx.strokeStyle = sc(g, 0.3); ctx.lineWidth = 0.7;
      for (var i = 0; i <= 4; i++) {
        var yy = y0 + (y1 - y0) * i / 4;
        ctx.beginPath(); ctx.moveTo(x - 6, yy); ctx.lineTo(x - 3, yy); ctx.stroke();
      }
      ctx.restore();
    }
  });

  /* 胶片孔（静态） */
  TG.register('deco', {
    id: 'filmhole', name: '胶片孔', hint: '左右胶片齿孔 + 片边',
    draw: function (g) {
      var ctx = g.ctx;
      ctx.save();
      ctx.fillStyle = 'rgba(0,0,0,0.55)';
      ctx.fillRect(0, 0, 10, H); ctx.fillRect(W - 10, 0, 10, H);
      ctx.fillStyle = 'rgba(240,240,235,0.10)';
      for (var y = 8; y < H - 6; y += 16) {
        TG.roundRect(ctx, 2.5, y, 5, 9, 1.6); ctx.fill();
        TG.roundRect(ctx, W - 7.5, y, 5, 9, 1.6); ctx.fill();
      }
      ctx.restore();
    }
  });

  /* 滚动字幕（动） */
  TG.register('deco', {
    id: 'ticker', name: '滚动字幕', hint: '底部滚动的播报条（动）', layer: 'motion',
    draw: function (g, t) {
      var ctx = g.ctx, txt = (g.stack.ticker || '后巷深宵 03:13 — 04:34  ·  LOS 记录同步中  ·  禁忌条款已更新');
      ctx.save();
      ctx.font = '600 7.5px ' + MONO;
      ctx.textBaseline = 'middle';
      var w = ctx.measureText(txt).width;
      var x = W - (loop(t, 9000) * (w + W));
      var y = H - 8;
      ctx.fillStyle = 'rgba(8,12,18,0.62)';
      ctx.fillRect(0, H - 16, W, 12);
      ctx.save();
      ctx.beginPath(); ctx.rect(0, H - 16, W, 12); ctx.clip();
      ctx.fillStyle = sc(g, 0.72);
      ctx.fillText(txt, x, y - 2);
      ctx.fillText(txt, x + w + 40, y - 2);
      ctx.restore();
      ctx.restore();
    }
  });

  /* ================= 动效 ================= */

  TG.register('motion', {
    id: 'steam', name: '蒸汽', hint: '上升白色蒸汽团',
    draw: function (g, t) {
      var ctx = g.ctx, r = g.rand;
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      for (var i = 0; i < 9; i++) {
        var x0 = 40 + r() * (W - 80), ph = r() * 1000;
        var p = loop(t + ph, 3200);
        var y = H - 12 - p * (H - 20);
        var rad = 10 + p * 26;
        var a = Math.sin(p * Math.PI) * 0.09;
        var rg = ctx.createRadialGradient(x0 + Math.sin(t / 900 + i) * 10, y, 2, x0, y, rad);
        rg.addColorStop(0, 'rgba(220,232,244,' + a.toFixed(3) + ')');
        rg.addColorStop(1, 'rgba(220,232,244,0)');
        ctx.fillStyle = rg;
        ctx.beginPath(); ctx.arc(x0, y, rad, 0, Math.PI * 2); ctx.fill();
      }
      ctx.restore();
    }
  });

  TG.register('motion', {
    id: 'lightning', name: '闪电', hint: '偶发折线弧光 + 全场闪白',
    draw: function (g, t) {
      var ctx = g.ctx;
      var phase = t % 1600;
      if (phase > 220) return;
      var r = TG.mulberry32(Math.floor(t / 200) * 977 + 13);
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.strokeStyle = 'rgba(220,240,255,' + (0.85 * (1 - phase / 220)).toFixed(3) + ')';
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      var x = 80 + r() * (W - 160), y = 20;
      ctx.moveTo(x, y);
      for (var i = 0; i < 6; i++) {
        x += (r() - 0.5) * 26; y += 14 + r() * 12;
        ctx.lineTo(x, y);
      }
      ctx.stroke();
      ctx.fillStyle = 'rgba(200,225,255,' + (0.06 * (1 - phase / 220)).toFixed(3) + ')';
      ctx.fillRect(0, 0, W, H);
      ctx.restore();
    }
  });

  TG.register('motion', {
    id: 'heartbeat', name: '心跳', hint: '整卡轻微缩放脉冲（双跳）',
    draw: function (g, t) {
      var base = g.base, ctx = g.ctx, S = g.S;
      var p = loop(t, 1200);
      var beat = Math.exp(-Math.pow((p - 0.06) / 0.05, 2)) + 0.6 * Math.exp(-Math.pow((p - 0.2) / 0.05, 2));
      if (beat < 0.02) return;
      var s = 1 + 0.006 * beat;
      ctx.save();
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.globalAlpha = 0.55 * Math.min(1, beat);
      var cx = base.canvas.width / 2, cy = base.canvas.height / 2;
      ctx.translate(cx, cy); ctx.scale(s, s); ctx.translate(-cx, -cy);
      ctx.drawImage(base.canvas, 0, 0);
      ctx.restore();
    }
  });
})();

