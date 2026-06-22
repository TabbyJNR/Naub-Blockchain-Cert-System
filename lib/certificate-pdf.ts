/**
 * Server-side certificate PDF generation.
 *
 * Generates the official NAUB "Statement of Result" as a real PDF file,
 * entirely server-side, using pdf-lib (pure JavaScript, no native
 * binaries, no headless browser). This deliberately avoids the earlier
 * html2canvas approach used for the in-browser Print/PDF feature, which
 * broke because it tried to parse the page's CSS (including oklch()
 * colour functions from the Tailwind/shadcn theme) — generating the PDF
 * by drawing directly onto a page sidesteps that entire class of problem.
 *
 * The resulting PDF is what gets uploaded to IPFS at issuance time (see
 * lib/ipfs.ts), giving every certificate a real, permanent, content-
 * addressed document — not just a placeholder CID.
 */

import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from "pdf-lib";
import fs from "fs";
import path from "path";
import { formatOrdinalDate, NAUB_VICE_CHANCELLOR_NAME } from "./certificate-utils";

const NAUB_VICE_CHANCELLOR_CREDENTIALS = "BSc, Msc (UNIMAID), Ph.D (ABU), mNSBMB, mNBS, GCNNS, FCAL";
const NAUB_REGISTRAR_NAME = "Lt Col OS Job";
const NAUB_REGISTRAR_CREDENTIALS = "FSS, plsc, flss, mnarc, MTRCN, Bsc, PGDE, MIAD, MA, MLSS";
const NAUB_REGISTRAR_EMAIL = "registrar@naub.edu.ng";
const NAUB_ACADEMIC_SECRETARY_NAME = "Mohammed Musa Bombo";

export interface CertificatePdfFields {
  studentName: string;
  programmeOfStudy: string;
  classOfDegree: string;
  dateOfAward: string;
  certificateNumber: string;
}

function centerText(page: PDFPage, text: string, y: number, font: PDFFont, size: number, color = rgb(0.1, 0.1, 0.1)) {
  const width = font.widthOfTextAtSize(text, size);
  const pageWidth = page.getWidth();
  page.drawText(text, { x: (pageWidth - width) / 2, y, size, font, color });
}

