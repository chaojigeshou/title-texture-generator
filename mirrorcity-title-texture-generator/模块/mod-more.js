/* ============================================================
 * mod-more.js — 第三批：静态装饰 + 可动画装饰 + 新动效
 *   · 装饰模块可以声明 layer:'motion'，就会跳过静态底图，改为逐帧绘制（终于能动了）
 *   · 全部沿用主题 token（g.theme），换主题即换色
 * ============================================================ */
(function () {
  'use strict';
  var TG = window.TG, W = TG.W, H = TG.H;
  var css = TG.css, mix = TG.mix;

  function th(g) { return g.theme || { accent: '#ffd75e', secondary: '#5aa9ff', ink: '#07101a', line: 1 }; }
  function ac(g, a) { return css(th(g).accent, a); }
  function sc(g, a) { return css(th(g).secondary, a); }
  function loop(t, ms) { return ((t % ms) + ms) % ms / ms; }
  var MONO = 'Consolas, "Courier New", monospace';

  /* ================= 静态装饰 ================= */

  /* 胶带角贴 */
  TG.register('deco', {
    id: 'tapecorner', name: '胶带角', hint: '四角半透明胶带，手贴感',
    draw: function (g) {
      var ctx = g.ctx;
      ctx.save();
      [[26, 20, -0.42], [W - 26, 20, 0.42], [26, H - 20, 0.42], [W - 26, H - 20, -0.42]].forEach(function (c) {
        ctx.save();
        ctx.translate(c[0], c[1]); ctx.rotate(c[2]);
        ctx.fillStyle = 'rgba(240,238,225,0.16)';
        ctx.fillRect(-17, -5, 34, 10);
        ctx.strokeStyle = 'rgba(255,255,255,0.10)';
        ctx.lineWidth = 0.7;
        ctx.strokeRect(-17, -5, 34, 10);
        ctx.restore();
      });
      ctx.restore();
    }
  });

  /* 刻度尺 */
  TG.register('deco', {
    id: 'ruler', name: '刻度尺', hint: '底部细刻度，工程图感',
    draw: function (g) {
      var ctx = g.ctx;
      ctx.save();
      ctx.strokeStyle = ac(g, 0.30); ctx.lineWidth = 0.7;
      var y = H - 13;
      ctx.beginPath(); ctx.moveTo(40, y); ctx.lineTo(W - 40, y); ctx.stroke();
      for (var x = 40, i = 0; x <= W - 40; x += 7, i++) {
        var h = i % 5 === 0 ? 5 : 2.6;
        ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y - h); ctx.stroke();
      }
      ctx.restore();
    }
  });

  /* 网点 */
  TG.register('deco', {
    id: 'halftone', name: '网点', hint: '右侧半调网点，印刷感',
    draw: function (g) {
      var ctx = g.ctx, r = g.rand;
      ctx.save();
      for (var i = 0; i < 46; i++) {
        var x = W - 108 + r() * 96, y = 22 + r() * (H - 44);
        var rad = 0.7 + r() * 1.9;
        ctx.fillStyle = ac(g, 0.10 + r() * 0.16);
        ctx.beginPath(); ctx.arc(x, y, rad, 0, Math.PI * 2); ctx.fill();
      }
      ctx.restore();
    }
  });

  /* 分隔线 */
  TG.register('deco', {
    id: 'rule', name: '分隔线', hint: '标题下方的细分隔线 + 右端小标签',
    draw: function (g) {
      var ctx = g.ctx, L = g.L;
      ctx.save();
      var y = 114, x0 = L.ax - 4, x1 = L.ax + L.total + 4;
      if (L.parts) { y = 153; x0 = L.content.left; x1 = L.content.right; }
      var gd = ctx.createLinearGradient(x0, 0, x1, 0);
      gd.addColorStop(0, ac(g, 0)); gd.addColorStop(0.35, ac(g, 0.42)); gd.addColorStop(1, ac(g, 0.12));
      ctx.fillStyle = gd;
      ctx.fillRect(x0, y, x1 - x0, 0.9);
      if (!L.parts) TG.smallCaps(ctx, 'SECTION', x0, y - 4, 7, th(g).accent, 0.5, 2.4, 'left', 700);
      ctx.restore();
    }
  });

  /* 六角编号 */
  TG.register('deco', {
    id: 'hexcode', name: '六角编号', hint: '右上六角小标 + 编号',
    draw: function (g) {
      var ctx = g.ctx;
      ctx.save();
      TG.hexPath(ctx, W - 40, 32, 13, 6);
      ctx.strokeStyle = ac(g, 0.45); ctx.lineWidth = 1; ctx.stroke();
      ctx.fillStyle = ac(g, 0.10); ctx.fill();
      ctx.font = '700 7px ' + MONO; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillStyle = ac(g, 0.75);
      var code = TG.graphemes(g.item.code || '00').slice(-3).join('');
      ctx.fillText(TG.fitLabel(ctx, code, 20, 6), W - 40, 33);
      ctx.restore();
    }
  });

  /* 折页角 */
  TG.register('deco', {
    id: 'fold', name: '折页角', hint: '右下角折页阴影，纸卡感',
    draw: function (g) {
      var ctx = g.ctx, s = 20, x = W - 5 - s, y = H - 5 - s;
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(x + s, y); ctx.lineTo(x + s, y + s); ctx.lineTo(x, y + s); ctx.closePath();
      var gd = ctx.createLinearGradient(x + s, y, x, y + s);
      gd.addColorStop(0, 'rgba(0,0,0,0.45)'); gd.addColorStop(1, 'rgba(255,255,255,0.10)');
      ctx.fillStyle = gd; ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.16)'; ctx.lineWidth = 0.8; ctx.stroke();
      ctx.restore();
    }
  });

  /* ================= 可动画装饰（layer:'motion'） ================= */

  /* 呼吸徽点 */
  TG.register('deco', {
    id: 'blink', name: '呼吸点', hint: '会呼吸的指示灯 + 扩散环（动）', layer: 'motion',
    draw: function (g, t) {
      var ctx = g.ctx, p = loop(t, 1500);
      var cx = 88, cy = 124;
      ctx.save();
      ctx.fillStyle = ac(g, 0.85);
      ctx.beginPath(); ctx.arc(cx, cy, 2.4, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = ac(g, 0.5 * (1 - p)); ctx.lineWidth = 1;
      ctx.beginPath(); ctx.arc(cx, cy, 3 + p * 9, 0, Math.PI * 2); ctx.stroke();
      ctx.restore();
    }
  });

  /* 雷达扫描 */
  TG.register('deco', {
    id: 'radar', name: '雷达扫描', hint: '右上雷达扫掠（动）', layer: 'motion',
    draw: function (g, t) {
      var ctx = g.ctx, cx = W - 44, cy = 76, R = 24;
      var a = loop(t, 2400) * Math.PI * 2;
      ctx.save();
      ctx.strokeStyle = sc(g, 0.28); ctx.lineWidth = 0.8;
      ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2); ctx.stroke();
      ctx.beginPath(); ctx.arc(cx, cy, R * 0.55, 0, Math.PI * 2); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(cx - R, cy); ctx.lineTo(cx + R, cy); ctx.moveTo(cx, cy - R); ctx.lineTo(cx, cy + R); ctx.stroke();
      // 扫掠扇区
      var sweep = ctx.createRadialGradient(cx, cy, 1, cx, cy, R);
      sweep.addColorStop(0, ac(g, 0.55));
      sweep.addColorStop(1, ac(g, 0));
      ctx.fillStyle = sweep;
      ctx.beginPath(); ctx.moveTo(cx, cy); ctx.arc(cx, cy, R, a - 0.5, a); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = ac(g, 0.8); ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + Math.cos(a) * R, cy + Math.sin(a) * R); ctx.stroke();
      // 目标点
      ctx.fillStyle = sc(g, 0.9);
      ctx.beginPath(); ctx.arc(cx + 9, cy - 7, 1.5, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    }
  });

  /* 均衡器 */
  TG.register('deco', {
    id: 'eq', name: '均衡器', hint: '底部跳动的频谱柱（动）', layer: 'motion',
    draw: function (g, t) {
      var ctx = g.ctx, n = 14, x0 = 150, base = H - 20;
      ctx.save();
      for (var i = 0; i < n; i++) {
        var h = 3 + Math.abs(Math.sin(t / 260 + i * 0.7)) * 11;
        ctx.fillStyle = i % 3 === 0 ? ac(g, 0.85) : sc(g, 0.6);
        ctx.fillRect(x0 + i * 6, base - h, 3.4, h);
      }
      ctx.restore();
    }
  });

  /* 轨道点 */
  TG.register('deco', {
    id: 'orbit', name: '轨道点', hint: '绕徽记旋转的小点（动）', layer: 'motion',
    draw: function (g, t) {
      var ctx = g.ctx, cx = 54, cy = 80, R = 36;
      ctx.save();
      for (var i = 0; i < 3; i++) {
        var a = t / 900 + i * Math.PI * 2 / 3;
        var x = cx + Math.cos(a) * R, y = cy + Math.sin(a) * R * 0.62;
        ctx.fillStyle = i === 0 ? ac(g, 0.9) : sc(g, 0.7);
        ctx.beginPath(); ctx.arc(x, y, 1.6 + (i === 0 ? 0.6 : 0), 0, Math.PI * 2); ctx.fill();
      }
      ctx.restore();
    }
  });

  /* 流动虚线 */
  TG.register('deco', {
    id: 'marching', name: '流动虚线', hint: '顶部走动的虚线（动）', layer: 'motion',
    draw: function (g, t) {
      var ctx = g.ctx;
      ctx.save();
      ctx.setLineDash([10, 7]);
      ctx.lineDashOffset = -(t / 28) % 17;
      ctx.strokeStyle = ac(g, 0.42); ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(30, 15.5); ctx.lineTo(W - 30, 15.5); ctx.stroke();
      ctx.restore();
    }
  });

  /* 运行计时 */
  TG.register('deco', {
    id: 'counter', name: '运行计时', hint: '右上持续走表的计时（动）', layer: 'motion',
    draw: function (g, t) {
      var ctx = g.ctx;
      var total = Math.floor(loop(t, 60000) * 60);      // 0~59 秒循环，1 秒一个真秒的 1/25
      var mm = String(Math.floor(total / 60)).padStart(2, '0');
      var ss = String(total % 60).padStart(2, '0');
      ctx.save();
      ctx.textAlign = 'right'; ctx.textBaseline = 'alphabetic';
      ctx.font = '700 8px ' + MONO;
      ctx.fillStyle = sc(g, 0.65);
      ctx.fillText(mm + ':' + ss, W - 22, 44);
      ctx.restore();
    }
  });

  /* 状态灯 */
  TG.register('deco', {
    id: 'status', name: '状态灯', hint: '左上三灯轮播 + LIVE（动）', layer: 'motion',
    draw: function (g, t) {
      var ctx = g.ctx, step = Math.floor(t / 400) % 3;
      ctx.save();
      for (var i = 0; i < 3; i++) {
        ctx.fillStyle = i === step ? ac(g, 0.95) : sc(g, 0.22);
        ctx.beginPath(); ctx.arc(26 + i * 7, 34, 2.1, 0, Math.PI * 2); ctx.fill();
      }
      ctx.font = '700 7px ' + MONO; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
      ctx.fillStyle = sc(g, 0.6);
      ctx.fillText('LIVE', 48, 34);
      ctx.restore();
    }
  });

  /* 打字机 */
  TG.register('deco', {
    id: 'typing', name: '日志打字', hint: '底部滚动打字的日志行（动）', layer: 'motion',
    draw: function (g, t) {
      var ctx = g.ctx;
      var lines = g.stack.typingLines || ['> CONNECT OK', '> SCAN TARGET', '> LOAD ARCHIVE', '> LOCK TIER'];
      var idx = Math.floor(t / 1200) % lines.length;
      var txt = lines[idx] || '';
      var n = Math.min(txt.length, Math.floor(loop(t, 1200) * (txt.length + 4)));
      ctx.save();
      ctx.font = '600 7.5px ' + MONO; ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
      ctx.fillStyle = sc(g, 0.62);
      ctx.fillText(txt.slice(0, n), 26, H - 12);
      if (Math.floor(t / 400) % 2 === 0) {
        ctx.fillStyle = ac(g, 0.8);
        ctx.fillRect(26 + ctx.measureText(txt.slice(0, n)).width + 1, H - 19, 4, 8);
      }
      ctx.restore();
    }
  });

  /* 扫描条（竖向） */
  TG.register('deco', {
    id: 'scanbar', name: '扫描条', hint: '左右扫过的竖光条（动）', layer: 'motion',
    draw: function (g, t) {
      var ctx = g.ctx, p = loop(t, 2400);
      var x = 8 + p * (W - 16);
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      var gd = ctx.createLinearGradient(x - 14, 0, x + 14, 0);
      gd.addColorStop(0, ac(g, 0)); gd.addColorStop(0.5, ac(g, 0.28)); gd.addColorStop(1, ac(g, 0));
      ctx.fillStyle = gd;
      ctx.fillRect(x - 14, 6, 28, H - 12);
      ctx.restore();
    }
  });

  /* ================= 新动效 ================= */

  /* 光漏 */
  TG.register('motion', {
    id: 'leak', name: '光漏', hint: '整片斜光缓慢扫过',
    draw: function (g, t) {
      var ctx = g.ctx, p = loop(t, 3200);
      var x = -200 + p * (W + 400);
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      var gd = ctx.createLinearGradient(x - 150, 0, x + 150, H * 0.4);
      gd.addColorStop(0, ac(g, 0));
      gd.addColorStop(0.45, ac(g, 0.14));
      gd.addColorStop(0.5, ac(g, 0.22));
      gd.addColorStop(0.55, ac(g, 0.14));
      gd.addColorStop(1, ac(g, 0));
      ctx.fillStyle = gd;
      ctx.fillRect(0, 0, W, H);
      ctx.restore();
    }
  });

  /* 六边脉冲 */
  TG.register('motion', {
    id: 'hexpulse', name: '六边脉冲', hint: '六边形波纹向外扩散',
    draw: function (g, t) {
      var ctx = g.ctx;
      ctx.save();
      for (var k = 0; k < 3; k++) {
        var p = loop(t + k * 700, 2100);
        ctx.strokeStyle = ac(g, 0.34 * (1 - p));
        ctx.lineWidth = 1;
        TG.hexPath(ctx, 54, 80, 20 + p * 90, 6);
        ctx.stroke();
      }
      ctx.restore();
    }
  });

  /* 火星 */
  TG.register('motion', {
    id: 'ember', name: '火星', hint: '暖色火星上升并闪烁',
    draw: function (g, t) {
      var ctx = g.ctx, r = g.rand;
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      for (var i = 0; i < 12; i++) {
        var x = 30 + r() * (W - 60);
        var ph = r() * 1000;
        var p = loop(t + ph, 2600);
        var y = H - 20 - p * (H - 30);
        var a = Math.sin(p * Math.PI) * (0.4 + 0.5 * Math.abs(Math.sin(t / 180 + i)));
        ctx.fillStyle = css('#ff9a3c', a * 0.9);
        ctx.beginPath(); ctx.arc(x + Math.sin(t / 400 + i) * 3, y, 1 + r() * 1.1, 0, Math.PI * 2); ctx.fill();
      }
      ctx.restore();
    }
  });

  /* 灰烬 */
  TG.register('motion', {
    id: 'ash', name: '灰烬', hint: '灰白碎屑缓缓飘落',
    draw: function (g, t) {
      var ctx = g.ctx, r = g.rand;
      ctx.save();
      for (var i = 0; i < 18; i++) {
        var x0 = 20 + r() * (W - 40);
        var ph = r() * 1000;
        var p = loop(t + ph, 3000);
        var y = -10 + p * (H + 20);
        var a = Math.sin(p * Math.PI) * 0.5;
        ctx.fillStyle = 'rgba(220,226,236,' + a.toFixed(3) + ')';
        ctx.fillRect(x0 + Math.sin(t / 700 + i) * 4, y, 1.3, 1.3);
      }
      ctx.restore();
    }
  });

  /* 波浪光带 */
  TG.register('motion', {
    id: 'wave', name: '波浪带', hint: '底部起伏的波浪光带',
    draw: function (g, t) {
      var ctx = g.ctx;
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.beginPath();
      ctx.moveTo(0, H - 8);
      for (var x = 0; x <= W; x += 8) {
        var y = H - 22 + Math.sin(x / 46 + t / 240) * 6;
        ctx.lineTo(x, y);
      }
      ctx.lineTo(W, H - 8); ctx.closePath();
      var gd = ctx.createLinearGradient(0, H - 30, 0, H - 4);
      gd.addColorStop(0, ac(g, 0.18)); gd.addColorStop(1, ac(g, 0));
      ctx.fillStyle = gd; ctx.fill();
      ctx.restore();
    }
  });

  /* 微抖动 */
  TG.register('motion', {
    id: 'shake', name: '微抖动', hint: '整卡极轻微的位移错觉',
    draw: function (g, t) {
      var base = g.base, ctx = g.ctx, S = g.S;
      var amp = 1.1;
      var dx = Math.sin(t / 70) * amp, dy = Math.cos(t / 53) * amp * 0.7;
      ctx.save();
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.globalAlpha = 0.35;
      ctx.drawImage(base.canvas, dx * S, dy * S);
      ctx.restore();
    }
  });

  /* 频谱 */
  TG.register('motion', {
    id: 'spectrum', name: '频谱', hint: '底部密集频谱条',
    draw: function (g, t) {
      var ctx = g.ctx, n = 40, x0 = 26, step = (W - 52) / n;
      ctx.save();
      for (var i = 0; i < n; i++) {
        var h = 1.5 + Math.abs(Math.sin(t / 200 + i * 0.55) * Math.cos(t / 640 + i * 0.2)) * 8;
        ctx.fillStyle = i % 4 === 0 ? ac(g, 0.8) : sc(g, 0.5);
        ctx.fillRect(x0 + i * step, H - 10 - h, step * 0.62, h);
      }
      ctx.restore();
    }
  });

  /* 追光 */
  TG.register('motion', {
    id: 'spotlight', name: '追光', hint: '一团柔光在牌面上游走',
    draw: function (g, t) {
      var ctx = g.ctx;
      var cx = W * 0.5 + Math.cos(t / 1500) * W * 0.28;
      var cy = H * 0.5 + Math.sin(t / 1100) * H * 0.22;
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      var rg = ctx.createRadialGradient(cx, cy, 4, cx, cy, 120);
      rg.addColorStop(0, ac(g, 0.16)); rg.addColorStop(1, ac(g, 0));
      ctx.fillStyle = rg; ctx.fillRect(0, 0, W, H);
      ctx.restore();
    }
  });

  /* 网格漂移 */
  TG.register('motion', {
    id: 'gridshift', name: '网格漂移', hint: '横向细线缓慢漂移',
    draw: function (g, t) {
      var ctx = g.ctx, off = (t / 22) % 8;
      ctx.save();
      ctx.strokeStyle = sc(g, 0.10); ctx.lineWidth = 0.8;
      for (var y = -8 + off; y < H; y += 8) {
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
      }
      ctx.restore();
    }
  });
})();
