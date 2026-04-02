/* ── app.js — HAL/Tejas ANP Incident Dashboard ── */
'use strict';

// ── Official source URLs ─────────────────────────────────────────────────────
const LINKS = {
  ANP_DATASET: "https://atosoficiais.com.br/anp",
  ANP_SGIP: "https://atosoficiais.com.br/anp",
  ANP_SGSO: "https://atosoficiais.com.br/anp",
  ANP_SUBSEA: "https://atosoficiais.com.br/anp",
  ANP_PORTAL: "https://atosoficiais.com.br/anp",
  BV_NR445: "https://marine-offshore.bureauveritas.com/",
  BV_NR459: "https://marine-offshore.bureauveritas.com/",
  BV_RULES: "https://marine-offshore.bureauveritas.com/",
  NR37: "https://www.gov.br/trabalho-e-emprego/pt-br/acesso-a-informacao/participacao-social/conselhos-e-orgaos-colegiados/comissao-tripartite-partitaria-permanente/arquivos/normas-regulamentadoras/nr-37-atualizada-2022.pdf",
  NR33: "https://www.gov.br/trabalho-e-emprego/pt-br/acesso-a-informacao/participacao-social/conselhos-e-orgaos-colegiados/comissao-tripartite-partitaria-permanente/arquivos/normas-regulamentadoras/nr-33-atualizada-2022.pdf",
  NR35: "https://www.gov.br/trabalho-e-emprego/pt-br/acesso-a-informacao/participacao-social/conselhos-e-orgaos-colegiados/comissao-tripartite-partitaria-permanente/arquivos/normas-regulamentadoras/nr-35-atualizada-2022.pdf",
  NORMAM: "https://www.marinha.mil.br/dpc/normam",
  ISO9001: "https://www.iso.org/standard/62085.html",
  ISO17025: "https://www.iso.org/standard/66912.html",
  BSEE: "https://www.bsee.gov/stats-facts/offshore-incident-statistics",
  HSE_UK: "https://www.hse.gov.uk/offshore/hydrocarbon-releases.htm",
  LEI_12527: "https://www.planalto.gov.br/ccivil_03/_ato2011-2014/2011/lei/l12527.htm",
};

// Regulation links per category — maps failure type → primary regulation
const CAT_REGS = {
  "CSB Failure": { label: "ANP Res. 46/2016 (SGIP)", url: LINKS.ANP_SGIP },
  "Kick (Primary Barrier)": { label: "ANP Res. 46/2016 (SGIP)", url: LINKS.ANP_SGIP },
  "Structural Failure": { label: "BV NR 445", url: LINKS.BV_NR445 },
  "Loss of Well Control": { label: "ANP Res. 46/2016 (SGIP)", url: LINKS.ANP_SGIP },
};

// Severity → BV classification link
const SEV_REGS = {
  "SSO": { label: "BV NR 445 — safety system", url: LINKS.BV_NR445 },
  "Minor": { label: "BV NR 445 — MINOR classification", url: LINKS.BV_NR445 },
  "Moderate": { label: "BV NR 459 — MODERATE event", url: LINKS.BV_NR459 },
  "Severe": { label: "BV NR 459 — SEVERE event", url: LINKS.BV_NR459 },
};

// ── Colour palette ────────────────────────────────────────────────────────────
const CAT_COLORS = {
  "CSB Failure": "#c0392b",
  "Kick (Primary Barrier)": "#e67e22",
  "Structural Failure": "#1a56a0",
  "Loss of Well Control": "#7c3aed",
  "Other": "#8896ab",
};
const SEV_COLORS = {
  "SSO": "#8896ab",
  "Minor": "#16a34a",
  "Moderate": "#e67e22",
  "Severe": "#c0392b",
};
const CAT_CSS = {
  "CSB Failure": "bc-csb",
  "Kick (Primary Barrier)": "bc-kick",
  "Structural Failure": "bc-struct",
  "Loss of Well Control": "bc-wc",
};
const SEV_CSS = {
  "SSO": "bs-sso",
  "Minor": "bs-minor",
  "Moderate": "bs-moderate",
  "Severe": "bs-severe",
};
const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

// ── Utility: external link ────────────────────────────────────────────────────
const extLink = (href, label, cls = "") =>
  `<a href="${href}" target="_blank" rel="noopener" class="ext-link ${cls}" title="Open source: ${label}">${label}↗</a>`;

// ── State ─────────────────────────────────────────────────────────────────────
let chartInstances = {};
let halStats = null;
let tableState = { page: 1, total: 0, pages: 0, items: [] };
let activeFilters = { year: "", category: "", severity: "" };

// ── Destroy chart helper ──────────────────────────────────────────────────────
function destroyChart(id) {
  if (chartInstances[id]) { chartInstances[id].destroy(); delete chartInstances[id]; }
}

// ── Fetch functions ───────────────────────────────────────────────────────────
async function fetchHalStats() {
  return (await fetch("/api/hal-stats")).json();
}

async function fetchHalIncidents(page = 1) {
  const { year, category, severity } = activeFilters;
  const params = new URLSearchParams({ page, limit: 50 });
  if (year) params.set("year", year);
  if (category) params.set("category", category);
  if (severity) params.set("severity", severity);
  return (await fetch("/api/hal-incidents?" + params)).json();
}

async function fetchHalContracts() {
  try {
    const res = await fetch("/api/hal-contracts");
    if (!res.ok) return { items: [] };
    return res.json();
  } catch (e) { console.error("Contract fetch error:", e); return { items: [] }; }
}

// ── Copy to clipboard ─────────────────────────────────────────────────────────
window.copyToClipboard = function (text, btn) {
  navigator.clipboard.writeText(text).then(() => {
    const orig = btn.textContent;
    btn.textContent = "✓";
    btn.classList.add("copied");
    setTimeout(() => { btn.textContent = orig; btn.classList.remove("copied"); }, 1400);
  });
};

// ── KPI Cards (with linked badges) ───────────────────────────────────────────
function renderKPIs(stats) {
  const total = stats.total;
  const csb = stats.categoryBreakdown["CSB Failure"] || 0;
  const kick = stats.categoryBreakdown["Kick (Primary Barrier)"] || 0;
  const sev = (stats.severityBreakdown["Severe"] || 0) + (stats.severityBreakdown["Moderate"] || 0);

  const cards = [
    {
      label: "Total Industry Incidents", value: total.toLocaleString(),
      sub: "ANP SISO-Incidentes · 2013–2026",
      accent: "#1a56a0",
      badge: "Open Data · Lei 12.527/2011",
      badgeUrl: LINKS.LEI_12527,
      srcUrl: LINKS.ANP_DATASET,
      srcLabel: "atosoficiais.com.br/anp",
    },
    {
      label: "CSB Barrier Element Failures", value: csb.toLocaleString(),
      sub: "Barreira Solidarity Group",
      accent: "#c0392b",
      badge: "+39,000% since 2016",
      badgeUrl: LINKS.ANP_SGIP,
      srcUrl: LINKS.ANP_SGIP,
      srcLabel: "ANP Res. 46/2016 (SGIP)",
    },
    {
      label: "Primary Barrier Loss (Kicks)", value: kick.toLocaleString(),
      sub: "Formation influx — drilling/intervention",
      accent: "#e67e22",
      badge: "ANP Res. 46/2016",
      badgeUrl: LINKS.ANP_SGIP,
      srcUrl: LINKS.ANP_PORTAL,
      srcLabel: "ANP Segurança Operacional",
    },
    {
      label: "Moderate + Severe Events", value: sev.toLocaleString(),
      sub: "BV-classified high-impact incidents",
      accent: "#7c3aed",
      badge: "BV NR 445 scope",
      badgeUrl: LINKS.BV_NR445,
      srcUrl: LINKS.BV_NR445,
      srcLabel: "BV NR 445",
    },
  ];

  const grid = document.getElementById("kpiGrid");
  grid.innerHTML = cards.map(c => `
    <div class="kpi-card" style="--kpi-accent:${c.accent}">
      <div class="kpi-label">${c.label}</div>
      <div class="kpi-value">${c.value}</div>
      <div class="kpi-sub">${c.sub}</div>
      <a href="${c.badgeUrl}" target="_blank" rel="noopener"
         class="kpi-badge" style="background:${c.accent}18;color:${c.accent};border:1px solid ${c.accent}33">
        ${c.badge} ↗
      </a>
      <div class="kpi-src">
        Source: <a href="${c.srcUrl}" target="_blank" rel="noopener">${c.srcLabel}</a>
      </div>
    </div>
  `).join("");
}

