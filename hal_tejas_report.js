  numbering: {
    config: [
      {
        reference: "bullets",
        levels: [{
          level: 0, format: LevelFormat.BULLET, text: "\u2022", alignment: AlignmentType.LEFT,
          style: { paragraph: { indent: { left: 720, hanging: 360 } } }
        }]
      }
    ]
  },
  styles: {
    default: { document: { run: { font: "Arial", size: 22 } } },
    paragraphStyles: [
      {
        id: "Heading1", name: "Heading 1", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { size: 32, bold: true, font: "Arial", color: "1F4E79" },
        paragraph: { spacing: { before: 360, after: 160 }, outlineLevel: 0 }
      },
      {
        id: "Heading2", name: "Heading 2", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { size: 26, bold: true, font: "Arial", color: "2E74B5" },
        paragraph: { spacing: { before: 280, after: 120 }, outlineLevel: 1 }
      }
    ]
  },
  sections: [{
    properties: {
      page: {
        size: { width: 12240, height: 15840 },
        margin: { top: 1440, right: 1260, bottom: 1260, left: 1260 }
      }
    },
    headers: {
      default: new Header({
        children: [
          new Paragraph({
            children: [
              new TextRun({ text: "HAL Tejas Incident Report — BV Compliance & ANP Incident Analysis", size: 18, font: "Arial", color: "1F4E79", bold: true }),
              new TextRun({ text: "    |    CONFIDENTIAL", size: 18, font: "Arial", color: "C00000" }),
            ],
            border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: "1F4E79", space: 1 } },
            spacing: { after: 80 }
          })
        ]
      })
    },
    footers: {
      default: new Footer({
        children: [
          new Paragraph({
            children: [
              new TextRun({ text: "Source: ANP SISO-Incidentes Open Data (dados.gov.br) | Bureau Veritas Rules (marine-offshore.bureauveritas.com) | Page ", size: 16, font: "Arial", color: "888888" }),
              new TextRun({ children: [PageNumber.CURRENT], size: 16, font: "Arial", color: "888888" }),
              new TextRun({ text: " of ", size: 16, font: "Arial", color: "888888" }),
              new TextRun({ children: [PageNumber.TOTAL_PAGES], size: 16, font: "Arial", color: "888888" }),
            ],
            border: { top: { style: BorderStyle.SINGLE, size: 4, color: "CCCCCC", space: 1 } },
            spacing: { before: 80 },
            alignment: AlignmentType.CENTER
          })
        ]
      })
    },
    children: [

      // ─── COVER ───────────────────────────────────────────────────────────────
      new Paragraph({
        children: [new TextRun({ text: "", size: 48 })],
        spacing: { before: 720, after: 0 }
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [new TextRun({ text: "HAL TEJAS INCIDENT REPORT", bold: true, size: 52, font: "Arial", color: "1F4E79" })],
        spacing: { before: 480, after: 200 }
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [new TextRun({ text: "Bureau Veritas Compliance Framework & ANP Well Integrity Incident Analysis", size: 30, font: "Arial", color: "2E74B5" })],
        spacing: { before: 80, after: 160 }
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        border: { bottom: { style: BorderStyle.SINGLE, size: 8, color: "1F4E79", space: 1 } },
        children: [new TextRun({ text: "", size: 22 })],
        spacing: { before: 80, after: 320 }
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [new TextRun({ text: "Operation: Halliburton & Tejas — Brazil", size: 26, font: "Arial", color: "333333", bold: true })],
        spacing: { before: 200, after: 80 }
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [new TextRun({ text: "Jurisdiction: Agência Nacional do Petróleo, Gás Natural e Biocombustíveis (ANP)", size: 22, font: "Arial", color: "555555" })],
        spacing: { before: 60, after: 60 }
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [new TextRun({ text: "Classification Society: Bureau Veritas (BV)", size: 22, font: "Arial", color: "555555" })],
        spacing: { before: 60, after: 60 }
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [new TextRun({ text: "Report Date: March 2026", size: 22, font: "Arial", color: "555555" })],
        spacing: { before: 60, after: 60 }
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [new TextRun({ text: "Data Source: ANP SISO-Incidentes (30,054 records, 2013–2026)", size: 22, font: "Arial", color: "888888", italics: true })],
        spacing: { before: 160, after: 60 }
      }),
      new Paragraph({ children: [new PageBreak()] }),

      // ─── SECTION 1: EXECUTIVE SUMMARY ────────────────────────────────────────
      h1("1. Executive Summary"),
      p("This report establishes the regulatory and operational compliance framework applicable to Halliburton and Tejas operations in Brazil, and provides evidence-based justification for the identified risk exposure, grounded entirely in publicly available open data from official Brazilian government sources."),
      spacer(),
      p("The analysis draws on the ANP's SISO-Incidentes database — 30,054 registered incidents from 2013 to 2026, published under Brazil's Freedom of Information Law (Lei nº 12.527/2011) — cross-referenced with Bureau Veritas classification rules and applicable Brazilian regulatory instruments."),
      spacer(),
      h3("Key Findings"),
      bullet("CSB (Conjunto Solidário de Barreira) barrier element failures rose from 1 incident in 2016 to 391 in 2025 — a 39,000% increase — constituting the dominant well integrity risk category in Brazilian E&P."),
      bullet("193 primary barrier loss events (kicks) were recorded between 2013 and 2026 on ANP-licensed installations."),
      bullet("2,291 critical well integrity incidents in total are documented in the open dataset."),
      bullet("Halliburton's well services and Tejas's completion/flow-control equipment operate within the barrier systems captured by these statistics, making compliance with Resolução ANP nº 46/2016 and BV NR 445 directly applicable."),
      spacer(),
      new Paragraph({ children: [new PageBreak()] }),

      // ─── SECTION 2: INCIDENT METRICS ─────────────────────────────────────────
      h1("2. ANP Incident Data — Key Metrics"),
      p("The following metrics are derived directly from the ANP's open incident datasets (incidentes.csv and incidentes-tipo.csv), available at dados.gov.br/organization/anp."),
      spacer(),
      makeMetricTable(),
      spacer(),
      p("Note: Halliburton and Tejas do not appear as named entities in the ANP dataset because ANP registers incidents under the licensed operator (e.g., Petrobras, Shell, Equinor). Service companies such as Halliburton and Tejas operate within those operators' installations and are therefore captured within the incident statistics for the barrier systems they service.", { italics: true, color: "555555" }),
      spacer(),
      new Paragraph({ children: [new PageBreak()] }),

      // ─── SECTION 3: INCIDENT TREND ───────────────────────────────────────────
      h1("3. Well Integrity Incident Trend (2013–2026)"),
      p("The table below presents the year-by-year breakdown of the most critical incident types directly relevant to the scope of Halliburton and Tejas services. Shaded rows (2020 onwards) highlight the acceleration period for CSB failures."),
      spacer(),
      makeTrendTable(),
      spacer(),
      p("(*) 2026 data is partial — dataset covers through early Q1 2026.", { italics: true, color: "888888" }),
      spacer(),
      p("The exponential rise in CSB barrier element failures from 2020 onwards correlates with the expansion of mature field operations and increased workover/intervention activity — the exact service segment in which Halliburton and Tejas are active."),
      spacer(),
      new Paragraph({ children: [new PageBreak()] }),

      // ─── SECTION 4: SAMPLE INCIDENTS ─────────────────────────────────────────
      h1("4. Sample Incidents from ANP Open Dataset"),
      p("The following incidents are drawn directly from the ANP SISO-Incidentes open database and are representative of the failure modes relevant to this operation. All records are publicly citable under Lei nº 12.527/2011."),
      spacer(),
      makeIncidentTable(),
      spacer(),
      p("Full dataset available at: dados.gov.br/organization/agencia-nacional-do-petroleo-gas-natural-e-biocombustiveis-anp", { color: "2E74B5", italics: true }),
      spacer(),
      new Paragraph({ children: [new PageBreak()] }),

      // ─── SECTION 5: REGULATORY FRAMEWORK ─────────────────────────────────────
      h1("5. Applicable BV Standards & Brazilian Regulations"),
      p("The table below maps each applicable standard to its scope and direct relevance to HAL/Tejas operations, along with the official open-access source for independent verification."),
      spacer(),
      makeRegTable(),
      spacer(),
      new Paragraph({ children: [new PageBreak()] }),

      // ─── SECTION 6: OPEN DATA SOURCES ────────────────────────────────────────
      h1("6. Open Data Sources — Traceability Map"),
      p("All findings in this report are traceable to the following official open sources. Each source is freely accessible and suitable for use in audits, regulatory submissions, and technical justification documents."),
      spacer(),

      h2("6.1 ANP — Agência Nacional do Petróleo"),
      pBold("SISO-Incidentes Dataset", "dados.gov.br/organization/anp — 30,054 records (2013–2026), published under Lei nº 12.527/2011"),
      pBold("Resolução ANP nº 46/2016 (SGIP)", "gov.br/anp — Well Integrity Management System; mandatory for all E&P licensees"),
      pBold("Resolução ANP nº 43/2007 (SGSO)", "gov.br/anp — Operational Safety Management System for drilling and production"),
      pBold("Resolução ANP nº 41/2015", "gov.br/anp — Subsea systems safety management"),
      spacer(),

      h2("6.2 Bureau Veritas"),
      pBold("NR 445 — Classification of Offshore Units", "marine-offshore.bureauveritas.com/nr445 — Free download; governs structural, machinery, and safety systems on all BV-classed units"),
      pBold("NR 459 — Process Systems on Offshore Units", "marine-offshore.bureauveritas.com — Applies to completion and well control process systems"),
      pBold("NR 493 — Mooring Systems", "marine-offshore.bureauveritas.com — Applicable to floating units"),
      pBold("IVBS-BRA Notation", "marine-offshore.bureauveritas.com — Brazil-specific independent verification bridging ANP, DPC, NR-37, and IBAMA requirements"),
      spacer(),

      h2("6.3 Brazilian Ministry of Labour & Maritime Authority"),
      pBold("NR-37 (MTE)", "trabalho.gov.br — Health and safety standard for all personnel on offshore platforms"),
      pBold("NR-33 / NR-35 (MTE)", "trabalho.gov.br — Confined space and work-at-height"),
      pBold("NORMAM-01/DPC", "marinha.mil.br/dpc — Maritime Authority safety regulations for vessels and crew"),
      spacer(),

      h2("6.4 International Cross-References"),
      pBold("BSEE Offshore Incident Statistics (US)", "bsee.gov/stats-facts/offshore-incident-statistics — Global precedent for analogous failure modes"),
      pBold("HSE UK Hydrocarbon Release Database", "hse.gov.uk/offshore/hydrocarbon-releases — International benchmark for leak and well control events"),
      spacer(),
      new Paragraph({ children: [new PageBreak()] }),

      // ─── SECTION 7: JUSTIFICATION LANGUAGE ───────────────────────────────────
      h1("7. Recommended Justification Language"),
      p("The following text can be used verbatim in regulatory submissions, audit responses, or project risk assessments to justify knowledge of failure modes:"),
      spacer(),
      new Paragraph({
        children: [new TextRun({
          text: '"The failure modes identified in this analysis are documented in the ANP\'s public E&P incident database (SISO-Incidentes, 30,054 records, 2013–2026 — available at dados.gov.br/organization/anp under Lei de Acesso a Informacao, Lei no 12.527/2011). CSB barrier element failures rose from 1 incident in 2016 to 391 in 2025, representing the dominant well integrity risk category in Brazilian E&P. Since Halliburton and Tejas operate as service companies on installations licensed to ANP operators, their equipment and services fall within the barrier systems captured by these statistics, making compliance with Resolucao ANP no 46/2016 (SGIP) and Bureau Veritas NR 445 directly and mandatorily applicable."',
          size: 20, font: "Arial", color: "333333", italics: true
        })],
        spacing: { before: 120, after: 120 },
        alignment: AlignmentType.JUSTIFIED,
        indent: { left: 720, right: 720 },
        border: { left: { style: BorderStyle.SINGLE, size: 12, color: "1F4E79", space: 1 } }
      }),
      spacer(),

      // ─── SECTION 8: DISCLAIMER ────────────────────────────────────────────────
      h1("8. Disclaimer & Data Notes"),
      bullet("This report is based exclusively on publicly available open data sources. No confidential or proprietary information has been used."),
      bullet("Incident counts reflect records in the ANP SISO-Incidentes dataset as downloaded. Reclassified incidents may appear under multiple type categories."),
      bullet("Year 1900 entries in the dataset (2,719 records) represent incidents with missing or unparseable dates and are excluded from year-on-year trend analysis."),
      bullet("The dataset covers incidents reported by E&P operators holding ANP contracts; service company activities are subsumed under the responsible operator."),
      bullet("All BV rules cited are publicly available for free download at marine-offshore.bureauveritas.com."),
      spacer(),
      spacer(),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [new TextRun({ text: "— End of Report —", size: 22, font: "Arial", color: "888888", italics: true })],
        spacing: { before: 480 }
      })
    ]
  }]
});

Packer.toBuffer(doc).then(buffer => {
  fs.writeFileSync("/home/claude/HAL_Tejas_Incident_Report.docx", buffer);
  console.log("Done");
});
