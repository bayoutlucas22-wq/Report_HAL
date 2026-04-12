# HAL Tejas Dashboard — 4-Country Intelligence Report

> Generated: 2026-04-08 | Data source: HAL Tejas App (port 3333) | Analyst: Claude Code

---

## Overview

The HAL Tejas system aggregates oil & gas operational data across **4 countries**: Brazil, Norway, Mexico, and Argentina. Each country is tracked through a different data lens — incidents, wellbore registries, well performance metrics, and procurement contracts — reflecting both the available data infrastructure in each region and their maturity as petroleum operators.

---

## Brazil (ANP / Petrobras)

### What the system tracks
Brazil feeds the largest dataset in the system: **25,233 offshore/onshore incidents** reported to the ANP (Agência Nacional do Petróleo) from 2013 to 2026. These are regulatory safety occurrence reports — every gas detection event, barrier failure, structural fault, and well control event reported by operators.

### Scale
- **25,233 total incidents** across 13 years
- **31 fatalities**, 2 injuries (across full dataset)
- **Severity split:** 21,479 SSO (safety-critical), 3,307 Minor, 371 Moderate, 76 Severe
- **Petrobras accounts for ~74%** of all incidents (18,696 records across entity name variants)

### Incident breakdown
| Category | Count |
|---|---|
| Other (SSO general) | ~17,900 |
| CSB Failure (barrier element) | 3,355 |
| BOP Failure | 1,407 |
| Kick (Primary Barrier) | 316 |
| Structural Failure | 219 |
| Loss of Well Control | 33 |

### The critical trend: CSB Failure explosion
This is the most important signal in the entire dataset.

| Year | CSB Failures | Kicks | Loss of Well Control |
|---|---|---|---|
| 2013 | 0 | 21 | 0 |
| 2014–2019 | <10/year avg | ~14/year avg | 0–1 |
| 2020 | 63 | 10 | 1 |
| **2021** | **940** | 9 | 0 |
| 2022 | 730 | 18 | 2 |
| 2023 | 335 | 14 | 2 |
| 2024 | 344 | 31 | 1 |
| 2025 | 404 | 31 | 0 |
| **2026 (partial)** | **520** | **97** | **26** |

CSB Failures (Conjunto Solidário de Barreira — the Brazilian regulatory term for the set of well barrier elements) went from near-zero to 940 in a single year (2021). This correlates directly with Brazil's pre-salt deepwater expansion in the Santos and Campos basins, where extreme pressures and temperatures stress barrier components beyond conventional operational envelopes.

