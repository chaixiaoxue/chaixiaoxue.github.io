/* ============================================================================
 * 彩虹小岛 · Rainbow Island — v21
 * 场景化大改版（v20 的渲染不动）：不选题、不做题，英语长在场景里。
 * - 打开就是游戏：没有选词屏、没有顶栏词条；词由家长在隐藏设置里定（默认 behind）。
 * - 每词一个游戏，4 回合 = 4 个小冒险（固定回合表，每次打乱顺序）：
 *   behind 捉迷藏 / in 躲猫猫 / on 爬高高 / under 躲雨 / next to 比一比 / in front of 敲门。
 * - 全部预录音（Aria 童声、慢速，assets/audio/，73 条新录音）：
 *   游戏里彻底不用手机 TTS；一个音频总管、跟读式逐词亮、点下去立刻响、星星跟表扬同时到。
 * - 丝滑简单：镜头滑、人物走、一次只亮一样、公主先示范、5 秒没动静温柔提示、无失败。
 * - 多端：去掉 560px 上限，镜头按宽高比自适应，手指鼠标都能玩。
 * - 纯静态：index.html + game.js + three.module.js + assets/audio/，无构建步骤。
 * - 3D 角色全部由 Three.js 几何体拼成（低多边形，v17 配色），腿会真的迈步、
 *   身体会起伏、会转向；公主/动物在岛上走，镜头第三人称跟随。
 * ========================================================================== */
'use strict';

/* ---------------- 数据表（与 v17 相同的内容） ---------------- */
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
  'horse': { id: 'horse', en: 'horse', zh: '小马', zone: '森林' },
  'cat':   { id: 'cat',   en: 'cat',   zh: '小猫', zone: '花园' },
  'dog':   { id: 'dog',   en: 'dog',   zh: '小狗', zone: '沙滩' },
  'bear':  { id: 'bear',  en: 'bear',  zh: '小熊', zone: '小山' },
  'bird':  { id: 'bird',  en: 'bird',  zh: '小鸟', zone: '池塘' }
};
var CHAR_IDS = ['horse', 'cat', 'dog', 'bear', 'bird'];
/* v21：动物打招呼不再用 TTS，全部是预录 greet-<animal>.mp3（Aria 童声） */
/* v17 的 % 坐标 → 3D 世界坐标（岛约 116×116，北 = -z） */
function px(pct) { return (pct - 50) / 50 * 58; }
function pz(pct) { return (pct - 50) / 50 * 58; }
var SPOTS = {
  'tree':   { id: 'tree',   en: 'tree',   zh: '大树', x: 24, y: 22, zone: '森林' },
  'house':  { id: 'house',  en: 'house',  zh: '房子', x: 12, y: 52, zone: '小屋' },
  'box':    { id: 'box',    en: 'box',    zh: '盒子', x: 22, y: 60, zone: '小屋' },
  'basket': { id: 'basket', en: 'basket', zh: '篮子', x: 80, y: 88, zone: '沙滩' },
  'bridge': { id: 'bridge', en: 'bridge', zh: '小桥', x: 50, y: 52, zone: '池塘' },
  'table':  { id: 'table',  en: 'table',  zh: '桌子', x: 10, y: 64, zone: '小屋' },
  'flower': { id: 'flower', en: 'flower', zh: '花',   x: 82, y: 44, zone: '花园' },
  'rock':   { id: 'rock',   en: 'rock',   zh: '石头', x: 58, y: 90, zone: '沙滩' },
  /* v21 新增：沙滩伞（躲雨用）、花园灌木丛（捉迷藏用） */
  'umbrella': { id: 'umbrella', en: 'umbrella', zh: '雨伞', x: 74, y: 90, zone: '沙滩' },
  'bush':   { id: 'bush',   en: 'bush',   zh: '灌木丛', x: 62, y: 30, zone: '花园' }
};
/* v21：固定回合表——每词 4 个小冒险（动物 / 地点 / 玩法都定死，顺序每次打乱）。
   find = 动物自己藏好，孩子点一点找出来；place = 公主请孩子帮忙，把动物送到地方去。 */
var ROUND_PLANS = {
  'behind': [
    { animal: 'cat',   spot: 'tree',  type: 'find'  },
    { animal: 'dog',   spot: 'house', type: 'place' },
    { animal: 'bear',  spot: 'rock',  type: 'find'  },
    { animal: 'horse', spot: 'bush',  type: 'place' }
  ],
  'in': [
    { animal: 'bear', spot: 'basket', type: 'find'  },
    { animal: 'cat',  spot: 'box',    type: 'place' },
    { animal: 'dog',  spot: 'house',  type: 'find'  },
    { animal: 'bird', spot: 'box',    type: 'place' }
  ],
  'on': [
    { animal: 'dog',   spot: 'rock',   type: 'find'  },
    { animal: 'cat',   spot: 'bridge', type: 'place' },
    { animal: 'horse', spot: 'box',    type: 'find'  },
    { animal: 'bird',  spot: 'table',  type: 'place' }
  ],
  'under': [
    { animal: 'bird',  spot: 'umbrella', type: 'find'  },
    { animal: 'cat',   spot: 'tree',     type: 'place' },
    { animal: 'dog',   spot: 'bridge',   type: 'find'  },
    { animal: 'horse', spot: 'umbrella', type: 'place' }
  ],
  'nextto': [
    { animal: 'horse', spot: 'flower', type: 'find'  },
    { animal: 'cat',   spot: 'house',  type: 'place' },
    { animal: 'dog',   spot: 'tree',   type: 'find'  },
    { animal: 'bird',  spot: 'flower', type: 'place' }
  ],
  'front': [
    { animal: 'dog',   spot: 'house', type: 'find'  },
    { animal: 'cat',   spot: 'tree',  type: 'place' },
    { animal: 'horse', spot: 'house', type: 'find'  },
    { animal: 'bird',  spot: 'tree',  type: 'place' }
  ]
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
var HOME_POS = JSON.parse(JSON.stringify(POS));
var WANDER_ZONES = {
  horse: { x0: 6,  x1: 32, y0: 15, y1: 31 },
  cat:   { x0: 70, x1: 94, y0: 38, y1: 62 },
  dog:   { x0: 55, x1: 88, y0: 79, y1: 94 },
  bear:  { x0: 40, x1: 60, y0: 10, y1: 12.5 },
  bird:  { x0: 40, x1: 60, y0: 40, y1: 56 }
};
function sentenceText(wordId, animalId, spotId) {
  return 'The ' + CHARS[animalId].en + ' is ' + WORDS[wordId].en + ' the ' + SPOTS[spotId].en + '.';
}
/* ---------------- 预录音键名与台词（assets/audio/，Aria 童声，73 条） ----------------
   发现句是找到小动物那一刻的欢呼，不是考题答案：“There you are! The cat is behind the tree!” */
function discKey(r) { return 'disc-' + r.animal + '-' + r.word + '-' + r.spot; }
function discText(r) {
  return 'There you are! The ' + CHARS[r.animal].en + ' is ' + WORDS[r.word].en + ' the ' + SPOTS[r.spot].en + '!';
}
var ANIMAL_SOUND = { horse: 'Neigh!', cat: 'Meow!', dog: 'Woof!', bear: 'Hello!', bird: 'Tweet!' };
function greetText(a) { return 'Hi, little ' + CHARS[a].en + '!'; }
function whereText(a) { return 'Where is the ' + CHARS[a].en + '?'; }
function hideText(a) { return ANIMAL_SOUND[a] + ' I hide, you find me!'; }
function hideinText(spot) { return 'I hide in the ' + SPOTS[spot].en + '! Find me!'; }
function onmeText(spot) { return 'Look at me! I am on the ' + SPOTS[spot].en + '!'; }
function quickText(a, spot) { return 'Quick, little ' + CHARS[a].en + '! Hide under the ' + SPOTS[spot].en + '!'; }
function frontmeText(a, spot) {
  return ANIMAL_SOUND[a] + " It's me! I am in front of the " + SPOTS[spot].en + '!';
}
var CLIP_TEXTS = {
  'intro': "Hi! I'm Rainbow Princess! Let's play!",
  'count': 'One, two, three!',
  'helpme': 'Can you help me?',
  'tryagain': 'Try again!',
  'yay': 'Yay!',
  'peekaboo': 'Peekaboo!',
  'praise': 'Great job!',
  'finish': 'Great job! You did it.',
  'invite-behind': "Let's play hide-and-seek!",
  'invite-in': "Let's play peekaboo!",
  'invite-on': "Let's climb up high!",
  'invite-under': "Oh no! It's raining!",
  'invite-nextto': "Let's see who is taller!",
  'invite-front': 'Knock, knock! Who is there?',
  'standnext': 'Stand next to me!'
};
/* 动物藏好 / 爬好 / 躲好后那句“行动台词”的键名 */
function actionKey(r) {
  if (r.word === 'behind') return 'hide-' + r.animal;
  if (r.word === 'in') return 'hidein-' + r.spot;
  if (r.word === 'on') return 'onme-' + r.spot;
  if (r.word === 'under') return (r.type === 'place') ? 'quick-' + r.animal + '-' + r.spot : 'hide-' + r.animal;
  if (r.word === 'nextto') return 'standnext';
  if (r.word === 'front') return 'frontme-' + r.animal + '-' + r.spot;
  return 'hide-' + r.animal;
}
function actionText(r) {
  if (r.word === 'behind') return hideText(r.animal);
  if (r.word === 'in') return hideinText(r.spot);
  if (r.word === 'on') return onmeText(r.spot);
  if (r.word === 'under') return (r.type === 'place') ? quickText(r.animal, r.spot) : hideText(r.animal);
  if (r.word === 'nextto') return 'Stand next to me!';
  if (r.word === 'front') return frontmeText(r.animal, r.spot);
  return hideText(r.animal);
}
/* 任一录音键对应的台词文字（跟读逐词亮用）；r 是当前回合 */
function clipText(key, r) {
  if (CLIP_TEXTS[key]) return CLIP_TEXTS[key];
  if (key.indexOf('disc-') === 0 && r) return discText(r);
  if (key.indexOf('greet-') === 0) return greetText(key.slice(6));
  if (key.indexOf('where-') === 0) return whereText(key.slice(6));
  if (key.indexOf('hide-') === 0) return hideText(key.slice(5));
  if (key.indexOf('hidein-') === 0) return hideinText(key.slice(7));
  if (key.indexOf('onme-') === 0) return onmeText(key.slice(5));
  if (key.indexOf('quick-') === 0 && r) return quickText(r.animal, r.spot);
  if (key.indexOf('frontme-') === 0 && r) return frontmeText(r.animal, r.spot);
  if (key.indexOf('word-') === 0) {
    var wid = key.slice(5).replace('_', '');
    return (WORDS[wid] ? WORDS[wid].en : key) + '!';
  }
  return '';
}
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
/* 3D 位置偏移：相对镜头（镜头在南边 +z 往北看），behind = 更北（-z），front = 更南（+z） */
function wordOffset3D(wordId) {
  switch (wordId) {
    case 'in':     return { dx: 0,    dz: 0,    dy: -0.3,  cls: 'inbox' };
    case 'on':     return { dx: 0,    dz: 0,    dy: 0,     cls: 'on' };
    case 'under':  return { dx: 0,    dz: 1.4,  dy: 0,     cls: '' };
    case 'nextto': return { dx: 2.8,  dz: 0.4,  dy: 0,     cls: '' };
    case 'behind': return { dx: 1.2,  dz: -1.6, dy: 0,     cls: 'behind' };
    case 'front':  return { dx: 0,    dz: 2.4,  dy: 0,     cls: '' };
    default:       return { dx: 0,    dz: 0,    dy: 0,     cls: '' };
  }
}
/* ---------------- Three.js 加载（本地优先，失败回退 CDN） ---------------- */
var THREE = null;
async function loadThree() {
  try {
    THREE = await import('./three.module.js');
  } catch (e) {
    console.warn('[three] local load failed, trying CDN', e);
    THREE = await import('https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.min.js');
  }
  return THREE;
}

/* ---------------- 地形高度（网格与角色共用） ---------------- */
var PATH_RECTS = [
  { cx: -26.7, cz: 5.8,  w: 15, h: 30, a: 0.14 },
  { cx: 12.8,  cz: 5.8,  w: 14, h: 30, a: -0.10 },
  { cx: -0.7,  cz: 16.2, w: 30, h: 13, a: 0 },
  { cx: -19.3, cz: -19.7, w: 13, h: 30, a: 0.61 },
  { cx: -0.7,  cz: 25.5, w: 30, h: 8,  a: 0 }
];
function distToPath(x, z) {
  var best = 1e9;
  for (var i = 0; i < PATH_RECTS.length; i++) {
    var p = PATH_RECTS[i];
    var dx = x - p.cx, dz = z - p.cz;
    var c = Math.cos(-p.a), s = Math.sin(-p.a);
    var lx = dx * c - dz * s, lz = dx * s + dz * c;
    var qx = clamp(lx, -p.w / 2, p.w / 2), qz = clamp(lz, -p.h / 2, p.h / 2);
    var d = Math.hypot(lx - qx, lz - qz);
    if (d < best) best = d;
  }
  return best;
}
function terrainH(x, z) {
  var r = Math.hypot(x, z);
  var h = 0.35 * Math.sin(x * 0.11) * Math.cos(z * 0.09)
        + 0.22 * Math.sin(x * 0.23 + z * 0.17)
        + 0.15 * Math.cos(z * 0.19 - x * 0.07);
  var dm = Math.hypot(x, z + 48);                       /* 北边大雪山 */
  var m = Math.max(0, 1 - dm / 26);
  h += 17 * Math.pow(m, 1.6);
  var dp = Math.hypot(x, z);                            /* 中央池塘洼地 */
  h -= 1.1 * Math.max(0, 1 - dp / 12);
  if (r > 50) h -= (r - 50) / 12 * 2.4;                 /* 沙滩向海里沉 */
  if (r > 62) h = Math.min(h, -1.4);
  return h;
}

/* ---------------- 全局状态 ---------------- */
var G = {
  renderer: null, scene: null, camera: null, clock: null,
  chars: {}, spots: {}, spotMeshes: {},
  selWord: 'behind', rounds: [], roundIdx: 0, stars: 0, wrongCount: 0,
  curRound: null, seqToken: 0, phase: 'idle', dialogueBusy: false,
  wanderOn: true, wanderTimers: {}, movers: {}, speedMul: 1,
  lastSpoken: [], audioLog: [], audioUnlocked: false, audioQueue: [], audioBusy: false,
  audioCtx: null, audioEls: {}, karaTimers: [], lastClipKey: null, lastClipText: null,
  targetGlow: null, targetSpot: null, idleTimer: null, idleHints: 0,
  rain: null, petals: [], flyby: null, flybyTimer: 0,
  modeIdx: 0, MODES: ['day', 'sunset', 'night'],
  camFocus: null, camOffset: null, camTarget: null,
  circles: [], hintRing: null, confettiBits: [], clouds: [], stars3d: [],
  thumbRenderer: null, thumbCache: {}, raycaster: null, pointer: null,
  dragState: null, nightTint: null, sea: null, seaRings: [],
  miniTimer: null, butterflies: [], glints: [], pollen: null, pollenBase: null,
  skyDome: null, sunSprite: null, cloudMats: []
};
G.camFocus = { x: 0, y: 1, z: 8 };
/* v20：镜头更低更近，第三人称跟在公主身后——人在岛里头，不是俯视沙盘。
   俯角约 11°（原来约 28°）：地平线进到画面上部，天空占画面上部约三成，
   海水和沙滩铺在前景；公主和目标仍在画面中央。
   距离 13 是竖屏视野的底线（再近，目标会出画）。
   v21：镜头改成滑过去（glideCameraTo + updateCamera 缓动），不瞬移。 */
G.camOffset = { x: 0, y: 4.0, z: 13 };
G.camTarget = { x: 0, y: 1, z: 8 };
G.camMode = 'follow'; G.followId = 'princess';

function $(id) { return document.getElementById(id); }
function setLoad(p, msg) {
  var bar = $('loadbar'); if (bar) bar.style.width = Math.round(p * 100) + '%';
  var m = $('loadmsg'); if (m) m.textContent = msg || '';
}

/* ---------------- 材质/几何小工具 ---------------- */
function mat(color, opts) {
  // MeshLambertMaterial ignores roughness/metalness (passing them only logs warnings).
  var o = Object.assign({ color: color }, opts || {});
  delete o.roughness; delete o.metalness;
  return new THREE.MeshLambertMaterial(o);
}
function box(w, h, d, color, x, y, z) {
  var m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat(color));
  m.position.set(x || 0, y || 0, z || 0);
  m.castShadow = false;
  return m;
}
function sph(r, color, x, y, z, sx, sy, sz) {
  var m = new THREE.Mesh(new THREE.SphereGeometry(r, 20, 14), mat(color));
  m.position.set(x || 0, y || 0, z || 0);
  m.scale.set(sx || 1, sy || 1, sz || 1);
  return m;
}
function cyl(rt, rb, h, color, x, y, z, seg) {
  var m = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg || 14), mat(color));
  m.position.set(x || 0, y || 0, z || 0);
  return m;
}
function cone(r, h, color, x, y, z, seg) {
  var m = new THREE.Mesh(new THREE.ConeGeometry(r, h, seg || 14), mat(color));
  m.position.set(x || 0, y || 0, z || 0);
  return m;
}
function blobShadow(r) {
  var m = new THREE.Mesh(new THREE.CircleGeometry(r, 20),
    new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.10, depthWrite: false }));
  m.rotation.x = -Math.PI / 2;
  m.position.y = 0.03;
  return m;
}
/* v20：程序化 canvas 纹理——不加载任何图片，全部本地生成，手机上零额外请求。
   共享纹理只建一次（模块级缓存），不随物件数量重复。 */
