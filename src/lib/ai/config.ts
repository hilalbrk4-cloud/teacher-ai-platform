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

/** Maximum time (ms) to wait for the OpenAI request before treating it as a timeout. */
export const QUIZ_REQUEST_TIMEOUT_MS = 30_000;

/**
 * Reads which quiz generation service should be used. Falls back to
 * "mock" whenever the environment variable is missing or set to anything
 * other than "openai" — mirrors `getLessonPlanProvider`'s fail-safe default.
 */
export function getQuizProvider(): QuizProvider {
  const raw = process.env.QUIZ_PROVIDER?.trim().toLowerCase();
  return raw === "openai" ? "openai" : DEFAULT_QUIZ_PROVIDER;
}
