import * as THREE from "three";
import { ShaderPass } from "three/addons/postprocessing/ShaderPass.js";
const SITE_SUN = { lat: 32.05, lon: 118.98, zone: 120, azimuthToScene: -101, day: 275 };
const RAD = Math.PI / 180;
function compassBearing(dx, dz) {
  return THREE.MathUtils.euclideanModulo(Math.atan2(dz, dx) / RAD - SITE_SUN.azimuthToScene, 360);
}
function solarPosition(minute, out = new THREE.Vector3(), day = SITE_SUN.day) {
  const B = 360 / 365 * (day - 81) * RAD;
  const eot = 9.87 * Math.sin(2 * B) - 7.53 * Math.cos(B) - 1.5 * Math.sin(B);
  const decl = 23.44 * Math.sin(B) * RAD;
  const solarMinute = minute + 4 * (SITE_SUN.lon - SITE_SUN.zone) + eot;
  const H = (solarMinute / 60 - 12) * 15 * RAD;
  const lat = SITE_SUN.lat * RAD;
  const el = Math.asin(Math.sin(lat) * Math.sin(decl) + Math.cos(lat) * Math.cos(decl) * Math.cos(H));
  const az = Math.atan2(Math.sin(H), Math.cos(H) * Math.sin(lat) - Math.tan(decl) * Math.cos(lat)) + Math.PI;
  const t = az + SITE_SUN.azimuthToScene * RAD;
  out.set(Math.cos(t) * Math.cos(el), Math.sin(el), Math.sin(t) * Math.cos(el));
  return { elevation: el / RAD, azimuth: az / RAD };
}
function solarCrossing(h, rising, day = SITE_SUN.day) {
  let lo = rising ? 0 : 720, hi = rising ? 720 : 1440;
  for (let i = 0; i < 40; i++) {
    const mid = (lo + hi) / 2, e = solarPosition(mid, void 0, day).elevation;
    if (e < h === rising) lo = mid;
    else hi = mid;
  }
  return (lo + hi) / 2;
}
function noiseTexture() {
  const size = 256, data = new Uint8Array(size * size * 4);
  let s = 2654435769;
  const rnd = () => {
    s ^= s << 13;
    s >>>= 0;
    s ^= s >>> 17;
    s ^= s << 5;
    s >>>= 0;
    return s / 4294967296;
  };
  for (let i = 0; i < size * size; i++) {
    data[i * 4] = rnd() * 256;
    data[i * 4 + 1] = rnd() * 256;
    data[i * 4 + 2] = rnd() * 256;
    data[i * 4 + 3] = 255;
  }
  const t = new THREE.DataTexture(data, size, size, THREE.RGBAFormat);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.magFilter = t.minFilter = THREE.LinearFilter;
  t.generateMipmaps = false;
  t.needsUpdate = true;
  return t;
}
function skyMaterial() {
  return new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    fog: false,
    toneMapped: false,
    uniforms: {
      tNoise: { value: noiseTexture() },
      uTime: { value: 0 },
      uEnv: { value: 0 },
      uSunDir: { value: new THREE.Vector3(0, 1, 0) },
      uSunCol: { value: new THREE.Color(1, 1, 1) },
      uZen: { value: new THREE.Color() },
      uHor: { value: new THREE.Color() },
      uHorAway: { value: new THREE.Color() },
      uWarm: { value: 0 },
      uSunUp: { value: 1 },
      uCover: { value: 0.2 },
      uStyle: { value: 0 },
      uCloudLit: { value: new THREE.Color(1, 1, 1) },
      uCloudDark: { value: new THREE.Color(0.5, 0.55, 0.6) },
      uGround: { value: new THREE.Color(0.06, 0.065, 0.06) }
    },
    vertexShader: `
      varying vec3 vDir;
      void main(){
        vDir = position;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        gl_Position.z = gl_Position.w;
      }`,
    fragmentShader: `
      precision highp float;
      varying vec3 vDir;
      uniform sampler2D tNoise;
      uniform float uTime, uEnv, uWarm, uSunUp, uCover, uStyle;
      uniform vec3 uSunDir, uSunCol, uZen, uHor, uHorAway, uCloudLit, uCloudDark, uGround;
      float n2(vec2 p){ vec2 i = floor(p), f = fract(p); f = f*f*(3.0-2.0*f); return texture2D(tNoise, (i + f + 0.5) / 256.0).r; }
      float fbm5(vec2 p){ float a = 0.5, s = 0.0; for (int i = 0; i < 5; i++){ s += a * n2(p); p = mat2(1.6, 1.2, -1.2, 1.6) * p + 17.3; a *= 0.5; } return s / 0.96875; }
      float fbm3(vec2 p){ float a = 0.5, s = 0.0; for (int i = 0; i < 3; i++){ s += a * n2(p); p = mat2(1.6, 1.2, -1.2, 1.6) * p + 17.3; a *= 0.5; } return s / 0.875; }
      float towardSun(vec3 d){ return clamp(dot(normalize(d.xz + vec2(1e-5)), normalize(uSunDir.xz + vec2(1e-5))) * 0.5 + 0.5, 0.0, 1.0); }
      vec3 horizonColor(vec3 d){
        float ts = towardSun(d);
        vec3 c = mix(uHorAway, uHor, pow(ts, 3.0));
        c = mix(c, max(c, uSunCol * vec3(1.15, 0.82, 0.55) * 1.6), pow(ts, 24.0) * uWarm);
        return c;
      }
      void main(){
        vec3 d = normalize(vDir);
        float h = max(d.y, 0.0);
        float mu = dot(d, uSunDir);
        float s = max(mu, 0.0);
        float ts = towardSun(d);

        vec3 hc = horizonColor(d);
        vec3 col = mix(hc, uZen, pow(smoothstep(0.0, 0.55, h), 0.4));
        float band = uWarm * exp(-h * 8.0) * (0.15 + 0.85 * pow(ts, 4.0));
        col = mix(col, hc * 1.08, band);
        col += uSunCol * (pow(s, 6.0) * 0.10 + pow(s, 48.0) * mix(0.38, 0.22, uWarm) + pow(s, 500.0) * mix(1.6, 0.48, uWarm)) * uSunUp;

        float cov = 0.0, thick = 0.0, relief = 0.5, dens = 0.0, patchy = 1.0;
        if (uCover > 0.001 && d.y > -0.02) {
          vec2 uv = d.xz / (h + 0.085);
          vec2 wind = vec2(0.010, -0.006) * uTime;
          float freq = mix(0.55, 2.6, clamp(uStyle, 0.0, 1.0)) * mix(1.0, 0.3, clamp(uStyle - 1.0, 0.0, 1.0));
          vec2 q = uv * freq + wind;
          float warp = fbm3(q * 0.45 + 7.1);
          vec2 qq = q + (warp - 0.5) * mix(1.2, 0.6, clamp(uStyle - 1.0, 0.0, 1.0));
          dens = fbm5(qq);
          float cells = uStyle > 0.5 && uStyle < 1.5 ? fbm3(qq * 4.5 + 3.0) : 0.5;
          float body = mix(dens, dens * 0.55 + cells * 0.6 - 0.05, clamp(1.0 - abs(uStyle - 1.0), 0.0, 1.0));
          float thr = mix(0.70, 0.22, uCover);
          float soft = mix(0.16, 0.42, clamp(uStyle - 1.0, 0.0, 1.0));
          cov = smoothstep(thr, thr + soft, body) * smoothstep(-0.02, 0.12, h + 0.02 * uCover);
          vec2 sd = normalize(uSunDir.xz + vec2(1e-5));
          float densS = fbm5(qq + sd * 0.2);
          relief = clamp((dens - densS) * 4.5 + 0.5, 0.0, 1.0);
          thick = smoothstep(thr, thr + 0.45, body);
          if (uStyle > 1.5) patchy = 0.72 + 0.56 * fbm3(qq * 1.6 + 11.0);
        }
        if (cov > 0.0) {
          vec3 cloud = mix(uCloudLit, uCloudDark, thick * 0.85);
          cloud *= 0.62 + 0.62 * relief;
          cloud *= patchy;
          float rim = cov * (1.0 - cov) * 4.0;
          cloud += uSunCol * (pow(s, 5.0) * 0.55 * (1.0 - thick) + rim * pow(s, 3.0) * 0.45) * uSunUp;
          float under = uWarm * (pow(ts, 2.2) * exp(-h * 3.2)) * (0.35 + 1.1 * relief * relief);
          cloud = mix(cloud, uHor * 1.25 + uSunCol * 0.35, clamp(under, 0.0, 1.0) * 0.85);
          cloud = mix(cloud, hc * 0.7 + cloud * 0.3, exp(-h * 10.0));
          col = mix(col, cloud, cov * 0.97);
        }

        float disk = smoothstep(0.99990, 0.99996, mu);
        col += uSunCol * vec3(1.0, 0.92, 0.80) * disk * mix(60.0, 16.0, uWarm) * (1.0 - cov * 0.95) * (1.0 - uEnv) * smoothstep(-0.01, 0.01, uSunDir.y);

        if (d.y < 0.0) {
          float t = clamp(-d.y * 6.0, 0.0, 1.0);
          col = mix(hc, uGround + hc * 0.25, smoothstep(0.0, 1.0, t));
        }
        col = mix(col, min(col, vec3(4.0)), uEnv);
        gl_FragColor = vec4(max(col, vec3(0.0)), 1.0);
      }`
  });
}
const FOG_UNIFORMS = {
  uFogSunDir: { value: new THREE.Vector3(0, 1, 0) },
  uFogSunColor: { value: new THREE.Color(1, 1, 1) },
  uFogSunPow: { value: 0 },
  uFogFalloff: { value: 0 }
};
THREE.ShaderChunk.fog_pars_vertex = `
#ifdef USE_FOG
	varying float vFogDepth;
	varying vec3 vFogRay;
#endif`;
THREE.ShaderChunk.fog_vertex = `
#ifdef USE_FOG
	vFogDepth = - mvPosition.z;
	vFogRay = transpose( mat3( viewMatrix ) ) * mvPosition.xyz;
#endif`;
THREE.ShaderChunk.fog_pars_fragment = `
#ifdef USE_FOG
	uniform vec3 fogColor;
	varying float vFogDepth;
	varying vec3 vFogRay;
	uniform vec3 uFogSunDir;
	uniform vec3 uFogSunColor;
	uniform float uFogSunPow;
	uniform float uFogFalloff;
	#ifdef FOG_EXP2
		uniform float fogDensity;
	#else
		uniform float fogNear;
		uniform float fogFar;
	#endif
#endif`;
THREE.ShaderChunk.fog_fragment = `
#ifdef USE_FOG
	float fogDist = length( vFogRay );
	vec3 fogDir = vFogRay / max( fogDist, 1e-3 );
	float fogH = 1.0;
	if ( uFogFalloff > 1e-6 ) {
		float fa = uFogFalloff * max( cameraPosition.y, 0.0 );
		float fb = uFogFalloff * max( cameraPosition.y + vFogRay.y, 0.0 );
		fogH = abs( fb - fa ) > 1e-4 ? ( exp( - fa ) - exp( - fb ) ) / ( fb - fa ) : exp( - fa );
	}
	#ifdef FOG_EXP2
		float fogFactor = 1.0 - exp( - fogDensity * fogDensity * fogDist * fogDist * fogH );
	#else
		float fogFactor = smoothstep( fogNear, fogFar, vFogDepth );
	#endif
	float fogSun = uFogSunPow > 0.0 ? pow( max( dot( fogDir, uFogSunDir ), 1e-4 ), uFogSunPow ) * step( 0.0, dot( fogDir, uFogSunDir ) ) : 0.0;
	gl_FragColor.rgb = mix( gl_FragColor.rgb, mix( fogColor, uFogSunColor, fogSun ), fogFactor );
#endif`;
function patchFogMaterials(root) {
  root.traverse((o) => {
    for (const m of [].concat(o.material || [])) {
      if (!m || m.userData.atmoFog || m.isShaderMaterial || !m.fog) continue;
      const prev = m.onBeforeCompile, key = m.customProgramCacheKey();
      const landmark = m.userData.illuminatedLandmark === true;
      m.onBeforeCompile = function(shader, renderer) {
        prev.call(this, shader, renderer);
        Object.assign(shader.uniforms, FOG_UNIFORMS);
        if (landmark) {
          const fog = THREE.ShaderChunk.fog_fragment.replace(
            "fogDensity * fogDensity * fogDist",
            "fogDensity * fogDensity * mix(0.12, 1.0, step(0.004, uFogFalloff)) * fogDist"
          );
          shader.fragmentShader = shader.fragmentShader.replace("#include <fog_fragment>", fog);
        }
      };
      m.customProgramCacheKey = () => `atmo|${landmark ? "landmark|" : ""}${key}`;
      m.userData.atmoFog = true;
      m.needsUpdate = true;
    }
  });
}
function createSkyEnvironment(renderer, skyMat) {
  const pm = new THREE.PMREMGenerator(renderer);
  const envMat = skyMat.clone();
  envMat.uniforms = THREE.UniformsUtils.clone(skyMat.uniforms);
  envMat.uniforms.tNoise.value = skyMat.uniforms.tNoise.value;
  envMat.uniforms.uEnv.value = 1;
  const envScene = new THREE.Scene();
  const box = new THREE.Mesh(new THREE.BoxGeometry(100, 100, 100), envMat);
  box.frustumCulled = false;
  envScene.add(box);
  let rt = null;
  return function update() {
    for (const k of Object.keys(skyMat.uniforms)) if (k !== "uEnv" && k !== "tNoise") {
      const v = skyMat.uniforms[k].value, dst = envMat.uniforms[k];
      if (v && v.copy) dst.value.copy(v);
      else dst.value = v;
    }
    const next = pm.fromScene(envScene, 0, 0.1, 200);
    if (rt) rt.dispose();
    rt = next;
    return rt.texture;
  };
}
function createGradePass() {
  return new ShaderPass({
    uniforms: {
      tDiffuse: { value: null },
      uShadowTint: { value: new THREE.Vector3(0.98, 1, 1.03) },
      uHighTint: { value: new THREE.Vector3(1.03, 1, 0.96) },
      uContrast: { value: 0.16 },
      uSat: { value: 1.1 },
      uVignette: { value: 0.22 },
      uGrain: { value: 0.012 },
      uTime: { value: 0 }
    },
    vertexShader: "varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }",
    fragmentShader: `
      uniform sampler2D tDiffuse; uniform vec3 uShadowTint, uHighTint; uniform float uContrast, uSat, uVignette, uGrain, uTime;
      varying vec2 vUv;
      float hash(vec2 p){ vec3 p3 = fract(vec3(p.xyx) * 0.1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }
      void main(){
        vec4 src = texture2D(tDiffuse, vUv);
        vec3 col = src.rgb;
        float l = dot(col, vec3(0.2126, 0.7152, 0.0722));
        col *= mix(uShadowTint, uHighTint, smoothstep(0.04, 0.6, l));
        col = mix(col, col * col * (3.0 - 2.0 * col), uContrast);
        l = dot(col, vec3(0.2126, 0.7152, 0.0722));
        col = mix(vec3(l), col, uSat);
        vec2 r = vUv - 0.5; float r2 = dot(r, r) * 2.0;
        col *= 1.0 - uVignette * smoothstep(0.12, 1.0, r2);
        float g = hash(gl_FragCoord.xy + fract(uTime * vec2(7.31, 3.17)) * 311.7) - 0.5;
        col += g * uGrain * (1.0 - l * 0.6);
        col = mix(src.rgb, col, src.a);
        gl_FragColor = vec4(clamp(col, 0.0, 1.0), src.a);
      }`
  });
}
export {
  FOG_UNIFORMS,
  SITE_SUN,
  compassBearing,
  createGradePass,
  createSkyEnvironment,
  patchFogMaterials,
  skyMaterial,
  solarCrossing,
  solarPosition
};