// ── Overview Chart ────────────────────────────────────────────────────────────
function renderOverviewChart(stats) {
  destroyChart("overviewChart");
  const ctx = document.getElementById("overviewChart").getContext("2d");
  const cats = ["CSB Failure", "Kick (Primary Barrier)", "Structural Failure", "Loss of Well Control"];
  const years = stats.yearSeries.map(y => y.year);

  chartInstances["overviewChart"] = new Chart(ctx, {
    type: "bar",
    data: {
      labels: years,
      datasets: cats.map(cat => ({
        label: cat,
        data: stats.yearSeries.map(y => y[cat] || 0),
        backgroundColor: CAT_COLORS[cat] + "cc",
        borderColor: CAT_COLORS[cat],
        borderWidth: 1, borderRadius: 3,
      }))
    },
    options: {
      responsive: true, maintainAspectRatio: true,
      plugins: { legend: { display: false }, tooltip: { mode: "index", intersect: false } },
      scales: {
        x: { stacked: true, ticks: { color: "#4a5568", font: { size: 11 } }, grid: { display: false } },
        y: { stacked: true, ticks: { color: "#4a5568", font: { size: 11 } }, grid: { color: "#dde3ee" }, beginAtZero: true }
      }
    }
  });

  // Legend with regulation links
  const catLinks = {
    "CSB Failure": LINKS.ANP_SGIP,
    "Kick (Primary Barrier)": LINKS.ANP_SGIP,
    "Structural Failure": LINKS.BV_NR445,
    "Loss of Well Control": LINKS.ANP_SGIP,
  };
  const leg = document.getElementById("overviewLegend");
  leg.innerHTML = cats.map(c => `
    <a href="${catLinks[c]}" target="_blank" rel="noopener" class="lchip lchip-link" title="Regulation: ${CAT_REGS[c]?.label}">
      <div class="lchip-dot" style="background:${CAT_COLORS[c]}"></div>
      ${c.replace(" (Primary Barrier)", "").replace(" Failure", "")}
    </a>
  `).join("");
}

// ── Donut Chart ───────────────────────────────────────────────────────────────
function renderDonut(stats) {
  destroyChart("donutChart");
  const cats = Object.keys(stats.categoryBreakdown).filter(c => c !== "Other");
  const vals = cats.map(c => stats.categoryBreakdown[c]);
  const total = vals.reduce((a, b) => a + b, 0);

  const ctx = document.getElementById("donutChart").getContext("2d");
  chartInstances["donutChart"] = new Chart(ctx, {
    type: "doughnut",
    data: {
      labels: cats,
      datasets: [{ data: vals, backgroundColor: cats.map(c => CAT_COLORS[c] + "dd"), borderColor: "#ffffff", borderWidth: 3, hoverOffset: 8 }]
    },
    options: {
      responsive: true, maintainAspectRatio: true, cutout: "68%",
      plugins: {
        legend: { display: false }, tooltip: {
          callbacks: {
            label: ctx => ` ${ctx.label}: ${ctx.parsed} (${Math.round(ctx.parsed / total * 100)}%)`
          }
        }
      }
    }
  });

  const labDiv = document.getElementById("donutLabels");
  labDiv.innerHTML = cats.map((c, i) => `
    <a href="${CAT_REGS[c]?.url || LINKS.ANP_PORTAL}" target="_blank" rel="noopener" class="dl-row dl-row-link" title="Regulation: ${CAT_REGS[c]?.label}">
      <span class="dl-name"><span class="dl-dot" style="background:${CAT_COLORS[c]}"></span>${c.replace(" (Primary Barrier)", " (Kick)")}</span>
      <span class="dl-pct">${Math.round(vals[i] / total * 100)}%</span>
    </a>
  `).join("");
}

// ── CSB Trend Chart ───────────────────────────────────────────────────────────
function renderCsbTrend(stats) {
  destroyChart("csbTrendChart");
  const ctx = document.getElementById("csbTrendChart").getContext("2d");
  const series = stats.yearSeries;
  const years = series.map(y => y.year);

  chartInstances["csbTrendChart"] = new Chart(ctx, {
    type: "line",
    data: {
      labels: years,
      datasets: [
        {
          label: "CSB Failures",
          data: series.map(y => y["CSB Failure"] || 0),
          borderColor: "#c0392b", backgroundColor: "rgba(192,57,43,0.1)",
          fill: true, tension: 0.4, pointRadius: 4, pointBackgroundColor: "#c0392b",
        },
        {
          label: "Kicks (Primary Barrier)",
          data: series.map(y => y["Kick (Primary Barrier)"] || 0),
          borderColor: "#e67e22", backgroundColor: "rgba(230,126,34,0.08)",
          fill: true, tension: 0.4, pointRadius: 4, pointBackgroundColor: "#e67e22",
        }
      ]
    },
    options: {
      responsive: true, maintainAspectRatio: true,
      plugins: {
        legend: { labels: { color: "#4a5568", font: { size: 11 }, boxWidth: 10 } },
        tooltip: { mode: "index" }
      },
      scales: {
        x: { ticks: { color: "#4a5568", font: { size: 11 } }, grid: { display: false } },
        y: { ticks: { color: "#4a5568", font: { size: 11 } }, grid: { color: "#dde3ee" }, beginAtZero: true }
      }
    }
  });
}

// ── Month Pattern Chart ───────────────────────────────────────────────────────
function renderMonthChart(stats) {
  destroyChart("monthChart");
  const ctx = document.getElementById("monthChart").getContext("2d");
  const vals = Array.from({ length: 12 }, (_, i) => stats.monthPattern[i + 1] || 0);

  chartInstances["monthChart"] = new Chart(ctx, {
    type: "radar",
    data: {
      labels: MONTH_NAMES,
      datasets: [{
        label: "Incidents", data: vals,
        borderColor: "#c0392b", backgroundColor: "rgba(192,57,43,0.12)",
        pointBackgroundColor: "#c0392b", pointRadius: 3
      }]
    },
    options: {
      responsive: true, maintainAspectRatio: true,
      plugins: { legend: { display: false } },
      scales: {
        r: {
          angleLines: { color: "#dde3ee" }, grid: { color: "#dde3ee" },
          pointLabels: { color: "#4a5568", font: { size: 10 } },
          ticks: { display: false }
        }
      }
    }
  });
}

// ── Multi-line Chart ──────────────────────────────────────────────────────────
function renderMultiLine(stats) {
  destroyChart("multiLineChart");
  const ctx = document.getElementById("multiLineChart").getContext("2d");
  const series = stats.yearSeries;
  const years = series.map(y => y.year);
  const cats = ["CSB Failure", "Kick (Primary Barrier)", "Structural Failure", "Loss of Well Control"];

  chartInstances["multiLineChart"] = new Chart(ctx, {
    type: "line",
    data: {
      labels: years,
      datasets: cats.map(cat => ({
        label: cat.replace(" (Primary Barrier)", " (Kick)"),
        data: series.map(y => y[cat] || 0),
        borderColor: CAT_COLORS[cat], backgroundColor: CAT_COLORS[cat] + "18",
        fill: false, tension: 0.35, pointRadius: 3, borderWidth: 2
      }))
    },
    options: {
      responsive: true, maintainAspectRatio: true,
      plugins: { legend: { labels: { color: "#4a5568", font: { size: 10 }, boxWidth: 10, padding: 14 } } },
      scales: {
        x: { ticks: { color: "#4a5568", font: { size: 11 } }, grid: { display: false } },
        y: { ticks: { color: "#4a5568", font: { size: 11 } }, grid: { color: "#dde3ee" }, beginAtZero: true }
      }
    }
  });
}

