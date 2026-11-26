// 地面材质：条纹人造草、水泥通道/硬地、内场护地板、场外田野。
// 颜色都从照片里取（sRGB 值，和模型里水泥通道 0xc9c9c2 放在同一个尺度上比较）：
//     浅条中心更亮、偏黄绿 (≈110,150,60)，深条是暗墨绿，饱和度都不高。条纹是两种颜色的草丝织出来的，不随视角变。
import * as THREE from 'three';

const rng = (seed) => { let s = seed >>> 0; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); };
function fbm(w, h, seed, octaves, base) {
  const r = rng(seed), out = new Float32Array(w * h);
  for (let o = 0; o < octaves; o++) {
    const f = base * 2 ** o, amp = 0.5 ** o, grid = [];
    for (let i = 0; i < f * f; i++) grid.push(r());
    const G = (i, j) => grid[((j % f + f) % f) * f + ((i % f + f) % f)];
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const fx = (x / w) * f, fy = (y / h) * f, i = Math.floor(fx), j = Math.floor(fy), tx = fx - i, ty = fy - j;
      const sx = tx * tx * (3 - 2 * tx), sy = ty * ty * (3 - 2 * ty);
      const a = G(i, j) + (G(i + 1, j) - G(i, j)) * sx, b = G(i, j + 1) + (G(i + 1, j + 1) - G(i, j + 1)) * sx;
      out[y * w + x] += (a + (b - a) * sy) * amp;
    }
  }
  const norm = 2 - 2 * 0.5 ** octaves;
  for (let i = 0; i < out.length; i++) out[i] /= norm;
  return out;
}
function canvas(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }
function tex(c, { srgb = true } = {}) {
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 16;
  return t;
}
function heightToNormal(hgt, w, h, strength) {
  const c = canvas(w, h), g = c.getContext('2d'), img = g.createImageData(w, h);
  const H = (x, y) => hgt[((y + h) % h) * w + ((x + w) % w)];
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const dx = (H(x + 1, y) - H(x - 1, y)) * strength, dy = (H(x, y + 1) - H(x, y - 1)) * strength;
    const nz = 1 / Math.sqrt(dx * dx + dy * dy + 1), i = (y * w + x) * 4;
    img.data[i] = (-dx * nz * 0.5 + 0.5) * 255; img.data[i + 1] = (dy * nz * 0.5 + 0.5) * 255; img.data[i + 2] = nz * 255; img.data[i + 3] = 255;
  }
  g.putImageData(img, 0, 0);
  return tex(c, { srgb: false });
}

// ---------- 条纹人造草 ----------
// 贴图 v 方向是两道条纹（上半浅、下半深，和原来的 turfTexture 相位一致），u 方向 1 = 30 米。
export function turfStripeTexture() {
  const w = 256, h = 512, c = canvas(w, h), g = c.getContext('2d'), img = g.createImageData(w, h);
  const low = fbm(w, h, 91, 5, 4), r = rng(92);
  const light = [90, 122, 58], lightCore = [104, 136, 64], dark = [33, 59, 30];
  // 横穿条纹的浅色细纹：几道沿 v 方向的窄带，位置随机
  const streaks = Array.from({ length: 5 }, () => [r() * w, 1.5 + r() * 3, 0.05 + r() * 0.06]);
  for (let y = 0; y < h; y++) {
    const half = y < h / 2, yy = (y % (h / 2)) / (h / 2);
    const core = half ? Math.sin(yy * Math.PI) ** 0.6 : 0;                            // 浅条中间更亮
    const edge = Math.min(yy, 1 - yy) * (h / 2);
    const soft = edge < 1.5 ? 0.5 + 0.5 * edge / 1.5 : 1;                             // 条纹交界 1–2 像素的过渡
    for (let x = 0; x < w; x++) {
      const base = half ? light.map((v, k) => v + (lightCore[k] - v) * core) : dark;
      const other = half ? dark : light;
      let k = 0.9 + 0.2 * low[y * w + x] + (r() - 0.5) * 0.06;
      for (const [sx, sw, a] of streaks) { const d = Math.abs(((x - sx + w * 1.5) % w) - w / 2); if (d < sw) k += a * (1 - d / sw); }
      const o = (y * w + x) * 4;
      for (let ch = 0; ch < 3; ch++) img.data[o + ch] = (base[ch] * soft + (base[ch] + other[ch]) * 0.5 * (1 - soft)) * k;
      img.data[o + 3] = 255;
    }
  }
  g.putImageData(img, 0, 0);
  return tex(c);
}

