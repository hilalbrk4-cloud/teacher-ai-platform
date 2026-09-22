/**
 * Server-only. Chooses which `QuizGenerationService` implementation to use
 * for a real generation request, based on `QUIZ_PROVIDER`. This is the one
 * place that switches between mock and OpenAI — nothing else should
 * branch on the provider directly.
 */
import { getQuizProvider } from "@/lib/ai/config";
import { openAiQuizGenerationService } from "@/lib/ai/services/openai-quiz-service";
import { mockQuizGenerationService } from "@/lib/quiz-generator/mock-generation-service";
import type { QuizGenerationService } from "@/lib/quiz-generator/generation-service";

export function getServerQuizGenerationService(): QuizGenerationService {
  return getQuizProvider() === "openai" ? openAiQuizGenerationService : mockQuizGenerationService;
}
