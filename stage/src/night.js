// 夜景与灯光：夜空、摇头灯光束、激光、LED 发光、控制塔竖条灯、观众荧光棒、泛光。
import * as THREE from 'three';
import { LAYOUT, inLawn } from './layout.js';
import { heads, MAT, glowSpots } from './venue.js';

const C = (h) => new THREE.Color(h);
export const NIGHT_LIGHT = { sun: 0.12, hemi: 0.1, environment: 0.08 };   // 月光、天光：A 区侧面夜景视频里离舞台远的地面基本是黑的，只有灯光照到的地方亮
export const LOOKS = {
  opening: { label: '开场·紫红 + 激光扇', beams: ['#b03cff', '#e040ff', '#7a5cff'], pattern: 'fan', led: '#b04cff', strips: '#ff2f6a', lasers: '#d06bff', laserOn: true, wash: '#7a2cff', haze: 1.0, beamI: 1.0, hazeI: 1.4 },
  creator: { label: '造物者·金色光束扫射', beams: ['#ffc23a', '#ffd979', '#ff9a1f'], pattern: 'sweep', led: '#ff9a2e', strips: '#ffd18a', lasers: '#ffcc55', laserOn: false, wash: '#ff7a1a', haze: 1.0, beamI: 1.2, hazeI: 0.6 },
  fire: { label: '火焰·红白强光', beams: ['#ffffff', '#ff4a2a', '#ffd0c0'], pattern: 'cross', led: '#ff2a2a', strips: '#ff2020', lasers: '#ff3030', laserOn: false, wash: '#ff1a10', haze: 1.1, pulse: true, beamI: 0.9, hazeI: 1.6, hazeC: '#ff683e' },
  blue: { label: '深蓝·烟雾冷光', beams: ['#2a7bff', '#46d4ff', '#9fd8ff'], pattern: 'fan', led: '#2a6bff', strips: '#e8f2ff', lasers: '#3ad0ff', laserOn: false, wash: '#1a3cff', haze: 0.8, beamI: 0.35, hazeI: 1.8 },
  forever: { label: 'forever·粉紫 + V 形光束', beams: ['#ff8ae0', '#ffffff', '#c86bff'], pattern: 'vee', led: '#ff4fb8', strips: '#ffffff', lasers: '#ff7ad8', laserOn: false, wash: '#ff3ab0', haze: 0.8, beamI: 0.9, hazeI: 1.0 },
};

