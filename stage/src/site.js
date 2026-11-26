// 区域 D 建模：地面（内场护地板、条纹人造草草坪）、道路、围挡、两侧入口（红门头 + 闸机 + 安检帐篷）、店铺、售卖亭、看台、白帐篷、移动厕所、后台集装箱、树、粉丝区金字塔。
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { LAYOUT, VIEWS, lawnOutline, lawnBlocks, surfaceY } from './layout.js';
import * as TX from './textures.js';
import { TrussKit } from './truss.js';
import { MAT } from './venue/common.js';
import { buildFanInstallation } from './site/fan-installation.js';
import { buildUtopia } from './site/utopia.js';
import { buildMarsCamp, campFrame } from './site/mars-camp.js';
import * as GR from './ground.js';

const V = (x, y, z) => new THREE.Vector3(x, y, z);
const labeled = (g, label) => { g.userData.label = label; return g; };
function box(w, h, d, mat, x, y, z) { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat); m.position.set(x, y, z); m.castShadow = m.receiveShadow = true; return m; }

// 一块草皮：四边形 [前左, 前右, 后右, 后左]，内部按双线性插值细分；贴图 v 方向沿前后，所以条纹顺着这一块的前沿/后沿方向（前后沿不平行时条纹逐渐转过去）。
function turfBlock(A, B, C, D, stripe, mat) {
  const N = 10, pos = [], uv = [], idx = [];
  const depth = (Math.hypot(D[0] - A[0], D[1] - A[1]) + Math.hypot(C[0] - B[0], C[1] - B[1])) / 2, width = (Math.hypot(B[0] - A[0], B[1] - A[1]) + Math.hypot(C[0] - D[0], C[1] - D[1])) / 2;
  const vRep = Math.max(1, Math.round(depth / (stripe * 2)));
  for (let j = 0; j <= N; j++) for (let i = 0; i <= N; i++) {
    const s = i / N, t = j / N, fx = A[0] + (B[0] - A[0]) * s, fz = A[1] + (B[1] - A[1]) * s, bx = D[0] + (C[0] - D[0]) * s, bz = D[1] + (C[1] - D[1]) * s;
    pos.push(fx + (bx - fx) * t, surfaceY.turf, fz + (bz - fz) * t); uv.push((s * width) / 30, t * vRep);
  }
  for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) { const p = j * (N + 1) + i; idx.push(p, p + N + 1, p + 1, p + 1, p + N + 1, p + N + 2); }
  const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); geo.setIndex(idx); geo.computeVertexNormals();
  const m = new THREE.Mesh(geo, mat); m.receiveShadow = true; return m;
}

// ---------- 地面 ----------
export function buildGround() {
  const g = new THREE.Group(), G = LAYOUT.ground;
  const asphalt = TX.asphaltTexture();
  const plane = (r, mat, y) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(r.x1 - r.x0, r.z1 - r.z0), mat); m.rotation.x = -Math.PI / 2; m.position.set((r.x0 + r.x1) / 2, y, (r.z0 + r.z1) / 2); m.receiveShadow = true; g.add(m); return m; };
  const rep = (tex, r, sx, sz) => { const t = tex.clone(); t.needsUpdate = true; t.repeat.set((r.x1 - r.x0) / sx, (r.z1 - r.z0) / sz); return t; };
  const fibre = GR.turfFibre(), concrete = GR.concreteTexture();
  // 场外田野：草地里夹着黄褐色的裸土和干草（大尺度混色），近处有草的颗粒
  const far = { x0: -2500, x1: 2500, z0: -2500, z1: 2500 };
  plane(far, GR.worldDetail(new THREE.MeshStandardMaterial({ map: rep(GR.fieldTexture(), far, 22, 22), roughness: 1 }), fibre.detail,
    { scale: 2.5, fine: 0.25, macro: 0.32, near: 10, far: 120, tint: 0x9a8058, tintAmount: 0.55 }), -0.05);
  // 场地硬地（围挡以内）：浅灰水泥，水渍、斑块
  const F = LAYOUT.site.fence, yard = { x0: F[0][0], x1: F[1][0], z0: F[0][1], z1: F[2][1] };
  plane(yard, GR.worldDetail(new THREE.MeshStandardMaterial({ map: rep(concrete, yard, 8, 8), color: 0xe2e2de, roughness: 0.93 }), fibre.detail,
    { scale: 1.6, fine: 0.12, macro: 0.12, near: 6, far: 60 }), 0.0);
  plane(G.starLawn, GR.worldDetail(new THREE.MeshStandardMaterial({ map: rep(GR.fieldTexture(), G.starLawn, 10, 10), roughness: 1 }), fibre.detail,
    { scale: 1.2, fine: 0.3, macro: 0.2, near: 6, far: 70 }), surfaceY.starLawn);
  plane(G.pit, GR.worldDetail(new THREE.MeshStandardMaterial({ map: GR.protectionFloorTexture(G.pit.x1 - G.pit.x0, G.pit.z1 - G.pit.z0), roughness: 0.72, metalness: 0.02 }), fibre.detail,
    { scale: 3.4, fine: 0.05, macro: 0.1, near: 8, far: 80 }), surfaceY.pit);
  // 先铺一整块水泥色的底（草坪外轮廓），再把草皮（lawnBlocks，已让出通道）铺上去。
  const pathTex = concrete.clone(); pathTex.needsUpdate = true; pathTex.repeat.set(1 / 8, 1 / 8);   // ShapeGeometry 的 uv 就是米
  const pathMat = GR.worldDetail(new THREE.MeshStandardMaterial({ map: pathTex, color: 0xdedfda, roughness: 0.92 }), fibre.detail, { scale: 1.6, fine: 0.1, macro: 0.08 });
  const base = new THREE.Mesh(new THREE.ShapeGeometry(new THREE.Shape(lawnOutline().map(([x, z]) => new THREE.Vector2(x, -z)))), pathMat);
  base.rotation.x = -Math.PI / 2; base.position.y = surfaceY.lawnPath; base.receiveShadow = true; g.add(base);
  // 草皮：条纹贴图（uv：u 1 = 30 米，v 1 = 两道条纹）+ 草丝法线（约 1.2 米一块）+ 世界坐标草丝明暗（近处才有）
  const fibreNormal = fibre.normal.clone(); fibreNormal.needsUpdate = true; fibreNormal.repeat.set(30 / 1.2, (G.stripe * 2) / 1.2);
  const turfMat = GR.worldDetail(new THREE.MeshStandardMaterial({ map: GR.turfStripeTexture(), normalMap: fibreNormal, normalScale: new THREE.Vector2(0.55, 0.55), roughness: 0.9 }),
    fibre.detail, { scale: 0.9, fine: 0.7, macro: 0.1, near: 4, far: 45 });
  for (const [A, B, C, Dq] of lawnBlocks()) g.add(turfBlock(A, B, C, Dq, G.stripe, turfMat));
  // 道路 + 标线
  const road = (r) => plane(r, new THREE.MeshStandardMaterial({ map: rep(asphalt, r, 10, 10), roughness: 0.9 }), 0.05);
  const RB = G.roadBack, RR = G.roadRight, line = new THREE.MeshStandardMaterial({ color: 0xe9e9e4, roughness: 0.8 });
  // 纵向沥青覆盖交叉口。横向分两段，接缝处只绘制一层路面。
  for (const [x0, x1] of [[-1500, RR.x - RR.width / 2], [RR.x + RR.width / 2, 1500]]) {
    road({ x0, x1, z0: RB.z - RB.width / 2, z1: RB.z + RB.width / 2 });
  }
  road({ x0: RR.x - RR.width / 2, x1: RR.x + RR.width / 2, z0: -1500, z1: 1500 });
  for (let x = -1500; x < 1500; x += 12) plane({ x0: x, x1: x + 6, z0: RB.z - 0.12, z1: RB.z + 0.12 }, line, 0.12);
  // 右边马路是双向两幅：中间种树的分隔带（路缘石 + 绿地），每幅中间两道车道虚线、外侧一道白实线
  { const m = RR.median / 2, lane = (RR.width / 2 - m) / 3, curb = mat(0xb9bab6, { roughness: 0.9 });
    plane({ x0: RR.x - m, x1: RR.x + m, z0: -1500, z1: 1500 }, mat(0x55703f, { roughness: 1 }), 0.14);
    for (const e of [-1, 1]) { g.add(box(0.25, 0.25, 3000, curb, RR.x + e * m, 0.12, 0));
      for (let k = 1; k <= 2; k++) { const x = RR.x + e * (m + k * lane); for (let z = -1500; z < 1500; z += 12) plane({ x0: x - 0.08, x1: x + 0.08, z0: z, z1: z + 6 }, line, 0.12); }
      const xe = RR.x + e * (RR.width / 2 - 0.4); plane({ x0: xe - 0.1, x1: xe + 0.1, z0: -1500, z1: 1500 }, line, 0.12); } }
  return g;
}

