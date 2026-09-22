import { describe, expect, it } from "vitest";
import { buildQuizPrompt } from "@/lib/ai/prompts/quiz-generator-prompt";
import type { QuizGeneratorPackContext } from "@/lib/ai/prompts/quiz-generator-knowledge-pack-blocks";
import type { KnowledgePackQuestionPattern, QuizGeneratorPackProjection } from "@/types/knowledge-pack";
import type { QuestionBlueprintSlot, QuizBlueprint } from "@/types/quiz-blueprint";

const BLUEPRINT: QuizBlueprint = {
  quizType: "classroomQuiz",
  subject: "Matematik",
  gradeLevel: "7",
  topic: "Test Konusu",
  totalQuestions: 1,
  includeAnswerKey: true,
  includeExplanations: true,
  slots: [
    {
      order: 0,
      type: "multipleChoice",
      cognitiveLevel: "apply",
      learningOutcome: "Genel hedef",
      difficulty: "medium",
      approach: "learningCheck",
      visualType: "none",
    },
  ],
  language: "tr",
};

const PROJECTION: QuizGeneratorPackProjection = {
  id: "test.konu",
  topic: "Test Konusu",
  learningOutcomes: [{ id: "lo-1", statement: "Çıktı", cognitiveLevel: "apply", difficulty: "easy" }],
  assessableSkills: ["Beceri"],
  questionPatterns: [],
  difficultyRules: { allowedLevels: ["easy", "medium"], progressionNotes: "Not." },
  commonMisconceptions: [],
  forbiddenPatterns: ["Yasaklı kalıp"],
};

describe("buildQuizPrompt — Knowledge Pack integration", () => {
  it("produces no Knowledge Pack blocks when packContext is omitted (pre-integration behavior preserved)", () => {
    const prompt = buildQuizPrompt(BLUEPRINT);
    expect(prompt.instructions).not.toContain("BİLGİ PAKETİ");
    expect(prompt.instructions).not.toContain("DOĞRULANMIŞ");
    expect(prompt.instructions).not.toContain("TASLAK");
    expect(prompt.instructions).toContain("ROL:");
    expect(prompt.instructions).toContain("SORU PLANI");
  });

  it("produces identical instructions across repeated calls with no packContext (deterministic, no regression drift)", () => {
    const first = buildQuizPrompt(BLUEPRINT).instructions;
    const second = buildQuizPrompt(BLUEPRINT).instructions;
    expect(first).toBe(second);
  });

  it("includes the verified heading when a verified packContext is supplied", () => {
    const context: QuizGeneratorPackContext = { projection: PROJECTION, verificationMode: "verified" };
    const prompt = buildQuizPrompt(BLUEPRINT, context);
    expect(prompt.instructions).toContain("DOĞRULANMIŞ BİLGİ PAKETİ");
  });

  it("includes the draft/human-review heading when a draftPreview packContext is supplied", () => {
    const context: QuizGeneratorPackContext = { projection: PROJECTION, verificationMode: "draftPreview" };
    const prompt = buildQuizPrompt(BLUEPRINT, context);
    expect(prompt.instructions).toContain("TASLAK BİLGİ PAKETİ — İNSAN İNCELEMESİ GEREKLİDİR");
    expect(prompt.instructions).not.toContain("DOĞRULANMIŞ BİLGİ PAKETİ");
  });

  it("includes the pre-output self-check block only when a packContext is supplied", () => {
    const withoutPack = buildQuizPrompt(BLUEPRINT).instructions;
    expect(withoutPack).not.toContain("BİLGİ PAKETİ ÖZ-KONTROLÜ");

    const withPack = buildQuizPrompt(BLUEPRINT, { projection: PROJECTION, verificationMode: "verified" }).instructions;
    expect(withPack).toContain("BİLGİ PAKETİ ÖZ-KONTROLÜ");
  });
});

