// 小地图：右下角三张图——火星演唱会（主场地）、火星乌托邦（马路对面）、火星营地（舞台后方山脚的矿坑，本地坐标，字牌在上）。
// 标出自己的位置和朝向；点地图上任意一点就传送过去（第一 / 第三人称落到地面，无人机保持高度平移过去）。
// 走进另一个区域时自动换到那张图，也可以点上面的标签手动换着看。M 键或右上角按钮收起 / 展开。
import { LAYOUT, lawnBlocks } from './layout.js';
import { campFrame, CAMP, PIT } from './site/mars-camp.js';

const CF = campFrame();
const MAPS = {
  concert: { name: '演唱会', b: { x0: -140, x1: 150, z0: -145, z1: 272 }, toMap: (x, z) => [x, z], toWorld: (u, v) => [u, v], yaw: 0 },
  utopia: { name: '乌托邦', b: { x0: 140, x1: 318, z0: -140, z1: 225 }, toMap: (x, z) => [x, z], toWorld: (u, v) => [u, v], yaw: 0 },
  camp: { name: '营地', b: { x0: -540, x1: 260, z0: -190, z1: 290 }, toMap: CF.toLocal, toWorld: CF.toWorld, yaw: CF.rot },
};
// 人在哪一片
function regionOf(x, z) {
  const [lx, lz] = CF.toLocal(x, z);
  if (lx > -700 && lx < 460 && lz > -320 && lz < 340) return 'camp';
  return x > 140 ? 'utopia' : 'concert';
}

export function createMinimap({ parent, nav }) {
  const wrap = document.createElement('div'); wrap.className = 'minimap';
  wrap.innerHTML = '<div class="mmHead"><span class="mmTabs"></span><button type="button" class="mmToggle" aria-expanded="true" title="M">收起</button></div><canvas></canvas><div class="mmTip">点地图传送</div>';
  parent.appendChild(wrap);
  const cv = wrap.querySelector('canvas'), tip = wrap.querySelector('.mmTip'), btn = wrap.querySelector('.mmToggle'), tabs = wrap.querySelector('.mmTabs');
  const W = matchMedia('(max-width: 620px)').matches ? 150 : 200, dpr = Math.min(2, devicePixelRatio || 1);
  const g = cv.getContext('2d');
  let key = 'concert', open = true, region = null, P = null;

  for (const [k, m] of Object.entries(MAPS)) {
    const b = document.createElement('button'); b.type = 'button'; b.textContent = m.name; b.dataset.map = k;
    b.addEventListener('click', () => show(k)); tabs.appendChild(b);
  }

  // 每张图：画布尺寸、米 → 像素
  function layoutFor(m) {
    const { x0, x1, z0, z1 } = m.b, H = Math.round(Math.min(260, Math.max(150, (W * (z1 - z0)) / (x1 - x0))));
    const s = Math.min(W / (x1 - x0), H / (z1 - z0)), ox = (W - (x1 - x0) * s) / 2, oy = (H - (z1 - z0) * s) / 2;
    return { H, s, sx: (u) => ox + (u - x0) * s, sz: (v) => oy + (v - z0) * s, inv: (px, py) => [x0 + (px - ox) / s, z0 + (py - oy) / s] };
  }
  const cache = {};
  function base(k) {
    if (cache[k]) return cache[k];
    const m = MAPS[k], L = layoutFor(m), c = document.createElement('canvas'); c.width = W * dpr; c.height = L.H * dpr;
    const b = c.getContext('2d'); b.scale(dpr, dpr);
    DRAW[k](b, L);
    return (cache[k] = { canvas: c, L });
  }

  function show(k) {
    key = k; P = base(k);
    cv.width = W * dpr; cv.height = P.L.H * dpr; cv.style.width = W + 'px'; cv.style.height = P.L.H + 'px';
    tabs.querySelectorAll('button').forEach((b) => b.classList.toggle('on', b.dataset.map === k));
    draw(true);
  }
  const toggle = (v = !open) => { open = v; wrap.classList.toggle('closed', !open); btn.textContent = open ? '收起' : '地图'; btn.setAttribute('aria-expanded', String(open)); };
  btn.addEventListener('click', () => toggle());
  addEventListener('keydown', (e) => { if (e.code === 'KeyM' && !e.target.matches?.('select, input, textarea')) toggle(); });
  const at = (e) => { const r = cv.getBoundingClientRect(); return MAPS[key].toWorld(...P.L.inv(e.clientX - r.left, e.clientY - r.top)); };
  cv.addEventListener('click', (e) => { const [x, z] = at(e); nav.teleport(x, z); });
  cv.addEventListener('mousemove', (e) => { const [x, z] = at(e); tip.textContent = `传送到 x ${x.toFixed(0)} · z ${z.toFixed(0)}`; });
  cv.addEventListener('mouseleave', () => { tip.textContent = '点地图传送'; });

  function draw(force) {
    const t = nav.telemetry(), r = regionOf(t.x, t.z);
    if (r !== region) { region = r; if (r !== key) { show(r); return; } }   // 走进另一片：换图
    if (!open && !force) return;
    const m = MAPS[key];
    g.setTransform(1, 0, 0, 1, 0, 0); g.drawImage(P.canvas, 0, 0); g.setTransform(dpr, 0, 0, dpr, 0, 0);
    const [u, v] = m.toMap(t.x, t.z), x = P.L.sx(u), y = P.L.sz(v), a = -(t.yaw - m.yaw) - Math.PI / 2;   // yaw = 0 朝 -z（地图上方）
    if (x < -10 || y < -10 || x > W + 10 || y > P.L.H + 10) return;   // 人不在这张图里
    g.fillStyle = 'rgba(255,214,90,0.28)'; g.beginPath(); g.moveTo(x, y); g.arc(x, y, 22, a - 0.5, a + 0.5); g.closePath(); g.fill();
    g.fillStyle = t.mode === 'drone' ? '#5fd0ff' : '#ffd65a'; g.strokeStyle = '#111'; g.lineWidth = 1.5;
    g.beginPath(); g.arc(x, y, 4.5, 0, Math.PI * 2); g.fill(); g.stroke();
  }
  show('concert');
  return { draw, toggle, show };
}

