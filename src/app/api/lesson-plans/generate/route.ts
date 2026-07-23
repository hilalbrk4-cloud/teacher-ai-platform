import { NextResponse } from "next/server";

import { buildLessonPlanPrompt } from "@/lib/ai/prompts/lesson-planner-prompt";
import { getServerLessonPlanGenerationService } from "@/lib/ai/services/generation-service-factory";
import { getSafeLessonPlanErrorMessage } from "@/lib/ai/services/lesson-plan-provider-error";
import type { LessonPlanFormInput, LessonPlanRefinementId } from "@/types/lesson-planner";

export const runtime = "nodejs";

const KNOWN_REFINEMENTS: readonly LessonPlanRefinementId[] = [
  "fiveE",
  "groupWork",
  "warmUpActivity",
  "inclusionAdaptation",
];

function readOptionalString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

/**
 * Turns an untrusted request body into a typed `LessonPlanFormInput`, or
 * `null` if it's missing/malformed. This is the server-side trust boundary
 * — the browser can send anything, so required fields are re-checked here
 * independent of the client-side form validation.
 */
function parseFormInput(body: unknown): LessonPlanFormInput | null {
  if (typeof body !== "object" || body === null) return null;
  const record = body as Record<string, unknown>;

  const { subject, gradeLevel, topic, objectives, duration } = record;

  const hasRequiredStrings =
    typeof subject === "string" &&
    subject.trim().length > 0 &&
    typeof gradeLevel === "string" &&
    gradeLevel.trim().length > 0 &&
    typeof topic === "string" &&
    topic.trim().length > 0 &&
    typeof objectives === "string" &&
    objectives.trim().length > 0;

  const hasValidDuration = typeof duration === "number" && Number.isFinite(duration) && duration > 0;

  if (!hasRequiredStrings || !hasValidDuration) {
    return null;
  }

  const rawRefinements = Array.isArray(record.refinements) ? record.refinements : [];
  const refinements = rawRefinements.filter((item): item is LessonPlanRefinementId =>
    (KNOWN_REFINEMENTS as string[]).includes(item as string)
  );

  return {
    subject: subject as string,
    gradeLevel: gradeLevel as string,
    topic: topic as string,
    duration: duration as number,
    objectives: objectives as string,
    teachingApproach: readOptionalString(record.teachingApproach),
    studentLevel: readOptionalString(record.studentLevel),
    materials: readOptionalString(record.materials),
    assessmentPreference: readOptionalString(record.assessmentPreference),
    specialNeeds: readOptionalString(record.specialNeeds),
    additionalNotes: readOptionalString(record.additionalNotes),
    refinements,
  };
}

/**
 * Lesson Planner form → Prompt Builder → generation service (mock or
 * OpenAI, chosen server-side by `LESSON_PLAN_PROVIDER`) → validated
 * `LessonPlan`. The API key, if any, never leaves this server process.
 *
 * Called by `useLessonPlanGenerator` (via `generateLessonPlanViaApi`) for
 * every generation and regeneration — the client never builds a prompt or
 * knows which provider answered it.
 */
export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: { code: "invalid_request", message: "Gönderilen istek geçerli bir JSON değil." } },
      { status: 400 }
    );
  }

  const input = parseFormInput(body);
  if (!input) {
    return NextResponse.json(
      { error: { code: "invalid_request", message: "Gönderilen ders planı bilgileri eksik veya geçersiz." } },
      { status: 400 }
    );
  }

  try {
    const prompt = buildLessonPlanPrompt(input);
    const service = getServerLessonPlanGenerationService();
    const plan = await service.generate(prompt);
    return NextResponse.json({ plan });
  } catch (error) {
    const safe = getSafeLessonPlanErrorMessage(error);

    // Never log the API key, teacher input, or generated content. Only a
    // stable error code (always) and, outside production, the error's
    // constructor name — useful for debugging without leaking payloads.
    if (process.env.NODE_ENV !== "production") {
      console.error(
        "[EduPilot] Lesson plan generation failed:",
        safe.code,
        error instanceof Error ? error.constructor.name : typeof error
      );
    } else {
      console.error("[EduPilot] Lesson plan generation failed:", safe.code);
    }

    const status = safe.code === "invalid_request" ? 400 : safe.code === "timeout" ? 504 : 502;
    return NextResponse.json({ error: safe }, { status });
  }
}
