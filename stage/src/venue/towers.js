// 区域 A：屏塔（8 座三角屏塔 + 九号塔）、屏塔台面与轨道、主舞台、走道。位置尺寸和依据都在 layout/towers.js。
import * as THREE from 'three';
import { LAYOUT } from '../layout.js';
import * as TX from '../textures.js';
import { TrussKit } from '../truss.js';
import { MAT, V, box, labeled, movingHead, registerVideoScreen } from './common.js';
import { buildDecoFace, decoMaterials } from './deco-faces.js';

const TAU = Math.PI * 2;

// ---------- 浮雕装饰面 ----------
function decoPanel(kind, W, H, ledMat, stoneMat) {
  const g = new THREE.Group(), sh = new THREE.Shape();
  sh.moveTo(-W / 2, 0); sh.lineTo(W / 2, 0); sh.lineTo(W / 2, H); sh.lineTo(-W / 2, H); sh.closePath();
  const arch = (cx, y0, w, h) => { const p = new THREE.Path(); p.moveTo(cx - w / 2, y0); p.lineTo(cx - w / 2, y0 + h - w / 2); p.absarc(cx, y0 + h - w / 2, w / 2, Math.PI, 0, true); p.lineTo(cx + w / 2, y0); p.closePath(); return p; };
  const sector = (cx, cy, r0, r1, a0, a1) => { const p = new THREE.Path(), n = 24; for (let i = 0; i <= n; i++) { const a = a0 + (a1 - a0) * i / n; i ? p.lineTo(cx + Math.cos(a) * r1, cy + Math.sin(a) * r1) : p.moveTo(cx + Math.cos(a) * r1, cy + Math.sin(a) * r1); } for (let i = n; i >= 0; i--) { const a = a0 + (a1 - a0) * i / n; p.lineTo(cx + Math.cos(a) * r0, cy + Math.sin(a) * r0); } p.closePath(); return p; };
  const studs = [];   // 凸起的放射状石肋（玫瑰窗轮辐），[x, y, 长, 角度]
  if (kind === 'rose-l' || kind === 'rose-r') {
    // 半个玫瑰窗：圆心在面的内侧边（两座背靠背后接缝在正前方，两半合成整圆）。三圈镂空环带，每圈按轮辐分格；下方一扇拱门。
    const s = kind === 'rose-l' ? 1 : -1, cx = s * W / 2, cy = H * 0.6;
    const aMid = s > 0 ? Math.PI : 0;                               // 半圆朝外侧张开
    const rings = [[2.0, 3.6, 4], [4.6, 6.4, 6], [7.4, 9.2, 8]];
    for (const [r0, r1, n] of rings) for (let k = 0; k < n; k++) {
      const a0 = aMid - Math.PI / 2 + (Math.PI * k) / n + 0.05, a1 = aMid - Math.PI / 2 + (Math.PI * (k + 1)) / n - 0.05;
      sh.holes.push(sector(cx, cy, r0, r1, a0, a1));
      studs.push([cx + Math.cos(a1 + 0.05) * (r0 + r1) / 2, cy + Math.sin(a1 + 0.05) * (r0 + r1) / 2, r1 - r0 + 0.6, a1 + 0.05]);
    }
    for (const radius of [1.86, 3.85, 6.64, 9.42]) {
      const low = aMid - Math.PI / 2 + 0.035, high = aMid + Math.PI / 2 - 0.035;
      const profile = new THREE.Shape(sector(cx, cy, radius - 0.13, radius + 0.13, low, high).getPoints());
      const lip = new THREE.Mesh(new THREE.ExtrudeGeometry(profile, { depth: 0.16, bevelThickness: 0.045, bevelSize: 0.045, bevelSegments: 1, steps: 1 }), stoneMat);
      lip.position.z = 0.89;
      lip.castShadow = lip.receiveShadow = true;
      g.add(lip);
    }
    sh.holes.push(arch(-s * W * 0.22, 1.0, 3.2, 6.5));
  } else if (kind === 'arch') {
    sh.holes.push(arch(0, 1.2, 6.2, 16)); sh.holes.push(sector(0, H * 0.82, 0.9, 2.2, 0, TAU - 0.001));
  } else {
    // 连拱：三扇并排的高拱 + 上方一个分 6 格的大圆窗 + 底部台阶。窗棂很细，大部分面积露出后面的 LED
    for (const cx of [-W * 0.3, 0, W * 0.3]) sh.holes.push(arch(cx, 2.8, 2.9, 15));
    for (let k = 0; k < 6; k++) sh.holes.push(sector(0, H * 0.78, 1.0, 3.6, (k * TAU) / 6 + 0.08, ((k + 1) * TAU) / 6 - 0.08));
  }
  const slab = new THREE.Mesh(new THREE.ExtrudeGeometry(sh, { depth: 0.9, bevelEnabled: false, curveSegments: 10 }), stoneMat); slab.castShadow = slab.receiveShadow = true; g.add(slab);
  // 凸起的线脚：外框和几道横向檐口
  for (const [x, y, w, h] of [[0, H - 0.4, W, 0.8], [0, 0.4, W, 0.8], [-W / 2 + 0.3, H / 2, 0.6, H], [W / 2 - 0.3, H / 2, 0.6, H], [0, H * 0.3, W, 0.35]]) g.add(box(w, h, 0.5, stoneMat, x, y, 1.1));
  for (const [x, y, l, a] of studs) { const m = box(0.35, l, 0.45, stoneMat, x, y, 1.05); m.rotation.z = a - Math.PI / 2; g.add(m); }
  if (kind === 'arcade') for (let i = 0; i < 4; i++) g.add(box(W - i * 1.6, 0.6, 0.9 + i * 0.1, stoneMat, 0, 0.3 + i * 0.6, 1.0 + 0.4 * (3 - i)));   // 台阶
  const led = new THREE.Mesh(new THREE.PlaneGeometry(W - 0.4, H - 0.4), ledMat); led.position.set(0, H / 2, 0.05); g.add(led);
  return g;
}

