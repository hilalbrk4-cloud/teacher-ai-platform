/**
 * Server-only. Chooses which `LessonPlanGenerationService` implementation
 * to use for a real generation request, based on `LESSON_PLAN_PROVIDER`.
 * This is the one place that switches between mock and OpenAI — nothing
 * else should branch on the provider directly.
 */
import { getLessonPlanProvider } from "@/lib/ai/config";
import { openAiLessonPlanGenerationService } from "@/lib/ai/services/openai-lesson-plan-service";
import { mockLessonPlanGenerationService } from "@/lib/lesson-planner/mock-generation-service";
import type { LessonPlanGenerationService } from "@/lib/lesson-planner/generation-service";

export function getServerLessonPlanGenerationService(): LessonPlanGenerationService {
  return getLessonPlanProvider() === "openai"
    ? openAiLessonPlanGenerationService
    : mockLessonPlanGenerationService;
}
