// 区域 B：吊盘（四柱、屋面、多边形吊架、LED 屏箱、灯光桁架）、三个圆环、歌手升降（吊笼 + 圆台中心升降台）。
// 位置尺寸和照片依据全部在 layout/canopy.js，这里只管怎么搭。
import * as THREE from 'three';
import { LAYOUT } from '../layout.js';
import * as TX from '../textures.js';
import { TrussKit } from '../truss.js';
import { MAT, V, labeled, movingHead, animate, registerControl } from './common.js';
import { circleStageMaterials, topTierY } from './round-stage.js';
export { buildCircleStage } from './round-stage.js';

const D2R = Math.PI / 180, TAU = Math.PI * 2;
const circlePts = (r, n, y = 0, a0 = 0) => Array.from({ length: n }, (_, k) => { const a = a0 + (k / n) * TAU; return V(Math.cos(a) * r, y, Math.sin(a) * r); });
const canvasTex = (w, h, draw) => { const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t; };
// 区域 B 自己的材质
const BM = {
  black: new THREE.MeshStandardMaterial({ color: 0x0e0e11, roughness: 0.7, metalness: 0.2 }),
  ringTop: new THREE.MeshStandardMaterial({ color: 0x121215, roughness: 0.6, metalness: 0.3, side: THREE.DoubleSide }),
  ringEdge: new THREE.MeshStandardMaterial({ color: 0x41444b, roughness: 0.4, metalness: 0.5 }),
  // 放射灯条、环外侧灯带：带发光贴图，夜景模块会把它们点亮
  bar: new THREE.MeshStandardMaterial({ color: 0x92949b, roughness: 0.4, emissive: 0xffffff, emissiveIntensity: 0.05, emissiveMap: canvasTex(64, 4, (g, w, h) => { const gr = g.createLinearGradient(0, 0, w, 0); gr.addColorStop(0, '#c7c4c4'); gr.addColorStop(1, '#ffffff'); g.fillStyle = gr; g.fillRect(0, 0, w, h); }) }),
  rim: new THREE.MeshStandardMaterial({ color: 0x18181c, roughness: 0.5, emissive: 0xffffff, emissiveIntensity: 0.06, emissiveMap: canvasTex(256, 16, (g, w, h) => { g.fillStyle = '#000'; g.fillRect(0, 0, w, h); g.fillStyle = '#5a5a66'; for (let x = 1; x < w; x += 4) for (let y = 1; y < h; y += 4) g.fillRect(x, y, 2, 2); }), side: THREE.DoubleSide }),
  cageFloor: new THREE.MeshStandardMaterial({ color: 0xcfcdc8, roughness: 0.4 }),
};
// 屏箱和柱面的 LED：白天显示低亮度面板，夜景用同一轮廓的发光遮罩。
const stripeMat = (() => {
  const S = LAYOUT.frame.stripe;
  const stripe = (edge, core) => canvasTex(128, 8, (g, w, h) => {
    g.fillStyle = '#0b0b0d'; g.fillRect(0, 0, w, h);
    const a = (0.5 - S.width / 2) * w, b = (0.5 + S.width / 2) * w, gr = g.createLinearGradient(a, 0, b, 0);
    gr.addColorStop(0, edge); gr.addColorStop(0.5, core); gr.addColorStop(1, edge);
    g.fillStyle = gr; g.fillRect(a, 0, b - a, h);
  });
  const m = new THREE.MeshStandardMaterial({
    map: stripe(S.edge, S.core), emissiveMap: stripe('#bbbbbb', '#ffffff'),
    emissive: 0xffffff, emissiveIntensity: 0, roughness: 0.5, metalness: 0.1,
  });
  m.userData.nightStrips = true;
  return m;
})();

