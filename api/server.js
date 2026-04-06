const express = require("express");
const path = require("path");
const https = require("https");
const { Document, Packer } = require("docx");
const { buildReportSections } = require("../src/document_generation/report_builder");
const { getMetrics, getRegData, getIncidents, getTrendData } = require("../src/reporting/incident_analyzer");
const { anpData, bureauVeritasData, mteDpcData, internationalRefs } = require("../src/data/anp_data");

const { getDatabase } = require("./data_store");
const { getDb }       = require("./mongo");

let ANP_RECORDS = [];
let ANP_STATS   = null;
let DATA_LOADING_PROMISE = null;

async function ensureDataLoaded() {
  if (ANP_STATS && ANP_RECORDS.length > 0) return;
  if (DATA_LOADING_PROMISE) return DATA_LOADING_PROMISE;

  DATA_LOADING_PROMISE = (async () => {
    try {
      console.log("ENGINE: Loading ANP metrics from MongoDB…");
      const db = await getDb();
      ANP_RECORDS = await db.collection('anp_records').find({}, { projection: { _id: 0 } }).toArray();
      const statsDoc = await db.collection('anp_stats').findOne({}, { projection: { _id: 0 } });
      ANP_STATS = statsDoc || null;
      console.log(`ENGINE: Load complete (${ANP_RECORDS.length} records).`);
    } catch (err) {
      console.error("Failed to load ANP metrics from MongoDB:", err);
    }
  })();

  return DATA_LOADING_PROMISE;
}

const app = express();
const PORT = process.env.PORT || 5001;

// Explicit page routes come FIRST — before static middleware
app.get("/", (req, res) => {
  res.set("Cache-Control", "no-store");
  res.sendFile(path.join(__dirname, "..", "public", "index.html"));
});
app.get("/dashboard", (req, res) => {
  res.set("Cache-Control", "no-store");
  res.sendFile(path.join(__dirname, "..", "public", "dashboard.html"));
});

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

// ── MongoDB-backed routes ────────────────────────────────────────────────────

app.get("/api/hal-incidents", async (req, res) => {
  try {
    const year     = req.query.year     || "";
    const category = req.query.category || "";
    const severity = req.query.severity || "";
    const q        = (req.query.q || "").toLowerCase().trim();
    const page     = Math.max(1, parseInt(req.query.page)  || 1);
    const limit    = Math.min(500, parseInt(req.query.limit) || 50);

    const db    = await getDb();
    const filter = {};
    if (year)     filter.year     = parseInt(year);
    if (category) filter.category = category;
    if (severity) filter.severity = severity;
    if (q)        filter.$or = [
      { numero: { $regex: q, $options: 'i' } },
      { tipo:   { $regex: q, $options: 'i' } },
    ];

    const total = await db.collection('hal_incidents').countDocuments(filter);
    const items = await db.collection('hal_incidents')
      .find(filter, { projection: { _id: 0 } })
      .sort({ numero: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .toArray();

    res.json({ total, page, limit, pages: Math.ceil(total / limit), items });
  } catch(e) {
    res.status(500).json({ error: e.message });
  }
});

app.get("/api/hal-stats", async (req, res) => {
  try {
    const db      = await getDb();
    const records = await db.collection('hal_incidents').find({}, { projection: { _id: 0 } }).toArray();
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
      uniqueYears: Array.from(years).sort(),
    });
  } catch(e) {
    res.status(500).json({ error: e.message });
  }
});

// HAL contracts (Brazil / Petrobras)
app.get("/api/hal-contracts", async (req, res) => {
  try {
    const db    = await getDb();
    const items = await db.collection('hal_contracts').find({}, { projection: { _id: 0 } }).toArray();
    res.json({ total: items.length, items });
  } catch(e) {
    res.status(500).json({ error: e.message });
  }
});

// Regional contracts
app.get("/api/mexico-contracts", async (req, res) => {
  try {
    const db    = await getDb();
    const items = await db.collection('mex_contracts').find({}, { projection: { _id: 0 } }).toArray();
    res.json({ items });
  } catch(e) {
    res.status(500).json({ error: e.message });
  }
});

app.get("/api/argentina-contracts", async (req, res) => {
  try {
    const db    = await getDb();
    const items = await db.collection('arg_contracts').find({}, { projection: { _id: 0 } }).toArray();
    res.json({ items });
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

// ── Sodir Live Data (NCS Open Data) ────────────────────────────────────────
const SODIR_CACHE = { data: null, ts: 0 };
const SODIR_TTL_MS = 60 * 60 * 1000; // 1 hour
const SODIR_CSV_URL = "https://factpages.sodir.no/downloads/csv/wlbPoint.csv";

function fetchSodirCsv() {
  return new Promise((resolve, reject) => {
    https.get(SODIR_CSV_URL, { timeout: 15000 }, (res) => {
      if (res.statusCode !== 200) {
        reject(new Error(`Sodir returned HTTP ${res.statusCode}`));
        res.resume();
        return;
      }
      let raw = "";
      res.on("data", chunk => (raw += chunk));
      res.on("end", () => {
        const lines = raw.split("\n").filter(Boolean);
        if (lines.length < 2) { resolve([]); return; }
        const headers = lines[0].split(",").map(h => h.trim().replace(/^"|"$/g, ""));
        const records = lines.slice(1).map(line => {
          const cols = line.split(",").map(c => c.trim().replace(/^"|"$/g, ""));
          const obj = {};
          headers.forEach((h, i) => { obj[h] = cols[i] || ""; });
          return obj;
        });
        resolve(records);
      });
    }).on("error", reject);
  });
}

app.get("/api/sodir/wellbores", async (req, res) => {
  try {
    const now = Date.now();
    if (!SODIR_CACHE.data || now - SODIR_CACHE.ts > SODIR_TTL_MS) {
      console.log("SODIR: Fetching live wellbore data from factpages.sodir.no…");
      SODIR_CACHE.data = await fetchSodirCsv();
      SODIR_CACHE.ts = now;
      console.log(`SODIR: Cached ${SODIR_CACHE.data.length} wellbore records.`);
    }

    let data = SODIR_CACHE.data;
    const q        = (req.query.q || "").toLowerCase().trim();
    const type     = req.query.type || "";
    const status   = req.query.status || "";
    const page     = Math.max(1, parseInt(req.query.page) || 1);
    const limit    = Math.min(200, parseInt(req.query.limit) || 50);

    if (q)      data = data.filter(r => (r.wlbName || "").toLowerCase().includes(q) || (r.wlbField || "").toLowerCase().includes(q) || (r.wlbOperator || "").toLowerCase().includes(q));
    if (type)   data = data.filter(r => (r.wlbWellType || "").toUpperCase() === type.toUpperCase());
    if (status) data = data.filter(r => (r.wlbStatus || "").toUpperCase() === status.toUpperCase());

    const total = data.length;
    const items = data.slice((page - 1) * limit, page * limit);
    const cachedAt = new Date(SODIR_CACHE.ts).toISOString();
    res.json({ total, page, limit, pages: Math.ceil(total / limit), items, cachedAt, source: "Sodir FactPages (NLOD)" });
  } catch (e) {
    console.error("Sodir fetch error:", e.message);
    res.status(502).json({ error: "Could not reach Sodir FactPages: " + e.message });
  }
});

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Incident Report App running at http://localhost:${PORT}`);
  });
}
module.exports = app;
