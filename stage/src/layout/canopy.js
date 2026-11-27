const layout = {
  frame: {
    x: 0,
    z: 0,
    width: 20,
    depth: 20,
    legHeight: 27,
    legSize: 1.5,
    legLed: { w: 0.95, y0: 1.5, gapTop: 3 },
    roofHw: 11.5,
    roofDepth: 23,
    roofRise: 3,
    logo: { side: 14.4, topZ: -6.2 },
    stripe: { width: 0.5, edge: "#343037", core: "#786c62" },
    lightTrussY: 21.3,
    ceiling: { r: 9, y: 25.9, sides: 24, truss: 0.5, skirt: 0.6 },
    crown: {
      box: { w: 2.13, d: 2.13 },
      fixturePitch: 1.45,
      rowOff: 12.6,
      stacks: [
        { name: "中段", rows: ["x", "z"], a0: 1.07, n: 3, deep: 1, layers: 1, h: 6, top: 27.6 },
        { name: "角部", rows: ["x", "z"], a0: 7.46, n: 2, deep: 1, layers: 1, h: 6, top: 25.5 },
        { name: "交叉", rows: ["x"], a0: 11.72, n: 2, deep: 2, layers: 1, h: 7.2, top: 28 },
        { name: "外翼", rows: ["x", "z"], a0: 15.98, n: 2, deep: 1, layers: 1, h: 7.2, top: 27.5 }
      ]
    }
  },
  rings: {
    list: [
      { name: "大环", rOut: 7.4, rIn: 6.1 },
      { name: "中环", rOut: 5.1, rIn: 3.95 },
      { name: "小环", rOut: 2.8, rIn: 1.55 }
    ],
    truss: 0.42,
    rim: 0.5,
    barStep: 0.36,
    domeStep: 0.48,
    toothStep: 0.36,
    cables: 6,
    stowY: 24.8,
    defaultFormation: "stowed",
    formations: {
      stowed: { label: "收起：三环同心贴在顶上（白天 70、73、dc53、f918；开场 0925_192136）", rings: [[24.8, 0, 0], [24.8, 0, 0], [24.8, 0, 0]] },
      layered: { label: "三环分层：小上、中间、大下（09-25《Forever》）", rings: [[13.9, 0, 0], [16.5, 0, 0], [20, 0, 0]] },
      cross: { label: "交叉：大环中环反向侧倾成 X（IMG_9681）", rings: [[11, 0, 22], [11, 0, -22], [24.8, 0, 0]] },
      tilt87: { label: "斜挂：大环前低后高、中环在上（IMG_9687）", rings: [[10.5, -10, -16], [14.5, -14, 10], [24.8, 0, 0]] }
    }
  },
  lift: {
    cage: { rTube: 0.6, hTube: 2.2, rDrum: 0.8, hDrum: 0.9, rFloor: 0.75, tFloor: 0.12, cables: 3 },
    platform: { r: 2, t: 0.25, frame: 2.6, post: 0.4 },
    states: {
      up: { label: "收起：吊笼在顶上、升降台齐平", cageFloor: 21.98, rise: 0 },
      cage87: { label: "吊笼降下（IMG_9687）", cageFloor: 6, rise: 0 },
      raise81: { label: "升降台顶起（IMG_9681）", cageFloor: 21.98, rise: 1.4 }
    },
    defaultState: "up"
  },
  circleStage: {
    x: 0,
    z: 0,
    base: { r: 9.6, h: 1.4 },
    inner: { r: 8 },
    steps: [[5.3, 0.22], [5, 0.22], [4.65, 0.22]],
    liftInnerLine: 1.64,
    equipmentRadius: 12.5,
    footlights: { r: 11, count: 15 },
    fountain: { r: 11.45, h: 1.8 }
  }
};
const views = {
  aerial9687: { label: "吊盘前上方（对照 IMG_9687）", pos: [2, 71, 109], target: [0.6, 16, 0], fov: 26.5 },
  roofTop: { label: "吊盘顶面（核对标志）", pos: [0, 110, 0.5], target: [0, 0, 0], fov: 16 },
  crownUnder: { label: "吊盘下仰视（三环核对）", pos: [4.8, 1.75, 38.5], target: [0, 17.6, 0], fov: 43, near: 14 },
  circleDeck: { label: "圆台与柱脚近景", pos: [19, 13, 29], target: [0, 0.7, -1], fov: 48 },
  front9681: { label: "圆台正面平视（对照 IMG_9681）", pos: [-0.1, 3.6, 39.1], target: [0.3, 5.5, 0.9], fov: 23.3, near: 17 },
  day9670: { label: "白天侧后方航拍（对照 IMG_9670）", pos: [-141, 124.2, -181], target: [-21.7, 3, -6.7], fov: 31.4 }
};
export {
  layout,
  views
};
