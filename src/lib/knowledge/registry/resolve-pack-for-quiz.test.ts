import { afterEach, describe, expect, it, vi } from "vitest";
import { createKnowledgePackRegistry } from "@/lib/knowledge/registry/knowledge-pack-registry";
import { resolveKnowledgePackForQuiz } from "@/lib/knowledge/registry/resolve-pack-for-quiz";
import type { QuizBlueprint } from "@/types/quiz-blueprint";

function basePack(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: "test.konu",
    slug: "test-konusu",
    subject: "matematik",
    gradeLevel: "7",
    topic: "Test Konusu",
    aliases: ["ortak-alias"],
    curriculumKeywords: [],
    packSchemaVersion: "1.0.0",
    contentVersion: "1.0.0",
    status: "active",
    verificationStatus: "verified",
    sources: [{ id: "s1", sourceType: "internalReview", title: "İnceleme" }],
    lastReviewedAt: "2026-01-01",
    reviewedBy: "İnceleyici",
    changelog: [{ version: "1.0.0", date: "2026-01-01", author: "Yazar", summary: "İlk sürüm." }],
    learningOutcomes: [{ id: "lo-1", statement: "Çıktı.", cognitiveLevel: "understand", difficulty: "easy" }],
    keyConcepts: [{ term: "Kavram", definition: "Tanım." }],
    commonMisconceptions: [{ id: "mc-1", description: "Yanlış.", correction: "Doğru." }],
    assessableSkills: ["Beceri"],
    questionPatterns: [
      {
        id: "qp-1",
        name: "Desen",
        suitableCognitiveLevels: ["understand"],
        suitableApproaches: ["learningCheck"],
        description: "Açıklama",
        requiredInformation: ["Bilgi"],
        reasoningSteps: ["Adım"],
        recommendedVisuals: ["none"],
        avoid: [],
        targetedMisconceptionIds: ["mc-1"],
      },
    ],
    difficultyRules: { allowedLevels: ["easy"], progressionNotes: "Not." },
    forbiddenPatterns: [],
    criticalReviewRules: [{ id: "crr-1", rule: "Kural.", severity: "blocking" }],
    ...overrides,
  };
}

function blueprint(overrides: Partial<QuizBlueprint> = {}): QuizBlueprint {
  return {
    quizType: "classroomQuiz",
    subject: "Matematik",
    gradeLevel: "7. Sınıf",
    topic: "Test Konusu",
    totalQuestions: 1,
    includeAnswerKey: false,
    includeExplanations: false,
    slots: [],
    language: "tr",
    ...overrides,
  };
}

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("resolveKnowledgePackForQuiz", () => {
  it("resolves an active/verified pack as resolvedVerified", () => {
    const registry = createKnowledgePackRegistry([basePack()]);
    const outcome = resolveKnowledgePackForQuiz(blueprint(), registry);
    expect(outcome.mode).toBe("resolvedVerified");
  });

  it("resolves a draft/needsReview pack as resolvedDraftPreview when the flag is enabled outside production", () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("KNOWLEDGE_PACK_DRAFT_PREVIEW", "true");
    const registry = createKnowledgePackRegistry([basePack({ status: "draft", verificationStatus: "needsReview" })]);
    const outcome = resolveKnowledgePackForQuiz(blueprint(), registry);
    expect(outcome.mode).toBe("resolvedDraftPreview");
  });

  it("resolves a draft pack as inactive when the preview flag is disabled (default)", () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("KNOWLEDGE_PACK_DRAFT_PREVIEW", "");
    const registry = createKnowledgePackRegistry([basePack({ status: "draft", verificationStatus: "needsReview" })]);
    const outcome = resolveKnowledgePackForQuiz(blueprint(), registry);
    expect(outcome.mode).toBe("inactive");
    if (outcome.mode === "inactive") {
      expect(outcome.matched).toMatchObject({ id: "test.konu", status: "draft", verificationStatus: "needsReview" });
    }
  });

  it("never activates draft preview in production, even with the flag set", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("KNOWLEDGE_PACK_DRAFT_PREVIEW", "true");
    const registry = createKnowledgePackRegistry([basePack({ status: "draft", verificationStatus: "needsReview" })]);
    const outcome = resolveKnowledgePackForQuiz(blueprint(), registry);
    expect(outcome.mode).toBe("inactive");
  });

  it("never previews a deprecated pack, even with the flag enabled", () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("KNOWLEDGE_PACK_DRAFT_PREVIEW", "true");
    const registry = createKnowledgePackRegistry([basePack({ status: "deprecated", verificationStatus: "needsReview" })]);
    const outcome = resolveKnowledgePackForQuiz(blueprint(), registry);
    expect(outcome.mode).toBe("inactive");
  });

  it("returns notFound when no pack matches", () => {
    const registry = createKnowledgePackRegistry([basePack()]);
    const outcome = resolveKnowledgePackForQuiz(blueprint({ topic: "Bilinmeyen Konu" }), registry);
    expect(outcome.mode).toBe("notFound");
  });

  it("returns notFound (unmapped) when the subject can't be mapped to any SubjectKey", () => {
    const registry = createKnowledgePackRegistry([basePack()]);
    const outcome = resolveKnowledgePackForQuiz(blueprint({ subject: "Beden Eğitimi" }), registry);
    expect(outcome.mode).toBe("notFound");
  });

  it("retries with a Turkish-to-ASCII fold when the natural-spelling topic doesn't match an ASCII slug", () => {
    const registry = createKnowledgePackRegistry([basePack({ slug: "oran-ve-oranti", aliases: [] })]);
    const outcome = resolveKnowledgePackForQuiz(blueprint({ topic: "Oran ve Orantı" }), registry);
    expect(outcome.mode).toBe("resolvedVerified");
  });

  it("passes through invalid resolution", () => {
    const registry = createKnowledgePackRegistry([basePack({ sources: "not-an-array" })]);
    const outcome = resolveKnowledgePackForQuiz(blueprint(), registry);
    expect(outcome.mode).toBe("invalid");
  });

  it("passes through ambiguous resolution", () => {
    const registry = createKnowledgePackRegistry([
      basePack({ id: "test.a", slug: "konu-a", aliases: ["ortak"] }),
      basePack({ id: "test.b", slug: "konu-b", aliases: ["ortak"] }),
    ]);
    const outcome = resolveKnowledgePackForQuiz(blueprint({ topic: "ortak" }), registry);
    expect(outcome.mode).toBe("ambiguous");
  });
});