var _texCache = {};
function canvasTex(key, w, h, draw, repeat) {
  if (_texCache[key]) return _texCache[key];
  var cv = document.createElement('canvas');
  cv.width = w; cv.height = h;
  draw(cv.getContext('2d'), w, h);
  var tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  if (repeat) { tex.wrapS = tex.wrapT = THREE.RepeatWrapping; tex.repeat.set(repeat[0], repeat[1]); }
  _texCache[key] = tex;
  return tex;
}
/* 草地细节：以白色为底的细碎斑点（亮度 0.82–1.05），和地形顶点色相乘——
   草地有纹理、沙滩还是沙色、雪山还是白色，不会串色。 */
function grassDetailTex() {
  return canvasTex('grassDetail', 256, 256, function (ctx, w, h) {
    ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, w, h);
    var rnd = RNG(20261121);
    for (var i = 0; i < 2600; i++) {
      var v = 0.78 + rnd() * 0.28;
      var g = Math.floor(255 * v);
      ctx.fillStyle = 'rgb(' + Math.floor(g * 0.88) + ',' + g + ',' + Math.floor(g * 0.82) + ')';
      ctx.fillRect(rnd() * w, rnd() * h, 1 + rnd() * 2.5, 1 + rnd() * 2.5);
    }
    ctx.strokeStyle = 'rgba(70,140,60,0.35)';
    for (var j = 0; j < 420; j++) {
      var x = rnd() * w, y = rnd() * h;
      ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + (rnd() - 0.5) * 3, y - 3 - rnd() * 5); ctx.stroke();
    }
  }, [28, 28]);
}
/* 树皮：棕底 + 深色竖纹。 */
function barkTex() {
  return canvasTex('bark', 128, 128, function (ctx, w, h) {
    ctx.fillStyle = '#8b5a2b'; ctx.fillRect(0, 0, w, h);
    var rnd = RNG(777);
    for (var i = 0; i < 90; i++) {
      ctx.fillStyle = rnd() > 0.5 ? 'rgba(90,55,20,0.5)' : 'rgba(190,140,90,0.45)';
      ctx.fillRect(rnd() * w, 0, 1.5 + rnd() * 3, h);
    }
  });
}
/* 天空渐变：顶上深蓝 → 中间亮蓝 → 地平线淡蓝白（16×256 竖条）。 */
function skyTex() {
  return canvasTex('sky', 16, 256, function (ctx, w, h) {
    var g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, '#1f6fd6'); g.addColorStop(0.45, '#5db3f5');
    g.addColorStop(0.75, '#a8dcff'); g.addColorStop(1, '#d8f1ff');
    ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
  });
}
/* 柔边圆点：云朵 / 光晕 / 水面闪光共用（径向渐变白 → 透明）。 */
function softDotTex() {
  return canvasTex('softDot', 128, 128, function (ctx, w, h) {
    var g = ctx.createRadialGradient(64, 64, 4, 64, 64, 62);
    g.addColorStop(0, 'rgba(255,255,255,1)');
    g.addColorStop(0.55, 'rgba(255,255,255,0.75)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
  });
}
/* 星形闪光：水面波光（四角星 + 圆心）。 */
function glintTex() {
  return canvasTex('glint', 128, 128, function (ctx, w, h) {
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = 'rgba(255,255,255,0.9)';
    ctx.beginPath();
    ctx.moveTo(64, 6); ctx.quadraticCurveTo(70, 58, 122, 64);
    ctx.quadraticCurveTo(70, 70, 64, 122); ctx.quadraticCurveTo(58, 70, 6, 64);
    ctx.quadraticCurveTo(58, 58, 64, 6); ctx.fill();
    ctx.beginPath(); ctx.arc(64, 64, 12, 0, Math.PI * 2); ctx.fill();
  });
}
/* 给一组物件开真阴影：投射开、接收开；透明贴片（blob 影子）跳过。 */
function shadowify(group) {
  group.traverse(function (o) {
    if (o.isMesh && o.material && !o.material.transparent) {
      o.castShadow = true;
      o.receiveShadow = true;
    }
  });
}
/* 确定性伪随机（布局每次打开都一样） */
function RNG(seed) {
  var s = seed;
  return function () { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
}

/* 彩虹裙轮廓：原型 B 蓬蓬裙（用户已定稿，对照原型图 B）
   收腰、胯部圆鼓鼓张开到最宽（约裙高 1/3 处）、下摆微微往里收。
   控制点 [高度 y, 半径 r]，smoothstep 插值；裙摆/腰围比约 2.6:1。 */
var SKIRT_PROFILE = [
  [0.00, 0.76], [0.18, 0.84], [0.36, 0.86], [0.55, 0.82],
  [0.75, 0.72], [0.92, 0.58], [1.05, 0.44], [1.18, 0.32], [1.20, 0.30]
];
function skirtRadius(y) {
  var p = SKIRT_PROFILE;
  if (y <= p[0][0]) return p[0][1];
  for (var i = 0; i < p.length - 1; i++) {
    if (y <= p[i + 1][0]) {
      var t = (y - p[i][0]) / (p[i + 1][0] - p[i][0]);
      t = t * t * (3 - 2 * t);
      return p[i][1] + (p[i + 1][1] - p[i][1]) * t;
    }
  }
  return p[p.length - 1][1];
}
/* 一段彩色裙带：按同一条弧线轮廓车出的 Lathe 曲面，5 段拼起来 silhouette 连续平滑 */
function skirtBand(y0, y1, color) {
  var pts = [];
  if (y0 === 0) pts.push(new THREE.Vector2(0.68, -0.035)); /* 裙摆下缘微收，圆润收口 */
  var N = 7;
  for (var i = 0; i <= N; i++) {
    var y = y0 + (y1 - y0) * i / N;
    pts.push(new THREE.Vector2(skirtRadius(y), y));
  }
  return new THREE.Mesh(new THREE.LatheGeometry(pts, 28), mat(color));
}

/* ---------------- 场景搭建 ---------------- */
function buildRenderer() {
  var canvas = $('gl');
  G.renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true });
  G.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  G.renderer.outputColorSpace = THREE.SRGBColorSpace;
  /* v20：游戏级渲染——ACES 电影级色调映射（颜色更饱和、亮部不死白），
     软阴影开起来，真太阳光在地上投影子。 */
  G.renderer.toneMapping = THREE.ACESFilmicToneMapping;
  G.renderer.toneMappingExposure = 1.15;
  G.renderer.shadowMap.enabled = true;
  G.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  G.scene = new THREE.Scene();
  G.scene.background = new THREE.Color(0x9fd8ff);
  G.scene.fog = new THREE.Fog(0xbfe3ff, 140, 320);
  G.camera = new THREE.PerspectiveCamera(55, 1, 0.1, 600);
  G.camera.position.set(0, 5, 21);
  G.camera.lookAt(0, 1, 8);
  var hemi = new THREE.HemisphereLight(0xcfe8ff, 0x9dbb7a, 1.15);
  G.scene.add(hemi);
  /* v20：太阳从北边高处照过来（-40, 70, -35），光晕能在镜头里看见，
     影子朝南（朝镜头）拉长，地面有纵深感。 */
  var sun = new THREE.DirectionalLight(0xfff1c4, 2.2);
  sun.position.set(-40, 70, -35);
  sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024);
  sun.shadow.camera.left = -60; sun.shadow.camera.right = 60;
  sun.shadow.camera.top = 60; sun.shadow.camera.bottom = -60;
  sun.shadow.camera.near = 10; sun.shadow.camera.far = 220;
  sun.shadow.bias = -0.0008;
  sun.shadow.normalBias = 0.6;
  G.scene.add(sun);
  G.sun = sun; G.hemi = hemi;
  G.raycaster = new THREE.Raycaster();
  G.pointer = new THREE.Vector2();
  resize();
  window.addEventListener('resize', resize);
}
function resize() {
  var cv = $('gl');
  var w = cv.clientWidth, h = cv.clientHeight;
  if (!w || !h) return;
  G.renderer.setSize(w, h, false);
  G.camera.aspect = w / h;
  /* v21：镜头按宽高比自适应——竖屏手机保持原来的跟随取景；
     横屏（电脑 / 学习机）拉宽视野、往后退，公主、动物、目标点全在画面里。 */
  applyFraming();
  G.camera.updateProjectionMatrix();
}
/* 横屏拉宽、竖屏拉近；只改取景，不改游戏内容 */
function applyFraming() {
  var aspect = G.camera.aspect || 1;
  if (aspect > 1.25) {
    G.camera.fov = 64;
    G.camOffset.y = 4.6; G.camOffset.z = 16.5;
  } else if (aspect > 0.9) {
    G.camera.fov = 58;
    G.camOffset.y = 4.4; G.camOffset.z = 15.5;
  } else {
    /* v21：竖屏再往后退一点（z 13→15）——手机横向视野只有约 27°，
       退后两步，站在地点两边的公主和小动物才不会被切出画面 */
    G.camera.fov = 55;
    G.camOffset.y = 4.4; G.camOffset.z = 15;
  }
}

function buildTerrain() {
  var geo = new THREE.PlaneGeometry(150, 150, 110, 110);
  geo.rotateX(-Math.PI / 2);
  var pos = geo.attributes.position;
  var colors = new Float32Array(pos.count * 3);
  var cGrass1 = new THREE.Color(0x79c465), cGrass2 = new THREE.Color(0x5da94f),
      cSand = new THREE.Color(0xf2d492), cDirt = new THREE.Color(0xc89b6a),
      cRock = new THREE.Color(0x9aa0a6), cSnow = new THREE.Color(0xffffff),
      cBed = new THREE.Color(0xe8d9a0);
  var c = new THREE.Color();
  for (var i = 0; i < pos.count; i++) {
    var x = pos.getX(i), z = pos.getZ(i);
    var h = terrainH(x, z);
    pos.setY(i, h);
    var r = Math.hypot(x, z);
    var n = 0.5 + 0.5 * Math.sin(x * 0.7 + z * 0.5) * Math.sin(z * 0.9 - x * 0.3);
    c.copy(cGrass1).lerp(cGrass2, n);
    if (r > 50) c.copy(cSand);
    if (distToPath(x, z) < 1.6 && r < 50 && h < 6) c.copy(cDirt);
    if (Math.hypot(x, z) < 11 && h < 0.3) c.copy(cBed);
    if (h > 11) c.copy(cSnow);
    else if (h > 7) c.lerp(cRock, (h - 7) / 4 * 0.7);
    colors[i * 3] = c.r; colors[i * 3 + 1] = c.g; colors[i * 3 + 2] = c.b;
  }
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  geo.computeVertexNormals();
  /* v20：草地细节纹理（和顶点色相乘）+ 接收真阴影 */
  var terrain = new THREE.Mesh(geo, new THREE.MeshLambertMaterial({ vertexColors: true, map: grassDetailTex() }));
  terrain.name = 'terrain';
  terrain.receiveShadow = true;
  G.scene.add(terrain);
  G.terrain = terrain;

  /* 大海：更饱和的碧蓝 + 水面闪光点（原型 C 里那种波光） */
  var sea = new THREE.Mesh(new THREE.CircleGeometry(230, 48),
    new THREE.MeshLambertMaterial({ color: 0x1e96e8, transparent: true, opacity: 0.92 }));
  sea.rotation.x = -Math.PI / 2;
  sea.position.y = -1.0;
  sea.name = 'sea';
  G.scene.add(sea);
  G.sea = sea;
  /* 水面闪光：星形贴片，一闪一闪（tick 里呼吸），大海 + 池塘都有 */
  var glintRnd = RNG(4242);
  for (var gi = 0; gi < 12; gi++) {
    var gm = new THREE.SpriteMaterial({ map: glintTex(), transparent: true, opacity: 0.6, depthWrite: false, fog: false });
    var gs = new THREE.Sprite(gm);
    var onPond = gi < 3;
    var gx, gz, gy;
    if (onPond) { var a = glintRnd() * Math.PI * 2, rr = 2 + glintRnd() * 6; gx = Math.cos(a) * rr; gz = Math.sin(a) * rr; gy = 0.25; }
    else { var a2 = glintRnd() * Math.PI * 2, rr2 = 56 + glintRnd() * 26; gx = Math.cos(a2) * rr2; gz = Math.sin(a2) * rr2; gy = -0.8; }
    gs.position.set(gx, gy, gz);
    var gscale = 1.6 + glintRnd() * 1.8;
    gs.scale.set(gscale, gscale, 1);
    G.scene.add(gs);
    G.glints.push({ sprite: gs, phase: glintRnd() * 6.28, base: 0.45 + glintRnd() * 0.3, scale: gscale });
  }
  /* 岸边浪圈 */
  for (var k = 0; k < 2; k++) {
    var ring = new THREE.Mesh(new THREE.RingGeometry(57 + k * 2.5, 59 + k * 2.5, 48),
      new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.35, side: THREE.DoubleSide, depthWrite: false }));
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = -0.85;
    G.scene.add(ring);
    G.seaRings.push(ring);
  }
  /* 中央池塘水面 */
  var pond = new THREE.Mesh(new THREE.CircleGeometry(10.5, 32),
    new THREE.MeshLambertMaterial({ color: 0x2fb5f0, transparent: true, opacity: 0.9 }));
  pond.rotation.x = -Math.PI / 2;
  pond.position.set(0, 0.12, 0);
  pond.name = 'pond';
  G.scene.add(pond);

  /* 夜空星星（白天隐藏） */
  for (var s = 0; s < 60; s++) {
    var st = new THREE.Mesh(new THREE.SphereGeometry(0.35, 6, 6),
      new THREE.MeshBasicMaterial({ color: 0xffffff }));
    var a = Math.random() * Math.PI * 2, rr = 60 + Math.random() * 90;
    st.position.set(Math.cos(a) * rr, 28 + Math.random() * 45, Math.sin(a) * rr - 20);
    st.visible = false;
    G.scene.add(st);
    G.stars3d.push(st);
  }
  /* 云：柔边贴片云朵（比实心球蓬松，像原型 C 的棉花云），慢慢漂移 */
  G.cloudMats = [];
  for (var ci = 0; ci < 6; ci++) {
    var cl = new THREE.Group();
    var npuff = 4 + (ci % 2);
    for (var pi = 0; pi < npuff; pi++) {
      var cm = new THREE.SpriteMaterial({ map: softDotTex(), transparent: true, opacity: 0.92, depthWrite: false, fog: false });
      G.cloudMats.push(cm);
      var puff = new THREE.Sprite(cm);
      var pw = 7 + Math.random() * 5;
      puff.scale.set(pw, pw * 0.55, 1);
      puff.position.set(pi * 4.2 - npuff * 2, Math.random() * 1.6, Math.random() * 2 - 1);
      cl.add(puff);
    }
    cl.position.set(-60 + ci * 24, 30 + (ci % 3) * 5, -40 - (ci % 2) * 20);
    G.scene.add(cl);
    G.clouds.push(cl);
  }
  /* v20：渐变天空穹顶 + 太阳光晕（都在雾范围外，fog:false 才不会被雾吃掉） */
  var sky = new THREE.Mesh(new THREE.SphereGeometry(420, 24, 16),
    new THREE.MeshBasicMaterial({ map: skyTex(), side: THREE.BackSide, fog: false }));
  sky.name = 'skyDome';
  G.scene.add(sky);
  G.skyDome = sky;
  var sunSpr = new THREE.Sprite(new THREE.SpriteMaterial({
    map: softDotTex(), color: 0xfff3b0, transparent: true, opacity: 0.95, depthWrite: false, fog: false }));
  /* v20：太阳光晕放在正北高空（x=0），不管镜头跟到哪个角落，它都在画面里偏上居中 */
  sunSpr.position.set(0, 160, -300);
  sunSpr.scale.set(140, 140, 1);
  G.scene.add(sunSpr);
  G.sunSprite = sunSpr;
}

