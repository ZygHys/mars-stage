// 舞台主体：按区域拆成四个模块，这里只做汇总导出。
//   venue/common.js  公共材质和工具
//   venue/towers.js  区域 A：屏塔、主舞台
//   venue/canopy.js  区域 B：吊盘、圆环、歌手升降、圆台
//   venue/pit.js     区域 C：内场延伸台、栏杆、入口、屏幕、沙漏塔、控制塔
export * from './venue/common.js';
export * from './venue/towers.js';
export * from './venue/canopy.js';
export * from './venue/pit.js';
export { buildScalePeople } from './venue/scale-people.js';
