/* ── server_v2.js ── */
// A dependency-free, standalone server for the Incident Report Dashboard
// Support for Cross-Analysis, ANP data parsing, and HAL contract mapping
// Author: Antigravity

const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');

const PORT = process.env.PORT || 3333;

// ── Global State (from CSVs) ────────────────────────────────────────────────
let ANP_STATS = null;
let HAL_INCIDENTS = [];
let PBR_CONTRACTS = [];

/**
 * Parses ANP incidents (dados.gov.br) and HAL incidents (internal)
 * Maps them to service domains for cross-analysis validation
 */
function initializeData() {
  try {
    const dataDir = path.join(__dirname, 'src/data');
    if (!fs.existsSync(dataDir)) return;

    // 1. Parse Halliburton-Petrobras Contracts (hal-contracts-pbr.csv)
    const contractPath = path.join(__dirname, 'hal-contracts-pbr.csv');
    if (fs.existsSync(contractPath)) {
      const content = fs.readFileSync(contractPath, 'utf8');
      const lines = content.split('\n').filter(l => l.trim());
      PBR_CONTRACTS = lines.slice(1).map(line => {
        const cols = line.split(';');
        return {
          numero: cols[3]?.trim(),
          obj:    cols[9]?.trim(),
          proc:   cols[6]?.trim(), // modalidade
          inicio: cols[11]?.trim(),
          fim:    cols[12]?.trim(),
          value:  cols[13]?.trim(),
          cur:    cols[13]?.includes('$') ? 'USD' : 'BRL',
          status: cols[16]?.trim()
        };
      });
      console.log(`[Data] Loaded ${PBR_CONTRACTS.length} contracts.`);
    }

    // 2. Parse HAL Incidents
    const halIncPath = path.join(dataDir, 'hal_incidents.csv');
    if (fs.existsSync(halIncPath)) {
      const content = fs.readFileSync(halIncPath, 'utf8');
      const lines = content.split('\n').filter(l => l.trim());
      HAL_INCIDENTS = lines.slice(1).map(line => {
        const cols = line.split(';');
        const numero = cols[0]?.trim();
        const m = (numero || '').match(/^(\d{2})(\d{2})\//);
        return {
          numero,
          tipo:     cols[1]?.trim(),
          severity: cols[2]?.trim(),
          evento:   cols[3]?.trim(),
          year:     m ? (2000 + parseInt(m[1])) : null,
          month:    m ? parseInt(m[2]) : null,
          category: normalizeCategory(cols[1])
        };
      });
      console.log(`[Data] Loaded ${HAL_INCIDENTS.length} HAL incidents.`);
    }

    // 3. Parse ANP Total Statistics
    const anpPath = path.join(dataDir, 'incidentes.csv');
    if (fs.existsSync(anpPath)) {
      // Re-using logic from original server.js
      const content = fs.readFileSync(anpPath, 'latin1');
      const lines = content.split('\n').filter(l => l.trim());
      const yearsMap = {};
      let csbTotal = 0, kickTotal = 0, structTotal = 0;

      lines.slice(1).forEach(line => {
        const cols = line.split(';');
        const date = cols[3]?.trim(); // DD-MM-YYYY
        const year = date?.split('-')[2];
        if (year && year >= '2013' && year <= '2026') {
          yearsMap[year] = (yearsMap[year] || 0) + 1;
        }
        // Basic keyword matching for counts
        const desc = (cols[16] || '').toLowerCase() || (cols[1] || '').toLowerCase();
        if (desc.includes('csb') || desc.includes('conjunto solidário')) csbTotal++;
        else if (desc.includes('kick')) kickTotal++;
        else if (desc.includes('estrutural') || desc.includes('poço')) structTotal++;
      });

      ANP_STATS = {
        total: lines.length - 1,
        csbCount: csbTotal,
        kickCount: kickTotal,
        structCount: structTotal,
        yearSeries: Object.entries(yearsMap).sort().map(([year, count]) => ({ year, count }))
      };
      console.log(`[Data] Loaded ${ANP_STATS.total} ANP reference records.`);
    }
  } catch (err) {
    console.error('[Error] Data initialization failed:', err.message);
  }
}

function normalizeCategory(tipo) {
  if (!tipo) return "Outros";
  const t = tipo.toLowerCase();
  if (t.includes("csb") || t.includes("conjunto solidário")) return "CSB Failure";
  if (t.includes("kick")) return "Kick (Primary Barrier)";
  if (t.includes("estrutural")) return "Structural Failure";
  if (t.includes("controle de poço")) return "Loss of Well Control";
  return "Outros";
}

initializeData();

// ── Server ──────────────────────────────────────────────────────────────────
const handler = (req, res) => {
  const parsedUrl = url.parse(req.url, true);
  const pathname = parsedUrl.pathname;

  // 1. API Endpoints
  if (pathname.startsWith('/api/')) {
    res.setHeader('Content-Type', 'application/json');

    // api/hal-stats
    if (pathname === '/api/hal-stats') {
      const stats = {
        total: HAL_INCIDENTS.length,
        categoryBreakdown: countBy(HAL_INCIDENTS, 'category'),
        severityBreakdown: countBy(HAL_INCIDENTS, 'severity'),
        yearSeries: aggregateYearSeries(HAL_INCIDENTS)
      };
      return res.end(JSON.stringify(stats));
    }

    // api/hal-incidents
    if (pathname === '/api/hal-incidents') {
      const page = parseInt(parsedUrl.query.page) || 1;
      const limit = parseInt(parsedUrl.query.limit) || 20;
      const start = (page - 1) * limit;
      const items = HAL_INCIDENTS.slice(start, start + limit);
      return res.end(JSON.stringify({ total: HAL_INCIDENTS.length, items, page, pages: Math.ceil(HAL_INCIDENTS.length / limit) }));
    }

    // api/hal-contracts (NEW for Cross-Analysis)
    if (pathname === '/api/hal-contracts') {
      return res.end(JSON.stringify({ total: PBR_CONTRACTS.length, items: PBR_CONTRACTS }));
    }

    // api/stats (ANP totals)
    if (pathname === '/api/stats') {
      return res.end(JSON.stringify(ANP_STATS || {}));
    }

    return res.end(JSON.stringify({ error: 'Not Found' }));
  }

  // 2. Page & Static Routes
  let fileName = pathname === '/' ? 'login.html' : pathname === '/dashboard' ? 'index.html' : pathname;
  if (!path.extname(fileName)) fileName += '.html';

  // Replace /public/ routing for Vercel since statically routed in config, 
  // but fallback to local file serving for local execution
  const publicPath = path.join(__dirname, 'public', fileName);
  const rootPath   = path.join(__dirname, fileName); // fallback if in root

  if (fs.existsSync(publicPath)) {
    return serveFile(res, publicPath);
  } else if (fs.existsSync(rootPath)) {
    return serveFile(res, rootPath);
  } else {
    res.statusCode = 404;
    res.end('<h1>404 Not Found</h1><p>Check public/ folder.</p>');
  }
};

function serveFile(res, filePath) {
  const ext = path.extname(filePath);
  const mimeTypes = {
    '.html': 'text/html',
    '.js':   'application/javascript',
    '.css':  'text/css',
    '.json': 'application/json',
    '.png':  'image/png',
    '.jpg':  'image/jpeg',
    '.svg':  'image/svg+xml'
  };
  res.setHeader('Content-Type', mimeTypes[ext] || 'text/plain');
  fs.createReadStream(filePath).pipe(res);
}

function countBy(arr, key) {
  return arr.reduce((acc, obj) => {
    const val = obj[key] || 'Outros';
    acc[val] = (acc[val] || 0) + 1;
    return acc;
  }, {});
}

function aggregateYearSeries(arr) {
  const map = {};
  arr.forEach(r => {
    if (!r.year) return;
    if (!map[r.year]) map[r.year] = { year: r.year, total: 0 };
    map[r.year].total++;
    map[r.year][r.category] = (map[r.year][r.category] || 0) + 1;
  });
  return Object.values(map).sort((a,b) => a.year - b.year);
}

// Support Vercel Serverless Functions export logic
module.exports = handler;

// Local execution
if (require.main === module) {
  const server = http.createServer(handler);
  server.listen(PORT, "127.0.0.1", () => {
    console.log(`\x1b[32m%s\x1b[0m`, `✔ Incident Report Dashboard running at http://127.0.0.1:${PORT}`);
    console.log(`\x1b[33m%s\x1b[0m`, `⚠ Dependency-free server (v2) successfully loaded.`);
  });
}
