import * as THREE from 'three';
import { LAYOUT } from '../layout.js';
import * as TX from '../textures.js';
import { TrussKit } from '../truss.js';
import { MAT, V, box, labeled, registerVideoScreen } from './common.js';

// ---------- 圆筒控制塔（音控塔）----------
// 内外两圈规整的米金色竖直板（都垂直、等距、顶边平齐）+ 中间黑色方形脚手架 + 朝舞台一面的音控间（外圈在这一面空出口子）+ 朝草坪一面的横屏。
function panelMaterial(color) {
  // 一张贴图竖向管三节接缝（3 × seam），每块板再随机错开一点，漩涡不会一格一格对齐
  const T = 3, c = document.createElement('canvas'); c.width = 128; c.height = 256 * T; const g = c.getContext('2d'), H = c.height;
  const base = new THREE.Color(color), tone = (k) => '#' + base.clone().multiplyScalar(k).getHexString();
  g.fillStyle = tone(1.05); g.fillRect(0, 0, 64, H); g.fillStyle = tone(0.84); g.fillRect(64, 0, 64, H);
  const r = TX.rng(21);
  for (let i = 0; i < 48 * T; i++) {
    const x = r() * 128, y = r() * H, w = 7 + r() * 38, h = 5 + r() * 21;
    g.fillStyle = r() < 0.55 ? 'rgba(235,179,128,0.14)' : 'rgba(46,28,23,0.17)';
    g.beginPath(); g.moveTo(x - w, y + h); g.lineTo(x + w, y - h);
    g.lineTo(x + w * 0.75, y + h * 0.3); g.lineTo(x - w * 0.6, y + h * 1.45); g.fill();
  }
  for (let i = 0; i < 320 * T; i++) {
    g.fillStyle = r() < 0.5 ? 'rgba(255,240,215,0.08)' : 'rgba(45,32,20,0.13)';
    g.fillRect(r() * 128, r() * H, 1 + r() * 3, 1 + r() * 4);
  }
  for (let k = 0; k < 14; k++) {   // 顺着板长的波纹
    const x0 = r() * 128, amp = 3 + r() * 9, ph = r() * 6, per = 40 + r() * 50;
    g.strokeStyle = r() < 0.5 ? 'rgba(236,186,138,0.13)' : 'rgba(58,30,20,0.17)'; g.lineWidth = 1 + r() * 2.5; g.beginPath();
    for (let y = 0; y <= H; y += 6) { const x = x0 + amp * Math.sin(y / per + ph); if (y) g.lineTo(x, y); else g.moveTo(x, y); }
    g.stroke();
  }
  for (let k = 0; k < 4; k++) {    // 漩涡：一圈圈扭曲的椭圆，深浅交替，大小不一
    const cx = 14 + r() * 100, cy = 60 + r() * (H - 120), rx = 16 + r() * 26, ry = 40 + r() * 80;
    for (let j = 0; j < 10; j++) {
      const sc = 1 - j / 10.5; g.strokeStyle = j % 2 ? 'rgba(62,32,22,0.16)' : 'rgba(236,184,132,0.14)'; g.lineWidth = 2 + r() * 2.5; g.beginPath();
      for (let a = 0; a <= 6.4; a += 0.15) { const w = 1 + 0.22 * Math.sin(a * 3 + j * 0.7), x = cx + Math.cos(a) * rx * sc * w, y = cy + Math.sin(a) * ry * sc * w; if (a) g.lineTo(x, y); else g.moveTo(x, y); }
      g.stroke();
    }
  }
  g.fillStyle = tone(0.56); for (let k = 0; k < T; k++) g.fillRect(0, k * 256, 128, 3);   // 每节接缝
  g.fillRect(0, 0, 2, H); g.fillRect(126, 0, 2, H);
  g.fillStyle = tone(0.72); g.fillRect(63, 0, 2, H);
  const map = new THREE.CanvasTexture(c); map.colorSpace = THREE.SRGBColorSpace; map.wrapS = map.wrapT = THREE.RepeatWrapping; map.anisotropy = 4;
  const m = new THREE.MeshStandardMaterial({ map, roughness: 0.72, metalness: 0.12 }); m.userData.seams = T; return m;
}
export function buildCylinder() {
  const C = LAYOUT.cylinder, B = C.booth, g = new THREE.Group(); g.position.set(C.x, 0, C.z);
  const mat = panelMaterial(C.color);
  const kit = new TrussKit(0x1c1d20);
  const open = (B.openDeg * Math.PI) / 180, stageDir = -Math.PI / 2;   // 朝舞台方向（-z）的角度
  const off = (a) => Math.abs(Math.atan2(Math.sin(a - stageDir), Math.cos(a - stageDir)));   // 和朝舞台方向差多少
  const ring = (cfg, phase, isOuter) => {
    for (let i = 0; i < cfg.count; i++) {
      const a = (i / cfg.count) * Math.PI * 2 + phase, d = off(a);
      if (isOuter && d < open) continue;                                       // 外圈在音控间那一面空着
      // 内圈在音控间上方是从顶上挂下来的短板，下沿成拱形（中间最高 archTop，到口子边缘落到音控间顶上）
      const suspended = !isOuter && d < open * 1.15;
      const y0 = suspended ? B.roof + 0.3 + (B.archTop - B.roof - 0.3) * Math.cos(d / (open * 1.15) * Math.PI / 2) : 0.34;
      const top = cfg.h + cfg.slopeX * Math.cos(a), lean = Math.atan2(cfg.flare, top);
      const hh = (top - y0) / Math.cos(lean), geo = new THREE.BoxGeometry(cfg.width, hh, cfg.thick);
      const uv = geo.attributes.uv, voff = ((i * 7) % 3) / 3; for (let v = 0; v < uv.count; v++) uv.setY(v, (uv.getY(v) * hh) / (C.seam * mat.userData.seams) + voff);   // 接缝按米排，不随板长拉伸；每块板错开整节（接缝仍对齐，漩涡不对齐）
      const dir = V(Math.cos(a), 0, Math.sin(a));
      const footRadius = cfg.radius - cfg.flare;
      const mount = new THREE.Group();
      mount.position.copy(dir).multiplyScalar(footRadius + y0 * Math.tan(lean));
      mount.position.y = y0;
      mount.rotation.order = 'YXZ';
      mount.rotation.set(lean, Math.PI / 2 - a, 0);
      const slat = new THREE.Mesh(geo, mat);
      slat.position.y = hh / 2;
      slat.castShadow = slat.receiveShadow = true;
      mount.add(slat, box(0.13, hh, 0.15, MAT.dark, 0, hh / 2, -cfg.thick / 2 - 0.065));
      if (!suspended) {
        const foot = box(0.60, 0.34, 0.45, MAT.stageSkirt, dir.x * footRadius, 0.25, dir.z * footRadius);
        foot.rotation.y = mount.rotation.y;
        g.add(foot);
      }
      if (!isOuter) {
        const led = box(0.065, hh - 0.32, 0.085, MAT.controlTowerLed, cfg.width / 2 + 0.025, hh / 2, 0.09);
        led.castShadow = false;
        mount.add(led);
      }
      g.add(mount);
    }
  };
  ring(C.inner, 0, false); ring(C.outer, Math.PI / C.outer.count, true);
  // 中间的黑色脚手架：立杆 + 每 2 米一道横杆（两个方向），外圈加斜撑
  const K = C.core, n = Math.round((2 * K.half) / K.bay), cx = 0, cz = 0;   // 脚手架坐标相对塔中心
  const P = (i, j, y) => V(cx - K.half + i * K.bay, y, cz - K.half + j * K.bay);
  for (let i = 0; i <= n; i++) for (let j = 0; j <= n; j++) kit.tube(P(i, j, 0), P(i, j, K.height), 0.045);
  for (let y = K.bay; y <= K.height + 0.01; y += K.bay) for (let i = 0; i <= n; i++) for (let j = 0; j < n; j++) { kit.tube(P(i, j, y), P(i, j + 1, y), 0.035); kit.tube(P(j, i, y), P(j + 1, i, y), 0.035); }
  for (let y = 0; y < K.height; y += K.bay) for (let k = 0; k < n; k += 2) { kit.tube(P(k, 0, y), P(k + 1, 0, y + K.bay), 0.03); kit.tube(P(k, n, y), P(k + 1, n, y + K.bay), 0.03); kit.tube(P(0, k, y), P(0, k + 1, y + K.bay), 0.03); kit.tube(P(n, k, y), P(n, k + 1, y + K.bay), 0.03); }
  const bw = B.w, bz0 = B.front - C.z, bz1 = B.back - C.z, bd = bz1 - bz0, bzc = (bz0 + bz1) / 2;
  g.add(box(bw, 0.2, bd, MAT.dark, 0, B.floor, bzc));                                       // 地板
  g.add(box(bw, B.floor, 0.12, MAT.stageSkirt, 0, B.floor / 2, bz0));                         // 地板下前围
  g.add(box(bw, B.roof - B.windowTop, 0.12, MAT.stageSkirt, 0, (B.roof + B.windowTop) / 2, bz0));   // 开口上方的前围
  for (const sx of [-1, 1]) g.add(box(0.12, B.roof, bd, MAT.stageSkirt, sx * bw / 2, B.roof / 2, bzc));   // 两侧
  g.add(box(bw + 0.4, 0.15, bd + 0.4, MAT.padWhite, 0, B.roof + 0.08, bzc));                  // 顶棚
  g.add(box(bw - 1, 1.0, 1.2, MAT.speaker, 0, B.floor + 0.6, bz0 + 1.2));                    // 调音台一排（开口里看到的深色台子）
  const railY = B.floor + 0.9;
  kit.tube(V(-bw / 2, railY, bz0), V(bw / 2, railY, bz0), 0.045);
  for (let x = -bw / 2; x <= bw / 2; x += 1.5) kit.tube(V(x, B.floor, bz0), V(x, railY, bz0), 0.032);
  for (let x = -bw / 2 + 1; x <= bw / 2 - 1; x += 1.2) kit.tube(V(cx + x, B.floor + 1.05, cz + bz0), V(cx + x, B.windowTop, cz + bz0), 0.02);   // 开口处的细竖杆
  const S = LAYOUT.cylinderScreen, tex = TX.liveFeedTexture(7, 320), screenY = S.bottom + S.h / 2;
  const outer = C.outer, mountRadius = outer.radius - outer.flare * (1 - screenY / outer.h);
  const zf = mountRadius + outer.thick / 2 + 0.72;
  const scr = new THREE.Mesh(new THREE.PlaneGeometry(S.w, S.h), new THREE.MeshStandardMaterial({ map: tex, emissiveMap: tex, emissive: 0xffffff, emissiveIntensity: 0.9 }));
  scr.position.set(0, screenY, zf); g.add(scr);
  registerVideoScreen(scr, { group: 'cylinder', name: '控制塔草坪面横屏', w: S.w, h: S.h });
  g.add(box(S.w + 0.3, S.h + 0.25, 0.28, MAT.speaker, 0, screenY, zf - 0.15));
  for (const x of [-S.w * 0.34, S.w * 0.34]) for (const y of [S.bottom + 0.6, S.bottom + S.h - 0.6]) {
    const r = outer.radius - outer.flare * (1 - y / outer.h);
    kit.tube(V(x, y, Math.sqrt(r * r - x * x)), V(x, y, zf - 0.24), 0.09);
  }
  g.add(kit.build());
  return labeled(g, '圆筒控制塔');
}
