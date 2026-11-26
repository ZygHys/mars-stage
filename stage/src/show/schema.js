// 舞美资源包（Show Pack）数据结构校验、标准化与时间轴 Cue 插值计算（纯 JS，无浏览器依赖，支持 Node 单测与 CLI 校验）。

export const SHOW_SCHEMA_VERSION = '1.0';

export const VALID_PATTERNS = new Set(['fan', 'vee', 'sweep', 'cross', 'vertical', 'cone', 'down']);
export const VALID_HOURGLASS = new Set(['show', 'chase', 'bands', 'test', 'all', 'off']);
export const VALID_SCREEN_GROUPS = new Set(['all', 'tower', 'imag', 'side', 'delay', 'lawn', 'cylinder']);
export const VALID_VISUAL_MODES = new Set(['default', 'blackout', 'solid', 'gradient', 'marsLogo', 'fire', 'nebula', 'rings', 'bars', 'title', 'image']);
export const VALID_LASER_EMITTERS = new Set(['all', 'stageLeft', 'stageRight', 'canopy', 'towerLeft', 'towerRight']);
export const VALID_PERFORMER_OUTFITS = new Set(['redCoat', 'whiteSuit', 'blackRock', 'goldRoyal', 'meiqiuKing']);
export const VALID_PERFORMER_POSES = new Set(['stand', 'sing', 'rock', 'openArms']);
export const VALID_PERFORMER_PROPS = new Set(['redMic', 'micStand', 'guitar', 'none']);

// 解析 "MM:SS" 或秒数为数字秒
export function parseTimecode(v) {
  if (typeof v === 'number' && Number.isFinite(v)) return Math.max(0, v);
  if (typeof v === 'string') {
    const m = v.trim().match(/^(\d+):([0-5]?\d(?:\.\d+)?)$/);
    if (m) return Number(m[1]) * 60 + Number(m[2]);
    const n = Number(v);
    if (Number.isFinite(n)) return Math.max(0, n);
  }
  return NaN;
}

export function formatTimecode(sec) {
  const s = Math.max(0, Math.floor(sec));
  const mm = Math.floor(s / 60);
  const ss = s % 60;
  return `${mm}:${String(ss).padStart(2, '0')}`;
}