export async function generateCertificatePdf(fields: CertificatePdfFields): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([595.28, 841.89]); // A4 portrait, points

  const serif = await pdfDoc.embedFont(StandardFonts.TimesRoman);
  const serifBold = await pdfDoc.embedFont(StandardFonts.TimesRomanBold);
  const serifItalic = await pdfDoc.embedFont(StandardFonts.TimesRomanItalic);

  const maroon = rgb(0.48, 0.12, 0.12);
  const dark = rgb(0.1, 0.1, 0.1);
  const grey = rgb(0.33, 0.33, 0.33);

  const pageWidth = page.getWidth();
  const margin = 50;

  // Outer double border
  page.drawRectangle({
    x: margin,
    y: margin,
    width: pageWidth - margin * 2,
    height: page.getHeight() - margin * 2,
    borderColor: maroon,
    borderWidth: 1.5,
  });
  page.drawRectangle({
    x: margin + 6,
    y: margin + 6,
    width: pageWidth - margin * 2 - 12,
    height: page.getHeight() - margin * 2 - 12,
    borderColor: maroon,
    borderWidth: 0.75,
  });

  let y = page.getHeight() - 90;

  // Crest image (embedded twice — header + footer stamp — matching the HTML display)
  let crestImage = null;
  try {
    const crestPath = path.join(process.cwd(), "public", "images", "naub-seal.png");
    const crestBytes = fs.readFileSync(crestPath);
    crestImage = await pdfDoc.embedJpg(crestBytes).catch(() => pdfDoc.embedPng(crestBytes));
  } catch {
    crestImage = null;
  }

  // Header
  centerText(page, "NIGERIAN ARMY UNIVERSITY BIU", y, serifBold, 20, dark);
  y -= 16;
  centerText(page, "P.M.B. 1500 BIU, BORNO STATE, NIGERIA", y, serif, 9, grey);
  y -= 30;

  // Header row: VC (left) / crest (center) / Registrar (right)
  const headerRowTop = y;
  const leftX = margin + 30;
  const rightX = pageWidth - margin - 30;

  page.drawText("Vice Chancellor", { x: leftX, y: headerRowTop, size: 9, font: serif, color: grey });
  page.drawText(NAUB_VICE_CHANCELLOR_NAME, { x: leftX, y: headerRowTop - 12, size: 9.5, font: serifBold, color: dark });
  wrapText(page, NAUB_VICE_CHANCELLOR_CREDENTIALS, leftX, headerRowTop - 24, serif, 7, grey, 160);

  const registrarLabel = "Ag Registrar";
  const registrarLabelWidth = serif.widthOfTextAtSize(registrarLabel, 9);
  page.drawText(registrarLabel, { x: rightX - registrarLabelWidth, y: headerRowTop, size: 9, font: serif, color: grey });
  const registrarNameWidth = serifBold.widthOfTextAtSize(NAUB_REGISTRAR_NAME, 9.5);
  page.drawText(NAUB_REGISTRAR_NAME, { x: rightX - registrarNameWidth, y: headerRowTop - 12, size: 9.5, font: serifBold, color: dark });
  wrapTextRightAligned(page, NAUB_REGISTRAR_CREDENTIALS, rightX, headerRowTop - 24, serif, 7, grey, 170);
  const emailWidth = serif.widthOfTextAtSize(NAUB_REGISTRAR_EMAIL, 7);
  page.drawText(NAUB_REGISTRAR_EMAIL, { x: rightX - emailWidth, y: headerRowTop - 48, size: 7, font: serif, color: grey });

  if (crestImage) {
    const crestSize = 60;
    page.drawImage(crestImage, {
      x: (pageWidth - crestSize) / 2,
      y: headerRowTop - 50,
      width: crestSize,
      height: crestSize,
    });
  }

  y = headerRowTop - 70;

  // Ref. No
  page.drawText(`Ref. No: ${fields.certificateNumber}`, { x: leftX, y, size: 9.5, font: serif, color: dark });
  y -= 36;

  // Title
  centerText(page, "STATEMENT OF RESULT", y, serifBold, 22, maroon);
  y -= 30;

  // Body
  centerText(page, "This is to certify that", y, serifItalic, 12, dark);
  y -= 26;

  centerText(page, fields.studentName, y, serifBold, 16, dark);
  const studentNameWidth = serifBold.widthOfTextAtSize(fields.studentName, 16);
  page.drawLine({
    start: { x: (pageWidth - studentNameWidth) / 2 - 20, y: y - 4 },
    end: { x: (pageWidth + studentNameWidth) / 2 + 20, y: y - 4 },
    thickness: 0.75,
    color: dark,
  });
  y -= 34;

  const bodyLine1 = "having completed an approved course of study and passed the prescribed";
  const bodyLine2 = "examinations, has under the authority of the Senate been awarded";
  centerText(page, bodyLine1, y, serif, 11, dark);
  y -= 15;
  centerText(page, bodyLine2, y, serif, 11, dark);
  y -= 28;

  centerText(page, fields.programmeOfStudy, y, serifBold, 14, dark);
  const programmeWidth = serifBold.widthOfTextAtSize(fields.programmeOfStudy, 14);
  page.drawLine({
    start: { x: (pageWidth - programmeWidth) / 2 - 20, y: y - 4 },
    end: { x: (pageWidth + programmeWidth) / 2 + 20, y: y - 4 },
    thickness: 0.75,
    color: dark,
  });
  y -= 34;

  const withLabel = "with";
  const classText = fields.classOfDegree;
  const withWidth = serif.widthOfTextAtSize(withLabel, 11);
  const classWidth = serifBold.widthOfTextAtSize(classText, 12);
  const gap = 10;
  const totalWidth = withWidth + gap + classWidth;
  let cursorX = (pageWidth - totalWidth) / 2;
  page.drawText(withLabel, { x: cursorX, y, size: 11, font: serif, color: dark });
  cursorX += withWidth + gap;
  page.drawText(classText, { x: cursorX, y, size: 12, font: serifBold, color: dark });
  page.drawLine({
    start: { x: cursorX - 10, y: y - 4 },
    end: { x: cursorX + classWidth + 10, y: y - 4 },
    thickness: 0.75,
    color: dark,
  });
  y -= 28;

  const dateLabel = "Date of Award:";
  const dateText = formatOrdinalDate(fields.dateOfAward);
  const dateLabelWidth = serif.widthOfTextAtSize(dateLabel, 11);
  const dateTextWidth = serifBold.widthOfTextAtSize(dateText, 12);
  const dateTotalWidth = dateLabelWidth + gap + dateTextWidth;
  cursorX = (pageWidth - dateTotalWidth) / 2;
  page.drawText(dateLabel, { x: cursorX, y, size: 11, font: serif, color: dark });
  cursorX += dateLabelWidth + gap;
  page.drawText(dateText, { x: cursorX, y, size: 12, font: serifBold, color: dark });
  page.drawLine({
    start: { x: cursorX - 10, y: y - 4 },
    end: { x: cursorX + dateTextWidth + 10, y: y - 4 },
    thickness: 0.75,
    color: dark,
  });

  // Footer: signature (left) + stamp (right)
  const footerY = margin + 90;
  page.drawText(NAUB_ACADEMIC_SECRETARY_NAME, { x: leftX, y: footerY + 26, size: 16, font: serifItalic, color: dark });
  page.drawLine({
    start: { x: leftX, y: footerY + 18 },
    end: { x: leftX + 160, y: footerY + 18 },
    thickness: 0.75,
    color: dark,
  });
  page.drawText(NAUB_ACADEMIC_SECRETARY_NAME, { x: leftX, y: footerY + 4, size: 9.5, font: serifBold, color: dark });
  page.drawText("Academic Secretary", { x: leftX, y: footerY - 8, size: 8.5, font: serif, color: grey });
  page.drawText("for Registrar", { x: leftX, y: footerY - 19, size: 8.5, font: serif, color: grey });

  if (crestImage) {
    const stampSize = 70;
    page.drawImage(crestImage, {
      x: pageWidth - margin - 30 - stampSize,
      y: footerY - 10,
      width: stampSize,
      height: stampSize,
      rotate: { type: "degrees" as const, angle: -8 },
      opacity: 0.85,
    });
  }

  return pdfDoc.save();
}