// 草丝细节（世界坐标贴，约 1.2 米一块）：R = 草丝明暗，G = 大尺度起伏；另给一张法线贴图做近处的草丝凹凸。
export function turfFibre() {
  const w = 256, h = 256, r = rng(301);
  const hgt = new Float32Array(w * h).fill(0.5);
  // 一簇簇草丝：短的斜线，深浅交错
  for (let i = 0; i < 9000; i++) {
    const x0 = r() * w, y0 = r() * h, a = r() * Math.PI * 2, len = 1.5 + r() * 4, v = (r() - 0.45) * 0.5;
    for (let t = 0; t <= len; t += 0.5) {
      const x = Math.round(x0 + Math.cos(a) * t + w) % w, y = Math.round(y0 + Math.sin(a) * t + h) % h;
      hgt[y * w + x] = Math.min(1, Math.max(0, hgt[y * w + x] + v * (1 - t / len)));
    }
  }
  const macro = fbm(w, h, 302, 4, 2), clump = fbm(w, h, 303, 4, 8);
  const c = canvas(w, h), g = c.getContext('2d'), img = g.createImageData(w, h);
  for (let i = 0; i < w * h; i++) { img.data[i * 4] = Math.min(1, Math.max(0, 0.45 * hgt[i] + 0.55 * clump[i] + 0.0)) * 255; img.data[i * 4 + 1] = macro[i] * 255; img.data[i * 4 + 2] = 128; img.data[i * 4 + 3] = 255; }
  g.putImageData(img, 0, 0);
  return { detail: tex(c, { srgb: false }), normal: heightToNormal(hgt, w, h, 1.6) };
}

// ---------- 水泥（通道、场地硬地）----------
// 一张贴图约 8 米：浅灰底、深色水渍、浅色斑块。
export function concreteTexture() {
  const w = 512, h = 512, c = canvas(w, h), g = c.getContext('2d'), img = g.createImageData(w, h);
  const f = fbm(w, h, 401, 6, 4), f2 = fbm(w, h, 402, 3, 3), r = rng(403);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const i = y * w + x, wet = Math.max(0, f2[i] - 0.58) * 1.6;
    const k = 0.9 + 0.16 * f[i] + (r() - 0.5) * 0.05 - wet * 0.35, o = i * 4;
    img.data[o] = 196 * k; img.data[o + 1] = 197 * k; img.data[o + 2] = 193 * k; img.data[o + 3] = 255;
  }
  g.putImageData(img, 0, 0);
  return tex(c);
}

// ---------- 内场护地板 ----------
export function protectionFloorTexture(width, depth, cellMeters = 0.86) {
  const cells = 4, w = 512, h = 512, tile = w / cells, c = canvas(w, h), g = c.getContext('2d');
  const r = rng(29), low = fbm(w, h, 31, 5, 4);
  const img = g.createImageData(w, h);
  // 每块板的整体色调略有不同；板面是半透明蜂窝，底下的地面斑驳透上来
  const tone = Array.from({ length: cells * cells }, () => 0.92 + r() * 0.14);
  const hexR = tile / 7;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const cx = Math.floor(x / tile), cy = Math.floor(y / tile), lx = x - cx * tile, ly = y - cy * tile;
    // 蜂窝：六边形格的边做暗线
    const seam = Math.min(lx, ly, tile - lx, tile - ly);
    let k = tone[cy * cells + cx] * (0.82 + 0.3 * low[y * w + x]) * 1 + (r() - 0.5) * 0.04;
    let col = [92, 101, 99];
    if (seam < 2.6) { const s = 1 - seam / 2.6; col = col.map((v, i2) => v + ([158, 166, 162][i2] - v) * Math.min(1, s * 1.5)); k = 0.96 + 0.08 * low[y * w + x]; }
    const o = (y * w + x) * 4;
    img.data[o] = col[0] * k; img.data[o + 1] = col[1] * k; img.data[o + 2] = col[2] * k; img.data[o + 3] = 255;
  }
  g.putImageData(img, 0, 0);
  // 蜂窝：每块板上一层六边形格（半透明板的加强筋，透出来是深色细线）
  g.save(); g.strokeStyle = 'rgba(40,48,47,0.32)'; g.lineWidth = 1.2;
  for (let cy = 0; cy < cells; cy++) for (let cx = 0; cx < cells; cx++) {
    g.save(); g.beginPath(); g.rect(cx * tile + 3, cy * tile + 3, tile - 6, tile - 6); g.clip(); g.beginPath();
    for (let row = -1; row * hexR * 1.5 < tile + hexR; row++) for (let col = -1; col * hexR * 1.732 < tile + hexR; col++) {
      const hx = cx * tile + col * hexR * 1.732 + (row % 2 ? hexR * 0.866 : 0), hy = cy * tile + row * hexR * 1.5;
      for (let k = 0; k <= 6; k++) { const a = Math.PI / 6 + k * Math.PI / 3, px = hx + Math.cos(a) * hexR, py = hy + Math.sin(a) * hexR; k ? g.lineTo(px, py) : g.moveTo(px, py); }
    }
    g.stroke(); g.restore();
  }
  g.restore();
  for (let i = 0; i < 160; i++) {   // 泥点、鞋印
    const x = r() * w, y = r() * h, rad = 2 + r() * 18, st = g.createRadialGradient(x, y, 0, x, y, rad);
    st.addColorStop(0, i % 3 ? 'rgba(150,140,118,0.12)' : 'rgba(30,38,36,0.14)'); st.addColorStop(1, 'transparent');
    g.fillStyle = st; g.fillRect(x - rad, y - rad, rad * 2, rad * 2);
  }
  const t = tex(c);
  t.repeat.set(width / (cells * cellMeters), depth / (cells * cellMeters));
  return t;
}

