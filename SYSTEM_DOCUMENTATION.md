# HAL Tejas Incident Intelligence Dashboard — System Documentation

## 1. System Architecture
The dashboard is a full-stack Node.js application designed to process and visualize large-scale incident and contract data from regional regulators.

### Core Stack
- **Backend**: Node.js/Express
- **Database**: MongoDB (Persistent store)
- **Cache**: Upstash Redis (Serverless hot cache - optional)
- **Frontend**: Vanilla JavaScript (SPA architecture), Chart.js for visualizations.
- **Deployment**: Dockerized (Application + MongoDB).

---

## 2. Data Pipeline & Logic
The system transforms raw regional data into actionable compliance evidence.

### Step 1: Data Ingestion (`treat_data.js`)
- **Brazil (ANP)**: Processes 32,240+ incident records. Maps Portuguese keywords (e.g., *conjunto solidário*) to global risk categories like **CSB Failure**.
- **Norway (Sodir)**: Processes NCS wellbore data, assigning hazard profiles (e.g., HPHT, CO2 injection) based on well parameters.
- **Mexico (CNH/SIH)**: Ingests production and drilling intensity as a risk exposure proxy.

### Step 2: Database Seeding (`ingest_to_mongo.js`)
- Standardizes diverse CSV formats into unified JSON schemas.
- Seeds MongoDB collections: `hal_incidents`, `hal_contracts`, `mex_contracts`, `arg_contracts`, `nor_contracts`, `sodir_wellbores`.

### Step 3: API Layer (`api/server.js`)
- Implements a **three-tier caching strategy**:
  1. **Hot (Redis)**: Instant response for common queries.
  2. **Warm (MongoDB)**: Standard database access.
  3. **Cold (Local JSON)**: Fallback for environments without DB access.

---

## 3. Dashboard Section Breakdown (25 Sections)

### Brazil Track (ANP Framework)
1. **Executive Summary**: High-level risk narrative and aggregate failure counts.
2. **Timeline / Trend**: Visual progression of critical failures.
3. **Failure Breakdown**: Categorical analysis of CSB, Kick, and Structural events.
4. **Action Items**: Checklist for compliance against BV NR 445 and ANP Res. 46.
5. **Compliance Matrix**: Grid mapping ISO standards to operational failures.
6. **Cross-Analysis**: Dynamic matrix of Service Domains vs. ANP failure types.
7. **Full Report**: Auto-generated narrative with regulatory text callouts.
8. **NCS Wells**: Exploration well registry for Norway-sourced standards.
9. **BRZ Registry**: The master incident database with searchable records.

### Argentina Track (SESCO / COMPR.AR)
10. **ARG Audit**: Footprint of Vaca Muerta operations.
11. **ARG Registry**: Contract-specific evidence records.
12. **ARG Cross-Analysis**: Matrix of HAL services vs. SESCO fracking categories.
13. **ARG Contracts**: Deep dive into individual contract criticality.

### Mexico Track (CNH / SIH)
14. **MEX Audit**: Drilling intensity metrics from CNH open data.
15. **MEX Registry**: Operational well/job registry (20 records per page).
16. **MEX Cross-Analysis**: HAL Domain vs. SIH drilling hazard matrix.
17. **MEX Contracts**: Mexico-specific procurement evidence.

### Norway Track (Sodir / RNNP)
18. **NOR Audit**: RNNP integrity stats and field hazard profiles.
19. **NOR Registry**: NCS incident database filterable by field names.
20. **NOR Cross-Analysis**: Barrier compliance matrix using NORSOK D-010 standards.
21. **NOR Contracts**: NCS service contract evidence records.

### Summary & Infrastructure
22. **LATAM Summary**: Combined risk view for Brazil, Argentina, and Mexico.
23. **Saudi Registry**: (Placeholder) Future operational track.
24. **Inference Methodology**: Technical note on how failure probabilities are calculated.
25. **Data Sources**: Reference list for all external open-data portals.

---

## 4. Deployment & Operation (VPS)
- **Docker Compose**: Orchestrates the `app` and `mongodb` containers.
- **Makefile**: Provides shortcuts for `make setup` (install + treat + ingest), `make start`, and `make logs`.
- **"No-Date" Policy**: The UI excludes temporal filters to maintain a focus on categorical risk density across the entire dataset.
