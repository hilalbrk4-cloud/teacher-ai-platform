import { describe, expect, it } from "vitest";
import { createKnowledgePackRegistry } from "@/lib/knowledge/registry/knowledge-pack-registry";
import duplicateIdVersionPacks from "@/lib/knowledge/__fixtures__/duplicate-id-version-packs.json";
import aliasSlugCollisionPacks from "@/lib/knowledge/__fixtures__/alias-slug-collision-packs.json";
import malformedRecoverable from "@/lib/knowledge/__fixtures__/malformed-recoverable-identity.json";
import semanticallyInvalidPack from "@/lib/knowledge/__fixtures__/semantically-invalid-pack.json";

describe("createKnowledgePackRegistry — consistency diagnostics", () => {
  it("detects a duplicate id + contentVersion pair", () => {
    const registry = createKnowledgePackRegistry(duplicateIdVersionPacks);
    const issue = registry.getDiagnostics().consistencyIssues.find((i) => i.type === "duplicateIdContentVersion");
    expect(issue).toBeDefined();
    expect(issue?.affectedPackRefs).toHaveLength(2);
  });

  it("detects an alias colliding with another topic's slug", () => {
    const registry = createKnowledgePackRegistry(aliasSlugCollisionPacks);
    const issue = registry.getDiagnostics().consistencyIssues.find((i) => i.type === "aliasSlugCollision");
    expect(issue).toBeDefined();
  });

  it("records structurally invalid packs in diagnostics with their salvaged identity", () => {
    const registry = createKnowledgePackRegistry([malformedRecoverable]);
    const entry = registry.getDiagnostics().excluded.find((e) => e.reason === "structuralInvalid");
    expect(entry).toBeDefined();
    expect(entry?.extractedIdentity?.id).toBe("test.bozuk-konu");
  });

  it("records semantically invalid packs in diagnostics", () => {
    const registry = createKnowledgePackRegistry([semanticallyInvalidPack]);
    const entry = registry.getDiagnostics().excluded.find((e) => e.reason === "semanticInvalid");
    expect(entry).toBeDefined();
    expect(entry?.issues.length).toBeGreaterThan(0);
  });
});
