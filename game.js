/* ============================================================================
 * 彩虹小岛 · Rainbow Island — v17-phaser
 * Phaser 3 重建版（基于 v15 的内容与美术，游戏引擎渲染）。
 * - 同一套手绘图：小岛背景、彩虹公主、5 只小动物、8 个物件 + 216 个装饰物
 * - 玩法与 v15 相同：家长选词（可多选）→ 每词 4 回合 → 找一找 / 放一放交替
 * - 修复：(1) 语音主语与题目动物一致（horse 用预录音，其余动物用慢速 TTS，
 *           且先单独读目标词、再读整句）；(2) 回合出现自动读题；(3) 答错有温柔语音；
 *           (4) “?” 提示真的高亮正确位置；(5) 换词后介绍页立即刷新词和星星。
 * - 纯静态：index.html + game.js + assets/，无构建步骤，可直接放 GitHub Pages。
 * ========================================================================== */
'use strict';

/* ---------------- 数据表（v15 原样，加新词/动物/地点只需在这里加一行） -------- */
var WORLD_W = 4800, WORLD_H = 3200;
var GAME_W = 480, GAME_H = 860;
var TOP_H = 64;                 // 顶栏高度
var UI_TOP = 670;               // 对话区顶部（世界视口 64..670）
var WORLD_VIEW_H = UI_TOP - TOP_H;

var WORDS = {
  'in':     { id: 'in',     en: 'in',          zh: '里面', color: '#22c55e', clip: 'word-in_' },
  'on':     { id: 'on',     en: 'on',          zh: '上面', color: '#ec4899', clip: 'word-on' },
  'under':  { id: 'under',  en: 'under',       zh: '下面', color: '#f59e0b', clip: 'word-under' },
  'nextto': { id: 'nextto', en: 'next to',     zh: '旁边', color: '#3b82f6', clip: 'word-nextto' },
  'behind': { id: 'behind', en: 'behind',      zh: '后面', color: '#8b5cf6', clip: 'word-behind' },
  'front':  { id: 'front',  en: 'in front of', zh: '前面', color: '#14b8a6', clip: 'word-front' }
};
var WORD_ORDER = ['in', 'on', 'under', 'nextto', 'behind', 'front'];

var CHARS = {
  'horse': { id: 'horse', en: 'horse', zh: '小马', img: 'horse', zone: '森林' },
  'cat':   { id: 'cat',   en: 'cat',   zh: '小猫', img: 'cat',   zone: '花园' },
  'dog':   { id: 'dog',   en: 'dog',   zh: '小狗', img: 'dog',   zone: '沙滩' },
  'bear':  { id: 'bear',  en: 'bear',  zh: '小熊', img: 'bear',  zone: '小山' },
  'bird':  { id: 'bird',  en: 'bird',  zh: '小鸟', img: 'bird',  zone: '池塘' }
};
var CHAR_IDS = ['horse', 'cat', 'dog', 'bear', 'bird'];
var CHAR_GREETING = {
  'horse': 'Neigh! Hello!', 'cat': 'Meow! Hello!', 'dog': 'Woof! Hello!',
  'bear': 'Hello! I am a bear!', 'bird': 'Tweet! Hello!'
};

/* 岛上地点：x/y 为世界百分比（4800x3200 的大岛） */
var SPOTS = {
  'tree':   { id: 'tree',   en: 'tree',   zh: '大树', x: 24, y: 22, zone: '森林', img: 'tree',   w: 100, h: 121 },
  'house':  { id: 'house',  en: 'house',  zh: '房子', x: 12, y: 52, zone: '小屋', img: 'house',  w: 112, h: 85 },
  'box':    { id: 'box',    en: 'box',    zh: '盒子', x: 22, y: 60, zone: '小屋', img: 'box',    w: 92,  h: 67 },
  'basket': { id: 'basket', en: 'basket', zh: '篮子', x: 80, y: 88, zone: '沙滩', img: 'basket', w: 92,  h: 77 },
  'bridge': { id: 'bridge', en: 'bridge', zh: '小桥', x: 50, y: 52, zone: '池塘', img: 'bridge', w: 116, h: 54 },
  'table':  { id: 'table',  en: 'table',  zh: '桌子', x: 10, y: 64, zone: '小屋', img: 'table',  w: 100, h: 72 },
  'flower': { id: 'flower', en: 'flower', zh: '花',   x: 82, y: 44, zone: '花园', img: 'flower', w: 60,  h: 76 },
  'rock':   { id: 'rock',   en: 'rock',   zh: '石头', x: 58, y: 90, zone: '沙滩', img: 'rock',   w: 80,  h: 68 }
};
/* 每词的回合地点：只用「有插画物件 + 有整句录音」的组合 */
var ROUND_SPOTS = {
  'in':      ['basket', 'box', 'house'],
  'on':      ['box', 'bridge', 'rock'],
  'under':   ['tree', 'bridge'],
  'nextto':  ['flower', 'house', 'tree'],
  'behind':  ['tree', 'house'],
  'front':   ['tree', 'house']
};
var MISSIONS = {
  'in':     '把小熊放进盒子里，只露出小脑袋，再问孩子：Where is the bear?',
  'on':     '把小猫放到桌子上面，再问孩子：Where is the cat?',
  'under':  '把小狗藏到桌子下面，再问孩子：Where is the dog?',
  'nextto': '把小马放到花旁边，再问孩子：Where is the horse?',
  'behind': '把你的小熊藏到大树后面，只露出小脑袋，再问妈妈：Where is the bear?',
  'front':  '把小鸟放到房子前面，再问孩子：Where is the bird?'
};

var POS = {
  princess: { x: 50, y: 66 },
  horse: { x: 17, y: 23 }, cat: { x: 82, y: 50 }, dog: { x: 68, y: 87 },
  bear: { x: 50, y: 11.5 }, bird: { x: 50, y: 60 }
};
var HOME_POS = { horse: { x: 17, y: 23 }, cat: { x: 82, y: 50 }, dog: { x: 68, y: 87 },
                 bear: { x: 50, y: 11.5 }, bird: { x: 50, y: 60 } };
var WANDER_ZONES = {
  horse: { x0: 6,  x1: 32, y0: 15, y1: 31 },
  cat:   { x0: 70, x1: 94, y0: 38, y1: 62 },
  dog:   { x0: 55, x1: 88, y0: 79, y1: 94 },
  bear:  { x0: 40, x1: 60, y0: 10, y1: 12.5 },
  bird:  { x0: 40, x1: 60, y0: 40, y1: 56 }
};
var ZONES = [
  { id: 'mountain', zh: '小山', x0: 0,  y0: 0,  x1: 100, y1: 13, color: '#9ca3af' },
  { id: 'forest',   zh: '森林', x0: 0,  y0: 13, x1: 100, y1: 33, color: '#22c55e' },
  { id: 'house',    zh: '小屋', x0: 0,  y0: 34, x1: 30,  y1: 70, color: '#f59e0b' },
  { id: 'pond',     zh: '池塘', x0: 40, y0: 42, x1: 60,  y1: 58, color: '#38bdf8' },
  { id: 'garden',   zh: '花园', x0: 68, y0: 34, x1: 100, y1: 70, color: '#f472b6' },
  { id: 'beach',    zh: '沙滩', x0: 0,  y0: 74, x1: 100, y1: 95, color: '#fde68a' },
  { id: 'sea',      zh: '大海', x0: 0,  y0: 95, x1: 100, y1: 100, color: '#3b82f6' }
];
var ZONE_LABEL_POS = { mountain: [30, 11], forest: [18, 18], house: [12, 42], pond: [50, 40],
                       garden: [84, 38], beach: [50, 86], sea: [20, 97.5] };

/* 位置偏移（世界像素），与 v15 完全一致：语义位置，画面必须一眼看懂 */
function wordOffset(wordId) {
  switch (wordId) {
    case 'in':     return { dx: 0,   dy: -11, cls: 'inbox' };
    case 'on':     return { dx: 0,   dy: -73, cls: '' };
    case 'under':  return { dx: 0,   dy: 22,  cls: '' };
    case 'nextto': return { dx: 47,  dy: 11,  cls: '' };
    case 'behind': return { dx: -47, dy: -17, cls: 'behind' };
    case 'front':  return { dx: 0,   dy: 28,  cls: '' };
    default:       return { dx: 0,   dy: 0,   cls: '' };
  }
}
function circleOffset(wordId) {
  switch (wordId) {
    case 'in':     return { dx: 0,   dy: -11 };
    case 'on':     return { dx: 0,   dy: -78 };
    case 'under':  return { dx: -47, dy: 34 };
    case 'nextto': return { dx: 51,  dy: 0 };
    case 'behind': return { dx: -51, dy: -22 };
    case 'front':  return { dx: 0,   dy: 45 };
    default:       return { dx: 0,   dy: 0 };
  }
}
function miniOffset(wordId) {
  switch (wordId) {
    case 'in':     return { dx: 0,   dy: -2,  cls: 'inbox' };
    case 'on':     return { dx: 0,   dy: -13, cls: '' };
    case 'under':  return { dx: 0,   dy: 4,   cls: '' };
    case 'nextto': return { dx: 12,  dy: 2,   cls: '' };
    case 'behind': return { dx: -12, dy: -3,  cls: 'behind' };
    case 'front':  return { dx: 0,   dy: 5,   cls: '' };
    default:       return { dx: 0,   dy: 0,   cls: '' };
  }
}

