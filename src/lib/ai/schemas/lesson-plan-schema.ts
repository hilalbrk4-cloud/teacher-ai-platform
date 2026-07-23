import { LESSON_PLAN_SECTION_ORDER } from "@/types/lesson-planner";
import type { LessonPlan, LessonPlanSection, LessonPlanSectionKey } from "@/types/lesson-planner";

/**
 * Machine-readable description of every Lesson Planner section. This is the
 * single source of truth for section keys — the Prompt Builder uses it to
 * tell the AI model exactly which JSON keys to return, and the validator
 * below uses it to check that a response actually contains them. Nothing
 * else in the codebase should redeclare this list independently.
 *
 * `semanticName` documents the English meaning of each key for developers;
 * `key` is the literal property name the AI response (and the existing
 * `LessonPlan` type) must use — it intentionally matches the internal
 * `LessonPlanSectionKey` union already consumed by the Lesson Planner UI.
 */
export interface LessonPlanSectionMeta {
  key: LessonPlanSectionKey;
  semanticName: string;
  label: string;
  description: string;
}

export const LESSON_PLAN_SECTION_METADATA: readonly LessonPlanSectionMeta[] = [
  {
    key: "dersBilgileri",
    semanticName: "lessonInformation",
    label: "Ders bilgileri",
    description: "Dersin adı, sınıf düzeyi, konusu ve süresi gibi temel bilgiler.",
  },
  {
    key: "ogrenmeHedefleri",
    semanticName: "learningObjectives",
    label: "Öğrenme hedefleri",
    description: "Dersin sonunda öğrencilerin kazanması beklenen öğrenme hedefleri veya kazanımlar.",
  },
  {
    key: "gerekliMalzemeler",
    semanticName: "requiredMaterials",
    label: "Gerekli materyaller",
    description: "Ders için gereken materyal, araç ve kaynakların listesi.",
  },
  {
    key: "derseHazirlik",
    semanticName: "preparation",
    label: "Derse hazırlık",
    description: "Öğretmenin ders öncesinde yapması gereken hazırlıklar.",
  },
  {
    key: "giris",
    semanticName: "introduction",
    label: "Giriş",
    description: "Dersin giriş / ısınma bölümü.",
  },
  {
    key: "gelisme",
    semanticName: "development",
    label: "Gelişme",
    description: "Dersin ana etkinliklerinin yer aldığı gelişme bölümü.",
  },
  {
    key: "sonuc",
    semanticName: "conclusion",
    label: "Sonuç",
    description: "Dersin kapanış ve özetleme bölümü.",
  },
  {
    key: "olcmeDegerlendirme",
    semanticName: "assessment",
    label: "Ölçme ve değerlendirme",
    description: "Öğrenmenin nasıl ölçüleceğine dair değerlendirme yöntemi.",
  },
  {
    key: "farklilastirma",
    semanticName: "differentiation",
    label: "Farklılaştırma ve uyarlamalar",
    description: "Farklı öğrenme ihtiyaçlarına veya kaynaştırma öğrencilerine yönelik somut uyarlamalar.",
  },
  {
    key: "ogretmenNotlari",
    semanticName: "teacherNotes",
    label: "Öğretmen notları",
    description: "Öğretmen için ek notlar, hatırlatmalar veya süre yönetimi ipuçları.",
  },
];

const REQUIRED_KEYS: readonly LessonPlanSectionKey[] = LESSON_PLAN_SECTION_ORDER;

export interface LessonPlanValidationIssue {
  path: string;
  message: string;
}

export type LessonPlanValidationResult =
  | { success: true; data: LessonPlan; issues: [] }
  | { success: false; data?: undefined; issues: LessonPlanValidationIssue[] };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readNonEmptyString(
  record: Record<string, unknown>,
  field: string,
  issues: LessonPlanValidationIssue[]
): string | undefined {
  const value = record[field];
  if (typeof value !== "string" || value.trim().length === 0) {
    issues.push({ path: field, message: `"${field}" boş olmayan bir metin (string) olmalıdır.` });
    return undefined;
  }
  return value;
}

function readPositiveNumber(
  record: Record<string, unknown>,
  field: string,
  issues: LessonPlanValidationIssue[]
): number | undefined {
  const value = record[field];
  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) {
    issues.push({ path: field, message: `"${field}" pozitif bir sayı olmalıdır.` });
    return undefined;
  }
  return value;
}

function readSections(
  value: unknown,
  outerIssues: LessonPlanValidationIssue[]
): LessonPlanSection[] | undefined {
  const issues: LessonPlanValidationIssue[] = [];

  if (!Array.isArray(value)) {
    issues.push({ path: "sections", message: `"sections" bir dizi (array) olmalıdır.` });
    outerIssues.push(...issues);
    return undefined;
  }

  const seenKeys = new Set<LessonPlanSectionKey>();
  const sections: LessonPlanSection[] = [];

  value.forEach((item, index) => {
    if (!isRecord(item)) {
      issues.push({ path: `sections[${index}]`, message: "Her bölüm bir JSON nesnesi olmalıdır." });
      return;
    }

    const key = item.key;
    if (typeof key !== "string" || !REQUIRED_KEYS.includes(key as LessonPlanSectionKey)) {
      issues.push({
        path: `sections[${index}].key`,
        message: `Geçersiz veya beklenmeyen bölüm anahtarı: ${String(key)}`,
      });
      return;
    }

    const typedKey = key as LessonPlanSectionKey;
    if (seenKeys.has(typedKey)) {
      issues.push({ path: `sections[${index}].key`, message: `Bölüm anahtarı tekrarlanmış: ${typedKey}` });
      return;
    }

    const content = item.content;
    if (typeof content !== "string" || content.trim().length === 0) {
      issues.push({
        path: `sections[${index}].content`,
        message: `"${typedKey}" bölümünün içeriği boş olmayan bir metin olmalıdır.`,
      });
      return;
    }

    seenKeys.add(typedKey);
    sections.push({ key: typedKey, content });
  });

  const missingKeys = REQUIRED_KEYS.filter((key) => !seenKeys.has(key));
  missingKeys.forEach((key) => {
    issues.push({ path: "sections", message: `Zorunlu bölüm eksik: ${key}` });
  });

  outerIssues.push(...issues);
  return issues.length === 0 ? sections : undefined;
}

/**
 * Runtime validator for a future AI response. Keeps parsing safe by
 * rejecting missing sections and wrong field types before the payload is
 * ever trusted as a `LessonPlan`. Written by hand (no schema library) since
 * the project has no validation dependency yet — see docs/roadmap.md for
 * the note on introducing one if/when a real AI provider is wired up.
 */
export function validateLessonPlanResponse(value: unknown): LessonPlanValidationResult {
  const issues: LessonPlanValidationIssue[] = [];

  if (!isRecord(value)) {
    return { success: false, issues: [{ path: "root", message: "Yanıt bir JSON nesnesi olmalıdır." }] };
  }

  const id = readNonEmptyString(value, "id", issues);
  const subject = readNonEmptyString(value, "subject", issues);
  const gradeLevel = readNonEmptyString(value, "gradeLevel", issues);
  const topic = readNonEmptyString(value, "topic", issues);
  const generatedAt = readNonEmptyString(value, "generatedAt", issues);
  const duration = readPositiveNumber(value, "duration", issues);
  const sections = readSections(value.sections, issues);

  if (!id || !subject || !gradeLevel || !topic || !generatedAt || !duration || !sections) {
    return { success: false, issues };
  }

  return {
    success: true,
    issues: [],
    data: { id, subject, gradeLevel, topic, duration, generatedAt, sections },
  };
}
