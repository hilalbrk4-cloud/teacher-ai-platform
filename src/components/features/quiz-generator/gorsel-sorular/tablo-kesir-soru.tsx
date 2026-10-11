import { GorselSecenekListesi } from "@/components/features/quiz-generator/gorsel-sorular/gorsel-secenek-listesi";
import type { GorselSoruBilesenProps } from "@/components/features/quiz-generator/gorsel-sorular/registry";
import { kesirMetni } from "@/lib/quiz-generator/gorsel-sorular/ortak";
import type { Kesir, TabloKesirVerisi } from "@/types/gorsel-soru";

/** Kesri alt alta yazar (pay / çizgi / payda); ekran okuyucu için düz yazımı da verir. */
function KesirYazimi({ kesir }: { kesir: Kesir }) {
  return (
    <span className="inline-flex items-center gap-1 tabular-nums" aria-label={kesirMetni(kesir)}>
      {kesir.tam !== undefined ? <span className="text-base font-bold">{kesir.tam}</span> : null}
      <span aria-hidden="true" className="inline-flex flex-col items-center text-sm font-bold leading-tight">
        <span className="px-1">{kesir.pay}</span>
        <span className="w-full border-t-2 border-current" />
        <span className="px-1">{kesir.payda}</span>
      </span>
    </span>
  );
}

export function TabloKesirSoru({ veri, soruKoku, showAnswer, t }: GorselSoruBilesenProps<TabloKesirVerisi>) {
  const copy = t.quizGenerator.preview.visualQuestion;
  const [adBasligi, degerBasligi] = veri.tablo.basliklar;

  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm leading-relaxed text-foreground">{veri.senaryo}</p>

      <div className="flex justify-center rounded-lg bg-muted/40 px-3 py-3.5">
        <table className="w-full max-w-xs border-collapse overflow-hidden rounded-md bg-card text-sm">
          <thead>
            <tr className="bg-muted">
              <th scope="col" className="border border-border px-3 py-2 text-left font-semibold text-foreground">
                {adBasligi}
              </th>
              <th scope="col" className="border border-border px-3 py-2 text-center font-semibold text-foreground">
                {degerBasligi}
              </th>
            </tr>
          </thead>
          <tbody>
            {veri.tablo.satirlar.map((satir) => (
              <tr key={satir.ad}>
                <th scope="row" className="border border-border px-3 py-1.5 text-left font-semibold text-foreground">
                  {satir.ad}
                </th>
                <td className="border border-border px-3 py-1.5 text-center text-foreground">
                  <KesirYazimi kesir={satir.deger} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

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