// 发光贴图直接用于灯箱正面，避免发光平面与背板在远处争抢深度。
function stripeBox(width, height, depth, uvWidth) {
  const geometry = new THREE.BoxGeometry(width, height, depth);
  const front = geometry.groups[4];
  geometry.clearGroups();
  geometry.addGroup(0, front.start, 0);
  geometry.addGroup(front.start, front.count, 1);
  const end = front.start + front.count;
  geometry.addGroup(end, geometry.index.count - end, 0);
  const uv = geometry.attributes.uv;
  for (let i = 0; i < uv.count; i++) uv.setX(i, 0.5 + (uv.getX(i) - 0.5) * uvWidth);
  return geometry;
}

// ---------- 吊盘 ----------
export function buildFrame() {
  const F = LAYOUT.frame, g = new THREE.Group(); g.position.set(F.x, 0, F.z);
  const hw = F.width / 2, hd = F.depth / 2, H = F.legHeight, rw = F.roofHw, rd = F.roofDepth / 2;
  const kit = new TrussKit(0x1d1e22);
  const legs = [[-1, -1], [1, -1], [-1, 1], [1, 1]];
  for (const [sx, sz] of legs) kit.column(sx * hw, sz * hd, H, F.legSize);
  for (const sz of [-1, 1]) kit.beam(V(-rw, H, sz * hd), V(rw, H, sz * hd), 1.2);
  for (const sx of [-1, 1]) kit.beam(V(sx * hw, H, -rd), V(sx * hw, H, rd), 1.2);
  for (const sz of [-1, 1]) kit.beam(V(-rw, H, sz * rd), V(rw, H, sz * rd), 0.8);
  for (const sx of [-1, 1]) kit.beam(V(sx * rw, H, -rd), V(sx * rw, H, rd), 0.8);
  for (let x = -hw + 4; x < hw; x += 4) kit.beam(V(x, H - 0.2, -rd), V(x, H - 0.2, rd), 0.6);

  const LL = F.legLed, legH = H - LL.gapTop - LL.y0, off = F.legSize / 2 + 0.06;
  const legWidth = LL.w + 0.1;
  const legBack = stripeBox(legWidth, legH, 0.08, legWidth / LL.w);
  const panels = [BM.black, stripeMat];
  legs.forEach(([sx, sz]) => {
    for (const [px, pz, ry] of [[sx * (hw + off), sz * hd, sx * Math.PI / 2], [sx * hw, sz * (hd + off), sz > 0 ? 0 : Math.PI]]) {
      const plate = new THREE.Mesh(legBack, panels); plate.position.set(px - Math.sin(ry) * 0.04, LL.y0 + legH / 2, pz - Math.cos(ry) * 0.04); plate.rotation.y = ry; g.add(plate);
    }
  });

  // 筒拱屋面（拱跨左右，屋脊沿前后）+ 火星标志；下表面黑色
  const roofGeo = new THREE.CylinderGeometry(rw, rw, F.roofDepth, 48, 1, true, -Math.PI / 2, Math.PI);
  const roof = new THREE.Mesh(roofGeo, new THREE.MeshStandardMaterial({ map: TX.roofTexture({ hw: rw, depth: F.roofDepth, side: F.logo.side, topZ: F.logo.topZ }), roughness: 0.32, metalness: 0.3, side: THREE.FrontSide }));
  roof.rotation.x = -Math.PI / 2; roof.scale.set(1, 1, F.roofRise / rw); roof.position.y = H + 0.6; roof.castShadow = true; g.add(roof);
  const under = new THREE.Mesh(roofGeo, new THREE.MeshStandardMaterial({ color: 0x101013, roughness: 0.8, side: THREE.BackSide }));
  under.rotation.copy(roof.rotation); under.scale.copy(roof.scale); under.position.copy(roof.position); g.add(under);

  // 屋面下中心的多边形吊架（固定）：24 边桁架 + 外沿一圈黑色裙板，8 根吊杆挂到檩条上
  const CE = F.ceiling, poly = circlePts(CE.r, CE.sides, CE.y, Math.PI / CE.sides);
  for (let k = 0; k < CE.sides; k++) kit.beam(poly[k], poly[(k + 1) % CE.sides], CE.truss);
  for (let k = 0; k < CE.sides; k += 3) kit.tube(poly[k], V(poly[k].x, H - 0.5, poly[k].z), 0.04);
  const skirt = new THREE.Mesh(new THREE.CylinderGeometry(CE.r + 0.3, CE.r + 0.3, CE.skirt, CE.sides, 1, true, Math.PI / CE.sides), BM.black);
  skirt.position.y = CE.y - CE.truss / 2 - CE.skirt / 2 + 0.2; g.add(skirt);
  // 《Forever》00:55：顶棚上留着较窄的固定框，能透过它看到上方交叉梁。
  const band = new THREE.Mesh(new THREE.RingGeometry(CE.r + 0.05, CE.r + 0.3, CE.sides, 1, Math.PI / CE.sides), BM.ringTop); band.rotation.x = Math.PI / 2; band.position.y = CE.y - CE.truss / 2 - 0.02; g.add(band);

  // 竖向屏板与多层灯架并排安装在开放钢框上，箱体底部露出横撑。
  const CR = F.crown, B = CR.box, cells = [];
  for (const st of CR.stacks) for (const ax of st.rows) for (const s1 of [-1, 1]) for (const s2 of [-1, 1])
    for (let k = 0; k < st.n; k++) for (let j = 0; j < st.deep; j++) for (let L = 0; L < st.layers; L++) {
      const a = s1 * (st.a0 + k * B.w), b = s2 * (CR.rowOff + (j - (st.deep - 1) / 2) * B.d), y = st.top - st.h * (L + 0.5);
      cells.push(ax === 'x' ? [a, y, b, st.h] : [b, y, a, st.h]);   // [x, 中心高, z, 层高]
    }
  const panelWidth = B.w * F.stripe.width;
  const count = cells.length * 4;
  const back = new THREE.InstancedMesh(stripeBox(panelWidth, 1, 0.12, F.stripe.width), panels, count);
  const rowCount = cells.reduce((n, [, , , h]) => n + Math.round(h / CR.fixturePitch) * 4, 0);
  const brackets = new THREE.InstancedMesh(new THREE.BoxGeometry(0.75, 0.18, 0.24), MAT.headBody, rowCount);
  const lensGeo = new THREE.CylinderGeometry(0.065, 0.065, 0.07, 8).rotateX(Math.PI / 2);
  const lenses = new THREE.InstancedMesh(lensGeo, MAT.matrixLens, rowCount * 3);
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), Yax = V(0, 1, 0), hb = B.w / 2;
  const p = V(0, 0, 0), panelScale = V(1, 1, 1), one = V(1, 1, 1);
  let rowIndex = 0;
  cells.forEach(([x, y, z, h], i) => {
    const rows = Math.round(h / CR.fixturePitch);
    [0, Math.PI, Math.PI / 2, -Math.PI / 2].forEach((ry, f) => {
      const cos = Math.cos(ry), sin = Math.sin(ry);
      const at = (u, v, depth) => p.set(x + u * cos + depth * sin, v, z - u * sin + depth * cos);
      q.setFromAxisAngle(Yax, ry);
      panelScale.y = h - 0.13;
      back.setMatrixAt(i * 4 + f, m4.compose(at(-B.w * 0.20, y, hb - 0.07), q, panelScale));

      for (let j = 0; j < rows; j++) {
        const yy = y + h * ((j + 0.5) / rows - 0.5);
        kit.tube(at(-hb, yy, hb - 0.16).clone(), at(hb, yy, hb - 0.16), 0.035);
        brackets.setMatrixAt(rowIndex, m4.compose(at(B.w * 0.26, yy, hb - 0.12), q, one));
        for (let k = 0; k < 3; k++) {
          lenses.setMatrixAt(rowIndex * 3 + k, m4.compose(at(B.w * 0.26 + (k - 1) * 0.19, yy, hb + 0.015), q, one));
        }
        rowIndex++;
      }
    });
    for (const [dx, dz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) kit.tube(V(x + dx * hb, y - h / 2, z + dz * hb), V(x + dx * hb, y + h / 2, z + dz * hb), 0.035);
    for (const yy of [y - h / 2, y + h / 2]) for (const s of [-1, 1]) {
      kit.tube(V(x - hb, yy, z + s * hb), V(x + hb, yy, z + s * hb), 0.03);
      kit.tube(V(x + s * hb, yy, z - hb), V(x + s * hb, yy, z + hb), 0.03);
    }
  });
  back.castShadow = back.receiveShadow = true;
  g.add(back, brackets, lenses);
  const reach = Math.max(...CR.stacks.map((s) => s.a0 + (s.n - 0.5) * B.w)), beamY = Math.max(...CR.stacks.map((s) => s.top)) + 0.35;
  for (const s of [-1, 1]) {
    kit.beam(V(-reach, beamY, s * CR.rowOff), V(reach, beamY, s * CR.rowOff), 0.6);
    kit.beam(V(s * CR.rowOff, beamY, -reach), V(s * CR.rowOff, beamY, reach), 0.6);
  }
  for (const [sx, sz] of legs) kit.tube(V(sx * hw, H, sz * hd), V(sx * CR.rowOff, beamY, sz * CR.rowOff), 0.08);

  const LY = F.lightTrussY;
  for (const sz of [-1, 1]) kit.beam(V(-hw, LY, sz * (hd + 1)), V(hw, LY, sz * (hd + 1)), 0.5);
  for (const sx of [-1, 1]) kit.beam(V(sx * (hw + 1), LY, -hd), V(sx * (hw + 1), LY, hd), 0.5);
  g.add(kit.build());
  for (let x = -hw + 1; x <= hw - 1; x += 1.6) for (const sz of [-1, 1]) movingHead(F.x + x, LY - 0.3, F.z + sz * (hd + 1));
  for (let z = -hd + 1; z <= hd - 1; z += 1.6) for (const sx of [-1, 1]) movingHead(F.x + sx * (hw + 1), LY - 0.3, F.z + z);
  return labeled(g, '吊盘');
}

