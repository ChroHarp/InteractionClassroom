const root = document.querySelector("#learning-content");
let documentPromise;
let selection = 0;

function setupGallery(article) {
  const dialog = article.querySelector(".photo-viewer");
  if (!dialog || typeof dialog.showModal !== "function") return;

  const photos = [...article.querySelectorAll("[data-photo]")];
  const image = dialog.querySelector("img");
  const title = dialog.querySelector("strong");
  const caption = dialog.querySelector("p");
  const counter = dialog.querySelector(".photo-description span");
  let current = 0;

  function display(index) {
    current = (index + photos.length) % photos.length;
    const photo = photos[current];
    title.textContent = photo.querySelector("span").textContent;
    caption.textContent = photo.nextElementSibling.textContent;
    counter.textContent = `${current + 1} / ${photos.length}`;
    image.alt = title.textContent;
    image.width = Number(photo.dataset.width);
    image.height = Number(photo.dataset.height);
    image.src = photo.href;
  }

  photos.forEach((photo, index) => photo.addEventListener("click", event => {
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    display(index);
    dialog.showModal();
  }));
  dialog.querySelector("[data-photo-close]").addEventListener("click", () => dialog.close());
  dialog.querySelector("[data-photo-prev]").addEventListener("click", () => display(current - 1));
  dialog.querySelector("[data-photo-next]").addEventListener("click", () => display(current + 1));
  dialog.addEventListener("click", event => {
    if (event.target === dialog) dialog.close();
  });
  dialog.addEventListener("keydown", event => {
    const step = { ArrowLeft: -1, ArrowRight: 1 }[event.key];
    if (step && !event.altKey && !event.ctrlKey && !event.metaKey && !event.shiftKey) {
      event.preventDefault();
      display(current + step);
    }
  });
}

function setupLabTabs(article) {
  const tablist = article.querySelector(".lab-tabs");
  if (!tablist) return;

  const tabs = [...tablist.querySelectorAll("button")];
  const panels = tabs.map(tab => article.querySelector(`#${tab.getAttribute("aria-controls")}`));
  function select(index) {
    tabs.forEach((tab, position) => {
      const active = index === position;
      tab.setAttribute("aria-selected", String(active));
      tab.tabIndex = active ? 0 : -1;
      panels[position].hidden = !active;
    });
    panels[index].scrollTop = 0;
  }

  tablist.setAttribute("role", "tablist");
  tabs.forEach((tab, index) => {
    tab.setAttribute("role", "tab");
    const panel = panels[index];
    panel.setAttribute("role", "tabpanel");
    panel.setAttribute("aria-labelledby", tab.id);
    panel.tabIndex = 0;
    tab.addEventListener("click", () => select(index));
    tab.addEventListener("keydown", event => {
      if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
      const destinations = {
        ArrowLeft: (index - 1 + tabs.length) % tabs.length,
        ArrowRight: (index + 1) % tabs.length,
        Home: 0,
        End: tabs.length - 1,
      };
      const next = destinations[event.key];
      if (next === undefined) return;
      event.preventDefault();
      select(next);
      tabs[next].focus();
    });
  });
  select(0);
  tablist.hidden = false;
}

function setupLabPlaylist(article) {
  const video = article.querySelector("video[data-next-clips]");
  if (!video) return;
  const clips = [video.querySelector("source").src, ...video.dataset.nextClips.split(" ")];
  let current = 0;
  video.addEventListener("ended", () => {
    if (!video.isConnected || video.closest(".detail[hidden]")) return;
    current = (current + 1) % clips.length;
    video.src = clips[current];
    video.play().catch(() => {});
  });
}

export function playLabVideo() {
  const video = root.querySelector(".lab-video video");
  if (!video || video.closest(".detail[hidden]")) return;
  video.muted = true;
  video.play().catch(() => {});
}

function setupMathVideo(article) {
  const panel = article.querySelector(".math-proof");
  if (!panel) return;
  const video = panel.querySelector("video");
  const error = panel.querySelector(".math-video-error");
  video.addEventListener("error", () => { error.hidden = false; });

}

const directoryGallery = document.querySelector(".content-directory #photos");
if (directoryGallery) setupGallery(directoryGallery);
const directoryLab = document.querySelector(".content-directory #experiment");
if (directoryLab) {
  setupLabTabs(directoryLab);
  setupLabPlaylist(directoryLab);
}
const directoryMath = document.querySelector(".content-directory #math");
if (directoryMath) setupMathVideo(directoryMath);

export function stopContentMedia() {
  root.querySelectorAll("video").forEach(video => video.pause());
}

export async function showContent(id) {
  const request = ++selection;
  stopContentMedia();
  root.replaceChildren();
  root.hidden = ["honors", "kiosk"].includes(id);
  if (root.hidden) return;
  root.textContent = "正在載入內容…";
  try {
    documentPromise ??= fetch("content.html").then(response => {
      if (!response.ok) throw new Error("Content unavailable");
      return response.text();
    }).then(text => new DOMParser().parseFromString(text, "text/html"))
      .catch(error => { documentPromise = null; throw error; });
    const source = await documentPromise;
    if (request !== selection) return;
    const article = source.getElementById(id).cloneNode(true);
    article.querySelector("h2").remove();
    root.replaceChildren(article);
    setupGallery(article);
    setupLabTabs(article);
    setupLabPlaylist(article);
    if (id === "math") setupMathVideo(article);
    if (id === "experiment") playLabVideo();
    const buttons = [...article.querySelectorAll("[data-grade]")];
    const choose = (grade, resetScroll = false) => {
      buttons.forEach(button => button.setAttribute("aria-pressed", String(button.dataset.grade === grade)));
      article.querySelectorAll("[data-course-grade]").forEach(section => {
        section.hidden = section.dataset.courseGrade !== grade;
      });
      if (resetScroll) {
        root.scrollTop = 0;
        const detail = root.closest(".detail");
        if (detail) detail.scrollTop = 0;
      }
    };
    buttons.forEach(button => button.addEventListener("click", () => choose(button.dataset.grade, true)));
    if (buttons.length) choose("7");
  } catch {
    if (request !== selection) return;
    root.textContent = "內容暫時無法載入。";
    const retry = document.createElement("button");
    retry.textContent = "重新載入";
    retry.addEventListener("click", () => showContent(id));
    const link = document.createElement("a");
    link.href = "content.html#" + id;
    link.textContent = "開啟文字目錄";
    root.append(retry, link);
  }
}
