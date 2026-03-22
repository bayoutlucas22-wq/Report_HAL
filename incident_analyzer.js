const { Table, TableRow, TableCell, Paragraph, TextRun, AlignmentType, BorderStyle, WidthType, ShadingType, VerticalAlign } = require("docx");

const border = { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC" };
const borders = { top: border, bottom: border, left: border, right: border };
const headerBorder = { style: BorderStyle.SINGLE, size: 1, color: "1F4E79" };
const headerBorders = { top: headerBorder, bottom: headerBorder, left: headerBorder, right: headerBorder };

function makeMetricTable() {
  const cellStyle = (label, value, color) => new TableCell({
    borders,
    width: { size: 2340, type: WidthType.DXA },
    shading: { fill: "EBF3FB", type: ShadingType.CLEAR },
    margins: { top: 120, bottom: 120, left: 160, right: 160 },
    verticalAlign: VerticalAlign.CENTER,
    children: [
      new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [new TextRun({ text: value, bold: true, size: 36, font: "Arial", color })],
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [new TextRun({ text: label, size: 18, font: "Arial", color: "555555" })],
        spacing: { before: 40 }
      })
    ]
  });

  return new Table({
    width: { size: 9360, type: WidthType.DXA },
    columnWidths: [2340, 2340, 2340, 2340],
    rows: [
      new TableRow({
        children: [
          cellStyle("Total incidents (dataset)", "30,054", "1F4E79"),
          cellStyle("Well integrity incidents", "2,291", "C00000"),
          cellStyle("CSB failures (2023–26)", "762", "C55A11"),
          cellStyle("Kicks reported (primary barrier)", "193", "375623"),
        ]
      })
    ]
  });
}

function makeRegTable() {
  const hCell = (text, width) => new TableCell({
    borders: headerBorders,
    width: { size: width, type: WidthType.DXA },
    shading: { fill: "1F4E79", type: ShadingType.CLEAR },
    margins: { top: 80, bottom: 80, left: 120, right: 120 },
    children: [new Paragraph({ children: [new TextRun({ text, bold: true, size: 20, font: "Arial", color: "FFFFFF" })] })]
  });

  const dCell = (text, width, shade = "FFFFFF") => new TableCell({
    borders,
    width: { size: width, type: WidthType.DXA },
    shading: { fill: shade, type: ShadingType.CLEAR },
    margins: { top: 80, bottom: 80, left: 120, right: 120 },
    children: [new Paragraph({ children: [new TextRun({ text, size: 20, font: "Arial", color: "333333" })] })]
  });

  const rows_data = [
    ["Resolução ANP nº 46/2016 (SGIP)", "Well integrity management", "Halliburton & Tejas equipment in barrier systems", "gov.br/anp"],
    ["Resolução ANP nº 43/2007 (SGSO)", "Operational safety management", "All E&P service operations", "gov.br/anp"],
    ["BV NR 445", "Classification of offshore units", "Units where services are performed", "marine-offshore.bureauveritas.com"],
    ["BV NR 459", "Process systems on offshore units", "Completion & well control systems", "marine-offshore.bureauveritas.com"],
    ["NR-37 (MTE)", "Health & safety on offshore platforms", "All personnel on licensed installations", "trabalho.gov.br"],
    ["NORMAM-01/DPC", "Maritime safety – vessels & crew", "Marine vessels supporting operations", "marinha.mil.br/dpc"],
    ["ISO 9001 / ISO 17025", "QA/QC & laboratory accreditation", "Equipment certification & testing", "iso.org"],
  ];

  return new Table({
    width: { size: 9360, type: WidthType.DXA },
    columnWidths: [2600, 2200, 2600, 1960],
    rows: [
      new TableRow({
        children: [
          hCell("Standard / Regulation", 2600),
          hCell("Scope", 2200),
          hCell("Applicability to HAL / Tejas", 2600),
          hCell("Open Source", 1960),
        ]
      }),
      ...rows_data.map((row, i) => new TableRow({
        children: row.map((text, j) => dCell(text, [2600,2200,2600,1960][j], i % 2 === 0 ? "FFFFFF" : "F5F9FF"))
      }))
    ]
  });
}

