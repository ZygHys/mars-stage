import * as THREE from "three";
import { LAYOUT } from "../layout.js";
import { TrussKit } from "../truss.js";
import { box, labeled, V } from "./common.js";
const signStyles = {
  zone: { w: 0.64, h: 0.44, ink: "#ff544a", paper: "#18171d" },
  red: { w: 0.8, h: 0.5, ink: "#fff8ed", paper: "#bf2334" },
  guide: { w: 0.88, h: 1.1, ink: "#322a55", paper: "#c6c7ea" },
  header: { w: 1.3, h: 0.38, ink: "#454750", paper: "#f4f1e7" }
};
const black = new THREE.MeshStandardMaterial({ color: 2105638, roughness: 0.76 });
const red = new THREE.MeshStandardMaterial({ color: 11348277, roughness: 0.7 });
function signFace(text, width, height, { ink, paper }) {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = Math.max(64, Math.round(canvas.width * height / width));
  const ctx = canvas.getContext("2d");
  if (paper) {
    ctx.fillStyle = paper;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }
  ctx.fillStyle = ink;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  const lines = text.split("\n");
  const font = canvas.height * (lines.length === 1 ? 0.79 : 0.31);
  ctx.font = `bold ${font}px "PingFang SC", "Noto Sans CJK SC", sans-serif`;
  for (const [i, line] of lines.entries()) {
    const y = canvas.height / 2 + (i - (lines.length - 1) / 2) * font * 1.17;
    ctx.fillText(line, canvas.width / 2, y, canvas.width * 0.93);
  }
  const map = new THREE.CanvasTexture(canvas);
  map.colorSpace = THREE.SRGBColorSpace;
  map.anisotropy = 4;
  const material = new THREE.MeshStandardMaterial({ map, roughness: 0.84, alphaTest: paper ? 0 : 0.48 });
  return new THREE.Mesh(new THREE.PlaneGeometry(width, height), material);
}
function freestandingSign(group, x, z, facing, { text, tone }) {
  const { w, h, ink, paper } = signStyles[tone];
  const sign = new THREE.Group();
  sign.position.set(x, 0, z);
  sign.rotation.y = facing;
  const bottom = tone === "guide" ? 0.16 : 1.08;
  const height = bottom + h / 2;
  const face = signFace(text.replace(" 由此去", "\n由此去"), w, h, { ink, paper });
  face.position.set(0, height, 0.027);
  sign.add(
    box(w, h, 0.045, black, 0, height, 0),
    box(0.042, bottom, 0.042, black, 0, bottom / 2, 0),
    box(w * 0.72, 0.035, 0.35, black, 0, 0.018, 0),
    face
  );
  group.add(sign);
}
function publicGate({ name, x, z, w, rot, face, bays }) {
  const group = labeled(new THREE.Group(), name);
  group.name = name;
  group.position.set(x, 0, z);
  group.rotation.y = -THREE.MathUtils.degToRad(rot);
  const bayWidth = w / bays.length;
  const beamHeight = 2.22;
  group.add(box(w + 0.22, 0.25, 0.25, red, 0, beamHeight + 0.125, 0));
  for (let i = 0; i <= bays.length; i++) {
    const u = i * bayWidth - w / 2;
    group.add(box(0.22, beamHeight, 0.23, red, u, beamHeight / 2, 0));
  }
  for (const [i, text] of bays.entries()) {
    const heading = signFace(text, 1.72, 0.5, { ink: "#fff2ed" });
    heading.position.set((i + 0.5) * bayWidth - w / 2, beamHeight + 0.31, face * 0.131);
    heading.rotation.y = face < 0 ? Math.PI : 0;
    group.add(heading);
  }
  return group;
}
function divisionGate({ name, x, z, truss, signs }) {
  const group = labeled(new THREE.Group(), name);
  group.name = name;
  const side = Math.sign(x);
  const facing = side * Math.PI / 2;
  group.position.set(x, 0, z);
  if (truss) {
    const kit = new TrussKit(2237226);
    const half = truss.span / 2;
    const depth = truss.back || 0;
    const addRow = (offset) => {
      kit.column(offset, -half, truss.height, 0.34);
      kit.column(offset, half, truss.height, 0.34);
      kit.beam(V(offset, truss.height, -half), V(offset, truss.height, half), 0.36);
    };
    const front = side * 0.65;
    const back = front - side * depth;
    addRow(front);
    if (depth) {
      addRow(back);
      for (const end of [-half, half]) kit.beam(V(front, truss.height, end), V(back, truss.height, end), 0.34);
    }
    group.add(box(0.17, 1.13, truss.span * 0.69, black, back, truss.height - 0.71, 0));
    if (truss.header) {
      const { w, h, ink, paper } = signStyles.header;
      const face = signFace("入口", w, h, { ink, paper });
      face.position.set(front + side * 0.2, truss.height - 0.02, 0);
      face.rotation.y = facing;
      group.add(face);
    }
    group.add(kit.build());
  }
  for (const sign of signs) freestandingSign(group, side * 0.26, sign.z, facing, sign);
  return group;
}
function buildAccessGates() {
  const stop = new THREE.Group();
  stop.name = "B 侧走道 · 惊喜集合点";
  const [x, , , z1] = LAYOUT.bAisleStop;
  stop.position.set(x + 0.24, 0, z1 - 0.16);
  freestandingSign(stop, 0, 0, Math.PI / 2, { text: "惊喜集合点", tone: "red" });
  return [...LAYOUT.site.publicGates.map(publicGate), ...Object.values(LAYOUT.access).map(divisionGate), stop];
}
export {
  buildAccessGates
};
