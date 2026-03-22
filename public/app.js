const JUSTIFICATION_TEXT = `"The failure modes identified in this analysis are documented in the ANP's public E&P incident database (SISO-Incidentes, 30,054 records, 2013–2026 — available at dados.gov.br/organization/anp under Lei de Acesso a Informacao, Lei no 12.527/2011). CSB barrier element failures rose from 1 incident in 2016 to 391 in 2025, representing the dominant well integrity risk category in Brazilian E&P. Since Halliburton and Tejas operate as service companies on installations licensed to ANP operators, their equipment and services fall within the barrier systems captured by these statistics, making compliance with Resolucao ANP no 46/2016 (SGIP) and Bureau Veritas NR 445 directly and mandatorily applicable."`;

document.getElementById("justification-text").textContent = JUSTIFICATION_TEXT;

async function loadData() {
  try {
    const res = await fetch("/api/data");
    const data = await res.json();
    renderMetrics(data.metrics);
    renderTrends(data.trends);
    renderIncidents(data.incidents);
    renderRegulations(data.regulations);
    renderSources(data.sources);
  } catch (err) {
    console.error("Failed to load data:", err);
    // Fallback to inline data
    renderMetrics([
      { label: "Total incidents (dataset)", value: "30,054", color: "1F4E79" },
      { label: "Well integrity incidents", value: "2,291", color: "C00000" },
      { label: "CSB failures (2023–26)", value: "762", color: "C55A11" },
      { label: "Kicks reported (primary barrier)", value: "193", color: "375623" },
    ]);
    renderTrends([]);
    renderIncidents([]);
    renderRegulations([]);
    renderSources({});
  }
}

function renderMetrics(metrics) {
  const grid = document.getElementById("metrics-grid");
  if (!metrics || !metrics.length) return;

  const colorClass = (color) => {
    if (color === "C00000") return "metric-card--critical";
    if (color === "C55A11") return "metric-card--warning";
    return "";
  };

  grid.innerHTML = metrics
    .map(
      (m) => `
    <div class="metric-card ${colorClass(m.color)}">
      <div class="metric-value">${m.value}</div>
      <div class="metric-label">${m.label}</div>
    </div>
  `
    )
    .join("");
}

function renderTrends(trends) {
  const tbody = document.getElementById("trend-body");
  if (!trends || !trends.length) {
    const rows = [
      ["2013","5","0","0","0"],
      ["2014","7","0","1","0"],
      ["2015","18","0","0","0"],
      ["2016","13","1","5","0"],
      ["2017","6","8","2","0"],
      ["2018","20","12","2","1"],
      ["2019","7","5","0","1"],
      ["2020","5","30","0","0"],
      ["2021","0","485","0","0"],
      ["2022","6","395","0","0"],
      ["2023","12","255","7","3"],
      ["2024","32","326","4","4"],
      ["2025","31","391","3","0"],
      ["2026*","1","45","0","0"],
    ];
    tbody.innerHTML = rows
      .map(
        (r, i) => `
      <tr class="${parseInt(r[2]) > 100 ? "highlight" : ""}">
        <td>${r[0]}</td>
        <td class="num">${r[1]}</td>
        <td class="num ${parseInt(r[2]) > 100 ? "high" : ""}">${r[2]}</td>
        <td class="num">${r[3]}</td>
        <td class="num">${r[4]}</td>
      </tr>
    `
      )
      .join("");
    return;
  }

  tbody.innerHTML = trends
    .map(
      (t) => `
    <tr class="${t.highlight ? "highlight" : ""}">
      <td>${t.year}</td>
      <td class="num">${t.kicks}</td>
      <td class="num ${t.highlight ? "high" : ""}">${t.csb}</td>
      <td class="num">${t.structural}</td>
      <td class="num">${t.loss}</td>
    </tr>
  `
    )
    .join("");
}

function renderIncidents(incidents) {
  const tbody = document.getElementById("incident-body");
  if (!incidents || !incidents.length) {
    const data = [
      { no: "1307/000033", operator: "Petrobras", date: "09-07-2013", type: "Kick – primary barrier failure", description: "Volume gain of 1.4 bbl in trip tank during flowcheck. Possible formation influx in well 1-CES-161." },
      { no: "1309/000323", operator: "Petrobras", date: "21-09-2013", type: "Kick – primary barrier failure", description: "Dynamic and static flowcheck during string pullout detected volume gain. Well closed; pressure increase observed." },
      { no: "1310/000182", operator: "Petrobras", date: "09-10-2013", type: "Kick – primary barrier failure", description: "Gas kick during drilling at 2,460 m." },
      { no: "1311/000015", operator: "Petrobras", date: "09-01-2013", type: "Kick – primary barrier failure", description: "Return of oil and gas detected during circulation before resuming 8.5-inch phase drilling." },
      { no: "1309/000264", operator: "OGX Petróleo", date: "N/A", type: "Kick – primary barrier failure", description: "Kick during drilling of phase V with 8.5-inch bit at 6,135 m." },
    ];
    incidents = data;
  }

  tbody.innerHTML = incidents
    .map(
      (i) => `
    <tr>
      <td><code>${i.no}</code></td>
      <td>${i.operator}</td>
      <td>${i.date}</td>
      <td>${i.type}</td>
      <td>${i.description}</td>
    </tr>
  `
    )
    .join("");
}

function renderRegulations(regulations) {
  const tbody = document.getElementById("reg-body");
  if (!regulations || !regulations.length) return;

  tbody.innerHTML = regulations
    .map(
      (r) => `
    <tr>
      <td>${r[0]}</td>
      <td>${r[1]}</td>
      <td>${r[2]}</td>
      <td><code>${r[3]}</code></td>
    </tr>
  `
    )
    .join("");
}

function renderSources(sources) {
  const container = document.getElementById("sources-content");
  if (!sources || Object.keys(sources).length === 0) return;

  const flat = [];
  if (sources.anp?.length) flat.push({ title: "ANP — Agência Nacional do Petróleo", items: sources.anp });
  if (sources.bureauVeritas?.length) flat.push({ title: "Bureau Veritas", items: sources.bureauVeritas });
  if (sources.mteDpc?.length) flat.push({ title: "Brazilian Ministry of Labour & Maritime Authority", items: sources.mteDpc });
  if (sources.international?.length) flat.push({ title: "International Cross-References", items: sources.international });

  container.innerHTML = flat
    .map(
      (g) => `
    <div class="source-group">
      <h3>${g.title}</h3>
      ${g.items
        .map(
          (item) => `
        <div class="source-item">
          <strong>${item.name}</strong>
          <span>${item.description}</span>
          ${item.url ? `<a href="${item.url}" target="_blank" rel="noopener">View source →</a>` : ""}
        </div>
      `
        )
        .join("")}
    </div>
  `
    )
    .join("");
}

loadData();
