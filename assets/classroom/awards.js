const awardsUrl = new URL("../../data/classroom/awards.json", import.meta.url);
const defaultFilters = { year: "", category: "", q: "" };

function normalize(text) {
  return text.normalize("NFKC").toLowerCase();
}

function classifyTier(award) {
  if (/世界|全國第[一二三]名|特優|全國最佳教材|全國最佳技術|全國探究精神|全國銀牌/.test(award)) return "super";
  if (/全國(賽|科展)?(銅牌|佳作)|全國最佳潛力|IEYI(銀牌|銅牌|佳作)|桃園市第一名|台北個人一等獎/.test(award)) return "major";
  if (/桃園市第[二三]名|桃園市優等|桃園市銅牌|台灣賽銅牌|台北個人[二三]等獎|台北團體三等獎|最佳創意|最佳精品/.test(award)) return "mid";
  return "normal";
}

function parseAwards(data) {
  if (!Array.isArray(data) || data.some(record =>
    !Number.isInteger(record?.year) ||
    !["category", "competition", "field", "project", "award"].every(key => typeof record[key] === "string") ||
    !record.category || !record.competition || !record.award
  )) {
    throw new Error("Invalid awards data");
  }
  return data
    .map(record => ({
      ...record,
      tier: classifyTier(record.award),
      searchText: normalize([record.year, record.category, record.competition, record.field, record.project, record.award].join(" ")),
    }))
    .sort((a, b) => a.year - b.year);
}

function awardCard(record) {
  const card = document.createElement("article");
  card.className = `award-card tier-${record.tier}`;

  const top = document.createElement("div");
  top.className = "award-card-top";
  const tag = document.createElement("span");
  tag.className = "award-tag";
  tag.textContent = [record.category, record.field].filter(Boolean).join(" · ");
  top.append(tag);

  if (record.tier !== "normal") {
    const star = document.createElement("span");
    star.className = "award-star";
    star.setAttribute("aria-hidden", "true");
    star.textContent = "★";
    top.append(star);
  }

  const title = document.createElement("h4");
  title.className = "award-title";
  title.textContent = record.project || record.competition;

  const meta = document.createElement("p");
  meta.className = "award-meta";
  meta.textContent = record.project ? record.competition : "";
  meta.hidden = !meta.textContent;

  const prize = document.createElement("p");
  prize.className = "award-prize";
  prize.textContent = record.award;

  card.append(top, title, meta, prize);
  return card;
}

const tierOrder = { super: 0, major: 1, mid: 2, normal: 3 };

function awardRank(record) {
  const tier = tierOrder[record.tier] ?? 3;
  const a = record.award;
  const scope = /世界/.test(a) ? 0
    : /全國/.test(a) ? 1
    : /IEYI/.test(a) ? 2
    : /台灣賽/.test(a) ? 3
    : /桃園市|台北/.test(a) ? 4
    : 5;
  const medal = /特優|第一名|一等獎|金牌|最佳/.test(a) ? 0
    : /第二名|二等獎|銀牌/.test(a) ? 1
    : /第三名|三等獎|銅牌|優等/.test(a) ? 2
    : /佳作/.test(a) ? 3
    : 4;
  return tier * 100 + scope * 10 + medal;
}

function yearColumn(yearValue, items) {
  const sorted = [...items].sort((a, b) => awardRank(a) - awardRank(b));
  const col = document.createElement("section");
  col.className = "award-year-col";
  col.dataset.year = String(yearValue);
  col.setAttribute("aria-label", `${yearValue} 年獲獎`);

  const head = document.createElement("header");
  head.className = "award-year-head";
  const heading = document.createElement("h3");
  heading.textContent = `${yearValue} 年`;
  const count = document.createElement("span");
  count.className = "award-year-count";
  count.textContent = `${sorted.length} 筆`;
  head.append(heading, count);

  const cards = document.createElement("div");
  cards.className = "award-cards";
  cards.append(...sorted.map(awardCard));

  col.append(head, cards);
  return col;
}