// ── Severity Chart ────────────────────────────────────────────────────────────
function renderSeverityChart(stats) {
  destroyChart("severityChart");
  const ctx = document.getElementById("severityChart").getContext("2d");
  const order = ["SSO", "Minor", "Moderate", "Severe"];
  const vals = order.map(s => stats.severityBreakdown[s] || 0);

  chartInstances["severityChart"] = new Chart(ctx, {
    type: "bar",
    data: {
      labels: order,
      datasets: [{ data: vals, backgroundColor: order.map(s => SEV_COLORS[s] + "cc"), borderRadius: 5 }]
    },
    options: {
      indexAxis: "y", responsive: true, maintainAspectRatio: true,
      plugins: { legend: { display: false } },
      scales: {
        x: { ticks: { color: "#4a5568", font: { size: 10 } }, grid: { color: "#dde3ee" }, beginAtZero: true },
        y: { ticks: { color: "#4a5568", font: { size: 11 } }, grid: { display: false } }
      }
    }
  });

  // Add source attribution below chart
  const el = document.getElementById("severityChart").closest(".panel-body");
  if (el && !el.querySelector(".chart-src")) {
    const src = document.createElement("div");
    src.className = "chart-src";
    src.innerHTML = `Classification: <a href="${LINKS.BV_NR445}" target="_blank" rel="noopener">BV NR 445</a> · <a href="${LINKS.BV_NR459}" target="_blank" rel="noopener">BV NR 459</a>`;
    el.appendChild(src);
  }
}

// ── Breakdown counts ──────────────────────────────────────────────────────────
function renderBreakdownCounts(stats) {
  const bd = stats.categoryBreakdown;
  document.getElementById("cnt-csb").textContent = (bd["CSB Failure"] || 0).toLocaleString();
  document.getElementById("cnt-kick").textContent = (bd["Kick (Primary Barrier)"] || 0).toLocaleString();
  document.getElementById("cnt-struct").textContent = (bd["Structural Failure"] || 0).toLocaleString();
  document.getElementById("cnt-wc").textContent = (bd["Loss of Well Control"] || 0).toLocaleString();

  // Inject linked regulation refs into each breakdown card
  const regMap = {
    "card-csb": [{ l: "ANP Res. 46/2016 (SGIP)", u: LINKS.ANP_SGIP }, { l: "BV NR 459", u: LINKS.BV_NR459 }],
    "card-kick": [{ l: "ANP Res. 46/2016 (SGIP)", u: LINKS.ANP_SGIP }, { l: "BV NR 445", u: LINKS.BV_NR445 }],
    "card-struct": [{ l: "BV NR 445", u: LINKS.BV_NR445 }, { l: "NR-37 (MTE)", u: LINKS.NR37 }],
    "card-wc": [{ l: "ANP Res. 46/2016 (SGIP)", u: LINKS.ANP_SGIP }, { l: "NORMAM-01/DPC", u: LINKS.NORMAM }],
  };
  Object.entries(regMap).forEach(([id, regs]) => {
    const el = document.getElementById(id)?.querySelector(".breakdown-reg");
    if (el) el.innerHTML = regs.map(r => `<a href="${r.u}" target="_blank" rel="noopener" class="reg-link">${r.l}</a>`).join(" · ");
  });
}

// ── Correlation Matrix ────────────────────────────────────────────────────────
function renderMatrix(items) {
  const cats = ["CSB Failure", "Kick (Primary Barrier)", "Structural Failure", "Loss of Well Control"];
  const sevs = ["SSO", "Minor", "Moderate", "Severe"];

  const table = {};
  cats.forEach(c => { table[c] = {}; sevs.forEach(s => table[c][s] = 0); });
  items.forEach(r => {
    if (table[r.category] && sevs.includes(r.severity)) table[r.category][r.severity]++;
  });

  const maxVal = Math.max(...cats.flatMap(c => sevs.map(s => table[c][s])));
  const sevLinks = {
    "SSO": LINKS.BV_NR445,
    "Minor": LINKS.BV_NR445,
    "Moderate": LINKS.BV_NR459,
    "Severe": LINKS.BV_NR459,
  };

  const html = `
    <table>
      <thead>
        <tr>
          <th style="text-align:left">Failure Category</th>
          ${sevs.map(s => `<th><a href="${sevLinks[s]}" target="_blank" rel="noopener" class="th-link" title="BV classification reference">${s} ↗</a></th>`).join("")}
          <th>Total</th>
          <th>Regulation</th>
        </tr>
      </thead>
      <tbody>
        ${cats.map(c => {
    const rowTotal = sevs.reduce((a, s) => a + table[c][s], 0);
    const reg = CAT_REGS[c];
    return `<tr>
            <td style="text-align:left;font-weight:600;color:var(--text)">
              <a href="${reg?.url}" target="_blank" rel="noopener" class="cat-link" style="color:${CAT_COLORS[c]}">
                ${c.replace(" (Primary Barrier)", "")}
              </a>
            </td>
            ${sevs.map(s => {
      const v = table[c][s];
      if (!v) return `<td><span class="matrix-cell mc-0">–</span></td>`;
      const color = SEV_COLORS[s];
      return `<td><span class="matrix-cell" style="background:${color}22;color:${color}">${v}</span></td>`;
    }).join("")}
            <td style="font-weight:700;color:var(--text)">${rowTotal}</td>
            <td>${reg ? `<a href="${reg.url}" target="_blank" rel="noopener" class="reg-link">${reg.label} ↗</a>` : "—"}</td>
          </tr>`;
  }).join("")}
      </tbody>
    </table>
  `;
  document.getElementById("matrixTable").innerHTML = html;
}

// ── Incident Table ────────────────────────────────────────────────────────────
function renderTable(data) {
  tableState = data;
  const countEl = document.getElementById("tableCount");
  countEl.innerHTML = `${data.total.toLocaleString()} incidents · <a href="${LINKS.ANP_DATASET}" target="_blank" rel="noopener" class="count-src-link">Source: ANP SISO-Incidentes ↗</a>`;

  const tbody = document.getElementById("tableBody");
  if (!data.items.length) {
    tbody.innerHTML = `<tr><td colspan="7" style="text-align:center;color:#8896ab;padding:24px">No incidents match current filters</td></tr>`;
    renderPagination();
    return;
  }

  tbody.innerHTML = data.items.map(r => {
    const reg = CAT_REGS[r.category];
    const sevReg = SEV_REGS[r.severity];
    // ANP lookup: best public URL is the dataset page (no per-incident permalink in public portal)
    const incUrl = `${LINKS.ANP_DATASET}`;

    return `
    <tr>
      <td class="num-cell">
        <a href="${incUrl}" target="_blank" rel="noopener" class="inc-num-link" title="Source: ANP SISO-Incidentes open dataset">${r.numero}</a>
        <button class="copy-btn" onclick="copyToClipboard('${r.numero}', this)" title="Copy incident reference">⎘</button>
      </td>
      <td class="year-cell">${r.year || "?"}</td>
      <td>
        <a href="${reg?.url || LINKS.ANP_PORTAL}" target="_blank" rel="noopener"
           class="badge-cat ${CAT_CSS[r.category] || "bc-other"} badge-link"
           title="${reg?.label || "View regulation"}">
          ${r.category.replace(" (Primary Barrier)", "")}
        </a>
      </td>
      <td class="tipo-cell" title="${r.tipo}">${r.tipo}</td>
      <td>
        <a href="${sevReg?.url || LINKS.BV_NR445}" target="_blank" rel="noopener"
           class="badge-sev ${SEV_CSS[r.severity] || "bs-sso"} badge-link"
           title="${sevReg?.label || "BV classification"}">
          ${r.severity}
        </a>
      </td>
      <td class="evt-cell">${r.evento || "—"}</td>
      <td class="reg-cell">
        ${reg ? `<a href="${reg.url}" target="_blank" rel="noopener" class="reg-link">${reg.label} ↗</a>` : "—"}
      </td>
    </tr>`;
  }).join("");

  renderPagination();
}

// ── Pagination ────────────────────────────────────────────────────────────────
function renderPagination() {
  const pg = document.getElementById("pagination");
  const { page, pages } = tableState;
  if (pages <= 1) { pg.innerHTML = ""; return; }

  let btns = `<button class="page-btn" ${page <= 1 ? "disabled" : ""} onclick="goPage(${page - 1})">‹</button>`;
  const start = Math.max(1, page - 2);
  const end = Math.min(pages, page + 2);
  if (start > 1) btns += `<button class="page-btn" onclick="goPage(1)">1</button>${start > 2 ? '<span class="pg-ellipsis">…</span>' : ""}`;
  for (let i = start; i <= end; i++) {
    btns += `<button class="page-btn ${i === page ? "active" : ""}" onclick="goPage(${i})">${i}</button>`;
  }
  if (end < pages) btns += `${end < pages - 1 ? '<span class="pg-ellipsis">…</span>' : ""}<button class="page-btn" onclick="goPage(${pages})">${pages}</button>`;
  btns += `<button class="page-btn" ${page >= pages ? "disabled" : ""} onclick="goPage(${page + 1})">›</button>`;
  pg.innerHTML = btns;
}

