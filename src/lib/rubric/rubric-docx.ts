import {
  AlignmentType,
  BorderStyle,
  Document,
  Packer,
  PageOrientation,
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

import { RUBRIC_TYPE_DEFINITIONS, TASK_TYPE_DEFINITIONS } from "@/lib/rubric/definitions";
import { RUBRIC_SCALE_LEVELS, type Rubric } from "@/types/rubric";

/**
 * Rubrik Word çıktıları:
 *  - Resmî rubrik: A4 yatay, MEB başlığı, TYMM kodları, puanlı ölçek, zümre ve müdür onayı.
 *  - Öğrenci kâğıdı: A4 yatay sayfada yan yana iki A5 form (ortadan kesilir), sen dili, kutucuklar.
 */

const FONT = "Times New Roman";
const BOX_FONT = "Segoe UI Symbol";
const HEADER_FILL = "D9E2F3";
const LABEL_FILL = "F2F2F2";
const BORDER = { style: BorderStyle.SINGLE, size: 4, color: "808080" } as const;
const NONE = { style: BorderStyle.NONE, size: 0, color: "FFFFFF" } as const;
/**
 * A4 yatay. `docx` yatay yönde genişlik/yüksekliği kendisi değiştirir; bu yüzden kütüphaneye dikey ölçüler
 * verilir, yerleşim hesapları ise yatay sayfa genişliğiyle (16838 twip) yapılır.
 */
const LANDSCAPE = { width: 11906, height: 16838, orientation: PageOrientation.LANDSCAPE } as const;
const LANDSCAPE_WIDTH = 16838;

type Align = (typeof AlignmentType)[keyof typeof AlignmentType];
interface TextOptions {
  bold?: boolean;
  italics?: boolean;
  size?: number;
  align?: Align;
  after?: number;
  color?: string;
}

function para(value: string, options: TextOptions = {}, size = 20): Paragraph {
  return new Paragraph({
    alignment: options.align,
    spacing: { before: 0, after: options.after ?? 40 },
    children: [
      new TextRun({ text: value, font: FONT, size: options.size ?? size, bold: options.bold, italics: options.italics, color: options.color }),
    ],
  });
}

function cell(children: Paragraph[], width: number, options: { fill?: string; span?: number; center?: boolean } = {}): TableCell {
  return new TableCell({
    children: children.length > 0 ? children : [para("")],
    width: { size: width, type: WidthType.DXA },
    columnSpan: options.span,
    verticalAlign: options.center ? VerticalAlignTable.CENTER : VerticalAlignTable.TOP,
    shading: options.fill ? { type: ShadingType.CLEAR, color: "auto", fill: options.fill } : undefined,
    margins: { top: 50, bottom: 50, left: 90, right: 90 },
  });
}

function table(widths: number[], rows: TableRow[], borders = true): Table {
  const b = borders ? BORDER : NONE;
  return new Table({
    width: { size: widths.reduce((sum, value) => sum + value, 0), type: WidthType.DXA },
    columnWidths: widths,
    layout: TableLayoutType.FIXED,
    borders: { top: b, bottom: b, left: b, right: b, insideHorizontal: b, insideVertical: b },
    rows,
  });
}

function headerRow(title: string, width: number, span: number): TableRow {
  return new TableRow({
    tableHeader: true,
    children: [cell([para(title, { bold: true, align: AlignmentType.CENTER, after: 0 })], width, { fill: HEADER_FILL, span })],
  });
}

const spacer = () => new Paragraph({ spacing: { before: 0, after: 140 }, children: [] });

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat("tr-TR", { day: "2-digit", month: "2-digit", year: "numeric" }).format(date);
}

function codesLine(codes: string[]): string {
  return codes.length > 0 ? `TYMM: ${codes.join(", ")}` : "";
}

// ---------------------------------------------------------------- resmî rubrik

const OFFICIAL_MARGIN = 850; // 1,5 cm
const OFFICIAL_WIDTH = LANDSCAPE_WIDTH - OFFICIAL_MARGIN * 2;

