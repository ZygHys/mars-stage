// 舞美现场特效引擎（烟花 / 舞台焰火喷射 / 高压白色气柱）：
// 使用单个动态 Points 粒子池驱动，性能极轻，支持时间轴任意触发与停止清空。
import * as THREE from 'three';

const MAX_PARTICLES = 1800;

function makeGlowSprite() {
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const g = c.getContext('2d');
  const gr = g.createRadialGradient(32, 32, 2, 32, 32, 32);
  gr.addColorStop(0, 'rgba(255,255,255,1)');
  gr.addColorStop(0.35, 'rgba(255,255,255,0.65)');
  gr.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = gr;
  g.fillRect(0, 0, 64, 64);
  const t = new THREE.CanvasTexture(c);
  return t;
}

export function createShowFX(scene) {
  const pos = new Float32Array(MAX_PARTICLES * 3);
  const col = new Float32Array(MAX_PARTICLES * 3);
  const size = new Float32Array(MAX_PARTICLES);
  const vel = new Float32Array(MAX_PARTICLES * 3);
  const life = new Float32Array(MAX_PARTICLES);
  const maxLife = new Float32Array(MAX_PARTICLES);
  const drag = new Float32Array(MAX_PARTICLES);
  const grav = new Float32Array(MAX_PARTICLES);

  let cursor = 0;
  const tmpColor = new THREE.Color();

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  geo.setAttribute('aSize', new THREE.BufferAttribute(size, 1));

  const mat = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    uniforms: {
      uMap: { value: makeGlowSprite() },
      uDpr: { value: Math.min(window.devicePixelRatio || 1, 1.5) },
    },
    vertexShader: `
      attribute vec3 color;
      attribute float aSize;
      uniform float uDpr;
      varying vec3 vColor;
      void main() {
        if (aSize <= 0.001) {
          vColor = vec3(0.0);
          gl_PointSize = 0.0;
          gl_Position = vec4(2.0, 2.0, 2.0, 1.0);
          return;
        }
        vColor = clamp(color, 0.0, 4.0);
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        gl_PointSize = clamp(aSize * uDpr * 260.0 / max(1.0, -mv.z), 0.0, 96.0);
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: `
      uniform sampler2D uMap;
      varying vec3 vColor;
      void main() {
        vec4 tex = texture2D(uMap, gl_PointCoord);
        if (tex.a < 0.02) discard;
        gl_FragColor = vec4(clamp(vColor * tex.rgb, 0.0, 4.0), clamp(tex.a, 0.0, 1.0));
      }`,
  });

  const points = new THREE.Points(geo, mat);
  points.name = '舞美特效粒子';
  points.frustumCulled = false;
  points.visible = false;
  points.userData.dynamic = true;
  points.userData.skipAoDepth = true;
  scene.add(points);

  function spawn(x, y, z, vx, vy, vz, hex, pSize, pLife, pDrag, pGrav) {
    const i = cursor;
    cursor = (cursor + 1) % MAX_PARTICLES;
    pos[i * 3] = x; pos[i * 3 + 1] = y; pos[i * 3 + 2] = z;
    vel[i * 3] = vx; vel[i * 3 + 1] = vy; vel[i * 3 + 2] = vz;
    tmpColor.set(hex);
    col[i * 3] = tmpColor.r; col[i * 3 + 1] = tmpColor.g; col[i * 3 + 2] = tmpColor.b;
    size[i] = pSize;
    life[i] = pLife;
    maxLife[i] = pLife;
    drag[i] = pDrag;
    grav[i] = pGrav;
  }

  function burstFirework(colors = ['#ff3b6b', '#ffd442', '#66e0ff']) {
    const cx = (Math.random() - 0.5) * 90;
    const cy = 44 + Math.random() * 26;
    const cz = -62 + (Math.random() - 0.5) * 28;
    const mainHex = colors[Math.floor(Math.random() * colors.length)];
    const count = 88;
    for (let k = 0; k < count; k++) {
      const u = Math.random() * 2 - 1;
      const a = Math.random() * Math.PI * 2;
      const r = Math.sqrt(1 - u * u);
      const spd = 11 + Math.random() * 14;
      spawn(cx, cy, cz, r * Math.cos(a) * spd, u * spd + 3, r * Math.sin(a) * spd, mainHex, 1.45 + Math.random() * 0.9, 1.5 + Math.random() * 0.9, 1.4, -7.5);
    }
  }

  function emitFlameJets(color = '#ff5a1a', intensity = 1.0) {
    const xs = [-30, -20, -10, 10, 20, 30];
    const perJet = Math.max(1, Math.round(2 * intensity));
    for (const x of xs) {
      for (let k = 0; k < perJet; k++) {
        spawn(
          x + (Math.random() - 0.5) * 0.6,
          1.7,
          -38.2 + (Math.random() - 0.5) * 0.5,
          (Math.random() - 0.5) * 1.4,
          13 + Math.random() * 9 * intensity,
          (Math.random() - 0.5) * 1.4,
          Math.random() < 0.35 ? '#ffd452' : color,
          2.2 + Math.random() * 1.4,
          0.55 + Math.random() * 0.35,
          1.8,
          2.0,
        );
      }
    }
  }

  function emitSmokeJets(color = '#e6f0ff', intensity = 1.0) {
    const xs = [-26, -14, -4, 4, 14, 26];
    const perJet = Math.max(1, Math.round(2 * intensity));
    for (const x of xs) {
      for (let k = 0; k < perJet; k++) {
        spawn(
          x + (Math.random() - 0.5) * 0.5,
          1.6,
          -37.8 + (Math.random() - 0.5) * 0.5,
          (Math.random() - 0.5) * 1.6,
          16 + Math.random() * 10 * intensity,
          (Math.random() - 0.5) * 1.6,
          color,
          3.4 + Math.random() * 2.2,
          0.75 + Math.random() * 0.45,
          2.4,
          1.2,
        );
      }
    }
  }

  let fwTimer = 0, jetTimer = 0;

  function clear() {
    life.fill(0);
    size.fill(0);
    geo.attributes.aSize.needsUpdate = true;
    points.visible = false;
    fwTimer = 0;
    jetTimer = 0;
  }

  function update(dt, fxSpec) {
    const hasFx = fxSpec && (fxSpec.firework || fxSpec.flameJet || fxSpec.smokeJet);
    if (hasFx && dt > 0) {
      if (fxSpec.firework) {
        const rate = fxSpec.firework.rate ?? 1.2; // 次/秒
        fwTimer -= dt;
        if (fwTimer <= 0) {
          burstFirework(fxSpec.firework.colors || ['#ff3b6b', '#ffd442', '#66e0ff']);
          fwTimer = 1 / Math.max(0.2, rate);
        }
      }
      jetTimer -= dt;
      if (jetTimer <= 0) {
        if (fxSpec.flameJet) emitFlameJets(fxSpec.flameJet.color || '#ff5a1a', fxSpec.flameJet.intensity ?? 1);
        if (fxSpec.smokeJet) emitSmokeJets(fxSpec.smokeJet.color || '#e6f0ff', fxSpec.smokeJet.intensity ?? 1);
        jetTimer = 0.045;
      }
    }

    let alive = 0;
    for (let i = 0; i < MAX_PARTICLES; i++) {
      if (life[i] <= 0) continue;
      life[i] -= dt;
      if (life[i] <= 0) {
        size[i] = 0;
        continue;
      }
      alive++;
      const damp = Math.exp(-drag[i] * dt);
      vel[i * 3] *= damp;
      vel[i * 3 + 1] = vel[i * 3 + 1] * damp + grav[i] * dt;
      vel[i * 3 + 2] *= damp;
      pos[i * 3] += vel[i * 3] * dt;
      pos[i * 3 + 1] = Math.max(0.2, pos[i * 3 + 1] + vel[i * 3 + 1] * dt);
      pos[i * 3 + 2] += vel[i * 3 + 2] * dt;
      const ratio = life[i] / maxLife[i];
      if (ratio < 0.35) {
        const fade = ratio / 0.35;
        col[i * 3] *= 0.94 + 0.06 * fade;
        col[i * 3 + 1] *= 0.94 + 0.06 * fade;
        col[i * 3 + 2] *= 0.94 + 0.06 * fade;
      }
    }
    points.visible = alive > 0;
    if (alive > 0 || hasFx) {
      geo.attributes.position.needsUpdate = true;
      geo.attributes.color.needsUpdate = true;
      geo.attributes.aSize.needsUpdate = true;
    }
  }

  return { update, clear };
}
