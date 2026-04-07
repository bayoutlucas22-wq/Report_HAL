# HAL Tejas — Compliance Intelligence Dashboard

**Live (VPS):** `http://46.202.93.157:3333/dashboard`

A multi-country compliance intelligence platform for Halliburton operations across Brazil, Argentina, Mexico, and Norway. Built to surface regulatory exposure, contract risk, incident trends, and ISO 37301 audit posture from public energy-sector data sources.

---

## Architecture Overview

```
┌─────────────────────────────────────────────────┐
│  Browser (vanilla JS + Chart.js)                │
│  public/dashboard.html  +  public/app.js        │
└─────────────┬───────────────────────────────────┘
              │ HTTP / REST
┌─────────────▼───────────────────────────────────┐
│  Node.js / Express  (api/server.js)             │
│  Port 3333 · Docker container: hal-tejas-app    │
│                                                 │
│  Redis cache layer (Upstash — optional)         │
│  Fallback: MongoDB on every miss                │
└─────────────┬───────────────────────────────────┘
              │
┌─────────────▼───────────────────────────────────┐
│  MongoDB  (container: hal-tejas-mongodb)        │
│  Database: hal_tejas_db                         │
│  Port 27017 (internal + externally exposed)     │
└─────────────────────────────────────────────────┘
```

**Stack:** Node.js 20 · Express 4 · MongoDB 6 · Upstash Redis · Chart.js · Vanilla JS · Docker Compose

---

## Repository Structure

```
├── api/
│   ├── server.js              # Express app — all REST endpoints
│   ├── mongo.js               # MongoDB connection helper
│   ├── redis.js               # Upstash Redis cache helper (no-op if unconfigured)
│   ├── data_store.js          # In-memory fallback data store
│   └── data/
│       ├── *.csv              # Raw source data (ANP, SIH, Sodir, ASEA, CompraNet)
│       ├── anp_data.js        # Static ANP/Bureau Veritas reference data
│       └── processed/
│           ├── norway_stats.json   # Pre-aggregated NCS wellbore stats (output of treat_data.js)
│           ├── anp_records.json    # ANP incident records
│           ├── anp_stats.json      # ANP aggregated stats
│           └── hal_db.json         # HAL contract/incident cross-reference
│
├── src/
│   ├── data/                  # Static reference data modules
│   ├── document_generation/   # DOCX report builder (report_builder.js)
│   └── reporting/             # Incident analytics (incident_analyzer.js)
│
├── public/
│   ├── dashboard.html         # Single-page dashboard (~5,900 lines)
│   ├── app.js                 # Frontend logic (~2,700 lines)
│   └── styles.css             # Dashboard CSS
│
├── treat_data.js              # Data preprocessing — reads CSVs → norway_stats.json
├── ingest_to_mongo.js         # One-time seed script — loads all CSVs into MongoDB
├── generate_regional_contracts.js  # Generates regional contract JSON from source CSVs
├── Dockerfile                 # Node 20 Alpine + tini
├── docker-compose.yml         # App + MongoDB services
├── vercel.json                # Vercel deployment config (alternate deploy target)
└── railway.toml               # Railway deployment config (alternate deploy target)
```

---

## Data Sources

| Country | Source | Dataset | MongoDB Collection |
|---------|--------|---------|------------|
| Brazil | ANP (Agência Nacional do Petróleo) | Incident records, well registry, operator stats | `anp_records`, `anp_stats` |
| Brazil | Bureau Veritas / HAL contracts | HAL Tejas PBR exposure proxy | `hal_contracts` |
| Argentina | IAPG / HAL internal | Vaca Muerta contract registry (3,642 records) | `arg_contracts` |
| Mexico | SIH (hidrocarburos.gob.mx) | Perforación drilling metrics, production by basin | `mex_contracts` |
| Mexico | CompraNet / INFOMEX | PEMEX/CNH contract evidence records | `mex_contracts` |
| Norway | Sodir FactPages (NLOD licence) | NCS wellbore exploration — 2,186 records, 86 columns | `sodir_wellbores` |
| Norway | Havtil RNNP 2013–2025 | NCS barrier defects, HC releases, well control incidents | Static in `app.js` |
| Norway | HAL / CompraNet | NCS service contracts | `nor_contracts` |

