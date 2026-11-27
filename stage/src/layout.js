import * as A from "./layout/towers.js";
import * as B from "./layout/canopy.js";
import * as C from "./layout/pit.js";
import * as D from "./layout/site.js";
const LAYOUT = { ...D.layout, ...A.layout, ...B.layout, ...C.layout };
const VIEWS = {
  overview: { label: "总览", pos: [-170, 120, 190], target: [0, 6, 0], fov: 42 },
  top9676: { label: "俯拍（对照 IMG_9676）", pos: [6, 520, 150], target: [4, 0, 28], fov: 38 },
  ...A.views,
  ...B.views,
  ...C.views,
  ...D.views
};
import { lawnOutline, inLawn, lawnBlocks, siteSurfaceAt, surfaceY } from "./layout/site.js";
export {
  LAYOUT,
  VIEWS,
  inLawn,
  lawnBlocks,
  lawnOutline,
  siteSurfaceAt,
  surfaceY
};
