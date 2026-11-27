import * as THREE from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import { LAYOUT } from "../layout.js";
import { barrierRun, V } from "./common.js";
import { buildAccessGates } from "./access-gates.js";
let sbAssets = null;
function stageBarrierAssets() {
  if (sbAssets) return sbAssets;
  const dark = [], lite = [], add = (arr, w, h, d, x, y, z, rx = 0) => {
    const g = new THREE.BoxGeometry(w, h, d);
    if (rx) g.rotateX(rx);
    g.translate(x, y, z);
    arr.push(g.toNonIndexed());
  };
  add(dark, 1.98, 0.19, 0.055, 0, 0.15, 0);
  add(dark, 1.98, 0.075, 0.075, 0, 1.06, 0.015);
  for (const y of [0.44, 0.76]) add(dark, 1.94, 0.03, 0.027, 0, y, 0);
  for (let i = 0; i <= 10; i++) {
    const width = i === 0 || i === 10 ? 0.064 : 0.036;
    add(dark, width, 0.99, 0.045, -0.95 + i * 0.19, 0.56, 0);
  }
  for (const e of [-0.84, 0.84]) {
    add(dark, 0.055, 1.18, 0.055, e, 0.55, 0.34, -0.58);
    add(dark, 0.055, 0.05, 0.7, e, 0.05, 0.35);
  }
  add(lite, 1.94, 0.032, 0.67, 0, 0.018, 0.36);
  const perforations = document.createElement("canvas");
  perforations.width = perforations.height = 32;
  const ctx = perforations.getContext("2d");
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, 32, 32);
  ctx.fillStyle = "#000";
  ctx.beginPath();
  ctx.arc(16, 16, 11, 0, 2 * Math.PI);
  ctx.fill();
  const holes = new THREE.CanvasTexture(perforations);
  holes.wrapS = holes.wrapT = THREE.RepeatWrapping;
  holes.repeat.set(69, 30);
  sbAssets = {
    dark: mergeGeometries(dark, false),
    lite: mergeGeometries(lite, false),
    darkMat: new THREE.MeshStandardMaterial({ color: 1513499, roughness: 0.7, metalness: 0.3 }),
    liteMat: new THREE.MeshStandardMaterial({ color: 4869458, roughness: 0.6, metalness: 0.5 }),
    panel: new THREE.PlaneGeometry(1.87, 0.85).translate(0, 0.58, 5e-3),
    panelMat: new THREE.MeshStandardMaterial({
      color: 2697516,
      roughness: 0.78,
      side: THREE.DoubleSide,
      alphaMap: holes,
      alphaTest: 0.15,
      transparent: true,
      opacity: 0.63,
      depthWrite: false,
      forceSinglePass: true
    }),
    sign: new THREE.PlaneGeometry(0.61, 0.32),
    signMat: (() => {
      const c = document.createElement("canvas");
      c.width = 64;
      c.height = 84;
      const x = c.getContext("2d");
      x.fillStyle = "#c8202a";
      x.fillRect(0, 0, 64, 84);
      x.fillStyle = "#f4f4f2";
      x.fillRect(5, 5, 54, 74);
      x.fillStyle = "#c8202a";
      for (let i = 0; i < 5; i++) x.fillRect(12, 16 + i * 11, 40 - i % 2 * 12, 4);
      const t = new THREE.CanvasTexture(c);
      t.colorSpace = THREE.SRGBColorSpace;
      return new THREE.MeshStandardMaterial({ map: t, roughness: 0.6 });
    })()
  };
  return sbAssets;
}
function stageBarrierRun(name, segments, { perforated = false, signs = false } = {}) {
  const A = stageBarrierAssets(), list = [];
  for (const [x0, z0, x1, z1, side = 1] of segments) {
    const len = Math.hypot(x1 - x0, z1 - z0), n = Math.max(1, Math.round(len / 2));
    for (let i = 0; i < n; i++) list.push([x0 + (x1 - x0) * (i + 0.5) / n, z0 + (z1 - z0) * (i + 0.5) / n, Math.atan2(z1 - z0, x1 - x0), len / n / 2, side]);
  }
  const g = new THREE.Group(), md = new THREE.InstancedMesh(A.dark, A.darkMat, list.length), ml = new THREE.InstancedMesh(A.lite, A.liteMat, list.length);
  g.name = name;
  const panels = perforated ? new THREE.InstancedMesh(A.panel, A.panelMat, list.length) : null;
  const signPositions = signs ? list.filter((_, i) => i % 4 === 2) : [];
  const ms = signPositions.length ? new THREE.InstancedMesh(A.sign, A.signMat, signPositions.length) : null;
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), p = V(0, 0, 0), sc = V(1, 1, 1);
  list.forEach(([x, z, ang, sx, side], i) => {
    e.set(0, -ang + (side > 0 ? Math.PI : 0), 0);
    q.setFromEuler(e);
    m.compose(p.set(x, 0.08, z), q, sc.set(sx, 1, 1));
    md.setMatrixAt(i, m);
    ml.setMatrixAt(i, m);
    panels?.setMatrixAt(i, m);
  });
  const loc = new THREE.Matrix4(), base = new THREE.Matrix4();
  signPositions.forEach(([x, z, ang, , side], k) => {
    e.set(0, -ang + (side > 0 ? Math.PI : 0), 0);
    q.setFromEuler(e);
    base.compose(p.set(x, 0.08, z), q, sc.set(1, 1, 1));
    loc.makeRotationY(Math.PI).setPosition(0, 0.77, -0.039);
    ms.setMatrixAt(k, m.multiplyMatrices(base, loc));
  });
  md.castShadow = true;
  md.receiveShadow = ml.receiveShadow = true;
  g.add(md, ml);
  if (panels) g.add(panels);
  if (ms) g.add(ms);
  return g;
}
const access = Object.values(LAYOUT.access);
const blackRuns = [
  ["舞台与观众区围栏", [...LAYOUT.stageBarriers, ...LAYOUT.circleBarrierRuns], { signs: true }],
  ["980—1280 双排围栏", LAYOUT.innerBoundaryRuns, { perforated: true }],
  ["680—980 内外场分界围栏", LAYOUT.outerBoundaryRuns, { perforated: true }],
  ["内场两侧外围栏", LAYOUT.sideBoundaryRuns, { perforated: true }],
  ["A/B 分区围栏", LAYOUT.abBoundaryRuns],
  ["分区口黑色穿孔围栏", access.flatMap(({ black }) => black || []), { perforated: true }]
];
const whiteRuns = [...LAYOUT.stageAisleRuns, ...access.flatMap(({ white }) => white || []), LAYOUT.bAisleStop];
const walkBarrierRuns = [...blackRuns.flatMap(([, segments]) => segments), ...whiteRuns, ...LAYOUT.liftCrossingEdges];
function buildBarriers() {
  return [
    ...blackRuns.map(([name, segments, options]) => stageBarrierRun(name, segments, options)),
    barrierRun(whiteRuns),
    ...buildAccessGates()
  ];
}
export {
  buildBarriers,
  walkBarrierRuns
};
