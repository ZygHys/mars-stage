// 火星乌托邦：马路对面整块场地上除金字塔和神树（fan-installation.js）以外的东西。
// 形状颜色：
//   · 星形篷（编号 27、航拍有影子）：立在细杆上的多角星形彩色篷，黄红蓝橙青粉分瓣。
//     不打烊动物园：低头白马和橙鬃橙蹄的白马；银河尽头的篝火：曼陀罗星形篷（8.5 秒航拍）。风之海、秘境花园、忒修斯之船仍是简化体块。
import * as THREE from 'three';
import { LAYOUT, surfaceY } from '../layout.js';
import { GIANT_MESH } from './giant-mesh.js';
import { GIANT_COLORS } from './giant-colors.js';

const cache = {};
const mat = (color, extra = {}) => (cache[color + JSON.stringify(extra)] ||= new THREE.MeshStandardMaterial({ color, roughness: 0.75, ...extra }));
function mesh(geo, m, x = 0, y = 0, z = 0) { const o = new THREE.Mesh(geo, m); o.position.set(x, y, z); o.castShadow = o.receiveShadow = true; return o; }
const box = (w, h, d, m, x, y, z) => mesh(new THREE.BoxGeometry(w, h, d), m, x, y, z);
function place(o, x, z, rotY = 0) { o.position.x = x; o.position.z = z; o.rotation.y = rotY; return o; }
function canvasTex(w, h, draw) {
  const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t;
}
// 平铺在地上的多边形（layout 里是 [x, z] 点列）
function flat(points, m, y) {
  const g = new THREE.ShapeGeometry(new THREE.Shape(points.map(([x, z]) => new THREE.Vector2(x, -z))));
  g.rotateX(-Math.PI / 2);
  const o = new THREE.Mesh(g, m); o.position.y = y; o.receiveShadow = true; return o;
}

const RED = 0xb8302a, RED_ROOF = 0xa3261f, CREAM = 0xf1e7d2, WHITE = 0xf3f2ee, BLACK = 0x1d1e22;
const SIGN_NAMES = ['疯人院', '鱿鱼大师', '火星餐', 'MARS BEER', 'STAR SUGAR', '娃娃机', '花开披萨殿', 'Mango fly', '火星特饮', '火星烧烤局', '怪诞小镇', '火星来信', 'Boom boom屋', '巨鹿小卖'];
// 霓虹招牌：粉红色细笔画字，夜里整块发光（night.js：有 nightMap 的材质夜里按原色亮）
let signMats = null;
function signMat(i) {
  signMats ||= SIGN_NAMES.map((t) => {
    const tex = canvasTex(256, 64, (g, w, h) => {
      g.clearRect(0, 0, w, h); g.font = `${/[A-Za-z]/.test(t) ? 34 : 40}px "PingFang SC", "Helvetica Neue", sans-serif`; g.textAlign = 'center'; g.textBaseline = 'middle';
      g.lineWidth = 3; g.strokeStyle = '#ff9fc4'; g.shadowColor = '#ff4f8f'; g.shadowBlur = 8; g.strokeText(t, w / 2, h / 2); g.fillStyle = 'rgba(255,220,235,0.25)'; g.fillText(t, w / 2, h / 2);
    });
    const m = new THREE.MeshStandardMaterial({ map: tex, emissiveMap: tex, emissive: 0xffffff, emissiveIntensity: 0.35, transparent: true, alphaTest: 0.05, side: THREE.DoubleSide });
    m.userData.nightMap = tex; return m;
  });
  return signMats[i % signMats.length];
}
let shellTex = null;   // 集装箱：深红色竖向瓦楞
function containerMat() {
  shellTex ||= canvasTex(64, 16, (g, w, h) => { g.fillStyle = '#a3242b'; g.fillRect(0, 0, w, h); g.fillStyle = '#7e1a20'; for (let x = 0; x < w; x += 8) g.fillRect(x, 0, 3, h); });
  shellTex.wrapS = shellTex.wrapT = THREE.RepeatWrapping; shellTex.repeat.set(3, 1);
  return (cache.container ||= new THREE.MeshStandardMaterial({ map: shellTex, roughness: 0.6, metalness: 0.2 }));
}
let scallopTex = null;  // 雨棚：深红布 + 白色波浪边
function awningMat() {
  scallopTex ||= canvasTex(64, 32, (g, w, h) => { g.fillStyle = '#8f1d25'; g.fillRect(0, 0, w, h); g.fillStyle = '#f4efe6'; for (let x = 0; x < w; x += 16) { g.beginPath(); g.arc(x + 8, h - 6, 8, 0, Math.PI); g.fill(); } g.fillRect(0, h - 8, w, 3); });
  scallopTex.wrapS = THREE.RepeatWrapping; scallopTex.repeat.set(4, 1);
  return (cache.awning ||= new THREE.MeshStandardMaterial({ map: scallopTex, roughness: 0.8, side: THREE.DoubleSide }));
}
// 一格摊位：朝 +z 开口，宽 w、深 d
function stall(w, d, k) {
  const g = new THREE.Group();
  g.add(box(w - 0.15, 2.6, d, containerMat(), 0, 1.3, 0));
  g.add(box(w * 0.45, 1.1, 0.06, mat(0x221d1d), -w * 0.18, 1.55, d / 2 + 0.02));                // 出餐窗口
  g.add(box(w * 0.45, 0.12, 0.6, mat(0x2a2424), -w * 0.18, 0.95, d / 2 + 0.3));                   // 窗台
  g.add(box(w * 0.2, 0.9, 0.05, mat(0x3a1015), w * 0.22, 1.55, d / 2 + 0.02));                    // 海报
  const aw = box(w - 0.1, 0.06, 1.3, awningMat(), 0, 2.45, d / 2 + 0.55); aw.rotation.x = 0.28; g.add(aw);   // 雨棚
  // 顶上红栏杆 + 霓虹招牌
  const rail = mat(0xb32a2e, { metalness: 0.3 });
  for (const x of [-w / 2 + 0.2, w / 2 - 0.2]) g.add(box(0.08, 1.4, 0.08, rail, x, 3.3, d / 2 - 0.2));
  g.add(box(w - 0.3, 0.08, 0.08, rail, 0, 4.0, d / 2 - 0.2)); g.add(box(w - 0.3, 0.08, 0.08, rail, 0, 2.65, d / 2 - 0.2));
  const sg = mesh(new THREE.PlaneGeometry(Math.min(w - 0.6, 4.2), 1.0), signMat(k), 0, 3.32, d / 2 - 0.15); sg.castShadow = false; g.add(sg);
  return g;
}
function stallRow(out, { from, to, face }, seed) {
  const [x0, z0] = from, [x1, z1] = to, len = Math.hypot(x1 - x0, z1 - z0), n = Math.max(1, Math.round(len / 6.2)), w = len / n;   // 一格一个 20 尺集装箱（约 6 米）
  const rot = { e: Math.PI / 2, w: -Math.PI / 2, s: 0, n: Math.PI }[face];
  for (let i = 0; i < n; i++) {
    const t = (i + 0.5) / n;
    out.add(place(stall(w, 2.4, seed + i * 7), x0 + (x1 - x0) * t, z0 + (z1 - z0) * t, rot));
  }
}