function officialInfo(rubric: Rubric, date: Date): Table {
  const label = 1900;
  const value = OFFICIAL_WIDTH / 4 - label;
  const pairs: [string, string][] = [
    ["Ders", rubric.subject],
    ["Sınıf", rubric.gradeLevel],
    ["Konu", rubric.topic],
    ["Görev Türü", TASK_TYPE_DEFINITIONS[rubric.taskType].label],
    ["Rubrik Türü", RUBRIC_TYPE_DEFINITIONS[rubric.rubricType].label],
    ["Puan Skalası", `${rubric.scale} seviye · ${rubric.rubricType === "butuncul" ? "0-100 puan aralığı" : "toplam 100 puan"}`],
    ["Görev", rubric.taskTitle],
    ["Tarih", formatDate(date)],
  ];
  const rows: TableRow[] = [headerRow("RUBRİK BİLGİLERİ", OFFICIAL_WIDTH, 4)];
  for (let i = 0; i < pairs.length; i += 2) {
    rows.push(
      new TableRow({
        children: [
          cell([para(pairs[i][0], { bold: true })], label, { fill: LABEL_FILL, center: true }),
          cell([para(pairs[i][1])], value, { center: true }),
          cell([para(pairs[i + 1][0], { bold: true })], label, { fill: LABEL_FILL, center: true }),
          cell([para(pairs[i + 1][1])], value, { center: true }),
        ],
      })
    );
  }
  rows.push(
    new TableRow({
      children: [
        cell([para("Görev Tanımı", { bold: true })], label, { fill: LABEL_FILL }),
        cell([para(rubric.teacherTaskSummary)], OFFICIAL_WIDTH - label, { span: 3 }),
      ],
    })
  );
  return table([label, value, label, value], rows);
}

function officialSkills(rubric: Rubric): Table | undefined {
  const label = 3200;
  const rows: TableRow[] = [];
  const add = (title: string, lines: string[]) => {
    if (lines.length === 0) return;
    rows.push(
      new TableRow({
        cantSplit: true,
        children: [cell([para(title, { bold: true })], label, { fill: LABEL_FILL }), cell(lines.map((line) => para(line)), OFFICIAL_WIDTH - label)],
      })
    );
  };
  const curriculum = rubric.curriculum;
  if (curriculum) {
    add("Öğrenme Çıktıları", curriculum.outcomes.map((outcome) => `${outcome.code} — ${outcome.text}`));
    add("Sosyal-Duygusal Öğrenme Becerileri (SDB)", [curriculum.sdb.map((tag) => `${tag.code} ${tag.label}`).join(", ")].filter(Boolean));
    add("Değerler (D)", [curriculum.values.map((tag) => `${tag.code} ${tag.label}`).join(", ")].filter(Boolean));
    add("Okuryazarlık Becerileri (OB)", [curriculum.literacy.map((tag) => `${tag.code} ${tag.label}`).join(", ")].filter(Boolean));
  }
  const kb = [...new Set(rubric.criteria.flatMap((criterion) => criterion.conceptualSkills))];
  add("Kavramsal Beceriler (KB)", kb.length > 0 ? [kb.join(", ")] : []);
  if (rows.length === 0) return undefined;
  return table([label, OFFICIAL_WIDTH - label], [headerRow("TYMM BECERİLER ÖRGÜSÜ VE ÖĞRENME ÇIKTILARI", OFFICIAL_WIDTH, 2), ...rows]);
}

/** Analitik / akran-öz: Ölçüt | Puan | seviyeler (yüksekten düşüğe). */
function officialAnalytic(rubric: Rubric): Table {
  const levels = RUBRIC_SCALE_LEVELS[rubric.scale];
  const order = levels.map((_, index) => levels.length - 1 - index);
  const criterionWidth = 3600;
  const pointsWidth = 900;
  const levelWidth = Math.floor((OFFICIAL_WIDTH - criterionWidth - pointsWidth) / levels.length);
  const widths = [criterionWidth, pointsWidth, ...order.map(() => levelWidth)];
  const total = widths.reduce((sum, value) => sum + value, 0);
  const head = new TableRow({
    tableHeader: true,
    children: [
      cell([para("Ölçüt", { bold: true, align: AlignmentType.CENTER })], criterionWidth, { fill: LABEL_FILL, center: true }),
      cell([para("Puan", { bold: true, align: AlignmentType.CENTER })], pointsWidth, { fill: LABEL_FILL, center: true }),
      ...order.map((index) =>
        cell([para(levels[index].label, { bold: true, align: AlignmentType.CENTER }), para(`(${index + 1})`, { size: 16, align: AlignmentType.CENTER, after: 0 })], levelWidth, {
          fill: LABEL_FILL,
          center: true,
        })
      ),
    ],
  });
  const rows = rubric.criteria.map(
    (criterion, number) =>
      new TableRow({
        cantSplit: true,
        children: [
          cell(
            [
              para(`${number + 1}. ${criterion.teacherCriterion.title}`, { bold: true }),
              para(criterion.teacherCriterion.description, { size: 18 }),
              ...(criterion.skillCodes.length > 0 ? [para(codesLine(criterion.skillCodes), { size: 16, italics: true, color: "1F3864" })] : []),
            ],
            criterionWidth
          ),
          cell([para(`${criterion.weight}`, { bold: true, align: AlignmentType.CENTER })], pointsWidth, { center: true }),
          ...order.map((index) =>
            cell(
              [para(criterion.teacherCriterion.levels[index], { size: 18 }), para(`${criterion.levelPoints[index]} puan`, { size: 16, bold: true, align: AlignmentType.RIGHT, after: 0 })],
              levelWidth
            )
          ),
        ],
      })
  );
  const totalRow = new TableRow({
    children: [
      cell([para("TOPLAM", { bold: true, align: AlignmentType.RIGHT })], criterionWidth, { fill: LABEL_FILL }),
      cell([para("100", { bold: true, align: AlignmentType.CENTER })], pointsWidth, { fill: LABEL_FILL }),
      cell([para("Alınan puan: ……… / 100", { bold: true })], levelWidth * order.length, { span: order.length }),
    ],
  });
  return table(widths, [headerRow(RUBRIC_TYPE_DEFINITIONS[rubric.rubricType].documentTitle, total, widths.length), head, ...rows, totalRow]);
}

