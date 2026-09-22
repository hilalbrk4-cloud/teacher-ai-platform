import {
  COGNITIVE_LEVELS,
  DIFFICULTY_LEVELS,
  type CognitiveLevel,
  type DifficultyLevel,
  type QuestionApproach,
  type QuestionType,
  type SlotVisualType,
} from "@/types/quiz-generator";
import {
  KNOWLEDGE_PACK_STATUSES,
  SOURCE_TYPES,
  SUBJECT_KEYS,
  VERIFICATION_STATUSES,
  type KnowledgePack,
  type KnowledgePackChangelogEntry,
  type KnowledgePackCriticalReviewRule,
  type KnowledgePackCurriculumAlignment,
  type KnowledgePackDifficultyRules,
  type KnowledgePackIdentity,
  type KnowledgePackIdentityResult,
  type KnowledgePackIssue,
  type KnowledgePackKeyConcept,
  type KnowledgePackLearningOutcome,
  type KnowledgePackMisconception,
  type KnowledgePackParseResult,
  type KnowledgePackQuestionPattern,
  type KnowledgePackSource,
  type KnowledgePackVocabularyEntry,
} from "@/types/knowledge-pack";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readNonEmptyString(
  record: Record<string, unknown>,
  field: string,
  path: string,
  issues: KnowledgePackIssue[]
): string | undefined {
  const value = record[field];
  if (typeof value !== "string" || value.trim().length === 0) {
    issues.push({ path: `${path}.${field}`, message: `"${field}" boş olmayan bir metin (string) olmalıdır.` });
    return undefined;
  }
  return value;
}

function readOptionalString(
  record: Record<string, unknown>,
  field: string,
  path: string,
  issues: KnowledgePackIssue[]
): string | undefined {
  const value = record[field];
  if (value === undefined) return undefined;
  if (typeof value !== "string") {
    issues.push({ path: `${path}.${field}`, message: `"${field}" belirtilirse bir metin (string) olmalıdır.` });
    return undefined;
  }
  return value;
}

function readEnum<T extends string>(
  record: Record<string, unknown>,
  field: string,
  allowed: readonly T[],
  path: string,
  issues: KnowledgePackIssue[]
): T | undefined {
  const value = record[field];
  if (typeof value !== "string" || !(allowed as readonly string[]).includes(value)) {
    issues.push({
      path: `${path}.${field}`,
      message: `"${field}" şu değerlerden biri olmalıdır: ${allowed.join(", ")}.`,
    });
    return undefined;
  }
  return value as T;
}

function readOptionalStringArray(
  record: Record<string, unknown>,
  field: string,
  path: string,
  issues: KnowledgePackIssue[]
): string[] | undefined {
  const value = record[field];
  if (value === undefined) return undefined;
  if (!Array.isArray(value) || !value.every((item) => typeof item === "string")) {
    issues.push({ path: `${path}.${field}`, message: `"${field}" belirtilirse bir metin dizisi olmalıdır.` });
    return undefined;
  }
  return value as string[];
}

function readStringArray(
  record: Record<string, unknown>,
  field: string,
  path: string,
  issues: KnowledgePackIssue[]
): string[] | undefined {
  const value = record[field];
  if (!Array.isArray(value) || !value.every((item) => typeof item === "string")) {
    issues.push({ path: `${path}.${field}`, message: `"${field}" bir metin dizisi olmalıdır.` });
    return undefined;
  }
  return value as string[];
}

function readEnumArray<T extends string>(
  record: Record<string, unknown>,
  field: string,
  allowed: readonly T[],
  path: string,
  issues: KnowledgePackIssue[]
): T[] | undefined {
  const value = record[field];
  if (!Array.isArray(value)) {
    issues.push({ path: `${path}.${field}`, message: `"${field}" bir dizi olmalıdır.` });
    return undefined;
  }
  const result: T[] = [];
  let ok = true;
  value.forEach((item, index) => {
    if (typeof item !== "string" || !(allowed as readonly string[]).includes(item)) {
      issues.push({
        path: `${path}.${field}[${index}]`,
        message: `Geçersiz değer. Şunlardan biri olmalıdır: ${allowed.join(", ")}.`,
      });
      ok = false;
      return;
    }
    result.push(item as T);
  });
  return ok ? result : undefined;
}