// ---------- 远山 ----------
// 依据（都是低精度环境信息，只求方位、远近层次和高低大致对）：
// 真实距离是几到十几公里，这里压到 1.6–4 公里、按视角把高度缩小（相机远裁面 6000 米），远近层次交给随高度变稀的雾。
// 每段山是一条有前坡、山脊、后坡的立体带子，能被太阳照出明暗；颜色只给近处林木的深绿，远处的蓝灰全靠空气透视。
export function buildMountains() {
  const g = new THREE.Group();
  const mat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1, metalness: 0 });
  const hash = (n) => { const x = Math.sin(n * 127.1) * 43758.5453; return x - Math.floor(x); };
  const vnoise = (x, seed) => { const i = Math.floor(x), f = x - i, u = f * f * (3 - 2 * f); return hash(i + seed * 57.3) * (1 - u) + hash(i + 1 + seed * 57.3) * u; };
  const fbm = (x, seed) => { let a = 0.5, s = 0, fr = 1; for (let o = 0; o < 5; o++) { s += a * vnoise(x * fr, seed + o * 13.1); fr *= 2.03; a *= 0.5; } return s / 0.97; };
  // a0/a1：场地坐标里的方位角（度，atan2(z, x)，−90 = 舞台正后方）；r：距场地中心；h0/h1：山脊高度范围；color：山体本色
  const ridge = ({ a0, a1, r, h0, h1, depth, seed, color, rough = 1, behindCamp = false }) => {
    const n = Math.max(24, Math.round(((a1 - a0) * Math.PI / 180) * r / 18));
    const pos = [], col = [], idx = [];
    const base = new THREE.Color(color), dark = base.clone().multiplyScalar(0.72);
    for (let i = 0; i <= n; i++) {
      const t = i / n, ang = (a0 + (a1 - a0) * t) * Math.PI / 180;
      const edge = Math.min(1, Math.min(t, 1 - t) * 7);                       // 两头压低，不出现刀切的断面
      const peak = Math.pow(fbm(t * 6 * rough + seed, seed), 1.6) * 1.5 + 0.25 * fbm(t * 31 + seed, seed + 3);
      const h = (h0 + (h1 - h0) * Math.min(1, peak)) * (0.25 + 0.75 * Math.sqrt(edge));
      const ux = Math.cos(ang), uz = Math.sin(ang);
      // 前坡脚、山脊、后坡脚三排点（前坡朝场地）
      const rows = [[r - depth * 0.55, -12], [r + depth * 0.05 * (fbm(t * 9, seed + 7) - 0.5), h], [r + depth * 0.45, h * 0.35]];
      // 已建模的矿坑自带前坡。此段背景山脊后退，避免另一块远山穿过坑底、草坪和帐篷。
      const deg = ang * 180 / Math.PI;
      const shift = behindCamp ? 410 * THREE.MathUtils.smoothstep(deg,-151,-132) * (1-THREE.MathUtils.smoothstep(deg,-82,-64)) : 0;
      for (const [rr, y] of rows) { pos.push(ux * (rr+shift), y, uz * (rr+shift)); const c = y > h * 0.5 ? base : dark; col.push(c.r, c.g, c.b); }
    }
    for (let i = 0; i < n; i++) for (let k = 0; k < 2; k++) {
      const a = i * 3 + k, b = (i + 1) * 3 + k;
      idx.push(a, b, a + 1, b, b + 1, a + 1);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    geo.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
    geo.setIndex(idx); geo.computeVertexNormals();
    const m = new THREE.Mesh(geo, mat); m.frustumCulled = false; g.add(m);
  };
  // 舞台后方：近处林木低山 + 后面一层远山
  ridge({ a0: -160, a1: -30, r: 1650, h0: 28, h1: 95, depth: 520, seed: 3.1, color: 0x29402a, behindCamp: true });
  ridge({ a0: -175, a1: -10, r: 2700, h0: 70, h1: 165, depth: 700, seed: 8.4, color: 0x34483a, rough: 1.3 });
  ridge({ a0: -40, a1: 70, r: 3500, h0: 110, h1: 250, depth: 900, seed: 5.7, color: 0x3a4a44, rough: 1.6 });
  // 草坪后方和 −x 一侧：很低很淡的一圈
  ridge({ a0: 60, a1: 165, r: 3800, h0: 40, h1: 120, depth: 800, seed: 1.9, color: 0x3d4b45, rough: 1.2 });
  ridge({ a0: 150, a1: 215, r: 3300, h0: 30, h1: 85, depth: 700, seed: 6.6, color: 0x3d4b45 });
  g.userData.dynamic = true;   // 不并进静态网格（合并会丢掉顶点颜色）
  return g;
}

