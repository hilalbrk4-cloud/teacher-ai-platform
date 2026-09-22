import type { QuizPrompt } from "@/types/quiz-blueprint";
import type { Quiz } from "@/types/quiz-generator";

export interface GenerateQuizOptions {
  /** Called with a loading-stage index (0-based) as generation progresses. */
  onProgress?: (stageIndex: number) => void;
}

/**
 * Contract every quiz generator must satisfy. The UI only ever depends on
 * this interface, so swapping the mock implementation for a real
 * AI-backed one is a single-file change (see
 * `quiz-generation-service-factory.ts`).
 */
export interface QuizGenerationService {
  generate(prompt: QuizPrompt, options?: GenerateQuizOptions): Promise<Quiz>;
}
