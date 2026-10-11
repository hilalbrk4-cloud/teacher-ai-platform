/**
 * Sunucu tarafı müfredat deposu: tüm sınıf düzeyi JSON'larını statik olarak
 * içe aktarır. Yalnızca API route'larından ve üretim pipeline'ından
 * kullanılır; istemci bileşenleri `catalog.ts` ve `/api/curriculum` kullanır.
 */
import { CURRICULUM_REGISTRY } from "@/data/curriculum/registry";
import type {
  CurriculumGradeData,
  CurriculumTag,
  LessonPlanCurriculumContext,
  LessonPlanCurriculumSelection,
} from "@/types/curriculum";

export function getCurriculumGrade(id: string): CurriculumGradeData | undefined {
  return Object.hasOwn(CURRICULUM_REGISTRY, id) ? CURRICULUM_REGISTRY[id] : undefined;
}

function mergeTags(lists: CurriculumTag[][]): CurriculumTag[] {
  const seen = new Map<string, CurriculumTag>();
  for (const tag of lists.flat()) if (!seen.has(tag.code)) seen.set(tag.code, tag);
  return [...seen.values()].sort((a, b) => a.code.localeCompare(b.code, "tr", { numeric: true }));
}

/**
 * İstemcinin gönderdiği seçimi (yalnızca kimlikler ve kodlar) havuzdan
 * doğrular ve resmî metinlerle çözer. Konuya ait olmayan veya bilinmeyen
 * kodlar atılır; geçerli kod kalmazsa bağlam üretilmez. Metinler asla
 * istemciden alınmaz.
 */
export function resolveCurriculumSelection(
  selection: LessonPlanCurriculumSelection | null | undefined
): LessonPlanCurriculumContext | undefined {
  if (!selection) return undefined;
  const grade = getCurriculumGrade(selection.gradeId);
  const unit = grade?.units.find((item) => item.id === selection.unitId);
  const topic = unit?.topics.find((item) => item.id === selection.topicId);
  if (!grade || !unit || !topic) return undefined;

  const codes = selection.outcomeCodes.filter((code) => topic.outcomeCodes.includes(code) && grade.outcomes[code]);
  if (codes.length === 0) return undefined;
  const outcomes = codes.map((code) => grade.outcomes[code]);

  return {
    gradeId: grade.id,
    subject: grade.subject,
    grade: grade.grade,
    program: grade.program,
    unit: unit.name,
    topic: topic.name,
    outcomes: outcomes.map(({ code, text, components }) => ({ code, text, components })),
    sdb: mergeTags(outcomes.map((outcome) => outcome.sdb)),
    values: mergeTags(outcomes.map((outcome) => outcome.values)),
    literacy: mergeTags(outcomes.map((outcome) => outcome.literacy)),
    assessment: [...new Set(outcomes.flatMap((outcome) => outcome.assessment))],
  };
}

/** Güvenilmeyen istek gövdesinden seçim nesnesini okur (tip denetimi). */
export function parseCurriculumSelection(value: unknown): LessonPlanCurriculumSelection | null {
  if (typeof value !== "object" || value === null) return null;
  const record = value as Record<string, unknown>;
  const { gradeId, unitId, topicId, outcomeCodes } = record;
  if (typeof gradeId !== "string" || typeof unitId !== "string" || typeof topicId !== "string") return null;
  if (!Array.isArray(outcomeCodes)) return null;
  const codes = outcomeCodes.filter((code): code is string => typeof code === "string").slice(0, 40);
  return { gradeId, unitId, topicId, outcomeCodes: codes };
}
