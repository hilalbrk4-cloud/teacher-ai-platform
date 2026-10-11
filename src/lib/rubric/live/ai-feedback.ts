import { RUBRIC_SCALE_LEVELS, type Rubric } from "@/types/rubric";
import type { LiveScore } from "@/lib/rubric/live/types";

/** Yapay zekâya giden metinde öğrenci adı yerine kullanılan yer tutucu. */
export const NAME_PLACEHOLDER = "{AD}";

/**
 * AI geri bildirim isteği: yalnızca rubrik bağlamı ve seçilen seviyeler.
 * Öğrencinin adı ve okul numarası GÖNDERİLMEZ (KVKK); model {AD} yazar,
 * tarayıcı adı yerine koyar.
 */
export interface LiveFeedbackRequest {
  subject: string;
  gradeLevel: string;
  topic: string;
  taskTitle: string;
  total: number;
  criteria: { title: string; level: string; points: number; max: number; hint: string }[];
  holistic?: { level: string; description: string };
}

export function buildFeedbackRequest(rubric: Rubric, score: LiveScore, total: number): LiveFeedbackRequest | null {
  const levels = RUBRIC_SCALE_LEVELS[rubric.scale];
  const base = { subject: rubric.subject, gradeLevel: rubric.gradeLevel, topic: rubric.topic, taskTitle: rubric.taskTitle, total };
  if (rubric.rubricType === "butuncul") {
    if (score.holisticLevel === undefined) return null;
    return {
      ...base,
      criteria: rubric.criteria.map((criterion) => ({ title: criterion.teacherCriterion.title, level: "-", points: 0, max: 0, hint: criterion.studentFriendlyCriterion.hint })),
      holistic: { level: levels[score.holisticLevel].label, description: rubric.holisticLevels[score.holisticLevel]?.student ?? "" },
    };
  }
  const criteria = rubric.criteria
    .filter((criterion) => score.levels[criterion.id] !== undefined)
    .map((criterion) => {
      const level = score.levels[criterion.id];
      return {
        title: criterion.teacherCriterion.title,
        level: levels[level].label,
        points: criterion.levelPoints[level],
        max: criterion.weight,
        hint: criterion.studentFriendlyCriterion.hint,
      };
    });
  return criteria.length > 0 ? { ...base, criteria } : null;
}

/** Modelin yazdığı {AD} yer tutucusunu öğrencinin ilk adıyla değiştirir. */
export function applyStudentName(text: string, fullName: string): string {
  const firstName = fullName.trim().split(/\s+/)[0] ?? "";
  return text.split(NAME_PLACEHOLDER).join(firstName).replace(/\s+/g, " ").trim();
}

/** Sunucu doğrulaması: 1-2 cümle, yer tutucu var, üçüncü şahıs "öğrenci" dili yok. */
export function validateAiFeedback(text: string): string | null {
  const clean = text.replace(/\s+/g, " ").trim();
  if (!clean.includes(NAME_PLACEHOLDER)) return "Geri bildirim {AD} yer tutucusunu içermiyor.";
  if (clean.length > 420) return "Geri bildirim 420 karakterden uzun.";
  const sentences = clean.split(/[.!?](?:\s|$)/).filter((part) => part.trim().length > 0);
  if (sentences.length > 3) return `Geri bildirim ${sentences.length} cümle; en fazla 2 olmalı.`;
  // \b yalnızca ASCII harfleri tanır; Türkçe harfle başlayan kelimede sınır Unicode harf sınıfıyla kontrol edilir.
  if (/(^|[^\p{L}])öğrenci/iu.test(clean)) return "Geri bildirim sen diliyle yazılmalı (\"öğrenci\" kelimesi var).";
  return null;
}
