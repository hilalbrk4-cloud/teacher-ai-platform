import type {
  CognitiveLevel,
  DifficultyLevel,
  QuestionApproach,
  QuestionType,
  SlotVisualType,
} from "@/types/quiz-generator";

/**
 * Stable, machine-readable subject keys. Deliberately decoupled from the
 * Turkish display text (see SUBJECT_LABELS) and from the free-text
 * `subject: string` used today by QuizFormInput / LessonPlanFormInput —
 * those teacher-facing forms are out of scope for this infrastructure and
 * are not modified here.
 */
export const SUBJECT_KEYS = [
  "matematik",
  "fen-bilimleri",
  "turkce",
  "ingilizce",
  "sosyal-bilgiler",
] as const;

export type SubjectKey = (typeof SUBJECT_KEYS)[number];

export const SUBJECT_LABELS: Record<SubjectKey, string> = {
  matematik: "Matematik",
  "fen-bilimleri": "Fen Bilimleri",
  turkce: "Türkçe",
  ingilizce: "İngilizce",
  "sosyal-bilgiler": "Sosyal Bilgiler",
};

export const KNOWLEDGE_PACK_STATUSES = ["draft", "active", "deprecated", "archived"] as const;
export type KnowledgePackStatus = (typeof KNOWLEDGE_PACK_STATUSES)[number];

export const VERIFICATION_STATUSES = ["unverified", "needsReview", "verified"] as const;
export type VerificationStatus = (typeof VERIFICATION_STATUSES)[number];

export const SOURCE_TYPES = ["mebCurriculum", "textbook", "academicReference", "internalReview", "other"] as const;
export type SourceType = (typeof SOURCE_TYPES)[number];

export const CONSISTENCY_ISSUE_TYPES = [
  "duplicateSlugInSubjectGrade",
  "duplicateAlias",
  "aliasSlugCollision",
  "duplicateIdContentVersion",
  "multipleActiveVersions",
] as const;
export type RegistryConsistencyIssueType = (typeof CONSISTENCY_ISSUE_TYPES)[number];

/** A verifiable citation backing a pack's content. Never a fabricated reference. */
export interface KnowledgePackSource {
  id: string;
  sourceType: SourceType;
  title: string;
  publisher?: string;
  reference?: string;
  /** ISO 8601 date (YYYY-MM-DD). */
  accessDate?: string;
}

export interface KnowledgePackChangelogEntry {
  /** SemVer, matches the `contentVersion` this entry describes. */
  version: string;
  /** ISO 8601 date (YYYY-MM-DD). */
  date: string;
  author: string;
  summary: string;
}

export interface KnowledgePackMisconception {
  id: string;
  description: string;
  correction: string;
}

export interface KnowledgePackLearningOutcome {
  id: string;
  statement: string;
  cognitiveLevel: CognitiveLevel;
  difficulty: DifficultyLevel;
}

/**
 * A reusable question-design pattern for this topic. `targetedMisconceptionIds`
 * must reference `KnowledgePackMisconception.id` values declared on the same
 * pack — the semantic validator rejects dangling references.
 */
export interface KnowledgePackQuestionPattern {
  id: string;
  name: string;
  suitableCognitiveLevels: CognitiveLevel[];
  suitableApproaches: QuestionApproach[];
  suitableQuestionTypes?: QuestionType[];
  description: string;
  requiredInformation: string[];
  reasoningSteps: string[];
  recommendedVisuals: SlotVisualType[];
  avoid: string[];
  targetedMisconceptionIds: string[];
  exampleStem?: string;
}

export interface KnowledgePackDifficultyRules {
  allowedLevels: DifficultyLevel[];
  progressionNotes: string;
}

export interface KnowledgePackCriticalReviewRule {
  id: string;
  rule: string;
  severity: "blocking" | "warning";
}

export interface KnowledgePackCurriculumAlignment {
  code: string;
  description: string;
}

export interface KnowledgePackVocabularyEntry {
  term: string;
  definition: string;
}

export interface KnowledgePackKeyConcept {
  term: string;
  definition: string;
}

/**
 * The complete Subject Knowledge Pack. `id` is the permanent topic identity;
 * `contentVersion` is a SemVer content revision. Uniqueness is the pair
 * (id, contentVersion) — see the registry for how version history and the
 * single-active-version rule are enforced.
 */
export interface KnowledgePack {
  // Identity
  id: string;
  slug: string;
  subject: SubjectKey;
  gradeLevel: string;
  topic: string;
  unit?: string;
  aliases: string[];
  curriculumKeywords: string[];
  curriculumYear?: string;
  /** SemVer. Which shape of this schema the pack conforms to. */
  packSchemaVersion: string;
  /** SemVer. Content revision, independent of packSchemaVersion and app releases. */
  contentVersion: string;
  status: KnowledgePackStatus;
  verificationStatus: VerificationStatus;
  sources: KnowledgePackSource[];
  /** ISO 8601 date (YYYY-MM-DD). */
  lastReviewedAt?: string;
  reviewedBy?: string;
  changelog: KnowledgePackChangelogEntry[];

