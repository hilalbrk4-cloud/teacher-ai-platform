import type { QuizQuestion } from "@/types/quiz-generator";

/**
 * Typed error for anything that can go wrong while generating a quiz
 * through a real AI provider. Carries only a stable `code` — never a raw
 * provider message — so callers (the API route) can always produce a safe
 * Turkish message without risking leaking provider/API-key details.
 */
export type QuizProviderErrorCode =
  | "missing_api_key"
  | "invalid_request"
  | "provider_error"
  | "timeout"
  | "empty_response"
  | "invalid_json"
  | "schema_validation_failed";

/**
 * Attached to a `schema_validation_failed` error when the response had the
 * right shape: the questions that DID pass (by position) and why the others
 * failed, so the caller can keep the good ones and retry only the rest.
 * Server-side only — never sent to the client.
 */
export interface QuizPartialValidation {
  partial: (QuizQuestion | undefined)[];
  issues: { path: string; message: string }[];
  title?: string;
}

export class QuizProviderError extends Error {
  readonly code: QuizProviderErrorCode;
  readonly validation?: QuizPartialValidation;

  constructor(code: QuizProviderErrorCode, message: string, validation?: QuizPartialValidation) {
    super(message);
    this.name = "QuizProviderError";
    this.code = code;
    this.validation = validation;
  }
}

const SAFE_MESSAGES: Record<QuizProviderErrorCode, string> = {
  missing_api_key: "Yapay zekâ servisi şu anda yapılandırılmamış. Lütfen daha sonra tekrar deneyin.",
  invalid_request: "Gönderilen sınav bilgileri eksik veya geçersiz.",
  provider_error: "Sınav oluşturulurken bir sorun oluştu. Lütfen tekrar deneyin.",
  timeout: "Sınav oluşturma işlemi zaman aşımına uğradı. Lütfen tekrar deneyin.",
  empty_response: "Yapay zekâdan geçerli bir yanıt alınamadı. Lütfen tekrar deneyin.",
  invalid_json: "Yapay zekâ yanıtı işlenemedi. Lütfen tekrar deneyin.",
  schema_validation_failed: "Oluşturulan sınav beklenen yapıya uymadığı için kullanılamadı. Lütfen tekrar deneyin.",
};

export interface SafeQuizError {
  code: QuizProviderErrorCode;
  message: string;
}

/**
 * Converts any thrown value into a safe, Turkish, teacher-facing error.
 * Never includes the original provider error message, stack trace, or
 * anything that could reveal implementation/provider details.
 */
export function getSafeQuizErrorMessage(error: unknown): SafeQuizError {
  if (error instanceof QuizProviderError) {
    return { code: error.code, message: SAFE_MESSAGES[error.code] };
  }
  return { code: "provider_error", message: SAFE_MESSAGES.provider_error };
}
