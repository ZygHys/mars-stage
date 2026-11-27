import { compileShow, evaluateShow, formatTimecode } from "./schema.js";
import { createScreenVisuals } from "./visuals.js";
import { createShowFX } from "./fx.js";
import { createPerformerSystem } from "./performer.js";
function createShowEngine({ scene, rig, embeddedShows = [], onUpdate = () => {
} }) {
  const visuals = createScreenVisuals();
  const fx = createShowFX(scene);
  const performer = createPerformerSystem({
    scene,
    surfaceAt: (x, z, inCage) => rig.performerSurfaceAt(x, z, inCage)
  });
  const catalog =  new Map();
  for (const item of embeddedShows) {
    if (item?.id) catalog.set(item.id, { id: item.id, title: item.title, subtitle: item.subtitle || "", evidenceUrl: item.evidenceUrl || "", data: item, baseUrl: "" });
  }
  let compiled = null;
  let activeId = null;
  let playing = false;
  let time = 0;
  let rate = 1;
  let loop = true;
  let externalClock = false;
  let screenOverride = null;
  let lastSteadyKey = "";
  let lastCueIdx = -2;
  let lastScreensKey = "";
  let lastPrismsKey = "";
  let lastLightsKey = "";
  let lastHourglass = "";
  let lastBridge = null;
  let lastLift = null;
  let lastFountain = null;
  let activeBaseUrl = "";
  async function discoverCatalog() {
    try {
      const res = await fetch("./shows/index.json", { cache: "no-cache" });
      if (!res.ok) return list();
      const idx = await res.json();
      if (Array.isArray(idx?.shows)) {
        for (const entry of idx.shows) {
          if (!entry?.id) continue;
          const prev = catalog.get(entry.id);
          catalog.set(entry.id, {
            id: entry.id,
            title: entry.title || prev?.title || entry.id,
            subtitle: entry.subtitle || prev?.subtitle || "",
            evidenceUrl: entry.evidenceUrl || prev?.evidenceUrl || "",
            path: entry.path || `./shows/${entry.id}/show.json`,
            baseUrl: entry.baseUrl || `./shows/${entry.id}/`,
            data: prev?.data || null
          });
        }
      }
    } catch {
    }
    return list();
  }
  function list() {
    return [...catalog.values()].map(({ id, title, subtitle }) => ({ id, title, subtitle }));
  }
  function resetTrackCache() {
    lastSteadyKey = "";
    lastCueIdx = -2;
    lastScreensKey = "";
    lastPrismsKey = "";
    lastLightsKey = "";
    lastHourglass = "";
    lastBridge = null;
    lastLift = null;
    lastFountain = null;
  }
  function applyEvaluation(evalRes, simT) {
    const { index, state: state2, beatStepIdx, blend } = evalRes;
    const steadyKey = blend >= 1 ? `${index}:${beatStepIdx}:${screenOverride || ""}` : "";
    if (steadyKey && steadyKey === lastSteadyKey) {
      visuals.update(simT);
      return state2;
    }
    lastSteadyKey = steadyKey;
    rig.setRingsTarget(state2.stage.rings);
    const bridgeKey = typeof state2.stage.bridge === "object" ? JSON.stringify(state2.stage.bridge) : String(state2.stage.bridge);
    if (bridgeKey !== lastBridge) {
      lastBridge = bridgeKey;
      rig.setBridge(state2.stage.bridge);
    }
    const liftKey = typeof state2.stage.lift === "object" ? JSON.stringify(state2.stage.lift) : String(state2.stage.lift);
    if (liftKey !== lastLift) {
      lastLift = liftKey;
      rig.setLift(state2.stage.lift);
    }
    const fountainOn = Boolean(state2.stage.fountain);
    if (fountainOn !== lastFountain) {
      lastFountain = fountainOn;
      rig.setFountain(fountainOn);
    }
    const pKey = typeof state2.prisms === "string" ? state2.prisms : JSON.stringify(state2.prisms);
    if (pKey !== lastPrismsKey) {
      lastPrismsKey = pKey;
      rig.setPrisms(state2.prisms);
    }
    if (blend < 1) {
      rig.setLights(state2.lights);
      lastLightsKey = "";
    } else {
      const lKey = `${index}:${beatStepIdx}`;
      if (lKey !== lastLightsKey) {
        lastLightsKey = lKey;
        rig.setLights(state2.lights);
      }
    }
    if (state2.lights.hourglass && state2.lights.hourglass !== lastHourglass) {
      lastHourglass = state2.lights.hourglass;
      rig.setHourglass(state2.lights.hourglass);
    }
    const sKey = `${index}:${beatStepIdx}:${screenOverride || ""}`;
    if (index !== lastCueIdx || sKey !== lastScreensKey) {
      lastCueIdx = index;
      lastScreensKey = sKey;
      visuals.applySpecs(state2.screens, activeBaseUrl);
    }
    visuals.update(simT);
    return state2;
  }
  async function load(idOrData, { autoPlay = true, baseUrl = "" } = {}) {
    let raw = null;
    let resolvedBase = baseUrl;
    if (typeof idOrData === "string") {
      const entry = catalog.get(idOrData);
      if (!entry) throw new Error(`未找到舞美节目包：${idOrData}`);
      if (entry.path) {
        try {
          const cacheMode = /[?&]v=/.test(entry.path) ? "force-cache" : "no-cache";
          const res = await fetch(entry.path, { cache: cacheMode });
          if (res.ok) raw = await res.json();
        } catch {
        }
      }
      if (!raw) raw = entry.data;
      if (!raw) throw new Error(`无法加载舞美节目包：${idOrData}`);
      resolvedBase = entry.baseUrl || "";
    } else if (idOrData && typeof idOrData === "object") {
      raw = idOrData;
      if (raw.id) {
        catalog.set(raw.id, { id: raw.id, title: raw.title || raw.id, subtitle: raw.subtitle || "外部导入", data: raw, baseUrl: resolvedBase });
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
    emit(true);
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
  function setExternalClock(on) {
    externalClock = Boolean(on);
  }
  function setExternalTime(sec, isPlaying = true) {
    if (!compiled) return;
    const dur = compiled.show.duration || 1;
    const clamped = loop && sec >= dur ? sec % dur : Math.max(0, Math.min(dur, Number(sec) || 0));
    const jumped = Math.abs(clamped - time) > 0.35;
    time = clamped;
    playing = Boolean(isPlaying);
    if (jumped) {
      resetTrackCache();
      fx.clear();
      const evalRes = evaluateShow(compiled, time);
      applyEvaluation(evalRes, time);
      performer.snapTo(evalRes.state.performer);
    }
  }
  function setScreenOverride(groupOrNull) {
    const next = groupOrNull || null;
    if (next === screenOverride) return;
    screenOverride = next;
    visuals.setExternalOverride(next);
    if (compiled) {
      lastSteadyKey = "";
      lastScreensKey = "";
      const evalRes = evaluateShow(compiled, time);
      applyEvaluation(evalRes, time);
    }
  }
  function update(dt, simT) {
    if (!compiled) return;
    if (playing && !externalClock) {
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
    const animT = compiled ? time : simT;
    const st = applyEvaluation(evalRes, animT);
    performer.update(playing ? dt : 0, animT, st.performer, evalRes.cueElapsed || 0);
    fx.update(playing ? dt : 0, st.fx);
    emit();
  }
  function state() {
    const evalRes = compiled ? evaluateShow(compiled, time) : null;
    return {
      active: Boolean(compiled),
      id: activeId,
      title: compiled?.show.title || "",
      subtitle: compiled?.show.subtitle || "",
      evidenceUrl: compiled?.show.evidenceUrl || catalog.get(activeId)?.evidenceUrl || "",
      media: compiled?.show.media || null,
      playing,
      time,
      timeLabel: formatTimecode(time),
      duration: compiled?.show.duration || 0,
      durationLabel: formatTimecode(compiled?.show.duration || 0),
      rate,
      loop,
      cueIndex: evalRes?.index ?? -1,
      cueLabel: evalRes?.cue?.label || "",
      cues: compiled ? compiled.show.cues.map((c, i) => ({ index: i, at: c.at, atLabel: formatTimecode(c.at), label: c.label })) : [],
      catalog: list()
    };
  }
  let lastEmitT = -1;
  function emit(force = false) {
    if (!force && playing && Math.abs(time - lastEmitT) < 0.12) return;
    lastEmitT = time;
    onUpdate(state());
  }
  return {
    discoverCatalog,
    list,
    load,
    play,
    pause,
    seek,
    stop,
    setRate,
    setLoop,
    setExternalClock,
    setExternalTime,
    setScreenOverride,
    update,
    state,
    isActive: () => Boolean(compiled),
    getTime: () => time
  };
}
export {
  createShowEngine
};