/* 装饰物（v15 的 216 个，位置/种类/大小原样搬过来） */
var DECO = [{"img": "tree", "x": 33.8, "y": 17.4, "act": "wiggle", "w": 90}, {"img": "tree", "x": 8.4, "y": 28.1, "act": "wiggle", "w": 73}, {"img": "tree", "x": 37.6, "y": 15.9, "act": "wiggle", "w": 86}, {"img": "tree", "x": 23.8, "y": 16.4, "act": "wiggle", "w": 83}, {"img": "tree", "x": 10.4, "y": 16.5, "act": "wiggle", "w": 83}, {"img": "tree", "x": 9.4, "y": 24.0, "act": "wiggle", "w": 77}, {"img": "tree", "x": 62.0, "y": 24.3, "act": "wiggle", "w": 71}, {"img": "tree", "x": 57.1, "y": 21.3, "act": "wiggle", "w": 77}, {"img": "tree", "x": 8.3, "y": 28.7, "act": "wiggle", "w": 79}, {"img": "tree", "x": 42.6, "y": 23.7, "act": "wiggle", "w": 88}, {"img": "tree", "x": 32.4, "y": 28.1, "act": "wiggle", "w": 75}, {"img": "tree", "x": 13.5, "y": 24.1, "act": "wiggle", "w": 76}, {"img": "tree", "x": 38.3, "y": 23.8, "act": "wiggle", "w": 72}, {"img": "tree", "x": 55.9, "y": 24.9, "act": "wiggle", "w": 85}, {"img": "tree", "x": 66.6, "y": 21.8, "act": "wiggle", "w": 80}, {"img": "tree", "x": 46.8, "y": 29.8, "act": "wiggle", "w": 81}, {"img": "tree", "x": 31.6, "y": 27.7, "act": "wiggle", "w": 92}, {"img": "tree", "x": 75.7, "y": 16.3, "act": "wiggle", "w": 79}, {"img": "tree", "x": 52.3, "y": 29.0, "act": "wiggle", "w": 93}, {"img": "tree", "x": 45.3, "y": 24.7, "act": "wiggle", "w": 72}, {"img": "tree", "x": 73.7, "y": 17.4, "act": "wiggle", "w": 85}, {"img": "tree", "x": 42.8, "y": 30.4, "act": "wiggle", "w": 72}, {"img": "bush", "x": 74.3, "y": 24.2, "act": "wiggle", "w": 75}, {"img": "bush", "x": 35.3, "y": 20.6, "act": "wiggle", "w": 80}, {"img": "bush", "x": 57.4, "y": 22.3, "act": "wiggle", "w": 67}, {"img": "bush", "x": 90.9, "y": 22.6, "act": "wiggle", "w": 86}, {"img": "bush", "x": 10.0, "y": 26.7, "act": "wiggle", "w": 74}, {"img": "bush", "x": 63.5, "y": 30.9, "act": "wiggle", "w": 79}, {"img": "bush", "x": 30.2, "y": 21.2, "act": "wiggle", "w": 86}, {"img": "bush", "x": 35.9, "y": 30.1, "act": "wiggle", "w": 76}, {"img": "bush", "x": 9.4, "y": 27.3, "act": "wiggle", "w": 69}, {"img": "bush", "x": 71.9, "y": 21.4, "act": "wiggle", "w": 80}, {"img": "bush", "x": 11.4, "y": 22.2, "act": "wiggle", "w": 82}, {"img": "bush", "x": 29.6, "y": 17.2, "act": "wiggle", "w": 78}, {"img": "grass-tuft", "x": 83.5, "y": 19.5, "act": "bloom", "w": 40}, {"img": "grass-tuft", "x": 94.8, "y": 25.9, "act": "bloom", "w": 40}, {"img": "grass-tuft", "x": 92.1, "y": 17.4, "act": "bloom", "w": 36}, {"img": "grass-tuft", "x": 5.1, "y": 28.3, "act": "bloom", "w": 36}, {"img": "grass-tuft", "x": 28.2, "y": 15.1, "act": "bloom", "w": 40}, {"img": "grass-tuft", "x": 53.2, "y": 24.8, "act": "bloom", "w": 39}, {"img": "grass-tuft", "x": 91.7, "y": 26.0, "act": "bloom", "w": 42}, {"img": "grass-tuft", "x": 91.4, "y": 25.5, "act": "bloom", "w": 45}, {"img": "grass-tuft", "x": 9.0, "y": 29.4, "act": "bloom", "w": 46}, {"img": "grass-tuft", "x": 91.6, "y": 25.9, "act": "bloom", "w": 42}, {"img": "flower", "x": 40.1, "y": 21.4, "act": "bloom", "w": 29}, {"img": "flower", "x": 48.3, "y": 21.4, "act": "bloom", "w": 31}, {"img": "flower", "x": 10.2, "y": 18.3, "act": "bloom", "w": 30}, {"img": "flower", "x": 13.4, "y": 24.1, "act": "bloom", "w": 36}, {"img": "flower", "x": 13.3, "y": 20.8, "act": "bloom", "w": 28}, {"img": "flower", "x": 10.5, "y": 18.3, "act": "bloom", "w": 34}, {"img": "flower", "x": 73.9, "y": 44.1, "act": "bloom", "w": 33}, {"img": "flower", "x": 85.7, "y": 51.2, "act": "bloom", "w": 29}, {"img": "flower", "x": 92.1, "y": 67.8, "act": "bloom", "w": 35}, {"img": "flower", "x": 73.7, "y": 60.0, "act": "bloom", "w": 32}, {"img": "flower", "x": 82.4, "y": 58.1, "act": "bloom", "w": 36}, {"img": "flower", "x": 70.6, "y": 66.4, "act": "bloom", "w": 36}, {"img": "flower", "x": 79.4, "y": 58.1, "act": "bloom", "w": 28}, {"img": "flower", "x": 89.7, "y": 45.5, "act": "bloom", "w": 38}, {"img": "flower", "x": 92.4, "y": 58.3, "act": "bloom", "w": 32}, {"img": "flower", "x": 83.5, "y": 65.1, "act": "bloom", "w": 33}, {"img": "flower", "x": 90.1, "y": 53.0, "act": "bloom", "w": 36}, {"img": "flower", "x": 78.6, "y": 43.1, "act": "bloom", "w": 31}, {"img": "flower", "x": 91.0, "y": 62.2, "act": "bloom", "w": 31}, {"img": "flower", "x": 75.2, "y": 51.8, "act": "bloom", "w": 28}, {"img": "flower", "x": 95.7, "y": 61.3, "act": "bloom", "w": 35}, {"img": "flower", "x": 76.7, "y": 58.2, "act": "bloom", "w": 33}, {"img": "flower", "x": 81.6, "y": 66.0, "act": "bloom", "w": 33}, {"img": "flower", "x": 94.8, "y": 47.7, "act": "bloom", "w": 31}, {"img": "grass-tuft", "x": 72.7, "y": 51.0, "act": "bloom", "w": 39}, {"img": "grass-tuft", "x": 75.3, "y": 56.0, "act": "bloom", "w": 48}, {"img": "grass-tuft", "x": 93.6, "y": 47.0, "act": "bloom", "w": 44}, {"img": "grass-tuft", "x": 72.2, "y": 57.1, "act": "bloom", "w": 48}, {"img": "grass-tuft", "x": 80.1, "y": 58.8, "act": "bloom", "w": 37}, {"img": "grass-tuft", "x": 90.5, "y": 46.6, "act": "bloom", "w": 46}, {"img": "grass-tuft", "x": 94.6, "y": 59.1, "act": "bloom", "w": 41}, {"img": "grass-tuft", "x": 80.4, "y": 66.3, "act": "bloom", "w": 45}, {"img": "grass-tuft", "x": 74.1, "y": 67.8, "act": "bloom", "w": 34}, {"img": "grass-tuft", "x": 73.9, "y": 65.0, "act": "bloom", "w": 46}, {"img": "bush", "x": 87.1, "y": 55.6, "act": "wiggle", "w": 84}, {"img": "bush", "x": 95.5, "y": 57.0, "act": "wiggle", "w": 76}, {"img": "bush", "x": 74.1, "y": 53.5, "act": "wiggle", "w": 65}, {"img": "bush", "x": 70.4, "y": 67.1, "act": "wiggle", "w": 85}, {"img": "bush", "x": 72.7, "y": 60.0, "act": "wiggle", "w": 69}, {"img": "bush", "x": 81.3, "y": 63.9, "act": "wiggle", "w": 71}, {"img": "bush", "x": 70.7, "y": 42.8, "act": "wiggle", "w": 81}, {"img": "bush", "x": 76.3, "y": 54.8, "act": "wiggle", "w": 73}, {"img": "pebble", "x": 54.1, "y": 90.2, "act": "wiggle", "w": 30}, {"img": "pebble", "x": 87.7, "y": 82.0, "act": "wiggle", "w": 37}, {"img": "pebble", "x": 64.9, "y": 89.9, "act": "wiggle", "w": 38}, {"img": "pebble", "x": 42.7, "y": 91.6, "act": "wiggle", "w": 38}, {"img": "pebble", "x": 16.0, "y": 78.6, "act": "wiggle", "w": 38}, {"img": "pebble", "x": 5.7, "y": 83.5, "act": "wiggle", "w": 32}, {"img": "pebble", "x": 17.8, "y": 78.4, "act": "wiggle", "w": 39}, {"img": "pebble", "x": 34.0, "y": 84.8, "act": "wiggle", "w": 38}, {"img": "pebble", "x": 48.4, "y": 89.2, "act": "wiggle", "w": 44}, {"img": "pebble", "x": 55.5, "y": 80.2, "act": "wiggle", "w": 34}, {"img": "pebble", "x": 7.9, "y": 77.7, "act": "wiggle", "w": 37}, {"img": "pebble", "x": 87.9, "y": 83.5, "act": "wiggle", "w": 39}, {"img": "pebble", "x": 93.5, "y": 86.3, "act": "wiggle", "w": 33}, {"img": "pebble", "x": 53.1, "y": 84.1, "act": "wiggle", "w": 33}, {"img": "rock", "x": 90.7, "y": 80.4, "act": "wiggle", "w": 44}, {"img": "rock", "x": 86.1, "y": 79.4, "act": "wiggle", "w": 43}, {"img": "rock", "x": 16.6, "y": 78.1, "act": "wiggle", "w": 43}, {"img": "rock", "x": 33.1, "y": 87.4, "act": "wiggle", "w": 42}, {"img": "rock", "x": 10.7, "y": 87.4, "act": "wiggle", "w": 48}, {"img": "rock", "x": 15.3, "y": 89.2, "act": "wiggle", "w": 47}, {"img": "rock", "x": 63.2, "y": 82.2, "act": "wiggle", "w": 40}, {"img": "rock", "x": 85.2, "y": 92.4, "act": "wiggle", "w": 39}, {"img": "grass-tuft", "x": 72.7, "y": 77.6, "act": "bloom", "w": 48}, {"img": "grass-tuft", "x": 48.8, "y": 92.8, "act": "bloom", "w": 47}, {"img": "grass-tuft", "x": 24.6, "y": 88.0, "act": "bloom", "w": 42}, {"img": "grass-tuft", "x": 41.2, "y": 83.2, "act": "bloom", "w": 39}, {"img": "flower", "x": 33.3, "y": 88.3, "act": "bloom", "w": 28}, {"img": "flower", "x": 35.1, "y": 83.8, "act": "bloom", "w": 28}, {"img": "flower", "x": 39.4, "y": 84.8, "act": "bloom", "w": 32}, {"img": "flower", "x": 51.1, "y": 77.1, "act": "bloom", "w": 31}, {"img": "grass-tuft", "x": 27.3, "y": 39.6, "act": "bloom", "w": 38}, {"img": "grass-tuft", "x": 23.7, "y": 64.9, "act": "bloom", "w": 44}, {"img": "grass-tuft", "x": 23.7, "y": 44.8, "act": "bloom", "w": 36}, {"img": "grass-tuft", "x": 16.9, "y": 53.5, "act": "bloom", "w": 41}, {"img": "grass-tuft", "x": 20.8, "y": 39.0, "act": "bloom", "w": 34}, {"img": "grass-tuft", "x": 23.2, "y": 42.2, "act": "bloom", "w": 48}, {"img": "grass-tuft", "x": 5.7, "y": 67.9, "act": "bloom", "w": 44}, {"img": "grass-tuft", "x": 6.1, "y": 44.9, "act": "bloom", "w": 43}, {"img": "grass-tuft", "x": 24.5, "y": 38.3, "act": "bloom", "w": 47}, {"img": "grass-tuft", "x": 6.9, "y": 36.4, "act": "bloom", "w": 42}, {"img": "flower", "x": 14.0, "y": 67.1, "act": "bloom", "w": 37}, {"img": "flower", "x": 7.1, "y": 53.9, "act": "bloom", "w": 31}, {"img": "flower", "x": 26.5, "y": 69.0, "act": "bloom", "w": 32}, {"img": "flower", "x": 5.2, "y": 42.9, "act": "bloom", "w": 32}, {"img": "flower", "x": 19.1, "y": 54.1, "act": "bloom", "w": 31}, {"img": "flower", "x": 8.3, "y": 47.8, "act": "bloom", "w": 28}, {"img": "bush", "x": 27.9, "y": 37.3, "act": "wiggle", "w": 65}, {"img": "bush", "x": 21.6, "y": 54.7, "act": "wiggle", "w": 71}, {"img": "bush", "x": 16.3, "y": 44.4, "act": "wiggle", "w": 79}, {"img": "bush", "x": 6.6, "y": 63.8, "act": "wiggle", "w": 78}, {"img": "pebble", "x": 19.8, "y": 54.6, "act": "wiggle", "w": 44}, {"img": "pebble", "x": 20.5, "y": 69.4, "act": "wiggle", "w": 35}, {"img": "pebble", "x": 21.5, "y": 40.8, "act": "wiggle", "w": 35}, {"img": "pebble", "x": 27.6, "y": 64.5, "act": "wiggle", "w": 30}, {"img": "grass-tuft", "x": 38.0, "y": 56.7, "act": "bloom", "w": 38}, {"img": "grass-tuft", "x": 48.1, "y": 37.6, "act": "bloom", "w": 44}, {"img": "grass-tuft", "x": 59.6, "y": 60.4, "act": "bloom", "w": 44}, {"img": "grass-tuft", "x": 63.2, "y": 52.8, "act": "bloom", "w": 45}, {"img": "grass-tuft", "x": 43.4, "y": 62.9, "act": "bloom", "w": 42}, {"img": "grass-tuft", "x": 45.1, "y": 37.0, "act": "bloom", "w": 48}, {"img": "grass-tuft", "x": 36.0, "y": 46.7, "act": "bloom", "w": 41}, {"img": "grass-tuft", "x": 42.9, "y": 57.7, "act": "bloom", "w": 35}, {"img": "grass-tuft", "x": 43.4, "y": 38.5, "act": "bloom", "w": 40}, {"img": "grass-tuft", "x": 38.4, "y": 62.8, "act": "bloom", "w": 47}, {"img": "flower", "x": 56.0, "y": 60.6, "act": "bloom", "w": 34}, {"img": "flower", "x": 53.3, "y": 40.1, "act": "bloom", "w": 36}, {"img": "flower", "x": 58.7, "y": 39.9, "act": "bloom", "w": 36}, {"img": "flower", "x": 58.8, "y": 36.5, "act": "bloom", "w": 38}, {"img": "flower", "x": 42.4, "y": 36.9, "act": "bloom", "w": 30}, {"img": "flower", "x": 53.8, "y": 62.9, "act": "bloom", "w": 34}, {"img": "flower", "x": 36.1, "y": 58.3, "act": "bloom", "w": 36}, {"img": "flower", "x": 61.1, "y": 38.6, "act": "bloom", "w": 36}, {"img": "bush", "x": 37.8, "y": 56.6, "act": "wiggle", "w": 73}, {"img": "bush", "x": 58.7, "y": 59.7, "act": "wiggle", "w": 72}, {"img": "bush", "x": 56.4, "y": 41.7, "act": "wiggle", "w": 88}, {"img": "bush", "x": 59.7, "y": 38.1, "act": "wiggle", "w": 86}, {"img": "rock", "x": 38.0, "y": 12.0, "act": "wiggle", "w": 46}, {"img": "rock", "x": 63.1, "y": 10.6, "act": "wiggle", "w": 38}, {"img": "rock", "x": 34.5, "y": 10.5, "act": "wiggle", "w": 47}, {"img": "rock", "x": 5.1, "y": 12.4, "act": "wiggle", "w": 40}, {"img": "rock", "x": 93.5, "y": 12.4, "act": "wiggle", "w": 39}, {"img": "rock", "x": 66.2, "y": 11.3, "act": "wiggle", "w": 44}, {"img": "pebble", "x": 74.6, "y": 10.9, "act": "wiggle", "w": 38}, {"img": "pebble", "x": 22.3, "y": 10.8, "act": "wiggle", "w": 44}, {"img": "pebble", "x": 11.0, "y": 10.9, "act": "wiggle", "w": 37}, {"img": "pebble", "x": 95.4, "y": 11.2, "act": "wiggle", "w": 44}, {"img": "pebble", "x": 91.0, "y": 10.9, "act": "wiggle", "w": 39}, {"img": "pebble", "x": 12.3, "y": 11.3, "act": "wiggle", "w": 34}, {"img": "bush", "x": 91.7, "y": 11.5, "act": "wiggle", "w": 85}, {"img": "bush", "x": 68.7, "y": 12.1, "act": "wiggle", "w": 80}, {"img": "bush", "x": 40.3, "y": 12.0, "act": "wiggle", "w": 80}, {"img": "grass-tuft", "x": 56.5, "y": 67.6, "act": "bloom", "w": 45}, {"img": "grass-tuft", "x": 37.1, "y": 67.1, "act": "bloom", "w": 39}, {"img": "grass-tuft", "x": 36.4, "y": 67.0, "act": "bloom", "w": 39}, {"img": "grass-tuft", "x": 59.0, "y": 71.6, "act": "bloom", "w": 35}, {"img": "grass-tuft", "x": 65.8, "y": 65.8, "act": "bloom", "w": 34}, {"img": "grass-tuft", "x": 64.5, "y": 66.6, "act": "bloom", "w": 39}, {"img": "grass-tuft", "x": 34.3, "y": 67.5, "act": "bloom", "w": 47}, {"img": "grass-tuft", "x": 53.2, "y": 67.2, "act": "bloom", "w": 40}, {"img": "grass-tuft", "x": 59.2, "y": 71.7, "act": "bloom", "w": 38}, {"img": "grass-tuft", "x": 35.7, "y": 71.5, "act": "bloom", "w": 38}, {"img": "flower", "x": 54.9, "y": 65.3, "act": "bloom", "w": 32}, {"img": "flower", "x": 47.7, "y": 66.8, "act": "bloom", "w": 33}, {"img": "flower", "x": 60.3, "y": 67.8, "act": "bloom", "w": 28}, {"img": "flower", "x": 61.2, "y": 69.7, "act": "bloom", "w": 36}, {"img": "flower", "x": 51.8, "y": 70.5, "act": "bloom", "w": 28}, {"img": "flower", "x": 65.6, "y": 67.7, "act": "bloom", "w": 37}, {"img": "bush", "x": 59.1, "y": 69.8, "act": "wiggle", "w": 74}, {"img": "bush", "x": 49.5, "y": 72.2, "act": "wiggle", "w": 82}, {"img": "bush", "x": 36.6, "y": 68.2, "act": "wiggle", "w": 75}, {"img": "tree", "x": 42.1, "y": 66.3, "act": "wiggle", "w": 93}, {"img": "tree", "x": 67.1, "y": 66.3, "act": "wiggle", "w": 90}, {"img": "tree", "x": 40.6, "y": 68.3, "act": "wiggle", "w": 91}, {"img": "tree", "x": 46.2, "y": 65.5, "act": "wiggle", "w": 75}, {"img": "tree", "x": 34.7, "y": 68.5, "act": "wiggle", "w": 95}, {"img": "tree", "x": 49.9, "y": 66.0, "act": "wiggle", "w": 80}, {"img": "grass-tuft", "x": 67.9, "y": 34.8, "act": "bloom", "w": 36}, {"img": "grass-tuft", "x": 51.7, "y": 34.0, "act": "bloom", "w": 36}, {"img": "grass-tuft", "x": 44.3, "y": 33.4, "act": "bloom", "w": 37}, {"img": "grass-tuft", "x": 45.3, "y": 36.2, "act": "bloom", "w": 37}, {"img": "grass-tuft", "x": 63.9, "y": 36.0, "act": "bloom", "w": 40}, {"img": "grass-tuft", "x": 45.8, "y": 36.0, "act": "bloom", "w": 37}, {"img": "flower", "x": 45.6, "y": 34.4, "act": "bloom", "w": 28}, {"img": "flower", "x": 49.9, "y": 35.3, "act": "bloom", "w": 33}, {"img": "flower", "x": 36.5, "y": 35.0, "act": "bloom", "w": 38}, {"img": "flower", "x": 60.5, "y": 36.4, "act": "bloom", "w": 29}, {"img": "tree", "x": 41.8, "y": 34.0, "act": "wiggle", "w": 82}, {"img": "tree", "x": 55.2, "y": 34.7, "act": "wiggle", "w": 79}, {"img": "tree", "x": 62.6, "y": 36.5, "act": "wiggle", "w": 70}, {"img": "tree", "x": 36.6, "y": 34.7, "act": "wiggle", "w": 94}];