---

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/` | Redirect to dashboard |
| GET | `/dashboard` | Serve `public/dashboard.html` |
| GET | `/api/health` | Health check → `{ status: "ok" }` |
| GET | `/api/data` | All ANP records (paginated: `?page=&limit=&type=&severity=`) |
| GET | `/api/hal-incidents` | HAL-specific incident records from MongoDB |
| GET | `/api/hal-stats` | Aggregated HAL incident statistics |
| GET | `/api/norway-incidents` | NCS incident records |
| GET | `/api/norway-contracts` | HAL Norway contract registry |
| GET | `/api/hal-contracts` | HAL Brazil contract registry |
| GET | `/api/mexico-contracts` | HAL Mexico contract registry (CompraNet evidence) |
| GET | `/api/argentina-contracts` | HAL Argentina contract registry (Vaca Muerta) |
| GET | `/api/mexico-metrics` | SIH Mexico drilling/production KPIs |
| GET | `/api/incidents` | Full incident registry (paginated) |
| GET | `/api/stats` | Global stats across all countries |
| GET | `/api/generate-report` | Generate + download DOCX compliance report |
| GET | `/api/sodir/wellbores` | NCS wellbore data (Redis-cached, falls back to MongoDB → live Sodir API) |
| GET | `/api/norway-stats` | Pre-aggregated Norway stats from `norway_stats.json` |

### Caching Strategy

Every MongoDB-backed endpoint checks **Upstash Redis** first (TTL 1–24h depending on data volatility). On cache miss, data is loaded from MongoDB and written back to Redis. If Redis is unconfigured, all calls go directly to MongoDB transparently.

---

## Dashboard Sections

The dashboard is a single HTML page with client-side section routing via `switchSection()`. Each section is a `<section id="section-{name}">` element shown/hidden via CSS. Navigation anchors use `#hash` routing.

### Navigation Map

| Hash | Section | Content |
|------|---------|---------|
| `#overview` | Global Overview | KPI summary cards, incident breakdown chart, global risk map |
| `#timeline` | Incident Timeline | Year-by-year incident trend chart |
| `#breakdown` | Breakdown | Incident type/severity breakdown charts |
| `#registry` | Registry | Full incident record table with search/filter |
| `#action` | Action Items | Compliance remediation action tracker |
| `#wells` | HAL BRZ | Brazil KPIs, well operations, intervention→failure mode, basin risk |
| `#crossanalysis` | BRZ Cross-Analysis | Brazil temporal overlap, contract domain charts |
| `#fullreport` | Full Report | DOCX generation, complete audit narrative |
| `#argentina-audit` | ARG Audit | ISO 37301 compliance posture, pillar assessments |
| `#argentina-registry` | ARG Registry | Argentina contract evidence table |
| `#argentina` | HAL ARG | Argentina KPIs, Vaca Muerta basin data |
| `#argentina-crossanalysis` | ARG Cross-Analysis | Contract vs. incident temporal overlap |
| `#mexico-audit` | MEX Audit | ISO 37301 posture, CNH/ASEA pillar assessments |
| `#mexico-registry` | MEX Registry | Mexico contract evidence table |
| `#mexico-crossanalysis` | MEX Cross-Analysis | SIH validation matrix, temporal overlap, contract evidence with Active Jobs filter |
| `#mexico` | HAL MEX | Mexico KPIs, basin risk, intervention mapping, regulatory table |
| `#norway-audit` | NOR Audit | ISO 37301 / NORSOK posture, Pillar 1–4 assessments |
| `#norway-registry` | NOR Registry | NCS field exposure table (sorted 2026 → past) |
| `#norway-crossanalysis` | NOR Cross-Analysis | NCS contract domain chart, temporal overlap, cross-table |
| `#norway` | HAL NOR | Norway KPIs, NCS fields, basin risk, intervention→failure mode, RNNP trend |
| `#latam-summary` | LATAM Summary | BRZ/ARG/MEX/NOR comparative summary |
| `#brazil-registry` | BRZ Registry | Brazil contract evidence table |

---

## Country Sections — Feature Matrix

### Brazil (BRZ) — `#wells` — Reference pattern for all country sections
- 6 KPI cards (ANP-sourced): Wells Drilled, Incidents, HPHT Wells, Deepwater %, Cementing Failures, Well Control Events
- Intervention → Failure Mode Mapping table (CSB-aligned categories)
- Basin → Risk Profile: Santos 🔴, Campos 🟡, Espírito Santo 🟢
- Cross-analysis: temporal overlap chart + contract domain chart
- DOCX report export via `/api/generate-report`

