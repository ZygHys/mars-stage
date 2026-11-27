import * as THREE from "three";
import { LAYOUT, inLawn } from "./layout.js";
import { heads, MAT, glowSpots, hgTopSpots, screenTopSpots } from "./venue.js";
const C = (h) => new THREE.Color(h);
const NIGHT_LIGHT = { sun: 0.12, hemi: 0.1, environment: 0.08 };
const LOOKS = {
  opening: { label: "开场·紫红 + 激光扇", beams: ["#b03cff", "#e040ff", "#7a5cff"], pattern: "fan", led: "#b04cff", strips: "#ff2f6a", lasers: "#d06bff", laserOn: true, wash: "#7a2cff", haze: 1, beamI: 1, hazeI: 1.4 },
  creator: { label: "造物者·金色光束扫射", beams: ["#ffc23a", "#ffd979", "#ff9a1f"], pattern: "sweep", led: "#ff9a2e", strips: "#ffd18a", lasers: "#ffcc55", laserOn: false, wash: "#ff7a1a", haze: 1, beamI: 1.2, hazeI: 0.6 },
  fire: { label: "火焰·红白强光", beams: ["#ffffff", "#ff4a2a", "#ffd0c0"], pattern: "cross", led: "#ff2a2a", strips: "#ff2020", lasers: "#ff3030", laserOn: false, wash: "#ff1a10", haze: 1.1, pulse: true, beamI: 0.9, hazeI: 1.6, hazeC: "#ff683e" },
  blue: { label: "深蓝·烟雾冷光", beams: ["#2a7bff", "#46d4ff", "#9fd8ff"], pattern: "fan", led: "#2a6bff", strips: "#e8f2ff", lasers: "#3ad0ff", laserOn: false, wash: "#1a3cff", haze: 0.8, beamI: 0.35, hazeI: 1.8 },
  forever: { label: "forever·粉紫 + V 形光束", beams: ["#ff8ae0", "#ffffff", "#c86bff"], pattern: "vee", led: "#ff4fb8", strips: "#ffffff", lasers: "#ff7ad8", laserOn: false, wash: "#ff3ab0", haze: 0.8, beamI: 0.9, hazeI: 1 }
};
function setupNight({ scene, renderer, gtao, bloomPass, sky, sun, hemi }) {
  const root = new THREE.Group();
  root.visible = false;
  scene.add(root);
  const nightSky = new THREE.Mesh(new THREE.SphereGeometry(1, 40, 24), new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    fog: false,
    uniforms: { stageColor: { value: C("#7a2cff") } },
    vertexShader: `varying vec3 vDirection;
      void main(){
        vDirection = position;
        gl_Position = projectionMatrix * vec4(mat3(viewMatrix) * position, 1.0);
        gl_Position.z = gl_Position.w;
      }`,
    fragmentShader: `uniform vec3 stageColor;
      varying vec3 vDirection;
      void main(){
        vec3 direction = normalize(vDirection);
        float horizon = exp(-max(direction.y, 0.0) * 5.0);
        float towardStage = smoothstep(0.0, 1.0, -direction.z);
        vec3 color = mix(vec3(0.004, 0.006, 0.016), vec3(0.013, 0.022, 0.045), horizon);
        color += stageColor * (0.028 * horizon * towardStage);
        gl_FragColor = vec4(color, 1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`
  }));
  nightSky.frustumCulled = false;
  nightSky.renderOrder = -100;
  root.add(nightSky);
  const cells =  new Set();
  const beamSrc = heads.filter(([x, y, z]) => {
    if (Math.abs(x) >= 62 || z >= 14) return false;
    const cell = `${Math.floor(x / 4.2)},${Math.floor(y / 5.5)},${Math.floor(z / 7.5)}`;
    if (cells.has(cell)) return false;
    cells.add(cell);
    return true;
  });
  const L = 112;
  const beamGeo = new THREE.CylinderGeometry(2.05, 0.085, L, 16, 1, true);
  beamGeo.translate(0, L / 2, 0);
  const beamAlphaBuf = new THREE.InstancedBufferAttribute(new Float32Array(beamSrc.length).fill(1), 1);
  beamAlphaBuf.setUsage(THREE.DynamicDrawUsage);
  beamGeo.setAttribute("aAlpha", beamAlphaBuf);
  const beamMat = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
    forceSinglePass: true,
    uniforms: { uI: { value: 1 } },
    vertexShader: `attribute float aAlpha;
      varying vec2 vUv; varying vec3 vC; varying vec3 vN; varying vec3 vView; varying float vAlpha;
      void main(){ vUv = uv; vAlpha = aAlpha;
        #ifdef USE_INSTANCING_COLOR
          vC = instanceColor;
        #else
          vC = vec3(1.0);
        #endif
        vec4 mv = modelViewMatrix * instanceMatrix * vec4(position, 1.0);
        vN = normalMatrix * mat3(instanceMatrix) * normal;
        vView = -mv.xyz;
        gl_Position = projectionMatrix * mv; }`,
    fragmentShader: `uniform float uI;
      varying vec2 vUv; varying vec3 vC; varying vec3 vN; varying vec3 vView; varying float vAlpha;
      void main(){
        float nLen = length(vN), vLen = length(vView);
        float edge = (nLen > 1e-4 && vLen > 1e-4) ? abs(dot(vN / nLen, vView / vLen)) : 0.0;
        float fall = pow(max(1.0 - vUv.y, 1e-4), 2.3);
        vec3 col = clamp(vC, 0.0, 4.0);
        float alpha = clamp(0.22 * uI * max(vAlpha, 0.0) * fall * edge * edge, 0.0, 1.0);
        gl_FragColor = vec4(col, alpha);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`
  });
  const beams = new THREE.InstancedMesh(beamGeo, beamMat, beamSrc.length);
  beams.frustumCulled = false;
  beams.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  for (let i = 0; i < beamSrc.length; i++) beams.setColorAt(i, C("#ffffff"));
  root.add(beams);
  const emitters = [];
  const emitterZones = [];
  const MS = LAYOUT.mainStage;
  const stageLaserY = (LAYOUT.circleStage?.base?.h ?? 1.6) + 0.45;
  for (const [x, z, y, zone] of [
    [-34, MS.z1 - 0.5, stageLaserY, "stageLeft"],
    [-20, MS.z1 - 0.5, stageLaserY, "stageLeft"],
    [0, MS.z1 - 0.5, stageLaserY, "stageCenter"],
    [20, MS.z1 - 0.5, stageLaserY, "stageRight"],
    [34, MS.z1 - 0.5, stageLaserY, "stageRight"],
    [-10, LAYOUT.frame.depth / 2 + 1, LAYOUT.frame.legHeight + 1, "canopy"],
    [10, LAYOUT.frame.depth / 2 + 1, LAYOUT.frame.legHeight + 1, "canopy"],
    [-46, LAYOUT.prisms.rowZ + 4, LAYOUT.prisms.height + 2, "towerLeft"],
    [46, LAYOUT.prisms.rowZ + 4, LAYOUT.prisms.height + 2, "towerRight"],
    [-58, MS.z1 + 8, stageLaserY + 0.3, "wingLeft"],
    [58, MS.z1 + 8, stageLaserY + 0.3, "wingRight"],
    [-26, MS.z1 - 0.2, stageLaserY + 0.25, "fineWeb"],
    [0, MS.z1 - 0.2, stageLaserY + 0.25, "fineWeb"],
    [26, MS.z1 - 0.2, stageLaserY + 0.25, "fineWeb"],
    [-40, MS.z1 + 1.2, stageLaserY + 1.5, "lowCurtain"],
    [40, MS.z1 + 1.2, stageLaserY + 1.5, "lowCurtain"]
  ]) {
    if (!Number.isFinite(x) || !Number.isFinite(y) || !Number.isFinite(z)) continue;
    emitters.push(new THREE.Vector3(x, y, z));
    emitterZones.push(zone);
  }
  const PER = 10, LL = 270;
  const laserMat = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
    forceSinglePass: true,
    uniforms: { color: { value: C("#ffffff") }, uI: { value: 1 }, resolution: { value: new THREE.Vector2() }, nearClip: { value: 0.3 }, shaftLength: { value: LL } },
    vertexShader: `uniform vec2 resolution;
      uniform float nearClip, shaftLength;
      attribute vec3 aEdgeColor;
      attribute float aWidth;
      attribute float aGain;
      attribute float aSheet;
      varying float across, along, vGain, vSheet;
      varying vec3 vColor, vEdgeColor;
      void main(){
        #ifdef USE_INSTANCING_COLOR
          vColor = instanceColor;
        #else
          vColor = vec3(1.0);
        #endif
        vEdgeColor = aEdgeColor;
        vGain = aGain;
        vSheet = aSheet;
        mat4 transform = modelViewMatrix * instanceMatrix;
        vec4 start = transform * vec4(0.0, 0.0, 0.0, 1.0);
        vec4 end = transform * vec4(0.0, shaftLength, 0.0, 1.0);
        float z = -nearClip * 1.01;
        across = position.x;
        along = uv.y;
        if (start.z >= z && end.z >= z) {
          gl_Position = vec4(2.0, 2.0, 2.0, 1.0);
          return;
        }
        if (start.z > z) {
          float dz = end.z - start.z;
          if (abs(dz) < 1e-4) { gl_Position = vec4(2.0, 2.0, 2.0, 1.0); return; }
          float cut = clamp((z - start.z) / dz, 0.0, 1.0);
          start = mix(start, end, cut);
          along = mix(cut, 1.0, along);
        } else if (end.z > z) {
          float dz = end.z - start.z;
          if (abs(dz) < 1e-4) { gl_Position = vec4(2.0, 2.0, 2.0, 1.0); return; }
          float cut = clamp((z - start.z) / dz, 0.0, 1.0);
          end = mix(start, end, cut);
          along *= cut;
        }
        start = projectionMatrix * start;
        end = projectionMatrix * end;
        if (abs(start.w) < 1e-4 || abs(end.w) < 1e-4) {
          gl_Position = vec4(2.0, 2.0, 2.0, 1.0);
          return;
        }
        vec2 delta = (end.xy / end.w - start.xy / start.w) * resolution;
        float dLen = length(delta);
        if (dLen < 0.01) {
          gl_Position = vec4(2.0, 2.0, 2.0, 1.0);
          return;
        }
        vec2 crossLine = vec2(-delta.y, delta.x) / dLen;
        gl_Position = mix(start, end, uv.y);
        float beamW = clamp(aWidth, 0.9, 10.0);
        float sheetW = mix(2.5, clamp(aWidth, 12.0, 52.0), along);
        float pxW = mix(beamW, sheetW, vSheet);
        gl_Position.xy += crossLine * (pxW / max(resolution, vec2(1.0))) * across * gl_Position.w;
      }`,
    fragmentShader: `uniform vec3 color;
      uniform float uI;
      varying float across, along, vGain, vSheet;
      varying vec3 vColor, vEdgeColor;
      void main(){
        float d = abs(across);
        float beamEdge = 1.0 - smoothstep(0.0, 1.0, d);
        float beamCore = 1.0 - smoothstep(0.0, 0.24, d);
        float sheetMask = (1.0 - smoothstep(0.86, 1.0, d)) * (0.36 + 0.34 * d * d + 0.08 * sin(d * 18.0));
        float shape = mix(beamEdge, sheetMask, vSheet);
        float core = mix(beamCore, 0.12 * (1.0 - d), vSheet);
        vec3 baseCol = mix(vEdgeColor, vColor, smoothstep(0.18, 0.82, 1.0 - d));
        vec3 col = clamp(color * mix(baseCol, vec3(1.0), core * 0.24) * (0.95 + 0.52 * core), 0.0, 6.0);
        float a = clamp(0.56 * uI * max(vGain, 0.0) * shape * (1.0 - smoothstep(0.18, 1.0, along)), 0.0, 1.0);
        gl_FragColor = vec4(col, a);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`
  });
  const laserGeo = new THREE.PlaneGeometry(2, 1);
  const laserCountTotal = emitters.length * PER;
  const laserEdgeBuf = new THREE.InstancedBufferAttribute(new Float32Array(laserCountTotal * 3), 3);
  const laserWidthBuf = new THREE.InstancedBufferAttribute(new Float32Array(laserCountTotal).fill(4.6), 1);
  const laserGainBuf = new THREE.InstancedBufferAttribute(new Float32Array(laserCountTotal).fill(1), 1);
  const laserSheetBuf = new THREE.InstancedBufferAttribute(new Float32Array(laserCountTotal).fill(0), 1);
  for (let i = 0; i < laserCountTotal; i++) laserEdgeBuf.setXYZ(i, 1, 1, 1);
  laserGeo.setAttribute("aEdgeColor", laserEdgeBuf);
  laserGeo.setAttribute("aWidth", laserWidthBuf);
  laserGeo.setAttribute("aGain", laserGainBuf);
  laserGeo.setAttribute("aSheet", laserSheetBuf);
  const lasers = new THREE.InstancedMesh(laserGeo, laserMat, laserCountTotal);
  for (let i = 0; i < laserCountTotal; i++) lasers.setColorAt(i, C("#ffffff"));
  lasers.frustumCulled = false;
  root.add(lasers);
  const pts = [], r =  (() => {
    let s = 7;
    return () => (s = s * 1664525 + 1013904223 >>> 0) / 4294967296;
  })();
  const P = LAYOUT.ground.pit, CY = LAYOUT.cylinder;
  const [centralAisle, , , , towerSide] = LAYOUT.abBoundaryRuns;
  const [stageAisle] = LAYOUT.stageAisleRuns;
  const [aisleEdge, aisleOtherEdge] = LAYOUT.innerBoundaryRuns;
  const within = (x, z, [side, from, , to]) => Math.abs(x) < Math.abs(side) && z >= from && z <= to;
  const blocked = (x, z) => Math.hypot(x - CY.x, z - CY.z) < 13 || Math.hypot(x, z) < 15 || within(x, z, centralAisle) || within(x, z, towerSide) || within(x, z, stageAisle) || z >= aisleEdge[1] && z <= aisleOtherEdge[1] || Math.abs(Math.abs(x) - 92) < 8 && z < 30;
  for (let i = 0; i < 18e3; i++) {
    const x = P.x0 + 2 + r() * (P.x1 - P.x0 - 4), z = P.z0 + 2 + r() * (P.z1 - P.z0 - 4);
    if (!blocked(x, z)) pts.push(x, 1.4 + r() * 0.4, z, r());
  }
  const LW = LAYOUT.ground.lawn;
  for (let i = 0; i < 3e4; i++) {
    const x = LW.x0 + r() * (LW.x1 - LW.x0), z = LW.z0 + r() * (LW.z1 - LW.z0);
    if (inLawn(x, z)) pts.push(x, 1.4 + r() * 0.4, z, r());
  }
  const pg = new THREE.BufferGeometry();
  const pos = new Float32Array(pts.length / 4 * 3), ph = new Float32Array(pts.length / 4);
  for (let i = 0; i < pts.length / 4; i++) {
    pos.set(pts.slice(i * 4, i * 4 + 3), i * 3);
    ph[i] = pts[i * 4 + 3];
  }
  pg.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  pg.setAttribute("phase", new THREE.BufferAttribute(ph, 1));
  const crowdMat = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    uniforms: { uT: { value: 0 }, uC: { value: C("#ff2a3a") }, uScale: { value: 1 }, uAlpha: { value: 1 } },
    vertexShader: `attribute float phase; uniform float uT; uniform float uScale; varying float vA, vWarm;
      void main(){ vec4 mv = modelViewMatrix * vec4(position + vec3(0.0, sin(uT * 2.0 + phase * 30.0) * 0.12, 0.0), 1.0);
        float distance = max(1.0, -mv.z);
        vA = (0.67 + 0.23 * sin(uT * (0.9 + phase) + phase * 40.0)) * (1.0 - smoothstep(150.0, 420.0, distance));
        vWarm = smoothstep(0.83, 1.0, phase);
        gl_PointSize = clamp(uScale * 63.0 / distance, 1.6, 8.0); gl_Position = projectionMatrix * mv; }`,
    fragmentShader: `uniform vec3 uC; uniform float uAlpha; varying float vA, vWarm;
      void main(){
        float falloff = 1.0 - smoothstep(0.04, 0.5, length(gl_PointCoord - 0.5));
        gl_FragColor = vec4(mix(uC, vec3(1.0, 0.47, 0.25), vWarm), falloff * vA * uAlpha);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`
  });
  root.add(new THREE.Points(pg, crowdMat));
  const washes = [];
  for (const [x, y, z, inten] of [[-25, 12, -42, 1800], [25, 12, -42, 1800], [0, 16, 4, 1e3], [0, 6, 48, 300], [-70, 12, -5, 600], [70, 12, -5, 600], [-30, 30, -62, 1500], [30, 30, -62, 1500]]) {
    const l = new THREE.PointLight(16777215, inten, 120, 2);
    l.position.set(x, y, z);
    l.userData.baseIntensity = inten;
    root.add(l);
    washes.push(l);
  }
  const hazeTex = (() => {
    const c = document.createElement("canvas");
    c.width = c.height = 128;
    const g = c.getContext("2d");
    const gr = g.createRadialGradient(64, 64, 0, 64, 64, 64);
    gr.addColorStop(0, "rgba(255,255,255,1)");
    gr.addColorStop(0.4, "rgba(255,255,255,0.35)");
    gr.addColorStop(1, "rgba(255,255,255,0)");
    g.fillStyle = gr;
    g.fillRect(0, 0, 128, 128);
    const t = new THREE.CanvasTexture(c);
    return t;
  })();
  const hazes = [
    [-42, 8, -44, 56],
    [0, 12, -49, 66],
    [42, 8, -44, 56],
    [-25, 7, -19, 42],
    [25, 7, -19, 42],
    [0, 7, 4, 51]
  ].map(([x, y, z, width]) => {
    const material = new THREE.SpriteMaterial({ map: hazeTex, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, fog: false });
    const sprite = new THREE.Sprite(material);
    sprite.position.set(x, y, z);
    sprite.scale.set(width, width * 0.5, 1);
    root.add(sprite);
    return sprite;
  });
  const footGlowMat = new THREE.SpriteMaterial({ map: hazeTex, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, fog: false });
  {
    const CS = LAYOUT.circleStage, FL = CS.footlights;
    for (let i = 0; i < FL.count; i++) {
      const a = (i + 0.5) * Math.PI / FL.count, sp = new THREE.Sprite(footGlowMat);
      sp.position.set(CS.x + Math.cos(a) * (FL.r + 0.15), 0.45, CS.z + Math.sin(a) * (FL.r + 0.15));
      sp.scale.set(1.5, 1.5, 1);
      root.add(sp);
    }
  }
  const spotGlowMat = new THREE.SpriteMaterial({ map: hazeTex, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, fog: false });
  for (const [x, y, z, d2] of glowSpots) {
    const sp = new THREE.Sprite(spotGlowMat);
    sp.position.set(x, y, z);
    sp.scale.set(d2, d2, 1);
    root.add(sp);
  }
  const hgTopGlowMat = new THREE.SpriteMaterial({ map: hazeTex, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, fog: false, opacity: 0.9 });
  const hgTopGroup = new THREE.Group();
  for (const [x, y, z, d2] of hgTopSpots) {
    const sp = new THREE.Sprite(hgTopGlowMat);
    sp.position.set(x, y, z);
    sp.scale.set(d2, d2, 1);
    hgTopGroup.add(sp);
  }
  root.add(hgTopGroup);
  const screenTopGlowMat = new THREE.SpriteMaterial({ map: hazeTex, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, fog: false, opacity: 0.9 });
  const screenTopGroup = new THREE.Group();
  for (const [x, y, z, d2] of screenTopSpots) {
    const sp = new THREE.Sprite(screenTopGlowMat);
    sp.position.set(x, y, z);
    sp.scale.set(d2, d2, 1);
    screenTopGroup.add(sp);
  }
  root.add(screenTopGroup);
  const canopyMatrixMat = new THREE.SpriteMaterial({ map: hazeTex, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, fog: false, opacity: 0.95 });
  const canopyMatrixGroup = new THREE.Group();
  for (const cx of [-6.6, -2.2, 2.2, 6.6]) {
    for (const cy of [20.5, 24]) {
      const sp = new THREE.Sprite(canopyMatrixMat);
      sp.position.set(cx, cy, -36.5);
      sp.scale.set(4.8, 4.8, 1);
      canopyMatrixGroup.add(sp);
    }
  }
  root.add(canopyMatrixGroup);
  const frontStrobeGroup = new THREE.Group();
  const frontStrobeSprites = [];
  for (let i = 0; i < 16; i++) {
    const mat = new THREE.SpriteMaterial({ map: hazeTex, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, fog: false, opacity: 0.95 });
    const sp = new THREE.Sprite(mat);
    const fx = -34 + i / 15 * 68;
    sp.position.set(fx, stageLaserY + 0.65, MS.z1 + 0.25);
    sp.scale.set(5.4, 5.4, 1);
    frontStrobeGroup.add(sp);
    frontStrobeSprites.push(sp);
  }
  frontStrobeGroup.visible = false;
  root.add(frontStrobeGroup);
  const glow = [];
  scene.traverse((o) => {
    if (!o.material) return;
    for (const m of [].concat(o.material)) if (m.emissiveMap && !glow.includes(m)) glow.push(m);
  });
  for (const m of glow) m.userData.day = { i: m.emissiveIntensity, c: m.emissive.clone(), map: m.map, emap: m.emissiveMap };
  const fixtures = [MAT.lens, MAT.ledWhite, MAT.ledStrip, MAT.whiteLine];
  const tinted = [MAT.matrixLens, MAT.hgLed, MAT.controlTowerLed, MAT.warm, MAT.spire].filter(Boolean);
  for (const m of tinted) m.userData.day = { i: m.emissiveIntensity, c: m.emissive.clone() };
  for (const m of fixtures) m.userData.day = { i: m.emissiveIntensity, c: m.emissive.clone() };
  let night = false, look = LOOKS.opening, lookKey = "opening", customLook = null;
  const day = { exp: renderer.toneMappingExposure, sun: sun.intensity, sunC: sun.color.clone(), shadow: sun.castShadow, hemi: hemi.intensity, env: scene.environmentIntensity, fog: scene.fog.color.clone(), fogD: scene.fog.density };
  const activeLook = () => customLook || look;
  const cTint = C("#ffffff"), cStrip = C("#ffffff"), cHg = C("#ffffff"), cCtrl = C("#ffffff"), cWhite = C("#ffffff"), cWarmMix = C("#fff4dc"), cHazeMix = C("#cad8ff"), cDayStrip = C("#ff2f55"), cNightSun = C("#8fa6ff"), cNightFog = C("#040406"), cBeamL = C("#ffffff"), cBeamR = C("#ffffff"), cScratch = C("#ffffff");
  function setPrewarm(on) {
    if (on) {
      root.visible = true;
      lasers.visible = true;
      hgTopGroup.visible = true;
      screenTopGroup.visible = true;
      canopyMatrixGroup.visible = true;
      frontStrobeGroup.visible = true;
    } else {
      root.visible = night;
      applyLook();
    }
  }
  function setNight(on) {
    night = on;
    root.visible = on;
    sky.visible = !on;
    if (gtao) gtao.enabled = !on;
    if (bloomPass) bloomPass.enabled = on;
    sun.castShadow = day.shadow && !on;
    sun.intensity = on ? NIGHT_LIGHT.sun : day.sun;
    sun.color.copy(on ? cNightSun : day.sunC);
    hemi.intensity = on ? NIGHT_LIGHT.hemi : day.hemi;
    scene.environmentIntensity = on ? NIGHT_LIGHT.environment : day.env;
    scene.fog.color.copy(on ? cNightFog : day.fog);
    scene.fog.density = on ? 22e-4 : day.fogD;
    renderer.toneMappingExposure = on ? 1 : day.exp;
    applyLook();
  }
  function setLook(key) {
    if (LOOKS[key]) {
      look = LOOKS[key];
      lookKey = key;
      customLook = null;
      applyLook();
    }
  }
  function setCustomLook(spec) {
    customLook = spec ? { ...LOOKS.opening, ...spec } : null;
    applyLook();
  }
  function applyLook() {
    const L2 = activeLook();
    cTint.set(L2.led || "#b04cff");
    cStrip.set(L2.strips || "#ff2f6a");
    cHg.set(L2.hgColor || L2.strips || "#ff2f6a");
    cCtrl.set(L2.towerStrips || L2.strips || "#ff2f6a");
    for (const m of glow) {
      const d2 = m.userData.day;
      if (m.userData.showControlled) continue;
      if (m.userData.nightMap) {
        const t = night ? m.userData.nightMap : null;
        m.map = t || d2.map;
        m.emissiveMap = t || d2.emap;
      }
      if (!night) {
        m.emissiveIntensity = d2.i;
        m.emissive.copy(d2.c);
      } else if (m.userData.nightMap) {
        m.emissiveIntensity = 0.9;
        m.emissive.copy(cWhite);
      } else if (m.userData.nightStrips) {
        m.emissiveIntensity = 1.45 * (L2.stripI ?? 1);
        m.emissive.copy(cStrip);
      } else {
        m.emissiveIntensity = 0.8;
        m.emissive.copy(cWhite).lerp(cTint, 0.45);
      }
    }
    for (const m of fixtures) {
      const d2 = m.userData.day;
      m.emissiveIntensity = night ? d2.i * 1.6 : d2.i;
    }
    MAT.ledStrip.emissive.copy(night ? cStrip : cDayStrip);
    for (const m of tinted) {
      const d2 = m.userData.day;
      const col = m === MAT.hgLed ? cHg : m === MAT.controlTowerLed ? cCtrl : m === MAT.warm ? cStrip : cTint;
      m.emissiveIntensity = night ? (m === MAT.warm ? 7 : 2.2) * (L2.stripI ?? 1) : d2.i;
      if (night) m.emissive.copy(col).lerp(cWhite, m === MAT.warm ? 0.55 : 0.35);
      else m.emissive.copy(d2.c);
    }
    footGlowMat.color.copy(cStrip).lerp(cWarmMix, 0.55).multiplyScalar(1.6 * (L2.stripI ?? 1));
    const b0 = Array.isArray(L2.beams) && L2.beams.length ? L2.beams[0] : "#ffffff";
    spotGlowMat.color.set(b0).lerp(cWhite, 0.5).multiplyScalar(1.4);
    const hgTopI = L2.hgTopI ?? 0.35;
    hgTopGroup.visible = hgTopI > 0.02;
    if (hgTopGroup.visible) hgTopGlowMat.color.set(L2.hgTopColor || L2.hgColor || L2.strips || "#ffffff").multiplyScalar(1.6 * hgTopI);
    const screenTopI = L2.screenTopI ?? 0.4;
    screenTopGroup.visible = screenTopI > 0.02;
    if (screenTopGroup.visible) screenTopGlowMat.color.set(L2.screenTopColor || b0).multiplyScalar(1.5 * screenTopI);
    const cmI = L2.canopyMatrixI ?? 0;
    canopyMatrixGroup.visible = cmI > 0.02;
    if (canopyMatrixGroup.visible) canopyMatrixMat.color.set(L2.canopyMatrixColor || "#2e7bff").multiplyScalar(1.8 * cmI);
    const fsI = L2.frontStrobeI ?? 0;
    frontStrobeGroup.visible = fsI > 0.02;
    const laserGroups = L2.laserGroups;
    lasers.visible = Boolean(L2.laserOn || Array.isArray(laserGroups) && laserGroups.length > 0);
    if (Array.isArray(laserGroups) && laserGroups.length > 0) {
      laserMat.uniforms.color.value.set("#ffffff").multiplyScalar(1.32);
      laserMat.uniforms.uI.value = L2.laserI ?? 1.2;
    } else {
      laserMat.uniforms.color.value.set(L2.lasers || "#ffffff").multiplyScalar(1.3);
      laserMat.uniforms.uI.value = L2.laserI ?? 1.05;
      for (let i = 0; i < laserCountTotal; i++) {
        lasers.setColorAt(i, cWhite);
        laserEdgeBuf.setXYZ(i, 1, 1, 1);
        laserWidthBuf.setX(i, 4.4);
        laserGainBuf.setX(i, 1);
        laserSheetBuf.setX(i, 0);
      }
      lasers.instanceColor.needsUpdate = true;
      laserEdgeBuf.needsUpdate = true;
      laserWidthBuf.needsUpdate = true;
      laserGainBuf.needsUpdate = true;
      laserSheetBuf.needsUpdate = true;
    }
    const washColors = Array.isArray(L2.wash) ? L2.wash : [L2.wash, L2.wash, L2.wash];
    const washI = L2.washI ?? 1;
    nightSky.material.uniforms.stageColor.value.set(washColors[1] || washColors[0] || "#7a2cff").multiplyScalar(washI);
    for (const l of washes) {
      const col = l.position.x < -8 ? washColors[0] : l.position.x > 8 ? washColors[2] || washColors[0] : washColors[1] || washColors[0];
      l.color.set(col || "#ffffff");
      l.intensity = (l.userData.baseIntensity || 1e3) * washI;
    }
    for (const haze of hazes) haze.material.color.set(L2.hazeC || washColors[1] || washColors[0] || "#7a2cff").lerp(cHazeMix, 0.12);
    const beamPalette = Array.isArray(L2.beams) && L2.beams.length ? L2.beams : ["#ffffff"];
    const hasBeamLeft = Boolean(L2.beamLeft);
    if (hasBeamLeft) cBeamL.set(L2.beamLeft);
    const hasBeamRight = Boolean(L2.beamRight);
    if (hasBeamRight) cBeamR.set(L2.beamRight);
    const l2 = L2.beamLayer2 && typeof L2.beamLayer2 === "object" ? L2.beamLayer2 : null;
    const l2Palette = l2 && Array.isArray(l2.beams) && l2.beams.length ? l2.beams : null;
    for (let i = 0; i < beamSrc.length; i++) {
      const x = beamSrc[i][0];
      if (l2Palette && (i & 1) === 1) {
        cScratch.set(l2Palette[(i >> 1) % l2Palette.length]);
        beams.setColorAt(i, cScratch);
      } else if (hasBeamLeft && x < -6) {
        beams.setColorAt(i, cBeamL);
      } else if (hasBeamRight && x > 6) {
        beams.setColorAt(i, cBeamR);
      } else {
        cScratch.set(beamPalette[i % beamPalette.length]);
        beams.setColorAt(i, cScratch);
      }
    }
    beams.instanceColor.needsUpdate = true;
    beamMat.uniforms.uI.value = (L2.beamI ?? 1) * (L2.haze ?? 1);
    crowdMat.uniforms.uC.value.set(L2.crowdGlow || "#ff2a3a");
    crowdMat.uniforms.uAlpha.value = L2.crowdGlowI ?? 1;
  }
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), up = new THREE.Vector3(0, 1, 0), d = new THREE.Vector3(), one = new THREE.Vector3(1, 1, 1), beamScale = new THREE.Vector3(1, 1, 1), zero = new THREE.Vector3(0, 0, 0), hiddenPos = new THREE.Vector3(0, -9999, 0), p = new THREE.Vector3();
  const forward = new THREE.Vector3();
  const stageC = new THREE.Vector3(0, 1.5, 0);
  const tmpC = C("#ffffff"), tmpEdge = C("#ffffff"), tmpFs = C("#ffffff");
  function aimPattern(pattern, sp, sw, i, x, y, z, hang, t) {
    const side = Math.sign(x) || 1, k = i * 0.37, tt = t * sp;
    switch (pattern) {
      case "fan": {
        const a = x / 48 * 0.62 + Math.sin(tt * 1.15 + k * 0.28) * (0.28 * sw);
        d.set(Math.sin(a), Math.max(0.24, Math.cos(a * 0.85)), 0.22 + 0.14 * Math.sin(tt * 0.85));
        break;
      }
      case "sunburst": {
        const fan = x / 44 * 1.08 + Math.sin(tt * 0.75 + k * 0.16) * (0.14 * sw);
        d.set(Math.sin(fan), Math.max(0.26, Math.cos(fan * 0.85)), 0.18 + 0.1 * Math.cos(tt * 0.6 + k));
        break;
      }
      case "whipSweep": {
        const a = Math.sin(tt * 2.9 - x * 0.018) * (1.05 * sw);
        d.set(Math.sin(a), Math.max(0.22, Math.cos(a * 0.78)), 0.24 + 0.16 * Math.cos(tt * 2.1 + k * 0.2));
        break;
      }
      case "scissorWhip": {
        const a = side * (0.08 + Math.sin(tt * 3.4 + i % 3 * 0.55) * (0.92 * sw));
        d.set(Math.sin(a), Math.max(0.22, Math.cos(a * 0.75)), 0.22 + 0.12 * Math.sin(tt * 2.3));
        break;
      }
      case "waveWhip": {
        const a = Math.sin(tt * 4 - x * 0.085) * (0.98 * sw);
        d.set(Math.sin(a), Math.max(0.22, Math.cos(a * 0.76)), 0.26 + 0.14 * Math.sin(tt * 2.4 + x * 0.04));
        break;
      }
      case "doubleFan": {
        if ((i & 1) === 0) {
          const fan = x / 44 * 1.06 + Math.sin(tt * 0.65 + k * 0.14) * (0.12 * sw);
          d.set(Math.sin(fan), Math.max(0.26, Math.cos(fan * 0.84)), 0.18 + 0.08 * Math.cos(k));
        } else {
          const a = -side * (0.12 + Math.sin(tt * 3.6 + i % 4 * 0.45) * (0.95 * sw));
          d.set(Math.sin(a), Math.max(0.22, Math.cos(a * 0.76)), 0.24 + 0.12 * Math.cos(tt * 2.5));
        }
        break;
      }
      case "vee": {
        const a = side * (0.28 + 0.42 * sw * Math.sin(tt * 1.8 + k % 2 * 3.1));
        d.set(Math.sin(a), Math.max(0.24, Math.cos(a)), 0.16);
        break;
      }
      case "sweep": {
        const a = Math.sin(tt * 1.85 + x * 0.025) * (0.85 * sw);
        d.set(Math.sin(a), 0.82, 0.35 + 0.18 * Math.cos(tt * 1.4));
        break;
      }
      case "cross": {
        const a = -side * (0.32 + 0.46 * sw * Math.sin(tt * 2.4 + k * 0.45));
        d.set(Math.sin(a), 0.9, 0.25);
        break;
      }
      case "vertical": {
        const a = Math.sin(tt * 0.6 + k) * (0.08 * sw);
        d.set(Math.sin(a), 1, 0.06);
        break;
      }
      case "cone": {
        const ang = tt * 1.4 + k;
        d.set(Math.cos(ang) * (0.48 * sw), 0.86, Math.sin(ang) * (0.48 * sw) + 0.18);
        break;
      }
      case "down": {
        if (hang) {
          d.copy(stageC).sub(p.set(x, y, z)).normalize();
          d.x += Math.sin(tt * 1.2 + k) * 0.18;
        } else {
          const a = Math.sin(tt * 0.9 + k) * (0.55 * sw);
          d.set(Math.sin(a), 0.9, 0.2);
        }
        break;
      }
      default:
        d.set(0, 1, 0);
    }
    if (hang && pattern !== "down" && pattern !== "vertical" && pattern !== "sunburst" && pattern !== "doubleFan") d.y = Math.abs(d.y) * 0.62 + 0.2;
    if (d.lengthSq() < 1e-6) d.set(0, 1, 0);
    return d.normalize();
  }
  function update(t, camera) {
    if (!night) return;
    const L2 = activeLook();
    crowdMat.uniforms.uT.value = t;
    crowdMat.uniforms.uScale.value = renderer.getPixelRatio();
    const pulse = L2.pulse ? 0.89 + 0.11 * Math.cos(t * 3) : 1;
    const strobe = L2.strobe > 0 ? Math.sin(t * L2.strobe * Math.PI * 2) > 0 ? 1.35 : 0.15 : 1;
    const baseBeamI = (L2.beamI ?? 1) * (L2.haze ?? 1) * pulse * strobe;
    beamMat.uniforms.uI.value = baseBeamI;
    const wMult1 = L2.beamSpread === "sharp" ? 0.54 : L2.beamSpread === "wide" ? 1.85 : 1;
    const sp1 = L2.beamSpeed ?? 1;
    const sw1 = L2.beamSwing ?? 1;
    const l2 = L2.beamLayer2 && typeof L2.beamLayer2 === "object" ? L2.beamLayer2 : null;
    const wMult2 = l2 ? l2.spread === "sharp" ? 0.52 : l2.spread === "wide" ? 1.8 : 1 : wMult1;
    const sp2 = l2?.speed ?? sp1 * 1.6;
    const sw2 = l2?.swing ?? sw1;
    const pat2 = l2?.pattern || "whipSweep";
    const l2Gain = l2 && (L2.beamI ?? 1) > 0.12 ? Math.min(3, (l2.intensity ?? 1) / Math.max(L2.beamI ?? 1, 0.15)) : 1;
    const chase = L2.beamChase || "none";
    const chaseSp = L2.beamChaseSpeed ?? 8;
    beamSrc.forEach(([x, y, z, hang], i) => {
      const isL2 = Boolean(l2) && (i & 1) === 1;
      if (isL2) {
        aimPattern(pat2, sp2, sw2, i, x, y, z, hang, t);
        beamScale.set(wMult2, 1, wMult2);
      } else {
        aimPattern(L2.pattern, sp1, sw1, i, x, y, z, hang, t);
        beamScale.set(wMult1, 1, wMult1);
      }
      q.setFromUnitVectors(up, d);
      m4.compose(p.set(x, y, z), q, beamScale);
      beams.setMatrixAt(i, m4);
      let a = isL2 ? l2Gain : 1;
      if (chase === "wave") {
        a *= 0.25 + 0.95 * (0.5 + 0.5 * Math.sin(t * chaseSp - x * 0.14));
      } else if (chase === "centerOut") {
        a *= 0.2 + 1 * (0.5 + 0.5 * Math.sin(t * chaseSp - Math.abs(x) * 0.16));
      } else if (chase === "strobeAlt") {
        const alt = ((i & 1) === 0 ? 1 : -1) * Math.sin(t * chaseSp * Math.PI);
        a *= alt > 0 ? 1.35 : 0.18;
      } else if (chase === "randomStrobe") {
        const cell = Math.floor(t * chaseSp);
        const h = Math.sin(cell * 12.9898 + i * 78.233) * 43758.5453;
        a *= h - Math.floor(h) > 0.38 ? 1.35 : 0.15;
      }
      beamAlphaBuf.setX(i, a);
    });
    beams.instanceMatrix.needsUpdate = true;
    beamAlphaBuf.needsUpdate = true;
    const fsI = L2.frontStrobeI ?? 0;
    if (frontStrobeGroup.visible && fsI > 0.02) {
      tmpFs.set(L2.frontStrobeColor || "#ffffff");
      const fsMode = L2.frontStrobeMode || "chase";
      const fsSp = L2.frontStrobeSpeed ?? 12;
      for (let i = 0; i < frontStrobeSprites.length; i++) {
        const sp = frontStrobeSprites[i];
        let g = 1;
        if (fsMode === "chase") {
          const w = 0.5 + 0.5 * Math.sin(t * fsSp - i * 0.72);
          g = w * w;
        } else if (fsMode === "centerOut") {
          const dist = Math.abs(i - 7.5);
          const w = 0.5 + 0.5 * Math.sin(t * fsSp - dist * 0.85);
          g = w * w;
        } else if (fsMode === "strobe") {
          const on = Math.sin(t * fsSp * Math.PI + (i & 1) * Math.PI) > 0;
          g = on ? 1.35 : 0.06;
        }
        const s = 3.2 + g * 3.8;
        sp.scale.set(s, s, 1);
        sp.material.color.copy(tmpFs).multiplyScalar(1.9 * fsI * (0.15 + 1.15 * g));
      }
    }
    camera.getWorldDirection(forward);
    for (const haze of hazes) {
      const depth = p.copy(haze.position).sub(camera.position).dot(forward);
      haze.material.opacity = 0.074 * (L2.hazeI ?? 1) * THREE.MathUtils.smoothstep(depth, 6, 23);
    }
    if (lasers.visible) {
      renderer.getDrawingBufferSize(laserMat.uniforms.resolution.value);
      laserMat.uniforms.nearClip.value = camera.near;
      const groups = Array.isArray(L2.laserGroups) && L2.laserGroups.length > 0 ? L2.laserGroups : null;
      let j = 0;
      const zoneTotals = {};
      for (const z of emitterZones) zoneTotals[z] = (zoneTotals[z] || 0) + 1;
      const zoneSeen = {};
      emitters.forEach((e, ei) => {
        const zone = emitterZones[ei];
        const zOrder = zoneSeen[zone] || 0;
        zoneSeen[zone] = zOrder + 1;
        const zTotal = zoneTotals[zone] || 1;
        const isAuxZone = zone === "fineWeb" || zone === "lowCurtain" || zone === "wingLeft" || zone === "wingRight";
        const grp = groups ? groups.find((g) => g.emitter === zone || g.emitter === "all" && !isAuxZone) || null : isAuxZone ? null : { color: null, count: 6, spread: 1.3, pitch: 0.55, sweep: 0.5, speed: 0.8, zDir: 0.8, on: true };
        let beamCount = Math.max(1, Math.min(PER * zTotal, Math.round(grp?.count ?? 4)));
        let emitterEnabled = Boolean(grp);
        if (groups && grp && grp.emitter === zone && zTotal > 1) {
          if (zone !== "fineWeb" && zone !== "lowCurtain" && beamCount <= 3) {
            emitterEnabled = zOrder === 0;
          } else {
            const base = Math.floor(beamCount / zTotal);
            const rem = beamCount % zTotal;
            beamCount = base + (zOrder < rem ? 1 : 0);
            emitterEnabled = beamCount > 0;
          }
        }
        beamCount = Math.min(PER, beamCount);
        const active = emitterEnabled && grp && grp.on !== false && (!(grp.strobe > 0) || Math.sin(t * grp.strobe * Math.PI * 2 + ei) > -0.15);
        const style = grp?.style || (zone === "fineWeb" ? "fine" : zone === "lowCurtain" ? "curtain" : "hero");
        const isSheet = style === "sheet" ? 1 : 0;
        const motion = grp?.motion || (style === "fine" ? "step" : style === "sheet" ? "whip" : "sweep");
        const widthPx = grp?.width ?? (style === "sheet" ? 30 : style === "fine" ? 1.15 : style === "curtain" ? 1.85 : 4.6);
        const gainVal = grp?.gain ?? (style === "sheet" ? 0.68 : style === "fine" ? 0.28 : style === "curtain" ? 0.52 : 1.08);
        let spreadAmt = grp?.spread ?? (style === "fine" ? 1.95 : style === "curtain" ? 1.25 : 1.15);
        const pitchBase = grp?.pitch ?? (style === "curtain" ? 0.11 : 0.55);
        const sweepAmt = grp?.sweep ?? (style === "fine" ? 0.55 : 0.45);
        const speed = grp?.speed ?? 1.2;
        const aimBias = grp?.aimBias ?? (zone === "lowCurtain" ? e.x < 0 ? 0.52 : -0.52 : 0);
        const zDir = grp?.zDir ?? (style === "curtain" ? 0.78 : 0.55);
        if (groups && grp) {
          const baseCol = grp.color || L2.lasers || "#ffffff";
          const useAlt = grp.altColor && Math.sin(t * (grp.altRate ?? 10) * Math.PI * 2 + ei * 0.7) > 0;
          tmpC.set(useAlt ? grp.altColor : baseCol);
          tmpEdge.set(useAlt ? grp.altEdgeColor || grp.altColor : grp.edgeColor || baseCol);
        }
        if (motion === "scissor") {
          spreadAmt = spreadAmt * (0.32 + 0.78 * Math.abs(Math.sin(t * speed * 2.4 + ei * 0.5)));
        }
        for (let k = 0; k < PER; k++) {
          if (!active || k >= beamCount) {
            q.identity();
            m4.compose(hiddenPos, q, zero);
            lasers.setMatrixAt(j, m4);
          } else {
            const frac = beamCount > 1 ? k / (beamCount - 1) - 0.5 : 0;
            let sweep = 0;
            let pitchDelta = 0.14 * Math.sin(t * (speed * 0.75) + ei * 1.7);
            if (motion === "whip") {
              const ph2 = t * speed * 2.2 + ei * 1.1 + k * 0.18;
              sweep = (Math.sin(ph2) * 0.68 + Math.sin(ph2 * 2) * 0.32) * sweepAmt;
              pitchDelta = 0.26 * Math.cos(t * speed * 1.65 + ei * 0.8);
            } else if (motion === "step") {
              const stepIdx = Math.floor(t * (speed * 4.5));
              sweep = Math.sin(stepIdx * 2.39996 + k * 1.17 + ei * 0.9) * sweepAmt;
              pitchDelta = 0.22 * Math.cos(stepIdx * 1.732 + k * 0.8 + ei);
            } else if (motion === "scissor") {
              sweep = Math.sin(t * speed * 1.5 + ei * 0.9) * sweepAmt;
              pitchDelta = 0.16 * Math.sin(t * speed * 2.1 + k * 0.7);
            } else {
              sweep = Math.sin(t * speed + ei * 0.9) * sweepAmt;
            }
            const spread = frac * spreadAmt + aimBias;
            const minPitch = style === "curtain" ? 0.03 : 0.08;
            const pitchVal = style === "curtain" ? Math.max(minPitch, pitchBase + 0.06 * Math.sin(t * speed * 1.8 + k * 0.9 + ei)) : Math.max(minPitch, pitchBase + pitchDelta);
            d.set(Math.sin(spread + sweep), pitchVal, zDir).normalize();
            q.setFromUnitVectors(up, d);
            m4.compose(e, q, one);
            lasers.setMatrixAt(j, m4);
            laserWidthBuf.setX(j, widthPx);
            laserGainBuf.setX(j, gainVal);
            laserSheetBuf.setX(j, isSheet);
            if (groups && grp) {
              lasers.setColorAt(j, tmpC);
              laserEdgeBuf.setXYZ(j, tmpEdge.r, tmpEdge.g, tmpEdge.b);
            }
          }
          j++;
        }
      });
      lasers.instanceMatrix.needsUpdate = true;
      laserWidthBuf.needsUpdate = true;
      laserGainBuf.needsUpdate = true;
      laserSheetBuf.needsUpdate = true;
      if (groups) {
        lasers.instanceColor.needsUpdate = true;
        laserEdgeBuf.needsUpdate = true;
      }
    }
  }
  return { setNight, setLook, setCustomLook, setPrewarm, update, isNight: () => night, lookKey: () => lookKey };
}
export {
  LOOKS,
  NIGHT_LIGHT,
  setupNight
};
