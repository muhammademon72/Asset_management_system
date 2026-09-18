const {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  AlignmentType, WidthType, BorderStyle, ShadingType,
  Header, Footer, PageNumber, HeadingLevel, PageBreak,
} = require("docx");
const fs = require("fs");

// ─── Color Palette (Professional Business Blue) ───
const P = {
  primary: "1A3C6E",    // Deep navy
  accent: "2E75B6",     // Medium blue
  body: "333333",       // Dark grey body text
  secondary: "666666",  // Mid grey
  headerBg: "1A3C6E",   // Table header background
  headerText: "FFFFFF", // Table header text
  lightBg: "F2F6FA",    // Light blue-grey alternating
  borderColor: "B4C6E7",// Light blue border
  darkBorder: "1A3C6E", // Dark border for emphasis
};

// ─── Border Definitions ───
const thinBorder = { style: BorderStyle.SINGLE, size: 1, color: P.borderColor };
const noBorder = { style: BorderStyle.NONE, size: 0, color: "FFFFFF" };
const allBorders = {
  top: thinBorder, bottom: thinBorder,
  left: thinBorder, right: thinBorder,
  insideHorizontal: thinBorder, insideVertical: thinBorder,
};
const headerBorders = {
  top: { style: BorderStyle.SINGLE, size: 2, color: P.darkBorder },
  bottom: { style: BorderStyle.SINGLE, size: 2, color: P.darkBorder },
  left: { style: BorderStyle.SINGLE, size: 1, color: P.darkBorder },
  right: { style: BorderStyle.SINGLE, size: 1, color: P.darkBorder },
};

// ─── Helper Functions ───
function labelCell(text, widthPercent) {
  return new TableCell({
    width: { size: widthPercent || 15, type: WidthType.PERCENTAGE },
    shading: { type: ShadingType.CLEAR, fill: "EDF2F9" },
    borders: {
      top: thinBorder, bottom: thinBorder,
      left: thinBorder, right: thinBorder,
    },
    margins: { top: 60, bottom: 60, left: 100, right: 100 },
    children: [new Paragraph({
      spacing: { before: 0, after: 0, line: 276 },
      children: [new TextRun({
        text: text,
        bold: true,
        size: 20,
        font: { ascii: "Calibri", eastAsia: "SimHei" },
        color: P.primary,
      })],
    })],
  });
}

function valueCell(text, widthPercent) {
  return new TableCell({
    width: { size: widthPercent || 18, type: WidthType.PERCENTAGE },
    borders: {
      top: thinBorder, bottom: thinBorder,
      left: thinBorder, right: thinBorder,
    },
    margins: { top: 60, bottom: 60, left: 100, right: 100 },
    children: [new Paragraph({
      spacing: { before: 0, after: 0, line: 276 },
      children: [new TextRun({
        text: text || "\u3000\u3000\u3000\u3000\u3000",
        size: 20,
        font: { ascii: "Calibri", eastAsia: "Microsoft YaHei" },
        color: P.body,
      })],
    })],
  });
}

