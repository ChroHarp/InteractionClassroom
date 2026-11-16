import { createAwardsPanel } from "./awards.js";

// Bounds use percentages of the empty room: left, top, width, height.
const objects = [
  { id: "entry", label: "門邊資訊欄", view: "front", bounds: [13.7, 43, 5.1, 17], description: "這個入口會整理班級資訊與聯絡方式。" },
  { id: "kiosk", label: "觸控螢幕", view: "front", bounds: [18.5, 43, 12, 34] },
  { id: "experiment", label: "實驗桌", view: "work", bounds: [8, 65, 32, 29], description: "研究從一個問題開始，透過實驗、觀察和紀錄找出證據。" },
  { id: "blackboard", label: "黑板", view: "front", bounds: [29, 39, 25, 21], description: "從觀察與提問開始，練習思考、探究與實作。" },
  { id: "math", label: "數學桌", view: "work", bounds: [39, 60, 33, 37], description: "拿起方格紙，先預測圖形怎麼變，再試著說明你發現的規律。" },
  { id: "courses", label: "課程佈告欄", view: "front", bounds: [56, 43, 11, 17], description: "七年級啟發試探、八年級探究實作、九年級適性分流。" },
  { id: "honors", label: "榮譽榜", view: "wall", bounds: [69, 43, 15, 16] },
  { id: "photos", label: "照片牆", view: "wall", bounds: [85, 45, 12, 15], description: "校外參訪、共學與成果分享，都是教室延伸出去的學習現場。" },
  { id: "maker", label: "作品櫃", view: "work", bounds: [75, 61, 21, 29], description: "在這裡看看同學如何把生活中的需求做成可操作的原型。" },
].map(object => {
  const [left, top, width, height] = object.bounds;
  return { ...object, x: left + width / 2, y: top + height / 2 };
});

