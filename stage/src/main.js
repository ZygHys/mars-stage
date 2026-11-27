import * as THREE from "three";
import { CSS2DRenderer, CSS2DObject } from "three/addons/renderers/CSS2DRenderer.js";
import { LAYOUT, VIEWS, siteSurfaceAt } from "./layout.js";
import * as VN from "./venue.js";
import * as SITE from "./site.js";
import { mergeStatic } from "./merge.js";
import { Sky } from "three/addons/objects/Sky.js";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { GTAOPass } from "three/addons/postprocessing/GTAOPass.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";
import { SMAAPass } from "three/addons/postprocessing/SMAAPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";
import { setupNight, LOOKS } from "./night.js";
import { createStageWeather, formatSceneTime, TIME_JUMPS, WEATHER } from "./weather.js";
import { patchFogMaterials, createGradePass, solarPosition } from "./atmosphere.js";
import { buildCrowd } from "./crowd.js";
import { walkThroughVenue } from "./walk.js";
import { createNav } from "./nav.js";
import { MEIQIU_VARIANTS } from "./meiqiu.js";
import { registerControl } from "./venue/common.js";
import { createMinimap } from "./minimap.js";
import { createTouchControls, IS_TOUCH } from "./touch-controls.js";
import { campGroundAt } from "./site/mars-camp.js";
import { createVideoScreens, SCREEN_GROUPS, FIT_MODES, CAN_CAST } from "./video-screens.js";
import { createShowEngine } from "./show/engine.js";
import { createMediaSync } from "./show/media-sync.js";
import { pickLocalMediaHandle } from "./show/local-store.js";
import { EMBEDDED_SHOWS } from "./show/embedded.js";
import { createLoader } from "./loader.js";
const params = new URLSearchParams(location.search);
const loader = createLoader();
await loader.step("准备画布", 0.04);
const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance", preserveDrawingBuffer: false, alpha: true });
renderer.setClearColor(0, 1);
const BASE_DPR = Math.min(devicePixelRatio, Number(params.get("dpr")) || 1.25);
let activeDpr = BASE_DPR;
renderer.setPixelRatio(activeDpr);
renderer.setSize(innerWidth, innerHeight);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.shadowMap.autoUpdate = false;
document.getElementById("app").appendChild(renderer.domElement);
const labelRenderer = new CSS2DRenderer();
labelRenderer.setSize(innerWidth, innerHeight);
labelRenderer.domElement.className = "labels";
document.getElementById("app").appendChild(labelRenderer.domElement);
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(50, innerWidth / innerHeight, 0.3, 6e3);
const sky = new Sky();
sky.scale.setScalar(9e3);
sky.material.uniforms.turbidity.value = 7;
sky.material.uniforms.rayleigh.value = 1.4;
sky.material.uniforms.mieCoefficient.value = 6e-3;
sky.material.uniforms.mieDirectionalG.value = 0.82;
const sunDir = new THREE.Vector3();
solarPosition(15 * 60, sunDir);
sky.material.uniforms.sunPosition.value.copy(sunDir);
scene.add(sky);
scene.fog = new THREE.FogExp2(13226714, 55e-5);
{
  const pm = new THREE.PMREMGenerator(renderer);
  const envScene = new THREE.Scene();
  const s2 = new Sky();
  s2.scale.setScalar(9e3);
  s2.material.uniforms.sunPosition.value.copy(sunDir);
  s2.material.uniforms.turbidity.value = 7;
  envScene.add(s2);
  scene.environment = pm.fromScene(envScene, 0.02).texture;
  scene.environmentIntensity = 0.55;
}
const hemi = new THREE.HemisphereLight(14674162, 6054224, 0.55);
scene.add(hemi);
const sun = new THREE.DirectionalLight(16773340, 2.6);
sun.position.copy(sunDir).multiplyScalar(400);
sun.castShadow = true;
sun.shadow.mapSize.set(4096, 4096);
Object.assign(sun.shadow.camera, { left: -190, right: 190, top: 190, bottom: -190, near: 50, far: 900 });
sun.shadow.bias = -3e-4;
sun.shadow.normalBias = 0.04;
scene.add(sun, sun.target);
const labeledObjects = [];
const addAll = (objs) => (Array.isArray(objs) ? objs : [objs]).forEach((o) => {
  scene.add(o);
  if (o.userData.label) labeledObjects.push(o);
});
await loader.step("铺地面、远山", 0.1);
const ground = SITE.buildGround();
const groundMaterials =  new Set();
ground.traverse(({ material }) => {
  if (material?.color) groundMaterials.add(material);
});
addAll(ground);
addAll(SITE.buildMountains());
await loader.step("搭舞台和屏塔", 0.2);
const prismObjs = VN.buildPrisms();
addAll(prismObjs);
const prisms = prismObjs.filter((o) => o.userData.body);
addAll(VN.buildDeck());
addAll(VN.buildBridges());
addAll(VN.buildFrame());
const rings = VN.buildRings();
addAll(rings);
addAll(VN.buildCircleStage());
addAll(VN.buildCylinder());
await loader.step("立大屏、沙漏塔", 0.32);
addAll(VN.buildScreens());
addAll(VN.buildLawnPA());
addAll(VN.buildHourglass());
addAll(VN.buildBarriers());
scene.add(VN.buildScalePeople());
addAll(VN.buildZoneLabels());
await loader.step("布置外围、火星乌托邦、华莱坞", 0.42);
addAll(SITE.buildSurroundings());
await loader.step("观众入场", 0.56);
const crowd = buildCrowd();
addAll(crowd);
await loader.step("架灯光", 0.66);
addAll(VN.buildLights());
const labelLayer = [];
for (const o of labeledObjects) {
  const box = new THREE.Box3().setFromObject(o);
  const div = document.createElement("div");
  div.className = "tag";
  div.textContent = o.userData.label;
  const tag = new CSS2DObject(div);
  tag.position.set((box.min.x + box.max.x) / 2, box.max.y + 2, (box.min.z + box.max.z) / 2);
  scene.add(tag);
  labelLayer.push(tag);
}
const dynamicObjs = [];
scene.traverse((o) => {
  if (o.userData.dynamic) dynamicObjs.push(o);
});
await loader.step("合并静态网格", 0.74);
const mergeInfo = mergeStatic(scene,  new Set([...prisms, rings, sky, ...dynamicObjs]));
console.log("[stage] merged", mergeInfo);
let labelsOn = params.get("labels") === "1";
const setLabels = (on) => {
  labelsOn = on;
  labelLayer.forEach((t) => t.visible = on);
  labelRenderer.domElement.style.display = on ? "" : "none";
};
setLabels(labelsOn);
let formation = params.get("rings") || LAYOUT.rings.defaultFormation || Object.keys(LAYOUT.rings.formations)[0];
let prismMode = params.get("towers") || LAYOUT.prisms.defaultMode || Object.keys(LAYOUT.prisms.modes)[0];
VN.setPrismTargets(prisms, prismMode);
VN.updatePrisms(prisms, 0, true);
for (let i = 0; i < 200; i++) VN.updateRings(rings, formation, 0.1);
const keys =  new Set();
addEventListener("keydown", (e) => {
  if (e.isComposing || e.target.matches?.("select, input, textarea")) return;
  if (e.metaKey || e.ctrlKey || e.altKey) {
    keys.clear();
    return;
  }
  keys.add(e.code);
  if (e.code === "KeyL") setLabels(!labelsOn);
  if (e.code === "Space") e.preventDefault();
  if (e.code === "Digit1") setMode("drone");
  if (e.code === "Digit2") setMode("first");
  if (e.code === "Digit3") setMode("third");
  if (e.code === "KeyR") cycleFormation();
  if (e.code === "KeyT") cyclePrisms();
  if (e.code === "KeyN") setNight(!nightCtl.isNight());
  if (e.code === "KeyG") {
    const ks = Object.keys(LOOKS);
    setLook(ks[(ks.indexOf(nightCtl.lookKey()) + 1) % ks.length]);
  }
});
addEventListener("keyup", (e) => keys.delete(e.code));
for (const ev of ["blur", "focus"]) addEventListener(ev, () => keys.clear());
document.addEventListener("visibilitychange", () => keys.clear());
let viewNear = null;
const V3 = (x, y, z) => new THREE.Vector3(x, y, z);
let mode = "drone";
function groundAt(x, z, curY = null) {
  const M = LAYOUT.mainStage, C = LAYOUT.circleStage, deck = C.base.h, r = Math.hypot(x - C.x, z - C.z);
  if (r < C.base.r) {
    let h = deck;
    for (const [sr, sh] of C.steps) if (r < sr) h += sh;
    return h;
  }
  if (x > M.x0 && x < M.x1 && z > M.z0 && z < M.z1) return deck;
  if (Math.abs(x) < M.catwalk.w / 2 && z >= M.z1 && z < C.z) return deck;
  if (VN.onExtensionBridge(x, z)) {
    const bh = VN.bridgeHeight();
    if (curY === null || bh <= deck + 0.35 || curY >= bh - 1.5) return bh;
  }
  const D = LAYOUT.prisms.deck;
  if (x > D.x0 && x < D.x1 && z > D.z0 && z < D.z1) return 0.8;
  return campGroundAt(x, z) ?? siteSurfaceAt(x, z);
}
const nav = createNav({ camera, dom: renderer.domElement, keys, walk: walkThroughVenue, scene, groundAt, onChange: (m) => {
  mode = m;
  if (m !== "drone") viewNear = null;
  document.querySelectorAll("[data-mode]").forEach((b) => b.classList.toggle("on", b.dataset.mode === m));
  document.body.dataset.mode = m;
  hint();
} });
registerControl({
  key: "meiqiu",
  label: "第三人称造型",
  options: Object.fromEntries(Object.entries(MEIQIU_VARIANTS).map(([k, v]) => [k, v.label])),
  value: "smile",
  set: (v) => nav.setAvatarStyle(v)
});
renderer.domElement.addEventListener("pointerdown", () => {
  viewNear = null;
});
function setMode(m) {
  nav.setMode(m);
  mode = nav.mode();
}
function setView(key) {
  const v = VIEWS[key];
  if (!v) return;
  setMode("drone");
  camera.fov = v.fov;
  camera.updateProjectionMatrix();
  viewNear = v.near || null;
  camera.position.set(...v.pos);
  camera.lookAt(...v.target);
  nav.syncFromCamera();
  const sel = document.getElementById("view");
  if (sel) sel.value = key;
}
const formationKeys = Object.keys(LAYOUT.rings.formations);
function cycleFormation() {
  formation = formationKeys[(formationKeys.indexOf(formation) + 1) % formationKeys.length];
  const s = document.getElementById("rings");
  if (s) s.value = formation;
}
const prismModes = VN.PRISM_MODES;
function cyclePrisms() {
  const ks = Object.keys(prismModes);
  prismMode = ks[(ks.indexOf(prismMode) + 1) % ks.length];
  VN.setPrismTargets(prisms, prismMode);
  const s = document.getElementById("prisms");
  if (s) s.value = prismMode;
}
const ui = document.getElementById("ui");
if (params.get("ui") === "0") ui.hidden = true;
const opt = (o) => Object.entries(o).map(([k, v]) => `<option value="${k}">${typeof v === "string" ? v : v.label}</option>`).join("");
const DISPLAY_KEYS = ["meiqiu", "scalePeople", "crowd"];
const ctl = (c) => `<label>${c.label}<select data-ctl="${c.key}">${opt(c.options)}</select></label>`;
ui.innerHTML = `
  <div class="bar">
    <div class="seg" role="group" aria-label="视角"><button data-mode="drone" title="1">无人机</button><button data-mode="first" title="2">第一人称</button><button data-mode="third" title="3">第三人称</button></div>
    <select id="view" title="对照照片的机位">${opt(VIEWS)}</select>
    <button class="tab" data-panel="stage">舞台</button><button class="tab" data-panel="show">舞美</button><button class="tab" data-panel="env">环境</button><button class="tab" data-panel="display">显示</button>
    <button class="tab" data-panel="video" title="大屏放视频">视频</button>
    <button class="tab" data-panel="help" title="操作说明">?</button>
    <span class="clock"><output id="sceneClockMini">15:00</output></span>
  </div>
  <div class="panel" data-for="stage" hidden>
    <label>圆环<select id="rings">${opt(LAYOUT.rings.formations)}</select></label>
    <label>屏塔<select id="prisms">${opt(prismModes)}</select></label>
    ${VN.controls.filter((c) => !DISPLAY_KEYS.includes(c.key)).map(ctl).join("")}
  </div>
  <div class="panel show" data-for="show" hidden>
    <label>节目<select id="showSelect"><option value="">手动控制</option></select></label>
    <button id="showPlay" type="button">播放</button>
    <button id="showWithVideo" type="button" hidden title="联动该节目预设的 B 站视频同步播放">带视频播</button>
    <button id="showStop" type="button">停止</button>
    <button id="showLoop" type="button" class="on" aria-pressed="true">循环</button>
    <label>倍速<select id="showRate"><option value="0.5">0.5x</option><option value="1" selected>1x</option><option value="1.5">1.5x</option><option value="2">2x</option></select></label>
    <button id="showCuesToggle" type="button" hidden aria-pressed="false">段落</button>
    <button id="showMediaToggle" type="button" aria-pressed="false">音视频</button>
    <label class="file">导入<input id="showFile" type="file" accept=".json,application/json"></label>
    <a id="showEvidence" href="#" target="_blank" rel="noopener" hidden style="color:#6ce2ff;font-size:12px;text-decoration:none;padding:4px 8px;border-radius:6px;background:rgba(92,224,255,.14)">证据对照 ↗</a>
    <div class="showTimeline">
      <span class="showTime" id="showTime">0:00 / 0:00</span>
      <input id="showSeek" type="range" min="0" max="100" step="0.1" value="0" aria-label="舞美时间轴" disabled>
      <span class="showCueLabel" id="showCueLabel"></span>
    </div>
    <div class="showCues" id="showCues" hidden></div>
    <div class="showMedia" id="showMedia" hidden>
      <button id="smPickFile" type="button">本地音视频</button>
      <input id="smFileFallback" type="file" accept="audio/*,video/*" hidden>
      <button id="smReconnect" type="button" hidden>续播上次文件</button>
      <input id="smUrl" type="url" placeholder="B站 / YouTube / .mp4 链接" spellcheck="false">
      <button id="smGoUrl" type="button">同步</button>
      <select id="smTarget" title="视频上大屏范围"><option value="all" selected>上直播大屏</option><option value="none">仅听声音</option><option value="imag">仅两侧竖屏</option><option value="cylinder">仅中控横屏</option></select>
      <span style="display:inline-flex;align-items:center;gap:3px;color:#cfd3da;font-size:11.5px">偏移<button type="button" class="smMini" data-nudge="-0.5">-0.5</button><button type="button" class="smMini" data-nudge="-0.1">-0.1</button><input id="smOffset" type="number" step="0.05" value="0" aria-label="同步偏移秒"><button type="button" class="smMini" data-nudge="0.1">+0.1</button><button type="button" class="smMini" data-nudge="0.5">+0.5</button></span>
      <button id="smResync" type="button" class="smMini" hidden title="把舞美时间轴立即对齐到当前起点">对表</button>
      <button id="smPlayer" type="button" class="smMini" hidden title="浮出隐藏的 B站/YouTube 播放器以点播放、拖动或调音量">操作播放器</button>
      <button id="smClear" type="button" hidden>断开</button>
      <span class="smTag" id="smStatus"></span>
    </div>
    <div class="showMeta" id="showMeta" hidden></div>
  </div>
  <div class="panel" data-for="env" hidden>
    <label>天气<select id="stageWeather">${opt(WEATHER)}</select></label>
    <label>时段<select id="sceneMoment"><option value="">自定时间</option>${opt(TIME_JUMPS)}</select></label>
    <label class="sceneTime wide">时间 <output id="sceneClock" for="sceneTime">15:00</output><input id="sceneTime" type="range" min="0" max="1439" step="1" value="900" aria-label="场景时间"></label>
    <button id="scenePlayback" type="button" aria-pressed="false">自动播放</button>
    <label>速度<select id="sceneRate"><option value="6">4 分钟／天</option><option value="24" selected>1 分钟／天</option><option value="60">24 秒／天</option></select></label>
    <button id="nightBtn" title="N">夜景</button>
    <label>灯光<select id="look">${opt(LOOKS)}</select></label>
  </div>
  <div class="panel" data-for="display" hidden>
    <button id="lbl" title="L">标注</button>
    <button id="mapBtn" title="M">小地图</button>
    ${VN.controls.filter((c) => DISPLAY_KEYS.includes(c.key)).map(ctl).join("")}
  </div>
  <div class="panel video" data-for="video" hidden>
    <label>放到<select id="vidTarget">${opt(SCREEN_GROUPS)}</select></label>
    <label>宽高<select id="vidFit">${opt(FIT_MODES)}</select></label>
    <label class="file">本地视频<input id="vidFile" type="file" accept="video/*"></label>
    <span class="urlRow"><input id="vidUrl" type="url" placeholder="视频链接：B 站 / YouTube / .mp4 直链" spellcheck="false"><button id="vidGo">播放</button></span>
    <button id="vidPause">暂停</button><button id="vidMute">静音</button><button id="vidInteract" hidden aria-pressed="false" title="网页播放器藏在三维画面后面点不到；按下后临时浮出来，可以点暂停、调音量">操作播放器</button><button id="vidOne" hidden title="所有大屏共用一个播放器、同步播放：浏览器会问要不要共享此标签页，点“共享”">只加载一路</button><button id="vidMulti" hidden title="不共享标签页时的后备：每块屏各开一个播放器，不同步、较卡">每屏单独加载（不同步）</button><button id="vidStop">恢复原画面</button>
    <div class="vidStatus" id="vidStatus">本地文件和 .mp4 直链直接贴到屏面上；B 站、YouTube 只加载一个播放器，共享本标签页后同步铺到所有大屏</div>
  </div>
  <div class="panel help" data-for="help" hidden><div class="hint" id="hint"></div></div>`;