// 正面沿 +z。导览约 22.5 秒用于读轮廓，9 月 24 日现场画面用于核对双环、梁和字牌。
function gate() {
  const g = new THREE.Group();
  const frame = mat(0x8c333e, { roughness: 0.68 });
  const wing = mat(0x722632);
  const inset = mat(0x382630);
  const white = mat(0xf2eae1, { roughness: 0.55 });
  const ringPaint = mat(0xe9e5dc, { roughness: 0.55, metalness: 0.18 });
  const planetRed = mat(0xa23243);

  const profile = (points, material, back, depth = 0) => {
    const shape = points instanceof THREE.Shape ? points : new THREE.Shape(points.map(([x, y]) => new THREE.Vector2(x, y)));
    const geometry = depth ? new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: false }) : new THREE.ShapeGeometry(shape);
    const object = mesh(geometry, material, 0, 0, back);
    object.castShadow = depth > 0;
    g.add(object);
  };
  const strip = (path, width, material, front) => {
    const points = path.map(([x, y]) => new THREE.Vector3(x, y, front));
    const facets = [];
    for (let i = 0; i < points.length; i++) {
      const from = points[Math.max(0, i - 1)], to = points[Math.min(points.length - 1, i + 1)];
      const tangent = to.clone().sub(from).normalize();
      const cross = new THREE.Vector3(-tangent.y, tangent.x, 0).multiplyScalar(width / 2);
      facets.push(points[i].clone().add(cross), points[i].clone().sub(cross));
    }
    const geo = new THREE.BufferGeometry().setFromPoints(facets);
    const triangles = [];
    for (let i = 0; i < facets.length - 2; i += 2) triangles.push(i, i + 1, i + 2, i + 1, i + 3, i + 2);
    geo.setIndex(triangles);
    geo.computeVertexNormals();
    const band = mesh(geo, material);
    band.castShadow = false;
    g.add(band);
  };
  const sided = (side, points) => points.map(([x, y]) => [side * x, y]);
  const central = [[-8.2, 0], [0, 14.48], [8.2, 0], [6.28, 0], [0, 11.45], [-6.28, 0]];
  profile(central, frame, -1.2, 1.92);
  strip([[-7.2, 0.57], [0, 13.23], [7.2, 0.57]], 0.47, white, 0.723);

  for (const side of [-1, 1]) {
    // 背后的三角翼横向伸出，翼尖朝下，连在主梁后侧。
    profile(sided(side, [[5.5, 8.3], [11.45, 8.3], [9.56, 3.96]]), wing, -1.58, 0.58);
    strip(sided(side, [[6.6, 7.84], [10.78, 7.84], [9.48, 4.91]]), 0.11, white, -0.995);
    strip(sided(side, [[7.34, 7.37], [10.03, 7.37], [9.36, 5.7]]), 0.1, white, -0.99);

    // 侧肩高低交错，正面白色包边之间能看到深色槽。
    profile(sided(side, [[9.62, 0], [9.62, 2.25], [3.63, 11.32], [0.78, 9.15], [1.75, 7.9], [3.24, 8.86], [7.13, 0]]), frame, -0.72, 1.94);
    profile(sided(side, [[9.62, 0], [9.62, 2.25], [3.63, 11.32], [0.78, 9.15], [1.28, 8.98], [3.68, 10.34], [9.1, 2.13], [9.1, 0]]), frame, 1.22, 0.27);
    profile(sided(side, [[7.13, 0], [3.24, 8.86], [1.75, 7.9], [2.46, 8.82], [3.55, 9.29], [8.34, 0.84], [8.34, 0]]), frame, 1.22, 0.27);
    profile(sided(side, [[9.1, 0.84], [9.1, 2.13], [3.68, 10.34], [2.44, 9.4], [2.9, 8.9], [3.55, 9.29], [8.34, 0.84]]), inset, 1.225);
    strip(sided(side, [[9.25, 0.61], [9.25, 2.17], [3.67, 10.79], [1.45, 9.14]]), 0.23, white, 1.506);
    strip(sided(side, [[7.64, 0.33], [3.23, 9.24], [2.28, 8.55]]), 0.17, white, 1.508);
    strip(sided(side, [[8.83, 1.28], [8.85, 2.07], [3.68, 10.0]]), 0.095, mat(0x665466), 1.31);
    strip(sided(side, [[8.61, 1.28], [8.63, 2.02], [3.58, 9.69]]), 0.07, mat(0x524852), 1.265);
  }
  g.add(box(7.9, 0.14, 0.24, wing, 0, 7.81, 0.64), box(7.3, 0.15, 0.24, wing, 0, 7.98, -0.42));
  // 现场仰拍可见字牌下方偏右的酒红弧边及其上方空隙。
  const hangingCurve = new THREE.Shape();
  hangingCurve.moveTo(0.18, 7.98);
  hangingCurve.lineTo(3.42, 7.98);
  hangingCurve.bezierCurveTo(3.43, 7.38, 3.06, 7.03, 2.42, 7.03);
  hangingCurve.bezierCurveTo(1.6, 7.03, 1.12, 7.62, 0.18, 7.98);
  const opening = new THREE.Path();
  opening.absellipse(1.94, 7.71, 0.82, 0.13, 0, Math.PI * 2, true, -0.06);
  hangingCurve.holes.push(opening);
  profile(hangingCurve, planetRed, 0.76, 0.13);

  // 两根细轨和中间连接片组成顶部、右柱各一组星环。
  const orbit = (width, depth, gap, position, rotation, label = '') => {
    const group = new THREE.Group();
    const oval = new THREE.EllipseCurve(0, 0, width, depth);
    const curve = new THREE.CatmullRomCurve3(oval.getPoints(64).slice(0, -1).map(({ x, y }) => new THREE.Vector3(x, 0, y)), true);
    const rail = new THREE.TubeGeometry(curve, 96, 0.022, 6, true);
    for (const y of [-gap / 2, gap / 2]) {
      const ring = mesh(rail, ringPaint, 0, y, 0);
      ring.castShadow = false;
      group.add(ring);
    }
    for (let i = 0; i < 14; i++) {
      const angle = i * Math.PI / 7;
      const link = box(0.043, gap, 0.043, ringPaint, Math.cos(angle) * width, 0, Math.sin(angle) * depth);
      link.castShadow = false;
      group.add(link);
    }
    if (label) {
      const tex = canvasTex(512, 90, (c, w, h) => {
        c.font = '55px Georgia, serif'; c.textAlign = 'center'; c.textBaseline = 'middle';
        c.fillStyle = '#eee7db'; c.fillText(label, w / 2, h / 2 + 2);
      });
      const text = mesh(new THREE.PlaneGeometry(4.5, gap * 1.2), new THREE.MeshStandardMaterial({ map: tex, alphaTest: 0.35, side: THREE.DoubleSide }), 0, 0, depth + 0.025);
      text.castShadow = false;
      group.add(text);
    }
    group.position.set(...position);
    group.rotation.set(...rotation);
    g.add(group);
  };
  orbit(4.45, 1.77, 0.38, [0, 12.05, 0.17], [-0.12, 0, 0.035], 'BACK TO THE MARS');
  orbit(2.17, 0.97, 0.31, [7.37, 4.01, 0.77], [0.22, -0.27, 0.47]);

  // 行星徽记位于字牌左后方，带有倾斜的同色轨道。
  const emblem = new THREE.Group();
  emblem.position.set(-1.75, 9.22, 1.84);
  const planet = mesh(new THREE.CylinderGeometry(2.04, 2.04, 0.17, 48), planetRed);
  planet.rotation.x = Math.PI / 2;
  emblem.add(planet);
  const ellipse = new THREE.Shape();
  ellipse.absellipse(0, 0, 3.25, 0.59, 0, Math.PI * 2, false, 0);
  const hole = new THREE.Path();
  hole.absellipse(0, 0, 2.83, 0.25, 0, Math.PI * 2, true, 0);
  ellipse.holes.push(hole);
  const planetRing = mesh(new THREE.ExtrudeGeometry(ellipse, { depth: 0.095, bevelEnabled: false, curveSegments: 48 }), planetRed, 0, -0.53, 0.09);
  planetRing.rotation.z = 0.38;
  emblem.add(planetRing);
  g.add(emblem);

  profile([[-3.55, 8.08], [3.77, 8.2], [3.92, 8.51], [3.85, 9.34], [-3.54, 9.31], [-3.75, 8.6]], wing, 1.79, 0.42);
  const text = canvasTex(1050, 192, (c) => {
    c.textAlign = 'center'; c.textBaseline = 'middle'; c.lineJoin = 'round';
    c.font = '900 126px "PingFang SC", "Hiragino Sans GB", sans-serif';
    c.translate(412, 100); c.scale(1.06, 1);
    c.lineWidth = 22; c.strokeStyle = '#492c29'; c.strokeText('火星乌托邦', 0, 7);
    c.lineWidth = 17; c.strokeStyle = '#ce9b56'; c.strokeText('火星乌托邦', 0, 0);
    c.fillStyle = '#fff6e4'; c.fillText('火星乌托邦', 0, 0);
    c.setTransform(1, 0, 0, 1, 0, 0);
    c.fillStyle = '#b6384d'; c.strokeStyle = '#d9a368'; c.lineWidth = 7;
    c.beginPath(); c.roundRect(775, 39, 243, 118, 17); c.fill(); c.stroke();
    c.fillStyle = '#fff7e9'; c.font = '900 42px "PingFang SC", sans-serif';
    c.fillText('乐', 813, 72); c.fillText('园', 813, 119);
    c.font = '900 96px sans-serif'; c.fillText('2.0', 916, 101);
  });
  const sign = mesh(new THREE.PlaneGeometry(7.71, 1.62), new THREE.MeshStandardMaterial({ map: text, alphaTest: 0.4, roughness: 0.55 }), 0, 8.88, 2.23);
  sign.castShadow = false; g.add(sign);

  // 薄瓣朝外翻卷，底层带蓝紫色瓣缘。
  const petalGeometry = new THREE.BufferGeometry();
  const petals = [], uv = [], faces = [];
  const lengthSteps = 10, widthSteps = 6;
  for (let i = 0; i <= lengthSteps; i++) {
    const t = i / lengthSteps;
    const profileWidth = Math.max(0.009, 0.34 * Math.sin(Math.PI * t) ** 0.8);
    for (let j = 0; j <= widthSteps; j++) {
      const side = 2 * j / widthSteps - 1;
      const edge = side ** 2;
      petals.push(1.12 * t, side * profileWidth + 0.06 * t ** 2, 0.24 * t ** 3 + 0.19 * edge * t);
      uv.push(j / widthSteps, t);
      if (i < lengthSteps && j < widthSteps) {
        const a = i * (widthSteps + 1) + j, b = a + widthSteps + 1;
        faces.push(a, b, a + 1, b, b + 1, a + 1);
      }
    }
  }
  petalGeometry.setAttribute('position', new THREE.Float32BufferAttribute(petals, 3));
  petalGeometry.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  petalGeometry.setIndex(faces);
  petalGeometry.computeVertexNormals();
  const petalTint = canvasTex(64, 4, (ctx, width, height) => {
    const gradient = ctx.createLinearGradient(0, 0, width, 0);
    gradient.addColorStop(0, '#d6cce8');
    gradient.addColorStop(0.44, '#fffaff');
    gradient.addColorStop(1, '#e8dbef');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);
  });
  for (const [x, y, z, size, color, angle] of [
    [-3.86, 10.19, 1.63, 0.54, 0xf3e9e3, 0.3], [-6.17, 6.01, 1.63, 0.45, 0xf4e1ec, -0.2],
    [-8.56, 1.38, 1.64, 0.67, 0xece4f3, 0.1], [1.07, 13.13, 0.84, 0.49, 0x9bb7d6, -0.2],
    [3.82, 7.83, 2.08, 0.57, 0xf5e5db, 0.2], [7.34, 4.89, 1.7, 0.43, 0xa6bbd8, 0.35],
    [8.1, 2.59, 1.63, 0.4, 0xc2cbde, -0.45], [8.79, 0.96, 1.62, 0.65, 0xebd6e9, -0.38],
  ]) {
    const flower = new THREE.Group();
    flower.position.set(x, y, z);
    flower.rotation.z = angle;
    const dark = new THREE.Color(color).lerp(new THREE.Color(0x5d5a91), 0.52).getHex();
    for (const [count, spread, length, hue, twist] of [[7, 0.19, 0.87, dark, 0], [5, 0.1, 0.74, color, 0.52]]) {
      const petalMat = new THREE.MeshStandardMaterial({ color: hue, map: petalTint, side: THREE.DoubleSide, roughness: 0.77 });
      for (let i = 0; i < count; i++) {
        const a = i * 2 * Math.PI / count + twist + 0.06 * Math.sin(i * 3);
        const petal = mesh(petalGeometry, petalMat, size * spread * Math.cos(a), size * spread * Math.sin(a), twist * 0.16);
        petal.scale.set(size * length * (0.96 + 0.11 * Math.cos(i * 5)), size, size);
        petal.rotation.z = a;
        flower.add(petal);
      }
    }
    const center = mesh(new THREE.SphereGeometry(size * 0.23, 10, 8), mat(0xe1be98), 0, 0, size * 0.24);
    center.scale.z = 0.5;
    flower.add(center);
    g.add(flower);
  }
  return g;
}

