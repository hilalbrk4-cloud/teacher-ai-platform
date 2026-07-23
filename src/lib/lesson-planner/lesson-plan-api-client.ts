"use client";

import type { LessonPlan, LessonPlanFormInput, LessonPlanSection } from "@/types/lesson-planner";

const API_ENDPOINT = "/api/lesson-plans/generate";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isLessonPlanSection(value: unknown): value is LessonPlanSection {
  return isRecord(value) && typeof value.key === "string" && typeof value.content === "string";
}

function isLessonPlan(value: unknown): value is LessonPlan {
  return (
    isRecord(value) &&
    typeof value.id === "string" &&
    typeof value.subject === "string" &&
    typeof value.gradeLevel === "string" &&
    typeof value.topic === "string" &&
    typeof value.duration === "number" &&
    typeof value.generatedAt === "string" &&
    Array.isArray(value.sections) &&
    value.sections.every(isLessonPlanSection)
  );
}

function readErrorMessage(body: unknown, fallback: string): string {
  if (isRecord(body) && isRecord(body.error) && typeof body.error.message === "string") {
    return body.error.message;
  }
  return fallback;
}

export class LessonPlanApiError extends Error {}

/**
 * Client-side call to the Lesson Planner generation API route. This is the
 * *only* place the browser talks to the server about generation — it never
 * builds a prompt and never knows whether the server is using the mock
 * service or OpenAI (`LESSON_PLAN_PROVIDER` is read server-side only, see
 * `src/lib/ai/config.ts`). The route itself decides, so this client stays
 * correct regardless of provider.
 */
export async function generateLessonPlanViaApi(
  input: LessonPlanFormInput,
  options?: { signal?: AbortSignal },
  fallbackErrorMessage = "Ders planı oluşturulamadı. Lütfen tekrar deneyin."
): Promise<LessonPlan> {
  let response: Response;
  try {
    response = await fetch(API_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
      signal: options?.signal,
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      throw error;
    }
    throw new LessonPlanApiError(fallbackErrorMessage);
  }

  let body: unknown;
  try {
    body = await response.json();
  } catch {
    throw new LessonPlanApiError(fallbackErrorMessage);
  }

  if (!response.ok) {
    throw new LessonPlanApiError(readErrorMessage(body, fallbackErrorMessage));
  }

  const plan = isRecord(body) ? body.plan : undefined;
  if (!isLessonPlan(plan)) {
    throw new LessonPlanApiError(fallbackErrorMessage);
  }

  return plan;
}