function wrapText(
  page: PDFPage,
  text: string,
  x: number,
  y: number,
  font: PDFFont,
  size: number,
  color: ReturnType<typeof rgb>,
  maxWidth: number,
) {
  const words = text.split(", ");
  let line = "";
  let lineY = y;
  for (const word of words) {
    const test = line ? `${line}, ${word}` : word;
    if (font.widthOfTextAtSize(test, size) > maxWidth && line) {
      page.drawText(line, { x, y: lineY, size, font, color });
      line = word;
      lineY -= 9;
    } else {
      line = test;
    }
  }
  if (line) page.drawText(line, { x, y: lineY, size, font, color });
}

function wrapTextRightAligned(
  page: PDFPage,
  text: string,
  rightX: number,
  y: number,
  font: PDFFont,
  size: number,
  color: ReturnType<typeof rgb>,
  maxWidth: number,
) {
  const words = text.split(", ");
  let line = "";
  let lineY = y;
  for (const word of words) {
    const test = line ? `${line}, ${word}` : word;
    if (font.widthOfTextAtSize(test, size) > maxWidth && line) {
      const w = font.widthOfTextAtSize(line, size);
      page.drawText(line, { x: rightX - w, y: lineY, size, font, color });
      line = word;
      lineY -= 9;
    } else {
      line = test;
    }
  }
  if (line) {
    const w = font.widthOfTextAtSize(line, size);
    page.drawText(line, { x: rightX - w, y: lineY, size, font, color });
  }
}
