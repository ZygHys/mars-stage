import * as THREE from "three";
import { LAYOUT } from "../layout.js";
import * as TX from "../textures.js";
import { TrussKit } from "../truss.js";
import { MAT, V, box, labeled, movingHead, registerVideoScreen, screenTopSpots } from "./common.js";
import { mountScreenPA } from "./audio.js";
let feedSeed = 1;
function screenFace(g, s, y, back = false, group = "side") {
  const tex = TX.liveFeedTexture(feedSeed++, 290 + feedSeed % 3 * 15);
  const mat = new THREE.MeshStandardMaterial({ map: tex, emissiveMap: tex, emissive: 16777215, emissiveIntensity: 0.85 });
  const scr = new THREE.Mesh(new THREE.PlaneGeometry(s.w, s.h), mat);
  scr.position.set(0, y, 0.32);
  g.add(scr);
  registerVideoScreen(scr, { group, name: s.name, w: s.w, h: s.h });
  if (back) {
    const b = new THREE.Mesh(new THREE.PlaneGeometry(s.w, s.h), mat);
    b.rotation.y = Math.PI;
    b.position.set(0, y, -0.32);
    g.add(b);
    registerVideoScreen(b, { group, name: s.name + "（背面）", w: s.w, h: s.h });
  }
  g.add(box(s.w + 0.3, s.h + 0.3, 0.6, MAT.speaker, 0, y, 0));
}
function buildScreens({ mountPA = mountScreenPA } = {}) {
  const kit = new TrussKit(2763567), out = [];
  const rotP = (s, x, z) => {
    const c = Math.cos(s.rot || 0), sn = Math.sin(s.rot || 0);
    return [s.x + x * c + z * sn, s.z - x * sn + z * c];
  };
  for (const s of LAYOUT.imagTowers) {
    const g = new THREE.Group();
    g.position.set(s.x, 0, s.z);
    g.rotation.y = s.rot || 0;
    const [tw, td, th] = s.tower;
    screenFace(g, s, s.bottom + s.h / 2, false, "imag");
    g.children.forEach((o) => {
      o.position.z += 0.2;
    });
    const nx = Math.round(tw / 2.2), nz = Math.round(td / 2.2), bay = 2;
    const SP = (i, j, y) => {
      const [px, pz] = rotP(s, -tw / 2 + tw * i / nx, -0.4 - td * j / nz);
      return V(px, y, pz);
    };
    const edge = (i, j) => i === 0 || j === 0 || i === nx || j === nz;
    for (let i = 0; i <= nx; i++) for (let j = 0; j <= nz; j++) if (edge(i, j)) kit.tube(SP(i, j, 0), SP(i, j, th), 0.05);
    for (let y = bay; y <= th + 0.01; y += bay) {
      for (let i = 0; i < nx; i++) {
        kit.tube(SP(i, 0, y), SP(i + 1, 0, y), 0.04);
        kit.tube(SP(i, nz, y), SP(i + 1, nz, y), 0.04);
      }
      for (let j = 0; j < nz; j++) {
        kit.tube(SP(0, j, y), SP(0, j + 1, y), 0.04);
        kit.tube(SP(nx, j, y), SP(nx, j + 1, y), 0.04);
      }
    }
    for (let y = 0; y < th - 0.01; y += bay) {
      for (let i = y / bay % 2; i < nx; i += 2) kit.tube(SP(i, nz, y), SP(i + 1, nz, y + bay), 0.035);
      for (let j = y / bay % 2; j < nz; j += 2) {
        kit.tube(SP(0, j, y), SP(0, j + 1, y + bay), 0.035);
        kit.tube(SP(nx, j, y), SP(nx, j + 1, y + bay), 0.035);
      }
    }
    for (let j = 0; j <= nz; j++) kit.tube(SP(0, j, th), SP(nx, j, th), 0.06);
    mountPA(g, kit, s, rotP);
    for (let x = -tw / 2 + 0.8; x <= tw / 2 - 0.8; x += 1.6) {
      const [hx, hz] = rotP(s, x, 0.3);
      movingHead(hx, th - 0.35, hz);
      screenTopSpots.push([hx, th - 0.25, hz, 2.2]);
    }
    out.push(labeled(g, s.name));
  }
  const groupOf = (s) => LAYOUT.sideScreens.includes(s) ? "side" : LAYOUT.delayScreens.includes(s) ? "delay" : "lawn";
  for (const s of [...LAYOUT.sideScreens, ...LAYOUT.delayScreens, ...LAYOUT.lawnScreens]) {
    const g = new THREE.Group();
    g.position.set(s.x, 0, s.z);
    g.rotation.y = s.rot || 0;
    screenFace(g, s, s.bottom + s.h / 2, s.twoSided, groupOf(s));
    const top = s.bottom + s.h + 1;
    for (const sx of [-1, 1]) {
      const [cx, cz] = rotP(s, sx * (s.w / 2 + 0.6), 0);
      kit.column(cx, cz, top, 0.5);
    }
    const [ax, az] = rotP(s, -s.w / 2 - 0.6, 0), [bx, bz] = rotP(s, s.w / 2 + 0.6, 0);
    kit.beam(V(ax, top, az), V(bx, top, bz), 0.5);
    for (let x = -s.w / 2; x <= s.w / 2 + 0.01; x += s.w / 6) {
      const [hx, hz] = rotP(s, x, 0.45);
      movingHead(hx, top - 0.3, hz);
      if (groupOf(s) === "side") screenTopSpots.push([hx, top - 0.2, hz, 2]);
    }
    g.add(box(s.w, s.bottom, 0.3, MAT.stageSkirt, 0, s.bottom / 2, 0));
    out.push(labeled(g, s.name));
  }
  out.push(kit.build());
  return out;
}
export {
  buildScreens
};
