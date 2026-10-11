/**
 * Server-only. Do not import this module from a client component, hook,
 * or anything bundled for the browser — it instantiates the OpenAI client
 * with a secret API key. Only `src/app/api/lesson-plans/generate/route.ts`
 * (via the generation-service factory) should ever import it.
 */
import OpenAI, { APIConnectionTimeoutError, AuthenticationError, APIError } from "openai";

import {
  getOpenAiApiKey,
  LESSON_PLAN_MAX_ATTEMPTS,
  LESSON_PLAN_REQUEST_TIMEOUT_MS,
  OPENAI_LESSON_PLAN_MODEL,
} from "@/lib/ai/config";
import { LessonPlanProviderError } from "@/lib/ai/services/lesson-plan-provider-error";
import {
  buildLessonPlanJsonSchema,
  validateLessonPlanBody,
  type LessonPlanValidationIssue,
} from "@/lib/ai/schemas/lesson-plan-schema";
import { applyOfficialCurriculum } from "@/lib/curriculum/apply";
import { isFiveEPhase } from "@/lib/lesson-planner/five-e";
import { createLessonPlannerId } from "@/lib/lesson-planner/id";
import type {
  GenerateLessonPlanOptions,
  LessonPlanGenerationService,
} from "@/lib/lesson-planner/generation-service";
import type { LessonPlan, LessonPlanPrompt } from "@/types/lesson-planner";

function createClient(): OpenAI {
  const apiKey = getOpenAiApiKey();
  if (!apiKey) {
    throw new LessonPlanProviderError("missing_api_key", "OpenAI API anahtarı tanımlı değil.");
  }
  return new OpenAI({ apiKey, timeout: LESSON_PLAN_REQUEST_TIMEOUT_MS });
}

function mapProviderError(error: unknown): LessonPlanProviderError {
  if (error instanceof LessonPlanProviderError) return error;

  if (error instanceof APIConnectionTimeoutError) {
    return new LessonPlanProviderError("timeout", "OpenAI isteği zaman aşımına uğradı.");
  }
  if (error instanceof AuthenticationError) {
    return new LessonPlanProviderError("missing_api_key", "OpenAI kimlik doğrulaması başarısız oldu.");
  }
  if (error instanceof APIError) {
    return new LessonPlanProviderError("provider_error", "OpenAI sağlayıcısında bir sorun oluştu.");
  }

  return new LessonPlanProviderError("provider_error", "Yapay zekâ sağlayıcısında beklenmeyen bir sorun oluştu.");
}

function retryInstructions(prompt: LessonPlanPrompt, issues: LessonPlanValidationIssue[]): string {
  const issueLines = issues.map((issue) => `- ${issue.message}`).join("\n");
  return `${prompt.instructions}\n\nÖNCEKİ YANITIN REDDEDİLDİ. Şu sorunları düzelterek planı baştan üret:\n${issueLines}`;
}

/**
 * Real AI implementation of `LessonPlanGenerationService`. Sends the
 * Prompt Builder's compiled `instructions` to OpenAI's Responses API with a
 * strict JSON schema (section keys and TYMM skill labels are enums), then
 * validates the body for the selected lesson model — a 5E plan must contain
 * exactly the five phases and an exit ticket in "degerlendirme". A response
 * that fails validation is regenerated once with the issues fed back.
 *
 * Phase time ranges are never taken from the model: they come from the
 * prompt context (computed by code, summing exactly to the lesson duration).
 *
 * Never logs the API key. Never logs teacher input or generated content —
 * callers are responsible for their own safe logging (see the API route).
 */
export const openAiLessonPlanGenerationService: LessonPlanGenerationService = {
  async generate(prompt: LessonPlanPrompt, options?: GenerateLessonPlanOptions): Promise<LessonPlan> {
    const client = createClient();
    const schema = buildLessonPlanJsonSchema(prompt.model);
    let issues: LessonPlanValidationIssue[] = [];

    options?.onProgress?.(0);
    for (let attempt = 1; attempt <= LESSON_PLAN_MAX_ATTEMPTS; attempt += 1) {
      let outputText: string | null | undefined;
      try {
        const response = await client.responses.create({
          model: OPENAI_LESSON_PLAN_MODEL,
          input: attempt === 1 ? prompt.instructions : retryInstructions(prompt, issues),
          text: { format: { type: "json_schema", name: "lesson_plan", strict: true, schema } },
        });
        outputText = response.output_text;
      } catch (error) {
        throw mapProviderError(error);
      }
      options?.onProgress?.(1);

      if (!outputText || !outputText.trim()) {
        throw new LessonPlanProviderError("empty_response", "Model boş bir yanıt döndürdü.");
      }

      let parsed: unknown;
      try {
        parsed = JSON.parse(outputText);
      } catch {
        throw new LessonPlanProviderError("invalid_json", "Model geçerli bir JSON yanıtı döndürmedi.");
      }

      const validation = validateLessonPlanBody(parsed, prompt.model);
      if (!validation.sections || !validation.skills) {
        issues = validation.issues;
        console.warn(
          `[EduPilot] Lesson plan attempt ${attempt} rejected:`,
          issues.map((issue) => `${issue.path}: ${issue.message}`).join(" | ")
        );
        continue;
      }

      options?.onProgress?.(2);

      // Only the model's section content and skill labels are trusted.
      // Identity/metadata fields and phase time ranges always come from what
      // the server already knows (the prompt context, a fresh id/timestamp).
      const ranges = prompt.phaseTimeRanges;
      return applyOfficialCurriculum({
        id: createLessonPlannerId("plan"),
        subject: prompt.subject,
        gradeLevel: prompt.gradeLevel,
        topic: prompt.topic,
        duration: prompt.durationMinutes,
        generatedAt: new Date().toISOString(),
        model: prompt.model,
        skills: validation.skills,
        sections: validation.sections.map((section) =>
          ranges && isFiveEPhase(section.key) ? { ...section, timeRange: ranges[section.key] } : section
        ),
      }, prompt.officialCurriculum);
    }

    throw new LessonPlanProviderError("schema_validation_failed", "Model yanıtı beklenen yapıya uymuyor.");
  },
};
