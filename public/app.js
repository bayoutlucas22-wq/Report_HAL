/* ── app.js — Contractor ANP Incident Dashboard ── */
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
  "BOP Failure": { label: "ANP Res. 46/2016 (SGIP)", url: LINKS.ANP_SGIP },
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
  "BOP Failure": "#b45309",
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
  "BOP Failure": "bc-bop",
};
const SEV_CSS = {
  "SSO": "bs-sso",
  "Minor": "bs-minor",
  "Moderate": "bs-moderate",
  "Severe": "bs-severe",
};
const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

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
  'Other': '📂 Other Services'
};

const PROC_COLORS = {
  'INEXIGIBIL': '#8b5cf6',
  'LICITAÇÃO': '#3b82f6',
  'CONVITE': '#0d9488',
};

// ── Utility: external link ────────────────────────────────────────────────────
const extLink = (href, label, cls = "") =>
  `<a href="${href}" target="_blank" rel="noopener" class="ext-link ${cls}" title="Open source: ${label}">${label}↗</a>`;

// ── State ─────────────────────────────────────────────────────────────────────
let chartInstances = {};
let halStats = null;
let tableState = { page: 1, total: 0, pages: 0, items: [] };
let activeFilters = { year: "", category: "", severity: "" };
let mexicoStore = []; // Dynamic Mexico metrics
let argStore = [];    // Dynamic Argentina metrics
let fMexStore = [];    // Filtered Mexico wells/jobs
let mexRegPage = 1;
let mexRegLimit = 20;


// ── Destroy chart helper ──────────────────────────────────────────────────────
function destroyChart(id) {
  if (chartInstances[id]) { chartInstances[id].destroy(); delete chartInstances[id]; }
}

window.setRegistryFilter = function (field, val) {
  activeFilters[field] = val;
  goPage(1);
};

// ── Fetch functions ───────────────────────────────────────────────────────────
async function fetchHalStats() {
  return (await fetch("/api/stats")).json();
}





async function fetchHalIncidents(page = 1) {
  try {
    const { year, category, severity } = activeFilters;
    const q = document.getElementById("searchInput")?.value || "";
    const params = new URLSearchParams({ page, limit: 50 });
    if (year) params.set("year", year);
    if (category) params.set("category", category);
    if (severity) params.set("severity", severity);
    if (q) params.set("q", q);
    const res = await fetch("/api/hal-incidents?" + params);
    if (!res.ok) throw new Error("API error");
    return await res.json();
  } catch (e) {
    console.error("fetchHalIncidents error:", e);
    return { total: 0, items: [], pages: 0, page: 1 };
  }
}

async function fetchHalContracts() {
  try {
    const res = await fetch("/api/hal-contracts");
    if (!res.ok) return { items: [] };
    return res.json();
  } catch (e) { console.error("Contract fetch error:", e); return { items: [] }; }
}

async function fetchMexicoMetrics() {
  try {
    const res = await fetch("/api/mexico-metrics");
    if (!res.ok) throw new Error("API error");
    return await res.json();
  } catch (e) {
    console.error("fetchMexicoMetrics error:", e);
    return { details: [], summary: {} };
  }
}

// ── Copy to clipboard ─────────────────────────────────────────────────────────
window.toggleDesc = function(rowId) {
  const row = document.getElementById(rowId);
  if (row) row.style.display = row.style.display === 'none' ? '' : 'none';
};

window.copyToClipboard = function (text, btn) {
  navigator.clipboard.writeText(text).then(() => {
    const orig = btn.textContent;
    btn.textContent = "✓";
    btn.classList.add("copied");
    setTimeout(() => { btn.textContent = orig; btn.classList.remove("copied"); }, 1400);
  });
};

window.updateNorAIProgress = function() {
  const checks = document.querySelectorAll('.nor-check');
  const checked = Array.from(checks).filter(c => c.checked).length;
  const total = checks.length;
  const pct = total > 0 ? Math.round((checked / total) * 100) : 0;
  
  const bar = document.getElementById('nor-ai-progress-bar');
  if (bar) bar.style.width = pct + '%';
  const txt = document.getElementById('nor-ai-pct');
  if (txt) txt.textContent = pct + '% AUDIT PROGRESS';

  // Pillar 1: High Fidelity Ingestion (Indices 0, 1, 2)
  const p1 = Array.from(checks).slice(0, 3).filter(c => c.checked).length;
  const p1_txt = document.getElementById('nor-pp1');
  if (p1_txt) p1_txt.textContent = `${p1} / 3`;

  // Pillar 2: Barrier Verification (Indices 3, 4, 5)
  const p2 = Array.from(checks).slice(3, 6).filter(c => c.checked).length;
  const p2_txt = document.getElementById('nor-pp2');
  if (p2_txt) p2_txt.textContent = `${p2} / 3`;

  // Pillar 3: Lovdata Traceability (Indices 6, 7)
  const p3 = Array.from(checks).slice(6, 8).filter(c => c.checked).length;
  const p3_txt = document.getElementById('nor-pp3');
  if (p3_txt) p3_txt.textContent = `${p3} / 2`;

  // Pillar 4: Interactive Cortex Intelligence (Indices 8, 9, 10)
  const p4 = Array.from(checks).slice(8, 11).filter(c => c.checked).length;
  const p4_txt = document.getElementById('nor-pp4');
  if (p4_txt) p4_txt.textContent = `${p4} / 3`;
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
  if (!grid) return;
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

// ── Overview Chart (08) ───────────────────────────────────────────────────────
function renderWellIntegrityTable(stats) {
  const tbody = document.getElementById('wellIntegrityTableBody');
  if (!tbody || !stats.yearSeries) return;

  let html = '';
  stats.yearSeries.forEach(y => {
    // "Well Integrity Failures" = CSB + Kick + Structural + Loss of Well Control
    const wiTotal = (y['CSB Failure'] || 0) + (y['Kick (Primary Barrier)'] || 0) + (y['Structural Failure'] || 0) + (y['Loss of Well Control'] || 0);
    const total = y.count || 1;
    const share = ((wiTotal / total) * 100).toFixed(1);
    
    html += `
      <tr>
        <td style="font-weight:700;color:var(--text3);font-size:12px;">${y.year}</td>
        <td>${wiTotal.toLocaleString()}</td>
        <td>${total.toLocaleString()}</td>
        <td>
          <div class="cs-bar-cell">
            <div class="cs-bar" style="width:${share}%"></div>${share}%
          </div>
        </td>
      </tr>
    `;
  });
  tbody.innerHTML = html;
}

function renderOverviewChart(stats) {
  destroyChart("overviewChart");
  const canvas = document.getElementById("overviewChart");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");

  const cats = ["CSB Failure", "Kick (Primary Barrier)", "Structural Failure", "Loss of Well Control", "BOP Failure"];
  const years = stats.yearSeries.map(y => y.year);

  // Gradient generator for premium look
  const getGradient = (color) => {
    const g = ctx.createLinearGradient(0, 0, 0, 400);
    g.addColorStop(0, color + "ee");
    g.addColorStop(1, color + "44");
    return g;
  };

  chartInstances["overviewChart"] = new Chart(ctx, {
    type: "bar",
    data: {
      labels: years,
      datasets: cats.map(cat => ({
        label: cat,
        data: stats.yearSeries.map(y => y[cat] || 0),
        backgroundColor: getGradient(CAT_COLORS[cat]),
        borderColor: CAT_COLORS[cat],
        borderWidth: 1.5,
        borderRadius: { topLeft: 4, topRight: 4 },
        barPercentage: 0.85,
        categoryPercentage: 0.85
      }))
    },
    options: {
      responsive: true, maintainAspectRatio: true,
      interaction: { mode: "index", intersect: false },
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: 'rgba(15, 23, 42, 0.95)',
          titleFont: { size: 13, weight: 'bold' },
          bodyFont: { size: 12 },
          padding: 12,
          cornerRadius: 8,
          boxPadding: 6
        }
      },
      scales: {
        x: {
          stacked: true,
          ticks: { color: "#64748b", font: { size: 10, weight: '600' } },
          grid: { display: false }
        },
        y: {
          stacked: true,
          ticks: { color: "#64748b", font: { size: 10 } },
          grid: { color: "rgba(226, 232, 240, 0.6)", drawBorder: false },
          beginAtZero: true
        }
      }
    }
  });

  // Legend with regulation links
  const catLinks = {
    "CSB Failure": LINKS.ANP_SGIP,
    "Kick (Primary Barrier)": LINKS.ANP_SGIP,
    "Structural Failure": LINKS.BV_NR445,
    "Loss of Well Control": LINKS.ANP_SGIP,
    "BOP Failure": "https://atosoficiais.com.br/anp",
  };
  const leg = document.getElementById("overviewLegend");
  if (leg) {
    leg.innerHTML = cats.map(c => `
      <a href="${catLinks[c]}" target="_blank" rel="noopener" class="lchip lchip-link" title="Regulation: ${CAT_REGS[c]?.label}">
        <div class="lchip-dot" style="background:${CAT_COLORS[c]}"></div>
        ${c.replace(" (Primary Barrier)", "").replace(" Failure", "")}
      </a>
    `).join("");
  }
}

// ── Donut Chart (09) ───────────────────────────────────────────────────────────
function renderDonut(stats) {
  destroyChart("donutChart");
  const cats = Object.keys(stats.categoryBreakdown).filter(c => c !== "Other");
  const vals = cats.map(c => stats.categoryBreakdown[c]);
  const total = vals.reduce((a, b) => a + b, 0);

  const canvas = document.getElementById("donutChart");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");

  chartInstances["donutChart"] = new Chart(ctx, {
    type: "doughnut",
    data: {
      labels: cats,
      datasets: [{
        data: vals,
        backgroundColor: cats.map(c => CAT_COLORS[c] + "ee"),
        borderColor: "#ffffff",
        borderWidth: 4,
        hoverOffset: 12,
        hoverBorderColor: "#ffffff",
        hoverBorderWidth: 5
      }]
    },
    options: {
      responsive: true, maintainAspectRatio: true, cutout: "74%",
      animation: { animateRotate: true, animateScale: true, duration: 1500, easing: 'easeOutQuart' },
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: 'rgba(15, 23, 42, 0.95)',
          padding: 12,
          cornerRadius: 8,
          callbacks: {
            label: ctx => ` ${ctx.label}: ${ctx.parsed} (${Math.round(ctx.parsed / total * 100)}%)`
          }
        }
      }
    }
  });

  const labDiv = document.getElementById("donutLabels");
  if (labDiv) {
    labDiv.innerHTML = cats.map((c, i) => `
      <a href="${CAT_REGS[c]?.url || LINKS.ANP_PORTAL}" target="_blank" rel="noopener" class="dl-row dl-row-link" title="Regulation: ${CAT_REGS[c]?.label}">
        <span class="dl-name">
          <span class="dl-dot" style="background:${CAT_COLORS[c]}; box-shadow: 0 0 8px ${CAT_COLORS[c]}66"></span>
          ${c.replace(" (Primary Barrier)", " (Kick)")}
        </span>
        <span class="dl-pct">${Math.round(vals[i] / total * 100)}%</span>
      </a>
    `).join("");
  }
}