// 高领、斜挎带、发束都保留在约 10.7 万面的网格中（site/giant-mesh.js）。头部与手指使用较细格网。
// 模型原本面朝 +x、两臂沿 ±z 平伸、y 朝上，坐标归一到约 1 个单位；按导览俯视量的两手间距约 22 米放大 22 倍，转成面朝 +z。
function giant() {
  const M = GIANT_MESH, Cc = GIANT_COLORS, dec = (s, T) => new T(Uint8Array.from(atob(s), (c) => c.charCodeAt(0)).buffer);
  const q = dec(M.pos, Uint16Array), idx = dec(M.idx, M.index32 ? Uint32Array : Uint16Array);
  const pos = new Float32Array(q.length);
  for (let i = 0; i < q.length; i++) pos[i] = M.min[i % 3] + (q[i] / 65535) * M.span[i % 3];
  for (let i = 0; i < pos.length; i += 3) {
    const y = pos[i + 1], lateral = pos[i + 2] + 0.005;
    const fan = THREE.MathUtils.smoothstep(Math.abs(lateral), 0.105, 0.176)
      * THREE.MathUtils.smoothstep(y, 0.015, 0.064) * (1 - THREE.MathUtils.smoothstep(y, 0.13, 0.205));
    pos[i + 1] += 0.021 * fan;
    pos[i + 2] += Math.sign(lateral) * 0.024 * fan;
  }
  const rgb8 = dec(Cc.rgb, Uint8Array), col = new Float32Array(rgb8.length), c = new THREE.Color();
  for (let i = 0; i < rgb8.length; i += 4) { c.setRGB(rgb8[i] / 255, rgb8[i + 1] / 255, rgb8[i + 2] / 255, THREE.SRGBColorSpace); col.set([c.r, c.g, c.b, rgb8[i + 3] / 255], i); }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3)); geo.setAttribute('color', new THREE.BufferAttribute(col, 4));
  geo.setIndex(new THREE.BufferAttribute(idx, 1)); geo.computeVertexNormals();
  // 每类布面采用相应的纹理方向，按屏幕上的细纹密度淡出。
  const bodyMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.84, side: THREE.DoubleSide });
  bodyMat.onBeforeCompile = (sh) => {
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vObjPos;').replace('#include <begin_vertex>', '#include <begin_vertex>\nvObjPos = position;');
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', `#include <common>
      varying vec3 vObjPos;
      float fabricWave(float phase, float footprint) {
        return cos(phase) * (1.0 - smoothstep(0.55, 2.1, footprint));
      }`)
      .replace('#include <color_fragment>', `
        diffuseColor.rgb *= vColor.rgb;
        float knit = (vObjPos.z + vObjPos.x * 0.52) * 1720.0;
        float stitch = vObjPos.y * 2340.0 + 0.82 * sin(knit);
        float collar = vObjPos.y * 1180.0;
        float strap = (vObjPos.y + vObjPos.z * 0.52) * 1930.0;
        float hair = (vObjPos.z + vObjPos.x * 0.14) * 1240.0 + 9.0 * sin(vObjPos.y * 8.0);
        float rib = fabricWave(knit, fwidth(knit));
        float cross = fabricWave(stitch, fwidth(stitch));
        float bands = fabricWave(collar, fwidth(collar));
        float tape = fabricWave(strap, fwidth(strap));
        float strands = fabricWave(hair, fwidth(hair));
        if (vColor.a > 0.875) diffuseColor.rgb *= 0.97 + rib * 0.095 + cross * 0.055;
        else if (vColor.a > 0.625) diffuseColor.rgb *= 0.99 + bands * 0.056;
        else if (vColor.a > 0.375) diffuseColor.rgb *= 0.99 + tape * 0.034;
        else if (vColor.a > 0.125) diffuseColor.rgb *= 0.99 + strands * 0.046;
      `);
  };
  bodyMat.customProgramCacheKey = () => 'giant-fabric';
  const m = new THREE.Mesh(geo, bodyMat);
  const thread = new THREE.MeshStandardMaterial({ color: 0xe2dfe2, roughness: 0.83 });
  const frontAxis = new THREE.Vector3(0, 0, 1);
  const stitchRadius = 0.00118;
  const stitch = new THREE.CapsuleGeometry(stitchRadius, 0.0198, 4, 8);
  for (const e of Cc.eyes) {
    const normal = new THREE.Vector3(...e.n).normalize();
    const cross = new THREE.Group();
    cross.position.set(...e.p).addScaledVector(normal, 0.0009);
    cross.quaternion.setFromUnitVectors(frontAxis, normal);
    for (const angle of [Math.PI / 4, -Math.PI / 4]) {
      const bar = new THREE.Mesh(stitch, thread);
      bar.rotation.z = angle;
      cross.add(bar);
    }
    m.add(cross);
  }

  const tubeMaterial = new THREE.MeshStandardMaterial({ color: 0x635c5e, roughness: 0.77 });
  const endMaterial = new THREE.MeshStandardMaterial({ color: 0x73696e, roughness: 0.76 });
  const cheekPaths = [
    [[0.051, 0.025, 0.068], [0.032, 0.020, 0.077], [-0.024, 0.008, 0.090], [-0.048, -0.009, 0.093]],
    [[0.056, 0.026, -0.074], [0.041, 0.022, -0.084], [-0.020, 0.010, -0.095], [-0.043, -0.007, -0.103]],
  ];
  for (const points of cheekPaths) {
    const curve = new THREE.CatmullRomCurve3(points.map((point) => new THREE.Vector3(...point)));
    const radius = 0.0050;
    m.add(new THREE.Mesh(new THREE.TubeGeometry(curve, 20, radius, 10), tubeMaterial));
    const tip = new THREE.Mesh(new THREE.CircleGeometry(radius, 10), endMaterial);
    tip.position.copy(curve.getPoint(0));
    tip.quaternion.setFromUnitVectors(frontAxis, curve.getTangent(0).negate());
    m.add(tip);
    const rim = new THREE.Mesh(new THREE.TorusGeometry(radius, 0.00055, 6, 12), endMaterial);
    rim.position.copy(curve.getPoint(0.052));
    rim.quaternion.setFromUnitVectors(frontAxis, curve.getTangent(0.052));
    m.add(rim);
  }
  m.scale.setScalar(22); m.rotation.y = -Math.PI / 2; m.position.y = -M.min[1] * 22;   // 底面落地，面朝 +z
  m.castShadow = m.receiveShadow = true;
  m.traverse((o) => { if (o.isMesh) o.userData.dynamic = true; });                         // 顶点色：不并进静态网格
  const g = new THREE.Group(); g.add(m); return g;
}

let velvetTex = null;
function bull() {
  const g = new THREE.Group();
  velvetTex ||= canvasTex(128, 8, (c, w, h) => { const gr = c.createLinearGradient(0, 0, w, 0); for (let i = 0; i <= 16; i++) gr.addColorStop(i / 16, i % 2 ? '#7a0f18' : '#b0222e'); c.fillStyle = gr; c.fillRect(0, 0, w, h); });
  velvetTex.wrapS = THREE.RepeatWrapping; velvetTex.repeat.set(6, 1);
  const tent = mesh(new THREE.ConeGeometry(13, 13, 3, 1), new THREE.MeshStandardMaterial({ map: velvetTex, roughness: 0.95 }), 0, 6.5, -4);
  tent.rotation.y = Math.PI / 6 + Math.PI; tent.scale.set(1, 1, 1.25); g.add(tent);   // 三角尖朝南（俯视）
  // 白色公牛（站姿）：圆台 + 身子 + 头 + 角 + 腿
  const w = mat(0xf3f2ef, { roughness: 0.45 }), b = new THREE.Group(); b.position.set(0, 0, 7.5); b.rotation.y = -0.5; g.add(b);
  b.add(mesh(new THREE.CylinderGeometry(2.4, 2.4, 0.5, 28), w, 0, 0.25, 0));
  const body = mesh(new THREE.CapsuleGeometry(0.85, 1.8, 6, 12), w, 0, 1.75, 0); body.rotation.z = Math.PI / 2; body.scale.set(1, 1, 0.85); b.add(body);
  b.add(mesh(new THREE.SphereGeometry(1.05, 14, 10), w, 0.9, 2.05, 0));                     // 隆起的肩
  const head = mesh(new THREE.BoxGeometry(0.9, 0.75, 0.7), w, 1.95, 1.55, 0); head.rotation.z = -0.5; b.add(head);
  for (const s of [-1, 1]) { const h = mesh(new THREE.ConeGeometry(0.1, 0.7, 8), w, 1.95, 2.05, s * 0.42); h.rotation.x = s * 0.9; b.add(h); }
  for (const [x, z] of [[-0.9, -0.38], [-0.9, 0.38], [0.85, -0.38], [0.85, 0.38]]) b.add(box(0.28, 1.1, 0.28, w, x, 0.95, z));
  return g;
}
let pyrTex = null;
function redPyramid() {
  pyrTex ||= canvasTex(256, 256, (c, w, h) => {
    c.fillStyle = 'rgba(205,40,48,0.78)'; c.fillRect(0, 0, w, h); c.strokeStyle = 'rgba(70,10,14,0.7)'; c.lineWidth = 2;
    for (let i = 0; i < 5; i++) { c.beginPath(); c.ellipse(60 + i * 38, 150 + (i % 2) * 30, 26, 12, 0.2, 0, Math.PI * 2); c.stroke(); }   // 线稿的牛
    c.fillStyle = 'rgba(255,230,230,0.8)'; c.font = '20px "Times New Roman", serif'; c.textAlign = 'center'; c.fillText('MARS CONCERT', w / 2, 236);
  });
  const m = new THREE.MeshStandardMaterial({ map: pyrTex, transparent: true, side: THREE.DoubleSide, roughness: 0.8, depthWrite: false });
  const p = mesh(new THREE.ConeGeometry(6.4, 8, 4, 1, true), m, 0, 4, 0); p.rotation.y = Math.PI / 4; p.castShadow = false; p.userData.dynamic = true;
  const g = new THREE.Group(); g.add(p);
  const edge = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.ConeGeometry(6.4, 8, 4, 1, true)), new THREE.LineBasicMaterial({ color: 0xffffff })); edge.position.y = 4; edge.rotation.y = Math.PI / 4; g.add(edge);
  return g;
}

// 中间黄、往外一圈红橙、蓝、青，尖角是黄色的星芒；底下的杆在地上投出一道道细影
let mandalaTex = null;
function starCanopy(r) {
  mandalaTex ||= canvasTex(512, 512, (c, w, h) => {
    c.clearRect(0, 0, w, h); c.translate(w / 2, h / 2);
    const ring = (n, rad, len, wid, cols, rot = 0) => { for (let i = 0; i < n; i++) { const a = (i / n) * Math.PI * 2 + rot; c.save(); c.rotate(a); c.translate(rad, 0); c.beginPath(); c.moveTo(-len / 2, 0); c.lineTo(0, -wid / 2); c.lineTo(len / 2, 0); c.lineTo(0, wid / 2); c.closePath(); c.fillStyle = cols[i % cols.length]; c.fill(); c.strokeStyle = 'rgba(255,255,255,0.6)'; c.lineWidth = 2; c.stroke(); c.restore(); } };
    ring(16, 236, 64, 40, ['#f2c230', '#f7d74a']);                            // 外圈黄色星芒
    ring(16, 190, 70, 34, ['#2f6fc0', '#2fb1a0'], Math.PI / 16);
    ring(12, 140, 64, 36, ['#d8352f', '#f08a24']);
    ring(12, 96, 56, 30, ['#2f6fc0', '#e86aa8', '#2fb1a0'], Math.PI / 12);
    ring(8, 56, 52, 30, ['#f2c230', '#d8352f']);
    c.beginPath(); c.arc(0, 0, 26, 0, Math.PI * 2); c.fillStyle = '#f2c230'; c.fill();
  });
  const g = new THREE.Group(), n = 16, pts = [];
  for (let i = 0; i < n * 2; i++) { const a = (i / (n * 2)) * Math.PI * 2, rr = i % 2 ? r * 0.72 : r; pts.push(new THREE.Vector2(Math.cos(a) * rr, Math.sin(a) * rr)); }
  const geo = new THREE.ShapeGeometry(new THREE.Shape(pts)); const uv = geo.attributes.uv, pos = geo.attributes.position;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, pos.getX(i) / (2 * r) + 0.5, pos.getY(i) / (2 * r) + 0.5);
  geo.rotateX(-Math.PI / 2);
  const top = mesh(geo, new THREE.MeshStandardMaterial({ map: mandalaTex, transparent: true, alphaTest: 0.4, side: THREE.DoubleSide, roughness: 0.8 }), 0, 3.4, 0);
  top.userData.dynamic = true; g.add(top);
  const pole = mat(0xeeeeee, { metalness: 0.3 });
  for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2; g.add(mesh(new THREE.CylinderGeometry(0.05, 0.05, 3.4, 6), pole, Math.cos(a) * r * 0.55, 1.7, Math.sin(a) * r * 0.55)); }
  g.add(mesh(new THREE.CylinderGeometry(0.08, 0.08, 3.5, 8), pole, 0, 1.75, 0));
  return g;
}

// 一条长长的、圆润的低矮身子（约 1 米高，观众坐在上面），上面立起几根弯月形的“鹿角”（3–5 米高，尖往前弯）；
// 俯视像一只往前跃的鹿的剪影。本地朝 +x 是头的方向。
const DEER_CREAM = 0xebe5cc;
function horn(h, w, r0) {
  const curve = new THREE.QuadraticBezierCurve3(new THREE.Vector3(0, 0, 0), new THREE.Vector3(-w * 0.25, h * 0.75, 0), new THREE.Vector3(w, h, 0));
  const segs = 24, rad = 12, pos = [], idx = [], up = new THREE.Vector3(0, 0, 1);
  for (let i = 0; i <= segs; i++) {
    const t = i / segs, p = curve.getPoint(t), tg = curve.getTangent(t), nx = new THREE.Vector3().crossVectors(tg, up).normalize(), r = r0 * (1 - 0.85 * t ** 1.3);
    for (let j = 0; j < rad; j++) { const a = (j / rad) * Math.PI * 2; pos.push(p.x + (nx.x * Math.cos(a)) * r, p.y + (nx.y * Math.cos(a)) * r, p.z + Math.sin(a) * r); }
  }
  for (let i = 0; i < segs; i++) for (let j = 0; j < rad; j++) { const a = i * rad + j, b = i * rad + ((j + 1) % rad), c = a + rad, d = b + rad; idx.push(a, c, b, b, c, d); }
  const tip = curve.getPoint(1); pos.push(tip.x, tip.y, tip.z); const T = (segs + 1) * rad;
  for (let j = 0; j < rad; j++) idx.push(segs * rad + j, T, segs * rad + ((j + 1) % rad));
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals(); return g;
}
function deer(seed) {
  const g = new THREE.Group(), m = mat(DEER_CREAM, { roughness: 0.45 });
  // 身子：俯视是一只前跃的鹿（身子、前伸的脖子和头、往后蹬的腿），挤出约 1 米高、边缘倒圆
  const body = new THREE.Shape([[-5.5, 0.2], [-4.6, 1.1], [-3.2, 0.9], [-1.5, 1.3], [0.8, 1.2], [2.6, 1.5], [3.8, 2.4], [5.0, 2.6], [5.6, 1.9], [4.6, 1.1], [3.4, 0.2],
    [2.0, -0.9], [0.4, -1.1], [-1.2, -0.9], [-2.6, -1.4], [-4.4, -2.0], [-5.2, -1.5], [-4.0, -0.7]].map(([a, b]) => new THREE.Vector2(a, b)));
  const bg = new THREE.ExtrudeGeometry(body, { depth: 0.55, bevelEnabled: true, bevelSize: 0.4, bevelThickness: 0.4, bevelSegments: 4, curveSegments: 4 });
  bg.rotateX(-Math.PI / 2); g.add(mesh(bg, m, 0, 0.4, 0));
  // 鹿角：头部三根大的、背上两根小的，往前（+x）弯
  const k = 0.85 + (seed % 3) * 0.12;
  for (const [x, z, h, w, rot, r0] of [[4.4, 2.0, 4.8 * k, 1.7, 0.25, 0.55], [3.7, 1.0, 3.9 * k, 1.4, -0.2, 0.48], [4.9, 1.2, 3.2 * k, 1.2, 0.5, 0.42], [-1.0, 0.1, 2.6 * k, 1.0, 0, 0.42], [-3.4, -0.6, 2.2 * k, 0.9, -0.3, 0.38]]) {
    const c = mesh(horn(h, w, r0), m, x, 0.8, z); c.rotation.y = rot; g.add(c);
  }
  return g;
}

function horse(grazing) {
  const g=new THREE.Group(), ivory=mat(0xf1f1e6,{roughness:.45}), orange=mat(0xdc7429), red=mat(0xc1453c);
  const v=(x,y,z)=>new THREE.Vector3(x,y,z);
  const oval=(x,y,z,rx,ry,rz,m=ivory)=>{
    const o=mesh(new THREE.SphereGeometry(1,24,16),m,x,y,z);o.scale.set(rx,ry,rz);g.add(o);return o;
  };
  function form(control, widths, depths, material=ivory, joints=[]) {
    const curve=new THREE.CatmullRomCurve3(control.map(p=>v(...p))), rings=control.length*(joints.length ? 18 : 5), sides=20, vertices=[], faces=[];
    for(let i=0;i<=rings;i++){
      const t=i/rings,p=curve.getPoint(t), tangent=curve.getTangent(t);
      const n=v(-tangent.y,tangent.x,0).normalize(), f=t*(widths.length-1),j=Math.min(widths.length-2,Math.floor(f));
      // Shallow incisions follow the neck cross-section all the way round.
      const seam = joints.reduce((depth, at) => Math.max(depth, .18 * Math.exp(-((t-at)**2)/.000038)), 0);
      const w=(1-seam)*THREE.MathUtils.lerp(widths[j],widths[j+1],f-j), d=(1-seam)*THREE.MathUtils.lerp(depths[j],depths[j+1],f-j);
      for(let k=0;k<sides;k++){
        const angle=k*2*Math.PI/sides;
        vertices.push(p.x+n.x*w*Math.cos(angle),p.y+n.y*w*Math.cos(angle),p.z+d*Math.sin(angle));
        if(i<rings){const a=i*sides+k,b=i*sides+(k+1)%sides;faces.push(a,b,a+sides,b,b+sides,a+sides);}
      }
    }
    const geom=new THREE.BufferGeometry();geom.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));geom.setIndex(faces);geom.computeVertexNormals();g.add(mesh(geom,material));
  }
  if (grazing) {
    form([[-2.7,2.9,0],[-2.0,2.88,0],[-.3,2.72,0],[1.0,3.10,0],[1.58,3.35,0],[2.10,2.68,0],[2.65,1.52,0],[3.06,.56,0]],
      [.03,.59,.64,.65,.53,.44,.32,.22],[.04,.62,.62,.54,.45,.37,.30,.24],ivory,[.735,.805,.865,.93]);
    const muzzle=oval(3.14,.46,0,.48,.25,.23);muzzle.rotation.z=-.48;
    for (const side of [-1,1]) {
      const ear=oval(2.92,.92,side*.16,.09,.23,.07);ear.rotation.z=-.40;
      oval(3.11,.67,side*.231,.035,.043,.016,mat(0x666964));
    }
    for(const x of [-1.7,.72]) for(const z of [-.40,.40]){
      form([[x,2.6,z],[x+.1,1.5,z],[x+.20,.28,z]],[.33,.15,.08],[.27,.12,.08]);
      oval(x+.23,.17,z,.21,.16,.17);
    }
    for(const z of [-.55,.55]) {
      g.add(box(.10,1.02,.09,red,-1.66,3.77,z),box(.10,1.02,.09,red,-.55,3.77,z),box(1.19,.085,.085,mat(0xebad38),-1.1,4.20,z));
      for(let j=0;j<4;j++)g.add(box(.055,.68,.07,mat(j%2?0x4294ba:0xe5a033),-1.48+j*.23,3.78,z));
    }
    for(let j=0;j<4;j++)g.add(box(.14,.075,.59,red,-2.15+j*.16,3.05+j*.17,.55));
  } else {
    form([[-2.42,2.85,0],[-2.10,2.12,0],[-1.4,1.62,0],[.1,1.58,0],[1.25,2.02,0],[1.24,2.90,0],[1.45,3.65,0]],
      [.02,.28,.53,.45,.63,.54,.38],[.02,.15,.65,.59,.66,.52,.38],ivory,[.73,.825,.91]);
    oval(1.68,3.68,0,.65,.40,.35).rotation.z=-.22;
    oval(2.16,3.46,0,.34,.27,.31);
    for(const side of [-1,1]) oval(1.85,3.77,side*.32,.039,.052,.015,mat(0x535451));
    for(const x of [-1.4,1.15]) for(const z of [-.36,.36]) {
      form([[x,1.65,z],[x-.05,1.08,z],[x,.29,z]],[.46,.22,.29],[.33,.18,.24]);
      g.add(mesh(new THREE.CylinderGeometry(.26,.36,.27,20),orange,x,.145,z));
    }
    for (let i=0; i<5; i++) {
      const y=4.04-.20*i, x=1.39-.035*i;
      form([[x,y-.04,0],[x-.23,y+.035,0],[x-.53,y-.03,0],[x-.78,y-.12,0],[x-.94,y-.09,0]],
        [.06,.17,.14,.075,.006],[.13,.29,.25,.11,.009],orange);
    }
    form([[-2.38,2.65,0],[-2.43,2.85,0],[-2.56,3.02,0],[-2.45,3.19,0]],
      [.12,.20,.18,.035],[.12,.18,.16,.025],orange);
    for(const z of [-.20,.20]) oval(1.6,4.0,z,.12,.24,.08);
    for(let j=0;j<3;j++) oval(1.22,2.44+j*.40,0,.52-j*.045,.09,.52-j*.04);
  }
  return g;
}

function clockFigure() {
  const g=new THREE.Group(), pink=mat(0xebced5,{emissive:0xaf8a83,emissiveIntensity:.14}), dark=mat(0xcb889a), mint=mat(0xa4d9cf), cream=mat(0xf3dfd9);
  const blob=(x,y,z,rx,ry,rz,m=pink)=>{
    const o=mesh(new THREE.SphereGeometry(1,28,18),m,x,y,z);o.scale.set(rx,ry,rz);g.add(o);return o;
  };
  const stem=(a,b,r,m)=>{
    const from=new THREE.Vector3(...a),to=new THREE.Vector3(...b),dir=to.clone().sub(from);
    const o=mesh(new THREE.CylinderGeometry(r*.57,r,dir.length(),9),m);o.position.copy(from).lerp(to,.5);
    o.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),dir.normalize());g.add(o);
  };
  blob(0,1.86,0,1.06,1.54,.70);blob(0,3.40,0,.73,.48,.55);
  g.add(box(.57,.13,.06,cream,0,3.42,.51));blob(0,3.74,0,.90,.30,.64);
  for(const side of [-1,1]) {
    blob(side*.68,.46,.13,.48,.44,.52);blob(side*1.28,2.03,.07,.32,.21,.24,dark);
    stem([side*.92,2.31,0],[side*1.45,2.03,.06],.19,dark);
    for(let i=0;i<3;i++) {
      const x = 1.01+i*.24, y = 1.48+.08*i;
      const knuckle=[side*(x+.12),1.82,.17], bend=[side*(x+.10),y+.12,.24];
      stem([side*x,2.02,.10],knuckle,.115,dark);
      stem(knuckle,bend,.082,dark);
      stem(bend,[side*(x-.028),y,.29],.051,dark);
      stem([side*(1.03+.12*i),2.16,.04],[side*(1.09+.20*i),2.45+.1*i,.08],.077,dark);
    }
    stem([side*.51,3.22,0],[side*.94,3.56,.05],.038,mint);blob(side*.94,3.56,.05,.091,.09,.09,mat(0x709bbf));
    blob(side*.28,3.78,.55,.07,.10,.04,mint);
  }
  blob(0,1.91,.66,.31,.33,.15,dark);
  for(let i=0;i<8;i++) {
    const a=i*Math.PI/4;stem([.24*Math.cos(a),1.91+.25*Math.sin(a),.72],[.61*Math.cos(a),1.91+.78*Math.sin(a),.56],.080,mint);
    blob(.28*Math.cos(a),1.91+.28*Math.sin(a),.81,.035,.035,.03,cream);
  }
  // Long, mint vertical pointer and the shorter pink hand protrude from the dial.
  for(const y of [.94,2.91]) {
    const hand=blob(0,(1.91+y)/2,.80,.078,Math.abs(y-1.91)*.58,.085,mint);
    hand.rotation.z=y>2?-.06:.04;
  }
  stem([0,1.91,.90],[-.36,2.35,.88],.11,dark);
  stem([.02,1.90,.90],[.28,1.38,.83],.089,dark);
  blob(0,1.91,.87,.18,.19,.11,dark);
  for (const [x,y] of [[-.71,2.48],[.68,2.39],[-.34,3.00],[.16,2.97],[.42,.85],[-.28,.89],[-.51,2.71],[.54,2.59],[-.56,1.44],[.59,1.21],[.12,.85],[-.71,2.15]]) {
    const poly=new THREE.Shape();
    for(let i=0;i<10;i++){const a=Math.PI/2+i*Math.PI/5,r=i%2?.079:.163;
      if(i)poly.lineTo(r*Math.cos(a),r*Math.sin(a));else poly.moveTo(r*Math.cos(a),r*Math.sin(a));}
    poly.closePath();g.add(mesh(new THREE.ExtrudeGeometry(poly,{depth:.055,bevelEnabled:true,bevelSegments:1,bevelSize:.014,bevelThickness:.014}),cream,x,y,.62));
  }
  return g;
}

function house(w, d, h, wall, roof) {   // 尖顶小屋
  const g = new THREE.Group(); g.add(box(w, h, d, mat(wall), 0, h / 2, 0));
  const r = mesh(new THREE.ConeGeometry(Math.hypot(w, d) / 2 + 0.3, h * 0.6, 4), mat(roof), 0, h + h * 0.3, 0); r.rotation.y = Math.PI / 4; g.add(r); return g;
}

function marquee() {   // 白色大帐篷：方形 + 四坡尖顶
  const g = new THREE.Group(), w = mat(WHITE, { roughness: 0.6 });
  g.add(box(10, 3, 10, w, 0, 1.5, 0)); const r = mesh(new THREE.ConeGeometry(7.3, 3.4, 4), w, 0, 4.7, 0); r.rotation.y = Math.PI / 4; g.add(r); return g;
}

export function buildUtopia() {
  const U = LAYOUT.utopia, g = new THREE.Group();
  g.add(flat(U.lot, mat(0xd6d7d3, { roughness: 0.95 }), surfaceY.utopia));
  // 人造草皮：顺着场地长边的深浅条纹（俯视能看出一道道）
  const stripes = canvasTex(32, 8, (c) => { c.fillStyle = '#3ea35c'; c.fillRect(0, 0, 32, 8); c.fillStyle = '#33914f'; c.fillRect(0, 0, 16, 8); });
  stripes.wrapS = stripes.wrapT = THREE.RepeatWrapping; stripes.repeat.set(1 / 7, 1 / 7);
  for (const t of U.turf) g.add(flat(t, new THREE.MeshStandardMaterial({ map: stripes, roughness: 0.95 }), surfaceY.utopiaTurf));
  // 围挡：灰色板，沿外框一圈（门头处断开）
  const fence = mat(0x8c949a, { roughness: 0.85 });
  for (let i = 0; i < U.lot.length; i++) {
    const [ax, az] = U.lot[i], [bx, bz] = U.lot[(i + 1) % U.lot.length];
    const segs = (Math.abs(ax - U.gate[0]) < 3 && Math.abs(bx - U.gate[0]) < 3) ? [[az, U.gate[1] + 10], [U.gate[1] - 10, bz]] : [[az, bz]];
    for (const [s0, s1] of segs) {
      const p0 = segs.length > 1 ? [ax, s0] : [ax, az], p1 = segs.length > 1 ? [bx, s1] : [bx, bz];
      const len = Math.hypot(p1[0] - p0[0], p1[1] - p0[1]); if (len < 1) continue;
      const b = box(len, 2.2, 0.12, fence, (p0[0] + p1[0]) / 2, 1.1, (p0[1] + p1[1]) / 2); b.rotation.y = -Math.atan2(p1[1] - p0[1], p1[0] - p0[0]); g.add(b);
    }
  }
  U.stalls.forEach((row, i) => stallRow(g, row, i * 3));
  g.add(place(gate(), U.gate[0], U.gate[1], -Math.PI / 2));
  g.add(place(giant(), U.giant[0], U.giant[1]));
  U.bulls.forEach(([x, z]) => g.add(place(bull(), x, z)));
  U.cones.forEach(([x, z]) => g.add(place(redPyramid(), x, z)));
  // 小舞台：黑色台面 + 背景板 + 两根黑桁架柱
  { const s = new THREE.Group(); s.add(box(10, 1.0, 7, mat(BLACK), 0, 0.5, 0)); s.add(box(10, 4.5, 0.3, mat(0x26272c), 0, 3.25, -3.4)); for (const x of [-4.8, 4.8]) s.add(box(0.4, 5.5, 0.4, mat(0x111214), x, 2.75, -3.2)); s.add(box(10, 0.4, 0.4, mat(0x111214), 0, 5.6, -3.2)); g.add(place(s, U.stage[0], U.stage[1], Math.PI / 4)); }
  U.deer.forEach(([x, z], i) => g.add(place(deer(i), x, z, Math.PI / 2 + (i % 2 ? 0.18 : -0.12))));   // 头朝北（−z）
  { const c = new THREE.Group(), iron = mat(0x1a1b1e, { metalness: 0.5, roughness: 0.5 }), S = 18;
    for (let k = 0; k < 4; k++) {
      const q = new THREE.Group(); q.rotation.y = (k * Math.PI) / 2; c.add(q);
      for (const [o, l] of [[-5.25, 7.5], [5.25, 7.5]]) {   // 每面中间留个口
        q.add(box(l, 0.12, 0.12, iron, o, 2.6, S / 2)); q.add(box(l, 0.1, 0.1, iron, o, 0.25, S / 2));
        for (let t = -l / 2; t <= l / 2 + 1e-6; t += 0.32) q.add(box(0.05, 2.6, 0.05, iron, o + t, 1.35, S / 2));
        for (const e of [-l / 2, l / 2]) q.add(box(0.16, 3.3, 0.16, iron, o + e, 1.65, S / 2));
      }
    }
    for (const [x, z, h] of [[-4, -4, 5.5], [4, -3.5, 4.5], [-3.5, 4, 4], [4.5, 4.5, 5]]) {   // 黑色小钟楼：方柱 + 尖顶 + 白钟面
      c.add(box(1.2, h, 1.2, iron, x, h / 2, z)); const r = mesh(new THREE.ConeGeometry(1.0, 1.4, 4), iron, x, h + 0.7, z); r.rotation.y = Math.PI / 4; c.add(r);
      c.add(mesh(new THREE.CircleGeometry(0.42, 20), mat(0xf4f1e8), x, h - 0.6, z + 0.61));
    }
    c.add(clockFigure());
    g.add(place(c, U.clock[0], U.clock[1])); }
  U.horses.forEach(([x,z],i) => g.add(place(horse(i === 0), x, z, i ? -0.8 : 0.5)));
  g.add(place(house(3.2, 3.2, 2.8, 0xe7a1b6, 0xc23a5a), U.pinkHouse[0], U.pinkHouse[1]));
  U.stars.forEach(([x, z, r]) => g.add(place(starCanopy(r), x, z, x * 0.37)));
  // 风之海：一片细杆上的蓝白三角小旗
  { const k = new THREE.Group(), blue = new THREE.MeshStandardMaterial({ color: 0x2f6fc0, side: THREE.DoubleSide, roughness: 0.7 }), wht = new THREE.MeshStandardMaterial({ color: 0xf2f4f7, side: THREE.DoubleSide, roughness: 0.7 });
    const tri = new THREE.BufferGeometry(); tri.setAttribute('position', new THREE.Float32BufferAttribute([0, 0, 0, 0, -0.9, 0, 1.6, -0.45, 0], 3)); tri.computeVertexNormals();
    for (let i = 0; i < 36; i++) { const x = (i % 6) * 3.2 - 8, z = Math.floor(i / 6) * 3.4 - 8.5, h = 2.4 + ((i * 37) % 10) * 0.18;
      k.add(box(0.06, h, 0.06, mat(0xdedede), x, h / 2, z)); const f = mesh(tri, i % 3 ? blue : wht, x, h, z); f.rotation.y = 0.4 + (i % 5) * 0.2; k.add(f); }
    g.add(place(k, U.kites[0], U.kites[1])); }
  g.add(place(house(6, 5, 3.6, 0x2e3f66, 0x1f2b48), U.garden[0], U.garden[1]));
  // 忒修斯之船：木色船身 + 桅杆 + 白帆
  { const s = new THREE.Group(), hull = new THREE.Shape([[-5, 0], [5, 0], [6.2, 1.8], [-6.2, 1.8]].map(([a, b]) => new THREE.Vector2(a, b)));
    const hg = new THREE.ExtrudeGeometry(hull, { depth: 3, bevelEnabled: false }); hg.translate(0, 0, -1.5); s.add(mesh(hg, mat(0x7a5a3a)));
    s.add(box(0.25, 7, 0.25, mat(0x5b4430), 0, 5, 0)); const sail = mesh(new THREE.PlaneGeometry(4, 4.5), new THREE.MeshStandardMaterial({ color: 0xf0ece2, side: THREE.DoubleSide }), 0, 5.2, 0.2); s.add(sail);
    g.add(place(s, U.ship[0], U.ship[1], 0.3)); }
  { const t = new THREE.Group(); t.add(box(8, 6, 24, mat(0xe7e9ea), 0, 3, 0)); t.add(box(8.1, 0.5, 24.1, mat(0x6f8796), 0, 3.1, 0)); t.add(box(1.4, 3, 3, mat(0x9aa3a8), -4.7, 1.5, 9)); g.add(place(t, U.toilets[0], U.toilets[1])); }
  for (let i = 0; i < 3; i++) g.add(box(2.5, 2.6, 6, mat(WHITE), U.containers[0] - i * 3, 1.3, U.containers[1]));
  { const t = new THREE.Group(); t.add(box(10, 3, 8, mat(0xc8282e), 0, 1.5, 0)); const r = mesh(new THREE.ConeGeometry(6.6, 3.2, 4), mat(0xc8282e), 0, 4.6, 0); r.rotation.y = Math.PI / 4; t.add(r); g.add(place(t, U.starTent[0], U.starTent[1])); }
  U.marquees.forEach(([x, z]) => g.add(place(marquee(), x, z)));
  // 白伞 + 小圆桌（神树下）
  U.umbrellas.forEach(([x, z], i) => {
    const u = new THREE.Group(); u.add(box(0.1, 3, 0.1, mat(0xdddddd), 0, 1.5, 0)); u.add(mesh(new THREE.ConeGeometry(2.6, 0.7, 12), mat(WHITE, { side: THREE.DoubleSide }), 0, 3.1, 0));
    u.add(box(3.6, 0.75, 0.9, mat(0xf4f3ef), 0, 0.375, 1.6));                                     // 白桌布长桌
    for (let k = -1; k <= 1; k++) for (const sd of [-1, 1]) {                                       // 交叉背椅
      const ch = new THREE.Group(); ch.position.set(k * 1.15, 0, 1.6 + sd * 0.75); ch.rotation.y = sd > 0 ? Math.PI : 0;
      const wood = mat(0xb48a5a); ch.add(box(0.45, 0.06, 0.45, wood, 0, 0.45, 0));
      for (const [a, b] of [[-0.2, -0.2], [0.2, -0.2], [-0.2, 0.2], [0.2, 0.2]]) ch.add(box(0.04, 0.45, 0.04, wood, a, 0.22, b));
      for (const rz of [0.6, -0.6]) { const x2 = box(0.04, 0.55, 0.03, wood, 0, 0.75, -0.22); x2.rotation.z = rz; ch.add(x2); }
      u.add(ch);
    }
    g.add(place(u, x, z, i * 0.4)); });
  // 神树底下写 MARS CONCERT 的红箱（26.5 秒仰视底部）
  { const tex = canvasTex(256, 64, (c, w, h) => { c.fillStyle = '#b3262b'; c.fillRect(0, 0, w, h); c.fillStyle = '#fff'; c.font = 'bold 34px "Times New Roman", serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('MARS CONCERT', w / 2, h / 2); });
    const m = [mat(0xb3262b), mat(0xb3262b), mat(0xb3262b), mat(0xb3262b), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.7 }), mat(0xb3262b)];
    g.add(mesh(new THREE.BoxGeometry(4, 1.6, 1.4), m, LAYOUT.fanZone.x, 0.8, LAYOUT.fanZone.z + 4.2)); }
  return g;
}