/* ---------------- 岛上物件（低多边形，带 userData.spotId / 顶部高度） ---------------- */
function makeTree(s) {
  /* v20：树冠更饱满——6 团分层树叶，深绿打底、亮绿做受光面，树干带树皮纹理 */
  var g = new THREE.Group();
  var trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.32 * s, 0.48 * s, 1.8 * s, 10),
    new THREE.MeshLambertMaterial({ map: barkTex() }));
  trunk.position.set(0, 0.9 * s, 0);
  g.add(trunk);
  g.add(sph(1.25 * s, 0x2f9e44, 0, 2.5 * s, 0, 1, 1.05, 1));
  g.add(sph(0.95 * s, 0x37b24d, -0.65 * s, 2.0 * s, 0.3 * s));
  g.add(sph(0.9 * s, 0x2b8a3e, 0.7 * s, 2.1 * s, -0.3 * s));
  g.add(sph(0.7 * s, 0x40c057, 0.35 * s, 3.0 * s, 0.25 * s));
  g.add(sph(0.6 * s, 0x7ed957, -0.35 * s, 3.1 * s, -0.2 * s));
  g.add(sph(0.5 * s, 0x51cf66, 0, 3.5 * s, 0));
  g.userData.topY = 3.9 * s;
  return g;
}
function makeHouse() {
  /* 玩具屋式开面房子：朝南（镜头）的一面是敞开的，孩子能直接看到里面的动物 */
  var g = new THREE.Group();
  var wall = 0xfdf3d8, roofC = 0xe03131;
  g.add(box(3.6, 0.15, 3.0, 0xd9c9a8, 0, 0.07, 0));                  /* 地板 */
  g.add(box(3.6, 2.2, 0.2, wall, 0, 1.25, -1.4));                   /* 后墙 */
  g.add(box(0.2, 2.2, 3.0, wall, -1.7, 1.25, 0));                   /* 左墙 */
  g.add(box(0.2, 2.2, 3.0, wall, 1.7, 1.25, 0));                    /* 右墙 */
  g.add(box(0.7, 1.0, 0.1, 0x7fb3ff, -1.7, 1.4, 0));                /* 侧窗 */
  g.add(box(0.7, 1.0, 0.1, 0x7fb3ff, 1.7, 1.4, 0));
  g.add(box(3.6, 0.25, 0.3, wall, 0, 2.3, 1.45));                   /* 前檐 */
  var roof = cone(2.9, 1.6, roofC, 0, 3.2, 0, 4);                    /* 四棱锥屋顶 */
  roof.rotation.y = Math.PI / 4; roof.scale.set(1.15, 1, 1);
  g.add(roof);
  g.add(box(0.4, 0.9, 0.4, 0xb08968, 1.1, 3.1, -0.8));               /* 烟囱 */
  g.add(box(1.0, 1.6, 0.12, 0x8b5a2b, 0, 0.8, 1.5));                /* 门板（半开在侧边） */
  g.children[g.children.length - 1].rotation.y = 0.9;
  g.children[g.children.length - 1].position.x = 1.35;
  g.userData.topY = 4.0; g.userData.openFront = true;
  return g;
}
function makeBox() {
  var g = new THREE.Group();
  var wood = 0xc98a4b;
  g.add(box(1.7, 0.18, 1.7, wood, 0, 0.09, 0));
  g.add(box(1.7, 0.9, 0.16, wood, 0, 0.55, 0.77));
  g.add(box(1.7, 0.9, 0.16, wood, 0, 0.55, -0.77));
  g.add(box(0.16, 0.9, 1.7, wood, 0.77, 0.55, 0));
  g.add(box(0.16, 0.9, 1.7, wood, -0.77, 0.55, 0));
  g.add(box(1.9, 0.1, 0.35, 0xa06a2e, 0, 1.02, 0.77));              /* 盖板半开 */
  g.userData.topY = 1.0;
  return g;
}
function makeBasket() {
  var g = new THREE.Group();
  var b = cyl(0.75, 0.6, 0.9, 0xb0893c, 0, 0.45, 0, 12);
  b.material = mat(0xb0893c); g.add(b);
  var rim = new THREE.Mesh(new THREE.TorusGeometry(0.75, 0.09, 8, 18), mat(0x8a6a2e));
  rim.rotation.x = Math.PI / 2; rim.position.y = 0.9; g.add(rim);
  var handle = new THREE.Mesh(new THREE.TorusGeometry(0.7, 0.07, 8, 18, Math.PI), mat(0x8a6a2e));
  handle.position.y = 0.9; g.add(handle);
  g.userData.topY = 0.95;
  return g;
}
function makeBridge() {
  var g = new THREE.Group();
  var wood = 0xb0893c;
  for (var i = 0; i < 7; i++) {
    var t = i / 6 - 0.5;
    var plank = box(1.1, 0.12, 0.75, i % 2 ? 0xc98a4b : wood, t * 5.4, 0.9 + Math.cos(t * Math.PI) * 0.55, 0);
    g.add(plank);
  }
  var railL = cyl(0.07, 0.07, 6.2, 0x8a6a2e, 0, 1.7, 0.55, 8);
  railL.rotation.z = Math.PI / 2; g.add(railL);
  var railR = railL.clone(); railR.position.z = -0.55; g.add(railR);
  for (var p = -2.4; p <= 2.4; p += 1.2) {
    g.add(cyl(0.06, 0.06, 0.9, 0x8a6a2e, p, 1.25, 0.55, 6));
    g.add(cyl(0.06, 0.06, 0.9, 0x8a6a2e, p, 1.25, -0.55, 6));
  }
  g.userData.topY = 1.5;
  return g;
}
function makeTable() {
  var g = new THREE.Group();
  g.add(box(2.2, 0.16, 1.4, 0x9c6644, 0, 0.95, 0));
  [[-0.95, -0.55], [0.95, -0.55], [-0.95, 0.55], [0.95, 0.55]].forEach(function (p) {
    g.add(cyl(0.08, 0.08, 0.95, 0x7a4a21, p[0], 0.48, p[1], 8));
  });
  g.userData.topY = 1.05;
  return g;
}
function makeFlower(color) {
  /* v20：野花改成 3 个网格（茎 + 一朵扁花 + 花心），原来 8 个——
     花园的花从 26 朵加到 36 朵，总绘制数反而少了，颜色更鲜艳。 */
  var g = new THREE.Group();
  g.add(cyl(0.05, 0.05, 0.8, 0x2f9e44, 0, 0.4, 0, 6));
  var blossom = sph(0.3, color, 0, 0.88, 0, 1, 0.55, 1);
  g.add(blossom);
  g.add(sph(0.14, 0xffd43b, 0, 0.92, 0));
  g.userData.topY = 1.0;
  return g;
}
function makeRock(s) {
  var g = new THREE.Group();
  var m = new THREE.Mesh(new THREE.DodecahedronGeometry(0.7 * s, 0), mat(0x9aa0a6));
  m.position.y = 0.45 * s; m.rotation.set(0.4, Math.random(), 0.2);
  g.add(m);
  g.userData.topY = 0.9 * s;
  return g;
}
function makeBush(s) {
  var g = new THREE.Group();
  g.add(sph(0.7 * s, 0x2f9e44, 0, 0.5 * s, 0));
  g.add(sph(0.5 * s, 0x37b24d, 0.5 * s, 0.4 * s, 0.2 * s));
  g.add(sph(0.45 * s, 0x2b8a3e, -0.45 * s, 0.35 * s, -0.15 * s));
  g.add(sph(0.35 * s, 0x51cf66, 0.1 * s, 0.85 * s, 0.1 * s));
  g.userData.topY = 1.1 * s;
  return g;
}
function makeGrassTuft() {
  var g = new THREE.Group();
  for (var i = 0; i < 3; i++) {
    var c = cone(0.09, 0.55, 0x51cf66, (i - 1) * 0.14, 0.28, 0, 5);
    c.rotation.z = (i - 1) * 0.25;
    g.add(c);
  }
  return g;
}
function makePebble() {
  var g = new THREE.Group();
  var m = sph(0.22, 0xb6bcc2, 0, 0.12, 0, 1, 0.6, 1);
  g.add(m);
  return g;
}
/* v21：沙滩伞——躲雨游戏里小鸟藏在伞下面 */
function makeUmbrella() {
  var g = new THREE.Group();
  g.add(cyl(0.07, 0.07, 2.6, 0x8a6a2e, 0, 1.3, 0, 8));       /* 伞杆 */
  g.add(cone(1.9, 0.9, 0xef4444, 0, 2.9, 0, 12));              /* 红色伞面 */
  g.add(sph(0.14, 0xffd43b, 0, 3.4, 0));                       /* 伞尖小球 */
  g.userData.topY = 3.4;
  return g;
}
var SPOT_BUILDERS = {
  tree: function () { return makeTree(1.15); },
  house: makeHouse, box: makeBox, basket: makeBasket, bridge: makeBridge,
  table: makeTable, flower: function () { return makeFlower(0xff6b9d); }, rock: function () { return makeRock(1.1); },
  umbrella: makeUmbrella, bush: function () { return makeBush(1.3); }
};

/* v20：蝴蝶——两片翅膀扇动，围着花丛飞 */
var BUTTERFLY_COLORS = [0xff922b, 0x4dabf7, 0xf783ac, 0xffd43b, 0x9775fa];
function makeButterfly(color) {
  var g = new THREE.Group();
  var wingMat = new THREE.MeshBasicMaterial({ color: color, side: THREE.DoubleSide });
  function wing(side) {
    var pivot = new THREE.Group();
    pivot.position.set(side * 0.05, 0, 0);
    var w = new THREE.Mesh(new THREE.PlaneGeometry(0.4, 0.32), wingMat);
    w.rotation.x = -Math.PI / 2;
    w.position.x = side * 0.22;
    pivot.add(w);
    return pivot;
  }
  var wl = wing(-1), wr = wing(1);
  g.add(wl); g.add(wr);
  var body = cyl(0.03, 0.03, 0.32, 0x343a40, 0, 0, 0, 6);
  body.rotation.x = Math.PI / 2;
  g.add(body);
  g.userData.wings = { L: wl, R: wr };
  return g;
}

function buildIsland() {
  /* 大雪山（北边山顶） */
  var mount = new THREE.Group();
  var coneM = cone(15, 17, 0x8d99ae, 0, 8.5, 0, 24);
  mount.add(coneM);
  var snow = cone(6.2, 7, 0xffffff, 0, 13.5, 0, 24);
  mount.add(snow);
  mount.add(makeRock(1.6)); mount.children[2].position.set(6, 0.5, 4);
  mount.position.set(0, terrainH(0, -48) - 0.5, -48);
  shadowify(mount);
  G.scene.add(mount);

  /* 8 个主物件 */
  Object.keys(SPOTS).forEach(function (id) {
    var sp = SPOTS[id];
    var g = SPOT_BUILDERS[id]();
    var x = px(sp.x), z = pz(sp.y);
    g.position.set(x, terrainH(x, z), z);
    g.userData.spotId = id;
    g.traverse(function (o) { o.userData.spotId = id; });
    shadowify(g);
    G.scene.add(g);
    G.spotMeshes[id] = g;
    G.spots[id] = { group: g, x: x, z: z, topY: terrainH(x, z) + (g.userData.topY || 1) };
    /* 中文小牌子 */
    var label = makeTextSprite(sp.zh, '#5b4636');
    label.position.set(x, terrainH(x, z) + (g.userData.topY || 1) + 1.1, z);
    G.scene.add(label);
    /* v21：牌子离镜头太近会糊满屏——tick 里按镜头距离淡出，这里先记下来 */
    if (!G.labels) G.labels = [];
    G.labels.push(label);
  });

  /* 装饰：森林的树、花园的花、沙滩的石子、草丛（确定性随机） */
  var rnd = RNG(20261120);
  function scatter(make, zone, n, scaleMin, scaleMax) {
    for (var i = 0; i < n; i++) {
      var x = zone.x0 + rnd() * (zone.x1 - zone.x0);
      var z = zone.z0 + rnd() * (zone.z1 - zone.z0);
      if (Math.hypot(x, z) > 52) continue;
      /* 大树 spot 周围留空：behind 找动物时，小动物从树后探出来不能被别的树挡住 */
      if (zone.exclude) {
        var blocked = false;
        for (var e = 0; e < zone.exclude.length; e++) {
          if (Math.hypot(x - zone.exclude[e].x, z - zone.exclude[e].z) < zone.exclude[e].r) { blocked = true; break; }
        }
        if (blocked) continue;
      }
      var g = make();
      var s = scaleMin + rnd() * (scaleMax - scaleMin);
      g.scale.setScalar(s);
      g.position.set(x, terrainH(x, z), z);
      g.rotation.y = rnd() * Math.PI * 2;
      shadowify(g);
      G.scene.add(g);
    }
  }
  var treeClear = [{ x: px(24), z: pz(22), r: 5.5 }];
  scatter(function () { return makeTree(1); }, { x0: -45, x1: 30, z0: -44, z1: -18, exclude: treeClear }, 38, 0.8, 1.25);
  scatter(function () { return makeBush(1); }, { x0: -45, x1: 45, z0: -44, z1: 30, exclude: treeClear }, 22, 0.7, 1.2);
  scatter(function () { return makeFlower([0xff6b9d, 0xffd43b, 0xda77f2, 0xff8787, 0x74c0fc, 0xffffff][Math.floor(rnd() * 6)]); },
    { x0: 18, x1: 52, z0: -22, z1: 12 }, 36, 0.8, 1.3);
  scatter(function () { return makeRock(1); }, { x0: -50, x1: 50, z0: 30, z1: 52 }, 18, 0.7, 1.4);
  scatter(function () { return makePebble(); }, { x0: -50, x1: 50, z0: 28, z1: 52 }, 16, 0.8, 1.5);
  scatter(function () { return makeGrassTuft(); }, { x0: -48, x1: 48, z0: -45, z1: 45 }, 40, 0.8, 1.4);

  /* v20：蝴蝶 + 漂浮花粉光点——岛上有生命感（tick 里扇翅膀、漂移） */
  var bfRnd = RNG(98765);
  for (var bi = 0; bi < 5; bi++) {
    var bf = makeButterfly(BUTTERFLY_COLORS[bi % BUTTERFLY_COLORS.length]);
    G.scene.add(bf);
    G.butterflies.push({
      g: bf, cx: -20 + bfRnd() * 40, cz: -15 + bfRnd() * 35,
      r: 4 + bfRnd() * 7, h: 2.5 + bfRnd() * 3, speed: 0.25 + bfRnd() * 0.25,
      phase: bfRnd() * 6.28
    });
  }
  var pCount = 48;
  var pGeo = new THREE.BufferGeometry();
  var pBase = new Float32Array(pCount * 3);
  for (var pi2 = 0; pi2 < pCount; pi2++) {
    pBase[pi2 * 3] = -45 + bfRnd() * 90;
    pBase[pi2 * 3 + 1] = 1 + bfRnd() * 9;
    pBase[pi2 * 3 + 2] = -40 + bfRnd() * 80;
  }
  var pPos = new Float32Array(pBase);
  pGeo.setAttribute('position', new THREE.BufferAttribute(pPos, 3));
  var pollen = new THREE.Points(pGeo, new THREE.PointsMaterial({
    color: 0xfff9c4, size: 0.32, map: softDotTex(), transparent: true, opacity: 0.7, depthWrite: false }));
  G.scene.add(pollen);
  G.pollen = pollen;
  G.pollenBase = pBase;

  /* v21：下雨（只在 under 躲雨回合里出现）——160 条雨丝，一次画完 */
  var rCount = 160;
  var rGeo = new THREE.BufferGeometry();
  var rPos = new Float32Array(rCount * 3);
  var rRnd = RNG(31337);
  for (var ri = 0; ri < rCount; ri++) {
    rPos[ri * 3] = -40 + rRnd() * 80;
    rPos[ri * 3 + 1] = rRnd() * 22;
    rPos[ri * 3 + 2] = -40 + rRnd() * 80;
  }
  rGeo.setAttribute('position', new THREE.BufferAttribute(rPos, 3));
  var rain = new THREE.Points(rGeo, new THREE.PointsMaterial({
    color: 0x9fd8ff, size: 0.28, transparent: true, opacity: 0.55, depthWrite: false }));
  rain.visible = false;
  G.scene.add(rain);
  G.rain = rain;

  /* v21：花瓣飘——10 片粉色花瓣在花园上空慢慢飘落 */
  for (var pi4 = 0; pi4 < 10; pi4++) {
    var pm = new THREE.SpriteMaterial({ map: softDotTex(), color: 0xf9a8d4, transparent: true, opacity: 0.85, depthWrite: false });
    var ps = new THREE.Sprite(pm);
    ps.scale.set(0.7, 0.5, 1);
    ps.position.set(10 + rRnd() * 40, 2 + rRnd() * 8, -20 + rRnd() * 30);
    G.scene.add(ps);
    G.petals.push({ sprite: ps, phase: rRnd() * 6.28, speed: 0.25 + rRnd() * 0.3, x0: ps.position.x, z0: ps.position.z, y0: ps.position.y });
  }

  /* v21：飞过的小鸟——每隔一阵子从天边飞过去 */
  var fb = new THREE.Group();
  var fbMat = new THREE.MeshBasicMaterial({ color: 0x343a40, side: THREE.DoubleSide });
  var fbWings = {};
  [-1, 1].forEach(function (side) {
    var pivot = new THREE.Group();
    var w = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 0.45), fbMat);
    w.position.x = side * 0.6;
    pivot.add(w);
    fb.add(pivot);
    fbWings[side < 0 ? 'L' : 'R'] = pivot;
  });
  fb.userData.wings = fbWings;
  fb.visible = false;
  G.scene.add(fb);
  G.flyby = fb;
  G.flybyTimer = 6;
}
/* 中文小牌子：canvas 纹理 sprite，永远朝向镜头 */
function makeTextSprite(text, color) {
  var cv = document.createElement('canvas');
  cv.width = 256; cv.height = 96;
  var ctx = cv.getContext('2d');
  ctx.fillStyle = 'rgba(255,255,255,0.88)';
  ctx.beginPath(); ctx.roundRect(6, 14, 244, 68, 30); ctx.fill();
  ctx.fillStyle = color || '#5b4636';
  ctx.font = 'bold 44px sans-serif';
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(text, 128, 50);
  var tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  var sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false }));
  sp.scale.set(3.4, 1.28, 1);
  return sp;
}