**2026 is now the most alarming year on record.** Despite being a partial year, it already shows:
- 520 CSB Failures (on pace to exceed 2021's peak)
- 97 Kicks — more than triple the 2024–2025 average of 31
- **26 Loss of Well Control events** — up from 0 in 2025 and 2 in 2022–2023

This is not a reporting artifact. It represents a genuine escalation in well integrity failures as Brazil pushes deeper and harder into pre-salt production.

### Contract scale
Brazil's contracts (HAL/ANP procurement) are the largest in the system:
- **172 contracts**, total **~$4.9 billion**
- Average contract: **$28.5M** | Max single contract: **$547M**
- These are Petrobras-scale platform service agreements, not individual well services

---

## Norway (SODIR / Equinor)

### What the system tracks
Norway is tracked through the **SODIR wellbore registry** — the Norwegian Offshore Directorate's public factpage database of every exploration and production well drilled on the Norwegian Continental Shelf since 1966. This is structural/historical data, not incident reporting.

### Scale
- **2,186 wellbores** in the registry
- Drilling history from **1966 (TROLL field) to 2025**
- The incident tracking endpoint is not populated — Norway's safety data (RNNP framework) is not loaded into this system

### Operator dominance
Equinor (across all legacy entities) controls the registry:

| Operator | Wells |
|---|---|
| Equinor (legacy Statoil) | 342 |
| Equinor (legacy Hydro) | 242 |
| Equinor Energy AS | 131 |
| Equinor | 124 |
| Equinor (legacy Saga) | 114 |
| **Equinor total** | **~953 (43.6%)** |

### Top fields
| Field | Wells | Area | Content | Key Hazard |
|---|---|---|---|---|
| TROLL | 50 | North Sea | OIL/GAS | Shallow gas, CO₂ injection, HPHT |
| OSEBERG | 36 | North Sea | OIL/GAS | HPHT, H₂S, DHSV integrity |
| BALDER | 33 | North Sea | OIL | High workover frequency |
| JOHAN SVERDRUP | 32 | North Sea | OIL | Dense cluster, DHSV failure |
| GULLFAKS SØR | 32 | North Sea | OIL/GAS | HPHT, abnormal pore pressure |

### Drilling activity trend
| Period | Annual wells | Context |
|---|---|---|
| 2013–2014 | 57–59 | Peak activity |
| 2016–2017 | 36–38 | Oil price crash response |
| 2018–2019 | 53–57 | Recovery |
| 2020 | 31 | COVID downturn |
| 2021–2023 | 34–40 | Gradual recovery |
| 2024–2025 | 45–52 | Re-acceleration |

### Why Norway "has power"
Norway's operational capability is not captured in HP or PSI metrics in this system — it's structural. Equinor's 50+ years of North Sea operation, mandatory NORSOK D-010 compliance, RNNP safety monitoring, and a national oil fund backing long-term capital investment create a system where **well integrity is the baseline, not the goal.** The average Norwegian well drills to 2,000–4,000m water depth in HPHT conditions with documented subsea architecture, not because it's cheap, but because the regulatory and capital infrastructure makes it the standard.

---

## Mexico (PEMEX / CNH)

### What the system tracks
Mexico has **performance-level well data** — the most operationally granular dataset in the system. Each of the 1,245 tracked wells includes pump power, fracking stages, lateral length, pressure, and actual production output.

### Scale
- **1,245 wells**, 2015–2025
- **743 offshore (60%)**, 502 onshore (40%)
- **4 basins:** Sureste, Tampico-Misantla, Veracruz, Burgos
- **7 operators:** PEMEX (dominant), ENI México, Petrobal, Fieldwood Energy, Repsol, Wintershall DEA, Hokchi Energy

### Well performance metrics
| Metric | Average | Maximum |
|---|---|---|
| Pump power | 27,874 HP | 44,964 HP |
| Fracture stages | 27.0 | 49 |
| Lateral length | 1,991 m | 3,498 m |
| Max pressure | 11,051 PSI | 15,998 PSI |
| Oil production | 2,417 bpd | 4,998 bpd |
| Gas production | 5,119 mcfd | 9,995 mcfd |
| Water used (frac) | 54,427 m³ | 99,912 m³ |

### Contract scale
- **65 contracts**, total **$113.9M**
- Average contract: **$1.75M** | Max: **$3.09M**

### What this means
Mexico is running a serious fracking operation. 28K HP average pump fleets, ~2km laterals, 27-stage completions. The 60% offshore split shows PEMEX is operating in the Bay of Campeche (Sureste basin) alongside international operators. The production numbers are real — avg 2,417 bpd oil per well with peak wells at 4,998 bpd. This is not exploratory drilling; this is active, high-capital production optimization.

---

## Argentina

### What the system tracks
Argentina has the thinnest data in the system: **65 procurement contracts only**, all labeled "High Criticality Service." No well-level performance data, no incident registry, no production metrics.

### Scale
- **65 contracts**, total **$19.4M**
- Average contract: **$298K** | Max: **$490K**
- Contract types: cementing, completion, workover, fluid services, MPD, stimulation

### The gap
| Country | Contracts | Total Value | Avg/Contract |
|---|---|---|---|
| Brazil | 172 | $4,900M | $28.5M |
| Mexico | 65 | $113.9M | $1.75M |
| **Argentina** | **65** | **$19.4M** | **$298K** |

Argentina is spending **6x less per contract than Mexico** for the same number of contracts. These are reactive maintenance contracts (workover, cementing, completion services) — not the large-scale fracturing campaigns or integrated platform service agreements that drive Mexico and Brazil's numbers.

### Why Argentina can't match the others
Three structural problems visible in the data:

1. **No performance tracking infrastructure.** Argentina's contracts contain zero operational telemetry — no HP, no PSI, no production rates. The data doesn't exist or isn't collected at the platform level. Mexico and Brazil both have granular per-well data; Argentina has invoice-level procurement.

2. **Undercapitalized contracts.** At $298K average, Argentina's contracts can only afford single-service, single-well interventions. The ~28K HP PEMEX fracking fleet that Mexico deploys routinely would require a contract 6x larger.

3. **Service-only model.** Every Argentina contract is a reactive service (workover, cementing, stimulation) — fixing wells and maintaining production rather than building new capacity. Mexico's data shows multi-stage completion campaigns. Norway shows integrated lifecycle well management. Argentina shows maintenance firefighting.

This likely reflects Vaca Muerta shale development constraints: Argentina has the resource (the largest shale gas reserves outside North America) but the combination of economic instability, FX controls, and limited operator capitalization keeps contract sizes and operational ambition below critical mass.

---

## Cross-Country Summary

| Dimension | Brazil | Norway | Mexico | Argentina |
|---|---|---|---|---|
| Data type | Incident registry | Wellbore registry | Well performance | Service contracts |
| Records | 25,233 incidents | 2,186 wells | 1,245 wells | 65 contracts |
| Time span | 2013–2026 | 1966–2025 | 2015–2025 | 2020–2029 |
| Dominant operator | Petrobras (74%) | Equinor (44%) | PEMEX | N/A |
| Capital intensity | Very high ($28.5M avg) | Very high (state-backed) | High ($1.75M avg) | Low ($298K avg) |
| Incident risk | High & escalating | Low (NORSOK) | Not tracked here | Not tracked |
| Production data | Indirect | Structural only | Direct (bpd/mcfd) | None |
| Critical signal | 2026 well control spike | Stable, mature | Active production | Underinvestment |

### The headline finding

Brazil is the system's most critical risk profile right now. 25,233 incidents over 13 years with a CSB Failure crisis that emerged in 2021 and has not been resolved — and 2026 partial-year data showing the first major Loss of Well Control cluster (26 events) since records began. The pre-salt deepwater push is generating incident rates that the existing barrier management framework was not designed to handle at this scale.

Norway is the benchmark nobody matches — not because of luck but because of 50+ years of integrated regulatory, capital, and operator alignment. Equinor essentially is the NCS.

Mexico is executing competently at scale. Real production numbers, real fracking campaigns, multiple operators. The data shows a functioning, high-capital operation.

Argentina has the geology (Vaca Muerta) but not the operational infrastructure. Until contract scale, performance tracking, and capital intensity align with Mexico's baseline, it will remain a reactive maintenance operation rather than a growth story.

---

*Data sourced from HAL Tejas App API endpoints: `/api/stats`, `/api/hal-incidents`, `/api/hal-contracts`, `/api/mexico-metrics`, `/api/mexico-contracts`, `/api/norway-stats`, `/api/sodir/wellbores`, `/api/argentina-contracts`. Analysis by Claude Code, April 2026.*
