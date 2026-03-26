const { Table, TableRow, TableCell, Paragraph, TextRun, AlignmentType, BorderStyle, WidthType, ShadingType, VerticalAlign } = require("docx");

const border = { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC" };
const borders = { top: border, bottom: border, left: border, right: border };
const headerBorder = { style: BorderStyle.SINGLE, size: 1, color: "1F4E79" };
const headerBorders = { top: headerBorder, bottom: headerBorder, left: headerBorder, right: headerBorder };

// ── Regulatory reference data (static — these are real regulations, not generated) ──
const REG_DATA = [
  ["ANP Resolution No. 46/2016 (SGIP)", "Well integrity management", "Halliburton & Tejas equipment in barrier systems", "gov.br/anp"],
  ["ANP Resolution No. 43/2007 (SGSO)", "Operational safety management", "All E&P service operations", "gov.br/anp"],
  ["BV NR 445", "Classification of offshore units", "Units where services are performed", "marine-offshore.bureauveritas.com"],
  ["BV NR 459", "Process systems on offshore units", "Completion & well control systems", "marine-offshore.bureauveritas.com"],
  ["NR-37 (MTE)", "Health & safety on offshore platforms", "All personnel on licensed installations", "trabalho.gov.br"],
  ["NORMAM-01/DPC", "Maritime safety – vessels & crew", "Marine vessels supporting operations", "marinha.mil.br/dpc"],
  ["ISO 9001 / ISO 17025", "QA/QC & laboratory accreditation", "Equipment certification & testing", "iso.org"],
];

// ── Dynamic metric table — driven by live ANP stats object ──
function makeMetricTable(stats) {
  if (!stats) throw new Error("makeMetricTable requires live ANP stats — no hardcoded fallback.");

  const METRICS = [
    { label: "Total ANP Records (SISO)", value: (stats.total || 0).toLocaleString("pt-BR"), color: "1F4E79" },
    { label: "CSB Barrier Element Failures", value: (stats.csbCount || 0).toLocaleString("pt-BR"), color: "C00000" },
    { label: "Kicks (Primary Barrier Loss)", value: (stats.kickCount || 0).toLocaleString("pt-BR"), color: "C55A11" },
    { label: "Structural & Well Control", value: (stats.structCount || 0).toLocaleString("pt-BR"), color: "375623" },
  ];

  const cellStyle = (label, value, color) => new TableCell({
    borders,
    width: { size: 2340, type: WidthType.DXA },
    shading: { fill: "EBF3FB", type: ShadingType.CLEAR },
    margins: { top: 120, bottom: 120, left: 160, right: 160 },
    verticalAlign: VerticalAlign.CENTER,
    children: [
      new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: value, bold: true, size: 36, font: "Arial", color })] }),
      new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: label, size: 18, font: "Arial", color: "555555" })], spacing: { before: 40 } })
    ]
  });

  return new Table({
    width: { size: 9360, type: WidthType.DXA },
    columnWidths: [2340, 2340, 2340, 2340],
    rows: [new TableRow({ children: METRICS.map(m => cellStyle(m.label, m.value, m.color)) })]
  });
}

// ── Regulatory table (static — it's real published regulations) ──
function makeRegTable() {
  const hCell = (text, width) => new TableCell({
    borders: headerBorders, width: { size: width, type: WidthType.DXA },
    shading: { fill: "1F4E79", type: ShadingType.CLEAR },
    margins: { top: 80, bottom: 80, left: 120, right: 120 },
    children: [new Paragraph({ children: [new TextRun({ text, bold: true, size: 20, font: "Arial", color: "FFFFFF" })] })]
  });
  const dCell = (text, width, shade = "FFFFFF") => new TableCell({
    borders, width: { size: width, type: WidthType.DXA },
    shading: { fill: shade, type: ShadingType.CLEAR },
    margins: { top: 80, bottom: 80, left: 120, right: 120 },
    children: [new Paragraph({ children: [new TextRun({ text, size: 20, font: "Arial", color: "333333" })] })]
  });

  const widths = [2600, 2200, 2600, 1960];
  return new Table({
    width: { size: 9360, type: WidthType.DXA }, columnWidths: widths,
    rows: [
      new TableRow({ children: [hCell("Standard / Regulation", widths[0]), hCell("Scope", widths[1]), hCell("Applicability to HAL / Tejas", widths[2]), hCell("Open Source", widths[3])] }),
      ...REG_DATA.map((row, i) => new TableRow({ children: row.map((text, j) => dCell(text, widths[j], i % 2 === 0 ? "FFFFFF" : "F5F9FF")) }))
    ]
  });
}