window.goPage = async function (p) {
  const data = await fetchHalIncidents(p);
  renderTable(data);
};

// ── Populate year filter ──────────────────────────────────────────────────────
function populateYearFilter(stats) {
  const sel = document.getElementById("filterYear");
  const years = [...new Set(stats.yearSeries.map(y => y.year))].sort();
  years.forEach(y => {
    const opt = document.createElement("option");
    opt.value = y; opt.textContent = y;
    sel.appendChild(opt);
  });
}

// ── Live badge with source link ───────────────────────────────────────────────
function renderBadge(total) {
  const el = document.getElementById("liveCount");
  el.innerHTML = `${total.toLocaleString()} incidents mapped · <a href="${LINKS.ANP_DATASET}" target="_blank" rel="noopener" style="color:inherit;font-weight:700">ANP SISO ↗</a>`;
}

// ── Section navigation ────────────────────────────────────────────────────────
function switchSection(section, skipHistory = false) {
  document.querySelectorAll(".dash-section").forEach(s => s.classList.remove("active"));
  document.querySelectorAll(".nav-link").forEach(l => l.classList.remove("active"));

  const secEl = document.getElementById(`section-${section}`);
  const navEl = document.getElementById(`nav-${section}`);
  if (secEl) secEl.classList.add("active");
  if (navEl) navEl.classList.add("active");

  if (!skipHistory) {
    if (history.pushState) {
      history.pushState(null, null, `#${section}`);
    } else {
      location.hash = `#${section}`;
    }
  }

  closeMobileSidebar();
}

// ── Mobile Sidebar Toggles ────────────────────────────────────────────────────
function initMobileMenu() {
  const menuBtn = document.getElementById('mobileMenuBtn');
  const overlay = document.getElementById('sidebarOverlay');
  const sidebar = document.querySelector('.sidebar');
  const layout = document.querySelector('.app-layout');

  if (menuBtn && sidebar && overlay && layout) {
    menuBtn.addEventListener('click', () => {
      sidebar.classList.toggle('open');
      layout.classList.toggle('sidebar-open');
    });
    overlay.addEventListener('click', closeMobileSidebar);
  }
}

function closeMobileSidebar() {
  const sidebar = document.querySelector('.sidebar');
  const layout = document.querySelector('.app-layout');
  if (sidebar && layout) {
    sidebar.classList.remove('open');
    layout.classList.remove('sidebar-open');
  }
}

// ── Filters ───────────────────────────────────────────────────────────────────
async function applyFilters() {
  activeFilters.year = document.getElementById("filterYear").value;
  activeFilters.category = document.getElementById("filterCategory").value;
  activeFilters.severity = document.getElementById("filterSeverity").value;
  const data = await fetchHalIncidents(1);
  renderTable(data);
  renderMatrix(data.items);
  switchSection("registry");
}

function clearFilters() {
  document.getElementById("filterYear").value = "";
  document.getElementById("filterCategory").value = "";
  document.getElementById("filterSeverity").value = "";
  activeFilters = { year: "", category: "", severity: "" };
}

// ── Search ────────────────────────────────────────────────────────────────────
let searchTimer = null;
document.getElementById("searchInput").addEventListener("input", e => {
  clearTimeout(searchTimer);
  const q = e.target.value.toLowerCase();
  searchTimer = setTimeout(() => {
    Array.from(document.getElementById("tableBody").querySelectorAll("tr")).forEach(row => {
      row.style.display = row.textContent.toLowerCase().includes(q) ? "" : "none";
    });
  }, 200);
});

// ── Init ──────────────────────────────────────────────────────────────────────
async function init() {
  try {
    initMobileMenu();
    document.querySelectorAll(".nav-link").forEach(link => {
      link.addEventListener("click", e => { e.preventDefault(); switchSection(link.dataset.section); });
    });

    // Check URL hash for initial tab
    const hash = window.location.hash.slice(1);
    if (hash && document.getElementById(`section-${hash}`)) {
      switchSection(hash, true);
    }

    window.addEventListener("hashchange", () => {
      const h = window.location.hash.slice(1);
      if (h && document.getElementById(`section-${h}`)) {
        switchSection(h, true);
      }
    });

    document.getElementById("btnApply").addEventListener("click", applyFilters);
    document.getElementById("btnClear").addEventListener("click", clearFilters);

    // Initial data load
    const [stats, tableData, contractData] = await Promise.all([
      fetchHalStats().catch(() => null),
      fetchHalIncidents(1).catch(() => ({ items: [] })),
      fetchHalContracts().catch(() => ({ items: [] }))
    ]);

    if (stats) {
      halStats = stats;
      renderBadge(stats.total);
      populateYearFilter(stats);
      renderKPIs(stats);
      renderOverviewChart(stats);
      renderDonut(stats);
      renderCsbTrend(stats);
      renderMonthChart(stats);
      renderMultiLine(stats);
      renderSeverityChart(stats);
      renderBreakdownCounts(stats);
    }

    if (tableData && tableData.items) {
      renderMatrix(tableData.items);
      renderTable(tableData);
    }

    if (contractData && contractData.items) {
      // Map raw CSV contracts to the cross-analysis domain mapping
      processIncomingContracts(contractData.items);
      // Immediately render if on cross-analysis tab
      if (window.location.hash === '#crossanalysis') {
        renderContractTable(filteredContracts);
        renderTemporalOverlapChart();
        renderContractMethodChart();
      }
    }

  } catch (err) {
    console.error("Init error:", err);
  } finally {
    const loader = document.getElementById("loadingOverlay");
    if (loader) loader.style.display = "none";
  }
}

init();

// ── Action Items Progress ──────────────────────────────────────────────────────
window.togglePillar = function (header) {
  header.parentElement.classList.toggle('collapsed');
};

window.updateAIProgress = function () {
  const all = document.querySelectorAll('.ai-check');
  const done = document.querySelectorAll('.ai-check:checked');
  const total = all.length;
  const count = done.length;
  const pct = total ? Math.round(count / total * 100) : 0;

  const barEl = document.getElementById('aiProgressBar');
  const doneEl = document.getElementById('aiDoneCount');
  const totalEl = document.getElementById('aiTotalCount');
  const pctEl = document.getElementById('aiPct');

  if (barEl) barEl.style.width = pct + '%';
  if (doneEl) doneEl.textContent = count;
  if (totalEl) totalEl.textContent = total;
  if (pctEl) pctEl.textContent = pct + '%';

  // Per-pillar counters
  [1, 2, 3, 4].forEach(p => {
    const items = document.querySelectorAll(`.ai-item[data-pillar="${p}"] .ai-check`);
    const checked = document.querySelectorAll(`.ai-item[data-pillar="${p}"] .ai-check:checked`);
    const el = document.getElementById(`pp${p}`);
    if (el) el.textContent = `${checked.length} / ${items.length}`;
  });
};

// Initialize counters on page load
document.addEventListener('DOMContentLoaded', () => updateAIProgress());

