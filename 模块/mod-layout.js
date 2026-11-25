/* 构图模块：调整文字位置和徽记锚点，保留固定的 560×160 输出尺寸。 */
(function () {
  'use strict';
  var TG = window.TG;
  TG.register('layout', { id: 'inline', name: '经典横排',
    hint: '保留原有左徽记、主字与后缀同排的构图；旧配置自动使用此项。', draw: function () {} });

  function slot(part, x, width, baseline, size, align) {
    return { part: part, x: x, width: Math.max(24, width), baseline: baseline, size: size, minSize: 18, align: align || 'left' };
  }
  function arrange(kind, item, stack, c) {
    var badge = { x: 54, y: 80, scale: 1, visible: !!(stack.badge && stack.badge !== 'none') };
    var left = Math.max(c.left, badge.visible ? 110 : c.left), right = c.right;
    var top = c.top, bottom = c.bottom - (stack.subline !== false ? 12 : 0), height = bottom - top, slots = [], guide = null;
    var mainY = top + Math.min(44, height * 0.46), subY = bottom - 3;
    if (kind === 'reverse') {
      badge.x = c.right - 24; badge.scale = 0.9;
      left = c.left + 5; right = badge.visible ? c.right - 76 : c.right;
      slots = [slot('main', left, right - left, mainY, 42, 'right'), slot('suffix', left, right - left, subY, 25, 'right')];
      guide = { type: 'rule', x: right - 58, y: mainY + 11, w: 58 };
    } else if (kind === 'centered') {
      badge.x = (c.left + c.right) / 2; badge.y = 27; badge.scale = 0.48;
      left = c.left + 9; right = c.right - 9;
      mainY = Math.max(top + 48, 88);
      slots = [slot('main', left, right - left, mainY, Math.min(40, height * 0.44), 'center'),
        slot('suffix', left, right - left, bottom - 2, 22, 'center')];
      guide = { type: 'wings', x: (left + right) / 2, y: bottom - 12, w: Math.min(330, right - left) };
    } else if (kind === 'split') {
      var span = right - left, cut = left + span * 0.62;
      var ratio = TG.moduleParams.values(stack, 'layout', 'split').dividerRatio;
      var mainWidth = span * 0.57, suffixWidth = span * 0.38 - 18;
      // 默认值保留原乘法与加法顺序；非默认值只移动分栏边界。
      if (ratio !== 0.62) {
        var delta = span * (ratio - 0.62);
        cut += delta; mainWidth += delta; suffixWidth -= delta;
      }
      slots = [slot('main', left, mainWidth, top + height * 0.65, 40),
        slot('suffix', cut + 18, suffixWidth, top + height * 0.70, 30, 'center')];
      guide = { type: 'divider', x: cut + 3, y: top + 8, h: height - 14 };
    } else if (kind === 'stepped') {
      slots = [slot('main', left, (right - left) * 0.90, mainY, 40),
        slot('suffix', left + 42, right - left - 42, subY, 30, 'right')];
      guide = { type: 'step', x: left, y: mainY + 12, w: Math.min(100, (right - left) * 0.35), h: Math.max(6, subY - mainY - 20) };
    } else if (kind === 'vertical') {
      slots = [slot('main', left + 48, right - left - 48, top + height * 0.64, 42),
        { part: 'suffix', vertical: true, x: left, width: 30, top: top + 2, height: height - 6, size: 23, minSize: 12 }];
      guide = { type: 'divider', x: left + 37, y: top + 3, h: height - 7 };
    } else {
      slots = [slot('main', left, right - left, mainY, 43), slot('suffix', left + 2, right - left - 2, subY, 23)];
      guide = { type: 'rule', x: left, y: mainY + 11, w: Math.min(76, right - left) };
    }
    // 单独填写主字或后缀时，空白段不占位置，保留一个完整的标题。
    if (!item.main || !item.suffix) {
      var part = item.main ? 'main' : 'suffix';
      slots = [slot(part, left, right - left, top + height * 0.65, 42, kind === 'reverse' ? 'right' : 'center')];
      guide = null;
    }
    slots.forEach(function (s) { if (!s.vertical) s.size = Math.max(s.minSize || 18, Math.min(s.size, s.baseline - top)); });
    var decos = stack.decos || [], subLeft = left;
    if (decos.indexOf('patchCable') >= 0) subLeft = Math.max(subLeft, 158);
    if (decos.indexOf('linkage') >= 0 || decos.indexOf('progress') >= 0) subLeft = Math.max(subLeft, 292);
    subLeft = Math.min(subLeft, right - 30);
    var headerWidth = right - left - (decos.indexOf('number') >= 0 ? 90 : 0);
    return { slots: slots, badge: badge, guide: guide,
      header: { x: kind === 'centered' && badge.visible ? c.left : left, y: 20,
        width: kind === 'centered' && badge.visible ? Math.max(70, badge.x - c.left - 32) : Math.max(30, headerWidth), align: 'left' },
      subline: { x: subLeft, y: c.bottom + 1, width: Math.max(20, right - subLeft), align: 'left' } };
  }
  function guides(g) {
    var d = g.L.guide; if (!d || !g.L.main || !g.L.suffix) return;
    var ctx = g.ctx; ctx.save(); ctx.strokeStyle = TG.css(g.pal.base, 0.43); ctx.lineWidth = 1.1;
    ctx.beginPath();
    if (d.type === 'divider') { ctx.moveTo(d.x, d.y); ctx.lineTo(d.x, d.y + d.h); }
    else if (d.type === 'step') { ctx.moveTo(d.x, d.y); ctx.lineTo(d.x + d.w, d.y); ctx.lineTo(d.x + d.w, d.y + d.h); }
    else if (d.type === 'wings') {
      var gap = Math.max(28, g.L.wB / 2 + 16);
      if (gap < d.w / 2) { ctx.moveTo(d.x - d.w / 2, d.y); ctx.lineTo(d.x - gap, d.y); ctx.moveTo(d.x + gap, d.y); ctx.lineTo(d.x + d.w / 2, d.y); }
    } else { ctx.moveTo(d.x, d.y); ctx.lineTo(d.x + d.w, d.y); }
    ctx.stroke(); ctx.restore();
  }
  [
    ['stacked', '上下分层', '主标题放大置于上行，后缀独立成下行，两行分别缩放；适合文件夹、档案和长称号。'],
    ['split', '双栏对照', '主字占左栏，后缀成为右栏独立标识，中间竖线分隔；适合票券和设备面板。'],
    ['centered', '中轴冠徽', '小徽记移到上方中轴，主字和后缀分行居中；整张牌形成纵向徽章结构。'],
    ['reverse', '右徽落款', '徽记移到右端，主字与后缀分行右对齐，留出左侧呼吸空间。'],
    ['stepped', '错层阶梯', '主字靠左上、后缀靠右下，用折线组织阅读方向，适合横幅和不对称构图。'],
    ['vertical', '竖签题名', '后缀按完整字符竖排成签，主标题位于右侧；较长竖签缩小并省略，保存原文不变。']
  ].forEach(function (entry) {
    var def = { id: entry[0], name: entry[1], hint: entry[2], collection: 'distinct',
      arrange: function (item, stack, content) { return arrange(entry[0], item, stack, content); }, draw: guides };
    if (entry[0] === 'split') def.params = [{ key: 'dividerRatio', label: '分栏位置', min: 0.45, max: 0.72,
      step: 0.01, default: 0.62, hint: '调整主字与后缀的分栏比例，文字宽度和分隔线同步变化。' }];
    TG.register('layout', def);
  });
})();
