import {
  AlignmentType,
  BorderStyle,
  Document,
  Packer,
  Paragraph,
  ShadingType,
  Table,
  TableCell,
  TableLayoutType,
  TableRow,
  TextRun,
  VerticalAlignTable,
  WidthType,
} from "docx";

import type { MebPlanContent } from "@/lib/lesson-planner/meb-plan-content";

/**
 * MEB günlük ders planı formatında Word belgesi: A4, 2 cm kenar boşluğu,
 * Times New Roman 11 pt, tablo tabanlı bölümler ve en altta imza alanı.
 * Yalnızca `MebPlanContent` modelini biçimlendirir; içerik kararı
 * `meb-plan-content.ts` içindedir.
 */

const FONT = "Times New Roman";
const SIZE = 22; // yarım punto: 11 pt
const SMALL = 20;
/** A4 genişliği (11906 twip) − 2 × 2 cm kenar boşluğu. */
const CONTENT_WIDTH = 9638;
const HEADER_FILL = "D9E2F3";
const LABEL_FILL = "F2F2F2";
const BORDER = { style: BorderStyle.SINGLE, size: 4, color: "808080" } as const;
const NO_BORDER = { style: BorderStyle.NONE, size: 0, color: "FFFFFF" } as const;

function text(value: string, options: { bold?: boolean; size?: number; italics?: boolean } = {}): TextRun {
  return new TextRun({ text: value, font: FONT, size: options.size ?? SIZE, bold: options.bold, italics: options.italics });
}

function paragraph(
  value: string,
  options: { bold?: boolean; size?: number; italics?: boolean; align?: (typeof AlignmentType)[keyof typeof AlignmentType]; after?: number } = {}
): Paragraph {
  return new Paragraph({
    alignment: options.align,
    spacing: { before: 0, after: options.after ?? 60 },
    children: [text(value, options)],
  });
}

/** Hücre içeriği: her satır ayrı paragraf; boşsa Word'ün geçerli sayması için boş paragraf. */
function lines(values: string[], options: { bold?: boolean; size?: number } = {}): Paragraph[] {
  return values.length > 0 ? values.map((value) => paragraph(value, options)) : [paragraph("")];
}

function cell(
  children: Paragraph[],
  width: number,
  options: { fill?: string; span?: number; center?: boolean } = {}
): TableCell {
  return new TableCell({
    children,
    width: { size: width, type: WidthType.DXA },
    columnSpan: options.span,
    verticalAlign: options.center ? VerticalAlignTable.CENTER : VerticalAlignTable.TOP,
    shading: options.fill ? { type: ShadingType.CLEAR, color: "auto", fill: options.fill } : undefined,
    margins: { top: 60, bottom: 60, left: 100, right: 100 },
  });
}

function table(columnWidths: number[], rows: TableRow[]): Table {
  return new Table({
    width: { size: CONTENT_WIDTH, type: WidthType.DXA },
    columnWidths,
    layout: TableLayoutType.FIXED,
    borders: { top: BORDER, bottom: BORDER, left: BORDER, right: BORDER, insideHorizontal: BORDER, insideVertical: BORDER },
    rows,
  });
}

/** Tablo başlık satırı: tüm genişliği kaplayan gölgeli bölüm başlığı. */
function headerRow(title: string, span: number): TableRow {
  return new TableRow({
    tableHeader: true,
    children: [cell([paragraph(title, { bold: true, align: AlignmentType.CENTER, after: 0 })], CONTENT_WIDTH, { fill: HEADER_FILL, span })],
  });
}

function spacer(): Paragraph {
  return new Paragraph({ spacing: { before: 0, after: 160 }, children: [] });
}

