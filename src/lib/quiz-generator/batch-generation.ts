import { QUIZ_BATCH_CONCURRENCY, QUIZ_BATCH_MAX_ATTEMPTS, QUIZ_BATCH_SIZE } from "@/lib/ai/config";
import {
  buildQuizPrompt,
  buildQuizPromptForSlots,
  splitIntoSlotGroups,
} from "@/lib/ai/prompts/quiz-generator-prompt";
import type { QuizGeneratorPackContext } from "@/lib/ai/prompts/quiz-generator-knowledge-pack-blocks";
import { QuizProviderError, type QuizProviderErrorCode } from "@/lib/ai/services/quiz-provider-error";
import type { QuizGenerationService } from "@/lib/quiz-generator/generation-service";
import { createQuizGeneratorId } from "@/lib/quiz-generator/id";
import type { QuizBlueprint } from "@/types/quiz-blueprint";
import type { Quiz, QuizQuestion } from "@/types/quiz-generator";

/**
 * Failures a fresh attempt can plausibly fix: the model got the content
 * wrong or returned nothing usable. Timeouts and rate limits are already
 * retried by the OpenAI SDK itself (see `openai-quiz-service.ts`), so
 * retrying them here too would only multiply the worst-case wait.
 * Configuration errors (e.g. a missing API key) are never retried.
 */
const RETRYABLE_CODES = new Set<QuizProviderErrorCode>(["schema_validation_failed", "invalid_json", "empty_response"]);

const QUESTION_PATH = /^questions\[(\d+)\]/;

export interface BatchGenerationOptions {
  batchSize?: number;
  concurrency?: number;
  maxAttempts?: number;
}

function isRetryable(error: unknown): error is QuizProviderError {
  return error instanceof QuizProviderError && RETRYABLE_CODES.has(error.code);
}

interface GroupResult {
  title?: string;
  questions: Map<number, QuizQuestion>;
}

/**
 * Generates one group of slots, retrying ONLY the questions that failed.
 * A rejected question no longer throws away its valid neighbours: they are
 * kept, and the next attempt asks for just the missing slots — together
 * with the exact reasons each was rejected, so the model can fix them.
 */
async function generateGroup(
  blueprint: QuizBlueprint,
  packContext: QuizGeneratorPackContext | undefined,
  service: QuizGenerationService,
  slotIndices: number[],
  batch: { batchIndex: number; batchCount: number },
  maxAttempts: number
): Promise<GroupResult> {
  const questions = new Map<number, QuizQuestion>();
  const feedback = new Map<number, string[]>();
  let pending = slotIndices;
  let title: string | undefined;
  let lastError: unknown;

  for (let attempt = 1; attempt <= maxAttempts && pending.length > 0; attempt += 1) {
    // The first attempt of a single-batch quiz is exactly the plain prompt.
    const prompt =
      batch.batchCount === 1 && pending.length === blueprint.slots.length && feedback.size === 0
        ? buildQuizPrompt(blueprint, packContext)
        : buildQuizPromptForSlots(blueprint, packContext, pending, {
            ...batch,
            feedback: pending.map((index) => feedback.get(index) ?? []),
          });
    const asked = pending;

    try {
      const quiz = await service.generate(prompt);
      quiz.questions.forEach((question, position) => questions.set(asked[position], question));
      title ??= quiz.title;
    } catch (error) {
      lastError = error;
      if (!isRetryable(error)) throw error;
      const validation = error.validation;
      if (validation) {
        title ??= validation.title;
        validation.partial.forEach((question, position) => {
          if (question) questions.set(asked[position], question);
        });
        for (const issue of validation.issues) {
          const match = QUESTION_PATH.exec(issue.path);
          const targets = match ? [asked[Number(match[1])]] : asked;
          for (const target of targets) {
            if (target === undefined) continue;
            feedback.set(target, [...(feedback.get(target) ?? []), issue.message]);
          }
        }
      }
    }
    pending = pending.filter((index) => !questions.has(index));
  }

  // A quiz with missing questions is never returned.
  if (pending.length > 0) throw lastError;
  return { title, questions };
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
 * each request is an ordinary `QuizPrompt` for just its own slots,
 * validated by the service exactly like a whole quiz would be. Within a
 * batch, only rejected questions are regenerated (see `generateGroup`); if
 * a question still fails after `maxAttempts`, the whole request fails.
 */
export async function generateQuizInBatches(
  blueprint: QuizBlueprint,
  packContext: QuizGeneratorPackContext | undefined,
  service: QuizGenerationService,
  options: BatchGenerationOptions = {}
): Promise<Quiz> {
  const groups = splitIntoSlotGroups(blueprint.slots.length, options.batchSize ?? QUIZ_BATCH_SIZE);
  const maxAttempts = options.maxAttempts ?? QUIZ_BATCH_MAX_ATTEMPTS;

  const results = await runWithConcurrency(
    groups.map(
      (slotIndices, batchIndex) => () =>
        generateGroup(blueprint, packContext, service, slotIndices, { batchIndex, batchCount: groups.length }, maxAttempts)
    ),
    options.concurrency ?? QUIZ_BATCH_CONCURRENCY
  );

  const questions = blueprint.slots.map((_, index) => {
    const question = results.find((result) => result.questions.has(index))?.questions.get(index);
    if (!question) throw new QuizProviderError("schema_validation_failed", "Eksik soru.");
    return question;
  });

  return {
    id: createQuizGeneratorId("quiz"),
    title: results.find((result) => result.title)?.title ?? `${blueprint.topic} Sınavı`,
    quizType: blueprint.quizType,
    subject: blueprint.subject,
    gradeLevel: blueprint.gradeLevel,
    topic: blueprint.topic,
    questions,
    includeAnswerKey: blueprint.includeAnswerKey,
    generatedAt: new Date().toISOString(),
  };
}
