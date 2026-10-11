import { createLessonPlannerId } from "@/lib/lesson-planner/id";
import { RUBRIC_RULE_LABELS, type RubricBody, type RubricValidationIssue } from "@/lib/rubric/schema";
import type { Rubric, RubricPrompt } from "@/types/rubric";

export type RubricProviderErrorCode =
  | "missing_api_key"
  | "invalid_request"
  | "provider_error"
  | "timeout"
  | "empty_response"
  | "invalid_json"
  | "schema_validation_failed";

/** Yalnızca kararlı bir kod taşır; sağlayıcının ham mesajı öğretmene asla gösterilmez. */
export class RubricProviderError extends Error {
  readonly code: RubricProviderErrorCode;
  /** Kalite kontrolünde bozulan kurallar (son denemenin sorunları). */
  readonly issues: RubricValidationIssue[];

  constructor(code: RubricProviderErrorCode, message: string, issues: RubricValidationIssue[] = []) {
    super(message);
    this.name = "RubricProviderError";
    this.code = code;
    this.issues = issues;
  }
}

/** "Kazanım kapsamı: Şu öğrenme çıktıları… · Öğrenci dili: …" — konsol ve kullanıcı için kural adıyla. */
export function describeIssues(issues: RubricValidationIssue[], limit = 3): string {
  const lines = issues.slice(0, limit).map((issue) => `${RUBRIC_RULE_LABELS[issue.rule]}: ${issue.message}`);
  const more = issues.length > limit ? ` (+${issues.length - limit} sorun daha)` : "";
  return lines.join(" · ") + more;
}

const SAFE_MESSAGES: Record<RubricProviderErrorCode, string> = {
  missing_api_key: "Yapay zekâ servisi şu anda yapılandırılmamış. Lütfen daha sonra tekrar deneyin.",
  invalid_request: "Gönderilen rubrik bilgileri eksik veya geçersiz.",
  provider_error: "Rubrik oluşturulurken bir sorun oluştu. Lütfen tekrar deneyin.",
  timeout: "Rubrik oluşturma işlemi zaman aşımına uğradı. Lütfen tekrar deneyin.",
  empty_response: "Yapay zekâdan geçerli bir yanıt alınamadı. Lütfen tekrar deneyin.",
  invalid_json: "Yapay zekâ yanıtı işlenemedi. Lütfen tekrar deneyin.",
  schema_validation_failed: "Oluşturulan rubrik kalite kontrollerinden geçemedi. Lütfen tekrar deneyin.",
  // Not: schema_validation_failed için getSafeRubricError, bozulan kuralı içeren ayrıntılı mesaj üretir.
};

export interface SafeRubricError {
  code: RubricProviderErrorCode;
  message: string;
  /** Hangi kalite kuralının geçmediği; yalnızca EduPilot'ın kendi doğrulama metinleri (sağlayıcı ayrıntısı yok). */
  details?: { rule: string; label: string; message: string }[];
}

export function getSafeRubricError(error: unknown): SafeRubricError {
  if (!(error instanceof RubricProviderError)) return { code: "provider_error", message: SAFE_MESSAGES.provider_error };
  if (error.code === "schema_validation_failed" && error.issues.length > 0) {
    return {
      code: error.code,
      message: `Rubrik kalite kontrolünden geçemedi — ${describeIssues(error.issues, 2)} Lütfen tekrar deneyin.`,
      details: error.issues.map((issue) => ({ rule: issue.rule, label: RUBRIC_RULE_LABELS[issue.rule], message: issue.message })),
    };
  }
  return { code: error.code, message: SAFE_MESSAGES[error.code] };
}

export interface RubricGenerationService {
  generate(prompt: RubricPrompt): Promise<Rubric>;
}

/** Doğrulanmış gövdeyi öğretmen girdileri ve resmî müfredat bağlamıyla tam rubriğe çevirir. */
export function assembleRubric(prompt: RubricPrompt, body: RubricBody): Rubric {
  const { input } = prompt;
  return {
    id: createLessonPlannerId("rubric"),
    subject: input.subject.trim(),
    gradeLevel: input.gradeLevel.trim(),
    topic: input.topic.trim(),
    taskType: input.taskType,
    rubricType: input.rubricType,
    scale: input.scale,
    ...body,
    curriculum: prompt.curriculum,
    generatedAt: new Date().toISOString(),
  };
}
