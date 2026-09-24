import { dogrulaGorselSoru, gorevTanimi } from "@/lib/quiz-generator/gorsel-sorular/tanimlar";
import { createQuizGeneratorId } from "@/lib/quiz-generator/id";
import type { GenerateQuizOptions, QuizGenerationService } from "@/lib/quiz-generator/generation-service";
import type { GorselSoruPlani } from "@/types/gorsel-soru";
import type { QuestionBlueprintSlot, QuizPrompt } from "@/types/quiz-blueprint";
import type { QuestionAudit, Quiz, QuizQuestion, QuizVisual, SlotVisualType } from "@/types/quiz-generator";

const STAGE_COUNT = 3;
const STAGE_DELAY_MS = 500;

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => {
    globalThis.setTimeout(resolve, ms);
  });
}

function buildMockVisual(visualType: SlotVisualType, topic: string): QuizVisual | undefined {
  if (visualType === "none") return undefined;

  switch (visualType) {
    case "graph":
      return {
        type: "graph",
        title: `${topic} - örnek grafik`,
        altText: `${topic} konusuna ait, zamana göre değişimi gösteren bir çizgi grafiği.`,
        data: {
          chartType: "line",
          xLabel: "Zaman",
          yLabel: "Değer",
          series: [{ label: "Seri 1", points: [{ x: 1, y: 2 }, { x: 2, y: 4 }, { x: 3, y: 5 }] }],
        },
      };
    case "table":
      return {
        type: "table",
        title: `${topic} - örnek tablo`,
        altText: `${topic} konusuna ait iki sütunlu bir veri tablosu.`,
        data: { columns: ["Öğe", "Değer"], rows: [["A", "10"], ["B", "20"], ["C", "30"]] },
      };
    case "numberLine":
      return {
        type: "numberLine",
        altText: "0 ile 10 arasını gösteren, 5 değerinin işaretlendiği bir sayı doğrusu.",
        data: { min: 0, max: 10, step: 1, markers: [{ value: 5, label: "5" }] },
      };
    default:
      return {
        type: visualType,
        altText: `${topic} konusuyla ilgili örnek bir görsel.`,
        data: { note: `${topic} ile ilgili örnek veri` },
      };
  }
}

function buildAudit(slot: QuestionBlueprintSlot): QuestionAudit {
  return {
    learningOutcome: slot.learningOutcome,
    cognitiveLevel: slot.cognitiveLevel,
    difficulty: slot.difficulty,
    approach: slot.approach,
    visualType: slot.visualType,
  };
}

const VARSAYILAN_PLAN: GorselSoruPlani = { tip: "gercek_hayat_senaryo", gorev: "cokAdimliCikarim" };

/**
 * Uses the tip/task the Blueprint assigned to the slot and runs that task's
 * own registry example through the same validator a real AI response goes
 * through — so the mock can never show a visual question the real
 * pipeline would reject.
 */
function buildMockGorselSoru(slot: QuestionBlueprintSlot, id: string, audit: QuestionAudit): QuizQuestion {
  const plan = slot.gorselPlani ?? VARSAYILAN_PLAN;
  const dogrulanmis = dogrulaGorselSoru(gorevTanimi(plan).ornek, `mock.${plan.tip}`, [], plan);
  if (!dogrulanmis) {
    throw new Error(`Registry örneği kendi doğrulayıcısından geçemedi: ${plan.tip}/${plan.gorev}`);
  }
  return {
    id,
    type: "gorselSoru",
    prompt: dogrulanmis.soru,
    answerExplanation: dogrulanmis.cozum,
    audit,
    ...dogrulanmis.icerik,
  };
}