/** Bütüncül: Düzey | Puan aralığı | Tanım; ardından dikkate alınacak ölçütler. */
function officialHolistic(rubric: Rubric): Table[] {
  const levels = RUBRIC_SCALE_LEVELS[rubric.scale];
  const levelWidth = 2200;
  const rangeWidth = 1500;
  const descWidth = OFFICIAL_WIDTH - levelWidth - rangeWidth;
  const levelRows = [...rubric.holisticLevels.keys()].reverse().map(
    (index) =>
      new TableRow({
        cantSplit: true,
        children: [
          cell([para(levels[index].label, { bold: true })], levelWidth, { fill: LABEL_FILL, center: true }),
          cell([para(`${rubric.holisticLevels[index].range.min}–${rubric.holisticLevels[index].range.max}`, { align: AlignmentType.CENTER })], rangeWidth, { center: true }),
          cell([para(rubric.holisticLevels[index].teacher)], descWidth),
        ],
      })
  );
  const head = new TableRow({
    tableHeader: true,
    children: [
      cell([para("Düzey", { bold: true, align: AlignmentType.CENTER })], levelWidth, { fill: LABEL_FILL }),
      cell([para("Puan Aralığı", { bold: true, align: AlignmentType.CENTER })], rangeWidth, { fill: LABEL_FILL }),
      cell([para("Performans Tanımı", { bold: true, align: AlignmentType.CENTER })], descWidth, { fill: LABEL_FILL }),
    ],
  });
  const criteriaWidth = 4200;
  const criteriaRows = rubric.criteria.map(
    (criterion, number) =>
      new TableRow({
        cantSplit: true,
        children: [
          cell([para(`${number + 1}. ${criterion.teacherCriterion.title}`, { bold: true })], criteriaWidth),
          cell(
            [
              para(criterion.teacherCriterion.description),
              ...(criterion.skillCodes.length > 0 ? [para(codesLine(criterion.skillCodes), { size: 16, italics: true, color: "1F3864" })] : []),
            ],
            OFFICIAL_WIDTH - criteriaWidth
          ),
        ],
      })
  );
  return [
    table([levelWidth, rangeWidth, descWidth], [headerRow(RUBRIC_TYPE_DEFINITIONS.butuncul.documentTitle, OFFICIAL_WIDTH, 3), head, ...levelRows]),
    table([criteriaWidth, OFFICIAL_WIDTH - criteriaWidth], [headerRow("DEĞERLENDİRMEDE DİKKATE ALINACAK ÖLÇÜTLER", OFFICIAL_WIDTH, 2), ...criteriaRows]),
  ];
}

