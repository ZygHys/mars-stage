// 舞台歌手形象、演出服换装、动作姿态、手持红麦/立麦/吉他、专属追光与舞台走位系统（Performer Track）。
// 可在任意 show.json 里通过 performer 轨道驱动：形象（outfit）、道具（prop）、动作（pose）、走位点/巡台路径（zone / pos / path）、追光（spotlight）。
import * as THREE from 'three';
import { LAYOUT } from '../layout.js';
import { buildMeiqiuAvatar } from '../meiqiu.js';

export const PERFORMER_ZONES = {
  mainSteps:    [0, -52.2],
  mainCenter:   [0, -44.5],
  mainFront:    [0, -39.6],
  mainLeft:     [-18, -43.5],
  mainRight:    [18, -43.5],
  catwalk:      [0, -22.5],
  circleCenter: [0, 0],
  circleFront:  [0, 7.6],
  circleLeft:   [-7.2, 1.5],
  circleRight:  [7.2, 1.5],
  bridgeLeft:   [-24.5, -2.5],
  bridgeRight:  [24.5, -2.5],
  cage:         [0, 0],
};

export const PERFORMER_OUTFITS = {
  redCoat:    { label: '火星红长风衣', coat: 0xc81e2c, inner: 0x16171c, pants: 0x15161b, accent: 0xe6e8ee, hair: 0x141316, longCoat: true },
  whiteSuit:  { label: '纯白先锋套装', coat: 0xf2f3f6, inner: 0xe5e7ec, pants: 0xebeef2, accent: 0xcfd6e4, hair: 0x18161a, longCoat: true },
  blackRock:  { label: '暗黑摇滚皮衣', coat: 0x1a1c22, inner: 0x111216, pants: 0x14151a, accent: 0xe02838, hair: 0x141316, longCoat: false },
  goldRoyal:  { label: '黑金华丽战袍', coat: 0x1c1a20, inner: 0x141216, pants: 0x16151a, accent: 0xf4c842, hair: 0x141316, longCoat: true },
  meiqiuKing: { label: '皇冠小黑煤球儿主唱', meiqiu: true },
};

function makeSpotConeTex() {
  const c = document.createElement('canvas');
  c.width = 64; c.height = 128;
  const g = c.getContext('2d');
  const gr = g.createLinearGradient(0, 0, 0, 128);
  gr.addColorStop(0, 'rgba(255,255,255,0.0)');
  gr.addColorStop(0.2, 'rgba(255,255,255,0.22)');
  gr.addColorStop(0.85, 'rgba(255,255,255,0.12)');
  gr.addColorStop(1, 'rgba(255,255,255,0.0)');
  g.fillStyle = gr;
  g.fillRect(0, 0, 64, 128);
  return new THREE.CanvasTexture(c);
}

function makeSpotPoolTex() {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const g = c.getContext('2d');
  const gr = g.createRadialGradient(64, 64, 4, 64, 64, 62);
  gr.addColorStop(0, 'rgba(255,255,255,0.75)');
  gr.addColorStop(0.45, 'rgba(255,255,255,0.25)');
  gr.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = gr;
  g.fillRect(0, 0, 128, 128);
  return new THREE.CanvasTexture(c);
}

