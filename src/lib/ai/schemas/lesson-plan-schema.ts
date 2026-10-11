import { lessonPlanSectionOrder } from "@/lib/lesson-planner/five-e";
import { EDUPILOT_SPARK_MARKER } from "@/lib/lesson-planner/teaching-library";
import { TYMM_SKILL_GROUP_ORDER, TYMM_SKILL_GROUPS } from "@/lib/lesson-planner/tymm-skills";
import type {
  LessonPlan,
  LessonPlanModel,
  LessonPlanSection,
  LessonPlanSectionKey,
  LessonPlanSkills,
} from "@/types/lesson-planner";

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
    key: "girme",
    semanticName: "engage",
    label: "Girme (Merak uyandırma)",
    description: "Ön bilgiyi yoklayan, merak uyandıran gerçek yaşam sorusu veya durum; öğrencinin kendi tahminini söylemesi.",
  },
  {
    key: "kesfetme",
    semanticName: "explore",
    label: "Keşfetme (Deneyimleme)",
    description: "Öğrencilerin küçük gruplarla/sıra arkadaşıyla doğrudan deneyimlediği, veri topladığı etkinlik; öğretmen henüz kavramı açıklamaz.",
  },
  {
    key: "aciklama",
    semanticName: "explain",
    label: "Açıklama (Kavram oluşturma)",
    description: "Öğrencilerin keşif bulgularından yola çıkılarak kavramın birlikte oluşturulması; öğretmen kavramı ve terimleri netleştirir.",
  },
  {
    key: "derinlestirme",
    semanticName: "elaborate",
    label: "Derinleştirme (Transfer ve uygulama)",
    description: "Kavramın yeni bir bağlama aktarıldığı uygulama veya problem durumu.",
  },
  {
    key: "degerlendirme",
    semanticName: "evaluate",
    label: "Değerlendirme (Süreç odaklı ölçme)",
    description: "Süreç boyunca gözlem ölçütleri ve zorunlu çıkış bileti (exit ticket) yönergesi.",
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

export function lessonPlanSectionMeta(key: LessonPlanSectionKey): LessonPlanSectionMeta {
  const meta = LESSON_PLAN_SECTION_METADATA.find((item) => item.key === key);
  if (!meta) throw new Error(`Bölüm meta verisi bulunamadı: ${key}`);
  return meta;
}

/** Değerlendirme aşamasında çıkış biletinin yer aldığını gösteren ifadeler. */
const EXIT_TICKET_PATTERN = /çıkış bilet|exit ticket/i;

/** Her beceri grubunda tutulacak etiket sayısı. */
export const SKILLS_PER_GROUP = { min: 1, max: 4 } as const;

/**
 * OpenAI Responses API `json_schema` (strict) biçimi. Model yalnızca bölüm
 * metinlerini ve beceri etiketlerini yazar; id, ders bilgisi ve süre
 * aralıkları servis tarafından koddan eklenir.
 */
export function buildLessonPlanJsonSchema(model: LessonPlanModel) {
  const skillProperties = Object.fromEntries(
    TYMM_SKILL_GROUP_ORDER.map((group) => [
      group,
      { type: "array", items: { type: "string", enum: [...TYMM_SKILL_GROUPS[group]] } },
    ])
  );
  return {
    type: "object",
    additionalProperties: false,
    required: ["sections", "skills"],
    properties: {
      sections: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          required: ["key", "content"],
          properties: {
            key: { type: "string", enum: [...lessonPlanSectionOrder(model)] },
            content: { type: "string" },
          },
        },
      },
      skills: {
        type: "object",
        additionalProperties: false,
        required: [...TYMM_SKILL_GROUP_ORDER],
        properties: skillProperties,
      },
    },
  };
}

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
  requiredKeys: readonly LessonPlanSectionKey[],
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
    if (typeof key !== "string" || !requiredKeys.includes(key as LessonPlanSectionKey)) {
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

  const missingKeys = requiredKeys.filter((key) => !seenKeys.has(key));
  missingKeys.forEach((key) => {
    issues.push({ path: "sections", message: `Zorunlu bölüm eksik: ${key}` });
  });

  outerIssues.push(...issues);
  if (issues.length > 0) return undefined;
  // Bölümleri her zaman şablon sırasına diz; model sırayı karıştırsa da plan akışı bozulmaz.
  return [...sections].sort((a, b) => requiredKeys.indexOf(a.key) - requiredKeys.indexOf(b.key));
}

