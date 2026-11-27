import * as THREE from "three";
import { buildMeiqiuAvatar } from "../meiqiu.js";
const PERFORMER_ZONES = {
  mainSteps: [0, -52.2],
  mainCenter: [0, -44.5],
  mainFront: [0, -39.6],
  mainLeft: [-18, -43.5],
  mainRight: [18, -43.5],
  catwalk: [0, -22.5],
  circleCenter: [0, 0],
  circleFront: [0, 7.6],
  circleLeft: [-7.2, 1.5],
  circleRight: [7.2, 1.5],
  bridgeLeft: [-24.5, -2.5],
  bridgeRight: [24.5, -2.5],
  cage: [0, 0]
};
const PERFORMER_OUTFITS = {
  redFeather: {
    label: "红发白羽黑金战袍（1115不奉陪）",
    coat: "#181a24",
    coatDark: "#0f1017",
    inner: "#10121a",
    pants: "#14161e",
    accent: "#e8d08e",
    accent2: "#dce6f8",
    trim: "#b82434",
    hair: "#e6182c",
    hairDark: "#9e0e1e",
    hairHi: "#ff4858",
    style: "royalShort",
    longCoat: false,
    whiteFeather: true,
    beltChain: true,
    collar: true
  },
  redCoat: {
    label: "火星红长风衣",
    coat: "#c81e2c",
    coatDark: "#8c121d",
    inner: "#171820",
    pants: "#15161c",
    accent: "#f0d898",
    accent2: "#e4e8f2",
    trim: "#ff4252",
    hair: "#1c1b22",
    hairDark: "#101016",
    hairHi: "#343342",
    style: "doubleBreasted",
    longCoat: true,
    epaulettes: true,
    collar: true
  },
  whiteSuit: {
    label: "纯白先锋套装",
    coat: "#eef1f7",
    coatDark: "#cfd6e4",
    inner: "#dfe4ee",
    pants: "#e8ecf4",
    accent: "#8cb8ff",
    accent2: "#b8c4da",
    trim: "#ffffff",
    hair: "#22212a",
    hairDark: "#131218",
    hairHi: "#3e3d4c",
    style: "asymmetric",
    longCoat: true,
    capeSash: true,
    collar: true
  },
  blackRock: {
    label: "暗黑摇滚皮衣",
    coat: "#1b1d24",
    coatDark: "#101218",
    inner: "#14151c",
    pants: "#13141a",
    accent: "#d8e2f0",
    accent2: "#e62838",
    trim: "#c8d2e2",
    hair: "#1a1920",
    hairDark: "#0e0d12",
    hairHi: "#363444",
    style: "biker",
    longCoat: false,
    studs: true,
    beltChain: true,
    collar: true
  },
  goldRoyal: {
    label: "黑金华丽战袍",
    coat: "#1a1820",
    coatDark: "#100e16",
    inner: "#131118",
    pants: "#15141b",
    accent: "#f4c842",
    accent2: "#ffe898",
    trim: "#d6a428",
    hair: "#1c1a22",
    hairDark: "#100e14",
    hairHi: "#363242",
    style: "militaryGold",
    longCoat: true,
    epaulettes: true,
    collar: true
  },
  meiqiuKing: { label: "皇冠小黑煤球儿主唱", meiqiu: true }
};
function makePixelTexture(w, h, drawFn) {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const g = c.getContext("2d");
  g.imageSmoothingEnabled = false;
  drawFn(g, w, h);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.magFilter = THREE.NearestFilter;
  tex.minFilter = THREE.NearestFilter;
  tex.generateMipmaps = false;
  return tex;
}
function makePixelFaceTextures(cfg) {
  const mk = (mouthKind) => makePixelTexture(16, 16, (g) => {
    g.fillStyle = "#f2d4bc";
    g.fillRect(0, 0, 16, 16);
    g.fillStyle = "#e2be9e";
    g.fillRect(0, 0, 2, 16);
    g.fillRect(14, 0, 2, 16);
    g.fillRect(0, 14, 16, 2);
    g.fillStyle = "#d4aa88";
    g.fillRect(2, 0, 12, 2);
    g.fillStyle = cfg.hairDark;
    g.fillRect(1, 0, 3, 3);
    g.fillRect(5, 0, 2, 2);
    g.fillRect(10, 0, 3, 3);
    g.fillStyle = cfg.hair;
    g.fillRect(2, 0, 2, 2);
    g.fillRect(11, 0, 2, 2);
    if (mouthKind === "rock") {
      g.fillStyle = "#1b1922";
      g.fillRect(4, 7, 2, 1);
      g.fillRect(5, 8, 2, 1);
      g.fillRect(4, 9, 2, 1);
      g.fillRect(10, 7, 2, 1);
      g.fillRect(9, 8, 2, 1);
      g.fillRect(10, 9, 2, 1);
    } else {
      g.fillStyle = "#1b1922";
      g.fillRect(4, 7, 2, 2);
      g.fillRect(10, 7, 2, 2);
      g.fillStyle = "#ffffff";
      g.fillRect(4, 7, 1, 1);
      g.fillRect(10, 7, 1, 1);
    }
    g.fillStyle = "#ef9a8e";
    g.fillRect(3, 10, 2, 1);
    g.fillRect(11, 10, 2, 1);
    if (mouthKind === "sing") {
      g.fillStyle = "#8e3838";
      g.fillRect(7, 11, 2, 2);
    } else if (mouthKind === "rock") {
      g.fillStyle = "#7e282e";
      g.fillRect(6, 11, 4, 2);
      g.fillStyle = "#f8f0ec";
      g.fillRect(7, 11, 2, 1);
    } else {
      g.fillStyle = "#9c5a4c";
      g.fillRect(7, 12, 2, 1);
    }
  });
  return { stand: mk("stand"), sing: mk("sing"), rock: mk("rock") };
}
function makePixelTorsoTexture(cfg) {
  return makePixelTexture(16, 20, (g) => {
    g.fillStyle = cfg.coat;
    g.fillRect(0, 0, 16, 20);
    g.fillStyle = cfg.coatDark;
    g.fillRect(0, 0, 2, 20);
    g.fillRect(14, 0, 2, 20);
    g.fillStyle = cfg.inner;
    g.fillRect(6, 0, 4, 15);
    g.fillRect(5, 1, 6, 4);
    if (cfg.style === "royalShort") {
      g.fillStyle = cfg.accent;
      for (let i = 0; i < 8; i++) {
        g.fillRect(3 + i, 2 + i, 2, 1);
        g.fillRect(11 - i, 2 + i, 2, 1);
      }
      g.fillStyle = cfg.accent2;
      g.fillRect(4, 3, 1, 1);
      g.fillRect(11, 3, 1, 1);
      g.fillRect(5, 7, 1, 1);
      g.fillRect(10, 7, 1, 1);
      g.fillStyle = cfg.trim;
      g.fillRect(5, 0, 1, 5);
      g.fillRect(10, 0, 1, 5);
    } else if (cfg.style === "doubleBreasted") {
      g.fillStyle = cfg.coatDark;
      g.fillRect(4, 1, 2, 6);
      g.fillRect(10, 1, 2, 6);
      g.fillStyle = cfg.accent;
      for (const y of [6, 9, 12]) {
        g.fillRect(5, y, 1, 1);
        g.fillRect(10, y, 1, 1);
      }
      g.fillStyle = cfg.accent2;
      g.fillRect(7, 2, 2, 3);
    } else if (cfg.style === "asymmetric") {
      g.fillStyle = cfg.coatDark;
      for (let i = 0; i < 12; i++) g.fillRect(Math.min(13, 4 + Math.floor(i * 0.65)), 2 + i, 1, 1);
      g.fillStyle = cfg.accent;
      g.fillRect(4, 4, 2, 2);
      g.fillStyle = cfg.accent2;
      g.fillRect(2, 15, 12, 1);
    } else if (cfg.style === "biker") {
      g.fillStyle = cfg.accent2;
      g.fillRect(7, 1, 2, 13);
      g.fillStyle = cfg.accent;
      for (let i = 0; i < 11; i++) g.fillRect(9 - Math.floor(i * 0.4), 2 + i, 1, 1);
      g.fillRect(3, 3, 1, 1);
      g.fillRect(12, 3, 1, 1);
      g.fillRect(3, 11, 2, 1);
      g.fillRect(11, 11, 2, 1);
    } else if (cfg.style === "militaryGold") {
      g.fillStyle = cfg.accent;
      for (const y of [3, 6, 9, 12]) {
        g.fillRect(4, y, 8, 1);
        g.fillRect(5, y - 1, 1, 1);
        g.fillRect(10, y - 1, 1, 1);
      }
    }
    g.fillStyle = "#0c0d12";
    g.fillRect(0, 16, 16, 3);
    g.fillStyle = cfg.accent;
    g.fillRect(6, 16, 4, 3);
    g.fillStyle = "#181a24";
    g.fillRect(7, 17, 2, 1);
  });
}
function makePixelBackTexture(cfg) {
  return makePixelTexture(16, 20, (g) => {
    g.fillStyle = cfg.coat;
    g.fillRect(0, 0, 16, 20);
    g.fillStyle = cfg.coatDark;
    g.fillRect(0, 0, 2, 20);
    g.fillRect(14, 0, 2, 20);
    g.fillRect(2, 4, 12, 1);
    g.fillStyle = cfg.accent;
    g.fillRect(7, 6, 2, 1);
    g.fillRect(6, 7, 4, 2);
    g.fillRect(7, 9, 2, 2);
    g.fillStyle = "#0c0d12";
    g.fillRect(0, 16, 16, 3);
    g.fillStyle = cfg.accent;
    g.fillRect(3, 17, 10, 1);
  });
}
function makeSpotConeTex() {
  const c = document.createElement("canvas");
  c.width = 64;
  c.height = 128;
  const g = c.getContext("2d");
  const gr = g.createLinearGradient(0, 0, 0, 128);
  gr.addColorStop(0, "rgba(255,255,255,0.0)");
  gr.addColorStop(0.2, "rgba(255,255,255,0.22)");
  gr.addColorStop(0.85, "rgba(255,255,255,0.12)");
  gr.addColorStop(1, "rgba(255,255,255,0.0)");
  g.fillStyle = gr;
  g.fillRect(0, 0, 64, 128);
  return new THREE.CanvasTexture(c);
}
function makeSpotPoolTex() {
  const c = document.createElement("canvas");
  c.width = c.height = 128;
  const g = c.getContext("2d");
  const gr = g.createRadialGradient(64, 64, 4, 64, 64, 62);
  gr.addColorStop(0, "rgba(255,255,255,0.75)");
  gr.addColorStop(0.45, "rgba(255,255,255,0.25)");
  gr.addColorStop(1, "rgba(255,255,255,0)");
  g.fillStyle = gr;
  g.fillRect(0, 0, 128, 128);
  return new THREE.CanvasTexture(c);
}
function vox(w, h, d, mat, x = 0, y = 0, z = 0) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  m.position.set(x, y, z);
  m.castShadow = true;
  return m;
}
function buildPixelPerformer(outfitKey) {
  const cfg = PERFORMER_OUTFITS[outfitKey] || PERFORMER_OUTFITS.redFeather;
  const root = new THREE.Group();
  const coatMat = new THREE.MeshStandardMaterial({ color: cfg.coat, roughness: 0.62, metalness: 0.14 });
  const coatDarkMat = new THREE.MeshStandardMaterial({ color: cfg.coatDark, roughness: 0.72, metalness: 0.12 });
  const pantsMat = new THREE.MeshStandardMaterial({ color: cfg.pants, roughness: 0.78, metalness: 0.06 });
  const accentMat = new THREE.MeshStandardMaterial({ color: cfg.accent, roughness: 0.34, metalness: 0.62, emissive: new THREE.Color(cfg.accent), emissiveIntensity: 0.18 });
  const accent2Mat = new THREE.MeshStandardMaterial({ color: cfg.accent2, roughness: 0.32, metalness: 0.68, emissive: new THREE.Color(cfg.accent2), emissiveIntensity: 0.14 });
  const skinMat = new THREE.MeshStandardMaterial({ color: 15914172, roughness: 0.65 });
  const skinShadeMat = new THREE.MeshStandardMaterial({ color: 14662042, roughness: 0.68 });
  const hairMat = new THREE.MeshStandardMaterial({ color: cfg.hair, roughness: 0.56, emissive: new THREE.Color(cfg.hair), emissiveIntensity: cfg.hair === "#e6182c" ? 0.22 : 0.04 });
  const hairDarkMat = new THREE.MeshStandardMaterial({ color: cfg.hairDark, roughness: 0.65 });
  const hairHiMat = new THREE.MeshStandardMaterial({ color: cfg.hairHi, roughness: 0.48, emissive: new THREE.Color(cfg.hairHi), emissiveIntensity: cfg.hair === "#e6182c" ? 0.24 : 0.04 });
  const bootMat = new THREE.MeshStandardMaterial({ color: 1052950, roughness: 0.45, metalness: 0.25 });
  const torsoFrontTex = makePixelTorsoTexture(cfg);
  const torsoBackTex = makePixelBackTexture(cfg);
  const torsoMats = [
    coatDarkMat,
    coatDarkMat,
    coatMat,
    coatDarkMat,
    new THREE.MeshStandardMaterial({ map: torsoFrontTex, roughness: 0.55, metalness: 0.18 }),
    new THREE.MeshStandardMaterial({ map: torsoBackTex, roughness: 0.58, metalness: 0.15 })
  ];
  const body = new THREE.Group();
  body.position.set(0, 0.86, 0);
  root.add(body);
  const torso = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.58, 0.25), torsoMats);
  torso.position.set(0, 0.3, 0);
  torso.castShadow = true;
  body.add(torso);
  if (cfg.collar) {
    body.add(vox(0.26, 0.09, 0.05, coatDarkMat, 0, 0.62, -0.09));
    body.add(vox(0.05, 0.09, 0.19, coatMat, -0.12, 0.62, -0.01));
    body.add(vox(0.05, 0.09, 0.19, coatMat, 0.12, 0.62, -0.01));
    body.add(vox(0.24, 0.025, 0.03, accentMat, 0, 0.66, -0.09));
  }
  if (cfg.epaulettes) {
    for (const s of [-1, 1]) {
      body.add(vox(0.16, 0.045, 0.24, accentMat, s * 0.24, 0.59, 0));
      for (let k = -2; k <= 2; k++) {
        body.add(vox(0.025, 0.075, 0.025, accent2Mat, s * 0.31, 0.54, k * 0.045));
      }
    }
  }
  if (cfg.studs) {
    for (const s of [-1, 1]) {
      body.add(vox(0.14, 0.04, 0.22, coatDarkMat, s * 0.23, 0.58, 0));
      for (const z of [-0.07, 0, 0.07]) body.add(vox(0.03, 0.03, 0.03, accentMat, s * 0.27, 0.61, z));
    }
  }
  if (cfg.capeSash) {
    body.add(vox(0.16, 0.52, 0.04, accent2Mat, -0.17, 0.24, 0.14));
    body.add(vox(0.18, 0.38, 0.04, coatMat, -0.22, 0.34, -0.14));
  }
  if (cfg.beltChain) {
    body.add(vox(0.03, 0.12, 0.03, accent2Mat, 0.18, 0.02, 0.13));
    body.add(vox(0.08, 0.03, 0.03, accentMat, 0.14, -0.03, 0.13));
    body.add(vox(0.03, 0.1, 0.03, accent2Mat, 0.1, 0.02, 0.13));
  }
  let featherPlume = null;
  if (cfg.whiteFeather) {
    const fWhite = new THREE.MeshStandardMaterial({ color: 16054271, roughness: 0.78, emissive: 13162226, emissiveIntensity: 0.06 });
    const fShade = new THREE.MeshStandardMaterial({ color: 13161706, roughness: 0.82, emissive: 9348300, emissiveIntensity: 0.04 });
    featherPlume = new THREE.Group();
    featherPlume.position.set(-0.24, 0.58, 0);
    const featherBlocks = [
      [0.14, 0.08, 0.22, -0.03, 0.02, 0, 0.1, 0, true],
      [0.09, 0.26, 0.08, -0.11, 0.11, 0.06, 0.58, 0.14, true],
      [0.08, 0.3, 0.08, -0.15, 0.15, 0, 0.72, 0, true],
      [0.09, 0.24, 0.08, -0.12, 0.09, -0.07, 0.62, -0.16, false],
      [0.06, 0.22, 0.06, -0.22, 0.21, 0.03, 0.88, 0.08, true],
      [0.06, 0.2, 0.06, -0.2, 0.18, -0.06, 0.84, -0.12, false],
      [0.07, 0.18, 0.07, -0.08, 0.17, 0.08, 0.38, 0.18, true],
      [0.07, 0.16, 0.07, -0.07, 0.15, -0.08, 0.42, -0.18, false],
      [0.05, 0.14, 0.05, -0.27, 0.24, -0.01, 1.02, 0, true],
      [0.06, 0.15, 0.06, -0.16, -0.02, 0.05, 1.25, 0.12, false],
      [0.06, 0.15, 0.06, -0.15, -0.03, -0.05, 1.22, -0.12, true]
    ];
    for (const [w, h, d, x, y, z, rz, rx, bright] of featherBlocks) {
      const m = vox(w, h, d, bright ? fWhite : fShade, x, y, z);
      m.rotation.set(rx, 0, rz);
      featherPlume.add(m);
    }
    body.add(featherPlume);
  }
  let coatTail = null;
  if (cfg.longCoat) {
    coatTail = new THREE.Group();
    coatTail.position.set(0, 0.03, 0);
    coatTail.add(vox(0.46, 0.56, 0.05, coatMat, 0, -0.28, -0.12));
    coatTail.add(vox(0.42, 0.05, 0.06, accentMat, 0, -0.54, -0.12));
    coatTail.add(vox(0.06, 0.5, 0.22, coatDarkMat, -0.22, -0.25, -0.02));
    coatTail.add(vox(0.06, 0.5, 0.22, coatDarkMat, 0.22, -0.25, -0.02));
    body.add(coatTail);
  }
  const head = new THREE.Group();
  head.position.set(0, 0.62, 0);
  body.add(head);
  head.add(vox(0.12, 0.08, 0.12, skinShadeMat, 0, 0.03, 0));
  const faceTexMap = makePixelFaceTextures(cfg);
  const faceFrontMat = new THREE.MeshStandardMaterial({ map: faceTexMap.stand, roughness: 0.62 });
  const headMats = [
    skinShadeMat,
    skinShadeMat,
    hairMat,
    skinShadeMat,
    faceFrontMat,
    hairDarkMat
  ];
  const skull = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.3, 0.28), headMats);
  skull.position.set(0, 0.2, 0);
  skull.castShadow = true;
  head.add(skull);
  head.add(vox(0.34, 0.1, 0.32, hairMat, 0, 0.36, -0.01));
  head.add(vox(0.28, 0.07, 0.26, hairHiMat, 0.01, 0.43, 0));
  head.add(vox(0.16, 0.05, 0.16, hairHiMat, -0.04, 0.47, 0.02));
  head.add(vox(0.1, 0.09, 0.05, hairMat, -0.11, 0.31, 0.14));
  head.add(vox(0.08, 0.07, 0.05, hairHiMat, 0.02, 0.33, 0.15));
  head.add(vox(0.1, 0.1, 0.05, hairMat, 0.11, 0.3, 0.14));
  head.add(vox(0.06, 0.22, 0.16, hairDarkMat, -0.16, 0.21, -0.02));
  head.add(vox(0.06, 0.22, 0.16, hairDarkMat, 0.16, 0.21, -0.02));
  head.add(vox(0.32, 0.26, 0.08, hairDarkMat, 0, 0.19, -0.15));
  head.add(vox(0.26, 0.12, 0.07, hairMat, 0, 0.06, -0.16));
  head.add(vox(0.07, 0.1, 0.06, hairHiMat, -0.12, 0.08, -0.14));
  head.add(vox(0.07, 0.1, 0.06, hairHiMat, 0.12, 0.08, -0.14));
  const legs = [-1, 1].map((side) => {
    const pivot = new THREE.Group();
    pivot.position.set(side * 0.115, 0.86, 0);
    root.add(pivot);
    pivot.add(vox(0.16, 0.66, 0.17, pantsMat, 0, -0.35, 0));
    pivot.add(vox(0.17, 0.04, 0.18, coatDarkMat, 0, -0.38, 0));
    pivot.add(vox(0.18, 0.18, 0.25, bootMat, 0, -0.77, 0.035));
    pivot.add(vox(0.19, 0.04, 0.04, accentMat, 0, -0.7, 0.14));
    return pivot;
  });
  const rightHandSlot = new THREE.Group();
  const arms = [-1, 1].map((side) => {
    const pivot = new THREE.Group();
    pivot.position.set(side * 0.3, 0.52, 0);
    body.add(pivot);
    pivot.add(vox(0.14, 0.44, 0.15, coatMat, 0, -0.22, 0));
    pivot.add(vox(0.15, 0.05, 0.16, accentMat, 0, -0.42, 0));
    pivot.add(vox(0.11, 0.11, 0.11, skinMat, 0, -0.5, 0.01));
    if (side === 1) {
      rightHandSlot.position.set(0, -0.5, 0.05);
      pivot.add(rightHandSlot);
    }
    return pivot;
  });
  const propSlot = new THREE.Group();
  root.add(propSlot);
  return { root, body, head, legs, arms, coatTail, featherPlume, rightHandSlot, propSlot, faceFrontMat, faceTexMap };
}
function buildMeiqiuPerformer() {
  const av = buildMeiqiuAvatar(1.66, "smile");
  const crownMat = new THREE.MeshStandardMaterial({ color: 16766018, roughness: 0.25, metalness: 0.85, emissive: 11171840, emissiveIntensity: 0.35 });
  const crown = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.12, 0.14, 6), crownMat);
  crown.position.set(0, 0.59, 0.02);
  av.userData.headGroup.add(crown);
  const rightHandSlot = new THREE.Group();
  rightHandSlot.position.set(0.08, -0.24, 0.08);
  av.userData.arms[1].add(rightHandSlot);
  const propSlot = new THREE.Group();
  av.add(propSlot);
  return {
    root: av,
    body: av.userData.bodyRoot,
    head: av.userData.headGroup,
    legs: av.userData.legs,
    arms: av.userData.arms,
    coatTail: null,
    featherPlume: null,
    rightHandSlot,
    propSlot,
    faceFrontMat: null,
    faceTexMap: null
  };
}
function attachProp(rig, propType = "redMic") {
  const clear = (slot) => {
    while (slot.children.length) slot.remove(slot.children[0]);
  };
  clear(rig.rightHandSlot);
  clear(rig.propSlot);
  const redMicMat = new THREE.MeshStandardMaterial({ color: 15081003, roughness: 0.28, metalness: 0.5, emissive: 9441304, emissiveIntensity: 0.48 });
  const silverMat = new THREE.MeshStandardMaterial({ color: 15265528, roughness: 0.25, metalness: 0.85, emissive: 6320264, emissiveIntensity: 0.18 });
  const darkMat = new THREE.MeshStandardMaterial({ color: 1711138, roughness: 0.5, metalness: 0.6 });
  if (propType === "redMic") {
    const mic = new THREE.Group();
    const handle = vox(0.042, 0.22, 0.042, redMicMat, 0, 0, 0);
    handle.rotation.x = Math.PI * 0.42;
    const ring = vox(0.056, 0.024, 0.056, silverMat, 0, 0.03, 0.075);
    const head = vox(0.072, 0.072, 0.072, silverMat, 0, 0.05, 0.115);
    mic.add(handle, ring, head);
    rig.rightHandSlot.add(mic);
  } else if (propType === "micStand") {
    const stand = new THREE.Group();
    stand.position.set(0, 0, 0.45);
    stand.add(vox(0.36, 0.05, 0.36, darkMat, 0, 0.025, 0));
    stand.add(vox(0.04, 1.48, 0.04, redMicMat, 0, 0.76, 0));
    stand.add(vox(0.075, 0.075, 0.075, silverMat, 0, 1.52, -0.05));
    rig.propSlot.add(stand);
  } else if (propType === "guitar") {
    const guitar = new THREE.Group();
    guitar.position.set(0, 1.06, 0.22);
    guitar.rotation.z = -0.32;
    guitar.add(vox(0.4, 0.26, 0.06, redMicMat, 0, 0, 0));
    guitar.add(vox(0.14, 0.14, 0.07, silverMat, 0.05, 0, 0));
    guitar.add(vox(0.6, 0.065, 0.045, darkMat, 0.44, 0.02, 0));
    guitar.add(vox(0.12, 0.1, 0.045, redMicMat, 0.78, 0.03, 0));
    rig.propSlot.add(guitar);
  }
}
function createPerformerSystem({ scene, surfaceAt }) {
  const container = new THREE.Group();
  container.name = "舞台歌手";
  container.visible = false;
  container.userData.dynamic = true;
  scene.add(container);
  const spotGroup = new THREE.Group();
  spotGroup.userData.skipAoDepth = true;
  const coneMat = new THREE.MeshBasicMaterial({
    map: makeSpotConeTex(),
    color: 16775406,
    transparent: true,
    opacity: 0.42,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    side: THREE.DoubleSide
  });
  const coneHeight = 24;
  const spotCone = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 2.5, coneHeight, 20, 1, true), coneMat);
  spotCone.position.set(0, coneHeight / 2, 0);
  const poolMat = new THREE.MeshBasicMaterial({
    map: makeSpotPoolTex(),
    color: 16775406,
    transparent: true,
    opacity: 0.55,
    blending: THREE.AdditiveBlending,
    depthWrite: false
  });
  const spotPool = new THREE.Mesh(new THREE.PlaneGeometry(4.2, 4.2).rotateX(-Math.PI / 2), poolMat);
  spotPool.position.set(0, 0.03, 0);
  const spotLight = new THREE.PointLight(16774890, 95, 16, 2);
  spotLight.position.set(0, 3.8, 1.8);
  spotGroup.add(spotCone, spotPool, spotLight);
  container.add(spotGroup);
  const actorHost = new THREE.Group();
  container.add(actorHost);
  let rig = null;
  let curOutfit = null;
  let curProp = null;
  let curFaceKind = null;
  let pos = new THREE.Vector3(0, 1.4, -44.5);
  let targetPos = new THREE.Vector3(0, 1.4, -44.5);
  let facing = 0;
  let walkPhase = 0;
  function ensureOutfit(outfitKey, propKey) {
    const ok = outfitKey in PERFORMER_OUTFITS ? outfitKey : "redFeather";
    const pk = propKey || "redMic";
    if (ok !== curOutfit) {
      while (actorHost.children.length) actorHost.remove(actorHost.children[0]);
      rig = PERFORMER_OUTFITS[ok].meiqiu ? buildMeiqiuPerformer() : buildPixelPerformer(ok);
      actorHost.add(rig.root);
      curOutfit = ok;
      curProp = null;
      curFaceKind = "stand";
    }
    if (pk !== curProp && rig) {
      attachProp(rig, pk);
      curProp = pk;
    }
  }
  function resolvePoint(pointOrZone) {
    if (typeof pointOrZone === "string" && pointOrZone in PERFORMER_ZONES) {
      return PERFORMER_ZONES[pointOrZone];
    }
    if (Array.isArray(pointOrZone) && pointOrZone.length >= 2) {
      return [Number(pointOrZone[0]) || 0, Number(pointOrZone[1]) || 0];
    }
    return PERFORMER_ZONES.mainCenter;
  }
  function samplePath(pathList, cueElapsed, speed = 2.6) {
    const pts = pathList.map(resolvePoint);
    if (pts.length === 1) return pts[0];
    let remain = Math.max(0, cueElapsed * speed);
    for (let i = 0; i < pts.length - 1; i++) {
      const [x0, z0] = pts[i], [x1, z1] = pts[i + 1];
      const seg = Math.hypot(x1 - x0, z1 - z0);
      if (remain <= seg || i === pts.length - 2) {
        const t = seg > 1e-4 ? Math.min(1, remain / seg) : 1;
        return [x0 + (x1 - x0) * t, z0 + (z1 - z0) * t];
      }
      remain -= seg;
    }
    return pts[pts.length - 1];
  }
  function snapTo(spec) {
    if (!spec || spec.visible === false) {
      container.visible = false;
      return;
    }
    ensureOutfit(spec.outfit, spec.prop);
    const [tx, tz] = Array.isArray(spec.path) && spec.path.length ? resolvePoint(spec.path[0]) : resolvePoint(spec.pos ?? spec.zone ?? "mainCenter");
    const ty = surfaceAt(tx, tz, spec.zone === "cage");
    pos.set(tx, ty, tz);
    targetPos.copy(pos);
    facing = spec.facingDeg != null ? spec.facingDeg * Math.PI / 180 : 0;
    container.position.copy(pos);
    actorHost.rotation.y = facing;
    container.visible = true;
  }
  function update(dt, simT, spec, cueElapsed = 0) {
    if (!spec || spec.visible === false) {
      container.visible = false;
      return;
    }
    container.visible = true;
    ensureOutfit(spec.outfit, spec.prop);
    const inCage = spec.zone === "cage";
    const moveSpeed = spec.speed ?? 3.2;
    let tx, tz;
    if (Array.isArray(spec.path) && spec.path.length > 0) {
      [tx, tz] = samplePath(spec.path, cueElapsed, moveSpeed);
    } else {
      [tx, tz] = resolvePoint(spec.pos ?? spec.zone ?? "mainCenter");
    }
    targetPos.set(tx, surfaceAt(tx, tz, inCage), tz);
    const dx = targetPos.x - pos.x;
    const dz = targetPos.z - pos.z;
    const dist = Math.hypot(dx, dz);
    let moving = false;
    if (dist > 0.06 && dt > 0) {
      moving = true;
      const step = Math.min(dist, moveSpeed * dt);
      pos.x += dx / dist * step;
      pos.z += dz / dist * step;
      walkPhase += step * 2.1;
    }
    const desiredY = surfaceAt(pos.x, pos.z, inCage);
    pos.y += (desiredY - pos.y) * Math.min(1, dt * 14);
    container.position.copy(pos);
    const wantFacing = moving ? Math.atan2(dx, dz) : spec.facingDeg != null ? spec.facingDeg * Math.PI / 180 : 0;
    let df = wantFacing - facing;
    df = Math.atan2(Math.sin(df), Math.cos(df));
    facing += df * Math.min(1, dt * 7);
    actorHost.rotation.y = facing;
    const pose = spec.pose || "sing";
    const beat = Math.sin(simT * 4.4);
    const slow = Math.sin(simT * 2.1);
    const { legs, arms, head, body, coatTail, featherPlume, faceFrontMat, faceTexMap } = rig;
    if (faceFrontMat && faceTexMap) {
      const wantFace = pose === "rock" || pose === "openArms" ? "rock" : pose === "stand" ? "stand" : "sing";
      if (wantFace !== curFaceKind) {
        faceFrontMat.map = faceTexMap[wantFace];
        faceFrontMat.needsUpdate = true;
        curFaceKind = wantFace;
      }
    }
    if (moving) {
      const sw = Math.sin(walkPhase) * 0.55;
      legs[0].rotation.x = sw;
      legs[1].rotation.x = -sw;
      arms[0].rotation.x = -sw * 0.7;
      arms[0].rotation.z = 0.08;
      arms[1].rotation.x = spec.prop === "redMic" ? -0.95 + sw * 0.2 : sw * 0.7;
      arms[1].rotation.z = -0.08;
      body.rotation.x = 0.04;
      body.rotation.z = Math.sin(walkPhase) * 0.05;
      head.rotation.x = 0;
      if (coatTail) coatTail.rotation.x = 0.16 + Math.abs(sw) * 0.25;
      if (featherPlume) featherPlume.rotation.z = Math.sin(walkPhase * 2) * 0.08;
    } else {
      legs[0].rotation.x *= 0.85;
      legs[1].rotation.x *= 0.85;
      if (pose === "rock") {
        arms[0].rotation.x = -2.25 + beat * 0.24;
        arms[0].rotation.z = 0.45;
        arms[1].rotation.x = -1.35 + beat * 0.12;
        arms[1].rotation.z = -0.15;
        body.rotation.x = 0.12 + beat * 0.08;
        body.rotation.z = slow * 0.08;
        head.rotation.x = beat * 0.16;
      } else if (pose === "openArms") {
        arms[0].rotation.x = -0.35;
        arms[0].rotation.z = 1.25 + slow * 0.08;
        arms[1].rotation.x = -0.35;
        arms[1].rotation.z = -1.25 - slow * 0.08;
        body.rotation.x = -0.06;
        body.rotation.z = slow * 0.03;
        head.rotation.x = -0.1;
      } else if (pose === "stand") {
        arms[0].rotation.x = slow * 0.06;
        arms[0].rotation.z = 0.12;
        arms[1].rotation.x = -0.85 + slow * 0.05;
        arms[1].rotation.z = -0.12;
        body.rotation.x = 0;
        body.rotation.z = slow * 0.02;
        head.rotation.x = slow * 0.04;
      } else {
        arms[0].rotation.x = -0.55 + slow * 0.28;
        arms[0].rotation.z = 0.24 + slow * 0.08;
        arms[1].rotation.x = -1.38 + slow * 0.06;
        arms[1].rotation.z = -0.22;
        body.rotation.x = 0.03 + slow * 0.04;
        body.rotation.z = slow * 0.04;
        head.rotation.x = -0.04 + slow * 0.06;
      }
      if (coatTail) coatTail.rotation.x = 0.05 + Math.abs(slow) * 0.08;
      if (featherPlume) featherPlume.rotation.z = beat * 0.06;
    }
    const spotOn = spec.spotlight !== false;
    spotGroup.visible = spotOn;
    if (spotOn) {
      const sc = spec.spotColor || "#fff8ee";
      coneMat.color.set(sc);
      poolMat.color.set(sc);
      spotLight.color.set(sc);
      spotLight.intensity = 95 * (spec.spotIntensity ?? 1);
    }
  }
  function hide() {
    container.visible = false;
  }
  return { update, snapTo, hide, object: container };
}
export {
  PERFORMER_OUTFITS,
  PERFORMER_ZONES,
  createPerformerSystem
};
