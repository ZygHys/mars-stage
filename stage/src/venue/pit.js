// 区域 C 入口。各组件单独建模，共用 layout/pit.js 的场地坐标。
import * as THREE from 'three';
import { LAYOUT } from '../layout.js';
import { V, labeled } from './common.js';

export { buildBridges, bridgeHeight, onExtensionBridge, setBridgeTargetHeight } from './extension-stage.js';
export { buildCylinder } from './control-tower.js';
export { buildScreens } from './screens.js';
export { buildLawnPA } from './audio.js';
export { buildHourglass } from './hourglass.js';
export { buildBarriers } from './barriers.js';

export function buildZoneLabels() {
  return LAYOUT.zones.map((zn) => {
    const ln = new THREE.Line(new THREE.BufferGeometry().setFromPoints([V(zn.x, 0, zn.z), V(zn.x, 0.01, zn.z)]), new THREE.LineBasicMaterial({ transparent: true, opacity: 0 }));
    return labeled(ln, zn.name);
  });
}
