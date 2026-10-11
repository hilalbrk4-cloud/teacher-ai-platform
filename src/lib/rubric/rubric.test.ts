import { describe, expect, it } from "vitest";

import { getCurriculumGrade, resolveCurriculumSelection } from "@/lib/curriculum/repository";
import { mockRubricGenerationService } from "@/lib/rubric/mock-service";
import { buildRubricPrompt } from "@/lib/rubric/prompt";
import { buildRubricJsonSchema, validateRubricBody } from "@/lib/rubric/schema";
import { holisticRanges, levelPoints, normalizeWeights } from "@/lib/rubric/scoring";
import { RUBRIC_TASK_TYPES, RUBRIC_TYPES, type RubricFormInput } from "@/types/rubric";

const FEN_7 = getCurriculumGrade("fen-bilimleri-7")!;
const UNIT = FEN_7.units.find((unit) => unit.topics.some((topic) => topic.name === "Maddenin Tanecikli Yapısı"))!;
const TOPIC = UNIT.topics.find((topic) => topic.name === "Maddenin Tanecikli Yapısı")!;
const CURRICULUM = resolveCurriculumSelection({
  gradeId: FEN_7.id,
  unitId: UNIT.id,
  topicId: TOPIC.id,
  outcomeCodes: TOPIC.outcomeCodes.slice(0, 2),
})!;

const INPUT: RubricFormInput = {
  subject: "Fen Bilimleri",
  gradeLevel: "7. Sınıf",
  topic: TOPIC.name,
  taskType: "deney",
  rubricType: "analitik",
  scale: 4,
  taskDescription: "",
  curriculum: null,
};

describe("puanlama", () => {
  it("ağırlıkları toplamı tam 100 olan 5'in katlarına çevirir", () => {
    for (const raw of [[3, 3, 2, 2, 2], [1, 1, 1], [10, 1, 1, 1, 1, 1], [7, 0, -2, 4]]) {
      const weights = normalizeWeights(raw);
      expect(weights.reduce((sum, value) => sum + value, 0)).toBe(100);
      expect(weights.every((value) => value >= 5 && value % 5 === 0)).toBe(true);
    }
  });

  it("seviye puanları en yüksek seviyede ağırlığa ulaşır", () => {
    expect(levelPoints(20, 4)).toEqual([5, 10, 15, 20]);
    expect(levelPoints(30, 3)).toEqual([10, 20, 30]);
  });

  it("bütüncül düzey aralıkları 0-100'ü boşluksuz böler", () => {
    expect(holisticRanges(4)).toEqual([
      { min: 0, max: 25 },
      { min: 26, max: 50 },
      { min: 51, max: 75 },
      { min: 76, max: 100 },
    ]);
    expect(holisticRanges(3).at(-1)).toEqual({ min: 67, max: 100 });
  });
});

describe("mock servis (doğrulayıcıdan geçer)", () => {
  for (const taskType of RUBRIC_TASK_TYPES) {
    for (const rubricType of RUBRIC_TYPES) {
      for (const scale of [3, 4] as const) {
        it(`${taskType} · ${rubricType} · ${scale} seviye`, async () => {
          const rubric = await mockRubricGenerationService.generate(
            buildRubricPrompt({ ...INPUT, taskType, rubricType, scale }, CURRICULUM)
          );
          expect(rubric.criteria.every((criterion) => criterion.teacherCriterion.levels.length === scale)).toBe(true);
          if (rubricType === "butuncul") {
            expect(rubric.holisticLevels).toHaveLength(scale);
          } else {
            expect(rubric.criteria.reduce((sum, criterion) => sum + criterion.weight, 0)).toBe(100);
            expect(rubric.criteria.every((criterion) => criterion.levelPoints.at(-1) === criterion.weight)).toBe(true);
          }
          const codes = new Set(rubric.criteria.flatMap((criterion) => criterion.skillCodes));
          for (const outcome of CURRICULUM.outcomes) expect(codes.has(outcome.code)).toBe(true);
        });
      }
    }
  }
});

