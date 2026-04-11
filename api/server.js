const express = require("express");
const path = require("path");
const https = require("https");
const fs = require("fs");
const { Document, Packer } = require("docx");
const { buildReportSections } = require("../src/document_generation/report_builder");
const { getMetrics, getRegData, getIncidents, getTrendData } = require("../src/reporting/incident_analyzer");
const { anpData, bureauVeritasData, mteDpcData, internationalRefs } = require("../src/data/anp_data");

const { getDatabase } = require("./data_store");
const { getDb }       = require("./mongo");
const { getCache, setCache } = require("./redis");

let ANP_RECORDS = [];
let ANP_STATS   = null;
let DATA_LOADING_PROMISE = null;

async function ensureDataLoaded() {
  if (ANP_STATS && ANP_RECORDS.length > 0) return;
  if (DATA_LOADING_PROMISE) return DATA_LOADING_PROMISE;

  DATA_LOADING_PROMISE = (async () => {
    try {
      // 1. Try Redis first — instant if warm
      const [cachedStats, cachedRecords] = await Promise.all([
        getCache('anp:stats'),
        getCache('anp:records'),
      ]);
      if (cachedStats && cachedRecords) {
        ANP_STATS   = cachedStats;
        ANP_RECORDS = cachedRecords;
        console.log(`ENGINE: Loaded from Redis cache (${ANP_RECORDS.length} records).`);
        return;
      }

      // 2. Fall back to MongoDB
      console.log("ENGINE: Redis miss — loading ANP metrics from MongoDB…");
      const db = await getDb();
      ANP_RECORDS = await db.collection('anp_records').find({}, { projection: { _id: 0 } }).toArray();
      const statsDoc = await db.collection('anp_stats').findOne({}, { projection: { _id: 0 } });
      ANP_STATS = statsDoc || null;
      console.log(`ENGINE: MongoDB load complete (${ANP_RECORDS.length} records).`);

      // 3. Warm Redis for next cold start — 6 hour TTL
      await Promise.all([
        setCache('anp:stats',   ANP_STATS,   6 * 3600),
        setCache('anp:records', ANP_RECORDS, 6 * 3600),
      ]);
    } catch (err) {
      console.error("Failed to load ANP metrics:", err);
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

app.get("/api/health", (req, res) => res.json({ status: "ok" }));

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
      { numero:    { $regex: q, $options: 'i' } },
      { empresa:   { $regex: q, $options: 'i' } },
      { instalacao:{ $regex: q, $options: 'i' } },
      { descricao: { $regex: q, $options: 'i' } },
    ];

    const total = await db.collection('anp_records').countDocuments(filter);
    const items = await db.collection('anp_records')
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

// Norway incidents — Redis-first, paginated, filterable
app.get("/api/norway-incidents", async (req, res) => {
  try {
    const year     = req.query.year     || "";
    const category = req.query.category || "";
    const severity = req.query.severity || "";
    const field    = req.query.field    || "";
    const q        = (req.query.q || "").toLowerCase().trim();
    const page     = Math.max(1, parseInt(req.query.page)  || 1);
    const limit    = Math.min(500, parseInt(req.query.limit) || 50);

    // 1. Redis first
    let allIncidents = await getCache('nor:incidents:all');

    // 2. Redis miss — load from MongoDB and warm cache
    if (!allIncidents) {
      const db = await getDb();
      allIncidents = await db.collection('nor_incidents')
        .find({}, { projection: { _id: 0 } }).toArray();
      setCache('nor:incidents:all', allIncidents, 6 * 3600).catch(() => {});
      console.log(`NOR: Loaded ${allIncidents.length} incidents from MongoDB → Redis warmed`);
    }

    // 3. Apply filters in-memory
    let data = allIncidents;
    if (year)     data = data.filter(r => r.year     === parseInt(year));
    if (category) data = data.filter(r => r.category === category);
    if (severity) data = data.filter(r => r.severity === severity);
    if (field)    data = data.filter(r => (r.field || "").toLowerCase().includes(field.toLowerCase()));
    if (q)        data = data.filter(r =>
      (r.numero || "").toLowerCase().includes(q) ||
      (r.tipo   || "").toLowerCase().includes(q) ||
      (r.evento || "").toLowerCase().includes(q) ||
      (r.field  || "").toLowerCase().includes(q)
    );

    // Sort by numero desc
    data = data.slice().sort((a, b) => (b.numero || "").localeCompare(a.numero || ""));

    const total = data.length;
    const items = data.slice((page - 1) * limit, page * limit);
    res.json({ total, page, limit, pages: Math.ceil(total / limit), items });
  } catch(e) {
    res.status(500).json({ error: e.message });
  }
});

// Norway contracts
app.get("/api/norway-contracts", async (req, res) => {
  try {
    const db    = await getDb();
    const items = await db.collection('nor_contracts').find({}, { projection: { _id: 0 } }).toArray();
    res.json({ total: items.length, items });
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

app.get("/api/mexico-perforacion", async (req, res) => {
  try {
    const db   = await getDb();
    const page  = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(200, parseInt(req.query.limit) || 50);
    const q     = (req.query.q || '').toLowerCase().trim();
    const basin = (req.query.basin || '').toUpperCase().trim();

    const filter = {};
    if (basin) filter.cuenca = { $regex: basin, $options: 'i' };
    if (q)     filter.$or = [
      { id_pozo:   { $regex: q, $options: 'i' } },
      { operador:  { $regex: q, $options: 'i' } },
      { formacion: { $regex: q, $options: 'i' } },
    ];

    const total = await db.collection('mex_perforacion').countDocuments(filter);
    const items = await db.collection('mex_perforacion')
      .find(filter, { projection: { _id: 0 } })
      .skip((page - 1) * limit)
      .limit(limit)
      .toArray();

    res.json({ total, page, limit, pages: Math.ceil(total / limit), items });
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
// Real Sodir FactPages — wellbore_exploration_all, NLOD licence
// Local copy: api/data/wellbore_exploration_all.csv (2,188 rows)
// Live fallback: factpages.sodir.no FactPages CSV export
const SODIR_LOCAL  = path.join(__dirname, "data", "wellbore_exploration_all.csv");
const SODIR_CSV_URL = "https://factpages.sodir.no/public?/Factpages/external/tableview/wellbore_exploration_all&rs:Command=Render&rc:Toolbar=false&rc:Parameters=f&IpAddress=not_used&CultureCode=en&rs:Format=CSV&Top100=false";

function parseSodirCsv(raw) {
  const lines = raw.split("\n").filter(Boolean);
  if (lines.length < 2) return [];
  const headerLine = lines[0].replace(/^\uFEFF/, "");
  const headers = headerLine.split(",").map(h => h.trim().replace(/^"|"$/g, ""));
  return lines.slice(1).map(line => {
    const cols = line.split(",").map(c => c.trim().replace(/^"|"$/g, ""));
    const r = {};
    headers.forEach((h, i) => { r[h] = cols[i] || ""; });
    return {
      wlbName:      r.wlbWellboreName || "",
      wlbField:     r.wlbField        || "",
      wlbOperator:  r.wlbDrillingOperator || "",
      wlbWellType:  r.wlbWellType     || "",
      wlbStatus:    r.wlbStatus       || "",
      wlbYear:      r.wlbEntryYear    || "",
      wlbTotalDepth:r.wlbTotalDepth   || "",
    };
  }).filter(r => r.wlbName);
}

function fetchSodirCsv() {
  // Try local file first — fast, no network dependency
  if (fs.existsSync(SODIR_LOCAL)) {
    console.log("SODIR: Loading from local file api/data/wellbore_exploration_all.csv");
    const raw = fs.readFileSync(SODIR_LOCAL, "utf8");
    return Promise.resolve(parseSodirCsv(raw));
  }
  // Fallback: live fetch from Sodir FactPages
  console.log("SODIR: Local file not found, fetching from factpages.sodir.no…");
  return new Promise((resolve, reject) => {
    const url = new URL(SODIR_CSV_URL);
    const options = { hostname: url.hostname, path: url.pathname + url.search, timeout: 20000,
      headers: { "User-Agent": "HALTejasIncidentDashboard/1.0" } };
    https.get(options, (response) => {
      if (response.statusCode !== 200) {
        reject(new Error(`Sodir returned HTTP ${response.statusCode}`));
        response.resume();
        return;
      }
      let raw = "";
      response.on("data", chunk => (raw += chunk));
      response.on("end", () => resolve(parseSodirCsv(raw)));
    }).on("error", reject);
  });
}

app.get("/api/sodir/wellbores", async (req, res) => {
  try {
    const q      = (req.query.q || "").toLowerCase().trim();
    const type   = req.query.type   || "";
    const status = req.query.status || "";
    const page   = Math.max(1, parseInt(req.query.page)  || 1);
    const limit  = Math.min(200, parseInt(req.query.limit) || 50);

    // 1. Redis first — full dataset cached, filter in-memory
    let allWellbores = await getCache('sodir:wellbores');
    let dataSource = "Sodir FactPages (NLOD) — Redis";

    // 2. Redis miss — try MongoDB
    if (!allWellbores) {
      try {
        const db = await getDb();
        allWellbores = await db.collection('sodir_wellbores')
          .find({}, { projection: { _id: 0 } }).toArray();
        if (allWellbores && allWellbores.length > 0) {
          dataSource = "Sodir FactMaps (Layer 201) — MongoDB";
          // Warm Redis — 24hr TTL (wellbore registry is static)
          setCache('sodir:wellbores', allWellbores, 24 * 3600).catch(() => {});
          console.log(`SODIR: Loaded ${allWellbores.length} wellbores from MongoDB → Redis warmed`);
        }
      } catch (_) {
        allWellbores = null;
      }
    }

    // 3. MongoDB unavailable — fall back to local CSV / live fetch
    if (!allWellbores || allWellbores.length === 0) {
      const now = Date.now();
      if (!SODIR_CACHE.data || now - SODIR_CACHE.ts > SODIR_TTL_MS) {
        SODIR_CACHE.data = await fetchSodirCsv();
        SODIR_CACHE.ts = now;
        console.log(`SODIR: Loaded ${SODIR_CACHE.data.length} wellbore records (CSV fallback).`);
      }
      allWellbores = SODIR_CACHE.data;
      dataSource = "Sodir FactPages (NLOD / ArcGIS Layer 201)";
    }

    // Apply filters in-memory
    let data = allWellbores;
    if (q)      data = data.filter(r => (r.wlbName || "").toLowerCase().includes(q) || (r.wlbField || "").toLowerCase().includes(q) || (r.wlbOperator || "").toLowerCase().includes(q));
    if (type)   data = data.filter(r => (r.wlbWellType || "").toUpperCase() === type.toUpperCase());
    if (status) data = data.filter(r => (r.wlbStatus || "").toUpperCase() === status.toUpperCase());

    data = data.slice().sort((a, b) => (parseInt(b.wlbYear) || 0) - (parseInt(a.wlbYear) || 0));
    const total = data.length;
    const items = data.slice((page - 1) * limit, page * limit);
    res.json({ total, page, limit, pages: Math.ceil(total / limit), items,
      cachedAt: new Date().toISOString(), source: dataSource });
  } catch (e) {
    console.error("Sodir fetch error:", e.message);
    res.status(502).json({ error: "Could not load Sodir wellbore data: " + e.message });
  }
});

// Norway Stats — real data from wellbore_exploration_all.csv
app.get("/api/norway-stats", async (req, res) => {
  try {
    const statsPath = path.resolve(__dirname, 'data/processed/norway_stats.json');
    if (fs.existsSync(statsPath)) {
      const stats = JSON.parse(fs.readFileSync(statsPath, 'utf8'));
      res.json(stats);
    } else {
      res.status(404).json({ error: "Norway stats not precomputed. Run treat_data.js first." });
    }
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Incident Report App running at http://localhost:${PORT}`);
  });
}
module.exports = app;
