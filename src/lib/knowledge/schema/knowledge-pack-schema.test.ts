import { describe, expect, it } from "vitest";
import { extractPackIdentity, parseKnowledgePack } from "@/lib/knowledge/schema/knowledge-pack-schema";
import validActivePack from "@/lib/knowledge/__fixtures__/valid-active-pack.json";
import malformedRecoverable from "@/lib/knowledge/__fixtures__/malformed-recoverable-identity.json";
import malformedUnrecoverable from "@/lib/knowledge/__fixtures__/malformed-unrecoverable-identity.json";

describe("parseKnowledgePack", () => {
  it("parses a valid pack successfully", () => {
    const result = parseKnowledgePack(validActivePack);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.id).toBe("test.ornek-konu");
      expect(result.data.questionPatterns).toHaveLength(1);
    }
  });

  it("rejects a pack with a malformed field", () => {
    const result = parseKnowledgePack(malformedRecoverable);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.issues.some((issue) => issue.path === "sources")).toBe(true);
    }
  });

  it("rejects a non-object payload", () => {
    const result = parseKnowledgePack("not a pack");
    expect(result.success).toBe(false);
  });
});

describe("extractPackIdentity", () => {
  it("recovers identity from a structurally malformed pack", () => {
    const result = extractPackIdentity(malformedRecoverable);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.identity).toMatchObject({
        id: "test.bozuk-konu",
        slug: "bozuk-konu",
        subject: "turkce",
        gradeLevel: "7",
      });
    }
  });

  it("fails to recover identity when id/slug are missing", () => {
    const result = extractPackIdentity(malformedUnrecoverable);
    expect(result.success).toBe(false);
  });
});
