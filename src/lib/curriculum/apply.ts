import { formatCurriculumTag, outcomeObjectiveLine } from "@/lib/curriculum/catalog";
import type { LessonPlanCurriculumContext } from "@/types/curriculum";
import type { LessonPlan } from "@/types/lesson-planner";

/**
 * Resmî müfredat bağlamını plana KOD ile işler: model yanıtından bağımsız
 * olarak seçilen çıktı kodları, SDB, Değerler ve Okuryazarlık becerileri
 * eksiksiz yer alır.
 *
 * - `plan.curriculum` kaynağın tamamını taşır (Beceriler kartı, Word çıktısı).
 * - TYMM Beceriler Örgüsü'ndeki SDB ve Değerler grupları resmî kodlu
 *   etiketlerle değiştirilir; KB ve Eğilimler modelin seçimi olarak kalır.
 * - "Öğrenme hedefleri" bölümünde eksik kalan resmî çıktı satırları eklenir.
 */
export function applyOfficialCurriculum(
  plan: LessonPlan,
  curriculum: LessonPlanCurriculumContext | undefined
): LessonPlan {
  if (!curriculum) return plan;

  const skills = plan.skills
    ? {
        ...plan.skills,
        socialEmotional:
          curriculum.sdb.length > 0 ? curriculum.sdb.map(formatCurriculumTag) : plan.skills.socialEmotional,
        values: curriculum.values.length > 0 ? curriculum.values.map(formatCurriculumTag) : plan.skills.values,
      }
    : undefined;

  const sections = plan.sections.map((section) => {
    if (section.key !== "ogrenmeHedefleri") return section;
    const missing = curriculum.outcomes.filter((outcome) => !section.content.includes(outcome.code));
    if (missing.length === 0) return section;
    const officialLines = missing.map(outcomeObjectiveLine).join("\n");
    return { ...section, content: `${officialLines}\n${section.content}`.trim() };
  });

  return { ...plan, sections, skills, curriculum };
}