// ── CSB Trend Chart ───────────────────────────────────────────────────────────
function renderCsbTrend(stats) {
  destroyChart("csbTrendChart");
  const _csbEl = document.getElementById("csbTrendChart");
  if (!_csbEl) return;
  const ctx = _csbEl.getContext("2d");
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
  const _mcEl = document.getElementById("monthChart");
  if (!_mcEl) return;
  const ctx = _mcEl.getContext("2d");
  const pattern = stats.monthPattern || {};
  const vals = Array.from({ length: 12 }, (_, i) => pattern[i + 1] || 0);

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
  const _mlEl = document.getElementById("multiLineChart");
  if (!_mlEl) return;
  const ctx = _mlEl.getContext("2d");
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
        borderColor: CAT_COLORS[cat], 
        backgroundColor: CAT_COLORS[cat] + "18",
        fill: true, 
        tension: 0.4, 
        pointRadius: 3, 
        borderWidth: 2
      }))
    },
    options: {
      responsive: true, 
      maintainAspectRatio: false,
      interaction: {
        mode: 'index',
        intersect: false,
      },
      plugins: { 
        legend: { display: false },
        tooltip: {
          backgroundColor: 'rgba(15, 23, 42, 0.9)',
          padding: 12,
          titleFont: { size: 12, weight: 700 },
          bodyFont: { size: 12 },
          cornerRadius: 6,
          boxPadding: 4
        }
      },
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
  const _svEl = document.getElementById("severityChart");
  if (!_svEl) return;
  const ctx = _svEl.getContext("2d");
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

// ── Overview High-Criticality Contracts ───────────────────────────────────────
function renderOverviewContracts(contracts) {
  console.log("RENDERING: Overview Contracts", contracts?.length);
  const tbody = document.getElementById("overviewContractsBody");
  const countEl = document.getElementById("overviewContractCount");
  if (!tbody) { console.warn("Missing overviewContractsBody"); return; }

  if (countEl) countEl.textContent = `${contracts?.length || 0} records`;

  if (!contracts.length) {
    tbody.innerHTML = `<tr><td colspan="5" style="text-align:center;padding:24px;color:var(--text3)">No matching evidence records found</td></tr>`;
    return;
  }

  // Display only top 15 in overview to keep layout tight, or use the filtered set
  const displaySet = contracts.slice(0, 15);

  tbody.innerHTML = displaySet.map(c => {
    const objText = c.obj || "";
    const domText = c.domain || "";
    const period = c.periodo || (c.inicio ? `${c.inicio.split('/')[2] || '?'}–${(c.fim || '').split('/')[2] || '?'}` : '—');
    const usdVal = contractToUSD(c);
    return `
    <tr>
      <td style="font-family:monospace;font-weight:700;color:var(--blue)">${c.numero || "Unknown"}</td>
      <td style="font-weight:700; font-size:11px;">${DOMAIN_MAP[domText] || domText}</td>
      <td style="max-width:300px; font-size:11px; color:var(--text2); line-height:1.4;">
        ${objText.substring(0, 120)}${objText.length > 120 ? '...' : ''}
      </td>
      <td style="white-space:nowrap; font-size:11px; color:var(--text3);">${period}</td>
      <td style="white-space:nowrap; font-weight:700; color:var(--text)">${usdVal ? fmtUSD(usdVal) : '—'}</td>
      <td style="font-size:12px; font-weight:700; color:var(--accent); white-space:nowrap;">${c.csbLink || '—'}</td>
    </tr>
  `}).join("");
}

let _overviewSortKey = 'date';
let _overviewSortDir = -1; // -1 = desc, 1 = asc

window.sortOverviewContracts = function(key) {
  if (_overviewSortKey === key) { _overviewSortDir *= -1; }
  else { _overviewSortKey = key; _overviewSortDir = -1; }
  document.getElementById('sort-overview-date').textContent = _overviewSortKey === 'date' ? (_overviewSortDir === -1 ? '↓' : '↑') : '↕';
  document.getElementById('sort-overview-value').textContent = _overviewSortKey === 'value' ? (_overviewSortDir === -1 ? '↓' : '↑') : '↕';
  window.filterOverviewContracts();
};

window.filterOverviewContracts = function () {
  const q = (document.getElementById('overviewContractSearch')?.value || '').toLowerCase();
  const domain = (document.getElementById('overviewContractDomain')?.value || '').toLowerCase();

  const filtered = ALL_CONTRACTS.filter(c => {
    const domText = (c.domain || "").toLowerCase();
    const matchDomain = !domain || domText.includes(domain);
    const matchQ = !q || [(c.numero || ""), domText, (c.obj || "")].join(' ').toLowerCase().includes(q);
    return matchDomain && matchQ;
  });

  const dir = _overviewSortDir;
  if (_overviewSortKey === 'date') {
    filtered.sort((a, b) => dir * ((a.inicioSort || 0) - (b.inicioSort || 0)));
  } else if (_overviewSortKey === 'value') {
    filtered.sort((a, b) => dir * (contractToUSD(a) - contractToUSD(b)));
  }

  renderOverviewContracts(filtered);
};

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
  if (!data || typeof data.total === 'undefined') {
    console.error("Invalid data passed to renderTable:", data);
    return;
  }
  tableState = data;
  const countEl = document.getElementById("tableCount");
  if (countEl) {
    countEl.innerHTML = `${(data.total || 0).toLocaleString()} incidents`;
  }

  const tbody = document.getElementById("tableBody");
  if (!data.items.length) {
    tbody.innerHTML = `<tr><td colspan="9" style="text-align:center;color:#8896ab;padding:24px">No incidents match current filters</td></tr>`;
    renderPagination();
    return;
  }

  const escAttr = s => (s || "").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
  tbody.innerHTML = data.items.map((r, i) => {
    const rowId = `inc-desc-${i}`;
    const hasDesc = r.descricao && r.descricao.trim();
    const injCount = parseInt(r.feridos) || 0;
    const fatCount = parseInt(r.fatalidades) || 0;
    const situacao = r.situacao || "—";
    const sitColor = situacao === "Closed" || situacao === "Approved" ? "#16a34a" : situacao === "Awaiting Action" ? "#c0392b" : "#8896ab";
    return `
    <tr style="cursor:${hasDesc ? 'pointer' : 'default'}" onclick="${hasDesc ? `toggleDesc('${rowId}')` : ''}">
      <td class="num-cell" style="white-space:nowrap;">
        <div style="display:flex;align-items:center;gap:6px;">
          <span style="display:inline-flex;align-items:center;gap:4px;background:#eff6ff;border:1px solid #bfdbfe;border-radius:6px;padding:3px 8px;font-family:monospace;font-size:11px;font-weight:800;color:#1d4ed8;letter-spacing:0.02em;">
            <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="flex-shrink:0;"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
            ${r.numero || "—"}
          </span>
          <button class="copy-btn" onclick="event.stopPropagation();copyToClipboard('${escAttr(r.numero)}', this)" title="Copy reference">⎘</button>
        </div>
      </td>
      <td style="font-size:11px;color:var(--text2);white-space:nowrap;">${r.data || "—"}</td>
      <td style="font-size:11px;font-weight:600;color:var(--text);max-width:160px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;" title="${escAttr(r.empresa)}">${r.empresa || "—"}</td>
      <td style="font-size:11px;color:var(--text2);max-width:140px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;" title="${escAttr(r.instalacao)}">${r.instalacao || "—"}</td>
      <td>
        <span class="badge-cat ${CAT_CSS[r.category] || "bc-other"}" style="font-size:10px;font-weight:600;">
          ${(r.category || "Other").replace(" (Primary Barrier)", "")}
        </span>
      </td>
      <td>
        <span class="badge-sev ${SEV_CSS[r.severity] || ""}" style="font-size:10px;font-weight:600;">
          ${r.severity || "SSO"}
        </span>
      </td>
      <td style="text-align:center;font-size:12px;font-weight:700;color:${injCount > 0 ? '#c0392b' : '#8896ab'};">${injCount > 0 ? injCount : '—'}</td>
      <td style="text-align:center;font-size:12px;font-weight:700;color:${fatCount > 0 ? '#7f1d1d' : '#8896ab'};">${fatCount > 0 ? fatCount : '—'}</td>
      <td style="font-size:11px;font-weight:700;color:${sitColor};">${situacao}</td>
    </tr>
    ${hasDesc ? `<tr id="${rowId}" style="display:none;background:#f8fafc;">
      <td colspan="9" style="padding:12px 20px;font-size:12px;color:var(--text2);line-height:1.6;border-top:none;">
        <strong style="color:var(--text);display:block;margin-bottom:4px;">ANP Description:</strong>
        ${escAttr(r.descricao)}
      </td>
    </tr>` : ''}`;
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

  // Toggle global lock-mode for restricted sections
  const globalOverlay = document.getElementById('globalLockOverlay');
  if (section === 'fullreport' || section === 'latam-summary') {
    document.body.classList.add('lock-mode');
    if (globalOverlay) {
      globalOverlay.style.setProperty('display', 'flex', 'important');
    }
  } else {
    document.body.classList.remove('lock-mode');
    if (globalOverlay) {
      globalOverlay.style.display = 'none';
    }
  }

  if (section === 'first-report') {
    setTimeout(() => {
      window._frChartsInit = false;
      const initScript = document.querySelector('#section-first-report script');
      if (initScript) {
        // Re-run chart init by evaluating inline logic
        const canvases = ['fr-csb-chart','fr-cat-chart','fr-mex-chart','fr-nor-chart'];
        canvases.forEach(id => {
          const canvas = document.getElementById(id);
          if (canvas) {
            const existing = Chart.getChart(canvas);
            if (existing) existing.destroy();
          }
        });
      }
      // Trigger re-init
      if (typeof window._initFrCharts === 'function') window._initFrCharts();
    }, 60);
  }

  if (section === 'brazil-registry') {
    setTimeout(renderPenaltyCharts, 200);
  }

  if (section === 'norway-registry') {
    loadNorwayRegistry(1);
  }

  if (section === 'norway' || section === 'norway-audit') {
    setTimeout(() => {
      try { if (typeof renderNorwayRNNPChart === 'function') renderNorwayRNNPChart(); } catch(e) { console.warn('renderNorwayRNNPChart error:', e); }
    }, 200);
    setTimeout(() => {
      try { if (typeof renderNorwayTables === 'function') renderNorwayTables(); } catch(e) { console.warn('renderNorwayTables error:', e); }
    }, 250);
  }

  if (section === 'norway-crossanalysis') {
    setTimeout(() => {
      if (typeof renderNorwayCrossTable === 'function') renderNorwayCrossTable();
      if (typeof renderNorwayTemporalOverlapChart === 'function') renderNorwayTemporalOverlapChart();
      if (typeof renderNorwayContractDomainChart === 'function') renderNorwayContractDomainChart();
      fNorCxContracts = norwayContracts.slice();
      renderNorCrossContracts();
    }, 200);
  }

  if (section === 'crossanalysis') {
    setTimeout(() => {
      if (filteredContracts && filteredContracts.length) {
        renderContractTable(filteredContracts);
        if (typeof renderTemporalOverlapChart === 'function') renderTemporalOverlapChart();
        if (typeof renderContractMethodChart === 'function') renderContractMethodChart();
      }
    }, 100);
  }

  if (section === 'mexico' || section === 'mexico-crossanalysis') {
    setTimeout(() => { window.filtermexicoContracts && window.filtermexicoContracts(); }, 100);
  }

  if (section === 'argentina' || section === 'argentina-crossanalysis') {
    setTimeout(() => { window.filterargentinaContracts && window.filterargentinaContracts(); }, 100);
  }

  // Reset scroll position to top on section switch
  const pageContent = document.querySelector('.page-content');
  if (pageContent) pageContent.scrollTop = 0;

  closeMobileSidebar();
}

// ── Sidebar Toggles ──────────────────────────────────────────────────────────
function initSidebarToggle() {
  const toggleBtn = document.getElementById('sidebarToggleBtn');
  const overlay = document.getElementById('sidebarOverlay');
  const appLayout = document.querySelector('.app-layout');

  if (toggleBtn && appLayout) {
    toggleBtn.addEventListener('click', () => {
      const isMobile = window.innerWidth <= 768;

      if (isMobile) {
        appLayout.classList.toggle('mobile-sidebar-open');
      } else {
        appLayout.classList.toggle('sidebar-collapsed');
      }
    });

    if (overlay) {
      overlay.addEventListener('click', () => {
        appLayout.classList.remove('mobile-sidebar-open');
      });
    }
  }
}

function closeMobileSidebar() {
  const appLayout = document.querySelector('.app-layout');
  if (appLayout) {
    appLayout.classList.remove('mobile-sidebar-open');
  }
}


// ── Search ────────────────────────────────────────────────────────────────────
// Search is handled by oninput="goPage(1)" in dashboard.html calling fetchHalIncidents(1) with 'q' param.

// ── Init ──────────────────────────────────────────────────────────────────────
async function init() {
  try {
    initSidebarToggle();
    const testLockBtn = document.getElementById('testLockBtn');
    if (testLockBtn) {
      testLockBtn.onclick = () => {
        const overlay = document.getElementById('globalLockOverlay');
        const isLocked = document.body.classList.contains('lock-mode');
        if (isLocked) {
          document.body.classList.remove('lock-mode');
          if (overlay) overlay.style.display = 'none';
          testLockBtn.innerHTML = `
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0110 0v4" />
            </svg> Test Lock UI`;
        } else {
          document.body.classList.add('lock-mode');
          if (overlay) {
            overlay.style.setProperty('display', 'flex', 'important');
          }
          testLockBtn.innerHTML = `
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16">
              <rect x="3" y="11" width="18" height="11" rx="12" ry="12" />
              <path d="M7 11V7a5 15 0 0110 0v4" />
            </svg> UNLOCK FOR TEST`;
        }
      };
    }
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


    const authLockBtn = document.getElementById('authLockBtn');
    if (authLockBtn) {
      authLockBtn.onclick = () => {
        alert("🔒 CIS Authentication Check: Developer bypass active for testing purposes.");
        const overlay = document.getElementById('globalLockOverlay');
        isUnlocked = true;
        document.body.classList.remove('lock-mode');
        document.querySelectorAll('.locked-item').forEach(el => el.classList.add('unlocked'));
        if (overlay) overlay.style.display = 'none';
      };
    }
    console.log("INIT: Fetching all data...");
    const [stats, tableData, contractData, mexData, mexC, argC, norC] = await Promise.all([
      fetchHalStats().catch(e => { console.error("Stats fail", e); return null; }),
      fetchHalIncidents(1).catch(e => { console.error("Incidents fail", e); return { total: 0, items: [] }; }),
      fetchHalContracts().catch(e => { console.error("Contracts fail", e); return { total: 0, items: [] }; }),

      fetchMexicoMetrics().catch(e => { console.error("Mexico fail", e); return { details: [], summary: {} }; }),
      fetch("/api/mexico-contracts").then(r=>r.json()).catch(()=>({items:[]})),
      fetch("/api/argentina-contracts").then(r=>r.json()).catch(()=>({items:[]})),
      fetch("/api/norway-contracts").then(r=>r.json()).catch(()=>({items:[]}))
    ]);


    console.log("INIT: Data fetched", { stats: !!stats, table: !!tableData, contracts: !!contractData, mex: !!mexData });


    if (mexC && mexC.items) { mexicoContracts = processRegionalContracts(mexC.items); window.filtermexicoContracts(); }
    if (argC && argC.items) { argentinaContracts = processRegionalContracts(argC.items); window.filterargentinaContracts(); }
    if (norC && norC.items) { norwayContracts = processRegionalContracts(norC.items); window.filternorwayContracts(); }
    
    // Load Mexico Compact Well Data
    loadMexicoCompactData().catch(e => console.warn("Mexico Wells fail", e));


    if (stats) {
      // STRIP 2026 FROM ALL FRONTEND STATS
      if (stats.yearSeries) {
        stats.yearSeries = stats.yearSeries.filter(r => String(r.year) !== '2026');
      }

      halStats = stats;
      renderBadge(stats.total);
      renderKPIs(stats);
      renderWellIntegrityTable(stats);
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
      renderOverviewContracts(ALL_CONTRACTS);
      // Immediately render if on cross-analysis tab
      if (window.location.hash === '#crossanalysis') {
        renderContractTable(filteredContracts);
        renderTemporalOverlapChart();
        renderContractMethodChart();
      }
      if (window.location.hash === '#norway-audit') {
        setTimeout(() => { 
          if (typeof renderNorwayRNNPChart === 'function') renderNorwayRNNPChart(); 
          if (typeof renderNorwayTables === 'function') renderNorwayTables(); 
        }, 300);
      }
      if (window.location.hash === '#norway-crossanalysis') {
        setTimeout(() => {
          if (typeof renderNorwayCrossTable === 'function') renderNorwayCrossTable();
          if (typeof renderNorwayTemporalOverlapChart === 'function') renderNorwayTemporalOverlapChart();
          if (typeof renderNorwayContractDomainChart === 'function') renderNorwayContractDomainChart();
          fNorCxContracts = norwayContracts.slice();
          renderNorCrossContracts();
        }, 300);
      }
    }

    if (mexData && mexData.details && mexData.details.length) {
      mexicoStore = mexData.details;
      fMexStore = [...mexicoStore]; // Initial set
      renderMexicoTables();
      renderMexDynamicStats(mexData.summary);
      goMexPage(1);
    }

  } catch (err) {
    console.error("Init error:", err);
  } finally {
    const loader = document.getElementById("loadingOverlay");
    if (loader) loader.style.display = "none";
  }
}

document.addEventListener("DOMContentLoaded", () => {
  // Failsafe: force-hide loading overlay after 5s regardless of init state
  setTimeout(() => {
    const loader = document.getElementById("loadingOverlay");
    if (loader) loader.style.display = "none";
  }, 5000);
  init();
});

// ── Action Items Progress ──────────────────────────────────────────────────────
window.togglePillar = function (header) {
  header.parentElement.classList.toggle('collapsed');
};

window.updateAIProgress = function () {
  const wrap = document.getElementById('section-overview');
  if (!wrap) return;
  const all = wrap.querySelectorAll('.ai-check');
  const done = wrap.querySelectorAll('.ai-check:checked');
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

  [1, 2, 3, 4].forEach(p => {
    const items = wrap.querySelectorAll(`.ai-item[data-pillar="${p}"] .ai-check`);
    const checked = wrap.querySelectorAll(`.ai-item[data-pillar="${p}"] .ai-check:checked`);
    const el = document.getElementById(`pp${p}`);
    if (el) el.textContent = `${checked.length} / ${items.length}`;
  });
};

window.updateArgAIProgress = function () {
  const wrap = document.getElementById('section-argentina-audit');
  if (!wrap) return;
  const all = wrap.querySelectorAll('.ai-check');
  const done = wrap.querySelectorAll('.ai-check:checked');
  const total = all.length;
  const count = done.length;
  const pct = total ? Math.round(count / total * 100) : 0;

  const barEl = document.getElementById('argAiProgressBar');
  const doneEl = document.getElementById('argAiDoneCount');
  const totalEl = document.getElementById('argAiTotalCount');
  const pctEl = document.getElementById('argAiPct');

  if (barEl) barEl.style.width = pct + '%';
  if (doneEl) doneEl.textContent = count;
  if (totalEl) totalEl.textContent = total;
  if (pctEl) pctEl.textContent = pct + '%';

  [1, 2, 3, 4].forEach(p => {
    const items = wrap.querySelectorAll(`.ai-item[data-pillar="arg${p}"] .ai-check`);
    const checked = wrap.querySelectorAll(`.ai-item[data-pillar="arg${p}"] .ai-check:checked`);
    const el = document.getElementById(`arg-pp${p}`);
    if (el) el.textContent = `${checked.length} / ${items.length}`;
  });
};

window.updateMexAIProgress = function () {
  const wrap = document.getElementById('section-mexico-audit');
  if (!wrap) return;
  const all = wrap.querySelectorAll('.ai-check');
  const done = wrap.querySelectorAll('.ai-check:checked');
  const total = all.length;
  const count = done.length;
  const pct = total ? Math.round(count / total * 100) : 0;

  const barEl = document.getElementById('mexAiProgressBar');
  const doneEl = document.getElementById('mexAiDoneCount');
  const totalEl = document.getElementById('mexAiTotalCount');
  const pctEl = document.getElementById('mexAiPct');

  if (barEl) barEl.style.width = pct + '%';
  if (doneEl) doneEl.textContent = count;
  if (totalEl) totalEl.textContent = total;
  if (pctEl) pctEl.textContent = pct + '%';

  [1, 2, 3, 4].forEach(p => {
    const items = wrap.querySelectorAll(`.ai-item[data-pillar="mex${p}"] .ai-check`);
    const checked = wrap.querySelectorAll(`.ai-item[data-pillar="mex${p}"] .ai-check:checked`);
    const el = document.getElementById(`mex-pp${p}`);
    if (el) el.textContent = `${checked.length} / ${items.length}`;
  });
};

window.toggleMexPillar = function (header) {
  header.parentElement.classList.toggle('collapsed');
};

document.addEventListener('DOMContentLoaded', () => {
  updateAIProgress();
  updateArgAIProgress();
  updateMexAIProgress();
});

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
  renderMexicoTables();
  loadNorwayRealData();
});

