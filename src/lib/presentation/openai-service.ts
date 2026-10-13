/** Server-only. OpenAI ile görsel odaklı sunum üretimi (fabrika üzerinden route kullanır). */
import OpenAI, { APIConnectionTimeoutError, APIError, AuthenticationError } from "openai";

import { getOpenAiApiKey, OPENAI_PRESENTATION_MODEL, PRESENTATION_MAX_ATTEMPTS, PRESENTATION_REQUEST_TIMEOUT_MS } from "@/lib/ai/config";
import {
  assemblePresentation,
  describePresentationIssues,
  PresentationProviderError,
  type PresentationGenerationService,
} from "@/lib/presentation/generation";
import { buildPresentationJsonSchema, validatePresentationBody, type PresentationIssue } from "@/lib/presentation/schema";
import type { Presentation, PresentationPrompt } from "@/types/presentation";

function mapProviderError(error: unknown): PresentationProviderError {
  if (error instanceof PresentationProviderError) return error;
  if (error instanceof APIConnectionTimeoutError) return new PresentationProviderError("timeout", "OpenAI zaman aşımı.");
  if (error instanceof AuthenticationError) return new PresentationProviderError("missing_api_key", "Kimlik doğrulama başarısız.");
  if (error instanceof APIError) return new PresentationProviderError("provider_error", "OpenAI hatası.");
  return new PresentationProviderError("provider_error", "Beklenmeyen sağlayıcı hatası.");
}

export const openAiPresentationGenerationService: PresentationGenerationService = {
  async generate(prompt: PresentationPrompt): Promise<Presentation> {
    const apiKey = getOpenAiApiKey();
    if (!apiKey) throw new PresentationProviderError("missing_api_key", "OpenAI API anahtarı tanımlı değil.");
    const client = new OpenAI({ apiKey, timeout: PRESENTATION_REQUEST_TIMEOUT_MS });
    const schema = buildPresentationJsonSchema(prompt);
    let issues: PresentationIssue[] = [];

    for (let attempt = 1; attempt <= PRESENTATION_MAX_ATTEMPTS; attempt += 1) {
      const input =
        attempt === 1
          ? prompt.instructions
          : `${prompt.instructions}\n\nÖNCEKİ YANITIN REDDEDİLDİ. Şu sorunları düzelterek sunumu baştan üret:\n${issues.map((issue) => `- ${issue.message}`).join("\n")}`;
      let outputText: string | undefined;
      try {
        const response = await client.responses.create({
          model: OPENAI_PRESENTATION_MODEL,
          input,
          text: { format: { type: "json_schema", name: "presentation", strict: true, schema } },
        });
        outputText = response.output_text;
      } catch (error) {
        throw mapProviderError(error);
      }
      if (!outputText?.trim()) throw new PresentationProviderError("empty_response", "Boş yanıt.");

      let parsed: unknown;
      try {
        parsed = JSON.parse(outputText);
      } catch (error) {
        parsed = undefined;
        issues = [{ rule: "json", path: "root", message: `Model yanıtı geçerli JSON değil (${error instanceof Error ? error.message : "ayrıştırılamadı"}).` }];
      }
      if (parsed !== undefined) {
        const validation = validatePresentationBody(parsed, prompt);
        if (validation.body) return assemblePresentation(prompt, validation.body);
        issues = validation.issues;
      }
      console.warn(`[EduPilot] Presentation attempt ${attempt}/${PRESENTATION_MAX_ATTEMPTS} rejected (${issues.length} sorun):`);
      for (const issue of issues) console.warn(`  - [${issue.rule}] ${issue.path}: ${issue.message}`);
    }
    throw new PresentationProviderError("schema_validation_failed", describePresentationIssues(issues, 10), issues);
  },
};
