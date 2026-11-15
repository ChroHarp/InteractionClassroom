const objects = [
  { id: "blackboard", mask: "37.2% 25.2%, 65.2% 25.2%, 65.2% 49.6%, 37.2% 49.6%", label: "黑板", x: 241, y: 99, view: "front", description: "從觀察與提問開始，練習思考、探究與實作。" },
  { id: "courses", mask: "65.6% 28.5%, 73.6% 28.5%, 73.6% 46.1%, 65.6% 46.1%", label: "課程佈告欄", x: 333, y: 98, view: "front", description: "七年級啟發試探、八年級探究實作、九年級適性分流。" },
  { id: "honors", mask: "73.6% 22.1%, 86.6% 22.1%, 86.6% 48.1%, 73.6% 48.1%", label: "榮譽榜", x: 386, y: 94, view: "wall", description: "既有網站的本機資料快照收錄 2016–2026 年共 88 筆獎項紀錄。既有線上來源目前無法開啟。" },
  { id: "experiment", mask: "7.2% 71.5%, 12.8% 64.2%, 15.7% 64.2%, 15.7% 59%, 18.2% 59%, 19.5% 64.1%, 19.9% 57.5%, 24.1% 56.5%, 27.4% 56.5%, 28.1% 64%, 34% 64%, 33.9% 70.6%, 30.3% 89.8%, 7.3% 89.8%", label: "實驗桌", x: 99, y: 193, view: "work", description: "研究從一個問題開始，透過實驗、觀察和紀錄找出證據。" },
  { id: "maker", mask: "72.1% 48.7%, 97.4% 48.7%, 97.4% 84.2%, 73.1% 85.2%, 72.1% 82%", label: "作品櫃", x: 414, y: 170, view: "work", description: "在這裡看看同學如何把生活中的需求做成可操作的原型。" },
  { id: "math", mask: "43.9% 68%, 44.4% 62%, 48.3% 61%, 50.3% 68%, 57% 68%, 57% 62.3%, 60.8% 60.5%, 61.1% 68%, 63.7% 68%, 66.7% 79.1%, 66.5% 80.5%, 65.3% 96%, 39.2% 96%, 39.2% 80.2%, 38.1% 80.2%, 38.1% 77.2%, 41.1% 68%", label: "數學桌", x: 244, y: 203, view: "work", description: "拿起方格紙，先預測圖形怎麼變，再試著說明你發現的規律。" },
  { id: "photos", mask: "86.5% 26%, 92.3% 26%, 92.6% 28.5%, 97.7% 28.5%, 97.7% 42.6%, 93.8% 42.6%, 93.4% 47.5%, 88.7% 47.5%, 88.7% 42%, 86.7% 42%", label: "照片牆", x: 424, y: 111, view: "wall", description: "校外參訪、共學與成果分享，都是教室延伸出去的學習現場。" },
  { id: "entry", mask: "6.7% 31%, 15.3% 31%, 15.3% 65.4%, 6.7% 65.4%", label: "門邊資訊欄", x: 52, y: 133, view: "front", description: "這個入口會整理班級資訊與聯絡方式。" },
];

const cameras = {
  overview: { x: 240, y: 135, wide: 1, narrow: 1 },
  front: { x: 210, y: 97, wide: 1.12, narrow: 1.26 },
  work: { x: 246, y: 179, wide: 1.12, narrow: 1.23 },
  wall: { x: 381, y: 109, wide: 1.45, narrow: 1.62 },
};

const viewport = document.querySelector("#viewport");
const world = document.querySelector("#world");
const hotspotList = document.querySelector("#hotspots");
const entranceList = document.querySelector("#entrances");
const detail = document.querySelector("#detail");
const detailTitle = document.querySelector("#detail-title");
const detailCopy = document.querySelector("#detail-copy");
const back = document.querySelector("#back");
const controls = [...document.querySelectorAll("[data-view]")];
const compact = matchMedia("(max-width: 720px)");

