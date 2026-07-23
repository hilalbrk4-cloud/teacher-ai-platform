/**
 * Typed error for anything that can go wrong while generating a lesson
 * plan through a real AI provider. Carries only a stable `code` — never a
 * raw provider message — so callers (the API route) can always produce a
 * safe Turkish message without risking leaking provider/API-key details.
 */
export type LessonPlanProviderErrorCode =
  | "missing_api_key"
  | "invalid_request"
  | "provider_error"
  | "timeout"
  | "empty_response"
  | "invalid_json"
  | "schema_validation_failed";

export class LessonPlanProviderError extends Error {
  readonly code: LessonPlanProviderErrorCode;

  constructor(code: LessonPlanProviderErrorCode, message: string) {
    super(message);
    this.name = "LessonPlanProviderError";
    this.code = code;
  }
}

const SAFE_MESSAGES: Record<LessonPlanProviderErrorCode, string> = {
  missing_api_key: "Yapay zekâ servisi şu anda yapılandırılmamış. Lütfen daha sonra tekrar deneyin.",
  invalid_request: "Gönderilen ders planı bilgileri eksik veya geçersiz.",
  provider_error: "Ders planı oluşturulurken bir sorun oluştu. Lütfen tekrar deneyin.",
  timeout: "Ders planı oluşturma işlemi zaman aşımına uğradı. Lütfen tekrar deneyin.",
  empty_response: "Yapay zekâdan geçerli bir yanıt alınamadı. Lütfen tekrar deneyin.",
  invalid_json: "Yapay zekâ yanıtı işlenemedi. Lütfen tekrar deneyin.",
  schema_validation_failed: "Oluşturulan ders planı beklenen yapıya uymadığı için kullanılamadı. Lütfen tekrar deneyin.",
};

export interface SafeLessonPlanError {
  code: LessonPlanProviderErrorCode;
  message: string;
}

/**
 * Converts any thrown value into a safe, Turkish, teacher-facing error.
 * Never includes the original provider error message, stack trace, or
 * anything that could reveal implementation/provider details.
 */
export function getSafeLessonPlanErrorMessage(error: unknown): SafeLessonPlanError {
  if (error instanceof LessonPlanProviderError) {
    return { code: error.code, message: SAFE_MESSAGES[error.code] };
  }
  return { code: "provider_error", message: SAFE_MESSAGES.provider_error };
}