// ---------- 三角屏塔 ----------
// 等边三角柱，三个面：0 = LED 大屏 13×28；1 = 灯阵；2 = 浮雕装饰面 11×28。骨架是三根角柱 + 多层环梁的桁架，
function buildPrism(idx, shared) {
  const P = LAYOUT.prisms, { side, base } = P, [SW, SH] = P.screen, [DW, DH] = P.decoSize, h = base + SH + 0.6;
  const ap = side / (2 * Math.sqrt(3)), R = side / Math.sqrt(3);
  const corners = [0, 1, 2].map((i) => { const a = (i * TAU) / 3 + Math.PI / 3; return V(Math.sin(a) * R, 0, Math.cos(a) * R); });
  const g = new THREE.Group(); g.position.set(0, P.lift, P.rowZ);
  const body = new THREE.Group(); g.add(body);
  g.userData = { body, idx, wheels: [] };
  const kit = new TrussKit(0x1c1d21);
  for (const c of corners) kit.column(c.x, c.z, h, 1.0, base - 0.2);
  for (const y of [base + 0.4, h * 0.27, h * 0.52, h * 0.77, h + base - 0.9]) for (let i = 0; i < 3; i++) kit.beam(corners[i].clone().setY(y), corners[(i + 1) % 3].clone().setY(y), 0.9);
  const mids = [0, 1, 2].map((i) => corners[i].clone().lerp(corners[(i + 1) % 3], 0.5).setY(h + base - 0.9));
  for (let i = 0; i < 3; i++) kit.beam(mids[i], mids[(i + 1) % 3], 0.8);
  body.add(kit.build());
  const cap = new THREE.Mesh(shared.capGeo, MAT.dark); cap.rotation.y = Math.PI / 3; cap.position.y = h + base - 1.6; body.add(cap);
  const hand = (P.hands && P.hands[idx]) || 1;   // 面的先后次序：-1 = 镜像塔（见 layout 里 hands 的说明）
  for (let i = 0; i < 3; i++) {
    const th = (hand * i * TAU) / 3, nx = Math.sin(th), nz = Math.cos(th), cy = base + SH / 2;
    const back = box(side - 0.9, SH + 0.4, 0.5, MAT.speaker, nx * (ap + 0.05), cy, nz * (ap + 0.05)); back.rotation.y = th; body.add(back);   // 屏体/灯架的背板
    if (i === 0) {
      const t = shared.screenTex[idx], mat = new THREE.MeshStandardMaterial({ map: t, emissiveMap: t, emissive: 0xffffff, emissiveIntensity: 0.16, roughness: 0.45 });
      mat.userData.nightMap = shared.castleTex[idx];
      const scr = new THREE.Mesh(new THREE.PlaneGeometry(SW, SH), mat);
      scr.position.set(nx * (ap + 0.32), cy, nz * (ap + 0.32)); scr.rotation.y = th; scr.castShadow = true; body.add(scr);
      registerVideoScreen(scr, { group: 'tower', name: `屏塔 ${idx + 1} 大屏`, w: SW, h: SH });
    } else if (i === 1) {   // 灯阵：方形灯具点阵
      const C = P.matrix, n = C.cols * C.rows, px = SW / C.cols, py = SH / C.rows, M4 = new THREE.Matrix4();
      const lamps = new THREE.InstancedMesh(shared.lampGeo, MAT.headBody, n), lens = new THREE.InstancedMesh(shared.lensGeo, MAT.matrixLens, n), rot = new THREE.Matrix4().makeRotationY(th);
      for (let c = 0; c < C.cols; c++) for (let r = 0; r < C.rows; r++) { const lx = -SW / 2 + px * (c + 0.5), ly = base + py * (r + 0.5), k = c * C.rows + r; M4.makeTranslation(lx, ly, ap + 0.45).premultiply(rot); lamps.setMatrixAt(k, M4); M4.makeTranslation(lx, ly, ap + 0.63).premultiply(rot); lens.setMatrixAt(k, M4); }
      lamps.castShadow = true; body.add(lamps, lens);
    } else {                // 浮雕装饰面 11×28
      const kind = P.deco[idx], rose = kind === 'rose-l' ? 1 : kind === 'rose-r' ? -1 : 0, fw = rose ? side + 0.3 : side - 0.35;
      const full = buildDecoFace(kind, fw, DH, MAT.decoLed);
      if (full) { const o = rose * 0.15; full.position.set(nx * (ap + 0.3) + Math.cos(th) * o, base, nz * (ap + 0.3) - Math.sin(th) * o); full.rotation.y = th; body.add(full); continue; }
      const off = kind === 'rose-l' ? (side - DW) / 2 : kind === 'rose-r' ? -(side - DW) / 2 : 0;
      const d = decoPanel(kind, DW, DH, MAT.decoLed, shared.stone); d.position.set(nx * (ap + 0.3) + Math.cos(th) * off, base, nz * (ap + 0.3) - Math.sin(th) * off); d.rotation.y = th; body.add(d);
    }
  }
  { const n = 9, lamps = new THREE.InstancedMesh(shared.topLampGeo, MAT.headBody, 3 * n), M4 = new THREE.Matrix4();
    for (let i = 0; i < 3; i++) for (let j = 0; j < n; j++) { const c = corners[i].clone().lerp(corners[(i + 1) % 3], (j + 0.5) / n); M4.makeTranslation(c.x, h + base - 0.2, c.z); lamps.setMatrixAt(i * n + j, M4); }
    lamps.castShadow = true; body.add(lamps); }
  // 底部三角台车 + 骑在粗梁上的轮子。塔会前后换排（见 layout 里“运动方式”），轮子不跟着塔前后挪：
  // 每帧按塔现在的前后位置，只在塔脚下面压着的那几道粗梁上摆轮子（updatePrisms）。
  const cart = new THREE.Mesh(shared.cartGeo, MAT.dark); cart.rotation.y = Math.PI / 3; cart.position.y = 0.45 + (base - 0.5) / 2; cart.castShadow = true; body.add(cart);
  for (const sx of [-1, 1]) for (const bz of P.beams) { const w = new THREE.Mesh(shared.wheelGeo, MAT.steel); w.rotation.x = Math.PI / 2; w.position.set(sx * 2.5, 0.45, bz - P.rowZ); w.userData.bz = bz; g.add(w); g.userData.wheels.push(w); }
  return labeled(g, `屏塔 ${idx + 1}`);
}

