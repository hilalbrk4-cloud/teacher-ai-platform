import { describe, expect, it } from "vitest";

import { buildLessonPlanPrompt } from "@/lib/ai/prompts/lesson-planner-prompt";
import { applyOfficialCurriculum } from "@/lib/curriculum/apply";
import { CURRICULUM_INDEX, findCurriculumEntry, outcomeGroupLabel } from "@/lib/curriculum/catalog";
import { getCurriculumGrade, parseCurriculumSelection, resolveCurriculumSelection } from "@/lib/curriculum/repository";
import { CURRICULUM_REGISTRY } from "@/data/curriculum/registry";
import { mockLessonPlanGenerationService } from "@/lib/lesson-planner/mock-generation-service";
import type { LessonPlanFormInput } from "@/types/lesson-planner";

const FEN_7 = getCurriculumGrade("fen-bilimleri-7")!;
const FEN_UNIT = FEN_7.units.find((unit) => unit.topics.some((topic) => topic.name === "Işığın Kırılması"))!;
const KIRILMA = FEN_UNIT.topics.find((topic) => topic.name === "Işığın Kırılması")!;

const BASE_INPUT: LessonPlanFormInput = {
  subject: "Fen Bilimleri",
  gradeLevel: "7. Sınıf",
  topic: "Işığın Kırılması",
  duration: 40,
  objectives: "FB.7.4.1 — Işığın kırılması",
  teachingApproach: "",
  studentLevel: "",
  materials: "",
  assessmentPreference: "",
  specialNeeds: "",
  additionalNotes: "",
  refinements: ["fiveE"],
};

describe("müfredat havuzu (üretilmiş veri)", () => {
  it("altı dersin 2-8. sınıf sekmelerini içerir", () => {
    expect(CURRICULUM_INDEX).toHaveLength(26);
    expect(new Set(CURRICULUM_INDEX.map((entry) => entry.subject))).toEqual(
      new Set(["Fen Bilimleri", "Matematik", "Sosyal Bilgiler", "Türkçe", "T.C. İnkılap Tarihi ve Atatürkçülük", "İngilizce"])
    );
  });

  it.each(Object.keys(CURRICULUM_REGISTRY))("%s: her çıktının metni var ve bir konuya bağlı; kodlar sınıfla tutarlı", (id) => {
    const grade = CURRICULUM_REGISTRY[id];
    const topicCodes = new Set(grade.units.flatMap((unit) => unit.topics.flatMap((topic) => topic.outcomeCodes)));
    for (const outcome of Object.values(grade.outcomes)) {
      expect(outcome.text.length, outcome.code).toBeGreaterThan(5);
      expect(topicCodes.has(outcome.code), outcome.code).toBe(true);
      expect(outcome.code).toMatch(new RegExp(`\\D${grade.grade}\\.`));
    }
    for (const code of topicCodes) expect(grade.outcomes[code], code).toBeDefined();
  });

  it("TYMM sınıflarında SDB, Değer ve OB kodları ayrıştırılmıştır", () => {
    const outcome = FEN_7.outcomes["FB.7.4.1"];
    expect(FEN_7.program).toBe("tymm");
    expect(outcome.components.length).toBeGreaterThanOrEqual(2);
    expect(outcome.sdb.map((tag) => tag.code)).toContain("SDB2.2");
    expect(outcome.values.every((tag) => /^D\d+$/.test(tag.code))).toBe(true);
    expect(outcome.literacy.find((tag) => tag.code === "OB7")?.label).toBe("Veri Okuryazarlığı");
  });

  it("ünite geçiş haftalarındaki çift üniteli satırları ayırır", () => {
    const math = getCurriculumGrade("matematik-7")!;
    expect(math.units.every((unit) => !/\(1\).*\(1\)/.test(unit.name))).toBe(true);
    expect(math.units.find((unit) => unit.name === "Geometrik Nicelikler (1)")?.topics[0].outcomeCodes).toEqual(["MAT.7.4.1"]);
  });

  it("kaynaktaki hatalı kodu (B.5.1.2 → SB.5.1.2) onarır", () => {
    expect(Object.keys(getCurriculumGrade("sosyal-bilgiler-5")!.outcomes).some((code) => code.startsWith("B."))).toBe(false);
  });
});

