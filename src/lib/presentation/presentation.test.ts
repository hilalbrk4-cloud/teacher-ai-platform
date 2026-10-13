import { describe, expect, it } from "vitest";

import { getCurriculumGrade, resolveCurriculumSelection } from "@/lib/curriculum/repository";
import { getSafePresentationError, PresentationProviderError } from "@/lib/presentation/generation";
import { mockPresentationGenerationService } from "@/lib/presentation/mock-service";
import { buildPresentationPrompt, requiredActivitySlides } from "@/lib/presentation/prompt";
import { buildPresentationJsonSchema, validatePresentationBody } from "@/lib/presentation/schema";
import { PRESENTATION_TYPES, type PresentationFormInput } from "@/types/presentation";

const FEN_5 = getCurriculumGrade("fen-bilimleri-5")!;
const UNIT = FEN_5.units.find((unit) => unit.topics.some((topic) => topic.name === "Hücre ve Organelleri"))!;
const HUCRE = UNIT.topics.find((topic) => topic.name === "Hücre ve Organelleri")!;
const CURRICULUM = resolveCurriculumSelection({ gradeId: FEN_5.id, unitId: UNIT.id, topicId: HUCRE.id, outcomeCodes: HUCRE.outcomeCodes })!;

const INPUT: PresentationFormInput = {
  subject: "Fen Bilimleri",
  gradeLevel: "6. Sınıf",
  topic: "Bitki ve Hayvan Hücresi",
  type: "yeniKonu",
  slideCount: 5,
  curriculum: null,
};

const slide = (overrides: Record<string, unknown> = {}) => ({
  title: "Hücreye Yolculuk",
  layout: "split-right-image",
  visual: { type: "diagram_placeholder", searchKeyword: "plant cell diagram labeled", caption: "Hangi yapı yalnızca bitkide var?", icon: "microscope" },
  bullets: ["Hücre duvarı şekil verir", "Kloroplast besin üretir"],
  teacherNote: "Sizce bitki hücresi neden köşeli görünüyor?",
  activityPrompt: null,
  ...overrides,
});
const deck = (count: number, activities: number[]) => ({
  title: "Hücreler",
  slides: Array.from({ length: count }, (_, index) =>
    index === 0
      ? slide({ layout: "hero-visual" })
      : activities.includes(index)
        ? slide({ layout: "activity-timer", activityPrompt: "Sıra arkadaşınla iki hücreyi karşılaştırın." })
        : slide()
  ),
});

describe("mock sunum (doğrulayıcıdan geçer)", () => {
  for (const type of PRESENTATION_TYPES) {
    for (const slideCount of [5, 8] as const) {
      it(`${type} · ${slideCount} slayt`, async () => {
        const presentation = await mockPresentationGenerationService.generate(buildPresentationPrompt({ ...INPUT, type, slideCount }, CURRICULUM));
        expect(presentation.slides).toHaveLength(slideCount);
        expect(presentation.slides.map((item) => item.slideNumber)).toEqual(Array.from({ length: slideCount }, (_, index) => index + 1));
        expect(presentation.slides[0].layout).toBe("hero-visual");
        expect(presentation.slides.filter((item) => item.layout === "activity-timer").length).toBeGreaterThanOrEqual(requiredActivitySlides(type, slideCount));
      });
    }
  }
});

