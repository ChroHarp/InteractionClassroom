import { createAwardsPanel } from "./awards.js";
import { createClassroomScene3D } from "./scene-3d.js";

// Keep object catalog order and IDs unchanged for keyboard cycling, bottom rail, and hash routing.
const objects = [
  { id: "entry", label: "最新消息", view: "front" },
  { id: "kiosk", label: "數資班介紹影片", view: "front" },
  {
    id: "experiment", label: "科學探究", view: "work",
    description: "研究從一個問題開始，透過實驗、觀察和紀錄找出證據。",
  },
  {
    id: "blackboard", label: "學習理念", view: "front",
    description: "從觀察與提問開始，練習思考、探究與實作。",
  },
  {
    id: "math", label: "數學探索", view: "work",
    description: "拿起方格紙，先預測圖形怎麼變，再試著說明你發現的規律。",
  },
  {
    id: "courses", label: "三年課程", view: "front",
    description: "七年級啟發試探、八年級探究實作、九年級適性分流。",
  },
  { id: "honors", label: "榮譽榜", view: "wall" },
  {
    id: "photos", label: "活動照片", view: "wall",
    description: "校外參訪、共學與成果分享，都是教室延伸出去的學習現場。",
  },
  {
    id: "maker", label: "創客作品", view: "work",
    description: "在這裡看看同學如何把生活中的需求做成可操作的原型。",
  },
];

const validViews = new Set(["overview", "front", "work", "wall"]);

const viewport = document.querySelector("#viewport");
const scene3d = createClassroomScene3D(viewport, objects);
viewport.dataset.scene = "3d";

const hotspotList = document.querySelector("#hotspots");
const entranceList = document.querySelector("#entrances");
const detail = document.querySelector("#detail");
detail.addEventListener("scroll", () => {
  detail.classList.toggle("is-scrolled", detail.scrollTop > 4);
}, { passive: true });
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
    const glow = document.createElement("span");
    glow.className = "hotspot-glow";
    const shape = document.createElement("span");
    shape.className = "hotspot-shape";
    glow.append(shape);

    const title = document.createElement("span");
    title.className = "hotspot-title";
    title.textContent = object.label;
    button.append(glow, title);

    const highlight = () => scene3d.setHighlighted(object.id);
    const unhighlight = () => scene3d.setHighlighted(null);
    button.addEventListener("pointerenter", highlight);
    button.addEventListener("pointerleave", unhighlight);
    button.addEventListener("focus", highlight);
    button.addEventListener("blur", unhighlight);
  } else {
    button.textContent = object.label;
    button.addEventListener("pointerenter", () => scene3d.setHighlighted(object.id));
    button.addEventListener("pointerleave", () => scene3d.setHighlighted(null));
  }
  button.addEventListener("click", () => openObject(object, button));
  return button;
}

const entries = objects.map(object => {
  const hotspot = makeButton(object, true);
  const quickLink = makeButton(object, false);
  hotspotList.append(hotspot);
  entranceList.append(quickLink);
  return { object, hotspot, quickLink, title: hotspot.querySelector(".hotspot-title") };
});

scene3d.onHotspotsProject(projected => {
  for (const { object, hotspot, title } of entries) {
    const box = projected[object.id];
    if (!box || !box.visible) {
      hotspot.style.visibility = "hidden";
      continue;
    }
    hotspot.style.visibility = "";
    hotspot.style.left = `${box.left.toFixed(1)}px`;
    hotspot.style.top = `${box.top.toFixed(1)}px`;
    hotspot.style.width = `${box.width.toFixed(1)}px`;
    hotspot.style.height = `${box.height.toFixed(1)}px`;
    hotspot.style.zIndex = String(Math.max(1, Math.round((1 - box.depth) * 100)));
    title.style.left = `${box.titleX.toFixed(1)}%`;
    title.style.top = `${box.titleY.toFixed(1)}%`;
  }
});

const honors = objects.find(object => object.id === "honors");
const exitFocus = document.querySelector("#exit-focus");
const motionPreference = matchMedia("(prefers-reduced-motion: reduce)");

let detailRevealTimer = 0;

function clearDetailReveal() {
  if (!detailRevealTimer) return;
  clearTimeout(detailRevealTimer);
  detailRevealTimer = 0;
}

function reducedMotion() {
  return motionPreference.matches;
}

const awardsPanelRoot = document.querySelector("#awards-panel");
const awardsPanel = createAwardsPanel(awardsPanelRoot, filters => {
  honorsFilters = filters;
  if (activeObject === honors) history.replaceState(history.state, "", objectHash(honors));
});

