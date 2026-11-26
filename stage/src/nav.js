// 三种视角的操控：无人机（总览）、第一人称、第三人称。
// 视线随步伐上下起伏、左右轻摆，横移时微微侧倾，冲刺时视野稍微拉宽，跳起落地有一下下沉。
// 无人机照大疆的习惯：WASD 平移、空格 / C 升降、Q / E 原地转向，拖动或双指滑动控制云台（俯仰、朝向），
// 松开按键会滑一小段再刹停，飞得越高移动越快；屏幕下方有高度、速度、朝向读数。
import * as THREE from 'three';
import { compassBearing } from './atmosphere.js';
import { buildMeiqiuAvatar, MEIQIU_VARIANTS } from './meiqiu.js';

const WALK = {
  eye: 1.68, walk: 3.8, sprint: 6.4, accel: 34, decel: 26, gravity: 21, jumpApex: 1,
  stride: { walk: 1.55, sprint: 2.1 }, bobY: 0.024, bobX: 0.013, bobSprint: 1.9, rollStrafe: 0.02,
  landDip: 0.36, landDipMax: 0.2, fovBase: 68, fovSprint: 6,
};
const DRONE = { speed: 10, boost: 3, vSpeed: 5, yawRate: 1.2, response: 3.2 };
const damp = (a, b, rate, dt) => b + (a - b) * Math.exp(-rate * dt);
const clamp = THREE.MathUtils.clamp;

// 第三人称角色：笑脸灰绒款“小黑煤球儿”（带头顶红花黄芯、黑眼白高光、腮红、胸前白色火星标志）
const AVATAR_TARGET_Y = 1.32;
function buildAvatar() {
  return buildMeiqiuAvatar(1.62);
}