// ---------- 三个圆环 ----------
// 一个环：外圈、内圈两道环形桁架 + 放射连杆；顶面黑盖板；外侧竖向灯带；底面放射灯条；外沿一圈圆灯；内沿一圈下挂小灯
function buildRing(spec, RG) {
  const ring = new THREE.Group(), { rOut, rIn } = spec, T = RG.truss, rMid = (rOut + rIn) / 2;
  ring.name = spec.name;
  const kit = new TrussKit(0x1b1c20), nSeg = Math.max(16, Math.round(rOut * 4));
  for (const r of [rOut - T / 2, rIn + T / 2]) { const p = circlePts(r, nSeg); for (let k = 0; k < nSeg; k++) kit.beam(p[k], p[(k + 1) % nSeg], T, { chord: 0.022, diag: 0.012 }); }
  for (let k = 0; k < nSeg; k += 2) { const a = (k / nSeg) * TAU, c = Math.cos(a), s = Math.sin(a); for (const y of [-T / 2, T / 2]) kit.tube(V(c * (rIn + T / 2), y, s * (rIn + T / 2)), V(c * (rOut - T / 2), y, s * (rOut - T / 2)), 0.02); }
  ring.add(kit.build());
  const top = new THREE.Mesh(new THREE.RingGeometry(rIn, rOut, 128, 1), BM.ringTop); top.rotation.x = -Math.PI / 2; top.position.y = T / 2 + 0.02; ring.add(top);
  const rim = new THREE.Mesh(new THREE.CylinderGeometry(rOut + 0.03, rOut + 0.03, RG.rim, 128, 1, true), BM.rim); ring.add(rim);
  const innerWall = new THREE.Mesh(new THREE.CylinderGeometry(rIn - 0.02, rIn - 0.02, T, 96, 1, true), BM.ringTop); ring.add(innerWall);
  const outerEdge = new THREE.TorusGeometry(rOut + 0.025, 0.03, 6, 128).rotateX(Math.PI / 2);
  for (const y of [-RG.rim / 2, RG.rim / 2]) {
    const edge = new THREE.Mesh(outerEdge, BM.ringEdge);
    edge.position.y = y;
    ring.add(edge);
  }
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), s1 = V(1, 1, 1), up = V(0, 1, 0);
  const place = (mesh, n, r, y, rotFn) => { for (let k = 0; k < n; k++) { const a = (k / n) * TAU; q.setFromAxisAngle(up, rotFn ? rotFn(a) : 0); mesh.setMatrixAt(k, m4.compose(V(Math.cos(a) * r, y, Math.sin(a) * r), q, s1)); } ring.add(mesh); };
  const nb = Math.round((TAU * rMid) / RG.barStep);
  const barLength = rOut - rIn - 0.23;
  place(new THREE.InstancedMesh(new THREE.BoxGeometry(barLength, 0.08, 0.105), BM.black, nb), nb, rMid, -T / 2 - 0.04, (a) => -a);
  const diffuser = new THREE.PlaneGeometry(barLength - 0.05, 0.065).rotateX(Math.PI / 2);
  place(new THREE.InstancedMesh(diffuser, BM.bar, nb), nb, rMid, -T / 2 - 0.095, (a) => -a);
  const nd = Math.round((TAU * rOut) / RG.domeStep);
  place(new THREE.InstancedMesh(new THREE.CylinderGeometry(0.11, 0.13, 0.16, 10), MAT.headBody, nd), nd, rOut - 0.14, -T / 2 - 0.08);
  const lens = new THREE.InstancedMesh(new THREE.CircleGeometry(0.092, 12), BM.bar, nd);
  for (let k = 0; k < nd; k++) { const a = (k / nd) * TAU; q.setFromAxisAngle(V(1, 0, 0), Math.PI / 2); lens.setMatrixAt(k, m4.compose(V(Math.cos(a) * (rOut - 0.14), -T / 2 - 0.165, Math.sin(a) * (rOut - 0.14)), q, s1)); }
  ring.add(lens);
  const nt = Math.round((TAU * rIn) / RG.toothStep);
  place(new THREE.InstancedMesh(new THREE.BoxGeometry(0.18, 0.24, 0.18), MAT.headBody, nt), nt, rIn + 0.14, -T / 2 - 0.14, (a) => -a);
  ring.traverse((o) => { if (o.isMesh) o.castShadow = true; });
  return ring;
}

