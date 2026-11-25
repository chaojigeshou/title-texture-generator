/* ============================================================
 * mod-kinetic.js — 几何字材与机械动效
 * 字材只在独立标题层内雕刻；动态变形始终同步映射当前字像与掩膜。
 * 动态路径不创建画布、不读取像素、不重新测字。
 * ============================================================ */
(function () {
  'use strict';
  var TG = window.TG, TAU = Math.PI * 2;
  var clamp = TG.clamp, mix = TG.mix;
  var mechanicalPalettes = new WeakMap();

  function phase(g, t) {
    var p = Number.isFinite(g.loopPhase) ? g.loopPhase : (Number(t) || 0) / 2400;
    return ((p % 1) + 1) % 1;
  }
  function ease(p) {
    p = clamp(p, 0, 1);
    return p * p * (3 - 2 * p);
  }
  function titleSize(L) {
    if (!L.main) return L.fB || L.fA || 32;
    if (!L.suffix) return L.fA || 32;
    return Math.min(L.fA, L.fB);
  }
  function paper(g) {
    return g.stack.bg === 'paper' || g.stack.plate === 'paper';
  }
  function mechanical(g) {
    var p = mechanicalPalettes.get(g.pal);
    if (!p) {
      p = {
        dark: mix(g.pal.base, '#060b13', 0.80),
        body: mix(g.pal.base, '#263141', 0.58),
        blade: mix(g.pal.base, '#a9b7c7', 0.48),
        edge: mix(g.pal.base, '#ffffff', 0.68),
        pin: mix(g.pal.base, '#ffffff', 0.88),
        rail: mix(g.pal.base, '#637185', 0.54)
      };
      mechanicalPalettes.set(g.pal, p);
    }
    return p;
  }
  function circle(ctx, x, y, radius) {
    ctx.beginPath(); ctx.arc(x, y, radius, 0, TAU);
  }

  TG.register('text', {
    id: 'dotmatrix', name: '点阵字', collection: 'distinct', isolated: true, maskFromTitle: true,
    hint: '用规则圆点切出字形；圆点之间真正透明，点距随字号调整。',
    params: [
      { key: 'spacing', label: '圆点间距', min: 0.65, max: 1.6, step: 0.05, default: 1, unit: '倍',
        hint: '调整圆点排列的疏密；较小字号仍保留至少 1.5 px 的点距。' },
      { key: 'fill', label: '圆点半径', min: 0.22, max: 0.48, step: 0.02, default: 0.4, unit: '× 点距',
        hint: '半径越大，笔画越饱满；圆点之间仍留透明间隙。' }
    ],
    draw: function (g) {
      var ctx = g.ctx, L = g.L, size = titleSize(L);
      var params = TG.moduleParams.values(g.stack, 'text', 'dotmatrix');
      var pitch = clamp(size * 0.105, 2, 4.2);
      if (params.spacing !== 1) pitch = Math.max(1.5, pitch * params.spacing);
      var radius = pitch * params.fill;
      var top = L.baseline - Math.max(L.fA || 0, L.fB || 0) * 1.06 - 5;
      var bottom = L.baseline + Math.max(L.fA || 0, L.fB || 0) * 0.30 + 5;
      var left = Math.floor((L.ax - 8) / pitch) * pitch;
      var right = L.ax + L.total + 10;
      ctx.save();
      try {
        TG.paintTitle(g, { fill: paper(g) ? '#253344' : mix(g.pal.base, '#ffffff', 0.70) });
        // 一次并集掩膜；逐个 destination-in 圆点会抹掉前面的圆点。
        ctx.globalCompositeOperation = 'destination-in';
        ctx.globalAlpha = 1; ctx.shadowBlur = 0; ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        for (var y = Math.floor(top / pitch) * pitch; y <= bottom; y += pitch) {
          for (var x = left; x <= right; x += pitch) {
            ctx.moveTo(x + radius, y); ctx.arc(x, y, radius, 0, TAU);
          }
        }
        ctx.fill();
      } finally { ctx.restore(); }
    }
  });

  TG.register('text', {
    id: 'extrude', name: '立体铸字', collection: 'distinct', isolated: true, maskFromTitle: true,
    hint: '连续叠出的实体侧壁与正面字面，形成向右下方延伸的立体厚度。',
    params: [{ key: 'depth', label: '侧壁厚度', min: 0.35, max: 1.8, step: 0.05, default: 1, unit: '倍',
      hint: '调整字面向右下延伸的厚度，实际厚度最多 10 px。' }],
    draw: function (g) {
      var ctx = g.ctx, depth = clamp(titleSize(g.L) * 0.13, 2, 6.5);
      var params = TG.moduleParams.values(g.stack, 'text', 'extrude');
      if (params.depth !== 1) depth = Math.min(10, depth * params.depth);
      var light = paper(g), count = Math.ceil(depth * 2);
      ctx.save();
      try {
        for (var i = count; i > 0; i--) {
          var d = depth * i / count;
          ctx.save();
          try {
            ctx.translate(d, d * 0.72);
            TG.paintTitle(g, {
              fill: mix(g.pal.base, light ? '#182432' : '#07101e', 0.30 + i / count * 0.50),
              stroke: light ? '#17202d' : '#050a12', strokeWidth: 0.8
            });
          } finally { ctx.restore(); }
        }
        TG.paintTitle(g, {
          fill: mix(g.pal.base, '#ffffff', light ? 0.35 : 0.72),
          stroke: light ? '#263244' : mix(g.pal.base, '#0a1120', 0.55),
          strokeWidth: 1.25, topHighlight: 'rgba(255,255,255,0.80)'
        });
      } finally { ctx.restore(); }
    }
  });

  function bridgeCuts(ctx, L, text, x, size, gap) {
    if (!text) return;
    var chars = TG.graphemes(text), prefix = '', offset = 0;
    var slot = clamp(size * 0.038, 0.65, 1.8);
    if (gap !== 1) slot *= gap;
    ctx.font = '700 ' + size + 'px ' + (L.font || TG.FONT);
    for (var i = 0; i < chars.length; i++) {
      prefix += chars[i];
      var next = ctx.measureText(prefix).width, width = next - offset;
      if (chars[i].trim() && width > slot * 3.5) {
        var cutX = x + offset + width * (i % 2 ? 0.62 : 0.40);
        ctx.fillRect(cutX - slot / 2, L.baseline - size * 0.98, slot, size * 1.22);
        if (i % 2 && width > size * 0.55) {
          ctx.fillRect(x + offset, L.baseline - size * 0.45, width * 0.64, slot);
        }
      }
      offset = next;
    }
  }
  TG.register('text', {
    id: 'stencil', name: '桥接模板字', collection: 'distinct', isolated: true, maskFromTitle: true,
    hint: '在每个字的笔画中切出桥接槽，像可喷印的实体模板；槽口保持透明。',
    params: [{ key: 'gap', label: '桥接槽宽度', min: 0.5, max: 2, step: 0.1, default: 1, unit: '倍',
      hint: '调整笔画上的透明槽口；窄字仍按实际字宽保留笔画。' }],
    draw: function (g) {
      var ctx = g.ctx, L = g.L;
      var params = TG.moduleParams.values(g.stack, 'text', 'stencil');
      ctx.save();
      try {
        TG.paintTitle(g, { fill: paper(g) ? '#273244' : mix(g.pal.base, '#ffffff', 0.78) });
        ctx.globalCompositeOperation = 'destination-out';
        ctx.globalAlpha = 1; ctx.shadowBlur = 0; ctx.fillStyle = '#ffffff';
        // 仅构建静态字材时测量；动效直接使用已切好的字像。
        bridgeCuts(ctx, L, L.main, L.ax, L.fA, params.gap);
        bridgeCuts(ctx, L, L.suffix, L.bx, L.fB, params.gap);
      } finally { ctx.restore(); }
    }
  });

  TG.register('motion', {
    id: 'splitflap', name: '翻页字牌', collection: 'distinct', duration: 2400,
    hint: '把当前可见文字分块，依次绕水平铰链翻面再归位；可与打字机、渐变组合。',
    params: [{ key: 'panels', label: '翻牌分块', min: 0, max: 12, step: 1, default: 0, type: 'select',
      options: [{ value: 0, label: '随文字自动' }, { value: 2, label: '2 块' }, { value: 3, label: '3 块' },
        { value: 4, label: '4 块' }, { value: 6, label: '6 块' }, { value: 8, label: '8 块' },
        { value: 10, label: '10 块' }, { value: 12, label: '12 块' }],
      hint: '自动按文字宽度分块；手动分块会同时作用于标题和光效遮罩。' }],
    draw: function () {}, // 旧模块审计兼容；实际绘制仅走 transformTitle。
    transformTitle: function (g, t, io) {
      var ctx = io.targetCtx, mask = io.targetMaskCtx;
      var width = io.width, height = io.height, S = g.S || 1, bb = g.L.bbox;
      var left = clamp(Math.floor(bb.x * S), 0, width - 1);
      var right = clamp(Math.ceil((bb.x + bb.w) * S), left + 1, width);
      var count = clamp(Math.ceil((right - left) / (Math.max(26, titleSize(g.L) * 0.85) * S)), 2, 12);
      var params = TG.moduleParams.values(g.stack, 'motion', 'splitflap');
      if (params.panels !== 0) count = params.panels;
      var hinge = clamp((bb.y + bb.h * 0.5) * S, 0, height), p = phase(g, t);
      ctx.save(); mask.save();
      try {
        ctx.imageSmoothingEnabled = mask.imageSmoothingEnabled = true;
        for (var i = 0; i < count; i++) {
          // 首尾块包含全部外围透明区与字材晕边，不遗留完整标题的底像。
          var x = i ? Math.floor(left + (right - left) * i / count) : 0;
          var end = i === count - 1 ? width : Math.floor(left + (right - left) * (i + 1) / count);
          var start = 0.08 + i / (count - 1) * 0.18;
          var local = (p - start) / 0.34;
          var scaleY = local <= 0 || local >= 1 ? 1 : Math.cos(TAU * ease(local));
          if (Math.abs(scaleY) < 0.025 || end <= x) continue;
          var shiftY = hinge * (1 - scaleY);
          ctx.setTransform(1, 0, 0, scaleY, 0, shiftY);
          mask.setTransform(1, 0, 0, scaleY, 0, shiftY);
          ctx.drawImage(io.source, x, 0, end - x, height, x, 0, end - x, height);
          mask.drawImage(io.sourceMask, x, 0, end - x, height, x, 0, end - x, height);
          if (scaleY < 0.995) {
            ctx.globalCompositeOperation = 'source-atop';
            ctx.globalAlpha = (1 - Math.abs(scaleY)) * 0.40 + (scaleY < 0 ? 0.17 : 0);
            ctx.fillStyle = '#07101c'; ctx.fillRect(x, 0, end - x, height);
            ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
          }
        }
      } finally { mask.restore(); ctx.restore(); }
    }
  });

  TG.register('motion', {
    id: 'liquidwarp', name: '液面折射', collection: 'distinct', duration: 2400,
    hint: '细横条沿连续波面错移和伸缩，让笔画像透过流动水面；不添加底色。',
    params: [{ key: 'strength', label: '折射幅度', min: 0, max: 2, step: 0.05, default: 1, unit: '倍',
      hint: '0 保持原位；增大后仍受标题两侧空余位置限制。' }],
    draw: function () {},
    transformTitle: function (g, t, io) {
      var ctx = io.targetCtx, mask = io.targetMaskCtx, S = g.S || 1;
      var width = io.width, height = io.height, strips = Math.min(96, height);
      var bb = g.L.bbox, edgeRoom = Math.max(0, Math.min(bb.x, g.W - bb.x - bb.w));
      var amplitude = Math.min(6, edgeRoom * 0.8) * S;
      var p = phase(g, t) * TAU, vertical = 2.8 * S * Math.sin(p);
      var params = TG.moduleParams.values(g.stack, 'motion', 'liquidwarp');
      if (params.strength !== 1) {
        amplitude = Math.min(6 * params.strength, edgeRoom * 0.8) * S;
        vertical *= params.strength;
      }
      ctx.save(); mask.save();
      try {
        ctx.imageSmoothingEnabled = mask.imageSmoothingEnabled = true;
        for (var i = 0; i < strips; i++) {
          var y0 = Math.floor(i * height / strips), y1 = Math.floor((i + 1) * height / strips);
          var n0 = y0 / height, n1 = y1 / height, mid = (n0 + n1) * 0.5;
          var dx = amplitude * (Math.sin(mid * TAU * 1.25 + p) + 0.28 * Math.sin(mid * TAU * 2.5 - p * 2)) / 1.28;
          var out0 = y0 + vertical * Math.sin(Math.PI * n0);
          var out1 = y1 + vertical * Math.sin(Math.PI * n1);
          ctx.drawImage(io.source, 0, y0, width, y1 - y0, dx, out0, width, out1 - out0);
          mask.drawImage(io.sourceMask, 0, y0, width, y1 - y0, dx, out0, width, out1 - out0);
        }
      } finally { mask.restore(); ctx.restore(); }
    }
  });

  TG.register('deco', {
    id: 'iris', name: '机械光圈', collection: 'distinct', layer: 'motion', duration: 2400,
    hint: '八枚实体叶片围绕徽记开合，中心孔径随周期变化；无徽记时显示小型机械器件。',
    params: [{ key: 'opening', label: '光圈开合', min: 0.25, max: 1.5, step: 0.05, default: 1, unit: '倍',
      hint: '调整孔径变化幅度，最大孔径始终位于叶片内缘以内。' }],
    draw: function (g, t) {
      var ctx = g.ctx, a = g.L.badge, pal = mechanical(g), bb = g.L.bbox;
      var visible = !a || a.visible, scale = a && a.scale || 1;
      var radius = (visible ? 40 : 20) * scale;
      var cx = a ? a.x : 54, cy = a ? a.y : 80;
      if (!visible && bb && cx + radius > bb.x && cx - radius < bb.x + bb.w && cy + radius > bb.y && cy - radius < bb.y + bb.h) {
        if (bb.x >= radius * 2 + 12) cx = Math.min(cx, bb.x - radius - 6);
        else { radius = Math.min(radius, 16); cx = radius + 6; cy = radius + 6; }
      }
      cx = clamp(cx, radius + 3, g.W - radius - 3);
      cy = clamp(cy, radius + 3, g.H - radius - 3);
      var open = 0.5 - 0.5 * Math.cos(phase(g, t) * TAU);
      var inner = radius * (0.39 + open * 0.29), twist = 0.23 + open * 0.26;
      var params = TG.moduleParams.values(g.stack, 'deco', 'iris');
      if (params.opening !== 1) {
        var spread = open * params.opening;
        inner = Math.min(radius * (0.39 + spread * 0.29), Math.max(radius * 0.39, radius - 3 - Math.max(0.6, scale)));
        twist = 0.23 + spread * 0.26;
      }
      var bladeOuter = radius - 3, step = TAU / 8;
      ctx.save();
      try {
        ctx.lineJoin = 'round'; ctx.lineWidth = Math.max(0.7, scale * 0.8);
        for (var i = 0; i < 8; i++) {
          var angle = i * step - Math.PI / 2;
          ctx.beginPath();
          ctx.moveTo(cx + bladeOuter * Math.cos(angle), cy + bladeOuter * Math.sin(angle));
          ctx.lineTo(cx + bladeOuter * Math.cos(angle + step * 1.15), cy + bladeOuter * Math.sin(angle + step * 1.15));
          ctx.lineTo(cx + inner * Math.cos(angle + step + twist), cy + inner * Math.sin(angle + step + twist));
          ctx.lineTo(cx + inner * Math.cos(angle + twist), cy + inner * Math.sin(angle + twist));
          ctx.closePath();
          ctx.fillStyle = i % 2 ? pal.blade : pal.body; ctx.fill();
          ctx.strokeStyle = pal.dark; ctx.stroke();
        }
        circle(ctx, cx, cy, radius - 1.4); ctx.strokeStyle = pal.dark; ctx.lineWidth = 4 * scale; ctx.stroke();
        circle(ctx, cx, cy, radius - 1.4); ctx.strokeStyle = pal.edge; ctx.lineWidth = 1.1 * scale; ctx.stroke();
        ctx.fillStyle = pal.pin;
        for (var j = 0; j < 4; j++) {
          var bolt = j * Math.PI / 2 + Math.PI / 4;
          circle(ctx, cx + (radius - 1.4) * Math.cos(bolt), cy + (radius - 1.4) * Math.sin(bolt), Math.max(0.7, 1.1 * scale));
          ctx.fill();
        }
      } finally { ctx.restore(); }
    }
  });

  TG.register('deco', {
    id: 'linkage', name: '往复连杆', collection: 'distinct', layer: 'motion', duration: 2400,
    hint: '曲柄旋转带动刚性连杆与滑块往复运动，安装在构图的底部轨道。',
    params: [{ key: 'stroke', label: '滑块行程', min: 0.4, max: 1.2, step: 0.1, default: 1, unit: '倍',
      hint: '调整曲柄半径与往复距离，连杆始终长于曲柄，机械结构保持在底部轨道内。' }],
    draw: function (g, t) {
      var ctx = g.ctx, lane = g.L.lanes && g.L.lanes.bottom, pal = mechanical(g);
      var x = lane ? lane.x : 160, y = lane ? lane.y : 148;
      var width = Math.min(lane ? lane.w : 260, g.W - x - 4);
      if (width < 28) return;
      var span = Math.min(width, 180), radius = Math.min(8, span * 0.065);
      var params = TG.moduleParams.values(g.stack, 'deco', 'linkage');
      if (params.stroke !== 1) radius = Math.min(radius * params.stroke, (span - 18) / 3 - 0.1);
      var cy = clamp(y, radius + 4, g.H - radius - 4), cx = x + radius + 4;
      var rod = Math.min(68, span - radius * 2 - 18), theta = phase(g, t) * TAU;
      var pinX = cx + radius * Math.cos(theta), pinY = cy + radius * Math.sin(theta);
      var sliderX = cx + radius * Math.cos(theta) + Math.sqrt(rod * rod - Math.pow(radius * Math.sin(theta), 2));
      var railStart = cx + rod - radius - 7, railEnd = cx + rod + radius + 7;
      ctx.save();
      try {
        ctx.beginPath(); ctx.rect(x, cy - radius - 3, width, radius * 2 + 6); ctx.clip();
        ctx.lineCap = 'round'; ctx.lineJoin = 'round';
        ctx.strokeStyle = pal.rail; ctx.lineWidth = 1.3;
        ctx.beginPath();
        ctx.moveTo(railStart, cy - 5); ctx.lineTo(railEnd, cy - 5);
        ctx.moveTo(railStart, cy + 5); ctx.lineTo(railEnd, cy + 5); ctx.stroke();
        circle(ctx, cx, cy, radius); ctx.fillStyle = pal.dark; ctx.fill(); ctx.strokeStyle = pal.edge; ctx.stroke();
        ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(pinX, pinY); ctx.strokeStyle = pal.blade; ctx.lineWidth = 2.3; ctx.stroke();
        ctx.fillStyle = pal.dark; ctx.fillRect(sliderX - 5, cy - 3.7, 10, 7.4);
        ctx.strokeStyle = pal.edge; ctx.lineWidth = 0.9; ctx.strokeRect(sliderX - 5, cy - 3.7, 10, 7.4);
        ctx.beginPath(); ctx.moveTo(pinX, pinY); ctx.lineTo(sliderX, cy);
        ctx.strokeStyle = pal.dark; ctx.lineWidth = 4.4; ctx.stroke();
        ctx.strokeStyle = pal.blade; ctx.lineWidth = 2.3; ctx.stroke();
        ctx.fillStyle = pal.pin;
        circle(ctx, cx, cy, 1.6); ctx.fill();
        circle(ctx, pinX, pinY, 1.7); ctx.fill();
        circle(ctx, sliderX, cy, 1.6); ctx.fill();
      } finally { ctx.restore(); }
    }
  });
})();
