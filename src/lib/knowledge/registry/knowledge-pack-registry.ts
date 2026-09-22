import { extractPackIdentity, parseKnowledgePack } from "@/lib/knowledge/schema/knowledge-pack-schema";
import { validateKnowledgePackSemantics } from "@/lib/knowledge/schema/knowledge-pack-semantic";
import { normalizeIdentifier } from "@/lib/knowledge/registry/normalize-identifier";
import type {
  KnowledgePack,
  KnowledgePackIdentity,
  KnowledgePackIssue,
  KnowledgePackResolutionQuery,
  KnowledgePackResolutionResult,
  KnowledgePackStatus,
  RegistryConsistencyIssue,
  RegistryDiagnostics,
} from "@/types/knowledge-pack";

/**
 * One raw input's resolved identity, regardless of whether the pack turned
 * out to be fully valid. This is the shared shape the registry indexes and
 * runs cross-pack consistency checks over — a structurally/semantically
 * broken pack still occupies "identity space" and can still collide with a
 * valid one.
 */
interface IdentityRecord {
  sourceRef: string;
  id: string;
  slug: string;
  subject: string;
  gradeLevel: string;
  aliases: string[];
  contentVersion?: string;
  status?: string;
  /** Present only when the record passed both structural and semantic validation. */
  pack?: KnowledgePack;
  /** Present when the record is known to be broken (structurally or semantically). */
  invalidIssues?: KnowledgePackIssue[];
}

function identityFromPack(pack: KnowledgePack): KnowledgePackIdentity {
  return {
    id: pack.id,
    slug: pack.slug,
    subject: pack.subject,
    gradeLevel: pack.gradeLevel,
    aliases: pack.aliases,
    contentVersion: pack.contentVersion,
    status: pack.status,
  };
}

function identifierKey(subject: string, gradeLevel: string, identifier: string): string {
  return `${normalizeIdentifier(subject)}|${normalizeIdentifier(gradeLevel)}|${normalizeIdentifier(identifier)}`;
}

export interface KnowledgePackRegistry {
  resolve(query: KnowledgePackResolutionQuery): KnowledgePackResolutionResult;
  getDiagnostics(): RegistryDiagnostics;
}

/**
 * Builds a deterministic, in-memory Knowledge Pack registry from raw
 * (already `JSON.parse`d) pack content. All validation and consistency
 * checking happens once here, at construction time — `resolve()` is then a
 * pure lookup that never re-validates and never throws, so a malformed pack
 * anywhere in the input set can never break a teacher's request.
 */
