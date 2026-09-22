import { COGNITIVE_LEVELS, QUESTION_APPROACHES, QUESTION_TYPES, VISUAL_TYPES } from "@/types/quiz-generator";
import type { KnowledgePack, KnowledgePackIssue, KnowledgePackQuestionPattern } from "@/types/knowledge-pack";

const SLOT_VISUAL_TYPES: readonly string[] = [...VISUAL_TYPES, "none"];

const SEMVER_PATTERN = /^\d+\.\d+\.\d+(?:-[0-9A-Za-z-.]+)?$/;
const ISO_DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

const DAYS_IN_MONTH = [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

function isValidSemVer(value: string): boolean {
  return SEMVER_PATTERN.test(value);
}

function isValidIsoDate(value: string): boolean {
  const match = ISO_DATE_PATTERN.exec(value);
  if (!match) return false;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (month < 1 || month > 12) return false;
  const isLeapYear = (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
  const maxDay = month === 2 && !isLeapYear ? 28 : DAYS_IN_MONTH[month - 1];
  return day >= 1 && day <= maxDay;
}

function checkVersionFormat(version: string, path: string, issues: KnowledgePackIssue[]): void {
  if (!isValidSemVer(version)) {
    issues.push({ path, message: `"${version}" geçerli bir Anlamsal Sürüm (SemVer, örn. 1.0.0) değil.` });
  }
}

function checkDateFormat(date: string, path: string, issues: KnowledgePackIssue[]): void {
  if (!isValidIsoDate(date)) {
    issues.push({ path, message: `"${date}" geçerli bir ISO 8601 tarihi (YYYY-MM-DD) değil.` });
  }
}

function validateQuestionPattern(
  pattern: KnowledgePackQuestionPattern,
  path: string,
  misconceptionIds: ReadonlySet<string>,
  issues: KnowledgePackIssue[]
): void {
  if (pattern.suitableCognitiveLevels.length === 0) {
    issues.push({ path: `${path}.suitableCognitiveLevels`, message: '"suitableCognitiveLevels" en az bir değer içermelidir.' });
  }
  pattern.suitableCognitiveLevels.forEach((level, index) => {
    if (!(COGNITIVE_LEVELS as readonly string[]).includes(level)) {
      issues.push({
        path: `${path}.suitableCognitiveLevels[${index}]`,
        message: `Geçersiz bilişsel düzey: "${level}".`,
      });
    }
  });

  if (pattern.suitableApproaches.length === 0) {
    issues.push({ path: `${path}.suitableApproaches`, message: '"suitableApproaches" en az bir değer içermelidir.' });
  }
  pattern.suitableApproaches.forEach((approach, index) => {
    if (!(QUESTION_APPROACHES as readonly string[]).includes(approach)) {
      issues.push({
        path: `${path}.suitableApproaches[${index}]`,
        message: `Geçersiz soru yaklaşımı: "${approach}".`,
      });
    }
  });

  if (pattern.suitableQuestionTypes !== undefined) {
    if (pattern.suitableQuestionTypes.length === 0) {
      issues.push({
        path: `${path}.suitableQuestionTypes`,
        message: '"suitableQuestionTypes" belirtilirse en az bir değer içermelidir.',
      });
    }
    pattern.suitableQuestionTypes.forEach((type, index) => {
      if (!(QUESTION_TYPES as readonly string[]).includes(type)) {
        issues.push({
          path: `${path}.suitableQuestionTypes[${index}]`,
          message: `Geçersiz soru türü: "${type}".`,
        });
      }
    });
  }

  pattern.recommendedVisuals.forEach((visual, index) => {
    if (!SLOT_VISUAL_TYPES.includes(visual)) {
      issues.push({
        path: `${path}.recommendedVisuals[${index}]`,
        message: `Geçersiz görsel türü: "${visual}".`,
      });
    }
  });

  if (pattern.requiredInformation.length === 0) {
    issues.push({ path: `${path}.requiredInformation`, message: '"requiredInformation" en az bir öğe içermelidir.' });
  }
  if (pattern.reasoningSteps.length === 0) {
    issues.push({ path: `${path}.reasoningSteps`, message: '"reasoningSteps" en az bir öğe içermelidir.' });
  }

  pattern.targetedMisconceptionIds.forEach((id, index) => {
    if (!misconceptionIds.has(id)) {
      issues.push({
        path: `${path}.targetedMisconceptionIds[${index}]`,
        message: `"${id}" pakette tanımlı bir "commonMisconceptions" id'si değil.`,
      });
    }
  });
}

/**
 * Governance gate: an `active` pack must be backed by verified, reviewed,
 * dated content — draft/deprecated/archived packs are exempt (a draft is
 * allowed to be a work in progress).
 */
function validateActiveGovernance(pack: KnowledgePack, issues: KnowledgePackIssue[]): void {
  if (pack.status !== "active") return;

  if (pack.verificationStatus !== "verified") {
    issues.push({ path: "verificationStatus", message: 'Aktif bir paket "verified" doğrulama durumuna sahip olmalıdır.' });
  }
  if (pack.sources.length === 0) {
    issues.push({ path: "sources", message: "Aktif bir paket en az bir kaynak içermelidir." });
  }
  if (!pack.reviewedBy) {
    issues.push({ path: "reviewedBy", message: "Aktif bir paket için incelemeyi yapan kişi belirtilmelidir." });
  }
  if (!pack.lastReviewedAt) {
    issues.push({ path: "lastReviewedAt", message: "Aktif bir paket için son inceleme tarihi belirtilmelidir." });
  }
  if (pack.changelog.length === 0) {
    issues.push({ path: "changelog", message: "Aktif bir paket en az bir değişiklik kaydı içermelidir." });
  }
  if (pack.learningOutcomes.length === 0) {
    issues.push({ path: "learningOutcomes", message: "Aktif bir paket en az bir öğrenme çıktısı içermelidir." });
  }
  if (pack.assessableSkills.length === 0) {
    issues.push({ path: "assessableSkills", message: "Aktif bir paket en az bir ölçülebilir beceri içermelidir." });
  }
  if (pack.questionPatterns.length === 0) {
    issues.push({ path: "questionPatterns", message: "Aktif bir paket en az bir soru deseni içermelidir." });
  }
  if (pack.criticalReviewRules.length === 0) {
    issues.push({ path: "criticalReviewRules", message: "Aktif bir paket en az bir kritik inceleme kuralı içermelidir." });
  }
}

/**
 * Single-pack semantic validation: content that cannot be meaningfully
 * empty, cross-references within the pack, domain membership for the
 * fields the structural parser deliberately left untyped, version/date
 * format, and status-conditioned governance. Cross-pack rules (duplicate
 * ids, alias collisions, etc.) live in the registry, not here.
 */
export function validateKnowledgePackSemantics(pack: KnowledgePack): KnowledgePackIssue[] {
  const issues: KnowledgePackIssue[] = [];

  if (pack.keyConcepts.length === 0) {
    issues.push({ path: "keyConcepts", message: '"keyConcepts" en az bir öğe içermelidir.' });
  }
  if (pack.commonMisconceptions.length === 0) {
    issues.push({ path: "commonMisconceptions", message: '"commonMisconceptions" en az bir öğe içermelidir.' });
  }
  if (pack.difficultyRules.allowedLevels.length === 0) {
    issues.push({ path: "difficultyRules.allowedLevels", message: '"allowedLevels" en az bir değer içermelidir.' });
  }

  const seenAliases = new Set<string>();
  pack.aliases.forEach((alias, index) => {
    if (seenAliases.has(alias)) {
      issues.push({ path: `aliases[${index}]`, message: `Paket içinde tekrarlanan alias: "${alias}".` });
    }
    seenAliases.add(alias);
  });

  const misconceptionIds = new Set(pack.commonMisconceptions.map((m) => m.id));
  const seenMisconceptionIds = new Set<string>();
  pack.commonMisconceptions.forEach((misconception, index) => {
    if (seenMisconceptionIds.has(misconception.id)) {
      issues.push({ path: `commonMisconceptions[${index}].id`, message: `Tekrarlanan misconception id: "${misconception.id}".` });
    }
    seenMisconceptionIds.add(misconception.id);
  });

  const seenPatternIds = new Set<string>();
  pack.questionPatterns.forEach((pattern, index) => {
    if (seenPatternIds.has(pattern.id)) {
      issues.push({ path: `questionPatterns[${index}].id`, message: `Tekrarlanan question pattern id: "${pattern.id}".` });
    }
    seenPatternIds.add(pattern.id);
    validateQuestionPattern(pattern, `questionPatterns[${index}]`, misconceptionIds, issues);
  });

  checkVersionFormat(pack.packSchemaVersion, "packSchemaVersion", issues);
  checkVersionFormat(pack.contentVersion, "contentVersion", issues);
  pack.changelog.forEach((entry, index) => {
    checkVersionFormat(entry.version, `changelog[${index}].version`, issues);
    checkDateFormat(entry.date, `changelog[${index}].date`, issues);
  });
  if (pack.lastReviewedAt) {
    checkDateFormat(pack.lastReviewedAt, "lastReviewedAt", issues);
  }
  pack.sources.forEach((source, index) => {
    if (source.accessDate) {
      checkDateFormat(source.accessDate, `sources[${index}].accessDate`, issues);
    }
  });

  if (pack.status !== "draft" && pack.changelog.length === 0) {
    issues.push({
      path: "changelog",
      message: `"${pack.status}" durumundaki bir paket, durum değişikliğini kaydeden en az bir "changelog" girdisi içermelidir.`,
    });
  }

  validateActiveGovernance(pack, issues);

  return issues;
}