// ---------- 九号塔（镜面塔）----------
// 拉长六边形截面；通高镜面，下半段往下收窄（倒立水晶柱）；正面整条 LED；侧面是黑框分格的三角形镜面；顶面火星标志。
function hexPts(H, s = 1) {   // 截面六个角点 [x, z]，从正面左角起顺时针（俯视）；s = 缩放
  const f = (s * H.front) / 2, w = (s * H.width) / 2, d = (s * H.depth) / 2;
  return [[-f, d], [f, d], [w, 0], [f, -d], [-f, -d], [-w, 0]];
}
function buildTower9() {
  const T = LAYOUT.tower9, H = T.hex, g = new THREE.Group(); g.position.set(T.x, 0.8, T.z);   // 0.8 = 米白台面顶
  const y1 = T.taper.y1 * T.h;
  const full = hexPts(H), foot = hexPts(H, T.taper.scale);
  const mirror = new THREE.MeshStandardMaterial({ color: 0x66707a, roughness: 0.12, metalness: 1.0, envMapIntensity: 1.0, side: THREE.DoubleSide });
  const white = new THREE.MeshStandardMaterial({ color: 0xeef0f2, roughness: 0.35, metalness: 0.2 });
  const frames = [];   // 黑框：[x0,y0,z0, x1,y1,z1]
  // 一块侧面：下边 a0→b0（高 ya）、上边 a1→b1（高 yb），下边可以比上边窄（收窄段）；铺镜面，再按 facetRow 画三角分格
  const face = (a0, b0, a1, b1, ya, yb, mat, facets) => {
    const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute([a0[0], ya, a0[1], b0[0], ya, b0[1], b1[0], yb, b1[1], a0[0], ya, a0[1], b1[0], yb, b1[1], a1[0], yb, a1[1]], 3)); geo.computeVertexNormals();
    const m = new THREE.Mesh(geo, mat); m.castShadow = m.receiveShadow = true; g.add(m);
    if (!facets) return;
    const L = (p, q, t) => p + (q - p) * t;   // 按高度在下边和上边之间插值
    const rows = Math.max(1, Math.round((yb - ya) / T.facetRow)), P = (u, y) => { const t = (y - ya) / (yb - ya), ax = L(a0[0], a1[0], t), az = L(a0[1], a1[1], t), bx = L(b0[0], b1[0], t), bz = L(b0[1], b1[1], t); return [ax + (bx - ax) * u, y, az + (bz - az) * u]; };
    for (let r = 0; r <= rows; r++) { const y = ya + ((yb - ya) * r) / rows; frames.push([...P(0, y), ...P(1, y)]); }
    for (let r = 0; r < rows; r++) {
      const ya2 = ya + ((yb - ya) * r) / rows, yb2 = ya + ((yb - ya) * (r + 1)) / rows;
      if (r % 2 === 0) { frames.push([...P(0, ya2), ...P(0.5, yb2)]); frames.push([...P(1, ya2), ...P(0.5, yb2)]); }
      else { frames.push([...P(0.5, ya2), ...P(0, yb2)]); frames.push([...P(0.5, ya2), ...P(1, yb2)]); }
    }
    frames.push([...P(0, ya), ...P(0, yb)]);
  };
  const ledTex = TX.stainedGlass(31, { cells: 40, lead: 3, palette: ['#1d6f5a', '#2a8f6e', '#235a8a', '#3aa07a', '#1f4f70'] });
  MAT.spire = new THREE.MeshStandardMaterial({ map: ledTex, color: 0x4a4e56,
     emissive: 0x2fd08a, emissiveIntensity: 0, roughness: 0.35, metalness: 0.1 });
  // 两段：下段从塔脚的小截面收到 y1 的整截面，上段整截面到顶。正面两段都是 LED，其余五个面是分格镜面。
  for (const [ya, yb, lo, hi] of [[0, y1, foot, full], [y1, T.h, full, full]]) {
    face(lo[0], lo[1], hi[0], hi[1], ya, yb, MAT.spire, false);
    for (let i = 1; i < 6; i++) face(lo[i], lo[(i + 1) % 6], hi[i], hi[(i + 1) % 6], ya, yb, mirror, true);
  }
  for (const i of [2, 4]) {
    const a = full[i], b = full[(i + 1) % 6], mx = (a[0] + b[0]) / 2, mz = (a[1] + b[1]) / 2, ang = Math.atan2(b[0] - a[0], b[1] - a[1]);
    const tri = new THREE.Mesh(new THREE.CylinderGeometry(1.5, 1.5, 0.25, 3), white); tri.rotation.set(Math.PI / 2, 0, Math.PI); tri.scale.set(1, 1, 1.6);
    const holder = new THREE.Group(); holder.position.set(mx * 1.02, y1 + 1.5, mz * 1.02); holder.rotation.y = ang + Math.PI / 2; holder.add(tri); g.add(holder);
  }
  // 黑框（实例化细方条）
  const fm = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), MAT.dark, frames.length), M4 = new THREE.Matrix4(), q = new THREE.Quaternion(), up = V(0, 1, 0), d = V(0, 0, 0);
  frames.forEach(([ax, ay, az, bx, by, bz], i) => { d.set(bx - ax, by - ay, bz - az); const len = d.length(); q.setFromUnitVectors(up, d.normalize()); M4.compose(V((ax + bx) / 2, (ay + by) / 2, (az + bz) / 2), q, V(0.14, len, 0.14)); fm.setMatrixAt(i, M4); });
  fm.castShadow = true; g.add(fm);
  const topSh = new THREE.Shape(full.map(([x, z]) => new THREE.Vector2(x, -z)));
  const topGeo = new THREE.ShapeGeometry(topSh), uv = topGeo.attributes.uv, pos = topGeo.attributes.position, S = Math.max(H.width, H.depth);
  for (let i = 0; i < pos.count; i++) uv.setXY(i, pos.getX(i) / S + 0.5, pos.getY(i) / S + 0.5);
  const logoT = TX.marsLogoTexture(512, '#3a3b40');
  const cap = new THREE.Mesh(topGeo, new THREE.MeshStandardMaterial({ map: logoT, color: 0xffffff, roughness: 0.7 })); cap.rotation.x = -Math.PI / 2; cap.position.y = T.h + 0.02; g.add(cap);
  // 底座：一圈黑色踢脚
  const plinth = new THREE.Mesh(new THREE.ExtrudeGeometry(new THREE.Shape(foot.map(([x, z]) => new THREE.Vector2(x * 1.06, -z * 1.06))), { depth: 0.6, bevelEnabled: false }), MAT.dark); plinth.rotation.x = -Math.PI / 2; g.add(plinth);
  return labeled(g, '九号塔（镜面塔）');
}

