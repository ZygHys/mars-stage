// 灰模阶段的贴图，全部用 canvas 画，不依赖图片文件。
import * as THREE from 'three';

function canvasTex(w, h, draw, opts = {}) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = opts.linear ? THREE.NoColorSpace : THREE.SRGBColorSpace;
  t.anisotropy = 8;
  if (opts.repeat) { t.wrapS = t.wrapT = THREE.RepeatWrapping; }
  return t;
}

// 可复现的随机数
export function rng(seed) {
  let s = seed >>> 0;
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
}

const BRONZE = ['#6b4a2e', '#8a6440', '#a27a4e', '#5a3b24', '#b48a5c'];
const TEAL = ['#1f4e5f', '#2f6f7e', '#3d7f8a'];

function stoneNoise(g, w, h, seed, n = 500) {
  const r = rng(seed);
  for (let i = 0; i < n; i++) {
    g.fillStyle = `rgba(${130 + r() * 70},${95 + r() * 50},${65 + r() * 35},${0.08 + r() * 0.12})`;
    g.fillRect(r() * w, r() * h, 6 + r() * 40, 4 + r() * 24);
  }
}

export function reliefStoneTexture() {
  const tex = canvasTex(256, 256, (g, w, h) => {
    g.fillStyle = '#b29a80';
    g.fillRect(0, 0, w, h);
    stoneNoise(g, w, h, 31, 380);
    const r = rng(43);
    for (let i = 0; i < 34; i++) {
      const x = r() * w, y = r() * h, len = 24 + r() * 122;
      g.strokeStyle = i % 2 ? 'rgba(78,55,44,0.16)' : 'rgba(231,205,169,0.23)';
      g.lineWidth = 1 + r() * 6;
      for (const dx of [-w, 0, w]) for (const dy of [-h, 0, h]) {
        g.beginPath();
        g.moveTo(x + dx, y + dy);
        g.lineTo(x + dx + len * 0.46, y + dy - len * 0.18);
        g.lineTo(x + dx + len, y + dy - len * 0.53);
        g.stroke();
      }
    }
  }, { repeat: true });
  tex.repeat.setScalar(0.48);  // ExtrudeGeometry 的 UV 以局部米数计
  return tex;
}

export function roseTexture() {
  return canvasTex(512, 900, (g, w, h) => {
    g.fillStyle = '#7a5a3e'; g.fillRect(0, 0, w, h);
    stoneNoise(g, w, h, 7);
    // 顶部小塔楼
    g.fillStyle = '#a07a52'; g.fillRect(w * 0.08, h * 0.02, w * 0.18, h * 0.16);
    g.beginPath(); g.arc(w * 0.17, h * 0.03, w * 0.09, Math.PI, 0); g.fill();
    // 大圆盘：中心偏右上，半径很大
    const cx = w * 0.62, cy = h * 0.36, R = w * 0.52;
    for (let k = 7; k >= 1; k--) {
      const rr = (R * k) / 7, seg = 8 + k * 3;
      for (let s = 0; s < seg; s++) {
        g.beginPath(); g.moveTo(cx, cy);
        g.arc(cx, cy, rr, (s / seg) * Math.PI * 2, ((s + 1) / seg) * Math.PI * 2);
        g.closePath();
        g.fillStyle = k % 2 ? TEAL[(s + k) % 3] : BRONZE[(s + k) % 5];
        g.fill(); g.strokeStyle = '#3a2516'; g.lineWidth = 3; g.stroke();
      }
    }
    g.fillStyle = '#2c1c10'; g.beginPath(); g.arc(cx, cy, R * 0.16, 0, Math.PI * 2); g.fill();
    // 下方台阶和拱廊
    g.fillStyle = '#9b764e';
    for (let i = 0; i < 6; i++) g.fillRect(w * (0.05 + i * 0.02), h * (0.72 + i * 0.04), w * (0.9 - i * 0.04), h * 0.025);
    g.fillStyle = '#4a3020';
    for (let i = 0; i < 3; i++) { g.beginPath(); g.arc(w * (0.2 + i * 0.25), h * 0.7, w * 0.07, Math.PI, 0); g.fill(); g.fillRect(w * (0.13 + i * 0.25), h * 0.7, w * 0.14, h * 0.08); }
  });
}

export function archTexture() {
  return canvasTex(512, 900, (g, w, h) => {
    g.fillStyle = '#b39579'; g.fillRect(0, 0, w, h);
    stoneNoise(g, w, h, 3, 400);
    g.fillStyle = '#8c6c52';
    g.fillRect(w * 0.15, h * 0.05, w * 0.12, h * 0.15); // 顶上的十字架/尖塔
    g.fillRect(w * 0.09, h * 0.09, w * 0.24, h * 0.03);
    const aw = w * 0.5, ax = w * 0.28, top = h * 0.36, bottom = h * 0.86;
    g.fillStyle = '#c7a98b'; // 拱券外框
    g.fillRect(ax - 34, top - 10, aw + 68, bottom - top + 10);
    g.beginPath(); g.arc(ax + aw / 2, top, aw / 2 + 34, Math.PI, 0); g.fill();
    g.fillStyle = '#2d2620'; // 门洞（深色，原物是黑色 LED）
    g.fillRect(ax, top, aw, bottom - top);
    g.beginPath(); g.arc(ax + aw / 2, top, aw / 2, Math.PI, 0); g.fill();
    g.fillStyle = '#d8bea3'; // 两侧柱
    g.fillRect(ax - 70, top - 40, 28, bottom - top + 40);
    g.fillRect(ax + aw + 42, top - 40, 28, bottom - top + 40);
    g.fillStyle = '#8f735c'; // 底部台阶
    for (let i = 0; i < 4; i++) g.fillRect(w * (0.05 + i * 0.03), h * (0.88 + i * 0.03), w * (0.9 - i * 0.06), h * 0.02);
  });
}

// 彩窗屏：彩色玻璃格子（长方体顶部 LED 方块、前柱包边）
export function glassTexture(seed = 11) {
  return canvasTex(256, 256, (g, w, h) => {
    const r = rng(seed);
    // 大块彩窗：深蓝为主，夹红、金、青，粗黑铅条分隔，中间一个圆形花窗
    const pal = ['#1b3a6b', '#22508a', '#1d6b7a', '#8e2a2a', '#b8892c', '#2c2350', '#16324f'];
    g.fillStyle = '#0b0b10'; g.fillRect(0, 0, w, h);
    const n = 3;
    for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
      const x = (i / n) * w, y = (j / n) * h, cw = w / n, ch = h / n;
      g.fillStyle = pal[Math.floor(r() * pal.length)];
      g.fillRect(x + 5, y + 5, cw - 10, ch - 10);
    }
    g.strokeStyle = '#0b0b10'; g.lineWidth = 10;
    g.beginPath(); g.arc(w / 2, h / 2, w * 0.32, 0, Math.PI * 2); g.stroke();
    g.fillStyle = pal[Math.floor(r() * pal.length)];
    g.beginPath(); g.arc(w / 2, h / 2, w * 0.12, 0, Math.PI * 2); g.fill();
  }, { repeat: true });
}