  // Curriculum facts
  curriculumAlignment?: KnowledgePackCurriculumAlignment[];
  learningOutcomes: KnowledgePackLearningOutcome[];

  // Pedagogical guidance
  prerequisiteKnowledge?: string[];
  keyConcepts: KnowledgePackKeyConcept[];
  commonMisconceptions: KnowledgePackMisconception[];
  teachingApproaches?: string[];
  realWorldConnections?: string[];
  differentiationNotes?: string;
  vocabulary?: KnowledgePackVocabularyEntry[];
  /** Illustrative patterns only — never to be reproduced verbatim in output. */
  sampleQuestionSeeds?: string[];
  crossCurricularLinks?: string[];

  // Governance-critical
  assessableSkills: string[];
  questionPatterns: KnowledgePackQuestionPattern[];
  difficultyRules: KnowledgePackDifficultyRules;
  forbiddenPatterns: string[];
  criticalReviewRules: KnowledgePackCriticalReviewRule[];
}

/** A single structural or semantic validation failure. */
export interface KnowledgePackIssue {
  path: string;
  message: string;
}

/** The minimal identity fields the registry needs to route a pack to a query, salvaged independently of full structural validity. */
export interface KnowledgePackIdentity {
  id?: string;
  slug?: string;
  subject?: string;
  gradeLevel?: string;
  aliases?: string[];
  contentVersion?: string;
  status?: string;
}

export type KnowledgePackIdentityResult =
  | { success: true; identity: Required<Pick<KnowledgePackIdentity, "id" | "slug" | "subject" | "gradeLevel">> & KnowledgePackIdentity }
  | { success: false; identity: KnowledgePackIdentity; issues: KnowledgePackIssue[] };

export type KnowledgePackParseResult =
  | { success: true; data: KnowledgePack; issues: [] }
  | { success: false; data?: undefined; issues: KnowledgePackIssue[] };

// ---------------------------------------------------------------------------
// Resolution contract
// ---------------------------------------------------------------------------

export interface KnowledgePackResolutionQuery {
  subject: SubjectKey;
  gradeLevel: string;
  slugOrAlias: string;
}

export type KnowledgePackResolutionResult =
  | { status: "resolved"; pack: KnowledgePack }
  | { status: "notFound"; query: KnowledgePackResolutionQuery }
  | { status: "invalid"; query: KnowledgePackResolutionQuery; issues: KnowledgePackIssue[] }
  | { status: "inactive"; query: KnowledgePackResolutionQuery; pack: KnowledgePack }
  | {
      status: "ambiguous";
      query: KnowledgePackResolutionQuery;
      candidates: { id: string; slug: string; contentVersion: string; status: KnowledgePackStatus }[];
    };

// ---------------------------------------------------------------------------
// Registry diagnostics contract
// ---------------------------------------------------------------------------

export interface RegistryDiagnosticEntry {
  /** Array index (or caller-supplied label) identifying the raw input, for traceability. */
  sourceRef: string;
  extractedIdentity?: KnowledgePackIdentity;
  reason: "structuralInvalid" | "semanticInvalid" | "identityUnrecoverable";
  issues: KnowledgePackIssue[];
}

export interface RegistryConsistencyIssue {
  type: RegistryConsistencyIssueType;
  subject?: string;
  gradeLevel?: string;
  /** The normalized slug/alias/id involved in the collision. */
  identifier?: string;
  affectedPackRefs: string[];
  message: string;
}

export interface RegistryDiagnostics {
  excluded: RegistryDiagnosticEntry[];
  consistencyIssues: RegistryConsistencyIssue[];
}

// ---------------------------------------------------------------------------
// Feature projections
// ---------------------------------------------------------------------------

/** Token-conscious projection for the Quiz Generator Prompt Builder. */
export interface QuizGeneratorPackProjection {
  id: string;
  topic: string;
  learningOutcomes: KnowledgePackLearningOutcome[];
  assessableSkills: string[];
  questionPatterns: KnowledgePackQuestionPattern[];
  difficultyRules: KnowledgePackDifficultyRules;
  commonMisconceptions: KnowledgePackMisconception[];
  forbiddenPatterns: string[];
}

/** Token-conscious projection for the Lesson Planner Prompt Builder. */
export interface LessonPlannerPackProjection {
  id: string;
  topic: string;
  learningOutcomes: KnowledgePackLearningOutcome[];
  prerequisiteKnowledge?: string[];
  keyConcepts: KnowledgePackKeyConcept[];
  teachingApproaches?: string[];
  realWorldConnections?: string[];
  differentiationNotes?: string;
  vocabulary?: KnowledgePackVocabularyEntry[];
}

/** Projection for the future AI Teacher Reviewer — grounds output verification, not generation. */
export interface TeacherReviewerPackProjection {
  id: string;
  topic: string;
  learningOutcomes: KnowledgePackLearningOutcome[];
  assessableSkills: string[];
  commonMisconceptions: KnowledgePackMisconception[];
  forbiddenPatterns: string[];
  criticalReviewRules: KnowledgePackCriticalReviewRule[];
  curriculumAlignment?: KnowledgePackCurriculumAlignment[];
  vocabulary?: KnowledgePackVocabularyEntry[];
}
