import { deactivateContent, playLabVideo, showContent } from "./content.js";
import { createAwardsPanel } from "./awards.js";
import { createClassroomScene3D } from "./scene-3d.js";

// The catalog order drives keyboard cycling and the bottom rail. IDs are also used in URLs.
const objects = [
  { id: "entry", label: "最新消息", wideDetail: true },
  { id: "kiosk", label: "數資班介紹影片" },
  {
    id: "experiment", label: "科學探究",
    description: "研究從一個問題開始，透過實驗、觀察和紀錄找出證據。",
  },
  {
    id: "blackboard", label: "學習理念",
    description: "從觀察與提問開始，練習思考、探究與實作。",
  },
  { id: "math", label: "數學探索" },
  {
    id: "courses", label: "三年課程",
    description: "七年級啟發試探、八年級探究實作、九年級適性分流。",
  },
  { id: "honors", label: "榮譽榜", wideDetail: true },
  { id: "bookshelf", label: "圖書與桌遊" },
  {
    id: "photos", label: "活動照片", wideDetail: true,
    description: "校外參訪、共學與成果分享，都是教室延伸出去的學習現場。",
  },
  {
    id: "maker", label: "創客作品",
    description: "在這裡看看同學如何把生活中的需求做成可操作的原型。",
  },
];
objects.forEach(object => { object.wideDetail = object.id !== "kiosk"; });

const viewport = document.querySelector("#viewport");
const scene3d = createClassroomScene3D(viewport, [...objects, { id: "logo-poster" }]);
viewport.dataset.scene = "3d";

const room = document.querySelector("#room");
const videoStage = document.querySelector("#video-stage");
const hotspotList = document.querySelector("#hotspots");
const posterLink = document.querySelector("#poster-link");
const posterMarker = posterLink.querySelector(".hotspot-marker");
const entranceList = document.querySelector("#entrances");
const detail = document.querySelector("#detail");
detail.addEventListener("scroll", () => {
  detail.classList.toggle("is-scrolled", detail.scrollTop > 4);
}, { passive: true });
const detailTitle = document.querySelector("#detail-title");
const detailCopy = document.querySelector("#detail-copy");
const back = document.querySelector("#back");
const mobileFocusBar = document.querySelector("#mobile-focus-bar");
const mobileBack = document.querySelector("#mobile-back");
const mobileFocusTitle = document.querySelector("#mobile-focus-title");
const sceneNavigation = document.querySelector("#scene-navigation");
const navDrawerToggle = document.querySelector("#nav-drawer-toggle");
const navDrawerLabel = document.querySelector("#nav-drawer-label");
const panHint = document.querySelector("#pan-hint");
const panThumb = document.querySelector("#pan-thumb");
const compact = matchMedia("(max-width: 720px)");

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
    button.setAttribute("aria-label", object.label);
    const glow = document.createElement("span");
    glow.className = "hotspot-glow";
    const shape = document.createElement("span");
    shape.className = "hotspot-shape";
    glow.append(shape);

    const marker = document.createElement("span");
    marker.className = "hotspot-marker";
    marker.setAttribute("aria-hidden", "true");
    const title = document.createElement("span");
    title.className = "hotspot-title";
    title.textContent = object.label;
    marker.append(title);
    button.append(glow, marker);

    button.addEventListener("pointerenter", event => {
      if (event.pointerType !== "mouse") return;
      button.dataset.mouseOver = "";
      scene3d.setHighlighted(object.id);
    });
    button.addEventListener("pointerleave", event => {
      if (event.pointerType !== "mouse") return;
      delete button.dataset.mouseOver;
      if (!button.matches(":focus-visible")) scene3d.setHighlighted(null);
    });
    button.addEventListener("focus", () => {
      if (button.matches(":focus-visible")) scene3d.setHighlighted(object.id);
    });
    button.addEventListener("blur", () => {
      if (!button.hasAttribute("data-mouse-over")) scene3d.setHighlighted(null);
    });
  } else {
    button.textContent = object.label;
    button.addEventListener("pointerenter", event => {
      if (event.pointerType === "mouse") scene3d.setHighlighted(object.id);
    });
    button.addEventListener("pointerleave", event => {
      if (event.pointerType === "mouse") scene3d.setHighlighted(null);
    });
  }
  button.addEventListener("click", () => openObject(object, button));
  return button;
}

const entries = objects.map(object => {
  const hotspot = makeButton(object, true);
  const quickLink = makeButton(object, false);
  hotspotList.append(hotspot);
  entranceList.append(quickLink);
  return { object, hotspot, quickLink, marker: hotspot.querySelector(".hotspot-marker") };
});