function readObjectArray<T>(
  value: unknown,
  path: string,
  issues: KnowledgePackIssue[],
  parseItem: (item: Record<string, unknown>, itemPath: string, issues: KnowledgePackIssue[]) => T | undefined
): T[] | undefined {
  if (!Array.isArray(value)) {
    issues.push({ path, message: `"${path}" bir dizi olmalıdır.` });
    return undefined;
  }
  const result: T[] = [];
  let ok = true;
  value.forEach((item, index) => {
    const itemPath = `${path}[${index}]`;
    if (!isRecord(item)) {
      issues.push({ path: itemPath, message: "Her öğe bir JSON nesnesi olmalıdır." });
      ok = false;
      return;
    }
    const parsed = parseItem(item, itemPath, issues);
    if (parsed === undefined) {
      ok = false;
      return;
    }
    result.push(parsed);
  });
  return ok ? result : undefined;
}

function parseSource(item: Record<string, unknown>, path: string, issues: KnowledgePackIssue[]): KnowledgePackSource | undefined {
  const id = readNonEmptyString(item, "id", path, issues);
  const sourceType = readEnum(item, "sourceType", SOURCE_TYPES, path, issues);
  const title = readNonEmptyString(item, "title", path, issues);
  const publisher = readOptionalString(item, "publisher", path, issues);
  const reference = readOptionalString(item, "reference", path, issues);
  const accessDate = readOptionalString(item, "accessDate", path, issues);
  if (!id || !sourceType || !title) return undefined;
  return { id, sourceType, title, publisher, reference, accessDate };
}

function parseChangelogEntry(
  item: Record<string, unknown>,
  path: string,
  issues: KnowledgePackIssue[]
): KnowledgePackChangelogEntry | undefined {
  const version = readNonEmptyString(item, "version", path, issues);
  const date = readNonEmptyString(item, "date", path, issues);
  const author = readNonEmptyString(item, "author", path, issues);
  const summary = readNonEmptyString(item, "summary", path, issues);
  if (!version || !date || !author || !summary) return undefined;
  return { version, date, author, summary };
}

function parseMisconception(
  item: Record<string, unknown>,
  path: string,
  issues: KnowledgePackIssue[]
): KnowledgePackMisconception | undefined {
  const id = readNonEmptyString(item, "id", path, issues);
  const description = readNonEmptyString(item, "description", path, issues);
  const correction = readNonEmptyString(item, "correction", path, issues);
  if (!id || !description || !correction) return undefined;
  return { id, description, correction };
}

function parseLearningOutcome(
  item: Record<string, unknown>,
  path: string,
  issues: KnowledgePackIssue[]
): KnowledgePackLearningOutcome | undefined {
  const id = readNonEmptyString(item, "id", path, issues);
  const statement = readNonEmptyString(item, "statement", path, issues);
  const cognitiveLevel = readEnum(item, "cognitiveLevel", COGNITIVE_LEVELS, path, issues);
  const difficulty = readEnum(item, "difficulty", DIFFICULTY_LEVELS, path, issues);
  if (!id || !statement || !cognitiveLevel || !difficulty) return undefined;
  return { id, statement, cognitiveLevel, difficulty };
}

function parseKeyConceptOrVocabulary(
  item: Record<string, unknown>,
  path: string,
  issues: KnowledgePackIssue[]
): KnowledgePackKeyConcept | KnowledgePackVocabularyEntry | undefined {
  const term = readNonEmptyString(item, "term", path, issues);
  const definition = readNonEmptyString(item, "definition", path, issues);
  if (!term || !definition) return undefined;
  return { term, definition };
}

function parseQuestionPattern(
  item: Record<string, unknown>,
  path: string,
  issues: KnowledgePackIssue[]
): KnowledgePackQuestionPattern | undefined {
  const id = readNonEmptyString(item, "id", path, issues);
  const name = readNonEmptyString(item, "name", path, issues);
  // Domain membership (must be an actual CognitiveLevel/QuestionApproach/etc.)
  // is deliberately deferred to the semantic validator; structurally these
  // are just non-typed string arrays.
  const suitableCognitiveLevels = readStringArray(item, "suitableCognitiveLevels", path, issues);
  const suitableApproaches = readStringArray(item, "suitableApproaches", path, issues);
  const suitableQuestionTypes = readOptionalStringArray(item, "suitableQuestionTypes", path, issues);
  const description = readNonEmptyString(item, "description", path, issues);
  const requiredInformation = readStringArray(item, "requiredInformation", path, issues);
  const reasoningSteps = readStringArray(item, "reasoningSteps", path, issues);
  const recommendedVisuals = readStringArray(item, "recommendedVisuals", path, issues);
  const avoid = readStringArray(item, "avoid", path, issues);
  const targetedMisconceptionIds = readStringArray(item, "targetedMisconceptionIds", path, issues);
  const exampleStem = readOptionalString(item, "exampleStem", path, issues);

  if (
    !id ||
    !name ||
    !suitableCognitiveLevels ||
    !suitableApproaches ||
    !description ||
    !requiredInformation ||
    !reasoningSteps ||
    !recommendedVisuals ||
    !avoid ||
    !targetedMisconceptionIds
  ) {
    return undefined;
  }

  return {
    id,
    name,
    suitableCognitiveLevels: suitableCognitiveLevels as CognitiveLevel[],
    suitableApproaches: suitableApproaches as QuestionApproach[],
    suitableQuestionTypes: suitableQuestionTypes as QuestionType[] | undefined,
    description,
    requiredInformation,
    reasoningSteps,
    recommendedVisuals: recommendedVisuals as SlotVisualType[],
    avoid,
    targetedMisconceptionIds,
    exampleStem,
  };
}

