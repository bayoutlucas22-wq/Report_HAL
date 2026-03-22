# HAL Tejas Incident Report — Bureau Veritas & ANP

Open source research into ANP open data. A web application for the HAL Tejas Incident Report, providing Bureau Veritas compliance and ANP well integrity analysis. Browse report data and generate DOCX exports.

## Quick Start

```bash
npm install
npm start
```

Then open **http://localhost:3333** in your browser.

## Features

- **Web interface** — View executive summary, metrics, incident trends, sample incidents, and regulatory framework
- **DOCX export** — One-click download of the full report as a Word document
- **Traceability** — Links to ANP, Bureau Veritas, and international open data sources

## Scripts

| Command | Description |
|---------|-------------|
| `npm start` | Start the web app server (port 3333) |
| `npm run generate` | Generate DOCX report via CLI (saves to project root) |

## Project Structure

```
├── public/           # Frontend (HTML, CSS, JS)
├── src/
│   ├── data/         # ANP, BV, regulatory data
│   ├── document_generation/   # DOCX builders
│   └── reporting/    # Incident analysis & tables
├── server.js         # Express API & report generation
├── main.js           # CLI report generation
└── package.json
```

## API Endpoints

- `GET /api/data` — JSON data for metrics, trends, incidents, regulations, sources
- `GET /api/generate-report` — Download HAL_Tejas_Incident_Report.docx

## GitHub Pages (Static)

The `docs/` folder is configured for GitHub Pages. To deploy:

1. Push to GitHub
2. Repo → **Settings** → **Pages** → Source: **Deploy from a branch**
3. Branch: **main**, Folder: **/docs** → Save

Site will be at: `https://<username>.github.io/HAL_Tejas_Bveritas/`

To refresh the DOCX in docs: `npm run build:static`

## Data Sources

All findings are traceable to official open sources:

- **ANP SISO-Incidentes** — 30,054 records (2013–2026), dados.gov.br
- **Bureau Veritas** — NR 445, NR 459, NR 493, IVBS-BRA
- **Brazilian regulations** — NR-37, NR-33, NR-35, NORMAM-01
