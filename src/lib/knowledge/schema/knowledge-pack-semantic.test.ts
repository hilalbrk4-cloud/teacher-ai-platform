import { describe, expect, it } from "vitest";
import { parseKnowledgePack } from "@/lib/knowledge/schema/knowledge-pack-schema";
import { validateKnowledgePackSemantics } from "@/lib/knowledge/schema/knowledge-pack-semantic";
import validActivePack from "@/lib/knowledge/__fixtures__/valid-active-pack.json";
import validDraftPack from "@/lib/knowledge/__fixtures__/valid-draft-pack.json";
import semanticallyInvalidPack from "@/lib/knowledge/__fixtures__/semantically-invalid-pack.json";
import activePackMissingVerification from "@/lib/knowledge/__fixtures__/active-pack-missing-verification.json";

function parseOrThrow(raw: unknown) {
  const result = parseKnowledgePack(raw);
  if (!result.success) throw new Error("Fixture expected to parse structurally");
  return result.data;
}

describe("validateKnowledgePackSemantics", () => {
  it("accepts a fully valid active pack", () => {
    expect(validateKnowledgePackSemantics(parseOrThrow(validActivePack))).toEqual([]);
  });

  it("accepts a minimal, exempt draft pack", () => {
    expect(validateKnowledgePackSemantics(parseOrThrow(validDraftPack))).toEqual([]);
  });

  it("flags invalid question-pattern cognitive levels and approaches, and dangling misconception references", () => {
    const issues = validateKnowledgePackSemantics(parseOrThrow(semanticallyInvalidPack));
    const paths = issues.map((issue) => issue.path);
    expect(paths).toContain("questionPatterns[0].suitableCognitiveLevels[0]");
    expect(paths).toContain("questionPatterns[0].suitableApproaches[0]");
    expect(paths).toContain("questionPatterns[0].targetedMisconceptionIds[0]");
  });

  it("flags an active pack missing verification/governance metadata", () => {
    const issues = validateKnowledgePackSemantics(parseOrThrow(activePackMissingVerification));
    const paths = issues.map((issue) => issue.path);
    expect(paths).toContain("verificationStatus");
    expect(paths).toContain("sources");
    expect(paths).toContain("reviewedBy");
    expect(paths).toContain("lastReviewedAt");
    expect(paths).toContain("changelog");
    expect(paths).toContain("learningOutcomes");
    expect(paths).toContain("assessableSkills");
    expect(paths).toContain("questionPatterns");
    expect(paths).toContain("criticalReviewRules");
  });

  it("rejects invalid SemVer and ISO date formats", () => {
    const pack = parseOrThrow(validActivePack);
    const issues = validateKnowledgePackSemantics({ ...pack, contentVersion: "not-a-version", lastReviewedAt: "10/01/2026" });
    const paths = issues.map((issue) => issue.path);
    expect(paths).toContain("contentVersion");
    expect(paths).toContain("lastReviewedAt");
  });

  it("requires a changelog entry for any non-draft status", () => {
    const pack = parseOrThrow(validDraftPack);
    const issues = validateKnowledgePackSemantics({ ...pack, status: "deprecated" });
    expect(issues.some((issue) => issue.path === "changelog")).toBe(true);
  });
});
