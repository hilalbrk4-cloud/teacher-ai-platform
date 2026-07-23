/**
 * Server-only. Do not import this module from a client component, hook,
 * or anything bundled for the browser — it instantiates the OpenAI client
 * with a secret API key. Only `src/app/api/lesson-plans/generate/route.ts`
 * (via the generation-service factory) should ever import it.
 */
import OpenAI, { APIConnectionTimeoutError, AuthenticationError, APIError } from "openai";

import { getOpenAiApiKey, LESSON_PLAN_REQUEST_TIMEOUT_MS, OPENAI_LESSON_PLAN_MODEL } from "@/lib/ai/config";
import { LessonPlanProviderError } from "@/lib/ai/services/lesson-plan-provider-error";
import { validateLessonPlanResponse } from "@/lib/ai/schemas/lesson-plan-schema";
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

/**
 * Real AI implementation of `LessonPlanGenerationService`. Sends the
 * Prompt Builder's compiled `instructions` to OpenAI's Responses API,
 * requests JSON-only output, then parses and validates the result against
 * `validateLessonPlanResponse` before ever trusting it as a `LessonPlan`.
 *
 * Never logs the API key. Never logs teacher input or generated content —
 * callers are responsible for their own safe logging (see the API route).
 */
export const openAiLessonPlanGenerationService: LessonPlanGenerationService = {
  async generate(prompt: LessonPlanPrompt, options?: GenerateLessonPlanOptions): Promise<LessonPlan> {
    const client = createClient();

    let outputText: string | null | undefined;
    try {
      options?.onProgress?.(0);
      const response = await client.responses.create({
        model: OPENAI_LESSON_PLAN_MODEL,
        input: prompt.instructions,
        text: { format: { type: "json_object" } },
      });
      options?.onProgress?.(1);
      outputText = response.output_text;
    } catch (error) {
      throw mapProviderError(error);
    }

    if (!outputText || !outputText.trim()) {
      throw new LessonPlanProviderError("empty_response", "Model boş bir yanıt döndürdü.");
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(outputText);
    } catch {
      throw new LessonPlanProviderError("invalid_json", "Model geçerli bir JSON yanıtı döndürmedi.");
    }

    const validation = validateLessonPlanResponse(parsed);
    if (!validation.success) {
      throw new LessonPlanProviderError("schema_validation_failed", "Model yanıtı beklenen yapıya uymuyor.");
    }

    options?.onProgress?.(2);

    // Only the model's generated section content is trusted from its
    // response. Identity/metadata fields are always set from what the
    // server already knows (the original prompt context, plus a freshly
    // generated id/timestamp) so a model paraphrasing the teacher's inputs
    // — or producing a malformed id/timestamp — can never affect the result,
    // even though the response shape it's asked for includes those fields.
    return {
      ...validation.data,
      id: createLessonPlannerId("plan"),
      subject: prompt.subject,
      gradeLevel: prompt.gradeLevel,
      topic: prompt.topic,
      duration: prompt.durationMinutes,
      generatedAt: new Date().toISOString(),
    };
  },
};