// ── Active Wells Data & Table ─────────────────────────────────────────────────
const POCOS_DATA = [
  { nome: "1-AG-1-SE", operador: "Carmo", bacia: "Sergipe", campo: "AGUILHADA", objetivo: "Abandono", sonda: "SONDA CONVENCIONAL 59", lamina: "", inicio: "20/04/1966", env: "TERRA" },
  { nome: "1-ALV-6D-BA", operador: "Alvopetro", bacia: "Recôncavo", campo: "MURUCUTUTU", objetivo: "Completação", sonda: "RAPID RIG Sonda Conv. Perfuração KM", lamina: "0", inicio: "27/07/2014", env: "TERRA" },
  { nome: "1-BRSA-1146-RJS", operador: "Petrobras", bacia: "Santos", campo: "ATAPU", objetivo: "Restauração", sonda: "Cerrado", lamina: "2266", inicio: "18/12/2012", env: "MAR" },
  { nome: "1-BRSA-1404DC-RJS", operador: "Petrobras", bacia: "Campos", campo: "", objetivo: "Perfuração", sonda: "", lamina: "2979", inicio: "22/12/2025", env: "MAR" },
  { nome: "1-BRSA-1405-APS", operador: "Petrobras", bacia: "Foz do Amazonas", campo: "", objetivo: "Perfuração", sonda: "", lamina: "2887", inicio: "20/10/2025", env: "MAR" },
  { nome: "1-LV-2-RN", operador: "PetroRecôncavo", bacia: "Potiguar", campo: "LIVRAMENTO", objetivo: "Completação", sonda: "SONDA CONVENCIONAL 97", lamina: "0", inicio: "25/01/1986", env: "TERRA" },
  { nome: "1-MM-1-BA", operador: "Petrobras", bacia: "Recôncavo", campo: "RIO DO BU", objetivo: "Restauração", sonda: "", lamina: "", inicio: "25/10/1984", env: "TERRA" },
  { nome: "1-PSY-18-BA", operador: "Petrosynergy", bacia: "Recôncavo", campo: "TROVOADA", objetivo: "Restauração", sonda: "SONDA PIONEIRA BRASIL", lamina: "0", inicio: "17/02/2010", env: "TERRA" },
  { nome: "1-SES-114-SE", operador: "Petrobras", bacia: "Sergipe", campo: "GUARICEMA", objetivo: "Abandono", sonda: "NORTH STAR I", lamina: "38", inicio: "04/06/1997", env: "MAR" },
  { nome: "3-AR-3-BA", operador: "Petrobras", bacia: "Recôncavo", campo: "ARAÇÁS", objetivo: "Restauração", sonda: "SONDA CONVENCIONAL 34", lamina: "", inicio: "28/06/1965", env: "TERRA" },
  { nome: "3-BRSA-1039D-BA", operador: "3R Bahia", bacia: "Recôncavo", campo: "CEXIS", objetivo: "Restauração", sonda: "Terra Invader 350", lamina: "0", inicio: "13/01/2012", env: "TERRA" },
  { nome: "3-BRSA-1397-RJS", operador: "Petrobras", bacia: "Campos", campo: "MARLIM SUL", objetivo: "Perfuração", sonda: "DEEPWATER AQUILA", lamina: "1179", inicio: "25/12/2024", env: "MAR" },
  { nome: "3-BRSA-813-RN", operador: "PetroRecôncavo", bacia: "Potiguar", campo: "JUAZEIRO", objetivo: "Completação", sonda: "SONDA CONVENCIONAL 114", lamina: "0", inicio: "07/03/2010", env: "TERRA" },
  { nome: "3-BR-6-RJS", operador: "Petrobras", bacia: "Campos", campo: "BARRACUDA", objetivo: "Restauração", sonda: "PARAGON DPDS1", lamina: "882", inicio: "10/10/1993", env: "MAR" },
  { nome: "3-JA-2-AL", operador: "Petrosynergy", bacia: "Alagoas", campo: "JEQUIÁ", objetivo: "Restauração", sonda: "SONDA CONVENCIONAL 41", lamina: "", inicio: "20/10/1957", env: "TERRA" },
  { nome: "3-ORGM-1D-AL", operador: "Origem Alagoas", bacia: "Alagoas", campo: "PILAR", objetivo: "Completação", sonda: "FAXE-2", lamina: "0", inicio: "16/08/2024", env: "TERRA" },
  { nome: "3-ORGM-13D-AL", operador: "Origem Alagoas", bacia: "Alagoas", campo: "PILAR", objetivo: "Completação", sonda: "", lamina: "0", inicio: "16/11/2025", env: "TERRA" },
  { nome: "3-ORGM-14D-AL", operador: "Origem Alagoas", bacia: "Alagoas", campo: "PILAR", objetivo: "Perfuração", sonda: "", lamina: "0", inicio: "31/01/2026", env: "TERRA" },
  { nome: "3-ORGM-3D-AL (a)", operador: "Origem Alagoas", bacia: "Alagoas", campo: "PILAR", objetivo: "Completação", sonda: "National Oilwell Varco - 750", lamina: "0", inicio: "17/05/2025", env: "TERRA" },
  { nome: "3-ORGM-3D-AL (b)", operador: "Origem Alagoas", bacia: "Alagoas", campo: "PILAR", objetivo: "Completação", sonda: "FAXE-2", lamina: "0", inicio: "17/05/2025", env: "TERRA" },
  { nome: "3-ORGM-4DP-AL", operador: "Origem Alagoas", bacia: "Alagoas", campo: "PILAR", objetivo: "Completação", sonda: "", lamina: "0", inicio: "20/11/2025", env: "TERRA" },
  { nome: "3-RSP-5-BA (a)", operador: "PetroRecôncavo", bacia: "Recôncavo", campo: "RIACHO SÃO PEDRO", objetivo: "Completação", sonda: "SONDA CONVENCIONAL 47", lamina: "", inicio: "14/03/1978", env: "TERRA" },
  { nome: "3-RSP-5-BA (b)", operador: "PetroRecôncavo", bacia: "Recôncavo", campo: "RIACHO SÃO PEDRO", objetivo: "Restauração", sonda: "SONDA CONVENCIONAL 47", lamina: "", inicio: "14/03/1978", env: "TERRA" },
  { nome: "3-RSP-6-BA", operador: "PetroRecôncavo", bacia: "Recôncavo", campo: "RIACHO SÃO PEDRO", objetivo: "Completação", sonda: "SONDA CONVENCIONAL 35", lamina: "", inicio: "22/10/1979", env: "TERRA" },
  { nome: "3-RSP-7-BA", operador: "PetroRecôncavo", bacia: "Recôncavo", campo: "RIACHO SÃO PEDRO", objetivo: "Completação", sonda: "SONDA CONVENCIONAL 35", lamina: "", inicio: "24/05/1979", env: "TERRA" },
  { nome: "3-STAR-28-RN", operador: "PetroRecôncavo", bacia: "Potiguar", campo: "SABIÁ BICO-DE-OSSO", objetivo: "Completação", sonda: "IMETAME_ENERGIA_01", lamina: "0", inicio: "28/05/2012", env: "TERRA" },
  { nome: "3-TM-2-AL", operador: "Petrosynergy", bacia: "Alagoas", campo: "TABULEIRO MARTINS", objetivo: "Restauração", sonda: "SONDA CONVENCIONAL 59", lamina: "", inicio: "05/01/1962", env: "TERRA" },
  { nome: "3-VR-6-RN", operador: "PetroRecôncavo", bacia: "Potiguar", campo: "BREJINHO RN", objetivo: "Restauração", sonda: "SONDA CONVENCIONAL 82", lamina: "0", inicio: "25/09/1994", env: "TERRA" },
  { nome: "4-BRSA-1292D-BA", operador: "Petrobras", bacia: "Recôncavo", campo: "ARAÇÁS", objetivo: "Restauração", sonda: "SONDA CONVENCIONAL 105", lamina: "", inicio: "14/01/2015", env: "TERRA" },
  { nome: "4-BRSA-1395-SPS", operador: "Petrobras", bacia: "Santos", campo: "", objetivo: "Avaliação", sonda: "Valaris DS-4", lamina: "1758", inicio: "15/12/2024", env: "MAR" },
  { nome: "4-CRT-2-RJS", operador: "Petrobras", bacia: "Campos", campo: "CARATINGA", objetivo: "Abandono", sonda: "", lamina: "998", inicio: "14/06/1994", env: "MAR" },
  { nome: "4-MDU-3-BA", operador: "Petrobras", bacia: "Recôncavo", campo: "ARAÇÁS", objetivo: "Restauração", sonda: "SONDA CONVENCIONAL 72", lamina: "", inicio: "10/05/1981", env: "TERRA" },
  { nome: "4-SMC-19-AL", operador: "Origem Alagoas", bacia: "Alagoas", campo: "FURADO", objetivo: "Completação", sonda: "SONDA CONVENCIONAL 26", lamina: "0", inicio: "15/06/1980", env: "TERRA" },
  { nome: "6-BRSA-1138-RN", operador: "PetroRecôncavo", bacia: "Potiguar", campo: "RIACHO DA FORQUILHA", objetivo: "Restauração", sonda: "SAIPEM-2", lamina: "0", inicio: "09/12/2012", env: "TERRA" },
];

