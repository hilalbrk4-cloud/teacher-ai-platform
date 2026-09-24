/**
 * Server-only. Do not import this module from a client component, hook,
 * or anything bundled for the browser — it instantiates the OpenAI client
 * with a secret API key. Only `src/app/api/quizzes/generate/route.ts` (via
 * the generation-service factory) should ever import it.
 */
import OpenAI, { APIConnectionTimeoutError, AuthenticationError, APIError } from "openai";

import { getOpenAiApiKey, OPENAI_QUIZ_MODEL, QUIZ_REQUEST_TIMEOUT_MS } from "@/lib/ai/config";
import { buildQuizResponseJsonSchema } from "@/lib/ai/schemas/quiz-response-json-schema";
import { validateQuizResponse } from "@/lib/ai/schemas/quiz-schema";
import { QuizProviderError } from "@/lib/ai/services/quiz-provider-error";
import type { GenerateQuizOptions, QuizGenerationService } from "@/lib/quiz-generator/generation-service";
import type { QuizPrompt } from "@/types/quiz-blueprint";
import type { Quiz } from "@/types/quiz-generator";

function createClient(): OpenAI {
  const apiKey = getOpenAiApiKey();
  if (!apiKey) {
    throw new QuizProviderError("missing_api_key", "OpenAI API anahtarı tanımlı değil.");
  }
  // One SDK-level retry covers transient timeouts and rate limits (429);
  // content failures are retried per batch by `generateQuizInBatches`.
  return new OpenAI({ apiKey, timeout: QUIZ_REQUEST_TIMEOUT_MS, maxRetries: 1 });
}

function mapProviderError(error: unknown): QuizProviderError {
  if (error instanceof QuizProviderError) return error;

  if (error instanceof APIConnectionTimeoutError) {
    return new QuizProviderError("timeout", "OpenAI isteği zaman aşımına uğradı.");
  }
  if (error instanceof AuthenticationError) {
    return new QuizProviderError("missing_api_key", "OpenAI kimlik doğrulaması başarısız oldu.");
  }
  if (error instanceof APIError) {
    return new QuizProviderError("provider_error", "OpenAI sağlayıcısında bir sorun oluştu.");
  }

  return new QuizProviderError("provider_error", "Yapay zekâ sağlayıcısında beklenmeyen bir sorun oluştu.");
}

/**
 * Real AI implementation of `QuizGenerationService`. Sends the Prompt
 * Builder's compiled `instructions` (built from the `QuizBlueprint`, never
 * the raw form) to OpenAI's Responses API, then validates the JSON result
 * against `validateQuizResponse` — which cross-checks every question
 * against its blueprint slot — before ever trusting it as a `Quiz`.
 *
 * Never logs the API key. Never logs teacher input or generated content.
 */
export const openAiQuizGenerationService: QuizGenerationService = {
  async generate(prompt: QuizPrompt, options?: GenerateQuizOptions): Promise<Quiz> {
    const client = createClient();

    // Strict structured outputs whenever the whole response shape is
    // expressible as a schema (field names, required fields and enums are
    // then guaranteed); plain JSON mode for batches with free-form visuals.
    const jsonSchema = buildQuizResponseJsonSchema(prompt);

    let outputText: string | null | undefined;
    try {
      options?.onProgress?.(0);
      const response = await client.responses.create({
        model: OPENAI_QUIZ_MODEL,
        input: prompt.instructions,
        text: {
          format: jsonSchema
            ? { type: "json_schema", name: "quiz", schema: jsonSchema, strict: true }
            : { type: "json_object" },
        },
        max_output_tokens: 6000,
      });
      options?.onProgress?.(1);
      outputText = response.output_text;
    } catch (error) {
      throw mapProviderError(error);
    }

    if (!outputText || !outputText.trim()) {
      throw new QuizProviderError("empty_response", "Model boş bir yanıt döndürdü.");
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(outputText);
    } catch {
      throw new QuizProviderError("invalid_json", "Model geçerli bir JSON yanıtı döndürmedi.");
    }

    const validation = validateQuizResponse(parsed, prompt);
    if (!validation.success) {
      // Dev-only diagnostic: which field of which question was rejected.
      // Issue paths/messages carry structure only, never teacher input.
      if (process.env.NODE_ENV !== "production") {
        console.error("[EduPilot] Quiz batch validation issues:", JSON.stringify(validation.issues, null, 2));
        console.error(
          `[EduPilot] Quiz batch raw model output (format: ${jsonSchema ? "json_schema strict" : "json_object"}):\n` +
            JSON.stringify(parsed, null, 2)
        );
      }
      throw new QuizProviderError("schema_validation_failed", "Model yanıtı beklenen yapıya uymuyor.");
    }

    options?.onProgress?.(2);

    return validation.data;
  },
};