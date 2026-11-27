const layout = {
  lifts: {
    z: -2.5,
    w: 2.6,
    deck: 0.12,
    spans: [[-30.5, -9.65], [9.65, 30.5]],
    high: 4.5,
    speed: 0.8,
    defaultState: "low",
    scissor: { arm: 4.6, every: 5.4, inset: 0.35 }
  },
  stageBarriers: [
    [-85, -27, -8.2, -27, 1],
    [8.2, -27, 85, -27, 1],
    [-59, -2.5, -31.1, -2.5, 1],
    [31.1, -2.5, 59, -2.5, 1],
    [-39, -27, -39, -11.5, 1],
    [39, -27, 39, -11.5, -1],
    [-39, -2.5, -39, 23, 1],
    [39, -2.5, 39, 23, -1]
  ],
  innerBoundaryRuns: [
    [-107, 39.5, -12, 39.5, -1],
    [-107, 42.3, -12, 42.3, 1],
    [12, 39.5, 96, 39.5, -1],
    [12, 42.3, 96, 42.3, 1]
  ],
  outerBoundaryRuns: [
    [-97.5, 58, -86, 56.5, -1],
    [-86, 56.5, -12, 56.5, -1],
    [12, 56.5, 87.5, 56.5, -1]
  ],
  sideBoundaryRuns: [
    [-85, -27, -98.3, -21, -1],
    [-98.3, -21, -98.3, -1.2, -1],
    [-98.3, 20, -103, 28.3, -1],
    [-103, 28.3, -107, 39.5, -1],
    [85, -27, 98.3, -21, 1],
    [98.3, -21, 98.3, 3.3, 1],
    [98.3, 15.7, 98.3, 28.3, 1],
    [98.3, 28.3, 96, 39.5, 1],
    [-107, 52.4, -97.5, 58, -1],
    [96, 53.3, 87.5, 56.5, 1]
  ],
  abBoundaryRuns: [
    [-1.7, 15, -1.7, 32.5, 1],
    [1.7, 15, 1.7, 32.5, -1],
    [-1.7, 32.5, -12, 32.5, 1],
    [1.7, 32.5, 12, 32.5, -1],
    [-12, 32.5, -12, 56.5, 1],
    [12, 32.5, 12, 56.5, -1]
  ],
  stageAisleRuns: [
    [-8.2, -27, -8.2, -15],
    [8.2, -27, 8.2, -15]
  ],
  circleBarrierRuns: [
    [-15, -15, -15, -4.3, 1],
    [-15, -0.7, -15, 15, 1],
    [15, -15, 15, -4.3, -1],
    [15, -0.7, 15, 15, -1],
    [-15, -15, -2.6, -15, -1],
    [2.6, -15, 15, -15, -1],
    [-15, 15, -1.7, 15, 1],
    [1.7, 15, 15, 15, 1]
  ],
  liftCrossingEdges: [[-15, -4.3, -15, -0.7], [15, -4.3, 15, -0.7]],
  access: {
    a1: {
      name: "A1 · 1280 入口",
      x: -98.3,
      z: 9.5,
      truss: { span: 12.6, height: 4.9, back: 2.2, header: true },
      white: [[-98.3, 3.3, -98.3, 6.5], [-98.3, 12.4, -98.3, 15.7]],
      black: [[-98.3, -1.2, -98.3, 3.3, -1], [-98.3, 15.7, -98.3, 20, -1]],
      signs: [
        { text: "A1", tone: "zone", z: -3.1 },
        { text: "A1 由此去", tone: "guide", z: 4.25 },
        { text: "入口", tone: "red", z: 3.1 }
      ]
    },
    b1: {
      name: "B1 · 1280 入口",
      x: 98.3,
      z: 9.5,
      truss: { span: 12.6, height: 4.9 },
      black: [
        [98.3, 3.3, 98.3, 6.5, 1],
        [98.3, 12.4, 98.3, 15.7, 1],
        [98.3, 6.5, 91.5, 6.5, -1],
        [98.3, 12.4, 91.5, 12.4, 1]
      ],
      signs: [{ text: "B1", tone: "zone", z: -3.1 }, { text: "入口", tone: "red", z: 3.3 }]
    },
    a2: {
      name: "A2 · 980 分流",
      x: -107,
      z: 48.2,
      black: [[-107, 42.3, -107, 45.5, -1], [-107, 49.8, -107, 52.4, -1]],
      signs: [
        { text: "A2", tone: "zone", z: -3.75 },
        { text: "入口", tone: "red", z: -2.65 },
        { text: "A2 由此去", tone: "guide", z: 2.6 }
      ]
    },
    b2: {
      name: "B2 · 980 分流",
      x: 96,
      z: 46.8,
      black: [[96, 42.3, 96, 44.3, 1], [96, 51.5, 96, 53.3, 1]],
      white: [[96, 49.15, 96, 51.5]],
      signs: [
        { text: "B2", tone: "zone", z: -3.3 },
        { text: "入口", tone: "zone", z: 2.3 },
        { text: "B2 由此去", tone: "guide", z: 3.7 }
      ]
    }
  },
  bAisleStop: [96, 39.5, 96, 42.3],
  zones: [
    { name: "A1 · 1280 区", x: -27, z: 22 },
    { name: "B1 · 1280 区", x: 27, z: 22 },
    { name: "A2 · 980 区", x: -55, z: 48.7 },
    { name: "B2 · 980 区", x: 55, z: 48.7 },
    { name: "680 区（外场·草坪）", x: 0, z: 100 }
  ],
  scalePeople: [[-30, -24], [32, -24], [-6, 19], [5, 24], [-51, 38.3], [-49, 43.4], [48, 43.4], [48, 56], [-51, 63]],
  imagTowers: [
    {
      name: "左前竖屏和扩声塔",
      x: -51,
      z: -33,
      w: 7,
      h: 10.5,
      bottom: 4,
      rot: 0.12,
      tower: [9, 7, 20],
      pa: { x: -5.15, z: 0.25, y: 14.45, cabinets: 16 }
    },
    { name: "右前竖屏", x: 49, z: -33, w: 7, h: 10.5, bottom: 4, rot: -0.12, tower: [9, 7, 20] }
  ],
  sideScreens: [
    { name: "左前斜屏", x: -77, z: -34, w: 13, h: 7.5, bottom: 5, rot: 0.5 },
    { name: "右前斜屏", x: 76, z: -35, w: 13, h: 7.5, bottom: 5, rot: -0.5 }
  ],
  delayScreens: [
    { name: "草坪左前角大屏", x: -104, z: 61, w: 14, h: 8, bottom: 4, rot: 0.42 },
    { name: "草坪右前角大屏", x: 92, z: 53, w: 14, h: 8, bottom: 4, rot: -0.42 }
  ],
  lawnScreens: [
    { name: "草坪前沿左屏", x: -35.5, z: 60, w: 7, h: 8.5, bottom: 3, rot: 0, twoSided: true },
    { name: "草坪前沿右屏", x: 36, z: 59.5, w: 7, h: 8.5, bottom: 3, rot: 0, twoSided: true }
  ],
  lawnPA: {
    bases: [[-63, 64.8], [-22, 63.7], [23, 62.1], [63, 59.6]],
    baseWidth: 2.6,
    baseDepth: 3.8,
    height: 13.8,
    reach: 1.7,
    cabinets: 15
  },
  cylinder: {
    x: 0,
    z: 46,
    color: 9664602,
    seam: 2.4,
    inner: { radius: 9.6, count: 28, h: 21.5, slopeX: -2.05, flare: 0.85, width: 1.55, thick: 0.3 },
    outer: { radius: 11, count: 34, h: 10.5, slopeX: 1.05, flare: 1.35, width: 1.59, thick: 0.3 },
    core: { half: 6, height: 16, bay: 2 },
    booth: { openDeg: 32, w: 12, front: 33.5, back: 38.5, floor: 2, windowTop: 5.2, roof: 6.5, archTop: 15 }
  },
  cylinderScreen: { w: 11, h: 6.2, bottom: 2 },
  hourglass: {
    height: 22,
    rBottom: 4.6,
    rWaist: 2.3,
    waistAt: 0.56,
    rTop: 5.2,
    ribs: 40,
    hoopEvery: 1.4,
    strip: { segments: 24, width: 0.115, depth: 0.045, gap: 0.065 },
    gantry: 12.6,
    list: [{ x: -92, z: -22 }, { x: -92, z: -3 }, { x: -92, z: 22 }, { x: 92, z: -22 }, { x: 92, z: -3 }, { x: 92, z: 22 }]
  }
};
const views = {
  pit: { label: "内场（圆台前）", pos: [5, 1.7, 26], target: [0, 16, -10], fov: 62 },
  audienceBarriers: { label: "980—1280 围栏与人物比例", pos: [-65, 3.05, 40.9], target: [-26, 1.5, 39.6], fov: 60 },
  abPartition: { label: "A/B 分区 · 圆台到中控塔", pos: [-27, 38, 47], target: [0, 0, 24], fov: 59 },
  outerPartition: { label: "680—980 · 观众区分界", pos: [-73, 25, 78], target: [-56, 0, 50], fov: 64 },
  a1Gate: { label: "A1 · 1280 入口", pos: [-112, 2.2, 12], target: [-98.3, 2.6, 9.5], fov: 54 },
  b1Gate: { label: "B1 · 1280 入口", pos: [112, 2.2, 12], target: [98.3, 2.6, 9.5], fov: 54 },
  a2Gate: { label: "A2 · 980 分流", pos: [-114.6, 2, 49.5], target: [-106.5, 1.2, 47], fov: 54 },
  b2Gate: { label: "B2 · 980 分流", pos: [103.6, 2, 47], target: [95.6, 1.15, 45.8], fov: 56 },
  hourglass: { label: "沙漏塔与竖排灯近景", pos: [-68, 3, 8], target: [-92, 11, -3], fov: 55 },
  hourglassProfile: { label: "沙漏塔弧线（对照 IMG_9672）", pos: [-111, 1.65, 32], target: [-91.5, 16.2, 12.7], fov: 76 },
  bridge: { label: "延伸台（升降台）近看", pos: [46, 9, 22], target: [18, 2, -3], fov: 45 },
  controlTower: { label: "控制塔入口侧", pos: [23, 7, 17], target: [0, 10.5, 46], fov: 45 },
  pitTop: { label: "内场俯视（对照 IMG_9676 中部）", pos: [0, 260, 8], target: [0, 0, 7], fov: 40 }
};
export {
  layout,
  views
};
