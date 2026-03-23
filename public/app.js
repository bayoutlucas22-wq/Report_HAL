/* ── app.js — HAL/Tejas ANP Incident Dashboard ── */
'use strict';

// ── Official source URLs ─────────────────────────────────────────────────────
const LINKS = {
  ANP_DATASET:   "https://dados.gov.br/dados/conjuntos-dados/dados-de-incidentes-de-exploracao-e-producao-de-petroleo-e-gas-natural",
  ANP_SGIP:      "https://www.gov.br/anp/pt-br/assuntos/exploracao-e-producao-de-oleo-e-gas/seguranca-operacional/sistema-de-gerenciamento-da-integridade-de-pocos-sgip",
  ANP_SGSO:      "https://www.gov.br/anp/pt-br/assuntos/exploracao-e-producao-de-oleo-e-gas/seguranca-operacional/sistema-de-gerenciamento-da-seguranca-operacional-sgso",
  ANP_SUBSEA:    "https://www.gov.br/anp/pt-br/assuntos/exploracao-e-producao-de-oleo-e-gas/seguranca-operacional/sistemas-submarinos",
  ANP_PORTAL:    "https://www.gov.br/anp/pt-br/assuntos/exploracao-e-producao-de-oleo-e-gas/seguranca-operacional",
  BV_NR445:      "https://marine-offshore.bureauveritas.com/nr445-rules-classification-offshore-units",
  BV_NR459:      "https://marine-offshore.bureauveritas.com/nr459-process-systems-onboard-offshore-units-and-installations",
  BV_RULES:      "https://marine-offshore.bureauveritas.com/rules-guidelines",
  NR37:          "https://www.gov.br/trabalho-e-emprego/pt-br/acesso-a-informacao/participacao-social/conselhos-e-orgaos-colegiados/comissao-tripartite-partitaria-permanente/arquivos/normas-regulamentadoras/nr-37-atualizada-2022.pdf",
  NR33:          "https://www.gov.br/trabalho-e-emprego/pt-br/acesso-a-informacao/participacao-social/conselhos-e-orgaos-colegiados/comissao-tripartite-partitaria-permanente/arquivos/normas-regulamentadoras/nr-33-atualizada-2022.pdf",
  NR35:          "https://www.gov.br/trabalho-e-emprego/pt-br/acesso-a-informacao/participacao-social/conselhos-e-orgaos-colegiados/comissao-tripartite-partitaria-permanente/arquivos/normas-regulamentadoras/nr-35-atualizada-2022.pdf",
  NORMAM:        "https://www.marinha.mil.br/dpc/normam",
  ISO9001:       "https://www.iso.org/standard/62085.html",
  ISO17025:      "https://www.iso.org/standard/66912.html",
  BSEE:          "https://www.bsee.gov/stats-facts/offshore-incident-statistics",
  HSE_UK:        "https://www.hse.gov.uk/offshore/hydrocarbon-releases.htm",
  LEI_12527:     "https://www.planalto.gov.br/ccivil_03/_ato2011-2014/2011/lei/l12527.htm",
};

// Regulation links per category — maps failure type → primary regulation
const CAT_REGS = {
  "CSB Failure":            { label: "ANP Res. 46/2016 (SGIP)", url: LINKS.ANP_SGIP },
  "Kick (Primary Barrier)": { label: "ANP Res. 46/2016 (SGIP)", url: LINKS.ANP_SGIP },
  "Structural Failure":     { label: "BV NR 445",               url: LINKS.BV_NR445 },
  "Loss of Well Control":   { label: "ANP Res. 46/2016 (SGIP)", url: LINKS.ANP_SGIP },
};