describe("catalog", () => {
  it("serbest yazılmış ders ve sınıfı havuzla eşler", () => {
    expect(findCurriculumEntry("fen bilimleri", "7. Sınıf")?.id).toBe("fen-bilimleri-7");
    expect(findCurriculumEntry("Matematik", "6")?.id).toBe("matematik-6");
    expect(findCurriculumEntry("Türkçe", "5. sınıf")?.id).toBe("turkce-5");
    expect(findCurriculumEntry("Müzik", "5. Sınıf")).toBeUndefined();
    expect(findCurriculumEntry("Matematik", "11. Sınıf")).toBeUndefined();
  });

  it("Türkçe ve İngilizce çıktıları beceri alanına göre gruplar", () => {
    expect(outcomeGroupLabel("T.O.7.1")).toBe("Okuma");
    expect(outcomeGroupLabel("ENG.5.1.L1")).toBe("Listening");
    expect(outcomeGroupLabel("FB.7.4.1")).toBeUndefined();
  });
});

describe("resolveCurriculumSelection (sunucu güven sınırı)", () => {
  const selection = { gradeId: "fen-bilimleri-7", unitId: FEN_UNIT.id, topicId: KIRILMA.id, outcomeCodes: ["FB.7.4.1"] };

  it("seçimi havuzdaki resmî metin ve birleşik etiketlerle çözer", () => {
    const resolved = resolveCurriculumSelection(selection)!;
    expect(resolved.outcomes[0].text).toBe(FEN_7.outcomes["FB.7.4.1"].text);
    expect(resolved.sdb.length).toBeGreaterThan(0);
    expect(resolved.topic).toBe("Işığın Kırılması");
  });

  it("konuya ait olmayan veya uydurma kodları atar", () => {
    const resolved = resolveCurriculumSelection({ ...selection, outcomeCodes: ["FB.7.4.1", "FB.7.1.1", "FB.7.99.9"] })!;
    expect(resolved.outcomes.map((outcome) => outcome.code)).toEqual(["FB.7.4.1"]);
    expect(resolveCurriculumSelection({ ...selection, outcomeCodes: ["FB.7.1.1"] })).toBeUndefined();
    expect(resolveCurriculumSelection({ ...selection, gradeId: "__proto__" })).toBeUndefined();
  });

  it("istek gövdesindeki seçimi tip denetiminden geçirir", () => {
    expect(parseCurriculumSelection({ gradeId: 1 })).toBeNull();
    expect(parseCurriculumSelection({ ...selection, outcomeCodes: ["FB.7.4.1", 5] })?.outcomeCodes).toEqual(["FB.7.4.1"]);
  });
});

describe("üretim pipeline'ı", () => {
  const curriculum = resolveCurriculumSelection({
    gradeId: "fen-bilimleri-7",
    unitId: FEN_UNIT.id,
    topicId: KIRILMA.id,
    outcomeCodes: KIRILMA.outcomeCodes,
  })!;

  it("prompt resmî kodları, süreç bileşenlerini ve SDB/D/OB'yi içerir", () => {
    const prompt = buildLessonPlanPrompt(BASE_INPUT, { curriculum });
    expect(prompt.officialCurriculum).toBe(curriculum);
    expect(prompt.instructions).toContain("MEB RESMİ ÖĞRENME ÇIKTILARI");
    for (const outcome of curriculum.outcomes) expect(prompt.instructions).toContain(`${outcome.code} — ${outcome.text}`);
    expect(prompt.instructions).toContain("SDB2.2 İş Birliği");
    expect(prompt.instructions).toContain("Yalnızca MEB RESMİ ÖĞRENME ÇIKTILARI bloğunda verilen kodları kullan");
    expect(buildLessonPlanPrompt(BASE_INPUT).instructions).not.toContain("MEB RESMİ ÖĞRENME ÇIKTILARI");
  });

  it("plana resmî kodları ve becerileri kod ile eksiksiz işler", async () => {
    const plan = await mockLessonPlanGenerationService.generate(buildLessonPlanPrompt(BASE_INPUT, { curriculum }));
    expect(plan.curriculum?.outcomes.map((outcome) => outcome.code)).toEqual(KIRILMA.outcomeCodes);
    expect(plan.skills?.socialEmotional).toEqual(curriculum.sdb.map((tag) => `${tag.code} ${tag.label}`));
    expect(plan.skills?.values).toEqual(curriculum.values.map((tag) => `${tag.code} ${tag.label}`));
    const objectives = plan.sections.find((section) => section.key === "ogrenmeHedefleri")!.content;
    for (const code of KIRILMA.outcomeCodes) expect(objectives).toContain(code);
  }, 10_000);

  it("müfredat yoksa planı değiştirmez", () => {
    const plan = { id: "p", subject: "", gradeLevel: "", topic: "", duration: 40, generatedAt: "", sections: [] };
    expect(applyOfficialCurriculum(plan, undefined)).toBe(plan);
  });
});