scene3d.onHotspotsProject((projected, screen, panState) => {
  if (screen) {
    for (const [key, value] of Object.entries(screen)) videoStage.style[key] = `${value}px`;
  }
  if (panHint) {
    const showPan = Boolean(panState?.enabled && !activeObject);
    panHint.hidden = !showPan;
    viewport.toggleAttribute("data-swipe-pan", showPan);
    if (showPan) {
      panThumb.style.setProperty("--pan-progress", String(panState.progress ?? 0.5));
    }
  }
  const hiddenInMobileFocus = compact.matches && Boolean(activeObject);
  const posterBox = projected["logo-poster"];
  posterLink.hidden = hiddenInMobileFocus || !posterBox?.visible;
  if (!posterLink.hidden) {
    for (const key of ["left", "top", "width", "height"]) {
      posterLink.style[key] = `${posterBox[key]}px`;
    }
    posterLink.style.setProperty("--hotspot-face", posterBox.face);
    posterMarker.style.left = `${posterBox.titleX}%`;
    posterMarker.style.top = `${posterBox.titleY}%`;
  }
  for (const { object, hotspot, marker } of entries) {
    const box = projected[object.id];
    const coveredByVideo = activeObject?.id === "kiosk" && ["math", "kiosk"].includes(object.id);
    if (hiddenInMobileFocus || coveredByVideo || !box || !box.visible) {
      hotspot.style.visibility = "hidden";
      continue;
    }
    hotspot.style.visibility = "";
    hotspot.style.left = `${box.left.toFixed(1)}px`;
    hotspot.style.top = `${box.top.toFixed(1)}px`;
    hotspot.style.width = `${box.width.toFixed(1)}px`;
    hotspot.style.height = `${box.height.toFixed(1)}px`;
    hotspot.style.zIndex = String(Math.max(1, Math.round((1 - box.depth) * 100)));
    if (box.face) hotspot.style.setProperty("--hotspot-face", box.face);
    marker.style.left = `${box.titleX.toFixed(1)}%`;
    marker.style.top = `${box.titleY.toFixed(1)}%`;
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

const promoVideo = "https://www.youtube.com/embed/z2E_-Mv_YxM?autoplay=1&mute=1&playsinline=1";

function startVideo() {
  const player = document.createElement("iframe");
  player.src = promoVideo;
  player.title = "平興數資宣傳影片";
  player.allow = "accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture; fullscreen";
  player.allowFullscreen = true;
  player.referrerPolicy = "strict-origin-when-cross-origin";
  videoStage.append(player);
  videoStage.hidden = false;
}

function stopVideo() {
  videoStage.querySelector("iframe")?.remove();
  videoStage.hidden = true;
}

function readRoute() {
  const [id, query] = location.hash.slice(1).split("?");
  const object = objects.find(item => item.id === id);
  if (!object) return null;
  const params = new URLSearchParams(query);
  return {
    object,
    filters: {
      year: params.get("year") ?? "",
      category: params.get("category") ?? "",
      q: (params.get("q") ?? "").slice(0, 120),
    },
  };
}

function objectHash(object) {
  const params = new URLSearchParams();
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
    closeDetail();
    return;
  }

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

function setDrawerOpen(open) {
  const next = Boolean(open && compact.matches);
  navDrawerToggle.setAttribute("aria-expanded", String(next));
  if (next) sceneNavigation.dataset.drawerOpen = "true";
  else delete sceneNavigation.dataset.drawerOpen;
}

function updateNavigation() {
  const statusLabel = activeObject
    ? `${activeObject.label} · ${objects.indexOf(activeObject) + 1} / ${objects.length}`
    : `探索教室 · ${objects.length} 個物件`;
  sceneStatus.textContent = activeObject ? statusLabel : "選擇教室物件";
  navDrawerLabel.textContent = statusLabel;
  previousObject.setAttribute("aria-label", `上一個物件：${adjacentObject(-1).label}`);
  nextObject.setAttribute("aria-label", `下一個物件：${adjacentObject(1).label}`);
  for (const { object, hotspot, quickLink } of entries) {
    const expanded = String(object === activeObject);
    hotspot.setAttribute("aria-expanded", expanded);
    hotspot.tabIndex = object === activeObject ? -1 : 0;
    quickLink.setAttribute("aria-expanded", expanded);
    if (!compact.matches && object === activeObject && !quickLink.hidden) {
      const rail = entranceList.getBoundingClientRect();
      const item = quickLink.getBoundingClientRect();
      entranceList.scrollLeft += Math.min(0, item.left - rail.left - 4)
        + Math.max(0, item.right - rail.right + 4);
    }
  }
}

function syncCompactUI() {
  const isCompact = compact.matches;
  navDrawerToggle.hidden = !isCompact;
  if (!isCompact) setDrawerOpen(false);
  mobileFocusBar.hidden = !(isCompact && activeObject);
  mobileFocusTitle.textContent = activeObject?.label ?? "";
  if (activeObject) {
    room.dataset.focusActive = "true";
    room.dataset.object = activeObject.id;
    const needsExitFocus = ["kiosk", "experiment", "math"].includes(activeObject.id);
    exitFocus.hidden = isCompact || !needsExitFocus;
  } else {
    delete room.dataset.focusActive;
    delete room.dataset.object;
    exitFocus.hidden = true;
  }
}

function showObject(object, focusDetail) {
  clearDetailReveal();
  stopVideo();
  setDrawerOpen(false);
  activeObject = object;
  scene3d.setHighlighted(null);
  const isVideo = object.id === "kiosk";
  const isExperiment = object.id === "experiment";
  const hasFloatingPanels = isExperiment || object.id === "math";
  const isHonors = object === honors;
  const detailHadFocus = detail.contains(document.activeElement) ||
    document.activeElement === exitFocus || mobileFocusBar.contains(document.activeElement);
  deactivateContent();
  detail.hidden = true;
  room.dataset.focusActive = "true";
  room.dataset.object = object.id;
  if (compact.matches) {
    mobileFocusTitle.textContent = object.label;
    mobileFocusBar.hidden = false;
    exitFocus.hidden = true;
    if (focusDetail || detailHadFocus) mobileFocusTitle.focus({ preventScroll: true });
  } else {
    mobileFocusBar.hidden = true;
    exitFocus.hidden = false;
    if (focusDetail || detailHadFocus) exitFocus.focus({ preventScroll: true });
  }
  updateNavigation();
  detailTitle.textContent = object.label;
  detailCopy.hidden = true;
  showContent(object.id);
  detailCopy.textContent = object.description ?? "";
  awardsPanelRoot.hidden = !isHonors;
  detail.dataset.object = object.id;
  detail.toggleAttribute("data-wide", Boolean(object.wideDetail));

  if (isHonors) {
    awardsPanel.setFilters(honorsFilters);
    awardsPanel.load();
  }
  moveCamera(570, () => {
    if (isVideo) {
      startVideo();
      return;
    }
    const reveal = () => {
      detailRevealTimer = 0;
      if (activeObject !== object) return;
      detail.toggleAttribute("data-focus-animation", !reducedMotion());
      detail.hidden = false;
      detail.scrollTop = 0;
      detail.classList.remove("is-scrolled");
      if (!compact.matches && !hasFloatingPanels && document.activeElement === exitFocus) {
        detailTitle.focus({ preventScroll: true });
      }
      exitFocus.hidden = compact.matches || !hasFloatingPanels;
      if (isExperiment) playLabVideo();
    };
    if (isHonors && !reducedMotion()) {
      detailRevealTimer = setTimeout(reveal, 140);
    } else {
      reveal();
    }
  });
}

function closeDetail() {
  if (!activeObject) return;
  clearDetailReveal();
  const selected = entries.find(entry => entry.object === activeObject);
  const origin = originTrigger;
  const restoreFocus = detail.contains(document.activeElement) ||
    videoStage.contains(document.activeElement) || document.activeElement === exitFocus ||
    mobileFocusBar.contains(document.activeElement);
  deactivateContent();
  if (restoreFocus) viewport.focus({ preventScroll: true });
  stopVideo();
  setDrawerOpen(false);
  activeObject = null;
  originTrigger = null;
  delete room.dataset.focusActive;
  delete room.dataset.object;
  detail.hidden = true;
  exitFocus.hidden = true;
  mobileFocusBar.hidden = true;
  mobileFocusTitle.textContent = "";
  updateNavigation();

  moveCamera(470, () => {
    if (restoreFocus && document.activeElement === viewport) {
      const isVisible = button => button?.getClientRects().length && getComputedStyle(button).visibility === "visible";
      const candidate = [origin, selected.hotspot, compact.matches ? navDrawerToggle : selected.quickLink].find(isVisible);
      candidate?.focus({ preventScroll: true });
    }
  });
}

let pendingArrival = null;
let panPointerId = null;
let panStartX = 0;
let panStartY = 0;
let panLastX = 0;
let panLastTime = 0;
let panLastVel = 0;
let panDragging = false;
let suppressClick = false;
let suppressClickTimer = 0;

function resetPointerView() {
  scene3d.setPointerDrift(0, 0);
}

viewport.addEventListener("pointerdown", event => {
  if (event.pointerType !== "mouse") resetPointerView();
  if (event.isPrimary) {
    suppressClick = false;
    clearTimeout(suppressClickTimer);
  }
  if (activeObject || !event.isPrimary || !scene3d.getPanState().enabled) return;
  if (event.pointerType === "mouse" && event.button !== 0) return;
  if (event.target.closest(".scene-navigation, .detail, .mobile-focus-bar, #video-stage")) return;
  panPointerId = event.pointerId;
  panStartX = event.clientX;
  panStartY = event.clientY;
  panLastX = event.clientX;
  panLastTime = performance.now();
  panLastVel = 0;
  panDragging = false;
}, { passive: true });

viewport.addEventListener("pointermove", event => {
  if (event.pointerId === panPointerId && !activeObject) {
    const dxTotal = event.clientX - panStartX;
    const dyTotal = event.clientY - panStartY;
    if (!panDragging && Math.abs(dxTotal) > 8 && Math.abs(dxTotal) > Math.abs(dyTotal)) {
      panDragging = true;
      try { viewport.setPointerCapture(panPointerId); } catch {}
      if (panHint) panHint.dataset.interacted = "true";
    }
    if (panDragging) {
      const dx = event.clientX - panLastX;
      const now = performance.now();
      const dt = Math.max(8, now - panLastTime);
      panLastVel = dx * (16 / dt);
      panLastX = event.clientX;
      panLastTime = now;
      scene3d.panBy(dx);
    }
    return;
  }
  if (event.pointerType !== "mouse" || reducedMotion() || scene3d.getPanState().enabled) return;
  const { left, top, width, height } = viewport.getBoundingClientRect();
  const horizontal = Math.max(-1, Math.min(1, 2 * (event.clientX - left) / width - 1));
  const vertical = Math.max(-1, Math.min(1, 2 * (event.clientY - top) / height - 1));
  scene3d.setPointerDrift(horizontal, -vertical);
}, { passive: true });

function endPanGesture(event) {
  if (event.pointerId !== panPointerId) return;
  if (panDragging) {
    if (event.type === "pointerup" && !reducedMotion() && performance.now() - panLastTime < 80) {
      scene3d.flingPan(panLastVel);
    }
    suppressClick = true;
    clearTimeout(suppressClickTimer);
    suppressClickTimer = setTimeout(() => { suppressClick = false; }, 80);
    if (viewport.hasPointerCapture?.(panPointerId)) {
      try { viewport.releasePointerCapture(panPointerId); } catch {}
    }
  }
  panPointerId = null;
  panDragging = false;
}

viewport.addEventListener("pointerup", endPanGesture);
viewport.addEventListener("pointercancel", endPanGesture);
viewport.addEventListener("pointerleave", resetPointerView);
viewport.addEventListener("click", event => {
  if (!suppressClick) return;
  event.preventDefault();
  event.stopPropagation();
  suppressClick = false;
  clearTimeout(suppressClickTimer);
}, true);

function moveCamera(duration = 0, onArrival = null) {
  resetPointerView();
  const animate = duration > 0 && !reducedMotion();
  pendingArrival = onArrival;
  scene3d.setPose(
    "overview",
    activeObject?.id ?? null,
    compact.matches,
    animate ? duration : 0,
    () => {
      pendingArrival = null;
      onArrival?.();
    }
  );
}

function refreshMotion() {
  viewport.dataset.pointerMotion = reducedMotion() ? "off" : "on";
  if (reducedMotion()) {
    detail.removeAttribute("data-focus-animation");
    resetPointerView();
  }
  moveCamera(0, pendingArrival);
}

function closeFromControl() {
  closeDetail();
  leaveRoute();
}

viewport.addEventListener("click", event => {
  if (activeObject && !event.target.closest(".hotspot, .poster-link, #video-stage")) closeFromControl();
});

for (const button of [back, exitFocus, mobileBack]) {
  button.addEventListener("click", closeFromControl);
}
navDrawerToggle.addEventListener("click", () => {
  setDrawerOpen(sceneNavigation.dataset.drawerOpen !== "true");
});
document.addEventListener("click", event => {
  if (sceneNavigation.dataset.drawerOpen === "true" && !event.target.closest("#scene-navigation")) {
    setDrawerOpen(false);
  }
});
previousObject.addEventListener("click", () => openObject(adjacentObject(-1), previousObject, false));
nextObject.addEventListener("click", () => openObject(adjacentObject(1), nextObject, false));
motionPreference.addEventListener("change", refreshMotion);
compact.addEventListener("change", syncCompactUI);
document.addEventListener("keydown", event => {
  if (event.defaultPrevented || event.target.closest("dialog[open], video")) return;
  if (event.key === "Escape") {
    if (sceneNavigation.dataset.drawerOpen === "true") {
      setDrawerOpen(false);
      navDrawerToggle.focus({ preventScroll: true });
      return;
    }
    if (activeObject) closeFromControl();
  }
  if (!activeObject || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey ||
      event.target.matches("input, select, textarea, [contenteditable]") ||
      event.target.closest(".exhibit-track, .panel-switcher, .awards-results")) return;
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

syncCompactUI();
updateNavigation();
refreshMotion();
syncRoute();
