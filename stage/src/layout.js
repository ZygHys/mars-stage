// 场地布局汇总。所有尺寸单位：米。
// 坐标系：原点 = 吊盘正下方圆台中心的地面。x = 面向舞台时的右手边，y 向上，+z 朝观众（主舞台在 -z）。
// 各区域的数据分开放，互不重叠：
//   layout/towers.js 区域 A：屏塔、主舞台      layout/canopy.js 区域 B：吊盘、圆环、圆台
//   layout/pit.js    区域 C：内场               layout/site.js   区域 D：草坪、外围、粉丝区
import * as A from './layout/towers.js';
import * as B from './layout/canopy.js';
import * as C from './layout/pit.js';
import * as D from './layout/site.js';

export const LAYOUT = { ...D.layout, ...A.layout, ...B.layout, ...C.layout };

// 机位。fov 是竖直视角（度）。各区域自己的对照机位写在各自的 layout 文件里。
export const VIEWS = {
  overview: { label: '总览', pos: [-170, 120, 190], target: [0, 6, 0], fov: 42 },
  top9676: { label: '俯拍总览', pos: [6, 520, 150], target: [4, 0, 28], fov: 38 },
  ...A.views, ...B.views, ...C.views, ...D.views,
};

// 草坪形状的辅助函数在区域 D 的文件里
export { lawnOutline, inLawn, lawnBlocks, siteSurfaceAt, surfaceY } from './layout/site.js';
