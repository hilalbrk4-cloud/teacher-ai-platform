import { QUIZ_BATCH_CONCURRENCY, QUIZ_BATCH_MAX_ATTEMPTS, QUIZ_BATCH_SIZE } from "@/lib/ai/config";
import { buildQuizPromptBatches } from "@/lib/ai/prompts/quiz-generator-prompt";
import type { QuizGeneratorPackContext } from "@/lib/ai/prompts/quiz-generator-knowledge-pack-blocks";
import { QuizProviderError, type QuizProviderErrorCode } from "@/lib/ai/services/quiz-provider-error";
import type { QuizGenerationService } from "@/lib/quiz-generator/generation-service";
import { createQuizGeneratorId } from "@/lib/quiz-generator/id";
import type { QuizBlueprint, QuizPrompt } from "@/types/quiz-blueprint";
import type { Quiz } from "@/types/quiz-generator";

/**
 * Failures a fresh attempt can plausibly fix: the model got the content
 * wrong or returned nothing usable. Timeouts and rate limits are already
 * retried once by the OpenAI SDK itself (see `openai-quiz-service.ts`), so
 * retrying them here too would only multiply the worst-case wait.
 * Configuration errors (e.g. a missing API key) are never retried.
 */
const RETRYABLE_CODES = new Set<QuizProviderErrorCode>(["schema_validation_failed", "invalid_json", "empty_response"]);

export interface BatchGenerationOptions {
  batchSize?: number;
  concurrency?: number;
  maxAttempts?: number;
}

function isRetryable(error: unknown): boolean {
  return error instanceof QuizProviderError && RETRYABLE_CODES.has(error.code);
}

async function generateBatchWithRetry(
  service: QuizGenerationService,
  prompt: QuizPrompt,
  maxAttempts: number
): Promise<Quiz> {
  let lastError: unknown;
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      return await service.generate(prompt);
    } catch (error) {
      lastError = error;
      if (!isRetryable(error)) break;
    }
  }
  throw lastError;
}

/** Runs `tasks` with at most `limit` in flight, preserving result order. */
async function runWithConcurrency<T>(tasks: (() => Promise<T>)[], limit: number): Promise<T[]> {
  const results: T[] = new Array(tasks.length);
  let next = 0;

  async function worker(): Promise<void> {
    while (next < tasks.length) {
      const index = next;
      next += 1;
      results[index] = await tasks[index]();
    }
  }

  await Promise.all(Array.from({ length: Math.min(Math.max(1, limit), tasks.length) }, worker));
  return results;
}

/**
 * Generates a quiz as several small, parallel batches and merges them in
 * blueprint order. Works with any `QuizGenerationService` (mock or real) —
 * each batch is an ordinary `QuizPrompt` for just its own slots, validated
 * by the service exactly like a whole quiz would be. A batch that fails
 * with a retryable error is regenerated on its own, so one bad batch never
 * forces the whole quiz to be regenerated; if it still fails, the whole
 * request fails (a quiz with missing questions is never returned).
 */
export async function generateQuizInBatches(
  blueprint: QuizBlueprint,
  packContext: QuizGeneratorPackContext | undefined,
  service: QuizGenerationService,
  options: BatchGenerationOptions = {}
): Promise<Quiz> {
  const prompts = buildQuizPromptBatches(blueprint, packContext, options.batchSize ?? QUIZ_BATCH_SIZE);
  const maxAttempts = options.maxAttempts ?? QUIZ_BATCH_MAX_ATTEMPTS;

  const parts = await runWithConcurrency(
    prompts.map((prompt) => () => generateBatchWithRetry(service, prompt, maxAttempts)),
    options.concurrency ?? QUIZ_BATCH_CONCURRENCY
  );

  if (parts.length === 1) return parts[0];

  return {
    id: createQuizGeneratorId("quiz"),
    title: parts[0].title,
    quizType: blueprint.quizType,
    subject: blueprint.subject,
    gradeLevel: blueprint.gradeLevel,
    topic: blueprint.topic,
    questions: parts.flatMap((part) => part.questions),
    includeAnswerKey: blueprint.includeAnswerKey,
    generatedAt: new Date().toISOString(),
  };
}
