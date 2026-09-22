import { describe, expect, it } from "vitest";
import { createKnowledgePackRegistry } from "@/lib/knowledge/registry/knowledge-pack-registry";
import validActivePack from "@/lib/knowledge/__fixtures__/valid-active-pack.json";
import validDraftPack from "@/lib/knowledge/__fixtures__/valid-draft-pack.json";
import malformedRecoverable from "@/lib/knowledge/__fixtures__/malformed-recoverable-identity.json";
import semanticallyInvalidPack from "@/lib/knowledge/__fixtures__/semantically-invalid-pack.json";
import versionHistoryPacks from "@/lib/knowledge/__fixtures__/version-history-packs.json";
import multipleActiveVersionsPacks from "@/lib/knowledge/__fixtures__/multiple-active-versions-packs.json";
import aliasCollisionPacks from "@/lib/knowledge/__fixtures__/alias-collision-packs.json";
import normalizationCollisionPacks from "@/lib/knowledge/__fixtures__/normalization-collision-packs.json";
import type { SubjectKey } from "@/types/knowledge-pack";

describe("createKnowledgePackRegistry — resolve()", () => {
  it("resolves an exact slug match", () => {
    const registry = createKnowledgePackRegistry([validActivePack]);
    const result = registry.resolve({ subject: "matematik" as SubjectKey, gradeLevel: "6", slugOrAlias: "ornek-konu" });
    expect(result.status).toBe("resolved");
    if (result.status === "resolved") expect(result.pack.id).toBe("test.ornek-konu");
  });

  it("resolves via an approved alias", () => {
    const registry = createKnowledgePackRegistry([validActivePack]);
    const result = registry.resolve({ subject: "matematik" as SubjectKey, gradeLevel: "6", slugOrAlias: "ornek-konu-alias" });
    expect(result.status).toBe("resolved");
  });

  it("returns notFound for an unknown topic", () => {
    const registry = createKnowledgePackRegistry([validActivePack]);
    const result = registry.resolve({ subject: "matematik" as SubjectKey, gradeLevel: "6", slugOrAlias: "bilinmeyen-konu" });
    expect(result.status).toBe("notFound");
  });

  it("returns inactive for a draft pack", () => {
    const registry = createKnowledgePackRegistry([validDraftPack]);
    const result = registry.resolve({ subject: "fen-bilimleri" as SubjectKey, gradeLevel: "5", slugOrAlias: "taslak-konu" });
    expect(result.status).toBe("inactive");
  });

  it("returns invalid for a structurally malformed but identity-recoverable pack", () => {
    const registry = createKnowledgePackRegistry([malformedRecoverable]);
    const result = registry.resolve({ subject: "turkce" as SubjectKey, gradeLevel: "7", slugOrAlias: "bozuk-konu" });
    expect(result.status).toBe("invalid");
    if (result.status === "invalid") expect(result.issues.length).toBeGreaterThan(0);
  });

  it("returns invalid for a semantically invalid pack", () => {
    const registry = createKnowledgePackRegistry([semanticallyInvalidPack]);
    const result = registry.resolve({ subject: "sosyal-bilgiler" as SubjectKey, gradeLevel: "6", slugOrAlias: "semantik-hatali-konu" });
    expect(result.status).toBe("invalid");
  });

  it("resolves cleanly to the active version of a topic with retained version history", () => {
    const registry = createKnowledgePackRegistry(versionHistoryPacks);
    const result = registry.resolve({ subject: "matematik" as SubjectKey, gradeLevel: "6", slugOrAlias: "surum-konusu" });
    expect(result.status).toBe("resolved");
    if (result.status === "resolved") expect(result.pack.contentVersion).toBe("1.1.0");
    expect(registry.getDiagnostics().consistencyIssues).toEqual([]);
  });

  it("reports ambiguous when the same id has multiple active versions", () => {
    const registry = createKnowledgePackRegistry(multipleActiveVersionsPacks);
    const result = registry.resolve({ subject: "matematik" as SubjectKey, gradeLevel: "8", slugOrAlias: "cift-aktif-konu" });
    expect(result.status).toBe("ambiguous");
    if (result.status === "ambiguous") expect(result.candidates).toHaveLength(2);
  });

  it("reports ambiguous when two different topics share an alias", () => {
    const registry = createKnowledgePackRegistry(aliasCollisionPacks);
    const result = registry.resolve({ subject: "matematik" as SubjectKey, gradeLevel: "6", slugOrAlias: "ortak-alias" });
    expect(result.status).toBe("ambiguous");
    if (result.status === "ambiguous") expect(result.candidates.map((c) => c.id).sort()).toEqual(["test.alias-a", "test.alias-b"]);
  });

  it("detects slug collisions after deterministic normalization", () => {
    const registry = createKnowledgePackRegistry(normalizationCollisionPacks);
    const issue = registry
      .getDiagnostics()
      .consistencyIssues.find((i) => i.type === "duplicateSlugInSubjectGrade");
    expect(issue).toBeDefined();
    expect(issue?.affectedPackRefs).toHaveLength(2);
  });
});

describe("createKnowledgePackRegistry — diagnostics", () => {
  it("excludes a pack whose identity cannot be recovered, invisible to resolve()", () => {
    const unrecoverable = { subject: "ingilizce", gradeLevel: "8", topic: "Kimliksiz" };
    const registry = createKnowledgePackRegistry([unrecoverable]);
    const diagnostics = registry.getDiagnostics();
    expect(diagnostics.excluded).toHaveLength(1);
    expect(diagnostics.excluded[0].reason).toBe("identityUnrecoverable");

    const result = registry.resolve({ subject: "ingilizce" as SubjectKey, gradeLevel: "8", slugOrAlias: "kimliksiz" });
    expect(result.status).toBe("notFound");
  });
});
