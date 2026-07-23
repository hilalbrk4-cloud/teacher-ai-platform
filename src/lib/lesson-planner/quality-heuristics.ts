import type { LessonPlan } from "@/types/lesson-planner";

export type QualityMetricId = "completeness" | "balance" | "assessment";
export type QualityMetricStatus = "good" | "attention";

export interface QualityMetric {
  id: QualityMetricId;
  status: QualityMetricStatus;
}

const MIN_SECTION_LENGTH = 20;
const BALANCE_RATIO_THRESHOLD = 4;

function contentLength(content: string): number {
  return content.trim().length;
}

/**
 * Deterministic, purely structural checks derived from the plan's own
 * section content — not an AI-generated assessment. Intended as a
 * lightweight placeholder, not a scoring engine.
 */
export function getLessonPlanQualityMetrics(plan: LessonPlan): QualityMetric[] {
  const lengths = plan.sections.map((section) => contentLength(section.content));

  const completeness: QualityMetric = {
    id: "completeness",
    status: lengths.every((length) => length >= MIN_SECTION_LENGTH) ? "good" : "attention",
  };

  const nonEmptyLengths = lengths.filter((length) => length > 0);
  const shortest = Math.min(...nonEmptyLengths);
  const longest = Math.max(...nonEmptyLengths);
  const balance: QualityMetric = {
    id: "balance",
    status:
      nonEmptyLengths.length > 0 && shortest > 0 && longest / shortest <= BALANCE_RATIO_THRESHOLD
        ? "good"
        : "attention",
  };

  const assessmentSection = plan.sections.find((section) => section.key === "olcmeDegerlendirme");
  const assessment: QualityMetric = {
    id: "assessment",
    status:
      assessmentSection && contentLength(assessmentSection.content) >= MIN_SECTION_LENGTH
        ? "good"
        : "attention",
  };

  return [completeness, balance, assessment];
}
