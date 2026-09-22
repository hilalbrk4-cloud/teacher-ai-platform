import { isDraftPreviewEnabled } from "@/lib/knowledge/config";
import type { KnowledgePackRegistry } from "@/lib/knowledge/registry/knowledge-pack-registry";
import {
  SUBJECT_KEYS,
  type KnowledgePack,
  type KnowledgePackIssue,
  type KnowledgePackResolutionQuery,
  type KnowledgePackStatus,
  type SubjectKey,
  type VerificationStatus,
} from "@/types/knowledge-pack";
import type { QuizBlueprint } from "@/types/quiz-blueprint";

/**
 * Minimum free-text → SubjectKey mapping. Deliberately simple keyword
 * matching, mirroring the style already used by `isMathSubject` /
 * `isScienceSubject` in the Quiz Blueprint builder — good enough for
 * routing to a pack, not a general NLP subject classifier.
 */
const SUBJECT_KEYWORDS: Record<SubjectKey, string[]> = {
  matematik: ["matematik", "math"],
  "fen-bilimleri": ["fen bilimleri", "fen", "science", "biyoloji", "kimya", "fizik"],
  turkce: ["türkçe", "turkce", "turkish"],
  ingilizce: ["i̇ngilizce", "ingilizce", "english"],
  "sosyal-bilgiler": ["sosyal bilgiler", "sosyal", "social"],
};

function mapSubjectToKey(subject: string): SubjectKey | undefined {
  const normalized = subject.trim().toLocaleLowerCase("tr-TR");
  return SUBJECT_KEYS.find((key) => SUBJECT_KEYWORDS[key].some((keyword) => normalized.includes(keyword)));
}

function extractGradeDigits(gradeLevel: string): string | undefined {
  return gradeLevel.match(/\d+/)?.[0];
}

const TURKISH_ASCII_FOLD: Record<string, string> = {
  ç: "c",
  Ç: "C",
  ğ: "g",
  Ğ: "G",
  ı: "i",
  I: "i",
  İ: "i",
  ö: "o",
  Ö: "O",
  ş: "s",
  Ş: "S",
  ü: "u",
  Ü: "U",
};

/**
 * Folds Turkish letters to their nearest ASCII equivalent. Used only as a
 * one-time fallback retry when a topic typed with natural Turkish spelling
 * doesn't match a pack slug/alias authored in ASCII-transliterated form —
 * the registry's own normalization deliberately preserves Turkish letters,
 * so this fallback lives here, not in the registry.
 */
function foldTurkishToAscii(value: string): string {
  return value.replace(/[çÇğĞıIİöÖşŞüÜ]/g, (char) => TURKISH_ASCII_FOLD[char] ?? char);
}

export interface QuizPackMatchedMetadata {
  id: string;
  contentVersion: string;
  status: KnowledgePackStatus;
  verificationStatus: VerificationStatus;
}

export type QuizPackResolutionOutcome =
  | { mode: "resolvedVerified"; pack: KnowledgePack }
  | { mode: "resolvedDraftPreview"; pack: KnowledgePack }
  | { mode: "inactive"; query: KnowledgePackResolutionQuery; matched?: QuizPackMatchedMetadata }
  | { mode: "notFound"; query?: KnowledgePackResolutionQuery }
  | { mode: "invalid"; query: KnowledgePackResolutionQuery; issues: KnowledgePackIssue[] }
  | {
      mode: "ambiguous";
      query: KnowledgePackResolutionQuery;
      candidates: { id: string; slug: string; contentVersion: string; status: KnowledgePackStatus }[];
    };

/**
 * Bridges a `QuizBlueprint`'s free-text subject/gradeLevel/topic to the
 * Knowledge Pack registry, and layers a draft-preview decision on top of the
 * registry's plain "inactive" status. Never modifies or re-implements the
 * registry's own resolution/normalization — only supplies alternate input
 * strings to the same `resolve()` call.
 *
 * Draft preview activates only when the registry matched exactly one pack
 * (guaranteed by "inactive" never being returned for an ambiguous match),
 * that pack's status is literally "draft" (never deprecated/archived), its
 * verificationStatus is "needsReview", and `isDraftPreviewEnabled()` allows
 * it (which itself refuses unconditionally in production).
 */
export function resolveKnowledgePackForQuiz(
  blueprint: QuizBlueprint,
  registry: KnowledgePackRegistry
): QuizPackResolutionOutcome {
  const subject = mapSubjectToKey(blueprint.subject);
  const gradeLevel = extractGradeDigits(blueprint.gradeLevel);
  if (!subject || !gradeLevel) {
    return { mode: "notFound" };
  }

  const topic = blueprint.topic.trim();
  const firstAttempt = registry.resolve({ subject, gradeLevel, slugOrAlias: topic });
  const result =
    firstAttempt.status === "notFound"
      ? registry.resolve({ subject, gradeLevel, slugOrAlias: foldTurkishToAscii(topic) })
      : firstAttempt;

  switch (result.status) {
    case "resolved":
      return { mode: "resolvedVerified", pack: result.pack };

    case "inactive": {
      const matched: QuizPackMatchedMetadata = {
        id: result.pack.id,
        contentVersion: result.pack.contentVersion,
        status: result.pack.status,
        verificationStatus: result.pack.verificationStatus,
      };
      const canPreview =
        result.pack.status === "draft" && result.pack.verificationStatus === "needsReview" && isDraftPreviewEnabled();
      return canPreview
        ? { mode: "resolvedDraftPreview", pack: result.pack }
        : { mode: "inactive", query: result.query, matched };
    }

    case "invalid":
      return { mode: "invalid", query: result.query, issues: result.issues };

    case "ambiguous":
      return { mode: "ambiguous", query: result.query, candidates: result.candidates };

    case "notFound":
    default:
      return { mode: "notFound", query: result.query };
  }
}
