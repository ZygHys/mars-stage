const SHOW_SCHEMA_VERSION = "1.0";
const VALID_PATTERNS =  new Set(["fan", "sunburst", "vee", "sweep", "cross", "vertical", "cone", "down", "whipSweep", "scissorWhip", "waveWhip", "doubleFan"]);
const VALID_HOURGLASS =  new Set(["show", "chase", "bands", "test", "all", "off", "zebra", "inkWhite", "amberBars"]);
const VALID_SCREEN_GROUPS =  new Set(["all", "tower", "imag", "side", "delay", "lawn", "cylinder"]);
const VALID_VISUAL_MODES =  new Set(["default", "blackout", "solid", "gradient", "marsLogo", "fire", "nebula", "rings", "bars", "title", "image", "monoCards", "monoSilhouettes", "monoEyes", "imagFrame"]);
const VALID_LASER_EMITTERS =  new Set(["all", "stageLeft", "stageCenter", "stageRight", "canopy", "towerLeft", "towerRight", "fineWeb", "lowCurtain"]);
const VALID_PERFORMER_OUTFITS =  new Set(["redCoat", "whiteSuit", "blackRock", "goldRoyal", "redFeather", "meiqiuKing"]);
const VALID_PERFORMER_POSES =  new Set(["stand", "sing", "rock", "openArms"]);
const VALID_PERFORMER_PROPS =  new Set(["redMic", "micStand", "guitar", "none"]);
function parseTimecode(v) {
  if (typeof v === "number" && Number.isFinite(v)) return Math.max(0, v);
  if (typeof v === "string") {
    const m = v.trim().match(/^(\d+):([0-5]?\d(?:\.\d+)?)$/);
    if (m) return Number(m[1]) * 60 + Number(m[2]);
    const n = Number(v);
    if (Number.isFinite(n)) return Math.max(0, n);
  }
  return NaN;
}
function formatTimecode(sec) {
  const s = Math.max(0, Math.floor(sec));
  const mm = Math.floor(s / 60);
  const ss = s % 60;
  return `${mm}:${String(ss).padStart(2, "0")}`;
}
function parseHex(hex) {
  if (typeof hex !== "string") return null;
  const s = hex.trim().replace(/^#/, "");
  if (!/^[0-9a-fA-F]{6}$/.test(s)) return null;
  return [parseInt(s.slice(0, 2), 16), parseInt(s.slice(2, 4), 16), parseInt(s.slice(4, 6), 16)];
}
function lerpHex(a, b, t) {
  const ca = parseHex(a), cb = parseHex(b);
  if (!ca || !cb) return t < 0.5 ? a ?? b : b ?? a;
  const k = Math.max(0, Math.min(1, t));
  const r = Math.round(ca[0] + (cb[0] - ca[0]) * k);
  const g = Math.round(ca[1] + (cb[1] - ca[1]) * k);
  const bl = Math.round(ca[2] + (cb[2] - ca[2]) * k);
  return `#${((1 << 24) + (r << 16) + (g << 8) + bl).toString(16).slice(1)}`;
}
const lerpNum = (a, b, t) => a + (b - a) * Math.max(0, Math.min(1, t));
function validateShow(raw) {
  const errors = [];
  const warnings = [];
  if (!raw || typeof raw !== "object") {
    return { ok: false, errors: ["show.json 根节点必须是对象"], warnings, show: null };
  }
  if (!raw.id || typeof raw.id !== "string") errors.push("缺少字符串字段 id");
  if (!raw.title || typeof raw.title !== "string") errors.push("缺少字符串字段 title");
  const duration = parseTimecode(raw.duration);
  if (!Number.isFinite(duration) || duration <= 0) errors.push("duration 必须是大于 0 的秒数或 MM:SS 时间码");
  if (!Array.isArray(raw.cues) || raw.cues.length === 0) errors.push("cues 必须是非空数组");
  const cues = [];
  if (Array.isArray(raw.cues)) {
    raw.cues.forEach((cue, idx) => {
      if (!cue || typeof cue !== "object") {
        errors.push(`cues[${idx}] 必须是对象`);
        return;
      }
      const at = parseTimecode(cue.at);
      if (!Number.isFinite(at)) {
        errors.push(`cues[${idx}].at 时间码无效: ${cue.at}`);
        return;
      }
      if (Number.isFinite(duration) && at > duration) warnings.push(`cues[${idx}].at (${at}s) 超过总时长 ${duration}s`);
      const fade = cue.fade != null ? Math.max(0, Number(cue.fade) || 0) : 1.2;
      if (cue.lights?.pattern && !VALID_PATTERNS.has(cue.lights.pattern)) {
        errors.push(`cues[${idx}].lights.pattern 无效: ${cue.lights.pattern}`);
      }
      if (cue.lights?.beamLayer2?.pattern && !VALID_PATTERNS.has(cue.lights.beamLayer2.pattern)) {
        errors.push(`cues[${idx}].lights.beamLayer2.pattern 无效: ${cue.lights.beamLayer2.pattern}`);
      }
      if (cue.lights?.hourglass && !VALID_HOURGLASS.has(cue.lights.hourglass)) {
        errors.push(`cues[${idx}].lights.hourglass 无效: ${cue.lights.hourglass}`);
      }
      if (Array.isArray(cue.lights?.laserGroups)) {
        cue.lights.laserGroups.forEach((lg, j) => {
          if (lg.emitter && !VALID_LASER_EMITTERS.has(lg.emitter)) {
            errors.push(`cues[${idx}].lights.laserGroups[${j}].emitter 无效: ${lg.emitter}`);
          }
        });
      }
      if (cue.screens && typeof cue.screens === "object") {
        for (const [grp, spec] of Object.entries(cue.screens)) {
          if (!VALID_SCREEN_GROUPS.has(grp)) errors.push(`cues[${idx}].screens 存在未知屏组: ${grp}`);
          if (spec?.mode && !VALID_VISUAL_MODES.has(spec.mode)) errors.push(`cues[${idx}].screens.${grp}.mode 无效: ${spec.mode}`);
        }
      }
      if (cue.performer && typeof cue.performer === "object") {
        const pf = cue.performer;
        if (pf.outfit && !VALID_PERFORMER_OUTFITS.has(pf.outfit)) errors.push(`cues[${idx}].performer.outfit 无效: ${pf.outfit}`);
        if (pf.pose && !VALID_PERFORMER_POSES.has(pf.pose)) errors.push(`cues[${idx}].performer.pose 无效: ${pf.pose}`);
        if (pf.prop && !VALID_PERFORMER_PROPS.has(pf.prop)) errors.push(`cues[${idx}].performer.prop 无效: ${pf.prop}`);
      }
      cues.push({ ...cue, at, fade, label: cue.label || `段落 ${idx + 1}` });
    });
  }
  cues.sort((a, b) => a.at - b.at);
  const normalized = {
    schema: raw.schema || SHOW_SCHEMA_VERSION,
    id: String(raw.id || "untitled"),
    title: String(raw.title || "未命名舞美"),
    subtitle: String(raw.subtitle || ""),
    source: raw.source || null,
    evidenceUrl: raw.evidenceUrl || null,
    bpm: Number(raw.bpm) || 120,
    beatOffset: Number(raw.beatOffset) || 0,
    duration: Number.isFinite(duration) ? duration : 60,
    night: raw.night !== false,
    loop: raw.loop !== false,
    defaults: raw.defaults || {},
    cues
  };
  return { ok: errors.length === 0, errors, warnings, show: normalized };
}
function applyTrackPatch(state, patch) {
  if (!patch || typeof patch !== "object") return state;
  const next = {
    stage: { ...state.stage },
    prisms: state.prisms,
    lights: { ...state.lights },
    screens: { ...state.screens },
    performer: { ...state.performer },
    fx: { ...state.fx }
  };
  if (patch.stage) Object.assign(next.stage, patch.stage);
  if (patch.prisms !== void 0) next.prisms = patch.prisms;
  if (patch.lights) {
    Object.assign(next.lights, patch.lights);
    if (patch.lights.laserOn === false && patch.lights.laserGroups === void 0) next.lights.laserGroups = [];
  }
  if (patch.screens) {
    for (const [k, v] of Object.entries(patch.screens)) {
      next.screens[k] = v === null ? null : { ...next.screens[k] || {}, ...v };
    }
  }
  if (patch.performer) {
    Object.assign(next.performer, patch.performer);
    if ((patch.performer.zone !== void 0 || patch.performer.pos !== void 0) && patch.performer.path === void 0) {
      next.performer.path = null;
    }
  }
  if (patch.fx) Object.assign(next.fx, patch.fx);
  return next;
}
const BASE_STATE = {
  stage: { rings: "layered", bridge: "low", lift: "down", fountain: false },
  prisms: "night9687",
  lights: {
    beams: ["#b03cff", "#e040ff", "#7a5cff"],
    beamLeft: null,
    beamRight: null,
    pattern: "fan",
    beamSpread: "normal",
    beamSpeed: 1,
    beamSwing: 1,
    beamChase: "none",
    beamChaseSpeed: 6,
    beamLayer2: null,
    beamI: 0.9,
    strobe: 0,
    pulse: false,
    frontStrobeI: 0,
    frontStrobeColor: "#ffffff",
    frontStrobeMode: "chase",
    frontStrobeSpeed: 10,
    led: "#b04cff",
    strips: "#ff2f6a",
    stripI: 1,
    towerStrips: null,
    hgColor: null,
    hgTopColor: null,
    hgTopI: 0.35,
    screenTopColor: null,
    screenTopI: 0.4,
    canopyMatrixColor: "#2e7bff",
    canopyMatrixI: 0,
    hourglass: "show",
    lasers: "#d06bff",
    laserOn: false,
    laserI: 1,
    laserGroups: [],
    wash: "#7a2cff",
    washI: 1,
    haze: 1,
    hazeI: 1.1,
    hazeC: null,
    crowdGlow: "#ff2a3a",
    crowdGlowI: 1
  },
  screens: { all: { mode: "default" }, tower: { mode: "default" } },
  performer: { visible: false, outfit: "redCoat", prop: "redMic", pose: "sing", zone: "mainCenter", pos: null, path: null, speed: 3.2, facingDeg: 0, spotlight: true, spotColor: "#fff8ee", spotIntensity: 1 },
  fx: { firework: null, flameJet: null, smokeJet: null }
};
function blendLights(prev, curr, t) {
  if (t >= 1) return curr;
  const k = t * t * (3 - 2 * t);
  const out = { ...curr };
  for (const key of ["beamI", "beamSpeed", "beamSwing", "beamChaseSpeed", "frontStrobeI", "frontStrobeSpeed", "stripI", "laserI", "washI", "haze", "hazeI", "crowdGlowI", "hgTopI", "screenTopI", "canopyMatrixI"]) {
    if (typeof prev[key] === "number" && typeof curr[key] === "number") {
      out[key] = lerpNum(prev[key], curr[key], k);
    }
  }
  for (const key of ["led", "strips", "lasers", "crowdGlow", "hazeC", "hgColor", "hgTopColor", "screenTopColor", "canopyMatrixColor", "frontStrobeColor", "towerStrips", "beamLeft", "beamRight"]) {
    if (prev[key] && curr[key]) out[key] = lerpHex(prev[key], curr[key], k);
  }
  if (typeof prev.wash === "string" && typeof curr.wash === "string") {
    out.wash = lerpHex(prev.wash, curr.wash, k);
  } else if (Array.isArray(prev.wash) && Array.isArray(curr.wash)) {
    out.wash = curr.wash.map((c, i) => lerpHex(prev.wash[i] || prev.wash[0], c, k));
  }
  if (Array.isArray(prev.beams) && Array.isArray(curr.beams)) {
    out.beams = curr.beams.map((c, i) => lerpHex(prev.beams[i % prev.beams.length], c, k));
  }
  return out;
}
function compileShow(rawShow) {
  const { ok, errors, warnings, show } = validateShow(rawShow);
  if (!ok) throw new Error(`舞美资源包格式错误：${errors.join("；")}`);
  const rootState = applyTrackPatch(BASE_STATE, show.defaults);
  const snapshots = [];
  let acc = rootState;
  for (const cue of show.cues) {
    const baseNext = { ...acc, fx: { firework: null, flameJet: null, smokeJet: null } };
    acc = applyTrackPatch(baseNext, cue);
    snapshots.push({ cue, state: acc });
  }
  return { show, snapshots, warnings, rootState };
}
function evaluateShow(compiled, time) {
  const { snapshots, rootState, show } = compiled;
  if (!snapshots.length) return { index: -1, cue: null, state: rootState, beatStepIdx: -1 };
  let idx = -1;
  for (let i = 0; i < snapshots.length; i++) {
    if (snapshots[i].cue.at <= time) idx = i;
    else break;
  }
  if (idx < 0) return { index: -1, cue: null, state: rootState, beatStepIdx: -1 };
  const curr = snapshots[idx];
  const prevState = idx > 0 ? snapshots[idx - 1].state : rootState;
  const fade = curr.cue.fade ?? 1.2;
  const elapsed = time - curr.cue.at;
  const blend = fade > 0 ? Math.max(0, Math.min(1, elapsed / fade)) : 1;
  let state = {
    ...curr.state,
    lights: blendLights(prevState.lights, curr.state.lights, blend)
  };
  let beatStepIdx = -1;
  const bc = curr.cue.beatCycle;
  if (bc && Array.isArray(bc.steps) && bc.steps.length > 0) {
    const bpm = Number(bc.bpm || show.bpm) || 120;
    const offset = Number(bc.beatOffset ?? show.beatOffset) || 0;
    const unitBeats = Math.max(0.125, Number(bc.unitBeats) || 0.5);
    const beatPos = (time - offset) * (bpm / 60);
    const rawStep = Math.floor(beatPos / unitBeats);
    beatStepIdx = (rawStep % bc.steps.length + bc.steps.length) % bc.steps.length;
    const stepPatch = bc.steps[beatStepIdx];
    if (stepPatch && typeof stepPatch === "object") {
      state = applyTrackPatch(state, stepPatch);
    }
  }
  return { index: idx, cue: curr.cue, state, cueElapsed: elapsed, beatStepIdx };
}
export {
  SHOW_SCHEMA_VERSION,
  VALID_HOURGLASS,
  VALID_LASER_EMITTERS,
  VALID_PATTERNS,
  VALID_PERFORMER_OUTFITS,
  VALID_PERFORMER_POSES,
  VALID_PERFORMER_PROPS,
  VALID_SCREEN_GROUPS,
  VALID_VISUAL_MODES,
  compileShow,
  evaluateShow,
  formatTimecode,
  lerpHex,
  parseTimecode,
  validateShow
};
