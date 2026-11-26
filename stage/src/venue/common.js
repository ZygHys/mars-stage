// 公共部分：材质、小工具、摇头灯实例、线阵音箱、铁马护栏。四个区域模块共用，改动前先和总控确认。
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

export const V = (x, y, z) => new THREE.Vector3(x, y, z);

export const MAT = {
  dark: new THREE.MeshStandardMaterial({ color: 0x1e1f23, roughness: 0.55, metalness: 0.5 }),
  steel: new THREE.MeshStandardMaterial({ color: 0x9a9da3, roughness: 0.35, metalness: 0.85 }),
  deck: new THREE.MeshStandardMaterial({ color: 0x141417, roughness: 0.8 }),
  deckTop: new THREE.MeshStandardMaterial({ color: 0x121215, roughness: 0.7, metalness: 0.05, envMapIntensity: 0.25 }),
  stageTop: new THREE.MeshStandardMaterial({ color: 0x8799ad, roughness: 0.55, metalness: 0.1, envMapIntensity: 0.4 }),
  padWhite: new THREE.MeshStandardMaterial({ color: 0xdfe3e6, roughness: 0.6 }),
  beige: new THREE.MeshStandardMaterial({ color: 0xd8cdb6, roughness: 0.9 }),                                             // 屏塔台面（米白）
  stageSkirt: new THREE.MeshStandardMaterial({ color: 0x0b0b0d, roughness: 0.95 }),
  speaker: new THREE.MeshStandardMaterial({ color: 0x0d0d0f, roughness: 0.75 }),
  grille: new THREE.MeshStandardMaterial({ color: 0x1b1b1e, roughness: 0.9, metalness: 0.3 }),
  mirror: new THREE.MeshStandardMaterial({ color: 0x8fa3b5, roughness: 0.12, metalness: 0.9, flatShading: true, envMapIntensity: 1.6 }),
  glassCage: new THREE.MeshPhysicalMaterial({ color: 0xdcefff, roughness: 0.03, metalness: 0, transmission: 0.85, thickness: 0.05, transparent: true, opacity: 0.4, side: THREE.DoubleSide }),
  water: new THREE.MeshStandardMaterial({ color: 0xcfe6ff, emissive: 0x6688aa, emissiveIntensity: 0.25, transparent: true, opacity: 0.45, roughness: 0.2, depthWrite: false }),
  lens: new THREE.MeshStandardMaterial({ color: 0x111111, emissive: 0xfff3dc, emissiveIntensity: 1.2, roughness: 0.2 }),
  warm: new THREE.MeshStandardMaterial({ color: 0x4c4a42, emissive: 0xffd9a0, emissiveIntensity: 0 }),                    // 圆台脚灯
  matrixLens: new THREE.MeshStandardMaterial({ color: 0x2a2a2e, emissive: 0xffffff, emissiveIntensity: 0.05, roughness: 0.3 }),  // 屏塔灯阵
  hgLed: new THREE.MeshStandardMaterial({ color: 0x747b81, emissive: 0x39e6e0, emissiveIntensity: 0, roughness: 0.65 }),  // 沙漏塔分段灯带
  controlTowerLed: new THREE.MeshStandardMaterial({ color: 0x191719, emissive: 0xff2f55, emissiveIntensity: 0 }),
  headBody: new THREE.MeshStandardMaterial({ color: 0x17171a, roughness: 0.5, metalness: 0.4 }),
  whiteLine: new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xffffff, emissiveIntensity: 0.5 }),
  ledStrip: new THREE.MeshStandardMaterial({ color: 0x111111, emissive: 0xff2f55, emissiveIntensity: 1.6 }),
  ledWhite: new THREE.MeshStandardMaterial({ color: 0x111111, emissive: 0xf4f0ff, emissiveIntensity: 1.4 }),
};

export const labeled = (g, label) => { g.userData.label = label; return g; };
export function box(w, h, d, mat, x, y, z) { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat); m.position.set(x, y, z); m.castShadow = m.receiveShadow = true; return m; }

