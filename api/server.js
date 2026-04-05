const express = require("express");
const path = require("path");
const fs = require("fs");
const { Document, Packer } = require("docx");
const { buildReportSections } = require("../src/document_generation/report_builder");
const { getMetrics, getRegData, getIncidents, getTrendData } = require("../src/reporting/incident_analyzer");
const { anpData, bureauVeritasData, mteDpcData, internationalRefs } = require("../src/data/anp_data");

const { getDatabase } = require("./data_store"); // Consolidated Metrics Engine 

// Internal helper for static file paths
function locate(rel) {
  const p = path.resolve(__dirname, '..', rel);
  return fs.existsSync(p) ? p : null;
}

let ANP_RECORDS = [];
let ANP_STATS = null;

// Fetch pre-treated JSON - Lazy loading wrapper for Vercel
let DATA_LOADING_PROMISE = null;

async function ensureDataLoaded() {
  if (ANP_STATS && ANP_RECORDS.length > 0) return;
  if (DATA_LOADING_PROMISE) return DATA_LOADING_PROMISE;

  DATA_LOADING_PROMISE = (async () => {
    try {
      console.log("ENGINE: Loading ANP metrics into memory...");
      const recPath = path.resolve(__dirname, 'data/processed/anp_records.json');
      const statPath = path.resolve(__dirname, 'data/processed/anp_stats.json');
      
      if (fs.existsSync(recPath)) {
        ANP_RECORDS = JSON.parse(fs.readFileSync(recPath, 'utf8'));
      }
      if (fs.existsSync(statPath)) {
        ANP_STATS = JSON.parse(fs.readFileSync(statPath, 'utf8'));
      }
      console.log(`ENGINE: Load complete (${ANP_RECORDS.length} records).`);
    } catch (err) {
      console.error("Failed to load pre-treated ANP metrics.", err);
    }
  })();
  
  return DATA_LOADING_PROMISE;
}

const app = express();
const PORT = process.env.PORT || 5001;

// Explicit page routes come FIRST — before static middleware
app.get("/", (req, res) => res.sendFile(path.join(__dirname, "..", "public", "index.html")));
app.get("/dashboard", (req, res) => res.sendFile(path.join(__dirname, "..", "public", "dashboard.html")));

// Static assets (CSS, JS, images) — index:false prevents auto-serving index.html
app.use(express.static(path.join(__dirname, "..", "public"), { index: false }));

const SOURCE_LABELS = {
  sisoIncidentes: "SISO-Incidentes Dataset",
  resolucao46: "ANP Resolution No. 46/2016 (SGIP)",
  resolucao43: "ANP Resolution No. 43/2007 (SGSO)",
  resolucao41: "ANP Resolution No. 41/2015",
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
  const sampleRecords = ANP_RECORDS.filter(r => r.category !== "Other").slice(0, 10);
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
  const csvPath = locate("api/data/hal_incidents.csv");
  if (!csvPath) {
      console.error("HAL incidents CSV not found");
      return [];
  }
  const csvContent = fs.readFileSync(csvPath, "utf8");
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
    const t = tipo.toLowerCase();
    if (t.includes('reclassificação') || t.includes('queda de objetos') || t.includes('princípio de incêndio') || t.includes('ferimento grave')) return null;

    let category = "Other";
    if (t.includes("csb") || t.includes("conjunto solidário")) category = "CSB Failure";
    else if (t.includes("bop") || t.includes("blowout"))         category = "BOP Failure";
    else if (t.includes("kick"))                                 category = "Kick (Primary Barrier)";
    else if (t.includes("estrutural"))                          category = "Structural Failure";
    else if (t.includes("controle de poço"))                    category = "Loss of Well Control";

    // Severity normalisation
    let severity = "SSO"; // system-safety-only (no gravity label)
    if (grav === "MINOR")    severity = "Minor";
    else if (grav === "MODERATE") severity = "Moderate";
    else if (grav === "SEVERE")    severity = "Severe";
    else if (grav)          severity = grav;

    return { numero, tipo, rawTipo, category, severity,
             gravidade: grav, evento: evt, year, month };
  }).filter(Boolean);
}

