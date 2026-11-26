// 屏塔浮雕装饰面（区域 A）。依据：
//     构成：黑色 LED 底板上贴一整面砂岩色浮雕——三圈同心环带（外、中、内），每圈是两道石边夹一圈蓝色格子，格子之间是放射状石肋；
//     外圈和中圈外沿一圈尖刺；圆心一块半圆石盘；接缝处一根竖向雕花石柱；外侧上角一座带圆顶和拱窗的小塔楼；
//     外侧中部一道横梁伸进来；下部是一整片石座，台阶从外侧斜着爬上去，石座上有尖拱门洞，接缝边一块垂下来的方形纹章块。
//     中圈 5.8–7.0 米，内圈 2.4–3.3 米，圆心石盘约 2 米。
//     门洞两侧各一根带柱头的雕花柱，拱顶外沿一圈蓝绿色饰带；洞底几级台阶往里走。
//   · 连拱（arcade，两端最外那两座）没有拍到正面清楚的照片，保持原来的做法，只换成同一种石材。
import * as THREE from 'three';
import { MAT, box } from './common.js';

const TAU = Math.PI * 2;

// ---------- 材质（全部共用一份）----------
function canvas(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }
function rng(seed) { let s = seed >>> 0; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); }
function valueNoise(w, h, seed, cells) {
  const r = rng(seed), g = Array.from({ length: (cells + 1) * (cells + 1) }, r), out = new Float32Array(w * h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const fx = (x / w) * cells, fy = (y / h) * cells, i = Math.floor(fx), j = Math.floor(fy), tx = fx - i, ty = fy - j;
    const sx = tx * tx * (3 - 2 * tx), sy = ty * ty * (3 - 2 * ty), G = (a, b) => g[(b % cells) * (cells + 1) + (a % cells)];
    out[y * w + x] = (G(i, j) * (1 - sx) + G(i + 1, j) * sx) * (1 - sy) + (G(i, j + 1) * (1 - sx) + G(i + 1, j + 1) * sx) * sy;
  }
  return out;
}
// 砂岩：底色 + 大块深浅 + 往下流的污渍 + 细颗粒；另出一张法线贴图做风化的凹凸
function sandstone(base, seed) {
  const w = 256, h = 256, c = canvas(w, h), g = c.getContext('2d'), img = g.createImageData(w, h);
  const n1 = valueNoise(w, h, seed, 4), n2 = valueNoise(w, h, seed + 1, 16), n3 = valueNoise(w, h, seed + 2, 48), r = rng(seed + 3);
  const hgt = new Float32Array(w * h);
  for (let i = 0; i < w * h; i++) {
    const streak = Math.max(0, n2[(i % w) + w * Math.floor((i / w) * 0.25)] - 0.55) * 1.2;      // 竖向拉长的污渍
    const k = 0.78 + 0.32 * n1[i] + 0.16 * (n3[i] - 0.5) + (r() - 0.5) * 0.06 - streak * 0.35;
    hgt[i] = 0.6 * n2[i] + 0.4 * n3[i];
    img.data[i * 4] = base[0] * k; img.data[i * 4 + 1] = base[1] * k; img.data[i * 4 + 2] = base[2] * k; img.data[i * 4 + 3] = 255;
  }
  g.putImageData(img, 0, 0);
  const map = new THREE.CanvasTexture(c); map.colorSpace = THREE.SRGBColorSpace; map.wrapS = map.wrapT = THREE.RepeatWrapping; map.anisotropy = 8; map.repeat.setScalar(0.25);
  const nc = canvas(w, h), ng = nc.getContext('2d'), ni = ng.createImageData(w, h), H = (x, y) => hgt[((y + h) % h) * w + ((x + w) % w)];
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const dx = (H(x + 1, y) - H(x - 1, y)) * 3, dy = (H(x, y + 1) - H(x, y - 1)) * 3, nz = 1 / Math.hypot(dx, dy, 1), o = (y * w + x) * 4;
    ni.data[o] = (-dx * nz * 0.5 + 0.5) * 255; ni.data[o + 1] = (dy * nz * 0.5 + 0.5) * 255; ni.data[o + 2] = nz * 255; ni.data[o + 3] = 255;
  }
  ng.putImageData(ni, 0, 0);
  const normalMap = new THREE.CanvasTexture(nc); normalMap.wrapS = normalMap.wrapT = THREE.RepeatWrapping; normalMap.repeat.setScalar(0.25);
  return new THREE.MeshStandardMaterial({ map, normalMap, normalScale: new THREE.Vector2(0.9, 0.9), roughness: 0.9 });
}
function ledTiles() {
  const c = canvas(128, 128), g = c.getContext('2d');
  g.fillStyle = '#141b26'; g.fillRect(0, 0, 128, 128);
  g.strokeStyle = '#0a0b0d'; g.lineWidth = 3; for (let i = 0; i <= 128; i += 64) { g.beginPath(); g.moveTo(i, 0); g.lineTo(i, 128); g.moveTo(0, i); g.lineTo(128, i); g.stroke(); }
  const r = rng(9); for (let i = 0; i < 400; i++) { g.fillStyle = `rgba(60,70,90,${0.05 + r() * 0.08})`; g.fillRect(r() * 128, r() * 128, 1, 1); }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(13.2 / 1, 28 / 1);
  return t;
}
function blueCells() {
  const c = canvas(64, 64), g = c.getContext('2d'), r = rng(17);
  g.fillStyle = '#4d6788'; g.fillRect(0, 0, 64, 64);
  for (let i = 0; i < 260; i++) { g.fillStyle = r() < 0.5 ? 'rgba(120,150,190,0.35)' : 'rgba(25,35,55,0.35)'; g.fillRect(r() * 64, r() * 64, 1 + r() * 2, 1 + r() * 2); }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.setScalar(0.6);
  return t;
}
let mats = null;
export function decoMaterials() {
  if (mats) return mats;
  const cellTex = blueCells();
  mats = {
    stone: sandstone([150, 121, 96], 41),          // 玫瑰窗、连拱
    stonePink: sandstone([152, 133, 120], 43),
    stoneDark: sandstone([112, 92, 78], 45),
    led: new THREE.MeshStandardMaterial({ map: ledTiles(), roughness: 0.55, metalness: 0.1 }),
    cells: new THREE.MeshStandardMaterial({ map: cellTex, emissiveMap: cellTex, emissive: 0xffffff, emissiveIntensity: 0.05, roughness: 0.7 }),
    trim: new THREE.MeshStandardMaterial({ color: 0x4f8a86, roughness: 0.7 }),
    blue: new THREE.MeshStandardMaterial({ color: 0x4f6f8c, roughness: 0.75 }),
    red: new THREE.MeshStandardMaterial({ color: 0x9a5444, roughness: 0.75 }),
    hole: new THREE.MeshStandardMaterial({ color: 0x0c0d10, roughness: 0.9 }),
  };
  return mats;
}

