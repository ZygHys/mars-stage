// 统一舞美控制系统与时间轴播放器（Show Engine）：
// 接收可插拔的独立舞美资源包（stage/shows/<id>/show.json 或用户导入的 JSON），
// 同步驱动多处灯光、激光阵列、吊盘圆环、屏塔柱子朝向与站位、延伸台/歌手升降/喷泉、观众大屏视觉内容与烟花焰火特效。
import { compileShow, evaluateShow, formatTimecode } from './schema.js';
import { createScreenVisuals } from './visuals.js';
import { createShowFX } from './fx.js';
import { createPerformerSystem } from './performer.js';

export function createShowEngine({ scene, rig, embeddedShows = [], onUpdate = () => {} }) {
  const visuals = createScreenVisuals();
  const fx = createShowFX(scene);
  const performer = createPerformerSystem({
    scene,
    surfaceAt: (x, z, inCage) => rig.performerSurfaceAt(x, z, inCage),
  });

  // 资源目录（优先支持本地 ./shows/index.json 动态热加载，离线单文件回退到打包内嵌的 embeddedShows）
  const catalog = new Map();
  for (const item of embeddedShows) {
    if (item?.id) catalog.set(item.id, { id: item.id, title: item.title, subtitle: item.subtitle || '', data: item, baseUrl: '' });
  }

  let compiled = null;
  let activeId = null;
  let playing = false;
  let time = 0;
  let rate = 1;
  let loop = true;
  let lastCueIdx = -2;
  let lastPrismsKey = '';
  let lastLightsKey = '';
  let lastHourglass = '';
  let lastBridge = null;
  let lastLift = null;
  let lastFountain = null;
  let activeBaseUrl = '';

  async function discoverCatalog() {
    try {
      const res = await fetch('./shows/index.json', { cache: 'no-store' });
      if (!res.ok) return list();
      const idx = await res.json();
      if (Array.isArray(idx?.shows)) {
        for (const entry of idx.shows) {
          if (!entry?.id) continue;
          const prev = catalog.get(entry.id);
          catalog.set(entry.id, {
            id: entry.id,
            title: entry.title || prev?.title || entry.id,
            subtitle: entry.subtitle || prev?.subtitle || '',
            path: entry.path || `./shows/${entry.id}/show.json`,
            baseUrl: entry.baseUrl || `./shows/${entry.id}/`,
            data: prev?.data || null,
          });
        }
      }
    } catch {
      // file:// 或离线单文件模式下静默使用内嵌节目包
    }
    return list();
  }

  function list() {
    return [...catalog.values()].map(({ id, title, subtitle }) => ({ id, title, subtitle }));
  }

  function resetTrackCache() {
    lastCueIdx = -2;
    lastPrismsKey = '';
    lastLightsKey = '';
    lastHourglass = '';
    lastBridge = null;
    lastLift = null;
    lastFountain = null;
  }

  function applyEvaluation(evalRes, simT) {
    const { index, state } = evalRes;
    // 1. 舞台形状（吊盘圆环、延伸台、歌手升降、圆台喷泉）
    rig.setRingsTarget(state.stage.rings);
    const bridgeKey = JSON.stringify(state.stage.bridge);
    if (bridgeKey !== lastBridge) { lastBridge = bridgeKey; rig.setBridge(state.stage.bridge); }
    const liftKey = JSON.stringify(state.stage.lift);
    if (liftKey !== lastLift) { lastLift = liftKey; rig.setLift(state.stage.lift); }
    const fountainOn = Boolean(state.stage.fountain);
    if (fountainOn !== lastFountain) { lastFountain = fountainOn; rig.setFountain(fountainOn); }

    // 2. 舞台柱子（8 座三角屏塔位置与面朝向）
    const pKey = typeof state.prisms === 'string' ? state.prisms : JSON.stringify(state.prisms);
    if (pKey !== lastPrismsKey) {
      lastPrismsKey = pKey;
      rig.setPrisms(state.prisms);
    }

    // 3. 多处独立灯光（仅在灯光参数变化或过渡期间更新，避免稳态帧反复重写材质和缓冲）
    const lKey = JSON.stringify(state.lights);
    if (lKey !== lastLightsKey) {
      lastLightsKey = lKey;
      rig.setLights(state.lights);
    }
    if (state.lights.hourglass && state.lights.hourglass !== lastHourglass) {
      lastHourglass = state.lights.hourglass;
      rig.setHourglass(state.lights.hourglass);
    }

    // 4. 观众看到的展示内容（仅在 Cue 切换时重绑材质，每帧刷新动态画布）
    if (index !== lastCueIdx) {
      lastCueIdx = index;
      visuals.applySpecs(state.screens, activeBaseUrl);
      visuals.invalidate();
    }
    visuals.update(simT);
    return state;
  }

  async function load(idOrData, { autoPlay = true, baseUrl = '' } = {}) {
    let raw = null;
    let resolvedBase = baseUrl;
    if (typeof idOrData === 'string') {
      const entry = catalog.get(idOrData);
      if (!entry) throw new Error(`未找到舞美节目包：${idOrData}`);
      if (entry.path) {
        try {
          const res = await fetch(entry.path, { cache: 'no-store' });
          if (res.ok) raw = await res.json();
        } catch { /* fallback to embedded */ }
      }
      if (!raw) raw = entry.data;
      if (!raw) throw new Error(`无法加载舞美节目包：${idOrData}`);
      resolvedBase = entry.baseUrl || '';
    } else if (idOrData && typeof idOrData === 'object') {
      raw = idOrData;
      if (raw.id) {
        catalog.set(raw.id, { id: raw.id, title: raw.title || raw.id, subtitle: raw.subtitle || '外部导入', data: raw, baseUrl: resolvedBase });
      }
    }
    compiled = compileShow(raw);
    activeId = compiled.show.id;
    activeBaseUrl = resolvedBase;
    loop = compiled.show.loop !== false;
    time = 0;
    playing = autoPlay;
    resetTrackCache();
    fx.clear();
    if (compiled.show.night) rig.setNight(true);
    const initEval = evaluateShow(compiled, 0);
    applyEvaluation(initEval, 0);
    performer.snapTo(initEval.state.performer);
    emit();
    return state();
  }

  function play() {
    if (!compiled) return;
    if (time >= compiled.show.duration) time = 0;
    if (compiled.show.night) rig.setNight(true);
    playing = true;
    emit();
  }

  function pause() {
    playing = false;
    emit();
  }

  function seek(sec) {
    if (!compiled) return;
    time = Math.max(0, Math.min(compiled.show.duration, Number(sec) || 0));
    resetTrackCache();
    fx.clear();
    const evalRes = evaluateShow(compiled, time);
    applyEvaluation(evalRes, time);
    performer.snapTo(evalRes.state.performer);
    emit();
  }

  function stop() {
    compiled = null;
    activeId = null;
    playing = false;
    time = 0;
    resetTrackCache();
    visuals.restoreAll();
    fx.clear();
    performer.hide();
    rig.restoreManual();
    emit();
  }

  function setRate(r) {
    rate = Math.max(0.25, Math.min(4, Number(r) || 1));
    emit();
  }

  function setLoop(on) {
    loop = Boolean(on);
    emit();
  }

  function update(dt, simT) {
    if (!compiled) return;
    if (playing) {
      time += dt * rate;
      if (time >= compiled.show.duration) {
        if (loop) {
          time = time % compiled.show.duration;
          resetTrackCache();
        } else {
          time = compiled.show.duration;
          playing = false;
        }
      }
    }
    const evalRes = evaluateShow(compiled, time);
    const st = applyEvaluation(evalRes, simT);
    performer.update(playing ? dt : 0, simT, st.performer, evalRes.cueElapsed || 0);
    fx.update(playing ? dt : 0, st.fx);
    emit();
  }

  function state() {
    const evalRes = compiled ? evaluateShow(compiled, time) : null;
    return {
      active: Boolean(compiled),
      id: activeId,
      title: compiled?.show.title || '',
      subtitle: compiled?.show.subtitle || '',
      playing,
      time,
      timeLabel: formatTimecode(time),
      duration: compiled?.show.duration || 0,
      durationLabel: formatTimecode(compiled?.show.duration || 0),
      rate,
      loop,
      cueIndex: evalRes?.index ?? -1,
      cueLabel: evalRes?.cue?.label || '',
      cues: compiled ? compiled.show.cues.map((c, i) => ({ index: i, at: c.at, atLabel: formatTimecode(c.at), label: c.label })) : [],
      catalog: list(),
    };
  }

  let lastEmitT = -1;
  function emit(force = false) {
    if (!force && playing && Math.abs(time - lastEmitT) < 0.12) return;
    lastEmitT = time;
    onUpdate(state());
  }

  return {
    discoverCatalog, list, load, play, pause, seek, stop, setRate, setLoop, update, state,
  };
}
