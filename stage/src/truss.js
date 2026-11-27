import * as THREE from "three";
const Y = new THREE.Vector3(0, 1, 0);
const tmpQ = new THREE.Quaternion(), tmpS = new THREE.Vector3(), tmpP = new THREE.Vector3(), tmpD = new THREE.Vector3();
class TrussKit {
  constructor(color = 2763567, { metal = 0.75, rough = 0.42 } = {}) {
    this.color = color;
    this.metal = metal;
    this.rough = rough;
    this.tubes = [];
    this.plates = [];
  }
  tube(a, b, r) {
    this.tubes.push([a.x, a.y, a.z, b.x, b.y, b.z, r]);
  }
  beam(a, b, s = 0.5, { chord = 0.028 * (s / 0.5) ** 0.5, diag = 0.016 * (s / 0.5) ** 0.5, tri = false } = {}) {
    const dir = tmpD.copy(b).sub(a);
    const len = dir.length();
    dir.normalize();
    const ref = Math.abs(dir.y) > 0.95 ? new THREE.Vector3(1, 0, 0) : Y;
    const u = new THREE.Vector3().crossVectors(dir, ref).normalize();
    const v = new THREE.Vector3().crossVectors(dir, u).normalize();
    const h = s / 2;
    const offs = tri ? [0, 1, 2].map((i) => {
      const t = i / 3 * Math.PI * 2;
      return u.clone().multiplyScalar(Math.cos(t) * h * 1.15).add(v.clone().multiplyScalar(Math.sin(t) * h * 1.15));
    }) : [[1, 1], [-1, 1], [-1, -1], [1, -1]].map(([p, q]) => u.clone().multiplyScalar(p * h).add(v.clone().multiplyScalar(q * h)));
    const n = Math.max(1, Math.round(len / s));
    const P = (k, c) => a.clone().addScaledVector(dir, len * k / n).add(offs[c]);
    for (let c = 0; c < offs.length; c++) this.tube(P(0, c), P(n, c), chord);
    for (let c = 0; c < offs.length; c++) {
      const c2 = (c + 1) % offs.length;
      for (let k = 0; k < n; k++) {
        const even = k % 2 === 0;
        this.tube(P(k, even ? c : c2), P(k + 1, even ? c2 : c), diag);
        this.tube(P(k, c), P(k, c2), diag * 0.9);
      }
      this.tube(P(n, c), P(n, c2), diag * 0.9);
    }
  }
  column(x, z, h, s = 0.6, y0 = 0) {
    this.beam(new THREE.Vector3(x, y0, z), new THREE.Vector3(x, y0 + h, z), s);
    this.plates.push([x, y0 + 0.05, z, s * 1.8, 0.1, s * 1.8]);
  }
  frame(cx, cz, w, d, h, s = 0.4, rotY = 0) {
    const c = Math.cos(rotY), sn = Math.sin(rotY);
    const p = (x, y, z) => new THREE.Vector3(cx + x * c + z * sn, y, cz - x * sn + z * c);
    const corners = [[-w / 2, -d / 2], [w / 2, -d / 2], [w / 2, d / 2], [-w / 2, d / 2]];
    for (const [x, z] of corners) {
      const q = p(x, 0, z);
      this.column(q.x, q.z, h, s);
    }
    for (let i = 0; i < 4; i++) {
      const [x0, z0] = corners[i], [x1, z1] = corners[(i + 1) % 4];
      this.beam(p(x0, h, z0), p(x1, h, z1), s);
    }
  }
  build() {
    const g = new THREE.Group();
    const mat = new THREE.MeshStandardMaterial({ color: this.color, metalness: this.metal, roughness: this.rough });
    if (this.tubes.length) {
      const geo = new THREE.CylinderGeometry(1, 1, 1, 6, 1, true);
      const mesh = new THREE.InstancedMesh(geo, mat, this.tubes.length);
      const m = new THREE.Matrix4();
      this.tubes.forEach(([x0, y0, z0, x1, y1, z1, r], i) => {
        tmpD.set(x1 - x0, y1 - y0, z1 - z0);
        const len = tmpD.length();
        tmpQ.setFromUnitVectors(Y, tmpD.normalize());
        tmpP.set((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2);
        tmpS.set(r, len, r);
        m.compose(tmpP, tmpQ, tmpS);
        mesh.setMatrixAt(i, m);
      });
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      mesh.computeBoundingSphere();
      g.add(mesh);
    }
    if (this.plates.length) {
      const mesh = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), mat, this.plates.length);
      const m = new THREE.Matrix4();
      this.plates.forEach(([x, y, z, sx, sy, sz], i) => {
        m.compose(tmpP.set(x, y, z), tmpQ.identity(), tmpS.set(sx, sy, sz));
        mesh.setMatrixAt(i, m);
      });
      mesh.castShadow = true;
      g.add(mesh);
    }
    return g;
  }
}
export {
  TrussKit
};
