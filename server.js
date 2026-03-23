const express = require("express");
const path = require("path");
const fs = require("fs");
const { Document, Packer } = require("docx");
const { buildReportSections } = require("./src/document_generation/report_builder");
const { getMetrics, getRegData, getIncidents, getTrendData } = require("./src/reporting/incident_analyzer");
const { anpData, bureauVeritasData, mteDpcData, internationalRefs } = require("./src/data/anp_data");

// ── Real ANP dataset (incidentes.csv + incidentes-tipo.csv) ──────────────
let ANP_RECORDS = [];
let ANP_STATS = null;

function parseIncidentesCSV() {
  const csvPath = path.join(__dirname, "src/data/incidentes.csv");
  const typeCsvPath = path.join(__dirname, "src/data/incidentes-tipo.csv"); // Used for join
  
  if (!fs.existsSync(csvPath) || !fs.existsSync(typeCsvPath)) return;
  
  // 1. Load Types
  const typeContent = fs.readFileSync(typeCsvPath, 'latin1');
  const typeLines = typeContent.split('\n').filter(l => l.trim());
  const typeMap = {};
  
  typeLines.slice(1).forEach(line => {
    const cols = line.split(';');
    const num = cols[0]?.trim();
    if(num) {
      if(!typeMap[num]) typeMap[num] = [];
      typeMap[num].push(cols[1]?.trim() || "");
    }
  });

  // 2. Load Incidents
  const content = fs.readFileSync(csvPath, 'latin1');
  const lines = content.split('\n').filter(l => l.trim());

  ANP_RECORDS = lines.slice(1).map(line => {
    const cols = line.split(';');
    const get = (i) => (cols[i] || '').trim();
    const numero = get(0);
    const date = get(3); // Data_de_criacao DD-MM-YYYY
    const parts = date.split('-');
    const year = parts.length === 3 ? parts[2] : null;
    const empresa = get(1).replace(/\s*\(.*\)/, '').trim();
    
    const tipos = typeMap[numero] || [];
    const tipoStr = tipos.join(' | ').toLowerCase();
    
    // HAL/Tejas specific categorization
    let category = "Outros";
    if (tipoStr.includes('csb') || tipoStr.includes('conjunto solidário')) category = "CSB Failure";
    else if (tipoStr.includes('kick')) category = "Kick";
    else if (tipoStr.includes('estrutural')) category = "Structural";
    else if (tipoStr.includes('controle de poço')) category = "Well Control";

    return {
      numero,
      empresa,
      instalacao:    get(5),
      data:          date,
      year:          year && year.length === 4 ? year : null,
      lat:           parseFloat(get(8)) || null,
      lon:           parseFloat(get(9)) || null,
      situacao:      get(11),
      feridos:       parseInt(get(14)) || 0,
      fatalidades:   parseInt(get(15)) || 0,
      descricao:     get(16),
      codigo:        get(17),
      tipos:         tipos,
      category:      category
    };
  });

  // Pre-aggregate stats
  const yearMapObj = {}, halYearMap = {}, categoryMap = {}, companyMap = {};
  let totalFatal = 0, totalInj = 0;
  
  let csbCount = 0, kickCount = 0, structCount = 0;

  ANP_RECORDS.forEach(r => {
    if (r.year && r.year >= '2013' && r.year <= '2026') yearMapObj[r.year] = (yearMapObj[r.year] || 0) + 1;
    
    totalFatal += r.fatalidades;
    totalInj   += r.feridos;
    
    companyMap[r.empresa] = (companyMap[r.empresa] || 0) + 1;
    
    if (r.category === "CSB Failure") csbCount++;
    if (r.category === "Kick") kickCount++;
    if (r.category === "Structural" || r.category === "Well Control") structCount++;
    
    if (r.category !== "Outros") {
      categoryMap[r.category] = (categoryMap[r.category] || 0) + 1;
      if (r.year && r.year >= '2013' && r.year <= '2026') {
         halYearMap[r.year] = (halYearMap[r.year] || 0) + 1;
      }
    }
  });

  const yearSeries = Object.entries(yearMapObj)
    .sort((a,b) => a[0].localeCompare(b[0]))
    .map(([year, count]) => ({ year, count }));
    
  const halYearSeries = Object.entries(halYearMap)
    .sort((a,b) => a[0].localeCompare(b[0]))
    .map(([year, count]) => ({ year, count }));

  const topCompanies = Object.entries(companyMap)
    .sort((a,b) => b[1]-a[1]).slice(0,10)
    .map(([name, count]) => ({ name, count }));

  ANP_STATS = {
    total:       ANP_RECORDS.length,
    fatalidades: totalFatal,
    feridos:     totalInj,
    csbCount,
    kickCount,
    structCount,
    yearSeries,
    halYearSeries,
    categoryMap,
    topCompanies,
  };
}

