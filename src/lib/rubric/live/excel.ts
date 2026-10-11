import type ExcelJS from "exceljs";

import { liveStatus, liveTotal } from "@/lib/rubric/live/scoring";
import type { LiveSession } from "@/lib/rubric/live/types";
import { RUBRIC_SCALE_LEVELS, type Rubric } from "@/types/rubric";

const STATUS_LABEL = { done: "Değerlendirildi", partial: "Eksik", waiting: "Bekliyor" } as const;
const HEADER_FILL = "FFD9E2F3";
const BORDER: Partial<ExcelJS.Borders> = {
  top: { style: "thin", color: { argb: "FFBFBFBF" } },
  bottom: { style: "thin", color: { argb: "FFBFBFBF" } },
  left: { style: "thin", color: { argb: "FFBFBFBF" } },
  right: { style: "thin", color: { argb: "FFBFBFBF" } },
};

/**
 * Sınıf değerlendirme çizelgesi: No, Ad Soyad, kriter puanları (ya da
 * bütüncül düzey), Toplam, Durum ve geri bildirim. Puanlanmamış hücreler
 * boş bırakılır; altta değerlendirilen öğrencilerin ortalaması yer alır.
 * `ExcelJS` modülü parametre olarak verilir: tarayıcıda dinamik içe
 * aktarılır, testlerde doğrudan kullanılır.
 */
export function buildClassSheet(excel: typeof ExcelJS, rubric: Rubric, session: LiveSession, date: Date = new Date()): ExcelJS.Workbook {
  const workbook = new excel.Workbook();
  workbook.creator = "EduPilot";
  workbook.created = date;
  const sheet = workbook.addWorksheet("Değerlendirme", {
    views: [{ state: "frozen", xSplit: 2, ySplit: 4 }],
    pageSetup: { orientation: "landscape", paperSize: 9, fitToPage: true, fitToWidth: 1, fitToHeight: 0 },
  });

  const holistic = rubric.rubricType === "butuncul";
  const levels = RUBRIC_SCALE_LEVELS[rubric.scale];
  const criterionHeaders = holistic
    ? ["Düzey"]
    : rubric.criteria.map((criterion, index) => `K${index + 1}. ${criterion.teacherCriterion.title} (${criterion.weight})`);
  const headers = ["No", "Ad Soyad", ...criterionHeaders, "Toplam (100)", "Durum", "Geri Bildirim"];
  const lastColumn = headers.length;

  // Başlık blokları: belge adı ve tarih
  sheet.mergeCells(1, 1, 1, lastColumn);
  sheet.getCell(1, 1).value = `${rubric.subject} · ${rubric.gradeLevel} · ${rubric.topic} — ${rubric.taskTitle}`;
  sheet.getCell(1, 1).font = { bold: true, size: 13 };
  sheet.mergeCells(2, 1, 2, lastColumn);
  sheet.getCell(2, 1).value = `Sınıf Değerlendirme Çizelgesi · ${new Intl.DateTimeFormat("tr-TR").format(date)}`;
  sheet.getCell(2, 1).font = { italic: true, color: { argb: "FF595959" } };

  const headerRow = sheet.getRow(4);
  headers.forEach((header, index) => {
    const cell = headerRow.getCell(index + 1);
    cell.value = header;
    cell.font = { bold: true };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: HEADER_FILL } };
    cell.alignment = { vertical: "middle", horizontal: index < 2 || index === lastColumn - 1 ? "left" : "center", wrapText: true };
    cell.border = BORDER;
  });
  headerRow.height = 42;

  const totals: number[] = [];
  session.students.forEach((student, rowIndex) => {
    const score = session.scores[student.id];
    const status = liveStatus(rubric, score);
    const criterionValues = holistic
      ? [score?.holisticLevel !== undefined ? levels[score.holisticLevel].label : null]
      : rubric.criteria.map((criterion) => {
          const level = score?.levels[criterion.id];
          return level === undefined ? null : criterion.levelPoints[level];
        });
    const total = status === "waiting" ? null : liveTotal(rubric, score);
    if (status === "done" && total !== null) totals.push(total);
    const row = sheet.getRow(5 + rowIndex);
    row.values = [
      student.no ? Number(student.no) : null,
      student.name,
      ...criterionValues,
      total,
      STATUS_LABEL[status],
      score?.feedback?.trim() || null,
    ];
    row.eachCell({ includeEmpty: true }, (cell, column) => {
      cell.border = BORDER;
      cell.alignment = { vertical: "top", horizontal: column <= 2 || column === lastColumn ? "left" : "center", wrapText: column === lastColumn };
    });
    row.getCell(lastColumn - 2).font = { bold: true };
  });

  const summaryRow = sheet.getRow(5 + session.students.length);
  summaryRow.getCell(2).value = "Sınıf ortalaması (değerlendirilenler)";
  summaryRow.getCell(lastColumn - 2).value =
    totals.length > 0 ? Math.round((totals.reduce((sum, value) => sum + value, 0) / totals.length) * 10) / 10 : null;
  summaryRow.font = { bold: true };
  summaryRow.getCell(lastColumn - 2).alignment = { horizontal: "center" };

  sheet.columns.forEach((column, index) => {
    // Sütun sırası: No, Ad Soyad, kriterler…, Toplam, Durum, Geri Bildirim
    const fromEnd = lastColumn - 1 - index;
    column.width = index === 0 ? 8 : index === 1 ? 26 : fromEnd === 0 ? 70 : fromEnd === 1 ? 16 : fromEnd === 2 ? 13 : holistic ? 16 : 14;
  });
  return workbook;
}

export function classSheetFileName(rubric: Pick<Rubric, "subject" | "topic">): string {
  const part = (value: string) => value.trim().replace(/[\\/:*?"<>|.]+/g, "").replace(/\s+/g, "_") || "Ders";
  return `${part(rubric.subject)}_${part(rubric.topic)}_Degerlendirme_Cizelgesi.xlsx`;
}

/** Tarayıcıda indirir; exceljs yalnızca bu düğmeye basıldığında yüklenir. */
export async function downloadClassSheet(rubric: Rubric, session: LiveSession): Promise<string> {
  const excelModule = await import("exceljs");
  const excel = ("default" in excelModule ? excelModule.default : excelModule) as typeof ExcelJS;
  const buffer = await buildClassSheet(excel, rubric, session).xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
  const fileName = classSheetFileName(rubric);
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 10_000);
  return fileName;
}