// 黑色 LED 网格面（三角柱没亮时的样子）：深色底 + 均匀的灯珠方块
export function ledGridTexture() {
  return canvasTex(128, 128, (g, w, h) => {
    g.fillStyle = '#0c0c0e'; g.fillRect(0, 0, w, h);
    g.fillStyle = '#2a2b30';
    for (let y = 4; y < h; y += 16) for (let x = 4; x < w; x += 16) g.fillRect(x, y, 8, 8);
  }, { repeat: true });
}

// 桁架面：X 形斜撑，透明部分用 alphaTest 镂空
export function trussTexture() {
  return canvasTex(64, 128, (g, w, h) => {
    g.clearRect(0, 0, w, h);
    g.strokeStyle = '#ffffff'; g.lineWidth = 6;
    g.strokeRect(3, 0, w - 6, h);
    g.lineWidth = 4;
    g.beginPath(); g.moveTo(3, 0); g.lineTo(w - 3, h / 2); g.lineTo(3, h); g.stroke();
    g.beginPath(); g.moveTo(3, h / 2); g.lineTo(w - 3, h / 2); g.stroke();
  }, { repeat: true });
}

// 圆筒塔竖条板：锈铜色石纹
export function slatTexture() {
  return canvasTex(64, 512, (g, w, h) => {
    const r = rng(5);
    const grad = g.createLinearGradient(0, 0, w, 0);
    grad.addColorStop(0, '#5d4030'); grad.addColorStop(0.5, '#8b6a52'); grad.addColorStop(1, '#5a3d2c');
    g.fillStyle = grad; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 220; i++) {
      g.fillStyle = `rgba(${40 + r() * 90},${30 + r() * 60},${20 + r() * 50},0.25)`;
      g.fillRect(r() * w, r() * h, 2 + r() * 10, 6 + r() * 50);
    }
  });
}

// 设计坐标：外三角形上边 (-1,0)–(1,0)，尖角 (0,1.296)（比正三角形扁：高是宽的 0.648），y 向下（朝观众）。
export const MARS_LOGO = {
  apex: 1.296,                 // 外三角形的高
  width: 0.096,                // 笔画宽（所有笔画同宽）
  tailEnd: 1.611,              // 尾巴末端
  bar: [0.659, 0.755],         // 横杠上下沿
  barOuter: [0.916, 0.548, 0.477],   // 三角形外的两段横杠：外端 x、内端上沿 x、内端下沿 x（内端斜切，和三角形留一条缝）
  circle: [0, 0.733, 0.391, 0.483],  // 两段圆弧：圆心、内半径、外半径
  arcGap: 0.089,               // 圆弧顶端到中轴的距离（给竖杆留缝）
};

// 画标志：每一笔都是设计坐标里的多边形，再逐点映射到画布。map(x,y) → [px,py]
export function drawMarsLogo(g, map, color = '#e0303f') {
  const L = MARS_LOGO, A = L.apex, w = L.width, hw = w / 2;
  const dense = (pts, n = 24) => { const out = []; for (let i = 0; i < pts.length; i++) { const a = pts[i], b = pts[(i + 1) % pts.length]; for (let k = 0; k < n; k++) out.push([a[0] + (b[0] - a[0]) * k / n, a[1] + (b[1] - a[1]) * k / n]); } return out; };
  const path = (pts, close = true) => { pts.forEach(([x, y], i) => { const [px, py] = map(x, y); i ? g.lineTo(px, py) : g.moveTo(px, py); }); if (close) g.closePath(); };
  const poly = (pts) => { g.beginPath(); path(dense(pts)); g.fill(); };
  g.fillStyle = color;
  // 三角形：外三角减内三角。内三角 = 绕内心缩小，使三边都内收一个笔画宽
  const outer = [[-1, 0], [1, 0], [0, A]], slant = Math.hypot(1, A), rin = (2 * A) / (2 + 2 * slant), k = (rin - w) / rin;
  const inner = outer.map(([x, y]) => [x * k, rin + (y - rin) * k]);
  g.beginPath(); path(dense(outer)); path(dense(inner)); g.fill('evenodd');
  const edgeX = (y) => 1 - y / A;                              // 外三角形在高度 y 处的半宽
  poly([[-hw, rin + (A - rin) * k + 0.03], [hw, rin + (A - rin) * k + 0.03], [hw, L.tailEnd], [-hw, L.tailEnd]]);   // 尾巴（从内三角尖角下方开始，不伸进内三角）
  poly([[-hw, 0], [hw, 0], [hw, L.bar[1]], [-hw, L.bar[1]]]);                          // 竖杆
  const [b0, b1] = L.bar, [bo, bi0, bi1] = L.barOuter;
  poly([[-edgeX(b0), b0], [edgeX(b0), b0], [edgeX(b1), b1], [-edgeX(b1), b1]]);        // 三角形内的横杠
  for (const s of [-1, 1]) poly([[s * bo, b0], [s * bi0, b0], [s * bi1, b1], [s * bo, b1]]);   // 三角形外的两段
  // 两段圆弧：从横杠向上弯到中轴旁，顶端竖切；不超出外三角形
  g.save(); g.beginPath(); path(dense(outer)); g.clip();
  const [cx, cy, r0, r1] = L.circle;
  for (const s of [-1, 1]) {
    const pts = [];
    for (let i = 0; i <= 48; i++) { const a = Math.PI + (Math.PI / 2) * (i / 48); pts.push([s * Math.max(-cx - r1 * Math.cos(a), L.arcGap), cy + r1 * Math.sin(a)]); }
    for (let i = 48; i >= 0; i--) { const a = Math.PI + (Math.PI / 2) * (i / 48); pts.push([s * Math.max(-cx - r0 * Math.cos(a), L.arcGap), cy + r0 * Math.sin(a)]); }
    g.beginPath(); path(pts); g.fill();
  }
  g.restore();
}

// 平面版标志贴图（尖塔顶、核对用）
export function marsLogoTexture(px = 512, bg = '#17171a') {
  return canvasTex(px, px, (g, w, h) => {
    g.fillStyle = bg; g.fillRect(0, 0, w, h);
    const s = w / 2.5; drawMarsLogo(g, (x, y) => [w / 2 + x * s, h * 0.16 + y * s]);
  });
}