function infoTable(content: MebPlanContent): Table {
  const label = 1700;
  const value = CONTENT_WIDTH / 2 - label;
  const pairs = content.info;
  const rows: TableRow[] = [headerRow("DERS BİLGİLERİ", 4)];
  for (let i = 0; i < pairs.length; i += 2) {
    const right = pairs[i + 1];
    rows.push(
      new TableRow({
        children: [
          cell([paragraph(pairs[i].label, { bold: true })], label, { fill: LABEL_FILL, center: true }),
          cell([paragraph(pairs[i].value || "…………………………………")], value, { center: true }),
          cell([paragraph(right?.label ?? "", { bold: true })], label, { fill: LABEL_FILL, center: true }),
          cell([paragraph(right?.value ?? "")], value, { center: true }),
        ],
      })
    );
  }
  const wide = (title: string, values: string[]) =>
    new TableRow({
      children: [
        cell([paragraph(title, { bold: true })], label, { fill: LABEL_FILL }),
        cell(lines(values), CONTENT_WIDTH - label, { span: 3 }),
      ],
    });
  if (content.objectives.length > 0) rows.push(wide("Öğrenme Çıktıları", content.objectives));
  if (content.materials.length > 0) rows.push(wide("Araç-Gereç", content.materials));
  return table([label, value, label, value], rows);
}

function skillsTable(content: MebPlanContent): Table {
  const code = 900;
  const label = 3000;
  const items = CONTENT_WIDTH - code - label;
  return table([code, label, items], [
    headerRow("BECERİLER, EĞİLİMLER VE DEĞERLER (TYMM BECERİLER ÖRGÜSÜ)", 3),
    ...content.skills.map(
      (group) =>
        new TableRow({
          cantSplit: true,
          children: [
            cell([paragraph(group.code, { bold: true, align: AlignmentType.CENTER })], code, { fill: LABEL_FILL, center: true }),
            cell([paragraph(group.label, { bold: true })], label, { center: true }),
            cell([paragraph(group.items.join(", "))], items, { center: true }),
          ],
        })
    ),
  ]);
}

function processTable(content: MebPlanContent): Table {
  const phase = 1900;
  const time = 1500;
  const body = CONTENT_WIDTH - phase - time;
  const columnHeader = new TableRow({
    tableHeader: true,
    children: [
      cell([paragraph("Aşama", { bold: true, align: AlignmentType.CENTER })], phase, { fill: LABEL_FILL }),
      cell([paragraph("Süre", { bold: true, align: AlignmentType.CENTER })], time, { fill: LABEL_FILL }),
      cell([paragraph("Öğretmen ve Öğrenci Etkinlikleri", { bold: true, align: AlignmentType.CENTER })], body, { fill: LABEL_FILL }),
    ],
  });
  return table([phase, time, body], [
    headerRow(content.processTitle, 3),
    columnHeader,
    ...content.processRows.map(
      (row, index) =>
        new TableRow({
          children: [
            cell(
              [
                paragraph(`${index + 1}. ${row.phase}`, { bold: true }),
                ...(row.focus ? [paragraph(row.focus, { italics: true, size: SMALL })] : []),
              ],
              phase,
              { fill: LABEL_FILL }
            ),
            cell(
              [
                paragraph(row.time, { align: AlignmentType.CENTER }),
                ...(row.minutes ? [paragraph(`(${row.minutes})`, { size: SMALL, align: AlignmentType.CENTER })] : []),
              ],
              time
            ),
            cell(lines(row.content), body),
          ],
        })
    ),
  ]);
}

