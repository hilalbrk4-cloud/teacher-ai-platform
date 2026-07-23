import type { LessonPlan, LessonPlanPrompt } from "@/types/lesson-planner";

export interface GenerateLessonPlanOptions {
  /** Called with a loading-stage index (0-based) as generation progresses. */
  onProgress?: (stageIndex: number) => void;
}

/**
 * Contract every lesson plan generator must satisfy. The UI and the
 * prompt builder only ever depend on this interface, so swapping the mock
 * implementation for a real AI-backed one later is a single-file change.
 */
export interface LessonPlanGenerationService {
  generate(prompt: LessonPlanPrompt, options?: GenerateLessonPlanOptions): Promise<LessonPlan>;
}