function signatureTable(date: Date): Table {
  const width = OFFICIAL_WIDTH / 4;
  const box = (lines: Paragraph[]) =>
    new TableCell({
      children: lines,
      width: { size: width, type: WidthType.DXA },
      borders: { top: NONE, bottom: NONE, left: NONE, right: NONE },
      margins: { top: 80, bottom: 80, left: 80, right: 80 },
    });
  const center = AlignmentType.CENTER;
  const teacher = () =>
    box([para("", { after: 360 }), para("…………………………………", { align: center }), para("Zümre Öğretmeni", { bold: true, align: center }), para("Ad Soyad / İmza", { size: 16, align: center })]);
  return new Table({
    width: { size: OFFICIAL_WIDTH, type: WidthType.DXA },
    columnWidths: [width, width, width, width],
    layout: TableLayoutType.FIXED,
    borders: { top: NONE, bottom: NONE, left: NONE, right: NONE, insideHorizontal: NONE, insideVertical: NONE },
    rows: [
      new TableRow({
        cantSplit: true,
        children: [
          teacher(),
          teacher(),
          teacher(),
          box([
            para("UYGUNDUR", { bold: true, align: center }),
            para(`…… / …… / ${date.getFullYear()}`, { align: center, after: 240 }),
            para("…………………………………", { align: center }),
            para("Okul Müdürü", { bold: true, align: center }),
            para("Ad Soyad / İmza", { size: 16, align: center }),
          ]),
        ],
      }),
    ],
  });
}

export function buildOfficialRubricDocument(rubric: Rubric, date: Date = new Date()): Document {
  const center = AlignmentType.CENTER;
  const skills = officialSkills(rubric);
  const children: (Paragraph | Table)[] = [
    para("T.C.", { bold: true, align: center, after: 0, size: 22 }),
    para("MİLLÎ EĞİTİM BAKANLIĞI", { bold: true, align: center, after: 0, size: 22 }),
    para("………………………………………… OKULU", { bold: true, align: center, after: 80, size: 22 }),
    para(`${rubric.subject.toLocaleUpperCase("tr-TR")} DERSİ ${RUBRIC_TYPE_DEFINITIONS[rubric.rubricType].documentTitle}`, { bold: true, align: center, after: 160, size: 24 }),
    officialInfo(rubric, date),
    spacer(),
  ];
  if (skills) children.push(skills, spacer());
  if (rubric.rubricType === "butuncul") {
    const [levels, criteria] = officialHolistic(rubric);
    children.push(levels, spacer(), criteria);
  } else {
    children.push(officialAnalytic(rubric));
  }
  children.push(
    spacer(),
    para("Öğrencinin Adı Soyadı: ………………………………………   Sınıfı / No: …………   Toplam Puan: ……… / 100", { bold: true }),
    spacer(),
    signatureTable(date)
  );
  return new Document({
    creator: "EduPilot",
    title: `${rubric.subject} ${rubric.topic} Rubrik`,
    styles: { default: { document: { run: { font: FONT, size: 20 } } } },
    sections: [
      {
        properties: {
          page: {
            size: LANDSCAPE,
            margin: { top: OFFICIAL_MARGIN, bottom: OFFICIAL_MARGIN, left: OFFICIAL_MARGIN, right: OFFICIAL_MARGIN },
          },
        },
        children,
      },
    ],
  });
}

// ---------------------------------------------------------------- öğrenci kâğıdı (2 × A5)

const SHEET_MARGIN = 567; // 1 cm
/** Yarım sayfa genişliği: kesim çizgisinin iki yanında eşit A5 alan. */
const HALF_WIDTH = (LANDSCAPE_WIDTH - SHEET_MARGIN * 2) / 2;
const SMALL = 18;

function box(): TextRun {
  return new TextRun({ text: "☐", font: BOX_FONT, size: 24 });
}