function assessmentTable(content: MebPlanContent): Table {
  const label = 2400;
  const rows: TableRow[] = [headerRow("ÖLÇME VE DEĞERLENDİRME", 2)];
  if (content.processAssessment.length > 0) {
    rows.push(
      new TableRow({
        children: [
          cell([paragraph("Süreç Değerlendirme", { bold: true })], label, { fill: LABEL_FILL }),
          cell(lines(content.processAssessment), CONTENT_WIDTH - label),
        ],
      })
    );
  }
  if (content.exitTicket.questions.length > 0) {
    rows.push(
      new TableRow({
        children: [
          cell([paragraph("Çıkış Bileti", { bold: true })], label, { fill: LABEL_FILL }),
          cell(
            [
              ...content.exitTicket.questions.map((question, index) => paragraph(`${index + 1}) ${question}`)),
              ...content.exitTicket.note.map((note) => paragraph(note, { italics: true, size: SMALL })),
            ],
            CONTENT_WIDTH - label
          ),
        ],
      })
    );
  }
  if (content.differentiation.length > 0) {
    rows.push(
      new TableRow({
        children: [
          cell([paragraph("Farklılaştırma", { bold: true })], label, { fill: LABEL_FILL }),
          cell(lines(content.differentiation), CONTENT_WIDTH - label),
        ],
      })
    );
  }
  return table([label, CONTENT_WIDTH - label], rows);
}

/** İmza alanı: solda Ders Öğretmeni, sağda "Uygundur" ve Okul Müdürü; kenarlıksız iki kutu. */
function signatureTable(content: MebPlanContent): Table {
  const half = CONTENT_WIDTH / 2;
  const box = (values: Paragraph[]) =>
    new TableCell({
      children: values,
      width: { size: half, type: WidthType.DXA },
      borders: { top: NO_BORDER, bottom: NO_BORDER, left: NO_BORDER, right: NO_BORDER },
      margins: { top: 120, bottom: 120, left: 100, right: 100 },
    });
  const center = AlignmentType.CENTER;
  return new Table({
    width: { size: CONTENT_WIDTH, type: WidthType.DXA },
    columnWidths: [half, half],
    layout: TableLayoutType.FIXED,
    borders: { top: NO_BORDER, bottom: NO_BORDER, left: NO_BORDER, right: NO_BORDER, insideHorizontal: NO_BORDER, insideVertical: NO_BORDER },
    rows: [
      new TableRow({
        cantSplit: true,
        children: [
          box([
            paragraph(content.dateText, { align: center }),
            paragraph("", { after: 480 }),
            paragraph("…………………………………", { align: center }),
            paragraph("Ders Öğretmeni", { bold: true, align: center }),
            paragraph("Ad Soyad / İmza", { size: SMALL, align: center }),
          ]),
          box([
            paragraph("UYGUNDUR", { bold: true, align: center }),
            paragraph("…… / …… / ……………", { align: center, after: 360 }),
            paragraph("…………………………………", { align: center }),
            paragraph("Okul Müdürü", { bold: true, align: center }),
            paragraph("Ad Soyad / İmza", { size: SMALL, align: center }),
          ]),
        ],
      }),
    ],
  });
}

export function buildMebPlanDocument(content: MebPlanContent): Document {
  const children: (Paragraph | Table)[] = [
    paragraph("T.C.", { bold: true, align: AlignmentType.CENTER, after: 0 }),
    paragraph("MİLLÎ EĞİTİM BAKANLIĞI", { bold: true, align: AlignmentType.CENTER, after: 0 }),
    paragraph("………………………………………… OKULU", { bold: true, align: AlignmentType.CENTER, after: 120 }),
    paragraph(content.title, { bold: true, size: 26, align: AlignmentType.CENTER, after: 200 }),
    infoTable(content),
    spacer(),
  ];
  if (content.skills.length > 0) children.push(skillsTable(content), spacer());
  children.push(processTable(content), spacer(), assessmentTable(content), spacer(), spacer(), signatureTable(content));

  return new Document({
    creator: "EduPilot",
    title: content.title,
    styles: { default: { document: { run: { font: FONT, size: SIZE } } } },
    sections: [
      {
        properties: {
          page: {
            size: { width: 11906, height: 16838 },
            margin: { top: 1134, bottom: 1134, left: 1134, right: 1134 },
          },
        },
        children,
      },
    ],
  });
}

export function packMebPlanDocx(content: MebPlanContent): Promise<Blob> {
  return Packer.toBlob(buildMebPlanDocument(content));
}