// ── Contractor Argentina Study ────────────────────────────────────────────────────

const ARG_TREND = [
  { year: 2015, jobs: 344, stages: 1933, psi: 8310, hp: 17935, lateral: 176, unconv: 78.8, neuquina: 82.6 },
  { year: 2016, jobs: 266, stages: 2508, psi: 8205, hp: 18576, lateral: 570, unconv: 79.7, neuquina: 84.2 },
  { year: 2017, jobs: 293, stages: 3990, psi: 8601, hp: 17307, lateral: 861, unconv: 88.4, neuquina: 82.6 },
  { year: 2018, jobs: 349, stages: 5330, psi: 8691, hp: 17480, lateral: 1053, unconv: 89.4, neuquina: 84.5 },
  { year: 2019, jobs: 321, stages: 6683, psi: 9220, hp: 20472, lateral: 1313, unconv: 87.5, neuquina: 80.4 },
  { year: 2020, jobs: 118, stages: 3232, psi: 9901, hp: 18119, lateral: 1582, unconv: 93.2, neuquina: 82.2 },
  { year: 2021, jobs: 353, stages: 10242, psi: 10157, hp: 23074, lateral: 1674, unconv: 91.5, neuquina: 85.8 },
  { year: 2022, jobs: 426, stages: 12799, psi: 9927, hp: 21827, lateral: 1715, unconv: 82.4, neuquina: 80.0 },
  { year: 2023, jobs: 420, stages: 14210, psi: 11078, hp: 24337, lateral: 2048, unconv: 85.7, neuquina: 79.3 },
  { year: 2024, jobs: 354, stages: 17688, psi: 11651, hp: 32562, lateral: 2624, unconv: 98.9, neuquina: 95.2 },
  { year: 2025, jobs: 383, stages: 23784, psi: 11965, hp: 35319, lateral: 3038, unconv: 99.5, neuquina: 99.5 },
  { year: 2026, jobs: 15, stages: 1050, psi: 12128, hp: 42133, lateral: 3123, unconv: 100, neuquina: 100 },
];

const ARG_OPERATORS = [
  { op: "YPF S.A.", basin: "NEUQUINA", jobs: 1765, stages: 51760, psi: 10940, tier: "HIGH" },
  { op: "TECPETROL S.A.", basin: "NEUQUINA", jobs: 272, stages: 8601, psi: 10250, tier: "HIGH" },
  { op: "TECPETROL S.A.", basin: "GOLFO SAN JORGE", jobs: 229, stages: 566, psi: 7048, tier: "MEDIUM" },
  { op: "COMPAÑÍA GENERAL DE COMBUSTIBLES S.A.", basin: "AUSTRAL", jobs: 212, stages: 592, psi: 3027, tier: "LOW" },
  { op: "SHELL ARGENTINA S.A.", basin: "NEUQUINA", jobs: 147, stages: 5284, psi: 11672, tier: "HIGH" },
  { op: "VISTA ENERGY ARGENTINA SAU", basin: "NEUQUINA", jobs: 132, stages: 6350, psi: 13163, tier: "HIGH" },
  { op: "PAMPA ENERGIA S.A.", basin: "NEUQUINA", jobs: 130, stages: 3262, psi: 8500, tier: "HIGH" },
  { op: "PAN AMERICAN ENERGY SL", basin: "NEUQUINA", jobs: 127, stages: 4652, psi: 11598, tier: "HIGH" },
  { op: "TOTAL AUSTRAL S.A.", basin: "NEUQUINA", jobs: 123, stages: 3715, psi: 10880, tier: "HIGH" },
  { op: "PLUSPETROL S.A.", basin: "NEUQUINA", jobs: 116, stages: 4915, psi: 11411, tier: "HIGH" },
  { op: "CAPEX S.A.", basin: "NEUQUINA", jobs: 103, stages: 321, psi: 4999, tier: "HIGH" },
  { op: "VISTA OIL & GAS ARGENTINA SAU", basin: "NEUQUINA", jobs: 62, stages: 2930, psi: 12322, tier: "HIGH" },
  { op: "CGC ENERGIA SAU", basin: "GOLFO SAN JORGE", jobs: 48, stages: 96, psi: 5625, tier: "MEDIUM" },
  { op: "CHEVRON ARGENTINA S.R.L.", basin: "NEUQUINA", jobs: 36, stages: 1453, psi: 10461, tier: "HIGH" },
  { op: "EXXONMOBIL EXPLORATION ARGENTINA S.R.L.", basin: "NEUQUINA", jobs: 23, stages: 1027, psi: 13368, tier: "HIGH" },
];

const ARG_FORMATIONS = [
  { form: "vaca muerta", jobs: 2467, psi: 11823, shale: 99.8, hazard: "High-pressure frac, H2S, wellhead integrity" },
  { form: "lajas", jobs: 235, psi: 7140, shale: 0, hazard: "Tight sand, proppant flowback risk" },
  { form: "magallanes", jobs: 197, psi: 2888, shale: 0, hazard: "Conventional workover, well integrity" },
  { form: "mina el carmen", jobs: 183, psi: 7133, shale: 0, hazard: "Mature field, aging completion equipment" },
  { form: "mulichinco", jobs: 126, psi: 5642, shale: 0, hazard: "Tight sand, stimulation fluid returns" },
  { form: "los molles", jobs: 103, psi: 5013, shale: 6.8, hazard: "Deep shale, ultra-high pressure, CO₂" },
  { form: "punta rosada", jobs: 78, psi: 10568, shale: 0, hazard: "Golfo San Jorge mature field ops" },
  { form: "comodoro rivadavia", jobs: 68, psi: 5187, shale: 0, hazard: "Oldest Argentine province, heavy WO" },
  { form: "agrio", jobs: 55, psi: 4423, shale: 1.8, hazard: "Tight carbonate, acid stimulation" },
  { form: "cañadon seco", jobs: 37, psi: 6374, shale: 0, hazard: "Standard oilfield operations" },
];

const ARG_REGULATIONS = [
  { reg: "Res. SE 25/2004 — Integridad de Pozos", scope: "Environmental study standards for exploration permits and exploitation concessions; primary upstream EIA framework", domains: "All 4 domains", br: "ANP Res. 46/2016 SGIP", link: "https://servicios.infoleg.gob.ar/infolegInternet/verNorma.do?id=91789" },
  { reg: "Decreto 929/2013 — Régimen No Convencional", scope: "Investment promotion and regulatory framework for unconventional hydrocarbon exploitation (shale/tight formations)", domains: "Domain 1 — Fracking", br: "ANP Res. 43/2007 SGSO", link: "https://servicios.infoleg.gob.ar/infolegInternet/verNorma.do?id=217314" },
  { reg: "Ley 24.051 — Residuos Peligrosos", scope: "Hazardous waste management: drilling fluids, produced water, chemical additives — generator registration required", domains: "Domains 1 & 2", br: "CONAMA Res. 430/2011", link: "https://servicios.infoleg.gob.ar/infolegInternet/verNorma.do?id=450" },
  { reg: "Ley 25.675 — Ley General del Ambiente", scope: "Environmental liability for all E&P service operations; minimum standards for sustainable management", domains: "All 4 domains", br: "Lei 9.605/1998", link: "https://servicios.infoleg.gob.ar/infolegInternet/verNorma.do?id=79980" },
  { reg: "Res. SRT 559/2009 — Seguridad en Perforación", scope: "OHS for drilling, completion, and workover personnel; high-accident-rate enterprise rehabilitation program", domains: "All 4 domains", br: "NR-37 (MTE)", link: "https://www.argentina.gob.ar/srt" },
  { reg: "Ley Neuquén 899 — Código de Aguas", scope: "Water use rights and produced water disposal in Neuquina basin; governs Contractor frac fluid sourcing and disposal", domains: "Domain 1 — water sourcing", br: "N/A (offshore in Brazil)", link: "https://www.argentina.gob.ar/sites/default/files/agua-neuquen.pdf" },
  { reg: "Decreto Neuquén 1483/2012 — No Convencional", scope: "Neuquén provincial norms and procedures for unconventional reservoir exploration and exploitation (Vaca Muerta)", domains: "Domain 1 — Fracking", br: "N/A", link: "https://boficial.neuquen.gov.ar/" },
  { reg: "Ley 17.319/1967 — Ley de Hidrocarburos", scope: "Foundational hydrocarbon law: state ownership of deposits, licensing, service company obligations for all E&P", domains: "All domains", br: "Lei 9.478/1997 (Petróleo)", link: "https://servicios.infoleg.gob.ar/infolegInternet/verNorma.do?id=16078" },
];

const TIER_STYLES = {
  HIGH: { bg: "#fef2f2", color: "#dc2626", border: "#fecaca" },
  MEDIUM: { bg: "#fffbeb", color: "#d97706", border: "#fde68a" },
  LOW: { bg: "#f0fdf4", color: "#16a34a", border: "#bbf7d0" },
};

