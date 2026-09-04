const state = {
  jobs: [],
  news: [],
  category: "All",
  query: "",
  view: "jobs",
};

const $ = (sel, el = document) => el.querySelector(sel);
const $$ = (sel, el = document) => Array.from(el.querySelectorAll(sel));

async function loadData() {
  try {
    const [jobsRes, newsRes] = await Promise.all([
      fetch("jobs.json", { cache: "no-store" }),
      fetch("news.json", { cache: "no-store" }),
    ]);
    state.jobs = await jobsRes.json();
    state.news = await newsRes.json();
  } catch (err) {
    console.error("Failed to load data", err);
    state.jobs = [];
    state.news = [];
  }
  buildCategoryRail();
  render();
}

function buildCategoryRail() {
  const cats = ["All", ...new Set(state.jobs.map((j) => j.category).filter(Boolean))];
  const rail = $("#category-rail");
  rail.innerHTML = cats
    .map(
      (c) =>
        `<button class="filter-chip${c === state.category ? " active" : ""}" data-cat="${escapeAttr(c)}">${escapeHtml(c)}</button>`
    )
    .join("");
  $$(".filter-chip", rail).forEach((btn) =>
    btn.addEventListener("click", () => {
      state.category = btn.dataset.cat;
      buildCategoryRail();
      render();
    })
  );
}

function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}
function escapeAttr(str) {
  return escapeHtml(str);
}

function sponsoredCard(idx) {
  return `
  <div class="job-row sponsored">
    <div class="job-main">
      <div class="sponsored-label">Sponsored</div>
      <h3>Your job could be here</h3>
      <div class="job-meta"><span>KaziRift Ads</span><span class="dot"></span><span>Featured placement</span></div>
      <p class="job-desc">Reach thousands of active job seekers across Kenya. Feature your listing at the top of the board.</p>
    </div>
    <div class="job-side">
      <a class="apply-btn" href="#" data-ad-slot="inline-${idx}">Learn more</a>
    </div>
  </div>`;
}

function jobRow(job) {
  return `
  <div class="job-row">
    <div class="job-main">
      <h3><a href="${escapeAttr(job.source || "#")}" target="_blank" rel="noopener noreferrer sponsored">${escapeHtml(job.title)}</a></h3>
      <div class="job-meta">
        <span>${escapeHtml(job.company)}</span>
        <span class="dot"></span>
        <span>${escapeHtml(job.location)}</span>
        <span class="dot"></span>
        <span>${escapeHtml(job.type || "")}</span>
        ${job.salary ? `<span class="dot"></span><span>${escapeHtml(job.salary)}</span>` : ""}
      </div>
      <p class="job-desc">${escapeHtml(job.description || "")}</p>
      <div class="job-tags">
        <span class="tag category">${escapeHtml(job.category || "General")}</span>
        ${job.deadline ? `<span class="tag">Closes ${escapeHtml(job.deadline)}</span>` : ""}
      </div>
    </div>
    <div class="job-side">
      <div>Posted ${escapeHtml(job.posted || "")}</div>
      <a class="apply-btn" href="${escapeAttr(job.source || "#")}" target="_blank" rel="noopener noreferrer sponsored">View & apply</a>
    </div>
  </div>`;
}

function newsItem(n) {
  return `
  <div class="news-item">
    <h3>${escapeHtml(n.title)}</h3>
    <div class="job-meta"><span>${escapeHtml(n.category || "Business")}</span><span class="dot"></span><span>${escapeHtml(n.posted || "")}</span></div>
    <p>${escapeHtml(n.summary || "")}</p>
    <a class="readmore" href="${escapeAttr(n.source || "#")}" target="_blank" rel="noopener noreferrer">Read full story &rarr;</a>
  </div>`;
}

function render() {
  const listEl = $("#listings");
  const countEl = $("#result-count");
  $("#panel-jobs").hidden = state.view !== "jobs";
  $("#panel-news").hidden = state.view !== "news";
  $$("nav.tabs button").forEach((b) => b.classList.toggle("active", b.dataset.view === state.view));

  if (state.view === "news") {
    const items = state.news;
    $("#news-list").innerHTML = items.length
      ? items.map(newsItem).join("")
      : `<div class="empty-state">No business news posted yet. Check back soon.</div>`;
    return;
  }

  let jobs = state.jobs.filter((j) => state.category === "All" || j.category === state.category);
  if (state.query.trim()) {
    const q = state.query.trim().toLowerCase();
    jobs = jobs.filter((j) =>
      [j.title, j.company, j.location, j.category].filter(Boolean).some((f) => f.toLowerCase().includes(q))
    );
  }

  countEl.textContent = `${jobs.length} listing${jobs.length === 1 ? "" : "s"}`;

  if (!jobs.length) {
    listEl.innerHTML = `<div class="empty-state">No listings match right now. Try a different filter or check back soon.</div>`;
    return;
  }

  const rows = [];
  jobs.forEach((job, i) => {
    rows.push(jobRow(job));
    // Insert a sponsored, job-shaped ad slot after every 3rd real listing.
    if ((i + 1) % 3 === 0 && i !== jobs.length - 1) {
      rows.push(sponsoredCard(i));
    }
  });
  listEl.innerHTML = rows.join("");
}

function initControls() {
  $$("nav.tabs button").forEach((btn) =>
    btn.addEventListener("click", () => {
      state.view = btn.dataset.view;
      render();
    })
  );
  $("#search").addEventListener("input", (e) => {
    state.query = e.target.value;
    render();
  });
}

initControls();
loadData();