let openPanel = null;
function showPanel(name) {
  openPanel = openPanel === name ? null : name;
  ui.querySelectorAll(".panel").forEach((pn) => {
    pn.hidden = pn.dataset.for !== openPanel;
  });
  ui.querySelectorAll(".tab").forEach((b) => b.classList.toggle("on", b.dataset.panel === openPanel));
}
ui.querySelectorAll(".tab").forEach((b) => b.addEventListener("click", () => showPanel(b.dataset.panel)));
renderer.domElement.addEventListener("pointerdown", () => {
  if (openPanel && openPanel !== "help") showPanel(openPanel);
});
ui.querySelectorAll("[data-mode]").forEach((b) => b.addEventListener("click", () => {
  setMode(b.dataset.mode);
  b.blur();
}));
ui.querySelector("#view").addEventListener("change", (e) => {
  setView(e.target.value);
  e.target.blur();
});
ui.querySelector("#rings").addEventListener("change", (e) => {
  formation = e.target.value;
  e.target.blur();
});
ui.querySelector("#prisms").addEventListener("change", (e) => {
  prismMode = e.target.value;
  VN.setPrismTargets(prisms, prismMode);
  e.target.blur();
});
ui.querySelector("#lbl").addEventListener("click", () => setLabels(!labelsOn));
ui.querySelector("#nightBtn").addEventListener("click", () => setNight(!nightCtl.isNight()));
ui.querySelector("#look").addEventListener("change", (e) => {
  setLook(e.target.value);
  if (!nightCtl.isNight()) setNight(true);
  e.target.blur();
});
const setControl = (key, v) => {
  const c = VN.controls.find((k) => k.key === key);
  if (!c || !(v in c.options)) return;
  c.value = v;
  c.set(v);
  const el = ui.querySelector(`[data-ctl="${key}"]`);
  if (el) el.value = v;
};
for (const c of VN.controls) {
  ui.querySelector(`[data-ctl="${c.key}"]`).addEventListener("change", (e) => {
    setControl(c.key, e.target.value);
    e.target.blur();
  });
  setControl(c.key, params.get(c.key) || c.value);
}
ui.querySelector("#rings").value = formation;
ui.querySelector("#prisms").value = prismMode;
function hint() {
  const h = document.getElementById("hint");
  if (!h) return;
  h.innerHTML = mode === "first" ? "<b>第一人称</b>　WASD 走 · Shift 跑 · 空格 跳<br>拖动 / 双指滑动 环顾 · 捏合 变焦 · 双击锁定鼠标（Esc 释放）<br>右下小地图点一下就传送过去（M 收起）" : mode === "third" ? "<b>第三人称</b>　WASD 走 · Shift 跑 · 空格 跳<br>拖动 / 双指滑动 转视角 · 捏合 / 滚轮 远近<br>右下小地图点一下就传送过去（M 收起）" : "<b>无人机</b>　WASD 前后左右 · 空格 / C 升降 · Q / E 转向 · Shift 加速<br>拖动 / 双指滑动 云台 · 右键拖动 平移 · 捏合 / 滚轮 顺镜头飞近飞远 · Shift+双指 平移升降<br>R 圆环 · T 屏塔 · N 夜景 · G 灯光 · L 标注 · M 小地图";
}
const hud = document.createElement("div");
hud.className = "hud";
document.getElementById("app").appendChild(hud);
const minimap = createMinimap({ parent: document.getElementById("app"), nav });
if (IS_TOUCH) {
  createTouchControls({ parent: document.body, nav });
  document.body.classList.add("touch");
  if (innerWidth < 900) minimap.toggle(false);
}
ui.querySelector("#mapBtn").addEventListener("click", () => minimap.toggle());
const vidStatus = ui.querySelector("#vidStatus"), vidInteract = ui.querySelector("#vidInteract"), vidOne = ui.querySelector("#vidOne"), vidMulti = ui.querySelector("#vidMulti");
const videoCtl = createVideoScreens({
  camera,
  container: document.getElementById("app"),
  onStatus: (t) => {
    vidStatus.textContent = t;
  },
  onMode: (m) => {
    vidInteract.hidden = m !== "cast" && m !== "multi" && m !== "audioEmbed";
    vidOne.hidden = !(m === "multi" && CAN_CAST);
    vidMulti.hidden = m !== "ready";
    if (vidInteract.classList.contains("on")) setVidInteract(false);
    mediaSync?.onVideoModeChange(m);
  }
});
ui.querySelector("#vidTarget").addEventListener("change", (e) => videoCtl.setTarget(e.target.value));
ui.querySelector("#vidFit").addEventListener("change", (e) => videoCtl.setFit(e.target.value));
ui.querySelector("#vidFile").addEventListener("change", (e) => {
  videoCtl.playFile(e.target.files[0]);
  e.target.value = "";
});
const goUrl = () => videoCtl.play(ui.querySelector("#vidUrl").value);
ui.querySelector("#vidGo").addEventListener("click", goUrl);
ui.querySelector("#vidUrl").addEventListener("keydown", (e) => {
  if (e.key === "Enter") goUrl();
  e.stopPropagation();
});
ui.querySelector("#vidPause").addEventListener("click", (e) => {
  const p = videoCtl.togglePause();
  if (p !== null) e.target.textContent = p ? "暂停" : "播放";
});
ui.querySelector("#vidMute").addEventListener("click", (e) => {
  const m = videoCtl.toggleMute();
  if (m !== null) e.target.textContent = m ? "取消静音" : "静音";
});
const setVidInteract = (on) => {
  videoCtl.setInteractive(on);
  vidInteract.setAttribute("aria-pressed", String(on));
  vidInteract.classList.toggle("on", on);
};
vidInteract.addEventListener("click", () => setVidInteract(!videoCtl.state().interactive));
vidOne.addEventListener("click", () => videoCtl.castFromMulti());
vidMulti.addEventListener("click", () => videoCtl.playMulti());
ui.querySelector("#vidStop").addEventListener("click", () => {
  setVidInteract(false);
  videoCtl.stop();
});
if (params.get("screen") && params.get("screen") in SCREEN_GROUPS) {
  videoCtl.setTarget(params.get("screen"));
  ui.querySelector("#vidTarget").value = params.get("screen");
}
if (params.get("video")) {
  ui.querySelector("#vidUrl").value = params.get("video");
  goUrl();
}
if (params.get("ui") === "0") {
  hud.hidden = true;
  document.querySelector(".minimap").hidden = true;
}
const DIRS = ["北", "东北", "东", "东南", "南", "西南", "西", "西北"];
let hudT = 0;
function updateHud(dt) {
  hudT += dt;
  if (hudT < 0.1) return;
  hudT = 0;
  minimap.draw();
  if (mode !== "drone") {
    hud.hidden = true;
    return;
  }
  hud.hidden = params.get("ui") === "0";
  const t = nav.telemetry(), d = Math.hypot(t.x, t.z);
  hud.innerHTML = `<span><i>H</i>${t.alt.toFixed(1)} m</span><span><i>D</i>${d.toFixed(0)} m</span><span><i>水平</i>${t.hs.toFixed(1)} m/s</span><span><i>垂直</i>${t.vs.toFixed(1)} m/s</span><span><i>航向</i>${t.heading.toFixed(0)}° ${DIRS[Math.round(t.heading / 45) % 8]}</span><span><i>云台</i>${(t.pitch * 180 / Math.PI).toFixed(0)}°</span>`;
}
const clock = new THREE.Clock();
const fwd = new THREE.Vector3(), right = new THREE.Vector3();
let simT = 0, nightCtl = null, showEngine = null, mediaSync = null, showRingsTarget = null;
let shadowDirtyFrames = 4, lastSunX = 1e9, lastSunY = 1e9, lastSunZ = 1e9, lastRingsSig = "", lastPrismsSig = "";
let slowFrameCount = 0;
const lockedDpr = params.has("dpr");
function frame(dt, clockDelta = dt) {
  simT += dt;
  mediaSync?.update(performance.now());
  showEngine?.update(dt, simT);
  const ringTarget = showRingsTarget ?? formation;
  VN.updateRings(rings, ringTarget, dt);
  VN.updatePrisms(prisms, dt);
  for (const f of VN.animators) f(dt, simT);
  nav.update(dt);
  {
    const n = viewNear ?? THREE.MathUtils.clamp(camera.position.y * 0.02, 0.3, 6);
    if (Math.abs(n - camera.near) > 0.05) {
      camera.near = n;
      camera.updateProjectionMatrix();
    }
  }
  sky.position.copy(camera.position);
  weatherCtl.update(dt, simT, camera.position, clockDelta);
  const lightT = showEngine?.isActive() ? showEngine.getTime() : simT;
  nightCtl.update(lightT, camera);
  crowd.userData.setNight(nightCtl.isNight());
  crowd.userData.updateLod?.(camera);
  updateHud(dt);
  if (sun.castShadow) {
    const sunMoved = Math.abs(sun.position.x - lastSunX) > 0.2 || Math.abs(sun.position.y - lastSunY) > 0.2 || Math.abs(sun.position.z - lastSunZ) > 0.2;
    const rSig = typeof ringTarget === "string" ? ringTarget : "custom";
    if (sunMoved || rSig !== lastRingsSig || prismMode !== lastPrismsSig || showEngine?.isActive()) {
      lastSunX = sun.position.x;
      lastSunY = sun.position.y;
      lastSunZ = sun.position.z;
      lastRingsSig = rSig;
      lastPrismsSig = prismMode;
      shadowDirtyFrames = 2;
    }
    renderer.shadowMap.needsUpdate = shadowDirtyFrames > 0;
    if (shadowDirtyFrames > 0) shadowDirtyFrames--;
  } else {
    renderer.shadowMap.needsUpdate = false;
  }
  if (composer) composer.render();
  else renderer.render(scene, camera);
  if (labelsOn) labelRenderer.render(scene, camera);
  videoCtl.update();
  if (!lockedDpr && clockDelta > 0.031 && activeDpr > 0.85) {
    slowFrameCount++;
    if (slowFrameCount >= 60) {
      slowFrameCount = 0;
      activeDpr = Math.max(0.85, Math.round((activeDpr - 0.15) * 20) / 20);
      renderer.setPixelRatio(activeDpr);
      fit();
    }
  } else if (slowFrameCount > 0 && clockDelta < 0.022) {
    slowFrameCount = Math.max(0, slowFrameCount - 2);
  }
}
function loop() {
  const delta = clock.getDelta();
  frame(Math.min(delta, 0.1), delta);
  requestAnimationFrame(loop);
}
let composer = null, gtao = null, bloomPass = null, gradePass = null;
if (params.get("ao") !== "0" && renderer.extensions.has("EXT_color_buffer_float")) {
  const useHwMsaa = renderer.capabilities.isWebGL2 && (renderer.capabilities.maxSamples || 0) >= 4;
  if (useHwMsaa) {
    const rt = new THREE.WebGLRenderTarget(innerWidth, innerHeight, { type: THREE.HalfFloatType, samples: 4 });
    composer = new EffectComposer(renderer, rt);
  } else {
    composer = new EffectComposer(renderer);
  }
  composer.addPass(new RenderPass(scene, camera));
  gtao = new GTAOPass(scene, camera, innerWidth, innerHeight);
  const cutouts = [];
  scene.traverse((o) => {
    if (o.userData.skipAoDepth) cutouts.push(o);
  });
  const cacheVisibility = gtao.overrideVisibility.bind(gtao);
  gtao.overrideVisibility = () => {
    cacheVisibility();
    for (const o of cutouts) o.visible = false;
  };
  gtao.updateGtaoMaterial({ radius: 1.2, distanceExponent: 1.5, thickness: 2, scale: 1.2, samples: 12 });
  gtao.blendIntensity = 0.62;
  composer.addPass(gtao);
  bloomPass = new UnrealBloomPass(new THREE.Vector2(Math.max(1, Math.floor(innerWidth * 0.5)), Math.max(1, Math.floor(innerHeight * 0.5))), 0.4, 0.32, 0.86);
  bloomPass.enabled = false;
  if (bloomPass.materialHighPassFilter?.fragmentShader) {
    bloomPass.materialHighPassFilter.fragmentShader = bloomPass.materialHighPassFilter.fragmentShader.replace(
      "vec4 texel = texture2D( tDiffuse, vUv );",
      "vec4 texel = texture2D( tDiffuse, vUv );\n		texel.r = ( texel.r >= 0.0 && texel.r <= 65000.0 ) ? min( texel.r, 12.0 ) : 0.0;\n		texel.g = ( texel.g >= 0.0 && texel.g <= 65000.0 ) ? min( texel.g, 12.0 ) : 0.0;\n		texel.b = ( texel.b >= 0.0 && texel.b <= 65000.0 ) ? min( texel.b, 12.0 ) : 0.0;"
    );
    bloomPass.materialHighPassFilter.needsUpdate = true;
  }
  Object.assign(bloomPass.blendMaterial, { blending: THREE.CustomBlending, blendSrc: THREE.SrcAlphaFactor, blendDst: THREE.OneFactor, blendSrcAlpha: THREE.ZeroFactor, blendDstAlpha: THREE.OneFactor });
  composer.addPass(bloomPass);
  composer.addPass(new OutputPass());
  gradePass = createGradePass();
  composer.addPass(gradePass);
  if (!useHwMsaa) {
    composer.addPass(new SMAAPass(innerWidth * activeDpr, innerHeight * activeDpr));
  }
}
function fit() {
  const a = Number(params.get("aspect")) || 0;
  let w = innerWidth, h = innerHeight;
  if (a) {
    w = Math.min(innerWidth, innerHeight * a);
    h = w / a;
  }
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  renderer.setSize(w, h);
  labelRenderer.setSize(w, h);
  videoCtl.setSize(w, h);
  if (composer) {
    composer.setSize(w, h);
    if (bloomPass) bloomPass.setSize(Math.max(1, Math.floor(w * 0.5)), Math.max(1, Math.floor(h * 0.5)));
  }
}
addEventListener("resize", fit);
fit();
nightCtl = setupNight({ scene, renderer, gtao, bloomPass, sky, sun, hemi });
const lookSel = document.getElementById("look");
const weatherSelect = document.getElementById("stageWeather");
const timeSlider = document.getElementById("sceneTime");
const momentSelect = document.getElementById("sceneMoment");
const displayTime = document.getElementById("sceneClock");
const playbackButton = document.getElementById("scenePlayback");
const rateSelect = document.getElementById("sceneRate");
const nightButton = document.getElementById("nightBtn");
patchFogMaterials(scene);
const weatherCtl = createStageWeather({
  scene,
  renderer,
  groundMaterials,
  sky,
  sun,
  hemi,
  night: nightCtl,
  bloomPass,
  gradePass,
  onChange({ preset, minute, rate, playing }, dark) {
    const label = formatSceneTime(minute);
    weatherSelect.value = preset;
    timeSlider.value = Math.floor(minute);
    timeSlider.setAttribute("aria-valuetext", label);
    displayTime.value = label;
    {
      const mini = document.getElementById("sceneClockMini");
      if (mini) mini.value = (dark ? "夜 " : "") + label + " · " + WEATHER[preset].label;
    }
    const shownMinute = Math.floor(minute);
    momentSelect.value = Object.hasOwn(TIME_JUMPS, shownMinute) ? shownMinute : "";
    rateSelect.value = rate;
    playbackButton.textContent = playing ? "暂停时间" : "自动播放";
    playbackButton.setAttribute("aria-pressed", String(playing));
    playbackButton.classList.toggle("on", playing);
    nightButton.setAttribute("aria-pressed", String(dark));
    nightButton.classList.toggle("on", dark);
  }
});
weatherSelect.addEventListener("change", () => weatherCtl.setPreset(weatherSelect.value));
timeSlider.addEventListener("input", () => {
  const minute = Number(timeSlider.value);
  weatherCtl.setPlaying(false);
  weatherCtl.setTime(minute);
});
momentSelect.addEventListener("change", () => {
  if (!momentSelect.value) return;
  const minute = Number(momentSelect.value);
  weatherCtl.setPlaying(false);
  weatherCtl.setTime(minute);
});
playbackButton.addEventListener("click", () => weatherCtl.setPlaying(!weatherCtl.state().playing));
rateSelect.addEventListener("change", () => weatherCtl.setRate(Number(rateSelect.value)));
function setNight(on) {
  weatherCtl.toggleNight(on);
}
function setLook(k) {
  nightCtl.setLook(k);
  if (lookSel) lookSel.value = k;
}
if (params.has("weather")) weatherCtl.setPreset(params.get("weather"));
const startTime = params.get("time")?.match(/^([01]?\d|2[0-3]):([0-5]\d)$/);
if (startTime) weatherCtl.setTime(Number(startTime[1]) * 60 + Number(startTime[2]));
if (params.get("look")) setLook(params.get("look"));
if (params.get("night") === "1") setNight(true);
if (params.get("autotime") === "1") weatherCtl.setPlaying(true);
const showSelect = ui.querySelector("#showSelect");
const showPlayBtn = ui.querySelector("#showPlay");
const showStopBtn = ui.querySelector("#showStop");
const showLoopBtn = ui.querySelector("#showLoop");
const showRateSel = ui.querySelector("#showRate");
const showSeek = ui.querySelector("#showSeek");
const showTimeEl = ui.querySelector("#showTime");
const showCueLabelEl = ui.querySelector("#showCueLabel");
const showCuesToggle = ui.querySelector("#showCuesToggle");
const showCuesEl = ui.querySelector("#showCues");
const showMetaEl = ui.querySelector("#showMeta");
const showFileInput = ui.querySelector("#showFile");
const showEvidenceEl = ui.querySelector("#showEvidence");
let renderedCuesFor = null;
let showCuesOpen = false;
function shortCueLabel(text) {
  return String(text || "").split("·")[0].split("|")[0].replace(/[（(][^）)]*[）)]/g, "").trim();
}
function renderShowCatalog(items, activeId) {
  showSelect.innerHTML = '<option value="">手动控制</option>' + items.map((s) => `<option value="${s.id}">${s.title}</option>`).join("");
  showSelect.value = activeId || "";
}
function setShowError(msg) {
  showMetaEl.textContent = msg || "";
  showMetaEl.hidden = !msg;
}
showEngine = createShowEngine({
  scene,
  embeddedShows: EMBEDDED_SHOWS,
  rig: {
    setNight: (on) => setNight(on),
    setRingsTarget: (target) => {
      showRingsTarget = target;
    },
    setPrisms: (modeOrCustom) => VN.setPrismTargets(prisms, modeOrCustom),
    setBridge: (v) => VN.setBridgeTargetHeight(v),
    setLift: (v) => rings.userData.setLiftState?.(v),
    setFountain: (on) => setControl("fountain", on ? "on" : "off"),
    setHourglass: (mode2) => setControl("hourglassLights", mode2),
    setLights: (spec) => nightCtl.setCustomLook(spec),
    performerSurfaceAt: (x, z, inCage) => {
      if (inCage) return VN.liftCageHeight();
      const C = LAYOUT.circleStage, M = LAYOUT.mainStage;
      if (Math.hypot(x - C.x, z - C.z) < LAYOUT.lift.platform.r) return VN.liftPlatformHeight();
      if (Math.abs(x) < M.centerPad.w / 2 && z <= M.z0 + M.centerPad.d && z >= M.z0) return C.base.h + M.centerPad.h;
      return groundAt(x, z, 10);
    },
    restoreManual: () => {
      showRingsTarget = null;
      nightCtl.setCustomLook(null);
      VN.setPrismTargets(prisms, prismMode);
    }
  },
  onUpdate(st) {
    if (showSelect.options.length - 1 !== st.catalog.length) renderShowCatalog(st.catalog, st.id);
    else if (showSelect.value !== (st.id || "")) showSelect.value = st.id || "";
    showPlayBtn.textContent = st.playing ? "暂停" : "播放";
    showPlayBtn.classList.toggle("on", st.playing);
    showLoopBtn.classList.toggle("on", st.loop);
    showLoopBtn.setAttribute("aria-pressed", String(st.loop));
    showRateSel.value = String(st.rate);
    showSeek.disabled = !st.active;
    showSeek.max = String(st.duration || 100);
    if (document.activeElement !== showSeek) showSeek.value = String(st.time);
    showTimeEl.textContent = `${st.timeLabel} / ${st.durationLabel}`;
    showCueLabelEl.textContent = st.active ? shortCueLabel(st.cueLabel || st.title) : "";
    setShowError("");
    if (showEvidenceEl) {
      if (st.active && st.evidenceUrl) {
        showEvidenceEl.href = st.evidenceUrl;
        showEvidenceEl.hidden = false;
      } else {
        showEvidenceEl.hidden = true;
      }
    }
    if (renderedCuesFor !== st.id) {
      renderedCuesFor = st.id;
      showCuesEl.innerHTML = st.cues.map((c) => `<button type="button" data-cue-at="${c.at}" data-cue-idx="${c.index}">${c.atLabel} ${shortCueLabel(c.label)}</button>`).join("");
      showCuesEl.querySelectorAll("button").forEach((btn) => btn.addEventListener("click", () => {
        const sec = Number(btn.dataset.cueAt);
        showEngine.seek(sec);
        mediaSync?.onShowSeek(sec);
        btn.blur();
      }));
      mediaSync?.onShowChanged(st.id, st.media);
    }
    const hasCues = Boolean(st.active && st.cues.length > 0);
    showCuesToggle.hidden = !hasCues;
    showCuesToggle.classList.toggle("on", hasCues && showCuesOpen);
    showCuesToggle.setAttribute("aria-pressed", String(hasCues && showCuesOpen));
    showCuesEl.hidden = !(hasCues && showCuesOpen);
    showCuesEl.querySelectorAll("button").forEach((btn) => btn.classList.toggle("on", Number(btn.dataset.cueIdx) === st.cueIndex));
  }
});
const showMediaToggle = ui.querySelector("#showMediaToggle");
const showWithVideoBtn = ui.querySelector("#showWithVideo");
const showMediaEl = ui.querySelector("#showMedia");
const smPickFile = ui.querySelector("#smPickFile");
const smFileFallback = ui.querySelector("#smFileFallback");
const smReconnect = ui.querySelector("#smReconnect");
const smUrl = ui.querySelector("#smUrl");
const smGoUrl = ui.querySelector("#smGoUrl");
const smTarget = ui.querySelector("#smTarget");
const smOffset = ui.querySelector("#smOffset");
const smResync = ui.querySelector("#smResync");
const smPlayer = ui.querySelector("#smPlayer");
const smClear = ui.querySelector("#smClear");
const smStatus = ui.querySelector("#smStatus");
let showMediaOpen = false;
mediaSync = createMediaSync({
  showEngine,
  videoCtl,
  onUpdate(ms) {
    showMediaToggle.classList.toggle("on", showMediaOpen || ms.active);
    showWithVideoBtn.hidden = !ms.savedUrl || ms.active;
    smClear.hidden = !ms.active;
    smResync.hidden = !ms.active;
    smPlayer.hidden = !ms.isEmbed;
    smTarget.value = ms.videoTarget || "all";
    if (document.activeElement !== smOffset) smOffset.value = String(ms.offset ?? 0);
    if (!ms.active && ms.savedUrl && !smUrl.value) smUrl.value = ms.savedUrl;
    smReconnect.hidden = ms.active || !ms.hasSavedHandle;
    if (ms.hasSavedHandle && ms.savedFileName) smReconnect.textContent = `续播 ${ms.savedFileName.slice(0, 12)}`;
    smStatus.textContent = ms.active ? `${ms.label}` : "";
  }
});
showWithVideoBtn.addEventListener("click", async () => {
  showWithVideoBtn.blur();
  const u = (smUrl.value || mediaSync.state().savedUrl || "").trim();
  if (!u) return;
  showMediaOpen = true;
  showMediaEl.hidden = false;
  showMediaToggle.setAttribute("aria-pressed", "true");
  showMediaToggle.classList.add("on");
  try {
    await mediaSync.attachUrl(u);
    setShowError("");
  } catch (err) {
    setShowError(String(err.message || err));
  }
});
showMediaToggle.addEventListener("click", () => {
  showMediaOpen = !showMediaOpen;
  showMediaEl.hidden = !showMediaOpen;
  showMediaToggle.setAttribute("aria-pressed", String(showMediaOpen));
  showMediaToggle.classList.toggle("on", showMediaOpen || mediaSync.state().active);
  showMediaToggle.blur();
});
smPickFile.addEventListener("click", async () => {
  smPickFile.blur();
  const picked = await pickLocalMediaHandle();
  if (picked === null) {
    smFileFallback.click();
    return;
  }
  if (picked.cancelled) return;
  try {
    await mediaSync.attachFile(picked.file, picked.handle);
    setShowError("");
  } catch (e) {
    setShowError(String(e.message || e));
  }
});
smFileFallback.addEventListener("change", async (e) => {
  const f = e.target.files?.[0];
  e.target.value = "";
  if (!f) return;
  try {
    await mediaSync.attachFile(f, null);
    setShowError("");
  } catch (err) {
    setShowError(String(err.message || err));
  }
});
smReconnect.addEventListener("click", async () => {
  smReconnect.blur();
  const ok = await mediaSync.reconnectSavedHandle();
  if (!ok) setShowError("无法读取上次文件，请重新选择");
});
const syncMediaUrl = async () => {
  const u = smUrl.value.trim();
  if (!u) return;
  try {
    await mediaSync.attachUrl(u);
    setShowError("");
  } catch (err) {
    setShowError(String(err.message || err));
  }
};
smGoUrl.addEventListener("click", syncMediaUrl);
smUrl.addEventListener("keydown", (e) => {
  if (e.key === "Enter") syncMediaUrl();
  e.stopPropagation();
});
smTarget.addEventListener("change", () => {
  mediaSync.setVideoTarget(smTarget.value);
  smTarget.blur();
});
smOffset.addEventListener("change", () => mediaSync.setOffset(Number(smOffset.value) || 0));
smOffset.addEventListener("keydown", (e) => e.stopPropagation());
showMediaEl.querySelectorAll("[data-nudge]").forEach((b) => b.addEventListener("click", () => {
  mediaSync.nudgeOffset(Number(b.dataset.nudge));
  b.blur();
}));
smResync.addEventListener("click", () => {
  mediaSync.resyncStart();
  smResync.blur();
});
smPlayer.addEventListener("click", () => {
  const next = !videoCtl.state().interactive;
  setVidInteract(next);
  smPlayer.classList.toggle("on", next);
  smPlayer.blur();
});
smClear.addEventListener("click", () => {
  setVidInteract(false);
  smPlayer.classList.remove("on");
  mediaSync.clear();
  smClear.blur();
});
showCuesToggle.addEventListener("click", () => {
  showCuesOpen = !showCuesOpen;
  const st = showEngine.state();
  const hasCues = Boolean(st.active && st.cues.length > 0);
  showCuesToggle.classList.toggle("on", hasCues && showCuesOpen);
  showCuesToggle.setAttribute("aria-pressed", String(hasCues && showCuesOpen));
  showCuesEl.hidden = !(hasCues && showCuesOpen);
  showCuesToggle.blur();
});
showSelect.addEventListener("change", async () => {
  const id = showSelect.value;
  showSelect.blur();
  if (!id) {
    mediaSync.clear();
    showEngine.stop();
    return;
  }
  try {
    await showEngine.load(id, { autoPlay: true });
  } catch (e) {
    setShowError(String(e.message || e));
  }
});
showPlayBtn.addEventListener("click", async () => {
  const st = showEngine.state();
  if (!st.active) {
    const first = showEngine.list()[0];
    if (first) await showEngine.load(first.id, { autoPlay: true });
  } else if (st.playing) {
    showEngine.pause();
    mediaSync.onShowPlayPause(false);
  } else {
    showEngine.play();
    mediaSync.onShowPlayPause(true);
  }
  showPlayBtn.blur();
});
showStopBtn.addEventListener("click", () => {
  mediaSync.clear();
  showEngine.stop();
  showStopBtn.blur();
});
showLoopBtn.addEventListener("click", () => {
  const next = !showEngine.state().loop;
  showEngine.setLoop(next);
  mediaSync.onShowLoop(next);
  showLoopBtn.blur();
});
showRateSel.addEventListener("change", () => {
  const r = Number(showRateSel.value);
  showEngine.setRate(r);
  mediaSync.onShowRate(r);
  showRateSel.blur();
});
showSeek.addEventListener("input", () => {
  const sec = Number(showSeek.value);
  showEngine.seek(sec);
  mediaSync.onShowSeek(sec);
});
showFileInput.addEventListener("change", async (e) => {
  const file = e.target.files?.[0];
  e.target.value = "";
  if (!file) return;
  try {
    const raw = JSON.parse(await file.text());
    await showEngine.load(raw, { autoPlay: true });
    renderShowCatalog(showEngine.list(), showEngine.state().id);
  } catch (err) {
    setShowError("导入失败：" + String(err.message || err));
  }
});
await showEngine.discoverCatalog();
renderShowCatalog(showEngine.list(), "");
if (params.get("showUrl")) {
  try {
    const res = await fetch(params.get("showUrl"), { cache: "no-store" });
    if (res.ok) {
      const raw = await res.json();
      await showEngine.load(raw, { autoPlay: params.get("showPause") !== "1" });
      renderShowCatalog(showEngine.list(), showEngine.state().id);
      if (params.get("showTime") != null) showEngine.seek(Number(params.get("showTime")) || 0);
    }
  } catch (e) {
    console.warn(e);
  }
} else if (params.get("show")) {
  try {
    await showEngine.load(params.get("show"), { autoPlay: params.get("showPause") !== "1" });
    if (params.get("showTime") != null) showEngine.seek(Number(params.get("showTime")) || 0);
  } catch (e) {
    console.warn(e);
  }
}
async function shot(name) {
  frame(0);
  const data = renderer.domElement.toDataURL("image/jpeg", 0.85);
  return (await fetch("/save?name=" + encodeURIComponent(name), { method: "POST", body: data })).text();
}
const cam = (pos, target, fov = 45, near = null) => {
  setMode("drone");
  viewNear = near;
  camera.fov = fov;
  camera.updateProjectionMatrix();
  camera.position.set(...pos);
  camera.lookAt(...target);
  nav.syncFromCamera();
  frame(0);
};
window.G = { shot, cam, nav, video: videoCtl, show: showEngine, mediaSync, teleport: (x, z) => nav.teleport(x, z), setNight: (on) => setNight(on), setLook: (k) => setLook(k), scene, camera, LAYOUT, setView, setMode, setLabels, step: (n = 30, dt = 1 / 30) => {
  for (let i = 0; i < n; i++) frame(dt);
}, setFormation: (k) => formation = k, setControl, controls: VN.controls, setPrisms: (k) => {
  prismMode = k;
  VN.setPrismTargets(prisms, k);
} };
setView(params.get("view") || "overview");
if (["first", "third"].includes(params.get("mode"))) setMode(params.get("mode"));
if (params.get("live") === "1") {
  try {
    const s = JSON.parse(sessionStorage.getItem("stage-live") || "null");
    if (s) {
      camera.fov = s.fov;
      camera.updateProjectionMatrix();
      camera.position.fromArray(s.pos);
      if (s.quat) camera.quaternion.fromArray(s.quat);
      nav.syncFromCamera();
      formation = s.formation in LAYOUT.rings.formations ? s.formation : formation;
      if (s.prismMode in prismModes) {
        prismMode = s.prismMode;
        VN.setPrismTargets(prisms, prismMode);
        VN.updatePrisms(prisms, 0, true);
      }
      if (s.weather) weatherCtl.restore(s.weather);
      else if (s.night) setNight(true);
      for (const [k, v] of Object.entries(s.ctl || {})) {
        try {
          setControl(k, v);
        } catch (e) {
          console.warn(e);
        }
      }
      ui.querySelector("#rings").value = formation;
      ui.querySelector("#prisms").value = prismMode;
    }
  } catch (e) {
    console.warn(e);
  }
  window.__liveSave = () => sessionStorage.setItem("stage-live", JSON.stringify({ fov: camera.fov, pos: camera.position.toArray(), quat: camera.quaternion.toArray(), formation, prismMode, weather: weatherCtl.state(), ctl: Object.fromEntries(VN.controls.map((c) => [c.key, c.value])) }));
}
await loader.step("编译着色器", 0.86);
try {
  nightCtl.setPrewarm(true);
  await renderer.compileAsync(scene, camera);
} catch (e) {
  console.warn(e);
} finally {
  nightCtl.setPrewarm(false);
}
if ("serviceWorker" in navigator && location.protocol === "https:" && !/^(localhost|127\.0\.0\.1)$/i.test(location.hostname)) {
  navigator.serviceWorker.register("./sw.js").catch(() => {
  });
}
loop();
requestAnimationFrame(() => requestAnimationFrame(() => loader.done()));