// Severity → BV classification link
const SEV_REGS = {
  "SSO":      { label: "BV NR 445 — safety system",       url: LINKS.BV_NR445 },
  "Minor":    { label: "BV NR 445 — LEVE classification",  url: LINKS.BV_NR445 },
  "Moderate": { label: "BV NR 459 — MODERADO event",       url: LINKS.BV_NR459 },
  "Severe":   { label: "BV NR 459 — GRAVE event",          url: LINKS.BV_NR459 },
};

// ── Colour palette ────────────────────────────────────────────────────────────
const CAT_COLORS = {
  "CSB Failure":             "#c0392b",
  "Kick (Primary Barrier)":  "#e67e22",
  "Structural Failure":      "#1a56a0",
  "Loss of Well Control":    "#7c3aed",
  "Outros":                  "#8896ab",
};
const SEV_COLORS = {
  "SSO":      "#8896ab",
  "Minor":    "#16a34a",
  "Moderate": "#e67e22",
  "Severe":   "#c0392b",
};
const CAT_CSS = {
  "CSB Failure":            "bc-csb",
  "Kick (Primary Barrier)": "bc-kick",
  "Structural Failure":     "bc-struct",
  "Loss of Well Control":   "bc-wc",
};
const SEV_CSS = {
  "SSO":      "bs-sso",
  "Minor":    "bs-minor",
  "Moderate": "bs-moderate",
  "Severe":   "bs-severe",
};
const MONTH_NAMES = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

// ── Utility: external link ────────────────────────────────────────────────────
const extLink = (href, label, cls = "") =>
  `<a href="${href}" target="_blank" rel="noopener" class="ext-link ${cls}" title="Open source: ${label}">${label}↗</a>`;

// ── State ─────────────────────────────────────────────────────────────────────
let chartInstances = {};
let halStats    = null;
let tableState  = { page: 1, total: 0, pages: 0, items: [] };
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
  if (year)     params.set("year", year);
  if (category) params.set("category", category);
  if (severity) params.set("severity", severity);
  return (await fetch("/api/hal-incidents?" + params)).json();
}

// ── Copy to clipboard ─────────────────────────────────────────────────────────
window.copyToClipboard = function(text, btn) {
  navigator.clipboard.writeText(text).then(() => {
    const orig = btn.textContent;
    btn.textContent = "✓";
    btn.classList.add("copied");
    setTimeout(() => { btn.textContent = orig; btn.classList.remove("copied"); }, 1400);
  });
};

