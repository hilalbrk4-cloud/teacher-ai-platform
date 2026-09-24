import { describe, expect, it } from "vitest";

import { buildQuizBlueprint } from "@/lib/ai/blueprint/quiz-blueprint";
import {
  buildQuizPrompt,
  buildQuizPromptBatches,
  splitIntoBatchSizes,
} from "@/lib/ai/prompts/quiz-generator-prompt";
import { buildQuizResponseJsonSchema } from "@/lib/ai/schemas/quiz-response-json-schema";
import { QuizProviderError } from "@/lib/ai/services/quiz-provider-error";
import { generateQuizInBatches } from "@/lib/quiz-generator/batch-generation";
import type { QuizGenerationService } from "@/lib/quiz-generator/generation-service";
import { GORSEL_SORU_TANIMLARI } from "@/lib/quiz-generator/gorsel-sorular/tanimlar";
import type { GorselSoruGorevTanimi } from "@/lib/quiz-generator/gorsel-sorular/ortak";
import { GORSEL_SORU_TIPLERI, type GorselSoruTipi } from "@/types/gorsel-soru";
import type { QuizPrompt } from "@/types/quiz-blueprint";
import type { Quiz, QuizFormInput } from "@/types/quiz-generator";

const FORM: QuizFormInput = {
  quizType: "classroomQuiz",
  subject: "Matematik",
  gradeLevel: "4. Sınıf",
  topic: "Kesirler",
  objectives: "Birim kesirleri karşılaştırır.",
  questionCount: 10,
  questionTypes: ["gorselSoru", "multipleChoice"],
  questionApproach: "newGeneration",
  cognitiveLevel: "analyze",
  difficulty: "medium",
  visualUsage: "none",
  visualTypes: [],
  includeAnswerKey: true,
  includeExplanations: true,
};

/** Fake service: answers each batch with one placeholder question per slot, in order. */
function sahteServis(davranis?: (prompt: QuizPrompt, cagri: number) => void): QuizGenerationService & { cagrilar: QuizPrompt[] } {
  const cagrilar: QuizPrompt[] = [];
  return {
    cagrilar,
    async generate(prompt) {
      cagrilar.push(prompt);
      davranis?.(prompt, cagrilar.length);
      const quiz: Quiz = {
        id: "q",
        title: `Başlık ${cagrilar.length}`,
        quizType: prompt.quizType,
        subject: prompt.subject,
        gradeLevel: prompt.gradeLevel,
        topic: prompt.topic,
        includeAnswerKey: prompt.includeAnswerKey,
        generatedAt: "",
        questions: prompt.slots.map((slot) => ({
          id: `soru-${slot.order}`,
          type: "trueFalse",
          prompt: String(slot.order),
          correctAnswer: true,
          audit: { ...slot, visualType: slot.visualType },
        })),
      };
      return quiz;
    },
  };
}

describe("splitIntoBatchSizes", () => {
  it("soruları neredeyse eşit, en fazla 3'erli parçalara böler", () => {
    expect(splitIntoBatchSizes(10, 3)).toEqual([3, 3, 2, 2]);
    expect(splitIntoBatchSizes(3, 3)).toEqual([3]);
    expect(splitIntoBatchSizes(4, 3)).toEqual([2, 2]);
    expect(splitIntoBatchSizes(1, 3)).toEqual([1]);
  });
});

describe("buildQuizPromptBatches", () => {
  const blueprint = buildQuizBlueprint(FORM);

  it("her parça yalnızca kendi sıralarını taşır ve sınavdaki yerini bilir", () => {
    const parcalar = buildQuizPromptBatches(blueprint, undefined, 3);
    expect(parcalar.map((parca) => parca.slots.length)).toEqual([3, 3, 2, 2]);
    expect(parcalar.flatMap((parca) => parca.slots.map((slot) => slot.order))).toEqual(
      blueprint.slots.map((slot) => slot.order)
    );
    expect(parcalar[1].instructions).toContain("PARÇALI ÜRETİM (ZORUNLU)");
    expect(parcalar[1].instructions).toContain("sınavın 4-6. sorularını");
    expect(parcalar[1].instructions).toContain("tam olarak 3 öğe");
    // Parçalar farklı bağlam alanlarına yönlendirilir.
    expect(parcalar[0].instructions).toContain("alışveriş ve bütçe");
    expect(parcalar[1].instructions).not.toContain("alışveriş ve bütçe");
  });

  it("Blueprint'in görsel soru planı (tip + görev) parçalara bölündüğünde de korunur", () => {
    const tumu = buildQuizPromptBatches(buildQuizBlueprint({ ...FORM, questionTypes: ["gorselSoru"] }), undefined, 3)
      .map((parca) => parca.instructions)
      .join("\n");
    for (const tip of GORSEL_SORU_TIPLERI) {
      expect(tumu).toContain(`Görsel soru tipi: ${tip}`);
    }
  });

  it("tek parçaya sığan bir sınavın prompt'u parçalamadan öncekiyle aynıdır", () => {
    const kucuk = buildQuizBlueprint({ ...FORM, questionCount: 3 });
    expect(buildQuizPromptBatches(kucuk, undefined, 3)).toEqual([buildQuizPrompt(kucuk)]);
  });
});