// ---------- 三张底图 ----------
const label = (b, text, x, y) => { b.font = '10px "PingFang SC", sans-serif'; b.textAlign = 'center'; b.fillStyle = '#fff'; b.shadowColor = '#000'; b.shadowBlur = 3; b.fillText(text, x, y); b.shadowBlur = 0; };
const poly = (b, L, pts, fill, stroke) => { b.beginPath(); pts.forEach(([x, z], i) => (i ? b.lineTo(L.sx(x), L.sz(z)) : b.moveTo(L.sx(x), L.sz(z)))); b.closePath(); if (fill) { b.fillStyle = fill; b.fill(); } if (stroke) { b.strokeStyle = stroke; b.stroke(); } };
const rect = (b, L, x0, z0, x1, z1, fill, stroke) => poly(b, L, [[x0, z0], [x1, z0], [x1, z1], [x0, z1]], fill, stroke);
const circ = (b, L, x, z, r, fill, stroke) => { b.beginPath(); b.arc(L.sx(x), L.sz(z), r * L.s, 0, Math.PI * 2); if (fill) { b.fillStyle = fill; b.fill(); } if (stroke) { b.strokeStyle = stroke; b.stroke(); } };
const line = (b, L, pts, color, w) => { b.beginPath(); pts.forEach(([x, z], i) => (i ? b.lineTo(L.sx(x), L.sz(z)) : b.moveTo(L.sx(x), L.sz(z)))); b.strokeStyle = color; b.lineWidth = w; b.stroke(); b.lineWidth = 1; };

