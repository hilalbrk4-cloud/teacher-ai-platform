/**
 * Server-only configuration for the Lesson Planner AI generation layer.
 * This is the single place the provider name, model name and request
 * timeout are defined — nothing else in the codebase should hardcode them.
 *
 * Do not import this module from client components or hooks. It only
 * reads `process.env`, so it is safe even if accidentally bundled for the
 * client (Next.js strips non-`NEXT_PUBLIC_` env vars from the browser
 * bundle), but it exists to serve the server-side generation flow only.
 */

export type LessonPlanProvider = "mock" | "openai";

const DEFAULT_PROVIDER: LessonPlanProvider = "mock";

/** Single source of truth for the OpenAI model used to generate lesson plans. */
export const OPENAI_LESSON_PLAN_MODEL = "gpt-4o-mini";

/** Maximum time (ms) to wait for the OpenAI request before treating it as a timeout. */
export const LESSON_PLAN_REQUEST_TIMEOUT_MS = 30_000;

/**
 * Reads which generation service should be used. Falls back to "mock"
 * whenever the environment variable is missing or set to anything other
 * than "openai" — the app must never silently fail open into a state that
 * requires a key it doesn't have.
 */
export function getLessonPlanProvider(): LessonPlanProvider {
  const raw = process.env.LESSON_PLAN_PROVIDER?.trim().toLowerCase();
  return raw === "openai" ? "openai" : DEFAULT_PROVIDER;
}

/** Returns the OpenAI API key, or `undefined` if it isn't configured. */
export function getOpenAiApiKey(): string | undefined {
  const key = process.env.OPENAI_API_KEY?.trim();
  return key ? key : undefined;
}

export type QuizProvider = "mock" | "openai";

const DEFAULT_QUIZ_PROVIDER: QuizProvider = "mock";

/**
 * Single source of truth for the OpenAI model used to generate quizzes.
 * Upgraded from "gpt-4o-mini" to "gpt-4o": with Knowledge Pack guidance
 * interleaved into a 10-question prompt, the mini model reliably dropped or
 * merged a question under the combined instruction load; the larger model
 * follows the exact question count and per-slot pattern guidance reliably.
 */
export const OPENAI_QUIZ_MODEL = "gpt-4o";

/**
 * Maximum time (ms) to wait for ONE batch request before treating it as a
 * timeout. Scenario questions with structured `hesap` produce long outputs,
 * and 30s timed out a 9-question quiz under a saturated per-minute limit.
 */
export const QUIZ_REQUEST_TIMEOUT_MS = 45_000;

/**
 * Quizzes are generated in small batches instead of one large request: a
 * single 10-question request regularly exceeded the timeout, while a
 * 2-3 question batch reliably finishes in well under it.
 */
export const QUIZ_BATCH_SIZE = 3;

/**
 * How many batches run at the same time. OpenAI counts each request's input
 * PLUS its reserved `max_output_tokens` against the per-minute token limit
 * (30k TPM for gpt-4o on the account's current tier); 4 parallel batches
 * with a 6k reservation each exceeded it and returned 429s.
 */
export const QUIZ_BATCH_CONCURRENCY = 2;

/**
 * Output tokens reserved per request: a base plus a per-question allowance.
 * Measured scenario questions (with their structured `hesap`) use roughly
 * 500-700 output tokens; 900 leaves headroom without over-reserving.
 */
export const QUIZ_OUTPUT_TOKENS_BASE = 400;
export const QUIZ_OUTPUT_TOKENS_PER_QUESTION = 900;

/** SDK-level retries; the SDK waits for the provider's `retry-after` on 429s. */
export const QUIZ_SDK_MAX_RETRIES = 3;

/**
 * A batch whose response fails validation is regenerated before giving up.
 * Three attempts: scenario arithmetic is now verified step by step by code,
 * so a single slip by the model rejects the batch — and a slip on the retry
 * too previously failed the whole quiz.
 */
export const QUIZ_BATCH_MAX_ATTEMPTS = 3;

/**
 * Reads which quiz generation service should be used. Falls back to
 * "mock" whenever the environment variable is missing or set to anything
 * other than "openai" — mirrors `getLessonPlanProvider`'s fail-safe default.
 */
export function getQuizProvider(): QuizProvider {
  const raw = process.env.QUIZ_PROVIDER?.trim().toLowerCase();
  return raw === "openai" ? "openai" : DEFAULT_QUIZ_PROVIDER;
}
