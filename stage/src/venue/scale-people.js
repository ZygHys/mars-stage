import * as THREE from "three";
import { LAYOUT } from "../layout.js";
import { registerControl } from "./common.js";
import { buildMeiqiuStaticGeometry, MEIQIU_VARIANT_KEYS } from "../meiqiu.js";
const HEIGHT = 1.7;
function buildScalePeople() {
  const group = new THREE.Group();
  group.name = "1.70 米小黑煤球儿比例参照";
  const material = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.9, metalness: 0 });
  const buckets =  new Map();
  LAYOUT.scalePeople.forEach((pos, i) => {
    const key = MEIQIU_VARIANT_KEYS[i % MEIQIU_VARIANT_KEYS.length];
    if (!buckets.has(key)) buckets.set(key, []);
    buckets.get(key).push([pos, i]);
  });
  const pose = new THREE.Matrix4();
  for (const [key, list] of buckets) {
    const geometry = buildMeiqiuStaticGeometry(HEIGHT, key);
    const mesh = new THREE.InstancedMesh(geometry, material, list.length);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    list.forEach(([[x, z], idx], i) => {
      pose.makeRotationY(Math.PI + (idx % 3 - 1) * 0.45).setPosition(x, 0.08, z);
      mesh.setMatrixAt(i, pose);
    });
    mesh.computeBoundingSphere();
    group.add(mesh);
  }
  registerControl({
    key: "scalePeople",
    label: "人物比例尺",
    options: { on: "显示 1.70 米", off: "隐藏" },
    value: "on",
    set(value) {
      group.visible = value === "on";
    }
  });
  return group;
}
export {
  buildScalePeople
};