const DRAW = {
  concert(b, L) {
    b.fillStyle = '#3a4a3a'; b.fillRect(0, 0, 400, 400);
    const F = LAYOUT.site.fence; rect(b, L, F[0][0], F[0][1], F[1][0], F[2][1], '#9a9c98');
    for (const q of lawnBlocks()) poly(b, L, q, '#4f8a45');
    const P = LAYOUT.ground.pit; rect(b, L, P.x0, P.z0, P.x1, P.z1, '#56606a');
    const D = LAYOUT.prisms.deck; rect(b, L, D.x0, D.z0, D.x1, D.z1, '#c9bda4');
    const M = LAYOUT.mainStage; rect(b, L, M.x0, M.z0, M.x1, M.z1, '#8a9cb0');
    rect(b, L, -1.9, M.z1, 1.9, -9, '#8a9cb0');   // 走道
    const Fr = LAYOUT.frame; rect(b, L, Fr.x - Fr.width / 2, Fr.z - Fr.depth / 2, Fr.x + Fr.width / 2, Fr.z + Fr.depth / 2, null, '#111');
    circ(b, L, LAYOUT.circleStage.x, LAYOUT.circleStage.z, LAYOUT.circleStage.base.r, '#2a2d33');
    for (const h of LAYOUT.hourglass.list) circ(b, L, h.x, h.z, LAYOUT.hourglass.rTop, null, '#d76bd0');
    const C = LAYOUT.cylinder; circ(b, L, C.x, C.z, C.outer.radius, '#a98c5e');
    const RR = LAYOUT.ground.roadRight; rect(b, L, RR.x - RR.width / 2, -145, RR.x + RR.width / 2, 272, '#2d3136');
    b.lineWidth = 1; b.strokeStyle = 'rgba(255,255,255,0.7)';
    for (const runs of [LAYOUT.innerBoundaryRuns, LAYOUT.outerBoundaryRuns, LAYOUT.sideBoundaryRuns, LAYOUT.abBoundaryRuns]) for (const r of runs || []) line(b, L, [[r[0], r[1]], [r[2], r[3]]], 'rgba(255,255,255,0.7)', 1);
    for (const zn of LAYOUT.zones || []) label(b, zn.name.split('（')[0].replace(' · ', ' '), L.sx(zn.x), L.sz(zn.z));
    label(b, '主舞台', L.sx(0), L.sz(-47)); label(b, '屏塔', L.sx(0), L.sz(-80)); label(b, '乌托邦 →', L.sx(132), L.sz(-125));
  },
  utopia(b, L) {
    const U = LAYOUT.utopia, Z = LAYOUT.fanZone, RR = LAYOUT.ground.roadRight;
    b.fillStyle = '#3a4a3a'; b.fillRect(0, 0, 400, 400);
    rect(b, L, RR.x - RR.width / 2, -140, RR.x + RR.width / 2, 225, '#2d3136');
    poly(b, L, U.lot, '#b9bbb7', '#7f878c');
    for (const t of U.turf) poly(b, L, t, '#3e9a59');
    for (const r of U.stalls) line(b, L, [r.from, r.to], '#c23a2e', 3.2);
    const h = Z.base / 2; poly(b, L, [[Z.x - h, Z.z - h], [Z.x + h, Z.z - h], [Z.x + h, Z.z + h], [Z.x - h, Z.z + h]], null, '#f2f2f2');
    line(b, L, [[Z.x - h, Z.z - h], [Z.x + h, Z.z + h]], 'rgba(242,242,242,0.6)', 1); line(b, L, [[Z.x + h, Z.z - h], [Z.x - h, Z.z + h]], 'rgba(242,242,242,0.6)', 1);
    circ(b, L, Z.x, Z.z, 5, '#e0663c');
    circ(b, L, U.giant[0], U.giant[1], 6, '#a9a7d0');
    for (const [x, z] of U.bulls) circ(b, L, x, z, 6, '#c9282f');
    for (const [x, z, r] of U.stars) circ(b, L, x, z, r, '#f2c230');
    for (const [x, z] of U.marquees) rect(b, L, x - 5, z - 5, x + 5, z + 5, '#f3f2ee');
    rect(b, L, U.toilets[0] - 4, U.toilets[1] - 12, U.toilets[0] + 4, U.toilets[1] + 12, '#e7e9ea');
    circ(b, L, U.gate[0], U.gate[1], 4, '#b02a3c');
    label(b, '神树', L.sx(Z.x), L.sz(Z.z) - 8); label(b, '巨人', L.sx(U.giant[0]), L.sz(U.giant[1]) + 14); label(b, '门头', L.sx(U.gate[0]) + 16, L.sz(U.gate[1]) + 3);
    label(b, '星形篷', L.sx(226), L.sz(80)); label(b, '卫生间', L.sx(U.toilets[0]) - 16, L.sz(U.toilets[1])); label(b, '← 演唱会', L.sx(152), L.sz(-128));
  },
  camp(b, L) {
    b.fillStyle = '#34502f'; b.fillRect(0, 0, 400, 400);
    // 东边：马蹄形崖壁、字牌前广场、粉黛草梯田和步道；西边：营地坑（草坪、蓝色步道）
    const bowl = []; for (let x = -170; x <= 190; x += 10) bowl.push([x, -80 + 0.0011 * x * x]);
    line(b, L, bowl, '#a9a59c', 14 * L.s);
    rect(b, L, -110, -5, 130, 48, '#c9b48c');
    poly(b, L, [[-180, 50], [240, 50], [245, 130], [225, 215], [-160, 215], [-185, 130]], '#b85d90');
    for (const p of CAMP.paths()) line(b, L, p, '#eee8de', 1.4);
    rect(b, L, PIT.x - PIT.hw - 18, PIT.z - PIT.hh - 18, PIT.x + PIT.hw + 18, PIT.z + PIT.hh, '#7d786f');
    rect(b, L, PIT.x - PIT.hw, PIT.z - PIT.hh, PIT.x + PIT.hw, PIT.z + PIT.hh, '#6fa04c', '#4f86c2');
    for (const trail of CAMP.pitPaths) line(b, L, trail, '#a6bbc8', 2.0);
    rect(b, L, -35, -3, 35, 3, '#ffffff');   // 字牌
    for (const [x, z] of CAMP.eggs) circ(b, L, x, z, 4, '#f0f0f2');
    for (const [x, z] of CAMP.aframes) circ(b, L, x, z, 3.5, '#3a74c8');
    for (const [x, z] of CAMP.umbrellas) circ(b, L, x, z, 5, '#4e3f33');
    circ(b, L, ...CAMP.canteen, 22, '#8fb2bf', '#16171a'); circ(b, L, ...CAMP.carousel, 8, '#c63b4a');
    label(b, 'MARS CONCERT', L.sx(0), L.sz(-12)); label(b, '崖壁', L.sx(10), L.sz(-100)); label(b, '粉黛草', L.sx(40), L.sz(150));
    label(b, '营地坑', L.sx(PIT.x), L.sz(PIT.z)); label(b, '火星食堂', L.sx(CAMP.canteen[0]), L.sz(CAMP.canteen[1]) - 14); label(b, '旋转木马', L.sx(CAMP.carousel[0]), L.sz(CAMP.carousel[1]) - 10);
    label(b, '↓ 往演唱会场地（约 1.35 公里）', L.sx(-140), L.sz(282));
  },
};
