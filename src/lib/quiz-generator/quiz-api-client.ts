"use client";

import type { Quiz, QuizFormInput } from "@/types/quiz-generator";

const API_ENDPOINT = "/api/quizzes/generate";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isQuiz(value: unknown): value is Quiz {
  return (
    isRecord(value) &&
    typeof value.id === "string" &&
    typeof value.title === "string" &&
    typeof value.subject === "string" &&
    typeof value.gradeLevel === "string" &&
    typeof value.topic === "string" &&
    typeof value.generatedAt === "string" &&
    Array.isArray(value.questions)
  );
}

function readErrorMessage(body: unknown, fallback: string): string {
  if (isRecord(body) && isRecord(body.error) && typeof body.error.message === "string") {
    return body.error.message;
  }
  return fallback;
}

export class QuizApiError extends Error {}

/**
 * Client-side call to the Quiz Generator generation API route. This is the
 * *only* place the browser talks to the server about generation — it never
 * builds a Blueprint or prompt and never knows whether the server is using
 * the mock service or OpenAI (`QUIZ_PROVIDER` is read server-side only, see
 * `src/lib/ai/config.ts`). The route itself decides, so this client stays
 * correct regardless of provider.
 */
export async function generateQuizViaApi(
  input: QuizFormInput,
  options?: { signal?: AbortSignal },
  fallbackErrorMessage = "Sınav oluşturulamadı. Lütfen tekrar deneyin."
): Promise<Quiz> {
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
    throw new QuizApiError(fallbackErrorMessage);
  }

  let body: unknown;
  try {
    body = await response.json();
  } catch {
    throw new QuizApiError(fallbackErrorMessage);
  }

  if (!response.ok) {
    throw new QuizApiError(readErrorMessage(body, fallbackErrorMessage));
  }

  const quiz = isRecord(body) ? body.quiz : undefined;
  if (!isQuiz(quiz)) {
    throw new QuizApiError(fallbackErrorMessage);
  }

  return quiz;
}