export function buildRings() {
  const RG = LAYOUT.rings, F = LAYOUT.frame, group = new THREE.Group(); group.position.set(F.x, 0, F.z);
  group.userData.dynamic = true;
  const anchorY = F.ceiling.y - F.ceiling.truss / 2;
  const rings = RG.list.map((spec, i) => {
    const ring = buildRing(spec, RG);
    // 吊点：环外圈桁架顶上，均匀分布；各环错开角度，免得钢丝重叠
    const r = spec.rOut - RG.truss / 2, a0 = ((i + 0.5) / RG.list.length) * (TAU / RG.cables);
    ring.userData.attach = circlePts(r, RG.cables, RG.truss / 2, a0);
    ring.userData.anchor = ring.userData.attach.map((p) => V(p.x, anchorY, p.z));
    const cables = new THREE.LineSegments(new THREE.BufferGeometry().setAttribute('position', new THREE.Float32BufferAttribute(new Float32Array(RG.cables * 6), 3)), new THREE.LineBasicMaterial({ color: 0x6a6d74 }));
    cables.frustumCulled = false; group.add(cables); ring.userData.cables = cables;
    ring.position.y = RG.stowY;
    ring.userData.cur = { y: RG.stowY, rx: 0, rz: 0 };
    group.add(ring); return ring;
  });
  group.userData.rings = rings; group.userData.ceiling = anchorY;
  buildLift(group, anchorY);
  return labeled(group, '三个圆环');
}

