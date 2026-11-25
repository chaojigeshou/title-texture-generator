/* ============================================================
 * templates.js — 模板（43 套原创视觉预设）
 *   每套模板 = 一个称号家族 + 一组模块组合。
 *   名称、徽记与说明描述原创视觉构图，不代表官方纹章、设备或剧情事件。
 *   应用模板后仍可逐个模块改动，改完即为「自定义」。
 * ============================================================ */
(function () {
  'use strict';
  var TG = window.TG;

  function T(id, name, tag, family, hint, stack) {
    return {
      id: id, name: name, tag: tag, family: family, hint: hint,
      stack: Object.assign({
        layout: 'inline', bg: 'transparent', plate: 'flat', frame: 'corner', badge: 'hex', text: 'metal',
        decos: [], motions: [], header: true, subline: true, theme: 'default'
      }, stack)
    };
  }

  var TEMPLATES = [
    T('t_fixer', '六边档案', '通用', 'prophet',
      '深色平涂、角标与六边徽记，组成便于阅读的原创档案卡',
      { decos: ['progress', 'roman'], motions: ['sheen', 'spark'] }),

    T('t_prophet', '先知错 · 夜观', '深色', 'prophet',
      '为先知错原创系列搭配夜色、玻璃底板与符文装饰',
      { bg: 'night', plate: 'glass', decos: ['progress', 'runes'], motions: ['sheen', 'spark', 'drift'] }),

    T('t_head', '黑金禁令', '黑金', 'prophet',
      '黑金底板、警示斜纹与编号方块，组成禁令告示式排版',
      { bg: 'grid', plate: 'blackgold', frame: 'hazard', badge: 'square', decos: ['number', 'stream'], motions: ['scanline', 'flicker'] }),

    T('t_warp', '奇点协议', '科技', 'prophet',
      '六边网、电路线条与全息字，组成原创技术终端视觉',
      { bg: 'hexmesh', plate: 'glass', frame: 'circuit', badge: 'square', text: 'holo', decos: ['number', 'stream', 'barcode'], motions: ['scanline', 'glitch'] }),

    T('t_abno', '收容警示', '警示', 'prophet',
      '收容箱式底板、吊牌与印章，组成异想体资料卡视觉',
      { plate: 'containment', frame: 'hazard', badge: 'tag', text: 'hollow', decos: ['number', 'seal', 'barcode'], motions: ['flicker', 'breath'] }),

    T('t_ego', '全息共振', '霓虹', 'prophet',
      '霓虹光管字、六边网与圆形徽记，搭配呼吸光和星尘',
      { bg: 'hexmesh', plate: 'neon', frame: 'neonedge', badge: 'medallion', text: 'neon', decos: ['runes', 'strip'], motions: ['breath', 'spark', 'edgebreath'] }),

    T('t_distort', '裂纹侵蚀', '裂纹', 'prophet',
      '血色雾纹、裂纹边框与故障抖动，表现画面侵蚀的设计效果',
      { bg: 'blood', plate: 'flat', frame: 'crack', badge: 'none', text: 'blood', decos: ['veins'], motions: ['glitch', 'pulse'] }),

    T('t_color', '金属徽记 · 极简', '极简', 'prophet',
      '去除底板与边框，保留圆形徽记、金属字与窄侧条',
      { plate: 'none', frame: 'none', badge: 'medallion', decos: ['strip'], motions: ['sheen', 'spark'] }),

    T('t_neon', '后巷霓虹', '霓虹', 'prophet',
      '天际线剪影、霓虹边框与吊牌，采用街边招牌式构图',
      { bg: 'skyline', plate: 'neon', frame: 'neonedge', badge: 'tag', text: 'neon', decos: ['barcode', 'stream'], motions: ['flicker', 'scanline'] }),

    T('t_paper', '都市纸档案', '纸感', 'prophet',
      '纸张纹理、墨印文字与装饰印章，组成卷宗式资料卡',
      { bg: 'paper', plate: 'paper', frame: 'double', badge: 'square', text: 'ink', decos: ['seal', 'number'], motions: [] }),

    T('t_assoc', '协会铭牌', '极简', 'prophet',
      '空心描边字、双线边框与吊牌，组成原创机构铭牌视觉',
      { bg: 'grid', plate: 'flat', frame: 'double', badge: 'tag', text: 'hollow', decos: ['number', 'progress'], motions: ['edgebreath'] }),

    T('t_blood', '赤色契约', '血色', 'prophet',
      '血雾、圆章与血色文字，采用契约纸张式构图和脉冲光效',
      { bg: 'blood', plate: 'flat', frame: 'double', badge: 'medallion', text: 'blood', decos: ['veins', 'strip'], motions: ['pulse', 'breath'] }),

    T('t_mini', '极简明牌', '极简', 'prophet',
      '省去徽记与边框，以主标题和点状装饰保持简洁',
      { plate: 'flat', frame: 'none', badge: 'none', text: 'hollow', decos: ['progress'], motions: ['sheen'] }),

    T('t_mechan', '黑金机械', '黑金', 'prophet',
      '黑金底板、电路边框与齿轮纹样，组成工业机械风排版',
      { bg: 'night', plate: 'blackgold', frame: 'circuit', badge: 'hex', decos: ['gears', 'roman'], motions: ['sheen', 'edgebreath'] })
    ,
    T('t_terminal', '终端协议', '科技', 'prophet',
      '终端底纹、全息牌与信号图形，组成原创控制台资料卡',
      { bg: 'terminal', plate: 'holo', frame: 'asym', badge: 'signal', text: 'terminal', theme: 'terminal', decos: ['signal', 'coords', 'warning'], motions: ['scanline', 'chromatic'] }),

    T('t_rain', '雨夜黑箱', '冷调', 'prophet',
      '雨幕、深色石板与装饰徽记，组成冷调调查档案视觉',
      { bg: 'rain', plate: 'slab', frame: 'asym', badge: 'crest', text: 'metal', theme: 'noir', decos: ['coords', 'stamp'], motions: ['rain', 'drift'] }),

    T('t_void', '空洞回响', '异质', 'prophet',
      '空洞纹理、全息底板与像素彩边，搭配粒子和色差效果',
      { bg: 'void', plate: 'holo', frame: 'crack', badge: 'none', text: 'pixel', theme: 'void', decos: ['signal', 'strip'], motions: ['particles', 'chromatic', 'glitch'] }),

    T('t_hazard', '红线管制', '警示', 'prophet',
      '终端底纹、警示封条与编号标签，组成红线管制式排版',
      { bg: 'terminal', plate: 'blackgold', frame: 'tape', badge: 'square', text: 'terminal', theme: 'hazard', decos: ['warning', 'number', 'barcode'], motions: ['scanline', 'flicker'] }),

    T('t_crest', '协会徽章', '机构', 'prophet',
      '深色石板、原创徽记与档案章装饰，组成厚重铭牌视觉',
      { bg: 'grid', plate: 'slab', frame: 'double', badge: 'crest', text: 'hollow', decos: ['stamp', 'number', 'signal'], motions: ['edgebreath'] }),

    T('t_frost', '冷冻档案', '冷色', 'prophet',
      '雨夜冷光、全息底板与信号图形，组成低温观测记录式排版',
      { bg: 'rain', plate: 'holo', frame: 'circuit', badge: 'signal', text: 'holo', theme: 'frost', decos: ['coords', 'progress'], motions: ['rain', 'sheen'] }),

    T('t_radar', '雷达值守', '管制', 'prophet',
      '终端底纹搭配雷达、计时、状态灯与均衡器动画',
      { bg: 'terminal', plate: 'holo', frame: 'asym', badge: 'signal', text: 'terminal', theme: 'terminal',
        decos: ['status', 'radar', 'counter', 'eq'], motions: ['scanline', 'leak'] }),

    T('t_ledger', '流水台账', '档案', 'prophet',
      '刻度尺、流动虚线与打字动画，组成台账式动态资料卡',
      { bg: 'grid', plate: 'slab', frame: 'double', badge: 'crest', text: 'ink', theme: 'noir',
        decos: ['ruler', 'rule', 'marching', 'typing'], motions: ['gridshift', 'spectrum'] }),

    T('t_ember', '余烬回响', '血色', 'prophet',
      '空洞底纹搭配上升火星、游走追光、轨道点与呼吸点',
      { bg: 'void', plate: 'flat', frame: 'crack', badge: 'hex', text: 'blood', theme: 'void',
        decos: ['orbit', 'blink', 'halftone'], motions: ['ember', 'wave', 'spotlight'] }),

    T('t_smoke', '烟霾追查', '灰调', 'prophet',
      '灰雾、铁牌纹理与打字机文字，组成烟霾主题的调查记录视觉',
      { bg: 'smoke', plate: 'stencil', frame: 'stamp', badge: 'key', text: 'typer', theme: 'noir',
        decos: ['number', 'rule', 'thermo'], motions: ['steam', 'gridshift'] }),

    T('t_deepsea', '深水夜航', '冷色', 'prophet',
      '深蓝水波、霜面与刻度边，构成大湖题材的原创航行卡片',
      { bg: 'deepsea', plate: 'frost', frame: 'ruled', badge: 'key', text: 'frost', theme: 'frost',
        decos: ['coords', 'ruler', 'filmhole'], motions: ['wave', 'ash'] }),

    T('t_ruin', '废墟余烬', '血色', 'prophet',
      '余烬底纹、锈蚀文字与闪电，表现荒废场景的视觉气氛',
      { bg: 'emberfield', plate: 'stencil', frame: 'crack', badge: 'qr', text: 'rust', theme: 'void',
        decos: ['thermo', 'barcode', 'veins'], motions: ['ember', 'lightning'] }),

    T('t_finger', '赤色纹章', '血色', 'prophet',
      '绒面、绶带与中缝边框，组成五指题材的原创徽章排版',
      { bg: 'smoke', plate: 'velvet', frame: 'split', badge: 'ribbon', text: 'metal', theme: 'hazard',
        decos: ['number', 'seal', 'chip'], motions: ['breath', 'leak'] }),

    T('t_office', '事务所门牌', '档案', 'prophet',
      '铁牌纹理、钥匙形徽记与滚动字幕，组成原创事务所门牌视觉',
      { bg: 'grid', plate: 'stencil', frame: 'stamp', badge: 'key', text: 'typer', theme: 'default',
        decos: ['number', 'rule', 'ticker'], motions: ['gridshift', 'spectrum'] }),

    T('t_sin', '异质档案', '异质', 'prophet',
      '空洞底纹、绒面与绶带，搭配心跳光效的罪种资料卡构图',
      { bg: 'void', plate: 'velvet', frame: 'split', badge: 'ribbon', text: 'blood', theme: 'void',
        decos: ['orbit', 'halftone', 'strip'], motions: ['hexpulse', 'heartbeat'] }),

    T('t_cleaner', '深宵清扫', '灰调', 'prophet',
      '烟霾、箱式底板与方码图形，组成清道夫题材的夜间记录视觉',
      { bg: 'smoke', plate: 'containment', frame: 'ruled', badge: 'qr', text: 'terminal', theme: 'noir',
        decos: ['thermo', 'coords', 'filmhole'], motions: ['steam', 'scanline'] }),

    T('t_bloodfeast', '血亲夜宴', '血色', 'prophet',
      '血雾、绒面、绶带与心跳光效，采用请柬式原创构图',
      { bg: 'blood', plate: 'velvet', frame: 'double', badge: 'ribbon', text: 'blood', theme: 'void',
        decos: ['orbit', 'veins', 'strip'], motions: ['pulse', 'heartbeat'] }),

    T('t_letter', '信件档案', '纸感', 'prophet',
      '纸张底纹、刻度边与打字机文字，组成信件档案式排版',
      { bg: 'paper', plate: 'paper', frame: 'ruled', badge: 'key', text: 'typer', theme: 'noir',
        decos: ['ruler', 'filmhole', 'number'], motions: ['drift'] }),

    T('t_block', '街区霓虹', '霓虹', 'prophet',
      '街区剪影、全息底板与滚动字幕，组成霓虹街景视觉',
      { bg: 'skyline', plate: 'holo', frame: 'asym', badge: 'qr', text: 'neon', theme: 'terminal',
        decos: ['ticker', 'coords', 'eq'], motions: ['flicker', 'leak'] })

    ,

    T('t_white_night', '白夜冷光', '冷光', 'prophet',
      '冷白光、深色石板、符文与灰烬，组成白夜题材的原创卡片',
      { bg: 'void', plate: 'slab', frame: 'split', badge: 'crest', text: 'holo', theme: 'frost',
        decos: ['runes', 'coords', 'thermo'], motions: ['ash', 'hexpulse'] }),

    T('t_ego_gear', '技术装载', '科技', 'prophet',
      '六边网、玻璃底板、信号图形与均衡器，组成装备资料卡视觉',
      { bg: 'hexmesh', plate: 'glass', frame: 'circuit', badge: 'signal', text: 'terminal', theme: 'terminal',
        decos: ['eq', 'signal', 'barcode'], motions: ['scanline', 'steam'] })

    ,
    T('t_ticket', '齿口通行票', '新构图', 'prophet',
      '真实检票缺口与独立票根；主字、后缀各占一栏，模板切口字保留透明断口',
      { layout: 'split', plate: 'ticket', frame: 'none', badge: 'none', text: 'stencil', header: false,
        decos: [], motions: [] }),
    T('t_folder', '归档文件夹', '新构图', 'prophet',
      '凸出分类页签、上下分层标题与照片插袋；打字机按主标题到后缀依次出现',
      { layout: 'stacked', plate: 'folder', frame: 'none', badge: 'none', text: 'typer', header: false,
        decos: ['photoPocket'], textAnim: { color: 'none', motion: 'typewriter', speed: 1, strength: 0.65, scope: 'all' } }),
    T('t_scroll', '双轴铭文卷', '新构图', 'prophet',
      '两端实体卷轴、顶部冠徽和分行居中标题；立体字面与侧面形成厚度',
      { layout: 'centered', plate: 'scroll', frame: 'none', badge: 'crest', text: 'extrude', header: false, subline: false }),
    T('t_banner', '折带授名', '新构图', 'prophet',
      '燕尾、折回背面与中央横带；主字靠左上，后缀靠右下，保留大片透明外缘',
      { layout: 'stepped', plate: 'banner', frame: 'none', badge: 'none', text: 'extrude', header: false, subline: false }),
    T('t_tape', '磁带侧录', '新构图', 'prophet',
      '双卷盘徽记移到右端，标题分行右对齐；底部连杆驱动滑块做往复运动',
      { layout: 'reverse', plate: 'none', frame: 'none', badge: 'cassette', text: 'dotmatrix', header: true,
        decos: ['linkage', 'patchCable'], motions: [] }),
    T('t_specimen', '标本竖签', '新构图', 'prophet',
      '玻璃安瓿、左侧竖排后缀与右侧主标题；液面折射会弯曲字内笔画',
      { layout: 'vertical', plate: 'none', frame: 'none', badge: 'ampoule', text: 'hollow', header: true,
        decos: ['lockSeal'], motions: ['liquidwarp'] }),
    T('t_flap', '机械翻牌', '新构图', 'prophet',
      '针脚芯片配双栏文字；标题分块沿水平铰链翻面，光圈叶片围绕芯片开合',
      { layout: 'split', plate: 'slab', frame: 'none', badge: 'microchip', text: 'terminal', header: false,
        decos: ['iris'], motions: ['splitflap'] }),
    T('t_signal_board', '点阵广播', '新构图', 'prophet',
      '透明底上的点阵标题与竖排地点签，真实圆点间隙保留；彩虹颜色沿字面流动',
      { layout: 'vertical', plate: 'none', frame: 'none', badge: 'microchip', text: 'dotmatrix', header: true,
        decos: ['linkage'], textAnim: { color: 'rainbow', motion: 'none', speed: 1, strength: 0.8, scope: 'main' } })
  ];

  var byId = {};
  TEMPLATES.forEach(function (t) { byId[t.id] = t; });

  TG.templates = TEMPLATES;
  TG.template = function (id) { return byId[id] || TEMPLATES[0]; };
})();