// ---------- 小工具 ----------
const ext = (shape, depth, mat, z = 0, bevel = 0.06) => {
  const m = new THREE.Mesh(new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: bevel > 0, bevelThickness: bevel, bevelSize: bevel, bevelSegments: 1, curveSegments: 24 }), mat);
  m.position.z = z; m.castShadow = m.receiveShadow = true; return m;
};
function arcShape(cx, cy, r0, r1, a0, a1, n = 48) {
  const s = new THREE.Shape();
  for (let i = 0; i <= n; i++) { const a = a0 + ((a1 - a0) * i) / n, x = cx + Math.cos(a) * r1, y = cy + Math.sin(a) * r1; i ? s.lineTo(x, y) : s.moveTo(x, y); }
  for (let i = n; i >= 0; i--) { const a = a0 + ((a1 - a0) * i) / n; s.lineTo(cx + Math.cos(a) * r0, cy + Math.sin(a) * r0); }
  s.closePath(); return s;
}
// 尖顶拱：底 y0，宽 w，起拱处 ys，拱尖 yt（两段圆弧交于正中）
function pointedArch(cx, y0, w, ys, yt) {
  const s = new THREE.Shape(), half = w / 2, rise = yt - ys, R = (half * half + rise * rise) / (2 * half);
  s.moveTo(cx - half, y0); s.lineTo(cx + half, y0); s.lineTo(cx + half, ys);
  const n = 16;
  for (let i = 1; i <= n; i++) { const t = i / n, a = Math.asin((rise * t) / R); s.lineTo(cx + half - R + R * Math.cos(a), ys + R * Math.sin(a)); }
  for (let i = n; i >= 0; i--) { const t = i / n, a = Math.asin((rise * t) / R); s.lineTo(cx - half + R - R * Math.cos(a), ys + R * Math.sin(a)); }
  s.closePath(); return s;
}