// ── Incident table — driven by real ANP records passed in ──
function makeIncidentTable(records) {
  if (!records || !records.length) throw new Error("makeIncidentTable requires real ANP records — no hardcoded fallback.");

  const hCell = (text, width) => new TableCell({
    borders: headerBorders, width: { size: width, type: WidthType.DXA },
    shading: { fill: "C00000", type: ShadingType.CLEAR },
    margins: { top: 80, bottom: 80, left: 120, right: 120 },
    children: [new Paragraph({ children: [new TextRun({ text, bold: true, size: 18, font: "Arial", color: "FFFFFF" })] })]
  });
  const dCell = (text, width, shade = "FFFFFF") => new TableCell({
    borders, width: { size: width, type: WidthType.DXA },
    shading: { fill: shade, type: ShadingType.CLEAR },
    margins: { top: 80, bottom: 80, left: 120, right: 120 },
    children: [new Paragraph({ children: [new TextRun({ text: String(text || "—"), size: 18, font: "Arial", color: "333333" })] })]
  });

  const widths = [1000, 900, 1400, 1400, 3400, 1260];
  return new Table({
    width: { size: 9360, type: WidthType.DXA }, columnWidths: widths,
    rows: [
      new TableRow({ children: [hCell("Incident No.", widths[0]), hCell("Year", widths[1]), hCell("Operator", widths[2]), hCell("Category", widths[3]), hCell("Description (from ANP record)", widths[4]), hCell("Status", widths[5])] }),
      ...records.map((r, i) => new TableRow({ children: [
        dCell(r.numero, widths[0], i % 2 === 0 ? "FFFFFF" : "FFF5F5"),
        dCell(r.year || "N/D", widths[1], i % 2 === 0 ? "FFFFFF" : "FFF5F5"),
        dCell((r.empresa || "").substring(0, 20), widths[2], i % 2 === 0 ? "FFFFFF" : "FFF5F5"),
        dCell(r.category, widths[3], i % 2 === 0 ? "FFFFFF" : "FFF5F5"),
        dCell((r.descricao || "").substring(0, 90) + "…", widths[4], i % 2 === 0 ? "FFFFFF" : "FFF5F5"),
        dCell(r.situacao || "—", widths[5], i % 2 === 0 ? "FFFFFF" : "FFF5F5"),
      ]}))
    ]
  });
}

// ── Trend table — driven by live HAL year series from ANP ──
function makeTrendTable(halYearSeries, yearSeries) {
  if (!halYearSeries) throw new Error("makeTrendTable requires live ANP year series — no hardcoded fallback.");

  const hCell = (text, width) => new TableCell({
    borders: headerBorders, width: { size: width, type: WidthType.DXA },
    shading: { fill: "2E74B5", type: ShadingType.CLEAR },
    margins: { top: 80, bottom: 80, left: 80, right: 80 },
    children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text, bold: true, size: 18, font: "Arial", color: "FFFFFF" })] })]
  });
  const dCell = (text, width, shade, bold = false) => new TableCell({
    borders, width: { size: width, type: WidthType.DXA },
    shading: { fill: shade, type: ShadingType.CLEAR },
    margins: { top: 60, bottom: 60, left: 80, right: 80 },
    children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: String(text), size: 18, font: "Arial", color: bold ? "C00000" : "333333", bold })] })]
  });

  const widths = [1200, 2700, 2700, 2760];
  const rows = [new TableRow({ children: [hCell("Year", widths[0]), hCell("HAL/Tejas Relevant Incidents", widths[1]), hCell("Total ANP Incidents", widths[2]), hCell("Source", widths[3])] })];

  halYearSeries.forEach(y => {
    const shade = parseInt(y.year) >= 2020 ? "FFF5F5" : "FFFFFF";
    const totalForYear = (yearSeries || []).find(s => s.year === y.year)?.count || 0;
    rows.push(new TableRow({ children: [
      dCell(y.year, widths[0], shade),
      dCell(y.count.toLocaleString("pt-BR"), widths[1], shade, y.count > 100),
      dCell(totalForYear.toLocaleString("pt-BR"), widths[2], shade),
      dCell("ANP SISO-Incidentes", widths[3], shade),
    ]}));
  });

  return new Table({ width: { size: 9360, type: WidthType.DXA }, columnWidths: widths, rows });
}

// ── JSON exports for API — all driven by real data ──
function getMetrics(stats) {
  if (!stats) return [];
  return [
    { label: "Total HAL/Tejas Relevant Incidents", value: stats.total.toLocaleString("pt-BR"), color: "1F4E79" },
    { label: "CSB Barrier Failures", value: stats.csbCount.toLocaleString("pt-BR"), color: "C00000" },
    { label: "Kicks reported", value: stats.kickCount.toLocaleString("pt-BR"), color: "C55A11" },
    { label: "Structural & Well Control", value: stats.structCount.toLocaleString("pt-BR"), color: "375623" },
  ];
}

function getRegData() { return REG_DATA; }

// Returns real ANP records formatted for the API — no fabricated entries
function getIncidents(records) {
  if (!records || !records.length) return [];
  return records.map(r => ({
    no:          r.numero,
    operator:    r.empresa,
    date:        r.data,
    type:        r.category,
    description: r.descricao || "—",
    status:      r.situacao || "—",
    year:        r.year,
  }));
}

function getTrendData(halYearSeries, yearSeries) {
  if (!halYearSeries) return [];
  return halYearSeries.map(y => ({
    year:      y.year,
    halCount:  y.count,
    total:     (yearSeries || []).find(s => s.year === y.year)?.count || 0,
    highlight: y.count > 100,
  }));
}

module.exports = {
  makeMetricTable,
  makeRegTable,
  makeIncidentTable,
  makeTrendTable,
  getMetrics,
  getRegData,
  getIncidents,
  getTrendData,
};
