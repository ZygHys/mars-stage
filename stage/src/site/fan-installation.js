// 依据：
//     下面那道方框四角各有一根竖柱落地。网就挂在下面那道方框上。按塔底宽 74 米（810 像素）、塔高 58 米换算。
//     下段收成一根长长的细管一直垂到地面，管底在地上堆成一团。
// 原来的做法（不透明的车削圆锥、亮黄色圆口、尖底悬空）和这些照片都不符，已换掉。
import * as THREE from 'three';
import { V } from '../venue/common.js';
import { TrussKit } from '../truss.js';

// 网的颜色（从上到下，t = 0 上口，1 地面）
const BANDS = [[0,0x50ad9f],[.11,0xbcd3c8],[.23,0xf0db79],[.34,0xeebd51],[.45,0xef9a85],[.67,0xdb8092],[.82,0xdf96a0],[.94,0xe5a162],[1,0xe79825]];
function bandColor(t, out) {
  let i = 0; while (i < BANDS.length - 2 && t > BANDS[i + 1][0]) i++;
  const [t0, c0] = BANDS[i], [t1, c1] = BANDS[i + 1], k = THREE.MathUtils.clamp((t - t0) / (t1 - t0), 0, 1);
  return out.set(c0).lerp(new THREE.Color(c1), k);
}

// 网眼：透明底上一格格菱形网线（alphaMap 用）
function netAlpha() {
  const c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d');
  g.fillStyle = '#141414'; g.fillRect(0, 0, 64, 64);
  g.strokeStyle = '#ffffff'; g.lineWidth = 6.5;
  g.beginPath(); g.moveTo(0, 32); g.lineTo(32, 0); g.lineTo(64, 32); g.lineTo(32, 64); g.closePath(); g.stroke();
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(160, 60); t.anisotropy = 8;
  return t;
}

// 往下收成圆管。u 绕一圈（每条边占 1/4），v 从上口到地面。
const sstepNet = s => s*s*(3-2*s);
function netGeometry(cx, cz, topY, half, rNeck, neckY, rTube) {
  const NU = 256, NV = 64, pos = [], col = [], uv = [], idx = [], c = new THREE.Color();
  // 尖与尖之间的网边往里兜得很深，所以每个尖又细又长。
  const anchors = [];
  for (let k = 0; k < 8; k++) { const a = (k * Math.PI) / 4 + Math.PI / 4, r = k % 2 ? half : half * Math.SQRT2; anchors.push([Math.cos(a) * r, Math.sin(a) * r]); }   // 偶数 = 角，奇数 = 边中点
  const SAG_IN = 0.62, SAG_DOWN = 3.0;                                  // 两个尖之间最深处离中心只剩约 0.38 倍（尖很细长）、往下垂约 3 米
  const rim = (u) => {                                                  // 上口一点：[x, z, 下垂量]
    const k = Math.min(7, Math.floor(u * 8)), t = u * 8 - k, [x0, z0] = anchors[k], [x1, z1] = anchors[(k + 1) % 8];
    const bow = Math.sin(Math.PI * t);                                  // 0 在拉点上，1 在两点正中
    const a0 = Math.atan2(z0, x0), a1u = Math.atan2(z1, x1), da = Math.atan2(Math.sin(a1u - a0), Math.cos(a1u - a0)), ang = a0 + da * t;
    const r0 = Math.hypot(x0, z0), r1 = Math.hypot(x1, z1), rr = (r0 + (r1 - r0) * t) * (1 - SAG_IN * bow ** 0.45);   // 按角度插值，离开拉点就迅速往里收
    return [Math.cos(ang) * rr, Math.sin(ang) * rr, SAG_DOWN * bow ** 0.8];
  };
  for (let j = 0; j <= NV; j++) {
    const v = j / NV;
    for (let i = 0; i <= NU; i++) {
      const u = i / NU, [bx, bz, drop] = rim(u % 1), a = Math.atan2(bz, bx);
      let x, y, z;
      if (v < 0.42) {
        const s = v / 0.42, e = 1 - (1 - s) ** 2;
        x = THREE.MathUtils.lerp(bx, Math.cos(a) * rNeck, e); z = THREE.MathUtils.lerp(bz, Math.sin(a) * rNeck, e);
        y = THREE.MathUtils.lerp(topY - drop, neckY, s);
      } else {                                                          // 下面一根直径几乎不变的管子垂到地面，管底在地上散开一点
        const s = (v - 0.42) / 0.58, r = THREE.MathUtils.lerp(rNeck, rTube, sstepNet(s)) * (1 + .85 * s ** 4);
        x = Math.cos(a) * r; z = Math.sin(a) * r; y = THREE.MathUtils.lerp(neckY, 0.15, s);
      }
      const wob = 1 + 0.025 * Math.sin(a * 5 + v * 9) * Math.min(1, v * 6);   // 网不是绷直的，略有起伏（上口拴死的地方不动）
      pos.push(cx + x * wob, y, cz + z * wob);
      bandColor(v, c).toArray(col, col.length);
      uv.push(u, v);
    }
  }
  for (let j = 0; j < NV; j++) for (let i = 0; i < NU; i++) { const p = j * (NU + 1) + i; idx.push(p, p + NU + 1, p + 1, p + 1, p + NU + 1, p + NU + 2); }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx); g.computeVertexNormals();
  return g;
}

export function buildFanInstallation(Z) {
  const fk = new TrussKit(0xeeeff0, { metal: 0.6, rough: 0.35 }), b = Z.base / 2, apex = V(Z.x, Z.height, Z.z);
  const corners = [V(Z.x - b, 0, Z.z - b), V(Z.x + b, 0, Z.z - b), V(Z.x + b, 0, Z.z + b), V(Z.x - b, 0, Z.z + b)];
  for (const c of corners) fk.beam(c, apex, 2.2, { tri: true });   // 四条主腿
  const ringUp = corners.map((c) => c.clone().lerp(apex, Z.ringAt)), ringLow = corners.map((c) => c.clone().lerp(apex, Z.netAt));
  for (let i = 0; i < 4; i++) { fk.beam(ringUp[i], ringUp[(i + 1) % 4], 1.2); fk.beam(ringLow[i], ringLow[(i + 1) % 4], 1.4); }
  for (const m of ringLow) fk.beam(V(m.x, 0, m.z), m, 1.2);
  const topY = Z.height * Z.netAt, half = b * (1 - Z.netAt);   // 四个角正好在腿和方框的交点上
  const net = new THREE.Mesh(netGeometry(Z.x, Z.z, topY, half, 4.45, 15, 3.8), new THREE.MeshStandardMaterial({
    vertexColors: true, alphaMap: netAlpha(), transparent: true, opacity: 1, depthWrite: false, side: THREE.DoubleSide, roughness: 0.85, emissive: 0xffffff, emissiveIntensity: 0.0,
  }));
  net.castShadow = false; net.userData.skipAoDepth = true; net.renderOrder = 2;
  net.userData.dynamic = true;   // 不并进静态网格（合并会丢掉顶点颜色，也会和不透明材质混在一起）
  const pad = new THREE.Mesh(new THREE.CylinderGeometry(6.85,6.85,.08,64),new THREE.MeshStandardMaterial({color:0xaa9b83,roughness:.95}));
  pad.position.set(Z.x,.08,Z.z);
  return [fk.build(), pad, net];
}