/* ---------------- 3D 角色（低多边形，腿真的迈步） ---------------- */
function makeLeg(len, r, color) {
  var pivot = new THREE.Group();
  var m = cyl(r, r * 0.75, len, color, 0, -len / 2, 0, 8);
  pivot.add(m);
  var foot = sph(r * 1.15, color, 0, -len, 0.04);
  foot.scale.y = 0.6;
  pivot.add(foot);
  return pivot;
}
/* 四足动物：horse / dog / cat / bear。forward = +z */
function makeQuadruped(cfg) {
  var s = cfg.scale;
  var root = new THREE.Group();
  var bodyG = new THREE.Group();
  root.add(bodyG);
  var legLen = 0.62 * s;
  var bodyY = legLen + 0.5 * s;
  var body = sph(0.55 * s, cfg.body, 0, bodyY, 0, 1.5, 0.92, 0.88);
  bodyG.add(body);
  var chest = sph(0.42 * s, cfg.belly, 0, bodyY - 0.05 * s, 0.42 * s, 1, 0.9, 1);
  bodyG.add(chest);
  /* 脖子 + 头 */
  var neck = cyl(0.2 * s, 0.26 * s, cfg.neckLen, cfg.body, 0, bodyY + cfg.neckLen * 0.32, 0.5 * s, 10);
  neck.rotation.x = 0.5;
  bodyG.add(neck);
  var headG = new THREE.Group();
  headG.position.set(0, bodyY + cfg.headY, 0.78 * s);
  bodyG.add(headG);
  headG.add(sph(0.34 * s, cfg.body, 0, 0, 0, 1, 0.95, 0.95));
  headG.add(box(0.3 * s, 0.2 * s, 0.28 * s, cfg.snout, 0, -0.06 * s, 0.3 * s));
  headG.add(sph(0.07 * s, 0x2b2b2b, 0, -0.02 * s, 0.44 * s));
  headG.add(sph(0.055 * s, 0x1a1a1a, -0.13 * s, 0.09 * s, 0.28 * s));
  headG.add(sph(0.055 * s, 0x1a1a1a, 0.13 * s, 0.09 * s, 0.28 * s));
  if (cfg.ears === 'long') {
    headG.add(cone(0.09 * s, 0.34 * s, cfg.body, -0.16 * s, 0.42 * s, 0, 8));
    headG.add(cone(0.09 * s, 0.34 * s, cfg.body, 0.16 * s, 0.42 * s, 0, 8));
  } else if (cfg.ears === 'point') {
    headG.add(cone(0.11 * s, 0.26 * s, cfg.body, -0.17 * s, 0.36 * s, 0, 4));
    headG.add(cone(0.11 * s, 0.26 * s, cfg.body, 0.17 * s, 0.36 * s, 0, 4));
  } else { /* bear: 圆耳朵 */
    headG.add(sph(0.11 * s, cfg.body, -0.2 * s, 0.3 * s, 0));
    headG.add(sph(0.11 * s, cfg.body, 0.2 * s, 0.3 * s, 0));
    headG.add(sph(0.06 * s, cfg.belly, -0.2 * s, 0.3 * s, 0.08 * s));
    headG.add(sph(0.06 * s, cfg.belly, 0.2 * s, 0.3 * s, 0.08 * s));
  }
  if (cfg.mane) { /* 小马的鬃毛：一排深棕色扁块 */
    for (var mi = 0; mi < 3; mi++) {
      bodyG.add(box(0.16 * s, 0.3 * s, 0.3 * s, 0x5c3a21, 0, bodyY + 0.45 * s - mi * 0.22 * s, 0.42 * s - mi * 0.22 * s));
    }
  }
  /* 尾巴 */
  var tail = new THREE.Group();
  tail.position.set(0, bodyY + 0.15 * s, -0.78 * s);
  var tm = cyl(0.07 * s, 0.05 * s, 0.5 * s, cfg.tailColor || cfg.body, 0, -0.2 * s, -0.1 * s, 8);
  tm.rotation.x = 0.6;
  tail.add(tm);
  bodyG.add(tail);
  /* 四条腿：髋/肩处为转轴 */
  var legs = {};
  var legDefs = {
    FL: [-0.28 * s, bodyY - 0.25 * s, 0.34 * s], FR: [0.28 * s, bodyY - 0.25 * s, 0.34 * s],
    BL: [-0.28 * s, bodyY - 0.25 * s, -0.34 * s], BR: [0.28 * s, bodyY - 0.25 * s, -0.34 * s]
  };
  Object.keys(legDefs).forEach(function (k) {
    var d = legDefs[k];
    var leg = makeLeg(legLen, 0.09 * s, cfg.legs);
    leg.position.set(d[0], d[1], d[2]);
    bodyG.add(leg);
    legs[k] = leg;
  });
  var shadow = blobShadow(0.85 * s);
  root.add(shadow);
  root.userData = {
    kind: 'quad', bodyG: bodyG, legs: legs, tail: tail, legLen: legLen,
    bodyBaseY: 0, scale: s, phase: Math.random() * 6, moving: false, speed: 0
  };
  return root;
}
function makeBird() {
  var s = 1.1;
  var root = new THREE.Group();
  var bodyG = new THREE.Group();
  root.add(bodyG);
  var legLen = 0.3;
  var body = sph(0.42, 0x4dabf7, 0, legLen + 0.35, 0, 1, 0.92, 1.25);
  bodyG.add(body);
  bodyG.add(sph(0.3, 0xdbeafe, 0, legLen + 0.28, 0.3, 1, 0.85, 1));
  var headG = new THREE.Group();
  headG.position.set(0, legLen + 0.72, 0.42);
  bodyG.add(headG);
  headG.add(sph(0.27, 0x4dabf7, 0, 0, 0));
  var beak = cone(0.09, 0.24, 0xf59e0b, 0, -0.03, 0.32, 8);
  beak.rotation.x = Math.PI / 2;
  headG.add(beak);
  headG.add(sph(0.05, 0x1a1a1a, -0.11, 0.07, 0.22));
  headG.add(sph(0.05, 0x1a1a1a, 0.11, 0.07, 0.22));
  /* 翅膀：肩部转轴，可扇动 */
  var wings = {};
  [-1, 1].forEach(function (side) {
    var wing = new THREE.Group();
    wing.position.set(side * 0.38, legLen + 0.42, 0);
    var w = box(0.55, 0.06, 0.62, 0x2f7fd0, side * 0.28, 0, -0.05);
    wing.add(w);
    bodyG.add(wing);
    wings[side < 0 ? 'L' : 'R'] = wing;
  });
  var tailF = box(0.3, 0.05, 0.5, 0x2f7fd0, 0, legLen + 0.3, -0.55);
  tailF.rotation.x = -0.4;
  bodyG.add(tailF);
  var legs = {};
  [-0.14, 0.14].forEach(function (lx, i) {
    var leg = makeLeg(legLen, 0.045, 0xf59e0b);
    leg.position.set(lx, legLen, 0.05);
    bodyG.add(leg);
    legs[i === 0 ? 'L' : 'R'] = leg;
  });
  var shadow = blobShadow(0.5);
  root.add(shadow);
  root.userData = {
    kind: 'bird', bodyG: bodyG, legs: legs, wings: wings, legLen: legLen,
    bodyBaseY: 0, scale: s, phase: Math.random() * 6, moving: false, speed: 0
  };
  return root;
}
function makePrincess() {
  var root = new THREE.Group();
  var bodyG = new THREE.Group();
  root.add(bodyG);
  /* 彩虹裙：五段彩色裙带（Lathe 弧线轮廓），自下而上紫→蓝→绿→黄→红；
     原型 B 蓬蓬裙：胯部圆鼓鼓外扩到最宽、下摆微收，不再是直圆锥 */
  var rainbow = [0x8b5cf6, 0x3b82f6, 0x22c55e, 0xfacc15, 0xef4444];
  for (var i = 0; i < 5; i++) {
    bodyG.add(skirtBand(i * 0.24, (i + 1) * 0.24, rainbow[i]));
  }
  /* 上身 + 头 */
  bodyG.add(cyl(0.2, 0.26, 0.3, 0xf9a8d4, 0, 1.32, 0, 14));
  var headG = new THREE.Group();
  headG.position.set(0, 1.72, 0);
  bodyG.add(headG);
  headG.add(sph(0.3, 0xffd9b3, 0, 0, 0));
  headG.add(sph(0.31, 0x6b4423, 0, 0.06, -0.06, 1, 1, 0.9));       /* 后脑头发 */
  headG.add(sph(0.05, 0x1a1a1a, -0.11, 0.03, 0.26));
  headG.add(sph(0.05, 0x1a1a1a, 0.11, 0.03, 0.26));
  headG.add(sph(0.05, 0xff9ebb, -0.2, -0.08, 0.24));                /* 腮红 */
  headG.add(sph(0.05, 0xff9ebb, 0.2, -0.08, 0.24));
  var smile = new THREE.Mesh(new THREE.TorusGeometry(0.09, 0.015, 6, 12, Math.PI), mat(0x8a4b2d));
  smile.position.set(0, -0.1, 0.27); smile.rotation.x = 0; smile.rotation.z = Math.PI;
  headG.add(smile);
  /* 两条麻花辫 */
  [-1, 1].forEach(function (side) {
    var braid = new THREE.Group();
    braid.position.set(side * 0.3, -0.05, -0.05);
    for (var b = 0; b < 3; b++) {
      braid.add(sph(0.09, 0x6b4423, 0, -b * 0.16, -b * 0.05));
    }
    braid.add(cone(0.06, 0.16, 0xef4444, 0, -0.55, -0.15, 6));
    headG.add(braid);
  });
  /* 金皇冠 */
  var crown = cyl(0.17, 0.19, 0.1, 0xffd43b, 0, 0.34, 0, 10);
  headG.add(crown);
  for (var k = 0; k < 5; k++) {
    var a = k / 5 * Math.PI * 2;
    headG.add(cone(0.035, 0.12, 0xffd43b, Math.cos(a) * 0.16, 0.43, Math.sin(a) * 0.16, 4));
  }
  /* 手臂：肩部转轴，边走边摆 */
  var arms = {};
  [-1, 1].forEach(function (side) {
    var arm = new THREE.Group();
    arm.position.set(side * 0.26, 1.42, 0);
    arm.add(cyl(0.06, 0.05, 0.5, 0xffd9b3, 0, -0.25, 0, 8));
    arm.add(sph(0.07, 0xffd9b3, 0, -0.52, 0));
    bodyG.add(arm);
    arms[side < 0 ? 'L' : 'R'] = arm;
  });
  /* 腿：裙子下面，迈步时才看得见 */
  var legs = {};
  [-0.11, 0.11].forEach(function (lx, i) {
    var leg = makeLeg(0.42, 0.07, 0xffffff);
    leg.position.set(lx, 0.45, 0);
    bodyG.add(leg);
    legs[i === 0 ? 'L' : 'R'] = leg;
  });
  var shadow = blobShadow(0.95); /* 蓬蓬裙更宽，影子跟着放大 */
  root.add(shadow);
  root.userData = {
    kind: 'princess', bodyG: bodyG, legs: legs, arms: arms, legLen: 0.42,
    bodyBaseY: 0, scale: 1, phase: 0, moving: false, speed: 0
  };
  return root;
}
var CHAR_BUILDERS = {
  horse: function () { return makeQuadruped({ scale: 1.6, body: 0x8b5e34, belly: 0xe8c39e, snout: 0xe8c39e, legs: 0x6b4423, ears: 'long', neckLen: 0.55, headY: 0.62, mane: true, tailColor: 0x5c3a21 }); },
  dog: function () { return makeQuadruped({ scale: 1.2, body: 0xd9a066, belly: 0xf3e0c8, snout: 0xf3e0c8, legs: 0xb07a3e, ears: 'point', neckLen: 0.3, headY: 0.42, mane: false, tailColor: 0xd9a066 }); },
  cat: function () { return makeQuadruped({ scale: 1.05, body: 0xf59e0b, belly: 0xfde68a, snout: 0xfde68a, legs: 0xd97706, ears: 'point', neckLen: 0.3, headY: 0.4, mane: false, tailColor: 0xf59e0b }); },
  bear: function () { return makeQuadruped({ scale: 1.4, body: 0x8b5a2b, belly: 0xd9b48a, snout: 0xd9b48a, legs: 0x6b4423, ears: 'round', neckLen: 0.25, headY: 0.38, mane: false, tailColor: 0x8b5a2b }); },
  bird: makeBird,
  princess: makePrincess
};
function buildCharacters() {
  Object.keys(CHAR_BUILDERS).forEach(function (id) {
    var g = CHAR_BUILDERS[id]();
    /* v19：人物放大。公主整体再放大 1.5 倍；四足动物的脚天生比根节点高
       0.25*scale（腿轴在身体里），记下 groundOff，setCharPos 会把它扣掉，
       这样脚正好踩在地面上，不会飘在空中。 */
    if (id === 'princess') g.scale.setScalar(1.5);
    var u = g.userData;
    if (u.kind === 'quad') u.groundOff = 0.25 * u.scale;
    else if (u.kind === 'bird') u.groundOff = 0;
    else u.groundOff = 0.05;
    var p = POS[id];
    var x = px(p.x), z = pz(p.y);
    g.position.set(x, terrainH(x, z) - u.groundOff, z);
    g.rotation.y = Math.random() * Math.PI * 2;
    g.traverse(function (o) { o.userData.charId = id; });
    shadowify(g); /* v20：人物也有真影子（blob 影子是透明的，shadowify 会跳过它） */
    G.scene.add(g);
    G.chars[id] = g;
  });
}

