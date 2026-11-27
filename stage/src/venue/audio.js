import * as THREE from "three";
import { LAYOUT, siteSurfaceAt } from "../layout.js";
import { TrussKit } from "../truss.js";
import { MAT, V, box, lineArray } from "./common.js";
function mountScreenPA(g, kit, s, rotP) {
  if (!s.pa) return;
  const [tw] = s.tower;
  const { x, y, z, cabinets } = s.pa, height = s.bottom + s.h + 0.95;
  const [ax, az] = rotP(s, -tw / 2, -0.4), [bx, bz] = rotP(s, x, z);
  kit.beam(V(ax, height, az), V(bx, height, bz), 0.32);
  kit.tube(V(bx, height, bz), V(bx, y + 0.31, bz), 0.035);
  lineArray(g, x, y, z, cabinets, 0);
}
function buildLawnPA() {
  const group = new THREE.Group(), kit = new TrussKit(4474442);
  group.name = "680 草坪前沿独立音箱塔";
  const { bases, baseWidth, baseDepth, height, reach, cabinets } = LAYOUT.lawnPA;
  for (const [x, z] of bases) {
    const y = siteSurfaceAt(x, z), top = y + height, hangZ = z + reach;
    group.add(box(baseWidth, 0.18, baseDepth, MAT.deck, x, y + 0.09, z));
    kit.column(x, z, height - 0.18, 0.98, y + 0.18);
    kit.beam(V(x, top, z - 0.85), V(x, top, hangZ + 0.3), 0.32);
    group.add(box(1.36, 0.12, reach + 1.3, MAT.dark, x, top + 0.22, z + (reach - 0.55) / 2));
    const arrayTop = top - 1.05;
    for (const dx of [-0.36, 0.36]) kit.tube(V(x + dx, top + 0.16, hangZ), V(x + dx, arrayTop + 0.3, hangZ), 0.027);
    lineArray(group, x, arrayTop, hangZ, cabinets, 0, "草坪吊挂线阵");
  }
  group.add(kit.build());
  return group;
}
export {
  buildLawnPA,
  mountScreenPA
};
