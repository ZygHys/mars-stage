// 区域 D 的位置尺寸：地面（内场护地板范围、草坪分块）、场地外围（围挡、两侧入口、厕所、摊位、帐篷）、高杆灯、粉丝区金字塔。
// 单位：米。坐标系：原点 = 吊盘正下方圆台中心的地面；x = 面向舞台时的右手边；y 向上；+z 朝观众。
export const layout = {
  ground: {
    pit: { x0: -103, x1: 103, z0: -27, z1: 58 },
    backstage: { x0: -125, x1: 125, z0: -135, z1: -27 },
    lawn: { x0: -103, x1: 129, z0: 58, z1: 210 },          // 草坪外接矩形（夜景撒人群用；模块末尾按 lawnOutline() 重算）
    stripe: 3.4,
    starLawn: { x0: -128, x1: -77.6, z0: -112, z1: -40 },
    roadBack: { z: -150, width: 16 },
    roadRight: { x: 158, width: 25, median: 4 },
  },

  // ---------- 草坪（条纹人造草）----------
  // 草皮是一块块铺在水泥地上的，块与块之间露出浅灰水泥 = 通道。
  // 整块草坪不是矩形：前沿平行舞台，越往后的横线越斜（横 1 约 5°、横 2 约 9°、后沿约 15°），左右边缘都向右偏约 12–15°。
  lawnPlan: {
    rows: [
      { name: '前沿', w: 0, a: [-115, 58.0], b: [129, 58.0] },
      { name: '横向通道1', w: 2.7, a: [-114.6, 96.9], b: [128.7, 74.4] },
      { name: '横向通道2', w: 1.5, a: [-114.6, 148.0], b: [128.7, 109.2] },
      { name: '后沿', w: 0, a: [-76.6, 199.6], b: [128.7, 143.8] },
    ],
    cols: [
      { name: '左边缘', w: 0, perRow: [{ a: [-102.7, 48], b: [-102.7, 105] }, { a: [-105.0, 86.1], b: [-71.0, 209.7] }, { a: [-105.0, 86.1], b: [-71.0, 209.7] }] },
      { name: '纵向通道1', w: 2.7, a: [-56.4, 48.1], b: [-45.1, 209.7] },
      { name: '纵向通道2', w: 1.5, a: [-13.7, 48.1], b: [-13.7, 209.7] },
      { name: '纵向通道3', w: 1.5, a: [44.7, 48.1], b: [59.9, 209.7] },
      // 横 2 附近两种算法分别得 px≈1045 和 1070，横 1 附近得 px≈1042。误差估计 ±5 米。
      { name: '纵向通道4', w: 1.5, a: [81.6, 48.1], b: [91.3, 209.7] },
      { name: '右边缘', w: 0, a: [103.0, 48.1], b: [128.5, 162.2] },
    ],
  },
  lawnItems: { redTent: { x: -41.8, z: 183.7, size: 6 } },

  // ---------- 场地外围 ----------
  site: {
    fence: [[-128, -135], [138, -135], [138, 262], [-128, 262]],   // 围挡以内硬地的外接矩形（铺地面用）
    fenceLines: [
      [[138, -135], [138, -16]],
      [[138, -16], [110, -14]],                       // 服务道南头的青绿色网
      [[110, -14], [114.4, 50], [114.8, 52]],          // 右侧走道外沿，到入口口子为止
      [[115.6, 57], [117, 67], [132, 120], [138, 214], [-128, 262]],
    ],
    publicGates: [
      { name: 'A 区红色入口外门', x: -116, z: 69.5, w: 12, rot: -11.5, face: 1, bays: ['A区入口', 'A区入口', 'A区入口'] },
      { name: 'B 区公共出口', x: 106.4, z: 50.5, w: 14.5, rot: -11.5, face: -1, bays: ['B区出口', '散场通道'] },
    ],
    eastGateTent: { x: 108.3, z: 26.7, len: 20, wid: 8, rot: 77.4 },
    // 店铺（摊位）
    shopRow: { a: [-4, 191.6], b: [28, 183.5], depth: 5.5, h: 3.3, n: 8 },
    acHouse: { a: [-37, 200.0], b: [-4, 191.6], depth: 6, h: 3.2, units: 9 },
    kiosks: { a: [-111, 163], b: [-97, 185], kinds: ['yellow', 'yellow', 'gazebo', 'yellow', 'gazebo', 'yellow', 'red', 'hut'] },
    muralHouse: { x: -93, z: 187.5, len: 28, wid: 6, h: 4.2, rot: 74.6 },
    whiteHouse: { x: -44.5, z: 203.5, len: 17, wid: 10, h: 4, rot: -15 },
    grandstand: { x: 2.5, z: 212, len: 30, depth: 18, h: 6.5, rows: 14, rot: -15 },
    bigTent: { x: 68.5, z: 171.5, len: 50, wid: 14, h: 4, ridge: 2.6, bays: 8, rot: -15 },
    longShed: { x: 32, z: 201, len: 33, wid: 7, h: 3.6, rot: 75 },
    pagodas: { size: 5, list: [[-2, 229], [-8, 230], [-20, 233], [-26, 234.5], [-32, 236], [-38, 237.5]] },
    smallTent: { x: 115, z: 184, len: 20, wid: 6, h: 3.4, rot: -15 },
    paintedFloor: { x0: -111, x1: -93, z0: 133, z1: 170, color: 0x2f9a78 },
    // 右侧
    tealFacility: { x: 124.5, z: 112, len: 18, wid: 4.8, h: 2.3, rot: 77.4, color: 0x287d73 },
    rightKiosks: [[114.7, 66.5], [115.3, 72.5]],
    redTentRight: { x: 115, z: 125.5, size: 4.5 },
    trucks: [[118, -55, 90], [118, -43, 90], [119, -31, 90]],
    starTents: [[-100.4, -82.1, 5], [-104.8, -67.3, 5], [-114.6, -85, 5]],   // 星形张拉膜：两个完整的 + 画面左缘一个
    gazebos: [[-110, -99, 3.5, 0], [-98.4, -98.3, 3.5, 0], [-88, -95, 3.5, 30], [-84, -90.7, 3, 0], [-84, -80.2, 3, 0], [-84, -70.7, 3, 0], [-84, -61.2, 3, 0]],  // 小白折叠棚 [x, z, 边长, 转角]
    sheds: [[-80, -47, 7, 10, 0], [-91, -43.5, 9, 6, 0]],                   // 草地前角的白色小棚 [x, z, 长, 宽, 转角]
    tentRow: { x: -72.8, z0: -99, z1: -52, size: 4.7 },
    starLawnFence: [[-115, -40, -77.6, -40], [-77.6, -40, -77.6, -110]],
    containers: [[-62, -104, 12, 3, 90, 2], [-47, -104, 12, 3, 90, 3], [-29, -104.5, 9, 3, 90, 3], [23, -107, 12, 6, 0, 1], [52, -106.5, 12, 3, 90, 4], [72.5, -107, 9, 8, 0, 1], [88, -101, 6, 3, 90, 4]],
    treeZones: [[117, 142, -5, 50, 60], [134, 145, 50, 150, 45], [95, 113, -110, -20, 45], [130, 145, -120, -5, 30]],
    serviceRoad: { x: 120.5, z0: -140, z1: -14, width: 14 },
    paintedFloor2: { x0: -115, x1: -106, z0: 3, z1: 34, color: 0x3d8f86 },
  },

  lightMasts: [[-118, -120, 32], [118, -120, 32], [-118, 110, 30], [128, 100, 30]],
  //     左侧三座沙漏塔脚手架 (x -92, z -22/-3/22) 在像素 u 520/755/1050，吊盘近侧两腿 (x -10, z ±10) 在 u 735/850，
  //     按针孔模型解出焦距约 902 像素、相机平面位置约 (-167, 1)、高约 41 米、下俯约 10°；
  //     用它反推控制塔 (0, 46) 应在 u≈1040（照片 1060）、右侧沙漏塔 (92, -3) 应在 u≈784（照片 800），对得上。
  //     金字塔中轴（顶点和漏斗）在 u≈784 → 落在直线 z = 1.1 - 0.0155·(x + 167) 上，即 z≈-5（x 在 200–300 之间变化不到 2 米）。
  //     再往后一排树 v 386–402 → x 185–248，树后露出粉丝区白色场地 v 366–386 → x≥250；
  //     金字塔近侧的两条腿离场地边不远。无人机 16 秒那帧里金字塔正对舞台和内场右侧那三座沙漏塔的外面，和 ① 的 z≈-5 一致。
  //     单看 ① ② 取 x≈235、z≈-5。
  //     复核：无人机 16 秒那帧用 6 个已知点（控制塔顶和脚、吊盘屋面、两座屏塔顶、右侧沙漏塔）在固定焦距 450–1100 像素下各解一次相机（残差 4–9 像素），
  //     (235, -5) 的金字塔脚投影在 u 539–588，(220, -20) 在 u 513–555，照片里在 u≈525；原来的 (190, -100) 会投到 u 417–436，差 90 像素以上，排除。
  //     （俯视 23.5 秒按四脚 74 米定比例、斜俯 4.5 秒用四脚解地面映射），路和摊位之间还有一排树。马路东沿在 x≈170.5（上面 roadRight），
  //     摊位只能从 x≈178 起 → 金字塔中心约 x 238–246；无人机 16 秒那次解算偏向 220–235。两者都在 ±35 米里，取 x=238。
  fanZone: { x: 238, z: -10, base: 74, height: 58, ringAt: 0.55, netAt: 0.45 },

  // ---------- 火星乌托邦（马路对面整块场地）----------
  //   俯视 23.5 秒（接近正射，约 0.185 米/像素）量北半部和中部；斜俯 4.5 秒量场地外框（离金字塔越远越不准：同一个星形篷两张图差约 25 米，
  //   南端按它约 z 250、打八折取 z≈215，误差 ±35 米）。名称对照导览编号图（30.5 秒）和俯视标注。
  utopia: {
    // 场地外框（浅灰硬地）：西沿贴着马路边那排树，南端西侧被一片树林切掉一个斜角（斜俯 4.5 秒左下）
    lot: [[177, -130], [306, -130], [306, 215], [222, 215], [184, 150], [177, 100]],
    // 刷绿的人造草皮：大块北宽南窄压着金字塔；南边四块小的（星形篷两块、风之海、秘境花园）
    turf: [
      [[200, -100], [285, -97], [285, -24], [290, -22], [290, 14], [276, 28], [262, 40], [195, 40], [195, -60]],
      [[195, 43], [243, 43], [243, 70], [195, 70]],
      [[213, 73], [253, 73], [253, 110], [213, 110]],
      [[255, 45], [277, 45], [277, 68], [255, 68]],
      [[257, 71], [279, 71], [279, 97], [257, 97]],
    ],
    stalls: [
      { from: [181, -124], to: [181, 64], face: 'e' }, { from: [181, 84], to: [181, 140], face: 'e' },
      { from: [186, -125], to: [224, -125], face: 's' }, { from: [252, -125], to: [301, -125], face: 's' },
      { from: [302, -118], to: [302, -32], face: 'w' }, { from: [228, 211], to: [302, 211], face: 'n' },
    ],
    gate: [178, 74],                     // 火星乌托邦门头（俯视标注、22.5 秒正面），朝马路
    giant: [237, -121],                  // 巨人（编号 36；27.5 秒近景）：北沿正中，趴在地上朝南
    bulls: [[222, -86], [253, -87.5]],   // 斗牛（编号 35）：两组红色三角折面
    cones: [[223.5, -62], [254, -62]],   // 斗牛前的红色三角锥
    stage: [224, -30],                   // 乌托邦小舞台（编号 34）：金字塔西北腿内侧的黑色箱体台
    deer: [[198, -35], [200, -19], [197, -3], [200, 13]],   // 巨鹿（编号 33）：草皮西侧、金字塔西边两条腿外面，一只接一只往北跃
    clock: [276, -5],                    // 钟楼奇想（编号 31/32）：深绿色方形围合，中间红色人偶
    horses: [[226, 25], [253, 27]], pinkHouse: [240, 17],              // 不打烊动物园（编号 29）
    stars: [[209, 56, 6], [224, 59, 6], [236, 49, 4], [222, 95, 12], [243, 89, 6]],   // 银河尽头的篝火（编号 27）：架空彩色星形篷 [x, z, 半径]
    kites: [266, 56],                    // 风之海（编号 28）：蓝白风筝
    garden: [268, 84],                   // 秘境花园：深蓝色尖顶小屋
    ship: [200, 122],                    // 忒修斯之船（编号 26）
    toilets: [297, -2], containers: [299, 20], starTent: [292, -72],   // 东侧卫生间（两层）、白色集装箱（编号 24）、红色大帐篷
    marquees: [[238, 192], [252, 192], [266, 192], [280, 192], [245, 177], [272, 177]],   // 南端白色大帐篷
    umbrellas: [[210, -2], [215, 11], [212, -15], [219, 2], [205, 30]],                   // 神树下白伞（26.5 秒左下）
  },

  // ---------- 华莱坞字牌和火星营地（舞台后方山脚的矿坑）----------
  //     偏多少没有照片能量准，先取正后方往 −x 偏 15°。
  //   高度：字牌平台比场地高约 28 米（导览航拍里平台在停车场上方、粉黛草梯田往下降一大段）。
  //   误差可能几百米、十几度；拿到地图坐标再改这里。
  marsCamp: { r: 1350, azimuth: -105, base: 28 },   // azimuth：atan2(z, x)，−90 = 舞台正后方；base：字牌脚下平台比场地高多少（米，估）
};

