import type { LessonPlan } from "@/types/lesson-planner";

const EXPANSION_NOTE =
  "Ayrıca, öğrencilerin bireysel farklılıkları göz önünde bulundurularak etkinlik çeşitlendirilebilir ve örnekler artırılabilir.";

function shortenText(content: string): string {
  const [firstLine, ...rest] = content.split("\n").filter(Boolean);
  if (!firstLine) return content;
  const firstSentence = firstLine.split(/(?<=[.!?])\s/)[0];
  return rest.length > 0 || firstSentence !== firstLine ? `${firstSentence.trim()}…` : firstSentence;
}

export function shortenLessonPlan(plan: LessonPlan): LessonPlan {
  return {
    ...plan,
    sections: plan.sections.map((section) => ({
      ...section,
      content: shortenText(section.content),
    })),
  };
}

export function expandLessonPlan(plan: LessonPlan): LessonPlan {
  return {
    ...plan,
    sections: plan.sections.map((section) => ({
      ...section,
      content: `${section.content}\n\n${EXPANSION_NOTE}`,
    })),
  };
}