let gratingMat = null;
function buildWalk() {
  const T = LAYOUT.tower9, W = T.walk, g = new THREE.Group(), z0 = T.z + (T.hex.depth * T.taper.scale) / 2, len = W.z1 - z0;
  if (!gratingMat) {
    const c = document.createElement('canvas'); c.width = 64; c.height = 64; const x = c.getContext('2d');
    x.fillStyle = '#2a2c30'; x.fillRect(0, 0, 64, 64); x.fillStyle = '#8d9096'; for (let i = 0; i < 64; i += 8) { x.fillRect(i, 0, 2, 64); x.fillRect(0, i, 64, 2); }
    const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(W.w / 0.4, len / 0.4); t.colorSpace = THREE.SRGBColorSpace;
    gratingMat = new THREE.MeshStandardMaterial({ map: t, metalness: 0.6, roughness: 0.5 });
  }
  const kit = new TrussKit(0x1c1d21);
  for (const sx of [-1, 1]) kit.beam(V(sx * (W.w / 2 - 0.25), W.h - 0.3, z0), V(sx * (W.w / 2 - 0.25), W.h - 0.3, W.z1), 0.5);
  g.add(kit.build());
  g.add(box(W.w, 0.08, len, gratingMat, 0, W.h, z0 + len / 2));
  return labeled(g, null);
}