parseIncidentesCSV();

const app = express();
const PORT = process.env.PORT || 3333;

// Explicit page routes come FIRST — before static middleware
// so express.static doesn't hijack "/" with index.html
app.get("/", (req, res) => res.sendFile(path.join(__dirname, "public", "login.html")));
app.get("/dashboard", (req, res) => res.sendFile(path.join(__dirname, "public", "index.html")));


// Static assets (CSS, JS, images) — index:false prevents auto-serving index.html
app.use(express.static(path.join(__dirname, "public"), { index: false }));

const SOURCE_LABELS = {
  sisoIncidentes: "SISO-Incidentes Dataset",
  resolucao46: "Resolução ANP nº 46/2016 (SGIP)",
  resolucao43: "Resolução ANP nº 43/2007 (SGSO)",
  resolucao41: "Resolução ANP nº 41/2015",
  nr445: "NR 445 — Classification of Offshore Units",
  nr459: "NR 459 — Process Systems on Offshore Units",
  nr493: "NR 493 — Mooring Systems",
  ivbsBra: "IVBS-BRA Notation",
  nr37: "NR-37 (MTE)",
  nr33_35: "NR-33 / NR-35 (MTE)",
  normam01: "NORMAM-01/DPC",
  bsee: "BSEE Offshore Incident Statistics (US)",
  hseUk: "HSE UK Hydrocarbon Release Database",
};

function formatSources(obj) {
  return Object.entries(obj).map(([key, val]) => ({
    name: SOURCE_LABELS[key] || key,
    description: val.description,
    url: val.url,
  }));
}

// API: Get report data for frontend — all driven by live ANP CSV data
app.get("/api/data", (req, res) => {
  if (!ANP_STATS) return res.status(503).json({ error: 'ANP data not loaded' });
  const sampleRecords = ANP_RECORDS.filter(r => r.category !== "Outros").slice(0, 10);
  res.json({
    metrics: getMetrics(ANP_STATS),
    regulations: getRegData(),
    incidents: getIncidents(sampleRecords),
    trends: getTrendData(ANP_STATS.halYearSeries, ANP_STATS.yearSeries),
    sources: {
      anp: formatSources(anpData),
      bureauVeritas: formatSources(bureauVeritasData),
      mteDpc: formatSources(mteDpcData),
      international: formatSources(internationalRefs),
    },
  });
});

