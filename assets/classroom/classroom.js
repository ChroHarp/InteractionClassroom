const objects = [
  { id: "blackboard", mask: "37.2% 25.2%, 65.2% 25.2%, 65.2% 49.6%, 37.2% 49.6%", label: "黑板", x: 241, y: 99, view: "front", description: "從觀察與提問開始，練習思考、探究與實作。" },
  { id: "courses", mask: "65.6% 28.5%, 73.6% 28.5%, 73.6% 46.1%, 65.6% 46.1%", label: "課程佈告欄", x: 333, y: 98, view: "front", description: "七年級啟發試探、八年級探究實作、九年級適性分流。" },
  { id: "honors", mask: "73.7% 22.3%, 86% 22.3%, 86% 47.4%, 73.7% 47.4%", label: "榮譽榜", x: 386, y: 94, view: "wall", description: "既有網站的本機資料快照收錄 2016–2026 年共 88 筆獎項紀錄。既有線上來源目前無法開啟。" },
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
const honorCloseup = document.querySelector("#honor-closeup");
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

function showObject(object, button) {
  trigger = button;
  for (const entry of entries) {
    const expanded = String(entry.object.id === object.id);
    entry.hotspot.setAttribute("aria-expanded", expanded);
    entry.quickLink.setAttribute("aria-expanded", expanded);
  }
  const isHonors = object.id === "honors";
  detailTitle.textContent = object.label;
  detailCopy.textContent = object.description;
  honorCloseup.hidden = !isHonors;
  detail.hidden = false;
  detailTitle.focus();
}

function closeDetail(restoreFocus) {
  if (detail.hidden) return;
  detail.hidden = true;
  for (const entry of entries) {
    entry.hotspot.setAttribute("aria-expanded", "false");
    entry.quickLink.setAttribute("aria-expanded", "false");
  }
  if (restoreFocus) {
    const entry = entries.find(item => item.object.id === trigger?.dataset.object);
    const replacement = compact.matches ? entry?.quickLink : entry?.hotspot;
    replacement?.focus();
  }
  trigger = null;
}

function positionWorld() {
  const { clientWidth: width, clientHeight: height } = viewport;
  const camera = cameras[activeView];
  const narrow = compact.matches;
  const scale = narrow ? camera.narrow : camera.wide;
  const unit = width / 480;
  const worldHeight = 270 * unit * scale;
  // Center the overview as artwork on mobile. Regional views use the same coordinates.
  const maxX = Math.max(0, (width * scale - width) / 2);
  const maxY = Math.max(0, (worldHeight - height) / 2);
  const x = Math.max(-maxX, Math.min(maxX, (240 - camera.x) * unit * scale));
  const y = Math.max(-maxY, Math.min(maxY, (135 - camera.y) * unit * scale));
  world.style.transform = `translate(-50%, -50%) translate(${x}px, ${y}px) scale(${scale})`;
}

function changeView(view) {
  if (view !== activeView) closeDetail(false);
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
  positionWorld();
}

for (const control of controls) {
  control.addEventListener("click", () => changeView(control.dataset.view));
}
back.addEventListener("click", () => closeDetail(true));
document.addEventListener("keydown", event => {
  if (event.key === "Escape" && !detail.hidden) closeDetail(true);
});
new ResizeObserver(positionWorld).observe(viewport);

changeView("overview");
