const awardsUrl = new URL("../../data/classroom/awards.json", import.meta.url);
const categoryOrder = new Intl.Collator("zh-Hant-TW");
const defaultFilters = { year: "", category: "", q: "" };

function normalize(text) {
  return text.normalize("NFKC").toLowerCase();
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
      searchText: normalize([record.year, record.category, record.competition, record.field, record.project, record.award].join(" ")),
    }))
    .sort((a, b) => b.year - a.year);
}

function option(label, value = label) {
  const element = document.createElement("option");
  element.textContent = label;
  element.value = value;
  return element;
}

function awardRow(record, showYear) {
  const item = document.createElement("li");
  const title = document.createElement("h3");
  title.textContent = record.project || [record.competition, record.field].filter(Boolean).join(" · ");
  const context = document.createElement("p");
  context.textContent = [
    showYear ? String(record.year) : "",
    record.category,
    record.project ? record.competition : "",
    record.project ? record.field : "",
  ].filter(Boolean).join(" · ");
  const prize = document.createElement("p");
  prize.className = "award-prize";
  prize.textContent = record.award;
  item.append(title, context, prize);
  return item;
}

export function createAwardsPanel(panel, onFilters) {
  const form = panel.querySelector("#awards-filters");
  const year = form.elements.namedItem("year");
  const category = form.elements.namedItem("category");
  const search = form.elements.namedItem("q");
  const status = panel.querySelector("#awards-status");
  const results = panel.querySelector("#awards-results");
  const clear = panel.querySelector("#awards-clear");
  const retry = panel.querySelector("#awards-retry");

  let records = null;
  let request = null;
  let failed = false;
  let years = [];
  let categories = [];
  let filters = defaultFilters;

  function updateControls() {
    year.value = years.includes(filters.year) || filters.year === "all"
      ? filters.year
      : years[0] ?? "all";
    category.value = categories.includes(filters.category) ? filters.category : "";
    search.value = filters.q;
  }

  function render() {
    const loading = request !== null;
    const unavailable = records === null;
    for (const field of [year, category, search]) field.disabled = unavailable || records.length === 0;
    retry.hidden = !failed;
    clear.hidden = unavailable || !(year.value !== "all" || category.value || filters.q);
    results.setAttribute("aria-busy", String(loading));

    if (unavailable) {
      status.textContent = failed ? "無法載入獎項資料，請重新載入。" : "正在載入獎項資料…";
      results.replaceChildren();
      return;
    }

    const tokens = normalize(filters.q).trim().split(/\s+/).filter(Boolean);
    const matches = records.filter(record =>
      (year.value === "all" || String(record.year) === year.value) &&
      (!category.value || record.category === category.value) &&
      tokens.every(token => record.searchText.includes(token))
    );
    results.replaceChildren(...matches.map(record => awardRow(record, year.value === "all")));
    const openResult = panel.closest(".detail");
    if (openResult) openResult.scrollTop = 0;
    status.textContent = matches.length
      ? `顯示 ${matches.length} 筆獎項`
      : records.length ? "找不到符合的獎項，請調整篩選條件。" : "目前沒有獎項資料。";
  }

  function setFilters(next = defaultFilters) {
    filters = { ...defaultFilters, ...next };
    updateControls();
    if (records !== null || failed) render();
  }

  function load() {
    if (request || records !== null) return;
    failed = false;
    request = fetch(awardsUrl, { cache: "no-cache" })
      .then(response => {
        if (!response.ok) throw new Error(`Awards request failed: ${response.status}`);
        return response.json();
      })
      .then(data => {
        records = parseAwards(data);
        years = [...new Set(records.map(record => String(record.year)))];
        categories = [...new Set(records.map(record => record.category))]
          .sort(categoryOrder.compare);
        year.replaceChildren(option("全部年份", "all"), ...years.map(value => option(`${value} 年`, value)));
        category.replaceChildren(option("全部類別", ""), ...categories.map(value => option(value)));
        updateControls();
      })
      .catch(() => { failed = true; })
      .finally(() => {
        request = null;
        render();
      });
    render();
  }

  function applyControls() {
    filters = { year: year.value, category: category.value, q: search.value };
    render();
    onFilters(filters);
  }

  form.addEventListener("submit", event => event.preventDefault());
  year.addEventListener("change", applyControls);
  category.addEventListener("change", applyControls);
  search.addEventListener("input", applyControls);
  clear.addEventListener("click", () => {
    setFilters({ year: "all" });
    onFilters(filters);
    year.focus();
  });
  retry.addEventListener("click", load);

  return { setFilters, load };
}
