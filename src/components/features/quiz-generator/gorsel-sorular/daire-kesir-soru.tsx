import { GorselSecenekListesi } from "@/components/features/quiz-generator/gorsel-sorular/gorsel-secenek-listesi";
import type { GorselSoruBilesenProps } from "@/components/features/quiz-generator/gorsel-sorular/registry";
import type { DaireCizimi, DaireKesirVerisi, DaireRengi } from "@/types/gorsel-soru";

// Desen: references/daire-kesir-demo.html — aynı palet, boyut ve dilim düzeni.
// Renkler sorunun içeriğidir (dilim sınırları her temada okunmalı), bu yüzden burada sabitlenir.
const RENKLER: Record<DaireRengi, { dolu: string; cizgi: string; bos: string }> = {
  turuncu: { dolu: "#ff8a3d", cizgi: "#d9641c", bos: "#ffe9d6" },
  mavi: { dolu: "#4c9aff", cizgi: "#2f6fd0", bos: "#dbeafe" },
  yesil: { dolu: "#39c07a", cizgi: "#1f8f56", bos: "#d7f3e5" },
  mor: { dolu: "#9b6cf0", cizgi: "#6f45c8", bos: "#ece0ff" },
  pembe: { dolu: "#f2679e", cizgi: "#cf3f79", bos: "#ffe0ee" },
};

const BOYUT = 156;
const MERKEZ = 78;
const YARICAP = 68;

function dilimYolu(a0: number, a1: number): string {
  const x0 = MERKEZ + YARICAP * Math.cos(a0);
  const y0 = MERKEZ + YARICAP * Math.sin(a0);
  const x1 = MERKEZ + YARICAP * Math.cos(a1);
  const y1 = MERKEZ + YARICAP * Math.sin(a1);
  const buyukYay = a1 - a0 > Math.PI ? 1 : 0;
  return `M${MERKEZ},${MERKEZ} L${x0.toFixed(2)},${y0.toFixed(2)} A${YARICAP},${YARICAP} 0 ${buyukYay} 1 ${x1.toFixed(2)},${y1.toFixed(2)} Z`;
}

/** Dilim ve dolu dilim sayıları veriden gelir; ilk dilim saat 12 yönünden başlar. */
function DaireCizim({ daire }: { daire: DaireCizimi }) {
  const renk = RENKLER[daire.renk];
  const adim = (2 * Math.PI) / daire.dilim;
  const baslangic = -Math.PI / 2;
  return (
    <svg
      viewBox={`0 0 ${BOYUT} ${BOYUT}`}
      role="img"
      aria-label={`${daire.ad ? `${daire.ad}: ` : ""}${daire.dilim} eş dilime bölünmüş, ${daire.boyali} dilimi dolu daire`}
      className="block size-32 sm:size-36"
    >
      {Array.from({ length: daire.dilim }, (_, index) => (
        <path
          key={index}
          d={daire.dilim === 1 ? "" : dilimYolu(baslangic + index * adim, baslangic + (index + 1) * adim)}
          fill={index < daire.boyali ? renk.dolu : renk.bos}
          stroke={renk.cizgi}
          strokeWidth={2}
        />
      ))}
      <circle cx={MERKEZ} cy={MERKEZ} r={YARICAP} fill="none" stroke={renk.cizgi} strokeWidth={2.5} />
    </svg>
  );
}

export function DaireKesirSoru({ veri, soruKoku, showAnswer, t }: GorselSoruBilesenProps<DaireKesirVerisi>) {
  const copy = t.quizGenerator.preview.visualQuestion;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap justify-center gap-6 rounded-lg bg-muted/40 px-3 py-3.5">
        {veri.daireler.map((daire, index) => (
          <div key={`${daire.ad ?? ""}-${index}`} className="flex flex-col items-center gap-1.5">
            {daire.ad ? <span className="text-sm font-semibold text-foreground">{daire.ad}</span> : null}
            <DaireCizim daire={daire} />
          </div>
        ))}
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