export function createNav({ camera, dom, keys, walk, scene, groundAt = () => 0, onChange = () => {} }) {
  let mode = 'drone';
  const avatar = buildAvatar(); avatar.visible = false; scene.add(avatar);
  // 无人机
  const drone = { yaw: 0, pitch: -0.4, vel: new THREE.Vector3(), lastY: 0, vs: 0 };
  // 走路的人（第一、第三人称共用）
  const p = { x: -20, z: 110, y: 0, vx: 0, vz: 0, vy: 0, onGround: true, yaw: Math.PI, pitch: 0.12, phase: 0, bob: 0, roll: 0, spring: 0, springV: 0, fov: WALK.fovBase, sprinting: false, facing: Math.PI };
  // 第三人称相机
  const cam3 = { yaw: Math.PI, pitch: 0.28, dist: 6.5, target: new THREE.Vector3() };
  const eul = new THREE.Euler(0, 0, 0, 'YXZ');

  function syncFromCamera() {   // 外部直接摆了相机（机位、G.cam）之后，把无人机的朝向对上
    eul.setFromQuaternion(camera.quaternion, 'YXZ');
    drone.yaw = eul.y; drone.pitch = clamp(eul.x, -Math.PI / 2 + 0.001, 1.2); drone.vel.set(0, 0, 0); drone.lastY = camera.position.y;
  }
  function setMode(m) {
    if (m === 'orbit') m = 'drone';
    if (!['drone', 'first', 'third'].includes(m)) return;
    const prev = mode; mode = m;
    if (m !== 'drone' && prev === 'drone') {
      p.x = camera.position.x; p.z = camera.position.z;
      p.y = groundAt(p.x, p.z); p.onGround = true;
      p.yaw = drone.yaw; p.facing = p.yaw + Math.PI;
      p.pitch = clamp(drone.pitch, -0.85, 0.85);
      p.vx = p.vz = p.vy = p.bob = p.roll = p.spring = p.springV = 0;
    }
    if (m === 'first' && prev === 'third') p.yaw = cam3.yaw;
    if (m === 'third' && prev !== 'third') {
      cam3.yaw = p.yaw;
      avatar.position.set(p.x, p.y, p.z); avatar.rotation.y = p.facing;
      cam3.target.set(p.x, p.y + AVATAR_TARGET_Y, p.z);
      placeThirdCamera();
    }
    if (m === 'drone' && prev !== 'drone') {
      // 从角色所在位置接管。第三人称的跟拍偏移不计入无人机坐标。
      camera.position.set(p.x, p.y + WALK.eye, p.z);
      drone.yaw = prev === 'third' ? cam3.yaw : p.yaw;
      drone.pitch = prev === 'third' ? -cam3.pitch : p.pitch;
      drone.vel.set(0, 0, 0); drone.lastY = camera.position.y; drone.vs = 0;
      camera.rotation.set(drone.pitch, drone.yaw, 0, 'YXZ');
    }
    if (m === 'first') {
      camera.fov = p.fov = WALK.fovBase;
      camera.position.set(p.x, p.y + WALK.eye, p.z);
      camera.rotation.set(p.pitch, p.yaw, 0, 'YXZ');
    } else if (m === 'third') {
      camera.fov = 55;
    }
    camera.updateProjectionMatrix();
    avatar.visible = m === 'third';
    if (document.pointerLockElement && m !== 'first') document.exitPointerLock();
    onChange(m);
  }
  function teleport(x, z) {
    if (mode === 'drone') { camera.position.x = x; camera.position.z = z; camera.position.y = Math.max(camera.position.y, groundAt(x, z) + 25); drone.vel.set(0, 0, 0); return; }   // 无人机保持高度平移过去，不钻进山里
    p.x = x; p.z = z; p.vx = p.vz = 0; p.y = groundAt(x, z); p.vy = 0; p.onGround = true;
    if (mode === 'third') cam3.target.set(x, p.y + AVATAR_TARGET_Y, z);
  }
  function look(dx, dy) {
    if (mode === 'drone') { drone.yaw -= dx; drone.pitch = clamp(drone.pitch - dy, -Math.PI / 2 + 0.001, 1.2); }
    else if (mode === 'first') { p.yaw -= dx; p.pitch = clamp(p.pitch - dy, -1.5, 1.5); }
    else { cam3.yaw -= dx; cam3.pitch = clamp(cam3.pitch + dy, -0.35, 1.35); }
  }

  // ---------- 指针：拖动 = 看 / 云台；右键拖动（无人机）= 平移；第一人称双击锁定鼠标 ----------
  let drag = 0, lastX = 0, lastY = 0;
  dom.addEventListener('contextmenu', (e) => e.preventDefault());
  dom.addEventListener('pointerdown', (e) => { drag = e.button === 2 ? 2 : 1; lastX = e.clientX; lastY = e.clientY; dom.setPointerCapture?.(e.pointerId); });
  addEventListener('pointerup', () => { drag = 0; });
  dom.addEventListener('pointermove', (e) => {
    if (document.pointerLockElement === dom) { look(e.movementX * 0.0022, e.movementY * 0.0022); return; }
    if (!drag) return;
    const dx = e.clientX - lastX, dy = e.clientY - lastY; lastX = e.clientX; lastY = e.clientY;
    if (drag === 2 && mode === 'drone') {   // 右键拖动：沿画面平移（像拖地图）
      const k = Math.max(0.05, camera.position.y * 0.0025), f = new THREE.Vector3(-Math.sin(drone.yaw), 0, -Math.cos(drone.yaw)), r = new THREE.Vector3(Math.cos(drone.yaw), 0, -Math.sin(drone.yaw));
      camera.position.addScaledVector(r, -dx * k).addScaledVector(f, dy * k); return;
    }
    look(dx * 0.0035, dy * 0.0035);
  });
  dom.addEventListener('dblclick', () => { if (mode === 'first') dom.requestPointerLock?.(); });
  // ---------- 触摸板 / 滚轮 ----------
  dom.addEventListener('wheel', (e) => {
    e.preventDefault();
    const mouseWheel = e.deltaMode !== 0 || (e.deltaX === 0 && Number.isInteger(e.deltaY) && Math.abs(e.deltaY) >= 50);
    if (mode === 'drone') {
      const fwd = new THREE.Vector3(); camera.getWorldDirection(fwd);
      const k = Math.max(4, camera.position.y * 0.15);
      if (e.ctrlKey) { drone.vel.addScaledVector(fwd, -e.deltaY * 0.06 * k); return; }               // 捏合：顺着镜头方向飞近 / 退远
      if (mouseWheel) { drone.vel.addScaledVector(fwd, -Math.sign(e.deltaY) * 1.2 * k); return; }       // 鼠标滚轮：同上
      if (e.shiftKey) { const r = new THREE.Vector3(Math.cos(drone.yaw), 0, -Math.sin(drone.yaw)); drone.vel.addScaledVector(r, e.deltaX * 0.02 * k); drone.vel.y += -e.deltaY * 0.02 * k; return; }   // Shift + 双指：平移、升降
      look(e.deltaX * 0.0025, e.deltaY * 0.0025); return;                                               // 双指滑动：云台
    }
    if (mode === 'first') {
      if (e.ctrlKey || mouseWheel) { p.fov = clamp(p.fov + e.deltaY * (e.ctrlKey ? 0.25 : 0.02), 25, 85); return; }
      look(e.deltaX * 0.003, e.deltaY * 0.003); return;
    }
    if (e.ctrlKey || mouseWheel) { cam3.dist = clamp(cam3.dist * Math.exp((mouseWheel ? Math.sign(e.deltaY) * 0.12 : e.deltaY * 0.012)), 2.2, 30); return; }
    look(e.deltaX * 0.004, e.deltaY * 0.004);
  }, { passive: false });
  let gs = 1;
  dom.addEventListener('gesturestart', (e) => { e.preventDefault(); gs = e.scale; });
  dom.addEventListener('gesturechange', (e) => { e.preventDefault(); if (mode === 'third') cam3.dist = clamp(cam3.dist * gs / e.scale, 2.2, 30); gs = e.scale; });

  // ---------- 每帧 ----------
  const fwd = new THREE.Vector3(), right = new THREE.Vector3(), tv = new THREE.Vector3();
  // 模拟量输入（手机摇杆，touch-controls.js）：x 右 / y 前，-1..1；up 升降；jump 跳一下；sprint 冲刺
  const input = { x: 0, y: 0, up: 0, jump: false, sprint: false };
  function axis() {
    const mv = clamp((keys.has('KeyW') || keys.has('ArrowUp') ? 1 : 0) - (keys.has('KeyS') || keys.has('ArrowDown') ? 1 : 0) + input.y, -1, 1);
    const st = clamp((keys.has('KeyD') ? 1 : 0) - (keys.has('KeyA') ? 1 : 0) + input.x, -1, 1);
    return { mv, st, fast: keys.has('ShiftLeft') || keys.has('ShiftRight') || input.sprint };
  }

  function updateDrone(dt) {
    const { mv, st, fast } = axis();
    const yawIn = (keys.has('KeyE') || keys.has('ArrowRight') ? 1 : 0) - (keys.has('KeyQ') || keys.has('ArrowLeft') ? 1 : 0);
    const up = clamp((keys.has('Space') ? 1 : 0) - (keys.has('KeyC') ? 1 : 0) + input.up, -1, 1);
    drone.yaw -= yawIn * DRONE.yawRate * dt;
    const scale = clamp(camera.position.y / 30, 1, 8) * (fast ? DRONE.boost : 1);
    fwd.set(-Math.sin(drone.yaw), 0, -Math.cos(drone.yaw)); right.set(Math.cos(drone.yaw), 0, -Math.sin(drone.yaw));
    tv.set(0, 0, 0).addScaledVector(fwd, mv).addScaledVector(right, st); if (tv.lengthSq() > 1) tv.normalize();
    tv.multiplyScalar(DRONE.speed * scale); tv.y = up * DRONE.vSpeed * Math.sqrt(scale);
    const has = mv || st || up;
    // 有输入时朝目标速度加速；没输入时按惯性滑一段再刹停（大疆松杆后的手感）
    const rate = has ? DRONE.response : 1.6;
    drone.vel.x = damp(drone.vel.x, has ? tv.x : 0, rate, dt); drone.vel.z = damp(drone.vel.z, has ? tv.z : 0, rate, dt); drone.vel.y = damp(drone.vel.y, has ? tv.y : 0, rate * 1.3, dt);
    camera.position.addScaledVector(drone.vel, dt);
    camera.position.y = clamp(camera.position.y, groundAt(camera.position.x, camera.position.z) + 1.2, 1200);
    drone.vs = dt > 0 ? (camera.position.y - drone.lastY) / dt : 0; drone.lastY = camera.position.y;
    camera.rotation.set(drone.pitch, drone.yaw, 0, 'YXZ');
  }

  function updateWalker(dt) {
    const { mv, st, fast } = axis();
    const yaw = mode === 'first' ? p.yaw : cam3.yaw;
    const sprint = fast && mv > 0;
    let speed = sprint ? WALK.sprint : WALK.walk; if (mv < 0) speed *= 0.82;
    fwd.set(-Math.sin(yaw), 0, -Math.cos(yaw)); right.set(Math.cos(yaw), 0, -Math.sin(yaw));
    tv.set(0, 0, 0).addScaledVector(fwd, mv).addScaledVector(right, st); if (tv.lengthSq() > 1) tv.normalize(); tv.multiplyScalar(speed);
    const has = mv || st, a = (p.onGround ? (has ? WALK.accel : WALK.decel) : (has ? 9 : 0.6)) * dt;
    const dx = tv.x - p.vx, dz = tv.z - p.vz, d = Math.hypot(dx, dz);
    if (d <= a) { p.vx = tv.x; p.vz = tv.z; } else { p.vx += (dx / d) * a; p.vz += (dz / d) * a; }
    // 跳：空格（地面上才有效），落地按下落速度下沉一下
    if ((keys.has('Space') || input.jump) && p.onGround) { p.vy = Math.sqrt(2 * WALK.gravity * WALK.jumpApex); p.onGround = false; }
    input.jump = false;
    const pos = { x: p.x, z: p.z, y: p.y }; walk(pos, p.vx * dt, p.vz * dt); p.x = pos.x; p.z = pos.z;
    // 地面高度：舞台、圆台、延伸台、走道这些台面上走（台阶高度 1.5 米以内直接跨上去，往下是掉下去）
    const ground = groundAt(p.x, p.z, p.y);
    if (p.onGround) { if (ground < p.y - 0.25) { p.onGround = false; p.vy = 0; } else p.y = damp(p.y, ground, 16, dt); }
    if (!p.onGround) {
      p.vy -= WALK.gravity * dt; p.y += p.vy * dt;
      if (p.y <= ground) { const hit = -p.vy; p.y = ground; p.vy = 0; p.onGround = true; p.springV -= Math.min(hit * WALK.landDip, 3.2); }
    }
    // 步伐相位、起伏、侧倾、冲刺视野
    const spd = Math.hypot(p.vx, p.vz); p.sprinting = sprint && spd > WALK.walk * 0.6;
    const stride = p.sprinting ? WALK.stride.sprint : WALK.stride.walk;
    if (p.onGround && spd > 0.5) p.phase += (spd * dt) / stride; else if (p.onGround) p.phase = damp(p.phase, Math.round(p.phase), 8, dt);
    p.bob = damp(p.bob, p.onGround ? clamp(spd / WALK.walk, 0, 1.4) * (p.sprinting ? WALK.bobSprint : 1) : 0, 9, dt);
    const side = p.vx * right.x + p.vz * right.z;
    p.roll = damp(p.roll, (-side / WALK.sprint) * WALK.rollStrafe, 8, dt);
    // 落地弹性子步积分：即使低帧率（dt 较大）也严格收敛，不会触发无限上下弹跳振荡
    const subSteps = Math.max(1, Math.ceil(dt * 120)), hdt = dt / subSteps;
    for (let i = 0; i < subSteps; i++) {
      p.springV += (-p.spring * 150 - p.springV * 22) * hdt;
      p.spring = clamp(p.spring + p.springV * hdt, -WALK.landDipMax, 0.05);
    }
    return spd;
  }

  function placeThirdCamera() {
    const range = Math.cos(cam3.pitch) * cam3.dist;
    const x = cam3.target.x + Math.sin(cam3.yaw) * range, z = cam3.target.z + Math.cos(cam3.yaw) * range;
    camera.position.set(x, Math.max(groundAt(x, z, p.y) + 0.4, cam3.target.y + Math.sin(cam3.pitch) * cam3.dist), z);
    camera.lookAt(cam3.target);
  }

  function update(dt) {
    if (mode === 'drone') { updateDrone(dt); return; }
    const spd = updateWalker(dt);
    const bobY = -Math.cos(p.phase * Math.PI * 2) * WALK.bobY * p.bob, bobX = Math.sin(p.phase * Math.PI) * WALK.bobX * p.bob;
    if (mode === 'first') {
      camera.position.set(p.x + bobX * Math.cos(p.yaw), p.y + WALK.eye + bobY + p.spring, p.z - bobX * Math.sin(p.yaw));
      camera.rotation.set(p.pitch + p.spring * 0.12, p.yaw, p.roll + bobX * 0.35, 'YXZ');
      const fov = p.fov + (p.sprinting ? WALK.fovSprint : 0);
      if (Math.abs(camera.fov - fov) > 0.01) { camera.fov = damp(camera.fov, fov, 7, dt); camera.updateProjectionMatrix(); }
      return;
    }
    // 第三人称：小黑煤球儿朝移动方向慢慢转过去，短腿小手按步伐摆动，起跳收腿举手、落地轻弹回缩
    if (spd > 0.3) { const want = Math.atan2(p.vx, p.vz); let d = want - p.facing; d = Math.atan2(Math.sin(d), Math.cos(d)); p.facing += d * Math.min(1, dt * 10); }
    const bobAmt = p.onGround ? clamp(p.bob, 0, 1.2) : 0;
    const hop = (1 - Math.cos(p.phase * Math.PI * 2)) * 0.022 * bobAmt;
    avatar.position.set(p.x, p.y + hop, p.z); avatar.rotation.y = p.facing;
    // 起跳拉伸、落地轻弹压缩（以脚底 y = 0 为锚点，静止时严格为 1,1,1）
    const airStretch = p.onGround ? 0 : clamp(p.vy * 0.015, -0.05, 0.08);
    const landSquash = p.onGround ? clamp(p.spring * 0.65, -0.11, 0.04) : 0;
    const sy = 1 + airStretch + landSquash;
    const sxz = 1 / Math.sqrt(Math.max(0.82, sy));
    avatar.scale.set(sxz, sy, sxz);
    const phaseSin = Math.sin(p.phase * Math.PI);
    const swing = phaseSin * 0.58 * bobAmt;
    const { legs, arms, headGroup, flowerGroup, bodyRoot } = avatar.userData;
    const airBlend = p.onGround ? 0 : 1;
    const targetLegL = airBlend ? 0.34 : swing;
    const targetLegR = airBlend ? -0.22 : -swing;
    const targetArmL = airBlend ? -0.75 : -swing * 0.8;
    const targetArmR = airBlend ? -0.75 : swing * 0.8;
    legs[0].rotation.x = damp(legs[0].rotation.x, targetLegL, 18, dt);
    legs[1].rotation.x = damp(legs[1].rotation.x, targetLegR, 18, dt);
    arms[0].rotation.x = damp(arms[0].rotation.x, targetArmL, 18, dt);
    arms[1].rotation.x = damp(arms[1].rotation.x, targetArmR, 18, dt);
    if (bodyRoot) bodyRoot.rotation.z = damp(bodyRoot.rotation.z, phaseSin * 0.045 * bobAmt, 14, dt);
    if (headGroup) {
      headGroup.rotation.z = damp(headGroup.rotation.z, -phaseSin * 0.055 * bobAmt, 14, dt);
      headGroup.rotation.x = damp(headGroup.rotation.x, airBlend ? -0.08 : 0.04 * bobAmt, 14, dt);
    }
    if (flowerGroup) {
      const hasHood = MEIQIU_VARIANTS[avatar.userData.variant?.()]?.hat !== 'none';
      flowerGroup.rotation.z = hasHood ? 0 : damp(flowerGroup.rotation.z, phaseSin * 0.14 * bobAmt, 14, dt);
      flowerGroup.rotation.x = hasHood ? 0 : damp(flowerGroup.rotation.x, airBlend ? -0.18 : -0.08 * bobAmt, 14, dt);
    }
    cam3.target.set(damp(cam3.target.x, p.x, 10, dt), damp(cam3.target.y, p.y + AVATAR_TARGET_Y, 10, dt), damp(cam3.target.z, p.z, 10, dt));
    placeThirdCamera();
  }

  // 读数（无人机 HUD、小地图用）
  function telemetry() {
    const hs = mode === 'drone' ? Math.hypot(drone.vel.x, drone.vel.z) : Math.hypot(p.vx, p.vz);
    const yaw = mode === 'drone' ? drone.yaw : mode === 'first' ? p.yaw : cam3.yaw;
    const heading = compassBearing(-Math.sin(yaw), -Math.cos(yaw));
    const pos = mode === 'drone' ? camera.position : { x: p.x, y: p.y, z: p.z };
    return { mode, x: pos.x, z: pos.z, alt: camera.position.y, hs, vs: drone.vs, heading, yaw, pitch: drone.pitch };
  }
  const setAvatarStyle = (variantKey) => avatar.userData.setVariant?.(variantKey);
  return { setMode, mode: () => mode, update, syncFromCamera, teleport, telemetry, avatar, walker: p, input, setAvatarStyle };
}