// ── KPI Cards (with linked badges) ───────────────────────────────────────────
function renderKPIs(stats) {
  const total  = stats.total;
  const csb    = stats.categoryBreakdown["CSB Failure"] || 0;
  const kick   = stats.categoryBreakdown["Kick (Primary Barrier)"] || 0;
  const sev    = (stats.severityBreakdown["Severe"] || 0) + (stats.severityBreakdown["Moderate"] || 0);

  const cards = [
    {
      label: "Total HAL/Tejas Incidents", value: total.toLocaleString(),
      sub: "ANP SISO-Incidentes · 2013–2026",
      accent: "#1a56a0",
      badge: "Open Data · Lei 12.527/2011",
      badgeUrl: LINKS.LEI_12527,
      srcUrl:   LINKS.ANP_DATASET,
      srcLabel: "dados.gov.br/anp",
    },
    {
      label: "CSB Barrier Element Failures", value: csb.toLocaleString(),
      sub: "Conjunto Solidário de Barreira",
      accent: "#c0392b",
      badge: "+39,000% since 2016",
      badgeUrl: LINKS.ANP_SGIP,
      srcUrl:   LINKS.ANP_SGIP,
      srcLabel: "ANP Res. 46/2016 (SGIP)",
    },
    {
      label: "Primary Barrier Loss (Kicks)", value: kick.toLocaleString(),
      sub: "Influxo de formação — perfuração/intervenção",
      accent: "#e67e22",
      badge: "ANP Res. 46/2016",
      badgeUrl: LINKS.ANP_SGIP,
      srcUrl:   LINKS.ANP_PORTAL,
      srcLabel: "ANP Segurança Operacional",
    },
    {
      label: "Moderate + Severe Events", value: sev.toLocaleString(),
      sub: "BV-classified high-impact incidents",
      accent: "#7c3aed",
      badge: "BV NR 445 scope",
      badgeUrl: LINKS.BV_NR445,
      srcUrl:   LINKS.BV_NR445,
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
    "CSB Failure":            LINKS.ANP_SGIP,
    "Kick (Primary Barrier)": LINKS.ANP_SGIP,
    "Structural Failure":     LINKS.BV_NR445,
    "Loss of Well Control":   LINKS.ANP_SGIP,
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
  const cats = Object.keys(stats.categoryBreakdown).filter(c => c !== "Outros");
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
      plugins: { legend: { display: false }, tooltip: { callbacks: {
        label: ctx => ` ${ctx.label}: ${ctx.parsed} (${Math.round(ctx.parsed/total*100)}%)`
      }}}
    }
  });

  const labDiv = document.getElementById("donutLabels");
  labDiv.innerHTML = cats.map((c, i) => `
    <a href="${CAT_REGS[c]?.url || LINKS.ANP_PORTAL}" target="_blank" rel="noopener" class="dl-row dl-row-link" title="Regulation: ${CAT_REGS[c]?.label}">
      <span class="dl-name"><span class="dl-dot" style="background:${CAT_COLORS[c]}"></span>${c.replace(" (Primary Barrier)", " (Kick)")}</span>
      <span class="dl-pct">${Math.round(vals[i]/total*100)}%</span>
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
      datasets: [{ label: "Incidents", data: vals,
        borderColor: "#c0392b", backgroundColor: "rgba(192,57,43,0.12)",
        pointBackgroundColor: "#c0392b", pointRadius: 3 }]
    },
    options: {
      responsive: true, maintainAspectRatio: true,
      plugins: { legend: { display: false } },
      scales: { r: {
        angleLines: { color: "#dde3ee" }, grid: { color: "#dde3ee" },
        pointLabels: { color: "#4a5568", font: { size: 10 } },
        ticks: { display: false }
      }}
    }
  });
}

// ── Multi-line Chart ──────────────────────────────────────────────────────────
function renderMultiLine(stats) {
  destroyChart("multiLineChart");
  const ctx = document.getElementById("multiLineChart").getContext("2d");
  const series = stats.yearSeries;
  const years  = series.map(y => y.year);
  const cats   = ["CSB Failure", "Kick (Primary Barrier)", "Structural Failure", "Loss of Well Control"];

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
  const vals  = order.map(s => stats.severityBreakdown[s] || 0);

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
  document.getElementById("cnt-csb").textContent    = (bd["CSB Failure"] || 0).toLocaleString();
  document.getElementById("cnt-kick").textContent   = (bd["Kick (Primary Barrier)"] || 0).toLocaleString();
  document.getElementById("cnt-struct").textContent = (bd["Structural Failure"] || 0).toLocaleString();
  document.getElementById("cnt-wc").textContent     = (bd["Loss of Well Control"] || 0).toLocaleString();

  // Inject linked regulation refs into each breakdown card
  const regMap = {
    "card-csb":    [{ l: "ANP Res. 46/2016 (SGIP)", u: LINKS.ANP_SGIP }, { l: "BV NR 459", u: LINKS.BV_NR459 }],
    "card-kick":   [{ l: "ANP Res. 46/2016 (SGIP)", u: LINKS.ANP_SGIP }, { l: "BV NR 445", u: LINKS.BV_NR445 }],
    "card-struct": [{ l: "BV NR 445",               u: LINKS.BV_NR445 }, { l: "NR-37 (MTE)", u: LINKS.NR37 }],
    "card-wc":     [{ l: "ANP Res. 46/2016 (SGIP)", u: LINKS.ANP_SGIP }, { l: "NORMAM-01/DPC", u: LINKS.NORMAM }],
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
    "SSO":      LINKS.BV_NR445,
    "Minor":    LINKS.BV_NR445,
    "Moderate": LINKS.BV_NR459,
    "Severe":   LINKS.BV_NR459,
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
    const reg   = CAT_REGS[r.category];
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
  const end   = Math.min(pages, page + 2);
  if (start > 1) btns += `<button class="page-btn" onclick="goPage(1)">1</button>${start > 2 ? '<span class="pg-ellipsis">…</span>' : ""}`;
  for (let i = start; i <= end; i++) {
    btns += `<button class="page-btn ${i === page ? "active" : ""}" onclick="goPage(${i})">${i}</button>`;
  }
  if (end < pages) btns += `${end < pages - 1 ? '<span class="pg-ellipsis">…</span>' : ""}<button class="page-btn" onclick="goPage(${pages})">${pages}</button>`;
  btns += `<button class="page-btn" ${page >= pages ? "disabled" : ""} onclick="goPage(${page + 1})">›</button>`;
  pg.innerHTML = btns;
}

window.goPage = async function(p) {
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
function switchSection(section) {
  document.querySelectorAll(".dash-section").forEach(s => s.classList.remove("active"));
  document.querySelectorAll(".nav-link").forEach(l => l.classList.remove("active"));
  document.getElementById(`section-${section}`).classList.add("active");
  document.getElementById(`nav-${section}`).classList.add("active");
}

// ── Filters ───────────────────────────────────────────────────────────────────
async function applyFilters() {
  activeFilters.year     = document.getElementById("filterYear").value;
  activeFilters.category = document.getElementById("filterCategory").value;
  activeFilters.severity = document.getElementById("filterSeverity").value;
  const data = await fetchHalIncidents(1);
  renderTable(data);
  renderMatrix(data.items);
  switchSection("registry");
}

function clearFilters() {
  document.getElementById("filterYear").value     = "";
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
    document.querySelectorAll(".nav-link").forEach(link => {
      link.addEventListener("click", e => { e.preventDefault(); switchSection(link.dataset.section); });
    });
    document.getElementById("btnApply").addEventListener("click", applyFilters);
    document.getElementById("btnClear").addEventListener("click", clearFilters);

    const [stats, tableData] = await Promise.all([fetchHalStats(), fetchHalIncidents(1)]);
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
    renderMatrix(tableData.items);
    renderTable(tableData);

  } catch (err) {
    console.error("Init error:", err);
  } finally {
    document.getElementById("loadingOverlay").style.display = "none";
  }
}

init();

// ── Action Items Progress ──────────────────────────────────────────────────────
window.updateAIProgress = function() {
  const all   = document.querySelectorAll('.ai-check');
  const done  = document.querySelectorAll('.ai-check:checked');
  const total = all.length;
  const count = done.length;
  const pct   = total ? Math.round(count / total * 100) : 0;

  const barEl   = document.getElementById('aiProgressBar');
  const doneEl  = document.getElementById('aiDoneCount');
  const totalEl = document.getElementById('aiTotalCount');
  const pctEl   = document.getElementById('aiPct');

  if (barEl)   barEl.style.width   = pct + '%';
  if (doneEl)  doneEl.textContent  = count;
  if (totalEl) totalEl.textContent = total;
  if (pctEl)   pctEl.textContent   = pct + '%';

  // Per-pillar counters
  [1, 2, 3, 4].forEach(p => {
    const items    = document.querySelectorAll(`.ai-item[data-pillar="${p}"] .ai-check`);
    const checked  = document.querySelectorAll(`.ai-item[data-pillar="${p}"] .ai-check:checked`);
    const el       = document.getElementById(`pp${p}`);
    if (el) el.textContent = `${checked.length} / ${items.length}`;
  });
};

// Initialize counters on page load
document.addEventListener('DOMContentLoaded', () => updateAIProgress());

