const { Document, Packer } = require("docx");
const fs = require("fs");
const { buildReportSections } = require("./src/document_generation/report_builder");

async function generateReport() {
  console.log("Generating HAL Tejas Incident Report...");

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
    fs.writeFileSync("HAL_Tejas_Incident_Report.docx", buffer);
    console.log("Report saved: HAL_Tejas_Incident_Report.docx");
  } catch (error) {
    console.error("Error generating report:", error);
    process.exit(1);
  }
}

generateReport();
