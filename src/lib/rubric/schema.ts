import { TYMM_SKILL_GROUPS } from "@/lib/lesson-planner/tymm-skills";
import { MAX_FULLY_COVERED_OUTCOMES, RUBRIC_CRITERIA_RANGE } from "@/lib/rubric/prompt";
import { holisticRanges, levelPoints, normalizeWeights, RUBRIC_TOTAL_POINTS } from "@/lib/rubric/scoring";
import type { RubricCriterion, RubricHolisticLevel, RubricPrompt } from "@/types/rubric";

/**
 * Kalite kontrolünde bozulan kural. Öğretmene ve konsola tam olarak hangi
 * kuralın geçmediği bildirilir (genel "geçemedi" mesajı yerine).
 */
export type RubricRule =
  | "json"
  | "bos_alan"
  | "kriter_sayisi"
  | "seviye"
  | "ogretmen_dili"
  | "ogrenci_dili"
  | "kod"
  | "kapsam"
  | "puan_toplami"
  | "butuncul";

export const RUBRIC_RULE_LABELS: Record<RubricRule, string> = {
  json: "JSON hatası",
  bos_alan: "Boş alan",
  kriter_sayisi: "Kriter sayısı",
  seviye: "Seviye tanımları",
  ogretmen_dili: "Öğretmen dili",
  ogrenci_dili: "Öğrenci dili",
  kod: "Geçersiz kod",
  kapsam: "Kazanım kapsamı",
  puan_toplami: "Puan toplamı",
  butuncul: "Bütüncül düzeyler",
};

export interface RubricValidationIssue {
  rule: RubricRule;
  path: string;
  message: string;
}

export interface RubricBody {
  taskTitle: string;
  teacherTaskSummary: string;
  studentTaskSummary: string;
  criteria: RubricCriterion[];
  holisticLevels: RubricHolisticLevel[];
}

const STRING = { type: "string" } as const;

/**
 * OpenAI `json_schema` (strict). Resmî kodlar enum ile sınırlıdır; müfredat
 * seçilmediyse `skillCodes` alanı şemada hiç yoktur (model kod yazamaz).
 */
export function buildRubricJsonSchema(prompt: RubricPrompt) {
  const criterionProperties: Record<string, unknown> = {
    weight: { type: "integer" },
    conceptualSkills: { type: "array", items: { type: "string", enum: [...TYMM_SKILL_GROUPS.conceptual] } },
    teacherCriterion: {
      type: "object",
      additionalProperties: false,
      required: ["title", "description", "levels"],
      properties: { title: STRING, description: STRING, levels: { type: "array", items: STRING } },
    },
    studentFriendlyCriterion: {
      type: "object",
      additionalProperties: false,
      required: ["question", "hint"],
      properties: { question: STRING, hint: STRING },
    },
  };
  if (prompt.allowedSkillCodes.length > 0) {
    criterionProperties.skillCodes = { type: "array", items: { type: "string", enum: prompt.allowedSkillCodes } };
  }
  return {
    type: "object",
    additionalProperties: false,
    required: ["taskTitle", "teacherTaskSummary", "studentTaskSummary", "criteria", "holisticLevels"],
    properties: {
      taskTitle: STRING,
      teacherTaskSummary: STRING,
      studentTaskSummary: STRING,
      criteria: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          required: Object.keys(criterionProperties),
          properties: criterionProperties,
        },
      },
      holisticLevels: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          required: ["teacher", "student"],
          properties: { teacher: STRING, student: STRING },
        },
      },
    },
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function text(value: unknown): string {
  return typeof value === "string" ? value.replace(/\s+/g, " ").trim() : "";
}

const CODE_PATTERN = /\b(?:SDB\d|OB\d|D\d{1,2}\b|[A-ZÇĞİÖŞÜ]{1,4}\.\d)/u;
/** Öğretmen metninde istenmeyen ikinci tekil ("sen") hitap. */
const SECOND_PERSON = /\b(sen|senin|sana|seni)\b/iu;

/**
 * Seçilen çıktılardan kaçının kriterlere bağlanması gerektiği. Rubrikte 4-6
 * kriter olduğundan çok sayıda çıktı (ör. Türkçe 8'de 11) tek tek
 * kapsanamaz; model en kritik 3-5 çıktıyı temel alır.
 * - TYMM: en fazla 5 seçimde hepsi, daha fazlasında en az 3 farklı çıktı.
 * - Önceki program: en az 1 çıktı kodu (SDB/D/KB zorunluluğu yok).
 */
export function requiredOutcomeCoverage(prompt: RubricPrompt): number {
  const selected = prompt.curriculum?.outcomes.length ?? 0;
  if (selected === 0) return 0;
  if (prompt.curriculum?.program === "onceki") return 1;
  return selected <= MAX_FULLY_COVERED_OUTCOMES ? selected : Math.min(3, selected);
}