// 拱顶膜面：黑色膜 + 接缝 + 火星标志。拱跨左右（x），屋脊沿前后（z）。
// 画布 x ↔ 世界 x（按拱的弧长展开），画布 y ↔ 世界 z（上 = 舞台一侧，下 = 观众一侧）。
// opts：hw 屋面半宽、depth 进深、side 标志上边的宽度（米）、topZ 上边的 z（米，屋面中心为 0）
export function roofTexture(opts = {}) {
  const { hw = 11.5, depth = 23, side = 14.3, topZ = -6.6 } = opts;
  return canvasTex(2048, 2048, (g, w, h) => {
    g.fillStyle = '#16171b'; g.fillRect(0, 0, w, h);
    g.strokeStyle = '#c9ccd2'; g.lineWidth = 5;            // 白色接缝：5 块膜，接缝沿 x 跨过拱
    for (let i = 1; i < 5; i++) { g.beginPath(); g.moveTo(0, (i * h) / 5); g.lineTo(w, (i * h) / 5); g.stroke(); }
    const u = side / 2;                                    // 每设计单位的米数
    const map = (x, y) => {
      const wx = x * u, wz = topZ + y * u;
      const uu = (Math.asin(Math.max(-1, Math.min(1, wx / hw))) + Math.PI / 2) / Math.PI;
      return [uu * w, (wz / depth + 0.5) * h];
    };
    drawMarsLogo(g, map, '#e0303f');
  });
}

// 直播屏占位画面
export function screenTexture(label) {
  return canvasTex(512, 288, (g, w, h) => {
    const grad = g.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, '#3a3f6b'); grad.addColorStop(1, '#151726');
    g.fillStyle = grad; g.fillRect(0, 0, w, h);
    g.fillStyle = '#c9b8d8';
    g.beginPath(); g.arc(w / 2, h * 0.38, h * 0.11, 0, Math.PI * 2); g.fill();
    g.fillRect(w / 2 - h * 0.13, h * 0.5, h * 0.26, h * 0.4);
    g.fillStyle = 'rgba(255,255,255,0.75)'; g.font = '22px sans-serif'; g.textAlign = 'center';
    g.fillText(label, w / 2, h - 14);
  });
}

// 粉丝区漏斗：红到黄的渐变
export function funnelTexture() {
  return canvasTex(64, 256, (g, w, h) => {
    const grad = g.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, '#f2c14e'); grad.addColorStop(0.35, '#e8833a'); grad.addColorStop(1, '#c0392b');
    g.fillStyle = grad; g.fillRect(0, 0, w, h);
  });
}

export function roseWindowTexture() {
  return canvasTex(1024, 1400, (g, w, h) => {
    g.fillStyle = '#b9a48a'; g.fillRect(0, 0, w, h);
    stoneNoise(g, w, h, 17, 900);
    // 上方的尖塔和两侧建筑
    g.fillStyle = '#9c8466';
    g.fillRect(w * 0.42, 0, w * 0.16, h * 0.12);
    g.beginPath(); g.moveTo(w * 0.42, h * 0.02); g.lineTo(w * 0.5, -h * 0.04); g.lineTo(w * 0.58, h * 0.02); g.fill();
    g.fillRect(0, h * 0.06, w * 0.14, h * 0.8); g.fillRect(w * 0.86, h * 0.06, w * 0.14, h * 0.8);
    const cx = w / 2, cy = h * 0.46, R = w * 0.45;
    const blues = ['#20456e', '#2d5f8f', '#3b7aa8', '#1b3557'];
    for (let k = 9; k >= 1; k--) {
      const rr = (R * k) / 9, seg = 10 + k * 4;
      for (let s = 0; s < seg; s++) {
        g.beginPath(); g.moveTo(cx, cy);
        g.arc(cx, cy, rr, (s / seg) * Math.PI * 2, ((s + 1) / seg) * Math.PI * 2); g.closePath();
        g.fillStyle = k % 2 ? blues[(s + k) % 4] : ['#d8c3a0', '#c9b08a', '#e3d2b2'][(s + k) % 3];
        g.fill(); g.strokeStyle = '#5a4630'; g.lineWidth = 4; g.stroke();
      }
    }
    g.fillStyle = '#e8d8b8'; g.beginPath(); g.arc(cx, cy, R * 0.14, 0, Math.PI * 2); g.fill();
    g.strokeStyle = '#5a4630'; g.lineWidth = 10; g.beginPath(); g.arc(cx, cy, R * 1.02, 0, Math.PI * 2); g.stroke();
    // 下方台阶
    g.fillStyle = '#a58d6d';
    for (let i = 0; i < 6; i++) g.fillRect(w * (0.1 + i * 0.03), h * (0.86 + i * 0.022), w * (0.8 - i * 0.06), h * 0.016);
  });
}

export function pitTexture(width, depth) {
  const cells = 4, cellMeters = 0.86;
  const t = canvasTex(512, 512, (g, w, h) => {
    const r = rng(29), tile = w / cells;
    const shades = ['#515d5b', '#566360', '#586460', '#545e5d'];
    for (let y = 0; y < cells; y++) for (let x = 0; x < cells; x++) {
      g.fillStyle = shades[Math.floor(r() * shades.length)];
      g.fillRect(x * tile, y * tile, tile, tile);
    }
    for (let i = 0; i < 370; i++) {
      const x = r() * w, y = r() * h, radius = 2 + r() * 26;
      const stain = g.createRadialGradient(x, y, 0, x, y, radius);
      stain.addColorStop(0, i % 3 ? 'rgba(164,158,134,0.11)' : 'rgba(26,42,39,0.15)');
      stain.addColorStop(1, 'transparent');
      g.fillStyle = stain;
      g.fillRect(x - radius, y - radius, radius * 2, radius * 2);
    }
    g.strokeStyle = 'rgba(181,193,183,0.36)';
    g.lineWidth = 1.8;
    g.beginPath();
    for (let i = 0; i <= cells; i++) {
      const edge = tile * i;
      g.moveTo(edge, 0); g.lineTo(edge, h);
      g.moveTo(0, edge); g.lineTo(w, edge);
    }
    g.stroke();
  }, { repeat: true });
  t.repeat.set(width / (cells * cellMeters), depth / (cells * cellMeters));
  return t;
}

// ================= v3 精细材质 =================

// 由高度图生成法线贴图（canvas 上的灰度 → RGB 法线）
function normalFromHeight(hgt, w, h, strength = 2) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const g = c.getContext('2d'); const img = g.createImageData(w, h);
  const H = (x, y) => hgt[((y + h) % h) * w + ((x + w) % w)];
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const dx = (H(x + 1, y) - H(x - 1, y)) * strength, dy = (H(x, y + 1) - H(x, y - 1)) * strength;
    const nz = 1 / Math.sqrt(dx * dx + dy * dy + 1), i = (y * w + x) * 4;
    img.data[i] = (-dx * nz * 0.5 + 0.5) * 255; img.data[i + 1] = (dy * nz * 0.5 + 0.5) * 255; img.data[i + 2] = nz * 255; img.data[i + 3] = 255;
  }
  g.putImageData(img, 0, 0);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.NoColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 8;
  return t;
}