export function updateRings(group, formationOrCustom, dt, speed = 0.9) {
  const FS = LAYOUT.rings.formations;
  const targets = Array.isArray(formationOrCustom)
    ? formationOrCustom
    : (FS[formationOrCustom] || FS[LAYOUT.rings.defaultFormation]).rings;
  const k = dt <= 0 ? 1 : 1 - Math.exp(-dt * speed);
  const p = new THREE.Vector3();
  group.userData.rings.forEach((ring, i) => {
    const spec = targets[i] || [LAYOUT.rings.stowY, 0, 0];
    const [ty, pitch = 0, roll = 0] = spec, c = ring.userData.cur;
    c.y += (ty - c.y) * k; c.rx += (-pitch * D2R - c.rx) * k; c.rz += (roll * D2R - c.rz) * k;
    ring.position.y = c.y; ring.rotation.set(c.rx, 0, c.rz); ring.updateMatrix();
    const pos = ring.userData.cables.geometry.attributes.position;
    ring.userData.attach.forEach((a, j) => { p.copy(a).applyMatrix4(ring.matrix); pos.setXYZ(j * 2, p.x, p.y, p.z); const an = ring.userData.anchor[j]; pos.setXYZ(j * 2 + 1, an.x, an.y, an.z); });
    pos.needsUpdate = true;
  });
}

