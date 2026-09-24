import { GorselSecenekListesi } from "@/components/features/quiz-generator/gorsel-sorular/gorsel-secenek-listesi";
import type { GorselSoruBilesenProps } from "@/components/features/quiz-generator/gorsel-sorular/registry";
import {
  KART_RENGI_ETIKETLERI,
  ifadeMetni,
  kartEtiketi,
  ogrenciListesiMetni,
  secenektekiAdlar,
} from "@/lib/quiz-generator/gorsel-sorular/kesir-kartlari";
import { kesirMetni } from "@/lib/quiz-generator/gorsel-sorular/ortak";
import type { KartRengi, KesirKarti, KesirKartlariVerisi } from "@/types/gorsel-soru";

// Kart renkleri sorunun içeriğidir ("mavi karttaki kesir…"), bu yüzden
// tasarım token'ları yerine burada, tek bir yerde sabitlenir.
const KART_RENK_SINIFLARI: Record<KartRengi, string> = {
  mavi: "fill-sky-100 stroke-sky-500 dark:fill-sky-500/15 dark:stroke-sky-400",
  kirmizi: "fill-rose-100 stroke-rose-500 dark:fill-rose-500/15 dark:stroke-rose-400",
  yesil: "fill-emerald-100 stroke-emerald-500 dark:fill-emerald-500/15 dark:stroke-emerald-400",
  sari: "fill-amber-100 stroke-amber-500 dark:fill-amber-500/15 dark:stroke-amber-400",
  mor: "fill-violet-100 stroke-violet-500 dark:fill-violet-500/15 dark:stroke-violet-400",
  turuncu: "fill-orange-100 stroke-orange-500 dark:fill-orange-500/15 dark:stroke-orange-400",
};

const KART_GENISLIK = 96;
const KART_YUKSEKLIK = 124;

function KesirYazisi({ pay, payda, x }: { pay: number; payda: number; x: number }) {
  const cizgiYarisi = Math.max(String(pay).length, String(payda).length) * 7 + 4;
  return (
    <g className="fill-foreground" fontWeight={700} fontSize={22} textAnchor="middle">
      <text x={x} y={62}>
        {pay}
      </text>
      <line
        x1={x - cizgiYarisi}
        y1={70}
        x2={x + cizgiYarisi}
        y2={70}
        strokeWidth={2.2}
        className="stroke-foreground"
      />
      <text x={x} y={94}>
        {payda}
      </text>
    </g>
  );
}

/** Tek bir kesir kartı; renk adı kartın üstünde de yazılıdır (renk körlüğü ve siyah-beyaz baskı için). */
function KesirKartiCizimi({ kart }: { kart: KesirKarti }) {
  const renk = KART_RENGI_ETIKETLERI[kart.renk];
  const orta = KART_GENISLIK / 2;

  return (
    <svg
      viewBox={`0 0 ${KART_GENISLIK} ${KART_YUKSEKLIK}`}
      role="img"
      aria-label={`${renk} kart: ${kesirMetni(kart)}`}
      className="h-auto w-20 shrink-0 sm:w-24"
    >
      <rect
        x={2}
        y={2}
        width={KART_GENISLIK - 4}
        height={KART_YUKSEKLIK - 4}
        rx={12}
        strokeWidth={2.5}
        className={KART_RENK_SINIFLARI[kart.renk]}
      />
      <text x={orta} y={24} textAnchor="middle" fontSize={12} fontWeight={600} className="fill-muted-foreground">
        {renk}
      </text>
      {kart.tam !== undefined ? (
        <>
          <text x={30} y={80} textAnchor="middle" fontSize={34} fontWeight={700} className="fill-foreground">
            {kart.tam}
          </text>
          <KesirYazisi pay={kart.pay} payda={kart.payda} x={62} />
        </>
      ) : (
        <KesirYazisi pay={kart.pay} payda={kart.payda} x={orta} />
      )}
    </svg>
  );
}

function secenekIcerikleri(veri: KesirKartlariVerisi): { id: string; icerik: string }[] {
  switch (veri.gorev) {
    case "ifadeDegerlendirme":
      return veri.secenekler.map((secenek) => ({
        id: secenek.id,
        icerik: ogrenciListesiMetni(secenektekiAdlar(veri.ogrenciler, secenek)),
      }));
    case "turuBul":
      return veri.secenekler.map((secenek) => {
        const kart = veri.kartlar.find((item) => item.id === secenek.kartId);
        return { id: secenek.id, icerik: kart ? kartEtiketi(kart) : "" };
      });
    case "gosterimDonusumu":
      return veri.secenekler.map((secenek) => ({ id: secenek.id, icerik: kesirMetni(secenek) }));
  }
}

export function KesirKartlariSoru({ veri, soruKoku, showAnswer, t }: GorselSoruBilesenProps<KesirKartlariVerisi>) {
  const copy = t.quizGenerator.preview.visualQuestion;

  return (
    <div className="flex flex-col gap-3">
      {veri.baglam ? <p className="text-sm leading-relaxed text-foreground">{veri.baglam}</p> : null}

      <div className="flex flex-wrap justify-center gap-3 rounded-lg bg-muted/40 px-3 py-3.5">
        {veri.kartlar.map((kart) => (
          <KesirKartiCizimi key={kart.id} kart={kart} />
        ))}
      </div>

      {veri.gorev === "ifadeDegerlendirme" ? (
        <ul className="flex flex-col gap-1.5">
          {veri.ogrenciler.map((ogrenci) => {
            const kart = veri.kartlar.find((item) => item.id === ogrenci.kartId);
            if (!kart) return null;
            return (
              <li
                key={ogrenci.id}
                className="rounded-lg rounded-tl-sm border border-border/70 bg-card px-3 py-2 text-sm leading-relaxed"
              >
                <span className="font-semibold text-foreground">{ogrenci.ad}: </span>
                <span className="text-foreground">“{ifadeMetni(kart, ogrenci.iddia)}”</span>
              </li>
            );
          })}
        </ul>
      ) : null}

      <div className="font-medium">{soruKoku}</div>

      <GorselSecenekListesi
        secenekler={secenekIcerikleri(veri)}
        dogruSecenekId={veri.dogruSecenekId}
        showAnswer={showAnswer}
        correctMark={copy.correctMark}
      />
    </div>
  );
}
