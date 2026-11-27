import * as THREE from "three";
import { CSS3DRenderer, CSS3DObject } from "three/addons/renderers/CSS3DRenderer.js";
import { videoScreens } from "./venue.js";
const SCREEN_GROUPS = {
  all: "全部直播屏（不含屏塔）",
  imag: "主舞台两侧竖屏",
  side: "内场前角斜屏",
  delay: "草坪前角斜屏",
  lawn: "草坪前沿双面屏",
  cylinder: "控制塔横屏",
  tower: "屏塔大屏"
};
const FIT_MODES = { contain: "适配（留黑边）", cover: "铺满（裁切）", fill: "拉伸" };
const CAN_CAST = typeof window !== "undefined" && !!(navigator.mediaDevices?.getDisplayMedia && window.RestrictionTarget);
function parseVideoSource(raw) {
  const text = String(raw || "").trim();
  if (!text) return null;
  let url;
  try {
    url = new URL(/^[a-z]+:\/\//i.test(text) ? text : "https://" + text);
  } catch {
    return null;
  }
  const host = url.hostname.replace(/^www\.|^m\./, "");
  if (host.endsWith("bilibili.com")) {
    const bv = url.pathname.match(/\/video\/(BV[0-9A-Za-z]{10})/), av = url.pathname.match(/\/video\/av(\d+)/i);
    const page = Number(url.searchParams.get("p")) || 1;
    if (bv || av) {
      const id = bv ? `bvid=${bv[1]}` : `aid=${av[1]}`;
      return { kind: "embed", site: "B 站", src: `https://player.bilibili.com/player.html?${id}&p=${page}&autoplay=1&danmaku=0&high_quality=1&isOutside=true`, label: bv ? bv[1] : "av" + av[1] };
    }
  }
  if (host === "b23.tv") return { kind: "error", message: "b23.tv 短链接要先在浏览器里打开，复制跳转后的完整 bilibili.com/video/BV… 地址再粘贴" };
  if (host.endsWith("youtube.com") || host === "youtu.be") {
    const id = host === "youtu.be" ? url.pathname.slice(1) : url.searchParams.get("v") || (url.pathname.match(/\/(?:shorts|embed|live)\/([\w-]{6,})/) || [])[1];
    if (id) {
      const origin = typeof location !== "undefined" && /^https?:/.test(location.origin) ? `&origin=${encodeURIComponent(location.origin)}` : "";
      return { kind: "embed", site: "YouTube", src: `https://www.youtube.com/embed/${id}?autoplay=1&playsinline=1&rel=0&enablejsapi=1${origin}`, label: id };
    }
  }
  if (/\.(mp4|webm|m4v|mov|ogg|ogv)(\?|#|$)/i.test(url.pathname + url.search)) return { kind: "texture", src: url.href, label: decodeURIComponent(url.pathname.split("/").pop()) };
  return { kind: "embed", site: host, src: url.href, label: host };
}
function videoMaterial(tex, w, h) {
  const uniforms = { uScale: { value: new THREE.Vector2(1, 1) } };
  const mat = new THREE.MeshBasicMaterial({ map: tex, color: new THREE.Color(1.15, 1.15, 1.15) });
  mat.onBeforeCompile = (shader) => {
    shader.uniforms.uScale = uniforms.uScale;
    shader.fragmentShader = shader.fragmentShader.replace("#include <common>", "#include <common>\nuniform vec2 uScale;").replace("#include <map_fragment>", `
        vec2 vuv = (vMapUv - 0.5) * uScale + 0.5;
        if (vuv.x < 0.0 || vuv.x > 1.0 || vuv.y < 0.0 || vuv.y > 1.0) diffuseColor.rgb = vec3(0.0);
        else diffuseColor *= texture2D(map, vuv);`);
  };
  mat.customProgramCacheKey = () => "video-fit";
  mat.userData.fit = (videoAspect, mode) => {
    const sa = w / h, r = videoAspect / sa;
    if (mode === "fill") uniforms.uScale.value.set(1, 1);
    else if (mode === "cover") uniforms.uScale.value.set(r > 1 ? 1 / r : 1, r > 1 ? 1 : r);
    else uniforms.uScale.value.set(r > 1 ? 1 : 1 / r, r > 1 ? r : 1);
  };
  return mat;
}
function createVideoScreens({ camera, container, onStatus = () => {
}, onMode = () => {
} }) {
  const css = new CSS3DRenderer();
  css.domElement.className = "css3d";
  Object.assign(css.domElement.style, { position: "absolute", inset: "0", pointerEvents: "none" });
  container.prepend(css.domElement);
  const cssScene = new THREE.Scene();
  let video = null, texture = null, objectUrl = null, embeds = [], swapped = [], fit = "contain", target = "all", current = null;
  let stream = null, mode = "off";
  const status = (t) => onStatus(t);
  const setMode = (m) => {
    mode = m;
    onMode(m);
  };
  const screensOf = (g) => videoScreens.filter((s) => g === "all" ? s.group !== "tower" : s.group === g);
  function restoreScreens() {
    for (const { mesh, original } of swapped) mesh.material = original;
    swapped = [];
  }
  function dropTexture() {
    restoreScreens();
    if (video) {
      video.pause();
      video.srcObject = null;
      video.removeAttribute("src");
      video.load();
      video = null;
    }
    if (texture) {
      texture.dispose();
      texture = null;
    }
    if (stream) {
      for (const t of stream.getTracks()) t.stop();
      stream = null;
    }
  }
  function stop() {
    dropTexture();
    clearEmbeds();
    closeSource();
    if (objectUrl) {
      URL.revokeObjectURL(objectUrl);
      objectUrl = null;
    }
    current = null;
    setMode("off");
    status("屏幕恢复为原来的画面");
  }
  function attachTexture() {
    restoreScreens();
    for (const s of screensOf(target)) {
      const m = videoMaterial(texture, s.w, s.h);
      swapped.push({ mesh: s.mesh, original: s.mesh.material });
      s.mesh.material = m;
    }
    applyFit();
  }
  function applyFit() {
    if (!video || !video.videoWidth) return;
    const a = video.videoWidth / video.videoHeight;
    for (const { mesh } of swapped) mesh.material.userData.fit(a, fit);
  }
  function playTexture(src, label, { fromFile = false } = {}) {
    stop();
    const v = document.createElement("video");
    v.playsInline = true;
    v.loop = true;
    v.preload = "auto";
    if (!fromFile) v.crossOrigin = "anonymous";
    v.src = src;
    video = v;
    current = { kind: "texture", src, label };
    setMode("texture");
    texture = new THREE.VideoTexture(v);
    texture.colorSpace = THREE.SRGBColorSpace;
    attachTexture();
    v.addEventListener("loadedmetadata", () => {
      applyFit();
      status(`正在播放：${label}（${v.videoWidth}×${v.videoHeight}，${SCREEN_GROUPS[target]} ${swapped.length} 块）`);
    });
    v.addEventListener("error", () => {
      if (fromFile) {
        status("这个文件浏览器放不了（编码不支持），换成 H.264 的 MP4 或 WebM 试试");
        stop();
        return;
      }
      status("这个直链不允许跨域读取画面，改用内嵌播放器");
      const keep = target;
      stop();
      target = keep;
      playEmbed({ src, site: "视频直链", label });
    }, { once: true });
    v.play().catch(() => {
      v.muted = true;
      v.play().catch(() => status("浏览器拦住了自动播放，点一下“播放”"));
    });
    status(`正在加载：${label}`);
  }
  const MAX_EMBEDS = 9, EMBED_PAD = 76;
  const holeMat = new THREE.MeshBasicMaterial({ color: 0, opacity: 0, blending: THREE.NoBlending, fog: false, toneMapped: false });
  let interactive = false;
  function frameSrc(src, muted) {
    try {
      const u = new URL(src);
      if (u.hostname === "player.bilibili.com") u.searchParams.set("muted", muted ? "1" : "0");
      else if (/youtube\.com$/.test(u.hostname)) u.searchParams.set("mute", muted ? "1" : "0");
      return u.href;
    } catch {
      return src;
    }
  }
  function newSlot() {
    const frame = document.createElement("iframe");
    frame.src = frameSrc(current.src, embeds.length > 0);
    frame.allow = "autoplay; fullscreen; encrypted-media; picture-in-picture";
    frame.allowFullscreen = true;
    frame.referrerPolicy = "strict-origin-when-cross-origin";
    Object.assign(frame.style, { border: "0", background: "#000", pointerEvents: interactive ? "auto" : "none" });
    const obj = new CSS3DObject(frame);
    obj.visible = false;
    cssScene.add(obj);
    const slot = { frame, obj, screen: null, ppm: 1 };
    embeds.push(slot);
    return slot;
  }
  function bind(slot, s) {
    slot.screen = s;
    slot.original = s.mesh.material;
    s.mesh.material = holeMat;
    slot.ppm = Math.min(120, 1600 / s.w);
    slot.frame.style.width = Math.round(s.w * slot.ppm) + "px";
    slot.frame.style.height = Math.round(s.h * slot.ppm) + 2 * EMBED_PAD + "px";
  }
  function release(slot) {
    if (slot.screen) slot.screen.mesh.material = slot.original;
    slot.screen = null;
    slot.original = null;
    slot.obj.visible = false;
  }
  function clearEmbeds() {
    for (const e of embeds) {
      release(e);
      cssScene.remove(e.obj);
      e.obj.element.remove();
    }
    embeds = [];
  }
  const SRC_W = 640, SRC_H = 360, SRC_PAD = 76;
  let source = null;
  function openSource({ src, site, label }, { audioOnly = false } = {}) {
    const root = document.createElement("div");
    root.className = audioOnly ? "vidSource audioOnly" : "vidSource";
    root.innerHTML = '<div class="vsHead"><span class="vsTitle"></span><span class="vsTip">大屏同步播放的就是这个播放器</span></div><div class="vsBody"><div class="vsStage"><div class="vsView"><iframe></iframe></div></div></div>';
    root.querySelector(".vsTitle").textContent = `${site} · ${label}`;
    const body = root.querySelector(".vsBody"), stage = root.querySelector(".vsStage"), view = root.querySelector(".vsView"), frame = root.querySelector("iframe");
    Object.assign(stage.style, { width: SRC_W + "px", height: SRC_H + 2 * SRC_PAD + "px" });
    Object.assign(view.style, { top: SRC_PAD + "px", width: SRC_W + "px", height: SRC_H + "px" });
    Object.assign(frame.style, { top: -SRC_PAD + "px", width: SRC_W + "px", height: SRC_H + 2 * SRC_PAD + "px" });
    frame.src = frameSrc(src, false);
    frame.allow = "autoplay; fullscreen; encrypted-media; picture-in-picture";
    frame.allowFullscreen = true;
    frame.referrerPolicy = "strict-origin-when-cross-origin";
    container.prepend(root);
    source = { root, body, stage, view };
    setSourceFront(false);
  }
  function setSourceFront(on) {
    if (!source) return;
    const k = on ? 0.5 : 1;
    source.root.classList.toggle("front", on);
    Object.assign(source.body.style, { width: Math.round(SRC_W * k) + "px", height: Math.round((SRC_H + 2 * SRC_PAD) * k) + "px" });
    source.stage.style.zoom = String(k);
  }
  function closeSource() {
    if (source) {
      source.root.remove();
      source = null;
    }
  }
  async function startCast() {
    if (!source || stream) return;
    const { site, label } = current;
    status("浏览器在问要不要共享“此标签页”：点“共享”，所有大屏就会同步播放这一路视频");
    let s;
    try {
      s = await navigator.mediaDevices.getDisplayMedia({ video: { frameRate: { ideal: 30 }, width: { ideal: 960 }, height: { ideal: 540 } }, audio: false, preferCurrentTab: true, selfBrowserSurface: "include", surfaceSwitching: "exclude", monitorTypeSurfaces: "exclude" });
    } catch (e) {
      castFailed(e && e.name === "NotAllowedError" ? "没有共享，所以没放。" : `共享标签页失败（${e && e.message}）。`);
      return;
    }
    const track = s.getVideoTracks()[0];
    try {
      if (!source) throw new Error("closed");
      await track.restrictTo(await RestrictionTarget.fromElement(source.view));
    } catch (e) {
      for (const t of s.getTracks()) t.stop();
      if (source) castFailed("要共享的是“此标签页”（火星舞台本身），选别的标签页或窗口录不到播放器。");
      return;
    }
    stream = s;
    track.addEventListener("ended", () => {
      if (stream === s) {
        stop();
        status("已停止共享，视频停了；再点“播放”可以重新开始");
      }
    });
    clearEmbeds();
    const v = document.createElement("video");
    v.muted = true;
    v.playsInline = true;
    v.srcObject = s;
    video = v;
    texture = new THREE.VideoTexture(v);
    texture.colorSpace = THREE.SRGBColorSpace;
    attachTexture();
    v.addEventListener("loadedmetadata", applyFit);
    v.addEventListener("resize", applyFit);
    v.play().catch(() => {
    });
    setMode("cast");
    status(`${site}：${label} 只加载了一个播放器，同一路画面同步铺到${SCREEN_GROUPS[target]} ${swapped.length} 块屏。暂停、调音量点“操作播放器”`);
  }
  function castFailed(why) {
    closeSource();
    if (mode === "multi") {
      status(why + "还是每块屏单独加载");
      return;
    }
    setMode("ready");
    status(why + "B 站这类网页播放器，只有共享本标签页，才能让所有大屏同步播放同一路画面。再点“播放”，在弹窗里点“共享”；或者用本地视频、.mp4 直链（不用共享，所有屏自动同步）");
  }
  function playEmbed({ src, site, label }, { audioOnly = false } = {}) {
    stop();
    current = { kind: "embed", src, site, label };
    if (audioOnly) {
      openSource(current, { audioOnly: true });
      setMode("audioEmbed");
      status(`${site}：${label} 仅音频就绪（若未自动出声，点「操作播放器」点击播放）`);
      return;
    }
    if (!CAN_CAST) {
      setMode("ready");
      status("这个浏览器不能共享标签页（要电脑版 Chrome / Edge），B 站这类网页播放器没法让所有大屏同步播放同一路画面。可以用本地视频、.mp4 直链（所有屏自动同步）；或者点“每屏单独加载”（每块屏各开一个播放器，不同步、较卡）");
      return;
    }
    if (!navigator.userActivation?.isActive) {
      setMode("ready");
      status(`${site}：${label} 已就绪，点“播放”开始（浏览器会问要不要共享此标签页，点“共享”）`);
      return;
    }
    openSource(current);
    setMode("connecting");
    startCast();
  }
  function playMulti() {
    if (!current || current.kind !== "embed") return;
    const { site, label } = current;
    dropTexture();
    closeSource();
    setMode("multi");
    update();
    status(`${site}：${label} 每块屏单独加载一个播放器（朝向镜头的最多 ${MAX_EMBEDS} 块），各屏不同步、比较卡，只有离镜头最近的那块出声。点“只加载一路”换成同步播放（要共享此标签页）`);
  }
  function castFromMulti() {
    if (mode !== "multi" || !CAN_CAST) return;
    openSource(current);
    startCast();
  }
  const m4 = new THREE.Matrix4(), pos = new THREE.Vector3(), q = new THREE.Quaternion(), sc = new THREE.Vector3(), n = new THREE.Vector3(), toCam = new THREE.Vector3();
  const frustum = new THREE.Frustum(), sphere = new THREE.Sphere();
  function update() {
    if (mode !== "multi") return;
    camera.updateMatrixWorld();
    frustum.setFromProjectionMatrix(m4.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse));
    const facing = [];
    for (const s of screensOf(target)) {
      s.mesh.updateWorldMatrix(true, false);
      s.mesh.matrixWorld.decompose(pos, q, sc);
      n.set(0, 0, 1).applyQuaternion(q);
      toCam.copy(camera.position).sub(pos);
      if (toCam.dot(n) > 0) facing.push({ s, d: toCam.length() });
    }
    facing.sort((a, b) => a.d - b.d);
    const want = new Set(facing.slice(0, MAX_EMBEDS).map((f) => f.s));
    for (const e of embeds) if (e.screen && !want.has(e.screen)) release(e);
    for (const s of want) {
      if (embeds.some((e) => e.screen === s)) continue;
      const slot = embeds.find((e) => !e.screen) || (embeds.length < MAX_EMBEDS ? newSlot() : null);
      if (slot) bind(slot, s);
    }
    for (const e of embeds) {
      if (!e.screen) continue;
      const { mesh, w, h } = e.screen;
      mesh.matrixWorld.decompose(pos, q, sc);
      n.set(0, 0, 1).applyQuaternion(q);
      pos.addScaledVector(n, 0.01);
      sphere.set(pos, 0.6 * Math.hypot(w * sc.x, h * sc.y));
      e.obj.visible = frustum.intersectsSphere(sphere);
      e.obj.position.copy(pos);
      e.obj.quaternion.copy(q);
      e.obj.scale.set(sc.x / e.ppm, sc.y / e.ppm, 1);
    }
    css.render(cssScene, camera);
  }
  function setInteractive(on) {
    interactive = on;
    setSourceFront(on);
    css.domElement.classList.toggle("interact", on && mode === "multi");
    for (const e of embeds) e.frame.style.pointerEvents = on ? "auto" : "none";
    return on;
  }
  return {
    setSize: (w, h) => css.setSize(w, h),
    update,
    stop,
    setTarget(g) {
      target = g;
      if (!current) return;
      if (texture) {
        attachTexture();
        status(`换到${SCREEN_GROUPS[g] || "全部直播屏"}（${swapped.length} 块）`);
      } else if (mode === "multi") {
        update();
        status(`换到${SCREEN_GROUPS[g] || "全部直播屏"}（朝向镜头的 ${embeds.filter((e) => e.screen).length} 块在放）`);
      }
    },
    setFit(m) {
      fit = m;
      applyFit();
    },
    play,
    playFile,
    togglePause() {
      if (mode === "texture" && video) {
        if (video.paused) video.play();
        else video.pause();
        return !video.paused;
      }
      embedHint();
      return null;
    },
    toggleMute() {
      if (mode === "texture" && video) {
        video.muted = !video.muted;
        return video.muted;
      }
      embedHint();
      return null;
    },
    setInteractive,
    playMulti,
    castFromMulti,
    getVideoElement: () => mode === "texture" ? video : null,
    getEmbedIframe: () => source?.root?.querySelector("iframe") || embeds[0]?.frame || null,
    state: () => ({ target, fit, current, mode, interactive, canCast: CAN_CAST, embedded: embeds.length > 0, castScreens: stream ? swapped.length : 0, castSize: stream && video ? [video.videoWidth, video.videoHeight] : null, embedScreens: embeds.filter((e) => e.screen).map((e) => e.screen.name), playing: !!video && !video.paused, muted: !!video && video.muted })
  };
  function embedHint() {
    if (mode === "cast") status("点“操作播放器”，左下角会浮出那个播放器，在上面暂停、调音量");
    else if (mode === "multi") status("点“操作播放器”，再点屏上的播放器暂停、调音量");
  }
  function play(raw, opts = {}) {
    const src = parseVideoSource(raw);
    if (!src) {
      status("看不懂这个链接");
      return;
    }
    if (src.kind === "error") {
      status(src.message);
      return;
    }
    if (src.kind === "texture") playTexture(src.src, src.label);
    else playEmbed(src, opts);
  }
  function playFile(file) {
    if (!file) return;
    const url = URL.createObjectURL(file);
    playTexture(url, file.name, { fromFile: true });
    objectUrl = url;
    current = { kind: "texture", src: url, label: file.name, file };
  }
}
export {
  CAN_CAST,
  FIT_MODES,
  SCREEN_GROUPS,
  createVideoScreens,
  parseVideoSource
};