function parseHex(hex) {
  if (typeof hex !== 'string') return null;
  const s = hex.trim().replace(/^#/, '');
  if (!/^[0-9a-fA-F]{6}$/.test(s)) return null;
  return [parseInt(s.slice(0, 2), 16), parseInt(s.slice(2, 4), 16), parseInt(s.slice(4, 6), 16)];
}

export function lerpHex(a, b, t) {
  const ca = parseHex(a), cb = parseHex(b);
  if (!ca || !cb) return t < 0.5 ? (a ?? b) : (b ?? a);
  const k = Math.max(0, Math.min(1, t));
  const r = Math.round(ca[0] + (cb[0] - ca[0]) * k);
  const g = Math.round(ca[1] + (cb[1] - ca[1]) * k);
  const bl = Math.round(ca[2] + (cb[2] - ca[2]) * k);
  return `#${((1 << 24) + (r << 16) + (g << 8) + bl).toString(16).slice(1)}`;
}

const lerpNum = (a, b, t) => a + (b - a) * Math.max(0, Math.min(1, t));

// 校验 show.json 并返回 { ok, errors, warnings, show }
export function validateShow(raw) {
  const errors = [];
  const warnings = [];
  if (!raw || typeof raw !== 'object') {
    return { ok: false, errors: ['show.json 根节点必须是对象'], warnings, show: null };
  }
  if (!raw.id || typeof raw.id !== 'string') errors.push('缺少字符串字段 id');
  if (!raw.title || typeof raw.title !== 'string') errors.push('缺少字符串字段 title');
  const duration = parseTimecode(raw.duration);
  if (!Number.isFinite(duration) || duration <= 0) errors.push('duration 必须是大于 0 的秒数或 MM:SS 时间码');
  if (!Array.isArray(raw.cues) || raw.cues.length === 0) errors.push('cues 必须是非空数组');

  const cues = [];
  if (Array.isArray(raw.cues)) {
    raw.cues.forEach((cue, idx) => {
      if (!cue || typeof cue !== 'object') { errors.push(`cues[${idx}] 必须是对象`); return; }
      const at = parseTimecode(cue.at);
      if (!Number.isFinite(at)) { errors.push(`cues[${idx}].at 时间码无效: ${cue.at}`); return; }
      if (Number.isFinite(duration) && at > duration) warnings.push(`cues[${idx}].at (${at}s) 超过总时长 ${duration}s`);

      const fade = cue.fade != null ? Math.max(0, Number(cue.fade) || 0) : 1.2;
      if (cue.lights?.pattern && !VALID_PATTERNS.has(cue.lights.pattern)) {
        errors.push(`cues[${idx}].lights.pattern 无效: ${cue.lights.pattern}`);
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
      if (cue.screens && typeof cue.screens === 'object') {
        for (const [grp, spec] of Object.entries(cue.screens)) {
          if (!VALID_SCREEN_GROUPS.has(grp)) errors.push(`cues[${idx}].screens 存在未知屏组: ${grp}`);
          if (spec?.mode && !VALID_VISUAL_MODES.has(spec.mode)) errors.push(`cues[${idx}].screens.${grp}.mode 无效: ${spec.mode}`);
        }
      }
      if (cue.performer && typeof cue.performer === 'object') {
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
    id: String(raw.id || 'untitled'),
    title: String(raw.title || '未命名舞美'),
    subtitle: String(raw.subtitle || ''),
    source: raw.source || null,
    bpm: Number(raw.bpm) || 120,
    duration: Number.isFinite(duration) ? duration : 60,
    night: raw.night !== false,
    loop: raw.loop !== false,
    defaults: raw.defaults || {},
    cues,
  };
  return { ok: errors.length === 0, errors, warnings, show: normalized };
}

// 递归合并基础状态（只覆盖明确给出的字段，保留轨道持续性——类似 DMX / MA2 控台的 Tracking 机制）
function applyTrackPatch(state, patch) {
  if (!patch || typeof patch !== 'object') return state;
  const next = {
    stage: { ...state.stage },
    prisms: state.prisms,
    lights: { ...state.lights },
    screens: { ...state.screens },
    performer: { ...state.performer },
    fx: { ...state.fx },
  };
  if (patch.stage) Object.assign(next.stage, patch.stage);
  if (patch.prisms !== undefined) next.prisms = patch.prisms;
  if (patch.lights) {
    Object.assign(next.lights, patch.lights);
    if (patch.lights.laserOn === false && patch.lights.laserGroups === undefined) next.lights.laserGroups = [];
  }
  if (patch.screens) {
    for (const [k, v] of Object.entries(patch.screens)) {
      next.screens[k] = v === null ? null : { ...(next.screens[k] || {}), ...v };
    }
  }
  if (patch.performer) {
    Object.assign(next.performer, patch.performer);
    // 如果本段设置了固定 zone/pos 而未设 path，则清空上一段的巡台路径，避免旧 path 覆盖新站位
    if ((patch.performer.zone !== undefined || patch.performer.pos !== undefined) && patch.performer.path === undefined) {
      next.performer.path = null;
    }
  }
  if (patch.fx) Object.assign(next.fx, patch.fx);
  return next;
}

const BASE_STATE = {
  stage: { rings: 'layered', bridge: 'low', lift: 'down', fountain: false },
  prisms: 'night9687',
  lights: {
    beams: ['#b03cff', '#e040ff', '#7a5cff'],
    beamLeft: null,
    beamRight: null,
    pattern: 'fan',
    beamSpeed: 1.0,
    beamI: 0.9,
    strobe: 0,
    pulse: false,
    led: '#b04cff',
    strips: '#ff2f6a',
    stripI: 1.0,
    towerStrips: null,
    hgColor: null,
    hourglass: 'show',
    lasers: '#d06bff',
    laserOn: false,
    laserI: 1.0,
    laserGroups: [],
    wash: '#7a2cff',
    washI: 1.0,
    haze: 1.0,
    hazeI: 1.1,
    hazeC: null,
    crowdGlow: '#ff2a3a',
    crowdGlowI: 1.0,
  },
  screens: { all: { mode: 'default' }, tower: { mode: 'default' } },
  performer: { visible: false, outfit: 'redCoat', prop: 'redMic', pose: 'sing', zone: 'mainCenter', pos: null, path: null, speed: 3.2, facingDeg: 0, spotlight: true, spotColor: '#fff8ee', spotIntensity: 1.0 },
  fx: { firework: null, flameJet: null, smokeJet: null },
};

function blendLights(prev, curr, t) {
  if (t >= 1) return curr;
  const k = t * t * (3 - 2 * t);
  const out = { ...curr };
  for (const key of ['beamI', 'beamSpeed', 'stripI', 'laserI', 'washI', 'haze', 'hazeI', 'crowdGlowI']) {
    if (typeof prev[key] === 'number' && typeof curr[key] === 'number') {
      out[key] = lerpNum(prev[key], curr[key], k);
    }
  }
  for (const key of ['led', 'strips', 'lasers', 'crowdGlow', 'hazeC', 'hgColor', 'towerStrips', 'beamLeft', 'beamRight']) {
    if (prev[key] && curr[key]) out[key] = lerpHex(prev[key], curr[key], k);
  }
  if (typeof prev.wash === 'string' && typeof curr.wash === 'string') {
    out.wash = lerpHex(prev.wash, curr.wash, k);
  } else if (Array.isArray(prev.wash) && Array.isArray(curr.wash)) {
    out.wash = curr.wash.map((c, i) => lerpHex(prev.wash[i] || prev.wash[0], c, k));
  }
  if (Array.isArray(prev.beams) && Array.isArray(curr.beams)) {
    out.beams = curr.beams.map((c, i) => lerpHex(prev.beams[i % prev.beams.length], c, k));
  }
  return out;
}

// 预计算每个 Cue 的完整 Tracking 状态表，便于播放与任意时间点拖动（seek）
export function compileShow(rawShow) {
  const { ok, errors, warnings, show } = validateShow(rawShow);
  if (!ok) throw new Error(`舞美资源包格式错误：${errors.join('；')}`);
  const rootState = applyTrackPatch(BASE_STATE, show.defaults);
  const snapshots = [];
  let acc = rootState;
  for (const cue of show.cues) {
    // 特效脉冲默认不自动延续到下一段（除非下一段明确声明）
    const baseNext = { ...acc, fx: { firework: null, flameJet: null, smokeJet: null } };
    acc = applyTrackPatch(baseNext, cue);
    snapshots.push({ cue, state: acc });
  }
  return { show, snapshots, warnings, rootState };
}

// 在给定时间 time（秒）求值完整舞美状态（含平滑淡入淡出）
export function evaluateShow(compiled, time) {
  const { snapshots, rootState } = compiled;
  if (!snapshots.length) return { index: -1, cue: null, state: rootState };
  let idx = -1;
  for (let i = 0; i < snapshots.length; i++) {
    if (snapshots[i].cue.at <= time) idx = i;
    else break;
  }
  if (idx < 0) return { index: -1, cue: null, state: rootState };
  const curr = snapshots[idx];
  const prevState = idx > 0 ? snapshots[idx - 1].state : rootState;
  const fade = curr.cue.fade ?? 1.2;
  const elapsed = time - curr.cue.at;
  const blend = fade > 0 ? Math.max(0, Math.min(1, elapsed / fade)) : 1;
  const state = {
    ...curr.state,
    lights: blendLights(prevState.lights, curr.state.lights, blend),
  };
  return { index: idx, cue: curr.cue, state, cueElapsed: elapsed };
}