/* ---------------- 真走路：腿交替迈步 + 身体起伏 + 转向 ---------------- */
function animateChar(g, dt) {
  var u = g.userData;
  if (!u.moving) {
    /* 闲时：呼吸起伏 + 尾巴轻摆 */
    u.bodyG.position.y = Math.sin(performance.now() * 0.0016 + u.phase) * 0.02;
    if (u.tail) u.tail.rotation.y = Math.sin(performance.now() * 0.002 + u.phase) * 0.25;
    if (u.kind === 'bird' && u.wings) {
      u.wings.L.rotation.z = 0.15 + Math.sin(performance.now() * 0.004) * 0.12;
      u.wings.R.rotation.z = -0.15 - Math.sin(performance.now() * 0.004) * 0.12;
    }
    return;
  }
  u.phase += dt * u.speed * 2.4;
  var s = Math.sin(u.phase), c = Math.cos(u.phase);
  if (u.kind === 'quad') {
    u.legs.FL.rotation.x = s * 0.7;
    u.legs.BR.rotation.x = s * 0.7;
    u.legs.FR.rotation.x = -s * 0.7;
    u.legs.BL.rotation.x = -s * 0.7;
    u.bodyG.position.y = Math.abs(c) * 0.07;
    if (u.tail) u.tail.rotation.y = s * 0.3;
  } else if (u.kind === 'bird') {
    u.legs.L.rotation.x = s * 0.55;
    u.legs.R.rotation.x = -s * 0.55;
    u.wings.L.rotation.z = 0.25 + Math.abs(s) * 0.5;
    u.wings.R.rotation.z = -0.25 - Math.abs(s) * 0.5;
    u.bodyG.position.y = Math.abs(c) * 0.06;
  } else if (u.kind === 'princess') {
    u.legs.L.rotation.x = s * 0.6;
    u.legs.R.rotation.x = -s * 0.6;
    u.arms.L.rotation.x = -s * 0.55;
    u.arms.R.rotation.x = s * 0.55;
    u.bodyG.position.y = Math.abs(c) * 0.05;
    u.bodyG.rotation.z = s * 0.03;
  }
}
function stopWalkAnim(g) {
  var u = g.userData;
  u.moving = false; u.speed = 0;
  if (u.legs) Object.keys(u.legs).forEach(function (k) { u.legs[k].rotation.x = 0; });
  if (u.arms) Object.keys(u.arms).forEach(function (k) { u.arms[k].rotation.x = 0; });
  if (u.wings) { u.wings.L.rotation.z = 0.15; u.wings.R.rotation.z = -0.15; }
  u.bodyG.position.y = 0; u.bodyG.rotation.z = 0;
}

/* ---------------- 移动引擎 ---------------- */
function charPos(id) {
  var g = G.chars[id];
  return { x: g.position.x, z: g.position.z };
}
function setCharPos(id, x, z, yOff) {
  var g = G.chars[id];
  /* yOff 是“脚”的高度偏移（0 = 脚踩地面；on 时 = 物件顶面） */
  g.position.set(x, terrainH(x, z) + (yOff || 0) - (g.userData.groundOff || 0), z);
}
function faceToward(g, tx, tz) {
  var dx = tx - g.position.x, dz = tz - g.position.z;
  if (Math.hypot(dx, dz) < 0.01) return;
  var target = Math.atan2(dx, dz);
  var cur = g.rotation.y;
  var diff = target - cur;
  while (diff > Math.PI) diff -= Math.PI * 2;
  while (diff < -Math.PI) diff += Math.PI * 2;
  g.rotation.y = cur + diff * 0.25;
}
function moveTo(id, tx, tz, speed) {
  var g = G.chars[id];
  return new Promise(function (resolve) {
    if (G.movers[id]) G.movers[id].resolve(false);
    var dx = tx - g.position.x, dz = tz - g.position.z;
    if (Math.hypot(dx, dz) < 0.3) { resolve(true); return; }
    g.userData.moving = true;
    g.userData.speed = (speed || 6) * (G.speedMul || 1);
    G.movers[id] = { tx: tx, tz: tz, speed: (speed || 6) * (G.speedMul || 1), resolve: resolve };
  });
}
function stopMoving(id) {
  if (G.movers[id]) { var m = G.movers[id]; delete G.movers[id]; stopWalkAnim(G.chars[id]); m.resolve(false); }
  else stopWalkAnim(G.chars[id]);
}
function updateMovers(dt) {
  Object.keys(G.movers).forEach(function (id) {
    var m = G.movers[id];
    var g = G.chars[id];
    var dx = m.tx - g.position.x, dz = m.tz - g.position.z;
    var dist = Math.hypot(dx, dz);
    var step = m.speed * dt;
    faceToward(g, m.tx, m.tz);
    if (dist <= step) {
      setCharPos(id, m.tx, m.tz, g.userData.yOff || 0);
      delete G.movers[id];
      stopWalkAnim(g);
      m.resolve(true);
    } else {
      var nx = g.position.x + dx / dist * step;
      var nz = g.position.z + dz / dist * step;
      setCharPos(id, nx, nz, g.userData.yOff || 0);
    }
  });
}
function pondClamp(x, z) {
  var d = Math.hypot(x, z);
  if (d < 11.5) {
    var k = 12.5 / Math.max(d, 0.01);
    return { x: x * k, z: z * k };
  }
  return { x: x, z: z };
}
function walkPrincessTo(x, z, speed) {
  var c = pondClamp(clamp(x, -56, 56), clamp(z, -56, 56));
  return moveTo('princess', c.x, c.z, speed || 8);
}

/* ---------------- 音频总管 v21：全部预录音，一个声音，一个队列 ----------------
   游戏里彻底不用手机 TTS。所有台词都是 Aria 童声预录的 MP3（assets/audio/，73 条）。
   - 一个队列、一次只响一个；按真实播完事件推进（ended 事件 + 按时长算的安全超时，
     不再用 6 秒瞎等）；换句时淡出，不生切。
   - 跟读：台词按词逐个亮；动物名响时动物亮、地点词响时地点亮（按字符位置估算时间）。
   - 点下去立刻响：ding 用 WebAudio 现场合成（<50ms），不经过文件。 */
var COMMON_CLIPS = ['intro', 'count', 'helpme', 'tryagain', 'yay', 'peekaboo', 'praise', 'finish',
  'word-behind', 'word-front', 'word-in_', 'word-nextto', 'word-on', 'word-under'];
