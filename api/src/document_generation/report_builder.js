const { Paragraph, TextRun, PageBreak, AlignmentType, BorderStyle, Header, Footer, PageNumber, Table, TableRow, TableCell, WidthType, ShadingType, VerticalAlign } = require("docx");
const { h1, h2, h3, p, pBold, bullet, spacer } = require("./doc_elements");
const { anpData, bureauVeritasData, mteDpcData, internationalRefs } = require("../data/anp_data");
const { makeRegTable } = require("../reporting/incident_analyzer"); // Keep static reg table only

function fmt(n) { return (n || 0).toLocaleString('pt-BR'); }

function buildReportSections(stats, sampleIncidents) {
  // ── Dynamic Table Generators Helpers ─────────────
  const border = { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC" };
  const borders = { top: border, bottom: border, left: border, right: border };
  const headerBorder = { style: BorderStyle.SINGLE, size: 1, color: "1F4E79" };
  const headerBorders = { top: headerBorder, bottom: headerBorder, left: headerBorder, right: headerBorder };

  function makeDynamicMetricTable() {
    const cellStyle = (label, value, color) => new TableCell({
      borders, width: { size: 2340, type: WidthType.DXA },
      shading: { fill: "EBF3FB", type: ShadingType.CLEAR },
      margins: { top: 120, bottom: 120, left: 160, right: 160 },
      verticalAlign: VerticalAlign.CENTER,
      children: [
        new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: value, bold: true, size: 36, font: "Arial", color })] }),
        new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: label, size: 16, font: "Arial", color: "555555" })], spacing: { before: 40 } })
      ]
    });
    return new Table({
      width: { size: 9360, type: WidthType.DXA }, columnWidths: [2340, 2340, 2340, 2340],
      rows: [new TableRow({
        children: [
          cellStyle("Total Incidents (SISO)", fmt(stats.total), "1F4E79"),
          cellStyle("CSB Failures (All)", fmt(stats.csbCount), "C00000"),
          cellStyle("Registered Kicks", fmt(stats.kickCount), "C55A11"),
          cellStyle("Structural/Well Failures", fmt(stats.structCount), "375623")
        ]
      })]
    });
  }

  function makeDynamicTrendTable() {
    const hCell = (text, width) => new TableCell({
      borders: headerBorders, width: { size: width, type: WidthType.DXA }, shading: { fill: "2E74B5", type: ShadingType.CLEAR },
      margins: { top: 80, bottom: 80, left: 80, right: 80 },
      children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text, bold: true, size: 16, font: "Arial", color: "FFFFFF" })] })]
    });
    const dCell = (text, width, shade, bold = false) => new TableCell({
      borders, width: { size: width, type: WidthType.DXA }, shading: { fill: shade, type: ShadingType.CLEAR },
      margins: { top: 60, bottom: 60, left: 80, right: 80 },
      children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text, size: 16, font: "Arial", color: bold ? "C00000" : "333333", bold })] })]
    });

    const widths = [1200, 2400, 2400, 1680, 1680];
    const rows = [new TableRow({ children: [hCell("Ano", widths[0]), hCell("Integridade Total (CSB, Kick...)", widths[1]), hCell("Total Geral ANP", widths[2])] })];

    stats.halYearSeries.forEach(y => {
      const yearStr = y.year;
      const countHal = fmt(y.count);
      const countTotal = fmt(stats.yearSeries.find(s => s.year === yearStr)?.count || 0);
      const shade = parseInt(yearStr) >= 2020 ? "FFF5F5" : "FFFFFF";

      rows.push(new TableRow({
        children: [
          dCell(yearStr, widths[0], shade),
          dCell(countHal, widths[1], shade, y.count > 100),
          dCell(countTotal, widths[2], shade)
        ]
      }));
    });
    return new Table({ width: { size: 9360, type: WidthType.DXA }, columnWidths: widths, rows });
  }

  function makeDynamicIncidentTable() {
    const hCell = (text, width) => new TableCell({
      borders: headerBorders, width: { size: width, type: WidthType.DXA }, shading: { fill: "C00000", type: ShadingType.CLEAR },
      margins: { top: 80, bottom: 80, left: 120, right: 120 },
      children: [new Paragraph({ children: [new TextRun({ text, bold: true, size: 16, font: "Arial", color: "FFFFFF" })] })]
    });
    const dCell = (text, width, shade = "FFFFFF") => new TableCell({
      borders, width: { size: width, type: WidthType.DXA }, shading: { fill: shade, type: ShadingType.CLEAR },
      margins: { top: 80, bottom: 80, left: 120, right: 120 },
      children: [new Paragraph({ children: [new TextRun({ text, size: 16, font: "Arial", color: "333333" })] })]
    });

    const widths = [1000, 1200, 1000, 1400, 2800, 1960];
    const rows = [new TableRow({ children: [hCell("Incidente", widths[0]), hCell("Ano", widths[1]), hCell("Empresa", widths[2]), hCell("Modo Falha", widths[3]), hCell("Descrição", widths[4]), hCell("Status", widths[5])] })];

    sampleIncidents.forEach((r, i) => {
      rows.push(new TableRow({
        children: [
          dCell(r.numero, widths[0], i % 2 === 0 ? "FFFFFF" : "FFF5F5"),
          dCell(r.year || "N/D", widths[1], i % 2 === 0 ? "FFFFFF" : "FFF5F5"),
          dCell(r.empresa.substring(0, 15), widths[2], i % 2 === 0 ? "FFFFFF" : "FFF5F5"),
          dCell(r.category, widths[3], i % 2 === 0 ? "FFFFFF" : "FFF5F5"),
          dCell((r.descricao || "").substring(0, 80) + "...", widths[4], i % 2 === 0 ? "FFFFFF" : "FFF5F5"),
          dCell(r.situacao, widths[5], i % 2 === 0 ? "FFFFFF" : "FFF5F5")
        ]
      }));
    });
    return new Table({ width: { size: 9360, type: WidthType.DXA }, columnWidths: widths, rows });
  }

  return {
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
              new TextRun({ text: "Industry Incident Report — Classification Society Compliance & ANP Incident Analysis", size: 18, font: "Arial", color: "1F4E79", bold: true }),
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
              new TextRun({ text: "Source: ANP SISO-Incidentes Open Data (dados.gov.br) | Classification Society Rules | Page ", size: 16, font: "Arial", color: "888888" }),
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

      // --- COVER ---------------------------------------------------------------
      new Paragraph({
        children: [new TextRun({ text: "", size: 48 })],
        spacing: { before: 720, after: 0 }
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [new TextRun({ text: "INDUSTRY INCIDENT REPORT", bold: true, size: 52, font: "Arial", color: "1F4E79" })],
        spacing: { before: 480, after: 200 }
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [new TextRun({ text: "Classification Society Compliance Framework & ANP Well Integrity Incident Analysis", size: 30, font: "Arial", color: "2E74B5" })],
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
        children: [new TextRun({ text: "Operation: Industry Incidence Rport — Brazil", size: 26, font: "Arial", color: "333333", bold: true })],
        spacing: { before: 200, after: 80 }
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [new TextRun({ text: "Jurisdiction: National Petroleum Agency, Gás Natural e Biocombustíveis (ANP)", size: 22, font: "Arial", color: "555555" })],
        spacing: { before: 60, after: 60 }
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [new TextRun({ text: "Classification Society: Applicable CS Standards", size: 22, font: "Arial", color: "555555" })],
        spacing: { before: 60, after: 60 }
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [new TextRun({ text: "Report Date: March 26, 2026", size: 22, font: "Arial", color: "555555" })],
        spacing: { before: 60, after: 60 }
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [new TextRun({ text: "Data Source: ANP SISO-Incidentes (30,054 records, 2013–2026)", size: 22, font: "Arial", color: "888888", italics: true })],
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 100, after: 600 },
        children: [new TextRun({ text: "Study Data Cut-off Date: March 26, 2026", size: 22, font: "Arial", color: "C00000", bold: true })],
        spacing: { before: 160, after: 60 }
      }),
      new Paragraph({ children: [new PageBreak()] }),

      // --- SECTION 1: EXECUTIVE SUMMARY ----------------------------------------
      h1("1. Executive Summary"),
      p("This report establishes the regulatory and operational compliance framework applicable to Halliburton operations in Brazil, and provides evidence-based justification for the identified risk exposure, grounded entirely in publicly available open data from official Brazilian government sources."),
      spacer(),
      p("The analysis draws on the ANP\'s SISO-Incidentes database — 30,054 registered incidents from 2013 to March 26, 2026, published under Brazil\'s Freedom of Information Law (Lei nº 12.527/2011) — cross-referenced with classification society rules and applicable Brazilian regulatory instruments."),
      spacer(),
      h3("Key Findings"),
      bullet("CSB (Conjunto Solidário de Barreira) barrier element failures rose from 1 incident in 2016 to 391 in 2025 — a 39,000% increase — constituting the dominant well integrity risk category in Brazilian E&P. Incidents are not adjusted for historical market penetration of supplier equipment, such as valves."),
      bullet("193 primary barrier loss events (kicks) were recorded between 2013 and March 26, 2026 on ANP-licensed installations."),
      bullet("2,291 critical well integrity incidents in total are documented in the open dataset."),
      bullet("Halliburton\'s well services and Tejas\'s completion/flow-control equipment operate within the barrier systems captured by these statistics, making compliance with Resolução ANP nº 46/2016 and BV NR 445 directly applicable."),
      spacer(),
      new Paragraph({ children: [new PageBreak()] }),

      // --- SECTION 2: INCIDENT METRICS -----------------------------------------
      h1("2. ANP Incident Data — Key Metrics (Live Dashboard Extraction)"),
      p("The following metrics are derived dynamically from the full ANP open incident dataset (30,054 cross-referenced records), reflecting exactly what is computed in the real-time HAL/Tejas Intelligence Dashboard."),
      spacer(),
      makeDynamicMetricTable(),
      spacer(),
      p("Note: This table was generated automatically using the active `incidentes.csv` matching records classified under CSB/Kick/Structural parameters.", { italics: true, color: "555555" }),
      spacer(),
      new Paragraph({ children: [new PageBreak()] }),

      // --- SECTION 3: INCIDENT TREND -------------------------------------------
      h1("3. Well Integrity Trend (Dynamic Year-by-Year)"),
      p("The table below dynamically aggregates the specific well integrity modes of failure tracked by the HAL/Tejas compliance algorithms calculated on the live API layer."),
      spacer(),
      makeDynamicTrendTable(),
      spacer(),
      spacer(),
      p("The exponential rise in CSB barrier element failures from 2020 onwards correlates with the expansion of mature field operations and increased workover/intervention activity — the exact service segment in which Halliburton and Tejas are active."),
      spacer(),
      new Paragraph({ children: [new PageBreak()] }),

      // --- SECTION 4: SAMPLE INCIDENTS -----------------------------------------
      h1("4. Critical Incidents Sample Extraction"),
      p("The following incidents are a real-time extraction of the most high-severity integrity failure events classified as CSB, Kick, or Structural."),
      spacer(),
      makeDynamicIncidentTable(),
      spacer(),
      spacer(),
      new Paragraph({ children: [new PageBreak()] }),

      // --- SECTION 5: REGULATORY FRAMEWORK -------------------------------------
      h1("5. Applicable Classification Standards & Brazilian Regulations"),
      p("The table below maps each applicable standard to its scope and direct relevance to HAL/Tejas operations, along with the official open-access source for independent verification."),
      spacer(),
      makeRegTable(),
      spacer(),
      new Paragraph({ children: [new PageBreak()] }),

      // --- SECTION 6: OPEN DATA SOURCES ----------------------------------------
      h1("6. Open Data Sources — Traceability Map"),
      p("All findings in this report are traceable to the following official open sources. Each source is freely accessible and suitable for use in audits, regulatory submissions, and technical justification documents."),
      spacer(),

      h2("6.1 ANP — National Petroleum Agency"),
      pBold("SISO-Incidentes Dataset", anpData.sisoIncidentes.description),
      pBold("ANP Resolution No. 46/2016 (SGIP)", anpData.resolucao46.description),
      pBold("ANP Resolution No. 43/2007 (SGSO)", anpData.resolucao43.description),
      pBold("ANP Resolution No. 41/2015", anpData.resolucao41.description),
      spacer(),

      h2("6.2 Classification Society Standards"),
      pBold("NR 445 — Classification of Offshore Units", bureauVeritasData.nr445.description),
      pBold("NR 459 — Process Systems on Offshore Units", bureauVeritasData.nr459.description),
      pBold("NR 493 — Mooring Systems", bureauVeritasData.nr493.description),
      pBold("IVBS-BRA Notation", bureauVeritasData.ivbsBra.description),
      spacer(),

      h2("6.3 Brazilian Ministry of Labour & Maritime Authority"),
      pBold("NR-37 (MTE)", mteDpcData.nr37.description),
      pBold("NR-33 / NR-35 (MTE)", mteDpcData.nr33_35.description),
      pBold("NORMAM-01/DPC", mteDpcData.normam01.description),
      spacer(),

      h2("6.4 International Cross-References"),
      pBold("BSEE Offshore Incident Statistics (US)", internationalRefs.bsee.description),
      pBold("HSE UK Hydrocarbon Release Database", internationalRefs.hseUk.description),
      spacer(),
      new Paragraph({ children: [new PageBreak()] }),

      // --- SECTION 7: JUSTIFICATION LANGUAGE -----------------------------------
      h1("7. Recommended Justification Language"),
      p("The following text can be used verbatim in regulatory submissions, audit responses, or project risk assessments to justify knowledge of failure modes:"),
      spacer(),
      new Paragraph({
        children: [new TextRun({
          text: "\"The failure modes identified in this analysis are documented in the ANP\'s public E&P incident database (SISO-Incidentes, 30,054 records, 2013 – March 26, 2026 — available at dados.gov.br/organization/anp under Lei de Acesso a Informacao, Lei no 12.527/2011). CSB barrier element failures rose from 1 incident in 2016 to 391 in 2025, representing the dominant well integrity risk category in Brazilian E&P. Since Halliburton and Tejas operate as service companies on installations licensed to ANP operators, their equipment and services fall within the barrier systems captured by these statistics, making compliance with Resolucao ANP no 46/2016 (SGIP) and classification society NR 445 directly and mandatorily applicable.\"",
          size: 20, font: "Arial", color: "333333", italics: true
        })],
        spacing: { before: 120, after: 120 }
      }),
      spacer(),
    ],
  };
}

module.exports = { buildReportSections };
