const CFG_KEY = "kazirift_admin_cfg";
const $ = (s, el = document) => el.querySelector(s);

function getCfg() {
  try { return JSON.parse(localStorage.getItem(CFG_KEY) || "null"); } catch { return null; }
}
function setCfg(cfg) { localStorage.setItem(CFG_KEY, JSON.stringify(cfg)); }
function clearCfg() { localStorage.removeItem(CFG_KEY); }

function api(path) {
  const cfg = getCfg();
  return `https://api.github.com/repos/${cfg.owner}/${cfg.repo}/contents/${path}`;
}

async function ghGet(path) {
  const cfg = getCfg();
  const res = await fetch(`${api(path)}?ref=${encodeURIComponent(cfg.branch)}`, {
    headers: { Authorization: `Bearer ${cfg.token}`, Accept: "application/vnd.github+json" },
  });
  if (!res.ok) throw new Error(`GitHub read failed (${res.status}): ${await res.text()}`);
  const data = await res.json();
  const content = decodeURIComponent(escape(atob(data.content.replace(/\n/g, ""))));
  return { json: JSON.parse(content), sha: data.sha };
}

async function ghPut(path, jsonValue, sha, message) {
  const cfg = getCfg();
  const content = btoa(unescape(encodeURIComponent(JSON.stringify(jsonValue, null, 2))));
  const res = await fetch(api(path), {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${cfg.token}`,
      Accept: "application/vnd.github+json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ message, content, sha, branch: cfg.branch }),
  });
  if (!res.ok) throw new Error(`GitHub write failed (${res.status}): ${await res.text()}`);
  return res.json();
}

function showStatus(el, msg, ok = true) {
  el.textContent = msg;
  el.className = "status " + (ok ? "ok" : "err");
}

// --- Gate ---
function initGate() {
  const cfg = getCfg();
  if (cfg && cfg.owner && cfg.repo && cfg.token) {
    $("#gate").style.display = "none";
    $("#panel").style.display = "block";
    refreshJobs();
    refreshNews();
    return;
  }
  $("#save-config").addEventListener("click", async () => {
    const owner = $("#gh-owner").value.trim();
    const repo = $("#gh-repo").value.trim();
    const branch = $("#gh-branch").value.trim() || "main";
    const token = $("#gh-token").value.trim();
    if (!owner || !repo || !token) {
      showStatus($("#gate-status"), "Fill in owner, repo, and token.", false);
      return;
    }
    setCfg({ owner, repo, branch, token });
    try {
      await ghGet("jobs.json");
      $("#gate").style.display = "none";
      $("#panel").style.display = "block";
      refreshJobs();
      refreshNews();
    } catch (e) {
      showStatus($("#gate-status"), "Could not connect: " + e.message, false);
      clearCfg();
    }
  });
  $("#disconnect")?.addEventListener("click", () => {
    clearCfg();
    location.reload();
  });
}

// --- Tabs ---
function initTabs() {
  $$two("#tab-jobs, #tab-news");
  document.querySelectorAll(".tabs2 button[data-tab]").forEach((btn) => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".tabs2 button[data-tab]").forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      $("#tab-jobs").style.display = btn.dataset.tab === "jobs" ? "block" : "none";
      $("#tab-news").style.display = btn.dataset.tab === "news" ? "block" : "none";
    });
  });
}
function $$two() {}

// --- Jobs ---
async function refreshJobs() {
  try {
    const { json } = await ghGet("jobs.json");
    $("#job-count").textContent = json.length;
    $("#job-list").innerHTML = json
      .slice()
      .reverse()
      .map(
        (j) => `<div class="item">
          <div><h4>${esc(j.title)} &mdash; ${esc(j.company)}</h4><span>${esc(j.location)} &bull; ${esc(j.category)} &bull; posted ${esc(j.posted)}</span></div>
          <button class="del" data-id="${esc(j.id)}">Remove</button>
        </div>`
      )
      .join("") || "<p>No jobs yet.</p>";
    document.querySelectorAll("#job-list .del").forEach((b) =>
      b.addEventListener("click", () => removeJob(b.dataset.id))
    );
  } catch (e) {
    $("#job-list").textContent = "Could not load: " + e.message;
  }
}

$("#add-job")?.addEventListener("click", async () => {
  const statusEl = $("#job-status");
  const title = $("#j-title").value.trim();
  const company = $("#j-company").value.trim();
  if (!title || !company) {
    showStatus(statusEl, "Title and company are required.", false);
    return;
  }
  const job = {
    id: "j-" + Date.now(),
    title,
    company,
    location: $("#j-location").value.trim(),
    category: $("#j-category").value.trim() || "General",
    type: $("#j-type").value.trim(),
    salary: $("#j-salary").value.trim(),
    posted: new Date().toISOString().slice(0, 10),
    deadline: $("#j-deadline").value,
    source: $("#j-source").value.trim(),
    description: $("#j-desc").value.trim(),
    sponsored: false,
  };
  try {
    showStatus(statusEl, "Publishing...", true);
    const { json, sha } = await ghGet("jobs.json");
    json.push(job);
    await ghPut("jobs.json", json, sha, `Add job: ${title} @ ${company}`);
    showStatus(statusEl, "Published. Live in ~30-60s once Netlify rebuilds.", true);
    ["j-title", "j-company", "j-location", "j-category", "j-type", "j-salary", "j-deadline", "j-source", "j-desc"].forEach(
      (id) => ($("#" + id).value = "")
    );
    refreshJobs();
  } catch (e) {
    showStatus(statusEl, "Failed: " + e.message, false);
  }
});

async function removeJob(id) {
  const statusEl = $("#job-status");
  try {
    const { json, sha } = await ghGet("jobs.json");
    const next = json.filter((j) => j.id !== id);
    await ghPut("jobs.json", next, sha, `Remove job ${id}`);
    showStatus(statusEl, "Removed.", true);
    refreshJobs();
  } catch (e) {
    showStatus(statusEl, "Failed: " + e.message, false);
  }
}

// --- News ---
async function refreshNews() {
  try {
    const { json } = await ghGet("news.json");
    $("#news-count").textContent = json.length;
    $("#news-list-admin").innerHTML = json
      .slice()
      .reverse()
      .map(
        (n) => `<div class="item">
          <div><h4>${esc(n.title)}</h4><span>${esc(n.category)} &bull; posted ${esc(n.posted)}</span></div>
          <button class="del" data-id="${esc(n.id)}">Remove</button>
        </div>`
      )
      .join("") || "<p>No news yet.</p>";
    document.querySelectorAll("#news-list-admin .del").forEach((b) =>
      b.addEventListener("click", () => removeNews(b.dataset.id))
    );
  } catch (e) {
    $("#news-list-admin").textContent = "Could not load: " + e.message;
  }
}

$("#add-news")?.addEventListener("click", async () => {
  const statusEl = $("#news-status");
  const title = $("#n-title").value.trim();
  if (!title) {
    showStatus(statusEl, "Headline is required.", false);
    return;
  }
  const item = {
    id: "n-" + Date.now(),
    title,
    category: $("#n-category").value.trim() || "Business",
    source: $("#n-source").value.trim(),
    summary: $("#n-summary").value.trim(),
    posted: new Date().toISOString().slice(0, 10),
  };
  try {
    showStatus(statusEl, "Publishing...", true);
    const { json, sha } = await ghGet("news.json");
    json.push(item);
    await ghPut("news.json", json, sha, `Add news: ${title}`);
    showStatus(statusEl, "Published. Live in ~30-60s once Netlify rebuilds.", true);
    ["n-title", "n-category", "n-source", "n-summary"].forEach((id) => ($("#" + id).value = ""));
    refreshNews();
  } catch (e) {
    showStatus(statusEl, "Failed: " + e.message, false);
  }
});

async function removeNews(id) {
  const statusEl = $("#news-status");
  try {
    const { json, sha } = await ghGet("news.json");
    const next = json.filter((n) => n.id !== id);
    await ghPut("news.json", next, sha, `Remove news ${id}`);
    showStatus(statusEl, "Removed.", true);
    refreshNews();
  } catch (e) {
    showStatus(statusEl, "Failed: " + e.message, false);
  }
}

function esc(str) {
  return String(str ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

initGate();
initTabs();
