import { createLessonPlannerId } from "@/lib/lesson-planner/id";
import { PRESENTATION_RULE_LABELS, type PresentationBody, type PresentationIssue } from "@/lib/presentation/schema";
import type { Presentation, PresentationPrompt } from "@/types/presentation";

export type PresentationErrorCode =
  | "missing_api_key"
  | "provider_error"
  | "timeout"
  | "empty_response"
  | "schema_validation_failed";

export class PresentationProviderError extends Error {
  readonly code: PresentationErrorCode;
  readonly issues: PresentationIssue[];

  constructor(code: PresentationErrorCode, message: string, issues: PresentationIssue[] = []) {
    super(message);
    this.name = "PresentationProviderError";
    this.code = code;
    this.issues = issues;
  }
}

export function describePresentationIssues(issues: PresentationIssue[], limit = 3): string {
  const lines = issues.slice(0, limit).map((issue) => `${PRESENTATION_RULE_LABELS[issue.rule]}: ${issue.message}`);
  return lines.join(" · ") + (issues.length > limit ? ` (+${issues.length - limit} sorun daha)` : "");
}

const SAFE_MESSAGES: Record<PresentationErrorCode, string> = {
  missing_api_key: "Yapay zekâ servisi şu anda yapılandırılmamış. Lütfen daha sonra tekrar deneyin.",
  provider_error: "Sunum oluşturulurken bir sorun oluştu. Lütfen tekrar deneyin.",
  timeout: "Sunum oluşturma işlemi zaman aşımına uğradı. Lütfen tekrar deneyin.",
  empty_response: "Yapay zekâdan geçerli bir yanıt alınamadı. Lütfen tekrar deneyin.",
  schema_validation_failed: "Oluşturulan sunum kalite kontrollerinden geçemedi. Lütfen tekrar deneyin.",
};

export interface SafePresentationError {
  code: PresentationErrorCode;
  message: string;
  details?: { rule: string; label: string; message: string }[];
}

/** Öğretmene hangi kuralın geçmediğini söyler; yalnızca EduPilot'ın kendi doğrulama metinleri. */
export function getSafePresentationError(error: unknown): SafePresentationError {
  if (!(error instanceof PresentationProviderError)) return { code: "provider_error", message: SAFE_MESSAGES.provider_error };
  if (error.code === "schema_validation_failed" && error.issues.length > 0) {
    return {
      code: error.code,
      message: `Sunum kalite kontrolünden geçemedi — ${describePresentationIssues(error.issues, 2)} Lütfen tekrar deneyin.`,
      details: error.issues.map((issue) => ({ rule: issue.rule, label: PRESENTATION_RULE_LABELS[issue.rule], message: issue.message })),
    };
  }
  return { code: error.code, message: SAFE_MESSAGES[error.code] };
}

export interface PresentationGenerationService {
  generate(prompt: PresentationPrompt): Promise<Presentation>;
}

export function assemblePresentation(prompt: PresentationPrompt, body: PresentationBody): Presentation {
  const { input } = prompt;
  return {
    id: createLessonPlannerId("sunum"),
    subject: input.subject.trim(),
    gradeLevel: input.gradeLevel.trim(),
    topic: input.topic.trim(),
    type: input.type,
    slideCount: input.slideCount,
    title: body.title,
    slides: body.slides,
    curriculum: prompt.curriculum,
    generatedAt: new Date().toISOString(),
  };
}
