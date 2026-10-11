import { describe, expect, it } from "vitest";

import { buildLessonPlanPrompt } from "@/lib/ai/prompts/lesson-planner-prompt";
import { buildLessonPlanJsonSchema, validateLessonPlanBody } from "@/lib/ai/schemas/lesson-plan-schema";
import { fiveETimeRanges, formatTimeRange } from "@/lib/lesson-planner/five-e";
import { mockLessonPlanGenerationService } from "@/lib/lesson-planner/mock-generation-service";
import { LESSON_PLAN_5E_PHASES, LESSON_PLAN_5E_SECTION_ORDER } from "@/types/lesson-planner";
import type { LessonPlanFormInput } from "@/types/lesson-planner";

const FOTOSENTEZ: LessonPlanFormInput = {
  subject: "Fen Bilimleri",
  gradeLevel: "7. Sınıf",
  topic: "Fotosentez",
  duration: 40,
  objectives: "Fotosentezin gerçekleşmesi için gereken koşulları deneyle gösterebilme",
  teachingApproach: "",
  studentLevel: "",
  materials: "",
  assessmentPreference: "",
  specialNeeds: "",
  additionalNotes: "",
  refinements: ["fiveE"],
};

const SKILLS = {
  conceptual: ["Gözlem yapma"],
  socialEmotional: ["İş birliği"],
  dispositions: ["Merak"],
  values: ["Sorumluluk"],
};

function body5E(degerlendirme = "Gözlem ölçütleri…\nÇıkış Bileti: 1) … 2) …") {
  return {
    sections: LESSON_PLAN_5E_SECTION_ORDER.map((key) => ({
      key,
      content:
        key === "degerlendirme"
          ? degerlendirme
          : key === "kesfetme"
            ? "Gruplar gözlem yapar.\n⭐ EduPilot Spark: Yaprak dedektifleri"
            : `${key} içeriği`,
    })),
    skills: SKILLS,
  };
}

describe("fiveETimeRanges", () => {
  it.each([20, 30, 35, 40, 45, 80])("%i dakikayı kesintisiz ve tam olarak böler", (duration) => {
    const ranges = fiveETimeRanges(duration);
    let cursor = 0;
    for (const phase of LESSON_PLAN_5E_PHASES) {
      expect(ranges[phase].start).toBe(cursor);
      expect(ranges[phase].end - ranges[phase].start).toBeGreaterThanOrEqual(2);
      cursor = ranges[phase].end;
    }
    expect(cursor).toBe(duration);
  });

  it("40 dakikada Keşfetme en uzun, Girme en kısa aşamadır", () => {
    const ranges = fiveETimeRanges(40);
    expect(ranges.girme).toEqual({ start: 0, end: 4 });
    expect(ranges.kesfetme).toEqual({ start: 4, end: 16 });
    expect(ranges.degerlendirme.end).toBe(40);
    expect(formatTimeRange(ranges.kesfetme)).toBe("04–16 dk");
  });
});

describe("validateLessonPlanBody (5E)", () => {
  it("beş aşamayı, becerileri ve çıkış biletini kabul eder", () => {
    const result = validateLessonPlanBody(body5E(), "5e");
    expect(result.issues).toEqual([]);
    expect(result.sections?.map((section) => section.key)).toEqual([...LESSON_PLAN_5E_SECTION_ORDER]);
  });

  it("çıkış bileti olmayan Değerlendirme aşamasını reddeder", () => {
    const result = validateLessonPlanBody(body5E("Kısa bir soru-cevap yapılır."), "5e");
    expect(result.sections).toBeUndefined();
    expect(result.issues.map((issue) => issue.path)).toContain("sections.degerlendirme");
  });

  it("EduPilot Spark etkinliği Keşfetme'de yoksa reddeder", () => {
    const body = body5E();
    const sections = body.sections.map((section) =>
      section.key === "kesfetme" ? { ...section, content: "Gruplar gözlem yapar." } : section
    );
    expect(validateLessonPlanBody({ ...body, sections }, "5e").issues.map((issue) => issue.path)).toContain(
      "sections.kesfetme"
    );
  });

  it("5E planında klasik Giriş / Gelişme / Sonuç bölümlerini reddeder", () => {
    const body = body5E();
    const sections = [...body.sections, { key: "gelisme", content: "…" }];
    expect(validateLessonPlanBody({ ...body, sections }, "5e").sections).toBeUndefined();
  });

  it("listede olmayan (uydurma) beceri etiketini reddeder", () => {
    const body = { ...body5E(), skills: { ...SKILLS, conceptual: ["KB2.10 Gözlem"] } };
    expect(validateLessonPlanBody(body, "5e").issues.map((issue) => issue.path)).toContain("skills.conceptual");
  });
});

describe("5E prompt ve şema", () => {
  const prompt = buildLessonPlanPrompt(FOTOSENTEZ);

  it("klasik akış yerine koddan hesaplanan aralıklarla 5E aşamalarını ister", () => {
    expect(prompt.model).toBe("5e");
    expect(prompt.requiredSections).toEqual(LESSON_PLAN_5E_SECTION_ORDER);
    expect(prompt.instructions).toContain("5E AKIŞI");
    expect(prompt.instructions).toContain("[04–16 dk]");
    expect(prompt.instructions).toContain("Çıkış Bileti:");
    expect(prompt.instructions).toContain("GERÇEK SINIF KOŞULLARI");
    expect(prompt.instructions).toContain("TYMM BECERİLER ÖRGÜSÜ");
    expect(prompt.instructions).not.toContain("Giriş: X dk");
  });

  it("JSON şeması yalnızca 5E bölüm anahtarlarına izin verir", () => {
    const schema = buildLessonPlanJsonSchema("5e");
    expect(schema.properties.sections.items.properties.key.enum).toEqual([...LESSON_PLAN_5E_SECTION_ORDER]);
  });

  it("klasik modelde Giriş / Gelişme / Sonuç akışı korunur", () => {
    const classic = buildLessonPlanPrompt({ ...FOTOSENTEZ, refinements: [] });
    expect(classic.model).toBe("klasik");
    expect(classic.phaseTimeRanges).toBeUndefined();
    expect(classic.instructions).not.toContain("5E AKIŞI");
  });

  it("mock servis 5E planına süre aralıkları ve beceriler ekler", async () => {
    const plan = await mockLessonPlanGenerationService.generate(prompt);
    const phases = plan.sections.filter((section) => section.timeRange);
    expect(phases.map((section) => section.key)).toEqual([...LESSON_PLAN_5E_PHASES]);
    expect(validateLessonPlanBody({ sections: plan.sections, skills: plan.skills }, "5e").issues).toEqual([]);
  }, 10_000);
});