// ---------- 屏塔台面与轨道 ----------
function buildPrismDeck() {
  const P = LAYOUT.prisms, D = P.deck, g = new THREE.Group(), [bw, bh] = P.beamSize, L = D.x1 - D.x0 + 4;
  g.add(box(D.x1 - D.x0, 0.8, D.z1 - D.z0, MAT.beige, (D.x0 + D.x1) / 2, 0.4, (D.z0 + D.z1) / 2));
  const kit = new TrussKit(0x141417);
  for (const z of P.beams) {
    for (const o of [-1, 1]) kit.beam(V(-L / 2, 0.8 + bh / 2, z + (o * bw) / 4), V(L / 2, 0.8 + bh / 2, z + (o * bw) / 4), bw / 2);
    g.add(box(L, 0.12, bw - 0.2, MAT.deck, 0, 0.8 + bh - 0.06, z));
    for (const o of [-0.55, 0.55]) g.add(box(L, 0.1, 0.18, MAT.steel, 0, 0.8 + bh + 0.05, z + o));
  }
  // 扁平梯形桁架：两根边杆 + 每 0.7 米一根横档
  const n0 = Math.floor((D.x1 - D.x0) / P.slatEvery), x0 = -(n0 - 1) * P.slatEvery / 2;
  for (let i = 0; i < n0; i++) g.add(box(0.9, 0.04, D.z1 - D.z0 - 1, MAT.deck, x0 + i * P.slatEvery, 0.82, (D.z0 + D.z1) / 2));
  for (let i = 0; i < n0; i++) { const x = x0 + i * P.slatEvery; for (const o of [-0.35, 0.35]) kit.tube(V(x + o, 0.86, D.z0 + 0.5), V(x + o, 0.86, D.z1 - 0.5), 0.06); for (let z = D.z0 + 0.8; z < D.z1 - 0.5; z += 0.7) kit.tube(V(x - 0.35, 0.86, z), V(x + 0.35, 0.86, z), 0.035); }
  g.add(kit.build());
  return labeled(g, null);
}