export const views = {
  lawn: { label: '草坪看舞台', pos: [-20, 1.7, 120], target: [0, 16, 0], fov: 50 },
  tele1114: { label: '左前方看吊盘', pos: [-52, 1.7, 118], target: [4, 15, 20], fov: 30 },
  aOuterGate: { label: 'A 区红色入口外门', pos: [-117, 2.35, 80], target: [-116, 1.65, 69.5], fov: 48 },
  entrance: { label: 'B 区红色公共出口', pos: [104, 2.35, 40], target: [106.4, 1.65, 50.5], fov: 50 },
  siteCorner: { label: '场地全景（左后上空）', pos: [-260, 170, 300], target: [-10, 0, 40], fov: 40 },
  toilets: { label: '右侧青绿色设施近景', pos: [116, 4.5, 99], target: [124.5, 1.2, 113], fov: 55 },
  shops: { label: '草坪后沿摊位近景', pos: [2, 4, 176], target: [6, 2.5, 190], fov: 60 },
  backRow: { label: '草坪后沿（摊位、板房、看台、尖顶帐篷）', pos: [40, 45, 150], target: [0, 5, 225], fov: 45 },
  fanZone: { label: '火星乌托邦（马路对面）', pos: [168, 30, 35], target: [238, 25, -10], fov: 55 },
  utopiaGate: { label: '乌托邦门头 · 侧前方', pos: [162.5, 1.7, 65], target: [178, 6.25, 74], fov: 54 },
  utopiaGateFront: { label: '乌托邦门头 · 正面', pos: [162.5, 1.7, 74], target: [178, 6.25, 74], fov: 57 },
  utopiaNet: { label: '乌托邦 · 悬挂彩网', pos: [225,3.1,12], target: [238,13,-10], fov: 70 },
  utopiaHorses: { label: '乌托邦 · 低头白马', pos: [234,2.2,36], target: [226,2.1,25], fov: 33 },
  utopiaClockArt: { label: '乌托邦 · 粉色钟面立像', pos: [278.8,2.1,1.3], target: [276,2,-5], fov: 39 },
  utopiaPony: { label: '乌托邦 · 橙鬃白马', pos: [248,2.1,36], target: [253,2.0,27], fov: 35 },
  utopiaGiant: { label: '乌托邦巨人 · 正面', pos: [237, 3.3, -103], target: [237, 9.1, -119], fov: 38 },
  sunsetGiant: { label: '日落 · 乌托邦巨人侧前方', pos: [257.9, 1.72, -114.2], target: [218.0, 16.0, -112.2], fov: 51 },
  sunsetSign: { label: '日落 · 花坡侧看 MARS CONCERT', pos: [-225.3, 23.0, -1250.3], target: [-265.25, 30.1, -1248.07], fov: 62 },
  twilightCamp: { label: '暮光 · 从花坡看小屋与食堂', pos: [-205.44, 13.16, -1187.85], target: [-244.34, 18.81, -1178.56], fov: 42 },
  utopiaGiantSide: { label: '乌托邦巨人 · 侧前方', pos: [226.2, 5.6, -105], target: [237, 9.4, -120], fov: 35 },
  utopiaTop: { label: '乌托邦俯视', pos: [236, 230, 175], target: [240, 0, 20], fov: 50 },
  marsSign: { label: '场地上空看舞台后方偏左的华莱坞', pos: [-20, 60, 140], target: [-349, 40, -1304], fov: 40 },
  marsSignAudience: { label: 'A 侧观众区 · 看华莱坞字牌', pos: [-69, 1.72, 50], target: [-349.4, 43, -1304], fov: 18 },
  marsCamp: { label: '火星营地（无人机，字牌正面）', pos: [-260, 95, -1000], target: [-349, 30, -1304], fov: 55 },
  marsCampFlowers: { label: '火星营地 · 花田步道', pos: [-293.39, 12.81, -1160.61], target: [-320.47,25.1,-1242.39], fov: 49 },
  marsCampHouse: { label: '火星营地 · 红顶小屋与花坡', pos: [-268.54, 6.33, -1125.86], target: [-283.40, 12.15, -1158.11], fov: 23 },
  marsCampJunction: { label: '火星营地 · 步道交叉口', pos: [-290, 35, -1182], target: [-271, 18, -1224], fov: 35 },
  marsCampEntry: { label: '火星营地 · 西坑南侧进场', pos: [-718.1,25.68,-1115.1], target: [-745,26,-1230], fov: 58 },
  marsCampPit: { label: '火星营地 · 西坑入口和草坪', pos: [-689,132,-1021], target: [-765,24,-1240], fov: 48 },
  marsCanteen: { label: '火星营地 · 火星食堂外观', pos: [-442.9, 44.45, -1065.7], target: [-518.3, 26.45, -1103.5], fov: 33 },
  marsCanteenRoof: { label: '火星营地 · 火星食堂屋顶', pos: [-454.8, 70.45, -1079.1], target: [-518.3, 26.45, -1103.5], fov: 34 },
  drone16: { label: '外围高空斜拍', pos: [-158.4, 107.7, 232], target: [-99, 68.8, 161.6], fov: 54.7 },
};

