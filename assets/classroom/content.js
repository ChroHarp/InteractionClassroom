const root = document.querySelector("#learning-content");
let documentPromise;
let selection = 0;

function setupViewerNavigation(dialog, move) {
  dialog.addEventListener("click", event => {
    if (event.target === dialog) dialog.close();
  });
  dialog.addEventListener("keydown", event => {
    if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
    const step = { ArrowLeft: -1, ArrowRight: 1 }[event.key];
    if (!step) return;
    event.preventDefault();
    move(step);
  });
}

function setupCardViewer(article) {
  const dialog = article.querySelector(".card-viewer");
  if (!dialog || typeof dialog.showModal !== "function") return;

  const cards = [...article.querySelectorAll(":is(.news-grid, .maker-grid) > li")];
  if (!cards.length) return;
  const enlarged = dialog.querySelector(".card-viewer-card");
  const count = dialog.querySelector(".card-viewer-count");
  const previous = dialog.querySelector(".card-viewer-prev");
  const next = dialog.querySelector(".card-viewer-next");
  let current = 0;

  function display(index) {
    current = (index + cards.length) % cards.length;
    const copy = cards[current].querySelector(".card-copy").cloneNode(true);
    copy.querySelector("h3, h4").id = dialog.getAttribute("aria-labelledby");
    const image = cards[current].querySelector("img")?.cloneNode();
    enlarged.replaceChildren(copy);
    if (image) {
      image.loading = "eager";
      enlarged.prepend(image);
    }
    enlarged.scrollTop = 0;
    count.textContent = `${current + 1} / ${cards.length}`;
  }

  cards.forEach((card, index) => {
    const trigger = document.createElement("button");
    trigger.type = "button";
    trigger.className = "card-open";
    trigger.setAttribute("aria-haspopup", "dialog");
    trigger.setAttribute("aria-label", `放大${article.dataset.cardLabel}：${card.querySelector("h3, h4").textContent}`);
    trigger.addEventListener("click", () => {
      display(index);
      trigger.focus({ preventScroll: true });
      dialog.showModal();
    });
    card.append(trigger);
  });
  previous.hidden = next.hidden = cards.length < 2;
  previous.addEventListener("click", () => display(current - 1));
  next.addEventListener("click", () => display(current + 1));
  dialog.querySelector(".card-viewer-close").addEventListener("click", () => dialog.close());
  setupViewerNavigation(dialog, step => display(current + step));
}

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

export function playLabVideo() {
  const video = root.querySelector(".lab-video video");
  if (!video || video.closest(".detail[hidden]")) return;
  video.muted = true;
  video.play().catch(() => {});
}

function setupMathVideo(article) {
  const player = article.querySelector("[data-math-video]");
  player.src = player.dataset.mathVideo;
}