// ---------- 场外田野 ----------
export function fieldTexture() {
  const w = 256, h = 256, c = canvas(w, h), g = c.getContext('2d'), img = g.createImageData(w, h);
  const f = fbm(w, h, 501, 5, 4), r = rng(502);
  for (let i = 0; i < w * h; i++) {
    const k = 0.82 + 0.3 * f[i] + (r() - 0.5) * 0.1, o = i * 4;
    img.data[o] = 78 * k; img.data[o + 1] = 98 * k; img.data[o + 2] = 52 * k; img.data[o + 3] = 255;
  }
  g.putImageData(img, 0, 0);
  return tex(c);
}

// ---------- 世界坐标细节：打破重复、近处加草丝/颗粒，远处淡出 ----------
// detail：R 通道 = 细节明暗（约 scale 米一块），G 通道 = 大尺度起伏（scale × 9 米一块）。
// opts.fine：细节强度；opts.macro：大尺度起伏强度；opts.tint：大尺度上混入的另一种颜色（田野里的黄褐色裸土、干草）及比例。
export function worldDetail(material, detail, { scale = 1.2, fine = 0.35, macro = 0.15, near = 6, far = 70, tint = null, tintAmount = 0 } = {}) {
  const uni = {
    uGDetail: { value: detail }, uGScale: { value: scale }, uGFine: { value: fine }, uGMacro: { value: macro },
    uGNear: { value: near }, uGFar: { value: far }, uGTint: { value: new THREE.Color(tint ?? 0xffffff) }, uGTintAmt: { value: tintAmount },
  };
  material.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uni);
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vGWorld;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvGWorld = (modelMatrix * vec4(transformed, 1.0)).xyz;');
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vGWorld;\nuniform sampler2D uGDetail;\nuniform float uGScale, uGFine, uGMacro, uGNear, uGFar, uGTintAmt;\nuniform vec3 uGTint;')
      .replace('#include <map_fragment>', `#include <map_fragment>
        {
          float gDist = length(vGWorld - cameraPosition);
          float gFade = 1.0 - smoothstep(uGNear, uGFar, gDist);
          float gFine = mix(texture2D(uGDetail, vGWorld.xz / uGScale).r, texture2D(uGDetail, vGWorld.xz / (uGScale * 4.3) + vec2(0.29, 0.61)).r, 0.5);
          float gMac = texture2D(uGDetail, vGWorld.xz / (uGScale * 9.0) + vec2(0.37, 0.71)).g;
          float gMac2 = texture2D(uGDetail, vGWorld.xz / (uGScale * 61.0) + vec2(0.13, 0.52)).g;
          diffuseColor.rgb *= mix(1.0, 0.6 + 0.8 * gFine, uGFine * gFade);
          diffuseColor.rgb *= 1.0 + uGMacro * ((gMac - 0.5) * 1.2 + (gMac2 - 0.5) * 1.6);
          diffuseColor.rgb = mix(diffuseColor.rgb, uGTint * (0.7 + 0.6 * gMac), uGTintAmt * smoothstep(0.45, 0.75, gMac2));
        }`);
  };
  material.customProgramCacheKey = () => 'worldDetail';
  return material;
}