describe("buildQuizPrompt — per-slot guidance interleaving (Prompt Fidelity)", () => {
  function makeSlot(overrides: Partial<QuestionBlueprintSlot>): QuestionBlueprintSlot {
    return {
      order: 0,
      type: "multipleChoice",
      cognitiveLevel: "apply",
      learningOutcome: "Genel hedef",
      difficulty: "medium",
      approach: "learningCheck",
      visualType: "none",
      ...overrides,
    };
  }

  function makePattern(overrides: Partial<KnowledgePackQuestionPattern>): KnowledgePackQuestionPattern {
    return {
      id: "pattern-x",
      name: "Desen X",
      suitableCognitiveLevels: ["apply"],
      suitableApproaches: ["learningCheck"],
      description: "Açıklama",
      requiredInformation: ["Bilgi"],
      reasoningSteps: ["Adım"],
      recommendedVisuals: ["none"],
      avoid: [],
      targetedMisconceptionIds: [],
      ...overrides,
    };
  }

  // Four slots, each with a distinct type, and four patterns each restricted
  // to exactly one of those types — this makes assignment unambiguous
  // (no shared candidates), so each pattern's guidance is deterministically
  // scoped to its own slot only.
  const multiSlotBlueprint: QuizBlueprint = {
    ...BLUEPRINT,
    totalQuestions: 4,
    slots: [
      makeSlot({ order: 0, type: "multipleChoice" }),
      makeSlot({ order: 1, type: "shortAnswer" }),
      makeSlot({ order: 2, type: "openEnded" }),
      makeSlot({ order: 3, type: "trueFalse" }),
    ],
  };

  const scalePattern = makePattern({
    id: "pattern-scale",
    suitableQuestionTypes: ["multipleChoice"],
    description: "Bir ÖLÇEK-ORANI-MARKER ve bir boyut verildiğinde çizim/gerçek uzunluk dönüşümü gerektirir.",
  });
  const mixturePattern = makePattern({
    id: "pattern-mixture",
    suitableQuestionTypes: ["shortAnswer"],
    description: "Bir KARIŞIM-MARKER bağlamında en az iki bileşen arasındaki oranın kullanılmasını gerektirir.",
  });
  const inversePattern = makePattern({
    id: "pattern-inverse",
    suitableQuestionTypes: ["openEnded"],
    description: "Bir çokluk artarken diğeri TERS-ORANTI-MARKER olarak azalır; çözüm çarpımın sabitliğini kullanmalıdır.",
  });
  const errorAnalysisPattern = makePattern({
    id: "pattern-error-analysis",
    suitableQuestionTypes: ["trueFalse"],
    description: "İKİ-FARKLI-COZUM-MARKER öğrenci çözümü sunulur; hangisinin doğru olduğu belirlenip hatası açıklanmalıdır.",
    reasoningSteps: ["Her iki çözümü ayrı ayrı incele", "Hangisinin doğru olduğunu belirle", "Diğerindeki hatayı açıkla"],
  });

  const projection: QuizGeneratorPackProjection = {
    ...PROJECTION,
    questionPatterns: [scalePattern, mixturePattern, inversePattern, errorAnalysisPattern],
  };
  const context: QuizGeneratorPackContext = { projection, verificationMode: "verified" };

  function slotLineMarker(type: string): string {
    return `Tür anahtarı: ${type} `;
  }

  it("places the scale pattern's guidance inside its own slot, not a trailing section", () => {
    const { instructions } = buildQuizPrompt(multiSlotBlueprint, context);
    const slotStart = instructions.indexOf(slotLineMarker("multipleChoice"));
    const nextSlotStart = instructions.indexOf(slotLineMarker("shortAnswer"));
    const guidanceIndex = instructions.indexOf("ÖLÇEK-ORANI-MARKER");

    expect(slotStart).toBeGreaterThanOrEqual(0);
    expect(guidanceIndex).toBeGreaterThan(slotStart);
    expect(guidanceIndex).toBeLessThan(nextSlotStart);
  });

  it("places the mixture pattern's guidance inside its own slot", () => {
    const { instructions } = buildQuizPrompt(multiSlotBlueprint, context);
    const slotStart = instructions.indexOf(slotLineMarker("shortAnswer"));
    const nextSlotStart = instructions.indexOf(slotLineMarker("openEnded"));
    const guidanceIndex = instructions.indexOf("KARIŞIM-MARKER");

    expect(guidanceIndex).toBeGreaterThan(slotStart);
    expect(guidanceIndex).toBeLessThan(nextSlotStart);
  });

  it("places the inverse-proportion pattern's guidance inside its own slot", () => {
    const { instructions } = buildQuizPrompt(multiSlotBlueprint, context);
    const slotStart = instructions.indexOf(slotLineMarker("openEnded"));
    const nextSlotStart = instructions.indexOf(slotLineMarker("trueFalse"));
    const guidanceIndex = instructions.indexOf("TERS-ORANTI-MARKER");

    expect(guidanceIndex).toBeGreaterThan(slotStart);
    expect(guidanceIndex).toBeLessThan(nextSlotStart);
  });

  it("places the error-analysis pattern's guidance inside its own slot and requires two reasoning paths", () => {
    const { instructions } = buildQuizPrompt(multiSlotBlueprint, context);
    const slotStart = instructions.indexOf(slotLineMarker("trueFalse"));
    const guidanceIndex = instructions.indexOf("İKİ-FARKLI-COZUM-MARKER");

    expect(guidanceIndex).toBeGreaterThan(slotStart);
    expect(instructions).toContain("Her iki çözümü ayrı ayrı incele");
    expect(instructions).toContain("Diğerindeki hatayı açıkla");
  });

  it("never keeps a separate trailing per-slot guidance block, and each pattern's guidance appears exactly once", () => {
    const { instructions } = buildQuizPrompt(multiSlotBlueprint, context);
    expect(instructions).not.toContain("BİLGİ PAKETİ SORU DESENİ REHBERLİĞİ");

    ["ÖLÇEK-ORANI-MARKER", "KARIŞIM-MARKER", "TERS-ORANTI-MARKER", "İKİ-FARKLI-COZUM-MARKER"].forEach((marker) => {
      const occurrences = instructions.split(marker).length - 1;
      expect(occurrences).toBe(1);
    });
  });
});