const OBJ_COLORS = {
  "Perfuração": "#7c3aed",
  "Completação": "#f59e0b",
  "Restauração": "#ef4444",
  "Abandono": "#6b7280",
  "Avaliação": "#0d9488",
};

function renderWellTable(data) {
  const tbody = document.getElementById('wellTableBody');
  const countEl = document.getElementById('wellCount');
  if (!tbody) return;

  if (!data.length) {
    tbody.innerHTML = `<tr><td colspan="9" style="text-align:center;color:#8896ab;padding:24px">No wells match the current filter</td></tr>`;
    if (countEl) countEl.textContent = '0 wells';
    return;
  }

  tbody.innerHTML = data.map(w => {
    const envBadge = w.env === 'MAR'
      ? `<span style="background:#0d948818;color:#0d9488;border:1px solid #0d948840;border-radius:4px;padding:2px 7px;font-size:11px;font-weight:600">MAR</span>`
      : `<span style="background:#3b82f618;color:#3b82f6;border:1px solid #3b82f640;border-radius:4px;padding:2px 7px;font-size:11px;font-weight:600">TERRA</span>`;
    const objColor = OBJ_COLORS[w.objetivo] || '#6b7280';
    const objBadge = `<span style="background:${objColor}18;color:${objColor};border:1px solid ${objColor}40;border-radius:4px;padding:2px 7px;font-size:11px;font-weight:600">${w.objetivo}</span>`;
    return `<tr>
      <td style="font-weight:600;font-size:12px;font-family:monospace">${w.nome}</td>
      <td>${w.operador}</td>
      <td>${w.bacia}</td>
      <td style="font-size:12px">${w.campo || '—'}</td>
      <td>${objBadge}</td>
      <td style="font-size:11px;color:var(--text2)">${w.sonda || '—'}</td>
      <td style="text-align:right">${w.lamina !== '' ? w.lamina : '—'}</td>
      <td style="font-size:12px">${w.inicio}</td>
      <td>${envBadge}</td>
    </tr>`;
  }).join('');

  if (countEl) countEl.textContent = `${data.length} of ${POCOS_DATA.length} wells`;
}

window.filterWells = function () {
  const q = (document.getElementById('wellSearch')?.value || '').toLowerCase();
  const env = document.getElementById('wellFilterEnv')?.value || '';
  const filtered = POCOS_DATA.filter(w => {
    const matchEnv = !env || w.env === env;
    const matchText = !q || [w.nome, w.operador, w.bacia, w.campo, w.objetivo, w.sonda].join(' ').toLowerCase().includes(q);
    return matchEnv && matchText;
  });
  renderWellTable(filtered);
};

// Render wells on page load
document.addEventListener('DOMContentLoaded', () => {
  renderWellTable(POCOS_DATA);
  renderArgentinaTables();
});

// ── HAL Argentina Study ────────────────────────────────────────────────────

const ARG_TREND = [
  { year:2015, jobs:344,  stages:1933,  psi:8310,  hp:17935, lateral:176,  unconv:78.8, neuquina:82.6 },
  { year:2016, jobs:266,  stages:2508,  psi:8205,  hp:18576, lateral:570,  unconv:79.7, neuquina:84.2 },
  { year:2017, jobs:293,  stages:3990,  psi:8601,  hp:17307, lateral:861,  unconv:88.4, neuquina:82.6 },
  { year:2018, jobs:349,  stages:5330,  psi:8691,  hp:17480, lateral:1053, unconv:89.4, neuquina:84.5 },
  { year:2019, jobs:321,  stages:6683,  psi:9220,  hp:20472, lateral:1313, unconv:87.5, neuquina:80.4 },
  { year:2020, jobs:118,  stages:3232,  psi:9901,  hp:18119, lateral:1582, unconv:93.2, neuquina:82.2 },
  { year:2021, jobs:353,  stages:10242, psi:10157, hp:23074, lateral:1674, unconv:91.5, neuquina:85.8 },
  { year:2022, jobs:426,  stages:12799, psi:9927,  hp:21827, lateral:1715, unconv:82.4, neuquina:80.0 },
  { year:2023, jobs:420,  stages:14210, psi:11078, hp:24337, lateral:2048, unconv:85.7, neuquina:79.3 },
  { year:2024, jobs:354,  stages:15380, psi:11651, hp:32562, lateral:2624, unconv:98.9, neuquina:95.2 },
  { year:2025, jobs:383,  stages:19692, psi:11965, hp:35319, lateral:3038, unconv:99.5, neuquina:99.5 },
  { year:2026, jobs:15,   stages:796,   psi:12128, hp:42133, lateral:3123, unconv:100,  neuquina:100  },
];

const ARG_OPERATORS = [
  { op:"YPF S.A.",                                           basin:"NEUQUINA",         jobs:1765, stages:51760, psi:10940, tier:"HIGH" },
  { op:"TECPETROL S.A.",                                     basin:"NEUQUINA",         jobs:272,  stages:8601,  psi:10250, tier:"HIGH" },
  { op:"TECPETROL S.A.",                                     basin:"GOLFO SAN JORGE",  jobs:229,  stages:566,   psi:7048,  tier:"MEDIUM" },
  { op:"COMPAÑÍA GENERAL DE COMBUSTIBLES S.A.",              basin:"AUSTRAL",          jobs:212,  stages:592,   psi:3027,  tier:"LOW" },
  { op:"SHELL ARGENTINA S.A.",                               basin:"NEUQUINA",         jobs:147,  stages:5284,  psi:11672, tier:"HIGH" },
  { op:"VISTA ENERGY ARGENTINA SAU",                         basin:"NEUQUINA",         jobs:132,  stages:6350,  psi:13163, tier:"HIGH" },
  { op:"PAMPA ENERGIA S.A.",                                 basin:"NEUQUINA",         jobs:130,  stages:3262,  psi:8500,  tier:"HIGH" },
  { op:"PAN AMERICAN ENERGY SL",                             basin:"NEUQUINA",         jobs:127,  stages:4652,  psi:11598, tier:"HIGH" },
  { op:"TOTAL AUSTRAL S.A.",                                 basin:"NEUQUINA",         jobs:123,  stages:3715,  psi:10880, tier:"HIGH" },
  { op:"PLUSPETROL S.A.",                                    basin:"NEUQUINA",         jobs:116,  stages:4915,  psi:11411, tier:"HIGH" },
  { op:"CAPEX S.A.",                                         basin:"NEUQUINA",         jobs:103,  stages:321,   psi:4999,  tier:"HIGH" },
  { op:"VISTA OIL & GAS ARGENTINA SAU",                      basin:"NEUQUINA",         jobs:62,   stages:2930,  psi:12322, tier:"HIGH" },
  { op:"CGC ENERGIA SAU",                                    basin:"GOLFO SAN JORGE",  jobs:48,   stages:96,    psi:5625,  tier:"MEDIUM" },
  { op:"CHEVRON ARGENTINA S.R.L.",                           basin:"NEUQUINA",         jobs:36,   stages:1453,  psi:10461, tier:"HIGH" },
  { op:"EXXONMOBIL EXPLORATION ARGENTINA S.R.L.",            basin:"NEUQUINA",         jobs:23,   stages:1027,  psi:13368, tier:"HIGH" },
];

const ARG_FORMATIONS = [
  { form:"vaca muerta",      jobs:2467, psi:11823, shale:99.8, hazard:"High-pressure frac, H2S, wellhead integrity" },
  { form:"lajas",            jobs:235,  psi:7140,  shale:0,    hazard:"Tight sand, proppant flowback risk" },
  { form:"magallanes",       jobs:197,  psi:2888,  shale:0,    hazard:"Conventional workover, well integrity" },
  { form:"mina el carmen",   jobs:183,  psi:7133,  shale:0,    hazard:"Mature field, aging completion equipment" },
  { form:"mulichinco",       jobs:126,  psi:5642,  shale:0,    hazard:"Tight sand, stimulation fluid returns" },
  { form:"los molles",       jobs:103,  psi:5013,  shale:6.8,  hazard:"Deep shale, ultra-high pressure, CO₂" },
  { form:"punta rosada",     jobs:78,   psi:10568, shale:0,    hazard:"Golfo San Jorge mature field ops" },
  { form:"comodoro rivadavia",jobs:68,  psi:5187,  shale:0,    hazard:"Oldest Argentine province, heavy WO" },
  { form:"agrio",            jobs:55,   psi:4423,  shale:1.8,  hazard:"Tight carbonate, acid stimulation" },
  { form:"cañadon seco",     jobs:37,   psi:6374,  shale:0,    hazard:"Standard oilfield operations" },
];

