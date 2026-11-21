/* ============================================================================
 * 彩虹小岛 · Rainbow Island — v19
 * Three.js 3D 版（v18 修复版：放一放卡死修好、开声音有反馈、人物放大 2 倍、
 *   流程简化直接进第一题、"?" 真提示、选择卡放大、小地图去掉）。
 * - 纯静态：index.html + game.js + three.module.js + assets/audio/，无构建步骤。
 * - 3D 角色全部由 Three.js 几何体拼成（低多边形，v17 配色），腿会真的迈步、
 *   身体会起伏、会转向；公主/动物在岛上走，镜头第三人称跟随。
 * - 玩法与 v17 相同：家长选词（可多选）→ 每词 4 回合（找一找 / 放一放交替）
 *   → 星星 → 完成页 + 回家小任务；语音修复与 v17 相同（horse 用预录音，
 *   其余动物用慢速 TTS 读本动物句子；先读词再读整句；自动播放；答错有语音；
 *   “?” 提示真的高亮；换词立即刷新）。
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
var CHAR_GREETING = {
  'horse': 'Neigh! Hello!', 'cat': 'Meow! Hello!', 'dog': 'Woof! Hello!',
  'bear': 'Hello! I am a bear!', 'bird': 'Tweet! Hello!'
};
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
  'rock':   { id: 'rock',   en: 'rock',   zh: '石头', x: 58, y: 90, zone: '沙滩' }
};
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
function sentenceKey(wordId, spotId) { return 'sent-' + wordId + '-' + spotId; }
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
function circleOffset3D(wordId) {
  switch (wordId) {
    case 'in':     return { dx: 0,    dz: 0 };
    case 'on':     return { dx: 0,    dz: -0.5 };
    case 'under':  return { dx: -2.6, dz: 1.8 };
    case 'nextto': return { dx: 2.9,  dz: 0 };
    case 'behind': return { dx: 2.0,  dz: -2.6 };
    case 'front':  return { dx: 0,    dz: 2.7 };
    default:       return { dx: 0,    dz: 0 };
  }
}
function miniOffset3D(wordId) { return wordOffset3D(wordId); }

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
  selWords: ['behind'], rounds: [], roundIdx: 0, stars: 0, wrongCount: 0,
  curRound: null, seqToken: 0, phase: 'idle', dialogueBusy: false,
  wanderOn: true, wanderTimers: {}, movers: {}, speedMul: 1,
  lastSpoken: [], audioUnlocked: false, audioQueue: [], audioBusy: false,
  modeIdx: 0, MODES: ['day', 'sunset', 'night'],
  camFocus: null, camOffset: null, camTarget: null,
  circles: [], hintRing: null, confettiBits: [], clouds: [], stars3d: [],
  thumbRenderer: null, thumbCache: {}, raycaster: null, pointer: null,
  dragState: null, nightTint: null, sea: null, seaRings: [],
  miniTimer: null
};
G.camFocus = { x: 0, y: 1, z: 8 };
/* v19：镜头拉近，人物在屏幕上大约大一倍 */
G.camOffset = { x: 0, y: 8, z: 12.5 };
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
    new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.16, depthWrite: false }));
  m.rotation.x = -Math.PI / 2;
  m.position.y = 0.03;
  return m;
}
/* 确定性伪随机（布局每次打开都一样） */
function RNG(seed) {
  var s = seed;
  return function () { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
}

/* ---------------- 场景搭建 ---------------- */
function buildRenderer() {
  var canvas = $('gl');
  G.renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true });
  G.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  G.renderer.outputColorSpace = THREE.SRGBColorSpace;
  G.scene = new THREE.Scene();
  G.scene.background = new THREE.Color(0x9fd8ff);
  G.scene.fog = new THREE.Fog(0x9fd8ff, 120, 280);
  G.camera = new THREE.PerspectiveCamera(55, 1, 0.1, 500);
  G.camera.position.set(0, 10, 21);
  G.camera.lookAt(0, 1, 8);
  var hemi = new THREE.HemisphereLight(0xcfe8ff, 0x8a7a5a, 1.0);
  G.scene.add(hemi);
  var sun = new THREE.DirectionalLight(0xfff2cc, 1.7);
  sun.position.set(40, 70, 25);
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
  G.camera.updateProjectionMatrix();
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
  var terrain = new THREE.Mesh(geo, new THREE.MeshLambertMaterial({ vertexColors: true }));
  terrain.name = 'terrain';
  G.scene.add(terrain);
  G.terrain = terrain;

  /* 大海 */
  var sea = new THREE.Mesh(new THREE.CircleGeometry(230, 48),
    new THREE.MeshLambertMaterial({ color: 0x3b82f6, transparent: true, opacity: 0.92 }));
  sea.rotation.x = -Math.PI / 2;
  sea.position.y = -1.0;
  sea.name = 'sea';
  G.scene.add(sea);
  G.sea = sea;
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
    new THREE.MeshLambertMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.9 }));
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
  /* 云 */
  for (var ci = 0; ci < 5; ci++) {
    var cl = new THREE.Group();
    var npuff = 3 + (ci % 2);
    for (var pi = 0; pi < npuff; pi++) {
      cl.add(sph(2.2 + Math.random() * 1.6, 0xffffff, pi * 2.6 - npuff, Math.random() * 0.8, Math.random() * 1.2, 1, 0.75, 1));
    }
    cl.position.set(-50 + ci * 24, 26 + (ci % 3) * 4, -30 - (ci % 2) * 18);
    G.scene.add(cl);
    G.clouds.push(cl);
  }
}

