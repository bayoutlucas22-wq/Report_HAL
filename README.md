# Global Operational Integrity & Regulatory Alignment Framework — Executive Summary

## Project Overview
A premium, company-agnostic intelligence platform designed to monitor, verify, and cross-analyze operational incidents and regulatory compliance across global energy hubs. The dashboard integrates diverse data streams—from official government registries to inferred operational footprints—to provide a high-fidelity view of service company risk and historical performance.

## Regional Modules & Data Strategy

### 🇧🇷 Brazil (Active Market Leader)
*   **Source:** ANP (SGIP/SGSO), Portal da Transparência, Petrobras disclosures.
*   **Scale:** 172 HAL contracts, ~$4.9B valuation.
*   **Nuance:** Highly transparent via ANP mandates. Includes "Tier 1" direct naming and "Tier 2" contract-gated inference based on keyword intersection in official filings.

### 🇳🇴 Norway (High-Tech / Mature Footprint)
*   **Source:** Havtil (PSA), Sodir (FactPages), RNNP annual series.
*   **Scale:** 147 HAL contracts (196 total records), ~$6.8B valuation.
*   **Inference Model:** Expanded beyond a narrow procurement dataset (2020-2026) to include MSA-level records inferred through temporal and spatial overlap with Sodir exploration wellbore data (2010–2026).
*   **Focus:** Core barrier element failure peaks (NORSOK D-010).

### 🇸🇦 Saudi Arabia (KSA Partnership)
*   **Source:** Aramco Sustainability disclosures, Tadawul, Global Energy Intelligence.
*   **Scale:** Integrated as the "Anchor Profile" for financial resilience.
*   **Focus:** Capital intensity, infrastructure-centric financial modeling, and safety frameworks (Aramco Safety System).

### 🇲🇽 Mexico (Operational Risk)
*   **Source:** CNH, SIH Hidrocarburos, CompraNet.
*   **Scale:** 65 contract milestones across Burgos, Sureste, and Tampico-Misantla basins.
*   **Status:** Awaiting integration of direct ASEA SARAS incident feeds (currently jurisdictionally restricted).

### 🇦🇷 Argentina (Unconventional Assets)
*   **Source:** SESCO, COMPR.AR, SE 25/2004, IAPG.
*   **Scale:** Structured compliance workflow for Vaca Muerta (Neuquina Basin) operations.
*   **Alignment:** ISO 37301 Compliance Management framework.

## Key Features
*   **Operational Maturity Matrix:** Global comparative benchmarking across regulatory transparency, safety frameworks, and capital intensity.
*   **Portfolio Intelligence:** Cross-analysis of commercial footprint vs. official failure trends.
*   **Validation Tiering:** 
    *   **Tier 1:** Direct, verbatim naming in official government incident reports.
    *   **Tier 2:** Probability-weighted inference based on confirmed contract presence in affected domains/fields.

## Technical Architecture
*   **Frontend:** Vanilla JS, CSS (Premium Light Slate aesthetic), Chart.js 4.4.
*   **Backend:** Node.js API (Express), MongoDB (Incident Persistence), Redis (Cache Warming).
*   **Data Pipeline:** Automated CSV/JSON ingestion from Sodir, ANP, and CNH feeds.

## Recent Updates
*   Purged non-functional UI elements (placeholder progress trackers).
*   Corrected global data counts for Norway to reflect a more realistic MSA-level footprint (~147 contracts).
*   Verified and fixed all Brazil data source links to ensure direct access to SGIP/SGSO sets.

---
*Confidential — Internal Strategy & Compliance Validation Platform*