// 可平铺的值噪声（多层叠加）
function fbmField(w, h, seed, octaves = 5, base = 4) {
  const r = rng(seed), out = new Float32Array(w * h);
  for (let o = 0; o < octaves; o++) {
    const f = base * 2 ** o, amp = 0.5 ** o, grid = [];
    for (let i = 0; i < f * f; i++) grid.push(r());
    const G = (i, j) => grid[((j % f + f) % f) * f + ((i % f + f) % f)];
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const fx = (x / w) * f, fy = (y / h) * f, i = Math.floor(fx), j = Math.floor(fy), tx = fx - i, ty = fy - j;
      const sx = tx * tx * (3 - 2 * tx), sy = ty * ty * (3 - 2 * ty);
      const a = G(i, j) + (G(i + 1, j) - G(i, j)) * sx, b = G(i, j + 1) + (G(i + 1, j + 1) - G(i, j + 1)) * sx;
      out[y * w + x] += (a + (b - a) * sy) * amp;
    }
  }
  return out;
}

// 彩窗玻璃：Voronoi 碎块 + 黑色铅条，每块玻璃中心亮、边缘暗
export function stainedGlass(seed = 1, { cells = 70, palette, w = 512, h = 512, lead = 4 } = {}) {
  palette = palette || ['#123a7a', '#1d5aa6', '#2b78c2', '#0f2c5c', '#7a1f2b', '#b8322c', '#c99a2e', '#1f7a6e', '#5b2b7a', '#e0b84a'];
  return canvasTex(w, h, (g) => {
    const r = rng(seed), pts = [];
    for (let i = 0; i < cells; i++) pts.push([r() * w, r() * h, palette[Math.floor(r() * palette.length)]]);
    const img = g.createImageData(w, h);
    const hex = (s) => [parseInt(s.slice(1, 3), 16), parseInt(s.slice(3, 5), 16), parseInt(s.slice(5, 7), 16)];
    const cols = pts.map((p) => hex(p[2]));
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      let d1 = 1e9, d2 = 1e9, k = 0;
      for (let i = 0; i < pts.length; i++) {
        let dx = Math.abs(x - pts[i][0]), dy = Math.abs(y - pts[i][1]);
        dx = Math.min(dx, w - dx); dy = Math.min(dy, h - dy);
        const d = dx * dx + dy * dy;
        if (d < d1) { d2 = d1; d1 = d; k = i; } else if (d < d2) d2 = d;
      }
      const edge = Math.sqrt(d2) - Math.sqrt(d1), o = (y * w + x) * 4;
      if (edge < lead) { img.data[o] = 18; img.data[o + 1] = 16; img.data[o + 2] = 20; }
      else { const l = Math.min(1.15, 0.7 + edge / 40); const c = cols[k]; img.data[o] = Math.min(255, c[0] * l); img.data[o + 1] = Math.min(255, c[1] * l); img.data[o + 2] = Math.min(255, c[2] * l); }
      img.data[o + 3] = 255;
    }
    g.putImageData(img, 0, 0);
  }, { repeat: true });
}

// LED 屏像素网格（叠在内容上，近看能看到灯珠）
export function ledPixelMask() {
  return canvasTex(64, 64, (g, w, h) => {
    g.fillStyle = '#000'; g.fillRect(0, 0, w, h);
    g.fillStyle = '#fff';
    for (let y = 0; y < h; y += 8) for (let x = 0; x < w; x += 8) g.fillRect(x + 1, y + 1, 6, 6);
  }, { repeat: true, linear: true });
}

// 岩片（控制塔双圈）：灰褐色石材，竖向劈理 + 颗粒 + 裂纹；返回 { map, normalMap }（可竖向平铺）
export function rockSlat(seed = 5) {
  const w = 128, h = 256;
  const f = fbmField(w, h, seed, 6, 4), r = rng(seed + 1);
  const hgt = new Float32Array(w * h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const streak = Math.sin((x / w) * Math.PI * 2 * 2 + f[y * w + x] * 5) * 0.07;
    hgt[y * w + x] = f[y * w + x] + streak + (r() - 0.5) * 0.06;
  }
  const map = canvasTex(w, h, (g) => {
    const img = g.createImageData(w, h);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const v = hgt[y * w + x], k = 0.42 + v * 0.62, o = (y * w + x) * 4, warm = f[((y * 3) % h) * w + x] * 30;
      img.data[o] = (98 + warm) * k; img.data[o + 1] = (72 + warm * 0.4) * k; img.data[o + 2] = (62 - warm * 0.2) * k; img.data[o + 3] = 255;
    }
    g.putImageData(img, 0, 0);
    g.strokeStyle = 'rgba(28,20,15,0.6)'; g.lineWidth = 1.3;
    for (let i = 0; i < 8; i++) { g.beginPath(); let x = r() * w, y = r() * h; g.moveTo(x, y); for (let k = 0; k < 5; k++) { x += (r() - 0.5) * 18; y += 8 + r() * 30; g.lineTo(x, y); } g.stroke(); }
  }, { repeat: true });
  return { map, normalMap: normalFromHeight(hgt, w, h, 5) };
}

// 草坪：深浅交错的修剪条纹 + 噪声
export function lawnTexture() {
  const w = 256, h = 256, f = fbmField(w, h, 41, 5, 4);
  return canvasTex(w, h, (g) => {
    const img = g.createImageData(w, h);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const v = f[y * w + x], stripe = (Math.floor(x / 64) % 2) * 0.05, o = (y * w + x) * 4, k = 0.74 + v * 0.36 + stripe;
      img.data[o] = 86 * k; img.data[o + 1] = 106 * k; img.data[o + 2] = 60 * k; img.data[o + 3] = 255;
    }
    g.putImageData(img, 0, 0);
  }, { repeat: true });
}

// 柏油路面
export function asphaltTexture() {
  const w = 256, h = 256, f = fbmField(w, h, 77, 5, 8);
  return canvasTex(w, h, (g) => {
    const img = g.createImageData(w, h), r = rng(78);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const k = 0.75 + f[y * w + x] * 0.4 + (r() - 0.5) * 0.12, o = (y * w + x) * 4;
      img.data[o] = 62 * k; img.data[o + 1] = 64 * k; img.data[o + 2] = 68 * k; img.data[o + 3] = 255;
    }
    g.putImageData(img, 0, 0);
  }, { repeat: true });
}

// 直播屏画面：粉紫色舞台光 + 歌手剪影 + 光斑（不再用图标）
export function liveFeedTexture(seed = 1, hue = 300) {
  return canvasTex(512, 288, (g, w, h) => {
    const r = rng(seed);
    const grad = g.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, `hsl(${hue},55%,22%)`); grad.addColorStop(0.6, `hsl(${hue + 20},60%,38%)`); grad.addColorStop(1, `hsl(${hue - 20},50%,16%)`);
    g.fillStyle = grad; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 40; i++) { g.fillStyle = `hsla(${hue + r() * 60 - 30},90%,${60 + r() * 30}%,${0.1 + r() * 0.25})`; g.beginPath(); g.arc(r() * w, r() * h * 0.7, 4 + r() * 22, 0, Math.PI * 2); g.fill(); }
    const cx = w * (0.4 + r() * 0.2);
    g.fillStyle = 'rgba(20,10,25,0.85)';
    g.beginPath(); g.ellipse(cx, h * 0.36, h * 0.075, h * 0.095, 0, 0, Math.PI * 2); g.fill();
    g.beginPath(); g.moveTo(cx - h * 0.2, h); g.quadraticCurveTo(cx - h * 0.18, h * 0.5, cx, h * 0.47); g.quadraticCurveTo(cx + h * 0.18, h * 0.5, cx + h * 0.2, h); g.fill();
    g.fillStyle = 'rgba(255,255,255,0.85)'; g.font = 'bold 18px "PingFang SC", sans-serif'; g.textAlign = 'left';
    g.fillText('MARS 2.0', 14, h - 14);
  });
}