function buildMockQuestion(slot: QuestionBlueprintSlot, prompt: QuizPrompt): QuizQuestion {
  const visual = buildMockVisual(slot.visualType, prompt.topic);
  const audit = buildAudit(slot);
  const shared = { id: createQuizGeneratorId("q"), visual, audit };

  switch (slot.type) {
    case "multipleChoice": {
      const options = [
        { id: createQuizGeneratorId("opt"), text: `${prompt.topic} ile doğrudan ilgili doğru seçenek` },
        { id: createQuizGeneratorId("opt"), text: "Yaygın bir yanlış anlamayı yansıtan çeldirici" },
        { id: createQuizGeneratorId("opt"), text: "Konuyla ilgisiz görünen ama makul bir çeldirici" },
        { id: createQuizGeneratorId("opt"), text: "Kısmen doğru ama eksik bir çeldirici" },
      ];
      return {
        ...shared,
        type: "multipleChoice",
        prompt: `${prompt.topic} konusuyla ilgili aşağıdaki durumda hangisi doğrudur?`,
        options,
        correctOptionId: options[0].id,
      };
    }
    case "trueFalse":
      return {
        ...shared,
        type: "trueFalse",
        prompt: `${prompt.topic} konusuyla ilgili bu önerme doğrudur: (örnek önerme metni buraya gelir).`,
        correctAnswer: true,
      };
    case "shortAnswer":
      return {
        ...shared,
        type: "shortAnswer",
        prompt: `${prompt.topic} konusunun temel kavramını kısaca açıklayınız.`,
        acceptableAnswers: [`${prompt.topic} ile ilgili temel kavram`],
      };
    case "fillInBlank":
      return {
        ...shared,
        type: "fillInBlank",
        prompt: `${prompt.topic} konusuyla ilgili boşluğu doldurunuz.`,
        textWithBlanks: `${prompt.topic} kavramı {{1}} ile doğrudan ilişkilidir.`,
        blanks: [{ index: 1, acceptableAnswers: ["temel kavram"] }],
      };
    case "matching": {
      const leftItems = [
        { id: createQuizGeneratorId("left"), text: `${prompt.topic} - kavram 1` },
        { id: createQuizGeneratorId("left"), text: `${prompt.topic} - kavram 2` },
        { id: createQuizGeneratorId("left"), text: `${prompt.topic} - kavram 3` },
      ];
      const rightItems = [
        { id: createQuizGeneratorId("right"), text: "Tanım 1" },
        { id: createQuizGeneratorId("right"), text: "Tanım 2" },
        { id: createQuizGeneratorId("right"), text: "Tanım 3" },
      ];
      return {
        ...shared,
        type: "matching",
        prompt: `${prompt.topic} kavramlarını doğru tanımlarla eşleştiriniz.`,
        leftItems,
        rightItems,
        correctPairs: leftItems.map((item, index) => ({ leftId: item.id, rightId: rightItems[index].id })),
      };
    }
    case "ordering": {
      const items = [
        { id: createQuizGeneratorId("step"), text: "1. adım" },
        { id: createQuizGeneratorId("step"), text: "2. adım" },
        { id: createQuizGeneratorId("step"), text: "3. adım" },
      ];
      return {
        ...shared,
        type: "ordering",
        prompt: `${prompt.topic} konusundaki süreci doğru sıraya koyunuz.`,
        items,
        correctOrder: items.map((item) => item.id),
      };
    }
    case "openEnded":
      return {
        ...shared,
        type: "openEnded",
        prompt: `${prompt.topic} konusunun günlük hayattaki bir örneğini açıklayınız.`,
        sampleAnswer: `Öğrenci, ${prompt.topic} konusunu gerçek bir örnekle ilişkilendirerek açıklamalıdır.`,
        gradingCriteria: ["Kavramı doğru tanımlar", "Gerçekçi bir örnek verir"],
      };
    case "gorselSoru":
      return buildMockGorselSoru(slot, shared.id, audit);
    default: {
      const exhaustiveCheck: never = slot.type;
      throw new Error(`Desteklenmeyen soru türü: ${exhaustiveCheck}`);
    }
  }
}

/**
 * Mock implementation of `QuizGenerationService`. Builds a realistic,
 * structurally valid quiz directly from the `QuizBlueprint` embedded in the
 * prompt (every slot's type/difficulty/approach/visual allocation is
 * already decided), so the UI can be developed and tested end-to-end
 * before any real API key is configured.
 */
export const mockQuizGenerationService: QuizGenerationService = {
  async generate(prompt: QuizPrompt, options?: GenerateQuizOptions): Promise<Quiz> {
    for (let stage = 0; stage < STAGE_COUNT; stage += 1) {
      options?.onProgress?.(stage);
      await delay(STAGE_DELAY_MS);
    }

    return {
      id: createQuizGeneratorId("quiz"),
      title: `${prompt.topic} Sınavı`,
      quizType: prompt.quizType,
      subject: prompt.subject,
      gradeLevel: prompt.gradeLevel,
      topic: prompt.topic,
      questions: prompt.slots.map((slot) => buildMockQuestion(slot, prompt)),
      includeAnswerKey: prompt.includeAnswerKey,
      generatedAt: new Date().toISOString(),
    };
  },
};