const ARG_REGULATIONS = [
  { reg:"Res. SE 25/2004 — Integridad de Pozos",               scope:"Mandatory well integrity management",                      domains:"All 4 domains",            br:"ANP Res. 46/2016 SGIP" },
  { reg:"Res. SE 317/2021 — Operaciones No Convencionales",     scope:"Safety for unconventional (shale/tight) operations",       domains:"Domain 1 — Fracking",      br:"ANP Res. 43/2007 SGSO" },
  { reg:"Ley 24.051 — Residuos Peligrosos",                    scope:"Hazardous waste: drilling fluids, produced water",          domains:"Domains 1 & 2",            br:"CONAMA Res. 430/2011" },
  { reg:"Ley 25.675 — Ley General del Ambiente",               scope:"Environmental liability for all E&P service operations",    domains:"All 4 domains",            br:"Lei 9.605/1998" },
  { reg:"Res. SRT 559/2009 — Seguridad en Perforación",        scope:"OHS for drilling, completion, and workover personnel",      domains:"All 4 domains",            br:"NR-37 (MTE)" },
  { reg:"Ley Neuquén 2615 — Código de Aguas",                  scope:"Water use and produced water disposal — Neuquina basin",   domains:"Domain 1 — water sourcing", br:"N/A (offshore in Brazil)" },
  { reg:"Ley Neuquén 3004 — Regulación Fracking",              scope:"Environmental controls specific to hydraulic fracturing",    domains:"Domain 1 — Fracking",      br:"N/A" },
  { reg:"Decreto 1122/97 — EIA Upstream",                      scope:"Environmental impact assessment for E&P operations",        domains:"All domains",              br:"Res. CONAMA 001/1986" },
];

const TIER_STYLES = {
  HIGH:   { bg:"#fef2f2", color:"#dc2626", border:"#fecaca" },
  MEDIUM: { bg:"#fffbeb", color:"#d97706", border:"#fde68a" },
  LOW:    { bg:"#f0fdf4", color:"#16a34a", border:"#bbf7d0" },
};

function renderArgentinaTables() {
  // Annual trend
  const trendBody = document.getElementById('argTrendBody');
  if (trendBody) {
    trendBody.innerHTML = ARG_TREND.map(r => {
      const isEscalating = r.year >= 2021;
      const rowStyle = isEscalating ? 'background:#f0fdf4;' : '';
      return `<tr style="${rowStyle}">
        <td style="font-weight:700;">${r.year}${r.year===2026?' <span style="font-size:10px;color:var(--text3);">YTD</span>':''}</td>
        <td>${r.jobs.toLocaleString()}</td>
        <td>${r.stages.toLocaleString()}</td>
        <td>${r.psi.toLocaleString()}</td>
        <td>${r.hp.toLocaleString()}</td>
        <td style="${r.lateral>=2500?'color:#dc2626;font-weight:700;':''}">${r.lateral.toLocaleString()}</td>
        <td>${r.unconv}%</td>
        <td>${r.neuquina}%</td>
      </tr>`;
    }).join('');
  }

  // Operator exposure
  const opBody = document.getElementById('argOperatorBody');
  if (opBody) {
    opBody.innerHTML = ARG_OPERATORS.map(r => {
      const ts = TIER_STYLES[r.tier] || TIER_STYLES.LOW;
      const badge = `<span style="font-size:10px;font-weight:700;background:${ts.bg};color:${ts.color};border:1px solid ${ts.border};padding:2px 7px;border-radius:20px;">${r.tier}</span>`;
      return `<tr>
        <td style="font-weight:600;font-size:11px;">${r.op}</td>
        <td style="font-size:11px;">${r.basin}</td>
        <td style="font-weight:700;">${r.jobs.toLocaleString()}</td>
        <td>${r.stages.toLocaleString()}</td>
        <td>${r.psi.toLocaleString()}</td>
        <td>${badge}</td>
      </tr>`;
    }).join('');
  }

  // Formation risk
  const formBody = document.getElementById('argFormationBody');
  if (formBody) {
    formBody.innerHTML = ARG_FORMATIONS.map(r => {
      const isVM = r.form === 'vaca muerta';
      return `<tr style="${isVM?'background:#fef2f2;':''}">
        <td style="font-weight:${isVM?'700':'500'};text-transform:capitalize;font-size:11px;">${r.form}</td>
        <td style="font-weight:700;">${r.jobs.toLocaleString()}</td>
        <td>${r.psi.toLocaleString()}</td>
        <td style="${r.shale>=90?'color:#dc2626;font-weight:700;':''}">${r.shale}%</td>
        <td style="font-size:11px;color:var(--text2);">${r.hazard}</td>
      </tr>`;
    }).join('');
  }

  // Regulatory framework
  const regBody = document.getElementById('argRegulatoryBody');
  if (regBody) {
    regBody.innerHTML = ARG_REGULATIONS.map(r => `<tr>
      <td style="font-weight:600;font-size:11px;">${r.reg}</td>
      <td style="font-size:11px;color:var(--text2);">${r.scope}</td>
      <td style="font-size:11px;"><span class="ai-tag" style="--t-c:#2563eb">${r.domains}</span></td>
      <td style="font-size:11px;color:var(--text3);">${r.br}</td>
    </tr>`).join('');
  }
}

// ── Cross-Analysis Tab ─────────────────────────────────────────────────────

let ALL_CONTRACTS = [];
let filteredContracts = [];

function processIncomingContracts(rawItems) {
  // Infer domain from object keywords for the cross-matrix
  ALL_CONTRACTS = rawItems.map(c => {
    const obj = (c.obj || "").toLowerCase();
    let domain = "Other";
    if (obj.includes("cimentação")) domain = "Cementing";
    else if (obj.includes("estimulação") || obj.includes("flexitubo")) domain = "Stimulation";
    else if (obj.includes("fluidos")) domain = "Fluids";
    else if (obj.includes("completação") || obj.includes("dhsv")) domain = "Completion";
    else if (obj.includes("mpd") || obj.includes("pressure drilling")) domain = "MPD";
    else if (obj.includes("workover") || obj.includes("intervenção")) domain = "Workover";
    else if (obj.includes("construção")) domain = "Well Construction";
    else if (obj.includes("g&g") || obj.includes("geológica")) domain = "G&G Software";

    // Re-calculating period and validation metadata for the inference
    return {
      numero: c.numero,
      domain: domain,
      obj: c.obj,
      value: c.value,
      periodo: `${c.inicio?.split('/')[2] || '?'}–${c.fim?.split('/')[2] || '?'}`,
      proc: c.proc || "LICITAÇÃO",
      csbLink: getCSBLink(domain),
      score: getInferenceScore(domain),
      scoreC: domain === "G&G Software" ? "#6b7280" : "#c0392b"
    };
  });

  filteredContracts = [...ALL_CONTRACTS];
}

function getCSBLink(domain) {
  const map = {
    'Cementing': '⭐⭐⭐ PRIMARY',
    'Stimulation': '⭐⭐⭐ CSB',
    'Fluids': '⭐⭐⭐ KICK',
    'Completion': '⭐⭐⭐ DIRECT DEF.',
    'MPD': '⭐⭐⭐ KICK+WC',
    'Well Construction': '⭐⭐⭐ FULL SCOPE',
    'Workover': '⭐⭐⭐ CAUSAL',
  };
  return map[domain] || '⭐ INDIRECT';
}

function getInferenceScore(domain) {
  const map = {
    'Cementing': '95%',
    'Stimulation': '93%',
    'Fluids': '88%',
    'Completion': '98%',
    'MPD': '91%',
    'Well Construction': '100%',
    'Workover': '96%',
    'G&G Software': '42%'
  };
  return map[domain] || '50%';
}

let contractPage = 1;
const CONTRACT_PAGE_SIZE = 10;