/* ---------------- 小工具 ---------------- */
function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }
function shuffle(arr) {
  var a = arr.slice();
  for (var i = a.length - 1; i > 0; i--) {
    var j = Math.floor(Math.random() * (i + 1));
    var t = a[i]; a[i] = a[j]; a[j] = t;
  }
  return a;
}
function sleep(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }
function px(pct) { return pct / 100 * WORLD_W; }   /* 世界 x 百分比 → 世界像素 */
function py(pct) { return pct / 100 * WORLD_H; }   /* 世界 y 百分比 → 世界像素 */
function sentenceText(wordId, animalId, spotId) {
  return 'The ' + CHARS[animalId].en + ' is ' + WORDS[wordId].en + ' the ' + SPOTS[spotId].en + '.';
}
function sentenceKey(wordId, spotId) { return 'sent-' + wordId + '-' + spotId; }

/* ============================================================================
 * BootScene：加载全部美术 + 29 条预录音
 * ========================================================================== */
var AUDIO_KEYS = ['finish', 'praise', 'silence',
  'sent-behind-house', 'sent-behind-mountain', 'sent-behind-tree',
  'sent-front-house', 'sent-front-mountain', 'sent-front-tree',
  'sent-in-basket', 'sent-in-box', 'sent-in-house',
  'sent-nextto-flower', 'sent-nextto-house', 'sent-nextto-mountain', 'sent-nextto-tree',
  'sent-on-box', 'sent-on-bridge', 'sent-on-mountain', 'sent-on-rock',
  'sent-under-bridge', 'sent-under-tree', 'sent-under-umbrella',
  'word-behind', 'word-front', 'word-in_', 'word-nextto', 'word-on', 'word-under'];

function BootScene() { Phaser.Scene.call(this, { key: 'Boot' }); }
BootScene.prototype = Object.create(Phaser.Scene.prototype);
BootScene.prototype.constructor = BootScene;
BootScene.prototype.preload = function () {
  var w = this.cameras.main.width, h = this.cameras.main.height;
  var barBg = this.add.graphics().fillStyle(0xffffff, 0.9).fillRoundedRect(w / 2 - 130, h / 2 - 12, 260, 24, 12);
  var bar = this.add.graphics();
  var label = this.add.text(w / 2, h / 2 - 40, '彩虹小岛加载中…', { fontSize: '20px', color: '#7c3aed' }).setOrigin(0.5);
  this.load.on('progress', function (p) {
    bar.clear().fillStyle(0xf59e0b, 1).fillRoundedRect(w / 2 - 126, h / 2 - 8, 252 * p, 16, 8);
  });
  this.load.on('loaderror', function (f) { console.error('[loaderror]', f.key, f.url); });

  var imgs = ['horse', 'cat', 'dog', 'bear', 'bird', 'princess', 'tree', 'house', 'box',
    'basket', 'bridge', 'table', 'flower', 'rock', 'bush', 'pebble', 'grass-tuft',
    'grass-tile', 'sand-tile', 'water-tile', 'dirt-tile'];
  for (var i = 0; i < imgs.length; i++) this.load.image(imgs[i], 'assets/' + imgs[i] + '.png');
  this.load.image('island-bg', 'assets/island-bg.webp');
  for (var j = 0; j < AUDIO_KEYS.length; j++) {
    this.load.audio(AUDIO_KEYS[j], 'assets/audio/' + AUDIO_KEYS[j] + '.mp3');
  }
};
BootScene.prototype.create = function () {
  this.scene.start('Game');
  this.scene.launch('UI');
};

/* ============================================================================
 * GameScene：大世界、相机、角色、对话、回合
 * ========================================================================== */
function GameScene() { Phaser.Scene.call(this, { key: 'Game' }); }
GameScene.prototype = Object.create(Phaser.Scene.prototype);
GameScene.prototype.constructor = GameScene;

/* ---------- 状态 ---------- */
GameScene.prototype.initState = function () {
  this.selWords = ['behind'];
  this.rounds = [];
  this.roundIdx = 0;
  this.stars = 0;
  this.wrongCount = 0;
  this.modeIdx = 0;
  this.MODES = ['day', 'sunset', 'night'];
  this.curRound = null;
  this.seqToken = 0;
  this.audioUnlocked = false;
  this.phase = 'idle';            /* idle | walking | dialogue | answering | celebrating */
  this.dialogueBusy = false;
  this.wanderOn = true;
  this.freeTalkCooldown = 0;
  this.speedMul = 1;              /* 测试钩子：__v17.setSpeed(n) 加速走路（默认 1，正常速度） */
  this.movers = {};               /* id -> {tx, ty, speed, resolve, tween} */
  this.wanderTimers = {};
  this.chars = {};                /* id -> {container, img, shadow} */
  this.spots = {};                /* id -> image */
  this.circles = [];              /* 当前放一放的圈 */
  this.dragState = null;
  this.lastSpoken = [];           /* 每次发声的记录（文字或 clip key），供测试核对 */
  this.hintRing = null;
  this.modeTint = null;
  this.nightFx = [];
};

GameScene.prototype.create = function () {
  this.initState();
  this.ui = this.scene.get('UI');
  this.buildWorld();
  this.buildCharacters();
  this.buildDeco();
  this.buildSpots();
  this.buildNightFx();

  var cam = this.cameras.main;
  cam.setViewport(0, TOP_H, GAME_W, WORLD_VIEW_H);
  cam.setBounds(0, 0, WORLD_W, WORLD_H);
  cam.startFollow(this.chars.princess.container, false, 0.08, 0.08);
  cam.centerOn(px(POS.princess.x), py(POS.princess.y));

  this.applyMode();
  this.input.on('pointerdown', this.onWorldPointer.bind(this));
  this.time.addEvent({ delay: 400, loop: true, callback: function () { if (this.ui) this.ui.updateMinimap(); }.bind(this) });
  window.__v17 = window.__v17 || {};
  window.__v17.game = this;
  window.__v17.getState = this.getState.bind(this);
  window.__v17.sentenceFor = sentenceText;
  window.__v17.setWords = function (words) { this.selWords = words.slice(); }.bind(this);
  window.__v17.startGame = this.startGame.bind(this);
  window.__v17.setSpeed = function (n) { this.speedMul = n; }.bind(this);
};