export function createKnowledgePackRegistry(rawPacks: unknown[]): KnowledgePackRegistry {
  const diagnostics: RegistryDiagnostics = { excluded: [], consistencyIssues: [] };
  const records: IdentityRecord[] = [];

  rawPacks.forEach((raw, index) => {
    const sourceRef = String(index);
    const structural = parseKnowledgePack(raw);

    if (structural.success) {
      const pack = structural.data;
      const semanticIssues = validateKnowledgePackSemantics(pack);
      if (semanticIssues.length === 0) {
        records.push({
          sourceRef,
          id: pack.id,
          slug: pack.slug,
          subject: pack.subject,
          gradeLevel: pack.gradeLevel,
          aliases: pack.aliases,
          contentVersion: pack.contentVersion,
          status: pack.status,
          pack,
        });
      } else {
        diagnostics.excluded.push({
          sourceRef,
          extractedIdentity: identityFromPack(pack),
          reason: "semanticInvalid",
          issues: semanticIssues,
        });
        records.push({
          sourceRef,
          id: pack.id,
          slug: pack.slug,
          subject: pack.subject,
          gradeLevel: pack.gradeLevel,
          aliases: pack.aliases,
          contentVersion: pack.contentVersion,
          status: pack.status,
          invalidIssues: semanticIssues,
        });
      }
      return;
    }

    const identityResult = extractPackIdentity(raw);
    if (!identityResult.success) {
      diagnostics.excluded.push({
        sourceRef,
        extractedIdentity: identityResult.identity,
        reason: "identityUnrecoverable",
        issues: structural.issues,
      });
      return;
    }

    diagnostics.excluded.push({
      sourceRef,
      extractedIdentity: identityResult.identity,
      reason: "structuralInvalid",
      issues: structural.issues,
    });
    records.push({
      sourceRef,
      id: identityResult.identity.id,
      slug: identityResult.identity.slug,
      subject: identityResult.identity.subject,
      gradeLevel: identityResult.identity.gradeLevel,
      aliases: identityResult.identity.aliases ?? [],
      contentVersion: identityResult.identity.contentVersion,
      status: identityResult.identity.status,
      invalidIssues: structural.issues,
    });
  });

  const consistencyIssues = computeConsistencyIssues(records);
  diagnostics.consistencyIssues = consistencyIssues;

  // Only id-level issues make every query for that id ambiguous, regardless
  // of which slug/alias reached it. Key-level collisions (duplicate slug,
  // duplicate alias, alias/slug collision) are already fully handled by
  // `matchingIds.size > 1` at the specific colliding identifier — they must
  // not also poison an unrelated, unique identifier belonging to the same id.
  const idLevelIssueTypes = new Set(["multipleActiveVersions", "duplicateIdContentVersion"]);
  const ambiguousIds = new Set<string>();
  consistencyIssues
    .filter((issue) => idLevelIssueTypes.has(issue.type))
    .forEach((issue) => {
      issue.affectedPackRefs.forEach((ref) => {
        const record = records.find((r) => r.sourceRef === ref);
        if (record) ambiguousIds.add(record.id);
      });
    });

  const identifierIndex = buildIdentifierIndex(records);

  function resolve(query: KnowledgePackResolutionQuery): KnowledgePackResolutionResult {
    const key = identifierKey(query.subject, query.gradeLevel, query.slugOrAlias);
    const matchingIds = identifierIndex.get(key);

    if (!matchingIds || matchingIds.size === 0) {
      return { status: "notFound", query };
    }

    if (matchingIds.size > 1) {
      return { status: "ambiguous", query, candidates: buildCandidates(records, matchingIds) };
    }

    const [id] = matchingIds;
    if (ambiguousIds.has(id)) {
      return { status: "ambiguous", query, candidates: buildCandidates(records, new Set([id])) };
    }

    const recordsForId = records.filter((r) => r.id === id);
    const invalidRecord = recordsForId.find((r) => r.invalidIssues);
    if (invalidRecord) {
      return { status: "invalid", query, issues: invalidRecord.invalidIssues! };
    }

    const activeRecord = recordsForId.find((r) => r.pack && r.pack.status === "active");
    if (activeRecord?.pack) {
      return { status: "resolved", pack: activeRecord.pack };
    }

    const inactiveRecord = recordsForId.find((r) => r.pack);
    if (inactiveRecord?.pack) {
      return { status: "inactive", query, pack: inactiveRecord.pack };
    }

    return { status: "notFound", query };
  }

  return { resolve, getDiagnostics: () => diagnostics };
}

function buildIdentifierIndex(records: IdentityRecord[]): Map<string, Set<string>> {
  const index = new Map<string, Set<string>>();

  const addEntry = (key: string, id: string) => {
    const existing = index.get(key);
    if (existing) {
      existing.add(id);
    } else {
      index.set(key, new Set([id]));
    }
  };

  records.forEach((record) => {
    addEntry(identifierKey(record.subject, record.gradeLevel, record.slug), record.id);
    record.aliases.forEach((alias) => addEntry(identifierKey(record.subject, record.gradeLevel, alias), record.id));
  });

  return index;
}

function buildCandidates(
  records: IdentityRecord[],
  ids: ReadonlySet<string>
): { id: string; slug: string; contentVersion: string; status: KnowledgePackStatus }[] {
  return records
    .filter((r) => ids.has(r.id))
    .map((r) => ({
      id: r.id,
      slug: r.slug,
      contentVersion: r.contentVersion ?? "unknown",
      status: (r.status as KnowledgePackStatus) ?? "draft",
    }));
}

/**
 * Cross-pack consistency checks, computed once over every identity-extracted
 * record (valid or invalid — an invalid record still occupies identity
 * space and can still collide with a valid one). All comparisons go through
 * `normalizeIdentifier`, so this also covers "collisions after deterministic
 * normalization" without any fuzzy/similarity matching.
 */
