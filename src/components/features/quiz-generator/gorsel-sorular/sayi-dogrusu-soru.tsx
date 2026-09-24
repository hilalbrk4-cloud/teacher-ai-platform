"use client";

import * as React from "react";

import { GorselSecenekListesi } from "@/components/features/quiz-generator/gorsel-sorular/gorsel-secenek-listesi";
import type { GorselSoruBilesenProps } from "@/components/features/quiz-generator/gorsel-sorular/registry";
import { kesirMetni } from "@/lib/quiz-generator/gorsel-sorular/ortak";
import { isaretciDegeri, siralamaIsareti } from "@/lib/quiz-generator/gorsel-sorular/sayi-dogrusu";
import { cn } from "@/lib/utils";
import type { AyriDogruIsaretcisi, OrtakSayiDogrusu, SayiDogrusuIsaretcisi, SayiDogrusuVerisi } from "@/types/gorsel-soru";

const VARSAYILAN_GENISLIK = 640;
const EN_DAR_GENISLIK = 240;
const TEMEL_YUKSEKLIK = 88;
const TEMEL_EKSEN_Y = 54;
/** Ortak doğruda birbirine bu kadar (px) yakın işaretçiler üst üste binmesin diye bir kat yukarı çizilir. */
const YAKINLIK_ESIGI = 30;
const KAT_YUKSEKLIGI = 26;

// Her sayı doğrusu ayrı bir renkle çizilir (demo ile aynı üçlü döngü).
const CIZGI_RENKLERI = [
  "text-slate-700 dark:text-slate-300",
  "text-teal-600 dark:text-teal-400",
  "text-orange-600 dark:text-orange-400",
];

/**
 * Çizim, viewBox'ı kabın gerçek piksel genişliğine eşitlenerek yapılır
 * (ölçek 1:1). Böylece etiketler ve işaretçiler her ekranda aynı okunaklı
 * boyutta kalır; dar ekranda doğru küçülmez, yalnızca kısalır.
 */
function useKapGenisligi(): [React.RefObject<HTMLDivElement | null>, number] {
  const ref = React.useRef<HTMLDivElement | null>(null);
  const [genislik, setGenislik] = React.useState(VARSAYILAN_GENISLIK);

  React.useEffect(() => {
    const kap = ref.current;
    if (!kap) return;
    const olc = () => setGenislik(Math.max(EN_DAR_GENISLIK, Math.round(kap.clientWidth)));
    olc();
    const gozlemci = new ResizeObserver(olc);
    gozlemci.observe(kap);
    return () => gozlemci.disconnect();
  }, []);

  return [ref, genislik];
}

/**
 * 0'dan `aralikSonu`na kadar, her birimi `bolme` parçaya bölünmüş bir sayı
 * doğrusu ve üzerindeki işaretçiler. Konumlar modelden gelmez; her
 * işaretçinin pay/payda değerinden hesaplanır — çizim her zaman doğrudur.
 */