// ---------- 草坪几何：由 lawnPlan 的线求交点 ----------
const LP = () => layout.lawnPlan;
const colLine = (c, r) => (c.perRow ? c.perRow[r] : c);
// 两条直线（各两点）求交
function cross(L1, L2) {
  const [x1, z1] = L1.a, [x2, z2] = L1.b, [x3, z3] = L2.a, [x4, z4] = L2.b;
  const d = (x1 - x2) * (z3 - z4) - (z1 - z2) * (x3 - x4), t = ((x1 - x3) * (z3 - z4) - (z1 - z3) * (x3 - x4)) / d;
  return [x1 + t * (x2 - x1), z1 + t * (z2 - z1)];
}
// 把一条线沿法向平移 d（横线往 +z，竖线往 +x 为正）
function shift(L, d) {
  const dx = L.b[0] - L.a[0], dz = L.b[1] - L.a[1], l = Math.hypot(dx, dz); let nx = -dz / l, nz = dx / l;
  if (Math.abs(nz) > Math.abs(nx) ? nz < 0 : nx < 0) { nx = -nx; nz = -nz; }
  return { a: [L.a[0] + nx * d, L.a[1] + nz * d], b: [L.b[0] + nx * d, L.b[1] + nz * d] };
}
export { cross as lineCross };