// ---------- 半个玫瑰窗（s = 1：圆心在面的右边缘；s = -1：在左边缘）----------
function roseHalf(g, W, H, s, M) {
  const k = H / 28, cx = (s * W) / 2, cy = 17.1 * k, a0 = s > 0 ? Math.PI / 2 : -Math.PI / 2, a1 = a0 + Math.PI;   // 半圆朝外侧
  const outer = -s;                                       // 外侧方向（x 的符号）
  // 接缝石柱（环后面）、外侧竖向石条、外侧横梁
  g.add(box(0.85 * k, 26.4 * k, 0.45, M.stoneDark, cx - s * 0.45 * k, 13.2 * k, 0.38));
  g.add(box(0.9 * k, 15.5 * k, 0.5, M.stone, outer * (W / 2 - 0.45 * k), 7.75 * k, 0.4));
  { const beam = box(2.9 * k, 1.9 * k, 1.0, M.stone, outer * (W / 2 - 1.45 * k), 16.6 * k, 0.65); g.add(beam);
    const wedge = new THREE.Shape([new THREE.Vector2(0, 0), new THREE.Vector2(1.6 * k, 0), new THREE.Vector2(0, 1.2 * k)]);
    const wm = ext(wedge, 0.8, M.stone, 0.3, 0.03); wm.position.set(outer * (W / 2 - 2.9 * k), 17.55 * k, 0.3); wm.scale.x = -outer; g.add(wm); }
  // 三圈环带：[外边内径, 外边外径, 内边内径, 内边外径, 石肋间隔(度), 尖刺间隔(度)]
  for (const [ro0, ro1, ri0, ri1, bar, spike] of [[10.45, 10.9, 9.2, 9.55, 7, 22.5], [6.75, 7.0, 5.8, 6.0, 10, 30], [3.1, 3.3, 2.4, 2.55, 18, 30]]) {
    g.add(ext(arcShape(cx, cy, ro0 * k, ro1 * k, a0, a1), 0.75, M.stone, 0.25));
    g.add(ext(arcShape(cx, cy, ri0 * k, ri1 * k, a0, a1), 0.75, M.stone, 0.25));
    g.add(ext(arcShape(cx, cy, ri1 * k, ro0 * k, a0, a1), 0.12, M.cells, 0.62, 0));   // 格子只比石边低一点（正面看得到一圈蓝格）
    for (let d = bar / 2; d < 180; d += bar) {   // 放射石肋
      const a = a0 + (d * Math.PI) / 180, rm = ((ri1 + ro0) / 2) * k, b = box(0.2 * k, (ro0 - ri1) * k + 0.05, 0.35, M.stone, cx + Math.cos(a) * rm, cy + Math.sin(a) * rm, 0.8);
      b.rotation.z = a - Math.PI / 2; g.add(b);
    }
    for (let d = spike / 2; d < 180; d += spike) {   // 外沿的尖刺（内圈是方块）
      const a = a0 + (d * Math.PI) / 180;
      if (ro1 < 4) { const b = box(0.45 * k, 0.5 * k, 0.6, M.stone, cx + Math.cos(a) * (ro1 + 0.22) * k, cy + Math.sin(a) * (ro1 + 0.22) * k, 0.55); b.rotation.z = a - Math.PI / 2; g.add(b); continue; }
      const len = (ro1 > 9 ? 0.85 : 0.55) * k, wdt = (ro1 > 9 ? 0.75 : 0.5) * k;
      const tri = new THREE.Shape([new THREE.Vector2(-wdt / 2, 0), new THREE.Vector2(wdt / 2, 0), new THREE.Vector2(0, len)]);
      const m = ext(tri, 0.5, M.stone, 0.3, 0.02); m.position.set(cx + Math.cos(a) * (ro1 - 0.05) * k, cy + Math.sin(a) * (ro1 - 0.05) * k, 0.3); m.rotation.z = a - Math.PI / 2; g.add(m);
    }
  }
  // 圆心半圆石盘（微微鼓起）
  { const disc = new THREE.Mesh(new THREE.SphereGeometry(2.0 * k, 24, 12, 0, Math.PI, 0, Math.PI), M.stoneDark); disc.scale.set(1, 1, 0.22); disc.position.set(cx, cy, 0.55);
    disc.rotation.z = s > 0 ? Math.PI / 2 : -Math.PI / 2; disc.castShadow = disc.receiveShadow = true; g.add(disc); }
  // 外侧上角的小塔楼：方身 + 圆顶 + 拱窗
  { const tx = outer * (W / 2 - 2.0 * k), ty = 20.4 * k;
    g.add(box(2.6 * k, 4.2 * k, 1.2, M.stone, tx, ty + 2.1 * k, 0.75));
    g.add(box(3.0 * k, 0.35 * k, 1.4, M.stone, tx, ty + 4.3 * k, 0.75));
    const dome = new THREE.Mesh(new THREE.SphereGeometry(1.3 * k, 20, 10, 0, TAU, 0, Math.PI / 2), M.stone); dome.position.set(tx, ty + 4.45 * k, 0.75); dome.scale.z = 0.55; dome.castShadow = true; g.add(dome);
    const win = new THREE.Mesh(new THREE.ShapeGeometry(pointedArch(0, 0, 0.7 * k, 0.9 * k, 1.45 * k)), M.hole); win.position.set(tx, ty + 2.0 * k, 1.36); g.add(win); }
  // 下部石座：整片石板，台阶从外侧往接缝方向斜着爬上去，尖拱门洞，接缝边垂下的方形纹章块
  { const xO = outer * W / 2, xI = cx;
    let pts = [[xO, 0], [xI, 0], [xI, 6.0 * k], [xI - s * 3.0 * k, 6.3 * k], [xI - s * 6.0 * k, 7.2 * k], [xO, 8.6 * k]].map(([x, y]) => new THREE.Vector2(x, y));
    if (THREE.ShapeUtils.isClockWise(pts)) pts = pts.reverse();
    g.add(ext(new THREE.Shape(pts), 0.55, M.stone, 0.2, 0.04));
    for (let i = 0; i < 9; i++) {   // 台阶
      const x = outer * (W / 2 - (5.6 - i * 0.55) * k), y = (1.0 + i * 0.85) * k;   // 台阶从石座中部往外侧上角爬
      g.add(box(1.5 * k, 0.32 * k, 1.05, M.stone, x, y, 0.85));
    }
    const door = new THREE.Mesh(new THREE.ShapeGeometry(pointedArch(cx - s * 3.4 * k, 0.6 * k, 1.9 * k, 3.1 * k, 4.4 * k)), M.hole); door.position.z = 0.77; g.add(door);
    const frame = ext(pointedArch(0, 0, 2.5 * k, 3.4 * k, 4.9 * k), 0.12, M.stone, 0.76, 0.03); frame.position.set(cx - s * 3.4 * k, 0.4 * k, 0.72); g.add(frame);
    door.position.z = 0.9;   // 门洞：石框前面一块黑面
    g.add(box(1.7 * k, 2.4 * k, 1.1, M.stone, cx - s * 1.6 * k, 7.0 * k, 0.75));
    g.add(box(1.0 * k, 0.9 * k, 1.3, M.hole, cx - s * 1.6 * k, 6.8 * k, 0.78));
  }
}