describe("doğrulayıcı (çift görünüm ve TYMM havuzu)", () => {
  const prompt = buildRubricPrompt(INPUT, CURRICULUM);
  const criterion = (overrides: Record<string, unknown> = {}) => ({
    weight: 2,
    conceptualSkills: ["Gözlem yapma"],
    skillCodes: [CURRICULUM.outcomes[0].code, CURRICULUM.outcomes[1].code, CURRICULUM.sdb[0].code, CURRICULUM.values[0].code],
    teacherCriterion: {
      title: "Veri Toplama",
      description: "Öğrenci gözlemlerini düzenli biçimde kaydeder.",
      levels: ["Kaydetmez.", "Kısmen kaydeder.", "Büyük ölçüde kaydeder.", "Eksiksiz kaydeder."],
    },
    studentFriendlyCriterion: { question: "Ölçümlerini tabloya kaydettin mi?", hint: "Birimleri yazmayı unutma." },
    ...overrides,
  });
  const body = (criteria: unknown[]) => ({
    taskTitle: "Görev",
    teacherTaskSummary: "Öğrenciler deney yapar.",
    studentTaskSummary: "Deneyini yap.",
    criteria,
    holisticLevels: [],
  });

  it("geçerli gövdeyi kabul eder ve puanları hesaplar", () => {
    const result = validateRubricBody(body([criterion(), criterion(), criterion(), criterion()]), prompt);
    expect(result.issues).toEqual([]);
    expect(result.body?.criteria.map((item) => item.weight)).toEqual([25, 25, 25, 25]);
  });

  it("soru olmayan veya 'öğrenci' içeren öğrenci ölçütünü reddeder", () => {
    const bad = criterion({ studentFriendlyCriterion: { question: "Öğrenci verileri kaydeder.", hint: "Kaydet." } });
    const result = validateRubricBody(body([bad, criterion(), criterion(), criterion()]), prompt);
    expect(result.body).toBeUndefined();
    expect(result.issues.some((issue) => issue.path.includes("studentFriendlyCriterion"))).toBe(true);
  });

  it("'sen' diliyle yazılmış öğretmen ölçütünü ve eksik seviyeyi reddeder", () => {
    const informal = criterion({
      teacherCriterion: { title: "X", description: "Sen verileri kaydedersin.", levels: ["a", "b", "c"] },
    });
    const result = validateRubricBody(body([informal, criterion(), criterion(), criterion()]), prompt);
    expect(result.issues.map((issue) => issue.path)).toEqual(
      expect.arrayContaining(["criteria[0].teacherCriterion.description", "criteria[0].teacherCriterion.levels"])
    );
  });

  it("kapsanmayan öğrenme çıktısını ve eksik SDB/D bağlantısını reddeder", () => {
    const narrow = criterion({ skillCodes: [CURRICULUM.outcomes[0].code] });
    const result = validateRubricBody(body([narrow, narrow, narrow, narrow]), prompt);
    const messages = result.issues.map((issue) => issue.message).join(" ");
    expect(messages).toContain(CURRICULUM.outcomes[1].code);
    expect(messages).toContain("SDB");
    expect(messages).toContain("Değer");
  });

  it("şemada kodlar havuzla sınırlıdır; müfredat yoksa kod alanı hiç yoktur", () => {
    const withCodes = buildRubricJsonSchema(prompt) as { properties: { criteria: { items: { properties: Record<string, { items?: { enum?: string[] } }> } } } };
    expect(withCodes.properties.criteria.items.properties.skillCodes.items?.enum).toEqual(prompt.allowedSkillCodes);
    const free = buildRubricJsonSchema(buildRubricPrompt(INPUT)) as typeof withCodes;
    expect(free.properties.criteria.items.properties.skillCodes).toBeUndefined();
  });

  it("prompt resmî kodları ve çift görünüm kurallarını içerir", () => {
    expect(prompt.instructions).toContain(CURRICULUM.outcomes[0].code);
    expect(prompt.instructions).toContain("teacherCriterion");
    expect(prompt.instructions).toContain("Kaynaklarını doğru gösterdin mi?");
    expect(prompt.instructions).toContain("Yetersiz → Geliştirilmeli → İyi → Çok İyi");
  });
});

