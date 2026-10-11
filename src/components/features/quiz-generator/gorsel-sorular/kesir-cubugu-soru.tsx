"use client";

import * as React from "react";

import { GorselSecenekListesi } from "@/components/features/quiz-generator/gorsel-sorular/gorsel-secenek-listesi";
import type { GorselSoruBilesenProps } from "@/components/features/quiz-generator/gorsel-sorular/registry";
import type { CubukCizimi, KesirCubuguVerisi } from "@/types/gorsel-soru";

// Şeritler tek tip ölçekte çizilir: "aynı uzunlukta" bilgisi görselde de doğrudur.
const GENISLIK = 320;
const YUKSEKLIK = 40;
const KENAR = 2;

// Şerit renkleri sırayla (bilgi taşımaz; taralı/boş ayrımı desenle de gösterilir).
const RENKLER = [
  { dolu: "#4c9aff", cizgi: "#2f6fd0", bos: "#eef4ff" },
  { dolu: "#ff8a3d", cizgi: "#d9641c", bos: "#fff3ea" },
];

/** `parca` eş parçalı bir şerit; ilk `tarali` parça renkli ve çapraz taralıdır (siyah-beyaz baskıda da okunur). */
function SeritCizim({ cubuk, renkIndex }: { cubuk: CubukCizimi; renkIndex: number }) {
  const desenId = React.useId();
  const renk = RENKLER[renkIndex % RENKLER.length];
  const parcaGenisligi = (GENISLIK - KENAR * 2) / cubuk.parca;
  return (
    <svg
      viewBox={`0 0 ${GENISLIK} ${YUKSEKLIK}`}
      role="img"
      aria-label={`${cubuk.ad ? `${cubuk.ad}: ` : ""}${cubuk.parca} eş parçaya bölünmüş, ${cubuk.tarali} parçası taralı şerit`}
      className="block h-auto w-full"
    >
      <defs>
        <pattern id={desenId} width={8} height={8} patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <rect width={8} height={8} fill={renk.dolu} />
          <line x1={0} y1={0} x2={0} y2={8} stroke="#ffffff" strokeWidth={2.4} strokeOpacity={0.55} />
        </pattern>
      </defs>
      {Array.from({ length: cubuk.parca }, (_, index) => (
        <rect
          key={index}
          x={KENAR + index * parcaGenisligi}
          y={KENAR}
          width={parcaGenisligi}
          height={YUKSEKLIK - KENAR * 2}
          fill={index < cubuk.tarali ? `url(#${desenId})` : renk.bos}
          stroke={renk.cizgi}
          strokeWidth={2}
        />
      ))}
    </svg>
  );
}

export function KesirCubuguSoru({ veri, soruKoku, showAnswer, t }: GorselSoruBilesenProps<KesirCubuguVerisi>) {
  const copy = t.quizGenerator.preview.visualQuestion;
  // Adlı şeritler (iki kişinin şeritleri) farklı renkte; adsız şeritler aynı bütünün parçalarıdır, tek renk.
  const adli = veri.cubuklar.some((cubuk) => cubuk.ad);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex justify-center rounded-lg bg-muted/40 px-3 py-3.5">
        <div className="flex w-full max-w-sm flex-col gap-2.5">
          {veri.cubuklar.map((cubuk, index) => (
            <div key={`${cubuk.ad ?? ""}-${index}`} className="flex flex-col gap-1">
              {cubuk.ad ? <span className="text-sm font-semibold text-foreground">{cubuk.ad}</span> : null}
              <SeritCizim cubuk={cubuk} renkIndex={adli ? index : 0} />
            </div>
          ))}
        </div>
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