/* ---------- 造岛 ---------- */
GameScene.prototype.buildWorld = function () {
  var g = this;
  /* 草地底 */
  var grass = g.add.tileSprite(0, 0, WORLD_W, WORLD_H, 'grass-tile').setOrigin(0, 0);
  grass.tileScaleX = 320 / 512; grass.tileScaleY = 320 / 512;
  /* 岛顶雪山背景（webp 顶部裁一段，铺满 4800x300） */
  var bg = g.add.image(0, 0, 'island-bg').setOrigin(0, 0);
  bg.setCrop(0, 0, 1920, 192);
  bg.displayWidth = WORLD_W; bg.displayHeight = 300;
  /* 沙滩带 74%..95% */
  var sand = g.add.tileSprite(0, py(74), WORLD_W, py(21), 'sand-tile').setOrigin(0, 0);
  sand.tileScaleX = 300 / 512; sand.tileScaleY = 300 / 512;
  /* 大海带 95%..100% */
  var sea = g.add.tileSprite(0, py(95), WORLD_W, py(5), 'water-tile').setOrigin(0, 0);
  sea.tileScaleX = 260 / 512; sea.tileScaleY = 260 / 512;
  /* 池塘（椭圆水面，40%..60% x，42%..58% y） */
  var pond = g.add.tileSprite(px(40), py(42), px(20), py(16), 'water-tile').setOrigin(0, 0);
  pond.tileScaleX = 260 / 512; pond.tileScaleY = 260 / 512;
  var pondShape = g.add.ellipse(px(50), py(50), px(20), py(16), 0xffffff);
  pondShape.setVisible(false);
  pond.setMask(new Phaser.Display.Masks.GeometryMask(g, pondShape));
  /* 区域色块 + 名称 */
  ZONES.forEach(function (z) {
    if (z.id === 'mountain' || z.id === 'sea') return; /* 已有雪山图和海带 */
    var wash = g.add.rectangle(px(z.x0), py(z.y0), px(z.x1 - z.x0), py(z.y1 - z.y0), 0xffffff, 0).setOrigin(0, 0);
    if (z.id === 'pond') return;
    wash.setFillStyle(Phaser.Display.Color.HexStringToColor(z.color).color, 0.10);
    if (z.id === 'forest') wash.setFillStyle(0x166534, 0.12);
    if (z.id === 'house') wash.setFillStyle(0xfbbf24, 0.14);
    if (z.id === 'garden') wash.setFillStyle(0xf472b6, 0.10);
    if (z.id === 'beach') wash.setFillStyle(0xfde68a, 0.10);
  });
  Object.keys(ZONE_LABEL_POS).forEach(function (id) {
    var p = ZONE_LABEL_POS[id];
    var z = null;
    ZONES.forEach(function (zz) { if (zz.id === id) z = zz; });
    if (!z) return;
    g.add.text(px(p[0]), py(p[1]), z.zh, { fontSize: '26px', color: '#5b4636', backgroundColor: 'rgba(255,255,255,0.88)', padding: { x: 18, y: 6 } })
      .setOrigin(0.5).setDepth(2);
  });
  /* 小路（泥土色圆角条） */
  var segs = [
    { x: 27, y: 55, w: 13, h: 26, r: 8 }, { x: 61, y: 55, w: 12, h: 26, r: -6 },
    { x: 49.4, y: 64, w: 26, h: 11, r: 0 }, { x: 33, y: 33, w: 11, h: 26, r: 35 },
    { x: 49.4, y: 72, w: 26, h: 7, r: 0 }
  ];
  segs.forEach(function (s) {
    var isV = s.w < s.h;
    var tile = g.add.tileSprite(px(s.x), py(s.y), isV ? 26 : px(s.w), isV ? py(s.h) : 26, 'dirt-tile').setOrigin(0.5);
    tile.tileScaleX = 160 / 512; tile.tileScaleY = 160 / 512;
    tile.setAngle(s.r);
    var maskShape = g.add.rectangle(px(s.x), py(s.y), isV ? 26 : px(s.w), isV ? py(s.h) : 26, 0xffffff).setAngle(s.r);
    maskShape.setVisible(false);
    tile.setMask(new Phaser.Display.Masks.GeometryMask(g, maskShape));
  });
};

GameScene.prototype.buildDeco = function () {
  var g = this;
  DECO.forEach(function (it) {
    var key = it.img.replace('../assets/', '').replace('.png', '');
    var img = g.add.image(px(it.x), py(it.y), key).setOrigin(0.5, 1);
    var tex = g.textures.get(key).getSourceImage();
    var scale = it.w / tex.width;
    img.setScale(scale);
    img.setDepth(py(it.y));
    img.setInteractive({ useHandCursor: true });
    img.on('pointerdown', function () {
      g.tweens.add({ targets: img, angle: -12, duration: 130, yoyo: true, repeat: 1,
        onComplete: function () { img.setAngle(0); } });
      g.tweens.add({ targets: img, scaleX: scale * 1.15, scaleY: scale * 1.15, duration: 160, yoyo: true });
    });
  });
};

GameScene.prototype.buildSpots = function () {
  var g = this;
  Object.keys(SPOTS).forEach(function (id) {
    var sp = SPOTS[id];
    var img = g.add.image(px(sp.x), py(sp.y), sp.img).setOrigin(0.5, 1);
    var tex = g.textures.get(sp.img).getSourceImage();
    img.setScale(Math.min(sp.w / tex.width, sp.h / tex.height));
    img.setDepth(py(sp.y));
    img.setInteractive({ useHandCursor: true });
    img.on('pointerdown', function () { g.onSpotTap(sp); });
    g.spots[id] = img;
    g.add.text(px(sp.x), py(sp.y) + 26, sp.zh, { fontSize: '22px', color: '#5b4636',
      backgroundColor: 'rgba(255,255,255,0.85)', padding: { x: 10, y: 2 } })
      .setOrigin(0.5, 0).setDepth(py(sp.y) + 1);
  });
};

GameScene.prototype.buildCharacters = function () {
  var g = this;
  function makeChar(id, imgKey, boxW, boxH, isPrincess) {
    var tex = g.textures.get(imgKey).getSourceImage();
    var scale = Math.min(boxW / tex.width, boxH / tex.height);
    var c = g.add.container(px(POS[id].x), py(POS[id].y));
    var shadow = g.add.ellipse(0, 4, boxW * 0.8, 14, 0x000000, 0.18);
    var img = g.add.image(0, 0, imgKey).setOrigin(0.5, 1).setScale(scale);
    img.setInteractive({ useHandCursor: true });
    c.add([shadow, img]);
    c.setDepth(py(POS[id].y) + 5);
    c.setSize(boxW, boxH);
    g.chars[id] = { container: c, img: img, shadow: shadow, scale: scale, boxW: boxW, boxH: boxH };
    if (!isPrincess) {
      img.on('pointerdown', function () { g.onAnimalTap(id); });
    } else {
      img.on('pointerdown', function () {
        g.princessWave();
        if (g.phase === 'idle' && !g.dialogueBusy) {
          g.sayLine('princess', 'Hi! I am Rainbow Princess!', { tts: 'Hi! I am Rainbow Princess!' });
        }
      });
    }
    return g.chars[id];
  }
  CHAR_IDS.forEach(function (id) { makeChar(id, CHARS[id].img, 64, 76, false); });
  makeChar('princess', 'princess', 70, 92, true);
};

