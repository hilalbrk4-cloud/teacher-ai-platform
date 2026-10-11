"use client";

import * as React from "react";

import { GorselSecenekListesi } from "@/components/features/quiz-generator/gorsel-sorular/gorsel-secenek-listesi";
import type { GorselSoruBilesenProps } from "@/components/features/quiz-generator/gorsel-sorular/registry";
import type { EtapDogrusuCizimi, EtapDogrusuVerisi, Kesir } from "@/types/gorsel-soru";

const EKSEN_Y = 64;
const YUKSEKLIK = 104;
/** Bu genişliğin altında doğru küçülmez; kap yatay kaydırılır (bölme çizgileri okunur kalsın). */
const EN_DAR_GENISLIK = 260;
const VARSAYILAN_GENISLIK = 460;
const EN_GENIS = 560;

/**
 * Doğru, kabın gerçek piksel genişliğinde (viewBox = genişlik, ölçek 1:1) çizilir: harfler ve sayılar
 * her ekranda aynı okunaklı boyutta kalır, dar ekranda yalnızca birim aralıkları daralır.
 */
function useKapGenisligi(): [React.RefObject<HTMLDivElement | null>, number] {
  const ref = React.useRef<HTMLDivElement | null>(null);
  const [genislik, setGenislik] = React.useState(VARSAYILAN_GENISLIK);
  React.useEffect(() => {
    const kap = ref.current;
    if (!kap) return;
    const olc = () => setGenislik(Math.min(EN_GENIS, Math.max(EN_DAR_GENISLIK, Math.round(kap.clientWidth))));
    olc();
    const gozlemci = new ResizeObserver(olc);
    gozlemci.observe(kap);
    return () => gozlemci.disconnect();
  }, []);
  return [ref, genislik];
}

const deger = (kesir: Kesir) => (kesir.tam ?? 0) + kesir.pay / kesir.payda;

/** Her birim kendi bölme sayısıyla bölünür; konumlar veriden gelir (bir bölme çizgisine denk gelir). */
function EtapCizim({ dogru, genislik }: { dogru: EtapDogrusuCizimi; genislik: number }) {
  const birimSayisi = dogru.bolmeler.length;
  const sol = genislik < 400 ? 18 : 30;
  const birim = (genislik - sol * 2 - 10) / birimSayisi;
  const x = (konum: number) => sol + konum * birim;
  const araCizgiler = dogru.bolmeler.flatMap((bolme, birimNo) =>
    Array.from({ length: bolme - 1 }, (_, index) => birimNo + (index + 1) / bolme)
  );
  const aciklama =
    dogru.bolmeler.map((bolme, birimNo) => `${birimNo} ile ${birimNo + 1} arası ${bolme} eş parçaya`).join(", ") +
    " bölünmüş sayı doğrusu; " +
    dogru.noktalar.map((nokta) => `${nokta.ad} noktası işaretli`).join(", ");

  return (
    <svg
      viewBox={`0 0 ${genislik} ${YUKSEKLIK}`}
      width={genislik}
      height={YUKSEKLIK}
      role="img"
      aria-label={aciklama}
      className="block shrink-0 text-indigo-600 dark:text-indigo-400"
    >
      <line x1={sol - 10} y1={EKSEN_Y} x2={x(birimSayisi) + 14} y2={EKSEN_Y} stroke="currentColor" strokeWidth={2.4} />
      <path d={`M${x(birimSayisi) + 16},${EKSEN_Y} l-9,-5 v10 z`} fill="currentColor" />

      {araCizgiler.map((konum) => (
        <line key={konum} x1={x(konum)} y1={EKSEN_Y - 7} x2={x(konum)} y2={EKSEN_Y + 7} stroke="currentColor" strokeWidth={1.4} opacity={0.7} />
      ))}

      {Array.from({ length: birimSayisi + 1 }, (_, sayi) => (
        <g key={sayi}>
          <line x1={x(sayi)} y1={EKSEN_Y - 11} x2={x(sayi)} y2={EKSEN_Y + 11} stroke="currentColor" strokeWidth={2.4} />
          <text x={x(sayi)} y={EKSEN_Y + 30} textAnchor="middle" fontSize={15} fontWeight={700} className="fill-foreground">
            {sayi}
          </text>
        </g>
      ))}

      {dogru.noktalar.map((nokta) => {
        const nx = x(deger(nokta.konum));
        return (
          <g key={nokta.ad}>
            <line x1={nx} y1={EKSEN_Y - 30} x2={nx} y2={EKSEN_Y} stroke="currentColor" strokeWidth={1.6} />
            <circle cx={nx} cy={EKSEN_Y} r={4.5} fill="currentColor" />
            <text x={nx} y={EKSEN_Y - 36} textAnchor="middle" fontSize={16} fontWeight={800} className="fill-foreground">
              {nokta.ad}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

export function EtapDogrusuSoru({ veri, soruKoku, showAnswer, t }: GorselSoruBilesenProps<EtapDogrusuVerisi>) {
  const copy = t.quizGenerator.preview.visualQuestion;
  const [kapRef, genislik] = useKapGenisligi();

  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm leading-relaxed text-foreground">{veri.senaryo}</p>

      <div className="rounded-lg bg-muted/40 px-2 py-3.5 sm:px-3">
        <div ref={kapRef} className="flex justify-center overflow-x-auto">
          <EtapCizim dogru={veri.dogru} genislik={genislik} />
        </div>
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