// 圆顶拱（马蹄形）：底 y0，宽 w，起拱处 ys；拱是比半圆多一点的圆弧
function roundArch(cx, y0, w, ys, over = 0.15) {
  const s = new THREE.Shape(), r = w / 2, a = Math.asin(Math.min(0.9, over));
  s.moveTo(cx - r * Math.cos(a), y0); s.lineTo(cx + r * Math.cos(a), y0); s.lineTo(cx + r * Math.cos(a), ys - r * Math.sin(a));
  const n = 28; for (let i = 0; i <= n; i++) { const t = -a + ((Math.PI + 2 * a) * i) / n; s.lineTo(cx + r * Math.cos(t), ys + r * Math.sin(t)); }
  s.closePath(); return s;
}

// ---------- 拱门（中间后排那两座朝外的面）----------
//   拱顶外沿一圈蓝色卷草饰带、上方一段带圆花的檐口，再往上一根斜着断开的横梁压过去，最上面是断掉的檐口块；洞底是碎石台阶。
function archFace(g, W, H, M) {
  const k = H / 28, slab = new THREE.Shape([new THREE.Vector2(-W / 2, 0), new THREE.Vector2(W / 2, 0), new THREE.Vector2(W / 2, H * 0.83), new THREE.Vector2(-W / 2, H * 0.83)]);
  const cx = 0.7 * k, ow = 6.6 * k, oy0 = 1.6 * k, oys = 13.8 * k;
  slab.holes.push(roundArch(cx, oy0, ow, oys));
  slab.holes.push(new THREE.Path([new THREE.Vector2(-W / 2 + 1.4 * k, 4 * k), new THREE.Vector2(-W / 2 + 3.0 * k, 4 * k), new THREE.Vector2(-W / 2 + 3.0 * k, 17.5 * k), new THREE.Vector2(-W / 2 + 1.4 * k, 18.2 * k)]));
  g.add(ext(slab, 0.7, M.stonePink, 0.15, 0.04));
  // 拱洞里：演出时是 LED 画面（不是黑的）
  const screen = new THREE.Mesh(new THREE.PlaneGeometry(W - 0.2, H - 0.2), M.show); screen.position.set(0, H / 2, 0.1); g.add(screen);
  // 拱外沿蓝色卷草饰带 + 内圈线脚
  { const band = roundArch(cx, oys - 0.2, ow + 1.6 * k, oys); band.holes.push(roundArch(cx, oys - 0.2, ow, oys)); g.add(ext(band, 0.14, M.trim, 0.86, 0.02)); }
  { const lip = roundArch(cx, oy0, ow + 0.5 * k, oys); lip.holes.push(roundArch(cx, oy0, ow, oys)); g.add(ext(lip, 0.3, M.stonePink, 0.85, 0.03)); }
  // 左：粗的独立圆柱（柱身、柱头、柱础）；右：雕花壁柱
  { const x = cx - ow / 2 - 0.6 * k, h = oys - oy0;
    const col = new THREE.Mesh(new THREE.CylinderGeometry(0.75 * k, 0.8 * k, h - 2 * k, 18), M.stonePink); col.position.set(x, oy0 + 1 * k + (h - 2 * k) / 2, 1.5); col.castShadow = col.receiveShadow = true; g.add(col);
    g.add(box(2.1 * k, 1.0 * k, 1.9, M.stonePink, x, oys - 0.3 * k, 1.5)); g.add(box(1.8 * k, 0.5 * k, 1.7, M.stonePink, x, oys - 0.95 * k, 1.5));
    g.add(box(2.1 * k, 1.2 * k, 1.9, M.stonePink, x, oy0 + 0.6 * k, 1.5)); }
  { const x = cx + ow / 2 + 0.9 * k;
    g.add(box(1.4 * k, oys - oy0, 0.7, M.stonePink, x, (oy0 + oys) / 2, 1.1));
    for (let y = oy0 + 1.2 * k; y < oys - 0.6; y += 1.6 * k) g.add(box(0.8 * k, 1.0 * k, 0.1, M.trim, x, y, 1.5)); }
  // 拱上方檐口（带圆花）
  g.add(box(W - 1.0 * k, 1.1 * k, 0.8, M.stonePink, 0.3 * k, oys + ow / 2 + 1.6 * k, 1.05));
  for (let i = -2; i <= 2; i++) { const ros = new THREE.Mesh(new THREE.CylinderGeometry(0.4 * k, 0.4 * k, 0.22, 12), M.trim); ros.rotation.x = Math.PI / 2; ros.position.set(cx + i * 2.2 * k, oys + ow / 2 + 0.6 * k, 0.95); g.add(ros); }
  // 斜着压过去的断梁 + 顶上断掉的檐口块
  { const beam = box(W * 1.05, 2.0 * k, 1.1, M.stone, 0, 21.3 * k, 1.25); beam.rotation.z = 0.2; g.add(beam);
    g.add(box(3.4 * k, 4.2 * k, 0.9, M.stonePink, 0.5 * k, H * 0.83 + 1.4 * k, 0.6)); g.add(box(5.2 * k, 0.9 * k, 1.0, M.stonePink, 0.9 * k, H * 0.83 - 0.4 * k, 0.65)); }
  // 洞底碎石台阶
  for (let i = 0; i < 5; i++) g.add(box(ow * (0.9 - i * 0.1), 0.45 * k, 1.2 - i * 0.18, M.stonePink, cx + 0.4 * k, oy0 + (0.2 + i * 0.45) * k, 0.3 + (1.2 - i * 0.18) / 2));
}

