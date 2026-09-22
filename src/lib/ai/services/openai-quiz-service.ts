/**
 * Server-only. Do not import this module from a client component, hook,
 * or anything bundled for the browser — it instantiates the OpenAI client
 * with a secret API key. Only `src/app/api/quizzes/generate/route.ts` (via
 * the generation-service factory) should ever import it.
 */
import OpenAI, { APIConnectionTimeoutError, AuthenticationError, APIError } from "openai";

import { getOpenAiApiKey, OPENAI_QUIZ_MODEL, QUIZ_REQUEST_TIMEOUT_MS } from "@/lib/ai/config";
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
  return new OpenAI({ apiKey, timeout: QUIZ_REQUEST_TIMEOUT_MS });
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

    let outputText: string | null | undefined;
    try {
      options?.onProgress?.(0);
      const response = await client.responses.create({
        model: OPENAI_QUIZ_MODEL,
        input: prompt.instructions,
        text: { format: { type: "json_object" } },
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
      // GEÇİCİ TEŞHİS LOGU — sorun bulununca silinecek.
      // Doğrulamanın hangi soruyu ve hangi alanı reddettiğini terminale döker.
      console.error("[EduPilot] validation issues:", JSON.stringify(validation.issues, null, 2));
      throw new QuizProviderError("schema_validation_failed", "Model yanıtı beklenen yapıya uymuyor.");
    }

    options?.onProgress?.(2);

    return validation.data;
  },
};