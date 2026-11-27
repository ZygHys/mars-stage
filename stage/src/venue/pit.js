import * as THREE from "three";
import { LAYOUT } from "../layout.js";
import { V, labeled } from "./common.js";
import { buildBridges, bridgeHeight, onExtensionBridge, setBridgeTargetHeight } from "./extension-stage.js";
import { buildCylinder } from "./control-tower.js";
import { buildScreens } from "./screens.js";
import { buildLawnPA } from "./audio.js";
import { buildHourglass } from "./hourglass.js";
import { buildBarriers } from "./barriers.js";
function buildZoneLabels() {
  return LAYOUT.zones.map((zn) => {
    const ln = new THREE.Line(new THREE.BufferGeometry().setFromPoints([V(zn.x, 0, zn.z), V(zn.x, 0.01, zn.z)]), new THREE.LineBasicMaterial({ transparent: true, opacity: 0 }));
    return labeled(ln, zn.name);
  });
}
export {
  bridgeHeight,
  buildBarriers,
  buildBridges,
  buildCylinder,
  buildHourglass,
  buildLawnPA,
  buildScreens,
  buildZoneLabels,
  onExtensionBridge,
  setBridgeTargetHeight
};
