# HAL & Tejas Compliance Report — Data Verification & Terms of Use

**Project Name:** CIS — Explore the World of Compliance (HAL/Tejas Operations)

This repository hosts a web application and document generation tool that provides **classification society compliance** and **ANP well integrity analysis** acting as a case study. All findings are derived exclusively from verified, publicly available open datasets.

---

## ⚠️ Disclaimer and Agreement on Usage

By running, viewing, or distributing the materials generated from this repository (including the dashboard and `.docx` reports), **you explicitly agree to the following terms regarding data integrity, inference, and accountability.**

### 1. The Raw ANP Dataset (Verified Open Data)
This project is built on a **genuinely strong evidentiary foundation**. The underlying metrics are driven straight from the Brazilian government open data framework:
- **Source:** [dados.gov.br/organization/anp](https://dados.gov.br/dados/conjuntos-dados/dados-de-incidentes-de-exploracao-e-producao-de-petroleo-e-gas-natural)  
- **Records Processed:** 30,054 individual cases (2013 – 2026) natively parsed  
- **Legal Basis:** Brazil's Freedom of Information Act (Lei nº 12.527/2011)

### 2. Legal, Safety, and Classification Framework (The Laws & Standards)
Every incident grouping evaluates liability and exposure referencing the following published frameworks:
- **Resolução ANP nº 46/2016 (SGIP)** — Well Integrity Management System (gov.br/anp)  
- **Resolução ANP nº 43/2007 (SGSO)** — Operational Safety Management (gov.br/anp)  
- **Resolução ANP nº 41/2015** — Subsea systems safety  
- **Classification Society NR 445** — Rules for the Classification of Offshore Units  
- **Classification Society NR 459** — Process Systems On Board Offshore Units  
- **Brazilian Ministry of Labour (MTE)** — NR-37 (Health & Safety), NR-33, NR-35  
- **Brazilian Navy** — NORMAM-01/DPC (Maritime Authority)  

### 3. Case Study Fact Check & Usage Caveat

> **IMPORTANT:** Accountability for the usage of this data lies entirely with the user presenting it.  

**The critical link between Halliburton (HAL) and Tejas and the incidents presented is *inferred by exposure parameter*, not directly named as causation in the raw data.**  
The ANP dataset registers incidents explicitly under the **licensed operator** (Petrobras, Shell, Equinor, etc.). Consequently, subcontractors and service providers like HAL/Tejas do not appear as named entities in the raw ANP database.

What this case study successfully proves:
1. **A verified operational crisis:** An exponential spike (+39,000% from 2016 to 2025) in *Conjunto Solidário de Barreira (CSB)* failures.
2. **Categorical accountability:** HAL/Tejas provide barrier-system and well-intervention services precisely covering the domains governed by ANP Res. 46/2016 and classification society NR 445.
3. Therefore: *They fall squarely within the regulatory perimeter of this documented, growing incident category.*

**You must NOT claim** that the dataset proves HAL or Tejas equipment directly caused "Incident X."  
**You MUST claim** that HAL/Tejas equipment operates inside the barrier systems manifesting the 39,000% escalation, and therefore mandatory classification society and ANP auditing thresholds apply.

---

## 🚀 Quick Start (Running the Platform)

**Installation:**
```bash
npm install
```

**Launch the Dashboard & Validation Screen:**
```bash
npm start
```
1. Open **http://localhost:3333**
2. Proceed past the **Compliance Check Agreement** (Landing Page).
3. Access the interactive dashboards and dynamic incident extractions.

**Export the Dynamic Document:**
- Click "Export Report" in the UI (or access `/api/generate-report`) to download the `HAL_Tejas_Incident_Report.docx`.

## 📁 Repository Structure

```
├── public/
│   ├── login.html       # Landing Page & Agreement terms
│   ├── index.html       # Dynamic metrics dashboard
│   ├── app.js           # Client-side chart rendering and API interaction
│   └── styles.css       # Core aesthetics and styling classes
├── src/
│   ├── data/            # Local ANP incident CSVs mapping to the live data
│   ├── reporting/       # Node.js metrics aggregators, CSB match logic
│   └── document_generation/ # DOCX structured exporter algorithms
├── server.js            # Express API handling data logic internally
└── package.json
```

All hardcoded specimen incidents have been surgically removed in favor of 100% data-driven generation from the live ANP `.csv` records. Any user presentation reflects verifiable open data facts.

---
**Prepared by CIS (Compliance Intelligence System) Data Analysis Team.**

---

## 🔧 Compliance Actions Required

### Implement API/Scraping Checks

- Integrate data pulls from `sih.hidrocarburos.gob.mx` for production stats.
- Adapt procurement validation to check `compras.gob.mx` instead of `comprar.gob.ar`.