describe("Word çıktıları", () => {
  async function documentXml(build: () => import("docx").Document): Promise<string> {
    const { Packer } = await import("docx");
    const JSZip = (await import("jszip")).default;
    const zip = await JSZip.loadAsync(await Packer.toBuffer(build()));
    return zip.file("word/document.xml")!.async("string");
  }
  const visible = (xml: string) => [...xml.matchAll(/<w:t(?: [^>]*)?>([^<]*)<\/w:t>/g)].map((match) => match[1]).join(" ");

  it("resmî rubrik: A4 yatay, MEB başlığı, TYMM kodları, puanlar ve zümre/müdür imzaları", async () => {
    const { buildOfficialRubricDocument } = await import("@/lib/rubric/rubric-docx");
    const rubric = await mockRubricGenerationService.generate(buildRubricPrompt(INPUT, CURRICULUM));
    const xml = await documentXml(() => buildOfficialRubricDocument(rubric, new Date(2026, 9, 11)));
    expect(xml).toMatch(/<w:pgSz w:w="16838" w:h="11906" w:orient="landscape"/);
    const text = visible(xml);
    for (const expected of [
      "MİLLÎ EĞİTİM BAKANLIĞI",
      "FEN BİLİMLERİ DERSİ ANALİTİK DERECELENDİRME ÖLÇEĞİ (RUBRİK)",
      CURRICULUM.outcomes[0].code,
      "Çok İyi",
      "Yetersiz",
      "TOPLAM",
      "Zümre Öğretmeni",
      "UYGUNDUR",
      "Okul Müdürü",
    ]) {
      expect(text).toContain(expected);
    }
    expect(text).not.toContain("gösterdin mi?"); // öğretmen belgesinde sen dili yok
  });

  it("öğrenci kâğıdı: yan yana iki A5 form, kutucuklar ve öz/akran sütunları", async () => {
    const { buildStudentSheetDocument, rubricFileName } = await import("@/lib/rubric/rubric-docx");
    const rubric = await mockRubricGenerationService.generate(buildRubricPrompt({ ...INPUT, rubricType: "akranOz" }, CURRICULUM));
    const text = visible(await documentXml(() => buildStudentSheetDocument(rubric)));
    expect(text.split("ÖZ VE AKRAN DEĞERLENDİRME FORMU").length - 1).toBe(2);
    expect(text).toContain(rubric.criteria[0].studentFriendlyCriterion.question);
    expect(text).toContain("Ben   Akranım");
    expect((text.match(/☐/g) ?? []).length).toBe(rubric.criteria.length * 2 * 2);
    expect(text).not.toContain(CURRICULUM.outcomes[0].code); // öğrenci kâğıdında kod yok
    expect(rubricFileName(rubric, "ogrenci")).toBe(`Fen_Bilimleri_${TOPIC.name.replace(/\s+/g, "_")}_Ogrenci_Formu.docx`);
  });
});

