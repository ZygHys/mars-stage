const S3 = Math.sqrt(3);
const SIDE = 13.6;
const IN = SIDE / (2 * S3);
const FWD = 5.85;
const RC = 2 * IN;
const HALF = SIDE / 2;
const VX = 49.5;
const NVX = 40.6;
const A30 = Math.PI / 6, A150 = 5 * Math.PI / 6;
const GAP = 1;
const GX = GAP / 2, GZ = GAP * S3 / 2;
const layout = {
  prisms: {
    side: SIDE,
    screen: [13, 28],
    decoSize: [11, 28],
    base: 1.6,
    height: 30.2,
    rowZ: -73.85,
    lift: 1.9,
    deco: ["arcade", "arch", "arch", "rose-l", "rose-r", "arch", "arch", "arcade"],
    hands: [-1, -1, -1, -1, 1, 1, 1, 1],
    defaultMode: "show",
    modes: {
      show: { label: "演出当天白天：8 座——两端各两座 + 中间四座拼玫瑰窗（IMG_9676、9670）", t: [
        [-(VX - IN), 0, A30, FWD - HALF],
        [-(VX - RC) + GX, 0, -A150, FWD - SIDE - GZ],
        [-RC, 0, A150, FWD - HALF],
        [-IN, 2, -A30, FWD],
        [IN, 2, A30, FWD],
        [RC, 0, -A150, FWD - HALF],
        [VX - RC - GX, 0, A150, FWD - SIDE - GZ],
        [VX - IN, 0, -A30, FWD - HALF]
      ] },
      night9687: { label: "演出当天夜里：两端那对往中间挪（IMG_9687）", t: [
        [-(NVX - IN), 0, A30, FWD - HALF],
        [-(NVX - RC) + GX, 0, -A150, FWD - SIDE - GZ],
        [-RC, 0, A150, FWD - HALF],
        [-IN, 2, -A30, FWD],
        [IN, 2, A30, FWD],
        [RC, 0, -A150, FWD - HALF],
        [NVX - RC - GX, 0, A150, FWD - SIDE - GZ],
        [NVX - IN, 0, -A30, FWD - HALF]
      ] },
      zigzag: { label: "屏和灯阵交替（测试视频 4 秒）", t: [[-47.6, 0, 0.12], [-34, 1, -0.2], [-20.4, 0, 0.12], [-6.8, 1, -0.2], [6.8, 1, 0.2], [20.4, 0, -0.12], [34, 1, 0.2], [47.6, 0, -0.12]] },
      screens: { label: "八块大屏连成一面墙（测试视频 8–12 秒）", t: [[-47.8, 0, 0], [-34.2, 0, 0], [-20.6, 0, 0], [-7, 0, 0], [7, 0, 0], [20.6, 0, 0], [34.2, 0, 0], [47.8, 0, 0]] },
      screensFwd: { label: "屏墙、中间两块往前（测试视频 24 秒）", t: [[-47.8, 0, 0.1], [-34.2, 0, 0.05], [-20.6, 0, 0], [-7, 0, 0, FWD], [7, 0, 0, FWD], [20.6, 0, 0], [34.2, 0, -0.05], [47.8, 0, -0.1]] },
      matrix: { label: "八个灯阵面朝前（测试视频 20 秒）", t: [[-47.6, 1, 0], [-34, 1, 0], [-20.4, 1, 0], [-6.8, 1, 0], [6.8, 1, 0], [20.4, 1, 0], [34, 1, 0], [47.6, 1, 0]] },
      rose: { label: "中间合成玫瑰窗、两侧拱门（测试视频 28 秒）", t: [[-46, 0, 0.2], [-32.5, 1, 0.35], [-19.5, 2, 0.5], [-IN, 2, -0.524, FWD], [IN, 2, 0.524, FWD], [19.5, 2, -0.5], [32.5, 1, -0.35], [46, 0, -0.2]] }
    },
    matrix: { cols: 12, rows: 26 },
    deck: { x0: -54, x1: 54, z0: -93, z1: -55.5 },
    beams: [-80.8, -74.3, -66.9],
    beamSize: [2.2, 1],
    slatEvery: 5.66
  },
  tower9: {
    x: 0,
    z: -90,
    h: 29.5,
    hex: { front: 5.6, width: 8.4, depth: 6 },
    taper: { y1: 0.5, scale: 0.72 },
    facetRow: 3,
    walk: { w: 2.4, h: 1.4, z1: -55.5 }
  },
  mainStage: {
    x0: -33.5,
    x1: 33.5,
    z0: -55.5,
    z1: -38.4,
    chamferX: 8,
    chamferZ: 5,
    centerPad: { w: 13, d: 10.8, h: 1.44, landingDepth: 5.1, steps: 8, split: 0.34 },
    bandRisers: { innerX: 7, outerX: 24.5, z0: -54.6, z1: -49.2, h: 1.44 },
    frontTier: { x: 40, z1: -28.3, h: 1.2 },
    nightGlow: { strip: 0.45, fixture: 0.12 },
    catwalk: { w: 3.8 }
  }
};
const views = {
  aerial9670: { label: "舞台后左上方（对照 IMG_9670）", pos: [-108.6, 104, -129.8], target: [-21.1, 7.2, -7.5], fov: 38.9 },
  stage: { label: "主舞台上", pos: [0, 4, -46], target: [0, 9, 20], fov: 62 },
  stageSteps: { label: "主舞台双跑楼梯", pos: [22, 8.4, -34.5], target: [0, 3.6, -50], fov: 47 }
};
export {
  layout,
  views
};