export function buildPrisms() {
  const shared = {
    screenTex: [1, 2, 3, 4, 5, 6, 7, 8].map((s) => TX.gothicScreenTexture(s)),
    castleTex: [1, 2, 3, 4, 5, 6, 7, 8].map((s) => TX.castleScreenTexture(s)),
    stone: decoMaterials().stone,
    lampGeo: new THREE.BoxGeometry(0.62, 0.62, 0.34), lensGeo: new THREE.CircleGeometry(0.2, 10), topLampGeo: new THREE.BoxGeometry(0.45, 0.5, 0.45),
    capGeo: new THREE.CylinderGeometry((LAYOUT.prisms.side / Math.sqrt(3)) * 0.96, (LAYOUT.prisms.side / Math.sqrt(3)) * 0.96, 0.15, 3),
    wheelGeo: new THREE.CylinderGeometry(0.5, 0.5, 0.4, 16), cartGeo: new THREE.CylinderGeometry((LAYOUT.prisms.side / Math.sqrt(3)) * 1.02, (LAYOUT.prisms.side / Math.sqrt(3)) * 1.02, LAYOUT.prisms.base - 0.5, 3),
  };
  const decoLedTex = TX.stainedGlass(77, { cells: 60, lead: 2, palette: ['#5a3fb0', '#d8a830', '#b8403a', '#3a9a5a', '#2a6fd0', '#c8702a'] });
  MAT.decoLed = new THREE.MeshStandardMaterial({ map: decoLedTex, emissiveMap: decoLedTex, emissive: 0xffffff, emissiveIntensity: 0.25, roughness: 0.4 });
  const out = [];
  for (let i = 0; i < LAYOUT.prisms.deco.length; i++) out.push(buildPrism(i, shared));
  out.push(buildTower9(), buildWalk(), buildPrismDeck());
  return out;
}

// ---------- 站位切换：沿梁左右平移 + 前后换排 + 绕自身中心转。每个站位都是 8 座（数量永远不变）----------
export const PRISM_MODES = Object.fromEntries(Object.entries(LAYOUT.prisms.modes).map(([k, v]) => [k, v.label]));
export function setPrismCustomTargets(prismGroups, list) {
  if (!Array.isArray(list) || !list.length) return;
  for (const g of prismGroups) {
    const u = g.userData; if (!u.body) continue;
    const item = list[u.idx];
    if (!item) continue;
    let x, face, phi, dz;
    if (Array.isArray(item)) {
      [x, face, phi, dz = 0] = item;
    } else {
      x = item.x ?? g.position.x;
      face = item.face ?? 0;
      phi = item.angleDeg != null ? (item.angleDeg * Math.PI) / 180 : (item.phi ?? 0);
      dz = item.dz ?? 0;
    }
    const hand = (LAYOUT.prisms.hands && LAYOUT.prisms.hands[u.idx]) || 1;
    let rot = phi - (hand * face * TAU) / 3;
    const cur = u.body.rotation.y; rot += Math.round((cur - rot) / TAU) * TAU;
    u.targetRot = rot; u.targetX = x; u.targetZ = LAYOUT.prisms.rowZ + dz;
  }
}
export function setPrismTargets(prismGroups, mode) {
  if (Array.isArray(mode)) { setPrismCustomTargets(prismGroups, mode); return; }
  const Ms = LAYOUT.prisms.modes, M = Ms[mode] || Ms[LAYOUT.prisms.defaultMode] || Object.values(Ms)[0];
  setPrismCustomTargets(prismGroups, M.t);
}
export function updatePrisms(prismGroups, dt, snap = false) {
  const k = snap ? 1 : 1 - Math.exp(-dt * 0.9), reach = LAYOUT.prisms.side / 2 + 0.2;   // 塔脚前后能压到的粗梁：离塔中心 7 米以内
  for (const g of prismGroups) {
    const u = g.userData; if (!u.body) continue;
    u.body.rotation.y += ((u.targetRot ?? u.body.rotation.y) - u.body.rotation.y) * k;
    const dx = ((u.targetX ?? g.position.x) - g.position.x) * k; g.position.x += dx;
    g.position.z += ((u.targetZ ?? g.position.z) - g.position.z) * k;
    for (const w of u.wheels) { w.rotation.y -= dx / 0.5; w.position.z = w.userData.bz - g.position.z; w.visible = Math.abs(w.position.z) <= reach; }
  }
}