function readSkills(value: unknown, issues: LessonPlanValidationIssue[]): LessonPlanSkills | undefined {
  if (!isRecord(value)) {
    issues.push({ path: "skills", message: `"skills" bir JSON nesnesi olmalıdır.` });
    return undefined;
  }
  const skills = {} as LessonPlanSkills;
  let valid = true;
  for (const group of TYMM_SKILL_GROUP_ORDER) {
    const list = value[group];
    const allowed: readonly string[] = TYMM_SKILL_GROUPS[group];
    if (!Array.isArray(list) || list.some((item) => typeof item !== "string" || !allowed.includes(item))) {
      issues.push({ path: `skills.${group}`, message: `"skills.${group}" yalnızca izinli TYMM etiketlerinden oluşmalıdır.` });
      valid = false;
      continue;
    }
    const unique = [...new Set(list as string[])];
    if (unique.length < SKILLS_PER_GROUP.min) {
      issues.push({ path: `skills.${group}`, message: `"skills.${group}" en az ${SKILLS_PER_GROUP.min} etiket içermelidir.` });
      valid = false;
      continue;
    }
    skills[group] = unique.slice(0, SKILLS_PER_GROUP.max);
  }
  return valid ? skills : undefined;
}

export interface LessonPlanBodyValidation {
  sections?: LessonPlanSection[];
  skills?: LessonPlanSkills;
  issues: LessonPlanValidationIssue[];
}

/**
 * Modelin ürettiği gövdeyi (bölümler + beceriler) seçilen ders modeline göre
 * doğrular. 5E'de klasik Giriş/Gelişme/Sonuç kabul edilmez ve Değerlendirme
 * aşamasında çıkış bileti yönergesi zorunludur.
 */
export function validateLessonPlanBody(value: unknown, model: LessonPlanModel): LessonPlanBodyValidation {
  const issues: LessonPlanValidationIssue[] = [];
  if (!isRecord(value)) {
    return { issues: [{ path: "root", message: "Yanıt bir JSON nesnesi olmalıdır." }] };
  }
  const sections = readSections(value.sections, lessonPlanSectionOrder(model), issues);
  const skills = readSkills(value.skills, issues);
  if (sections && model === "5e") {
    const evaluate = sections.find((section) => section.key === "degerlendirme");
    if (evaluate && !EXIT_TICKET_PATTERN.test(evaluate.content)) {
      issues.push({ path: "sections.degerlendirme", message: "Değerlendirme aşamasında çıkış bileti yönergesi zorunludur." });
    }
  }
  if (sections) {
    const sparkKey = model === "5e" ? "kesfetme" : "gelisme";
    const spark = sections.find((section) => section.key === sparkKey);
    if (spark && !spark.content.includes(EDUPILOT_SPARK_MARKER)) {
      issues.push({
        path: `sections.${sparkKey}`,
        message: `"${sparkKey}" bölümünde "${EDUPILOT_SPARK_MARKER}" ile başlayan tam etkinlik zorunludur.`,
      });
    }
  }
  return issues.length === 0 ? { sections, skills, issues } : { issues };
}

/**
 * Runtime validator for a future AI response. Keeps parsing safe by
 * rejecting missing sections and wrong field types before the payload is
 * ever trusted as a `LessonPlan`. Written by hand (no schema library) since
 * the project has no validation dependency yet — see docs/roadmap.md for
 * the note on introducing one if/when a real AI provider is wired up.
 */
export function validateLessonPlanResponse(
  value: unknown,
  model: LessonPlanModel = "klasik"
): LessonPlanValidationResult {
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
  const sections = readSections(value.sections, lessonPlanSectionOrder(model), issues);

  if (!id || !subject || !gradeLevel || !topic || !generatedAt || !duration || !sections) {
    return { success: false, issues };
  }

  return {
    success: true,
    issues: [],
    data: { id, subject, gradeLevel, topic, duration, generatedAt, sections },
  };
}
