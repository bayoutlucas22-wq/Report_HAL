# HAL Tejas Incident Intelligence Dashboard

## Overview
The **HAL Tejas Incident Intelligence Dashboard** is a web-based compliance analysis application tailored for operational intelligence and incident review. It tracks, parses, and visualizes compliance and security incident data stemming from regional databases—specifically focusing on Brazil (ANP data), Mexico (Perforation & Production data), and broader Halliburton incident histories.

The primary purpose of the application is to empower safety engineers, auditors, and stakeholders to investigate operational anomalies (such as Critical Safety Barrier (CSB) failures, BOP closures, and Kicks), measure compliance against rigorous regulations (e.g., ANP Resolutions, Bureau Veritas, MTE norms), and export findings into formal, audit-ready Document (DOCX) reports.

## Project Architecture & Tech Stack

This project uses a monolithic client-server architecture centered around **Node.js**:
- **Backend:** Express.js (`api/server.js`) acting as the API handler, with endpoints that serve CSV-aggregated statistics, database entries, and dynamically generated summary reports.
- **Frontend:** Vanilla HTML/CSS/JS (`public/`), incorporating dashboards like `dashboard.html` that pull from the internal APIs to render metrics and analytical comparisons visually. It uses standard browser technologies to maintain an audit-friendly layout.
- **Reporting Engine:** Uses `docx` to automatically generate Word documents combining textual summaries, statistical trends, and regional risk metrics straight out of the data pipelines.
- **Deployment:** The application is packaged and configured for **Vercel** (`vercel.json`), utilizing serverless functions to parse data blocks on demand and rewrite URL routes seamlessly.

## Directory Structure

```
.
├── api/
│   ├── server.js          # Main Express API and Server definitions
│   ├── data_store.js      # Consolidated JSON/Array data loader from flat CSV files
│   ├── data/              # Mexico dataset CSVs and other runtime processed files
│   └── docs/              # Location of generated documents or knowledge summary files
├── public/
│   ├── index.html         # Application landing/login page
│   ├── dashboard.html     # Main interface grid for intel tracking and compliance charts
│   ├── app.js             # Frontend API ingestion and interactive DOM rendering
│   └── styles.css         # Styling, including specialized dashboard formatting and blur overlays
├── src/
│   ├── data/              # Core Raw Datasets (ANP incidents, HAL regional incidents)
│   ├── document_generation/ # Internal DOCX structure builders for compliance summary exports
│   └── reporting/         # Incident filtering, sorting, and analytical helper functions
├── package.json           # Node script registry and dependency index
└── vercel.json            # Vercel deployment configuration, function routing and static paths
```

## How It Works (The Data Flow)

1. **Information Ingestion:** The `api/data_store.js` and `parseIncidentesCSV` handlers in `server.js` read local `.csv` files provided via `src/data` or `api/data` upon initialization. It cross-references raw reporting codes to categorize failures contextually (e.g., 'CSB Failure', 'BOP Failure', 'Structural').
2. **Analysis APIs:** The server exposes multiple clean API endpoints (e.g., `/api/data`, `/api/hal-incidents`, `/api/mexico-metrics`, `/api/stats`) that paginate and summarize this data cleanly.
3. **Frontend Dashboarding:** The `public/dashboard.html` page executes `public/app.js`, dynamically querying and mapping the server endpoints to UI components (charts, lists, verification blocks). Security protocols dictate certain sections (like LATAM Summary) may use blur effects depending on authorization states.
4. **Data Export:** The user can request an automated report which triggers the `/api/generate-report` endpoint, invoking the `docx` library to compile the current memory state into a beautifully formatted `HAL_Tejas_Incident_Report.docx` file.

## Focus of Recent Optimization
Based on recent workflows, work has been revolving around:
- Integrating regional module parity (Brazil, Mexico, Argentina intelligence tabs).
- Enforcing structural reporting validations (e.g., Inference Summaries).
- Hardening the application layout structure (fixing responsive clips, adding/removing 'LOCK' overlay states on compliance summaries for active audit reviews).
- Finalizing the operational API mappings behind Vercel serverless domains to prevent routing errors in productions.
