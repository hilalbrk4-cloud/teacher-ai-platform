import { NextResponse } from "next/server";

import { buildQuizBlueprint } from "@/lib/ai/blueprint/quiz-blueprint";
import { deriveQuizPackContext } from "@/lib/ai/prompts/quiz-generator-knowledge-pack-blocks";
import { getServerQuizGenerationService } from "@/lib/ai/services/quiz-generation-service-factory";
import { getSafeQuizErrorMessage } from "@/lib/ai/services/quiz-provider-error";
import { createProductionKnowledgePackRegistry } from "@/lib/knowledge/registry/production-registry";
import { resolveKnowledgePackForQuiz } from "@/lib/knowledge/registry/resolve-pack-for-quiz";
import { generateQuizInBatches } from "@/lib/quiz-generator/batch-generation";
import {
  COGNITIVE_LEVELS,
  DIFFICULTY_LEVELS,
  QUESTION_APPROACHES,
  QUESTION_TYPES,
  QUIZ_TYPES,
  VISUAL_TYPES,
  VISUAL_USAGE_OPTIONS,
} from "@/types/quiz-generator";
import type {
  CognitiveLevel,
  DifficultyLevel,
  QuestionApproach,
  QuestionType,
  QuizFormInput,
  QuizType,
  VisualType,
  VisualUsage,
} from "@/types/quiz-generator";

export const runtime = "nodejs";

// Batches run in parallel, but a batch that fails validation is
// regenerated once; this leaves room for that worst case on hosts that cap
// route duration.
export const maxDuration = 120;

function readEnumOrDefault<T extends string>(value: unknown, allowed: readonly T[], fallback: T): T {
  return typeof value === "string" && (allowed as readonly string[]).includes(value) ? (value as T) : fallback;
}

function readQuestionTypes(value: unknown): QuestionType[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is QuestionType => (QUESTION_TYPES as readonly string[]).includes(item as string));
}

function readVisualTypes(value: unknown): VisualType[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is VisualType => (VISUAL_TYPES as readonly string[]).includes(item as string));
}

/**
 * Turns an untrusted request body into a typed `QuizFormInput`, or `null`
 * if it's missing/malformed. This is the server-side trust boundary — the
 * browser can send anything, so required fields are re-checked here
 * independent of client-side form validation.
 */
function parseFormInput(body: unknown): QuizFormInput | null {
  if (typeof body !== "object" || body === null) return null;
  const record = body as Record<string, unknown>;

  const { subject, gradeLevel, topic, objectives, questionCount } = record;

  const hasRequiredStrings =
    typeof subject === "string" &&
    subject.trim().length > 0 &&
    typeof gradeLevel === "string" &&
    gradeLevel.trim().length > 0 &&
    typeof topic === "string" &&
    topic.trim().length > 0 &&
    typeof objectives === "string" &&
    objectives.trim().length > 0;

  const hasValidQuestionCount =
    typeof questionCount === "number" && Number.isFinite(questionCount) && questionCount > 0 && questionCount <= 50;

  const questionTypes = readQuestionTypes(record.questionTypes);

  if (!hasRequiredStrings || !hasValidQuestionCount || questionTypes.length === 0) {
    return null;
  }

  const difficulty = readEnumOrDefault<DifficultyLevel | "mixed">(
    record.difficulty,
    [...DIFFICULTY_LEVELS, "mixed"],
    "medium"
  );

  return {
    quizType: readEnumOrDefault<QuizType>(record.quizType, QUIZ_TYPES, "classroomQuiz"),
    subject: subject as string,
    gradeLevel: gradeLevel as string,
    topic: topic as string,
    objectives: objectives as string,
    questionCount: Math.floor(questionCount as number),
    questionTypes,
    questionApproach: readEnumOrDefault<QuestionApproach>(record.questionApproach, QUESTION_APPROACHES, "learningCheck"),
    cognitiveLevel: readEnumOrDefault<CognitiveLevel>(record.cognitiveLevel, COGNITIVE_LEVELS, "understand"),
    difficulty,
    visualUsage: readEnumOrDefault<VisualUsage>(record.visualUsage, VISUAL_USAGE_OPTIONS, "none"),
    visualTypes: readVisualTypes(record.visualTypes),
    includeAnswerKey: record.includeAnswerKey === true,
    includeExplanations: record.includeExplanations === true,
  };
}

/**
 * Dev-only diagnostic: resolution mode, matched pack id, and content
 * version — never the teacher's input, never raw pack content, never the
 * compiled prompt.
 */
function logKnowledgePackResolution(outcome: ReturnType<typeof resolveKnowledgePackForQuiz>): void {
  if (process.env.NODE_ENV === "production") return;

  const id =
    outcome.mode === "resolvedVerified" || outcome.mode === "resolvedDraftPreview"
      ? outcome.pack.id
      : outcome.mode === "inactive"
        ? outcome.matched?.id
        : undefined;
  const contentVersion =
    outcome.mode === "resolvedVerified" || outcome.mode === "resolvedDraftPreview"
      ? outcome.pack.contentVersion
      : outcome.mode === "inactive"
        ? outcome.matched?.contentVersion
        : undefined;

  console.info("[EduPilot] Knowledge Pack resolution:", { mode: outcome.mode, id, contentVersion });
}

/**
 * Quiz form → Question Blueprint → Knowledge Pack resolution → Prompt
 * Builder → generation service (mock or OpenAI, chosen server-side by
 * `QUIZ_PROVIDER`) → validated `Quiz`. The API key, if any, never leaves
 * this server process.
 *
 * The Blueprint is built here, server-side, from the raw form input —
 * the client never sees or influences it directly, and the Prompt Builder
 * never sees the raw form at all. Knowledge Pack resolution is fully
 * separate from prompt construction: a missing, inactive, invalid, or
 * ambiguous pack always falls back to the exact pre-integration prompt.
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
      { error: { code: "invalid_request", message: "Gönderilen sınav bilgileri eksik veya geçersiz." } },
      { status: 400 }
    );
  }

  try {
    const blueprint = buildQuizBlueprint(input);

    const registry = createProductionKnowledgePackRegistry();
    const resolutionOutcome = resolveKnowledgePackForQuiz(blueprint, registry);
    logKnowledgePackResolution(resolutionOutcome);
    const packContext = deriveQuizPackContext(resolutionOutcome);

    const service = getServerQuizGenerationService();
    const quiz = await generateQuizInBatches(blueprint, packContext, service);
    return NextResponse.json({ quiz });
  } catch (error) {
    const safe = getSafeQuizErrorMessage(error);

    // Never log the API key, teacher input, or generated content. Only a
    // stable error code (always) and, outside production, the error's
    // constructor name — useful for debugging without leaking payloads.
    if (process.env.NODE_ENV !== "production") {
      console.error(
        "[EduPilot] Quiz generation failed:",
        safe.code,
        error instanceof Error ? error.constructor.name : typeof error
      );
    } else {
      console.error("[EduPilot] Quiz generation failed:", safe.code);
    }

    const status = safe.code === "invalid_request" ? 400 : safe.code === "timeout" ? 504 : 502;
    return NextResponse.json({ error: safe }, { status });
  }
}