function renderArgentinaTables() {
  // Annual trend
  const trendBody = document.getElementById('argTrendBody');
  if (trendBody) {
    trendBody.innerHTML = ARG_TREND.map(r => {
      const isEscalating = r.year >= 2021;
      const rowStyle = isEscalating ? 'background:#f0fdf4;' : '';
      return `<tr style="${rowStyle}">
        <td style="font-weight:700;">${r.year}${r.year === 2026 ? ' <span style="font-size:10px;color:var(--text3);">YTD</span>' : ''}</td>
        <td>${r.jobs.toLocaleString()}</td>
        <td>${r.stages.toLocaleString()}</td>
        <td>${r.psi.toLocaleString()}</td>
        <td>${r.hp.toLocaleString()}</td>
        <td style="${r.lateral >= 2500 ? 'color:#dc2626;font-weight:700;' : ''}">${r.lateral.toLocaleString()}</td>
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
      return `<tr style="${isVM ? 'background:#fef2f2;' : ''}">
        <td style="font-weight:${isVM ? '700' : '500'};text-transform:capitalize;font-size:11px;">${r.form}</td>
        <td style="font-weight:700;">${r.jobs.toLocaleString()}</td>
        <td>${r.psi.toLocaleString()}</td>
        <td style="${r.shale >= 90 ? 'color:#dc2626;font-weight:700;' : ''}">${r.shale}%</td>
        <td style="font-size:11px;color:var(--text2);">${r.hazard}</td>
      </tr>`;
    }).join('');
  }

  // Regulatory framework
  const regBody = document.getElementById('argRegulatoryBody');
  if (regBody) {
    regBody.innerHTML = ARG_REGULATIONS.map(r => `<tr>
      <td style="font-weight:600;font-size:11px;">${r.link ? `<a href="${r.link}" target="_blank" rel="noopener" style="color:var(--blue);text-decoration:none;">${r.reg} ↗</a>` : r.reg}</td>
      <td style="font-size:11px;color:var(--text2);">${r.scope}</td>
      <td style="font-size:11px;"><span class="ai-tag" style="--t-c:#2563eb">${r.domains}</span></td>
      <td style="font-size:11px;color:var(--text3);">${r.br}</td>
    </tr>`).join('');
  }
}

// ── Contractor Mexico Study ────────────────────────────────────────────────────

const MEX_TREND = [
  { year: 2015, jobs: 108, stages: 3100, psi: 10830, hp: 29509, lateral: 2083, offshore: 58.3, burgos: 18.5 },
  { year: 2016, jobs: 115, stages: 3149, psi: 10841, hp: 25636, lateral: 1991, offshore: 62.6, burgos: 15.7 },
  { year: 2017, jobs: 102, stages: 2800, psi: 11398, hp: 27037, lateral: 1932, offshore: 64.7, burgos: 16.7 },
  { year: 2018, jobs: 104, stages: 2999, psi: 11086, hp: 28951, lateral: 2067, offshore: 64.4, burgos: 10.6 },
  { year: 2019, jobs: 104, stages: 2717, psi: 11766, hp: 26679, lateral: 1987, offshore: 61.5, burgos: 17.3 },
  { year: 2020, jobs: 124, stages: 3117, psi: 11543, hp: 29555, lateral: 1943, offshore: 54.8, burgos: 20.2 },
  { year: 2021, jobs: 133, stages: 3545, psi: 10692, hp: 28076, lateral: 1890, offshore: 56.4, burgos: 15.8 },
  { year: 2022, jobs: 115, stages: 3085, psi: 10818, hp: 28342, lateral: 1987, offshore: 65.2, burgos: 13.0 },
  { year: 2023, jobs: 118, stages: 3077, psi: 10795, hp: 27945, lateral: 2061, offshore: 58.5, burgos: 16.9 },
  { year: 2024, jobs: 113, stages: 2984, psi: 11132, hp: 27456, lateral: 1939, offshore: 59.3, burgos: 15.9 },
  { year: 2025, jobs: 109, stages: 3014, psi: 10761, hp: 27212, lateral: 2038, offshore: 52.3, burgos: 24.8 },
];

const MEX_OPERATORS = [
  { op: "PEMEX EXPLORACIÓN Y PRODUCCIÓN", basin: "SURESTE", jobs: 859, stages: 22995, psi: 11087, tier: "HIGH" },
  { op: "REPSOL EXPLORACIÓN MÉXICO", basin: "SURESTE", jobs: 75, stages: 2018, psi: 11155, tier: "HIGH" },
  { op: "FIELDWOOD ENERGY", basin: "SURESTE", jobs: 72, stages: 1953, psi: 10842, tier: "HIGH" },
  { op: "HOKCHI ENERGY", basin: "SURESTE", jobs: 69, stages: 2034, psi: 10513, tier: "HIGH" },
  { op: "ENI MÉXICO", basin: "SURESTE", jobs: 59, stages: 1398, psi: 10716, tier: "HIGH" },
  { op: "PETROBAL", basin: "SURESTE", jobs: 59, stages: 1708, psi: 11471, tier: "HIGH" },
  { op: "WINTERSHALL DEA", basin: "SURESTE", jobs: 52, stages: 1481, psi: 11197, tier: "HIGH" },
  { op: "MURPHY SUR", basin: "SURESTE", jobs: 45, stages: 1210, psi: 11800, tier: "HIGH" },
  { op: "BHP BILLITON PETRÓLEO", basin: "SURESTE", jobs: 38, stages: 950, psi: 11250, tier: "HIGH" },
  { op: "PAN AMERICAN ENERGY", basin: "SURESTE", jobs: 34, stages: 890, psi: 10600, tier: "MEDIUM" },
  { op: "LUKOIL UPSTREAM MÉXICO", basin: "SURESTE", jobs: 28, stages: 750, psi: 11400, tier: "HIGH" },
  { op: "CHEIRON HOLDINGS", basin: "SURESTE", jobs: 22, stages: 620, psi: 9850, tier: "MEDIUM" },
  { op: "DIAVAZ DEP", basin: "BURGOS", jobs: 110, stages: 2800, psi: 8500, tier: "MEDIUM" },
  { op: "TECPETROL DE MÉXICO", basin: "BURGOS", jobs: 85, stages: 2100, psi: 7900, tier: "LOW" },
  { op: "SERVICIOS MÚLTIPLES DE BURGOS", basin: "BURGOS", jobs: 65, stages: 1500, psi: 7200, tier: "LOW" }
];

const MEX_FORMATIONS = [
  { form: "Jurásico Superior", jobs: 488, psi: 11167, offshore: 57.6, hazard: "Deep HPHT / Well control" },
  { form: "Cretácico", jobs: 407, psi: 10994, offshore: 63.4, hazard: "Naturally fractured carbonates" },
  { form: "Pimienta", jobs: 120, psi: 11327, offshore: 58.3, hazard: "Deep HPHT / Well control" },
  { form: "Terciario", jobs: 117, psi: 10404, offshore: 55.6, hazard: "Standard pressure horizons" },
  { form: "Agua Nueva", jobs: 113, psi: 11125, offshore: 61.1, hazard: "Deep HPHT / Well control" },
];

// MEX KPIs flagged: static estimates calibrated to SIH/CNH published totals.
// Source: CNH SIH Perforación · sih.hidrocarburos.gob.mx · DOF Lineamientos CNH 2022
// Real CNH API not publicly accessible without subscription — values derived from
// CNH Annual Statistics 2022-2025 and DOF-published operator reports.
const MEX_KPI_SOURCE = 'CNH SIH Perforación · sih.hidrocarburos.gob.mx · Estimated from CNH Annual Reports 2022–2025';

const MEX_REGULATIONS = [
  { reg:"Lineamientos de Perforación y Abandono de Pozos (CNH)",   scope:"Well integrity, barrier elements, BOP requirements for all drilling and well operations in Mexico. Primary equivalent to NORSOK D-010.", domains:"Domains 2 & 3",  br:"ANP Res. 46/2016 SGIP", link:"https://www.dof.gob.mx/nota_detalle.php?codigo=5407590&fecha=22/01/2016" },
  { reg:"Reglamento de la Ley de Hidrocarburos (DOF)",             scope:"Comprehensive E&P operational regulation under Ley de Hidrocarburos. Governs Contractor's contractor obligations across all service categories.", domains:"All domains",   br:"ANP Res. 43/2007 SGSO", link:"https://www.dof.gob.mx/nota_detalle.php?codigo=5414569&fecha=31/10/2014" },
  { reg:"NOM-115-SEMARNAT-2003",                                   scope:"Environmental protection in oil/gas activities — waste management, produced water, chemical disposal for frac operations.", domains:"Domains 1 & 2",            br:"CONAMA Res. 430/2011",  link:"https://www.dof.gob.mx/" },
  { reg:"Lineamientos de Medición de Hidrocarburos (CNH)",         scope:"Metering and production accounting requirements — applies to completion and production tool deployments (DHSV, gauges).", domains:"Domain 4",                  br:"ANP Res. 874/2022",     link:"https://www.gob.mx/cnh" },
  { reg:"NOM-138-SEMARNAT/SS-2003",                                scope:"Hydrocarbon contamination limits in soil and subsoil — governs Contractor fluid spill response and frac fluid containment obligations.", domains:"Domains 1 & 2",      br:"CONAMA Res. 357/2005",  link:"https://www.dof.gob.mx/" },
  { reg:"ASEA — Gestión de Integridad de Ductos (DOF 2016)",       scope:"Pipeline and surface line integrity under ASEA (Agencia de Seguridad, Energía y Ambiente) — affects wellhead and surface Contractor equipment.", domains:"Domain 4",    br:"ANP Res. 46/2016",      link:"https://www.gob.mx/asea" },
  { reg:"Ley de Hidrocarburos Art. 40–43 (DOF 2014)",              scope:"Contractor accountability for safety incidents, liability chain from operator to service company (Contractor). Equivalent to ANP's direct attribution framework.", domains:"All domains", br:"Lei 9.478/1997 (Lei do Petróleo)", link:"https://www.dof.gob.mx/nota_detalle.php?codigo=5361701&fecha=11/08/2014" },
  { reg:"NOM-001-SESH-2010 (SENER)",                               scope:"Technical safety standards for hydrocarbon installations — applies to Contractor's surface pressure equipment and cementing units.", domains:"Domains 1–3",            br:"NR-37 (MTE offshore)",  link:"https://www.dof.gob.mx/" },
];

function renderMexicoTables() {
  const trendBody = document.getElementById('mexTrendBody');
  if (trendBody) {
    trendBody.innerHTML = MEX_TREND.map(r => {
      const isEscalating = r.year >= 2021;
      const rowStyle = isEscalating ? 'background:#f0fdf4;' : '';
      return `<tr style="${rowStyle}">
        <td style="font-weight:700;">${r.year}${r.year === 2026 ? ' <span style="font-size:10px;color:var(--text3);">YTD</span>' : ''}</td>
        <td>${r.jobs.toLocaleString()}</td>
        <td>${r.stages.toLocaleString()}</td>
        <td>${r.psi.toLocaleString()}</td>
        <td>${r.hp.toLocaleString()}</td>
        <td style="${r.lateral >= 1500 ? 'color:#dc2626;font-weight:700;' : ''}">${r.lateral.toLocaleString()}</td>
        <td>${r.offshore}%</td>
        <td>${r.burgos}%</td>
      </tr>`;
    }).join('');
  }

  const opBody = document.getElementById('mexOperatorBody');
  if (opBody) {
    opBody.innerHTML = MEX_OPERATORS.map(r => {
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

  const formBody = document.getElementById('mexFormationBody');
  if (formBody) {
    formBody.innerHTML = MEX_FORMATIONS.map(r => {
      const isHigh = r.psi > 11000;
      return `<tr style="${isHigh ? 'background:#fef2f2;' : ''}">
          <td style="font-weight:${isHigh ? '700' : '500'};text-transform:capitalize;font-size:11px;">${r.form}</td>
          <td style="font-weight:700;">${r.jobs.toLocaleString()}</td>
          <td>${r.psi.toLocaleString()}</td>
          <td style="${r.offshore >= 90 ? 'color:#dc2626;font-weight:700;' : ''}">${r.offshore}%</td>
          <td style="font-size:11px;color:var(--text2);">${r.hazard}</td>
        </tr>`;
    }).join('');
  }

  const regBody = document.getElementById('mexRegulatoryBody');
  if (regBody) {
    regBody.innerHTML = MEX_REGULATIONS.map(r => `<tr>
      <td style="font-weight:600;font-size:11px;">${r.link ? `<a href="${r.link}" target="_blank" rel="noopener" style="color:var(--blue);text-decoration:none;">${r.reg} ↗</a>` : r.reg}</td>
      <td style="font-size:11px;color:var(--text2);">${r.scope}</td>
      <td style="font-size:11px;"><span class="ai-tag" style="--t-c:#2563eb">${r.domains}</span></td>
      <td style="font-size:11px;color:var(--text3);">${r.br}</td>
    </tr>`).join('');
  }
}

// ── Contractor Norway Study ────────────────────────────────────────────────────────
// Sources:
//   Incidents  → api/data/norway_incidents.csv (2,399 records, 2013–2026)
//                Aggregated from NCS SSO reporting under RNNP/Havtil framework
//   Operators  → api/data/norway_contracts.csv (64 contracts, Contractor AS / Equinor / Aker BP…)
//   Fields     → evento column of norway_incidents.csv ("NCS-<field>" pattern)
//   Regulations→ Lovdata.no · Havtil.no/rnnp · Standard.no · Sodir.no

// RNNP-calibrated incident trend — 2024/2025 sourced from official Havtil reports;
// 2013–2023 modelled proportionally to RNNP historical series.
// Fields: year, total, minor, moderate, severe, csb, kick, bop, hcRelease, lossControl, source
let NOR_TREND = [
  { year: 2013, total: 148, minor: 82, moderate: 42, severe: 24, csb: 38, kick: 12, bop: 8,  hcRelease: 11, lossControl: 7 },
  { year: 2014, total: 141, minor: 79, moderate: 39, severe: 23, csb: 35, kick: 11, bop: 7,  hcRelease: 10, lossControl: 6 },
  { year: 2015, total: 132, minor: 74, moderate: 36, severe: 22, csb: 33, kick: 10, bop: 7,  hcRelease: 9,  lossControl: 6 },
  { year: 2016, total: 119, minor: 67, moderate: 32, severe: 20, csb: 30, kick: 9,  bop: 6,  hcRelease: 9,  lossControl: 5 },
  { year: 2017, total: 112, minor: 63, moderate: 30, severe: 19, csb: 28, kick: 9,  bop: 6,  hcRelease: 8,  lossControl: 5 },
  { year: 2018, total: 124, minor: 70, moderate: 33, severe: 21, csb: 31, kick: 10, bop: 7,  hcRelease: 9,  lossControl: 6 },
  { year: 2019, total: 130, minor: 73, moderate: 35, severe: 22, csb: 33, kick: 11, bop: 7,  hcRelease: 10, lossControl: 6 },
  { year: 2020, total: 107, minor: 60, moderate: 29, severe: 18, csb: 27, kick: 8,  bop: 5,  hcRelease: 7,  lossControl: 5 },
  { year: 2021, total: 115, minor: 65, moderate: 31, severe: 19, csb: 29, kick: 9,  bop: 6,  hcRelease: 8,  lossControl: 5 },
  { year: 2022, total: 118, minor: 66, moderate: 32, severe: 20, csb: 30, kick: 10, bop: 6,  hcRelease: 8,  lossControl: 5 },
  { year: 2023, total: 122, minor: 68, moderate: 33, severe: 21, csb: 31, kick: 10, bop: 6,  hcRelease: 8,  lossControl: 6 },
  { year: 2024, total: 138, minor: 76, moderate: 38, severe: 24, csb: 35, kick: 12, bop: 8,  hcRelease: 7,  lossControl: 6, source: "RNNP 2024" },
  { year: 2025, total: 131, minor: 85, moderate: 23, severe: 23, csb: 32, kick: 15, bop: 7,  hcRelease: 5,  lossControl: 5, source: "RNNP 2025" },
];
let NOR_OPERATORS = [];
let NOR_FIELDS = [];

async function loadNorwayRealData() {
  try {
    const res = await fetch('/api/norway-stats');
    const stats = await res.json();
    // Note: stats.trend contains wellbore completion counts (Sodir), not RNNP incident data.
    // NOR_TREND uses the static RNNP-calibrated dataset above — do not overwrite.
    if (stats.topOperators) NOR_OPERATORS = stats.topOperators.map(o => ({ op: o.name, field: 'Various', contracts: o.count, tier: o.count > 100 ? 'HIGH' : 'MEDIUM' }));
    if (stats.topFields) NOR_FIELDS = stats.topFields.map(f => ({
      field: f.name,
      count: f.count,
      topOperator: f.topOperator || '',
      content: f.content || '',
      area: f.area || '',
      firstYear: f.firstYear || null,
      lastYear: f.lastYear || null,
      avgWaterDepth: f.avgWaterDepth || 0,
      avgTotalDepth: f.avgTotalDepth || 0,
      subsea: f.subsea || 0,
      pa: f.pa || 0,
      hazard: f.hazard || '',
      norsokRef: f.norsokRef || 'NORSOK D-010 Rev.5',
      rnnpRef: f.rnnpRef || 'RNNP integrity monitoring',
      source: f.source || 'Sodir FactPages (NLOD)',
    }));

    try { renderNorwayTables(); } catch(e) { console.warn('renderNorwayTables error:', e); }
  } catch (err) {
    console.warn("Failed to load Norway real stats, falling back to static", err);
    try { renderNorwayTables(); } catch(e) { console.warn('renderNorwayTables error:', e); }
  }
}

// Norwegian regulatory framework — cross-referenced to Brazil equivalents
const NOR_REGULATIONS = [
  { reg:"Aktivitetsforskriften (Activity Regulations)", authority:"Havtil / PSA Norway", scope:"Well barrier requirements, drilling and well operations on NCS — Chapters 7–9 govern well integrity directly", domains:"All Contractor service lines", br:"ANP Res. 46/2016 (SGIP) + ANP Res. 43/2007 (SGSO)", link:"https://lovdata.no/dokument/SF/forskrift/2010-04-29-613" },
  { reg:"Styringsforskriften (Management Regulations)", authority:"Havtil / PSA Norway", scope:"Risk management, barrier management systems, safety critical elements — applies to all contractors including service companies", domains:"All Contractor service lines", br:"ANP Res. 43/2007 (SGSO)", link:"https://lovdata.no/dokument/SF/forskrift/2010-04-29-611" },
  { reg:"NORSOK D-010 rev.5 (Well Integrity)", authority:"Standard Norge", scope:"Well barrier elements, barrier envelopes, acceptance criteria — primary technical standard for NCS well integrity", domains:"Cementing · Completion · MPD · Well Control", br:"ANP Res. 46/2016 (SGIP) — equivalent scope", link:"https://www.standard.no/en/sectors/energi-og-klima/petroleum/norsok-standard-categories/d-drilling/d-0102/" },
  { reg:"NORSOK D-001 rev.3 (Drilling Fluid Design)", authority:"Standard Norge", scope:"Drilling fluid and completion fluid design, hydrostatic barrier requirements", domains:"Drilling Fluids / Baroid", br:"ANP Res. 43/2007 — SGSO operational safety", link:"https://www.standard.no/en/sectors/energi-og-klima/petroleum/norsok-standard-categories/d-drilling/d-0012/" },
  { reg:"Petroleumsloven (Petroleum Act, Lov 1996-11-29-72)", authority:"Ministry of Energy (OED)", scope:"State ownership of NCS deposits, licensing, liability chain for operators and service contractors", domains:"All domains", br:"Lei 9.478/1997 (Lei do Petróleo)", link:"https://lovdata.no/dokument/NL/lov/1996-11-29-72" },
  { reg:"RNNP (Risikonivå i Norsk Petroleumsvirksomhet)", authority:"Havtil / PSA Norway", scope:"Annual risk-level programme — well barrier defects, HC releases, serious incidents. Published benchmark for NCS safety performance", domains:"CSB / barrier benchmarking", br:"ANP SISO-Incidentes dataset (equivalent statistical basis)", link:"https://www.havtil.no/en/rnnp/" },
  { reg:"Rammeforskriften (Framework Regulations)", authority:"Havtil / PSA Norway", scope:"Overarching HSE framework for NCS — defines competence requirements and responsibility for service companies", domains:"All domains", br:"NR-37 (MTE) — offshore platform HSE", link:"https://lovdata.no/dokument/SF/forskrift/2010-04-29-610" },
  { reg:"Sodir Resource Classification (NCS Open Data)", authority:"Sodir (Norwegian Offshore Directorate)", scope:"Wellbore registry, production data, licence data — open under NLOD, used for field/operator exposure mapping", domains:"Field intelligence", br:"ANP dados.gov.br (equivalent open data registry)", link:"https://factpages.sodir.no" },
];

const NOR_HAL_OVERLAP = [
  { rnnpCategory:"Cement/casing barrier defect", norsokElement:"Primary well barrier — cement plug / casing shoe", halService:"Contractor Cementing Services (NCS)", exposure:"HIGH" },
  { rnnpCategory:"Completion barrier failure (DHSV)", norsokElement:"Secondary barrier — DHSV / production tubing", halService:"Contractor Completion Tools", exposure:"HIGH" },
  { rnnpCategory:"Drilling fluid loss / kick", norsokElement:"Primary barrier — hydrostatic pressure column", halService:"Baroid Drilling Fluids (Contractor)", exposure:"HIGH" },
  { rnnpCategory:"BOP / annular preventer defect", norsokElement:"Well control barrier", halService:"Pressure Control / MPD (Contractor)", exposure:"MODERATE" },
  { rnnpCategory:"MWD/LWD sensor barrier gap", norsokElement:"Monitoring / detection", halService:"Sperry Drilling (Contractor)", exposure:"LOW" },
  { rnnpCategory:"Accidental HC release ≥0.1 kg/s", norsokElement:"Process / riser barrier", halService:"Completion / Well Services (Contractor)", exposure:"MODERATE" },
  { rnnpCategory:"Structural fatigue / damage", norsokElement:"Structural barrier element", halService:"Contractor Engineering Services", exposure:"LOW" },
];
function renderNorwayTables() {
  console.log('NOR: renderNorwayTables called, NOR_TREND rows:', NOR_TREND.length);
  // Trend table
  const trendBody = document.getElementById('norTrendBody');
  console.log('NOR: norTrendBody element:', trendBody);
  if (trendBody) {
    trendBody.innerHTML = NOR_TREND.map(r => {
      const isReal = !!r.source;
      const isRecent = r.year >= 2022;
      const rowStyle = isReal ? 'background:#f0fdf4;' : (isRecent ? 'background:#f0f9ff;' : '');
      const srcBadge = isReal
        ? `<span style="font-size:9px;font-weight:700;background:#dcfce7;color:#16a34a;border:1px solid #bbf7d0;padding:1px 5px;border-radius:3px;margin-left:4px;">✓ ${r.source}</span>`
        : `<span style="font-size:9px;color:#94a3b8;border:1px solid #e2e8f0;padding:1px 5px;border-radius:3px;margin-left:4px;">modelled</span>`;
      const fmt = v => v == null ? '—' : v;
      return `<tr style="${rowStyle}">
        <td style="font-weight:700;white-space:nowrap;">${r.year}${srcBadge}</td>
        <td style="font-weight:700;">${fmt(r.total)}</td>
        <td>${fmt(r.minor)}</td>
        <td style="${r.moderate > 35 ? 'color:#d97706;font-weight:700;' : ''}">${fmt(r.moderate)}</td>
        <td style="${r.severe > 20 ? 'color:#dc2626;font-weight:700;' : ''}">${fmt(r.severe)}</td>
        <td>${fmt(r.csb)}</td>
        <td style="${r.kick >= 14 ? 'color:#1a56a0;font-weight:700;' : ''}">${fmt(r.kick)}</td>
        <td>${fmt(r.bop)}</td>
        <td style="${r.hcRelease > 6 ? 'color:#dc2626;font-weight:700;' : (r.hcRelease <= 5 && r.hcRelease != null ? 'color:#16a34a;font-weight:700;' : '')}">${fmt(r.hcRelease)}</td>
        <td style="${r.lossControl >= 5 ? 'color:#7c3aed;font-weight:700;' : ''}">${fmt(r.lossControl)}</td>
      </tr>`;
    }).join('');
  }

  // Operator table
  const opBody = document.getElementById('norOperatorBody');
  if (opBody) {
    opBody.innerHTML = NOR_OPERATORS.map(r => {
      const ts = TIER_STYLES[r.tier] || TIER_STYLES.LOW;
      const badge = `<span style="font-size:10px;font-weight:700;background:${ts.bg};color:${ts.color};border:1px solid ${ts.border};padding:2px 7px;border-radius:20px;">${r.tier}</span>`;
      return `<tr>
        <td style="font-weight:600;font-size:11px;">${r.op}</td>
        <td style="font-size:11px;">${r.field}</td>
        <td style="font-weight:700;">${r.contracts}</td>
        <td>${badge}</td>
      </tr>`;
    }).join('');
  }

  // Fields table
  const fieldBody = document.getElementById('norFieldBody');
  if (fieldBody) {
    fieldBody.innerHTML = [...NOR_FIELDS].sort((a, b) => (b.lastYear || 0) - (a.lastYear || 0)).map(r => {
      const period = (r.firstYear && r.lastYear)
        ? (r.firstYear === r.lastYear ? `${r.firstYear}` : `${r.firstYear} – ${r.lastYear}`)
        : '—';
      const wd = r.avgWaterDepth > 0 ? `${r.avgWaterDepth} m` : '—';
      const isDeep = r.avgWaterDepth > 200;
      const contentBadge = r.content
        ? `<span style="font-size:9px;font-weight:700;background:${r.content.includes('GAS')?'#eff6ff':'#fefce8'};color:${r.content.includes('GAS')?'#1d4ed8':'#92400e'};border:1px solid ${r.content.includes('GAS')?'#bfdbfe':'#fde68a'};padding:1px 5px;border-radius:3px;">${r.content}</span>`
        : '—';
      const paBadge = r.pa > 0 ? `<span style="font-size:9px;color:#6b7280;margin-left:4px;">${r.pa} P&A</span>` : '';
      return `<tr>
        <td style="font-weight:700;font-size:12px;">${r.field}${isDeep ? ' <span style="font-size:9px;background:#fef2f2;color:#dc2626;border:1px solid #fecaca;padding:1px 4px;border-radius:3px;">DEEP</span>' : ''}</td>
        <td style="font-size:11px;color:var(--text3);">${r.area || '—'}</td>
        <td style="font-size:11px;color:var(--text2);">${r.topOperator || '—'}</td>
        <td style="font-weight:700;">${r.count}${paBadge}</td>
        <td style="font-size:11px;font-weight:600;color:#1d4ed8;">${period}</td>
        <td style="font-size:11px;font-weight:600;color:${isDeep?'#dc2626':'var(--text)'};">${wd}</td>
        <td>${contentBadge}</td>
        <td style="font-size:11px;color:var(--text2);max-width:220px;">${r.hazard || '—'}</td>
        <td style="font-size:10px;color:#7c3aed;">${r.norsokRef || '—'}</td>
        <td style="font-size:10px;color:#0d9488;">${r.rnnpRef || '—'}</td>
        <td style="font-size:10px;color:#1d4ed8;"><a href="https://factpages.sodir.no" target="_blank" rel="noopener" style="color:#1d4ed8;">Sodir FactPages ↗</a></td>
      </tr>`;
    }).join('');
  }

  // Regulatory table
  const regBody = document.getElementById('norRegulatoryBody');
  if (regBody) {
    regBody.innerHTML = NOR_REGULATIONS.map(r => `<tr>
      <td style="font-weight:600;font-size:11px;"><a href="${r.link}" target="_blank" rel="noopener" style="color:var(--blue);text-decoration:none;">${r.reg} ↗</a></td>
      <td style="font-size:11px;color:var(--text3);">${r.authority}</td>
      <td style="font-size:11px;color:var(--text2);">${r.scope}</td>
      <td style="font-size:11px;"><span class="ai-tag" style="--t-c:#2563eb">${r.domains}</span></td>
      <td style="font-size:11px;color:var(--text3);">${r.br}</td>
    </tr>`).join('');
  }

  // Contractor overlap table
  const overlapBody = document.getElementById('norOverlapBody');
  if (overlapBody) {
    overlapBody.innerHTML = NOR_HAL_OVERLAP.map(r => {
      const ts = TIER_STYLES[r.exposure] || TIER_STYLES.LOW;
      const badge = `<span style="font-size:10px;font-weight:700;background:${ts.bg};color:${ts.color};border:1px solid ${ts.border};padding:2px 7px;border-radius:20px;">${r.exposure}</span>`;
      return `<tr>
        <td style="font-size:11px;font-weight:600;">${r.rnnpCategory}</td>
        <td style="font-size:11px;color:var(--text2);">${r.norsokElement}</td>
        <td style="font-size:11px;">${r.halService}</td>
        <td>${badge}</td>
      </tr>`;
    }).join('');
  }
}

// ── Cross-Analysis Tab ─────────────────────────────────────────────────────

let ALL_CONTRACTS = [];
let filteredContracts = [];


// ── Currency conversion rates (USD → local) ───────────────────────────────────
// Rates as of April 5, 2026
// Fallback rates — sourced from open.er-api.com on Apr 8, 2026
// ARS = BCRA official rate (not parallel/blue dollar market — correct for contract valuation)
// NOK cross-validated against Norges Bank official fixing (9.6764 vs 9.6427 — within bid/ask spread)
const FX_RATES = {
  BRZ: { rate: 5.1519,  symbol: 'R$',  label: 'Brazilian Real (BRL)',      date: 'Apr 8, 2026 (cached)' },
  ARG: { rate: 1395.10, symbol: 'ARS', label: 'Argentine Peso — BCRA official (ARS)', date: 'Apr 8, 2026 (cached)' },
  MEX: { rate: 17.6632, symbol: 'MX$', label: 'Mexican Peso (MXN)',        date: 'Apr 8, 2026 (cached)' },
  NOR: { rate: 9.6427,  symbol: 'kr',  label: 'Norwegian Krone (NOK)',     date: 'Apr 8, 2026 (cached)' },
};

// Map currency codes from FX API → our country keys
const FX_CURRENCY_MAP = { BRL: 'BRZ', ARS: 'ARG', MXN: 'MEX', NOK: 'NOR' };

// Returns USD numeric value for any contract regardless of source currency
function contractToUSD(c) {
  if (!c._rawUSD) return 0;
  // NOR contracts are stored in NOK — divide by current NOK rate to get USD
  if (c.country === 'NOR') return c._rawUSD / (FX_RATES.NOR.rate || 9.6427);
  // BRZ, ARG, MEX raw values are already in USD
  return c._rawUSD;
}

// Format a USD number for display
function fmtUSD(num) {
  if (!num) return '—';
  return 'US$ ' + Math.round(num).toLocaleString('en-US');
}

window.refreshFXRates = async function() {
  const btn = document.getElementById('fxRefreshBtn');
  const statusEl = document.getElementById('fxStatusText');
  if (btn) { btn.disabled = true; btn.classList.add('fx-spinning'); }
  if (statusEl) statusEl.textContent = 'Fetching live rates…';

  try {
    const res = await fetch('https://open.er-api.com/v6/latest/USD');
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    const rates = data.rates || {};
    const now = new Date();
    const dateStr = now.toLocaleDateString('en-US', { month:'short', day:'numeric', year:'numeric' });
    const timeStr = now.toLocaleTimeString('en-US', { hour:'2-digit', minute:'2-digit' });

    // Update FX_RATES with live values
    for (const [code, key] of Object.entries(FX_CURRENCY_MAP)) {
      if (rates[code]) {
        FX_RATES[key].rate = parseFloat(rates[code].toFixed(4));
        FX_RATES[key].date = `${dateStr} ${timeStr} (live)`;
      }
    }

    // Reapply converted values to all processed contracts
    const reapply = (arr) => arr.forEach(c => {
      if (c.country && c._rawUSD) {
        const fx = FX_RATES[c.country];
        if (fx) {
          const converted = Math.round(c._rawUSD * fx.rate);
          c.value = `${fx.symbol} ${converted.toLocaleString('en-US')}`;
        }
      }
    });
    reapply(mexicoContracts);
    reapply(argentinaContracts);
    reapply(norwayContracts);
    reapply(ALL_CONTRACTS);

    // Re-render active tables
    window.filtermexicoContracts();
    window.filterargentinaContracts();
    window.filternorwayContracts();
    window.filterContractTable?.();

    // Update status
    if (statusEl) statusEl.innerHTML = `<span style="color:#16a34a;font-weight:700;">✓ Live</span> · USD→BRL ${FX_RATES.BRZ.rate} · USD→ARS ${FX_RATES.ARG.rate.toLocaleString()} · USD→MXN ${FX_RATES.MEX.rate} · USD→NOK ${FX_RATES.NOR.rate} · <span style="color:#64748b;">${dateStr} ${timeStr}</span>`;

  } catch (err) {
    console.error('FX refresh failed:', err);
    if (statusEl) statusEl.innerHTML = `<span style="color:#dc2626;">⚠ Fetch failed — ${err.message}. Using cached rates.</span>`;
  } finally {
    if (btn) { btn.disabled = false; btn.classList.remove('fx-spinning'); }
  }
};

function convertContractValue(usdStr, country) {
  const fx = FX_RATES[country];
  if (!fx) return usdStr;
  const num = parseFloat((usdStr || '').replace(/[^0-9.]/g, ''));
  if (isNaN(num)) return usdStr;
  const converted = Math.round(num * fx.rate);
  return `${fx.symbol} ${converted.toLocaleString('en-US')}`;
}

let mexicoContracts = [];
let argentinaContracts = [];
let norwayContracts = [];
let fMexicoContracts = [];
let fArgentinaContracts = [];
let fNorwayContracts = [];
let mexCPage = 1, argCPage = 1, norCPage = 1;
let activeMexDomain = '';
let mexActiveOnly = false;
let activeArgDomain = '';
let activeBrzDomain = '';

// Value filter state per section (min USD threshold, 0 = all)
let mexValMin = 0, argValMin = 0, norValMin = 0, brzValMin = 0, norCxValMin = 0;

// Parse a display value string → numeric USD equivalent
function parseContractNum(str) {
  if (!str || str === '—') return 0;
  // Strip currency symbols/labels, keep digits and decimal
  const cleaned = str.replace(/[^\d.]/g, '');
  return parseFloat(cleaned) || 0;
}

window.setValMin = function(section, val, el) {
  const v = parseInt(val, 10);
  if (section === 'mex') { mexValMin = v; window.filtermexicoContracts(); }
  else if (section === 'arg') { argValMin = v; window.filterargentinaContracts(); }
  else if (section === 'nor') { norValMin = v; window.filternorwayContracts(); }
  else if (section === 'brz') { brzValMin = v; window.filterContractTable(); }
  else if (section === 'norcx') { norCxValMin = v; window.filterNorCrossContracts(); }
  // Sync active state on siblings
  const parent = el?.closest('.val-filter-bar');
  if (parent) {
    parent.querySelectorAll('.val-btn').forEach(b => b.classList.remove('seg-btn-active'));
    el?.classList.add('seg-btn-active');
  }
};

function processRegionalContracts(rawItems) {
  return rawItems.map(c => {
    const obj = (c.obj || "").toLowerCase();
    let domain = "Other";
    if (obj.includes("ciment") || obj.includes("cement")) domain = "Cementing";
    else if (obj.includes("estimul") || obj.includes("frac") || obj.includes("stimul")) domain = "Stimulation";
    else if (obj.includes("fluidos") || obj.includes("fluid") || obj.includes("lodo")) domain = "Fluids";
    else if (obj.includes("complet") || obj.includes("terminaci")) domain = "Completion";
    else if (obj.includes("mpd") || obj.includes("managed press")) domain = "MPD";
    else if (obj.includes("workover") || obj.includes("interven") || obj.includes("operations") || obj.includes("reparaci")) domain = "Workover";
    else if (obj.includes("constru") || obj.includes("execution") || obj.includes("perfora")) domain = "Well Construction";
    else if (obj.includes("g&g") || obj.includes("geol") || obj.includes("software")) domain = "G&G Software";

    const numero = c.numero || "—";
    // MEX contracts are denominated in USD — keep as-is; only ARG converts to local currency
    let country = null;
    if (numero.startsWith('ARG-')) country = 'ARG';
    if (numero.startsWith('NOR-')) country = 'NOR';

    const rawValue = c.value || "—";
    const _rawUSD = parseFloat((rawValue).replace(/[^0-9.]/g, '')) || 0;
    const displayValue = country ? convertContractValue(rawValue, country) : rawValue;

    // Parse inicio date (DD/MM/YYYY) → sortable number YYYYMMDD
    const parseDateSort = (d) => {
      if (!d) return 0;
      const p = d.split('/');
      return p.length === 3 ? parseInt(p[2] + p[1] + p[0]) : 0;
    };

    return {
      numero,
      domain,
      obj: c.obj || "No description provided",
      value: displayValue,
      _rawUSD,
      country,
      inicio: c.inicio || '',
      fim: c.fim || '',
      inicioSort: parseDateSort(c.inicio),
      finSort: parseDateSort(c.fim),
      csbLink: getCSBLink(domain)
    };
  });
}

function renderRegionalTable(prefix, page, data) {
  const tbody = document.getElementById(prefix + "ContractEvidenceBody");
  if (!tbody) return;
  const PAGE_SIZE = 12;
  const start = (page - 1) * PAGE_SIZE;
  const slice = data.slice(start, start + PAGE_SIZE);

  if (!slice.length) {
    tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;color:#8896ab;padding:24px">No contracts match the current filter</td></tr>`;
    return;
  }

  tbody.innerHTML = slice.map(c => {
    const domLabel = DOMAIN_MAP[c.domain] || c.domain;
    const yr1 = c.inicio ? c.inicio.split('/')[2] : '?';
    const yr2 = c.fim ? c.fim.split('/')[2] : '?';
    const period = yr1 === yr2 ? yr1 : `${yr1}–${yr2}`;
    return `<tr>
      <td style="font-family:monospace;font-size:11px;font-weight:700;color:var(--blue)">${c.numero}</td>
      <td><span style="font-size:11px;font-weight:700;color:var(--text)">${domLabel}</span></td>
      <td style="max-width:260px;font-size:11px;color:var(--text2);line-height:1.5;">${c.obj.substring(0, 130)}${c.obj.length > 130 ? '…' : ''}</td>
      <td style="font-size:11px;color:var(--text3);white-space:nowrap;">${period}</td>
      <td style="font-weight:700;color:var(--text);white-space:nowrap;">${fmtUSD(contractToUSD(c))}</td>
      <td style="font-size:12px;font-weight:700;white-space:nowrap;">${c.csbLink}</td>
    </tr>`;
  }).join('');

  // pagination
  const pg = document.getElementById(prefix + "ContractPagination");
  if (pg) {
    const pages = Math.ceil(data.length / PAGE_SIZE);
    if (pages <= 1) { pg.innerHTML = ""; return; }
    pg.innerHTML = `
        <button onclick="change${prefix}Page(${page - 1})" ${page === 1 ? 'disabled' : ''} class="pg-btn">Prev</button>
        <span style="font-size:13px;font-weight:600;color:#64748b;margin:0 10px;">Page ${page} of ${pages}</span>
        <button onclick="change${prefix}Page(${page + 1})" ${page === pages ? 'disabled' : ''} class="pg-btn">Next</button>
      `;
  }

  // Currency conversion footnote for ARG and MEX tables
  const fxNote = document.getElementById(prefix + "ContractFxNote");
  if (fxNote) {
    const country = data[0]?.country;
    const fx = country ? FX_RATES[country] : null;
    if (fx) {
      fxNote.innerHTML = `
        <span style="font-size:11px;color:#64748b;">
          ⓘ All values displayed in <strong>USD</strong> · converted from ${fx.label} at <strong>1 USD = ${fx.rate.toLocaleString('en-US')} ${fx.symbol}</strong>
          &nbsp;·&nbsp; Rate as of <strong>${fx.date}</strong>
        </span>`;
      fxNote.style.display = 'block';
    } else {
      fxNote.style.display = 'none';
    }
  }
}

window.filtermexicoContracts = function() {
    const q = (document.getElementById('mexicoContractSearch')?.value||'').toLowerCase();
    const domain = activeMexDomain.toLowerCase();
    fMexicoContracts = mexicoContracts
        .filter(c => {
            const dText = (c.domain||'').toLowerCase();
            const domainMatch = !domain || dText.includes(domain);
            const qMatch = !q || (c.numero+dText+c.obj).toLowerCase().includes(q);
            const activeMatch = !mexActiveOnly || (c.finSort >= 20260101 || c.finSort === 0);
            const valMatch = !mexValMin || contractToUSD(c) >= mexValMin;
            return domainMatch && qMatch && activeMatch && valMatch;
        })
        .sort((a, b) => (b.inicioSort||0) - (a.inicioSort||0));
    mexCPage = 1;
    renderRegionalTable('mexico', mexCPage, fMexicoContracts);
};
window.changemexicoPage = function(p) { mexCPage=p; renderRegionalTable('mexico', mexCPage, fMexicoContracts); };

window.filterargentinaContracts = function() {
    const q = (document.getElementById('argentinaContractSearch')?.value||'').toLowerCase();
    const domain = activeArgDomain.toLowerCase();
    fArgentinaContracts = argentinaContracts
        .filter(c => {
            const dText = (c.domain||'').toLowerCase();
            const valMatch = !argValMin || contractToUSD(c) >= argValMin;
            return (!domain || dText.includes(domain)) && (!q || (c.numero+dText+c.obj).toLowerCase().includes(q)) && valMatch;
        })
        .sort((a, b) => (a.inicioSort||0) - (b.inicioSort||0));
    argCPage = 1;
    renderRegionalTable('argentina', argCPage, fArgentinaContracts);
};
window.changeargentinaPage = function(p) { argCPage=p; renderRegionalTable('argentina', argCPage, fArgentinaContracts); };

window.filternorwayContracts = function() {
    const q = (document.getElementById('norwayContractSearch')?.value||'').toLowerCase();
    const domain = (document.getElementById('norwayContractDomainFilter')?.value||'').toLowerCase();
    fNorwayContracts = norwayContracts.filter(c => {
        const dText = (c.domain||'').toLowerCase();
        const valMatch = !norValMin || contractToUSD(c) >= norValMin;
        return (!domain || dText.includes(domain)) && (!q || (c.numero+dText+c.obj).toLowerCase().includes(q)) && valMatch;
    });
    norCPage = 1;
    renderRegionalTable('norway', norCPage, fNorwayContracts);
};
window.changenorwayPage = function (p) { norCPage = p; renderRegionalTable('norway', norCPage, fNorwayContracts); };

// Norway Cross-Analysis Contract Evidence Table
let norCxPage = 1;
let norCxDomain = '';
let fNorCxContracts = [];

window.setNorCxDomain = function(domain, el) {
  norCxDomain = norCxDomain === domain ? '' : domain;
  document.querySelectorAll('.nor-cx-seg-btn').forEach(b => b.classList.remove('seg-btn-active'));
  if (!norCxDomain) document.querySelector('.nor-cx-seg-btn')?.classList.add('seg-btn-active');
  else if (el) el.classList.add('seg-btn-active');
  window.filterNorCrossContracts();
};
window.filterNorCrossContracts = function() {
  const q = (document.getElementById('norCrossContractSearch')?.value || '').toLowerCase();
  fNorCxContracts = norwayContracts.filter(c => {
    const d = (c.domain || '').toLowerCase();
    const valMatch = !norCxValMin || contractToUSD(c) >= norCxValMin;
    return (!norCxDomain || d.includes(norCxDomain)) && (!q || (c.numero + d + c.obj).toLowerCase().includes(q)) && valMatch;
  });
  norCxPage = 1;
  renderNorCrossContracts();
};
function renderNorCrossContracts() {
  const tbody = document.getElementById('norCrossContractBody');
  const pagination = document.getElementById('norCrossContractPagination');
  if (!tbody) return;
  const PER_PAGE = 10;
  const total = fNorCxContracts.length;
  const pages = Math.ceil(total / PER_PAGE) || 1;
  const slice = fNorCxContracts.slice((norCxPage - 1) * PER_PAGE, norCxPage * PER_PAGE);
  if (!slice.length) {
    tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;color:#8896ab;padding:24px;">No contracts match the current filter.</td></tr>`;
    if (pagination) pagination.innerHTML = '';
    return;
  }
  // Map domain → RNNP barrier category
  const rnnpMap = {
    cementing: 'Cement/casing barrier defect (RNNP §4.2)',
    completion: 'Completion / DHSV barrier failure (RNNP §4.3)',
    fluids: 'Drilling fluid loss / kick (RNNP §4.4)',
    mpd: 'BOP / pressure control defect (RNNP §4.5)',
    drilling: 'MWD/LWD monitoring gap (RNNP §4.6)',
    workover: 'Well intervention barrier event (RNNP §4.2)',
  };
  tbody.innerHTML = slice.map(c => {
    const d = (c.domain || 'Other').toLowerCase();
    const rnnp = rnnpMap[d] || 'RNNP barrier event (general)';
    const domainBadge = `<span class="ai-tag" style="--t-c:#3b82f6;font-size:10px;">${c.domain || 'Other'}</span>`;
    return `<tr>
      <td style="font-weight:700;font-size:11px;">${c.numero || '—'}</td>
      <td>${domainBadge}</td>
      <td style="font-size:12px;color:var(--text2);">${(c.obj || '—').substring(0,120)}${c.obj && c.obj.length > 120 ? '…' : ''}</td>
      <td style="font-size:11px;">${c.inicio && c.fim ? c.inicio.substring(6) + ' – ' + c.fim.substring(6) : (c.inicio || '—')}</td>
      <td style="font-size:11px;font-weight:600;">${fmtUSD(contractToUSD(c))}</td>
      <td style="font-size:10px;color:#1d4ed8;">${rnnp}</td>
    </tr>`;
  }).join('');
  if (pagination) {
    pagination.innerHTML = Array.from({length: pages}, (_, i) => i + 1).map(p =>
      `<button onclick="norCxPage=${p};renderNorCrossContracts()" class="page-btn${p === norCxPage ? ' active' : ''}">${p}</button>`
    ).join('');
  }
}

window.toggleMexActive = function(el) {
  mexActiveOnly = !mexActiveOnly;
  el.classList.toggle('seg-btn-active', mexActiveOnly);
  window.filtermexicoContracts();
};
window.setMexDomain = function(domain, el) {
  activeMexDomain = activeMexDomain === domain ? '' : domain;
  document.querySelectorAll('.mex-seg-btn').forEach(b => b.classList.remove('seg-btn-active'));
  if (activeMexDomain && el) el.classList.add('seg-btn-active');
  window.filtermexicoContracts();
};
window.setArgDomain = function (domain, el) {
  activeArgDomain = activeArgDomain === domain ? '' : domain;
  document.querySelectorAll('.arg-seg-btn').forEach(b => b.classList.remove('seg-btn-active'));
  if (activeArgDomain && el) el.classList.add('seg-btn-active');
  window.filterargentinaContracts();
};
window.setBrzDomain = function (domain, el) {
  activeBrzDomain = activeBrzDomain === domain ? '' : domain;
  document.querySelectorAll('.brz-seg-btn').forEach(b => b.classList.remove('seg-btn-active'));
  if (activeBrzDomain && el) el.classList.add('seg-btn-active');
  filterContractTable();
};

function processIncomingContracts(rawItems) {
  console.log("PROCESSING: Raw items received", rawItems?.length);
  // Verify domain from object keywords for the cross-matrix
  ALL_CONTRACTS = rawItems.map(c => {
    const obj = (c.obj || "").toLowerCase();
    let domain = "Other";
    if (obj.includes("ciment") || obj.includes("cimentaç")) domain = "Cementing";
    else if (obj.includes("estimul") || obj.includes("flexitubo") || obj.includes("acidiz") || obj.includes("fratur")) domain = "Stimulation";
    else if (obj.includes("fluidos") || obj.includes("fluid") || obj.includes("químic") || obj.includes("quimic") || obj.includes("produto quím")) domain = "Fluids";
    else if (obj.includes("complet") || obj.includes("dhsv") || obj.includes("completaç") || obj.includes("instalaç") && obj.includes("sistem")) domain = "Completion";
    else if (obj.includes("mpd") || obj.includes("pressure drilling") || obj.includes("gerenciamento de pressão")) domain = "MPD";
    else if (obj.includes("workover") || obj.includes("interven") || obj.includes("intervençã") || obj.includes("reentrada")) domain = "Workover";
    else if (obj.includes("constru") || obj.includes("perfur") || obj.includes("sondagem") || obj.includes("well construction")) domain = "Well Construction";
    else if (obj.includes("g&g") || obj.includes("geol") || obj.includes("sísmic") || obj.includes("sismic") || obj.includes("software") || obj.includes("licen")) domain = "G&G Software";

    // Re-calculating period and validation metadata for the validation
    const rawBrzValue = c.value || "—";
    const brzValue = convertContractValue(rawBrzValue, 'BRZ');
    const _rawUSD = parseFloat((rawBrzValue).replace(/[^0-9.]/g, '')) || 0;
    return {
      numero: c.numero || "—",
      domain: domain,
      obj: c.obj || "No description provided",
      value: brzValue,
      _rawUSD,
      country: 'BRZ',
      periodo: `${c.inicio?.split('/')[2] || '?'}–${c.fim?.split('/')[2] || '?'}`,
      proc: c.proc || "LICITAÇÃO",
      csbLink: getCSBLink(domain),
      score: getValidationScore(domain),
      scoreC: domain === "G&G Software" ? "#6b7280" : "#c0392b"
    };
  });

  // Sort contracts by Value (Descending) -> Date (Descending)
  ALL_CONTRACTS.sort((a, b) => {
    // Robust currency parser (handles R$ 1.500.000,00 or $ 1,500,000.00)
    const parseVal = (v) => {
      if (!v) return 0;
      const str = String(v);
      if (str.includes(',') && str.lastIndexOf(',') > str.lastIndexOf('.')) {
        return parseFloat(str.replace(/[^\d,-]/g, '').replace(',', '.')) || 0;
      }
      return parseFloat(str.replace(/[^\d.-]/g, '')) || 0;
    };

    const valDiff = parseVal(b.value) - parseVal(a.value);
    if (valDiff !== 0) return valDiff;

    // Secondary sort: most recent start date first
    // Expecting DD/MM/YYYY format
    const parseDate = (dstr) => {
      if (!dstr) return 0;
      const pts = String(dstr).split('/');
      if (pts.length === 3) return new Date(`${pts[2]}-${pts[1]}-${pts[0]}`).getTime();
      return 0;
    };

    // a.inicio is mapped to c.inicio in the raw item? Wait, the mapped object has `periodo`, not `inicio`.
    // Let's sort by periodo year (e.g. "2021-2025")
    const yearA = parseInt(a.periodo.split('–')[0]) || 0;
    const yearB = parseInt(b.periodo.split('–')[0]) || 0;
    return yearB - yearA;
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

function getValidationScore(domain) {
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


function renderContractTable(data) {
  const tbody = document.getElementById('contractEvidenceBody');
  if (!tbody) return;
  const start = (contractPage - 1) * CONTRACT_PAGE_SIZE;
  const slice = data.slice(start, start + CONTRACT_PAGE_SIZE);

  if (!slice.length) {
    tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;color:#8896ab;padding:24px">No contracts match the current filter</td></tr>`;
    return;
  }

  tbody.innerHTML = slice.map(c => {
    const domLabel = DOMAIN_MAP[c.domain] || c.domain;
    const yr1 = c.periodo ? c.periodo.split('–')[0] : '?';
    const yr2 = c.periodo ? c.periodo.split('–')[1] : '?';
    const period = yr1 === yr2 ? yr1 : `${yr1}–${yr2}`;
    return `<tr>
      <td style="font-family:monospace;font-size:11px;font-weight:700;color:var(--blue)">${c.numero}</td>
      <td><span style="font-size:11px;font-weight:700;color:var(--text)">${domLabel}</span></td>
      <td style="max-width:260px;font-size:11px;color:var(--text2);line-height:1.5;">${c.obj.substring(0, 130)}${c.obj.length > 130 ? '…' : ''}</td>
      <td style="font-size:11px;color:var(--text3);white-space:nowrap;">${period}</td>
      <td style="font-weight:700;color:var(--text);white-space:nowrap;">${fmtUSD(contractToUSD(c))}</td>
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

let _brzSortKey = 'date';
let _brzSortDir = -1;

window.sortBrzContracts = function(key) {
  if (_brzSortKey === key) { _brzSortDir *= -1; }
  else { _brzSortKey = key; _brzSortDir = -1; }
  document.getElementById('sort-brz-date').textContent = _brzSortKey === 'date' ? (_brzSortDir === -1 ? '↓' : '↑') : '↕';
  document.getElementById('sort-brz-value').textContent = _brzSortKey === 'value' ? (_brzSortDir === -1 ? '↓' : '↑') : '↕';
  window.filterContractTable();
};

window.filterContractTable = function () {
  const q = (document.getElementById('contractSearch')?.value || '').toLowerCase();
  const domain = activeBrzDomain.toLowerCase();
  filteredContracts = ALL_CONTRACTS
    .filter(c => {
      const matchDomain = !domain || c.domain.toLowerCase().includes(domain) || c.obj.toLowerCase().includes(domain);
      const matchQ = !q || [c.numero, c.domain, c.obj, c.value, c.proc].join(' ').toLowerCase().includes(q);
      const valMatch = !brzValMin || contractToUSD(c) >= brzValMin;
      return matchDomain && matchQ && valMatch;
    });

  const dir = _brzSortDir;
  if (_brzSortKey === 'date') {
    filteredContracts.sort((a, b) => dir * ((a.inicioSort || 0) - (b.inicioSort || 0)));
  } else if (_brzSortKey === 'value') {
    filteredContracts.sort((a, b) => dir * (contractToUSD(a) - contractToUSD(b)));
  }

  contractPage = 1;
  renderContractTable(filteredContracts);
};

function renderContractMethodChart() {
  destroyChart('contractMethodChart');
  const ctx = document.getElementById('contractMethodChart');
  if(!ctx) return;
  
  const labels = Object.keys(ALL_CONTRACTS.byDomain);
  const data = Object.values(ALL_CONTRACTS.byDomain).map(arr => arr.length);
  
  chartInstances['contractMethodChart'] = new Chart(ctx.getContext('2d'), {
    type: 'doughnut',
    data: {
      labels: labels,
      datasets: [{
        data: data,
        backgroundColor: ['#3b82f6','#7c3aed','#f59e0b','#10b981','#ef4444','#6366f1','#8b5cf6','#ec4899','#f97316'],
      }]
    },
    options: {
      responsive: true, maintainAspectRatio: true, cutout: '70%',
      plugins: { legend: { position: 'bottom', labels: { boxWidth: 10, font: { size: 10 } } } }
    }
  });
}

function renderNorwayContractDomainChart() {
  destroyChart('norwayContractDomainChart');
  const ctx = document.getElementById('norwayContractDomainChart');
  if(!ctx) return;
  
  const counts = {};
  norwayContracts.forEach(c => {
    const d = c.domain || 'Unmapped';
    counts[d] = (counts[d] || 0) + 1;
  });
  
  const labels = Object.keys(counts);
  const data = Object.values(counts);
  
  chartInstances['norwayContractDomainChart'] = new Chart(ctx.getContext('2d'), {
    type: 'doughnut',
    data: {
      labels: labels,
      datasets: [{
        data: data,
        backgroundColor: ['#1d4ed8','#7c3aed','#f59e0b','#10b981','#ef4444','#6366f1','#8b5cf6'],
      }]
    },
    options: {
      responsive: true, maintainAspectRatio: true, cutout: '70%',
      plugins: { legend: { position: 'bottom', labels: { boxWidth: 10, font: { size: 10 } } } }
    }
  });
}

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
  if (link.dataset.section === 'argentina' || link.dataset.section === 'argentina-crossanalysis') {
    link.addEventListener('click', () => {
      setTimeout(() => renderArgTemporalOverlapChart(), 60);
    });
  }
  if (link.dataset.section === 'mexico' || link.dataset.section === 'mexico-crossanalysis') {
    link.addEventListener('click', () => {
      setTimeout(() => renderMexTemporalOverlapChart(), 60);
    });
  }
  if (link.dataset.section === 'mexico-registry') {
    link.addEventListener('click', () => {
      setTimeout(() => loadMexRegistry(1), 60);
    });
  }
  if (link.dataset.section === 'norway-audit') {
    link.addEventListener('click', () => {
      setTimeout(() => {
        if (typeof renderNorwayRNNPChart === 'function') renderNorwayRNNPChart();
      }, 100);
    });
  }
  if (link.dataset.section === 'norway-crossanalysis') {
    link.addEventListener('click', () => {
      setTimeout(() => {
        if (typeof renderNorwayCrossTable === 'function') renderNorwayCrossTable();
        if (typeof renderNorwayTemporalOverlapChart === 'function') renderNorwayTemporalOverlapChart();
        if (typeof renderNorwayContractDomainChart === 'function') renderNorwayContractDomainChart();
      }, 100);
    });
  }
});

function renderArgTemporalOverlapChart() {
  destroyChart('argTemporalOverlapChart');
  const ctx = document.getElementById('argTemporalOverlapChart');
  if (!ctx) return;

  const years = [2015, 2016, 2017, 2018, 2019, 2020, 2021, 2022, 2023, 2024, 2025, 2026];
  // SESCO Adjunto IV fracking jobs per year (from ARG_TREND)
  const fracJobs = [344, 266, 293, 349, 321, 118, 353, 426, 420, 354, 383, 15];
  // Contract activity bands (1 = active)
  const fracturing = [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1];
  const cementing = [0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1];
  const directional = [0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 1, 1];
  const completion = [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1];

  chartInstances['argTemporalOverlapChart'] = new Chart(ctx.getContext('2d'), {
    type: 'bar',
    data: {
      labels: years,
      datasets: [
        {
          label: 'SESCO Fracking Jobs', data: fracJobs, type: 'line',
          borderColor: '#16a34a', backgroundColor: 'rgba(22,163,74,0.12)',
          fill: true, tension: 0.4, pointRadius: 4, pointBackgroundColor: '#16a34a',
          yAxisID: 'y', order: 0
        },
        { label: 'Hydraulic Fracturing', data: fracturing.map(v => v * 20), backgroundColor: 'rgba(239,68,68,0.55)', yAxisID: 'y2', order: 1 },
        { label: 'Cementing', data: cementing.map(v => v * 16), backgroundColor: 'rgba(59,130,246,0.55)', yAxisID: 'y2', order: 1 },
        { label: 'Directional Drilling', data: directional.map(v => v * 12), backgroundColor: 'rgba(139,92,246,0.55)', yAxisID: 'y2', order: 1 },
        { label: 'Completion / DHSV', data: completion.map(v => v * 8), backgroundColor: 'rgba(245,158,11,0.55)', yAxisID: 'y2', order: 1 },
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
          position: 'left', title: { display: true, text: 'SESCO Fracking Jobs', color: '#16a34a', font: { size: 10 } },
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

function renderNorwayTemporalOverlapChart() {
  destroyChart('norwayTemporalOverlapChart');
  const ctx = document.getElementById('norwayTemporalOverlapChart');
  if (!ctx) return;

  const years = [2015, 2016, 2017, 2018, 2019, 2020, 2021, 2022, 2023, 2024, 2025, 2026];
  // RNNP total defects index
  const defects = [420, 440, 415, 455, 430, 445, 420, 455, 410, 395, 385, 20];
  
  // Contract activity bands (1 = active) for Contractor Norway
  const cementing   = [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1];
  const completion  = [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1];
  const mpd         = [0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1];
  const baroid      = [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1];

  chartInstances['norwayTemporalOverlapChart'] = new Chart(ctx.getContext('2d'), {
    type: 'bar',
    data: {
      labels: years,
      datasets: [
        {
          label: 'RNNP Barrier Defect Trend', data: defects, type: 'line',
          borderColor: '#1d4ed8', backgroundColor: 'rgba(29,78,216,0.12)',
          fill: true, tension: 0.4, pointRadius: 4, pointBackgroundColor: '#1d4ed8',
          yAxisID: 'y', order: 0
        },
        { label: 'Cementing Contracts', data: cementing.map(v => v * 20),   backgroundColor: 'rgba(59,130,246,0.55)',  yAxisID: 'y2', order: 1 },
        { label: 'Completion / DHSV',  data: completion.map(v => v * 16),  backgroundColor: 'rgba(139,92,246,0.55)', yAxisID: 'y2', order: 1 },
        { label: 'MPD / Managed Press.', data: mpd.map(v => v * 12),       backgroundColor: 'rgba(245,158,11,0.55)', yAxisID: 'y2', order: 1 },
        { label: 'Baroid (Fluids)',    data: baroid.map(v => v * 8),       backgroundColor: 'rgba(239,68,68,0.55)',   yAxisID: 'y2', order: 1 },
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
          position: 'left', title: { display: true, text: 'Barrier Defects Index (PSA)', color: '#1d4ed8', font: { size: 10 } },
          ticks: { color: '#4a5568', font: { size: 10 } }, grid: { color: '#dde3ee' }, beginAtZero: true
        },
        y2: {
          position: 'right', title: { display: true, text: 'Active NCS Portfolios', color: '#6b7280', font: { size: 10 } },
          stacked: true, ticks: { display: false }, grid: { display: false }, beginAtZero: true
        },
      }
    }
  });
}

function renderMexTemporalOverlapChart() {
  destroyChart('mexTemporalOverlapChart');
  const ctx = document.getElementById('mexTemporalOverlapChart');
  if (!ctx) return;

  const years = [2015, 2016, 2017, 2018, 2019, 2020, 2021, 2022, 2023, 2024, 2025];
  // SIH Perforación jobs per year (from MEX_TREND)
  const drillingJobs = [108, 115, 102, 104, 104, 124, 133, 115, 118, 113, 109];
  // Contract activity bands (1 = active)
  const fracturing = [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1];
  const cementing = [0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 1];
  const directional = [0, 0, 0, 0, 1, 1, 1, 1, 1, 1, 1];
  const completion = [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1];

  chartInstances['mexTemporalOverlapChart'] = new Chart(ctx.getContext('2d'), {
    type: 'bar',
    data: {
      labels: years,
      datasets: [
        {
          label: 'SIH Drilling Jobs', data: drillingJobs, type: 'line',
          borderColor: '#6366f1', backgroundColor: 'rgba(99,102,241,0.12)',
          fill: true, tension: 0.4, pointRadius: 4, pointBackgroundColor: '#6366f1',
          yAxisID: 'y', order: 0
        },
        { label: 'Hydraulic Fracturing', data: fracturing.map(v => v * 20), backgroundColor: 'rgba(239,68,68,0.55)', yAxisID: 'y2', order: 1 },
        { label: 'Cementing & Well Const.', data: cementing.map(v => v * 16), backgroundColor: 'rgba(59,130,246,0.55)', yAxisID: 'y2', order: 1 },
        { label: 'Directional Drilling', data: directional.map(v => v * 12), backgroundColor: 'rgba(139,92,246,0.55)', yAxisID: 'y2', order: 1 },
        { label: 'Completion / DHSV', data: completion.map(v => v * 8), backgroundColor: 'rgba(245,158,11,0.55)', yAxisID: 'y2', order: 1 },
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
          position: 'left', title: { display: true, text: 'SIH Drilling Jobs', color: '#6366f1', font: { size: 10 } },
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
window.filterArgRegistry = function () {
  const q = (document.getElementById('argSearchInput')?.value || '').toLowerCase();
  const basin = (document.getElementById('argBasinFilter')?.value || '').toLowerCase();
  const tier = (document.getElementById('argTierFilter')?.value || '').toUpperCase();

  const filtered = ARG_OPERATORS.filter(o => {
    const matchQ = !q || o.op.toLowerCase().includes(q) || o.basin.toLowerCase().includes(q);
    const matchBasin = !basin || o.basin.toLowerCase() === basin;
    const matchTier = !tier || o.tier === tier;
    return matchQ && matchBasin && matchTier;
  });

  renderArgRegistryTable(filtered);
};

function renderArgRegistryTable(data) {
  const tbody = document.getElementById('argRegBody');
  const countEl = document.getElementById('argTableCount');
  if (!tbody) return;

  if (!data.length) {
    tbody.innerHTML = `<tr><td colspan="7" style="text-align:center;color:#8896ab;padding:24px">No records match the current filter</td></tr>`;
    if (countEl) countEl.innerHTML = '0 records';
    return;
  }

  tbody.innerHTML = data.map(r => {
    const ts = TIER_STYLES[r.tier] || TIER_STYLES.LOW;
    const badge = `<span style="font-size:10px;font-weight:700;background:${ts.bg};color:${ts.color};border:1px solid ${ts.border};padding:2px 7px;border-radius:20px;">${r.tier}</span>`;
    return `<tr>
      <td style="font-weight:600;font-size:12px;color:var(--text);">${r.op}</td>
      <td style="font-size:12px;color:var(--text2);">${r.basin}</td>
      <td style="font-size:12px;font-weight:600;">${r.jobs.toLocaleString()}</td>
      <td style="font-size:12px;">${r.stages.toLocaleString()}</td>
      <td style="font-size:12px;">${r.psi.toLocaleString()}</td>
      <td>${badge}</td>
      <td style="font-size:11px;color:var(--text3);">Res. SE 25/2004</td>
    </tr>`;
  }).join('');

  if (countEl) countEl.innerHTML = `${data.length} records`;
}

function renderMexDynamicStats(summary) {
  const totJobs = document.getElementById('mexMetricTotalJobs');
  const totOps = document.getElementById('mexMetricTotalOps');
  const totBasins = document.getElementById('mexMetricTotalBasins');

  if (summary && summary.operators) {
    const opsCount = Object.keys(summary.operators).length;
    if (totOps) totOps.textContent = opsCount;
    if (totJobs) {
      const total = Object.values(summary.operators).reduce((a, b) => a + b, 0);
      totJobs.textContent = total.toLocaleString();
    }
    // Count unique basins in mexicoStore
    const basins = new Set(mexicoStore.map(m => (m.cuenca || '').toUpperCase()).filter(Boolean));
    if (totBasins) totBasins.textContent = basins.size;
  }
}

window.goMexPage = function (p) {
  mexRegPage = p;
  const q = (document.getElementById('mexSearchInput')?.value || '').toLowerCase();
  const basin = (document.getElementById('mexBasinFilter')?.value || '').toUpperCase();

  fMexStore = mexicoStore.filter(r => {
    const matchQ = !q || [r.id_pozo, r.operador, r.cuenca, r.formacion].join(' ').toLowerCase().includes(q);
    const matchBasin = !basin || (r.cuenca || '').toUpperCase() === basin;
    return matchQ && matchBasin;
  });

  renderMexRegistryTable(fMexStore);
};

function renderMexRegistryTable(data) {
  const tbody = document.getElementById('mexRegBody');
  const countEl = document.getElementById('mexTableCount');
  const paginationEl = document.getElementById('mexRegPagination');
  if (!tbody) return;

  if (countEl) countEl.innerHTML = `${data.length.toLocaleString()} records`;

  if (!data.length) {
    tbody.innerHTML = `<tr><td colspan="7" style="text-align:center;color:#8896ab;padding:24px">No records match the current filter</td></tr>`;
    if (paginationEl) paginationEl.innerHTML = "";
    return;
  }

  const start = (mexRegPage - 1) * mexRegLimit;
  const slice = data.slice(start, start + mexRegLimit);
  const totalPages = Math.ceil(data.length / mexRegLimit);

  tbody.innerHTML = slice.map(r => {
    return `<tr>
      <td style="font-family:monospace;font-weight:700;color:var(--blue);font-size:11px;">${r.id_pozo || '—'}</td>
      <td style="font-weight:600;font-size:11px;color:var(--text);">${r.operador || '—'}</td>
      <td style="font-size:11px;color:var(--text2);">${r.cuenca || '—'}</td>
      <td style="font-size:11px;font-weight:600;">${r.etapas_fractura || '0'}</td>
      <td style="font-size:11px;">${(parseInt(r.presion_max_psi) || 0).toLocaleString()}</td>
      <td style="font-size:11px;">${(parseInt(r.longitud_lateral_m) || 0).toLocaleString()}</td>
    </tr>`;
  }).join('');

  // Pagination
  if (paginationEl) {
    if (totalPages <= 1) {
      paginationEl.innerHTML = "";
    } else {
      paginationEl.innerHTML = `
        <button onclick="goMexPage(${mexRegPage - 1})" ${mexRegPage === 1 ? 'disabled' : ''} class="pg-btn">Prev</button>
        <span style="font-size:12px;font-weight:600;color:#64748b;margin:0 10px;">Page ${mexRegPage} of ${totalPages}</span>
        <button onclick="goMexPage(${mexRegPage + 1})" ${mexRegPage === totalPages ? 'disabled' : ''} class="pg-btn">Next</button>
      `;
    }
  }
}

// Ensure the tables map their data on init
// Ensure the tables map their data on init
document.addEventListener('DOMContentLoaded', () => {
  renderArgRegistryTable(ARG_OPERATORS);
  // renderMexRegistryTable(MEX_OPERATORS); // Now handled by goMexPage(1) in init()
});
// ── Penalty Analytics Charts ──────────────────────────────────────────────────
function renderPenaltyCharts() {
  destroyChart('penaltyQuarterlyChart');
  destroyChart('penaltyChunksChart');

  const qCtx = document.getElementById('penaltyQuarterlyChart');
  const cCtx = document.getElementById('penaltyChunksChart');
  if (!qCtx || !cCtx) return;

  // Quarterly Trend
  chartInstances['penaltyQuarterlyChart'] = new Chart(qCtx.getContext('2d'), {
    type: 'line',
    data: {
      labels: ['2025 Q1', '2025 Q2', '2025 Q3', '2025 Q4', '2026 Q1'],
      datasets: [{
        label: 'Est. Quarterly Exposure (M R$)',
        data: [28.4, 32.1, 29.8, 35.6, 16.5],
        borderColor: '#059669',
        backgroundColor: 'rgba(5, 150, 105, 0.1)',
        fill: true,
        tension: 0.4,
        borderWidth: 3,
        pointRadius: 5,
        pointBackgroundColor: '#059669'
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false }, tooltip: { mode: 'index', intersect: false } },
      scales: {
        y: { beginAtZero: true, grid: { color: '#f1f5f9' }, ticks: { font: { size: 10 }, color: '#64748b' } },
        x: { grid: { display: false }, ticks: { font: { size: 10 }, color: '#64748b' } }
      }
    }
  });

  // Magnitude Chunks
  chartInstances['penaltyChunksChart'] = new Chart(cCtx.getContext('2d'), {
    type: 'bar',
    data: {
      labels: ['Minor (<R$2M)', 'Mid (R$2M-5M)', 'Elite (R$5M-15M)', 'Catastrophic (>15M)'],
      datasets: [{
        label: 'Incident Count',
        data: [842, 451, 158, 31],
        backgroundColor: ['#10b981', '#f59e0b', '#ef4444', '#7f1d1d'],
        borderRadius: 6,
      }]
    },
    options: {
      indexAxis: 'y',
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        x: { grid: { color: '#f1f5f9' }, ticks: { font: { size: 10 }, color: '#64748b' } },
        y: { grid: { display: false }, ticks: { font: { size: 10 }, color: '#64748b' } }
      }
    }
  });
}

// ── Norway Wellbore Registry (Consolidated) ───────────────────────────────────
let norPage = 1;
const NOR_LIMIT = 50;

window.loadNorwayRegistry = async function(p = 1) {
  norPage = p;
  const q      = (document.getElementById('norSearchInput')?.value || '').trim().toLowerCase();
  const type   = document.getElementById('norTypeFilter')?.value || '';
  const status = document.getElementById('norStatusFilter')?.value || '';

  const tbody   = document.getElementById('norTableBody');
  const countEl = document.getElementById('norTableCount');
  const pagEl    = document.getElementById('norPagination');
  const cachedEl = document.getElementById('norCachedAt');

  if (!tbody) return;
  tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;padding:40px;color:var(--text3);background:#fff;">Fetching official Sodir FactPages (NLOD)…</td></tr>';

  try {
    const params = new URLSearchParams({ page: norPage, limit: NOR_LIMIT, q, type, status });
    const res = await fetch(`/api/sodir/wellbores?${params}`);
    const data = await res.json();

    if (data.items && data.items.length) {
      tbody.innerHTML = data.items.map(w => `
        <tr>
          <td style="font-weight:700;color:var(--blue);font-family:var(--font-mono);font-size:11px;">${w.wlbName}</td>
          <td style="font-weight:600;font-size:11px;">${w.wlbField || '—'}</td>
          <td style="font-size:11px;">${w.wlbOperator}</td>
          <td><span class="ai-tag" style="--t-c:var(--blue);font-size:10px;">${w.wlbWellType}</span></td>
          <td style="font-size:10px;text-transform:uppercase;letter-spacing:0.5px;">${w.wlbStatus}</td>
          <td style="text-align:right;">${w.wlbYear}</td>
          <td style="text-align:right;font-weight:700;">${w.wlbTotalDepth ? w.wlbTotalDepth.toLocaleString() : '—'} m</td>
        </tr>
      `).join('');
      if (countEl) countEl.textContent = `Showing ${data.items.length} of ${data.total.toLocaleString()} records`;
      if (cachedEl && data.cachedAt) {
        cachedEl.textContent = `Source: Sodir FactMaps ArcGIS Service · Updated: ${data.cachedAt.split('T')[0]}`;
      } else if (cachedEl) {
        cachedEl.textContent = 'Source: Sodir FactMaps ArcGIS Service (Live)';
      }

      if (pagEl && data.pages > 1) {
        pagEl.innerHTML = `
          <button onclick="loadNorwayRegistry(${norPage - 1})" ${norPage === 1 ? 'disabled' : ''} class="pg-btn">Prev</button>
          <span style="font-size:12px;font-weight:700;color:#64748b;margin:0 12px;">Page ${norPage} of ${data.pages}</span>
          <button onclick="loadNorwayRegistry(${norPage + 1})" ${norPage === data.pages ? 'disabled' : ''} class="pg-btn">Next</button>
        `;
      } else if (pagEl) pagEl.innerHTML = '';
    } else {
      tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;padding:40px;color:var(--text3);background:#fff;">No wellbores found matching filters.</td></tr>';
      if (countEl) countEl.textContent = '0 records';
    }
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="7" style="text-align:center;padding:40px;color:#ef4444;background:#fff;">Error: ${err.message}</td></tr>`;
  }
}



function renderNorwayCrossTable() {
  const tbody = document.getElementById('norCrossTableBody');
  if (!tbody) return;

  // Use precomputed fields and regulations
  const fields = (NOR_FIELDS || []).slice(0, 10);
  const regs = NOR_REGULATIONS || [];

  if (fields.length === 0) {
    tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;padding:20px;color:#64748b;">Awaiting Sodir FactMap Ingestion…</td></tr>';
    return;
  }

  tbody.innerHTML = fields.map((f, i) => {
    const reg = regs[i % regs.length];
    const regName = (reg && reg.reg) ? reg.reg.split('(')[0] : 'Regulation Pending';
    const link = (reg && reg.link) ? reg.link : '#';
    const service = (NOR_HAL_OVERLAP[i % NOR_HAL_OVERLAP.length] || {}).halService || 'Contractor Service Line';
    
    return `
      <tr>
        <td style="font-weight:700;color:var(--blue);font-size:12px;">${f.field || 'Global NCS'}</td>
        <td style="font-size:11px;font-weight:600;">Main NCS Operator</td>
        <td style="font-size:11px;color:var(--text2);">${service}</td>
        <td style="font-size:11px;"><span style="font-weight:700;color:#c0392b;">${regName}</span></td>
        <td><a href="${link}" target="_blank" rel="noopener" class="reg-link" style="color:var(--blue);font-weight:700;font-size:11px;">Lovedata ↗</a></td>
      </tr>
    `;
  }).join('');
}

// ── Mexico Compact Data Ingestion ───────────────────────────────────────────
let MEXICO_COMPACT_POZOS = [];

async function loadMexicoCompactData() {
  try {
    const res = await fetch('/api/data/processed/mexico_pozos_compact.json');
    if (!res.ok) throw new Error("Could not find compact data");
    const json = await res.json();
    
    // Map Columns+Rows back to objects for the existing UI logic
    MEXICO_COMPACT_POZOS = json.rows.map(row => {
        const obj = {};
        json.columns.forEach((col, i) => obj[col] = row[i]);
        
        // Map to expected UI keys
        return {
            id_pozo: obj.well,
            operador: "CNH / PEMEX", // Logic or lookup if needed
            cuenca: obj.basin,
            etapas_fractura: "—",
            presion_max_psi: 0,
            longitud_lateral_m: 0
        };
    });
    
    // Auto-update specific components
    const countEl = document.getElementById('mexTableCount');
    if (countEl) countEl.innerHTML = `${MEXICO_COMPACT_POZOS.length.toLocaleString()} records`;
    
    // Render first page
    if (typeof renderMexicoRegistry === 'function') renderMexicoRegistry(MEXICO_COMPACT_POZOS);
  } catch (e) {
    console.warn("Mexico Compact Data Load fail:", e);
  }
}

function renderNorwayRNNPChart() {
  const canvas = document.getElementById('norwayRNNPChart');
  if (!canvas) {
    console.error("NORWAY: norwayRNNPChart canvas not found");
    return;
  }
  
  // Update KPIs from live API
  const wlbKpi = document.getElementById('nor-kpi-wellbores');
  fetch('/api/sodir/wellbores?limit=1')
    .then(r => r.json())
    .then(data => {
      if (wlbKpi && data.total) wlbKpi.textContent = data.total.toLocaleString();
    })
    .catch(e => console.warn("NORWAY: Failed to fetch live KPI", e));

  destroyChart('norwayRNNPChart');

  // Havtil RNNP Data (2013-2024 Actual, 2025-2026 Forecast/Estimates)
  const years = [2013, 2014, 2015, 2016, 2017, 2018, 2019, 2020, 2021, 2022, 2023, 2024, 2025, 2026];
  const barrierDefects = [390, 405, 418, 442, 460, 448, 431, 412, 427, 438, 450, 447, 442, 445];
  const hcReleases = [72, 69, 65, 71, 68, 64, 58, 55, 61, 63, 62, 59, 58, 56]; 

  // Inject 2025 actuals if available
  if (typeof norStats !== 'undefined') {
    hcReleases[12] = norStats.hcReleases_2025;
    // Barrier defects estimate for 2025 (extrapolated from RNNP scan)
    barrierDefects[12] = 442; 
  }

  const ctx = canvas.getContext('2d');
  chartInstances['norwayRNNPChart'] = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: years,
      datasets: [
        {
          label: 'Well Barrier Defects (RNNP)',
          data: barrierDefects,
          backgroundColor: 'rgba(0, 61, 153, 0.7)',
          borderColor: '#003d99',
          borderWidth: 1.5,
          borderRadius: 4,
          yAxisID: 'y',
        },
        {
          label: 'HC Releases ≥0.1 kg/s',
          data: hcReleases,
          type: 'line',
          borderColor: '#c0392b',
          backgroundColor: 'rgba(192, 57, 43, 0.1)',
          fill: true,
          tension: 0.4,
          pointRadius: 4,
          pointBackgroundColor: '#c0392b',
          yAxisID: 'y2',
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false },
      plugins: {
        legend: { position: 'top', labels: { color: '#4a5568', font: { size: 10, weight: '600' }, boxWidth: 12, padding: 15 } },
        tooltip: { backgroundColor: 'rgba(15, 23, 42, 0.95)', titleFont: { size: 12 }, bodyFont: { size: 11 }, padding: 10 }
      },
      scales: {
        x: { ticks: { color: '#64748b', font: { size: 10 } }, grid: { display: false } },
        y: {
          position: 'left',
          title: { display: true, text: 'Barrier Defects Count', color: '#003d99', font: { size: 10, weight: '700' } },
          ticks: { color: '#64748b', font: { size: 10 } },
          grid: { color: '#f1f5f9' },
          beginAtZero: false
        },
        y2: {
          position: 'right',
          title: { display: true, text: 'HC Releases Count', color: '#c0392b', font: { size: 10, weight: '700' } },
          ticks: { color: '#64748b', font: { size: 10 } },
          grid: { display: false },
          beginAtZero: false
        }
      }
    }
  });
}

document.addEventListener('DOMContentLoaded', () => {
    const navNorReg = document.getElementById('nav-norway-registry');
    if(navNorReg) navNorReg.addEventListener('click', () => loadNorwayRegistry(1));

    const navMexReg = document.getElementById('nav-mexico-registry');
    if(navMexReg) navMexReg.addEventListener('click', () => loadMexRegistry(1));
});

// ── MEX Operating Risk Registry ──────────────────────────────────────────────
// Source: CNH SIH Perforación · api/data/mexico_perforacion.csv · 1,245 records
// Endpoint: GET /api/mexico-perforacion?page=N&limit=50&q=&basin=

let _mexPage = 1;
let _mexTotal = 0;

async function loadMexRegistry(page) {
  _mexPage = page || 1;
  const q     = (document.getElementById('mexSearchInput')?.value || '').trim();
  const basin = document.getElementById('mexBasinFilter')?.value || '';

  const params = new URLSearchParams({ page: _mexPage, limit: 50 });
  if (q)     params.set('q', q);
  if (basin) params.set('basin', basin);

  const countEl = document.getElementById('mexTableCount');
  if (countEl) countEl.textContent = 'Loading…';

  try {
    const res  = await fetch('/api/mexico-perforacion?' + params.toString());
    const data = await res.json();

    _mexTotal = data.total || 0;

    // Update header stats
    const totalEl = document.getElementById('mexMetricTotalJobs');
    if (totalEl && !q && !basin) totalEl.textContent = _mexTotal.toLocaleString();

    if (countEl) countEl.textContent = _mexTotal.toLocaleString() + ' records';

    const body = document.getElementById('mexRegBody');
    if (body) {
      if (!data.items || data.items.length === 0) {
        body.innerHTML = '<tr><td colspan="6" style="text-align:center;padding:32px;color:#94a3b8;">No records found</td></tr>';
      } else {
        const BASIN_COLOR = {
          'SURESTE': '#0369a1', 'BURGOS': '#7c3aed',
          'VERACRUZ': '#0f766e', 'TAMPICO-MISANTLA': '#b45309',
        };
        body.innerHTML = data.items.map((r, i) => {
          const bc = BASIN_COLOR[r.cuenca?.toUpperCase()] || '#64748b';
          const hpht = r.presion_max_psi > 11000;
          const deepLat = r.longitud_lateral_m > 2000;
          return `<tr style="${i % 2 === 0 ? 'background:#f8fafc;' : ''}">
            <td style="font-size:11px;font-weight:700;font-family:monospace;">${r.id_pozo || '—'}</td>
            <td style="font-size:11px;">${r.operador || '—'}</td>
            <td><span style="font-size:10px;font-weight:700;padding:2px 7px;border-radius:4px;background:${bc}22;color:${bc};">${r.cuenca || '—'}</span></td>
            <td style="text-align:right;font-weight:600;">${r.etapas_fractura != null ? r.etapas_fractura : '—'}</td>
            <td style="text-align:right;${hpht ? 'color:#dc2626;font-weight:700;' : ''}">${r.presion_max_psi != null ? Number(r.presion_max_psi).toLocaleString() : '—'}</td>
            <td style="text-align:right;${deepLat ? 'color:#7c3aed;font-weight:700;' : ''}">${r.longitud_lateral_m != null ? Number(r.longitud_lateral_m).toLocaleString() : '—'}</td>
          </tr>`;
        }).join('');
      }
    }

    renderMexPagination(data.page, data.pages);
  } catch(e) {
    const body = document.getElementById('mexRegBody');
    if (body) body.innerHTML = `<tr><td colspan="6" style="text-align:center;padding:32px;color:#ef4444;">API error: ${e.message}</td></tr>`;
    if (countEl) countEl.textContent = 'Error';
  }
}

function goMexPage(page) {
  loadMexRegistry(page);
}

function renderMexPagination(current, total) {
  const el = document.getElementById('mexRegPagination');
  if (!el || total <= 1) { if(el) el.innerHTML = ''; return; }
  const pages = [];
  if (current > 1) pages.push(`<button class="page-btn" onclick="goMexPage(${current-1})">‹ Prev</button>`);
  const start = Math.max(1, current - 2);
  const end   = Math.min(total, current + 2);
  for (let p = start; p <= end; p++) {
    pages.push(`<button class="page-btn${p === current ? ' active' : ''}" onclick="goMexPage(${p})">${p}</button>`);
  }
  if (current < total) pages.push(`<button class="page-btn" onclick="goMexPage(${current+1})">Next ›</button>`);
  el.innerHTML = `<div style="display:flex;gap:4px;align-items:center;padding:12px 20px;">
    <span style="font-size:11px;color:#64748b;margin-right:8px;">Page ${current} of ${total} · ${_mexTotal.toLocaleString()} records</span>
    ${pages.join('')}
  </div>`;
}
