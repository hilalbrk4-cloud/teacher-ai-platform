import * as React from "react";

import {
  GORSEL_SORU_REGISTRY,
  type GorselSoruKaydi,
} from "@/components/features/quiz-generator/gorsel-sorular/registry";
import type { GorselSoruTipi } from "@/types/gorsel-soru";
import type { Dictionary } from "@/types/i18n";
import type { GorselSoruQuestion } from "@/types/quiz-generator";

interface GorselSoruRouterProps {
  question: GorselSoruQuestion;
  soruKoku: React.ReactNode;
  showAnswer: boolean;
  t: Dictionary;
}

/**
 * Sorunun `tip` alanına göre registry'deki bileşeni seçip çizer; böylece
 * bir quizde farklı görsel soru tipleri bir arada bulunabilir. Registry'de
 * olmayan bir tip (ör. eski bir kayıttan) soru kökünü kaybetmeden bir
 * uyarıyla gösterilir.
 */
export function GorselSoruRouter({ question, soruKoku, showAnswer, t }: GorselSoruRouterProps) {
  // `GorselSoruIcerigi` her `tip`i kendi `veri`siyle eşleştirir, ancak
  // TypeScript bu ilişkiyi registry araması boyunca taşıyamaz; eşleşme
  // doğrulayıcıda garanti edildiği için genişletme burada güvenlidir.
  const kayit = GORSEL_SORU_REGISTRY[question.tip] as GorselSoruKaydi<GorselSoruTipi> | undefined;

  if (!kayit) {
    return (
      <div className="flex flex-col gap-2">
        {soruKoku}
        <p className="rounded-lg border border-dashed border-border bg-muted/30 px-3 py-2.5 text-xs text-muted-foreground">
          {t.quizGenerator.preview.visualQuestion.unsupported}
        </p>
      </div>
    );
  }

  return React.createElement(kayit.bilesen, {
    veri: question.veri,
    soruKoku,
    showAnswer,
    gorselStratejisi: kayit.gorselStratejisi,
    t,
  });
}