const videoPanel = document.querySelector("#video-panel");
const newsPanel = document.querySelector("#news-panel");
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
    view: validViews.has(view) ? view : "overview",
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

function objectsInView(view) {
  return view === "overview" ? objects : objects.filter(object => object.view === view);
}

function showObject(object, focusDetail) {
  clearDetailReveal();
  stopVideo();
  activeObject = object;
  scene3d.setHighlighted(null);
  const isNews = object.id === "entry";
  const isVideo = object.id === "kiosk";
  const isHonors = object === honors;
  const detailHadFocus = detail.contains(document.activeElement) || document.activeElement === exitFocus;
  detail.hidden = true;
  exitFocus.hidden = false;
  hotspotList.inert = true;
  if (focusDetail || detailHadFocus) exitFocus.focus({ preventScroll: true });
  updateNavigation();
  detailTitle.textContent = object.label;
  detailCopy.hidden = isHonors || isVideo || isNews;
  newsPanel.hidden = !isNews;
  videoPanel.hidden = !isVideo;
  detailCopy.textContent = object.description ?? "";
  awardsPanelRoot.hidden = !isHonors;
  detail.dataset.object = object.id;

  if (isHonors) {
    awardsPanel.setFilters(honorsFilters);
    awardsPanel.load();
  }
  moveCamera(570, () => {
    const reveal = () => {
      detailRevealTimer = 0;
      if (activeObject !== object) return;
      detail.toggleAttribute("data-focus-animation", !reducedMotion());
      detail.hidden = false;
      detail.scrollTop = 0;
      detail.classList.remove("is-scrolled");
      if (document.activeElement === exitFocus) detailTitle.focus({ preventScroll: true });
      exitFocus.hidden = true;
    };
    if (isHonors && !reducedMotion()) {
      detailRevealTimer = setTimeout(reveal, 140);
    } else {
      reveal();
    }
  });
}

function closeDetail(restoreFocus, returnCamera = true) {
  if (!activeObject) return;
  clearDetailReveal();
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

let pendingArrival = null;

function resetPointerView() {
  scene3d.setPointerDrift(0, 0);
}

viewport.addEventListener("pointermove", event => {
  if (event.pointerType !== "mouse" || reducedMotion()) return;
  const { left, top, width, height } = viewport.getBoundingClientRect();
  const horizontal = Math.max(-1, Math.min(1, 2 * (event.clientX - left) / width - 1));
  const vertical = Math.max(-1, Math.min(1, 2 * (event.clientY - top) / height - 1));
  scene3d.setPointerDrift(horizontal, -vertical);
}, { passive: true });

viewport.addEventListener("pointerleave", resetPointerView);
viewport.addEventListener("pointercancel", resetPointerView);
viewport.addEventListener("pointerdown", event => {
  if (event.pointerType !== "mouse") resetPointerView();
}, { passive: true });

function moveCamera(duration = 0, onArrival = null) {
  resetPointerView();
  const animate = duration > 0 && !reducedMotion();
  pendingArrival = onArrival;
  scene3d.setPose(
    activeView,
    activeObject?.id ?? null,
    compact.matches,
    animate ? duration : 0,
    () => {
      pendingArrival = null;
      onArrival?.();
    }
  );
}

function changeView(view, animate = true) {
  closeDetail(false, false);
  hotspotList.inert = false;
  activeView = view;
  viewport.dataset.view = view;
  for (const control of controls) {
    control.setAttribute("aria-pressed", String(control.dataset.view === view));
  }
  const visibleObjects = objectsInView(view);
  for (const { object, hotspot, quickLink } of entries) {
    const outOfView = !visibleObjects.includes(object);
    hotspot.disabled = outOfView;
    quickLink.hidden = outOfView;
  }
  moveCamera(animate ? 470 : 0);
}

function refreshMotion() {
  viewport.dataset.pointerMotion = reducedMotion() ? "off" : "on";
  if (reducedMotion()) {
    detail.removeAttribute("data-focus-animation");
    resetPointerView();
  }
  moveCamera(0, pendingArrival);
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
new ResizeObserver(() => {
  scene3d.resize();
  moveCamera(0, pendingArrival);
}).observe(viewport);

window.addEventListener("popstate", syncRoute);
window.addEventListener("hashchange", syncRoute);

changeView("overview", false);
updateNavigation();
refreshMotion();
syncRoute();