export function setupNight({ scene, renderer, gtao, bloomPass, sky, sun, hemi }) {
  const root = new THREE.Group(); root.visible = false; scene.add(root);

  // ---------- 夜空：固定在背景深度，地平线保留淡蓝及舞台反光 ----------
  const nightSky = new THREE.Mesh(new THREE.SphereGeometry(1, 40, 24), new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, fog: false,
    uniforms: { stageColor: { value: C('#7a2cff') } },
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
      }`,
  }));
  nightSky.frustumCulled = false;
  nightSky.renderOrder = -100;
  root.add(nightSky);

  // ---------- 光束：每台摇头灯一束体积光（加色混合，边缘柔和，沿长度衰减） ----------
  const cells = new Set();
  const beamSrc = heads.filter(([x, y, z]) => {
    if (Math.abs(x) >= 62 || z >= 14) return false;
    const cell = `${Math.floor(x / 8)},${Math.floor(y / 8)},${Math.floor(z / 10)}`;
    if (cells.has(cell)) return false;
    cells.add(cell);
    return true;
  });
  const L = 104;
  const beamGeo = new THREE.CylinderGeometry(2.1, 0.085, L, 16, 1, true); beamGeo.translate(0, L / 2, 0);
  const beamMat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, forceSinglePass: true,
    uniforms: { uI: { value: 1 } },
    vertexShader: `varying vec2 vUv; varying vec3 vC; varying vec3 vN; varying vec3 vView;
      void main(){ vUv = uv;
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
      varying vec2 vUv; varying vec3 vC; varying vec3 vN; varying vec3 vView;
      void main(){
        float nLen = length(vN), vLen = length(vView);
        float edge = (nLen > 1e-4 && vLen > 1e-4) ? abs(dot(vN / nLen, vView / vLen)) : 0.0;
        float fall = pow(max(1.0 - vUv.y, 1e-4), 2.4);
        vec3 col = clamp(vC, 0.0, 4.0);
        float alpha = clamp(0.25 * uI * fall * edge * edge, 0.0, 1.0);
        gl_FragColor = vec4(col, alpha);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
  });
  const beams = new THREE.InstancedMesh(beamGeo, beamMat, beamSrc.length);
  beams.frustumCulled = false; beams.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  for (let i = 0; i < beamSrc.length; i++) beams.setColorAt(i, C('#ffffff'));
  root.add(beams);

  // ---------- 激光：舞台前沿、吊盘和两侧屏塔上的激光器，每台打出一把细线扇；支持每组独立颜色/扇角/仰角/扫射 ----------
  const emitters = [];
  const emitterZones = [];
  const MS = LAYOUT.mainStage;
  for (const [x, z, y, zone] of [
    [-30, MS.z1 - 0.5, MS.h + 0.5, 'stageLeft'],
    [-16, MS.z1 - 0.5, MS.h + 0.5, 'stageLeft'],
    [16, MS.z1 - 0.5, MS.h + 0.5, 'stageRight'],
    [30, MS.z1 - 0.5, MS.h + 0.5, 'stageRight'],
    [-10, LAYOUT.frame.depth / 2 + 1, LAYOUT.frame.legHeight + 1, 'canopy'],
    [10, LAYOUT.frame.depth / 2 + 1, LAYOUT.frame.legHeight + 1, 'canopy'],
    [-39, LAYOUT.prisms.rowZ, LAYOUT.prisms.height + 3, 'towerLeft'],
    [39, LAYOUT.prisms.rowZ, LAYOUT.prisms.height + 3, 'towerRight'],
  ]) {
    emitters.push(new THREE.Vector3(x, y, z));
    emitterZones.push(zone);
  }
  const PER = 6, LL = 260;
  // 激光用有最小像素宽度的带状面，防止细线在远处随着镜头移动断开；支持实例颜色（左右/不同灯组可同时打出不同色激光）
  const laserMat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, forceSinglePass: true,
    uniforms: { color: { value: C('#ffffff') }, uI: { value: 1.0 }, resolution: { value: new THREE.Vector2() }, nearClip: { value: 0.3 }, shaftLength: { value: LL } },
    vertexShader: `uniform vec2 resolution;
      uniform float nearClip, shaftLength;
      varying float across, along;
      varying vec3 vColor;
      void main(){
        #ifdef USE_INSTANCING_COLOR
          vColor = instanceColor;
        #else
          vColor = vec3(1.0);
        #endif
        mat4 transform = modelViewMatrix * instanceMatrix;
        vec4 start = transform * vec4(0.0, 0.0, 0.0, 1.0);
        vec4 end = transform * vec4(0.0, shaftLength, 0.0, 1.0);
        float z = -nearClip * 1.01;
        across = position.x;
        along = uv.y;
        if ((start.z >= z && end.z >= z) || abs(end.z - start.z) < 1e-4) {
          gl_Position = vec4(2.0, 2.0, 2.0, 1.0);
          return;
        }
        if (start.z > z) {
          float cut = clamp((z - start.z) / (end.z - start.z), 0.0, 1.0);
          start = mix(start, end, cut);
          along = mix(cut, 1.0, along);
        } else if (end.z > z) {
          float cut = clamp((z - start.z) / (end.z - start.z), 0.0, 1.0);
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
        gl_Position.xy += crossLine * (2.8 / max(resolution, vec2(1.0))) * across * gl_Position.w;
      }`,
    fragmentShader: `uniform vec3 color;
      uniform float uI;
      varying float across, along;
      varying vec3 vColor;
      void main(){
        float edge = 1.0 - smoothstep(0.0, 1.0, abs(across));
        float core = 1.0 - smoothstep(0.0, 0.35, abs(across));
        vec3 col = clamp(color * vColor * (0.85 + 0.55 * core), 0.0, 6.0);
        float a = clamp(0.34 * uI * edge * (1.0 - smoothstep(0.12, 1.0, along)), 0.0, 1.0);
        gl_FragColor = vec4(col, a);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
  });
  const laserGeo = new THREE.PlaneGeometry(2, 1);
  const lasers = new THREE.InstancedMesh(laserGeo, laserMat, emitters.length * PER);
  for (let i = 0; i < emitters.length * PER; i++) lasers.setColorAt(i, C('#ffffff'));
  lasers.frustumCulled = false; root.add(lasers);

  // ---------- 观众荧光棒：内场和草坪上的红色光点，缓慢闪烁 ----------
  const pts = [], r = (() => { let s = 7; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); })();
  const P = LAYOUT.ground.pit, CY = LAYOUT.cylinder;
  const [centralAisle, , , , towerSide] = LAYOUT.abBoundaryRuns;
  const [stageAisle] = LAYOUT.stageAisleRuns;
  const [aisleEdge, aisleOtherEdge] = LAYOUT.innerBoundaryRuns;
  const within = (x, z, [side, from, , to]) => Math.abs(x) < Math.abs(side) && z >= from && z <= to;
  const blocked = (x, z) => Math.hypot(x - CY.x, z - CY.z) < 13 || Math.hypot(x, z) < 15
    || within(x, z, centralAisle) || within(x, z, towerSide) || within(x, z, stageAisle)
    || (z >= aisleEdge[1] && z <= aisleOtherEdge[1]) || (Math.abs(Math.abs(x) - 92) < 8 && z < 30);
  for (let i = 0; i < 18000; i++) { const x = P.x0 + 2 + r() * (P.x1 - P.x0 - 4), z = P.z0 + 2 + r() * (P.z1 - P.z0 - 4); if (!blocked(x, z)) pts.push(x, 1.4 + r() * 0.4, z, r()); }
  const LW = LAYOUT.ground.lawn; for (let i = 0; i < 30000; i++) { const x = LW.x0 + r() * (LW.x1 - LW.x0), z = LW.z0 + r() * (LW.z1 - LW.z0); if (inLawn(x, z)) pts.push(x, 1.4 + r() * 0.4, z, r()); }
  const pg = new THREE.BufferGeometry();
  const pos = new Float32Array(pts.length / 4 * 3), ph = new Float32Array(pts.length / 4);
  for (let i = 0; i < pts.length / 4; i++) { pos.set(pts.slice(i * 4, i * 4 + 3), i * 3); ph[i] = pts[i * 4 + 3]; }
  pg.setAttribute('position', new THREE.BufferAttribute(pos, 3)); pg.setAttribute('phase', new THREE.BufferAttribute(ph, 1));
  const crowdMat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    uniforms: { uT: { value: 0 }, uC: { value: C('#ff2a3a') }, uScale: { value: 1 }, uAlpha: { value: 1 } },
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
      }`,
  });
  root.add(new THREE.Points(pg, crowdMat));

  // ---------- 补光：几盏彩色点光源，把结构照出颜色 ----------
  const washes = [];
  for (const [x, y, z, inten] of [[-25, 12, -42, 1800], [25, 12, -42, 1800], [0, 16, 4, 1000], [0, 6, 48, 300], [-70, 12, -5, 600], [70, 12, -5, 600], [-30, 30, -62, 1500], [30, 30, -62, 1500]]) {
    const l = new THREE.PointLight(0xffffff, inten, 120, 2); l.position.set(x, y, z); l.userData.baseIntensity = inten; root.add(l); washes.push(l);
  }

  // ---------- 舞台烟雾：一层被灯光照亮的柔和光晕（加色贴片，颜色随灯光风格变） ----------
  const hazeTex = (() => { const c = document.createElement('canvas'); c.width = c.height = 128; const g = c.getContext('2d');
    const gr = g.createRadialGradient(64, 64, 0, 64, 64, 64); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.4, 'rgba(255,255,255,0.35)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = gr; g.fillRect(0, 0, 128, 128); const t = new THREE.CanvasTexture(c); return t; })();
  const hazes = [
    [-42, 8, -44, 56], [0, 12, -49, 66], [42, 8, -44, 56],
    [-25, 7, -19, 42], [25, 7, -19, 42], [0, 7, 4, 51],
  ].map(([x, y, z, width]) => {
    const material = new THREE.SpriteMaterial({ map: hazeTex, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, fog: false });
    const sprite = new THREE.Sprite(material);
    sprite.position.set(x, y, z);
    sprite.scale.set(width, width * 0.50, 1);
    root.add(sprite);
    return sprite;
  });

  const footGlowMat = new THREE.SpriteMaterial({ map: hazeTex, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, fog: false });
  { const CS = LAYOUT.circleStage, FL = CS.footlights;
    for (let i = 0; i < FL.count; i++) {
      const a = ((i + 0.5) * Math.PI) / FL.count, sp = new THREE.Sprite(footGlowMat);
      sp.position.set(CS.x + Math.cos(a) * (FL.r + 0.15), 0.45, CS.z + Math.sin(a) * (FL.r + 0.15)); sp.scale.set(1.5, 1.5, 1); root.add(sp);
    } }

  // ---------- 立柱上成列的灯（沙漏塔龙门架）：每颗一个光晕，颜色跟灯光主题走 ----------
  const spotGlowMat = new THREE.SpriteMaterial({ map: hazeTex, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, fog: false });
  for (const [x, y, z, d] of glowSpots) { const sp = new THREE.Sprite(spotGlowMat); sp.position.set(x, y, z); sp.scale.set(d, d, 1); root.add(sp); }

  // ---------- 收集要在夜里发光的材质（LED 屏、彩窗、灯具） ----------
  const glow = [];
  scene.traverse((o) => { if (!o.material) return; for (const m of [].concat(o.material)) if (m.emissiveMap && !glow.includes(m)) glow.push(m); });
  for (const m of glow) m.userData.day = { i: m.emissiveIntensity, c: m.emissive.clone(), map: m.map, emap: m.emissiveMap };
  // 材质的 userData.nightMap（一张贴图）：夜里把 map 和 emissiveMap 换成它（屏幕白天/夜里放不同画面时用）
  const fixtures = [MAT.lens, MAT.ledWhite, MAT.ledStrip, MAT.whiteLine];
  const tinted = [MAT.matrixLens, MAT.hgLed, MAT.controlTowerLed, MAT.warm, MAT.spire].filter(Boolean);
  for (const m of tinted) m.userData.day = { i: m.emissiveIntensity, c: m.emissive.clone() };
  for (const m of fixtures) m.userData.day = { i: m.emissiveIntensity, c: m.emissive.clone() };

  // ---------- 状态 ----------
  let night = false, look = LOOKS.opening, lookKey = 'opening', customLook = null;
  const day = { exp: renderer.toneMappingExposure, sun: sun.intensity, sunC: sun.color.clone(), shadow: sun.castShadow, hemi: hemi.intensity, env: scene.environmentIntensity, fog: scene.fog.color.clone(), fogD: scene.fog.density };
  const activeLook = () => customLook || look;

  function setNight(on) {
    night = on; root.visible = on; sky.visible = !on;
    if (gtao) gtao.enabled = !on;
    if (bloomPass) bloomPass.enabled = on;
    sun.castShadow = day.shadow && !on;
    sun.intensity = on ? NIGHT_LIGHT.sun : day.sun; sun.color.copy(on ? C('#8fa6ff') : day.sunC);
    hemi.intensity = on ? NIGHT_LIGHT.hemi : day.hemi;
    scene.environmentIntensity = on ? NIGHT_LIGHT.environment : day.env;
    scene.fog.color.copy(on ? C('#040406') : day.fog); scene.fog.density = on ? 0.0022 : day.fogD;
    renderer.toneMappingExposure = on ? 1.0 : day.exp;
    applyLook();
  }
  function setLook(key) { if (LOOKS[key]) { look = LOOKS[key]; lookKey = key; customLook = null; applyLook(); } }
  function setCustomLook(spec) { customLook = spec ? { ...LOOKS.opening, ...spec } : null; applyLook(); }
  function applyLook() {
    const L = activeLook();
    const tint = C(L.led);
    const stripCol = C(L.strips);
    const hgCol = C(L.hgColor || L.strips);
    const ctrlCol = C(L.towerStrips || L.strips);
    for (const m of glow) {
      const d = m.userData.day;
      if (m.userData.showControlled) continue;
      if (m.userData.nightMap) { const t = night ? m.userData.nightMap : null; m.map = t || d.map; m.emissiveMap = t || d.emap; }
      if (!night) { m.emissiveIntensity = d.i; m.emissive.copy(d.c); }
      else if (m.userData.nightMap) { m.emissiveIntensity = 0.9; m.emissive.set('#ffffff'); }
      else if (m.userData.nightStrips) { m.emissiveIntensity = 1.45 * (L.stripI ?? 1); m.emissive.copy(stripCol); }
      else { m.emissiveIntensity = 0.8; m.emissive.copy(C('#ffffff')).lerp(tint, 0.45); }
    }
    for (const m of fixtures) { const d = m.userData.day; m.emissiveIntensity = night ? d.i * 1.6 : d.i; }
    MAT.ledStrip.emissive.copy(night ? stripCol : C('#ff2f55'));
    for (const m of tinted) {
      const d = m.userData.day;
      const col = m === MAT.hgLed ? hgCol : m === MAT.controlTowerLed ? ctrlCol : m === MAT.warm ? stripCol : tint;
      m.emissiveIntensity = night ? (m === MAT.warm ? 7 : 2.2) * (L.stripI ?? 1) : d.i;
      m.emissive.copy(night ? col.clone().lerp(C('#ffffff'), m === MAT.warm ? 0.55 : 0.35) : d.c);
    }
    footGlowMat.color.copy(stripCol.clone().lerp(C('#fff4dc'), 0.55)).multiplyScalar(1.6 * (L.stripI ?? 1));
    const b0 = Array.isArray(L.beams) && L.beams.length ? L.beams[0] : '#ffffff';
    spotGlowMat.color.copy(C(b0).lerp(C('#ffffff'), 0.5)).multiplyScalar(1.4);
    const laserGroups = L.laserGroups;
    lasers.visible = Boolean(L.laserOn || (Array.isArray(laserGroups) && laserGroups.length > 0));
    if (Array.isArray(laserGroups) && laserGroups.length > 0) {
      laserMat.uniforms.color.value.set('#ffffff').multiplyScalar(1.8);
      laserMat.uniforms.uI.value = L.laserI ?? 1.15;
    } else {
      laserMat.uniforms.color.value.set(L.lasers || '#ffffff').multiplyScalar(1.7);
      laserMat.uniforms.uI.value = L.laserI ?? 1.0;
      for (let i = 0; i < emitters.length * PER; i++) lasers.setColorAt(i, C('#ffffff'));
      lasers.instanceColor.needsUpdate = true;
    }
    const washColors = Array.isArray(L.wash) ? L.wash : [L.wash, L.wash, L.wash];
    const washI = L.washI ?? 1.0;
    nightSky.material.uniforms.stageColor.value.set(washColors[1] || washColors[0] || '#7a2cff').multiplyScalar(washI);
    for (const l of washes) {
      const col = l.position.x < -8 ? washColors[0] : l.position.x > 8 ? (washColors[2] || washColors[0]) : (washColors[1] || washColors[0]);
      l.color.copy(C(col || '#ffffff'));
      l.intensity = (l.userData.baseIntensity || 1000) * washI;
    }
    for (const haze of hazes) haze.material.color.set(L.hazeC || washColors[1] || washColors[0] || '#7a2cff').lerp(C('#cad8ff'), 0.12);
    const beamPalette = Array.isArray(L.beams) && L.beams.length ? L.beams : ['#ffffff'];
    const beamLeft = L.beamLeft ? C(L.beamLeft) : null;
    const beamRight = L.beamRight ? C(L.beamRight) : null;
    beamSrc.forEach(([x], i) => {
      if (beamLeft && x < -6) beams.setColorAt(i, beamLeft);
      else if (beamRight && x > 6) beams.setColorAt(i, beamRight);
      else beams.setColorAt(i, C(beamPalette[i % beamPalette.length]));
    });
    beams.instanceColor.needsUpdate = true;
    beamMat.uniforms.uI.value = (L.beamI ?? 1) * (L.haze ?? 1);
    crowdMat.uniforms.uC.value.set(L.crowdGlow || '#ff2a3a');
    crowdMat.uniforms.uAlpha.value = L.crowdGlowI ?? 1.0;
  }

  // ---------- 每帧：光束方向、多组激光扇、频闪与呼吸 ----------
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), up = new THREE.Vector3(0, 1, 0), d = new THREE.Vector3(), one = new THREE.Vector3(1, 1, 1), zero = new THREE.Vector3(0, 0, 0), hiddenPos = new THREE.Vector3(0, -9999, 0), p = new THREE.Vector3();
  const forward = new THREE.Vector3();
  const stageC = new THREE.Vector3(0, 1.5, 0);
  function aim(L, i, x, y, z, hang, t) {
    const side = Math.sign(x) || 1, k = i * 0.37, sp = L.beamSpeed ?? 1.0, tt = t * sp;
    switch (L.pattern) {
      case 'fan': { const a = (x / 50) * 0.55 + Math.sin(tt * 0.6 + k * 0.2) * 0.18; d.set(Math.sin(a), Math.cos(a), 0.22 + 0.1 * Math.sin(tt * 0.4)); break; }
      case 'vee': { const a = side * (0.25 + 0.2 * Math.sin(tt * 0.8 + (k % 2) * 3.1)); d.set(Math.sin(a), Math.cos(a), 0.15); break; }
      case 'sweep': { const a = Math.sin(tt * 0.9 + x * 0.02) * 0.7; d.set(Math.sin(a), 0.85, 0.35 + 0.15 * Math.cos(tt * 0.7)); break; }
      case 'cross': { const a = -side * (0.3 + 0.2 * Math.sin(tt * 1.3 + k)); d.set(Math.sin(a), 0.95, 0.25); break; }
      case 'vertical': { const a = Math.sin(tt * 0.4 + k) * 0.05; d.set(Math.sin(a), 1.0, 0.06); break; }
      case 'cone': { const ang = tt * 0.7 + k; d.set(Math.cos(ang) * 0.38, 0.88, Math.sin(ang) * 0.38 + 0.18); break; }
      case 'down': { if (hang) { d.copy(stageC).sub(p.set(x, y, z)).normalize(); d.x += Math.sin(tt + k) * 0.15; } else { const a = Math.sin(tt * 0.5 + k) * 0.5; d.set(Math.sin(a), 0.9, 0.2); } break; }
      default: d.set(0, 1, 0);
    }
    if (hang && L.pattern !== 'down' && L.pattern !== 'vertical') d.y = Math.abs(d.y) * 0.6 + 0.2;
    return d.normalize();
  }
  function update(t, camera) {
    if (!night) return;
    const L = activeLook();
    crowdMat.uniforms.uT.value = t;
    crowdMat.uniforms.uScale.value = renderer.getPixelRatio();
    const pulse = L.pulse ? 0.89 + 0.11 * Math.cos(t * 3.0) : 1;
    const strobe = L.strobe > 0 ? (Math.sin(t * L.strobe * Math.PI * 2) > 0 ? 1.35 : 0.15) : 1;
    beamMat.uniforms.uI.value = (L.beamI ?? 1) * (L.haze ?? 1) * pulse * strobe;
    beamSrc.forEach(([x, y, z, hang], i) => {
      aim(L, i, x, y, z, hang, t);
      q.setFromUnitVectors(up, d);
      m4.compose(p.set(x, y, z), q, one); beams.setMatrixAt(i, m4);
    });
    beams.instanceMatrix.needsUpdate = true;
    camera.getWorldDirection(forward);
    for (const haze of hazes) {
      const depth = p.copy(haze.position).sub(camera.position).dot(forward);
      haze.material.opacity = 0.074 * (L.hazeI ?? 1) * THREE.MathUtils.smoothstep(depth, 6, 23);
    }
    if (lasers.visible) {
      renderer.getDrawingBufferSize(laserMat.uniforms.resolution.value);
      laserMat.uniforms.nearClip.value = camera.near;
      const groups = Array.isArray(L.laserGroups) && L.laserGroups.length > 0 ? L.laserGroups : null;
      const tmpC = C('#ffffff');
      let j = 0;
      emitters.forEach((e, ei) => {
        const zone = emitterZones[ei];
        const grp = groups ? (groups.find((g) => g.emitter === zone || g.emitter === 'all') || null) : { color: null, spread: 1.3, pitch: 0.55, sweep: 0.5, speed: 0.8, zDir: 0.8, on: true };
        const active = grp && grp.on !== false && (!(grp.strobe > 0) || Math.sin(t * grp.strobe * Math.PI * 2 + ei) > -0.15);
        const spreadAmt = grp?.spread ?? 1.25;
        const pitchBase = grp?.pitch ?? 0.55;
        const sweepAmt = grp?.sweep ?? 0.45;
        const speed = grp?.speed ?? 0.8;
        const aimBias = grp?.aimBias ?? 0;
        const zDir = grp?.zDir ?? 0.8;
        if (groups && grp?.color) tmpC.set(grp.color);
        for (let k = 0; k < PER; k++) {
          if (!active) {
            q.identity();
            m4.compose(hiddenPos, q, zero);
            lasers.setMatrixAt(j, m4);
          } else {
            const spread = ((k / (PER - 1)) - 0.5) * spreadAmt + aimBias;
            const sweep = Math.sin(t * speed + ei * 0.9) * sweepAmt;
            d.set(Math.sin(spread + sweep), Math.max(0.08, pitchBase + 0.18 * Math.sin(t * (speed * 0.75) + ei * 1.7)), zDir).normalize();
            q.setFromUnitVectors(up, d);
            m4.compose(e, q, one);
            lasers.setMatrixAt(j, m4);
            if (groups && grp?.color) lasers.setColorAt(j, tmpC);
          }
          j++;
        }
      });
      lasers.instanceMatrix.needsUpdate = true;
      if (groups) lasers.instanceColor.needsUpdate = true;
    }
  }
  return { setNight, setLook, setCustomLook, update, isNight: () => night, lookKey: () => lookKey };
}
