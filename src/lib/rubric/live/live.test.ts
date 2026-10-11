import ExcelJS from "exceljs";
import { describe, expect, it } from "vitest";

import { buildClassSheet, classSheetFileName } from "@/lib/rubric/live/excel";
import { parseRoster } from "@/lib/rubric/live/roster";
import { clampHolisticScore, emptyScore, generateLiveFeedback, liveStatus, liveTotal } from "@/lib/rubric/live/scoring";
import type { LiveSession } from "@/lib/rubric/live/types";
import { mockRubricGenerationService } from "@/lib/rubric/mock-service";
import { buildRubricPrompt } from "@/lib/rubric/prompt";
import type { Rubric, RubricFormInput } from "@/types/rubric";

const INPUT: RubricFormInput = {
  subject: "Fen Bilimleri",
  gradeLevel: "7. Sınıf",
  topic: "Maddenin Tanecikli Yapısı",
  taskType: "deney",
  rubricType: "analitik",
  scale: 4,
  taskDescription: "",
  curriculum: null,
};

async function rubricOf(overrides: Partial<RubricFormInput> = {}): Promise<Rubric> {
  return mockRubricGenerationService.generate(buildRubricPrompt({ ...INPUT, ...overrides }));
}

function levelsAll(rubric: Rubric, level: number | ((index: number) => number)) {
  return Object.fromEntries(rubric.criteria.map((criterion, index) => [criterion.id, typeof level === "number" ? level : level(index)]));
}

describe("parseRoster", () => {
  it("e-Okul tablo kopyasını (sıra no, okul no, büyük harf, cinsiyet) ayrıştırır", () => {
    const pasted = "S.No\tÖğrenci No\tAdı\tSoyadı\tCinsiyeti\n1\t1024\tAYŞE\tYILDIZ\tKız\n2\t1031\tMEHMET ALİ\tKAYA\tErkek\n";
    expect(parseRoster(pasted)).toEqual([
      expect.objectContaining({ name: "Ayşe Yıldız", no: "1024" }),
      expect.objectContaining({ name: "Mehmet Ali Kaya", no: "1031" }),
    ]);
  });

  it("serbest satırları, boşlukları ve tekrarları işler", () => {
    const students = parseRoster("Elif Demir\n\n57 Can Öztürk\nZeynep Ak; 88\nElif Demir\n123");
    expect(students.map((student) => `${student.no ?? "-"} ${student.name}`)).toEqual(["- Elif Demir", "57 Can Öztürk", "88 Zeynep Ak"]);
    expect(new Set(students.map((student) => student.id)).size).toBe(3);
  });
});

describe("puan ve durum", () => {
  it("analitik toplam seçilen seviyelerin puanlarıdır; eksik kriter 0 sayılır", async () => {
    const rubric = await rubricOf();
    const full = { ...emptyScore(), levels: levelsAll(rubric, 3) };
    expect(liveTotal(rubric, full)).toBe(100);
    expect(liveStatus(rubric, full)).toBe("done");
    const partial = { ...emptyScore(), levels: { [rubric.criteria[0].id]: 3 } };
    expect(liveTotal(rubric, partial)).toBe(rubric.criteria[0].weight);
    expect(liveStatus(rubric, partial)).toBe("partial");
    expect(liveStatus(rubric, undefined)).toBe("waiting");
  });

  it("bütüncül puan seçilen düzeyin aralığında kalır", async () => {
    const rubric = await rubricOf({ rubricType: "butuncul" });
    expect(clampHolisticScore(rubric, 2, 99)).toBe(75);
    expect(clampHolisticScore(rubric, 2, 10)).toBe(51);
    expect(liveTotal(rubric, { ...emptyScore(), holisticLevel: 2, holisticScore: 60 })).toBe(60);
  });
});

describe("generateLiveFeedback", () => {
  it("güçlü yön ve gelişim alanını rubriğin öğrenci ipucuyla sentezler (sen dili)", async () => {
    const rubric = await rubricOf();
    const levels = levelsAll(rubric, (index) => (index === 0 ? 3 : index === 2 ? 0 : 2));
    const text = generateLiveFeedback(rubric, "Ayşe Yıldız", { ...emptyScore(), levels });
    expect(text.startsWith("Ayşe, ")).toBe(true);
    expect(text).toContain(`“${rubric.criteria[0].teacherCriterion.title}”`);
    expect(text).toContain(`“${rubric.criteria[2].teacherCriterion.title}”`);
    expect(text).toContain(rubric.criteria[2].studentFriendlyCriterion.hint.replace(/\.$/, ""));
    expect(text.split(/[.!]\s/).length).toBeLessThanOrEqual(3);
  });

  it("tek bir düşük kriter orta düzeydeki öğrenciyi 'zorlanıyor' tonuna düşürmez", async () => {
    const rubric = await rubricOf();
    // İyi, İyi, Yetersiz, İyi, İyi → yaklaşık %65
    const levels = levelsAll(rubric, (index) => (index === 2 ? 0 : 2));
    const text = generateLiveFeedback(rubric, "Mehmet Ali Kaya", { ...emptyScore(), levels });
    expect(text).toContain("iyi bir iş çıkardın");
    expect(text).toContain("ölçütlerinde");
    expect(text).not.toContain("yardım istemekten");
  });

  it("tam puanda övgü, hepsi en düşükte destekleyici dil kullanır", async () => {
    const rubric = await rubricOf();
    expect(generateLiveFeedback(rubric, "Can", { ...emptyScore(), levels: levelsAll(rubric, 3) })).toContain("tüm ölçütlerde en üst düzeyde");
    expect(generateLiveFeedback(rubric, "Can", { ...emptyScore(), levels: levelsAll(rubric, 0) })).toContain("yardım istemekten çekinme");
    expect(generateLiveFeedback(rubric, "Can", emptyScore())).toBe("");
  });

  it("bütüncül rubrikte düzeyin öğrenci dilindeki tanımını kullanır", async () => {
    const rubric = await rubricOf({ rubricType: "butuncul" });
    const text = generateLiveFeedback(rubric, "Zeynep Ak", { ...emptyScore(), holisticLevel: 1, holisticScore: 40 });
    expect(text.startsWith("Zeynep, ")).toBe(true);
    expect(text).toContain("bir üst düzeye");
  });
});

