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
