// 观众大屏内容引擎（可插拔视觉系统）：
// 按屏组（tower 屏塔 / imag 两侧竖屏 / side 内场斜屏 / delay 草坪斜屏 / lawn 草坪双面屏 / cylinder 控制塔横屏 / all）
// 独立控制观众看到的展示内容：支持实时动画视觉（火星标志、火焰、星云、波纹、频谱、歌名大字、纯色块面、熄屏）和节目包外置图片贴图。
import * as THREE from 'three';
import { videoScreens } from '../venue.js';
import { drawMarsLogo } from '../textures.js';

const CANVAS_W = 512, CANVAS_H = 288;

function drawProcedural(ctx, w, h, spec, t) {
  const mode = spec.mode || 'default';
  const c1 = spec.primary || '#b03cff';
  const c2 = spec.secondary || '#ff2f6a';
  const speed = spec.speed ?? 1.0;
  const tt = t * speed;

  if (mode === 'blackout') {
    ctx.fillStyle = '#040406';
    ctx.fillRect(0, 0, w, h);
    return;
  }
  if (mode === 'solid') {
    ctx.fillStyle = c1;
    ctx.fillRect(0, 0, w, h);
    return;
  }
  if (mode === 'gradient') {
    const gr = ctx.createLinearGradient(0, 0, 0, h);
    const shift = 0.5 + 0.25 * Math.sin(tt * 1.4);
    gr.addColorStop(0, c1);
    gr.addColorStop(Math.max(0.08, Math.min(0.92, shift)), c2);
    gr.addColorStop(1, '#090910');
    ctx.fillStyle = gr;
    ctx.fillRect(0, 0, w, h);
    return;
  }
  if (mode === 'nebula') {
    ctx.fillStyle = '#070612';
    ctx.fillRect(0, 0, w, h);
    for (let i = 0; i < 4; i++) {
      const cx = w * (0.2 + 0.6 * (0.5 + 0.45 * Math.sin(tt * (0.4 + i * 0.13) + i * 2.1)));
      const cy = h * (0.25 + 0.5 * (0.5 + 0.45 * Math.cos(tt * (0.35 + i * 0.11) + i * 1.7)));
      const rad = Math.max(w, h) * (0.36 + 0.1 * Math.sin(tt + i));
      const gr = ctx.createRadialGradient(cx, cy, 4, cx, cy, rad);
      gr.addColorStop(0, i % 2 === 0 ? c1 : c2);
      gr.addColorStop(0.55, (i % 2 === 0 ? c2 : c1) + '55');
      gr.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = gr;
      ctx.fillRect(0, 0, w, h);
    }
    // 细星点
    ctx.fillStyle = 'rgba(255,255,255,0.75)';
    for (let i = 0; i < 28; i++) {
      const sx = ((i * 97 + Math.sin(i * 3.1) * 40) % w + w) % w;
      const sy = ((i * 53 + Math.cos(i * 2.7) * 30) % h + h) % h;
      const a = 0.35 + 0.65 * Math.abs(Math.sin(tt * 2.2 + i));
      ctx.globalAlpha = a;
      ctx.fillRect(sx, sy, 2.5, 2.5);
    }
    ctx.globalAlpha = 1;
    return;
  }
  if (mode === 'fire') {
    const gr = ctx.createLinearGradient(0, h, 0, 0);
    gr.addColorStop(0, '#fff3b0');
    gr.addColorStop(0.24, c2 || '#ff8811');
    gr.addColorStop(0.65, c1 || '#cc1414');
    gr.addColorStop(1, '#180306');
    ctx.fillStyle = gr;
    ctx.fillRect(0, 0, w, h);
    for (let i = 0; i < 16; i++) {
      const x = ((i / 15) * w + Math.sin(tt * 2.4 + i * 1.9) * 26);
      const fh = h * (0.45 + 0.35 * Math.sin(tt * 3.5 + i * 2.3));
      const g2 = ctx.createRadialGradient(x, h * 0.92, 6, x, h - fh * 0.45, fh * 0.58);
      g2.addColorStop(0, 'rgba(255,245,190,0.85)');
      g2.addColorStop(0.45, 'rgba(255,110,20,0.45)');
      g2.addColorStop(1, 'rgba(180,10,0,0)');
      ctx.fillStyle = g2;
      ctx.fillRect(0, 0, w, h);
    }
    return;
  }
  if (mode === 'marsLogo') {
    const gr = ctx.createRadialGradient(w / 2, h / 2, 10, w / 2, h / 2, w * 0.65);
    gr.addColorStop(0, c2 + '55');
    gr.addColorStop(1, '#090910');
    ctx.fillStyle = '#090910';
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = gr;
    ctx.fillRect(0, 0, w, h);
    const pulse = 1 + 0.06 * Math.sin(tt * 3.0);
    const s = Math.min(w, h) * 0.34 * pulse;
    ctx.save();
    ctx.shadowColor = c1;
    ctx.shadowBlur = 24;
    drawMarsLogo(ctx, (x, y) => [w / 2 + x * s, h * 0.22 + y * s], c1);
    ctx.restore();
    if (spec.text) {
      ctx.fillStyle = 'rgba(255,255,255,0.86)';
      ctx.font = '600 22px "PingFang SC", system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(spec.text, w / 2, h - 22);
    }
    return;
  }
  if (mode === 'rings') {
    ctx.fillStyle = '#070812';
    ctx.fillRect(0, 0, w, h);
    ctx.lineWidth = 5;
    for (let i = 0; i < 7; i++) {
      const p = ((tt * 0.55 + i / 7) % 1);
      const rad = p * Math.max(w, h) * 0.62;
      ctx.strokeStyle = i % 2 === 0 ? c1 : c2;
      ctx.globalAlpha = (1 - p) * 0.9;
      ctx.beginPath();
      ctx.arc(w / 2, h / 2, rad, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
    return;
  }
  if (mode === 'bars') {
    ctx.fillStyle = '#07080e';
    ctx.fillRect(0, 0, w, h);
    const cols = 16, cw = w / cols;
    for (let i = 0; i < cols; i++) {
      const v = 0.22 + 0.72 * Math.abs(Math.sin(tt * 3.6 + i * 0.65) * Math.cos(tt * 1.7 - i * 0.4));
      const bh = h * v;
      const gr = ctx.createLinearGradient(0, h, 0, h - bh);
      gr.addColorStop(0, c1);
      gr.addColorStop(1, c2);
      ctx.fillStyle = gr;
      ctx.fillRect(i * cw + 4, h - bh, cw - 8, bh);
    }
    return;
  }
  if (mode === 'title') {
    const gr = ctx.createLinearGradient(0, 0, w, h);
    gr.addColorStop(0, '#0a0a16');
    gr.addColorStop(0.5, c2 + '44');
    gr.addColorStop(1, '#080812');
    ctx.fillStyle = '#080812';
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = gr;
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = c1;
    ctx.lineWidth = 3;
    ctx.strokeRect(24, 24, w - 48, h - 48);
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = '700 46px "PingFang SC", "Microsoft YaHei", system-ui, sans-serif';
    ctx.fillText(spec.text || 'MARS CONCERT', w / 2, h * 0.46);
    if (spec.subtext) {
      ctx.fillStyle = c1;
      ctx.font = '500 22px "PingFang SC", system-ui, sans-serif';
      ctx.fillText(spec.subtext, w / 2, h * 0.66);
    }
  }
}

export function createScreenVisuals() {
  const originals = new Map();
  const groupMats = new Map();
  const imageCache = new Map();
  const texLoader = new THREE.TextureLoader();

  // 记录每块屏的原始材质，停止舞美时可无损还原
  function snapshotOriginals() {
    for (const s of videoScreens) {
      if (!originals.has(s.mesh)) originals.set(s.mesh, s.mesh.material);
    }
  }

  function getGroupSlot(groupKey) {
    if (groupMats.has(groupKey)) return groupMats.get(groupKey);
    const canvas = document.createElement('canvas');
    canvas.width = CANVAS_W;
    canvas.height = CANVAS_H;
    const ctx = canvas.getContext('2d');
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    const mat = new THREE.MeshStandardMaterial({
      color: 0x111116,
      map: texture,
      emissiveMap: texture,
      emissive: new THREE.Color(0xffffff),
      emissiveIntensity: 1.05,
      roughness: 0.35,
    });
    mat.userData.showControlled = true;
    const slot = { canvas, ctx, texture, mat, spec: null, lastDraw: -999 };
    groupMats.set(groupKey, slot);
    return slot;
  }

  function screensForGroup(groupKey) {
    if (groupKey === 'all') return videoScreens.filter((s) => s.group !== 'tower');
    return videoScreens.filter((s) => s.group === groupKey);
  }

  let activeSpecs = {};
  let baseUrl = '';

  function restoreAll() {
    for (const [mesh, orig] of originals) {
      mesh.material = orig;
    }
    activeSpecs = {};
  }

  function applySpecs(specs, showBaseUrl = '') {
    snapshotOriginals();
    baseUrl = showBaseUrl || '';
    activeSpecs = specs || {};
    // 先全部还原，再按 all -> 具体组 顺序覆盖（具体组优先级高于 all）
    for (const [mesh, orig] of originals) mesh.material = orig;
    const orderedKeys = Object.keys(activeSpecs).sort((a, b) => (a === 'all' ? -1 : b === 'all' ? 1 : 0));
    for (const grp of orderedKeys) {
      const spec = activeSpecs[grp];
      if (!spec || !spec.mode || spec.mode === 'default') continue;
      const slot = getGroupSlot(grp);
      slot.spec = spec;
      slot.mat.emissiveIntensity = spec.intensity ?? 1.08;
      if (spec.mode === 'image' && spec.src) {
        const url = /^https?:|^data:|^blob:/.test(spec.src) ? spec.src : baseUrl + spec.src;
        let tex = imageCache.get(url);
        if (!tex) {
          tex = texLoader.load(url);
          tex.colorSpace = THREE.SRGBColorSpace;
          imageCache.set(url, tex);
        }
        slot.mat.map = tex;
        slot.mat.emissiveMap = tex;
        slot.mat.needsUpdate = true;
      } else {
        if (slot.mat.map !== slot.texture) {
          slot.mat.map = slot.texture;
          slot.mat.emissiveMap = slot.texture;
          slot.mat.needsUpdate = true;
        }
      }
      for (const s of screensForGroup(grp)) {
        s.mesh.material = slot.mat;
      }
    }
  }

  // 每帧按 20fps 更新动态程序化屏幕画布（足够流畅又极省 CPU/GPU 上传）
  function update(t) {
    for (const slot of groupMats.values()) {
      const spec = slot.spec;
      if (!spec || !spec.mode || spec.mode === 'default' || spec.mode === 'image') continue;
      const staticMode = spec.mode === 'blackout' || spec.mode === 'solid' || spec.mode === 'title';
      if (staticMode && slot.lastDraw >= 0) continue;
      if (!staticMode && Math.abs(t - slot.lastDraw) < 0.05) continue;
      slot.lastDraw = t;
      drawProcedural(slot.ctx, CANVAS_W, CANVAS_H, spec, t);
      slot.texture.needsUpdate = true;
    }
  }

  function invalidate() {
    for (const slot of groupMats.values()) slot.lastDraw = -999;
  }

  return { applySpecs, update, restoreAll, invalidate };
}