// 白色灯条的材质：白天和原来的 MAT.ledWhite 一样亮；夜里 night.js 按灯光主题的灯条色（strips）点亮（userData.nightStrips）。
// night.js 只处理带发光贴图的材质，所以挂一张纯灰的发光贴图：灰度 k 把夜里的亮度压到 k 倍，白天用 1/k 倍的强度补回来。
function glowStrip(k) {
  const c = document.createElement('canvas'); c.width = c.height = 4; const x = c.getContext('2d'), v = Math.round(255 * k);
  x.fillStyle = `rgb(${v},${v},${v})`; x.fillRect(0, 0, 4, 4);
  const m = new THREE.MeshStandardMaterial({ color: MAT.ledWhite.color, emissive: MAT.ledWhite.emissive, emissiveMap: new THREE.CanvasTexture(c), emissiveIntensity: MAT.ledWhite.emissiveIntensity / (v / 255) });
  m.userData.nightStrips = true; return m;
}
export function buildDeck() {
  const D = LAYOUT.mainStage, g = new THREE.Group(), cx = D.chamferX, cz = D.chamferZ;
  const deckY = LAYOUT.circleStage.base.h;
  const strip = glowStrip(D.nightGlow.strip), fixture = glowStrip(D.nightGlow.fixture);   // 灯条 / 台前那排灯具
  // 台面：后两角切角的六边形，挤出成体
  const sh = new THREE.Shape([[D.x0, -D.z1], [D.x1, -D.z1], [D.x1, -(D.z0 + cz)], [D.x1 - cx, -D.z0], [D.x0 + cx, -D.z0], [D.x0, -(D.z0 + cz)]].map(([x, y]) => new THREE.Vector2(x, y)));
  const slab = new THREE.Mesh(new THREE.ExtrudeGeometry(sh, { depth: deckY, bevelEnabled: false }), [MAT.stageTop, MAT.stageSkirt]);
  slab.rotation.x = -Math.PI / 2; slab.castShadow = slab.receiveShadow = true; g.add(slab);
  const rim = [[D.x0, D.z0 + cz], [D.x0 + cx, D.z0], [D.x1 - cx, D.z0], [D.x1, D.z0 + cz]];
  for (let i = 0; i < 3; i++) {
    const [ax, az] = rim[i], [bx, bz] = rim[i + 1], len = Math.hypot(bx - ax, bz - az), r = box(len, 0.5, 1.2, MAT.deck, (ax + bx) / 2, deckY + 0.25, (az + bz) / 2); r.rotation.y = -Math.atan2(bz - az, bx - ax); g.add(r);
    for (let s = 0.9; s < len; s += 1.8) movingHead(ax + ((bx - ax) * s) / len, deckY + 0.5, az + ((bz - az) * s) / len, false);
  }
  // 中央双跑楼梯由同一个上平台落至主舞台。灯条装在踏步立面，照片里每一级都有横向间断。
  const pad = D.centerPad, back = D.z0 + 0.2, first = back + pad.landingDepth;
  const tread = (pad.d - pad.landingDepth) / pad.steps, rise = pad.h / pad.steps;
  g.add(box(pad.w, 0.16, pad.landingDepth, MAT.padWhite, 0, deckY + pad.h - 0.08, back + pad.landingDepth / 2));
  g.add(box(pad.w, pad.h - 0.16, pad.landingDepth, MAT.stageSkirt, 0, deckY + (pad.h - 0.16) / 2, back + pad.landingDepth / 2));
  const runWidth = (pad.w - pad.split) / 2;
  for (const sx of [-1, 1]) {
    const x = sx * (pad.split + runWidth) / 2;
    for (let i = 0; i < pad.steps; i++) {
      const height = (pad.steps - i) * rise, front = first + (i + 1) * tread;
      g.add(box(runWidth, height, tread, MAT.deck, x, deckY + height / 2, front - tread / 2));
      g.add(box(runWidth, 0.035, 0.075, MAT.dark, x, deckY + height - 0.018, front - 0.016));
      const segment = runWidth / 3;
      for (let j = -1; j <= 1; j++) {
        g.add(box(segment - 0.24, 0.038, 0.028, strip, x + j * segment, deckY + height - 0.089, front + 0.014));
      }
    }
  }
  //   约 8 级，每级立面是黑色格栅，上面一整条白色 LED 灯带（每 2 米左右断一下）；最上面一级的边上一排摇头灯；
  //   靠外的那一头是斜着错开的（越低的台阶越短，1002 左端能看出一级级退进去）；乐手站在台阶上。
  //   原来做成 0.65 米高的平台（按俯拍轮廓推的），和演出期照片不符，已改。台阶级数、级高按照片里乐手身高估，拿不准 ±1 级。
  const R = D.bandRisers, steps = pad.steps, rH = pad.h / steps, rD = (R.z1 - R.z0) / steps;
  for (const sx of [-1, 1]) {
    for (let i = 0; i < steps; i++) {   // i = 0 最前、最低
      const top = (i + 1) * rH, outer = R.outerX - (steps - 1 - i) * 0.7, w = outer - R.innerX, x = sx * (R.innerX + w / 2);
      const zf = R.z1 - i * rD;   // 这一级的前沿
      g.add(box(w, top, rD, MAT.deck, x, deckY + top / 2, zf - rD / 2));
      g.add(box(w, 0.03, rD, MAT.stageTop, x, deckY + top + 0.015, zf - rD / 2));
      const segs = Math.max(1, Math.round(w / 2.1)), sw = w / segs;   // 立面灯条，一段约 2 米
      for (let k = 0; k < segs; k++) g.add(box(sw - 0.18, 0.045, 0.03, strip, sx * (R.innerX + sw * (k + 0.5)), deckY + top - rH * 0.55, zf + 0.016));
    }
    for (let x = R.innerX + 0.9; x < R.outerX - 0.4; x += 1.8) movingHead(sx * x, deckY + pad.h, R.z0 + 0.6, false);   // 最上面一级边上的摇头灯
  }
  // 台口灯带
  g.add(box(D.x1 - D.x0, 0.1, 0.1, strip, 0, deckY - 0.35, D.z1 + 0.06));
  for (const sx of [-1, 1]) for (let i = 0; i < 6; i++) g.add(box(0.5, deckY * (1 - (i + 1) / 7), 4, MAT.deck, sx * (D.x1 + 0.25 + i * 0.5), deckY * (1 - (i + 1) / 7) / 2, D.z1 - 3));
  const F = D.frontTier, cw = D.catwalk.w, dep = F.z1 - D.z1;
  const barGeo = new THREE.BoxGeometry(0.25, 0.35, 1.0), bars = [];
  for (const sx of [-1, 1]) {
    const x0 = cw / 2 + 0.6, w = F.x - x0, cxm = sx * (x0 + w / 2);
    g.add(box(w, F.h, dep, MAT.deck, cxm, F.h / 2, D.z1 + dep / 2));
    for (let x = x0 + 0.8; x < F.x - 0.5; x += 1.6) { movingHead(sx * x, F.h, D.z1 + 1.4, false); movingHead(sx * x, F.h, F.z1 - 1.2, false); }
    for (let x = x0 + 0.6; x < F.x - 0.5; x += 0.8) bars.push([sx * x, F.h + 0.18, D.z1 + dep / 2]);
    g.add(box(w, 0.07, 0.07, strip, cxm, F.h - 0.2, F.z1 + 0.05));
  }
  { const m = new THREE.InstancedMesh(barGeo, fixture, bars.length), M4 = new THREE.Matrix4(); bars.forEach(([x, y, z], i) => { M4.makeTranslation(x, y, z); m.setMatrixAt(i, M4); }); g.add(m); }
  // 无人机 69–70 秒可辨认浅色直台面。以共同标高示意两个台面的衔接。
  const C = D.catwalk, radius = LAYOUT.circleStage.base.r;
  const edge = Array.from({ length: 15 }, (_, i) => {
    const x = C.w * (i / 14 - 0.5);
    return new THREE.Vector2(x, Math.sqrt(radius * radius - x * x) + 0.003);
  });
  const shape = new THREE.Shape([
    new THREE.Vector2(-C.w / 2, -D.z1), new THREE.Vector2(C.w / 2, -D.z1), ...edge.reverse(),
  ]);
  const catwalk = new THREE.Mesh(new THREE.ExtrudeGeometry(shape, { depth: deckY, bevelEnabled: false }), [MAT.stageTop, MAT.stageSkirt]);
  catwalk.name = '主舞台至圆台直台面';
  catwalk.rotation.x = -Math.PI / 2;
  catwalk.castShadow = catwalk.receiveShadow = true;
  g.add(catwalk);
  return labeled(g, '主舞台');
}
