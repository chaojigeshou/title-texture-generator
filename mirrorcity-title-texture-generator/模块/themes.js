/* ============================================================
 * themes.js — 主题 token
 * 模块仍然负责“画什么”，主题负责“用什么气质画”。
 * 新模块优先使用 g.theme，旧模块保持原有表现不变。
 * ============================================================ */
(function () {
  'use strict';
  var TG = window.TG;

  var THEMES = [
    {
      id: 'default', name: '都市默认', tag: '基础',
      accent: '#ffd75e', secondary: '#5aa9ff', ink: '#07101a',
      line: 1, radius: 12, glow: 1, density: 1, motion: 1
    },
    {
      id: 'terminal', name: '终端协议', tag: '科技',
      accent: '#57e6c1', secondary: '#57a9ff', ink: '#041016',
      line: 1, radius: 4, glow: 1.25, density: 1.15, motion: 1.15
    },
    {
      id: 'noir', name: '雨夜黑箱', tag: '黑箱',
      accent: '#b7c8e8', secondary: '#7c91c5', ink: '#080b13',
      line: 0.9, radius: 16, glow: 0.85, density: 1.2, motion: 0.85
    },
    {
      id: 'hazard', name: '危险管制', tag: '警示',
      accent: '#ffb13b', secondary: '#e83d4b', ink: '#110b06',
      line: 1.15, radius: 8, glow: 1.05, density: 1.35, motion: 1.05
    },
    {
      id: 'frost', name: '冷冻档案', tag: '冷色',
      accent: '#b9f4ff', secondary: '#6ca8ff', ink: '#07121d',
      line: 0.8, radius: 14, glow: 1.1, density: 0.9, motion: 0.7
    },
    {
      id: 'void', name: '空洞侵蚀', tag: '扭曲',
      accent: '#d18cff', secondary: '#ff4f9a', ink: '#100613',
      line: 1.25, radius: 10, glow: 1.4, density: 1.4, motion: 1.3
    }
  ];

  var byId = {};
  THEMES.forEach(function (t) { byId[t.id] = t; });
  TG.themes = THEMES;
  TG.theme = function (id) { return byId[id] || byId.default; };
})();
