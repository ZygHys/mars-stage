import * as THREE from 'three';
import { LAYOUT } from '../layout.js';
import { TrussKit } from '../truss.js';
import { MAT, V, box, labeled, animate, registerControl } from './common.js';

// ---------- 延伸台（升降台）----------
const armMat = new THREE.MeshStandardMaterial({ color: 0x33363a, roughness: 0.58, metalness: 0.65 });
const edgeMat = new THREE.MeshStandardMaterial({ color: 0x666b70, roughness: 0.55, metalness: 0.65 });
let currentBridgeHeight = LAYOUT.lifts.defaultState === 'high' ? LAYOUT.lifts.high : LAYOUT.circleStage.base.h;
let setBridgeTargetFn = null;

export function bridgeHeight() {
  return currentBridgeHeight;
}

export function setBridgeTargetHeight(val) {
  setBridgeTargetFn?.(val);
}

export function onExtensionBridge(x, z) {
  const L = LAYOUT.lifts;
  if (Math.abs(z - L.z) > L.w / 2) return false;
  const ax = Math.abs(x);
  // 内端延伸到 |x| >= 9.0，与圆台外沿（z=-2.5 时 x≈9.27）无缝衔接；外端至台头 30.5
  return ax >= 9.0 && ax <= Math.max(...L.spans.flat().map(Math.abs));
}

export function buildBridges() {
  const L = LAYOUT.lifts, S = L.scissor, out = [], rigs = [];
  const lowY = LAYOUT.circleStage.base.h;
  for (const [xa, xb] of L.spans) {
    const x0 = Math.min(xa, xb), x1 = Math.max(xa, xb), len = x1 - x0, cx = (x0 + x1) / 2;
    const g = new THREE.Group(); g.position.set(cx, 0, L.z); g.userData.dynamic = true;
    // 地上的底框：两根纵向底梁 + 每组剪叉处一根横梁
    const half = L.w / 2 - S.inset;
    for (const s of [-1, 1]) g.add(box(len - 0.4, 0.14, 0.22, MAT.dark, 0, 0.07, s * half));
    // 台面（会动的部分）
    const top = new THREE.Group(); g.add(top);
    const slab = box(len, L.deck, L.w, MAT.deckTop, 0, -L.deck / 2, 0); top.add(slab);
    const frame = new TrussKit(0x282b30), railing = new TrussKit(0x37393e);
    const railsX = len / 2 - 0.08, railsZ = L.w / 2 - 0.08, railH = 0.98;
    const nPosts = Math.round(len / 2.28);
    for (const s of [-1, 1]) {
      frame.beam(V(-len / 2, -L.deck - 0.13, s * (L.w / 2 - 0.13)), V(len / 2, -L.deck - 0.13, s * (L.w / 2 - 0.13)), 0.25);
      top.add(box(len, 0.034, 0.026, edgeMat, 0, -0.033, s * L.w / 2));
      railing.tube(V(-railsX, railH, s * railsZ), V(railsX, railH, s * railsZ), 0.035);
      for (let i = 0; i <= nPosts; i++) {
        const x = -railsX + 2 * railsX * i / nPosts;
        railing.tube(V(x, 0.01, s * railsZ), V(x, railH, s * railsZ), 0.026);
      }
    }
    railing.tube(V(Math.sign(cx) * railsX, railH, -railsZ), V(Math.sign(cx) * railsX, railH, railsZ), 0.035);
    // 两侧和外端护栏固定在台面上，靠圆台一端留通口。
    const rails = railing.build();
    rails.name = '延伸台护栏';
    top.add(frame.build(), rails);
    // 剪叉：每组两侧各一对交叉臂 + 三根横向连杆；臂长不变，升起时立起来、降下时放平
    const n = Math.max(2, Math.round(len / S.every)), units = [...Array(n)].map((_, i) => -len / 2 + (len * (i + 0.5)) / n);
    for (const u of units) g.add(box(0.2, 0.12, 2 * half, MAT.dark, u, 0.06, 0));
    const arms = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 0.16, 0.1), armMat, units.length * 4);
    const pins = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.06, 0.06, 2 * half + 0.1, 8), armMat, units.length * 5);
    arms.castShadow = pins.castShadow = true; g.add(arms, pins);
    rigs.push({ top, arms, pins, units, half });
    out.push(labeled(g, '延伸台（升降台）'));
  }
  // 摆放：h = 台面顶离地高度
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), p = V(0, 0, 0), sc = V(1, 1, 1);
  const pose = (h) => {
    const yb = 0.2, yt = h - L.deck - 0.25, rise = yt - yb, span = Math.sqrt(S.arm * S.arm - rise * rise), ang = Math.atan2(rise, span);
    for (const r of rigs) {
      r.top.position.y = h;
      let k = 0, j = 0;
      r.units.forEach((u) => {
        for (const s of [-1, 1]) for (const d of [-1, 1]) {
          e.set(0, 0, d * ang); q.setFromEuler(e);
          m.compose(p.set(u, (yb + yt) / 2, s * r.half), q, sc.set(S.arm, 1, 1)); r.arms.setMatrixAt(k++, m);
        }
        e.set(Math.PI / 2, 0, 0); q.setFromEuler(e);
        for (const [x, y] of [[u, (yb + yt) / 2], [u - span / 2, yt], [u + span / 2, yt], [u - span / 2, yb], [u + span / 2, yb]]) {
          m.compose(p.set(x, y, 0), q, sc.set(1, 1, 1));
          r.pins.setMatrixAt(j++, m);
        }
      });
      r.arms.instanceMatrix.needsUpdate = r.pins.instanceMatrix.needsUpdate = true;
      r.arms.computeBoundingSphere(); r.pins.computeBoundingSphere();
    }
  };
  const lv = { low: lowY, high: L.high };
  let h = lv[L.defaultState], target = h;
  currentBridgeHeight = h;
  setBridgeTargetFn = (val) => {
    target = typeof val === 'number' ? THREE.MathUtils.clamp(val, lowY, L.high) : (lv[val] ?? lowY);
  };
  pose(h);
  animate((dt) => {
    if (h === target) return;
    const step = L.speed * dt; h = Math.abs(target - h) <= step ? target : h + Math.sign(target - h) * step;
    currentBridgeHeight = h;
    pose(h);
  });
  registerControl({ key: 'bridge', label: '延伸台', options: { low: '降下', high: '升起' }, value: L.defaultState, set: (v) => { target = lv[v]; } });
  return out;
}
