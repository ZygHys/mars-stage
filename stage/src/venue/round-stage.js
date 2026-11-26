import * as THREE from 'three';
import { LAYOUT } from '../layout.js';
import { MAT, V, labeled, animate, registerControl } from './common.js';

const D2R = Math.PI / 180;

// 顶层台面的高度（含圆台上方的圆形台阶）
export const topTierY = () => { const C = LAYOUT.circleStage; return C.base.h + C.steps.reduce((s, [, h]) => s + h, 0); };

export const circleStageMaterials = {
  deck: new THREE.MeshStandardMaterial({ color: 0x232428, roughness: 0.85, metalness: 0.05, envMapIntensity: 0.35 }),
  deckInner: new THREE.MeshStandardMaterial({ color: 0x53545a, roughness: 0.78, metalness: 0.05, envMapIntensity: 0.32 }),
  apron: new THREE.MeshStandardMaterial({ color: 0x292b2e, roughness: 0.89 }),
  treadEdge: new THREE.MeshStandardMaterial({
    color: 0x92918f, roughness: 0.67,
  }),
  skirt: new THREE.MeshStandardMaterial({ color: 0x0b0b0d, roughness: 0.9, side: THREE.DoubleSide }),
  hole: new THREE.MeshStandardMaterial({ color: 0x050506, roughness: 1, side: THREE.DoubleSide }),
};

// ---------- 圆台、设备环、脚灯及喷泉 ----------
export function buildCircleStage() {
  const C = LAYOUT.circleStage, g = new THREE.Group(); g.position.set(C.x, 0, C.z);
  const wall = (r, h, y) => { const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, h, 128, 1, true), circleStageMaterials.skirt); m.position.y = y + h / 2; m.castShadow = m.receiveShadow = true; g.add(m); };
  const flat = (r0, r1, y, mat) => { const m = new THREE.Mesh(new THREE.RingGeometry(r0, r1, 128, 1), mat); m.rotation.x = -Math.PI / 2; m.position.y = y; m.receiveShadow = true; g.add(m); };
  const LIFT = LAYOUT.lift.platform.r;
  flat(C.base.r, C.equipmentRadius, 0.09, circleStageMaterials.apron);
  wall(C.base.r, C.base.h - 0.08, 0.08);
  flat(C.inner.r, C.base.r, C.base.h, circleStageMaterials.deck);
  flat(C.steps[0][0], C.inner.r, C.base.h, circleStageMaterials.deckInner);
  let y = C.base.h;
  C.steps.forEach(([r, h], i) => {
    wall(r, h, y); y += h;
    const rNext = i + 1 < C.steps.length ? C.steps[i + 1][0] : LIFT;
    flat(rNext, r - 0.035, y, circleStageMaterials.deckInner);
    flat(r - 0.035, r, y, circleStageMaterials.treadEdge);
  });
  // 中心井口：升降台顶起后露出来的黑洞
  const holeD = 0.4; const shaft = new THREE.Mesh(new THREE.CylinderGeometry(LIFT, LIFT, holeD, 64, 1, true), circleStageMaterials.hole); shaft.position.y = y - holeD / 2; g.add(shaft);
  flat(0, LIFT, y - holeD, circleStageMaterials.hole);
  const FL = C.footlights;
  const angles = Array.from({ length: FL.count }, (_, i) => (i + 0.5) * Math.PI / FL.count);
  const bodies = new THREE.InstancedMesh(new THREE.BoxGeometry(0.65, 0.18, 0.26), MAT.headBody, angles.length);
  const lenses = new THREE.InstancedMesh(new THREE.PlaneGeometry(0.24, 0.113), MAT.warm, angles.length * 2);
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), one = V(1, 1, 1);
  angles.forEach((a, i) => {
    const nx = Math.cos(a), nz = Math.sin(a);
    e.set(-35 * D2R, Math.PI / 2 - a, 0, 'YXZ'); q.setFromEuler(e);
    bodies.setMatrixAt(i, m4.compose(V(nx * FL.r, 0.23, nz * FL.r), q, one));
    for (const side of [-1, 1]) {
      const pos = V(nx * (FL.r + 0.11) - nz * side * 0.137, 0.305, nz * (FL.r + 0.11) + nx * side * 0.137);
      lenses.setMatrixAt(i * 2 + (side > 0 ? 1 : 0), m4.compose(pos, q, one));
    }
  });
  g.add(bodies, lenses);

  // 水柱只在效果开启时绘制；照片无法确认常态喷嘴外形。
  const FT = C.fountain;
  const jets = Array.from({ length: 24 }, (_, i) => Math.PI * (i + 0.8) / 24);
  const jm = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.03, 0.065, 1, 6, 1, true), MAT.water, jets.length);
  const p = V(0, 0, 0), sc = V(1, 1, 1);
  const setJets = (time) => jets.forEach((a, i) => {
    const h = FT.h * (0.7 + 0.3 * Math.sin(i * 1.7 + time * 2.1));
    jm.setMatrixAt(i, m4.compose(p.set(Math.cos(a) * FT.r, 0.08 + h / 2, Math.sin(a) * FT.r), q.identity(), sc.set(1, h, 1)));
  });
  setJets(0); jm.visible = false; g.add(jm);
  registerControl({ key: 'fountain', label: '圆台喷泉', options: { off: '关', on: '开' }, value: 'off', set: (v) => { jm.visible = v === 'on'; } });
  animate((dt, t) => { if (jm.visible) { setJets(t); jm.instanceMatrix.needsUpdate = true; } });
  return labeled(g, '圆台');
}