function studentForm(rubric: Rubric): (Paragraph | Table)[] {
  const isPeer = rubric.rubricType === "akranOz";
  const center = AlignmentType.CENTER;
  const title = isPeer ? "ÖZ VE AKRAN DEĞERLENDİRME FORMU" : "KONTROL LİSTEM";
  const inner = HALF_WIDTH - 2 * 340;
  const numberWidth = 400;
  const markWidth = isPeer ? 1500 : 900;
  const questionWidth = inner - numberWidth - markWidth;
  const markCells = (bold: boolean) =>
    isPeer
      ? [
          new Paragraph({ alignment: center, spacing: { after: 0 }, children: bold ? [new TextRun({ text: "Ben   Akranım", font: FONT, size: 16, bold: true })] : [box(), new TextRun({ text: "      " }), box()] }),
        ]
      : [new Paragraph({ alignment: center, spacing: { after: 0 }, children: bold ? [new TextRun({ text: "Yaptım", font: FONT, size: 16, bold: true })] : [box()] })];

  const rows = [
    new TableRow({
      tableHeader: true,
      children: [
        cell([para("#", { bold: true, align: center, size: 16 })], numberWidth, { fill: LABEL_FILL, center: true }),
        cell([para("Kendine sor", { bold: true, size: 16 })], questionWidth, { fill: LABEL_FILL, center: true }),
        cell(markCells(true), markWidth, { fill: LABEL_FILL, center: true }),
      ],
    }),
    ...rubric.criteria.map(
      (criterion, index) =>
        new TableRow({
          cantSplit: true,
          children: [
            cell([para(`${index + 1}`, { bold: true, align: center, size: SMALL })], numberWidth, { center: true }),
            cell(
              [
                para(criterion.studentFriendlyCriterion.question, { bold: true, size: SMALL, after: 10 }),
                para(`İpucu: ${criterion.studentFriendlyCriterion.hint}`, { italics: true, size: 15, after: 0, color: "404040" }),
              ],
              questionWidth
            ),
            cell(markCells(false), markWidth, { center: true }),
          ],
        })
    ),
  ];

  const parts: (Paragraph | Table)[] = [
    para(title, { bold: true, align: center, size: 22, after: 20 }),
    para(`${rubric.subject} · ${rubric.gradeLevel} · ${rubric.topic}`, { align: center, size: 16, after: 80, color: "404040" }),
    para("Adım Soyadım: ……………………………………   No: ………   Tarih: …… / …… / ………", { size: SMALL, after: 60 }),
    para(`Görevim: ${rubric.taskTitle}`, { bold: true, size: SMALL, after: 10 }),
    para(rubric.studentTaskSummary, { italics: true, size: SMALL, after: 80 }),
    table([numberWidth, questionWidth, markWidth], rows),
  ];

  if (rubric.rubricType === "butuncul" && rubric.holisticLevels.length > 0) {
    parts.push(para("Çalışmamı genel olarak şöyle görüyorum:", { bold: true, size: SMALL, after: 20 }));
    for (const level of [...rubric.holisticLevels].reverse()) {
      parts.push(new Paragraph({ spacing: { after: 10 }, children: [box(), new TextRun({ text: `  ${level.student}`, font: FONT, size: SMALL })] }));
    }
  }
  parts.push(
    para("", { after: 40 }),
    para("Bir dahaki sefere geliştireceğim şey: ……………………………………………………………", { size: SMALL, after: 60 }),
    ...(isPeer
      ? [
          para("Değerlendirdiğim arkadaşım: ……………………………………", { size: SMALL, after: 60 }),
          para("Arkadaşıma önerim: ………………………………………………………………………", { size: SMALL, after: 0 }),
        ]
      : [])
  );
  return parts;
}

export function buildStudentSheetDocument(rubric: Rubric): Document {
  const form = () =>
    new TableCell({
      children: studentForm(rubric) as Paragraph[],
      width: { size: HALF_WIDTH, type: WidthType.DXA },
      margins: { top: 120, bottom: 120, left: 340, right: 340 },
      borders: { top: NONE, bottom: NONE, left: NONE, right: NONE },
    });
  const cut = { style: BorderStyle.DASHED, size: 6, color: "999999" } as const;
  const sheet = new Table({
    width: { size: HALF_WIDTH * 2, type: WidthType.DXA },
    columnWidths: [HALF_WIDTH, HALF_WIDTH],
    layout: TableLayoutType.FIXED,
    // Ortadaki kesikli dikey çizgi: sayfa ikiye kesilerek iki A5 form elde edilir.
    borders: { top: NONE, bottom: NONE, left: NONE, right: NONE, insideHorizontal: NONE, insideVertical: cut },
    rows: [new TableRow({ cantSplit: true, children: [form(), form()] })],
  });
  return new Document({
    creator: "EduPilot",
    title: `${rubric.subject} ${rubric.topic} Öğrenci Formu`,
    styles: { default: { document: { run: { font: FONT, size: SMALL } } } },
    sections: [
      {
        properties: {
          page: { size: LANDSCAPE, margin: { top: SHEET_MARGIN, bottom: SHEET_MARGIN, left: SHEET_MARGIN, right: SHEET_MARGIN } },
        },
        children: [sheet],
      },
    ],
  });
}

export function rubricFileName(rubric: Pick<Rubric, "subject" | "topic">, kind: "rubrik" | "ogrenci"): string {
  const part = (value: string) => value.trim().replace(/[\\/:*?"<>|.]+/g, "").replace(/\s+/g, "_") || "Ders";
  return `${part(rubric.subject)}_${part(rubric.topic)}_${kind === "rubrik" ? "Rubrik" : "Ogrenci_Formu"}.docx`;
}

export function packDocument(document: Document): Promise<Blob> {
  return Packer.toBlob(document);
}
