import * as THREE from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
const MEIQIU_COLORS = {
  fur: 6053994,
  furSheen: 11186366,
  petal: 14886448,
  petalBright: 15609656,
  stamen: 16766018,
  calyx: 3892791,
  eye: 789776,
  highlight: 16777215,
  blush: 16026784,
  mouth: 1381915,
  mouthPink: 15634838,
  tear: 6471926,
  logo: 16316664,
  hoodBlack: 1908518,
  hoodInner: 3487812,
  scarfRed: 14230316,
  capRed: 14033966,
  capTrim: 16175946,
  propRed: 14952241,
  propGreen: 3979356
};
const MEIQIU_VARIANTS = {
  smile: { label: "笑脸灰绒 · 红花", expression: "smile", hat: "none", prop: "none", scarf: false },
  cry: { label: "哭哭蓝眼泪 · 红花", expression: "cry", hat: "none", prop: "none", scarf: false },
  happy: { label: "笑眯眯大笑 · 小绿球", expression: "happy", hat: "none", prop: "greenBall", scarf: false },
  catHood: { label: "黑猫耳头套 · 火星红球", expression: "pout", hat: "catHood", prop: "redCross", scarf: false },
  flowerHood: { label: "大红花瓣头套 · 笑脸", expression: "smile", hat: "flowerHood", prop: "none", scarf: false },
  redCap: { label: "红色小帽 · 红围巾", expression: "happy", hat: "redCap", prop: "redCross", scarf: true }
};
const MEIQIU_VARIANT_KEYS = Object.keys(MEIQIU_VARIANTS);
function tintGeo(geo, hex, shadeFn = null) {
  const g = geo.index ? geo.toNonIndexed() : geo;
  for (const k of Object.keys(g.attributes)) if (!["position", "normal"].includes(k)) g.deleteAttribute(k);
  if (!g.attributes.normal) g.computeVertexNormals();
  const pos = g.attributes.position;
  const col = new THREE.Color(hex);
  const rgb = new Float32Array(pos.count * 3);
  for (let i = 0; i < pos.count; i++) {
    const s = shadeFn ? shadeFn(pos.getX(i), pos.getY(i), pos.getZ(i)) : 1;
    rgb[i * 3] = Math.min(1, col.r * s);
    rgb[i * 3 + 1] = Math.min(1, col.g * s);
    rgb[i * 3 + 2] = Math.min(1, col.b * s);
  }
  g.setAttribute("color", new THREE.BufferAttribute(rgb, 3));
  return g;
}
function mergeList(list) {
  const merged = mergeGeometries(list, false);
  for (const g of list) g.dispose();
  return merged;
}
function ellipsoidPoint(cx, cy, cz, rx, ry, rz, nx, ny, push = 0) {
  const nz = Math.sqrt(Math.max(0.01, 1 - nx * nx - ny * ny));
  const normal = new THREE.Vector3(nx / rx, ny / ry, nz / rz).normalize();
  const pos = new THREE.Vector3(cx + nx * rx, cy + ny * ry, cz + nz * rz).addScaledVector(normal, push);
  return { pos, normal };
}
const Z_AXIS = new THREE.Vector3(0, 0, 1);
const Y_AXIS = new THREE.Vector3(0, 1, 0);
function orientedEllipsoid(pos, normal, rx, ry, rz, wSeg, hSeg) {
  const g = new THREE.SphereGeometry(1, wSeg, hSeg).scale(rx, ry, rz);
  const q = new THREE.Quaternion().setFromUnitVectors(Z_AXIS, normal);
  g.applyQuaternion(q).translate(pos.x, pos.y, pos.z);
  return g;
}
function segmentBar(a, b, thickness, depth, extra = 0.22) {
  const dir = b.clone().sub(a);
  const len = dir.length();
  const mid = a.clone().lerp(b, 0.5);
  const g = new THREE.BoxGeometry(thickness, len + thickness * extra, depth);
  const q = new THREE.Quaternion().setFromUnitVectors(Y_AXIS, dir.divideScalar(len || 1));
  g.applyQuaternion(q).translate(mid.x, mid.y, mid.z);
  return g;
}
const HEAD = { cx: 0, cy: 0.672, cz: 5e-3, rx: 0.214, ry: 0.194, rz: 0.196 };
const TORSO = { cx: 0, cy: 0.348, cz: 0, rx: 0.156, ry: 0.172, rz: 0.14 };
const FLOWER = { cx: 0, cy: 0.916, cz: 0.012, tiltX: -0.48 };
function buildFlowerPieces({ detail = "high", cx = FLOWER.cx, cy = FLOWER.cy, cz = FLOWER.cz, tiltX = FLOWER.tiltX, scale = 1 } = {}) {
  const pieces = [];
  const high = detail === "high";
  const m = new THREE.Matrix4().makeTranslation(cx, cy, cz).multiply(new THREE.Matrix4().makeRotationX(tiltX));
  if (high) {
    const stem = new THREE.CylinderGeometry(0.015 * scale, 0.022 * scale, 0.026 * scale, 8);
    stem.translate(cx, cy - 0.036 * scale, cz - 5e-3 * scale);
    pieces.push(tintGeo(stem, MEIQIU_COLORS.calyx));
  }
  for (let i = 0; i < 5; i++) {
    const a = Math.PI / 2 + i * Math.PI * 2 / 5;
    const base = high ? new THREE.SphereGeometry(1, 12, 8) : new THREE.IcosahedronGeometry(1, 0);
    const g = base.scale(0.038 * scale, 0.042 * scale, 0.025 * scale).rotateZ(a - Math.PI / 2).translate(Math.cos(a) * 0.044 * scale, Math.sin(a) * 0.044 * scale, 0);
    g.applyMatrix4(m);
    pieces.push(tintGeo(g, MEIQIU_COLORS.petal, (x, y) => {
      const dist = Math.hypot(x - cx, y - cy);
      return 0.87 + Math.min(0.2, dist * 2.2);
    }));
  }
  const centerBase = high ? new THREE.SphereGeometry(1, 12, 8) : new THREE.IcosahedronGeometry(1, 0);
  const centerFront = centerBase.scale(0.032 * scale, 0.032 * scale, 0.028 * scale).translate(0, 0, 9e-3 * scale);
  centerFront.applyMatrix4(m);
  pieces.push(tintGeo(centerFront, MEIQIU_COLORS.stamen, (_x, y) => 0.94 + Math.max(0, (y - cy) * 1.4)));
  if (high) {
    const centerBack = new THREE.SphereGeometry(1, 8, 5).scale(0.021 * scale, 0.021 * scale, 0.012 * scale).translate(0, 0, -0.015 * scale);
    centerBack.applyMatrix4(m);
    pieces.push(tintGeo(centerBack, MEIQIU_COLORS.calyx));
  }
  return pieces;
}
function buildSimpleFlowerPieces({ cx = FLOWER.cx, cy = FLOWER.cy, cz = FLOWER.cz, tiltX = FLOWER.tiltX, scale = 1 } = {}) {
  const m = new THREE.Matrix4().makeTranslation(cx, cy, cz).multiply(new THREE.Matrix4().makeRotationX(tiltX));
  const petalDisc = new THREE.CylinderGeometry(0.076 * scale, 0.068 * scale, 0.036 * scale, 5, 1, false).rotateX(Math.PI / 2);
  petalDisc.applyMatrix4(m);
  const stamen = new THREE.OctahedronGeometry(0.034 * scale, 0).translate(0, 0, 0.012 * scale);
  stamen.applyMatrix4(m);
  return [
    tintGeo(petalDisc, MEIQIU_COLORS.petal),
    tintGeo(stamen, MEIQIU_COLORS.stamen)
  ];
}
function buildHatPieces({ hat = "none", detail = "high", head = HEAD } = {}) {
  const pieces = [];
  const high = detail === "high";
  if (hat === "none") {
    return buildFlowerPieces({ detail, cx: head.cx, cy: head.cy + head.ry + 0.05, cz: head.cz + 7e-3 });
  }
  if (hat === "catHood") {
    const segW = high ? 18 : 8;
    const segH = high ? 12 : 5;
    const hoodShell = new THREE.SphereGeometry(1, segW, segH, 0, Math.PI * 2, 0, Math.PI * 0.67).rotateX(-Math.PI / 2).scale(head.rx * 1.11, head.ry * 1.12, head.rz * 1.09).translate(head.cx, head.cy + 4e-3, head.cz - 4e-3);
    pieces.push(tintGeo(hoodShell, MEIQIU_COLORS.hoodBlack, (_x, y) => 0.92 + Math.max(0, (y - head.cy) * 0.6)));
    const rim = new THREE.TorusGeometry(0.186, 0.026, high ? 8 : 4, high ? 20 : 10).scale(1.06, 0.94, 0.95).translate(head.cx, head.cy - 6e-3, head.cz + 0.088);
    pieces.push(tintGeo(rim, MEIQIU_COLORS.hoodBlack));
    const earSeg = high ? 10 : 4;
    for (const side of [-1, 1]) {
      const ear = new THREE.ConeGeometry(0.062, 0.115, earSeg).scale(1, 1, 0.62).rotateZ(-side * 0.34).rotateX(0.12).translate(head.cx + side * 0.148, head.cy + head.ry * 0.95, head.cz + 0.018);
      pieces.push(tintGeo(ear, MEIQIU_COLORS.hoodBlack));
      if (high) {
        const inner = new THREE.ConeGeometry(0.032, 0.064, 6).scale(1, 1, 0.45).rotateZ(-side * 0.34).rotateX(0.12).translate(head.cx + side * 0.146, head.cy + head.ry * 0.93, head.cz + 0.038);
        pieces.push(tintGeo(inner, MEIQIU_COLORS.hoodInner));
      }
    }
    for (const side of [-1, 1]) {
      const browEye = (high ? new THREE.SphereGeometry(1, 8, 5) : new THREE.OctahedronGeometry(1, 0)).scale(0.021, 0.015, 8e-3).rotateX(-0.55).translate(head.cx + side * 0.062, head.cy + head.ry * 0.8, head.cz + head.rz * 0.72);
      pieces.push(tintGeo(browEye, MEIQIU_COLORS.highlight));
    }
    pieces.push(...high ? buildFlowerPieces({ detail: "high", cx: head.cx, cy: head.cy + head.ry + 0.068, cz: head.cz + 0.015, scale: 0.96 }) : buildSimpleFlowerPieces({ cx: head.cx, cy: head.cy + head.ry + 0.068, cz: head.cz + 0.015, scale: 0.96 }));
    return pieces;
  }
  if (hat === "flowerHood") {
    for (let i = 0; i < 6; i++) {
      const a = Math.PI / 2 + i * Math.PI * 2 / 6;
      const base = high ? new THREE.SphereGeometry(1, 12, 8) : new THREE.IcosahedronGeometry(1, 0);
      const g = base.scale(0.104, 0.108, 0.072).rotateZ(a - Math.PI / 2).translate(head.cx + Math.cos(a) * 0.212, head.cy + Math.sin(a) * 0.194, head.cz - 0.015);
      pieces.push(tintGeo(g, MEIQIU_COLORS.petalBright, (x, y) => {
        const d = Math.hypot(x - head.cx, y - head.cy);
        return 0.84 + Math.min(0.22, d * 0.85);
      }));
    }
    const backCap = new THREE.SphereGeometry(1, high ? 14 : 7, high ? 10 : 5, 0, Math.PI * 2, 0, Math.PI * 0.54).rotateX(-Math.PI / 2).scale(head.rx * 1.05, head.ry * 1.05, head.rz * 1.04).translate(head.cx, head.cy, head.cz - 0.018);
    pieces.push(tintGeo(backCap, MEIQIU_COLORS.petal));
    return pieces;
  }
  if (hat === "redCap") {
    const capM = new THREE.Matrix4().makeTranslation(head.cx, head.cy + head.ry * 0.42, head.cz - 8e-3).multiply(new THREE.Matrix4().makeRotationX(-0.22));
    const dome = new THREE.SphereGeometry(1, high ? 18 : 8, high ? 10 : 5, 0, Math.PI * 2, 0, Math.PI * 0.54).scale(head.rx * 1.04, head.ry * 0.78, head.rz * 1.04);
    dome.applyMatrix4(capM);
    pieces.push(tintGeo(dome, MEIQIU_COLORS.capRed, (_x, y) => 0.9 + Math.max(0, (y - head.cy) * 0.55)));
    const brim = new THREE.CylinderGeometry(0.175, 0.185, 0.018, high ? 14 : 7, 1, false, -Math.PI * 0.46, Math.PI * 0.92).scale(1.12, 1, 0.95).translate(0, 6e-3, 0.092);
    brim.applyMatrix4(capM);
    pieces.push(tintGeo(brim, MEIQIU_COLORS.petal));
    pieces.push(...high ? buildFlowerPieces({ detail: "high", cx: head.cx, cy: head.cy + head.ry + 0.055, cz: head.cz - 0.01, tiltX: -0.58, scale: 0.82 }) : buildSimpleFlowerPieces({ cx: head.cx, cy: head.cy + head.ry + 0.055, cz: head.cz - 0.01, tiltX: -0.58, scale: 0.82 }));
    return pieces;
  }
  return pieces;
}
function buildEyePieces({ expression = "smile", detail = "high", head = HEAD } = {}) {
  const pieces = [];
  if (expression === "happy") return pieces;
  const high = detail === "high";
  for (const side of [-1, 1]) {
    const { pos, normal } = ellipsoidPoint(head.cx, head.cy, head.cz, head.rx, head.ry, head.rz, side * 0.38, 0.02, 1e-3);
    const q = new THREE.Quaternion().setFromUnitVectors(Z_AXIS, normal);
    const eye = (high ? new THREE.SphereGeometry(1, 14, 10) : new THREE.IcosahedronGeometry(1, 0)).scale(0.032, 0.038, 0.017);
    eye.applyQuaternion(q).translate(pos.x, pos.y, pos.z);
    pieces.push(tintGeo(eye, MEIQIU_COLORS.eye));
    const hi1 = (high ? new THREE.SphereGeometry(1, 8, 6) : new THREE.OctahedronGeometry(1, 0)).scale(0.012, 0.013, 75e-4);
    const hi1Local = new THREE.Vector3(-95e-4, 0.012, 0.0145).applyQuaternion(q);
    hi1.applyQuaternion(q).translate(pos.x + hi1Local.x, pos.y + hi1Local.y, pos.z + hi1Local.z);
    pieces.push(tintGeo(hi1, MEIQIU_COLORS.highlight));
    if (high) {
      const hi2 = new THREE.SphereGeometry(1, 6, 4).scale(6e-3, 6e-3, 45e-4);
      const hi2Local = new THREE.Vector3(0.01, -0.012, 0.0135).applyQuaternion(q);
      hi2.applyQuaternion(q).translate(pos.x + hi2Local.x, pos.y + hi2Local.y, pos.z + hi2Local.z);
      pieces.push(tintGeo(hi2, MEIQIU_COLORS.highlight));
    }
  }
  return pieces;
}
function buildFaceAccentPieces({ expression = "smile", detail = "high", head = HEAD } = {}) {
  const pieces = [];
  const high = detail === "high";
  for (const side of [-1, 1]) {
    const { pos, normal } = ellipsoidPoint(head.cx, head.cy, head.cz, head.rx, head.ry, head.rz, side * 0.59, -0.2, 25e-4);
    const g = (high ? new THREE.SphereGeometry(1, 10, 6) : new THREE.OctahedronGeometry(1, 0)).scale(0.034, 0.018, 7e-3);
    g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(Z_AXIS, normal)).translate(pos.x, pos.y, pos.z);
    pieces.push(tintGeo(g, MEIQIU_COLORS.blush));
  }
  if (expression === "cry") {
    const tearSegs = high ? 5 : 2;
    for (const side of [-1, 1]) {
      const pts2 = [];
      for (let i = 0; i <= tearSegs; i++) {
        const t = i / tearSegs;
        const nx = side * (0.37 + t * 0.065);
        const ny = -0.1 - t * 0.42;
        pts2.push(ellipsoidPoint(head.cx, head.cy, head.cz, head.rx, head.ry, head.rz, nx, ny, 45e-4).pos);
      }
      for (let i = 0; i < tearSegs; i++) {
        pieces.push(tintGeo(segmentBar(pts2[i], pts2[i + 1], 0.0135, 9e-3, 0.45), MEIQIU_COLORS.tear));
      }
      if (high) {
        const tip = ellipsoidPoint(head.cx, head.cy, head.cz, head.rx, head.ry, head.rz, side * 0.435, -0.53, 4e-3);
        pieces.push(tintGeo(orientedEllipsoid(tip.pos, tip.normal, 0.01, 0.012, 6e-3, 6, 4), MEIQIU_COLORS.tear));
      }
    }
    const { pos, normal } = ellipsoidPoint(head.cx, head.cy, head.cz, head.rx, head.ry, head.rz, 0, -0.25, 4e-3);
    const m = (high ? new THREE.SphereGeometry(1, 10, 6) : new THREE.OctahedronGeometry(1, 0)).scale(0.017, 0.036, 8e-3);
    m.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(Z_AXIS, normal)).translate(pos.x, pos.y, pos.z);
    pieces.push(tintGeo(m, MEIQIU_COLORS.mouthPink));
    return pieces;
  }
  if (expression === "happy") {
    const eyeSegs = high ? 5 : 2;
    for (const side of [-1, 1]) {
      const pts2 = [];
      for (let i = 0; i <= eyeSegs; i++) {
        const t = i / eyeSegs * 2 - 1;
        const nx = side * 0.39 + t * 0.11;
        const ny = 0.055 - t * t * 0.075;
        pts2.push(ellipsoidPoint(head.cx, head.cy, head.cz, head.rx, head.ry, head.rz, nx, ny, 45e-4).pos);
      }
      for (let i = 0; i < eyeSegs; i++) {
        pieces.push(tintGeo(segmentBar(pts2[i], pts2[i + 1], 0.0115, 0.01, 0.45), MEIQIU_COLORS.mouth));
      }
    }
    const { pos, normal } = ellipsoidPoint(head.cx, head.cy, head.cz, head.rx, head.ry, head.rz, 0, -0.285, 3e-3);
    const m = (high ? new THREE.SphereGeometry(1, 10, 6) : new THREE.OctahedronGeometry(1, 0)).scale(0.03, 0.022, 7e-3);
    m.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(Z_AXIS, normal)).translate(pos.x, pos.y, pos.z);
    pieces.push(tintGeo(m, MEIQIU_COLORS.mouthPink));
    const mSegs = high ? 6 : 2;
    const mPts = [];
    for (let i = 0; i <= mSegs; i++) {
      const t = i / mSegs * 2 - 1;
      mPts.push(ellipsoidPoint(head.cx, head.cy, head.cz, head.rx, head.ry, head.rz, t * 0.19, -0.225 + t * t * 0.045, 55e-4).pos);
    }
    for (let i = 0; i < mSegs; i++) {
      pieces.push(tintGeo(segmentBar(mPts[i], mPts[i + 1], 85e-4, 85e-4, 0.4), MEIQIU_COLORS.mouth));
    }
    return pieces;
  }
  if (expression === "pout") {
    for (const side of [-1, 1]) {
      const p0 = ellipsoidPoint(head.cx, head.cy, head.cz, head.rx, head.ry, head.rz, side * 0.25, 0.16, 5e-3).pos;
      const p1 = ellipsoidPoint(head.cx, head.cy, head.cz, head.rx, head.ry, head.rz, side * 0.46, 0.24, 5e-3).pos;
      pieces.push(tintGeo(segmentBar(p0, p1, 95e-4, 85e-4, 0.25), MEIQIU_COLORS.mouth));
    }
    const pL = ellipsoidPoint(head.cx, head.cy, head.cz, head.rx, head.ry, head.rz, -0.14, -0.31, 45e-4).pos;
    const pM = ellipsoidPoint(head.cx, head.cy, head.cz, head.rx, head.ry, head.rz, 0, -0.2, 45e-4).pos;
    const pR = ellipsoidPoint(head.cx, head.cy, head.cz, head.rx, head.ry, head.rz, 0.14, -0.31, 45e-4).pos;
    pieces.push(tintGeo(segmentBar(pL, pM, 95e-4, 85e-4, 0.35), MEIQIU_COLORS.mouth));
    pieces.push(tintGeo(segmentBar(pM, pR, 95e-4, 85e-4, 0.35), MEIQIU_COLORS.mouth));
    return pieces;
  }
  const segs = high ? 8 : 3;
  const pts = [];
  for (let i = 0; i <= segs; i++) {
    const t = i / segs * 2 - 1;
    const nx = t * 0.195;
    const ny = -0.305 + t * t * 0.115;
    pts.push(ellipsoidPoint(head.cx, head.cy, head.cz, head.rx, head.ry, head.rz, nx, ny, 42e-4).pos);
  }
  const stroke = high ? 86e-4 : 0.01;
  for (let i = 0; i < segs; i++) {
    pieces.push(tintGeo(segmentBar(pts[i], pts[i + 1], stroke, 85e-4, 0.45), MEIQIU_COLORS.mouth));
  }
  return pieces;
}
function buildChestLogoPieces({ detail = "high", torso = TORSO, centerNy = 0.13, logoScale = 0.056 } = {}) {
  const pieces = [];
  const high = detail === "high";
  const thickness = high ? 66e-4 : 82e-4;
  const depth = 6e-3;
  const mapPt = (lx, ly) => {
    const nx = lx * logoScale / torso.rx;
    const ny = centerNy + (0.7 - ly) * logoScale / torso.ry;
    return ellipsoidPoint(torso.cx, torso.cy, torso.cz, torso.rx, torso.ry, torso.rz, nx, ny, 52e-4).pos;
  };
  const bar = (x0, y0, x1, y1, extra = 0.15) => pieces.push(tintGeo(segmentBar(mapPt(x0, y0), mapPt(x1, y1), thickness, depth, extra), MEIQIU_COLORS.logo));
  bar(-0.97, 0, 0.97, 0, 0.1);
  bar(-0.98, 0.02, 0, 1.296, 0.12);
  bar(0.98, 0.02, 0, 1.296, 0.12);
  bar(0, 0.02, 0, 1.611, 0.08);
  bar(-0.92, 0.707, 0.92, 0.707, 0.08);
  if (high) {
    const arcSteps = 3;
    const [cx, cy, rMid] = [0, 0.733, 0.437];
    for (const s of [-1, 1]) {
      let prev = null;
      for (let i = 0; i <= arcSteps; i++) {
        const a = Math.PI + Math.PI / 2 * (i / arcSteps);
        const lx = s * Math.max(-cx - rMid * Math.cos(a), 0.11);
        const ly = cy + rMid * Math.sin(a);
        if (prev) bar(prev[0], prev[1], lx, ly, 0.25);
        prev = [lx, ly];
      }
    }
  }
  return pieces;
}
function buildBodyAccessoryPieces({ scarf = false, prop = "none", detail = "high", torso = TORSO, propPos = null } = {}) {
  const pieces = [];
  const high = detail === "high";
  if (scarf) {
    const collar = new THREE.TorusGeometry(0.118, 0.024, high ? 8 : 4, high ? 18 : 8).rotateX(Math.PI / 2).scale(1.04, 0.95, 1).translate(torso.cx, torso.cy + torso.ry * 0.88, torso.cz + 4e-3);
    pieces.push(tintGeo(collar, MEIQIU_COLORS.scarfRed));
    const tail = new THREE.CylinderGeometry(0.02, 0.022, 0.11, high ? 8 : 5).rotateZ(-0.22).rotateX(-0.18).translate(torso.cx + 0.082, torso.cy + torso.ry * 0.48, torso.cz + torso.rz * 0.76);
    pieces.push(tintGeo(tail, MEIQIU_COLORS.scarfRed));
  }
  if (prop !== "none") {
    const px = propPos ? propPos[0] : 0.205;
    const py = propPos ? propPos[1] : 0.305;
    const pz = propPos ? propPos[2] : 0.075;
    const r = 0.056;
    const ballGeo = high ? new THREE.SphereGeometry(r, 12, 8) : new THREE.IcosahedronGeometry(r, 0);
    if (prop === "redCross") {
      const ball = ballGeo.scale(1, 1, 0.82).translate(px, py, pz);
      pieces.push(tintGeo(ball, MEIQIU_COLORS.propRed));
      const hBar = new THREE.BoxGeometry(r * 1.15, 0.013, 0.014).translate(px, py, pz + r * 0.76);
      const vBar = new THREE.BoxGeometry(0.013, r * 1.15, 0.014).translate(px, py, pz + r * 0.76);
      pieces.push(tintGeo(hBar, MEIQIU_COLORS.highlight), tintGeo(vBar, MEIQIU_COLORS.highlight));
    } else if (prop === "greenBall") {
      const ball = ballGeo.scale(1.05, 0.96, 0.85).translate(px, py, pz);
      pieces.push(tintGeo(ball, MEIQIU_COLORS.propGreen));
      const accent = new THREE.BoxGeometry(r * 0.95, 0.011, 0.012).rotateZ(0.35).translate(px, py, pz + r * 0.78);
      pieces.push(tintGeo(accent, MEIQIU_COLORS.highlight));
    }
  }
  return pieces;
}
function furShade(_x, y, z) {
  let s = 0.97 + (y - 0.5) * 0.14;
  if (y > 0.46 && y < 0.52) s *= 0.88;
  if (z > 0.05 && y > 0.54) s *= 1.03;
  return Math.max(0.8, Math.min(1.08, s));
}
function buildCrowdNearVariant(variantKey = "smile") {
  const cfg = MEIQIU_VARIANTS[variantKey] || MEIQIU_VARIANTS.smile;
  const furPieces = [
    tintGeo(new THREE.SphereGeometry(1, 10, 7).scale(HEAD.rx, HEAD.ry, HEAD.rz).translate(HEAD.cx, HEAD.cy, HEAD.cz), 16777215, furShade),
    tintGeo(new THREE.SphereGeometry(1, 8, 6).scale(TORSO.rx, TORSO.ry, TORSO.rz).translate(TORSO.cx, TORSO.cy, TORSO.cz), 16777215, furShade)
  ];
  for (const side of [-1, 1]) {
    const leg = new THREE.CapsuleGeometry(0.056, 0.123, 2, 5).scale(1.04, 1, 1.14).translate(side * 0.076, 0.1175, 5e-3);
    furPieces.push(tintGeo(leg, 16777215, furShade));
    const arm = new THREE.CapsuleGeometry(0.043, 0.092, 2, 5).rotateZ(side * 0.34).rotateX(-0.1).translate(side * 0.156, 0.362, 0.015);
    furPieces.push(tintGeo(arm, 16777215, furShade));
  }
  const fur = mergeList(furPieces);
  const accents = mergeList([
    ...buildHatPieces({ hat: cfg.hat, detail: "crowd" }),
    ...buildEyePieces({ expression: cfg.expression, detail: "crowd" }),
    ...buildFaceAccentPieces({ expression: cfg.expression, detail: "crowd" }),
    ...buildChestLogoPieces({ detail: "crowd" }),
    ...buildBodyAccessoryPieces({ scarf: cfg.scarf, prop: cfg.prop, detail: "crowd" })
  ]);
  return { fur, accents };
}
function buildCrowdNearParts() {
  const { fur, accents } = buildCrowdNearVariant("smile");
  const eyes = mergeList(buildEyePieces({ expression: "smile", detail: "crowd" }));
  return { fur, accents, eyes };
}
function buildCrowdFarParts() {
  const fur = mergeList([
    tintGeo(new THREE.SphereGeometry(1, 6, 4).scale(HEAD.rx, HEAD.ry, HEAD.rz).translate(HEAD.cx, HEAD.cy, HEAD.cz), 16777215, furShade),
    tintGeo(new THREE.CylinderGeometry(0.148, 0.116, 0.49, 5, 1, true).translate(0, 0.245, 0), 16777215, furShade)
  ]);
  const flower = mergeList(buildSimpleFlowerPieces());
  return { fur, flower };
}
function buildCrowdSitParts(variantKey = "smile") {
  const cfg = MEIQIU_VARIANTS[variantKey] || MEIQIU_VARIANTS.smile;
  const head = { cx: 0, cy: 0.495, cz: 0, rx: 0.208, ry: 0.188, rz: 0.19 };
  const furPieces = [
    tintGeo(new THREE.SphereGeometry(1, 6, 4).scale(head.rx, head.ry, head.rz).translate(head.cx, head.cy, head.cz), 16777215, furShade),
    tintGeo(new THREE.SphereGeometry(1, 6, 4).scale(0.162, 0.165, 0.15).translate(0, 0.185, -0.015), 16777215, furShade),
    tintGeo(new THREE.BoxGeometry(0.24, 0.085, 0.22).translate(0, 0.043, 0.145), 16777215, furShade)
  ];
  const fur = mergeList(furPieces);
  const accPieces = [];
  if (cfg.hat === "catHood") {
    for (const side of [-1, 1]) {
      const ear = new THREE.ConeGeometry(0.062, 0.115, 4).scale(1, 1, 0.65).rotateZ(-side * 0.34).translate(side * 0.145, head.cy + head.ry * 0.92, 0.01);
      accPieces.push(tintGeo(ear, MEIQIU_COLORS.hoodBlack));
    }
    accPieces.push(...buildSimpleFlowerPieces({ cx: 0, cy: head.cy + head.ry + 0.06, cz: 0.012, scale: 0.94 }));
  } else if (cfg.hat === "flowerHood") {
    const ring = new THREE.CylinderGeometry(0.295, 0.295, 0.075, 6, 1).rotateX(Math.PI / 2).translate(0, head.cy, -0.025);
    accPieces.push(tintGeo(ring, MEIQIU_COLORS.petalBright));
  } else {
    accPieces.push(...buildSimpleFlowerPieces({ cx: 0, cy: head.cy + head.ry + 0.048, cz: 8e-3 }));
  }
  const accents = mergeList(accPieces);
  return { fur, accents };
}
function buildCrowdLieParts() {
  const furPieces = [
    tintGeo(new THREE.SphereGeometry(1, 6, 4).scale(0.205, 0.185, 0.188).translate(0, 0.195, -0.26), 16777215, furShade),
    tintGeo(new THREE.SphereGeometry(1, 6, 4).scale(0.155, 0.135, 0.22).translate(0, 0.135, 0.1), 16777215, furShade)
  ];
  const fur = mergeList(furPieces);
  const accents = mergeList(buildSimpleFlowerPieces({ cx: 0, cy: 0.25, cz: -0.49, tiltX: -Math.PI / 2 + 0.3 }));
  return { fur, accents };
}
function buildMeiqiuAvatar(height = 1.62, initialVariant = "smile") {
  const g = new THREE.Group();
  g.name = "小黑煤球儿";
  const furMat = new THREE.MeshPhysicalMaterial({
    color: MEIQIU_COLORS.fur,
    roughness: 0.94,
    metalness: 0,
    sheen: 0.72,
    sheenRoughness: 0.85,
    sheenColor: new THREE.Color(MEIQIU_COLORS.furSheen),
    vertexColors: true
  });
  const accentMat = new THREE.MeshStandardMaterial({
    vertexColors: true,
    roughness: 0.76,
    metalness: 0
  });
  const eyeMat = new THREE.MeshStandardMaterial({
    vertexColors: true,
    roughness: 0.15,
    metalness: 0.05
  });
  const hipPivotY = 0.235 * height;
  const bodyRoot = new THREE.Group();
  bodyRoot.position.set(0, hipPivotY, 0);
  g.add(bodyRoot);
  const torsoGeo = tintGeo(
    new THREE.SphereGeometry(1, 22, 16).scale(TORSO.rx * height, TORSO.ry * height, TORSO.rz * height).translate(TORSO.cx * height, TORSO.cy * height - hipPivotY, TORSO.cz * height),
    16777215,
    (x, y, z) => furShade(x / height, (y + hipPivotY) / height, z / height)
  );
  const torsoMesh = new THREE.Mesh(torsoGeo, furMat);
  torsoMesh.castShadow = true;
  torsoMesh.receiveShadow = true;
  bodyRoot.add(torsoMesh);
  const logoGeo = mergeList(buildChestLogoPieces({ detail: "high" })).scale(height, height, height).translate(0, -hipPivotY, 0);
  bodyRoot.add(new THREE.Mesh(logoGeo, accentMat));
  const bodyAccSlot = new THREE.Group();
  bodyRoot.add(bodyAccSlot);
  const headPivotY = 0.505 * height;
  const headGroup = new THREE.Group();
  headGroup.position.set(0, headPivotY - hipPivotY, 0);
  bodyRoot.add(headGroup);
  const headGeo = tintGeo(
    new THREE.SphereGeometry(1, 26, 20).scale(HEAD.rx * height, HEAD.ry * height, HEAD.rz * height).translate(HEAD.cx * height, HEAD.cy * height - headPivotY, HEAD.cz * height),
    16777215,
    (x, y, z) => furShade(x / height, (y + headPivotY) / height, z / height)
  );
  const headMesh = new THREE.Mesh(headGeo, furMat);
  headMesh.castShadow = true;
  headMesh.receiveShadow = true;
  headGroup.add(headMesh);
  const faceSlot = new THREE.Group();
  headGroup.add(faceSlot);
  const flowerPivotY = 0.862 * height;
  const flowerGroup = new THREE.Group();
  flowerGroup.position.set(0, flowerPivotY - headPivotY, 8e-3 * height);
  headGroup.add(flowerGroup);
  const legR = 0.056 * height;
  const legLen = 0.123 * height;
  const legPivotY = hipPivotY;
  const legs = [-1, 1].map((side) => {
    const pivot = new THREE.Group();
    pivot.position.set(side * 0.076 * height, legPivotY, 5e-3 * height);
    g.add(pivot);
    const geo = tintGeo(
      new THREE.CapsuleGeometry(legR, legLen, 6, 12).scale(1.04, 1, 1.15).translate(0, -(legPivotY - (legLen / 2 + legR)), 0),
      16777215,
      () => 0.92
    );
    const mesh = new THREE.Mesh(geo, furMat);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    pivot.add(mesh);
    return pivot;
  });
  const armR = 0.044 * height;
  const armLen = 0.095 * height;
  const handPropSlot = new THREE.Group();
  const arms = [-1, 1].map((side) => {
    const pivot = new THREE.Group();
    pivot.position.set(side * 0.132 * height, 0.415 * height - hipPivotY, 0.01 * height);
    bodyRoot.add(pivot);
    const geo = tintGeo(
      new THREE.CapsuleGeometry(armR, armLen, 6, 10).translate(0, -(armLen / 2 + armR * 0.65), 0).rotateZ(side * 0.34),
      16777215,
      () => 0.95
    );
    const mesh = new THREE.Mesh(geo, furMat);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    pivot.add(mesh);
    if (side === 1) pivot.add(handPropSlot);
    return pivot;
  });
  function clearSlot(slot) {
    while (slot.children.length) {
      const child = slot.children.pop();
      child.geometry?.dispose?.();
    }
  }
  let currentVariant = null;
  function setVariant(variantKey = "smile") {
    const key = variantKey in MEIQIU_VARIANTS ? variantKey : "smile";
    if (key === currentVariant) return;
    currentVariant = key;
    const cfg = MEIQIU_VARIANTS[key];
    clearSlot(faceSlot);
    clearSlot(flowerGroup);
    clearSlot(bodyAccSlot);
    clearSlot(handPropSlot);
    const eyeList = buildEyePieces({ expression: cfg.expression, detail: "high" });
    if (eyeList.length) {
      const eyeGeo = mergeList(eyeList).scale(height, height, height).translate(0, -headPivotY, 0);
      faceSlot.add(new THREE.Mesh(eyeGeo, eyeMat));
    }
    const faceAccGeo = mergeList(buildFaceAccentPieces({ expression: cfg.expression, detail: "high" })).scale(height, height, height).translate(0, -headPivotY, 0);
    faceSlot.add(new THREE.Mesh(faceAccGeo, accentMat));
    const hatGeo = mergeList(buildHatPieces({ hat: cfg.hat, detail: "high" })).scale(height, height, height).translate(0, -flowerPivotY, -8e-3 * height);
    const hatMesh = new THREE.Mesh(hatGeo, accentMat);
    hatMesh.castShadow = true;
    flowerGroup.add(hatMesh);
    if (cfg.scarf) {
      const scarfGeo = mergeList(buildBodyAccessoryPieces({ scarf: true, prop: "none", detail: "high" })).scale(height, height, height).translate(0, -hipPivotY, 0);
      bodyAccSlot.add(new THREE.Mesh(scarfGeo, accentMat));
    }
    if (cfg.prop !== "none") {
      const propGeo = mergeList(buildBodyAccessoryPieces({
        scarf: false,
        prop: cfg.prop,
        detail: "high",
        propPos: [0.072, -0.105, 0.068]
      })).scale(height, height, height);
      const propMesh = new THREE.Mesh(propGeo, accentMat);
      propMesh.castShadow = true;
      handPropSlot.add(propMesh);
    }
  }
  setVariant(initialVariant);
  g.userData = { legs, arms, headGroup, flowerGroup, bodyRoot, setVariant, variant: () => currentVariant };
  return g;
}
function buildMeiqiuStaticGeometry(height = 1.7, variantKey = "smile") {
  const cfg = MEIQIU_VARIANTS[variantKey] || MEIQIU_VARIANTS.smile;
  const furPieces = [
    tintGeo(new THREE.SphereGeometry(1, 18, 14).scale(HEAD.rx, HEAD.ry, HEAD.rz).translate(HEAD.cx, HEAD.cy, HEAD.cz), MEIQIU_COLORS.fur, furShade),
    tintGeo(new THREE.SphereGeometry(1, 14, 10).scale(TORSO.rx, TORSO.ry, TORSO.rz).translate(TORSO.cx, TORSO.cy, TORSO.cz), MEIQIU_COLORS.fur, furShade)
  ];
  for (const side of [-1, 1]) {
    furPieces.push(tintGeo(new THREE.CapsuleGeometry(0.056, 0.123, 4, 8).scale(1.04, 1, 1.15).translate(side * 0.076, 0.1175, 5e-3), MEIQIU_COLORS.fur, furShade));
    furPieces.push(tintGeo(new THREE.CapsuleGeometry(0.044, 0.095, 4, 8).rotateZ(side * 0.34).rotateX(-0.1).translate(side * 0.156, 0.362, 0.015), MEIQIU_COLORS.fur, furShade));
  }
  const all = [
    ...furPieces,
    ...buildHatPieces({ hat: cfg.hat, detail: "high" }),
    ...buildEyePieces({ expression: cfg.expression, detail: "high" }),
    ...buildFaceAccentPieces({ expression: cfg.expression, detail: "high" }),
    ...buildChestLogoPieces({ detail: "high" }),
    ...buildBodyAccessoryPieces({ scarf: cfg.scarf, prop: cfg.prop, detail: "high" })
  ];
  return mergeList(all).scale(height, height, height);
}
function buildMeiqiuShowcase(height = 1.7) {
  const group = new THREE.Group();
  group.name = "小黑煤球儿多造型展台";
  const spacing = 0.96;
  const startX = -((MEIQIU_VARIANT_KEYS.length - 1) * spacing) / 2;
  MEIQIU_VARIANT_KEYS.forEach((key, idx) => {
    const avatar = buildMeiqiuAvatar(height, key);
    avatar.name = MEIQIU_VARIANTS[key].label;
    avatar.position.set(startX + idx * spacing, 0, 0);
    avatar.rotation.y = (idx - 2.5) * -0.05;
    group.add(avatar);
  });
  return group;
}
export {
  MEIQIU_COLORS,
  MEIQIU_VARIANTS,
  MEIQIU_VARIANT_KEYS,
  buildCrowdFarParts,
  buildCrowdLieParts,
  buildCrowdNearParts,
  buildCrowdNearVariant,
  buildCrowdSitParts,
  buildMeiqiuAvatar,
  buildMeiqiuShowcase,
  buildMeiqiuStaticGeometry
};