// ---------- 摇头灯（实例化）----------
export const heads = [];
// 夜里要加光晕的灯点 [x, y, z, 直径]（单颗灯具太小，远看看不到；实拍里是一颗颗晕开的圆光）
export const glowSpots = [];
export function movingHead(x, y, z, hang = true) { heads.push([x, y, z, hang]); }
function buildHeads() {
  const g = new THREE.Group(); if (!heads.length) return g;
  const base = new THREE.InstancedMesh(new THREE.BoxGeometry(0.45, 0.18, 0.35), MAT.headBody, heads.length);
  const head = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.2, 0.17, 0.42, 12), MAT.headBody, heads.length);
  const lens = new THREE.InstancedMesh(new THREE.CircleGeometry(0.15, 12), MAT.lens, heads.length);
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), s = V(1, 1, 1), p = V(0, 0, 0);
  heads.forEach(([x, y, z, hang], i) => {
    const dy = hang ? -1 : 1;
    m.compose(p.set(x, y + dy * 0.1, z), q.identity(), s); base.setMatrixAt(i, m);
    e.set(hang ? 0.5 : -0.5, 0, 0); q.setFromEuler(e);
    m.compose(p.set(x, y + dy * 0.45, z), q, s); head.setMatrixAt(i, m);
    e.set(hang ? 0.5 - Math.PI / 2 : Math.PI / 2 - 0.5, 0, 0); q.setFromEuler(e);
    m.compose(p.set(x, y + dy * 0.45 + dy * 0.2 * Math.cos(0.5), z + 0.2 * Math.sin(0.5)), q, s); lens.setMatrixAt(i, m);
  });
  base.castShadow = head.castShadow = true;
  g.add(base, head, lens); return g;
}

// 线阵音箱：一串向下弯的箱体
export function lineArray(g, x, y, z, n = 12, rotY = 0, name = '主扩声线阵') {
  const grp = new THREE.Group(); grp.name = name; grp.position.set(x, y, z); grp.rotation.y = rotY;
  let yy = 0, tilt = 0, zz = 0;
  for (let i = 0; i < n; i++) {
    const cab = box(1.3, 0.42, 0.75, MAT.speaker, 0, yy, zz); cab.rotation.x = tilt; grp.add(cab);
    const gr = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 0.3), MAT.grille); gr.position.set(0, yy, zz + 0.38); gr.rotation.x = tilt; grp.add(gr);
    yy -= 0.43 * Math.cos(tilt); zz -= 0.43 * Math.sin(tilt) * 0.6; tilt += 0.025;
  }
  grp.add(box(1.5, 0.15, 0.9, MAT.dark, 0, 0.3, 0));
  g.add(grp);
}

export function buildLights() { return buildHeads(); }