### Argentina (ARG) — `#argentina`
- 6 KPI cards (Vaca Muerta / IAPG data)
- 3,642 Vaca Muerta fracking records
- ISO 37301 Audit: Pillar 1–4 with progress indicators
- Contract registry with domain filter + search + pagination
- Cross-analysis: temporal overlap + contract domain chart

### Mexico (MEX) — `#mexico`
- 6 KPI cards (SIH estimated — flagged with `est.` badges + warning banner)
- Basin → Risk Profile: Sureste 🔴, Burgos 🟡, Tampico-Misantla 🟡, Veracruz 🟢
- Intervention → Failure Mode Mapping (HPHT/deepwater aligned)
- Regulatory table: 8 real CNH/ASEA/NOM/DOF regulations with source links (DOF, Lovdata-equivalent)
- Cross-analysis: SIH validation matrix, temporal overlap chart
- Contract evidence table: CompraNet records with domain filter + search + **🟢 Active Jobs (2026) toggle** (filters contracts with `fim` ≥ 2026-01-01)
- ISO 37301 Audit: Pillar 1–4 posture

### Norway (NOR) — `#norway`
- 6 KPI cards: NCS Wellbores (live Sodir), HC Releases, Barrier Defects (avg 442/yr RNNP), Serious Injuries, Maint Backlog, HAL NCS Contracts
- Data Context card: direct links to Sodir FactPages, Havtil RNNP, Lovdata Aktivitetsforskriften
- NCS Field Exposure table — 11 columns, sorted by last activity year (2026 → past):
  - Field, Area, Current Operator, Wellbores, Activity Period, Avg Water Depth, Content, Hazard Profile, NORSOK D-010 Ref, RNNP Ref, Source
  - DEEP badge (water depth > 200m), P&A count, content type badge (OIL/GAS color-coded)
- Basin → Risk Profile: North Sea 🔴, Norwegian Sea 🟡, Barents Sea 🟡
- Intervention → Failure Mode Mapping: 5 operations mapped to NORSOK D-010 §7 barrier elements
- RNNP Trend Chart: 2013–2025 barrier defects + HC releases (static RNNP-calibrated dataset)
- Annual Incident Trend table: 13 rows 2013–2025 — Total, Minor/Moderate/Severe, CSB Events, Kicks, BOP Tests, HC Releases, Loss of Control
- ISO 37301 + NORSOK Audit: Pillar 1–4 with Pillar 4 progress tracking
- Cross-analysis: contract domain chart, temporal overlap chart, NCS field cross-table

---

## Data Pipeline

### One-time MongoDB Seed

Run once on a fresh MongoDB instance. **Never run again** — it drops and re-inserts all collections.

```bash
MONGO_URL=mongodb://localhost:27017 node ingest_to_mongo.js
```

Loads all CSVs from `api/data/` into collections: `anp_records`, `anp_stats`, `hal_incidents`, `hal_contracts`, `mex_contracts`, `arg_contracts`, `nor_contracts`, `nor_incidents`, `sodir_wellbores`.

### Norway Stats Preprocessing

Run after updating the Sodir wellbore CSV to regenerate `norway_stats.json`:

```bash
node treat_data.js
```

Reads `api/data/wellbore_exploration_all.csv` (2,186 records, 86 columns) and writes `api/data/processed/norway_stats.json` with:
- Top 15 NCS fields by wellbore count
- Per-field enrichment: `count, firstYear, lastYear, topOperator, content, area, avgWaterDepth, avgTotalDepth, subsea, pa, producing, hazard, norsokRef, rnnpRef, source`
- Operator name normalization (15 legacy names → current brands, e.g. "Den norske stats oljeselskap a.s" → "Equinor (legacy Statoil)")
- Hazard profiles + NORSOK/RNNP cross-references from `FIELD_HAZARD` map

### Contract Generation

```bash
node generate_regional_contracts.js
```

Normalizes raw CSVs into structured contract JSON for ARG/MEX/NOR. Output fed into MongoDB via `ingest_to_mongo.js`.

---

## Deployment — VPS (Production)