function parseDifficultyRules(
  value: unknown,
  path: string,
  issues: KnowledgePackIssue[]
): KnowledgePackDifficultyRules | undefined {
  if (!isRecord(value)) {
    issues.push({ path, message: `"${path}" bir JSON nesnesi olmalıdır.` });
    return undefined;
  }
  const allowedLevels = readEnumArray(value, "allowedLevels", DIFFICULTY_LEVELS, path, issues);
  const progressionNotes = readNonEmptyString(value, "progressionNotes", path, issues);
  if (!allowedLevels || !progressionNotes) return undefined;
  return { allowedLevels: allowedLevels as DifficultyLevel[], progressionNotes };
}

function parseCriticalReviewRule(
  item: Record<string, unknown>,
  path: string,
  issues: KnowledgePackIssue[]
): KnowledgePackCriticalReviewRule | undefined {
  const id = readNonEmptyString(item, "id", path, issues);
  const rule = readNonEmptyString(item, "rule", path, issues);
  const severity = readEnum(item, "severity", ["blocking", "warning"] as const, path, issues);
  if (!id || !rule || !severity) return undefined;
  return { id, rule, severity };
}

function parseCurriculumAlignment(
  item: Record<string, unknown>,
  path: string,
  issues: KnowledgePackIssue[]
): KnowledgePackCurriculumAlignment | undefined {
  const code = readNonEmptyString(item, "code", path, issues);
  const description = readNonEmptyString(item, "description", path, issues);
  if (!code || !description) return undefined;
  return { code, description };
}

/**
 * Lenient identity extraction. Salvages only what the registry needs to
 * route a query to a pack (id, slug, subject, gradeLevel, plus aliases /
 * contentVersion / status if present) without requiring the rest of the
 * document to be well-formed. A pack whose identity cannot be extracted
 * here can never be matched to any query — see registry diagnostics.
 */
export function extractPackIdentity(raw: unknown): KnowledgePackIdentityResult {
  const issues: KnowledgePackIssue[] = [];
  if (!isRecord(raw)) {
    return {
      success: false,
      identity: {},
      issues: [{ path: "root", message: "Paket bir JSON nesnesi olmalıdır." }],
    };
  }

  const identity: KnowledgePackIdentity = {};

  const id = readNonEmptyString(raw, "id", "root", issues);
  if (id) identity.id = id;
  const slug = readNonEmptyString(raw, "slug", "root", issues);
  if (slug) identity.slug = slug;
  const subject = readNonEmptyString(raw, "subject", "root", issues);
  if (subject) identity.subject = subject;
  const gradeLevel = readNonEmptyString(raw, "gradeLevel", "root", issues);
  if (gradeLevel) identity.gradeLevel = gradeLevel;

  const aliases = readOptionalStringArray(raw, "aliases", "root", []);
  if (aliases) identity.aliases = aliases;
  const contentVersion = readOptionalString(raw, "contentVersion", "root", []);
  if (contentVersion) identity.contentVersion = contentVersion;
  const status = readOptionalString(raw, "status", "root", []);
  if (status) identity.status = status;

  if (!id || !slug || !subject || !gradeLevel) {
    return { success: false, identity, issues };
  }

  return {
    success: true,
    identity: { id, slug, subject, gradeLevel, aliases, contentVersion, status },
  };
}

/**
 * Strict structural parse. Only checks shape/types/enum membership — never
 * emptiness of governance-critical arrays (that's the semantic validator's
 * job) and never cross-pack consistency (that's the registry's job).
 */