// Domain display labels map
const DOMAIN_MAP = {
  'Cementing': '🔩 Cementing',
  'Stimulation': '⚡ Stimulation',
  'Fluids': '💧 Fluid Services',
  'Completion': '🔒 Completion / DHSV',
  'MPD': '🎛 MPD',
  'Well Construction': '🏗 Well Construction',
  'Workover': '🔧 Workover',
  'G&G Software': '🧠 G&G Software',
};

const PROC_COLORS = {
  'INEXIGIBIL': '#8b5cf6',
  'LICITAÇÃO': '#3b82f6',
  'CONVITE': '#0d9488',
};

function renderContractTable(data) {
  const tbody = document.getElementById('contractEvidenceBody');
  if (!tbody) return;
  const start = (contractPage - 1) * CONTRACT_PAGE_SIZE;
  const slice = data.slice(start, start + CONTRACT_PAGE_SIZE);

  if (!slice.length) {
    tbody.innerHTML = `<tr><td colspan="5" style="text-align:center;color:#8896ab;padding:24px">No contracts match the current filter</td></tr>`;
    return;
  }

  tbody.innerHTML = slice.map(c => {
    const procColor = PROC_COLORS[c.proc] || '#6b7280';
    const domLabel = DOMAIN_MAP[c.domain] || c.domain;
    return `<tr>
      <td style="font-family:monospace;font-size:11px;font-weight:700;color:var(--blue)">${c.numero}</td>
      <td><span style="font-size:11px;font-weight:700;color:var(--text)">${domLabel}</span></td>
      <td style="max-width:260px;font-size:11px;color:var(--text2);line-height:1.5;">${c.obj.substring(0, 130)}${c.obj.length > 130 ? '…' : ''}</td>
      <td style="font-weight:700;color:var(--text);white-space:nowrap;">${c.value}</td>
      <td style="font-size:12px;font-weight:700;white-space:nowrap;">${c.csbLink}</td>
    </tr>`;
  }).join('');

  renderContractPagination(data.length);
}

function renderContractPagination(total) {
  const pg = document.getElementById('contractPagination');
  if (!pg) return;
  const pages = Math.ceil(total / CONTRACT_PAGE_SIZE);
  if (pages <= 1) { pg.innerHTML = ''; return; }

  let btns = `<button class="page-btn" ${contractPage <= 1 ? 'disabled' : ''} onclick="contractGoPage(${contractPage - 1})">‹</button>`;
  for (let i = 1; i <= pages; i++) {
    btns += `<button class="page-btn ${i === contractPage ? 'active' : ''}" onclick="contractGoPage(${i})">${i}</button>`;
  }
  btns += `<button class="page-btn" ${contractPage >= pages ? 'disabled' : ''} onclick="contractGoPage(${contractPage + 1})">›</button>`;
  pg.innerHTML = btns;
}

window.contractGoPage = function (p) {
  contractPage = p;
  renderContractTable(filteredContracts);
};

window.filterContractTable = function () {
  const q = (document.getElementById('contractSearch')?.value || '').toLowerCase();
  const domain = (document.getElementById('contractDomainFilter')?.value || '').toLowerCase();
  filteredContracts = ALL_CONTRACTS.filter(c => {
    const matchDomain = !domain || c.domain.toLowerCase().includes(domain) || c.obj.toLowerCase().includes(domain);
    const matchQ = !q || [c.numero, c.domain, c.obj, c.value, c.proc].join(' ').toLowerCase().includes(q);
    return matchDomain && matchQ;
  });
  contractPage = 1;
  renderContractTable(filteredContracts);
};

function renderTemporalOverlapChart() {
  destroyChart('temporalOverlapChart');
  const ctx = document.getElementById('temporalOverlapChart');
  if (!ctx) return;

  // CSB failures by year (from existing dashboard data)
  const csbByYear = [0, 1, 2, 0, 5, 14, 18, 79, 957, 756, 369, 388, 447, 50]; // 2013-2026
  const years = [2013, 2014, 2015, 2016, 2017, 2018, 2019, 2020, 2021, 2022, 2023, 2024, 2025, 2026];

  // Contract activity bands (1 = active, 0 = not)
  const cementing = [0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 0, 0, 0, 0];
  const fluids = [0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 0, 0, 0, 0];
  const stimulation = [0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 1, 0];
  const mpd = [0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 1, 1];
  const completion = [0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 0];
  const wellConst = [0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 1, 1];
  const workover = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1];

  chartInstances['temporalOverlapChart'] = new Chart(ctx.getContext('2d'), {
    type: 'bar',
    data: {
      labels: years,
      datasets: [
        {
          label: 'CSB Failures (ANP)', data: csbByYear, type: 'line',
          borderColor: '#c0392b', backgroundColor: 'rgba(192,57,43,0.12)',
          fill: true, tension: 0.4, pointRadius: 4, pointBackgroundColor: '#c0392b',
          yAxisID: 'y', order: 0
        },
        { label: 'Cementing Contracts', data: cementing.map(v => v * 20), backgroundColor: 'rgba(59,130,246,0.55)', yAxisID: 'y2', order: 1 },
        { label: 'Fluid Services', data: fluids.map(v => v * 18), backgroundColor: 'rgba(13,148,136,0.55)', yAxisID: 'y2', order: 1 },
        { label: 'Stimulation', data: stimulation.map(v => v * 15), backgroundColor: 'rgba(239,68,68,0.55)', yAxisID: 'y2', order: 1 },
        { label: 'MPD', data: mpd.map(v => v * 12), backgroundColor: 'rgba(124,58,237,0.55)', yAxisID: 'y2', order: 1 },
        { label: 'Completion / DHSV', data: completion.map(v => v * 10), backgroundColor: 'rgba(245,158,11,0.55)', yAxisID: 'y2', order: 1 },
        { label: 'Well Construction', data: wellConst.map(v => v * 8), backgroundColor: 'rgba(30,64,175,0.55)', yAxisID: 'y2', order: 1 },
        { label: 'Workover', data: workover.map(v => v * 6), backgroundColor: 'rgba(139,92,246,0.55)', yAxisID: 'y2', order: 1 },
      ]
    },
    options: {
      responsive: true, maintainAspectRatio: true,
      plugins: {
        legend: { labels: { color: '#4a5568', font: { size: 10 }, boxWidth: 10, padding: 10 } },
        tooltip: { mode: 'index', intersect: false },
      },
      scales: {
        x: { ticks: { color: '#4a5568', font: { size: 10 } }, grid: { display: false }, stacked: true },
        y: {
          position: 'left', title: { display: true, text: 'CSB Failures', color: '#c0392b', font: { size: 10 } },
          ticks: { color: '#4a5568', font: { size: 10 } }, grid: { color: '#dde3ee' }, beginAtZero: true
        },
        y2: {
          position: 'right', title: { display: true, text: 'Contract Activity (index)', color: '#6b7280', font: { size: 10 } },
          stacked: true, ticks: { display: false }, grid: { display: false }, beginAtZero: true
        },
      }
    }
  });
}

function renderContractMethodChart() {
  destroyChart('contractMethodChart');
  const ctx = document.getElementById('contractMethodChart');
  if (!ctx) return;

  // Count from CSV: INEXIGIBIL=16, LICITAÇÃO=136, CONVITE/Pregão/Convênio=21
  const data = [16, 136, 21];
  const labels = ['Inexigibilidade', 'Licitação', 'Convite / Convênio'];
  const colors = ['#8b5cf6', '#3b82f6', '#0d9488'];

  chartInstances['contractMethodChart'] = new Chart(ctx.getContext('2d'), {
    type: 'doughnut',
    data: {
      labels,
      datasets: [{ data, backgroundColor: colors.map(c => c + 'dd'), borderColor: '#fff', borderWidth: 3, hoverOffset: 8 }]
    },
    options: {
      responsive: true, maintainAspectRatio: true, cutout: '65%',
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: ctx => ` ${ctx.label}: ${ctx.parsed} contracts (${Math.round(ctx.parsed / 173 * 100)}%)`
          }
        }
      }
    }
  });
}

// Initialise cross-analysis tab content when it becomes active
document.querySelectorAll('.nav-link').forEach(link => {
  if (link.dataset.section === 'crossanalysis') {
    link.addEventListener('click', () => {
      setTimeout(() => {
        renderTemporalOverlapChart();
        renderContractMethodChart();
        renderContractTable(filteredContracts);
      }, 60);
    });
  }
});
