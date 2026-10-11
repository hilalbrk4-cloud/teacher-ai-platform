import { GorselSecenekListesi } from "@/components/features/quiz-generator/gorsel-sorular/gorsel-secenek-listesi";
import type { GorselSoruBilesenProps } from "@/components/features/quiz-generator/gorsel-sorular/registry";
import type { AlanIzgaraVerisi, IzgaraCizimi, IzgaraRengi } from "@/types/gorsel-soru";

const KARE = 32;
const KENAR = 2;

// Renk adları metinde geçer ("mavi kareler"), bu yüzden renkler sabitlenir.
const RENKLER: Record<IzgaraRengi, string> = {
  mavi: "#4c9aff",
  turuncu: "#ff8a3d",
  yesil: "#39c07a",
};
const BOS = "#ffffff";
const CIZGI = "#64748b";

/** Kareler satır satır, soldan sağa veri sırasıyla boyanır. */
function kareRengi(izgara: IzgaraCizimi, index: number): string {
  let sinir = 0;
  for (const boya of izgara.boyalar) {
    sinir += boya.sayi;
    if (index < sinir) return RENKLER[boya.renk];
  }
  return BOS;
}

function IzgaraCizim({ izgara }: { izgara: IzgaraCizimi }) {
  const genislik = izgara.sutun * KARE + KENAR * 2;
  const yukseklik = izgara.satir * KARE + KENAR * 2;
  const boyaOzeti = izgara.boyalar.map((boya) => `${boya.sayi} ${boya.renk}`).join(", ");
  return (
    <svg
      viewBox={`0 0 ${genislik} ${yukseklik}`}
      role="img"
      aria-label={`${izgara.satir} satır ${izgara.sutun} sütunlu eş kareli ızgara; ${boyaOzeti} kare boyalı`}
      className="block h-auto w-full max-w-xs"
    >
      {Array.from({ length: izgara.satir * izgara.sutun }, (_, index) => (
        <rect
          key={index}
          x={KENAR + (index % izgara.sutun) * KARE}
          y={KENAR + Math.floor(index / izgara.sutun) * KARE}
          width={KARE}
          height={KARE}
          fill={kareRengi(izgara, index)}
          stroke={CIZGI}
          strokeWidth={1.5}
        />
      ))}
      <rect x={KENAR} y={KENAR} width={genislik - KENAR * 2} height={yukseklik - KENAR * 2} fill="none" stroke={CIZGI} strokeWidth={2.5} />
    </svg>
  );
}

export function AlanIzgaraSoru({ veri, soruKoku, showAnswer, t }: GorselSoruBilesenProps<AlanIzgaraVerisi>) {
  const copy = t.quizGenerator.preview.visualQuestion;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex justify-center rounded-lg bg-muted/40 px-3 py-3.5">
        <IzgaraCizim izgara={veri.izgara} />
      </div>

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