let activeView = "overview";
let trigger = null;

function makeButton(object, inScene) {
  const button = document.createElement("button");
  button.type = "button";
  button.dataset.object = object.id;
  button.setAttribute("aria-controls", "detail");
  button.setAttribute("aria-expanded", "false");
  if (inScene) {
    button.className = "hotspot";
    button.style.setProperty("--shape", `polygon(${object.mask})`);
    button.setAttribute("aria-label", object.label);
  } else {
    button.textContent = object.label;
  }
  button.addEventListener("click", () => showObject(object, button));
  return button;
}

const entries = objects.map(object => {
  const hotspot = makeButton(object, true);
  const quickLink = makeButton(object, false);
  const marker = document.createElement("span");
  marker.className = "marker";
  marker.setAttribute("aria-hidden", "true");
  marker.style.setProperty("--x", `${100 * object.x / 480}%`);
  marker.style.setProperty("--y", `${100 * object.y / 270}%`);
  const pin = document.createElement("span");
  pin.className = "pin";
  const label = document.createElement("span");
  label.className = "label";
  label.textContent = object.label;
  marker.append(pin, label);
  hotspotList.append(hotspot, marker);
  entranceList.append(quickLink);
  return { object, hotspot, quickLink };
});

const honors = objects.find(object => object.id === "honors");
const exitFocus = document.querySelector("#exit-focus");
const motionOption = document.querySelector("#motion-option");
const honorLayer = document.querySelector("#honor-layer");
const motionPreference = matchMedia("(prefers-reduced-motion: reduce)");
const sceneWidth = 480;
const sceneHeight = 270;
const sceneAspect = 1672 / 941;
const easing = "cubic-bezier(.2, .75, .22, 1)";

world.style.setProperty("--honor-shape", `polygon(${honors.mask})`);

let personalMotionPreference;
let motion = null;
let afterMove = null;

function reducedMotion() {
  return personalMotionPreference ?? motionPreference.matches;
}

function showObject(object, button) {
  const wasHonors = trigger?.dataset.object === honors.id;
  const isHonors = object.id === honors.id;
  trigger = button;
  for (const entry of entries) {
    const expanded = String(entry.object === object);
    entry.hotspot.setAttribute("aria-expanded", expanded);
    entry.quickLink.setAttribute("aria-expanded", expanded);
  }
  detailTitle.textContent = object.label;
  detailCopy.textContent = object.description;
  detail.dataset.object = object.id;

  if (isHonors) {
    if (wasHonors) return;
    detail.hidden = true;
    exitFocus.hidden = false;
    hotspotList.inert = true;
    if (button.matches(":focus")) exitFocus.focus({ preventScroll: true });
    moveCamera(540, () => {
      exitFocus.hidden = true;
      revealDetail(true);
    });
    return;
  }

  exitFocus.hidden = true;
  hotspotList.inert = false;
  if (wasHonors || motion) moveCamera(wasHonors ? 380 : 0);
  revealDetail(false);
}

function revealDetail(animate) {
  detail.toggleAttribute("data-focus-animation", animate && !reducedMotion());
  detail.hidden = false;
  detailTitle.focus({ preventScroll: !compact.matches });
}

function closeDetail(restoreFocus, returnCamera = true) {
  if (!trigger) return;
  const selected = entries.find(entry => entry.object.id === trigger.dataset.object);
  const wasHonors = selected.object === honors;
  trigger = null;
  detail.hidden = true;
  exitFocus.hidden = true;
  for (const entry of entries) {
    entry.hotspot.setAttribute("aria-expanded", "false");
    entry.quickLink.setAttribute("aria-expanded", "false");
  }

  const finish = () => {
    hotspotList.inert = false;
    if (restoreFocus) {
      const origin = compact.matches ? selected.quickLink : selected.hotspot;
      origin.focus({ preventScroll: !compact.matches });
    }
  };

  if (wasHonors && returnCamera) {
    const activeControl = controls.find(control => control.dataset.view === activeView);
    if (restoreFocus) activeControl.focus({ preventScroll: true });
    moveCamera(390, finish);
  } else {
    finish();
  }
}