/**
 * Model yanıtını rubrik gövdesine çevirir ve çift görünüm kurallarını
 * denetler. Her sorun hangi kuralın bozulduğunu (`rule`) taşır; ağırlıklar
 * ve seviye puanları KOD tarafından hesaplanır.
 */
export function validateRubricBody(value: unknown, prompt: RubricPrompt): { body?: RubricBody; issues: RubricValidationIssue[] } {
  const issues: RubricValidationIssue[] = [];
  const issue = (rule: RubricRule, path: string, message: string) => issues.push({ rule, path, message });
  if (!isRecord(value)) return { issues: [{ rule: "json", path: "root", message: "Yanıt bir JSON nesnesi değil." }] };

  const { scale, rubricType } = prompt.input;
  const taskTitle = text(value.taskTitle);
  const teacherTaskSummary = text(value.teacherTaskSummary);
  const studentTaskSummary = text(value.studentTaskSummary);
  if (!taskTitle) issue("bos_alan", "taskTitle", "Görev adı boş.");
  if (!teacherTaskSummary) issue("bos_alan", "teacherTaskSummary", "Görevin resmî tanımı boş.");
  if (!studentTaskSummary) issue("bos_alan", "studentTaskSummary", "Görevin öğrenci dilindeki tanımı boş.");

  const rawCriteria = Array.isArray(value.criteria) ? value.criteria : [];
  if (rawCriteria.length < RUBRIC_CRITERIA_RANGE.min || rawCriteria.length > RUBRIC_CRITERIA_RANGE.max) {
    issue("kriter_sayisi", "criteria", `${RUBRIC_CRITERIA_RANGE.min}-${RUBRIC_CRITERIA_RANGE.max} kriter yazılmalı; ${rawCriteria.length} kriter geldi.`);
  }

  const allowed = new Set(prompt.allowedSkillCodes);
  const kbAllowed: readonly string[] = TYMM_SKILL_GROUPS.conceptual;
  const parsed = rawCriteria.map((raw, index) => {
    const path = `criteria[${index}]`;
    const item = isRecord(raw) ? raw : {};
    const teacher = isRecord(item.teacherCriterion) ? item.teacherCriterion : {};
    const student = isRecord(item.studentFriendlyCriterion) ? item.studentFriendlyCriterion : {};
    const title = text(teacher.title);
    const description = text(teacher.description);
    const levels = Array.isArray(teacher.levels) ? teacher.levels.map(text) : [];
    const question = text(student.question);
    const hint = text(student.hint);
    const name = title || `${index + 1}. kriter`;

    if (!title || !description) issue("bos_alan", `${path}.teacherCriterion`, `${name}: kriter adı veya açıklaması boş.`);
    if (description.endsWith("?") || SECOND_PERSON.test(description)) {
      issue("ogretmen_dili", `${path}.teacherCriterion.description`, `${name}: öğretmen açıklaması soru ya da "sen" hitabı içeriyor.`);
    }
    if (levels.length !== scale || levels.some((level) => !level)) {
      issue("seviye", `${path}.teacherCriterion.levels`, `${name}: tam ${scale} seviye tanımı gerekli, ${levels.filter(Boolean).length} geldi.`);
    } else if (new Set(levels.map((level) => level.toLocaleLowerCase("tr-TR"))).size !== levels.length) {
      issue("seviye", `${path}.teacherCriterion.levels`, `${name}: seviye tanımları birbirinin aynısı.`);
    } else if (levels.some((level) => level.endsWith("?") || SECOND_PERSON.test(level))) {
      issue("ogretmen_dili", `${path}.teacherCriterion.levels`, `${name}: seviye tanımları soru ya da "sen" hitabı içeriyor.`);
    }

    if (!question) issue("bos_alan", `${path}.studentFriendlyCriterion.question`, `${name}: öğrenci sorusu boş.`);
    else if (!question.endsWith("?")) issue("ogrenci_dili", `${path}.studentFriendlyCriterion.question`, `${name}: öğrenci ölçütü soru işaretiyle bitmiyor ("${question}").`);
    if (question.split(" ").length > 14) issue("ogrenci_dili", `${path}.studentFriendlyCriterion.question`, `${name}: öğrenci sorusu 14 kelimeden uzun.`);
    if (/öğrenci/iu.test(question) || CODE_PATTERN.test(question) || CODE_PATTERN.test(hint)) {
      issue("ogrenci_dili", `${path}.studentFriendlyCriterion`, `${name}: öğrenci metni "öğrenci" kelimesi veya kod içeriyor.`);
    }
    if (!hint) issue("bos_alan", `${path}.studentFriendlyCriterion.hint`, `${name}: öğrenci ipucu boş.`);
    else if (hint.endsWith("?")) issue("ogrenci_dili", `${path}.studentFriendlyCriterion.hint`, `${name}: ipucu soru değil, kısa bir yönerge olmalı.`);

    const skillCodes = Array.isArray(item.skillCodes)
      ? [...new Set(item.skillCodes.filter((code): code is string => typeof code === "string"))]
      : [];
    const unknown = skillCodes.filter((code) => !allowed.has(code));
    if (unknown.length > 0) issue("kod", `${path}.skillCodes`, `${name}: listede olmayan kod kullanılmış (${unknown.join(", ")}).`);
    const conceptualSkills = Array.isArray(item.conceptualSkills)
      ? [...new Set(item.conceptualSkills.filter((skill): skill is string => typeof skill === "string" && kbAllowed.includes(skill)))].slice(0, 2)
      : [];

    const weight = typeof item.weight === "number" ? item.weight : 1;
    return {
      weight,
      criterion: {
        id: `k${index + 1}`,
        weight: 0,
        levelPoints: [] as number[],
        skillCodes: skillCodes.filter((code) => allowed.has(code)),
        conceptualSkills,
        teacherCriterion: { title, description, levels },
        studentFriendlyCriterion: { question, hint },
      } satisfies RubricCriterion,
    };
  });

  // Kriter havuzu kapsamı: seçilen çıktıların ne kadarı bağlanmalı + (TYMM'de) en az bir SDB ve bir Değer.
  if (prompt.curriculum) {
    const used = new Set(parsed.flatMap((item) => item.criterion.skillCodes));
    const outcomeCodes = prompt.curriculum.outcomes.map((outcome) => outcome.code);
    const covered = outcomeCodes.filter((code) => used.has(code));
    const required = requiredOutcomeCoverage(prompt);
    if (covered.length < required) {
      const missing = outcomeCodes.filter((code) => !used.has(code));
      issue(
        "kapsam",
        "criteria.skillCodes",
        required === outcomeCodes.length
          ? `Şu öğrenme çıktıları hiçbir kritere bağlanmadı: ${missing.join(", ")}.`
          : `Seçilen ${outcomeCodes.length} çıktıdan en az ${required} tanesi kriterlere bağlanmalı; ${covered.length} bağlandı.`
      );
    }
    if (prompt.curriculum.program === "tymm") {
      if (prompt.curriculum.sdb.length > 0 && ![...used].some((code) => code.startsWith("SDB"))) {
        issue("kapsam", "criteria.skillCodes", "Hiçbir kriter bir SDB koduyla ilişkilendirilmedi.");
      }
      if (prompt.curriculum.values.length > 0 && ![...used].some((code) => /^D\d/.test(code))) {
        issue("kapsam", "criteria.skillCodes", "Hiçbir kriter bir Değer (D) koduyla ilişkilendirilmedi.");
      }
    }
  }

  let holisticLevels: RubricHolisticLevel[] = [];
  if (rubricType === "butuncul") {
    const rawLevels = Array.isArray(value.holisticLevels) ? value.holisticLevels : [];
    const ranges = holisticRanges(scale);
    holisticLevels = rawLevels.map((raw, index) => {
      const level = isRecord(raw) ? raw : {};
      return { teacher: text(level.teacher), student: text(level.student), range: ranges[index] ?? { min: 0, max: 0 } };
    });
    if (holisticLevels.length !== scale || holisticLevels.some((level) => !level.teacher || !level.student)) {
      issue("butuncul", "holisticLevels", `Bütüncül rubrikte tam ${scale} düzey (öğretmen + öğrenci metni) gerekli; ${holisticLevels.length} geldi.`);
    }
  }

  if (issues.length > 0) return { issues };

  const weights = rubricType === "butuncul" ? parsed.map(() => 0) : normalizeWeights(parsed.map((item) => item.weight));
  const total = weights.reduce((sum, value) => sum + value, 0);
  if (rubricType !== "butuncul" && total !== RUBRIC_TOTAL_POINTS) {
    // Normalleştirme her zaman 100 verir; yine de güvenlik ağı olarak denetlenir.
    return { issues: [{ rule: "puan_toplami", path: "criteria.weight", message: `Kriter puanlarının toplamı ${total}; 100 olmalı.` }] };
  }
  const criteria = parsed.map(({ criterion }, index) => ({
    ...criterion,
    weight: weights[index],
    levelPoints: rubricType === "butuncul" ? [] : levelPoints(weights[index], scale),
  }));
  return { body: { taskTitle, teacherTaskSummary, studentTaskSummary, criteria, holisticLevels }, issues };
}