describe("kalite kontrolü: kapsam esnekliği ve kural adlı hatalar", () => {
  const TR_8 = getCurriculumGrade("turkce-8")!;
  const VATAN_UNIT = TR_8.units.find((unit) => unit.topics.some((topic) => topic.name === "Bu Vatan Kimin?"))!;
  const VATAN = VATAN_UNIT.topics.find((topic) => topic.name === "Bu Vatan Kimin?")!;
  const vatanCurriculum = resolveCurriculumSelection({
    gradeId: TR_8.id,
    unitId: VATAN_UNIT.id,
    topicId: VATAN.id,
    outcomeCodes: VATAN.outcomeCodes,
  })!;
  const vatanPrompt = buildRubricPrompt(
    { ...INPUT, subject: "Türkçe", gradeLevel: "8. Sınıf", topic: VATAN.name, taskType: "proje" },
    vatanCurriculum
  );
  const criterion = (codes: string[], title: string) => ({
    weight: 2,
    conceptualSkills: [],
    skillCodes: codes,
    teacherCriterion: { title, description: "Öğrenci metni çözümler.", levels: ["Yapamaz.", "Kısmen yapar.", "Büyük ölçüde yapar.", "Eksiksiz yapar."] },
    studentFriendlyCriterion: { question: "Metni dikkatle okudun mu?", hint: "Önemli yerlerin altını çiz." },
  });
  const body = (criteria: unknown[]) => ({ taskTitle: "Görev", teacherTaskSummary: "Öğrenciler proje hazırlar.", studentTaskSummary: "Projeni hazırla.", criteria, holisticLevels: [] });

  it("önceki program (Türkçe 8 · Bu Vatan Kimin?, 11 kazanım): tek kazanım kodu ve SDB/D olmadan geçer", () => {
    expect(vatanCurriculum.program).toBe("onceki");
    expect(vatanCurriculum.outcomes).toHaveLength(11);
    const result = validateRubricBody(
      body([criterion([VATAN.outcomeCodes[0]], "Okuma"), criterion([], "Yazma"), criterion([], "Sunum"), criterion([], "Süre")]),
      vatanPrompt
    );
    expect(result.issues).toEqual([]);
  });

  it("çok kazanım seçildiğinde prompt 'en kritik 3-5 kazanım' kuralını, önceki programda SDB esnekliğini içerir", () => {
    expect(vatanPrompt.instructions).toContain("En kritik 3-5 kazanımı temel alarak rubrik oluştur");
    expect(vatanPrompt.instructions).toContain("SDB, Değer ve KB kodu zorunlu değildir");
    expect(vatanPrompt.instructions).not.toContain("Yukarıdaki HER öğrenme çıktısı kodu");
  });

  it("TYMM'de 5'ten fazla seçimde en az 3 farklı çıktı yeterlidir", () => {
    const tr7 = getCurriculumGrade("turkce-7")!;
    const unit = tr7.units[0];
    const topic = unit.topics[0];
    const curriculum = resolveCurriculumSelection({ gradeId: tr7.id, unitId: unit.id, topicId: topic.id, outcomeCodes: topic.outcomeCodes })!;
    const prompt = buildRubricPrompt({ ...INPUT, subject: "Türkçe", topic: topic.name }, curriculum);
    const [a, b, c] = curriculum.outcomes.map((outcome) => outcome.code);
    const sdb = curriculum.sdb[0].code;
    const value = curriculum.values[0].code;
    const ok = validateRubricBody(body([criterion([a, sdb], "A"), criterion([b, value], "B"), criterion([c], "C"), criterion([], "D")]), prompt);
    expect(ok.issues).toEqual([]);
    const tooFew = validateRubricBody(body([criterion([a, sdb], "A"), criterion([b, value], "B"), criterion([], "C"), criterion([], "D")]), prompt);
    expect(tooFew.issues).toEqual([expect.objectContaining({ rule: "kapsam" })]);
    expect(tooFew.issues[0].message).toContain("en az 3");
  });

  it("her sorun bozulan kuralı taşır ve kullanıcı mesajı kural adını içerir", async () => {
    const { getSafeRubricError, RubricProviderError } = await import("@/lib/rubric/generation");
    const bad = criterion([VATAN.outcomeCodes[0]], "Okuma");
    bad.studentFriendlyCriterion = { question: "Öğrenci metni okur.", hint: "" };
    const result = validateRubricBody(body([bad, criterion([], "B")]), vatanPrompt);
    expect(new Set(result.issues.map((issue) => issue.rule))).toEqual(new Set(["kriter_sayisi", "ogrenci_dili", "bos_alan"]));
    expect(validateRubricBody("{bozuk", vatanPrompt).issues[0].rule).toBe("json");

    const safe = getSafeRubricError(new RubricProviderError("schema_validation_failed", "x", result.issues));
    expect(safe.message).toContain("Kriter sayısı");
    expect(safe.details?.map((detail) => detail.label)).toContain("Öğrenci dili");
  });
});