// 构造舞台歌手可动模型（身高约 1.78m，本地 y = 0 为脚底，+z 朝前）
function buildHumanPerformer(outfitKey) {
  const cfg = PERFORMER_OUTFITS[outfitKey] || PERFORMER_OUTFITS.redCoat;
  const root = new THREE.Group();

  const coatMat = new THREE.MeshStandardMaterial({ color: cfg.coat, roughness: 0.52, metalness: 0.12 });
  const innerMat = new THREE.MeshStandardMaterial({ color: cfg.inner, roughness: 0.72, metalness: 0.08 });
  const pantsMat = new THREE.MeshStandardMaterial({ color: cfg.pants, roughness: 0.78, metalness: 0.05 });
  const accentMat = new THREE.MeshStandardMaterial({ color: cfg.accent, roughness: 0.32, metalness: 0.65, emissive: new THREE.Color(cfg.accent), emissiveIntensity: 0.16 });
  const skinMat = new THREE.MeshStandardMaterial({ color: 0xebd0ba, roughness: 0.58 });
  const hairMat = new THREE.MeshStandardMaterial({ color: cfg.hair, roughness: 0.62 });
  const bootMat = new THREE.MeshStandardMaterial({ color: 0x111216, roughness: 0.45, metalness: 0.2 });

  const body = new THREE.Group();
  body.position.set(0, 0.90, 0);
  root.add(body);

  // 躯干内搭 + 舞台风衣/西装外套
  const chest = new THREE.Mesh(new THREE.CapsuleGeometry(0.165, 0.36, 6, 12).scale(1.16, 1, 0.68), innerMat);
  chest.position.set(0, 0.31, 0);
  chest.castShadow = true;
  body.add(chest);

  const jacket = new THREE.Mesh(new THREE.CylinderGeometry(0.20, 0.18, 0.48, 14, 1, false, Math.PI * 0.12, Math.PI * 1.76), coatMat);
  jacket.rotation.y = Math.PI;
  jacket.position.set(0, 0.28, -0.01);
  jacket.castShadow = true;
  body.add(jacket);

  // 亮眼肩饰 / 领口装饰条（夜场远看也有清晰层次）
  for (const s of [-1, 1]) {
    const lapel = new THREE.Mesh(new THREE.BoxGeometry(0.055, 0.38, 0.03), accentMat);
    lapel.position.set(s * 0.075, 0.33, 0.115);
    lapel.rotation.z = -s * 0.12;
    body.add(lapel);
  }

  // 飘逸长风衣下摆（随走动轻摆）
  let coatTail = null;
  if (cfg.longCoat) {
    coatTail = new THREE.Group();
    coatTail.position.set(0, 0.06, -0.02);
    const tailMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.185, 0.30, 0.62, 14, 1, true, Math.PI * 0.2, Math.PI * 1.6), coatMat);
    tailMesh.material = coatMat.clone();
    tailMesh.material.side = THREE.DoubleSide;
    tailMesh.rotation.y = Math.PI;
    tailMesh.position.set(0, -0.31, 0);
    tailMesh.castShadow = true;
    coatTail.add(tailMesh);
    body.add(coatTail);
  }

  // 头部 + 舞台发型
  const head = new THREE.Group();
  head.position.set(0, 0.62, 0);
  body.add(head);
  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.052, 0.058, 0.11, 10), skinMat);
  neck.position.set(0, 0.03, 0);
  head.add(neck);
  const skull = new THREE.Mesh(new THREE.SphereGeometry(0.112, 16, 12).scale(0.95, 1.12, 1.02), skinMat);
  skull.position.set(0, 0.155, 0.005);
  skull.castShadow = true;
  head.add(skull);
  const hairTop = new THREE.Mesh(new THREE.SphereGeometry(0.124, 16, 10, 0, Math.PI * 2, 0, Math.PI * 0.64).rotateX(-0.35), hairMat);
  hairTop.position.set(0, 0.175, -0.01);
  head.add(hairTop);
  // 蓬松舞台碎发刘海与后颈发尾
  const bangs = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.06, 0.05), hairMat);
  bangs.position.set(0, 0.225, 0.095);
  bangs.rotation.x = 0.25;
  head.add(bangs);
  const backHair = new THREE.Mesh(new THREE.CapsuleGeometry(0.075, 0.08, 4, 8).scale(1.2, 1, 0.7), hairMat);
  backHair.position.set(0, 0.10, -0.065);
  head.add(backHair);

  // 双腿
  const legs = [-1, 1].map((side) => {
    const pivot = new THREE.Group();
    pivot.position.set(side * 0.095, 0.90, 0);
    root.add(pivot);
    const leg = new THREE.Mesh(new THREE.CapsuleGeometry(0.062, 0.68, 4, 8), pantsMat);
    leg.position.set(0, -0.40, 0);
    leg.castShadow = true;
    pivot.add(leg);
    const boot = new THREE.Mesh(new THREE.BoxGeometry(0.105, 0.12, 0.22), bootMat);
    boot.position.set(0, -0.84, 0.04);
    boot.castShadow = true;
    pivot.add(boot);
    return pivot;
  });

  // 双臂（右手挂载话筒插槽）
  const rightHandSlot = new THREE.Group();
  const arms = [-1, 1].map((side) => {
    const pivot = new THREE.Group();
    pivot.position.set(side * 0.235, 0.50, 0);
    body.add(pivot);
    const upper = new THREE.Mesh(new THREE.CapsuleGeometry(0.048, 0.46, 4, 8), coatMat);
    upper.position.set(0, -0.26, 0);
    upper.castShadow = true;
    pivot.add(upper);
    const hand = new THREE.Mesh(new THREE.SphereGeometry(0.042, 8, 6), skinMat);
    hand.position.set(0, -0.54, 0.01);
    pivot.add(hand);
    if (side === 1) {
      rightHandSlot.position.set(0, -0.54, 0.03);
      pivot.add(rightHandSlot);
    }
    return pivot;
  });

  const propSlot = new THREE.Group();
  root.add(propSlot);

  return { root, body, head, legs, arms, coatTail, rightHandSlot, propSlot };
}