// 横幅/门头文字
export function bannerTexture(title, sub = '', { bg = '#121216', fg = '#e8e2d4', accent = '#c0392b', w = 1024, h = 256 } = {}) {
  return canvasTex(w, h, (g) => {
    g.fillStyle = bg; g.fillRect(0, 0, w, h);
    g.fillStyle = accent; g.fillRect(0, h - 16, w, 16);
    g.fillStyle = fg; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.font = `bold ${Math.round(h * 0.42)}px "PingFang SC", "Helvetica Neue", sans-serif`;
    g.fillText(title, w / 2, sub ? h * 0.4 : h * 0.48);
    if (sub) { g.font = `${Math.round(h * 0.18)}px "PingFang SC", sans-serif`; g.fillStyle = '#b9b2a4'; g.fillText(sub, w / 2, h * 0.78); }
  });
}

// 蓝色施工围挡
export function hoardingTexture() {
  return canvasTex(256, 64, (g, w, h) => {
    g.fillStyle = '#2f6fb3'; g.fillRect(0, 0, w, h);
    g.fillStyle = '#e9eef3'; g.fillRect(0, h * 0.72, w, h * 0.28);
    g.strokeStyle = 'rgba(0,0,0,0.25)'; g.lineWidth = 2;
    for (let x = 0; x < w; x += 32) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, h); g.stroke(); }
  }, { repeat: true });
}

// 移动厕所门面
export function toiletTexture() {
  return canvasTex(64, 128, (g, w, h) => {
    g.fillStyle = '#2c6bb0'; g.fillRect(0, 0, w, h);
    g.fillStyle = '#1f4f85'; g.fillRect(8, 22, w - 16, h - 26);
    g.fillStyle = '#e8edf2'; g.fillRect(0, 0, w, 14);
    g.fillStyle = '#d0d6dc'; g.fillRect(w - 18, 66, 6, 14);
    g.fillStyle = '#44b05a'; g.fillRect(w / 2 - 6, 30, 12, 6);
  });
}

// 哥特式立面屏：石色框架 + 两扇尖拱彩窗 + 顶部小圆窗（演出当天俯拍里三角柱的画面风格）
export function gothicPanel(seed = 1, { w = 512, h = 1280 } = {}) {
  const glass = stainedGlassCanvas(seed, 256, 512);
  return canvasTex(w, h, (g) => {
    const r = rng(seed);
    g.fillStyle = '#b49c7e'; g.fillRect(0, 0, w, h);
    stoneNoise(g, w, h, seed + 3, 700);
    const lancet = (x, y, ww, hh) => {
      g.save(); g.beginPath();
      g.moveTo(x, y + hh); g.lineTo(x, y + ww * 0.6);
      g.quadraticCurveTo(x, y, x + ww / 2, y - ww * 0.15); g.quadraticCurveTo(x + ww, y, x + ww, y + ww * 0.6);
      g.lineTo(x + ww, y + hh); g.closePath();
      g.strokeStyle = '#6e5a44'; g.lineWidth = 14; g.stroke(); g.clip();
      g.drawImage(glass, x, y - ww * 0.15, ww, hh + ww * 0.15);
      g.restore();
    };
    const mw = w * 0.34;
    lancet(w * 0.1, h * 0.3, mw, h * 0.58); lancet(w * 0.56, h * 0.3, mw, h * 0.58);
    // 顶部圆窗
    g.save(); g.beginPath(); g.arc(w / 2, h * 0.16, w * 0.17, 0, Math.PI * 2); g.clip(); g.drawImage(glass, w * 0.33, h * 0.16 - w * 0.17, w * 0.34, w * 0.34); g.restore();
    g.strokeStyle = '#6e5a44'; g.lineWidth = 12; g.beginPath(); g.arc(w / 2, h * 0.16, w * 0.17, 0, Math.PI * 2); g.stroke();
    for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2; g.beginPath(); g.moveTo(w / 2, h * 0.16); g.lineTo(w / 2 + Math.cos(a) * w * 0.17, h * 0.16 + Math.sin(a) * w * 0.17); g.lineWidth = 5; g.stroke(); }
    // 尖顶和两侧小柱
    g.fillStyle = '#8f7a5f'; g.beginPath(); g.moveTo(w * 0.3, h * 0.05); g.lineTo(w / 2, 0); g.lineTo(w * 0.7, h * 0.05); g.fill();
    g.fillStyle = '#9d876a'; g.fillRect(0, 0, w * 0.05, h); g.fillRect(w * 0.95, 0, w * 0.05, h); g.fillRect(w * 0.47, h * 0.3, w * 0.06, h * 0.6);
    // 粉色装饰线（演出画面里的品红点缀）
    g.strokeStyle = 'rgba(214,72,140,0.7)'; g.lineWidth = 6;
    for (let i = 0; i < 3; i++) { const y = h * (0.9 + i * 0.03); g.beginPath(); g.moveTo(w * 0.06, y); g.lineTo(w * 0.94, y); g.stroke(); }
    void r;
  });
}

// 彩窗玻璃画到离屏 canvas（供立面贴图裁切使用）
function stainedGlassCanvas(seed, w, h) {
  const t = stainedGlass(seed + 500, { w, h, cells: 46, lead: 3, palette: ['#123a7a', '#1d5aa6', '#1f7a8a', '#0f2c5c', '#2b9a8e', '#c2366f', '#d9a63a', '#3a2a7a'] });
  return t.image;
}

// ================= v5 =================

// 条纹人造草：深浅两色交替，每条 4 米（贴图一个周期 = 一深一浅 = 8 米），条纹沿 x（平行舞台）
export function turfTexture() {
  const w = 128, h = 256, f = fbmField(w, h, 91, 5, 8);
  return canvasTex(w, h, (g) => {
    const img = g.createImageData(w, h), r = rng(92);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const dark = y < h / 2, k = 0.86 + f[y * w + x] * 0.22 + (r() - 0.5) * 0.08, o = (y * w + x) * 4;
      const c = dark ? [34, 104, 44] : [62, 148, 58];
      img.data[o] = c[0] * k; img.data[o + 1] = c[1] * k; img.data[o + 2] = c[2] * k; img.data[o + 3] = 255;
    }
    g.putImageData(img, 0, 0);
  }, { repeat: true });
}

