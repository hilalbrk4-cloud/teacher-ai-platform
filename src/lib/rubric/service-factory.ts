/** Server-only. Rubrik üretim servisini `RUBRIC_PROVIDER` (yoksa `LESSON_PLAN_PROVIDER`) ayarına göre seçer. */
import { getRubricProvider } from "@/lib/ai/config";
import type { RubricGenerationService } from "@/lib/rubric/generation";
import { mockRubricGenerationService } from "@/lib/rubric/mock-service";
import { openAiRubricGenerationService } from "@/lib/rubric/openai-service";

export function getServerRubricGenerationService(): RubricGenerationService {
  return getRubricProvider() === "openai" ? openAiRubricGenerationService : mockRubricGenerationService;
}