function buildMeiqiuPerformer() {
  const av = buildMeiqiuAvatar(1.66, 'smile');
  // 加一顶金色小皇冠在头顶红花旁
  const crownMat = new THREE.MeshStandardMaterial({ color: 0xffd442, roughness: 0.25, metalness: 0.85, emissive: 0xaa7800, emissiveIntensity: 0.35 });
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
    rightHandSlot,
    propSlot,
  };
}

function attachProp(rig, propType = 'redMic') {
  const clear = (slot) => { while (slot.children.length) slot.remove(slot.children[0]); };
  clear(rig.rightHandSlot);
  clear(rig.propSlot);

  const redMicMat = new THREE.MeshStandardMaterial({ color: 0xe61e2b, roughness: 0.25, metalness: 0.55, emissive: 0x901018, emissiveIntensity: 0.45 });
  const silverMat = new THREE.MeshStandardMaterial({ color: 0xe4e8f0, roughness: 0.25, metalness: 0.85 });
  const darkMat = new THREE.MeshStandardMaterial({ color: 0x1c1d22, roughness: 0.5, metalness: 0.6 });

  if (propType === 'redMic') {
    const mic = new THREE.Group();
    const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.014, 0.20, 8), redMicMat);
    handle.rotation.x = Math.PI * 0.42;
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.030, 10, 8), silverMat);
    head.position.set(0, 0.04, 0.11);
    mic.add(handle, head);
    rig.rightHandSlot.add(mic);
  } else if (propType === 'micStand') {
    const stand = new THREE.Group();
    stand.position.set(0, 0, 0.42);
    const base = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.20, 0.04, 16), darkMat);
    base.position.y = 0.02;
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.018, 1.48, 8), redMicMat);
    pole.position.y = 0.76;
    const micHead = new THREE.Mesh(new THREE.SphereGeometry(0.032, 10, 8), silverMat);
    micHead.position.set(0, 1.50, -0.05);
    stand.add(base, pole, micHead);
    rig.propSlot.add(stand);
  } else if (propType === 'guitar') {
    const guitar = new THREE.Group();
    guitar.position.set(0, 1.06, 0.20);
    guitar.rotation.z = -0.32;
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.24, 0.05), redMicMat);
    const neck = new THREE.Mesh(new THREE.BoxGeometry(0.58, 0.055, 0.035), darkMat);
    neck.position.set(0.42, 0.02, 0);
    guitar.add(body, neck);
    rig.propSlot.add(guitar);
  }
}

