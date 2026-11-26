// 加载画面：夜空里的粒子烟花（canvas 画粒子，GSAP 的 ticker 驱动、delayedCall 排节奏）。
//   · 金色菊花弹：一圈细长的金色拖尾，星点闪烁，末端有的变红，慢慢减速、下垂、熄灭；
//   · 柳树弹：拖尾更长、下垂更多的暗金色；
//   · 舞台后面斜着扇形打出去的红橙色彗星（带亮头的短拖尾）；
//   · 白色碎闪的小球、红色圆环；
//   · 底下被舞台灯照成黄绿色的烟。
// 主程序搭场景时一段段让出主线程（await step(...)），动画才跑得起来；全部搭完、第一帧画出来后 done() 收尾淡出。
import { gsap } from 'gsap';

const rand = (a, b) => a + Math.random() * (b - a);
const pick = (a) => a[Math.floor(Math.random() * a.length)];
// 等两帧（让动画和文字画出来）；页面在后台时 requestAnimationFrame 不触发，用定时器兜底，加载不会卡住
const nextFrame = () => new Promise((r) => { let done = false; const go = () => { if (!done) { done = true; r(); } }; requestAnimationFrame(() => requestAnimationFrame(go)); setTimeout(go, 120); });

// 颜色（照片取色）：金 → 暗橙；红尖；白闪
const GOLD = [[255, 214, 140], [255, 196, 110], [250, 180, 95]], EMBER = [200, 110, 45], RED = [255, 70, 50], WHITE = [255, 248, 230];