// ─── Build Document ───
function buildDocument() {
  const children = [];

  // ── Title Section ──
  children.push(new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { before: 100, after: 60 },
    children: [new TextRun({
      text: "DELIVERY LIST",
      bold: true,
      size: 36,
      font: { ascii: "Calibri", eastAsia: "SimHei" },
      color: P.primary,
    })],
  }));

  children.push(new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { before: 0, after: 200 },
    children: [new TextRun({
      text: "Delivery Challan",
      size: 22,
      font: { ascii: "Calibri", eastAsia: "Microsoft YaHei" },
      color: P.secondary,
      italics: true,
    })],
  }));

  // ── Accent Line ──
  children.push(new Paragraph({
    spacing: { before: 0, after: 200 },
    border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: P.accent, space: 4 } },
    children: [],
  }));

  // ── Header Info Table (2-column label:value layout, 4 rows for 7 fields) ──
  const headerTable = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: {
      top: thinBorder, bottom: thinBorder,
      left: thinBorder, right: thinBorder,
      insideHorizontal: thinBorder, insideVertical: thinBorder,
    },
    rows: [
      // Row 1: Date | Chalan No | Identity Number
      new TableRow({
        cantSplit: true,
        children: [
          labelCell("Date", 12),
          valueCell("____/____/____", 21),
          labelCell("Chalan No", 14),
          valueCell("_______________", 21),
          labelCell("Identity Number", 14),
          valueCell("_______________", 18),
        ],
      }),
      // Row 2: Employee Name | Department
      new TableRow({
        cantSplit: true,
        children: [
          labelCell("Employee Name", 12),
          valueCell("_______________", 21),
          labelCell("Department", 14),
          valueCell("_______________", 21),
          new TableCell({
            width: { size: 14, type: WidthType.PERCENTAGE },
            shading: { type: ShadingType.CLEAR, fill: "EDF2F9" },
            borders: { top: thinBorder, bottom: thinBorder, left: thinBorder, right: thinBorder },
            margins: { top: 60, bottom: 60, left: 100, right: 100 },
            children: [new Paragraph({
              spacing: { before: 0, after: 0, line: 276 },
              children: [new TextRun({
                text: "Designation",
                bold: true, size: 20,
                font: { ascii: "Calibri", eastAsia: "SimHei" },
                color: P.primary,
              })],
            })],
          }),
          valueCell("_______________", 18),
        ],
      }),
      // Row 3: Branch Name
      new TableRow({
        cantSplit: true,
        children: [
          labelCell("Branch Name", 12),
          valueCell("_______________", 21),
          new TableCell({
            width: { size: 14, type: WidthType.PERCENTAGE },
            borders: { top: thinBorder, bottom: thinBorder, left: thinBorder, right: thinBorder },
            margins: { top: 60, bottom: 60, left: 100, right: 100 },
            children: [new Paragraph({ spacing: { before: 0, after: 0, line: 276 }, children: [] })],
          }),
          new TableCell({
            width: { size: 21, type: WidthType.PERCENTAGE },
            borders: { top: thinBorder, bottom: thinBorder, left: thinBorder, right: thinBorder },
            margins: { top: 60, bottom: 60, left: 100, right: 100 },
            children: [new Paragraph({ spacing: { before: 0, after: 0, line: 276 }, children: [] })],
          }),
          new TableCell({
            width: { size: 14, type: WidthType.PERCENTAGE },
            borders: { top: thinBorder, bottom: thinBorder, left: thinBorder, right: thinBorder },
            margins: { top: 60, bottom: 60, left: 100, right: 100 },
            children: [new Paragraph({ spacing: { before: 0, after: 0, line: 276 }, children: [] })],
          }),
          new TableCell({
            width: { size: 18, type: WidthType.PERCENTAGE },
            borders: { top: thinBorder, bottom: thinBorder, left: thinBorder, right: thinBorder },
            margins: { top: 60, bottom: 60, left: 100, right: 100 },
            children: [new Paragraph({ spacing: { before: 0, after: 0, line: 276 }, children: [] })],
          }),
        ],
      }),
    ],
  });

  children.push(headerTable);
  children.push(new Paragraph({ spacing: { before: 200, after: 100 }, children: [] }));

  // ── Product Details Section Title ──
  children.push(new Paragraph({
    spacing: { before: 100, after: 120 },
    children: [new TextRun({
      text: "Product Details",
      bold: true,
      size: 24,
      font: { ascii: "Calibri", eastAsia: "SimHei" },
      color: P.primary,
    })],
  }));

  // ── Product Table ──
  const productHeaders = ["SL", "Product", "Brand", "Model", "Serial", "Condition", "B.Qty", "Qty", "Remarks"];
  const productWidths = [4, 14, 10, 12, 12, 10, 7, 7, 24];

  function productHeaderCell(text, widthPct) {
    return new TableCell({
      width: { size: widthPct, type: WidthType.PERCENTAGE },
      shading: { type: ShadingType.CLEAR, fill: P.headerBg },
      borders: headerBorders,
      margins: { top: 60, bottom: 60, left: 80, right: 80 },
      children: [new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 0, after: 0, line: 276 },
        children: [new TextRun({
          text: text,
          bold: true,
          size: 18,
          font: { ascii: "Calibri", eastAsia: "SimHei" },
          color: P.headerText,
        })],
      })],
    });
  }

  function productDataCell(text, widthPct, isAlt, align) {
    return new TableCell({
      width: { size: widthPct, type: WidthType.PERCENTAGE },
      shading: isAlt ? { type: ShadingType.CLEAR, fill: P.lightBg } : undefined,
      borders: {
        top: thinBorder, bottom: thinBorder,
        left: thinBorder, right: thinBorder,
      },
      margins: { top: 50, bottom: 50, left: 80, right: 80 },
      children: [new Paragraph({
        alignment: align || AlignmentType.LEFT,
        spacing: { before: 0, after: 0, line: 276 },
        children: [new TextRun({
          text: text || "",
          size: 18,
          font: { ascii: "Calibri", eastAsia: "Microsoft YaHei" },
          color: P.body,
        })],
      })],
    });
  }

  // Create 5 empty data rows
  const dataRows = [];
  for (let i = 0; i < 5; i++) {
    const isAlt = i % 2 === 0;
    dataRows.push(new TableRow({
      cantSplit: true,
      children: [
        productDataCell(String(i + 1), productWidths[0], isAlt, AlignmentType.CENTER),
        productDataCell("", productWidths[1], isAlt),
        productDataCell("", productWidths[2], isAlt),
        productDataCell("", productWidths[3], isAlt),
        productDataCell("", productWidths[4], isAlt),
        productDataCell("", productWidths[5], isAlt),
        productDataCell("", productWidths[6], isAlt, AlignmentType.CENTER),
        productDataCell("", productWidths[7], isAlt, AlignmentType.CENTER),
        productDataCell("", productWidths[8], isAlt),
      ],
    }));
  }

  const productTable = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      new TableRow({
        tableHeader: true,
        cantSplit: true,
        children: productHeaders.map((h, idx) => productHeaderCell(h, productWidths[idx])),
      }),
      ...dataRows,
    ],
  });

  children.push(productTable);
  children.push(new Paragraph({ spacing: { before: 200, after: 100 }, children: [] }));

  // ── Note Section ──
  const noteTable = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: {
      top: thinBorder, bottom: thinBorder,
      left: thinBorder, right: thinBorder,
      insideHorizontal: thinBorder, insideVertical: thinBorder,
    },
    rows: [
      new TableRow({
        cantSplit: true,
        children: [
          new TableCell({
            width: { size: 10, type: WidthType.PERCENTAGE },
            shading: { type: ShadingType.CLEAR, fill: "EDF2F9" },
            borders: { top: thinBorder, bottom: thinBorder, left: thinBorder, right: thinBorder },
            margins: { top: 80, bottom: 80, left: 100, right: 100 },
            children: [new Paragraph({
              spacing: { before: 0, after: 0, line: 276 },
              children: [new TextRun({
                text: "Note",
                bold: true, size: 20,
                font: { ascii: "Calibri", eastAsia: "SimHei" },
                color: P.primary,
              })],
            })],
          }),
          new TableCell({
            width: { size: 90, type: WidthType.PERCENTAGE },
            borders: { top: thinBorder, bottom: thinBorder, left: thinBorder, right: thinBorder },
            margins: { top: 80, bottom: 80, left: 100, right: 100 },
            children: [new Paragraph({
              spacing: { before: 0, after: 0, line: 276 },
              children: [new TextRun({
                text: "",
                size: 20,
                font: { ascii: "Calibri", eastAsia: "Microsoft YaHei" },
                color: P.body,
              })],
            })],
          }),
        ],
      }),
    ],
  });

  children.push(noteTable);
  children.push(new Paragraph({ spacing: { before: 200, after: 0 }, children: [] }));

  // ── Status & Action Section ──
  const statusTable = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: {
      top: noBorder, bottom: noBorder,
      left: noBorder, right: noBorder,
      insideHorizontal: noBorder, insideVertical: noBorder,
    },
    rows: [
      new TableRow({
        children: [
          // Status label
          new TableCell({
            width: { size: 12, type: WidthType.PERCENTAGE },
            borders: { top: noBorder, bottom: noBorder, left: noBorder, right: noBorder },
            margins: { top: 60, bottom: 60, left: 0, right: 80 },
            children: [new Paragraph({
              spacing: { before: 0, after: 0, line: 276 },
              children: [new TextRun({
                text: "Status:",
                bold: true, size: 22,
                font: { ascii: "Calibri", eastAsia: "SimHei" },
                color: P.primary,
              })],
            })],
          }),
          // Draft badge
          new TableCell({
            width: { size: 10, type: WidthType.PERCENTAGE },
            borders: { top: noBorder, bottom: noBorder, left: noBorder, right: noBorder },
            margins: { top: 60, bottom: 60, left: 0, right: 100 },
            children: [new Paragraph({
              alignment: AlignmentType.CENTER,
              spacing: { before: 0, after: 0, line: 276 },
              border: {
                top: { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC", space: 4 },
                bottom: { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC", space: 4 },
                left: { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC", space: 4 },
                right: { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC", space: 4 },
              },
              children: [new TextRun({
                text: "Draft",
                size: 20,
                font: { ascii: "Calibri", eastAsia: "Microsoft YaHei" },
                color: "888888",
              })],
            })],
          }),
          // Confirm badge
          new TableCell({
            width: { size: 12, type: WidthType.PERCENTAGE },
            borders: { top: noBorder, bottom: noBorder, left: noBorder, right: noBorder },
            margins: { top: 60, bottom: 60, left: 0, right: 100 },
            children: [new Paragraph({
              alignment: AlignmentType.CENTER,
              spacing: { before: 0, after: 0, line: 276 },
              border: {
                top: { style: BorderStyle.SINGLE, size: 1, color: P.accent, space: 4 },
                bottom: { style: BorderStyle.SINGLE, size: 1, color: P.accent, space: 4 },
                left: { style: BorderStyle.SINGLE, size: 1, color: P.accent, space: 4 },
                right: { style: BorderStyle.SINGLE, size: 1, color: P.accent, space: 4 },
              },
              children: [new TextRun({
                text: "Confirm",
                bold: true, size: 20,
                font: { ascii: "Calibri", eastAsia: "SimHei" },
                color: P.accent,
              })],
            })],
          }),
          // Spacer
          new TableCell({
            width: { size: 30, type: WidthType.PERCENTAGE },
            borders: { top: noBorder, bottom: noBorder, left: noBorder, right: noBorder },
            children: [new Paragraph({ children: [] })],
          }),
          // Cancel button
          new TableCell({
            width: { size: 12, type: WidthType.PERCENTAGE },
            borders: { top: noBorder, bottom: noBorder, left: noBorder, right: noBorder },
            margins: { top: 60, bottom: 60, left: 0, right: 100 },
            children: [new Paragraph({
              alignment: AlignmentType.CENTER,
              spacing: { before: 0, after: 0, line: 276 },
              shading: { type: ShadingType.CLEAR, fill: "FDECEA" },
              border: {
                top: { style: BorderStyle.SINGLE, size: 1, color: "E74C3C", space: 4 },
                bottom: { style: BorderStyle.SINGLE, size: 1, color: "E74C3C", space: 4 },
                left: { style: BorderStyle.SINGLE, size: 1, color: "E74C3C", space: 4 },
                right: { style: BorderStyle.SINGLE, size: 1, color: "E74C3C", space: 4 },
              },
              children: [new TextRun({
                text: "Cancel",
                bold: true, size: 20,
                font: { ascii: "Calibri", eastAsia: "SimHei" },
                color: "C0392B",
              })],
            })],
          }),
          // Saved button
          new TableCell({
            width: { size: 12, type: WidthType.PERCENTAGE },
            borders: { top: noBorder, bottom: noBorder, left: noBorder, right: noBorder },
            margins: { top: 60, bottom: 60, left: 0, right: 0 },
            children: [new Paragraph({
              alignment: AlignmentType.CENTER,
              spacing: { before: 0, after: 0, line: 276 },
              shading: { type: ShadingType.CLEAR, fill: "E8F5E9" },
              border: {
                top: { style: BorderStyle.SINGLE, size: 1, color: "27AE60", space: 4 },
                bottom: { style: BorderStyle.SINGLE, size: 1, color: "27AE60", space: 4 },
                left: { style: BorderStyle.SINGLE, size: 1, color: "27AE60", space: 4 },
                right: { style: BorderStyle.SINGLE, size: 1, color: "27AE60", space: 4 },
              },
              children: [new TextRun({
                text: "Saved",
                bold: true, size: 20,
                font: { ascii: "Calibri", eastAsia: "SimHei" },
                color: "1B8C3E",
              })],
            })],
          }),
        ],
      }),
    ],
  });

  children.push(statusTable);

  // ── Signature Section ──
  children.push(new Paragraph({ spacing: { before: 400, after: 0 }, children: [] }));

  const sigTable = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: {
      top: noBorder, bottom: noBorder,
      left: noBorder, right: noBorder,
      insideHorizontal: noBorder, insideVertical: noBorder,
    },
    rows: [
      new TableRow({
        children: [
          new TableCell({
            width: { size: 33, type: WidthType.PERCENTAGE },
            borders: { top: noBorder, bottom: noBorder, left: noBorder, right: noBorder },
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                spacing: { before: 0, after: 0, line: 276 },
                children: [new TextRun({
                  text: "Prepared By",
                  size: 18,
                  font: { ascii: "Calibri", eastAsia: "Microsoft YaHei" },
                  color: P.secondary,
                })],
              }),
              new Paragraph({
                alignment: AlignmentType.CENTER,
                spacing: { before: 200, after: 0, line: 276 },
                border: { bottom: { style: BorderStyle.SINGLE, size: 1, color: P.borderColor, space: 0 } },
                children: [new TextRun({ text: "                    ", size: 18 })],
              }),
              new Paragraph({
                alignment: AlignmentType.CENTER,
                spacing: { before: 60, after: 0, line: 276 },
                children: [new TextRun({
                  text: "Signature",
                  size: 16, italics: true,
                  font: { ascii: "Calibri", eastAsia: "Microsoft YaHei" },
                  color: "999999",
                })],
              }),
            ],
          }),
          new TableCell({
            width: { size: 34, type: WidthType.PERCENTAGE },
            borders: { top: noBorder, bottom: noBorder, left: noBorder, right: noBorder },
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                spacing: { before: 0, after: 0, line: 276 },
                children: [new TextRun({
                  text: "Checked By",
                  size: 18,
                  font: { ascii: "Calibri", eastAsia: "Microsoft YaHei" },
                  color: P.secondary,
                })],
              }),
              new Paragraph({
                alignment: AlignmentType.CENTER,
                spacing: { before: 200, after: 0, line: 276 },
                border: { bottom: { style: BorderStyle.SINGLE, size: 1, color: P.borderColor, space: 0 } },
                children: [new TextRun({ text: "                    ", size: 18 })],
              }),
              new Paragraph({
                alignment: AlignmentType.CENTER,
                spacing: { before: 60, after: 0, line: 276 },
                children: [new TextRun({
                  text: "Signature",
                  size: 16, italics: true,
                  font: { ascii: "Calibri", eastAsia: "Microsoft YaHei" },
                  color: "999999",
                })],
              }),
            ],
          }),
          new TableCell({
            width: { size: 33, type: WidthType.PERCENTAGE },
            borders: { top: noBorder, bottom: noBorder, left: noBorder, right: noBorder },
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                spacing: { before: 0, after: 0, line: 276 },
                children: [new TextRun({
                  text: "Received By",
                  size: 18,
                  font: { ascii: "Calibri", eastAsia: "Microsoft YaHei" },
                  color: P.secondary,
                })],
              }),
              new Paragraph({
                alignment: AlignmentType.CENTER,
                spacing: { before: 200, after: 0, line: 276 },
                border: { bottom: { style: BorderStyle.SINGLE, size: 1, color: P.borderColor, space: 0 } },
                children: [new TextRun({ text: "                    ", size: 18 })],
              }),
              new Paragraph({
                alignment: AlignmentType.CENTER,
                spacing: { before: 60, after: 0, line: 276 },
                children: [new TextRun({
                  text: "Signature",
                  size: 16, italics: true,
                  font: { ascii: "Calibri", eastAsia: "Microsoft YaHei" },
                  color: "999999",
                })],
              }),
            ],
          }),
        ],
      }),
    ],
  });

  children.push(sigTable);

  // ── Create Document ──
  const doc = new Document({
    styles: {
      default: {
        document: {
          run: {
            font: { ascii: "Calibri", eastAsia: "Microsoft YaHei" },
            size: 22,
            color: P.body,
          },
          paragraph: {
            spacing: { line: 312 },
          },
        },
      },
    },
    sections: [{
      properties: {
        page: {
          size: { width: 11906, height: 16838 },
          margin: { top: 1134, bottom: 1134, left: 1134, right: 1134 },
        },
      },
      headers: {
        default: new Header({
          children: [
            new Paragraph({
              alignment: AlignmentType.LEFT,
              spacing: { after: 0 },
              border: { bottom: { style: BorderStyle.SINGLE, size: 2, color: P.accent, space: 4 } },
              children: [
                new TextRun({
                  text: "Delivery List",
                  bold: true, size: 16,
                  font: { ascii: "Calibri", eastAsia: "SimHei" },
                  color: P.accent,
                }),
                new TextRun({ text: "                                                                                                                ", size: 16 }),
                new TextRun({
                  text: "Date: ____/____/____",
                  size: 16,
                  font: { ascii: "Calibri", eastAsia: "Microsoft YaHei" },
                  color: P.secondary,
                }),
              ],
            }),
          ],
        }),
      },
      footers: {
        default: new Footer({
          children: [
            new Paragraph({
              alignment: AlignmentType.CENTER,
              border: { top: { style: BorderStyle.SINGLE, size: 1, color: P.borderColor, space: 4 } },
              spacing: { before: 60 },
              children: [
                new TextRun({
                  text: "Page ",
                  size: 16,
                  font: { ascii: "Calibri", eastAsia: "Microsoft YaHei" },
                  color: P.secondary,
                }),
                new TextRun({
                  children: [PageNumber.CURRENT],
                  size: 16,
                  color: P.secondary,
                }),
              ],
            }),
          ],
        }),
      },
      children,
    }],
  });

  return doc;
}

// ─── Generate ───
async function main() {
  const doc = buildDocument();
  const buffer = await Packer.toBuffer(doc);
  const outputPath = "/home/z/my-project/download/Delivery_List_Challan.docx";
  fs.writeFileSync(outputPath, buffer);
  console.log("Document generated: " + outputPath);
}

main().catch(err => {
  console.error("Error:", err);
  process.exit(1);
});