function cameraPose() {
  const { clientWidth: width, clientHeight: height } = viewport;
  const isHonors = trigger?.dataset.object === honors.id;
  const narrow = compact.matches;
  const camera = isHonors ? { x: honors.x, y: honors.y, wide: 3, narrow: 3.04 } : cameras[activeView];
  const scale = narrow ? camera.narrow : camera.wide;
  const worldHeight = width / sceneAspect;
  const maxX = Math.max(0, (width * scale - width) / 2);
  const maxY = Math.max(0, (worldHeight * scale - height) / 2);
  const anchorX = isHonors && !narrow ? 0.36 : 0.5;
  const x = (0.5 - camera.x / sceneWidth) * width * scale + (anchorX - 0.5) * width;
  const y = (0.5 - camera.y / sceneHeight) * worldHeight * scale;
  const offsetX = Math.max(-maxX, Math.min(maxX, x));
  const offsetY = Math.max(-maxY, Math.min(maxY, y));

  return {
    world: `translate(${offsetX - width / 2}px, ${offsetY - worldHeight / 2}px) scale(${scale})`,
    honor: isHonors && !reducedMotion() ? "translate(0.12%, -0.16%)" : "translate(0%, 0%)",
  };
}

function cancelMotion() {
  if (!motion) return;
  const previous = motion;
  motion = null;
  previous.forEach(animation => animation.cancel());
}

function moveCamera(duration = 0, onArrival = null) {
  const pose = cameraPose();
  const layers = [[world, pose.world], [honorLayer, pose.honor]];
  const animate = duration > 0 && !reducedMotion();
  const from = animate ? layers.map(([node]) => getComputedStyle(node).transform) : [];
  cancelMotion();
  afterMove = onArrival;
  layers.forEach(([node, transform]) => { node.style.transform = transform; });

  if (!animate) {
    afterMove = null;
    onArrival?.();
    return;
  }

  const animations = layers.map(([node, transform], index) => node.animate(
    [{ transform: from[index] }, { transform }],
    { duration, easing },
  ));
  motion = animations;
  animations[0].finished.then(() => {
    if (motion !== animations) return;
    motion = null;
    afterMove = null;
    onArrival?.();
  }, () => {});
}

function changeView(view, animate = true) {
  closeDetail(false, false);
  hotspotList.inert = false;
  activeView = view;
  viewport.dataset.view = view;
  for (const control of controls) {
    control.setAttribute("aria-pressed", String(control.dataset.view === view));
  }
  for (const { object, hotspot, quickLink } of entries) {
    const outOfView = view !== "overview" && object.view !== view;
    hotspot.hidden = outOfView;
    quickLink.hidden = outOfView;
  }
  moveCamera(animate ? 470 : 0);
}

function refreshMotion() {
  motionOption.setAttribute("aria-pressed", String(reducedMotion()));
  if (reducedMotion()) detail.removeAttribute("data-focus-animation");
  moveCamera(0, afterMove);
}

for (const control of controls) {
  control.addEventListener("click", () => changeView(control.dataset.view));
}
for (const button of [back, exitFocus]) {
  button.addEventListener("click", () => closeDetail(true));
}
motionOption.addEventListener("click", () => {
  personalMotionPreference = !reducedMotion();
  refreshMotion();
});
motionPreference.addEventListener("change", refreshMotion);
document.addEventListener("keydown", event => {
  if (event.key === "Escape" && trigger) closeDetail(true);
});
new ResizeObserver(() => moveCamera(0, afterMove)).observe(viewport);

changeView("overview", false);
refreshMotion();