export function artFaceTexture(seed = 1) {
  return canvasTex(512, 1216, (g, w, h) => {
    const r = rng(seed * 77 + 5);
    const hue = [238, 262, 205, 285, 222, 250][seed % 6]; const bg = g.createLinearGradient(0, 0, 0, h); bg.addColorStop(0, `hsl(${hue},45%,30%)`); bg.addColorStop(0.5, `hsl(${hue + 18},45%,34%)`); bg.addColorStop(1, `hsl(${hue - 12},40%,24%)`);
    g.fillStyle = bg; g.fillRect(0, 0, w, h);
    const pal = ['#e9b44c', '#d9534f', '#4fb3a5', '#7d6bd6', '#f1e3c0', '#3f7fc4', '#e07a9a', '#8fc65a'];
    const pick = () => pal[Math.floor(r() * pal.length)];
    // 三扇尖拱窗
    for (let i = 0; i < 3; i++) {
      const x0 = w * (0.08 + i * 0.3), ww = w * 0.24, y0 = h * 0.52, hh = h * 0.42;
      g.beginPath(); g.moveTo(x0, y0 + hh); g.lineTo(x0, y0 + ww * 0.5); g.quadraticCurveTo(x0, y0 - ww * 0.3, x0 + ww / 2, y0 - ww * 0.55); g.quadraticCurveTo(x0 + ww, y0 - ww * 0.3, x0 + ww, y0 + ww * 0.5); g.lineTo(x0 + ww, y0 + hh); g.closePath();
      g.save(); g.clip();
      g.fillStyle = ['#2e6f8e', '#3d8f6e', '#6a4fa8'][i]; g.fillRect(x0, y0 - ww, ww, hh + ww);
      for (let k = 0; k < 9; k++) { g.fillStyle = pick(); const cx = x0 + r() * ww, cy = y0 + r() * hh, rr = 10 + r() * 26; g.beginPath(); for (let p = 0; p < 6; p++) { const a = (p / 6) * Math.PI * 2; g.ellipse(cx + Math.cos(a) * rr * 0.6, cy + Math.sin(a) * rr * 0.6, rr * 0.5, rr * 0.28, a, 0, Math.PI * 2); } g.fill(); g.fillStyle = '#f6e7b0'; g.beginPath(); g.arc(cx, cy, rr * 0.22, 0, 7); g.fill(); }
      g.restore(); g.strokeStyle = '#151633'; g.lineWidth = 9; g.stroke();
      g.lineWidth = 4; g.beginPath(); g.moveTo(x0 + ww / 2, y0 - ww * 0.5); g.lineTo(x0 + ww / 2, y0 + hh); g.stroke();
    }
    // 上方：太阳 + 放射线 + 星星
    const sx = w * (0.2 + r() * 0.6), sy = h * (0.12 + r() * 0.2);
    for (let k = 0; k < 16; k++) { const a = (k / 16) * Math.PI * 2; g.strokeStyle = k % 2 ? '#e9b44c' : '#d9534f'; g.lineWidth = 10; g.beginPath(); g.moveTo(sx + Math.cos(a) * 50, sy + Math.sin(a) * 50); g.lineTo(sx + Math.cos(a) * 120, sy + Math.sin(a) * 120); g.stroke(); }
    g.fillStyle = '#f2c14e'; g.beginPath(); g.arc(sx, sy, 52, 0, 7); g.fill(); g.fillStyle = '#e07a3a'; g.beginPath(); g.arc(sx, sy, 30, 0, 7); g.fill();
    for (let k = 0; k < 40; k++) { g.fillStyle = k % 3 ? '#f1e3c0' : pick(); const x = r() * w, y = r() * h * 0.5, q = 3 + r() * 7; g.beginPath(); g.moveTo(x, y - q); g.lineTo(x + q * 0.3, y - q * 0.3); g.lineTo(x + q, y); g.lineTo(x + q * 0.3, y + q * 0.3); g.lineTo(x, y + q); g.lineTo(x - q * 0.3, y + q * 0.3); g.lineTo(x - q, y); g.lineTo(x - q * 0.3, y - q * 0.3); g.fill(); }
    // 藤蔓曲线
    g.lineWidth = 7;
    for (let k = 0; k < 7; k++) { g.strokeStyle = pick(); g.beginPath(); let x = r() * w, y = h * (0.3 + r() * 0.2); g.moveTo(x, y); for (let q = 0; q < 4; q++) g.bezierCurveTo(x + (r() - 0.5) * 200, y + 30, x + (r() - 0.5) * 200, y + 60, x += (r() - 0.5) * 120, y += 50 + r() * 40); g.stroke(); }
  });
}

// 玫瑰窗半幅（中间两根屏塔拼成整幅）：石色齿轮状同心圆轮 + 蓝色玻璃
export function roseHalfTexture(leftHalf) {
  const full = roseWindowTexture().image;
  return canvasTex(512, 1216, (g, w, h) => { g.drawImage(full, leftHalf ? 0 : full.width / 2, 0, full.width / 2, full.height, 0, 0, w, h); });
}

export function circleFloorTexture() {
  return canvasTex(1024, 1024, (g, w, h) => {
    g.fillStyle = '#17161b'; g.fillRect(0, 0, w, h);
    const cx = w / 2, cy = h / 2;
    g.translate(cx, cy);
    for (let k = 0; k < 24; k++) { g.rotate(Math.PI / 12); g.fillStyle = k % 2 ? '#8a6a4a' : '#5a4636'; g.beginPath(); g.moveTo(0, -w * 0.47); g.quadraticCurveTo(w * 0.07, -w * 0.36, 0, -w * 0.27); g.quadraticCurveTo(-w * 0.07, -w * 0.36, 0, -w * 0.47); g.fill(); }
    g.setTransform(1, 0, 0, 1, 0, 0);
    for (const [rr, c, lw] of [[0.48, '#c9b38f', 6], [0.27, '#c9b38f', 5], [0.2, '#8a6a4a', 3], [0.12, '#c9b38f', 3]]) { g.strokeStyle = c; g.lineWidth = lw; g.beginPath(); g.arc(cx, cy, w * rr, 0, 7); g.stroke(); }
  });
}

// ================= 区域 A：屏塔 LED 屏的画面（第三轮新增，只供 venue/towers.js 用）=================

