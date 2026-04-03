const { Paragraph, TextRun, HeadingLevel, AlignmentType, BorderStyle } = require("docx");

function h1(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_1,
    children: [new TextRun({ text, bold: true, size: 32, font: "Arial", color: "1F4E79" })],
    spacing: { before: 360, after: 160 },
    border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: "1F4E79", space: 1 } }
  });
}

function h2(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_2,
    children: [new TextRun({ text, bold: true, size: 26, font: "Arial", color: "2E74B5" })],
    spacing: { before: 280, after: 120 }
  });
}

function h3(text) {
  return new Paragraph({
    children: [new TextRun({ text, bold: true, size: 24, font: "Arial", color: "333333" })],
    spacing: { before: 200, after: 80 }
  });
}

function p(text, opts = {}) {
  return new Paragraph({
    children: [new TextRun({ text, size: 22, font: "Arial", color: "333333", ...opts })],
    spacing: { before: 80, after: 120 },
    alignment: AlignmentType.JUSTIFIED
  });
}

function pBold(label, value) {
  return new Paragraph({
    children: [
      new TextRun({ text: label + ": ", bold: true, size: 22, font: "Arial", color: "1F4E79" }),
      new TextRun({ text: value, size: 22, font: "Arial", color: "333333" })
    ],
    spacing: { before: 60, after: 60 }
  });
}

function bullet(text) {
  return new Paragraph({
    numbering: { reference: "bullets", level: 0 },
    children: [new TextRun({ text, size: 22, font: "Arial", color: "333333" })],
    spacing: { before: 40, after: 40 }
  });
}

function spacer() {
  return new Paragraph({ children: [new TextRun("")], spacing: { before: 80, after: 80 } });
}

module.exports = {
  h1,
  h2,
  h3,
  p,
  pBold,
  bullet,
  spacer,
};
