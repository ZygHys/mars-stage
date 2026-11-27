const DB_NAME = "mars-stage-local-v1";
const STORE_NAME = "show-media-prefs";
function openDB() {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") {
      resolve(null);
      return;
    }
    try {
      const req = indexedDB.open(DB_NAME, 1);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) db.createObjectStore(STORE_NAME);
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}
async function loadShowPrefs(showId) {
  if (!showId) return null;
  const db = await openDB();
  if (!db) return null;
  return new Promise((resolve) => {
    try {
      const tx = db.transaction(STORE_NAME, "readonly");
      const req = tx.objectStore(STORE_NAME).get(showId);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}
async function saveShowPrefs(showId, patch) {
  if (!showId) return false;
  const db = await openDB();
  if (!db) return false;
  const prev = await loadShowPrefs(showId) || {};
  const next = { ...prev, ...patch, updatedAt: Date.now() };
  return new Promise((resolve) => {
    try {
      const tx = db.transaction(STORE_NAME, "readwrite");
      tx.objectStore(STORE_NAME).put(next, showId);
      tx.oncomplete = () => resolve(true);
      tx.onerror = () => resolve(false);
    } catch {
      resolve(false);
    }
  });
}
async function clearShowPrefs(showId) {
  if (!showId) return false;
  const db = await openDB();
  if (!db) return false;
  return new Promise((resolve) => {
    try {
      const tx = db.transaction(STORE_NAME, "readwrite");
      tx.objectStore(STORE_NAME).delete(showId);
      tx.oncomplete = () => resolve(true);
      tx.onerror = () => resolve(false);
    } catch {
      resolve(false);
    }
  });
}
async function pickLocalMediaHandle() {
  if (typeof window === "undefined" || typeof window.showOpenFilePicker !== "function") return null;
  try {
    const [handle] = await window.showOpenFilePicker({
      multiple: false,
      types: [{
        description: "音视频文件",
        accept: {
          "video/*": [".mp4", ".mov", ".webm", ".m4v", ".mkv"],
          "audio/*": [".mp3", ".wav", ".m4a", ".aac", ".ogg", ".flac"]
        }
      }]
    });
    if (!handle) return { cancelled: true };
    const file = await handle.getFile();
    return { file, handle, cancelled: false };
  } catch (e) {
    if (e?.name === "AbortError") return { cancelled: true };
    return null;
  }
}
async function resolveHandleFile(handle) {
  if (!handle || typeof handle.getFile !== "function") return null;
  try {
    if (typeof handle.queryPermission === "function") {
      let perm = await handle.queryPermission({ mode: "read" });
      if (perm !== "granted" && typeof handle.requestPermission === "function") {
        perm = await handle.requestPermission({ mode: "read" });
      }
      if (perm !== "granted") return null;
    }
    return await handle.getFile();
  } catch {
    return null;
  }
}
export {
  clearShowPrefs,
  loadShowPrefs,
  pickLocalMediaHandle,
  resolveHandleFile,
  saveShowPrefs
};