function makeIncidentTable() {
  const hCell = (text, width) => new TableCell({
    borders: headerBorders,
    width: { size: width, type: WidthType.DXA },
    shading: { fill: "C00000", type: ShadingType.CLEAR },
    margins: { top: 80, bottom: 80, left: 120, right: 120 },
    children: [new Paragraph({ children: [new TextRun({ text, bold: true, size: 18, font: "Arial", color: "FFFFFF" })] })]
  });

  const dCell = (text, width, shade = "FFFFFF") => new TableCell({
    borders,
    width: { size: width, type: WidthType.DXA },
    shading: { fill: shade, type: ShadingType.CLEAR },
    margins: { top: 80, bottom: 80, left: 120, right: 120 },
    children: [new Paragraph({ children: [new TextRun({ text, size: 18, font: "Arial", color: "333333" })] })]
  });

  const incidents = [
    ["1307/000033", "Petrobras", "09-07-2013", "Kick – primary barrier failure", "Volume gain of 1.4 bbl in trip tank during flowcheck. Possible formation influx in well 1-CES-161."],
    ["1309/000323", "Petrobras", "21-09-2013", "Kick – primary barrier failure", "Dynamic and static flowcheck during string pullout detected volume gain. Well closed; pressure increase observed."],
    ["1310/000182", "Petrobras", "09-10-2013", "Kick – primary barrier failure", "Gas kick during drilling at 2,460 m."],
    ["1311/000015", "Petrobras", "09-01-2013", "Kick – primary barrier failure", "Return of oil and gas detected during circulation before resuming 8.5-inch phase drilling."],
    ["1309/000264", "OGX Petróleo", "N/A", "Kick – primary barrier failure", "Kick during drilling of phase V with 8.5-inch bit at 6,135 m."],
  ];

  return new Table({
    width: { size: 9360, type: WidthType.DXA },
    columnWidths: [1100, 1500, 1000, 2000, 3760],
    rows: [
      new TableRow({
        children: [
          hCell("Incident No.", 1100),
          hCell("Operator", 1500),
          hCell("Date", 1000),
          hCell("Type", 2000),
          hCell("Description (summarised)", 3760),
        ]
      }),
      ...incidents.map((row, i) => new TableRow({
        children: [
          dCell(row[0], 1100, i % 2 === 0 ? "FFFFFF" : "FFF5F5"),
          dCell(row[1], 1500, i % 2 === 0 ? "FFFFFF" : "FFF5F5"),
          dCell(row[2], 1000, i % 2 === 0 ? "FFFFFF" : "FFF5F5"),
          dCell(row[3], 2000, i % 2 === 0 ? "FFFFFF" : "FFF5F5"),
          dCell(row[4], 3760, i % 2 === 0 ? "FFFFFF" : "FFF5F5"),
        ]
      }))
    ]
  });
}

function makeTrendTable() {
  const hCell = (text, width) => new TableCell({
    borders: headerBorders,
    width: { size: width, type: WidthType.DXA },
    shading: { fill: "2E74B5", type: ShadingType.CLEAR },
    margins: { top: 80, bottom: 80, left: 80, right: 80 },
    children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text, bold: true, size: 18, font: "Arial", color: "FFFFFF" })] })]
  });

  const dCell = (text, width, shade, bold = false) => new TableCell({
    borders,
    width: { size: width, type: WidthType.DXA },
    shading: { fill: shade, type: ShadingType.CLEAR },
    margins: { top: 60, bottom: 60, left: 80, right: 80 },
    children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text, size: 18, font: "Arial", color: bold ? "C00000" : "333333", bold })] })]
  });

  const rows = [
    ["2013","5","0","0","0"],
    ["2014","7","0","1","0"],
    ["2015","18","0","0","0"],
    ["2016","13","1","5","0"],
    ["2017","6","8","2","0"],
    ["2018","20","12","2","1"],
    ["2019","7","5","0","1"],
    ["2020","5","30","0","0"],
    ["2021","0","485","0","0"],
    ["2022","6","395","0","0"],
    ["2023","12","255","7","3"],
    ["2024","32","326","4","4"],
    ["2025","31","391","3","0"],
    ["2026*","1","45","0","0"],
  ];

  const shades = (year) => parseInt(year) >= 2020 ? "FFF5F5" : "FFFFFF";

  return new Table({
    width: { size: 9360, type: WidthType.DXA },
    columnWidths: [1200, 2400, 2400, 1680, 1680],
    rows: [
      new TableRow({
        children: [
          hCell("Year", 1200),
          hCell("Kicks (primary barrier loss)", 2400),
          hCell("CSB element failures", 2400),
          hCell("Well structural failures", 1680),
          hCell("Loss of well control", 1680),
        ]
      }),
      ...rows.map(row => new TableRow({
        children: [
          dCell(row[0], 1200, shades(row[0])),
          dCell(row[1], 2400, shades(row[0])),
          dCell(row[2], 2400, shades(row[0]), parseInt(row[2]) > 100),
          dCell(row[3], 1680, shades(row[0])),
          dCell(row[4], 1680, shades(row[0])),
        ]
      }))
    ]
  });
}

module.exports = {
  makeMetricTable,
  makeRegTable,
  makeIncidentTable,
  makeTrendTable,
};