function computeConsistencyIssues(records: IdentityRecord[]): RegistryConsistencyIssue[] {
  const issues: RegistryConsistencyIssue[] = [];

  // duplicateSlugInSubjectGrade: two different ids claiming the same
  // normalized slug within the same subject+grade.
  const slugGroups = new Map<string, IdentityRecord[]>();
  records.forEach((record) => {
    const key = identifierKey(record.subject, record.gradeLevel, record.slug);
    const group = slugGroups.get(key) ?? [];
    group.push(record);
    slugGroups.set(key, group);
  });
  slugGroups.forEach((group, key) => {
    const distinctIds = new Set(group.map((r) => r.id));
    if (distinctIds.size > 1) {
      issues.push({
        type: "duplicateSlugInSubjectGrade",
        identifier: key,
        affectedPackRefs: group.map((r) => r.sourceRef),
        message: `Aynı subject+gradeLevel içinde birden fazla farklı id, normalize edildiğinde aynı slug'ı kullanıyor: "${key}".`,
      });
    }
  });

  // duplicateAlias: two different ids claiming the same normalized alias
  // within the same subject+grade.
  const aliasGroups = new Map<string, IdentityRecord[]>();
  records.forEach((record) => {
    record.aliases.forEach((alias) => {
      const key = identifierKey(record.subject, record.gradeLevel, alias);
      const group = aliasGroups.get(key) ?? [];
      group.push(record);
      aliasGroups.set(key, group);
    });
  });
  aliasGroups.forEach((group, key) => {
    const distinctIds = new Set(group.map((r) => r.id));
    if (distinctIds.size > 1) {
      issues.push({
        type: "duplicateAlias",
        identifier: key,
        affectedPackRefs: group.map((r) => r.sourceRef),
        message: `Aynı subject+gradeLevel içinde birden fazla farklı id, normalize edildiğinde aynı alias'ı kullanıyor: "${key}".`,
      });
    }
  });

  // aliasSlugCollision: one record's alias equals another (different-id)
  // record's slug, within the same subject+grade.
  slugGroups.forEach((slugGroup, key) => {
    const aliasGroup = aliasGroups.get(key);
    if (!aliasGroup) return;
    const slugIds = new Set(slugGroup.map((r) => r.id));
    const aliasIds = new Set(aliasGroup.map((r) => r.id));
    const crossIds = [...aliasIds].some((aliasId) => [...slugIds].some((slugId) => slugId !== aliasId));
    if (crossIds) {
      issues.push({
        type: "aliasSlugCollision",
        identifier: key,
        affectedPackRefs: [...new Set([...slugGroup, ...aliasGroup].map((r) => r.sourceRef))],
        message: `Bir paketin alias'ı, farklı bir id'ye ait slug ile normalize edildiğinde çakışıyor: "${key}".`,
      });
    }
  });

  // duplicateIdContentVersion: two records with the exact same (id, contentVersion) pair.
  const idVersionGroups = new Map<string, IdentityRecord[]>();
  records.forEach((record) => {
    if (!record.contentVersion) return;
    const key = `${record.id}@${record.contentVersion}`;
    const group = idVersionGroups.get(key) ?? [];
    group.push(record);
    idVersionGroups.set(key, group);
  });
  idVersionGroups.forEach((group, key) => {
    if (group.length > 1) {
      issues.push({
        type: "duplicateIdContentVersion",
        identifier: key,
        affectedPackRefs: group.map((r) => r.sourceRef),
        message: `Aynı id + contentVersion birden fazla kayıtta tekrarlanıyor: "${key}".`,
      });
    }
  });

  // multipleActiveVersions: more than one record for the same id with status "active".
  const idGroups = new Map<string, IdentityRecord[]>();
  records.forEach((record) => {
    const group = idGroups.get(record.id) ?? [];
    group.push(record);
    idGroups.set(record.id, group);
  });
  idGroups.forEach((group, id) => {
    const activeRecords = group.filter((r) => r.status === "active");
    if (activeRecords.length > 1) {
      issues.push({
        type: "multipleActiveVersions",
        identifier: id,
        affectedPackRefs: activeRecords.map((r) => r.sourceRef),
        message: `"${id}" için birden fazla "active" durumunda sürüm bulundu.`,
      });
    }
  });

  return issues;
}