function audioEl(key) {
  if (!G.audioEls[key]) {
    var a = new Audio('assets/audio/' + key + '.mp3');
    a.preload = 'auto';
    G.audioEls[key] = a;
  }
  return G.audioEls[key];
}
/* 录音时长（缓存；拿不到就按慢速每词 0.45 秒估算，跟读和超时都靠它） */
function clipDuration(key, fallbackText) {
  if (G.clipDur && G.clipDur[key]) return Promise.resolve(G.clipDur[key]);
  var a = audioEl(key);
  if (a.duration && isFinite(a.duration) && a.duration > 0) {
    if (!G.clipDur) G.clipDur = {};
    G.clipDur[key] = a.duration;
    return Promise.resolve(a.duration);
  }
  return new Promise(function (res) {
    var done = false;
    function fin(v) { if (!done) { done = true; res(v); } }
    a.addEventListener('loadedmetadata', function () { fin(a.duration || 0); }, { once: true });
    a.addEventListener('error', function () { fin(0); }, { once: true });
    setTimeout(function () { fin(0); }, 1500);
  }).then(function (d) {
    if (!d || d <= 0) {
      var n = (fallbackText || '').split(/\s+/).filter(Boolean).length || 4;
      d = 0.5 + n * 0.45;
    }
    if (!G.clipDur) G.clipDur = {};
    G.clipDur[key] = d;
    return d;
  });
}
function ensureAudioCtx() {
  if (!G.audioCtx) {
    try { G.audioCtx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { G.audioCtx = null; }
  }
  if (G.audioCtx && G.audioCtx.state === 'suspended') G.audioCtx.resume();
  return G.audioCtx;
}
/* ding：WebAudio 现场合成的清脆双音，不经过文件，点下去立刻响 */
function ding() {
  try {
    var ctx = ensureAudioCtx();
    if (!ctx) return;
    var t0 = ctx.currentTime;
    [[880, 0], [1318.5, 0.09]].forEach(function (nd) {
      var o = ctx.createOscillator(), g = ctx.createGain();
      o.type = 'sine'; o.frequency.value = nd[0];
      g.gain.setValueAtTime(0.0001, t0 + nd[1]);
      g.gain.exponentialRampToValueAtTime(0.25, t0 + nd[1] + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + nd[1] + 0.45);
      o.connect(g); g.connect(ctx.destination);
      o.start(t0 + nd[1]); o.stop(t0 + nd[1] + 0.5);
    });
  } catch (e) { /* 没声音也不许报错 */ }
}
/* 预热：开声音那一下就把今晚要用的录音都解码好（最多等 2.5 秒，不堵） */
async function preloadClips(wordId) {
  var keys = COMMON_CLIPS.slice();
  (ROUND_PLANS[wordId] || []).forEach(function (r) {
    r.word = wordId;
    [discKey(r), 'greet-' + r.animal, 'where-' + r.animal, actionKey(r)].forEach(function (k) {
      if (keys.indexOf(k) < 0) keys.push(k);
    });
  });
  keys.push('invite-' + wordId);
  var jobs = keys.map(function (k) {
    var a = audioEl(k);
    try { a.load(); } catch (e) {}
    return clipDuration(k, '').catch(function () { return 0; });
  });
  await Promise.race([Promise.all(jobs), sleep(2500)]);
}
/* 停掉当前声音，清掉跟读计时和队列（换回合 / 进家长设置时用） */
function stopAudioNow() {
  G.karaTimers.forEach(function (t) { clearTimeout(t); });
  G.karaTimers = [];
  if (G.audioCurrent) {
    var a = G.audioCurrent;
    G.audioCurrent = null;
    try { a.pause(); a.currentTime = 0; } catch (e) {}
  }
  G.audioQueue = [];
  G.audioBusy = false;
}
/* 播一条录音（排队，一次一个）。opts: {text, words, kara, onStart, onWord} */
function playClip(key, opts) {
  opts = opts || {};
  return new Promise(function (resolve) {
    G.audioQueue.push({ key: key, opts: opts, resolve: resolve });
    pumpAudio();
  });
}
function pumpAudio() {
  if (G.audioBusy || !G.audioQueue.length) return;
  var job = G.audioQueue.shift();
  G.audioBusy = true;
  var a = audioEl(job.key);
  var text = job.opts.text || '';
  var words = job.opts.words || (text ? text.split(/\s+/).filter(Boolean) : []);
  G.lastSpoken.push({ kind: 'clip', key: job.key, text: text });
  G.audioLog.push({ key: job.key, t: Math.round(performance.now()), kind: 'clip' });
  G.lastClipKey = job.key; G.lastClipText = text; G.lastClipName = job.opts.name || '彩虹公主';
  var done = false;
  function fin() {
    if (done) return; done = true;
    G.karaTimers.forEach(function (t) { clearTimeout(t); });
    G.karaTimers = [];
    if (G.audioCurrent === a) G.audioCurrent = null;
    G.audioBusy = false;
    try { a.onended = null; a.onerror = null; } catch (e) {}
    job.resolve();
    pumpAudio();
  }
  clipDuration(job.key, text).then(function (dur) {
    /* 跟读计时：按字符位置估算每个词开始的时间 */
    if (job.opts.kara && words.length) {
      var totalChars = 0;
      words.forEach(function (w) { totalChars += w.length; });
      var acc = 0;
      words.forEach(function (w, i) {
        var frac = totalChars ? acc / totalChars : i / words.length;
        acc += w.length;
        var t = Math.max(0, (frac * dur - 0.05)) * 1000;
        G.karaTimers.push(setTimeout(function () { if (job.opts.onWord) job.opts.onWord(i); }, t));
      });
    }
    var safety = setTimeout(fin, Math.max(600, dur * 1000 + 600));
    a.onended = function () { clearTimeout(safety); fin(); };
    a.onerror = function () { clearTimeout(safety); fin(); };
    G.audioCurrent = a;
    try {
      a.currentTime = 0;
      var p = a.play();
      if (p && p.catch) p.catch(function () { clearTimeout(safety); fin(); });
    } catch (e) { clearTimeout(safety); fin(); }
    if (job.opts.onStart) job.opts.onStart();
  });
}
/* 读一个单词（先读词再读整句的老规矩还在：词卡没了，词在对话栏里单独亮出来） */
function sayWord(wordId) {
  var w = WORDS[wordId];
  return playClip(w.clip, { text: w.en + '!', words: [w.en], kara: true,
    onStart: function () { jumpChar('princess', 0.25); },
    onWord: function (i) { lightWord(i); } });
}

/* ---------------- 对话（DOM） ---------------- */
function setDialogue(speakerId, name, segments) {
  var avatar = $('avatar');
  avatar.src = speakerId === 'princess' ? 'assets/princess.png' : 'assets/princess.png';
  $('dlg-name').textContent = name;
  var html = segments.map(function (s) {
    return s.key ? "<span class='key'>" + esc(s.t) + '</span>' : esc(s.t);
  }).join('');
  $('dlg-text').innerHTML = html;
}
function esc(s) { return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
function setStatus(t) { $('status').textContent = t; }
/* 屏幕中央大提示条（“下一题 ▶”“声音开啦 🔊”），几秒后自动消失 */
var toastTimer = null;
function showToast(text, ms) {
  var el = $('toast');
  if (!el) return;
  el.textContent = text;
  el.classList.add('show');
  if (toastTimer) clearTimeout(toastTimer);
  toastTimer = setTimeout(function () { el.classList.remove('show'); }, ms || 1500);
}
function parseSegments(textHtml) {
  var segments = [];
  var re = /<span class='key'>(.*?)<\/span>/g, last = 0, m;
  while ((m = re.exec(textHtml)) !== null) {
    if (m.index > last) segments.push({ t: textHtml.slice(last, m.index), key: false });
    segments.push({ t: m[1], key: true });
    last = m.index + m[0].length;
  }
  if (last < textHtml.length) segments.push({ t: textHtml.slice(last), key: false });
  if (segments.length === 0) segments.push({ t: textHtml, key: false });
  return segments;
}
/* v21：跟读式对话——台词按词逐个亮，正在读的词变紫；公主在声音开始那一刻才跳 */
function setDialogueKaraoke(speakerId, name, words) {
  var avatar = $('avatar');
  avatar.src = 'assets/princess.png';
  $('dlg-name').textContent = name || '彩虹公主';
  var el = $('dlg-text');
  el.innerHTML = words.map(function (w, i) {
    return '<span class="w" data-i="' + i + '">' + esc(w) + '</span>';
  }).join(' ');
}
function lightWord(i) {
  var el = $('dlg-text');
  var spans = el.querySelectorAll('.w');
  spans.forEach(function (sp, j) {
    sp.classList.toggle('lit', j === i);
    sp.classList.toggle('done', j < i);
  });
}
function setHint(t) { $('dlg-hint').textContent = t || ''; }
/* 说一句台词：opts {speaker, name, text, hint, round, onWord(i, word)} */
async function sayClip(key, opts) {
  opts = opts || {};
  var text = opts.text || clipText(key, opts.round) || '';
  var words = text.split(/\s+/).filter(Boolean);
  var speaker = opts.speaker || 'princess';
  var name = opts.name || (speaker === 'princess' ? '彩虹公主' : CHARS[speaker].zh);
  setDialogueKaraoke(speaker, name, words);
  if (opts.hint !== undefined) setHint(opts.hint);
  var charId = (speaker === 'princess' || !G.chars[speaker]) ? 'princess' : speaker;
  await playClip(key, {
    text: text, words: words, kara: true, name: name,
    onStart: function () { jumpChar(charId, 0.25); },
    onWord: function (i) {
      lightWord(i);
      if (opts.onWord) opts.onWord(i, words[i]);
    }
  });
  await sleep(120);
}
/* 小跳：tween 列表驱动 */
function jumpChar(id, h) {
  var g = G.chars[id];
  var base = g.position.y;
  G.tweens.push({ t: 0, dur: 0.55, fn: function (k) {
    g.position.y = base + Math.sin(k * Math.PI) * (h || 0.6);
  }, done: function () { g.position.y = base; } });
}
function princessWave() {
  var g = G.chars.princess;
  var u = g.userData;
  G.tweens.push({ t: 0, dur: 0.9, fn: function (k) {
    if (u.arms) u.arms.R.rotation.x = -Math.sin(k * Math.PI * 3) * 0.9;
  }, done: function () { if (u.arms) u.arms.R.rotation.x = 0; } });
}
G.tweens = [];

/* ---------------- 位置摆放 ---------------- */
/* v21：恢复被放大的篮子/盒子（见 placeAnimalFinal 的 in 放大） */
function restoreSpotScale() {
  Object.keys(G.spotMeshes).forEach(function (id) {
    var sg = G.spotMeshes[id];
    if (sg && (sg.userData._v21scaled || sg.userData._v20scaled)) { sg.scale.setScalar(1); sg.userData._v21scaled = false; sg.userData._v20scaled = false; }
  });
}
function clearPlacement(animalId) {
  var g = G.chars[animalId];
  if (!g) return;
  g.userData.yOff = 0;
  g.userData.placed = null;
  setCharPos(animalId, g.position.x, g.position.z, 0);
  restoreSpotScale();
}
function homeAnimal(animalId) {
  clearPlacement(animalId);
  var h = HOME_POS[animalId];
  return moveTo(animalId, px(h.x), pz(h.y), 7);
}
function spreadAnimalsAwayFrom(spot) {
  var sx = G.spots[spot.id].x, sz = G.spots[spot.id].z;
  CHAR_IDS.forEach(function (id) {
    if (G.curRound && G.curRound.animal === id) return;
    var p = charPos(id);
    if (Math.hypot(p.x - sx, p.z - sz) < 12) {
      var pt = wanderPoint(id);
      moveTo(id, pt.x, pt.z, 7);
    }
  });
}

/* ---------------- 动物漫步 ---------------- */
function wanderPoint(id) {
  if (id === 'bird') {
    var a = Math.random() * Math.PI * 2, k = 1.2 + Math.random() * 0.4;
    return { x: Math.cos(a) * 12 * k, z: Math.sin(a) * 9.6 * k };
  }
  var z = WANDER_ZONES[id] || { x0: 10, x1: 90, y0: 10, y1: 90 };
  return { x: px(z.x0 + Math.random() * (z.x1 - z.x0)), z: pz(z.y0 + Math.random() * (z.y1 - z.y0)) };
}
function startWander(id) {
  if (G.wanderTimers[id]) return;
  function loop() {
    if (!G.wanderOn) { G.wanderTimers[id] = setTimeout(loop, 1200); return; }
    if (G.phase === 'story' || G.phase === 'waiting' || G.phase === 'celebrating') {
      G.wanderTimers[id] = setTimeout(loop, 1500); return;
    }
    if (G.curRound && G.curRound.animal === id) { G.wanderTimers[id] = setTimeout(loop, 1500); return; }
    var pt = wanderPoint(id);
    clearPlacement(id);
    moveTo(id, pt.x, pt.z, 3 + Math.random() * 1.5).then(function () {
      G.wanderTimers[id] = setTimeout(loop, 1800 + Math.random() * 3200);
    });
  }
  G.wanderTimers[id] = setTimeout(loop, 800 + Math.random() * 2000);
}
function stopWander(id) {
  if (G.wanderTimers[id]) { clearTimeout(G.wanderTimers[id]); delete G.wanderTimers[id]; }
  stopMoving(id);
}
function startAllWander() { CHAR_IDS.forEach(function (id) { startWander(id); }); }
function stopAllWander() { CHAR_IDS.forEach(function (id) { stopWander(id); }); }

/* ---------------- 相机 ---------------- */
function setCamFocus(x, y, z) {
  G.camMode = 'fixed';
  G.camTarget.x = x; G.camTarget.y = y; G.camTarget.z = z;
}
/* 3D 点 → 屏幕像素坐标（供点按判、测试用） */
function projectToClient(x, y, z) {
  G.camera.updateMatrixWorld();
  var v = new THREE.Vector3(x, y, z).project(G.camera);
  var rect = G.renderer.domElement.getBoundingClientRect();
  return { x: rect.left + (v.x + 1) / 2 * rect.width, y: rect.top + (1 - v.y) / 2 * rect.height, behind: v.z > 1 };
}
function followPrincess() {
  G.camMode = 'follow';
  G.followId = 'princess';
}
function updateCamTarget() {
  if (G.camMode === 'follow' && G.followId && G.chars[G.followId]) {
    var p = charPos(G.followId);
    G.camTarget.x = p.x; G.camTarget.y = 1.5; G.camTarget.z = p.z;
  }
}
function updateCamera(dt) {
  var k = 1 - Math.exp(-2.8 * dt);
  G.camFocus.x += (G.camTarget.x - G.camFocus.x) * k;
  G.camFocus.y += (G.camTarget.y - G.camFocus.y) * k;
  G.camFocus.z += (G.camTarget.z - G.camFocus.z) * k;
  var des = { x: G.camFocus.x + G.camOffset.x, y: G.camFocus.y + G.camOffset.y, z: G.camFocus.z + G.camOffset.z };
  G.camera.position.x += (des.x - G.camera.position.x) * k;
  G.camera.position.y += (des.y - G.camera.position.y) * k;
  G.camera.position.z += (des.z - G.camera.position.z) * k;
  G.camera.lookAt(G.camFocus.x, G.camFocus.y, G.camFocus.z);
}

/* ---------------- 回合：故事，不是考试 ----------------
   每回合固定时间线：镜头滑过去 → 公主走过去打招呼 → 邀请玩游戏 → 读一遍词
   → 动物藏好 / 请孩子帮忙 → 公主数数、问一句 → 孩子找一找 / 帮一帮
   → 发现句（找到的欢呼）→ 表扬 + 星星同时到 → 下一回合。
   全程没有选择卡、没有顶栏词条、没有“考一考”。 */
function buildRounds(wordId) {
  var plan = ROUND_PLANS[wordId] || ROUND_PLANS.behind;
  return shuffle(plan.map(function (p, i) {
    return { word: wordId, animal: p.animal, spot: p.spot, type: p.type, idx: i };
  }));
}
/* v21：镜头永远是滑过去的（updateCamera 的缓动约 1 秒到位），不瞬移、不硬切 */
function glideCameraTo(x, y, z) {
  G.camMode = 'fixed';
  G.camTarget.x = x; G.camTarget.y = y; G.camTarget.z = z;
}
/* v21：等孩子动手的时候，镜头要把三个人都框进来——公主、动物、目标地点
   的中心点，而不是只盯着地点。竖屏手机横向视野只有约 27°，只盯地点会把
   站在两边的公主 / 动物切出画面（实测：公主半个身子出框、马半个身子出框）。 */
function frameWaiting(r) {
  var pp = charPos('princess');
  var ap = charPos(r.animal);
  var sp = G.spots[r.spot];
  var cx = (pp.x + ap.x + sp.x) / 3;
  var cz = (pp.z + ap.z + sp.z) / 3;
  glideCameraTo(cx, 1.5, cz);
}
/* 目标光圈：回合里唯一发光的东西，轻轻呼吸，告诉孩子“点这里” */
function showTargetGlow(spotId) {
  hideTargetGlow();
  var sp = G.spots[spotId];
  var ring = new THREE.Mesh(new THREE.TorusGeometry(1.6, 0.14, 10, 32),
    new THREE.MeshBasicMaterial({ color: 0xffb703, transparent: true, opacity: 0.9 }));
  ring.rotation.x = -Math.PI / 2;
  ring.position.set(sp.x, terrainH(sp.x, sp.z) + 0.15, sp.z);
  G.scene.add(ring);
  G.targetGlow = ring;
  G.targetSpot = spotId;
}
function hideTargetGlow() {
  if (G.targetGlow) { G.scene.remove(G.targetGlow); G.targetGlow = null; G.targetSpot = null; }
}
/* 读到动物名 / 地点词时，对应的 3D 东西轻轻弹一下（和声音同步） */
function pulseObject(g, s) {
  if (!g) return;
  var s0 = g.scale.x;
  G.tweens.push({ t: 0, dur: 0.45, fn: function (k) {
    g.scale.setScalar(s0 * (1 + Math.sin(k * Math.PI) * (s || 0.12)));
  }, done: function () { g.scale.setScalar(s0); } });
}
/* 藏好的小动物探头探脑：左右轻轻晃，耳朵/尾巴露在外面，孩子找得到 */
function startPeek(id) {
  G.peekId = id;
  var g = G.chars[id];
  var baseX = g.position.x;
  (function wig() {
    if (G.peekId !== id || !g.parent) return;
    G.tweens.push({ t: 0, dur: 1.6, fn: function (k) {
      g.position.x = baseX + Math.sin(k * Math.PI * 2) * 0.18;
    }, done: function () { g.position.x = baseX; if (G.peekId === id) wig(); } });
  })();
}
function stopPeek() { G.peekId = null; }
/* 跳上 / 跳进高处（石头顶、篮子里）：先跳一下再落稳 */
function hopUp(id, yOff) {
  var g = G.chars[id];
  var y0 = g.position.y;
  var y1 = terrainH(g.position.x, g.position.z) + yOff - (g.userData.groundOff || 0);
  g.userData.yOff = yOff;
  G.tweens.push({ t: 0, dur: 0.45, fn: function (k) {
    g.position.y = y0 + (y1 - y0) * k + Math.sin(k * Math.PI) * 0.5;
  }, done: function () { g.position.y = y1; } });
  return sleep(480);
}
/* 把动物放到“玩好”的位置（藏好 / 爬好 / 躲好）：walkThere=true 就走过去 */
async function placeAnimalFinal(r, walkThere) {
  var sp = G.spots[r.spot];
  var off = wordOffset3D(r.word);
  /* behind：躲到物件后面，但往旁边探出半个身子（耳朵/脑袋露在外面） */
  if (r.word === 'behind') off = { dx: 2.4, dz: -1.0, dy: 0, cls: 'behind' };
  if (r.word === 'under' && r.spot === 'bridge') off = { dx: 0, dz: 0, dy: 0, cls: '' };
  var tx = clamp(sp.x + off.dx, -56, 56), tz = clamp(sp.z + off.dz, -56, 56);
  /* v21：动物跑去藏是“一溜小跑”（速度 15），不是散步——岛很大，慢慢走要 8 秒，
     孩子盯着空地方等不起；跑起来才是捉迷藏的样子。 */
  if (walkThere) await moveTo(r.animal, tx, tz, 15);
  var yOff = 0;
  if (off.cls === 'inbox' && r.spot === 'house') yOff = 0;
  else if (off.cls === 'inbox') {
    yOff = -0.3;
    var sg = G.spotMeshes[r.spot];
    if (sg && (r.spot === 'basket' || r.spot === 'box')) { sg.userData._v21scaled = true; sg.scale.setScalar(1.35); }
  } else if (off.cls === 'on') yOff = (G.spots[r.spot].topY - terrainH(tx, tz)) + 0.05;
  var g = G.chars[r.animal];
  if (walkThere && yOff !== 0) await hopUp(r.animal, yOff);
  else setCharPos(r.animal, tx, tz, yOff);
  g.userData.yOff = yOff;
  g.userData.placed = off.cls;
  g.rotation.y = 0; /* 面向镜头，脸和耳朵都看得见 */
}
async function hideAnimalAtSpot(r) {
  /* 镜头跟着小动物跑（孩子看着它跑去藏，才有意思），到了再滑回藏身点 */
  G.camMode = 'follow'; G.followId = r.animal;
  await placeAnimalFinal(r, true);
  var sp = G.spots[r.spot];
  glideCameraTo(sp.x, 1.5, sp.z);
  jumpChar(r.animal, 0.35);
}
/* 5 秒没动静：公主温柔提示（指一指 + 再问一遍），不判失败、不催 */
function armIdleHint(r, myToken) {
  disarmIdleHint();
  G.idleHints = 0;
  function again() {
    if (G.phase !== 'waiting' || myToken !== G.seqToken) return;
    G.idleHints++;
    princessWave();
    frameWaiting(r);
    sayClip('where-' + r.animal, { speaker: 'princess', round: r, hint: '点一点发光的地方' }).catch(function () {});
    G.idleTimer = setTimeout(again, 6000);
  }
  G.idleTimer = setTimeout(again, 5000);
}
function disarmIdleHint() {
  if (G.idleTimer) { clearTimeout(G.idleTimer); G.idleTimer = null; }
}
function waitRoundDone(r, myToken) {
  return new Promise(function (resolve) {
    G.roundDoneResolve = function () {
      if (myToken !== G.seqToken) { resolve(false); return; }
      resolve(true);
    };
  });
}
function resolveRoundDone() {
  if (G.roundDoneResolve) { var f = G.roundDoneResolve; G.roundDoneResolve = null; f(); }
}
/* 飞星星：从点的那个地方飞向顶栏（0.85 秒到，到了星星才亮） */
function flyStar(fromX, fromY) {
  var el = $('flystar');
  var sr = $('stars').getBoundingClientRect();
  var tx = sr.left + sr.width / 2, ty = sr.top + sr.height / 2;
  el.style.display = 'block';
  el.style.transition = 'none';
  el.style.left = (fromX - 20) + 'px';
  el.style.top = (fromY - 20) + 'px';
  el.style.transform = 'translate(0,0) scale(1) rotate(0deg)';
  el.style.opacity = '1';
  requestAnimationFrame(function () {
    requestAnimationFrame(function () {
      el.style.transition = 'left .8s cubic-bezier(.3,.7,.4,1), top .8s cubic-bezier(.3,.7,.4,1), transform .8s, opacity .8s';
      el.style.left = (tx - 20) + 'px';
      el.style.top = (ty - 20) + 'px';
      el.style.transform = 'scale(.55) rotate(200deg)';
    });
  });
  setTimeout(function () {
    el.style.display = 'none';
    renderStars(); /* 星星在飞到时亮起来 */
  }, 850);
}
/* 找到 / 放好了：星星跟表扬同时到，发现句是找到的欢呼 */
async function completeRound(r, tapX, tapY) {
  stopPeek();
  hideTargetGlow();
  disarmIdleHint();
  jumpChar(r.animal, 0.9);
  princessWave();
  confetti(G.spots[r.spot].x, G.spots[r.spot].z);
  flyStar(tapX, tapY);
  G.stars++;
  /* 表扬现在就响（不排在发现句后面）；星星在飞到时亮 */
  playClip('praise', { text: 'Great job!', words: ['Great', 'job!'], kara: true, name: '彩虹公主',
    onStart: function () { jumpChar('princess', 0.3); },
    onWord: function (i) { lightWord(i); } });
  /* place 回合：动物刚放好，轮到它说行动台词 */
  if (r.type === 'place') {
    await sleep(500);
    await sayClip(actionKey(r), { speaker: r.animal, round: r });
  }
  /* 发现句：字逐词亮，动物名响时动物弹一下、地点词响时地点弹一下 */
  await sayClip(discKey(r), { speaker: 'princess', round: r,
    hint: CHARS[r.animal].zh + '在' + SPOTS[r.spot].zh + WORDS[r.word].zh,
    onWord: function (i, w) {
      var clean = (w || '').toLowerCase().replace(/[^a-z]/g, '');
      if (clean === CHARS[r.animal].en) pulseObject(G.chars[r.animal], 0.15);
      if (clean === SPOTS[r.spot].en) pulseObject(G.spotMeshes[r.spot], 0.1);
    } });
  await sayClip('yay', { speaker: 'princess', round: r, hint: '' });
  resolveRoundDone();
}
async function startGame() {
  G.rounds = buildRounds(G.selWord);
  G.roundIdx = 0;
  G.stars = 0;
  G.phase = 'story';
  G.wanderOn = true;
  startAllWander();
  renderStars();
  var myToken = ++G.seqToken;
  /* 开场：公主挥手打招呼，然后直接开始第一回合（没有选词、没有介绍卡） */
  followPrincess();
  var pp = charPos('princess');
  glideCameraTo(pp.x, 1.5, pp.z);
  princessWave();
  await sayClip('intro', { speaker: 'princess', round: null, hint: '彩虹公主来啦！' });
  for (G.roundIdx = 0; G.roundIdx < G.rounds.length; G.roundIdx++) {
    if (myToken !== G.seqToken) return;
    var done = await startRound(myToken);
    if (!done) return; /* 被家长设置打断 */
  }
  if (myToken !== G.seqToken) return;
  showFinish();
}
async function startRound(myToken) {
  var r = G.rounds[G.roundIdx];
  if (!r) return false;
  r.word = G.selWord;
  G.curRound = r;
  G.wrongCount = 0;
  G.phase = 'story';
  var ch = CHARS[r.animal];
  var spot = SPOTS[r.spot];
  var sp = G.spots[r.spot];
  stopWander(r.animal);
  spreadAnimalsAwayFrom(spot);
  /* 雨只在 under 躲雨回合下 */
  if (G.rain) G.rain.visible = (r.word === 'under');
  /* 镜头滑到这回合的地方；公主走过去找小动物（真的走过去，腿会动，速度 14） */
  glideCameraTo(sp.x, 1.5, sp.z);
  var ap = charPos(r.animal);
  await moveTo('princess', clamp(ap.x + 2.2, -56, 56), clamp(ap.z + 2.5, -56, 56), 14);
  if (myToken !== G.seqToken) return false;
  /* 打招呼 + 邀请玩这个游戏 */
  await sayClip('greet-' + r.animal, { speaker: 'princess', round: r, hint: ch.zh + '来啦！' });
  if (myToken !== G.seqToken) return false;
  jumpChar(r.animal, 0.4);
  await sayClip('invite-' + r.word, { speaker: 'princess', round: r });
  if (myToken !== G.seqToken) return false;
  /* 先读一遍这个词（词在对话栏里单独亮出来） */
  setDialogueKaraoke('princess', '彩虹公主', [WORDS[r.word].en]);
  setHint('今晚玩：' + WORDS[r.word].en + ' · ' + WORDS[r.word].zh);
  await sayWord(r.word);
  if (myToken !== G.seqToken) return false;
  if (r.type === 'find') await runFindRound(r, myToken);
  else await runPlaceRound(r, myToken);
  if (myToken !== G.seqToken) return false;
  /* 回合结束：动物直接回家（不慢慢走回去），下一回合 */
  stopPeek();
  hideTargetGlow();
  restoreSpotScale();
  stopMoving(r.animal);
  clearPlacement(r.animal);
  var h = HOME_POS[r.animal];
  setCharPos(r.animal, px(h.x), pz(h.y), 0);
  startWander(r.animal);
  return true;
}
async function runFindRound(r, myToken) {
  var ch = CHARS[r.animal];
  var spot = SPOTS[r.spot];
  var sp = G.spots[r.spot];
  /* 公主也走到藏身点附近（等孩子找的时候她要在画面里，才能挥手指）——
     和动物同时出发，不等她，边走边说，这样等孩子找的时候她已经到了。 */
  var pc = pondClamp(clamp(sp.x - 1.5, -56, 56), clamp(sp.z + 5, -56, 56));
  moveTo('princess', pc.x, pc.z, 15).catch(function () {});
  /* 动物跑去藏好（真的跑过去），藏的时候永远露出来一点 */
  stopMoving(r.animal);
  clearPlacement(r.animal);
  await hideAnimalAtSpot(r);
  if (myToken !== G.seqToken) return;
  /* 动物说自己藏好了 */
  await sayClip(actionKey(r), { speaker: r.animal, round: r, hint: ch.zh + '藏好啦！' });
  if (myToken !== G.seqToken) return;
  /* 公主数数、问一句 */
  await sayClip('count', { speaker: 'princess', round: r });
  if (myToken !== G.seqToken) return;
  await sayClip('where-' + r.animal, { speaker: 'princess', round: r, hint: '点一点' + ch.zh + '藏的地方' });
  if (myToken !== G.seqToken) return;
  /* 等孩子找：目标地点轻轻发光（同一时刻只有这一个东西在亮） */
  G.phase = 'waiting';
  frameWaiting(r);
  showTargetGlow(r.spot);
  startPeek(r.animal);
  setStatus('点一点：' + ch.zh + '藏在哪里？');
  armIdleHint(r, myToken);
  await waitRoundDone(r, myToken);
}
async function runPlaceRound(r, myToken) {
  var ch = CHARS[r.animal];
  var spot = SPOTS[r.spot];
  var sp = G.spots[r.spot];
  /* 小动物先站在公主身边（startRound 里已经见过面了） */
  stopMoving(r.animal);
  clearPlacement(r.animal);
  var pp = charPos('princess');
  setCharPos(r.animal, clamp(pp.x + 2.2, -56, 56), clamp(pp.z + 2.0, -56, 56), 0);
  G.chars[r.animal].rotation.y = 0;
  jumpChar(r.animal, 0.4);
  /* v21：先把小动物带到目的地附近（孩子看得见它，也看得见发光的地方）——
     不然公主和动物都留在动物的老家，镜头在目的地这边，孩子根本看不到要拖的动物。
     镜头跟着动物跑过去，公主也走过来（不等她，边走边说）。 */
  var pc = pondClamp(clamp(sp.x + 1.5, -56, 56), clamp(sp.z + 5, -56, 56));
  var pc2 = pondClamp(clamp(sp.x - 1.5, -56, 56), clamp(sp.z + 5, -56, 56));
  /* 公主也走过来（和动物同时出发，不等她，边走边说） */
  moveTo('princess', pc2.x, pc2.z, 15).catch(function () {});
  G.camMode = 'follow'; G.followId = r.animal;
  await moveTo(r.animal, pc.x, pc.z, 12);
  if (myToken !== G.seqToken) return;
  G.chars[r.animal].rotation.y = 0;
  glideCameraTo(sp.x, 1.5, sp.z);
  /* 公主请孩子帮忙 */
  await sayClip('helpme', { speaker: 'princess', round: r, hint: '帮帮' + ch.zh + '吧！' });
  if (myToken !== G.seqToken) return;
  await sayClip('where-' + r.animal, { speaker: 'princess', round: r, hint: '把' + ch.zh + '送到发光的地方' });
  if (myToken !== G.seqToken) return;
  /* 等孩子帮忙：目的地轻轻发光（同一时刻只有这一个东西在亮） */
  G.phase = 'waiting';
  frameWaiting(r);
  showTargetGlow(r.spot);
  setStatus('帮' + ch.zh + '去发光的地方吧！');
  armIdleHint(r, myToken);
  await waitRoundDone(r, myToken);
}

/* ---------------- 点按 / 拖拽的回应 v21 ----------------
   等孩子找 / 帮的时候：点目标（或附近 110px 内）= 成功；点别处 = 温柔再试一次。
   拖：按住动物拖，跟着手指走，松手在发光处附近 = 放好；否则滑回原位。
   讲故事的时候点东西：只轻轻晃一下（回应一下），不打断台词。 */
function screenDistTo(objPos3D, ev) {
  var p = projectToClient(objPos3D.x, objPos3D.y, objPos3D.z);
  if (p.behind) return 1e9;
  return Math.hypot(ev.clientX - p.x, ev.clientY - p.y);
}
/* 目标在屏幕上的位置（地点上空 1.2 米处） */
function targetScreenPoint(r) {
  var sp = G.spots[r.spot];
  return { x: sp.x, y: terrainH(sp.x, sp.z) + 1.2, z: sp.z };
}
function wiggleChar(id) {
  var g = G.chars[id];
  if (!g) return;
  var base = g.position.x;
  G.tweens.push({ t: 0, dur: 0.4, fn: function (k) {
    g.position.x = base + Math.sin(k * Math.PI * 2) * 0.12;
  }, done: function () { g.position.x = base; } });
}
/* 点到 / 拖到了目标：ding 立刻响；place 回合动物先走过去，到了再庆祝 */
async function onFoundTap(r, ev) {
  if (G.phase !== 'waiting') return;
  G.phase = 'celebrating';
  ding();
  stopAudioNow();
  if (r.type === 'place') {
    await placeAnimalFinal(r, true);
    jumpChar(r.animal, 0.4);
  }
  await completeRound(r, ev.clientX, ev.clientY);
}
/* 点错了：动物轻轻摇摇头，公主温柔说“再试一次”，动物永远在原地，不会消失 */
async function wrongPick(r) {
  if (G._tryagainBusy) return;
  G._tryagainBusy = true;
  try {
    G.wrongCount++;
    var g = G.chars[r.animal];
    var baseX = g.position.x;
    G.tweens.push({ t: 0, dur: 0.5, fn: function (k) {
      g.position.x = baseX + Math.sin(k * Math.PI * 4) * 0.15 * (1 - k);
    }, done: function () { g.position.x = baseX; } });
    setDialogue('princess', '彩虹公主', [{ t: '不是这里哦，再试一次！', key: false }]);
    setStatus('不是这里哦，再试一次！');
    await playClip('tryagain', { text: 'Try again!', words: ['Try', 'again!'], kara: true, name: '彩虹公主',
      onWord: function (i) { lightWord(i); } });
  } finally {
    G._tryagainBusy = false;
  }
}
/* v21：“?” 给真提示——金色光圈圈住目标 + 镜头滑过去 + 公主指过去 + 再问一遍 */
async function doHint() {
  if (!G.curRound || G.phase !== 'waiting') return;
  var r = G.curRound;
  var spot = SPOTS[r.spot];
  var sp = G.spots[r.spot];
  if (G.hintRing) { G.scene.remove(G.hintRing); G.hintRing = null; }
  var ring = new THREE.Mesh(new THREE.TorusGeometry(1.8, 0.18, 10, 32), mat(0xffb703, { transparent: true }));
  ring.rotation.x = 0; /* 提示圈立起来（平铺的圈低镜头下看不见） */
  ring.position.set(sp.x, terrainH(sp.x, sp.z) + 1.0, sp.z);
  G.scene.add(ring);
  G.hintRing = ring;
  G.tweens.push({ t: 0, dur: 2.2, fn: function (k) {
    var s = 1 + Math.sin(k * Math.PI * 3) * 0.18;
    ring.scale.set(s, s, s);
    ring.material.opacity = 1 - k * 0.5;
  }, done: function () { G.scene.remove(ring); if (G.hintRing === ring) G.hintRing = null; } });
  frameWaiting(r);
  princessWave();
  setDialogue('princess', '彩虹公主', [{ t: '看这里！', key: false }]);
  setStatus('提示：' + CHARS[r.animal].zh + '在' + spot.zh + WORDS[r.word].zh);
  await sayClip('where-' + r.animal, { speaker: 'princess', round: r, hint: CHARS[r.animal].zh + '在' + spot.zh + WORDS[r.word].zh });
}
function confetti(x, z) {
  var y = terrainH(x, z) + 3;
  var colors = [0xf59e0b, 0xec4899, 0x22c55e, 0x3b82f6, 0x8b5cf6, 0xef4444];
  for (var i = 0; i < 36; i++) {
    var m = box(0.22, 0.3, 0.05, colors[i % colors.length], x, y, z);
    m.rotation.set(Math.random() * 3, Math.random() * 3, 0);
    G.scene.add(m);
    var ang = Math.random() * Math.PI * 2, dist = 1 + Math.random() * 3;
    G.confettiBits.push({ mesh: m, vx: Math.cos(ang) * dist, vy: 2 + Math.random() * 3, vz: Math.sin(ang) * dist, life: 1.4 + Math.random() * 0.5 });
  }
}
function showFinish() {
  G.phase = 'idle';
  G.seqToken++;
  stopAllWander();
  if (G.rain) G.rain.visible = false;
  sayClip('finish', { speaker: 'princess', round: null, hint: '今天玩得真棒！' });
  var total = G.rounds.length;
  $('finish-stars').textContent = '★'.repeat(Math.max(1, G.stars)) + '☆'.repeat(Math.max(0, total - G.stars));
  $('finish-summary').textContent = '今天玩了：' + WORDS[G.selWord].en + ' · ' + WORDS[G.selWord].zh + ' · 得了 ' + G.stars + ' 颗星';
  $('finish-mission').textContent = '★ 回家小任务：' + (MISSIONS[G.selWord] || '');
  showOverlay('finish');
}
function getState() {
  return {
    phase: G.phase, roundIdx: G.roundIdx, roundsTotal: G.rounds.length,
    stars: G.stars, selWord: G.selWord, wrongCount: G.wrongCount, idleHints: G.idleHints,
    curRound: G.curRound ? { word: G.curRound.word, animal: G.curRound.animal,
      spot: G.curRound.spot, type: G.curRound.type } : null,
    lastSpoken: G.lastSpoken.slice(-6),
    audioLog: G.audioLog.slice(-12),
    chars: Object.keys(G.chars).map(function (id) {
      var g = G.chars[id];
      return { id: id, x: +g.position.x.toFixed(2), z: +g.position.z.toFixed(2),
        moving: !!g.userData.moving, phase: +g.userData.phase.toFixed(2) };
    })
  };
}

/* v21：选择卡和缩略图都取消了（不再做题），小地图也早已去掉。 */

/* ---------------- DOM 界面 ---------------- */
function renderStars() {
  var total = G.rounds.length || 4;
  var html = '';
  for (var i = 0; i < total; i++) html += '<span class="' + (i < G.stars ? 'on' : '') + '">★</span>';
  $('stars').innerHTML = html;
}
function renderWordChip() { /* v21：顶栏词条已取消（孩子看不到词，词只在家长设置里） */ }
function showOverlay(name) {
  /* v21：只剩开声音 / 家长设置 / 完成页三个遮罩 */
  ['ov-unlock', 'ov-setup', 'ov-finish'].forEach(function (id) {
    var el = $(id);
    if (el) el.classList.toggle('show', id === 'ov-' + name);
  });
}
function buildSetupGrid() {
  var grid = $('wordgrid');
  grid.innerHTML = '';
  WORD_ORDER.forEach(function (wid) {
    var w = WORDS[wid];
    var cell = document.createElement('div');
    cell.className = 'wordcell' + (G.selWord === wid ? ' sel' : '');
    var en = document.createElement('div');
    en.className = 'en'; en.textContent = w.en; en.style.background = w.color;
    var zh = document.createElement('div');
    zh.className = 'zh'; zh.textContent = w.zh;
    cell.appendChild(en); cell.appendChild(zh);
    cell.addEventListener('click', function () {
      /* v21：今晚只练一个词，点哪个就练哪个 */
      G.selWord = wid;
      buildSetupGrid();
    });
    grid.appendChild(cell);
  });
}
function backToSetup() {
  G.seqToken++;
  stopAudioNow();
  hideTargetGlow();
  disarmIdleHint();
  if (G.rain) G.rain.visible = false;
  stopAllWander();
  G.phase = 'idle';
  buildSetupGrid();
  showOverlay('setup');
}
function cycleMode() {
  G.modeIdx = (G.modeIdx + 1) % G.MODES.length;
  var m = G.MODES[G.modeIdx];
  var btn = $('mode-btn');
  /* v20：换模式时天空穹顶、云、太阳光晕、曝光一起换——天黑了天上也跟着黑 */
  if (m === 'day') {
    G.scene.background.set(0x9fd8ff); G.scene.fog.color.set(0xbfe3ff);
    G.hemi.intensity = 1.15; G.sun.intensity = 2.2; G.sun.color.set(0xfff1c4);
    G.stars3d.forEach(function (s) { s.visible = false; });
    if (G.skyDome) G.skyDome.material.color.set(0xffffff);
    if (G.sunSprite) { G.sunSprite.visible = true; G.sunSprite.material.color.set(0xfff3b0); }
    G.cloudMats.forEach(function (cm) { cm.color.set(0xffffff); });
    G.renderer.toneMappingExposure = 1.15;
    btn.textContent = '☀';
  } else if (m === 'sunset') {
    G.scene.background.set(0xffc98a); G.scene.fog.color.set(0xffc98a);
    G.hemi.intensity = 0.9; G.sun.intensity = 1.6; G.sun.color.set(0xff8c3c);
    G.stars3d.forEach(function (s) { s.visible = false; });
    if (G.skyDome) G.skyDome.material.color.set(0xffbe8a);
    if (G.sunSprite) { G.sunSprite.visible = true; G.sunSprite.material.color.set(0xffa050); }
    G.cloudMats.forEach(function (cm) { cm.color.set(0xffd9b0); });
    G.renderer.toneMappingExposure = 1.05;
    btn.textContent = '◑';
  } else {
    G.scene.background.set(0x0b1030); G.scene.fog.color.set(0x0b1030);
    G.hemi.intensity = 0.5; G.sun.intensity = 0.6; G.sun.color.set(0x9db4ff);
    G.stars3d.forEach(function (s) { s.visible = true; });
    if (G.skyDome) G.skyDome.material.color.set(0x33407a);
    if (G.sunSprite) G.sunSprite.visible = false;
    G.cloudMats.forEach(function (cm) { cm.color.set(0x5a6a9a); });
    G.renderer.toneMappingExposure = 0.9;
    btn.textContent = '☾';
  }
}
function buildUI() {
  buildSetupGrid();
  renderStars();
  $('unlock-btn').addEventListener('click', function () {
    G.audioUnlocked = true;
    /* v21：点一下立刻听得见、看得见——马上播一声表扬音效（预录音），按钮变成“声音开啦”，
       家长设置页里也出现绿色提示；同时把今晚要用的录音都预热解码好。 */
    var btn = $('unlock-btn');
    btn.textContent = '声音开啦 🔊';
    btn.disabled = true;
    ensureAudioCtx();
    playClip('praise', { text: 'Great job!', words: ['Great', 'job!'], kara: true, name: '彩虹公主',
      onWord: function (i) { lightWord(i); } });
    preloadClips(G.selWord);
    showToast('声音开啦 🔊', 1800);
    var note = $('sound-note');
    if (note) note.style.display = 'block';
    setDialogue('princess', '彩虹公主', [{ t: '你好呀！我是彩虹公主，欢迎来到彩虹小岛！', key: false }]);
    buildSetupGrid();
    showOverlay('setup');
  });
  /* v21：点“今晚就练这个词”直接进游戏——打开就是小岛，没有选词屏、没有介绍卡 */
  $('start-btn').addEventListener('click', function () {
    showOverlay(null);
    startGame();
  });
  $('setup-close-btn').addEventListener('click', function () {
    showOverlay(null);
    if (G.audioUnlocked) startGame();
  });
  $('again-btn').addEventListener('click', function () {
    showOverlay(null);
    G.seqToken++;
    stopAudioNow();
    hideTargetGlow();
    disarmIdleHint();
    CHAR_IDS.forEach(function (id) {
      clearPlacement(id);
      var h = HOME_POS[id];
      setCharPos(id, px(h.x), pz(h.y), 0);
    });
    setCharPos('princess', px(50), pz(66), 0);
    setCamFocus(px(50), 1.5, pz(66));
    startGame();
  });
  $('parent2-btn').addEventListener('click', function () {
    G.seqToken++;
    stopAudioNow();
    hideTargetGlow();
    disarmIdleHint();
    buildSetupGrid();
    showOverlay('setup');
  });
  /* ♪：再听一遍当前这句（排队，不叠加） */
  $('speak-btn').addEventListener('click', function () {
    if (!G.lastClipKey || !G.lastClipText) return;
    var words = G.lastClipText.split(/\s+/).filter(Boolean);
    setDialogueKaraoke('princess', G.lastClipName || '彩虹公主', words);
    playClip(G.lastClipKey, { text: G.lastClipText, words: words, kara: true,
      onWord: function (i) { lightWord(i); } });
  });
  $('hint-btn').addEventListener('click', function () { doHint(); });
  $('mode-btn').addEventListener('click', cycleMode);
  /* v21：家长设置是“按住角落的 ⚙ 3 秒”——孩子误点一下打不开 */
  var parentTimer = null;
  var parentBtn = $('parent-btn');
  parentBtn.addEventListener('pointerdown', function () {
    parentBtn.style.background = '#ffe1a8';
    parentTimer = setTimeout(function () { parentBtn.style.background = '#fff'; backToSetup(); }, 3000);
  });
  ['pointerup', 'pointerleave', 'pointercancel'].forEach(function (ev) {
    parentBtn.addEventListener(ev, function () {
      parentBtn.style.background = '#fff';
      if (parentTimer) { clearTimeout(parentTimer); parentTimer = null; }
    });
  });
  bindWorldInput();
}

/* ---------------- 世界点按 / 拖拽（射线） ---------------- */
function canvasPoint(ev) {
  var rect = G.renderer.domElement.getBoundingClientRect();
  return { x: ((ev.clientX - rect.left) / rect.width) * 2 - 1,
           y: -((ev.clientY - rect.top) / rect.height) * 2 + 1 };
}
function pickAt(ev) {
  var p = canvasPoint(ev);
  G.pointer.set(p.x, p.y);
  G.raycaster.setFromCamera(G.pointer, G.camera);
  var targets = [];
  G.circles.forEach(function (c) { targets.push(c.hit); });
  Object.keys(G.chars).forEach(function (id) { targets.push(G.chars[id]); });
  Object.keys(G.spotMeshes).forEach(function (id) { targets.push(G.spotMeshes[id]); });
  targets.push(G.terrain);
  var hits = G.raycaster.intersectObjects(targets, true);
  for (var i = 0; i < hits.length; i++) {
    var o = hits[i].object, point = hits[i].point;
    var cur = o;
    while (cur) {
      if (cur.userData && cur.userData.ringId) return { kind: 'ring', wid: cur.userData.ringId, point: point };
      if (cur.userData && cur.userData.charId) return { kind: 'char', id: cur.userData.charId, point: point };
      if (cur.userData && cur.userData.spotId) return { kind: 'spot', id: cur.userData.spotId, point: point };
      cur = cur.parent;
    }
    if (o === G.terrain || o.name === 'terrain') return { kind: 'ground', point: point };
  }
  return null;
}
function groundPoint(ev) {
  var p = canvasPoint(ev);
  G.pointer.set(p.x, p.y);
  G.raycaster.setFromCamera(G.pointer, G.camera);
  var hits = G.raycaster.intersectObject(G.terrain);
  return hits.length ? hits[0].point : null;
}
async function onAnimalTap(id) {
  if (G.phase !== 'idle') { wiggleChar(id); return; }
  stopWander(id);
  stopMoving(id);
  await sayClip('greet-' + id, { speaker: id, round: null, hint: CHARS[id].zh + '来啦！' });
  princessWave();
  startWander(id);
}
function onSpotTap(spotId) {
  var sp = SPOTS[spotId];
  pulseObject(G.spotMeshes[spotId], 0.12);
  if (G.phase === 'idle') {
    setDialogue('princess', '彩虹公主', [{ t: '这是' + sp.zh + '！', key: false }]);
    setStatus('这是' + sp.zh);
  }
}
/* v21：点按改用屏幕坐标判（3D 射线会被房子/大树挡住，屏幕坐标不会：
   目标在画面上看得见，就一定点得到；110px 内都算中，胖手指友好） */
function bindWorldInput() {
  var cv = G.renderer.domElement;
  cv.addEventListener('pointerdown', function (ev) {
    if (document.querySelector('.overlay.show')) return;
    /* 等孩子找 / 帮的时候：先算离目标和离动物多近 */
    if (G.phase === 'waiting' && G.curRound) {
      var r = G.curRound;
      var dTarget = screenDistTo(targetScreenPoint(r), ev);
      var ap = charPos(r.animal);
      var ag = G.chars[r.animal];
      var dAnimal = screenDistTo({ x: ap.x, y: ag.position.y + 1.4, z: ap.z }, ev);
      if (r.type === 'find') {
        if (dTarget <= 110 || dAnimal <= 110) { onFoundTap(r, ev); return; }
        wrongPick(r);
        return;
      }
      /* place 回合：离手指更近的那个说了算——按住动物 = 拖，点发光处 = 动物自己走过去。
         动物就站在发光处旁边（5 米），两个都在 110px 内时必须分清，不然拖永远拖不起来。 */
      if (dAnimal <= 110 && dAnimal <= dTarget) {
        G.dragState = { animal: r.animal, moved: false, startX: ap.x, startZ: ap.z };
        stopMoving(r.animal);
        return;
      }
      if (dTarget <= 110) { onFoundTap(r, ev); return; }
      wrongPick(r);
      return;
    }
    /* 不是等孩子的时候：点动物就打招呼（预录音），点东西就晃一下 */
    var hit = pickAt(ev);
    if (!hit) return;
    if (hit.kind === 'char') { onAnimalTap(hit.id); return; }
    if (hit.kind === 'spot') { onSpotTap(hit.id); return; }
    if (hit.kind === 'ground' && G.phase === 'idle') {
      var p = hit.point;
      walkPrincessTo(clamp(p.x, -56, 56), clamp(p.z, -56, 56), 8);
    }
  });
  cv.addEventListener('pointermove', function (ev) {
    if (!G.dragState) return;
    var pt = groundPoint(ev);
    if (!pt) return;
    var id = G.dragState.animal;
    setCharPos(id, clamp(pt.x, -56, 56), clamp(pt.z, -56, 56), G.chars[id].userData.yOff || 0);
    G.dragState.moved = true;
  });
  cv.addEventListener('pointerup', async function (ev) {
    if (!G.dragState) return;
    var st = G.dragState;
    G.dragState = null;
    if (G.phase !== 'waiting' || !G.curRound) return;
    var r = G.curRound;
    if (!st.moved) {
      /* 只点了一下动物，没拖：当作“送它过去”（点动物就是想让它动） */
      onFoundTap(r, ev);
      return;
    }
    var d = screenDistTo(targetScreenPoint(r), ev);
    if (d <= 110) {
      /* 拖到了：先把动物放到正确位置，再庆祝 */
      ding();
      G.phase = 'celebrating';
      stopAudioNow();
      await placeAnimalFinal(r, false);
      jumpChar(r.animal, 0.4);
      await completeRound(r, ev.clientX, ev.clientY);
    } else {
      /* 没拖到：滑回出发点，温柔再试一次 */
      await moveTo(r.animal, st.startX, st.startZ, 10);
      wrongPick(r);
    }
  });
}

/* ---------------- 主循环 ---------------- */
var clock = null;
function tick() {
  requestAnimationFrame(tick);
  var dt = Math.min(0.1, clock.getDelta());
  var now = performance.now();
  updateMovers(dt);
  Object.keys(G.chars).forEach(function (id) { animateChar(G.chars[id], dt); });
  /* tweens */
  for (var i = G.tweens.length - 1; i >= 0; i--) {
    var tw = G.tweens[i];
    tw.t += dt / tw.dur;
    if (tw.t >= 1) { G.tweens.splice(i, 1); tw.fn(1); if (tw.done) tw.done(); }
    else tw.fn(tw.t);
  }
  /* 彩带 */
  for (var j = G.confettiBits.length - 1; j >= 0; j--) {
    var b = G.confettiBits[j];
    b.life -= dt;
    b.vy -= 9 * dt;
    b.mesh.position.x += b.vx * dt;
    b.mesh.position.y += b.vy * dt;
    b.mesh.position.z += b.vz * dt;
    b.mesh.rotation.x += dt * 5;
    b.mesh.material.opacity = Math.max(0, b.life);
    b.mesh.material.transparent = true;
    if (b.life <= 0 || b.mesh.position.y < terrainH(b.mesh.position.x, b.mesh.position.z)) {
      G.scene.remove(b.mesh);
      G.confettiBits.splice(j, 1);
    }
  }
  /* v21：目标光圈呼吸（同一时刻只有它在亮） */
  if (G.targetGlow) {
    var gs = 1 + Math.sin(now * 0.004) * 0.1;
    G.targetGlow.scale.set(gs, gs, 1);
    G.targetGlow.material.opacity = 0.65 + Math.sin(now * 0.004) * 0.25;
  }
  /* v21：地点小牌子离镜头太近会糊满屏——靠近时淡出（牌子是 3D 精灵，固定 3.4 米宽；
     横屏镜头停在房子南边时，正好贴着桌子 / 盒子的牌子，实测糊了半屏） */
  if (G.labels) {
    for (var li = 0; li < G.labels.length; li++) {
      var lb = G.labels[li];
      var ld = lb.position.distanceTo(G.camera.position);
      lb.material.opacity = Math.max(0, Math.min(1, (ld - 5) / 6));
    }
  }
  /* v21：下雨（只在 under 躲雨回合里） */
  if (G.rain && G.rain.visible) {
    var rp = G.rain.geometry.attributes.position;
    for (var ri2 = 0; ri2 < rp.count; ri2++) {
      var ry = rp.array[ri2 * 3 + 1] - dt * 16;
      if (ry < 0) ry = 20 + Math.random() * 2;
      rp.array[ri2 * 3 + 1] = ry;
    }
    rp.needsUpdate = true;
  }
  /* v21：花瓣飘落 */
  G.petals.forEach(function (pt) {
    var py = pt.sprite.position.y - dt * pt.speed;
    if (py < 0.5) py = pt.y0;
    pt.sprite.position.y = py;
    pt.sprite.position.x = pt.x0 + Math.sin(now * 0.0006 + pt.phase) * 1.2;
    pt.sprite.material.rotation = Math.sin(now * 0.001 + pt.phase) * 0.6;
  });
  /* v21：飞过的小鸟——每隔一阵子从天边飞过去 */
  if (G.flyby) {
    G.flybyTimer -= dt;
    if (G.flybyTimer <= 0 && !G.flyby.visible) {
      G.flyby.visible = true;
      G.flyby.position.set(-75, 22 + Math.random() * 10, -25 + Math.random() * 40);
    }
    if (G.flyby.visible) {
      G.flyby.position.x += dt * 13;
      G.flyby.position.y += Math.sin(now * 0.002) * 0.15;
      var flap = 0.3 + Math.abs(Math.sin(now * 0.015)) * 0.7;
      var fw = G.flyby.userData.wings;
      if (fw) { fw.L.rotation.z = flap; fw.R.rotation.z = -flap; }
      if (G.flyby.position.x > 80) { G.flyby.visible = false; G.flybyTimer = 18 + Math.random() * 12; }
    }
  }
  /* 云漂移 */
  G.clouds.forEach(function (cl, idx) {
    cl.position.x += dt * (0.4 + idx * 0.1);
    if (cl.position.x > 70) cl.position.x = -70;
  });
  /* 浪圈呼吸 */
  G.seaRings.forEach(function (rg, idx) {
    rg.material.opacity = 0.22 + Math.sin(now * 0.001 + idx * 2) * 0.12;
  });
  /* v20：水面闪光一闪一闪 */
  G.glints.forEach(function (gl) {
    var o = gl.base + Math.sin(now * 0.002 + gl.phase) * 0.35;
    gl.sprite.material.opacity = Math.max(0.08, Math.min(0.95, o));
    var s = 1 + Math.sin(now * 0.002 + gl.phase) * 0.25;
    gl.sprite.scale.set(gl.scale * s, gl.scale * s, 1);
  });
  /* v20：蝴蝶绕花丛飞，翅膀扇动 */
  G.butterflies.forEach(function (bf) {
    var t = now * 0.001 * bf.speed + bf.phase;
    var bx = bf.cx + Math.cos(t) * bf.r;
    var bz = bf.cz + Math.sin(t * 1.3) * bf.r * 0.7;
    var by = bf.h + Math.sin(t * 2.1) * 0.5 + terrainH(bx, bz) * 0.3;
    bf.g.position.set(bx, by, bz);
    bf.g.rotation.y = Math.atan2(-Math.sin(t) * bf.r, Math.cos(t * 1.3) * bf.r * 0.7);
    var flap = 0.25 + Math.abs(Math.sin(now * 0.02 + bf.phase)) * 0.9;
    var w = bf.g.userData.wings;
    if (w) { w.L.rotation.z = flap; w.R.rotation.z = -flap; }
  });
  /* v20：花粉光点慢慢漂 */
  if (G.pollen && G.pollenBase) {
    var pp = G.pollen.geometry.attributes.position;
    for (var pi3 = 0; pi3 < pp.count; pi3++) {
      pp.array[pi3 * 3] = G.pollenBase[pi3 * 3] + Math.sin(now * 0.0003 + pi3 * 1.7) * 0.9;
      pp.array[pi3 * 3 + 1] = G.pollenBase[pi3 * 3 + 1] + Math.sin(now * 0.0004 + pi3 * 2.3) * 0.6;
      pp.array[pi3 * 3 + 2] = G.pollenBase[pi3 * 3 + 2] + Math.cos(now * 0.00025 + pi3) * 0.9;
    }
    pp.needsUpdate = true;
  }
  updateCamTarget();
  updateCamera(dt);
  G.renderer.render(G.scene, G.camera);
}

/* ---------------- 启动 ---------------- */
async function init() {
  try {
    setLoad(0.1, '加载 Three.js…');
    await loadThree();
    setLoad(0.35, '造小岛…');
    buildRenderer();
    buildTerrain();
    setLoad(0.55, '种树盖房子…');
    buildIsland();
    setLoad(0.7, '请小动物出场…');
    buildCharacters();
    setLoad(0.85, '准备界面…');
    buildUI();
    followPrincess();
    setDialogue('princess', '彩虹公主', [{ t: '你好呀！我是彩虹公主，欢迎来到彩虹小岛！', key: false }]);
    clock = new THREE.Clock();
    tick();
    setLoad(1, '完成！');
    $('loading').style.display = 'none';
    showOverlay('unlock');
    window.__v21 = {
      game: G, getState: getState, sentenceFor: sentenceText,
      setWord: function (w) { G.selWord = w; },
      startGame: startGame, setSpeed: function (n) { G.speedMul = n; },
      doHint: doHint, sayClip: sayClip, playClip: playClip,
      walkTo: function (id, x, z, speed) { return moveTo(id, x, z, speed); },
      teleport: function (id, x, z) { stopMoving(id); clearPlacement(id); setCharPos(id, x, z, 0); },
      focusOn: function (id) { G.camMode = 'follow'; G.followId = id; },
      focusAt: function (x, y, z) { setCamFocus(x, y, z); },
      legRot: function (id) {
        var u = G.chars[id].userData;
        var l = u.legs || {};
        return { FL: l.FL ? l.FL.rotation.x : (l.L ? l.L.rotation.x : 0),
                 FR: l.FR ? l.FR.rotation.x : (l.R ? l.R.rotation.x : 0),
                 moving: !!u.moving, phase: u.phase };
      },
      project: function (x, y, z) { return projectToClient(x, y, z); },
      /* v21 测试用：目标在屏幕上的位置 + 角色在屏幕上的高度（像素） */
      targetScreen: function () {
        if (!G.curRound) return null;
        var tp = targetScreenPoint(G.curRound);
        return projectToClient(tp.x, tp.y, tp.z);
      },
      charScreen: function (id) {
        var g = G.chars[id];
        var feet = projectToClient(g.position.x, g.position.y, g.position.z);
        var head = projectToClient(g.position.x, g.position.y + 3.2, g.position.z);
        return { id: id, feetX: feet.x, feetY: feet.y, headY: head.y,
                 heightPx: feet.y - head.y, visible: !feet.behind && feet.y >= 0 && feet.y <= window.innerHeight };
      }
    };
    window.__v19 = window.__v21;
    window.__v20 = window.__v21;
    window.__v19ready = true;
    window.__v20ready = true;
    window.__v21ready = true;
    console.log('[v21] ready');
  } catch (e) {
    console.error('[v21] init failed', e);
    var m = $('loadmsg');
    if (m) m.textContent = '加载失败：' + (e && e.message ? e.message : e);
  }
}
init();