// 做法：先定“图案”（每一点该是什么颜色），再用细小的玻璃碎块（抖动网格 Voronoi，碎块约 13 像素）去取色，碎块之间画细铅条，
//   最后叠上外框尖拱、窗棂、圆窗、横向铁条这些粗一点的黑线。13×28 米的屏 → 512×1104 像素。seed 不同，配色和圆章位置不同。
export function gothicScreenTexture(seed = 1) {
  const w = 512, h = 1104, m = 14, span = w - 2 * m;
  const apexY = 22, springY = apexY + span * 0.866;                  // 外框：等边尖拱，拱脚在 springY
  const ro = { x: w / 2, y: apexY + span * 0.5, r: span * 0.3 };    // 拱头里的大圆窗
  const lanTop = springY - 10, lanW = (span - 2 * 8) / 3;            // 三扇小尖拱窗（竖向窗棂）
  const lanSpring = lanTop + lanW * 0.866, sill = h - 26;
  const r = rng(seed * 131 + 7);
  const hx = (s) => [parseInt(s.slice(1, 3), 16), parseInt(s.slice(3, 5), 16), parseInt(s.slice(5, 7), 16)];
  const bgSets = [['#43519c', '#544a98', '#62509e'], ['#4e4794', '#3f5a9e', '#5e4c9a'], ['#465096', '#56478f', '#3c5f98']];
  const bg = bgSets[seed % 3].map(hx);
  const petalSets = [['#c8584e', '#d98a4a', '#dcb05a'], ['#b8507a', '#d47a44', '#d0a454'], ['#d4804a', '#c05a46', '#e0bc5c']];
  const petals = petalSets[(seed + 1) % 3].map(hx), gold = hx('#e3b54a'), orange = hx('#d8743a'), green = hx('#3f9078'), pearl = hx('#e6dcf0'), dark = hx('#2a2244'), violet = hx('#6e55a8');
  // 圆章：每扇小窗的中线上隔一段一个（位置随 seed 错开）
  const meds = [];
  for (let k = 0; k < 3; k++) { const cx = m + 8 * k + lanW * (k + 0.5); for (let y = lanSpring + 50 + r() * 80; y < sill - 60; y += 230 + r() * 50) meds.push([cx, y, 36 + r() * 12, Math.floor(r() * 3)]); }
  const sun = seed % 2 === 1;                                         // 单数 seed 圆窗里是半个太阳，双数是花瓣玫瑰
  const insideArch = (x, y) => { if (x < m || x > w - m) return false; if (y >= springY) return true; return Math.hypot(x - (w - m), y - springY) < span && Math.hypot(x - m, y - springY) < span; };
  const col = (x, y) => {
    if (!insideArch(x, y) || y > sill) return r() < 0.03 ? gold : dark;                                   // 外框外面：暗紫，零星金点
    const dr = Math.hypot(x - ro.x, y - ro.y);
    if (dr < ro.r) {                                                                                       // 大圆窗
      const a = Math.atan2(y - ro.y, x - ro.x), q = dr / ro.r;
      if (sun) { if (q < 0.3) return y < ro.y + 6 ? gold : bg[0]; if (q < 0.4) return orange; return (Math.floor((a + Math.PI) / (Math.PI / 8)) % 2) ? gold : bg[1]; }
      if (q < 0.22) return gold; if (q < 0.62) return petals[Math.floor((a + Math.PI) / (Math.PI / 6)) % 3]; return (Math.floor((a + Math.PI) / (Math.PI / 12)) % 2) ? violet : bg[2];
    }
    for (const [cx, cy, rr, t] of meds) { const d = Math.hypot(x - cx, y - cy); if (d < rr) return d < rr * 0.3 ? gold : petals[(t + Math.floor((Math.atan2(y - cy, x - cx) + Math.PI) / (Math.PI / 3))) % 3]; if (d < rr * 1.35 && Math.abs(x - cx) < rr * 0.5) return green; }
    if (y < lanTop) return r() < 0.05 ? gold : violet;                                                     // 圆窗四周的三角空当
    const k = Math.min(2, Math.max(0, Math.floor((x - m) / (lanW + 8)))), lx = x - (m + 8 * k + lanW * (k + 0.5));
    if (y > lanSpring && Math.abs(lx) < 5) return green;
    { const ph = ((y - lanSpring) % 70 + 70) % 70, side = Math.floor((y - lanSpring) / 70) % 2 ? 1 : -1, ex = (lx - side * 24) / 26, ey = (ph - 35) / 12; if (y > lanSpring && ex * ex + ey * ey < 1) return green; }
    if (r() < 0.008) return pearl;
    return bg[(k + Math.floor(y / 220)) % 3];
  };
  return canvasTex(w, h, (g) => {
    // ① 玻璃碎块：抖动网格上的点，每点取图案颜色，亮度略有差别。
    const s = 28, nx = Math.ceil(w / s), ny = Math.ceil(h / s), P = new Float32Array(nx * ny * 2), C = new Float32Array(nx * ny * 3);
    for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) {
      const k = j * nx + i, px = (i + 0.15 + 0.7 * r()) * s, py = (j + 0.15 + 0.7 * r()) * s, c = col(px, py), l = 0.85 + r() * 0.3;
      P[k * 2] = px; P[k * 2 + 1] = py; C[k * 3] = c[0] * l; C[k * 3 + 1] = c[1] * l; C[k * 3 + 2] = c[2] * l;
    }
    const img = g.createImageData(w, h);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const ci = Math.floor(x / s), cj = Math.floor(y / s); let d1 = 1e9, d2 = 1e9, kb = 0;
      for (let dj = -1; dj <= 1; dj++) for (let di = -1; di <= 1; di++) {
        const ii = ci + di, jj = cj + dj; if (ii < 0 || jj < 0 || ii >= nx || jj >= ny) continue;
        const k = jj * nx + ii, dx = x - P[k * 2], dy = y - P[k * 2 + 1], d = dx * dx + dy * dy;
        if (d < d1) { d2 = d1; d1 = d; kb = k; } else if (d < d2) d2 = d;
      }
      const e = Math.sqrt(d2) - Math.sqrt(d1), o = (y * w + x) * 4;
      if (e < 2.4) { img.data[o] = 20; img.data[o + 1] = 16; img.data[o + 2] = 26; }
      else { const l = 0.8 + Math.min(e, 10) / 40; img.data[o] = Math.min(255, C[kb * 3] * l); img.data[o + 1] = Math.min(255, C[kb * 3 + 1] * l); img.data[o + 2] = Math.min(255, C[kb * 3 + 2] * l); }
      img.data[o + 3] = 255;
    }
    g.putImageData(img, 0, 0);
    // ② 粗一点的黑线：外框尖拱、圆窗和里面的小圆、三扇小尖拱窗、窗棂、横向铁条、圆章外圈
    g.strokeStyle = '#15111c'; g.lineJoin = 'round';
    const pointed = (x0, x1, ys, yb) => { const sp = x1 - x0; g.moveTo(x0, yb); g.lineTo(x0, ys); g.arc(x1, ys, sp, Math.PI, Math.PI + Math.PI / 3); g.arc(x0, ys, sp, -Math.PI / 3, 0); g.lineTo(x1, yb); };
    g.lineWidth = 8; g.beginPath(); pointed(m, w - m, springY, sill); g.closePath(); g.stroke();
    g.lineWidth = 7; g.beginPath(); g.arc(ro.x, ro.y, ro.r, 0, Math.PI * 2); g.stroke();
    g.lineWidth = 3; for (let k = 0; k < 6; k++) { const a = (k / 6) * Math.PI * 2; g.beginPath(); g.arc(ro.x + Math.cos(a) * ro.r * 0.62, ro.y + Math.sin(a) * ro.r * 0.62, ro.r * 0.36, 0, Math.PI * 2); g.stroke(); }
    g.beginPath(); g.arc(ro.x, ro.y, ro.r * 0.22, 0, Math.PI * 2); g.stroke();
    for (let k = 0; k < 3; k++) {
      const x0 = m + 8 * k + lanW * k, x1 = x0 + lanW;
      g.lineWidth = 6; g.beginPath(); pointed(x0, x1, lanSpring, sill); g.stroke();
      g.lineWidth = 2.5; for (let y = lanSpring + 60; y < sill; y += 64) { g.beginPath(); g.moveTo(x0, y); g.lineTo(x1, y); g.stroke(); }
      g.lineWidth = 2; g.beginPath(); g.moveTo((x0 + x1) / 2, lanSpring - lanW * 0.6); g.lineTo((x0 + x1) / 2, sill); g.stroke();   // 每扇小窗中间一根细竖棂
    }
    g.lineWidth = 2.5; for (const [cx, cy, rr] of meds) { g.beginPath(); g.arc(cx, cy, rr, 0, Math.PI * 2); g.stroke(); }
    g.lineWidth = 8; g.beginPath(); g.moveTo(m, sill); g.lineTo(w - m, sill); g.stroke();
  });
}

