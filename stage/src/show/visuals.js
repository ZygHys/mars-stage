import * as THREE from "three";
import { videoScreens } from "../venue.js";
import { drawMarsLogo } from "../textures.js";
const CANVAS_W = 512, CANVAS_H = 288;
const PANO_W = 1024, PANO_H = 288;
const singerSpriteCache =  new Map();
function getSingerPixelSprite(hair = "#f0182a") {
  if (singerSpriteCache.has(hair)) return singerSpriteCache.get(hair);
  const px = 8;
  const c = document.createElement("canvas");
  c.width = 20 * px;
  c.height = 27 * px;
  const g = c.getContext("2d");
  const put = (gx, gy, gw, gh, col) => {
    g.fillStyle = col;
    g.fillRect(gx * px, gy * px, gw * px, gh * px);
  };
  put(0, 12, 3, 2, "#d8e2f4");
  put(1, 10, 4, 3, "#f8faff");
  put(2, 9, 3, 2, "#ffffff");
  put(0, 14, 4, 2, "#e8effc");
  put(3, 11, 3, 4, "#f4f8ff");
  put(2, 15, 3, 2, "#c8d6ee");
  put(5, 13, 10, 13, "#141620");
  put(4, 14, 2, 12, "#0d0f16");
  put(14, 14, 2, 12, "#0d0f16");
  put(7, 12, 6, 2, "#1c1f2c");
  put(8, 13, 4, 7, "#0d0e15");
  put(7, 13, 1, 5, "#b82434");
  put(12, 13, 1, 5, "#b82434");
  for (let i = 0; i < 6; i++) {
    put(6 + i, 15 + i, 2, 1, "#e8d08e");
    put(12 - i, 15 + i, 2, 1, "#e8d08e");
  }
  put(6, 16, 1, 1, "#eef4ff");
  put(13, 16, 1, 1, "#eef4ff");
  put(5, 23, 10, 2, "#0a0b10");
  put(8, 23, 4, 2, "#e8d08e");
  put(8, 11, 4, 2, "#dfb99a");
  put(6, 4, 8, 8, "#f2d4bc");
  put(6, 4, 1, 8, "#e2be9e");
  put(13, 4, 1, 8, "#e2be9e");
  put(5, 1, 10, 3, hair);
  put(6, 0, 8, 2, "#ff4858");
  put(4, 3, 2, 7, "#9e0e1e");
  put(14, 3, 2, 7, "#9e0e1e");
  put(5, 9, 2, 3, hair);
  put(13, 9, 2, 3, hair);
  put(6, 3, 3, 2, hair);
  put(10, 3, 2, 2, "#ff4858");
  put(12, 3, 2, 2, hair);
  put(7, 7, 2, 2, "#1b1922");
  put(11, 7, 2, 2, "#1b1922");
  put(7, 7, 1, 1, "#ffffff");
  put(11, 7, 1, 1, "#ffffff");
  put(6, 9, 2, 1, "#ef9a8e");
  put(12, 9, 2, 1, "#ef9a8e");
  put(9, 10, 2, 1, "#8e3838");
  put(12, 11, 2, 2, "#e61e2b");
  put(11, 10, 2, 2, "#e8eef8");
  singerSpriteCache.set(hair, c);
  return c;
}
function drawProcedural(ctx, w, h, spec, t) {
  const mode = spec.mode || "default";
  const c1 = spec.primary || "#b03cff";
  const c2 = spec.secondary || "#ff2f6a";
  const speed = spec.speed ?? 1;
  const tt = t * speed;
  if (mode === "blackout") {
    ctx.fillStyle = "#040406";
    ctx.fillRect(0, 0, w, h);
    return;
  }
  if (mode === "solid") {
    ctx.fillStyle = c1;
    ctx.fillRect(0, 0, w, h);
    return;
  }
  if (mode === "gradient") {
    const gr = ctx.createLinearGradient(0, 0, 0, h);
    const shift = 0.5 + 0.25 * Math.sin(tt * 1.4);
    gr.addColorStop(0, c1);
    gr.addColorStop(Math.max(0.08, Math.min(0.92, shift)), c2);
    gr.addColorStop(1, "#090910");
    ctx.fillStyle = gr;
    ctx.fillRect(0, 0, w, h);
    return;
  }
  if (mode === "nebula") {
    ctx.fillStyle = "#070612";
    ctx.fillRect(0, 0, w, h);
    for (let i = 0; i < 4; i++) {
      const cx = w * (0.2 + 0.6 * (0.5 + 0.45 * Math.sin(tt * (0.4 + i * 0.13) + i * 2.1)));
      const cy = h * (0.25 + 0.5 * (0.5 + 0.45 * Math.cos(tt * (0.35 + i * 0.11) + i * 1.7)));
      const rad = Math.max(w, h) * (0.36 + 0.1 * Math.sin(tt + i));
      const gr = ctx.createRadialGradient(cx, cy, 4, cx, cy, rad);
      gr.addColorStop(0, i % 2 === 0 ? c1 : c2);
      gr.addColorStop(0.55, (i % 2 === 0 ? c2 : c1) + "55");
      gr.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = gr;
      ctx.fillRect(0, 0, w, h);
    }
    ctx.fillStyle = "rgba(255,255,255,0.75)";
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
  if (mode === "fire") {
    const gr = ctx.createLinearGradient(0, h, 0, 0);
    gr.addColorStop(0, "#fff3b0");
    gr.addColorStop(0.24, c2 || "#ff8811");
    gr.addColorStop(0.65, c1 || "#cc1414");
    gr.addColorStop(1, "#180306");
    ctx.fillStyle = gr;
    ctx.fillRect(0, 0, w, h);
    for (let i = 0; i < 16; i++) {
      const x = i / 15 * w + Math.sin(tt * 2.4 + i * 1.9) * 26;
      const fh = h * (0.45 + 0.35 * Math.sin(tt * 3.5 + i * 2.3));
      const g2 = ctx.createRadialGradient(x, h * 0.92, 6, x, h - fh * 0.45, fh * 0.58);
      g2.addColorStop(0, "rgba(255,245,190,0.85)");
      g2.addColorStop(0.45, "rgba(255,110,20,0.45)");
      g2.addColorStop(1, "rgba(180,10,0,0)");
      ctx.fillStyle = g2;
      ctx.fillRect(0, 0, w, h);
    }
    return;
  }
  if (mode === "marsLogo") {
    const gr = ctx.createRadialGradient(w / 2, h / 2, 10, w / 2, h / 2, w * 0.65);
    gr.addColorStop(0, c2 + "55");
    gr.addColorStop(1, "#090910");
    ctx.fillStyle = "#090910";
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = gr;
    ctx.fillRect(0, 0, w, h);
    const pulse = 1 + 0.06 * Math.sin(tt * 3);
    const s = Math.min(w, h) * 0.34 * pulse;
    ctx.save();
    ctx.shadowColor = c1;
    ctx.shadowBlur = 24;
    drawMarsLogo(ctx, (x, y) => [w / 2 + x * s, h * 0.22 + y * s], c1);
    ctx.restore();
    if (spec.text) {
      ctx.fillStyle = "rgba(255,255,255,0.86)";
      ctx.font = '600 22px "PingFang SC", system-ui, sans-serif';
      ctx.textAlign = "center";
      ctx.fillText(spec.text, w / 2, h - 22);
    }
    return;
  }
  if (mode === "rings") {
    ctx.fillStyle = "#070812";
    ctx.fillRect(0, 0, w, h);
    ctx.lineWidth = 5;
    for (let i = 0; i < 7; i++) {
      const p = (tt * 0.55 + i / 7) % 1;
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
  if (mode === "bars") {
    ctx.fillStyle = "#07080e";
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
  if (mode === "title") {
    const gr = ctx.createLinearGradient(0, 0, w, h);
    gr.addColorStop(0, "#0a0a16");
    gr.addColorStop(0.5, c2 + "44");
    gr.addColorStop(1, "#080812");
    ctx.fillStyle = "#080812";
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = gr;
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = c1;
    ctx.lineWidth = 3;
    ctx.strokeRect(24, 24, w - 48, h - 48);
    ctx.fillStyle = "#ffffff";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = '700 46px "PingFang SC", "Microsoft YaHei", system-ui, sans-serif';
    ctx.fillText(spec.text || "MARS CONCERT", w / 2, h * 0.46);
    if (spec.subtext) {
      ctx.fillStyle = c1;
      ctx.font = '500 22px "PingFang SC", system-ui, sans-serif';
      ctx.fillText(spec.subtext, w / 2, h * 0.66);
    }
    return;
  }
  if (mode === "monoCards") {
    ctx.fillStyle = "#07080c";
    ctx.fillRect(0, 0, w, h);
    const words = String(spec.text || "H E Y").trim().split(/\s+/);
    const n = w >= 900 ? Math.max(4, Math.min(8, words.length)) : Math.max(1, Math.min(4, words.length));
    const pad = w >= 900 ? 10 : 16, gap = w >= 900 ? 10 : 12;
    const cw = (w - pad * 2 - gap * (n - 1)) / n;
    const ch = h - pad * 2;
    const pulse = 0.97 + 0.03 * Math.sin(tt * 3);
    for (let i = 0; i < n; i++) {
      const x = pad + i * (cw + gap);
      const y = pad + Math.sin(tt * 2.2 + i * 0.85) * 3;
      const label = words[i % words.length];
      ctx.fillStyle = c1 || "#f2f5fa";
      ctx.fillRect(x, y, cw, ch);
      ctx.strokeStyle = "#10121a";
      ctx.lineWidth = w >= 900 ? 6 : 8;
      ctx.strokeRect(x + 8, y + 8, cw - 16, ch - 16);
      ctx.lineWidth = 2;
      ctx.strokeRect(x + 16, y + 16, cw - 32, ch - 32);
      ctx.fillStyle = "#0c0e15";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      const scaleF = label.length >= 2 ? 0.42 : 0.62;
      const fontSize = Math.round(Math.min(cw * scaleF, ch * 0.42) * pulse);
      ctx.font = `900 ${fontSize}px "Arial Black", "Impact", "PingFang SC", sans-serif`;
      ctx.fillText(label, x + cw / 2, y + ch * 0.52);
    }
    return;
  }
  if (mode === "monoSilhouettes") {
    ctx.fillStyle = c1 || "#e6ecf8";
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = "rgba(15,18,28,0.06)";
    for (let x = 0; x < w; x += 32) ctx.fillRect(x, 0, 2, h);
    ctx.fillStyle = c2 || "#101218";
    const figs = w >= 900 ? 6 : 4;
    for (let i = 0; i < figs; i++) {
      const fx = (i + 0.5) / figs * w + Math.sin(tt * 1.4 + i * 1.7) * 22;
      const sway = Math.sin(tt * 3 + i * 1.5) * 0.24;
      const reach = Math.cos(tt * 2.6 + i * 2.1) * 0.36;
      ctx.save();
      ctx.translate(fx, h * 0.94);
      ctx.rotate(sway * 0.14);
      ctx.beginPath();
      ctx.arc(0, -h * 0.68, 17, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(-20, -h * 0.6);
      ctx.lineTo(20, -h * 0.6);
      ctx.lineTo(34 + sway * 26, -h * 0.1);
      ctx.lineTo(-32 + sway * 26, -h * 0.1);
      ctx.closePath();
      ctx.fill();
      ctx.lineWidth = 11;
      ctx.strokeStyle = c2 || "#101218";
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(-15, -h * 0.55);
      ctx.lineTo(-48, -h * (0.4 + reach * 0.18));
      ctx.moveTo(15, -h * 0.55);
      ctx.lineTo(50, -h * (0.44 - reach * 0.18));
      ctx.moveTo(-11, -h * 0.14);
      ctx.lineTo(-18 + sway * 16, 0);
      ctx.moveTo(11, -h * 0.14);
      ctx.lineTo(20 - sway * 16, 0);
      ctx.stroke();
      ctx.restore();
    }
    return;
  }
  if (mode === "monoEyes") {
    ctx.fillStyle = "#0a0b12";
    ctx.fillRect(0, 0, w, h);
    const gazeX = Math.sin(tt * 1.2) * (w >= 900 ? 22 : 14);
    const gazeY = Math.cos(tt * 0.9) * 6;
    const eyes = w >= 900 ? [[w * 0.34, h * 0.48, 195, 76], [w * 0.66, h * 0.48, 195, 76]] : [[w * 0.28, h * 0.36, 95, 42], [w * 0.72, h * 0.38, 102, 44], [w * 0.5, h * 0.72, 118, 48]];
    for (const [ex, ey, rx, ry] of eyes) {
      ctx.save();
      ctx.translate(ex, ey);
      ctx.fillStyle = c1 || "#e0e6f4";
      ctx.beginPath();
      ctx.moveTo(-rx, 0);
      ctx.quadraticCurveTo(0, -ry * 1.38, rx, 0);
      ctx.quadraticCurveTo(0, ry * 1.38, -rx, 0);
      ctx.closePath();
      ctx.fill();
      ctx.lineWidth = w >= 900 ? 8 : 5;
      ctx.strokeStyle = "#07080d";
      ctx.stroke();
      ctx.fillStyle = "#1b1f2c";
      ctx.beginPath();
      ctx.arc(gazeX, gazeY, ry * 0.68, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#040508";
      ctx.beginPath();
      ctx.arc(gazeX, gazeY, ry * 0.36, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#ffffff";
      ctx.beginPath();
      ctx.arc(gazeX - ry * 0.22, gazeY - ry * 0.18, ry * 0.14, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
    return;
  }
  if (mode === "monoBurst") {
    ctx.fillStyle = "#06070c";
    ctx.fillRect(0, 0, w, h);
    const centers = w >= 900 ? [[w * 0.12, h * 0.5], [w * 0.31, h * 0.44], [w * 0.5, h * 0.52], [w * 0.69, h * 0.44], [w * 0.88, h * 0.5]] : [[w * 0.5, h * 0.5]];
    ctx.strokeStyle = c1 || "#f4f8ff";
    ctx.fillStyle = c1 || "#f4f8ff";
    ctx.lineCap = "round";
    for (let ci = 0; ci < centers.length; ci++) {
      const [cx, cy] = centers[ci];
      const rays = 12;
      ctx.beginPath();
      ctx.arc(cx, cy, 16, 0, Math.PI * 2);
      ctx.fill();
      for (let i = 0; i < rays; i++) {
        const ang = i / rays * Math.PI * 2 + tt * (0.28 + ci * 0.06) * (ci % 2 === 0 ? 1 : -1);
        const len = h * 0.28 + h * 0.26 * (0.5 + 0.5 * Math.sin(tt * 2.2 + i * 1.7 + ci));
        ctx.lineWidth = i % 2 === 0 ? 11 : 6;
        ctx.beginPath();
        ctx.moveTo(cx + Math.cos(ang) * 18, cy + Math.sin(ang) * 18);
        ctx.lineTo(cx + Math.cos(ang) * len, cy + Math.sin(ang) * len);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(cx + Math.cos(ang) * (len * 0.86), cy + Math.sin(ang) * (len * 0.86), 8, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    return;
  }
  if (mode === "imagFrame") {
    const bg = c1 || "#1848b8";
    const border = c2 || "#edf4ff";
    const hair = spec.accent || "#f0182a";
    const hasBorder = spec.border !== false;
    const gr = ctx.createRadialGradient(w * 0.5, h * 0.38, 12, w * 0.5, h * 0.5, w * 0.68);
    gr.addColorStop(0, bg);
    gr.addColorStop(1, "#080b18");
    ctx.fillStyle = gr;
    ctx.fillRect(0, 0, w, h);
    if (spec.flames) {
      for (const sx of [-1, 1]) {
        const fx = w * (0.5 + sx * 0.2);
        const fh = h * (0.72 + 0.14 * Math.sin(tt * 7.5 + sx));
        const fg = ctx.createRadialGradient(fx, h * 0.92, 6, fx, h - fh * 0.5, fh * 0.42);
        fg.addColorStop(0, "rgba(255,248,210,0.92)");
        fg.addColorStop(0.45, "rgba(255,140,190,0.55)");
        fg.addColorStop(1, "rgba(255,60,20,0)");
        ctx.fillStyle = fg;
        ctx.fillRect(0, 0, w, h);
      }
    }
    const sway = Math.round(Math.sin(tt * 2.4) * 2);
    const bob = Math.round(Math.abs(Math.sin(tt * 4.4)));
    const px = 8;
    const ox = Math.round(w * 0.5) - 10 * px + sway * px;
    const oy = Math.round(h - 27 * px) + bob * 3;
    ctx.drawImage(getSingerPixelSprite(hair), ox, oy);
    if (hasBorder) {
      ctx.strokeStyle = border;
      ctx.lineWidth = 7;
      ctx.beginPath();
      const step = 18;
      for (let x = 14; x <= w - 14; x += step) {
        const j = (x / step % 2 === 0 ? 1 : -1) * (5 + 3 * Math.sin(tt * 4 + x));
        if (x === 14) ctx.moveTo(x, 14 + j);
        else ctx.lineTo(x, 14 + j);
      }
      for (let y = 14; y <= h - 14; y += step) {
        const j = (y / step % 2 === 0 ? 1 : -1) * (5 + 3 * Math.cos(tt * 4 + y));
        ctx.lineTo(w - 14 + j, y);
      }
      for (let x = w - 14; x >= 14; x -= step) {
        const j = (x / step % 2 === 0 ? 1 : -1) * (5 + 3 * Math.sin(tt * 4 + x));
        ctx.lineTo(x, h - 14 + j);
      }
      for (let y = h - 14; y >= 14; y -= step) {
        const j = (y / step % 2 === 0 ? 1 : -1) * (5 + 3 * Math.cos(tt * 4 + y));
        ctx.lineTo(14 + j, y);
      }
      ctx.closePath();
      ctx.stroke();
    }
    if (spec.subtext) {
      ctx.fillStyle = hasBorder ? "rgba(0,0,0,0.45)" : "rgba(0,0,0,0.52)";
      ctx.fillRect(hasBorder ? 28 : 0, h - (hasBorder ? 46 : 36), hasBorder ? w - 56 : w, hasBorder ? 26 : 30);
      ctx.fillStyle = "#ffffff";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.font = `600 ${hasBorder ? 16 : 19}px "PingFang SC", system-ui, sans-serif`;
      ctx.fillText(spec.subtext, w / 2, h - (hasBorder ? 33 : 21));
    }
  }
}
function createScreenVisuals() {
  const originals =  new Map();
  const groupMats =  new Map();
  const imageCache =  new Map();
  const texLoader = new THREE.TextureLoader();
  function snapshotOriginals() {
    for (const s of videoScreens) {
      if (!originals.has(s.mesh)) originals.set(s.mesh, s.mesh.material);
    }
  }
  function getGroupSlot(groupKey) {
    if (groupMats.has(groupKey)) return groupMats.get(groupKey);
    const isTower = groupKey === "tower";
    const canvas = document.createElement("canvas");
    canvas.width = isTower ? PANO_W : CANVAS_W;
    canvas.height = isTower ? PANO_H : CANVAS_H;
    const ctx = canvas.getContext("2d");
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    const mat = new THREE.MeshStandardMaterial({
      color: 1118486,
      map: texture,
      emissiveMap: texture,
      emissive: new THREE.Color(16777215),
      emissiveIntensity: 1.05,
      roughness: 0.35
    });
    mat.userData.showControlled = true;
    let sliceMats = null;
    if (isTower) {
      sliceMats = Array.from({ length: 8 }, (_, idx) => {
        const stex = texture.clone();
        stex.repeat.set(1 / 8, 1);
        stex.offset.set(idx / 8, 0);
        stex.needsUpdate = true;
        const smat = new THREE.MeshStandardMaterial({
          color: 1118486,
          map: stex,
          emissiveMap: stex,
          emissive: new THREE.Color(16777215),
          emissiveIntensity: 1.05,
          roughness: 0.35
        });
        smat.userData.showControlled = true;
        return smat;
      });
    }
    const slot = { canvas, ctx, texture, mat, sliceMats, spec: null, lastDraw: -999 };
    groupMats.set(groupKey, slot);
    return slot;
  }
  function screensForGroup(groupKey) {
    if (groupKey === "all") return videoScreens.filter((s) => s.group !== "tower");
    return videoScreens.filter((s) => s.group === groupKey);
  }
  let activeSpecs = {};
  let baseUrl = "";
  let externalOverrideGroup = null;
  let overriddenMeshes =  new Set();
  function setExternalOverride(groupOrNull) {
    externalOverrideGroup = groupOrNull || null;
    overriddenMeshes =  new Set();
    if (externalOverrideGroup) {
      for (const s of screensForGroup(externalOverrideGroup)) overriddenMeshes.add(s.mesh);
    }
  }
  function restoreAll() {
    for (const [mesh, orig] of originals) {
      if (overriddenMeshes.has(mesh)) continue;
      mesh.material = orig;
    }
    activeSpecs = {};
  }
  function isSlotFullyOverridden(groupKey) {
    if (!externalOverrideGroup) return false;
    if (externalOverrideGroup === groupKey) return true;
    if (externalOverrideGroup === "all" && groupKey !== "tower") return true;
    return false;
  }
  function applySpecs(specs, showBaseUrl = "") {
    snapshotOriginals();
    baseUrl = showBaseUrl || "";
    activeSpecs = specs || {};
    for (const [mesh, orig] of originals) {
      if (overriddenMeshes.has(mesh)) continue;
      mesh.material = orig;
    }
    const orderedKeys = Object.keys(activeSpecs).sort((a, b) => a === "all" ? -1 : b === "all" ? 1 : 0);
    for (const grp of orderedKeys) {
      const spec = activeSpecs[grp];
      if (!spec || !spec.mode || spec.mode === "default") continue;
      const slot = getGroupSlot(grp);
      const specKey = JSON.stringify(spec);
      const changed = slot.specKey !== specKey;
      slot.spec = spec;
      slot.specKey = specKey;
      if (changed) slot.lastDraw = -999;
      slot.mat.emissiveIntensity = spec.intensity ?? 1.08;
      if (spec.mode === "image" && spec.src) {
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
      const useSpan = grp === "tower" && slot.sliceMats && spec.mode !== "image" && spec.span !== false && (spec.mode === "monoCards" || spec.mode === "monoSilhouettes" || spec.mode === "monoEyes" || spec.mode === "monoBurst" || spec.span === true);
      const targets = screensForGroup(grp);
      if (useSpan) {
        for (let i = 0; i < targets.length; i++) {
          if (overriddenMeshes.has(targets[i].mesh)) continue;
          const sm = slot.sliceMats[i % slot.sliceMats.length];
          sm.emissiveIntensity = spec.intensity ?? 1.08;
          targets[i].mesh.material = sm;
        }
      } else {
        for (const s of targets) {
          if (overriddenMeshes.has(s.mesh)) continue;
          s.mesh.material = slot.mat;
        }
      }
    }
  }
  function update(t) {
    for (const [grp, slot] of groupMats.entries()) {
      if (isSlotFullyOverridden(grp)) continue;
      const spec = slot.spec;
      if (!spec || !spec.mode || spec.mode === "default" || spec.mode === "image") continue;
      const staticMode = spec.mode === "blackout" || spec.mode === "solid" || spec.mode === "title";
      if (staticMode && slot.lastDraw >= 0) continue;
      if (!staticMode && Math.abs(t - slot.lastDraw) < 0.05) continue;
      slot.lastDraw = t;
      drawProcedural(slot.ctx, slot.canvas.width, slot.canvas.height, spec, t);
      slot.texture.source.needsUpdate = true;
      slot.texture.needsUpdate = true;
    }
  }
  function invalidate() {
    for (const slot of groupMats.values()) slot.lastDraw = -999;
  }
  return { applySpecs, update, restoreAll, invalidate, setExternalOverride };
}
export {
  createScreenVisuals
};