// ---------- 歌手升降：吊笼（顶棚中心吊下来）+ 圆台中心升降台 ----------
let currentLiftPlatformY = topTierY();
let currentLiftCageFloorY = LAYOUT.lift.states[LAYOUT.lift.defaultState]?.cageFloor ?? 26;
export function liftPlatformHeight() { return currentLiftPlatformY; }
export function liftCageHeight() { return currentLiftCageFloorY; }

function buildLift(group, anchorY) {
  const LF = LAYOUT.lift, CG = LF.cage, PL = LF.platform, ty = topTierY();
  // 吊笼：原点 = 底盘底面
  const cage = new THREE.Group();
  const floor = new THREE.Mesh(new THREE.CylinderGeometry(CG.rFloor, CG.rFloor, CG.tFloor, 40), BM.cageFloor); floor.position.y = CG.tFloor / 2; cage.add(floor);
  const tube = new THREE.Mesh(new THREE.CylinderGeometry(CG.rTube, CG.rTube, CG.hTube, 40, 1, true), MAT.glassCage); tube.position.y = CG.tFloor + CG.hTube / 2; cage.add(tube);
  for (const y of [CG.tFloor, CG.tFloor + CG.hTube]) { const rim = new THREE.Mesh(new THREE.TorusGeometry(CG.rTube, 0.035, 6, 40), MAT.steel); rim.rotation.x = Math.PI / 2; rim.position.y = y; cage.add(rim); }
  const drumY = CG.tFloor + CG.hTube;
  const drum = new THREE.Mesh(new THREE.CylinderGeometry(CG.rDrum, CG.rDrum, CG.hDrum, 40, 1, true), BM.black); drum.position.y = drumY + CG.hDrum / 2; cage.add(drum);
  const drumBottom = new THREE.Mesh(new THREE.CircleGeometry(CG.rDrum, 40), BM.black); drumBottom.rotation.x = Math.PI / 2; drumBottom.position.y = drumY + 0.01; cage.add(drumBottom);
  const lip = new THREE.Mesh(new THREE.TorusGeometry(CG.rDrum, 0.05, 6, 40), MAT.dark); lip.rotation.x = Math.PI / 2; lip.position.y = drumY + CG.hDrum; cage.add(lip);
  const cageTop = drumY + CG.hDrum;
  const cablePts = []; for (let k = 0; k < CG.cables; k++) { const a = (k / CG.cables) * TAU; cablePts.push(V(Math.cos(a) * CG.rDrum * 0.7, 0, Math.sin(a) * CG.rDrum * 0.7), V(Math.cos(a) * CG.rDrum * 0.7, 1, Math.sin(a) * CG.rDrum * 0.7)); }
  const cageCables = new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(cablePts), new THREE.LineBasicMaterial({ color: 0x6a6d74 })); cageCables.position.y = cageTop; cageCables.frustumCulled = false; cage.add(cageCables);
  group.add(cage);
  // 升降台：原点 = 台面顶面
  const plat = new THREE.Group();
  const disc = new THREE.Mesh(new THREE.CylinderGeometry(PL.r, PL.r, PL.t, 128, 1, true), circleStageMaterials.deckInner);
  disc.position.y = -PL.t / 2; disc.castShadow = disc.receiveShadow = true; plat.add(disc);
  // 两道浅色环与圆板共面，分别占据实际面片，避免叠放导致闪烁。
  const marks = [LAYOUT.circleStage.liftInnerLine, PL.r - 0.035];
  const radii = [0, marks[0] - 0.017, marks[0] + 0.017, marks[1] - 0.017, marks[1] + 0.017, PL.r];
  for (let i = 0; i < radii.length - 1; i++) {
    const band = new THREE.Mesh(new THREE.RingGeometry(radii[i], radii[i + 1], 128), i % 2 ? circleStageMaterials.treadEdge : circleStageMaterials.deckInner);
    band.rotation.x = -Math.PI / 2;
    band.receiveShadow = true;
    plat.add(band);
  }
  const kit = new TrussKit(0x202126), h0 = -ty, h1 = -PL.t, e = PL.frame / 2 - PL.post / 2;
  for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) kit.beam(V(sx * e, h0, sz * e), V(sx * e, h1, sz * e), PL.post);
  for (const y of [h1 - 0.2, h1 - 1.2]) for (const [a, b] of [[[-e, -e], [e, -e]], [[e, -e], [e, e]], [[e, e], [-e, e]], [[-e, e], [-e, -e]]]) kit.tube(V(a[0], y, a[1]), V(b[0], y, b[1]), 0.04);
  plat.add(kit.build());
  group.add(plat);

  const cur = { floor: 0, rise: 0 }, target = { floor: 0, rise: 0 };
  const apply = () => {
    cage.position.y = cur.floor; cageCables.scale.y = Math.max(0.01, anchorY - cur.floor - cageTop);
    plat.position.y = ty + cur.rise;
    currentLiftPlatformY = ty + cur.rise;
    currentLiftCageFloorY = cur.floor + CG.tFloor;
  };
  const setState = (key, instant) => {
    if (key && typeof key === 'object') {
      if (key.cageFloor != null) target.floor = key.cageFloor;
      if (key.rise != null) target.rise = key.rise;
    } else {
      const s = LF.states[key] || LF.states[LF.defaultState];
      target.floor = s.cageFloor; target.rise = s.rise;
    }
    if (instant) { cur.floor = target.floor; cur.rise = target.rise; apply(); }
  };
  group.userData.setLiftState = setState;
  setState(LF.defaultState, true);
  registerControl({ key: 'lift', label: '歌手升降', options: Object.fromEntries(Object.entries(LF.states).map(([k, v]) => [k, v.label])), value: LF.defaultState, set: (v) => setState(v) });
  animate((dt) => {
    const k = 1 - Math.exp(-dt * 0.8);
    if (Math.abs(target.floor - cur.floor) < 1e-3 && Math.abs(target.rise - cur.rise) < 1e-3) return;
    cur.floor += (target.floor - cur.floor) * k; cur.rise += (target.rise - cur.rise) * k; apply();
  });
}
