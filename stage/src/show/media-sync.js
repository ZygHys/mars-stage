import { parseVideoSource } from "../video-screens.js";
import { createHybridClock } from "./schema.js";
import { loadShowPrefs, saveShowPrefs, resolveHandleFile } from "./local-store.js";
function isAudioFile(file) {
  if (!file) return false;
  if (file.type?.startsWith("audio/")) return true;
  return /\.(mp3|wav|m4a|aac|ogg|flac|opus)$/i.test(file.name || "");
}
function createMediaSync({ showEngine, videoCtl, onUpdate = () => {
} }) {
  const pll = createHybridClock();
  let mode = "off";
  let label = "";
  let offset = 0;
  let videoTarget = "all";
  let audioEl = null;
  let audioUrl = null;
  let boundVideoEl = null;
  let activeShowId = null;
  let savedHandle = null;
  let savedFileName = "";
  let savedUrl = "";
  let ytTime = 0;
  let ytPlaying = false;
  let ytMsgAt = 0;
  let ytPingTimer = null;
  let webDelayUntilMs = 0;
  let syncingFromShow = false;
  let switchingVideo = false;
  let showDefaultOffset = 0;
  function emit() {
    onUpdate({
      mode,
      active: mode !== "off",
      isEmbed: mode === "web" || mode === "youtube",
      label,
      offset,
      videoTarget,
      savedFileName,
      hasSavedHandle: Boolean(savedHandle),
      savedUrl
    });
  }
  function applyScreenOverride() {
    if (mode === "video" || mode === "youtube" || mode === "web") {
      if (videoTarget !== "none" && videoCtl.state().mode !== "off") {
        showEngine.setScreenOverride(videoTarget);
        return;
      }
    }
    showEngine.setScreenOverride(null);
  }
  function clearAudio() {
    if (audioEl) {
      audioEl.pause();
      audioEl.removeAttribute("src");
      audioEl.load();
      audioEl = null;
    }
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
      audioUrl = null;
    }
  }
  function stopYouTubePoll() {
    if (ytPingTimer) {
      clearInterval(ytPingTimer);
      ytPingTimer = null;
    }
  }
  function clear({ keepVideo = false } = {}) {
    clearAudio();
    stopYouTubePoll();
    boundVideoEl = null;
    if (!keepVideo && (mode === "video" || mode === "youtube" || mode === "web")) {
      videoCtl.stop();
    }
    mode = "off";
    label = "";
    ytTime = 0;
    ytPlaying = false;
    webDelayUntilMs = 0;
    showEngine.setExternalClock(false);
    showEngine.setScreenOverride(null);
    emit();
  }
  function bindMediaElement(el, nextMode, mediaLabel) {
    mode = nextMode;
    label = mediaLabel;
    pll.reset(Math.max(0, (el.currentTime || 0) + offset), performance.now());
    showEngine.setExternalClock(true);
    el.addEventListener("seeked", () => {
      if (mode !== nextMode) return;
      const t = Math.max(0, el.currentTime + offset);
      pll.reset(t, performance.now());
      showEngine.setExternalTime(t, !el.paused);
    });
    el.addEventListener("play", () => {
      if (mode !== nextMode) return;
      pll.reset(Math.max(0, el.currentTime + offset), performance.now());
      showEngine.play();
    });
    el.addEventListener("pause", () => {
      if (mode !== nextMode) return;
      showEngine.pause();
    });
    applyScreenOverride();
    emit();
  }
  async function persistPrefs(patch) {
    if (!activeShowId) return;
    await saveShowPrefs(activeShowId, patch);
  }
  async function attachFile(file, handle = null) {
    if (!file) return;
    clear();
    const st = showEngine.state();
    if (!st.active) {
      const first = showEngine.list()[0];
      if (first) await showEngine.load(first.id, { autoPlay: true });
    }
    if (handle) {
      savedHandle = handle;
      savedFileName = file.name;
    } else {
      savedFileName = file.name;
    }
    await persistPrefs({ offset, videoTarget, fileName: file.name, ...handle ? { fileHandle: handle } : {} });
    const audioOnly = isAudioFile(file) || videoTarget === "none";
    if (audioOnly) {
      audioUrl = URL.createObjectURL(file);
      audioEl = document.createElement(isAudioFile(file) ? "audio" : "video");
      audioEl.src = audioUrl;
      audioEl.preload = "auto";
      audioEl.loop = showEngine.state().loop;
      audioEl.playbackRate = showEngine.state().rate || 1;
      const targetMediaT = Math.max(0, showEngine.state().time - offset);
      audioEl.addEventListener("loadedmetadata", () => {
        if (targetMediaT > 0.1 && targetMediaT < (audioEl.duration || Infinity)) audioEl.currentTime = targetMediaT;
      }, { once: true });
      bindMediaElement(audioEl, "audio", file.name);
      audioEl.play().catch(() => {
      });
      return;
    }
    videoCtl.setTarget(videoTarget);
    switchingVideo = true;
    try {
      videoCtl.playFile(file);
    } finally {
      switchingVideo = false;
    }
    boundVideoEl = videoCtl.getVideoElement?.() || null;
    if (boundVideoEl) {
      boundVideoEl.loop = showEngine.state().loop;
      boundVideoEl.playbackRate = showEngine.state().rate || 1;
      const targetMediaT = Math.max(0, showEngine.state().time - offset);
      boundVideoEl.addEventListener("loadedmetadata", () => {
        if (targetMediaT > 0.1 && targetMediaT < (boundVideoEl.duration || Infinity)) boundVideoEl.currentTime = targetMediaT;
      }, { once: true });
      bindMediaElement(boundVideoEl, "video", file.name);
    }
  }
  async function attachUrl(rawUrl) {
    const parsed = parseVideoSource(rawUrl);
    if (!parsed || parsed.kind === "error") {
      throw new Error(parsed?.message || "链接格式无法识别");
    }
    clear();
    const st = showEngine.state();
    if (!st.active) {
      const first = showEngine.list()[0];
      if (first) await showEngine.load(first.id, { autoPlay: true });
    }
    savedUrl = String(rawUrl).trim();
    await persistPrefs({ offset, videoTarget, url: savedUrl });
    if (parsed.kind === "texture") {
      if (videoTarget === "none") {
        audioEl = document.createElement("video");
        audioEl.crossOrigin = "anonymous";
        audioEl.src = parsed.src;
        audioEl.preload = "auto";
        audioEl.loop = showEngine.state().loop;
        audioEl.playbackRate = showEngine.state().rate || 1;
        bindMediaElement(audioEl, "audio", parsed.label);
        audioEl.play().catch(() => {
        });
        return;
      }
      videoCtl.setTarget(videoTarget);
      switchingVideo = true;
      try {
        videoCtl.play(rawUrl);
      } finally {
        switchingVideo = false;
      }
      boundVideoEl = videoCtl.getVideoElement?.() || null;
      if (boundVideoEl) {
        boundVideoEl.loop = showEngine.state().loop;
        boundVideoEl.playbackRate = showEngine.state().rate || 1;
        bindMediaElement(boundVideoEl, "video", parsed.label);
      }
      return;
    }
    const audioOnly = videoTarget === "none";
    if (!audioOnly) videoCtl.setTarget(videoTarget);
    const isYT = parsed.site === "YouTube";
    mode = isYT ? "youtube" : "web";
    label = `${parsed.site} · ${parsed.label}`;
    showEngine.setExternalClock(false);
    startWebAligned(audioOnly);
    switchingVideo = true;
    try {
      videoCtl.play(rawUrl, { audioOnly });
    } finally {
      switchingVideo = false;
    }
    applyScreenOverride();
    if (isYT) {
      stopYouTubePoll();
      ytPingTimer = setInterval(() => {
        const frame = videoCtl.getEmbedIframe?.();
        if (!frame?.contentWindow) return;
        try {
          frame.contentWindow.postMessage(JSON.stringify({ event: "listening", id: 1, channel: "widget" }), "*");
        } catch {
        }
      }, 600);
    }
    emit();
  }
  function startWebAligned(shouldStartNow) {
    if (!shouldStartNow) {
      webDelayUntilMs = 0;
      showEngine.seek(Math.max(0, offset));
      showEngine.pause();
      return;
    }
    if (offset < -0.05) {
      webDelayUntilMs = performance.now() + Math.abs(offset) * 1e3;
      showEngine.seek(0);
      showEngine.pause();
    } else {
      webDelayUntilMs = 0;
      showEngine.seek(Math.max(0, offset));
      showEngine.play();
    }
  }
  function onVideoModeChange(vMode) {
    if (switchingVideo) return;
    if (mode !== "web" && mode !== "youtube") return;
    if (vMode === "cast") {
      applyScreenOverride();
      startWebAligned(true);
    } else if (vMode === "off") {
      clear({ keepVideo: true });
    }
  }
  function resyncStart() {
    const startT = Math.max(0, offset);
    const el = mode === "audio" ? audioEl : mode === "video" ? boundVideoEl : null;
    if (el) {
      el.currentTime = Math.max(0, -offset);
      pll.reset(startT, performance.now());
      showEngine.setExternalTime(startT, !el.paused);
    } else {
      startWebAligned(true);
    }
  }
  async function reconnectSavedHandle() {
    if (!savedHandle) return false;
    const file = await resolveHandleFile(savedHandle);
    if (!file) return false;
    await attachFile(file, savedHandle);
    return true;
  }
  function setOffset(val) {
    const next = Math.round((Number(val) || 0) * 100) / 100;
    offset = next;
    persistPrefs({ offset, defaultOffset: showDefaultOffset, offsetCustom: next !== showDefaultOffset });
    const el = mode === "audio" ? audioEl : mode === "video" ? boundVideoEl : null;
    if (el) {
      const t = Math.max(0, el.currentTime + offset);
      pll.reset(t, performance.now());
      showEngine.setExternalTime(t, !el.paused);
    } else if (mode === "youtube" && ytMsgAt > 0) {
      showEngine.seek(Math.max(0, ytTime + offset));
    }
    emit();
  }
  function nudgeOffset(delta) {
    setOffset(offset + delta);
    if (mode === "web") {
      const st = showEngine.state();
      if (st.active) showEngine.seek(Math.max(0, st.time + delta));
    }
  }
  function setVideoTarget(target) {
    videoTarget = target || "all";
    persistPrefs({ videoTarget });
    if (mode === "video" || mode === "youtube" || mode === "web") {
      if (videoTarget !== "none") videoCtl.setTarget(videoTarget);
      applyScreenOverride();
    }
    emit();
  }
  function onShowSeek(sec) {
    if (syncingFromShow) return;
    const el = mode === "audio" ? audioEl : mode === "video" ? boundVideoEl : null;
    if (!el) return;
    const target = Math.max(0, sec - offset);
    if (Number.isFinite(el.duration) && target < el.duration) {
      el.currentTime = target;
      pll.reset(sec, performance.now());
    }
  }
  function onShowPlayPause(playing) {
    const el = mode === "audio" ? audioEl : mode === "video" ? boundVideoEl : null;
    if (!el) return;
    if (playing && el.paused) el.play().catch(() => {
    });
    else if (!playing && !el.paused) el.pause();
  }
  function onShowRate(rate) {
    const el = mode === "audio" ? audioEl : mode === "video" ? boundVideoEl : null;
    if (el) el.playbackRate = rate;
  }
  function onShowLoop(loop) {
    const el = mode === "audio" ? audioEl : mode === "video" ? boundVideoEl : null;
    if (el) el.loop = Boolean(loop);
  }
  async function onShowChanged(showId, showMediaDefaults = null) {
    if (activeShowId === showId) return;
    activeShowId = showId || null;
    savedHandle = null;
    savedFileName = "";
    savedUrl = "";
    if (activeShowId) {
      const prefs = await loadShowPrefs(activeShowId);
      showDefaultOffset = Number(showMediaDefaults?.offset) || 0;
      const useSavedOffset = typeof prefs?.offset === "number" && prefs?.offsetCustom === true && prefs?.defaultOffset === showDefaultOffset;
      offset = useSavedOffset ? prefs.offset : showDefaultOffset;
      videoTarget = prefs?.videoTarget || showMediaDefaults?.videoTarget || "all";
      savedHandle = prefs?.fileHandle || null;
      savedFileName = prefs?.fileName || "";
      savedUrl = prefs?.url || showMediaDefaults?.suggestedUrl || "";
    }
    emit();
  }
  if (typeof window !== "undefined") {
    window.addEventListener("message", (e) => {
      if (mode !== "youtube") return;
      if (!String(e.origin || "").includes("youtube.com")) return;
      try {
        const data = typeof e.data === "string" ? JSON.parse(e.data) : e.data;
        if (data?.event === "infoDelivery" && data.info) {
          if (typeof data.info.currentTime === "number") {
            ytTime = data.info.currentTime;
            ytMsgAt = performance.now();
          }
          if (typeof data.info.playerState === "number") {
            ytPlaying = data.info.playerState === 1;
          }
        }
      } catch {
      }
    });
  }
  function update(nowMs = performance.now()) {
    applyScreenOverride();
    if (webDelayUntilMs > 0) {
      if (nowMs >= webDelayUntilMs) {
        webDelayUntilMs = 0;
        showEngine.seek(0);
        showEngine.play();
        emit();
      }
      return;
    }
    if (mode === "audio" && audioEl) {
      const playing = !audioEl.paused && !audioEl.ended;
      const t = pll.sample(Math.max(0, audioEl.currentTime + offset), nowMs, { rate: audioEl.playbackRate || 1, playing });
      syncingFromShow = true;
      showEngine.setExternalTime(t, playing);
      syncingFromShow = false;
      return;
    }
    if (mode === "video") {
      const v = videoCtl.getVideoElement?.() || boundVideoEl;
      if (!v || videoCtl.state().mode === "off") {
        clear({ keepVideo: true });
        return;
      }
      const playing = !v.paused && !v.ended;
      const t = pll.sample(Math.max(0, v.currentTime + offset), nowMs, { rate: v.playbackRate || 1, playing });
      syncingFromShow = true;
      showEngine.setExternalTime(t, playing);
      syncingFromShow = false;
      return;
    }
    if (mode === "youtube" && ytMsgAt > 0 && ytPlaying) {
      const est = ytTime + (nowMs - ytMsgAt) / 1e3 + offset;
      const t = pll.sample(Math.max(0, est), nowMs, { rate: 1, playing: true });
      const cur = showEngine.state().time;
      if (Math.abs(t - cur) > 0.12) {
        syncingFromShow = true;
        showEngine.seek(t);
        syncingFromShow = false;
      }
    }
  }
  return {
    attachFile,
    attachUrl,
    reconnectSavedHandle,
    clear,
    setOffset,
    nudgeOffset,
    setVideoTarget,
    onVideoModeChange,
    resyncStart,
    onShowSeek,
    onShowPlayPause,
    onShowRate,
    onShowLoop,
    onShowChanged,
    update,
    state: () => ({ mode, active: mode !== "off", isEmbed: mode === "web" || mode === "youtube", label, offset, videoTarget, savedFileName, hasSavedHandle: Boolean(savedHandle), savedUrl })
  };
}
export {
  createHybridClock,
  createMediaSync
};
