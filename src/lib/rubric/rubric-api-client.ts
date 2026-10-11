import type { Rubric, RubricFormInput } from "@/types/rubric";

export class RubricApiError extends Error {}

function isRubric(value: unknown): value is Rubric {
  if (typeof value !== "object" || value === null) return false;
  const record = value as Record<string, unknown>;
  return (
    typeof record.id === "string" &&
    typeof record.taskTitle === "string" &&
    Array.isArray(record.criteria) &&
    Array.isArray(record.holisticLevels)
  );
}

/** Tarayıcıdan rubrik üretim API'sine tek çağrı; sağlayıcı seçimi sunucudadır. */
export async function generateRubricViaApi(
  input: RubricFormInput,
  options: { signal?: AbortSignal } = {},
  fallbackErrorMessage = "Rubrik oluşturulamadı. Lütfen tekrar deneyin."
): Promise<Rubric> {
  const response = await fetch("/api/rubrics/generate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
    signal: options.signal,
  });
  const body: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    const message =
      typeof body === "object" && body !== null && "error" in body
        ? String((body as { error?: { message?: unknown } }).error?.message ?? fallbackErrorMessage)
        : fallbackErrorMessage;
    throw new RubricApiError(message);
  }
  const rubric = typeof body === "object" && body !== null ? (body as { rubric?: unknown }).rubric : undefined;
  if (!isRubric(rubric)) throw new RubricApiError(fallbackErrorMessage);
  return rubric;
}