describe("sınıf çizelgesi (.xlsx)", () => {
  it("No, Ad Soyad, kriter puanları, toplam ve geri bildirim sütunlarını yazar", async () => {
    const rubric = await rubricOf();
    const students = parseRoster("1024 Ayşe Yıldız\n1031 Mehmet Kaya\n1040 Elif Demir");
    const scores = {
      [students[0].id]: { ...emptyScore(), levels: levelsAll(rubric, 3), feedback: "Harika iş." },
      [students[1].id]: { ...emptyScore(), levels: levelsAll(rubric, 1), feedback: "Gelişiyorsun." },
    };
    const session: LiveSession = { version: 1, rubricId: rubric.id, students, scores };
    const buffer = await buildClassSheet(ExcelJS, rubric, session, new Date(2026, 9, 11)).xlsx.writeBuffer();

    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer as ArrayBuffer);
    const sheet = workbook.getWorksheet("Değerlendirme")!;
    const header = (sheet.getRow(4).values as unknown[]).slice(1);
    expect(header[0]).toBe("No");
    expect(header[1]).toBe("Ad Soyad");
    expect(header[2]).toBe(`K1. ${rubric.criteria[0].teacherCriterion.title} (${rubric.criteria[0].weight})`);
    expect(header.slice(-3)).toEqual(["Toplam (100)", "Durum", "Geri Bildirim"]);

    const row = (index: number) => (sheet.getRow(5 + index).values as unknown[]).slice(1);
    expect(row(0).slice(0, 2)).toEqual([1024, "Ayşe Yıldız"]);
    expect(row(0).at(-3)).toBe(100);
    expect(row(0).at(-1)).toBe("Harika iş.");
    expect(row(1).at(-3)).toBe(liveTotal(rubric, scores[students[1].id]));
    // Bekleyen öğrencinin puan ve geri bildirim hücreleri boş, durumu "Bekliyor".
    expect(sheet.getRow(7).getCell(header.length - 1).value).toBe("Bekliyor");
    expect(sheet.getRow(7).getCell(header.length - 2).value).toBeNull();
    expect(sheet.getRow(5 + 3).getCell(header.length - 2).value).toBe((100 + liveTotal(rubric, scores[students[1].id])) / 2);
    expect(classSheetFileName(rubric)).toBe("Fen_Bilimleri_Maddenin_Tanecikli_Yapısı_Degerlendirme_Cizelgesi.xlsx");
  });
});

describe("AI geri bildirim yardımcıları", () => {
  it("istek öğrenci adını içermez; yanıttaki {AD} ilk adla değiştirilir", async () => {
    const { applyStudentName, buildFeedbackRequest, validateAiFeedback } = await import("@/lib/rubric/live/ai-feedback");
    const rubric = await rubricOf();
    const score = { ...emptyScore(), levels: levelsAll(rubric, (index) => (index === 0 ? 3 : 1)) };
    const request = buildFeedbackRequest(rubric, score, liveTotal(rubric, score))!;
    expect(JSON.stringify(request)).not.toContain("Ayşe");
    expect(request.criteria).toHaveLength(rubric.criteria.length);
    expect(request.criteria[0]).toEqual(expect.objectContaining({ level: "Çok İyi", points: rubric.criteria[0].weight }));
    expect(buildFeedbackRequest(rubric, emptyScore(), 0)).toBeNull();

    expect(applyStudentName("{AD}, hipotezini çok net kurdun.", "Ayşe Yıldız")).toBe("Ayşe, hipotezini çok net kurdun.");
    expect(validateAiFeedback("{AD}, hipotezini net kurdun. Verilerini tabloya yaz.")).toBeNull();
    expect(validateAiFeedback("Ayşe hipotezini net kurdu.")).toContain("{AD}");
    expect(validateAiFeedback("{AD}, öğrenci olarak iyi çalıştın.")).toContain("sen diliyle");
  });
});