// 草坪分块：每块草皮四个角 [前左, 前右, 后右, 后左]（[x, z]），已经让出通道（各边收进半个通道宽）。3 排 × 5 列 = 15 块。
export function lawnBlocks() {
  const { rows, cols } = LP(), out = [];
  for (let r = 0; r < rows.length - 1; r++) {
    const F = shift(rows[r], rows[r].w / 2), B = shift(rows[r + 1], -rows[r + 1].w / 2);
    for (let c = 0; c < cols.length - 1; c++) {
      const Lc = cols[c], Rc = cols[c + 1], Lf = shift(colLine(Lc, r), Lc.w / 2), Rt = shift(colLine(Rc, r), -Rc.w / 2);
      out.push([cross(F, Lf), cross(F, Rt), cross(B, Rt), cross(B, Lf)]);
    }
  }
  return out;
}
// 草坪外轮廓（顺时针：前左 → 前右 → 后右 → 后左 → 沿左边缘回到前左）
export function lawnOutline() {
  const { rows, cols } = LP(), n = rows.length - 1, L = cols[0], R = cols[cols.length - 1];
  const out = [cross(rows[0], colLine(L, 0)), cross(rows[0], R), cross(rows[n], R), cross(rows[n], colLine(L, n - 1))];
  for (let r = n - 1; r > 0; r--) out.push(cross(rows[r], colLine(L, r)), cross(rows[r], colLine(L, r - 1)));
  return out.filter((p, i) => i === 0 || Math.hypot(p[0] - out[i - 1][0], p[1] - out[i - 1][1]) > 0.05);
}
export function inPolygon(x, z, p) {
  let inside = false;
  for (let i = 0, j = p.length - 1; i < p.length; j = i++) { const [xi, zi] = p[i], [xj, zj] = p[j]; if ((zi > z) !== (zj > z) && x < ((xj - xi) * (z - zi)) / (zj - zi) + xi) inside = !inside; }
  return inside;
}
const lawnEdge = lawnOutline(), turfBlocks = lawnBlocks();
export const inLawn = (x, z) => inPolygon(x, z, lawnEdge);
export const surfaceY = { pit: .08, lawnPath: .10, turf: .16, starLawn: .06, utopia: .03, utopiaTurf: .06 };
export function siteSurfaceAt(x, z) {
  const { ground, utopia } = layout;
  const contains = r => x >= r.x0 && x <= r.x1 && z >= r.z0 && z <= r.z1;
  if (contains(ground.lawn) && inLawn(x,z)) return turfBlocks.some(q => inPolygon(x,z,q)) ? surfaceY.turf : surfaceY.lawnPath;
  if (contains(ground.pit)) return surfaceY.pit;
  if (contains(ground.starLawn)) return surfaceY.starLawn;
  if (inPolygon(x,z,utopia.lot)) return utopia.turf.some(q => inPolygon(x,z,q)) ? surfaceY.utopiaTurf : surfaceY.utopia;
  return 0;
}
// 草坪外接矩形（夜景撒人群用）
{ const o = lawnOutline(), xs = o.map((p) => p[0]), zs = o.map((p) => p[1]); Object.assign(layout.ground.lawn, { x0: Math.min(...xs), x1: Math.max(...xs), z0: Math.min(...zs), z1: Math.max(...zs) }); }
{
  const S = layout.site, F = [], seg = (name, A, B, d) => F.push([name, (A[0] + B[0]) / 2, (A[1] + B[1]) / 2, Math.hypot(B[0] - A[0], B[1] - A[1]), d, Math.atan2(B[1] - A[1], B[0] - A[0]) * 180 / Math.PI]);
  seg('摊位', S.shopRow.a, S.shopRow.b, S.shopRow.depth); seg('板房', S.acHouse.a, S.acHouse.b, S.acHouse.depth);
  for (const k of ['muralHouse', 'whiteHouse', 'bigTent', 'longShed', 'smallTent']) { const o = S[k]; F.push([k, o.x, o.z, o.len, o.wid, o.rot]); }
  { const o = S.grandstand; F.push(['看台', o.x, o.z, o.len, o.depth, o.rot]); }
  { const o = S.tealFacility; F.push(['青绿色设施', o.x, o.z, o.len, o.wid, o.rot]); }
  { const o = S.eastGateTent; F.push(['右侧长白棚', o.x, o.z, o.len, o.wid, o.rot]); }
  S.footprints = F;
}