//   左上一个大圆拱洞（蓝色拱肩），中上一个又高又窄的圆顶窗，右上一个宽矮的弧形拱洞，顶上右角一个缺口；
//   中间几段斜着的台阶和平台，台阶底下一个三角形的洞；右下一个高圆拱洞，左边雕花壁柱、柱头；左下还有几个拱洞。
//   洞里全是 LED。砂岩色上带红、蓝两种彩绘。
function arcadeFace(g, W, H, M) {
  const k = H / 28, L = -W / 2, P = (x, y) => new THREE.Vector2(L + x * k, y * k);
  const slab = new THREE.Shape([P(0, 0), P(13.6, 0), P(13.6, 27.0), P(11.6, 27.0), P(11.6, 25.6), P(9.4, 25.6), P(9.4, 27.4), P(0, 27.4)].map((v) => new THREE.Vector2(Math.min(v.x, W / 2), v.y)));
  const A = [   // [中心 x, 底 y, 宽, 起拱 y, 超出半圆的比例]
    [3.6, 12.6, 4.0, 21.8, 0.15],   // 左上大圆拱
    [6.6, 14.6, 1.4, 23.1, 0],      // 中上窄窗
    [10.4, 17.4, 4.4, 19.1, -0.4],  // 右上宽矮弧拱
    [9.7, 0.6, 3.1, 11.85, 0.12],   // 右下高圆拱
    [2.8, 0.0, 2.4, 5.0, 0.1],      // 左下两个小拱
    [5.8, 0.0, 1.6, 3.4, 0.1],
  ];
  const holes = A.map(([x, y0, w, ys, o]) => roundArch(L + x * k, y0 * k, w * k, ys * k, o));
  holes.push(new THREE.Shape([P(4.0, 11.2), P(6.2, 13.6), P(4.0, 13.6)]));   // 台阶底下的三角洞
  slab.holes.push(...holes);
  g.add(ext(slab, 0.7, M.stone, 0.15, 0.04));
  const screen = new THREE.Mesh(new THREE.PlaneGeometry(W - 0.2, H - 0.2), M.show); screen.position.set(0, H / 2, 0.1); g.add(screen);
  // 拱洞外沿线脚：左上大拱拱肩蓝色彩绘，右下高拱拱顶红色彩绘，其余石色
  for (const [i, mat] of [[0, M.blue], [3, M.red], [1, M.stone], [2, M.stone]]) {
    const [x, , w, ys, o] = A[i], band = roundArch(L + x * k, ys * k - 0.1, (w + 1.0) * k, ys * k, Math.max(0, o)); band.holes.push(roundArch(L + x * k, ys * k - 0.1, w * k, ys * k, Math.max(0, o)));
    g.add(ext(band, 0.16, mat, 0.86, 0.02));
  }
  // 雕花壁柱（带柱头）：左上大拱两侧、右下高拱两侧
  for (const [x, y0, y1] of [[1.2, 12.6, 21.4], [6.0, 12.6, 21.4], [7.8, 0.6, 11.4], [11.6, 0.6, 11.4]]) {
    g.add(box(0.9 * k, (y1 - y0) * k, 0.6, M.stone, L + x * k, ((y0 + y1) / 2) * k, 1.05));
    g.add(box(1.4 * k, 0.6 * k, 0.8, M.stone, L + x * k, (y1 + 0.3) * k, 1.1));
  }
  // 横檐：上下两层拱廊之间、右上弧拱下沿
  g.add(box(W, 0.9 * k, 0.8, M.stone, 0, 14.2 * k, 1.05));
  g.add(box(6.0 * k, 0.8 * k, 0.8, M.stone, L + 10.4 * k, 17.0 * k, 1.05));
  // 斜台阶：中间从左往右上一段、右上往左上一段（错层的台阶）
  for (let i = 0; i < 9; i++) g.add(box(1.4 * k, 0.38 * k, 1.2, M.stone, L + (1.4 + i * 0.6) * k, (6.6 + i * 0.6) * k, 0.95));
  for (let i = 0; i < 6; i++) g.add(box(1.4 * k, 0.38 * k, 1.2, M.stone, L + (12.4 - i * 0.6) * k, (14.8 + i * 0.4) * k, 0.95));
  g.add(box(3.2 * k, 0.5 * k, 1.3, M.stone, L + 6.6 * k, 12.2 * k, 1.0));   // 平台
}

// ---------- 入口：返回一个 Group，局部坐标 x 横向、y 向上（0 = 面底）、z 朝外 ----------
export function buildDecoFace(kind, W, H, showLed) {
  const M = decoMaterials(), g = new THREE.Group();
  // 不是满屏饱和的彩色玻璃：用同一张花窗图，整体压暗、往蓝里拉
  if (!M.show) { M.show = showLed.clone(); M.show.color = new THREE.Color(0x3a4f86); M.show.emissive = new THREE.Color(0x4a5ea0); M.show.emissiveIntensity = 0.12; }
  // 黑色 LED 底板
  const led = new THREE.Mesh(new THREE.PlaneGeometry(W, H), M.led); led.position.set(0, H / 2, 0.05); g.add(led);
  if (kind === 'rose-l') roseHalf(g, W, H, 1, M);
  else if (kind === 'rose-r') roseHalf(g, W, H, -1, M);
  else if (kind === 'arch') archFace(g, W, H, M);
  else if (kind === 'arcade') arcadeFace(g, W, H, M);
  else return null;
  return g;
}
