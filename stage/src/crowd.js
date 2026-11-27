import * as THREE from "three";
import { LAYOUT, lawnBlocks } from "./layout.js";
import { registerControl } from "./venue/common.js";
import { buildCrowdNearVariant, buildCrowdFarParts, buildCrowdSitParts, buildCrowdLieParts } from "./meiqiu.js";
const rng = (seed) => {
  let s = seed >>> 0;
  return () => (s = s * 1664525 + 1013904223 >>> 0) / 4294967296;
};
const pick = (r, table) => {
  let t = r() * table.reduce((a, [, w]) => a + w, 0);
  for (const [v, w] of table) if ((t -= w) <= 0) return v;
  return table[0][0];
};
const FUR_TONES = [[5922408, 34], [6646389, 26], [5132891, 22], [7370112, 11], [4474962, 7]];
const NEAR_VARIANT_TABLE = [
  ["smile", 28],
  ["cry", 20],
  ["happy", 16],
  ["catHood", 14],
  ["flowerHood", 12],
  ["redCap", 10]
];
const SIT_VARIANT_TABLE = [
  ["smile", 36],
  ["cry", 26],
  ["catHood", 20],
  ["flowerHood", 18]
];
const MATS = [[15987180, 36], [15181748, 18], [7315408, 14], [15322986, 10], [12107972, 12], [13193279, 10]];
const segDist = (x, z, [x0, z0, x1, z1]) => {
  const dx = x1 - x0, dz = z1 - z0, t = Math.max(0, Math.min(1, ((x - x0) * dx + (z - z0) * dz) / (dx * dx + dz * dz || 1)));
  return Math.hypot(x - x0 - t * dx, z - z0 - t * dz);
};
const lerp = (a, b, t) => a + (b - a) * Math.max(0, Math.min(1, t));
const hash2 = (i, j) => {
  const v = Math.sin(i * 127.1 + j * 311.7) * 43758.5453;
  return v - Math.floor(v);
};
const noise2 = (x, z) => {
  const i = Math.floor(x), j = Math.floor(z), fx = x - i, fz = z - j, u = fx * fx * (3 - 2 * fx), v = fz * fz * (3 - 2 * fz);
  return (hash2(i, j) * (1 - u) + hash2(i + 1, j) * u) * (1 - v) + (hash2(i, j + 1) * (1 - u) + hash2(i + 1, j + 1) * u) * v;
};
function areas() {
  const L = LAYOUT, I = 15.6;
  const runs = [L.innerBoundaryRuns, L.outerBoundaryRuns, L.sideBoundaryRuns, L.abBoundaryRuns, L.stageAisleRuns, L.circleBarrierRuns, L.stageBarriers].flat().filter(Boolean);
  const nearRun = (x, z) => runs.some((r) => segDist(x, z, r) < 0.55);
  const hg = L.hourglass.list, gHalf = L.hourglass.gantry / 2 + 0.6;
  const lift = L.lifts;
  const halfW1280 = (z, side) => side < 0 ? z < -21 ? lerp(85, 98.3, (z + 27) / 6) : z < 20 ? 98.3 : z < 28.3 ? lerp(98.3, 103, (z - 20) / 8.3) : lerp(103, 107, (z - 28.3) / 11.2) : z < -21 ? lerp(85, 98.3, (z + 27) / 6) : z < 28.3 ? 98.3 : lerp(98.3, 96, (z - 28.3) / 11.2);
  const in1280 = (x, z) => {
    if (z < -26.4 || z > 38.9) return false;
    if (Math.abs(x) > halfW1280(z, Math.sign(x) || 1) - 0.7) return false;
    if (z < -14.5 && Math.abs(x) < 8.7) return false;
    if (Math.abs(x) < I && Math.abs(z) < I) return false;
    if (Math.abs(x) > 14 && Math.abs(x) < lift.spans[1][1] + 0.6 && Math.abs(z - lift.z) < lift.w / 2 + 0.7) return false;
    if (z > 14.5 && Math.abs(x) < 2.3) return false;
    if (z > 32 && Math.abs(x) < 12.6) return false;
    if (hg.some((p) => Math.abs(x - p.x) < gHalf && Math.abs(z - p.z) < gHalf)) return false;
    return !nearRun(x, z);
  };
  const in980 = (x, z) => {
    if (z < 42.9 || z > 56) return false;
    if (Math.abs(x) < 12.6) return false;
    if (x < 0 ? x < (z < 52.4 ? -106.4 : lerp(-106.4, -98, (z - 52.4) / 5.6)) : x > (z < 53.3 ? 95.4 : lerp(95.4, 88, (z - 53.3) / 3.2))) return false;
    return !nearRun(x, z);
  };
  const blocks = lawnBlocks();
  const screens = [...L.lawnScreens || [], ...L.delayScreens || []];
  const inQuad = (x, z, q) => {
    let ins = false;
    for (let i = 0, j = q.length - 1; i < q.length; j = i++) {
      const [xi, zi] = q[i], [xj, zj] = q[j];
      if (zi > z !== zj > z && x < (xj - xi) * (z - zi) / (zj - zi) + xi) ins = !ins;
    }
    return ins;
  };
  const edgeDist = (x, z, q) => Math.min(...q.map((p, i) => segDist(x, z, [...p, ...q[(i + 1) % q.length]])));
  const inLawn = (x, z) => blocks.some((q) => inQuad(x, z, q) && edgeDist(x, z, q) > 0.4) && !screens.some((s) => Math.hypot(x - s.x, z - s.z) < s.w / 2 + 1.5);
  let bbox = [Infinity, Infinity, -Infinity, -Infinity];
  for (const q of blocks) for (const [x, z] of q) bbox = [Math.min(bbox[0], x), Math.min(bbox[1], z), Math.max(bbox[2], x), Math.max(bbox[3], z)];
  const ss = (a, b, x) => {
    const t = Math.max(0, Math.min(1, (x - a) / (b - a)));
    return t * t * (3 - 2 * t);
  };
  const behindGantry = (x, z) => hg.reduce((m, p) => Math.max(m, z > p.z && z - p.z < 26 && Math.abs(x - p.x) < 6 + (z - p.z) * 0.15 ? 1 - ss(14, 26, z - p.z) : 0), 0);
  const lawnCx = (bbox[0] + bbox[2]) / 2;
  const tower = L.cylinder, stage = L.mainStage, radius = tower.outer.radius;
  const blockedByTower = (x, z) => {
    const distance = z - tower.z;
    if (distance <= 0) return 0;
    const t = distance / (z - stage.z1);
    const left = x + (stage.x0 - x) * t, right = x + (stage.x1 - x) * t;
    const overlap = Math.max(0, Math.min(right, tower.x + radius) - Math.max(left, tower.x - radius));
    return overlap / (right - left) * (1 - ss(radius + 14, radius + 55, distance));
  };
  return [
    {
      name: "1280",
      box: [-108, -27, 108, 39.5],
      density: 2.2,
      test: in1280,
      mats: 0,
      sideFill: (x, z) => lerp(0.4, 1, ss(10, 24, x + halfW1280(z, -1))),
      view: (x, z) => (1 - 0.6 * ss(50, 98, Math.abs(x))) * (1 - 0.3 * ss(12, 39, z)) * (1 - 0.55 * behindGantry(x, z))
    },
    {
      name: "980",
      box: [-108, 42.3, 97, 56.5],
      density: 2,
      test: in980,
      mats: 0,
      view: (x) => 1 - 0.6 * ss(42, 100, Math.abs(x))
    },
    {
      name: "680",
      box: bbox,
      density: 1.2,
      test: inLawn,
      mats: 0.45,
      view: (x, z) => (1 - 0.68 * ss(78, 205, z)) * (1 - 0.45 * ss(55, 118, Math.abs(x - lawnCx))) * (1 - 0.43 * blockedByTower(x, z))
    }
  ];
}
function hideMaterial(mat, uLod, { near = true, lod = false, shrink = 0 } = {}) {
  mat.onBeforeCompile = (shader) => {
    if (lod) shader.uniforms.uLod = uLod;
    shader.vertexShader = shader.vertexShader.replace("#include <common>", "#include <common>" + (lod ? "\nuniform vec4 uLod;" : "")).replace("#include <begin_vertex>", `#include <begin_vertex>
        #ifdef USE_INSTANCING
          vec3 crowdBase = (modelMatrix * instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0)).xyz;
          ${near ? "if (distance(crowdBase + vec3(0.0, 0.85, 0.0), cameraPosition) < 2.4) transformed *= 0.0;" : ""}
          ${lod ? "if (distance(crowdBase, uLod.xyz) < uLod.w) transformed *= 0.0;" : ""}
        #endif
        ${shrink ? `transformed.xz *= ${(1 - shrink).toFixed(3)};` : ""}`);
  };
  mat.customProgramCacheKey = () => `crowd-mq2-${near}-${lod}-${shrink}-${mat.type}-${mat.roughness}`;
  return mat;
}
function buildCrowd() {
  const g = new THREE.Group();
  g.name = "观众";
  g.userData.dynamic = true;
  const r = rng(2025), spots = [], mats = [];
  const { bases, baseWidth, baseDepth } = LAYOUT.lawnPA;
  const clearOfPA = (x, z, margin) => !bases.some(([cx, cz]) => Math.abs(x - cx) < baseWidth / 2 + margin && Math.abs(z - cz) < baseDepth / 2 + margin);
  for (const A of areas()) {
    const s = 1 / Math.sqrt(A.density);
    for (let x = A.box[0]; x < A.box[2]; x += s) for (let z = A.box[1]; z < A.box[3]; z += s) {
      const px = x + (r() - 0.5) * s * 0.9, pz = z + (r() - 0.5) * s * 0.9;
      if (!A.test(px, pz)) continue;
      const v = A.view(px, pz), clump = noise2(px / 7, pz / 7) * 0.6 + noise2(px / 2.6 + 9, pz / 2.6) * 0.4;
      const keep = v * (1 - (1 - v) * 0.9 * clump * 1.4);
      const densitySample = r();
      if (densitySample > keep) continue;
      const k = r();
      if (A.sideFill && densitySample > keep * A.sideFill(px, pz)) continue;
      const sparse = 1 - keep, lawn = A.name === "680";
      const pSit = lawn ? 0.18 + 0.55 * sparse : 0.03 + 0.3 * sparse, pLie = lawn ? 0.02 + 0.16 * sparse : 0.04 * sparse;
      const pose = k < pLie ? "lie" : k < pLie + pSit ? "sit" : "stand";
      const clear = !lawn || clearOfPA(px, pz, pose === "lie" ? 1.3 : 0.65);
      if (clear) spots.push([px, pz, A.name, pose]);
      if (A.mats && r() < A.mats * (pose === "stand" ? 0.6 : 1.4)) {
        const mx = px + (r() - 0.5) * 0.8, mz = pz + (r() - 0.5) * 0.8;
        if (clear && clearOfPA(mx, mz, 1.25)) mats.push([mx, mz]);
      }
    }
  }
  const sitting = spots.filter((p2) => p2[3] === "sit"), lying = spots.filter((p2) => p2[3] === "lie");
  spots.splice(0, spots.length, ...spots.filter((p2) => p2[3] === "stand"));
  const n = spots.length, NEAR_R = 20;
  const uLod = { value: new THREE.Vector4(1e9, 0, 0, NEAR_R) };
  const mk = (geo, count, { lod = false, roughness = 0.92, metalness = 0, shadow = true, skipAo = false } = {}) => {
    const mat = hideMaterial(new THREE.MeshStandardMaterial({ vertexColors: true, roughness, metalness }), uLod, { lod });
    const m = new THREE.InstancedMesh(geo, mat, count);
    m.castShadow = shadow;
    m.receiveShadow = true;
    m.frustumCulled = false;
    if (skipAo) m.userData.skipAoDepth = true;
    if (shadow) {
      const depth = (o2) => hideMaterial(new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking }), uLod, o2);
      m.customDepthMaterial = lod ? depth({ near: false, lod: true }) : depth({ near: false, shrink: 0.14 });
    }
    return m;
  };
  const farParts = buildCrowdFarParts();
  const farFur = mk(farParts.fur, n, { lod: true, roughness: 0.94, shadow: true });
  const farFlower = mk(farParts.flower, n, { lod: true, roughness: 0.78, shadow: false, skipAo: true });
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), p = new THREE.Vector3(), sc = new THREE.Vector3(), c = new THREE.Color();
  const base = new Float32Array(n * 3);
  const variantIds = new Uint8Array(n);
  const variantKeys = NEAR_VARIANT_TABLE.map(([key]) => key);
  const variantIndex = Object.fromEntries(variantKeys.map((key, idx) => [key, idx]));
  spots.forEach(([x, z, zone], i) => {
    const h = 1.36 + r() * 0.22, w = 0.95 + r() * 0.08, y = zone === "680" ? 0.16 : 0.08;
    e.set(0, Math.atan2(x, z + 40) + Math.PI + (r() - 0.5) * 0.9, 0);
    q.setFromEuler(e);
    m4.compose(p.set(x, y, z), q, sc.set(w * h, h, w * h));
    farFur.setMatrixAt(i, m4);
    farFlower.setMatrixAt(i, m4);
    farFur.setColorAt(i, c.set(pick(r, FUR_TONES)).multiplyScalar(0.92 + r() * 0.16));
    variantIds[i] = variantIndex[pick(r, NEAR_VARIANT_TABLE)];
    base[i * 3] = x;
    base[i * 3 + 1] = y;
    base[i * 3 + 2] = z;
  });
  g.add(farFur, farFlower);
  const nearBuckets = NEAR_VARIANT_TABLE.map(([key, weight]) => {
    const parts = buildCrowdNearVariant(key);
    const cap = Math.max(700, Math.ceil(weight / 100 * 5200));
    const fur = mk(parts.fur, cap, { roughness: 0.95, shadow: true });
    const accents = mk(parts.accents, cap, { roughness: 0.72, shadow: false, skipAo: true });
    fur.setColorAt(0, c.set(16777215));
    fur.count = accents.count = 0;
    g.add(fur, accents);
    return { fur, accents, cap };
  });
  const center = new THREE.Vector3(1e9, 0, 0);
  const updateLod = (camera) => {
    if (!g.visible || camera.position.distanceToSquared(center) < 9) return;
    center.copy(camera.position);
    const counts = nearBuckets.map(() => 0);
    let overflow = false;
    const srcMat = farFur.instanceMatrix.array, srcCol = farFur.instanceColor.array;
    const r2 = NEAR_R * NEAR_R;
    for (let i = 0; i < n; i++) {
      const dx = base[i * 3] - center.x, dy = base[i * 3 + 1] - center.y, dz = base[i * 3 + 2] - center.z;
      if (dx * dx + dy * dy + dz * dz >= r2) continue;
      const vid = variantIds[i], b = nearBuckets[vid], k = counts[vid];
      if (k >= b.cap) {
        overflow = true;
        continue;
      }
      const matSlice = srcMat.subarray(i * 16, i * 16 + 16);
      b.fur.instanceMatrix.array.set(matSlice, k * 16);
      b.accents.instanceMatrix.array.set(matSlice, k * 16);
      b.fur.instanceColor.array.set(srcCol.subarray(i * 3, i * 3 + 3), k * 3);
      counts[vid] = k + 1;
    }
    for (let vid = 0; vid < nearBuckets.length; vid++) {
      const b = nearBuckets[vid], k = counts[vid];
      b.fur.count = b.accents.count = k;
      b.fur.instanceMatrix.needsUpdate = b.fur.instanceColor.needsUpdate = true;
      b.accents.instanceMatrix.needsUpdate = true;
    }
    uLod.value.set(center.x, center.y, center.z, overflow ? 0 : NEAR_R);
  };
  g.userData.updateLod = updateLod;
  const posedFur = [], posedAccents = [];
  if (sitting.length) {
    const sitGroups =  new Map([["smile", []], ["catHood", []], ["flowerHood", []]]);
    const sitWeights = [["smile", 60], ["catHood", 22], ["flowerHood", 18]];
    for (const item of sitting) sitGroups.get(pick(r, sitWeights)).push(item);
    for (const [key, list] of sitGroups) {
      if (!list.length) continue;
      const P = buildCrowdSitParts(key);
      const furM = mk(P.fur, list.length, { roughness: 0.94, shadow: true });
      const accM = mk(P.accents, list.length, { roughness: 0.76, shadow: false, skipAo: true });
      list.forEach(([x, z, zone], i) => {
        const h = 1.36 + r() * 0.22, y = zone === "680" ? 0.175 : 0.08;
        e.set(0, Math.atan2(x, z + 40) + Math.PI + (r() - 0.5) * 1.6, 0);
        q.setFromEuler(e);
        m4.compose(p.set(x, y, z), q, sc.set(h, h, h));
        furM.setMatrixAt(i, m4);
        accM.setMatrixAt(i, m4);
        furM.setColorAt(i, c.set(pick(r, FUR_TONES)).multiplyScalar(0.92 + r() * 0.16));
      });
      g.add(furM, accM);
      posedFur.push(furM);
      posedAccents.push(accM);
    }
  }
  if (lying.length) {
    const P = buildCrowdLieParts();
    const furM = mk(P.fur, lying.length, { roughness: 0.94, shadow: true });
    const accM = mk(P.accents, lying.length, { roughness: 0.78, shadow: false, skipAo: true });
    lying.forEach(([x, z, zone], i) => {
      const h = 1.36 + r() * 0.22, y = zone === "680" ? 0.175 : 0.08;
      e.set(0, r() * Math.PI * 2, 0);
      q.setFromEuler(e);
      m4.compose(p.set(x, y, z), q, sc.set(h, h, h));
      furM.setMatrixAt(i, m4);
      accM.setMatrixAt(i, m4);
      furM.setColorAt(i, c.set(pick(r, FUR_TONES)).multiplyScalar(0.92 + r() * 0.16));
    });
    g.add(furM, accM);
    posedFur.push(furM);
    posedAccents.push(accM);
  }
  const matMesh = new THREE.InstancedMesh(new THREE.PlaneGeometry(1.5, 1.9).rotateX(-Math.PI / 2), new THREE.MeshStandardMaterial({ roughness: 0.9, side: THREE.DoubleSide }), Math.max(1, mats.length));
  matMesh.receiveShadow = true;
  matMesh.frustumCulled = false;
  mats.forEach(([x, z], i) => {
    e.set(0, r() * Math.PI, 0);
    q.setFromEuler(e);
    matMesh.setMatrixAt(i, m4.compose(p.set(x, 0.172 + i % 7 * 15e-4, z), q, sc.set(1, 1, 1)));
    matMesh.setColorAt(i, c.set(pick(r, MATS)));
  });
  matMesh.count = mats.length;
  g.add(matMesh);
  g.userData.count = n + sitting.length + lying.length;
  g.userData.poses = { stand: n, sit: sitting.length, lie: lying.length };
  const furMats = [farFur, ...nearBuckets.map((b) => b.fur), ...posedFur].map((m) => m.material);
  const accentMats = [farFlower, ...nearBuckets.map((b) => b.accents), ...posedAccents].map((m) => m.material);
  let nightNow = false;
  g.userData.setNight = (on) => {
    if (on === nightNow) return;
    nightNow = on;
    for (const m of furMats) m.color.setScalar(on ? 0.16 : 1);
    for (const m of accentMats) m.color.setScalar(on ? 0.24 : 1);
    matMesh.material.color.setScalar(on ? 0.12 : 1);
  };
  registerControl({ key: "crowd", label: "观众", options: { show: `演出中（约 ${Math.round(g.userData.count / 1e3)} 千人）`, none: "空场" }, value: "show", set: (v) => {
    g.visible = v !== "none";
  } });
  return g;
}
export {
  buildCrowd
};
