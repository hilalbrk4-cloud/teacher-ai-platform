/**
 * Server-only. OpenAI Responses API ile rubrik üretimi; yalnızca
 * `src/app/api/rubrics/generate/route.ts` (fabrika üzerinden) kullanır.
 */
import OpenAI, { APIConnectionTimeoutError, APIError, AuthenticationError } from "openai";

import { getOpenAiApiKey, OPENAI_RUBRIC_MODEL, RUBRIC_MAX_ATTEMPTS, RUBRIC_REQUEST_TIMEOUT_MS } from "@/lib/ai/config";
import { assembleRubric, describeIssues, RubricProviderError, type RubricGenerationService } from "@/lib/rubric/generation";
import { buildRubricJsonSchema, validateRubricBody, type RubricValidationIssue } from "@/lib/rubric/schema";
import type { Rubric, RubricPrompt } from "@/types/rubric";

function mapProviderError(error: unknown): RubricProviderError {
  if (error instanceof RubricProviderError) return error;
  if (error instanceof APIConnectionTimeoutError) return new RubricProviderError("timeout", "OpenAI zaman aşımı.");
  if (error instanceof AuthenticationError) return new RubricProviderError("missing_api_key", "Kimlik doğrulama başarısız.");
  if (error instanceof APIError) return new RubricProviderError("provider_error", "OpenAI hatası.");
  return new RubricProviderError("provider_error", "Beklenmeyen sağlayıcı hatası.");
}

function retryInstructions(prompt: RubricPrompt, issues: RubricValidationIssue[]): string {
  const lines = issues.map((issue) => `- ${issue.message}`).join("\n");
  return `${prompt.instructions}\n\nÖNCEKİ YANITIN REDDEDİLDİ. Şu sorunları düzelterek rubriği baştan üret:\n${lines}`;
}

/**
 * Katı JSON şemasıyla üretir, çift görünüm ve TYMM kriter havuzu kurallarını
 * doğrular; reddedilen yanıt sorunlar geri bildirilerek bir kez yeniden
 * üretilir. Puanlar her zaman koddan gelir.
 */
export const openAiRubricGenerationService: RubricGenerationService = {
  async generate(prompt: RubricPrompt): Promise<Rubric> {
    const apiKey = getOpenAiApiKey();
    if (!apiKey) throw new RubricProviderError("missing_api_key", "OpenAI API anahtarı tanımlı değil.");
    const client = new OpenAI({ apiKey, timeout: RUBRIC_REQUEST_TIMEOUT_MS });
    const schema = buildRubricJsonSchema(prompt);
    let issues: RubricValidationIssue[] = [];

    for (let attempt = 1; attempt <= RUBRIC_MAX_ATTEMPTS; attempt += 1) {
      let outputText: string | undefined;
      try {
        const response = await client.responses.create({
          model: OPENAI_RUBRIC_MODEL,
          input: attempt === 1 ? prompt.instructions : retryInstructions(prompt, issues),
          text: { format: { type: "json_schema", name: "rubric", strict: true, schema } },
        });
        outputText = response.output_text;
      } catch (error) {
        throw mapProviderError(error);
      }
      if (!outputText?.trim()) throw new RubricProviderError("empty_response", "Boş yanıt.");

      let parsed: unknown;
      try {
        parsed = JSON.parse(outputText);
      } catch (error) {
        // Kesik/bozuk JSON da yeniden denenir; kural adıyla raporlanır.
        parsed = undefined;
        issues = [{ rule: "json", path: "root", message: `Model yanıtı geçerli JSON değil (${error instanceof Error ? error.message : "ayrıştırılamadı"}).` }];
      }

      if (parsed !== undefined) {
        const validation = validateRubricBody(parsed, prompt);
        if (validation.body) return assembleRubric(prompt, validation.body);
        issues = validation.issues;
      }
      console.warn(`[EduPilot] Rubric attempt ${attempt}/${RUBRIC_MAX_ATTEMPTS} rejected (${issues.length} sorun):`);
      for (const issue of issues) console.warn(`  - [${issue.rule}] ${issue.path}: ${issue.message}`);
    }
    throw new RubricProviderError("schema_validation_failed", describeIssues(issues, 10), issues);
  },
};