//   深紫夜空 + 红白火星点，下面一座红橙色城堡——几座圆塔，尖锥顶，最高一座细高塔带长尖顶，中段一道浅色城垛，
//   最下面一道亮橙色城墙和城垛，塔上有发光的小窗，几道斜穿画面的橙色光线。seed 双数左右翻过来。
export function castleScreenTexture(seed = 1) {
  const w = 512, h = 1104;
  return canvasTex(w, h, (g) => {
    const r = rng(seed * 97 + 3);
    if (seed % 2 === 0) { g.translate(w, 0); g.scale(-1, 1); }
    const sky = g.createLinearGradient(0, 0, 0, h);
    sky.addColorStop(0, '#140a30'); sky.addColorStop(0.45, '#2a0f48'); sky.addColorStop(0.72, '#4a1236'); sky.addColorStop(1, '#2a0808');
    g.fillStyle = sky; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 280; i++) { const s = 2 + r() * 4; g.fillStyle = r() < 0.65 ? `rgba(255,${70 + r() * 70 | 0},60,${0.5 + r() * 0.5})` : `rgba(255,236,226,${0.45 + r() * 0.55})`; g.fillRect(r() * w, r() * h * 0.7, s, s); }
    // 中段一道浅色城垛（塔后面）
    const midY = h * (0.55 + r() * 0.03);
    g.fillStyle = '#b9a8d8'; g.fillRect(0, midY, w, 14); for (let x = 4; x < w; x += 26) g.fillRect(x, midY - 12, 14, 12);
    g.fillStyle = '#3a0c22'; g.fillRect(0, midY + 14, w, h * 0.82 - midY - 14);
    // 塔：[中心 x, 宽, 塔身顶 y, 尖顶高]；第一座是最高的细塔
    // 照片里上面四成是夜空；最高的细塔尖顶到画面 0.15 左右，其余塔顶在中段城垛（0.6）上下，城墙在 0.85 附近
    // [中心 x, 宽, 塔身顶 y, 尖顶高, 尖顶外撇]；外撇大的是“巫师帽”式的宽檐尖顶（照片左下那座）
    const T = [[0.76, 46, 0.31, 0.15, 8], [0.88, 26, 0.5, 0.07, 6], [0.5, 54, 0.53, 0.1, 10], [0.12, 26, 0.36, 0.07, 6], [0.3, 40, 0.66, 0.08, 26]];
    for (const [fx, tw, fy, fr, fl] of T) {
      const cx = (fx + (r() - 0.5) * 0.04) * w, top = (fy + (r() - 0.5) * 0.03) * h, rh = fr * h, x0 = cx - tw / 2;
      const body = g.createLinearGradient(x0, 0, x0 + tw, 0); body.addColorStop(0, '#6a0806'); body.addColorStop(0.45, '#f0301a'); body.addColorStop(1, '#ffa050');
      g.fillStyle = body; g.fillRect(x0, top, tw, h * 0.84 - top);
      g.fillStyle = '#ffb070'; g.fillRect(x0 - 5, top - 6, tw + 10, 8);                                            // 塔顶檐口
      g.fillStyle = '#300606'; g.strokeStyle = '#ff7a30'; g.lineWidth = 3;
      g.beginPath(); g.moveTo(x0 - fl, top - 2); g.quadraticCurveTo(cx - tw * 0.2, top - rh * 0.35, cx, top - rh); g.quadraticCurveTo(cx + tw * 0.2, top - rh * 0.35, x0 + tw + fl, top - 2); g.closePath(); g.fill(); g.stroke();   // 尖锥顶
      g.save(); g.shadowColor = '#ffb060'; g.shadowBlur = 14; g.fillStyle = '#fff1cc';
      for (let y = top + 24; y < h * 0.78; y += 70 + r() * 50) { const ww = Math.max(6, tw * 0.18); g.beginPath(); g.moveTo(cx - ww / 2, y + ww * 1.6); g.lineTo(cx - ww / 2, y + ww * 0.5); g.arc(cx, y + ww * 0.5, ww / 2, Math.PI, 0); g.lineTo(cx + ww / 2, y + ww * 1.6); g.fill(); }
      g.restore();
    }
    // 最下面亮橙色城墙 + 城垛，墙面细砖缝
    const wy = h * 0.82, wall = g.createLinearGradient(0, wy, 0, h);
    wall.addColorStop(0, '#ff9a40'); wall.addColorStop(0.5, '#ff6a20'); wall.addColorStop(1, '#a82a10');
    g.fillStyle = wall; g.fillRect(0, wy, w, h - wy); for (let x = 2; x < w; x += 30) g.fillRect(x, wy - 22, 18, 22);
    g.strokeStyle = 'rgba(90,20,6,0.6)'; g.lineWidth = 2; for (let y = wy + 16; y < h; y += 16) { g.beginPath(); g.moveTo(0, y); g.lineTo(w, y); g.stroke(); }
    // 斜穿画面的橙色光线
    g.save(); g.shadowColor = '#ff6020'; g.shadowBlur = 16; g.strokeStyle = 'rgba(255,214,170,0.9)'; g.lineWidth = 4;
    for (let i = 0; i < 4; i++) { const x0 = w * (0.3 + i * 0.1 + r() * 0.05); g.beginPath(); g.moveTo(x0, h * 0.95); g.lineTo(x0 + w * (0.35 + r() * 0.2), h * (0.4 + r() * 0.1)); g.stroke(); }
    g.restore();
  });
}