describe("generateQuizInBatches", () => {
  const blueprint = buildQuizBlueprint(FORM);

  it("parçaları paralel üretir ve plan sırasıyla birleştirir", async () => {
    const servis = sahteServis();
    const quiz = await generateQuizInBatches(blueprint, undefined, servis);
    expect(servis.cagrilar).toHaveLength(4);
    expect(quiz.questions.map((question) => question.prompt)).toEqual(blueprint.slots.map((slot) => String(slot.order)));
    expect(quiz.title).toBe("Başlık 1");
  });

  it("doğrulamadan geçemeyen bir parçayı yalnızca o parça için bir kez yeniden üretir", async () => {
    let basarisiz = false;
    const servis = sahteServis((prompt) => {
      if (!basarisiz && prompt.slots[0].order === blueprint.slots[3].order) {
        basarisiz = true;
        throw new QuizProviderError("schema_validation_failed", "bozuk");
      }
    });
    const quiz = await generateQuizInBatches(blueprint, undefined, servis, { concurrency: 1 });
    expect(servis.cagrilar).toHaveLength(5);
    expect(quiz.questions).toHaveLength(10);
  });

  it("yeniden deneme de başarısız olursa hatayı döndürür; eksik soruyla sınav üretmez", async () => {
    const servis = sahteServis((prompt) => {
      if (prompt.slots[0].order === blueprint.slots[3].order) {
        throw new QuizProviderError("schema_validation_failed", "bozuk");
      }
    });
    await expect(generateQuizInBatches(blueprint, undefined, servis, { concurrency: 1 })).rejects.toMatchObject({
      code: "schema_validation_failed",
    });
  });

  it("yapılandırma hatalarını yeniden denemez", async () => {
    const servis = sahteServis(() => {
      throw new QuizProviderError("missing_api_key", "yok");
    });
    await expect(generateQuizInBatches(blueprint, undefined, servis, { concurrency: 1 })).rejects.toMatchObject({
      code: "missing_api_key",
    });
    expect(servis.cagrilar).toHaveLength(1);
  });
});

type Sema = Record<string, unknown>;

/** Strict mod kurallarını (her nesnede additionalProperties:false, tüm alanlar zorunlu) özyinelemeli denetler. */
function strictUyumluMu(sema: Sema): boolean {
  if (Array.isArray(sema.anyOf)) return (sema.anyOf as Sema[]).every(strictUyumluMu);
  if (sema.type === "object") {
    const alanlar = sema.properties as Record<string, Sema>;
    const zorunlu = sema.required as string[];
    return (
      sema.additionalProperties === false &&
      zorunlu.length === Object.keys(alanlar).length &&
      Object.values(alanlar).every(strictUyumluMu)
    );
  }
  if (sema.items) return strictUyumluMu(sema.items as Sema);
  return true;
}

/** Örneğin, şemadaki alanların tamamını (null olanlar dâhil) ve yalnızca onları içerdiğini denetler. */
function ornekSemayaUyuyorMu(deger: unknown, sema: Sema): boolean {
  if (sema.type === "object") {
    if (typeof deger !== "object" || deger === null) return false;
    const alanlar = sema.properties as Record<string, Sema>;
    const anahtarlar = Object.keys(deger);
    return (
      anahtarlar.length === Object.keys(alanlar).length &&
      anahtarlar.every((anahtar) => anahtar in alanlar && ornekSemayaUyuyorMu((deger as Sema)[anahtar], alanlar[anahtar]))
    );
  }
  if (sema.type === "array") return Array.isArray(deger) && deger.every((oge) => ornekSemayaUyuyorMu(oge, sema.items as Sema));
  if (Array.isArray(sema.enum)) return (sema.enum as unknown[]).includes(deger);
  return true;
}

describe("buildQuizResponseJsonSchema", () => {
  it("görselsiz planlar için strict mod kurallarına uyan bir şema üretir", () => {
    const sema = buildQuizResponseJsonSchema(buildQuizBlueprint(FORM));
    expect(sema).not.toBeNull();
    expect(strictUyumluMu(sema!)).toBe(true);
  });

  it("serbest biçimli klasik görsel içeren planlarda JSON moduna düşer (null)", () => {
    const gorselli = buildQuizBlueprint({ ...FORM, questionTypes: ["multipleChoice"], visualUsage: "visualHeavy" });
    expect(buildQuizResponseJsonSchema(gorselli)).toBeNull();
  });

  it.each(GORSEL_SORU_TIPLERI)("%s: her görevin örneği, strict şemanın alanlarıyla birebir aynıdır", (tip) => {
    for (const gorev of Object.values(GORSEL_SORU_TANIMLARI[tip].gorevler) as GorselSoruGorevTanimi<GorselSoruTipi>[]) {
      expect(ornekSemayaUyuyorMu(gorev.ornek.veri, gorev.jsonSemasi)).toBe(true);
    }
  });

  it("matematik dışı derslerde yalnızca derse uygun görsel tipleri şemaya koyar", () => {
    const sema = buildQuizResponseJsonSchema(buildQuizBlueprint({ ...FORM, subject: "Türkçe", questionTypes: ["gorselSoru"] }));
    const tipler = JSON.stringify(sema);
    expect(tipler).toContain("gercek_hayat_senaryo");
    expect(tipler).not.toContain("sayi_dogrusu");
  });
});