function setupMobilePanels(article) {
  let track;
  let slides;
  if (article.id === "experiment") {
    const labVideo = article.querySelector(".lab-video");
    const labPlan = article.querySelector(".lab-plan");
    if (!labVideo || !labPlan) return;
    const heading = document.createElement("h3");
    heading.className = "lab-video-heading";
    heading.textContent = "顯微鏡觀察影像";
    labVideo.prepend(heading);
    track = document.createElement("div");
    track.className = "panel-track";
    track.setAttribute("role", "group");
    track.setAttribute("aria-label", "科學探究面板");
    track.tabIndex = 0;
    labVideo.before(track);
    track.append(labVideo, labPlan);
    slides = [
      { el: labVideo, label: "觀察影像" },
      { el: labPlan, label: "實驗課程表" },
    ];
  } else if (article.id === "math") {
    track = article.querySelector(".math-exhibits");
    const proof = article.querySelector(".math-proof");
    const path = article.querySelector(".math-path");
    const projects = article.querySelector(".math-projects");
    if (!track || !proof || !path || !projects) return;
    track.setAttribute("role", "group");
    track.setAttribute("aria-label", "數學探索面板");
    track.tabIndex = 0;
    slides = [
      { el: proof, label: "幾何證明" },
      { el: path, label: "三年路徑" },
      { el: projects, label: "學生作品" },
    ];
  } else {
    return;
  }

  slides.forEach((slide, index) => {
    slide.el.setAttribute("role", "group");
    slide.el.setAttribute("aria-roledescription", "slide");
    slide.el.setAttribute("aria-label", `第 ${index + 1} 頁，共 ${slides.length} 頁：${slide.label}`);
  });

  const switcher = document.createElement("div");
  switcher.className = "panel-switcher";
  switcher.setAttribute("role", "group");
  switcher.setAttribute("aria-label", "切換閱讀面板");
  const tabButtons = slides.map((slide, index) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.dataset.panelIndex = String(index);
    btn.textContent = slide.label;
    if (index === 0) btn.setAttribute("aria-current", "true");
    switcher.append(btn);
    return btn;
  });

  const pager = document.createElement("div");
  pager.className = "panel-pager";
  const prevBtn = document.createElement("button");
  prevBtn.type = "button";
  prevBtn.dataset.panelDir = "-1";
  prevBtn.setAttribute("aria-label", "上一個面板");
  prevBtn.textContent = "‹";
  prevBtn.disabled = true;

  const countLabel = document.createElement("span");
  countLabel.className = "panel-pager-count";
  countLabel.textContent = `1 / ${slides.length}`;

  const nextBtn = document.createElement("button");
  nextBtn.type = "button";
  nextBtn.dataset.panelDir = "1";
  nextBtn.setAttribute("aria-label", "下一個面板");
  nextBtn.textContent = "›";
  nextBtn.disabled = slides.length <= 1;

  pager.append(prevBtn, countLabel, nextBtn);

  const liveRegion = document.createElement("p");
  liveRegion.className = "visually-hidden panel-live";
  liveRegion.setAttribute("role", "status");
  liveRegion.setAttribute("aria-live", "polite");

  track.before(switcher);
  track.after(liveRegion, pager);

  const reducedMotionQuery = matchMedia("(prefers-reduced-motion: reduce)");
  let currentIndex = 0;
  let settledIndex = 0;
  let pendingIndex = null;
  let pendingStartScrollLeft = null;
  let scrollRaf = 0;
  let settleTimer = 0;

  function slideTargetLeft(index) {
    const firstLeft = slides[0].el.offsetLeft;
    return slides[index].el.offsetLeft - firstLeft;
  }

  function nearestIndex() {
    const x = track.scrollLeft;
    let best = 0;
    let bestDist = Infinity;
    for (let i = 0; i < slides.length; i++) {
      const dist = Math.abs(slideTargetLeft(i) - x);
      if (dist < bestDist) {
        bestDist = dist;
        best = i;
      }
    }
    return best;
  }

  function syncUI(index, announce = false) {
    if (index !== currentIndex) {
      currentIndex = index;
      tabButtons.forEach((btn, i) => {
        if (i === index) btn.setAttribute("aria-current", "true");
        else btn.removeAttribute("aria-current");
      });
    }
    countLabel.textContent = `${index + 1} / ${slides.length}`;
    const wasPrevFocused = document.activeElement === prevBtn;
    const wasNextFocused = document.activeElement === nextBtn;
    prevBtn.disabled = index <= 0;
    nextBtn.disabled = index >= slides.length - 1;
    if (wasPrevFocused && prevBtn.disabled && !nextBtn.disabled) nextBtn.focus({ preventScroll: true });
    if (wasNextFocused && nextBtn.disabled && !prevBtn.disabled) prevBtn.focus({ preventScroll: true });
    if (article.id === "experiment" && index !== 0) {
      article.querySelector(".lab-video video")?.pause();
    }
    if (announce && index !== settledIndex) {
      settledIndex = index;
      liveRegion.textContent = `第 ${index + 1} 頁，共 ${slides.length} 頁：${slides[index].label}`;
    }
  }

  function onSettled() {
    if (pendingIndex !== null) {
      const targetLeft = slideTargetLeft(pendingIndex);
      if (Math.abs(track.scrollLeft - pendingStartScrollLeft) <= 1 && Math.abs(targetLeft - track.scrollLeft) > 4) {
        return;
      }
      pendingIndex = null;
      pendingStartScrollLeft = null;
    }
    syncUI(nearestIndex(), true);
  }

  function goTo(index) {
    const clamped = Math.max(0, Math.min(slides.length - 1, index));
    if (track.scrollWidth <= track.clientWidth + 2) {
      syncUI(clamped, true);
      return;
    }
    const targetLeft = slideTargetLeft(clamped);
    pendingIndex = clamped;
    pendingStartScrollLeft = track.scrollLeft;
    syncUI(clamped, false);
    if (Math.abs(targetLeft - track.scrollLeft) <= 2 || reducedMotionQuery.matches) {
      track.scrollTo({ left: targetLeft, behavior: "auto" });
      pendingIndex = null;
      pendingStartScrollLeft = null;
      syncUI(clamped, true);
    } else {
      track.scrollTo({ left: targetLeft, behavior: "smooth" });
    }
  }

  tabButtons.forEach((btn, i) => {
    btn.addEventListener("click", () => goTo(i));
    btn.addEventListener("keydown", event => {
      if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
      const destinations = {
        ArrowLeft: (i - 1 + slides.length) % slides.length,
        ArrowRight: (i + 1) % slides.length,
        Home: 0,
        End: slides.length - 1,
      };
      const next = destinations[event.key];
      if (next === undefined) return;
      event.preventDefault();
      goTo(next);
      tabButtons[next].focus();
    });
  });

  track.addEventListener("keydown", event => {
    if (event.target !== track || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
    const step = { ArrowLeft: -1, ArrowRight: 1 }[event.key];
    if (!step) return;
    event.preventDefault();
    goTo((pendingIndex ?? currentIndex) + step);
  });

  prevBtn.addEventListener("click", () => goTo((pendingIndex ?? currentIndex) - 1));
  nextBtn.addEventListener("click", () => goTo((pendingIndex ?? currentIndex) + 1));

  const supportsScrollEnd = "onscrollend" in window;
  track.addEventListener("scroll", () => {
    if (pendingIndex === null && !scrollRaf) {
      scrollRaf = requestAnimationFrame(() => {
        scrollRaf = 0;
        if (pendingIndex === null) syncUI(nearestIndex(), false);
      });
    }
    if (!supportsScrollEnd) {
      clearTimeout(settleTimer);
      settleTimer = setTimeout(onSettled, 140);
    }
  }, { passive: true });

  if (supportsScrollEnd) {
    track.addEventListener("scrollend", onSettled, { passive: true });
  }
}

document.querySelectorAll(".content-directory [data-card-label]").forEach(setupCardViewer);
const directoryGallery = document.querySelector(".content-directory #photos");
if (directoryGallery) setupGallery(directoryGallery);
const directoryLab = document.querySelector(".content-directory #experiment");
if (directoryLab) {
  setupLabTabs(directoryLab);
}
const directoryMath = document.querySelector(".content-directory #math");
if (directoryMath) setupMathVideo(directoryMath);

export function deactivateContent() {
  selection++;
  root.querySelector("[data-math-video]")?.remove();
  root.querySelector("dialog[open]")?.close();
  root.querySelectorAll("video").forEach(video => video.pause());
}

export async function showContent(id) {
  deactivateContent();
  const request = selection;
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
    if (article.hasAttribute("data-card-label")) setupCardViewer(article);
    setupGallery(article);
    setupLabTabs(article);
    if (id === "math") setupMathVideo(article);
    setupMobilePanels(article);
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