const cameras = {
  overview: { x: 50, y: 50, wide: 1, narrow: 1 },
  front: { x: 31, y: 45, wide: 1.18, narrow: 1.18 },
  work: { x: 47, y: 66, wide: 1.14, narrow: 1.18 },
  wall: { x: 81, y: 49, wide: 1.38, narrow: 1.27 },
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
let activeObject = null;
let originTrigger = null;
let returning = false;
let honorsFilters = {};
const previousObject = document.querySelector("#previous-object");
const nextObject = document.querySelector("#next-object");
const sceneStatus = document.querySelector("#scene-status");

function makeButton(object, inScene) {
  const button = document.createElement("button");
  button.type = "button";
  button.dataset.object = object.id;
  button.setAttribute("aria-controls", "detail");
  button.setAttribute("aria-expanded", "false");
  if (inScene) {
    button.className = "hotspot";
    const [left, top, width, height] = object.bounds;
    Object.assign(button.style, { left: `${left}%`, top: `${top}%`, width: `${width}%`, height: `${height}%` });
    const art = document.createElement("img");
    art.src = new URL(`./room/${object.id}.webp`, import.meta.url);
    art.alt = "";
    art.draggable = false;
    button.append(art);
    button.setAttribute("aria-label", object.label);
  } else {
    button.textContent = object.label;
  }
  button.addEventListener("click", () => openObject(object, button));
  return button;
}

const entries = objects.map(object => {
  const hotspot = makeButton(object, true);
  const quickLink = makeButton(object, false);
  const marker = document.createElement("span");
  marker.className = "marker";
  marker.setAttribute("aria-hidden", "true");
  marker.style.setProperty("--x", `${object.x}%`);
  marker.style.setProperty("--y", `${object.y}%`);
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
const motionPreference = matchMedia("(prefers-reduced-motion: reduce)");
const sceneAspect = 1672 / 941;
const easing = "cubic-bezier(.2, .75, .22, 1)";

let personalMotionPreference;
let motion = null;
let afterMove = null;

function reducedMotion() {
  return personalMotionPreference ?? motionPreference.matches;
}

const awardsPanelRoot = document.querySelector("#awards-panel");
const awardsPanel = createAwardsPanel(awardsPanelRoot, filters => {
  honorsFilters = filters;
  if (activeObject === honors) history.replaceState(history.state, "", objectHash(honors));
});

const videoPanel = document.querySelector("#video-panel");
const videoStage = document.querySelector("#video-stage");
const videoPlay = document.querySelector("#video-play");
const promoVideo = "https://www.youtube.com/embed/z2E_-Mv_YxM?autoplay=1&playsinline=1";

videoPlay.addEventListener("click", () => {
  const player = document.createElement("iframe");
  player.src = promoVideo;
  player.title = "平興數資宣傳影片";
  player.allow = "accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture; fullscreen";
  player.allowFullscreen = true;
  player.referrerPolicy = "strict-origin-when-cross-origin";
  videoStage.append(player);
  videoPlay.hidden = true;
  player.focus({ preventScroll: true });
});

function stopVideo() {
  videoStage.querySelector("iframe")?.remove();
  videoPlay.hidden = false;
}

function readRoute() {
  const [id, query] = location.hash.slice(1).split("?");
  const object = objects.find(item => item.id === id);
  if (!object) return null;
  const params = new URLSearchParams(query);
  const view = params.get("view");
  return {
    object,
    view: Object.hasOwn(cameras, view) ? view : "overview",
    filters: {
      year: params.get("year") ?? "",
      category: params.get("category") ?? "",
      q: (params.get("q") ?? "").slice(0, 120),
    },
  };
}

function objectHash(object) {
  const params = new URLSearchParams();
  if (activeView !== "overview") params.set("view", activeView);
  if (object === honors) {
    for (const key of ["year", "category", "q"]) {
      if (honorsFilters[key]) params.set(key, honorsFilters[key]);
    }
  }
  return params.size ? `#${object.id}?${params}` : `#${object.id}`;
}

function openObject(object, button, focusDetail = true) {
  if (returning || object === activeObject) return;
  if (activeObject) {
    history.replaceState(history.state, "", objectHash(object));
  } else {
    originTrigger = button;
    honorsFilters = {};
    history.pushState({ ...history.state, classroomTour: true }, "", objectHash(object));
  }
  showObject(object, focusDetail);
}

function leaveRoute() {
  if (!readRoute() || returning) return;
  if (history.state?.classroomTour) {
    returning = true;
    history.back();
  } else {
    history.replaceState(history.state, "", location.pathname + location.search);
  }
}

function syncRoute() {
  returning = false;
  const route = readRoute();
  if (!route) {
    closeDetail(true);
    return;
  }

  if (activeView !== route.view) changeView(route.view, false);
  if (route.object === honors) {
    honorsFilters = route.filters;
    awardsPanel.setFilters(honorsFilters);
  }
  if (activeObject !== route.object) showObject(route.object, true);
}

function adjacentObject(step) {
  const index = objects.indexOf(activeObject);
  if (index === -1) return step === 1 ? objects[0] : objects.at(-1);
  return objects[(index + step + objects.length) % objects.length];
}

function updateNavigation() {
  sceneStatus.textContent = activeObject
    ? `${activeObject.label} · ${objects.indexOf(activeObject) + 1} / ${objects.length}`
    : "選擇教室物件";
  previousObject.setAttribute("aria-label", `上一個物件：${adjacentObject(-1).label}`);
  nextObject.setAttribute("aria-label", `下一個物件：${adjacentObject(1).label}`);
  for (const { object, hotspot, quickLink } of entries) {
    const expanded = String(object === activeObject);
    hotspot.setAttribute("aria-expanded", expanded);
    quickLink.setAttribute("aria-expanded", expanded);
    if (object === activeObject && !quickLink.hidden) {
      const rail = entranceList.getBoundingClientRect();
      const item = quickLink.getBoundingClientRect();
      entranceList.scrollLeft += Math.min(0, item.left - rail.left - 4)
        + Math.max(0, item.right - rail.right + 4);
    }
  }
}

function showObject(object, focusDetail) {
  stopVideo();
  activeObject = object;
  const isVideo = object.id === "kiosk";
  const isHonors = object === honors;
  const detailHadFocus = detail.contains(document.activeElement) || document.activeElement === exitFocus;
  detail.hidden = true;
  exitFocus.hidden = false;
  hotspotList.inert = true;
  if (focusDetail || detailHadFocus) exitFocus.focus({ preventScroll: true });
  updateNavigation();
  detailTitle.textContent = object.label;
  detailCopy.hidden = isHonors || isVideo;
  videoPanel.hidden = !isVideo;
  detailCopy.textContent = object.description ?? "";
  awardsPanelRoot.hidden = !isHonors;
  detail.dataset.object = object.id;

  if (isHonors) {
    awardsPanel.setFilters(honorsFilters);
    awardsPanel.load();
  }
  moveCamera(570, () => {
    detail.toggleAttribute("data-focus-animation", !reducedMotion());
    detail.hidden = false;
    detail.scrollTop = 0;
    if (document.activeElement === exitFocus) detailTitle.focus({ preventScroll: true });
    exitFocus.hidden = true;
  });
}

function closeDetail(restoreFocus, returnCamera = true) {
  if (!activeObject) return;
  const selected = entries.find(entry => entry.object === activeObject);
  const origin = originTrigger;
  stopVideo();
  activeObject = null;
  originTrigger = null;
  detail.hidden = true;
  exitFocus.hidden = true;
  updateNavigation();

  const activeControl = controls.find(control => control.dataset.view === activeView);
  const finish = () => {
    hotspotList.inert = false;
    if (restoreFocus && document.activeElement === activeControl) {
      const fallback = compact.matches ? selected.quickLink : selected.hotspot;
      const candidate = origin?.getClientRects().length ? origin : fallback;
      if (candidate.getClientRects().length && !candidate.disabled) candidate.focus({ preventScroll: true });
    }
  };

  if (restoreFocus) activeControl.focus({ preventScroll: true });
  if (returnCamera) moveCamera(470, finish);
  else finish();
}

function cameraPose() {
  const { clientWidth: width, clientHeight: height } = viewport;
  const narrow = compact.matches;
  const camera = activeObject ?? cameras[activeView];
  const isHonors = activeObject === honors;
  const worldWidth = world.offsetWidth;
  const worldHeight = worldWidth / sceneAspect;
  const scale = activeObject
    ? (narrow ? (isHonors ? 1.45 : 1.21) : (isHonors ? 2.76 : 2.12))
    : (narrow ? camera.narrow : camera.wide);
  const maxX = Math.max(0, (worldWidth * scale - width) / 2);
  const maxY = Math.max(0, (worldHeight * scale - height) / 2);
  const anchorX = activeObject && !narrow ? 0.34 : 0.5;
  const anchorY = activeObject && narrow ? 0.32 : 0.5;
  const x = (0.5 - camera.x / 100) * worldWidth * scale + (anchorX - 0.5) * width;
  const y = (0.5 - camera.y / 100) * worldHeight * scale + (anchorY - 0.5) * height;
  const offsetX = Math.max(-maxX, Math.min(maxX, x));
  const offsetY = Math.max(-maxY, Math.min(maxY, y));

  return {
    world: `translate(${offsetX - worldWidth / 2}px, ${offsetY - worldHeight / 2}px) scale(${scale})`,
    foreground: activeObject && !reducedMotion()
      ? `translate(${(50 - camera.x) * 0.006}%, ${(50 - camera.y) * 0.008}%)`
      : "translate(0%, 0%)",
  };
}

const pointerRig = document.querySelector("#pointer-rig");
let pointerFrame = 0;
let pointerPose = "";

function resetPointerView() {
  if (pointerFrame) cancelAnimationFrame(pointerFrame);
  pointerFrame = 0;
  pointerPose = "";
  pointerRig.style.removeProperty("transform");
}

viewport.addEventListener("pointermove", event => {
  if (event.pointerType !== "mouse" || reducedMotion() || motion) return;

  const { left, top, width, height } = viewport.getBoundingClientRect();
  const horizontal = Math.max(-1, Math.min(1, 2 * (event.clientX - left) / width - 1));
  const vertical = Math.max(-1, Math.min(1, 2 * (event.clientY - top) / height - 1));
  const x = -horizontal * Math.min(8, width * 0.009);
  const y = -vertical * Math.min(5, height * 0.009);
  // Slight overscan keeps the artwork covering the viewport at full drift.
  pointerPose = `translate(${x.toFixed(2)}px, ${y.toFixed(2)}px) scale(1.02)`;

  if (!pointerFrame) {
    pointerFrame = requestAnimationFrame(() => {
      pointerFrame = 0;
      pointerRig.style.transform = pointerPose;
    });
  }
}, { passive: true });

viewport.addEventListener("pointerleave", resetPointerView);
viewport.addEventListener("pointercancel", resetPointerView);
viewport.addEventListener("pointerdown", event => {
  if (event.pointerType !== "mouse") resetPointerView();
}, { passive: true });

function cancelMotion() {
  if (!motion) return;
  const previous = motion;
  motion = null;
  previous.forEach(animation => animation.cancel());
}

function moveCamera(duration = 0, onArrival = null) {
  resetPointerView();
  const pose = cameraPose();
  const layers = [[world, pose.world], [hotspotList, pose.foreground]];
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
    hotspot.disabled = outOfView;
    quickLink.hidden = outOfView;
  }
  moveCamera(animate ? 470 : 0);
}

function refreshMotion() {
  viewport.dataset.pointerMotion = reducedMotion() ? "off" : "on";
  motionOption.setAttribute("aria-pressed", String(reducedMotion()));
  if (reducedMotion()) detail.removeAttribute("data-focus-animation");
  moveCamera(0, afterMove);
}

for (const control of controls) {
  control.addEventListener("click", () => {
    changeView(control.dataset.view);
    leaveRoute();
  });
}
function closeFromControl() {
  closeDetail(true);
  leaveRoute();
}

for (const button of [back, exitFocus]) {
  button.addEventListener("click", closeFromControl);
}
previousObject.addEventListener("click", () => openObject(adjacentObject(-1), previousObject, false));
nextObject.addEventListener("click", () => openObject(adjacentObject(1), nextObject, false));
motionOption.addEventListener("click", () => {
  personalMotionPreference = !reducedMotion();
  refreshMotion();
});
motionPreference.addEventListener("change", refreshMotion);
document.addEventListener("keydown", event => {
  if (event.key === "Escape" && activeObject) closeFromControl();
  if (!activeObject || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey ||
      event.target.matches("input, select, textarea, [contenteditable]")) return;
  const step = { ArrowLeft: -1, ArrowRight: 1 }[event.key];
  if (step) {
    event.preventDefault();
    const arrow = step === -1 ? previousObject : nextObject;
    arrow.focus({ preventScroll: true });
    openObject(adjacentObject(step), arrow, false);
  }
});
new ResizeObserver(() => moveCamera(0, afterMove)).observe(viewport);

window.addEventListener("popstate", syncRoute);
window.addEventListener("hashchange", syncRoute);

changeView("overview", false);
updateNavigation();
refreshMotion();
syncRoute();