export function parseKnowledgePack(raw: unknown): KnowledgePackParseResult {
  const issues: KnowledgePackIssue[] = [];

  if (!isRecord(raw)) {
    return { success: false, issues: [{ path: "root", message: "Paket bir JSON nesnesi olmalıdır." }] };
  }

  const id = readNonEmptyString(raw, "id", "root", issues);
  const slug = readNonEmptyString(raw, "slug", "root", issues);
  const subject = readEnum(raw, "subject", SUBJECT_KEYS, "root", issues);
  const gradeLevel = readNonEmptyString(raw, "gradeLevel", "root", issues);
  const topic = readNonEmptyString(raw, "topic", "root", issues);
  const unit = readOptionalString(raw, "unit", "root", issues);
  const aliases = readStringArray(raw, "aliases", "root", issues);
  const curriculumKeywords = readStringArray(raw, "curriculumKeywords", "root", issues);
  const curriculumYear = readOptionalString(raw, "curriculumYear", "root", issues);
  const packSchemaVersion = readNonEmptyString(raw, "packSchemaVersion", "root", issues);
  const contentVersion = readNonEmptyString(raw, "contentVersion", "root", issues);
  const status = readEnum(raw, "status", KNOWLEDGE_PACK_STATUSES, "root", issues);
  const verificationStatus = readEnum(raw, "verificationStatus", VERIFICATION_STATUSES, "root", issues);
  const sources = readObjectArray(raw.sources, "sources", issues, parseSource);
  const lastReviewedAt = readOptionalString(raw, "lastReviewedAt", "root", issues);
  const reviewedBy = readOptionalString(raw, "reviewedBy", "root", issues);
  const changelog = readObjectArray(raw.changelog, "changelog", issues, parseChangelogEntry);

  const curriculumAlignment =
    raw.curriculumAlignment === undefined
      ? undefined
      : readObjectArray(raw.curriculumAlignment, "curriculumAlignment", issues, parseCurriculumAlignment);
  const learningOutcomes = readObjectArray(raw.learningOutcomes, "learningOutcomes", issues, parseLearningOutcome);

  const prerequisiteKnowledge = readOptionalStringArray(raw, "prerequisiteKnowledge", "root", issues);
  const keyConcepts = readObjectArray(raw.keyConcepts, "keyConcepts", issues, parseKeyConceptOrVocabulary);
  const commonMisconceptions = readObjectArray(raw.commonMisconceptions, "commonMisconceptions", issues, parseMisconception);
  const teachingApproaches = readOptionalStringArray(raw, "teachingApproaches", "root", issues);
  const realWorldConnections = readOptionalStringArray(raw, "realWorldConnections", "root", issues);
  const differentiationNotes = readOptionalString(raw, "differentiationNotes", "root", issues);
  const vocabulary =
    raw.vocabulary === undefined ? undefined : readObjectArray(raw.vocabulary, "vocabulary", issues, parseKeyConceptOrVocabulary);
  const sampleQuestionSeeds = readOptionalStringArray(raw, "sampleQuestionSeeds", "root", issues);
  const crossCurricularLinks = readOptionalStringArray(raw, "crossCurricularLinks", "root", issues);

  const assessableSkills = readStringArray(raw, "assessableSkills", "root", issues);
  const questionPatterns = readObjectArray(raw.questionPatterns, "questionPatterns", issues, parseQuestionPattern);
  const difficultyRules = parseDifficultyRules(raw.difficultyRules, "difficultyRules", issues);
  const forbiddenPatterns = readStringArray(raw, "forbiddenPatterns", "root", issues);
  const criticalReviewRules = readObjectArray(raw.criticalReviewRules, "criticalReviewRules", issues, parseCriticalReviewRule);

  if (
    !id ||
    !slug ||
    !subject ||
    !gradeLevel ||
    !topic ||
    !aliases ||
    !curriculumKeywords ||
    !packSchemaVersion ||
    !contentVersion ||
    !status ||
    !verificationStatus ||
    !sources ||
    !changelog ||
    !learningOutcomes ||
    !keyConcepts ||
    !commonMisconceptions ||
    !assessableSkills ||
    !questionPatterns ||
    !difficultyRules ||
    !forbiddenPatterns ||
    !criticalReviewRules
  ) {
    return { success: false, issues };
  }

  const data: KnowledgePack = {
    id,
    slug,
    subject,
    gradeLevel,
    topic,
    unit,
    aliases,
    curriculumKeywords,
    curriculumYear,
    packSchemaVersion,
    contentVersion,
    status,
    verificationStatus,
    sources,
    lastReviewedAt,
    reviewedBy,
    changelog,
    curriculumAlignment,
    learningOutcomes,
    prerequisiteKnowledge,
    keyConcepts,
    commonMisconceptions,
    teachingApproaches,
    realWorldConnections,
    differentiationNotes,
    vocabulary,
    sampleQuestionSeeds,
    crossCurricularLinks,
    assessableSkills,
    questionPatterns,
    difficultyRules,
    forbiddenPatterns,
    criticalReviewRules,
  };

  return { success: true, issues: [], data };
}
