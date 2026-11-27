import * as THREE from "three";
import { NIGHT_LIGHT } from "./night.js";
import { solarPosition, solarCrossing, skyMaterial, FOG_UNIFORMS, createSkyEnvironment } from "./atmosphere.js";
const WEATHER = {
  clear: { label: "晴天", clouds: 0.2, style: 0, fog: 42e-5, sun: 1 },
  hot: { label: "烈日", clouds: 0.04, style: 0, fog: 34e-5, sun: 1.12 },
  cloudy: { label: "多云", clouds: 0.8, style: 1, fog: 55e-5, sun: 0.3 },
  fog: { label: "阴天", clouds: 0.9, style: 2, fog: 6e-4, sun: 0.14 },
  rain: { label: "下雨", clouds: 0.98, style: 2, fog: 1e-3, sun: 0.07, rain: true }
};
const DAY = 24 * 60;
const NIGHT_BELOW = -8;
const TIME_RATES = [6, 24, 60];
const SUNRISE = Math.round(solarCrossing(-0.83, true)), SUNSET = Math.round(solarCrossing(-0.83, false));
const GOLDEN = Math.round(solarCrossing(4, false));
const fmt = (m) => [Math.floor(m / 60), m % 60].map((n) => String(n).padStart(2, "0")).join(":");
const TIME_JUMPS = { [SUNRISE]: `日出 ${fmt(SUNRISE)}`, 720: "正午 12:00", [GOLDEN]: `夕阳 ${fmt(GOLDEN)}`, [SUNSET]: `日落 ${fmt(SUNSET)}`, 1200: "夜晚 20:00" };
function formatSceneTime(value) {
  return fmt(Math.floor(value));
}
const C = (r, g, b) => new THREE.Color(r, g, b);
const SKY_KEYS = [
  [-10, C(4e-3, 7e-3, 0.018), C(0.012, 0.014, 0.024), C(0.03, 0.02, 0.022)],
  [-4, C(0.018, 0.032, 0.075), C(0.07, 0.062, 0.095), C(0.62, 0.24, 0.1)],
  [0, C(0.03, 0.065, 0.17), C(0.25, 0.22, 0.27), C(1.35, 0.62, 0.24)],
  [4, C(0.045, 0.1, 0.26), C(0.36, 0.35, 0.41), C(1.4, 0.88, 0.46)],
  [12, C(0.07, 0.17, 0.42), C(0.5, 0.57, 0.68), C(1.15, 0.96, 0.76)],
  [20, C(0.095, 0.215, 0.5), C(0.53, 0.62, 0.75), C(1.02, 0.96, 0.86)],
  [30, C(0.115, 0.25, 0.56), C(0.55, 0.65, 0.79), C(0.96, 0.96, 0.93)],
  [70, C(0.125, 0.27, 0.6), C(0.58, 0.69, 0.83), C(0.9, 0.92, 0.93)]
];
function skyAt(e, out) {
  let i = 0;
  while (i < SKY_KEYS.length - 2 && e > SKY_KEYS[i + 1][0]) i++;
  const a = SKY_KEYS[i], b = SKY_KEYS[i + 1], t = THREE.MathUtils.clamp((e - a[0]) / (b[0] - a[0]), 0, 1);
  for (let k = 0; k < 3; k++) out[k].copy(a[k + 1]).lerp(b[k + 1], t);
}
function sunTransmittance(e, out) {
  const el = Math.max(e, -0.5);
  const m = 1 / (Math.sin(el * Math.PI / 180) + 0.50572 * Math.pow(el + 6.07995, -1.6364));
  return out.setRGB(Math.exp(-0.025 * m), Math.exp(-0.055 * m), Math.exp(-0.12 * m));
}
const lum = (c) => 0.2126 * c.r + 0.7152 * c.g + 0.0722 * c.b;
function rainField() {
  const count = 1550, width = 88, height = 75;
  const positions = new Float32Array(count * 6);
  const drops = Array.from({ length: count }, () => ({
    x: (Math.random() - 0.5) * width,
    y: (Math.random() - 0.5) * height,
    z: (Math.random() - 0.5) * width,
    speed: 24 + Math.random() * 14,
    length: 0.38 + Math.random() * 1.08
  }));
  const geometry = new THREE.BufferGeometry();
  const position = new THREE.BufferAttribute(positions, 3).setUsage(THREE.DynamicDrawUsage);
  geometry.setAttribute("position", position);
  const material = new THREE.LineBasicMaterial({
    color: 12834535,
    transparent: true,
    opacity: 0.47,
    depthWrite: false,
    fog: false
  });
  const rain = new THREE.LineSegments(geometry, material);
  rain.frustumCulled = false;
  rain.renderOrder = 40;
  rain.visible = false;
  function update(dt, cameraPosition) {
    rain.position.copy(cameraPosition);
    for (let i = 0; i < drops.length; i++) {
      const drop = drops[i];
      drop.y -= dt * drop.speed;
      drop.x += dt * 3.8;
      if (drop.y < -height / 2) drop.y += height;
      if (drop.x > width / 2) drop.x -= width;
      const index = i * 6;
      positions[index] = drop.x;
      positions[index + 1] = drop.y;
      positions[index + 2] = drop.z;
      positions[index + 3] = drop.x - drop.length * 0.12;
      positions[index + 4] = drop.y + drop.length;
      positions[index + 5] = drop.z;
    }
    position.needsUpdate = true;
  }
  return { rain, update };
}
function createStageWeather({ scene, renderer, groundMaterials, sky, sun, hemi, night, bloomPass, gradePass, onChange }) {
  const atmosphere = skyMaterial();
  sky.material.dispose();
  sky.material = atmosphere;
  const U = atmosphere.uniforms;
  const updateEnv = renderer ? createSkyEnvironment(renderer, atmosphere) : null;
  const { rain, update: updateRain } = rainField();
  scene.add(rain);
  const nightBloom = bloomPass ? { s: bloomPass.strength, r: bloomPass.radius, t: bloomPass.threshold } : null;
  const drySurfaces = [...groundMaterials].map((material) => [material, { color: material.color.clone(), roughness: material.roughness }]);
  const solar = new THREE.Vector3(), lightOffset = new THREE.Vector3();
  const shadowRight = new THREE.Vector3(), shadowUp = new THREE.Vector3();
  const sky3 = [new THREE.Color(), new THREE.Color(), new THREE.Color()];
  const T = new THREE.Color(), tmp = new THREE.Color();
  const grey = { zen: C(0.24, 0.27, 0.32), away: C(0.35, 0.38, 0.43), sunSide: C(0.47, 0.46, 0.44) };
  let preset = "clear";
  let minute = 15 * 60, lastDaylight = minute, rate = 24, playing = false;
  let lastShownMinute = -1, envMinute = -999, envPreset = "", envClock = 0, envDirty = true;
  const state = () => ({ preset, minute, rate, playing });
  function announce() {
    lastShownMinute = Math.floor(minute);
    onChange(state(), night.isNight());
  }
  const isDark = (m) => solarPosition(m).elevation < NIGHT_BELOW;
  function applyLight() {
    const W0 = WEATHER[preset];
    const { elevation: e } = solarPosition(minute, solar);
    const dark = e < NIGHT_BELOW;
    if (dark !== night.isNight()) night.setNight(dark);
    const S = THREE.MathUtils.smoothstep;
    const cover = W0.clouds;
    const overcast = S(cover, 0.45, 0.92);
    const bright = 0.03 + 0.97 * S(e, -8, 22);
    const warm = (1 - S(e, 3, 26)) * S(e, -7, -1) * (1 - overcast * 0.75);
    const sunUp = S(e, -1.5, 1);
    skyAt(e, sky3);
    const [zen, away, sunSide] = sky3;
    zen.lerp(tmp.copy(grey.zen).multiplyScalar(bright), overcast);
    away.lerp(tmp.copy(grey.away).multiplyScalar(bright), overcast);
    sunSide.lerp(tmp.copy(grey.sunSide).multiplyScalar(bright).lerp(sunSide, warm * 0.35), overcast * 0.85);
    if (W0.rain) {
      zen.multiplyScalar(0.62);
      away.multiplyScalar(0.7);
      sunSide.multiplyScalar(0.66);
    }
    sunTransmittance(e, T);
    const tMax = Math.max(T.r, T.g, T.b);
    const sunColor = T.clone().multiplyScalar(1 / tMax);
    const direct = 3.4 * Math.pow(lum(T), 0.6) * S(e, -1, 2.5) * W0.sun;
    U.uSunDir.value.copy(solar);
    U.uSunCol.value.copy(sunColor).multiplyScalar(0.9 * S(e, -3, 1) * (1 - overcast * 0.8));
    U.uZen.value.copy(zen);
    U.uHor.value.copy(sunSide);
    U.uHorAway.value.copy(away);
    U.uWarm.value = warm;
    U.uSunUp.value = sunUp * (1 - overcast * 0.85);
    U.uCover.value = cover;
    U.uStyle.value = W0.style;
    const lit = C(1, 0.99, 0.97).lerp(sunColor, 0.55 * warm).multiplyScalar(bright * (1.05 - overcast * 0.35));
    const shade = C(0.56, 0.6, 0.67).multiplyScalar(bright * (1 - overcast * 0.25));
    if (W0.style === 1) {
      lit.setRGB(0.62, 0.64, 0.68).multiplyScalar(bright).lerp(sunColor.clone().multiplyScalar(bright), warm * 0.4);
      shade.setRGB(0.3, 0.33, 0.39).multiplyScalar(bright);
    }
    if (W0.style === 2) {
      lit.copy(grey.away).multiplyScalar(bright * 1);
      shade.copy(grey.zen).multiplyScalar(bright * 0.72);
    }
    if (W0.rain) {
      lit.multiplyScalar(0.62);
      shade.multiplyScalar(0.55);
    }
    U.uCloudLit.value.copy(lit);
    U.uCloudDark.value.copy(shade);
    U.uGround.value.setRGB(0.05, 0.055, 0.05).multiplyScalar(bright);
    if (dark) {
      lightOffset.set(-140, 260, 130);
      sun.color.set(9745386);
      sun.intensity = NIGHT_LIGHT.sun;
      hemi.intensity = NIGHT_LIGHT.hemi;
      scene.environmentIntensity = NIGHT_LIGHT.environment;
      FOG_UNIFORMS.uFogSunPow.value = 0;
      FOG_UNIFORMS.uFogFalloff.value = 1 / 400;
      if (bloomPass && nightBloom) Object.assign(bloomPass, { strength: nightBloom.s, radius: nightBloom.r, threshold: nightBloom.t, enabled: true });
      if (gradePass) grade(gradePass, { sat: 1.1, contrast: 0.14, vignette: 0.3, shadow: [1, 1, 1.02], high: [1, 1, 1] });
    } else {
      lightOffset.copy(solar).multiplyScalar(400);
      sun.color.copy(sunColor);
      sun.intensity = direct;
      hemi.color.copy(zen).lerp(away, 0.5).multiplyScalar(1 / Math.max(1e-3, Math.max(zen.r, zen.g, zen.b, away.r, away.g, away.b)));
      hemi.groundColor.setRGB(0.32, 0.3, 0.24);
      hemi.intensity = (0.1 + 0.22 * bright) * (1 + overcast * 0.8);
      scene.environmentIntensity = 0.9 + overcast * 0.05;
      scene.fog.color.copy(away);
      scene.fog.density = W0.fog * (1 + warm * 0.25);
      FOG_UNIFORMS.uFogSunDir.value.copy(solar);
      FOG_UNIFORMS.uFogSunColor.value.copy(sunSide);
      FOG_UNIFORMS.uFogSunPow.value = THREE.MathUtils.lerp(5, 1.5, overcast);
      FOG_UNIFORMS.uFogFalloff.value = 1 / 140;
      renderer && (renderer.toneMappingExposure = 0.92 + 0.22 * warm + 0.5 * (1 - S(e, -6, 10)) + 0.04 * overcast);
      if (bloomPass) Object.assign(bloomPass, { enabled: true, strength: 0.14 + 0.16 * warm, radius: 0.55, threshold: 1.5 });
      if (gradePass) {
        const g = THREE.MathUtils.lerp;
        grade(gradePass, {
          sat: g(g(1.1, 1.22, warm), 0.9, overcast),
          contrast: g(g(0.15, 0.24, warm), 0.12, overcast),
          vignette: 0.2 + 0.08 * warm,
          shadow: [g(0.98, 0.93, warm), g(1, 0.97, warm), g(1.03, 1.07, warm)],
          high: [g(1.03, 1.07, warm), 1, g(0.96, 0.9, warm)]
        });
      }
    }
    if (!dark && (envDirty || Math.abs(minute - envMinute) >= 4 || envPreset !== preset)) envDirty = true;
    sun.position.copy(sun.target.position).add(lightOffset);
    rain.visible = Boolean(W0.rain);
  }
  function grade(pass, { sat, contrast, vignette, shadow, high }) {
    const u = pass.uniforms;
    u.uSat.value = sat;
    u.uContrast.value = contrast;
    u.uVignette.value = vignette;
    u.uShadowTint.value.set(...shadow);
    u.uHighTint.value.set(...high);
  }
  function refreshEnv(force) {
    if (!updateEnv || night.isNight() || !envDirty) return;
    const now = performance.now();
    if (!force && now - envClock < 400) return;
    scene.environment = updateEnv();
    envMinute = minute;
    envPreset = preset;
    envClock = now;
    envDirty = false;
  }
  function setTime(value) {
    if (!Number.isFinite(value)) return;
    minute = (value % DAY + DAY) % DAY;
    if (!isDark(minute)) lastDaylight = minute;
    applyLight();
    refreshEnv(true);
    announce();
  }
  function setPreset(value) {
    if (!Object.hasOwn(WEATHER, value)) return;
    preset = value;
    const wet = Boolean(WEATHER[preset].rain);
    for (const [mat, original] of drySurfaces) {
      mat.color.copy(original.color).multiplyScalar(wet ? 0.78 : 1);
      mat.roughness = wet ? Math.min(original.roughness, 0.46) : original.roughness;
    }
    envDirty = true;
    applyLight();
    refreshEnv(true);
    announce();
  }
  function setRate(newRate) {
    if (!TIME_RATES.includes(newRate)) return;
    rate = newRate;
    announce();
  }
  function setPlaying(on) {
    playing = Boolean(on);
    announce();
  }
  function update(dt, elapsed, cameraPosition, clockDelta = dt) {
    if (playing && clockDelta > 0) {
      minute = (minute + rate * clockDelta) % DAY;
      if (!isDark(minute)) lastDaylight = minute;
      applyLight();
      if (lastShownMinute !== Math.floor(minute)) announce();
    }
    if (sun.castShadow) {
      const focus = sun.target.position;
      focus.set(
        cameraPosition.x - THREE.MathUtils.clamp(cameraPosition.x, -95, 95),
        0,
        cameraPosition.z - THREE.MathUtils.clamp(cameraPosition.z, -95, 95)
      );
      const { camera: shadowCamera, mapSize } = sun.shadow;
      const texel = (shadowCamera.right - shadowCamera.left) / mapSize.x;
      shadowRight.set(lightOffset.z, 0, -lightOffset.x).normalize();
      shadowUp.crossVectors(lightOffset, shadowRight).normalize();
      const right = focus.dot(shadowRight), up = focus.dot(shadowUp);
      focus.addScaledVector(shadowRight, Math.round(right / texel) * texel - right);
      focus.addScaledVector(shadowUp, Math.round(up / texel) * texel - up);
      sun.position.copy(focus).add(lightOffset);
    }
    refreshEnv(false);
    if (!night.isNight()) U.uTime.value = elapsed;
    if (gradePass) gradePass.uniforms.uTime.value = elapsed;
    if (rain.visible) updateRain(dt, cameraPosition);
  }
  function restore(saved) {
    if (!saved) return;
    setPreset(saved.preset);
    setTime(saved.minute);
    setRate(saved.rate);
    setPlaying(saved.playing);
  }
  applyLight();
  refreshEnv(true);
  announce();
  return {
    state,
    setTime,
    setPreset,
    setRate,
    setPlaying,
    update,
    restore,
    toggleNight(on) {
      if (on === night.isNight()) return;
      playing = false;
      setTime(on ? 20 * 60 : lastDaylight);
    }
  };
}
export {
  TIME_JUMPS,
  TIME_RATES,
  WEATHER,
  createStageWeather,
  formatSceneTime
};