// ---------- 铁马护栏（实例化）----------
// segments: [[x0, z0, x1, z1], …]，每约 2 米一片；skip(x, z) 返回 true 的那一片不放（留门口）。
// 每片是真的立体铁马：上下横管、两根端立柱、12 根竖管、两只扁脚。管子只有几厘米粗，远看会糊成虚线，
// 所以再叠一片随距离渐显的半透明“远景填充”（20 米内完全看不见，70 米外约 45%），让俯视远景里护栏像照片一样是一道连续白线。
let barrierGeo = null, barrierMat = null, barrierFill = null;
function barrierAssets() {
  if (barrierGeo) return;
  const parts = [], add = (w, h, d, x, y, z) => { const b = new THREE.BoxGeometry(w, h, d); b.translate(x, y, z); parts.push(b); };
  add(2.0, 0.045, 0.045, 0, 1.08, 0);                       // 上横管
  add(2.0, 0.04, 0.04, 0, 0.2, 0);                           // 下横管
  for (const e of [-1, 1]) {
    add(0.045, 1.0, 0.045, e * 0.98, 0.6, 0);                // 端立柱
    add(0.04, 0.1, 0.04, e * 0.9, 0.08, 0);                  // 立柱下的短腿
    add(0.07, 0.035, 0.72, e * 0.9, 0.018, 0);               // 扁脚
  }
  for (let i = 0; i < 12; i++) add(0.018, 0.86, 0.018, -0.88 + (i * 1.76) / 11, 0.64, 0);   // 竖管
  barrierGeo = mergeGeometries(parts.map((g) => g.toNonIndexed()), false);
  barrierMat = new THREE.MeshStandardMaterial({ color: 0xd2d6dc, roughness: 0.45, metalness: 0.55 });
  barrierFill = new THREE.MeshStandardMaterial({ color: 0xdfe2e6, roughness: 0.7, transparent: true, depthWrite: false, side: THREE.DoubleSide });
  barrierFill.onBeforeCompile = (sh) => {
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying float vBarDist;').replace('#include <project_vertex>', '#include <project_vertex>\nvBarDist = -mvPosition.z;');
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nvarying float vBarDist;').replace('#include <color_fragment>', '#include <color_fragment>\ndiffuseColor.a *= 0.45 * smoothstep(20.0, 70.0, vBarDist);');
  };
}
export function barrierRun(segments, skip = null) {
  const g = new THREE.Group();
  barrierAssets();
  const segs = [];
  for (const [x0, z0, x1, z1] of segments) {
    const len = Math.hypot(x1 - x0, z1 - z0), n = Math.max(1, Math.round(len / 2));
    for (let i = 0; i < n; i++) { const x = x0 + ((x1 - x0) * (i + 0.5)) / n, z = z0 + ((z1 - z0) * (i + 0.5)) / n; if (!skip || !skip(x, z)) segs.push([x, z, Math.atan2(z1 - z0, x1 - x0), len / n]); }
  }
  if (!segs.length) return g;
  const mesh = new THREE.InstancedMesh(barrierGeo, barrierMat, segs.length);
  const fill = new THREE.InstancedMesh(new THREE.PlaneGeometry(2, 0.95), barrierFill, segs.length);
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), s = V(1, 1, 1), p = V(0, 0, 0), up = V(0, 1, 0);
  segs.forEach(([x, z, ang, len], i) => {
    q.setFromAxisAngle(up, -ang);
    m.compose(p.set(x, 0, z), q, s.set((len - 0.04) / 2, 1, 1)); mesh.setMatrixAt(i, m);
    m.compose(p.set(x, 0.64, z), q, s.set((len - 0.04) / 2, 1, 1)); fill.setMatrixAt(i, m);
  });
  mesh.castShadow = true; mesh.receiveShadow = true; fill.renderOrder = 1;
  g.add(mesh, fill);
  return g;
}

// ---------- 会动的部件、可切换的状态 ----------
// 会动的物体（升降台、升降梯、圆环……）：把最外层 Group 的 userData.dynamic 设为 true，main.js 就不会把它并进静态网格。
// 每帧要更新的逻辑：animate((dt, t) => { … })，main.js 每帧统一调用。
export const animators = [];
export function animate(fn) { animators.push(fn); }
// 可切换的状态：registerControl({ key, label, options: { 值: '说明' }, value, set(v) {…} })。
// main.js 会自动生成下拉框，支持网址参数 ?key=值 和调试钩子 G.setControl(key, 值)。
export const controls = [];
export function registerControl(c) { controls.push(c); return c; }

// 能放视频的屏：video-screens.js 用它把视频贴到屏面上（或在屏面位置内嵌网页播放器）。
// group：分组（imag 主舞台两侧竖屏 / side 内场前角斜屏 / delay 草坪前角斜屏 / lawn 草坪前沿双面屏 / cylinder 控制塔屏 / tower 屏塔大屏）；
// w、h：屏面宽高（米）。登记的屏面不并进静态网格，这样才能单独换材质。
export const videoScreens = [];
export function registerVideoScreen(mesh, { group, name, w, h }) { mesh.userData.dynamic = true; videoScreens.push({ mesh, group, name, w, h }); return mesh; }
