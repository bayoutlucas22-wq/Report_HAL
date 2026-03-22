const express = require("express");
const path = require("path");
const { Document, Packer } = require("docx");
const { buildReportSections } = require("./src/document_generation/report_builder");
const { getMetrics, getRegData, getIncidents, getTrendData } = require("./src/reporting/incident_analyzer");
const { anpData, bureauVeritasData, mteDpcData, internationalRefs } = require("./src/data/anp_data");

const app = express();
const PORT = process.env.PORT || 3333;

app.use(express.static(path.join(__dirname, "public")));

const SOURCE_LABELS = {
  sisoIncidentes: "SISO-Incidentes Dataset",
  resolucao46: "Resolução ANP nº 46/2016 (SGIP)",
  resolucao43: "Resolução ANP nº 43/2007 (SGSO)",
  resolucao41: "Resolução ANP nº 41/2015",
  nr445: "NR 445 — Classification of Offshore Units",
  nr459: "NR 459 — Process Systems on Offshore Units",
  nr493: "NR 493 — Mooring Systems",
  ivbsBra: "IVBS-BRA Notation",
  nr37: "NR-37 (MTE)",
  nr33_35: "NR-33 / NR-35 (MTE)",
  normam01: "NORMAM-01/DPC",
  bsee: "BSEE Offshore Incident Statistics (US)",
  hseUk: "HSE UK Hydrocarbon Release Database",
};

function formatSources(obj) {
  return Object.entries(obj).map(([key, val]) => ({
    name: SOURCE_LABELS[key] || key,
    description: val.description,
    url: val.url,
  }));
}

// API: Get report data for frontend
app.get("/api/data", (req, res) => {
  res.json({
    metrics: getMetrics(),
    regulations: getRegData(),
    incidents: getIncidents(),
    trends: getTrendData(),
    sources: {
      anp: formatSources(anpData),
      bureauVeritas: formatSources(bureauVeritasData),
      mteDpc: formatSources(mteDpcData),
      international: formatSources(internationalRefs),
    },
  });
});

// API: Generate and download DOCX report
app.get("/api/generate-report", async (req, res) => {
  try {
    const doc = new Document({
      numbering: {
        config: [
          {
            reference: "bullets",
            levels: [{
              level: 0, format: "bullet", text: "\u2022", alignment: "left",
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
      sections: [buildReportSections()],
    });

    const buffer = await Packer.toBuffer(doc);
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.wordprocessingml.document");
    res.setHeader("Content-Disposition", "attachment; filename=HAL_Tejas_Incident_Report.docx");
    res.send(buffer);
  } catch (err) {
    console.error("Report generation error:", err);
    res.status(500).json({ error: "Failed to generate report" });
  }
});

app.listen(PORT, () => {
  console.log(`Incident Report App running at http://localhost:${PORT}`);
});
