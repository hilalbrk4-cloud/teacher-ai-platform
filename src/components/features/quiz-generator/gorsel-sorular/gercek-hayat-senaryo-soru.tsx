import { DekoratifGorsel } from "@/components/features/quiz-generator/gorsel-sorular/dekoratif-gorsel";
import { GorselSecenekListesi } from "@/components/features/quiz-generator/gorsel-sorular/gorsel-secenek-listesi";
import type { GorselSoruBilesenProps } from "@/components/features/quiz-generator/gorsel-sorular/registry";
import type { GercekHayatSenaryoVerisi } from "@/types/gorsel-soru";

export function GercekHayatSenaryoSoru({
  veri,
  soruKoku,
  showAnswer,
  gorselStratejisi,
  t,
}: GorselSoruBilesenProps<GercekHayatSenaryoVerisi>) {
  const copy = t.quizGenerator.preview.visualQuestion;

  return (
    <div className="flex flex-col gap-3">
      {/* Dekoratif katman: soru onsuz da eksiksizdir, bu yüzden ekran okuyuculardan gizlidir. */}
      <DekoratifGorsel key={veri.sahne} sahne={veri.sahne} strateji={gorselStratejisi} />

      <p className="text-sm leading-relaxed text-foreground">{veri.senaryo}</p>

      <div className="font-medium">{soruKoku}</div>

      <GorselSecenekListesi
        secenekler={veri.secenekler.map((secenek) => ({ id: secenek.id, icerik: secenek.metin }))}
        dogruSecenekId={veri.dogruSecenekId}
        showAnswer={showAnswer}
        correctMark={copy.correctMark}
      />
    </div>
  );
}