function EksenCizimi({
  genislik,
  aralikSonu,
  bolme,
  isaretciler,
  renkSinifi,
  ariaLabel,
}: {
  genislik: number;
  aralikSonu: number;
  bolme: number;
  isaretciler: SayiDogrusuIsaretcisi[];
  renkSinifi: string;
  ariaLabel: string;
}) {
  const kenar = genislik < 420 ? 26 : 42;
  const xKonumu = (deger: number) => kenar + (deger / aralikSonu) * (genislik - kenar * 2);

  // Soldan sağa dizilen işaretçilerden bir öncekine çok yakın olan bir kat yukarı çıkar.
  const yerlesim = [...isaretciler]
    .map((isaretci) => ({ isaretci, x: xKonumu(isaretciDegeri(isaretci)), kat: 0 }))
    .sort((a, b) => a.x - b.x);
  yerlesim.forEach((item, index) => {
    const onceki = yerlesim[index - 1];
    if (onceki && item.x - onceki.x < YAKINLIK_ESIGI) item.kat = onceki.kat === 0 ? 1 : 0;
  });
  const enUstKat = Math.max(0, ...yerlesim.map((item) => item.kat));
  const eksenY = TEMEL_EKSEN_Y + enUstKat * KAT_YUKSEKLIGI;
  const yukseklik = TEMEL_YUKSEKLIK + enUstKat * KAT_YUKSEKLIGI;

  const araCizgiler = Array.from({ length: aralikSonu * bolme + 1 }, (_, index) => index)
    .filter((index) => index % bolme !== 0)
    .map((index) => xKonumu(index / bolme));
  const tamSayilar = Array.from({ length: aralikSonu + 1 }, (_, index) => index);
  const eksenBasi = kenar - 14;
  const eksenSonu = genislik - kenar + 14;

  return (
    <svg
      viewBox={`0 0 ${genislik} ${yukseklik}`}
      role="img"
      aria-label={ariaLabel}
      className={cn("block h-auto w-full", renkSinifi)}
    >
      <line x1={eksenBasi} y1={eksenY} x2={eksenSonu} y2={eksenY} stroke="currentColor" strokeWidth={2.4} />
      <path d={`M${eksenBasi},${eksenY} l9,-5 v10 z`} fill="currentColor" />
      <path d={`M${eksenSonu},${eksenY} l-9,-5 v10 z`} fill="currentColor" />

      {araCizgiler.map((x) => (
        <line key={x} x1={x} y1={eksenY - 6} x2={x} y2={eksenY + 6} stroke="currentColor" strokeWidth={1.4} opacity={0.55} />
      ))}

      {tamSayilar.map((sayi) => {
        const x = xKonumu(sayi);
        return (
          <g key={sayi}>
            <line x1={x} y1={eksenY - 9} x2={x} y2={eksenY + 9} stroke="currentColor" strokeWidth={2.4} />
            <text x={x} y={eksenY + 26} textAnchor="middle" fontSize={14} fontWeight={700} className="fill-foreground">
              {sayi}
            </text>
          </g>
        );
      })}

      {yerlesim.map(({ isaretci, x, kat }) => {
        const tepe = eksenY - 18 - kat * KAT_YUKSEKLIGI;
        return (
          <g key={isaretci.id}>
            <line x1={x} y1={eksenY} x2={x} y2={tepe} stroke="currentColor" strokeWidth={2} />
            <circle cx={x} cy={eksenY} r={3.4} fill="currentColor" />
            <text x={x} y={tepe - 2} textAnchor="middle" fontSize={22}>
              {isaretci.simge}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

/** Konumu kesir yazmadan betimler: ekran okuyucu kullanan öğrenciye cevabı vermeden aynı bilgiyi sunar. */
function konumBetimi(isaretci: SayiDogrusuIsaretcisi, bolme: number): string {
  const cizgi = (isaretci.pay * bolme) / isaretci.payda;
  return `${isaretci.ad} 0'dan sonraki ${cizgi}. bölme çizgisinde`;
}

function AyriDogrular({ isaretciler, genislik }: { isaretciler: AyriDogruIsaretcisi[]; genislik: number }) {
  return (
    <>
      {isaretciler.map((isaretci, index) => (
        <EksenCizimi
          key={isaretci.id}
          genislik={genislik}
          aralikSonu={isaretci.aralikSonu}
          bolme={isaretci.payda}
          isaretciler={[isaretci]}
          renkSinifi={CIZGI_RENKLERI[index % CIZGI_RENKLERI.length]}
          ariaLabel={
            `0 ile ${isaretci.aralikSonu} arasındaki sayı doğrusu; her birim ${isaretci.payda} eş parçaya bölünmüş. ` +
            `${konumBetimi(isaretci, isaretci.payda)}.`
          }
        />
      ))}
    </>
  );
}

function OrtakDogru({
  dogru,
  isaretciler,
  genislik,
}: {
  dogru: OrtakSayiDogrusu;
  isaretciler: SayiDogrusuIsaretcisi[];
  genislik: number;
}) {
  return (
    <EksenCizimi
      genislik={genislik}
      aralikSonu={dogru.aralikSonu}
      bolme={dogru.bolme}
      isaretciler={isaretciler}
      renkSinifi={CIZGI_RENKLERI[0]}
      ariaLabel={
        `0 ile ${dogru.aralikSonu} arasındaki sayı doğrusu; her birim ${dogru.bolme} eş parçaya bölünmüş. ` +
        `${isaretciler.map((isaretci) => konumBetimi(isaretci, dogru.bolme)).join("; ")}.`
      }
    />
  );
}

function IsaretciEtiketi({ isaretci }: { isaretci: SayiDogrusuIsaretcisi | undefined }) {
  if (!isaretci) return null;
  return (
    <span className="inline-flex items-center gap-2">
      <span className="text-xl leading-none">{isaretci.simge}</span>
      <span>{isaretci.ad}</span>
    </span>
  );
}

function secenekIcerikleri(veri: SayiDogrusuVerisi): { id: string; icerik: React.ReactNode }[] {
  const bul = (id: string) => (veri.isaretciler as SayiDogrusuIsaretcisi[]).find((isaretci) => isaretci.id === id);

  switch (veri.gorev) {
    case "siralama": {
      const isaret = siralamaIsareti(veri.siralama);
      return veri.secenekler.map((secenek) => ({
        id: secenek.id,
        icerik: (
          <span className="inline-flex flex-wrap items-center gap-1 text-xl leading-none">
            {secenek.sira.map((id, index) => (
              <React.Fragment key={id}>
                {index > 0 ? <span className="px-1 text-sm text-muted-foreground">{isaret}</span> : null}
                <span>{bul(id)?.simge}</span>
              </React.Fragment>
            ))}
          </span>
        ),
      }));
    }
    case "hedefeEnYakin":
    case "kesriGoster":
      return veri.secenekler.map((secenek) => ({
        id: secenek.id,
        icerik: <IsaretciEtiketi isaretci={bul(secenek.isaretciId)} />,
      }));
    case "isaretliKesir":
      return veri.secenekler.map((secenek) => ({
        id: secenek.id,
        icerik: <span className="font-medium tabular-nums">{kesirMetni(secenek)}</span>,
      }));
  }
}

export function SayiDogrusuSoru({ veri, soruKoku, showAnswer, t }: GorselSoruBilesenProps<SayiDogrusuVerisi>) {
  const copy = t.quizGenerator.preview.visualQuestion;
  const [kapRef, genislik] = useKapGenisligi();

  return (
    <div className="flex flex-col gap-3">
      {veri.bilgi ? (
        <p className="rounded-lg bg-muted/60 px-3.5 py-2.5 text-center text-sm leading-relaxed text-muted-foreground">
          <span className="font-semibold text-foreground">{copy.infoLabel}: </span>
          {veri.bilgi}
        </p>
      ) : null}

      <div ref={kapRef} className="flex flex-col">
        {veri.gorev === "siralama" || veri.gorev === "hedefeEnYakin" ? (
          <AyriDogrular isaretciler={veri.isaretciler} genislik={genislik} />
        ) : (
          <OrtakDogru dogru={veri.dogru} isaretciler={veri.isaretciler} genislik={genislik} />
        )}
      </div>

      <div className="flex flex-col gap-1">
        {veri.onculu ? <p className="text-sm leading-relaxed text-muted-foreground">{veri.onculu}</p> : null}
        <div className="font-medium">{soruKoku}</div>
      </div>

      <GorselSecenekListesi
        secenekler={secenekIcerikleri(veri)}
        dogruSecenekId={veri.dogruSecenekId}
        showAnswer={showAnswer}
        correctMark={copy.correctMark}
      />
    </div>
  );
}
