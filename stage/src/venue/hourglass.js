import * as THREE from "three";
import { LAYOUT } from "../layout.js";
import { TrussKit } from "../truss.js";
import { MAT, V, labeled, movingHead, animate, registerControl, glowSpots, hgTopSpots } from "./common.js";
const stripModes = {
  show: "演出中：全肋常亮 + 白色闪点",
  chase: "逐节点亮",
  bands: "双白色亮带",
  test: "多色试灯",
  all: "全亮检查",
  off: "关闭灯带",
  zebra: "黑白水墨斑马波浪纹",
  inkWhite: "冰白/白金水墨实心",
  amberBars: "暖橙暗场横条纹"
};
const testColors = ["#ff0629", "#ffc31a", "#09e942", "#0cd8ec", "#2734ee", "#a80df6", "#fa0633", "#ffe336", "#21f250"];
function buildHourglass() {
  const H = LAYOUT.hourglass, out = [];
  const kit = new TrussKit(2829617, { metal: 0.8, rough: 0.35 }), gk = new TrussKit(2039844);
  const ribBase = 0.08, ribHeight = H.height - ribBase;
  const waistHeight = H.waistAt * ribHeight;
  const baseFlare = H.rBottom - H.rWaist;
  const arcRadius = (waistHeight ** 2 + baseFlare ** 2) / (2 * baseFlare);
  function ribRadius(t) {
    if (t < H.waistAt) {
      const drop = (H.waistAt - t) * ribHeight;
      return H.rWaist + drop ** 2 / (arcRadius + Math.sqrt(arcRadius ** 2 - drop ** 2));
    }
    const rise = (t - H.waistAt) / (1 - H.waistAt);
    const eased = 0.5 - 0.5 * Math.cos(Math.PI * rise);
    return H.rWaist + (H.rTop - H.rWaist) * (rise ** 2 * 0.6 + eased * 0.4);
  }
  const S = H.strip, stripCount = H.list.length * H.ribs * S.segments;
  const stripGeo = new THREE.BoxGeometry(S.width, 1, S.depth);
  const cells = new THREE.InstancedBufferAttribute(new Float32Array(stripCount * 3), 3);
  stripGeo.setAttribute("stripCell", cells);
  const lightPattern = { value: 0 }, lightTime = { value: 0 };
  MAT.hgLed.onBeforeCompile = (shader) => {
    shader.uniforms.stripPattern = lightPattern;
    shader.uniforms.stripTime = lightTime;
    shader.uniforms.stripEnd = { value: S.segments - 1 };
    shader.uniforms.stripTestColors = { value: testColors.map((color) => new THREE.Color(color)) };
    shader.vertexShader = shader.vertexShader.replace("#include <common>", "#include <common>\nattribute vec3 stripCell;\nvarying vec3 vStripCell;").replace("#include <begin_vertex>", "#include <begin_vertex>\nvStripCell = stripCell;");
    shader.fragmentShader = shader.fragmentShader.replace("#include <common>", `#include <common>
        varying vec3 vStripCell;
        uniform int stripPattern;
        uniform float stripTime, stripEnd;
        uniform vec3 stripTestColors[9];`).replace("#include <color_fragment>", `#include <color_fragment>
        if (stripPattern == 3) diffuseColor.rgb *= 0.18;`).replace("#include <emissivemap_fragment>", `#include <emissivemap_fragment>
        float section = floor(vStripCell.x + 0.5);
        float rib = floor(vStripCell.y + 0.5);
        float tower = floor(vStripCell.z + 0.5);
        if (stripPattern == 0) {
          float tick = floor(stripTime * 2.5 + fract(sin(rib * 12.9898 + tower * 78.233) * 437.585) * 7.0);
          float sparkle = step(0.955, fract(sin(dot(vec3(section, rib, tower) + tick * vec3(0.37, 1.13, 2.71), vec3(12.9898, 78.233, 37.719))) * 43758.5453));
          vec3 safeRad = max(totalEmissiveRadiance, vec3(0.0));
          vec3 hue = safeRad / max(max(safeRad.r, max(safeRad.g, safeRad.b)), 1e-3);
          hue = pow(max(hue, vec3(1e-4)), vec3(1.8));
          totalEmissiveRadiance = hue * 0.85 * step(0.05, length(safeRad)) + vec3(1.0, 0.97, 1.0) * 2.4 * sparkle * step(0.05, length(safeRad));
        } else if (stripPattern == 2) {
          float drift = 1.35 * sin(stripTime * 0.75 + tower * 0.32 + rib * 0.08);
          float nearest = min(abs(section - stripEnd * 0.28 - drift), abs(section - stripEnd * 0.68 - drift));
          totalEmissiveRadiance = vec3(0.89, 0.86, 1.0) * 2.8 * (1.0 - smoothstep(1.5, 2.7, nearest));
        } else if (stripPattern == 3) {
          int band = min(8, int(floor(section * 9.0 / (stripEnd + 0.68))));
          totalEmissiveRadiance = stripTestColors[band] * 1.15;
        } else if (stripPattern == 4) {
          totalEmissiveRadiance = vec3(0.88, 0.94, 1.0) * 1.6;
        } else if (stripPattern == 5) {
          totalEmissiveRadiance = vec3(0.0);
        } else if (stripPattern == 6) {
          float u = rib * 0.42 + tower * 1.1;
          float v = section / max(stripEnd, 1.0) * 7.5;
          float w1 = sin(u * 1.6 + v * 1.9 + stripTime * 2.2) + 0.55 * cos(u * 2.7 - v * 1.4 - stripTime * 1.6);
          float band = smoothstep(-0.12, 0.22, w1);
          vec3 tint = max(totalEmissiveRadiance, vec3(0.0));
          float lum = max(max(tint.r, max(tint.g, tint.b)), 1e-3);
          vec3 baseCol = mix(vec3(0.92, 0.96, 1.0), tint / lum, 0.22);
          totalEmissiveRadiance = baseCol * (0.06 + 1.95 * band);
        } else if (stripPattern == 7) {
          float ink = sin(rib * 0.9 + section * 0.45 + tower * 1.7 + stripTime * 0.8) * cos(rib * 0.5 - section * 0.35);
          float mask = smoothstep(-0.72, -0.35, ink);
          vec3 tint = max(totalEmissiveRadiance, vec3(0.0));
          float lum = max(max(tint.r, max(tint.g, tint.b)), 1e-3);
          vec3 col = mix(vec3(0.94, 0.97, 1.0), tint / lum, 0.35);
          totalEmissiveRadiance = col * (0.18 + 1.85 * mask);
        } else if (stripPattern == 8) {
          float stripe = step(0.45, fract(section * 0.32 + stripTime * 0.25));
          totalEmissiveRadiance = vec3(1.0, 0.34, 0.08) * (0.12 + 0.48 * stripe);
        } else {
          float phase = mod(floor(stripTime * 10.0) + tower * 3.0 + floor(rib / 4.0), 2.0 * stripEnd);
          float lit = stripEnd - abs(stripEnd - phase);
          totalEmissiveRadiance *= max(0.0, 1.0 - abs(section - lit) / 3.0);
        }`);
  };
  const strips = new THREE.InstancedMesh(stripGeo, MAT.hgLed, stripCount);
  strips.name = "沙漏塔分段灯带";
  const matrix = new THREE.Matrix4(), tangent = V(0, 0, 0), normal = V(0, 0, 0), center = V(0, 0, 0), scale = V(1, 1, 1);
  let stripIndex = 0;
  for (const [tower, p] of H.list.entries()) {
    const g = new THREE.Group();
    g.position.set(p.x, 0, p.z);
    const P = (a, t) => {
      const r = ribRadius(t);
      return V(p.x + Math.cos(a) * r, ribBase + t * ribHeight, p.z + Math.sin(a) * r);
    };
    for (let i = 0; i < H.ribs; i++) {
      const a = i / H.ribs * Math.PI * 2, lateral = V(Math.sin(a), 0, -Math.cos(a));
      let start = P(a, 0);
      for (let k = 0; k < S.segments; k++) {
        const end = P(a, (k + 1) / S.segments);
        kit.tube(start, end, 0.055);
        tangent.subVectors(end, start);
        const length = tangent.length();
        tangent.divideScalar(length);
        normal.crossVectors(lateral, tangent);
        center.copy(start).lerp(end, 0.5).addScaledVector(normal, 0.057 + S.depth / 2);
        matrix.makeBasis(lateral, tangent, normal).scale(scale.set(1, length - S.gap, 1)).setPosition(center);
        cells.setXYZ(stripIndex, k, i, tower);
        strips.setMatrixAt(stripIndex++, matrix);
        start = end;
      }
    }
    const nh = Math.round(H.height / H.hoopEvery);
    for (let j = 1; j <= nh; j++) {
      const t = j / nh;
      for (let i = 0; i < H.ribs; i++) kit.tube(P(i / H.ribs * Math.PI * 2, t), P((i + 1) / H.ribs * Math.PI * 2, t), j === nh ? 0.09 : 0.03);
    }
    const rim = new THREE.Mesh(new THREE.TorusGeometry(H.rTop, 0.22, 6, 48), MAT.dark);
    rim.rotation.x = Math.PI / 2;
    rim.position.y = H.height + 0.15;
    g.add(rim);
    for (let i = 0; i < 12; i++) {
      const a = i / 12 * Math.PI * 2;
      const lx = p.x + Math.cos(a) * (H.rTop - 0.4), lz = p.z + Math.sin(a) * (H.rTop - 0.4);
      movingHead(lx, H.height + 0.35, lz, false);
      if (i % 2 === 0) hgTopSpots.push([lx, H.height + 0.65, lz, 2.6]);
    }
    const s = H.gantry / 2, gh = H.height + 3, side = Math.sign(p.x);
    for (const [sx, sz] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) gk.column(p.x + sx * s, p.z + sz * s, gh, 0.6);
    for (const sz of [-1, 1]) gk.beam(V(p.x - s, gh, p.z + sz * s), V(p.x + s, gh, p.z + sz * s), 0.6);
    for (const sx of [-1, 1]) gk.beam(V(p.x + sx * s, gh, p.z - s), V(p.x + sx * s, gh, p.z + s), 0.6);
    const innerX = p.x - side * s;
    for (const sz of [-1, 1]) {
      const hasNeighbor = H.list.some((other) => other.x === p.x && (other.z - p.z) * sz > 0);
      if (!hasNeighbor && sz < 0) continue;
      const postZ = p.z + sz * s, lampZ = postZ + sz * 0.63;
      const posts = hasNeighbor ? [innerX, p.x + side * s] : [innerX];
      for (const px of posts) for (let y = 2.2; y < gh - 0.7; y += 1.85) {
        gk.tube(V(px, y, postZ), V(px, y, lampZ), 0.042);
        movingHead(px, y, lampZ);
        glowSpots.push([px, y - 0.45, lampZ, 1.3]);
      }
      if (hasNeighbor) for (const offset of [0.9, 2.5, 4.1]) movingHead(innerX + side * offset, gh - 0.35, postZ);
    }
    out.push(labeled(g, "沙漏塔"));
  }
  strips.computeBoundingSphere();
  out.push(kit.build(), gk.build(), strips);
  registerControl({
    key: "hourglassLights",
    label: "沙漏塔灯带",
    options: stripModes,
    value: "show",
    set(value) {
      lightPattern.value = Object.keys(stripModes).indexOf(value);
    }
  });
  animate((dt, time) => {
    lightTime.value = time;
  });
  return out;
}
export {
  buildHourglass
};
