# Methodology Rigor Framework
## HAL Tejas Compliance Intelligence Platform

---

## Why This Level of Granularity Was Required

This is not a data visualization project. It is a **forensic compliance intelligence instrument** built to operate at the standards expected by institutional energy sector stakeholders — regulators, legal counsel, investment committees, and audit bodies. At that level, every number on a page either has a traceable source or it does not belong on the page. There is no middle ground.

The granularity present in this platform exists because the domain it operates in demands it.

---

## The Institutional Standard

The oil and gas compliance space operates under a specific epistemic contract: **claims must be falsifiable and sourced**. Havtil publishes RNNP reports not as estimates but as audited annual statistics. Sodir publishes wellbore data under the Norwegian Licence for Open Government Data (NLOD) — a legal open-data framework, not a best-effort disclosure. ANP Brazil, CNH Mexico, ASEA, and Lovdata Norway each represent regulatory authorities whose data carries legal weight.

Any analysis built on top of these sources inherits that weight — and therefore must be held to the same evidentiary standard. A figure presented without a source citation in this context is not just imprecise. It is a liability.

---

## The Inference Problem

The central analytical challenge in oilfield service compliance is that **no public registry directly links a service company to a specific failure event**. Havtil does not publish "Halliburton cemented well X and barrier element Y failed." ANP does not name the completion vendor in its incident logs. CNH does not attribute drilling fluid losses to a specific mud supplier.

This is the standard architecture of regulatory disclosure globally: operators are the named responsible party; service companies are contracted agents whose accountability must be constructed through a chain of inference.

Building a defensible inference chain requires three things to be simultaneously true:

1. **Contractual presence must be established** from verifiable procurement or registry data — confirming the service company was engaged, in what domain, and during what period.
2. **The failure category must map cleanly to the service domain** — not generally, but specifically, with reference to the technical standard (NORSOK D-010, ANP Resolution 46/2016, etc.) that defines the barrier element in question.
3. **The inference must be labeled as inference** — never presented as direct attribution where direct attribution does not exist in the source data.

Failing any one of these three conditions produces a report that cannot withstand scrutiny. At a board level, at a legal review level, or at a regulatory audit level, an undisclosed inference is indistinguishable from fabrication.

---

## Why Verification at the Field Level

Aggregate statistics — national incident counts, industry-wide HC release rates, operator-level well counts — are necessary context. They are not sufficient evidence. The reason this platform operates at the field level (Troll, Oseberg, Johan Sverdrup, Vaca Muerta, Santos Basin, Sureste) rather than at the country level is that **exposure is localized**.

A service company's accountability is not proportional to its country-level market share. It is proportional to its presence in the specific fields, during the specific periods, where specific failure categories were recorded. That is the unit of analysis that matters to a legal team, an insurance underwriter, or an ISO 37301 audit panel.

Staying at the aggregate level would produce a report that looks rigorous but proves nothing. Descending to the field level — with contract windows, operator relationships, and RNNP barrier categories mapped to specific well types — is what converts the analysis from context into evidence.

---

## Why Explicit Uncertainty Labeling

Every data point in this platform is classified into one of three epistemic states:

- **Verified (✓):** Directly sourced from an official dataset — Sodir API, Havtil RNNP annual report, ANP open data, CompraNet, SESCO. The source is cited inline.
- **Inferred (est.):** Derived from a logical chain applied to verified data — for example, operator-domain assignments based on Sodir's wellbore operator registry where no direct contract-client linkage exists in available data.
- **Modelled:** Estimated proportionally from a verified reference series — for example, RNNP barrier defect counts for 2013–2023, modelled against the 2024–2025 sourced actuals.

This classification is not a disclaimer. It is the methodology. A report that conflates these three categories — presenting modelled data as verified, or inference as confirmed attribution — will fail the first serious challenge it faces. At the institutional level this platform targets, that failure is not recoverable.

---

## The Standard Being Applied

The rigor applied here reflects what is expected in contexts where decisions have material consequences:

- **Investment due diligence** at the asset or operator level requires source-traceable ESG and compliance exposure data.
- **Legal proceedings** involving service company liability require a defensible chain of evidence, not a statistical narrative.
- **Regulatory audit** under ISO 37301 requires documented methodology, not conclusions.
- **Insurance underwriting** for offshore operations requires field-level exposure quantification, not country-level averages.

Each of these contexts has a different primary user and a different threshold for evidence. This platform is built to satisfy all of them simultaneously — which is why the methodology cannot be relaxed at any point in the chain.

---

## What This Is Not

This platform is not a news article. It is not an industry report. It is not a data dashboard in the conventional sense. It is a **structured compliance intelligence instrument** — built to the standard where every assertion is backed by a cited source, every inference is labeled as such, every gap in the available data is documented rather than filled with assumption, and the entire analytical chain can be reconstructed by an independent auditor from the sources referenced.

That is the standard. Everything in the platform exists to meet it.

---

*HAL Tejas Compliance Intelligence Platform · Confidential · Not for public distribution*