export function createPerformerSystem({ scene, surfaceAt }) {
  const container = new THREE.Group();
  container.name = '舞台歌手';
  container.visible = false;
  container.userData.dynamic = true;
  scene.add(container);

  // 专属追光灯（顶部柔光光锥 + 脚下地面追光斑 + 柔和聚光补光）
  const spotGroup = new THREE.Group();
  spotGroup.userData.skipAoDepth = true;
  const coneMat = new THREE.MeshBasicMaterial({
    map: makeSpotConeTex(),
    color: 0xfff8ee,
    transparent: true,
    opacity: 0.42,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
  const coneHeight = 24;
  const spotCone = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 2.5, coneHeight, 20, 1, true), coneMat);
  spotCone.position.set(0, coneHeight / 2, 0);
  const poolMat = new THREE.MeshBasicMaterial({
    map: makeSpotPoolTex(),
    color: 0xfff8ee,
    transparent: true,
    opacity: 0.55,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  const spotPool = new THREE.Mesh(new THREE.PlaneGeometry(4.2, 4.2).rotateX(-Math.PI / 2), poolMat);
  spotPool.position.set(0, 0.03, 0);
  const spotLight = new THREE.PointLight(0xfff6ea, 180, 18, 2);
  spotLight.position.set(0, 3.6, 1.4);
  spotGroup.add(spotCone, spotPool, spotLight);
  container.add(spotGroup);

  const actorHost = new THREE.Group();
  container.add(actorHost);

  let rig = null;
  let curOutfit = null;
  let curProp = null;
  let pos = new THREE.Vector3(0, 1.4, -44.5);
  let targetPos = new THREE.Vector3(0, 1.4, -44.5);
  let facing = 0; // 0 = 朝向 +z（正对观众）
  let walkPhase = 0;

  function ensureOutfit(outfitKey, propKey) {
    const ok = outfitKey in PERFORMER_OUTFITS ? outfitKey : 'redCoat';
    const pk = propKey || 'redMic';
    if (ok !== curOutfit) {
      while (actorHost.children.length) actorHost.remove(actorHost.children[0]);
      rig = PERFORMER_OUTFITS[ok].meiqiu ? buildMeiqiuPerformer() : buildHumanPerformer(ok);
      actorHost.add(rig.root);
      curOutfit = ok;
      curProp = null;
    }
    if (pk !== curProp && rig) {
      attachProp(rig, pk);
      curProp = pk;
    }
  }

  function resolvePoint(pointOrZone) {
    if (typeof pointOrZone === 'string' && pointOrZone in PERFORMER_ZONES) {
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
    if (!spec || spec.visible === false) { container.visible = false; return; }
    ensureOutfit(spec.outfit, spec.prop);
    const [tx, tz] = Array.isArray(spec.path) && spec.path.length
      ? resolvePoint(spec.path[0])
      : resolvePoint(spec.pos ?? spec.zone ?? 'mainCenter');
    const ty = surfaceAt(tx, tz, spec.zone === 'cage');
    pos.set(tx, ty, tz);
    targetPos.copy(pos);
    facing = spec.facingDeg != null ? (spec.facingDeg * Math.PI) / 180 : 0;
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

    const inCage = spec.zone === 'cage';
    const moveSpeed = spec.speed ?? 3.2;
    let tx, tz;
    if (Array.isArray(spec.path) && spec.path.length > 0) {
      [tx, tz] = samplePath(spec.path, cueElapsed, moveSpeed);
    } else {
      [tx, tz] = resolvePoint(spec.pos ?? spec.zone ?? 'mainCenter');
    }
    targetPos.set(tx, surfaceAt(tx, tz, inCage), tz);

    const dx = targetPos.x - pos.x;
    const dz = targetPos.z - pos.z;
    const dist = Math.hypot(dx, dz);
    let moving = false;
    if (dist > 0.06 && dt > 0) {
      moving = true;
      const step = Math.min(dist, moveSpeed * dt);
      pos.x += (dx / dist) * step;
      pos.z += (dz / dist) * step;
      walkPhase += step * 2.1;
    }
    const desiredY = surfaceAt(pos.x, pos.z, inCage);
    pos.y += (desiredY - pos.y) * Math.min(1, dt * 14);
    container.position.copy(pos);

    // 朝向：行走时朝行进方向，到位后朝指定方向或面向观众（+z = 0）
    const wantFacing = moving
      ? Math.atan2(dx, dz)
      : (spec.facingDeg != null ? (spec.facingDeg * Math.PI) / 180 : 0);
    let df = wantFacing - facing;
    df = Math.atan2(Math.sin(df), Math.cos(df));
    facing += df * Math.min(1, dt * 7);
    actorHost.rotation.y = facing;

    // 动作动画（行走摆步 / 演唱持麦 / 摇滚律动 / 张臂拥抱）
    const pose = spec.pose || 'sing';
    const beat = Math.sin(simT * 4.2);
    const slow = Math.sin(simT * 2.0);
    const { legs, arms, head, body, coatTail } = rig;

    if (moving) {
      const sw = Math.sin(walkPhase) * 0.55;
      legs[0].rotation.x = sw;
      legs[1].rotation.x = -sw;
      arms[0].rotation.x = -sw * 0.7;
      arms[0].rotation.z = 0.08;
      // 右手持麦时走路也微微举着话筒
      arms[1].rotation.x = spec.prop === 'redMic' ? -0.95 + sw * 0.2 : sw * 0.7;
      arms[1].rotation.z = -0.08;
      body.rotation.x = 0.04;
      body.rotation.z = Math.sin(walkPhase) * 0.04;
      head.rotation.x = 0;
      if (coatTail) coatTail.rotation.x = 0.16 + Math.abs(sw) * 0.25;
    } else {
      legs[0].rotation.x *= 0.85;
      legs[1].rotation.x *= 0.85;
      if (pose === 'rock') {
        arms[0].rotation.x = -2.25 + beat * 0.22;
        arms[0].rotation.z = 0.45;
        arms[1].rotation.x = -1.35 + beat * 0.12;
        arms[1].rotation.z = -0.15;
        body.rotation.x = 0.12 + beat * 0.08;
        body.rotation.z = slow * 0.08;
        head.rotation.x = beat * 0.18;
      } else if (pose === 'openArms') {
        arms[0].rotation.x = -0.35;
        arms[0].rotation.z = 1.25 + slow * 0.08;
        arms[1].rotation.x = -0.35;
        arms[1].rotation.z = -1.25 - slow * 0.08;
        body.rotation.x = -0.06;
        body.rotation.z = slow * 0.03;
        head.rotation.x = -0.12;
      } else if (pose === 'stand') {
        arms[0].rotation.x = slow * 0.06;
        arms[0].rotation.z = 0.12;
        arms[1].rotation.x = -0.85 + slow * 0.05;
        arms[1].rotation.z = -0.12;
        body.rotation.x = 0;
        body.rotation.z = slow * 0.02;
        head.rotation.x = slow * 0.04;
      } else {
        // 默认 sing：右手举红麦到嘴边，左手随节奏打拍子
        arms[0].rotation.x = -0.55 + slow * 0.28;
        arms[0].rotation.z = 0.24 + slow * 0.08;
        arms[1].rotation.x = -1.38 + slow * 0.06;
        arms[1].rotation.z = -0.22;
        body.rotation.x = 0.03 + slow * 0.04;
        body.rotation.z = slow * 0.04;
        head.rotation.x = -0.04 + slow * 0.06;
      }
      if (coatTail) coatTail.rotation.x = 0.05 + Math.abs(slow) * 0.08;
    }

    // 专属追光灯更新
    const spotOn = spec.spotlight !== false;
    spotGroup.visible = spotOn;
    if (spotOn) {
      const sc = spec.spotColor || '#fff8ee';
      coneMat.color.set(sc);
      poolMat.color.set(sc);
      spotLight.color.set(sc);
      spotLight.intensity = 180 * (spec.spotIntensity ?? 1.0);
    }
  }

  function hide() {
    container.visible = false;
  }

  return { update, snapTo, hide, object: container };
}
