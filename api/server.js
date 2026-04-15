const express = require("express");
const path = require("path");
const fs = require("fs");
const { Document, Packer } = require("docx");
const { buildReportSections } = require("../src/document_generation/report_builder");
const dataManager = require("./data_manager");

/**
 * HAL Tejas / CORTEX Dashboard Server
 * Refactored for maximum resilience: "Don't believe in API"
 * Fallback mechanism: MongoDB -> Local JSON -> Local CSV
 */

const app = express();
const PORT = process.env.PORT || 3333; // Standardized to 3333 for the VPS/local consistency

// 1. Static Setup
app.use(express.static(path.join(__dirname, "..", "public"), { index: false }));

app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "..", "public", "index.html"));
});

app.get("/dashboard", (req, res) => {
    res.sendFile(path.join(__dirname, "..", "public", "dashboard.html"));
});

// 2. Health check
app.get("/api/health", (req, res) => res.json({ status: "ok", mode: dataManager.isStaticMode ? "static" : "live" }));

// 3. Consolidated Statistics
app.get("/api/stats", async (req, res) => {
    try {
        const stats = await dataManager.getStats('anp');
        res.json(stats);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// 4. Incident Registry with Advanced Filtering
app.get("/api/hal-incidents", async (req, res) => {
    try {
        const { year, category, severity, q, page = 1, limit = 50 } = req.query;
        const filter = { year: { $nin: [2026, '2026'] } };
        
        if (year) {
            filter.year = parseInt(year);
        }
        if (category) filter.category = category;
        if (severity) filter.severity = severity;
        if (q) {
            filter.$or = [
                { numero: { $regex: q, $options: 'i' } },
                { empresa: { $regex: q, $options: 'i' } },
                { instalacao: { $regex: q, $options: 'i' } },
                { descricao: { $regex: q, $options: 'i' } }
            ];
        }

        const skip = (parseInt(page) - 1) * parseInt(limit);
        const [total, items] = await Promise.all([
            dataManager.getCollection('anp_records', filter, { countOnly: true }),
            dataManager.getCollection('anp_records', filter, { skip, limit: parseInt(limit), sort: { year: -1, numero: -1 } })
        ]);

        res.json({ total, page: parseInt(page), limit: parseInt(limit), pages: Math.ceil(total / limit), items });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// 5. Contracts & Proof of Service Evidence
app.get("/api/hal-contracts", async (req, res) => {
    const items = await dataManager.getCollection('hal_contracts');
    res.json({ total: items.length, items });
});

app.get("/api/mexico-contracts", async (req, res) => {
    const items = await dataManager.getCollection('mex_contracts');
    res.json({ items });
});

app.get("/api/argentina-contracts", async (req, res) => {
    const items = await dataManager.getCollection('arg_contracts');
    res.json({ items });
});

// 6. Norway / Sodir Strategy Module
app.get("/api/norway-stats", async (req, res) => {
    const filePath = path.join(__dirname, 'data/processed/norway_stats.json');
    if (fs.existsSync(filePath)) {
        res.json(JSON.parse(fs.readFileSync(filePath, 'utf8')));
    } else {
        res.status(404).json({ error: "Norway stats not precomputed" });
    }
});

app.get("/api/sodir/wellbores", async (req, res) => {
    const { q, type, status, page = 1, limit = 50 } = req.query;
    const filter = {};
    if (q) filter.wlbName = { $regex: q, $options: 'i' };
    if (type) filter.wlbWellType = type;
    if (status) filter.wlbStatus = status;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [total, items] = await Promise.all([
        dataManager.getCollection('sodir_wellbores', filter, { countOnly: true }),
        dataManager.getCollection('sodir_wellbores', filter, { skip, limit: parseInt(limit), sort: { wlbYear: -1 } })
    ]);

    res.json({ total, page: parseInt(page), limit: parseInt(limit), pages: Math.ceil(total / limit), items, source: "Sodir FactPages" });
});

// 7. Report Generation (DOCX)
app.get("/api/generate-report", async (req, res) => {
    try {
        const stats = await dataManager.getStats('anp');
        const records = await dataManager.getCollection('anp_records', { category: { $ne: 'Other' } }, { limit: 15 });
        
        const doc = new Document({
            sections: [buildReportSections(stats, records)],
        });

        const buffer = await Packer.toBuffer(doc);
        res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.wordprocessingml.document");
        res.setHeader("Content-Disposition", "attachment; filename=HAL_Tejas_Intelligence_Report.docx");
        res.send(buffer);
    } catch (err) {
        res.status(500).json({ error: "Failed to generate report" });
    }
});

// 8. Mexico Operational Drill Down
app.get("/api/mexico-perforacion", async (req, res) => {
    const { basin, q, page = 1, limit = 50 } = req.query;
    const filter = {};
    if (basin) filter.cuenca = basin;
    if (q) filter.id_pozo = { $regex: q, $options: 'i' };

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [total, items] = await Promise.all([
        dataManager.getCollection('mex_perforacion', filter, { countOnly: true }),
        dataManager.getCollection('mex_perforacion', filter, { skip, limit: parseInt(limit) })
    ]);

    res.json({ total, page: parseInt(page), limit: parseInt(limit), pages: Math.ceil(total / limit), items });
});

app.get("/api/mexico-metrics", async (req, res) => {
    try {
        const halDb = await dataManager.getCollection('hal_db');
        if (halDb && halDb[0] && halDb[0].mexico) {
            res.json(halDb[0].mexico);
        } else {
            res.json({ details: [], summary: {} });
        }
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// 9. Norway Extended
app.get("/api/norway-incidents", async (req, res) => {
    const { page = 1, limit = 50 } = req.query;
    const skip = (parseInt(page)-1) * parseInt(limit);
    const [total, items] = await Promise.all([
        dataManager.getCollection('nor_incidents', {}, { countOnly: true }),
        dataManager.getCollection('nor_incidents', {}, { skip, limit: parseInt(limit) })
    ]);
    res.json({ total, page: parseInt(page), limit: parseInt(limit), items });
});

app.get("/api/norway-contracts", async (req, res) => {
    const items = await dataManager.getCollection('nor_contracts');
    res.json({ items });
});

// 10. KSA / Aramco Intelligence
app.get("/api/ksa/config", async (req, res) => {
    const filings = await dataManager.getCollection('ksa_filings');
    const years = [...new Set(filings.map(f => f.year))].sort((a,b) => b-a);
    res.json({ availableYears: years });
});

app.get("/api/ksa/reports/:year", async (req, res) => {
    const year = parseInt(req.params.year);
    const filings = await dataManager.getCollection('ksa_filings', { year });
    const risks = await dataManager.getCollection('ksa_risks', { year });
    res.json({ year, filings, risks, metrics: { total_filings: filings.length } });
});

app.get("/api/aramco/:year/source/:file", (req, res) => {
    const { year, file } = req.params;
    const safeFile = path.basename(file);
    const filePath = path.join(__dirname, 'docs', 'aramco', 'text', year, safeFile);
    if (fs.existsSync(filePath)) {
        res.sendFile(filePath);
    } else {
        res.status(404).send("Filing not found on disk");
    }
});

// 11. Vault
app.post("/api/report/vault", express.json(), async (req, res) => {
    const db = await require('./mongo').getDb();
    await db.collection("report_vault").updateOne({ reportId: req.body.reportId }, { $set: { ...req.body, updatedAt: new Date() } }, { upsert: true });
    res.json({ status: "saved" });
});

app.get("/api/report/vault/:id", async (req, res) => {
    const db = await require('./mongo').getDb();
    const doc = await db.collection("report_vault").findOne({ reportId: req.params.id }, { projection: { _id: 0 } });
    res.json(doc || { error: "Not found" });
});

// Start the engine
app.listen(PORT, async () => {
    console.log(`\x1b[32m\n🚀 CORTEX HUB RUNNING AT http://localhost:${PORT}\x1b[0m`);
    
    // Check if we can connect to Mongo, if not, warn and set static mode
    try {
        const { getDb } = require('./mongo');
        const db = await getDb();
        console.log("\x1b[36m💎 Engine: Database connectivity established.\x1b[0m");
        
        // Check if any collection has data
        const statsCount = await db.collection('anp_stats').countDocuments();
        if (statsCount === 0) {
            console.log("\x1b[33m💡 Engine: Database is empty. DataManager will use Local Files.\x1b[0m");
        }
    } catch (err) {
        console.warn("\x1b[33m⚠️ Engine: Database unavailable. Switching to Static Mode (Local Resources Only).\x1b[0m");
        dataManager.setStaticMode(true);
    }
});