describe("validatePresentationBody", () => {
  const prompt = buildPresentationPrompt(INPUT);

  it("geçerli 5 slaytlık sunumu kabul eder", () => {
    expect(validatePresentationBody(deck(5, [3]), prompt).issues).toEqual([]);
  });

  it("kısa soru kalıplı maddeye, ikon slaytında boş arama terimine ve etkinlikte boş açıklamaya izin verir (gerçek model çıktısı)", () => {
    const real = deck(5, [3]);
    real.slides[0] = slide({ layout: "hero-visual", bullets: ["Kim bu hücre? Bitki mi, hayvan mı?"] });
    real.slides[3] = slide({
      layout: "activity-timer",
      activityPrompt: "Sıra arkadaşınla iki hücreyi karşılaştırın.",
      visual: { type: "icon_badge", searchKeyword: "", caption: "", icon: "users" },
    });
    const result = validatePresentationBody(real, prompt);
    expect(result.issues).toEqual([]);
    expect(result.body?.slides[3].visual.searchKeyword).toBe("");
  });

  it("uzun başlık, paragraf madde, Türkçe arama terimi ve soru olmayan öğretmen notunu kural adıyla reddeder", () => {
    const bad = deck(5, [3]);
    bad.slides[1] = slide({
      title: "Bitki ve hayvan hücresinin bütün farkları",
      bullets: ["Hücre duvarı bitki hücresine şekil verir. Ayrıca onu dış etkilere karşı korur ve dayanıklılık sağlar."],
      visual: { type: "photo", searchKeyword: "bitki hücresi", caption: "Bak.", icon: "leaf" },
      teacherNote: "Hücre duvarını anlatın.",
    });
    const rules = validatePresentationBody(bad, prompt).issues.map((issue) => issue.rule);
    expect(rules).toEqual(expect.arrayContaining(["baslik", "madde", "gorsel", "ogretmen_notu"]));
  });

  it("kapak, etkinlik sayısı ve etkinlik-düzen uyumunu denetler", () => {
    const noCover = deck(5, [3]);
    noCover.slides[0] = slide();
    expect(validatePresentationBody(noCover, prompt).issues.map((issue) => issue.rule)).toContain("duzen");
    expect(validatePresentationBody(deck(5, []), prompt).issues.map((issue) => issue.rule)).toContain("etkinlik");
    const mismatch = deck(5, [3]);
    mismatch.slides[2] = slide({ activityPrompt: "Bir görev." });
    expect(validatePresentationBody(mismatch, prompt).issues[0].message).toContain("activity-timer");
    expect(validatePresentationBody(deck(4, [3]), prompt).issues.map((issue) => issue.rule)).toContain("slayt_sayisi");
  });

  it("müfredat seçildiyse en az 3 çıktı (ya da hepsi) slaytlara bağlanmalı; şema kodları enum ile sınırlar", () => {
    const withCurriculum = buildPresentationPrompt({ ...INPUT, gradeLevel: "5. Sınıf" }, CURRICULUM);
    const result = validatePresentationBody(deck(5, [3]), withCurriculum);
    expect(result.issues.map((issue) => issue.rule)).toContain("kapsam");
    const schema = buildPresentationJsonSchema(withCurriculum) as { properties: { slides: { items: { properties: Record<string, { items?: { enum?: string[] } }> } } } };
    expect(schema.properties.slides.items.properties.outcomeCodes.items?.enum).toEqual(HUCRE.outcomeCodes);
    expect((buildPresentationJsonSchema(prompt) as typeof schema).properties.slides.items.properties.outcomeCodes).toBeUndefined();
  });

  it("hata mesajı bozulan kuralı içerir", () => {
    const issues = validatePresentationBody(deck(5, []), prompt).issues;
    const safe = getSafePresentationError(new PresentationProviderError("schema_validation_failed", "x", issues));
    expect(safe.message).toContain("Etkinlik slaytları");
  });
});

describe("prompt", () => {
  it("görsel parametre kurallarını, etkinlik sayısını ve resmî kodları içerir", () => {
    const prompt = buildPresentationPrompt({ ...INPUT, type: "tartisma", slideCount: 8 }, CURRICULUM);
    expect(prompt.instructions).toContain("TAM 3 slayt \"activity-timer\"");
    expect(prompt.instructions).toContain("EN FAZLA 5 kelime");
    expect(prompt.instructions).toContain("yalnızca İngilizce");
    expect(prompt.instructions).toContain(HUCRE.outcomeCodes[0]);
  });
});