// ── HAL incidents helpers ───────────────────────────────────────────────────
function parseHalIncidents() {
  const csvContent = fs.readFileSync(path.join(__dirname, "src/data/hal_incidents.csv"), "utf8");
  const lines = csvContent.split("\n").filter(Boolean);
  return lines.slice(1).map(line => {
    const parts = line.split(";");
    const numero  = parts[0]?.trim() || "";
    const rawTipo = parts[1]?.trim() || "";
    const grav    = parts[2]?.trim() || "";
    const evt     = parts[3]?.trim() || "";

    // Derive year + month from prefix e.g. "2107/000001" → 2021, 7
    const m = numero.match(/^(\d{2})(\d{2})\//);
    const year  = m ? (2000 + parseInt(m[1])) : null;
    const month = m ? parseInt(m[2]) : null;

    // Normalize type
    const tipo = rawTipo.replace(/^SSO - /, "").trim();

    // Category bucket
    let category = "Outros";
    const t = tipo.toLowerCase();
    if (t.includes("csb") || t.includes("conjunto solidário")) category = "CSB Failure";
    else if (t.includes("kick"))                                 category = "Kick (Primary Barrier)";
    else if (t.includes("estrutural"))                          category = "Structural Failure";
    else if (t.includes("controle de poço"))                    category = "Loss of Well Control";

    // Severity normalisation
    let severity = "SSO"; // system-safety-only (no gravity label)
    if (grav === "LEVE")    severity = "Minor";
    else if (grav === "MODERADO") severity = "Moderate";
    else if (grav === "GRAVE")    severity = "Severe";
    else if (grav)          severity = grav;

    return { numero, tipo, rawTipo, category, severity,
             gravidade: grav, evento: evt, year, month };
  });
}

// API: Get complete Halliburton incidents from CSV (enriched)
app.get("/api/hal-incidents", (req, res) => {
  try {
    const year     = req.query.year     || "";
    const category = req.query.category || "";
    const severity = req.query.severity || "";
    const page     = Math.max(1, parseInt(req.query.page)  || 1);
    const limit    = Math.min(500, parseInt(req.query.limit) || 50);

    let data = parseHalIncidents();
    if (year)     data = data.filter(r => r.year === parseInt(year));
    if (category) data = data.filter(r => r.category === category);
    if (severity) data = data.filter(r => r.severity === severity);

    const total = data.length;
    const items = data.slice((page - 1) * limit, page * limit);
    res.json({ total, page, limit, pages: Math.ceil(total / limit), items });
  } catch(e) {
    res.status(500).json({ error: e.message });
  }
});

// API: HAL incidents aggregated stats
app.get("/api/hal-stats", (req, res) => {
  try {
    const records = parseHalIncidents();

    // Year series per category
    const yearCat = {};  // { year: { cat: count } }
    const catCount = {};
    const sevCount = {};
    const monthCount = {};

    records.forEach(r => {
      // by year + category
      if (r.year) {
        if (!yearCat[r.year]) yearCat[r.year] = {};
        yearCat[r.year][r.category] = (yearCat[r.year][r.category] || 0) + 1;
      }
      catCount[r.category] = (catCount[r.category] || 0) + 1;
      sevCount[r.severity] = (sevCount[r.severity] || 0) + 1;
      if (r.month) monthCount[r.month] = (monthCount[r.month] || 0) + 1;
    });

    const years = Object.keys(yearCat).sort();
    const categories = ["CSB Failure", "Kick (Primary Barrier)", "Structural Failure", "Loss of Well Control"];

    const yearSeries = years.map(y => ({
      year: parseInt(y),
      total: Object.values(yearCat[y]).reduce((a, b) => a + b, 0),
      ...Object.fromEntries(categories.map(c => [c, yearCat[y][c] || 0]))
    }));

    res.json({
      total: records.length,
      yearSeries,
      categoryBreakdown: catCount,
      severityBreakdown: sevCount,
      monthPattern: monthCount,
      categories
    });
  } catch(e) {
    res.status(500).json({ error: e.message });
  }
});

// API: Real ANP incidents — paginated
app.get("/api/incidents", (req, res) => {
  const page  = Math.max(1, parseInt(req.query.page) || 1);
  const limit = Math.min(100, parseInt(req.query.limit) || 20);
  const q     = (req.query.q || '').toLowerCase().trim();
  const year  = req.query.year || '';

  let data = ANP_RECORDS;
  if (q)    data = data.filter(r => r.numero.toLowerCase().includes(q) || r.empresa.toLowerCase().includes(q) || r.descricao.toLowerCase().includes(q));
  if (year) data = data.filter(r => r.year === year);

  const total = data.length;
  const start = (page - 1) * limit;
  const items = data.slice(start, start + limit);

  res.json({ total, page, limit, pages: Math.ceil(total/limit), items });
});

// API: Pre-aggregated stats from real ANP data
app.get("/api/stats", (req, res) => {
  if (!ANP_STATS) return res.status(503).json({ error: 'Data not loaded' });
  res.json(ANP_STATS);
});

// API: Generate and download DOCX report
app.get("/api/generate-report", async (req, res) => {
  try {
    const doc = new Document({
      numbering: {
        config: [
          {
            reference: "bullets",
            levels: [{
              level: 0, format: "bullet", text: "\u2022", alignment: "left",
              style: { paragraph: { indent: { left: 720, hanging: 360 } } }
            }]
          }
        ]
      },
      styles: {
        default: { document: { run: { font: "Arial", size: 22 } } },
        paragraphStyles: [
          {
            id: "Heading1", name: "Heading 1", basedOn: "Normal", next: "Normal", quickFormat: true,
            run: { size: 32, bold: true, font: "Arial", color: "1F4E79" },
            paragraph: { spacing: { before: 360, after: 160 }, outlineLevel: 0 }
          },
          {
            id: "Heading2", name: "Heading 2", basedOn: "Normal", next: "Normal", quickFormat: true,
            run: { size: 26, bold: true, font: "Arial", color: "2E74B5" },
            paragraph: { spacing: { before: 280, after: 120 }, outlineLevel: 1 }
          }
        ]
      },
      sections: [buildReportSections(ANP_STATS, ANP_RECORDS.filter(r => r.category !== "Outros").slice(0, 15))],
    });

    const buffer = await Packer.toBuffer(doc);
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.wordprocessingml.document");
    res.setHeader("Content-Disposition", "attachment; filename=HAL_Tejas_Incident_Report.docx");
    res.send(buffer);
  } catch (err) {
    console.error("Report generation error:", err);
    res.status(500).json({ error: "Failed to generate report" });
  }
});

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Incident Report App running at http://localhost:${PORT}`);
  });
}
module.exports = app;
