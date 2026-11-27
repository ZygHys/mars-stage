const IS_TOUCH = typeof window !== "undefined" && (new URLSearchParams(location.search).get("touch") === "1" || matchMedia("(pointer: coarse)").matches || navigator.maxTouchPoints > 0);
function createTouchControls({ parent, nav }) {
  const root = document.createElement("div");
  root.className = "touchUI";
  root.innerHTML = '<div class="tcStick" aria-label="移动摇杆"><div class="tcKnob"></div></div><div class="tcBtns"><button type="button" class="tcUp" aria-label="上升">▲</button><button type="button" class="tcDown" aria-label="下降">▼</button><button type="button" class="tcJump" aria-label="跳">跳</button></div>';
  parent.appendChild(root);
  const stick = root.querySelector(".tcStick"), knob = root.querySelector(".tcKnob"), I = nav.input;
  let id = null, cx = 0, cy = 0, R = 1;
  const set = (dx, dy) => {
    const d = Math.hypot(dx, dy), k = d > R ? R / d : 1, x = dx * k, y = dy * k;
    knob.style.transform = `translate(${x}px, ${y}px)`;
    const m = Math.min(1, d / R), dead = 0.12, s = m < dead ? 0 : (m - dead) / (1 - dead);
    I.x = d ? dx / d * s : 0;
    I.y = d ? -dy / d * s : 0;
    I.sprint = m > 0.96;
  };
  stick.addEventListener("pointerdown", (e) => {
    e.preventDefault();
    id = e.pointerId;
    const r = stick.getBoundingClientRect();
    cx = r.left + r.width / 2;
    cy = r.top + r.height / 2;
    R = r.width * 0.38;
    try {
      stick.setPointerCapture(id);
    } catch {
    }
    set(e.clientX - cx, e.clientY - cy);
    stick.classList.add("on");
  });
  stick.addEventListener("pointermove", (e) => {
    if (e.pointerId === id) set(e.clientX - cx, e.clientY - cy);
  });
  const end = (e) => {
    if (e.pointerId !== id) return;
    id = null;
    set(0, 0);
    stick.classList.remove("on");
  };
  stick.addEventListener("pointerup", end);
  stick.addEventListener("pointercancel", end);
  const hold = (el, v) => {
    el.addEventListener("pointerdown", (e) => {
      e.preventDefault();
      try {
        el.setPointerCapture(e.pointerId);
      } catch {
      }
      I.up = v;
      el.classList.add("on");
    });
    const up = () => {
      I.up = 0;
      el.classList.remove("on");
    };
    el.addEventListener("pointerup", up);
    el.addEventListener("pointercancel", up);
  };
  hold(root.querySelector(".tcUp"), 1);
  hold(root.querySelector(".tcDown"), -1);
  root.querySelector(".tcJump").addEventListener("pointerdown", (e) => {
    e.preventDefault();
    I.jump = true;
  });
  root.addEventListener("contextmenu", (e) => e.preventDefault());
  return root;
}
export {
  IS_TOUCH,
  createTouchControls
};
