import { describe, expect, it } from "vitest";
import {
  buildKnowledgePackOverviewBlock,
  buildKnowledgePackSelfCheckBlock,
  buildSlotPatternGuidanceText,
  computeCompatibilityTier,
  computeQuestionPatternCoverage,
  deriveQuizPackContext,
} from "@/lib/ai/prompts/quiz-generator-knowledge-pack-blocks";
import type { QuizPackResolutionOutcome } from "@/lib/knowledge/registry/resolve-pack-for-quiz";
import type { KnowledgePack, KnowledgePackQuestionPattern, QuizGeneratorPackProjection } from "@/types/knowledge-pack";
import type { QuestionBlueprintSlot } from "@/types/quiz-blueprint";

function makeSlot(overrides: Partial<QuestionBlueprintSlot> = {}): QuestionBlueprintSlot {
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

function makePattern(overrides: Partial<KnowledgePackQuestionPattern> = {}): KnowledgePackQuestionPattern {
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

describe("computeCompatibilityTier", () => {
  it("returns tier 1 for exact type + cognitive level + approach match", () => {
    const slot = makeSlot({ type: "multipleChoice", cognitiveLevel: "apply", approach: "learningCheck" });
    const pattern = makePattern({ suitableQuestionTypes: ["multipleChoice"], suitableCognitiveLevels: ["apply"], suitableApproaches: ["learningCheck"] });
    expect(computeCompatibilityTier(slot, pattern)).toBe(1);
  });

  it("returns tier 2 for exact type + cognitive level match, differing approach", () => {
    const slot = makeSlot({ type: "multipleChoice", cognitiveLevel: "apply", approach: "realLifeContext" });
    const pattern = makePattern({ suitableQuestionTypes: ["multipleChoice"], suitableCognitiveLevels: ["apply"], suitableApproaches: ["learningCheck"] });
    expect(computeCompatibilityTier(slot, pattern)).toBe(2);
  });

  it("returns tier 3 when the slot level falls within the pattern's supported range without exact membership", () => {
    const slot = makeSlot({ type: "multipleChoice", cognitiveLevel: "apply" });
    const pattern = makePattern({ suitableQuestionTypes: ["multipleChoice"], suitableCognitiveLevels: ["understand", "analyze"] });
    expect(computeCompatibilityTier(slot, pattern)).toBe(3);
  });

  it("rejects a pattern that is too advanced for the slot (over-demanding contradiction)", () => {
    const slot = makeSlot({ type: "multipleChoice", cognitiveLevel: "remember" });
    const pattern = makePattern({ suitableQuestionTypes: ["multipleChoice"], suitableCognitiveLevels: ["analyze", "evaluate"] });
    expect(computeCompatibilityTier(slot, pattern)).toBeNull();
  });

  it("rejects a pattern that is too weak for the slot (under-demanding contradiction)", () => {
    const slot = makeSlot({ type: "multipleChoice", cognitiveLevel: "evaluate" });
    const pattern = makePattern({ suitableQuestionTypes: ["multipleChoice"], suitableCognitiveLevels: ["apply"] });
    expect(computeCompatibilityTier(slot, pattern)).toBeNull();
  });

  it("rejects on type mismatch regardless of cognitive level/approach", () => {
    const slot = makeSlot({ type: "trueFalse", cognitiveLevel: "apply", approach: "learningCheck" });
    const pattern = makePattern({ suitableQuestionTypes: ["multipleChoice"], suitableCognitiveLevels: ["apply"], suitableApproaches: ["learningCheck"] });
    expect(computeCompatibilityTier(slot, pattern)).toBeNull();
  });
});

describe("computeQuestionPatternCoverage", () => {
  it("covers both patterns via augmenting-path reassignment when a naive greedy pass would starve one (regression)", () => {
    // slot0 only accepts shortAnswer; slot1 only accepts multipleChoice.
    const slot0 = makeSlot({ type: "shortAnswer" });
    const slot1 = makeSlot({ type: "multipleChoice" });

    // Pattern A is compatible with BOTH slots; Pattern B is compatible ONLY with slot0.
    // A pack-order greedy walk would let A grab slot0 first and starve B.
    const patternA = makePattern({ id: "pattern-a", suitableQuestionTypes: ["shortAnswer", "multipleChoice"] });
    const patternB = makePattern({ id: "pattern-b", suitableQuestionTypes: ["shortAnswer"] });

    const result = computeQuestionPatternCoverage([slot0, slot1], [patternA, patternB]);

    expect(result.uncoveredPatternIds).toEqual([]);
    expect(result.coveredPatternIds.sort()).toEqual(["pattern-a", "pattern-b"]);
    // Deterministic outcome: B (the constrained pattern) must take the only
    // slot it can use; A is displaced to the other slot to make room.
    expect(result.assignments[0].pattern?.id).toBe("pattern-b");
    expect(result.assignments[1].pattern?.id).toBe("pattern-a");
  });

  it("reports a pattern with no compatible slot as uncovered, never forcing an assignment", () => {
    const slot = makeSlot({ type: "multipleChoice" });
    const incompatiblePattern = makePattern({ id: "pattern-unreachable", suitableQuestionTypes: ["matching"] });

    const result = computeQuestionPatternCoverage([slot], [incompatiblePattern]);

    expect(result.uncoveredPatternIds).toEqual(["pattern-unreachable"]);
    expect(result.assignments[0].pattern).toBeUndefined();
  });

  it("never assigns an incompatible higher-order pattern to a lower-order slot even to fill a remaining slot", () => {
    const lowLevelSlot = makeSlot({ type: "multipleChoice", cognitiveLevel: "remember" });
    const higherOrderPattern = makePattern({
      id: "pattern-error-analysis",
      suitableQuestionTypes: ["multipleChoice"],
      suitableCognitiveLevels: ["analyze", "evaluate"],
    });

    const result = computeQuestionPatternCoverage([lowLevelSlot], [higherOrderPattern]);

    expect(result.assignments[0].pattern).toBeUndefined();
    expect(result.uncoveredPatternIds).toEqual(["pattern-error-analysis"]);
  });
});

describe("buildKnowledgePackOverviewBlock", () => {
  const projection: QuizGeneratorPackProjection = {
    id: "test.konu",
    topic: "Test Konusu",
    learningOutcomes: [{ id: "lo-1", statement: "Çıktı", cognitiveLevel: "apply", difficulty: "easy" }],
    assessableSkills: ["Beceri"],
    questionPatterns: [],
    difficultyRules: { allowedLevels: ["easy"], progressionNotes: "Not." },
    commonMisconceptions: [],
    forbiddenPatterns: ["Yasaklı"],
  };

  it("uses the verified heading and framing for an active/verified pack", () => {
    const block = buildKnowledgePackOverviewBlock({ projection, verificationMode: "verified" });
    expect(block).toContain("DOĞRULANMIŞ BİLGİ PAKETİ");
    expect(block).not.toContain("TASLAK BİLGİ PAKETİ");
  });

  it("uses the draft/human-review heading and never claims verified status for draft preview", () => {
    const block = buildKnowledgePackOverviewBlock({ projection, verificationMode: "draftPreview" });
    expect(block).toContain("TASLAK BİLGİ PAKETİ — İNSAN İNCELEMESİ GEREKLİDİR");
    expect(block).not.toContain("DOĞRULANMIŞ BİLGİ PAKETİ");
  });
});

describe("deriveQuizPackContext", () => {
  const pack = {
    id: "test.konu",
    slug: "test-konusu",
    subject: "matematik",
    gradeLevel: "7",
    topic: "Test Konusu",
    aliases: [],
    curriculumKeywords: [],
    packSchemaVersion: "1.0.0",
    contentVersion: "1.0.0",
    status: "active",
    verificationStatus: "verified",
    sources: [],
    changelog: [],
    learningOutcomes: [],
    keyConcepts: [{ term: "Kavram", definition: "Tanım" }],
    commonMisconceptions: [],
    assessableSkills: [],
    questionPatterns: [],
    difficultyRules: { allowedLevels: ["easy"], progressionNotes: "Not." },
    forbiddenPatterns: [],
    criticalReviewRules: [],
  } as unknown as KnowledgePack;

  it("produces a verified context for resolvedVerified", () => {
    const outcome: QuizPackResolutionOutcome = { mode: "resolvedVerified", pack };
    const context = deriveQuizPackContext(outcome);
    expect(context?.verificationMode).toBe("verified");
  });

  it("produces a draftPreview context for resolvedDraftPreview", () => {
    const outcome: QuizPackResolutionOutcome = { mode: "resolvedDraftPreview", pack };
    const context = deriveQuizPackContext(outcome);
    expect(context?.verificationMode).toBe("draftPreview");
  });

  it.each([
    { mode: "inactive", query: { subject: "matematik", gradeLevel: "7", slugOrAlias: "x" } },
    { mode: "notFound" },
    { mode: "invalid", query: { subject: "matematik", gradeLevel: "7", slugOrAlias: "x" }, issues: [] },
    { mode: "ambiguous", query: { subject: "matematik", gradeLevel: "7", slugOrAlias: "x" }, candidates: [] },
  ] as QuizPackResolutionOutcome[])("never lets $mode reach the Prompt Builder", (outcome) => {
    expect(deriveQuizPackContext(outcome)).toBeUndefined();
  });
});

describe("buildSlotPatternGuidanceText", () => {
  const projection: QuizGeneratorPackProjection = {
    id: "test.konu",
    topic: "Test Konusu",
    learningOutcomes: [],
    assessableSkills: [],
    questionPatterns: [],
    difficultyRules: { allowedLevels: ["easy"], progressionNotes: "Not." },
    commonMisconceptions: [{ id: "mc-1", description: "Yaygın hata açıklaması", correction: "Doğrusu budur" }],
    forbiddenPatterns: [],
  };

  const pattern: KnowledgePackQuestionPattern = {
    id: "pattern-scale",
    name: "Ölçek Problemi",
    suitableCognitiveLevels: ["apply"],
    suitableApproaches: ["realLifeContext"],
    suitableQuestionTypes: ["shortAnswer"],
    description: "Bir ölçek oranı ve bir boyut verildiğinde çizim/gerçek uzunluk dönüşümü gerektirir.",
    requiredInformation: ["Ölçek oranı", "Bir boyut"],
    reasoningSteps: ["Yönü belirle", "Orantıyı kur", "Çöz"],
    recommendedVisuals: ["table"],
    avoid: ["Yönü belirtmeden soru kurgulama"],
    targetedMisconceptionIds: ["mc-1"],
  };

  it("returns undefined for an unassigned slot", () => {
    expect(buildSlotPatternGuidanceText({ slotIndex: 0 }, projection)).toBeUndefined();
  });

  it("includes the pattern id/name, description as the required relationship, required info, reasoning steps, misconception, avoid rules, and a required-output-behavior line", () => {
    const text = buildSlotPatternGuidanceText({ slotIndex: 0, pattern, tier: 1 }, projection);
    expect(text).toBeDefined();
    expect(text).toContain("pattern-scale");
    expect(text).toContain("Ölçek Problemi");
    expect(text).toContain("Zorunlu kavram: Bir ölçek oranı ve bir boyut verildiğinde çizim/gerçek uzunluk dönüşümü gerektirir.");
    expect(text).toContain("Ölçek oranı; Bir boyut");
    expect(text).toContain("Yönü belirle → Orantıyı kur → Çöz");
    expect(text).toContain("Yaygın hata açıklaması (Doğrusu: Doğrusu budur)");
    expect(text).toContain("Yönü belirtmeden soru kurgulama");
    expect(text).toContain("Döndürmeden önce doğrula");
  });

  it("warns against producing a generic ratio question instead of the assigned pattern", () => {
    const text = buildSlotPatternGuidanceText({ slotIndex: 0, pattern, tier: 1 }, projection);
    expect(text).toContain("genel bir oran/orantı sorusu olamaz");
  });
});

describe("buildKnowledgePackSelfCheckBlock", () => {
  it("is pattern-agnostic (never names a specific pattern) and requires silent correction before output", () => {
    const block = buildKnowledgePackSelfCheckBlock();
    expect(block).toContain("Desen atanmış");
    expect(block).not.toContain("Ölçek Problemi");
    expect(block).not.toContain("Oran ve Orantı");
    expect(block).toContain("sessizce düzelt");
  });
});
