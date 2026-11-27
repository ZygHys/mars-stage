import * as THREE from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
const V = (x, y, z) => new THREE.Vector3(x, y, z);
const MAT = {
  dark: new THREE.MeshStandardMaterial({ color: 1974051, roughness: 0.55, metalness: 0.5 }),
  steel: new THREE.MeshStandardMaterial({ color: 10132899, roughness: 0.35, metalness: 0.85 }),
  deck: new THREE.MeshStandardMaterial({ color: 1315863, roughness: 0.8 }),
  deckTop: new THREE.MeshStandardMaterial({ color: 1184277, roughness: 0.7, metalness: 0.05, envMapIntensity: 0.25 }),
  stageTop: new THREE.MeshStandardMaterial({ color: 8886701, roughness: 0.55, metalness: 0.1, envMapIntensity: 0.4 }),
  padWhite: new THREE.MeshStandardMaterial({ color: 14672870, roughness: 0.6 }),
  beige: new THREE.MeshStandardMaterial({ color: 14208438, roughness: 0.9 }),
  stageSkirt: new THREE.MeshStandardMaterial({ color: 723725, roughness: 0.95 }),
  speaker: new THREE.MeshStandardMaterial({ color: 855311, roughness: 0.75 }),
  grille: new THREE.MeshStandardMaterial({ color: 1776414, roughness: 0.9, metalness: 0.3 }),
  mirror: new THREE.MeshStandardMaterial({ color: 9413557, roughness: 0.12, metalness: 0.9, flatShading: true, envMapIntensity: 1.6 }),
  glassCage: new THREE.MeshPhysicalMaterial({ color: 14479359, roughness: 0.03, metalness: 0, transmission: 0.85, thickness: 0.05, transparent: true, opacity: 0.4, side: THREE.DoubleSide }),
  water: new THREE.MeshStandardMaterial({ color: 13625087, emissive: 6719658, emissiveIntensity: 0.25, transparent: true, opacity: 0.45, roughness: 0.2, depthWrite: false }),
  lens: new THREE.MeshStandardMaterial({ color: 1118481, emissive: 16774108, emissiveIntensity: 1.2, roughness: 0.2 }),
  warm: new THREE.MeshStandardMaterial({ color: 4999746, emissive: 16767392, emissiveIntensity: 0 }),
  matrixLens: new THREE.MeshStandardMaterial({ color: 2763310, emissive: 16777215, emissiveIntensity: 0.05, roughness: 0.3 }),
  hgLed: new THREE.MeshStandardMaterial({ color: 7633793, emissive: 3794656, emissiveIntensity: 0, roughness: 0.65 }),
  controlTowerLed: new THREE.MeshStandardMaterial({ color: 1644313, emissive: 16723797, emissiveIntensity: 0 }),
  headBody: new THREE.MeshStandardMaterial({ color: 1513242, roughness: 0.5, metalness: 0.4 }),
  whiteLine: new THREE.MeshStandardMaterial({ color: 16777215, emissive: 16777215, emissiveIntensity: 0.5 }),
  ledStrip: new THREE.MeshStandardMaterial({ color: 1118481, emissive: 16723797, emissiveIntensity: 1.6 }),
  ledWhite: new THREE.MeshStandardMaterial({ color: 1118481, emissive: 16052479, emissiveIntensity: 1.4 })
};
const labeled = (g, label) => {
  g.userData.label = label;
  return g;
};
function box(w, h, d, mat, x, y, z) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  m.position.set(x, y, z);
  m.castShadow = m.receiveShadow = true;
  return m;
}
const heads = [];
const glowSpots = [];
const hgTopSpots = [];
const screenTopSpots = [];
function movingHead(x, y, z, hang = true) {
  heads.push([x, y, z, hang]);
}
function buildHeads() {
  const g = new THREE.Group();
  if (!heads.length) return g;
  const base = new THREE.InstancedMesh(new THREE.BoxGeometry(0.45, 0.18, 0.35), MAT.headBody, heads.length);
  const head = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.2, 0.17, 0.42, 12), MAT.headBody, heads.length);
  const lens = new THREE.InstancedMesh(new THREE.CircleGeometry(0.15, 12), MAT.lens, heads.length);
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), s = V(1, 1, 1), p = V(0, 0, 0);
  heads.forEach(([x, y, z, hang], i) => {
    const dy = hang ? -1 : 1;
    m.compose(p.set(x, y + dy * 0.1, z), q.identity(), s);
    base.setMatrixAt(i, m);
    e.set(hang ? 0.5 : -0.5, 0, 0);
    q.setFromEuler(e);
    m.compose(p.set(x, y + dy * 0.45, z), q, s);
    head.setMatrixAt(i, m);
    e.set(hang ? 0.5 - Math.PI / 2 : Math.PI / 2 - 0.5, 0, 0);
    q.setFromEuler(e);
    m.compose(p.set(x, y + dy * 0.45 + dy * 0.2 * Math.cos(0.5), z + 0.2 * Math.sin(0.5)), q, s);
    lens.setMatrixAt(i, m);
  });
  base.castShadow = head.castShadow = true;
  g.add(base, head, lens);
  return g;
}
function lineArray(g, x, y, z, n = 12, rotY = 0, name = "主扩声线阵") {
  const grp = new THREE.Group();
  grp.name = name;
  grp.position.set(x, y, z);
  grp.rotation.y = rotY;
  let yy = 0, tilt = 0, zz = 0;
  for (let i = 0; i < n; i++) {
    const cab = box(1.3, 0.42, 0.75, MAT.speaker, 0, yy, zz);
    cab.rotation.x = tilt;
    grp.add(cab);
    const gr = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 0.3), MAT.grille);
    gr.position.set(0, yy, zz + 0.38);
    gr.rotation.x = tilt;
    grp.add(gr);
    yy -= 0.43 * Math.cos(tilt);
    zz -= 0.43 * Math.sin(tilt) * 0.6;
    tilt += 0.025;
  }
  grp.add(box(1.5, 0.15, 0.9, MAT.dark, 0, 0.3, 0));
  g.add(grp);
}
function buildLights() {
  return buildHeads();
}
let barrierGeo = null, barrierMat = null, barrierFill = null;
function barrierAssets() {
  if (barrierGeo) return;
  const parts = [], add = (w, h, d, x, y, z) => {
    const b = new THREE.BoxGeometry(w, h, d);
    b.translate(x, y, z);
    parts.push(b);
  };
  add(2, 0.045, 0.045, 0, 1.08, 0);
  add(2, 0.04, 0.04, 0, 0.2, 0);
  for (const e of [-1, 1]) {
    add(0.045, 1, 0.045, e * 0.98, 0.6, 0);
    add(0.04, 0.1, 0.04, e * 0.9, 0.08, 0);
    add(0.07, 0.035, 0.72, e * 0.9, 0.018, 0);
  }
  for (let i = 0; i < 12; i++) add(0.018, 0.86, 0.018, -0.88 + i * 1.76 / 11, 0.64, 0);
  barrierGeo = mergeGeometries(parts.map((g) => g.toNonIndexed()), false);
  barrierMat = new THREE.MeshStandardMaterial({ color: 13817564, roughness: 0.45, metalness: 0.55 });
  barrierFill = new THREE.MeshStandardMaterial({ color: 14672614, roughness: 0.7, transparent: true, depthWrite: false, side: THREE.DoubleSide });
  barrierFill.onBeforeCompile = (sh) => {
    sh.vertexShader = sh.vertexShader.replace("#include <common>", "#include <common>\nvarying float vBarDist;").replace("#include <project_vertex>", "#include <project_vertex>\nvBarDist = -mvPosition.z;");
    sh.fragmentShader = sh.fragmentShader.replace("#include <common>", "#include <common>\nvarying float vBarDist;").replace("#include <color_fragment>", "#include <color_fragment>\ndiffuseColor.a *= 0.45 * smoothstep(20.0, 70.0, vBarDist);");
  };
}
function barrierRun(segments, skip = null) {
  const g = new THREE.Group();
  barrierAssets();
  const segs = [];
  for (const [x0, z0, x1, z1] of segments) {
    const len = Math.hypot(x1 - x0, z1 - z0), n = Math.max(1, Math.round(len / 2));
    for (let i = 0; i < n; i++) {
      const x = x0 + (x1 - x0) * (i + 0.5) / n, z = z0 + (z1 - z0) * (i + 0.5) / n;
      if (!skip || !skip(x, z)) segs.push([x, z, Math.atan2(z1 - z0, x1 - x0), len / n]);
    }
  }
  if (!segs.length) return g;
  const mesh = new THREE.InstancedMesh(barrierGeo, barrierMat, segs.length);
  const fill = new THREE.InstancedMesh(new THREE.PlaneGeometry(2, 0.95), barrierFill, segs.length);
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), s = V(1, 1, 1), p = V(0, 0, 0), up = V(0, 1, 0);
  segs.forEach(([x, z, ang, len], i) => {
    q.setFromAxisAngle(up, -ang);
    m.compose(p.set(x, 0, z), q, s.set((len - 0.04) / 2, 1, 1));
    mesh.setMatrixAt(i, m);
    m.compose(p.set(x, 0.64, z), q, s.set((len - 0.04) / 2, 1, 1));
    fill.setMatrixAt(i, m);
  });
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  fill.renderOrder = 1;
  g.add(mesh, fill);
  return g;
}
const animators = [];
function animate(fn) {
  animators.push(fn);
}
const controls = [];
function registerControl(c) {
  controls.push(c);
  return c;
}
const videoScreens = [];
function registerVideoScreen(mesh, { group, name, w, h }) {
  mesh.userData.dynamic = true;
  videoScreens.push({ mesh, group, name, w, h });
  return mesh;
}
export {
  MAT,
  V,
  animate,
  animators,
  barrierRun,
  box,
  buildLights,
  controls,
  glowSpots,
  heads,
  hgTopSpots,
  labeled,
  lineArray,
  movingHead,
  registerControl,
  registerVideoScreen,
  screenTopSpots,
  videoScreens
};
