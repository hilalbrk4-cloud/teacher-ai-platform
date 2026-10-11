import { GorselSecenekListesi } from "@/components/features/quiz-generator/gorsel-sorular/gorsel-secenek-listesi";
import type { GorselSoruBilesenProps } from "@/components/features/quiz-generator/gorsel-sorular/registry";
import type { CetvelCizimi, CetvelOlcumVerisi, Kesir } from "@/types/gorsel-soru";

const CM = 40;
const SOL = 20;
const NESNE_YUKSEKLIK = 22;
const NESNE_ARALIK = 10;
const CETVEL_YUKSEKLIK = 46;
const NESNE_RENKLERI = ["#ff8a3d", "#4c9aff"];

const deger = (kesir: Kesir) => (kesir.tam ?? 0) + kesir.pay / kesir.payda;

/** Konumlar veriden gelir ve her zaman bir bölme çizgisine denk gelir; kılavuz çizgiler bunu gösterir. */
function CetvelCizim({ cetvel }: { cetvel: CetvelCizimi }) {
  const genislik = SOL * 2 + cetvel.uzunluk * CM;
  const cetvelY = 8 + cetvel.nesneler.length * (NESNE_YUKSEKLIK + NESNE_ARALIK) + 6;
  const yukseklik = cetvelY + CETVEL_YUKSEKLIK + 4;
  const x = (cm: number) => SOL + cm * CM;
  const cizgiler = Array.from({ length: cetvel.uzunluk * cetvel.bolme + 1 }, (_, index) => index);
  const aciklama = cetvel.nesneler
    .map((nesne) => `${nesne.ad} ${deger(nesne.baslangic)} ile ${deger(nesne.bitis)} santimetre arasında`)
    .join("; ");

  return (
    <svg
      viewBox={`0 0 ${genislik} ${yukseklik}`}
      role="img"
      aria-label={`${cetvel.uzunluk} santimetrelik, her santimetresi ${cetvel.bolme} eş parçaya bölünmüş cetvel; ${aciklama}`}
      className="block h-auto w-full max-w-md"
    >
      {cetvel.nesneler.map((nesne, index) => {
        const y = 8 + index * (NESNE_YUKSEKLIK + NESNE_ARALIK);
        const x0 = x(deger(nesne.baslangic));
        const x1 = x(deger(nesne.bitis));
        const renk = NESNE_RENKLERI[index % NESNE_RENKLERI.length];
        return (
          <g key={`${nesne.ad}-${index}`}>
            <line x1={x0} y1={y + NESNE_YUKSEKLIK} x2={x0} y2={cetvelY} stroke={renk} strokeWidth={1.5} strokeDasharray="3 3" />
            <line x1={x1} y1={y + NESNE_YUKSEKLIK} x2={x1} y2={cetvelY} stroke={renk} strokeWidth={1.5} strokeDasharray="3 3" />
            <rect x={x0} y={y} width={x1 - x0} height={NESNE_YUKSEKLIK} rx={6} fill={renk} />
            <text
              x={(x0 + x1) / 2}
              y={y + NESNE_YUKSEKLIK / 2}
              textAnchor="middle"
              dominantBaseline="central"
              fontSize={13}
              fontWeight={700}
              fill="#ffffff"
            >
              {nesne.ad}
            </text>
          </g>
        );
      })}

      <rect x={SOL - 8} y={cetvelY} width={cetvel.uzunluk * CM + 16} height={CETVEL_YUKSEKLIK} rx={4} fill="#fde68a" stroke="#b45309" strokeWidth={1.5} />
      {cizgiler.map((index) => {
        const tamCm = index % cetvel.bolme === 0;
        const yarim = !tamCm && cetvel.bolme % 2 === 0 && index % (cetvel.bolme / 2) === 0;
        const uzunluk = tamCm ? 18 : yarim ? 12 : 8;
        const cx = x(index / cetvel.bolme);
        return (
          <g key={index}>
            <line x1={cx} y1={cetvelY} x2={cx} y2={cetvelY + uzunluk} stroke="#78350f" strokeWidth={tamCm ? 1.6 : 1.1} />
            {tamCm ? (
              <text x={cx} y={cetvelY + 32} textAnchor="middle" fontSize={12} fontWeight={700} fill="#78350f">
                {index / cetvel.bolme}
              </text>
            ) : null}
          </g>
        );
      })}
    </svg>
  );
}

export function CetvelOlcumSoru({ veri, soruKoku, showAnswer, t }: GorselSoruBilesenProps<CetvelOlcumVerisi>) {
  const copy = t.quizGenerator.preview.visualQuestion;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex justify-center rounded-lg bg-muted/40 px-3 py-3.5">
        <CetvelCizim cetvel={veri.cetvel} />
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