/* ---------------- 岛上物件（低多边形，带 userData.spotId / 顶部高度） ---------------- */
function makeTree(s) {
  var g = new THREE.Group();
  var trunk = cyl(0.32 * s, 0.45 * s, 1.8 * s, 0x8b5a2b, 0, 0.9 * s, 0);
  g.add(trunk);
  g.add(sph(1.15 * s, 0x2f9e44, 0, 2.5 * s, 0, 1, 1.05, 1));
  g.add(sph(0.85 * s, 0x37b24d, -0.6 * s, 2.0 * s, 0.3 * s));
  g.add(sph(0.8 * s, 0x2b8a3e, 0.65 * s, 2.1 * s, -0.25 * s));
  g.add(sph(0.55 * s, 0x40c057, 0, 3.2 * s, 0));
  g.userData.topY = 3.6 * s;
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
  var g = new THREE.Group();
  g.add(cyl(0.05, 0.05, 0.8, 0x2f9e44, 0, 0.4, 0, 6));
  for (var i = 0; i < 6; i++) {
    var a = i / 6 * Math.PI * 2;
    g.add(sph(0.16, color, Math.cos(a) * 0.2, 0.88, Math.sin(a) * 0.2));
  }
  g.add(sph(0.14, 0xffd43b, 0, 0.9, 0));
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
  g.userData.topY = 1.0 * s;
  return g;
}
function makeGrassTuft() {
  var g = new THREE.Group();
  for (var i = 0; i < 3; i++) {
    var c = cone(0.09, 0.55, 0x40c057, (i - 1) * 0.14, 0.28, 0, 5);
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
var SPOT_BUILDERS = {
  tree: function () { return makeTree(1.15); },
  house: makeHouse, box: makeBox, basket: makeBasket, bridge: makeBridge,
  table: makeTable, flower: function () { return makeFlower(0xff6b9d); }, rock: function () { return makeRock(1.1); }
};

function buildIsland() {
  /* 大雪山（北边山顶） */
  var mount = new THREE.Group();
  var coneM = cone(15, 17, 0x8d99ae, 0, 8.5, 0, 24);
  mount.add(coneM);
  var snow = cone(6.2, 7, 0xffffff, 0, 13.5, 0, 24);
  mount.add(snow);
  mount.add(makeRock(1.6)); mount.children[2].position.set(6, 0.5, 4);
  mount.position.set(0, terrainH(0, -48) - 0.5, -48);
  G.scene.add(mount);

  /* 8 个主物件 */
  Object.keys(SPOTS).forEach(function (id) {
    var sp = SPOTS[id];
    var g = SPOT_BUILDERS[id]();
    var x = px(sp.x), z = pz(sp.y);
    g.position.set(x, terrainH(x, z), z);
    g.userData.spotId = id;
    g.traverse(function (o) { o.userData.spotId = id; });
    G.scene.add(g);
    G.spotMeshes[id] = g;
    G.spots[id] = { group: g, x: x, z: z, topY: terrainH(x, z) + (g.userData.topY || 1) };
    /* 中文小牌子 */
    var label = makeTextSprite(sp.zh, '#5b4636');
    label.position.set(x, terrainH(x, z) + (g.userData.topY || 1) + 1.1, z);
    G.scene.add(label);
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
      G.scene.add(g);
    }
  }
  var treeClear = [{ x: px(24), z: pz(22), r: 5.5 }];
  scatter(function () { return makeTree(1); }, { x0: -45, x1: 30, z0: -44, z1: -18, exclude: treeClear }, 38, 0.8, 1.25);
  scatter(function () { return makeBush(1); }, { x0: -45, x1: 45, z0: -44, z1: 30, exclude: treeClear }, 22, 0.7, 1.2);
  scatter(function () { return makeFlower([0xff6b9d, 0xffd43b, 0xda77f2, 0xff8787][Math.floor(rnd() * 4)]); },
    { x0: 18, x1: 52, z0: -22, z1: 12 }, 26, 0.8, 1.3);
  scatter(function () { return makeRock(1); }, { x0: -50, x1: 50, z0: 30, z1: 52 }, 18, 0.7, 1.4);
  scatter(function () { return makePebble(); }, { x0: -50, x1: 50, z0: 28, z1: 52 }, 16, 0.8, 1.5);
  scatter(function () { return makeGrassTuft(); }, { x0: -48, x1: 48, z0: -45, z1: 45 }, 40, 0.8, 1.4);
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
  /* 彩虹裙：五层彩色短圆台，自下而上紫→蓝→绿→黄→红 */
  var rainbow = [0x8b5cf6, 0x3b82f6, 0x22c55e, 0xfacc15, 0xef4444];
  var y = 0;
  for (var i = 0; i < 5; i++) {
    var rTop = 0.62 - i * 0.075, rBot = 0.68 - i * 0.075;
    var band = cyl(rTop, rBot, 0.24, rainbow[i], 0, y + 0.12, 0, 20);
    bodyG.add(band);
    y += 0.24;
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
  var shadow = blobShadow(0.7);
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

/* ---------------- 音频：horse 用预录音，其余动物用慢速 TTS（v17 修复逻辑） ---------------- */
var AUDIO_KEYS = ['finish', 'praise', 'silence',
  'sent-behind-house', 'sent-behind-mountain', 'sent-behind-tree',
  'sent-front-house', 'sent-front-mountain', 'sent-front-tree',
  'sent-in-basket', 'sent-in-box', 'sent-in-house',
  'sent-nextto-flower', 'sent-nextto-house', 'sent-nextto-mountain', 'sent-nextto-tree',
  'sent-on-box', 'sent-on-bridge', 'sent-on-mountain', 'sent-on-rock',
  'sent-under-bridge', 'sent-under-tree', 'sent-under-umbrella',
  'word-behind', 'word-front', 'word-in_', 'word-nextto', 'word-on', 'word-under'];
function playClip(key) {
  return new Promise(function (res) {
    var done = false;
    function fin() { if (!done) { done = true; res(); } }
    try {
      var a = new Audio('assets/audio/' + key + '.mp3');
      a.onended = fin; a.onerror = fin;
      var p = a.play();
      if (p && p.catch) p.catch(fin);
      setTimeout(fin, 6000);
    } catch (e) { fin(); }
  });
}
function speakTTS(text, rate) {
  G.lastSpoken.push({ kind: 'tts', text: text, rate: rate || 0.7 });
  console.log('[TTS]', text);
  return new Promise(function (res) {
    var done = false;
    function fin() { if (!done) { done = true; res(); } }
    try {
      if (typeof window.speechSynthesis === 'undefined') { fin(); return; }
      var u = new SpeechSynthesisUtterance(text);
      u.lang = 'en-US'; u.rate = rate || 0.7; u.pitch = 1.1;
      var voices = window.speechSynthesis.getVoices();
      for (var i = 0; i < voices.length; i++) {
        if (voices[i].lang && voices[i].lang.indexOf('en') === 0) { u.voice = voices[i]; break; }
      }
      u.onend = fin; u.onerror = fin;
      window.speechSynthesis.cancel();
      setTimeout(function () { try { window.speechSynthesis.speak(u); } catch (e2) { fin(); } }, 80);
      setTimeout(fin, 6000);
    } catch (e) { fin(); }
  });
}
function playWord(wordId) {
  var w = WORDS[wordId];
  G.lastSpoken.push({ kind: 'word', word: wordId, text: w.en });
  return playClip(w.clip);
}
function playSentence(round) {
  var key = sentenceKey(round.word, round.spot);
  var text = sentenceText(round.word, round.animal, round.spot);
  if (round.animal === 'horse') {
    G.lastSpoken.push({ kind: 'clip', key: key, text: text });
    return playClip(key);
  }
  return speakTTS(text, 0.7);
}
async function playQuestionAudio(round) {
  await playWord(round.word);
  await sleep(500);
  await playSentence(round);
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
async function sayLine(speakerId, textHtml, audio) {
  if (G.dialogueBusy) return;
  G.dialogueBusy = true;
  try {
    var name = speakerId === 'princess' ? '彩虹公主' : CHARS[speakerId].zh;
    setDialogue(speakerId, name, parseSegments(textHtml));
    var c = G.chars[speakerId];
    if (c) jumpChar(speakerId, 0.25);
    if (audio && audio.clip) await playClip(audio.clip);
    else if (audio && audio.tts) await speakTTS(audio.tts, 0.75);
    else await sleep(700);
  } finally {
    G.dialogueBusy = false;
  }
  await sleep(150);
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
function placeAnimalAtSpot(animalId, spot, wordId) {
  var off = wordOffset3D(wordId);
  /* under the bridge：站在桥拱正下方（池塘里），不是桥南边 */
  if (wordId === 'under' && spot.id === 'bridge') off = { dx: 0, dz: 0, dy: 0, cls: '' };
  var g = G.chars[animalId];
  stopMoving(animalId);
  var sx = G.spots[spot.id].x, sz = G.spots[spot.id].z;
  var x = clamp(sx + off.dx, -56, 56), z = clamp(sz + off.dz, -56, 56);
  var yOff = off.dy || 0;
  /* in the house：房子是开面的，动物站在屋里正中，不用下沉；盒子/篮子才下沉半身 */
  if (off.cls === 'inbox' && spot.id === 'house') yOff = 0;
  if (off.cls === 'on') yOff = (G.spots[spot.id].topY - terrainH(x, z)) + 0.05;
  g.userData.yOff = yOff;
  g.userData.placed = off.cls;
  setCharPos(animalId, x, z, yOff);
  g.rotation.y = 0;
}
function clearPlacement(animalId) {
  var g = G.chars[animalId];
  if (!g) return;
  g.userData.yOff = 0;
  g.userData.placed = null;
  setCharPos(animalId, g.position.x, g.position.z, 0);
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
    if (G.phase === 'dialogue' || G.phase === 'answering' || G.phase === 'celebrating') {
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
/* v19：镜头立刻切过去（不慢慢平移），回合一开始画面里就有人有动物 */
function snapCameraTo(x, y, z) {
  G.camMode = 'fixed';
  G.camTarget.x = x; G.camTarget.y = y; G.camTarget.z = z;
  G.camFocus.x = x; G.camFocus.y = y; G.camFocus.z = z;
  G.camera.position.set(x + G.camOffset.x, y + G.camOffset.y, z + G.camOffset.z);
  G.camera.lookAt(x, y, z);
}
/* 3D 点 → 屏幕像素坐标（供点圈圈、测试用） */
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

/* ---------------- 回合 ---------------- */
function buildRounds(wordId) {
  var spots = ROUND_SPOTS[wordId] || ROUND_SPOTS.behind;
  var animals = shuffle(CHAR_IDS).slice(0, 4);
  var rs = [];
  for (var i = 0; i < 4; i++) {
    rs.push({ word: wordId, animal: animals[i], spot: spots[i % spots.length],
              type: (i % 2 === 0) ? 'find' : 'place', idx: i });
  }
  return rs;
}
function sentenceSegments(wordId, animalId, spotId) {
  return [
    { t: 'The ' + CHARS[animalId].en + ' is ', key: false },
    { t: WORDS[wordId].en, key: true },
    { t: ' the ' + SPOTS[spotId].en + '.', key: false }
  ];
}
async function startGame() {
  if (G.selWords.length === 0) { G.selWords = ['behind']; buildSetupGrid(); }
  G.rounds = [];
  G.selWords.forEach(function (wid) { G.rounds = G.rounds.concat(buildRounds(wid)); });
  G.roundIdx = 0;
  G.stars = 0;
  G.phase = 'idle';
  G.wanderOn = true;
  startAllWander();
  renderStars(); renderWordChip();
  /* v19：不经过介绍卡，直接进第一题 */
  await startRound();
}
async function startRound() {
  var r = G.rounds[G.roundIdx];
  if (!r) { showFinish(); return; }
  G.curRound = r;
  G.wrongCount = 0;
  var myToken = ++G.seqToken;
  /* v19：记下每题开始时间，供测试核对“出题有多快”（游戏内计时，不受测试工具轮询影响） */
  G.tRoundStartMs = performance.now();
  G.tAnswerMs = null;
  G.phase = 'dialogue';
  renderWordChip();
  var ch = CHARS[r.animal];
  var spot = SPOTS[r.spot];
  var sp = G.spots[r.spot];
  stopWander(r.animal);
  spreadAnimalsAwayFrom(spot);
  /* v19：不慢慢走过去、不寒暄——公主直接出现在题目旁边，镜头立刻切过去，
     画面一开始就有人有动物，中文提示和英文任务说的是同一件事。 */
  stopMoving('princess');
  clearPlacement('princess');
  setCharPos('princess', sp.x + 1.6, sp.z + 2.2, 0);
  /* v19：公主面向镜头（南边，rotation.y = 0 时脸朝 +Z）——之前是 Math.PI，
     孩子只能看到后脑勺和辫子，脸（眼睛/笑容都在 +Z 面）完全看不见。 */
  G.chars.princess.rotation.y = 0;
  jumpChar('princess', 0.3);
  snapCameraTo(sp.x, 1.5, sp.z);
  if (r.type === 'find') setStatus('彩虹公主去找' + ch.zh + '啦 · ' + ch.zh + '要去' + spot.zh + '那里');
  else setStatus('把' + ch.zh + '放到' + spot.zh + WORDS[r.word].zh);
  if (r.type === 'find') await runFindRound(r, myToken);
  else await runPlaceRound(r, myToken);
}
async function runFindRound(r, myToken) {
  var ch = CHARS[r.animal];
  var spot = SPOTS[r.spot];
  var sp = G.spots[r.spot];
  setStatus(ch.zh + '要去' + spot.zh + '那里');
  /* v19：小动物直接出现在题目位置（不慢慢走过去），镜头已经切好了 */
  stopMoving(r.animal);
  placeAnimalAtSpot(r.animal, spot, r.word);
  jumpChar(r.animal, 0.4);
  /* v19：缩略图不在读题时生成——生成 3D 缩略图会堵主线程，会把语音计时也拖慢。
     卡片先出文字就能点，图在 askFindChoice 里出题后再慢慢补（见下）。 */
  await sayLine('princess', 'Watch! Look at the ' + ch.en + '!', { tts: 'Watch! Look at the ' + ch.en + '!' });
  if (myToken !== G.seqToken) return;
  await sayLine('princess', 'Where is the ' + ch.en + '?', { tts: 'Where is the ' + ch.en + '?' });
  if (myToken !== G.seqToken) return;
  await playQuestionAudio(r);
  if (myToken !== G.seqToken) return;
  G.phase = 'answering';
  G.tAnswerMs = Math.round(performance.now() - G.tRoundStartMs);
  setStatus('点一点：小动物在哪里？');
  var picked = await askFindChoice(r);
  if (myToken !== G.seqToken) return;
  if (picked) await celebrateAndSay(r, myToken);
}
async function runPlaceRound(r, myToken) {
  var ch = CHARS[r.animal];
  var spot = SPOTS[r.spot];
  var sp = G.spots[r.spot];
  var w = WORDS[r.word];
  /* v19：小动物直接出现在题目旁边（东南侧，离三个圈都够远，不会挡住圈），
     中文和英文说的是同一件事：把小动物放到那个地方。 */
  stopMoving(r.animal);
  clearPlacement(r.animal);
  var sx = clamp(sp.x + 3.0, -56, 56), sz = clamp(sp.z + 2.5, -56, 56);
  setCharPos(r.animal, sx, sz, 0);
  /* v19：小动物也面向镜头，孩子一开题就看到脸（之前沿用散步时的朝向，经常是背影） */
  G.chars[r.animal].rotation.y = 0;
  G.placeStart = { x: sx, z: sz };
  jumpChar(r.animal, 0.4);
  await sayLine('princess', 'Put the ' + ch.en + ' <span class=\'key\'>' + w.en + '</span> the ' + spot.en + '!',
    { tts: 'Put the ' + ch.en + ' ' + w.en + ' the ' + spot.en + '!' });
  if (myToken !== G.seqToken) return;
  await playQuestionAudio(r);
  if (myToken !== G.seqToken) return;
  G.phase = 'answering';
  G.tAnswerMs = Math.round(performance.now() - G.tRoundStartMs);
  setStatus('把' + ch.zh + '放到' + spot.zh + w.zh + ' · 拖过去或点圈圈');
  var ok = await askPlace(r);
  if (myToken !== G.seqToken) return;
  if (ok) await celebrateAndSay(r, myToken);
}

/* 找一找：三张选择卡（3D 小场景缩略图） */
function askFindChoice(r) {
  return new Promise(function (resolve) {
    var layer = $('choices');
    layer.innerHTML = '';
    layer.classList.add('show');
    G.choiceCards = [];
    G.choiceResolve = resolve;
    var others = WORD_ORDER.filter(function (id) { return id !== r.word; });
    var opts = shuffle([r.word].concat(shuffle(others).slice(0, 2)));
    opts.forEach(function (wid, i) {
      var card = document.createElement('div');
      card.className = 'choice';
      card.dataset.wid = wid;
      var img = document.createElement('img');
      img.alt = '';
      var key = r.animal + '|' + r.spot + '|' + wid;
      if (G.thumbCache[key]) img.src = G.thumbCache[key];
      var lab = document.createElement('div');
      lab.className = 'clabel';
      lab.textContent = CHARS[r.animal].zh + WORDS[wid].zh + SPOTS[r.spot].zh;
      card.appendChild(img);
      card.appendChild(lab);
      card.addEventListener('click', function () { onChoiceTap(r, card); });
      layer.appendChild(card);
      G.choiceCards.push(card);
      /* v19：缩略图在出题后才生成——卡片已经出来能点了，图随后一张张补上。
         这样读题语音和出题都不被堵；真机上每张图只要几十毫秒。 */
      if (!G.thumbCache[key]) {
        (function (wid2, key2, img2, card2, i2) {
          setTimeout(function () {
            if (G.choiceCards.indexOf(card2) === -1) return; /* 已换题，不补旧图 */
            try { G.thumbCache[key2] = makeChoiceThumb(r.animal, r.spot, wid2); } catch (e) { console.warn('[thumb] failed', e); return; }
            if (G.choiceCards.indexOf(card2) !== -1 && !img2.getAttribute('src')) img2.src = G.thumbCache[key2];
          }, i2 * 80);
        })(wid, key, img, card, i);
      }
    });
    hideMinimap(true);
  });
}
function onChoiceTap(r, card) {
  if (G.phase !== 'answering') return;
  if (card.dataset.wid === r.word) {
    card.classList.add('good');
    hideChoices();
    if (G.choiceResolve) { var res = G.choiceResolve; G.choiceResolve = null; res(true); }
  } else {
    card.classList.add('bad');
    wrongPick(r);
    setTimeout(function () { card.classList.remove('bad'); }, 900);
  }
}
function hideChoices() {
  var layer = $('choices');
  layer.classList.remove('show');
  layer.innerHTML = '';
  G.choiceCards = [];
  hideMinimap(false);
}
function pulseCorrectChoice(wordId) {
  (G.choiceCards || []).forEach(function (card) {
    if (card.dataset.wid === wordId) card.classList.add('pulse');
  });
}

/* 放一放：三个发光圈，点圈或拖动物 */
function askPlace(r) {
  return new Promise(function (resolve) {
    var spot = SPOTS[r.spot];
    var sp = G.spots[r.spot];
    var others = WORD_ORDER.filter(function (id) { return id !== r.word; });
    var opts = shuffle([r.word].concat(shuffle(others).slice(0, 2)));
    clearCircles();
    opts.forEach(function (wid) {
      var off = circleOffset3D(wid);
      var cx = clamp(sp.x + off.dx, -54, 54), cz = clamp(sp.z + off.dz, -54, 54);
      var cy = terrainH(cx, cz) + 0.06;
      /* v19：圈放大，好点中；圈上加一个飘着的金色小球当靶心，远处也看得见 */
      var ring = new THREE.Mesh(new THREE.RingGeometry(1.0, 1.35, 32),
        new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.95, side: THREE.DoubleSide, depthWrite: false }));
      ring.rotation.x = -Math.PI / 2;
      ring.position.set(cx, cy, cz);
      ring.userData.ringId = wid;
      var hit = new THREE.Mesh(new THREE.CylinderGeometry(1.4, 1.4, 1.6, 12),
        new THREE.MeshBasicMaterial({ visible: false }));
      hit.position.set(cx, cy + 0.6, cz);
      hit.userData.ringId = wid;
      var dot = sph(0.32, 0xffb703, cx, cy + 1.5, cz);
      dot.userData.ringId = wid;
      G.scene.add(ring); G.scene.add(hit); G.scene.add(dot);
      G.circles.push({ wid: wid, x: cx, y: cy, z: cz, ring: ring, hit: hit, dot: dot, spotX: sp.x, spotZ: sp.z, phase: Math.random() * 6, hintPulse: false });
    });
    G.placeResolve = resolve;
    G.placeRound = r;
  });
}
function clearCircles() {
  G.circles.forEach(function (c) { G.scene.remove(c.ring); G.scene.remove(c.hit); if (c.dot) G.scene.remove(c.dot); });
  G.circles = [];
  G.placeResolve = null; G.placeRound = null;
  G.dragState = null;
}
/* v19：先判对错，再动动物。点错了动物原地不动、永远不会消失；
   点对了才把动物走过去放到正确位置。 */
async function onCircleTap(r, circle) {
  if (G.phase !== 'answering' || !circle) return;
  if (circle.wid === r.word) {
    stopMoving(r.animal);
    await moveTo(r.animal, circle.spotX, circle.spotZ, 9);
    placeAnimalAtSpot(r.animal, SPOTS[r.spot], r.word);
    var res = G.placeResolve;
    clearCircles();
    if (res) res(true);
  } else {
    wrongPick(r);
  }
}
/* 答错后把动物送回本回合的出发点（看得见的地方），回合永远不会卡死 */
function returnAnimalToStart(r) {
  if (!G.placeStart || r.type !== 'place') return;
  var g = G.chars[r.animal];
  stopMoving(r.animal);
  clearPlacement(r.animal);
  setCharPos(r.animal, G.placeStart.x, G.placeStart.z, 0);
}
async function wrongPick(r) {
  G.wrongCount++;
  var g = G.chars[r.animal];
  returnAnimalToStart(r);
  var baseX = g.position.x;
  G.tweens.push({ t: 0, dur: 0.5, fn: function (k) {
    g.position.x = baseX + Math.sin(k * Math.PI * 4) * 0.15 * (1 - k);
  }, done: function () { g.position.x = baseX; } });
  setDialogue('princess', '彩虹公主', [{ t: '不是这里哦，再试一次！', key: false }]);
  setStatus('不是这里哦，再试一次');
  await speakTTS('Try again! Where is the ' + CHARS[r.animal].en + '?', 0.7);
}
/* v19：”?” 给真提示——金色光圈圈住正确答案 + 正确卡片闪烁 +
   公主用中文说出答案 + 重新慢读单词和整句。光圈围着动物本身（找一找）
   或正确的圈（放一放），镜头立刻切过去。 */
async function doHint() {
  if (!G.curRound || G.phase !== 'answering') return;
  var r = G.curRound;
  var spot = SPOTS[r.spot];
  var sp = G.spots[r.spot];
  var cx, cz;
  if (r.type === 'place') {
    var right = null;
    G.circles.forEach(function (c) { if (c.wid === r.word) right = c; });
    if (right) { cx = right.x; cz = right.z; right.hintPulse = true; }
    else { cx = sp.x; cz = sp.z; }
  } else {
    var ap = charPos(r.animal);
    cx = ap.x; cz = ap.z;
    pulseCorrectChoice(r.word);
  }
  if (G.hintRing) { G.scene.remove(G.hintRing); G.hintRing = null; }
  var ring = new THREE.Mesh(new THREE.TorusGeometry(1.8, 0.18, 10, 32), mat(0xffb703));
  ring.rotation.x = Math.PI / 2;
  ring.position.set(cx, terrainH(cx, cz) + 0.5, cz);
  G.scene.add(ring);
  G.hintRing = ring;
  G.tweens.push({ t: 0, dur: 2.2, fn: function (k) {
    var s = 1 + Math.sin(k * Math.PI * 3) * 0.18;
    ring.scale.set(s, s, s);
    ring.material.opacity = 1 - k * 0.5;
  }, done: function () { G.scene.remove(ring); if (G.hintRing === ring) G.hintRing = null; } });
  snapCameraTo(cx, 1.5, cz);
  princessWave();
  var segs = sentenceSegments(r.word, r.animal, r.spot);
  setDialogue('princess', '彩虹公主', [{ t: '看这里！', key: false }].concat(segs));
  setStatus('提示：' + CHARS[r.animal].zh + '在' + spot.zh + WORDS[r.word].zh);
  await playQuestionAudio(r);
}
async function celebrateAndSay(r, myToken) {
  G.phase = 'celebrating';
  hideChoices();
  var ch = CHARS[r.animal];
  var spot = SPOTS[r.spot];
  var sp = G.spots[r.spot];
  jumpChar(r.animal, 0.9);
  princessWave();
  confetti(sp.x, sp.z);
  await playClip('praise');
  if (myToken !== G.seqToken) return;
  var segs = sentenceSegments(r.word, r.animal, r.spot);
  var html = segs.map(function (s) { return s.key ? "<span class='key'>" + s.t + '</span>' : s.t; }).join('');
  var isHorse = r.animal === 'horse';
  await sayLine('princess', html, isHorse
    ? { clip: sentenceKey(r.word, r.spot) }
    : { tts: sentenceText(r.word, r.animal, r.spot) });
  if (myToken !== G.seqToken) return;
  G.stars++;
  renderStars();
  setStatus('说得真棒！★');
  /* v19：明确告诉孩子下一题要来了，再进下一题；动物直接回家，不慢慢走回去 */
  G.phase = 'transition';
  showToast('下一题 ▶', 1200);
  await sleep(1100);
  G.phase = 'idle';
  G.roundIdx++;
  if (myToken !== G.seqToken) return;
  if (G.roundIdx < G.rounds.length) {
    renderWordChip();
    stopMoving(r.animal);
    clearPlacement(r.animal);
    var h = HOME_POS[r.animal];
    setCharPos(r.animal, px(h.x), pz(h.y), 0);
    startWander(r.animal);
    startRound();
  } else {
    showFinish();
  }
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
  playClip('finish');
  var total = G.rounds.length;
  $('finish-stars').textContent = '★'.repeat(Math.max(1, G.stars)) + '☆'.repeat(Math.max(0, total - G.stars));
  var words = G.selWords.map(function (id) { return WORDS[id].en; }).join('、');
  $('finish-summary').textContent = '今天练了：' + words + ' · 得了 ' + G.stars + ' 颗星';
  $('finish-mission').textContent = '★ 回家小任务：' + (MISSIONS[G.selWords[0]] || '');
  showOverlay('finish');
}
function getState() {
  return {
    phase: G.phase, roundIdx: G.roundIdx, roundsTotal: G.rounds.length,
    stars: G.stars, selWords: G.selWords.slice(),
    curRound: G.curRound ? { word: G.curRound.word, animal: G.curRound.animal,
      spot: G.curRound.spot, type: G.curRound.type } : null,
    lastSpoken: G.lastSpoken.slice(-6),
    tAnswerMs: G.tAnswerMs,
    chars: Object.keys(G.chars).map(function (id) {
      var g = G.chars[id];
      return { id: id, x: +g.position.x.toFixed(2), z: +g.position.z.toFixed(2),
        moving: !!g.userData.moving, phase: +g.userData.phase.toFixed(2) };
    })
  };
}

/* ---------------- 找一找缩略图：独立小场景渲染 ---------------- */
/* v19：选择卡缩略图放大——动物占画面主体，镜头拉近，三张卡一眼能分清 */
function makeChoiceThumb(animalId, spotId, wordId) {
  try {
    if (!G.thumbRenderer) {
      G.thumbRenderer = new THREE.WebGLRenderer({ preserveDrawingBuffer: true, antialias: true });
      G.thumbRenderer.setSize(260, 180);
      G.thumbRenderer.outputColorSpace = THREE.SRGBColorSpace;
    }
    var scene = new THREE.Scene();
    scene.background = new THREE.Color(0x8fce6e);
    scene.add(new THREE.HemisphereLight(0xffffff, 0x8a7a5a, 1.1));
    var sun = new THREE.DirectionalLight(0xfff2cc, 1.4);
    sun.position.set(3, 8, 4);
    scene.add(sun);
    var ground = new THREE.Mesh(new THREE.CircleGeometry(3.4, 24), mat(0x8fce6e));
    ground.rotation.x = -Math.PI / 2;
    scene.add(ground);
    var spot = SPOT_BUILDERS[spotId]();
    spot.scale.setScalar(0.5);
    scene.add(spot);
    var off = miniOffset3D(wordId);
    var an = CHAR_BUILDERS[animalId]();
    an.scale.setScalar(1.05);
    an.position.set(off.dx * 0.5, 0, off.dz * 0.5);
    if (off.cls === 'inbox') an.position.y = -0.2;
    if (off.cls === 'on') an.position.y = (G.spots[spotId] ? G.spots[spotId].topY - terrainH(G.spots[spotId].x, G.spots[spotId].z) : 1) * 0.5;
    scene.add(an);
    var cam = new THREE.PerspectiveCamera(45, 260 / 180, 0.1, 50);
    cam.position.set(0, 4.2, 5.4);
    cam.lookAt(0, 0.5, 0);
    G.thumbRenderer.render(scene, cam);
    return G.thumbRenderer.domElement.toDataURL('image/png');
  } catch (e) {
    console.warn('[thumb] failed', e);
    return '';
  }
}

/* ---------------- 小地图 ---------------- */
/* v19：小地图看不懂，已从界面去掉；这两个函数留着当空操作，免得别处调用报错 */
function hideMinimap(hide) { var el = $('minimap'); if (el) el.style.display = hide ? 'none' : 'block'; }
function drawMinimap() {
  var cv = $('minimap');
  if (!cv || cv.style.display === 'none') return;
  var ctx = cv.getContext('2d');
  ctx.clearRect(0, 0, 92, 62);
  function mx(x) { return (x + 58) / 116 * 92; }
  function mz(z) { return (z + 58) / 116 * 62; }
  var zones = [
    { x0: -58, z0: -58, x1: 58, z1: -43, c: '#9ca3af' },
    { x0: -58, z0: -43, x1: 58, z1: -18, c: '#22c55e' },
    { x0: -58, z0: -18, x1: -20, z1: 12, c: '#f59e0b' },
    { x0: -12, z0: -10, x1: 12, z1: 10, c: '#38bdf8' },
    { x0: 18, z0: -18, x1: 58, z1: 12, c: '#f472b6' },
    { x0: -58, z0: 28, x1: 58, z1: 50, c: '#fde68a' },
    { x0: -58, z0: 50, x1: 58, z1: 58, c: '#3b82f6' }
  ];
  zones.forEach(function (zn) {
    ctx.fillStyle = zn.c;
    ctx.fillRect(mx(zn.x0), mz(zn.z0), mx(zn.x1) - mx(zn.x0), mz(zn.z1) - mz(zn.z0));
  });
  var dotColors = { horse: '#a16207', cat: '#f97316', dog: '#92400e', bear: '#78350f', bird: '#0ea5e9' };
  CHAR_IDS.forEach(function (id) {
    var p = charPos(id);
    ctx.fillStyle = dotColors[id];
    ctx.beginPath(); ctx.arc(mx(p.x), mz(p.z), 3.5, 0, Math.PI * 2); ctx.fill();
  });
  var pp = charPos('princess');
  ctx.fillStyle = '#ec4899';
  ctx.beginPath(); ctx.arc(mx(pp.x), mz(pp.z), 4.5, 0, Math.PI * 2); ctx.fill();
}

/* ---------------- DOM 界面 ---------------- */
function renderStars() {
  var total = G.rounds.length || 4;
  var html = '';
  for (var i = 0; i < total; i++) html += '<span class="' + (i < G.stars ? 'on' : '') + '">★</span>';
  $('stars').innerHTML = html;
}
function renderWordChip() {
  var inGame = G.phase !== 'idle' && !!G.curRound;
  var wid = (inGame ? G.curRound.word : (G.selWords && G.selWords[0])) || 'behind';
  var w = WORDS[wid];
  var chip = $('wordchip');
  chip.textContent = w.en + ' · ' + w.zh;
  chip.style.color = w.color;
  var iw = $('intro-word');
  if (iw) { iw.textContent = w.en + ' · ' + w.zh; iw.style.color = w.color; }
  var ist = $('intro-stars');
  if (ist) {
    var stars = inGame ? G.stars : 0;
    var total = G.rounds.length || 4;
    ist.textContent = '★'.repeat(Math.max(0, stars)) + '☆'.repeat(Math.max(0, total - stars));
  }
}
function showOverlay(name) {
  /* v19：介绍卡已去掉，只剩开声音 / 家长设置 / 完成页三个遮罩 */
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
    cell.className = 'wordcell' + (G.selWords.indexOf(wid) >= 0 ? ' sel' : '');
    var en = document.createElement('div');
    en.className = 'en'; en.textContent = w.en; en.style.background = w.color;
    var zh = document.createElement('div');
    zh.className = 'zh'; zh.textContent = w.zh;
    cell.appendChild(en); cell.appendChild(zh);
    cell.addEventListener('click', function () {
      var idx = G.selWords.indexOf(wid);
      if (idx >= 0) G.selWords.splice(idx, 1);
      else G.selWords.push(wid);
      // 允许全不选；点开始时没选就默认只练 behind（见 startGame）。
      buildSetupGrid();
      renderWordChip();
    });
    grid.appendChild(cell);
  });
}
function backToSetup() {
  G.seqToken++;
  stopAllWander();
  G.phase = 'idle';
  hideChoices();
  clearCircles();
  buildSetupGrid();
  showOverlay('setup');
}
function cycleMode() {
  G.modeIdx = (G.modeIdx + 1) % G.MODES.length;
  var m = G.MODES[G.modeIdx];
  var btn = $('mode-btn');
  if (m === 'day') {
    G.scene.background.set(0x9fd8ff); G.scene.fog.color.set(0x9fd8ff);
    G.hemi.intensity = 1.0; G.sun.intensity = 1.7; G.sun.color.set(0xfff2cc);
    G.stars3d.forEach(function (s) { s.visible = false; });
    btn.textContent = '☀';
  } else if (m === 'sunset') {
    G.scene.background.set(0xffc98a); G.scene.fog.color.set(0xffc98a);
    G.hemi.intensity = 0.8; G.sun.intensity = 1.2; G.sun.color.set(0xff8c3c);
    G.stars3d.forEach(function (s) { s.visible = false; });
    btn.textContent = '◑';
  } else {
    G.scene.background.set(0x0b1030); G.scene.fog.color.set(0x0b1030);
    G.hemi.intensity = 0.45; G.sun.intensity = 0.5; G.sun.color.set(0x9db4ff);
    G.stars3d.forEach(function (s) { s.visible = true; });
    btn.textContent = '☾';
  }
}
function buildUI() {
  buildSetupGrid();
  renderStars(); renderWordChip();
  $('unlock-btn').addEventListener('click', function () {
    G.audioUnlocked = true;
    /* v19：点一下立刻听得见、看得见——马上播一声表扬音效，按钮变成“声音开啦”，
       家长设置页里也出现绿色提示。以前只播 0.15 秒静音，看着就像没打开。 */
    var btn = $('unlock-btn');
    btn.textContent = '声音开啦 🔊';
    btn.disabled = true;
    playClip('praise');
    showToast('声音开啦 🔊', 1800);
    var note = $('sound-note');
    if (note) note.style.display = 'block';
    setDialogue('princess', '彩虹公主', [{ t: '你好呀！我是彩虹公主，欢迎来到彩虹小岛！', key: false }]);
    buildSetupGrid();
    showOverlay('setup');
  });
  /* v19：点“开始玩”直接进第一题，不经过介绍卡 */
  $('start-btn').addEventListener('click', function () {
    showOverlay(null);
    startGame();
  });
  $('again-btn').addEventListener('click', function () {
    showOverlay(null);
    G.seqToken++;
    CHAR_IDS.forEach(function (id) {
      clearPlacement(id);
      var h = HOME_POS[id];
      setCharPos(id, px(h.x), pz(h.y), 0);
    });
    setCharPos('princess', px(50), pz(66), 0);
    setCamFocus(px(50), 1.5, pz(66));
    startGame();
  });
  $('change-btn').addEventListener('click', function () {
    G.seqToken++;
    buildSetupGrid();
    showOverlay('setup');
  });
  $('speak-btn').addEventListener('click', function () {
    if (G.curRound && !G.dialogueBusy) playQuestionAudio(G.curRound);
  });
  $('hint-btn').addEventListener('click', function () { doHint(); });
  $('mode-btn').addEventListener('click', cycleMode);
  var backTimer = null;
  var backBtn = $('back-btn');
  backBtn.addEventListener('pointerdown', function () {
    backBtn.style.background = '#ffe1a8';
    backTimer = setTimeout(function () { backBtn.style.background = '#fff'; backToSetup(); }, 3000);
  });
  ['pointerup', 'pointerleave', 'pointercancel'].forEach(function (ev) {
    backBtn.addEventListener(ev, function () {
      backBtn.style.background = '#fff';
      if (backTimer) { clearTimeout(backTimer); backTimer = null; }
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
  if (G.phase !== 'idle') return;
  stopWander(id);
  stopMoving(id);
  var ch = CHARS[id];
  await sayLine(id, 'Hello!', { tts: CHAR_GREETING[id] });
  princessWave();
  await sayLine('princess', 'Hi, little ' + ch.en + "! Let's play!", { tts: 'Hi, little ' + ch.en + "! Let's play!" });
  startWander(id);
}
function onSpotTap(spotId) {
  var sp = SPOTS[spotId];
  var g = G.spotMeshes[spotId];
  if (g) {
    var s0 = g.scale.x;
    G.tweens.push({ t: 0, dur: 0.4, fn: function (k) { g.scale.setScalar(s0 * (1 + Math.sin(k * Math.PI) * 0.12)); },
      done: function () { g.scale.setScalar(s0); } });
  }
  if (G.phase === 'idle') {
    setDialogue('princess', '彩虹公主', [{ t: '这是' + sp.zh + '！', key: false }]);
    setStatus('这是' + sp.zh);
  }
}
/* v19：放一放回合的点选改用屏幕坐标——算每个圈和动物在屏幕上的位置，
   点到谁最近就选谁。3D 射线会被房子/大树挡住（v18 点圈圈失灵的根因），
   屏幕坐标不会：圈在画面上看得见，就一定点得到。 */
function pickPlaceTarget(ev) {
  var best = null, bestD = 1e9;
  G.circles.forEach(function (c) {
    var p = projectToClient(c.x, c.y + 0.4, c.z);
    if (p.behind) return;
    var d = Math.hypot(ev.clientX - p.x, ev.clientY - p.y);
    if (d < bestD) { bestD = d; best = { kind: 'ring', circle: c, d: d }; }
  });
  var ap = charPos(G.curRound.animal);
  var ag = G.chars[G.curRound.animal];
  var pa = projectToClient(ap.x, ag.position.y + 1.4, ap.z);
  if (!pa.behind) {
    var da = Math.hypot(ev.clientX - pa.x, ev.clientY - pa.y);
    if (da < bestD) { bestD = da; best = { kind: 'animal', d: da }; }
  }
  if (!best) return null;
  if (best.kind === 'ring' && best.d <= 75) return best;
  if (best.kind === 'animal' && best.d <= 85) return best;
  return null;
}
function bindWorldInput() {
  var cv = G.renderer.domElement;
  cv.addEventListener('pointerdown', function (ev) {
    if (document.querySelector('.overlay.show')) return;
    /* 放一放答题中：先用屏幕坐标点选（圈 > 动物，离点按处最近的赢） */
    if (G.phase === 'answering' && G.curRound && G.curRound.type === 'place') {
      var pick = pickPlaceTarget(ev);
      if (!pick) return;
      if (pick.kind === 'ring') { onCircleTap(G.curRound, pick.circle); return; }
      G.dragState = { animal: G.curRound.animal, moved: false };
      stopMoving(G.curRound.animal);
      return;
    }
    var hit = pickAt(ev);
    if (!hit) return;
    if (hit.kind === 'ring') {
      if (G.phase === 'answering' && G.curRound && G.curRound.type === 'place') {
        var circle = null;
        G.circles.forEach(function (c) { if (c.wid === hit.wid) circle = c; });
        if (circle) onCircleTap(G.curRound, circle);
      }
      return;
    }
    if (hit.kind === 'char') {
      if (G.phase === 'answering' && G.curRound && G.curRound.type === 'place' && hit.id === G.curRound.animal) {
        G.dragState = { animal: hit.id, moved: false };
        stopMoving(hit.id);
      } else {
        onAnimalTap(hit.id);
      }
      return;
    }
    if (hit.kind === 'spot') { onSpotTap(hit.id); return; }
    if (hit.kind === 'ground') {
      if (G.phase === 'idle') {
        var p = hit.point;
        walkPrincessTo(clamp(p.x, -56, 56), clamp(p.z, -56, 56), 8);
      }
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
  cv.addEventListener('pointerup', function (ev) {
    if (!G.dragState) return;
    var st = G.dragState;
    G.dragState = null;
    if (!st.moved || G.phase !== 'answering' || !G.curRound) return;
    /* v19：按松手时手指落点最近的圈来判（不是按动物出发点附近的圈）；
       落点离所有圈都远，就把动物送回出发点、温柔提示再试一次，不卡死。 */
    var pt = groundPoint(ev);
    var best = null, bestD = 1e9;
    if (pt) {
      G.circles.forEach(function (c) {
        var d = Math.hypot(pt.x - c.x, pt.z - c.z);
        if (d < bestD) { bestD = d; best = c; }
      });
    }
    if (best && bestD < 2.5) onCircleTap(G.curRound, best);
    else { returnAnimalToStart(G.curRound); wrongPick(G.curRound); }
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
  /* 圈圈脉动；提示的那个圈跳得更明显 */
  G.circles.forEach(function (c) {
    var s = 1 + Math.sin(now * 0.006 + c.phase) * 0.12;
    if (c.hintPulse) s = 1.35 + Math.sin(now * 0.01 + c.phase) * 0.25;
    c.ring.scale.set(s, s, 1);
    if (c.dot) {
      c.dot.position.y = c.y + 1.5 + Math.sin(now * 0.004 + c.phase) * 0.25;
      var ds = c.hintPulse ? 1.5 : 1;
      c.dot.scale.set(ds, ds, ds);
    }
  });
  /* 云漂移 */
  G.clouds.forEach(function (cl, idx) {
    cl.position.x += dt * (0.4 + idx * 0.1);
    if (cl.position.x > 70) cl.position.x = -70;
  });
  /* 浪圈呼吸 */
  G.seaRings.forEach(function (rg, idx) {
    rg.material.opacity = 0.22 + Math.sin(now * 0.001 + idx * 2) * 0.12;
  });
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
    window.__v19 = {
      game: G, getState: getState, sentenceFor: sentenceText,
      setWords: function (words) { G.selWords = words.slice(); },
      startGame: startGame, setSpeed: function (n) { G.speedMul = n; },
      playQuestionAudio: playQuestionAudio, doHint: doHint,
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
      ringPos: function (wid) {
        var c = null;
        G.circles.forEach(function (cc) { if (cc.wid === wid) c = cc; });
        return c ? { x: c.x, y: c.y, z: c.z } : null;
      },
      project: function (x, y, z) { return projectToClient(x, y, z); },
      /* v19 测试用：所有圈的屏幕坐标 + 角色在屏幕上的高度（像素） */
      placeCircles: function () {
        return G.circles.map(function (c) {
          var p = projectToClient(c.x, c.y + 0.4, c.z);
          return { wid: c.wid, x: c.x, z: c.z, sx: p.x, sy: p.y };
        });
      },
      charScreen: function (id) {
        var g = G.chars[id];
        var feet = projectToClient(g.position.x, g.position.y, g.position.z);
        var head = projectToClient(g.position.x, g.position.y + 3.2, g.position.z);
        return { id: id, feetX: feet.x, feetY: feet.y, headY: head.y,
                 heightPx: feet.y - head.y, visible: !feet.behind && feet.y >= 0 && feet.y <= window.innerHeight };
      }
    };
    window.__v18 = window.__v19;
    window.__v18ready = true;
    window.__v19ready = true;
    console.log('[v19] ready');
  } catch (e) {
    console.error('[v19] init failed', e);
    var m = $('loadmsg');
    if (m) m.textContent = '加载失败：' + (e && e.message ? e.message : e);
  }
}
init();