export function createAwardsPanel(panel, onFilters) {
  const form = panel.querySelector("#awards-filters");
  const search = form.elements.namedItem("q");
  const status = panel.querySelector("#awards-status");
  const results = panel.querySelector("#awards-results");
  const yearRange = panel.querySelector("#awards-year-range");
  const prevYear = panel.querySelector("#awards-prev-year");
  const nextYear = panel.querySelector("#awards-next-year");
  const clear = panel.querySelector("#awards-clear");
  const retry = panel.querySelector("#awards-retry");

  let records = null;
  let request = null;
  let failed = false;
  let filters = defaultFilters;
  let pendingScrollLatest = false;

  function syncSlider() {
    const maxScroll = Math.max(0, results.scrollWidth - results.clientWidth);
    const hasOverflow = results.clientWidth > 0 && maxScroll > 2;
    yearRange.disabled = !hasOverflow;
    if (hasOverflow) {
      yearRange.value = String(Math.round((results.scrollLeft / maxScroll) * 1000));
    } else {
      yearRange.value = "1000";
    }
  }

  function applyScrollToLatest(behavior = "auto") {
    const maxScroll = Math.max(0, results.scrollWidth - results.clientWidth);
    if (results.clientWidth > 0 && maxScroll > 0) {
      pendingScrollLatest = false;
      results.scrollTo({ left: maxScroll, behavior });
      yearRange.disabled = false;
      yearRange.value = "1000";
    } else if (results.children.length > 1) {
      pendingScrollLatest = true;
      syncSlider();
    } else {
      syncSlider();
    }
  }

  function scrollToLatest(behavior = "auto") {
    requestAnimationFrame(() => applyScrollToLatest(behavior));
  }

  if (typeof ResizeObserver === "function") {
    new ResizeObserver(() => {
      if (pendingScrollLatest) applyScrollToLatest("auto");
      else syncSlider();
    }).observe(results);
  }

  function updateControls() {
    search.value = filters.q;
  }

  function render(keepScroll = false) {
    const loading = request !== null;
    const unavailable = records === null;
    search.disabled = unavailable || records.length === 0;
    retry.hidden = !failed;
    retry.setAttribute("aria-disabled", String(loading));
    clear.hidden = unavailable || !filters.q.trim();
    results.setAttribute("aria-busy", String(loading));

    if (unavailable) {
      status.textContent = loading ? "正在載入獎項資料…" : "無法載入獎項資料，請重新載入。";
      results.replaceChildren();
      yearRange.disabled = true;
      prevYear.disabled = true;
      nextYear.disabled = true;
      return;
    }

    const tokens = normalize(filters.q).trim().split(/\s+/).filter(Boolean);
    const matches = records.filter(record =>
      tokens.every(token => record.searchText.includes(token))
    );

    const byYear = new Map();
    for (const record of matches) {
      if (!byYear.has(record.year)) byYear.set(record.year, []);
      byYear.get(record.year).push(record);
    }

    const columns = [...byYear.entries()].map(([yearValue, items]) => yearColumn(yearValue, items));
    results.replaceChildren(...columns);
    prevYear.disabled = columns.length <= 1;
    nextYear.disabled = columns.length <= 1;

    const openResult = panel.closest(".detail");
    if (openResult) openResult.scrollTop = 0;
    if (!keepScroll) scrollToLatest("auto");

    status.textContent = matches.length
      ? `共 ${matches.length} 筆獎項（${byYear.size} 個年度，可左右滑動瀏覽）`
      : records.length ? "找不到符合的獎項，請調整搜尋關鍵字。" : "目前沒有獎項資料。";
  }

  function setFilters(next = defaultFilters) {
    filters = { ...defaultFilters, ...next };
    updateControls();
    if (records !== null || failed) render(false);
  }

  function load() {
    if (request || records !== null) {
      if (records !== null && !filters.q.trim()) scrollToLatest("auto");
      return;
    }
    request = fetch(awardsUrl, { cache: "no-cache" })
      .then(response => {
        if (!response.ok) throw new Error(`Awards request failed: ${response.status}`);
        return response.json();
      })
      .then(data => {
        records = parseAwards(data);
        updateControls();
      })
      .catch(() => { failed = true; })
      .finally(() => {
        const restoreRetryFocus = records !== null && document.activeElement === retry;
        if (records !== null) failed = false;
        request = null;
        render(false);
        if (restoreRetryFocus) (search.disabled ? status : search).focus();
      });
    render(false);
  }

  function applyControls() {
    filters = { ...defaultFilters, q: search.value };
    render(false);
    onFilters(filters);
  }

  function stepYear(direction) {
    const col = results.querySelector(".award-year-col");
    const step = col ? col.getBoundingClientRect().width + 12 : 272;
    results.scrollBy({ left: direction * step, behavior: "smooth" });
  }

  form.addEventListener("submit", event => event.preventDefault());
  search.addEventListener("input", applyControls);
  results.addEventListener("scroll", syncSlider, { passive: true });
  yearRange.addEventListener("input", () => {
    const maxScroll = Math.max(0, results.scrollWidth - results.clientWidth);
    results.scrollLeft = (Number(yearRange.value) / 1000) * maxScroll;
  });
  prevYear.addEventListener("click", () => stepYear(-1));
  nextYear.addEventListener("click", () => stepYear(1));
  clear.addEventListener("click", () => {
    setFilters(defaultFilters);
    onFilters(filters);
    search.focus();
  });
  retry.addEventListener("click", load);

  return { setFilters, load };
}
