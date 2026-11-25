// 内置原创示例与运行时的自定义称号系列。
(function () {
  'use strict';
  var TG = window.TG;

  var FAMILIES = [
    {
      id: "prophet", name: "先知错（原创）", header: "PROPHET'S ERROR",
      exportPrefix: "先知错", kind: "original",
      hint: "项目原创九阶谶语，从「初闻谶语」至「万世皆错」",
      loreNote: "本项目原创称号与九阶序列，用于演示称号排版。文案、配色及编号沿用项目设计。",
      sources: [],
      items: [
        {
          key: "p9", main: "先知错", suffix: "九阶", mark: "九", roman: "IX", en: "RANK IX", desc: "初闻谶语", color: "#8fa0b8", code: "P-09", steps: [1, 9]
        },
        {
          key: "p8", main: "先知错", suffix: "八阶", mark: "八", roman: "VIII", en: "RANK VIII", desc: "夜观星错", color: "#dfe7f2", code: "P-08", steps: [2, 9]
        },
        {
          key: "p7", main: "先知错", suffix: "七阶", mark: "七", roman: "VII", en: "RANK VII", desc: "以血为墨", color: "#55d6c0", code: "P-07", steps: [3, 9]
        },
        {
          key: "p6", main: "先知错", suffix: "六阶", mark: "六", roman: "VI", en: "RANK VI", desc: "窥见裂隙", color: "#5aa9ff", code: "P-06", steps: [4, 9]
        },
        {
          key: "p5", main: "先知错", suffix: "五阶", mark: "五", roman: "V", en: "RANK V", desc: "篡改命数", color: "#a878ff", code: "P-05", steps: [5, 9]
        },
        {
          key: "p4", main: "先知错", suffix: "四阶", mark: "四", roman: "IV", en: "RANK IV", desc: "万言皆谎", color: "#ff74c8", code: "P-04", steps: [6, 9]
        },
        {
          key: "p3", main: "先知错", suffix: "三阶", mark: "三", roman: "III", en: "RANK III", desc: "先知自焚", color: "#ff4d4d", code: "P-03", steps: [7, 9]
        },
        {
          key: "p2", main: "先知错", suffix: "二阶", mark: "二", roman: "II", en: "RANK II", desc: "错者为神", color: "#ff9e2c", code: "P-02", steps: [8, 9]
        },
        {
          key: "p1", main: "先知错", suffix: "一阶", mark: "一", roman: "I", en: "RANK I", desc: "万世皆错", color: "#ffd75e", code: "P-01", steps: [9, 9]
        }
      ]
    }
  ];
  var byId = {};
  FAMILIES.forEach(function (f) {
    f.items = f.items.map(function (it) {
      it.family = f.id;
      if (!it.header) it.header = f.header;
      return it;
    });
    byId[f.id] = f;
  });

  TG.families = FAMILIES;
  TG.family = function (id) { return byId[id] || FAMILIES[0]; };
  /* 运行期追加家族（自定义称号用） */
  TG.addFamily = function (f) {
    f.items = f.items.map(function (it) {
      it.family = f.id;
      if (!it.header) it.header = f.header;
      return it;
    });
    if (byId[f.id]) {
      byId[f.id] = f;
      for (var i = 0; i < FAMILIES.length; i++) if (FAMILIES[i].id === f.id) FAMILIES[i] = f;
    } else {
      byId[f.id] = f;
      FAMILIES.push(f);
    }
    return f;
  };
})();