GameScene.prototype.buildNightFx = function () {
  var g = this;
  for (var i = 0; i < 26; i++) {
    var s = g.add.text(px(3 + Math.random() * 94), py(2 + Math.random() * 40), '✦',
      { fontSize: '24px', color: '#ffffff' }).setDepth(9000).setVisible(false);
    g.tweens.add({ targets: s, alpha: 0.2, duration: 800 + Math.random() * 800, yoyo: true, repeat: -1 });
    g.nightFx.push(s);
  }
  for (var j = 0; j < 8; j++) {
    var f = g.add.circle(px(10 + Math.random() * 80), py(55 + Math.random() * 30), 8, 0xd9f99d).setDepth(9000).setVisible(false);
    g.tweens.add({ targets: f, x: '+=52', y: '-=68', duration: 7000, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    g.nightFx.push(f);
  }
  /* 昼夜色罩：盖住整个世界，在 UI 之下、星星/彩带之上（星星 9000 仍可见） */
  this.modeTint = this.add.rectangle(0, 0, WORLD_W, WORLD_H, 0x000000, 0).setOrigin(0, 0).setDepth(8500);
};

/* ---------- 昼夜 ---------- */
GameScene.prototype.applyMode = function () {
  var m = this.MODES[this.modeIdx];
  if (!this.modeTint) return;
  if (m === 'day') this.modeTint.setFillStyle(0x000000, 0);
  if (m === 'sunset') this.modeTint.setFillStyle(0xff8c3c, 0.22);
  if (m === 'night') this.modeTint.setFillStyle(0x080e34, 0.45);
  this.nightFx.forEach(function (o) { o.setVisible(m === 'night'); });
  if (this.ui) this.ui.setSunIcon(m);
};
GameScene.prototype.cycleMode = function () {
  this.modeIdx = (this.modeIdx + 1) % this.MODES.length;
  this.applyMode();
};

/* ---------- 音频：horse 用预录音，其余动物用慢速 TTS（v16 修复逻辑） ---------- */
GameScene.prototype.hasClip = function (key) { return this.cache.audio.exists(key); };
GameScene.prototype.playClip = function (key) {
  var g = this;
  return new Promise(function (res) {
    var done = false;
    function fin() { if (!done) { done = true; res(); } }
    try {
      if (!g.cache.audio.exists(key)) { fin(); return; }
      var snd = g.sound.add(key);
      snd.once('complete', fin);
      snd.play();
      setTimeout(fin, 6000);
    } catch (e) { fin(); }
  });
};
GameScene.prototype.speakTTS = function (text, rate) {
  var g = this;
  g.lastSpoken.push({ kind: 'tts', text: text, rate: rate || 0.7 });
  console.log('[TTS]', text);
  return new Promise(function (res) {
    var done = false;
    function fin() { if (!done) { done = true; res(); } }
    try {
      if (!('speechSynthesis' in window)) { fin(); return; }
      var u = new SpeechSynthesisUtterance(text);
      u.lang = 'en-US'; u.rate = rate || 0.7; u.pitch = 1.1;
      var voices = window.speechSynthesis.getVoices();
      for (var i = 0; i < voices.length; i++) {
        if (voices[i].lang && voices[i].lang.indexOf('en') === 0) { u.voice = voices[i]; break; }
      }
      u.onend = fin; u.onerror = fin;
      window.speechSynthesis.cancel();
      setTimeout(function () { window.speechSynthesis.speak(u); }, 80);
      setTimeout(fin, 6000);
    } catch (e) { fin(); }
  });
};
/* 先单独读目标词（慢），停半秒，再读整句（慢） */
GameScene.prototype.playWord = async function (wordId) {
  var w = WORDS[wordId];
  this.lastSpoken.push({ kind: 'word', word: wordId, text: w.en });
  if (this.hasClip(w.clip)) { await this.playClip(w.clip); }
  else { await this.speakTTS(w.en, 0.7); }
};
GameScene.prototype.playSentence = async function (round) {
  var key = sentenceKey(round.word, round.spot);
  var text = sentenceText(round.word, round.animal, round.spot);
  if (round.animal === 'horse' && this.hasClip(key)) {
    this.lastSpoken.push({ kind: 'clip', key: key, text: text });
    await this.playClip(key);
  } else {
    /* v16 fix：非 horse 的题绝不用 horse 录音，走 TTS 读本动物的句子 */
    await this.speakTTS(text, 0.7);
  }
};
GameScene.prototype.playQuestionAudio = async function (round) {
  await this.playWord(round.word);
  await sleep(500);
  await this.playSentence(round);
};

/* ---------- 移动引擎（与 v15 同一套语义：% 坐标、速度 %/秒） ---------- */
GameScene.prototype.applyPos = function (id) {
  var c = this.chars[id];
  if (!c) return;
  c.container.setPosition(px(POS[id].x), py(POS[id].y));
  if (!c.placed) c.container.setDepth(py(POS[id].y) + 5);
};
GameScene.prototype.walkTo = function (id, tx, ty, speed) {
  var g = this;
  return new Promise(function (resolve) {
    var c = g.chars[id];
    if (!c) { resolve(false); return; }
    if (g.movers[id]) g.movers[id].resolve(false);
    var dx = tx - POS[id].x, dy = ty - POS[id].y;
    var dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < 0.6) { resolve(true); return; }
    c.img.setFlipX(dx < -0.5);
    var bob = g.tweens.add({ targets: c.img, y: -7, duration: 140, yoyo: true, repeat: -1 });
    g.movers[id] = { tx: tx, ty: ty, speed: speed || 14, resolve: resolve, tween: bob };
  });
};
GameScene.prototype.stopWalking = function (id) {
  if (this.movers[id]) {
    var m = this.movers[id];
    delete this.movers[id];
    if (m.tween) m.tween.stop();
    this.chars[id].img.y = 0;
    m.resolve(false);
  }
};
GameScene.prototype.update = function (time, delta) {
  var dt = Math.min(0.1, delta / 1000);
  var ids = Object.keys(this.movers);
  for (var i = 0; i < ids.length; i++) {
    var m = this.movers[ids[i]];
    var p = POS[ids[i]];
    var dx = m.tx - p.x, dy = m.ty - p.y;
    var dist = Math.sqrt(dx * dx + dy * dy);
    var step = m.speed * dt * (this.speedMul || 1);
    if (dist <= step) {
      p.x = m.tx; p.y = m.ty;
      delete this.movers[ids[i]];
      if (m.tween) m.tween.stop();
      this.chars[ids[i]].img.y = 0;
      this.applyPos(ids[i]);
      m.resolve(true);
    } else {
      p.x += dx / dist * step;
      p.y += dy / dist * step;
      this.applyPos(ids[i]);
    }
  }
};
GameScene.prototype.pondClamp = function (x, y) {
  var nx = (x - 50) / 10, ny = (y - 50) / 8;
  var d = Math.sqrt(nx * nx + ny * ny);
  if (d < 1.0) {
    if (d < 0.01) { nx = 0; ny = 1; d = 1; }
    var k = 1.08 / d;
    return { x: 50 + nx * k * 10, y: 50 + ny * k * 8 };
  }
  return { x: x, y: y };
};
GameScene.prototype.walkPrincessTo = function (x, y, speed) {
  var c = this.pondClamp(clamp(x, 3, 97), clamp(y, 4, 96));
  return this.walkTo('princess', c.x, c.y, speed || 18);
};

/* ---------- 动物漫步 ---------- */
GameScene.prototype.wanderPoint = function (id) {
  if (id === 'bird') {
    var a = Math.random() * Math.PI * 2;
    var k = 1.2 + Math.random() * 0.4;
    return { x: 50 + Math.cos(a) * 10 * k, y: 50 + Math.sin(a) * 8 * k };
  }
  var z = WANDER_ZONES[id] || { x0: 10, x1: 90, y0: 10, y1: 90 };
  return { x: z.x0 + Math.random() * (z.x1 - z.x0), y: z.y0 + Math.random() * (z.y1 - z.y0) };
};
GameScene.prototype.startWander = function (id) {
  var g = this;
  if (g.wanderTimers[id]) return;
  function loop() {
    if (!g.wanderOn) { g.wanderTimers[id] = setTimeout(loop, 1200); return; }
    if (g.phase === 'dialogue' || g.phase === 'answering' || g.phase === 'celebrating') {
      g.wanderTimers[id] = setTimeout(loop, 1500); return;
    }
    if (g.curRound && g.curRound.animal === id) { g.wanderTimers[id] = setTimeout(loop, 1500); return; }
    var pt = g.wanderPoint(id);
    var c = g.chars[id];
    if (c) { g.clearPlacement(id); }
    g.walkTo(id, pt.x, pt.y, 5 + Math.random() * 2).then(function () {
      g.wanderTimers[id] = setTimeout(loop, 1800 + Math.random() * 3200);
    });
  }
  g.wanderTimers[id] = setTimeout(loop, 800 + Math.random() * 2000);
};
GameScene.prototype.stopWander = function (id) {
  if (this.wanderTimers[id]) { clearTimeout(this.wanderTimers[id]); delete this.wanderTimers[id]; }
  this.stopWalking(id);
};
GameScene.prototype.startAllWander = function () { var g = this; CHAR_IDS.forEach(function (id) { g.startWander(id); }); };
GameScene.prototype.stopAllWander = function () { var g = this; CHAR_IDS.forEach(function (id) { g.stopWander(id); }); };

/* ---------- 对话 ---------- */
GameScene.prototype.setDialogue = function (speakerId, name, segments) {
  if (this.ui) this.ui.setDialogue(speakerId, name, segments);
};
GameScene.prototype.sayLine = async function (speakerId, textHtml, audio) {
  /* textHtml 是 v15 风格的 HTML 片段（<span class='key'>…</span> 高亮目标词）；
     这里转成 UI 的分段文本：普通段 + 紫色高亮段。 */
  if (this.dialogueBusy) return;
  this.dialogueBusy = true;
  var segments = [];
  var re = /<span class='key'>(.*?)<\/span>/g;
  var last = 0, m;
  var plain = textHtml;
  while ((m = re.exec(textHtml)) !== null) {
    if (m.index > last) segments.push({ t: plain.slice(last, m.index), key: false });
    segments.push({ t: m[1], key: true });
    last = m.index + m[0].length;
  }
  if (last < plain.length) segments.push({ t: plain.slice(last), key: false });
  if (segments.length === 0) segments.push({ t: textHtml, key: false });
  var name = speakerId === 'princess' ? '彩虹公主' : CHARS[speakerId].zh;
  this.setDialogue(speakerId, name, segments);
  var c = this.chars[speakerId];
  if (c) {
    this.tweens.add({ targets: c.img, y: -8, duration: 220, yoyo: true, repeat: 1 });
  }
  try {
    if (audio && audio.clip) await this.playClip(audio.clip);
    else if (audio && audio.tts) await this.speakTTS(audio.tts, 0.75);
    else await sleep(700);
  } finally {
    this.dialogueBusy = false;
  }
  await sleep(150);
};
GameScene.prototype.princessWave = function () {
  var c = this.chars.princess;
  if (!c) return;
  this.tweens.add({ targets: c.img, angle: -8, duration: 250, yoyo: true, repeat: 3,
    onComplete: function () { c.img.setAngle(0); } });
};
GameScene.prototype.princessPoint = function () {
  var c = this.chars.princess;
  if (!c) return;
  this.tweens.add({ targets: c.container, x: '+=12', duration: 300, yoyo: true, repeat: 1 });
};
GameScene.prototype.setStatus = function (t) { if (this.ui) this.ui.setStatus(t); };

/* ---------- 位置摆放 ---------- */
GameScene.prototype.placeAnimalAtSpot = function (animalId, spot, wordId) {
  var off = wordOffset(wordId);
  var c = this.chars[animalId];
  this.stopWalking(animalId);
  POS[animalId].x = clamp(spot.x + off.dx / WORLD_W * 100, 3, 97);
  POS[animalId].y = clamp(spot.y + off.dy / WORLD_H * 100, 4, 96);
  this.applyPos(animalId);
  var tex = this.textures.get(CHARS[animalId].img).getSourceImage();
  if (off.cls === 'behind') {
    c.img.setCrop(0, 0, tex.width, Math.floor(tex.height * 0.55));
    c.container.setDepth(py(spot.y) - 1);
    c.placed = true;
  } else if (off.cls === 'inbox') {
    c.img.setCrop(0, 0, tex.width, Math.floor(tex.height * 0.54));
    c.container.setDepth(py(spot.y) + 1);
    c.placed = true;
  } else {
    c.img.setCrop();  /* Phaser 3.80 has no clearCrop(); setCrop() with no args resets the crop */
    c.container.setDepth(py(POS[animalId].y) + 5);
    c.placed = false;
  }
  c.img.setFlipX(false);
};
GameScene.prototype.clearPlacement = function (animalId) {
  var c = this.chars[animalId];
  if (!c) return;
  c.img.setCrop();  /* Phaser 3.80 has no clearCrop(); setCrop() with no args resets the crop */
  c.placed = false;
  c.container.setDepth(py(POS[animalId].y) + 5);
};
GameScene.prototype.homeAnimal = function (animalId) {
  this.clearPlacement(animalId);
  var h = HOME_POS[animalId];
  return this.walkTo(animalId, h.x, h.y, 12);
};
GameScene.prototype.spreadAnimalsAwayFrom = function (spot) {
  var g = this;
  CHAR_IDS.forEach(function (id) {
    if (g.curRound && g.curRound.animal === id) return;
    var p = POS[id];
    var dx = (p.x - spot.x) / 100 * WORLD_W, dy = (p.y - spot.y) / 100 * WORLD_H;
    if (Math.hypot(dx, dy) < 600) {
      var best = null, bestD = -1;
      for (var t = 0; t < 12; t++) {
        var pt = g.wanderPoint(id);
        var ddx = (pt.x - spot.x) / 100 * WORLD_W, ddy = (pt.y - spot.y) / 100 * WORLD_H;
        var d = Math.hypot(ddx, ddy);
        if (d > bestD) { bestD = d; best = pt; }
        if (d > 650) break;
      }
      if (best) g.walkTo(id, best.x, best.y, 12);
    }
  });
};

/* ---------- 岛面自由交互 ---------- */
GameScene.prototype.onWorldPointer = function (pointer) {
  if (this.phase === 'answering' || this.phase === 'dialogue' || this.phase === 'celebrating') return;
  if (this.ui && this.ui.overlayVisible) return;
  if (pointer.y < TOP_H || pointer.y > UI_TOP) return; /* 只在世界视口里点才走 */
  var wx = pointer.worldX / WORLD_W * 100;
  var wy = pointer.worldY / WORLD_H * 100;
  if (wx < 3 || wx > 97 || wy < 4 || wy > 96) return;
  this.chars.princess.img.setFlipX(wx < POS.princess.x);
  this.walkPrincessTo(wx, wy, 18);
};
GameScene.prototype.onSpotTap = function (spot) {
  var img = this.spots[spot.id];
  if (img) {
    this.tweens.add({ targets: img, scaleX: img.scaleX * 1.12, scaleY: img.scaleY * 1.12, duration: 180, yoyo: true });
    this.tweens.add({ targets: img, angle: -6, duration: 140, yoyo: true, repeat: 1, onComplete: function () { img.setAngle(0); } });
  }
  if (this.phase === 'idle') {
    this.setDialogue('princess', '彩虹公主', [{ t: '这是' + spot.zh + '！', key: false }]);
    this.setStatus('这是' + spot.zh);
  }
};
GameScene.prototype.onAnimalTap = async function (id) {
  var now = Date.now();
  if (now < this.freeTalkCooldown) return;
  this.freeTalkCooldown = now + 2500;
  this.stopWander(id);
  this.stopWalking(id);
  var ch = CHARS[id];
  if (this.phase === 'idle') {
    this.chars[id].img.setFlipX(POS.princess.x < POS[id].x);
    this.chars.princess.img.setFlipX(POS[id].x < POS.princess.x);
    await this.sayLine(id, 'Hello!', { tts: CHAR_GREETING[id] });
    this.princessWave();
    await this.sayLine('princess', 'Hi, little ' + ch.en + "! Let's play!", { tts: 'Hi, little ' + ch.en + "! Let's play!" });
    this.startWander(id);
  }
};
GameScene.prototype.getState = function () {
  return {
    phase: this.phase, roundIdx: this.roundIdx, roundsTotal: this.rounds.length,
    stars: this.stars, selWords: this.selWords.slice(),
    curRound: this.curRound ? { word: this.curRound.word, animal: this.curRound.animal,
      spot: this.curRound.spot, type: this.curRound.type } : null,
    lastSpoken: this.lastSpoken.slice(-6)
  };
};

/* ============================================================================
 * 回合：找一找 / 放一放
 * ========================================================================== */
GameScene.prototype.buildRounds = function (wordId) {
  var spots = ROUND_SPOTS[wordId] || ROUND_SPOTS.behind;
  var animals = shuffle(CHAR_IDS).slice(0, 4);
  var rs = [];
  for (var i = 0; i < 4; i++) {
    rs.push({ word: wordId, animal: animals[i], spot: spots[i % spots.length],
              type: (i % 2 === 0) ? 'find' : 'place', idx: i });
  }
  return rs;
};
GameScene.prototype.sentenceSegments = function (wordId, animalId, spotId) {
  return [
    { t: 'The ' + CHARS[animalId].en + ' is ', key: false },
    { t: WORDS[wordId].en, key: true },
    { t: ' the ' + SPOTS[spotId].en + '.', key: false }
  ];
};

GameScene.prototype.startGame = async function () {
  this.rounds = [];
  var g = this;
  this.selWords.forEach(function (wid) { g.rounds = g.rounds.concat(g.buildRounds(wid)); });
  this.roundIdx = 0;
  this.stars = 0;
  this.phase = 'idle';
  this.wanderOn = true;
  this.startAllWander();
  if (this.ui) { this.ui.renderStars(); this.ui.renderWordChip(); }
  this.setDialogue('princess', '彩虹公主', [{ t: '小岛上有好多小动物，点一点小岛，咱们去找它们玩吧！', key: false }]);
  this.setStatus('先逛逛小岛吧');
  await this.startRound();
};

GameScene.prototype.startRound = async function () {
  var r = this.rounds[this.roundIdx];
  if (!r) { this.showFinish(); return; }
  this.curRound = r;
  this.wrongCount = 0;
  var myToken = ++this.seqToken;
  this.phase = 'dialogue';
  /* 每回合重新跟随公主（提示的 pan 可能已断开跟随） */
  this.cameras.main.startFollow(this.chars.princess.container, false, 0.08, 0.08);
  if (this.ui) this.ui.renderWordChip();   /* 每回合都刷新词条（换词 bug 修复） */
  var ch = CHARS[r.animal];
  var spot = SPOTS[r.spot];
  this.stopWander(r.animal);
  this.spreadAnimalsAwayFrom(spot);
  var ap = { x: POS[r.animal].x, y: POS[r.animal].y };
  this.setStatus('彩虹公主去找' + ch.zh + '啦 · ' + ch.zh + '在' + (ch.zone || '岛上') + '里');
  await this.walkPrincessTo(ap.x + 70 / WORLD_W * 100, ap.y + 12 / WORLD_H * 100, 18);
  if (myToken !== this.seqToken) return;
  this.chars.princess.img.setFlipX(POS[r.animal].x < POS.princess.x);
  this.chars[r.animal].img.setFlipX(POS.princess.x < POS[r.animal].x);
  await this.sayLine(r.animal, 'Hello!', { tts: CHAR_GREETING[r.animal] });
  if (myToken !== this.seqToken) return;
  this.princessWave();
  await this.sayLine('princess', 'Hello, little ' + ch.en + '!', { tts: 'Hello, little ' + ch.en + '!' });
  if (myToken !== this.seqToken) return;
  if (r.type === 'find') await this.runFindRound(r, myToken);
  else await this.runPlaceRound(r, myToken);
};

GameScene.prototype.runFindRound = async function (r, myToken) {
  var ch = CHARS[r.animal];
  var spot = SPOTS[r.spot];
  this.setStatus(ch.zh + '要去' + spot.zh + '那里');
  await this.sayLine('princess', 'Watch! Look at the ' + ch.en + '!', { tts: 'Watch! Look at the ' + ch.en + '!' });
  if (myToken !== this.seqToken) return;
  await this.walkTo(r.animal, clamp(spot.x, 3, 97), clamp(spot.y, 4, 96), 10);
  this.placeAnimalAtSpot(r.animal, spot, r.word);
  await sleep(350);
  await this.walkPrincessTo(spot.x + 90 / WORLD_W * 100, spot.y + 80 / WORLD_H * 100, 18);
  if (myToken !== this.seqToken) return;
  await this.sayLine('princess', 'Where is the ' + ch.en + '?', { tts: 'Where is the ' + ch.en + '?' });
  if (myToken !== this.seqToken) return;
  /* 回合出现自动读题：先读词、再读整句（都是慢速） */
  await this.playQuestionAudio(r);
  if (myToken !== this.seqToken) return;
  this.phase = 'answering';
  this.setStatus('点一点：小动物在哪里？');
  var picked = await this.ui.askFindChoice(r);
  if (myToken !== this.seqToken) return;
  if (picked) await this.celebrateAndSay(r, myToken);
};

GameScene.prototype.runPlaceRound = async function (r, myToken) {
  var ch = CHARS[r.animal];
  var spot = SPOTS[r.spot];
  var w = WORDS[r.word];
  await this.sayLine('princess', 'Put the ' + ch.en + ' <span class=\'key\'>' + w.en + '</span> the ' + spot.en + '!',
    { tts: 'Put the ' + ch.en + ' ' + w.en + ' the ' + spot.en + '!' });
  if (myToken !== this.seqToken) return;
  await Promise.all([
    this.walkTo(r.animal, clamp(spot.x + 130 / WORLD_W * 100, 3, 97), clamp(spot.y + 30 / WORLD_H * 100, 4, 96), 12),
    this.walkPrincessTo(spot.x, spot.y + 110 / WORLD_H * 100, 18)
  ]);
  if (myToken !== this.seqToken) return;
  await this.playQuestionAudio(r);
  if (myToken !== this.seqToken) return;
  this.phase = 'answering';
  this.setStatus('把' + ch.zh + '拖到对的地方，或点一下圈圈');
  var ok = await this.askPlace(r);
  if (myToken !== this.seqToken) return;
  if (ok) await this.celebrateAndSay(r, myToken);
};

/* 放一放：三个落点圈，点圈或拖动物 */
GameScene.prototype.askPlace = function (r) {
  var g = this;
  return new Promise(function (resolve) {
    var spot = SPOTS[r.spot];
    var others = WORD_ORDER.filter(function (id) { return id !== r.word; });
    var opts = shuffle([r.word].concat(shuffle(others).slice(0, 2)));
    g.clearCircles();
    opts.forEach(function (wid) {
      var off = circleOffset(wid);
      var cx = px(clamp(spot.x + off.dx / WORLD_W * 100, 4, 96));
      var cy = py(clamp(spot.y + off.dy / WORLD_H * 100, 6, 94));
      var gfx = g.add.graphics().setDepth(py(spot.y) + 2);
      gfx._cx = cx; gfx._cy = cy;
      g.drawDashedCircle(gfx, cx, cy, 56, 0xffffff);
      g.tweens.add({ targets: gfx, alpha: 0.55, duration: 600, yoyo: true, repeat: -1 });
      /* 点按区 64px：圈与圈中心最短约 80px，130px 的区会互相重叠、点对圈却判错圈 */
      var zone = g.add.zone(cx, cy, 64, 64).setInteractive({ useHandCursor: true });
      zone.setDepth(py(spot.y) + 3);
      var circle = { wid: wid, x: cx, y: cy, gfx: gfx, zone: zone, spotX: spot.x, spotY: spot.y };
      zone.on('pointerdown', function () { g.onCircleTap(r, circle, resolve); });
      g.circles.push(circle);
    });
    g.enableAnimalDrag(r, resolve);
  });
};
GameScene.prototype.drawDashedCircle = function (gfx, cx, cy, rad, color) {
  gfx.clear();
  gfx.lineStyle(5, color, 0.95);
  var segs = 18;
  for (var i = 0; i < segs; i += 2) {
    var a0 = i / segs * Math.PI * 2, a1 = (i + 1) / segs * Math.PI * 2;
    gfx.beginPath();
    gfx.arc(cx, cy, rad, a0, a1, false);
    gfx.strokePath();
  }
};
GameScene.prototype.clearCircles = function () {
  this.circles.forEach(function (c) { c.gfx.destroy(); c.zone.destroy(); });
  this.circles = [];
  this.disableAnimalDrag();
};
GameScene.prototype.onCircleTap = function (r, circle, resolve) {
  var g = this;
  if (g.phase !== 'answering') return;
  var animal = g.chars[r.animal];
  g.walkTo(r.animal, circle.spotX + (circle.x - px(circle.spotX)) / WORLD_W * 100,
    circle.spotY + (circle.y - py(circle.spotY)) / WORLD_H * 100, 12).then(function () {
    if (circle.wid === r.word) {
      g.placeAnimalAtSpot(r.animal, SPOTS[r.spot], r.word);
      g.clearCircles();
      resolve(true);
    } else {
      g.wrongPick(r, circle.gfx);
    }
  });
};
GameScene.prototype.enableAnimalDrag = function (r, resolve) {
  var g = this;
  var img = g.chars[r.animal].img;
  g.disableAnimalDrag();
  img.setInteractive({ draggable: true, useHandCursor: true });
  g.dragState = { animal: r.animal, round: r, resolve: resolve, dragging: false, moved: false };
  g.input.on('dragstart', g._onDragStart, g);
  g.input.on('drag', g._onDrag, g);
  g.input.on('dragend', g._onDragEnd, g);
};
GameScene.prototype.disableAnimalDrag = function () {
  if (!this.dragState) return;
  var img = this.chars[this.dragState.animal] && this.chars[this.dragState.animal].img;
  if (img) img.disableInteractive();
  this.input.off('dragstart', this._onDragStart, this);
  this.input.off('drag', this._onDrag, this);
  this.input.off('dragend', this._onDragEnd, this);
  this.dragState = null;
};
GameScene.prototype._onDragStart = function (pointer, gameObject) {
  var g = this;
  if (!g.dragState || g.phase !== 'answering') return;
  if (gameObject !== g.chars[g.dragState.animal].img) return;
  g.stopWalking(g.dragState.animal);
  g.dragState.dragging = true;
  g.dragState.moved = false;
};
GameScene.prototype._onDrag = function (pointer, gameObject, dragX, dragY) {
  var g = this;
  if (!g.dragState || !g.dragState.dragging) return;
  if (gameObject !== g.chars[g.dragState.animal].img) return;
  var id = g.dragState.animal;
  POS[id].x = clamp(pointer.worldX / WORLD_W * 100, 3, 97);
  POS[id].y = clamp(pointer.worldY / WORLD_H * 100, 4, 96);
  g.applyPos(id);
  g.dragState.moved = true;
};
GameScene.prototype._onDragEnd = function (pointer, gameObject) {
  var g = this;
  if (!g.dragState) return;
  var st = g.dragState;
  g.dragState.dragging = false;
  if (!st.moved || gameObject !== g.chars[st.animal].img) return;
  var best = null, bestD = 1e9;
  g.circles.forEach(function (c) {
    var d = Math.hypot(POS[st.animal].x / 100 * WORLD_W - c.x, POS[st.animal].y / 100 * WORLD_H - c.y);
    if (d < bestD) { bestD = d; best = c; }
  });
  if (best && bestD < 150) {
    var r = st.round;
    if (best.wid === r.word) {
      g.placeAnimalAtSpot(r.animal, SPOTS[r.spot], r.word);
      var resolve = st.resolve;
      g.clearCircles();
      resolve(true);
    } else {
      g.wrongPick(r, best.gfx);
    }
  }
};

/* 答错：温柔语音 + 地点轻闪（不再只有文字） */
GameScene.prototype.wrongPick = async function (r, gfx) {
  var g = this;
  g.wrongCount++;
  var el = g.chars[r.animal];
  if (el) {
    g.tweens.add({ targets: el.container, x: '-=10', duration: 90, yoyo: true, repeat: 3,
      onComplete: function () { g.applyPos(r.animal); } });
  }
  g.princessPoint();
  if (gfx && gfx.scene) {
    gfx.clear();
    g.drawDashedCircle(gfx, gfx._cx, gfx._cy, 56, 0xf59e0b);
  }
  var spotImg = g.spots[r.spot];
  if (spotImg) {
    g.tweens.add({ targets: spotImg, alpha: 0.5, duration: 250, yoyo: true, repeat: 3,
      onComplete: function () { spotImg.setAlpha(1); } });
  }
  g.setDialogue('princess', '彩虹公主', [{ t: '不是这里哦，再试一次！', key: false }]);
  g.setStatus('不是这里哦，再试一次');
  await g.speakTTS('Try again! Where is the ' + CHARS[r.animal].en + '?', 0.7);
  if (gfx && gfx.scene) {
    gfx.clear();
    g.drawDashedCircle(gfx, gfx._cx, gfx._cy, 56, 0xffffff);
  }
};

/* “?” 提示：真的做事——金色大圈脉冲标出正确位置 + 镜头移过去 + 再读一遍词和整句 */
GameScene.prototype.doHint = async function () {
  var g = this;
  if (!g.curRound || g.phase !== 'answering') return;
  var r = g.curRound;
  var spot = SPOTS[r.spot];
  var cx, cy;
  if (r.type === 'place') {
    var right = null;
    g.circles.forEach(function (c) { if (c.wid === r.word) right = c; });
    if (right) { cx = right.x; cy = right.y; }
    else { cx = px(spot.x); cy = py(spot.y); }
  } else {
    cx = px(spot.x); cy = py(spot.y);
    if (g.ui) g.ui.pulseCorrectChoice(r.word);
  }
  if (g.hintRing) g.hintRing.destroy();
  var ring = g.add.graphics().setDepth(8000);
  g.hintRing = ring;
  var cam = g.cameras.main;
  cam.stopFollow();
  cam.pan(cx, cy, 600, 'Sine.easeInOut');
  var pulse = { t: 0 };
  g.tweens.add({ targets: pulse, t: 1, duration: 1600, onUpdate: function () {
    ring.clear();
    var rad = 60 + pulse.t * 40;
    ring.lineStyle(8, 0xffb703, 1 - pulse.t * 0.7);
    ring.strokeCircle(cx, cy, rad);
    ring.lineStyle(4, 0xffffff, 0.9);
    ring.strokeCircle(cx, cy, rad - 12);
  }, onComplete: function () { ring.destroy(); if (g.hintRing === ring) g.hintRing = null; } });
  g.princessPoint();
  await g.playQuestionAudio(r);
  /* 找位置题：镜头留在动物处；放位置题：重新跟随公主（她就在圈圈旁） */
  if (g.phase === 'answering' && g.curRound && g.curRound.type === 'place') {
    cam.startFollow(g.chars.princess.container, false, 0.08, 0.08);
  }
};

/* 答对：彩带粒子 + 小动物跳 + 表扬 + 整句（主语正确） */
GameScene.prototype.celebrateAndSay = async function (r, myToken) {
  var g = this;
  g.phase = 'celebrating';
  if (g.ui) g.ui.hideChoices();
  var ch = CHARS[r.animal];
  var spot = SPOTS[r.spot];
  var el = g.chars[r.animal];
  if (el) {
    g.tweens.add({ targets: el.img, y: -26, duration: 220, yoyo: true, repeat: 3,
      onComplete: function () { el.img.y = 0; } });
  }
  g.princessWave();
  g.confetti(px(spot.x), py(spot.y) - 60);
  g.flyStar();
  await g.playClip('praise');
  if (myToken !== g.seqToken) return;
  await g.sayLine('princess', g.sentenceSegments(r.word, r.animal, r.spot).map(function (s) {
    return s.key ? "<span class='key'>" + s.t + '</span>' : s.t;
  }).join(''), { clip: (r.animal === 'horse' && g.hasClip(sentenceKey(r.word, r.spot))) ? sentenceKey(r.word, r.spot) : null,
      tts: (r.animal === 'horse' && g.hasClip(sentenceKey(r.word, r.spot))) ? null : sentenceText(r.word, r.animal, r.spot) });
  if (myToken !== g.seqToken) return;
  g.stars++;
  if (g.ui) g.ui.renderStars();
  g.setStatus('说得真棒！★');
  await sleep(600);
  g.phase = 'idle';
  g.roundIdx++;
  if (myToken !== g.seqToken) return;
  if (g.roundIdx < g.rounds.length) {
    if (g.ui) g.ui.renderWordChip();
    await g.homeAnimal(r.animal);
    g.startWander(r.animal);
    await sleep(400);
    g.startRound();
  } else {
    g.showFinish();
  }
};
GameScene.prototype.confetti = function (x, y) {
  var colors = [0xf59e0b, 0xec4899, 0x22c55e, 0x3b82f6, 0x8b5cf6, 0xef4444];
  for (var i = 0; i < 36; i++) {
    var p = this.add.rectangle(x, y, 10, 14, colors[i % colors.length]).setDepth(9000);
    var ang = Math.random() * Math.PI * 2, dist = 60 + Math.random() * 160;
    this.tweens.add({ targets: p, x: x + Math.cos(ang) * dist, y: y + Math.sin(ang) * dist + 120,
      angle: Math.random() * 540 - 270, alpha: 0, duration: 900 + Math.random() * 500,
      ease: 'Cubic.easeOut', onComplete: function (tw, targets) { targets[0].destroy(); } });
  }
};
GameScene.prototype.flyStar = function () {
  var star = this.add.text(GAME_W / 2, TOP_H + WORLD_VIEW_H / 2, '★',
    { fontSize: '44px', color: '#f59e0b' }).setOrigin(0.5).setDepth(9900).setScrollFactor(0);
  this.tweens.add({ targets: star, x: 40, y: 32, scale: 0.6, duration: 800, ease: 'Cubic.easeIn',
    onComplete: function () { star.destroy(); } });
};

GameScene.prototype.showFinish = function () {
  this.phase = 'idle';
  this.seqToken++;
  this.stopAllWander();
  this.playClip('finish');
  if (this.ui) this.ui.showFinish(this.stars, this.rounds.length, this.selWords);
};

/* ============================================================================
 * UIScene：顶栏、对话区、控制行、选择卡、遮罩（解锁/家长设置/介绍/完成）
 * ========================================================================== */
function UIScene() { Phaser.Scene.call(this, { key: 'UI' }); }
UIScene.prototype = Object.create(Phaser.Scene.prototype);
UIScene.prototype.constructor = UIScene;

UIScene.prototype.create = function () {
  this.game = this.scene.get('Game');
  this.overlayVisible = true;   /* 开局是解锁遮罩，挡住世界点按 */
  this.choiceResolve = null;
  this.choiceCards = [];
  this.dlgTexts = [];
  this.backHold = null;
  this.buildTopbar();
  this.buildDialogue();
  this.buildControls();
  this.buildChoices();
  this.buildMinimap();
  this.buildOverlays();
  window.__v17.ui = this;
  this.showOverlay('unlock');
};

/* ---------- 通用小按钮 ---------- */
UIScene.prototype.makeButton = function (x, y, w, h, label, bg, onClick, fontSize) {
  var c = this.add.container(x, y);
  var gfx = this.add.graphics();
  gfx.fillStyle(bg, 1).fillRoundedRect(-w / 2, -h / 2, w, h, Math.min(16, h / 2));
  gfx.lineStyle(3, 0xffd166, 1).strokeRoundedRect(-w / 2, -h / 2, w, h, Math.min(16, h / 2));
  var t = this.add.text(0, 0, label, { fontSize: (fontSize || 22) + 'px', color: '#3a2e2a', fontStyle: 'bold' }).setOrigin(0.5);
  var zone = this.add.zone(0, 0, w, h).setInteractive({ useHandCursor: true });
  c.add([gfx, t, zone]);
  zone.on('pointerdown', function () {
    c.setScale(0.94);
    this.time.delayedCall(120, function () { c.setScale(1); });
    onClick();
  }.bind(this));
  c._gfx = gfx; c._label = t;
  return c;
};

/* ---------- 顶栏 ---------- */
UIScene.prototype.buildTopbar = function () {
  this.add.rectangle(0, 0, GAME_W, TOP_H, 0xfff8ec).setOrigin(0, 0);
  this.add.rectangle(0, TOP_H - 2, GAME_W, 2, 0xffe1a8).setOrigin(0, 0);
  this.starTexts = [];
  for (var i = 0; i < 8; i++) {
    var s = this.add.text(12 + i * 20, 32, '★', { fontSize: '20px', color: '#e5e7eb' }).setOrigin(0, 0.5);
    this.starTexts.push(s);
  }
  this.starCounter = this.add.text(12, 32, '', { fontSize: '18px', color: '#f59e0b', fontStyle: 'bold' }).setOrigin(0, 0.5).setVisible(false);
  var chipBg = this.add.graphics();
  chipBg.fillStyle(0xf3e8ff, 1).fillRoundedRect(118, 12, 210, 40, 20);
  this.wordChip = this.add.text(223, 32, 'behind · 后面', { fontSize: '20px', color: '#8b5cf6', fontStyle: 'bold' }).setOrigin(0.5);
  this.sunBtn = this.makeButton(392, 32, 44, 44, '☀', 0xffffff, function () { this.game.cycleMode(); }.bind(this), 22);
  this.backBtn = this.makeButton(444, 32, 44, 44, '↩', 0xffffff, function () {}, 22);
  this.backFill = this.add.graphics();
  var backZone = this.add.zone(444, 32, 44, 44).setInteractive({ useHandCursor: true });
  var ui = this;
  backZone.on('pointerdown', function () {
    var start = Date.now();
    ui.backHold = { start: start };
  });
  backZone.on('pointerup', function () { ui.cancelBackHold(); });
  backZone.on('pointerout', function () { ui.cancelBackHold(); });
};
UIScene.prototype.cancelBackHold = function () {
  this.backHold = null;
  this.backFill.clear();
};
UIScene.prototype.update = function () {
  if (this.backHold) {
    var p = (Date.now() - this.backHold.start) / 3000;
    this.backFill.clear().fillStyle(0xffb400, 0.45).fillRect(422, 54 - 0, 44 * Math.min(1, p), 6);
    if (p >= 1) {
      this.cancelBackHold();
      this.backToSetup();
    }
  }
};
UIScene.prototype.backToSetup = function () {
  var g = this.game;
  g.seqToken++;
  g.stopAllWander();
  g.phase = 'idle';
  this.hideChoices();   /* 中途返回也要收起选择卡、恢复小地图 */
  this.buildSetupGrid();
  this.showOverlay('setup');
};
UIScene.prototype.renderStars = function () {
  var g = this.game;
  var total = g.rounds.length || 4;
  if (total <= 8) {
    this.starCounter.setVisible(false);
    for (var i = 0; i < 8; i++) {
      if (i < total) {
        this.starTexts[i].setVisible(true);
        this.starTexts[i].setColor(i < g.stars ? '#f59e0b' : '#e5e7eb');
      } else this.starTexts[i].setVisible(false);
    }
  } else {
    for (var j = 0; j < 8; j++) this.starTexts[j].setVisible(false);
    this.starCounter.setText('★ ' + g.stars + '/' + total).setVisible(true);
  }
};
UIScene.prototype.renderWordChip = function () {
  var g = this.game;
  /* 局中（dialogue/answering/celebrating）显示当前回合的词和星星；
     局外（idle：介绍页/设置页）显示新选的第一个词、星星归零 ——
     否则上一局的 curRound/stars 会残留在介绍页上（bug 修复 5）。 */
  var inGame = g.phase !== 'idle' && !!g.curRound;
  var wid = (inGame ? g.curRound.word : (g.selWords && g.selWords[0])) || 'behind';
  var w = WORDS[wid];
  this.wordChip.setText(w.en + ' · ' + w.zh);
  this.wordChip.setColor(w.color);
  if (this.introWordText) {
    this.introWordText.setText(w.en + ' · ' + w.zh);
    this.introWordText.setColor(w.color);
    var stars = inGame ? g.stars : 0;
    var total = g.rounds.length || 4;
    this.introStarsText.setText('★'.repeat(Math.max(0, stars)) + '☆'.repeat(Math.max(0, total - stars)));
  }
};
UIScene.prototype.setSunIcon = function (mode) {
  if (this.sunBtn) this.sunBtn._label.setText(mode === 'day' ? '☀' : (mode === 'sunset' ? '◑' : '☾'));
};

/* ---------- 对话区 ---------- */
UIScene.prototype.buildDialogue = function () {
  this.add.rectangle(0, UI_TOP, GAME_W, 118, 0xfffdf6).setOrigin(0, 0);
  this.add.rectangle(0, UI_TOP, GAME_W, 2, 0xffe1a8).setOrigin(0, 0);
  var circle = this.add.circle(48, UI_TOP + 42, 32, 0xffe4f1);
  this.avatarImg = this.add.image(48, UI_TOP + 42, 'princess');
  var tex = this.textures.get('princess').getSourceImage();
  this.avatarImg.setScale(Math.min(56 / tex.width, 56 / tex.height));
  var maskShape = this.add.circle(48, UI_TOP + 42, 32, 0xffffff).setVisible(false);
  this.avatarImg.setMask(new Phaser.Display.Masks.GeometryMask(this, maskShape));
  this.dlgName = this.add.text(92, UI_TOP + 8, '彩虹公主', { fontSize: '13px', color: '#b45309', fontStyle: 'bold' });
  this.dlgHint = this.add.text(92, UI_TOP + 92, '', { fontSize: '12px', color: '#a16207' });
};
UIScene.prototype.setDialogue = function (speakerId, name, segments) {
  var key = speakerId === 'princess' ? 'princess' : CHARS[speakerId].img;
  this.avatarImg.setTexture(key);
  var tex = this.textures.get(key).getSourceImage();
  this.avatarImg.setScale(Math.min(56 / tex.width, 56 / tex.height));
  this.dlgName.setText(name);
  this.layoutSegments(segments);
};
UIScene.prototype.layoutSegments = function (segments) {
  var ui = this;
  this.dlgTexts.forEach(function (t) { t.destroy(); });
  this.dlgTexts = [];
  var x = 92, y = UI_TOP + 30, maxX = GAME_W - 12;
  segments.forEach(function (seg) {
    var words = seg.t.split(/(\s+)/);
    words.forEach(function (wd) {
      if (wd === '') return;
      var probe = ui.add.text(0, 0, wd, { fontSize: '20px', fontStyle: 'bold' }).setVisible(false);
      var wdt = probe.width;
      probe.destroy();
      if (x + wdt > maxX && x > 92) { x = 92; y += 26; }
      var t = ui.add.text(x, y, wd, { fontSize: '20px', color: seg.key ? '#7c3aed' : '#3a2e2a', fontStyle: 'bold' });
      ui.dlgTexts.push(t);
      x += wdt;
    });
  });
};
UIScene.prototype.setStatus = function (t) { if (this.statusText) this.statusText.setText(t); };

/* ---------- 控制行 ---------- */
UIScene.prototype.buildControls = function () {
  this.add.rectangle(0, 788, GAME_W, 72, 0xfffdf6).setOrigin(0, 0);
  this.add.rectangle(0, 788, GAME_W, 1, 0xffe9c4).setOrigin(0, 0);
  this.makeButton(46, 824, 52, 52, '♪', 0xfff7e0, function () {
    var g = this.game;
    if (g.curRound && !g.dialogueBusy) g.playQuestionAudio(g.curRound);
  }.bind(this), 26);
  this.makeButton(110, 824, 52, 52, '?', 0xfff7e0, function () {
    this.game.doHint();
  }.bind(this), 26);
  this.statusText = this.add.text(146, 824, '先逛逛小岛吧', { fontSize: '15px', color: '#92400e', fontStyle: 'bold' }).setOrigin(0, 0.5);
};

/* ---------- 找一找选择卡 ---------- */
UIScene.prototype.buildChoices = function () {
  this.choicesLayer = this.add.container(0, 0).setVisible(false);
};
UIScene.prototype.askFindChoice = function (r) {
  var ui = this;
  return new Promise(function (resolve) {
    ui.choiceResolve = resolve;
    ui.choiceCards = [];
    ui.choicesLayer.removeAll(true);
    var others = WORD_ORDER.filter(function (id) { return id !== r.word; });
    var opts = shuffle([r.word].concat(shuffle(others).slice(0, 2)));
    opts.forEach(function (wid, i) {
      var cx = 80 + i * 160, cy = 600;
      var card = ui.add.container(cx, cy);
      var gfx = ui.add.graphics();
      gfx.fillStyle(0xffffff, 1).fillRoundedRect(-75, -60, 150, 120, 16);
      gfx.lineStyle(3, 0xe5d9f7, 1).strokeRoundedRect(-75, -60, 150, 120, 16);
      var grass = ui.add.rectangle(0, 0, 138, 108, 0x8fce6e).setOrigin(0.5);
      var spot = SPOTS[r.spot], ch = CHARS[r.animal];
      var off = miniOffset(wid);
      var objTex = ui.textures.get(spot.img).getSourceImage();
      var obj = ui.add.image(0, 8, spot.img).setOrigin(0.5, 1);
      obj.setScale(Math.min(70 / objTex.width, 56 / objTex.height));
      var anTex = ui.textures.get(ch.img).getSourceImage();
      var an = ui.add.image(off.dx * 1.35, 8 + off.dy * 1.08, ch.img).setOrigin(0.5, 1);
      an.setScale(Math.min(60 / anTex.width, 52 / anTex.height));
      if (off.cls === 'behind') an.setCrop(0, 0, anTex.width, Math.floor(anTex.height * 0.55));
      if (off.cls === 'inbox') an.setCrop(0, 0, anTex.width, Math.floor(anTex.height * 0.54));
      var zone = ui.add.zone(0, 0, 150, 120).setInteractive({ useHandCursor: true });
      card.add([gfx, grass, obj, an, zone]);
      card._gfx = gfx; card._wid = wid; card._an = an;
      zone.on('pointerdown', function () { ui.onChoiceTap(r, card); });
      ui.choicesLayer.add(card);
      ui.choiceCards.push(card);
    });
    ui.choicesLayer.setVisible(true);
    if (ui.mmBg) ui.mmBg.setVisible(false);
    if (ui.mmGfx) ui.mmGfx.setVisible(false);
  });
};
UIScene.prototype.onChoiceTap = function (r, card) {
  var ui = this;
  if (this.game.phase !== 'answering') return;
  if (card._wid === r.word) {
    card._gfx.clear();
    card._gfx.fillStyle(0xf0fdf4, 1).fillRoundedRect(-75, -60, 150, 120, 16);
    card._gfx.lineStyle(4, 0x22c55e, 1).strokeRoundedRect(-75, -60, 150, 120, 16);
    ui.hideChoices();
    if (ui.choiceResolve) { var res = ui.choiceResolve; ui.choiceResolve = null; res(true); }
  } else {
    card._gfx.clear();
    card._gfx.fillStyle(0xfffbeb, 1).fillRoundedRect(-75, -60, 150, 120, 16);
    card._gfx.lineStyle(4, 0xf59e0b, 1).strokeRoundedRect(-75, -60, 150, 120, 16);
    this.game.wrongPick(r, null);
    this.time.delayedCall(900, function () {
      if (!card.scene) return;
      card._gfx.clear();
      card._gfx.fillStyle(0xffffff, 1).fillRoundedRect(-75, -60, 150, 120, 16);
      card._gfx.lineStyle(3, 0xe5d9f7, 1).strokeRoundedRect(-75, -60, 150, 120, 16);
    });
  }
};
UIScene.prototype.pulseCorrectChoice = function (wordId) {
  this.choiceCards.forEach(function (card) {
    if (card._wid === wordId) {
      card.scene.tweens.add({ targets: card, scale: 1.08, duration: 250, yoyo: true, repeat: 3 });
      card._gfx.clear();
      card._gfx.fillStyle(0xfffbeb, 1).fillRoundedRect(-75, -60, 150, 120, 16);
      card._gfx.lineStyle(4, 0xffb703, 1).strokeRoundedRect(-75, -60, 150, 120, 16);
    }
  });
};
UIScene.prototype.hideChoices = function () {
  this.choicesLayer.setVisible(false);
  this.choicesLayer.removeAll(true);
  this.choiceCards = [];
  if (this.mmBg) this.mmBg.setVisible(true);
  if (this.mmGfx) this.mmGfx.setVisible(true);
};

/* ---------- 小地图 ---------- */
UIScene.prototype.buildMinimap = function () {
  this.mmBg = this.add.graphics();
  this.mmBg.fillStyle(0xffffff, 1).fillRoundedRect(382, 600, 88, 60, 10);
  this.mmBg.lineStyle(2, 0xffd166, 1).strokeRoundedRect(382, 600, 88, 60, 10);
  this.mmGfx = this.add.graphics();
  this.updateMinimap();
};
UIScene.prototype.updateMinimap = function () {
  if (!this.mmGfx || !this.game) return;
  var gfx = this.mmGfx;
  gfx.clear();
  var ox = 384, oy = 602, sx = 84 / 100, sy = 56 / 100;
  ZONES.forEach(function (z) {
    gfx.fillStyle(Phaser.Display.Color.HexStringToColor(z.color).color, 0.55);
    gfx.fillRect(ox + z.x0 * sx, oy + z.y0 * sy, (z.x1 - z.x0) * sx, (z.y1 - z.y0) * sy);
  });
  var dotColors = { horse: 0xa16207, cat: 0xf97316, dog: 0x92400e, bear: 0x78350f, bird: 0x0ea5e9 };
  CHAR_IDS.forEach(function (id) {
    gfx.fillStyle(dotColors[id], 1);
    gfx.fillCircle(ox + POS[id].x * sx, oy + POS[id].y * sy, 4);
  });
  gfx.fillStyle(0xec4899, 1);
  gfx.fillCircle(ox + POS.princess.x * sx, oy + POS.princess.y * sy, 5);
};

/* ---------- 遮罩 ---------- */
UIScene.prototype.buildOverlays = function () {
  this.overlays = {};
  /* 解锁 */
  var un = this.add.container(0, 0);
  un.add(this.add.rectangle(0, 0, GAME_W, GAME_H, 0x1e140a, 0.55).setOrigin(0, 0));
  var pTex = this.textures.get('princess').getSourceImage();
  var pImg = this.add.image(GAME_W / 2, 300, 'princess');
  pImg.setScale(Math.min(200 / pTex.width, 240 / pTex.height));
  un.add(pImg);
  var unlockBtn = this.makeButton(GAME_W / 2, 520, 260, 64, '点我开声音 ♪', 0xf59e0b, function () {
    var g = this.game;
    g.audioUnlocked = true;
    try { if (g.sound.context && g.sound.context.resume) g.sound.context.resume(); } catch (e) {}
    g.playClip('silence');
    this.setDialogue('princess', '彩虹公主', [{ t: '你好呀！我是彩虹公主，欢迎来到彩虹小岛！', key: false }]);
    this.buildSetupGrid();
    this.showOverlay('setup');
  }.bind(this), 24);
  un.add(unlockBtn);
  un.add(this.add.text(GAME_W / 2, 590, '彩虹小岛 · Rainbow Island', { fontSize: '15px', color: '#ffffff' }).setOrigin(0.5));
  this.overlays.unlock = un;

  /* 家长设置 */
  var st = this.add.container(0, 0);
  st.add(this.add.rectangle(0, 0, GAME_W, GAME_H, 0x1e140a, 0.55).setOrigin(0, 0));
  var card = this.add.graphics();
  card.fillStyle(0xfffdf6, 1).fillRoundedRect(30, 150, 420, 480, 24);
  st.add(card);
  st.add(this.add.text(GAME_W / 2, 190, '家长设置', { fontSize: '26px', color: '#3a2e2a', fontStyle: 'bold' }).setOrigin(0.5));
  st.add(this.add.text(GAME_W / 2, 226, '今晚练哪个词？可以多选，按顺序来。\n孩子玩的时候不用认字，听和点就可以。',
    { fontSize: '15px', color: '#6b4f2a', align: 'center', lineSpacing: 6 }).setOrigin(0.5));
  this.setupGrid = this.add.container(0, 0);
  st.add(this.setupGrid);
  var startBtn = this.makeButton(GAME_W / 2, 580, 360, 56, '开始玩 ▶', 0xf97316, function () {
    this.showOverlay('intro');
    this.renderWordChip();   /* 换词后立即刷新介绍页的词和星星（bug 修复） */
  }.bind(this), 20);
  startBtn._label.setColor('#ffffff');
  st.add(startBtn);
  this.overlays.setup = st;

  /* 介绍 */
  var intro = this.add.container(0, 0);
  intro.add(this.add.rectangle(0, 0, GAME_W, GAME_H, 0x1e140a, 0.55).setOrigin(0, 0));
  var icard = this.add.graphics();
  icard.fillStyle(0xfffdf6, 1).fillRoundedRect(30, 130, 420, 540, 24);
  intro.add(icard);
  var bgImg = this.add.image(GAME_W / 2, 220, 'island-bg');
  bgImg.setCrop(0, 0, 1920, 480);
  bgImg.displayWidth = 380; bgImg.displayHeight = 130;
  intro.add(bgImg);
  this.introWordText = this.add.text(GAME_W / 2, 320, 'behind · 后面', { fontSize: '22px', color: '#8b5cf6', fontStyle: 'bold' }).setOrigin(0.5);
  this.introStarsText = this.add.text(GAME_W / 2, 350, '☆☆☆☆', { fontSize: '22px', color: '#f59e0b' }).setOrigin(0.5);
  intro.add(this.introWordText);
  intro.add(this.introStarsText);
  intro.add(this.add.text(GAME_W / 2, 368, '彩虹小岛', { fontSize: '26px', color: '#3a2e2a', fontStyle: 'bold' }).setOrigin(0.5));
  intro.add(this.add.text(GAME_W / 2, 472,
    '彩虹小岛很大，有森林、池塘、沙滩、\n花园和小山，小动物们住在岛上\n不同的地方。点一点小岛，公主就\n会走过去；点一点小动物，就能\n跟它说话！',
    { fontSize: '16px', color: '#6b4f2a', align: 'center', lineSpacing: 8 }).setOrigin(0.5));
  var goBtn = this.makeButton(GAME_W / 2, 600, 360, 56, '▶ 开始逛小岛', 0xf97316, function () {
    this.showOverlay(null);
    this.game.startGame();
  }.bind(this), 20);
  goBtn._label.setColor('#ffffff');
  intro.add(goBtn);
  this.overlays.intro = intro;

  /* 完成 */
  var fin = this.add.container(0, 0);
  fin.add(this.add.rectangle(0, 0, GAME_W, GAME_H, 0x1e140a, 0.55).setOrigin(0, 0));
  var fcard = this.add.graphics();
  fcard.fillStyle(0xfffdf6, 1).fillRoundedRect(30, 170, 420, 470, 24);
  fin.add(fcard);
  fin.add(this.add.text(GAME_W / 2, 215, '今天玩得真棒！', { fontSize: '26px', color: '#3a2e2a', fontStyle: 'bold' }).setOrigin(0.5));
  this.finishStars = this.add.text(GAME_W / 2, 260, '★★★★', { fontSize: '30px', color: '#f59e0b' }).setOrigin(0.5);
  fin.add(this.finishStars);
  this.finishSummary = this.add.text(GAME_W / 2, 305, '', { fontSize: '16px', color: '#6b4f2a', align: 'center' }).setOrigin(0.5);
  this.missionBox = this.add.text(GAME_W / 2, 350, '', { fontSize: '15px', color: '#6b4f2a', align: 'center', wordWrap: { width: 360, useAdvancedWrap: true }, lineSpacing: 6 }).setOrigin(0.5, 0);
  fin.add(this.finishSummary);
  fin.add(this.missionBox);
  var againBtn = this.makeButton(GAME_W / 2, 520, 360, 56, '再玩一次 ▶', 0xf97316, function () {
    var g = this.game;
    this.showOverlay(null);
    g.seqToken++;
    CHAR_IDS.forEach(function (id) {
      g.clearPlacement(id);
      POS[id].x = HOME_POS[id].x; POS[id].y = HOME_POS[id].y;
      g.applyPos(id);
    });
    POS.princess.x = 50; POS.princess.y = 66;
    g.applyPos('princess');
    g.cameras.main.centerOn(px(50), py(66));
    g.startGame();
  }.bind(this), 20);
  againBtn._label.setColor('#ffffff');
  fin.add(againBtn);
  var changeBtn = this.makeButton(GAME_W / 2, 590, 360, 48, '换个词', 0xffffff, function () {
    this.game.seqToken++;
    this.buildSetupGrid();
    this.showOverlay('setup');
  }.bind(this), 18);
  fin.add(changeBtn);
  this.overlays.finish = fin;
};
UIScene.prototype.buildSetupGrid = function () {
  var ui = this;
  this.setupGrid.removeAll(true);
  WORD_ORDER.forEach(function (wid, i) {
    var w = WORDS[wid];
    var col = i % 3, row = Math.floor(i / 3);
    var x = 90 + col * 150, y = 300 + row * 90;
    var c = ui.add.container(x, y);
    var gfx = ui.add.graphics();
    var sel = ui.game.selWords.indexOf(wid) >= 0;
    gfx.fillStyle(sel ? 0xfffbeb : 0xffffff, 1).fillRoundedRect(-60, -36, 120, 72, 14);
    gfx.lineStyle(3, sel ? 0xf59e0b : 0xe5d9f7, 1).strokeRoundedRect(-60, -36, 120, 72, 14);
    var en = ui.add.text(0, -12, w.en, { fontSize: '17px', color: '#ffffff', fontStyle: 'bold',
      backgroundColor: w.color, padding: { x: 8, y: 2 } }).setOrigin(0.5);
    var zh = ui.add.text(0, 16, w.zh, { fontSize: '14px', color: '#6b4f2a' }).setOrigin(0.5);
    var zone = ui.add.zone(0, 0, 120, 72).setInteractive({ useHandCursor: true });
    c.add([gfx, en, zh, zone]);
    zone.on('pointerdown', function () {
      var g = ui.game;
      var idx = g.selWords.indexOf(wid);
      if (idx >= 0) g.selWords.splice(idx, 1);
      else g.selWords.push(wid);
      if (g.selWords.length === 0) { g.selWords.push(wid); }
      ui.buildSetupGrid();
      ui.renderWordChip();   /* 选词即刷新顶栏词条 */
    });
    ui.setupGrid.add(c);
  });
};
UIScene.prototype.showOverlay = function (name) {
  Object.keys(this.overlays).forEach(function (k) { this.overlays[k].setVisible(k === name); }.bind(this));
  this.overlayVisible = !!name;
  if (name === 'intro') this.renderWordChip();
};
UIScene.prototype.showFinish = function (stars, total, selWords) {
  var words = selWords.map(function (id) { return WORDS[id].en; }).join('、');
  this.finishStars.setText('★'.repeat(Math.max(1, stars)) + '☆'.repeat(Math.max(0, total - stars)));
  this.finishSummary.setText('今天练了：' + words + ' · 得了 ' + stars + ' 颗星');
  this.missionBox.setText('★ 回家小任务：' + (MISSIONS[selWords[0]] || ''));
  this.showOverlay('finish');
};

/* ---------- 启动 ---------- */
new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  width: GAME_W,
  height: GAME_H,
  backgroundColor: '#bfe8ff',
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
  scene: [BootScene, GameScene, UIScene]
});