function parseHalContracts() {
  const csvPath = locate("api/data/hal-contracts-pbr.csv");
  if (!csvPath) {
    console.error("HAL contracts CSV not found");
    return [];
  }
  const csvContent = fs.readFileSync(csvPath, "utf8");
  const lines = csvContent.split("\n").filter(Boolean);
  return lines.slice(1).map(line => {
    const parts = line.split(";");
    return {
      numero: parts[3]?.trim() || "—",
      obj:    parts[9]?.trim() || "No description provided",
      proc:   parts[6]?.trim() || "LICITAÇÃO",
      inicio: parts[11]?.trim() || "?",
      fim:    parts[12]?.trim() || "?",
      value:  parts[13]?.trim() || "—",
    };
  });
}

// API: Get complete Halliburton incidents from CSV (enriched)
app.get("/api/hal-incidents", async (req, res) => {
  try {
    const year     = req.query.year     || "";
    const category = req.query.category || "";
    const severity = req.query.severity || "";
    const q        = (req.query.q || "").toLowerCase().trim();
    const page     = Math.max(1, parseInt(req.query.page)  || 1);
    const limit    = Math.min(500, parseInt(req.query.limit) || 50);

    let data = parseHalIncidents();
    // Sort by date descending relying on the sequence numbers YYMM/...
    data.sort((a, b) => (b.numero || "").localeCompare(a.numero || ""));

    if (q) {
      data = data.filter(r => 
        r.numero.toLowerCase().includes(q) || 
        r.tipo.toLowerCase().includes(q)
      );
    }
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

app.get("/api/hal-stats", async (req, res) => {
  try {
    const records = parseHalIncidents();
    const catCount = {}, sevCount = {}, years = new Set();
    records.forEach(r => {
        catCount[r.category] = (catCount[r.category] || 0) + 1;
        sevCount[r.severity] = (sevCount[r.severity] || 0) + 1;
        if (r.year) years.add(r.year);
    });
    res.json({
      total: records.length,
      categoryBreakdown: catCount,
      severityBreakdown: sevCount,
      uniqueYears: Array.from(years).sort()
    });
  } catch(e) {
    res.status(500).json({ error: e.message });
  }
});

// API: HAL contracts from CSV
app.get("/api/hal-contracts", async (req, res) => {
  try {
    const items = parseHalContracts();
    res.json({ total: items.length, items });
  } catch(e) {
    res.status(500).json({ error: e.message });
  }
});

// API: Mexico Operational Metrics
app.get("/api/mexico-metrics", async (req, res) => {
  try {
    const HAL_DB = await getDatabase();
    res.json(HAL_DB.mexico);
  } catch(e) {
    res.status(500).json({ error: e.message });
  }
});

// API: Real ANP incidents — paginated
// API: Real ANP incidents — paginated
app.get("/api/incidents", async (req, res) => {
  await ensureDataLoaded();
  const page     = Math.max(1, parseInt(req.query.page) || 1);
  const limit    = Math.min(100, parseInt(req.query.limit) || 20);
  const q        = (req.query.q || '').toLowerCase().trim();
  const year     = req.query.year || '';
  const category = req.query.category || '';
  const severity = req.query.severity || '';

  let data = ANP_RECORDS;
  if (q)    data = data.filter(r => 
    r.numero.toLowerCase().includes(q) || 
    r.empresa.toLowerCase().includes(q) || 
    r.descricao.toLowerCase().includes(q) ||
    r.instalacao?.toLowerCase().includes(q)
  );
  if (year)     data = data.filter(r => String(r.year) === String(year));
  if (category) data = data.filter(r => r.category === category);
  if (severity) data = data.filter(r => r.severity === severity);

  const total = data.length;
  const start = (page - 1) * limit;
  const items = data.slice(start, start + limit);

  res.json({ total, page, limit, pages: Math.ceil(total/limit), items });
});

// API: Pre-aggregated stats from real ANP data
app.get("/api/stats", async (req, res) => {
  await ensureDataLoaded();
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
      sections: [buildReportSections(ANP_STATS, ANP_RECORDS.filter(r => r.category !== "Other").slice(0, 15))],
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
