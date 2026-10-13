/** Server-only. Sunum üretim servisini sağlayıcı ayarına göre seçer. */
import { getPresentationProvider } from "@/lib/ai/config";
import type { PresentationGenerationService } from "@/lib/presentation/generation";
import { mockPresentationGenerationService } from "@/lib/presentation/mock-service";
import { openAiPresentationGenerationService } from "@/lib/presentation/openai-service";

export function getServerPresentationGenerationService(): PresentationGenerationService {
  return getPresentationProvider() === "openai" ? openAiPresentationGenerationService : mockPresentationGenerationService;
}