**Server:** Ubuntu 24.04 · `root@46.202.93.157`
**App path:** `/opt/hal-tejas/`
**Runtime:** Docker Compose

### Containers

| Container | Image | Port |
|-----------|-------|------|
| `hal-tejas-app` | Built from `Dockerfile` (Node 20 Alpine + tini) | `3333:3333` |
| `hal-tejas-mongodb` | `mongo:latest` | `27017:27017` |

### Deploy — frontend-only changes

```bash
rsync -az --no-perms \
  -e "ssh -o PreferredAuthentications=keyboard-interactive,password -o PubkeyAuthentication=no" \
  ./public/ root@46.202.93.157:/opt/hal-tejas/public/

ssh root@46.202.93.157 "cd /opt/hal-tejas && docker compose restart app"
```

### Deploy — backend or full changes

```bash
rsync -az --exclude node_modules --exclude .git \
  -e "ssh -o PreferredAuthentications=keyboard-interactive,password -o PubkeyAuthentication=no" \
  ./ root@46.202.93.157:/opt/hal-tejas/

ssh root@46.202.93.157 "cd /opt/hal-tejas && docker compose up -d --build"
```

### Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `PORT` | No | App port (default 3333) |
| `NODE_ENV` | No | Set to `production` |
| `MONGO_URL` | Yes | MongoDB connection string |
| `UPSTASH_REDIS_REST_URL` | No | Upstash Redis endpoint |
| `UPSTASH_REDIS_REST_TOKEN` | No | Upstash Redis auth token |

---

## Git Branches

| Branch | Purpose |
|--------|---------|
| `main` | Merge target / PR base |
| `main-2` | Active development branch |
| `main-3` | Stable build — current production |

---

## Key Design Decisions

**Single-file frontend.** `dashboard.html` and `app.js` are large monolithic files. This avoids a build system entirely — deployment is a plain rsync with no npm build step on the server.

**Static RNNP dataset.** `NOR_TREND` in `app.js` is a 13-row static dataset calibrated against Havtil RNNP 2013–2025 reports. It is intentionally not overwritten by the Sodir wellbore API response, which contains wellbore counts (different data shape).

**Inference-based Mexico KPIs.** SIH does not publish HAL-specific metrics. All MEX KPIs are operator-level SIH data, tagged with `est.` badges and a warning banner.

**Redis as optional acceleration.** All endpoints degrade to MongoDB if Redis is unconfigured. No error is thrown — Redis is purely a performance layer.

**Norway stats as committed JSON.** `norway_stats.json` is committed to the repo (generated by `treat_data.js`). The `/api/norway-stats` endpoint reads from disk — no MongoDB query required for NCS field data, keeping cold-start latency low.

**Active Jobs filter (MEX).** The 🟢 Active Jobs toggle in the MEX cross-analysis contract table filters on `finSort >= 20260101`. Contracts with no end date (`finSort === 0`) are treated as ongoing and included.

---

## ISO 37301 Audit Coverage

Each country section includes a structured ISO 37301 Compliance Management System posture assessment:

| Pillar | Focus |
|--------|-------|
| 1 | Leadership & Governance |
| 2 | Risk Assessment & Obligations |
| 3 | Controls & Operational Procedures |
| 4 | Monitoring, Audit & Continuous Improvement |

Norway additionally maps against **NORSOK D-010** (Well Integrity) and **PSA regulations** (Aktivitetsforskriften, Styringsforskriften, Rammeforskriften).

---

## Regulatory Reference Map

| Country | Primary Regulators | Key Standards |
|---------|-------------------|---------------|
| Brazil | ANP, IBAMA, Bureau Veritas | ANP Resolution 46/2016, NR-37, NR-10 |
| Argentina | IAPG, Secretaría de Energía | Res. SE 25/2004, Decreto 1738/92 |
| Mexico | CNH, ASEA, SENER, DOF | Lineamientos de Perforación CNH, NOM-115-SEMARNAT, NOM-138-SEMARNAT/SS-2003, ASEA Integridad de Ductos, Ley de Hidrocarburos Art. 40–43, NOM-001-SESH-2010 |
| Norway | Havtil (PSA), Lovdata | NORSOK D-010, PSA Aktivitetsforskriften §88, Styringsforskriften §8, Rammeforskriften §19 |