// ---------- 外围设施的小部件 ----------
const DEG = Math.PI / 180;
// 把物体放到 (x, z)，长边方向角 rot（度，从 +x 转向 +z 为正，和 layout 里的约定一致）
function put(o, x, z, rot = 0) { o.position.set(x, 0, z); o.rotation.y = -rot * DEG; return o; }
const matCache = {};
const mat = (color, extra = {}) => { const k = color + JSON.stringify(extra); return (matCache[k] ||= new THREE.MeshStandardMaterial({ color, roughness: 0.75, ...extra })); };
const WHITE_TENT = () => mat(0xf4f4f0, { roughness: 0.65, side: THREE.DoubleSide });

// 人字顶帐篷：长 len（沿局部 x）、宽 wid、檐高 h、屋脊再高 ridge；四周立柱每 5 米一根；walls=true 时四面围白布
function gableTent(len, wid, h, ridge, { walls = false, mat: m = WHITE_TENT() } = {}) {
  const g = new THREE.Group(), half = wid / 2, slope = Math.hypot(half, ridge), a = Math.atan2(ridge, half);
  for (const e of [-1, 1]) { const r = new THREE.Mesh(new THREE.BoxGeometry(len + 0.3, 0.06, slope + 0.25), m); r.rotation.x = e * a; r.position.set(0, h + ridge / 2, (e * half) / 2); r.castShadow = r.receiveShadow = true; g.add(r); }
  const tri = new THREE.Shape([new THREE.Vector2(-half, 0), new THREE.Vector2(half, 0), new THREE.Vector2(0, ridge)]), tg = new THREE.ShapeGeometry(tri);
  for (const e of [-1, 1]) { const t = new THREE.Mesh(tg, m); t.rotation.y = Math.PI / 2; t.position.set((e * len) / 2, h, 0); g.add(t); }
  const n = Math.max(1, Math.round(len / 5));
  for (let i = 0; i <= n; i++) for (const e of [-1, 1]) g.add(box(0.1, h, 0.1, mat(0xc9ccd0, { metalness: 0.7, roughness: 0.35 }), -len / 2 + (i * len) / n, h / 2, e * half));
  if (walls) for (const e of [-1, 1]) { g.add(box(len, h, 0.04, m, 0, h / 2, e * half)); g.add(box(0.04, h, wid, m, (e * len) / 2, h / 2, 0)); }
  return g;
}
function peakRow(n, bay, wid, h, peak, m = WHITE_TENT()) {
  const g = new THREE.Group(), geo = new THREE.ConeGeometry(Math.SQRT1_2, 1, 4, 1, true); geo.rotateY(Math.PI / 4);
  for (let i = 0; i < n; i++) { const r = new THREE.Mesh(geo, m); r.scale.set(bay, peak, wid); r.position.set((i - (n - 1) / 2) * bay, h + peak / 2, 0); r.castShadow = true; g.add(r); }
  const post = mat(0xc9ccd0, { metalness: 0.7, roughness: 0.35 });
  for (let i = 0; i <= n; i++) for (const e of [-1, 1]) g.add(box(0.1, h, 0.1, post, (i - n / 2) * bay, h / 2, (e * wid) / 2));
  for (const e of [-1, 1]) g.add(box(n * bay, 0.35, 0.04, m, 0, h - 0.17, (e * wid) / 2));   // 檐口一圈垂边
  return g;
}
// 折叠帐篷（四角立柱 + 四坡顶 + 一圈垂边），颜色按照片
function popupTent(size, color) {
  const g = new THREE.Group(), h = 2.5, s = size, m = mat(color, { roughness: 0.7, side: THREE.DoubleSide });
  const roof = new THREE.Mesh(new THREE.ConeGeometry(s * 0.71, s * 0.22, 4, 1, true), m); roof.rotation.y = Math.PI / 4; roof.position.y = h + s * 0.11; roof.castShadow = true; g.add(roof);
  for (const [x, z, w, d] of [[0, -s / 2, s, 0.02], [0, s / 2, s, 0.02], [-s / 2, 0, 0.02, s], [s / 2, 0, 0.02, s]]) g.add(box(w, 0.3, d, m, x, h - 0.15, z));
  for (const [x, z] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) g.add(box(0.06, h, 0.06, MAT.steel, (x * s) / 2, h / 2, (z * s) / 2));
  return g;
}
function starTent(size) {
  const g = new THREE.Group(), m = WHITE_TENT(), geo = new THREE.BufferGeometry(), H = size * 0.75, n = 12, verts = [];
  for (let i = 0; i < n; i++) { const a0 = (i / n) * Math.PI * 2, a1 = ((i + 1) / n) * Math.PI * 2; const r0 = i % 2 ? size * 0.45 : size, r1 = (i + 1) % 2 ? size * 0.45 : size, h0 = i % 2 ? H * 0.6 : 1.6, h1 = (i + 1) % 2 ? H * 0.6 : 1.6; verts.push(0, H, 0, Math.cos(a0) * r0, h0, Math.sin(a0) * r0, Math.cos(a1) * r1, h1, Math.sin(a1) * r1); }
  geo.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3)); geo.computeVertexNormals();
  const mem = new THREE.Mesh(geo, m); mem.castShadow = true; g.add(mem); g.add(box(0.2, H, 0.2, MAT.steel, 0, H / 2, 0));
  for (let i = 0; i < n; i += 2) { const a0 = (i / n) * Math.PI * 2; g.add(box(0.08, 1.6, 0.08, MAT.steel, Math.cos(a0) * size, 0.8, Math.sin(a0) * size)); }
  return g;
}
// 画布贴图（本文件自用）
function canvasTex(w, h, draw) { const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t; }
function muralTexture() {
  return canvasTex(1024, 160, (g, w, h) => {
    g.fillStyle = '#f2efe6'; g.fillRect(0, 0, w, h);
    g.fillStyle = '#2f6db5'; g.beginPath(); g.ellipse(70, h * 0.62, 60, 34, -0.2, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#f2c230'; g.fillRect(150, h * 0.5, 90, h * 0.32);
    g.fillStyle = '#111'; g.beginPath(); g.arc(330, h * 0.5, 52, 0, Math.PI * 2); g.fill();
    g.strokeStyle = '#444'; g.lineWidth = 2; for (let r = 18; r < 50; r += 7) { g.beginPath(); g.arc(330, h * 0.5, r, 0, Math.PI * 2); g.stroke(); }
    g.fillStyle = '#e8e2d0'; g.beginPath(); g.arc(330, h * 0.5, 12, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#111'; for (const [x, y] of [[120, 40], [200, 30], [430, 45], [520, 36]]) { g.beginPath(); g.ellipse(x, y + 22, 9, 6, -0.4, 0, Math.PI * 2); g.fill(); g.fillRect(x + 7, y - 6, 3, 28); }
    for (let i = 0; i < 9; i++) { g.fillStyle = i % 2 ? '#111' : '#f8f8f8'; g.fillRect(420 + i * 22, h - 46, 20, 40); }
    g.fillStyle = '#e5533d'; g.fillRect(660, h * 0.35, 46, 60); g.fillStyle = '#f4a8c0'; g.beginPath(); g.arc(683, h * 0.3, 20, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#2f6db5'; g.fillRect(760, h * 0.55, 120, 40); g.fillStyle = '#f2c230'; g.beginPath(); g.arc(940, h * 0.45, 30, 0, Math.PI * 2); g.fill();
  });
}
function shopSignTexture(n) {
  return canvasTex(128 * n, 32, (g, w, h) => {
    g.fillStyle = '#b8262c'; g.fillRect(0, 0, w, h);
    for (let i = 0; i < n; i++) { const x0 = i * 128; g.fillStyle = '#f3e3c0'; g.fillRect(x0 + 34, 6, 60, 20); g.fillStyle = '#8a1a1e'; for (let k = 0; k < 4; k++) g.fillRect(x0 + 40 + k * 13, 10, 9, 12);
      g.fillStyle = '#e8c35a'; g.fillRect(x0 + 6, 13, 18, 6); g.fillRect(x0 + 104, 13, 18, 6); g.fillStyle = '#6e1216'; g.fillRect(x0, 0, 2, h); }
  });
}
// 一组相同的小部件批量摆放：parts = [[几何体, 材质, 局部矩阵]]，places = 每个摆放位置的矩阵；每个部件一张 InstancedMesh
function hoardingTexture() {
  return canvasTex(256, 32, (g, w, h) => { g.fillStyle = '#eceeee'; g.fillRect(0, 0, w, h); g.fillStyle = '#b8262c'; g.fillRect(150, 6, 80, 16); g.strokeStyle = 'rgba(0,0,0,0.18)'; for (let x = 0; x < w; x += 32) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, h); g.stroke(); } });
}

// ---------- 外围设施 ----------
export function buildSurroundings() {
  const out = [], S = LAYOUT.site, kit = new TrussKit(0x2a2b2f);
  const white = WHITE_TENT();

  // 围挡
  { const tex = hoardingTexture(); tex.wrapS = THREE.RepeatWrapping; const fence = new THREE.Group();
    for (const pl of S.fenceLines) for (let i = 0; i < pl.length - 1; i++) {
      const [x0, z0] = pl[i], [x1, z1] = pl[i + 1], L = Math.hypot(x1 - x0, z1 - z0), t = tex.clone(); t.needsUpdate = true; t.repeat.set(L / 16, 1);
      const m = new THREE.Mesh(new THREE.PlaneGeometry(L, 2.4), new THREE.MeshStandardMaterial({ map: t, side: THREE.DoubleSide, roughness: 0.7 })); m.position.set((x0 + x1) / 2, 1.2, (z0 + z1) / 2); m.rotation.y = -Math.atan2(z1 - z0, x1 - x0); m.castShadow = true; fence.add(m);
    }
    out.push(labeled(fence, null)); }

  // 右侧长白棚沿侧边走道。红色公共门架归入口组件。
  { const T = S.eastGateTent;
    out.push(labeled(put(gableTent(T.len, T.wid, 3, 1.6), T.x, T.z, T.rot), '右侧长白棚'));
  }

  { const T = LAYOUT.lawnItems.redTent; out.push(put(popupTent(T.size, 0xb8262c), T.x, T.z, -15)); }
  { const T = S.redTentRight; out.push(put(popupTent(T.size, 0xb8262c), T.x, T.z, 12.6)); }

  { const R = S.shopRow, [ax, az] = R.a, [bx, bz] = R.b, L = Math.hypot(bx - ax, bz - az), rot = Math.atan2(bz - az, bx - ax) / DEG, n = R.n, cell = L / n;
    const g = put(new THREE.Group(), (ax + bx) / 2, (az + bz) / 2, rot), D = R.depth, H = R.h, white = mat(0xf1f1ee), red = mat(0xb8262c, { roughness: 0.6 });
    g.add(box(L + 0.4, 0.22, D + 1.2, white, 0, H + 0.11, -0.6));                         // 平屋顶，朝草坪挑出 1.2 米当雨棚
    g.add(box(L, H, 0.15, mat(0xdedfdb), 0, H / 2, D / 2));                                // 后墙
    const signs = shopSignTexture(n), sign = new THREE.Mesh(new THREE.BoxGeometry(L, 0.95, 0.12), [red, red, red, red, new THREE.MeshStandardMaterial({ map: signs, roughness: 0.6 }), red]);
    sign.position.set(0, H - 0.2, -D / 2 - 1.15); sign.rotation.y = Math.PI; g.add(sign);   // 红色门头（每格中间一块浅色字牌）
    for (let i = 0; i <= n; i++) g.add(box(0.14, H, D, mat(0xe8e8e4), -L / 2 + i * cell, H / 2, 0));   // 隔墙
    for (let i = 0; i < n; i++) { const x = -L / 2 + (i + 0.5) * cell;
      g.add(box(cell - 0.3, 1.05, 0.55, red, x, 0.53, -D / 2 + 0.35));                     // 红色柜台
      g.add(box(cell - 0.2, 0.05, 0.75, mat(0xf4f4f0), x, 1.08, -D / 2 + 0.35));            // 柜台面
      g.add(box(cell - 0.4, 0.28, 0.32, mat(0x8d9399, { metalness: 0.5, roughness: 0.4 }), x, H - 0.85, -D / 2 + 0.2));  // 卷帘门卷轴箱
      g.add(box(cell - 0.8, 1.0, 0.06, mat([0x2b2d30, 0xd9c08a, 0x2b2d30, 0xe2e4e6][i % 4], { emissive: 0x222222 }), x, 2.1, D / 2 - 0.12));  // 后墙价目灯箱
      g.add(box(cell - 0.6, 0.9, 0.5, mat(0xc9ccd0, { metalness: 0.4 }), x, 0.45, D / 2 - 0.4)); }   // 后面的操作台
    out.push(labeled(g, '摊位'));
  }
  // 白色活动板房：平顶，屋面一排空调外机；朝草坪一侧是敞开的廊（柱子 + 挑檐），里面是一间间门窗
  { const R = S.acHouse, [ax, az] = R.a, [bx, bz] = R.b, L = Math.hypot(bx - ax, bz - az), rot = Math.atan2(bz - az, bx - ax) / DEG, n = R.units, cell = L / n;
    const g = put(new THREE.Group(), (ax + bx) / 2, (az + bz) / 2, rot), D = R.depth, H = R.h, white = mat(0xf0f1f0), back = D - 2;
    g.add(box(L, 0.25, D, white, 0, H + 0.12, 0));                                          // 屋顶
    g.add(box(L, H, back, mat(0xe6e8e8), 0, H / 2, D / 2 - back / 2));                       // 房间
    g.add(box(L, 0.45, 0.08, mat(0x9aa3ab), 0, H - 0.2, -D / 2 + 0.04));                     // 廊檐口（灰色压边）
    for (let i = 0; i <= n; i++) g.add(box(0.12, H, 0.12, mat(0xc9ccd0, { metalness: 0.5 }), -L / 2 + i * cell, H / 2, -D / 2 + 0.1));   // 廊柱
    for (let i = 0; i < n; i++) { const x = -L / 2 + (i + 0.5) * cell, fz = D / 2 - back - 0.02;
      g.add(box(0.9, 2.1, 0.05, mat(0x8c99a3), x - cell * 0.25, 1.05, fz));                 // 门
      g.add(box(1.4, 1.0, 0.05, mat(0x30404c, { roughness: 0.2, metalness: 0.4 }), x + cell * 0.18, 1.6, fz));   // 窗
      const ac = new THREE.Group(); ac.position.set(x, H + 0.25, 0.6); ac.add(box(1.0, 0.65, 0.45, mat(0xd2d5d8), 0, 0.33, 0));
      const fan = new THREE.Mesh(new THREE.CircleGeometry(0.22, 16), mat(0x3a3d40)); fan.position.set(0, 0.33, -0.23); fan.rotation.y = Math.PI; ac.add(fan); g.add(ac); }   // 屋面空调外机
    out.push(labeled(g, '活动板房'));
  }
  { const K = S.kiosks, [ax, az] = K.a, [bx, bz] = K.b, n = K.kinds.length, rot = Math.atan2(bz - az, bx - ax) / DEG;
    K.kinds.forEach((kind, i) => {
      const t = (i + 0.5) / n, x = ax + (bx - ax) * t, z = az + (bz - az) * t; let g;
      if (kind === 'gazebo') g = popupTent(4, 0xf4f4f0);
      else {
        g = new THREE.Group(); const body = { yellow: 0xd9b45c, red: 0xb33a32, hut: 0xb98d7e }[kind];
        g.add(box(3, 2.5, 3, mat(body, { roughness: 0.85 }), 0, 1.25, 0));
        g.add(box(3.3, 0.18, 3.3, mat(kind === 'hut' ? 0x8c6b5c : 0x3d4247), 0, 2.6, 0));
        if (kind === 'yellow') for (const e of [-1, 1]) g.add(box(3.3, 0.5, 0.06, mat(0x3d4247), 0, 2.95, e * 1.6));
        g.add(box(2.2, 1.0, 0.05, mat(0x2a2b2f), 0, 1.5, -1.53));   // 售卖窗口
      }
      out.push(put(g, x, z, rot));
    });
    out.push(labeled(put(new THREE.Group(), (ax + bx) / 2, (az + bz) / 2), '售卖亭'));
  }
  // 左后角白色平顶房：朝外一面的壁画
  { const M = S.muralHouse, g = put(new THREE.Group(), M.x, M.z, M.rot), w = mat(0xf2f2ee), mural = new THREE.MeshStandardMaterial({ map: muralTexture(), roughness: 0.8 });
    const b = new THREE.Mesh(new THREE.BoxGeometry(M.len, M.h, M.wid), [w, w, mat(0xe4e6e6), w, mural, w]); b.position.y = M.h / 2; b.castShadow = b.receiveShadow = true; g.add(b);
    out.push(labeled(g, null)); }
  { const M = S.whiteHouse; const g = put(new THREE.Group(), M.x, M.z, M.rot); g.add(box(M.len, M.h, M.wid, mat(0xf0f0ec), 0, M.h / 2, 0)); out.push(g); }
  { const T = S.grandstand, g = put(new THREE.Group(), T.x, T.z, T.rot), step = T.depth / T.rows, rise = T.h / T.rows, aisles = [-T.len / 3, 0, T.len / 3], aw = 1.4;
    const tread = mat(0xb9bcbf), seat = mat(0x3c4652, { roughness: 0.6 }), frame = mat(0x7d8389, { metalness: 0.6, roughness: 0.4 });
    for (let i = 0; i < T.rows; i++) { const y = rise * (i + 1), z = -T.depth / 2 + (i + 0.5) * step;
      g.add(box(T.len, 0.15, step, tread, 0, y - 0.07, z));                                   // 台阶面
      g.add(box(T.len, rise, 0.06, mat(0x9ea2a6), 0, y - rise / 2, z - step / 2));             // 踢面
      for (let k = 0; k <= aisles.length; k++) { const x0 = k === 0 ? -T.len / 2 : aisles[k - 1] + aw / 2, x1 = k === aisles.length ? T.len / 2 : aisles[k] - aw / 2;
        g.add(box(x1 - x0 - 0.2, 0.42, 0.45, seat, (x0 + x1) / 2, y + 0.21, z + step * 0.15)); } }   // 座椅条（过道处断开）
    for (let i = 0; i < 6; i++) for (const e of [-1, 1]) { const x = -T.len / 2 + (i * T.len) / 5, zb = -T.depth / 2 + ((e + 1) / 2) * T.depth * 0.98, hh = rise * T.rows * ((e + 1) / 2) + 0.2; g.add(box(0.2, hh, 0.2, frame, x, hh / 2, zb)); }   // 钢立柱
    g.add(box(T.len, 1.1, 0.06, mat(0xd0d3d6, { metalness: 0.6 }), 0, T.h + 0.55, T.depth / 2));   // 最高一排后面的栏杆
    out.push(labeled(g, '看台')); }
  // 白帐篷
  { const T = S.bigTent; out.push(labeled(put(peakRow(T.bays, T.len / T.bays, T.wid, T.h, T.ridge), T.x, T.z, T.rot), '大白帐篷')); }
  { const T = S.longShed; out.push(put(gableTent(T.len, T.wid, T.h, 1.4, { walls: true }), T.x, T.z, T.rot)); }
  { const T = S.smallTent; out.push(put(gableTent(T.len, T.wid, T.h, 1.4), T.x, T.z, T.rot)); }
  // 白色宝塔帐篷：四根立柱 + 一圈垂边 + 下缓上陡的尖顶（四坡、往里凹的曲面），顶尖一根小杆
  { const P = S.pagodas, sz = P.size, h = 2.6, prof = [[0.71, 0], [0.5, 0.12], [0.3, 0.32], [0.14, 0.62], [0.02, 0.95]].map(([r, y]) => new THREE.Vector2(r * sz, y * sz * 0.55));
    const roofGeo = new THREE.LatheGeometry(prof, 4); roofGeo.rotateY(Math.PI / 4);
    for (const [x, z] of P.list) { const g = put(new THREE.Group(), x, z, -10), r = new THREE.Mesh(roofGeo, WHITE_TENT()); r.position.y = h; r.castShadow = true; g.add(r);
      for (const [a, b] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) g.add(box(0.08, h, 0.08, MAT.steel, (a * sz) / 2, h / 2, (b * sz) / 2));
      for (const [px, pz, w, d] of [[0, -sz / 2, sz, 0.03], [0, sz / 2, sz, 0.03], [-sz / 2, 0, 0.03, sz], [sz / 2, 0, 0.03, sz]]) g.add(box(w, 0.35, d, WHITE_TENT(), px, h - 0.17, pz));
      g.add(box(0.05, 0.6, 0.05, MAT.steel, 0, h + sz * 0.55 * 0.95 + 0.3, 0)); out.push(g); }
    out.push(labeled(put(new THREE.Group(), P.list[2][0], P.list[2][1]), '尖顶帐篷')); }
  // 左侧绿漆地面（两块）
  for (const F of [S.paintedFloor, S.paintedFloor2]) { const m = new THREE.Mesh(new THREE.PlaneGeometry(F.x1 - F.x0, F.z1 - F.z0), mat(F.color, { roughness: 0.9 })); m.rotation.x = -Math.PI / 2; m.position.set((F.x0 + F.x1) / 2, 0.04, (F.z0 + F.z1) / 2); m.receiveShadow = true; out.push(m); }
  // 右上角服务道（柏油）
  { const R = S.serviceRoad, t = TX.asphaltTexture().clone(); t.needsUpdate = true; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(R.width / 10, (R.z1 - R.z0) / 10);
    const m = new THREE.Mesh(new THREE.PlaneGeometry(R.width, R.z1 - R.z0), new THREE.MeshStandardMaterial({ map: t, roughness: 0.9 })); m.rotation.x = -Math.PI / 2; m.position.set(R.x, 0.05, (R.z0 + R.z1) / 2); m.receiveShadow = true; out.push(m); }

  { const T = S.tealFacility, g = put(new THREE.Group(), T.x, T.z, T.rot);
    g.add(box(T.len, T.h, T.wid, mat(T.color), 0, T.h / 2, 0));
    out.push(labeled(g, '右侧青绿色设施')); }

  // 右侧走道边两个小亭
  for (const [x, z] of S.rightKiosks) { const g = put(new THREE.Group(), x, z, 77.4); g.add(box(4, 2.6, 3, mat(0xe9e9e4), 0, 1.3, 0)); g.add(box(4.3, 0.2, 3.3, mat(0x3d4247), 0, 2.7, 0)); g.add(box(3, 1, 0.05, mat(0x2a2b2f), 0, 1.5, -1.53)); out.push(g); }
  // 右上角服务道上的白色厢式货车
  for (const [x, z, rot] of S.trucks) { const g = put(new THREE.Group(), x, z, rot); g.add(box(7, 3, 2.4, mat(0xf2f2f0), -0.8, 2.0, 0)); g.add(box(2, 2.2, 2.3, mat(0xdfe3e6), 3.6, 1.6, 0)); for (const u of [-3, 0.5, 3.6]) for (const e of [-1, 1]) { const w = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.45, 0.3, 12), mat(0x1a1a1a)); w.rotation.x = Math.PI / 2; w.position.set(u, 0.45, e * 1.1); g.add(w); } out.push(g); }

  // 舞台左后方草地：星形张拉膜、小白折叠棚、白色小棚、一排尖顶帐篷、深色围挡
  for (const [x, z, r] of S.starTents) out.push(labeled(put(starTent(r), x, z), null));
  out.push(labeled(put(new THREE.Group(), S.starTents[0][0], S.starTents[0][1]), '星形篷'));
  for (const [x, z, size, rot] of S.gazebos) out.push(put(popupTent(size, 0xf4f4f0), x, z, rot));
  for (const [x, z, l, w, rot] of S.sheds) out.push(put(gableTent(l, w, 2.8, 1.0, { walls: true }), x, z, rot));
  { const R = S.tentRow, n = Math.round((R.z1 - R.z0) / R.size); out.push(labeled(put(peakRow(n, (R.z1 - R.z0) / n, R.size, 2.6, 2.2), R.x, (R.z0 + R.z1) / 2, 90), '白色尖顶帐篷')); }
  { const dark = mat(0x2a2c2e, { roughness: 0.8, side: THREE.DoubleSide }); for (const [x0, z0, x1, z1] of S.starLawnFence) { const L = Math.hypot(x1 - x0, z1 - z0), m = new THREE.Mesh(new THREE.PlaneGeometry(L, 2.4), dark); m.position.set((x0 + x1) / 2, 1.2, (z0 + z1) / 2); m.rotation.y = -Math.atan2(z1 - z0, x1 - x0); out.push(m); } }

  // 顶部后台：白色集装箱 / 房车
  { const cm = [0xf0f1f2, 0xe2e5e8, 0xd5d9dd].map((c) => mat(c, { roughness: 0.6, metalness: 0.2 }));
    for (const [x, z, l, w, rot, n] of S.containers) { const g = put(new THREE.Group(), x, z, rot); for (let i = 0; i < n; i++) g.add(box(l, 2.7, w - 0.3, cm[i % 3], 0, 1.35, (i - (n - 1) / 2) * w)); out.push(g); } }

  // 树
  const trees = [], r = TX.rng(55), RB = LAYOUT.ground.roadBack, RR = LAYOUT.ground.roadRight;
  for (const [x0, x1, z0, z1, n] of S.treeZones) for (let i = 0; i < n; i++) trees.push([x0 + r() * (x1 - x0), z0 + r() * (z1 - z0), 0.9 + r() * 0.6]);
  const [eyeX, , eyeZ] = VIEWS.marsSignAudience.pos, { x0: signX, z0: signZ } = campFrame();
  for (let x = -450; x <= 450; x += 9) for (const dz of [-RB.width / 2 - 3, RB.width / 2 + 3]) {
    const tx = x + (r() - 0.5) * 2, tz = RB.z + dz, scale = 0.8 + r() * 0.4;
    const t = (tz - eyeZ) / (signZ - eyeZ);
    if (Math.abs(tx - THREE.MathUtils.lerp(eyeX, signX, t)) > 35 * t + 5) trees.push([tx, tz, scale]);
  }
  // 马路两边和中间分隔带的树；路东边那排在乌托邦西沿那一段只剩稀疏几棵（导览航拍：路和摊位之间只有窄窄一条绿带）
  const U = LAYOUT.utopia.lot, uz0 = Math.min(...U.map((p) => p[1])) - 4, uz1 = Math.max(...U.map((p) => p[1])) + 4;
  for (let z = -450; z <= 500; z += 9) for (const dx of [-RR.width / 2 - 3, 0, RR.width / 2 + 3]) { const zz = z + (r() - 0.5) * 2, sc = 0.8 + r() * 0.4; if (dx > 0 && zz > uz0 && zz < uz1 && (Math.round(z / 9) % 4 || Math.abs(zz - LAYOUT.utopia.gate[1]) < 14)) continue; trees.push([RR.x + dx, zz, sc]); }
  for (let i = 0; i < 300; i++) { const a = r() * Math.PI * 2, d = 420 + r() * 300; trees.push([Math.cos(a) * d, Math.sin(a) * d + 30, 0.8 + r() * 0.7]); }
  // 做法：三团起伏的球拼成一个冠，顶点色从冠底暗到冠顶亮，法线按整个冠的球面算（叶团不会显出一块块的面）；每棵树颜色、大小、扁圆各不同。
  const crownGeo = (() => {
    const blobs = [[0, 0, 0, 1], [0.55, 0.35, 0.2, 0.72], [-0.45, 0.28, -0.3, 0.68], [0.1, 0.6, -0.35, 0.6]].map(([bx, by, bz, br], k) => {
      const g2 = new THREE.IcosahedronGeometry(br, 2), P = g2.attributes.position;
      for (let i = 0; i < P.count; i++) { const v = V(P.getX(i), P.getY(i), P.getZ(i)); const n2 = Math.sin(v.x * 7.1 + k) * Math.sin(v.y * 6.3 + 2 * k) * Math.sin(v.z * 5.7 + 3 * k); v.multiplyScalar(1 + 0.16 * n2); P.setXYZ(i, v.x + bx, v.y + by, v.z + bz); }
      return g2.toNonIndexed();
    });
    const g3 = mergeGeometries(blobs, false), P = g3.attributes.position, N = new Float32Array(P.count * 3), Cc = new Float32Array(P.count * 3);
    for (let i = 0; i < P.count; i++) {
      const x = P.getX(i), y = P.getY(i) - 0.2, z = P.getZ(i), l = Math.hypot(x, y, z) || 1;
      N[i * 3] = x / l; N[i * 3 + 1] = y / l; N[i * 3 + 2] = z / l;
      const t = THREE.MathUtils.clamp((P.getY(i) + 0.9) / 1.9, 0, 1), k2 = 0.42 + 0.58 * t;
      Cc[i * 3] = k2; Cc[i * 3 + 1] = k2; Cc[i * 3 + 2] = k2;
    }
    g3.setAttribute('normal', new THREE.BufferAttribute(N, 3)); g3.setAttribute('color', new THREE.BufferAttribute(Cc, 3));
    return g3;
  })();
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), sc = V(1, 1, 1), p = V(0, 0, 0), up = V(0, 1, 0), tint = new THREE.Color();
  const trunk = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.2, 0.32, 4, 6), new THREE.MeshStandardMaterial({ color: 0x4a3a2a, roughness: 1 }), trees.length);
  const crown = new THREE.InstancedMesh(crownGeo, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.95 }), trees.length);
  const greens = [0x5a6f2c, 0x4d6a2a, 0x667a30, 0x41592a, 0x6f7f34, 0x52662f];
  trees.forEach(([x, z, s], i) => {
    const S2 = s * 1.25, wide = 3.4 * S2 * (0.85 + r() * 0.3);
    m.compose(p.set(x, 2 * S2, z), q.identity(), sc.set(S2, S2, S2)); trunk.setMatrixAt(i, m);
    m.compose(p.set(x, 4.6 * S2 + wide * 0.55, z), q.setFromAxisAngle(up, r() * 6.28), sc.set(wide, wide * (0.75 + r() * 0.25), wide)); crown.setMatrixAt(i, m);
    crown.setColorAt(i, tint.set(greens[i % greens.length]).multiplyScalar(0.85 + r() * 0.3));
  });
  trunk.castShadow = crown.castShadow = true; crown.receiveShadow = true; out.push(trunk, crown);

  const facade = canvasTex(64, 128, (x) => { x.fillStyle = '#c9c2b4'; x.fillRect(0, 0, 64, 128); x.fillStyle = '#5d6b78'; for (let yy = 6; yy < 128; yy += 12) for (let xx = 4; xx < 64; xx += 10) x.fillRect(xx, yy, 6, 7); }); facade.wrapS = facade.wrapT = THREE.RepeatWrapping;
  for (const [x, z, w, h, d] of [[-420, -260, 120, 22, 40], [-380, 160, 70, 18, 40], [520, -420, 60, 60, 20], [580, -380, 60, 70, 20], [640, -440, 60, 55, 20], [-600, -600, 200, 30, 60]]) { const t = facade.clone(); t.needsUpdate = true; t.repeat.set(w / 8, h / 12); out.push(box(w, h, d, new THREE.MeshStandardMaterial({ map: t, roughness: 0.9 }), x, h / 2, z)); }

  // 高杆灯
  for (const [x, z, h] of LAYOUT.lightMasts) { const g = new THREE.Group(); g.position.set(x, 0, z); const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.55, h, 12), MAT.steel); pole.position.y = h / 2; pole.castShadow = true; g.add(pole); g.add(box(3.2, 0.15, 0.15, MAT.steel, 0, h - 0.2, 0)); g.add(box(3.2, 0.15, 0.15, MAT.steel, 0, h + 0.9, 0)); for (let k = 0; k < 4; k++) for (const yy of [h + 0.15, h + 1.25]) { const f = box(0.6, 0.45, 0.25, mat(0x2a2c2e), -1.2 + k * 0.8, yy - 0.2, 0.2); f.rotation.x = 0.35; g.add(f); } /* 顶上灯架：两层横梁各挂 4 盏投光灯（9622 远处高杆灯是方形灯架） */ out.push(labeled(g, '高杆灯')); }

  // 火星乌托邦（马路对面）：金字塔和神树在 fan-installation.js，场地、摊位、门头、巨人和各个装置在 site/utopia.js（位置见 layout 的 utopia）
  const Z = LAYOUT.fanZone, fz = new THREE.Group();
  const installation = new THREE.Group();
  installation.name = '乌托邦悬挂装置';
  installation.add(...buildFanInstallation(Z));
  fz.add(installation, buildUtopia());
  const fzLabel = new THREE.Group(); fzLabel.position.set(Z.x, 0, Z.z); out.push(labeled(fz, null), labeled(fzLabel, '火星乌托邦'));

  out.push(...buildMarsCamp());   // 舞台后方山脚：华莱坞字牌、矿坑崖壁、粉黛草、火星营地（site/mars-camp.js）

  out.push(kit.build());
  return out;
}
