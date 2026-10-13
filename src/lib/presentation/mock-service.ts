import { assemblePresentation, PresentationProviderError, type PresentationGenerationService } from "@/lib/presentation/generation";
import { requiredActivitySlides } from "@/lib/presentation/prompt";
import { validatePresentationBody } from "@/lib/presentation/schema";
import type { Presentation, PresentationPrompt, SlideLayout } from "@/types/presentation";

/**
 * Yapay zekâ olmadan deterministik sunum (geliştirme ve testler). Gerçek
 * servisle aynı doğrulayıcıdan geçer.
 */
export const mockPresentationGenerationService: PresentationGenerationService = {
  async generate(prompt: PresentationPrompt): Promise<Presentation> {
    const { input } = prompt;
    const topic = input.topic.trim();
    const activityCount = requiredActivitySlides(input.type, input.slideCount);
    const codes = prompt.allowedOutcomeCodes.slice(0, 3);
    // Etkinlik slaytları sona doğru serpiştirilir; ilk slayt kapak, son slayt özet.
    const activityPositions = new Set(Array.from({ length: activityCount }, (_, index) => input.slideCount - 2 - index * 2));

    const slides = Array.from({ length: input.slideCount }, (_, index) => {
      const last = index === input.slideCount - 1;
      const layout: SlideLayout =
        index === 0 ? "hero-visual" : activityPositions.has(index) ? "activity-timer" : index % 2 === 1 ? "split-right-image" : "split-left-image";
      return {
        title: index === 0 ? topic.split(" ").slice(0, 5).join(" ") : last ? "Bugün Ne Öğrendik?" : `Keşif ${index}`,
        layout,
        visual: {
          type: layout === "activity-timer" ? "icon_badge" : index % 3 === 2 ? "diagram_placeholder" : "photo",
          searchKeyword: index % 3 === 2 ? "science diagram labeled" : "science classroom discovery",
          caption: "Bu görselde ilk dikkatini çeken ne?",
          icon: layout === "activity-timer" ? "users" : "lightbulb",
        },
        bullets: index === 0 ? [] : ["Gözlemle ve not al", "Arkadaşınla karşılaştır"],
        teacherNote: `${topic} konusunda sizce en şaşırtıcı şey ne olabilir?`,
        activityPrompt: layout === "activity-timer" ? "Sıra arkadaşınla 2 dakikada konuyla ilgili üç gözlem yazın ve en ilginç olanı seçin." : null,
        outcomeCodes: codes.length > 0 && index > 0 && !last ? [codes[index % codes.length]] : [],
      };
    });
    // Her seçili çıktı en az bir slayta bağlansın.
    codes.forEach((code, index) => {
      const target = slides[1 + (index % Math.max(1, input.slideCount - 2))];
      if (!target.outcomeCodes.includes(code)) target.outcomeCodes.push(code);
    });

    const validation = validatePresentationBody({ title: `${topic}: Görsel Keşif`, slides }, prompt);
    if (!validation.body) {
      throw new PresentationProviderError("schema_validation_failed", validation.issues.map((issue) => issue.message).join(" | "), validation.issues);
    }
    return assemblePresentation(prompt, validation.body);
  },
};
