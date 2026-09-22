import { describe, expect, it } from "vitest";
import { parseKnowledgePack } from "@/lib/knowledge/schema/knowledge-pack-schema";
import { validateKnowledgePackSemantics } from "@/lib/knowledge/schema/knowledge-pack-semantic";
import { createKnowledgePackRegistry } from "@/lib/knowledge/registry/knowledge-pack-registry";
import {
  projectPackForLessonPlanner,
  projectPackForQuizGenerator,
  projectPackForTeacherReviewer,
} from "@/lib/knowledge/projections/knowledge-pack-projections";
import oranVeOranti from "@/lib/knowledge/packs/matematik/7/oran-ve-oranti.json";
import type { SubjectKey } from "@/types/knowledge-pack";

describe("Matematik 7 — Oran ve Orantı (production pack)", () => {
  it("parses structurally with no issues", () => {
    const result = parseKnowledgePack(oranVeOranti);
    expect(result.success).toBe(true);
  });

  it("passes semantic validation with zero issues", () => {
    const parsed = parseKnowledgePack(oranVeOranti);
    if (!parsed.success) throw new Error("Pack must parse structurally for this test to be meaningful");
    expect(validateKnowledgePackSemantics(parsed.data)).toEqual([]);
  });

  it("is intentionally kept in draft status pending official verification", () => {
    const parsed = parseKnowledgePack(oranVeOranti);
    if (!parsed.success) throw new Error("Pack must parse structurally for this test to be meaningful");
    expect(parsed.data.status).toBe("draft");
    expect(parsed.data.verificationStatus).toBe("needsReview");
    expect(parsed.data.reviewedBy).toBeUndefined();
    expect(parsed.data.curriculumAlignment).toBeUndefined();
  });

  it("every question pattern's targetedMisconceptionIds resolves to a declared misconception", () => {
    const parsed = parseKnowledgePack(oranVeOranti);
    if (!parsed.success) throw new Error("Pack must parse structurally for this test to be meaningful");
    const misconceptionIds = new Set(parsed.data.commonMisconceptions.map((m) => m.id));
    parsed.data.questionPatterns.forEach((pattern) => {
      pattern.targetedMisconceptionIds.forEach((id) => {
        expect(misconceptionIds.has(id)).toBe(true);
      });
    });
  });

  it("resolves via the registry by exact slug and by each alias, as inactive (draft)", () => {
    const registry = createKnowledgePackRegistry([oranVeOranti]);
    const query = { subject: "matematik" as SubjectKey, gradeLevel: "7" };

    const bySlug = registry.resolve({ ...query, slugOrAlias: "oran-ve-oranti" });
    expect(bySlug.status).toBe("inactive");

    ["oran-orani", "dogru-ve-ters-oranti"].forEach((alias) => {
      const result = registry.resolve({ ...query, slugOrAlias: alias });
      expect(result.status).toBe("inactive");
    });

    expect(registry.getDiagnostics()).toEqual({ excluded: [], consistencyIssues: [] });
  });

  it("produces token-conscious, feature-specific projections", () => {
    const parsed = parseKnowledgePack(oranVeOranti);
    if (!parsed.success) throw new Error("Pack must parse structurally for this test to be meaningful");

    const quizProjection = projectPackForQuizGenerator(parsed.data);
    expect(quizProjection.questionPatterns).toHaveLength(7);
    expect(quizProjection).not.toHaveProperty("sources");

    const lessonProjection = projectPackForLessonPlanner(parsed.data);
    expect(lessonProjection.teachingApproaches).toEqual(parsed.data.teachingApproaches);
    expect(lessonProjection).not.toHaveProperty("questionPatterns");

    const reviewerProjection = projectPackForTeacherReviewer(parsed.data);
    expect(reviewerProjection.criticalReviewRules).toHaveLength(4);
    expect(reviewerProjection).not.toHaveProperty("changelog");
  });

  it("no longer forces the mixture pattern into a doğru/ters orantı classification", () => {
    const parsed = parseKnowledgePack(oranVeOranti);
    if (!parsed.success) throw new Error("Pack must parse structurally for this test to be meaningful");
    const mixturePattern = parsed.data.questionPatterns.find((p) => p.id === "qp-karisim-orani");
    expect(mixturePattern).toBeDefined();
    expect(parsed.data.questionPatterns.some((p) => p.id === "qp-karisim-indirim-artis")).toBe(false);
    expect(mixturePattern?.targetedMisconceptionIds).not.toContain("mc-dogru-ters-karistirma");
  });

  it("includes the higher-order Student Solution/Error Analysis pattern", () => {
    const parsed = parseKnowledgePack(oranVeOranti);
    if (!parsed.success) throw new Error("Pack must parse structurally for this test to be meaningful");
    const errorAnalysisPattern = parsed.data.questionPatterns.find((p) => p.id === "qp-ogrenci-cozumu-hata-analizi");
    expect(errorAnalysisPattern).toBeDefined();
    expect(errorAnalysisPattern?.suitableCognitiveLevels).toEqual(["analyze", "evaluate"]);
    expect(errorAnalysisPattern?.targetedMisconceptionIds.length).toBeGreaterThan(1);
  });

  it("states the corrected cross-multiplication principle consistently, not a 'direct proportion only' rule", () => {
    const parsed = parseKnowledgePack(oranVeOranti);
    if (!parsed.success) throw new Error("Pack must parse structurally for this test to be meaningful");
    const surfaces = [
      parsed.data.keyConcepts.find((c) => c.term === "İçler-dışlar çarpımı")?.definition,
      parsed.data.commonMisconceptions.find((m) => m.id === "mc-capraz-carpim-ezber")?.correction,
      parsed.data.criticalReviewRules.find((r) => r.id === "crr-capraz-carpim-uygunlugu")?.rule,
      ...parsed.data.forbiddenPatterns,
    ];
    surfaces.forEach((text) => {
      expect(text).toBeDefined();
      expect(text).not.toMatch(/yalnızca doğru orantı ilişkisi doğrulandığında geçerlidir/);
    });
  });
});