export function createLoader() {
  const root = document.getElementById('loader');
  if (!root || new URLSearchParams(location.search).get('loader') === '0') { root?.remove(); return { step: () => Promise.resolve(), done() {} }; }
  const sky = root.querySelector('.ldSky'), bar = root.querySelector('.ldBar i'), text = root.querySelector('.ldText');
  const cv = document.createElement('canvas'); sky.appendChild(cv);
  const g = cv.getContext('2d');
  let W = 0, H = 0, dpr = 1;
  const resize = () => { dpr = Math.min(2, devicePixelRatio || 1); W = sky.clientWidth; H = sky.clientHeight; cv.width = W * dpr; cv.height = H * dpr; cv.style.width = W + 'px'; cv.style.height = H + 'px'; g.setTransform(dpr, 0, 0, dpr, 0, 0); g.fillStyle = '#05060d'; g.fillRect(0, 0, W, H); };
  resize(); addEventListener('resize', resize);
  const S = () => Math.min(W, H * 1.6) / 900;   // 按屏幕大小缩放烟花尺寸

  const parts = [], flashes = [];
  // 一颗星：位置、速度、寿命、颜色；drag 空气阻力（每秒剩下的比例），grav 下垂，tip 末段变的颜色，flick 闪烁
  const star = (o) => parts.push({ px: o.x, py: o.y, age: 0, drag: 0.35, grav: 60, w: 1.3, flick: 0, tip: null, head: 0, ...o });

  function chrysanthemum(x, y, { n = 110, speed = 210, life = 2.1, red = 0.3, willow = false } = {}) {
    const s = S(), col = pick(GOLD);
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 + rand(-0.06, 0.06), v = speed * s * (Math.random() < 0.25 ? rand(0.55, 0.8) : rand(0.85, 1.1));   // 长短不齐，边缘毛糙
      star({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: life * rand(0.8, 1.1) * (willow ? 1.6 : 1), col, tip: Math.random() < red ? RED : willow ? EMBER : null,
        drag: willow ? 0.25 : 0.33, grav: (willow ? 95 : 55) * s, flick: 0.6, w: willow ? 1 : 1.15 });
    }
    flashes.push({ x, y, r: 150 * s, a: 0.3, col: [255, 210, 130] });
  }
  function strobe(x, y, ring = false) {
    const s = S(), n = ring ? 46 : 28;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2, v = (ring ? 150 : rand(20, 70)) * s;
      star({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: ring ? 1.3 : rand(1.2, 1.8), col: ring ? RED : WHITE, drag: ring ? 0.2 : 0.5, grav: 25 * s, flick: ring ? 0.2 : 1, w: ring ? 1.6 : 1.8 });
    }
    flashes.push({ x, y, r: 90 * s, a: 0.5, col: ring ? [255, 90, 70] : [255, 250, 235] });
  }
  // 升空：一颗带金色火星拖尾的弹，到顶炸开
  function shell(x = W * rand(0.18, 0.82), top = H * rand(0.16, 0.4), kind = pick(['chry', 'chry', 'chry', 'willow', 'strobe', 'ring'])) {
    const s = S(), y0 = H * 0.98, t = rand(0.9, 1.2);
    parts.push({ x, y: y0, px: x, py: y0, vx: rand(-15, 15) * s, vy: -((y0 - top) / t) * 1.25, drag: 0.55, grav: 0, life: t, age: 0, col: [255, 200, 130], w: 1, alpha: 0.55, flick: 0.5, onEnd: (p) => {   // 升空：一道细细的淡金线
      if (kind === 'willow') chrysanthemum(p.x, p.y, { willow: true, n: 80, speed: 170, life: 2.2, red: 0 });
      else if (kind === 'strobe') strobe(p.x, p.y);
      else if (kind === 'ring') strobe(p.x, p.y, true);
      else chrysanthemum(p.x, p.y, { n: Math.round(rand(80, 130)), speed: rand(170, 240), red: rand(0, 0.45) });
    } });
  }
  // 舞台后面扇形打出去的一排红橙彗星
  function comets(cx = W * rand(0.35, 0.65)) {
    const s = S(), n = 9;
    for (let i = 0; i < n; i++) {
      const a = -Math.PI / 2 + (i / (n - 1) - 0.5) * 1.9, v = rand(420, 520) * s;
      star({ x: cx + (i - n / 2) * 6 * s, y: H * 0.92, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: rand(0.9, 1.25), col: [255, 120, 60], drag: 0.4, grav: 140 * s, w: 2, head: 2.6, flick: 0.1 });
    }
  }

  // 每帧：拖尾靠每帧盖一层半透明夜色；粒子用叠加画线段（上一帧位置 → 这一帧位置）
  const tick = (time, dtMs) => {
    const dt = Math.min(0.05, dtMs / 1000);
    g.globalCompositeOperation = 'source-over';
    g.fillStyle = 'rgba(5,6,13,0.2)'; g.fillRect(0, 0, W, H);
    const haze = g.createLinearGradient(0, H * 0.62, 0, H);   // 底下被舞台灯照亮的黄绿色烟
    haze.addColorStop(0, 'rgba(120,140,40,0)'); haze.addColorStop(1, 'rgba(120,140,40,0.05)'); g.fillStyle = haze; g.fillRect(0, H * 0.62, W, H * 0.38);
    g.globalCompositeOperation = 'lighter';
    for (let i = flashes.length - 1; i >= 0; i--) {   // 炸开一瞬照亮周围的烟
      const f = flashes[i], gr = g.createRadialGradient(f.x, f.y, 0, f.x, f.y, f.r);
      gr.addColorStop(0, `rgba(${f.col},${f.a * 0.35})`); gr.addColorStop(1, `rgba(${f.col},0)`); g.fillStyle = gr; g.fillRect(f.x - f.r, f.y - f.r, f.r * 2, f.r * 2);
      f.a -= dt * 1.4; if (f.a <= 0) flashes.splice(i, 1);
    }
    g.lineCap = 'round';
    for (let i = parts.length - 1; i >= 0; i--) {
      const p = parts[i]; p.age += dt;
      if (p.age >= p.life) { parts.splice(i, 1); p.onEnd?.(p); continue; }
      const k = Math.pow(p.drag, dt); p.vx *= k; p.vy = p.vy * k + p.grav * dt;
      p.px = p.x; p.py = p.y; p.x += p.vx * dt; p.y += p.vy * dt;
      const t = p.age / p.life, fade = t < 0.7 ? 1 : 1 - (t - 0.7) / 0.3;
      const a = (p.alpha ?? 1) * fade * (p.flick && t > 0.35 ? 1 - p.flick * Math.random() * 0.8 : 1);
      const c = p.tip && t > 0.55 ? p.tip : p.col;
      g.strokeStyle = `rgba(${c[0]},${c[1]},${c[2]},${a})`; g.lineWidth = p.w;
      g.beginPath(); g.moveTo(p.px, p.py); g.lineTo(p.x, p.y); g.stroke();
      if (p.head || (p.flick && Math.random() < 0.08 * p.flick)) { g.fillStyle = `rgba(255,250,235,${a})`; g.beginPath(); g.arc(p.x, p.y, (p.head || 1.2) * 0.8, 0, Math.PI * 2); g.fill(); }
    }
  };
  gsap.ticker.add(tick);

  // 节奏：一阵阵放——单发、两三发一起、偶尔一排彗星
  let alive = true;
  const show = () => {
    if (!alive) return;
    const k = Math.random();
    if (k < 0.18) comets();
    else if (k < 0.5) { const x = W * rand(0.3, 0.7); for (let i = 0; i < 3; i++) gsap.delayedCall(i * 0.22, () => shell(x + (i - 1) * W * 0.12, H * rand(0.18, 0.34))); }
    else shell();
    gsap.delayedCall(rand(0.5, 1.0), show);
  };
  shell(W * 0.38, H * 0.26, 'chry'); gsap.delayedCall(0.3, () => shell(W * 0.62, H * 0.3, 'chry')); gsap.delayedCall(0.9, show);
  gsap.fromTo(root.querySelector('.ldTitle'), { y: 12, opacity: 0.35 }, { y: 0, opacity: 1, duration: 1.1, ease: 'power3.out' });

  return {
    // 进度 0..1、当前在做什么；等两帧让动画和文字画出来
    async step(label, frac) {
      text.textContent = label;
      gsap.to(bar, { scaleX: frac, duration: 0.5, ease: 'power2.out' });
      await nextFrame();
    },
    done() {
      if (new URLSearchParams(location.search).get('loader') === 'hold') { text.textContent = '（?loader=hold：停在加载画面看烟花）'; return; }
      text.textContent = '入场';
      gsap.to(bar, { scaleX: 1, duration: 0.3 });
      comets(W * 0.5);   // 收尾：一排彗星 + 一排齐放
      for (let i = 0; i < 5; i++) gsap.delayedCall(0.25 + i * 0.12, () => shell(W * (0.18 + i * 0.16), H * rand(0.18, 0.3), 'chry'));
      gsap.to(root, { opacity: 0, duration: 0.9, delay: 1.8, ease: 'power2.inOut', onComplete: () => { alive = false; gsap.ticker.remove(tick); removeEventListener('resize', resize); root.remove(); } });
    },
  };
}
